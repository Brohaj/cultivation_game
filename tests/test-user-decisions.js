const PROJECT_ROOT = require('node:path').resolve(__dirname, '..');
// Развилки сохраняют цену, подготовку и последствия после JSON-переходов.
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { createContext } = require('./test-support');

function start(id, setup = '') {
    const ctx = createContext();
    ctx.run(`game.realmIndex=7;game.years=1200;game.birthYear=1100;
        game.strength=100;game.spirit=100;game.luck=30;game.stones=5000;
        game.daoEssence=1000;game.artifactDust=1000;Math.random=()=>0;
        game.expeditionCompletions={heavenly_auction:10,spirit_forest:10};${setup}
        game.addAdventureRumor('${id}');game.acceptAdventure('${id}');`);
    return ctx;
}

function finishDelay(ctx) {
    ctx.run('game.years+=game.activeAdventures[0].stepDuration;game.tickAdventures();');
}

function tombRoute(route, final = 2) {
    const ctx = start('ancient_tomb');
    ctx.run(`game.chooseAdventureOption(0,0);game.chooseAdventureOption(0,${route});
        game.chooseAdventureOption(0,0);game.chooseAdventureOption(0,${final});`);
    return ctx;
}

test('Чёрный Рынок: покупка даёт rare+, бесплатный провал — только прежний ассортимент', () => {
    const paid = start('ascend_heavenly_auction','game.spirit=1;');
    const failed = start('ascend_heavenly_auction','game.spirit=1;');
    paid.run('game.chooseAdventureOption(0,1);game.chooseAdventureOption(0,0);');
    failed.run('game.chooseAdventureOption(0,0);game.chooseAdventureOption(0,0);');
    finishDelay(paid); finishDelay(failed);
    assert.equal(paid.run('game.artifacts[0].tier'),'rare');
    assert.equal(failed.run('game.artifacts[0].tier'),'uncommon');
    assert.equal(paid.run('game.artifactDust'),failed.run('game.artifactDust'));
    assert.equal(paid.run('game.stones'),failed.run('game.stones')-150);
    assert.equal(paid.run('game.ascendedLocations.heavenly_auction'),1);
    assert.equal(failed.run('game.ascendedLocations.heavenly_auction'),1);
});

test('Чёрный Рынок: знакомства дают больше сырья, оплата списывается один раз после загрузки', () => {
    const connected = start('ascend_heavenly_auction');
    connected.run('game.chooseAdventureOption(0,0);game.chooseAdventureOption(0,0);');
    finishDelay(connected);
    let paid = start('ascend_heavenly_auction');
    paid.run('game.chooseAdventureOption(0,1);saveGame();');
    const stones = paid.run('game.stones');
    paid = createContext(paid.saved()); paid.run('applyLoadedState(loadGame());Math.random=()=>0;game.chooseAdventureOption(0,0);');
    finishDelay(paid);
    assert.equal(paid.run('game.stones'),stones);
    assert.equal(connected.run('game.artifactDust'),paid.run('game.artifactDust')+20);
    assert.equal(paid.run('game.artifacts.length'),1);
    paid.run('game.tickAdventures();');
    assert.equal(paid.run('game.artifacts.length'),1);
});

test('Чёрный Рынок: недостаток 200 камней не покупает доступ и не продвигает шаг', () => {
    const ctx = start('ascend_heavenly_auction');
    ctx.run('game.stones=199;');
    assert.equal(ctx.run('game.chooseAdventureOption(0,1)'),false);
    assert.equal(ctx.run('game.stones'),199);
    assert.equal(ctx.run('game.activeAdventures[0].currentStep'),0);
    assert.equal(ctx.run('!!game.activeAdventures[0].flags.bought'),false);
});

test('Пожиратель: десять лет затопления позволяют силе 6 получить целое ядро', () => {
    const flooded = start('root_eater','game.realmIndex=2;game.strength=6;game.spirit=1;');
    flooded.run('game.chooseAdventureOption(0,2);');
    assert.equal(flooded.run('game.activeAdventures[0].stepDuration'),10);
    assert.equal(flooded.run('game.activeAdventures[0].awaitingChoice'),false);
    finishDelay(flooded); flooded.run('game.chooseAdventureOption(0,0);');
    const unprepared = start('root_eater','game.realmIndex=2;game.strength=6;game.spirit=1;');
    unprepared.run('game.chooseAdventureOption(0,0);game.chooseAdventureOption(0,0);');
    assert.equal(flooded.run('game.daoEssence'),1005);
    assert.equal(unprepared.run('game.daoEssence'),1000);
    assert.equal(flooded.run('game.artifacts.length'),1);
    assert.equal(unprepared.run('game.artifacts.length'),0);
});

test('Пожиратель: ловушка облегчает захват, затопление снижает цену живой добычи', () => {
    const lured = start('root_eater','game.realmIndex=2;game.spirit=7;game.luck=4;');
    lured.run('game.chooseAdventureOption(0,1);game.chooseAdventureOption(0,1);');
    const flooded = start('root_eater','game.realmIndex=2;game.luck=6;');
    flooded.run('game.chooseAdventureOption(0,2);'); finishDelay(flooded);
    flooded.run('game.chooseAdventureOption(0,1);');
    const ordinary = start('root_eater','game.realmIndex=2;game.strength=7;game.luck=4;');
    ordinary.run('game.chooseAdventureOption(0,0);game.chooseAdventureOption(0,1);');
    assert.equal(lured.run('game.stones'),5035);
    assert.equal(flooded.run('game.stones'),5025);
    assert.equal(ordinary.run('game.stones'),5014);
    assert.equal(lured.run('game.artifacts.length'),1);
    assert.equal(ordinary.run('game.artifacts.length'),0);
});

test('Пожиратель: неудачная приманка теряет ци и не даёт облегчения после JSON', () => {
    let ctx = start('root_eater','game.realmIndex=2;game.spirit=1;game.qi=game.qiNeeded();');
    const qi = ctx.run('game.qi'); const loss = ctx.run('Math.floor(game.qiNeeded()*.05)');
    ctx.run('game.chooseAdventureOption(0,1);saveGame();');
    ctx = createContext(ctx.saved()); ctx.run('applyLoadedState(loadGame());');
    assert.equal(ctx.run('game.qi'),qi-loss);
    assert.equal(ctx.run(`game.getAdventureCheck(ADVENTURES.find(a=>a.id==='root_eater'),ADVENTURES.find(a=>a.id==='root_eater').steps[1].choices[1],game.activeAdventures[0].flags).luck`),8);
});

test('Зал Девяти Испытаний: сохранены три кнопки, каждый успех меняет полный итог', () => {
    const spirit = tombRoute(0), force = tombRoute(1), luck = tombRoute(2);
    assert.equal(spirit.run("ADVENTURES.find(a=>a.id==='ancient_tomb').steps[1].choices.length"),3);
    assert.equal(spirit.run('game.daoEssence'),1062);
    assert.equal(force.run('game.daoEssence'),1050);
    assert.equal(luck.run('game.daoEssence'),1050);
    assert.equal(spirit.run('game.artifactDust'),1020);
    assert.equal(force.run('game.artifactDust'),1030);
    assert.equal(luck.run('game.artifacts[0].tier'),'epic');
    assert.equal(spirit.run('game.artifacts[0].tier'),'rare');
    assert.equal(force.run('game.artifacts[0].tier'),'rare');
});

test('Разрушение рун оставляет пыль, но снижает шанс изучения до 50%', () => {
    const ctx = start('ancient_tomb');
    const value = JSON.parse(ctx.run(`JSON.stringify(ADVENTURES.find(a=>a.id==='ancient_tomb').steps[3].choices[2].success.rewards({force_pass:true,guardian_defeated:true}))`));
    assert.equal(value.techniqueChance,.5);
    assert.deepEqual(value.dust,{min:30,max:60});
    const failed = JSON.parse(ctx.run(`JSON.stringify(ADVENTURES.find(a=>a.id==='ancient_tomb').steps[3].choices[1].success.rewards({force_fail:true}))`));
    assert.equal(failed.techniqueChance,.5);
    assert.deepEqual(failed.dust,{min:10,max:20});
});

test('Провал удачи действительно повреждает тайник, даже когда страж побеждён', () => {
    const ctx = start('ancient_tomb','game.luck=1;');
    ctx.run('game.chooseAdventureOption(0,0);game.chooseAdventureOption(0,2);game.chooseAdventureOption(0,0);Math.random=()=>.75;game.chooseAdventureOption(0,0);');
    assert.equal(ctx.run('game.artifacts.length'),0);
    assert.equal(ctx.run("game.completedAdventures.includes('ancient_tomb')"),true);
});

test('Флаги Зала старого v14 JSON сохраняют смысл до финального выбора', () => {
    let ctx = start('ancient_tomb');
    ctx.run('game.chooseAdventureOption(0,0);game.chooseAdventureOption(0,1);game.chooseAdventureOption(0,0);saveGame();');
    const saved = ctx.saved(); saved.saveVersion=14;
    ctx = createContext(saved);ctx.run('applyLoadedState(loadGame());Math.random=()=>0;game.chooseAdventureOption(0,2);');
    assert.equal(ctx.run('game.artifactDust'),1030);
    assert.equal(ctx.run('game.artifacts[0].tier'),'rare');
});

test('Поздние пороги фиксированы сюжетом, ранние сохраняют свои значения', () => {
    const ctx = createContext();
    ctx.run("var late=ADVENTURES.find(a=>a.id==='demon_lair');var choice=late.steps[1].choices[0];");
    const first = ctx.run('game.getAdventureCheck(late,choice).spirit');
    assert.equal(first,133);
    ctx.run('game.realmIndex=14;game.spirit=10000;');
    assert.equal(ctx.run('game.getAdventureCheck(late,choice).spirit'),first);
    assert.equal(ctx.run("game.getAdventureCheck(ADVENTURES.find(a=>a.id==='lost_caravan'),ADVENTURES.find(a=>a.id==='lost_caravan').steps[1].choices[0]).strength"),8);
    assert.equal(ctx.run('choice.check.spirit'),38,'Превью не переписывает исходные данные');
});

test('Поздние специализации дают разные доступные способы, а не всеобщий провал', () => {
    const spirit = start('demon_lair','game.spirit=140;game.strength=70;');
    const fighter = start('demon_lair','game.spirit=110;game.strength=110;');
    spirit.run('game.chooseAdventureOption(0,0);game.chooseAdventureOption(0,0);');
    fighter.run('game.chooseAdventureOption(0,1);game.chooseAdventureOption(0,1);');
    assert.equal(spirit.run('game.activeAdventures[0].flags.purified'),true);
    assert.equal(spirit.run('game.hasTechnique("blood_moon_sutra")'),false);
    assert.equal(fighter.run('game.activeAdventures[0].flags.absorbed'),true);
    assert.equal(fighter.run('game.hasTechnique("blood_moon_sutra")'),true);
    assert.equal(fighter.run('game.strength'),114);
});

test('Сейв игрока больше не проходит все поздние проверки, ранние остаются простыми', () => {
    const ctx = createContext();
    const saved = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT,'test-fixtures','player-report-v14.json'),'utf8'));
    ctx.run(`applyLoadedState(${JSON.stringify(saved)});`);
    const summary = JSON.parse(ctx.run(`JSON.stringify((()=>{
        let passed=0,failed=0;
        const stats={strength:game.strength+game.getArtifactBonus('strength'),spirit:game.spirit+game.getArtifactBonus('spirit'),luck:game.luck+game.getArtifactBonus('luck'),combatPower:game.getCombatPower()};
        for(const adv of ADVENTURES.filter(a=>a.challengeRealm===7 && a.condition(game))) for(const step of adv.steps) for(const choice of step.choices){
            const check=game.getAdventureCheck(adv,choice,{});if(!check)continue;
            for(const [key,value] of Object.entries(check))if(key in stats){if(stats[key]>=value)passed++;else failed++;}
        }
        return{passed,failed};})())`));
    assert.ok(summary.passed>0);
    assert.ok(summary.failed>0);
});

test('Любое из двух семян даёт ровно один бонус 30%, включая естественную смерть', () => {
    const ctx = start('ancient_tomb');
    for (const natural of [false,true]) {
        ctx.run('game.flags={};');
        const baseline=ctx.run(`game.calculateKarma(${natural})`);
        const expected=Math.floor(baseline*1.30);
        ctx.run('game.flags.ancient_tree_seed=true;');
        assert.equal(ctx.run(`game.calculateKarma(${natural})`),expected);
        ctx.run('game.flags={dao_tree_seed:true};');
        assert.equal(ctx.run(`game.calculateKarma(${natural})`),expected);
        ctx.run('game.flags.ancient_tree_seed=true;');
        assert.equal(ctx.run(`game.calculateKarma(${natural})`),expected);
    }
    ctx.run('game.realmIndex=2;');
    assert.equal(ctx.run('game.calculateKarma(true)'),0);
});

test('Старые семена переживают JSON; pendingRebirth начисляет один раз и новая жизнь сбрасывает бонус', () => {
    let ctx = start('ancient_tomb','game.flags.dao_tree_seed=true;');
    const expected=ctx.run('game.calculateKarma(false)');
    ctx.run('saveGame();');
    const saved=ctx.saved();saved.saveVersion=14;
    ctx=createContext(saved);ctx.run('applyLoadedState(loadGame());game.beginRebirth(false);saveGame();');
    assert.equal(ctx.run('game.pendingRebirth.karmaEarned'),expected);
    const balance=ctx.run('game.prestige.karma');
    ctx=createContext(ctx.saved());ctx.run('applyLoadedState(loadGame());game.beginRebirth(false);');
    assert.equal(ctx.run('game.prestige.karma'),balance);
    ctx.run('game.rebirth("peasant",false);');
    assert.equal(ctx.run('!!game.flags.dao_tree_seed || !!game.flags.ancient_tree_seed'),false);
});

test('Оплаченный финал семени из старого сейва узнаёт прежний текст и не теряет эффект', () => {
    let ctx=start('ascend_spirit_forest');
    ctx.run(`game.chooseAdventureOption(0,0);game.chooseAdventureOption(0,1);
        game.activeAdventures[0].completedSteps[1].choiceText='Попросить у Древа семя. На будущее';
        delete game.activeAdventures[0].completedSteps[1].choiceIdx;
        delete game.activeAdventures[0]._pendingOutcome;saveGame();`);
    const saved=ctx.saved();saved.saveVersion=14;
    ctx=createContext(saved);ctx.run('applyLoadedState(loadGame());');finishDelay(ctx);
    assert.equal(ctx.run('game.flags.ancient_tree_seed'),true);
    assert.equal(ctx.run('game.ascendedLocations.spirit_forest'),1);
    ctx.run('game.tickAdventures();');
    assert.equal(ctx.run('game.prestige.totalAdventures'),1);
});
