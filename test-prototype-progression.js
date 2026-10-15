// Прототип: зачётные жизни, освоение происхождений и однократное завершение.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createContext } = require('./test-support');

let passed = 0;
let failed = 0;
function test(name, fn) {
    try { fn(); passed++; console.log(`PASS ${name}`); }
    catch (error) { failed++; console.error(`FAIL ${name}\n${error.stack}`); }
}
function value(ctx, expression) {
    return JSON.parse(ctx.run(`JSON.stringify(${expression})`));
}
function reload(ctx) {
    ctx.run('saveGame();');
    const loaded = createContext(ctx.saved());
    loaded.run('applyLoadedState(loadGame());');
    return loaded;
}
function prepareAlchemy(ctx) {
    ctx.run(`game.realmIndex=5;game.subLevel=4;game.years=1000;game.birthYear=0;
        game.prestige.totalRebirths=2;game.prestige.qualifiedRebirths=2;
        game.prestige.lastBody='alchemist_heir';game.prestige.bodyLives={peasant:2};
        game.prestige.karma=2000;game.prestige.permanentMilestones=['ten_breakthroughs','win_combat'];`);
}
function progression(ctx) {
    return value(ctx, `({all:game.prestige.totalRebirths,qualified:game.getQualifiedRebirths(),
        alchemy:game.getBodyLives('alchemist_heir'),peasant:game.getBodyLives('peasant'),
        warrior:game.getBodyLives('wandering_warrior')})`);
}

test('Количество пустых перерождений не открывает корни, тела и Небесный Барьер', () => {
    const ctx = createContext();
    ctx.run(`game.prestige.totalRebirths=100;game.prestige.qualifiedRebirths=0;
        game.prestige.karma=10000;game.prestige.permanentMilestones=['realm_5','realm_9','immortal','age_10000','stones_100','ten_breakthroughs'];`);
    assert.deepEqual(value(ctx, 'game.getAvailableRoots().map(root=>root.id)'), ['common']);
    assert.equal(ctx.run("game.isBodyUnlocked('merchant_son')"), false);
    assert.equal(ctx.run('game.meetsRealmRequirement(10)'), false);
    assert.equal(ctx.run('game.meetsRealmRequirement(14)'), false);
});

test('Первая зачётная жизнь открывает первый корень и учитывается на экране завершения', () => {
    const ctx = createContext();
    ctx.run('game.realmIndex=3;game.beginRebirth(false);');
    assert.equal(ctx.run('game.getQualifiedRebirths()'), 1);
    assert.equal(ctx.run('game.getQualifiedRebirths(true)'), 1,'Заканчивающаяся жизнь не добавляется второй раз');
    assert.equal(ctx.run("game.getBodyLives('peasant')"), 1);
    assert.equal(ctx.run('game.pendingRebirth.progressionCredited'), true);
    assert.equal(ctx.run('game.pendingRebirth.qualifiedLife'), true);
    assert.equal(ctx.run("game.rebirth('peasant',false)"), true);
    assert.deepEqual(value(ctx, 'game.getAvailableRoots().map(root=>root.id)'), ['common','dual']);
    assert.equal(ctx.run('game.prestige.totalRebirths'), 1);
    assert.equal(ctx.run('game.getQualifiedRebirths()'), 1);
});

test('Пик Золотого Ядра сохраняет зачёт после отката и JSON reload', () => {
    let ctx = createContext();
    ctx.run('game.realmIndex=2;game._maxRealmThisLife=3;');
    ctx = reload(ctx);
    assert.equal(ctx.run('game.isCurrentLifeQualified()'), true);
    ctx.run('game.beginRebirth(false);');
    assert.equal(ctx.run('game.pendingRebirth.peakRealm'), 3);
    assert.equal(ctx.run('game.pendingRebirth.karmaEarned'), 0,'Карма по-прежнему зависит от текущей ступени');
    assert.equal(ctx.run('game.getQualifiedRebirths()'), 1);
    assert.equal(ctx.run("game.getBodyLives('peasant')"), 1);
});

test('Pending, повторный begin и две загрузки не дублируют зачёт и освоение', () => {
    let ctx = createContext();
    prepareAlchemy(ctx);
    ctx.run('game.beginRebirth(false);');
    const expected = progression(ctx);
    assert.deepEqual(expected, {all:2,qualified:3,alchemy:1,peasant:2,warrior:0});
    const balance = ctx.run('game.prestige.karma');
    ctx.run('game.beginRebirth(true);');
    assert.deepEqual(progression(ctx), expected);
    assert.equal(ctx.run('game.prestige.karma'), balance);
    for (let i = 0; i < 2; i++) {
        ctx = reload(ctx);
        ctx.run('game.beginRebirth(false);');
        assert.deepEqual(progression(ctx), expected);
        assert.equal(ctx.run('game.prestige.karma'), balance);
    }
    assert.equal(ctx.run("game.rebirth('wandering_warrior',false)"), true);
    assert.deepEqual(progression(ctx), {...expected,all:3});
    assert.equal(ctx.run('game.prestige.lastBody'), 'wandering_warrior');
    ctx = reload(ctx);
    assert.deepEqual(progression(ctx), {...expected,all:3});
});

test('Освоение начисляется закрывающемуся телу, а не выбранному следующему', () => {
    const ctx = createContext();
    prepareAlchemy(ctx);
    ctx.run("game.beginRebirth(false);selectBody('wandering_warrior');");
    assert.equal(ctx.run('game.pendingRebirth.bodyId'), 'wandering_warrior');
    assert.equal(ctx.run('game.pendingRebirth.closingBodyId'), 'alchemist_heir');
    assert.equal(ctx.run("game.getBodyLives('alchemist_heir')"), 1);
    assert.equal(ctx.run("game.getBodyLives('wandering_warrior')"), 0);
});

test('Обычный active API не тратит карму за ещё не заработанную звезду', () => {
    const ctx = createContext();
    prepareAlchemy(ctx);
    assert.equal(ctx.run('game.isCurrentLifeQualified()'), true);
    const before = value(ctx, '[game.prestige.karma,game.prestige.karmaSpent,game.prestige.bodyAscensions,game.pendingRebirth]');
    assert.equal(ctx.run("game.canAscendBody('alchemist_heir')"), false);
    assert.equal(ctx.run("game.ascendBody('alchemist_heir')"), false);
    assert.deepEqual(value(ctx, '[game.prestige.karma,game.prestige.karmaSpent,game.prestige.bodyAscensions,game.pendingRebirth]'), before);
    assert.equal(ctx.run('game.getQualifiedRebirths()'), 2);
    assert.equal(ctx.run("game.getBodyLives('alchemist_heir')"), 0);
    ctx.run('game.beginRebirth(false);');
    assert.equal(ctx.run("game.canAscendBody('alchemist_heir')"), true);
});

test('Три звезды Алхимика требуют три отдельные зачётные жизни этим телом', () => {
    const ctx = createContext();
    ctx.run(`game.realmIndex=5;game.years=1000;game.prestige.totalRebirths=1;game.prestige.qualifiedRebirths=1;
        game.prestige.bodyLives={peasant:1};game.prestige.karma=2000;
        game.prestige.permanentMilestones=['ten_breakthroughs'];`);
    assert.equal(ctx.run("game.rebirth('alchemist_heir',false)"), true);
    assert.equal(ctx.run("game.getBodyLives('alchemist_heir')"), 0);
    for (let lives = 1; lives <= 3; lives++) {
        ctx.run('game.realmIndex=5;game._maxRealmThisLife=5;game.years=game.birthYear+1000;game.beginRebirth(false);');
        assert.equal(ctx.run("game.getBodyLives('alchemist_heir')"), lives);
        assert.equal(ctx.run("game.getBodyAscendCost('alchemist_heir')"), [40,80,150][lives-1]);
        assert.equal(ctx.run("game.ascendBody('alchemist_heir')"), true);
        assert.equal(ctx.run("game.getBodyAscensionLevel('alchemist_heir')"), lives);
        const balance = ctx.run('game.prestige.karma');
        assert.equal(ctx.run("game.ascendBody('alchemist_heir')"), false,'Следующая звезда не покупается повторным кликом');
        assert.equal(ctx.run('game.prestige.karma'), balance);
        if (lives < 3) assert.equal(ctx.run("game.rebirth('alchemist_heir',false)"), true);
    }
    assert.equal(ctx.run('game.prestige.karmaSpent'), 270);
});

test('Закрытый выбор тела не создаёт pending и не кредитует текущую жизнь', () => {
    const ctx = createContext();
    ctx.run('game.realmIndex=5;game.prestige.qualifiedRebirths=0;');
    const before = value(ctx, '[game.prestige,game.pendingRebirth,game.realmIndex,game.years]');
    assert.equal(ctx.run("game.rebirth('ancient_reincarnation',false)"), false);
    assert.deepEqual(value(ctx, '[game.prestige,game.pendingRebirth,game.realmIndex,game.years]'), before);
});

test('Две зачётные жизни сохраняют свободный выбор тира II без прохождения тира I', () => {
    const ctx = createContext();
    ctx.run(`game.realmIndex=5;game.prestige.totalRebirths=1;game.prestige.qualifiedRebirths=1;
        game.prestige.bodyLives={peasant:1};game.prestige.permanentMilestones=['ten_breakthroughs'];`);
    assert.equal(ctx.run("game.isBodyUnlocked('alchemist_heir')"), true);
    assert.equal(ctx.run('game.getQualifiedRebirths()'), 1,'Просмотр не начисляет прогнозируемый зачёт');
    assert.equal(ctx.run("game.rebirth('alchemist_heir',false)"), true);
    assert.equal(ctx.run('game.getQualifiedRebirths()'), 2);
    assert.equal(ctx.run('game.prestige.totalRebirths'), 2);
    assert.equal(ctx.run("game.getBodyLives('merchant_son')"), 0);
    assert.equal(ctx.run("game.getBodyLives('wanderer_disciple')"), 0);
});

test('Память Пути не даёт зачёт до реального прорыва; reload и новая жизнь сохраняют правило', () => {
    let ctx = createContext();
    ctx.run('game.prestige.karmaUpgrades.pathMemory=3;');
    assert.equal(ctx.run("game.rebirth('peasant',false)"), true);
    assert.equal(ctx.run('game.realmIndex'), 3);
    assert.equal(ctx.run('game._startingRealmThisLife'), 3);
    assert.equal(ctx.run('game.getQualifiedRebirths()'), 0,'Предыдущая нулевая жизнь остаётся незачётной');
    assert.equal(ctx.run('game.totalBreakthroughs'), 0);
    ctx = reload(ctx);
    assert.equal(ctx.run('game._startingRealmThisLife'), 3);
    assert.equal(ctx.run('game.isCurrentLifeQualified()'), false);
    ctx.run('game.beginRebirth(false);');
    assert.equal(ctx.run('game.getQualifiedRebirths()'), 0);
    assert.equal(ctx.run("game.getBodyLives('peasant')"), 0);
    assert.equal(ctx.run('game.pendingRebirth.qualifiedLife'), false);
    ctx = reload(ctx);
    ctx.run('game.beginRebirth(false);');
    assert.equal(ctx.run('game.getQualifiedRebirths()'), 0);
    assert.equal(ctx.run("game.rebirth('peasant',false)"), true);
    ctx.run(`game.selectSpiritualRoot('common');game.learnStartingTechnique();
        game.sect={id:'jade_purity',rank:0,contribution:0};game.daoLevel=1;
        game.qi=game.qiNeeded();Math.random=()=>0.01;game.breakthrough();`);
    assert.equal(ctx.run('game.totalBreakthroughs'), 1);
    assert.equal(ctx.run('game.realmIndex'), 3,'Одного настоящего подуровня достаточно');
    assert.equal(ctx.run('game.subLevel'), 2);
    ctx = reload(ctx);
    assert.equal(ctx.run('game.isCurrentLifeQualified()'), true);
    ctx.run('game.beginRebirth(false);');
    assert.equal(ctx.run('game.getQualifiedRebirths()'), 1);
    assert.equal(ctx.run("game.getBodyLives('peasant')"), 1);
    assert.equal(ctx.run('game.pendingRebirth.startingRealm'), 3);
    assert.equal(ctx.run('game.pendingRebirth.breakthroughs'), 1);
    ctx = reload(ctx);
    ctx.run('game.beginRebirth(false);');
    assert.equal(ctx.run('game.getQualifiedRebirths()'), 1);
    assert.equal(ctx.run("game.rebirth('peasant',false)"), true);
    assert.equal(ctx.run('game.totalBreakthroughs'), 0);
    assert.equal(ctx.run('game._startingRealmThisLife'), 3);
    ctx.run('game.beginRebirth(false);');
    assert.equal(ctx.run('game.getQualifiedRebirths()'), 1,'Прорыв предыдущей жизни не даёт новый зачёт');
    assert.equal(ctx.run("game.getBodyLives('peasant')"), 1);
});

test('Старт Ядра от звезды тела тоже сохраняет стартовый снимок и требует прогресса', () => {
    let ctx = createContext();
    ctx.run(`game.realmIndex=10;game.years=10001;
        game.prestige.qualifiedRebirths=10;game.prestige.totalRebirths=10;
        game.prestige.permanentMilestones=['immortal','age_10000'];
        game.prestige.bodyAscensions.ancient_reincarnation=2;`);
    assert.equal(ctx.run("game.rebirth('ancient_reincarnation',false)"), true);
    assert.equal(ctx.run('game.realmIndex'), 3);
    assert.equal(ctx.run('game._startingRealmThisLife'), 3);
    const earned = ctx.run('game.getQualifiedRebirths()');
    ctx = reload(ctx);
    assert.equal(ctx.run('game.isCurrentLifeQualified()'), false);
    ctx.run('game.beginRebirth(false);');
    assert.equal(ctx.run('game.getQualifiedRebirths()'), earned);
    assert.equal(ctx.run("game.getBodyLives('ancient_reincarnation')"), 0);
});

test('Блокировка Дао и провал прорыва не квалифицируют старт Памяти Пути 4', () => {
    const ctx = createContext();
    ctx.run(`game.prestige.karmaUpgrades.pathMemory=4;game.rebirth('peasant',false);
        game.selectSpiritualRoot('common');game.learnStartingTechnique();game.qi=game.qiNeeded();`);
    assert.equal(ctx.run('game.subLevel'), 2);
    assert.equal(ctx.run('game.breakthrough().result'), 'blocked');
    assert.equal(ctx.run('game.isCurrentLifeQualified()'), false);
    ctx.run(`game.sect={id:'jade_purity',rank:0,contribution:0};game.daoLevel=2;Math.random=()=>0.999;`);
    assert.equal(ctx.run('game.breakthrough().result'), 'fail');
    assert.equal(ctx.run('game.totalBreakthroughs'), 0);
    assert.equal(ctx.run('game.isCurrentLifeQualified()'), false);
    ctx.run('game.beginRebirth(false);');
    assert.equal(ctx.run('game.getQualifiedRebirths()'), 0);
    assert.equal(ctx.run("game.getBodyLives('peasant')"), 0);
});

test('Старый pending без marker докредитуется один раз без повторной кармы', () => {
    let ctx = createContext();
    ctx.run(`game.realmIndex=2;game.prestige.karma=17;
        game.pendingRebirth={karmaEarned:17,naturalDeath:false,bodyId:'peasant',closingBodyId:'peasant',peakRealm:3};`);
    ctx = reload(ctx);
    ctx.run('game.beginRebirth(false);');
    assert.equal(ctx.run('game.prestige.karma'), 17);
    assert.equal(ctx.run('game.getQualifiedRebirths()'), 1);
    assert.equal(ctx.run('game.pendingRebirth.progressionCredited'), true);
    ctx = reload(ctx);
    ctx.run('game.beginRebirth(false);');
    assert.equal(ctx.run('game.getQualifiedRebirths()'), 1);
    assert.equal(ctx.run("game.getBodyLives('peasant')"), 1);
});

test('UI показывает зачёт и блокировку следующей звезды тем же освоением', () => {
    const ctx = createContext();
    prepareAlchemy(ctx);
    const source = fs.readFileSync(path.join(__dirname, 'ui', 'modals.js'), 'utf8');
    const start = source.indexOf('function renderRebirthContent()');
    ctx.run(source.slice(start, source.indexOf('\nfunction toggleRebirthSection', start)));
    const render = () => {
        ctx.run('renderRebirthContent();');
        return ctx.run("document.getElementById('rebirth-content').innerHTML");
    };
    const button = markup => markup.match(/<button[^>]*onclick="ascendBodyUI\('alchemist_heir'\)"[^>]*>/)?.[0];
    assert.match(button(render()), /disabled/);
    ctx.run('game.beginRebirth(false);');
    const ready = render();
    assert.match(ready, /Всего перерождений: 2/);
    assert.match(ready, /Зачётных жизней: 3/);
    assert.match(ready, /при старте на Ядре или выше нужен хотя бы один успешный прорыв/i);
    assert.doesNotMatch(button(ready), /disabled/);
    assert.equal(ctx.run("game.ascendBody('alchemist_heir')"), true);
    const locked = render();
    assert.match(button(locked), /disabled/);
    assert.match(locked, /Для ★2 нужно 2/);
});

test('Полный новый reset обнуляет зачёт и освоение, reset жизни сохраняет их', () => {
    const ctx = createContext();
    ctx.run("game.prestige.qualifiedRebirths=3;game.prestige.bodyLives={alchemist_heir:1};game._startingRealmThisLife=3;game.reset(true);");
    assert.equal(ctx.run('game._startingRealmThisLife'), 0);
    assert.equal(ctx.run('game.getQualifiedRebirths()'), 3);
    assert.equal(ctx.run("game.getBodyLives('alchemist_heir')"), 1);
    ctx.run('game.reset(false);');
    assert.equal(ctx.run('game.getQualifiedRebirths()'), 0);
    assert.equal(ctx.run("game.getBodyLives('alchemist_heir')"), 0);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
