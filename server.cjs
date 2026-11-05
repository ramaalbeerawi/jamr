// سيرفر «جمر»: ملفات الموقع، API الطلبات، تحديث مباشر (SSE)، وواتساب.
// بدون أي مكتبة npm. شغّله بـ: node server.cjs
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const ASSETS_DIR = path.join(ROOT, 'assets');
const DATA_DIR = path.join(ROOT, 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const PORT = Number(process.env.PORT) || 5600;

const MENU = require('./public/menu.js');

// ---------- .env ----------
function loadEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadEnv();

const ENV = {
  KITCHEN_PASS: process.env.KITCHEN_PASS || '',
  WA_TOKEN: process.env.WA_TOKEN || '',
  WA_PHONE_ID: process.env.WA_PHONE_ID || '',
  WA_API_VERSION: process.env.WA_API_VERSION || 'v23.0',
  WA_VERIFY_TOKEN: process.env.WA_VERIFY_TOKEN || ''
};
const WA_ENABLED = Boolean(ENV.WA_TOKEN && ENV.WA_PHONE_ID);

// ---------- تخزين الطلبات ----------
let db = { lastNo: 100, orders: [] };
function loadOrders() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(ORDERS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
      if (parsed && Array.isArray(parsed.orders)) db = { lastNo: Number(parsed.lastNo) || 100, orders: parsed.orders };
    }
  } catch (err) {
    console.error('ما قدرت أقرأ data/orders.json، رح أبلّش بملف فاضي:', err.message);
  }
}
function saveOrders() {
  const tmp = ORDERS_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, ORDERS_FILE);
}
loadOrders();

// ---------- حالات الطلب ----------
// 0 جديد، 1 بالمطبخ، 2 جاهز، 3 تم التسليم. المطعم هو يلي بيحدد وقت التجهيز.
const TYPES = ['takeaway', 'dinein'];
const STEPS = ['انطلب', 'بالمطبخ', 'جاهز', 'تم التسليم'];
const READY_IN = [10, 15, 20, 30];

function waMessage(order, status) {
  const n = order.name;
  if (status === 0) return `أهلين ${n}، وصلنا طلبك رقم ${order.no}.`;
  if (status === 1) return order.readyIn ? `طلبك عالجمر هلأ، بيجهز خلال ${order.readyIn} دقيقة تقريباً.` : 'طلبك عالجمر هلأ.';
  if (status === 2) return order.type === 'dinein' ? `يا ${n}، أكلك طالع لطاولتك.` : `يا ${n}، طلبك جاهز. تفضل استلمه من الكاونتر.`;
  if (status === 3) return 'صحتين! شكراً إنك اخترت جمر.';
  return '';
}

// ---------- واتساب ----------
function toIntl(phone) {
  const digits = String(phone).replace(/\D/g, '');
  return '962' + digits.replace(/^0/, '');
}

function explainWaError(code, fallback) {
  switch (Number(code)) {
    case 131030: return 'الرقم مش مضاف لقائمة الأرقام المسموحة. بوضع التجربة لازم تضيف رقم الزبون من لوحة Meta (WhatsApp > API Setup > To).';
    case 131047: return 'مر أكثر من 24 ساعة على آخر رسالة من الزبون (أو ما بعتلك ولا مرة). بهالحالة واتساب بيسمح بس برسائل Template موافق عليها.';
    case 190:    return 'التوكن (WA_TOKEN) انتهى أو غلط. اعمل توكن جديد من Meta وحطه بـ .env وأعد تشغيل السيرفر.';
    case 100:    return 'في معلومة غلط بالطلب، غالباً WA_PHONE_ID مش صحيح.';
    default:     return fallback || 'واتساب رجّع خطأ مش معروف.';
  }
}

async function sendWhatsApp(order, status) {
  const text = waMessage(order, status);
  if (!text) return { ok: true, skipped: true };
  if (order.notify !== 'whatsapp') return { ok: true, skipped: true };
  const to = toIntl(order.phone);

  if (!WA_ENABLED) {
    console.log(`[واتساب: وضع تجربة، ما انبعتت] إلى ${to}: ${text}`);
    return { ok: true, simulated: true };
  }

  const url = `https://graph.facebook.com/${ENV.WA_API_VERSION}/${ENV.WA_PHONE_ID}/messages`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ENV.WA_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } }),
      signal: AbortSignal.timeout(10000)
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = body.error || {};
      const code = err.code;
      const reason = explainWaError(code, err.message);
      console.error(`[واتساب] فشل البعت لـ ${to} (كود ${code || res.status}): ${reason}`);
      return { ok: false, code: code || res.status, reason };
    }
    console.log(`[واتساب] انبعتت لـ ${to}: ${text}`);
    return { ok: true };
  } catch (err) {
    const reason = 'ما قدرت أوصل لسيرفر واتساب: ' + err.message;
    console.error('[واتساب] ' + reason);
    return { ok: false, reason };
  }
}

// ---------- أدوات ----------
function clean(str, max = 200) {
  return String(str == null ? '' : str).replace(/[<>]/g, '').trim().slice(0, max);
}

function round2(n) { return Math.round(n * 100) / 100; }

// النسخة يلي بتطلع للمطبخ أو بالبث: بدون المفتاح السري.
function publicOrder(o) {
  const { key, ...rest } = o;
  return rest;
}

function sendJson(res, status, obj) {
  if (res.headersSent) { try { res.end(); } catch (_) {} return; }
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

function readBody(req, limit = 100 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > limit) { reject(Object.assign(new Error('الطلب كبير كتير.'), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function readJson(req) {
  const raw = await readBody(req);
  if (!raw) return {};
  try { return JSON.parse(raw); }
  catch { throw Object.assign(new Error('البيانات المبعوتة مش JSON صحيح.'), { status: 400 }); }
}

function clientIp(req) {
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

// ---------- حماية المطبخ ----------
const failures = new Map(); // ip -> { count, blockedUntil }
const MAX_FAILS = 5;
const BLOCK_MS = 60 * 1000;

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

// بيرجع null إذا مسموح، أو { status, error } إذا لأ.
function checkKitchen(req, provided) {
  if (!ENV.KITCHEN_PASS) return { status: 503, error: 'شاشة المطبخ مسكّرة: لازم تحط KITCHEN_PASS بملف .env وتعيد تشغيل السيرفر.' };
  const ip = clientIp(req);
  const now = Date.now();
  const rec = failures.get(ip);
  if (rec && rec.blockedUntil > now) {
    const secs = Math.ceil((rec.blockedUntil - now) / 1000);
    return { status: 429, error: `محاولات غلط كتير. جرّب كمان ${secs} ثانية.` };
  }
  if (provided && safeEqual(provided, ENV.KITCHEN_PASS)) {
    failures.delete(ip);
    return null;
  }
  const next = rec || { count: 0, blockedUntil: 0 };
  next.count += 1;
  if (next.count >= MAX_FAILS) { next.blockedUntil = now + BLOCK_MS; next.count = 0; }
  failures.set(ip, next);
  if (next.blockedUntil > now) return { status: 429, error: 'محاولات غلط كتير. جرّب كمان دقيقة.' };
  return { status: 401, error: 'كلمة السر غلط.' };
}

// ---------- SSE ----------
const kitchenClients = new Set();
const customerClients = new Map(); // no -> Set(res)

function sseWrite(res, event, data) {
  try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch (_) {}
}

function broadcastOrder(order) {
  const pub = publicOrder(order);
  for (const res of kitchenClients) sseWrite(res, 'order', pub);
  const set = customerClients.get(order.no);
  if (set) for (const res of set) sseWrite(res, 'status', customerView(order));
}

function customerView(o) {
  return { no: o.no, type: o.type, table: o.table || null, status: o.status, readyIn: o.readyIn || null, steps: STEPS, notify: o.notify, name: o.name, total: o.total };
}

setInterval(() => {
  for (const res of kitchenClients) { try { res.write(': ping\n\n'); } catch (_) {} }
  for (const set of customerClients.values()) for (const res of set) { try { res.write(': ping\n\n'); } catch (_) {} }
}, 25000).unref();

function openSse(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-store',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.write('retry: 3000\n\n');
}

// ---------- التحقق من الطلب ----------
const PHONE_RE = /^0?7[789]\d{7}$/;

function buildOrder(body) {
  const errors = [];
  const type = body.type;
  if (!TYPES.includes(type)) errors.push('نوع الطلب لازم يكون سفري أو جوا المطعم.');

  const name = clean(body.name, 60);
  if (!name) errors.push('اكتب اسمك عشان نعرف لمين الطلب.');

  const phone = String(body.phone || '').replace(/[\s-]/g, '');
  if (!PHONE_RE.test(phone)) errors.push('الرقم لازم يكون أردني، متل 0791234567.');

  const notify = body.notify === 'browser' ? 'browser' : 'whatsapp';

  if (!Array.isArray(body.items) || body.items.length === 0) errors.push('السلة فاضية. زيد صنف من المنيو.');
  if (Array.isArray(body.items) && body.items.length > 50) errors.push('السلة فيها أصناف كتير.');

  const items = [];
  let subtotal = 0;
  for (const raw of Array.isArray(body.items) ? body.items.slice(0, 50) : []) {
    const item = MENU.ITEMS.find(i => i.id === (raw && raw.id));
    if (!item) { errors.push('في صنف بالسلة مش موجود بالمنيو. شيله وجرّب كمان مرة.'); continue; }
    const qty = Number(raw.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) { errors.push(`كمية «${item.name}» لازم تكون بين 1 و 20.`); continue; }
    const mods = {};
    let extras = 0;
    const rawMods = raw.mods && typeof raw.mods === 'object' ? raw.mods : {};
    for (const ing of item.mods) {
      const lvl = MENU.LEVELS.includes(rawMods[ing]) ? rawMods[ing] : 'normal';
      mods[ing] = lvl;
      if (lvl === 'extra') extras += 1;
    }
    const unit = round2(item.price + extras * MENU.EXTRA_PRICE);
    const modsText = item.mods
      .filter(ing => mods[ing] !== 'normal')
      .map(ing => (mods[ing] === 'extra' ? 'زيادة ' : 'بدون ') + MENU.INGREDIENTS[ing].ar)
      .join('، ');
    items.push({ id: item.id, name: item.name, qty, unit, mods, modsText });
    subtotal += unit * qty;
  }

  let table = null;
  if (type === 'dinein' && body.table !== undefined && body.table !== null && body.table !== '') {
    table = Number(body.table);
    if (!Number.isInteger(table) || table < 1 || table > 30) errors.push('رقم الطاولة لازم يكون بين 1 و 30، أو خلّيه فاضي.');
  }

  if (errors.length) return { errors: [...new Set(errors)] };

  db.lastNo += 1;
  return {
    order: {
      no: db.lastNo,
      key: crypto.randomBytes(16).toString('hex'),
      type, table, name, phone, notify, items,
      total: round2(subtotal),
      status: 0,
      notified: 0,
      readyIn: null,
      createdAt: new Date().toISOString(),
      statusAt: new Date().toISOString(),
      wa: null
    }
  };
}

// ---------- الـ API ----------
async function handleApi(req, res, url) {
  const p = url.pathname;

  if (p === '/api/orders' && req.method === 'POST') {
    const body = await readJson(req);
    const { order, errors } = buildOrder(body);
    if (errors) return sendJson(res, 400, { errors });
    db.orders.push(order);
    saveOrders();
    broadcastOrder(order);
    sendJson(res, 201, { no: order.no, key: order.key, order: customerView(order) });
    // واتساب بعد الرد، عشان الزبون ما يستنى.
    sendWhatsApp(order, 0).then(r => {
      if (!r.ok) { order.wa = r; saveOrders(); broadcastOrder(order); }
    });
    return;
  }

  if (p === '/api/orders' && req.method === 'GET') {
    const denied = checkKitchen(req, req.headers['x-kitchen-key']);
    if (denied) return sendJson(res, denied.status, { error: denied.error });
    return sendJson(res, 200, { orders: db.orders.map(publicOrder) });
  }

  if (p === '/api/orders' && req.method === 'DELETE') {
    const denied = checkKitchen(req, req.headers['x-kitchen-key']);
    if (denied) return sendJson(res, denied.status, { error: denied.error });
    db.orders = [];
    saveOrders();
    for (const r of kitchenClients) sseWrite(r, 'cleared', {});
    return sendJson(res, 200, { ok: true });
  }

  const m = p.match(/^\/api\/orders\/(\d+)\/status$/);
  if (m && req.method === 'POST') {
    const denied = checkKitchen(req, req.headers['x-kitchen-key']);
    if (denied) return sendJson(res, denied.status, { error: denied.error });
    const order = db.orders.find(o => o.no === Number(m[1]));
    if (!order) return sendJson(res, 404, { error: `ما في طلب رقم ${m[1]}.` });
    const body = await readJson(req);
    const status = body.status;
    if (!Number.isInteger(status) || status < 0 || status > 3) return sendJson(res, 400, { error: 'الحالة لازم تكون رقم من 0 لـ 3.' });
    if (body.readyIn !== undefined && body.readyIn !== null && !READY_IN.includes(body.readyIn)) {
      return sendJson(res, 400, { error: 'وقت التجهيز لازم يكون 10 أو 15 أو 20 أو 30 دقيقة.' });
    }
    if (status === 1 && READY_IN.includes(body.readyIn)) order.readyIn = body.readyIn;
    if (status !== order.status) { order.status = status; order.statusAt = new Date().toISOString(); }
    // الرسالة بتنبعت بس لما الطلب يوصل لحالة ما انبعتلها قبل. الترجيع لورا ما بيبعت إشي.
    let wa = { ok: true, skipped: true };
    const notified = Number.isInteger(order.notified) ? order.notified : 0;
    if (status > notified) {
      order.notified = status;
      wa = await sendWhatsApp(order, status);
      order.wa = wa.ok ? null : wa;
    }
    saveOrders();
    broadcastOrder(order);
    return sendJson(res, 200, { order: publicOrder(order), wa });
  }

  if (p === '/api/events' && req.method === 'GET') {
    const no = url.searchParams.get('no');
    if (no) {
      // الزبون: بيشوف طلبه هو بس، بالمفتاح السري.
      const order = db.orders.find(o => o.no === Number(no));
      const key = url.searchParams.get('key') || '';
      if (!order || !safeEqual(key, order.key)) return sendJson(res, 404, { error: 'ما لقينا هالطلب.' });
      openSse(req, res);
      sseWrite(res, 'status', customerView(order));
      if (!customerClients.has(order.no)) customerClients.set(order.no, new Set());
      customerClients.get(order.no).add(res);
      req.on('close', () => {
        const set = customerClients.get(order.no);
        if (set) { set.delete(res); if (!set.size) customerClients.delete(order.no); }
      });
      return;
    }
    const denied = checkKitchen(req, url.searchParams.get('k'));
    if (denied) return sendJson(res, denied.status, { error: denied.error });
    openSse(req, res);
    sseWrite(res, 'snapshot', db.orders.map(publicOrder));
    kitchenClients.add(res);
    req.on('close', () => kitchenClients.delete(res));
    return;
  }

  sendJson(res, 404, { error: 'هالرابط مش موجود.' });
}

// ---------- Webhook تبع Meta ----------
async function handleWebhook(req, res, url) {
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token') || '';
    const challenge = url.searchParams.get('hub.challenge') || '';
    if (mode === 'subscribe' && ENV.WA_VERIFY_TOKEN && safeEqual(token, ENV.WA_VERIFY_TOKEN)) {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end(challenge);
    }
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('verify token غلط');
  }
  if (req.method === 'POST') {
    const body = await readJson(req).catch(() => ({}));
    try {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          const v = change.value || {};
          for (const msg of v.messages || []) {
            console.log(`[واتساب] رسالة من ${msg.from}: ${(msg.text && msg.text.body) || '(' + msg.type + ')'}`);
          }
          for (const st of v.statuses || []) {
            if (st.status === 'failed') {
              const e = (st.errors && st.errors[0]) || {};
              console.error(`[واتساب] رسالة لـ ${st.recipient_id} ما وصلت: ${explainWaError(e.code, e.title)}`);
            }
          }
        }
      }
    } catch (_) {}
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end('ok');
  }
  res.writeHead(405); res.end();
}

// ---------- الملفات ----------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff2': 'font/woff2'
};

function resolveStatic(pathname) {
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { return null; }
  if (decoded.includes('\0')) return null;
  let base, rel;
  if (decoded.startsWith('/assets/')) { base = ASSETS_DIR; rel = decoded.slice('/assets/'.length); }
  else { base = PUBLIC_DIR; rel = decoded === '/' ? 'index.html' : decoded.slice(1); }
  // ممنوع أي ملف أو فولدر بيبلّش بنقطة (.env وغيره).
  if (rel.split(/[\\/]/).some(seg => seg.startsWith('.'))) return null;
  const full = path.resolve(base, rel);
  if (full !== base && !full.startsWith(base + path.sep)) return null;
  return full;
}

function serveStatic(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  const file = resolveStatic(url.pathname);
  if (!file) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('مش موجود'); }

  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('مش موجود'); }
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    const size = st.size;
    const headers = {
      'Content-Type': type,
      'Accept-Ranges': 'bytes',
      'Last-Modified': st.mtime.toUTCString(),
      'Cache-Control': file.startsWith(ASSETS_DIR) ? 'public, max-age=3600' : 'no-cache'
    };

    const range = req.headers.range;
    if (range) {
      const mm = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
      let start, end;
      if (mm) {
        if (mm[1] === '' && mm[2] !== '') { start = Math.max(0, size - Number(mm[2])); end = size - 1; }
        else { start = Number(mm[1]); end = mm[2] === '' ? size - 1 : Math.min(Number(mm[2]), size - 1); }
      }
      if (!mm || !Number.isFinite(start) || start > end || start >= size) {
        res.writeHead(416, { 'Content-Range': `bytes */${size}` });
        return res.end();
      }
      res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
      if (req.method === 'HEAD') return res.end();
      const stream = fs.createReadStream(file, { start, end });
      stream.on('error', () => res.destroy());
      return stream.pipe(res);
    }

    res.writeHead(200, { ...headers, 'Content-Length': size });
    if (req.method === 'HEAD') return res.end();
    const stream = fs.createReadStream(file);
    stream.on('error', () => res.destroy());
    stream.pipe(res);
  });
}

// ---------- السيرفر ----------
const server = http.createServer(async (req, res) => {
  let url;
  try { url = new URL(req.url, 'http://localhost'); }
  catch { res.writeHead(400); return res.end(); }

  try {
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    if (url.pathname === '/webhook') return await handleWebhook(req, res, url);
    return serveStatic(req, res, url);
  } catch (err) {
    const status = err.status || 500;
    if (status === 500) console.error('خطأ بالسيرفر:', err);
    if (res.headersSent) { try { res.end(); } catch (_) {} return; }
    sendJson(res, status, { error: status === 500 ? 'صار خطأ بالسيرفر. جرّب كمان مرة.' : err.message });
  }
});

process.on('uncaughtException', err => console.error('خطأ ما انمسك:', err));
process.on('unhandledRejection', err => console.error('Promise ما انمسك:', err));

server.listen(PORT, () => {
  console.log(`جمر شغّال: http://localhost:${PORT}`);
  console.log(`شاشة المطبخ: http://localhost:${PORT}/kitchen.html`);
  if (!ENV.KITCHEN_PASS) console.log('تنبيه: KITCHEN_PASS مش معبّى بـ .env، شاشة المطبخ رح تضل مسكّرة.');
  if (!WA_ENABLED) console.log('واتساب بوضع تجربة: الرسائل رح تنطبع هون بدل ما تنبعت (عبّي WA_TOKEN و WA_PHONE_ID بـ .env).');
});
