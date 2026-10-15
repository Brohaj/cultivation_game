// Ци и Дао царств: стоимость возраста, снимок отправления и атомарная выдача.
const assert = require('node:assert/strict');
const { createContext } = require('./test-support');
let passed = 0;
let failed = 0;
function test(name, fn) {
    try { fn(); passed++; console.log('PASS ' + name); }
    catch (error) { failed++; console.error('FAIL ' + name + '\n' + error.stack); }
}
function json(ctx, code) { return JSON.parse(ctx.run('JSON.stringify(' + code + ')')); }
function near(actual, expected) { assert.ok(Math.abs(actual - expected) < 1e-8, actual + ' != ' + expected); }
function setup(extra = '', realDao = false) {
    const ctx = createContext();
    ctx.run(`game.realmIndex=7;game.subLevel=2;game.years=100;game.birthYear=100;
        game.sect={id:'jade_purity',rank:4,contribution:100000};
        game.stones=100000;game.qi=game.daoProgress=game.daoEssence=game.artifactDust=game.pills=0;
        game.strength=10000;game.spirit=10;game.luck=0;
        game.getMeditationQiPerSec=()=>100;game.getDaoSpeedMultiplier=()=>1.5;
        game._rollExpeditionRumor=game.checkMilestones=()=>{};
        ${realDao ? '' : 'game._checkDaoLevelUp=()=>{};'}
        Math.random=()=>.5;${extra}`);
    return ctx;
}
function reward(ctx, id = 'immortal_palace') {
    return json(ctx, 'game.getExpeditionCultivationReward(LOCATIONS.find(l=>l.id===' + JSON.stringify(id) + '))');
}
function start(ctx, id = 'immortal_palace') { assert.equal(ctx.run('game.startExpedition(' + JSON.stringify(id) + ')'), true); }
function totals(ctx) { return json(ctx, '[game.qi,game.daoProgress,game.stones,game.pills,game.daoEssence,game.artifactDust,game.artifacts.length,game.daoScrolls]'); }

test('Реальные таймеры и тики дают пять секунд медитации на год, поход блокирует этот поток', () => {
    const ctx = setup();
    ctx.run('const intervals=[];setInterval=(fn,ms)=>{intervals.push(ms);return intervals.length;};game.start();');
    assert.deepEqual(json(ctx,'intervals.slice(0,3)'), [200,5000,15000]);
    ctx.run('for(let i=0;i<25;i++)game.tick();');
    near(ctx.run('game.qi'), 500);
    start(ctx);
    ctx.run('for(let i=0;i<25;i++)game.tick();');
    near(ctx.run('game.qi'), 500);
    ctx.run('game.stop();');
});

test('Близкое царство возвращает 80% фиксированной медитации за пять секунд на год', () => {
    const ctx = setup();
    const value = reward(ctx);
    assert.equal(value.duration, 60);
    assert.equal(value.meditationQi, 30000);
    assert.equal(value.relevance, 1);
    assert.equal(value.qi, 24000);
    ctx.run("game.currentActivity='dao';");
    assert.equal(ctx.run('game.qiPerSec()'), 0);
    assert.equal(reward(ctx).qi, 24000, 'Награда не исчезает из-за выбранной активности');
});

test('Каждая ступень выше царства вдвое снижает ци, а боевая мощь её не разгоняет', () => {
    const ctx = setup();
    assert.equal(reward(ctx).qi, 24000);
    ctx.run('game.realmIndex=8;');
    assert.equal(reward(ctx).qi, 12000);
    ctx.run('game.realmIndex=9;game.strength=1000000000;');
    assert.equal(reward(ctx).qi, 6000);
});

test('Ранний доступ не стирает различие ступеней леса, пещеры и руин', () => {
    const ctx = setup('game.realmIndex=3;');
    assert.deepEqual(['spirit_forest','beast_cave','forgotten_ruins'].map(id => reward(ctx,id).grade), [1,2,3]);
    assert.deepEqual(['spirit_forest','beast_cave','forgotten_ruins'].map(id => reward(ctx,id).qi), [1000,2400,6000]);
    assert.deepEqual(json(ctx, "LOCATIONS.slice(0,3).map(l=>l.minRealm)"), [0,0,0]);
});

test('Вознесение поднимает ценность на две ступени, потолок ступени равен десяти', () => {
    const ctx = setup();
    assert.equal(reward(ctx,'forgotten_ruins').qi, 375);
    ctx.run('game.ascendedLocations.forgotten_ruins=1;');
    assert.equal(reward(ctx,'forgotten_ruins').qi, 1500);
    ctx.run('game.ascendedLocations.forgotten_ruins=2;');
    assert.equal(reward(ctx,'forgotten_ruins').qi, 6000);
    ctx.run('game.realmIndex=11;game.ascendedLocations.immortal_palace=2;');
    assert.equal(reward(ctx).grade, 10);
    assert.equal(reward(ctx).relevance, .5);
});

test('Награда ограничена одной полоской на момент отправления', () => {
    const ctx = setup('game.getMeditationQiPerSec=()=>1000000000;');
    assert.equal(reward(ctx).qi, ctx.run('game.qiNeeded()'));
    ctx.run('game.realmIndex=0;');
    assert.equal(reward(ctx,'spirit_forest').qi, 176);
});

test('Множители добычи эпохи, удачи и опасности не умножают ци повторно', () => {
    const ctx = setup();
    const qi = reward(ctx).qi;
    ctx.run(`game.luck=1000000000;game.getDangerRewardBonus=()=>3;
        game.getCurrentEra=()=>({rewardWeight:100,name:'Тест'});
        game.worldEvent={name:'Тест',modifiers:{expeditionReward:100,stoneIncome:100}};`);
    assert.equal(reward(ctx).qi, qi);
});

test('Дао различает длительность и знакомую секту, слабое царство не растёт от позднего реалма', () => {
    const ctx = setup();
    near(reward(ctx).daoMin, 666);
    near(reward(ctx).daoMax, 999);
    near(reward(ctx,'sect_secret_realm').daoMin, 666);
    const weak = reward(ctx,'forgotten_ruins');
    near(weak.daoMin, 94.5);
    ctx.run('game.realmIndex=12;');
    near(reward(ctx,'forgotten_ruins').daoMin, weak.daoMin);
});

test('Заполненный потолок Дао не начисляет и не логирует неусвоенную награду', () => {
    const ctx = setup(`game.subLevel=1;game.daoLevel=21;game.daoProgress=game.daoNeeded()-1;
        const captured=[];addLog=(message,type)=>captured.push({message,type});`, true);
    assert.equal(ctx.run('game.getDaoLevelCap()'), 21);
    assert.equal(ctx.run('game.getDaoProgressRoom()'), 0);
    const progress = ctx.run('game.daoProgress');
    start(ctx);
    assert.ok(reward(ctx).daoMin > 0, 'У похода была номинальная награда');
    ctx.run('game._completeExpedition();');
    assert.equal(ctx.run('game.daoLevel'), 21);
    assert.equal(ctx.run('game.daoProgress'), progress);
    const rewards = json(ctx,'game.lastExpeditionReward.rewards');
    assert.ok(rewards.includes('Дао: достигнут предел текущей ступени'));
    assert.ok(!rewards.some(text=>/\+\d+ постижение Дао/.test(text)));
    assert.equal(ctx.run("captured.some(entry=>entry.type==='reward'&&entry.message.includes('Дао: достигнут предел текущей ступени'))"), true);
});

test('Переход через последний уровень усваивает только остаток вместимости и логирует фактическую сумму', () => {
    const ctx = setup(`game.subLevel=1;game.daoLevel=20;game.daoProgress=1890;
        game.getDaoSpeedMultiplier=()=>10;
        const captured=[];addLog=(message,type)=>captured.push({message,type});`, true);
    assert.equal(ctx.run('game.daoNeeded(20)'), 1900);
    assert.equal(ctx.run('game.daoNeeded(21)'), 2150);
    assert.equal(ctx.run('game.getDaoProgressRoom()'), 2159); // 10 до перехода + 2149 последней полоски.
    start(ctx);
    assert.equal(reward(ctx).daoMin, 4260);
    assert.equal(reward(ctx).daoMax, 6390);
    ctx.run('game._completeExpedition();');
    assert.equal(ctx.run('game.daoLevel'), 21);
    assert.equal(ctx.run('game.daoProgress'), 2149);
    assert.equal(ctx.run('game.getDaoProgressRoom()'), 0);
    const absorbed = ctx.run('game.daoNeeded(20)-1890+game.daoProgress');
    assert.equal(absorbed, 2159);
    assert.ok(json(ctx,'game.lastExpeditionReward.rewards').includes('+2159 постижение Дао'));
    assert.equal(ctx.run("captured.some(entry=>entry.type==='reward'&&entry.message.includes('+2159 постижение Дао'))"), true);
    assert.equal(ctx.run("captured.some(entry=>entry.type==='reward'&&entry.message.includes('+5325 постижение Дао'))"), false);
});

test('Предпросмотр и выдача используют один снимок после смены статов, эпохи и длительности', () => {
    const ctx = setup();
    const before = reward(ctx);
    start(ctx);
    assert.deepEqual(reward(ctx), before);
    ctx.run(`game.realmIndex=12;game.years=30000;game.birthYear=30000;
        game.getMeditationQiPerSec=()=>1000000;game.getDaoSpeedMultiplier=()=>1000;
        game.getFormationBonus=key=>key==='expeditionSpeed'?100:0;
        game.worldEvent={name:'Позднее событие',modifiers:{expeditionReward:100}};`);
    assert.equal(ctx.run('game.getAdjustedExpeditionDuration()'), 60);
    assert.deepEqual(reward(ctx), before);
    ctx.run('game._completeExpedition();');
    assert.equal(ctx.run('game.qi'), 24000);
    near(ctx.run('game.daoProgress'), 832.5);
});

test('Ускорение после отправления не сокращает оплаченный поход; следующий поход учитывает новые Врата', () => {
    const ctx = setup();
    start(ctx);
    const before = reward(ctx);
    ctx.run("game.formations.realmGate=20;game.selectedFormations=['realmGate'];game.years=110;game.tickExpedition();");
    assert.notEqual(ctx.run('game.expedition'), null, 'Первые десять лет не завершают исходный шестидесятилетний поход');
    assert.equal(ctx.run('game.getAdjustedExpeditionDuration()'), 60);
    assert.deepEqual(reward(ctx), before);
    ctx.run('game.years=160;game.tickExpedition();');
    assert.equal(ctx.run('game.expedition'), null);
    assert.equal(ctx.run('game.qi'), 24000);
    start(ctx);
    assert.equal(ctx.run('game.getAdjustedExpeditionDuration()'), 27);
    assert.equal(reward(ctx).duration, 27);
    assert.equal(reward(ctx).qi, 10800);
});

test('Снимок ци и Дао сохраняется при JSON-загрузке, повторная миграция его не пересчитывает', () => {
    const ctx = setup();
    start(ctx);
    const before = reward(ctx);
    ctx.run('saveGame();');
    const loaded = createContext(ctx.saved());
    loaded.run(`applyLoadedState(loadGame());game.spirit=1000000;game.years=150000;
        game.getFormationBonus=key=>key==='expeditionSpeed'?100:0;
        game.ensureExpeditionRewardSnapshot();`);
    assert.deepEqual(reward(loaded), before);
    loaded.run('game._checkDaoLevelUp=game._rollExpeditionRumor=game.checkMilestones=()=>{};Math.random=()=>.5;game._completeExpedition();');
    assert.equal(loaded.run('game.qi'), 24000);
    near(loaded.run('game.daoProgress'), 832.5);
});

test('Старый поход без нового снимка получает конечные значения ровно один раз', () => {
    const ctx = setup();
    start(ctx);
    ctx.run('delete game.expedition.cultivationReward;saveGame();');
    const loaded = createContext(ctx.saved());
    loaded.run('applyLoadedState(loadGame());');
    const migrated = reward(loaded);
    assert.ok(Number.isFinite(migrated.qi));
    assert.ok(Number.isFinite(migrated.daoMax));
    loaded.run('game.spirit=1000000;game.ensureExpeditionRewardSnapshot();');
    assert.deepEqual(reward(loaded), migrated);
});

test('На аукционе и вершине пути ци не выдаётся; аукцион также не даёт Дао', () => {
    const ctx = setup();
    assert.equal(reward(ctx,'heavenly_auction').qi, 0);
    assert.equal(reward(ctx,'heavenly_auction').daoMin, 0);
    start(ctx,'heavenly_auction');
    ctx.run('game._completeExpedition();');
    assert.equal(ctx.run('game.qi'), 0);
    assert.equal(ctx.run('game.daoProgress'), 0);
    ctx.run('game.realmIndex=14;');
    const top = reward(ctx);
    assert.equal(top.qi, 0);
    assert.ok(Number.isFinite(top.meditationQi));
    start(ctx);
    ctx.run('game._completeExpedition();saveGame();');
    assert.equal(ctx.run('game.qi'), 0);
    assert.equal(ctx.saved().qi, 0);
});

test('Провал не выдаёт ни ци, ни Дао, повторное завершение отменённого похода тоже', () => {
    const ctx = setup();
    start(ctx,'demon_abyss');
    const before = totals(ctx);
    ctx.run('game.strength=0;Math.random=()=>0;game.years++;game.tickExpedition();');
    assert.equal(ctx.run('game.expedition'), null);
    assert.deepEqual(totals(ctx), before);
    ctx.run('game._completeExpedition();');
    assert.deepEqual(totals(ctx), before);
});

test('Ци при успешном возвращении не переполняет нынешнюю полоску', () => {
    const ctx = setup('game.qi=game.qiNeeded()-50;');
    start(ctx);
    ctx.run('game._completeExpedition();');
    assert.equal(ctx.run('game.qi'), ctx.run('game.qiNeeded()'));
    const smaller = setup();
    start(smaller);
    smaller.run('game.realmIndex=0;game.subLevel=1;game._completeExpedition();');
    assert.equal(smaller.run('game.qi'), 110);
});

test('Уход в другую секту не переносит постижение старого Пути, ци сохраняется', () => {
    const ctx = setup();
    start(ctx);
    ctx.run("game.leaveSect();game.joinSect('crimson_flame');");
    assert.equal(ctx.run("game.getExpeditionDaoReward(LOCATIONS.find(l=>l.id==='immortal_palace')).max"), 0);
    ctx.run('game._completeExpedition();');
    assert.equal(ctx.run('game.daoProgress'), 0);
    assert.equal(ctx.run('game.qi'), 24000);
});

test('Успешные награды начисляются единожды, сохранённое завершение не повторяется после загрузки', () => {
    const ctx = setup();
    start(ctx);
    ctx.run('game._completeExpedition();');
    const after = totals(ctx);
    ctx.run('game._completeExpedition();saveGame();');
    assert.deepEqual(totals(ctx), after);
    const loaded = createContext(ctx.saved());
    loaded.run('applyLoadedState(loadGame());');
    const loadedBefore = totals(loaded);
    loaded.run('game._completeExpedition();');
    assert.deepEqual(totals(loaded), loadedBefore);
    assert.equal(loaded.run('game.expedition'), null);
    assert.equal(loaded.run('game.qi'), after[0]);
    assert.deepEqual(totals(loaded).slice(2), after.slice(2));
});

test('Дворец гарантирует редкую реликвию с потолком epic, царство секты выдаёт rare', () => {
    for (const [location, rolled, expected] of [
        ['immortal_palace','common','rare'],
        ['immortal_palace','divine','epic'],
        ['sect_secret_realm','common','rare'],
        ['sect_secret_realm','divine','rare'],
    ]) {
        const ctx = setup('game._rollArtifactTier=()=>'+JSON.stringify(rolled)+';');
        if (location === 'sect_secret_realm') ctx.run('Math.random=()=>0;');
        start(ctx,location);
        ctx.run('game._completeExpedition();');
        assert.deepEqual(json(ctx,'game.artifacts.map(a=>a.tier)'), [expected]);
    }
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exitCode = failed ? 1 : 0;
