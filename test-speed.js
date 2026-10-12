const { chromium } = require('playwright');
const path = require('path');
(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('file:///' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/'));

    // Listen to page errors
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

    await page.waitForSelector('#btn-accept-root', { state: 'visible', timeout: 5000 });
    await page.evaluate(() => { acceptRoot('common'); });
    await page.waitForTimeout(200);
    await page.evaluate(() => { closeIntroModal(); });
    await page.waitForTimeout(200);

    console.log('Before setDebugSpeed...');
    try {
        await page.evaluate(() => { setDebugSpeed(10); });
        console.log('setDebugSpeed OK');
    } catch(e) { console.log('setDebugSpeed ERROR:', e.message); }

    // Now test full bot cycle
    for (let i = 0; i < 10; i++) {
        await page.waitForTimeout(2000);

        try {
            // Activities
            await page.evaluate(() => {
                const g = game;
                const qiPct = g.qi / g.qiNeeded();
                if (qiPct < 0.75) {
                    if (g.currentActivity !== 'meditation') g.setActivity('meditation');
                }
            });

            // Breakthrough
            await page.evaluate(() => {
                if (game.canBreakthrough()) game.breakthrough();
            });

            // Sect
            await page.evaluate(() => {
                if (!game.sect) {
                    const sects = ['jade_purity', 'crimson_flame', 'moon_lake'];
                    for (const sid of sects) {
                        if (game.canJoinSect(sid)) { game.joinSect(sid); break; }
                    }
                }
            });

            // Expeditions
            await page.evaluate(() => {
                if (!game.expedition && typeof LOCATIONS !== 'undefined') {
                    for (const loc of LOCATIONS) {
                        if (game.canStartExpedition(loc.id)) {
                            game.startExpedition(loc.id);
                            break;
                        }
                    }
                }
            });
        } catch(e) {
            console.log('ERROR in tick ' + i + ':', e.message);
        }

        const s = await page.evaluate(() => ({
            qi: Math.floor(game.qi), max: game.qiNeeded(),
            speed: game.debugSpeed, age: game.characterAge(),
            realm: game.realmIndex, sub: game.subLevel,
            dead: game.gameOver, act: game.currentActivity,
            sect: game.sect ? game.sect.id : null,
            exp: game.expedition ? game.expedition.locationId : null
        }));
        console.log(`[${i*2}s] r${s.realm}.${s.sub} qi:${s.qi}/${s.max} age:${s.age} spd:${s.speed} ${s.act} sect:${s.sect} exp:${s.exp} dead:${s.dead}`);
        if (s.dead) break;
    }
    await browser.close();
})();
