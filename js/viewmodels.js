// Portalnacht – Waffen in der Hand, leuchtende Stufen-Verzierungen, Effekte der Fähigkeiten
'use strict';
const VM = {};
const LV_GLOW = [0.18, 1.2, 1.35, 1.6];
function vmMatT(color, map, sh, ei) {
  return new T.MeshPhongMaterial({ color, map: map || null, emissive: color, emissiveMap: map || null, emissiveIntensity: ei == null ? 0.3 : ei, shininess: sh || 20, specular: sh > 50 ? 0x777777 : 0x222222 });
}
// Bausteine für die Teile-Listen (Format wie mergeParts)
const pb = (x, y, z, sx, sy, sz, rx, ry, rz) => [G.box, x, y, z, sx, sy, sz, rx || 0, ry || 0, rz || 0];
const pc = (x, y, z, r, l, rx, ry, rz) => [G.cyl, x, y, z, r * 2, l, r * 2, rx || 0, ry || 0, rz || 0];
const pcz = (x, y, z, r, l) => pc(x, y, z, r, l, Math.PI / 2);
const ps = (x, y, z, r, sy, sz) => [G.sph, x, y, z, r * 2, (sy || r) * 2, (sz || r) * 2];
const pk = (x, y, z, sx, h, sz, rx, ry, rz) => [G.cone, x, y, z, sx, h, sz, rx || 0, ry || 0, rz || 0];
const mirror = (f) => [f(1), f(-1)];

const MELEE_POSE = { p: [0.44, -0.5, -0.8], r: [-0.95, 0.25, -0.55] }, GUN_POSE = { p: [0.24, -0.26, -0.48], r: [0, 0.04, 0] };
const WEAPON_MODELS = {
  holz: { base: MELEE_POSE, tip: [0, 0.9, 0], parts: {
    leather: [pc(0, 0, 0, 0.028, 0.19)], dwood: [pb(0, 0.11, 0, 0.22, 0.04, 0.06), ps(0, -0.115, 0, 0.034)],
    wood: [pb(0, 0.48, 0, 0.075, 0.68, 0.028), pk(0, 0.87, 0, 0.075, 0.12, 0.028)], steel: mirror(s => ps(s * 0.06, 0.11, 0.031, 0.008)),
    accent: [pb(0, 0.46, 0.0145, 0.012, 0.52, 0.004), pb(0, 0.46, -0.0145, 0.012, 0.52, 0.004)] } },
  eisen: { base: MELEE_POSE, tip: [0, 1.0, 0], parts: {
    leather: [pc(0, 0, 0, 0.024, 0.2)], brass: [pc(0, 0.065, 0, 0.027, 0.015), pc(0, -0.065, 0, 0.027, 0.015)],
    steel: [pb(0, 0.11, 0, 0.26, 0.035, 0.05), ...mirror(s => ps(s * 0.13, 0.11, 0, 0.025)), ps(0, -0.12, 0, 0.034), pb(0, 0.56, 0, 0.08, 0.84, 0.018), pk(0, 0.99, 0, 0.08, 0.14, 0.018)],
    dark: [pb(0, 0.5, 0, 0.018, 0.6, 0.021)],
    accent: [...mirror(s => pb(s * 0.039, 0.56, 0, 0.006, 0.8, 0.02)), ps(0, 0.11, 0.028, 0.014, 0.014, 0.008), ps(0, 0.11, -0.028, 0.014, 0.014, 0.008)] } },
  axt: { base: { p: [0.44, -0.52, -0.78], r: [-0.9, 0.3, -0.5] }, tip: [0.2, 0.62, 0], parts: {
    dwood: [pc(0, 0.25, 0, 0.024, 0.9)], leather: [pc(0, -0.1, 0, 0.027, 0.18)], dark: [pc(0, 0.62, 0, 0.032, 0.13)],
    steel: [pb(0.09, 0.62, 0, 0.16, 0.16, 0.028), pb(0.19, 0.62, 0, 0.05, 0.27, 0.022), pk(-0.08, 0.62, 0, 0.05, 0.12, 0.03, 0, 0, Math.PI / 2)],
    accent: [pb(0.217, 0.62, 0, 0.006, 0.25, 0.024)] } },
  schleuder: { base: { p: [0.16, -0.3, -0.5], r: [0.15, 0, 0.1] }, muzzle: [0, 0.2, -0.1], parts: {
    dwood: [pc(0, 0, 0, 0.022, 0.17), pc(-0.04, 0.12, 0, 0.016, 0.11, 0, 0, 0.5), pc(0.04, 0.12, 0, 0.016, 0.11, 0, 0, -0.5)],
    leather: [pc(0, -0.02, 0, 0.025, 0.08), pb(0, 0.19, 0.055, 0.04, 0.025, 0.02)], dark: [pb(-0.035, 0.18, 0.03, 0.005, 0.005, 0.07, 0, 0.5, 0), pb(0.035, 0.18, 0.03, 0.005, 0.005, 0.07, 0, -0.5, 0)],
    steel: [ps(0, 0.19, 0.065, 0.022)], accent: [...mirror(s => ps(s * 0.068, 0.17, 0, 0.02)), pc(0, 0.07, 0, 0.024, 0.012)] } },
  bogen: { base: { p: [0.12, -0.24, -0.66], r: [0.06, 0.42, 0.32] }, muzzle: [0, 0, -0.62], inner: true, parts: {
    wood: [[new T.TorusGeometry(0.32, 0.016, 6, 28, Math.PI * 0.85), 0, 0, 0, 1, 1, 1, 0, 0, 0.575 * Math.PI], pb(-0.33, 0, 0, 0.5, 0.011, 0.011)],
    leather: [pc(-0.32, 0, 0, 0.024, 0.11)], str: [pb(-0.075, 0, 0, 0.005, 0.61, 0.005)], steel: [pk(-0.6, 0, 0, 0.026, 0.06, 0.026, 0, 0, Math.PI / 2)],
    red: [pb(-0.12, 0.013, 0, 0.08, 0.018, 0.002), pb(-0.12, -0.013, 0, 0.08, 0.018, 0.002)],
    accent: [ps(-0.075, 0.305, 0, 0.014), ps(-0.075, -0.305, 0, 0.014), pc(-0.32, 0.065, 0, 0.02, 0.012), pc(-0.32, -0.065, 0, 0.02, 0.012)] } },
  armbrust: { base: GUN_POSE, muzzle: [0, 0.075, -0.62], parts: {
    wood: [pb(0, 0, -0.15, 0.07, 0.08, 0.62), pb(0, -0.02, 0.2, 0.07, 0.12, 0.12)],
    steel: [[new T.TorusGeometry(0.3, 0.012, 6, 20, Math.PI * 0.7), 0, 0.04, -0.45, 1, 1, 1, -Math.PI / 2, 0, 0.15 * Math.PI], pk(0, 0.075, -0.6, 0.024, 0.05, 0.024, -Math.PI / 2)],
    str: [pb(0, 0.04, -0.586, 0.53, 0.004, 0.004)], dark: [pb(0, 0.075, -0.4, 0.012, 0.012, 0.36), pb(0, 0.05, -0.3, 0.03, 0.015, 0.5), pb(0, -0.06, -0.05, 0.01, 0.05, 0.02)],
    accent: mirror(s => pb(s * 0.036, 0, -0.15, 0.003, 0.02, 0.5)) } },
  pistole: { base: GUN_POSE, muzzle: [0, 0.035, -0.24], parts: {
    dark: [pb(0, 0.035, -0.09, 0.05, 0.055, 0.25)], poly: [pb(0, 0.0, -0.07, 0.046, 0.03, 0.22), pb(0, -0.07, 0.01, 0.045, 0.13, 0.065, 0.25), pb(0, -0.025, -0.04, 0.008, 0.008, 0.06), ...[0, 0.012, 0.024].map(z => pb(0, 0.035, z, 0.052, 0.04, 0.004))],
    steel: [pcz(0, 0.035, -0.225, 0.009, 0.03), pb(0, 0.067, -0.2, 0.008, 0.012, 0.012), pb(0, 0.067, 0.02, 0.02, 0.012, 0.008)],
    accent: [...mirror(s => pb(s * 0.026, 0.03, -0.09, 0.002, 0.008, 0.2)), ps(0, 0.075, -0.2, 0.004)] } },
  schrot: { base: GUN_POSE, muzzle: [0, 0.035, -0.8], parts: {
    dark: [pcz(0, 0.035, -0.42, 0.022, 0.74), pcz(0, 0.0, -0.36, 0.018, 0.6), pb(0, 0.02, -0.04, 0.06, 0.09, 0.2)],
    wood: [pb(0, 0.0, -0.38, 0.05, 0.045, 0.2), pb(0, -0.02, 0.15, 0.055, 0.09, 0.25, 0.1)], dwood: [0, 1, 2, 3].map(i => pb(0, 0, -0.45 + i * 0.045, 0.052, 0.047, 0.006)),
    poly: [pb(0, -0.03, 0.28, 0.058, 0.1, 0.02)], steel: [ps(0, 0.06, -0.78, 0.006)],
    accent: [...mirror(s => pb(s * 0.031, 0.02, -0.04, 0.002, 0.03, 0.18)), pcz(0, 0.035, -0.765, 0.025, 0.02)] } },
  gewehr: { base: GUN_POSE, muzzle: [0, 0.01, -0.74], lens: [0, 0.085, -0.232], parts: {
    poly: [pb(0, 0, -0.12, 0.065, 0.1, 0.38), pb(0, -0.11, -0.12, 0.045, 0.15, 0.07, 0.28), pb(0, -0.21, -0.09, 0.045, 0.08, 0.07, 0.5), pb(0, -0.09, 0.02, 0.04, 0.11, 0.05, 0.3), pb(0, -0.01, 0.18, 0.055, 0.09, 0.22), pb(0, 0.04, 0.2, 0.05, 0.02, 0.15)],
    dark: [pb(0, 0.0, -0.42, 0.06, 0.07, 0.24), pb(0, 0.045, -0.42, 0.03, 0.012, 0.24), pcz(0, 0.01, -0.71, 0.02, 0.05), pcz(0, 0.085, -0.15, 0.022, 0.16), pb(0, 0.06, -0.1, 0.02, 0.03, 0.02), pb(0, 0.06, -0.2, 0.02, 0.03, 0.02)],
    steel: [pcz(0, 0.01, -0.6, 0.013, 0.2)],
    accent: [...mirror(s => pb(s * 0.031, 0, -0.42, 0.002, 0.012, 0.22)), pcz(0, 0.085, -0.1, 0.024, 0.01)] } },
  rakete: { base: { p: [0.3, -0.3, -0.5], r: [0, 0.05, 0] }, muzzle: [0, 0.05, -0.62], parts: {
    olive: [pcz(0, 0.05, -0.15, 0.065, 0.85)], dark: [pcz(0, 0.05, -0.59, 0.078, 0.05), pcz(0, 0.05, 0.27, 0.078, 0.05), pb(-0.08, 0.11, -0.2, 0.022, 0.05, 0.07)],
    red: [pk(0, 0.05, -0.65, 0.12, 0.13, 0.12, -Math.PI / 2)], poly: [pb(0, -0.07, 0.0, 0.036, 0.1, 0.045, 0.2), pb(0, -0.06, -0.25, 0.032, 0.08, 0.036)],
    accent: [pcz(0, 0.05, -0.42, 0.067, 0.025), pcz(0, 0.05, 0.1, 0.067, 0.025)] } },
  feuer: { base: { p: [0.26, -0.28, -0.45], r: [0, 0.04, 0] }, muzzle: [0, 0, -0.66], flame: [0, -0.035, -0.66], parts: {
    steel: [pcz(0, 0, -0.4, 0.03, 0.5)], dark: [pcz(0, 0, -0.58, 0.045, 0.12)],
    poly: [pb(0, -0.02, -0.05, 0.09, 0.11, 0.28), pb(0, -0.11, 0.02, 0.04, 0.11, 0.05, 0.25), pb(0, -0.08, -0.28, 0.035, 0.09, 0.04)],
    red: [pcz(0.035, -0.1, -0.12, 0.04, 0.24), pcz(-0.035, -0.1, -0.12, 0.04, 0.24)], brass: [ps(0.035, -0.1, -0.245, 0.022), ps(-0.035, -0.1, -0.245, 0.022)],
    accent: [ps(0.047, 0.04, -0.1, 0.018, 0.018, 0.006), pcz(0, 0, -0.3, 0.033, 0.015), pcz(0, 0, -0.2, 0.033, 0.015)] } },
};

function buildViewModels() {
  vm = new T.Group(); camera.add(vm);
  Object.assign(VM, {
    wood: vmMatT(0xc89060, TX.vmwood, 18), dwood: vmMatT(0x86593a, TX.vmwood, 18), steel: vmMatT(0xdde2ea, TX.vmmetal, 90, 0.25), dark: vmMatT(0x4a4e58, TX.vmmetal, 60),
    poly: vmMatT(0x26282c, null, 35, 0.35), leather: vmMatT(0x6a4430, TX.vmwood, 10), olive: vmMatT(0x58653e, TX.vmmetal, 30), red: vmMatT(0x9a2018, TX.vmmetal, 40),
    brass: vmMatT(0xc8a050, TX.vmmetal, 80), str: vmMatT(0xe0d8c8, null, 5, 0.4),
  });
  for (const id in WEAPON_MODELS) {
    const def = WEAPON_MODELS[id], g = new T.Group(), holder = def.inner ? new T.Group() : g;
    if (def.inner) { holder.rotation.y = -Math.PI / 2; g.add(holder); }
    const accent = new T.MeshPhongMaterial({ color: 0x111111, emissive: LV_HEX[0], emissiveIntensity: LV_GLOW[0], shininess: 60 });
    for (const key in def.parts) holder.add(new T.Mesh(mergeParts(def.parts[key], false), key === 'accent' ? accent : VM[key]));
    if (def.lens) part(g, G.sph, new T.MeshBasicMaterial({ color: 0xff3030 }), def.lens[0], def.lens[1], def.lens[2], 0.032, 0.032, 0.008);
    if (def.flame) g.userData.pilot = part(g, G.sphLo, new T.MeshBasicMaterial({ color: 0xff9a3a }), def.flame[0], def.flame[1], def.flame[2], 0.036, 0.036, 0.036);
    const m = def.muzzle || def.tip;
    if (IS_TOUCH) vm.position.set(-0.06, 0.02, 0); // auf dem Handy etwas zur Mitte, damit die Knöpfe die Waffe nicht verdecken
    g.userData = Object.assign(g.userData, { base: def.base, muzzle: def.muzzle ? new T.Vector3(...def.muzzle) : null, fx: new T.Vector3(...m), accent });
    g.visible = false; vm.add(g); vmModels[id] = g;
  }
}
// Die Verzierungen leuchten in der Farbe der Stufe
function tintVM(id) {
  const g = vmModels[id]; if (!g) return;
  const lv = SV.weapons[id] || 1, a = g.userData.accent;
  a.emissive.setHex(accentHex(lv)); a.emissiveIntensity = vmGlow(lv);
}
// mit seltener Farbe leuchtet die Waffe immer kräftig, auch auf Stufe 1
function vmGlow(lv) { return SV.skin ? Math.max(1.2, LV_GLOW[lv - 1]) : LV_GLOW[lv - 1]; }
function equipVM(id) {
  for (const k in vmModels) vmModels[k].visible = k === id;
  tintVM(id);
  swapT = 0.25; fireCd = Math.max(fireCd, 0.15);
}
const _fx = HAS_THREE ? new T.Vector3() : null, _lc = HAS_THREE ? new T.Color() : null;
function updateVM(dt) {
  const w = curWeapon(), m = vmModels[w.id]; if (!m) return;
  vmKick = Math.max(0, vmKick - dt * 6); swapT = Math.max(0, swapT - dt);
  if (vmSwing > 0) vmSwing = Math.max(0, vmSwing - dt / 0.32);
  const b = m.userData.base, ma = player.moveAmt;
  let px = b.p[0] + Math.sin(player.bob) * 0.014 * ma, py = b.p[1] - Math.abs(Math.cos(player.bob)) * 0.012 * ma - swapT * 1.2, pz = b.p[2] + vmKick * 0.07;
  let rx = b.r[0] + vmKick * 0.18, ry = b.r[1], rz = b.r[2];
  if (w.kind === 'melee' && vmSwing > 0) { const t = 1 - vmSwing, s = Math.sin(t * Math.PI); rz += (t * 2.4 - 0.6) * s * 1.4; rx -= s * 0.9; px -= s * 0.28; py += s * 0.05; }
  m.position.set(px, py, pz); m.rotation.set(rx, ry, rz);
  // Leuchten und Funken
  const lv = SV.weapons[w.id] || 1, a = m.userData.accent;
  if (SV.skin) a.emissive.setHex(accentHex(lv));
  a.emissiveIntensity = vmGlow(lv) * (lv > 1 || SV.skin ? 0.85 + Math.sin(clock * 4) * 0.15 : 1) + (abOn[1] > 0 ? 0.8 : 0);
  if (m.userData.pilot) m.userData.pilot.scale.setScalar(0.03 + Math.random() * 0.012);
  const fxRate = (lv >= 3 || SV.skin ? 5 : 0) + (abOn[1] > 0 ? 18 : 0) + (abOn[2] > 0 ? 22 : 0);
  if (fxRate && Math.random() < dt * fxRate) {
    _fx.copy(m.userData.fx); m.localToWorld(_fx); _fx.x += rand(-0.05, 0.05); _fx.y += rand(-0.05, 0.05);
    if (abOn[2] > 0 && Math.random() < 0.6) PF.emit(_fx.x, _fx.y, _fx.z, rand(-0.2, 0.2), rand(0.4, 1), rand(-0.2, 0.2), rand(0.25, 0.45), 1, 0.5, 0.12, rand(0.05, 0.1), -1, -0.5, 1, 1);
    else { if (abOn[1] > 0 && Math.random() < 0.6) _lc.setHex(0xffc040); else _lc.setHex(accentHex(lv)); PG.emit(_fx.x, _fx.y, _fx.z, rand(-0.3, 0.3), rand(0.2, 0.8), rand(-0.3, 0.3), rand(0.3, 0.6), _lc.r, _lc.g, _lc.b, rand(0.025, 0.05), -0.5, 0, 1, 1); }
  }
  updateFxRings(dt);
}

// ---------- Effekte der Fähigkeiten ----------
const fxRings = [];
function fxRing(x, z, color, r) {
  const m = new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false });
  const o = new T.Mesh(G.ring, m); o.position.set(x, 0.06, z); scene.add(o);
  fxRings.push({ o, m, t: 0, r });
}
function updateFxRings(dt) {
  for (let i = fxRings.length - 1; i >= 0; i--) {
    const f = fxRings[i]; f.t += dt; const k = f.t / 0.7;
    f.o.scale.setScalar(0.5 + k * f.r * 2); f.m.opacity = Math.max(0, 0.9 * (1 - k));
    if (k >= 1) { scene.remove(f.o); f.m.dispose(); fxRings.splice(i, 1); }
  }
}
// Kiste (Holz mit Rahmen) oder Steinblock für den Bauer
const BARR = {};
function barricadeMesh(stone) {
  if (!BARR.crate) {
    const e = 0.09, beams = [];
    for (const a of [-1, 1]) for (const b of [-1, 1]) {
      beams.push(pb(a * (0.5 - e / 2), 0, b * (0.5 - e / 2), e, 1, e), pb(0, a * (0.5 - e / 2), b * (0.5 - e / 2), 1, e, e), pb(a * (0.5 - e / 2), b * (0.5 - e / 2), 0, e, e, 1));
    }
    for (const s of [-1, 1]) { beams.push(pb(0, 0, s * 0.49, 0.06, 1.25, 0.04, 0, 0, Math.PI / 4)); beams.push(pb(s * 0.49, 0, 0, 0.04, 1.25, 0.06, Math.PI / 4)); }
    BARR.crate = mergeParts([pb(0, 0, 0, 0.94, 0.94, 0.94)], false); BARR.frame = mergeParts(beams, false);
    BARR.stone = mergeParts([pb(0, -0.05, 0, 1, 1.1, 0.9), pb(0.04, 0.55, -0.02, 0.86, 0.12, 0.76, 0, 0.06, 0), pb(-0.3, -0.5, 0.32, 0.3, 0.2, 0.25, 0.2, 0.4, 0.1)], false);
    BARR.mCrate = tmat('wood', 0xc89a6a, 1, 1, { bump: 0.4 }); BARR.mFrame = tmat('wood', 0x7a5536, 1, 1); BARR.mStone = tmat('rock', 0xc0bcb4, 1, 1, { bump: 0.7 });
  }
  const g = new T.Group();
  if (stone) g.add(new T.Mesh(BARR.stone, BARR.mStone));
  else { g.add(new T.Mesh(BARR.crate, BARR.mCrate)); g.add(new T.Mesh(BARR.frame, BARR.mFrame)); }
  g.traverse(o => { o.castShadow = true; o.receiveShadow = true; });
  return g;
}
