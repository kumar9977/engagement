// License check -> JWT. The extension stores the JWT and sends it as a Bearer
// token on every request. Minimal but real.

import jwt from 'jsonwebtoken';
import { db, getOrCreateUser, getUserByEmail, subscriptionState } from './db.js';

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s || s === 'change-me-to-a-long-random-string') {
    // Don't crash, but make it loud in logs.
    console.warn('[auth] JWT_SECRET is unset or default. Set a real secret in .env for production.');
  }
  return s || 'insecure-dev-secret';
}

export function issueToken(user) {
  return jwt.sign({ uid: user.id }, secret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });
}

export function issueAdminToken() {
  return jwt.sign({ role: 'admin' }, secret(), { expiresIn: '12h' });
}

// Activate by email: the customer paid on Razorpay with this email, and the
// webhook created/updated their account. Returns { token, user } when they have
// an active subscription (or a grandfathered manual account), else throws.
export function activateByEmail({ email, linkedinUrl = null }) {
  const clean = (email || '').trim().toLowerCase();
  if (!clean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
    throw Object.assign(new Error('Enter the email address you paid with'), { status: 400 });
  }
  const user = getUserByEmail(clean);
  if (!user) {
    throw Object.assign(
      new Error('No subscription found for this email. If you just paid, wait a minute and try again, or make sure you used this email at checkout.'),
      { status: 404 }
    );
  }
  const state = subscriptionState(user);
  if (!state.active) {
    throw Object.assign(
      new Error('Your subscription is not active. Please subscribe to continue.'),
      { status: 403 }
    );
  }
  if (linkedinUrl && !user.linkedin_url) {
    db.prepare('UPDATE users SET linkedin_url = ? WHERE id = ?').run(linkedinUrl, user.id);
  }
  return { token: issueToken(user), user };
}

// Validates a license key, creates/links a user, returns { token, user }.
export function checkLicense({ key, email = null, linkedinUrl = null }) {
  if (!key || typeof key !== 'string' || key.trim().length < 4) {
    throw Object.assign(new Error('License key must be at least 4 characters'), { status: 400 });
  }
  const trimmed = key.trim();
  let lic = db.prepare('SELECT * FROM licenses WHERE key = ?').get(trimmed);

  // For a self-hosted single-user setup, auto-provision an active license the
  // first time a key is seen. In a real SaaS you would seed licenses out of band
  // and remove this block.
  if (!lic) {
    db.prepare('INSERT INTO licenses (key, status) VALUES (?, ?)').run(trimmed, 'active');
    lic = db.prepare('SELECT * FROM licenses WHERE key = ?').get(trimmed);
  }
  if (lic.status !== 'active') {
    throw Object.assign(new Error('License is not active'), { status: 403 });
  }

  const user = getOrCreateUser({ email, linkedinUrl });
  if (!lic.user_id) {
    db.prepare('UPDATE licenses SET user_id = ? WHERE key = ?').run(user.id, trimmed);
  }
  return { token: issueToken(user), user };
}

// Verifies the Bearer token and loads the user. Does NOT check subscription.
// Attaches req.userId and req.user. Used by status endpoints (/me) that must
// stay readable even when a subscription has lapsed.
export function requireAuthToken(req, res, next) {
  const header = req.get('authorization') || '';
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (!m) return res.status(401).json({ error: 'Missing bearer token' });
  try {
    const payload = jwt.verify(m[1], secret());
    // The token may reference a user that no longer exists (e.g. the DB was
    // reset). Return 401 so the client can transparently re-authenticate,
    // instead of letting a later insert fail with a foreign-key error.
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.uid);
    if (!user) return res.status(401).json({ error: 'Session expired, please reconnect' });
    req.userId = payload.uid;
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Full gate: valid token AND an active subscription (manual accounts pass).
// Returns 402 Payment Required when the subscription has lapsed so the client
// can prompt the user to subscribe again.
export function requireAuth(req, res, next) {
  requireAuthToken(req, res, () => {
    const state = subscriptionState(req.user);
    if (!state.active) {
      return res.status(402).json({
        error: 'Your subscription has expired. Please renew to keep using the assistant.',
        subscription: state,
      });
    }
    next();
  });
}

// Admin gate: a valid admin token (from POST /api/admin/login).
export function requireAdmin(req, res, next) {
  const header = req.get('authorization') || '';
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (!m) return res.status(401).json({ error: 'Admin login required' });
  try {
    const payload = jwt.verify(m[1], secret());
    if (payload.role !== 'admin') return res.status(403).json({ error: 'Not an admin token' });
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired admin session' });
  }
}
