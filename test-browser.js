// Проверки настоящего DOM и перезагрузки в отдельном временном профиле Chromium.
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    try {
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(pathToFileURL(path.join(__dirname, 'index.html')).href);
        await page.locator('#btn-accept-root').click();
        await page.locator('#intro-modal button').click();
        await page.evaluate(() => game.stop());
        assert.equal(await page.evaluate(() => EVENTS.some(e => e.id === 'rumor_lost_caravan')), true);

        await page.evaluate(() => {
            for (const realm of [0, 3, 7, 10, 14]) {
                game.realmIndex = realm;
                game.subLevel = 1;
                game.sect = realm >= 3 ? { id: 'jade_purity', rank: 0, contribution: 1000 } : null;
                for (const activity of ['meditation', 'body', 'dao', 'fate']) {
                    game.currentActivity = activity;
                    game.tick();
                    updateUI();
                    updateTickUI();
                }
                for (const tab of [...document.querySelectorAll('.tab-btn')]) switchTab(tab.dataset.tab);
            }
        });
        console.log('PASS запуск и все вкладки на пяти реалмах');

        await page.evaluate(() => {
            game.reset(); game.selectSpiritualRoot('common'); game.learnTechnique('basic_breathing');
            switchTab('techniques');
        });
        assert.equal(await page.locator('#btn-insight-multi10').isDisabled(), true);
        await page.evaluate(() => { game.daoEssence = game.getInsightBulkCost(10); updateTickUI(); });
        assert.equal(await page.locator('#btn-insight-multi10').isDisabled(), false);
        await page.locator('#btn-insight-multi10').click();
        assert.deepEqual(await page.evaluate(() => ({ essence: game.daoEssence, uses: game._insightUses })), { essence: 0, uses: 10 });
        console.log('PASS кнопка ×10 обновляется и списывает точную цену');

        await page.evaluate(() => {
            game.techLevels.basic_breathing=4;
            game.techXP.basic_breathing=game.techXpNeeded('basic_breathing')-1;
            game._insightUses=0;game.daoEssence=game.getInsightCost();renderTechniques();
        });
        await page.waitForFunction(()=>document.getElementById('btn-insight-multi10').title==='1 озарение: 10 эссенции');
        assert.equal(await page.locator('#btn-insight-multi10').isDisabled(),false);
        assert.match(await page.locator('#btn-insight-multi10').getAttribute('title'),/1 озарение: 10 эссенции/);
        await page.locator('#btn-insight-multi10').click();
        const instant=await page.evaluate(()=>({essence:game.daoEssence,uses:game._insightUses,level:game.techLevels.basic_breathing,
            xp:game.techXP.basic_breathing,pending:game._pendingInsightXP,ticks:game._insightTicksLeft}));
        assert.equal(instant.level,5);assert.equal(instant.essence,0);assert.equal(instant.uses,1);
        assert.equal(instant.pending,null);assert.equal(instant.ticks,0);
        await page.waitForFunction(()=>document.getElementById('btn-insight-multi10').disabled);
        assert.equal(await page.locator('#btn-insight-multi10').isDisabled(),true);
        await page.evaluate(()=>saveGame());await page.reload();
        assert.deepEqual(await page.evaluate(()=>{game.stop();return {essence:game.daoEssence,uses:game._insightUses,level:game.techLevels.basic_breathing,
            xp:game.techXP.basic_breathing,pending:game._pendingInsightXP,ticks:game._insightTicksLeft};}),instant);
        console.log('PASS До 10 Озарений покупает последнюю полезную порцию сразу и переживает перезагрузку');

        await page.evaluate(()=>{
            game.reset();game.selectSpiritualRoot('common');game.learnTechnique('basic_breathing');
            game.daoEssence=90;game._insightUses=1;game.techXP.basic_breathing=5;
            game._pendingInsightXP={basic_breathing:7};game._insightTicksLeft=4;saveGame();
        });
        await page.reload();
        const paid=await page.evaluate(()=>{game.stop();saveGame();return {xp:game.techXP.basic_breathing,essence:game.daoEssence,
            uses:game._insightUses,pending:game._pendingInsightXP,ticks:game._insightTicksLeft};});
        assert.deepEqual(paid,{xp:12,essence:90,uses:1,pending:null,ticks:0});
        await page.reload();
        assert.deepEqual(await page.evaluate(()=>{game.stop();return {xp:game.techXP.basic_breathing,essence:game.daoEssence,
            uses:game._insightUses,pending:game._pendingInsightXP,ticks:game._insightTicksLeft};}),paid);
        console.log('PASS Оплаченный XP старой очереди выдаётся сразу один раз между двумя перезагрузками');

        await page.evaluate(() => {
            game.reset(); game.selectSpiritualRoot('common'); game.realmIndex = 7; game.daoEssence = 100000;
            game.joinSect('jade_purity'); game.techLevels.jade_meditation = 12;
            game.ascendTechnique('jade_meditation'); saveGame();
        });
        await page.reload();
        assert.deepEqual(await page.evaluate(() => {
            game.stop();
            return { tier: TECHNIQUES.find(t => t.id === 'jade_meditation').tier, level: game.techLevels.jade_meditation, essence: game.daoEssence };
        }), { tier: 'epic', level: 1, essence: 99600 });
        console.log('PASS вознесение техники секты после настоящей перезагрузки');

        await page.evaluate(() => {
            game.reset(); game.selectSpiritualRoot('common'); game.realmIndex = 3;
            game.spirit = 100; game.stones = 1000; game.daoEssence = 100; game.artifactDust = 100;
            game.expeditionCompletions.spirit_forest = 10;
            game.addAdventureRumor('ascend_spirit_forest'); game.acceptAdventure('ascend_spirit_forest');
            game.chooseAdventureOption(0, 0); game.chooseAdventureOption(0, 0); saveGame();
        });
        await page.reload();
        assert.deepEqual(await page.evaluate(() => {
            game.stop(); game.years += 25; game.tickAdventures();
            return { ascended: game.ascendedLocations.spirit_forest, technique: game.hasTechnique('stone_meditation'), active: game.activeAdventures.length };
        }), { ascended: 1, technique: true, active: 0 });
        console.log('PASS отложенная награда приключения после перезагрузки');

        const preview = await page.evaluate(() => {
            game.reset(); game.stop(); game.selectSpiritualRoot('common');
            game.realmIndex=7; game.years=2200; game.luck=35; game.strength=1000;
            game.sect={id:'jade_purity',rank:4,contribution:7200}; game.daoLevel=5;
            game.prestige.lastBody='wandering_warrior'; game.prestige.bodyAscensions.wandering_warrior=1;
            game.ascendedLocations.forgotten_ruins=2;
            renderExpeditions();
            const loc=LOCATIONS.find(l=>l.id==='forgotten_ruins');
            const mult=game.getExpeditionRewardMultipliers(loc);
            const text=[...document.querySelectorAll('.expedition-card')]
                .find(card=>card.textContent.includes(game.getLocationName(loc.id))).textContent;
            const stones=[Math.floor(loc.rewards.stones.min*mult.stones),Math.floor(loc.rewards.stones.max*mult.stones)];
            return {text,stones,essence:[Math.floor(loc.rewards.essence.min*mult.resources),Math.floor(loc.rewards.essence.max*mult.resources)]};
        });
        assert.ok(preview.text.includes(`Камни: ${preview.stones[0]}–${preview.stones[1]}`));
        assert.ok(preview.text.includes(`Эссенция: ${preview.essence[0]}–${preview.essence[1]}`));
        assert.ok(preview.text.includes('Свиток: 1 гарантированно'));
        assert.ok(!preview.text.includes('превосходство'));
        const reward = await page.evaluate(() => {
            game.stones=100000; game.daoEssence=0; game.artifactDust=0; game.pills=0;
            Math.random=()=>.5; game.startExpedition('forgotten_ruins'); game._completeExpedition();
            return {stones:game.stones-100000,essence:game.daoEssence,dust:game.artifactDust,pills:game.pills};
        });
        assert.deepEqual(reward,{stones:484,essence:228,dust:179,pills:17});
        console.log('PASS предпросмотр экспедиции совпадает с ограниченной наградой');

        await page.evaluate(() => { game.stones=987654; game.daoEssence=123456; saveGame(); });
        await page.reload();
        assert.deepEqual(await page.evaluate(() => {
            game.stop();
            return {stones:game.stones,essence:game.daoEssence,ascend:game.ascendedLocations.forgotten_ruins};
        }), {stones:987654,essence:123456,ascend:2});
        console.log('PASS существующие ресурсы и вознесения сохранены после обновления');

        const earned = await page.evaluate(() => {
            game.reset(); game.selectSpiritualRoot('common'); game.realmIndex = 3; game.years = 160;
            showRebirthModal(false); return game.prestige.karma;
        });
        await page.reload();
        assert.equal(await page.locator('#rebirth-modal').evaluate(el => el.classList.contains('active')), true);
        assert.deepEqual(await page.evaluate(() => ({ karma: game.prestige.karma, timer: game.tickTimer, rebirths: game.prestige.totalRebirths })), { karma: earned, timer: null, rebirths: 0 });
        await page.evaluate(() => showRebirthModal(true));
        assert.equal(await page.evaluate(() => game.prestige.karma), earned);
        await page.evaluate(() => performRebirth());
        assert.equal(await page.evaluate(() => game.prestige.karma), earned);
        await page.reload();
        assert.equal(await page.locator('#root-modal').evaluate(el => el.classList.contains('active')), true);
        assert.equal(await page.evaluate(() => game.tickTimer), null);
        console.log('PASS карма не дублируется, выбор перерождения и корня возобновляется');

        const deadSave = await page.evaluate(() => {
            game.selectSpiritualRoot('common'); game.gameOver = true;
            game.pendingRebirth = null; return JSON.stringify(getSaveableState());
        });
        assert.equal(await page.evaluate(json => importSave(json), deadSave), true);
        assert.equal(await page.evaluate(() => game.tickTimer), null);
        assert.equal(await page.locator('#death-banner').isVisible(), true);
        console.log('PASS импорт умершего персонажа не запускает таймеры');

        assert.deepEqual(errors, [], `Ошибки браузера: ${errors.join('; ')}`);
        console.log('\n11 browser checks passed, 0 page errors');
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
