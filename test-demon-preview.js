// Условный риск демона должен совпадать до попытки и после расхода пилюли.
const assert = require('node:assert/strict');
const test = require('node:test');
const { createContext } = require('./test-support');

function start(setup = '') {
    const ctx = createContext();
    ctx.run(`game.realmIndex=5;game.subLevel=1;game.sect={id:'jade_purity',rank:0,contribution:0};
        game.daoLevel=9;game.strength=8;game.spirit=8;game.luck=1;
        game.spiritualPills=5;${setup}`);
    return ctx;
}

function preparePills(ctx) {
    ctx.run(`for(let i=0;i<5;i++)game.useSpiritualPill();
        game.qi=game.qiNeeded();game.daoProgress=37;`);
    assert.equal(ctx.run('game.spiritualPills'), 0);
    assert.equal(ctx.run('game.flags._pillBreakthroughBonus'), 0.25);
}

function forceAttempt(ctx, rolls) {
    ctx.run(`var observedDemonChance=null,observedPillFlag=null,rngCalls=0;
        var originalDemonChance=game.getEffectiveDemonChance;
        game.getEffectiveDemonChance=function(){
            observedPillFlag=!!this.flags._pillBreakthroughBonus;
            return observedDemonChance=originalDemonChance.call(this);
        };
        var rngQueue=${JSON.stringify(rolls)};
        Math.random=()=>{rngCalls++;if(!rngQueue.length)throw new Error('Unexpected RNG call');return rngQueue.shift();};`);
    return ctx.run('game.breakthrough().result');
}

test('Пилюля повышает успех, но не скрывает условный риск демона и не расходуется от предпросмотра', () => {
    const ctx = start('game.flags._pillBreakthroughBonus=.25;');
    const withPill = ctx.run('game.getBreakthroughChance()');
    const withoutPill = ctx.run('game.getBreakthroughChance(false)');
    assert(withPill > withoutPill);
    assert(withPill > 0.7);
    const preview = ctx.run('game.getEffectiveDemonChance()');
    assert(preview > 0);
    assert.equal(ctx.run('game.flags._pillBreakthroughBonus'), 0.25);
    ctx.run('delete game.flags._pillBreakthroughBonus;');
    assert.equal(ctx.run('game.getBreakthroughChance()'), withoutPill);
    assert.equal(ctx.run('game.getEffectiveDemonChance()'), preview);
});

test('Предпросмотр без пилюли пересчитывает исходный шанс до ограничения эпохи 95% и 100%', () => {
    for (const lateEra of [false, true]) {
        const ctx = start(`game.realmIndex=3;game.daoLevel=1;game.flags._pillBreakthroughBonus=.25;
            ${lateEra ? "game.years=ERAS.find(era=>era.id==='dao_erosion').startYear;" : ''}`);
        const cap = ctx.run('game.getEraBreakthroughCap()');
        assert.equal(cap, lateEra ? 1 : 0.95);
        const withPill = ctx.run('game.getBreakthroughChance()');
        const withoutPill = ctx.run('game.getBreakthroughChance(false)');
        assert(withPill > withoutPill);
        assert(withPill <= cap);
        if (!lateEra) {
            assert.equal(withPill, cap);
            assert.notEqual(withPill - 0.25, withoutPill);
        }
        const preview = ctx.run('game.getEffectiveDemonChance()');
        ctx.run('delete game.flags._pillBreakthroughBonus;');
        assert.equal(ctx.run('game.getBreakthroughChance()'), withoutPill);
        assert.equal(ctx.run('game.getEffectiveDemonChance()'), preview);
    }
});

test('Нижняя граница успеха и верхняя граница демона сохраняются', () => {
    const ctx = start('game.realmIndex=13;game.subLevel=4;game.daoLevel=28;game.flags._pillBreakthroughBonus=.25;');
    assert.equal(ctx.run('game.getBreakthroughChance(false)'), 0.01);
    assert.equal(ctx.run('game.getBreakthroughChance()'), 0.01);
    assert.equal(ctx.run('game.getDemonChance()'), 0.8);
    ctx.run('delete game.flags._pillBreakthroughBonus;');
    assert.equal(ctx.run('game.getDemonChance()'), 0.8);
});

test('Настоящий провал и демон: предпросмотр равен проверке после расхода, списания прежние', () => {
    const ctx = start('game.flags.demonFailsafeUsed=true;');
    preparePills(ctx);
    const preview = ctx.run('game.getEffectiveDemonChance()');
    assert.equal(forceAttempt(ctx, [0.99, 0]), 'demon');
    assert.equal(ctx.run('observedDemonChance'), preview);
    assert.equal(ctx.run('observedPillFlag'), false);
    assert.equal(ctx.run('rngCalls'), 2);
    assert.equal(ctx.run('game.realmIndex'), 4);
    assert.equal(ctx.run('game.qi'), 0);
    assert.equal(ctx.run('game.daoProgress'), 0);
    assert.equal(ctx.run('game.spiritualPills'), 0);
    assert.equal(ctx.run('game.flags._pillBreakthroughBonus'), undefined);
});

test('Первая защита отражает встречу, сохраняя тот же риск и расход пилюль', () => {
    const ctx = start();
    preparePills(ctx);
    const preview = ctx.run('game.getEffectiveDemonChance()');
    assert.equal(forceAttempt(ctx, [0.99, 0]), 'fail');
    assert.equal(ctx.run('observedDemonChance'), preview);
    assert.equal(ctx.run('observedPillFlag'), false);
    assert.equal(ctx.run('game.flags.demonFailsafeUsed'), true);
    assert.equal(ctx.run('game.realmIndex'), 5);
    assert.equal(ctx.run('game.qi'), 0);
    assert.equal(ctx.run('game.daoProgress'), 0);
    assert.equal(ctx.run('game.spiritualPills'), 0);
    assert.equal(ctx.run('game.flags._pillBreakthroughBonus'), undefined);
});

test('Снижение риска от формации и происхождения действует после исключения пилюли', () => {
    const ctx = start('game.flags._pillBreakthroughBonus=.25;');
    const unprotected = ctx.run('game.getEffectiveDemonChance()');
    ctx.run("game.selectedFormations=['wardCircle'];game.formations.wardCircle=2;");
    const protectedChance = ctx.run('game.getEffectiveDemonChance()');
    assert(protectedChance > 0);
    assert(Math.abs(protectedChance - (unprotected - 0.10)) < 1e-12);
    ctx.run("game.prestige.lastBody='fortune_child';game.qi=game.qiNeeded();");
    assert.equal(ctx.run('game.getEffectiveDemonChance()'), 0);
    assert.equal(forceAttempt(ctx, [0.99]), 'fail');
    assert.equal(ctx.run('observedDemonChance'), 0);
    assert.equal(ctx.run('rngCalls'), 1);
    assert.equal(ctx.run('!!game.flags.demonFailsafeUsed'), false);
});

test('Блокировка не расходует бонус, разрешённый успех расходует его один раз', () => {
    const blocked = start('game.daoLevel=8;');
    preparePills(blocked);
    assert.equal(forceAttempt(blocked, []), 'blocked');
    assert.equal(blocked.run('game.flags._pillBreakthroughBonus'), 0.25);
    assert.equal(blocked.run('rngCalls'), 0);
    assert.equal(blocked.run('game.spiritualPills'), 0);

    const success = start();
    preparePills(success);
    assert.equal(forceAttempt(success, [0]), 'success');
    assert.equal(success.run('game.flags._pillBreakthroughBonus'), undefined);
    assert.equal(success.run('game.spiritualPills'), 0);
    assert.equal(success.run('game.subLevel'), 2);
    assert.equal(success.run('game.totalBreakthroughs'), 1);
});
