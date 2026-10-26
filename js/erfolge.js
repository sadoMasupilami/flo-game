// Portalnacht – Erfolge (gelten für alle Spielstände)
'use strict';
const ACH_KEY = 'portalnacht.erfolge.v1';
const ACH = Object.assign({ got: {}, st: {} }, lsGet(ACH_KEY) || {});
const ERFOLGE = [
  { id: 'blut', name: 'Erstes Blut', desc: 'Besiege dein erstes Monster.', stat: 'kills', goal: 1 },
  { id: 'jaeger', name: 'Monsterjäger', desc: 'Besiege 500 Monster.', stat: 'kills', goal: 500 },
  { id: 'holz', name: 'Holzfäller', desc: 'Besiege 100 Monster mit dem Holzschwert.', stat: 'killHolz', goal: 100 },
  { id: 'kopf', name: 'Kopfjäger', desc: 'Lande 50 Kopftreffer.', stat: 'heads', goal: 50 },
  { id: 'pyro', name: 'Pyromane', desc: 'Setze 100 Monster in Brand.', stat: 'burned', goal: 100 },
  { id: 'bau', name: 'Baumeister', desc: 'Stelle 50 Barrikaden auf.', stat: 'blocks', goal: 50 },
  { id: 'granate', name: 'Granatenhagel', desc: 'Besiege 3 Monster mit einer einzigen Explosion.', stat: 'multi', goal: 3 },
  { id: 'flink', name: 'Flink', desc: 'Weiche 100-mal aus.', stat: 'dashes', goal: 100 },
  { id: 'sammler', name: 'Sammler', desc: 'Besitze alle 11 Waffen.', stat: 'weapons', goal: 11 },
  { id: 'max', name: 'Voll aufgerüstet', desc: 'Bring eine Waffe auf Stufe 4.', stat: 'maxLv', goal: 4 },
  { id: 'bosse', name: 'Bosskiller', desc: 'Besiege alle 5 Zwischenbosse.', stat: 'minis', goal: 5 },
  { id: 'unberuehrt', name: 'Unberührbar', desc: 'Besiege einen Zwischenboss, ohne getroffen zu werden.' },
  { id: 'portal', name: 'Portal geschlossen', desc: 'Besiege die Monsterkönigin.' },
  { id: 'makellos', name: 'Makellos', desc: 'Besiege die Monsterkönigin, ohne getroffen zu werden.' },
  { id: 'schwer', name: 'Hart im Nehmen', desc: 'Gewinne auf Schwer.' },
  { id: 'endlos10', name: 'Durchhalter', desc: 'Schaffe 10 Wellen im Endlos-Modus.', stat: 'endlessBest', goal: 10 },
  { id: 'endlos25', name: 'Legende', desc: 'Schaffe 25 Wellen im Endlos-Modus.', stat: 'endlessBest', goal: 25 },
];
let achDirty = false, achSaveT = 0, fightClean = true;

function achSave() { lsSet(ACH_KEY, ACH); achDirty = false; }
function achAdd(stat, n) { ACH.st[stat] = (ACH.st[stat] || 0) + (n == null ? 1 : n); achDirty = true; achCheck(); }
function achMax(stat, v) { if (v > (ACH.st[stat] || 0)) { ACH.st[stat] = v; achDirty = true; achCheck(); } }
function achCheck() { for (const e of ERFOLGE) if (e.stat && !ACH.got[e.id] && (ACH.st[e.stat] || 0) >= e.goal) achUnlock(e.id); }
function achUnlock(id) {
  if (ACH.got[id]) return;
  const e = ERFOLGE.find(x => x.id === id); if (!e) return;
  ACH.got[id] = Date.now(); achSave();
  const t = $('achToast'); $('achName').textContent = e.name; t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
  clearTimeout(achUnlock.timer); achUnlock.timer = setTimeout(() => t.classList.remove('show'), 3200);
  AU.play('buy');
}
function achTick(dt) { achSaveT += dt; if (achDirty && achSaveT > 3) { achSaveT = 0; achSave(); } }
function achOwned() { achMax('weapons', WEAPONS.filter(w => SV.weapons[w.id]).length); achMax('maxLv', Math.max(...WEAPONS.map(w => SV.weapons[w.id] || 0))); }
function achMiniDown(m) {
  const i = MINIS.indexOf(m.mini.def);
  ACH.st.miniSet = (ACH.st.miniSet || 0) | (1 << i);
  let n = 0; for (let b = ACH.st.miniSet; b; b >>= 1) n += b & 1;
  achMax('minis', n);
  if (fightClean) achUnlock('unberuehrt');
}
function achBossDown() {
  achUnlock('portal');
  if (fightClean) achUnlock('makellos');
  if (SV.diff === 'schwer') achUnlock('schwer');
}

function renderErfolge() {
  const got = ERFOLGE.filter(e => ACH.got[e.id]).length;
  $('achCount').textContent = `${got} von ${ERFOLGE.length} freigeschaltet`;
  $('achList').innerHTML = ERFOLGE.map(e => {
    const ok = !!ACH.got[e.id], v = e.stat ? Math.min(ACH.st[e.stat] || 0, e.goal) : 0;
    const prog = ok ? 'Freigeschaltet' : e.stat && e.goal > 1 ? `${fmt(v)} / ${fmt(e.goal)}` : 'Noch offen';
    const bar = !ok && e.stat && e.goal > 1 ? `<span class="abar"><i style="transform:scaleX(${(v / e.goal).toFixed(3)})"></i></span>` : '';
    return `<div class="ach ${ok ? 'got' : ''}"><b>${e.name}</b><p>${e.desc}</p><span class="aprog">${prog}</span>${bar}</div>`;
  }).join('');
}
