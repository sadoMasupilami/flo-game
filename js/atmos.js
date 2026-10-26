// Portalnacht – Stimmung: Nachthimmel mit Sternen und Wolken, Bodennebel
'use strict';
let sky = null;
const mists = [];
const MIST_AREA = [0.5, 0.85, 0.45, 0.3, 0.4, 0.35]; // Nebeldichte je Gebiet
const SKY_VS = 'varying vec3 vDir;\nvoid main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const SKY_FS = `uniform vec3 uHor; uniform vec3 uZen; uniform float uTime; uniform float uClouds; varying vec3 vDir;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
void main(){
  vec3 d = normalize(vDir); float h = d.y;
  vec3 col = mix(uHor, uZen, smoothstep(0.0, 0.6, h));
  vec2 cell = d.xz / (abs(h) + 0.35) * 260.0;
  float s = hash(floor(cell)), r = length(fract(cell) - 0.5);
  col += vec3(0.85, 0.9, 1.0) * step(0.996, s) * smoothstep(0.35, 0.05, r) * (0.55 + 0.45 * sin(uTime * 2.0 + s * 80.0)) * smoothstep(0.1, 0.4, h);
  if (uClouds > 0.5) {
    vec2 cp = d.xz / (h + 0.3) * 1.6 + vec2(uTime * 0.008, uTime * 0.003);
    float c = noise(cp) * 0.55 + noise(cp * 2.3) * 0.3 + noise(cp * 5.1) * 0.15;
    c = smoothstep(0.5, 0.85, c) * smoothstep(0.03, 0.35, h);
    col = mix(col, uHor * 1.8 + 0.015, c * 0.6);
  }
  gl_FragColor = vec4(col, 1.0);
}`;
function buildSky() {
  const m = new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false, fog: false, vertexShader: SKY_VS, fragmentShader: SKY_FS,
    uniforms: { uHor: { value: scene.fog.color }, uZen: { value: new T.Color(0x03040a) }, uTime: { value: 0 }, uClouds: { value: 1 } },
  });
  sky = new T.Mesh(new T.SphereGeometry(80, 32, 16), m); sky.renderOrder = -1; sky.frustumCulled = false; scene.add(sky);
}
function buildMist() {
  for (const [y, op, sc] of [[0.35, 1, 1], [1.2, 0.6, 1.5]]) {
    const t = TX.mist.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(3 * sc, 3 * sc);
    const m = new T.MeshBasicMaterial({ map: t, color: 0x9aa4b0, transparent: true, opacity: 0, depthWrite: false });
    const o = new T.Mesh(G.plane, m); o.rotation.x = -Math.PI / 2; o.scale.set(70, 70, 1); o.position.y = y; o.renderOrder = 2; scene.add(o);
    mists.push({ o, m, t, op, sc });
  }
}
function updateAtmos(dt, t) {
  const p = camera.position;
  if (sky) {
    sky.position.copy(p);
    const u = sky.material.uniforms; u.uTime.value = t; u.uZen.value.copy(scene.fog.color).multiplyScalar(0.3); u.uClouds.value = OPT.gfx === 'schnell' ? 0 : 1;
  }
  const a = GS === 'menu' ? 5 : curArea();
  for (const m of mists) {
    m.o.position.x = p.x; m.o.position.z = p.z;
    const r = 3 * m.sc; m.t.offset.set(p.x / 70 * r + t * 0.006, -p.z / 70 * r + t * 0.004 * m.sc); // bleibt an der Welt kleben und treibt langsam
    m.m.opacity = lerp(m.m.opacity, MIST_AREA[a] * m.op, Math.min(1, dt));
    m.m.color.copy(scene.fog.color).multiplyScalar(3).addScalar(0.1);
  }
}
