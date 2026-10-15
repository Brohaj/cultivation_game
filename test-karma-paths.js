const assert = require('node:assert/strict');
const test = require('node:test');
const {createContext} = require('./test-support');

function ready() {
    const ctx = createContext();
    ctx.run(`game.realmIndex=3;game.years=150;game.strength=10;game.spirit=10;
        game.prestige.karmaUpgrades={pastLifeBook:1,formationRespec:1,practiceSchedule:1};
        renderSects=renderFormations=renderTechniques=function(){};`);
    return ctx;
}

test('Книга сохраняет одну обычную технику, исходный тир и первый уровень', () => {
    const ctx = ready();
    ctx.run(`game.learnTechnique('basic_breathing');game.learnTechnique('iron_body');
        game.techLevels.iron_body=8;TECHNIQUES.find(t=>t.id==='iron_body').tier='divine';
        game.beginRebirth(false);`);
    assert.equal(ctx.run('game.chooseInheritedTechnique("iron_body","peasant")'), false, 'Начало на realm0 не обходит realm1');
    ctx.run('game.prestige.karmaUpgrades.pathMemory=1;');
    assert.equal(ctx.run('game.chooseInheritedTechnique("iron_body","peasant")'), true);
    assert.equal(ctx.run('game.rebirth("peasant",false)'), true);
    ctx.run('game.selectSpiritualRoot("common");game.learnStartingTechnique();');
    assert.equal(ctx.run('game.hasTechnique("iron_body")'), true);
    assert.equal(ctx.run('game.hasTechnique("basic_breathing")'), false);
    assert.equal(ctx.run('game.techLevels.iron_body'), 1);
    assert.equal(ctx.run('TECHNIQUES.find(t=>t.id==="iron_body").tier'), 'uncommon');
});

test('Книга исключает техники тела, секты и приключения и переживает pending reload', () => {
    const ctx = ready();
    ctx.run(`game.learnTechnique('basic_breathing');game.learnTechnique('body_masters_legacy');
        game.learnTechnique('heavenly_dao_shield');game.beginRebirth(false);saveGame();`);
    assert.equal(ctx.run('game.chooseInheritedTechnique("body_masters_legacy","peasant")'), false);
    assert.equal(ctx.run('game.chooseInheritedTechnique("heavenly_dao_shield","peasant")'), false);
    const loaded = createContext(ctx.saved()); loaded.run('applyLoadedState(loadGame());');
    assert.equal(loaded.run('game.chooseInheritedTechnique("basic_breathing","peasant")'), true);
    assert.equal(loaded.run('game.rebirth("peasant",false)'), true);
    loaded.run('game.prestige.karmaUpgrades.ancestorLegacy=2;game.learnStartingTechnique();');
    assert.equal(loaded.run('TECHNIQUES.find(t=>t.id==="basic_breathing").tier'), 'rare');
});

test('Пересмотр меняет ровно один слот без возврата денег или переноса уровней', () => {
    const ctx = ready();
    ctx.run('game.prestige.unlockedFormations=["qiPillar","wardCircle","realmGate"];game.selectedFormations=["qiPillar","wardCircle"];game.formations={qiPillar:10,wardCircle:4};game.stones=300;');
    assert.equal(ctx.run('game.replaceFormation("qiPillar","realmGate")'), true);
    assert.equal(ctx.run('game.stones'), 300);
    assert.equal(ctx.run('game.formations.qiPillar'), undefined);
    assert.equal(ctx.run('game.formations.realmGate'), 0);
    assert.equal(ctx.run('game.selectedFormations.length'), 2);
    assert.equal(ctx.run('game.replaceFormation("realmGate","qiPillar")'), false);
    const loaded = createContext(ctx.saved()); loaded.run('applyLoadedState(loadGame());');
    assert.equal(loaded.run('game.replaceFormation("wardCircle","qiPillar")'), false);
    loaded.run('game.reset(true);game.selectedFormations=["qiPillar"];');
    assert.equal(loaded.run('game.replaceFormation("qiPillar","realmGate")'), true);
});

test('Пересмотр отвергает закрытую формацию, дубликат и закрытую жизнь атомарно', () => {
    const ctx = ready(); ctx.run('game.selectedFormations=["qiPillar","wardCircle"];');
    const before = ctx.run('JSON.stringify(getSaveableState())');
    assert.equal(ctx.run('game.replaceFormation("qiPillar","wardCircle")'), false);
    assert.equal(ctx.run('game.replaceFormation("qiPillar","alchemyFurnace")'), false);
    assert.equal(ctx.run('JSON.stringify(getSaveableState())'), before);
    ctx.run('game.pendingRebirth={karmaEarned:0};');
    assert.equal(ctx.run('game.replaceFormation("qiPillar","realmGate")'), false);
});

test('Расписание следует ци→Дао→стат, без автоматического прорыва', () => {
    const ctx = ready();
    ctx.run('game.sect={id:"crimson_flame",rank:0,contribution:0};game.qi=0;game.daoLevel=0;');
    assert.equal(ctx.run('game.setPracticePlan("spirit",20)'), true);
    assert.equal(ctx.run('game.currentActivity'), 'meditation');
    ctx.run('game.qi=game.qiNeeded();game.tickPracticePlan();');
    assert.equal(ctx.run('game.currentActivity'), 'body');
    ctx.run('game.daoLevel=1;game.tickPracticePlan();');
    assert.equal(ctx.run('game.currentActivity'), 'dao');
    assert.equal(ctx.run('game.subLevel'), 1);
    assert.equal(ctx.run('game.realmIndex'), 3);
});

test('Расписание не медитирует впустую в походе, сохраняется и отключается ручным выбором', () => {
    const ctx = ready();
    ctx.run('game.expedition={locationId:"spirit_forest",startYear:0,duration:50};game.qi=0;game.setPracticePlan("strength",20);');
    assert.equal(ctx.run('game.currentActivity'), 'body');
    const loaded = createContext(ctx.saved()); loaded.run('applyLoadedState(loadGame());');
    assert.equal(loaded.run('game.practicePlan.enabled'), true);
    loaded.run('game.setActivity("dao");game.tickPracticePlan();');
    assert.equal(loaded.run('game.currentActivity'), 'dao');
    assert.equal(loaded.run('game.practicePlan.enabled'), false);
});

test('Расписание нельзя включить без покупки и с некорректной целью', () => {
    const ctx = ready();
    for (const expression of ['NaN','Infinity','0','-1','2.5','10001']) assert.equal(ctx.run(`game.setPracticePlan('strength',${expression})`), false);
    ctx.run('delete game.prestige.karmaUpgrades.practiceSchedule;');
    assert.equal(ctx.run('game.setPracticePlan("spirit",10)'), false);
});
