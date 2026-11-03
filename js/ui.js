// Interface: cards, 3D ring, photo stack, reveals, forms.
// SECURITY: this file never writes HTML strings into the page (no innerHTML / outerHTML /
// insertAdjacentHTML / document.write). Every element is created with the DOM API and every
// piece of text is set with textContent, so user input can never become markup or script.
// The page's Content Security Policy enforces this with Trusted Types.
'use strict';
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer: fine)').matches;
const $ = (id) => document.getElementById(id);

/* ---------- Safe element builders ---------- */
function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k === 'text') el.textContent = v;
    else el.setAttribute(k, String(v));
  }
  for (const c of children.flat()) if (c != null) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}
const SVGNS = 'http://www.w3.org/2000/svg';
function svg(paths, attrs) {
  const s = document.createElementNS(SVGNS, 'svg');
  const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.4', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', ...attrs };
  for (const [k, v] of Object.entries(base)) s.setAttribute(k, v);
  for (const p of paths) {
    const [tag, a] = p;
    const n = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(a)) n.setAttribute(k, v);
    s.append(n);
  }
  return s;
}
const arrowIcon = () => svg([['path', { d: 'M7 17L17 7M8 7h9v9' }]]);

/* ---------- Nav ---------- */
const nav = $('nav');
const onScrollNav = () => nav.classList.toggle('solid', document.documentElement.classList.contains('menu-open') || scrollY > $('fly').offsetHeight - innerHeight * 1.05);
addEventListener('scroll', onScrollNav, { passive: true }); onScrollNav();

/* ---------- Allowed values (whitelists) ---------- */
const DESTS_INDIA = ['Ooty', 'Munnar', 'Alleppey', 'Mysore', 'Coorg', 'Kodaikanal', 'Goa', 'Jaipur', 'Kullu Manali', 'Andaman Islands'];
const DESTS_INTL = ['Sri Lanka', 'Malaysia', 'Thailand', 'Singapore'];
const DEST_ALLOWED = new Set(['Not decided — suggest one', ...DESTS_INDIA, ...DESTS_INTL]);
const TYPE_ALLOWED = new Set(['Family', 'Students', 'Corporate', 'Honeymoon', 'Pilgrimage', 'Industrial visit', 'Weekend trip', 'Custom']);

/* ---------- Trip chips + finder ---------- */
const chips = $('chips');
['Family', 'Students', 'Corporate', 'Honeymoon', 'Pilgrimage', 'Weekend'].forEach((t, i) => {
  const b = h('button', { type: 'button', class: 'chip', 'aria-pressed': i === 0 ? 'true' : 'false', text: t });
  b.addEventListener('click', () => { chips.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); });
  chips.append(b);
});
$('finder').addEventListener('submit', (e) => {
  e.preventDefault();
  const type = chips.querySelector('[aria-pressed="true"]').textContent;
  const t = type === 'Weekend' ? 'Weekend trip' : type;
  if (TYPE_ALLOWED.has(t)) $('eType').value = t;
  const dest = $('fDest').value, when = $('fWhen').value, size = $('fSize').value;
  if (DEST_ALLOWED.has(dest)) $('eDest').value = dest;
  if (/^\d{4}-\d{2}$/.test(when)) $('eDate').value = when + '-01';
  const n = parseInt(size, 10); if (n > 0 && n <= 500) $('eCount').value = n;
  $('eMsg').value = ('Group size: ' + size + (when ? ', any dates in that month' : '')).slice(0, 500);
  const planEl = $('plan');
  if (window.lenis) window.lenis.scrollTo(planEl, { offset: -84, duration: 1.6 }); else planEl.scrollIntoView();
  setTimeout(() => $('eName').focus({ preventScroll: true }), 1700);
});

/* ---------- Destination tilt cards ---------- */
const dests = [
  ['Ooty', 'Tamil Nadu', 'Hill station', 'ooty'],
  ['Munnar', 'Kerala', 'Tea country', 'munnar'],
  ['Alleppey', 'Kerala', 'Backwaters', 'alleppey'],
  ['Mysore', 'Karnataka', 'Heritage', 'mysore'],
  ['Goa', 'Baga Beach', 'Beaches', 'goa'],
  ['Jaipur', 'Rajasthan', 'Forts & palaces', 'jaipur'],
  ['Kullu Manali', 'Himachal', 'Mountains', 'manali'],
];
const abroad = [
  ['Andaman Islands', 'Havelock & Neil, India', 'Islands', 'andaman'],
  ['Sri Lanka', 'Nine Arch Bridge, Ella', 'International', 'srilanka'],
  ['Malaysia', 'Kuala Lumpur', 'International', 'malaysia'],
  ['Thailand', 'Phi Phi Islands, Krabi', 'International', 'thailand'],
  ['Singapore', 'Marina Bay', 'International', 'singapore'],
];
const CARD_SIZE = {
  india: 'h-[440px] w-[80vw] max-w-[330px] shrink-0 md:w-auto md:max-w-none',
  intl: 'h-[460px] w-[80vw] max-w-[330px] shrink-0 md:w-auto md:max-w-none',
};
const makeCard = ([n, r, tag, img], i, size) => {
  const a = h('a', { href: '#plan', class: 'tilt reveal ' + size, 'data-dest': n, style: `transition-delay:${(i % 5) * 80}ms` },
    h('div', { class: 'card' },
      h('div', { class: 'ph' }, h('img', { src: `img/${img}.webp`, alt: `${n}, ${r}`, loading: 'lazy' })),
      h('div', { class: 'glare' }),
      h('span', { class: 'tag', text: tag }),
      h('div', { class: 'meta' },
        h('div', null, h('h3', { text: n }), h('p', { text: r })),
        h('span', { class: 'go' }, arrowIcon()))));
  return a;
};
const dgrid = $('dgrid'), igrid = $('igrid');
dests.forEach((d, i) => dgrid.append(makeCard(d, i, CARD_SIZE.india)));
abroad.forEach((d, i) => igrid.append(makeCard(d, i, CARD_SIZE.intl)));
dgrid.append(h('a', { href: '#plan', class: 'tilt cta reveal ' + CARD_SIZE.india },
  h('div', { class: 'card' },
    svg([['circle', { cx: '12', cy: '12', r: '9' }], ['path', { d: 'M15.5 8.5l-2 5-5 2 2-5z' }]], { class: 'compass', 'stroke-width': '1.6' }),
    h('div', { class: 'inner' },
      h('h3', { text: 'Somewhere else in mind?' }),
      h('p', { text: 'Kodaikanal, Coorg, Kanyakumari, Mahabalipuram, Thekkady — tell us your dates, budget and group size.' }),
      h('b', { style: 'text-decoration:underline;text-underline-offset:4px', text: 'Design a custom tour' })))));
document.addEventListener('click', (e) => {
  const card = e.target.closest && e.target.closest('.tilt[data-dest]');
  if (card && DEST_ALLOWED.has(card.dataset.dest)) $('eDest').value = card.dataset.dest;
});

if (fine && !reduce) {
  document.querySelectorAll('.tilt').forEach(el => {
    const card = el.querySelector('.card'), glare = el.querySelector('.glare'), img = el.querySelector('.ph img');
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      card.style.transition = 'transform .12s ease-out, box-shadow .5s';
      card.style.transform = `rotateY(${(px - .5) * 18}deg) rotateX(${(.5 - py) * 16}deg) translateZ(20px)`;
      if (img) img.style.transform = `scale(1.16) translate(${(.5 - px) * 14}px, ${(.5 - py) * 14}px)`;
      if (glare) glare.style.background = `radial-gradient(circle at ${px * 100}% ${py * 100}%, rgba(255,255,255,.75), rgba(255,255,255,0) 55%)`;
    });
    el.addEventListener('pointerleave', () => { card.style.transition = ''; card.style.transform = ''; if (img) img.style.transform = ''; });
  });
}

/* ---------- 3D ring carousel ---------- */
const tours = [
  ['01', 'Student tours', 'Educational trips for schools and colleges — permissions, escorts and night stays handled.', 'students'],
  ['02', 'Family tours', 'Unhurried itineraries for kids and elders, comfortable stays and short driving days.', 'family'],
  ['03', 'Corporate tours', 'Offsites, dealer meets and team outings — GST invoicing and a single point of contact.', 'corporate'],
  ['04', 'Honeymoon', 'Quiet resorts, private transfers and a relaxed route.', 'alleppey'],
  ['05', 'Pilgrimage', 'Temple circuits across the south — darshan timings, priest coordination, pure-veg meals.', 'madurai'],
  ['06', 'Industrial visits', 'Factory and plant visits with slots confirmed in advance and reports for departments.', 'toytrain'],
  ['07', 'Weekend trips', 'Leave Friday night from Tiruppur or Coimbatore, back by Sunday.', 'ooty'],
  ['08', 'Custom tours', 'Built around your dates, budget and group size.', 'munnar'],
];
const ring = $('ring'), stage = $('ringstage');
const N = tours.length, STEP = 360 / N;
const slots = tours.map(([num, t, , img]) => {
  const s = h('div', { class: 'slot' },
    h('img', { src: `img/${img}.webp`, alt: '', loading: 'lazy', draggable: 'false' }),
    h('div', { class: 'lbl' }, h('small', { text: num }), h('b', { text: t })));
  ring.append(s); return s;
});
let radius = 0;
const layoutRing = () => {
  radius = Math.round((ring.offsetWidth / 2) / Math.tan(Math.PI / N) + (innerWidth < 700 ? 30 : 70));
  slots.forEach((s, i) => s.style.transform = `rotateY(${i * STEP}deg) translateZ(${radius}px)`);
};
layoutRing(); addEventListener('resize', layoutRing);
let angle = 0, target = 0, drag = null, lastActive = -1, auto = true;
const rTitle = $('ringTitle'), rBody = $('ringBody');
const setActive = (i) => { if (i === lastActive) return; lastActive = i; rTitle.textContent = tours[i][1]; rBody.textContent = tours[i][2]; };
const snap = () => { target = Math.round(target / STEP) * STEP; };
$('prev').addEventListener('click', () => { auto = false; target = Math.round(target / STEP) * STEP + STEP; });
$('next').addEventListener('click', () => { auto = false; target = Math.round(target / STEP) * STEP - STEP; });
stage.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, t: target }; auto = false; stage.setPointerCapture(e.pointerId); });
stage.addEventListener('pointermove', (e) => { if (drag) target = drag.t + (e.clientX - drag.x) * 0.35; });
const endDrag = () => { if (drag) { drag = null; snap(); } };
stage.addEventListener('pointerup', endDrag); stage.addEventListener('pointercancel', endDrag);
let ringVisible = false;
new IntersectionObserver(([e]) => { ringVisible = e.isIntersecting; }, { threshold: 0 }).observe(stage);
let autoTimer = 0;
function ringTick(t) {
  if (ringVisible) {
    if (auto && !reduce && t - autoTimer > 3200) { autoTimer = t; target -= STEP; }
    angle += (target - angle) * (reduce ? 1 : 0.08);
    ring.style.transform = `translateZ(${-radius}px) rotateX(-6deg) rotateY(${angle}deg)`;
    slots.forEach((s, i) => {
      let a = ((i * STEP + angle) % 360 + 360) % 360; if (a > 180) a -= 360;
      const f = Math.max(0, Math.cos(a * Math.PI / 180));
      s.style.opacity = (0.25 + 0.75 * f).toFixed(3);
      s.style.filter = `brightness(${(0.45 + 0.55 * f).toFixed(3)})`;
    });
    setActive(((Math.round(-angle / STEP) % N) + N) % N);
  }
  requestAnimationFrame(ringTick);
}
requestAnimationFrame(ringTick);

/* ---------- Reasons ---------- */
[
  ['Safe & reliable', 'Verified drivers, tracked vehicles and a coordinator with every group.'],
  ['Best price guarantee', 'Itemised quotes with no hidden extras. We match comparable written offers.'],
  ['Expert local guides', 'Guides who know the sites — and the best time to arrive.'],
  ['Comfortable stays', 'Hotels we have inspected, early room blocks and group-friendly food.'],
  ['24×7 support', 'One number that reaches a real person, from enquiry to drop-off.'],
].forEach(([t, b], i) => {
  $('reasons').append(h('li', { class: 'reveal flex gap-5 border-t border-white/15 py-6 last:border-b sm:gap-6', style: `transition-delay:${i * 70}ms` },
    h('span', { class: 'min-w-[32px] font-display text-[17px] font-bold text-accent', text: '0' + (i + 1) }),
    h('div', null, h('h3', { class: 'text-[24px] font-bold sm:text-[28px]', text: t }), h('p', { class: 'mt-2 text-[16px] leading-relaxed text-muted-d', text: b }))));
});

/* ---------- Floating photo stack ---------- */
const stack = $('stack'), sw = $('stackwrap');
let mx = 0, my = 0;
if (fine && !reduce) sw.addEventListener('pointermove', (e) => { const r = sw.getBoundingClientRect(); mx = (e.clientX - r.left) / r.width - .5; my = (e.clientY - r.top) / r.height - .5; });
sw.addEventListener('pointerleave', () => { mx = 0; my = 0; });
(function stackTick() {
  const r = sw.getBoundingClientRect();
  if (r.bottom > 0 && r.top < innerHeight && !reduce) {
    const p = (r.top + r.height / 2) / innerHeight - .5;
    stack.style.transform = `rotateX(${(p * 18 - my * 10).toFixed(2)}deg) rotateY(${(-14 + mx * 18).toFixed(2)}deg)`;
  }
  requestAnimationFrame(stackTick);
})();

/* ---------- Reveal on scroll ---------- */
const io = new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

/* =====================================================================
   FORM SECURITY: validation, sanitising, anti-spam
   ===================================================================== */
const LIMITS = { name: 60, phone: 18, msg: 500, email: 254 };
// Remove invisible/control characters (incl. bidi overrides used to disguise text), normalise Unicode.
function clean(str, keepNewlines) {
  let s = String(str || '').normalize('NFKC');
  s = s.replace(/[​-‏‪-‮⁦-⁩﻿]/g, '');
  s = keepNewlines ? s.replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '') : s.replace(/[\u0000-\u001F\u007F]/g, ' ');
  s = keepNewlines ? s.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n') : s.replace(/\s+/g, ' ');
  return s.trim();
}
const HAS_MARKUP = /[<>]|&#|&[a-z]+;|javascript:|data:|vbscript:|\bon\w+\s*=|\{\{|\$\{|<\/?script/i;
const HAS_LINK = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|in|io|xyz|ru|cn|top|info|biz|link|click|app|me)\b|bit\.ly|t\.me\/|wa\.me\/)/i;
const NAME_OK = /^[\p{L}\p{M}][\p{L}\p{M} .'’-]{1,59}$/u;
const EMAIL_OK = /^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,185}\.[A-Za-z]{2,24}$/;

function validPhone(raw) {
  if (!/^\+?[\d\s()-]{10,18}$/.test(raw)) return false;
  const d = raw.replace(/\D/g, '');
  if (d.length === 10) return /^[6-9]/.test(d);                 // Indian mobile
  if (d.length === 11 && d[0] === '0') return /^0[6-9]/.test(d);
  if (d.length === 12 && d.startsWith('91')) return /^91[6-9]/.test(d);
  return raw.trim().startsWith('+') && d.length >= 10 && d.length <= 13; // international with country code
}
// Simple client-side rate limit: 30 s between sends, max 3 per 10 minutes (per browser session).
const RL_KEY = 'mvx_enq_times';
function rateLimited() {
  let times = [];
  try { times = JSON.parse(sessionStorage.getItem(RL_KEY) || '[]').filter(t => typeof t === 'number'); } catch (_) {}
  const now = Date.now();
  times = times.filter(t => now - t < 10 * 60 * 1000);
  if (times.length && now - times[times.length - 1] < 30 * 1000) return 'Please wait a few seconds before sending again.';
  if (times.length >= 3) return 'You have sent several enquiries already. Please call us on +91 81108 49375.';
  times.push(now);
  try { sessionStorage.setItem(RL_KEY, JSON.stringify(times)); } catch (_) {}
  return '';
}
const pageLoaded = Date.now();

const WA_NUMBER = '918110849375';
const form = $('enquiry');
function setErr(input, errEl, msg) {
  input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  errEl.textContent = msg || '';
}
function showDone(parts) {
  const done = $('done');
  done.replaceChildren(...parts);
  done.classList.add('show');
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = clean($('eName').value), phone = clean($('ePhone').value), msg = clean($('eMsg').value, true);
  const dest = $('eDest').value, type = $('eType').value, dateRaw = $('eDate').value, countRaw = $('eCount').value.trim();
  const errs = [];

  // Honeypot (hidden field humans never see) and too-fast submits = bot. Pretend success, send nothing.
  if ($('eWebsite').value || Date.now() - pageLoaded < 3000) {
    showDone([h('b', { text: 'Thank you!' }), ' We will be in touch shortly.']);
    form.reset(); return;
  }

  if (!name || name.length < 2) { setErr($('eName'), $('eNameErr'), 'Please enter your name.'); errs.push($('eName')); }
  else if (HAS_MARKUP.test(name) || HAS_LINK.test(name) || !NAME_OK.test(name)) { setErr($('eName'), $('eNameErr'), 'Please use letters only (spaces, dots and hyphens are fine).'); errs.push($('eName')); }
  else setErr($('eName'), $('eNameErr'));

  if (!validPhone(phone)) { setErr($('ePhone'), $('ePhoneErr'), 'Please enter a valid mobile number, e.g. 98765 43210 or +65 9123 4567.'); errs.push($('ePhone')); }
  else setErr($('ePhone'), $('ePhoneErr'));

  if (msg.length > LIMITS.msg) { setErr($('eMsg'), $('eMsgErr'), `Please keep this under ${LIMITS.msg} characters.`); errs.push($('eMsg')); }
  else if (HAS_MARKUP.test(msg)) { setErr($('eMsg'), $('eMsgErr'), 'Please remove code or special symbols like < and >.'); errs.push($('eMsg')); }
  else if (HAS_LINK.test(msg)) { setErr($('eMsg'), $('eMsgErr'), 'Please don’t include website links — just describe your trip.'); errs.push($('eMsg')); }
  else setErr($('eMsg'), $('eMsgErr'));

  let count = '';
  if (countRaw) {
    const n = Number(countRaw);
    if (!Number.isInteger(n) || n < 1 || n > 500) { setErr($('eCount'), $('eCountErr'), 'Enter a number from 1 to 500.'); errs.push($('eCount')); }
    else { count = String(n); setErr($('eCount'), $('eCountErr')); }
  } else setErr($('eCount'), $('eCountErr'));

  let dateTxt = 'Flexible';
  if (dateRaw) {
    const ok = /^\d{4}-\d{2}-\d{2}$/.test(dateRaw);
    const d = ok ? new Date(dateRaw + 'T00:00') : null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const max = new Date(today); max.setFullYear(max.getFullYear() + 2);
    if (!d || isNaN(d) || d < today || d > max) { setErr($('eDate'), $('eDateErr'), 'Choose a date between today and two years from now.'); errs.push($('eDate')); }
    else { dateTxt = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); setErr($('eDate'), $('eDateErr')); }
  } else setErr($('eDate'), $('eDateErr'));

  // Dropdowns must be one of our own options (blocks tampered values)
  const safeDest = DEST_ALLOWED.has(dest) ? dest : 'Not decided — suggest one';
  const safeType = TYPE_ALLOWED.has(type) ? type : 'Custom';

  if (errs.length) { errs[0].focus(); return; }
  const limited = rateLimited();
  if (limited) { showDone([limited]); return; }

  // Strip WhatsApp formatting characters from user text so it can't restyle the message
  const wa = (s) => s.replace(/[*_~`]/g, '');
  const lines = [
    '*New trip enquiry — Maverick Expeditions website*', '',
    `*Name:* ${wa(name)}`,
    `*Phone:* ${wa(phone)}`,
    `*Destination:* ${safeDest}`,
    `*Trip type:* ${safeType}`,
    `*Travel date:* ${dateTxt}`,
    `*Travellers:* ${count || 'Not specified'}`,
  ];
  if (msg) lines.push(`*Details:* ${wa(msg)}`);
  lines.push('', 'Please send me a free itinerary and quote.');
  const url = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(lines.join('\n'));

  let opened = null;
  try { opened = window.open(url, '_blank'); if (opened) opened.opener = null; } catch (_) {}
  const first = name.split(' ')[0];
  showDone([
    h('b', { text: `Thanks, ${first}!` }), ' ',
    opened ? 'WhatsApp has opened with your enquiry — tap ' : 'Tap the button to open WhatsApp with your enquiry, then tap ',
    h('b', { text: 'Send' }), opened ? ' to reach us.' : '.',
    h('br'),
    h('a', { class: 'wa-btn', href: url, target: '_blank', rel: 'noopener noreferrer', text: 'Open WhatsApp' }),
    h('br'),
    h('span', { style: 'font-size:13px', text: 'Or call +91 81108 49375 · +91 73395 76886' }),
  ]);
});

// Live length/character guard while typing
[['eName', LIMITS.name], ['ePhone', LIMITS.phone], ['eMsg', LIMITS.msg]].forEach(([id, max]) => {
  $(id).addEventListener('input', (ev) => { if (ev.target.value.length > max) ev.target.value = ev.target.value.slice(0, max); });
});
$('ePhone').addEventListener('input', (ev) => { ev.target.value = ev.target.value.replace(/[^\d+\s()-]/g, ''); });

$('news').addEventListener('submit', (e) => {
  e.preventDefault();
  const email = clean($('nEmail').value);
  const out = $('newsDone');
  if (!EMAIL_OK.test(email) || email.length > LIMITS.email || HAS_MARKUP.test(email)) { out.textContent = 'Please enter a valid email address.'; $('nEmail').setAttribute('aria-invalid', 'true'); return; }
  $('nEmail').setAttribute('aria-invalid', 'false');
  out.textContent = 'Thanks — the live site will add you to the monthly offers list.';
  e.target.reset();
});

/* ---------- Policies & FAQ tabs ---------- */
const tabs = [...document.querySelectorAll('.tab[role="tab"]')];
const TAB_NAMES = new Set(['faq', 'terms', 'privacy']);
function selectTab(name, focus) {
  if (!TAB_NAMES.has(name)) return;
  tabs.forEach(t => {
    const on = t.dataset.tab === name;
    t.setAttribute('aria-selected', on ? 'true' : 'false');
    t.tabIndex = on ? 0 : -1;
    $(t.getAttribute('aria-controls')).hidden = !on;
    if (on && focus) t.focus();
  });
}
tabs.forEach((t, i) => {
  t.addEventListener('click', () => selectTab(t.dataset.tab));
  t.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    selectTab(n.dataset.tab, true);
  });
});
document.querySelectorAll('a[data-tab]').forEach(a => a.addEventListener('click', () => selectTab(a.dataset.tab)));
// Deep links (#privacy, #cancellation, #faq) — only exact whitelisted values are honoured.
const HASH_TABS = new Map([['#privacy', 'privacy'], ['#cancellation', 'terms'], ['#faq', 'faq']]);
if (HASH_TABS.has(location.hash)) { selectTab(HASH_TABS.get(location.hash)); setTimeout(() => $('policies').scrollIntoView(), 300); }

// Date picker: only allow today … +2 years
(() => {
  const iso = (d) => d.toISOString().slice(0, 10);
  const t = new Date(); const m = new Date(); m.setFullYear(m.getFullYear() + 2);
  $('eDate').min = iso(t); $('eDate').max = iso(m);
})();


/* =====================================================================
   MOBILE: menu sheet, quick-action bar, smooth FAQ
   ===================================================================== */
const menu = $('menu'), menuBtn = $('menuBtn');
let lastFocus = null;
function setMenu(open) {
  menu.classList.toggle('open', open);
  menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  document.documentElement.classList.toggle('menu-open', open);
  if (window.lenis) open ? window.lenis.stop() : window.lenis.start();
  onScrollNav(); updateBar();
  if (open) { lastFocus = document.activeElement; setTimeout(() => menu.querySelector('a').focus({ preventScroll: true }), 300); }
  else if (lastFocus) lastFocus.focus({ preventScroll: true });
}
menuBtn.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
menu.addEventListener('click', (e) => { const a = e.target.closest('a'); if (a && a.getAttribute('href').startsWith('#')) setMenu(false); });
document.addEventListener('keydown', (e) => {
  if (!menu.classList.contains('open')) return;
  if (e.key === 'Escape') { setMenu(false); return; }
  if (e.key === 'Tab') { // keep focus inside the sheet
    const f = [...menu.querySelectorAll('a,button'), menuBtn];
    const i = f.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
  }
});
addEventListener('resize', () => { if (innerWidth >= 1024 && menu.classList.contains('open')) setMenu(false); });

// Floating action bar: appears once past the opening, hides over the enquiry form
const bar = $('actionbar');
let planVisible = false;
new IntersectionObserver(([e]) => { planVisible = e.isIntersecting; updateBar(); }, { threshold: 0.15 }).observe($('plan'));
function updateBar() {
  const past = scrollY > innerHeight * 0.9;
  bar.classList.toggle('show', past && !planVisible && !document.documentElement.classList.contains('menu-open'));
}
addEventListener('scroll', updateBar, { passive: true }); updateBar();

// FAQ: smooth height animation when opening/closing (Web Animations API)
document.querySelectorAll('.faq details').forEach((d) => {
  const sum = d.querySelector('summary'), body = d.querySelector('.a');
  let anim = null;
  sum.addEventListener('click', (e) => {
    if (reduce || !body.animate) return;
    e.preventDefault();
    if (anim) anim.cancel();
    if (!d.open) {
      d.open = true;
      const hgt = body.scrollHeight;
      anim = body.animate([{ height: '0px', opacity: 0 }, { height: hgt + 'px', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' });
      anim.onfinish = () => { anim = null; };
    } else {
      const hgt = body.offsetHeight;
      anim = body.animate([{ height: hgt + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 320, easing: 'cubic-bezier(.32,.72,0,1)' });
      anim.onfinish = () => { d.open = false; anim = null; };
    }
  });
});
