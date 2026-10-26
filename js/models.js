// Portalnacht – Monster-Modelle: Haut plus Details (Zähne, Krallen, Knochen, Panzer)
'use strict';
const BONE = 0xcfc4a8, CLAW = 0x2a2522, DARK = 0x221c1a, CLOTH = 0x2e2a30, MOUTH = 0x3a0a0a, PLATE = 0x2c2826;

// Fügt viele kleine Teile zu einer Geometrie zusammen (weniger Draw-Calls).
// Eintrag: [geo, x, y, z, sx, sy, sz, rx, ry, rz, farbe]
function mergeParts(list, withColor) {
  const pos = [], nor = [], uv = [], col = [];
  const m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), nm = new T.Matrix3(), v = new T.Vector3(), c = new T.Color();
  for (const it of list) {
    const [geo, x, y, z, sx, sy, sz, rx, ry, rz, color] = it;
    const g = geo.index ? geo.toNonIndexed() : geo;
    m.compose(new T.Vector3(x, y, z), q.setFromEuler(e.set(rx || 0, ry || 0, rz || 0)), new T.Vector3(sx, sy, sz)); nm.getNormalMatrix(m);
    const p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv;
    if (withColor) c.setHex(color == null ? 0xffffff : color);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(m); pos.push(v.x, v.y, v.z);
      v.fromBufferAttribute(n, i).applyMatrix3(nm).normalize(); nor.push(v.x, v.y, v.z);
      if (u) uv.push(u.getX(i), u.getY(i)); else uv.push(0, 0);
      if (withColor) col.push(c.r, c.g, c.b);
    }
  }
  const out = new T.BufferGeometry();
  out.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
  out.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  if (withColor) out.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  out.computeBoundingSphere();
  return out;
}
// Reihe aus Zähnen oder Stacheln
function row(geo, n, x0, x1, y, z, s, rx, color, rz) {
  const out = []; for (let i = 0; i < n; i++) { const t = n === 1 ? 0.5 : i / (n - 1); out.push([geo, lerp(x0, x1, t), y, z, s[0], s[1], s[2], rx, 0, rz || 0, color]); } return out;
}
// Ein Körperteil: Haut-Geometrie und Detail-Geometrie (mit eigenen Farben)
function seg(skin, det) { return { s: skin.length ? mergeParts(skin, false) : null, d: det.length ? mergeParts(det, true) : null }; }

const MODELS = {};
function modelDefs(type) {
  if (MODELS[type]) return MODELS[type];
  const C = G.cyl, S = G.sph, B = G.box, K = G.cone, d = {};
  if (type === 'ghul') {
    d.leg = seg([[B, 0, -0.86, 0.07, 0.13, 0.08, 0.26]],
      [[C, 0, -0.22, 0, 0.17, 0.45, 0.17, 0, 0, 0, CLOTH], [C, 0, -0.62, 0.03, 0.14, 0.42, 0.14, 0, 0, 0, CLOTH], [S, 0, -0.42, 0.02, 0.17, 0.15, 0.17, 0, 0, 0, CLOTH]]);
    d.body = seg([
      [C, 0, 1.22, 0.05, 0.5, 0.72, 0.34, 0.35], [C, 0, 1.55, 0.15, 0.14, 0.22, 0.14, 0.5], [S, 0, 1.7, 0.2, 0.32, 0.37, 0.34],
      [S, 0, 1.64, 0.33, 0.12, 0.1, 0.1], [S, -0.16, 1.72, 0.18, 0.05, 0.09, 0.07], [S, 0.16, 1.72, 0.18, 0.05, 0.09, 0.07]],
      [[C, 0, 1.08, 0.02, 0.54, 0.34, 0.38, 0.35, 0, 0, CLOTH], [B, 0, 1.77, 0.33, 0.26, 0.05, 0.07, 0, 0, 0, DARK],
        ...[0, 1, 2].map(i => [B, 0, 1.3 + i * 0.08, 0.2 - i * 0.03, 0.3 - i * 0.03, 0.025, 0.03, 0.35, 0, 0, BONE]),
        ...[0, 1, 2, 3].map(i => [S, 0, 1.0 + i * 0.12, -0.1 - i * 0.02, 0.07, 0.06, 0.07, 0, 0, 0, BONE]),
        ...row(K, 6, -0.07, 0.07, 1.6, 0.36, [0.025, 0.06, 0.025], Math.PI, BONE)]);
    d.jaw = seg([[B, 0, -0.04, 0.08, 0.22, 0.07, 0.16]], [[B, 0, 0.0, 0.06, 0.18, 0.03, 0.12, 0, 0, 0, MOUTH], ...row(K, 5, -0.06, 0.06, 0.0, 0.14, [0.022, 0.05, 0.022], 0, BONE)]);
    d.arm = seg([[C, 0, -0.2, 0, 0.11, 0.42, 0.11], [S, 0, -0.42, 0, 0.11, 0.11, 0.11], [C, 0, -0.6, 0.06, 0.09, 0.38, 0.09, 0.2], [B, 0, -0.82, 0.1, 0.1, 0.12, 0.06]],
      [[C, 0, -0.1, 0, 0.13, 0.2, 0.13, 0, 0, 0, CLOTH], ...row(K, 4, -0.035, 0.035, -0.93, 0.12, [0.02, 0.1, 0.02], Math.PI + 0.3, CLAW)]);
    d.eyes = [[-0.08, 1.73, 0.36], [0.08, 1.73, 0.36]]; d.eyeS = 0.06;
  } else if (type === 'kriecher') {
    d.body = seg([[S, 0, 0.45, 0.2, 0.55, 0.4, 0.6], [S, 0, 0.5, -0.35, 0.7, 0.5, 0.85], [S, 0, 0.5, 0.6, 0.38, 0.32, 0.36]],
      [[S, 0, 0.62, -0.35, 0.6, 0.32, 0.76, 0, 0, 0, PLATE], [S, 0, 0.58, 0.22, 0.46, 0.22, 0.46, 0, 0, 0, PLATE],
        ...[[-0.15, 0.82, -0.3], [0.15, 0.82, -0.3], [0, 0.86, -0.08], [0, 0.8, -0.55]].map(([x, y, z]) => [K, x, y, z, 0.07, 0.22, 0.07, -0.4, 0, x * 2, BONE]),
        [K, -0.1, 0.42, 0.82, 0.05, 0.22, 0.05, Math.PI / 2, 0, 0.35, BONE], [K, 0.1, 0.42, 0.82, 0.05, 0.22, 0.05, Math.PI / 2, 0, -0.35, BONE],
        [B, 0, 0.41, 0.74, 0.22, 0.06, 0.04, 0, 0, 0, MOUTH], ...row(K, 5, -0.08, 0.08, 0.44, 0.76, [0.018, 0.045, 0.018], Math.PI, BONE)]);
    d.leg = side => seg([], [[B, side * 0.25, 0.12, 0, 0.5, 0.05, 0.05, 0, 0, side * 0.5, PLATE], [B, side * 0.52, -0.14, 0, 0.06, 0.52, 0.06, 0, 0, -side * 0.3, PLATE], [K, side * 0.6, -0.42, 0, 0.04, 0.12, 0.04, Math.PI, 0, 0, CLAW]]);
    d.eyes = [[-0.08, 0.6, 0.73], [0.08, 0.6, 0.73], [-0.16, 0.56, 0.68], [0.16, 0.56, 0.68]]; d.eyeS = 0.05;
  } else if (type === 'spucker') {
    d.leg = seg([[B, 0, -0.52, 0.06, 0.18, 0.08, 0.24]], [[C, 0, -0.27, 0, 0.16, 0.55, 0.16, 0, 0, 0, DARK]]);
    d.belly = seg([[S, 0, 0, 0, 1, 1, 1]], []);
    d.body = seg([[S, 0, 1.55, 0.22, 0.32, 0.32, 0.32]],
      [...[[0.3, 1.0, 0.36], [-0.25, 0.8, 0.38], [0.1, 1.3, 0.4], [-0.35, 1.2, 0.2], [0.42, 0.7, 0.1]].map(([x, y, z]) => [S, x, y, z, 0.1, 0.1, 0.08, 0, 0, 0, DARK]),
        [S, 0, 1.48, 0.36, 0.16, 0.13, 0.08, 0, 0, 0, MOUTH],
        ...Array.from({ length: 8 }, (_, i) => { const a = i / 8 * TAU; return [K, Math.cos(a) * 0.07, 1.48 + Math.sin(a) * 0.055, 0.39, 0.018, 0.05, 0.018, Math.PI / 2, 0, a + Math.PI / 2, BONE]; })]);
    d.sacks = [[0.35, 1.25, -0.25, 0.3], [-0.3, 1.05, -0.3, 0.26], [0, 1.42, -0.3, 0.22], [0.2, 0.75, -0.35, 0.18]];
    d.arm = seg([[C, 0, -0.22, 0, 0.1, 0.45, 0.1]], [...row(K, 3, -0.03, 0.03, -0.48, 0.02, [0.02, 0.08, 0.02], Math.PI, CLAW)]);
    d.eyes = [[-0.08, 1.63, 0.36], [0.08, 1.63, 0.36]]; d.eyeS = 0.05;
  } else if (type === 'koloss') {
    d.leg = seg([[C, 0, -0.3, 0, 0.45, 0.65, 0.45], [C, 0, -0.85, 0.04, 0.4, 0.6, 0.4]],
      [[B, 0, -0.6, 0.2, 0.3, 0.3, 0.12, 0, 0, 0, PLATE], [B, 0, -1.12, 0.1, 0.5, 0.2, 0.65, 0, 0, 0, DARK]]);
    d.body = seg([[C, 0, 1.95, 0.05, 1.4, 1.25, 0.95, 0.3], [S, 0, 2.72, 0.45, 0.5, 0.48, 0.5], [S, 0, 2.45, 0.2, 0.7, 0.4, 0.6]],
      [[B, -0.75, 2.45, 0, 0.55, 0.25, 0.6, 0, 0, 0.3, PLATE], [B, 0.75, 2.45, 0, 0.55, 0.25, 0.6, 0, 0, -0.3, PLATE], [B, 0, 1.9, 0.5, 0.9, 0.5, 0.12, 0.3, 0, 0, PLATE],
        ...[[0, 2.55, -0.4], [-0.4, 2.35, -0.38], [0.4, 2.35, -0.38], [-0.2, 2.05, -0.45], [0.2, 2.05, -0.45]].map(([x, y, z]) => [K, x, y, z, 0.18, 0.5, 0.18, -0.9, 0, 0, BONE]),
        [K, -0.2, 2.98, 0.4, 0.09, 0.32, 0.09, 0, 0, 0.5, BONE], [K, 0.2, 2.98, 0.4, 0.09, 0.32, 0.09, 0, 0, -0.5, BONE],
        [B, 0, 2.6, 0.7, 0.28, 0.08, 0.05, 0, 0, 0, MOUTH], [K, -0.12, 2.63, 0.72, 0.04, 0.14, 0.04, 0, 0, 0, BONE], [K, 0.12, 2.63, 0.72, 0.04, 0.14, 0.04, 0, 0, 0, BONE]]);
    d.arm = seg([[C, 0, -0.35, 0, 0.42, 0.75, 0.42], [C, 0, -1.05, 0, 0.46, 0.75, 0.46]],
      [[B, 0, -1.55, 0, 0.62, 0.52, 0.62, 0, 0, 0, DARK], ...row(K, 3, -0.18, 0.18, -1.55, 0.33, [0.07, 0.18, 0.07], Math.PI / 2, BONE), [B, 0, -0.2, 0, 0.5, 0.3, 0.5, 0, 0, 0, PLATE]]);
    d.eyes = [[-0.1, 2.77, 0.68], [0.1, 2.77, 0.68]]; d.eyeS = 0.07;
  } else if (type === 'schreier') {
    d.leg = seg([[C, 0, -0.47, 0, 0.09, 0.95, 0.09]], [[B, 0, -0.92, 0.06, 0.1, 0.06, 0.22, 0, 0, 0, DARK]]);
    d.body = seg([[C, 0, 1.3, 0.04, 0.34, 0.7, 0.22, 0.25], [C, 0, 1.62, 0.08, 0.08, 0.26, 0.08, 0.3], [S, 0, 1.82, 0.12, 0.3, 0.46, 0.3]],
      [...[0, 1, 2, 3].map(i => [B, 0, 1.15 + i * 0.09, 0.14, 0.3, 0.02, 0.03, 0.25, 0, 0, BONE]),
        [S, 0, 1.72, 0.25, 0.15, 0.24, 0.06, 0, 0, 0, MOUTH],
        ...Array.from({ length: 10 }, (_, i) => { const a = i / 10 * TAU; return [K, Math.cos(a) * 0.12, 1.72 + Math.sin(a) * 0.19, 0.28, 0.016, 0.05, 0.016, Math.PI / 2, 0, a + Math.PI / 2, BONE]; })]);
    d.arm = seg([[C, 0, -0.52, 0, 0.07, 1.05, 0.07]], [...row(K, 3, -0.03, 0.03, -1.12, 0.02, [0.018, 0.2, 0.018], Math.PI, BONE)]);
    d.eyes = [[-0.07, 1.92, 0.25], [0.07, 1.92, 0.25]]; d.eyeS = 0.045;
  } else if (type === 'koenigin') {
    d.body = seg([[S, 0, 1.9, -0.8, 2.4, 1.7, 2.8], [C, 0, 3.9, 0.7, 1.3, 2.2, 0.9], [S, 0, 5.4, 0.85, 0.95, 0.95, 0.95], [C, 0, 4.85, 0.8, 0.5, 0.5, 0.5]],
      [...[-1.2, -0.6, 0, 0.6].map(z => [S, 0, 2.3, z - 0.8, 2.2, 1.0, 0.4, 0, 0, 0, PLATE]),
        ...[0, 1, 2, 3, 4, 5].map(i => [K, 0, 2.7 - i * 0.1, -0.2 - i * 0.5, 0.25, 0.8, 0.25, -0.6, 0, 0, BONE]),
        [B, 0, 5.05, 1.3, 0.5, 0.12, 0.1, 0, 0, 0, MOUTH], ...row(K, 7, -0.2, 0.2, 5.1, 1.32, [0.04, 0.14, 0.04], Math.PI, BONE)]);
    d.leg = side => seg([], [[B, side * 0.9, 0.5, 0, 1.9, 0.2, 0.2, 0, 0, side * 0.5, PLATE], [B, side * 1.85, -0.6, 0, 0.18, 2.3, 0.18, 0, 0, -side * 0.25, PLATE], [K, side * 2.1, -1.8, 0, 0.12, 0.4, 0.12, Math.PI, 0, 0, CLAW]]);
    d.arm = seg([[C, 0, -1.0, 0, 0.22, 2.0, 0.22]], [[K, 0, -2.15, 0, 0.2, 0.5, 0.2, Math.PI, 0, 0, CLAW], [K, 0.08, -2.0, 0.05, 0.08, 0.35, 0.08, Math.PI, 0, 0.4, CLAW]]);
    d.crown = mergeParts(Array.from({ length: 7 }, (_, i) => { const a = i / 7 * TAU; return [K, Math.cos(a) * 0.55, 6.1, 0.85 + Math.sin(a) * 0.4, 0.14, 0.8, 0.14, Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.5]; }), false);
    d.veins = mergeParts(Array.from({ length: 10 }, (_, i) => [B, Math.sin(i * 1.7) * 1.0, 1.6 + Math.cos(i) * 0.5, -0.8 + Math.cos(i * 2.3) * 1.2, 0.05, 0.05, 1.4, 0, i * 0.6, 0]), false);
    d.eyes = [[-0.25, 5.5, 1.3], [0.25, 5.5, 1.3], [-0.12, 5.72, 1.32], [0.12, 5.72, 1.32], [-0.36, 5.3, 1.22], [0.36, 5.3, 1.22]]; d.eyeS = 0.09;
  }
  MODELS[type] = d; return d;
}
const DET_MAT = HAS_THREE ? new T.MeshPhongMaterial({ vertexColors: true, shininess: 30, specular: 0x333333 }) : null;
function addSeg(parent, sg, skin) {
  if (sg.s) { const o = new T.Mesh(sg.s, skin); o.castShadow = true; parent.add(o); }
  if (sg.d) { const o = new T.Mesh(sg.d, DET_MAT); o.castShadow = true; parent.add(o); }
}
function buildMonster(type) {
  const def = MT[type], d = modelDefs(type), g = new T.Group(); g.rotation.order = 'YXZ';
  const skin = new T.MeshPhongMaterial({ color: def.skin, map: TX.skin, bumpMap: TX.skin, bumpScale: 0.6, shininess: 18, specular: 0x161616, emissive: 0 });
  const eyeM = mat(def.eye, { basic: true, fog: false });
  const P = { eyes: [] };
  if (d.body) addSeg(g, d.body, skin);
  for (const [x, y, z] of d.eyes) P.eyes.push(part(g, G.sphLo, eyeM, x, y, z, d.eyeS * 1.4, d.eyeS * 1.4, d.eyeS));
  P.eyeColor = def.eye;
  if (type === 'ghul') {
    P.legs = [-0.13, 0.13].map(x => { const p = pivot(g, x, 0.9, 0); addSeg(p, d.leg, skin); return p; });
    P.arms = [-0.33, 0.33].map(x => { const p = pivot(g, x, 1.47, 0.1); addSeg(p, d.arm, skin); return p; });
    P.jaw = pivot(g, 0, 1.62, 0.25); addSeg(P.jaw, d.jaw, skin); P.armBase = -1.25;
  } else if (type === 'kriecher') {
    P.legs6 = [];
    for (const side of [-1, 1]) { const lg = d.leg(side); for (const k of [0.35, 0.05, -0.25]) { const p = pivot(g, side * 0.25, 0.48, k); addSeg(p, lg, skin); P.legs6.push(p); } }
  } else if (type === 'spucker') {
    P.legs = [-0.2, 0.2].map(x => { const p = pivot(g, x, 0.55, 0); addSeg(p, d.leg, skin); return p; });
    P.body = new T.Mesh(d.belly.s, skin); P.body.position.set(0, 1.0, 0); P.body.scale.set(0.95, 1.0, 0.85); P.body.castShadow = true; g.add(P.body); P.bodyS = P.body.scale.clone();
    const sac = mat(0x5aff3a, { basic: true }); P.sacks = d.sacks.map(([x, y, z, s]) => { const o = part(g, G.sph, sac, x, y, z, s, s, s); o.userData.s0 = s; return o; });
    P.arms = [-0.45, 0.45].map(x => { const p = pivot(g, x, 1.2, 0.1); addSeg(p, d.arm, skin); return p; }); P.armBase = -0.6;
  } else if (type === 'koloss') {
    P.legs = [-0.38, 0.38].map(x => { const p = pivot(g, x, 1.2, 0); addSeg(p, d.leg, skin); return p; });
    P.arms = [-0.92, 0.92].map(x => { const p = pivot(g, x, 2.45, 0.1); addSeg(p, d.arm, skin); return p; }); P.armBase = -0.35;
  } else if (type === 'schreier') {
    P.legs = [-0.12, 0.12].map(x => { const p = pivot(g, x, 0.95, 0); addSeg(p, d.leg, skin); return p; });
    P.arms = [-0.22, 0.22].map(x => { const p = pivot(g, x, 1.6, 0.05); addSeg(p, d.arm, skin); return p; }); P.armBase = -0.5;
  } else if (type === 'koenigin') {
    const glow = mat(0xd25cff, { basic: true, fog: false });
    P.core = part(g, G.sph, glow, 0, 3.9, 1.18, 0.45, 0.45, 0.3);
    g.add(new T.Mesh(d.crown, glow)); g.add(new T.Mesh(d.veins, mat(0x9a3cff, { basic: true })));
    P.legs6 = [];
    for (const side of [-1, 1]) { const lg = d.leg(side); for (const k of [-1.4, -0.4, 0.6]) { const p = pivot(g, side * 1.1, 1.8, k); addSeg(p, lg, skin); P.legs6.push(p); } }
    P.arms = [[-0.8, 4.7], [0.8, 4.7], [-0.75, 4.1], [0.75, 4.1]].map(([x, y]) => { const p = pivot(g, x, y, 0.8); addSeg(p, d.arm, skin); return p; }); P.armBase = -0.6;
  }
  return { g, P, skin };
}
