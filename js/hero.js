// Real-photo 3D fly-through: scroll zooms through each place, through a cloud layer, into the next.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const touch = matchMedia('(hover: none), (pointer: coarse)').matches; // phones & tablets: lighter effects for 60fps
const loader = document.getElementById('loader');
const hide = () => loader.classList.add('done');
const firstImg = document.querySelector('.scene[data-i="0"] img');
(firstImg.decode ? firstImg.decode() : Promise.resolve()).then(hide, hide);
setTimeout(hide, 4000);

const fly = document.getElementById('fly');
const scenes = [...document.querySelectorAll('.scene')];
const imgs = scenes.map(s => s.querySelector('img'));
const chapters = [...document.querySelectorAll('.chapter')];
const bars = ['p1', 'p2', 'p3'].map(id => document.getElementById(id));
const cue = document.getElementById('cue'), altv = document.getElementById('altv'), locName = document.getElementById('locName');
const clouds = [document.getElementById('cloudA'), document.getElementById('cloudB')];

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

/* Soft volumetric cloud texture, drawn once */
function paintCloud(cv, seed) {
  const w = touch ? 700 : 1400, h = touch ? 400 : 800; cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  let s = seed; const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  for (let c = 0; c < 9; c++) {
    const k = w / 1400, cx = r() * w, cy = h * (0.25 + r() * 0.6), spread = (160 + r() * 260) * k;
    for (let i = 0; i < 70; i++) {
      const x = cx + (r() - 0.5) * spread * 2.2, y = cy + (r() - 0.5) * spread * 0.7, rad = (40 + r() * 150) * k;
      const grd = g.createRadialGradient(x, y, 0, x, y, rad);
      const a = 0.05 + r() * 0.1;
      grd.addColorStop(0, `rgba(255,252,246,${a})`); grd.addColorStop(1, 'rgba(255,252,246,0)');
      g.fillStyle = grd; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
    }
  }
  const wash = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.6);
  wash.addColorStop(0, 'rgba(250,247,240,.55)'); wash.addColorStop(1, 'rgba(250,247,240,0)');
  g.fillStyle = wash; g.fillRect(0, 0, w, h);
}
paintCloud(clouds[0], 11); paintCloud(clouds[1], 29);

/* Timeline: each scene's entry and exit window (scroll progress 0..1) */
const T = [
  { in: [-1, 0], out: [0.2, 0.36] },
  { in: [0.2, 0.36], out: [0.54, 0.7] },
  { in: [0.54, 0.7], out: [2, 3] },
];
const places = [['Munnar, Kerala', 1532], ['Alappuzha backwaters', 1], ['Solang Valley, Manali', 2480]];
const chapterWin = [[-1, 0, 0.17, 0.27], [0.29, 0.37, 0.52, 0.6], [0.66, 0.76, 2, 3]];

let target = 0, prog = 0, px = 0, py = 0, cx = 0, cy = 0;
const read = () => { const r = fly.getBoundingClientRect(); target = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight))); };
addEventListener('scroll', read, { passive: true }); addEventListener('resize', read); read();
addEventListener('pointermove', e => { px = e.clientX / innerWidth - 0.5; py = e.clientY / innerHeight - 0.5; }, { passive: true });

let visible = true;
new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(fly);

let last = performance.now(), lastPlace = -1;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 0.05); last = now;
  read();
  // desktop: Lenis already smooths, so follow closely; touch: native momentum is already smooth, follow 1:1
  prog += (target - prog) * (reduce || touch ? 1 : 1 - Math.pow(0.00002, dt));
  const p = prog, t = now / 1000;

  // chapters + progress bars
  chapters.forEach((el, i) => {
    const [a, b, c, d] = chapterWin[i];
    const o = smooth(a, b, p) * (1 - smooth(c, d, p));
    el.style.opacity = o.toFixed(3);
    el.style.transform = `translateY(${((1 - o) * (p < b ? 40 : -40)).toFixed(1)}px)`;
    el.style.visibility = o < 0.01 ? 'hidden' : 'visible';
  });
  bars.forEach((b, i) => { const [a, , , d] = chapterWin[i]; b.style.transform = `scaleY(${smooth(Math.max(a, 0), Math.min(d, 1), p).toFixed(3)})`; });
  cue.style.opacity = (0.85 * (1 - smooth(0.02, 0.08, p))).toFixed(2);
  if (!visible) return;

  cx += (px - cx) * 0.05; cy += (py - cy) * 0.05;
  const idle = reduce ? 0 : Math.sin(t * 0.25);

  scenes.forEach((s, i) => {
    const { in: [ia, ib], out: [oa, ob] } = T[i];
    const e = smooth(ia, ib, p);           // arriving
    const o = smooth(oa, ob, p);           // leaving (flying through)
    const life = smooth(ia, ob > 1 ? 1 : ob, p);
    let scale = (reduce ? 1 : (0.8 + 0.2 * e) * (1 + 0.16 * life) * (1 + 1.1 * o * o));
    const op = i === 0 ? 1 - smooth(oa + 0.05, ob, p) : e * (1 - smooth(oa + 0.05, ob, p));
    s.style.opacity = op.toFixed(3);
    s.style.zIndex = String(10 - i);
    s.style.visibility = op < 0.005 ? 'hidden' : 'visible';
    if (op < 0.005) return;
    const ry = touch ? idle * 0.8 : cx * 4 + idle * 0.6, rx = touch ? 0 : -cy * 3;
    s.style.transform = `rotateY(${ry.toFixed(2)}deg) rotateX(${rx.toFixed(2)}deg) scale(${scale.toFixed(4)})`;
    s.style.filter = touch ? (o > 0.01 ? `brightness(${(1 + o * 0.25).toFixed(2)})` : 'none') : (o > 0.01 ? `blur(${(o * 6).toFixed(1)}px) brightness(${(1 + o * 0.25).toFixed(2)})` : 'none');
    imgs[i].style.transform = touch ? 'translate3d(0,0,0)' : `translate3d(${(-cx * 22).toFixed(1)}px, ${(-cy * 14).toFixed(1)}px, 0)`;
  });

  // fly through cloud banks between places
  const bell = Math.max(Math.sin(Math.PI * smooth(0.2, 0.38, p)), Math.sin(Math.PI * smooth(0.54, 0.72, p)));
  clouds.forEach((c, k) => {
    const prog2 = k ? smooth(0.54, 0.72, p) : smooth(0.2, 0.38, p);
    c.style.opacity = (reduce ? 0 : bell * (k ? 0.9 : 0.85)).toFixed(3);
    c.style.zIndex = '20';
    c.style.transform = `translate(${(Math.sin(t * 0.05 + k) * 40 - cx * 40).toFixed(1)}px, ${(k ? -20 : 20)}px) scale(${(0.9 + prog2 * 1.4).toFixed(3)})`;
  });

  // location + altitude
  const w1 = smooth(0.2, 0.36, p), w2 = smooth(0.54, 0.7, p);
  const alt = lerp(lerp(places[0][1], places[1][1], w1), places[2][1], w2);
  altv.textContent = Math.round(alt).toLocaleString('en-IN');
  const idx = p < 0.28 ? 0 : p < 0.62 ? 1 : 2;
  if (idx !== lastPlace) { lastPlace = idx; locName.textContent = places[idx][0]; }
}
requestAnimationFrame(frame);
