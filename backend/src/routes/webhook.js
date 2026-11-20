// Razorpay webhook. Razorpay POSTs here when a payment succeeds / a subscription
// charges or changes. We verify the signature, then activate the payer's account
// by the email they checked out with. The raw body is required for the signature,
// so this route is mounted with express.raw() in server.js (before express.json).

import { Router } from 'express';
import crypto from 'node:crypto';
import { recordPayment, markSubscription } from '../db.js';

const router = Router();

function verifySignature(rawBody, signature, secret) {
  if (!secret || !signature || !rawBody) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Pull a customer email out of the various entity shapes Razorpay sends.
function extractEmail(payload) {
  return (
    payload?.payment?.entity?.email ||
    payload?.payment?.entity?.notes?.email ||
    payload?.subscription?.entity?.notes?.email ||
    payload?.order?.entity?.notes?.email ||
    payload?.payment_link?.entity?.customer?.email ||
    null
  );
}

// POST /api/webhook/razorpay
router.post('/webhook/razorpay', (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[webhook] RAZORPAY_WEBHOOK_SECRET not set; rejecting.');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  // req.body is a Buffer here (express.raw). Keep it raw for the signature.
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
  const signature = req.get('x-razorpay-signature');
  if (!verifySignature(raw, signature, secret)) {
    console.warn('[webhook] bad signature');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  let event;
  try {
    event = JSON.parse(raw.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const type = event?.event;
  const payload = event?.payload || {};
  const email = extractEmail(payload);

  try {
    switch (type) {
      case 'payment.captured':
      case 'order.paid':
      case 'payment_link.paid':
      case 'subscription.charged':
      case 'subscription.activated': {
        if (!email) {
          console.warn(`[webhook] ${type} with no email; cannot activate.`);
          break;
        }
        const amountPaise =
          payload?.payment?.entity?.amount ?? payload?.order?.entity?.amount ?? null;
        const amount = amountPaise != null ? Math.round(amountPaise / 100) : null;
        const subEntity = payload?.subscription?.entity;
        // Razorpay subscription "current_end" is a UNIX timestamp (seconds).
        const currentPeriodEnd = subEntity?.current_end
          ? new Date(subEntity.current_end * 1000).toISOString()
          : null;

        const user = recordPayment({
          email,
          amount,
          paymentId: payload?.payment?.entity?.id || null,
          subscriptionId: subEntity?.id || null,
          currentPeriodEnd,
        });
        console.log(`[webhook] ${type}: activated ${email} until ${user.current_period_end}`);
        break;
      }

      case 'subscription.cancelled':
      case 'subscription.halted':
      case 'subscription.paused': {
        if (email) {
          markSubscription(email, 'cancelled');
          console.log(`[webhook] ${type}: marked ${email} cancelled (access until period end)`);
        }
        break;
      }

      case 'subscription.completed': {
        if (email) markSubscription(email, 'expired');
        break;
      }

      default:
        // Acknowledge everything else so Razorpay stops retrying.
        break;
    }
  } catch (err) {
    console.error('[webhook] handler error', err);
    // Still 200 so Razorpay does not hammer us; we logged it.
  }

  res.json({ ok: true });
});

export default router;
