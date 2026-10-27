// Portalnacht – Maras Nebenaufgaben und seltene Waffenfarben
'use strict';
// Seltene Farben für die leuchtenden Verzierungen der Waffen (ersetzen die Stufenfarbe)
const SKINS = {
  gold: { name: 'Gold', hex: 0xffc23a },
  eis: { name: 'Eis', hex: 0x7fe8ff },
  lava: { name: 'Lava', hex: 0xff5a14 },
  gift: { name: 'Gift', hex: 0x7dff3a },
  regenbogen: { name: 'Regenbogen', hex: null },
};
// Aufgaben der Reihe nach; drei sind gleichzeitig offen. st = Zähler im Spielstand, n = wie viele
const QUESTS = [
  { text: 'Besiege 10 Kriecher', st: 'k_kriecher', n: 10, gold: 60 },
  { text: 'Lande 10 Kopftreffer', st: 'heads', n: 10, gold: 80 },
  { text: 'Finde 2 versteckte Truhen', st: 'chests', n: 2, gold: 100 },
  { text: 'Rette einen Überlebenden', st: 'rescued', n: 1, gold: 100 },
  { text: 'Besiege 15 Ghule', st: 'k_ghul', n: 15, gold: 120 },
  { text: 'Zerstöre ein Monsternest', st: 'nests', n: 1, gold: 150, skin: 'gold' },
  { text: 'Besiege 5 Monster mit Explosionen', st: 'k_expl', n: 5, gold: 150 },
  { text: 'Besiege 12 Spucker', st: 'k_spucker', n: 12, gold: 200 },
  { text: 'Weiche 25-mal aus', st: 'dashes', n: 25, gold: 120 },
  { text: 'Besiege 9 Krähen', st: 'k_kraehe', n: 9, gold: 180, skin: 'eis' },
  { text: 'Besiege 8 Platzer', st: 'k_platzer', n: 8, gold: 220 },
  { text: 'Besiege 5 Kolosse', st: 'k_koloss', n: 5, gold: 300 },
  { text: 'Rette 3 Überlebende', st: 'rescued', n: 3, gold: 300, skin: 'lava' },
  { text: 'Besiege 10 Schildträger', st: 'k_schild', n: 10, gold: 350 },
  { text: 'Zerstöre 3 Monsternester', st: 'nests', n: 3, gold: 400 },
  { text: 'Besiege 6 Schatten', st: 'k_schatten', n: 6, gold: 400, skin: 'gift' },
  { text: 'Besiege 10 Schreier', st: 'k_schreier', n: 10, gold: 400 },
  { text: 'Besiege 200 Monster', st: 'kills', n: 200, gold: 600, skin: 'regenbogen' },
];

// Zähler im Spielstand erhöhen (für die Aufgaben)
function stat(k, n) { SV.st = SV.st || {}; SV.st[k] = (SV.st[k] || 0) + (n == null ? 1 : n); questCheck(); }
function questFill() {
  if (!SV.quest) SV.quest = { next: 0, act: [], done: 0 };
  const q = SV.quest;
  while (q.act.length < 3 && q.next < QUESTS.length) { const d = QUESTS[q.next]; q.act.push({ q: q.next, s: (SV.st && SV.st[d.st]) || 0 }); q.next++; }
}
function questProg(a) { const d = QUESTS[a.q]; return Math.min(d.n, ((SV.st && SV.st[d.st]) || 0) - a.s); }
// Belohnung wächst mit dem gefährlichsten Gebiet, das man schon erreicht hat
function questGold(d) { return Math.round(d.gold * (1 + (SV.reached || 0) * 0.5) * diff().gold / 5) * 5; }
function questCheck() {
  questFill();
  const q = SV.quest;
  for (let i = q.act.length - 1; i >= 0; i--) {
    const a = q.act[i], d = QUESTS[a.q];
    if (questProg(a) < d.n) continue;
    q.act.splice(i, 1); q.done++;
    const gold = questGold(d); SV.money += gold; popGold(gold); AU.play('buy');
    let big = `+${fmt(gold)} Münzen`;
    if (d.skin) { SV.skins[d.skin] = 1; big = `Neue Waffenfarbe: ${SKINS[d.skin].name}`; }
    showToast(`Aufgabe geschafft: ${d.text}`, big);
    achAdd('quests');
  }
  questFill();
}

// ---------- Waffenfarbe ----------
const _skc = HAS_THREE ? new T.Color() : null;
// Farbe der Verzierungen: gewählte seltene Farbe oder die Farbe der Stufe
function accentHex(lv) {
  const s = SV.skin && SV.skins && SV.skins[SV.skin] && SKINS[SV.skin];
  if (!s) return LV_HEX[lv - 1];
  if (s.hex != null) return s.hex;
  return _skc.setHSL((clock * 0.15) % 1, 1, 0.55).getHex(); // Regenbogen wechselt langsam die Farbe
}

// ---------- Anzeige bei Mara ----------
function questCard(a) {
  const d = QUESTS[a.q], p = questProg(a);
  return `<div class="item"><div class="top"><h3>${d.text}</h3><span class="cat">Aufgabe</span></div><p class="stat">${p} von ${d.n}</p><span class="abar"><i style="transform:scaleX(${(p / d.n).toFixed(3)})"></i></span><p>Belohnung: ${fmt(questGold(d))} Münzen${d.skin ? ` und die Waffenfarbe ${SKINS[d.skin].name}` : ''}</p></div>`;
}
function skinCard() {
  const own = Object.keys(SKINS).filter(k => SV.skins && SV.skins[k]);
  const btn = (k, name) => `<button class="sbtn ${SV.skin === k ? 'eq' : 'buy'}" data-skin="${k}" ${SV.skin === k ? 'disabled' : ''}>${name}</button>`;
  return `<div class="item"><div class="top"><h3>Waffenfarbe</h3><span class="cat">${own.length} von ${Object.keys(SKINS).length}</span></div><p>${own.length ? 'Die Verzierungen deiner Waffen leuchten in dieser Farbe.' : 'Seltene Farben gibt es als Belohnung für manche Aufgaben.'}</p><div class="row">${btn('', 'Stufenfarbe')}${own.map(k => btn(k, SKINS[k].name)).join('')}</div></div>`;
}
function renderQuests() {
  questFill();
  const q = SV.quest, open = q.act.map(questCard).join('');
  return skinCard() + (open || `<div class="item"><h3>Alles erledigt</h3><p>Mara hat keine Aufgaben mehr für dich. ${q.done} geschafft!</p></div>`);
}
