/* جمر: كل منطق الصفحة. */
(function () {
  'use strict';

  const M = window.MENU;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const money = n => `${n.toFixed(2)} د.أ`;
  const itemById = id => M.ITEMS.find(i => i.id === id);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? '' : v);
    }
    for (const c of [].concat(children)) if (c) node.append(c);
    return node;
  }

  const store = {
    get(key, fallback) { try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch { return fallback; } },
    set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }
  };

  /* ---------- شاشة البداية ---------- */
  const splash = $('#splash');
  function hideSplash() { splash.classList.add('is-gone'); setTimeout(() => splash.remove(), 400); }
  splash.addEventListener('click', hideSplash);
  setTimeout(hideSplash, 1000);

  /* ---------- حالة المحل ---------- */
  function ammanHour() {
    try {
      const h = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Amman' }).format(new Date());
      return Number(h) % 24;
    } catch { return new Date().getHours(); }
  }
  function updateStatus() {
    const h = ammanHour();
    const open = h >= 12 || h < 2;
    const box = $('#openStatus');
    box.classList.toggle('is-open', open);
    $('.status-text', box).textContent = open ? 'مفتوح هلأ لـ 2 بالليل' : 'مسكّر هلأ، منفتح الساعة 12 الظهر';
  }
  updateStatus();
  setInterval(updateStatus, 60 * 1000);

  /* ---------- بخار الهيرو ---------- */
  (function steam() {
    const canvas = $('#steam');
    const img = $('.hero-img');
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    // نقاط طلوع البخار على حافة السيخ (بإحداثيات hero.webp الأصلية 2000×1125)
    const SOURCES = [[1300, 40], [1250, 180], [1220, 330], [1200, 480], [1185, 640], [1180, 800]];
    const IW = 2000, IH = 1125;
    let W = 0, H = 0, dpr = 1, map = null, parts = [], running = false, visible = true, last = 0;

    function layout() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const pos = getComputedStyle(img).objectPosition.split(' ').map(v => parseFloat(v) / 100);
      const s = Math.max(W / IW, H / IH);
      const ox = (W - IW * s) * (isNaN(pos[0]) ? .5 : pos[0]);
      const oy = (H - IH * s) * (isNaN(pos[1]) ? .5 : pos[1]);
      map = { s, ox, oy };
    }

    function spawn() {
      const [ix, iy] = SOURCES[(Math.random() * SOURCES.length) | 0];
      parts.push({
        x: map.ox + (ix + (Math.random() - .5) * 30) * map.s,
        y: map.oy + iy * map.s,
        r: (36 + Math.random() * 44) * map.s,
        vx: (-.4 - Math.random() * .8) * map.s,
        vy: (-1.1 - Math.random() * .9) * map.s,
        life: 0,
        max: 260 + Math.random() * 200,
        sway: Math.random() * Math.PI * 2
      });
    }

    function draw(t) {
      if (!running) return;
      const dt = Math.min(48, t - (last || t)) / 16.7;
      last = t;
      ctx.clearRect(0, 0, W, H);
      if (parts.length < 80 && Math.random() < .6 * dt) spawn();
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life += dt;
        if (p.life > p.max) { parts.splice(i, 1); continue; }
        p.sway += .02 * dt;
        p.x += (p.vx + Math.sin(p.sway) * .5 * map.s) * dt;
        p.y += p.vy * dt;
        p.r += .32 * map.s * dt;
        const k = p.life / p.max;
        const a = .12 * Math.sin(Math.PI * k);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g.addColorStop(0, `rgba(255,250,244,${a})`);
        g.addColorStop(1, 'rgba(255,250,244,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      requestAnimationFrame(draw);
    }

    function setRunning() {
      const should = visible && !document.hidden && !reduceMotion.matches;
      if (should && !running) { running = true; last = 0; requestAnimationFrame(draw); }
      if (!should && running) { running = false; ctx.clearRect(0, 0, W, H); }
    }

    layout();
    window.addEventListener('resize', layout);
    document.addEventListener('visibilitychange', setRunning);
    reduceMotion.addEventListener('change', setRunning);
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; setRunning(); }).observe(canvas);
  })();

  /* ---------- فيديو من الصاج لإيدك ---------- */
  (function story() {
    const section = $('#story');
    const video = $('#storyVideo');
    const title = $('#storyTitle');
    const cta = $('#storyCta');
    const missing = $('#storyMissing');
    let duration = 0, target = 0, current = 0, active = false, broken = false;

    function showMissing() {
      broken = true;
      video.hidden = true;
      missing.hidden = false;
    }
    video.addEventListener('error', showMissing);
    // إذا الغلط صار قبل ما السكربت يشتغل
    if (video.error || video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) showMissing();
    function onMeta() {
      duration = video.duration || 0;
      // فيديو دقته واطية: صورة أول لقطة بتبين لحد ما يحمّل
      if (video.videoWidth && video.videoWidth < 720 && video.dataset.poster && !video.poster) video.poster = video.dataset.poster;
    }
    video.addEventListener('loadedmetadata', () => { onMeta(); video.currentTime = 0.001; });
    if (video.readyState >= 1) onMeta();
    // بعض المتصفحات ما بتطلع error على عنصر الفيديو لحاله
    fetch(video.currentSrc || video.src, { method: 'HEAD' }).then(r => { if (!r.ok) showMissing(); }).catch(() => {});

    function progress() {
      const rect = section.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      return total > 0 ? clamp(-rect.top / total, 0, 1) : 0;
    }

    function frame() {
      if (!active) return;
      const p = progress();
      video.style.opacity = broken ? 0 : clamp(p / 0.1, 0, 1).toFixed(3);
      title.style.opacity = clamp(1 - (p - 0.15) / 0.35, 0, 1).toFixed(3);
      cta.classList.toggle('is-on', p >= 0.9);
      if (duration && !broken) {
        target = clamp(p / 0.9, 0, 1) * (duration - 0.05);
        current += (target - current) * (reduceMotion.matches ? 1 : 0.3);
        if (Math.abs(video.currentTime - current) > 0.015 && !video.seeking) video.currentTime = current;
      }
      requestAnimationFrame(frame);
    }

    new IntersectionObserver(([e]) => {
      active = e.isIntersecting;
      if (active) requestAnimationFrame(frame);
    }, { rootMargin: '200px 0px' }).observe(section);
  })();

  /* ---------- شيل الخلفية السودا من صور الكومات ---------- */
  const layerCache = new Map();
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = src;
    });
  }

  function cutout(name) {
    if (layerCache.has(name)) return layerCache.get(name);
    const job = loadImage(`/assets/layer-${name}.webp`).then(im => {
      const MAX = 640;
      const scale = Math.min(1, MAX / Math.max(im.naturalWidth, im.naturalHeight));
      const w = Math.round(im.naturalWidth * scale), h = Math.round(im.naturalHeight * scale);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const cx = c.getContext('2d', { willReadFrequently: true });
      cx.drawImage(im, 0, 0, w, h);
      const data = cx.getImageData(0, 0, w, h);
      const px = data.data;

      // لون الخلفية: أغمق زاوية
      const S = 6;
      const corners = [[0, 0], [w - S, 0], [0, h - S], [w - S, h - S]].map(([x0, y0]) => {
        let r = 0, g = 0, b = 0;
        for (let y = y0; y < y0 + S; y++) for (let x = x0; x < x0 + S; x++) {
          const i = (y * w + x) * 4; r += px[i]; g += px[i + 1]; b += px[i + 2];
        }
        const n = S * S;
        return [r / n, g / n, b / n];
      });
      const bg = corners.reduce((a, c2) => (c2[0] + c2[1] + c2[2] < a[0] + a[1] + a[2] ? c2 : a));
      const TOL = 36;
      const dist = i => Math.max(Math.abs(px[i] - bg[0]), Math.abs(px[i + 1] - bg[1]), Math.abs(px[i + 2] - bg[2]));

      // flood fill من الأطراف لجوا
      const isBg = new Uint8Array(w * h);
      const queue = new Int32Array(w * h);
      let head = 0, tail = 0;
      const push = (x, y) => {
        const k = y * w + x;
        if (isBg[k]) return;
        if (dist(k * 4) > TOL) return;
        isBg[k] = 1; queue[tail++] = k;
      };
      for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
      for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
      while (head < tail) {
        const k = queue[head++];
        const x = k % w, y = (k / w) | 0;
        if (x > 0) push(x - 1, y);
        if (x < w - 1) push(x + 1, y);
        if (y > 0) push(x, y - 1);
        if (y < h - 1) push(x, y + 1);
      }

      for (let k = 0; k < w * h; k++) {
        const i = k * 4;
        if (isBg[k]) { px[i + 3] = 0; continue; }
        // حواف ناعمة: البكسل الملاصق للخلفية بياخد شفافية حسب بعده عن لونها
        const x = k % w, y = (k / w) | 0;
        const edge = (x > 0 && isBg[k - 1]) || (x < w - 1 && isBg[k + 1]) || (y > 0 && isBg[k - w]) || (y < h - 1 && isBg[k + w]);
        if (edge) px[i + 3] = Math.round(255 * clamp((dist(i) - TOL) / TOL, 0.15, 1));
        // بقايا الخلفية: غامق ورمادي حتى لو مش موصول بالأطراف
        const mx = Math.max(px[i], px[i + 1], px[i + 2]);
        const mn = Math.min(px[i], px[i + 1], px[i + 2]);
        if (mx < 95 && mx - mn < 30) px[i + 3] = 0;
      }

      // قص الفراغ حوالين الكومة
      let minX = w, minY = h, maxX = -1, maxY = -1;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (px[(y * w + x) * 4 + 3] > 12) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
      if (maxX < 0) return null;
      cx.putImageData(data, 0, 0);
      const out = document.createElement('canvas');
      out.width = maxX - minX + 1; out.height = maxY - minY + 1;
      out.getContext('2d').drawImage(c, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
      return out.toDataURL('image/png');
    }).catch(() => null);
    layerCache.set(name, job);
    return job;
  }

  /* ---------- المنيو ---------- */
  let activeCat = M.CATEGORIES[0].id;
  const tabsBox = $('#menuTabs');
  const grid = $('#menuGrid');

  function renderTabs() {
    tabsBox.innerHTML = '';
    for (const cat of M.CATEGORIES) {
      const on = cat.id === activeCat;
      tabsBox.append(el('button', {
        class: 'btn', type: 'button', role: 'tab', id: `tab-${cat.id}`,
        'aria-selected': String(on), 'aria-controls': 'menuGrid', tabindex: on ? '0' : '-1',
        text: cat.ar,
        onclick: () => selectCat(cat.id, false)
      }));
    }
    grid.setAttribute('aria-labelledby', `tab-${activeCat}`);
  }

  function selectCat(id, focus) {
    activeCat = id;
    renderTabs();
    renderGrid();
    if (focus) $(`#tab-${id}`).focus();
  }

  tabsBox.addEventListener('keydown', e => {
    const ids = M.CATEGORIES.map(c => c.id);
    let i = ids.indexOf(activeCat);
    const rtl = document.documentElement.dir === 'rtl';
    if (e.key === 'ArrowLeft') i += rtl ? 1 : -1;
    else if (e.key === 'ArrowRight') i += rtl ? -1 : 1;
    else if (e.key === 'Home') i = 0;
    else if (e.key === 'End') i = ids.length - 1;
    else return;
    e.preventDefault();
    selectCat(ids[(i + ids.length) % ids.length], true);
  });

  function renderGrid() {
    grid.innerHTML = '';
    for (const item of M.ITEMS.filter(i => i.cat === activeCat)) {
      const card = el('button', { class: 'card', type: 'button', 'data-id': item.id }, [
        el('span', { class: 'card-img' }, el('img', { src: `/assets/menu-${item.id}.jpg`, alt: item.name, width: 800, height: 600, loading: 'lazy', decoding: 'async' })),
        el('span', { class: 'card-body' }, [
          el('span', { class: 'card-name', text: item.name }),
          el('span', { class: 'card-desc', text: item.desc }),
          el('span', { class: 'card-price', text: money(item.price) })
        ])
      ]);
      card.addEventListener('click', () => openSheet(item, card));
      grid.append(card);
    }
  }
  renderTabs();
  renderGrid();

  /* ---------- نافذة التخصيص ---------- */
  const overlay = $('#overlay');
  const sheet = $('#sheet');
  const visual = $('#sheetVisual');
  const ingList = $('#ingList');
  const qtyVal = $('#qtyVal');
  const addBtn = $('#addBtn');
  const LEVEL_LABELS = { none: 'بدون', normal: 'عادي', extra: 'زيادة' };
  let cur = null; // { item, mods, qty, opener, piles }

  function unitPrice(item, mods) {
    const extras = item.mods.filter(m => mods[m] === 'extra').length;
    return Math.round((item.price + extras * M.EXTRA_PRICE) * 100) / 100;
  }

  function modsText(item, mods) {
    return item.mods
      .filter(m => mods[m] && mods[m] !== 'normal')
      .map(m => (mods[m] === 'extra' ? 'زيادة ' : 'بدون ') + M.INGREDIENTS[m].ar)
      .join('، ');
  }

  function makePile(name, geo, extra) {
    const pile = el('div', { class: 'pile' + (extra ? ' is-extra' : '') });
    const x = geo.x + (extra ? 9 : 0);
    const y = geo.y + (extra ? 9 : 0);
    pile.style.left = x + '%';
    pile.style.top = y + '%';
    pile.style.width = geo.w + '%';
    pile.style.zIndex = geo.z + (extra ? 1 : 0);
    cutout(name).then(src => {
      if (!src) { pile.remove(); return; } // ما إلها صورة: ما بنرسم إشي
      pile.append(el('img', { src, alt: '' }));
    });
    return pile;
  }

  function renderVisual() {
    const { item } = cur;
    visual.innerHTML = '';
    cur.piles = {};
    const photo = () => el('img', { class: 'item-photo', src: `/assets/menu-${item.id}.jpg`, alt: item.name });
    if (item.cat !== 'sandwiches') { visual.append(photo()); return; }
    // الخبزة بتنعرض بس إذا في صورة كومة للمكون الأساسي (لحمة، فلافل...).
    // غير هيك بنعرض صورة السندويشة الحقيقية، عشان ما تطلع خبزة فاضية.
    const token = cur;
    visual.append(el('div', { class: 'visual-wait', 'aria-hidden': 'true' }));
    Promise.all(item.base.map(cutout)).then(results => {
      if (cur !== token) return;
      visual.innerHTML = '';
      const bases = item.base.filter((b, i) => results[i]);
      if (!bases.length) { visual.append(photo()); return; }
      buildPlate(item, bases);
    });
  }

  function buildPlate(item, bases) {
    const plate = el('div', { class: 'wrap-plate', role: 'img', 'aria-label': `خبزة ${item.name} مع المكونات يلي اخترتها` });
    plate.append(el('img', { class: 'bread', src: '/assets/shot-1.webp', alt: '' }));
    const two = bases.length > 1;
    bases.forEach((b, i) => {
      const g = M.INGREDIENTS[b];
      const geo = two ? { ...g, x: i ? 58 : 42, y: i ? 56 : 44, w: 50 } : g;
      plate.append(makePile(b, geo, false));
    });
    for (const m of item.mods) {
      const g = M.INGREDIENTS[m];
      if (g.x == null) continue;
      const main = makePile(m, g, false);
      const extra = makePile(m, g, true);
      cur.piles[m] = { main, extra };
      plate.append(main, extra);
    }
    visual.append(plate);
    syncPiles();
  }

  function syncPiles() {
    for (const [m, { main, extra }] of Object.entries(cur.piles)) {
      const lvl = cur.mods[m];
      main.classList.toggle('is-off', lvl === 'none');
      extra.classList.toggle('is-off', lvl !== 'extra');
    }
  }

  function thumbFor(name) {
    const img = el('img', { src: `/assets/ing-${name}.jpg`, alt: '' });
    img.addEventListener('error', function onErr() {
      if (img.dataset.step === 'layer') { img.remove(); return; }
      img.dataset.step = 'layer';
      img.src = `/assets/layer-${name}.webp`;
    });
    return el('span', { class: 'ing-thumb' }, img);
  }

  function renderIngredients() {
    const { item } = cur;
    ingList.innerHTML = '';
    for (const m of item.mods) {
      const name = M.INGREDIENTS[m].ar;
      const group = el('div', { class: 'levels', role: 'radiogroup', 'aria-label': name });
      for (const lvl of M.LEVELS) {
        const id = `lvl-${m}-${lvl}`;
        const input = el('input', { class: 'sr', type: 'radio', name: `lvl-${m}`, id, value: lvl });
        input.checked = cur.mods[m] === lvl;
        input.addEventListener('change', () => { cur.mods[m] = lvl; syncPiles(); updatePrice(); });
        group.append(input, el('label', { class: 'btn', for: id, text: LEVEL_LABELS[lvl] }));
      }
      ingList.append(el('li', { class: 'ing' }, [thumbFor(m), el('span', { class: 'ing-name', text: name }), group]));
    }
  }

  function updatePrice() {
    qtyVal.textContent = cur.qty;
    $('#qtyMinus').disabled = cur.qty <= 1;
    addBtn.textContent = `زيد عالسلة (${money(unitPrice(cur.item, cur.mods) * cur.qty)})`;
  }

  function openSheet(item, opener) {
    const mods = {};
    for (const m of item.mods) mods[m] = 'normal';
    cur = { item, mods, qty: 1, opener, piles: {} };
    $('#sheetTitle').textContent = item.name;
    $('#sheetDesc').textContent = item.desc;
    renderVisual();
    renderIngredients();
    updatePrice();
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    $('.sheet-body', sheet).scrollTop = 0;
    $('#sheetClose').focus();
  }

  function closeSheet() {
    if (overlay.hidden) return;
    overlay.hidden = true;
    document.body.style.overflow = '';
    const opener = cur && cur.opener;
    cur = null;
    if (opener && document.contains(opener)) opener.focus();
  }

  $('#sheetClose').addEventListener('click', closeSheet);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeSheet(); });
  $('#qtyMinus').addEventListener('click', () => { if (cur.qty > 1) { cur.qty--; updatePrice(); } });
  $('#qtyPlus').addEventListener('click', () => { if (cur.qty < 20) { cur.qty++; updatePrice(); } });
  addBtn.addEventListener('click', () => {
    addToCart(cur.item.id, cur.mods, cur.qty);
    const name = cur.item.name;
    closeSheet();
    toast({ plain: true, text: `انضاف «${name}» للسلة.` });
  });

  document.addEventListener('keydown', e => {
    if (overlay.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); closeSheet(); return; }
    if (e.key === 'Tab') {
      const f = $$('button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])', sheet)
        .filter(n => n.offsetParent !== null || n.matches('input.sr'));
      // الراديو بكل مجموعة بيتنقل بالأسهم، فبناخد الأول والآخر بس
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // جهّز صور الكومات بالخلفية بعد ما الصفحة تهدى
  const warm = () => ['chicken', 'meat', 'falafel', 'toum', 'pickle', 'turnip', 'fries', 'tomato', 'molasses'].forEach(cutout);
  if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 4000 }); else setTimeout(warm, 2500);

  /* ---------- السلة ---------- */
  let cart = store.get('jamr-cart', []).filter(l => itemById(l.id));

  function lineKey(id, mods) {
    return id + '|' + Object.keys(mods).sort().map(k => `${k}:${mods[k]}`).join(',');
  }

  function addToCart(id, mods, qty) {
    const key = lineKey(id, mods);
    const line = cart.find(l => l.key === key);
    if (line) line.qty = Math.min(20, line.qty + qty);
    else cart.push({ key, id, mods: { ...mods }, qty });
    saveCart();
  }

  function saveCart() { store.set('jamr-cart', cart); renderCart(); }

  function cartSubtotal() {
    return cart.reduce((s, l) => s + unitPrice(itemById(l.id), l.mods) * l.qty, 0);
  }

  function countLabel(n) {
    if (n === 1) return 'صنف واحد';
    if (n === 2) return 'صنفين';
    if (n <= 10) return `${n} أصناف`;
    return `${n} صنف`;
  }

  function renderCart() {
    const count = cart.reduce((s, l) => s + l.qty, 0);
    $('#cartCount').textContent = countLabel(count);
    $('#cartTotal').textContent = money(cartSubtotal());
    const show = count > 0 && currentView === 'home';
    $('#cartbar').hidden = !show;
    document.body.classList.toggle('has-cart', show);
    if (currentView === 'checkout') renderInvoice();
  }

  /* ---------- التنقل بين الصفحات ---------- */
  let currentView = 'home';
  function route() {
    const hash = location.hash;
    const view = hash === '#checkout' ? 'checkout' : hash === '#track' ? 'track' : 'home';
    const changed = view !== currentView;
    currentView = view;
    $('#home').hidden = view !== 'home';
    $('#checkout').hidden = view !== 'checkout';
    $('#track').hidden = view !== 'track';
    if (view !== 'track') stopTracking();
    renderCart();
    if (view === 'checkout') { renderInvoice(); if (changed) { window.scrollTo(0, 0); $('#checkoutTitle').focus({ preventScroll: true }); } }
    else if (view === 'track') { startTracking(); window.scrollTo(0, 0); $('#trackTitle').focus({ preventScroll: true }); }
    else if (changed && hash && hash.length > 1) {
      const target = document.getElementById(hash.slice(1));
      if (target) requestAnimationFrame(() => target.scrollIntoView());
    }
  }
  window.addEventListener('hashchange', route);

  /* ---------- صفحة الطلب ---------- */
  // الزبون بيختار سفري أو جوا المطعم بس. وقت التجهيز بيحدده المطبخ.
  const form = $('#orderForm');

  function orderType() { return form.elements.type.value; }

  function renderInvoice() {
    const list = $('#invoiceList');
    list.innerHTML = '';
    if (!cart.length) list.append(el('li', { class: 'inv-empty', text: 'السلة فاضية. زيد صنف من المنيو.' }));
    for (const line of cart) {
      const item = itemById(line.id);
      const mt = modsText(item, line.mods);
      list.append(el('li', { class: 'inv-item' }, [
        el('span', { class: 'inv-name' }, [document.createTextNode(item.name + ' '), el('span', { dir: 'ltr', text: `×${line.qty}` })]),
        el('span', { class: 'inv-price', text: money(unitPrice(item, line.mods) * line.qty) }),
        mt ? el('span', { class: 'inv-mods', text: mt }) : null,
        el('button', {
          class: 'btn btn-sm', type: 'button', text: 'شيل', 'aria-label': `شيل ${item.name}`,
          onclick: () => { cart = cart.filter(l => l !== line); saveCart(); }
        })
      ]));
    }
    $('#totalVal').textContent = money(cartSubtotal());
  }

  function showPanel() {
    const t = orderType();
    $$('[data-panel]', form).forEach(p => { p.hidden = p.dataset.panel !== t; });
  }
  form.addEventListener('change', e => { if (e.target.name === 'type') showPanel(); });
  // رقم الطاولة: أرقام بس
  form.elements.table.addEventListener('input', e => {
    const clean = e.target.value.replace(/\D/g, '').slice(0, 2);
    if (clean !== e.target.value) e.target.value = clean;
  });

  const PHONE_RE = /^0?7[789]\d{7}$/;

  function setFieldError(input, text) {
    const field = input.closest('.field');
    let note = field && $('.field-error', field);
    if (text) {
      input.setAttribute('aria-invalid', 'true');
      if (field && !note) { note = el('span', { class: 'field-error', id: input.id + '-err' }); field.append(note); }
      if (note) { note.textContent = text; input.setAttribute('aria-describedby', note.id); }
    } else {
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-describedby');
      if (note) note.remove();
    }
  }

  function showErrors(list) {
    const box = $('#formErrors');
    if (!list.length) { box.hidden = true; box.innerHTML = ''; return; }
    box.innerHTML = '';
    box.append(el('ul', {}, list.map(t => el('li', { text: t }))));
    box.hidden = false;
  }

  function validate() {
    const errs = [];
    const f = form.elements;
    const checks = [];
    $$('[aria-invalid]', form).forEach(i => setFieldError(i, ''));
    if (!cart.length) errs.push('السلة فاضية. زيد صنف من المنيو.');
    if (orderType() === 'dinein' && f.table.value.trim()) {
      const t = Number(f.table.value);
      checks.push([f.table, Number.isInteger(t) && t >= 1 && t <= 30 ? '' : 'رقم الطاولة لازم يكون بين 1 و 30، أو خلّيه فاضي.']);
    }
    checks.push([f.name, f.name.value.trim() ? '' : 'اكتب اسمك عشان نعرف لمين الطلب.']);
    const phone = f.phone.value.replace(/[\s-]/g, '');
    checks.push([f.phone, PHONE_RE.test(phone) ? '' : 'الرقم لازم يكون أردني، متل 0791234567.']);
    let firstBad = null;
    for (const [input, text] of checks) {
      setFieldError(input, text);
      if (text) { errs.push(text); firstBad = firstBad || input; }
    }
    return { errs, firstBad };
  }

  // بعد أول محاولة، الأخطاء بتتحدث وهو عم يصلّحها
  function recheck() { if (!$('#formErrors').hidden) showErrors(validate().errs); }
  form.addEventListener('input', recheck);
  form.addEventListener('change', recheck);

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const { errs, firstBad } = validate();
    showErrors(errs);
    if (errs.length) { (firstBad || $('#formErrors')).focus(); return; }

    const f = form.elements;
    const notify = f.notify.value;
    if (notify === 'browser' && 'Notification' in window && Notification.permission === 'default') {
      try { await Notification.requestPermission(); } catch {}
    }
    const body = {
      type: orderType(),
      name: f.name.value.trim(),
      phone: f.phone.value.replace(/[\s-]/g, ''),
      notify,
      items: cart.map(l => ({ id: l.id, qty: l.qty, mods: l.mods }))
    };
    if (body.type === 'dinein' && f.table.value.trim()) body.table = Number(f.table.value);

    const btn = $('#submitBtn');
    btn.disabled = true;
    btn.textContent = 'عم نبعت الطلب…';
    try {
      const res = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { showErrors(data.errors || [data.error || 'ما قدرنا نبعت الطلب. جرّب كمان مرة.']); $('#formErrors').focus(); return; }
      store.set('jamr-order', { no: data.no, key: data.key, notify, shown: -1 });
      cart = [];
      saveCart();
      form.reset();
      showPanel();
      location.hash = '#track';
    } catch {
      showErrors(['ما قدرنا نوصل للمطعم. تأكد من الإنترنت وجرّب كمان مرة.']);
    } finally {
      btn.disabled = false;
      btn.textContent = 'ابعت الطلب';
    }
  });
  $('#formErrors').tabIndex = -1;

  /* ---------- متابعة الطلب ---------- */
  let es = null;

  // نفس رسائل الواتساب يلي بيبعتها السيرفر
  function stepMessage(o) {
    if (o.status === 0) return `أهلين ${o.name}، وصلنا طلبك رقم ${o.no}.`;
    if (o.status === 1) return o.readyIn ? `طلبك عالجمر هلأ، بيجهز خلال ${o.readyIn} دقيقة تقريباً.` : 'طلبك عالجمر هلأ.';
    if (o.status === 2) return o.type === 'dinein' ? `يا ${o.name}، أكلك طالع لطاولتك.` : `يا ${o.name}، طلبك جاهز. تفضل استلمه من الكاونتر.`;
    return 'صحتين! شكراً إنك اخترت جمر.';
  }

  function renderTrack(o) {
    $('#trackTitle').textContent = `طلب رقم ${o.no}`;
    $('#trackType').textContent = o.type === 'dinein' ? (o.table ? `جوا المطعم، طاولة ${o.table}` : 'جوا المطعم') : 'سفري';
    const ol = $('#steps');
    ol.innerHTML = '';
    o.steps.forEach((s, i) => {
      const li = el('li', { class: 'step' + (i < o.status ? ' is-done' : '') + (i === o.status ? ' is-now' : ''), text: s });
      if (i === o.status) li.setAttribute('aria-current', 'step');
      ol.append(li);
    });
    const eta = $('#trackEta');
    eta.hidden = !(o.status === 1 && o.readyIn);
    eta.textContent = o.readyIn ? `جاهز خلال ${o.readyIn} دقيقة تقريباً` : '';
    $('#trackMsg').textContent = stepMessage(o);
  }

  function startTracking() {
    const saved = store.get('jamr-order', null);
    $('#trackEta').hidden = true;
    $('#trackType').textContent = '';
    if (!saved) {
      $('#trackTitle').textContent = 'ما في طلب حالي';
      $('#steps').innerHTML = '';
      $('#trackMsg').textContent = 'اختار من المنيو وابعت طلبك، وبتقدر تتابعه من هون.';
      return;
    }
    $('#trackTitle').textContent = `طلب رقم ${saved.no}`;
    stopTracking();
    es = new EventSource(`/api/events?no=${encodeURIComponent(saved.no)}&key=${encodeURIComponent(saved.key)}`);
    es.addEventListener('status', ev => {
      const o = JSON.parse(ev.data);
      renderTrack(o);
      const s = store.get('jamr-order', saved);
      const shown = Number.isInteger(s.shown) ? s.shown : -1;
      // إشعار بس لما الطلب يتقدم لحالة جديدة. إذا المطبخ رجّعه لورا ما بنبعت إشي.
      if (o.status > shown) {
        const text = stepMessage(o);
        toast({ text });
        if (s.notify === 'browser' && 'Notification' in window && Notification.permission === 'granted') {
          try { new Notification('جمر', { body: window.JamrI18n ? window.JamrI18n.tr(text) : text, tag: `jamr-${o.no}-${o.status}` }); } catch {}
        }
        store.set('jamr-order', { ...s, shown: o.status });
      }
    });
    es.addEventListener('error', () => {
      if (es && es.readyState === EventSource.CLOSED) {
        $('#trackMsg').textContent = 'ما لقينا هالطلب. إذا عندك سؤال، اتصل فينا على 078 618 1892.';
      }
    });
  }

  function stopTracking() { if (es) { es.close(); es = null; } }

  /* ---------- الإشعارات ---------- */
  function toast({ text, plain }) {
    const box = $('#toasts');
    const now = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Amman' }).format(new Date());
    const node = plain
      ? el('div', { class: 'toast toast-plain' }, el('span', { class: 'toast-text', text }))
      : el('div', { class: 'toast' }, [
          el('span', { class: 'toast-icon', 'aria-hidden': 'true', text: 'ج' }),
          el('span', { class: 'toast-head' }, [el('b', { text: 'جمر' }), el('span', { text: now })]),
          el('span', { class: 'toast-text', text })
        ]);
    box.append(node);
    setTimeout(() => { node.classList.add('is-out'); setTimeout(() => node.remove(), 350); }, plain ? 2600 : 6000);
  }

  /* ---------- البداية ---------- */
  showPanel();
  route();
})();
