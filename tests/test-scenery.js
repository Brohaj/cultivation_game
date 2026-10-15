const PROJECT_ROOT = require('node:path').resolve(__dirname, '..');
// Иллюстрации двух интерфейсов: декодирование, смена состояния, действия и геометрия.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const sects = ['jade_purity', 'crimson_flame', 'moon_lake', 'abyss_cult', 'hidden_hermit'];
const locationTiers = {
    spirit_forest: 2, beast_cave: 2, forgotten_ruins: 2,
    heavenly_auction: 1, demon_abyss: 1, immortal_palace: 1,
};
const assetPaths = [
    ...Object.entries(locationTiers).flatMap(([id, max]) => Array.from({ length: max + 1 }, (_, tier) => `assets/art/expeditions/${id}-${tier}.webp`)),
    ...sects.flatMap(id => [0, 1].map(tier => `assets/art/expeditions/sect-${id}-${tier}.webp`)),
    ...sects.map(id => `assets/art/sects/${id}.webp`),
];
const fixture = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'test-fixtures/player-report-v14.json'), 'utf8'));
const output = process.env.V2_PREVIEW_DIR || path.join(PROJECT_ROOT, 'ui/v2/previews/scenery');

async function decodeVisibleScenery(page) {
    const decoded = await page.locator('.tab-content.active .scenery-image').evaluateAll(async images => {
        return Promise.all(images.map(async image => {
            image.loading = 'eager';
            await image.decode();
            return { src: image.getAttribute('src'), width: image.naturalWidth, height: image.naturalHeight };
        }));
    });
    assert.ok(decoded.length > 0, 'Active scenery screen has no illustration');
    assert.ok(decoded.every(image => image.width > 0 && image.height > 0), JSON.stringify(decoded));
}

async function geometry(page) {
    return page.evaluate(() => {
        const panel = document.querySelector('.tab-content.active');
        const width = document.documentElement.clientWidth;
        const contentWidth = document.documentElement.scrollWidth;
        return {
            width,
            contentWidth,
            panelWidth: panel.clientWidth,
            panelContentWidth: panel.scrollWidth,
            hasHorizontalOverflow: contentWidth > width + 1 || panel.scrollWidth > panel.clientWidth + 1,
        };
    });
}

async function missionGeometry(page) {
    return page.locator('.sect-mission-card').evaluateAll(cards => {
        const panel = document.querySelector('#tab-sect').getBoundingClientRect();
        const visibleTop = Math.max(0, panel.top);
        const visibleBottom = Math.min(innerHeight, panel.bottom);
        return cards.map(card => {
            const box = card.getBoundingClientRect();
            const action = card.querySelector('.sect-mission-action').getBoundingClientRect();
            const fits = box.width > 0 && box.height > 0 && action.width > 0 && action.height > 0
                && box.top >= visibleTop - 1 && box.bottom <= visibleBottom + 1
                && box.left >= panel.left - 1 && box.right <= panel.right + 1
                && action.top >= visibleTop - 1 && action.bottom <= visibleBottom + 1
                && action.left >= panel.left - 1 && action.right <= panel.right + 1;
            return { top: box.top, bottom: box.bottom, actionBottom: action.bottom, panelBottom: visibleBottom, fits };
        });
    });
}

async function assertSceneryBackground(page, selector, label) {
    const layout = await page.locator(selector).evaluateAll(cards => cards.map(card => {
        const image = card.querySelector('.scenery-image');
        const layer = image?.closest('.scenery-frame');
        if (!image || !layer) return { covers: false, heightUnchanged: false, missingImage: true };
        const box = card.getBoundingClientRect();
        const inner = { left: box.left + card.clientLeft, top: box.top + card.clientTop };
        inner.right = inner.left + card.clientWidth;
        inner.bottom = inner.top + card.clientHeight;
        const background = image.getBoundingClientRect();
        const covers = background.width > 0 && background.height > 0
            && Math.abs(background.left - inner.left) <= 2 && Math.abs(background.right - inner.right) <= 2
            && Math.abs(background.top - inner.top) <= 2 && Math.abs(background.bottom - inner.bottom) <= 2;
        const display = layer.style.getPropertyValue('display');
        const priority = layer.style.getPropertyPriority('display');
        let withoutBackground;
        try {
            layer.style.setProperty('display', 'none', 'important');
            withoutBackground = card.getBoundingClientRect().height;
        } finally {
            if (display) layer.style.setProperty('display', display, priority);
            else layer.style.removeProperty('display');
        }
        return { src: image.getAttribute('src'), inner,
            background: { left: background.left, right: background.right, top: background.top, bottom: background.bottom },
            height: box.height, withoutBackground, covers, heightUnchanged: Math.abs(box.height - withoutBackground) <= 2 };
    }));
    assert.ok(layout.length > 0, `${label}: no scenery card found`);
    assert.ok(layout.every(card => card.covers), `${label}: background does not cover the whole card: ${JSON.stringify(layout)}`);
    assert.ok(layout.every(card => card.heightUnchanged), `${label}: background changes card height: ${JSON.stringify(layout)}`);
}

async function assertSceneryButtons(page, selector) {
    const scroll = await page.evaluate(() => ({ panel: document.querySelector('.tab-content.active').scrollTop, x: scrollX, y: scrollY }));
    const buttons = page.locator(selector).locator('button:enabled:visible');
    try {
        for (let index = 0, count = await buttons.count(); index < count; index++) {
            await buttons.nth(index).click({ trial: true, timeout: 3000 });
        }
    } finally {
        await page.evaluate(saved => {
            document.querySelector('.tab-content.active').scrollTop = saved.panel;
            window.scrollTo(saved.x, saved.y);
        }, scroll);
    }
}

async function screenshot(page, filename) {
    await decodeVisibleScenery(page);
    await page.evaluate(() => {
        document.querySelector('.tab-content.active').scrollTop = 0;
    });
    await page.screenshot({ path: path.join(output, filename), fullPage: true, animations: 'disabled' });
    if (page.viewportSize().width < 600) {
        await page.locator('.tab-content.active .scenery-frame').first().scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(output, filename.replace('.png', '-viewport.png')), animations: 'disabled' });
    }
}

(async () => {
    assert.equal(assetPaths.length, 30);
    for (const asset of assetPaths) assert.ok(fs.statSync(path.join(PROJECT_ROOT, asset)).size > 0, `Missing asset: ${asset}`);
    fs.mkdirSync(output, { recursive: true });
    const browser = await chromium.launch({ headless: true });
    const missionGeometryFailures = [];
    const overflowFailures = [];
    try {
        for (const [entry, prefix] of [['index.html', 'original'], ['index-v2.html', 'v2']]) {
            // Каждый интерфейс получает пустой профиль; пользовательские сохранения не читаются.
            const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
            const page = await context.newPage();
            const errors = [];
            const imageFailures = [];
            page.on('pageerror', error => errors.push(error.message));
            page.on('requestfailed', request => {
                if (request.url().includes('/assets/art/')) imageFailures.push(`${request.url()}: ${request.failure()?.errorText}`);
            });
            await page.goto(pathToFileURL(path.join(PROJECT_ROOT, entry)).href);
            await page.locator('#btn-accept-root').click();
            await page.locator('#intro-modal button').click();
            await page.evaluate(saved => {
                game.stop(); applyLoadedState(saved); game.stop(); game._paused = true;
                game.years = 40; game.birthYear = 0; game.gameOver = false; game.pendingRebirth = null;
                game.expedition = null; game.lastExpeditionReward = null;
                game.ascendedLocations = {}; game.realmIndex = 7; game.subLevel = 1;
                game.stones = 100000; game.strength = 1000; game.daoLevel = 4;
            }, fixture);

            const assetDimensions = await page.evaluate(async assets => {
                return Promise.all(assets.map(async src => {
                    const image = new Image(); image.src = src; await image.decode();
                    return { src, width: image.naturalWidth, height: image.naturalHeight };
                }));
            }, assetPaths);
            assert.equal(assetDimensions.length, 30);
            assert.ok(assetDimensions.every(image => image.width > 0 && image.height > 0 && Math.abs(image.width / image.height - 1.5) < .01), JSON.stringify(assetDimensions));
            console.log(`PASS ${entry}: all 30 illustrations decode in the browser`);

            await page.evaluate(() => { game.sect = null; game.sectMissions = []; switchTab('sect'); updateUI(); });
            const selectionSources = await page.locator('#sects-list .sect-card .sect-scenery img').evaluateAll(images => images.map(image => image.getAttribute('src')));
            assert.deepEqual(selectionSources.sort(), sects.map(id => `assets/art/sects/${id}.webp`).sort());
            assert.equal(new Set(selectionSources).size, 5);
            await screenshot(page, `${prefix}-sect-selection-desktop.png`);
            const selectionLayout = await geometry(page);
            if (selectionLayout.hasHorizontalOverflow) overflowFailures.push({ entry, screen: 'sect-selection', viewport: '1280x720', ...selectionLayout });
            if (prefix === 'v2') {
                await assertSceneryBackground(page, '#sects-list .sect-card', 'V2 sect choices at 1280x720');
                await assertSceneryButtons(page, '#sects-list .sect-card');
                const cards = await page.locator('#sects-list .sect-card').evaluateAll(elements => elements.map(element => {
                    const box = element.getBoundingClientRect();
                    return { top: box.top, left: box.left, right: box.right, width: box.width, height: box.height };
                }));
                const hasMultipleColumns = cards.some((card, index) => cards.slice(index + 1).some(other =>
                    card.width > 0 && other.width > 0 && Math.abs(card.top - other.top) <= 1
                    && (card.right <= other.left + 1 || other.right <= card.left + 1)
                ));
                assert.equal(hasMultipleColumns, true, `V2 sect choices must occupy multiple columns at 1280x720: ${JSON.stringify(cards)}`);
                console.log('PASS V2: sect choices occupy multiple columns at 1280x720');
            }

            for (const id of sects) {
                await page.evaluate(id => {
                    game.sect = { id, rank: 0, contribution: 0 };
                    game.realmIndex = 5; game.daoLevel = 4; game.sectMissions = [];
                    game.generateSectMissions(); switchTab('sect'); updateUI(); updateTickUI();
                    document.querySelector('#tab-sect').scrollTop = 0;
                }, id);
                assert.equal(await page.locator('#sects-list .sect-scenery img').count(), 1, `${entry}: joined sect must have exactly one illustration`);
                assert.equal(await page.locator('#sects-list .sect-scenery img').getAttribute('src'), `assets/art/sects/${id}.webp`);
                assert.equal(await page.locator('.sect-mission-card').count(), 3, `${entry}: ${id} missions missing`);
                const missionViewports = prefix === 'v2'
                    ? [{ width: 1280, height: 720 }, { width: 1024, height: 720 }]
                    : [{ width: 1280, height: 720 }];
                for (const viewport of missionViewports) {
                    await page.setViewportSize(viewport);
                    await page.evaluate(() => { updateUI(); updateTickUI(); document.querySelector('#tab-sect').scrollTop = 0; });
                    assert.equal(await page.locator('.sect-mission-card').count(), 3, `${entry}: ${id} missions missing at ${viewport.width}x${viewport.height}`);
                    await decodeVisibleScenery(page);
                    if (prefix === 'v2') {
                        const layout = await missionGeometry(page);
                        if (!layout.every(card => card.fits)) missionGeometryFailures.push({ entry, id, viewport, layout });
                        await assertSceneryBackground(page, '#sects-list.v2-sect-member', `V2 ${id} member at ${viewport.width}x${viewport.height}`);
                        await assertSceneryButtons(page, '#sects-list.v2-sect-member');
                    }
                    if (id === 'jade_purity' && viewport.width === 1280) await screenshot(page, `${prefix}-sect-member-desktop.png`);
                    if (id === 'jade_purity' && viewport.width === 1024) await screenshot(page, `${prefix}-sect-member-1024.png`);
                }
            }
            await page.setViewportSize({ width: 1280, height: 720 });
            console.log(`PASS ${entry}: five sect choices and one matching illustration after joining`);

            for (const tier of [0, 1, 2]) {
                await page.evaluate(tier => {
                    game.realmIndex = 7; game.expedition = null;
                    game.sect = { id: 'jade_purity', rank: 4, contribution: 100000 };
                    game.ascendedLocations = Object.fromEntries(LOCATIONS.map(loc => [loc.id, tier]));
                    switchTab('expeditions'); renderExpeditions();
                }, tier);
                const sources = await page.locator('#expeditions-list .expedition-card .expedition-scenery img').evaluateAll(images => images.map(image => image.getAttribute('src')));
                for (const [id, maxTier] of Object.entries(locationTiers)) {
                    assert.ok(sources.includes(`assets/art/expeditions/${id}-${Math.min(tier, maxTier)}.webp`), `${entry}: ${id} tier ${tier} image did not update`);
                }
                assert.ok(sources.includes(`assets/art/expeditions/sect-jade_purity-${Math.min(tier, 1)}.webp`));
                await decodeVisibleScenery(page);
                if (prefix === 'v2') {
                    await assertSceneryBackground(page, '#expeditions-list .expedition-card', `V2 expedition tier ${tier} at 1280x720`);
                    await assertSceneryButtons(page, '#expeditions-list .expedition-card');
                }
                if (tier === 0 || tier === 2) await screenshot(page, `${prefix}-expeditions-tier-${tier}-desktop.png`);
            }
            console.log(`PASS ${entry}: expedition images update at ascension tiers 0/1/2`);

            for (const id of sects) for (const tier of [0, 1]) {
                await page.evaluate(({ id, tier }) => {
                    game.sect = { id, rank: 4, contribution: 100000 };
                    game.ascendedLocations.sect_secret_realm = tier;
                    renderExpeditions();
                }, { id, tier });
                const image = page.locator(`#expeditions-list .expedition-scenery img[src="assets/art/expeditions/sect-${id}-${tier}.webp"]`);
                assert.equal(await image.count(), 1, `${entry}: secret realm illustration does not match ${id} tier ${tier}`);
                assert.ok(await image.evaluate(async image => { image.loading = 'eager'; await image.decode(); return image.naturalWidth > 0; }));
            }
            console.log(`PASS ${entry}: secret realm illustrations follow all five sects at both tiers`);

            await page.evaluate(() => {
                game.expedition = null; game.ascendedLocations = {};
                game.sect = { id: 'jade_purity', rank: 4, contribution: 100000 };
                game.stones = 100000; renderExpeditions();
            });
            const before = await page.evaluate(() => game.stones);
            const forest = page.locator('.expedition-card').filter({ has: page.locator('img[src="assets/art/expeditions/spirit_forest-0.webp"]') });
            await forest.getByRole('button', { name: 'Отправиться', exact: true }).click();
            await page.waitForFunction(() => game.expedition?.locationId === 'spirit_forest');
            const started = await page.evaluate(() => ({ id: game.expedition.locationId, stones: game.stones, cost: LOCATIONS.find(loc => loc.id === game.expedition.locationId).entryCost || 0 }));
            assert.equal(started.id, 'spirit_forest');
            assert.equal(started.stones, before - started.cost);
            console.log(`PASS ${entry}: actual expedition start button works with illustration`);

            for (const viewport of [{ width: 1280, height: 720 }, { width: 1024, height: 720 }, { width: 390, height: 844 }]) {
                await page.setViewportSize(viewport);
                for (const tab of ['sect', 'expeditions']) {
                    await page.evaluate(tab => { game.expedition = null; switchTab(tab); updateUI(); }, tab);
                    await decodeVisibleScenery(page);
                    if (prefix === 'v2') {
                        const selector = tab === 'sect' ? '#sects-list.v2-sect-member' : '#expeditions-list .expedition-card';
                        await assertSceneryBackground(page, selector, `V2 ${tab} at ${viewport.width}x${viewport.height}`);
                        await assertSceneryButtons(page, selector);
                    }
                    const layout = await geometry(page);
                    if (layout.hasHorizontalOverflow) overflowFailures.push({ entry, screen: tab, viewport, ...layout });
                    if (viewport.width === 390) await screenshot(page, `${prefix}-${tab}-mobile.png`);
                    if (prefix === 'v2' && tab === 'expeditions' && viewport.width === 1024) await screenshot(page, `${prefix}-${tab}-1024.png`);
                }
                await page.evaluate(() => { game.sect = null; game.sectMissions = []; switchTab('sect'); updateUI(); });
                await decodeVisibleScenery(page);
                if (prefix === 'v2') {
                    await assertSceneryBackground(page, '#sects-list .sect-card', `V2 sect choices at ${viewport.width}x${viewport.height}`);
                    await assertSceneryButtons(page, '#sects-list .sect-card');
                }
                const layout = await geometry(page);
                if (layout.hasHorizontalOverflow) overflowFailures.push({ entry, screen: 'sect-selection', viewport, ...layout });
                if (viewport.width === 390) await screenshot(page, `${prefix}-sect-selection-mobile.png`);
                if (prefix === 'v2' && viewport.width === 1024) await screenshot(page, `${prefix}-sect-selection-1024.png`);
                await page.evaluate(() => { game.sect = { id: 'jade_purity', rank: 0, contribution: 0 }; game.generateSectMissions(); });
            }
            console.log(`CHECK ${entry}: horizontal scrolling measured at 1280x720, 1024x720 and 390x844`);
            if (prefix === 'v2') console.log('PASS V2: scenery covers whole cards at all viewports, adds no height and leaves buttons accessible');
            assert.deepEqual(imageFailures, [], `Image load failures in ${entry}`);
            assert.deepEqual(errors, [], `Page errors in ${entry}`);
            await context.close();
        }
        if (missionGeometryFailures.length) console.log('MISSION_GEOMETRY_FAILURES', JSON.stringify(missionGeometryFailures));
        if (overflowFailures.length) console.log('OVERFLOW_FAILURES', JSON.stringify(overflowFailures));
        assert.deepEqual(overflowFailures, [], `Horizontal overflow: ${JSON.stringify(overflowFailures)}`);
        assert.deepEqual(missionGeometryFailures, [], `V2 missions require scrolling: ${JSON.stringify(missionGeometryFailures)}`);
        console.log('PASS V2: all three missions of all five sects remain visible on 1280x720 and 1024x720');
        console.log('Scenery checks passed for both interfaces; 0 page errors and 0 image load failures');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
