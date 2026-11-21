import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cron from 'node-cron';

import './db.js'; // initialize schema on boot
import { activeProvider } from './llm.js';
import { sendDailyReports, smtpConfigured } from './mailer.js';
import licenseRoutes from './routes/license.js';
import settingsRoutes from './routes/settings.js';
import draftRoutes from './routes/draft.js';
import engagementRoutes from './routes/engagement.js';
import reportRoutes from './routes/reports.js';
import webhookRoutes from './routes/webhook.js';
import adminRoutes from './routes/admin.js';
import legalRoutes from './routes/legal.js';

const APP_VERSION = '1.2.3';

// Don't let a single stray async error take the whole server (and therefore
// every user) down. Log and keep serving instead of crashing.
process.on('unhandledRejection', (reason) => console.error('[unhandledRejection]', reason));
process.on('uncaughtException', (err) => console.error('[uncaughtException]', err));

const app = express();

// The Razorpay webhook signature is computed over the RAW request body, so this
// route must see the raw bytes — mount it before express.json().
app.use('/api/webhook/razorpay', express.raw({ type: '*/*', limit: '1mb' }));

app.use(express.json({ limit: '6mb' })); // room for captured video frames (base64 images)

const origins = (process.env.ALLOWED_ORIGINS || '*')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: origins.includes('*') ? true : origins,
    methods: ['GET', 'POST'],
  })
);

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now(), version: APP_VERSION }));

app.use('/api', webhookRoutes); // POST /api/webhook/razorpay (raw body parsed above)
app.use('/api', licenseRoutes);
app.use('/api', settingsRoutes);
app.use('/api', draftRoutes);
app.use('/api', engagementRoutes);
app.use('/api', reportRoutes);
app.use(adminRoutes); // GET /admin, POST /api/admin/login, GET /api/admin/users
app.use(legalRoutes); // GET /privacy

// Central error handler: never leak a stack to the client, never crash.
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) console.error('[error]', err);
  res.status(status).json({ error: err.message || 'Internal error' });
});

const port = Number(process.env.PORT || 8787);
app.listen(port, () => {
  console.log(`Engagement Assistant backend listening on http://localhost:${port}`);
  const provider = activeProvider();
  const model = provider === 'gemini'
    ? (process.env.GEMINI_MODEL || 'gemini-flash-latest')
    : (process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001');
  console.log(`LLM provider: ${provider} (model: ${model})`);

  // Keep-warm: on Render's free tier the instance spins down after ~15 min of
  // inactivity, and the next request pays a 50s+ cold start that shows up to
  // users as a "timeout". Pinging our own public URL every few minutes resets
  // that idle timer so the service stays warm during the day.
  const selfUrl = process.env.RENDER_EXTERNAL_URL || process.env.SELF_URL;
  if (selfUrl && String(process.env.KEEP_WARM || 'true') === 'true') {
    const warmCron = process.env.KEEP_WARM_CRON || '*/10 * * * *'; // every 10 min
    if (cron.validate(warmCron)) {
      cron.schedule(warmCron, async () => {
        try { await fetch(`${selfUrl.replace(/\/$/, '')}/api/health`); } catch { /* ignore */ }
      });
      console.log(`Keep-warm ping: ${warmCron} -> ${selfUrl}/api/health`);
    }
  }

  // Daily email report scheduler. Default 6pm server time; override with REPORT_CRON.
  const schedule = process.env.REPORT_CRON || '0 18 * * *';
  if (cron.validate(schedule)) {
    cron.schedule(schedule, () => {
      sendDailyReports().catch((e) => console.error('[cron] report run failed', e));
    });
    console.log(`Daily report cron: ${schedule} ${smtpConfigured() ? '(SMTP ready)' : '(SMTP not configured, will skip)'}`);
  } else {
    console.warn(`Invalid REPORT_CRON "${schedule}"; daily reports disabled.`);
  }
});
