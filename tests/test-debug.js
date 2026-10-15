const PROJECT_ROOT = require('node:path').resolve(__dirname, '..');
const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const filePath = path.resolve(PROJECT_ROOT, 'index.html').replace(/\\/g, '/');
    await page.goto(`file:///${filePath}`);

    await page.waitForSelector('#btn-accept-root', { state: 'visible', timeout: 5000 });
    await page.evaluate(() => { acceptRoot('common'); });
    await page.waitForTimeout(300);
    await page.evaluate(() => { closeIntroModal(); });
    await page.waitForTimeout(300);
    await page.evaluate(() => { setDebugSpeed(10); });

    // Проверяем каждую секунду
    for (let i = 0; i < 20; i++) {
        await page.waitForTimeout(1000);
        const s = await page.evaluate(() => ({
            qi: Math.floor(game.qi),
            qiMax: game.qiNeeded(),
            canBT: game.canBreakthrough(),
            realm: game.realmIndex,
            sub: game.subLevel,
            age: game.characterAge(),
            act: game.currentActivity,
            dead: game.gameOver,
            speed: game._debugSpeed,
            started: !!game._tickTimer,
            qiRate: typeof game.qiPerSec === 'function' ? game.qiPerSec() : 'N/A'
        }));
        console.log(`[${i}s] qi:${s.qi}/${s.qiMax} canBT:${s.canBT} realm:${s.realm}.${s.sub} age:${s.age} act:${s.act} speed:${s.speed} timers:${s.started} rate:${s.qiRate} dead:${s.dead}`);

        if (s.canBT) {
            const r = await page.evaluate(() => game.breakthrough());
            console.log(`  → ПРОРЫВ: ${JSON.stringify(r)}`);
        }
        if (s.dead) { console.log('DEAD'); break; }
    }

    await browser.close();
})();
