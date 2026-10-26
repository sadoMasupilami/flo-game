// Portalnacht – Musik: kleiner Sequenzer, alles live mit Web Audio erzeugt
'use strict';
const SC = {
  moll: [0, 2, 3, 5, 7, 8, 10], harm: [0, 2, 3, 5, 7, 8, 11], phryg: [0, 1, 3, 5, 7, 8, 10],
  lokr: [0, 1, 3, 5, 6, 8, 10], dur: [0, 2, 4, 5, 7, 9, 11],
};
const _ = null;
// Ein Takt hat 16 Schritte. pad: Grundton des Akkords je Takt (Stufe der Tonleiter).
// bass.p: 16 Schritte relativ zum Akkord; lead.p: beliebig lang, absolute Stufen.
// dr: Schlagzeug ('x' = Schlag); intense = nur während einer Welle.
const THEMES = {
  menu: { bpm: 56, root: 45, sc: SC.moll, pad: [0, 5, 3, 4],
    lead: { w: 'sine', o: 1, v: 0.05, len: 6, p: [7, _, _, _, _, _, _, _, 6, _, _, _, _, _, 4, _, 5, _, _, _, _, _, _, _, 4, _, _, _, 2, _, _, _] } },
  safe: { bpm: 62, root: 48, sc: SC.dur, pad: [0, 5, 3, 4],
    lead: { w: 'triangle', o: 1, v: 0.035, len: 3, p: [0, _, _, _, 2, _, _, _, 4, _, _, _, 2, _, _, _, 3, _, _, _, 5, _, _, _, 4, _, _, _, _, _, _, _] } },
  a0: { bpm: 72, root: 45, sc: SC.moll, pad: [0, 5, 3, 4],
    bass: { w: 'triangle', o: -1, v: 0.14, p: [0, _, _, _, _, _, _, _, 0, _, _, _, _, _, _, _] },
    lead: { w: 'triangle', o: 1, v: 0.035, len: 1.6, p: [0, _, 2, _, 4, _, 2, _, 0, _, 2, _, 4, _, 7, _, 5, _, 4, _, 2, _, 4, _, 5, _, _, _, _, _, _, _] },
    dr: { intense: true, k: 'x.......x.......', s: '....x.......x...', h: '..x...x...x...x.' } },
  a1: { bpm: 60, root: 50, sc: SC.moll, pad: [0, 3, 5, 4],
    bass: { w: 'sine', o: -1, v: 0.15, p: [0, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _] },
    lead: { w: 'sine', o: 2, v: 0.04, len: 8, p: [4, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, 3, _, _, _, _, _, 1, _, _, _, _, _, _, _, _, _] },
    dr: { intense: true, k: 'x.........x.....', h: '....x.......x...' } },
  a2: { bpm: 66, root: 48, sc: SC.harm, pad: [0, 5, 4, 0],
    bass: { w: 'triangle', o: -1, v: 0.12, p: [0, _, _, _, _, _, _, _, 4, _, _, _, _, _, _, _] },
    lead: { w: 'sine', o: 2, v: 0.045, len: 3, p: [0, _, 4, _, 7, _, 4, _, 6, _, 4, _, 7, _, 4, _, 5, _, 3, _, 7, _, 3, _, 4, _, 6, _, 8, _, _, _] },
    dr: { intense: true, k: 'x.......x.......', s: '....x.......x...' } },
  a3: { bpm: 92, root: 40, sc: SC.phryg, pad: [0, 0, 1, 0],
    bass: { w: 'sawtooth', o: -1, v: 0.1, cut: 420, len: 0.9, p: [0, _, 0, _, 0, _, 0, 1, 0, _, 0, _, 0, _, 3, 1] },
    lead: { w: 'square', o: 1, v: 0.022, cut: 1400, len: 4, p: [7, _, _, _, _, _, 8, _, _, _, 7, _, _, _, _, _, 5, _, _, _, _, _, 4, _, _, _, 1, _, _, _, _, _] },
    dr: { k: 'x.......x.......', s: '............x...', h: '..x...x...x...x.' } },
  a4: { bpm: 68, root: 42, sc: SC.moll, pad: [0, 5, 2, 4],
    bass: { w: 'sine', o: -1, v: 0.13, p: [0, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _] },
    lead: { w: 'triangle', o: 1, v: 0.045, len: 3, vib: true, p: [4, _, _, 3, 4, _, 2, _, 0, _, _, _, _, _, _, _, 4, _, _, 3, 4, _, 5, _, 4, _, _, _, _, _, _, _] },
    dr: { intense: true, k: 'x.......x.......', s: '....x.......x...' } },
  a5: { bpm: 96, root: 47, sc: SC.lokr, pad: [0, 1, 0, 4],
    bass: { w: 'sawtooth', o: -1, v: 0.1, cut: 500, len: 0.8, p: [0, _, _, 0, _, _, 0, _, 0, _, _, 0, _, _, 1, _] },
    lead: { w: 'sawtooth', o: 1, v: 0.02, cut: 1200, len: 6, p: [4, _, _, _, _, _, _, _, 3, _, _, _, _, _, _, _, 4, _, _, _, _, _, _, _, 6, _, _, _, 5, _, _, _] },
    dr: { k: 'x...x...x...x...', h: '..x...x...x...x.' } },
  boss: { bpm: 138, root: 40, sc: SC.phryg, pad: [0, 1, 0, 5],
    bass: { w: 'sawtooth', o: -1, v: 0.11, cut: 700, len: 0.6, p: [0, 0, 7, 0, 0, 0, 7, 0, 0, 0, 7, 0, 1, 1, 8, 1] },
    lead: { w: 'square', o: 1, v: 0.028, cut: 2000, len: 2, p: [7, _, _, 8, _, _, 7, _, 5, _, _, 4, _, _, 1, _, 7, _, _, 8, _, _, 10, _, 8, _, 7, _, 5, _, 4, _] },
    dr: { k: 'x...x...x...x...', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' } },
};

const MU = { name: null, theme: null, g: null, step: 0, next: 0, intense: false, bus: null, timer: 0 };
function mfreq(th, d, o) { const n = th.sc.length, k = ((d % n) + n) % n, midi = th.root + 12 * o + th.sc[k] + 12 * Math.floor(d / n); return 440 * Math.pow(2, (midi - 69) / 12); }
function mNote(w, f, t, dur, v, cut, vib) {
  const c = AU.ctx, o = c.createOscillator(), fl = c.createBiquadFilter(), g = c.createGain();
  o.type = w; o.frequency.value = f;
  if (vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 5; lg.gain.value = f * 0.012; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.1); }
  fl.type = 'lowpass'; fl.frequency.value = cut || 3000;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(fl); fl.connect(g); g.connect(MU.g); o.start(t); o.stop(t + dur + 0.05);
}
function mPad(th, t, d, dur) {
  const c = AU.ctx;
  for (const k of [0, 2, 4]) for (const det of [-7, 7]) {
    const o = c.createOscillator(), fl = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth'; o.frequency.value = mfreq(th, d + k, 0); o.detune.value = det;
    fl.type = 'lowpass'; fl.frequency.value = 700;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.012, t + dur * 0.3); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(fl); fl.connect(g); g.connect(MU.g); o.start(t); o.stop(t + dur + 0.05);
  }
}
function mDrum(kind, t) {
  const c = AU.ctx;
  if (kind === 'k') { const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.22); g.gain.setValueAtTime(0.32, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28); o.connect(g); g.connect(MU.g); o.start(t); o.stop(t + 0.3); return; }
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = AU.nb;
  if (kind === 's') { f.type = 'bandpass'; f.frequency.value = 1800; g.gain.setValueAtTime(0.14, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16); }
  else { f.type = 'highpass'; f.frequency.value = 7000; g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04); }
  s.connect(f); f.connect(g); g.connect(MU.g); s.start(t, Math.random() * 0.5); s.stop(t + 0.2);
}
function mStep(th, step, t, spb) {
  const bar = Math.floor(step / 16), s = step % 16, chord = th.pad ? th.pad[bar % th.pad.length] : 0;
  if (s === 0 && th.pad) mPad(th, t, chord, spb * 16);
  if (th.bass) { const d = th.bass.p[s]; if (d != null) mNote(th.bass.w, mfreq(th, chord + d, th.bass.o), t, spb * (th.bass.len || 1.8), th.bass.v, th.bass.cut || 600); }
  if (th.lead) { const d = th.lead.p[step % th.lead.p.length]; if (d != null) mNote(th.lead.w, mfreq(th, d, th.lead.o), t, spb * (th.lead.len || 2), th.lead.v, th.lead.cut || 3000, th.lead.vib); }
  if (th.dr && (!th.dr.intense || MU.intense)) for (const k of ['k', 's', 'h']) if (th.dr[k] && th.dr[k][s] === 'x') mDrum(k, t);
}
function musicTick() {
  const c = AU.ctx; if (!c || !MU.theme || c.state !== 'running') return;
  const th = MU.theme, spb = 60 / th.bpm / 4;
  if (MU.next < c.currentTime) MU.next = c.currentTime + 0.05;
  while (MU.next < c.currentTime + 0.2) { mStep(th, MU.step, MU.next, spb); MU.next += spb; MU.step++; }
}
function startMusic() {
  if (MU.bus || !AU.ctx) return;
  MU.bus = AU.ctx.createGain(); MU.bus.gain.value = OPT.music ? 0.8 : 0; MU.bus.connect(AU.out);
  MU.timer = setInterval(musicTick, 50);
}
function setMusicOn(on) { if (MU.bus) MU.bus.gain.setTargetAtTime(on ? 0.8 : 0, AU.ctx.currentTime, 0.2); }
// Wechselt sanft zum nächsten Stück (null = Stille)
function setMusic(name) {
  if (name === MU.name || !AU.ctx || !MU.bus) return;
  const c = AU.ctx, t = c.currentTime;
  if (MU.g) { const old = MU.g; old.gain.setTargetAtTime(0, t, 0.5); setTimeout(() => { try { old.disconnect(); } catch (e) { } }, 4000); }
  MU.name = name; MU.theme = name ? THEMES[name] : null;
  if (!MU.theme) { MU.g = null; return; }
  MU.g = c.createGain(); MU.g.gain.setValueAtTime(0.0001, t); MU.g.gain.setTargetAtTime(1, t, 0.6); MU.g.connect(MU.bus);
  MU.step = 0; MU.next = t + 0.1;
}
