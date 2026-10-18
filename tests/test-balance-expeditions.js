// Воспроизводимые снимки наград и проверки ограничений экспедиций.
const assert = require('node:assert/strict');
const { createContext } = require('./test-support');

let passed = 0;
let failed = 0;
function test(name, fn) {
    try { fn(); passed++; console.log(`PASS ${name}`); }
    catch (error) { failed++; console.error(`FAIL ${name}\n${error.stack}`); }
}
function json(ctx, expression) { return JSON.parse(ctx.run(`JSON.stringify(${expression})`)); }

// Мощь фиксирует безопасное состояние билда; это снимки, а не симуляция всей жизни.
const fixtures = [
    { name: 'первая жизнь, смертный', r: 0, y: 16, power: 5, luck: 0, loc: 'spirit_forest',
        before: [6, 10, 6, 2, 25], after: [6, 10, 6, 2, 10] },
    { name: 'первая жизнь, реалм 3', r: 3, y: 400, power: 35, luck: 8, loc: 'spirit_forest',
        before: [35, 14, 9, 2, 25], after: [13, 14, 9, 2, 10] },
    { name: 'вторая жизнь, Купец', r: 5, y: 1100, power: 100, luck: 15, body: 'merchant_son', loc: 'forgotten_ruins',
        before: [223, 88, 69, 6, 35], after: [48, 68, 54, 5, 15] },
    { name: 'третья жизнь, Воин★1, руины★2', r: 7, y: 2200, power: 250, luck: 35,
        body: 'wandering_warrior', bodyAsc: 1, tier: 2, loc: 'forgotten_ruins',
        before: [2298, 674, 529, 45, 31], after: [484, 228, 179, 17, 13] },
    { name: 'третья жизнь, Воин★1, дворец★1', r: 7, y: 2200, power: 250, luck: 35,
        body: 'wandering_warrior', bodyAsc: 1, tier: 1, loc: 'immortal_palace',
        before: [4304, 1233, 924, 50, 180], after: [2472, 731, 548, 34, 54] },
];

function runFixture(fixture) {
    const ctx = createContext();
    ctx.run(`game.realmIndex=${fixture.r}; game.years=${fixture.y}; game.luck=${fixture.luck};
        game.stones=100000; game.daoEssence=game.artifactDust=game.pills=0;
        game.getCombatPower=()=>${fixture.power}; game._rollExpeditionRumor=()=>{}; game.checkMilestones=()=>{};
        game.prestige.lastBody=${JSON.stringify(fixture.body || null)};
        game.prestige.bodyAscensions[${JSON.stringify(fixture.body || 'peasant')}]=${fixture.bodyAsc || 0};
        game.ascendedLocations[${JSON.stringify(fixture.loc)}]=${fixture.tier || 0}; Math.random=()=>.5;`);
    assert.equal(ctx.run(`game.startExpedition(${JSON.stringify(fixture.loc)})`), true);
    assert.equal(ctx.run('game.getExpeditionFailChance()'), 0);
    const duration = ctx.run('game.getAdjustedExpeditionDuration()');
    ctx.run('game._completeExpedition();');
    return {
        rewards: [...json(ctx, '[game.stones-100000,game.daoEssence,game.artifactDust,game.pills]'), duration],
        scrolls: ctx.run('game.daoScrolls'), artifacts: ctx.run('game.artifacts.length'),
    };
}

for (const fixture of fixtures) {
    test(`Снимок наград: ${fixture.name}`, () => {
        const result = runFixture(fixture);
        assert.deepEqual(result.rewards, fixture.after);
        if (fixture.tier === 2) assert.equal(result.scrolls, 1);
        console.log(`  [камни нетто, эссенция, пыль, пилюли, годы] ${fixture.before.join('/')} -> ${result.rewards.join('/')}`);
    });
}

test('Мощь и поздний реалм не увеличивают добычу из освоенного слабого царства', () => {
    const base = { r: 7, y: 2200, power: 250, luck: 35, tier: 2, loc: 'forgotten_ruins' };
    const ordinary = runFixture(base);
    const strong = runFixture({ ...base, r: 14, power: 1000000 });
    assert.deepEqual(strong.rewards, ordinary.rewards);
});

test('Сумма эпохи, события и опасности ограничена; безопасная локация не получает бонус опасности', () => {
    const ctx = createContext();
    ctx.run(`game.realmIndex=14; game.luck=1000000000;
        game.getCurrentEra=()=>({rewardWeight:100});
        game.worldEvent={modifiers:{expeditionReward:100,stoneIncome:100}};
        game.getDangerRewardBonus=()=>3; game.ascendedLocations.forgotten_ruins=2;`);
    const ruined = json(ctx, `game.getExpeditionRewardMultipliers(LOCATIONS.find(l=>l.id==='forgotten_ruins'))`);
    assert.equal(ruined.total, 10);
    assert.equal(ruined.stoneTotal, 10);
    assert.equal(ruined.realm, 2.2);
    assert.ok(ruined.luck <= 1.5);
    const forest = json(ctx, `game.getExpeditionRewardMultipliers(LOCATIONS.find(l=>l.id==='spirit_forest'))`);
    assert.equal(forest.danger, 0);
    ctx.run('game.ascendedLocations.spirit_forest=1;');
    assert.equal(ctx.run(`game.getExpeditionRewardMultipliers(LOCATIONS.find(l=>l.id==='spirit_forest')).danger`), 3);
});

test('Мировой доход камней входит в общий предел, а бонусы наград складываются', () => {
    const ctx = createContext();
    ctx.run(`game.realmIndex=7;game.luck=0;game.stones=1000;game.daoEssence=game.artifactDust=game.pills=0;
        game.getCurrentEra=()=>({rewardWeight:2,name:'Тестовая эпоха'});
        game.worldEvent={modifiers:{expeditionReward:2,stoneIncome:3}};
        game.formations.absorptionAltar=10;game.selectedFormations=['absorptionAltar'];
        game.getCombatPower=()=>1000000;Math.random=()=>.5;
        game._rollExpeditionRumor=()=>{};game.checkMilestones=()=>{};
        game.startExpedition('forgotten_ruins');game._completeExpedition();`);
    assert.deepEqual(json(ctx, '[game.stones-1000,game.daoEssence,game.artifactDust,game.pills]'), [130, 122, 96, 12]);
});

test('Максимальные Врата и тело ускоряют дворец без схлопывания его времени до 10 лет', () => {
    const ctx = createContext();
    ctx.run(`game.formations.realmGate=20; game.selectedFormations=['realmGate'];
        game.prestige.lastBody='wandering_warrior'; game.prestige.bodyAscensions.wandering_warrior=3;`);
    assert.equal(ctx.run(`game.getExpeditionDuration(LOCATIONS.find(l=>l.id==='immortal_palace'))`), 24);
    assert.equal(ctx.run(`game.getExpeditionDuration(LOCATIONS.find(l=>l.id==='forgotten_ruins'))`), 10);
    ctx.run(`game.expedition={locationId:'immortal_palace',duration:200,startYear:0};`);
    assert.equal(ctx.run('game.getAdjustedExpeditionDuration()'), 80);
});

test('Аукцион не гарантирует второй артефакт при удаче 1; бонус удачи ограничен 50%', () => {
    const ctx = createContext();
    ctx.run(`game.realmIndex=3; game.luck=1; game.stones=1000; Math.random=()=>.05;
        game._rollExpeditionRumor=()=>{}; game.checkMilestones=()=>{};`);
    const chances = json(ctx, `game.getExpeditionArtifactReward(LOCATIONS.find(l=>l.id==='heavenly_auction'))`);
    assert.equal(chances.firstChance, 1);
    assert.ok(chances.secondChance > 0 && chances.secondChance < .01);
    ctx.run(`game.startExpedition('heavenly_auction'); game._completeExpedition();`);
    assert.equal(ctx.run('game.artifacts.length'), 1);
    ctx.run('game.luck=1000000000;');
    const capped = json(ctx, `game.getExpeditionArtifactReward(LOCATIONS.find(l=>l.id==='heavenly_auction'))`);
    assert.ok(capped.secondChance <= .5);
});

test('Дополнительная добыча Дитя Небес соблюдает максимум тира локации', () => {
    const ctx = createContext();
    ctx.run(`game.realmIndex=14; game.stones=10000; game.luck=0;
        game.prestige.lastBody='heavens_child'; game.prestige.bodyAscensions.heavens_child=3;
        game._autoExpeditionEnabled=false; game._rollArtifactTier=()=> 'divine'; Math.random=()=>0;
        game._rollExpeditionRumor=()=>{}; game.checkMilestones=()=>{};
        game.startExpedition('spirit_forest'); game._completeExpedition();`);
    assert.deepEqual(json(ctx, 'game.artifacts.map(a=>a.tier)'), ['common', 'common']);
});

test('Дао использует общий диапазон с множителем секты и не выдаётся на аукционе', () => {
    const ctx = createContext();
    ctx.run(`game.realmIndex=7;game.subLevel=2;game.sect={id:'jade_purity',rank:0,contribution:0};
        game.getDaoSpeedMultiplier=()=>1.5;game._checkDaoLevelUp=()=>{};game.daoProgress=0;
        game.stones=1000;Math.random=()=>.5;game._rollExpeditionRumor=()=>{};game.checkMilestones=()=>{};`);
    const reward = json(ctx, `game.getExpeditionDaoReward(LOCATIONS.find(l=>l.id==='spirit_forest'))`);
    assert.deepEqual(reward, { min: 78, max: 117, sectMultiplier: 2 });
    ctx.run(`game.startExpedition('spirit_forest');game._completeExpedition();`);
    assert.equal(ctx.run('game.daoProgress'), 97.5);
    ctx.run(`game.startExpedition('heavenly_auction');game._completeExpedition();`);
    assert.equal(ctx.run('game.daoProgress'), 97.5);
});

test('Карточки нового UI показывают действительный срок, ци и виды добычи без прежних диапазонов', () => {
    const ctx = createContext();
    ctx.run(`game.realmIndex=7;game.subLevel=2;game.sect={id:'jade_purity',rank:0,contribution:0};
        game.luck=0;game.getTotalLuck=()=>35;game.getDaoSpeedMultiplier=()=>1.5;game.stones=10000;
        game.ascendedLocations.spirit_forest=2;game.getFormationBonus=key=>key==='expeditionSpeed'?1.5:0;
        const cards=[];const container={..._testElement(),innerHTML:'',appendChild(el){cards.push(el);}};
        document.getElementById=id=>id==='expeditions-list'?container:null;
        document.createElement=()=>({..._testElement(),appendChild(el){cards.push(el);}});
        renderExpeditions();`);
    const forest = ctx.run(`cards.find(card=>card.dataset?.location==='spirit_forest').innerHTML`);
    assert.ok(forest.includes('10 лет'));
    assert.match(forest,/Опыт Дао/);
    assert.match(forest,/Свитки заточки/);
    const qi = ctx.run(`game.getExpeditionCultivationReward(LOCATIONS.find(l=>l.id==='spirit_forest')).qi`);
    assert.ok(forest.includes(`До ${Math.floor(qi).toLocaleString('ru-RU')} ци`));
    const auction = ctx.run(`cards.find(card=>card.dataset?.location==='heavenly_auction').innerHTML`);
    assert.match(auction,/Артефакт:/);
    assert.doesNotMatch(auction,/Опыт Дао|v2-resource-qi/);
});

test('Карточки походов показывают пороги испытаний всех царств с учётом текущего пути', () => {
    const ctx = createContext();
    ctx.run(`game.realmIndex=7;game.stones=10000;
        game.prestige.lastBody='wandering_warrior';
        game.sect={id:'crimson_flame',rank:0,contribution:0};
        game.expeditionCompletions={spirit_forest:4,beast_cave:4,forgotten_ruins:4,
            heavenly_auction:4,demon_abyss:4,immortal_palace:4};
        const cards=[];const container={..._testElement(),innerHTML:'',appendChild(el){cards.push(el);}};
        document.getElementById=id=>id==='expeditions-list'?container:null;
        document.createElement=()=>({..._testElement(),appendChild(el){cards.push(el);}});
        renderExpeditions();`);
    for (const locationId of ['spirit_forest', 'beast_cave', 'forgotten_ruins',
        'heavenly_auction', 'demon_abyss', 'immortal_palace']) {
        const required = ctx.run(`game.getLocationAscensionRequirement('${locationId}',1)`);
        const html = ctx.run(`cards.find(card=>card.dataset?.location==='${locationId}').innerHTML`);
        assert.ok(html.includes(`4/${required} успешных походов`), locationId);
    }
    assert.ok(ctx.run(`game.getLocationAscensionRequirement('spirit_forest',1)`) < 10);
    assert.equal(ctx.run(`game.getLocationAscensionRequirement('heavenly_auction',1)`), 10);
    const forest = ctx.run(`cards.find(card=>card.dataset?.location==='spirit_forest').innerHTML`);
    const secondRequirement = ctx.run(`game.getLocationAscensionRequirement('spirit_forest',2)`);
    assert.ok(secondRequirement < 20);
    assert.ok(forest.includes(`Корень Мира» (${secondRequirement})`));
    const sectRealm = ctx.run(`cards.find(card=>card.dataset?.location==='sect_secret_realm').innerHTML`);
    assert.doesNotMatch(sectRealm, /успешных походов|Вознесение завершено/);

    ctx.run(`game.ascendedLocations.spirit_forest=1;
        game.expeditionCompletions.spirit_forest=game.getLocationAscensionRequirement('spirit_forest',2);
        renderExpeditions();`);
    const higherForest = ctx.run(`cards.filter(card=>card.dataset?.location==='spirit_forest').at(-1).innerHTML`);
    assert.ok(higherForest.includes(`${secondRequirement}/${secondRequirement} успешных походов`));
    assert.match(higherForest, /Высшее испытание доступно/);
});

test('Воин и Алое Пламя сокращают число успешных походов до глубины царства', () => {
    const ctx = createContext();
    ctx.run(`game.realmIndex=7;game.stones=10000;game.daoEssence=1000;game.artifactDust=1000;`);
    assert.deepEqual(json(ctx, "[game.getLocationAscensionRequirement('beast_cave',1),game.getLocationAscensionRequirement('beast_cave',2)]"), [10,20]);
    ctx.run("game.prestige.lastBody='wandering_warrior';");
    assert.deepEqual(json(ctx, "[game.getLocationAscensionRequirement('beast_cave',1),game.getLocationAscensionRequirement('beast_cave',2)]"), [9,18]);
    ctx.run("game.prestige.lastBody='peasant';game.sect={id:'crimson_flame',rank:0,contribution:0};");
    assert.deepEqual(json(ctx, "[game.getLocationAscensionRequirement('beast_cave',1),game.getLocationAscensionRequirement('beast_cave',2)]"), [9,18]);
    ctx.run("game.prestige.lastBody='wandering_warrior';");
    assert.deepEqual(json(ctx, "[game.getLocationAscensionRequirement('beast_cave',1),game.getLocationAscensionRequirement('beast_cave',2)]"), [8,16]);
    assert.deepEqual(json(ctx, "[game.getLocationAscensionRequirement('heavenly_auction',1),game.getLocationAscensionRequirement('heavenly_auction',2)]"), [10,20]);

    ctx.run("game.expeditionCompletions.spirit_forest=7;");
    assert.equal(ctx.run("game.canAscendLocation('spirit_forest')"), false);
    ctx.run("game.expeditionCompletions.spirit_forest=8;");
    assert.equal(ctx.run("game.canAscendLocation('spirit_forest')"), true);
    assert.equal(ctx.run("game.ascendLocation('spirit_forest')"), true);
    assert.equal(ctx.run('game.expeditionCompletions.spirit_forest'), 8);

    ctx.run(`game.expeditionCompletions.beast_cave=7;game.getCombatPower=()=>10000;
        game._rollExpeditionRumor=()=>{};game.checkMilestones=()=>{};Math.random=()=>.5;
        game.startExpedition('beast_cave');game._completeExpedition();`);
    assert.equal(ctx.run('game.expeditionCompletions.beast_cave'), 8);
    assert.equal(ctx.run("game.adventureRumors.some(r=>r.id==='ascend_beast_cave')"), true);
    ctx.run("game.prestige.lastBody='peasant';game.sect={id:'jade_purity',rank:0,contribution:0};game.tickAdventures();");
    assert.equal(ctx.run("game.adventureRumors.some(r=>r.id==='ascend_beast_cave')"), true);
    assert.equal(ctx.run("game.acceptAdventure('ascend_beast_cave')"), true);
    ctx.run("game.activeAdventures=[];game.prestige.lastBody='wandering_warrior';game.sect.id='crimson_flame';");
    ctx.run(`game.ascendedLocations.beast_cave=1;game.expeditionCompletions.beast_cave=15;
        game.startExpedition('beast_cave');game._completeExpedition();`);
    assert.equal(ctx.run('game.expeditionCompletions.beast_cave'), 16);
    assert.equal(ctx.run("game.adventureRumors.some(r=>r.id==='ascend2_beast_cave')"), true);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
