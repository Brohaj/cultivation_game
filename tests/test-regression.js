const PROJECT_ROOT = require('node:path').resolve(__dirname, '..');
// Быстрые регрессии игровой логики без браузера и внешних зависимостей.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const { createContext, scripts } = require('./test-support');

let passed = 0;
let failed = 0;
function test(name, fn) {
    try { fn(); passed++; console.log(`PASS ${name}`); }
    catch (error) { failed++; console.error(`FAIL ${name}\n${error.stack}`); }
}

test('Все подключённые скрипты парсятся и ранние события регистрируются', () => {
    for (const script of scripts) new vm.Script(fs.readFileSync(path.join(PROJECT_ROOT, script), 'utf8'), { filename: script });
    const ctx = createContext();
    assert.equal(ctx.run(`['herbalist_gift', 'rumor_lost_caravan', 'rumor_hundred_schools'].every(id => EVENTS.some(e => e.id === id))`), true);
});

test('Небесный Барьер сохраняет ци, Дао, пилюльный бонус и счётчик прорывов', () => {
    const ctx = createContext();
    ctx.run(`game.realmIndex=9; game.subLevel=4; game.sect={id:'jade_purity',rank:0,contribution:0};
        game.daoLevel=28; game.daoProgress=17; game.qi=game.qiNeeded(); game.flags._pillBreakthroughBonus=.05;
        Math.random=()=>{throw new Error('Blocked breakthrough must not roll RNG');};`);
    const qi = ctx.run('game.qi');
    assert.equal(ctx.run('game.breakthrough().result'), 'blocked');
    assert.equal(ctx.run('game.qi'), qi);
    assert.equal(ctx.run('game.daoProgress'), 17);
    assert.equal(ctx.run('game.flags._pillBreakthroughBonus'), .05);
    assert.equal(ctx.run('game.totalBreakthroughs'), 0);
});

test('Нехватка Дао блокирует попытку до броска случайности и потерь', () => {
    const ctx = createContext();
    ctx.run(`game.realmIndex=3; game.sect={id:'jade_purity',rank:0,contribution:0};
        game.daoLevel=0; game.daoProgress=3; game.qi=game.qiNeeded(); game.flags._pillBreakthroughBonus=.05;
        Math.random=()=>{throw new Error('No Dao: RNG must not run');};`);
    const qi = ctx.run('game.qi');
    assert.equal(ctx.run('game.breakthrough().result'), 'blocked');
    assert.equal(ctx.run('game.qi'), qi);
    assert.equal(ctx.run('game.daoProgress'), 3);
    assert.equal(ctx.run('game.flags._pillBreakthroughBonus'), .05);
});

test('Разрешённый прорыв продвигает персонажа и увеличивает счётчик один раз', () => {
    const ctx = createContext();
    ctx.run('game.qi=game.qiNeeded();');
    assert.equal(ctx.run('game.breakthrough().result'), 'success');
    assert.equal(ctx.run('game.subLevel'), 2);
    assert.equal(ctx.run('game.totalBreakthroughs'), 1);
    assert.equal(ctx.run('game.qi'), 0);
});

test('Финальный эффект вознесения переживает JSON save/load и применяется один раз', () => {
    let ctx = createContext();
    ctx.run(`game.realmIndex=3; game.spirit=100; game.stones=1000; game.daoEssence=100; game.artifactDust=100;
        game.expeditionCompletions.spirit_forest=10;
        game.addAdventureRumor('ascend_spirit_forest'); game.acceptAdventure('ascend_spirit_forest');
        game.chooseAdventureOption(0,0); game.chooseAdventureOption(0,0); saveGame();`);
    const save = ctx.saved();
    assert.equal(save.activeAdventures.length, 1);
    ctx = createContext(save);
    assert.equal(ctx.run('applyLoadedState(loadGame())'), true);
    ctx.run('game.years+=25; game.tickAdventures();');
    assert.equal(ctx.run('game.ascendedLocations.spirit_forest'), 1);
    assert.equal(ctx.run(`game.hasTechnique('stone_meditation')`), true);
    assert.equal(ctx.run(`game.completedAdventures.includes('ascend_spirit_forest')`), true);
    const total = ctx.run('game.prestige.totalAdventures');
    ctx.run('game.tickAdventures();');
    assert.equal(ctx.run('game.prestige.totalAdventures'), total);
});

test('Лесное испытание второго тира открывается на 20-м походе после первого вознесения', () => {
    const ctx = createContext();
    ctx.run(`game.realmIndex=7; game.spirit=100; game.strength=1000;
        game.stones=10000; game.daoEssence=1000; game.artifactDust=1000;
        game.expeditionCompletions.spirit_forest=9; Math.random=()=>.999;
        game.startExpedition('spirit_forest'); game._completeExpedition();`);
    assert.equal(ctx.run('game.expeditionCompletions.spirit_forest'), 10);
    assert.equal(ctx.run(`game.adventureRumors.some(r=>r.id==='ascend_spirit_forest')`), true);
    ctx.run(`game.acceptAdventure('ascend_spirit_forest');
        game.chooseAdventureOption(0,0); game.chooseAdventureOption(0,0);
        game.years+=25; game.tickAdventures();`);
    assert.equal(ctx.run('game.ascendedLocations.spirit_forest'), 1);
    assert.equal(ctx.run(`game.adventureRumors.some(r=>r.id==='ascend2_spirit_forest')`), false);
    ctx.run(`for(let i=0;i<10;i++) { game.startExpedition('spirit_forest'); game._completeExpedition(); }`);
    assert.equal(ctx.run('game.expeditionCompletions.spirit_forest'), 20);
    assert.equal(ctx.run(`game.adventureRumors.filter(r=>r.id==='ascend2_spirit_forest').length`), 1);
    ctx.run(`game.acceptAdventure('ascend2_spirit_forest'); game.abandonAdventure(0);
        game.startExpedition('spirit_forest'); game._completeExpedition();`);
    assert.equal(ctx.run('game.expeditionCompletions.spirit_forest'), 21);
    assert.equal(ctx.run(`game.adventureRumors.filter(r=>r.id==='ascend2_spirit_forest').length`), 1,
        'После отказа следующий поход возвращает постоянный слух');
});

test('Корень Мира появляется после первого вознесения при уже выполненных 20 походах и полном списке слухов', () => {
    const ctx = createContext();
    ctx.run(`game.realmIndex=7; game.spirit=100; game.strength=1000;
        game.stones=10000; game.daoEssence=1000; game.artifactDust=1000;
        game.expeditionCompletions={spirit_forest:19,beast_cave:10,forgotten_ruins:10,
            heavenly_auction:10,demon_abyss:10,immortal_palace:10};
        Math.random=()=>.999;
        game.startExpedition('spirit_forest'); game._completeExpedition();
        game.addAdventureRumor('ascend_spirit_forest');
        game.acceptAdventure('ascend_spirit_forest');
        for (const id of ['beast_cave','forgotten_ruins','heavenly_auction','demon_abyss','immortal_palace']) {
            if (!game.addAdventureRumor('ascend_'+id)) throw new Error('Не удалось создать исходный слух: '+id);
        }`);
    assert.equal(ctx.run('game.expeditionCompletions.spirit_forest'), 20);
    assert.equal(ctx.run('game.adventureRumors.length'), 5);
    assert.equal(ctx.run(`game.adventureRumors.some(r=>r.id==='ascend2_spirit_forest')`), false);
    ctx.run(`game.chooseAdventureOption(0,0); game.chooseAdventureOption(0,1);
        game.years+=25; game.tickAdventures();`);
    assert.equal(ctx.run('game.ascendedLocations.spirit_forest'), 1);
    assert.equal(ctx.run('game.adventureRumors.length'), 6, 'Пять старых слухов не потеряны');
    assert.equal(ctx.run(`game.adventureRumors.filter(r=>r.id==='ascend2_spirit_forest').length`), 1);
    assert.equal(ctx.run(`game.addAdventureRumor('ascend2_spirit_forest')`), false, 'Слух не дублируется');
    ctx.run(`game.acceptAdventure('ascend2_spirit_forest');
        game.chooseAdventureOption(0,0); game.chooseAdventureOption(0,0);
        game.years+=20; game.tickAdventures();`);
    assert.equal(ctx.run('game.ascendedLocations.spirit_forest'), 2);
    assert.equal(ctx.run(`game.hasTechnique('wood_rejuvenation')`), true);
    assert.equal(ctx.run('game.adventureRumors.length'), 5, 'Исходные слухи остались после Корня Мира');
});

test('Старое финальное ожидание без сериализованного эффекта восстанавливается из истории', () => {
    let ctx = createContext();
    ctx.run(`game.realmIndex=3; game.spirit=100; game.stones=1000; game.daoEssence=100; game.artifactDust=100;
        game.expeditionCompletions.spirit_forest=10;
        game.addAdventureRumor('ascend_spirit_forest'); game.acceptAdventure('ascend_spirit_forest');
        game.chooseAdventureOption(0,0); game.chooseAdventureOption(0,0); saveGame();`);
    const save = ctx.saved();
    const adventure = save.activeAdventures[0];
    for (const key of Object.keys(adventure)) {
        if (/effect|outcome/i.test(key)) delete adventure[key];
    }
    for (const step of adventure.completedSteps) delete step.choiceIdx;
    save.version = 13;
    ctx = createContext(save);
    ctx.run('applyLoadedState(loadGame()); game.years+=25; game.tickAdventures();');
    assert.equal(ctx.run('game.ascendedLocations.spirit_forest'), 1);
    assert.equal(ctx.run(`game.hasTechnique('stone_meditation')`), true);
});

test('Озеро Зеркальной Души выдаёт гарантированную технику по сюжетным флагам', () => {
    const ctx = createContext();
    ctx.run(`game.realmIndex=5; game.spirit=100;
        game.addAdventureRumor('mirror_lake'); game.acceptAdventure('mirror_lake');
        game.chooseAdventureOption(0,0); game.chooseAdventureOption(0,1); game.chooseAdventureOption(0,1);`);
    assert.equal(ctx.run(`game.hasTechnique('mirror_soul_art')`), true);
    assert.equal(ctx.run(`game.completedAdventures.includes('mirror_lake')`), true);
});

test('Ларец Рынка Теней выдаёт артефакт без исключения на нефинальном шаге', () => {
    const ctx = createContext();
    ctx.run(`game.realmIndex=5; game.luck=100; game.stones=1000;
        game.addAdventureRumor('shadow_market'); game.acceptAdventure('shadow_market');
        game.chooseAdventureOption(0,0); game.chooseAdventureOption(0,0);`);
    assert.equal(ctx.run('game.artifacts.length'), 1);
    assert.equal(ctx.run('game.activeAdventures[0].currentStep'), 2);
});

for (const id of ['fallen_immortal', 'oblivion_gate']) {
    test(`Промежуточная награда ${id} оставляет этап выхода и не дублируется после загрузки`, () => {
        let ctx = createContext();
        ctx.run(`game.realmIndex=9; game.spirit=1000; game.strength=1000; game.luck=100;
            game.stones=1000; game.daoEssence=500; game.qi=game.qiNeeded(); Math.random=()=>0;
            game.addAdventureRumor('${id}'); game.acceptAdventure('${id}');
            game.chooseAdventureOption(0,0); game.chooseAdventureOption(0,${id === 'fallen_immortal' ? 1 : 0});
            game.chooseAdventureOption(0,0);`);
        assert.equal(ctx.run('game.activeAdventures[0]?.currentStep'), 3);
        assert.equal(ctx.run(`game.completedAdventures.includes('${id}')`), false);
        assert.equal(ctx.run('game.prestige.totalAdventures || 0'), 0);
        if (id === 'fallen_immortal') assert.equal(ctx.run('game.artifacts.length'), 1);
        else assert.equal(ctx.run(`game.hasTechnique('oblivion_memory')`), true);
        const essence = ctx.run('game.daoEssence');
        const artifacts = ctx.run('game.artifacts.length');
        const qi = ctx.run('game.qi');
        const loss = ctx.run('Math.floor(game.qiNeeded()*.25)');
        ctx.run('saveGame();');
        ctx = createContext(ctx.saved());
        ctx.run('applyLoadedState(loadGame()); game.tickAdventures();');
        assert.equal(ctx.run('game.daoEssence'), essence);
        assert.equal(ctx.run('game.artifacts.length'), artifacts);
        assert.equal(ctx.run('game.chooseAdventureOption(0,0)'), true);
        assert.equal(ctx.run('game.qi'), qi - loss);
        assert.equal(ctx.run('game.daoEssence'), essence);
        assert.equal(ctx.run('game.artifacts.length'), artifacts);
        assert.equal(ctx.run(`game.completedAdventures.includes('${id}')`), true);
        assert.equal(ctx.run('game.prestige.totalAdventures'), 1);
        assert.equal(ctx.run('game.activeAdventures.length'), 0);
    });
}

test('Провальная промежуточная ветка Врат Забвения также ведёт к выходу', () => {
    const ctx = createContext();
    ctx.run(`game.realmIndex=9; game.spirit=100; game.strength=1; game.qi=game.qiNeeded();
        game.addAdventureRumor('oblivion_gate'); game.acceptAdventure('oblivion_gate');
        game.chooseAdventureOption(0,0); game.chooseAdventureOption(0,1); game.chooseAdventureOption(0,0);`);
    assert.equal(ctx.run('game.activeAdventures[0]?.currentStep'), 3);
    assert.equal(ctx.run('game.activeAdventures[0].flags.learned_scraps'), true);
    assert.equal(ctx.run('game.completedAdventures.length'), 0);
    ctx.run('game.chooseAdventureOption(0,1);');
    assert.equal(ctx.run('game.qi'), 0);
    assert.equal(ctx.run(`game.completedAdventures.includes('oblivion_gate')`), true);
    assert.equal(ctx.run('game.prestige.totalAdventures'), 1);
});

test('Вознесение техники секты сохраняет тир, имя, уровень и списанную стоимость', () => {
    let ctx = createContext();
    ctx.run(`game.realmIndex=7; game.daoEssence=100000; game.joinSect('jade_purity');
        game.techLevels.jade_meditation=12;`);
    assert.equal(ctx.run(`game.ascendTechnique('jade_meditation')`), true);
    const name = ctx.run(`TECHNIQUES.find(t=>t.id==='jade_meditation').name`);
    ctx.run('saveGame();');
    assert.equal(ctx.saved().techAscendedTiers.jade_meditation, 'epic');
    ctx = createContext(ctx.saved());
    ctx.run('applyLoadedState(loadGame());');
    assert.equal(ctx.run(`TECHNIQUES.find(t=>t.id==='jade_meditation').tier`), 'epic');
    assert.equal(ctx.run(`TECHNIQUES.find(t=>t.id==='jade_meditation').name`), name);
    assert.equal(ctx.run('game.techLevels.jade_meditation'), 1);
    assert.equal(ctx.run('game.daoEssence'), 99600);
});

test('Импорт обычного сейва сбрасывает тир ранее вознесённой техники', () => {
    const ctx = createContext();
    ctx.run(`game.learnTechnique('basic_breathing'); game.techLevels.basic_breathing=5;
        game.realmIndex=3; game.daoEssence=1000; var plain=JSON.parse(JSON.stringify(getSaveableState()));
        game.ascendTechnique('basic_breathing'); applyLoadedState(plain);`);
    assert.equal(ctx.run(`TECHNIQUES.find(t=>t.id==='basic_breathing').tier`), 'common');
});

test('Повторное открытие и загрузка перерождения начисляют карму за жизнь только один раз', () => {
    let ctx = createContext();
    ctx.run('game.realmIndex=3; game.years=160; game.birthYear=0; showRebirthModal(false);');
    const earned = ctx.run('game.prestige.karma');
    assert.ok(earned > 0);
    ctx.run('showRebirthModal(false); saveGame();');
    assert.equal(ctx.run('game.prestige.karma'), earned);
    ctx = createContext(ctx.saved());
    ctx.run('applyLoadedState(loadGame()); initGame();');
    assert.equal(ctx.run('game.prestige.karma'), earned);
    assert.equal(ctx.run('game.tickTimer'), null);
    assert.equal(ctx.timers.size, 0);
    ctx.run('showRebirthModal(false); performRebirth();');
    assert.equal(ctx.run('game.prestige.karma'), earned);
    assert.equal(ctx.run('game.prestige.totalRebirths'), 1);
});

test('Естественное перерождение сохраняет исходную карму после покупки улучшения', () => {
    let ctx = createContext();
    ctx.run('game.realmIndex=3; game.years=160; game.gameOver=true; game.prestige.karma=1000; showRebirthModal(true);');
    const credited = ctx.run('game.prestige.karma');
    ctx.run(`game.buyKarmaUpgrade('enlightenment');`);
    const afterPurchase = ctx.run('game.prestige.karma');
    assert.ok(afterPurchase < credited);
    ctx.run('saveGame();');
    ctx = createContext(ctx.saved());
    ctx.run('applyLoadedState(loadGame()); initGame(); performRebirth();');
    assert.equal(ctx.run('game.prestige.karma'), afterPurchase);
    assert.equal(ctx.run('game.prestige.totalRebirths'), 1);
});

test('Миграция достижений переименовывает ID и убирает только дубликаты', () => {
    const ctx = createContext();
    ctx.run(`applyLoadedState({milestones:['ten_meditations','hundred_med','ten_breakthroughs'],version:13});`);
    assert.deepEqual(JSON.parse(ctx.run('JSON.stringify(game.milestones)')), ['five_breakthroughs', 'ten_breakthroughs']);
});

test('Законный пустой список экипированных техник остаётся пустым после загрузки', () => {
    const ctx = createContext();
    ctx.run(`applyLoadedState({techniques:['basic_breathing'],equippedTechniques:[],version:13});`);
    assert.equal(ctx.run('game.equippedTechniques.length'), 0);
});

test('Очередь оплаченного Озарения переживает загрузку и не переносится в новую жизнь', () => {
    let ctx = createContext();
    // Состояние старой версии: эссенция уже оплачена, XP ещё в очереди.
    ctx.run(`game.learnTechnique('basic_breathing'); game.daoEssence=90;
        game._insightUses=1; game._pendingInsightXP={basic_breathing:game.getInsightXpGain('basic_breathing')};
        game._insightTicksLeft=10; saveGame();`);
    const essence = ctx.run('game.daoEssence');
    const xp = ctx.run('game.getInsightXpGain("basic_breathing")');
    const save = ctx.saved();
    ctx = createContext(save);
    ctx.run('applyLoadedState(loadGame()); for(let i=0;i<10;i++) game._tickInsightXP();');
    assert.equal(ctx.run('game.daoEssence'), essence);
    assert.equal(ctx.run('game.techXP.basic_breathing'), xp);
    ctx.run(`game.buyInsight(); game.reset(); game.learnTechnique('basic_breathing'); game._tickInsightXP();`);
    assert.equal(ctx.run('game.techXP.basic_breathing'), 0);
});

test('Стартовый ранг Гения Секты действует даже при вступлении с реалма 0', () => {
    const ctx = createContext();
    ctx.run(`game.prestige.lastBody='sect_genius'; game.prestige.bodyAscensions.sect_genius=3;
        game.joinSect('jade_purity');`);
    assert.equal(ctx.run('game.getSectRankIndex()'), 2);
    ctx.run('game.tickSectMission();');
    assert.equal(ctx.run('game.getSectRankIndex()'), 2);
    assert.equal(ctx.run('game.sect.rank'), 2);
});

test('Снятая техника теряет элементальный резонанс', () => {
    const ctx = createContext();
    ctx.run(`game.spiritualRoot={qiMultiplier:1,elements:['earth']}; game.learnTechnique('stone_meditation');`);
    assert.equal(ctx.run('game.getElementalResonance()'), 1);
    ctx.run(`game.unequipTechnique('stone_meditation');`);
    assert.equal(ctx.run('game.getElementalResonance()'), 0);
});

test('Дыхание Уединения увеличивает множитель духа только при экипировке', () => {
    const ctx = createContext();
    ctx.run('game.realmIndex=7; game.spirit=30; game.prestige.totalRebirths=3;');
    ctx.run(`game.joinSect('hidden_hermit'); game.unequipTechnique('solitude_breath');`);
    const base = ctx.run('game.getSpiritMultiplier()');
    ctx.run(`game.equipTechnique('solitude_breath'); game.techLevels.solitude_breath=10;`);
    assert.ok(ctx.run('game.getSpiritMultiplier()') > base);
    ctx.run(`game.unequipTechnique('solitude_breath');`);
    assert.equal(ctx.run('game.getSpiritMultiplier()'), base);
});

test('Печь применяет заявленные 8% к базовой пилюле', () => {
    const ctx = createContext();
    ctx.run(`game.formations.alchemyFurnace=1; game.selectedFormations=['alchemyFurnace']; game.pills=1;`);
    assert.equal(ctx.run('game.getPillQi(1)'), 540);
});

test('После снижения стата XP оплачивает каждый следующий уровень по его собственному порогу', () => {
    const ctx = createContext();
    ctx.run(`game.strength=49; game.activityXP.strength=5500;
        var first=game.statXpNeeded('strength'); game._checkStatLevelUp('strength');`);
    assert.equal(ctx.run('game.strength'), 50);
    assert.equal(ctx.run('game.activityXP.strength'), ctx.run('5500-first'));
    assert.ok(ctx.run('game.activityXP.strength') >= 0);
    assert.ok(ctx.run('game.activityXP.strength < game.statXpNeeded("strength")'));
});

test('Цена 10 Озарений учитывает подорожание каждого свитка', () => {
    const ctx = createContext();
    assert.equal(ctx.run('game.getInsightBulkCost(10)'), 325);
    ctx.run('game.realmIndex=3; game._insightUses=2;');
    assert.equal(ctx.run('game.getInsightBulkCost(10)'), 515);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
