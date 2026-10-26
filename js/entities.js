// Portalnacht – Monster, Wellen, Endboss
'use strict';
const player = { pos: null, yaw: 0, pitch: 0, hp: 100, maxHp: 100, r: 0.42, eye: 1.62, bob: 0, moveAmt: 0, hurt: 0, dead: false, sinceHit: 99, inv: 0, dashT: 0, dashCd: 0, dvx: 0, dvz: 0, fovKick: 0 };
if (HAS_THREE) player.pos = new T.Vector3(SAFE[0].x - 1.5, 0, SAFE[0].z);
const monsters = [];
const areaSt = [];
let shake = 0, bossRef = null, barRef = null, winT = -1;
const _v = HAS_THREE ? new T.Vector3() : null;

function curArea() { return clamp(Math.floor(-player.pos.z / AREA_LEN), 0, 5); }
function safeIdx() { for (let i = 0; i < SAFE.length; i++) { const s = SAFE[i]; if (Math.hypot(player.pos.x - s.x, player.pos.z - s.z) < s.r) return i; } return -1; }
function angLerp(a, b, t) { const d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI; return a + d * Math.min(1, t); }

// ---------- Kollision ----------
function pushOut(p, r, s) {
  if (p.x + r < s.x0 || p.x - r > s.x1 || p.z + r < s.z0 || p.z - r > s.z1) return false;
  const cx = clamp(p.x, s.x0, s.x1), cz = clamp(p.z, s.z0, s.z1);
  const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
  if (d2 >= r * r) return false;
  if (d2 < 1e-8) {
    const l = p.x - s.x0, rt = s.x1 - p.x, t = p.z - s.z0, b = s.z1 - p.z, m = Math.min(l, rt, t, b);
    if (m === l) p.x = s.x0 - r; else if (m === rt) p.x = s.x1 + r; else if (m === t) p.z = s.z0 - r; else p.z = s.z1 + r;
    return true;
  }
  const d = Math.sqrt(d2); p.x = cx + dx / d * r; p.z = cz + dz / d * r; return true;
}
function resolveCircle(p, r, isMonster) {
  p.x = clamp(p.x, -HALF_W + r, HALF_W - r); p.z = clamp(p.z, Z_MIN + r, Z_MAX - r);
  for (const s of solids) if (!s.off) pushOut(p, r, s);
  let hitB = null;
  for (const b of barricades) if (pushOut(p, r, b)) hitB = b;
  if (isMonster && safeIdx() >= 0) {
    for (const s of SAFE) { const dx = p.x - s.x, dz = p.z - s.z, d = Math.hypot(dx, dz), lim = s.r + 1.2 + r; if (d < lim) { const k = d < 1e-4 ? 1 : d; p.x = s.x + dx / k * lim; p.z = s.z + dz / k * lim; } }
  }
  return hitB;
}
function blockedAt(x, z, r) {
  if (Math.abs(x) > HALF_W - r) return true;
  for (const s of solids) if (!s.off && x + r > s.x0 && x - r < s.x1 && z + r > s.z0 && z - r < s.z1) return true;
  return false;
}

// ---------- Monster-Modelle ----------
function part(parent, geo, m, x, y, z, sx, sy, sz) { const o = new T.Mesh(geo, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); parent.add(o); return o; }
function pivot(parent, x, y, z) { const p = new T.Group(); p.position.set(x, y, z); parent.add(p); return p; }
// buildMonster steht in models.js

function spawnMonster(type, x, z, opt) {
  opt = opt || {};
  const a = opt.area == null ? curArea() : opt.area, def = MT[type], elite = !!opt.elite, boss = type === 'koenigin';
  const { g, P, skin } = buildMonster(type);
  const mini = opt.mini != null ? MINIS[opt.mini] : null;
  if (mini) skin.color.setHex(mini.skin);
  const sc = mini ? mini.scale : boss ? 1.25 : elite ? 1.4 : 1;
  g.scale.setScalar(sc); g.position.set(x, -2.6 * sc, z); scene.add(g);
  if (elite) { const ring = new T.Mesh(G.ring, mat(0xff2030, { basic: true, add: true, op: 0.7 })); ring.scale.setScalar(2.2); ring.position.y = 0.05; g.add(ring); P.aura = ring; skin.emissive.setHex(0x220000); }
  const m = {
    type, def, g, P, skin, boss, elite, sc, a,
    hp: def.hp * HPM[a] * (mini ? mini.hp : elite ? 6 : 1) * diff().hp * (opt.mult ? opt.mult.hp : 1), dmg: def.dmg * DMGM[a] * (mini ? 1.3 : elite ? 1.4 : 1) * diff().dmg * (opt.mult ? opt.mult.dmg : 1),
    spd: def.spd * (1 + a * 0.04) * (mini ? 0.8 : elite ? 0.92 : 1), r: def.r * sc, range: def.ranged ? def.range : def.range * Math.sqrt(sc),
    cd: rand(0.3, 1), state: 'rise', t: 0, phase: rand(0, TAU), burn: 0, burnDps: 0, flash: 0, wind: 0, windMax: 0.4, strike: 0,
    gold: Math.round(def.gold * GOLDM[a] * (mini ? 10 : elite ? 6 : 1) * GOLD * diff().gold), stuck: 0, detour: 0, dx: 0, dz: 0, side: Math.random() < 0.5 ? -1 : 1,
    wa: opt.wa == null ? -1 : opt.wa, wj: opt.wj == null ? -1 : opt.wj, hits: HIT[type], blocked: null, target: null,
    atkT: 2, sumT: 8, atk: '', deadT: 0, kvx: 0, kvz: 0, vy: 0, flinch: 0, spin: 0, numAcc: 0, numHead: false, numT: 0,
  };
  m.maxHp = m.hp;
  if (mini) { m.mini = { def: mini, t: mini.every * 0.6, charging: 0, dx: 0, dz: 0 }; barRef = m; fightClean = true; $('bossName').textContent = mini.name; $('bossbar').hidden = false; }
  if (!boss && !mini) {
    const w = clamp(m.r * 1.8, 0.8, 1.7), bg = new T.Sprite(BAR_BG), fm = new T.SpriteMaterial({ color: 0x52d273, fog: true, depthWrite: false }), fill = new T.Sprite(fm);
    bg.scale.set(w + 0.08, 0.15, 1); fill.center.set(0, 0.5); fill.scale.set(w, 0.1, 1); fill.renderOrder = 2; bg.renderOrder = 1;
    scene.add(bg, fill); m.bar = { bg, fill, fm, w, top: BAR_TOP[type] * sc + 0.3, c: 0x52d273 };
  }
  if (boss) { m.state = 'rise'; bossRef = m; barRef = m; fightClean = true; }
  monsters.push(m);
  if (Math.random() < 0.3 || elite || boss) AU.play(boss ? 'roar' : 'growl', 0.3);
  return m;
}
function removeMonster(i) { const m = monsters[i]; scene.remove(m.g); m.skin.dispose(); if (m.bar) { scene.remove(m.bar.bg, m.bar.fill); m.bar.fm.dispose(); } monsters.splice(i, 1); }
function clearMonsters() { while (monsters.length) removeMonster(monsters.length - 1); bossRef = null; barRef = null; }
function aliveCount() { let n = 0; for (const m of monsters) if (m.state !== 'dead') n++; return n; }

function animMonster(m, dt, moving) {
  m.phase += dt * (3 + m.spd * 1.5) * Math.max(0.15, moving);
  const P = m.P, s = Math.sin(m.phase);
  if (P.legs) { P.legs[0].rotation.x = s * 0.7 * moving; P.legs[1].rotation.x = -s * 0.7 * moving; }
  if (P.legs6) P.legs6.forEach((p, k) => { p.rotation.y = Math.sin(m.phase * 1.6 + k * 1.7) * 0.45 * moving; });
  if (P.arms) {
    let lift = 0;
    if (m.wind > 0) lift = (1 - m.wind / m.windMax) * 1.5; else if (m.strike > 0) lift = -0.5 * (m.strike / 0.25);
    P.arms.forEach((p, k) => { p.rotation.x = P.armBase - lift + Math.sin(m.phase * 0.5 + k * 2) * 0.18; });
  }
  if (P.body) { const k = 1 + (m.wind > 0 ? (1 - m.wind / m.windMax) * 0.18 : 0); P.body.scale.set(P.bodyS.x * k, P.bodyS.y * k, P.bodyS.z * k); }
  if (P.core) { const k = 0.8 + Math.sin(m.t * 6) * 0.2; P.core.scale.set(0.45 * k, 0.45 * k, 0.3 * k); }
  if (P.aura) P.aura.rotation.y += dt * 2;
  if (P.jaw) P.jaw.rotation.x = m.wind > 0 ? (1 - m.wind / m.windMax) * 0.55 : 0.12 + Math.sin(m.t * 3) * 0.06;
  if (P.sacks) P.sacks.forEach((sk, k) => { const s = 1 + Math.sin(m.t * 4 + k * 1.3) * 0.12; sk.scale.setScalar(sk.userData.s0 * s); });
}

function applyBurn(m, dps, dur) { if (m.state === 'dead') return; if (m.burn <= 0) achAdd('burned'); m.burn = Math.max(m.burn, dur); m.burnDps = Math.max(m.burnDps, dps); }

// Rückstoß: wie stark ein Treffer das Monster zurückwirft (Bosse fast gar nicht)
function heft(m) { return m.boss ? 0.06 : m.mini ? 0.2 : m.type === 'koloss' ? 0.45 : 1; }
function knockMonster(m, kb, amount) {
  const gp = m.g.position, dx = gp.x - player.pos.x, dz = gp.z - player.pos.z, d = Math.hypot(dx, dz) || 1, h = heft(m);
  m.kvx += dx / d * kb * h; m.kvz += dz / d * kb * h;
  m.flinch = Math.min(1, m.flinch + (0.35 + kb * 0.1) * h);
  // ein harter Treffer unterbricht den Angriff
  if (h === 1 && amount > m.maxHp * 0.2 && m.wind > 0) { m.wind = 0; m.cd = 0.5; }
}
function launchMonster(m, fx, fz, power) {
  const gp = m.g.position, dx = gp.x - fx, dz = gp.z - fz, d = Math.hypot(dx, dz) || 1, h = heft(m);
  m.kvx += dx / d * power * h; m.kvz += dz / d * power * h;
  m.vy = Math.max(m.vy, power * 0.6 * h); m.flinch = 1; m.spin = rand(-7, 7) * h;
  if (h === 1) { m.wind = 0; m.cd = 0.6; }
}
function damageMonster(m, amount, at, head, kb) {
  if (m.state === 'dead') return false;
  m.hp -= amount; m.flash = 0.1; m.numAcc += amount; if (head) m.numHead = true;
  showHitmark(head); if (head) achAdd('heads');
  if (kb) knockMonster(m, kb, amount);
  if (at) bloodBurst(at.x, at.y, at.z, Math.min(18, 4 + (amount / 10) | 0), m.boss ? 1.4 : 1);
  if (brandOn()) applyBurn(m, amount * burnFrac(), burnDur());
  if (m.hp <= 0) { killMonster(m); return true; }
  if (Math.random() < 0.3) AU.play('hitm', 0.06);
  return false;
}
function killMonster(m) {
  m.state = 'dead'; m.deadT = 0; m.burn = 0; m.wind = 0;
  m.skin.emissive.setHex(0);
  m.P.eyes.forEach(e => { e.visible = false; }); if (m.P.aura) m.P.aura.visible = false;
  if (m.gold) { SV.money += m.gold; popGold(m.gold); AU.play('coin', 0.05); }
  SV.kills++; achAdd('kills'); if (SV.cur === 'holz') achAdd('killHolz');
  const p = m.g.position;
  bloodBurst(p.x, p.y + 0.9 * m.sc, p.z, m.boss ? 80 : 26, m.boss ? 2.4 : 1.3);
  addDecal(p.x, p.z, rand(1.2, 2.2) * m.sc * (m.boss ? 2 : 1), 0x3a0406);
  AU.play('die', 0.05);
  if (!m.boss && Math.random() < 0.09) spawnPickup(p.x, p.z);
  else if (!m.boss && Math.random() < 0.06) spawnPickup(p.x, p.z, 'gren');
  if (m.boss) bossDefeated(m);
  else if (m.mini) {
    barRef = null; $('bossbar').hidden = true;
    spawnPickup(p.x + 1, p.z, 'gren'); spawnPickup(p.x - 1, p.z);
    showMsg(`${m.mini.def.name} ist besiegt!`); AU.play('clear'); achMiniDown(m);
  }
}

function hurtPlayer(d) {
  if (GS !== 'play' || player.dead || winT >= 0) return;
  if (safeIdx() >= 0 || player.inv > 0) return;
  player.sinceHit = 0; fightClean = false; player.hp -= d; player.hurt = Math.min(1, player.hurt + 0.35 + d / 60);
  shake = Math.max(shake, 0.12 + d / 120);
  AU.play('hurt', 0.08);
  if (OPT.vib) try { navigator.vibrate && navigator.vibrate(35); } catch (e) { }
  if (player.hp <= 0) { player.hp = 0; die(); }
}

// ---------- Monster-Verhalten ----------
function strikeAt(m, dist) {
  if (m.target) {
    const b = m.target; m.target = null;
    if (barricades.includes(b)) { b.hp -= m.dmg; b.shake = 0.2; sparks(b.x, 0.8, b.z, 6, 0.7, 0.5, 0.3); if (b.hp <= 0) destroyBarricade(b); }
  } else if (dist < m.range + 0.6) {
    hurtPlayer(m.dmg);
    if (m.type === 'koloss') shake = Math.max(shake, 0.35);
  }
  m.cd = m.def.cd * rand(0.85, 1.15); m.strike = 0.25;
}
function updateMonsters(dt) {
  const px = player.pos.x, pz = player.pos.z, safe = safeIdx() >= 0;
  for (let i = monsters.length - 1; i >= 0; i--) {
    const m = monsters[i], g = m.g, gp = g.position;
    m.t += dt;
    if (m.flash > 0) { m.flash -= dt; m.skin.emissive.setHex(m.flash > 0 ? 0x701010 : (m.elite ? 0x220000 : 0)); }
    // Schadenszahlen sammeln und gebündelt anzeigen
    if (m.numAcc > 0) { m.numT -= dt; if (m.numT <= 0 || m.state === 'dead') { dmgNumber(gp.x, gp.y + (BAR_TOP[m.type] || 6.5) * m.sc + 0.2, gp.z, m.numAcc, m.numHead); m.numAcc = 0; m.numHead = false; m.numT = 0.18; } }
    if (m.state === 'dead') {
      m.deadT += dt;
      // weggeschleuderte Körper fliegen weiter
      if (m.deadT < 2) {
        gp.x = clamp(gp.x + m.kvx * dt, -HALF_W, HALF_W); gp.z += m.kvz * dt; const f = Math.max(0, 1 - dt * 3); m.kvx *= f; m.kvz *= f;
        if (gp.y > 0 || m.vy > 0) { m.vy -= 22 * dt; gp.y = Math.max(0, gp.y + m.vy * dt); g.rotation.z += m.spin * dt; }
      }
      g.rotation.x = -Math.PI / 2 * Math.min(1, m.deadT / (m.boss ? 1.2 : 0.45));
      if (m.deadT > 2.2) gp.y -= dt * 0.7;
      if (m.deadT > 4.5) removeMonster(i);
      continue;
    }
    if (m.burn > 0) {
      m.burn -= dt; m.hp -= m.burnDps * dt; if (m.burn <= 0) m.burnDps = 0;
      if (Math.random() < dt * 30) fireBurst(gp.x, gp.y + rand(0.3, 1.6) * m.sc, gp.z, 1, m.r * 0.7);
      if (m.hp <= 0) { killMonster(m); continue; }
    }
    let dx = px - gp.x, dz = pz - gp.z; const dist = Math.hypot(dx, dz) || 0.001; const nx = dx / dist, nz = dz / dist;
    if (m.state === 'rise') {
      gp.y = Math.min(0, gp.y + dt * 3.2 * m.sc);
      if (Math.random() < dt * 20) smokePuff(gp.x, 0.1, gp.z, 1, 0.1);
      g.rotation.y = Math.atan2(nx, nz);
      if (gp.y >= 0) m.state = 'chase';
      continue;
    }
    if (m.strike > 0) m.strike -= dt;
    let mvx = 0, mvz = 0, sp = m.spd;
    if (m.boss) { const r = updateBoss(m, dt, dist, nx, nz); mvx = r[0]; mvz = r[1]; sp = r[2]; }
    else if (m.mini) { const r = updateMini(m, dt, dist, nx, nz); mvx = r[0]; mvz = r[1]; sp = r[2]; }
    else if (m.wind > 0) {
      m.wind -= dt;
      if (m.wind <= 0) {
        if (m.def.ranged) { spitAcid(m, 1); m.cd = m.def.cd * rand(0.8, 1.2); }
        else strikeAt(m, dist);
      }
    } else {
      m.cd -= dt;
      const sf = SAFE.find(s => Math.hypot(gp.x - s.x, gp.z - s.z) < s.r + 5);
      if (safe && sf) { mvx = -(sf.x - gp.x); mvz = -(sf.z - gp.z); sp *= 0.25; }
      else if (m.def.ranged) {
        if (dist > 11) { mvx = nx; mvz = nz; }
        else if (dist < 6) { mvx = -nx; mvz = -nz; sp *= 0.7; }
        else { mvx = -nz * m.side; mvz = nx * m.side; sp *= 0.45; if (Math.random() < dt * 0.3) m.side *= -1; }
        if (m.cd <= 0 && dist < 17 && !safe) { m.wind = m.windMax = 0.55; AU.play('spit', 0.1); }
      } else {
        if (dist < m.range && m.cd <= 0 && !safe) { m.wind = m.windMax = m.type === 'koloss' ? 0.65 : 0.38; m.target = null; if (Math.random() < 0.4) AU.play('growl', 0.25); }
        else if (m.blocked && m.cd <= 0 && dist > m.range) { m.wind = m.windMax = 0.45; m.target = m.blocked; }
        else if (dist > m.range * 0.75) { mvx = nx; mvz = nz; }
      }
    }
    if (m.detour > 0) { m.detour -= dt; mvx = m.dx; mvz = m.dz; }
    // Abstand zu anderen Monstern
    for (const o of monsters) {
      if (o === m || o.state === 'dead') continue;
      const ox = gp.x - o.g.position.x, oz = gp.z - o.g.position.z, d2 = ox * ox + oz * oz, lim = m.r + o.r;
      if (d2 < lim * lim && d2 > 1e-6) { const d = Math.sqrt(d2), k = (lim - d) / d * 0.5; gp.x += ox * k; gp.z += oz * k; }
    }
    const len = Math.hypot(mvx, mvz);
    const moving = len > 0.01 ? 1 : 0;
    const ox = gp.x, oz = gp.z;
    sp *= 1 - m.flinch * 0.85; // getroffen: kurz taumeln
    if (moving) { gp.x += mvx / len * sp * dt; gp.z += mvz / len * sp * dt; }
    if (m.kvx || m.kvz) { gp.x += m.kvx * dt; gp.z += m.kvz * dt; const f = Math.max(0, 1 - dt * 7); m.kvx *= f; m.kvz *= f; if (Math.abs(m.kvx) + Math.abs(m.kvz) < 0.05) m.kvx = m.kvz = 0; }
    if (gp.y > 0 || m.vy > 0) { m.vy -= 22 * dt; gp.y = Math.max(0, gp.y + m.vy * dt); g.rotation.z += m.spin * dt; if (gp.y === 0) { m.vy = 0; smokePuff(gp.x, 0.1, gp.z, 3, 0.16); } }
    else if (g.rotation.z) g.rotation.z = angLerp(g.rotation.z, 0, dt * 10);
    m.flinch = Math.max(0, m.flinch - dt * 4);
    // nicht in den Spieler hineinlaufen
    { const qx = gp.x - px, qz = gp.z - pz, d = Math.hypot(qx, qz), lim = m.r + player.r; if (d < lim && d > 1e-4) { gp.x = px + qx / d * lim; gp.z = pz + qz / d * lim; } }
    m.blocked = resolveCircle(gp, m.r, true);
    if (m.boss) { gp.z = clamp(gp.z, -776, -712); }
    // festgefahren? kurz seitlich ausweichen
    if (moving && m.detour <= 0) {
      const moved = Math.hypot(gp.x - ox, gp.z - oz);
      if (moved < sp * dt * 0.25 && !m.blocked) { m.stuck += dt; if (m.stuck > 0.8) { m.stuck = 0; m.detour = rand(0.6, 1.2); const s = Math.random() < 0.5 ? -1 : 1; m.dx = -nz * s; m.dz = nx * s; } }
      else m.stuck = 0;
    }
    // zu weit weg: näher heranholen
    if (dist > 60 && !m.boss) { const p = spawnPos(curArea()); gp.x = p[0]; gp.z = p[1]; }
    g.rotation.y = angLerp(g.rotation.y, Math.atan2(nx, nz), dt * 8);
    g.rotation.x = -0.45 * m.flinch;
    animMonster(m, dt, moving);
  }
}

// ---------- Endboss ----------
function updateBoss(m, dt, dist, nx, nz) {
  const enr = m.hp < m.maxHp * 0.5, sp = m.spd * (enr ? 1.35 : 1);
  m.atkT -= dt; m.sumT -= dt;
  if (m.wind > 0) {
    m.wind -= dt;
    if (m.wind <= 0) {
      const gp = m.g.position;
      if (m.atk === 'slam') {
        if (dist < m.range + 1) hurtPlayer(m.dmg * 1.3);
        shake = Math.max(shake, 0.7); AU.play('boom', 0.2);
        for (let i = 0; i < 40; i++) { const a = rand(0, TAU), r = rand(1, m.range); smokePuff(gp.x + Math.cos(a) * r, 0.1, gp.z + Math.sin(a) * r, 1, 0.18); }
        for (const b of barricades.slice()) if (Math.hypot(b.x - gp.x, b.z - gp.z) < m.range + 1) destroyBarricade(b);
      } else {
        const n = enr ? 7 : 5;
        for (let i = 0; i < n; i++) spitAcid(m, 0.45, (i - (n - 1) / 2) * 0.16);
      }
      m.atkT = enr ? 1.5 : 2.3; m.strike = 0.25;
    }
    return [0, 0, 0];
  }
  if (m.atkT <= 0) {
    if (dist < m.range) { m.atk = 'slam'; m.wind = m.windMax = 0.85; AU.play('roar', 0.5); }
    else { m.atk = 'volley'; m.wind = m.windMax = 0.6; AU.play('spit', 0.1); }
  }
  if (m.sumT <= 0 && aliveCount() < 12) {
    m.sumT = enr ? 10 : 14;
    const n = enr ? 4 : 3, gp = m.g.position;
    for (let i = 0; i < n; i++) { const a = rand(0, TAU); spawnMonster(Math.random() < 0.5 ? 'kriecher' : 'schreier', clamp(gp.x + Math.cos(a) * 4, -16, 16), clamp(gp.z + Math.sin(a) * 4 + 3, -774, -712), { area: 5 }); }
    showMsg('Die Königin ruft ihre Brut');
  }
  if (dist > m.range * 0.7) return [nx, nz, sp];
  return [0, 0, 0];
}
function bossDefeated(m) {
  $('bossbar').hidden = true; achBossDown();
  shake = 1; AU.play('boom'); AU.play('roar');
  if (MODE === 'endlos') { barRef = null; showMsg('Die Königin ist gefallen. Das Portal spuckt weiter.'); return; }
  winT = 0;
  for (const o of monsters) if (o !== m && o.state !== 'dead') killMonster(o);
  showMsg('Die Monsterkönigin ist besiegt!');
}

// ---------- Wellen ----------
function triggerZ(a, j) { return ZS(a) - 24 - j * 32; }
function resetAreas(cp) {
  for (let a = 0; a < 6; a++) {
    areaSt[a] = { wave: 0, active: false, queue: [], spawnT: 0, done: a < cp, boss: false };
    if (a < 5) setBarrier(a, a < cp, true);
  }
}
function weightedType(a) {
  const types = AREA_TYPES[a]; let sum = 0; for (const t of types) sum += MT[t].w;
  let r = Math.random() * sum; for (const t of types) { r -= MT[t].w; if (r <= 0) return t; } return types[0];
}
function startWave(a) {
  const st = areaSt[a], j = st.wave; st.active = true; st.spawnT = 0.4;
  if (a === 5 && j === 2) {
    st.boss = true; st.queue = [];
    const b = spawnMonster('koenigin', 0, -770, { area: 5, wa: 5, wj: 2 });
    $('bossName').textContent = MT.koenigin.name; $('bossbar').hidden = false;
    showToast('Endgegner', 'Die Monsterkönigin'); shake = 0.6;
    return;
  }
  const n = 6 + a * 2 + j * 2, q = [];
  for (let i = 0; i < n; i++) q.push({ t: weightedType(a), elite: false });
  if (j === 1) q.push({ t: a < 2 ? 'ghul' : 'koloss', elite: true });
  for (let i = q.length - 1; i > 0; i--) { const k = (Math.random() * (i + 1)) | 0;[q[i], q[k]] = [q[k], q[i]]; }
  if (j === 2 && a < 5) q.push({ t: MINIS[a].type, mini: a }); // Zwischenboss kommt zum Schluss
  st.queue = q;
  AU.play('wave', 0.5);
  showMsg(`Welle ${j + 1} – sie kommen!`);
}
function spawnPos(a) {
  const zTop = ZS(a) - 14, zBot = a === 5 ? -770 : ZS(a) - 114;
  for (let t = 0; t < 14; t++) {
    const ang = Math.random() < 0.72 ? rand(-1.1, 1.1) : rand(0, TAU), d = rand(14, 24);
    const x = clamp(player.pos.x + Math.sin(ang) * d, -16, 16), z = clamp(player.pos.z - Math.cos(ang) * d, zBot, zTop);
    if (Math.hypot(x - player.pos.x, z - player.pos.z) < 9) continue;
    if (!blockedAt(x, z, 1) && !inSafe(x, z, 3)) return [x, z];
  }
  return [rand(-12, 12), clamp(player.pos.z - 20, zBot, zTop)];
}
function waveRemaining(a, j) { let n = areaSt[a].queue.length; for (const m of monsters) if (m.state !== 'dead' && m.wa === a && m.wj === j) n++; return n; }
function updateWaves(dt) {
  const pa = curArea();
  for (let a = 0; a < 6; a++) {
    const st = areaSt[a]; if (st.done) continue;
    if (!st.active) { if (a === pa && player.pos.z < triggerZ(a, st.wave) && safeIdx() < 0) startWave(a); continue; }
    if (st.boss) continue;
    if (st.queue.length) {
      st.spawnT -= dt;
      if (st.spawnT <= 0 && aliveCount() < 10 + a * 1.5) {
        const q = st.queue.shift(), p = spawnPos(a);
        spawnMonster(q.t, p[0], p[1], { area: a, elite: q.elite, mini: q.mini, wa: a, wj: st.wave });
        st.spawnT = rand(0.45, 0.8);
      }
    } else if (waveRemaining(a, st.wave) === 0) {
      st.active = false; st.wave++;
      if (st.wave >= 3 && a < 5) { st.done = true; setBarrier(a, true); AU.play('clear'); showMsg('Der Weg ist frei'); }
      else { AU.play('clear', 0.3); showMsg('Welle geschafft'); }
    }
  }
}

// ---------- Lebensleisten über den Monstern ----------
const BAR_BG = HAS_THREE ? new T.SpriteMaterial({ color: 0x000000, transparent: true, opacity: 0.65, fog: true, depthWrite: false }) : null;
function updateBars() {
  _v.setFromMatrixColumn(camera.matrixWorld, 0);
  for (const m of monsters) {
    const b = m.bar; if (!b) continue;
    const show = m.state !== 'dead'; b.bg.visible = b.fill.visible = show; if (!show) continue;
    const gp = m.g.position, y = gp.y + b.top, f = clamp(m.hp / m.maxHp, 0, 1);
    b.bg.position.set(gp.x, y, gp.z);
    b.fill.scale.x = Math.max(0.001, b.w * f);
    b.fill.position.set(gp.x - _v.x * b.w / 2, y - _v.y * b.w / 2, gp.z - _v.z * b.w / 2);
    const c = f > 0.5 ? 0x52d273 : f > 0.25 ? 0xf0c040 : 0xff3b3b;
    if (b.c !== c) { b.c = c; b.fm.color.setHex(c); }
  }
}

// ---------- Zwischenbosse ----------
function knockPlayer(dx, dz, f) { player.pos.x += dx * f; player.pos.z += dz * f; resolveCircle(player.pos, player.r, false); }
function updateMini(m, dt, dist, nx, nz) {
  const k = m.mini, d = k.def, gp = m.g.position;
  k.t -= dt;
  if (k.charging > 0) {
    k.charging -= dt;
    if (Math.random() < dt * 30) smokePuff(gp.x, 0.1, gp.z, 1, 0.15);
    if (dist < m.r + player.r + 0.5) { hurtPlayer(m.dmg * 1.5); knockPlayer(k.dx, k.dz, 2.2); shake = Math.max(shake, 0.5); k.charging = 0; }
    return [k.dx, k.dz, m.spd * 3.4];
  }
  if (m.wind > 0) {
    m.wind -= dt;
    if (m.wind <= 0) {
      if (m.atk === 'charge') { k.charging = 1.1; k.dx = nx; k.dz = nz; AU.play('dash'); }
      else if (m.atk === 'slam') {
        if (dist < 5) { hurtPlayer(m.dmg * 1.3); knockPlayer(nx, nz, 1.5); }
        shake = Math.max(shake, 0.6); AU.play('boom', 0.2);
        for (let i = 0; i < 30; i++) { const a = rand(0, TAU), r = rand(1, 5); smokePuff(gp.x + Math.cos(a) * r, 0.1, gp.z + Math.sin(a) * r, 1, 0.18); }
      }
      else if (m.atk === 'volley') { for (let i = 0; i < 5; i++) spitAcid(m, 0.8, (i - 2) * 0.17); }
      else if (m.atk === 'brood') {
        for (let i = 0; i < 3; i++) { const a = rand(0, TAU); spawnMonster('kriecher', clamp(gp.x + Math.cos(a) * 2.5, -16, 16), gp.z + Math.sin(a) * 2.5, { area: m.a }); }
        showMsg('Die Spinnenmutter ruft ihre Brut');
      }
      else strikeAt(m, dist);
      m.cd = m.def.cd; m.strike = 0.25;
    }
    return [0, 0, 0];
  }
  m.cd -= dt;
  const ab = d.abil, start = (atk, w, snd) => { m.atk = atk; m.wind = m.windMax = w; k.t = d.every; AU.play(snd, 0.4); return [0, 0, 0]; };
  if (k.t <= 0 && safeIdx() < 0) {
    if (ab === 'charge' && dist > 4 && dist < 20) return start('charge', 0.8, 'roar');
    if (ab === 'slam' && dist < 5.5) return start('slam', 0.8, 'roar');
    if (ab === 'brood' && aliveCount() < 14) return start('brood', 0.6, 'growl');
    if (ab === 'volley' && dist < 18) return start('volley', 0.6, 'spit');
  }
  if (ab === 'volley') {
    if (dist > 11) return [nx, nz, m.spd];
    if (dist < 6) return [-nx, -nz, m.spd * 0.7];
    return [-nz * m.side, nx * m.side, m.spd * 0.45];
  }
  if (dist < m.range && m.cd <= 0 && safeIdx() < 0) { m.atk = 'melee'; m.wind = m.windMax = 0.5; return [0, 0, 0]; }
  if (dist > m.range * 0.75) return [nx, nz, m.spd];
  return [0, 0, 0];
}

// ---------- Leuchtende Augen (alle Monster in einem Draw-Call) ----------
let PE = null, peN = 0;
const _ec = HAS_THREE ? new T.Color() : null;
function updateEyeGlow() {
  if (!PE) PE = new PSys(220, true, true);
  let i = 0; const p = PE.p, c = PE.c, s = PE.s;
  for (const m of monsters) {
    if (m.state === 'dead') continue;
    _ec.setHex(m.P.eyeColor || 0xffffff);
    for (const e of m.P.eyes) {
      if (i >= PE.n) break;
      e.getWorldPosition(_v);
      p[i * 3] = _v.x; p[i * 3 + 1] = _v.y; p[i * 3 + 2] = _v.z;
      c[i * 4] = _ec.r; c[i * 4 + 1] = _ec.g; c[i * 4 + 2] = _ec.b; c[i * 4 + 3] = 0.55;
      s[i] = 0.32 * m.sc * (m.boss ? 1.4 : 1); i++;
    }
  }
  for (let k = i; k < peN; k++) s[k] = 0;
  peN = i; PE.pa.needsUpdate = true; PE.ca.needsUpdate = true; PE.sa.needsUpdate = true;
}
