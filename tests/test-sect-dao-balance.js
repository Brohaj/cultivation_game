// Скорость Дао по занятиям, включая догоняние нового Пути после смены секты.
const assert = require('node:assert/strict');
const { createContext } = require('./test-support');

let passed = 0;
let failed = 0;
function test(name, fn) {
    try { fn(); passed++; console.log(`PASS ${name}`); }
    catch (error) { failed++; console.error(`FAIL ${name}\n${error.stack}`); }
}
function near(actual, expected) {
    assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
}
function practiceYear(ctx, activity) {
    ctx.run(`game.currentActivity=${JSON.stringify(activity)};game.daoProgress=0;
        for(let tick=0;tick<25;tick++)game.tick();`);
    return ctx.run('game.daoProgress');
}

test('Каждая секта даёт 3 Дао за год своих занятий; Скрытая принимает все немедитативные', () => {
    const activities = ['meditation', 'body', 'dao', 'fate'];
    const expected = {
        jade_purity:   [0, 0, 3, 0],
        crimson_flame: [0, 3, 0, 0],
        moon_lake:     [0, 0, 3, 0],
        abyss_cult:    [0, 3, 0, 3],
        hidden_hermit: [0, 3, 3, 3],
    };
    for (const [sectId, gains] of Object.entries(expected)) {
        const ctx = createContext();
        ctx.run(`game.realmIndex=7;game.subLevel=1;
            game.sect={id:${JSON.stringify(sectId)},rank:0,contribution:0};
            game.getDaoSpeedMultiplier=()=>1;`);
        activities.forEach((activity, index) => near(practiceYear(ctx, activity), gains[index]));
    }
});

test('Бонусы скорости техник и Дао одинаково усиливают подходящие занятия Скрытой и других сект', () => {
    for (const sectId of ['hidden_hermit', 'crimson_flame']) {
        const ctx = createContext();
        ctx.run(`game.realmIndex=7;game.sect={id:${JSON.stringify(sectId)},rank:0,contribution:0};
            game.getDaoSpeedMultiplier=()=>1.2;
            game.getFormationBonus=key=>key==='techXpSpeed'?0.25:0;`);
        near(practiceYear(ctx, 'body'), 3 * 1.25 * 1.2);
    }
});

test('Смена Пути по-прежнему обнуляет Дао, затем Скрытая растёт обычным темпом', () => {
    const ctx = createContext();
    ctx.run(`game.realmIndex=7;game.subLevel=1;game.prestige.totalRebirths=3;
        game.sect={id:'jade_purity',rank:0,contribution:0};
        game.daoLevel=16;game.daoProgress=77;
        game.getDaoSpeedMultiplier=()=>1;`);
    assert.equal(ctx.run('game.leaveSect()'), true);
    assert.equal(ctx.run('game.prestige.daoLevels.jade_purity'), 16);
    assert.equal(ctx.run("game.joinSect('hidden_hermit')"), true);
    assert.equal(ctx.run('game.daoLevel'), 0);
    near(practiceYear(ctx, 'fate'), 3);
});

test('Боевой путь снижает стоимость прогресса Дао, но не число уровней или ци', () => {
    const ctx = createContext();
    ctx.run(`game.realmIndex=7;game.subLevel=2;game.daoLevel=5;
        game.sect={id:'jade_purity',rank:0,contribution:0};`);
    const baseQi = ctx.run('game.qiNeeded()');
    assert.equal(ctx.run('game.daoNeeded()'), 180);
    assert.equal(ctx.run('game.getDaoProgressReduction()'), 0);

    ctx.run("game.prestige.lastBody='wandering_warrior';");
    near(ctx.run('game.getDaoProgressReduction()'), 0.10);
    assert.equal(ctx.run('game.daoNeeded()'), 162);

    ctx.run("game.prestige.lastBody='peasant';game.sect.id='crimson_flame';");
    near(ctx.run('game.getDaoProgressReduction()'), 0.10);
    assert.equal(ctx.run('game.daoNeeded()'), 162);

    ctx.run("game.prestige.lastBody='wandering_warrior';");
    near(ctx.run('game.getDaoProgressReduction()'), 0.20);
    assert.equal(ctx.run('game.daoNeeded()'), 144);
    ctx.run('game.daoLevel=18;');
    assert.equal(ctx.run('game.daoNeeded()'), 1240);
    ctx.run("game.prestige.lastBody='peasant';game.sect.id='jade_purity';");
    assert.equal(ctx.run('game.daoNeeded()'), 1550);
    ctx.run("game.prestige.lastBody='wandering_warrior';game.sect.id='crimson_flame';game.daoLevel=5;");
    ctx.run('game.getSectBonus=key=>key===\'daoCostReduction\'?0.15:0;');
    near(ctx.run('game.getDaoProgressReduction()'), 0.20);
    assert.equal(ctx.run('game.daoNeeded()'), 144);
    assert.equal(ctx.run('game.qiNeeded()'), baseQi);
    assert.equal(ctx.run('(game.realmIndex-3)*SUB_LEVELS+(game.subLevel-1)+1'), 18);
});

test('Скидка Алого растёт с текущим Дао и не меняет накопленные очки при смене пути', () => {
    const ctx = createContext();
    ctx.run(`game.realmIndex=7;game.subLevel=2;game.daoLevel=0;game.daoProgress=45;
        game.sect={id:'crimson_flame',rank:0,contribution:0};`);
    assert.equal(ctx.run('game.daoNeeded()'), 80);
    assert.equal(ctx.run('game.daoProgress'), 45);
    ctx.run('game.daoLevel=3;');
    near(ctx.run('game.getDaoProgressReduction()'), 0.06);
    assert.equal(ctx.run('game.daoNeeded()'), 132);
    // atLevel меняет базовую стоимость, а скидка привязана к реально достигнутому Дао.
    assert.equal(ctx.run('game.daoNeeded(8)'), 226);
    ctx.run("game.sect.id='moon_lake';");
    assert.equal(ctx.run('game.daoNeeded()'), 140);
    assert.equal(ctx.run('game.daoProgress'), 45);
    ctx.run("game.sect.id='crimson_flame';game.daoLevel=5;");
    assert.equal(ctx.run('game.daoNeeded(8)'), 216);
});

test('Круг Подавления Демонов останавливается на достаточных 80 процентных пунктах', () => {
    const ctx = createContext();
    ctx.run(`game.realmIndex=14;game.daoLevel=20;game.stones=100000;
        game.selectedFormations=['wardCircle'];game.formations.wardCircle=15;
        game.getBreakthroughChance=()=>0.01;`);
    assert.equal(ctx.run("game.buyFormation('wardCircle')"), true);
    assert.equal(ctx.run('game.formations.wardCircle'), 16);
    near(ctx.run("game.getFormationBonus('demonReduction')"), 0.80);
    near(ctx.run('game.getDemonChance()'), 0.80);
    near(ctx.run('game.getEffectiveDemonChance()'), 0);
    const stones = ctx.run('game.stones');
    assert.equal(ctx.run("game.buyFormation('wardCircle')"), false);
    assert.equal(ctx.run('game.formations.wardCircle'), 16);
    assert.equal(ctx.run('game.stones'), stones);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
