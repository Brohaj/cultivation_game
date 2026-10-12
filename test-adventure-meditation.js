// Временное ускорение от записей Мастера Юнь: реальные выборы, тики и JSON-сохранение.
const assert = require('node:assert/strict');
const test = require('node:test');
const { createContext } = require('./test-support');

function craneReady() {
    const ctx = createContext();
    ctx.run(`game.realmIndex=3;game.subLevel=1;game.years=100;game.birthYear=0;
        game.strength=100;game.spirit=16;game.luck=3;game.stones=500;
        game.currentActivity='meditation';game.qi=0;Math.random=()=>0;`);
    assert.equal(ctx.run("game.addAdventureRumor('crane_peak')"), true);
    assert.equal(ctx.run("game.acceptAdventure('crane_peak')"), true);
    assert.equal(ctx.run('game.chooseAdventureOption(0,0)'), true);
    assert.equal(ctx.run('game.activeAdventures[0].currentStep'), 1);
    return ctx;
}

function reading(ctx) {
    assert.equal(ctx.run('game.chooseAdventureOption(0,0)'), true);
    assert.equal(ctx.run('game.activeAdventures[0].stepDuration'), 15);
}

test('Только выбранное чтение удваивает обычную медитацию; ожидание решения бонуса не даёт', () => {
    const ctx = craneReady();
    const ordinary = ctx.run('game.qiPerSec()');
    ctx.run('game.tick();');
    assert.equal(ctx.run('game.qi'), ordinary / 5);
    assert.equal(ctx.run('game.activeAdventures[0].awaitingChoice'), true);
    reading(ctx);
    assert.equal(ctx.run('game.qiPerSec()'), ordinary * 2);
    ctx.run('game.qi=0;game.tick();');
    assert.equal(ctx.run('game.qi'), ordinary * 2 / 5);
    assert.equal(ctx.run('game.currentActivity'), 'meditation');
});

test('Добыча с алтаря и ожидание затопления другого приключения сохраняют обычную скорость', () => {
    const loot = craneReady();
    const ordinary = loot.run('game.qiPerSec()');
    assert.equal(loot.run('game.chooseAdventureOption(0,1)'), true);
    assert.equal(loot.run('game.activeAdventures[0].stepDuration'), 5);
    assert.equal(loot.run('game.qiPerSec()'), ordinary);
    const other = createContext();
    other.run("game.realmIndex=2;game.years=100;game.currentActivity='meditation';game.addAdventureRumor('root_eater');game.acceptAdventure('root_eater');");
    const normalOther = other.run('game.qiPerSec()');
    assert.equal(other.run('game.chooseAdventureOption(0,2)'), true);
    assert.equal(other.run('game.activeAdventures[0].stepDuration'), 10);
    assert.equal(other.run('game.qiPerSec()'), normalOther);
});

test('Тренировки силы, духа и удачи не начинают накапливать ци из-за чтения', () => {
    const ctx = craneReady();
    reading(ctx);
    for (const activity of ['body', 'dao', 'fate']) {
        ctx.run(`game.currentActivity='${activity}';game.qi=0;game.tick();`);
        assert.equal(ctx.run('game.qiPerSec()'), 0);
        assert.equal(ctx.run('game.qi'), 0);
    }
});

test('Начатый поход по-прежнему приостанавливает медитативную ци во время чтения', () => {
    const ctx = craneReady();
    reading(ctx);
    assert.equal(ctx.run("game.startExpedition('spirit_forest')"), true);
    assert.equal(ctx.run('game.currentActivity'), 'meditation');
    ctx.run('game.qi=0;game.tick();');
    assert.equal(ctx.run('game.qi'), 0);
});

test('JSON-сохранение восстанавливает ускорение и тот же оставшийся срок', () => {
    const ctx = craneReady();
    const ordinary = ctx.run('game.qiPerSec()');
    reading(ctx);
    ctx.run('game.years+=7;saveGame();');
    const loaded = createContext(ctx.saved());
    loaded.run('applyLoadedState(loadGame());');
    assert.equal(loaded.run('game.qiPerSec()'), ordinary * 2);
    assert.equal(loaded.run('game.activeAdventures[0].stepStartYear+game.activeAdventures[0].stepDuration-game.years'), 8);
    loaded.run('game.qi=0;game.tick();');
    assert.equal(loaded.run('game.qi'), ordinary * 2 / 5);
});

test('Старый сейв с текстом выбора, без choiceIdx и _pendingOutcome, тоже сохраняет ускорение', () => {
    const ctx = craneReady();
    const ordinary = ctx.run('game.qiPerSec()');
    reading(ctx);
    ctx.run('delete game.activeAdventures[0]._pendingOutcome;delete game.activeAdventures[0].completedSteps[1].choiceIdx;saveGame();');
    const loaded = createContext(ctx.saved());
    loaded.run('applyLoadedState(loadGame());');
    assert.equal(loaded.run('game.qiPerSec()'), ordinary * 2);
});

test('На границе 15 лет бонус исчезает до тика завершения; награды приходят один раз', () => {
    const ctx = craneReady();
    const ordinary = ctx.run('game.qiPerSec()');
    reading(ctx);
    ctx.run('game.years+=14;');
    assert.equal(ctx.run('game.qiPerSec()'), ordinary * 2);
    ctx.run('game.years++;');
    assert.equal(ctx.run('game.qiPerSec()'), ordinary);
    ctx.run('saveGame();');
    const loaded = createContext(ctx.saved());
    loaded.run('applyLoadedState(loadGame());Math.random=()=>0;');
    assert.equal(loaded.run('game.qiPerSec()'), ordinary);
    loaded.run('game.tickAdventures();');
    assert.equal(loaded.run('game.activeAdventures.length'), 0);
    assert.equal(loaded.run("game.completedAdventures.includes('crane_peak')"), true);
    assert.equal(loaded.run('game.getAdventureMeditationMultiplier()'), 1);
    const spirit = loaded.run('game.spirit');
    const essence = loaded.run('game.daoEssence');
    loaded.run('game.tickAdventures();');
    assert.equal(loaded.run('game.spirit'), spirit);
    assert.equal(loaded.run('game.daoEssence'), essence);
});

test('Отмена чтения сразу снимает бонус и не оставляет его в сохранении', () => {
    const ctx = craneReady();
    const ordinary = ctx.run('game.qiPerSec()');
    reading(ctx);
    assert.equal(ctx.run('game.abandonAdventure(0)'), true);
    assert.equal(ctx.run('game.qiPerSec()'), ordinary);
    ctx.run('saveGame();');
    const loaded = createContext(ctx.saved());
    loaded.run('applyLoadedState(loadGame());');
    assert.equal(loaded.run('game.qiPerSec()'), ordinary);
});

test('Две параллельные копии занятого этапа из сейва не превращают ×2 в ×4', () => {
    const ctx = craneReady();
    const ordinary = ctx.run('game.qiPerSec()');
    reading(ctx);
    ctx.run('game.activeAdventures.push(JSON.parse(JSON.stringify(game.activeAdventures[0])));saveGame();');
    const loaded = createContext(ctx.saved());
    loaded.run('applyLoadedState(loadGame());');
    assert.equal(loaded.run('game.qiPerSec()'), ordinary * 2);
});

test('Ускорение медитации не умножает ци от пилюль и ограниченные награды событий', () => {
    const ctx = craneReady();
    ctx.run('game.realmIndex=6;');
    const ordinary = ctx.run('game.qiPerSec()');
    const pillQi = ctx.run('game.getPillQi(1)');
    const eventQi = ctx.run('eventQiBonus(game,0.5)');
    reading(ctx);
    assert.equal(ctx.run('game.qiPerSec()'), ordinary * 2);
    assert.equal(ctx.run('game.getPillQi(1)'), pillQi);
    assert.equal(ctx.run('eventQiBonus(game,0.5)'), eventQi);
});
