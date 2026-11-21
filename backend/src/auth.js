// License check -> JWT. The extension stores the JWT and sends it as a Bearer
// token on every request. Minimal but real.

import jwt from 'jsonwebtoken';
import { db, getOrCreateUser, getUserByEmail, subscriptionState, dbRetry } from './db.js';

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Validates a license key, creates/links a user, returns { token, user }.
//  - A duration key (generated in admin, has `months`) activates a bounded
//    subscription on first redemption and is single-use, tied to the redeemer's
//    email.
//  - An unknown key is rejected, unless ALLOW_ANY_KEY=true (dev / self-hosting),
//    which auto-provisions an unlimited "legacy" key.
export function checkLicense({ key, email = null, linkedinUrl = null }) {
  if (!key || typeof key !== 'string' || key.trim().length < 4) {
    throw Object.assign(new Error('License key must be at least 4 characters'), { status: 400 });
  }
  const trimmed = key.trim();
  let lic = db.prepare('SELECT * FROM licenses WHERE key = ?').get(trimmed);

  if (!lic) {
    if (String(process.env.ALLOW_ANY_KEY || 'false') === 'true') {
      db.prepare('INSERT INTO licenses (key, status) VALUES (?, ?)').run(trimmed, 'active');
      lic = db.prepare('SELECT * FROM licenses WHERE key = ?').get(trimmed);
    } else {
      throw Object.assign(new Error('Invalid license key'), { status: 403 });
    }
  }
  if (lic.status !== 'active') {
    throw Object.assign(new Error('This license key is not active'), { status: 403 });
  }

  // Duration key: activates a month (or N months) and is single-use.
  if (lic.months != null) {
    const clean = (email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(clean)) {
      throw Object.assign(new Error('Enter your email to activate this license key'), { status: 400 });
    }
    const user = getOrCreateUser({ email: clean, linkedinUrl });
    if (lic.redeemed_by_user_id && lic.redeemed_by_user_id !== user.id) {
      throw Object.assign(new Error('This license key has already been used by another account'), { status: 409 });
    }
    if (!lic.redeemed_by_user_id) {
      const now = new Date();
      const end = new Date(now);
      end.setMonth(end.getMonth() + lic.months);
      db.prepare(
        `UPDATE users SET
           subscription_status = 'active',
           subscription_start = COALESCE(subscription_start, ?),
           current_period_end = ?,
           last_payment_at = ?,
           amount = COALESCE(amount, ?)
         WHERE id = ?`
      ).run(now.toISOString(), end.toISOString(), now.toISOString(), Number(process.env.SUBSCRIPTION_AMOUNT || 790), user.id);
      db.prepare('UPDATE licenses SET redeemed_by_user_id = ?, redeemed_at = ?, user_id = ? WHERE key = ?')
        .run(user.id, now.toISOString(), user.id, trimmed);
    }
    const fresh = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    return { token: issueToken(fresh), user: fresh };
  }

  // Legacy / unlimited key.
  const user = getOrCreateUser({ email, linkedinUrl });
  if (!lic.user_id) {
    db.prepare('UPDATE licenses SET user_id = ? WHERE key = ?').run(user.id, trimmed);
  }
  return { token: issueToken(user), user };
}

// Verifies the Bearer token and loads the user. Does NOT check subscription.
// Attaches req.userId and req.user. Used by status endpoints (/me) that must
// stay readable even when a subscription has lapsed.
export async function requireAuthToken(req, res, next) {
  const header = req.get('authorization') || '';
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (!m) return res.status(401).json({ error: 'Missing bearer token' });

  // Verify the token itself first. A failure here is a genuine auth problem.
  let payload;
  try {
    payload = jwt.verify(m[1], secret());
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Load the user separately, with retry. A DB hiccup (common in remote mode)
  // must NOT be reported as an auth error — that was showing users a false
  // "Invalid or expired token" banner. Retry, and only on sustained failure
  // return 503 (transient) so the client can retry instead of logging out.
  let user;
  try {
    user = await dbRetry(() => db.prepare('SELECT * FROM users WHERE id = ?').get(payload.uid));
  } catch {
    return res.status(503).json({ error: 'Service busy, please try again.' });
  }
  if (!user) return res.status(401).json({ error: 'Session expired, please reconnect' });

  req.userId = payload.uid;
  req.user = user;
  next();
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
