const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');

(async () => {
    const browser = await chromium.launch({headless: true});
    try {
        const page = await browser.newPage({viewport: {width: 1500, height: 1100}});
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.addInitScript(() => window.addEventListener('load', () => game.stop()));
        await page.goto(pathToFileURL(path.join(__dirname, 'index.html')).href);
        await page.evaluate(() => {
            game.reset(); game.stop();
            document.querySelectorAll('.modal-overlay.active').forEach(el => el.classList.remove('active'));
            game.selectSpiritualRoot('common'); game.learnTechnique('basic_breathing');
            game.realmIndex = 7; game.subLevel = 2; game.strength = game.spirit = 1000;
            game.stones = 10000; game.years = 2000; game.birthYear = 1000; game.qi = 0;
            game.joinSect('jade_purity'); game.sect.contribution = 8000; game.sect.rank = game.getSectRankIndex();
            game.worldEvent = null; Math.random = () => .5;
            switchTab('expeditions'); updateUI();
        });
        let passed = 0;
        async function check(name, fn) { await fn(); passed++; console.log(`PASS ${name}`); }
        const palace = () => page.locator('.expedition-card').filter({has: page.locator('.expedition-name', {hasText: 'Дворец Павшего Бессмертного'})});
        const preview = await page.evaluate(() => game.getExpeditionCultivationReward(LOCATIONS.find(l => l.id === 'immortal_palace')));

        await check('Дворец показывает ци, 60 лет, постижение и предел полоски до отправления', async () => {
            const text = await palace().innerText();
            const formatted = await page.evaluate(qi => qi.toLocaleString('ru-RU'), preview.qi);
            assert.ok(text.includes(formatted)); assert.ok(text.includes('60 лет'));
            assert.ok(text.includes('Дао:')); assert.ok(text.includes('избыток не сохраняется'));
            assert.ok(text.includes('небесный'));
        });
        await check('Один настоящий клик отправляет и сохраняет обещанные ци/Дао', async () => {
            await palace().getByRole('button', {name: /Отправиться/}).click();
            const actual = await page.evaluate(() => ({id: game.expedition?.locationId, reward: game.expedition?.cultivationReward, stones: game.stones}));
            assert.equal(actual.id, 'immortal_palace'); assert.deepEqual(actual.reward, preview);
            assert.equal(actual.stones, 9900);
            await page.evaluate(() => saveGame());
        });
        await check('Перезагрузка сохраняет обещание; текущие бонусы не подменяют его', async () => {
            await page.reload();
            await page.evaluate(() => {
                game.stop(); game.spirit *= 2;
                game.worldEvent = {...WORLD_EVENTS.find(e => e.id === 'secret_realm'), startYear: game.years};
                switchTab('expeditions'); updateUI();
            });
            assert.deepEqual(await page.evaluate(() => game.expedition.cultivationReward), preview);
            assert.ok((await palace().innerText()).includes(await page.evaluate(qi => qi.toLocaleString('ru-RU'), preview.qi)));
        });
        await check('Возвращение выдаёт обещанную ци один раз и показывает фактическую награду', async () => {
            const actual = await page.evaluate(() => {
                game.years += game.getAdjustedExpeditionDuration(); game.tickExpedition();
                const first = game.qi; game.tickExpedition();
                return {first, second: game.qi, needed: game.qiNeeded(), expedition: game.expedition, rewards: game.lastExpeditionReward.rewards};
            });
            assert.equal(actual.first, preview.qi); assert.equal(actual.second, actual.first);
            assert.ok(actual.first <= actual.needed); assert.equal(actual.expedition, null);
            assert.ok(actual.rewards.some(reward => reward.endsWith(' ци')));
            assert.ok((await page.locator('.expedition-last-items').innerText()).includes('ци'));
        });
        assert.deepEqual(errors, []);
        console.log(`${passed} passed, 0 failed; pageerrors=0`);
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
