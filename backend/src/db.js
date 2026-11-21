// SQLite setup + schema. Minimal data model:
//   users, settings, engagement_log, licenses.
// (No warm-up / pacing / auto-post state is stored, by design: the user posts
//  every comment themselves, so there is no scheduler state to persist.)

import Database from 'libsql';
import crypto from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Storage:
//  - If TURSO_DATABASE_URL + TURSO_AUTH_TOKEN are set, use the Turso cloud
//    database directly (remote mode). This is durable: it survives restarts and
//    redeploys on hosts with an ephemeral filesystem (e.g. Render free), unlike
//    a local file. Every query goes to Turso, so reads and writes are strongly
//    consistent with no sync step.
//  - Otherwise fall back to a local SQLite file (local dev / self-hosting).
// libsql is a drop-in for better-sqlite3's synchronous API, so no other code
// changes are needed.
const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

export const db =
  TURSO_URL && TURSO_TOKEN
    ? new Database(TURSO_URL, { authToken: TURSO_TOKEN })
    : (() => {
        const dbPath = resolve(__dirname, '..', process.env.DB_PATH || './data/app.db');
        mkdirSync(dirname(dbPath), { recursive: true });
        const local = new Database(dbPath);
        try { local.pragma('journal_mode = WAL'); } catch { /* ignore */ }
        return local;
      })();

if (TURSO_URL && TURSO_TOKEN) console.log('[db] using Turso cloud database (durable)');
else console.log('[db] using local SQLite file');

try { db.pragma('foreign_keys = ON'); } catch { /* remote libsql manages this itself */ }

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT UNIQUE,
    linkedin_url  TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    user_id         INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    tone            TEXT    NOT NULL DEFAULT 'friendly',   -- 'friendly' | 'professional'
    links           TEXT    NOT NULL DEFAULT '[]',          -- JSON: [{label,url}] (context only, never spammed)
    keywords        TEXT    NOT NULL DEFAULT '[]',          -- JSON: string[]
    industries      TEXT    NOT NULL DEFAULT '[]',          -- JSON: string[]
    target_profiles TEXT    NOT NULL DEFAULT '[]',          -- JSON: string[] of profile URLs
    guideline       TEXT    NOT NULL DEFAULT '',            -- the drafting system-prompt template
    fill_mode       TEXT    NOT NULL DEFAULT 'queue',       -- 'queue' | 'autofill' | 'clipboard' (never auto-posts)
    review_before   INTEGER NOT NULL DEFAULT 1,             -- kept for UI; user always posts manually anyway
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS engagement_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_url    TEXT,
    surface     TEXT,     -- 'home' | 'search' | 'profile' | 'own_post'
    category    TEXT,     -- 'question' | 'appreciation' | 'relatable' | 'value_add'
    comment     TEXT NOT NULL,
    comment_norm TEXT NOT NULL,  -- normalized text, used for near-duplicate detection
    status      TEXT NOT NULL DEFAULT 'drafted', -- 'drafted' | 'posted' | 'skipped'
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_log_user ON engagement_log(user_id, created_at);

  CREATE TABLE IF NOT EXISTS licenses (
    key         TEXT PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status      TEXT NOT NULL DEFAULT 'active', -- 'active' | 'revoked'
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// --- Lightweight migrations for databases created before these columns -----
function addColumnIfMissing(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}
addColumnIfMissing('engagement_log', 'platform', "TEXT NOT NULL DEFAULT 'linkedin'");
addColumnIfMissing('settings', 'platforms', `TEXT NOT NULL DEFAULT '["linkedin","instagram"]'`);
addColumnIfMissing('settings', 'email_reports', 'INTEGER NOT NULL DEFAULT 0');

// Subscription / billing fields (Razorpay). Added to users so activation can be
// keyed to the email the customer paid with.
addColumnIfMissing('users', 'subscription_status', 'TEXT');          // 'active' | 'cancelled' | 'expired' | NULL (manual/comp)
addColumnIfMissing('users', 'subscription_start', 'TEXT');           // ISO; first time they paid
addColumnIfMissing('users', 'current_period_end', 'TEXT');           // ISO; access valid until this moment
addColumnIfMissing('users', 'last_payment_at', 'TEXT');              // ISO
addColumnIfMissing('users', 'last_payment_id', 'TEXT');              // Razorpay payment id
addColumnIfMissing('users', 'subscription_id', 'TEXT');              // Razorpay subscription id (if recurring)
addColumnIfMissing('users', 'amount', 'INTEGER');                    // last amount in rupees
addColumnIfMissing('users', 'is_admin', 'INTEGER NOT NULL DEFAULT 0');

// License-key fields: duration keys activate a bounded subscription when a
// customer redeems them (used for UPI / manual payers). A NULL `months` means a
// legacy unlimited key.
addColumnIfMissing('licenses', 'months', 'INTEGER');                 // length in months (NULL = unlimited/legacy)
addColumnIfMissing('licenses', 'redeemed_by_user_id', 'INTEGER');    // who redeemed it
addColumnIfMissing('licenses', 'redeemed_at', 'TEXT');               // when
addColumnIfMissing('licenses', 'note', 'TEXT');                      // owner's label (e.g. who it's for)

// --- Helpers ---------------------------------------------------------------

export function getOrCreateUser({ email = null, linkedinUrl = null } = {}) {
  if (email) {
    const existing = db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(email);
    if (existing) return existing;
  }
  const info = db
    .prepare('INSERT INTO users (email, linkedin_url) VALUES (?, ?)')
    .run(email, linkedinUrl);
  ensureSettings(info.lastInsertRowid);
  return db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
}

export function getUserByEmail(email) {
  if (!email) return null;
  return db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(email) || null;
}

// Derives whether a user currently has access.
//   - A user who never paid (no subscription_start) is treated as a manual /
//     comp account and is always allowed (grandfathered).
//   - A paid user has access while current_period_end is in the future, even if
//     their subscription is cancelled (they keep what they paid for).
export function subscriptionState(user) {
  if (!user) return { active: false, manual: false, status: null };
  if (!user.subscription_start) {
    return { active: true, manual: true, status: 'manual' };
  }
  const end = user.current_period_end ? Date.parse(user.current_period_end) : NaN;
  const inDate = Number.isFinite(end) && end > Date.now();
  const active = inDate && user.subscription_status !== 'revoked' && user.subscription_status !== 'expired';
  return {
    active,
    manual: false,
    status: user.subscription_status || 'pending',
    start: user.subscription_start,
    currentPeriodEnd: user.current_period_end,
    amount: user.amount,
  };
}

// Records a successful payment: creates/links the user by email and extends the
// access window. Called from the Razorpay webhook. `currentPeriodEnd` (ISO),
// when provided by Razorpay, wins; otherwise we extend by `periodDays`.
export function recordPayment({
  email,
  amount = null,
  paymentId = null,
  subscriptionId = null,
  periodDays = 31,
  currentPeriodEnd = null,
  linkedinUrl = null,
}) {
  const user = getOrCreateUser({ email, linkedinUrl });
  const now = new Date();
  const nowIso = now.toISOString();

  let endIso = currentPeriodEnd;
  if (!endIso) {
    // Extend from the later of "now" and any remaining paid time (early renew).
    const existingEnd = user.current_period_end ? Date.parse(user.current_period_end) : NaN;
    const base = Number.isFinite(existingEnd) && existingEnd > now.getTime()
      ? new Date(existingEnd)
      : now;
    endIso = new Date(base.getTime() + periodDays * 86400000).toISOString();
  }

  db.prepare(
    `UPDATE users SET
       subscription_status = 'active',
       subscription_start = COALESCE(subscription_start, ?),
       current_period_end = ?,
       last_payment_at = ?,
       last_payment_id = COALESCE(?, last_payment_id),
       subscription_id = COALESCE(?, subscription_id),
       amount = COALESCE(?, amount)
     WHERE id = ?`
  ).run(nowIso, endIso, nowIso, paymentId, subscriptionId, amount, user.id);

  ensureSettings(user.id);
  return db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
}

// Marks a subscription cancelled/expired without immediately cutting access.
export function markSubscription(email, status) {
  const user = getUserByEmail(email);
  if (!user) return null;
  db.prepare('UPDATE users SET subscription_status = ? WHERE id = ?').run(status, user.id);
  return db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Admin: manually create or update a user's subscription window (for UPI / manual
// payers who have no auto-pay). startIso and endIso are ISO date-times.
export function adminSetSubscription({ email, startIso, endIso, amount = null }) {
  const clean = (email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(clean)) throw Object.assign(new Error('Enter a valid email address'), { status: 400 });
  if (!startIso || !endIso || Number.isNaN(Date.parse(startIso)) || Number.isNaN(Date.parse(endIso))) {
    throw Object.assign(new Error('Start and end dates are required'), { status: 400 });
  }
  if (Date.parse(endIso) <= Date.parse(startIso)) {
    throw Object.assign(new Error('End date must be after the start date'), { status: 400 });
  }
  const user = getOrCreateUser({ email: clean });
  db.prepare(
    `UPDATE users SET
       subscription_status = 'active',
       subscription_start = ?,
       current_period_end = ?,
       last_payment_at = ?,
       amount = COALESCE(?, amount)
     WHERE id = ?`
  ).run(startIso, endIso, new Date().toISOString(), amount, user.id);
  ensureSettings(user.id);
  return db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
}

// Admin: extend a user's access by N months from the later of now / their
// current end date (an early renewal keeps the unused days).
export function adminRenew(email, months = 1, amount = null) {
  const clean = (email || '').trim().toLowerCase();
  const user = getUserByEmail(clean);
  if (!user) throw Object.assign(new Error('No user with that email. Add them first.'), { status: 404 });
  const now = Date.now();
  const existingEnd = user.current_period_end ? Date.parse(user.current_period_end) : NaN;
  const base = new Date(Number.isFinite(existingEnd) && existingEnd > now ? existingEnd : now);
  const end = new Date(base);
  end.setMonth(end.getMonth() + Math.max(1, Number(months) || 1));
  db.prepare(
    `UPDATE users SET
       subscription_status = 'active',
       subscription_start = COALESCE(subscription_start, ?),
       current_period_end = ?,
       last_payment_at = ?,
       amount = COALESCE(?, amount)
     WHERE id = ?`
  ).run(new Date().toISOString(), end.toISOString(), new Date().toISOString(), amount, user.id);
  return db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
}

// Admin: generate a new license key that activates for `months` when a customer
// redeems it in the extension. `note` is an optional label (e.g. the buyer).
function randomKey() {
  const raw = crypto.randomBytes(12).toString('base64').replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const s = (raw + 'ABCDEFGHJKMNPQRSTUVWXYZ23456789').slice(0, 12);
  return `EA-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}
export function generateLicenseKey({ months = 1, note = null } = {}) {
  const m = Math.max(1, Math.min(24, Number(months) || 1));
  let key = randomKey();
  for (let i = 0; i < 5 && db.prepare('SELECT 1 FROM licenses WHERE key = ?').get(key); i++) key = randomKey();
  db.prepare('INSERT INTO licenses (key, status, months, note) VALUES (?, ?, ?, ?)')
    .run(key, 'active', m, (note || '').trim() || null);
  return db.prepare('SELECT * FROM licenses WHERE key = ?').get(key);
}

export function listLicenses() {
  return db
    .prepare(
      `SELECT l.key, l.status, l.months, l.note, l.created_at, l.redeemed_at,
              u.email AS redeemed_email,
              ru.current_period_end AS redeemer_end
         FROM licenses l
         LEFT JOIN users u  ON u.id  = l.redeemed_by_user_id
         LEFT JOIN users ru ON ru.id = l.redeemed_by_user_id
        WHERE l.months IS NOT NULL
        ORDER BY l.created_at DESC
        LIMIT 200`
    )
    .all();
}

// Admin: end a user's access immediately.
export function adminRevoke(email) {
  const clean = (email || '').trim().toLowerCase();
  const user = getUserByEmail(clean);
  if (!user) throw Object.assign(new Error('No user with that email'), { status: 404 });
  db.prepare(
    `UPDATE users SET subscription_status = 'expired', current_period_end = ? WHERE id = ?`
  ).run(new Date().toISOString(), user.id);
  return db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
}

// Rows for the admin dashboard: one per user, with subscription + usage.
export function listUsersForAdmin() {
  const rows = db
    .prepare(
      `SELECT u.id, u.email, u.linkedin_url, u.created_at,
              u.subscription_status, u.subscription_start, u.current_period_end,
              u.last_payment_at, u.amount, u.subscription_id,
              (SELECT COUNT(*) FROM engagement_log e
                 WHERE e.user_id = u.id AND e.status = 'posted') AS posted_count,
              (SELECT MAX(created_at) FROM engagement_log e
                 WHERE e.user_id = u.id AND e.status = 'posted') AS last_posted_at
         FROM users u
        ORDER BY u.id DESC`
    )
    .all();
  return rows.map((r) => ({ ...r, state: subscriptionState(r) }));
}

export function ensureSettings(userId) {
  const row = db.prepare('SELECT user_id FROM settings WHERE user_id = ?').get(userId);
  if (!row) db.prepare('INSERT INTO settings (user_id) VALUES (?)').run(userId);
}

export function getSettings(userId) {
  ensureSettings(userId);
  const s = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(userId);
  let platforms;
  try { platforms = JSON.parse(s.platforms); } catch { platforms = ['linkedin', 'instagram']; }
  if (!Array.isArray(platforms) || !platforms.length) platforms = ['linkedin', 'instagram'];
  return {
    tone: s.tone,
    links: JSON.parse(s.links),
    keywords: JSON.parse(s.keywords),
    industries: JSON.parse(s.industries),
    targetProfiles: JSON.parse(s.target_profiles),
    guideline: s.guideline,
    fillMode: s.fill_mode,
    reviewBefore: !!s.review_before,
    platforms,
    emailReports: !!s.email_reports,
    updatedAt: s.updated_at,
  };
}

export function saveSettings(userId, patch) {
  ensureSettings(userId);
  const cur = getSettings(userId);
  const next = { ...cur, ...patch };
  const VALID_PLATFORMS = ['linkedin', 'instagram'];
  let platforms = Array.isArray(next.platforms)
    ? next.platforms.filter((p) => VALID_PLATFORMS.includes(p))
    : VALID_PLATFORMS;
  if (!platforms.length) platforms = VALID_PLATFORMS;

  db.prepare(
    `UPDATE settings SET
       tone = ?, links = ?, keywords = ?, industries = ?,
       target_profiles = ?, guideline = ?, fill_mode = ?, review_before = ?,
       platforms = ?, email_reports = ?,
       updated_at = datetime('now')
     WHERE user_id = ?`
  ).run(
    next.tone,
    JSON.stringify(next.links ?? []),
    JSON.stringify(next.keywords ?? []),
    JSON.stringify(next.industries ?? []),
    JSON.stringify(next.targetProfiles ?? []),
    next.guideline ?? '',
    ['queue', 'autofill', 'clipboard'].includes(next.fillMode) ? next.fillMode : 'queue',
    next.reviewBefore ? 1 : 0,
    JSON.stringify(platforms),
    next.emailReports ? 1 : 0,
    userId
  );
  return getSettings(userId);
}
