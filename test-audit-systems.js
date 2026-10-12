// Регрессии дополнительных ошибок, найденных при полном проходе систем.
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { createContext } = require('./test-support');

function contextWithArtifact() {
    const ctx = createContext();
    ctx.run(`game.artifacts=[{id:'clock',name:'Часы',slot:'treasure',tier:'epic',effects:{timeSpeed:20},
        enhance:0,transcend:0,investedDust:0,investedEssence:0}];
        game.equipArtifact('clock'); game.start();
        game.daoEssence=10000; game.artifactDust=10000; Math.random=()=>0;`);
    return ctx;
}

test('Смена ускоряющего артефакта на обычный пересчитывает действующие таймеры', () => {
    const ctx = contextWithArtifact();
    ctx.run(`game.artifacts.push({id:'plain',name:'Камень',slot:'treasure',tier:'common',effects:{spirit:1},enhance:0,transcend:0});
        game.equipArtifact('plain');`);
    assert.equal(ctx.run('game._currentSpeedMult'), ctx.run('game.getSpeedMultiplier()'));
    assert.equal(ctx.run('game._currentSpeedMult'), 1);
});

test('Заточка ускоряющего артефакта сразу меняет скорость времени', () => {
    const ctx = contextWithArtifact();
    assert.equal(ctx.run(`game.enhanceArtifact('clock',false).success`), true);
    assert.equal(ctx.run('game._currentSpeedMult'), ctx.run('game.getSpeedMultiplier()'));
    assert.ok(ctx.run('game._currentSpeedMult') > 1.2);
});

test('Слияние не может поглотить сам целевой артефакт', () => {
    const ctx = contextWithArtifact();
    ctx.run(`game.artifacts[0].enhance=10;`);
    assert.equal(ctx.run(`game.fuseArtifacts('clock','clock')`), false);
    assert.equal(ctx.run('game.artifacts.length'), 1);
    assert.equal(ctx.run('game.daoEssence'), 10000);
});

test('Генерация в одном миллисекундном такте с одинаковым RNG даёт разные ID', () => {
    const ctx = createContext();
    const ids = JSON.parse(ctx.run(`JSON.stringify((() => {
        Date.now=()=>12345; Math.random=()=>.5;
        return Array.from({length:100},()=>game.generateArtifact('common').id);
    })())`));
    assert.equal(new Set(ids).size, 100);
});

test('Вознесение техники ждёт выдачи уже оплаченного опыта прежнего тира', () => {
    const ctx = createContext();
    ctx.run(`game.realmIndex=12; game.years=30000; game.daoEssence=10000;
        game.learnTechnique('oblivion_memory'); game.techLevels.oblivion_memory=10;
        game._pendingInsightXP={oblivion_memory:23210}; game._insightTicksLeft=9;`);
    assert.equal(ctx.run(`game.getTechAscendInfo('oblivion_memory').insightPending`), true);
    assert.equal(ctx.run(`game.ascendTechnique('oblivion_memory')`), false);
    assert.equal(ctx.run('game.daoEssence'), 10000);
    ctx.run(`for(let i=0;i<9;i++) game._tickInsightXP();`);
    assert.equal(ctx.run(`game.ascendTechnique('oblivion_memory')`), true);
    assert.equal(ctx.run('game.techLevels.oblivion_memory'), 1);
    assert.equal(ctx.run('game.techXP.oblivion_memory'), 0);
    assert.equal(ctx.run('game._pendingInsightXP'), null);
});

test('Вознесение техники времени пересчитывает фактическую скорость', () => {
    const ctx = createContext();
    ctx.run(`game.realmIndex=12; game.years=30000; game.daoEssence=10000;
        game.learnTechnique('oblivion_memory'); game.techLevels.oblivion_memory=10; game.start();`);
    assert.equal(ctx.run(`game.ascendTechnique('oblivion_memory')`), true);
    assert.equal(ctx.run('game._currentSpeedMult'), ctx.run('game.getSpeedMultiplier()'));
    assert.equal(ctx.run('game._currentSpeedMult'), 1.015);
});

test('Обмен ресурсов отвергает отрицательные, дробные и нечисловые объёмы', () => {
    const ctx = createContext();
    ctx.run(`game.prestige.lastBody='merchant_son'; game.stones=100; game.artifactDust=0;`);
    for (const amount of [-1,0,.5,NaN,Infinity]) {
        assert.equal(ctx.run(`game.exchangeResources('stones','dust',${amount})`), false);
    }
    assert.equal(ctx.run('game.stones'), 100);
    assert.equal(ctx.run('game.artifactDust'), 0);
    assert.equal(ctx.run(`game.exchangeResources('stones','dust',2)`), true);
    assert.equal(ctx.run('game.stones'), 80);
    assert.equal(ctx.run('game.artifactDust'), 2);
});

test('Случайное событие не меняет жизнь во время выбора перерождения', () => {
    const ctx = createContext();
    ctx.run(`game.pendingRebirth={karmaGain:10}; game.gameOver=false;
        game._onEraChange=()=>{throw new Error('Событие после завершения жизни');};
        game.years=301; game._lastEraId='peace';
        Math.random=()=>{throw new Error('Бросок события после завершения жизни');};`);
    const before = ctx.run('JSON.stringify(getSaveableState())');
    ctx.run('game.triggerEvent();');
    assert.equal(ctx.run('JSON.stringify(getSaveableState())'), before);
});

test('Экспорт игрока v14 проходит миграцию и повторную загрузку без потери прогресса', () => {
    const original = JSON.parse(fs.readFileSync(path.join(__dirname, 'test-fixtures/player-report-v14.json'), 'utf8'));
    const ctx = createContext(original);
    ctx.run('applyLoadedState(loadGame()); saveGame();');
    const migrated = ctx.saved();
    assert.equal(migrated.version, 16);
    for (const key of ['qi','stones','pills','refinedPills','spiritualPills','heavenlyPills','artifactDust','daoEssence',
        'strength','spirit','luck','years','birthYear','realmIndex','subLevel','daoProgress','daoLevel']) {
        assert.equal(migrated[key], original[key] ?? 0, key);
    }
    for (const key of ['techniques','equippedTechniques','techLevels','artifacts','equippedArtifacts',
        'formations','selectedFormations','sect','sectMissions','ascendedLocations','expeditionCompletions']) {
        assert.deepEqual(migrated[key], original[key], key);
    }
    assert.deepEqual(migrated.prestige, { ...original.prestige, karmaSpent: 0, heavenlyStats: original.prestige.heavenlyStats ?? {} });
    const reloaded = createContext(migrated);
    reloaded.run('applyLoadedState(loadGame()); saveGame();');
    assert.deepEqual(reloaded.saved(), migrated);
});
