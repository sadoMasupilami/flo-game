// Portalnacht – Grundlagen: Daten, Speicher, Ton, Renderer, Materialien, Partikel
'use strict';
const $ = id => document.getElementById(id);
const HAS_THREE = !!window.THREE;
if (!HAS_THREE) $('loadErr').hidden = false;
const T = window.THREE;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rand = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, t) => a + (b - a) * t;
const pick = a => a[(Math.random() * a.length) | 0];
const fmt = n => Math.floor(n).toLocaleString('de-DE');
const IS_TOUCH = matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window);

// Gleiche Welt bei jedem Start
let seed = 20261025;
function R() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const rr = (a, b) => a + R() * (b - a);
const rpick = a => a[(R() * a.length) | 0];

// ---------- Spieldaten ----------
const AREA_LEN = 130, HALF_W = 18.2, Z_MAX = 5.5, Z_MIN = -786, SAFE_R = 3.3, GOLD = 1.25;
const ZS = a => -a * AREA_LEN;
const AREAS = [
  { name: 'Der Hof', fog: 0x0b1110, dens: 0.05 },
  { name: 'Finsterwald', fog: 0x08100c, dens: 0.06 },
  { name: 'Das Dorf', fog: 0x0d0e13, dens: 0.05 },
  { name: 'Die Autobahn', fog: 0x110f13, dens: 0.042 },
  { name: 'Die Vorstadt', fog: 0x0f0c11, dens: 0.048 },
  { name: 'Stadtzentrum', fog: 0x170a16, dens: 0.036 },
];
const SHELTERS = [
  { name: 'Hof der Großeltern', sign: 'BAUERNHOF', color: 0x5a5148 },
  { name: 'Försterhütte', sign: 'FÖRSTEREI', color: 0x4a3a2a },
  { name: 'Feuerwehrhaus', sign: 'FEUERWEHR', color: 0x5a2a26 },
  { name: 'Raststätte', sign: 'RASTSTÄTTE', color: 0x4b4f55 },
  { name: 'Tankstelle', sign: 'TANKSTELLE', color: 0x55524a },
  { name: 'U-Bahn-Station', sign: 'U-BAHN', color: 0x3d4148 },
];
const SAFE = SHELTERS.map((s, i) => ({ x: 11.2, z: ZS(i) - 8, r: SAFE_R }));

const STORY = [
  { kicker: 'Funkspruch · 00:14 Uhr', title: 'Die Nacht, in der sie kamen', text: 'Im Radio knistert eine Stimme: Über dem Stadtzentrum hat sich ein Portal geöffnet. Monster strömen heraus und ziehen über das Land.\n\nDeine Großeltern sind am Abend in die Stadt gefahren und nicht zurückgekommen. Du nimmst Opas altes Holzschwert von der Wand.\n\nDer Weg führt über den Hof, durch den Finsterwald und das Dorf, über die Autobahn und durch die Vorstadt. Irgendwer muss dieses Portal schließen.' },
  { kicker: 'Försterhütte', title: 'Mara', text: 'In der Hütte sitzt eine Frau mit einem Rucksack voller Waffen. „Ich bin Mara. Ich handle mit allem, was gegen Monster hilft. Umsonst ist nichts.“\n\nSie zeigt auf deine Taschen. „Die Viecher lassen Münzen fallen. Frag mich nicht, warum.“\n\nNeu bei Mara: die Fähigkeit Bauer. Damit stellst du Kisten und später Steine auf, die dich schützen.' },
  { kicker: 'Feuerwehrhaus', title: 'Der rote Kreis', text: 'Das Feuerwehrhaus ist verbarrikadiert, aber die Hintertür ist offen. An der Wand hängt eine Karte. Jemand hat mit rotem Stift einen Kreis um das Stadtzentrum gemalt und daneben geschrieben: NICHT HINGEHEN.\n\nMara ist schon da. „Je näher du dem Portal kommst, desto stärker werden sie. Kauf klug.“\n\nNeu: die Fähigkeit Verstärker. Sie verdoppelt eine Zeit lang deinen Schaden.' },
  { kicker: 'Raststätte', title: 'Die Königin', text: 'Die Raststätte riecht nach kaltem Kaffee. Aus einem Funkgerät hörst du andere Überlebende: Die Monster gehorchen einer Königin. Sie sitzt im Portal und schickt immer mehr von ihnen.\n\n„Wer sie erledigt, schließt das Portal“, sagt Mara. „Hoffe ich jedenfalls.“\n\nNeu: die Fähigkeit Verbrenner. Was du triffst, fängt Feuer.' },
  { kicker: 'Tankstelle', title: 'Opas Mütze', text: 'Auf dem Boden der Tankstelle liegt Opas Mütze. Sie sind hier durchgekommen. Vielleicht leben sie noch.\n\nMara legt einen Raketenwerfer auf den Tresen. „Den wirst du brauchen.“\n\nNeu: die Fähigkeit Heiler.' },
  { kicker: 'U-Bahn-Station', title: 'Der letzte sichere Ort', text: 'Über den Hochhäusern pulsiert das Portal violett. Der Boden zittert.\n\n„Eine letzte Lieferung“, sagt Mara und schiebt dir einen Feuerwerfer hin. „Viel Glück. Ehrlich.“\n\nHinter der Station wartet die Monsterkönigin.' },
];
const WIN_TEXT = 'Die Monsterkönigin bricht zusammen. Das Portal zieht sich zu einem Punkt zusammen und erlischt mit einem Knall.\n\nIm ersten Morgenlicht kommen Menschen aus Kellern und U-Bahn-Schächten. Zwischen ihnen stehen deine Großeltern. Opa zeigt auf das Holzschwert an deinem Gürtel und grinst.';
const TRADER = [
  'Hier liegt noch Opas Werkzeugkiste. Ein paar Münzen und du kannst dir eine Steinschleuder basteln.',
  '„Schwerter, Bögen, was du willst“, sagt Mara. „Alles hat seinen Preis.“',
  '„Die Kampfaxt hält auch einen Koloss auf. Fast.“',
  '„Pistole oder Schrotflinte? Ich würde beides nehmen.“',
  '„Der Raketenwerfer macht Lärm. Das ist der Sinn der Sache.“',
  '„Letzte Chance. Danach kommt nur noch die Königin.“',
];

// Waffen: avail = ab welchem Unterschlupf Mara sie verkauft (Unterschlupf i liegt am Anfang von Gebiet i+1)
const WEAPONS = [
  { id: 'holz', kb: 3, name: 'Holzschwert', cat: 'Nahkampf', kind: 'melee', avail: 0, price: 0, up: [40, 90, 160], dmg: 15, rate: 1.8, range: 2.7, arc: 0.5 },
  { id: 'schleuder', kb: 1.5, name: 'Steinschleuder', cat: 'Fernkampf', kind: 'proj', avail: 0, price: 60, up: [50, 100, 170], dmg: 13, rate: 2.2, speed: 32, grav: 6, proj: 'stone' },
  { id: 'eisen', kb: 3.5, name: 'Eisenschwert', cat: 'Nahkampf', kind: 'melee', avail: 1, price: 180, up: [120, 220, 350], dmg: 29, rate: 1.9, range: 2.9, arc: 0.45 },
  { id: 'bogen', kb: 2, name: 'Bogen', cat: 'Fernkampf', kind: 'proj', avail: 1, price: 240, up: [150, 260, 400], dmg: 34, rate: 1.4, speed: 48, grav: 4, proj: 'arrow', pierce: 1 },
  { id: 'axt', kb: 6, name: 'Kampfaxt', cat: 'Nahkampf', kind: 'melee', avail: 2, price: 420, up: [260, 420, 640], dmg: 64, rate: 1.25, range: 3.1, arc: 0.25 },
  { id: 'armbrust', kb: 3.5, name: 'Armbrust', cat: 'Fernkampf', kind: 'proj', avail: 2, price: 560, up: [320, 520, 800], dmg: 72, rate: 1.1, speed: 66, grav: 1.5, proj: 'bolt', pierce: 3 },
  { id: 'pistole', kb: 1.2, name: 'Pistole', cat: 'Schusswaffe', kind: 'hitscan', avail: 3, price: 850, up: [480, 760, 1100], dmg: 36, rate: 4, spread: 0.012, pellets: 1, range: 70 },
  { id: 'schrot', kb: 6, name: 'Schrotflinte', cat: 'Schusswaffe', kind: 'hitscan', avail: 3, price: 1200, up: [650, 1000, 1500], dmg: 17, rate: 1.3, spread: 0.085, pellets: 8, range: 24 },
  { id: 'gewehr', kb: 0.7, name: 'Sturmgewehr', cat: 'Schusswaffe', kind: 'hitscan', avail: 4, price: 1900, up: [1000, 1500, 2200], dmg: 42, rate: 8, spread: 0.02, pellets: 1, range: 70 },
  { id: 'rakete', kb: 0, name: 'Raketenwerfer', cat: 'Schwere Waffe', kind: 'rocket', avail: 4, price: 3000, up: [1500, 2300, 3300], dmg: 380, rate: 0.7, speed: 28, splash: 4.5, proj: 'rocket' },
  { id: 'feuer', kb: 0, name: 'Feuerwerfer', cat: 'Schwere Waffe', kind: 'flame', avail: 5, price: 3800, up: [1800, 2700, 3800], dmg: 320, rate: 20, range: 7.5, cone: 0.88 },
];
const W_BY = Object.fromEntries(WEAPONS.map(w => [w.id, w]));
const DMG_L = [1, 1.4, 1.9, 2.6], RATE_L = [1, 1.08, 1.16, 1.25];

const ABILITIES = [
  { id: 'bauer', name: 'Bauer', avail: 1, price: 150, up: [180, 320, 520], cd: [14, 12, 10, 8],
    desc: lv => ['Stellt 1 Holzkiste vor dir auf.', 'Stellt 2 Holzkisten auf.', 'Stellt 3 Steinblöcke auf.', 'Stellt eine Mauer aus 5 Steinblöcken auf.'][lv - 1] },
  { id: 'verst', name: 'Verstärker', avail: 2, price: 450, up: [400, 650, 950], cd: [26, 23, 20, 17], dur: [6, 8, 10, 12],
    desc: lv => `Doppelter Schaden für ${[6, 8, 10, 12][lv - 1]} Sekunden.` },
  { id: 'brand', name: 'Verbrenner', avail: 3, price: 800, up: [600, 950, 1400], cd: [24, 21, 18, 15], dur: [8, 10, 12, 15],
    desc: lv => `${[8, 10, 12, 15][lv - 1]} Sekunden lang setzt jeder Treffer Gegner und Boden in Brand.` },
  { id: 'heil', name: 'Heiler', avail: 4, price: 1200, up: [800, 1200, 1700], cd: [30, 27, 24, 20], heal: [35, 50, 70, 100],
    desc: lv => `Heilt sofort ${[35, 50, 70, 100][lv - 1]} Leben.` },
];

// Monster
const MT = {
  kriecher: { name: 'Kriecher', hp: 28, spd: 4.1, dmg: 7, r: 0.55, range: 1.5, cd: 0.9, gold: 6, skin: 0x5a4a40, eye: 0xff2a2a, w: 1.0 },
  ghul: { name: 'Ghul', hp: 60, spd: 2.7, dmg: 12, r: 0.5, range: 1.75, cd: 1.15, gold: 9, skin: 0x56604f, eye: 0xffe08a, w: 1.0 },
  spucker: { name: 'Spucker', hp: 46, spd: 2.3, dmg: 10, r: 0.6, range: 13, cd: 2.4, gold: 12, skin: 0x4f5a3a, eye: 0x9cff5a, w: 0.55, ranged: true },
  koloss: { name: 'Koloss', hp: 210, spd: 1.9, dmg: 24, r: 1.0, range: 2.6, cd: 1.7, gold: 30, skin: 0x5a4038, eye: 0xff3b1f, w: 0.2 },
  schreier: { name: 'Schreier', hp: 40, spd: 6.0, dmg: 10, r: 0.45, range: 1.6, cd: 0.85, gold: 11, skin: 0x8a8780, eye: 0xe8f4ff, w: 0.6 },
  koenigin: { name: 'Die Monsterkönigin', hp: 1600, spd: 2.2, dmg: 30, r: 2.2, range: 5.5, cd: 2.2, gold: 0, skin: 0x2c1830, eye: 0xd25cff, w: 0 },
};
// Trefferkugeln: [Höhe, Radius, Kopf/Schwachstelle]
const HIT = {
  kriecher: [[0.42, 0.6, 0], [0.5, 0.3, 1]],
  ghul: [[0.5, 0.32, 0], [1.15, 0.42, 0], [1.68, 0.22, 1]],
  spucker: [[0.5, 0.3, 0], [1.0, 0.65, 0], [1.55, 0.2, 1]],
  koloss: [[1.0, 0.75, 0], [1.95, 0.85, 0], [2.72, 0.34, 1]],
  schreier: [[0.5, 0.25, 0], [1.25, 0.3, 0], [1.82, 0.22, 1]],
  koenigin: [[1.9, 2.1, 0], [3.9, 1.0, 0], [3.9, 0.55, 1], [5.4, 0.9, 1]],
};
const AREA_TYPES = [
  ['kriecher', 'ghul'],
  ['kriecher', 'ghul', 'spucker'],
  ['kriecher', 'ghul', 'spucker', 'koloss'],
  ['kriecher', 'ghul', 'spucker', 'koloss', 'schreier'],
  ['kriecher', 'ghul', 'spucker', 'koloss', 'schreier'],
  ['kriecher', 'ghul', 'spucker', 'koloss', 'schreier'],
];
const HPM = [1, 1.75, 2.9, 4.4, 6.4, 9.2], DMGM = [1, 1.2, 1.45, 1.7, 2.0, 2.3], GOLDM = [1, 1.6, 2.4, 3.4, 4.6, 6];
// Stufen-Farben: 1 neutral, 2 blau, 3 lila, 4 rot
const LV_HEX = [0xd8cfc0, 0x4d8dff, 0xb46bff, 0xff3b4a];
// Granaten
const GREN_MAX = 6, GREN_DMG = 140, GREN_R = 5;
const grenPrice = i => Math.round(40 * GOLDM[i] / 5) * 5;
// Höhe der Lebensleiste über dem Monster
const BAR_TOP = { kriecher: 1.0, ghul: 2.05, spucker: 1.9, koloss: 3.2, schreier: 2.2 };
// Schwierigkeitsgrade
const DIFF = {
  leicht: { name: 'Leicht', hp: 0.7, dmg: 0.6, gold: 1.2, regen: 10 },
  normal: { name: 'Normal', hp: 1, dmg: 1, gold: 1, regen: 6 },
  schwer: { name: 'Schwer', hp: 1.35, dmg: 1.4, gold: 0.9, regen: 3 },
};
function diff() { return DIFF[SV.diff] || DIFF.normal; }
// Zwischenbosse am Ende der Gebiete 1–5
const MINIS = [
  { name: 'Der Schlächter vom Hof', type: 'koloss', scale: 1.25, skin: 0x6a3a2a, hp: 3, abil: 'charge', every: 6 },
  { name: 'Die Spinnenmutter', type: 'kriecher', scale: 2.6, skin: 0x2a2228, hp: 14, abil: 'brood', every: 9 },
  { name: 'Der Glöckner', type: 'ghul', scale: 1.9, skin: 0x4a4a58, hp: 10, abil: 'slam', every: 5 },
  { name: 'Der Brummi', type: 'koloss', scale: 1.6, skin: 0x3a4a5a, hp: 4, abil: 'charge', every: 5 },
  { name: 'Die Hexe der Vorstadt', type: 'spucker', scale: 1.8, skin: 0x3a2a4a, hp: 12, abil: 'volley', every: 2.6 },
];

// ---------- Speicher ----------
const SAVE_KEY = 'portalnacht.save.v1', OPT_KEY = 'portalnacht.opts.v1';
function lsGet(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { } }
function freshSave() { return { money: 0, weapons: { holz: 1 }, cur: 'holz', abil: {}, checkpoint: 0, seen: {}, kills: 0, deaths: 0, time: 0, won: false, gren: 2, diff: 'normal' }; }
let SV = freshSave();
const OPT = Object.assign({ sens: 1, sound: true, music: true, vib: true, nums: true, gfx: 'auto', btn: 'normal', aim: 'normal' }, lsGet(OPT_KEY) || {});
function saveGame() { lsSet(SAVE_KEY, SV); }
function hasSave() { const s = lsGet(SAVE_KEY); return !!(s && s.weapons); }
function loadGame() { const s = lsGet(SAVE_KEY); if (s && s.weapons) { SV = Object.assign(freshSave(), s); return true; } return false; }
function saveOpts() { lsSet(OPT_KEY, OPT); }

// ---------- Ton (alles synthetisch) ----------
const AU = {
  ctx: null, out: null, nb: null, last: {}, flameG: null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
      const c = new C(); this.ctx = c;
      this.out = c.createGain(); this.out.gain.value = OPT.sound ? 0.8 : 0;
      const comp = c.createDynamicsCompressor(); this.out.connect(comp); comp.connect(c.destination);
      const len = c.sampleRate, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.nb = b; this.ambient(); this.flameLoop(); startMusic();
    } catch (e) { this.ctx = null; }
  },
  setOn(on) { if (this.out) this.out.gain.setTargetAtTime(on ? 0.8 : 0, this.ctx.currentTime, 0.05); },
  noise(t, dur, f0, f1, vol, type, q) {
    const c = this.ctx, s = c.createBufferSource(); s.buffer = this.nb; s.loop = true;
    const f = c.createBiquadFilter(); f.type = type || 'lowpass'; f.Q.value = q || 0.8;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.out); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  },
  tone(t, type, f0, f1, dur, vol) {
    const c = this.ctx, o = c.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.out); o.start(t); o.stop(t + dur + 0.05);
  },
  play(n, gap) {
    if (!this.ctx || !OPT.sound) return;
    const t = this.ctx.currentTime; if (this.last[n] && t - this.last[n] < (gap || 0.04)) return; this.last[n] = t;
    switch (n) {
      case 'swing': this.noise(t, 0.18, 2400, 500, 0.25, 'bandpass', 1.2); break;
      case 'thud': this.noise(t, 0.12, 900, 120, 0.5); this.tone(t, 'sine', 140, 50, 0.12, 0.4); break;
      case 'pistol': this.noise(t, 0.14, 4000, 300, 0.6); this.tone(t, 'square', 220, 60, 0.06, 0.15); break;
      case 'shotgun': this.noise(t, 0.32, 3000, 150, 0.9); this.tone(t, 'sine', 120, 40, 0.2, 0.5); break;
      case 'rifle': this.noise(t, 0.09, 5000, 400, 0.45); break;
      case 'sling': this.tone(t, 'triangle', 420, 160, 0.12, 0.25); break;
      case 'bow': this.tone(t, 'triangle', 300, 110, 0.16, 0.3); this.noise(t, 0.12, 3000, 1500, 0.12, 'highpass'); break;
      case 'rocket': this.noise(t, 0.6, 600, 2400, 0.35, 'bandpass', 0.7); break;
      case 'boom': this.noise(t, 1.1, 1600, 60, 1.0); this.tone(t, 'sine', 90, 30, 0.8, 0.7); break;
      case 'hitm': this.noise(t, 0.08, 1400, 300, 0.25); break;
      case 'die': this.tone(t, 'sawtooth', 180, 50, 0.45, 0.16); this.noise(t, 0.3, 800, 100, 0.3); break;
      case 'growl': { const f = rand(55, 90); this.tone(t, 'sawtooth', f, f * 0.7, 0.7, 0.1); this.noise(t, 0.6, 500, 200, 0.12, 'bandpass', 2); } break;
      case 'spit': this.noise(t, 0.25, 1800, 400, 0.3, 'bandpass', 3); break;
      case 'hurt': this.tone(t, 'sine', 160, 60, 0.25, 0.5); this.noise(t, 0.2, 600, 100, 0.4); break;
      case 'coin': this.tone(t, 'sine', 1320, 1320, 0.08, 0.1); this.tone(t + 0.07, 'sine', 1760, 1760, 0.12, 0.1); break;
      case 'buy': this.tone(t, 'triangle', 660, 660, 0.1, 0.2); this.tone(t + 0.08, 'triangle', 990, 990, 0.18, 0.2); break;
      case 'deny': this.tone(t, 'square', 140, 120, 0.12, 0.1); break;
      case 'build': this.noise(t, 0.25, 700, 150, 0.6); this.tone(t, 'sine', 110, 70, 0.2, 0.4); break;
      case 'amp': this.tone(t, 'sawtooth', 110, 440, 0.5, 0.15); break;
      case 'ignite': this.noise(t, 0.6, 400, 2000, 0.4, 'bandpass', 0.6); break;
      case 'heal': this.tone(t, 'sine', 520, 780, 0.4, 0.2); this.tone(t + 0.1, 'sine', 780, 1040, 0.4, 0.15); break;
      case 'wave': this.tone(t, 'sawtooth', 70, 55, 1.2, 0.14); this.tone(t, 'sawtooth', 73, 57, 1.2, 0.11); break;
      case 'clear': this.tone(t, 'triangle', 440, 440, 0.2, 0.18); this.tone(t + 0.15, 'triangle', 660, 660, 0.35, 0.18); break;
      case 'death': this.tone(t, 'sine', 200, 40, 1.4, 0.5); break;
      case 'roar': this.tone(t, 'sawtooth', 60, 35, 1.6, 0.3); this.noise(t, 1.4, 700, 150, 0.4, 'bandpass', 1.5); break;
      case 'break': this.noise(t, 0.3, 1200, 200, 0.5, 'bandpass', 1); break;
      case 'throw': this.noise(t, 0.22, 600, 2200, 0.25, 'bandpass', 1.5); break;
      case 'tick': this.tone(t, 'square', 1800, 1800, 0.03, 0.06); break;
      case 'dash': this.noise(t, 0.25, 400, 3000, 0.35, 'bandpass', 1.2); break;
    }
  },
  ambient() {
    const c = this.ctx, g = c.createGain(); g.gain.value = 0.05; g.connect(this.out);
    [41, 43.6, 61.7].forEach(f => { const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.connect(g); o.start(); });
    const s = c.createBufferSource(); s.buffer = this.nb; s.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 400; f.Q.value = 0.6;
    const wg = c.createGain(); wg.gain.value = 0.035; s.connect(f); f.connect(wg); wg.connect(this.out); s.start();
    const lfo = c.createOscillator(); lfo.frequency.value = 0.07; const lg = c.createGain(); lg.gain.value = 250; lfo.connect(lg); lg.connect(f.frequency); lfo.start();
  },
  flameLoop() {
    const c = this.ctx, s = c.createBufferSource(); s.buffer = this.nb; s.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.5;
    const g = c.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(this.out); s.start(); this.flameG = g;
  },
  flame(on) { if (this.flameG) this.flameG.gain.setTargetAtTime(on ? 0.35 : 0, this.ctx.currentTime, 0.04); },
};

// ---------- Renderer & Szene ----------
const canvas = $('c');
let renderer, scene, camera, hemi, moonLight, flashLight, muzzleLight, boomLight;
let pixelRatio = Math.min(window.devicePixelRatio || 1, IS_TOUCH ? 1.25 : 1.5);
const PU = { uScale: { value: 600 }, uFogD: { value: 0.04 }, uFogC: { value: null } };
const G = {};
if (HAS_THREE) {
  renderer = new T.WebGLRenderer({ canvas, antialias: !IS_TOUCH, powerPreference: 'high-performance' });
  renderer.setPixelRatio(pixelRatio);
  scene = new T.Scene();
  scene.fog = new T.FogExp2(AREAS[5].fog, AREAS[5].dens);
  scene.background = new T.Color(AREAS[5].fog);
  PU.uFogC.value = scene.fog.color;
  camera = new T.PerspectiveCamera(72, 1, 0.05, 90); camera.rotation.order = 'YXZ'; scene.add(camera);
  hemi = new T.HemisphereLight(0x5a6a84, 0x16120e, 0.85); scene.add(hemi);
  moonLight = new T.DirectionalLight(0x8a98b8, 0.45); moonLight.position.set(-30, 50, 20); scene.add(moonLight);
  flashLight = new T.SpotLight(0xfff0d4, 2.6, 42, 0.58, 0.6, 1.1); flashLight.position.set(0.15, -0.1, 0);
  flashLight.target.position.set(0, -0.05, -1); camera.add(flashLight); camera.add(flashLight.target);
  muzzleLight = new T.PointLight(0xffb060, 0, 12, 2); muzzleLight.position.set(0.3, -0.2, -0.9); camera.add(muzzleLight);
  boomLight = new T.PointLight(0xff7a30, 0, 20, 2); scene.add(boomLight);

  G.box = new T.BoxGeometry(1, 1, 1);
  G.plane = new T.PlaneGeometry(1, 1);
  G.cyl = new T.CylinderGeometry(0.5, 0.5, 1, 10);
  G.cyl6 = new T.CylinderGeometry(0.5, 0.5, 1, 6);
  G.trunk = new T.CylinderGeometry(0.35, 0.5, 1, 6);
  G.sph = new T.SphereGeometry(0.5, 12, 10);
  G.sphLo = new T.SphereGeometry(0.5, 7, 5);
  G.cone = new T.ConeGeometry(0.5, 1, 8);
  G.disc = new T.CircleGeometry(0.5, 20); G.disc.rotateX(-Math.PI / 2);
  G.ring = new T.RingGeometry(0.42, 0.5, 40); G.ring.rotateX(-Math.PI / 2);
  const sh = new T.Shape(); sh.moveTo(-0.5, 0); sh.lineTo(0.5, 0); sh.lineTo(0, 1); sh.lineTo(-0.5, 0);
  G.prism = new T.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: false }); G.prism.translate(0, 0, -0.5);
}

// Materialien (gecacht)
const MC = new Map();
function mat(c, o) {
  o = o || {};
  const key = [c, o.e || 0, o.ei || 1, o.basic ? 1 : 0, o.fog === false ? 0 : 1, o.op == null ? 1 : o.op, o.add ? 1 : 0, o.sh || 6, o.map ? o.map.uuid : '', o.flat ? 1 : 0].join('|');
  let m = MC.get(key); if (m) return m;
  if (o.basic) {
    m = new T.MeshBasicMaterial({ color: c, fog: o.fog !== false, transparent: o.op != null || !!o.add, opacity: o.op == null ? 1 : o.op, map: o.map || null });
    if (o.add) { m.blending = T.AdditiveBlending; m.depthWrite = false; }
  } else {
    m = new T.MeshPhongMaterial({ color: c, shininess: o.sh || 6, specular: 0x111111, emissive: o.e || 0, emissiveIntensity: o.ei || 1, map: o.map || null, flatShading: !!o.flat });
  }
  MC.set(key, m); return m;
}

// Canvas-Texturen
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.anisotropy = 4; return t; }
function repTex(t, x, y) { const n = t.clone(); n.needsUpdate = true; n.wrapS = n.wrapT = T.RepeatWrapping; n.repeat.set(x, y); return n; }
const TEX = {};
if (HAS_THREE) {
  TEX.noise = canvasTex(128, 128, (g, w, h) => { const d = g.createImageData(w, h); for (let i = 0; i < w * h; i++) { const v = 140 + Math.random() * 115 | 0; d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v; d.data[i * 4 + 3] = 255; } g.putImageData(d, 0, 0); });
  TEX.glow = canvasTex(128, 128, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
  TEX.win = canvasTex(128, 256, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); for (let y = 0; y < 16; y++) for (let x = 0; x < 8; x++) { const r = Math.random(); g.fillStyle = r < 0.12 ? '#f5c46a' : r < 0.17 ? '#bcd0ff' : r < 0.19 ? '#ff5a5a' : '#101216'; g.fillRect(x * 16 + 4, y * 16 + 4, 8, 9); } });
  TEX.crate = canvasTex(64, 64, (g) => { g.fillStyle = '#6b4a2b'; g.fillRect(0, 0, 64, 64); g.strokeStyle = '#3a2614'; g.lineWidth = 3; for (let y = 0; y < 64; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(64, y); g.stroke(); } g.lineWidth = 6; g.strokeRect(3, 3, 58, 58); g.beginPath(); g.moveTo(4, 4); g.lineTo(60, 60); g.stroke(); });
  TEX.stone = canvasTex(64, 64, (g) => { g.fillStyle = '#6a6a68'; g.fillRect(0, 0, 64, 64); for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '20,20,20' : '200,200,190'},${Math.random() * 0.25})`; g.fillRect(Math.random() * 64, Math.random() * 64, 3, 3); } g.strokeStyle = '#2a2a2a'; g.lineWidth = 2; g.beginPath(); g.moveTo(10, 0); g.lineTo(22, 30); g.lineTo(14, 64); g.stroke(); });
  TEX.barrier = canvasTex(128, 64, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(255,${40 + Math.random() * 60 | 0},${60 + Math.random() * 40 | 0},${0.3 + Math.random() * 0.6})`; g.lineWidth = 1 + Math.random() * 3; g.beginPath(); let x = Math.random() * w; g.moveTo(x, 0); for (let y = 0; y <= h; y += 8) { x += rand(-6, 6); g.lineTo(x, y); } g.stroke(); } });
  TEX.swirl = canvasTex(256, 256, (g, w) => { const c = w / 2; const gr = g.createRadialGradient(c, c, 0, c, c, c); gr.addColorStop(0, 'rgba(255,220,255,1)'); gr.addColorStop(0.25, 'rgba(190,80,255,.9)'); gr.addColorStop(0.8, 'rgba(60,0,120,.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); g.translate(c, c); for (let a = 0; a < 5; a++) { g.rotate(TAU / 5); g.strokeStyle = 'rgba(255,190,255,.55)'; g.lineWidth = 5; g.beginPath(); for (let t = 0; t < 1; t += 0.02) { const r = t * c * 0.95, an = t * 5; g.lineTo(Math.cos(an) * r, Math.sin(an) * r); } g.stroke(); } });
}
function signTex(top, sub, bg, fg) {
  return canvasTex(512, 128, (g, w, h) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'bold 54px Arial, sans-serif'; g.fillText(top, w / 2, sub ? 52 : h / 2); if (sub) { g.font = 'bold 26px Arial, sans-serif'; g.fillText(sub, w / 2, 98); } });
}

// ---------- Partikel ----------
const P_VS = 'attribute vec4 aCol; attribute float aSize; uniform float uScale; uniform float uFogD; varying vec4 vCol; varying float vFog;\nvoid main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*mv; float d=-mv.z; gl_PointSize=clamp(aSize*uScale/max(d,0.2),0.0,180.0); vCol=aCol; float f=uFogD*d; vFog=clamp(1.0-exp(-f*f),0.0,1.0); }';
const P_FS_N = 'uniform vec3 uFogC; varying vec4 vCol; varying float vFog;\nvoid main(){ vec2 p=gl_PointCoord-0.5; float r=length(p); if(r>0.5) discard; float a=vCol.a*smoothstep(0.5,0.15,r); gl_FragColor=vec4(mix(vCol.rgb,uFogC,vFog),a); }';
const P_FS_A = 'varying vec4 vCol; varying float vFog;\nvoid main(){ vec2 p=gl_PointCoord-0.5; float r=length(p); if(r>0.5) discard; float a=vCol.a*smoothstep(0.5,0.0,r)*(1.0-vFog); gl_FragColor=vec4(vCol.rgb*a,1.0); }';
class PSys {
  constructor(n, add, noFog) {
    this.n = n; this.i = 0; this.dirty = true;
    const f = k => new Float32Array(n * k);
    this.p = f(3); this.c = f(4); this.s = f(1); this.v = f(3); this.l = f(1); this.m = f(1); this.g = f(1); this.s0 = f(1); this.a0 = f(1); this.gr = f(1); this.dr = f(1);
    const geo = new T.BufferGeometry();
    this.pa = new T.BufferAttribute(this.p, 3); this.ca = new T.BufferAttribute(this.c, 4); this.sa = new T.BufferAttribute(this.s, 1);
    [this.pa, this.ca, this.sa].forEach(a => a.setUsage(T.DynamicDrawUsage));
    geo.setAttribute('position', this.pa); geo.setAttribute('aCol', this.ca); geo.setAttribute('aSize', this.sa);
    this.mat = new T.ShaderMaterial({ uniforms: { uScale: PU.uScale, uFogD: noFog ? { value: 0 } : PU.uFogD, uFogC: PU.uFogC }, vertexShader: P_VS, fragmentShader: add ? P_FS_A : P_FS_N, transparent: true, depthWrite: false, blending: add ? T.AdditiveBlending : T.NormalBlending });
    this.pts = new T.Points(geo, this.mat); this.pts.frustumCulled = false; scene.add(this.pts);
  }
  emit(x, y, z, vx, vy, vz, life, r, g, b, size, grav, grow, drag, a) {
    const i = this.i; this.i = (i + 1) % this.n; const i3 = i * 3, i4 = i * 4;
    this.p[i3] = x; this.p[i3 + 1] = y; this.p[i3 + 2] = z; this.v[i3] = vx; this.v[i3 + 1] = vy; this.v[i3 + 2] = vz;
    this.l[i] = life; this.m[i] = life; this.c[i4] = r; this.c[i4 + 1] = g; this.c[i4 + 2] = b;
    this.a0[i] = a == null ? 1 : a; this.c[i4 + 3] = this.a0[i]; this.s0[i] = size; this.s[i] = size;
    this.g[i] = grav || 0; this.gr[i] = grow || 0; this.dr[i] = drag || 0; this.dirty = true;
  }
  update(dt) {
    if (!this.dirty) return;
    let any = false; const p = this.p, v = this.v;
    for (let i = 0; i < this.n; i++) {
      if (this.l[i] <= 0) continue;
      any = true; const L = this.l[i] - dt; this.l[i] = L;
      if (L <= 0) { this.s[i] = 0; this.c[i * 4 + 3] = 0; continue; }
      const i3 = i * 3, dr = this.dr[i];
      if (dr > 0) { const k = Math.max(0, 1 - dr * dt); v[i3] *= k; v[i3 + 1] *= k; v[i3 + 2] *= k; }
      v[i3 + 1] -= this.g[i] * dt;
      p[i3] += v[i3] * dt; p[i3 + 1] += v[i3 + 1] * dt; p[i3 + 2] += v[i3 + 2] * dt;
      if (p[i3 + 1] < 0.03 && this.g[i] > 0) { p[i3 + 1] = 0.03; v[i3] *= 0.3; v[i3 + 1] = 0; v[i3 + 2] *= 0.3; }
      const t = L / this.m[i];
      this.c[i * 4 + 3] = this.a0[i] * Math.min(1, t * 1.6);
      this.s[i] = this.s0[i] * (1 + this.gr[i] * (1 - t));
    }
    this.pa.needsUpdate = true; this.ca.needsUpdate = true; this.sa.needsUpdate = true;
    this.dirty = any;
  }
}
let PB, PF, PS, PG; // Blut, Feuer, Rauch, Leuchten
if (HAS_THREE) { PB = new PSys(700, false); PF = new PSys(900, true); PS = new PSys(300, false); PG = new PSys(500, true); }

function bloodBurst(x, y, z, n, power) {
  power = power || 1;
  for (let i = 0; i < n; i++) PB.emit(x, y, z, rand(-1.6, 1.6) * power, rand(0.5, 3.2) * power, rand(-1.6, 1.6) * power, rand(0.5, 1.0), rand(0.38, 0.55), 0.02, 0.03, rand(0.06, 0.15), 9.8, 0, 0.5);
}
function fireBurst(x, y, z, n, spread) {
  spread = spread || 0.4;
  for (let i = 0; i < n; i++) PF.emit(x + rand(-spread, spread), y + rand(-0.1, 0.3), z + rand(-spread, spread), rand(-0.4, 0.4), rand(1.2, 2.6), rand(-0.4, 0.4), rand(0.35, 0.7), 1, rand(0.35, 0.6), 0.12, rand(0.25, 0.5), -0.5, -0.6, 1);
}
function smokePuff(x, y, z, n, col) {
  col = col || 0.22;
  for (let i = 0; i < n; i++) PS.emit(x + rand(-0.4, 0.4), y + rand(0, 0.4), z + rand(-0.4, 0.4), rand(-0.6, 0.6), rand(0.6, 1.6), rand(-0.6, 0.6), rand(0.8, 1.6), col, col, col * 1.05, rand(0.5, 0.9), -0.2, 2.2, 1.2, 0.5);
}
function sparks(x, y, z, n, r, g, b) {
  for (let i = 0; i < n; i++) PG.emit(x, y, z, rand(-3, 3), rand(0.5, 4), rand(-3, 3), rand(0.2, 0.5), r, g, b, rand(0.05, 0.12), 9, 0, 1);
}
