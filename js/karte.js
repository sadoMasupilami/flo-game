// Portalnacht – Karte: Minikarte im HUD und große Karte zum Aufklappen
'use strict';
// Die Karte wird einmal aus der gebauten Welt gemalt: Gebiete, Straßen, Bäume, Häuser.
// Oben auf der Karte liegt das Stadtzentrum (Richtung -z), rechts ist +x – so wie man die Welt von oben sieht.
const MAP_S = 2;   // Pixel je Meter im Kartenbild
const MAP_W = (WORLD.x1 - WORLD.x0) * MAP_S, MAP_H = (WORLD.z1 - WORLD.z0) * MAP_S;
const REGION_COL = ['#3d4a2c', '#22311e', '#47474a', '#38402e', '#3b4e30', '#302e36'];
const MINI_R = 55; // so viele Meter zeigt die Minikarte bis zum Rand
const mapX = x => (x - WORLD.x0) * MAP_S, mapY = z => (z - WORLD.z0) * MAP_S;
let mapBase = null, miniT = 0, mapFrom = 'play';

function buildMapBase() {
  const c = document.createElement('canvas'); c.width = MAP_W; c.height = MAP_H;
  const g = c.getContext('2d');
  REG.forEach((r, a) => { g.fillStyle = REGION_COL[a]; g.fillRect(mapX(r.cx - TILE / 2), mapY(r.cz - TILE / 2), TILE * MAP_S, TILE * MAP_S); });
  for (const r of mapRoads) { g.fillStyle = r.c; g.fillRect(mapX(r.x0), mapY(r.z0), (r.x1 - r.x0) * MAP_S, (r.z1 - r.z0) * MAP_S); }
  for (const [x, z, s, bare] of mapTrees) {
    if (!inWorld(x, z, -2)) continue;
    g.fillStyle = bare ? 'rgba(46,38,28,.85)' : 'rgba(16,38,20,.9)';
    g.beginPath(); g.arc(mapX(x), mapY(z), (bare ? 0.8 : 1.6) * s * MAP_S, 0, TAU); g.fill();
  }
  g.fillStyle = 'rgba(16,13,13,.92)'; g.strokeStyle = 'rgba(236,226,210,.16)'; g.lineWidth = 1;
  for (const s of solids) {
    if (s.tree || s.hide) continue;
    const w = s.x1 - s.x0, d = s.z1 - s.z0; if (w * d < 0.8) continue;
    g.fillRect(mapX(s.x0), mapY(s.z0), w * MAP_S, d * MAP_S);
    if (w * d > 30) g.strokeRect(mapX(s.x0) + 0.5, mapY(s.z0) + 0.5, w * MAP_S - 1, d * MAP_S - 1);
  }
  mapBase = c;
}

// ---------- Was auf der Karte steht ----------
function nextGoal() { for (let a = 0; a < 5; a++) if (!SV.freed[a]) return a; return 5; }
// mit Überlebenden im Schlepptau ist der nächste Unterschlupf das Ziel
function nearestShelter() { let b = SAFE[0], bd = 1e9; for (const s of SAFE) { const d = Math.hypot(s.x - player.pos.x, s.z - player.pos.z); if (d < bd) { bd = d; b = s; } } return b; }
function goalPos() { if (followers()) return nearestShelter(); const n = nests[nextGoal()]; return n.a === 5 ? { x: WX(5, 0), z: WZ(5, -100) } : n; }
function iconSurvivor(g, x, y, s, found) {
  g.fillStyle = found ? '#74d68e' : '#ffd166'; g.strokeStyle = '#08140a'; g.lineWidth = Math.max(1, s * 0.1);
  g.beginPath(); g.arc(x, y, s * 0.32, 0, TAU); g.fill(); g.stroke();
}
// Unbekannte Überlebende zeigt die Minikarte erst aus der Nähe, gefundene immer
function drawPeople(g, at, s, near) {
  if (MODE !== 'story') return;
  for (const p of survivors) {
    if (p.state === 'saved' || (p.state === 'wait' && Math.hypot(p.pos.x - player.pos.x, p.pos.z - player.pos.z) > near)) continue;
    const [x, y] = at(p.pos.x, p.pos.z); iconSurvivor(g, x, y, s, p.state !== 'wait');
  }
  if (dog) { const [x, y] = at(dog.pos.x, dog.pos.z); g.fillStyle = '#c08a50'; g.beginPath(); g.arc(x, y, s * 0.2, 0, TAU); g.fill(); }
}
// Schnellreise zu Unterschlüpfen, die man schon kennt
function shelterKnown(i) { return i === 0 || i === SV.checkpoint || !!SV.seen[i]; }
function travelTo(i) {
  if (MODE !== 'story' || areaSt.some(s => s.active) || !shelterKnown(i)) return;
  $('map').hidden = true; $('shop').hidden = true;
  for (let k = monsters.length - 1; k >= 0; k--) if (monsters[k].roam || monsters[k].wa === -1) removeMonster(k);
  player.pos.set(SAFE[i].x - 1.5, 0, SAFE[i].z); player.yaw = 0; player.pitch = 0;
  bringFollowers();
  SV.checkpoint = i; lastArea = curArea(); SV.visited[lastArea] = 1; saveGame();
  GS = 'play'; resetInput(); setPlayUI(true); equipVM(SV.cur);
  const f = $('fade'); f.style.transition = 'none'; f.style.opacity = 1; requestAnimationFrame(() => { f.style.transition = ''; f.style.opacity = 0; });
  AU.play('dash'); showToast('Schnellreise', SHELTERS[i].name);
}
function renderTravel() {
  const fight = areaSt.some(s => s.active), here = safeIdx();
  $('mapTravel').hidden = MODE !== 'story';
  $('mapTravelList').innerHTML = SHELTERS.map((s, i) => shelterKnown(i) && i !== here ? `<button class="sbtn buy" data-go="${i}" ${fight ? 'disabled' : ''}>${s.name}</button>` : '').join('');
  $('mapTravelNote').textContent = fight ? 'Erst nach dem Kampf.' : 'Mara kennt sichere Wege zu jedem Unterschlupf, den du schon gefunden hast.';
}
// kleine Zeichen, mit dem Mittelpunkt bei (x, y)
function iconShelter(g, x, y, s) {
  g.fillStyle = '#f0ae4e'; g.strokeStyle = '#1a1206'; g.lineWidth = Math.max(1, s * 0.12);
  g.beginPath(); g.moveTo(x - s * 0.55, y); g.lineTo(x, y - s * 0.55); g.lineTo(x + s * 0.55, y); g.lineTo(x + s * 0.4, y); g.lineTo(x + s * 0.4, y + s * 0.5); g.lineTo(x - s * 0.4, y + s * 0.5); g.lineTo(x - s * 0.4, y); g.closePath(); g.fill(); g.stroke();
}
function iconNest(g, x, y, s, freed, t) {
  if (freed) {
    g.fillStyle = 'rgba(20,40,24,.9)'; g.beginPath(); g.arc(x, y, s * 0.55, 0, TAU); g.fill();
    g.strokeStyle = '#74d68e'; g.lineWidth = Math.max(1.5, s * 0.16); g.beginPath(); g.moveTo(x - s * 0.28, y); g.lineTo(x - s * 0.06, y + s * 0.22); g.lineTo(x + s * 0.3, y - s * 0.24); g.stroke();
    return;
  }
  const p = 1 + Math.sin(t * 4) * 0.12;
  g.fillStyle = 'rgba(176,44,255,.28)'; g.beginPath(); g.arc(x, y, s * 0.9 * p, 0, TAU); g.fill();
  g.fillStyle = '#b02cff'; g.strokeStyle = '#16061e'; g.lineWidth = Math.max(1, s * 0.1);
  g.beginPath(); g.arc(x, y, s * 0.5, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#16061e'; g.beginPath(); g.arc(x - s * 0.17, y - s * 0.05, s * 0.11, 0, TAU); g.arc(x + s * 0.17, y - s * 0.05, s * 0.11, 0, TAU); g.fill();
}
function iconPortal(g, x, y, s, t) {
  g.strokeStyle = '#d58bff'; g.lineWidth = Math.max(2, s * 0.2);
  g.beginPath(); g.arc(x, y, s * (0.5 + Math.sin(t * 3) * 0.06), 0, TAU); g.stroke();
  g.fillStyle = 'rgba(154,60,255,.45)'; g.beginPath(); g.arc(x, y, s * 0.42, 0, TAU); g.fill();
}
function iconPlayer(g, x, y, s, ang) {
  g.save(); g.translate(x, y); g.rotate(ang);
  g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = Math.max(1.2, s * 0.12);
  g.beginPath(); g.moveTo(0, -s * 0.6); g.lineTo(s * 0.42, s * 0.45); g.lineTo(0, s * 0.22); g.lineTo(-s * 0.42, s * 0.45); g.closePath(); g.fill(); g.stroke();
  g.restore();
}
function iconGoal(g, x, y, s, t) {
  g.strokeStyle = '#ffd166'; g.lineWidth = Math.max(1.5, s * 0.12);
  g.beginPath(); g.arc(x, y, s * (0.85 + Math.sin(t * 5) * 0.1), 0, TAU); g.stroke();
}

// ---------- Minikarte (dreht sich mit, oben ist immer vorne) ----------
function drawMini(dt) {
  miniT -= dt; if (miniT > 0) return; miniT = 0.05;
  const cv = $('mini'), size = cv.clientWidth; if (!size || !mapBase) return;
  const W = Math.round(size * Math.min(2, window.devicePixelRatio || 1)); if (cv.width !== W) cv.width = cv.height = W;
  const g = cv.getContext('2d'), R0 = W / 2, k = R0 / (MINI_R * MAP_S), px = player.pos.x, pz = player.pos.z, ya = player.yaw, t = clock;
  const cs = Math.cos(ya), sn = Math.sin(ya);
  const at = (x, z) => { const dx = (x - px) * MAP_S * k, dy = (z - pz) * MAP_S * k; return [R0 + dx * cs - dy * sn, R0 + dx * sn + dy * cs]; };
  g.save(); g.clearRect(0, 0, W, W);
  g.beginPath(); g.arc(R0, R0, R0 - 1, 0, TAU); g.clip();
  g.fillStyle = '#0b0c0b'; g.fillRect(0, 0, W, W);
  g.save(); g.translate(R0, R0); g.rotate(ya); g.scale(k, k); g.translate(-mapX(px), -mapY(pz)); g.drawImage(mapBase, 0, 0); g.restore();
  const s = W * 0.11;
  if (barrier && !barrier.open) { const [x1, y1] = at(WX(5, -21), WZ(5, -75)), [x2, y2] = at(WX(5, 21), WZ(5, -75)); g.strokeStyle = '#ff2238'; g.lineWidth = Math.max(2, W * 0.025); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
  const pp = at(WX(5, 0), WZ(5, -127)); iconPortal(g, pp[0], pp[1], s, t);
  for (const n of nests) if (n.a < 5) { const [x, y] = at(n.x, n.z); iconNest(g, x, y, s, !!SV.freed[n.a], t); }
  for (const sh of SAFE) { const [x, y] = at(sh.x + 4, sh.z); iconShelter(g, x, y, s); }
  drawPeople(g, at, s, 30);
  for (const m of monsters) {
    if (m.state === 'dead' || m.vis < 0.3) continue;
    const [x, y] = at(m.g.position.x, m.g.position.z);
    g.fillStyle = m.boss || m.mini ? '#ff4a57' : '#ff2a2a'; g.beginPath(); g.arc(x, y, (m.boss || m.mini ? 0.32 : 0.16) * s, 0, TAU); g.fill();
  }
  // Ziel: Ring auf der Karte oder Pfeil am Rand
  if (MODE === 'story') {
    const gp = goalPos(), [gx, gy] = at(gp.x, gp.z), dx = gx - R0, dy = gy - R0, d = Math.hypot(dx, dy);
    if (d < R0 - s) iconGoal(g, gx, gy, s, t);
    else { const ux = dx / d, uy = dy / d, r = R0 - s * 0.55; g.save(); g.translate(R0 + ux * r, R0 + uy * r); g.rotate(Math.atan2(uy, ux) + Math.PI / 2); g.fillStyle = '#ffd166'; g.strokeStyle = '#000'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, -s * 0.5); g.lineTo(s * 0.4, s * 0.3); g.lineTo(-s * 0.4, s * 0.3); g.closePath(); g.fill(); g.stroke(); g.restore(); }
  }
  // N zeigt nach oben auf der großen Karte
  const nx = sn, ny = -cs; g.font = `700 ${Math.round(s * 0.9)}px 'Barlow Condensed', sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = 'rgba(0,0,0,.6)'; g.beginPath(); g.arc(R0 + nx * (R0 - s * 0.7), R0 + ny * (R0 - s * 0.7), s * 0.55, 0, TAU); g.fill();
  g.fillStyle = '#ece2d2'; g.fillText('N', R0 + nx * (R0 - s * 0.7), R0 + ny * (R0 - s * 0.7) + 1);
  iconPlayer(g, R0, R0, s * 1.2, 0);
  g.restore();
}

// ---------- Große Karte ----------
function openMap(from) {
  if (from !== 'shop' && GS !== 'play') return;
  mapFrom = from || 'play';
  if (mapFrom === 'play') { resetInput(); AU.flame(false); flameOn = false; setPlayUI(false); }
  hideOverlays(); GS = 'map'; $('map').hidden = false;
  const [fc, fn] = secretCounts();
  $('mapInfo').textContent = MODE === 'endlos' ? 'Endlos-Modus: Die Monster kommen überall hin.' : `Nester zerstört: ${freedCount()} von 5 · Truhen ${fc} von ${CHEST_SPOTS.length} · Notizen ${fn} von ${NOTES.length} · Gerettet ${Object.keys(SV.rescued || {}).length} von ${SURVIVORS.length}`;
  const g = nextGoal();
  $('mapGoal').textContent = MODE === 'endlos' ? '' : g < 5 ? `Nächstes Ziel: das Nest im Gebiet ${g + 1} · ${AREAS[g].name}` : barrier.open ? 'Die Barriere ist gefallen. Auf zum Portal!' : '';
  renderTravel();
  requestAnimationFrame(drawBigMap);
}
function closeMap() {
  $('map').hidden = true;
  if (mapFrom === 'shop') { GS = 'shop'; $('shop').hidden = false; return; }
  GS = 'play'; setPlayUI(true);
}
function drawBigMap() {
  if (GS !== 'map') return;
  requestAnimationFrame(drawBigMap);
  const cv = $('mapCv'), cw = cv.clientWidth, ch = cv.clientHeight; if (!cw || !mapBase) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1), W = Math.round(cw * dpr), H = Math.round(ch * dpr);
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const g = cv.getContext('2d'), k = Math.min(W / MAP_W, H / MAP_H), ox = (W - MAP_W * k) / 2, oy = (H - MAP_H * k) / 2, t = performance.now() / 1000;
  const at = (x, z) => [ox + mapX(x) * k, oy + mapY(z) * k], s = Math.max(12, 9 * MAP_S * k);
  g.clearRect(0, 0, W, H);
  g.drawImage(mapBase, ox, oy, MAP_W * k, MAP_H * k);
  // noch nicht besuchte Gebiete liegen im Dunkeln
  REG.forEach((r, a) => {
    const [x, y] = at(r.cx - TILE / 2, r.cz - TILE / 2), w = TILE * MAP_S * k, seen = MODE === 'endlos' || SV.visited[a];
    if (!seen) { g.fillStyle = 'rgba(6,6,8,.62)'; g.fillRect(x, y, w, w); }
    g.strokeStyle = 'rgba(236,226,210,.18)'; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, w - 1, w - 1);
    // Name unten links (dort liegt kein Nest), höchstens bis kurz vor die Straße in der Mitte
    const name = `${a + 1} · ${AREAS[a].name}`, sub = a < 5 && SV.freed[a] ? 'befreit' : seen ? `Gefahr ${'●'.repeat(a + 1)}` : 'unerforscht';
    let fs = s * 1.05; g.font = `700 ${Math.round(fs)}px 'Barlow Condensed', sans-serif`;
    const fit = (w * 0.44 - s * 0.4) / g.measureText(name).width; if (fit < 1) { fs *= fit; g.font = `700 ${Math.round(fs)}px 'Barlow Condensed', sans-serif`; }
    g.textAlign = 'left'; g.textBaseline = 'bottom'; g.shadowColor = '#000'; g.shadowBlur = 4;
    g.fillStyle = seen ? '#ece2d2' : 'rgba(236,226,210,.55)'; g.fillText(name, x + s * 0.4, y + w - s * 0.4 - fs);
    g.font = `600 ${Math.round(fs * 0.8)}px 'Barlow Condensed', sans-serif`; g.fillStyle = seen ? (SV.freed[a] ? '#74d68e' : '#a39a8f') : 'rgba(163,154,143,.6)';
    g.fillText(sub, x + s * 0.4, y + w - s * 0.4);
    g.shadowBlur = 0;
  });
  if (barrier && !barrier.open) { const [x1, y1] = at(WX(5, -21), WZ(5, -75)), [x2] = at(WX(5, 21), 0); g.strokeStyle = '#ff2238'; g.lineWidth = Math.max(2, s * 0.25); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y1); g.stroke(); }
  const pp = at(WX(5, 0), WZ(5, -127)); iconPortal(g, pp[0], pp[1], s * 1.4, t);
  for (const n of nests) if (n.a < 5) { const [x, y] = at(n.x, n.z); iconNest(g, x, y, s * 1.3, !!SV.freed[n.a], t); }
  for (const sh of SAFE) { const [x, y] = at(sh.x + 4, sh.z); iconShelter(g, x, y, s * 1.2); }
  if (MODE === 'story') { const gp = goalPos(), [x, y] = at(gp.x, gp.z); iconGoal(g, x, y, s * 1.5, t); }
  drawPeople(g, at, s * 1.4, 0);
  const [px, py] = at(player.pos.x, player.pos.z); iconPlayer(g, px, py, s * 1.4, -player.yaw);
}

$('mini').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); AU.init(); openMap('play'); });
$('btnMapBack').onclick = closeMap;
$('mapTravelList').addEventListener('click', e => { const b = e.target.closest('button'); if (b && !b.disabled) travelTo(+b.dataset.go); });
$('btnMapS').onclick = () => openMap('shop');
