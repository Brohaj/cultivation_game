// Пожертвование выполняет только свой квест: обе награды, границы и старые сейвы.
const assert = require('node:assert/strict');
const { createContext } = require('./test-support');

let passed = 0;
let failed = 0;
function test(name, fn) {
    try { fn(); passed++; console.log('PASS ' + name); }
    catch (error) { failed++; console.error('FAIL ' + name + '\n' + error.stack); }
}
function json(ctx, code) { return JSON.parse(ctx.run('JSON.stringify(' + code + ')')); }

function donationContext(setup = '') {
    const ctx = createContext();
    ctx.run([
        "game.realmIndex=3;game.subLevel=1;game.years=100;",
        "game.sect={id:'moon_lake',rank:0,contribution:0};",
        "game.pills=100;game.stones=0;game.daoEssence=0;Math.random=()=>.5;",
        "game.flags={};game.checkMilestones=()=>{};",
        "var uiUpdates={sect:0,all:0};",
        "renderSects=()=>uiUpdates.sect++;updateUI=()=>uiUpdates.all++;",
        setup,
        "var excludes=SECTS.find(s=>s.id==='moon_lake').missions.filter(id=>id!=='donate_pills_sect');",
        "game.sectMissions=[game._generateOneMission(excludes)];"
    ].join('\n'));
    return ctx;
}

test('Частичная сдача даёт только вклад; последняя пилюля автоматически выдаёт награду задания', () => {
    const ctx = donationContext();
    assert.equal(ctx.run('game.sectMissions[0].check.pillsDonated'), 6);
    assert.equal(ctx.run('game.donatePills(2)'), true);
    assert.deepEqual(json(ctx, '[game.pills,game.sect.contribution,game.stones,game.sectMissions[0].cooldown]'), [98,10,0,0]);
    ctx.run('game.donatePills(3);');
    assert.deepEqual(json(ctx, '[game.pills,game.sect.contribution,game.stones,game.sectMissions[0].cooldown]'), [95,25,0,0]);
    ctx.run('game.donatePills(1);');
    assert.deepEqual(json(ctx, '[game.pills,game.sect.contribution,game.stones,game.sectMissions[0].cooldown]'), [94,73,19,20]);
    assert.equal(ctx.run('game.flags.sectMissionsCompleted'), 1);
    assert.ok(ctx.run('uiUpdates.sect > 0 && uiUpdates.all > 0'));
});

test('Сдача сверх требования учитывает все пилюли, но задание оплачивается один раз', () => {
    const ctx = donationContext();
    ctx.run('game.donatePills(8);');
    assert.deepEqual(json(ctx, '[game.pills,game.flags.pillsDonated,game.sect.contribution,game.stones]'), [92,8,83,19]);
    const dao = ctx.run('game.daoProgress');
    assert.equal(ctx.run('game.completeSectMission(0)'), false);
    assert.equal(ctx.run('game._completePillDonationMissions()'), 0);
    ctx.run('game.donatePills(2);');
    assert.deepEqual(json(ctx, '[game.pills,game.sect.contribution,game.stones,game.flags.sectMissionsCompleted]'), [90,93,19,1]);
    assert.equal(ctx.run('game.daoProgress'), dao);
    assert.equal(ctx.run('game.sectMissions[0].cooldown'), 20);
});

test('Другие готовые задания не выполняются автоматически', () => {
    const ctx = donationContext();
    ctx.run("game.sectMissions.push({templateId:'prove_spirit',check:{spirit:1},reward:{stones:100},cooldown:0});game.donatePills(6);");
    assert.equal(ctx.run('game.canCompleteSectMission(1)'), true);
    assert.equal(ctx.run('game.stones'), 19);
    assert.equal(ctx.run('game.sectMissions[1].templateId'), 'prove_spirit');
    assert.equal(ctx.run('game.completeSectMission(1)'), true);
    assert.equal(ctx.run('game.stones'), 119);
});

test('После кулдауна новый квест не наследует пожертвования предыдущего', () => {
    const ctx = donationContext();
    ctx.run("game._getAvailableMissionTemplates=()=>['donate_pills_sect'];game.donatePills(6);for(let year=0;year<20;year++){game.years++;game.tickSectMission();}");
    assert.equal(ctx.run('game.sectMissions[0].pillsDonatedAtStart'), 6);
    assert.equal(ctx.run('game.sectMissions[0].cooldown'), 0);
    assert.equal(ctx.run('game.canCompleteSectMission(0)'), false);
    assert.equal(ctx.run('game.flags.sectMissionsCompleted'), 1);
    ctx.run('game.donatePills(5);');
    assert.equal(ctx.run('game.stones'), 19);
    assert.equal(ctx.run('game.sectMissions[0].cooldown'), 0);
    ctx.run('game.donatePills(1);');
    assert.equal(ctx.run('game.stones'), 38);
    assert.equal(ctx.run('game.flags.sectMissionsCompleted'), 2);
    assert.equal(ctx.run('game.sectMissions[0].cooldown'), 20);
});

test('Частичная сдача сохраняется; загрузка и завершение не требуют нового полного платежа', () => {
    const ctx = donationContext();
    ctx.run('game.donatePills(3);saveGame();');
    const loaded = createContext(ctx.saved());
    loaded.run('applyLoadedState(loadGame());Math.random=()=>.5;game.donatePills(3);saveGame();');
    assert.deepEqual(json(loaded, '[game.pills,game.sect.contribution,game.stones,game.flags.sectMissionsCompleted]'), [94,73,19,1]);
    const again = createContext(loaded.saved());
    again.run('applyLoadedState(loadGame());game.years++;game.tickSectMission();game.donatePills(1);');
    assert.deepEqual(json(again, '[game.pills,game.sect.contribution,game.stones,game.flags.sectMissionsCompleted]'), [93,78,19,1]);
    assert.equal(again.run('game.sectMissions[0].cooldown'), 19);
});

test('Готовый квест старого сейва автоматически закрывается на тике с полным кулдауном', () => {
    const ctx = donationContext();
    ctx.run('game.flags.pillsDonated=6;game.pills=94;game.sect.contribution=30;saveGame();');
    const loaded = createContext(ctx.saved());
    loaded.run('applyLoadedState(loadGame());Math.random=()=>.5;game.years++;game.tickSectMission();saveGame();');
    assert.deepEqual(json(loaded, '[game.pills,game.sect.contribution,game.stones,game.sectMissions[0].cooldown]'), [94,73,19,20]);
    const again = createContext(loaded.saved());
    again.run('applyLoadedState(loadGame());game.years++;game.tickSectMission();');
    assert.deepEqual(json(again, '[game.sect.contribution,game.stones,game.flags.sectMissionsCompleted,game.sectMissions[0].cooldown]'), [73,19,1,19]);
});

test('Повышение от самого пожертвования учитывается в награде задания', () => {
    const ctx = donationContext('game.sect.contribution=120;');
    ctx.run('game.donatePills(6);');
    // 120 + 30 сдачи = Внутренний; квест 43 × 1.25 = 53, а не прежние 43.
    assert.equal(ctx.run('game.sect.contribution'), 203);
    assert.equal(ctx.run('game.sect.rank'), 1);
    assert.equal(ctx.run('game.stones'), 19);
    assert.equal(ctx.run('game.sectMissions[0].cooldown'), 20);
});

test('Повышение только от задания синхронизирует ранг и перерисовывает секту', () => {
    const ctx = donationContext('game.sect.contribution=90;');
    ctx.run('game.donatePills(6);');
    assert.equal(ctx.run('game.sect.contribution'), 163);
    assert.equal(ctx.run('game.sect.rank'), 1);
    assert.equal(ctx.run('game.getSectRankIndex()'), 1);
    assert.ok(ctx.run('uiUpdates.sect > 0'));
});

test('Автоматическое задание открывает технику Ядрового ученика при пересечении порога', () => {
    const ctx = donationContext('game.realmIndex=4;game.sect.rank=1;game.sect.contribution=630;');
    assert.equal(ctx.run('game.sectMissions[0].check.pillsDonated'), 8);
    ctx.run('game.donatePills(8);');
    assert.equal(ctx.run('game.sect.contribution'), 755);
    assert.equal(ctx.run('game.sect.rank'), 2);
    assert.equal(ctx.run("game.hasTechnique(SECT_TECHNIQUES[SECTS.find(s=>s.id==='moon_lake').advancedTechnique].id)"), true);
});

test('У Главы сохраняются камни и эссенция пожертвования плюс конвертированная награда задания', () => {
    const ctx = donationContext('game.realmIndex=7;game.sect.rank=4;game.sect.contribution=12000;');
    assert.equal(ctx.run('game.sectMissions[0].check.pillsDonated'), 12);
    ctx.run('game.donatePills(12);');
    assert.deepEqual(json(ctx, '[game.pills,game.stones,game.daoEssence,game.sect.contribution]'), [89,147,12,12240]);
    assert.equal(ctx.run('game.flags.sectMissionsCompleted'), 1);
    assert.equal(ctx.run('game.sectMissions[0].cooldown'), 20);
});

test('Отказ при недостатке пилюль или нулевой сдаче не выдаёт наград', () => {
    const ctx = donationContext();
    const before = json(ctx, '[game.pills,game.sect.contribution,game.stones,game.flags,game.sectMissions]');
    assert.equal(ctx.run('game.donatePills(101)'), false);
    assert.equal(ctx.run('game.donatePills(0)'), false);
    assert.deepEqual(json(ctx, '[game.pills,game.sect.contribution,game.stones,game.flags,game.sectMissions]'), before);
});

test('Карточка пожертвования показывает автозачёт и прогресс без второй кнопки; другие кнопки остаются', () => {
    const ctx = createContext();
    const html = ctx.run([
        "game.realmIndex=3;game.sect={id:'moon_lake',rank:0,contribution:0};game.flags.pillsDonated=2;",
        "var mission=SECT_MISSION_TEMPLATES.donate_pills_sect.generate(game,SECT_DIFFICULTY.medium);",
        "game.sectMissions=[{templateId:'donate_pills_sect',description:mission.description,check:mission.check,reward:mission.reward,pillsDonatedAtStart:0},",
        "{templateId:'prove_spirit',description:'Испытание',check:{spirit:1},reward:{stones:1}}];",
        "var rendered=[];",
        "document.createElement=()=>({..._testElement(),appendChild(el){rendered.push(el);}});",
        "document.getElementById=()=>({..._testElement(),appendChild(el){rendered.push(el);}});",
        "renderSects();rendered.map(el=>el.innerHTML).join(' ');"
    ].join('\n'));
    assert.match(html, /Награда за поручение придёт автоматически после пожертвования/);
    assert.match(html, /Пожертвовано пилюль[^<]*2 \/ 6/);
    assert.doesNotMatch(html, /onclick="completeSectMissionUI\(0\)"/);
    assert.match(html, /onclick="completeSectMissionUI\(1\)"/);
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exitCode = failed ? 1 : 0;
