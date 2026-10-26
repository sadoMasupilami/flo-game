// Portalnacht – Geheimnisse: versteckte Truhen und Opas Notizen
'use strict';
const NOTES = [
  { title: 'Medikamente', text: 'Hilde und ich fahren nur kurz in die Stadt, Medikamente holen. Das Licht über den Hochhäusern gefällt mir nicht. Lila. Wie ein Bluterguss am Himmel.\n\nFalls du früher zurück bist: Das Holzschwert hängt an der Wand. Nur für den Fall.' },
  { title: 'Im Wald', text: 'Der Wagen ist im Wald liegengeblieben. Etwas hat die Reifen zerfetzt. Wir gehen zu Fuß weiter.\n\nIm Unterholz liegen Eier, so groß wie Kürbisse. Was auch immer die gelegt hat: Ich will es nicht kennenlernen.' },
  { title: 'Die Glocke', text: 'Die Kirchenglocke hat um drei Uhr nachts geläutet. Niemand hat am Seil gezogen. Wir haben uns im Feuerwehrhaus versteckt, bis es aufgehört hat.\n\nHilde sagt, Glocken läuten nicht von allein. Hilde hat recht.' },
  { title: 'Stau', text: 'Auf der Autobahn stehen hunderte Autos. Die Leute sind weg, nur die Lichter brennen noch. Ich glaube, die Monster bringen alle zum Portal.\n\nHilde sagt, ich soll weniger schreiben und mehr laufen.' },
  { title: 'Eine Frau namens Mara', text: 'Meine Mütze liegt noch in der Tankstelle. Egal. Eine Frau namens Mara hat uns Wasser gegeben. Sie sagt, unser Enkel sei schon unterwegs.\n\nWoher weiß sie das? Und warum hat sie so viele Waffen?' },
  { title: 'Das Leuchten', text: 'Wir sind im U-Bahn-Schacht. Dunkel, aber sicher. Über uns schreit etwas, das größer ist als ein Haus.\n\nIch habe sie gesehen. Wenn du kommst: Ziel auf das Leuchten in ihrer Brust und auf den Kopf. Da tut es ihr weh.' },
];
// Verstecke je Gebiet: [Gebiet, x, z relativ zum Gebietsanfang]
const CHEST_SPOTS = [[0, -17, -55], [0, 16.6, -112], [1, -17.3, -73], [1, 15.8, -100], [2, -16.5, -40], [2, 17, -101], [3, -17.4, -82], [3, 17.3, -30], [4, 16.6, -75], [4, -17.2, -110], [5, -17, -46], [5, 17, -92]];
const NOTE_SPOTS = [[0, -13.3, -63.5], [1, -13.6, -70], [2, -5, -61], [3, 12.5, -88], [4, 13.6, -71], [5, -15, -22]];
const chests = [], notes = [];

// nächster freier Platz in der Nähe (falls dort etwas steht)
function freeSpot(x, z) {
  for (let r = 0; r < 4; r += 0.5) for (let a = 0; a < TAU; a += 0.8) {
    const px = clamp(x + Math.cos(a) * r, -17.4, 17.4), pz = z + Math.sin(a) * r;
    if (!blockedAt(px, pz, 0.6) && !inSafe(px, pz, 2)) return [px, pz];
  }
  return [x, z];
}
function buildSecrets() {
  const wood = tmat('wood', 0xa87448, 1, 1), band = mat(0x2e2e32, { sh: 50 }), brass = mat(0xc8a050, { sh: 80 });
  CHEST_SPOTS.forEach(([a, x0, dz], i) => {
    const [x, z] = freeSpot(x0, ZS(a) + dz), g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2; scene.add(g);
    part(g, G.box, wood, 0, 0.25, 0, 0.9, 0.5, 0.6);
    for (const bx of [-0.3, 0.3]) part(g, G.box, band, bx, 0.25, 0, 0.06, 0.52, 0.62);
    const lid = pivot(g, 0, 0.5, -0.3);
    part(lid, G.box, wood, 0, 0.08, 0.3, 0.92, 0.16, 0.62); for (const bx of [-0.3, 0.3]) part(lid, G.box, band, bx, 0.08, 0.3, 0.06, 0.18, 0.64);
    part(lid, G.box, brass, 0, 0.0, 0.62, 0.1, 0.12, 0.04);
    g.traverse(o => { o.castShadow = true; });
    solid(x, z, 0.8, 0.8, 0.6);
    chests.push({ id: 'c' + i, a, g, lid, x, z, anim: 0 });
  });
  const paper = new T.MeshPhongMaterial({ color: 0xe8dcc0, emissive: 0x2a2416, side: T.DoubleSide, shininess: 2 });
  NOTE_SPOTS.forEach(([a, x0, dz], i) => {
    const [x, z] = freeSpot(x0, ZS(a) + dz);
    const g = new T.Group(); g.position.set(x, 0, z); scene.add(g);
    part(g, G.sphLo, MATS.rock, 0, 0.08, 0, 0.35, 0.16, 0.3);
    const p = part(g, G.plane, paper, 0.05, 0.17, 0.02, 0.32, 0.42, 1); p.rotation.set(-Math.PI / 2 + 0.15, 0, 0.4);
    const glow = glowDisc(x, z, 0.9, 0xffe0a0, 0.25);
    notes.push({ id: 'n' + i, i, g, glow, x, z });
  });
}
function secretCounts() { return [Object.keys(SV.chests || {}).length, Object.keys(SV.notes || {}).length]; }
// nach Laden oder Neustart: schon gefundene Geheimnisse richtig zeigen
function syncSecrets() {
  SV.chests = SV.chests || {}; SV.notes = SV.notes || {};
  for (const c of chests) { const open = !!SV.chests[c.id]; c.lid.rotation.x = open ? -1.9 : 0; c.anim = 0; }
  for (const n of notes) { const got = !!SV.notes[n.id]; n.g.visible = !got; n.glow.opacity = got ? 0 : 0.25; }
}
function openChest(c) {
  SV.chests[c.id] = 1; c.anim = 0.01;
  const gold = Math.round(60 * GOLDM[c.a] * GOLD * diff().gold);
  SV.money += gold; popGold(gold); AU.play('buy'); AU.play('coin');
  for (let i = 0; i < 24; i++) PG.emit(c.x + rand(-0.3, 0.3), 0.6, c.z + rand(-0.3, 0.3), rand(-1.5, 1.5), rand(1.5, 4), rand(-1.5, 1.5), rand(0.6, 1), 1, 0.8, 0.3, rand(0.05, 0.1), 7, 0, 0, 1);
  showMsg(`Truhe gefunden! +${gold} Münzen`);
  achMax('chests', secretCounts()[0]); saveGame();
}
function readNote(n) {
  SV.notes[n.id] = 1; n.g.visible = false; n.glow.opacity = 0;
  achMax('notes', secretCounts()[1]); saveGame();
  AU.play('buy'); resetInput(); setPlayUI(false);
  const N = NOTES[n.i];
  showStory({ kicker: `Opas Notiz ${n.i + 1} von ${NOTES.length}`, title: N.title, text: N.text }, () => { GS = 'play'; setPlayUI(true); });
}
function updateSecrets(dt, t) {
  const px = player.pos.x, pz = player.pos.z;
  for (const c of chests) {
    if (c.anim > 0 && c.anim < 1) { c.anim = Math.min(1, c.anim + dt * 2.2); c.lid.rotation.x = -1.9 * (1 - Math.pow(1 - c.anim, 3)); }
    if (SV.chests[c.id]) continue;
    const d = Math.hypot(px - c.x, pz - c.z);
    if (d < 1.5) openChest(c);
    else if (d < 14 && Math.random() < dt * 3) PG.emit(c.x + rand(-0.4, 0.4), rand(0.4, 0.8), c.z + rand(-0.3, 0.3), 0, 0.5, 0, 0.8, 1, 0.85, 0.4, 0.05, 0, 0, 0, 0.9);
  }
  for (const n of notes) {
    if (SV.notes[n.id]) continue;
    n.glow.opacity = 0.18 + Math.sin(t * 3 + n.i) * 0.08;
    if (Math.hypot(px - n.x, pz - n.z) < 1.4 && GS === 'play') { readNote(n); break; }
  }
}
