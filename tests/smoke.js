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

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
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
      await page.click('#btnSetBack');
      check(await ev(() => document.body.classList.contains('bigbtn') && OPT.gfx === 'schnell' && OPT.aim === 'stark'), 'Einstellungen wurden nicht übernommen');
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

    await step('Welle startet, Monster erscheinen', async () => {
      await ev(() => { player.pos.set(0, 0, -30); });
      await until(() => areaSt[0].active && monsters.length > 0);
    });

    await step('Alle Waffen, Granate und Fähigkeiten benutzen', async () => {
      await ev(() => { WEAPONS.forEach(w => { SV.weapons[w.id] = 4; }); ABILITIES.forEach(a => { SV.abil[a.id] = 4; }); });
      for (const id of await ev(() => WEAPONS.map(w => w.id))) {
        await ev(id => { SV.cur = id; equipVM(id); swapT = 0; for (const m of monsters) if (m.state !== 'dead') m.g.position.set(0, 0, player.pos.z - 2.2); }, id);
        await page.keyboard.down('Space'); await page.waitForTimeout(350); await page.keyboard.up('Space');
      }
      await page.keyboard.press('KeyG');
      for (const k of ['Digit1', 'Digit2', 'Digit3', 'Digit4']) await page.keyboard.press(k);
      await page.waitForTimeout(2500);
      check(await ev(() => SV.kills) > 0, 'Kein Monster wurde besiegt');
    });

    await step('Zwischenboss erscheint und wird besiegt', async () => {
      await ev(() => { clearMonsters(); Object.assign(areaSt[0], { wave: 2, active: false, queue: [] }); player.pos.set(0, 0, -95); player.hp = 100; });
      await until(() => areaSt[0].active);
      await ev(() => { areaSt[0].queue = areaSt[0].queue.filter(q => q.mini != null); });
      await until(() => !!barRef && !!barRef.mini, 60000);
      await ev(() => damageMonster(barRef, 1e7, null, false));
      await until(() => !barRef && $('bossbar').hidden);
    });

    await step('Endboss erscheint, Sieg-Bildschirm', async () => {
      await ev(() => { clearMonsters(); for (let a = 0; a < 5; a++) { areaSt[a].done = true; setBarrier(a, true, true); } Object.assign(areaSt[5], { wave: 2, active: false, queue: [] }); player.pos.set(0, 0, -745); player.hp = 100; });
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
