const { chromium } = require('playwright');
const path = require('path');
(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    page.on('pageerror', err => console.log('PAGE:', err.message.substring(0, 200)));
    await page.goto('file:///' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/'));
    await page.waitForSelector('#btn-accept-root', { state: 'visible', timeout: 5000 });
    await page.evaluate(() => { acceptRoot('common'); });
    await page.waitForTimeout(200);
    await page.evaluate(() => { closeIntroModal(); });
    await page.waitForTimeout(200);
    // Suppress DOM functions
    await page.evaluate(() => {
        window.addLog = function() {};
        window.updateUI = function() {};
        window.updateTickUI = function() {};
        window.renderSects = function() {};
        window.renderExpeditions = function() {};
        window.renderAdventures = function() {};
        window.renderArtifacts = function() {};
        window.renderTechniques = function() {};
        window.renderMilestones = function() {};
        game.setDebugSpeed(5);
    });

    for (let i = 0; i < 300; i++) {
        try {
            await page.evaluate(() => {
                if (game.canBreakthrough()) game.breakthrough();
                if (!game.sect) {
                    for (const sid of ['jade_purity','crimson_flame','moon_lake']) {
                        if (game.canJoinSect(sid)) { game.joinSect(sid); break; }
                    }
                }
                if (!game.expedition && typeof LOCATIONS !== 'undefined') {
                    for (const loc of LOCATIONS) {
                        if (game.canStartExpedition(loc.id)) { game.startExpedition(loc.id); break; }
                    }
                }
            });
        } catch (e) {
            console.log(`CRASH at tick ${i}: ${e.message.substring(0, 300)}`);
            break;
        }
        if (i % 50 === 0) {
            const s = await page.evaluate(() => ({
                age: game.characterAge(), realm: game.realmIndex,
                dead: game.gameOver, qi: Math.floor(game.qi)
            }));
            console.log(`[${i}] age:${s.age} realm:${s.realm} qi:${s.qi} dead:${s.dead}`);
        }
        await page.waitForTimeout(500);
    }
    await browser.close();
})();
