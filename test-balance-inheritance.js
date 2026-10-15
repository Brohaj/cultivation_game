// Регрессии: тайники не копируют уже перенесённые материалы прошлой жизни.
const assert = require('node:assert/strict');
const test = require('node:test');
const { createContext } = require('./test-support');

function reload(ctx) {
    ctx.run('saveGame();');
    const loaded = createContext(ctx.saved());
    assert.equal(loaded.run('applyLoadedState(loadGame())'), true);
    return loaded;
}

function collectInheritance(ctx) {
    return JSON.parse(ctx.run(`JSON.stringify((() => {
        const collected=[];
        for (const id of ['rebirth_old_stash','rebirth_master','rebirth_forgotten']) {
            const event=EVENTS.find(e => e.id===id);
            if (event.condition(game)) { game.executeEvent(event); collected.push(id); }
        }
        return collected;
    })())`));
}

for (const level of [2, 3]) {
    test(`Алхимик ${level}: четыре перерождения и JSON reload не размножают полный перенос`, () => {
        let ctx=createContext();
        ctx.run(`game.prestige.totalRebirths=${2+level};game.prestige.qualifiedRebirths=${2+level};game.prestige.bodyLives.alchemist_heir=${level};game.prestige.lastBody='alchemist_heir';
            game.prestige.permanentMilestones=['ten_breakthroughs'];
            game.prestige.bodyAscensions.alchemist_heir=${level};
            game.daoEssence=10003; game.artifactDust=10001; Math.random=()=>0;`);
        for (let life=0; life<4; life++) {
            ctx.run('game.realmIndex=9; game.stones=0; game.pills=0; game.beginRebirth(false);');
            assert.equal(ctx.run('game.prestige.lastLifeResources.essence'), 10003,
                'Модалка сохраняет полную сумму до переноса');
            ctx=reload(ctx);
            ctx.run(`Math.random=()=>0; game.rebirth('alchemist_heir',false);`);
            assert.equal(ctx.run('game.prestige.lastLifeResources.essence'), 0);
            assert.equal(ctx.run('game.prestige.lastLifeResources.dust'), 0);
            ctx=reload(ctx);
            ctx.run('game.realmIndex=9; Math.random=()=>0;');
            const startingStones=ctx.run('game.stones');
            assert.ok(collectInheritance(ctx).includes('rebirth_old_stash'));
            assert.equal(ctx.run('game.daoEssence'), 10003);
            assert.equal(ctx.run('game.artifactDust'), 10001);
            assert.equal(ctx.run('game.stones'), startingStones, 'Пустой тайник не создаёт камень');
            ctx=reload(ctx);
            assert.deepEqual(collectInheritance(ctx), [], 'Флаг тайника переживает загрузку');
        }
    });
}

test('Тайники Мастера и десяти жизней не копируют 100% перенесённые материалы', () => {
    let ctx=createContext();
    ctx.run(`game.prestige.totalRebirths=9; game.prestige.lastBody='alchemist_heir';
        game.prestige.qualifiedRebirths=9;game.prestige.bodyLives.alchemist_heir=2;
        game.prestige.permanentMilestones=['ten_breakthroughs'];
        game.prestige.bodyAscensions.alchemist_heir=2;
        game.daoEssence=10000; game.artifactDust=10000;`);
    for (let life=0; life<3; life++) {
        ctx.run(`game.realmIndex=9; game.stones=0; game.pills=0; Math.random=()=>0;
            game.rebirth('alchemist_heir',false);`);
        ctx=reload(ctx);
        ctx.run('game.realmIndex=9; Math.random=()=>0;');
        assert.deepEqual(collectInheritance(ctx), ['rebirth_old_stash','rebirth_master','rebirth_forgotten']);
        assert.equal(ctx.run('game.daoEssence'), 10000);
        assert.equal(ctx.run('game.artifactDust'), 10000);
        ctx=reload(ctx);
        assert.deepEqual(collectInheritance(ctx), []);
    }
});

test('Частичный перенос оставляет тайникам неперенесённый остаток', () => {
    const ctx=createContext();
    ctx.run(`game.prestige.totalRebirths=9; game.prestige.lastBody='alchemist_heir';
        game.prestige.qualifiedRebirths=9;
        game.prestige.permanentMilestones=['ten_breakthroughs'];
        game.daoEssence=10000; game.artifactDust=10000; game.realmIndex=9;
        game.stones=0; game.pills=0; Math.random=()=>0;
        game.rebirth('alchemist_heir',false); game.realmIndex=9;`);
    assert.equal(ctx.run('game.daoEssence'), 5000);
    assert.equal(ctx.run('game.artifactDust'), 5000);
    assert.equal(ctx.run('game.prestige.lastLifeResources.essence'), 5000);
    assert.equal(ctx.run('game.prestige.lastLifeResources.dust'), 5000);
    collectInheritance(ctx);
    assert.equal(ctx.run('game.daoEssence'), 7900);
    assert.equal(ctx.run('game.artifactDust'), 6000);
});

test('Без переноса тайники сохраняют прежние награды', () => {
    const ctx=createContext();
    ctx.run(`game.prestige.totalRebirths=9; game.prestige.lastBody='peasant';
        game.daoEssence=10000; game.artifactDust=10000; game.realmIndex=9;
        game.stones=0; game.pills=0; Math.random=()=>0;
        game.rebirth('peasant',false); game.realmIndex=9;`);
    assert.equal(ctx.run('game.prestige.lastLifeResources.essence'), 10000);
    assert.equal(ctx.run('game.prestige.lastLifeResources.dust'), 10000);
    collectInheritance(ctx);
    assert.equal(ctx.run('game.daoEssence'), 5800);
    assert.equal(ctx.run('game.artifactDust'), 2000);
});
