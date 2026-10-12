// Реальные проблемные экраны: три поручения, 30 предметов и единая палитра.
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
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'test-fixtures/player-report-v14.json'), 'utf8'));
    const output = process.env.V2_PREVIEW_DIR || path.join(__dirname, 'ui/v2/previews/density');
    fs.mkdirSync(output, { recursive: true });
    const reset = () => page.evaluate(saved => {
        game.stop(); applyLoadedState(saved); game.stop(); game._paused = true;
        game.years = 40; game.birthYear = 0; game.gameOver = false; game.pendingRebirth = null;
    }, fixture);
    try {
        await page.goto(pathToFileURL(path.join(__dirname, 'index-v2.html')).href);
        await page.locator('#btn-accept-root').click();
        await page.locator('#intro-modal button').click();
        await reset();
        const descriptions = [];
        for (let sub = 1; sub <= 4; sub++) {
            await page.evaluate(sub => { game.realmIndex = 2; game.subLevel = sub; game.qi = Math.floor(game.qiNeeded() * .6); switchTab('cultivation'); updateUI(); }, sub);
            assert.match(await page.locator('#v2-goal-title').innerText(), /Закладка Основания/);
            const text = await page.locator('#v2-next-step').innerText();
            assert.ok(text.length > 15);
            descriptions.push(text);
            await page.evaluate(() => { updateTickUI(); updateUI(); });
            assert.equal(await page.locator('#v2-next-step').innerText(), text);
        }
        assert.equal(new Set(descriptions).size, 4);
        await page.evaluate(() => { game.spiritualPills = 3; game.heavenlyPills = 2; updateUI(); });
        const pillWidth = await page.locator('#v2-supplies').evaluate(el => el.getBoundingClientRect().width);
        assert.ok(pillWidth <= 430, `Пилюли растянуты на ${pillWidth}px`);
        const formationsFit = await page.locator('#formations-section h3').evaluate(el => el.getBoundingClientRect().bottom <= document.querySelector('#tab-cultivation').getBoundingClientRect().bottom);
        assert.equal(formationsFit, true, 'Четыре вида пилюль не должны вытеснять формации из окна');
        await screenshotWithScenery(page, { path: path.join(output, 'cultivation-lore.png'), animations: 'disabled' });
        console.log('PASS Описание текущей ступени различается на всех четырёх уровнях и сохраняется при обновлении');

        await reset();
        const sectIds = await page.evaluate(() => SECTS.map(sect => sect.id));
        for (const id of sectIds) {
            await page.evaluate(id => {
                game.realmIndex = 5; game.subLevel = 1; game.daoLevel = 4;
                game.sect = { id, rank: 0, contribution: 0 };
                game.generateSectMissions(); switchTab('sect'); updateUI();
                updateTickUI();
            }, id);
            assert.equal(await page.locator('.sect-mission-card').count(), 3, id);
            const fits = await page.locator('.sect-mission-card').evaluateAll(cards => {
                const panel = document.querySelector('#tab-sect').getBoundingClientRect();
                return cards.every(card => {
                    const b = card.getBoundingClientRect();
                    const action = card.querySelector('.sect-mission-action').getBoundingClientRect();
                    return b.top >= panel.top && b.bottom <= panel.bottom && action.right <= panel.right && action.bottom <= panel.bottom;
                });
            });
            if (!fits) console.log(await page.evaluate(() => [...document.querySelectorAll('#tab-sect, .v2-sect-main, .sect-active-header, .sect-active-bonuses, .sect-mission-card, .sect-donations')].map(el => ({ cls: el.className, top: el.getBoundingClientRect().top, bottom: el.getBoundingClientRect().bottom, text: el.innerText.slice(0, 220) }))));
            assert.equal(fits, true, `${id}: третье поручение требует прокрутки`);
            assert.equal(await page.locator('.sect-donations').isVisible(), true);
            const donationRight = await page.evaluate(() => document.querySelector('.sect-donations').getBoundingClientRect().left >= document.querySelector('.sect-missions').getBoundingClientRect().right);
            assert.equal(donationRight, true, `${id}: пожертвования должны быть справа`);
            if (id === 'jade_purity') await screenshotWithScenery(page, { path: path.join(output, 'sect-missions.png') });
        }
        console.log('PASS Все три поручения пяти сект и их кнопки видны без прокрутки на 1280×720');
        await page.evaluate(() => { game.sect = { id: 'jade_purity', rank: 0, contribution: 0 }; switchTab('cultivation'); updateUI(); });
        assert.equal(await page.locator('.activity-row.activity-sect-path[data-activity="dao"]').count(), 1);
        assert.match(await page.locator('#activity-info-dao').innerText(), /Путь секты/);

        await reset();
        await page.evaluate(() => {
            game.artifacts = []; game.equippedArtifacts = { weapon: null, armor: null, accessory: null, treasure: null };
            for (let i = 0; i < 30; i++) game.addArtifact(game.generateArtifact(Object.keys(ARTIFACT_TIERS)[i % 6], ARTIFACT_SLOTS[i % 4]));
            switchTab('artifacts'); updateUI();
        });
        assert.equal(await page.locator('.artifact-row').count(), 30);
        const last = page.locator('.artifact-row').last();
        const lastId = (await last.getAttribute('id')).replace('art-card-', '');
        await last.click();
        await page.waitForFunction(id => document.getElementById(`art-card-${id}`)?.getAttribute('aria-pressed') === 'true', lastId);
        const layout = await page.evaluate(() => {
            const list = document.querySelector('.artifact-inv-list'), forge = document.querySelector('.artifact-forge-panel');
            const a = list.getBoundingClientRect(), b = forge.getBoundingClientRect();
            return { scrolls: list.scrollHeight > list.clientHeight, right: b.left >= a.right, stays: b.bottom <= innerHeight, pageScroll: document.documentElement.scrollHeight > innerHeight };
        });
        assert.deepEqual(layout, { scrolls: true, right: true, stays: true, pageScroll: false });
        const position = await page.locator('.artifact-inv-list').evaluate(el => el.scrollTop);
        await page.evaluate(() => { renderArtifacts(); updateUI(); });
        assert.equal(await page.locator('.artifact-inv-list').evaluate(el => el.scrollTop), position);
        await page.locator('.artifact-forge-panel .btn-equip').click();
        await page.waitForFunction(id => Object.values(game.equippedArtifacts).some(art => art?.id === id), lastId);
        await page.locator('.artifact-forge-panel .btn-unequip').waitFor({ state: 'visible' });
        await screenshotWithScenery(page, { path: path.join(output, 'artifacts-30.png') });
        console.log('PASS 30 предметов: независимая прокрутка, доступная заточка, сохранение позиции и реальное надевание');

        await reset();
        await page.evaluate(() => {
            game.realmIndex = 3; game.expedition = null; game.ascendedLocations = {}; game.stones = 10000;
            game.flags.expedition_spirit_forest = true;
            game.expeditionCompletions.spirit_forest = 7;
            switchTab('expeditions'); updateUI();
        });
        const card = page.locator('.expedition-card[data-location="spirit_forest"]');
        assert.equal(await card.locator('.v2-expedition-main-rewards .v2-resource-stones').count(), 1);
        assert.equal(await page.locator('#expeditions-list details, #expeditions-list .v2-expedition-details, #expeditions-list .v2-expedition-rare-rewards, #expeditions-list .v2-expedition-conditions, #expeditions-list .expedition-ascend-progress, #expeditions-list .expedition-ascend-ready, #expeditions-list .v2-expedition-inventory-warning').count(), 0);
        const rewardLists = await page.locator('.v2-expedition-main-rewards').allInnerTexts();
        assert.ok(rewardLists.length > 0);
        for (const text of rewardLists) assert.doesNotMatch(text, /\d|%/, `Виды добычи содержат количества или шансы: ${text}`);
        assert.doesNotMatch(await card.innerText(), /Редкие находки и условия|Изучение царства|Инвентарь|шанс\s*\d/i);
        assert.doesNotMatch(await card.locator('.v2-expedition-artifact-preview').innerText(), /\d|%/);
        const palette = await page.evaluate(() => {
            const color = selector => getComputedStyle(document.querySelector(selector)).color;
            const expedition = document.querySelector('.expedition-card[data-location="spirit_forest"]');
            const same = (resource, inventory) => getComputedStyle(expedition.querySelector(`.v2-expedition-main-rewards .v2-resource-${resource}`)).color === color(inventory);
            const tier = expedition.querySelector('.v2-expedition-artifact-preview [class*="art-tier-"]');
            return { stones: same('stones', '#stones'), essence: same('essence', '#dao-essence'), dust: same('dust', '#artifact-dust'), pills: same('pills', '#pills'), tier: !!tier && getComputedStyle(tier).color === 'rgb(136, 136, 136)', powerSize: parseFloat(getComputedStyle(document.querySelector('#combat-power')).fontSize) };
        });
        assert.equal(palette.stones && palette.essence && palette.dust && palette.pills && palette.tier, true, JSON.stringify(palette));
        assert.ok(palette.powerSize >= 20);
        for (const width of [1280, 1440]) {
            await page.setViewportSize({ width, height: 720 });
            await page.evaluate(() => { renderExpeditions(); updateUI(); });
            const geometry = await page.locator('.v2-expedition-grid .expedition-card').evaluateAll(cards => {
                const grid = document.querySelector('.v2-expedition-grid').getBoundingClientRect();
                return {
                    grid: { left: grid.left, right: grid.right },
                    cards: cards.map(card => {
                        const box = card.getBoundingClientRect(), style = getComputedStyle(card);
                        const button = card.querySelector('.expedition-actions button');
                        const action = button?.getBoundingClientRect();
                        return {
                            id: card.dataset.location, left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width,
                            contentLeft: box.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft),
                            contentBottom: box.bottom - parseFloat(style.borderBottomWidth) - parseFloat(style.paddingBottom),
                            button: action ? { left: action.left, right: action.right, top: action.top, bottom: action.bottom } : null
                        };
                    })
                };
            });
            assert.ok(geometry.cards.length >= 3, `${width}px: недостаточно карточек для проверки третьей`);
            const ids = geometry.cards.map(item => item.id);
            assert.ok(ids.every(Boolean), `${width}px: у каждой карточки нужен data-location`);
            assert.equal(new Set(ids).size, ids.length, `${width}px: повторяется data-location`);
            const rows = [];
            for (const item of geometry.cards) {
                let row = rows.find(row => Math.abs(row.top - item.top) <= 2);
                if (!row) { row = { top: item.top, cards: [] }; rows.push(row); }
                row.cards.push(item);
                assert.ok(item.left >= geometry.grid.left - 1 && item.right <= geometry.grid.right + 1, `${width}px: ${item.id} выходит за сетку`);
                if (item.button) {
                    assert.ok(Math.abs(item.button.left - item.contentLeft) <= 2, `${width}px: ${item.id}, кнопка не у левого края: ${JSON.stringify(item)}`);
                    assert.ok(Math.abs(item.button.bottom - item.contentBottom) <= 5, `${width}px: ${item.id}, кнопка не внизу: ${JSON.stringify(item)}`);
                    assert.ok(item.button.right <= item.right && item.button.top >= item.top, `${width}px: ${item.id}, кнопка выходит за карточку`);
                }
            }
            assert.equal(rows[0].cards.length, 2, `${width}px: в первом ряду должны быть ровно две карточки`);
            assert.equal(rows.length, Math.ceil(geometry.cards.length / 2), `${width}px: неверное число рядов: ${JSON.stringify(rows)}`);
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i].cards.sort((a, b) => a.left - b.left);
                assert.equal(row.length, i < rows.length - 1 ? 2 : geometry.cards.length % 2 || 2, `${width}px: третья карточка в ряду или лишний перенос: ${JSON.stringify(rows[i])}`);
                if (row.length === 2) {
                    assert.ok(row[0].right < row[1].left, `${width}px: колонки пересекаются`);
                    assert.ok(Math.abs(row[0].width - row[1].width) <= 2, `${width}px: ширина колонок различается`);
                }
            }
            assert.ok(geometry.cards.some(item => item.button), `${width}px: нет кнопки для проверки расположения`);
        }
        await page.setViewportSize({ width: 1280, height: 720 });
        await page.locator('#tab-expeditions').evaluate(el => { el.scrollTop = 0; });
        await screenshotWithScenery(page, { path: path.join(output, 'expedition-rewards.png') });
        console.log('PASS Походы: две колонки на 1280/1440, кнопки слева снизу, награды без чисел и прежняя палитра');

        await page.evaluate(() => {
            document.querySelector('#event-log').replaceChildren();
            for (let i = 0; i < 150; i++) { game.years = 800 + i; addLog(`Запись ${i}: в затворе тихо идут годы.`, 'event'); }
            document.querySelector('#event-log').scrollTop = 350;
        });
        const readAnchor = () => page.locator('#event-log').evaluate(log => {
            const top = log.getBoundingClientRect().top;
            const entry = [...log.children].find(el => !el.hidden && el.getBoundingClientRect().bottom > top);
            return { text: entry.dataset.text, offset: Math.round(entry.getBoundingClientRect().top - top) };
        });
        const anchor = await readAnchor();
        await page.evaluate(() => { game.years += 1000; addLog('Новый век за стенами затвора.', 'event'); });
        assert.deepEqual(await readAnchor(), anchor);
        assert.equal(await page.locator('#event-log .log-entry').count(), 151);
        const scrollBefore = await page.locator('#event-log').evaluate(el => el.scrollTop);
        await page.locator('#event-log').hover();
        await page.mouse.wheel(0, -200);
        await page.waitForFunction(before => document.querySelector('#event-log').scrollTop < before, scrollBefore);
        console.log('PASS История не обрывается через 200 лет, видимая запись и прокрутка колесом сохраняются');

        await page.evaluate(() => {
            document.querySelector('#event-log').replaceChildren();
            addLog('Вдали прошла обычная встреча.', 'event');
            addLog('+10 камней', 'reward');
            addLog('Получен артефакт: Простой меч (Смертный)', 'reward');
            addLog('Получен артефакт: Рунический меч (Мистический)', 'reward');
            addLog('Изучена техника секты: Течение Воды!', 'reward');
            addLog('До вас дошёл слух: древняя пагода.', 'event');
            addLog('Небесная кара приближается.', 'danger');
            addLog('Золотое Ядро достигнуто.', 'breakthrough');
        });
        await page.locator('[data-log-filter="important"]').click();
        const visibleLogs = await page.locator('#event-log .log-entry').evaluateAll(entries => entries.filter(el => !el.hidden).map(el => el.dataset.text));
        assert.equal(visibleLogs.length, 5);
        assert.ok(visibleLogs.some(text => text.includes('Мистический')));
        assert.ok(!visibleLogs.some(text => text.includes('+10 камней') || text.includes('(Смертный)')));
        await page.locator('[data-log-filter="all"]').click();
        assert.equal(await page.locator('#event-log .log-entry').evaluateAll(entries => entries.filter(el => !el.hidden).length), 8);
        console.log('PASS Важное выделяет угрозы, прорывы, открытия, решения и редкие находки; Все сохраняет всю ленту');
        const logPalette = () => page.locator('#event-log .log-entry').evaluateAll(entries => entries.map(entry => {
            const style = getComputedStyle(entry);
            return { text: entry.dataset.text, className: entry.className, color: style.color, border: style.borderLeftColor, background: style.backgroundColor };
        }));
        const beforeReload = await logPalette();
        await page.evaluate(() => saveGame());
        await page.reload();
        await page.evaluate(() => game.stop());
        const restored = await logPalette();
        for (const entry of beforeReload) assert.deepEqual(restored.find(item => item.text === entry.text), entry);
        console.log('PASS Типы и вся цветовая гамма хроник сохраняются после настоящего save/reload');
        assert.deepEqual(errors, []);
        console.log('7 density checks passed, 0 page errors');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
