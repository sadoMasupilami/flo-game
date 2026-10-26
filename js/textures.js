// Portalnacht – gemalte Texturen (beim Start einmal erzeugt, nahtlos kachelbar)
'use strict';
const TX = {};
// Zeichnet eine Form neunmal versetzt, damit die Textur an den Rändern nahtlos weiterläuft
function wrap9(s, fn) { for (const ox of [-s, 0, s]) for (const oy of [-s, 0, s]) fn(ox, oy); }
function blobs(g, s, n, cols, rmin, rmax, alpha, squash) {
  for (let i = 0; i < n; i++) {
    const x = Math.random() * s, y = Math.random() * s, r = rmin + Math.random() * (rmax - rmin), rot = Math.random() * 3.2, sq = squash == null ? 0.5 + Math.random() * 0.5 : squash;
    g.fillStyle = cols[(Math.random() * cols.length) | 0]; g.globalAlpha = alpha == null ? 1 : alpha * (0.4 + Math.random() * 0.6);
    wrap9(s, (ox, oy) => { g.beginPath(); g.ellipse(x + ox, y + oy, r, r * sq, rot, 0, TAU); g.fill(); });
  }
  g.globalAlpha = 1;
}
function strokes(g, s, n, cols, len, width, angle, spread, alpha) {
  g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = Math.random() * s, y = Math.random() * s, a = angle + (Math.random() - 0.5) * spread, l = len * (0.5 + Math.random());
    g.strokeStyle = cols[(Math.random() * cols.length) | 0]; g.lineWidth = width * (0.6 + Math.random() * 0.8); g.globalAlpha = alpha == null ? 1 : alpha;
    wrap9(s, (ox, oy) => { g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l); g.stroke(); });
  }
  g.globalAlpha = 1;
}
function grain(g, s, amount) {
  const d = g.getImageData(0, 0, s, s), p = d.data;
  for (let i = 0; i < p.length; i += 4) { const n = (Math.random() - 0.5) * amount; p[i] += n; p[i + 1] += n; p[i + 2] += n; }
  g.putImageData(d, 0, 0);
}
function crack(g, s, col, w, steps) {
  let x = Math.random() * s, y = Math.random() * s, a = Math.random() * TAU;
  g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x, y);
  for (let i = 0; i < steps; i++) { a += (Math.random() - 0.5) * 1.2; x += Math.cos(a) * 9; y += Math.sin(a) * 9; g.lineTo(x, y); }
  g.stroke();
}
function mkTex(key, size, draw) {
  const t = canvasTex(size, size, (g, s) => draw(g, s));
  t.wrapS = t.wrapT = T.RepeatWrapping; TX[key] = t; return t;
}
function buildTextures() {
  mkTex('grass', 256, (g, s) => {
    g.fillStyle = '#3a4824'; g.fillRect(0, 0, s, s);
    blobs(g, s, 140, ['#2d3a1b', '#45542b', '#3f4a22', '#4c4a26'], 6, 22, 0.55);
    blobs(g, s, 25, ['#4a3e2a', '#3e3424'], 6, 16, 0.6);
    strokes(g, s, 1400, ['#2a3618', '#4d5e2c', '#5a6a32', '#36441e'], 6, 1.2, -Math.PI / 2, 0.9, 0.85);
    grain(g, s, 18);
  });
  mkTex('lawn', 256, (g, s) => {
    g.fillStyle = '#33502a'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? 'rgba(0,0,0,.08)' : 'rgba(255,255,255,.04)'; g.fillRect(i * s / 4, 0, s / 4, s); }
    strokes(g, s, 1600, ['#2a4422', '#3e5e30', '#467036'], 4, 1, -Math.PI / 2, 0.6, 0.8);
    grain(g, s, 14);
  });
  mkTex('dirt', 256, (g, s) => {
    g.fillStyle = '#56442f'; g.fillRect(0, 0, s, s);
    blobs(g, s, 120, ['#4a3a27', '#64503a', '#3e3122'], 6, 20, 0.5);
    for (const x of [0.28, 0.72]) { const gr = g.createLinearGradient((x - 0.08) * s, 0, (x + 0.08) * s, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, 'rgba(30,20,10,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect((x - 0.08) * s, 0, 0.16 * s, s); }
    blobs(g, s, 260, ['#7a7266', '#5e5850', '#8a8174'], 1.2, 3.5, 0.9);
    grain(g, s, 22);
  });
  mkTex('forest', 256, (g, s) => {
    g.fillStyle = '#2b261a'; g.fillRect(0, 0, s, s);
    blobs(g, s, 90, ['#221e14', '#33301f'], 10, 26, 0.6);
    blobs(g, s, 700, ['#4a3a22', '#5a4426', '#3a3a1e', '#6a4a2a', '#2f3a1c', '#704a24'], 3, 7, 0.9, 0.45);
    strokes(g, s, 60, ['#1a140c', '#3a2a18'], 22, 2, 0, TAU, 0.9);
    grain(g, s, 16);
  });
  mkTex('cobble', 256, (g, s) => {
    g.fillStyle = '#242220'; g.fillRect(0, 0, s, s);
    const n = 8, c = s / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const ox = (y % 2) * c / 2, cx = x * c + ox + c / 2 + (Math.random() - 0.5) * 4, cy = y * c + c / 2 + (Math.random() - 0.5) * 4, v = 78 + Math.random() * 30 | 0;
      wrap9(s, (wx, wy) => {
        const gr = g.createRadialGradient(cx + wx - 4, cy + wy - 4, 2, cx + wx, cy + wy, c * 0.55);
        gr.addColorStop(0, `rgb(${v + 20},${v + 16},${v + 10})`); gr.addColorStop(1, `rgb(${v - 30},${v - 32},${v - 36})`);
        g.fillStyle = gr; g.beginPath(); g.ellipse(cx + wx, cy + wy, c * 0.44, c * 0.4, Math.random() * 0.4, 0, TAU); g.fill();
      });
    }
    blobs(g, s, 40, ['#1c2a14', '#2a3418'], 2, 5, 0.6);
    grain(g, s, 16);
  });
  mkTex('asphalt', 256, (g, s) => {
    g.fillStyle = '#323234'; g.fillRect(0, 0, s, s);
    blobs(g, s, 60, ['#2a2a2c', '#3a3a3c', '#2e2d2b'], 10, 30, 0.5);
    for (let i = 0; i < 5; i++) blobs(g, s, 1, ['#161616'], 12, 26, 0.55);
    grain(g, s, 34);
    for (let i = 0; i < 7; i++) crack(g, s, 'rgba(14,14,15,.8)', 1.4, 12);
  });
  mkTex('concrete', 256, (g, s) => {
    g.fillStyle = '#76746e'; g.fillRect(0, 0, s, s);
    blobs(g, s, 80, ['#6a6862', '#82807a', '#5e5c56'], 8, 30, 0.45);
    strokes(g, s, 40, ['rgba(40,36,30,.5)'], 40, 3, Math.PI / 2, 0.15, 0.5);
    grain(g, s, 26);
    for (let i = 0; i < 3; i++) crack(g, s, 'rgba(30,30,30,.7)', 1, 8);
  });
  mkTex('plaster', 256, (g, s) => {
    g.fillStyle = '#9a9284'; g.fillRect(0, 0, s, s);
    blobs(g, s, 70, ['#8a8274', '#a69e8e', '#7e7668'], 10, 34, 0.5);
    strokes(g, s, 70, ['rgba(50,44,36,.55)', 'rgba(70,60,48,.45)'], 50, 4, Math.PI / 2, 0.1, 0.5);
    grain(g, s, 22);
  });
  mkTex('roof', 256, (g, s) => {
    g.fillStyle = '#3a2420'; g.fillRect(0, 0, s, s);
    const rows = 8, h = s / rows, cols = 8, w = s / cols;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols + 1; x++) {
      const ox = (y % 2) * w / 2, v = 50 + Math.random() * 25 | 0, gr = g.createLinearGradient(0, y * h, 0, y * h + h);
      gr.addColorStop(0, `rgb(${v + 30},${v},${v - 6})`); gr.addColorStop(1, `rgb(${v - 10},${v - 30},${v - 32})`);
      g.fillStyle = gr; g.beginPath(); g.ellipse(x * w + ox, y * h + h * 0.5, w * 0.48, h * 0.55, 0, 0, Math.PI); g.fill();
    }
    grain(g, s, 18);
  });
  mkTex('wood', 256, (g, s) => {
    g.fillStyle = '#5a3c22'; g.fillRect(0, 0, s, s);
    const n = 6, w = s / n;
    for (let i = 0; i < n; i++) { const v = Math.random() * 30 - 15; g.fillStyle = `rgb(${90 + v},${60 + v},${34 + v})`; g.fillRect(i * w + 1, 0, w - 2, s); }
    strokes(g, s, 400, ['rgba(40,24,12,.6)', 'rgba(120,84,50,.4)'], 30, 1, Math.PI / 2, 0.08, 0.7);
    for (let i = 0; i <= n; i++) { g.fillStyle = '#24170c'; g.fillRect(i * w - 1, 0, 2, s); }
    blobs(g, s, 8, ['#2e1e10'], 3, 6, 0.8);
    grain(g, s, 14);
  });
  mkTex('bark', 128, (g, s) => {
    g.fillStyle = '#3a2c20'; g.fillRect(0, 0, s, s);
    strokes(g, s, 260, ['#22180f', '#4a3828', '#2c2016'], 30, 3, Math.PI / 2, 0.25, 0.9);
    grain(g, s, 18);
  });
  mkTex('leaves', 128, (g, s) => {
    g.fillStyle = '#1e3020'; g.fillRect(0, 0, s, s);
    blobs(g, s, 500, ['#14241a', '#2a4228', '#1a2c1c', '#34502e'], 2, 5, 0.9);
    grain(g, s, 16);
  });
  mkTex('hay', 128, (g, s) => {
    g.fillStyle = '#8a7438'; g.fillRect(0, 0, s, s);
    strokes(g, s, 700, ['#a08a48', '#6a5628', '#b49c58'], 14, 1, 0, 0.5, 0.9);
    grain(g, s, 14);
  });
  mkTex('rock', 128, (g, s) => {
    g.fillStyle = '#56544e'; g.fillRect(0, 0, s, s);
    blobs(g, s, 60, ['#4a4842', '#646258', '#3e3c38'], 4, 16, 0.6);
    blobs(g, s, 30, ['#3a4a2a'], 3, 8, 0.5);
    grain(g, s, 30);
    for (let i = 0; i < 4; i++) crack(g, s, 'rgba(20,20,20,.7)', 1, 6);
  });
  // Haut der Monster: neutrales Grau, wird von der Monsterfarbe eingefärbt
  mkTex('skin', 256, (g, s) => {
    g.fillStyle = '#c4c0bc'; g.fillRect(0, 0, s, s);
    blobs(g, s, 120, ['#a8a29e', '#d6d0ca', '#9a9490'], 6, 24, 0.5);
    blobs(g, s, 40, ['#8a6a6a', '#7a5a62'], 4, 12, 0.45);
    strokes(g, s, 90, ['rgba(90,30,50,.45)', 'rgba(60,40,70,.4)'], 26, 1.6, 0, TAU, 0.6);
    blobs(g, s, 300, ['#8c8682'], 0.8, 2, 0.8);
    grain(g, s, 20);
  });
  mkTex('metal', 128, (g, s) => {
    g.fillStyle = '#8a8c90'; g.fillRect(0, 0, s, s);
    strokes(g, s, 500, ['rgba(255,255,255,.12)', 'rgba(0,0,0,.12)'], 40, 1, 0, 0.05, 0.8);
    blobs(g, s, 12, ['#6a5a4a'], 2, 6, 0.4);
    grain(g, s, 10);
  });
  // feine Maserung und gebürstetes Metall für die Waffen in der Hand (ruhiger als die Welt-Texturen)
  mkTex('vmwood', 128, (g, s) => {
    g.fillStyle = '#b0b0b0'; g.fillRect(0, 0, s, s);
    strokes(g, s, 160, ['rgba(70,70,70,.35)', 'rgba(255,255,255,.18)'], 60, 1.2, Math.PI / 2, 0.06, 0.8);
  });
  mkTex('vmmetal', 128, (g, s) => {
    g.fillStyle = '#c8c8c8'; g.fillRect(0, 0, s, s);
    strokes(g, s, 220, ['rgba(255,255,255,.16)', 'rgba(0,0,0,.1)'], 70, 1, 0, 0.03, 0.8);
  });
  // Nebel: weiße Wolken mit Transparenz
  TX.mist = canvasTex(256, 256, (g, s) => {
    g.clearRect(0, 0, s, s);
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * s, y = Math.random() * s, r = 20 + Math.random() * 60;
      wrap9(s, (ox, oy) => { const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r); gr.addColorStop(0, 'rgba(255,255,255,.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2); });
    }
  });
  TX.mist.wrapS = TX.mist.wrapT = T.RepeatWrapping;
  // Lichtkegel: oben hell, unten durchsichtig
  TX.beam = canvasTex(16, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  // Grasbüschel mit durchsichtigem Hintergrund
  TX.tuft = canvasTex(64, 64, (g, s) => {
    g.clearRect(0, 0, s, s); g.lineCap = 'round';
    for (let i = 0; i < 22; i++) { const x = 8 + Math.random() * 48, h = 24 + Math.random() * 36, lean = (Math.random() - 0.5) * 16; g.strokeStyle = ['#3a4a22', '#4e5e2c', '#2c3a1a', '#5a6630'][i % 4]; g.lineWidth = 2 + Math.random() * 2; g.beginPath(); g.moveTo(x, s); g.quadraticCurveTo(x + lean * 0.3, s - h * 0.6, x + lean, s - h); g.stroke(); }
  });
}
// Material mit Textur und passender Kachelung (Ergebnisse werden wiederverwendet)
const TMC = new Map();
function tmat(key, color, rx, ry, o) {
  o = o || {};
  const k = [key, color, rx, ry, o.bump || 0, o.sh || 0, o.e || 0, o.off || 0].join('|');
  let m = TMC.get(k); if (m) return m;
  const t = repTex(TX[key], rx || 1, ry || 1);
  m = new T.MeshPhongMaterial({ color, map: t, shininess: o.sh || 4, specular: o.sh ? 0x222222 : 0x050505, emissive: o.e || 0 });
  if (o.bump) { m.bumpMap = t; m.bumpScale = o.bump; }
  if (o.off) { m.polygonOffset = true; m.polygonOffsetFactor = o.off; m.polygonOffsetUnits = o.off; }
  TMC.set(k, m); return m;
}
