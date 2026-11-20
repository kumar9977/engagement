// Admin dashboard: a password-protected page to see users, their subscription
// start dates, renewal dates, and usage. Served at GET /admin. The password is
// ADMIN_PASSWORD in .env; the JSON APIs require the token from /api/admin/login.

import { Router } from 'express';
import crypto from 'node:crypto';
import { issueAdminToken, requireAdmin } from '../auth.js';
import { listUsersForAdmin } from '../db.js';
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
router.get('/admin', (_req, res) => {
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
