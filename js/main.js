// Portalnacht – Steuerung, Oberfläche, Shop, Spielablauf
'use strict';
let GS = 'menu';             // menu | play | shop | story | dying | dead | paused | win
let curShelter = 0, shopTab = 'w', dyingT = 0, lastArea = -1, clock = 0, menuT = 0;
const input = { jx: 0, jy: 0, keys: {}, firing: false };

// ---------- kleine Anzeigen ----------
let hitTimer = 0, msgTimer = 0, toastTimer = 0;
function showHitmark(head) { const h = $('hit'); h.classList.add('show'); h.classList.toggle('head', !!head); clearTimeout(hitTimer); hitTimer = setTimeout(() => h.classList.remove('show'), 90); }
function popGold(n) { const s = document.createElement('span'); s.textContent = `+${n}`; s.style.left = `${rand(-30, 30)}px`; $('feed').appendChild(s); setTimeout(() => s.remove(), 950); }
function showMsg(t) { const m = $('msg'); m.textContent = t; m.classList.add('show'); clearTimeout(msgTimer); msgTimer = setTimeout(() => m.classList.remove('show'), 1800); }
function showToast(small, big) { $('toastS').textContent = small; $('toastB').textContent = big; $('toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2600); }
// Schadenszahlen schweben über den Monstern
const nums = [], _nv = HAS_THREE ? new T.Vector3() : null;
function dmgNumber(x, y, z, n, head) {
  if (!OPT.nums || GS !== 'play') return;
  if (nums.length > 24) { nums[0].el.remove(); nums.shift(); }
  const el = document.createElement('span'); el.className = head ? 'dn head' : 'dn';
  el.textContent = fmt(Math.max(1, Math.round(n))); $('dnums').appendChild(el);
  nums.push({ el, x: x + rand(-0.3, 0.3), y, z, t: 0 });
}
function updateNums(dt) {
  for (let i = nums.length - 1; i >= 0; i--) {
    const n = nums[i]; n.t += dt;
    if (n.t > 0.8) { n.el.remove(); nums.splice(i, 1); continue; }
    _nv.set(n.x, n.y + n.t * 1.2, n.z).project(camera);
    if (_nv.z > 1) { n.el.style.opacity = 0; continue; }
    n.el.style.transform = `translate(${((_nv.x * 0.5 + 0.5) * innerWidth).toFixed(1)}px,${((-_nv.y * 0.5 + 0.5) * innerHeight).toFixed(1)}px) translate(-50%,-50%) scale(${n.t < 0.1 ? 1.35 : 1})`;
    n.el.style.opacity = n.t > 0.5 ? ((0.8 - n.t) / 0.3).toFixed(2) : 1;
  }
}
function clearNums() { for (const n of nums) n.el.remove(); nums.length = 0; }
// ---------- Mara ----------
const MARA_HI = [null,
  'Da bist du ja. Komm her, bevor sie dich riechen.',
  'Feuerwehrhaus. Hier gibt es Wasser und Waffen. Hauptsächlich Waffen.',
  'Raststätte. Der Kaffee ist kalt, die Ware ist heiß.',
  'Du lebst ja noch. Respekt.',
  'Letzte Station. Danach gibt es nur noch dich und die Königin.'];
const MARA_TIPS = [
  'Granaten zuerst auf die Großen.',
  'Ziel auf den Kopf. Das tut ihnen mehr weh.',
  'Wird es eng? Ausweichen, nicht wegrennen.',
  'Die Spucker zuerst. Die anderen kommen sowieso zu dir.',
  'Kisten vom Bauer halten einen Koloss nur kurz auf.',
  'Verstärker und Raketenwerfer zusammen. Mehr sag ich nicht.',
  'Wenn du ein paar Sekunden nichts abbekommst, heilst du dich von selbst.',
  'Jede Stufe macht deine Waffe stärker. Und bunter.'];
let sayT = 0, tipI = 0;
function say(who, text) { $('sayWho').textContent = who; $('sayText').textContent = text; $('say').classList.add('show'); sayT = 5; }
function updateMaras(dt) {
  for (const m of maras) {
    const dx = player.pos.x - m.x, dz = player.pos.z - m.z, d = Math.hypot(dx, dz);
    if (d > 40) continue;
    m.t += dt;
    m.g.rotation.y = angLerp(m.g.rotation.y, Math.atan2(dx, dz), dt * 3);
    m.torso.scale.y = 1 + Math.sin(m.t * 2) * 0.02; m.head.rotation.x = Math.sin(m.t * 0.7) * 0.06;
    if (d < 9 && !m.greeted) {
      m.greeted = true; m.waveT = 1.6;
      SV.maraMet = SV.maraMet || {};
      if (!SV.maraMet[m.idx]) { SV.maraMet[m.idx] = 1; say('Mara', MARA_HI[m.idx]); }
      else say('Mara', MARA_TIPS[tipI++ % MARA_TIPS.length]);
    }
    if (d > 16) m.greeted = false;
    if (m.waveT > 0) { m.waveT -= dt; m.armR.rotation.x = -2.7; m.armR.rotation.z = 0.3 + Math.sin(m.waveT * 12) * 0.35; }
    else { m.armR.rotation.x = lerp(m.armR.rotation.x, 0, Math.min(1, dt * 6)); m.armR.rotation.z = lerp(m.armR.rotation.z, 0, Math.min(1, dt * 6)); }
  }
  if (sayT > 0) { sayT -= dt; if (sayT <= 0) $('say').classList.remove('show'); }
}
function healFx() { const h = $('healfx'); h.style.transition = 'none'; h.style.opacity = 1; requestAnimationFrame(() => { h.style.transition = ''; h.style.opacity = 0; }); for (let i = 0; i < 20; i++) PG.emit(player.pos.x + rand(-0.8, 0.8), rand(0.2, 1.4), player.pos.z + rand(-0.8, 0.8), 0, rand(0.6, 1.4), 0, rand(0.6, 1.1), 0.45, 1, 0.55, 0.12, 0, 0, 0, 0.9); }

// ---------- Eingabe ----------
const touches = new Map();
let joyId = null, mouseLook = false;
const touchLayer = $('touch');
function look(dx, dy, k) { player.yaw -= dx * k * OPT.sens; player.pitch = clamp(player.pitch - dy * k * OPT.sens, -1.25, 1.25); }
function showJoy(x, y) { const j = $('joy'); j.hidden = false; j.style.left = x + 'px'; j.style.top = y + 'px'; $('joyKnob').style.transform = 'translate(0,0)'; $('joyhint').hidden = true; }
function endTouch(id) {
  const t = touches.get(id); if (!t) return; touches.delete(id);
  if (t.role === 'joy') { joyId = null; input.jx = input.jy = 0; $('joy').hidden = true; }
  if (t.role === 'fire') { input.firing = false; $('fire').classList.remove('on'); }
}
touchLayer.addEventListener('pointerdown', e => {
  if (GS !== 'play') return;
  e.preventDefault(); AU.init();
  if (e.pointerType === 'mouse') {
    input.firing = true; mouseLook = true;
    if (!document.pointerLockElement) { try { const r = touchLayer.requestPointerLock && touchLayer.requestPointerLock(); if (r && r.catch) r.catch(() => { }); } catch (err) { } }
    touches.set(e.pointerId, { role: 'mouse', x: e.clientX, y: e.clientY });
  } else if (e.clientX < innerWidth * 0.42 && joyId === null) {
    joyId = e.pointerId; touches.set(e.pointerId, { role: 'joy', x0: e.clientX, y0: e.clientY }); showJoy(e.clientX, e.clientY);
  } else touches.set(e.pointerId, { role: 'look', x: e.clientX, y: e.clientY });
  try { touchLayer.setPointerCapture(e.pointerId); } catch (err) { }
});
function moveTouch(e) {
  const t = touches.get(e.pointerId); if (!t) return;
  if (t.role === 'joy') {
    let dx = e.clientX - t.x0, dy = e.clientY - t.y0; const L = Math.hypot(dx, dy), R0 = 52;
    if (L > R0) { dx = dx / L * R0; dy = dy / L * R0; }
    input.jx = dx / R0; input.jy = -dy / R0; $('joyKnob').style.transform = `translate(${dx}px,${dy}px)`;
  } else if (t.role === 'look' || t.role === 'fire' || (t.role === 'mouse' && !document.pointerLockElement)) {
    look(e.clientX - t.x, e.clientY - t.y, t.role === 'mouse' ? 0.0045 : 0.0058); t.x = e.clientX; t.y = e.clientY;
  }
}
touchLayer.addEventListener('pointermove', moveTouch);
for (const ev of ['pointerup', 'pointercancel']) touchLayer.addEventListener(ev, e => { const t = touches.get(e.pointerId); if (t && t.role === 'mouse') input.firing = false; endTouch(e.pointerId); });
document.addEventListener('mousemove', e => { if (document.pointerLockElement === touchLayer && GS === 'play') look(e.movementX, e.movementY, 0.0025); });

const fireBtn = $('fire');
fireBtn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (GS !== 'play') return; AU.init(); input.firing = true; fireBtn.classList.add('on'); touches.set(e.pointerId, { role: 'fire', x: e.clientX, y: e.clientY }); try { fireBtn.setPointerCapture(e.pointerId); } catch (err) { } });
fireBtn.addEventListener('pointermove', moveTouch);
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) fireBtn.addEventListener(ev, e => endTouch(e.pointerId));
$('swap').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); swapWeapon(); });
$('gren').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); AU.init(); throwGrenade(); });
$('dash').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); dash(); });
addEventListener('pointerdown', () => AU.init(), { once: true });
document.querySelectorAll('.ab').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); useAbility(+b.dataset.ab); }));
$('enter').addEventListener('click', () => { const s = safeIdx(); if (s >= 0 && GS === 'play') openShelter(s); });
document.addEventListener('contextmenu', e => e.preventDefault());
// Kein Zoomen: weder mit zwei Fingern noch durch Doppeltippen
document.addEventListener('touchmove', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
for (const ev of ['gesturestart', 'gesturechange']) document.addEventListener(ev, e => e.preventDefault(), { passive: false });

addEventListener('keydown', e => {
  input.keys[e.code] = true;
  if (GS !== 'play') return;
  if (e.code === 'KeyQ') swapWeapon();
  if (e.code.startsWith('Digit')) { const n = +e.code.slice(5) - 1; if (n >= 0 && n < 4) useAbility(n); }
  if (e.code === 'KeyE') { const s = safeIdx(); if (s >= 0) openShelter(s); }
  if (e.code === 'KeyG') throwGrenade();
  if (e.code === 'KeyF') dash();
  if (e.code === 'Space') { input.firing = true; e.preventDefault(); }
});
addEventListener('keyup', e => { input.keys[e.code] = false; if (e.code === 'Space') input.firing = false; });
addEventListener('blur', () => { input.keys = {}; input.firing = false; });

function resetInput() { touches.clear(); joyId = null; input.jx = input.jy = 0; input.firing = false; input.keys = {}; $('joy').hidden = true; fireBtn.classList.remove('on'); if (document.pointerLockElement) try { document.exitPointerLock(); } catch (e) { } }

function ownedWeapons() { return WEAPONS.filter(w => SV.weapons[w.id]); }
function swapWeapon() {
  if (GS !== 'play') return;
  const l = ownedWeapons(); if (l.length < 2) { showMsg('Kauf bei Mara weitere Waffen'); return; }
  const i = l.findIndex(w => w.id === SV.cur), n = l[(i + 1) % l.length];
  SV.cur = n.id; equipVM(n.id); showMsg(n.name);
}

// ---------- Spieler ----------
function moveInput() {
  let mx = input.jx, my = input.jy; const k = input.keys;
  if (k.KeyW || k.ArrowUp) my += 1; if (k.KeyS || k.ArrowDown) my -= 1; if (k.KeyA) mx -= 1; if (k.KeyD) mx += 1;
  const L = Math.hypot(mx, my); if (L > 1) { mx /= L; my /= L; }
  return [mx, my];
}
const DASH_CD = 2.2;
function dash() {
  if (GS !== 'play' || player.dead || player.dashCd > 0) return;
  let [mx, my] = moveInput();
  if (Math.hypot(mx, my) < 0.2) { mx = 0; my = -1; } // ohne Richtung: nach hinten
  const L = Math.hypot(mx, my); mx /= L; my /= L;
  const sy = Math.sin(player.yaw), cy = Math.cos(player.yaw);
  player.dvx = (-sy * my + cy * mx) * 17; player.dvz = (-cy * my - sy * mx) * 17;
  player.dashT = 0.2; player.inv = 0.35; player.dashCd = DASH_CD; player.fovKick = 9;
  AU.play('dash', 0.1); smokePuff(player.pos.x, 0.1, player.pos.z, 5, 0.18); achAdd('dashes');
}
function updatePlayer(dt) {
  let [mx, my] = moveInput(); const k = input.keys;
  if (k.ArrowLeft) player.yaw += 2.4 * dt; if (k.ArrowRight) player.yaw -= 2.4 * dt;
  // Sprinten: Shift oder den Joystick ganz nach vorne schieben
  const sprint = (k.ShiftLeft || k.ShiftRight || (Math.hypot(input.jx, input.jy) > 0.92 && input.jy > 0.5)) && my > 0.3;
  const sy = Math.sin(player.yaw), cy = Math.cos(player.yaw), sp = 5.4 * (sprint ? 1.45 : 1);
  let vx = (-sy * my + cy * mx) * sp, vz = (-cy * my - sy * mx) * sp;
  if (player.dashT > 0) { player.dashT -= dt; vx = player.dvx; vz = player.dvz; if (Math.random() < dt * 40) smokePuff(player.pos.x, 0.1, player.pos.z, 1, 0.15); }
  player.inv = Math.max(0, player.inv - dt); player.dashCd = Math.max(0, player.dashCd - dt); player.fovKick = Math.max(0, player.fovKick - dt * 40);
  player.pos.x += vx * dt; player.pos.z += vz * dt;
  resolveCircle(player.pos, player.r, false);
  const mv = Math.min(1.4, Math.hypot(vx, vz) / 5.4);
  player.bob += dt * 9 * mv; player.moveAmt = lerp(player.moveAmt, Math.min(1, mv), Math.min(1, dt * 8));
  player.hurt = Math.max(0, player.hurt - dt * 1.4);
  // nach 4 Sekunden ohne Treffer heilt man sich langsam selbst
  player.sinceHit += dt;
  if (player.sinceHit > 4 && player.hp < player.maxHp) player.hp = Math.min(player.maxHp, player.hp + diff().regen * dt);
  const s = safeIdx();
  if (MODE === 'story' && s > SV.checkpoint) { SV.checkpoint = s; saveGame(); showMsg('Unterschlupf erreicht · gespeichert'); }
}
function placeCamera(dt) {
  camera.position.set(player.pos.x, player.eye + Math.sin(player.bob * 2) * 0.035 * player.moveAmt, player.pos.z);
  if (shake > 0) { camera.position.x += rand(-1, 1) * shake * 0.25; camera.position.y += rand(-1, 1) * shake * 0.25; shake = Math.max(0, shake - dt * 1.8); }
  camera.rotation.set(player.pitch, player.yaw, 0);
  const fov = baseFov + player.fovKick; if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
  camera.updateMatrixWorld(true);
}
function die() {
  player.dead = true; GS = 'dying'; dyingT = 0; resetInput(); AU.flame(false); flameOn = false;
  SV.deaths++; saveGame(); AU.play('death');
}

// ---------- HUD ----------
const hc = {};
function setText(id, v) { if (hc[id] !== v) { hc[id] = v; $(id).textContent = v; } }
function pipsHTML(lv) { let s = ''; for (let i = 1; i <= 4; i++) s += `<i class="${i <= lv ? 'on l' + lv : ''}"></i>`; return s; }
function objective(a) {
  if (MODE === 'endlos') return endlessObjective();
  if (safeIdx() >= 0) return 'Sicher. Hier kannst du Pause machen und einkaufen.';
  const st = areaSt[a];
  if (a === 5 && st.boss) return 'Besiege die Monsterkönigin!';
  if (st.active) return `Welle ${st.wave + 1}/3 · noch ${waveRemaining(a, st.wave)} Monster`;
  if (st.done && a < 5) return `Der Weg ist frei · Unterschlupf in ${Math.max(0, Math.round(player.pos.z - SAFE[a + 1].z))} m`;
  if (a === 5 && st.wave === 2) return 'Geh zum Portal';
  return 'Folge der Straße. Bleib wachsam.';
}
function updateHUD() {
  const hp = Math.ceil(player.hp);
  if (hc.hp !== hp) { hc.hp = hp; $('hpFill').style.transform = `scaleX(${player.hp / player.maxHp})`; $('hpText').textContent = `${hp} / ${player.maxHp}`; }
  setText('money', fmt(SV.money));
  const a = curArea();
  setText('areaName', MODE === 'endlos' ? `Endlos-Modus · Rekord ${endlessBest()} Wellen` : `Gebiet ${a + 1} · ${AREAS[a].name}`);
  setText('objective', objective(a));
  const w = curWeapon(), lv = SV.weapons[w.id] || 1, wk = w.id + lv;
  if (hc.w !== wk) { hc.w = wk; $('wName').textContent = w.name; $('wName').className = 'l' + lv; $('wPips').innerHTML = pipsHTML(lv); }
  setText('grenN', String(SV.gren)); $('gren').classList.toggle('empty', !SV.gren);
  if (barRef && barRef.state !== 'dead') $('bossFill').style.transform = `scaleX(${Math.max(0, barRef.hp / barRef.maxHp)})`;
  const dp = Math.round(player.dashCd / DASH_CD * 100) / 100, db = $('dash'); if (db._p !== dp) { db._p = dp; db.style.setProperty('--p', dp); }
  document.querySelectorAll('.ab').forEach((b, i) => {
    const l = abLv(i); b.hidden = !l; if (!l) return;
    const p = Math.round(abCd[i] / ABILITIES[i].cd[l - 1] * 100) / 100;
    if (b._p !== p) { b._p = p; b.style.setProperty('--p', p); }
    b.classList.toggle('on', abOn[i] > 0); b.classList.toggle('cool', abCd[i] > 0);
    const tt = abCd[i] > 0 ? String(Math.ceil(abCd[i])) : ''; const te = b.querySelector('.t'); if (te.textContent !== tt) te.textContent = tt;
    const em = b.querySelector('em'); if (em.textContent !== String(l)) { em.textContent = l; em.className = 'l' + l; }
  });
  $('enter').hidden = !(safeIdx() >= 0 && GS === 'play');
  const low = player.hp / player.maxHp < 0.3 ? 0.3 + Math.sin(clock * 6) * 0.12 : 0;
  $('vig').style.opacity = Math.min(1, player.hurt * 0.9 + low).toFixed(2);
  $('amp').style.opacity = abOn[1] > 0 ? 1 : 0;
  $('rotate').hidden = !(IS_TOUCH && innerHeight > innerWidth);
}
function setPlayUI(on) { $('hud').hidden = !on; $('controls').hidden = !on; if (!on) { $('vig').style.opacity = 0; $('amp').style.opacity = 0; $('rotate').hidden = true; } }

// ---------- Unterschlupf, Story, Shop ----------
function hideOverlays() { for (const id of ['menu', 'story', 'shop', 'dead', 'paused', 'win', 'settings', 'erfolge']) $(id).hidden = true; }
function showStory(s, cb) {
  GS = 'story'; hideOverlays();
  $('storyKicker').textContent = s.kicker; $('storyTitle').textContent = s.title; $('storyText').textContent = s.text;
  $('story').hidden = false; $('storyBtn').onclick = () => { $('story').hidden = true; cb(); };
}
function openShelter(i) {
  resetInput(); AU.flame(false); flameOn = false;
  curShelter = i; player.hp = player.maxHp;
  if (MODE === 'story') SV.checkpoint = Math.max(SV.checkpoint, i);
  saveGame();
  if (!SV.seen[i] && MODE === 'story') { SV.seen[i] = 1; saveGame(); showStory(STORY[i], showShop); } else showShop();
}
function showShop() {
  GS = 'shop'; hideOverlays(); setPlayUI(false);
  $('shopTitle').textContent = SHELTERS[curShelter].name; $('shopTrader').textContent = TRADER[curShelter];
  renderShop(); $('shop').hidden = false; $('shop').scrollTop = 0;
}
function gebiet(avail) { return `Ab Gebiet ${avail + 1}`; }
function weaponCard(w) {
  const lv = SV.weapons[w.id] || 0, avail = curShelter >= w.avail || lv > 0, show = Math.max(1, lv);
  const cost = lv === 0 ? w.price : lv < 4 ? w.up[lv - 1] : 0;
  const dmg = Math.round(w.dmg * DMG_L[show - 1]) * (w.pellets > 1 ? 1 : 1);
  const rate = w.kind === 'flame' ? 'Dauerfeuer' : `${(w.rate * RATE_L[show - 1]).toFixed(1).replace('.', ',')} pro Sek.`;
  const stat = w.kind === 'flame' ? `Schaden ${dmg}/Sek. · setzt in Brand` : w.pellets > 1 ? `Schaden ${w.pellets}× ${dmg} · ${rate}` : w.splash ? `Schaden ${dmg} im Umkreis · ${rate}` : `Schaden ${dmg} · ${rate}`;
  let btn;
  if (!avail) btn = `<button class="sbtn" disabled>${gebiet(w.avail)}</button>`;
  else if (lv >= 4) btn = `<button class="sbtn" disabled>Höchste Stufe</button>`;
  else { const poor = SV.money < cost; btn = `<button class="sbtn ${poor ? 'poor' : 'buy'}" data-buyw="${w.id}" ${poor ? 'disabled' : ''}>${lv ? `Stufe ${lv + 1}` : 'Kaufen'} · ${fmt(cost)}</button>`; }
  const eq = lv ? (SV.cur === w.id ? `<button class="sbtn eq" disabled>Ausgerüstet</button>` : `<button class="sbtn eq" data-eq="${w.id}">Ausrüsten</button>`) : '';
  return `<div class="item ${avail ? '' : 'locked'} ${SV.cur === w.id ? 'cur' : ''} lvb${lv}"><div class="top"><h3 class="l${lv}">${w.name}</h3><span class="cat">${w.cat}</span></div><p class="stat">${stat}</p><span class="pips">${pipsHTML(lv)}</span><div class="row">${btn}${eq}</div></div>`;
}
function abilCard(A, i) {
  const lv = SV.abil[A.id] || 0, avail = curShelter >= A.avail || lv > 0, show = Math.max(1, lv);
  const cost = lv === 0 ? A.price : lv < 4 ? A.up[lv - 1] : 0;
  let btn;
  if (!avail) btn = `<button class="sbtn" disabled>${gebiet(A.avail)}</button>`;
  else if (lv >= 4) btn = `<button class="sbtn" disabled>Höchste Stufe</button>`;
  else { const poor = SV.money < cost; btn = `<button class="sbtn ${poor ? 'poor' : 'buy'}" data-buya="${i}" ${poor ? 'disabled' : ''}>${lv ? `Stufe ${lv + 1}` : 'Freischalten'} · ${fmt(cost)}</button>`; }
  const next = lv && lv < 4 ? `<p>Nächste Stufe: ${A.desc(lv + 1)}</p>` : '';
  return `<div class="item ${avail ? '' : 'locked'} lvb${lv}"><div class="top"><h3 class="l${lv}">${A.name}</h3><span class="cat">Knopf ${i + 1}</span></div><p class="stat">${A.desc(show)} Abklingzeit ${A.cd[show - 1]} Sek.</p>${next}<span class="pips">${pipsHTML(lv)}</span><div class="row">${btn}</div></div>`;
}
function grenCard() {
  const price = grenPrice(curShelter), full = SV.gren >= GREN_MAX, poor = SV.money < price, off = full || poor;
  return `<div class="item"><div class="top"><h3>Granaten</h3><span class="cat">Wurfwaffe</span></div><p class="stat">Schaden ${fmt(GREN_DMG * HPM[curShelter])} im Umkreis · du hast ${SV.gren} von ${GREN_MAX}</p><p>Explodiert nach kurzer Zeit oder sobald sie ein Monster trifft.</p><div class="row"><button class="sbtn ${off ? 'poor' : 'buy'}" data-gren="1" ${off ? 'disabled' : ''}>${full ? 'Taschen voll' : `1 Granate · ${fmt(price)}`}</button></div></div>`;
}
function renderShop() {
  $('shopMoney').textContent = fmt(SV.money);
  $('tabW').setAttribute('aria-selected', shopTab === 'w'); $('tabA').setAttribute('aria-selected', shopTab === 'a');
  $('shopList').innerHTML = shopTab === 'w' ? grenCard() + WEAPONS.map(weaponCard).join('') : ABILITIES.map(abilCard).join('');
}
$('tabW').onclick = () => { shopTab = 'w'; renderShop(); };
$('tabA').onclick = () => { shopTab = 'a'; renderShop(); };
$('shopList').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  if (b.dataset.gren) {
    const price = grenPrice(curShelter); if (SV.gren >= GREN_MAX || SV.money < price) return;
    SV.money -= price; SV.gren++; AU.play('buy'); saveGame(); renderShop(); return;
  }
  if (b.dataset.buyw) {
    const w = W_BY[b.dataset.buyw], lv = SV.weapons[w.id] || 0, cost = lv === 0 ? w.price : w.up[lv - 1];
    if (lv >= 4 || SV.money < cost) return;
    SV.money -= cost; SV.weapons[w.id] = lv + 1; if (!lv) SV.cur = w.id;
    AU.play('buy'); saveGame(); renderShop(); achOwned();
  } else if (b.dataset.eq) { SV.cur = b.dataset.eq; saveGame(); renderShop(); }
  else if (b.dataset.buya != null) {
    const i = +b.dataset.buya, A = ABILITIES[i], lv = SV.abil[A.id] || 0, cost = lv === 0 ? A.price : A.up[lv - 1];
    if (lv >= 4 || SV.money < cost) return;
    SV.money -= cost; SV.abil[A.id] = lv + 1; AU.play('buy'); saveGame(); renderShop();
  }
});
$('btnLeave').onclick = () => { $('shop').hidden = true; equipVM(SV.cur); GS = 'play'; setPlayUI(true); };
$('btnMenu').onclick = () => { saveGame(); showMenu(); };

// ---------- Einstellungen ----------
let setFrom = 'menu';
function openSettings(from) {
  setFrom = from;
  $('optSens').value = OPT.sens; $('optAim').value = OPT.aim; $('optGfx').value = OPT.gfx; $('optBtn').value = OPT.btn; $('optDiff').value = SV.diff || 'normal';
  $('optSound').checked = OPT.sound; $('optMusic').checked = OPT.music; $('optVib').checked = OPT.vib; $('optNums').checked = OPT.nums;
  $('optDiff').hidden = $('lblDiff').hidden = from !== 'shop'; // Schwierigkeit nur während eines Spiels
  $(from).hidden = true; $('settings').hidden = false; $('settings').scrollTop = 0;
}
$('btnSetM').onclick = () => openSettings('menu');
$('btnAchM').onclick = () => { renderErfolge(); $('menu').hidden = true; $('erfolge').hidden = false; $('erfolge').scrollTop = 0; };
$('btnAchBack').onclick = () => { $('erfolge').hidden = true; $('menu').hidden = false; };
$('btnSetS').onclick = () => openSettings('shop');
$('btnSetBack').onclick = () => { $('settings').hidden = true; $(setFrom).hidden = false; if (setFrom === 'shop') renderShop(); };
$('optSens').addEventListener('input', e => { OPT.sens = +e.target.value; saveOpts(); });
$('optAim').onchange = e => { OPT.aim = e.target.value; saveOpts(); };
$('optGfx').onchange = e => { OPT.gfx = e.target.value; saveOpts(); applyGfx(); };
$('optBtn').onchange = e => { OPT.btn = e.target.value; saveOpts(); applyBtns(); };
$('optDiff').onchange = e => { SV.diff = e.target.value; saveGame(); };
$('optSound').onchange = e => { OPT.sound = e.target.checked; saveOpts(); AU.init(); AU.setOn(OPT.sound); };
$('optMusic').onchange = e => { OPT.music = e.target.checked; saveOpts(); AU.init(); setMusicOn(OPT.music); };
$('optVib').onchange = e => { OPT.vib = e.target.checked; saveOpts(); };
$('optNums').onchange = e => { OPT.nums = e.target.checked; saveOpts(); };
function applyBtns() { document.body.classList.toggle('bigbtn', OPT.btn === 'gross'); }
function applyGfx() {
  const dpr = window.devicePixelRatio || 1;
  pixelRatio = OPT.gfx === 'schnell' ? 0.75 : OPT.gfx === 'schoen' ? Math.min(dpr, 2) : Math.min(dpr, IS_TOUCH ? 1.25 : 1.5);
  renderer.setPixelRatio(pixelRatio); camera.far = OPT.gfx === 'schnell' ? 60 : 90; resize();
  // Schatten vom Mond nur bei „Schön“
  const sh = OPT.gfx === 'schoen';
  if (renderer.shadowMap.enabled !== sh) {
    renderer.shadowMap.enabled = sh; renderer.shadowMap.type = T.PCFSoftShadowMap; moonLight.castShadow = sh;
    const c = moonLight.shadow.camera; c.left = c.bottom = -28; c.right = c.top = 28; c.near = 1; c.far = 140; c.updateProjectionMatrix();
    moonLight.shadow.mapSize.set(1024, 1024); moonLight.shadow.bias = -0.0015; moonLight.shadow.normalBias = 0.02;
    if (!moonLight.target.parent) scene.add(moonLight.target);
    scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => { m.needsUpdate = true; }); });
  }
}

// ---------- Menü, Start, Tod, Sieg ----------
function showMenu() {
  GS = 'menu'; MODE = 'story'; hideOverlays(); setPlayUI(false); resetInput(); AU.flame(false);
  const has = hasSave(), sv = lsGet(SAVE_KEY);
  $('btnEndless').hidden = !((sv && sv.won) || ACH.got.portal); $('btnContinue').hidden = !has; $('confirmNew').hidden = true; $('diffPick').hidden = true;
  if (has) { const s = lsGet(SAVE_KEY); $('saveInfo').textContent = `Spielstand: ${SHELTERS[s.checkpoint || 0].name} (Gebiet ${(s.checkpoint || 0) + 1}) · ${fmt(s.money || 0)} Münzen · ${(DIFF[s.diff] || DIFF.normal).name}`; }
  else $('saveInfo').textContent = '';
  if (endlessBest()) $('saveInfo').textContent += ` · Endlos-Rekord: ${endlessBest()} Wellen`;
  $('verInfo').textContent = VERSION.startsWith('__') ? 'Entwicklungsversion' : `Version ${VERSION} vom ${BUILD_DATE}`;
  $('menu').hidden = false;
  scene.fog.color.setHex(AREAS[5].fog); scene.background.setHex(AREAS[5].fog); scene.fog.density = AREAS[5].dens;
}
function tryFullscreen() {
  if (!IS_TOUCH) return;
  try { const el = document.documentElement, r = el.requestFullscreen && el.requestFullscreen(); if (r && r.then) r.then(() => { try { const o = screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'); if (o && o.catch) o.catch(() => { }); } catch (e) { } }).catch(() => { }); } catch (e) { }
}
function resetWorld(cp) {
  clearMonsters(); clearProjs(); clearAcids(); clearPatches(); clearBarricades(); clearPickups(); clearDecals(); clearGrenades(); clearNums();
  resetAreas(cp); $('bossbar').hidden = true; winT = -1; if (portal) portal.s = 1;
  player.pos.set(SAFE[cp].x - 1.5, 0, SAFE[cp].z); player.yaw = 0; player.pitch = 0; player.hp = player.maxHp; player.dead = false; player.hurt = 0; player.sinceHit = 99; player.inv = 0; player.dashT = 0; player.dashCd = 0; player.fovKick = 0;
  abCd.fill(0); abOn.fill(0); lastArea = -1;
  const A = AREAS[curArea()]; scene.fog.color.setHex(A.fog); scene.background.setHex(A.fog); scene.fog.density = A.dens;
  if (!SV.weapons[SV.cur]) SV.cur = 'holz';
  equipVM(SV.cur);
}
function enterGame(cp, openFirst) {
  AU.init(); tryFullscreen(); MODE = 'story';
  hideOverlays(); resetWorld(cp);
  GS = 'play'; setPlayUI(true); $('joyhint').hidden = false; achOwned();
  if (openFirst) openShelter(cp);
}
$('btnContinue').onclick = () => { loadGame(); enterGame(SV.checkpoint, false); };
$('btnNew').onclick = () => { if (hasSave()) { $('confirmNew').hidden = false; $('diffPick').hidden = true; return; } $('diffPick').hidden = false; };
$('btnNewYes').onclick = () => { $('confirmNew').hidden = true; $('diffPick').hidden = false; };
document.querySelectorAll('.diffbtn').forEach(b => { b.onclick = () => startNew(b.dataset.diff); });
$('btnNewNo').onclick = () => { $('confirmNew').hidden = true; };
function startNew(d) { SV = freshSave(); SV.diff = DIFF[d] ? d : 'normal'; saveGame(); enterGame(0, true); }
$('btnRespawn').onclick = () => {
  $('dead').hidden = true; GS = 'play'; setPlayUI(true);
  if (MODE === 'endlos') { startEndless(); return; }
  resetWorld(SV.checkpoint); showToast(SHELTERS[SV.checkpoint].name, 'Nochmal');
};
$('btnDeadMenu').onclick = () => { saveGame(); showMenu(); };
$('btnEndless').onclick = () => {
  if (!loadGame()) SV = freshSave();
  AU.init(); tryFullscreen(); hideOverlays(); GS = 'play'; setPlayUI(true); achOwned(); startEndless();
};
$('btnResume').onclick = () => { $('paused').hidden = true; GS = 'play'; setPlayUI(true); };
$('btnWinNew').onclick = () => startNew(SV.diff);
$('btnWinMenu').onclick = showMenu;
document.addEventListener('visibilitychange', () => { if (document.hidden && GS === 'play') { GS = 'paused'; resetInput(); AU.flame(false); flameOn = false; setPlayUI(false); $('paused').hidden = false; } });

function showWin() {
  GS = 'win'; SV.won = true; saveGame(); setPlayUI(false); resetInput(); AU.flame(false);
  const t = Math.floor(SV.time), mm = Math.floor(t / 60), ss = String(t % 60).padStart(2, '0');
  $('winText').textContent = WIN_TEXT;
  $('winStats').innerHTML = `<div><b>${mm}:${ss}</b><span>Spielzeit</span></div><div><b>${fmt(SV.kills)}</b><span>Monster besiegt</span></div><div><b>${fmt(SV.deaths)}</b><span>Niederlagen</span></div>`;
  hideOverlays(); $('win').hidden = false;
}

// ---------- Hauptschleife ----------
let baseFov = 72;
function resize() {
  const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false);
  baseFov = w / h < 1 ? 86 : 72;
  camera.aspect = w / h; camera.fov = baseFov; camera.updateProjectionMatrix();
  PU.uScale.value = h * renderer.getPixelRatio() / (2 * Math.tan(camera.fov * Math.PI / 360));
}
addEventListener('resize', resize);
let last = performance.now(), slowT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now; clock += dt;
  // langsame Geräte: Auflösung etwas senken
  if (dt > 1 / 36) slowT += dt; else slowT = Math.max(0, slowT - dt * 0.5);
  if (OPT.gfx === 'auto' && slowT > 2.5 && pixelRatio > 0.75) { pixelRatio = Math.max(0.75, pixelRatio - 0.2); renderer.setPixelRatio(pixelRatio); resize(); slowT = 0; }

  if (GS === 'play') {
    SV.time += dt;
    updatePlayer(dt); placeCamera(dt);
    if (MODE === 'endlos') updateEndless(dt); else updateWaves(dt);
    updateMonsters(dt); updateEyeGlow(); updateProjs(dt); updateAcids(dt); updatePatches(dt); updateBarricades(dt);
    updatePickups(dt, clock); updateAbilities(dt); updateWeapon(dt, input.firing && winT < 0); updateVM(dt); updateTracers(dt); updateGrenades(dt); updateBars(); updateNums(dt); updateMaras(dt);
    const a = curArea();
    if (a !== lastArea) { if (lastArea >= 0 || true) showToast(`Gebiet ${a + 1}`, AREAS[a].name); lastArea = a; }
    const A = AREAS[a], tc = new T.Color(A.fog);
    scene.fog.color.lerp(tc, Math.min(1, dt * 0.8)); scene.background.copy(scene.fog.color); scene.fog.density = lerp(scene.fog.density, A.dens, Math.min(1, dt * 0.8));
    if (a === 4 && Math.random() < dt * 0.5) PG.emit(player.pos.x + rand(-12, 12), rand(0.5, 2.5), player.pos.z + rand(-14, 4), rand(-0.2, 0.2), rand(-0.1, 0.1), rand(-0.2, 0.2), rand(2, 4), 0.8, 0.9, 0.4, 0.06, 0, 0, 0, 0.8);
    if (a === 1 && Math.random() < dt * 4) PG.emit(player.pos.x + rand(-12, 12), rand(0.4, 2.2), player.pos.z + rand(-16, 6), rand(-0.3, 0.3), rand(-0.1, 0.2), rand(-0.3, 0.3), rand(2, 4), 0.75, 1, 0.45, 0.07, 0, 0, 0, 0.9);
    if (winT >= 0) { winT += dt; if (portal) portal.s = Math.max(0, 1 - winT / 2.5); if (winT > 4) showWin(); }
    updateHUD();
  } else if (GS === 'dying') {
    dyingT += dt;
    camera.position.y = lerp(camera.position.y, 0.35, Math.min(1, dt * 3)); camera.rotation.z = lerp(camera.rotation.z, 0.5, Math.min(1, dt * 2));
    $('vig').style.opacity = Math.min(1, 0.6 + dyingT * 0.4);
    updateMonsters(dt); updateBars();
    if (dyingT > 1.5) {
      GS = 'dead'; setPlayUI(false);
      const done = EN.wave - (EN.active ? 1 : 0), end = MODE === 'endlos';
      $('deadText').textContent = end ? `Geschafft: ${done} ${done === 1 ? 'Welle' : 'Wellen'}. Dein Rekord: ${endlessBest()}. Deine Münzen behältst du.` : `Die Monster haben dich erwischt. Du startest wieder im Unterschlupf „${SHELTERS[SV.checkpoint].name}“. Deine Münzen, Waffen und Fähigkeiten behältst du.`;
      $('btnRespawn').textContent = end ? 'Nochmal' : 'Zurück zum Unterschlupf'; $('btnDeadMenu').hidden = !end;
      $('dead').hidden = false;
    }
  } else if (GS === 'menu') {
    menuT += dt;
    camera.position.set(Math.sin(menuT * 0.12) * 4, 2.2 + Math.sin(menuT * 0.3) * 0.2, -728);
    camera.lookAt(0, 8.5, -777); camera.updateMatrixWorld(true);
  }
  achTick(dt);
  if (AU.ctx) { MU.intense = MODE === 'endlos' ? EN.active : areaSt.some(s => s && s.active); setMusic(pickMusic()); }
  updateWorld(dt, clock, camera.position); updateAtmos(dt, clock);
  if (moonLight.castShadow) { moonLight.target.position.set(camera.position.x, 0, camera.position.z - 6); moonLight.position.set(camera.position.x - 30, 50, camera.position.z + 14); }
  if (moon) { moon.position.set(camera.position.x - 34, 30, camera.position.z - 66); moon.lookAt(camera.position); moon.visible = curArea() < 5 && GS !== 'menu'; }
  PU.uFogD.value = scene.fog.density;
  PB.update(dt); PF.update(dt); PS.update(dt); PG.update(dt);
  for (const d of decals) { d.t += dt; if (d.t > 25) d.m.opacity = Math.max(0, 0.85 - (d.t - 25) * 0.1); }
  renderer.render(scene, camera);
}

function pickMusic() {
  if (GS === 'menu') return 'menu';
  if (GS === 'shop' || GS === 'story' || GS === 'win') return 'safe';
  if (GS !== 'play') return null;
  if (barRef && barRef.state !== 'dead') return 'boss';
  return 'a' + curArea();
}

// ---------- Start ----------
function boot() {
  if (!HAS_THREE) return;
  buildWorld(); buildViewModels(); resetAreas(0); applyBtns(); applyGfx(); showMenu();
  // Offline spielen: Service Worker nur auf der echten Seite (nicht im automatischen Test)
  if ('serviceWorker' in navigator && location.protocol === 'https:' && !navigator.webdriver) navigator.serviceWorker.register('sw.js').catch(() => { });
  requestAnimationFrame(t => { last = t; frame(t); });
}
boot();
