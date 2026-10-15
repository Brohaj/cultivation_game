// Покупки тратят карму, а не создают её для престижа и Небесного Барьера.
const assert = require('node:assert/strict');
const test = require('node:test');
const { createContext } = require('./test-support');

function total(ctx) {
    return ctx.run('game.prestige.karma + game._getTotalKarmaSpent()');
}

test('Скидка эпохи не открывает барьер на фиктивных 150 кармы', () => {
    const ctx = createContext();
    ctx.run('game.years=150000;game.realmIndex=10;game.prestige.totalRebirths=2;game.prestige.qualifiedRebirths=2;game.prestige.karma=149;');
    assert.equal(ctx.run('game.meetsRealmRequirement(11)'), false);
    const qiMultiplier = ctx.run('game.getKarmaQiMultiplier()');
    assert.equal(ctx.run('game.getUpgradeCost("wealth")'), 4);
    assert.equal(ctx.run('game.buyKarmaUpgrade("wealth")'), true);
    assert.equal(ctx.run('game.prestige.karma'), 145);
    assert.equal(ctx.run('game._getTotalKarmaSpent()'), 4);
    assert.equal(total(ctx), 149);
    assert.equal(ctx.run('game.meetsRealmRequirement(11)'), false);
    assert.equal(ctx.run('game.getKarmaQiMultiplier()'), qiMultiplier);
});

test('Скидка Архата при вознесении тела сохраняет накопленную карму', () => {
    const ctx = createContext();
    ctx.run(`game.realmIndex=10;game.prestige.totalRebirths=9;
        game.prestige.qualifiedRebirths=9;game.prestige.bodyLives.alchemist_heir=1;game.prestige.bodyLives.golden_arhat=1;
        game.prestige.lastBody='golden_arhat';game.prestige.bodyAscensions.golden_arhat=1;
        game.prestige.permanentMilestones=['ten_breakthroughs'];
        game.prestige.karma=799;game.prestige.karmaSpent=200;`);
    assert.equal(ctx.run('game.getBodyAscendCost("alchemist_heir")'), 32);
    assert.equal(ctx.run('game.ascendBody("alchemist_heir")'), true);
    assert.equal(ctx.run('game._getTotalKarmaSpent()'), 232);
    assert.equal(total(ctx), 999);
    assert.equal(ctx.run('game.meetsRealmRequirement(13)'), false);
});

test('Последовательные покупки учитывают оплаченные цены каждого уровня', () => {
    const ctx = createContext();
    ctx.run('game.years=150000;game.prestige.karma=500;');
    assert.equal(ctx.run('game.buyKarmaUpgrade("memory")'), true);
    assert.equal(ctx.run('game.buyKarmaUpgrade("memory")'), true);
    assert.equal(ctx.run('game.prestige.karmaSpent'), 31); // 12 + 19
    assert.equal(total(ctx), 500);
    ctx.run('saveGame();');
    const loaded = createContext(ctx.saved());
    assert.equal(loaded.run('applyLoadedState(loadGame())'), true);
    assert.equal(total(loaded), 500);
    assert.equal(loaded.run('game.buyKarmaUpgrade("memory")'), true);
    assert.equal(loaded.run('game.prestige.karmaSpent'), 55); // ещё 24
    assert.equal(total(loaded), 500);
});

test('Карма завершённой жизни начисляется однократно после покупки и загрузки', () => {
    const ctx = createContext();
    ctx.run('game.realmIndex=7;game.years=150000;game.birthYear=149000;game.prestige.karma=100;game.beginRebirth(false);');
    const earned = total(ctx);
    ctx.run('game.buyKarmaUpgrade("wealth");saveGame();');
    const loaded = createContext(ctx.saved());
    loaded.run('applyLoadedState(loadGame());game.beginRebirth(true);');
    assert.equal(total(loaded), earned);
    assert.equal(loaded.run('game.rebirth("peasant",false)'), true);
    assert.equal(total(loaded), earned);
});

test('Закрытое и неизвестное происхождение не меняют жизнь, карму или покупки', () => {
    const ctx = createContext();
    ctx.run('game.realmIndex=3;game.prestige.karma=1000;');
    const before = ctx.run('JSON.stringify(getSaveableState())');
    for (const id of ['golden_arhat', 'alchemist_heir', 'missing_body']) {
        assert.equal(ctx.run(`game.isBodyUnlocked('${id}')`), false);
        assert.equal(ctx.run(`game.canAscendBody('${id}')`), false);
        assert.equal(ctx.run(`game.ascendBody('${id}')`), false);
        assert.equal(ctx.run(`game.rebirth('${id}',true)`), false);
        assert.equal(ctx.run('JSON.stringify(getSaveableState())'), before);
    }
});

test('Устаревший выбор закрытого тела оставляет модалку и начисленную карму', () => {
    const ctx = createContext();
    ctx.run('game.realmIndex=3;game.beginRebirth(false);selectedRebirthBody="golden_arhat";');
    const before = ctx.run('JSON.stringify(getSaveableState())');
    ctx.run('performRebirth();');
    assert.equal(ctx.run('JSON.stringify(getSaveableState())'), before);
    assert.ok(ctx.run('game.pendingRebirth'));
    ctx.run('selectBody("missing_body");');
    assert.equal(ctx.run('selectedRebirthBody'), 'golden_arhat');
});

test('Расходы сохраняются с престижем, новая игра начинает с нуля', () => {
    const ctx = createContext();
    ctx.run('game.prestige.karma=100;game.buyKarmaUpgrade("wealth");game.reset(true);');
    assert.equal(total(ctx), 100);
    assert.equal(ctx.run('game.prestige.karmaSpent'), 5);
    ctx.run('game.reset();');
    assert.equal(total(ctx), 0);
    assert.equal(ctx.run('game.prestige.karmaSpent'), 0);
});
