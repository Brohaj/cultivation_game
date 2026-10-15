const PROJECT_ROOT = require('node:path').resolve(__dirname, '..');
// Выбор корня и гарантии происхождения: отдельные VM, без изменения сейва игрока.
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
function rootIds(ctx) {
    return value(ctx, 'game.getAvailableRoots().map(root=>root.id)');
}
function reload(ctx) {
    ctx.run('saveGame();');
    const loaded = createContext(ctx.saved());
    loaded.run('applyLoadedState(loadGame());');
    return loaded;
}
function rootUI(ctx) {
    // test-support заглушает renderer. Возвращаем настоящий корневой рендер,
    // оставляя остальной интерфейс заглушенным для изоляции сценария.
    const source = fs.readFileSync(path.join(PROJECT_ROOT, 'ui', 'modals.js'), 'utf8');
    ctx.run(source.slice(0, source.indexOf('let _selectedElements')));
    ctx.run(`
        var rootResult={innerHTML:''};
        var rootAccept={style:{}};
        var elementChoice={style:{},innerHTML:''};
        var oldRootElement=document.getElementById;
        document.getElementById=id=>({
            'root-result':rootResult,'btn-accept-root':rootAccept,
            'element-choice-section':elementChoice
        }[id] || oldRootElement(id));
    `);
}

test('Недоступный и неизвестный корни не меняют первую жизнь', () => {
    const ctx = createContext();
    assert.deepEqual(rootIds(ctx), ['common']);
    const before = value(ctx, '[game.strength,game.spirit,game.luck,game.spiritualRoot]');
    assert.equal(ctx.run("game.selectSpiritualRoot('chaotic')"), null);
    assert.equal(ctx.run("game.selectSpiritualRoot('unknown')"), null);
    assert.deepEqual(value(ctx, '[game.strength,game.spirit,game.luck,game.spiritualRoot]'), before);
});

test('Обычные корни открываются по числу жизней и достижениям', () => {
    const ctx = createContext();
    ctx.run('game.prestige.totalRebirths=1;game.prestige.qualifiedRebirths=1;');
    assert.deepEqual(rootIds(ctx), ['common','dual']);
    ctx.run('game.prestige.totalRebirths=2;game.prestige.qualifiedRebirths=2;');
    assert.deepEqual(rootIds(ctx), ['common','dual','triple']);
    ctx.run("game.prestige.permanentMilestones=['realm_5'];");
    assert.ok(rootIds(ctx).includes('single'));
    ctx.run("game.prestige.totalRebirths=4;game.prestige.qualifiedRebirths=4;game.prestige.permanentMilestones.push('realm_9');");
    assert.ok(rootIds(ctx).includes('spirit_body'));
    assert.equal(rootIds(ctx).includes('chaotic'), false);
    ctx.run("game.prestige.totalRebirths=7;game.prestige.qualifiedRebirths=7;game.prestige.permanentMilestones.push('immortal');");
    assert.ok(rootIds(ctx).includes('chaotic'));
});

test('Тело гарантирует редкий минимум в legacy-сейве без временного поля и milestone', () => {
    let ctx = createContext();
    ctx.run("game.prestige.lastBody='ancient_reincarnation';game.prestige.totalRebirths=10;game.prestige.qualifiedRebirths=10;game._minRootTier=null;");
    ctx = reload(ctx);
    assert.equal(ctx.run('game.getMinRootTier()'), 'rare');
    assert.deepEqual(rootIds(ctx), ['triple','single']);
    assert.equal(ctx.run("game.selectSpiritualRoot('common')"), null);
    assert.equal(ctx.run("game.selectSpiritualRoot('single').tier"), 'rare');
});

test('Вознесение и сохранённый минимум выбирают самый высокий гарантированный тир', () => {
    const ctx = createContext();
    ctx.run("game.prestige.lastBody='ancient_reincarnation';game.prestige.totalRebirths=10;game.prestige.qualifiedRebirths=10;game.prestige.bodyAscensions.ancient_reincarnation=1;");
    assert.equal(ctx.run('game.getMinRootTier()'), 'epic');
    assert.deepEqual(rootIds(ctx), ['spirit_body']);
    assert.equal(ctx.run("game.selectSpiritualRoot('chaotic')"), null,'Более высокий тир не обходит свои условия');
    ctx.run("game._minRootTier='legendary';");
    assert.deepEqual(rootIds(ctx), ['chaotic']);
});

test('Древний при покупке второй звезды сохраняет эпический минимум первой', () => {
    const ctx = createContext();
    ctx.run(`game.realmIndex=10;game.prestige.totalRebirths=10;game.prestige.qualifiedRebirths=10;game.prestige.bodyLives={ancient_reincarnation:2};game.prestige.lastBody='ancient_reincarnation';
        game.prestige.permanentMilestones=['age_10000'];game.prestige.karma=2000;`);
    assert.equal(ctx.run("game.ascendBody('ancient_reincarnation')"), true);
    assert.equal(ctx.run('game.getMinRootTier()'), 'epic');
    assert.equal(ctx.run("game.ascendBody('ancient_reincarnation')"), true);
    assert.equal(ctx.run('game.getMinRootTier()'), 'epic');
    assert.deepEqual(rootIds(ctx), ['spirit_body']);
    assert.equal(ctx.run("game.selectSpiritualRoot('triple')"), null);
});

test('Демон при покупке третьей звезды сохраняет редкий минимум второй', () => {
    const ctx = createContext();
    ctx.run(`game.realmIndex=6;game.prestige.totalRebirths=3;game.prestige.qualifiedRebirths=3;game.prestige.bodyLives={demon_heir:3};game.prestige.lastBody='demon_heir';
        game.prestige.permanentMilestones=['failed_break'];game.prestige.karma=1000;`);
    assert.equal(ctx.run("game.ascendBody('demon_heir')"), true);
    assert.equal(ctx.run("game.ascendBody('demon_heir')"), true);
    assert.equal(ctx.run('game.getMinRootTier()'), 'rare');
    assert.equal(ctx.run("game.ascendBody('demon_heir')"), true);
    assert.equal(ctx.run('game.getMinRootTier()'), 'rare');
    assert.deepEqual(rootIds(ctx), ['triple','single']);
    assert.equal(ctx.run("game.selectSpiritualRoot('dual')"), null);
});

test('Без минимума остаются common и открытый challenge-корень', () => {
    const ctx = createContext();
    ctx.run("game._minRootTier='unknown';game.prestige.totalRebirths=3;game.prestige.qualifiedRebirths=3;");
    assert.equal(ctx.run('game.getMinRootTier()'), null);
    assert.ok(rootIds(ctx).includes('common'));
    assert.ok(rootIds(ctx).includes('none'));
});

test('Ручные элементы ограничены открытыми стихиями, уникальностью и слотами', () => {
    const ctx = createContext();
    ctx.run(`game.prestige.totalRebirths=1;game.prestige.qualifiedRebirths=1;game.prestige.karmaUpgrades.elementChoice=1;
        game.prestige.permanentMilestones=['mastered_sect_jade_purity','mastered_sect_crimson_flame','mastered_sect_moon_lake'];`);
    assert.deepEqual(value(ctx, "game.selectSpiritualRoot('dual',['water','water','void','unknown','fire','wood']).elements"), ['water','fire']);
});

test('Без права ручного выбора недопустимые элементы заменяются обычным случайным набором', () => {
    const ctx = createContext();
    ctx.run('game.prestige.totalRebirths=1;game.prestige.qualifiedRebirths=1;Math.random=()=>0.4;');
    const elements = value(ctx, "game.selectSpiritualRoot('dual',['unknown','unknown']).elements");
    assert.equal(elements.length, 2);
    assert.equal(new Set(elements).size, 2);
    assert.equal(ctx.run('game.spiritualRoot.elements.every(id=>ELEMENTS.some(element=>element.id===id))'), true);
});

test('Принятый корень не позволяет повторно получить статы даже после JSON reload', () => {
    let ctx = createContext();
    ctx.run("game.prestige.totalRebirths=2;game.prestige.qualifiedRebirths=2;game.prestige.permanentMilestones=['realm_5'];game.selectSpiritualRoot('single');");
    const before = value(ctx, '[game.strength,game.spirit,game.luck,game.spiritualRoot]');
    assert.equal(ctx.run("game.selectSpiritualRoot('single')"), null);
    assert.equal(ctx.run("game.selectSpiritualRoot('triple')"), null);
    assert.deepEqual(value(ctx, '[game.strength,game.spirit,game.luck,game.spiritualRoot]'), before);
    ctx = reload(ctx);
    assert.equal(ctx.run("game.selectSpiritualRoot('single')"), null);
    assert.deepEqual(value(ctx, '[game.strength,game.spirit,game.luck,game.spiritualRoot]'), before);
});

test('Существующий низкий корень legacy-сейва не заменяется задним числом', () => {
    let ctx = createContext();
    ctx.run("game.selectSpiritualRoot('common');game.prestige.lastBody='ancient_reincarnation';game.prestige.totalRebirths=10;game.prestige.qualifiedRebirths=10;");
    ctx = reload(ctx);
    assert.equal(ctx.run('game.getMinRootTier()'), 'rare');
    assert.equal(ctx.run('game.spiritualRoot.id'), 'common');
    assert.equal(ctx.run("game.selectSpiritualRoot('single')"), null);
    rootUI(ctx);
    ctx.run('showSpiritualRootModal();');
    assert.equal(ctx.run('game.spiritualRoot.id'), 'common');
});

test('Корень нельзя принять во время смерти или выбора следующего тела', () => {
    const ctx = createContext();
    ctx.run('game.gameOver=true;');
    assert.equal(ctx.run("game.selectSpiritualRoot('common')"), null);
    ctx.run("game.gameOver=false;game.pendingRebirth={karmaEarned:0,naturalDeath:false,bodyId:'peasant'};");
    assert.equal(ctx.run("game.selectSpiritualRoot('common')"), null);
});

test('UI скрывает низшие корни и показывает реальные гарантированные варианты', () => {
    const ctx = createContext();
    ctx.run("game.prestige.lastBody='ancient_reincarnation';game.prestige.totalRebirths=10;game.prestige.qualifiedRebirths=10;");
    rootUI(ctx);
    ctx.run('renderRootSelection();');
    const markup = ctx.run('rootResult.innerHTML');
    assert.match(markup, /selectRootUI\('triple'\)/);
    assert.match(markup, /selectRootUI\('single'\)/);
    assert.doesNotMatch(markup, /root-common|root-uncommon|root-trash/);
    assert.equal((markup.match(/root-locked/g) || []).length, 1,'Тизер относится только к следующему, эпическому тиру');
});

test('UI не выбирает закрытый корень и не принимает подменённый предел элементов', () => {
    const ctx = createContext();
    ctx.run(`game.prestige.totalRebirths=1;game.prestige.qualifiedRebirths=1;game.prestige.karmaUpgrades.elementChoice=1;
        game.prestige.permanentMilestones=['mastered_sect_jade_purity','mastered_sect_crimson_flame','mastered_sect_moon_lake'];`);
    rootUI(ctx);
    ctx.run("renderRootSelection();selectRootUI('chaotic');");
    assert.equal(ctx.run('_selectedRootId'), null);
    assert.equal(ctx.run('rootAccept.style.display'), 'none');
    ctx.run("selectRootUI('dual');_selectedElements=['water','water'];toggleElementChoice('fire',99);toggleElementChoice('wood',99);toggleElementChoice('void',99);");
    assert.deepEqual(value(ctx, '_selectedElements'), ['water','fire']);
    assert.deepEqual(value(ctx, "game.selectSpiritualRoot('dual',_selectedElements).elements"), ['water','fire']);
});

test('Две смерти без Золотого Ядра не открывают dual/triple и не дают зачёт или карму', () => {
    const ctx = createContext();
    ctx.run("game.selectSpiritualRoot('common');Math.random=()=>0.99;");
    for (let life = 1; life <= 2; life++) {
        ctx.run('for(let year=0;year<100 && !game.gameOver;year++)game.passYear();');
        assert.equal(ctx.run('game.gameOver'), true);
        assert.equal(ctx.run('game.pendingRebirth.karmaEarned'), 0);
        ctx.run("game.rebirth('peasant',true);");
        assert.equal(ctx.run('game.prestige.totalRebirths'), life);
        assert.equal(ctx.run('game.getQualifiedRebirths()'), 0);
        assert.equal(ctx.run("game.getBodyLives('peasant')"), 0);
        assert.equal(ctx.run('game.prestige.karma'), 0);
        if (life === 1) ctx.run("game.selectSpiritualRoot('common');");
    }
    assert.deepEqual(rootIds(ctx), ['common']);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
