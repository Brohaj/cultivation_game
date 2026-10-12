// Регрессии условий отправления, загрузки и паузы медитации.
const assert = require('node:assert/strict');
const test = require('node:test');
const { createContext } = require('./test-support');

function setup(event = true) {
    const ctx = createContext();
    ctx.run(`game.realmIndex=7; game.years=600; game.birthYear=600;
        game.strength=1000; game.spirit=100; game.luck=30; game.stones=100000;
        game.daoEssence=0; game.artifactDust=0; game.pills=0;
        Math.random=()=>.5;`);
    if (event) ctx.run(`game.worldEvent={...WORLD_EVENTS.find(e=>e.id==='secret_realm'),startYear:game.years};`);
    return ctx;
}
function json(ctx, code) { return JSON.parse(ctx.run(`JSON.stringify(${code})`)); }

test('Прилив сокровищ описывает существующие царства и повышает награду походов', () => {
    const ctx = setup();
    assert.equal(ctx.run(`game.worldEvent.modifiers.expeditionReward`), 2);
    assert.match(ctx.run(`game.worldEvent.name`), /Прилив/);
    assert.match(ctx.run(`game.worldEvent.description`), /известных/);
    const before = json(ctx, `game.getExpeditionRewardMultipliers(LOCATIONS.find(l=>l.id==='demon_abyss'))`);
    ctx.run(`game.worldEvent=null;`);
    const after = json(ctx, `game.getExpeditionRewardMultipliers(LOCATIONS.find(l=>l.id==='demon_abyss'))`);
    assert.equal(before.event, 1);
    assert.equal(after.event, 0);
    assert.ok(before.resources > after.resources);
});

test('Истечение мирового события не уменьшает обещанную награду текущего похода', () => {
    const active = setup();
    const expired = setup();
    active.run(`game.startExpedition('demon_abyss');`);
    expired.run(`game.startExpedition('demon_abyss'); game.worldEvent=null; game.years+=120;`);
    assert.deepEqual(json(active, 'game.expedition.rewardMultipliers'), json(expired, 'game.expedition.rewardMultipliers'));
    for (const ctx of [active, expired]) ctx.run(`game._completeExpedition();`);
    for (const field of ['stones','daoEssence','artifactDust','pills']) {
        assert.equal(active.run(`game.${field}`), expired.run(`game.${field}`), field);
    }
});

test('Событие, начавшееся во время похода, не добавляет бонус задним числом', () => {
    const ctx = setup(false);
    ctx.run(`game.startExpedition('demon_abyss');
        game.worldEvent={...WORLD_EVENTS.find(e=>e.id==='secret_realm'),startYear:game.years};`);
    assert.equal(ctx.run(`game.getExpeditionRewardMultipliers(LOCATIONS.find(l=>l.id==='demon_abyss')).event`), 0);
    ctx.run(`game._completeExpedition(); game.startExpedition('demon_abyss');`);
    assert.equal(ctx.run('game.expedition.rewardMultipliers.event'), 1);
});

test('Предпросмотр текущего царства использует снимок, остальных — нынешние условия', () => {
    const ctx = setup();
    ctx.run(`game.startExpedition('demon_abyss'); game.worldEvent=null;`);
    assert.equal(ctx.run(`game.getExpeditionRewardMultipliers(LOCATIONS.find(l=>l.id==='demon_abyss')).event`), 1);
    assert.equal(ctx.run(`game.getExpeditionRewardMultipliers(LOCATIONS.find(l=>l.id==='spirit_forest')).event`), 0);
});

test('Снимок награды переживает JSON-загрузку и смену эпохи', () => {
    const ctx = setup();
    ctx.run(`game.startExpedition('demon_abyss'); game.worldEvent=null; game.years=30000; saveGame();`);
    const loaded = createContext(ctx.saved());
    assert.equal(loaded.run('applyLoadedState(loadGame())'), true);
    assert.deepEqual(json(loaded, 'game.expedition.rewardMultipliers'), json(ctx, 'game.expedition.rewardMultipliers'));
    assert.equal(loaded.run('game.expedition.rewardMultipliers.eraName'), 'Эпоха Конфликта');
});

test('Сейв v14 с активным старым событием получает снимок без потери имущества', () => {
    const ctx = setup();
    ctx.run(`game.startExpedition('demon_abyss'); saveGame();`);
    const old = ctx.saved();
    old.version=14; delete old.expedition.rewardMultipliers;
    old.worldEvent.name='Открытие Тайного Царства'; old.worldEvent.modifiers={rewardWeight:2};
    const loaded = createContext(old);
    loaded.run('applyLoadedState(loadGame()); saveGame();');
    assert.equal(loaded.saved().version, 16);
    assert.equal(loaded.run('game.expedition.rewardMultipliers.event'), 1);
    assert.equal(loaded.run('game.stones'), old.stones);
    assert.match(loaded.run('game.worldEvent.name'), /Прилив/);
});

test('Экспедиция приостанавливает ци и годы медитации, затем медитация возобновляется', () => {
    const ctx = setup(false);
    ctx.run(`game.qi=0; game.currentActivity='meditation'; game.startExpedition('spirit_forest'); game.tick();`);
    assert.equal(ctx.run('game.qi'), 0);
    assert.equal(ctx.run('game.totalMeditations'), 0);
    assert.ok(ctx.run('game.activityXP.spirit') > 0, 'Пассивная прокачка сохраняется');
    ctx.run(`Math.random=()=>.999; game.passYear();`);
    assert.equal(ctx.run('game.meditationYears'), 0);
    ctx.run(`game._completeExpedition(); game.tick(); game.passYear();`);
    assert.ok(ctx.run('game.qi') > 0);
    assert.equal(ctx.run('game.meditationYears'), 1);
});
