// Realistic 3D mountain-valley fly-through, driven by scroll.
import * as THREE from 'three';
import { Sky } from './Sky.js';
import { mergeGeometries } from './BufferGeometryUtils.js';

const loader = document.getElementById('loader');
const hideLoader = () => loader.classList.add('done');
setTimeout(hideLoader, 6000); // never trap the visitor

const canvas = document.getElementById('gl');
const mobile = innerWidth < 760 || matchMedia('(pointer: coarse)').matches;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  // No WebGL: fall back to a photo
  document.getElementById('stage').style.background = "#0B1311 url('img/manali.webp') center/cover";
  hideLoader();
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 1.75));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.52;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 1, 1, 9000);

/* ---------------- Noise ---------------- */
function makeNoise(seed) {
  const perm = [...Array(256).keys()];
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  const p = new Uint8Array(512); for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const g = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
  const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
  return (xin, yin) => {
    let n0 = 0, n1 = 0, n2 = 0;
    const s2 = (xin + yin) * F2, i = Math.floor(xin + s2), j = Math.floor(yin + s2), t = (i + j) * G2;
    const x0 = xin - (i - t), y0 = yin - (j - t);
    const i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    let t0 = 0.5 - x0 * x0 - y0 * y0; if (t0 > 0) { t0 *= t0; const q = g[p[ii + p[jj]] & 7]; n0 = t0 * t0 * (q[0] * x0 + q[1] * y0); }
    let t1 = 0.5 - x1 * x1 - y1 * y1; if (t1 > 0) { t1 *= t1; const q = g[p[ii + i1 + p[jj + j1]] & 7]; n1 = t1 * t1 * (q[0] * x1 + q[1] * y1); }
    let t2 = 0.5 - x2 * x2 - y2 * y2; if (t2 > 0) { t2 *= t2; const q = g[p[ii + 1 + p[jj + 1]] & 7]; n2 = t2 * t2 * (q[0] * x2 + q[1] * y2); }
    return 70 * (n0 + n1 + n2);
  };
}
const nA = makeNoise(42), nB = makeNoise(7), nC = makeNoise(1234);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const fbm = (x, z, o) => { let a = 1, f = 1, s = 0, n = 0; for (let i = 0; i < o; i++) { s += a * nA(x * f, z * f); n += a; a *= 0.5; f *= 2.03; } return s / n; };
const ridged = (x, z, o) => { let a = 0.5, f = 1, s = 0, w = 1; for (let i = 0; i < o; i++) { let v = 1 - Math.abs(nB(x * f, z * f)); v *= v; v *= w; w = Math.min(1, v * 1.8); s += v * a; a *= 0.5; f *= 2.0; } return s; };

const riverX = (z) => 85 * Math.sin(z * 0.0032) + 35 * Math.sin(z * 0.0095 + 1.3);
function heightAt(x, z) {
  const d = Math.abs(x - riverX(z));
  const n = fbm(x * 0.004, z * 0.004, 4);
  const floor = 7 + n * 4;
  let h = -4 + (floor + 4) * smooth(4, 22, d);
  const valley = smooth(30, 400, d);
  const m = ridged(x * 0.0013, z * 0.0013, 7);
  const broad = fbm(x * 0.0011, z * 0.0011, 3) * 70 + 70;
  const big = Math.pow(m, 1.9) * 540 + broad * 1.25 + fbm(x * 0.004, z * 0.004, 5) * 28;
  h += Math.pow(valley, 1.25) * Math.max(0, big);
  return h;
}
const slopeAt = (x, z) => { const e = 3; const gx = (heightAt(x + e, z) - heightAt(x - e, z)) / (2 * e), gz = (heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e); return 1 - 1 / Math.sqrt(1 + gx * gx + gz * gz); };

/* ---------------- Sky + environment ---------------- */
const sky = new Sky();
sky.scale.setScalar(20000);
const su = sky.material.uniforms;
su.turbidity.value = 3.2; su.rayleigh.value = 2.4; su.mieCoefficient.value = 0.006; su.mieDirectionalG.value = 0.86;
const sun = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(80), THREE.MathUtils.degToRad(160));
su.sunPosition.value.copy(sun);
scene.add(sky);

const pmrem = new THREE.PMREMGenerator(renderer);
const skyScene = new THREE.Scene(); const sky2 = new Sky(); sky2.scale.setScalar(20000);
Object.keys(su).forEach(k => sky2.material.uniforms[k].value = su[k].value);
skyScene.add(sky2);
scene.environment = pmrem.fromScene(skyScene).texture;

const haze = new THREE.Color('#aab7c0');
scene.fog = new THREE.FogExp2(haze, mobile ? 0.00068 : 0.00052);

const hemi = new THREE.HemisphereLight('#cfe0ff', '#4a3d2a', 0.7);
scene.add(hemi);
const sunLight = new THREE.DirectionalLight('#ffd3a3', 3.4);
sunLight.position.copy(sun).multiplyScalar(1000);
scene.add(sunLight);

/* ---------------- Terrain ---------------- */
const SIZE = 3400, SEG = mobile ? 260 : 440;
const tGeo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
tGeo.rotateX(-Math.PI / 2);
const pos = tGeo.attributes.position;
for (let i = 0; i < pos.count; i++) pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
tGeo.computeVertexNormals();
const nor = tGeo.attributes.normal;
const cols = new Float32Array(pos.count * 3);
const C = (h) => new THREE.Color(h);
const cSand = C('#8a7e60'), cGrass = C('#5f7f35'), cGrass2 = C('#3f5f27'), cForest = C('#26401d'),
  cRock = C('#71675d'), cRock2 = C('#4c4742'), cSnow = C('#f4f6fa'), tmp = new THREE.Color(), tmp2 = new THREE.Color();
for (let i = 0; i < pos.count; i++) {
  const x = pos.getX(i), z = pos.getZ(i), h = pos.getY(i), slope = 1 - nor.getY(i);
  const nn = nC(x * 0.02, z * 0.02) * 0.5 + 0.5, nb = nC(x * 0.003, z * 0.003);
  tmp.copy(cGrass).lerp(cGrass2, nn);
  tmp.lerp(cForest, smooth(9, 30, h) * (1 - smooth(170, 230, h + nb * 30)) * (1 - smooth(0.28, 0.5, slope)) * 0.9);
  tmp2.copy(cRock).lerp(cRock2, nn);
  tmp.lerp(tmp2, Math.max(smooth(0.38, 0.62, slope), smooth(190, 260, h + nb * 40)));
  tmp.lerp(cSand, 1 - smooth(0, 5, h));
  tmp.lerp(cSnow, smooth(290, 340, h + nb * 60 + nn * 15) * (1 - smooth(0.5, 0.72, slope)));
  cols[i * 3] = tmp.r; cols[i * 3 + 1] = tmp.g; cols[i * 3 + 2] = tmp.b;
}
tGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
const terrain = new THREE.Mesh(tGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0, envMapIntensity: 0.45 }));
scene.add(terrain);

/* ---------------- River ---------------- */
const water = new THREE.Mesh(
  new THREE.PlaneGeometry(SIZE, SIZE).rotateX(-Math.PI / 2),
  new THREE.MeshStandardMaterial({ color: '#18343d', roughness: 0.14, metalness: 0.1, envMapIntensity: 0.65, transparent: true, opacity: 0.92 })
);
water.position.y = 1.2;
scene.add(water);

/* ---------------- Pine forest (instanced) ---------------- */
{
  const cone1 = new THREE.ConeGeometry(1, 0.62, 8, 1); cone1.translate(0, 0.45, 0);
  const cone2 = new THREE.ConeGeometry(0.78, 0.5, 8, 1); cone2.translate(0, 0.72, 0);
  const cone3 = new THREE.ConeGeometry(0.5, 0.38, 8, 1); cone3.translate(0, 0.95, 0);
  const trunk = new THREE.CylinderGeometry(0.12, 0.16, 0.3, 5); trunk.translate(0, 0.15, 0);
  const treeGeo = mergeGeometries([trunk, cone1, cone2, cone3]);
  const COUNT = mobile ? 5000 : 14000;
  const trees = new THREE.InstancedMesh(treeGeo, new THREE.MeshStandardMaterial({ roughness: 1, envMapIntensity: 0.35 }), COUNT);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), col = new THREE.Color();
  let placed = 0, tries = 0, seed = 99;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  while (placed < COUNT && tries < COUNT * 8) {
    tries++;
    const z = 1250 - rnd() * 2300;
    const x = riverX(z) + (rnd() - 0.5) * (rnd() < 0.6 ? 380 : 900);
    const h = heightAt(x, z);
    if (h < 7 || h > 215) continue;
    const d = Math.abs(x - riverX(z)); if (d < 22) continue;
    if (slopeAt(x, z) > 0.42) continue;
    if (nC(x * 0.01, z * 0.01) < -0.35) continue; // clearings
    const ht = 6.5 + rnd() * 8, rad = ht * (0.22 + rnd() * 0.07);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * Math.PI * 2);
    m.compose(p.set(x, h - 0.8, z), q, sc.set(rad, ht, rad));
    trees.setMatrixAt(placed, m);
    col.setHSL(0.27 + rnd() * 0.07, 0.3 + rnd() * 0.15, 0.085 + rnd() * 0.06);
    trees.setColorAt(placed, col);
    placed++;
  }
  trees.count = placed;
  scene.add(trees);
}

/* ---------------- Mist & clouds (sprites) ---------------- */
const clouds = [];
{
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.45, 'rgba(255,255,255,.55)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const N = mobile ? 45 : 90;
  for (let i = 0; i < N; i++) {
    const low = rnd() < 0.4;
    const mat = new THREE.SpriteMaterial({ map: tex, color: '#fff3e6', transparent: true, opacity: (low ? 0.07 : 0.16) + rnd() * (low ? 0.12 : 0.22), depthWrite: false, fog: true });
    const s = new THREE.Sprite(mat);
    const z = 1150 - rnd() * 2400;
    s.position.set(riverX(z) + (rnd() - 0.5) * (low ? 260 : 1200), low ? 30 + rnd() * 50 : 160 + rnd() * 220, z);
    const k = low ? 140 + rnd() * 220 : 260 + rnd() * 420;
    s.scale.set(k * 1.8, k * 0.7, 1);
    s.userData.v = (rnd() - 0.5) * 0.12;
    scene.add(s); clouds.push(s);
  }
}

/* ---------------- Birds (simple flapping V shapes) ---------------- */
const birds = [];
{
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, 0, 0, 0, 0, 0.3, 0, 0, -0.2, 1, 0, 0, 0, 0, 0.3, 0, 0, -0.2], 3));
  const mat = new THREE.MeshBasicMaterial({ color: '#1c1a17', side: THREE.DoubleSide, fog: true });
  for (let i = 0; i < 14; i++) {
    const b = new THREE.Mesh(geo.clone(), mat);
    b.scale.setScalar(2.2 + Math.random());
    b.userData = { o: Math.random() * 10, r: 70 + Math.random() * 90, z: 300 - Math.random() * 900, y: 130 + Math.random() * 70 };
    scene.add(b); birds.push(b);
  }
}

/* ---------------- Camera path ---------------- */
const pts = [];
for (let i = 0; i <= 14; i++) {
  const t = i / 14;
  const z = 1150 - 1850 * t;
  const lift = smooth(0.6, 1.0, t);
  pts.push(new THREE.Vector3(riverX(z) * (1 - lift * 0.4), 24 + 7 * Math.sin(t * 7) + lift * 260, z));
}
const path = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
const finalLook = new THREE.Vector3(riverX(-1500), 150, -1600);

/* ---------------- Scroll / pointer state ---------------- */
const fly = document.getElementById('fly');
const chapters = [...document.querySelectorAll('.chapter')];
const bars = ['p1', 'p2', 'p3'].map(id => document.getElementById(id));
const altv = document.getElementById('altv'), cue = document.getElementById('cue');
let target = 0, prog = 0, px = 0, py = 0, cx = 0, cy = 0;
const readScroll = () => {
  const r = fly.getBoundingClientRect();
  target = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight)));
};
addEventListener('scroll', readScroll, { passive: true }); readScroll();
addEventListener('pointermove', (e) => { px = e.clientX / innerWidth - 0.5; py = e.clientY / innerHeight - 0.5; }, { passive: true });

const windows = [[-1, 0, 0.17, 0.27], [0.29, 0.37, 0.52, 0.6], [0.66, 0.76, 2, 3]];
function updateOverlay(p) {
  chapters.forEach((el, i) => {
    const [a, b, c, d] = windows[i];
    const o = smooth(a, b, p) * (1 - smooth(c, d, p));
    el.style.opacity = o.toFixed(3);
    el.style.transform = `translateY(${((1 - o) * (p < b ? 40 : -40)).toFixed(1)}px)`;
    el.style.visibility = o < 0.01 ? 'hidden' : 'visible';
  });
  bars.forEach((b, i) => { const [a, , , d] = windows[i]; b.style.transform = `scaleY(${smooth(Math.max(a, 0), Math.min(d, 1), p).toFixed(3)})`; });
  cue.style.opacity = (0.85 * (1 - smooth(0.02, 0.08, p))).toFixed(2);
}

/* ---------------- Resize ---------------- */
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w / h < 0.8 ? 70 : 55;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

let visible = true;
new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 }).observe(fly);

/* ---------------- Render loop ---------------- */
const look = new THREE.Vector3(), tmpV = new THREE.Vector3();
const clock = new THREE.Clock();
let first = true;
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  prog += (target - prog) * (reduce ? 1 : 1 - Math.pow(0.0025, dt));
  updateOverlay(prog);
  if (!visible && !first) return;

  cx += (px - cx) * 0.04; cy += (py - cy) * 0.04;
  const p = Math.min(prog, 0.999);
  path.getPointAt(p, camera.position);
  camera.position.y += Math.sin(t * 0.6) * 1.2; // gentle hover
  camera.position.x += cx * 14;
  // keep camera above ground
  const g = heightAt(camera.position.x, camera.position.z) + 12;
  if (camera.position.y < g) camera.position.y = g;

  path.getPointAt(Math.min(p + 0.045, 1), look);
  look.y -= 8;
  look.lerp(finalLook, smooth(0.7, 1, p));
  look.x += cx * 40; look.y -= cy * 30;
  camera.lookAt(look);
  camera.rotateZ(-cx * 0.03 + Math.sin(t * 0.4) * 0.004);

  altv.textContent = Math.round(900 + camera.position.y * 6.5).toLocaleString('en-IN');

  for (const c of clouds) { c.position.x += c.userData.v; }
  for (const b of birds) {
    const u = b.userData, a = t * 0.25 + u.o;
    b.position.set(riverX(u.z) + Math.cos(a) * u.r, u.y + Math.sin(a * 2) * 4, u.z + Math.sin(a) * u.r);
    b.rotation.y = -a;
    const f = Math.sin(t * 9 + u.o * 5) * 0.6;
    const arr = b.geometry.attributes.position.array; arr[1] = f; arr[10] = f; b.geometry.attributes.position.needsUpdate = true;
  }

  renderer.render(scene, camera);
  if (first) { first = false; hideLoader(); }
}
requestAnimationFrame(frame);
