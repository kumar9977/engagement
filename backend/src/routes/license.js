import { Router } from 'express';
import { checkLicense, activateByEmail, requireAuthToken } from '../auth.js';
import { subscriptionState } from '../db.js';

const router = Router();

// POST /api/license-check  { key, email?, linkedinUrl? } -> { token, user }
// Manual / self-hosted / comp accounts: activate with a license key.
router.post('/license-check', (req, res, next) => {
  try {
    const { key, email, linkedinUrl } = req.body || {};
    const { token, user } = checkLicense({ key, email, linkedinUrl });
    res.json({ token, user: { id: user.id, email: user.email, linkedinUrl: user.linkedin_url } });
  } catch (err) {
    next(err);
  }
});

// POST /api/activate  { email, linkedinUrl? } -> { token, user, subscription }
// Paid users: activate with the email they checked out with on Razorpay.
router.post('/activate', (req, res, next) => {
  try {
    const { email, linkedinUrl } = req.body || {};
    const { token, user } = activateByEmail({ email, linkedinUrl });
    res.json({
      token,
      user: { id: user.id, email: user.email, linkedinUrl: user.linkedin_url },
      subscription: subscriptionState(user),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/me -> account + subscription status (readable even if lapsed).
router.get('/me', requireAuthToken, (req, res) => {
  const u = req.user;
  res.json({
    user: { id: u.id, email: u.email, linkedinUrl: u.linkedin_url },
    subscription: subscriptionState(u),
  });
});

export default router;
