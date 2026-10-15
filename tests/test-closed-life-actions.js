// Завершённая жизнь не меняет уже рассчитанную карму, перенос и тайники.
const assert = require('node:assert/strict');
const test = require('node:test');
const { createContext } = require('./test-support');

function prepare() {
    const ctx = createContext();
    ctx.run(`
        Math.random = () => 0;
        game.realmIndex = 7; game.subLevel = 1; game.years = 1000; game.birthYear = 0;
        game.strength = 50; game.spirit = 80; game.luck = 30; game.qi = 0;
        game.stones = 10000; game.daoEssence = 10000; game.artifactDust = 10000;
        game.pills = game.refinedPills = game.spiritualPills = game.heavenlyPills = 20;
        game.daoScrolls = 10;
        game.prestige.karma = 1000;
        game.prestige.totalRebirths = game.prestige.qualifiedRebirths = 4;
        game.prestige.bodyLives.alchemist_heir = 2;
        game.prestige.bodyAscensions.alchemist_heir = 2;
        game.prestige.permanentMilestones = ['realm_3','realm_5','realm_6','ten_breakthroughs','win_combat'];
        game.prestige.karmaUpgrades.artifactMemory = 1;
        game.joinSect('jade_purity');
        for (const id of ['basic_breathing','stone_meditation','iron_body']) game.learnTechnique(id);
        game.techLevels.basic_breathing = TECHNIQUES.find(t => t.id === 'basic_breathing').maxLevel;
        game.equippedTechniques = ['basic_breathing','iron_body'];
        for (const slot of ['weapon','armor','accessory','treasure','weapon']) {
            game.addArtifact(game.generateArtifact('common', slot));
        }
        game.artifacts[1].enhance = game.artifacts[2].enhance = ENHANCE_MAX;
        game.equipArtifact(game.artifacts[0].id);
    `);
    return ctx;
}

function closeLife(ctx, phase) {
    if (phase === 'pending') ctx.run('game.beginRebirth(false);');
    else ctx.run('game.years = game.birthYear + game.maxAge(); game.gameOver = true; game.stop();');
}

function snapshot(ctx) {
    return ctx.run(`JSON.stringify({save:getSaveableState(),
        catalog:TECHNIQUES.map(t => [t.id,t.tier,t.name,t.description])})`);
}

// Каждый вызов сначала проверяется на живом персонаже с достаточными
// материалами и настоящими сгенерированными предметами, а затем блокируется.
const actions = [
    ['пилюля ци', 'game.usePill()'],
    ['очищенная пилюля', 'game.useRefinedPill()'],
    ['духовная пилюля', 'game.useSpiritualPill()'],
    ['небесная пилюля', 'game.useHeavenlyPill()'],
    ['пилюли ×10', 'game.usePillMulti(1,10)'],
    ['небесные пилюли ×3', 'game.usePillMulti(4,3)'],
    ['переплавка 1→2', 'game.refinePillTier(1)'],
    ['переплавка 2→3', 'game.refinePillTier(2)'],
    ['переплавка 3→4', 'game.refinePillTier(3)'],
    ['массовая переплавка', 'game.refinePillMulti(1,2)'],
    ['озарение', 'game.buyInsight(1)'],
    ['озарения ×10', 'game.buyInsight(10)'],
    ['смена артефакта', 'game.equipArtifact(game.artifacts[4].id)'],
    ['снятие артефакта', "game.unequipArtifact('weapon')"],
    ['заточка', 'game.enhanceArtifact(game.artifacts[0].id,true)'],
    ['слияние', 'game.fuseArtifacts(game.artifacts[1].id,game.artifacts[2].id)'],
    ['разбор', 'game.disassembleArtifact(game.artifacts[3].id)'],
    ['свиток Дао', 'game.useDaoScroll()'],
    ['вознесение техники', "game.ascendTechnique('basic_breathing')"],
    ['экипировка техники', "game.equipTechnique('stone_meditation')"],
    ['снятие техники', "game.unequipTechnique('basic_breathing')"],
    ['смена занятия', "game.setActivity('body')"],
];

test('Контроль: все 22 проверяемых действия работают в открытой жизни', () => {
    for (const [name, call] of actions) {
        const ctx = prepare();
        const before = snapshot(ctx);
        ctx.run(call);
        assert.notEqual(snapshot(ctx), before, name);
    }
});

for (const phase of ['pending','dead']) {
    test(`${phase}: 22 допустимых действия не меняют ресурсы, снимок жизни или перенос`, () => {
        for (const [name, call] of actions) {
            const ctx = prepare();
            closeLife(ctx, phase);
            const before = snapshot(ctx);
            const timerCount = ctx.timers.size;
            ctx.run("Math.random = () => { throw new Error('Закрытое действие дошло до RNG'); };");
            const result = ctx.run(call);
            assert.notEqual(result, true, name);
            assert.notEqual(result?.success, true, name);
            assert.equal(snapshot(ctx), before, name);
            assert.equal(ctx.timers.size, timerCount, `${name}: не перезапускает время`);
        }
    });

    test(`${phase}: can-проверки закрыты, цены и предметы предпросмотра остаются правдивыми`, () => {
        const ctx = prepare();
        ctx.run("game.prestige.lastBody='dao_hermit';");
        const cost = ctx.run('JSON.stringify(game.getEnhanceCost(game.artifacts[0]))');
        const candidates = ctx.run('JSON.stringify(game.getFusionCandidates(game.artifacts[1].id).map(a=>a.id))');
        const ascendCost = ctx.run("game.getTechAscendInfo('basic_breathing').essence");
        assert.equal(ctx.run('game.canRefinePill(3)'), true);
        assert.equal(ctx.run('game.canBuyInsight(1)'), true);
        assert.equal(ctx.run('game.canFuseArtifact(game.artifacts[1].id)'), true);
        assert.equal(ctx.run("game.getTechAscendInfo('basic_breathing').locked"), false);
        closeLife(ctx, phase);
        const before = snapshot(ctx);
        assert.equal(ctx.run('game.canRefinePill(1)'), false);
        assert.equal(ctx.run('game.canBuyInsight(1)'), false);
        assert.equal(ctx.run('game.canFuseArtifact(game.artifacts[1].id)'), false);
        assert.equal(ctx.run("game.getTechAscendInfo('basic_breathing').closedLife"), true);
        assert.equal(ctx.run("game.getTechAscendInfo('basic_breathing').locked"), true);
        assert.equal(ctx.run("game.getTechAscendInfo('basic_breathing').essence"), ascendCost,
            'Скидка Отшельника сохраняется в предпросмотре');
        assert.equal(ctx.run('JSON.stringify(game.getEnhanceCost(game.artifacts[0]))'), cost);
        assert.equal(ctx.run('JSON.stringify(game.getFusionCandidates(game.artifacts[1].id).map(a=>a.id))'), candidates);
        assert.equal(snapshot(ctx), before, 'Предпросмотр не мутирует закрытую жизнь');
    });
}

test('После JSON reload модалки запрещённые действия не меняют сохранённую жизнь', () => {
    const source = prepare();
    closeLife(source, 'pending');
    source.run('saveGame();');
    const ctx = createContext(source.saved());
    assert.equal(ctx.run('applyLoadedState(loadGame())'), true);
    assert.ok(ctx.run('game.pendingRebirth'));
    const before = snapshot(ctx);
    const timerCount = ctx.timers.size;
    ctx.run("Math.random = () => { throw new Error('RNG после закрытия жизни'); };");
    for (const [, call] of actions) ctx.run(call);
    assert.equal(snapshot(ctx), before);
    assert.equal(ctx.timers.size, timerCount);
    ctx.run('saveGame();');
    assert.equal(JSON.stringify(ctx.saved()), ctx.run('JSON.stringify(getSaveableState())'));
});

test('Память артефактов переносит исходный предмет, а не посмертную заточку или замену', () => {
    const ctx = prepare();
    const id = ctx.run('game.artifacts[0].id');
    ctx.run('game.beginRebirth(false);');
    const karma = ctx.run('game.prestige.karma');
    const life = ctx.run('JSON.stringify(game.prestige.lastLifeResources)');
    ctx.run(`game.enhanceArtifact(game.artifacts[0].id,false);
        game.useHeavenlyPill(); game.equipArtifact(game.artifacts[4].id);
        game.unequipArtifact('weapon'); game.disassembleArtifact(game.artifacts[0].id);`);
    assert.equal(ctx.run('game.prestige.karma'), karma);
    assert.equal(ctx.run('JSON.stringify(game.prestige.lastLifeResources)'), life);
    assert.equal(ctx.run("game.rebirth('peasant',false)"), true);
    assert.equal(ctx.run('game.artifacts.length'), 1);
    assert.equal(ctx.run('game.artifacts[0].id'), id);
    assert.equal(ctx.run('game.artifacts[0].enhance'), 0);
    assert.equal(ctx.run('JSON.stringify(game.prestige.lastLifeResources)'), life);
});

test('Перенос Алхимика и остаток тайника не изменяются разбором или рефайном за модалкой', () => {
    const ctx = prepare();
    ctx.run(`game.prestige.lastBody='alchemist_heir'; game.prestige.bodyAscensions.alchemist_heir=0;
        game.daoEssence=1000; game.artifactDust=1000; game.beginRebirth(false);
        game.disassembleArtifact(game.artifacts[3].id); game.refinePillTier(1);`);
    assert.equal(ctx.run("game.rebirth('peasant',false)"), true);
    assert.equal(ctx.run('game.daoEssence'), 500);
    assert.equal(ctx.run('game.artifactDust'), 500);
    assert.equal(ctx.run('game.prestige.lastLifeResources.essence'), 500);
    assert.equal(ctx.run('game.prestige.lastLifeResources.dust'), 500);
});

test('Кармическая покупка и выбор нового тела остаются доступны в закрытой жизни', () => {
    const ctx = prepare();
    ctx.run('game.beginRebirth(false);');
    const karma = ctx.run('game.prestige.karma');
    const cost = ctx.run("game.getUpgradeCost('wealth')");
    assert.equal(ctx.run("game.buyKarmaUpgrade('wealth')"), true);
    assert.equal(ctx.run('game.prestige.karma'), karma - cost);
    assert.equal(ctx.run("game.rebirth('wanderer_disciple',false)"), true);
    assert.equal(ctx.run('game.pendingRebirth'), null);
    assert.equal(ctx.run('game.gameOver'), false);
    assert.equal(ctx.run("game.hasTechnique('body_masters_legacy')"), true,
        'Внутреннее обучение при старте новой жизни работает');
    assert.equal(ctx.run("game.hasTechnique('iron_body')"), true);
    assert.ok(ctx.run('game.stones') >= 10, 'Купленное наследие применяется');
});

test('Внутренние выдачи предметов и техник пригодны для восстановления закрытого сейва', () => {
    const ctx = prepare();
    ctx.run('game.beginRebirth(false);');
    assert.equal(ctx.run("game.addArtifact(game.generateArtifact('rare','armor'))"), true);
    assert.equal(ctx.run("game.learnTechnique('thunder_fist')"), true);
    assert.equal(ctx.run('game.addDaoScroll(1)'), 1);
});
