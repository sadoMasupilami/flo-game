// Portalnacht – Leute in der Welt: Opas Hund Bruno und Überlebende, die man zu einem Unterschlupf bringt
'use strict';
// Überlebende: [Gebiet, x, dz] wie bei den Truhen; gift = was sie zum Dank geben
const SURVIVORS = [
  { a: 0, x: -13, dz: -108, name: 'Bauer Kurt', coat: 0x4a5a3a, hair: 0x9a9a92, hat: 0x5a4a30, gift: 'gren',
    hi: 'Endlich jemand! Ich hab mich hinter dem Traktor versteckt. Bringst du mich zu einem Unterschlupf?',
    thx: 'Danke! Deine Oma hat mir früher immer Kuchen gebracht. Hier, nimm meine Granaten, ich brauch sie nicht mehr.' },
  { a: 1, x: 26, dz: -50, name: 'Förster Jansen', coat: 0x3a4a2a, hair: 0x5a3a20, hat: 0x2a3a1a, gift: 'gold',
    hi: 'Psst! Die Viecher haben meine Hütte umstellt. Ich komme mit dir.',
    thx: 'Deine Großeltern sind durch meinen Wald gekommen. Opa hat gehumpelt, aber gelacht. Sie wollten in die Stadt.' },
  { a: 2, x: -22, dz: -98, name: 'Pfarrer Brandt', coat: 0x1a1a1e, hair: 0xd8d8d0, gift: 'gren',
    hi: 'Der Herr schickt mir Hilfe! Und einen Hund. Lass uns gehen.',
    thx: 'Als die Glocke geläutet hat, saß dein Opa bei mir im Turm. Er hat die ganze Zeit Witze erzählt.' },
  { a: 3, x: 15, dz: -100, name: 'Lkw-Fahrerin Bea', coat: 0x8a5a1a, hair: 0x2a1a10, hat: 0x2a4a8a, gift: 'gold',
    hi: 'Mein Laster springt nicht mehr an. Nimmst du mich mit?',
    thx: 'Ich hab zwei alte Leute in einem gelben Bus Richtung Stadt fahren sehen. Er trug keine Mütze, aber er hat gewunken.' },
  { a: 4, x: 13, dz: -96, name: 'Frau Petersen', coat: 0x7a3a5a, hair: 0xc8c0b8, gift: 'gren',
    hi: 'Du bist doch Hildes Enkel! Sie hat bei mir geklingelt und nach dir gefragt.',
    thx: 'Deine Oma hat gesagt: Wenn mein Enkel kommt, sag ihm, wir warten unten in der U-Bahn.' },
  { a: 5, x: 12, dz: -45, name: 'Busfahrer Ali', coat: 0x2a3a5a, hair: 0x1a1410, hat: 0x2a3a5a, gift: 'gold',
    hi: 'Mein Bus brennt, und die Königin schreit die ganze Nacht. Ich gehe überall hin, nur weg hier!',
    thx: 'Ich hab deine Großeltern zur U-Bahn gefahren. Sie sind in Sicherheit. Jetzt fehlt nur noch die Königin.' },
];
const survivors = [];
let dog = null;

// ---------- Figuren ----------
function buildPerson(o) {
  const g = new T.Group(); scene.add(g);
  const coat = mat(o.coat, { sh: 14 }), pants = mat(0x2a2c32), boots = mat(0x1a1410), skin = mat(0xd9a988, { sh: 15 }), hair = mat(o.hair, { sh: 30 });
  const legs = [-0.1, 0.1].map(sx => { const p = pivot(g, sx, 0.86, 0); part(p, G.box, pants, 0, -0.4, 0, 0.14, 0.8, 0.16); part(p, G.box, boots, 0, -0.8, 0.03, 0.15, 0.13, 0.24); return p; });
  part(g, G.box, coat, 0, 1.18, 0, 0.44, 0.62, 0.26);
  const head = pivot(g, 0, 1.64, 0);
  part(head, G.sph, skin, 0, 0, 0, 0.21, 0.24, 0.22); part(head, G.sph, hair, 0, 0.05, -0.035, 0.23, 0.2, 0.23);
  if (o.hat) part(head, G.cyl, mat(o.hat), 0, 0.12, 0, 0.27, 0.1, 0.27);
  const eye = mat(0x101010, { basic: true }); part(head, G.sphLo, eye, -0.05, 0.01, 0.105, 0.025, 0.025, 0.02); part(head, G.sphLo, eye, 0.05, 0.01, 0.105, 0.025, 0.025, 0.02);
  const arms = [-0.28, 0.28].map(sx => { const p = pivot(g, sx, 1.45, 0); part(p, G.box, coat, 0, -0.27, 0, 0.11, 0.55, 0.12); part(p, G.sph, skin, 0, -0.57, 0, 0.09, 0.09, 0.09); return p; });
  return { g, legs, arms, head };
}
function buildDogModel() {
  const g = new T.Group(); scene.add(g);
  const fur = mat(0x8a5a30, { sh: 10 }), dark = mat(0x4a2e18, { sh: 10 }), white = mat(0xd8cfc0, { sh: 10 });
  const body = pivot(g, 0, 0.5, 0);
  part(body, G.box, fur, 0, 0, 0, 0.32, 0.3, 0.72); part(body, G.box, white, 0, -0.06, 0.26, 0.24, 0.2, 0.16);
  const head = pivot(body, 0, 0.18, 0.4);
  part(head, G.box, fur, 0, 0.04, 0, 0.26, 0.24, 0.26); part(head, G.box, dark, 0, -0.03, 0.18, 0.14, 0.12, 0.16); part(head, G.sphLo, mat(0x101010), 0, 0, 0.27, 0.06, 0.05, 0.04);
  for (const sx of [-0.1, 0.1]) { part(head, G.cone, dark, sx, 0.2, -0.02, 0.09, 0.16, 0.06); part(head, G.sphLo, mat(0x101010, { basic: true }), sx * 0.6, 0.08, 0.13, 0.035, 0.035, 0.02); }
  part(head, G.cyl, mat(0x9a1f1f), 0, -0.1, -0.06, 0.28, 0.05, 0.28);
  const tail = pivot(body, 0, 0.1, -0.36); part(tail, G.cyl, fur, 0, 0.12, -0.04, 0.06, 0.26, 0.06).rotation.x = -0.5;
  const legs = [[-0.11, 0.26], [0.11, 0.26], [-0.11, -0.26], [0.11, -0.26]].map(([x, z]) => { const p = pivot(g, x, 0.4, z); part(p, G.box, fur, 0, -0.2, 0, 0.09, 0.4, 0.09); return p; });
  return { g, body, head, tail, legs };
}
function walkAnim(f, ph, amt) {
  const s = Math.sin(ph) * amt;
  if (f.legs.length === 2) { f.legs[0].rotation.x = s * 0.6; f.legs[1].rotation.x = -s * 0.6; f.arms[0].rotation.x = -s * 0.45; f.arms[1].rotation.x = s * 0.45; }
  else f.legs.forEach((l, i) => { l.rotation.x = (i === 0 || i === 3 ? s : -s) * 0.7; });
}
// ein Schritt Richtung Ziel, mit Kollision
function stepTo(pos, tx, tz, sp, dt) {
  const dx = tx - pos.x, dz = tz - pos.z, d = Math.hypot(dx, dz);
  if (d < 0.05 || sp <= 0) return 0;
  const k = Math.min(d, sp * dt) / d; pos.x += dx * k; pos.z += dz * k; resolveCircle(pos, 0.35, false);
  return Math.min(1, sp / 5);
}
// freier Platz hinter dem Spieler (für Hund und Begleiter nach einer Schnellreise oder wenn sie zurückfallen)
function behindPlayer(pos, back, side) {
  const y = player.yaw, fx = -Math.sin(y), fz = -Math.cos(y), rx = Math.cos(y), rz = -Math.sin(y);
  for (const k of [1, 0.5, 0]) {
    const x = player.pos.x - fx * back * k + rx * side * k, z = player.pos.z - fz * back * k + rz * side * k;
    if (!blockedAt(x, z, 0.35)) { pos.set(x, 0, z); return; }
  }
  pos.set(player.pos.x, 0, player.pos.z);
}

// ---------- Bauen und Zurücksetzen ----------
const MARK = HAS_THREE ? canvasTex(64, 64, (g, w) => { g.fillStyle = '#ffd166'; g.beginPath(); g.arc(32, 32, 28, 0, TAU); g.fill(); g.fillStyle = '#2a1a06'; g.font = 'bold 44px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('!', 32, 35); }) : null;
function buildPeople() {
  SURVIVORS.forEach((d, i) => {
    const [x, z] = freeSpot(WX(d.a, d.x), WZ(d.a, d.dz)), f = buildPerson(d);
    const mark = new T.Sprite(new T.SpriteMaterial({ map: MARK, depthWrite: false })); mark.scale.set(0.45, 0.45, 1); mark.position.y = 2.35; f.g.add(mark);
    survivors.push(Object.assign(f, { id: 's' + i, def: d, home: [x, z], pos: new T.Vector3(x, 0, z), yaw: rand(0, TAU), state: 'wait', mark, ph: 0, t: rand(0, 6) }));
  });
  dog = Object.assign(buildDogModel(), { pos: new T.Vector3(), yaw: 0, ph: 0, biteCd: 0, barkCd: 6, giftT: 80, t: 0 });
}
function syncPeople() {
  for (const s of survivors) {
    s.state = SV.rescued && SV.rescued[s.id] ? 'saved' : 'wait'; s.pos.set(s.home[0], 0, s.home[1]);
    s.g.visible = s.state !== 'saved' && MODE === 'story'; s.g.position.copy(s.pos);
  }
  behindPlayer(dog.pos, 1.6, 1.2); dog.g.position.copy(dog.pos); dog.giftT = rand(60, 90);
}
// Schnellreise: Hund und Begleiter kommen mit
function bringFollowers() {
  survivors.forEach((s, k) => { if (s.state === 'follow') { behindPlayer(s.pos, 2.4 + k * 0.8, -1); s.g.position.copy(s.pos); } });
  behindPlayer(dog.pos, 1.6, 1.2); dog.g.position.copy(dog.pos);
}
function followers() { return survivors.filter(s => s.state === 'follow').length; }

// ---------- Überlebende ----------
function rescue(s, i) {
  s.state = 'saved'; s.g.visible = false; SV.rescued[s.id] = 1;
  smokePuff(s.pos.x, 0.6, s.pos.z, 6, 0.3);
  const gold = Math.round(80 * GOLDM[s.def.a] * GOLD * diff().gold) * (s.def.gift === 'gold' ? 2 : 1);
  SV.money += gold; popGold(gold); AU.play('heal'); AU.play('coin');
  let gift = `+${fmt(gold)} Münzen`;
  if (s.def.gift === 'gren') { const n = Math.min(2, grenMax() - SV.gren); SV.gren += n; if (n) gift += ` und ${n} Granaten`; }
  showToast(`In Sicherheit · ${SHELTERS[i].name}`, `${s.def.name} ist gerettet`);
  say(s.def.name, `${s.def.thx} (${gift})`);
  stat('rescued'); achMax('rescued', Object.keys(SV.rescued).length); saveGame();
}
function updateSurvivors(dt) {
  if (MODE !== 'story') return;
  const px = player.pos.x, pz = player.pos.z, safe = safeIdx();
  let k = 0;
  for (const s of survivors) {
    if (s.state === 'saved') continue;
    const d = Math.hypot(px - s.pos.x, pz - s.pos.z);
    if (d > 70) continue; // weit weg: nichts zu tun
    s.t += dt;
    let amt = 0;
    if (s.state === 'follow') {
      if (safe >= 0 && d < 9) { rescue(s, safe); continue; }
      if (d > 45) { s.state = 'stay'; showMsg(`${s.def.name} wartet auf dich`); continue; }
      const y = player.yaw, back = 2.4 + k * 1.1, side = k % 2 ? 1 : -1;
      const tx = px + Math.sin(y) * back + Math.cos(y) * side, tz = pz + Math.cos(y) * back - Math.sin(y) * side;
      const dd = Math.hypot(tx - s.pos.x, tz - s.pos.z);
      amt = dd > 0.8 ? stepTo(s.pos, tx, tz, clamp(dd * 2.2, 0, 8.6), dt) : 0;
      if (amt) s.yaw = angLerp(s.yaw, Math.atan2(tx - s.pos.x, tz - s.pos.z), dt * 8);
      k++;
    } else {
      // wartet: winkt, wenn man in der Nähe ist, und kommt mit, sobald man nah genug ist
      if (d < 14) s.yaw = angLerp(s.yaw, Math.atan2(px - s.pos.x, pz - s.pos.z), dt * 4);
      if (d < 3 && GS === 'play') { say(s.def.name, s.state === 'wait' ? s.def.hi : 'Da bist du ja wieder! Ich bleib dicht hinter dir.'); s.state = 'follow'; AU.play('heal', 0.3); }
      s.arms[1].rotation.x = d < 14 ? -2.6 + Math.sin(s.t * 10) * 0.3 : 0;
      if (d < 14 && Math.random() < dt * 2) PG.emit(s.pos.x, 2.35, s.pos.z, 0, 0.4, 0, 0.6, 1, 0.82, 0.4, 0.06, 0, 0, 0, 0.8);
    }
    s.ph += dt * 9 * amt; walkAnim(s, s.ph, amt);
    s.mark.visible = s.state !== 'follow'; s.mark.position.y = 2.35 + Math.sin(s.t * 3) * 0.08;
    s.g.position.copy(s.pos); s.g.rotation.y = s.yaw;
  }
}

// ---------- Bruno ----------
const BITE_CD = 0.9;
function updateDog(dt) {
  if (!dog) return;
  const p = dog.pos, pp = player.pos, safe = safeIdx() >= 0;
  dog.t += dt; dog.biteCd -= dt; dog.barkCd -= dt;
  // ein Monster in der Nähe des Spielers? Dann hin und beißen
  let tgt = null, best = 1e9;
  if (!safe) for (const m of monsters) {
    if (m.state !== 'chase' || (m.def.fly && m.g.position.y > 1.9) || m.vis < 0.3) continue;
    const gp = m.g.position; if (Math.hypot(gp.x - pp.x, gp.z - pp.z) > 11) continue;
    const dd = Math.hypot(gp.x - p.x, gp.z - p.z); if (dd < best) { best = dd; tgt = m; }
  }
  let amt = 0, tx, tz;
  if (tgt) {
    const gp = tgt.g.position; tx = gp.x; tz = gp.z;
    if (best > tgt.r + 0.75) amt = stepTo(p, tx, tz, 9.5, dt);
    else if (dog.biteCd <= 0) {
      dog.biteCd = BITE_CD;
      _v.set(gp.x, gp.y + 0.6 * tgt.sc, gp.z);
      damageMonster(tgt, 9 * areaScale(HPM, curArea()), _v, false, 1.2, 'dog'); AU.play('bite', 0.1);
    }
  } else {
    // vorne rechts neben dem Spieler, damit man ihn sieht
    const y = player.yaw; tx = pp.x - Math.sin(y) * 1.2 + Math.cos(y) * 1.5; tz = pp.z - Math.cos(y) * 1.2 - Math.sin(y) * 1.5;
    const dd = Math.hypot(tx - p.x, tz - p.z); if (dd > 0.6) amt = stepTo(p, tx, tz, clamp(dd * 2.5, 0, 9.5), dt);
  }
  if (Math.hypot(p.x - pp.x, p.z - pp.z) > 30) behindPlayer(p, 1.6, 1.2); // zu weit weg: kommt hinterhergerannt
  if (amt || tgt) dog.yaw = angLerp(dog.yaw, Math.atan2(tx - p.x, tz - p.z), dt * 10);
  dog.ph += dt * 14 * amt; walkAnim(dog, dog.ph, amt);
  dog.tail.rotation.y = Math.sin(dog.t * (tgt ? 22 : 9)) * 0.6;
  dog.head.rotation.x = tgt && best < tgt.r + 1 ? Math.sin(dog.t * 18) * 0.25 : Math.sin(dog.t * 2) * 0.05;
  dog.body.rotation.x = safe && !amt ? -0.25 : 0; // im Unterschlupf sitzt er
  dog.g.position.copy(p); dog.g.rotation.y = dog.yaw;
  // bellen, wenn sich etwas von hinten anschleicht
  if (dog.barkCd <= 0 && !safe) {
    const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw);
    for (const m of monsters) {
      if (m.state !== 'chase') continue;
      const dx = m.g.position.x - pp.x, dz = m.g.position.z - pp.z, d = Math.hypot(dx, dz);
      if (d < 9 && (dx * fx + dz * fz) / (d || 1) < -0.3) { AU.play('bark'); showMsg('Bruno bellt – hinter dir!'); dog.barkCd = 9; break; }
    }
  }
  // ab und zu bringt er einen Erste-Hilfe-Kasten, wenn man verletzt ist
  if (!safe && GS === 'play') {
    dog.giftT -= dt;
    if (dog.giftT <= 0) {
      if (player.hp < player.maxHp * 0.75) { spawnPickup(p.x, p.z); say('Bruno', 'Wuff! Bruno hat dir einen Erste-Hilfe-Kasten gebracht.'); AU.play('bark'); dog.giftT = rand(70, 110); }
      else dog.giftT = 8;
    }
  }
}
