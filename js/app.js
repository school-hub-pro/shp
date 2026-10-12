<script>
/* ============================================================
   School Hub Pro - student client, v3.1
   ============================================================ */

document.addEventListener('DOMContentLoaded', function() {
  const alertOverlay = document.getElementById('alert-overlay');
  const alertMessage = document.getElementById('alert-message');
  const alertCloseBtn = document.getElementById('alert-close-btn');
  const alertCancelBtn = document.getElementById('alert-cancel-btn');
  const alertInput = document.getElementById('alert-input');
  if (!alertOverlay || !alertMessage || !alertCloseBtn) { console.error("Custom alert HTML missing"); return; }

  let resolveConfirm = null;
  let resolvePrompt = null;

  function closeOverlay() {
    alertOverlay.classList.add('hidden');
    alertInput.style.display = 'none';
    alertInput.value = '';
    alertCancelBtn.style.display = 'none';
    alertCloseBtn.textContent = 'OK';
  }
  function showAlert(message) {
    resolveConfirm = null; resolvePrompt = null;
    alertMessage.textContent = message;
    alertInput.style.display = 'none';
    alertCancelBtn.style.display = 'none';
    alertCloseBtn.textContent = 'OK';
    alertOverlay.classList.remove('hidden');
    alertCloseBtn.focus();
  }
  window.shpConfirm = function(message) {
    return new Promise(resolve => {
      resolveConfirm = resolve; resolvePrompt = null;
      alertMessage.textContent = message;
      alertInput.style.display = 'none';
      alertCancelBtn.style.display = 'inline-block';
      alertCloseBtn.textContent = 'OK';
      alertOverlay.classList.remove('hidden');
      alertCloseBtn.focus();
    });
  };
  window.shpPrompt = function(message, defaultValue) {
    return new Promise(resolve => {
      resolvePrompt = resolve; resolveConfirm = null;
      alertMessage.textContent = message;
      alertInput.value = defaultValue == null ? '' : String(defaultValue);
      alertInput.style.display = 'block';
      alertCancelBtn.style.display = 'inline-block';
      alertCloseBtn.textContent = 'OK';
      alertOverlay.classList.remove('hidden');
      setTimeout(() => { alertInput.focus(); alertInput.select(); }, 50);
    });
  };
  alertCloseBtn.addEventListener('click', () => {
    if (resolveConfirm) { const r = resolveConfirm; resolveConfirm = null; closeOverlay(); r(true); return; }
    if (resolvePrompt) { const r = resolvePrompt; const v = alertInput.value; resolvePrompt = null; closeOverlay(); r(v); return; }
    closeOverlay();
  });
  alertCancelBtn.addEventListener('click', () => {
    if (resolveConfirm) { const r = resolveConfirm; resolveConfirm = null; closeOverlay(); r(false); return; }
    if (resolvePrompt) { const r = resolvePrompt; resolvePrompt = null; closeOverlay(); r(null); return; }
    closeOverlay();
  });
  alertOverlay.addEventListener('click', e => {
    if (e.target !== alertOverlay) return;
    if (resolveConfirm) { const r = resolveConfirm; resolveConfirm = null; closeOverlay(); r(false); return; }
    if (resolvePrompt) { const r = resolvePrompt; resolvePrompt = null; closeOverlay(); r(null); return; }
    closeOverlay();
  });
  document.addEventListener('keydown', e => {
    if (alertOverlay.classList.contains('hidden')) return;
    if (e.key === 'Escape') {
      if (resolveConfirm) { const r = resolveConfirm; resolveConfirm = null; closeOverlay(); r(false); return; }
      if (resolvePrompt) { const r = resolvePrompt; resolvePrompt = null; closeOverlay(); r(null); return; }
      closeOverlay();
    }
    if (e.key === 'Enter' && resolvePrompt && document.activeElement === alertInput) {
      const r = resolvePrompt; const v = alertInput.value; resolvePrompt = null; closeOverlay(); r(v);
    }
  });

  window.alert = showAlert;
  window.confirm = function(msg) { shpConfirm(msg); return false; };
  window.prompt = function(msg, def) { shpPrompt(msg, def); return null; };
});

function toast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) { window.alert(message); return; }
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  const icon = document.createElement('span');
  icon.className = 'toast-icon';
  icon.textContent = icons[type] || '';
  const msg = document.createElement('span');
  msg.className = 'toast-msg';
  msg.textContent = String(message == null ? '' : message);
  el.appendChild(icon);
  el.appendChild(msg);
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 300);
  }, duration);
}

/* ============================================================
   THEME
   ============================================================ */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('shp_theme', theme);
}
function toggleTheme() {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  toast('Theme: ' + next, 'info', 1500);
}
function initTheme() {
  const saved = localStorage.getItem('shp_theme');
  if (saved === 'dark' || saved === 'light') { applyTheme(saved); return; }
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(prefersDark ? 'dark' : 'light');
}

/* ============================================================
   STATE
   ============================================================ */
let state = {
  name: '', email: '', grades: {}, structure: {}, exam: 'WA1',
  authMode: 'SIGNIN', pdfId: '',
  focusMinutesToday: 0, focusMinutesWeek: 0, focusStreak: 0, focusHistory: []
};
let sessionToken = '';
let tempMigrationUsername = "";
let tempMigrationToken = "";
let resetEmailMemory = "";
let friends = [];
let pendingIncoming = [];
let pendingOutgoing = [];

/* ============================================================
   ONLOAD
   ============================================================ */
window.onload = () => {
  initTheme();
  const superOld = localStorage.getItem('shp_user_email_v4');
  if (superOld) localStorage.removeItem('shp_user_email_v4');

  const savedAuth = JSON.parse(localStorage.getItem('shp_auth_v5') || "null");
  if (savedAuth && savedAuth.email && savedAuth.name) {
    document.getElementById('auth-saved').style.display = 'block';
    document.getElementById('auth-view-signin').style.display = 'none';
    document.getElementById('saved-greeting').innerText = 'WELCOME BACK, ' + savedAuth.name.toUpperCase();
    document.getElementById('login-id').value = savedAuth.email;
  }

  const updateOffline = () => document.body.classList.toggle('offline', !navigator.onLine);
  window.addEventListener('online', () => { updateOffline(); toast('Back online', 'success', 1500); });
  window.addEventListener('offline', () => { updateOffline(); toast('You are offline', 'warning', 3000); });
  updateOffline();

  document.addEventListener('keydown', e => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if (!document.body.getAttribute('data-logged-in')) return;
    if (e.key === '/') {
      e.preventDefault();
      const s = document.getElementById('dl-search-input');
      if (s) { show('calendar'); setTimeout(() => s.focus(), 100); }
    }
    const navMap = { '1':'home', '2':'focus', '3':'tt', '4':'calendar', '5':'grades', '6':'settings', '7':'bugs' };
    if (navMap[e.key]) show(navMap[e.key]);
  });

  const passInp = document.getElementById('set-pass-input');
  const strengthEl = document.getElementById('pw-strength');
  if (passInp && strengthEl) {
    passInp.addEventListener('input', () => {
      const s = pwStrength(passInp.value);
      strengthEl.className = 'pw-strength ' + (s.cls || '');
      strengthEl.textContent = s.label;
    });
  }
};

function pwStrength(p) {
  if (!p) return { label: '', cls: '' };
  let score = 0;
  if (p.length >= 8) score++;
  if (p.length >= 12) score++;
  if (/[A-Z]/.test(p)) score++;
  if (/[0-9]/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  if (score <= 1) return { label: 'Weak', cls: 'weak' };
  if (score === 2) return { label: 'Fair', cls: 'fair' };
  if (score === 3) return { label: 'Good', cls: 'good' };
  return { label: 'Strong', cls: 'strong' };
}

/* ============================================================
   AUTH
   ============================================================ */
function showAuthView(view) {
  document.getElementById('err').innerText = '';
  document.getElementById('auth-view-signin').style.display = view === 'signin' ? 'block' : 'none';
  document.getElementById('auth-view-forgot').style.display = view === 'forgot' ? 'block' : 'none';
  document.getElementById('auth-view-reset').style.display = view === 'reset' ? 'block' : 'none';
  document.getElementById('auth-view-link-email').style.display = view === 'link-email' ? 'block' : 'none';
  document.getElementById('auth-saved').style.display = 'none';
}
function switchTab(mode) {
  state.authMode = mode;
  document.getElementById('tab-signin').classList.toggle('active', mode === 'SIGNIN');
  document.getElementById('tab-signup').classList.toggle('active', mode === 'SIGNUP');
  document.getElementById('auth-submit-btn').innerText = mode === 'SIGNIN' ? 'Sign In' : 'Create Account';
  const nameSignup = document.getElementById('name-signup');
  const loginInput = document.getElementById('login-id');
  if (mode === 'SIGNUP') {
    nameSignup.style.display = 'block'; nameSignup.required = true;
    loginInput.placeholder = "Email Address"; loginInput.disabled = false; loginInput.style.opacity = '1';
  } else {
    nameSignup.style.display = 'none'; nameSignup.required = false;
    loginInput.placeholder = "Email or Username";
    const savedAuth = JSON.parse(localStorage.getItem('shp_auth_v5') || "null");
    if (savedAuth && savedAuth.email && loginInput.value === savedAuth.email) {
      loginInput.disabled = true; loginInput.style.opacity = '0.5';
    }
  }
  document.getElementById('forgot-pass-wrap').style.display = mode === 'SIGNIN' ? 'block' : 'none';
  document.getElementById('err').innerText = '';
}
function resumeSession() {
  showAuthView('signin'); switchTab('SIGNIN');
  const loginInput = document.getElementById('login-id');
  loginInput.disabled = true; loginInput.style.opacity = '0.5';
  document.getElementById('pass').focus();
}
function clearSaved() {
  localStorage.removeItem('shp_auth_v5');
  const loginInput = document.getElementById('login-id');
  loginInput.value = ''; loginInput.disabled = false; loginInput.style.opacity = '1';
  document.getElementById('pass').value = '';
  showAuthView('signin'); switchTab('SIGNIN');
}
function login() {
  const e = document.getElementById('login-id').value.trim();
  const p = document.getElementById('pass').value.trim();
  const n = document.getElementById('name-signup').value.trim();
  document.getElementById('portal').style.display = 'flex';
  document.getElementById('err').innerText = '';
  google.script.run.withSuccessHandler(res => {
    if (!res.success) {
      document.getElementById('portal').style.display = 'none';
      document.getElementById('err').innerText = res.msg;
      if (res.autoLocked) { window.alert('Account Temporarily Locked\n\n' + res.msg); document.getElementById('pass').value = ''; return; }
      if (res.suspended) { window.alert('Account Suspended\n\n' + res.msg); document.getElementById('pass').value = ''; return; }
      return;
    }
    if (res.needsEmail) {
      document.getElementById('portal').style.display = 'none';
      tempMigrationUsername = res.name;
      tempMigrationToken = res.migrationToken || '';
      showAuthView('link-email');
      return;
    }
    localStorage.setItem('shp_auth_v5', JSON.stringify({ email: res.email, name: res.name }));
    sessionToken = res.token;
    state.email = res.email; state.name = res.name;
    load();
  }).authUser(e, p, state.authMode, n, e);
}
function submitLinkEmail() {
  const newEmail = document.getElementById('email-link-input').value.trim();
  const errEl = document.getElementById('link-err');
  document.getElementById('portal').style.display = 'flex';
  errEl.innerText = '';
  google.script.run.withSuccessHandler(res => {
    if (res.success) {
      localStorage.setItem('shp_auth_v5', JSON.stringify({ email: res.email, name: res.name }));
      sessionToken = res.token; state.email = res.email; state.name = res.name;
      load();
    } else {
      document.getElementById('portal').style.display = 'none';
      errEl.innerText = res.msg;
    }
  }).attachEmailAndMigrate(tempMigrationUsername, newEmail, tempMigrationToken);
}
function requestOTP() {
  const email = document.getElementById('email-forgot').value.trim();
  resetEmailMemory = email;
  const errEl = document.getElementById('err');
  const btn = document.getElementById('btn-request-otp');
  errEl.style.color = 'var(--sub)'; errEl.innerText = 'Sending OTP...'; btn.disabled = true;
  google.script.run.withSuccessHandler(res => {
    btn.disabled = false;
    if (res.success) { errEl.innerText = ''; showAuthView('reset'); document.getElementById('otp-input').focus(); }
    else { errEl.style.color = '#f43f5e'; errEl.innerText = res.msg; }
  }).requestOTP(email);
}
function submitNewPassword() {
  const otp = document.getElementById('otp-input').value.trim();
  const newPass = document.getElementById('new-pass-input').value.trim();
  const errEl = document.getElementById('err');
  const btn = document.getElementById('btn-reset-pass');
  errEl.style.color = 'var(--sub)'; errEl.innerText = 'Verifying OTP and resetting...'; btn.disabled = true;
  google.script.run.withSuccessHandler(res => {
    btn.disabled = false;
    if (res.success) {
      errEl.style.color = 'var(--primary)'; errEl.innerText = res.msg;
      setTimeout(() => {
        document.getElementById('login-id').value = resetEmailMemory;
        document.getElementById('pass').value = '';
        document.getElementById('otp-input').value = '';
        document.getElementById('new-pass-input').value = '';
        showAuthView('signin'); switchTab('SIGNIN');
        document.getElementById('pass').focus();
      }, 2000);
    } else { errEl.style.color = '#f43f5e'; errEl.innerText = res.msg; }
  }).resetPasswordWithOTP(resetEmailMemory, otp, newPass);
}
async function logout() {
  const yes = await shpConfirm('Log out of User: ' + state.name + '?');
  if (!yes) return;
  if (focusInterval) resetTimer();
  const focusGuard = document.getElementById('focus-guard-overlay');
  if (focusGuard) focusGuard.style.display = 'none';

  const tokenForLogout = sessionToken;
  const emailForLogout = state.email;
  if (tokenForLogout && emailForLogout && window.google && google.script) {
    try { google.script.run.withFailureHandler(() => {}).logLogout(emailForLogout, tokenForLogout); } catch (e) {}
  }

  document.body.removeAttribute('data-logged-in');
  document.body.removeAttribute('data-view');
  const savedAuth = JSON.parse(localStorage.getItem('shp_auth_v5') || "null");
  if (savedAuth && savedAuth.email) {
    document.getElementById('auth-saved').style.display = 'block';
    document.getElementById('auth-view-signin').style.display = 'none';
    document.getElementById('auth-view-forgot').style.display = 'none';
    document.getElementById('auth-view-reset').style.display = 'none';
    document.getElementById('auth-view-link-email').style.display = 'none';
    document.getElementById('saved-greeting').innerText = 'WELCOME BACK, ' + savedAuth.name.toUpperCase();
    document.getElementById('login-id').value = savedAuth.email;
    document.getElementById('pass').value = '';
  } else showAuthView('signin');
  document.getElementById('err').innerText = '';
  state = { name:'', email:'', grades:{}, structure:{}, exam:'WA1', authMode:'SIGNIN', pdfId:'', focusMinutesToday:0, focusMinutesWeek:0, focusStreak:0, focusHistory:[] };
  sessionToken = ''; tempMigrationToken = ''; tempMigrationUsername = '';
  dlItems = []; calAllEvents = []; pdfDoc = null;
  friends = []; pendingIncoming = []; pendingOutgoing = [];
}

/* ============================================================
   SIGN OUT OTHER DEVICES
   ============================================================ */
async function signOutOtherDevices() {
  const yes = await shpConfirm('Sign out of all other devices?\n\nYour current session stays active.');
  if (!yes) return;
  google.script.run.withSuccessHandler(res => {
    if (res && res.success) {
      if (res.token) sessionToken = res.token;
      toast(res.msg || 'Signed out of other devices', 'success');
    } else {
      toast((res && res.msg) || 'Failed', 'error');
    }
  }).withFailureHandler(() => toast('Network error', 'error')).logLogoutOtherDevices(state.email, sessionToken);
}

/* ============================================================
   PROFILE / DELETE
   ============================================================ */
function saveProfile() {
  const newName = document.getElementById('set-name-disp').value.trim();
  const newPass = document.getElementById('set-pass-input').value;
  const currentPass = document.getElementById('set-current-pass-input') ? document.getElementById('set-current-pass-input').value : '';
  if (newPass && !currentPass) { toast('Enter your current password to change it.', 'warning'); return; }
  const btn = document.getElementById('save-profile-btn');
  btn.innerText = "Saving...";
  google.script.run.withSuccessHandler(res => {
    btn.innerText = "Save Profile Changes";
    if (res.success) {
      if (res.token) sessionToken = res.token;
      toast("Profile updated successfully!", "success");
      document.getElementById('set-pass-input').value = '';
      const cp = document.getElementById('set-current-pass-input');
      if (cp) cp.value = '';
      const strengthEl = document.getElementById('pw-strength');
      if (strengthEl) { strengthEl.textContent = ''; strengthEl.className = 'pw-strength'; }
      state.name = res.name;
      document.getElementById('welcome').innerText = 'Good Day, ' + state.name;
      const savedAuth = JSON.parse(localStorage.getItem('shp_auth_v5') || "{}");
      savedAuth.name = res.name;
      localStorage.setItem('shp_auth_v5', JSON.stringify(savedAuth));
      document.getElementById('saved-greeting').innerText = 'WELCOME BACK, ' + state.name.toUpperCase();
    } else { toast("Error: " + res.msg, "error"); }
  }).updateProfile(state.email, newName, newPass, currentPass, sessionToken);
}
async function confirmDeleteAccount() {
  const pass = document.getElementById('delete-pass-input').value.trim();
  if (!pass) return;
  const yes = await shpConfirm('This will PERMANENTLY delete your account and all data. This cannot be undone. Continue?');
  if (!yes) return;
  const btn = document.getElementById('delete-account-btn');
  btn.disabled = true; btn.innerText = 'Deleting...';
  google.script.run.withSuccessHandler(res => {
    btn.disabled = false; btn.innerText = 'Delete My Account';
    if (res.success) {
      alert(res.msg);
      localStorage.removeItem('shp_auth_v5');
      window.location.reload();
    } else { toast('Error: ' + res.msg, 'error'); document.getElementById('delete-pass-input').value = ''; }
  }).deleteUser(state.email, pass, sessionToken);
}

/* ============================================================
   FRIENDS
   ============================================================ */
function loadFriendsList() {
  google.script.run.withSuccessHandler(res => {
    friends = res.friends || [];
    pendingIncoming = res.pendingIncoming || [];
    pendingOutgoing = res.pendingOutgoing || [];
    renderFriendsList();
  }).loadFriends(state.email, sessionToken);
}
function renderFriendsList() {
  const listEl = document.getElementById('friends-list');
  listEl.textContent = '';
  if (friends.length === 0 && pendingIncoming.length === 0 && pendingOutgoing.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'dl-empty';
    const icon = document.createElement('span');
    icon.className = 'dl-empty-icon'; icon.textContent = '👥';
    empty.appendChild(icon);
    empty.appendChild(document.createTextNode('Add friends by their email.'));
    listEl.appendChild(empty);
    return;
  }
  function makeRow(opts) {
    const el = document.createElement('div');
    el.className = 'friend-item';
    const av = document.createElement('div');
    av.className = 'friend-avatar';
    if (opts.avatarBg) av.style.background = opts.avatarBg;
    if (opts.avatarOpacity != null) av.style.opacity = String(opts.avatarOpacity);
    av.textContent = (opts.name || '?').charAt(0).toUpperCase();
    el.appendChild(av);
    const body = document.createElement('div');
    body.style.flex = '1';
    if (opts.dim) body.style.opacity = '0.7';
    const nameP = document.createElement('p');
    nameP.style.cssText = 'margin:0;font-size:13px;font-weight:700;';
    nameP.textContent = opts.name || '(no name)';
    const subP = document.createElement('p');
    subP.style.cssText = 'margin:0;font-size:10px;color:' + (opts.subColor || 'var(--sub)') + ';';
    subP.textContent = opts.sub || '';
    body.appendChild(nameP); body.appendChild(subP); el.appendChild(body);
    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:5px;';
    (opts.buttons || []).forEach(b => {
      const btn = document.createElement('button');
      btn.type = 'button';
      if (b.primary) { btn.className = 'btn'; btn.style.cssText = 'padding:6px 10px;font-size:10px;width:auto;'; }
      else btn.className = 'dl-del';
      btn.textContent = b.label;
      if (b.title) btn.title = b.title;
      btn.dataset.friendAction = b.action;
      if (b.email) btn.dataset.friendEmail = b.email;
      actions.appendChild(btn);
    });
    el.appendChild(actions); listEl.appendChild(el);
  }
  pendingIncoming.forEach(req => makeRow({
    name: req.name, avatarBg: 'var(--deadline)', sub: 'Wants to be friends', subColor: 'var(--deadline)',
    buttons: [
      { label: 'Accept', action: 'accept', email: req.email, primary: true },
      { label: '❌', action: 'reject', email: req.email, title: 'Reject' }
    ]
  }));
  pendingOutgoing.forEach(req => makeRow({
    name: req.name, avatarBg: 'var(--sub)', avatarOpacity: 0.7, dim: true, sub: 'Request Pending...',
    buttons: [{ label: '❌', action: 'cancel', email: req.email, title: 'Cancel request' }]
  }));
  friends.forEach(friend => makeRow({
    name: friend.name, sub: 'Status: Idle',
    buttons: [{ label: '❌', action: 'remove', email: friend.email, title: 'Remove friend' }]
  }));
}
(function wireFriendsListDelegate() {
  document.addEventListener('click', e => {
    const btn = e.target.closest('#friends-list [data-friend-action]');
    if (!btn) return;
    e.preventDefault();
    const action = btn.dataset.friendAction;
    const email = btn.dataset.friendEmail || '';
    if (!action || !email) return;
    if (action === 'accept') return acceptFriend(email);
    if (action === 'reject') return removeFriend(email, true);
    if (action === 'cancel') return removeFriend(email, false);
    if (action === 'remove') return removeFriend(email, false);
  });
})();
function addFriend() {
  const input = document.getElementById('friend-email-input');
  const btn = document.getElementById('btn-add-friend');
  const friendEmail = input.value.trim();
  if (!friendEmail) return;
  input.disabled = true; btn.disabled = true;
  google.script.run.withSuccessHandler(res => {
    input.disabled = false; btn.disabled = false;
    input.value = '';
    toast(res.msg, res.success ? 'success' : 'error');
    if (res.success) loadFriendsList();
  }).addFriend(state.email, friendEmail, sessionToken);
}
function acceptFriend(friendEmail) {
  google.script.run.withSuccessHandler(res => {
    if (res.success) loadFriendsList();
    else toast("Error: " + res.msg, "error");
  }).acceptFriendRequest(state.email, friendEmail, sessionToken);
}
async function removeFriend(friendEmail, isReject = false) {
  const msg = isReject ? 'Reject this friend request?' : 'Are you sure you want to remove this friend or cancel the request?';
  const yes = await shpConfirm(msg);
  if (!yes) return;
  google.script.run.withSuccessHandler(res => {
    if (res.success) loadFriendsList();
    else toast("Error: " + res.msg, "error");
  }).removeFriend(state.email, friendEmail, sessionToken);
}

/* ============================================================
   APP LOAD
   ============================================================ */
setInterval(() => {
  const c = document.getElementById('clock');
  if (c) c.innerText = new Date().toLocaleTimeString('en-SG', { hour:'2-digit', minute:'2-digit', hour12:true });
}, 1000);

function load() {
  google.script.run.withSuccessHandler(data => {
    state.grades = data.grades;
    state.structure = data.structure;
    state.pdfId = data.pdfId;
    state.name = data.name;
    state.focusMinutesToday = (data.focus && data.focus.todayMinutes) || 0;
    state.focusMinutesWeek = (data.focus && data.focus.weekMinutes) || 0;
    state.focusStreak = (data.focus && data.focus.streak) || 0;
    state.focusHistory = (data.focus && data.focus.history) || [];

    document.getElementById('portal').style.display = 'none';
    document.body.setAttribute('data-logged-in', 'true');
    show('home');

    document.getElementById('welcome').innerText = 'Good Day, ' + state.name;
    document.getElementById('term-value').innerText = data.school.term;
    document.getElementById('week-label').innerText = data.school.week;
    document.getElementById('current-date').innerText = data.school.date;
    document.getElementById('pdf-open').href = data.fullUrl;
    document.getElementById('set-name-disp').value = state.name;
    document.getElementById('set-email-input').value = state.email;
    const cp = document.getElementById('set-current-pass-input');
    if (cp) cp.value = '';

    initPdfViewer(data.pdfId);
    render();
    populateSubjects();
    calInit();
    loadFriendsList();
    renderFocusStats();
    loadFocusExtended();

    google.script.run
      .withSuccessHandler(w => {
        if (!w) return;
        const t = document.getElementById('w-temp');
        const c = document.getElementById('w-cond');
        if (t && w.temp) t.innerText = w.temp;
        if (c && w.cond) c.innerText = w.cond;
      })
      .withFailureHandler(err => console.error('weather call failed:', err))
      .getQuickWeather();
  }).withFailureHandler(err => {
    console.error('loadAppData failed:', err);
    document.getElementById('portal').style.display = 'none';
    document.body.removeAttribute('data-logged-in');
    document.getElementById('err').innerText = 'Failed to load data. Try again.';
  }).loadAppData(state.email, sessionToken);
}

function show(v) {
  document.querySelectorAll('.view, .nav-item, .mob-nav-item').forEach(x => x.classList.remove('active'));
  const viewEl = document.getElementById('view-' + v);
  if (viewEl) viewEl.classList.add('active');
  document.body.setAttribute('data-view', v);
  document.querySelectorAll('[onclick*="show(\'' + v + '\')"]').forEach(btn => btn.classList.add('active'));
  if (v === 'tt' && pdfDoc) setTimeout(pdfFitWidth, 50);
  if (v === 'focus') loadFocusExtended();
  if (v !== 'bugs' && BUG_PAGE_BY_VIEW[v]) lastAppView = v;
  if (v === 'bugs') openBugView();
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('collapsed'); }

function populateSubjects() {
  const focusSel = document.getElementById('focus-subj-input');
  const dlSel = document.getElementById('dl-subj-input');
  const seen = new Set();
  const opts = [];
  Object.values(state.structure).forEach(arr => arr.forEach(s => {
    if (!seen.has(s)) { seen.add(s); opts.push(s); }
  }));
  function fillSelect(sel, firstLabel) {
    if (!sel) return;
    sel.textContent = '';
    const first = document.createElement('option');
    first.value = ''; first.textContent = firstLabel;
    sel.appendChild(first);
    opts.forEach(s => {
      const o = document.createElement('option');
      o.value = s; o.textContent = s;
      sel.appendChild(o);
    });
  }
  fillSelect(focusSel, 'General Focus');
  fillSelect(dlSel, 'No subject');
  document.getElementById('dl-date-input').value = todayStr();
}

/* ============================================================
   FOCUS STATS RENDERING
   ============================================================ */
function renderFocusStats() {
  document.getElementById('dash-focus-total').innerText = state.focusMinutesToday;
  const wk = document.getElementById('dash-focus-week'); if (wk) wk.innerText = state.focusMinutesWeek + 'm';
  const st = document.getElementById('dash-focus-streak'); if (st) st.innerText = state.focusStreak + (state.focusStreak === 1 ? ' day' : ' days');
  const chart = document.getElementById('dash-focus-chart');
  if (!chart) return;
  chart.textContent = '';
  if (state.focusHistory && state.focusHistory.length) {
    const max = Math.max(1, ...state.focusHistory.map(h => h.minutes));
    const days = ['S','M','T','W','T','F','S'];
    state.focusHistory.forEach(h => {
      const d = new Date(h.date + 'T00:00:00');
      const lbl = days[d.getDay()];
      const pct = h.minutes ? Math.max(6, (h.minutes / max) * 100) : 3;
      const col = document.createElement('div');
      col.className = 'focus-bar-col';
      col.title = h.date + ': ' + h.minutes + 'm';
      const bar = document.createElement('div');
      bar.className = 'focus-bar';
      bar.style.height = pct + '%';
      const lblEl = document.createElement('div');
      lblEl.className = 'focus-bar-lbl';
      lblEl.textContent = lbl;
      col.appendChild(bar); col.appendChild(lblEl);
      chart.appendChild(col);
    });
  }
}
function loadFocusExtended() {
  const wrap = document.getElementById('focus-extended');
  if (!wrap) return;
  google.script.run.withSuccessHandler(res => {
    wrap.textContent = '';
    if (!res || !res.success || (!res.bySubject.length && !res.byMonth.length)) {
      wrap.innerHTML = '<div class="dl-empty" style="padding:24px 0;">No focus sessions recorded yet.</div>';
      return;
    }
    const grid = document.createElement('div');
    grid.className = 'focus-history-grid';
    const subCol = document.createElement('div');
    subCol.innerHTML = '<h4>By subject</h4>';
    res.bySubject.forEach(row => {
      const r = document.createElement('div'); r.className = 'fh-row';
      r.innerHTML = '<span class="k">' + escHtml(row.subject) + '</span><span class="v">' + row.minutes + 'm</span>';
      subCol.appendChild(r);
    });
    const monCol = document.createElement('div');
    monCol.innerHTML = '<h4>By month (last 12)</h4>';
    res.byMonth.forEach(row => {
      const r = document.createElement('div'); r.className = 'fh-row';
      r.innerHTML = '<span class="k">' + escHtml(row.month) + '</span><span class="v">' + row.minutes + 'm</span>';
      monCol.appendChild(r);
    });
    grid.appendChild(subCol); grid.appendChild(monCol);
    wrap.appendChild(grid);
  }).withFailureHandler(() => {
    wrap.innerHTML = '<div class="dl-empty" style="padding:24px 0;">Failed to load focus history.</div>';
  }).getFocusHistoryExtended(state.email, sessionToken);
}

/* ============================================================
   FOCUS TIMER + STRICT MODE
   ============================================================ */
let focusTimeLeft = 1500, focusInterval = null, isFocusing = false, focusInitialMins = 25;
let focusGuardTimer = null;
let focusSubjectForSession = '';
let strictListenersAttached = false;
const RING_CIRCUMFERENCE = 276.46;

function updateTimerDisplay() {
  const m = Math.floor(focusTimeLeft / 60).toString().padStart(2, '0');
  const s = (focusTimeLeft % 60).toString().padStart(2, '0');
  document.getElementById('timer-display').innerText = `${m}:${s}`;
  const fill = document.getElementById('ring-fill');
  if (fill && focusInitialMins > 0) {
    const progress = 1 - (focusTimeLeft / (focusInitialMins * 60));
    fill.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - progress));
  }
}
function getTotalMins() {
  let hrs = Math.floor(Number(document.getElementById('focus-hours-input').value));
  let mins = Math.floor(Number(document.getElementById('focus-mins-input').value));
  if (!isFinite(hrs) || isNaN(hrs) || hrs < 0) hrs = 0;
  if (!isFinite(mins) || isNaN(mins) || mins < 0) mins = 0;
  if (hrs > 8) { hrs = 8; document.getElementById('focus-hours-input').value = 8; }
  if (mins > 59) { mins = 59; document.getElementById('focus-mins-input').value = 59; }
  let total = hrs * 60 + mins;
  if (total > 480) { total = 480; document.getElementById('focus-hours-input').value = 8; document.getElementById('focus-mins-input').value = 0; }
  if (total < 1) { total = 1; document.getElementById('focus-mins-input').value = 1; }
  return total;
}
document.getElementById('focus-hours-input').addEventListener('input', function() {
  if (!isFocusing) { let val = Math.floor(Number(this.value)); if (!isFinite(val) || isNaN(val) || val < 0) val = 0; if (val > 8) val = 8; this.value = val; focusInitialMins = getTotalMins(); focusTimeLeft = focusInitialMins * 60; updateTimerDisplay(); }
});
document.getElementById('focus-mins-input').addEventListener('input', function() {
  if (!isFocusing) { let val = Math.floor(Number(this.value)); if (!isFinite(val) || isNaN(val) || val < 0) val = 0; if (val > 59) val = 59; this.value = val; focusInitialMins = getTotalMins(); focusTimeLeft = focusInitialMins * 60; updateTimerDisplay(); }
});
function toggleTimer() {
  const btn = document.getElementById('timer-start-btn');
  const ring = document.getElementById('timer-ring');
  const strict = document.getElementById('strict-mode-cb').checked;
  if (isFocusing) {
    clearInterval(focusInterval); focusInterval = null;
    btn.innerText = "Resume Focus"; btn.style.background = "var(--primary)";
    ring.classList.remove('active'); isFocusing = false;
    detachStrictListeners();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  } else {
    focusInitialMins = getTotalMins();
    focusTimeLeft = focusInitialMins * 60;
    focusSubjectForSession = document.getElementById('focus-subj-input').value || 'General Focus';
    updateTimerDisplay();
    btn.innerText = "Pause"; btn.style.background = "var(--deadline)";
    ring.classList.add('active'); isFocusing = true;
    document.getElementById('focus-hours-input').disabled = true;
    document.getElementById('focus-mins-input').disabled = true;
    document.getElementById('focus-subj-input').disabled = true;
    focusInterval = setInterval(() => {
      focusTimeLeft--;
      updateTimerDisplay();
      if (focusTimeLeft <= 0) {
        clearInterval(focusInterval); focusInterval = null;
        toast("Focus session complete!", "success", 4000);
        persistFocusSession(focusSubjectForSession, focusInitialMins);
        resetTimer();
      }
    }, 1000);
    if (strict) attachStrictListeners();
  }
}
function attachStrictListeners() {
  if (strictListenersAttached) return;
  strictListenersAttached = true;
  if (document.fullscreenEnabled) {
    const el = document.documentElement;
    const req = el.requestFullscreen && el.requestFullscreen({ navigationUI: 'hide' });
    if (req && req.catch) req.catch(() => {});
  }
  document.addEventListener('fullscreenchange', onFullscreenChange, true);
  document.addEventListener('visibilitychange', onStrictVisibilityChange);
  window.addEventListener('beforeunload', onStrictBeforeUnload);
}
function detachStrictListeners() {
  if (!strictListenersAttached) return;
  strictListenersAttached = false;
  document.removeEventListener('fullscreenchange', onFullscreenChange, true);
  document.removeEventListener('visibilitychange', onStrictVisibilityChange);
  window.removeEventListener('beforeunload', onStrictBeforeUnload);
  if (focusGuardTimer) { clearTimeout(focusGuardTimer); focusGuardTimer = null; }
  hideFocusGuard();
}
function onFullscreenChange() { if (!isFocusing) return; if (document.fullscreenElement) return; pauseForGuard('You left fullscreen during a focus session.'); }
function onStrictVisibilityChange() {
  if (document.hidden && isFocusing) {
    focusGuardTimer = setTimeout(() => { if (document.hidden && isFocusing) pauseForGuard('You switched tabs during a focus session.'); }, 800);
  } else if (!document.hidden) {
    if (focusGuardTimer) { clearTimeout(focusGuardTimer); focusGuardTimer = null; }
  }
}
function onStrictBeforeUnload(e) { if (!isFocusing) return; e.preventDefault(); e.returnValue = 'Strict Mode is active!'; return 'Strict Mode is active!'; }
function pauseForGuard(reason) {
  if (!isFocusing) return;
  if (focusInterval) { clearInterval(focusInterval); focusInterval = null; }
  const overlay = document.getElementById('focus-guard-overlay');
  if (overlay) {
    const p = overlay.querySelector('p');
    if (p && reason) p.innerText = reason + ' Your timer has been paused.';
    overlay.style.display = 'flex';
  }
}
function hideFocusGuard() { const overlay = document.getElementById('focus-guard-overlay'); if (overlay) overlay.style.display = 'none'; }
function persistFocusSession(subject, minutes) {
  google.script.run.withSuccessHandler(res => {
    if (res && res.success && res.focus) {
      state.focusMinutesToday = res.focus.todayMinutes;
      state.focusMinutesWeek = res.focus.weekMinutes;
      state.focusStreak = res.focus.streak;
      state.focusHistory = res.focus.history;
      renderFocusStats();
      loadFocusExtended();
    } else {
      state.focusMinutesToday += minutes;
      state.focusMinutesWeek += minutes;
      renderFocusStats();
    }
  }).saveFocusSession(state.email, subject, minutes, sessionToken);
}
function resetTimer() {
  clearInterval(focusInterval); focusInterval = null;
  if (focusGuardTimer) { clearTimeout(focusGuardTimer); focusGuardTimer = null; }
  isFocusing = false;
  detachStrictListeners();
  focusInitialMins = getTotalMins();
  focusTimeLeft = focusInitialMins * 60;
  updateTimerDisplay();
  const btn = document.getElementById('timer-start-btn');
  btn.innerText = "Start Focus"; btn.style.background = "var(--primary)";
  document.getElementById('timer-ring').classList.remove('active');
  document.getElementById('focus-hours-input').disabled = false;
  document.getElementById('focus-mins-input').disabled = false;
  document.getElementById('focus-subj-input').disabled = false;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}
function resumeFocusAfterGuard() {
  hideFocusGuard();
  if (document.fullscreenEnabled && document.getElementById('strict-mode-cb').checked) {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
  }
  focusInterval = setInterval(() => {
    focusTimeLeft--; updateTimerDisplay();
    if (focusTimeLeft <= 0) {
      clearInterval(focusInterval); focusInterval = null;
      toast("Focus session complete!", "success", 4000);
      persistFocusSession(focusSubjectForSession, focusInitialMins);
      resetTimer();
    }
  }, 1000);
}
function abandonFocus() { hideFocusGuard(); resetTimer(); }

/* ============================================================
   GOALS
   ============================================================ */
function addGoal() {
  const input = document.getElementById('goal-input');
  const txt = input.value.trim();
  if (!txt) return;
  const list = document.getElementById('goal-list');
  const div = document.createElement('div');
  div.className = 'goal-item';
  const label = document.createElement('span'); label.textContent = txt;
  const del = document.createElement('span');
  del.style.cursor = 'pointer'; del.textContent = '❌';
  del.addEventListener('click', () => div.remove());
  div.appendChild(label); div.appendChild(del);
  list.appendChild(div);
  input.value = '';
  toast("Goal added", "success", 1500);
}

/* ============================================================
   PDF VIEWER — DIAGNOSTIC
   ------------------------------------------------------------
   Previous version silently fell back to the Drive iframe on any
   failure mode of getPdfBase64 (null return), and the header
   buttons (prev/next/zoom/fit) short-circuit when `pdfDoc` is
   null, so they rendered but did nothing — which is why the
   view looked like "Google's viewer with no controls".

   New behavior:
     • Server now returns { ok, b64 } or { ok:false, reason, msg }
     • Client logs the reason to the browser console on failure
     • A small amber badge appears over the iframe explaining why
       the fallback fired (session / allowlist / drive / size /
       parse / decode / rpc / no-lib)
   Open DevTools → Console after visiting Timetable to see the
   actual cause.
   ============================================================ */
let pdfDoc = null, pdfScale = 1.0, pdfCurrentPage = 1;

function initPdfViewer(fileId) {
  const container = document.getElementById('pdf-scroll');
  if (!container) return;

  // Library check — if pdfjsLib didn't load (blocked CDN, offline, etc.)
  // there's no point in even calling the server.
  if (typeof pdfjsLib === 'undefined') {
    console.error('[pdf] pdfjsLib undefined — CDN blocked or script not loaded');
    pdfShowFallback(container, fileId, 'no-lib', 'PDF.js library not loaded');
    return;
  }

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  container.style.position = 'relative';
  container.innerHTML = '<p style="padding:40px;color:var(--sub)">Loading Timetable...</p>';

  google.script.run
    .withSuccessHandler(res => {
      // Envelope: { ok:true, b64 } on success, { ok:false, reason, msg } on failure.
      // Also tolerate a bare string in case an older deployment is still in front.
      const b64 = typeof res === 'string' ? res : (res && res.ok ? res.b64 : null);
      if (!b64) {
        const reason = (res && res.reason) || 'unavailable';
        const detail = (res && res.msg) || '';
        console.warn('[pdf] server refused to deliver bytes. reason=' + reason + ' msg=' + detail);
        pdfShowFallback(container, fileId, reason, detail);
        return;
      }

      try {
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

        pdfjsLib.getDocument({ data: bytes }).promise
          .then(doc => {
            pdfDoc = doc;
            pdfCurrentPage = 1;
            pdfFitWidth();
            console.info('[pdf] PDF.js viewer active — ' + doc.numPages + ' page(s)');
          })
          .catch(err => {
            console.error('[pdf] pdf.js parse failed:', err);
            pdfShowFallback(container, fileId, 'parse', err && err.message);
          });
      } catch (e) {
        console.error('[pdf] base64 decode failed:', e);
        pdfShowFallback(container, fileId, 'decode', e && e.message);
      }
    })
    .withFailureHandler(err => {
      console.error('[pdf] google.script.run failed:', err);
      pdfShowFallback(container, fileId, 'rpc', err && err.message);
    })
    .getPdfBase64(fileId, state.email, sessionToken);
}

function pdfShowFallback(container, fileId, reason, detail) {
  container.innerHTML = '';
  container.style.position = 'relative';

  const badge = document.createElement('div');
  badge.style.cssText =
    'position:absolute;top:8px;left:8px;z-index:5;' +
    'padding:4px 10px;border-radius:8px;font-size:11px;font-weight:800;' +
    'letter-spacing:.3px;background:rgba(245,158,11,.92);color:#000;' +
    'pointer-events:none;font-family:ui-monospace,monospace;';
  badge.textContent = 'Fallback (' + reason + ')' + (detail ? ' — ' + String(detail).slice(0, 80) : '');
  container.appendChild(badge);

  const iframe = document.createElement('iframe');
  iframe.src = 'https://drive.google.com/file/d/' + encodeURIComponent(fileId) + '/preview';
  iframe.style.cssText = 'width:100%;height:100%;border:none;';
  container.appendChild(iframe);
}

function pdfRenderAll() {
  if (!pdfDoc) return;
  const container = document.getElementById('pdf-scroll');
  container.innerHTML = '';
  document.getElementById('pdf-page-info').innerText = `${pdfCurrentPage} / ${pdfDoc.numPages}`;
  document.getElementById('pdf-zoom-info').innerText = `${Math.round(pdfScale * 100)}%`;
  const outputScale = window.devicePixelRatio || 1;
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    pdfDoc.getPage(i).then(page => {
      const vp = page.getViewport({ scale: pdfScale });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = Math.floor(vp.width * outputScale);
      canvas.height = Math.floor(vp.height * outputScale);
      canvas.style.width = `${Math.floor(vp.width)}px`;
      canvas.style.height = `${Math.floor(vp.height)}px`;
      page.render({ canvasContext: ctx, transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null, viewport: vp });
      container.appendChild(canvas);
    });
  }
}
function pdfFitWidth() {
  if (!pdfDoc) return;
  const container = document.getElementById('pdf-scroll');
  if (container.clientWidth === 0) return;
  pdfDoc.getPage(1).then(page => {
    pdfScale = window.innerWidth <= 768 ? 2.0 : (container.clientWidth - 32) / page.getViewport({ scale: 1 }).width;
    pdfRenderAll();
  });
}
function pdfZoom(delta) { pdfScale = Math.max(0.25, Math.min(4, pdfScale + delta)); pdfRenderAll(); }
function pdfPrevPage() { if (!pdfDoc || pdfCurrentPage <= 1) return; pdfCurrentPage--; document.getElementById('pdf-scroll').children[pdfCurrentPage - 1].scrollIntoView({ behavior: 'smooth' }); }
function pdfNextPage() { if (!pdfDoc || pdfCurrentPage >= pdfDoc.numPages) return; pdfCurrentPage++; document.getElementById('pdf-scroll').children[pdfCurrentPage - 1].scrollIntoView({ behavior: 'smooth' }); }

/* ============================================================
   GRADES
   ============================================================ */
function getGradeInfo(pct, hasValue) {
  if (!hasValue) return { label: '--', pts: 0, color: '', bar: 'transparent', fill: 0 };
  if (pct >= 75) return { label: 'A1', pts: 1, color: 'g-a', bar: '#10b981', fill: pct };
  if (pct >= 70) return { label: 'A2', pts: 2, color: 'g-a', bar: '#34d399', fill: pct };
  if (pct >= 65) return { label: 'B3', pts: 3, color: 'g-b', bar: '#60a5fa', fill: pct };
  if (pct >= 60) return { label: 'B4', pts: 4, color: 'g-b', bar: '#93c5fd', fill: pct };
  if (pct >= 55) return { label: 'C5', pts: 5, color: 'g-c', bar: '#fbbf24', fill: pct };
  if (pct >= 50) return { label: 'C6', pts: 6, color: 'g-c', bar: '#fcd34d', fill: pct };
  if (pct >= 45) return { label: 'D7', pts: 7, color: 'g-fail', bar: '#f97316', fill: pct };
  if (pct >= 40) return { label: 'E8', pts: 8, color: 'g-fail', bar: '#ef4444', fill: pct };
  return { label: 'F9', pts: 9, color: 'g-fail', bar: '#dc2626', fill: Math.max(pct, 3) };
}
function render() {
  const box = document.getElementById('grade-list');
  box.innerHTML = '';
  const subjs = state.structure[state.exam] || [];
  if (!subjs.length) {
    box.innerHTML = '<div class="dl-empty"><span class="dl-empty-icon">📝</span>No subjects found for ' + escHtml(state.exam) + '.</div>';
    return;
  }
  subjs.forEach(s => {
    const v = (state.grades[state.exam] || {})[s] || '';
    const { pct, hasValue } = calculatePct(v);
    const g = getGradeInfo(pct, hasValue);
    const card = document.createElement('div');
    card.className = 'subject-card';
    card.dataset.subject = s;
    const header = document.createElement('div'); header.className = 'subj-header';
    const nameSpan = document.createElement('span'); nameSpan.style.fontWeight = '700'; nameSpan.textContent = s;
    const badge = document.createElement('span'); badge.className = 'grade-badge ' + g.color;
    badge.textContent = g.label !== '--' ? g.label + ' (' + g.pts + ')' : '--';
    const input = document.createElement('input');
    input.className = 'score-input'; input.value = v; input.placeholder = 'x/y';
    input.addEventListener('input', e => { update(s, e.target.value); scheduleAutoSave(); });
    header.append(nameSpan, badge, input);
    const meterWrap = document.createElement('div'); meterWrap.className = 'grade-meter-wrap';
    const meterBar = document.createElement('div'); meterBar.className = 'grade-meter-bar';
    meterBar.style.width = g.fill + '%'; meterBar.style.background = g.bar;
    meterWrap.appendChild(meterBar);
    const meterLbl = document.createElement('div'); meterLbl.className = 'grade-meter-label';
    meterLbl.textContent = hasValue ? Math.round(pct) + '%' : '';
    card.append(header, meterWrap, meterLbl);
    box.appendChild(card);
  });
  updateAggs();
}
function update(s, v) {
  if (!state.grades[state.exam]) state.grades[state.exam] = {};
  state.grades[state.exam][s] = v;
  updateAggs();
  let card = null;
  try { card = document.querySelector('.subject-card[data-subject="' + CSS.escape(s) + '"]'); }
  catch (e) { card = Array.from(document.querySelectorAll('.subject-card')).find(c => c.dataset.subject === s) || null; }
  if (card) {
    const { pct, hasValue } = calculatePct(v);
    const g = getGradeInfo(pct, hasValue);
    card.querySelector('.grade-badge').className = 'grade-badge ' + g.color;
    card.querySelector('.grade-badge').textContent = g.label !== '--' ? `${g.label} (${g.pts})` : '--';
    card.querySelector('.grade-meter-bar').style.width = g.fill + '%';
    card.querySelector('.grade-meter-bar').style.background = g.bar;
    card.querySelector('.grade-meter-label').textContent = hasValue ? Math.round(pct) + '%' : '';
  }
}
function calculatePct(v) {
  if (!v || !v.includes('/')) return { pct: 0, hasValue: false };
  const [a, b] = v.split('/').map(Number);
  if (isNaN(a) || isNaN(b) || b === 0 || a < 0 || b < 0) return { pct: 0, hasValue: false };
  let pct = (a / b) * 100;
  if (pct > 100) pct = 100;
  return { pct, hasValue: true };
}
const EXAM_WEIGHTS = { WA1: 15, WA2: 15, WA3: 15, EOY: 55 };
function updateAggs() {
  const grid = document.getElementById('avg-grid');
  if (!grid) return;
  const subjects = []; const seen = new Set();
  ['WA1', 'WA2', 'WA3', 'EOY'].forEach(ex => (state.structure[ex] || []).forEach(s => {
    if (!seen.has(s)) { seen.add(s); subjects.push(s); }
  }));
  grid.innerHTML = '';
  subjects.forEach(subj => {
    let weightedSum = 0, weightTotal = 0;
    ['WA1', 'WA2', 'WA3', 'EOY'].forEach(ex => {
      const v = (state.grades[ex] || {})[subj];
      if (!v) return;
      const { pct, hasValue } = calculatePct(v);
      if (hasValue) { weightedSum += pct * EXAM_WEIGHTS[ex]; weightTotal += EXAM_WEIGHTS[ex]; }
    });
    const meanPct = weightTotal ? (weightedSum / weightTotal) : null;
    const g = getGradeInfo(meanPct || 0, meanPct !== null);
    const tile = document.createElement('div'); tile.className = 'avg-tile';
    tile.style.borderBottomColor = meanPct !== null ? g.bar : 'var(--primary)';
    const h2 = document.createElement('h2');
    if (meanPct !== null) h2.style.color = g.bar;
    h2.textContent = meanPct !== null ? Math.round(meanPct) + '%' : '--';
    const p = document.createElement('p'); p.textContent = subj;
    tile.appendChild(h2); tile.appendChild(p);
    tile.addEventListener('click', () => showSubjectBreakdown(subj));
    grid.appendChild(tile);
  });
}
function showSubjectBreakdown(subj) {
  const exams = ['WA1', 'WA2', 'WA3', 'EOY'];
  const msgEl = document.getElementById('alert-message');
  msgEl.textContent = '';
  const title = document.createElement('div');
  title.style.cssText = 'font-size:18px;font-weight:800;margin-bottom:15px;';
  title.textContent = subj;
  msgEl.appendChild(title);
  const table = document.createElement('table');
  table.style.cssText = 'width:100%;border-collapse:collapse;font-size:13px;';
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  headRow.style.borderBottom = '1px solid rgba(128,128,128,.3)';
  [{ text: 'Exam', align: 'left' }, { text: 'Score', align: 'center' }, { text: '%', align: 'center' }, { text: 'Grade', align: 'center' }].forEach(h => {
    const th = document.createElement('th');
    th.style.padding = '6px'; th.style.textAlign = h.align; th.textContent = h.text;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow); table.appendChild(thead);
  const tbody = document.createElement('tbody');
  exams.forEach(ex => {
    const v = (state.grades[ex] || {})[subj];
    const { pct, hasValue } = calculatePct(v);
    const g = getGradeInfo(pct, hasValue);
    const tr = document.createElement('tr');
    const tdExam = document.createElement('td'); tdExam.style.cssText = 'padding:8px 6px;text-align:left;font-weight:700;'; tdExam.textContent = ex;
    const tdScore = document.createElement('td'); tdScore.style.cssText = 'padding:8px 6px;text-align:center;'; tdScore.textContent = hasValue ? v : '—';
    const tdPct = document.createElement('td'); tdPct.style.cssText = 'padding:8px 6px;text-align:center;'; tdPct.textContent = hasValue ? Math.round(pct) + '%' : '—';
    const tdGrade = document.createElement('td'); tdGrade.style.cssText = 'padding:8px 6px;text-align:center;font-weight:800;'; tdGrade.style.color = hasValue ? g.bar : '#94a3b8'; tdGrade.textContent = hasValue ? g.label : '—';
    tr.append(tdExam, tdScore, tdPct, tdGrade);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  msgEl.appendChild(table);
  document.getElementById('alert-overlay').classList.remove('hidden');
  document.getElementById('alert-close-btn').focus();
}
function changeExam(v) { state.exam = v; render(); }
function save() {
  clearTimeout(autoSaveTimer);
  const b = document.getElementById('saveBtn');
  b.innerText = 'Syncing...';
  google.script.run.withSuccessHandler(ok => {
    b.innerText = 'Save Grades';
    setSaveIndicator(ok);
    toast(ok ? 'Grades saved' : 'Save failed', ok ? 'success' : 'error');
  }).saveData(state.email, state.exam, state.grades[state.exam], sessionToken);
}
let autoSaveTimer = null;
function scheduleAutoSave() {
  setSaveIndicator('pending');
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    google.script.run.withSuccessHandler(ok => setSaveIndicator(ok))
      .withFailureHandler(() => setSaveIndicator(false))
      .saveData(state.email, state.exam, state.grades[state.exam], sessionToken);
  }, 1200);
}
function setSaveIndicator(status) {
  const el = document.getElementById('save-indicator');
  if (!el) return;
  el.classList.add('show');
  if (status === 'pending') { el.innerText = '● Saving…'; el.classList.remove('saved'); }
  else if (status) { el.innerText = '✓ Saved'; el.classList.add('saved'); setTimeout(() => el.classList.remove('show'), 1800); }
  else { el.innerText = '✕ Save failed'; el.classList.remove('saved'); }
}

/* ============================================================
   PLANNER & DEADLINES
   ============================================================ */
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function escHtml(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function expandRecurring(startDate, untilDate, freq) {
  const out = [startDate];
  if (!freq || !untilDate) return out;
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(untilDate + 'T00:00:00');
  if (end <= start) return out;
  const max = 200;
  let cur = new Date(start);
  while (out.length < max) {
    if (freq === 'daily') cur.setDate(cur.getDate() + 1);
    else if (freq === 'weekly') cur.setDate(cur.getDate() + 7);
    else if (freq === 'biweekly') cur.setDate(cur.getDate() + 14);
    else if (freq === 'monthly') cur.setMonth(cur.getMonth() + 1);
    else break;
    if (cur > end) break;
    out.push(localDateStr(cur));
  }
  return out;
}
let calAllEvents = [], calCurrentDate = new Date(), calSelectedDate = todayStr(), dlFilter = 'all', dlItems = [], dlSort = 'due', dlQuery = '';

function getCombinedEvents() {
  const deadlinesAsEvents = dlItems.map(d => ({ id: d.id, title: d.title, subject: d.subject, date: d.date, type: 'deadline', done: d.done }));
  return [...calAllEvents, ...deadlinesAsEvents];
}
function calInit() {
  document.getElementById('ev-date-input').value = todayStr();
  const daysHeader = document.getElementById('cal-days-header');
  daysHeader.innerHTML = '';
  ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(day => { daysHeader.innerHTML += `<div class="cal-day-head">${day}</div>`; });
  Promise.all([
    new Promise(res => google.script.run.withSuccessHandler(res).loadEvents(state.email, sessionToken)),
    new Promise(res => google.script.run.withSuccessHandler(res).getGoogleCalendarEvents(state.email, sessionToken)),
    new Promise(res => google.script.run.withSuccessHandler(res).loadDeadlines(state.email, sessionToken))
  ]).then(([p, s, d]) => {
    const norm = (dt) => {
      if (!dt) return todayStr();
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(dt))) return String(dt);
      const parsed = new Date(dt);
      return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
    };
    calAllEvents = [
      ...(p || []).map(e => ({ ...e, type: 'personal', date: norm(e.date) })),
      ...(s || []).map(e => ({ ...e, type: 'school', date: norm(e.date) }))
    ];
    dlItems = (d || []).map(i => ({ ...i, date: norm(i.date) }));
    calRenderMonth(); dlRender();
    renderNextDeadline();
  }).catch(err => console.error("Planner failed:", err));
}
function calChangeMonth(delta) { calCurrentDate.setDate(1); calCurrentDate.setMonth(calCurrentDate.getMonth() + delta); calRenderMonth(); }
function calSelectDate(dateStr) { calSelectedDate = dateStr; document.getElementById('ev-date-input').value = dateStr; calRenderMonth(); }
function calRenderMonth() {
  const grid = document.getElementById('cal-grid'); grid.innerHTML = '';
  const year = calCurrentDate.getFullYear(); const month = calCurrentDate.getMonth();
  document.getElementById('cal-month-year').textContent = calCurrentDate.toLocaleDateString('en-SG', { month: 'long', year: 'numeric' });
  const firstDay = new Date(year, month, 1); const lastDay = new Date(year, month + 1, 0);
  for (let i = 0; i < firstDay.getDay(); i++) grid.innerHTML += '<div class="cal-day other-month"></div>';
  const allEvents = getCombinedEvents();
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    let dayHtml = `<div class="cal-day ${dateStr === todayStr() ? 'today' : ''} ${dateStr === calSelectedDate ? 'selected' : ''}" data-date="${dateStr}"><div class="day-number">${i}</div>`;
    const eventsOnDay = allEvents.filter(e => e.date === dateStr);
    if (eventsOnDay.length > 0) {
      dayHtml += '<div class="cal-dots">';
      if (eventsOnDay.some(e => e.type === 'school')) dayHtml += '<div class="cal-dot school"></div>';
      if (eventsOnDay.some(e => e.type === 'personal')) dayHtml += '<div class="cal-dot personal"></div>';
      if (eventsOnDay.some(e => e.type === 'deadline' && !e.done)) dayHtml += '<div class="cal-dot deadline"></div>';
      dayHtml += '</div>';
    }
    grid.innerHTML += dayHtml + '</div>';
  }
  grid.querySelectorAll('.cal-day[data-date]').forEach(el => { el.addEventListener('click', () => calSelectDate(el.getAttribute('data-date'))); });
  calRenderEventList();
}
function calRenderEventList() {
  const container = document.getElementById('cal-event-list');
  const titleEl = document.getElementById('cal-selected-date-title');
  container.textContent = '';
  const selDate = new Date(calSelectedDate + 'T00:00:00');
  titleEl.textContent = selDate.toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long' });
  let items = getCombinedEvents().filter(e => e.date === calSelectedDate);
  items.sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'));
  if (!items.length) { container.innerHTML = '<div class="dl-empty"><span class="dl-empty-icon">📅</span>No events.</div>'; return; }
  items.forEach(item => {
    const el = document.createElement('div');
    el.className = `cal-event-item ${item.type} ${item.done ? 'done' : ''}`;
    if (item.type === 'deadline') {
      const cb = document.createElement('input');
      cb.type = 'checkbox'; cb.className = 'dl-cb'; cb.style.cssText = 'position:absolute;right:10px;top:12px;';
      cb.checked = !!item.done;
      cb.addEventListener('change', () => dlToggle(item.id));
      const titleDiv = document.createElement('div');
      titleDiv.className = 'ev-title'; titleDiv.style.marginRight = '25px';
      if (item.done) titleDiv.style.cssText += 'text-decoration:line-through;opacity:0.6;';
      if (item.subject) {
        const tag = document.createElement('span'); tag.className = 'dl-subj-tag'; tag.textContent = item.subject;
        titleDiv.appendChild(tag); titleDiv.appendChild(document.createTextNode(' '));
      }
      titleDiv.appendChild(document.createTextNode(item.title));
      const timeDiv = document.createElement('div');
      timeDiv.className = 'ev-time';
      if (item.done) timeDiv.style.opacity = '0.6';
      timeDiv.textContent = 'Deadline';
      el.appendChild(cb); el.appendChild(titleDiv); el.appendChild(timeDiv);
    } else {
      if (item.type === 'personal') {
        const dupBtn = document.createElement('button');
        dupBtn.type = 'button'; dupBtn.className = 'ev-dup'; dupBtn.title = 'Duplicate to date'; dupBtn.textContent = '⎘';
        dupBtn.addEventListener('click', () => evDuplicate(item.id));
        el.appendChild(dupBtn);
        const delBtn = document.createElement('button');
        delBtn.type = 'button'; delBtn.className = 'ev-del'; delBtn.textContent = '✕';
        delBtn.addEventListener('click', () => evDelete(item.id));
        el.appendChild(delBtn);
      }
      const titleDiv = document.createElement('div'); titleDiv.className = 'ev-title'; titleDiv.textContent = item.title;
      el.appendChild(titleDiv);
      const timeDiv = document.createElement('div'); timeDiv.className = 'ev-time';
      timeDiv.textContent = item.startTime ? (item.endTime ? item.startTime + ' - ' + item.endTime : item.startTime) : 'All Day';
      el.appendChild(timeDiv);
      if (item.description) {
        const desc = document.createElement('div'); desc.className = 'ev-desc'; desc.textContent = item.description;
        el.appendChild(desc);
      }
    }
    container.appendChild(el);
  });
}
function evPush() { google.script.run.saveEvents(state.email, calAllEvents.filter(e => e.type === 'personal'), sessionToken); }
function evAdd() {
  const title = document.getElementById('ev-title-input').value.trim();
  if (!title) return;
  const date = document.getElementById('ev-date-input').value;
  const recur = document.getElementById('ev-recur-input').value;
  const until = document.getElementById('ev-until-input').value;
  const dates = recur && until ? expandRecurring(date, until, recur) : [date];
  dates.forEach(d => {
    calAllEvents.push({
      id: Date.now() + Math.floor(Math.random() * 1000),
      title,
      date: d,
      startTime: document.getElementById('ev-start-input').value,
      endTime: document.getElementById('ev-end-input').value,
      description: document.getElementById('ev-desc-input').value.trim(),
      type: 'personal'
    });
  });
  evPush();
  document.getElementById('ev-title-input').value = '';
  document.getElementById('ev-start-input').value = '';
  document.getElementById('ev-end-input').value = '';
  document.getElementById('ev-desc-input').value = '';
  document.getElementById('ev-recur-input').value = '';
  document.getElementById('ev-until-input').value = '';
  calRenderMonth();
  toast(dates.length > 1 ? ('Added ' + dates.length + ' events') : 'Event added', 'success', 1800);
}
async function evDelete(id) {
  const yes = await shpConfirm('Delete this event?');
  if (!yes) return;
  calAllEvents = calAllEvents.filter(x => x.id !== id);
  evPush(); calRenderMonth();
  toast("Event deleted", "info", 1500);
}
async function evDuplicate(id) {
  const ev = calAllEvents.find(x => x.id === id);
  if (!ev) return;
  const target = await shpPrompt("Duplicate '" + ev.title + "' to which date? (YYYY-MM-DD)", todayStr());
  if (!target) return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(target)) { toast("Invalid date format", "error"); return; }
  calAllEvents.push({ id: Date.now(), title: ev.title, date: target, startTime: ev.startTime, endTime: ev.endTime, description: ev.description, type: 'personal' });
  evPush(); calRenderMonth();
  toast("Event duplicated", "success", 1500);
}
function dlPush() { google.script.run.saveDeadlines(state.email, dlItems, sessionToken); }
function dlDaysLeft(dateStr) { return Math.round((new Date(dateStr) - new Date(todayStr())) / 86400000); }

function renderNextDeadline() {
  const container = document.getElementById('dash-next-dl');
  if (!container) return;
  container.textContent = '';
  const pending = dlItems.filter(x => !x.done).sort((a, b) => a.date.localeCompare(b.date));
  if (!pending.length) { container.innerHTML = '<div class="dash-task-item empty">🎉 No pending tasks — you\'re all caught up!</div>'; return; }
  const next = pending[0];
  const days = dlDaysLeft(next.date);
  let label, color;
  if (days < 0) { label = Math.abs(days) + 'd overdue'; color = 'var(--danger)'; }
  else if (days === 0) { label = 'Due today'; color = 'var(--deadline)'; }
  else if (days === 1) { label = 'Due tomorrow'; color = 'var(--deadline)'; }
  else { label = 'In ' + days + ' days'; color = 'var(--primary)'; }
  const item = document.createElement('div');
  item.className = 'dash-task-item';
  item.style.cssText = 'background:rgba(16,185,129,.08);border:1px solid ' + color + ';cursor:pointer;';
  item.addEventListener('click', () => show('calendar'));
  const titleWrap = document.createElement('div');
  titleWrap.style.cssText = 'flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
  titleWrap.appendChild(document.createTextNode(next.title));
  if (next.subject) {
    titleWrap.appendChild(document.createTextNode(' '));
    const tag = document.createElement('span'); tag.className = 'dl-subj-tag'; tag.textContent = next.subject;
    titleWrap.appendChild(tag);
  }
  const labelEl = document.createElement('div');
  labelEl.style.cssText = 'color:' + color + ';font-weight:800;font-size:11px;';
  labelEl.textContent = label;
  item.appendChild(titleWrap); item.appendChild(labelEl);
  container.appendChild(item);
}
function renderDashboardTasks() {
  const cont = document.getElementById('dash-tasks-container');
  if (!cont) return;
  cont.textContent = '';
  let pending = dlItems.filter(x => !x.done).sort((a, b) => a.date.localeCompare(b.date));
  if (pending.length === 0) { cont.innerHTML = '<div class="dash-task-item empty">All caught up! 🎉</div>'; return; }
  pending.slice(0, 3).forEach(item => {
    const days = dlDaysLeft(item.date);
    const daysLabel = days < 0 ? 'Overdue' : days === 0 ? 'Today' : `In ${days}d`;
    const color = days < 0 ? 'var(--danger)' : days <= 1 ? 'var(--deadline)' : 'var(--primary)';
    const row = document.createElement('div'); row.className = 'dash-task-item';
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.style.accentColor = color;
    cb.addEventListener('change', () => dlToggle(item.id));
    const titleWrap = document.createElement('div');
    titleWrap.style.cssText = 'flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
    titleWrap.textContent = item.title;
    const daysEl = document.createElement('div');
    daysEl.style.cssText = 'color:' + color + ';font-weight:700;';
    daysEl.textContent = daysLabel;
    row.appendChild(cb); row.appendChild(titleWrap); row.appendChild(daysEl);
    cont.appendChild(row);
  });
}
function dlAdd() {
  const title = document.getElementById('dl-title-input').value.trim();
  const date = document.getElementById('dl-date-input').value;
  if (!title || !date) return;
  const subject = document.getElementById('dl-subj-input').value;
  const recur = document.getElementById('dl-recur-input').value;
  const until = document.getElementById('dl-until-input').value;
  const dates = recur && until ? expandRecurring(date, until, recur) : [date];
  dates.forEach((d, idx) => {
    dlItems.push({ id: Date.now() + idx, title, subject, date: d, done: false });
  });
  dlPush();
  document.getElementById('dl-title-input').value = '';
  document.getElementById('dl-subj-input').value = '';
  document.getElementById('dl-date-input').value = todayStr();
  document.getElementById('dl-recur-input').value = '';
  document.getElementById('dl-until-input').value = '';
  dlRender(); calRenderMonth(); renderNextDeadline();
  toast(dates.length > 1 ? ('Added ' + dates.length + ' tasks') : 'Task added', 'success', 1800);
}
function dlToggle(id) { const item = dlItems.find(x => x.id === id); if (item) item.done = !item.done; dlPush(); dlRender(); calRenderMonth(); renderNextDeadline(); }
async function dlDelete(id) {
  const yes = await shpConfirm('Delete this task?');
  if (!yes) return;
  dlItems = dlItems.filter(x => x.id !== id);
  dlPush(); dlRender(); calRenderMonth(); renderNextDeadline();
  toast("Task deleted", "info", 1500);
}
function dlSetFilter(f, el) {
  dlFilter = f;
  document.querySelectorAll('.dl-filter-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  dlRender();
}
function dlSetSort(v) { dlSort = v; dlRender(); }
function dlSetSearch(v) { dlQuery = String(v || '').toLowerCase(); dlRender(); }
function dlRender() {
  const container = document.getElementById('dl-list');
  if (!container) return;
  container.textContent = '';
  let items = [...dlItems];
  const today = todayStr();
  if (dlFilter === 'pending') items = items.filter(x => !x.done);
  if (dlFilter === 'overdue') items = items.filter(x => !x.done && x.date < today);
  if (dlFilter === 'done') items = items.filter(x => x.done);
  if (dlQuery) items = items.filter(x => (x.title || '').toLowerCase().includes(dlQuery) || (x.subject || '').toLowerCase().includes(dlQuery));
  if (dlSort === 'due') items.sort((a, b) => (a.done - b.done) || a.date.localeCompare(b.date));
  if (dlSort === 'due-desc') items.sort((a, b) => (a.done - b.done) || b.date.localeCompare(a.date));
  if (dlSort === 'title') items.sort((a, b) => (a.done - b.done) || String(a.title).localeCompare(String(b.title)));
  if (dlSort === 'subject') items.sort((a, b) => (a.done - b.done) || String(a.subject || '').localeCompare(String(b.subject || '')));
  const countEl = document.getElementById('dl-count');
  if (countEl) countEl.innerText = items.length + ' item' + (items.length === 1 ? '' : 's');
  if (!items.length) {
    let msg = 'Nothing here.';
    if (dlQuery) msg = 'No matches for "' + dlQuery + '".';
    else if (dlFilter === 'pending') msg = 'No pending tasks.';
    else if (dlFilter === 'overdue') msg = 'No overdue tasks. Nice!';
    else if (dlFilter === 'done') msg = 'Nothing marked done yet.';
    const empty = document.createElement('div'); empty.className = 'dl-empty';
    const icon = document.createElement('span'); icon.className = 'dl-empty-icon'; icon.textContent = '📋';
    empty.appendChild(icon); empty.appendChild(document.createTextNode(msg));
    container.appendChild(empty);
    renderDashboardTasks();
    return;
  }
  items.forEach(item => {
    const days = dlDaysLeft(item.date);
    let daysLabel, daysClass, itemClass;
    if (item.done) { daysLabel = 'Done'; daysClass = 'done-lbl'; itemClass = 'done'; }
    else if (days < 0) { daysLabel = `${Math.abs(days)}d overdue`; daysClass = 'overdue'; itemClass = 'overdue'; }
    else if (days === 0) { daysLabel = 'Due today'; daysClass = 'today'; itemClass = 'due-soon'; }
    else if (days <= 3) { daysLabel = `In ${days}d`; daysClass = 'soon'; itemClass = 'due-soon'; }
    else { daysLabel = `In ${days}d`; daysClass = 'ok'; itemClass = 'due-ok'; }
    const el = document.createElement('div');
    el.className = `dl-item ${itemClass}`;
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.className = 'dl-cb';
    cb.checked = !!item.done;
    cb.addEventListener('change', () => dlToggle(item.id));
    const info = document.createElement('div'); info.className = 'dl-info';
    const title = document.createElement('div'); title.className = 'dl-title'; title.textContent = item.title;
    const meta = document.createElement('div'); meta.className = 'dl-meta';
    if (item.subject) {
      const tag = document.createElement('span'); tag.className = 'dl-subj-tag'; tag.textContent = item.subject;
      meta.appendChild(tag);
    }
    const dateSpan = document.createElement('span');
    dateSpan.textContent = new Date(item.date + 'T00:00:00').toLocaleDateString('en-SG', { day: 'numeric', month: 'short' });
    meta.appendChild(dateSpan);
    const badge = document.createElement('span'); badge.className = 'dl-days-badge ' + daysClass; badge.textContent = daysLabel;
    meta.appendChild(badge);
    info.appendChild(title); info.appendChild(meta);
    const delBtn = document.createElement('button'); delBtn.type = 'button'; delBtn.className = 'dl-del'; delBtn.textContent = '✕';
    delBtn.addEventListener('click', () => dlDelete(item.id));
    el.appendChild(cb); el.appendChild(info); el.appendChild(delBtn);
    container.appendChild(el);
  });
  renderDashboardTasks();
}

/* ============================================================
   ICS EXPORT / PERSONAL DATA EXPORT
   ============================================================ */
function exportICS() {
  toast('Preparing .ics…', 'info', 1200);
  google.script.run.withSuccessHandler(res => {
    if (!res || !res.success) { toast((res && res.msg) || 'Export failed', 'error'); return; }
    const blob = new Blob([res.ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = res.filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('Exported ' + res.filename, 'success');
  }).withFailureHandler(() => toast('Network error', 'error')).getMyCalendarICS(state.email, sessionToken);
}
function exportMyData(format) {
  toast('Preparing your data…', 'info', 1200);
  google.script.run.withSuccessHandler(res => {
    if (!res || !res.success) { toast((res && res.msg) || 'Export failed', 'error'); return; }
    if (format === 'csv') {
      const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = res.filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast('Exported ' + res.filename, 'success');
    } else {
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'schoolhub-mydata-' + todayStr() + '.json';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast('Exported JSON', 'success');
    }
  }).withFailureHandler(() => toast('Network error', 'error')).exportMyData(state.email, sessionToken, format);
}

/* ============================================================
   NOTIFICATIONS
   ============================================================ */
function requestNotificationPermission() {
  if (!("Notification" in window)) { toast("This browser doesn't support notifications.", "warning"); return; }
  if (Notification.permission === "granted") { toast("Reminders are already enabled.", "info"); return; }
  if (Notification.permission === "denied") { toast("Notifications are blocked. Enable them in your browser settings.", "warning"); return; }
  Notification.requestPermission().then(p => {
    if (p === "granted") toast("Reminders enabled", "success", 2000);
    else toast("Reminders not enabled", "info", 1500);
  });
}
setInterval(() => {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  if (!document.body.getAttribute('data-logged-in')) return;
  const now = todayStr();
  dlItems.filter(x => !x.done && x.date >= now).forEach(item => {
    const days = dlDaysLeft(item.date);
    if (days === 0 || days === 1) {
      const key = 'shp_notified_' + item.id;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
      try {
        new Notification('School Hub Pro — Upcoming Deadline', {
          body: `${item.title}${item.subject ? ' (' + item.subject + ')' : ''} — ${days === 0 ? 'due today' : 'due tomorrow'}`,
          icon: 'https://i.postimg.cc/LhKBst4H/Screenshot-2026-06-30-104638.png'
        });
      } catch (e) {}
    }
  });
}, 3600000);

/* ============================================================
   BUG REPORTS
   ============================================================ */
const BUG_PAGE_BY_VIEW = { home: 'Dashboard', focus: 'Focus Mode', tt: 'Timetable', calendar: 'Planner', grades: 'Grades', settings: 'Settings' };
const BUG_STATUS_TEXT = { 'open': 'Open', 'in-progress': 'Being looked at', 'resolved': 'Resolved', 'wont-fix': 'Closed' };
const BUG_STATUS_COLOR = { 'open': 'var(--deadline)', 'in-progress': 'var(--secondary)', 'resolved': 'var(--primary)', 'wont-fix': 'var(--sub)' };
const BUG_TYPE_TEXT = { 'bug': 'Broken', 'visual': 'Looks wrong', 'performance': 'Slow', 'data': 'Wrong info', 'feature': 'Feature', 'other': 'Other' };
let lastAppView = 'home';
function bugAgo(ts) {
  if (!ts) return '';
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60); if (min < 60) return min + 'm ago';
  const hr = Math.floor(min / 60); if (hr < 24) return hr + 'h ago';
  const d = Math.floor(hr / 24); if (d < 7) return d + 'd ago';
  return new Date(ts).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' });
}
function updateBugCount() {
  const t = document.getElementById('bug-details');
  const c = document.getElementById('bug-count');
  if (!t || !c) return;
  const n = t.value.length;
  c.innerText = n + ' / 2000';
  c.classList.toggle('near', n > 1800);
}
function openBugView() {
  const sel = document.getElementById('bug-page');
  if (sel && BUG_PAGE_BY_VIEW[lastAppView]) sel.value = BUG_PAGE_BY_VIEW[lastAppView];
  updateBugCount();
  loadMyBugs();
}
function submitBug() {
  const btn = document.getElementById('bug-submit-btn');
  const payload = {
    title: document.getElementById('bug-title').value.trim(),
    category: document.getElementById('bug-category').value,
    severity: document.getElementById('bug-severity').value,
    page: document.getElementById('bug-page').value,
    details: document.getElementById('bug-details').value.trim()
  };
  if (payload.title.length < 5) { toast('Add a summary of at least 5 characters.', 'warning'); return; }
  if (payload.details.length < 10) { toast('Describe what happened in at least 10 characters.', 'warning'); return; }
  btn.disabled = true; btn.innerText = 'Sending…';
  google.script.run.withSuccessHandler(res => {
    btn.disabled = false; btn.innerText = 'Send report';
    if (res && res.success) {
      toast(res.msg || 'Report sent. Thanks!', 'success');
      document.getElementById('bug-title').value = '';
      document.getElementById('bug-details').value = '';
      document.getElementById('bug-category').selectedIndex = 0;
      document.getElementById('bug-severity').value = 'medium';
      document.getElementById('bug-page').value = BUG_PAGE_BY_VIEW[lastAppView] || 'Somewhere else';
      updateBugCount(); loadMyBugs();
    } else { toast((res && res.msg) || 'Could not send report.', 'error'); }
  }).withFailureHandler(err => {
    btn.disabled = false; btn.innerText = 'Send report';
    toast('Could not send report: ' + (err && err.message ? err.message : err), 'error');
  }).submitBugReport(state.email, payload, sessionToken);
}
function loadMyBugs() {
  const list = document.getElementById('bug-list');
  if (!list) return;
  google.script.run.withSuccessHandler(res => {
    const reports = (res && res.reports) || [];
    list.textContent = '';
    if (!reports.length) {
      const empty = document.createElement('div');
      empty.className = 'dl-empty'; empty.style.padding = '30px 0';
      const icon = document.createElement('span'); icon.className = 'dl-empty-icon'; icon.textContent = '🐛';
      empty.appendChild(icon); empty.appendChild(document.createTextNode('Nothing reported yet.'));
      list.appendChild(empty);
      return;
    }
    reports.forEach(r => {
      const item = document.createElement('div');
      item.className = 'bug-item st-' + (r.status || 'open');
      const head = document.createElement('div'); head.className = 'bug-item-head';
      const id = document.createElement('span'); id.className = 'bug-id'; id.textContent = r.id;
      const status = document.createElement('span'); status.className = 'bug-status';
      status.style.color = BUG_STATUS_COLOR[r.status] || 'var(--sub)';
      status.textContent = BUG_STATUS_TEXT[r.status] || r.status;
      head.appendChild(id); head.appendChild(status);
      const title = document.createElement('div'); title.className = 'bug-item-title'; title.textContent = r.title;
      const meta = document.createElement('div'); meta.className = 'bug-item-meta';
      meta.textContent = [BUG_TYPE_TEXT[r.category] || r.category, r.page, bugAgo(r.ts)].filter(Boolean).join(' · ');
      item.appendChild(head); item.appendChild(title); item.appendChild(meta);
      if (r.adminNote) {
        const note = document.createElement('div'); note.className = 'bug-item-note'; note.textContent = 'Reply: ' + r.adminNote;
        item.appendChild(note);
      }
      list.appendChild(item);
    });
  }).withFailureHandler(() => {}).loadMyBugReports(state.email, sessionToken);
}
(function wireBugForm() {
  const t = document.getElementById('bug-details');
  if (t) t.addEventListener('input', updateBugCount);
})();
</script>
