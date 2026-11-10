/* HR FSC – web-app (iPhone, trình duyệt) và giao diện bên trong app Android 2.x.
 * Giao diện theo "Mẫu HR FSC" (10/11/2026): Chấm công · Bảng công · Nghỉ phép · Tăng ca · Cá nhân.
 * Máy chủ: FSC_WebApi.gs (Apps Script). Trong app Android có cầu nối window.FSCNative (vị trí gốc, phát hiện vị trí giả, Device ID, in). */
'use strict';
const API_URL = 'https://script.google.com/macros/s/AKfycbwPZitbwnMuiqy4u0_2gQQJR57l03DPp50CYgab-d_RjQYavIznZyz_8P25tC86cGd-/exec';
const VERSION = '2.0';
const NATIVE = window.FSCNative || null;
const VI_TRI_CU_MS = 60000;

const $ = id => document.getElementById(id);
const store = {
  get(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } },
  set(k, v) { try { v == null || v === '' ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} }
};
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------------- Biểu tượng (nét) ---------------- */
const P = {
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  calx: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M10 14l4 4M14 14l-4 4"/>',
  calpen: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M11 18l4.5-4.5 1.5 1.5-4.5 4.5H11z"/>',
  nav: '<polygon points="3 11 22 2 13 21 11 13 3 11"/>',
  refresh: '<path d="M21 12a9 9 0 0 1-15.5 6.2L3 16M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>',
  wh: '<path d="M3 21V9l9-6 9 6v12"/><path d="M7 21v-8h10v8M7 17h10"/>',
  badge: '<path d="M12 2l2.4 1.7 2.9-.2.9 2.8 2.4 1.7-.9 2.8.9 2.8-2.4 1.7-.9 2.8-2.9-.2L12 22l-2.4-1.7-2.9.2-.9-2.8L3.4 16l.9-2.8-.9-2.8 2.4-1.7.9-2.8 2.9.2z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  in: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5M15 12H3"/>',
  out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  checkc: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
  dcheck: '<path d="M2 12l5 5L17 7M11 15l2 2 9-9"/>',
  swap: '<path d="M17 3l4 4-4 4M21 7H8M7 21l-4-4 4-4M3 17h13"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  hist: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
  finger: '<path d="M12 11v3a8 8 0 0 1-1.2 4.2M7.5 9.5A4.5 4.5 0 0 1 16.5 10v2c0 2.6-.6 5-1.6 7M4.6 15A11 11 0 0 1 4 11.5a8 8 0 0 1 14-5.3M20 11.5c0 1.7-.2 3.3-.6 4.8M9 18.5c.6-1.2 1-2.7 1-4.5v-3a2 2 0 0 1 4 0v1"/>',
  doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8M8 9h2"/>',
  clockp: '<path d="M20.5 12.5A8.5 8.5 0 1 1 11.5 3.5"/><path d="M12 7v5l3 2M18 2v6M15 5h6"/>',
  print: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
  send: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>',
  fam: '<circle cx="7" cy="5" r="2"/><circle cx="17" cy="5" r="2"/><path d="M5 22v-6H3l2-7h4l2 7H9v6M15 22v-7h-1v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4h-1v7"/>',
  left: '<path d="M15 18l-6-6 6-6"/>', right: '<path d="M9 18l6-6-6-6"/>', down: '<path d="M6 9l6 6 6-6"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/>',
  calc: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h8"/>',
  cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
  plane: '<path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
  key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
  msg: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  phone: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15zM20 17v5H6.5"/>',
  sigtap: '<path d="M9 11V5a2 2 0 0 1 4 0v5M13 10V8a2 2 0 0 1 4 0v3M17 11a2 2 0 0 1 4 0v3a8 8 0 0 1-8 8h-1a7 7 0 0 1-6-3.4L3.3 15a1.9 1.9 0 0 1 3.2-2L9 16"/>',
  box: '<path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8"/>'
};
const I = (n, cls) => `<svg class="i ${cls || ''}" viewBox="0 0 24 24">${P[n] || ''}</svg>`;

/* ---------------- Định dạng ---------------- */
const pad = n => String(n).padStart(2, '0');
let timeOffset = 0;   // lệch giữa đồng hồ máy và giờ máy chủ
function vnNow() { const t = Date.now() + timeOffset; return new Date(t + (new Date(t).getTimezoneOffset() + 420) * 60000); }
function isoOf(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function todayIso() { return isoOf(vnNow()); }
function parseIso(iso) { const p = String(iso || '').split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
function addDays(iso, n) { const d = parseIso(iso); d.setDate(d.getDate() + n); return isoOf(d); }
function dm(iso) { const p = String(iso || '').split('-'); return p.length === 3 ? `${p[2]}/${p[1]}` : ''; }
function dmy(iso) { const p = String(iso || '').split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : ''; }
const THU = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const THU_N = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
function thuN(iso) { return iso ? THU_N[parseIso(iso).getDay()] : ''; }
function thuD(iso) { return iso ? THU[parseIso(iso).getDay()] : ''; }
function isoWeek(d) { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const n = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - n); const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return Math.ceil(((t - y) / 86400000 + 1) / 7); }
function num(x, dec) {
  x = Number(x) || 0;
  if (dec == null) dec = 1;
  if (Math.abs(x - Math.round(x)) < 1e-9) dec = 0;
  return x.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: dec });
}
function num1(x) { return (Number(x) || 0).toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
const money = x => num(Math.round(Number(x) || 0), 0) + ' đ';
const moneyOr = x => Number(x) ? money(x) : '-';
function kShort(x) { x = Number(x) || 0; return x >= 1e6 ? num(x / 1e6, 2) + 'tr' : x >= 1e3 ? num(x / 1e3, 0) + 'k' : num(x, 0); }
function kyNhan(k) { return 'Kỳ ' + k; }
function kyTuDen(k) {
  const p = String(k || '').split('-'); if (p.length !== 2) return null;
  const y = +p[0], m = +p[1], py = m === 1 ? y - 1 : y, pm = m === 1 ? 12 : m - 1;
  return [`${py}-${pad(pm)}-26`, `${y}-${pad(m)}-25`];
}
function hm(min) { return `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`; }
function phut(s) { const m = /^(\d{1,2}):(\d{2})/.exec(s || ''); return m ? +m[1] * 60 + +m[2] : -1; }
function khoangCach(lat1, lng1, lat2, lng2) {
  const R = 6371000, t = Math.PI / 180, dLat = (lat2 - lat1) * t, dLng = (lng2 - lng1) * t;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * t) * Math.cos(lat2 * t) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
function initials(name) { const w = String(name || '').trim().split(/\s+/); return ((w[w.length - 2] || '')[0] || '') + ((w[w.length - 1] || '')[0] || ''); }

/* ---------------- Thiết bị, máy chủ ---------------- */
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = !!NATIVE || navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);

// Device ID "APP-…". Trong app Android dùng ID của app gốc (giữ nguyên tài khoản đã đăng ký).
function deviceId() {
  if (NATIVE && NATIVE.deviceId) { try { const d = NATIVE.deviceId(); if (d) return d; } catch (e) {} }
  let id = store.get('fsc_app_device');
  if (!id) {
    const u = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now().toString(16) + Math.random().toString(16).slice(2));
    id = ('APP-' + u).replace(/[^A-Za-z0-9-]/g, '').slice(0, 64);
    store.set('fsc_app_device', id);
  }
  return id;
}
function appVersion() { try { return NATIVE && NATIVE.version ? 'android-' + NATIVE.version() + '/web-' + VERSION : 'web-' + VERSION; } catch (e) { return 'web-' + VERSION; } }

async function api(action, body) {
  const payload = JSON.stringify(Object.assign({ action, deviceId: deviceId(), app: appVersion() }, store.get('fsc_app_token') ? { token: store.get('fsc_app_token') } : {}, body || {}));
  const waits = [2000, 4000, 6000];
  for (let i = 0; ; i++) {
    let res;
    try {
      const r = await fetch(API_URL, { method: 'POST', body: payload });
      res = await r.json();
    } catch (e) {
      const err = new Error('Không kết nối được máy chủ. Kiểm tra mạng (4G/Wi-Fi) rồi thử lại.'); err.code = 'net'; throw err;
    }
    if (res.ok) return res;
    if (res.code === 'busy' && i < waits.length) { await new Promise(r => setTimeout(r, waits[i])); continue; }
    const err = new Error(res.error || 'Máy chủ gặp lỗi, vui lòng thử lại.'); err.code = res.code || ''; throw err;
  }
}

/* ---------------- Hộp thoại, thông báo ---------------- */
function dialog(title, message, okText, cancelText) {
  return new Promise(resolve => {
    $('modal').innerHTML = `<div class="modal center"><div class="box">${title ? `<h3 class="t">${esc(title)}</h3>` : ''}<p>${esc(message)}</p>
      <div class="acts">${cancelText ? `<button id="mNo">${esc(cancelText)}</button>` : ''}<button class="pri" id="mOk">${esc(okText || 'OK')}</button></div></div></div>`;
    $('mOk').onclick = () => { $('modal').innerHTML = ''; resolve(true); };
    if (cancelText) $('mNo').onclick = () => { $('modal').innerHTML = ''; resolve(false); };
  });
}
function sheet(html, bind) {
  $('modal').innerHTML = `<div class="modal" id="mBg"><div class="box">${html}</div></div>`;
  $('mBg').onclick = e => { if (e.target.id === 'mBg') closeSheet(); };
  if (bind) bind();
}
function closeSheet() { $('modal').innerHTML = ''; }
let toastT = null;
function toast(t) { $('toast').innerHTML = `<div>${esc(t)}</div>`; clearTimeout(toastT); toastT = setTimeout(() => { $('toast').innerHTML = ''; }, 2600); }

/* ---------------- Trạng thái ---------------- */
let tab = store.get('fsc_app_tab') || 'scan';
let me = null, meErr = '', dangTaiMe = false, meKy = '';
let st = { ok: false, err: '', diem: [], banKinh: 200, saiSo: 100, caMo: null, ganDay: [] };
let best = null, gpsErr = null, watchId = null, nativeTimer = null, clockTimer = null, busy = false;
let segBc = 'phieu';
let fNghi = { type: 'PHEP', from: '', to: '', part: 'FULL', note: '' };
let fOt = { type: 'THUONG', date: '', from: '17:00', to: '19:00', reason: 'Xuất kho gấp', reasonText: '', work: '', touched: false };
let otAll = false;
const TABS_NV = [['scan', 'finger', 'Chấm công'], ['bc', 'doc', 'Bảng công'], ['nghi', 'calx', 'Nghỉ phép'], ['ot', 'clockp', 'Tăng ca'], ['me', 'user', 'Cá nhân']];
const TAB_QL = ['ql', 'shield', 'Quản lý'];
let TABS = TABS_NV;
const laQL = () => store.get('fsc_app_ql') === '1';

/* ---------------- Hướng dẫn cài (iPhone Safari) ---------------- */
function showInstall() {
  $('nav').hidden = true;
  $('app').innerHTML = `<div class="page plain login wrap">
    <img src="logo.png" alt="" class="brand"><h1>HR FSC</h1><p class="muted">Cài lên màn hình chính để dùng như app</p>
    <div class="card"><ol style="padding-left:20px;line-height:1.9;margin:0">
      <li>Bấm nút <b>Chia sẻ</b> ⬆︎ ở thanh dưới của Safari.</li>
      <li>Chọn <b>Thêm vào MH chính</b> (Add to Home Screen), bấm <b>Thêm</b>.</li>
      <li>Mở <b>HR FSC</b> từ biểu tượng mới rồi đăng nhập. Khi được hỏi vị trí, chọn <b>Cho phép</b>.</li></ol>
      <div class="note" style="margin-top:12px">${I('info', 's')}<span>Phải mở bằng Safari. Đăng nhập trong app đã cài (không đăng nhập ở Safari) để không bị khóa thiết bị.</span></div></div>
    <button class="lnk" id="bSafari">Vẫn dùng trong Safari</button></div>`;
  $('bSafari').onclick = () => { store.set('fsc_app_safari', '1'); showLogin(); };
}

/* ---------------- Đăng nhập ---------------- */
let lookupTimer = null;
function showLogin(msg) {
  stopGps();
  $('nav').hidden = true;
  $('app').innerHTML = `<div class="page plain login wrap">
    <img src="logo.png" alt="" class="brand"><h1>HR FSC</h1><p class="muted">Chấm công · Bảng công · Nghỉ phép · Tăng ca</p>
    <div class="card" style="margin-top:20px">
      <div class="fl">Mã nhân viên</div>
      <input class="inp" id="iCode" autocapitalize="characters" autocomplete="username" maxlength="20" placeholder="Ví dụ F018" value="${esc(store.get('fsc_app_code'))}">
      <div id="tTen" class="small green" style="min-height:20px;margin-top:5px"></div>
      <div class="fl" style="margin-top:6px">Mật khẩu</div>
      <input class="inp" id="iPin" type="password" inputmode="numeric" autocomplete="current-password" maxlength="12" placeholder="Mật khẩu">
      <div class="err" id="eLogin">${esc(msg || '')}</div>
      <button class="btn pri" id="bLogin">ĐĂNG NHẬP</button>
      <p class="small muted">Lần đầu đăng nhập: dùng mật khẩu mặc định do quản lý cung cấp, sau đó đặt mật khẩu riêng 4–8 số.</p>
    </div><p class="xs faint" style="text-align:center">Phiên bản ${esc(appVersion())}</p></div>`;
  const code = $('iCode');
  const traTen = async () => {
    if (!$('tTen')) return;
    const ma = code.value.trim().toUpperCase();
    if (ma.length < 2) { $('tTen').textContent = ''; return; }
    $('tTen').className = 'small muted'; $('tTen').textContent = 'Đang tìm…';
    try {
      const r = await api('lookup', { code: ma });
      if (!$('tTen') || code.value.trim().toUpperCase() !== ma) return;
      $('tTen').className = 'small green'; $('tTen').textContent = '✓ ' + r.name + (r.team ? ' · ' + r.team : '');
    } catch (e) {
      if (!$('tTen') || code.value.trim().toUpperCase() !== ma) return;
      $('tTen').className = 'small red'; $('tTen').textContent = e.message;
    }
  };
  code.addEventListener('input', () => { code.value = code.value.toUpperCase(); clearTimeout(lookupTimer); lookupTimer = setTimeout(traTen, 600); });
  if (code.value.length >= 2) traTen();
  const go = async () => {
    const c = code.value.trim().toUpperCase(), p = $('iPin').value.trim();
    if (!c || !p) { $('eLogin').textContent = 'Nhập Mã NV và mật khẩu.'; return; }
    const b = $('bLogin'); b.disabled = true; b.textContent = 'Đang đăng nhập…'; $('eLogin').textContent = '';
    try {
      store.set('fsc_app_token', '');
      const r = await api('login', { code: c, pin: p });
      store.set('fsc_app_code', c);
      if (r.mustSetPin) showSetPin(r.setupToken, r.profile);
      else { savePhien(r); showMain(); }
    } catch (e) { b.disabled = false; b.textContent = 'ĐĂNG NHẬP'; $('eLogin').textContent = e.message; }
  };
  $('bLogin').onclick = go;
  $('iPin').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
}

function showSetPin(setupToken, profile) {
  $('app').innerHTML = `<div class="page plain login wrap"><h1>Đặt mật khẩu mới</h1>
    <p>${profile ? esc(profile.name + ' – ' + profile.code) : ''}</p>
    <div class="card"><div class="fl">Mật khẩu mới (4–8 chữ số)</div><input class="inp" id="p1" type="password" inputmode="numeric" maxlength="8" autocomplete="new-password">
      <div class="fl">Nhập lại mật khẩu</div><input class="inp" id="p2" type="password" inputmode="numeric" maxlength="8" autocomplete="new-password">
      <div class="err" id="ePin"></div><button class="btn pri" id="bPin">LƯU MẬT KHẨU</button></div></div>`;
  $('bPin').onclick = async () => {
    const a = $('p1').value.trim();
    if (!/^\d{4,8}$/.test(a)) { $('ePin').textContent = 'Mật khẩu gồm 4 đến 8 chữ số.'; return; }
    if (a !== $('p2').value.trim()) { $('ePin').textContent = 'Hai lần nhập không giống nhau.'; return; }
    $('bPin').disabled = true;
    try { const r = await api('setPin', { setupToken, newPin: a }); savePhien(r); showMain(); }
    catch (e) { $('bPin').disabled = false; $('ePin').textContent = e.message; if (e.code === 'auth') showLogin('Hết thời gian đặt mật khẩu, đăng nhập lại.'); }
  };
}

function savePhien(r) {
  store.set('fsc_app_token', r.token);
  if (r.profile) saveProfile(r.profile);
}
function saveProfile(p) {
  store.set('fsc_app_name', p.name); store.set('fsc_app_team', p.team || ''); store.set('fsc_app_code', p.code);
  if (p.joinDate != null) store.set('fsc_app_join', p.joinDate);
  if (p.quanLy != null) {
    const truoc = laQL();
    store.set('fsc_app_ql', p.quanLy ? '1' : '');
    if (truoc !== laQL()) { dungNav(); if (laQL()) taiMgrOt(); }
  }
}
function dangXuat(msg) { store.set('fsc_app_token', ''); store.set('fsc_app_ql', ''); me = null; st.ok = false; mgr.ot = null; mgr.pres = null; clearInterval(presTimer); showLogin(msg); }
function authFail(e) { if (e.code === 'auth' || e.code === 'device') { dangXuat(e.message); return true; } return false; }

/* ---------------- Khung chính ---------------- */
// Thanh tab: quản lý có thêm tab "Quản lý" (Duyệt tăng ca, Có mặt tại kho).
function dungNav() {
  if ($('nav').hidden) return;
  TABS = laQL() ? TABS_NV.slice(0, 4).concat([TAB_QL], TABS_NV.slice(4)) : TABS_NV;
  $('nav').innerHTML = `<div class="wrap">${TABS.map(t => `<button data-tab="${t[0]}">${I(t[1])}<span>${t[2]}</span>${t[0] === 'ql' && soOtCho() ? `<b class="nbadge">${soOtCho()}</b>` : ''}</button>`).join('')}</div>`;
  $('nav').classList.toggle('six', TABS.length > 5);
  $('nav').querySelectorAll('button').forEach(b => { b.onclick = () => chonTab(b.dataset.tab); b.classList.toggle('on', b.dataset.tab === tab); });
}

function showMain() {
  clearTimeout(lookupTimer);
  $('nav').hidden = false;
  dungNav();
  if (laQL()) taiMgrOt();
  chonTab(tab);
  startGps();
  clearInterval(clockTimer);
  clockTimer = setInterval(tick, 1000);
  taiTrangThai(false);
  taiMe(null);
}

function chonTab(t) {
  if (!TABS.some(x => x[0] === t)) t = 'scan';
  tab = t; store.set('fsc_app_tab', t);
  $('nav').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
  if (t === 'ql') { taiMgrOt(); if (mgr.seg === 'pres') taiMgrPres(); }
  render();
  window.scrollTo(0, 0);
}

function hdrHtml() {
  const team = store.get('fsc_app_team'), kho = st.diem[0] ? (st.diem[0].kho || st.diem[0].ma) : '';
  const sub = [team, kho].filter(Boolean).join(' • ') || 'Nhân viên FSC';
  return `<header class="hdr"><div class="wrap"><div class="ava">${I('user')}</div>
    <div class="sp"><div class="row" style="gap:8px"><span class="nm">${esc(store.get('fsc_app_name'))}</span><span class="chip">${esc(store.get('fsc_app_code'))}</span></div>
    <div class="sub">${esc(sub)}</div></div>
    <button class="bell" id="bBell" aria-label="Thông báo">${I('bell', 'l')}${thongBaoMoi().length ? '<span class="dot"></span>' : ''}</button></div></header>`;
}

function render() {
  if ($('nav').hidden) return;
  let body = '';
  if (tab === 'scan') body = scanHtml();
  else if (tab === 'ql') body = qlHtml();
  else if (!me) body = meErr ? `<div class="card"><div class="red">${esc(meErr)}</div><button class="btn pri" id="bRetry">THỬ LẠI</button></div>` : '<div class="card muted">Đang tải dữ liệu…</div>';
  else body = tab === 'bc' ? bcHtml() : tab === 'nghi' ? nghiHtml() : tab === 'ot' ? otHtml() : meHtml();
  if (tab === 'me' && !me) body = meHtml();
  $('app').innerHTML = hdrHtml() + `<div class="page wrap">${body}</div>`;
  $('bBell').onclick = showThongBao;
  const nb = document.querySelector('#nav button[data-tab=ql]');
  if (nb) { const c = soOtCho(), el = nb.querySelector('.nbadge'); if (c && !el) nb.insertAdjacentHTML('beforeend', `<b class="nbadge">${c}</b>`); else if (el) { if (c) el.textContent = c; else el.remove(); } }
  if ($('bRetry')) $('bRetry').onclick = () => taiMe(null);
  if (tab === 'scan') bindScan();
  else if (tab === 'ql') bindQl();
  else if (me || tab === 'me') ({ bc: bindBc, nghi: bindNghi, ot: bindOt, me: bindMe }[tab] || (() => {}))();
}

/* ---------------- Dữ liệu ---------------- */
async function taiTrangThai(baoLoi) {
  const t0 = Date.now();
  try {
    const r = await api('status');
    if (r.serverTime) { const s = Date.parse(r.serverTime); if (isFinite(s)) timeOffset = s - (t0 + Date.now()) / 2; }
    st = { ok: true, apiVersion: r.apiVersion || '', err: '', diem: r.diem || [], banKinh: Number(r.banKinh) || 200, saiSo: Number(r.saiSoToiDa) || 100, caMo: r.caMo || null, ganDay: r.ganDay || [] };
    if (r.profile) saveProfile(r.profile);
  } catch (e) {
    if (authFail(e)) return;
    st.err = /Không rõ thao tác/.test(e.message) ? 'Máy chủ chưa cập nhật bản mới cho app. Báo quản lý triển khai phiên bản mới.' : e.message;
    if (baoLoi) toast(st.err);
  }
  if (tab === 'scan') render();
}

async function taiMe(ky) {
  if (dangTaiMe) return;
  dangTaiMe = true; meErr = '';
  const k = ky == null ? (me ? me.ky : '') : ky;
  if (tab !== 'scan' && me) render();
  try {
    const r = await api('me', { ky: k });
    me = r; meKy = r.ky;
    if (r.profile) saveProfile(r.profile);
  } catch (e) {
    dangTaiMe = false;
    if (authFail(e)) return;
    meErr = e.message;
  }
  dangTaiMe = false;
  if (tab !== 'scan' || !me) render(); else render();
}

/* ======================= TAB CHẤM CÔNG ======================= */
function viTri() {
  if (NATIVE && NATIVE.location) {
    try { const s = NATIVE.location(); if (s) { const o = JSON.parse(s); if (o && o.lat != null) return { lat: o.lat, lng: o.lng, acc: o.acc, t: Date.now() - (o.age || 0), mock: !!o.mock }; } } catch (e) {}
    return null;
  }
  return best && Date.now() - best.t <= VI_TRI_CU_MS ? best : null;
}

function startGps(force) {
  if (NATIVE) {
    try { NATIVE.startLocation && NATIVE.startLocation(); } catch (e) {}
    clearInterval(nativeTimer);
    nativeTimer = setInterval(() => { if (tab === 'scan') capNhatGps(); }, 1000);
    return;
  }
  if (!navigator.geolocation) { gpsErr = 'none'; return; }
  if (watchId != null && !force) return;
  if (watchId != null) navigator.geolocation.clearWatch(watchId);
  gpsErr = null;
  watchId = navigator.geolocation.watchPosition(p => {
    const c = p.coords;
    if (!best || Date.now() - best.t > 15000 || c.accuracy <= best.acc + 5) best = { lat: c.latitude, lng: c.longitude, acc: c.accuracy, t: Date.now() };
    gpsErr = null;
    if (tab === 'scan') capNhatGps();
  }, e => {
    gpsErr = e.code === 1 ? 'denied' : 'unavailable';
    if (e.code === 1) { navigator.geolocation.clearWatch(watchId); watchId = null; }
    if (tab === 'scan') capNhatGps();
  }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 });
}
function stopGps() {
  if (watchId != null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
  clearInterval(clockTimer); clearInterval(nativeTimer);
  try { NATIVE && NATIVE.stopLocation && NATIVE.stopLocation(); } catch (e) {}
}
function nativeLoi() { try { return NATIVE && NATIVE.locationError ? NATIVE.locationError() : ''; } catch (e) { return ''; } }

// Đánh giá vị trí hiện tại so với điểm chấm công gần nhất.
function danhGiaViTri() {
  const l = viTri(), loi = NATIVE ? nativeLoi() : gpsErr;
  const o = { ok: false, cls: 'warn', chip: 'Đang định vị…', chipCls: 'amber', line: 'Đứng chỗ thoáng, chờ vài giây.', kho: st.diem[0] ? (st.diem[0].kho || st.diem[0].ma) : 'Kho FSC', l };
  if (loi === 'denied' || loi === 'permission') {
    o.cls = 'bad'; o.chip = 'Chưa cho phép vị trí'; o.chipCls = 'red';
    o.line = NATIVE ? 'Chạm "Định vị lại" để cấp quyền Vị trí chính xác cho app.' : isIOS ? 'Cài đặt → Quyền riêng tư & Bảo mật → Dịch vụ định vị → Trang web Safari → Khi dùng ứng dụng + Vị trí chính xác.' : 'Cho phép trang dùng vị trí rồi chạm "Định vị lại".';
    return o;
  }
  if (loi === 'disabled') { o.cls = 'bad'; o.chip = 'GPS đang tắt'; o.chipCls = 'red'; o.line = 'Bật Vị trí (GPS) trên điện thoại, rồi chạm "Định vị lại".'; return o; }
  if (!l) { if (loi) o.line = 'Chưa bắt được GPS. Ra chỗ thoáng rồi chạm "Định vị lại".'; return o; }
  if (l.mock) { o.cls = 'bad'; o.chip = 'Vị trí giả lập'; o.chipCls = 'red'; o.line = 'Tắt ứng dụng giả lập vị trí (Fake GPS) để chấm công.'; return o; }
  if (!st.ok) { o.chip = st.err ? 'Lỗi tải điểm chấm công' : 'Đang tải điểm chấm công'; o.chipCls = st.err ? 'red' : 'amber'; o.line = st.err || 'Chờ vài giây.'; o.cls = st.err ? 'bad' : 'warn'; return o; }
  if (!st.diem.length) { o.cls = 'bad'; o.chip = 'Chưa có tọa độ kho'; o.chipCls = 'red'; o.line = 'Báo quản lý điền Vĩ độ / Kinh độ của kho trong tab DiemQuet.'; return o; }
  let min = Infinity, d0 = null;
  st.diem.forEach(d => { const k = khoangCach(l.lat, l.lng, +d.lat, +d.lng); if (k < min) { min = k; d0 = d; } });
  o.kho = d0.kho || d0.ma; o.bk = +d0.banKinh || st.banKinh; o.kc = Math.round(min); o.acc = Math.round(l.acc);
  o.line = `Tọa độ: ${l.lat.toFixed(4)}° N, ${l.lng.toFixed(4)}° E (Cách trạm ${o.kc}m · ±${o.acc}m)`;
  if (o.acc > st.saiSo) { o.chip = 'Tín hiệu GPS yếu'; o.chipCls = 'amber'; o.cls = 'warn'; }
  else if (o.kc > o.bk) { o.chip = 'Ngoài vùng chấm công'; o.chipCls = 'red'; o.cls = 'bad'; }
  else { o.chip = 'Trong vùng hợp lệ'; o.chipCls = ''; o.cls = ''; o.ok = true; }
  return o;
}

// Ca từ các lượt chấm công hợp lệ (giống máy chủ): ngày vào ca → { vao, ra, msVao, msRa }; ra trong 16 giờ sau vào.
function caTuQuet(quet) {
  const out = {}; let mo = null;
  (quet || []).forEach(q => {
    if (!q.hopLe) return;
    if (q.loai === 'IN') {
      const g = out[q.ngay] || (out[q.ngay] = { ngay: q.ngay, vao: '', ra: '', msVao: 0, msRa: 0, raNgay: '' });
      if (!g.vao || q.gio < g.vao) { g.vao = q.gio; g.msVao = q.ms; }
      mo = g;
    } else if (q.loai === 'OUT') {
      if (mo && q.ms - mo.msVao <= 16 * 3600000) { mo.ra = q.gio; mo.msRa = q.ms; mo.raNgay = q.ngay; }
      else { const g = out[q.ngay] || (out[q.ngay] = { ngay: q.ngay, vao: '', ra: '', msVao: 0, msRa: 0, raNgay: '' }); g.ra = q.gio; g.msRa = q.ms; g.raNgay = q.ngay; }
    }
  });
  return out;
}

function scanHtml() {
  const now = vnNow(), v = danhGiaViTri(), cfg = (me && me.cauHinh) || { gioCa: 8 };
  const vao = st.caMo && st.caMo.vao, ra = st.caMo && st.caMo.ra, trongCa = !!(vao && !ra);
  let caHtml;
  if (trongCa) {
    const msVao = parseIso(vao.ngay).getTime() + phut(vao.gio) * 60000;
    const daLam = Math.max(0, (now.getTime() - msVao) / 3600000);
    const pct = Math.min(100, daLam / cfg.gioCa * 100);
    caHtml = `<div class="row"><span class="chip" style="padding:5px 12px">Đang trong ca làm</span><span class="sp small b">Ca ${dm(vao.ngay)} (${esc(vao.gio)}–${hm(phut(vao.gio) + cfg.gioCa * 60)})</span>
        <span class="green b num" id="tGio" style="white-space:nowrap">${num1(daLam)} / ${num1(cfg.gioCa)} giờ</span></div>
      <div class="bar" style="margin:12px 0 10px"><i id="tBar" style="width:${pct}%"></i></div>
      <div class="row small"><span class="row" style="gap:5px">${I('in', 's')} Đã vào: <b>${esc(vao.gio)}</b></span><span class="sp"></span><span class="row" style="gap:5px">${I('clock', 's')} Hết ca dự kiến: <b>${hm(phut(vao.gio) + cfg.gioCa * 60)}</b></span></div>`;
  } else if (vao && ra) {
    caHtml = `<div class="row"><span class="chip gray" style="padding:5px 12px">Đã kết thúc ca</span><span class="sp small b">Ca ngày ${dm(vao.ngay)}</span><span class="green b">${esc(vao.gio)} – ${esc(ra.gio)}</span></div>`;
  } else {
    caHtml = `<div class="row"><span class="chip gray" style="padding:5px 12px">Chưa vào ca</span><span class="sp small muted">Đến kho và bấm Xác nhận giờ vào để bắt đầu ca.</span></div>`;
  }
  const xn = trongCa ? `<div class="okbox"><div class="ck">${I('check')}</div><div class="sp"><div class="b" style="letter-spacing:.02em">ĐÃ XÁC NHẬN GIỜ VÀO</div>
      <div class="small muted">Lúc ${esc(vao.gio)} ngày ${dm(vao.ngay)} • Chấm công GPS</div></div><span class="chip line">Hợp lệ</span></div>` : '';
  const mode = trongCa ? 'OUT' : 'IN', dis = !v.ok || busy;
  return `<div class="card clockc"><div class="k"><span class="dot"></span>GIỜ CHUẨN HỆ THỐNG</div>
      <div class="clock" id="tClock">${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}</div>
      <div class="d">${I('cal', 's')}<span>${THU[now.getDay()]}, ${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}</span><span class="faint">•</span><span class="green b">Tuần ${isoWeek(now)}</span></div></div>
    <div class="card"><div class="row"><div class="tile">${I('nav')}</div><div class="sp"><div class="lbl" style="color:var(--muted)">Vị trí chấm công</div>
        <div class="row" style="gap:6px"><span class="b" style="font-size:17px" id="tKho">${esc(v.kho)}</span><span class="green">${I('badge', 's')}</span></div></div>
        <button class="locbtn" id="bLoc">${I('refresh', 's')} Định vị lại</button></div>
      <div class="radar ${v.cls}" id="radar"><div class="wh">${I('wh')}<span class="st"></span></div>
        <div class="sp"><div class="row" style="gap:8px;flex-wrap:wrap"><span class="chip ${v.chipCls}" id="tChip">${esc(v.chip)}</span><span class="small">Bán kính ${st.banKinh}m</span></div>
        <div class="small" style="margin-top:5px;color:var(--ink2)" id="tLine">${esc(v.line)}</div></div></div></div>
    <div class="card">${caHtml}</div>
    ${xn}
    <button class="cta ${mode === 'IN' ? 'in' : ''}" id="bCta" ${dis ? 'disabled' : ''}><span class="ic">${I(mode === 'IN' ? 'in' : 'out', 'l')}</span>
      <span class="sp"><span class="tt" style="display:block">XÁC NHẬN GIỜ ${mode === 'IN' ? 'VÀO' : 'RA'}</span><span class="ss">${busy ? 'Đang gửi…' : mode === 'IN' ? 'Chạm để bắt đầu ca làm hôm nay' : 'Chạm để kết thúc ca làm hôm nay'}</span></span>
      <span class="ic" style="width:42px;height:42px">${I('sigtap')}</span></button>
    <button class="alt" id="bAlt" ${dis ? 'disabled' : ''}>${mode === 'IN' ? 'Quên vào ca? Xác nhận giờ ra' : 'Bắt đầu ca mới? Xác nhận giờ vào'}</button>
    ${laQL() && soOtCho() ? `<button class="okbox" id="bGoQl" style="width:100%;border:0;text-align:left;background:var(--amber50)"><div class="ck" style="background:#fff;color:var(--amber)">${I('clockp')}</div><div class="sp"><div class="b">${soOtCho()} đơn tăng ca chờ xác nhận</div><div class="small muted">Chạm để mở mục Quản lý</div></div>${I('right', 's')}</button>` : ''}
    ${lichSuHtml()}
    <div class="row xs muted" style="padding:0 6px 10px">${I('lock', 's')}<span>Hệ thống xác thực vị trí GPS kho. Bán kính cho phép: ≤ ${st.banKinh} m, sai số GPS ≤ ${st.saiSo} m.${NATIVE ? ' Chặn vị trí giả lập.' : ''}</span></div>`;
}

function lichSuHtml() {
  const hn = todayIso(), tu = addDays(hn, -6);
  const ca = caTuQuet(me ? me.quet : null), nc = {};
  (me && me.ngayCong || []).forEach(r => { nc[r.ngay] = r; });
  const days = {};
  Object.values(ca).forEach(c => { if (c.ngay >= tu) days[c.ngay] = { c, r: nc[c.ngay] }; });
  Object.keys(nc).forEach(n => { if (n >= tu && n <= hn && !days[n]) days[n] = { c: null, r: nc[n] }; });
  // Lượt bị từ chối hôm nay
  const loiHomNay = (st.ganDay || []).filter(q => !q.hopLe && q.ngay === hn).length;
  const list = Object.keys(days).sort().reverse();
  const rows = list.map(n => {
    const { c, r } = days[n], homNay = n === hn;
    const vao = (c && c.vao) || (r && r.vao) || '', ra = (c && c.ra) || (r && r.ra) || '';
    const gio = c && c.msVao && c.msRa ? (c.msRa - c.msVao) / 3600000 : (phut(vao) >= 0 && phut(ra) >= 0 ? ((phut(ra) - phut(vao) + 1440) % 1440) / 60 : 0);
    const ot = r ? Number(r.tangCa) || 0 : 0, cong = r ? Number(r.cong) : null;
    let chip = '', icon = 'dcheck', right = '', sub2 = '';
    if (homNay && !ra) { icon = 'in'; chip = '<span class="chip gray">Ca 1</span>'; right = `<span class="v">Hợp lệ ${I('checkc', 's')}</span>`; }
    else {
      if (r) {
        if (ot > 0) { chip = '<span class="chip">Tăng ca OT</span>'; icon = 'clock'; sub2 = `+${num1(ot)}h OT`; }
        else if (cong === 0.5) { chip = '<span class="chip blue">Nửa công</span>'; icon = 'swap'; sub2 = '0.5 công'; }
        else if (cong >= 1) { chip = '<span class="chip">Đủ 1 công</span>'; sub2 = 'Chuẩn giờ'; }
        else { chip = `<span class="chip gray">${esc(r.trangThai)}</span>`; sub2 = num(cong) + ' công'; }
      } else { chip = '<span class="chip amber">Chờ duyệt</span>'; sub2 = ra ? 'Chờ Dashboard duyệt' : 'Thiếu giờ ra'; icon = ra ? 'dcheck' : 'info'; }
      right = `<div class="v">${gio ? num1(gio) + ' giờ' : '–'}</div><div class="w">${sub2}</div>`;
    }
    const ten = homNay ? 'Hôm nay' : thuD(n);
    const sub = homNay && !ra ? `Giờ vào: ${esc(vao)} • ${esc(st.diem[0] ? st.diem[0].kho : 'Kho')}` : `Vào ${esc(vao || '--:--')} • Ra ${esc(ra || '--:--')}`;
    return `<div class="li ${homNay ? 'hl' : ''}"><div class="tile ${homNay ? '' : 'lav'}" style="border-radius:50%">${I(icon)}</div>
      <div class="sp"><div class="row" style="gap:8px;flex-wrap:wrap"><span class="ti">${ten}, ${dm(n)}</span>${chip}</div><div class="su">${sub}</div></div>
      <div class="rt">${right}</div></div>`;
  }).join('');
  return `<div class="card"><div class="row" style="margin-bottom:4px"><span class="green">${I('hist')}</span><h3 class="t sp">Lịch sử 7 ngày gần đây</h3>
      <button class="lnk" id="bReload">Tải lại ${I('refresh', 's')}</button></div>
    ${rows || '<div class="muted small" style="padding:10px 0">Chưa có lượt chấm công trong 7 ngày.</div>'}
    ${loiHomNay ? `<div class="note" style="margin-top:8px">${I('info', 's')}<span>Hôm nay có ${loiHomNay} lượt chấm công không hợp lệ (ngoài vùng / GPS yếu). Không cần làm gì nếu sau đó đã chấm lại thành công.</span></div>` : ''}</div>`;
}

function bindScan() {
  const v = danhGiaViTri(), trongCa = !!(st.caMo && st.caMo.vao && !st.caMo.ra);
  $('bCta').onclick = () => xacNhan(trongCa ? 'OUT' : 'IN');
  $('bAlt').onclick = () => xacNhan(trongCa ? 'IN' : 'OUT');
  $('bReload').onclick = () => { taiTrangThai(true); taiMe(null); };
  if ($('bGoQl')) $('bGoQl').onclick = () => chonTab('ql');
  $('bLoc').onclick = () => {
    if (NATIVE && NATIVE.requestLocation) { try { NATIVE.requestLocation(); } catch (e) {} }
    else { best = null; startGps(true); }
    taiTrangThai(false); toast('Đang định vị lại…');
  };
  void v;
}

let lastOk = null;
function tick() {
  if (tab !== 'scan' || !$('tClock')) return;
  const now = vnNow();
  $('tClock').textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  capNhatGps();
}
function capNhatGps() {
  if (!$('radar')) return;
  const v = danhGiaViTri();
  $('radar').className = 'radar ' + v.cls;
  $('tChip').className = 'chip ' + v.chipCls; $('tChip').textContent = v.chip;
  $('tLine').textContent = v.line; $('tKho').textContent = v.kho;
  const dis = !v.ok || busy;
  $('bCta').disabled = dis; $('bAlt').disabled = dis;
  if (lastOk !== null && lastOk !== v.ok && v.ok && navigator.vibrate) navigator.vibrate(40);
  lastOk = v.ok;
  const vao = st.caMo && st.caMo.vao;
  if ($('tGio') && vao && me && me.cauHinh) {
    const msVao = parseIso(vao.ngay).getTime() + phut(vao.gio) * 60000, daLam = Math.max(0, (vnNow().getTime() - msVao) / 3600000);
    $('tGio').textContent = `${num1(daLam)} / ${num1(me.cauHinh.gioCa)} giờ`; $('tBar').style.width = Math.min(100, daLam / me.cauHinh.gioCa * 100) + '%';
  }
}

async function xacNhan(mode) {
  if (busy) return;
  const v = danhGiaViTri();
  if (!v.ok) return capNhatGps();
  const now = vnNow(), gio = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const loai = mode === 'IN' ? 'GIỜ VÀO' : 'GIỜ RA', trongCa = !!(st.caMo && st.caMo.vao && !st.caMo.ra);
  let them = '';
  if (mode === 'IN' && trongCa) them = '\n\nBạn đang trong ca (chưa xác nhận giờ ra). Chắc chắn muốn xác nhận GIỜ VÀO ca mới?';
  if (mode === 'OUT' && !trongCa) them = '\n\nChưa thấy giờ vào của ca này. Chắc chắn muốn xác nhận GIỜ RA?';
  if (!await dialog('Xác nhận ' + loai, `${loai} lúc ${gio}\nTại: ${v.kho} (cách ${v.kc} m)${them}`, 'Xác nhận', 'Hủy')) return;
  busy = true; render();
  try {
    const r = await api('scan', { mode, lat: v.l.lat, lng: v.l.lng, acc: Math.round(v.l.acc), mock: !!v.l.mock });
    busy = false;
    const vao = r.loai === 'IN', ten = vao ? 'GIỜ VÀO' : 'GIỜ RA';
    let msg = r.trungLap ? `Đã ghi nhận ${ten} lúc ${r.gio} trước đó (trong 5 phút). Không ghi thêm.`
      : `Đã ghi nhận ${ten} lúc ${r.gio}\nTại ${r.kho || ''}` + (!vao && r.gioVao ? `\nCa vào lúc ${r.gioVao}` : '');
    if (r.canhBao) msg += '\n\n⚠ ' + r.canhBao;
    if (navigator.vibrate) navigator.vibrate(120);
    render();
    dialog(r.canhBao ? 'Đã ghi nhận – có lưu ý' : 'Thành công', msg);
    taiTrangThai(false); taiMe(null);
  } catch (e) {
    busy = false;
    if (authFail(e)) return;
    render(); dialog('Chưa chấm công được', e.message); taiTrangThai(false);
  }
}

/* ======================= TAB BẢNG CÔNG ======================= */
function kySelHtml() {
  const ds = me.dsKy || [], i = ds.indexOf(me.ky), kh = kyTuDen(me.ky) || ['', ''];
  const truoc = i >= 0 && i + 1 < ds.length ? ds[i + 1] : '', sau = i > 0 ? ds[i - 1] : '';
  return `<div class="card kysel"><button id="kPrev" data-k="${esc(truoc)}" ${truoc ? '' : 'disabled'}>${I('left')}</button>
    <div class="m"><div class="a">${I('cal', 's')} ${dangTaiMe ? 'Đang tải…' : esc(kyNhan(me.ky))}${me.ky === me.kyHienTai ? ' <span class="chip">Hiện tại</span>' : ''}</div>
    <div class="small muted">${dmy(kh[0])} – ${dmy(kh[1])}</div></div>
    <button id="kNext" data-k="${esc(sau)}" ${sau ? '' : 'disabled'}>${I('right')}</button></div>`;
}

function bcData() {
  const l = (me.luong || [])[0] || null, cfg = me.cauHinh || { congChuan: 26 };
  const rows = me.ngayCong || [], kh = kyTuDen(me.ky), ca = caTuQuet(me.quet);
  let cong = 0, ot = 0, phep = 0, thieu = 0, cho = 0;
  rows.forEach(r => { cong += Number(r.cong) || 0; ot += Number(r.tangCa) || 0; });
  const byDay = {};
  rows.forEach(r => { byDay[r.ngay] = { r, c: ca[r.ngay] || null }; });
  Object.values(ca).forEach(c => { if (!byDay[c.ngay] && kh && c.ngay >= kh[0] && c.ngay <= kh[1]) { byDay[c.ngay] = { r: null, c }; cho++; } });
  Object.values(byDay).forEach(d => { const vao = (d.r && d.r.vao) || (d.c && d.c.vao), ra = (d.r && d.r.ra) || (d.c && d.c.ra); if (vao && !ra && d.c && d.c.ngay !== todayIso()) thieu++; });
  (me.nghi || []).forEach(n => { if ((n.trangThai === 'Đã gửi' || n.trangThai === 'Đã duyệt') && (n.loai === 'PHEP' || n.loai === 'NUA_NGAY' || n.loai === 'CHE_DO') && kh && n.den >= kh[0] && n.tu <= kh[1]) phep += n.soNgay || 0; });
  if (l) { cong = Number(l.ngayCong) || cong; ot = Number(l.gioTangCa) || ot; }
  const chot = me.ky < me.kyHienTai;
  return { l, cfg, cong, ot, phep, thieu, cho, byDay, chot, congChuan: cfg.congChuan || 26 };
}

function bcHtml() {
  const d = bcData(), l = d.l, pct = Math.min(100, Math.round(d.cong / d.congChuan * 100));
  const nDays = Object.keys(d.byDay).length;
  const hero = `<div class="hero"><div class="row"><span class="chip"><span class="dot"></span>${d.chot ? 'Đã chốt lương' : 'Tạm tính'}</span><span class="sp"></span><span class="small b">Kỳ lương ${esc(me.ky)}</span></div>
    <div class="k">THỰC NHẬN</div><div class="v">${l ? num(l.thucNhan, 0) : '0'}<small>đ</small></div>
    <div class="f"><span>Công thực tế: ${num(d.cong)} công${d.ot ? ' + ' + num(d.ot) + 'h tăng ca' : ''}</span><b>${esc(l ? l.hinhThuc : 'Nhân viên')}</b></div></div>`;
  const stats = `<div class="card"><div class="stats2">
      <div class="st w"><div class="k green">${I('checkc', 's')} Ngày công</div><div class="v green">${num(d.cong)} <small>/ ${d.congChuan} công</small></div><div class="s">${d.cho ? d.cho + ' ngày chờ duyệt' : 'Đã ghi nhận đủ'}</div></div>
      <div class="st w"><div class="k">${I('clockp', 's')} Tăng ca</div><div class="v">${num(d.ot)} <small>giờ</small></div><div class="s green">${l && l.tienTangCa ? money(l.tienTangCa) : '–'}</div></div></div>
    <div class="row small" style="margin:12px 0 6px"><span class="sp b">Tiến độ ngày công chuẩn</span><span class="green b">${pct}% (${num(d.cong)} / ${d.congChuan} công)</span></div>
    <div class="bar"><i style="width:${pct}%"></i></div></div>`;
  const seg = `<div class="seg"><button data-seg="phieu" class="${segBc === 'phieu' ? 'on' : ''}">${I('doc', 's')} Phiếu Lương</button>
    <button data-seg="cong" class="${segBc === 'cong' ? 'on' : ''}">${I('cal', 's')} Bảng Công <span class="chip">${nDays}</span></button>
    <button data-seg="sl" class="${segBc === 'sl' ? 'on' : ''}">${I('box', 's')} Sản lượng</button></div>`;
  const body = segBc === 'cong' ? bangCongHtml(d) : segBc === 'sl' ? sanLuongHtml() : phieuHtml(d);
  return kySelHtml() + hero + stats + seg + body;
}

// Tách "Phụ cấp công việc (1.000.000 đ/tháng × 9/26 công)" thành tên + dòng phụ.
function tachNhan(lbl, amount) {
  let t = String(lbl || ''), s = '';
  const m = /^(.*?)\s*\(([^)]*×[^)]*)\)\s*$/.exec(t);
  if (m) { t = m[1]; s = m[2]; }
  const z = !Number(amount);
  if (!s) {
    if (/^Lương ngày công/.test(t)) s = 'Đơn giá công tiêu chuẩn';
    else if (/^Lương sản lượng/.test(t)) s = z ? 'Không phát sinh sản lượng' : 'Theo sản lượng được chia';
    else if (/^Tiền công CPG/.test(t)) s = z ? 'Không phát sinh ca' : 'Theo phiếu Inbound / Outbound';
    else if (/^Phụ cấp \/ thưởng/.test(t)) s = 'Thưởng định mức kỳ';
    else if (/^Tăng ca/.test(t)) s = z ? 'Không phát sinh tăng ca' : 'Hệ số ngoài giờ làm việc';
    else if (/^Thu nhập khác/.test(t)) s = z ? 'Không có khoản phát sinh' : '';
  }
  return { t, s };
}

function phieuHtml(d) {
  const l = d.l;
  if (!l) return `<div class="card"><div class="muted">Chưa có bảng lương kỳ này. Bảng lương được cập nhật từ Dashboard khi quản lý mở trang.</div></div>`;
  const ct = me.chiTiet && Array.isArray(me.chiTiet.thu) ? me.chiTiet : null;
  const r = (lbl, a, cls) => { const x = tachNhan(lbl, a); return `<div class="r ${cls || ''}"><div class="l"><div>${esc(x.t)}</div>${x.s ? `<div class="s">${esc(x.s)}</div>` : ''}</div><div class="a">${moneyOr(a)}</div></div>`; };
  const thu = ct ? ct.thu : [['Lương ngày công (' + num(l.ngayCong) + ' công)', l.luongNgay], ['Lương sản lượng', l.tienKfm], ['Tiền công CPG (Inbound/Outbound)', l.tienCpg], ['Phụ cấp / thưởng cố định', l.phuCap], ['Tăng ca (' + num(l.gioTangCa) + ' giờ)', l.tienTangCa]];
  const tru = ct ? ct.tru : [['Thuế TNCN', l.thue], ['Tạm ứng', l.tamUng]];
  const tongTru = tru.reduce((s, x) => s + (Number(x[1]) || 0), 0);
  const kh = kyTuDen(me.ky), han = me.cauHinh ? addDays(kh[1], me.cauHinh.hanKhieuNaiNgay || 2) : '';
  return `<div class="card" id="phieu"><div class="row top"><span class="green" style="margin-top:2px">${I('doc')}</span>
      <div class="sp"><h2 class="t">Phiếu Lương ${esc(kyNhan(me.ky))}</h2><div class="small muted">${esc(store.get('fsc_app_name'))} • Mã NV: ${esc(store.get('fsc_app_code'))}${store.get('fsc_app_team') ? ' • ' + esc(store.get('fsc_app_team')) : ''}</div></div>
      <span class="chip">${esc(l.hinhThuc || '')}</span></div>
    <div class="tbl"><div class="hd"><span>Khoản thu</span><span>Số tiền</span></div>
      ${thu.map(x => r(x[0], x[1])).join('')}
      <div class="r sum"><div class="l">Tổng thu nhập</div><div class="a">${money(l.tongThuNhap)}</div></div>
      <div class="hd k"><span>Khoản khấu trừ</span><span>Số tiền</span></div>
      ${tru.map(x => r(x[0], x[1])).join('')}
      ${ct && ct.hoSoNld ? `<div class="r info"><div class="l"><div>NLĐ đóng BHXH (10,5%)</div><div class="s">Trừ chi phí hồ sơ công ty</div></div><div class="a">${money(ct.hoSoNld)}</div></div>` : ''}
      <div class="r" style="background:var(--lav)"><div class="l b">Tổng giảm trừ</div><div class="a">${tongTru ? '− ' + money(tongTru) : '-'}</div></div></div>
    <div class="net"><div><div class="k">THỰC NHẬN</div><div class="xs muted">Khoản chi trả thực tế</div></div><div class="v">${money(l.thucNhan)}</div></div>
    <div class="sign"><div>Người lập bảng<br><span class="xs">(Ký điện tử đã duyệt)</span><br>${I('shield')}</div><div>Người nhận tiền<br><span class="xs">${esc(store.get('fsc_app_name'))}</span><br>${I('checkc')}</div></div>
    ${l.chotLuc ? `<div class="xs muted" style="margin-top:10px;text-align:center">Chốt lúc ${esc(l.chotLuc)}${d.chot ? '' : ' · Kỳ đang chạy: số tạm tính, sẽ thay đổi đến cuối kỳ'}</div>` : ''}
    <div class="noprint"><button class="btn pri" id="bPrint">${I('print')} In phiếu lương</button>
    <button class="btn soft" data-fb="LUONG">${I('help', 's')} Khiếu nại / Thắc mắc phiếu lương</button></div></div>
    ${ct && (ct.hoSo || []).length ? hoSoHtml(ct) : ''}
    <div class="card row noprint" style="background:var(--lav2)"><div class="tile" style="border-radius:12px">${I('calpen')}</div><div class="sp small"><div class="b"><i>Chính sách chốt công kỳ ${esc(me.ky.slice(5))}</i></div>
      <div class="muted">Hạn khiếu nại chấm công cuối cùng là ${dmy(han)}.</div></div></div>`;
}

function hoSoHtml(ct) {
  return `<div class="card"><div class="row"><span class="green">${I('calc')}</span><h3 class="t sp">Lương & Phụ cấp theo hồ sơ</h3><span class="chip blue">Hồ sơ C&B</span></div>
    <div class="small muted" style="margin:2px 0 10px">Chi phí nhân công cố định mức theo tháng</div>
    <div class="note mint" style="margin-bottom:8px">${I('info', 's')}<span>Tham khảo định mức hợp đồng lao động, <b>không cộng dồn</b> trực tiếp vào Thực nhận của kỳ này.</span></div>
    <div class="tbl">${ct.hoSo.map(x => `<div class="r" style="background:none;padding:7px 2px;margin:0;border-bottom:1px solid #F1F3F7"><div class="l">${esc(x[0])}</div><div class="a ${/BHXH|công đoàn/.test(x[0]) ? 'green' : ''}">${money(x[1])}</div></div>`).join('')}
      ${ct.hoSoNld ? `<div class="r" style="background:none;padding:7px 2px;margin:0"><div class="l">NLĐ đóng BHXH (10,5%)</div><div class="a red">${money(ct.hoSoNld)}</div></div>` : ''}
      <div class="r" style="margin-top:8px"><div class="l small">Cộng chi phí nhân công:</div><div class="a">${money(ct.hoSoTong)}</div></div>
      <div class="r sum"><div class="l">Tổng chi phí cho 1 NV / tháng:</div><div class="a" style="font-size:19px">${money(ct.hoSoNet)}</div></div></div></div>`;
}

function bangCongHtml(d) {
  const pct = Math.min(100, Math.round(d.cong / d.congChuan * 100)), phep = me.phep;
  const days = Object.keys(d.byDay).sort();
  const items = days.map(n => {
    const { r, c } = d.byDay[n], sun = parseIso(n).getDay() === 0;
    const vao = (r && r.vao) || (c && c.vao) || '', ra = (r && r.ra) || (c && c.ra) || '';
    const ot = r ? Number(r.tangCa) || 0 : 0, cong = r ? Number(r.cong) : null;
    const ok = r ? `<span class="chip">${esc(r.trangThai || 'Hợp lệ')}</span>` : '<span class="chip amber">Chờ duyệt</span>';
    return `<div class="dayc ${sun ? 'sun' : ''} ${r ? '' : 'pend'}"><div class="row"><div class="dblk ${sun ? 'sun' : ''}"><span class="w">${thuN(n)}</span><span class="n">${n.slice(8)}</span></div>
      <div class="sp"><div class="row" style="gap:8px"><b>${dmy(n)}</b><span class="chip ${sun ? 'dark' : 'line'}">${sun ? 'Ca Chủ Nhật' : 'Ca 1'}</span></div>
      <div class="small muted">${sun ? 'Làm thêm ngày nghỉ tuần' : 'Ca làm việc trong ngày'}</div></div>
      <div class="rt" style="text-align:right"><div class="b green">${cong == null ? '–' : num1(cong) + ' công'}</div>${ok}</div></div>
      <div class="tm"><span>${I('in', 's')} ${esc(vao || '--:--')}</span><span>${I('out', 's')} ${esc(ra || '--:--')}</span>
      ${ot ? `<span class="ot chip line">${I('clock', 's')} OT: ${num1(ot)}h</span>` : ''}</div></div>`;
  }).reverse().join('');
  const ct = me.chiTiet && Array.isArray(me.chiTiet.hoSo) ? me.chiTiet : null;
  return `<div class="card"><div class="stats2"><div><div class="lbl" style="font-size:11.5px">Tiến độ kỳ công</div><div style="font-size:20px" class="b">${num(d.cong)} <span class="small muted">/ ${d.congChuan} ngày chuẩn</span></div></div>
      <div style="text-align:right"><div class="lbl" style="font-size:11.5px">Tăng ca OT (lũy kế)</div><div style="font-size:20px" class="b green">${num(d.ot)}h ${d.l && d.l.tienTangCa ? `<span class="chip">${money(d.l.tienTangCa)}</span>` : ''}</div></div></div>
      <div class="bar" style="margin:10px 0 8px"><i style="width:${pct}%"></i></div>
      <div class="row small"><span class="sp muted">Đạt ${pct}% chu kỳ công</span><span class="${d.chot ? 'green' : 'muted'}">${I('lock', 's')} ${d.chot ? 'Dữ liệu đã khóa' : 'Đang cập nhật'}</span></div></div>
    <div class="stats2" style="margin-bottom:14px">
      <div class="st w"><div class="k">Công tiêu chuẩn</div><div class="v" style="font-size:22px">${num1(d.cong)} <small>ngày</small></div><div class="s green">${d.cho ? d.cho + ' ngày chờ duyệt' : 'Đã ghi nhận đủ'}</div></div>
      <div class="st w"><div class="k">Tăng ca (OT)</div><div class="v" style="font-size:22px">${num1(d.ot)} <small>giờ tích lũy</small></div><div class="s">Theo bảng chấm công</div></div>
      <div class="st w"><div class="k">Nghỉ phép</div><div class="v" style="font-size:22px">${num1(d.phep)} <small>ngày phép</small></div><div class="s">Dư phép năm: ${phep ? num(phep.conLai) : '–'} ngày</div></div>
      <div class="st w"><div class="k">Thiếu chấm công</div><div class="v" style="font-size:22px">${d.thieu} <small>ngày</small></div><div class="s ${d.thieu ? 'red' : 'green'}">${d.thieu ? 'Thiếu giờ ra – báo quản lý' : 'Chuyên cần tối đa'}</div></div></div>
    ${d.chot ? `<div class="lock"><div class="tile">${I('shield')}</div><div class="sp"><div class="b">Kỳ công đã chốt duyệt</div><div class="small muted">Dữ liệu chấm công GPS đã khóa, đối soát với phòng C&B</div></div><span class="chip dark">ĐÃ KHÓA</span></div>`
      : `<div class="lock" style="background:var(--g50)"><div class="tile" style="background:var(--g700)">${I('trend')}</div><div class="sp"><div class="b">Kỳ công đang mở</div><div class="small muted">Ngày công cập nhật khi quản lý duyệt trên Dashboard</div></div></div>`}
    <div class="row" style="margin:0 4px 10px"><h3 class="t sp">Nhật ký ${days.length} ca làm việc</h3><span class="xs muted">${days.length - d.cho} ca đã duyệt</span></div>
    ${items || '<div class="card muted">Chưa có ngày công trong kỳ này.</div>'}
    ${ct ? hoSoHtml(ct) : ''}
    <button class="btn dark" data-fb="CONG">${I('help')} Khiếu nại giờ công / giờ tăng ca</button>
    <div class="row xs muted" style="justify-content:center;margin-top:10px">${I('checkc', 's')} Chốt công kỳ ${esc(me.ky.slice(5))} • Hạn khiếu nại chấm công đến ${dmy(addDays(kyTuDen(me.ky)[1], (me.cauHinh || {}).hanKhieuNaiNgay || 2))}</div>`;
}

function sanLuongHtml() {
  const rows = me.sanLuong || [], by = {};
  let slKfm = 0, tien = 0;
  rows.forEach(r => { if (r.nguon === 'KFM') slKfm += Number(r.soLuong) || 0; tien += Number(r.thanhTien) || 0; (by[r.ngay] = by[r.ngay] || []).push(r); });
  const days = Object.keys(by).sort().reverse();
  return `<div class="card"><div class="stats2"><div class="st"><div class="k">Sản lượng KFM</div><div class="v" style="font-size:24px">${num(slKfm, 0)}</div><div class="s">Đơn vị theo file chia hàng</div></div>
      <div class="st mint"><div class="k">Tiền sản lượng</div><div class="v" style="font-size:20px">${money(tien)}</div><div class="s">KFM + CPG</div></div></div></div>
    ${days.length ? days.map(n => {
      const it = by[n], t = it.reduce((s, r) => s + (Number(r.thanhTien) || 0), 0);
      return `<div class="dayc"><div class="row"><div class="dblk"><span class="w">${thuN(n)}</span><span class="n">${n.slice(8)}</span></div><div class="sp b">${dmy(n)}</div><div class="b green">${money(t)}</div></div>
        <div class="tm" style="display:block">${it.map(r => `<div style="padding:2px 0"><span class="chip ${r.nguon === 'CPG' ? 'blue' : ''}">${esc(r.nguon)}</span> ${esc(r.congViec)} · ${num(r.soLuong, 2)} ${esc(r.dvt)} × ${num(r.donGia, 2)} đ</div>`).join('')}</div></div>`;
    }).join('') : '<div class="card muted">Chưa có sản lượng trong kỳ này.</div>'}`;
}

function bindBc() {
  ['kPrev', 'kNext'].forEach(id => { const b = $(id); if (b && b.dataset.k) b.onclick = () => taiMe(b.dataset.k); });
  document.querySelectorAll('[data-seg]').forEach(b => b.onclick = () => { segBc = b.dataset.seg; render(); });
  document.querySelectorAll('[data-fb]').forEach(b => b.onclick = () => khieuNai(b.dataset.fb));
  if ($('bPrint')) $('bPrint').onclick = () => {
    if (NATIVE && NATIVE.print) { try { NATIVE.print('Phieu luong ' + me.ky + ' ' + store.get('fsc_app_code')); return; } catch (e) {} }
    window.print();
  };
}

function khieuNai(loai) {
  const ten = { LUONG: 'phiếu lương', CONG: 'giờ công / giờ tăng ca', OT: 'giờ tăng ca', KHAC: '' }[loai] || '';
  sheet(`<h3 class="t">Khiếu nại / thắc mắc ${esc(ten)}</h3><p class="small">Kỳ ${esc(me ? me.ky : '')}. Ghi rõ ngày, số công / số giờ / số tiền bị sai. Quản lý sẽ trả lời trong mục Cá nhân.</p>
    <div class="fld"><textarea id="fbNote" rows="4" maxlength="1000" placeholder="Ví dụ: Ngày 03/11 em làm đủ ca nhưng bảng công chưa ghi nhận…"></textarea></div>
    <div class="err" id="fbErr"></div><div class="acts"><button id="fbNo">Đóng</button><button class="pri" id="fbOk">Gửi</button></div>`, () => {
    $('fbNo').onclick = closeSheet;
    $('fbOk').onclick = async () => {
      const note = $('fbNote').value.trim();
      if (note.length < 5) { $('fbErr').textContent = 'Nhập nội dung khiếu nại.'; return; }
      $('fbOk').disabled = true;
      try { const r = await api('feedback', { type: loai, note, ky: me ? me.ky : '' }); if (me) me.phanHoi = r.phanHoi; closeSheet(); toast('Đã gửi khiếu nại. Quản lý sẽ phản hồi.'); }
      catch (e) { if (authFail(e)) return; $('fbOk').disabled = false; $('fbErr').textContent = e.message; }
    };
  });
}

/* ======================= TAB NGHỈ PHÉP ======================= */
const LOAI_NGHI = [
  ['PHEP', 'Nghỉ phép năm', q => q ? `Còn ${num(q.conLai)} ngày` : 'Trừ quỹ phép'], ['NUA_NGAY', 'Nghỉ nửa ngày', () => 'Tính 0.5 công'],
  ['OM', 'Nghỉ ốm BHXH', () => 'Cần giấy C65'], ['KHONG_LUONG', 'Nghỉ không lương', () => 'Trừ ngày công'],
  ['CHE_DO', 'Nghỉ chế độ (Kết hôn, việc hiếu/hỷ, thai sản…)', () => '']
];
const TRANG_THAI_NGHI = { 'Đã gửi': ['Đã ghi nhận', ''], 'Đã duyệt': ['Đã duyệt', ''], 'Từ chối': ['Từ chối', 'red'], 'Đã hủy': ['Đã hủy', 'gray'] };

function soNgayDon() {
  if (!fNghi.from || !fNghi.to || fNghi.to < fNghi.from) return 0;
  if (fNghi.part !== 'FULL') return 0.5;
  return Math.round((parseIso(fNghi.to) - parseIso(fNghi.from)) / 86400000) + 1;
}

function nghiHtml() {
  const q = me.phep, hn = todayIso();
  if (!fNghi.from) { fNghi.from = hn; fNghi.to = hn; }
  if (fNghi.type === 'NUA_NGAY' && fNghi.part === 'FULL') fNghi.part = 'AM';
  const mot = fNghi.from === fNghi.to, nuaDuoc = mot && (fNghi.type === 'PHEP' || fNghi.type === 'NUA_NGAY');
  if (!nuaDuoc) fNghi.part = 'FULL';
  const pct = q && q.tong ? Math.min(100, Math.round(q.daDung / q.tong * 100)) : 0;
  const quy = q ? `<div class="card"><div class="row"><span class="green">${I('plane')}</span><h2 class="t sp">Quỹ ngày phép ${q.nam}</h2><span class="chip">${I('shield', 's')} Chuẩn nhân sự</span></div>
      <div class="stats3" style="margin-top:12px">
        <div class="st"><div class="k" style="text-transform:none;letter-spacing:0">Tổng quỹ phép</div><div class="v">${num(q.tong)} <small>ngày</small></div><div class="s">${num(q.chuan)} chuẩn${q.thamNien ? ' + ' + num(q.thamNien) + ' thâm niên' : ''}${q.tonConDung ? ' + ' + num(q.tonConDung) + ' tồn' : ''}</div></div>
        <div class="st"><div class="k" style="text-transform:none;letter-spacing:0">Đã dùng</div><div class="v">${num(q.daDung)} <small>ngày</small></div><div class="s">Đã ghi nhận trong năm</div></div>
        <div class="st dark"><div class="k" style="text-transform:none;letter-spacing:0">Khả dụng</div><div class="v">${num(q.conLai)} <small>ngày</small></div><div class="s">Sẵn sàng nghỉ</div></div></div>
      <div class="bar" style="margin:14px 0 8px;background:#C9D0CC"><i style="width:${100 - pct}%;margin-left:${pct}%;background:var(--g700)"></i></div>
      <div class="row xs"><span class="sp muted">● Đã trừ ${pct}%</span><span class="green">${I('clock', 's')} Hạn dùng phép tồn: ${dmy(q.hanTon.replace(/^\d{4}/, String(q.nam + 1)))}</span></div>
      ${q.ngayVao && q.ngayVao.slice(0, 4) === String(q.nam) ? `<div class="xs muted" style="margin-top:6px">Vào làm ${dmy(q.ngayVao)}: phép năm tính theo số tháng làm việc trong năm.</div>` : ''}</div>` : '';
  const curLoai = LOAI_NGHI.find(x => x[0] === fNghi.type) || LOAI_NGHI[0];
  const form = `<div class="card"><div class="row"><div class="tile" style="border-radius:50%">${I('calpen')}</div><div class="sp"><h2 class="t">Tạo đơn nghỉ phép</h2><div class="small muted">Điền thông tin gửi quản lý</div></div></div>
    <div class="fl" style="margin-top:16px"><span class="lbl">Loại ngày nghỉ</span><span class="green small b">${esc(curLoai[1].replace(/ \(.*/, ''))}</span></div>
    <div class="opts">${LOAI_NGHI.map(x => x[0] === 'CHE_DO'
      ? `<button class="opt full ${fNghi.type === x[0] ? 'on' : ''}" data-nt="${x[0]}"><span class="muted">${I('fam')}</span><span class="a sp">${esc(x[1])}</span></button>`
      : `<button class="opt ${fNghi.type === x[0] ? 'on' : ''}" data-nt="${x[0]}"><div class="a">${esc(x[1])}</div><div class="b2">${esc(x[2](q))}</div>${fNghi.type === x[0] ? `<span class="green" style="position:absolute;right:10px;top:14px">${I('checkc')}</span>` : ''}</button>`).join('')}</div>
    <div class="fl" style="margin-top:16px"><span class="lbl">Khoảng thời gian nghỉ</span>${soNgayDon() ? `<span class="chip">${num1(soNgayDon())} ngày</span>` : ''}</div>
    <div class="grid2"><label class="fld"><div class="k">Từ ngày</div><input type="date" id="nFrom" value="${fNghi.from}" min="${addDays(hn, -7)}" max="${addDays(hn, 60)}"></label>
      <label class="fld"><div class="k">Đến hết ngày</div><input type="date" id="nTo" value="${fNghi.to}" min="${fNghi.from}" max="${addDays(hn, 60)}"></label></div>
    <div class="seg sm" style="margin:10px 0 0"><button data-np="FULL" class="${fNghi.part === 'FULL' ? 'on' : ''}" ${fNghi.type === 'NUA_NGAY' ? 'disabled' : ''}>Cả ngày (1.0)</button>
      <button data-np="AM" class="${fNghi.part === 'AM' ? 'on' : ''}" ${nuaDuoc ? '' : 'disabled'}>Buổi sáng (0.5)</button><button data-np="PM" class="${fNghi.part === 'PM' ? 'on' : ''}" ${nuaDuoc ? '' : 'disabled'}>Buổi chiều (0.5)</button></div>
    <div class="fl" style="margin-top:16px"><span class="lbl">Lý do nghỉ phép</span></div>
    <div class="fld"><textarea id="nNote" rows="3" maxlength="200" placeholder="Ví dụ: Về quê gia đình có việc, khám sức khỏe định kỳ...">${esc(fNghi.note)}</textarea></div>
    <div class="err" id="nErr"></div>
    <button class="btn dark" id="bNghi">${I('send')} GỬI ĐƠN NGHỈ PHÉP</button>
    <div class="note" style="margin-top:12px">${I('info', 's')}<span>Gửi đơn trước <b>7 đến 60 ngày</b>. Đơn tự cập nhật vào bảng chấm công trên Dashboard. Gửi lại cùng ngày sẽ thay đơn cũ. Hủy được khi ngày nghỉ chưa qua.</span></div></div>`;
  const ds = me.nghi || [];
  const list = ds.length ? `<div class="card"><div class="row"><span class="green">${I('hist')}</span><h2 class="t sp">Đơn nghỉ của bạn</h2><span class="small b">${Math.min(ds.length, 30)} đơn gần nhất</span></div>
    <div style="margin-top:12px">${ds.map(n => {
      const tt = TRANG_THAI_NGHI[n.trangThai] || [n.trangThai, 'gray'], conHL = n.trangThai === 'Đã gửi' || n.trangThai === 'Đã duyệt';
      const ngay = n.tu === n.den ? `${thuN(n.tu)}, ${dmy(n.tu)}` : `${dm(n.tu)} – ${dmy(n.den)}`;
      const loaiChip = n.loai === 'KHONG_LUONG' ? '<span class="chip gray">Không lương</span>' : `<span class="chip">${num1(n.soNgay || (n.loai === 'NUA_NGAY' ? 0.5 : 1))} ngày</span>`;
      return `<div class="req"><div class="row"><b>${ngay}</b>${loaiChip}<span class="sp"></span><span class="chip ${tt[1]}"><span class="dot"></span>${esc(tt[0])}</span></div>
        <div class="row" style="margin-top:4px"><span class="sp small" style="color:var(--ink2)">${esc(n.loaiTen)}${n.buoi && n.buoi !== 'Cả ngày' ? ' (' + esc(n.buoi) + ')' : ''}${n.lyDo ? ' · ' + esc(n.lyDo) : ''}</span>
          ${conHL && n.den >= hn ? `<button class="lnk red" data-cancel="${esc(n.id)}" data-ten="${esc(n.loaiTen + ' ' + ngay)}">Hủy đơn</button>` : ''}</div>
        <div class="ft"><span>${n.trangThai === 'Đã gửi' ? 'Đã đồng bộ chấm công: ' + esc(store.get('fsc_app_code')) : 'Mã đơn: ' + esc(n.id)}</span><span class="green">${n.guiLuc ? 'Gửi lúc: ' + esc(n.guiLuc) : ''}</span></div></div>`;
    }).join('')}</div></div>` : '';
  return canhBaoMayChu() + quy + form + list;
}

// Máy chủ chưa lên bản 10/11 (chưa có quỹ phép / tăng ca): báo rõ thay vì lỗi khó hiểu.
function canhBaoMayChu() {
  return me && !me.cauHinh ? `<div class="note" style="background:var(--amber50);color:var(--amber);margin-bottom:14px">${I('info', 's')}<span>Máy chủ chưa cập nhật bản mới: quỹ phép, nghỉ nhiều ngày / nửa ngày, đăng ký tăng ca, khiếu nại chưa dùng được. Báo quản lý triển khai phiên bản mới.</span></div>` : '';
}

function bindNghi() {
  const luu = () => { fNghi.note = $('nNote').value; };
  document.querySelectorAll('[data-nt]').forEach(b => b.onclick = () => { luu(); fNghi.type = b.dataset.nt; fNghi.part = fNghi.type === 'NUA_NGAY' ? 'AM' : 'FULL'; if (fNghi.type === 'NUA_NGAY') fNghi.to = fNghi.from; render(); });
  document.querySelectorAll('[data-np]').forEach(b => b.onclick = () => { luu(); fNghi.part = b.dataset.np; render(); });
  $('nFrom').onchange = () => { luu(); fNghi.from = $('nFrom').value; if (!fNghi.to || fNghi.to < fNghi.from || fNghi.type === 'NUA_NGAY') fNghi.to = fNghi.from; render(); };
  $('nTo').onchange = () => { luu(); fNghi.to = $('nTo').value; render(); };
  $('bNghi').onclick = async () => {
    luu();
    if (!fNghi.from || !fNghi.to) { $('nErr').textContent = 'Chọn ngày nghỉ.'; return; }
    if (fNghi.to < fNghi.from) { $('nErr').textContent = 'Ngày kết thúc phải sau ngày bắt đầu.'; return; }
    const ten = (LOAI_NGHI.find(x => x[0] === fNghi.type) || [])[1] || '', n = soNgayDon();
    if (!await dialog('Gửi đơn nghỉ', `${ten}\n${fNghi.from === fNghi.to ? dmy(fNghi.from) : dmy(fNghi.from) + ' – ' + dmy(fNghi.to)}${fNghi.part !== 'FULL' ? ' (' + (fNghi.part === 'AM' ? 'buổi sáng' : 'buổi chiều') + ')' : ''} · ${num1(n)} ngày`, 'Gửi đơn', 'Hủy')) return;
    const b = $('bNghi'); b.disabled = true; b.textContent = 'Đang gửi…';
    try {
      const r = await api('leave', { type: fNghi.type, date: fNghi.from, from: fNghi.from, to: fNghi.to, part: fNghi.part, note: fNghi.note.trim() });
      me.nghi = r.nghi; if (r.phep) me.phep = r.phep;
      fNghi.note = ''; render(); toast('Đã gửi đơn nghỉ.');
    } catch (e) { if (authFail(e)) return; b.disabled = false; b.innerHTML = I('send') + ' GỬI ĐƠN NGHỈ PHÉP'; $('nErr').textContent = e.message; }
  };
  document.querySelectorAll('[data-cancel]').forEach(b => b.onclick = async () => {
    if (!await dialog('', 'Hủy đơn ' + b.dataset.ten + '?\nCác ngày chưa qua của đơn sẽ được hủy.', 'Hủy đơn', 'Không')) return;
    b.disabled = true;
    try { const r = await api('cancelLeave', { id: b.dataset.cancel }); me.nghi = r.nghi; if (r.phep) me.phep = r.phep; render(); toast('Đã hủy đơn nghỉ.'); }
    catch (e) { if (authFail(e)) return; b.disabled = false; dialog('', e.message); }
  });
}

/* ======================= TAB TĂNG CA ======================= */
const LOAI_OT = [['THUONG', 'Ngày thường', '150% lương ca', 1.5], ['NGHI_TUAN', 'Nghỉ tuần (CN)', '200% lương ca', 2], ['LE', 'Ngày Lễ / Tết', '300% lương ca', 3], ['DEM', 'Phụ cấp Ca đêm', '+30% định ngạch', 1.3]];
const LY_DO_OT = ['Xuất kho gấp', 'Kiểm kê tồn kho', 'Hàng hoàn trả', 'Bốc xếp container', 'Khác'];
const TT_OT = { 'Chờ duyệt': ['Chờ duyệt', 'line'], 'Đã duyệt': ['Đã duyệt', ''], 'Từ chối': ['Từ chối', 'red'], 'Đã hủy': ['Đã hủy', 'gray'], 'Đã chốt công': ['Đã chốt công', 'dark'] };

function otGio() { const a = phut(fOt.from), b = phut(fOt.to); if (a < 0 || b < 0) return 0; const m = b > a ? b - a : b + 1440 - a; return Math.round(m / 60 * 100) / 100; }

// Giờ chấm công của 1 ngày (để gợi ý giờ tăng ca): từ lượt chấm công + bảng công.
function chamCongNgay(ngay) {
  const c = caTuQuet(me ? me.quet : null)[ngay] || null, r = (me && me.ngayCong || []).find(x => x.ngay === ngay) || null;
  const vao = (c && c.vao) || (r && r.vao) || '', ra = (c && c.ra) || (r && r.ra) || '';
  return { vao, ra, coMat: !!(c && c.vao && !c.ra && ngay === todayIso()) };
}

// Gợi ý giờ: từ = hết ca chuẩn (giờ vào + số giờ ca), đến = giờ ra (hoặc bây giờ nếu còn trong ca).
function goiYGioOt() {
  if (fOt.touched) return;
  const cc = chamCongNgay(fOt.date), gioCa = (me && me.cauHinh && me.cauHinh.gioCa) || 8;
  if (!cc.vao) return;
  const tu = phut(cc.vao) + gioCa * 60;
  let den = cc.ra ? phut(cc.ra) : -1;
  if (den < 0 && fOt.date === todayIso()) { const n = vnNow(); den = Math.floor((n.getHours() * 60 + n.getMinutes()) / 15) * 15; }
  if (den < 0) return;
  fOt.from = hm(tu);
  fOt.to = hm(den);
}

function otHtml() {
  const q = me.quyOt || { gioKy: 0, hanThang: 40, gioNam: 0, hanNam: 200, nguoiDuyet: 'Quản lý kho', ky: me.kyHienTai || '' };
  const hn = todayIso();
  if (!fOt.date) { fOt.date = hn; if (parseIso(hn).getDay() === 0) fOt.type = 'NGHI_TUAN'; }
  goiYGioOt();
  const pT = Math.min(100, Math.round(q.gioKy / q.hanThang * 100)), pN = Math.min(100, Math.round(q.gioNam / q.hanNam * 100));
  const l = me.ky === me.kyHienTai ? (me.luong || [])[0] : null;
  const loai = LOAI_OT.find(x => x[0] === fOt.type) || LOAI_OT[0], gio = otGio(), cc = chamCongNgay(fOt.date);
  const raPhut = phut(cc.ra), denPhut = phut(fOt.to);
  const lech = cc.ra && denPhut >= 0 && raPhut >= 0 && ((denPhut - raPhut + 1440) % 1440) > 30 && ((denPhut - raPhut + 1440) % 1440) < 720;
  const quy = `<div class="card"><div class="row"><span class="green">${I('trend')}</span><h2 class="t sp">Quỹ Giờ Làm Thêm (OT)</h2><span class="chip">Kỳ T${esc(String(q.ky).slice(5))}/${esc(String(q.ky).slice(0, 4))}</span></div>
    <div class="stats3" style="margin-top:12px">
      <div class="st"><div class="k" style="text-transform:none;letter-spacing:0;font-weight:500">Đã tăng ca kỳ này</div><div class="v" style="font-size:22px">${num(q.gioKy)} <small>/${q.hanThang}h</small></div>
        <div class="bar thin" style="margin:6px 0 4px"><i style="width:${pT}%"></i></div><div class="s green">${pT}% định mức</div></div>
      <div class="st"><div class="k" style="text-transform:none;letter-spacing:0;font-weight:500">Hạn mức năm</div><div class="v" style="font-size:22px">${num(q.gioNam)} <small>/${q.hanNam}h</small></div>
        <div class="bar thin" style="margin:6px 0 4px"><i style="width:${pN}%"></i></div><div class="s">● ${pN < 80 ? 'An toàn' : 'Gần hạn mức'} (${pN}%)</div></div>
      <div class="st mint"><div class="k" style="text-transform:none;letter-spacing:0;font-weight:500">Tạm tính lương</div><div class="v" style="font-size:22px">${l && l.tienTangCa ? kShort(l.tienTangCa) : '0'}</div><div class="s">Hệ số x1.5–3.0</div><div class="s">${I('doc', 's')} Theo phiếu lương</div></div></div>
    <div class="note" style="margin-top:10px">${I('shield', 's')}<span class="sp">Quy chế Kho Vận: Tối đa ${q.hanThang}h/tháng & ${q.hanNam}h/năm${q.choDuyet ? ` · ${num(q.choDuyet)}h đang chờ quản lý xác nhận` : ''}</span></div></div>`;
  const form = `<div class="row" style="margin:6px 2px 4px"><div class="tile dark" style="border-radius:10px;width:34px;height:34px">${I('clockp', 's')}</div><h2 class="t">Tạo Đơn Tăng Ca</h2></div>
    <div class="small muted" style="margin:0 4px 10px">Tạo đơn khi hôm nay có làm thêm giờ. Quản lý nhận đơn và xác nhận.</div>
    <div class="card"><div class="fl" style="margin-top:0"><span>Loại ca làm thêm <span class="rq">*</span></span><span class="small muted">Hệ số tính lương</span></div>
      <div class="opts">${LOAI_OT.map(x => `<button class="opt ${fOt.type === x[0] ? 'on' : ''}" data-ot="${x[0]}"><div class="a">${x[1]}</div><div class="b2">${x[2]}</div><span class="ck"></span></button>`).join('')}</div>
      <div class="fl"><span>Ngày tăng ca <span class="rq">*</span></span></div>
      <label class="fld row" style="padding:10px 12px">${I('cal')}<input type="date" id="oDate" value="${fOt.date}" min="${addDays(hn, -3)}" max="${hn}" style="flex:1">${fOt.date === hn ? '<span class="chip">Hôm nay</span>' : ''}</label>
      <div class="sum" style="margin-top:8px">${I('finger', 's')}<span class="sp">Chấm công ngày ${dm(fOt.date)}: ${cc.vao ? `vào <b>${esc(cc.vao)}</b>` : '<span class="muted">chưa có giờ vào</span>'}${cc.ra ? ` – ra <b>${esc(cc.ra)}</b>` : cc.coMat ? ' – <span class="green">đang trong ca</span>' : cc.vao ? ' – <span class="muted">chưa có giờ ra</span>' : ''}</span></div>
      <div class="fl"><span>Thời gian tăng ca <span class="rq">*</span></span>${cc.vao && !fOt.touched ? '<span class="xs muted">Đã gợi ý theo giờ chấm công</span>' : ''}</div>
      <div class="grid2"><label class="fld"><div class="k">Từ giờ (Bắt đầu)</div><input type="time" id="oFrom" value="${fOt.from}"></label>
        <label class="fld"><div class="k">Đến giờ (Kết thúc)</div><input type="time" id="oTo" value="${fOt.to}"></label></div>
      <div class="sum">${I('calc', 's')}<span class="sp">Tổng giờ OT: <b class="green">${num1(gio)} giờ</b>${phut(fOt.to) <= phut(fOt.from) && gio ? ' <span class="xs muted">(qua nửa đêm)</span>' : ''}</span>
        <span class="chip" style="background:#86D9B0;color:var(--g900)">Quy đổi: ${num1(gio * loai[3])} giờ chuẩn</span></div>
      ${lech ? `<div class="note" style="background:var(--amber50);color:var(--amber);margin-top:8px">${I('info', 's')}<span>Giờ kết thúc tăng ca muộn hơn giờ ra chấm công (${esc(cc.ra)}). Quản lý sẽ đối chiếu khi xác nhận.</span></div>` : ''}
      <div class="fl"><span>Lý do tăng ca <span class="rq">*</span></span></div>
      <div class="pills">${LY_DO_OT.map(x => `<button data-rs="${x}" class="${fOt.reason === x ? 'on' : ''}">${x}</button>`).join('')}</div>
      ${fOt.reason === 'Khác' ? `<div class="fld" style="margin-top:8px"><input id="oReason" maxlength="120" placeholder="Nhập lý do" value="${esc(fOt.reasonText || '')}" style="font-size:16px;font-weight:500"></div>` : ''}
      <div class="fl"><span>Công việc đã làm <span class="rq">*</span></span></div>
      <div class="fld"><textarea id="oWork" rows="3" maxlength="500" placeholder="Ví dụ: Đóng gói và bốc dỡ 2 container hàng đông cho đơn SCF, kiểm đếm 120 thùng...">${esc(fOt.work || '')}</textarea></div>
      <div class="fl"><span>Người xác nhận</span></div>
      <div class="li hl" style="margin:0"><div class="ava" style="width:40px;height:40px;font-weight:700">${esc(initials(q.nguoiDuyet).toUpperCase() || 'QL')}</div>
        <div class="sp"><div class="b row" style="gap:6px">${esc(q.nguoiDuyet)} <span class="green">${I('badge', 's')}</span></div><div class="small muted">Quản lý kho nhận đơn trong app</div></div><span class="chip">Tự động gửi</span></div>
      <div class="note" style="margin-top:12px">${I('info', 's')}<span><b>Lưu ý:</b> Tạo đơn trong ngày làm thêm (chậm nhất 3 ngày sau). Quản lý đối chiếu giờ chấm công rồi xác nhận; bảng công tính giờ tăng ca sau khi được xác nhận.</span></div>
      <div class="err" id="oErr"></div>
      <button class="btn dark" id="bOt">GỬI ĐƠN TĂNG CA ${I('send')}</button></div>`;
  const ds = me.tangCa || [], hien = otAll ? ds : ds.slice(0, 3);
  const list = `<div class="row" style="margin:10px 2px"><span class="green">${I('refresh')}</span><h2 class="t sp">Đơn Tăng Ca Gần Đây</h2>${ds.length > 3 ? `<button class="lnk" id="bOtAll">${otAll ? 'Thu gọn' : `Xem tất cả (${ds.length})`}</button>` : ''}</div>
    ${hien.length ? hien.map(o => otCardHtml(o, q.nguoiDuyet, false)).join('') : '<div class="card muted small">Chưa có đơn tăng ca.</div>'}`;
  return canhBaoMayChu() + quy + form + list;
}

function otCardHtml(o, nguoiDuyet, laQL) {
  const tt = TT_OT[o.trangThai] || [o.trangThai, 'gray'], sun = parseIso(o.ngay).getDay() === 0;
  let ft = '';
  if (o.trangThai === 'Chờ duyệt') ft = laQL ? '' : `<div class="ft"><span>Chờ <b>${esc(nguoiDuyet)}</b> xác nhận (gửi lúc ${esc(o.guiLuc)})</span><button class="lnk red" data-cot="${esc(o.id)}" style="padding:0">Hủy đơn</button></div>`;
  else if (o.trangThai === 'Đã duyệt') ft = `<div class="ft" style="display:block"><div class="green">${I('dcheck', 's')} Xác nhận bởi ${esc(o.nguoiDuyet || 'quản lý')}${o.duyetLuc ? ' (' + esc(o.duyetLuc) + ')' : ''}</div>${o.ghiChuDuyet ? `<div>Ghi chú: ${esc(o.ghiChuDuyet)}</div>` : ''}</div>`;
  else if (o.trangThai === 'Đã chốt công') ft = `<div class="ft"><span>Tích lũy vào <b>Phiếu lương kỳ ${esc(kyCuaNgay(o.ngay).slice(5))}</b></span><span class="green b">+${num1(o.quyDoi)}h chuẩn</span></div>`;
  else if (o.trangThai === 'Từ chối') ft = `<div class="ft" style="display:block"><div class="red">Từ chối${o.nguoiDuyet ? ' bởi ' + esc(o.nguoiDuyet) : ''}${o.duyetLuc ? ' (' + esc(o.duyetLuc) + ')' : ''}</div>${o.ghiChuDuyet ? `<div>Lý do: ${esc(o.ghiChuDuyet)}</div>` : ''}</div>`;
  const nguoi = laQL ? `<div class="row" style="margin-bottom:10px"><div class="ava" style="width:38px;height:38px;font-size:14px;font-weight:700">${esc(initials(o.ten).toUpperCase())}</div>
      <div class="sp"><div class="b">${esc(o.ten)}</div><div class="xs muted">${esc(o.code)}${o.team ? ' • ' + esc(o.team) : ''}</div></div><span class="chip ${tt[1]}">${esc(tt[0])}</span></div>` : '';
  const cc = laQL ? `<div class="sum" style="margin-top:8px">${I('finger', 's')}<span class="sp">Chấm công: ${o.vao ? 'vào <b>' + esc(o.vao) + '</b>' : '<span class="red">không có giờ vào</span>'}${o.ra ? ' – ra <b>' + esc(o.ra) + '</b>' : o.vao ? ' – <span class="amber">chưa có giờ ra</span>' : ''}${o.gioCong ? ` · ${num1(o.gioCong)} giờ có mặt` : ''}</span></div>` : '';
  const chiTiet = (o.lyDo || o.congViec) ? `<div class="small" style="margin-top:8px;color:var(--ink2)">${o.lyDo ? `<div>Lý do: <b>${esc(o.lyDo)}</b></div>` : ''}${o.congViec ? `<div>Công việc: ${esc(o.congViec)}</div>` : ''}</div>` : '';
  const nut = laQL && o.trangThai === 'Chờ duyệt' ? `<div class="grid2" style="margin-top:10px"><button class="btn line" style="margin:0;padding:12px" data-rej="${esc(o.id)}">${I('calx', 's')} Từ chối</button>
      <button class="btn pri" style="margin:0;padding:12px" data-apr="${esc(o.id)}">${I('check', 's')} Xác nhận</button></div><div class="xs muted" style="margin-top:6px">Gửi lúc ${esc(o.guiLuc)}</div>` : '';
  return `<div class="card" style="padding:12px">${nguoi}<div class="row"><div class="dblk ${sun ? 'sun' : ''}"><span class="w">${thuN(o.ngay)}</span><span class="n">${o.ngay.slice(8)}</span></div>
      <div class="sp"><div class="b" style="font-size:16.5px">${esc(o.tu)} – ${esc(o.den)} (${num1(o.soGio)} giờ)</div><div class="small muted">${esc(o.loaiTen)} • Hệ số ${Math.round(o.heSo * 100)}% • Quy đổi ${num1(o.quyDoi)}h</div></div>
      ${laQL ? '' : `<span class="chip ${tt[1]}">${o.trangThai === 'Đã duyệt' ? I('check', 's') : '<span class="dot"></span>'} ${esc(tt[0])}</span>`}</div>${cc}${chiTiet}${nut}${ft}</div>`;
}

function kyCuaNgay(iso) { let y = +iso.slice(0, 4), m = +iso.slice(5, 7); if (+iso.slice(8, 10) >= 26) { m++; if (m > 12) { m = 1; y++; } } return `${y}-${pad(m)}`; }

function bindOt() {
  const luu = () => {
    fOt.work = $('oWork').value; if ($('oReason')) fOt.reasonText = $('oReason').value;
    const f = $('oFrom').value, t = $('oTo').value;
    if ((f && f !== fOt.from) || (t && t !== fOt.to)) fOt.touched = true;
    fOt.from = f || fOt.from; fOt.to = t || fOt.to; fOt.date = $('oDate').value || fOt.date;
  };
  document.querySelectorAll('[data-ot]').forEach(b => b.onclick = () => { luu(); fOt.type = b.dataset.ot; render(); });
  document.querySelectorAll('[data-rs]').forEach(b => b.onclick = () => { luu(); fOt.reason = b.dataset.rs; render(); });
  $('oDate').onchange = () => { luu(); fOt.touched = false; if (parseIso(fOt.date).getDay() === 0 && fOt.type === 'THUONG') fOt.type = 'NGHI_TUAN'; render(); };
  ['oFrom', 'oTo'].forEach(id => $(id).onchange = () => { luu(); render(); });
  if ($('bOtAll')) $('bOtAll').onclick = () => { otAll = !otAll; render(); };
  $('bOt').onclick = async () => {
    luu();
    const gio = otGio();
    if (!gio) { $('oErr').textContent = 'Nhập giờ bắt đầu và kết thúc tăng ca.'; return; }
    const lyDo = fOt.reason === 'Khác' ? (fOt.reasonText || '').trim() : fOt.reason;
    if (!lyDo) { $('oErr').textContent = 'Chọn hoặc nhập lý do tăng ca.'; return; }
    const work = (fOt.work || '').trim();
    if (work.length < 3) { $('oErr').textContent = 'Nhập công việc đã làm trong giờ tăng ca.'; return; }
    const loai = LOAI_OT.find(x => x[0] === fOt.type);
    if (!await dialog('Gửi đơn tăng ca', `${loai[1]} · ${dmy(fOt.date)}\n${fOt.from} – ${fOt.to} (${num1(gio)} giờ, quy đổi ${num1(gio * loai[3])} giờ chuẩn)\nLý do: ${lyDo}\nCông việc: ${work}`, 'Gửi đơn', 'Hủy')) return;
    const b = $('bOt'); b.disabled = true; b.textContent = 'Đang gửi…';
    try {
      const r = await api('ot', { type: fOt.type, date: fOt.date, from: fOt.from, to: fOt.to, note: lyDo, work });
      me.tangCa = r.tangCa; me.quyOt = r.quyOt; fOt.work = ''; fOt.reasonText = ''; fOt.touched = false;
      render(); toast('Đã gửi đơn tăng ca cho quản lý xác nhận.');
    } catch (e) { if (authFail(e)) return; b.disabled = false; b.innerHTML = 'GỬI ĐƠN TĂNG CA ' + I('send'); $('oErr').textContent = e.message; }
  };
  document.querySelectorAll('[data-cot]').forEach(b => b.onclick = async () => {
    if (!await dialog('', 'Hủy đơn tăng ca này?', 'Hủy đơn', 'Không')) return;
    b.disabled = true;
    try { const r = await api('cancelOt', { id: b.dataset.cot }); me.tangCa = r.tangCa; me.quyOt = r.quyOt; render(); toast('Đã hủy đơn tăng ca.'); }
    catch (e) { if (authFail(e)) return; b.disabled = false; dialog('', e.message); }
  });
}

/* ======================= TAB QUẢN LÝ ======================= */
let mgr = { seg: 'ot', loc: 'cho', ot: null, otErr: '', pres: null, presErr: '', tai: false };
let presTimer = null;

async function taiMgrOt(baoLoi) {
  try { const r = await api('mgrOt'); mgr.ot = r.danhSach || []; mgr.otErr = ''; }
  catch (e) { if (authFail(e)) return; mgr.otErr = /Không rõ thao tác/.test(e.message) ? 'Máy chủ chưa cập nhật bản mới (mục Quản lý). Triển khai phiên bản mới FSC_WebApi.gs.' : e.message; if (e.code === 'role') { store.set('fsc_app_ql', ''); dungNav(); } if (baoLoi) toast(mgr.otErr); }
  if (tab === 'ql' || tab === 'scan') render();
}
async function taiMgrPres(baoLoi) {
  try { mgr.pres = await api('mgrPresence'); mgr.presErr = ''; }
  catch (e) { if (authFail(e)) return; mgr.presErr = /Không rõ thao tác/.test(e.message) ? 'Máy chủ chưa cập nhật bản mới (mục Quản lý). Triển khai phiên bản mới FSC_WebApi.gs.' : e.message; if (baoLoi) toast(mgr.presErr); }
  if (tab === 'ql') render();
}
function soOtCho() { return (mgr.ot || []).filter(o => o.trangThai === 'Chờ duyệt').length; }

function qlHtml() {
  const cho = soOtCho(), coMat = mgr.pres ? mgr.pres.coMat.length : null;
  const seg = `<div class="seg"><button data-qs="ot" class="${mgr.seg === 'ot' ? 'on' : ''}">${I('clockp', 's')} Duyệt tăng ca ${cho ? `<span class="chip">${cho}</span>` : ''}</button>
    <button data-qs="pres" class="${mgr.seg === 'pres' ? 'on' : ''}">${I('wh', 's')} Có mặt tại kho ${coMat != null ? `<span class="chip">${coMat}</span>` : ''}</button></div>`;
  return `<div class="row" style="margin:2px 4px 12px"><div class="tile dark" style="border-radius:12px">${I('shield')}</div><div class="sp"><h2 class="t">Quản lý kho</h2><div class="small muted">${esc(store.get('fsc_app_name'))} • Quyền quản lý</div></div></div>`
    + seg + (mgr.seg === 'pres' ? presHtml() : duyetHtml());
}

function duyetHtml() {
  if (mgr.otErr && !mgr.ot) return `<div class="card red">${esc(mgr.otErr)}</div>`;
  if (!mgr.ot) return '<div class="card muted">Đang tải đơn tăng ca…</div>';
  const cho = mgr.ot.filter(o => o.trangThai === 'Chờ duyệt'), xl = mgr.ot.filter(o => o.trangThai !== 'Chờ duyệt');
  const gioCho = cho.reduce((s, o) => s + (Number(o.soGio) || 0), 0);
  const ds = mgr.loc === 'cho' ? cho : xl;
  return `<div class="card"><div class="stats3">
      <div class="st dark"><div class="k" style="text-transform:none;letter-spacing:0">Chờ xác nhận</div><div class="v">${cho.length} <small>đơn</small></div><div class="s">${num1(gioCho)} giờ tăng ca</div></div>
      <div class="st"><div class="k" style="text-transform:none;letter-spacing:0">Đã xác nhận</div><div class="v">${xl.filter(o => o.trangThai === 'Đã duyệt' || o.trangThai === 'Đã chốt công').length} <small>đơn</small></div><div class="s">10 ngày gần đây</div></div>
      <div class="st"><div class="k" style="text-transform:none;letter-spacing:0">Từ chối</div><div class="v">${xl.filter(o => o.trangThai === 'Từ chối').length} <small>đơn</small></div><div class="s">10 ngày gần đây</div></div></div></div>
    <div class="row" style="margin:0 2px 10px"><div class="pills sp"><button data-ql="cho" class="${mgr.loc === 'cho' ? 'on' : ''}">Chờ xác nhận (${cho.length})</button><button data-ql="xl" class="${mgr.loc === 'xl' ? 'on' : ''}">Đã xử lý (${xl.length})</button></div>
      <button class="lnk" id="bQlReload">${I('refresh', 's')}</button></div>
    ${mgr.loc === 'cho' && cho.length > 1 ? `<button class="btn pri" id="bAprAll" style="margin:0 0 12px">${I('dcheck', 's')} Xác nhận tất cả ${cho.length} đơn</button>` : ''}
    ${ds.length ? ds.map(o => otCardHtml(o, '', true)).join('') : `<div class="card muted small">${mgr.loc === 'cho' ? 'Không có đơn tăng ca chờ xác nhận.' : 'Chưa có đơn đã xử lý trong 10 ngày.'}</div>`}`;
}

function thoiLuong(p) { p = Math.max(0, p || 0); const h = Math.floor(p / 60), m = p % 60; return h ? `${h} giờ ${pad(m)} phút` : `${m} phút`; }

function presHtml() {
  if (mgr.presErr && !mgr.pres) return `<div class="card red">${esc(mgr.presErr)}</div>`;
  if (!mgr.pres) return '<div class="card muted">Đang tải nhân sự tại kho…</div>';
  const p = mgr.pres, at = new Date(Date.parse(p.at) + (new Date().getTimezoneOffset() + 420) * 60000);
  const nhom = {};
  p.coMat.forEach(o => { (nhom[o.team] = nhom[o.team] || []).push(o); });
  const danhSach = (arr, fn) => arr.map(o => `<div class="li"><div class="ava" style="width:36px;height:36px;font-size:13px;font-weight:700;${fn ? '' : 'background:#8C96A0'}">${esc(initials(o.name).toUpperCase())}</div>
      <div class="sp"><div class="ti">${esc(o.name)}</div><div class="su">${esc(o.code)} • ${esc(o.team)}</div></div><div class="rt">${fn ? fn(o) : ''}</div></div>`).join('');
  const phan = (id, ten, arr, fn, mo) => `<div class="card"><button class="row" data-tog="${id}" style="width:100%;background:none;border:0;padding:0;text-align:left"><h3 class="t sp">${ten} (${arr.length})</h3>${I(mo ? 'down' : 'right', 's')}</button>
      ${mo ? (arr.length ? danhSach(arr, fn) : '<div class="small muted" style="padding-top:8px">Không có.</div>') : ''}</div>`;
  mgr.mo = mgr.mo || { daRa: false, chuaCham: true, nghi: false };
  return `<div class="hero"><div class="row"><span class="chip"><span class="dot"></span>Trực tiếp</span><span class="sp"></span><span class="small">Cập nhật ${pad(at.getHours())}:${pad(at.getMinutes())}</span></div>
      <div class="k">ĐANG CÓ MẶT TẠI KHO</div><div class="v">${p.coMat.length}<small style="text-decoration:none;font-size:18px;font-weight:600;opacity:.8"> / ${p.tong} nhân sự đang làm</small></div>
      <div class="f"><span>Đã xác nhận giờ vào, chưa xác nhận giờ ra</span><b id="bPresReload" style="cursor:pointer">${I('refresh', 's')} Tải lại</b></div></div>
    <div class="card"><div class="stats3">
      <div class="st"><div class="k" style="text-transform:none;letter-spacing:0">Đã ra ca</div><div class="v">${p.daRa.length}</div><div class="s">trong 16 giờ qua</div></div>
      <div class="st"><div class="k" style="text-transform:none;letter-spacing:0">Chưa chấm công</div><div class="v ${p.chuaCham.length ? 'amber' : ''}">${p.chuaCham.length}</div><div class="s">hôm nay</div></div>
      <div class="st"><div class="k" style="text-transform:none;letter-spacing:0">Nghỉ có đơn</div><div class="v">${p.nghi.length}</div><div class="s">hôm nay</div></div></div>
      ${Object.keys(p.theoTo || {}).length ? `<div class="row" style="flex-wrap:wrap;gap:6px;margin-top:12px">${Object.keys(p.theoTo).map(t => `<span class="chip line">${esc(t)}: <b>${p.theoTo[t]}</b></span>`).join('')}</div>` : ''}</div>
    ${Object.keys(nhom).length ? Object.keys(nhom).sort().map(t => `<div class="card"><div class="row"><span class="green">${I('wh', 's')}</span><h3 class="t sp">${esc(t)}</h3><span class="chip">${nhom[t].length} người</span></div>
      ${danhSach(nhom[t], o => `<div class="v">${esc(o.vao)}</div><div class="w">${thoiLuong(o.phut)}${o.ngayVao !== p.homNay ? ' · từ ' + dm(o.ngayVao) : ''}</div>`)}</div>`).join('')
      : '<div class="card muted">Chưa có ai đang có mặt tại kho.</div>'}
    ${phan('chuaCham', 'Chưa chấm công hôm nay', p.chuaCham, o => `<div class="w">${o.cuoi ? 'Lần cuối ' + esc(o.cuoi) : 'Chưa có lượt nào'}</div>`, mgr.mo.chuaCham)}
    ${phan('daRa', 'Đã ra ca', p.daRa, o => `<div class="v">${esc(o.vao)} – ${esc(o.ra)}</div><div class="w">${thoiLuong(o.phut)}</div>`, mgr.mo.daRa)}
    ${phan('nghi', 'Nghỉ có đơn hôm nay', p.nghi, o => `<div class="w">${esc(o.loaiNghi)}</div>`, mgr.mo.nghi)}
    <div class="xs muted" style="text-align:center">Tính theo xác nhận giờ vào / giờ ra trên app. Quên xác nhận giờ ra thì vẫn tính là có mặt đến 16 giờ sau giờ vào.</div>`;
}

function bindQl() {
  document.querySelectorAll('[data-qs]').forEach(b => b.onclick = () => { mgr.seg = b.dataset.qs; if (mgr.seg === 'pres') taiMgrPres(); render(); });
  document.querySelectorAll('[data-ql]').forEach(b => b.onclick = () => { mgr.loc = b.dataset.ql; render(); });
  document.querySelectorAll('[data-tog]').forEach(b => b.onclick = () => { mgr.mo[b.dataset.tog] = !mgr.mo[b.dataset.tog]; render(); });
  if ($('bQlReload')) $('bQlReload').onclick = () => { taiMgrOt(true); toast('Đang tải lại…'); };
  if ($('bPresReload')) $('bPresReload').onclick = () => { taiMgrPres(true); toast('Đang tải lại…'); };
  const xuLy = async (ids, decision, note) => {
    try {
      const r = await api('approveOt', { ids, decision, note });
      mgr.ot = r.danhSach || mgr.ot; render();
      toast((decision === 'APPROVE' ? 'Đã xác nhận ' : 'Đã từ chối ') + r.soDon + ' đơn tăng ca.' + (r.boQua ? ` ${r.boQua} đơn đã được xử lý trước đó.` : ''));
    } catch (e) { if (authFail(e)) return; dialog('Chưa xử lý được', e.message); taiMgrOt(); }
  };
  document.querySelectorAll('[data-apr]').forEach(b => b.onclick = () => { b.disabled = true; xuLy([b.dataset.apr], 'APPROVE', ''); });
  document.querySelectorAll('[data-rej]').forEach(b => b.onclick = () => {
    sheet(`<h3 class="t">Từ chối đơn tăng ca</h3><p class="small">Nhân viên sẽ thấy lý do này trong app.</p>
      <div class="fld"><textarea id="rjNote" rows="3" maxlength="300" placeholder="Ví dụ: Không có trong kế hoạch tăng ca, giờ ra chấm công 17:25..."></textarea></div>
      <div class="err" id="rjErr"></div><div class="acts"><button id="rjNo">Đóng</button><button class="pri" id="rjOk" style="background:var(--red)">Từ chối</button></div>`, () => {
      $('rjNo').onclick = closeSheet;
      $('rjOk').onclick = () => { const n = $('rjNote').value.trim(); if (!n) { $('rjErr').textContent = 'Nhập lý do từ chối.'; return; } closeSheet(); xuLy([b.dataset.rej], 'REJECT', n); };
    });
  });
  if ($('bAprAll')) $('bAprAll').onclick = async () => {
    const cho = mgr.ot.filter(o => o.trangThai === 'Chờ duyệt');
    if (!await dialog('Xác nhận tất cả', `Xác nhận ${cho.length} đơn tăng ca (${num1(cho.reduce((s, o) => s + o.soGio, 0))} giờ)?`, 'Xác nhận', 'Hủy')) return;
    xuLy(cho.map(o => o.id), 'APPROVE', '');
  };
  clearInterval(presTimer);
  if (mgr.seg === 'pres') presTimer = setInterval(() => { if (tab === 'ql' && mgr.seg === 'pres' && !$('modal').innerHTML) taiMgrPres(); else clearInterval(presTimer); }, 60000);
}

/* ======================= TAB CÁ NHÂN ======================= */
function meHtml() {
  const join = (me && me.profile && me.profile.joinDate) || store.get('fsc_app_join');
  const ph = (me && me.phanHoi) || [];
  const row = (ic, k, v) => `<div class="li"><span class="tile lav" style="width:36px;height:36px;border-radius:10px">${I(ic, 's')}</span><span class="sp muted">${k}</span><b style="text-align:right">${v}</b></div>`;
  return `<div class="card" style="text-align:center;padding-top:22px"><div class="ava lg" style="margin:0 auto 10px">${esc(initials(store.get('fsc_app_name')).toUpperCase())}</div>
      <div class="b" style="font-size:20px">${esc(store.get('fsc_app_name'))}</div>
      <div class="row" style="justify-content:center;margin-top:6px"><span class="chip">${esc(store.get('fsc_app_code'))}</span>${store.get('fsc_app_team') ? `<span class="chip gray">${esc(store.get('fsc_app_team'))}</span>` : ''}</div></div>
    <div class="card" style="padding-top:6px;padding-bottom:6px">
      ${row('user', 'Mã nhân viên', esc(store.get('fsc_app_code')))}${row('box', 'Tổ / nhóm', esc(store.get('fsc_app_team') || '–'))}
      ${row('cal', 'Ngày vào làm', join ? dmy(join) : '–')}${row('wh', 'Điểm chấm công', esc(st.diem.map(d => d.kho || d.ma).join(', ') || '–'))}
      ${row('phone', 'Thiết bị', `<span class="xs">${esc(deviceId().slice(0, 18))}…</span>`)}${row('info', 'Phiên bản app', esc(appVersion()))}
      ${row('shield', 'Phiên bản máy chủ', !st.ok ? '<span class="muted">Đang kiểm tra…</span>' : st.apiVersion ? esc(st.apiVersion) + (laQL() ? ' · Quản lý' : '') : '<span class="red">Bản cũ – cần triển khai bản mới</span>')}</div>
    <div class="card" style="padding-top:6px;padding-bottom:6px">
      <button class="li" id="bPw" style="width:100%;background:none;border:0;border-bottom:1px solid #F0F2F6;text-align:left"><span class="tile" style="width:36px;height:36px;border-radius:10px">${I('key', 's')}</span><span class="sp b">Đổi mật khẩu</span>${I('right', 's')}</button>
      <button class="li" data-fb="KHAC" style="width:100%;background:none;border:0;border-bottom:1px solid #F0F2F6;text-align:left"><span class="tile" style="width:36px;height:36px;border-radius:10px">${I('msg', 's')}</span><span class="sp b">Gửi thắc mắc cho quản lý</span>${I('right', 's')}</button>
      <button class="li" id="bHd" style="width:100%;background:none;border:0;text-align:left"><span class="tile" style="width:36px;height:36px;border-radius:10px">${I('book', 's')}</span><span class="sp b">Hướng dẫn sử dụng</span>${I('right', 's')}</button></div>
    ${ph.length ? `<div class="card"><h3 class="t">Khiếu nại / thắc mắc đã gửi</h3>${ph.map(p => `<div class="req" style="margin-top:10px"><div class="row"><b class="sp">${esc(p.loai)} · Kỳ ${esc(p.ky)}</b><span class="chip ${p.trangThai === 'Đã trả lời' ? '' : 'amber'}">${esc(p.trangThai)}</span></div>
      <div class="small" style="margin-top:4px">${esc(p.noiDung)}</div>${p.traLoi ? `<div class="ft" style="display:block"><b class="green">Trả lời:</b> ${esc(p.traLoi)}</div>` : ''}<div class="xs muted" style="margin-top:6px">Gửi lúc ${esc(p.guiLuc)}</div></div>`).join('')}</div>` : ''}
    <button class="btn danger" id="bLogout">${I('out')} Đăng xuất</button>`;
}
function bindMe() {
  $('bLogout').onclick = async () => { if (await dialog('', 'Đăng xuất khỏi điện thoại này?', 'Đăng xuất', 'Hủy')) dangXuat(); };
  document.querySelectorAll('[data-fb]').forEach(b => b.onclick = () => khieuNai(b.dataset.fb));
  $('bHd').onclick = () => sheet(`<h3 class="t">Hướng dẫn sử dụng</h3><div class="small" style="line-height:1.7;margin-top:8px">
    <b>Chấm công:</b> đến kho, chờ ô Vị trí báo "Trong vùng hợp lệ", bấm Xác nhận giờ vào. Hết ca bấm Xác nhận giờ ra. Ca đêm qua ngày vẫn tính cho ngày vào ca.<br>
    <b>Quên chấm:</b> quên giờ ra ca trước thì vẫn xác nhận giờ vào ca mới, rồi báo quản lý bổ sung.<br>
    <b>Bảng công:</b> xem phiếu lương, ngày công từng ngày, sản lượng; chọn kỳ bằng nút ◀ ▶.<br>
    <b>Nghỉ phép:</b> chọn loại, ngày, cả ngày hoặc nửa ngày, gửi đơn. Hủy được khi ngày nghỉ chưa qua.<br>
    <b>Tăng ca:</b> đăng ký giờ làm thêm, chờ quản lý duyệt.<br>
    <b>Đổi điện thoại:</b> báo quản lý xóa thiết bị cũ rồi đăng nhập trên máy mới.</div>
    <div class="acts"><button class="pri" id="hdOk">Đã hiểu</button></div>`, () => { $('hdOk').onclick = closeSheet; });
  $('bPw').onclick = () => sheet(`<h3 class="t">Đổi mật khẩu</h3>
    <div class="fl">Mật khẩu hiện tại</div><input class="inp" id="pw0" type="password" inputmode="numeric" maxlength="8">
    <div class="fl">Mật khẩu mới (4–8 chữ số)</div><input class="inp" id="pw1" type="password" inputmode="numeric" maxlength="8">
    <div class="fl">Nhập lại mật khẩu mới</div><input class="inp" id="pw2" type="password" inputmode="numeric" maxlength="8">
    <div class="err" id="pwErr"></div><div class="acts"><button id="pwNo">Hủy</button><button class="pri" id="pwOk">Lưu</button></div>`, () => {
    $('pwNo').onclick = closeSheet;
    $('pwOk').onclick = async () => {
      const a = $('pw1').value.trim();
      if (!/^\d{4,8}$/.test(a)) { $('pwErr').textContent = 'Mật khẩu mới gồm 4 đến 8 chữ số.'; return; }
      if (a !== $('pw2').value.trim()) { $('pwErr').textContent = 'Hai lần nhập không giống nhau.'; return; }
      $('pwOk').disabled = true;
      try { const r = await api('setPin', { oldPin: $('pw0').value.trim(), newPin: a }); savePhien(r); closeSheet(); toast('Đã đổi mật khẩu.'); }
      catch (e) { if (authFail(e)) return; $('pwOk').disabled = false; $('pwErr').textContent = e.message; }
    };
  });
}

/* ---------------- Thông báo (chuông) ---------------- */
function dsThongBao() {
  const out = [];
  if (laQL() && soOtCho()) { const cho = (mgr.ot || []).filter(o => o.trangThai === 'Chờ duyệt'); out.push({ k: 'qlot|' + cho.map(o => o.id).join(','), t: `Có ${cho.length} đơn tăng ca chờ bạn xác nhận`, ic: 'shield', tab: 'ql' }); }
  if (!me) return out;
  (me.tangCa || []).forEach(o => { if (o.trangThai === 'Đã duyệt' || o.trangThai === 'Từ chối') out.push({ k: 'ot|' + o.id + '|' + o.trangThai, t: `Đơn tăng ca ${dm(o.ngay)} (${o.tu}–${o.den}) ${o.trangThai === 'Đã duyệt' ? 'đã được duyệt' : 'bị từ chối'}`, ic: 'clockp', tab: 'ot' }); });
  (me.nghi || []).forEach(n => { if (n.trangThai === 'Đã duyệt' || n.trangThai === 'Từ chối') out.push({ k: 'np|' + n.id + '|' + n.trangThai, t: `Đơn ${n.loaiTen.toLowerCase()} ${dm(n.tu)} ${n.trangThai === 'Đã duyệt' ? 'đã được duyệt' : 'bị từ chối'}`, ic: 'calx', tab: 'nghi' }); });
  (me.phanHoi || []).forEach(p => { if (p.traLoi) out.push({ k: 'ph|' + p.id + '|' + p.traLoi.length, t: `Quản lý đã trả lời khiếu nại ${p.loai.toLowerCase()}: ${p.traLoi.slice(0, 80)}`, ic: 'msg', tab: 'me' }); });
  (me.luong || []).forEach(l => { if (l.chotLuc) out.push({ k: 'bl|' + me.ky + '|' + l.chotLuc, t: `Phiếu lương kỳ ${me.ky} cập nhật lúc ${l.chotLuc}`, ic: 'doc', tab: 'bc' }); });
  return out;
}
function thongBaoMoi() { const seen = store.get('fsc_app_seen').split('\n'); return dsThongBao().filter(x => seen.indexOf(x.k) < 0); }
function showThongBao() {
  const ds = dsThongBao(), moi = thongBaoMoi().map(x => x.k);
  sheet(`<h3 class="t">Thông báo</h3>${ds.length ? ds.map(x => `<button class="li" data-go="${x.tab}" style="width:100%;background:none;border:0;border-bottom:1px solid #F0F2F6;text-align:left">
      <span class="tile ${moi.indexOf(x.k) >= 0 ? '' : 'lav'}" style="width:36px;height:36px;border-radius:10px">${I(x.ic, 's')}</span><span class="sp small ${moi.indexOf(x.k) >= 0 ? 'b' : ''}">${esc(x.t)}</span></button>`).join('')
    : '<p class="muted">Chưa có thông báo.</p>'}<div class="acts"><button class="pri" id="tbOk">Đóng</button></div>`, () => {
    $('tbOk').onclick = closeSheet;
    document.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { closeSheet(); chonTab(b.dataset.go); });
  });
  store.set('fsc_app_seen', ds.map(x => x.k).join('\n'));
  const dot = document.querySelector('#bBell .dot'); if (dot) dot.remove();
}

/* ---------------- Khởi động ---------------- */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && store.get('fsc_app_token') && !$('nav').hidden) { startGps(true); taiTrangThai(false); taiMe(null); }
});
window.fscOnResume = () => { if (store.get('fsc_app_token') && !$('nav').hidden) { startGps(true); taiTrangThai(false); taiMe(null); if (laQL()) { taiMgrOt(); if (tab === 'ql' && mgr.seg === 'pres') taiMgrPres(); } } };
(function start() {
  // App Android 1.x đã đăng nhập: dùng lại phiên cũ (cùng Device ID) để khỏi đăng nhập lại.
  if (!store.get('fsc_app_token') && NATIVE && NATIVE.oldSession) {
    try { const o = JSON.parse(NATIVE.oldSession() || 'null'); if (o && o.token) { store.set('fsc_app_token', o.token); saveProfile({ code: o.code, name: o.name, team: o.team }); } } catch (e) {}
  }
  if (store.get('fsc_app_token')) showMain();
  else if (isIOS && !isStandalone && !store.get('fsc_app_safari')) showInstall();
  else showLogin();
})();
