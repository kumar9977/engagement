// Admin dashboard: a password-protected page to see users, their subscription
// start dates, renewal dates, and usage. Served at GET /admin. The password is
// ADMIN_PASSWORD in .env; the JSON APIs require the token from /api/admin/login.

import { Router } from 'express';
import crypto from 'node:crypto';
import { issueAdminToken, requireAdmin } from '../auth.js';
import {
  listUsersForAdmin,
  adminSetSubscription,
  adminRenew,
  adminRevoke,
  generateLicenseKey,
  listLicenses,
  subscriptionState,
  getUserDetail,
} from '../db.js';
import { adminPage } from './admin-page.js';

const router = Router();

function passwordOk(input) {
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected) return false;
  const a = Buffer.from(String(input || ''));
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// The dashboard page (static HTML; it logs in via the API below).
// No-cache so browsers never serve a stale version after a deploy.
router.get('/admin', (_req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.type('html').send(adminPage());
});

// POST /api/admin/login { password } -> { token }
router.post('/api/admin/login', (req, res) => {
  if (!process.env.ADMIN_PASSWORD) {
    return res.status(503).json({ error: 'Admin is not configured (set ADMIN_PASSWORD).' });
  }
  if (!passwordOk(req.body?.password)) {
    return res.status(401).json({ error: 'Wrong password' });
  }
  res.json({ token: issueAdminToken() });
});

// POST /api/admin/grant { email, start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }
// Manually set a user's subscription window (for UPI / manual payers).
router.post('/api/admin/grant', requireAdmin, (req, res, next) => {
  try {
    const { email, start, end, amount } = req.body || {};
    if (!start || !end) return res.status(400).json({ error: 'Start and end dates are required' });
    const startIso = `${start}T00:00:00.000Z`;
    const endIso = `${end}T23:59:59.999Z`;
    const amt = amount === '' || amount == null ? null : Number(amount);
    const user = adminSetSubscription({ email, startIso, endIso, amount: Number.isFinite(amt) ? amt : null });
    res.json({ ok: true, user: { email: user.email }, subscription: subscriptionState(user) });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/user?email=... -> one user's profile + per-day tracker.
router.get('/api/admin/user', requireAdmin, (req, res, next) => {
  try {
    const detail = getUserDetail(req.query.email);
    if (!detail) return res.status(404).json({ error: 'User not found' });
    res.json(detail);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/renew { email, months? } -> extend access.
router.post('/api/admin/renew', requireAdmin, (req, res, next) => {
  try {
    const { email, months } = req.body || {};
    const user = adminRenew(email, months || 1);
    res.json({ ok: true, user: { email: user.email }, subscription: subscriptionState(user) });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/revoke { email } -> end access now.
router.post('/api/admin/revoke', requireAdmin, (req, res, next) => {
  try {
    const user = adminRevoke(req.body?.email);
    res.json({ ok: true, user: { email: user.email }, subscription: subscriptionState(user) });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/keys { months?, note? } -> generate a license key.
router.post('/api/admin/keys', requireAdmin, (req, res, next) => {
  try {
    const lic = generateLicenseKey({ months: req.body?.months || 1, note: req.body?.note });
    res.json({ ok: true, key: lic.key, months: lic.months, note: lic.note });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/keys -> list generated license keys.
router.get('/api/admin/keys', requireAdmin, (_req, res, next) => {
  try {
    res.json({ keys: listLicenses() });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/users -> list + summary
router.get('/api/admin/users', requireAdmin, (_req, res, next) => {
  try {
    const users = listUsersForAdmin();
    const activeSubs = users.filter((u) => !u.state.manual && u.state.active).length;
    const amount = Number(process.env.SUBSCRIPTION_AMOUNT || 790);
    res.json({
      summary: {
        totalUsers: users.length,
        activeSubscribers: activeSubs,
        mrr: activeSubs * amount,
        totalComments: users.reduce((n, u) => n + (u.posted_count || 0), 0),
        amount,
      },
      users,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
