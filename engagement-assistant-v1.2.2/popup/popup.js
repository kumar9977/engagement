import { api, getConfig, getStore, setStore, DEFAULTS } from '../src/shared.js';

const $ = (id) => document.getElementById(id);

const SURFACE_LABEL = { home: 'Home feed', search: 'Keyword search', profile: 'Target profiles', own_post: 'Your posts' };
const CATEGORY_LABEL = { question: 'Question', appreciation: 'Appreciation', relatable: 'Relatable', value_add: 'Value-add' };
const PLATFORM_LABEL = { linkedin: 'LinkedIn', instagram: 'Instagram' };

function setDot(ok, text) {
  $('dot').className = 'dot ' + (ok ? 'ok' : 'bad');
  $('dot').title = text || '';
}
function msg(el, text, ok = false) {
  el.textContent = text;
  el.className = 'msg ' + (ok ? 'ok' : 'err');
}
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

async function renderWarning() {
  const { lastWarning } = await getStore(['lastWarning']);
  if (lastWarning?.message) {
    $('warnCard').hidden = false;
    $('warnMsg').textContent = lastWarning.message;
  } else {
    $('warnCard').hidden = true;
  }
}

function showGate(sub) {
  $('gate').hidden = false;
  $('dash').hidden = true;
  const badge = $('gateBadge');
  if (sub && sub.status === 'cancelled') {
    badge.textContent = 'Expired';
  } else if (sub && sub.currentPeriodEnd) {
    badge.textContent = `Expired ${fmtDate(sub.currentPeriodEnd)}`;
  } else {
    badge.textContent = 'Not subscribed';
  }
}

function showDash(sub) {
  $('gate').hidden = true;
  $('dash').hidden = false;
  const badge = $('subBadge');
  if (sub?.manual) {
    badge.textContent = 'Licensed';
    $('renewLine').textContent = '';
  } else if (sub?.status === 'cancelled' && sub?.currentPeriodEnd) {
    badge.textContent = 'Cancelling';
    badge.className = 'badge b-warn';
    $('renewLine').textContent = `Access until ${fmtDate(sub.currentPeriodEnd)}`;
  } else {
    badge.textContent = 'Active';
    badge.className = 'badge b-ok';
    $('renewLine').textContent = sub?.currentPeriodEnd ? `Renews ${fmtDate(sub.currentPeriodEnd)}` : '';
  }
}

async function renderSummary() {
  const res = await api('/session-summary');
  if (!res.ok) return;
  const s = res.data;
  $('total').textContent = s.total;

  const platformPills = $('byPlatform');
  platformPills.replaceChildren();
  for (const [key, count] of Object.entries(s.byPlatform || {})) {
    const pill = document.createElement('span');
    pill.textContent = `${PLATFORM_LABEL[key] || key}: ${count}`;
    platformPills.appendChild(pill);
  }

  const categoryPills = $('byCategory');
  categoryPills.replaceChildren();
  for (const [key, count] of Object.entries(s.byCategory || {})) {
    const pill = document.createElement('span');
    pill.textContent = `${CATEGORY_LABEL[key] || key}: ${count}`;
    categoryPills.appendChild(pill);
  }
}

function formatDay(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today - d) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

async function renderDaily() {
  const res = await api('/daily-summary?days=7');
  const container = $('dailyList');
  container.replaceChildren();
  if (!res.ok) {
    const err = document.createElement('div');
    err.className = 'muted';
    err.textContent = 'Could not load daily history.';
    container.appendChild(err);
    return;
  }
  const { daily = [], total = 0 } = res.data;
  $('dailyTotal').textContent = total ? `${total} total · 7 days` : '';

  if (!daily.length) {
    const empty = document.createElement('div');
    empty.className = 'muted';
    empty.textContent = 'No comments posted in the last 7 days.';
    container.appendChild(empty);
    return;
  }

  for (const [index, day] of daily.entries()) {
    const details = document.createElement('details');
    details.className = 'day';
    if (index === 0) details.open = true;

    const summary = document.createElement('summary');
    const label = document.createElement('span');
    label.textContent = formatDay(day.date);
    const count = document.createElement('span');
    count.className = 'count';
    count.textContent = String(day.count);
    summary.append(label, count);
    details.appendChild(summary);

    const list = document.createElement('ul');
    list.className = 'dayComments';
    for (const c of day.comments || []) {
      const li = document.createElement('li');
      const text = document.createElement('div');
      text.textContent = c.comment;
      li.appendChild(text);

      const metaParts = [];
      if (c.platform) metaParts.push(PLATFORM_LABEL[c.platform] || c.platform);
      if (c.surface) metaParts.push(SURFACE_LABEL[c.surface] || c.surface);
      if (c.category) metaParts.push(CATEGORY_LABEL[c.category] || c.category);
      if (metaParts.length) {
        const meta = document.createElement('span');
        meta.className = 'muted meta';
        meta.textContent = metaParts.join(' · ');
        li.appendChild(meta);
      }
      list.appendChild(li);
    }
    details.appendChild(list);
    container.appendChild(details);
  }
}

async function subscribe() {
  const { paymentUrl } = await getConfig();
  chrome.tabs.create({ url: paymentUrl || DEFAULTS.paymentUrl });
}

async function activate() {
  const email = $('activateEmail').value.trim();
  const key = $('activateKey').value.trim();
  if (!email) return msg($('activateMsg'), 'Enter your email first.', false);
  $('activate').disabled = true;
  msg($('activateMsg'), 'Checking…', true);

  // With a license key, redeem it; otherwise activate by email (Razorpay payers).
  const res = key
    ? await api('/license-check', { method: 'POST', auth: false, body: { key, email } })
    : await api('/activate', { method: 'POST', auth: false, body: { email } });

  $('activate').disabled = false;
  if (!res.ok) return msg($('activateMsg'), res.error || 'Could not activate.', false);

  await setStore({ token: res.data.token, profile: res.data.user, email, license: key || undefined });
  msg($('activateMsg'), 'Activated!', true);
  await render();
}

async function render() {
  await renderWarning();

  const { token, apiBase } = await getConfig();
  const health = await api('/health', { auth: false });
  setDot(health.ok, health.ok ? `Connected to ${apiBase}` : health.error || 'Backend unreachable');

  // Prefill the activation email / key if we have them stored.
  const { email, license } = await getStore(['email', 'license']);
  if (email && $('activateEmail')) $('activateEmail').value = email;
  if (license && $('activateKey')) $('activateKey').value = license;

  if (!token) return showGate(null);

  const me = await api('/me');
  if (!me.ok) {
    // Token invalid/expired session -> ask them to subscribe/activate.
    return showGate(null);
  }
  const sub = me.data.subscription || {};
  if (!sub.active) return showGate(sub);

  showDash(sub);
  await Promise.all([renderSummary(), renderDaily()]);
}

$('subscribe').addEventListener('click', subscribe);
$('activate').addEventListener('click', activate);
$('activateEmail').addEventListener('keydown', (e) => { if (e.key === 'Enter') activate(); });
$('openOptions').addEventListener('click', () => chrome.runtime.openOptionsPage());
$('clearWarn').addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'CLEAR_WARNING' }).catch(() => {});
  await renderWarning();
});

render();
