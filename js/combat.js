// Portalnacht – Waffen, Geschosse, Fähigkeiten, Barrikaden
'use strict';
const barricades = [], projs = [], acids = [], patches = [], pickups = [], decals = [], tracers = [], grenades = [];
const abCd = [0, 0, 0, 0], abOn = [0, 0, 0, 0];
let axtCount = 0, fireCd = 0, vmKick = 0, vmSwing = 0, swapT = 0, muzzleT = 0, patchCd = 0, flameOn = false, grenCd = 0, tracerCol = 0xffd27a;
const vmModels = {};
let vm = null;
const _o = HAS_THREE ? new T.Vector3() : null, _d = HAS_THREE ? new T.Vector3() : null, _c = HAS_THREE ? new T.Vector3() : null, _m = HAS_THREE ? new T.Vector3() : null;

function abLv(i) { return SV.abil[ABILITIES[i].id] || 0; }
function ampMult() { return abOn[1] > 0 ? 2 : 1; }
function brandOn() { return abOn[2] > 0; }
function burnFrac() { return [0.3, 0.45, 0.6, 0.8][Math.max(0, abLv(2) - 1)]; }
function burnDur() { return [3, 3.5, 4, 5][Math.max(0, abLv(2) - 1)]; }

// ---------- Blutflecken ----------
function addDecal(x, z, s, col) {
  let d;
  if (decals.length < 40) { const m = new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }); d = { mesh: new T.Mesh(G.disc, m), m }; scene.add(d.mesh); }
  else { d = decals.shift(); d.m.color.setHex(col); }
  d.mesh.position.set(x, 0.03 + Math.random() * 0.01, z); d.mesh.scale.set(s, 1, s * rand(0.7, 1.3)); d.mesh.rotation.y = rand(0, TAU);
  d.m.opacity = 0.85; d.t = 0; decals.push(d);
}
function clearDecals() { for (const d of decals) { scene.remove(d.mesh); d.m.dispose(); } decals.length = 0; }

// ---------- Barrikaden (Bauer) ----------
function placeBarricade(lv) {
  const n = [1, 2, 3, 5][lv - 1], stone = lv >= 3, hp = [160, 220, 420, 600][lv - 1] * (1 + curArea() * 0.45);
  const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw), rx = Math.cos(player.yaw), rz = -Math.sin(player.yaw);
  const cx = player.pos.x + fx * 2.4, cz = player.pos.z + fz * 2.4;
  let placed = 0;
  for (let k = 0; k < n; k++) {
    const off = (k - (n - 1) / 2) * 1.08, x = cx + rx * off, z = cz + rz * off;
    if (blockedAt(x, z, 0.5) || inSafe(x, z, 0.5)) continue;
    let near = false; for (const b of barricades) if (Math.hypot(b.x - x, b.z - z) < 0.9) near = true; if (near) continue;
    const h = stone ? 1.2 : 1, mesh = barricadeMesh(stone);
    mesh.rotation.y = player.yaw; mesh.position.set(x, 2.5, z); scene.add(mesh);
    const c = Math.abs(Math.cos(player.yaw)), s = Math.abs(Math.sin(player.yaw)), w = (c + s * (stone ? 0.9 : 1)) / 2, d = (s + c * (stone ? 0.9 : 1)) / 2;
    barricades.push({ mesh, x, z, x0: x - w, x1: x + w, z0: z - d, z1: z + d, h, hp, max: hp, drop: 0, shake: 0, stone });
    placed++;
  }
  while (barricades.length > 14) destroyBarricade(barricades[0], true);
  if (placed) { AU.play('build'); achAdd('blocks', placed); }
  return placed > 0;
}
function destroyBarricade(b, quiet) {
  const i = barricades.indexOf(b); if (i < 0) return;
  barricades.splice(i, 1); scene.remove(b.mesh);
  if (!quiet) { const c = b.stone ? 0.4 : 0.35; for (let k = 0; k < 14; k++) PS.emit(b.x, rand(0.2, 1), b.z, rand(-3, 3), rand(1, 4), rand(-3, 3), rand(0.5, 1), c, b.stone ? c : c * 0.7, b.stone ? c : c * 0.45, rand(0.1, 0.2), 9.8, 0, 0.5, 1); AU.play('break', 0.05); }
}
function updateBarricades(dt) {
  for (const b of barricades) {
    if (b.drop < 1) { b.drop = Math.min(1, b.drop + dt * 4); b.mesh.position.y = lerp(2.5, b.h / 2, b.drop * b.drop); if (b.drop >= 1) smokePuff(b.x, 0.1, b.z, 4, 0.2); }
    if (b.shake > 0) { b.shake -= dt; b.mesh.position.x = b.x + rand(-0.05, 0.05); } else b.mesh.position.x = b.x;
  }
}
function clearBarricades() { while (barricades.length) destroyBarricade(barricades[0], true); }

// ---------- Feuerflächen (Verbrenner, Raketen) ----------
function addPatch(x, z, r, dur) {
  if (patches.length > 12) { const p = patches.shift(); scene.remove(p.mesh); p.m.dispose(); }
  const m = new T.MeshBasicMaterial({ map: TEX.glow, color: 0xff6a20, transparent: true, opacity: 0.6, blending: T.AdditiveBlending, depthWrite: false });
  const mesh = new T.Mesh(G.plane, m); mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, 0.05, z); mesh.scale.set(r * 2.6, r * 2.6, 1); scene.add(mesh);
  patches.push({ x, z, r, t: dur, max: dur, mesh, m, dps: 14 * HPM[curArea()] });
}
function updatePatches(dt) {
  for (let i = patches.length - 1; i >= 0; i--) {
    const p = patches[i]; p.t -= dt;
    if (p.t <= 0) { scene.remove(p.mesh); p.m.dispose(); patches.splice(i, 1); continue; }
    p.m.opacity = 0.6 * Math.min(1, p.t / 0.6) * (0.8 + Math.random() * 0.2);
    if (Math.random() < dt * 26) fireBurst(p.x + rand(-p.r, p.r) * 0.7, 0.1, p.z + rand(-p.r, p.r) * 0.7, 1, 0.2);
    for (const m of monsters) if (m.state !== 'dead' && Math.hypot(m.g.position.x - p.x, m.g.position.z - p.z) < p.r + m.r) applyBurn(m, p.dps, 1.5);
  }
}
function clearPatches() { for (const p of patches) { scene.remove(p.mesh); p.m.dispose(); } patches.length = 0; }

// ---------- Erste-Hilfe-Kästen ----------
function spawnPickup(x, z, kind) {
  kind = kind || 'med';
  const g = new T.Group(); g.position.set(x, 0.5, z);
  if (kind === 'gren') { part(g, G.sph, mat(0x3a4a2a, { e: 0x1a2a10, sh: 40 }), 0, 0, 0, 0.3, 0.36, 0.3); part(g, G.box, mat(0x8a8a80), 0, 0.2, 0, 0.1, 0.08, 0.1); }
  else {
    part(g, G.box, mat(0xd8d8d0, { e: 0x303030 }), 0, 0, 0, 0.45, 0.32, 0.45);
    const red = mat(0xff2a2a, { basic: true }); part(g, G.box, red, 0, 0.17, 0, 0.3, 0.02, 0.09); part(g, G.box, red, 0, 0.17, 0, 0.09, 0.02, 0.3);
  }
  scene.add(g); pickups.push({ g, x, z, t: 30, kind });
}
function updatePickups(dt, t) {
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i]; p.t -= dt; p.g.rotation.y += dt * 1.6; p.g.position.y = 0.45 + Math.sin(t * 3 + i) * 0.08;
    const gr = p.kind === 'gren', near = Math.hypot(player.pos.x - p.x, player.pos.z - p.z) < 1.3;
    if (Math.random() < dt * 4) PG.emit(p.x, 0.6, p.z, 0, 0.6, 0, 0.8, gr ? 0.5 : 0.9, gr ? 0.9 : 0.2, 0.2, 0.15, 0, 0, 0, 0.7);
    if (near && gr && SV.gren < grenMax()) { SV.gren++; AU.play('coin'); showMsg('+1 Granate'); scene.remove(p.g); pickups.splice(i, 1); continue; }
    if (near && !gr && player.hp < player.maxHp) {
      player.hp = Math.min(player.maxHp, player.hp + 22); healFx(); AU.play('heal'); showMsg('+22 Leben');
      scene.remove(p.g); pickups.splice(i, 1); continue;
    }
    if (p.t <= 0) { scene.remove(p.g); pickups.splice(i, 1); }
  }
}
function clearPickups() { for (const p of pickups) scene.remove(p.g); pickups.length = 0; }

// ---------- Strahlen-Mathematik ----------
function raySphere(o, d, c, r) {
  const ox = o.x - c.x, oy = o.y - c.y, oz = o.z - c.z, b = ox * d.x + oy * d.y + oz * d.z, cc = ox * ox + oy * oy + oz * oz - r * r, h = b * b - cc;
  if (h < 0) return -1; const s = Math.sqrt(h), t = -b - s; return t > 0 ? t : (-b + s > 0 ? 0 : -1);
}
function rayBox(o, d, s) {
  let tmin = 0, tmax = 1e9;
  const ax = [[o.x, d.x, s.x0, s.x1], [o.y, d.y, s.y0, s.y1], [o.z, d.z, s.z0, s.z1]];
  for (const [p, v, a, b] of ax) {
    if (Math.abs(v) < 1e-6) { if (p < a || p > b) return -1; continue; }
    let t1 = (a - p) / v, t2 = (b - p) / v; if (t1 > t2) { const q = t1; t1 = t2; t2 = q; }
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2); if (tmin > tmax) return -1;
  }
  return tmin;
}
function segSphere(a, b, c, r) {
  const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z, l2 = abx * abx + aby * aby + abz * abz || 1e-6;
  const t = clamp(((c.x - a.x) * abx + (c.y - a.y) * aby + (c.z - a.z) * abz) / l2, 0, 1);
  const x = a.x + abx * t - c.x, y = a.y + aby * t - c.y, z = a.z + abz * t - c.z; return x * x + y * y + z * z < r * r;
}
function inBox(p, s) { return p.x > s.x0 && p.x < s.x1 && p.z > s.z0 && p.z < s.z1 && p.y > s.y0 && p.y < s.y1; }
// leichte Zielhilfe für Touch: Richtung auf ein Monster nahe am Fadenkreuz einrasten
function aimAssist(dir, range) {
  const strength = { aus: 0, normal: 1, stark: 1.8 }[OPT.aim]; if (!strength) return dir.clone();
  let best = (IS_TOUCH ? 0.075 : 0.035) * strength, out = null; const o = camera.position;
  for (const m of monsters) {
    if (m.state !== 'chase' && m.state !== 'rise') continue;
    const h = m.hits[m.hits.length > 2 ? 1 : 0];
    _c.set(m.g.position.x - o.x, m.g.position.y + h[0] * m.sc - o.y, m.g.position.z - o.z);
    const L = _c.length(); if (L > range || L < 0.5) continue; _c.divideScalar(L);
    const ang = Math.acos(clamp(_c.dot(dir), -1, 1)); if (ang < best) { best = ang; out = _c.clone(); }
  }
  return out || dir.clone();
}

// ---------- Effekte ----------
function tracer(a, b, col) {
  const geo = new T.BufferGeometry().setFromPoints([a.clone(), b.clone()]);
  const m = new T.LineBasicMaterial({ color: col || 0xffd27a, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false });
  const l = new T.Line(geo, m); scene.add(l); tracers.push({ l, t: 0.06 });
}
function updateTracers(dt) { for (let i = tracers.length - 1; i >= 0; i--) { const tr = tracers[i]; tr.t -= dt; tr.l.material.opacity = Math.max(0, tr.t / 0.06); if (tr.t <= 0) { scene.remove(tr.l); tr.l.geometry.dispose(); tr.l.material.dispose(); tracers.splice(i, 1); } } }
function muzzleWorld(out) { const g = vmModels[SV.cur] || vm, u = g.userData.muzzle; if (u) out.copy(u); else out.set(0, 0, -0.6); g.localToWorld(out); return out; }
function flashMuzzle(strength) { muzzleLight.intensity = 2.6 * (strength || 1); muzzleT = 0.05; muzzleWorld(_m); PG.emit(_m.x, _m.y, _m.z, 0, 0, 0, 0.05, 1, 0.75, 0.35, 0.35 * (strength || 1), 0, 0, 0, 1); }
function explode(p, dmg, R, patch) {
  boomLight.position.copy(p); boomLight.position.y = Math.max(1, p.y); boomLight.intensity = 6;
  for (let i = 0; i < 60; i++) PF.emit(p.x, p.y + 0.3, p.z, rand(-5, 5), rand(1, 6), rand(-5, 5), rand(0.3, 0.8), 1, rand(0.4, 0.7), 0.15, rand(0.4, 0.9), 2, -0.4, 2, 1);
  smokePuff(p.x, p.y, p.z, 22, 0.2); sparks(p.x, p.y + 0.3, p.z, 30, 1, 0.8, 0.4);
  addDecal(p.x, p.z, R * 0.9, 0x0e0c0b); if (patch !== false) addPatch(p.x, p.z, 1.6, 2.5);
  AU.play('boom', 0.05); const dd = p.distanceTo(camera.position); shake = Math.max(shake, clamp(1 - dd / 30, 0, 0.8));
  let killed = 0;
  for (const m of monsters.slice()) {
    if (m.state === 'dead') continue;
    const d = Math.hypot(m.g.position.x - p.x, m.g.position.z - p.z) - m.r;
    if (d < R) { launchMonster(m, p.x, p.z, 14 * (1 - Math.max(0, d) / R) + 3); _c.set(m.g.position.x, m.g.position.y + m.sc, m.g.position.z); if (damageMonster(m, dmg * (1 - 0.6 * Math.max(0, d) / R), _c, false, 0, 'expl')) killed++; }
  }
  achMax('multi', killed);
}

// ---------- Geschosse ----------
function projMesh(kind) {
  if (kind === 'stone') { const o = new T.Mesh(G.sphLo, mat(0x7a7a76)); o.scale.setScalar(0.1); return o; }
  const g = new T.Group();
  if (kind === 'arrow') { part(g, G.box, mat(0x8a6038), 0, 0, 0, 0.02, 0.02, 0.62); part(g, G.cone, mat(0x9a9ca0), 0, 0, 0.33, 0.035, 0.08, 0.035).rotation.x = Math.PI / 2; part(g, G.box, mat(0xb03030), 0, 0, -0.28, 0.08, 0.005, 0.1); }
  else if (kind === 'bolt') { part(g, G.box, mat(0x4a4a4e), 0, 0, 0, 0.035, 0.035, 0.42); part(g, G.cone, mat(0xb8bcc4), 0, 0, 0.24, 0.05, 0.1, 0.05).rotation.x = Math.PI / 2; }
  else if (kind === 'wave') { const a = new T.Mesh(new T.TorusGeometry(0.7, 0.06, 4, 18, Math.PI), new T.MeshBasicMaterial({ color: LV_HEX[3], transparent: true, opacity: 0.85, blending: T.AdditiveBlending, depthWrite: false })); a.rotation.x = Math.PI / 2; g.add(a); }
  else if (kind === 'rocket') { part(g, G.cyl, mat(0x4a5038), 0, 0, 0, 0.12, 0.6, 0.12).rotation.x = Math.PI / 2; part(g, G.cone, mat(0x8a1a14), 0, 0, 0.38, 0.12, 0.18, 0.12).rotation.x = Math.PI / 2; part(g, G.sphLo, mat(0xffb040, { basic: true }), 0, 0, -0.32, 0.12, 0.12, 0.12); }
  return g;
}
function spawnProj(w, dmg, dir, opt) {
  const mesh = projMesh(w.proj); muzzleWorld(_m);
  mesh.position.copy(camera.position).addScaledVector(dir, 0.6); mesh.position.y -= 0.1;
  scene.add(mesh);
  projs.push(Object.assign({ mesh, vel: dir.clone().multiplyScalar(w.speed), grav: w.grav || 0, dmg, pierce: w.pierce || 0, hit: new Set(), life: w.kind === 'rocket' ? 4 : 3, rocket: w.kind === 'rocket', splash: w.splash || 0, stuck: 0, kb: w.kb || 0 }, opt || {}));
}
// Spezialkräfte auf Stufe 4
function spawnWave(dmg) {
  const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw), mesh = projMesh('wave');
  mesh.position.set(player.pos.x + fx * 0.8, 1.1, player.pos.z + fz * 0.8); scene.add(mesh);
  projs.push({ mesh, vel: new T.Vector3(fx * 20, 0, fz * 20), grav: 0, dmg, pierce: 99, hit: new Set(), life: 0.6, wave: true, stuck: 0, kb: 4 });
}
function groundSlam(dmg) {
  const px = player.pos.x, pz = player.pos.z;
  for (const m of monsters.slice()) { if (m.state === 'dead') continue; const d = Math.hypot(m.g.position.x - px, m.g.position.z - pz) - m.r; if (d < 4.2) { _c.set(m.g.position.x, m.g.position.y + m.sc, m.g.position.z); damageMonster(m, dmg, _c, false, 6); } }
  for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; smokePuff(px + Math.cos(a) * 2.5, 0.1, pz + Math.sin(a) * 2.5, 1, 0.2); }
  fxRing(px, pz, LV_HEX[3], 4.2); shake = Math.max(shake, 0.35); AU.play('boom', 0.1);
}
function homeIn(p, dt) {
  let best = null, bd = 1e9; const pos = p.mesh.position, v = _d.copy(p.vel).normalize();
  for (const m of monsters) {
    if (m.state === 'dead') continue;
    _c.set(m.g.position.x - pos.x, m.g.position.y + m.sc - pos.y, m.g.position.z - pos.z);
    const L = _c.length(); if (L > 35 || L < 0.5) continue;
    if (_c.divideScalar(L).dot(v) < 0.55) continue;
    if (L < bd) { bd = L; best = _c.clone(); }
  }
  if (!best) return;
  const sp = p.vel.length(); p.vel.normalize().addScaledVector(best, dt * 3.5).normalize().multiplyScalar(sp);
}
function endProj(i) { const p = projs[i]; scene.remove(p.mesh); projs.splice(i, 1); }
function updateProjs(dt) {
  const from = new T.Vector3(), to = new T.Vector3();
  for (let i = projs.length - 1; i >= 0; i--) {
    const p = projs[i];
    if (p.stuck > 0) { p.stuck -= dt; if (p.stuck <= 0) endProj(i); continue; }
    p.life -= dt; if (p.life <= 0) { if (p.rocket) explode(p.mesh.position, p.dmg, p.splash); endProj(i); continue; }
    if (p.homing) homeIn(p, dt);
    p.vel.y -= p.grav * dt; from.copy(p.mesh.position); to.copy(from).addScaledVector(p.vel, dt);
    let done = false;
    for (const m of monsters) {
      if (m.state === 'dead' || p.hit.has(m)) continue;
      const gp = m.g.position; if (Math.abs(gp.x - to.x) > 6 || Math.abs(gp.z - to.z) > 6) continue;
      for (const h of m.hits) {
        _c.set(gp.x, gp.y + h[0] * m.sc, gp.z);
        if (segSphere(from, to, _c, h[1] * m.sc + (p.rocket ? 0.2 : p.wave ? 0.6 : 0.05))) {
          p.hit.add(m);
          if (p.rocket) { explode(to, p.dmg, p.splash); done = true; }
          else if (p.boom) { explode(to, p.dmg * 0.6, 2.5, false); damageMonster(m, p.dmg * 0.4, to, !!h[2], p.kb); done = true; }
          else { damageMonster(m, p.dmg * (h[2] ? 1.6 : 1), to, !!h[2], p.kb); if (p.fire) applyBurn(m, p.dmg * 0.4, 3); if (p.pierce-- <= 0) done = true; }
          break;
        }
      }
      if (done) break;
    }
    if (!done) {
      let hitWall = to.y <= 0.02;
      if (!hitWall) for (const s of solids) if (!s.off && inBox(to, s)) { hitWall = true; break; }
      if (hitWall) {
        if (p.rocket) explode(to, p.dmg, p.splash);
        else if (p.boom) explode(to, p.dmg * 0.6, 2.5, false);
        else if (p.wave) { smokePuff(to.x, 0.2, to.z, 4, 0.2); }
        else {
          if (p.fire) addPatch(to.x, to.z, 1.4, 3); sparks(to.x, Math.max(0.05, to.y), to.z, 4, 0.8, 0.7, 0.5); if (brandOn() && patchCd <= 0) { addPatch(to.x, to.z, 1.2, 3); patchCd = 0.3; } p.mesh.position.copy(to); p.stuck = 1.5; continue; }
        done = true;
      }
    }
    if (done) { endProj(i); continue; }
    p.mesh.position.copy(to); _c.copy(to).add(p.vel); p.mesh.lookAt(_c);
    if (p.wave && Math.random() < 0.9) PG.emit(to.x + rand(-0.5, 0.5), to.y, to.z + rand(-0.5, 0.5), 0, 0.3, 0, 0.3, 1, 0.25, 0.3, 0.12, 0, 0, 0, 1);
    if (p.fire && Math.random() < 0.7) PF.emit(to.x, to.y, to.z, 0, 0.3, 0, 0.25, 1, 0.5, 0.1, 0.12, 0, -0.5, 0, 1);
    if (p.boom && Math.random() < 0.5) PG.emit(to.x, to.y, to.z, 0, 0, 0, 0.2, 1, 0.3, 0.2, 0.08, 0, 0, 0, 1);
    if (p.rocket && Math.random() < 0.8) { PS.emit(from.x, from.y, from.z, rand(-0.3, 0.3), rand(0, 0.4), rand(-0.3, 0.3), rand(0.5, 0.9), 0.3, 0.3, 0.3, 0.25, 0, 2.5, 1, 0.5); PF.emit(from.x, from.y, from.z, 0, 0, 0, 0.1, 1, 0.6, 0.2, 0.25, 0, -0.5, 0, 1); }
  }
}
function clearProjs() { while (projs.length) endProj(projs.length - 1); }

// ---------- Säure der Spucker ----------
function spitAcid(m, mult, spread) {
  const gp = m.g.position, y = gp.y + (m.boss ? 5.2 : 1.5) * m.sc;
  const fwd = m.g.rotation.y;
  const o = new T.Vector3(gp.x + Math.sin(fwd) * 0.5 * m.sc, y, gp.z + Math.cos(fwd) * 0.5 * m.sc);
  const tgt = new T.Vector3(player.pos.x, player.eye - 0.3, player.pos.z);
  const d = tgt.sub(o).normalize();
  if (spread) { const c = Math.cos(spread), s = Math.sin(spread), x = d.x * c - d.z * s, z = d.x * s + d.z * c; d.x = x; d.z = z; }
  const mesh = new T.Mesh(G.sphLo, mat(0x8aff4a, { basic: true })); mesh.scale.setScalar(m.boss ? 0.4 : 0.22); mesh.position.copy(o); scene.add(mesh);
  if (m.boss) mesh.material = mat(0xd25cff, { basic: true });
  acids.push({ mesh, vel: d.multiplyScalar(m.boss ? 15 : 13), dmg: m.dmg * mult, life: 4, boss: m.boss });
}
function updateAcids(dt) {
  for (let i = acids.length - 1; i >= 0; i--) {
    const a = acids[i], p = a.mesh.position; a.life -= dt;
    p.addScaledVector(a.vel, dt);
    const c = a.boss ? [0.8, 0.35, 1] : [0.5, 1, 0.3];
    if (Math.random() < 0.7) PG.emit(p.x, p.y, p.z, rand(-0.3, 0.3), rand(-0.3, 0.3), rand(-0.3, 0.3), 0.35, c[0], c[1], c[2], 0.16, 0, -0.5, 0, 0.8);
    let end = a.life <= 0 || p.y < 0.05;
    if (!end && Math.hypot(p.x - player.pos.x, p.z - player.pos.z) < 0.6 && Math.abs(p.y - (player.eye - 0.5)) < 1) { hurtPlayer(a.dmg); end = true; }
    if (!end) for (const b of barricades) if (p.x > b.x0 && p.x < b.x1 && p.z > b.z0 && p.z < b.z1 && p.y < b.h + 0.2) { b.hp -= a.dmg; b.shake = 0.2; if (b.hp <= 0) destroyBarricade(b); end = true; break; }
    if (!end) for (const s of solids) if (!s.off && inBox(p, s)) { end = true; break; }
    if (end) { for (let k = 0; k < 10; k++) PG.emit(p.x, Math.max(0.1, p.y), p.z, rand(-2, 2), rand(0.5, 3), rand(-2, 2), rand(0.3, 0.6), c[0], c[1], c[2], rand(0.06, 0.12), 8, 0, 0, 1); scene.remove(a.mesh); acids.splice(i, 1); }
  }
}
function clearAcids() { for (const a of acids) scene.remove(a.mesh); acids.length = 0; }

// ---------- Angriff ----------
function curWeapon() { return W_BY[SV.cur] || W_BY.holz; }
function doFire(w, lv) {
  const dmg = w.dmg * DMG_L[lv - 1] * ampMult();
  tracerCol = lv > 1 ? LV_HEX[lv - 1] : 0xffd27a;
  camera.getWorldDirection(_d);
  const o = camera.position;
  const sp4 = lv === 4;
  if (w.kind === 'melee') {
    vmSwing = 1; AU.play('swing', 0.05);
    const all = sp4 && w.id === 'holz';
    const fx = _d.x, fz = _d.z, fl = Math.hypot(fx, fz) || 1; let hits = 0;
    for (const m of monsters.slice()) {
      if (m.state === 'dead') continue;
      const dx = m.g.position.x - o.x, dz = m.g.position.z - o.z, dist = Math.hypot(dx, dz);
      if (dist - m.r > w.range) continue;
      if (!all && (dx * fx + dz * fz) / (dist * fl || 1) < w.arc && dist > m.r + 0.3) continue;
      _c.set(m.g.position.x - dx / dist * m.r * 0.6, Math.min(player.eye - 0.3, m.g.position.y + m.sc * 1.1), m.g.position.z - dz / dist * m.r * 0.6);
      damageMonster(m, dmg, _c, false, w.kb); hits++;
    }
    if (hits) { AU.play('thud', 0.05); shake = Math.max(shake, 0.06); }
    if (all) fxRing(player.pos.x, player.pos.z, LV_HEX[3], 2.6);
    if (sp4 && w.id === 'eisen') spawnWave(dmg * 0.7);
    if (sp4 && w.id === 'axt' && ++axtCount % 3 === 0) groundSlam(dmg);
  } else if (w.kind === 'hitscan') {
    const base = aimAssist(_d, w.range), n = w.pellets * (sp4 && w.id === 'pistole' ? 2 : 1), spr = w.spread * (n > w.pellets ? 2 : 1);
    const opt = { burn: sp4 && w.id === 'schrot', pierce: sp4 && w.id === 'gewehr' ? 3 : 1 };
    for (let i = 0; i < n; i++) {
      const d = base.clone(); d.x += rand(-1, 1) * spr; d.y += rand(-1, 1) * spr; d.z += rand(-1, 1) * spr; d.normalize();
      hitscan(o, d, dmg, w.range, w.kb / w.pellets, opt);
    }
    vmKick = w.id === 'schrot' ? 1.4 : 0.8; flashMuzzle(w.id === 'schrot' ? 1.4 : 1);
    AU.play(w.id === 'schrot' ? 'shotgun' : w.id === 'gewehr' ? 'rifle' : 'pistol', 0.03);
  } else if (w.kind === 'proj' || w.kind === 'rocket') {
    const d = aimAssist(_d, 60);
    if (w.grav) d.y += w.grav * 0.006;
    d.normalize();
    const opt = sp4 ? { fire: w.id === 'bogen', boom: w.id === 'armbrust', homing: w.id === 'rakete' } : null;
    spawnProj(w, dmg, d, opt);
    if (sp4 && w.id === 'schleuder') for (const a of [-0.08, 0.08]) { const c = Math.cos(a), s = Math.sin(a); spawnProj(w, dmg, new T.Vector3(d.x * c - d.z * s, d.y, d.x * s + d.z * c)); }
    vmKick = w.kind === 'rocket' ? 1.6 : 0.6;
    if (w.kind === 'rocket') { flashMuzzle(1.5); AU.play('rocket'); } else AU.play(w.id === 'schleuder' ? 'sling' : 'bow', 0.05);
  } else if (w.kind === 'flame') {
    const tick = dmg / w.rate, range = w.range * (sp4 ? 1.4 : 1); muzzleWorld(_m);
    for (let i = 0; i < 4; i++) { const s = rand(7, 12); PF.emit(_m.x, _m.y, _m.z, _d.x * s + rand(-1, 1), _d.y * s + rand(-0.6, 1), _d.z * s + rand(-1, 1), rand(0.4, 0.6), 1, rand(0.35, 0.65), 0.12, rand(0.15, 0.3), -1, 3, 1.4, 1); }
    for (const m of monsters.slice()) {
      if (m.state === 'dead') continue;
      _c.set(m.g.position.x - o.x, m.g.position.y + m.sc - o.y, m.g.position.z - o.z);
      const L = _c.length(); if (L - m.r > range) continue;
      if (_c.divideScalar(L).dot(_d) < w.cone && L > m.r + 0.5) continue;
      damageMonster(m, tick, null, false, 0, 'fire'); applyBurn(m, dmg * 0.25, 2.5);
      if (Math.random() < 0.15) bloodBurst(m.g.position.x, m.g.position.y + m.sc, m.g.position.z, 2);
    }
    if ((brandOn() || sp4) && patchCd <= 0 && _d.y < 0) { const t = Math.min(range, -o.y / _d.y); addPatch(o.x + _d.x * t, o.z + _d.z * t, 1.3, 3); patchCd = 0.35; }
    muzzleLight.intensity = 1.6; muzzleT = 0.06;
  }
}
function hitscan(o, d, dmg, range, kb, opt) {
  opt = opt || {};
  // Wand oder Boden begrenzen den Schuss
  let wall = range, what = 0;
  for (const s of solids) { if (s.off) continue; const t = rayBox(o, d, s); if (t >= 0 && t < wall) { wall = t; what = 2; } }
  if (d.y < 0) { const t = -o.y / d.y; if (t < wall) { wall = t; what = 2; } }
  // alle getroffenen Monster davor, nach Entfernung sortiert
  const hits = [];
  for (const m of monsters) {
    if (m.state === 'dead') continue;
    const gp = m.g.position, along = (gp.x - o.x) * d.x + (gp.z - o.z) * d.z; if (along < -3 || along > wall + 3) continue;
    let bt = wall, hd = false;
    for (const h of m.hits) { _c.set(gp.x, gp.y + h[0] * m.sc, gp.z); const t = raySphere(o, d, _c, h[1] * m.sc); if (t >= 0 && t < bt) { bt = t; hd = !!h[2]; } }
    if (bt < wall) hits.push({ m, t: bt, head: hd });
  }
  hits.sort((a, b) => a.t - b.t);
  const n = Math.min(hits.length, opt.pierce || 1);
  let end = wall;
  for (let i = 0; i < n; i++) {
    const h = hits[i], hp = o.clone().addScaledVector(d, h.t);
    damageMonster(h.m, dmg * (h.head ? 1.6 : 1), hp, h.head, kb);
    if (opt.burn) applyBurn(h.m, dmg * 0.5, 3);
    end = h.t;
  }
  const hp = o.clone().addScaledVector(d, end);
  if (!n && what === 2) { sparks(hp.x, hp.y + 0.02, hp.z, 3, 1, 0.8, 0.5); if (brandOn() && patchCd <= 0) { addPatch(hp.x, hp.z, 1.2, 3); patchCd = 0.25; } }
  tracer(muzzleWorld(_m), hp, tracerCol);
}
function updateWeapon(dt, firing) {
  fireCd -= dt; patchCd -= dt;
  if (muzzleT > 0) { muzzleT -= dt; if (muzzleT <= 0) muzzleLight.intensity = 0; }
  if (boomLight.intensity > 0) boomLight.intensity = Math.max(0, boomLight.intensity - dt * 18);
  const w = curWeapon(), lv = SV.weapons[w.id] || 1;
  const fl = firing && w.kind === 'flame' && swapT <= 0;
  if (fl !== flameOn) { flameOn = fl; AU.flame(fl); }
  if (firing && fireCd <= 0 && swapT <= 0) { fireCd = 1 / (w.kind === 'flame' ? w.rate : w.rate * RATE_L[lv - 1]); doFire(w, lv); }
}

// ---------- Fähigkeiten ----------
function useAbility(i) {
  if (GS !== 'play' || player.dead) return;
  const lv = abLv(i); if (!lv) return;
  const A = ABILITIES[i];
  if (abCd[i] > 0) { AU.play('deny', 0.2); return; }
  if (i === 0) { if (!placeBarricade(lv)) { showMsg('Hier ist kein Platz'); AU.play('deny'); return; } }
  else if (i === 1) { abOn[1] = A.dur[lv - 1]; showMsg('Doppelter Schaden!'); AU.play('amp'); fxRing(player.pos.x, player.pos.z, 0xffc040, 4); }
  else if (i === 2) { abOn[2] = A.dur[lv - 1]; showMsg('Verbrenner aktiv'); AU.play('ignite'); fxRing(player.pos.x, player.pos.z, 0xff5a20, 4); fireBurst(player.pos.x, 0.2, player.pos.z, 24, 1.2); }
  else if (i === 3) { const h = A.heal[lv - 1]; player.hp = Math.min(player.maxHp, player.hp + h); healFx(); AU.play('heal'); showMsg(`+${h} Leben`); fxRing(player.pos.x, player.pos.z, 0x5ad18a, 3); }
  abCd[i] = A.cd[lv - 1];
}
function updateAbilities(dt) { for (let i = 0; i < 4; i++) { if (abCd[i] > 0) abCd[i] = Math.max(0, abCd[i] - dt); if (abOn[i] > 0) abOn[i] = Math.max(0, abOn[i] - dt); } }

// Waffen in der Hand: siehe viewmodels.js

// ---------- Granaten ----------
function throwGrenade() {
  if (GS !== 'play' || player.dead || grenCd > 0) return;
  if (!SV.gren) { showMsg('Keine Granaten mehr. Mara verkauft welche.'); AU.play('deny', 0.3); return; }
  SV.gren--; grenCd = 0.7;
  camera.getWorldDirection(_d);
  const vel = _d.clone(); vel.y += 0.3; vel.normalize().multiplyScalar(15);
  const mesh = new T.Group();
  part(mesh, G.sph, mat(0x3a4a2a, { e: 0x101808, sh: 40 }), 0, 0, 0, 0.2, 0.24, 0.2);
  const led = part(mesh, G.sphLo, mat(0xff2020, { basic: true, fog: false }), 0, 0.12, 0, 0.06, 0.06, 0.06);
  mesh.position.copy(camera.position).addScaledVector(_d, 0.5); mesh.position.y -= 0.2;
  scene.add(mesh);
  grenades.push({ mesh, led, vel, t: 1.8, dmg: GREN_DMG * HPM[curArea()] * ampMult() });
  vmKick = 0.5; AU.play('throw');
}
function updateGrenades(dt) {
  grenCd = Math.max(0, grenCd - dt);
  for (let i = grenades.length - 1; i >= 0; i--) {
    const g = grenades[i], p = g.mesh.position, ox = p.x, oz = p.z;
    g.t -= dt; g.vel.y -= 14 * dt;
    p.addScaledVector(g.vel, dt);
    if (p.y < 0.12) { p.y = 0.12; if (g.vel.y < 0) { if (g.vel.y < -2) AU.play('tick', 0.08); g.vel.y *= -0.35; g.vel.x *= 0.6; g.vel.z *= 0.6; } }
    for (const s of solids) if (!s.off && inBox(p, s)) { p.x = ox; p.z = oz; g.vel.x *= -0.4; g.vel.z *= -0.4; break; }
    for (const m of monsters) if (m.state !== 'dead' && Math.hypot(m.g.position.x - p.x, m.g.position.z - p.z) < m.r + 0.3 && p.y < (BAR_TOP[m.type] || 2) * m.sc) { g.t = Math.min(g.t, 0.05); break; }
    g.mesh.rotation.x += dt * 8; g.led.visible = Math.sin(g.t * (g.t < 0.6 ? 40 : 14)) > 0;
    if (g.t <= 0) { explode(p.clone(), g.dmg, GREN_R, brandOn()); scene.remove(g.mesh); grenades.splice(i, 1); }
  }
}
function clearGrenades() { for (const g of grenades) scene.remove(g.mesh); grenades.length = 0; }
