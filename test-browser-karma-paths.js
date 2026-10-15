// Настоящие клики кармических разрешений в отдельном профиле прототипа.
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({headless:true});
    const errors = [];
    const marker = 'prototype-test-main-marker-v1';
    const url = pathToFileURL(path.join(__dirname,'index.html')).href;
    try {
        async function click(page, selector, options) {
            await page.locator(selector).click(options);
            await page.evaluate(() => new Promise(resolve => setTimeout(resolve,0)));
        }
        async function freshPage() {
            const page = await browser.newPage({viewport:{width:1500,height:1100}});
            page.on('pageerror', error => errors.push(error.message));
            await page.addInitScript(marker => {
                // Не перезаписываем marker при reload: иначе тест скрыл бы порчу.
                if (localStorage.getItem('cultivation_game_save') === null) localStorage.setItem('cultivation_game_save',marker);
                window.addEventListener('load', () => { if (typeof game !== 'undefined') game.stop(); });
            },marker);
            await page.goto(url);
            await click(page,'#btn-accept-root');
            await click(page,'#intro-modal button');
            await page.evaluate(() => game.stop());
            return page;
        }
        async function acceptNextLife(page) {
            await click(page,'.btn-rebirth-go');
            await click(page,'.root-card[onclick="selectRootUI(\'common\')"]');
            await click(page,'#btn-accept-root');
            await page.evaluate(() => game.stop());
        }

        const practice = await freshPage();
        await practice.evaluate(() => {
            game.realmIndex=3;game.subLevel=1;game.years=200;game.birthYear=0;
            game.prestige.karma=100;game.milestones=['realm_4'];showRebirthModal(false);
        });
        const practicePrice = await practice.evaluate(() => ({cost:game.getUpgradeCost('practiceSchedule'),balance:game.prestige.karma,spent:game.prestige.karmaSpent}));
        await click(practice,'button[onclick="buyKarmaUpgradeUI(\'practiceSchedule\')"]');
        assert.deepEqual(await practice.evaluate(() => ({level:game.prestige.karmaUpgrades.practiceSchedule,balance:game.prestige.karma,spent:game.prestige.karmaSpent})),
            {level:1,balance:practicePrice.balance-practicePrice.cost,spent:practicePrice.spent+practicePrice.cost});
        await acceptNextLife(practice);
        await practice.evaluate(() => {
            game.realmIndex=3;game.subLevel=1;game.qi=0;game.strength=1;game.spirit=1;game.luck=1;
            game.daoLevel=0;game.daoProgress=0;game.sect={id:'jade_purity',rank:0,contribution:0};
            game.currentActivity='body';switchTab('cultivation');updateUI();
        });
        await practice.locator('#practice-target-stat').selectOption('strength');
        await practice.locator('#practice-target-level').fill('5');
        await click(practice,'#practice-plan-start');
        assert.equal(await practice.evaluate(() => game.currentActivity),'meditation');
        assert.match(await practice.locator('#practice-plan-status').textContent(),/медитация/);
        await practice.evaluate(() => {game.qi=game.qiNeeded();game.tick();});
        assert.equal(await practice.evaluate(() => game.currentActivity),'dao');
        assert.match(await practice.locator('#practice-plan-status').textContent(),/постижение Дао/);
        await practice.evaluate(() => {game.daoLevel=1;game.daoProgress=0;game.tick();});
        assert.equal(await practice.evaluate(() => game.currentActivity),'body');
        assert.match(await practice.locator('#practice-plan-status').textContent(),/закалка тела/);
        assert.equal(await practice.evaluate(() => game.totalBreakthroughs),0,'Расписание не выполняет прорыв автоматически');
        await click(practice,'.activity-row[data-activity="dao"]');
        assert.deepEqual(await practice.evaluate(() => ({enabled:game.practicePlan.enabled,activity:game.currentActivity})),{enabled:false,activity:'dao'});
        await practice.reload();
        assert.deepEqual(await practice.evaluate(() => ({enabled:game.practicePlan.enabled,activity:game.currentActivity,target:game.practicePlan.target})),{enabled:false,activity:'dao',target:5});
        await click(practice,'#practice-plan-start');
        await practice.reload();
        assert.equal(await practice.evaluate(() => game.practicePlan.enabled),true);
        await click(practice,'#practice-plan-stop');
        assert.equal(await practice.evaluate(() => game.practicePlan.enabled),false);
        assert.equal(await practice.locator('#practice-plan-stop').isDisabled(),true);
        console.log('PASS Покупка расписания, ци → Дао → сила, ручная остановка и reload');
        await practice.close();

        const formation = await freshPage();
        await formation.evaluate(() => {
            game.realmIndex=3;game.daoLevel=20;game.stones=1000;
            game.prestige.karmaUpgrades.formationRespec=1;
            game.prestige.unlockedFormations=['qiPillar','wardCircle'];
            game.selectedFormations=['qiPillar'];game.formations={qiPillar:0};updateUI();
        });
        const formationCost = await formation.evaluate(() => game.getFormationUpgradeCost('qiPillar'));
        await click(formation,'button[data-formation="qiPillar"]');
        assert.equal(await formation.evaluate(() => game.formations.qiPillar),1);
        assert.equal(await formation.evaluate(() => game.stones),1000-formationCost);
        assert.deepEqual(await formation.locator('#formation-replace-new option').evaluateAll(nodes => nodes.map(node => node.value)),['wardCircle']);
        assert.equal(await formation.evaluate(() => game.canReplaceFormation('qiPillar','bodyPagoda')),false);
        await formation.locator('#formation-replace-old').selectOption('qiPillar');
        await formation.locator('#formation-replace-new').selectOption('wardCircle');
        await click(formation,'#formation-replace-confirm');
        const replaced = {selected:['wardCircle'],old:null,newLevel:0,stones:1000-formationCost,used:true};
        const formationState = () => formation.evaluate(() => ({selected:game.selectedFormations,old:game.formations.qiPillar??null,newLevel:game.formations.wardCircle,stones:game.stones,used:game.flags.formationRespecUsed}));
        assert.deepEqual(await formationState(),replaced);
        await formation.reload();
        assert.deepEqual(await formationState(),replaced);
        assert.equal(await formation.locator('#formation-replace-confirm').count(),0);
        assert.match(await formation.locator('#formations-list').textContent(),/Пересмотр пути использован/);
        assert.equal(await formation.evaluate(() => game.replaceFormation('wardCircle','qiPillar')),false);
        assert.deepEqual(await formationState(),replaced);
        console.log('PASS Замена только открытой формации: потеря уровня, без возврата, один раз за жизнь');
        await formation.close();

        const book = await freshPage();
        await book.evaluate(() => {
            game.realmIndex=3;game.subLevel=4;game.years=200;game.birthYear=0;
            game.prestige.karma=200;game.prestige.karmaUpgrades.pathMemory=1;
            game.prestige.karmaUpgrades.ancestorLegacy=2;
            game.learnTechnique('iron_body');game.learnTechnique('stone_meditation');game.learnTechnique('body_masters_legacy');
            const iron=TECHNIQUES.find(t=>t.id==='iron_body');iron.tier='epic';game.techLevels.iron_body=7;
            game.checkMilestones();showRebirthModal(false);
        });
        await click(book,'button[onclick="buyKarmaUpgradeUI(\'pastLifeBook\')"]');
        assert.equal(await book.evaluate(() => game.prestige.karmaUpgrades.pastLifeBook),1);
        const options = await book.locator('#inherited-technique-choice option').evaluateAll(nodes => nodes.map(node => node.value));
        assert.ok(options.includes('iron_body'));
        assert.equal(options.includes('body_masters_legacy'),false);
        assert.match(await book.locator('#inherited-technique-choice option[value="iron_body"]').textContent(),/Духовный/);
        await book.locator('#inherited-technique-choice').selectOption('iron_body');
        await book.evaluate(() => new Promise(resolve => setTimeout(resolve,0)));
        assert.equal(await book.evaluate(() => game.pendingRebirth.pastLifeTechniqueId),'iron_body');
        await book.reload();
        assert.equal(await book.locator('#inherited-technique-choice').inputValue(),'iron_body');
        await acceptNextLife(book);
        const inherited = {realm:1,ids:['iron_body'],level:1,tier:'uncommon',starting:'iron_body'};
        const bookState = () => book.evaluate(() => ({realm:game.realmIndex,ids:game.techniques,level:game.techLevels.iron_body,tier:TECHNIQUES.find(t=>t.id==='iron_body').tier,starting:game.startingTechniqueId}));
        assert.deepEqual(await bookState(),inherited);
        await book.reload();
        assert.deepEqual(await bookState(),inherited);
        console.log('PASS Книга наследует Железное Тело исходного тира и уровня 1 вместо Дыхания');
        await book.close();

        const mastery = await freshPage();
        await mastery.evaluate(() => {
            game.realmIndex=5;game.subLevel=4;game.years=900;game.birthYear=0;
            game.prestige.totalRebirths=100;game.prestige.qualifiedRebirths=2;
            game.prestige.bodyLives={peasant:2};game.prestige.lastBody='alchemist_heir';
            game.prestige.permanentMilestones=['ten_breakthroughs'];game.prestige.karma=1000;
            showRebirthModal(false);
        });
        assert.match(await mastery.locator('.bodies-hint').textContent(),/Всего перерождений: 100/);
        assert.match(await mastery.locator('.bodies-hint').textContent(),/Зачётных жизней: 3/);
        const ascend = 'button[onclick="ascendBodyUI(\'alchemist_heir\')"]';
        assert.equal(await mastery.locator(ascend).isEnabled(),true);
        await click(mastery,ascend);
        const lockedStar = await mastery.evaluate(() => ({star:game.getBodyAscensionLevel('alchemist_heir'),balance:game.prestige.karma,lives:game.getBodyLives('alchemist_heir'),qualified:game.getQualifiedRebirths()}));
        assert.equal(lockedStar.star,1);
        assert.equal(lockedStar.lives,1);
        assert.equal(await mastery.locator(ascend).isDisabled(),true);
        await click(mastery,ascend,{force:true});
        assert.deepEqual(await mastery.evaluate(() => ({star:game.getBodyAscensionLevel('alchemist_heir'),balance:game.prestige.karma,lives:game.getBodyLives('alchemist_heir'),qualified:game.getQualifiedRebirths()})),lockedStar);
        await mastery.reload();
        assert.equal(await mastery.locator(ascend).isDisabled(),true);
        assert.deepEqual(await mastery.evaluate(() => ({star:game.getBodyAscensionLevel('alchemist_heir'),balance:game.prestige.karma,lives:game.getBodyLives('alchemist_heir'),qualified:game.getQualifiedRebirths()})),lockedStar);
        console.log('PASS Звезда требует освоения своего тела; все смерти и зачётные жизни показаны отдельно');
        await mastery.close();

        const startingRealm = await freshPage();
        await startingRealm.evaluate(() => {
            game.reset();game.prestige.karmaUpgrades.pathMemory=3;
            game.rebirth('peasant',false);game.stop();saveGame();
        });
        await startingRealm.reload();
        assert.deepEqual(await startingRealm.evaluate(() => ({
            start:game._startingRealmThisLife,realm:game.realmIndex,breakthroughs:game.totalBreakthroughs,
            qualified:game.getQualifiedRebirths(),lives:game.getBodyLives('peasant'),qualifies:game.isCurrentLifeQualified()
        })),{start:3,realm:3,breakthroughs:0,qualified:0,lives:0,qualifies:false});
        await click(startingRealm,'.root-card[onclick="selectRootUI(\'common\')"]');
        await click(startingRealm,'#btn-accept-root');
        await startingRealm.evaluate(() => {game.stop();showRebirthModal(false);});
        assert.match(await startingRealm.locator('.bodies-hint').textContent(),/при старте на Ядре или выше нужен хотя бы один успешный прорыв/i);
        assert.deepEqual(await startingRealm.evaluate(() => ({
            qualified:game.getQualifiedRebirths(),lives:game.getBodyLives('peasant'),
            pending:game.pendingRebirth.qualifiedLife
        })),{qualified:0,lives:0,pending:false});
        await startingRealm.reload();
        assert.equal(await startingRealm.evaluate(() => game.getQualifiedRebirths()),0);
        assert.equal(await startingRealm.evaluate(() => game.getBodyLives('peasant')),0);
        await acceptNextLife(startingRealm);
        await startingRealm.evaluate(() => {
            game.sect={id:'jade_purity',rank:0,contribution:0};game.daoLevel=1;
            game.qi=game.qiNeeded();Math.random=()=>0.01;switchTab('cultivation');updateUI();
        });
        assert.equal(await startingRealm.locator('#btn-breakthrough').isEnabled(),true);
        await click(startingRealm,'#btn-breakthrough');
        assert.equal(await startingRealm.evaluate(() => game.totalBreakthroughs),1);
        assert.equal(await startingRealm.evaluate(() => game.subLevel),2);
        await startingRealm.reload();
        assert.equal(await startingRealm.evaluate(() => game.isCurrentLifeQualified()),true);
        await startingRealm.evaluate(() => showRebirthModal(false));
        assert.deepEqual(await startingRealm.evaluate(() => ({
            qualified:game.getQualifiedRebirths(),lives:game.getBodyLives('peasant'),
            start:game.pendingRebirth.startingRealm,breakthroughs:game.pendingRebirth.breakthroughs
        })),{qualified:1,lives:1,start:3,breakthroughs:1});
        await startingRealm.reload();
        assert.equal(await startingRealm.evaluate(() => game.getQualifiedRebirths()),1);
        assert.equal(await startingRealm.evaluate(() => game.getBodyLives('peasant')),1);
        console.log('PASS Старт Памяти Пути не даёт зачёт через reload; настоящий прорыв открывает его ровно один раз');
        await startingRealm.close();

        const storage = await freshPage();
        assert.equal(await storage.evaluate(() => SAVE_KEY),'cultivation_game_prototype_save');
        await storage.evaluate(() => {game.prestige.karma=123;saveGame();});
        assert.equal(await storage.evaluate(() => localStorage.getItem('cultivation_game_save')),marker);
        assert.equal(await storage.evaluate(() => JSON.parse(localStorage.getItem(SAVE_KEY)).prestige.karma),123);
        await click(storage,'.tab-btn[data-tab="options"]');
        storage.once('dialog', dialog => dialog.accept());
        await click(storage,'#btn-new-game');
        assert.equal(await storage.evaluate(() => localStorage.getItem('cultivation_game_save')),marker);
        assert.equal(await storage.evaluate(() => localStorage.getItem(SAVE_KEY)),null);
        assert.equal(await storage.evaluate(() => game.prestige.karma),0);
        await click(storage,'#btn-accept-root');
        await click(storage,'#intro-modal button');
        await storage.evaluate(() => {game.stop();saveGame();});
        await storage.reload();
        assert.equal(await storage.evaluate(() => localStorage.getItem('cultivation_game_save')),marker);
        assert.equal(await storage.evaluate(() => JSON.parse(localStorage.getItem(SAVE_KEY)).prestige.karma),0);
        console.log('PASS Новая игра и reload используют отдельный ключ и сохраняют marker основной игры');
        await storage.close();

        assert.deepEqual(errors,[]);
        console.log('6 karma paths browser checks passed, 0 page errors');
    } finally { await browser.close(); }
})().catch(error => {console.error(error);process.exitCode=1;});
