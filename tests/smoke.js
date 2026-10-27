// Rauchtest: spielt Portalnacht einmal im Schnelldurchlauf durch.
// Aufruf: npm test   (oder: node tests/smoke.js [Ordner mit index.html])
// Bricht mit Fehlercode ab, sobald ein Schritt nicht klappt oder die Seite einen Fehler wirft.
'use strict';
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const OUT = path.join(__dirname, '..', 'test-output');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

function serve() {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(res);
    });
    srv.listen(0, () => resolve(srv));
  });
}

let count = 0;
async function step(name, fn) {
  const t0 = Date.now(); await fn(); count++;
  console.log(`ok   ${name} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}
function check(ok, msg) { if (!ok) throw new Error(msg); }

// Offline-Speicher: Jede Datei, die das Spiel lädt, muss im Service Worker stehen (und existieren)
function checkOfflineList() {
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  const files = [...sw.match(/const FILES = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
  for (const f of files) if (f !== './' && !fs.existsSync(path.join(ROOT, f))) throw new Error('sw.js nennt eine fehlende Datei: ' + f);
  for (const s of scripts) if (!files.includes(s)) throw new Error('Datei fehlt im Offline-Speicher (sw.js): ' + s);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  checkOfflineList(); console.log('ok   Offline-Liste vollständig');
  const srv = await serve(), url = `http://localhost:${srv.address().port}/`;
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR_/.test(m.text())) errors.push(m.text()); });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const until = (fn, ms) => page.waitForFunction(fn, null, { timeout: ms || 20000 });
  let failed = null;

  try {
    await step('Seite lädt, Menü erscheint', async () => {
      await page.goto(url);
      await until(() => !!window.THREE && typeof GS !== 'undefined' && GS === 'menu', 30000);
    });

    await step('Neues Spiel mit Schwierigkeit „Schwer“', async () => {
      await page.click('#btnNew'); await page.click('.diffbtn[data-diff="schwer"]');
      await until(() => GS === 'story');
      await page.click('#storyBtn'); await until(() => GS === 'shop');
      check(await ev(() => SV.diff) === 'schwer', 'Schwierigkeit wurde nicht gespeichert');
    });

    await step('Shop: Waffe und Granate kaufen, Einstellungen ändern', async () => {
      await ev(() => { SV.money = 500; renderShop(); });
      await page.click('[data-buyw="schleuder"]'); await page.click('[data-gren]');
      const r = await ev(() => ({ w: SV.weapons.schleuder, g: SV.gren }));
      check(r.w === 1 && r.g === 3, 'Kauf hat nicht geklappt: ' + JSON.stringify(r));
      await page.click('#btnSetS');
      await page.selectOption('#optGfx', 'schnell'); await page.selectOption('#optBtn', 'gross'); await page.selectOption('#optAim', 'stark');
      await page.$eval('#optEnv', el => { el.value = '0.2'; el.dispatchEvent(new Event('input')); });
      await page.click('#btnSetBack');
      check(await ev(() => document.body.classList.contains('bigbtn') && OPT.gfx === 'schnell' && OPT.aim === 'stark' && OPT.env === 0.2), 'Einstellungen wurden nicht übernommen');
      await page.click('#btnLeave'); await until(() => GS === 'play');
    });

    await step('Laufen, Sprinten, Ausweichen', async () => {
      const z0 = await ev(() => player.pos.z);
      await page.keyboard.down('KeyW'); await page.keyboard.down('ShiftLeft'); await page.waitForTimeout(800);
      await page.keyboard.press('KeyF'); await page.waitForTimeout(300);
      await page.keyboard.up('ShiftLeft'); await page.keyboard.up('KeyW');
      check(await ev(() => player.dashCd > 0), 'Ausweichen hat nicht ausgelöst');
      check(await ev(z => player.pos.z < z - 0.5, z0), 'Spieler bewegt sich nicht');
    });

    await step('Offene Welt: ohne Wände von einem Gebiet ins nächste laufen', async () => {
      await ev(() => { player.pos.set(-8, 0, REG[0].cz); player.yaw = -Math.PI / 2; });
      check(await ev(() => curArea()) === 0, 'Start nicht im Hof');
      // im Test läuft die Grafik ohne Grafikkarte und damit langsam: laufen, bis die Grenze überquert ist
      await page.keyboard.down('KeyW'); await page.keyboard.down('ShiftLeft');
      await until(() => player.pos.x > 2, 30000).catch(() => { });
      await page.keyboard.up('ShiftLeft'); await page.keyboard.up('KeyW');
      const r = await ev(() => ({ x: player.pos.x, a: curArea(), vis: !!SV.visited[1] }));
      check(r.x > 2 && r.a === 1 && r.vis, 'Nicht in den Finsterwald gekommen: ' + JSON.stringify(r));
      check(await ev(() => areaAt(WX(5, 0), WZ(5, -100)) === 5 && areaAt(WX(2, 0), WZ(2, -60)) === 2 && SAFE.every((s, i) => areaAt(s.x, s.z) === i)), 'Gebiete liegen falsch');
      check(await ev(() => { const p = { x: WX(2, -27), z: WZ(2, -12) }; resolveCircle(p, 0.42, false); return Math.abs(p.x - WX(2, -27)) > 1; }), 'Häuser sind nicht fest');
    });

    await step('Alles ist zu Fuß erreichbar: Unterschlüpfe, Nester, Truhen, Notizen, Portal', async () => {
      const bad = await ev(() => {
        // Flutfüllung in 0,5-m-Schritten ab dem ersten Unterschlupf, mit offener Barriere
        const was = barrier.open; setBarrier(true, true);
        const S = 0.5, W = Math.round((WORLD.x1 - WORLD.x0) / S), H = Math.round((WORLD.z1 - WORLD.z0) / S);
        const seen = new Uint8Array(W * H), q = new Int32Array(W * H), cell = (x, z) => Math.round((z - WORLD.z0) / S) * W + Math.round((x - WORLD.x0) / S);
        let h = 0, t = 0; const s0 = cell(SAFE[0].x - 1.5, SAFE[0].z); seen[s0] = 1; q[t++] = s0;
        while (h < t) {
          const c = q[h++], cx = c % W, cz = (c / W) | 0;
          for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = cx + dx, nz = cz + dz; if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue;
            const k = nz * W + nx; if (seen[k]) continue; seen[k] = 2;
            if (!blockedAt(WORLD.x0 + nx * S, WORLD.z0 + nz * S, 0.42)) { seen[k] = 1; q[t++] = k; }
          }
        }
        setBarrier(was, true);
        const near = (x, z, r) => { for (let dz = -r; dz <= r; dz += S) for (let dx = -r; dx <= r; dx += S) { const k = cell(x + dx, z + dz); if (k >= 0 && k < W * H && seen[k] === 1 && Math.hypot(dx, dz) <= r) return true; } return false; };
        const out = [];
        SAFE.forEach((p, i) => { if (!near(p.x, p.z, 1)) out.push('Unterschlupf ' + i); });
        nests.forEach(n => { if (!near(n.x, n.z, 6)) out.push('Nest ' + n.a); });
        chests.forEach(c => { if (!near(c.x, c.z, 1.4)) out.push('Truhe ' + c.id); });
        notes.forEach(n => { if (!near(n.x, n.z, 1.3)) out.push('Notiz ' + n.id); });
        if (!near(WX(5, 0), WZ(5, -120), 2)) out.push('Portalplatz');
        survivors.forEach(p => { if (!near(p.home[0], p.home[1], 2.5)) out.push('Überlebender ' + p.id); });
        return out;
      });
      check(!bad.length, 'Nicht erreichbar: ' + bad.join(', '));
    });

    await step('Karte: Minikarte antippen und Taste M', async () => {
      await page.click('#mini'); await until(() => GS === 'map' && !$('map').hidden);
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(OUT, 'karte.png') });
      await page.click('#btnMapBack'); await until(() => GS === 'play');
      await page.keyboard.press('KeyM'); await until(() => GS === 'map');
      await page.keyboard.press('KeyM'); await until(() => GS === 'play' && !$('hud').hidden);
    });

    await step('Streuner tauchen in der offenen Welt auf', async () => {
      await ev(() => { clearMonsters(); player.pos.set(WX(3, -10), 0, WZ(3, -30)); roamT = 0; });
      await until(() => monsters.some(m => m.roam), 20000);
    });

    await step('Bruno beißt Monster und bellt, wenn eins von hinten kommt', async () => {
      await ev(() => { clearMonsters(); roamT = 99; player.pos.set(WX(3, -12), 0, WZ(3, -30)); player.yaw = 0; player.inv = 99; dog.pos.set(player.pos.x + 1, 0, player.pos.z); dog.barkCd = 0;
        const m = spawnMonster('ghul', player.pos.x, player.pos.z + 3, { area: 3 }); m.state = 'chase'; m.g.position.y = 0; m.spd = 0; m.cd = 99; m.hp = m.maxHp = 1e6; });
      await until(() => $('msg').textContent.includes('Bruno'), 20000);
      await until(() => monsters[0].hp < monsters[0].maxHp, 20000);
      await ev(() => { clearMonsters(); player.inv = 0; });
    });

    await step('Überlebende finden, mitnehmen und im Unterschlupf retten', async () => {
      const m0 = await ev(() => { const p = survivors[0]; player.pos.set(p.pos.x + 1.5, 0, p.pos.z); return SV.money; });
      await until(() => survivors[0].state === 'follow');
      check(await ev(() => $('objective').textContent.startsWith('Bring')), 'Ziel zeigt nicht zum Unterschlupf');
      await ev(() => { player.pos.set(SAFE[0].x, 0, SAFE[0].z); bringFollowers(); });
      await until(() => survivors[0].state === 'saved');
      check(await ev(m0 => SV.rescued.s0 === 1 && SV.money > m0 && !survivors[0].g.visible, m0), 'Rettung hat nicht geklappt');
    });

    await step('Schnellreise über die Karte, aber nicht mitten im Kampf', async () => {
      await ev(() => { SV.seen[2] = 1; player.pos.set(WX(1, 0), 0, WZ(1, -30)); });
      await page.keyboard.press('KeyM'); await until(() => GS === 'map');
      await page.click('[data-go="2"]'); await until(() => GS === 'play');
      check(await ev(() => Math.hypot(player.pos.x - SAFE[2].x, player.pos.z - SAFE[2].z) < 3 && Math.hypot(dog.pos.x - player.pos.x, dog.pos.z - player.pos.z) < 4 && SV.checkpoint === 2), 'Schnellreise hat nicht geklappt');
      await ev(() => { Object.assign(areaSt[2], { active: true, queue: [{ t: 'kriecher' }], spawnT: 999 }); });
      await page.keyboard.press('KeyM'); await until(() => GS === 'map');
      check(await ev(() => document.querySelector('[data-go]').disabled), 'Schnellreise im Kampf möglich');
      await ev(() => { Object.assign(areaSt[2], { active: false, queue: [], wave: 0, pause: 99 }); });
      await page.keyboard.press('KeyM'); await until(() => GS === 'play');
    });

    await step('Monster passen sich der Ausrüstung an', async () => {
      const r = await ev(() => {
        const keep = SV.weapons; SV.weapons = { holz: 1 }; const weak = areaLevel(5);
        SV.weapons = { holz: 1, rakete: 4 }; const strong = areaLevel(0); SV.weapons = keep;
        return { weak, strong };
      });
      check(r.weak < 5 && r.weak >= 3.5 && r.strong > 0 && r.strong <= 1, 'Anpassung stimmt nicht: ' + JSON.stringify(r));
    });

    await step('Monsternest: Welle startet, Monster erscheinen', async () => {
      await ev(() => { clearMonsters(); player.pos.set(nests[0].x + 6, 0, nests[0].z + 6); player.yaw = 0; player.pitch = 0; });
      await until(() => areaSt[0].active && monsters.some(m => m.wa === 0));
    });

    await step('Alle Waffen, Granate und Fähigkeiten benutzen', async () => {
      await ev(() => { WEAPONS.forEach(w => { SV.weapons[w.id] = 4; }); ABILITIES.forEach(a => { SV.abil[a.id] = 4; }); });
      for (const id of await ev(() => WEAPONS.map(w => w.id))) {
        await ev(id => { SV.cur = id; equipVM(id); swapT = 0; for (const m of monsters) if (m.state !== 'dead') m.g.position.set(player.pos.x, 0, player.pos.z - 2.2); }, id);
        await page.keyboard.down('Space'); await page.waitForTimeout(350); await page.keyboard.up('Space');
      }
      await page.keyboard.press('KeyG');
      for (const k of ['Digit1', 'Digit2', 'Digit3', 'Digit4']) await page.keyboard.press(k);
      await page.waitForTimeout(2500);
      check(await ev(() => SV.kills) > 0, 'Kein Monster wurde besiegt');
    });

    await step('Zwischenboss erscheint, wird besiegt, das Nest ist zerstört', async () => {
      await ev(() => { clearMonsters(); Object.assign(areaSt[0], { wave: 2, active: false, queue: [], pause: 0 }); player.pos.set(nests[0].x + 6, 0, nests[0].z); player.hp = 100; });
      await until(() => areaSt[0].active);
      await ev(() => { areaSt[0].queue = areaSt[0].queue.filter(q => q.mini != null); });
      await until(() => !!barRef && !!barRef.mini, 60000);
      await ev(() => damageMonster(barRef, 1e7, null, false));
      await until(() => !barRef && $('bossbar').hidden);
      await until(() => areaSt[0].done && SV.freed[0] === 1);
      check(await ev(() => !nests[0].eggs.visible && !barrier.open), 'Nest sieht nicht zerstört aus oder Barriere schon offen');
    });

    await step('Weglaufen bricht eine Welle ab', async () => {
      await ev(() => { clearMonsters(); Object.assign(areaSt[1], { wave: 0, active: false, queue: [], pause: 0 }); player.pos.set(nests[1].x + 5, 0, nests[1].z); });
      await until(() => areaSt[1].active);
      await ev(() => { player.pos.set(nests[1].x, 0, nests[1].z + 90); });
      await until(() => !areaSt[1].active && !monsters.some(m => m.wa === 1 && m.state !== 'dead'));
    });

    await step('Barriere fällt nach fünf Nestern, und der Morgen graut', async () => {
      const d0 = await ev(() => dawn);
      await ev(() => { clearMonsters(); for (let a = 1; a < 5; a++) freeNest(a); });
      check(await ev(() => barrier.open && barrier.s.off && freedCount() === 5), 'Barriere ist nicht offen');
      await until(() => dawn > 0.4 && sky.material.uniforms.uDawn.value > 0.4, 30000);
      check(await ev(d0 => dawnTarget() === 0.8 && dawn > d0, d0), 'Es wird nicht heller');
    });

    await step('Endboss erscheint, Sieg-Bildschirm', async () => {
      await ev(() => { clearMonsters(); Object.assign(areaSt[5], { wave: 2, active: false, queue: [], pause: 0 }); player.pos.set(WX(5, 0), 0, WZ(5, -95)); player.hp = 100; });
      await until(() => !!bossRef && bossRef.state !== 'dead', 30000);
      await page.waitForTimeout(1200);
      await page.screenshot({ path: path.join(OUT, 'endboss.png') });
      await ev(() => damageMonster(bossRef, 1e8, null, false));
      await until(() => GS === 'win', 90000);
    });

    await step('Besiegt werden und im Unterschlupf weitermachen', async () => {
      await ev(() => { $('win').hidden = true; SV.checkpoint = 1; resetWorld(1); GS = 'play'; setPlayUI(true); player.pos.z -= 12; hurtPlayer(9999); });
      await until(() => GS === 'dead', 30000);
      await page.click('#btnRespawn'); await until(() => GS === 'play');
      check(await ev(() => Math.abs(player.pos.z - SAFE[1].z) < 0.1 && player.hp === player.maxHp), 'Neustart nicht im Unterschlupf');
    });

    await step('Spielstand bleibt nach dem Neuladen', async () => {
      await page.reload(); await until(() => !!window.THREE && typeof GS !== 'undefined' && GS === 'menu', 30000);
      await page.click('#btnContinue'); await until(() => GS === 'play');
      check(await ev(() => SV.diff === 'schwer' && SV.weapons.feuer === 4), 'Spielstand ging verloren');
      await page.screenshot({ path: path.join(OUT, 'weiterspielen.png') });
    });

    await step('Mara steht an den Unterschlüpfen und spricht', async () => {
      check(await ev(() => maras.length) === 5, 'Mara fehlt an einem Unterschlupf');
      await ev(() => { player.pos.set(SAFE[2].x - 1.7, 0, SAFE[2].z - 5); });
      await until(() => $('say').classList.contains('show') && $('sayText').textContent.length > 5);
    });

    await step('Neue Monster: Krähen fliegen, Schild blockt, Platzer explodiert, Schatten ist unsichtbar', async () => {
      await ev(() => { clearMonsters(); roamT = 99; dog.biteCd = 99; const bx = WX(0, 0), bz = WZ(0, -12); player.pos.set(bx, 0, bz); player.hp = player.maxHp; player.inv = 99;
        for (const [t, x, z] of [['platzer', -3, -9], ['schild', 0.5, -10], ['schatten', 3, -18]]) { const m = spawnMonster(t, bx + x, bz + z, { area: 2 }); m.spd = 0; m.cd = 99; m.state = 'chase'; m.g.position.y = 0; }
        spawnGroup('kraehe', bx, bz - 12, { area: 2 }); });
      await page.waitForTimeout(1500);
      const r = await ev(() => {
        const s = monsters.find(m => m.type === 'schild'); s.g.rotation.y = Math.atan2(player.pos.x - s.g.position.x, player.pos.z - s.g.position.z);
        const h0 = s.hp; damageMonster(s, 100, null, false, 0); const front = h0 - s.hp;
        const p = monsters.find(m => m.type === 'platzer'); damageMonster(p, 1e6, null, false);
        return { crows: monsters.filter(m => m.type === 'kraehe' && m.g.position.y > 1).length, front, burst: !!p.burst, shadow: monsters.find(m => m.type === 'schatten').vis };
      });
      check(r.crows === 3, 'Krähen fliegen nicht: ' + JSON.stringify(r));
      check(r.front < 20, 'Schild blockt nicht: ' + JSON.stringify(r));
      check(r.burst, 'Platzer ist nicht explodiert');
      check(r.shadow < 0.3, 'Schatten ist zu sichtbar: ' + JSON.stringify(r));
      await ev(() => { clearMonsters(); player.inv = 0; });
    });

    await step('Gewitter, Truhe und Opas Notiz', async () => {
      await ev(() => strike());
      check(await ev(() => lightningT > 0 && rainAmt >= 0), 'Blitz hat nicht ausgelöst');
      const before = await ev(() => { const c = chests.find(c => !SV.chests[c.id]); player.pos.set(c.x + 1, 0, c.z); return SV.money; });
      await until(() => Object.keys(SV.chests).length > 0);
      check(await ev(() => SV.money) > before, 'Truhe hat keine Münzen gegeben');
      await ev(() => { const n = notes.find(n => !SV.notes[n.id]); player.pos.set(n.x + 0.5, 0, n.z); });
      await until(() => GS === 'story');
      await page.click('#storyBtn'); await until(() => GS === 'play');
    });

    await step('Ausrüstung kaufen und Spezialkraft auf Stufe 4', async () => {
      await ev(() => { SV.money = 99999; SV.seen[1] = 1; SV.seen.mara = 1; openShelter(1); });
      await page.click('#tabG'); await page.click('[data-gear="ruestung"]');
      check(await ev(() => player.maxHp) === 125, 'Rüstung erhöht das Leben nicht');
      await page.click('#btnLeave'); await until(() => GS === 'play');
      await ev(() => { player.pos.set(WX(1, 0), 0, WZ(1, -30)); SV.weapons.eisen = 4; SV.cur = 'eisen'; equipVM('eisen'); swapT = 0; fireCd = 0; });
      await page.keyboard.down('Space'); await page.waitForTimeout(300); await page.keyboard.up('Space');
      check(await ev(() => projs.some(p => p.wave)), 'Klingenwelle wurde nicht geworfen');
    });

    await step('Unterschlupf in beliebiger Reihenfolge: Mara stellt sich vor, neue Ware', async () => {
      await ev(() => { SV.seen = { 0: 1 }; SV.reached = 0; openShelter(3); });
      await until(() => GS === 'story' && $('storyTitle').textContent === 'Mara');
      await page.click('#storyBtn'); await until(() => GS === 'story' && $('storyTitle').textContent === STORY[3].title);
      check(await ev(() => $('storyText').textContent.includes('Neu bei Mara') && SV.reached === 3 && SV.checkpoint === 3), 'Neue Ware wird nicht genannt');
      await page.click('#storyBtn'); await until(() => GS === 'shop');
      await page.click('#btnMapS'); await until(() => GS === 'map');
      await page.click('#btnMapBack'); await until(() => GS === 'shop');
      await page.click('#btnLeave'); await until(() => GS === 'play');
    });

    await step('Nebenaufgaben: Belohnung und seltene Waffenfarbe', async () => {
      const m0 = await ev(() => { questFill(); return SV.money; });
      await ev(() => { for (let k = 0; k < 40 && !SV.skins.gold; k++) { const a = SV.quest.act[0], d = QUESTS[a.q]; stat(d.st, d.n); } });
      check(await ev(m0 => SV.money > m0 && SV.skins.gold === 1 && SV.quest.done >= 6, m0), 'Aufgaben geben keine Belohnung');
      await ev(() => { SV.seen.mara = 1; SV.seen[2] = 1; openShelter(2); });
      await until(() => GS === 'shop');
      await page.click('#tabQ'); await page.click('[data-skin="gold"]');
      check(await ev(() => SV.skin === 'gold' && vmModels[SV.cur].userData.accent.emissive.getHex() === SKINS.gold.hex), 'Waffenfarbe nicht übernommen');
      await page.click('#btnLeave'); await until(() => GS === 'play');
    });

    await step('Alter Spielstand wird in die offene Welt übernommen', async () => {
      const r = await ev(() => {
        const keep = lsGet(SAVE_KEY);
        lsSet(SAVE_KEY, { money: 10, weapons: { holz: 1 }, cur: 'holz', abil: {}, checkpoint: 3, seen: { 0: 1, 1: 1, 2: 1, 3: 1 }, kills: 0, deaths: 0, time: 0, won: false, gren: 2, diff: 'normal' });
        loadGame(); const out = { freed: Object.keys(SV.freed).join(), reached: SV.reached, mara: SV.seen.mara };
        lsSet(SAVE_KEY, keep); loadGame(); return out;
      });
      check(r.freed === '0,1,2' && r.reached === 3 && r.mara === 1, 'Übernahme falsch: ' + JSON.stringify(r));
    });

    await step('Erfolge werden freigeschaltet und angezeigt', async () => {
      check(await ev(() => !!(ACH.got.blut && ACH.got.portal)), 'Erfolge „Erstes Blut“ oder „Portal geschlossen“ fehlen');
      await ev(() => showMenu());
      await page.click('#btnAchM');
      check(await ev(() => document.querySelectorAll('#achList .ach').length === ERFOLGE.length && document.querySelectorAll('#achList .ach.got').length >= 2), 'Erfolge-Seite unvollständig');
      await page.click('#btnAchBack');
    });

    await step('Endlos-Modus: Welle starten und schaffen', async () => {
      check(!await ev(() => $('btnEndless').hidden), 'Endlos-Modus ist nach dem Sieg nicht freigeschaltet');
      await page.click('#btnEndless'); await until(() => GS === 'play' && MODE === 'endlos');
      await ev(() => { player.pos.z -= 12; EN.breakT = 0.2; });
      await until(() => EN.active && monsters.length > 0, 30000);
      await page.screenshot({ path: path.join(OUT, 'endlos.png') });
      await ev(() => { EN.queue.length = 0; });
      await until(() => { for (const m of monsters) if (m.state !== 'dead') damageMonster(m, 1e7, null, false); return !EN.active && EN.wave === 1; }, 30000);
      check(await ev(() => endlessBest() >= 1), 'Endlos-Rekord wurde nicht gespeichert');
    });
  } catch (e) {
    failed = e;
    await page.screenshot({ path: path.join(OUT, 'fehler.png') }).catch(() => { });
  }

  await browser.close(); srv.close();
  if (errors.length) console.log('Fehler auf der Seite:\n  ' + errors.join('\n  '));
  if (failed) console.log('FEHLGESCHLAGEN: ' + failed.message);
  if (failed || errors.length) process.exit(1);
  console.log(`Alles gut: ${count} Schritte bestanden.`);
})();
