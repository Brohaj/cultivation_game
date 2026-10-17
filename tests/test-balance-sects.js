// Ограничения повторяемых наград секты и её вклада в карму.
const assert = require('node:assert/strict');
const { createContext } = require('./test-support');

let passed = 0;
let failed = 0;
function test(name, fn) {
    try { fn(); passed++; console.log(`PASS ${name}`); }
    catch (error) { failed++; console.error(`FAIL ${name}\n${error.stack}`); }
}

test('Пустой слот не выдаёт награду и повторяет подбор, если свободного задания пока нет', () => {
    const ctx = createContext();
    ctx.run(`game.realmIndex=7; game.sect={id:'jade_purity',rank:3,contribution:1800};
        game.sectMissions=[{cooldown:1}]; game.flags.sectMissionsCompleted=0;
        var generateMission=game._generateOneMission;
        game._generateOneMission=()=>null;`);
    ctx.run('game.tickSectMission();');
    assert.equal(ctx.run('game.sectMissions[0].cooldown'), 1);
    assert.equal(ctx.run('game.canCompleteSectMission(0)'), false);
    assert.equal(ctx.run('game.completeSectMission(0)'), false);
    assert.equal(ctx.run('game.flags.sectMissionsCompleted'), 0);
    ctx.run('game._generateOneMission=generateMission; game.tickSectMission();');
    assert.ok(ctx.run('game.sectMissions[0].reward'));
    assert.equal(ctx.run('game.sectMissions[0].cooldown'), 0);
    ctx.run('game.sectMissions=[{cooldown:0},null]; game.tickSectMission();');
    assert.ok(ctx.run('game.sectMissions.every(m=>m.reward)'));
});

test('Множители вклада рангов растут до ×2 без изменения начального ранга', () => {
    const ctx = createContext();
    assert.deepEqual(JSON.parse(ctx.run('JSON.stringify(getSectRanks("jade_purity").map(r=>r.bonusMult))')), [1, 1.25, 1.5, 1.75, 2]);
    ctx.run(`game.realmIndex=5; game.prestige.lastBody='merchant_son';
        game.sect={id:'jade_purity',rank:3,contribution:1800}; game.spirit=100;
        var mission=SECT_MISSION_TEMPLATES.prove_spirit.generate(game,SECT_DIFFICULTY.easy);
        game.sectMissions=[{reward:mission.reward,check:mission.check}];`);
    assert.equal(ctx.run('mission.reward.contribution'), 21);
    assert.equal(ctx.run('game.getSectMissionContribution(21)'), 73);
    ctx.run('game.completeSectMission(0);');
    assert.equal(ctx.run('game.sect.contribution'), 1873);
});

test('Скачок через Ядрового ученика сразу выдаёт продвинутую технику', () => {
    for (const [method, resource, amount] of [
        ['donatePills', 'pills', 600],
        ['donateStones', 'stones', 30000],
        ['donateEssence', 'daoEssence', 1500],
        ['donateDust', 'artifactDust', 3000],
    ]) {
        const ctx = createContext();
        ctx.run(`game.realmIndex=5;game.sect={id:'moon_lake',rank:0,contribution:0};game.${resource}=${amount};`);
        assert.equal(ctx.run(`game.${method}(${amount})`), true, method);
        assert.equal(ctx.run('game.getSectRankIndex()'), 3, method);
        assert.equal(ctx.run("game.hasTechnique('moon_elixir_body')"), true, method);
    }

    const ctx = createContext();
    ctx.run("game.realmIndex=5;game.sect={id:'moon_lake',rank:0,contribution:0};game.sectMissions=[{templateId:'prove_spirit',reward:{contribution:3000},cooldown:0}];");
    assert.equal(ctx.run('game.completeSectMission(0)'), true);
    assert.equal(ctx.run('game.getSectRankIndex()'), 3);
    assert.equal(ctx.run("game.hasTechnique('moon_elixir_body')"), true);
});

test('Старое задание у Главы показывает и выдаёт конвертированную награду', () => {
    const ctx = createContext();
    ctx.run(`game.realmIndex=7;game.sect={id:'moon_lake',rank:3,contribution:11950};
        game.spirit=999;game.daoEssence=8;
        var excludes=SECTS.find(s=>s.id==='moon_lake').missions.filter(id=>id!=='prove_spirit');
        game.sectMissions=[game._generateOneMission(excludes)];`);
    assert.deepEqual(JSON.parse(ctx.run('JSON.stringify(game.sectMissions[0].reward)')), { contribution: 43 });
    assert.equal(ctx.run('game.donateEssence(8)'), true);
    assert.equal(ctx.run('game.getSectRankIndex()'), 4);

    const rewards = JSON.parse(ctx.run(`JSON.stringify({
        old:game.sectMissions[0].reward,
        effective:game.getSectMissionReward(game.sectMissions[0]),
        newMission:game._generateOneMission(excludes).reward
    })`));
    assert.deepEqual(rewards.old, { contribution: 43 });
    assert.deepEqual(rewards.effective, { stones: 36, pills: 1 });
    assert.deepEqual(rewards.effective, rewards.newMission);

    const html = ctx.run(`var rendered=[];
        document.createElement=()=>({..._testElement(),appendChild(el){rendered.push(el);}});
        document.getElementById=()=>({..._testElement(),appendChild(el){rendered.push(el);}});
        renderSects(); rendered.map(el=>el.innerHTML).join(' ');`);
    assert.match(html, /\+36 камн/);
    assert.match(html, /\+1 пилюл/);
    assert.doesNotMatch(html, /\+86 вклада/);
    assert.deepEqual(JSON.parse(ctx.run('JSON.stringify(game.sectMissions[0].reward)')), { contribution: 43 });

    assert.equal(ctx.run('game.completeSectMission(0)'), true);
    assert.deepEqual(JSON.parse(ctx.run('JSON.stringify([game.stones,game.pills,game.sect.contribution])')), [36, 1, 12006]);
});

test('Задание, которое само повышает до Главы, начисляет вклад', () => {
    const ctx = createContext();
    ctx.run("game.realmIndex=7;game.sect={id:'moon_lake',rank:3,contribution:11950};game.spirit=999;game.sectMissions=[{templateId:'prove_spirit',reward:{contribution:43},cooldown:0}];");
    assert.deepEqual(JSON.parse(ctx.run('JSON.stringify(game.getSectMissionReward(game.sectMissions[0]))')), { contribution: 43 });
    assert.equal(ctx.run('game.completeSectMission(0)'), true);
    assert.deepEqual(JSON.parse(ctx.run('JSON.stringify([game.sect.rank,game.sect.contribution,game.stones,game.pills])')), [4, 12025, 0, 0]);
});

test('Карма вклада нормализована по сложности и ограничена восемью у Главы', () => {
    const ctx = createContext();
    const result = JSON.parse(ctx.run(`JSON.stringify(SECTS.map(sect=>{
        game.realmIndex=14;
        game.sect={id:sect.id,rank:4,contribution:getSectRanks(sect.id).at(-1).contribution};
        const atHead=game.getSectContributionKarma();
        game.sect.contribution*=1000;
        return {atHead,excess:game.getSectContributionKarma()};
    }))`));
    assert.ok(result.every(row => row.atHead === 8 && row.excess === 8));
});

test('Недоступный по реалму ранг нельзя обойти накоплением вклада', () => {
    const ctx = createContext();
    ctx.run(`game.realmIndex=5; game.sect={id:'abyss_cult',rank:0,contribution:1000000};`);
    assert.equal(ctx.run('game.getSectRankIndex()'), 1);
    assert.equal(ctx.run('game.getSectContributionKarma()'), 2);
});

test('Половина порога Главы даёт одинаковую карму во всех сектах', () => {
    const ctx = createContext();
    const result = JSON.parse(ctx.run(`JSON.stringify(SECTS.map(sect=>{
        game.realmIndex=14;
        game.sect={id:sect.id,rank:0,contribution:getSectRanks(sect.id).at(-1).contribution/2};
        return game.getSectContributionKarma();
    }))`));
    assert.ok(result.every(value => value === 5));
});

test('Кулдаун одинаков для всех рангов и не падает ниже двенадцати лет', () => {
    const ctx = createContext();
    ctx.run(`game.realmIndex=14; game.prestige.lastBody='sect_genius';
        game.prestige.bodyAscensions.sect_genius=3; game.daoLevel=5;
        game.sect={id:'hidden_hermit',rank:4,contribution:100000};`);
    assert.equal(ctx.run('game.getSectMissionCooldown()'), 12);
    ctx.run(`game.prestige.lastBody='peasant'; game.sect={id:'jade_purity',rank:0,contribution:0};`);
    assert.equal(ctx.run('game.getSectMissionCooldown()'), 20);
    assert.deepEqual(JSON.parse(ctx.run(`JSON.stringify(getSectRanks('jade_purity').map(rank=>{
        game.sect.contribution=rank.contribution; return game.getSectMissionCooldown();
    }))`)), [20, 20, 20, 20, 20]);
});

test('Глава получает только явные свитки и небольшой бонус пилюль', () => {
    const ctx = createContext();
    const result = JSON.parse(ctx.run(`game.realmIndex=9; game.sect={id:'abyss_cult',rank:4,contribution:15600};
        JSON.stringify(['treasure_expedition','hall_master_treasury','hall_master_wisdom'].map(id=>
            game._generateOneMission(SECTS.find(s=>s.id==='abyss_cult').missions.filter(t=>t!==id)).reward))`));
    assert.equal(result[0].daoScroll, undefined);
    assert.equal(result[1].daoScroll, 1);
    assert.equal(result[2].daoScroll, 2);
    assert.ok(result.every(reward => reward.pills === 2 && reward.contribution === undefined));
});

test('Артефакт задания соблюдает лимит инвентаря', () => {
    const ctx = createContext();
    ctx.run(`game.artifacts=Array.from({length:ARTIFACT_MAX_INVENTORY},(_,i)=>({id:'full_'+i}));
        game.sectMissions=[{reward:{artifact:'rare'}}]; game.completeSectMission(0);`);
    assert.equal(ctx.run('game.artifacts.length'), ctx.run('ARTIFACT_MAX_INVENTORY'));
    assert.equal(ctx.run('game.flags.sectMissionArtifact_legacy'), undefined);
});

test('Первая награда гарантирована, повторная имеет шанс 5% и потолок rare', () => {
    const ctx = createContext();
    ctx.run(`game.generateArtifact=tier=>({id:'mission_'+game.artifacts.length,tier,name:tier});
        Math.random=()=>0.99;
        game.sectMissions=[{templateId:'hall_master_artifact',reward:{artifact:'epic'}}];`);
    assert.equal(ctx.run('game.completeSectMission(0)'), true);
    assert.equal(ctx.run('game.artifacts[0].tier'), 'epic');
    assert.equal(ctx.run('game.flags.sectMissionArtifact_hall_master_artifact'), true);
    assert.equal(ctx.run('game.completeSectMission(0)'), false);
    assert.equal(ctx.run('game.artifacts.length'), 1);
    ctx.run(`game.years+=game.getSectMissionCooldown();game.sectMissions=[{templateId:'hall_master_artifact',reward:{artifact:'epic'}}];`);
    assert.deepEqual(JSON.parse(ctx.run('JSON.stringify(game.getSectMissionArtifactReward(game.sectMissions[0]))')),
        {tier:'rare',chance:0.05,firstReward:false,flag:'sectMissionArtifact_hall_master_artifact'});
    ctx.run('game.completeSectMission(0);');
    assert.equal(ctx.run('game.artifacts.length'), 1);
    ctx.run(`game.years+=game.getSectMissionCooldown();game.sectMissions=[{templateId:'hall_master_artifact',reward:{artifact:'epic'}}]; Math.random=()=>0.01;
        game.completeSectMission(0);`);
    assert.equal(ctx.run('game.artifacts[1].tier'), 'rare');
    ctx.run(`game.years+=game.getSectMissionCooldown();Math.random=()=>0.99; game.sectMissions=[{templateId:'relic_hunt',reward:{artifact:'uncommon'}}];
        game.completeSectMission(0);`);
    assert.equal(ctx.run('game.artifacts[2].tier'), 'uncommon');
});

test('Старые сохранённые задания проходят общую проверку повторной награды', () => {
    const ctx = createContext();
    ctx.run(`game.flags.sectMissionArtifact_hall_master_artifact=true;
        game.flags.sectMissionArtifact_legacy=true;
        game.sectMissions=[{templateId:'hall_master_artifact',reward:{artifact:'epic'}},{reward:{artifact:'legendary'}}];
        saveGame();`);
    const loaded = createContext(ctx.saved());
    loaded.run(`applyLoadedState(loadGame()); Math.random=()=>0.99; game.completeSectMission(0); game.completeSectMission(1);`);
    assert.equal(loaded.run('game.artifacts.length'), 0);
    assert.equal(loaded.run('game.flags.sectMissionArtifact_hall_master_artifact'), true);
    assert.equal(loaded.run('game.flags.sectMissionArtifact_legacy'), true);
});

test('Перерождение возвращает первую награду, смена секты сохраняет отметку', () => {
    const ctx = createContext();
    ctx.run(`game.flags.sectMissionArtifact_relic_hunt=true;
        game.realmIndex=7; game.sect={id:'jade_purity',rank:1,contribution:100}; game.leaveSect();`);
    assert.equal(ctx.run('game.getSectMissionArtifactReward({templateId:"relic_hunt",reward:{artifact:"rare"}}).firstReward'), false);
    ctx.run('game.reset(true);');
    assert.equal(ctx.run('game.getSectMissionArtifactReward({templateId:"relic_hunt",reward:{artifact:"rare"}}).firstReward'), true);
});

test('UI показывает фактический шанс, тир и независимость кулдауна от ранга', () => {
    const ctx = createContext();
    const html = ctx.run(`game.realmIndex=9; game.sect={id:'jade_purity',rank:4,contribution:100000};
        game.flags.sectMissionArtifact_hall_master_artifact=true;
        game.sectMissions=[{templateId:'hall_master_artifact',reward:{artifact:'epic'}}];
        var rendered=[];
        document.createElement=()=>({..._testElement(),appendChild(el){rendered.push(el);}});
        document.getElementById=()=>({..._testElement(),appendChild(el){rendered.push(el);}});
        renderSects(); rendered.map(el=>el.innerHTML).join(' ');`);
    assert.match(html, /art-tier-rare[^>]*>Мистический артефакт · 5%/);
    assert.match(html, /Новое через 20 лет/);
    assert.doesNotMatch(html, /art-tier-epic/);
});

test('Пожертвование Главы Лунного Озера нельзя замкнуть через обмен Торговца', () => {
    const ctx = createContext();
    for (let realm = 7; realm <= 14; realm++) {
        ctx.run(`game.realmIndex=${realm}; game.prestige.lastBody='merchant_son';
            game.sect={id:'moon_lake',rank:4,contribution:12000};
            game.flags={}; game.stones=0; game.daoEssence=0;
            var excludes=SECTS.find(s=>s.id==='moon_lake').missions.filter(t=>t!=='donate_pills_sect');
            var mission=game._generateOneMission(excludes);
            game.sectMissions=[mission];
            var donated=mission.check.pillsDonated; game.pills=donated;`);
        assert.equal(ctx.run('game.canCompleteSectMission(0)'), false);
        assert.equal(ctx.run('game.donatePills(donated)'), true);
        assert.equal(ctx.run('game.completeSectMission(0)'), false, 'Награда уже выдана сдачей пилюль');
        assert.equal(ctx.run("game.exchangeResources('stones','pills',Math.floor(game.stones/20))"), true);
        assert.ok(ctx.run('game.pills < donated'), `Замкнутая петля на реалме ${realm}`);
    }
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
