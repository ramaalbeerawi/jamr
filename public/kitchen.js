/* شاشة المطبخ: 4 حالات، والطباخ بيغيّر الحالة بكبسة. */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);

  const STATUS = ['جديد', 'بالمطبخ', 'جاهز', 'تم التسليم'];
  const READY_IN = [10, 15, 20, 30];
  const LATE_MS = 5 * 60 * 1000;      // طلب جديد ما حدا مسكه
  const HIDE_DONE_MS = 60 * 60 * 1000; // «تم التسليم» بيختفي بعد ساعة

  let pass = sessionStorage.getItem('jamr-kitchen') || '';
  let orders = new Map();
  let es = null;
  let retryTimer = null;
  let activeTab = 0;
  let picking = null; // رقم الطلب يلي مفتوحله اختيار الوقت

  function el(tag, attrs = {}, children = []) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    }
    for (const c of [].concat(children)) if (c) n.append(c);
    return n;
  }

  const money = n => `${Number(n).toFixed(2)} د.أ`;

  function ago(iso) {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return 'هلأ';
    if (mins === 1) return 'من دقيقة';
    if (mins === 2) return 'من دقيقتين';
    if (mins <= 10) return `من ${mins} دقايق`;
    if (mins < 60) return `من ${mins} دقيقة`;
    const h = Math.floor(mins / 60);
    return h === 1 ? 'من ساعة' : h === 2 ? 'من ساعتين' : `من ${h} ساعات`;
  }

  function typeText(o) {
    if (o.type === 'dinein') return o.table ? `جوا المطعم، طاولة ${o.table}` : 'جوا المطعم';
    return 'سفري';
  }

  function alertMsg(text) {
    const node = el('div', { class: 'alert' }, [
      el('span', { text }),
      el('button', { class: 'btn btn-sm', type: 'button', text: 'تمام', onclick: () => node.remove() })
    ]);
    $('#alerts').append(node);
  }

  async function api(method, url, body) {
    const res = await fetch(url, {
      method,
      headers: { 'X-Kitchen-Key': pass, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || 'صار خطأ.'), { status: res.status });
    return data;
  }

  // ---------- صوت التنبيه ----------
  let audio = null;
  let soundOn = localStorage.getItem('jamr-sound') === 'on';

  function ensureAudio() {
    if (!audio) { try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch { audio = null; } }
    if (audio && audio.state === 'suspended') audio.resume();
  }

  function beep() {
    if (!soundOn || !audio || audio.state !== 'running') return;
    const t = audio.currentTime;
    [[880, 0], [1175, 0.16]].forEach(([freq, at]) => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t + at);
      gain.gain.exponentialRampToValueAtTime(0.35, t + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + at + 0.14);
      osc.connect(gain).connect(audio.destination);
      osc.start(t + at);
      osc.stop(t + at + 0.15);
    });
  }

  function renderSound() {
    const btn = $('#soundBtn');
    btn.textContent = soundOn ? 'صوت التنبيه شغّال' : 'شغّل صوت التنبيه';
    btn.setAttribute('aria-pressed', String(soundOn));
  }

  $('#soundBtn').addEventListener('click', () => {
    soundOn = !soundOn;
    localStorage.setItem('jamr-sound', soundOn ? 'on' : 'off');
    if (soundOn) { ensureAudio(); setTimeout(beep, 50); }
    renderSound();
  });
  // المتصفح ما بيسمح بالصوت إلا بعد أول كبسة على الصفحة
  document.addEventListener('pointerdown', () => { if (soundOn) ensureAudio(); }, { passive: true });

  // ---------- الدخول ----------
  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    pass = $('#pass').value;
    $('#loginErr').textContent = '';
    ensureAudio();
    try { await start(); }
    catch (err) { $('#loginErr').textContent = err.message; pass = ''; }
  });

  $('#logout').addEventListener('click', () => {
    sessionStorage.removeItem('jamr-kitchen');
    pass = '';
    if (es) es.close();
    location.reload();
  });

  async function start() {
    const data = await api('GET', '/api/orders');
    sessionStorage.setItem('jamr-kitchen', pass);
    $('#login').hidden = true;
    $('#app').hidden = false;
    orders = new Map(data.orders.map(o => [o.no, o]));
    renderSound();
    render();
    connect();
  }

  function connect() {
    if (es) es.close();
    es = new EventSource(`/api/events?k=${encodeURIComponent(pass)}`);
    es.addEventListener('open', () => { $('#live').textContent = 'متصل مباشر'; $('#live').classList.add('is-on'); });
    es.addEventListener('snapshot', ev => {
      orders = new Map(JSON.parse(ev.data).map(o => [o.no, o]));
      render();
    });
    es.addEventListener('order', ev => {
      const o = JSON.parse(ev.data);
      const isNew = !orders.has(o.no);
      orders.set(o.no, o);
      render();
      if (isNew) beep();
    });
    es.addEventListener('cleared', () => { orders.clear(); render(); });
    es.addEventListener('error', () => {
      $('#live').textContent = 'انقطع الاتصال، عم نرجع نحاول…';
      $('#live').classList.remove('is-on');
      if (es.readyState === EventSource.CLOSED) {
        clearTimeout(retryTimer);
        retryTimer = setTimeout(() => start().catch(err => alertMsg(err.message)), 4000);
      }
    });
  }

  // ---------- العرض ----------
  function visibleOrders() {
    const now = Date.now();
    return [...orders.values()].filter(o => !(o.status === 3 && now - new Date(o.statusAt || o.createdAt).getTime() > HIDE_DONE_MS));
  }

  function statusBar(o) {
    const bar = el('div', { class: 'status-bar', role: 'group', 'aria-label': `حالة طلب ${o.no}` });
    STATUS.forEach((label, i) => {
      bar.append(el('button', {
        class: 'btn', type: 'button', text: label,
        'aria-pressed': String(o.status === i),
        'data-focus': `${o.no}-s${i}`,
        onclick: () => {
          if (i === 1) { picking = picking === o.no ? null : o.no; render(); focusKey(`${o.no}-r15`); return; }
          if (i !== o.status) setStatus(o.no, i);
        }
      }));
    });
    return bar;
  }

  function readyPicker(o) {
    return el('div', { class: 'ready-pick' }, [
      el('p', { text: 'جاهز خلال قديش؟' }),
      el('div', { class: 'opts' }, READY_IN.map(m => el('button', {
        class: 'btn', type: 'button', text: `${m} دقيقة`,
        'aria-pressed': String(o.status === 1 && o.readyIn === m),
        'data-focus': `${o.no}-r${m}`,
        onclick: () => { picking = null; setStatus(o.no, 1, m); }
      }))),
      el('button', { class: 'btn btn-sm cancel', type: 'button', text: 'إلغاء', onclick: () => { picking = null; render(); focusKey(`${o.no}-s1`); } })
    ]);
  }

  function ticket(o) {
    const late = o.status === 0 && Date.now() - new Date(o.createdAt).getTime() > LATE_MS;
    const nodes = [
      el('div', { class: 't-head' }, [
        el('span', { class: 't-no', text: `#${o.no}` }),
        el('span', { class: 't-age', text: ago(o.createdAt) })
      ]),
      el('div', { class: 't-type', text: typeText(o) }),
      el('div', { class: 't-who' }, [el('span', { text: o.name }), el('a', { href: `tel:${o.phone}`, dir: 'ltr', text: o.phone })]),
      el('ul', { class: 't-items' }, o.items.map(i => el('li', {}, [
        el('b', { text: `${i.qty}× ${i.name}` }),
        i.modsText ? el('span', { class: 't-mods', text: i.modsText }) : null
      ]))),
      el('div', { class: 't-total' }, [el('span', { text: 'المجموع (كاش)' }), el('span', { text: money(o.total) })])
    ];
    if (o.status === 1 && o.readyIn) nodes.push(el('div', { class: 't-eta', text: `الزبون بيستنى: جاهز خلال ${o.readyIn} دقيقة` }));
    if (o.notify === 'browser') nodes.push(el('div', { class: 't-note', text: 'الزبون بيتابع من المتصفح، ما في واتساب.' }));
    if (o.wa && o.wa.ok === false) nodes.push(el('div', { class: 't-wa', text: `الواتساب ما وصل: ${o.wa.reason}` }));
    nodes.push(statusBar(o));
    if (picking === o.no) nodes.push(readyPicker(o));
    return el('article', { class: 'ticket' + (late ? ' is-late' : ''), 'aria-label': `طلب ${o.no}${late ? '، متأخر' : ''}` }, nodes);
  }

  function focusKey(key) {
    if (!key) return;
    const target = document.querySelector(`[data-focus="${key}"]`);
    if (target) target.focus();
  }

  function render() {
    const active = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.focus : null;
    const cols = [[], [], [], []];
    for (const o of visibleOrders().sort((a, b) => a.no - b.no)) cols[o.status].push(o);
    cols[3].reverse(); // يلي تسلّم هلأ فوق

    const tabs = $('#kTabs');
    tabs.innerHTML = '';
    STATUS.forEach((label, i) => {
      tabs.append(el('button', {
        class: 'btn', type: 'button', role: 'tab', 'aria-selected': String(activeTab === i),
        onclick: () => { activeTab = i; render(); }
      }, [document.createTextNode(label + ' '), el('span', { class: 'count', text: String(cols[i].length) })]));
    });

    const board = $('#board');
    board.innerHTML = '';
    cols.forEach((list, i) => {
      const col = el('section', { class: 'col' + (activeTab === i ? ' is-active' : ''), 'aria-label': STATUS[i] }, [
        el('h2', {}, [document.createTextNode(STATUS[i]), el('span', { text: String(list.length) })]),
        el('div', { class: 'col-list' }, list.length ? list.map(ticket) : el('p', { class: 'col-empty', text: i === 0 ? 'ما في طلبات جديدة.' : 'فاضي.' }))
      ]);
      board.append(col);
    });

    const fresh = cols[0].length;
    document.title = fresh ? `(${fresh}) جمر | شاشة المطبخ` : 'جمر | شاشة المطبخ';
    focusKey(active);
  }

  async function setStatus(no, status, readyIn) {
    try {
      const data = await api('POST', `/api/orders/${no}/status`, readyIn ? { status, readyIn } : { status });
      orders.set(no, data.order);
      render();
      focusKey(`${no}-s${status}`);
      if (data.wa && data.wa.ok === false) alertMsg(`طلب ${no}: الواتساب ما وصل للزبون. السبب: ${data.wa.reason}`);
    } catch (err) {
      alertMsg(err.message);
      if (err.status === 401) location.reload();
    }
  }

  $('#clearAll').addEventListener('click', async () => {
    if (!orders.size) return;
    if (!confirm(`أكيد بدك تمسح كل الطلبات (${orders.size})؟ ما في رجعة.`)) return;
    try { await api('DELETE', '/api/orders'); orders.clear(); render(); }
    catch (err) { alertMsg(err.message); }
  });

  // الوقت والحد الأحمر بيتحدثوا لحالهم
  setInterval(() => { if (!$('#app').hidden && picking === null) render(); }, 20000);

  if (pass) start().catch(() => { sessionStorage.removeItem('jamr-kitchen'); pass = ''; });
})();
