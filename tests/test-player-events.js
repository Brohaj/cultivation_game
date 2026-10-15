// Сюжетные награды и слухи: реальные цепочки, выборы, сохранения и игровые годы.
const assert = require('node:assert/strict');
const { createContext } = require('./test-support');

let passed = 0;
let failed = 0;
function test(name, fn) {
    try { fn(); passed++; console.log(`PASS ${name}`); }
    catch (error) { failed++; console.error(`FAIL ${name}\n${error.stack}`); }
}

function liuContext() {
    const ctx = createContext();
    ctx.run(`game.realmIndex=4; game.years=500; game.strength=100; game.spirit=100;
        game.flags.joinedSect=true; game.flags.sect_crisis_step=2; game.flags.sect_crisis_year=450;
        var crisis=EVENT_CHAINS.find(e=>e.chainId==='sect_crisis' && e.step===3);
        game.addAdventureRumor('elder_betrayal'); game.acceptAdventure('elder_betrayal');
        game.chooseAdventureOption(0,0);`);
    return ctx;
}

test('Цепочка Лю и уже начатое приключение дают один меч', () => {
    const ctx = liuContext();
    ctx.run('crisis.effect(game); game.chooseAdventureOption(0,0);');
    assert.equal(ctx.run("game.artifacts.filter(a=>a.uniqueReward==='liu_sword').length"), 1);
    assert.equal(ctx.run("game.completedAdventures.includes('elder_betrayal')"), true);
});

test('Приключение Лю перед цепочкой также выдаёт один меч', () => {
    const ctx = liuContext();
    ctx.run('game.chooseAdventureOption(0,1); crisis.effect(game);');
    assert.equal(ctx.run("game.artifacts.filter(a=>a.uniqueReward==='liu_sword').length"), 1);
    assert.equal(ctx.run("game.artifacts[0].name"), 'Очищенный Меч Лю');
});

test('Разбор меча и загрузка не позволяют получить другую его версию', () => {
    const ctx = liuContext();
    ctx.run('game.chooseAdventureOption(0,0); game.disassembleArtifact(game.artifacts[0].id); saveGame();');
    const loaded = createContext(ctx.saved());
    loaded.run('applyLoadedState(loadGame());');
    assert.equal(loaded.run('game.grantLiuSword(true)'), null);
    assert.equal(loaded.run('game.artifacts.length'), 0);
});

test('Перенесённый меч прошлой жизни не блокирует одну новую награду Лю', () => {
    const ctx = createContext();
    ctx.run(`game.realmIndex=4;game.years=500;game.grantLiuSword();game.equipArtifact(game.artifacts[0].id);
        game.prestige.karmaUpgrades.artifactMemory=1;Math.random=()=>0;game.rebirth('peasant',false);`);
    assert.equal(ctx.run('game.artifacts.length'), 1);
    assert.equal(ctx.run('!!game.grantLiuSword(true)'), true);
    assert.equal(ctx.run('game.grantLiuSword()'), null);
    assert.equal(ctx.run('game.artifacts.length'), 2);
});

test('Старый меч без нового флага не дублируется при продолжении старого сейва', () => {
    const ctx = createContext();
    ctx.run(`game.realmIndex=4; game.artifacts=[{id:'legacy_liu',name:'Меч Старейшины Лю',tier:'rare',slot:'weapon',effects:{},enhance:0,transcend:0}];
        saveGame();`);
    const loaded = createContext(ctx.saved());
    loaded.run('applyLoadedState(loadGame());');
    assert.equal(loaded.run('game.grantLiuSword(true)'), null);
    assert.equal(loaded.run('game.flags.liu_sword_claimed'), true);
    assert.equal(loaded.run('game.artifacts.length'), 1);
});

test('Переполненный инвентарь не считается успешной выдачей меча', () => {
    const ctx = createContext();
    ctx.run("game.artifacts=Array.from({length:ARTIFACT_MAX_INVENTORY},(_,i)=>({id:'full_'+i}));");
    assert.equal(ctx.run('game.grantLiuSword()'), null);
    assert.equal(ctx.run('!!game.flags.liu_sword_claimed'), false);
    ctx.run('game.artifacts.pop();');
    assert.equal(ctx.run('!!game.grantLiuSword()'), true);
});

test('Двести лет без доступных приключений не открывают новый слух сразу после прорыва', () => {
    const ctx = createContext();
    ctx.run(`game.realmIndex=6; game.years=1000;
        game.completedAdventures=ADVENTURES.filter(a=>a.condition(game)).map(a=>a.id);
        Math.random=()=>1;
        for(var i=0;i<200;i++){game.years++;game.tickAdventureRumors();}
        game.realmIndex=7;
        var rumor=EVENTS.find(e=>e.id==='rumor_demon_lair'); Math.random=()=>0;`);
    assert.equal(ctx.run('game.adventureDiscovery.waitYears'), 0);
    assert.equal(ctx.run('rumor.condition(game)'), false);
    assert.equal(ctx.run('rumor.effect(game)'), '');
    ctx.run('Math.random=()=>1;');
    for (let i = 0; i < 3; i++) ctx.run('game.years++;game.tickAdventureRumors();');
    ctx.run('Math.random=()=>0;');
    assert.equal(ctx.run('rumor.condition(game)'), true);
    assert.notEqual(ctx.run('rumor.effect(game)'), '');
    assert.equal(ctx.run("game.adventureRumors[0].id"), 'demon_lair');
});

test('События со слухами соблюдают общий кулдаун после завершения', () => {
    const ctx = createContext();
    ctx.run(`game.realmIndex=5;game.years=1000;
        game.adventureDiscovery.lastCompleteYear=1000;
        Math.random=()=>0;game._syncAdventureDiscovery();
        var rumors=EVENTS.filter(e=>e.id.startsWith('rumor_'));`);
    assert.equal(ctx.run('rumors.every(e=>!e.condition(game) && !e.effect(game))'), true);
    ctx.run('game.years=1049;game.tickAdventureRumors();');
    assert.equal(ctx.run('rumors.every(e=>!e.condition(game))'), true);
    ctx.run('Math.random=()=>1; for(var i=0;i<3;i++){game.years++;game.tickAdventureRumors();}');
    ctx.run('Math.random=()=>0;');
    assert.equal(ctx.run("EVENTS.find(e=>e.id==='rumor_lost_caravan').condition(game)"), true);
});

test('Ожидание слуха сохраняется, а выход за пределы реалма блокирует событие и принятие', () => {
    const ctx = createContext();
    ctx.run(`game.realmIndex=5;game.years=1000;Math.random=()=>1;
        game.tickAdventureRumors();game.years++;game.tickAdventureRumors();saveGame();`);
    const loaded = createContext(ctx.saved());
    loaded.run('applyLoadedState(loadGame());Math.random=()=>1;');
    assert.equal(loaded.run('game.adventureDiscovery.waitYears'), 1);
    loaded.run('game.years++;game.tickAdventureRumors();game.years++;game.tickAdventureRumors();');
    assert.equal(loaded.run('game.adventureDiscovery.waitYears'), 3);
    loaded.run("game.addAdventureRumor('ancient_tomb');game.realmIndex=13;Math.random=()=>0;");
    assert.equal(loaded.run("EVENTS.find(e=>e.id==='rumor_ancient_tomb').condition(game)"), false);
    assert.equal(loaded.run("game.acceptAdventure('ancient_tomb')"), false);
    loaded.run('game.tickAdventures();');
    assert.equal(loaded.run('game.adventureRumors.length'), 0);
});

test('Явный сюжетный слух не ждёт случайного таймера', () => {
    const ctx = createContext();
    ctx.run('game.realmIndex=3;');
    assert.equal(ctx.run("game.addAdventureRumor('crane_peak')"), true);
    assert.equal(ctx.run("game.acceptAdventure('crane_peak')"), true);
});

test('Сюжетные слухи выдаются цепочками, а случайный поиск их не открывает', () => {
    const ctx = createContext();
    ctx.run('game.realmIndex=4;game.flags.joinedSect=true;');
    assert.equal(ctx.run("game._getAvailableAdventureRumors().some(a=>a.id==='crane_peak'||a.id==='elder_betrayal')"), false);
    ctx.run(`game.strength=1;game.flags.ancient_step=3;game.flags.ancient_year=0;game.years=100;
        EVENT_CHAINS.find(e=>e.chainId==='ancient'&&e.step===4).effect(game);`);
    assert.equal(ctx.run("game.adventureRumors.some(r=>r.id==='crane_peak')"), true);
    ctx.run(`game.flags.sect_crisis_step=2;game.flags.sect_crisis_year=0;
        EVENT_CHAINS.find(e=>e.chainId==='sect_crisis'&&e.step===3).effect(game);`);
    assert.equal(ctx.run("game.adventureRumors.some(r=>r.id==='elder_betrayal')"), true);
});

test('Сюжетное Восприятие Пустоты ждёт свой реалм и передаётся один раз', () => {
    const ctx = createContext();
    ctx.run(`game.realmIndex=5;game.years=100;game.flags.ancient_step=4;game.flags.ancient_year=0;
        var inheritance=EVENT_CHAINS.find(e=>e.chainId==='ancient'&&e.step===5);`);
    assert.equal(ctx.run('inheritance.condition(game)'), false);
    ctx.run('game.realmIndex=6;');
    assert.equal(ctx.run('inheritance.condition(game)'), true);
    ctx.run('inheritance.effect(game);');
    assert.equal(ctx.run("game.hasTechnique('void_perception')"), true);
    assert.equal(ctx.run('inheritance.condition(game)'), false);
});

test('Случайные свитки не выдают эксклюзивные техники тел и приключений', () => {
    const ctx = createContext();
    ctx.run(`game.realmIndex=9;game.years=1000;game.spirit=200;game.prestige.totalRebirths=10;
        game.flags.helped_hermit=true;game.flags.helped_hermit_year=0;
        game.flags.scroll_fragment_1=true;game.flags.scroll_fragment_1_year=0;
        game.techniques=game.getRewardTechniquePool().map(t=>t.id);Math.random=()=>0;
        for(var id of ['hermit_master_return','torn_scroll_2','rebirth_dao_echo','rebirth_master','rebirth_forgotten']) {
            var event=EVENTS.find(e=>e.id===id);if(!event.condition(game))throw Error(id+' should be eligible');event.effect(game);
        }`);
    assert.equal(ctx.run("game.techniques.some(id=>['body','adventure','sect'].includes(TECHNIQUES.find(t=>t.id===id).source))"), false);
    assert.equal(ctx.run("game.getRewardTechniquePool().some(t=>t.id==='immortal_dao_heart')"), false);
});

test('Кулдаун пограничного спора не отменяет требования секты и реалма', () => {
    const ctx = createContext();
    ctx.run(`game.realmIndex=5;game.years=1000;game.flags.jade_crimson_cd=1;
        var dispute=EVENTS.find(e=>e.id==='jade_vs_crimson');`);
    assert.equal(!!ctx.run('dispute.condition(game)'), false);
    assert.equal(!!ctx.run("EVENTS.find(e=>e.id==='sect_barrier_breach').condition(game)"), false);
    assert.equal(!!ctx.run("EVENTS.find(e=>e.id==='blood_karma_debt').condition(game)"), false);
    ctx.run("game.sect={id:'jade_purity',rank:0,contribution:0};");
    assert.equal(!!ctx.run('dispute.condition(game)'), true);
    ctx.run('game.realmIndex=10;');
    assert.equal(!!ctx.run('dispute.condition(game)'), false);
    ctx.run('game.realmIndex=5;game.years=1;game.flags.jade_crimson_cd=0;');
    assert.equal(!!ctx.run('dispute.condition(game)'), false);
});

test('Находки не экипируют предмет вне инвентаря и не теряют флаг при отказе', () => {
    for (const slot of ['weapon','armor','accessory','treasure']) {
        const ctx = createContext();
        ctx.run(`game.realmIndex=1;game.artifacts=Array.from({length:ARTIFACT_MAX_INVENTORY},()=>game.generateArtifact('common'));
            var find=EVENTS.find(e=>e.id==='find_${slot}');find.effect(game);`);
        assert.equal(ctx.run(`game.equippedArtifacts.${slot}`), null);
        assert.equal(ctx.run(`!!game.flags.found_${slot}`), false);
        assert.equal(!!ctx.run('find.condition(game)'), false);
        ctx.run('game.artifacts.pop();find.effect(game);');
        assert.equal(ctx.run(`game.artifacts.includes(game.equippedArtifacts.${slot})`), true);
        assert.equal(ctx.run(`game.flags.found_${slot}`), true);
    }
});

test('Провал торга на Рынке Теней не создаёт отрицательный кошелёк', () => {
    for (const stones of [0,17,50]) {
        const ctx = createContext();
        ctx.run(`game.realmIndex=5;game.stones=${stones};game.luck=1;
            game.addAdventureRumor('shadow_market');game.acceptAdventure('shadow_market');game.chooseAdventureOption(0,1);`);
        assert.equal(ctx.run('game.stones'), Math.max(0, stones-30));
        assert.equal(ctx.run('game.activeAdventures[0].currentStep'), 1);
    }
});

test('Отклонённый выбор без провальной ветки сохраняет стоимость и состояние', () => {
    const ctx = createContext();
    ctx.run(`game.realmIndex=3;game.stones=100;game.spirit=1;
        var choice=ADVENTURES.find(a=>a.id==='lost_caravan').steps[0].choices[2];
        choice.cost={stones:30};delete choice.fail;
        game.addAdventureRumor('lost_caravan');game.acceptAdventure('lost_caravan');`);
    assert.equal(ctx.run('game.chooseAdventureOption(0,2)'), false);
    assert.equal(ctx.run('game.stones'), 100);
    assert.equal(ctx.run('game.activeAdventures[0].awaitingChoice'), true);
    assert.equal(ctx.run('game.activeAdventures[0].completedSteps.length'), 0);
});

test('Случайный слух после похода соблюдает сюжетный источник, ожидание и кулдаун', () => {
    const story = createContext();
    story.run(`game.realmIndex=4;game.flags.joinedSect=true;Math.random=()=>0;
        game.completedAdventures=ADVENTURES.filter(a=>a.rumorSource!=='story'&&a.condition(game)).map(a=>a.id);
        game._rollExpeditionRumor();`);
    assert.equal(story.run('game.adventureRumors.length'), 0);

    const ctx = createContext();
    ctx.run(`game.realmIndex=5;game.years=1000;Math.random=()=>0;
        game._rollExpeditionRumor();`);
    assert.equal(ctx.run('game.adventureRumors.length'), 0);
    ctx.run(`Math.random=()=>1;for(var i=0;i<3;i++){game.years++;game.tickAdventureRumors();}
        game.adventureDiscovery.lastCompleteYear=game.years;game.adventureDiscovery.waitYears=0;
        Math.random=()=>0;game._rollExpeditionRumor();`);
    assert.equal(ctx.run('game.adventureRumors.length'), 0);
    ctx.run('game.years+=50;game._rollExpeditionRumor();');
    assert.equal(ctx.run('game.adventureRumors.length'), 0);
    ctx.run(`Math.random=()=>1;for(var i=0;i<3;i++){game.years++;game.tickAdventureRumors();}
        Math.random=()=>0;game._rollExpeditionRumor();`);
    assert.equal(ctx.run('game.adventureRumors.length'), 1);
});

function contentAdventureContext(id, stats = {}) {
    const ctx = createContext();
    ctx.run(`Object.assign(game, ${JSON.stringify({ realmIndex: 3, stones: 100, strength: 1, spirit: 1, luck: 1, qi: 1000, ...stats })});
        Math.random=()=>0;
        game.addAdventureRumor(${JSON.stringify(id)});
        if(!game.acceptAdventure(${JSON.stringify(id)})) throw Error('Adventure should start');
        var journey=game.activeAdventures[0];`);
    return ctx;
}

test('Совет старосты заменяет подкуп, включая нулевой кошелёк после оплаты', () => {
    const ctx = contentAdventureContext('lost_caravan', { stones: 15 });
    assert.equal(ctx.run('game.chooseAdventureOption(0,1)'), true);
    assert.equal(ctx.run('game.stones'), 0);
    assert.equal(ctx.run('game.chooseAdventureOption(0,1)'), true);
    assert.equal(ctx.run('game.stones'), 48); // Прежняя награда 30 * (1 + 3 * .2).
    assert.equal(ctx.run('game.pills'), 3);
    assert.equal(ctx.run('game.artifacts.length'), 1);
    assert.equal(ctx.run('journey.flags.bribed'), true);
    assert.equal(ctx.run('game.prestige.totalAdventures'), 1);
    assert.equal(ctx.run('game.chooseAdventureOption(0,1)'), false);
    ctx.run('game.tickAdventures();');
    assert.equal(ctx.run('game.stones'), 48);
});

test('Обычный подкуп сохраняет цену и награду, платная информация экономит пять камней', () => {
    const direct = contentAdventureContext('lost_caravan');
    direct.run('game.chooseAdventureOption(0,0);game.chooseAdventureOption(0,1);');
    const informed = contentAdventureContext('lost_caravan');
    informed.run('game.chooseAdventureOption(0,1);game.chooseAdventureOption(0,1);');
    assert.equal(direct.run('game.stones'), 128);
    assert.equal(informed.run('game.stones'), 133);
    assert.equal(informed.run('game.pills'), direct.run('game.pills'));
    assert.equal(informed.run('game.artifacts.length'), direct.run('game.artifacts.length'));

    const poor = contentAdventureContext('lost_caravan', { stones: 14 });
    assert.equal(poor.run('game.chooseAdventureOption(0,1)'), false);
    assert.equal(poor.run('journey.currentStep'), 0);
    assert.equal(poor.run('game.stones'), 14);
    poor.run('game.chooseAdventureOption(0,0);');
    assert.equal(poor.run('game.chooseAdventureOption(0,1)'), false);
    assert.equal(poor.run('journey.completedSteps.length'), 1);
});

test('Путь восприятия требует духа, а бесплатное ущелье и бонус тайника сохраняются', () => {
    const poor = contentAdventureContext('lost_caravan', { stones: 0 });
    assert.equal(poor.run('game.chooseAdventureOption(0,2)'), false);
    assert.equal(poor.run('journey.currentStep'), 0);
    assert.equal(poor.run('game.chooseAdventureOption(0,0)'), true);
    poor.run('game.chooseAdventureOption(0,0);');
    assert.equal(poor.run('game.stones'), 12); // Прежний неудачный бой: floor(8 * 1.6).
    assert.equal(poor.run('game.pills'), 1);
    assert.equal(poor.run('game.artifacts.length'), 0);

    const sense = contentAdventureContext('lost_caravan', { stones: 0, strength: 8, spirit: 8 });
    sense.run('game.chooseAdventureOption(0,2);game.chooseAdventureOption(0,0);');
    assert.equal(sense.run('game.stones'), 42); // 20 * 1.6 + прежний бонус 10.
    assert.equal(sense.run('game.pills'), 2);
    assert.equal(sense.run('game.artifacts.length'), 1);
});

test('Совет старосты переживает JSON и не требует повторной оплаты', () => {
    const ctx = contentAdventureContext('lost_caravan', { stones: 15 });
    ctx.run('game.chooseAdventureOption(0,1);saveGame();');
    const loaded = createContext(ctx.saved());
    loaded.run('applyLoadedState(loadGame());Math.random=()=>0;');
    assert.equal(loaded.run('game.activeAdventures[0].flags.village'), true);
    assert.equal(loaded.run('game.stones'), 0);
    assert.equal(loaded.run('game.chooseAdventureOption(0,1)'), true);
    assert.equal(loaded.run('game.stones'), 48);
    assert.equal(loaded.run('game.prestige.totalAdventures'), 1);
});

test('Динамическая цена проверяет все ресурсы до списания и вычисляется один раз', () => {
    for (const resource of ['stones','daoEssence','pills','artifactDust', null]) {
        const ctx = contentAdventureContext('lost_caravan');
        ctx.run(`game.stones=7;game.daoEssence=4;game.pills=3;game.artifactDust=2;var costCalls=0;
            ADVENTURES.find(a=>a.id==='lost_caravan').steps[0].choices[0].cost=()=>{
                costCalls++;return {stones:7,essence:4,pills:3,dust:2};
            };`);
        if (resource) ctx.run(`game.${resource}--;`);
        const before = ctx.run('JSON.stringify([game.stones,game.daoEssence,game.pills,game.artifactDust])');
        assert.equal(ctx.run('game.chooseAdventureOption(0,0)'), !resource);
        assert.equal(ctx.run('costCalls'), 1);
        assert.equal(ctx.run('JSON.stringify([game.stones,game.daoEssence,game.pills,game.artifactDust])'), resource ? before : '[0,0,0,0]');
        assert.equal(ctx.run('journey.completedSteps.length'), resource ? 0 : 1);
    }
});

test('Проводник даёт рабочую команду стража и защищает прежнюю полную награду', () => {
    const ctx = contentAdventureContext('abandoned_temple', { stones: 30 });
    ctx.run('game.chooseAdventureOption(0,2);saveGame();');
    const loaded = createContext(ctx.saved());
    loaded.run('applyLoadedState(loadGame());Math.random=()=>0;var journey=game.activeAdventures[0];');
    assert.equal(loaded.run('game.stones'), 0);
    assert.equal(loaded.run('game.chooseAdventureOption(0,1)'), true);
    assert.equal(loaded.run('journey.flags.sealed'), true);
    assert.equal(loaded.run('game.chooseAdventureOption(0,0)'), true);
    assert.equal(loaded.run('journey.flags.greedy_ok'), true);
    assert.equal(loaded.run('game.stones'), 80);
    assert.equal(loaded.run('game.daoEssence'), 25);
    assert.equal(loaded.run('game.artifacts.length'), 1);
    assert.equal(loaded.run('game.strength'), 1);
    assert.equal(loaded.run('game.prestige.totalAdventures'), 1);

    const poor = contentAdventureContext('abandoned_temple', { stones: 29 });
    assert.equal(poor.run('game.chooseAdventureOption(0,2)'), false);
    assert.equal(poor.run('game.stones'), 29);
    assert.equal(poor.run('journey.currentStep'), 0);
});

test('Силовой вход, бой и духовная печать открывают бесплатные безопасные пути храма', () => {
    for (const route of [
        { stats: { strength: 12 }, choices: [0,0], history: 2 },
        { stats: { strength: 10 }, choices: [1,0,0], history: 3 },
        { stats: { spirit: 14 }, choices: [1,1,0], history: 3 },
    ]) {
        const ctx = contentAdventureContext('abandoned_temple', { stones: 0, ...route.stats });
        for (const choice of route.choices) assert.equal(ctx.run(`game.chooseAdventureOption(0,${choice})`), true);
        assert.equal(ctx.run('journey.flags.greedy_ok'), true);
        assert.equal(ctx.run('journey.completedSteps.length'), route.history);
        assert.equal(ctx.run('game.stones'), 80);
        assert.equal(ctx.run('game.daoEssence'), 25);
        assert.equal(ctx.run('game.artifacts.length'), 1);
    }
});

test('Неудачные бой и печать, а также обход не снимают финальную ловушку', () => {
    for (const route of [
        { stats: { strength: 9 }, guardian: 0, finalStrength: 7, flag: 'fought_fail' },
        { stats: { spirit: 13 }, guardian: 1, finalStrength: 1, flag: 'sealed_partial' },
        { stats: { luck: 10 }, guardian: 2, finalStrength: 1, flag: 'bypassed' },
    ]) {
        const ctx = contentAdventureContext('abandoned_temple', { stones: 0, ...route.stats });
        ctx.run(`game.chooseAdventureOption(0,1);game.chooseAdventureOption(0,${route.guardian});game.chooseAdventureOption(0,0);`);
        assert.equal(ctx.run(`journey.flags.${route.flag}`), true);
        assert.equal(ctx.run('journey.flags.greedy_fail'), true);
        assert.equal(ctx.run('game.strength'), route.finalStrength);
        assert.equal(ctx.run('game.stones'), 32);
        assert.equal(ctx.run('game.daoEssence'), 8);
        assert.equal(ctx.run('game.artifacts.length'), 0);
    }
    const lucky = contentAdventureContext('abandoned_temple', { stones: 0, luck: 12 });
    lucky.run('game.chooseAdventureOption(0,1);game.chooseAdventureOption(0,2);game.chooseAdventureOption(0,0);');
    assert.equal(lucky.run('journey.flags.greedy_ok'), true);
    assert.equal(lucky.run('game.daoEssence'), 25);
});

test('Осторожность и отказ от наследия сохраняют отличимые бесплатные результаты', () => {
    const careful = contentAdventureContext('abandoned_temple', { stones: 0 });
    careful.run('game.chooseAdventureOption(0,1);game.chooseAdventureOption(0,2);game.chooseAdventureOption(0,1);');
    assert.equal(careful.run('game.stones'), 56);
    assert.equal(careful.run('game.daoEssence'), 15);
    assert.equal(careful.run('game.artifacts.length'), 1);
    const respect = contentAdventureContext('abandoned_temple', { stones: 0 });
    respect.run('game.chooseAdventureOption(0,1);game.chooseAdventureOption(0,2);game.chooseAdventureOption(0,2);');
    assert.equal(respect.run('game.stones'), 0);
    assert.equal(respect.run('game.daoEssence'), 0);
    assert.equal(respect.run('game.artifacts.length'), 0);
    assert.equal(respect.run('game.spirit'), 4);
});

test('Превью использует оплату старосты и команду отшельника без ложных требований', () => {
    for (const route of [
        { id: 'lost_caravan', choice: 1, stones: 15, expected: 'Без крови и дополнительной платы', forbidden: '20 камней' },
        { id: 'abandoned_temple', choice: 2, stones: 30, expected: 'Произнести команду отшельника', forbidden: 'Дух:' },
    ]) {
        const ctx = contentAdventureContext(route.id, { stones: route.stones });
        ctx.run(`game.chooseAdventureOption(0,${route.choice});
            var cards=[];var container={..._testElement(),innerHTML:'',appendChild(node){cards.push(node);}};
            document.getElementById=id=>id==='adventures-list'?container:null;
            document.createElement=()=>_testElement();
            renderAdventures();var markup=cards.map(card=>card.innerHTML).join('');`);
        assert.match(ctx.run('markup'), new RegExp(route.expected));
        assert.equal(ctx.run(`markup.includes(${JSON.stringify(route.forbidden)})`), false);
        assert.equal(ctx.run(`markup.match(/<button[^>]*onclick="chooseAdventureUI\\(0, 1\\)"[^>]*>/)[0].includes('disabled')`), false);
    }
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
