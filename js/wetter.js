// Portalnacht – Wetter: Regen und Gewitter mit Blitz und Donner
'use strict';
let lightningT = 0;             // > 0, solange ein Blitz die Welt erhellt
const WEATHER = [               // je Gebiet
  { rain: 0, storm: false },    // Hof: trocken
  { rain: 0.5, storm: false },  // Finsterwald: Nieselregen
  { rain: 0.8, storm: true },   // Dorf: Gewitter
  { rain: 0.6, storm: false },  // Autobahn: Regen
  { rain: 0.9, storm: true },   // Vorstadt: Gewitter
  { rain: 1, storm: true },     // Stadtzentrum: Unwetter
];
const RAIN_N = 900;
let rain = null, rainAmt = 0, nextBolt = 6, bolt = null, boltT = 0;
const thunders = [];

function buildRain() {
  const pos = new Float32Array(RAIN_N * 6), drops = new Float32Array(RAIN_N * 3);
  for (let i = 0; i < RAIN_N; i++) { drops[i * 3] = rand(-20, 20); drops[i * 3 + 1] = rand(0, 18); drops[i * 3 + 2] = rand(-20, 20); }
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3).setUsage(T.DynamicDrawUsage));
  rain = new T.LineSegments(geo, new T.LineBasicMaterial({ color: 0xa8b4c8, transparent: true, opacity: 0, depthWrite: false }));
  rain.frustumCulled = false; rain.userData = { pos, drops }; scene.add(rain);
  const bg = new T.BufferGeometry(); bg.setAttribute('position', new T.BufferAttribute(new Float32Array(24 * 3), 3));
  bolt = new T.Line(bg, new T.LineBasicMaterial({ color: 0xe8f0ff, transparent: true, opacity: 0, blending: T.AdditiveBlending, fog: false, depthWrite: false }));
  bolt.frustumCulled = false; scene.add(bolt);
}
function weatherNow() {
  if (!OPT.weather) return { rain: 0, storm: false };
  return GS === 'menu' ? WEATHER[5] : WEATHER[curArea()];
}
function strike() {
  lightningT = 0.55;
  // gezackter Blitz irgendwo vor dem Spieler am Himmel
  const c = camera.position, a = player.yaw + rand(-0.9, 0.9), d = rand(45, 70);
  let x = c.x - Math.sin(a) * d, z = c.z - Math.cos(a) * d, y = 60;
  const p = bolt.geometry.attributes.position;
  for (let i = 0; i < 24; i++) { p.setXYZ(i, x, y, z); x += rand(-3, 3); z += rand(-3, 3); y -= 2.4; }
  p.needsUpdate = true; boltT = 0.25;
  $('flash').style.opacity = 0.45;
  thunders.push(rand(0.4, 2.2));
}
function updateWeather(dt) {
  if (!rain) return;
  const w = weatherNow(), c = camera.position, max = OPT.gfx === 'schnell' ? RAIN_N / 2 : RAIN_N;
  rainAmt = lerp(rainAmt, w.rain, Math.min(1, dt * 0.5));
  const n = Math.floor(max * rainAmt), { pos, drops } = rain.userData;
  for (let i = 0; i < n; i++) {
    let x = drops[i * 3], y = drops[i * 3 + 1] - dt * 22, z = drops[i * 3 + 2];
    if (y < 0) { y += 18; x = rand(-20, 20); z = rand(-20, 20); }
    drops[i * 3 + 1] = y;
    const wx = c.x + x, wz = c.z + z;
    pos[i * 6] = wx; pos[i * 6 + 1] = y; pos[i * 6 + 2] = wz;
    pos[i * 6 + 3] = wx + 0.12; pos[i * 6 + 4] = y + 0.75; pos[i * 6 + 5] = wz;
  }
  rain.geometry.setDrawRange(0, n * 2); rain.geometry.attributes.position.needsUpdate = true;
  rain.material.opacity = 0.35 * Math.min(1, rainAmt * 2);
  // Spritzer auf dem Boden
  if (rainAmt > 0.1 && Math.random() < dt * 40 * rainAmt) PG.emit(c.x + rand(-8, 8), 0.05, c.z + rand(-8, 8), 0, rand(0.5, 1), 0, 0.2, 0.7, 0.75, 0.85, 0.05, 6, 0, 0, 0.6);
  AU.rain(rainAmt);
  // Gewitter
  if (w.storm) { nextBolt -= dt; if (nextBolt <= 0) { strike(); nextBolt = rand(7, 18); } }
  if (lightningT > 0) {
    lightningT -= dt;
    const t = 0.55 - lightningT, k = (t < 0.08 ? 1 : t < 0.16 ? 0.2 : t < 0.24 ? 0.8 : Math.max(0, 1 - (t - 0.24) * 3.5));
    hemi.intensity = 0.85 + k * 2.2; moonLight.intensity = 0.45 + k * 1.5;
    $('flash').style.opacity = (k * 0.35).toFixed(2);
    if (lightningT <= 0) { hemi.intensity = 0.85; moonLight.intensity = 0.45; $('flash').style.opacity = 0; }
  }
  if (boltT > 0) { boltT -= dt; bolt.material.opacity = Math.max(0, boltT * 4); }
  for (let i = thunders.length - 1; i >= 0; i--) { thunders[i] -= dt; if (thunders[i] <= 0) { AU.play('thunder', 0.5); thunders.splice(i, 1); } }
}
