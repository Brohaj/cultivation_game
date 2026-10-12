// Бюджеты сборок и выдача оплаченного XP; данные игрока остаются в отдельной VM.
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const {createContext}=require('./test-support');
const {prepareCatalog,buildSnapshot,soloSnapshots,playerSnapshot}=require('./simulate-technique-balance');
function close(actual,expected){assert.ok(Math.abs(actual-expected)<1e-9,`${actual} != ${expected}`);}

test('Все эффекты получают рост на каждом тире, а поддержка растёт мягче силы',()=>{
    const ctx=prepareCatalog();
    const rows=JSON.parse(ctx.run(`JSON.stringify([...new Set(TECHNIQUES.flatMap(t=>Object.keys(t.effects)))].map(key=>({key,
        values:['common','uncommon','rare','epic','legendary','divine'].map(tier=>game.getTechniqueTierMultiplier(tier,key))})))`));
    for(const row of rows) for(let i=1;i<row.values.length;i++) assert.ok(row.values[i]>row.values[i-1],row.key);
    assert.ok(ctx.run(`game.getTechniqueTierMultiplier('divine','breakthroughBonus')<game.getTechniqueTierMultiplier('divine','combatPower')`));
});

test('Раннее дыхание и медитация сохраняют исходный бюджет ци',()=>{
    const rows=soloSnapshots();
    for(const id of ['basic_breathing','stone_meditation']) {
        const row=rows.find(r=>r.id===id); close(row.nativeAfter,row.nativeBefore);
    }
});

test('Сердце Дао сильнее любой отдельной полностью вознесённой техники ци со сродством',()=>{
    const rows=soloSnapshots().filter(r=>r.effect==='qi');
    const heart=rows.find(r=>r.id==='immortal_dao_heart');close(1+heart.nativeAfter,4.15);
    for(const row of rows.filter(r=>r.id!==heart.id)) assert.ok(heart.nativeAfter>row.divineAffinityAfter,row.id);
    assert.ok(1+heart.nativeAfter<5);
});

test('Шесть Путей не заменяет всю подготовку прорыва, Зеркало не разгоняет XP в восемь раз',()=>{
    const rows=soloSnapshots();
    const paths=rows.find(r=>r.id==='six_paths_breathing');close(paths.nativeAfter,.252);close(paths.divineAffinityAfter,.30);
    const mirror=rows.find(r=>r.id==='dao_heart_mirror');close(1+mirror.divineAffinityAfter,1.9375);
    for(const row of rows.filter(r=>r.effect==='techXpSpeed')) assert.ok(1+row.divineAffinityAfter<2,row.id);
});

test('Небесный Щит остаётся сильнее Железного Тела и действительно сохраняет ци/Дао при провале',()=>{
    const rows=soloSnapshots();const shield=rows.find(r=>r.id==='heavenly_shield'), iron=rows.find(r=>r.id==='iron_body');
    assert.ok(shield.nativeAfter>iron.nativeAfter);assert.ok(shield.divineAffinityAfter<.35);
    function failure(protectedHero){
        const ctx=createContext();ctx.run(`game.realmIndex=7;game.subLevel=1;game.years=1000;game.birthYear=1000;
            game.sect={id:'hidden_hermit',rank:0,contribution:0};game.daoLevel=50;game.daoProgress=100;
            game.strength=80;game.spirit=120;game.luck=50;game.qi=game.qiNeeded();Math.random=()=>.999;
            if(${protectedHero}){game.learnTechnique('heavenly_shield');game.techLevels.heavenly_shield=12;}
            game.breakthrough();`);
        return {qi:ctx.run('game.qi'),dao:ctx.run('game.daoProgress'),needed:ctx.run('game.qiNeeded()')};
    }
    const bare=failure(false),guarded=failure(true);assert.equal(bare.qi,0);assert.equal(bare.dao,0);
    assert.ok(guarded.qi>guarded.needed*.19 && guarded.qi<guarded.needed*.20);
    assert.ok(guarded.dao>=19);
});

for(const realm of [7,10,12,14]) test(`Реалм ${realm}: специализация даёт выгоду ценой другой задачи при ограниченных слотах`,()=>{
    const qi=buildSnapshot({realm,build:'cultivation',ascended:true}),cp=buildSnapshot({realm,build:'combat',ascended:true}),balanced=buildSnapshot({realm,build:'balanced',ascended:true});
    assert.ok(qi.qiFactor>balanced.qiFactor*1.20);assert.ok(cp.cp>balanced.cp*1.20);
    assert.ok(balanced.cp>qi.cp);assert.ok(balanced.qiFactor>cp.qiFactor);
    for(const row of [qi,cp,balanced]) assert.ok(row.equipped.length<=row.slots);
    const many=buildSnapshot({realm,build:'balanced',ascended:true,allSlots:true});
    assert.ok(many.equipped.length<=many.slots);assert.ok(many.cp>=balanced.cp);assert.ok(many.qiFactor>=balanced.qiFactor);
});

for(const realm of [10,12,14]) test(`Реалм ${realm}: тело, пилюли, формация и заточенный амулет дают подготовленный прорыв`,()=>{
    const ctx=prepareCatalog();ctx.run(`game.realmIndex=${realm};game.years=30000;game.luck=120;
        game.prestige.lastBody='fortune_child';game.prestige.bodyAscensions.fortune_child=3;
        game.learnTechnique('six_paths_breathing');game.learnTechnique('body_fortune_star');
        for(const id of game.equippedTechniques){const t=TECHNIQUES.find(t=>t.id===id);t.tier=${realm>=12?"'divine'":"'legendary'"};game.techLevels[id]=t.maxLevel;}
        var techniqueOnly=game.getBreakthroughChance();
        game.selectedFormations=['breakthroughAltar'];game.formations.breakthroughAltar=20;
        game.artifacts=[{id:'prepared',name:'Амулет',slot:'accessory',tier:'legendary',effects:{breakthroughBonus:3.2},enhance:8,transcend:0}];
        game.equipArtifact('prepared');game.spiritualPills=5;for(let i=0;i<5;i++)game.useSpiritualPill();`);
    const prepared=ctx.run('game.getBreakthroughChance()');assert.ok(prepared>.5 && prepared<=.95);
    close(prepared,Math.min(.95,ctx.run('techniqueOnly')+.25+.08+3.2*Math.pow(1.2,8)*.01));
});

test('Карточка поддержки и карточка мощи показывают реальные эффекты разных кривых',()=>{
    const ctx=prepareCatalog();ctx.run(`game.spiritualRoot={elements:['wind']};game.techLevels.dao_heart_mirror=10;
        TECHNIQUES.find(t=>t.id==='dao_heart_mirror').tier='divine';`);
    assert.ok(ctx.run(`formatTechEffects(TECHNIQUES.find(t=>t.id==='dao_heart_mirror'),10,true)`).includes('+94%'));
    close(ctx.run(`game.getTechniqueEffectBonus('dao_heart_mirror','techXpSpeed')`),.9375);
});

test('Покупка Озарения сразу выдаёт XP и сохраняется без новой очереди',()=>{
    let ctx=createContext();ctx.run(`game.learnTechnique('basic_breathing');game.daoEssence=100;game.buyInsight();saveGame();`);
    assert.equal(ctx.run('game.daoEssence'),90);assert.equal(ctx.run('game.techXP.basic_breathing'),3);
    assert.equal(ctx.run('game._pendingInsightXP'),null);assert.equal(ctx.run('game._insightTicksLeft'),0);
    const saved=ctx.saved();ctx=createContext(saved);ctx.run('applyLoadedState(loadGame());game._tickInsightXP();saveGame();');
    assert.deepEqual(ctx.saved(),{...saved,prestige:{...saved.prestige,heavenlyStats:{}}});
});

test('Пакет Озарений совпадает с последовательными покупками при переходе нескольких уровней',()=>{
    function make(){const ctx=createContext();ctx.run(`game.realmIndex=7;game.daoEssence=10000;
        game.learnTechnique('basic_breathing');game.learnTechnique('thunder_fist');game.techXP.basic_breathing=35;game.techXP.thunder_fist=143;
        game._insightUses=4;`);return ctx;}
    const batch=make(),singles=make();const before=batch.run('JSON.stringify(getSaveableState())');
    const purchase=JSON.parse(batch.run('JSON.stringify(game.getInsightPurchaseInfo(10))'));
    assert.equal(batch.run('JSON.stringify(getSaveableState())'),before,'Предпросмотр не меняет состояние');
    batch.run('game.buyInsight(10);');singles.run('for(let i=0;i<10;i++)game.buyInsight();');
    const snapshot=ctx=>JSON.parse(ctx.run('JSON.stringify({essence:game.daoEssence,uses:game._insightUses,xp:game.techXP,levels:game.techLevels})'));
    assert.deepEqual(snapshot(batch),snapshot(singles));assert.equal(batch.run('10000-game.daoEssence'),purchase.cost);
    assert.ok(batch.run('game.techLevels.basic_breathing')>1);
});

test('До 10 Озарений у последнего уровня покупает только полезную порцию и не переплачивает',()=>{
    const ctx=createContext();ctx.run(`game.learnTechnique('basic_breathing');game.techLevels.basic_breathing=4;
        game.techXP.basic_breathing=game.techXpNeeded('basic_breathing')-1;game.daoEssence=10;`);
    const purchase=JSON.parse(ctx.run('JSON.stringify(game.getInsightPurchaseInfo(10))'));
    assert.equal(purchase.count,1);assert.equal(purchase.cost,10);assert.equal(ctx.run('game.canBuyInsight(10)'),true);
    assert.equal(ctx.run('game.buyInsight(10)'),true);assert.equal(ctx.run('game.daoEssence'),0);
    assert.equal(ctx.run('game.techLevels.basic_breathing'),5);assert.equal(ctx.run('game._insightUses'),1);
    assert.equal(ctx.run('game.buyInsight(10)'),false);assert.equal(ctx.run('game._insightUses'),1);
});

test('Оплаченный XP старого сейва выдаётся ровно один раз без изменения ресурсов и тиров игрока',()=>{
    const original=JSON.parse(fs.readFileSync(path.join(__dirname,'test-fixtures/player-report-v14.json'),'utf8'));
    original._pendingInsightXP={basic_breathing:123,sword_of_ten_thousand:1000};original._insightTicksLeft=4;
    function ledger(ctx,id){return ctx.run(`(()=>{let sum=game.techXP['${id}']||0;for(let n=1;n<game.techLevels['${id}'];n++)sum+=game.techXpNeeded('${id}',n);return sum;})()`);}
    const baseline=createContext(original);baseline.run('game._flushPendingInsightXP=()=>false;applyLoadedState(loadGame());');
    let ctx=createContext(original);ctx.run('applyLoadedState(loadGame());');
    for(const [id,paid] of Object.entries(original._pendingInsightXP)) close(ledger(ctx,id),ledger(baseline,id)+paid);
    close(ctx.run('game.techXP.basic_breathing'),original.techXP.basic_breathing+123,'Избыток XP у max сохраняется');
    for(const key of ['qi','stones','daoEssence','artifactDust','pills','refinedPills','spiritualPills','heavenlyPills','strength','spirit','luck']) close(ctx.run(`game.${key}`),original[key]??0);
    assert.equal(ctx.run('game._pendingInsightXP'),null);assert.equal(ctx.run('game._insightTicksLeft'),0);
    ctx.run('saveGame();');const flushed=ctx.saved();assert.deepEqual(flushed.techAscendedTiers,original.techAscendedTiers);
    ctx=createContext(flushed);ctx.run('applyLoadedState(loadGame());game._tickInsightXP();saveGame();');assert.deepEqual(ctx.saved(),flushed);
});

test('Сейв игрока остаётся способен пройти CP180 при новой мощности без разгона других статов',()=>{
    const snapshot=playerSnapshot();assert.equal(snapshot.before.cp,268);assert.equal(snapshot.current.cp,188);
    assert.ok(snapshot.current.cp>=180);close(snapshot.current.breakthrough,snapshot.before.breakthrough);
    assert.ok(snapshot.current.qi>snapshot.before.qi*.80);
});
