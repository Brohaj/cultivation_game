// Регрессии: заточка и разбор не должны производить вложенные материалы.
const assert = require('node:assert/strict');
const test = require('node:test');
const { createContext } = require('./test-support');

function alchemistContext(level) {
    const ctx = createContext();
    ctx.run(`game.prestige.lastBody='alchemist_heir';
        game.prestige.bodyAscensions.alchemist_heir=${level};
        game.sect={id:'moon_lake',rank:0,contribution:0}; game.daoLevel=5;`);
    return ctx;
}

for (const level of [2, 3]) {
    test(`Алхимик ${level} + Лунное Озеро возвращает только 50% вложений`, () => {
        const ctx = alchemistContext(level);
        const result = JSON.parse(ctx.run(`JSON.stringify((() => {
            const artifact={tier:'common',enhance:0,transcend:0,investedDust:0,investedEssence:0};
            const base=game.getDisassembleReward(artifact);
            artifact.enhance=1; artifact.investedDust=10; artifact.investedEssence=10;
            const upgraded=game.getDisassembleReward(artifact);
            artifact.investedDust=1001; artifact.investedEssence=703;
            const manyUpgrades=game.getDisassembleReward(artifact);
            return {base,upgraded,manyUpgrades};
        })())`));
        assert.ok(result.base.dust > 2, 'Бонус базовой добычи должен сохраниться');
        assert.ok(result.base.essence > 1);
        assert.equal(result.upgraded.dust - result.base.dust, 5);
        assert.equal(result.upgraded.essence - result.base.essence, 5);
        assert.equal(result.manyUpgrades.dust - result.base.dust, 500);
        assert.equal(result.manyUpgrades.essence - result.base.essence, 351);
    });
}

test('Бонус трансценда усиливается отдельно от возврата заточки', () => {
    const ctx = alchemistContext(3);
    const result = JSON.parse(ctx.run(`JSON.stringify((() => {
        const artifact={tier:'rare',enhance:10,transcend:2,investedDust:0,investedEssence:0};
        const base=game.getDisassembleReward(artifact);
        artifact.investedDust=370; artifact.investedEssence=241;
        return {base,upgraded:game.getDisassembleReward(artifact)};
    })())`));
    assert.ok(result.base.dust > 12);
    assert.equal(result.upgraded.dust - result.base.dust, 185);
    assert.equal(result.upgraded.essence - result.base.essence, 120);
});

test('Трофей Алого Пламени сохраняется при переходе в Лунное Озеро, но новое Дао начинается с нуля', () => {
    const ctx = alchemistContext(0);
    ctx.run(`game.realmIndex=6; game.milestones.push('win_combat','ten_breakthroughs');
        game.sect={id:'crimson_flame',rank:1,contribution:150};
        game.sectMissions=[{templateId:'treasure_expedition',reward:{artifact:'rare'},cooldown:0}];
        game.completeSectMission(0);
        var trophy=game.artifacts[0];
        var crimsonReward=game.getDisassembleReward(trophy);
        game.daoLevel=5;
        game.leaveSect();
        game.joinSect('moon_lake');
        var entryReward=game.getDisassembleReward(trophy);
        game.daoLevel=5;
        var trainedReward=game.getDisassembleReward(trophy);`);
    assert.equal(ctx.run('game.artifacts[0].tier'), 'rare');
    assert.equal(ctx.run('game.artifacts[0].id === trophy.id'), true);
    assert.deepEqual(JSON.parse(ctx.run('JSON.stringify(crimsonReward)')), {dust:18,essence:12});
    assert.deepEqual(JSON.parse(ctx.run('JSON.stringify(entryReward)')), {dust:18,essence:12});
    assert.deepEqual(JSON.parse(ctx.run('JSON.stringify(trainedReward)')), {dust:20,essence:13});
});

test('Успех и провал заточки не создают материалы при последующем разборе', () => {
    const ctx = alchemistContext(3);
    ctx.run(`game.artifactDust=1000; game.daoEssence=1000;
        const artifact={id:'refund_test',name:'Проверка',slot:'weapon',tier:'common',
            effects:{strength:6},enhance:0,transcend:0,investedDust:0,investedEssence:0};
        game.artifacts=[artifact];
        const baseReward=game.getDisassembleReward(artifact);
        Math.random=()=>0;`);
    assert.equal(ctx.run(`game.enhanceArtifact('refund_test',false).success`), true);
    assert.equal(ctx.run('artifact.investedDust'), 10);
    assert.equal(ctx.run('artifact.investedEssence'), 10);
    ctx.run('Math.random=()=>.99999;');
    assert.equal(ctx.run(`game.enhanceArtifact('refund_test',false).success`), false);
    assert.equal(ctx.run('artifact.investedDust'), 10, 'Провал не добавляет возврат');
    assert.equal(ctx.run('artifact.investedEssence'), 10);
    assert.equal(ctx.run(`game.disassembleArtifact('refund_test')`), true);
    assert.equal(ctx.run('game.artifactDust - baseReward.dust'), 980);
    assert.equal(ctx.run('game.daoEssence - baseReward.essence'), 980);
    assert.equal(ctx.run('game.artifacts.length'), 0);
});

test('Даунгрейд и повторная заточка учитывают только реально оплаченные успехи', () => {
    const ctx = alchemistContext(3);
    ctx.run(`game.artifactDust=1000; game.daoEssence=1000;
        const artifact={id:'downgrade_test',name:'Проверка',slot:'weapon',tier:'common',
            effects:{strength:6},enhance:4,transcend:0,investedDust:90,investedEssence:90};
        game.artifacts=[artifact]; const beforeReward=game.getDisassembleReward(artifact);
        let rolls=[.99999,0]; Math.random=()=>rolls.shift();`);
    assert.equal(ctx.run(`game.enhanceArtifact('downgrade_test',false).downgraded`), true);
    assert.equal(ctx.run('artifact.enhance'), 3);
    assert.equal(ctx.run('artifact.investedDust'), 90);
    assert.equal(ctx.run('artifact.investedEssence'), 90);
    ctx.run('Math.random=()=>0;');
    assert.equal(ctx.run(`game.enhanceArtifact('downgrade_test',false).success`), true);
    assert.equal(ctx.run('artifact.investedDust'), 130);
    assert.equal(ctx.run('artifact.investedEssence'), 130);
    assert.equal(ctx.run('game.getDisassembleReward(artifact).dust - beforeReward.dust'), 20);
    assert.equal(ctx.run('game.getDisassembleReward(artifact).essence - beforeReward.essence'), 20);
    assert.equal(ctx.run('game.artifactDust'), 900);
    assert.equal(ctx.run('game.daoEssence'), 900);
});
