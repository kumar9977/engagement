// The admin dashboard page, returned as a string by GET /admin.
// Plain HTML/CSS/JS, no build step. Logs in against /api/admin/login and renders
// the users table from /api/admin/users.

export function adminPage() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Admin — Engagement Assistant</title>
<style>
  :root{
    --bg:#f6f7f9; --panel:#fff; --ink:#111827; --muted:#6b7280; --line:#e5e7eb;
    --accent:#4f46e5; --ok:#15803d; --okbg:#dcfce7; --warn:#b45309; --warnbg:#fef3c7;
    --bad:#b91c1c; --badbg:#fee2e2; --radius:14px;
  }
  @media (prefers-color-scheme:dark){
    :root{ --bg:#0e1116; --panel:#171c23; --ink:#e8edf2; --muted:#93a1b2; --line:#2a323d;
      --accent:#8b93ff; --okbg:#16351f; --ok:#4ade80; --warnbg:#3a2e12; --warn:#fbbf24; --badbg:#3a1618; --bad:#f87171; }
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}
  .wrap{max-width:1060px;margin:0 auto;padding:28px 20px 60px}
  h1{font-size:20px;margin:0 0 2px;letter-spacing:-.01em}
  .sub{color:var(--muted);margin:0 0 22px;font-size:13px}
  .card{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:18px 20px}
  /* login */
  .login{max-width:360px;margin:12vh auto 0}
  .login h1{margin-bottom:6px}
  input{width:100%;padding:11px 12px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--ink);font:inherit;margin-top:10px}
  input:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 20%,transparent)}
  button{margin-top:14px;width:100%;padding:11px;border:none;border-radius:10px;background:var(--accent);color:#fff;font:600 14px system-ui;cursor:pointer}
  button:disabled{opacity:.6;cursor:default}
  .err{color:var(--bad);font-size:13px;margin-top:10px;min-height:16px}
  /* stats */
  .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:18px}
  @media (max-width:680px){.stats{grid-template-columns:repeat(2,1fr)}}
  .stat .n{font-size:26px;font-weight:700;letter-spacing:-.02em}
  .stat .l{color:var(--muted);font-size:12.5px;margin-top:2px}
  /* table */
  .tablewrap{overflow:auto;border:1px solid var(--line);border-radius:var(--radius);background:var(--panel)}
  table{border-collapse:collapse;width:100%;min-width:760px}
  th,td{text-align:left;padding:11px 14px;border-bottom:1px solid var(--line);white-space:nowrap}
  th{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);font-weight:600}
  tr:last-child td{border-bottom:none}
  td.email{white-space:normal;font-weight:600}
  .badge{display:inline-block;padding:2px 9px;border-radius:999px;font-size:12px;font-weight:600}
  .b-active{background:var(--okbg);color:var(--ok)}
  .b-manual{background:var(--warnbg);color:var(--warn)}
  .b-expired{background:var(--badbg);color:var(--bad)}
  .b-cancelled{background:var(--warnbg);color:var(--warn)}
  .topbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;gap:12px}
  .topbar button{width:auto;margin:0;padding:8px 14px;background:transparent;color:var(--accent);border:1px solid var(--line)}
  .muted{color:var(--muted)}
  /* management cards */
  .mgmt{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px}
  @media (max-width:760px){.mgmt{grid-template-columns:1fr}}
  .cardh{margin:0 0 4px;font-size:15px}
  .hint{color:var(--muted);font-size:12.5px;margin:0 0 12px}
  .formrow{display:flex;flex-wrap:wrap;align-items:flex-end;gap:10px;margin-bottom:8px}
  .formrow label{font-size:12px;color:var(--muted);display:flex;flex-direction:column;gap:4px}
  .formrow input{width:100%;margin-top:0;padding:8px 10px}
  .formrow button{width:auto;margin:0;padding:9px 16px}
  .formmsg{font-size:13px;font-weight:600;min-height:16px}
  .formmsg.ok{color:var(--ok)} .formmsg.err{color:var(--bad)}
  .keyout{margin:6px 0;padding:10px 12px;border:1px dashed var(--accent);border-radius:10px;display:flex;align-items:center;justify-content:space-between;gap:10px}
  .keyout code{font-size:15px;font-weight:700;letter-spacing:.04em}
  .keyout button{width:auto;margin:0;padding:6px 12px}
  .keylist{margin-top:8px;max-height:150px;overflow:auto;font-size:12.5px}
  .keylist .krow{display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-bottom:1px solid var(--line)}
  .keylist code{font-weight:600}
  td.act{white-space:nowrap}
  td.act button{width:auto;margin:0 4px 0 0;padding:5px 10px;font-size:12px;background:transparent;color:var(--accent);border:1px solid var(--line)}
  td.act button.danger{color:var(--bad);border-color:var(--bad)}
  td.email{cursor:pointer;color:var(--accent);text-decoration:underline}
  /* modal */
  .overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:flex-start;justify-content:center;padding:40px 16px;overflow:auto;z-index:50}
  .modal{background:var(--panel);border:1px solid var(--line);border-radius:14px;width:100%;max-width:560px;padding:22px}
  .modal h2{margin:0 0 2px;font-size:18px}
  .modal .close{float:right;width:auto;margin:0;padding:4px 10px;background:transparent;color:var(--muted);border:1px solid var(--line)}
  .mini{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:14px 0}
  .mini .b{background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:10px}
  .mini .b .n{font-size:20px;font-weight:800} .mini .b .l{font-size:11px;color:var(--muted)}
  .editrow{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;margin:10px 0}
  .editrow label{font-size:12px;color:var(--muted);display:flex;flex-direction:column;gap:4px}
  .editrow input{margin-top:0;padding:8px 10px}
  .editrow button{width:auto;margin:0;padding:9px 16px}
  .track{max-height:230px;overflow:auto;border:1px solid var(--line);border-radius:10px}
  .track .t{display:flex;justify-content:space-between;padding:7px 12px;border-bottom:1px solid var(--line);font-size:13px}
  .track .t:last-child{border-bottom:none}
  .track .bar{height:7px;background:var(--accent);border-radius:4px;min-width:6px}
</style>
</head>
<body>
<div class="wrap">
  <!-- LOGIN -->
  <div id="login" class="card login">
    <h1>Admin</h1>
    <p class="sub">Engagement Assistant</p>
    <form id="loginForm">
      <input id="pwd" type="password" placeholder="Admin password" autocomplete="current-password" />
      <button id="loginBtn" type="submit">Sign in</button>
      <div id="loginErr" class="err"></div>
    </form>
  </div>

  <!-- DASHBOARD -->
  <div id="dash" hidden>
    <div class="topbar">
      <div>
        <h1>Users &amp; subscriptions</h1>
        <p class="sub" id="asof"></p>
      </div>
      <div>
        <button id="refresh" type="button">Refresh</button>
        <button id="logout" type="button">Log out</button>
      </div>
    </div>
    <div class="stats" id="stats"></div>

    <div class="mgmt">
      <!-- Generate a license key -->
      <div class="card">
        <h3 class="cardh">Generate a license key</h3>
        <p class="hint">Create a key, send it to a UPI/manual buyer. When they paste it in the extension (Settings → Advanced) with their email, it activates for the chosen number of months.</p>
        <div class="formrow">
          <label>Months <input id="keyMonths" type="number" min="1" max="24" value="1" style="width:70px"></label>
          <label style="flex:1">Note (optional) <input id="keyNote" type="text" placeholder="e.g. Ravi — paid via UPI 21 Nov"></label>
          <button id="genKey" type="button">Generate key</button>
        </div>
        <div id="keyOut" class="keyout" hidden></div>
        <div id="keyList" class="keylist"></div>
      </div>

      <!-- Add / renew by email -->
      <div class="card">
        <h3 class="cardh">Add or renew by email</h3>
        <p class="hint">Set a user's access window directly. Start defaults to today, end to one month later.</p>
        <div class="formrow">
          <label style="flex:1">Email <input id="grantEmail" type="email" placeholder="buyer@email.com"></label>
        </div>
        <div class="formrow">
          <label>Start <input id="grantStart" type="date"></label>
          <label>End <input id="grantEnd" type="date"></label>
          <button id="grantBtn" type="button">Save</button>
        </div>
        <div id="grantMsg" class="formmsg"></div>
      </div>
    </div>

    <div class="tablewrap">
      <table>
        <thead><tr>
          <th>Email</th><th>Status</th><th>Start date</th><th>Renews / expires</th>
          <th>Last payment</th><th>Amount</th><th>Comments</th><th>Joined</th><th>Actions</th>
        </tr></thead>
        <tbody id="rows"></tbody>
      </table>
    </div>
  </div>

  <!-- USER DETAIL MODAL -->
  <div id="overlay" class="overlay" hidden>
    <div class="modal">
      <button class="close" id="mClose" type="button">Close ✕</button>
      <h2 id="mEmail">user</h2>
      <p class="sub" id="mStatus"></p>
      <div class="mini">
        <div class="b"><div class="n" id="mPosted">0</div><div class="l">Comments posted</div></div>
        <div class="b"><div class="n" id="mDrafted">0</div><div class="l">Drafts made</div></div>
        <div class="b"><div class="n" id="mJoined">—</div><div class="l">Joined</div></div>
      </div>
      <h3 style="margin:6px 0 2px;font-size:14px">Edit subscription</h3>
      <div class="editrow">
        <label>Start <input id="mStart" type="date"></label>
        <label>End <input id="mEnd" type="date"></label>
        <label>Amount (₹) <input id="mAmount" type="number" min="0" style="width:100px"></label>
        <button id="mSave" type="button">Save</button>
      </div>
      <div id="mMsg" class="formmsg"></div>
      <h3 style="margin:14px 0 6px;font-size:14px">Daily comment tracker</h3>
      <div class="track" id="mTrack"></div>
    </div>
  </div>
</div>

<script>
const $=(id)=>document.getElementById(id);
const KEY='ea_admin_token';
let token=sessionStorage.getItem(KEY);

function fmtDate(s){ if(!s) return '—'; const d=new Date(s); return isNaN(d)?'—':d.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}); }
function fmtMoney(n){ return (n||n===0)?('₹'+Number(n).toLocaleString('en-IN')):'—'; }

function badge(state){
  if(state.manual) return '<span class="badge b-manual">Manual</span>';
  if(state.active){
    return state.status==='cancelled'
      ? '<span class="badge b-cancelled">Cancelling</span>'
      : '<span class="badge b-active">Active</span>';
  }
  return '<span class="badge b-expired">Expired</span>';
}

async function login(e){
  e.preventDefault();
  $('loginBtn').disabled=true; $('loginErr').textContent='';
  try{
    const r=await fetch('/api/admin/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password:$('pwd').value})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(d.error||'Login failed');
    token=d.token; sessionStorage.setItem(KEY,token);
    show();
  }catch(err){ $('loginErr').textContent=err.message; }
  finally{ $('loginBtn').disabled=false; }
}

async function load(){
  const r=await fetch('/api/admin/users',{headers:{authorization:'Bearer '+token}});
  if(r.status===401){ logout(); return; }
  const d=await r.json();
  const s=d.summary||{};
  $('stats').innerHTML=[
    ['Total users', s.totalUsers??0],
    ['Active subscribers', s.activeSubscribers??0],
    ['MRR', fmtMoney(s.mrr)],
    ['Comments posted', s.totalComments??0],
  ].map(([l,n])=>'<div class="card stat"><div class="n">'+n+'</div><div class="l">'+l+'</div></div>').join('');

  $('rows').innerHTML=(d.users||[]).map(u=>{
    const st=u.state||{};
    const em=u.email?escapeHtml(u.email):'';
    const actions = em
      ? '<td class="act"><button data-renew="'+em+'">Renew +1m</button><button class="danger" data-revoke="'+em+'">Revoke</button></td>'
      : '<td class="act muted">—</td>';
    return '<tr>'+
      '<td class="email"'+(em?' data-open="'+em+'"':'')+'>'+(em||'<span class="muted" style="text-decoration:none;cursor:default">no email</span>')+'</td>'+
      '<td>'+badge(st)+'</td>'+
      '<td>'+fmtDate(u.subscription_start)+'</td>'+
      '<td>'+fmtDate(u.current_period_end)+'</td>'+
      '<td>'+fmtDate(u.last_payment_at)+'</td>'+
      '<td>'+fmtMoney(u.amount)+'</td>'+
      '<td>'+(u.posted_count||0)+'</td>'+
      '<td>'+fmtDate(u.created_at)+'</td>'+
      actions+
    '</tr>';
  }).join('') || '<tr><td colspan="9" class="muted" style="padding:22px;text-align:center">No users yet.</td></tr>';

  $('rows').querySelectorAll('[data-renew]').forEach(b=>b.addEventListener('click',()=>userAction('/api/admin/renew',{email:b.dataset.renew,months:1},'Renewed +1 month')));
  $('rows').querySelectorAll('[data-revoke]').forEach(b=>b.addEventListener('click',()=>{ if(confirm('End access for '+b.dataset.revoke+' now?')) userAction('/api/admin/revoke',{email:b.dataset.revoke},'Access ended'); }));
  $('rows').querySelectorAll('[data-open]').forEach(td=>td.addEventListener('click',()=>openUser(td.dataset.open)));

  $('asof').textContent='Updated '+new Date().toLocaleString();
}

async function post(url,body){
  const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},body:JSON.stringify(body)});
  const d=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(d.error||('HTTP '+r.status));
  return d;
}

async function userAction(url,body,okMsg){
  try{ await post(url,body); await load(); await loadKeys(); }
  catch(err){ alert(err.message); }
}

async function genKey(){
  const btn=$('genKey'); btn.disabled=true;
  try{
    const d=await post('/api/admin/keys',{months:parseInt($('keyMonths').value,10)||1, note:$('keyNote').value});
    const out=$('keyOut'); out.hidden=false;
    out.innerHTML='<code id="theKey">'+escapeHtml(d.key)+'</code><button id="copyKey" type="button">Copy</button>';
    $('copyKey').addEventListener('click',()=>{ navigator.clipboard.writeText(d.key).then(()=>{$('copyKey').textContent='Copied';}); });
    $('keyNote').value='';
    await loadKeys();
  }catch(err){ alert(err.message); }
  finally{ btn.disabled=false; }
}

async function loadKeys(){
  try{
    const r=await fetch('/api/admin/keys',{headers:{authorization:'Bearer '+token}});
    if(!r.ok) return;
    const d=await r.json();
    $('keyList').innerHTML=(d.keys||[]).map(k=>{
      const used=k.redeemed_email?('used by '+escapeHtml(k.redeemed_email)):'<span style="color:var(--ok)">unused</span>';
      const note=k.note?(' · '+escapeHtml(k.note)):'';
      return '<div class="krow"><code>'+escapeHtml(k.key)+'</code><span class="muted">'+k.months+'m · '+used+note+'</span></div>';
    }).join('') || '<p class="muted">No keys yet.</p>';
  }catch(e){/*ignore*/}
}

async function grant(){
  $('grantMsg').textContent=''; $('grantMsg').className='formmsg';
  try{
    const d=await post('/api/admin/grant',{email:$('grantEmail').value.trim(),start:$('grantStart').value,end:$('grantEnd').value});
    $('grantMsg').textContent='Saved — active until '+fmtDate(d.subscription.currentPeriodEnd); $('grantMsg').className='formmsg ok';
    $('grantEmail').value='';
    await load();
  }catch(err){ $('grantMsg').textContent=err.message; $('grantMsg').className='formmsg err'; }
}

function iso(d){ return d.toISOString().slice(0,10); }
function setDateDefaults(){
  const today=new Date(); const next=new Date(); next.setMonth(next.getMonth()+1);
  if(!$('grantStart').value) $('grantStart').value=iso(today);
  if(!$('grantEnd').value) $('grantEnd').value=iso(next);
}

let currentEmail=null;
async function openUser(email){
  currentEmail=email;
  try{
    const r=await fetch('/api/admin/user?email='+encodeURIComponent(email),{headers:{authorization:'Bearer '+token}});
    const d=await r.json();
    if(!r.ok) throw new Error(d.error||'Failed');
    $('mEmail').textContent=email;
    const st=d.subscription||{};
    $('mStatus').innerHTML=badge(st)+' '+(st.currentPeriodEnd?('· until '+fmtDate(st.currentPeriodEnd)):'');
    $('mPosted').textContent=d.totalPosted||0;
    $('mDrafted').textContent=d.drafted||0;
    $('mJoined').textContent=fmtDate(d.user.created_at);
    $('mStart').value=d.user.subscription_start?d.user.subscription_start.slice(0,10):'';
    $('mEnd').value=d.user.current_period_end?d.user.current_period_end.slice(0,10):'';
    $('mAmount').value=(d.user.amount!=null)?d.user.amount:'';
    $('mMsg').textContent=''; $('mMsg').className='formmsg';
    const max=Math.max(1,...(d.daily||[]).map(x=>x.count));
    $('mTrack').innerHTML=(d.daily||[]).map(x=>
      '<div class="t"><span>'+fmtDate(x.day)+'</span>'+
      '<span style="display:flex;align-items:center;gap:8px"><span class="bar" style="width:'+Math.round(90*x.count/max)+'px"></span><b>'+x.count+'</b></span></div>'
    ).join('') || '<div class="t muted">No comments yet.</div>';
    $('overlay').hidden=false;
  }catch(err){ alert(err.message); }
}
async function saveDetail(){
  try{
    const d=await post('/api/admin/grant',{email:currentEmail,start:$('mStart').value,end:$('mEnd').value,amount:$('mAmount').value});
    $('mMsg').textContent='Saved — active until '+fmtDate(d.subscription.currentPeriodEnd); $('mMsg').className='formmsg ok';
    await load();
  }catch(err){ $('mMsg').textContent=err.message; $('mMsg').className='formmsg err'; }
}
function closeModal(){ $('overlay').hidden=true; currentEmail=null; }

function escapeHtml(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}

function show(){ $('login').hidden=true; $('dash').hidden=false; setDateDefaults(); load(); loadKeys(); }
function logout(){ token=null; sessionStorage.removeItem(KEY); $('dash').hidden=true; $('login').hidden=false; }

$('loginForm').addEventListener('submit',login);
$('refresh').addEventListener('click',()=>{load();loadKeys();});
$('logout').addEventListener('click',logout);
$('genKey').addEventListener('click',genKey);
$('grantBtn').addEventListener('click',grant);
$('mSave').addEventListener('click',saveDetail);
$('mClose').addEventListener('click',closeModal);
$('overlay').addEventListener('click',(e)=>{ if(e.target===$('overlay')) closeModal(); });
if(token) show();
</script>
</body>
</html>`;
}
