// The admin dashboard page, returned as a string by GET /admin.
// Modern glassmorphic dark UI. Self-contained HTML/CSS/JS, no build step.

export function adminPage() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Admin — Engagement Assistant</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root{
    --bg:#0F172A; --card:#1B2336; --accent:#22C55E; --on-accent:#0F172A;
    --fg:#F8FAFC; --muted:#94A3B8; --border:#475569; --danger:#EF4444; --ring:#60A5FA;
    --glass:rgba(30,41,59,.55); --glass-2:rgba(15,23,42,.5); --glass-border:rgba(148,163,184,.18);
    --ok-bg:rgba(34,197,94,.14); --ok:#4ADE80; --warn-bg:rgba(245,158,11,.15); --warn:#FBBF24;
    --bad-bg:rgba(239,68,68,.15); --bad:#F87171;
    --radius:16px; --radius-sm:11px;
    --font:'Fira Sans',system-ui,-apple-system,sans-serif; --mono:'Fira Code',ui-monospace,monospace;
    --shadow:0 10px 40px rgba(0,0,0,.35);
  }
  *{box-sizing:border-box}
  [hidden]{display:none !important}
  html,body{height:100%}
  body{
    margin:0;color:var(--fg);font:15px/1.55 var(--font);background:var(--bg);
    -webkit-font-smoothing:antialiased;
    background-image:
      radial-gradient(60vw 60vw at 12% -10%, rgba(34,197,94,.14), transparent 60%),
      radial-gradient(55vw 55vw at 100% 0%, rgba(96,165,250,.12), transparent 55%),
      radial-gradient(50vw 50vw at 50% 120%, rgba(139,92,246,.10), transparent 60%);
    background-attachment:fixed;
  }
  @media (prefers-reduced-motion:reduce){*{transition:none !important;animation:none !important}}
  .wrap{max-width:1140px;margin:0 auto;padding:28px 20px 70px}
  .glass{background:var(--glass);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid var(--glass-border);border-radius:var(--radius);box-shadow:var(--shadow)}
  h1{font-size:22px;margin:0;font-weight:700;letter-spacing:-.02em}
  h3{margin:0;font-size:15px;font-weight:600}
  .sub{color:var(--muted);font-size:13px;margin:3px 0 0}
  .muted{color:var(--muted)}
  .mono{font-family:var(--mono);font-feature-settings:'tnum' 1}

  /* buttons */
  button{font:600 14px var(--font);cursor:pointer;border-radius:11px;border:1px solid transparent;transition:filter .18s,border-color .18s,background .18s,transform .05s}
  button:active{transform:translateY(1px)}
  button:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(96,165,250,.5)}
  .btn-primary{background:var(--accent);color:var(--on-accent);padding:10px 16px}
  .btn-primary:hover{filter:brightness(1.08)}
  .btn-ghost{background:rgba(148,163,184,.08);color:var(--fg);border-color:var(--glass-border);padding:9px 14px}
  .btn-ghost:hover{border-color:var(--ring);color:#fff}
  .btn-sm{padding:6px 12px;font-size:12.5px}
  .btn-danger{color:var(--bad);border-color:rgba(239,68,68,.4);background:transparent}
  .btn-danger:hover{background:var(--bad-bg)}

  /* inputs */
  input{width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:11px;background:var(--glass-2);color:var(--fg);font:inherit;transition:border-color .15s,box-shadow .15s}
  input::placeholder{color:rgba(148,163,184,.7)}
  input:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px rgba(34,197,94,.18)}
  label.fld{display:flex;flex-direction:column;gap:6px;font-size:12px;color:var(--muted);font-weight:500}

  /* login */
  .login{max-width:380px;margin:14vh auto 0;padding:28px}
  .login .logo{width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#22C55E,#16A34A);display:grid;place-items:center;margin-bottom:14px}
  .login .logo svg{width:24px;height:24px;color:#06220f}
  .err{color:var(--bad);font-size:13px;margin-top:10px;min-height:16px}

  /* topbar */
  .topbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:20px;flex-wrap:wrap}
  .topbar .actions{display:flex;gap:10px}
  .brand{display:flex;align-items:center;gap:12px}
  .brand .logo{width:38px;height:38px;border-radius:11px;background:linear-gradient(135deg,#22C55E,#16A34A);display:grid;place-items:center}
  .brand .logo svg{width:20px;height:20px;color:#06220f}

  /* stat cards */
  .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:16px}
  @media (max-width:720px){.stats{grid-template-columns:repeat(2,1fr)}}
  .stat{padding:16px 18px}
  .stat .n{font-family:var(--mono);font-size:26px;font-weight:700;letter-spacing:-.02em;line-height:1.1}
  .stat .l{color:var(--muted);font-size:12.5px;margin-top:6px;display:flex;align-items:center;gap:7px}
  .stat .l svg{width:15px;height:15px;color:var(--accent);opacity:.9}

  /* management grid */
  .mgmt{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px}
  @media (max-width:800px){.mgmt{grid-template-columns:1fr}}
  .pane{padding:18px 20px}
  .pane .hint{color:var(--muted);font-size:12.5px;margin:4px 0 14px;line-height:1.5}
  .row{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end}
  .row>button{flex:0 0 auto}
  .msg{font-size:13px;font-weight:600;min-height:16px;margin-top:10px}
  .msg.ok{color:var(--ok)} .msg.err{color:var(--bad)}
  .keyout{margin:12px 0 2px;padding:12px 14px;border:1px dashed var(--accent);border-radius:12px;background:var(--ok-bg);display:flex;align-items:center;justify-content:space-between;gap:10px}
  .keyout code{font-family:var(--mono);font-size:15px;font-weight:700;color:#fff;letter-spacing:.03em}
  .keylist{margin-top:12px;max-height:160px;overflow:auto;display:flex;flex-direction:column;gap:2px}
  .krow{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid var(--glass-border);font-size:12.5px}
  .krow:last-child{border-bottom:none}
  .krow code{font-family:var(--mono);font-weight:600;color:var(--fg)}

  /* badges */
  .badge{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600}
  .badge::before{content:'';width:6px;height:6px;border-radius:50%;background:currentColor}
  .b-active{background:var(--ok-bg);color:var(--ok)}
  .b-manual{background:rgba(96,165,250,.14);color:#93C5FD}
  .b-expired{background:var(--bad-bg);color:var(--bad)}
  .b-cancelled{background:var(--warn-bg);color:var(--warn)}

  /* table */
  .tablewrap{overflow:auto;border-radius:var(--radius)}
  table{border-collapse:collapse;width:100%;min-width:820px}
  thead th{position:sticky;top:0;background:rgba(27,35,54,.9);backdrop-filter:blur(6px);text-align:left;padding:13px 16px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:600;border-bottom:1px solid var(--glass-border)}
  tbody td{padding:13px 16px;border-bottom:1px solid var(--glass-border);white-space:nowrap;font-size:13.5px}
  tbody tr:last-child td{border-bottom:none}
  tbody tr{transition:background .15s}
  tbody tr:hover{background:rgba(148,163,184,.06)}
  td.mono{font-family:var(--mono)}
  td.email{font-weight:600;cursor:pointer;color:#fff}
  td.email:hover{color:var(--accent)}
  td.act{white-space:nowrap}
  td.act button{margin-right:6px}

  /* modal (toggled by .open — never relies on [hidden] alone) */
  .overlay{position:fixed;inset:0;display:none;align-items:flex-start;justify-content:center;padding:40px 16px;overflow:auto;z-index:60;background:rgba(2,6,23,.62);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);animation:fade .18s ease}
  .overlay.open{display:flex}
  @keyframes fade{from{opacity:0}to{opacity:1}}
  .modal{width:100%;max-width:600px;max-height:calc(100vh - 80px);overflow:auto;padding:24px;background:rgba(27,35,54,.92);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border:1px solid var(--glass-border);border-radius:20px;box-shadow:0 24px 70px rgba(0,0,0,.5)}
  .modal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:4px}
  .modal-head h2{margin:0;font-size:19px;font-weight:700;word-break:break-all}
  .mini{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:16px 0}
  .mini .b{background:var(--glass-2);border:1px solid var(--glass-border);border-radius:13px;padding:13px}
  .mini .b .n{font-family:var(--mono);font-size:22px;font-weight:700}
  .mini .b .l{font-size:11.5px;color:var(--muted);margin-top:3px}
  .info{display:grid;grid-template-columns:150px 1fr;gap:9px 14px;margin:14px 0;font-size:13.5px;padding:14px;background:var(--glass-2);border-radius:13px;border:1px solid var(--glass-border)}
  .info .k{color:var(--muted)} .info .v{font-weight:600;word-break:break-all;text-align:right}
  .section-t{font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);font-weight:600;margin:18px 0 8px}
  .track{max-height:240px;overflow:auto;border:1px solid var(--glass-border);border-radius:13px;background:var(--glass-2)}
  .track .t{display:flex;align-items:center;gap:12px;padding:8px 14px;border-bottom:1px solid var(--glass-border);font-size:13px}
  .track .t:last-child{border-bottom:none}
  .track .t .d{width:120px;color:var(--muted);flex:0 0 auto}
  .track .t .barwrap{flex:1;height:8px;background:rgba(148,163,184,.12);border-radius:5px;overflow:hidden}
  .track .t .bar{height:100%;background:linear-gradient(90deg,#22C55E,#4ADE80);border-radius:5px}
  .track .t .c{font-family:var(--mono);font-weight:700;width:34px;text-align:right;flex:0 0 auto}
</style>
</head>
<body>
<div class="wrap">
  <!-- LOGIN -->
  <div id="login" class="glass login">
    <div class="logo"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6 4.4 2.3 7.2L12 16.9 5.7 21l2.3-7.2-6-4.4h7.6z"/></svg></div>
    <h1>Admin</h1>
    <p class="sub">Engagement Assistant</p>
    <form id="loginForm" style="margin-top:16px">
      <input id="pwd" type="password" placeholder="Admin password" autocomplete="current-password" />
      <button id="loginBtn" class="btn-primary" type="submit" style="width:100%;margin-top:12px">Sign in</button>
      <div id="loginErr" class="err"></div>
    </form>
  </div>

  <!-- DASHBOARD -->
  <div id="dash" hidden>
    <div class="topbar">
      <div class="brand">
        <div class="logo"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6 4.4 2.3 7.2L12 16.9 5.7 21l2.3-7.2-6-4.4h7.6z"/></svg></div>
        <div><h1>Users &amp; subscriptions</h1><p class="sub" id="asof"></p></div>
      </div>
      <div class="actions">
        <button id="refresh" class="btn-ghost">Refresh</button>
        <button id="logout" class="btn-ghost">Log out</button>
      </div>
    </div>

    <div class="stats" id="stats"></div>

    <div class="mgmt">
      <div class="glass pane">
        <h3>Generate a license key</h3>
        <p class="hint">Create a key and send it to a UPI / manual buyer. They paste it in the extension (with their email) and it activates for the chosen months.</p>
        <div class="row">
          <label class="fld" style="width:80px">Months<input id="keyMonths" type="number" min="1" max="24" value="1"></label>
          <label class="fld" style="flex:1;min-width:160px">Note (optional)<input id="keyNote" type="text" placeholder="e.g. Ravi — UPI 26 Nov"></label>
          <button id="genKey" class="btn-primary">Generate</button>
        </div>
        <div id="keyOut" class="keyout" hidden></div>
        <div id="keyList" class="keylist"></div>
      </div>

      <div class="glass pane">
        <h3>Add or renew by email</h3>
        <p class="hint">Set a user's access window directly. Start defaults to today, end to one month later.</p>
        <div class="row" style="margin-bottom:10px">
          <label class="fld" style="flex:1;min-width:200px">Email<input id="grantEmail" type="email" placeholder="buyer@email.com"></label>
        </div>
        <div class="row">
          <label class="fld">Start<input id="grantStart" type="date"></label>
          <label class="fld">End<input id="grantEnd" type="date"></label>
          <label class="fld" style="width:110px">Amount (₹)<input id="grantAmount" type="number" min="0" placeholder="790"></label>
          <button id="grantBtn" class="btn-primary">Save</button>
        </div>
        <div id="grantMsg" class="msg"></div>
      </div>
    </div>

    <div class="glass tablewrap">
      <table>
        <thead><tr>
          <th>Email</th><th>Status</th><th>Start</th><th>Renews / expires</th>
          <th>Last payment</th><th>Amount</th><th>Comments</th><th>Joined</th><th>Actions</th>
        </tr></thead>
        <tbody id="rows"></tbody>
      </table>
    </div>
  </div>
</div>

<!-- USER DETAIL MODAL -->
<div id="overlay" class="overlay">
  <div class="modal">
    <div class="modal-head">
      <h2 id="mEmail">User</h2>
      <button class="btn-ghost btn-sm" id="mClose" type="button">Close ✕</button>
    </div>
    <p class="sub" id="mStatus"></p>
    <div class="mini">
      <div class="b"><div class="n mono" id="mPosted">0</div><div class="l">Comments posted</div></div>
      <div class="b"><div class="n mono" id="mDrafted">0</div><div class="l">Drafts made</div></div>
      <div class="b"><div class="n mono" id="mJoined">—</div><div class="l">Joined</div></div>
    </div>
    <div class="info">
      <div class="k">Email</div><div class="v" id="iEmail">—</div>
      <div class="k">Status</div><div class="v" id="iStatus">—</div>
      <div class="k">Subscription start</div><div class="v" id="iStart">—</div>
      <div class="k">Renews / expires</div><div class="v" id="iEnd">—</div>
      <div class="k">Last payment</div><div class="v" id="iPaid">—</div>
      <div class="k">Amount</div><div class="v" id="iAmount">—</div>
      <div class="k">LinkedIn</div><div class="v" id="iLinkedin">—</div>
    </div>
    <div class="section-t">Edit subscription</div>
    <div class="row">
      <label class="fld">Start<input id="mStart" type="date"></label>
      <label class="fld">End<input id="mEnd" type="date"></label>
      <label class="fld" style="width:110px">Amount (₹)<input id="mAmount" type="number" min="0"></label>
      <button id="mSave" class="btn-primary">Save</button>
    </div>
    <div id="mMsg" class="msg"></div>
    <div class="section-t">Daily comment tracker</div>
    <div class="track" id="mTrack"></div>
  </div>
</div>

<script>
const $=(id)=>document.getElementById(id);
const KEY='ea_admin_token';
let token=sessionStorage.getItem(KEY);

function fmtDate(s){ if(!s) return '—'; const d=new Date(s); return isNaN(d)?'—':d.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}); }
function fmtMoney(n){ return (n||n===0)?('₹'+Number(n).toLocaleString('en-IN')):'—'; }
function escapeHtml(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function badge(st){
  if(!st) return '';
  if(st.manual) return '<span class="badge b-manual">Manual</span>';
  if(st.active) return st.status==='cancelled'?'<span class="badge b-cancelled">Cancelling</span>':'<span class="badge b-active">Active</span>';
  return '<span class="badge b-expired">Expired</span>';
}

async function api(path,opts){
  const o=opts||{};
  const r=await fetch(path,{method:o.method||'GET',headers:Object.assign({'content-type':'application/json'},token?{authorization:'Bearer '+token}:{}),body:o.body?JSON.stringify(o.body):undefined});
  if(r.status===401){ logout(); throw new Error('Session expired'); }
  const d=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(d.error||('HTTP '+r.status));
  return d;
}

async function login(e){
  e.preventDefault(); $('loginBtn').disabled=true; $('loginErr').textContent='';
  try{
    const r=await fetch('/api/admin/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password:$('pwd').value})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(d.error||'Login failed');
    token=d.token; sessionStorage.setItem(KEY,token); show();
  }catch(err){ $('loginErr').textContent=err.message; }
  finally{ $('loginBtn').disabled=false; }
}
function show(){ $('login').hidden=true; $('dash').hidden=false; setDateDefaults(); load(); loadKeys(); }
function logout(){ token=null; sessionStorage.removeItem(KEY); $('dash').hidden=true; $('overlay').classList.remove('open'); $('login').hidden=false; }

const IC={users:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',check:'<path d="M20 6L9 17l-5-5"/>',rupee:'<path d="M6 3h12M6 8h12M6 13l8.5 8M6 13h3a5 5 0 0 0 0-10"/>',chat:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'};
function icon(p){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>';}

async function load(){
  try{
    const d=await api('/api/admin/users');
    const s=d.summary||{};
    $('stats').innerHTML=[
      ['Total users',s.totalUsers||0,IC.users],
      ['Active subscribers',s.activeSubscribers||0,IC.check],
      ['MRR',fmtMoney(s.mrr),IC.rupee],
      ['Comments posted',s.totalComments||0,IC.chat],
    ].map(([l,n,ic])=>'<div class="glass stat"><div class="n">'+n+'</div><div class="l">'+icon(ic)+l+'</div></div>').join('');

    $('rows').innerHTML=(d.users||[]).map(u=>{
      const st=u.state||{}; const em=u.email?escapeHtml(u.email):'';
      const act=em?'<td class="act"><button class="btn-ghost btn-sm" data-renew="'+em+'">Renew +1m</button><button class="btn-danger btn-sm" data-revoke="'+em+'">Revoke</button></td>':'<td class="act muted">—</td>';
      return '<tr>'+
        '<td class="email"'+(em?' data-open="'+em+'"':'')+'>'+(em||'<span class="muted" style="cursor:default">no email</span>')+'</td>'+
        '<td>'+badge(st)+'</td>'+
        '<td>'+fmtDate(u.subscription_start)+'</td>'+
        '<td>'+fmtDate(u.current_period_end)+'</td>'+
        '<td>'+fmtDate(u.last_payment_at)+'</td>'+
        '<td class="mono">'+fmtMoney(u.amount)+'</td>'+
        '<td class="mono">'+(u.posted_count||0)+'</td>'+
        '<td>'+fmtDate(u.created_at)+'</td>'+act+'</tr>';
    }).join('') || '<tr><td colspan="9" class="muted" style="padding:26px;text-align:center">No users yet.</td></tr>';

    $('rows').querySelectorAll('[data-renew]').forEach(b=>b.addEventListener('click',()=>userAction('/api/admin/renew',{email:b.dataset.renew,months:1})));
    $('rows').querySelectorAll('[data-revoke]').forEach(b=>b.addEventListener('click',()=>{ if(confirm('End access for '+b.dataset.revoke+' now?')) userAction('/api/admin/revoke',{email:b.dataset.revoke}); }));
    $('rows').querySelectorAll('[data-open]').forEach(td=>td.addEventListener('click',()=>openUser(td.dataset.open)));
    $('asof').textContent='Updated '+new Date().toLocaleString();
  }catch(err){ /* 401 handled; others ignored on dashboard */ }
}

async function userAction(url,body){ try{ await api(url,{method:'POST',body}); await load(); await loadKeys(); }catch(err){ alert(err.message); } }

async function genKey(){
  const btn=$('genKey'); btn.disabled=true;
  try{
    const d=await api('/api/admin/keys',{method:'POST',body:{months:parseInt($('keyMonths').value,10)||1,note:$('keyNote').value}});
    const out=$('keyOut'); out.hidden=false;
    out.innerHTML='<code>'+escapeHtml(d.key)+'</code><button class="btn-ghost btn-sm" id="copyKey" type="button">Copy</button>';
    $('copyKey').addEventListener('click',()=>navigator.clipboard.writeText(d.key).then(()=>{$('copyKey').textContent='Copied';}));
    $('keyNote').value=''; await loadKeys();
  }catch(err){ alert(err.message); } finally{ btn.disabled=false; }
}
async function loadKeys(){
  try{
    const d=await api('/api/admin/keys');
    $('keyList').innerHTML=(d.keys||[]).map(k=>{
      const used=k.redeemed_email?('used · '+escapeHtml(k.redeemed_email)):'<span style="color:var(--ok)">unused</span>';
      return '<div class="krow"><code>'+escapeHtml(k.key)+'</code><span class="muted">'+k.months+'m · '+used+(k.note?(' · '+escapeHtml(k.note)):'')+'</span></div>';
    }).join('') || '<p class="muted" style="font-size:12.5px">No keys yet.</p>';
  }catch(e){}
}
async function grant(){
  $('grantMsg').textContent=''; $('grantMsg').className='msg';
  try{
    const d=await api('/api/admin/grant',{method:'POST',body:{email:$('grantEmail').value.trim(),start:$('grantStart').value,end:$('grantEnd').value,amount:$('grantAmount').value}});
    $('grantMsg').textContent='Saved — active until '+fmtDate(d.subscription.currentPeriodEnd); $('grantMsg').className='msg ok';
    $('grantEmail').value=''; await load();
  }catch(err){ $('grantMsg').textContent=err.message; $('grantMsg').className='msg err'; }
}

let currentEmail=null;
async function openUser(email){
  currentEmail=email;
  $('mEmail').textContent=email; $('mStatus').textContent='Loading…';
  $('mMsg').textContent=''; $('mMsg').className='msg';
  $('mTrack').innerHTML='<div class="t muted">Loading…</div>';
  $('overlay').classList.add('open');
  try{
    const d=await api('/api/admin/user?email='+encodeURIComponent(email));
    const u=d.user||{}, st=d.subscription||{};
    $('mStatus').innerHTML=badge(st)+(st.currentPeriodEnd?(' <span class="muted">· until '+fmtDate(st.currentPeriodEnd)+'</span>'):'');
    $('mPosted').textContent=d.totalPosted||0;
    $('mDrafted').textContent=d.drafted||0;
    $('mJoined').textContent=fmtDate(u.created_at);
    $('iEmail').textContent=u.email||'—';
    $('iStatus').innerHTML=badge(st);
    $('iStart').textContent=fmtDate(u.subscription_start);
    $('iEnd').textContent=fmtDate(u.current_period_end);
    $('iPaid').textContent=fmtDate(u.last_payment_at);
    $('iAmount').textContent=fmtMoney(u.amount);
    $('iLinkedin').textContent=u.linkedin_url||'—';
    $('mStart').value=u.subscription_start?u.subscription_start.slice(0,10):'';
    $('mEnd').value=u.current_period_end?u.current_period_end.slice(0,10):'';
    $('mAmount').value=(u.amount!=null)?u.amount:'';
    const max=Math.max(1,...(d.daily||[]).map(x=>x.count));
    $('mTrack').innerHTML=(d.daily||[]).map(x=>
      '<div class="t"><span class="d">'+fmtDate(x.day)+'</span><span class="barwrap"><span class="bar" style="width:'+Math.round(100*x.count/max)+'%"></span></span><span class="c">'+x.count+'</span></div>'
    ).join('') || '<div class="t muted">No comments yet.</div>';
  }catch(err){
    $('mStatus').textContent='';
    $('mTrack').innerHTML='<div class="t" style="color:var(--bad)">'+escapeHtml(err.message)+' — try again.</div>';
  }
}
async function saveDetail(){
  try{
    const d=await api('/api/admin/grant',{method:'POST',body:{email:currentEmail,start:$('mStart').value,end:$('mEnd').value,amount:$('mAmount').value}});
    $('mMsg').textContent='Saved — active until '+fmtDate(d.subscription.currentPeriodEnd); $('mMsg').className='msg ok';
    await load();
  }catch(err){ $('mMsg').textContent=err.message; $('mMsg').className='msg err'; }
}
function closeModal(){ $('overlay').classList.remove('open'); currentEmail=null; }

function iso(d){ return d.toISOString().slice(0,10); }
function setDateDefaults(){
  const t=new Date(), n=new Date(); n.setMonth(n.getMonth()+1);
  if(!$('grantStart').value) $('grantStart').value=iso(t);
  if(!$('grantEnd').value) $('grantEnd').value=iso(n);
}

$('loginForm').addEventListener('submit',login);
$('refresh').addEventListener('click',()=>{load();loadKeys();});
$('logout').addEventListener('click',logout);
$('genKey').addEventListener('click',genKey);
$('grantBtn').addEventListener('click',grant);
$('mSave').addEventListener('click',saveDetail);
$('mClose').addEventListener('click',closeModal);
$('overlay').addEventListener('click',(e)=>{ if(e.target===$('overlay')) closeModal(); });
document.addEventListener('keydown',(e)=>{ if(e.key==='Escape') closeModal(); });
if(token) show();
</script>
</body>
</html>`;
}
