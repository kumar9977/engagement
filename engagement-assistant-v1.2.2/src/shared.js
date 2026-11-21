// Shared API client + storage helpers, used by popup, options, and background.
// The backend base URL and the auth token live in chrome.storage.local.

export const DEFAULTS = {
  // Hosted backend. Clients connect here by default; change it only to run a
  // local backend (http://localhost:8787).
  apiBase: 'https://engagement-assistant-backend.onrender.com',
  // The ₹790/month Razorpay subscribe link.
  paymentUrl: 'https://rzp.io/rzp/sim9G4s',
  subscriptionAmount: 790,
};

export async function getStore(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}
export async function setStore(obj) {
  return new Promise((resolve) => chrome.storage.local.set(obj, resolve));
}

export async function getConfig() {
  const { apiBase, token, license, profile } = await getStore([
    'apiBase',
    'token',
    'license',
    'profile',
  ]);
  return {
    apiBase: apiBase || DEFAULTS.apiBase,
    token: token || null,
    license: license || null,
    profile: profile || null,
  };
}

// Thin fetch wrapper with auth + uniform error handling. Never throws a raw
// network error at the caller; returns { ok, data, error, status }.
// Re-run license-check with the stored key to get a fresh token. Used to
// transparently recover when a token expires or the backend DB was reset.
async function refreshToken(base, prefix) {
  const { license } = await getConfig();
  if (!license) return false;
  const { email } = await getStore(['email']);
  try {
    const res = await fetch(`${base}${prefix}/license-check`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key: license, email: email || null }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    await setStore({ token: data.token, profile: data.user });
    return true;
  } catch {
    return false;
  }
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const BACKOFF_MS = [1000, 3000, 6000]; // waits between transient retries
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Thin fetch wrapper with auth, automatic token refresh, and transient-retry.
// A hosted free-tier backend can briefly go away (restart / cold start); rather
// than surface "cannot reach backend" on the first blip, we retry a few times
// with backoff so those moments are invisible to the user.
export async function api(path, { method = 'GET', body, auth = true } = {}) {
  const { apiBase, token } = await getConfig();
  const headers = { 'content-type': 'application/json' };
  if (auth && token) headers.authorization = `Bearer ${token}`;

  // The backend mounts every route under /api. Build the URL robustly whether
  // the user typed a trailing slash or already included /api.
  const base = (apiBase || DEFAULTS.apiBase).replace(/\/+$/, '');
  const prefix = base.endsWith('/api') ? '' : '/api';
  const url = `${base}${prefix}${path}`;

  let attempt = 0;
  let tokenRefreshed = false;
  const max = BACKOFF_MS.length;

  while (true) {
    let res;
    try {
      res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    } catch {
      // Network error / server unreachable — retry a few times before giving up.
      if (attempt < max) { await sleep(BACKOFF_MS[attempt++]); continue; }
      return { ok: false, status: 0, error: `Cannot reach the backend. Please wait a few seconds and try again.` };
    }

    let data = null;
    try { data = await res.json(); } catch { /* non-json response */ }

    if (res.ok) return { ok: true, status: res.status, data };

    // A stale/expired token: refresh once with the stored license, then retry
    // immediately (this does not count against the transient-retry budget).
    if (res.status === 401 && auth && !tokenRefreshed) {
      tokenRefreshed = true;
      if (await refreshToken(base, prefix)) {
        const { token: fresh } = await getConfig();
        if (fresh) headers.authorization = `Bearer ${fresh}`;
        continue;
      }
    }

    // Transient server errors (restart / overload): back off and retry.
    if (RETRYABLE_STATUS.has(res.status) && attempt < max) {
      await sleep(BACKOFF_MS[attempt++]);
      continue;
    }

    return { ok: false, status: res.status, error: data?.error || `HTTP ${res.status}`, data };
  }
}
