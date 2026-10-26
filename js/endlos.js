// Portalnacht – Endlos-Modus: Wellen ohne Ende im Stadtzentrum
'use strict';
let MODE = 'story';   // story | endlos
const EN = { wave: 0, active: false, queue: [], spawnT: 0, breakT: 0 };
const EN_ALL = ['kriecher', 'ghul', 'spucker', 'koloss', 'schreier', 'platzer', 'kraehe', 'schild', 'schatten'];

function endlessBest() { return ACH.st.endlessBest || 0; }
function endlessTag() { return 'E' + EN.wave; }
function startEndless() {
  MODE = 'endlos';
  resetWorld(5);
  areaSt[5].done = true;   // keine Story-Wellen und kein Story-Endboss
  Object.assign(EN, { wave: 0, active: false, queue: [], spawnT: 0, breakT: 6 });
  lastArea = 5; showToast('Endlos-Modus', 'Überlebe!');
}
function endlessSpawnPos() {
  for (let t = 0; t < 14; t++) {
    const ang = rand(0, TAU), d = rand(13, 22);
    const x = clamp(player.pos.x + Math.sin(ang) * d, -16, 16), z = clamp(player.pos.z - Math.cos(ang) * d, -775, -668);
    if (Math.hypot(x - player.pos.x, z - player.pos.z) < 9) continue;
    if (!blockedAt(x, z, 1) && !inSafe(x, z, 3)) return [x, z];
  }
  return [rand(-12, 12), -760];
}
function startEndlessWave() {
  EN.wave++; EN.active = true; EN.spawnT = 0.4;
  const w = EN.wave, n = Math.min(50, 8 + w * 2), q = [];
  for (let i = 0; i < n; i++) q.push({ t: EN_ALL[(Math.random() * EN_ALL.length) | 0] });
  if (w % 3 === 0) q.push({ t: 'koloss', elite: true });
  if (w % 5 === 0) q.push({ t: MINIS[(w / 5 - 1) % MINIS.length].type, mini: (w / 5 - 1) % MINIS.length });
  if (w % 10 === 0) q.push({ t: 'koenigin' });
  EN.queue = q;
  AU.play('wave', 0.5);
  showToast('Endlos-Modus', `Welle ${w}`);
}
function endlessRemaining() { let n = EN.queue.length; const tag = endlessTag(); for (const m of monsters) if (m.state !== 'dead' && m.wj === tag) n++; return n; }
function updateEndless(dt) {
  if (!EN.active) {
    if (safeIdx() >= 0) return; // im Unterschlupf wartet die nächste Welle
    EN.breakT -= dt; if (EN.breakT <= 0) startEndlessWave();
    return;
  }
  if (EN.queue.length) {
    EN.spawnT -= dt;
    if (EN.spawnT <= 0 && aliveCount() < 14) {
      const q = EN.queue.shift(), w = EN.wave, mult = { hp: 1 + 0.15 * (w - 1), dmg: 1 + 0.06 * (w - 1) };
      if (q.t === 'koenigin') {
        spawnMonster('koenigin', 0, -770, { area: 5, wa: 'E', wj: endlessTag(), mult });
        $('bossName').textContent = MT.koenigin.name; $('bossbar').hidden = false; AU.play('roar');
      } else {
        const p = endlessSpawnPos();
        spawnGroup(q.t, p[0], p[1], { area: 5, elite: q.elite, mini: q.mini, wa: 'E', wj: endlessTag(), mult });
      }
      EN.spawnT = rand(0.4, 0.75);
    }
  } else if (endlessRemaining() === 0) {
    EN.active = false; EN.breakT = 10;
    const bonus = Math.round(40 * EN.wave * diff().gold);
    SV.money += bonus; popGold(bonus);
    achMax('endlessBest', EN.wave); achSave(); saveGame();
    AU.play('clear'); showMsg(`Welle ${EN.wave} geschafft! +${bonus} Münzen`);
  }
}
function endlessObjective() {
  if (safeIdx() >= 0) return EN.active ? 'Sicher. Die Monster warten draußen.' : 'Sicher. Die nächste Welle startet, wenn du rausgehst.';
  if (EN.active) return `Welle ${EN.wave} · noch ${endlessRemaining()} Monster`;
  return `Nächste Welle in ${Math.ceil(EN.breakT)} Sek.`;
}
