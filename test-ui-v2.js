// Проверки V2 в отдельном временном профиле: сохранения, реальные клики и адаптивность.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

async function screenshotWithScenery(page, options) {
    await page.locator('img.scenery-image:visible').evaluateAll(images => Promise.all(images.map(async image => {
        image.loading = 'eager';
        await image.decode();
    })));
    await page.screenshot(options);
}

(async () => {
    const browser = await chromium.launch({ headless: true });
    const url = pathToFileURL(path.join(__dirname, 'index-v2.html')).href;
    const output = process.env.V2_PREVIEW_DIR || path.join(__dirname, 'ui', 'v2', 'previews');
    const errors = [];
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.on('pageerror', error => errors.push(error.message));
    let checks = 0;
    const pass = name => { checks++; console.log(`PASS ${name}`); };
    try {
        fs.mkdirSync(output, { recursive: true });
        await page.goto(url);
        await page.locator('#btn-accept-root').click();
        assert.match(await page.locator('#intro-modal').innerText(), /Накопите ци/);
        await page.locator('#intro-modal button').click();
        const startingLore = await page.locator('#v2-next-step').innerText();
        await page.locator('#btn-pause').click();
        assert.match(await page.locator('#v2-current-activity').innerText(), /паузе/);
        assert.equal(await page.locator('#v2-next-step').innerText(), startingLore);
        pass('Понятный старт и немедленное отображение паузы');
        await page.locator('#btn-pause').click();
        await screenshotWithScenery(page, { path: path.join(output, 'first-steps.png'), fullPage: true });
        await page.locator('#btn-pause').click();
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 0)));

        await page.evaluate(() => { game.realmIndex = 1; updateUI(); });
        assert.equal(await page.locator('#tab-btn-artifacts').isVisible(), false);
        await page.evaluate(() => {
            game.realmIndex = 0;
            game.addArtifact(game.generateArtifact('common'));
            updateUI();
        });
        assert.equal(await page.locator('#tab-btn-artifacts').isVisible(), true);
        await page.locator('#tab-btn-artifacts').click();
        await page.evaluate(() => { game.removeArtifact(game.artifacts[0].id); updateUI(); });
        await page.waitForFunction(() => document.getElementById('tab-cultivation').classList.contains('active'));
        assert.equal(await page.locator('#tab-btn-artifacts').isVisible(), false);
        pass('Артефакты открываются с первым предметом; пустая активная вкладка закрывается');

        await page.evaluate(() => {
            game.realmIndex = 3; game.subLevel = 1;
            game.sect = { id: 'jade_purity', rank: 0, contribution: 1000 };
            game.daoLevel = 0; game.qi = game.qiNeeded(); updateUI();
        });
        assert.equal(await page.locator('#btn-breakthrough').isDisabled(), true);
        assert.match(await page.locator('#v2-goal-checklist').innerText(), /Путь секты 0 \/ 1/);
        assert.ok((await page.locator('#dao-desc').innerText()).length > 15);
        assert.match(await page.locator('#activity-info-dao').innerText(), /Путь секты/);
        await page.evaluate(() => { game.daoLevel = 1; game.setActivity('body'); });
        assert.equal(await page.locator('#btn-breakthrough').isDisabled(), false);
        assert.equal(await page.locator('#bt-chance-text').isVisible(), true);
        assert.equal(await page.locator('#v2-breakthrough-risk').isVisible(), true);
        assert.equal(await page.locator('#v2-qi-overview').isVisible(), true);
        pass('Условия, вероятность и последствия прорыва видны при тренировке');

        await page.evaluate(() => {
            game.realmIndex = 9; game.subLevel = 4; game.daoLevel = 99;
            game.qi = game.qiNeeded(); game.prestige.totalRebirths = 0;
            game.prestige.karma = 0; game.prestige.karmaSpent = 0; updateUI();
        });
        assert.equal(await page.locator('#btn-breakthrough').isDisabled(), true);
        assert.equal(await page.locator('#breakthrough-badge').isVisible(), false);
        assert.match(await page.locator('#v2-goal-checklist').innerText(), /Перерождения 0/);
        await page.evaluate(() => { game.realmIndex = 14; game.currentActivity = 'meditation'; updateUI(); });
        assert.equal(await page.locator('#btn-breakthrough').isDisabled(), true);
        assert.match(await page.locator('#v2-goal-title').innerText(), /вершина/i);
        assert.equal(await page.locator('#main-progress-title').innerText(), 'Запас ци');
        assert.doesNotMatch(await page.locator('#dao-desc').innerText(), /Нужен.*прорыв/);
        pass('Небесный барьер и последняя ступень не предлагают невозможный прорыв');

        await page.evaluate(() => {
            game.realmIndex = 3; game.subLevel = 1; game.daoLevel = 3;
            game.years = 40; game.birthYear = 0; game.gameOver = false;
            game.pills = 100; game.refinedPills = 20; game.spiritualPills = 10; game.heavenlyPills = 10;
            game.artifactDust = 5000; game.qi = 0; game.currentActivity = 'meditation'; updateUI();
        });
        await page.locator('#v2-pill-amount').selectOption('10');
        await page.evaluate(() => { updateTickUI(); updateUI(); });
        assert.equal(await page.locator('#v2-pill-amount').inputValue(), '10');
        const recipe = await page.evaluate(() => ({ pills: game.getRefineCount() * 10, dust: game.getRefineCost(1) * 10, old: game.pills }));
        await page.locator('.pill-row').first().getByRole('button', { name: 'Очистить', exact: true }).click();
        assert.deepEqual(await page.evaluate(() => ({ pills: game.pills, refined: game.refinedPills, dust: game.artifactDust })), {
            pills: recipe.old - recipe.pills, refined: 30, dust: 5000 - recipe.dust
        });
        await page.evaluate(() => { game.qi = game.qiNeeded(); updateUI(); });
        await page.waitForFunction(() => document.querySelector('.pill-row .pill-use-btns button').disabled);
        assert.equal(await page.locator('.pill-row').first().getByRole('button', { name: 'Принять', exact: true }).isDisabled(), true);
        const spiritual = page.locator('.pill-row').filter({ has: page.locator('.pill-name', { hasText: 'Духовная' }) });
        assert.equal(await spiritual.getByRole('button', { name: 'Принять', exact: true }).isDisabled(), false);
        await spiritual.getByRole('button', { name: 'Принять', exact: true }).click();
        assert.equal(await page.evaluate(() => game.spiritualPills), 0);
        assert.equal(await page.evaluate(() => game.flags._pillBreakthroughBonus), 0.25);
        await page.waitForFunction(() => ![...document.querySelectorAll('.pill-name')].some(el => el.textContent === 'Духовная'));
        pass('Количество пилюль сохраняется, реальные клики списывают ровно одну покупку');

        await page.evaluate(() => { game.stones = 100000; game.strength = 60; switchTab('expeditions'); updateUI(); });
        const location = 'spirit_forest';
        const expeditionCard = page.locator(`.expedition-card[data-location="${location}"]`);
        assert.equal(await expeditionCard.count(), 1);
        await page.evaluate(() => { renderExpeditions(); updateUI(); });
        assert.equal(await page.locator('#expeditions-list details, #expeditions-list .v2-expedition-rare-rewards, #expeditions-list .v2-expedition-conditions, #expeditions-list .expedition-ascend-progress').count(), 0);
        assert.doesNotMatch(await expeditionCard.locator('.v2-expedition-main-rewards').innerText(), /\d|%/);
        const before = await page.evaluate(id => {
            const location = LOCATIONS.find(loc => loc.id === id);
            const tier = game.ascendedLocations[id] || 0;
            return { stones: game.stones, cost: (location.entryCost || 0) * (tier >= 2 ? 3 : tier >= 1 ? 2 : 1) };
        }, location);
        await expeditionCard.getByRole('button', { name: 'Отправиться', exact: true }).click();
        const started = await page.evaluate(() => ({ id: game.expedition?.locationId, stones: game.stones }));
        assert.equal(started.id, location);
        assert.equal(started.stones, before.stones - before.cost);
        pass('Поход показывает виды добычи без подробностей; отправление списывает плату один раз');

        await page.evaluate(() => {
            game.expedition = null; game.daoEssence = 5000;
            game.learnTechnique('basic_breathing'); switchTab('techniques'); updateUI();
        });
        const oldEssence = await page.evaluate(() => game.daoEssence);
        const cost = await page.evaluate(() => game.getInsightCost());
        await page.locator('#btn-insight').click();
        assert.equal(await page.evaluate(() => game.daoEssence), oldEssence - cost);
        assert.match(await page.locator('#btn-insight').innerText(), /Обучить техники/);
        assert.match(await page.locator('#btn-insight-multi10').innerText(), /эссенции/);
        pass('Обучение техник показывает цену и списывает её ровно один раз');

        // Поздний настоящий сейв открывает все системы; игровые таймеры выключены только в тесте.
        const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'test-fixtures', 'player-report-v14.json'), 'utf8'));
        await page.evaluate(saved => { game.stop(); applyLoadedState(saved); game.stop(); game._paused = true; updateUI(); }, fixture);
        const tabs = ['cultivation', 'sect', 'expeditions', 'adventures', 'artifacts', 'techniques', 'milestones', 'options', 'guide'];
        for (const width of [1440, 1280, 768, 390]) {
            await page.setViewportSize({ width, height: width < 800 ? 844 : 900 });
            for (const tab of tabs) {
                await page.evaluate(id => { switchTab(id); updateUI(); }, tab);
                const geometry = await page.evaluate(() => ({ width: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
                if (geometry.content > geometry.width + 1) console.log(await page.evaluate(() => [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > document.documentElement.clientWidth + 1 && el.getBoundingClientRect().width > 0).map(el => ({ tag: el.tagName, id: el.id, cls: el.className, width: Math.round(el.getBoundingClientRect().width) })).slice(-18)));
                assert.ok(geometry.content <= geometry.width + 1, `${tab}: horizontal overflow at ${width}: ${JSON.stringify(geometry)}`);
            }
        }
        pass('Все 9 разделов позднего сейва помещаются на 1440/1280/768/390 px');

        await page.evaluate(() => { switchTab('artifacts'); updateUI(); });
        await page.locator('.artifact-row').first().click();
        await page.locator('.artifact-forge-panel').waitFor();
        const forgeGeometry = await page.evaluate(() => ({ width: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
        assert.ok(forgeGeometry.content <= forgeGeometry.width + 1, `forge overflow: ${JSON.stringify(forgeGeometry)}`);
        await page.getByRole('button', { name: 'Разобрать несколько…', exact: true }).click();
        const popup = page.locator('.bulk-popup');
        await popup.waitFor();
        assert.equal(await popup.evaluate(el => el.scrollWidth <= el.clientWidth + 1), true);
        await page.evaluate(() => closeBulkDisassembleMenu());
        pass('Заточка и меню массового разбора помещаются на телефоне');

        fs.mkdirSync(output, { recursive: true });
        await page.setViewportSize({ width: 1440, height: 1050 });
        await page.evaluate(() => { switchTab('cultivation'); game._paused = true; updateUI(); });
        await screenshotWithScenery(page, { path: path.join(output, 'desktop.png'), fullPage: true });
        await page.setViewportSize({ width: 390, height: 844 });
        await screenshotWithScenery(page, { path: path.join(output, 'mobile.png'), fullPage: true });

        await page.evaluate(() => { game.stop(); game.gameOver = true; showRebirthModal(false); });
        assert.equal(await page.locator('#rebirth-modal').isVisible(), true);
        assert.match(await page.locator('.v2-rebirth-summary').innerText(), /сохран|Сохран/);
        assert.equal(await page.locator('.rebirth-modal').evaluate(el => el.scrollWidth <= el.clientWidth + 1), true);
        const rebirths = await page.evaluate(() => game.prestige.totalRebirths);
        await page.evaluate(() => { selectedRebirthBody = 'unknown_body'; performRebirth(); });
        assert.equal(await page.locator('#rebirth-modal').isVisible(), true);
        assert.equal(await page.evaluate(() => game.prestige.totalRebirths), rebirths);
        await page.evaluate(() => selectBody('peasant'));
        await page.getByRole('button', { name: 'Начать новый путь', exact: true }).click();
        assert.equal(await page.evaluate(() => game.prestige.totalRebirths), rebirths + 1);
        assert.equal(await page.locator('#root-modal').isVisible(), true);
        await page.locator('.root-card:not(.root-locked)').first().click();
        await page.locator('#btn-accept-root').click();
        assert.equal(await page.locator('#root-modal').isVisible(), false);
        assert.equal(await page.evaluate(() => !!game.spiritualRoot), true);
        await page.evaluate(() => game.stop());
        pass('Перерождение показывает потери, отвергает закрытое тело и начинает новую жизнь');

        const isolated = await browser.newContext();
        const savePage = await isolated.newPage();
        savePage.on('pageerror', error => errors.push(error.message));
        await savePage.addInitScript(saved => {
            if (location.pathname.endsWith('index-v2.html') && !localStorage.getItem('cultivation_game_save')) {
                localStorage.setItem('cultivation_game_save', JSON.stringify(saved));
            }
        }, fixture);
        await savePage.goto(url);
        const original = await savePage.evaluate(() => localStorage.getItem('cultivation_game_save'));
        assert.equal(await savePage.evaluate(() => localStorage.getItem('cultivation_game_save_v2')), original);
        await savePage.evaluate(() => { game.stop(); game.stones = 12345; saveGame(); });
        assert.equal(await savePage.evaluate(() => localStorage.getItem('cultivation_game_save')), original);
        await savePage.reload();
        assert.equal(await savePage.evaluate(() => game.stones), 12345);
        assert.equal(await savePage.evaluate(() => localStorage.getItem('cultivation_game_save')), original);
        await isolated.close();
        pass('V2 копирует V1 один раз и затем сохраняется отдельно, включая перезагрузку');
        assert.deepEqual(errors, []);
        pass('Ноль ошибок страницы');
        console.log(`${checks} V2 checks passed. Previews: ${output}`);
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
