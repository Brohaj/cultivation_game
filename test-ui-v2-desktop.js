// Регрессии ПК: видимые события, слой подсказок, ясные статусы и лор прорывов.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'test-fixtures/player-report-v14.json'), 'utf8'));
    const output = process.env.V2_PREVIEW_DIR || path.join(__dirname, 'ui/v2/previews');
    fs.mkdirSync(output, { recursive: true });
    try {
        await page.goto(pathToFileURL(path.join(__dirname, 'index-v2.html')).href);
        await page.locator('#btn-accept-root').click();
        await page.locator('#intro-modal button').click();
        await page.evaluate(saved => { game.stop(); applyLoadedState(saved); game.stop(); game._paused = true; updateUI(); }, fixture);
        const tabs = ['cultivation', 'sect', 'expeditions', 'adventures', 'artifacts', 'techniques', 'milestones', 'options', 'guide'];
        for (const viewport of [{ width: 1920, height: 1080 }, { width: 1440, height: 900 }, { width: 1280, height: 720 }, { width: 1024, height: 768 }]) {
            await page.setViewportSize(viewport);
            for (const tab of tabs) {
                await page.evaluate(id => { switchTab(id); updateUI(); }, tab);
                const layout = await page.evaluate(() => {
                    const center = document.querySelector('.center-panel').getBoundingClientRect();
                    const events = document.querySelector('.v2-event-panel').getBoundingClientRect();
                    return { width: document.documentElement.clientWidth, contentWidth: document.documentElement.scrollWidth, height: window.innerHeight, contentHeight: document.documentElement.scrollHeight, centerRight: center.right, eventLeft: events.left, eventTop: events.top, eventBottom: events.bottom };
                });
                assert.ok(layout.contentWidth <= layout.width + 1, `${tab}: horizontal overflow ${JSON.stringify(layout)}`);
                assert.ok(layout.contentHeight <= layout.height + 1, `${tab}: page scrolling ${JSON.stringify(layout)}`);
                assert.ok(layout.eventLeft >= layout.centerRight && layout.eventTop >= 0 && layout.eventBottom <= layout.height, `${tab}: events leave viewport`);
            }
        }
        console.log('PASS Все разделы ПК сохраняют события справа без прокрутки всей страницы');

        await page.setViewportSize({ width: 1280, height: 720 });
        await page.evaluate(() => { switchTab('cultivation'); updateUI(); });
        const firstFormationFits = await page.locator('[data-formation-card]').first().evaluate(el => {
            const card = el.getBoundingClientRect(), list = document.querySelector('#formations-list').getBoundingClientRect();
            return card.top >= list.top && card.bottom <= list.bottom;
        });
        if (!firstFormationFits) console.log(await page.evaluate(() => [...document.querySelectorAll('.v2-goal, .activities-section, #formations-section, #formations-list, [data-formation-card]')].slice(0, 7).map(el => ({ cls: el.className, top: el.getBoundingClientRect().top, bottom: el.getBoundingClientRect().bottom, text: el.innerText.slice(0, 170) }))));
        assert.equal(firstFormationFits, true, 'Первая карточка формации должна быть видна полностью');
        await page.screenshot({ path: path.join(output, 'desktop-compact.png'), fullPage: true });
        for (const selector of ['#btn-breakthrough', '#activity-fate', '.pill-row .pill-use-btns button', '#formations-section h3']) {
            const visible = await page.locator(selector).first().evaluate(el => {
                const box = el.getBoundingClientRect(), panel = document.querySelector('#tab-cultivation').getBoundingClientRect();
                return box.top >= panel.top && box.bottom <= panel.bottom + 1;
            });
            if (!visible) console.log(await page.evaluate(() => [...document.querySelectorAll('.v2-goal, .activities-section, .v2-supplies, #formations-section, #tab-cultivation')].map(el => ({ cls: el.className, id: el.id, top: el.getBoundingClientRect().top, bottom: el.getBoundingClientRect().bottom, scrollTop: el.scrollTop, height: el.offsetHeight }))));
            assert.equal(visible, true, `${selector} needs scrolling on 1280x720`);
        }
        assert.equal(await page.locator('#formations-section h3').isVisible(), true);
        await page.screenshot({ path: path.join(output, 'desktop-compact.png'), fullPage: true });
        console.log('PASS Прорыв, занятия, пилюли и доступ к формациям видны на 1280×720');

        await page.locator('#realm').hover();
        await page.locator('#v2-floating-tooltip').waitFor({ state: 'visible' });
        const layering = await page.evaluate(() => {
            const tip = document.querySelector('#v2-floating-tooltip');
            const t = tip.getBoundingClientRect(), bar = document.querySelector('.qi-bar-container').getBoundingClientRect();
            const x = Math.max(t.left, bar.left) + 2, y = Math.max(t.top, bar.top) + 2;
            const overlap = x < Math.min(t.right, bar.right) && y < Math.min(t.bottom, bar.bottom);
            const hit = document.elementFromPoint(overlap ? x : t.left + 5, overlap ? y : t.top + 5);
            return { directBody: tip.parentElement === document.body, front: !!hit?.closest('#v2-floating-tooltip'), fits: t.left >= 0 && t.top >= 0 && t.right <= innerWidth && t.bottom <= innerHeight, overlap };
        });
        assert.equal(layering.directBody && layering.front && layering.fits && layering.overlap, true, JSON.stringify(layering));
        await page.screenshot({ path: path.join(output, 'desktop-tooltip.png'), fullPage: true });
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#v2-floating-tooltip').isVisible(), false);
        console.log('PASS Подсказка поверх шкалы, вне скроллеров и в границах окна; Escape закрывает её');

        await page.evaluate(() => {
            for (let i = 0; i < 40; i++) addLog(`Событие ${i}: вдали от затвора меняются поколения, а ваши занятия продолжаются.`, 'event');
            document.querySelector('#event-log').scrollTop = 0;
        });
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
        const beforeScroll = await page.locator('#event-log').evaluate(el => el.scrollTop);
        await page.evaluate(() => addLog('Новое событие за пределами затвора.', 'reward'));
        assert.equal(await page.locator('#event-log').evaluate(el => el.scrollTop), beforeScroll);
        assert.equal(await page.locator('#v2-log-latest').isVisible(), true);
        await page.locator('#v2-log-latest').click();
        assert.equal(await page.locator('#event-log').evaluate(el => el.scrollHeight - el.scrollTop - el.clientHeight < 3), true);
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 0)));
        console.log('PASS Новые события не прерывают чтение истории; переход к свежим работает');

        await page.evaluate(() => { switchTab('techniques'); updateUI(); });
        const card = page.locator('.tech-card').first();
        const techId = (await card.getAttribute('id')).replace('tech-card-', '');
        assert.match(await card.innerText(), /Активна/);
        assert.doesNotMatch(await card.innerText(), /Работает в активном слоте|Отложить/);
        await card.getByRole('button', { name: 'Отключить', exact: true }).click();
        await page.waitForFunction(id => !game.isTechEquipped(id), techId);
        await page.locator(`#tech-card-${techId}`).getByRole('button', { name: 'Активировать', exact: true }).click();
        assert.equal(await page.evaluate(id => game.isTechEquipped(id), techId), true);
        console.log('PASS Статусы Активна/Неактивна и действия Активировать/Отключить однозначны');

        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 0)));
        const lore = await page.evaluate(() => {
            const expected = [];
            for (let realm = 0; realm < REALMS.length; realm++) for (let sub = 1; sub <= SUB_LEVELS; sub++) {
                if ((realm === 0 && sub === 1) || (realm === REALMS.length - 1 && sub > 1)) continue;
                expected.push(`${realm}:${sub}`);
            }
            return { keys: Object.keys(V2_BREAKTHROUGH_LORE), expected, unique: new Set(Object.values(V2_BREAKTHROUGH_LORE).map(entry => entry.text)).size };
        });
        assert.deepEqual(lore.keys.sort(), lore.expected.sort());
        assert.equal(lore.keys.length, 56);
        assert.equal(lore.unique, 56);
        await page.evaluate(() => {
            game.reset(); game.stop(); game._paused = true; game.selectSpiritualRoot('common');
            game.qi = game.qiNeeded(); Math.random = () => 0; switchTab('cultivation'); updateUI();
        });
        await page.locator('#btn-breakthrough').click();
        assert.equal(await page.evaluate(() => game.subLevel), 2);
        assert.equal(await page.locator('#v2-breakthrough-scene').count(), 0);
        await page.waitForFunction(() => document.querySelector('#v2-goal-title').textContent.includes('средний'));
        assert.match(await page.locator('#v2-goal-title').innerText(), /средний/);
        const count = await page.evaluate(() => [...document.querySelector('#event-log').children].filter(el => el.dataset.text?.includes(v2GetBreakthroughLore(0, 2).text)).length);
        assert.equal(count, 1);
        await page.evaluate(() => updateUI());
        assert.equal(await page.evaluate(() => [...document.querySelector('#event-log').children].filter(el => el.dataset.text?.includes(v2GetBreakthroughLore(0, 2).text)).length), 1);
        const countNarrations = () => page.evaluate(() => [...document.querySelector('#event-log').children].filter(el => Object.values(V2_BREAKTHROUGH_LORE).some(entry => el.dataset.text?.includes(entry.text))).length);
        const sceneCount = await countNarrations();
        await page.evaluate(() => {
            game.realmIndex = 3; game.subLevel = 1; game.sect = { id: 'jade_purity', rank: 0, contribution: 0 };
            game.daoLevel = 1; game.qi = game.qiNeeded(); Math.random = () => 1; breakthroughUI();
            game.qi = game.qiNeeded(); game.daoLevel = 0; breakthroughUI();
        });
        assert.equal(await countNarrations(), sceneCount);
        await page.evaluate(() => {
            game.realmIndex = 2; game.subLevel = 4; game.qi = game.qiNeeded(); Math.random = () => 0; updateUI();
        });
        await page.locator('#btn-breakthrough').click();
        assert.equal(await page.evaluate(() => [...document.querySelector('#event-log').children].some(el => el.dataset.text?.includes(v2GetBreakthroughLore(3, 1).text))), true);
        await page.waitForFunction(() => !document.querySelector('.breakthrough-overlay'));
        await page.waitForFunction(() => !document.querySelector('.qi-section').className.includes('-anim'));
        await page.screenshot({ path: path.join(output, 'desktop-breakthrough.png'), fullPage: true });
        console.log('PASS Все 56 рубежей имеют лор; успех записывает его один раз без всплывающего блока, провал и блокировка — нет');
        assert.deepEqual(errors, []);
        console.log('7 desktop checks passed, 0 page errors');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
