// Сцены учеников: добровольная оплата, адресат, сохранения и отсутствие дублей.
const assert=require('node:assert/strict');
const {createContext}=require('./test-support');
let passed=0,failed=0;
function test(name,fn){try{fn();passed++;console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name+'\n'+error.stack);}}
function json(ctx,code){return JSON.parse(ctx.run('JSON.stringify('+code+')'));}
function setup(count=1){
    const ctx=createContext();ctx.run(`game.realmIndex=7;game.years=100;game.birthYear=16;game.stones=100000;game.daoEssence=25;
        game.sect={id:'jade_purity',rank:4,contribution:100000};game.spirit=120;game.strength=80;game.qi=111;
        game.learnTechnique('basic_breathing');Math.random=()=>0;
        for(let i=0;i<${count};i++)game.hireDisciple(game.getDiscipleCandidates()[0].id);`);
    return ctx;
}
function firstId(ctx){return ctx.run('game.disciplesState.roster[0].id');}
function ledger(ctx,id){return ctx.run(`(()=>{const d=game.disciplesState.roster.find(d=>d.id==='${id}');let total=d.xp;
    for(let n=1;n<d.level;n++)total+=game.getDiscipleXpNeeded({...d,level:n});return total;})()`);}
function hero(ctx){return json(ctx,`({qi:game.qi,dao:game.daoProgress,strength:game.strength,spirit:game.spirit,luck:game.luck,
    activityXP:game.activityXP,techXP:game.techXP,techLevels:game.techLevels,realm:game.realmIndex})`);}

test('Две сцены зарегистрированы и недоступны без учеников или во время похода',()=>{
    const empty=createContext();assert.equal(empty.run(`EVENTS.filter(e=>['disciple_help_in_courtyard','disciple_training_letter'].includes(e.id)).length`),2);
    assert.equal(empty.run('game.canTriggerDiscipleHelpEvent()'),false);assert.equal(empty.run('game.canTriggerDiscipleLetterEvent()'),false);
    const ctx=setup();ctx.run('game.expedition={locationId:"spirit_forest"};');
    assert.equal(ctx.run('game.canTriggerDiscipleHelpEvent()'),false);assert.equal(ctx.run('game.canTriggerDiscipleLetterEvent()'),false);
});

test('Помощь обучает выбранного существующего ученика на 5 XP ровно раз за жизнь',()=>{
    const ctx=setup(2),id=ctx.run('game.disciplesState.roster[1].id'),other=firstId(ctx),beforeHero=hero(ctx);
    const before=ledger(ctx,id),otherBefore=ledger(ctx,other),wallet=ctx.run('game.stones');
    assert.ok(ctx.run(`game.triggerDiscipleHelpEvent('${id}')`));assert.equal(ledger(ctx,id),before+5);assert.equal(ledger(ctx,other),otherBefore);
    assert.equal(ctx.run('game.disciplesState.roster.length'),2);assert.equal(ctx.run('game.stones'),wallet);assert.deepEqual(hero(ctx),beforeHero);
    assert.equal(ctx.run(`game.triggerDiscipleHelpEvent('${id}')`),false);assert.equal(ledger(ctx,id),before+5);
    const saved=ctx.saved(),reloaded=createContext(saved);reloaded.run('applyLoadedState(loadGame());');
    assert.equal(reloaded.run('game.canTriggerDiscipleHelpEvent()'),false);assert.equal(ledger(reloaded,id),before+5);
});

test('Письмо не списывает эссенцию и сохраняется при её недостатке и перезагрузке',()=>{
    const ctx=setup(),id=firstId(ctx);ctx.run('game.daoEssence=0;');
    const before=ledger(ctx,id);assert.ok(ctx.run(`game.triggerDiscipleLetterEvent('${id}')`));
    const offer=json(ctx,'game.getDiscipleTrainingOffer()');assert.equal(offer.cost,20);assert.equal(offer.xp,30);assert.equal(offer.canAccept,false);
    assert.equal(ctx.run('game.daoEssence'),0);assert.equal(ledger(ctx,id),before);assert.equal(ctx.run(`game.acceptDiscipleTrainingOffer('${offer.id}')`),false);
    assert.equal(ctx.run('game.flags.discipleTrainingOffer.id'),offer.id);
    const restored=createContext(ctx.saved());restored.run('applyLoadedState(loadGame());');assert.deepEqual(json(restored,'game.getDiscipleTrainingOffer()'),offer);
    assert.equal(restored.run('game.canTriggerDiscipleLetterEvent()'),false);
});

test('Добровольная практика стоит 20 эссенции, даёт 30 XP только ученику и не повторяется после reload',()=>{
    let ctx=setup(),id=firstId(ctx);ctx.run(`game.triggerDiscipleLetterEvent('${id}');`);
    const offer=json(ctx,'game.getDiscipleTrainingOffer()'),before=ledger(ctx,id),beforeHero=hero(ctx);
    assert.equal(ctx.run(`game.acceptDiscipleTrainingOffer('${offer.id}')`),true);assert.equal(ctx.run('game.daoEssence'),5);assert.equal(ledger(ctx,id),before+30);
    assert.deepEqual(hero(ctx),beforeHero);assert.equal(ctx.run('game.getDiscipleTrainingOffer()'),null);
    assert.equal(ctx.run(`game.acceptDiscipleTrainingOffer('${offer.id}')`),false);assert.equal(ctx.run('game.daoEssence'),5);
    ctx=createContext(ctx.saved());ctx.run('applyLoadedState(loadGame());');assert.equal(ledger(ctx,id),before+30);
    assert.equal(ctx.run('game.canTriggerDiscipleLetterEvent()'),false);assert.equal(ctx.run(`game.acceptDiscipleTrainingOffer('${offer.id}')`),false);
});

test('Повышение уровня ученика не засоряет хронику при обычной учёбе и событиях',()=>{
    const ctx=setup(),id=firstId(ctx);
    ctx.run('globalThis.discipleLogEntries=[];addLog=(text,type)=>discipleLogEntries.push({text,type});');
    assert.equal(ctx.run('game._addDiscipleLearningXp(game.disciplesState.roster[0],game.getDiscipleXpNeeded(game.disciplesState.roster[0]))'),true);
    assert.equal(ctx.run('game.disciplesState.roster[0].level'),2);
    const nextLevelCost=ctx.run('game.getDiscipleXpNeeded(game.disciplesState.roster[0])');
    assert.equal(ctx.run(`game._grantDiscipleEventXP('${id}',${nextLevelCost})`),true);
    assert.equal(ctx.run('game.disciplesState.roster[0].level'),3);
    assert.deepEqual(json(ctx,'discipleLogEntries'),[]);

    ctx.run(`game.triggerDiscipleLetterEvent('${id}');game.acceptDiscipleTrainingOffer(game.getDiscipleTrainingOffer().id);`);
    assert.deepEqual(json(ctx,'discipleLogEntries.map(entry=>entry.type)'),['reward']);
    assert.match(ctx.run('discipleLogEntries[0].text'),/практика поддержана/);
});

test('Отказ оставляет обычный рост, не платит и не создаёт будущую награду',()=>{
    const ctx=setup(),id=firstId(ctx);ctx.run(`game.triggerDiscipleLetterEvent('${id}');`);const offer=json(ctx,'game.getDiscipleTrainingOffer()'),before=ledger(ctx,id);
    assert.equal(ctx.run(`game.declineDiscipleTrainingOffer('${offer.id}')`),true);assert.equal(ctx.run('game.daoEssence'),25);assert.equal(ledger(ctx,id),before);
    assert.equal(ctx.run('game.getDiscipleTrainingOffer()'),null);assert.equal(ctx.run('game.canTriggerDiscipleLetterEvent()'),false);
    ctx.run('game.years++;game.tickDisciples();');assert.equal(ledger(ctx,id),before+6);
});

for(const action of ['dismiss','leave','death','rebirth-choice'])test(`Письмо недоступно после ${action}; устаревшее действие ничего не списывает`,()=>{
    const ctx=setup(),id=firstId(ctx);ctx.run(`game.triggerDiscipleLetterEvent('${id}');`);const offer=json(ctx,'game.getDiscipleTrainingOffer()');
    if(action==='dismiss')ctx.run(`game.dismissDisciple('${id}');`);
    if(action==='leave')ctx.run('game.leaveSect();');
    if(action==='death')ctx.run('game.gameOver=true;');
    if(action==='rebirth-choice')ctx.run('game.pendingRebirth={karmaEarned:10,naturalDeath:false};');
    assert.equal(ctx.run('game.getDiscipleTrainingOffer()'),null);assert.equal(ctx.run(`game.acceptDiscipleTrainingOffer('${offer.id}')`),false);assert.equal(ctx.run('game.daoEssence'),25);
    assert.equal(ctx.run(`game.declineDiscipleTrainingOffer('${offer.id}')`),false);
});

test('Обучение ограничено 10 уровнем, максимальный ученик не требует бесполезной оплаты',()=>{
    const ctx=setup(),id=firstId(ctx);ctx.run(`game.triggerDiscipleLetterEvent('${id}');game._grantDiscipleEventXP('${id}',1000000);`);
    assert.equal(ctx.run('game.disciplesState.roster[0].level'),10);assert.equal(ctx.run('game.canTriggerDiscipleHelpEvent()'),false);
    const offer=json(ctx,'game.getDiscipleTrainingOffer()');assert.equal(offer.canAccept,false);assert.match(offer.reason,/максимального/);
    assert.equal(ctx.run(`game.acceptDiscipleTrainingOffer('${offer.id}')`),false);assert.equal(ctx.run('game.daoEssence'),25);
    assert.equal(ctx.run(`game.declineDiscipleTrainingOffer('${offer.id}')`),true);
});

test('Цена и XP письма берутся из правил; неверный id или изменённые поля сейва не обходят оплату',()=>{
    const ctx=setup(),id=firstId(ctx);ctx.run(`game.triggerDiscipleLetterEvent('${id}');game.flags.discipleTrainingOffer.cost=0;game.flags.discipleTrainingOffer.xp=1000000;`);
    const offer=json(ctx,'game.getDiscipleTrainingOffer()');assert.equal(offer.cost,20);assert.equal(offer.xp,30);
    assert.equal(ctx.run(`game.acceptDiscipleTrainingOffer('stale-offer')`),false);assert.equal(ctx.run('game.daoEssence'),25);
    const before=ledger(ctx,id);assert.equal(ctx.run(`game.acceptDiscipleTrainingOffer('${offer.id}')`),true);assert.equal(ledger(ctx,id),before+30);assert.equal(ctx.run('game.daoEssence'),5);
});

test('Новая жизнь очищает флаги обеих сцен и старое письмо',()=>{
    const ctx=setup(),id=firstId(ctx);ctx.run(`game.triggerDiscipleHelpEvent('${id}');game.triggerDiscipleLetterEvent('${id}');game.reset(true);`);
    assert.equal(ctx.run('game.flags.discipleHelpEventSeen'),undefined);assert.equal(ctx.run('game.flags.discipleLetterEventSeen'),undefined);
    assert.equal(ctx.run('game.getDiscipleTrainingOffer()'),null);
});

console.log(`${passed} disciple event checks passed, ${failed} failed`);process.exitCode=failed?1:0;
