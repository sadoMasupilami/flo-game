// Portalnacht – die Welt: sechs Gebiete, Unterschlüpfe, Barrieren, Portal
'use strict';
const solids = [];      // Kollisionsboxen {x0,x1,z0,z1,y0,y1,off}
const flickers = [];    // Lampen, Fernseher, Blaulicht
const fires = [];       // brennende Autos usw.
const swings = [];      // leere Schaukeln
const barriers = [];
const maras = [];      // Mara, die Händlerin, an den Unterschlüpfen
let portal = null, moon = null;

function solid(x, z, w, d, h, y0) {
  const s = { x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, y0: y0 || 0, y1: (y0 || 0) + (h || 3), off: false };
  solids.push(s); return s;
}
function sm(geo, m, x, y, z, sx, sy, sz, rx, ry, rz, parent) {
  const o = new T.Mesh(geo, m); o.position.set(x, y, z);
  o.scale.set(sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz); o.rotation.set(rx || 0, ry || 0, rz || 0);
  (parent || scene).add(o);
  if (!parent) { o.matrixAutoUpdate = false; o.updateMatrix(); }
  if (geo === G.plane && rx === -Math.PI / 2) o.receiveShadow = true;
  return o;
}
function bx(x, y0, z, w, h, d, m, isSolid, ry) {
  const o = sm(G.box, m, x, y0 + h / 2, z, w, h, d, 0, ry || 0, 0);
  if (isSolid) { o.castShadow = true; o.receiveShadow = true; const c = Math.abs(Math.cos(ry || 0)), s = Math.abs(Math.sin(ry || 0)); solid(x, z, w * c + d * s, w * s + d * c, h, y0); }
  return o;
}
// Viele gleiche Objekte in einem Draw-Call; Bounding-Sphere selbst setzen, damit das Culling stimmt
function inst(geo, m, list) {
  if (!list.length) return null;
  const g = geo.clone(), im = new T.InstancedMesh(g, m, list.length), o = new T.Object3D();
  let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9;
  list.forEach((t, i) => {
    o.position.set(t[0], t[1], t[2]); o.scale.set(t[3], t[4], t[5]); o.rotation.set(t[7] || 0, t[6] || 0, t[8] || 0); o.updateMatrix(); im.setMatrixAt(i, o.matrix);
    const e = Math.max(t[3], t[4], t[5]);
    x0 = Math.min(x0, t[0] - e); x1 = Math.max(x1, t[0] + e); y0 = Math.min(y0, t[1] - e); y1 = Math.max(y1, t[1] + e); z0 = Math.min(z0, t[2] - e); z1 = Math.max(z1, t[2] + e);
  });
  g.boundingSphere = new T.Sphere(new T.Vector3((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), Math.hypot(x1 - x0, y1 - y0, z1 - z0) / 2);
  im.castShadow = true; im.receiveShadow = true;
  im.instanceMatrix.needsUpdate = true; scene.add(im); return im;
}
function glowDisc(x, z, r, color, op) {
  const m = new T.MeshBasicMaterial({ color, map: TEX.glow, transparent: true, opacity: op, blending: T.AdditiveBlending, depthWrite: false });
  const o = sm(G.plane, m, x, 0.04, z, r * 2, r * 2, 1, -Math.PI / 2); return m;
}
function inSafe(x, z, pad) { for (const s of SAFE) if (Math.hypot(x - s.x, z - s.z) < s.r + (pad || 0)) return true; return false; }
function freeAt(x, z, r) {
  if (Math.abs(x) > HALF_W - r) return false;
  if (inSafe(x, z, r + 2.5) || Math.hypot(x - 15.6, z - SAFE[0].z) < 1) return false;
  for (const s of solids) if (x + r > s.x0 && x - r < s.x1 && z + r > s.z0 && z - r < s.z1) return false;
  return true;
}

// ---------- Bausteine ----------
const MATS = {};
function initMats() {
  MATS.winLit = mat(0x241406, { e: 0xf0a246, ei: 0.85 });
  MATS.winDark = mat(0x08090b, { sh: 60 });
  MATS.door = mat(0x1a1310);
  MATS.pole = mat(0x2c2d30, { sh: 30 });
  MATS.black = mat(0x0f0f11, { sh: 20 });
  MATS.glass = mat(0x0c1016, { sh: 80 });
  MATS.trunk = tmat('bark', 0x9a8a7a, 1, 3);
  MATS.leaf = tmat('leaves', 0xa8b8a8, 2, 2);
  MATS.rock = tmat('rock', 0xa09c94, 1, 1, { bump: 0.5 });
  MATS.hay = tmat('hay', 0xb0a080, 2, 1);
  MATS.stone = tmat('rock', 0xb0aca4, 2, 1);
  MATS.eyeO = mat(0xff9a2a, { basic: true, fog: false });
}
// Boden eines Gebiets mit gemalter Textur, dazu ein Weg in der Mitte
function ground(a, key, tint, pathKey, pathTint, pathW) {
  const zc = ZS(a) - AREA_LEN / 2, tile = key === 'cobble' ? 4.8 : 6;
  sm(G.plane, tmat(key, tint, 140 / tile, AREA_LEN / tile, { bump: key === 'cobble' ? 0.6 : 0.25 }), 0, 0, zc, 140, AREA_LEN + 0.6, 1, -Math.PI / 2);
  if (pathKey) {
    const pt = pathKey === 'cobble' ? 4.8 : 4;
    sm(G.plane, tmat(pathKey, pathTint, pathW / pt, AREA_LEN / pt, { bump: 0.3, off: -1, sh: pathKey === 'asphalt' ? 10 : 0 }), 0, 0.012, zc, pathW, AREA_LEN + 0.6, 1, -Math.PI / 2);
  }
}
// Grasbüschel: zwei gekreuzte Flächen, viele Exemplare in einem Draw-Call
function tufts(list) {
  if (!G.tuft) {
    G.tuft = mergeParts([[G.plane, 0, 0.5, 0, 1, 1, 1], [G.plane, 0, 0.5, 0, 1, 1, 1, 0, Math.PI / 2, 0]]);
  }
  const m = new T.MeshPhongMaterial({ color: 0xb0b098, map: TX.tuft, alphaTest: 0.45, side: T.DoubleSide, shininess: 2, specular: 0 });
  inst(G.tuft, m, list.map(([x, z, s]) => [x, 0, z, 0.8 * s, 0.5 * s, 0.8 * s, R() * 3]));
}
function tuftField(z0, n, xMin, xMax, avoidPath) {
  const l = [];
  for (let i = 0; i < n; i++) { const x = (R() < 0.5 ? -1 : 1) * rr(xMin, xMax); if (Math.abs(x) < avoidPath) continue; l.push([x, rr(z0 - 2, z0 - AREA_LEN + 2), rr(0.7, 1.4)]); }
  tufts(l);
}
function fenceLine(x, zA, zB, m, h, step) {
  h = h || 1.2; step = step || 2.6;
  const posts = []; for (let z = zA; z > zB; z -= step) posts.push([x, h / 2, z, 0.14, h, 0.14]);
  inst(G.box, m, posts);
  const len = zA - zB; sm(G.box, m, x, h * 0.75, (zA + zB) / 2, 0.07, 0.1, len); sm(G.box, m, x, h * 0.35, (zA + zB) / 2, 0.07, 0.1, len);
}
function forest(list) {
  const tr = [], lf = [], lf2 = [];
  for (const [x, z, s, bare] of list) {
    tr.push([x, 2.2 * s, z, 0.32 * s, 4.4 * s, 0.32 * s]);
    if (!bare) { lf.push([x, 3.8 * s, z, 2.8 * s, 3.8 * s, 2.8 * s, R() * 3]); lf2.push([x, 5.9 * s, z, 1.9 * s, 2.9 * s, 1.9 * s, R() * 3]); }
  }
  inst(G.trunk, MATS.trunk, tr); inst(G.cone, MATS.leaf, lf); inst(G.cone, MATS.leaf, lf2);
}
// face: -1 = Vorderseite zeigt nach -x, +1 = nach +x
function house(x, z, w, h, d, face, wallC, roofC, opt) {
  opt = opt || {};
  bx(x, 0, z, w, h, d, tmat('plaster', new T.Color(wallC).multiplyScalar(1.6).getHex(), 2, 1.5, { bump: 0.3 }), false);
  sm(G.prism, tmat('roof', new T.Color(roofC).multiplyScalar(2.6).getHex(), 3, 2, { bump: 0.4 }), x, h, z, w + 0.8, h * 0.55, d + 0.6);
  const fx = x + face * (w / 2 + 0.03);
  bx(fx, 0, z + d * 0.18, 0.08, 2.1, 1.1, MATS.door, false);
  const wins = [[z - d * 0.25, h * 0.55], [z + d * 0.38, h * 0.55]];
  if (h > 5.5) wins.push([z - d * 0.25, h * 0.82], [z + d * 0.15, h * 0.82]);
  wins.forEach(([wz, wy], k) => {
    let m = R() < (opt.lit || 0.3) ? MATS.winLit : MATS.winDark;
    if (opt.tv && k === 0) { m = new T.MeshPhongMaterial({ color: 0x050810, emissive: 0x7aa8ff, emissiveIntensity: 0.6 }); flickers.push({ m, mode: 3, base: 0.6 }); }
    bx(fx, wy - 0.45, wz, 0.06, 0.9, 0.85, m, false);
  });
}
const CAR_COLS = [0x5a1d1d, 0x2a3a52, 0x4a4a4e, 0x5a5638, 0x2c4434, 0x6a6a6e, 0x3a2a40];
function car(x, z, ry, col, opt) {
  opt = opt || {};
  const g = new T.Group(); g.position.set(x, 0, z); g.rotation.set(opt.tx || 0, ry, opt.tz || 0); scene.add(g);
  const body = mat(col, { sh: 40 });
  sm(G.box, body, 0, 0.62, 0, 1.9, 0.7, 4.3, 0, 0, 0, g);
  sm(G.box, MATS.glass, 0, 1.2, -0.2, 1.66, 0.5, 2.1, 0, 0, 0, g);
  sm(G.box, body, 0, 1.47, -0.2, 1.7, 0.06, 2.0, 0, 0, 0, g);
  for (const sx of [-0.92, 0.92]) for (const sz of [-1.35, 1.35]) sm(G.cyl, MATS.black, sx, 0.36, sz, 0.72, 0.28, 0.72, 0, 0, Math.PI / 2, g);
  if (!opt.dead) { sm(G.box, mat(0x3a3020, { e: 0xffe0a0, ei: 0.25 }), 0.6, 0.7, 2.16, 0.4, 0.15, 0.04, 0, 0, 0, g); sm(G.box, mat(0x3a3020, { e: 0xffe0a0, ei: 0.25 }), -0.6, 0.7, 2.16, 0.4, 0.15, 0.04, 0, 0, 0, g); }
  if (opt.police) {
    const r = new T.MeshBasicMaterial({ color: 0xff2030 }), b = new T.MeshBasicMaterial({ color: 0x2050ff });
    sm(G.box, r, -0.35, 1.56, -0.2, 0.55, 0.14, 0.28, 0, 0, 0, g); sm(G.box, b, 0.35, 1.56, -0.2, 0.55, 0.14, 0.28, 0, 0, 0, g);
    flickers.push({ m: r, mode: 4 }, { m: b, mode: 5 });
  }
  g.updateMatrixWorld(true); g.matrixAutoUpdate = false; g.traverse(o => { o.matrixAutoUpdate = false; });
  const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry)); solid(x, z, 2.0 * c + 4.4 * s, 2.0 * s + 4.4 * c, 1.6);
  if (opt.fire) { fires.push({ x, y: 1.2, z, r: 0.9, rate: 34 }); glowDisc(x, z, 5, 0xff7a2a, 0.35); }
}
function lamp(x, z, h, side, mode) {
  sm(G.cyl6, MATS.pole, x, h / 2, z, 0.16, h, 0.16);
  sm(G.box, MATS.pole, x - side * 0.5, h, z, 1.0, 0.08, 0.08);
  const m = new T.MeshPhongMaterial({ color: 0x332211, emissive: 0xffd08a, emissiveIntensity: mode === 2 ? 0 : 1 });
  sm(G.box, m, x - side * 0.95, h - 0.12, z, 0.5, 0.16, 0.3);
  const gm = mode === 2 ? null : glowDisc(x - side * 0.95, z, 4.2, 0xffc070, 0.22);
  let cone = null; // Lichtkegel, als würde Nebel das Licht sichtbar machen
  if (mode !== 2) { cone = new T.MeshBasicMaterial({ map: TX.beam, color: 0xffc070, transparent: true, opacity: 0.15, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }); sm(G.beam, cone, x - side * 0.95, (h - 0.2) / 2, z, 1, h - 0.2, 1); }
  flickers.push({ m, mode, base: 1, glow: gm, gb: 0.22, cone });
  if (Math.abs(x) < HALF_W) solid(x, z, 0.3, 0.3, h);
}
function deadTree(x, z, s) {
  sm(G.trunk, MATS.trunk, x, 2.5 * s, z, 0.55 * s, 5 * s, 0.55 * s);
  sm(G.cyl6, MATS.trunk, x + 0.6 * s, 4 * s, z, 0.12 * s, 2.2 * s, 0.12 * s, 0, 0, -0.8);
  sm(G.cyl6, MATS.trunk, x - 0.5 * s, 3.4 * s, z + 0.2, 0.1 * s, 1.8 * s, 0.1 * s, 0.3, 0, 0.9);
  sm(G.cyl6, MATS.trunk, x, 4.6 * s, z - 0.4 * s, 0.08 * s, 1.6 * s, 0.08 * s, -0.7, 0, 0);
  if (Math.abs(x) < HALF_W) solid(x, z, 0.7 * s, 0.7 * s, 5 * s);
}

// ---------- Gebiet 1: Der Hof ----------
function buildHof() {
  const z0 = ZS(0);
  ground(0, 'grass', 0x8a8a80, 'dirt', 0x8a8070, 6);
  tuftField(z0, 700, 1, 19, 3.4);
  const fenceM = mat(0x3b2c1f);
  fenceLine(-19.7, z0 + 5, z0 - AREA_LEN, fenceM); fenceLine(19.7, z0 + 5, z0 - AREA_LEN, fenceM);
  bx(0, 0, 5.8, 40, 1.3, 0.25, fenceM, false);
  const corn = [];
  for (let x = -21; x > -44; x -= 1.5) for (let z = z0 + 4; z > z0 - AREA_LEN; z -= 1.4) { if (R() < 0.12) continue; const h = rr(1.6, 2.5); corn.push([x + rr(-0.3, 0.3), h / 2, z + rr(-0.3, 0.3), 0.14, h, 0.14, rr(0, 3)]); }
  inst(G.box, mat(0x3a3a1c), corn);
  // Scheune, Wohnhaus, Silo rechts
  bx(31, 0, z0 - 46, 12, 7, 16, tmat('wood', 0xb05040, 4, 2), true);
  sm(G.prism, tmat('roof', 0x8a6a60, 4, 3), 31, 7, z0 - 46, 13, 4.2, 17);
  bx(24.95, 0, z0 - 46, 0.12, 5.2, 5, mat(0x220c08));
  sm(G.box, mat(0x8a8070), 24.88, 2.6, z0 - 46, 0.06, 6.6, 0.22, 0.8, 0, 0); sm(G.box, mat(0x8a8070), 24.88, 2.6, z0 - 46, 0.06, 6.6, 0.22, -0.8, 0, 0);
  bx(24.95, 5.4, z0 - 46, 0.08, 1.0, 1.2, MATS.winLit);
  house(27, z0 - 98, 9, 5, 10, -1, 0x5a5248, 0x2a1a16, { lit: 0.5 });
  sm(G.cyl, mat(0x55585a, { sh: 30 }), 41, 6, z0 - 70, 6, 12, 6); sm(G.sph, mat(0x3a3c3e), 41, 12, z0 - 70, 6, 4, 6);
  // Heuballen
  [[-7, -30], [-8.6, -30.2], [9, -44], [12, -52], [-13, -82], [5, -108], [6.6, -108.4], [-4, -66]].forEach(([x, dz]) => {
    sm(G.cyl, MATS.hay, x, 0.75, z0 + dz, 1.5, 1.4, 1.5, 0, 0, Math.PI / 2); solid(x, z0 + dz, 1.5, 1.5, 1.5);
  });
  sm(G.cyl, MATS.hay, -7.8, 2.1, z0 - 30.1, 1.4, 1.3, 1.4, 0, 0, Math.PI / 2);
  // Traktor
  { const x = -10, z = z0 - 100, g = mat(0x2c4527, { sh: 30 });
    bx(x, 0.5, z, 1.6, 1.1, 3.0, g); bx(x, 1.6, z + 0.7, 1.5, 1.4, 1.4, mat(0x1d2a1b));
    sm(G.cyl, MATS.black, x - 1.05, 0.95, z + 0.8, 1.9, 0.55, 1.9, 0, 0, Math.PI / 2); sm(G.cyl, MATS.black, x + 1.05, 0.95, z + 0.8, 1.9, 0.55, 1.9, 0, 0, Math.PI / 2);
    sm(G.cyl, MATS.black, x - 0.95, 0.55, z - 1.1, 1.1, 0.4, 1.1, 0, 0, Math.PI / 2); sm(G.cyl, MATS.black, x + 0.95, 0.55, z - 1.1, 1.1, 0.4, 1.1, 0, 0, Math.PI / 2);
    sm(G.cyl6, MATS.black, x + 0.5, 2.3, z - 0.9, 0.12, 1.4, 0.12); solid(x, z, 2.6, 3.4, 2.6); }
  // Vogelscheuche mit glühenden Augen
  { const x = -12, z = z0 - 62;
    sm(G.cyl6, mat(0x3a2a1a), x, 1.25, z, 0.12, 2.5, 0.12); sm(G.box, mat(0x3a2a1a), x, 1.95, z, 1.7, 0.09, 0.09);
    bx(x, 1.45, z, 0.55, 0.65, 0.28, mat(0x2e2433)); sm(G.sph, mat(0x7a6648), x, 2.3, z, 0.42, 0.46, 0.42);
    sm(G.cone, mat(0x1a1612), x, 2.66, z, 0.6, 0.42, 0.6); sm(G.cyl, mat(0x1a1612), x, 2.47, z, 0.75, 0.04, 0.75);
    sm(G.sphLo, MATS.eyeO, x - 0.08, 2.34, z + 0.2, 0.06, 0.06, 0.04); sm(G.sphLo, MATS.eyeO, x + 0.08, 2.34, z + 0.2, 0.06, 0.06, 0.04);
    solid(x, z, 0.5, 0.5, 2.5); }
  deadTree(-15, z0 - 28, 1); deadTree(15.5, z0 - 84, 1.1); deadTree(-25, z0 - 50, 1.4); deadTree(24, z0 - 20, 1.2); deadTree(-30, z0 - 110, 1.3);
  const pm = mat(0xb5561a, { e: 0x7a2c00, ei: 0.9 });
  [[-18, -16], [18.5, -36], [-18.4, -72], [18, -104], [-17.6, -112]].forEach(([x, dz]) => { sm(G.sph, pm, x, 0.25, z0 + dz, 0.55, 0.42, 0.55); glowDisc(x, z0 + dz, 1.6, 0xff8a30, 0.3); });
}

// ---------- Gebiet 2: Finsterwald ----------
function buildWald() {
  const z0 = ZS(1);
  ground(1, 'forest', 0x8a8a80, 'dirt', 0x6a6050, 5);
  tuftField(z0, 450, 1, 19, 3);
  const list = [];
  for (let i = 0; i < 330; i++) { const side = R() < 0.5 ? -1 : 1; list.push([side * rr(19.6, 48), rr(z0 + 2, z0 - AREA_LEN - 2), rr(0.8, 1.5), R() < 0.12]); }
  for (let i = 0; i < 18; i++) for (let t = 0; t < 12; t++) {
    const x = (R() < 0.5 ? -1 : 1) * rr(4.5, 17), z = rr(z0 - 16, z0 - 112);
    if (freeAt(x, z, 1.6)) { list.push([x, z, rr(0.8, 1.25), R() < 0.15]); solid(x, z, 0.8, 0.8, 6); break; }
  }
  forest(list);
  [[-1, -36], [1, -64], [-1, -92]].forEach(([side, dz]) => {
    const len = rr(6, 8), x = side * (HALF_W - len / 2);
    sm(G.cyl, mat(0x33261b), x, 0.42, z0 + dz, 0.85, len, 0.85, 0, 0, Math.PI / 2); solid(x, z0 + dz, len, 0.9, 0.9);
  });
  for (let i = 0; i < 9; i++) for (let t = 0; t < 10; t++) {
    const x = rr(-16, 16), z = rr(z0 - 14, z0 - 114), sx = rr(1.2, 2.2), sy = rr(0.7, 1.2), sz = rr(1.2, 2);
    if (Math.abs(x) > 2.5 && freeAt(x, z, 1.5)) { sm(G.sphLo, MATS.rock, x, sy * 0.3, z, sx, sy, sz, 0, R() * 3, 0); solid(x, z, sx * 0.8, sz * 0.8, sy * 0.6); break; }
  }
  // Hochsitz
  { const x = -15.5, z = z0 - 70, m = mat(0x3a2b1e);
    for (const a of [-0.7, 0.7]) for (const b of [-0.7, 0.7]) sm(G.box, m, x + a, 2, z + b, 0.14, 4, 0.14);
    bx(x, 4, z, 1.8, 0.12, 1.8, m); bx(x, 4.1, z, 1.6, 1.3, 1.6, mat(0x2a2017)); sm(G.prism, mat(0x1f1812), x, 5.4, z, 2, 0.8, 2);
    bx(x + 1.2, 4.6, z, 0.06, 0.4, 0.8, MATS.winDark); solid(x, z, 1.8, 1.8, 5); }
  // leuchtende Pilze
  const mu = mat(0x203a3a, { e: 0x5affd8, ei: 0.7 });
  for (let i = 0; i < 14; i++) { const x = (R() < 0.5 ? -1 : 1) * rr(12, 19), z = rr(z0 - 14, z0 - 120); sm(G.sph, mu, x, 0.12, z, 0.3, 0.16, 0.3); }
}

// ---------- Gebiet 3: Das Dorf ----------
function buildDorf() {
  const z0 = ZS(2);
  ground(2, 'cobble', 0x9a9a9a, 'cobble', 0x7a7a7a, 10);
  const walls = [0x4a4038, 0x3e3b45, 0x524537, 0x45443d, 0x3c4140], roofs = [0x3a1b17, 0x2a2522, 0x332018];
  for (let i = 0; i < 8; i++) {
    const z = z0 - 12 - i * 15.5;
    house(-27 - rr(0, 2), z, rr(8, 9.5), rr(5, 7), rr(9, 11), 1, rpick(walls), rpick(roofs), { lit: 0.3 });
    house(27 + rr(0, 2), z - 7, rr(8, 9.5), rr(5, 7), rr(9, 11), -1, rpick(walls), rpick(roofs), { lit: 0.3 });
  }
  fenceLine(-19.7, z0, z0 - AREA_LEN, mat(0x5e5b55), 0.9, 0.7); fenceLine(19.7, z0, z0 - AREA_LEN, mat(0x5e5b55), 0.9, 0.7);
  for (let k = 0; k < 6; k++) { const side = k % 2 ? 1 : -1; lamp(side * 16.9, z0 - 16 - k * 20, 4.6, side, k === 2 ? 1 : (k === 4 ? 2 : 0)); }
  // Kirche mit rotem Fenster
  { const x = -38, z = z0 - 66, st = tmat('plaster', 0x6a6a72, 2, 3, { bump: 0.3 });
    bx(x, 0, z, 11, 9, 22, st); sm(G.prism, mat(0x221d1d), x, 9, z, 12, 6, 23);
    bx(x, 0, z + 13.5, 5, 20, 5, st); sm(G.cone, mat(0x221d1d), x, 24, z + 13.5, 5, 8, 5);
    sm(G.disc, mat(0xd8d2b8, { basic: true }), x + 2.53, 16, z + 13.5, 2.4, 1, 2.4, 0, 0, Math.PI / 2);
    bx(x + 2.52, 12, z + 13.5, 0.06, 1.6, 1, mat(0x200404, { e: 0xff2020, ei: 0.9 })); }
  // Brunnen, Karren, Auto
  { const x = -5, z = z0 - 58; sm(G.cyl, MATS.stone, x, 0.45, z, 2.4, 0.9, 2.4); bx(x - 1, 0.9, z, 0.15, 1.6, 0.15, MATS.trunk); bx(x + 1, 0.9, z, 0.15, 1.6, 0.15, MATS.trunk);
    sm(G.prism, mat(0x3a1b17), x, 2.5, z, 2.8, 0.8, 1.4, 0, Math.PI / 2, 0); solid(x, z, 2.4, 2.4, 1.2); }
  { const x = 8, z = z0 - 34, m = mat(0x4a3524); bx(x, 0.6, z, 1.8, 0.6, 3, m); sm(G.cyl, MATS.black, x - 1, 0.6, z + 0.6, 1.2, 0.12, 1.2, 0, 0, Math.PI / 2); sm(G.cyl, MATS.black, x + 1, 0.6, z + 0.6, 1.2, 0.12, 1.2, 0, 0, Math.PI / 2); solid(x, z, 2.2, 3.2, 1.2); }
  car(-10, z0 - 92, 0.5, 0x4a4a4e, { dead: true });
  car(11, z0 - 76, 2.8, 0x5a1d1d, { fire: true, dead: true });
}

// ---------- Gebiet 4: Die Autobahn ----------
function buildAutobahn() {
  const z0 = ZS(3), zc = z0 - AREA_LEN / 2;
  ground(3, 'grass', 0x6a6a60, null);
  const am = tmat('asphalt', 0x9a9a9a, 6, 22, { bump: 0.3, sh: 10, off: -1 });
  sm(G.plane, am, 0, 0.012, zc, 37.5, AREA_LEN + 0.6, 1, -Math.PI / 2);
  const dash = [], line = mat(0x8a8a80);
  for (const x of [-9, 0, 9]) for (let z = z0 - 2; z > z0 - AREA_LEN; z -= 9) dash.push([x, 0.03, z, 0.16, 0.02, 3]);
  inst(G.box, line, dash);
  sm(G.box, line, -17, 0.03, zc, 0.16, 0.02, AREA_LEN); sm(G.box, line, 17, 0.03, zc, 0.16, 0.02, AREA_LEN);
  const rail = mat(0x6a6d72, { sh: 60 }), posts = [];
  for (const x of [-18.6, 18.6]) { for (let z = z0; z > z0 - AREA_LEN; z -= 4) posts.push([x, 0.4, z, 0.12, 0.8, 0.12]); sm(G.box, rail, x, 0.65, zc, 0.06, 0.32, AREA_LEN); }
  inst(G.box, rail, posts);
  [[-12, -20, 0.3, 0], [6, -30, -0.4, 1], [-3, -48, 1.2, 0], [13, -58, 0.1, 0], [-11, -66, -0.7, 1], [2, -96, 0.5, 0], [-14, -104, 0.05, 0], [12, -110, 2.6, 1], [-6, -84, 2.2, 0]].forEach(([x, dz, ry, f], i) => {
    car(x, z0 + dz, ry, CAR_COLS[i % CAR_COLS.length], { fire: !!f, dead: true, tz: i % 3 === 0 ? 0.06 : 0 });
  });
  // Lkw
  { const x = 7, z = z0 - 76, ry = 0.35;
    bx(x, 0.9, z, 2.6, 3.0, 10, mat(0x55595f, { sh: 20 }), true, ry);
    bx(x - 6.2 * Math.sin(ry), 0.4, z - 6.2 * Math.cos(ry), 2.5, 2.6, 2.4, mat(0x6a1c1c), true, ry);
    fires.push({ x: x - 6.2 * Math.sin(ry), y: 3, z: z - 6.2 * Math.cos(ry), r: 1, rate: 40 }); }
  // Schilderbrücke
  { const z = z0 - 42, pm = mat(0x3a3c40, { sh: 20 });
    sm(G.box, pm, -19.6, 4, z, 0.5, 8, 0.5); sm(G.box, pm, 19.6, 4, z, 0.5, 8, 0.5); sm(G.box, pm, 0, 7.6, z, 40, 0.5, 0.6);
    const s1 = signTex('STADT 12 km', 'ZENTRUM', '#1d4fa0', '#ffffff'), s2 = signTex('GESPERRT', 'NICHT WEITERFAHREN', '#a0161d', '#ffffff');
    sm(G.plane, new T.MeshPhongMaterial({ map: s1, emissive: 0xffffff, emissiveMap: s1, emissiveIntensity: 0.25 }), -7, 6.3, z + 0.32, 9, 2.25, 1);
    sm(G.plane, new T.MeshPhongMaterial({ map: s2, emissive: 0xffffff, emissiveMap: s2, emissiveIntensity: 0.25 }), 7, 6.3, z + 0.32, 9, 2.25, 1); }
  for (let k = 0; k < 5; k++) { const side = k % 2 ? 1 : -1; lamp(side * 19.4, z0 - 12 - k * 27, 8, side, k === 1 ? 1 : (k === 3 ? 2 : 0)); }
  const tl = []; for (let i = 0; i < 60; i++) { const side = R() < 0.5 ? -1 : 1; tl.push([side * rr(24, 46), rr(z0, z0 - AREA_LEN), rr(0.9, 1.4), R() < 0.3]); }
  forest(tl);
}

// ---------- Gebiet 5: Die Vorstadt ----------
function buildVorstadt() {
  const z0 = ZS(4), zc = z0 - AREA_LEN / 2;
  ground(4, 'lawn', 0x8a8a80, 'asphalt', 0x8a8a8a, 11);
  const sw = tmat('concrete', 0x7a7a78, 1, 40, { off: -2 });
  tuftField(z0, 300, 8.5, 19, 8);
  sm(G.plane, sw, -6.5, 0.02, zc, 2, AREA_LEN, 1, -Math.PI / 2); sm(G.plane, sw, 6.5, 0.02, zc, 2, AREA_LEN, 1, -Math.PI / 2);
  const dash = []; for (let z = z0 - 2; z > z0 - AREA_LEN; z -= 7) dash.push([0, 0.03, z, 0.15, 0.02, 2.5]); inst(G.box, mat(0x8a8670), dash);
  const hedge = mat(0x1a2a17); sm(G.box, hedge, -19.8, 0.75, zc, 1.2, 1.5, AREA_LEN); sm(G.box, hedge, 19.8, 0.75, zc, 1.2, 1.5, AREA_LEN);
  const walls = [0x6c6a60, 0x5b6470, 0x6e5f55, 0x5f665a], roofs = [0x2e2e32, 0x3a2622, 0x2a2a26];
  for (let i = 0; i < 7; i++) {
    const z = z0 - 12 - i * 17.5;
    house(-28, z, 10, 4.2, 10, 1, rpick(walls), rpick(roofs), { lit: 0.25, tv: i % 3 === 0 });
    house(28, z - 8, 10, 4.2, 10, -1, rpick(walls), rpick(roofs), { lit: 0.25, tv: i % 3 === 1 });
    bx(-22.6, 0, z + 6.5, 4, 3, 5, mat(rpick(walls))); bx(22.6, 0, z - 1.5, 4, 3, 5, mat(rpick(walls)));
    for (const [x, mz] of [[-17.8, z + 2], [17.8, z - 6]]) { sm(G.box, MATS.pole, x, 0.55, mz, 0.08, 1.1, 0.08); sm(G.box, mat(0x2a3a5a), x, 1.15, mz, 0.3, 0.25, 0.45); }
  }
  [[-12.5, -24, 0.02], [12.6, -46, 3.12], [-12.4, -78, 0.05], [12.5, -96, 3.1], [-3, -60, 0.9]].forEach(([x, dz, ry], i) => car(x, z0 + dz, ry, CAR_COLS[(i + 2) % CAR_COLS.length], { dead: i === 4 }));
  car(-7, z0 - 104, 0.4, 0xd8d8d8, { police: true });
  for (const [x, dz] of [[-15.5, -32], [15.4, -58], [-15.6, -88]]) { sm(G.cyl, mat(0x1f3a24), x, 0.55, z0 + dz, 0.7, 1.1, 0.7); solid(x, z0 + dz, 0.7, 0.7, 1.1); }
  // Schaukel, die sich von allein bewegt
  { const x = 11, z = z0 - 70, m = mat(0x5a2a2a, { sh: 40 });
    for (const sx of [-1.7, 1.7]) { sm(G.box, m, x + sx, 1.2, z - 0.5, 0.08, 2.6, 0.08, 0.2, 0, 0); sm(G.box, m, x + sx, 1.2, z + 0.5, 0.08, 2.6, 0.08, -0.2, 0, 0); }
    sm(G.box, m, x, 2.45, z, 3.6, 0.1, 0.1);
    for (const sx of [-0.8, 0.8]) {
      const p = new T.Group(); p.position.set(x + sx, 2.4, z); scene.add(p);
      sm(G.box, MATS.pole, 0, -0.9, -0.2, 0.02, 1.8, 0.02, 0, 0, 0, p); sm(G.box, MATS.pole, 0, -0.9, 0.2, 0.02, 1.8, 0.02, 0, 0, 0, p);
      sm(G.box, MATS.black, 0, -1.8, 0, 0.5, 0.05, 0.45, 0, 0, 0, p); swings.push({ p, ph: sx });
    }
    solid(x - 1.7, z, 0.3, 1.2, 2.5); solid(x + 1.7, z, 0.3, 1.2, 2.5); }
}

// ---------- Gebiet 6: Stadtzentrum ----------
function tower(x, z, w, h, d, mats) {
  bx(x, 0, z, w, h, d, mats[(R() * mats.length) | 0], false);
  if (R() < 0.4) { const m = new T.MeshBasicMaterial({ color: 0xff2020, fog: false }); sm(G.sphLo, m, x, h + 0.4, z, 0.4, 0.4, 0.4); flickers.push({ m, mode: 6, ph: R() * 3 }); }
}
function buildStadt() {
  const z0 = ZS(5);
  ground(5, 'asphalt', 0x8a8a8a, null);
  const am = tmat('asphalt', 0x9a9a9a, 6, 28, { bump: 0.3, sh: 12, off: -1 });
  sm(G.plane, am, 0, 0.012, z0 - 80, 33, 170, 1, -Math.PI / 2);
  const dash = []; for (const x of [-6, 6]) for (let z = z0 - 2; z > -785; z -= 8) dash.push([x, 0.03, z, 0.15, 0.02, 3]); inst(G.box, mat(0x8a8670), dash);
  const mats = [[2, 4], [2, 6], [3, 6], [2, 8]].map(([u, v]) => { const t = repTex(TEX.win, u, v); return new T.MeshPhongMaterial({ color: 0x15161b, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.85, shininess: 20, specular: 0x111111 }); });
  for (const side of [-1, 1]) { let z = z0 + 4; while (z > -792) { const d = rr(14, 20), w = rr(10, 15); tower(side * (20 + w / 2 + rr(0.5, 3)), z - d / 2, w, rr(26, 64), d, mats); z -= d + rr(1, 4); } }
  tower(0, -800, 44, 50, 14, mats);
  // Bus, Betonsperren, Autos
  bx(-10, 0.3, z0 - 32, 2.6, 3, 11, mat(0xc8a020, { sh: 20 }), true, 0.2);
  fires.push({ x: -10, y: 3.3, z: z0 - 32, r: 1.4, rate: 40 }); glowDisc(-10, z0 - 32, 7, 0xff7a2a, 0.3);
  const jm = tmat('concrete', 0xb0aea8, 1, 1, { bump: 0.3 });
  [[5, -20, 0.2], [-2, -46, -0.3], [9, -58, 1.4], [-12, -70, 0.1], [4, -84, 0.9], [-6, -96, -0.2], [11, -100, 0.4], [-8, -76 - 50, 0.3], [6, -138, -0.5]].forEach(([x, dz, ry]) => bx(x, 0, z0 + dz, 0.6, 0.95, 2.6, jm, true, ry));
  [[12, -40, 0.4, 1], [-13, -54, -0.3, 0], [3, -66, 2.0, 0], [-4, -110, 0.7, 1], [13, -118, 2.9, 0]].forEach(([x, dz, ry, f], i) => car(x, z0 + dz, ry, CAR_COLS[(i + 4) % CAR_COLS.length], { dead: true, fire: !!f }));
  // violette Auswüchse rund ums Portal
  const sp = mat(0x2a0a3a, { e: 0x7a2cff, ei: 0.55 });
  for (let i = 0; i < 26; i++) { const a = rr(0, Math.PI), r = rr(10, 17), x = Math.cos(a) * r * (R() < 0.5 ? -1 : 1), z = -778 + Math.sin(a) * r * 0.6; const h = rr(1.5, 5); sm(G.cone, sp, clamp(x, -19, 19), h / 2, z, rr(0.5, 1.2), h, rr(0.5, 1.2), rr(-0.3, 0.3), 0, rr(-0.3, 0.3)); }
  const vein = mat(0x1a0624, { e: 0x9a3cff, ei: 0.8 });
  for (let i = 0; i < 14; i++) { const a = rr(-1.3, 1.3), len = rr(14, 34); sm(G.box, vein, Math.sin(a) * len / 2, 0.03, -774 + Math.cos(a) * len / 2, 0.25, 0.04, len, 0, a, 0); }
  glowDisc(0, -774, 14, 0x8a2cff, 0.3);
  buildPortal();
}
function buildPortal() {
  const g = new T.Group(); g.position.set(0, 9.5, -777); scene.add(g);
  const glow = new T.Mesh(G.plane, new T.MeshBasicMaterial({ map: TEX.glow, color: 0x9a3cff, transparent: true, opacity: 0.8, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
  glow.scale.set(34, 34, 1); glow.position.z = -0.3;
  const disc = new T.Mesh(new T.CircleGeometry(6.9, 48), new T.MeshBasicMaterial({ map: TEX.swirl, transparent: true, opacity: 0.95, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
  const ring = new T.Mesh(new T.TorusGeometry(7.2, 0.55, 10, 56), new T.MeshBasicMaterial({ color: 0xc06bff, fog: false }));
  g.add(glow, disc, ring);
  portal = { g, glow, disc, ring, s: 1 };
}

// ---------- Unterschlüpfe & Barrieren ----------
function buildShelter(i) {
  const s = SAFE[i], x = 15.6, z = s.z;
  bx(x, 0, z, 4.8, 3.4, 6, tmat('concrete', new T.Color(SHELTERS[i].color).multiplyScalar(1.5).getHex(), 1, 1, { bump: 0.3 }), true);
  bx(x, 3.4, z, 5.4, 0.3, 6.6, mat(0x1d1c1c));
  bx(13.15, 0, z, 0.1, 2.3, 1.4, mat(0x1a0f05, { e: 0xf0a040, ei: 0.9 }));
  bx(13.1, 2.5, z, 0.25, 0.14, 0.5, mat(0x332211, { e: 0xffd9a0, ei: 1 }));
  const st = signTex(SHELTERS[i].sign, 'UNTERSCHLUPF', '#1a1612', '#f0ae4e');
  sm(G.plane, new T.MeshPhongMaterial({ map: st, emissive: 0xffffff, emissiveMap: st, emissiveIntensity: 0.55 }), 13.14, 2.95, z, 3.6, 0.9, 1, 0, -Math.PI / 2, 0);
  sm(G.ring, mat(0xf0ae4e, { basic: true, add: true, op: 0.55 }), s.x, 0.05, z, s.r * 2, 1, s.r * 2);
  glowDisc(s.x, z, s.r + 2, 0xf0a040, 0.25);
  if (i === 0) { // Opas Werkbank
    bx(12.7, 0, z - 2.4, 0.8, 0.9, 1.6, mat(0x5a3d24), true);
    bx(12.7, 0.9, z - 2.7, 0.35, 0.25, 0.6, mat(0x8a1a14, { sh: 40 }));
  } else buildMara(12.5, z - 2.4, i);
}
function buildMara(x, z, idx) {
  const g = new T.Group(); g.position.set(x, 0, z); scene.add(g);
  const coat = mat(0x5a3a26, { sh: 14 }), pants = mat(0x23252a), boots = mat(0x1a1410), skin = mat(0xd9a988, { sh: 15 }), hair = mat(0x8a2e18, { sh: 30 });
  for (const sx of [-0.1, 0.1]) { part(g, G.box, pants, sx, 0.45, 0, 0.13, 0.8, 0.15); part(g, G.box, boots, sx, 0.07, 0.03, 0.15, 0.14, 0.24); }
  part(g, G.cyl, coat, 0, 0.82, 0, 0.62, 0.75, 0.5);
  const torso = part(g, G.box, coat, 0, 1.28, 0, 0.42, 0.5, 0.26);
  part(g, G.box, mat(0x9a1f1f), 0, 1.5, 0.02, 0.36, 0.1, 0.3);
  const head = new T.Group(); head.position.set(0, 1.64, 0); g.add(head);
  part(head, G.sph, skin, 0, 0, 0, 0.21, 0.24, 0.22);
  part(head, G.sph, hair, 0, 0.04, -0.035, 0.23, 0.22, 0.23);
  part(head, G.cyl, hair, 0, -0.08, -0.15, 0.08, 0.3, 0.08).rotation.x = 0.5;
  part(head, G.sph, mat(0x2a3040), 0, 0.09, 0, 0.24, 0.14, 0.24);
  const eye = mat(0x101010, { basic: true }); part(head, G.sphLo, eye, -0.05, 0.01, 0.105, 0.025, 0.025, 0.02); part(head, G.sphLo, eye, 0.05, 0.01, 0.105, 0.025, 0.025, 0.02);
  part(g, G.box, mat(0x5a4128), 0, 1.2, -0.22, 0.36, 0.5, 0.2);
  part(g, G.cyl, mat(0x6a5a3a), 0, 1.5, -0.22, 0.14, 0.42, 0.14).rotation.z = Math.PI / 2;
  const armL = pivot(g, -0.27, 1.48, 0), armR = pivot(g, 0.27, 1.48, 0);
  for (const a of [armL, armR]) { part(a, G.box, coat, 0, -0.27, 0, 0.11, 0.55, 0.12); part(a, G.sph, skin, 0, -0.57, 0, 0.09, 0.09, 0.09); }
  part(armL, G.box, mat(0x3a2a10, { e: 0xffb050, ei: 1 }), 0, -0.72, 0.03, 0.12, 0.16, 0.12); part(armL, G.box, MATS.pole, 0, -0.62, 0.03, 0.02, 0.06, 0.02);
  armL.rotation.x = -0.25;
  glowDisc(x, z, 2.2, 0xffb050, 0.3);
  solid(x, z, 0.6, 0.6, 1.8);
  maras.push({ g, head, armL, armR, torso, x, z, idx, greeted: false, waveT: 0, t: R() * 6 });
}
function buildBarrier(a) {
  const z = ZS(a) - 118;
  const m = new T.MeshBasicMaterial({ map: TEX.barrier.clone(), color: 0xff2238, transparent: true, opacity: 0.6, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });
  m.map.needsUpdate = true; m.map.wrapS = m.map.wrapT = T.RepeatWrapping; m.map.repeat.set(4, 1);
  const mesh = new T.Mesh(G.plane, m); mesh.position.set(0, 2.6, z); mesh.scale.set(HALF_W * 2 + 0.4, 5.2, 1); scene.add(mesh);
  const pm = mat(0x3a0a10, { e: 0x5a0010, ei: 0.8 });
  sm(G.cyl, pm, -HALF_W - 0.4, 2.8, z, 0.9, 5.6, 0.9); sm(G.cyl, pm, HALF_W + 0.4, 2.8, z, 0.9, 5.6, 0.9);
  const s = solid(0, z, HALF_W * 2 + 1, 0.8, 6);
  barriers[a] = { mesh, m, s, open: false, t: 0 };
}
function setBarrier(a, open, instant) {
  const b = barriers[a]; if (!b) return;
  b.open = open; b.s.off = open;
  if (instant || !open) { b.mesh.visible = !open; b.mesh.scale.y = 5.2; b.m.opacity = 0.6; b.t = open ? 1 : 0; }
}

function buildWorld() {
  buildTextures(); initMats(); G.beam = new T.CylinderGeometry(0.15, 2.4, 1, 16, 1, true);
  buildHof(); buildWald(); buildDorf(); buildAutobahn(); buildVorstadt(); buildStadt();
  for (let i = 0; i < 6; i++) buildShelter(i);
  for (let a = 0; a < 5; a++) buildBarrier(a);
  buildSky(); buildMist();
  moon = new T.Mesh(G.sph, new T.MeshBasicMaterial({ color: 0xcfd6e0, fog: false })); moon.scale.setScalar(5); scene.add(moon);
  const mg = new T.Mesh(G.plane, new T.MeshBasicMaterial({ map: TEX.glow, color: 0x6a7a9a, transparent: true, opacity: 0.6, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
  mg.scale.set(30, 30, 1); moon.add(mg); mg.position.z = 0.6; mg.scale.set(4, 4, 1);
}

// Lebendige Welt: flackernde Lampen, Feuer, Schaukeln, Portal
function updateWorld(dt, t, near) {
  for (const f of flickers) {
    if (f.mode === 1) { const on = Math.random() < 0.85 ? 1 : 0.1; f.m.emissiveIntensity = on; if (f.glow) f.glow.opacity = f.gb * on; if (f.cone) f.cone.opacity = 0.15 * on; }
    else if (f.mode === 3) f.m.emissiveIntensity = 0.35 + Math.random() * 0.5;
    else if (f.mode === 4) f.m.color.setHex(Math.sin(t * 9) > 0 ? 0xff2030 : 0x200406);
    else if (f.mode === 5) f.m.color.setHex(Math.sin(t * 9) <= 0 ? 0x2050ff : 0x040820);
    else if (f.mode === 6) f.m.color.setHex(Math.sin(t * 2 + f.ph) > 0.6 ? 0xff2020 : 0x300404);
  }
  for (const f of fires) {
    if (Math.abs(f.z - near.z) > 45) continue;
    const n = f.rate * dt; for (let i = 0; i < n || Math.random() < n - i; i++) { fireBurst(f.x, f.y, f.z, 1, f.r); if (Math.random() < 0.15) smokePuff(f.x, f.y + 1, f.z, 1, 0.12); }
  }
  for (const s of swings) s.p.rotation.x = Math.sin(t * 1.3 + s.ph) * 0.35;
  for (const b of barriers) {
    if (!b) continue;
    if (!b.open) { b.m.opacity = 0.45 + Math.sin(t * 3) * 0.15; b.m.map.offset.x += dt * 0.05; b.m.map.offset.y -= dt * 0.15; }
    else if (b.mesh.visible) { b.t += dt; b.m.opacity = Math.max(0, 0.6 - b.t * 0.5); b.mesh.scale.y = Math.max(0.01, 5.2 * (1 - b.t * 0.7)); if (b.t > 1.3) b.mesh.visible = false; }
  }
  if (portal) { portal.disc.rotation.z -= dt * 0.8; portal.glow.material.opacity = 0.65 + Math.sin(t * 2) * 0.15; portal.g.scale.setScalar(portal.s); portal.g.visible = portal.s > 0.01; }
}
