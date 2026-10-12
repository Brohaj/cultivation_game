const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BOT_ID = parseInt(process.argv[2]) || 1;
const SECT_STRATEGY = process.argv[3] || 'jade';
const BOT_NAME = `Бот${BOT_ID}-${SECT_STRATEGY}`;
const logLines = [];
function log(msg) { const l = `[${BOT_NAME}] ${msg}`; console.log(l); logLines.push(l); }

function getSectForLife(n) {
    if (n === 1) return 'jade_purity';
    return { jade: 'jade_purity', flame: 'crimson_flame', moon: 'moon_lake' }[SECT_STRATEGY] || 'jade_purity';
}

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    page.on('pageerror', () => {}); // suppress

    await page.goto('file:///' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/'));
    await page.waitForSelector('#btn-accept-root', { state: 'visible', timeout: 5000 });
    await page.evaluate(() => acceptRoot('common'));
    await page.waitForTimeout(200);
    await page.evaluate(() => closeIntroModal());
    await page.waitForTimeout(200);

    // Suppress DOM, set speed
    await page.evaluate(() => {
        window.addLog = function() {};
        window.updateUI = function() {};
        window.updateTickUI = function() {};
        window.renderSects = function() {};
        window.renderExpeditions = function() {};
        window.renderAdventures = function() {};
        window.renderArtifacts = function() {};
        window.renderFormations = function() {};
        window.renderTechniques = function() {};
        window.renderMilestones = function() {};
        window.playIntro = function() {};
        game.setDebugSpeed(50);
    });

    let lifeNumber = 1, totalYearsLived = 0, maxAge = 0, maxRealm = 0, maxRealmName = 'Смертный';
    const lifeStats = [];

    log(`═══ ЖИЗНЬ 1 ═══`);

    for (let tick = 0; tick < 108000; tick++) { // ~6h at 200ms poll
        try {
            // ── CORE: death/rebirth + breakthrough + activity ──
            const core = await page.evaluate(({targetSect}) => {
                const g = game;
                const out = {};

                if (g.gameOver) {
                    out.died = true;
                    out.age = g.characterAge();
                    out.realm = g.realmIndex;
                    out.realmName = REALMS[g.realmIndex].name;
                    out.sect = g.sect ? g.sect.id : null;
                    out.karma = g.prestige.karma;

                    // Karma + milestones
                    g.prestige.karma += g.calculateKarma(true);
                    for (const m of g.milestones)
                        if (!g.prestige.permanentMilestones.includes(m))
                            g.prestige.permanentMilestones.push(m);

                    // Random body
                    const avail = REBIRTH_BODIES.filter(b => g.isBodyUnlocked(b.id));
                    const bodyId = avail.length ? avail[Math.floor(Math.random() * avail.length)].id : 'peasant';

                    // Random upgrades
                    const uids = KARMA_UPGRADES.map(u => u.id);
                    for (let i = 0; i < 20; i++)
                        g.buyKarmaUpgrade(uids[Math.floor(Math.random() * uids.length)]);

                    g.rebirth(bodyId, true);

                    // Best root
                    const roots = g.getAvailableRoots().map(r => r.id);
                    const rootId = ['chaotic','spirit_body','single','triple','dual','common']
                        .find(r => roots.includes(r)) || 'common';
                    g.selectSpiritualRoot(rootId, null);
                    g.name = 'Авто';
                    g.learnTechnique('basic_breathing');
                    g.start();
                    game.setDebugSpeed(50);
                    // Re-suppress
                    window.addLog = function() {};
                    window.updateUI = function() {};
                    window.updateTickUI = function() {};

                    out.reborn = true;
                    out.body = bodyId;
                    out.root = rootId;
                    out.karma = g.prestige.karma;
                    out.rebirths = g.prestige.totalRebirths;
                    return out;
                }

                // Activity
                const qiPct = g.qi / g.qiNeeded();
                const daoNeed = typeof g.daoNeeded === 'function' ? g.daoNeeded() : 999;
                const needDao = g.sect && g.realmIndex >= 3 && g.daoProgress < daoNeed;

                if (needDao && qiPct >= 0.95) {
                    if (g.currentActivity !== 'dao') g.setActivity('dao');
                } else if (qiPct < 0.95) {
                    if (g.currentActivity !== 'meditation') g.setActivity('meditation');
                } else {
                    const w = g.strength <= g.spirit ? 'body' : 'dao';
                    if (g.currentActivity !== w) g.setActivity(w);
                }

                // Breakthrough
                if (g.canBreakthrough()) {
                    out.bt = g.breakthrough().result;
                }

                return out;
            }, {targetSect: getSectForLife(lifeNumber)});

            if (core.died) {
                totalYearsLived += core.age;
                if (core.age > maxAge) maxAge = core.age;
                if (core.realm > maxRealm) { maxRealm = core.realm; maxRealmName = core.realmName; }
                lifeStats.push({ life: lifeNumber, age: core.age, realm: core.realm, realmName: core.realmName, sect: core.sect });
                log(`☠ Ж${lifeNumber}: ${core.age}л ${core.realmName}[${core.realm}] ${core.sect||'-'} к:${core.karma}`);
                lifeNumber++;
                log(`═══ ЖИЗНЬ ${lifeNumber} | ${core.body} ${core.root} | макс:${maxAge}л ${maxRealmName}[${maxRealm}] ═══`);
                continue;
            }

            if (core.bt) log(`  BT:${core.bt}`);

            // ── SECT (every 3 ticks) ──
            if (tick % 3 === 0) {
                await page.evaluate(({ts}) => {
                    const g = game;
                    if (!g.sect) {
                        if (g.canJoinSect(ts)) g.joinSect(ts);
                        else for (const s of ['jade_purity','crimson_flame','moon_lake','abyss_cult','hidden_hermit'])
                            if (g.canJoinSect(s)) { g.joinSect(s); break; }
                    }
                    if (g.sect && g.sectMissions)
                        for (let i = 0; i < g.sectMissions.length; i++)
                            if (g.canCompleteSectMission(i)) g.completeSectMission(i);
                    if (g.sect) {
                        if (g.stones > 150) g.donateStones(10);
                        if (g.pills > 15) g.donatePills(5);
                    }
                }, {ts: getSectForLife(lifeNumber)});
            }

            // ── EXPEDITION (every 3 ticks) ──
            if (tick % 3 === 1) {
                await page.evaluate(() => {
                    if (game.expedition || typeof LOCATIONS === 'undefined') return;
                    for (let i = LOCATIONS.length - 1; i >= 0; i--)
                        if (game.canStartExpedition(LOCATIONS[i].id)) { game.startExpedition(LOCATIONS[i].id); break; }
                });
            }

            // ── ADVENTURES (every 3 ticks) ──
            if (tick % 3 === 2) {
                await page.evaluate(() => {
                    const g = game;
                    while (g.adventureRumors.length > 0 && g.activeAdventures.length < 3)
                        g.acceptAdventure(g.adventureRumors[0]);
                    for (let i = 0; i < g.activeAdventures.length; i++) {
                        const a = g.activeAdventures[i];
                        if (!a || !a.awaitingChoice) continue;
                        const def = ADVENTURES.find(x => x.id === a.id);
                        if (!def) continue;
                        const step = def.steps[a.currentStep];
                        if (!step) continue;
                        for (let c = 0; c < step.choices.length; c++) {
                            const ch = step.choices[c];
                            let ok = true;
                            if (ch.cost) {
                                if (ch.cost.stones && g.stones < ch.cost.stones) ok = false;
                                if (ch.cost.essence && g.daoEssence < ch.cost.essence) ok = false;
                            }
                            if (ok) { g.chooseAdventureOption(i, c); break; }
                        }
                    }
                });
            }

            // ── PILLS (every 4 ticks) ──
            if (tick % 4 === 0) {
                await page.evaluate(() => {
                    const g = game;
                    if (g.qi / g.qiNeeded() < 0.5 && g.currentActivity === 'meditation') {
                        if (g.spiritualPills > 0) g.useSpiritualPill();
                        else if (g.refinedPills > 0) g.useRefinedPill();
                        else if (g.pills > 5) g.usePill();
                    }
                    if (typeof g.canRefinePill === 'function') {
                        if (g.pills >= 10 && g.canRefinePill(1)) g.refinePillTier(1);
                    }
                });
            }

            // ── ARTIFACTS (every 6 ticks) ──
            if (tick % 6 === 0) {
                await page.evaluate(() => {
                    const g = game;
                    if (!g.artifacts || !g.artifacts.length) return;
                    const tv = {divine:6,legendary:5,epic:4,rare:3,uncommon:2,common:1};
                    for (const slot of ['weapon','armor','accessory','treasure']) {
                        const sa = g.artifacts.filter(a => a.slot === slot);
                        if (!sa.length) continue;
                        sa.sort((a,b) => (tv[b.tier]||0)-(tv[a.tier]||0));
                        if (g.equippedArtifacts[slot] !== sa[0].id) {
                            if (g.equippedArtifacts[slot]) g.unequipArtifact(slot);
                            g.equipArtifact(sa[0].id);
                        }
                    }
                    // Enhance equipped to +5
                    for (const slot of ['weapon','armor','accessory','treasure']) {
                        const aid = g.equippedArtifacts[slot];
                        if (!aid) continue;
                        const art = g.artifacts.find(a => a.id === aid);
                        if (!art || (art.enhance||0) >= 5) continue;
                        const cost = g.getEnhanceCost(art);
                        if (cost && g.daoEssence >= cost.essence && g.artifactDust >= cost.dust)
                            g.enhanceArtifact(aid, false);
                    }
                    // Disassemble extras
                    if (g.artifacts.length > 6) {
                        const keep = new Set(Object.values(g.equippedArtifacts).filter(Boolean));
                        for (const art of [...g.artifacts])
                            if (!keep.has(art.id) && g.artifacts.length > 4)
                                g.disassembleArtifact(art.id);
                    }
                });
            }

            // ── FORMATIONS + INSIGHT (every 10 ticks) ──
            if (tick % 10 === 0) {
                await page.evaluate(() => {
                    const g = game;
                    if (typeof FORMATIONS !== 'undefined') {
                        for (const f of FORMATIONS) {
                            if (g.isFormationSelected && g.isFormationSelected(f.id))
                                g.buyFormation && g.buyFormation(f.id);
                            else if (g.selectedFormations && g.selectedFormations.length < 3)
                                g.selectFormation && g.selectFormation(f.id);
                        }
                    }
                    if (typeof g.buyInsight === 'function' && g.daoEssence > 20) {
                        const cost = g.getInsightCost ? g.getInsightCost() : 999;
                        if (g.daoEssence >= cost) g.buyInsight();
                    }
                });
            }

            // ── STATUS LOG (every 30 ticks = ~15s) ──
            if (tick % 30 === 0) {
                const s = await page.evaluate(() => {
                    const g = game;
                    return {
                        r: g.realmIndex, s: g.subLevel, rn: REALMS[g.realmIndex].name,
                        a: g.characterAge(), ma: g.maxAge(),
                        str: g.strength, spi: g.spirit, lck: g.luck,
                        st: g.stones, d: g.daoLevel||0,
                        act: g.currentActivity, sec: g.sect?g.sect.id:null,
                        sc: g.sect?g.sect.contribution:0
                    };
                });
                const m = Math.floor(tick*0.5/60), sec = Math.floor(tick*0.5)%60;
                log(`${String(m).padStart(2)}:${String(sec).padStart(2,'0')} Ж${lifeNumber} ${s.rn}[${s.r}].${s.s} ${s.a}/${s.ma}л С${s.str}Д${s.spi}У${s.lck} 💎${s.st} Д${s.d} ${s.act} ${s.sec||'-'}(${s.sc})`);
            }

        } catch (e) {
            log(`⚠ Тик ${tick}: ${e.message.substring(0, 100)}`);
        }

        await page.waitForTimeout(200);
    }

    // ИТОГ
    log(`\n${'═'.repeat(50)}`);
    log(`ИТОГО ${BOT_NAME}:`);
    log(`  Жизней: ${lifeNumber}`);
    log(`  Всего прожито: ${totalYearsLived} лет`);
    log(`  МАКС ВОЗРАСТ: ${maxAge} лет`);
    log(`  Макс реалм: ${maxRealmName} [${maxRealm}]`);
    lifeStats.sort((a, b) => b.age - a.age);
    lifeStats.slice(0, 5).forEach(s =>
        log(`    Ж${s.life}: ${s.age}л ${s.realmName}[${s.realm}] ${s.sect||'-'}`)
    );
    log(`${'═'.repeat(50)}`);

    fs.writeFileSync(path.resolve(__dirname, `bot${BOT_ID}_${SECT_STRATEGY}.log`), logLines.join('\n'), 'utf-8');
    try {
        const save = await page.evaluate(() => JSON.stringify(getSaveableState()));
        fs.writeFileSync(path.resolve(__dirname, `save_bot${BOT_ID}.json`), save, 'utf-8');
    } catch(e) {}
    await browser.close();
})();
