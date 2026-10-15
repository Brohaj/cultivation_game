// Жизненный цикл учеников, самостоятельная помощь секте и стабильный набор.
const assert = require('node:assert/strict');
const {createContext} = require('./test-support');
let passed=0,failed=0;
function test(name,fn){try{fn();passed++;console.log(`PASS ${name}`);}catch(e){failed++;console.error(`FAIL ${name}\n${e.stack}`);}}
function json(ctx,code){return JSON.parse(ctx.run(`JSON.stringify(${code})`));}
function setup(extra=''){
 const ctx=createContext();ctx.run(`game.realmIndex=7;game.years=100;game.birthYear=16;game.stones=100000;
 game.sect={id:'jade_purity',rank:4,contribution:100000};game.spirit=game.strength=200;
 renderSects=renderFormations=renderDisciples=()=>{};game._getAvailableMissionTemplates=()=>['prove_spirit'];Math.random=()=>.5;
 game.sectMissions=[{templateId:'prove_spirit',check:{spirit:30},reward:{stones:7,contribution:5},cooldown:0},{cooldown:100000},{cooldown:100000}];${extra}`);return ctx;
}
function rank(ctx,index){ctx.run(`game.sect.contribution=getSectRanks(game.sect.id)[${index}].contribution;game.sect.rank=game.getSectRankIndex();`);}
function year(ctx,count=1){for(let i=0;i<count;i++)ctx.run('game.years++;game.tickSectMission();game.tickDisciples();');}
function hire(ctx){const offer=json(ctx,'game.getDiscipleCandidates()[0]');assert.ok(offer);assert.equal(ctx.run(`game.hireDisciple('${offer.id}')`),true);return ctx.run('game.disciplesState.roster.at(-1).id');}
function fill(ctx,count){let waited=0;while(ctx.run('game.disciplesState.roster.length')<count){assert.ok(waited++<500,'Набор завершается');if(ctx.run('game.getDiscipleCandidates().some(c=>c.canHire)'))hire(ctx);else year(ctx);}}
function learned(ctx){return ctx.run('(()=>{const d=game.disciplesState.roster[0];let xp=d.xp;for(let level=1;level<d.level;level++)xp+=game.getDiscipleXpNeeded({...d,level});return xp;})()');}

test('Пустое состояние и отдельный профиль сохраняются при JSON reload',()=>{
 const ctx=createContext();ctx.run('saveGame();');const saved=ctx.saved(),loaded=createContext(saved);loaded.run('applyLoadedState(loadGame());saveGame();');
 assert.deepEqual(loaded.saved().disciplesState,saved.disciplesState);assert.equal(loaded.saved().version,18);assert.equal(loaded.run('localStorage.getItem("cultivation_game_save")'),null);
});
test('Набор открывается после первого повышения, вместимость 0→2→4→6→6',()=>{
 const ctx=setup();for(const [i,n]of[0,2,4,6,6].entries()){rank(ctx,i);assert.equal(ctx.run('game.getDiscipleCapacity()'),n);if(i===0)assert.deepEqual(json(ctx,'game.getDiscipleCandidates()'),[]);}
 rank(ctx,1);fill(ctx,2);assert.equal(ctx.run('game.disciplesState.roster.length'),2);for(const offer of json(ctx,'game.getDiscipleCandidates()'))assert.equal(ctx.run(`game.hireDisciple('${offer.id}')`),false);
});
test('Первое повышение запускает приход кандидатов без открытия вкладки секты',()=>{
 const ctx=createContext();ctx.run('game.realmIndex=3;game.years=100;game.joinSect("jade_purity");');
 assert.equal(ctx.run('game.getDiscipleCapacity()'),0);assert.deepEqual(json(ctx,'game.disciplesState.offersBySect'),{});
 rank(ctx,1);year(ctx);assert.equal(ctx.run('game.disciplesState.sectId'),'jade_purity');assert.equal(ctx.run('game.disciplesState.offersBySect.jade_purity.candidates.length'),2);
});
test('Возраст, срок жизни и кандидат не перевыбираются после загрузки',()=>{
 const ctx=setup(),offers=json(ctx,'game.getDiscipleCandidates()');assert.equal(offers.length,2);
 for(const c of offers){assert.ok(c.age>=16&&c.age<=30);assert.ok(c.maxAge>=100&&c.maxAge<=200);assert.ok(c.expiresYear>=130&&c.expiresYear<=160);}
 ctx.run('saveGame();');const loaded=createContext(ctx.saved());loaded.run('applyLoadedState(loadGame());Math.random=()=>{throw Error("Лишний RNG");};');assert.deepEqual(json(loaded,'game.getDiscipleCandidates()'),offers);
});
test('Найм оплачивается один раз и оставляет вакансию до следующего срока',()=>{
 const ctx=setup(),before=json(ctx,'game.getDiscipleCandidates()'),wallet=ctx.run('game.stones'),id=hire(ctx),d=json(ctx,`game.disciplesState.roster.find(d=>d.id==='${id}')`);
 assert.equal(d.name,before[0].name);assert.equal(d.birthYear,before[0].birthYear);assert.equal(d.maxAge,before[0].maxAge);assert.equal(ctx.run('game.stones'),wallet-before[0].cost);
 assert.equal(ctx.run(`game.hireDisciple('${before[0].id}')`),false);assert.equal(ctx.run('game.getDiscipleCandidates().length'),1);assert.equal(ctx.run('game.getDiscipleCandidates()[0].id'),before[1].id);
});
test('Просроченную карточку нельзя оплатить после обновления списка',()=>{
 const ctx=setup(),c=json(ctx,'game.getDiscipleCandidates()[0]');year(ctx,c.expiresYear-100);assert.ok(!json(ctx,'game.getDiscipleCandidates().map(c=>c.id)').includes(c.id));const wallet=ctx.run('game.stones');assert.equal(ctx.run(`game.hireDisciple('${c.id}')`),false);assert.equal(ctx.run('game.stones'),wallet);
});
test('При совпавших сроках следующий набор показывается через год, без повторной генерации',()=>{
 const ctx=setup(),c=json(ctx,'game.getDiscipleCandidates()[0]');year(ctx,c.expiresYear-100);
 const view=json(ctx,'game.getDiscipleView()');assert.equal(view.nextDeliveryIn,1);assert.equal(view.nextRefreshYear,ctx.run('game.years')+1);
 const before=json(ctx,'game.getDiscipleCandidates().map(c=>c.id)');ctx.run('game.getDiscipleView();');assert.deepEqual(json(ctx,'game.getDiscipleCandidates().map(c=>c.id)'),before);
});
test('Вакансия и срок прихода нового кандидата переживают reload',()=>{
 const ctx=setup(),offers=json(ctx,'game.getDiscipleCandidates()');hire(ctx);ctx.run('saveGame();');const loaded=createContext(ctx.saved());loaded.run('applyLoadedState(loadGame());Math.random=()=>.5;');assert.equal(loaded.run('game.getDiscipleCandidates().length'),1);year(loaded,offers[0].expiresYear-loaded.run('game.years'));assert.equal(loaded.run('game.getDiscipleCandidates().length'),2);assert.equal(loaded.run('game.disciplesState.roster.length'),1);
});
test('Глаз наставника добавляет третий выбор, сохраняя прежних кандидатов',()=>{
 const ctx=setup(),before=json(ctx,'game.getDiscipleCandidates().map(c=>c.id)');ctx.run('game.prestige.karmaUpgrades.mentorEye=1;');const after=json(ctx,'game.getDiscipleCandidates().map(c=>c.id)');assert.equal(after.length,3);assert.deepEqual(after.slice(0,2),before);assert.equal(ctx.run('game.getDiscipleCapacity()'),6);
});
test('Увольнение и замена не удорожают все последующие наймы',()=>{
 const ctx=setup(),price=ctx.run('game.getDiscipleCandidates()[0].cost'),id=hire(ctx);assert.equal(ctx.run(`game.dismissDisciple('${id}')`),true);assert.equal(ctx.run('game.getDiscipleCandidates()[0].cost'),price);hire(ctx);year(ctx,46);assert.equal(ctx.run('game.getDiscipleCandidates()[0].cost'),price);
});
test('Автоматическая работа начинается со следующего года, ручного назначения нет',()=>{
 const ctx=setup('Math.random=()=>0;');hire(ctx);assert.equal(ctx.run('game.flags.sectMissionsCompleted||0'),0);year(ctx);assert.equal(ctx.run('game.flags.sectMissionsCompleted'),1);assert.equal(ctx.run('game.disciplesState.roster[0].level'),2);assert.ok(ctx.run('game.disciplesState.householdCarry>0'));const wallet=ctx.run('game.stones');assert.equal(ctx.run('game.tickDisciples()'),false);assert.equal(ctx.run('game.stones'),wallet);
});
test('Автоматика не расходует ресурсы и не подменяет требования героя',()=>{
 const ctx=setup('Math.random=()=>0;');hire(ctx);ctx.run('game.sectMissions[0].cost={stones:10};');year(ctx);assert.equal(ctx.run('game.flags.sectMissionsCompleted||0'),0);ctx.run('game.sectMissions[0].cost=null;game.sectMissions[0].check={spirit:100000};');year(ctx);assert.equal(ctx.run('game.flags.sectMissionsCompleted||0'),0);ctx.run('game.sectMissions[0].check={pillsDonated:1};game.flags.pillsDonated=1;');assert.equal(ctx.run('game.canAutoCompleteDiscipleMission(0)'),false);assert.equal(ctx.run('game.completeSectMission(0,"disciple")'),false);
});
test('Один ученик выполняет одно задание; шесть не умножают три задания',()=>{
 const single=setup('Math.random=()=>0;');hire(single);single.run('game.sectMissions=Array.from({length:3},()=>({templateId:"prove_spirit",check:{spirit:30},reward:{stones:7,contribution:5},cooldown:0}));');year(single);assert.equal(single.run('game.flags.sectMissionsCompleted'),1);
 const team=setup('Math.random=()=>.95;game.prestige.karmaUpgrades.mentorEye=1;game.sectMissions=Array.from({length:3},()=>({cooldown:100000}));');fill(team,6);team.run('Math.random=()=>0;game.sectMissions=Array.from({length:3},()=>({templateId:"prove_spirit",check:{spirit:30},reward:{stones:7,contribution:5},cooldown:0}));');year(team);assert.equal(team.run('game.flags.sectMissionsCompleted'),3);assert.equal(team.run('game.tickDisciples()'),false);assert.equal(team.run('game.completeSectMission(0)'),false);
});
test('Неудача не перебрасывается другим учеником или reload в том же году',()=>{
 const ctx=setup();hire(ctx);hire(ctx);ctx.run('Math.random=()=>.999;');year(ctx);assert.equal(ctx.run('game.flags.sectMissionsCompleted||0'),0);ctx.run('saveGame();');const loaded=createContext(ctx.saved());loaded.run('applyLoadedState(loadGame());Math.random=()=>0;');assert.equal(loaded.run('game.tickDisciples()'),false);year(loaded);assert.equal(loaded.run('game.flags.sectMissionsCompleted'),1);
});
test('Обычный достигает максимума за 77 лет, обучение повышает доход',()=>{
 const ctx=setup('game.sectMissions=Array.from({length:3},()=>({cooldown:100000}));');hire(ctx);const rate=ctx.run('game.getDiscipleHouseholdRate(game.disciplesState.roster[0])');year(ctx,77);assert.equal(ctx.run('game.disciplesState.roster[0].level'),10);assert.ok(ctx.run('game.getDiscipleHouseholdRate(game.disciplesState.roster[0])')>rate*2.8);assert.ok(Number.isFinite(ctx.run('game.disciplesState.roster[0].xp')));
});
test('Шесть зрелых редких не превышают 40% стипендии при больших внешних бонусах',()=>{
 const ctx=setup('Math.random=()=>.95;game.prestige.karmaUpgrades.mentorEye=1;game.sectMissions=Array.from({length:3},()=>({cooldown:100000}));');fill(ctx,6);ctx.run('for(const d of game.disciplesState.roster)d.level=10;game.getCombatPower=()=>1e9;game.getCurrentEra=()=>({rewardWeight:100,stoneIncome:100});');const wallet=ctx.run('game.stones');year(ctx,20);assert.equal(ctx.run('game.stones')-wallet,120);assert.equal(ctx.run('game.getDiscipleHouseholdCap()'),6);assert.equal(ctx.run('game.flags.sectMissionsCompleted||0'),0);
});
test('Рост вместимости с рангом не снижает доход уже нанятого ученика',()=>{
 const ctx=setup();rank(ctx,1);hire(ctx);const rates=[];for(const index of[1,2,3,4]){rank(ctx,index);rates.push(ctx.run('game.getDiscipleHouseholdRate(game.disciplesState.roster[0])'));}assert.ok(rates.every((v,i)=>i===0||v>=rates[i-1]));
});
test('В год смерти нет работы, XP и оплаты устаревшего письма',()=>{
 const ctx=setup('Math.random=()=>0;game.daoEssence=25;'),id=hire(ctx);ctx.run(`game.triggerDiscipleLetterEvent('${id}');game.disciplesState.roster[0].birthYear=game.years+1-game.disciplesState.roster[0].maxAge;`);const offer=json(ctx,'game.getDiscipleTrainingOffer()'),wallet=ctx.run('game.stones');year(ctx);assert.equal(ctx.run('game.disciplesState.roster.length'),0);assert.equal(ctx.run('game.flags.sectMissionsCompleted||0'),0);assert.equal(ctx.run('game.stones'),wallet);assert.equal(ctx.run('game.getDiscipleTrainingOffer()'),null);assert.equal(ctx.run(`game.acceptDiscipleTrainingOffer('${offer.id}')`),false);assert.equal(ctx.run('game.daoEssence'),25);
});
test('Истёкшая жизнь в JSON не позволяет получить XP событием до годового тика',()=>{
 const ctx=setup(),id=hire(ctx);ctx.run('game.disciplesState.roster[0].birthYear=game.years-game.disciplesState.roster[0].maxAge;saveGame();');const loaded=createContext(ctx.saved());loaded.run('applyLoadedState(loadGame());');assert.equal(loaded.run(`game._grantDiscipleEventXP('${id}',30)`),false);year(loaded);assert.equal(loaded.run('game.disciplesState.roster.length'),0);
});
test('Возраст, дробный доход и обучение совпадают после промежуточной загрузки',()=>{
 const direct=setup('game.sectMissions=Array.from({length:3},()=>({cooldown:100000}));');hire(direct);year(direct,17);direct.run('saveGame();');const resumed=createContext(direct.saved());resumed.run('applyLoadedState(loadGame());Math.random=()=>.5;');year(direct,20);year(resumed,20);const value='[game.stones,game.disciplesState.householdCarry,game.disciplesState.roster]';assert.deepEqual(json(resumed,value),json(direct,value));
});
test('Уход теряет состав, возвращение не перевыбирает предложения того же года',()=>{
 const ctx=setup();hire(ctx);const offers=json(ctx,'game.getDiscipleCandidates()');ctx.run('game.leaveSect();game.joinSect("jade_purity");');rank(ctx,4);assert.equal(ctx.run('game.disciplesState.roster.length'),0);assert.equal(ctx.run('game.disciplesState.householdCarry'),0);assert.deepEqual(json(ctx,'game.getDiscipleCandidates()'),offers);
});
test('Перерождение очищает набор и учеников, сохраняя постоянную прогрессию',()=>{
 const ctx=setup();hire(ctx);ctx.run('game.prestige.qualifiedRebirths=3;game.prestige.bodyLives={peasant:2};game.reset(true);');assert.equal(ctx.run('game.disciplesState.roster.length'),0);assert.deepEqual(json(ctx,'game.disciplesState.offersBySect'),{});assert.equal(ctx.run('game.prestige.qualifiedRebirths'),3);assert.deepEqual(json(ctx,'game.prestige.bodyLives'),{peasant:2});
});
test('Закрытая жизнь не обучает, не платит и не обновляет набор',()=>{
 for(const action of['game.gameOver=true;','game.pendingRebirth={karmaEarned:0};']){const ctx=setup(),id=hire(ctx);ctx.run(action);const before=json(ctx,'game.disciplesState'),wallet=ctx.run('game.stones');ctx.run('game.years+=1000;game.getDiscipleCandidates();game.tickDisciples();');assert.deepEqual(json(ctx,'game.disciplesState'),before);assert.equal(ctx.run('game.stones'),wallet);assert.equal(ctx.run(`game.dismissDisciple('${id}')`),false);}
});
test('passYear обрабатывает учеников один раз за новый год',()=>{
 const ctx=setup();hire(ctx);ctx.run('game.checkWorldEvent=game.tickAdventureRumors=()=>{};game.passYear();');assert.equal(ctx.run('game.years'),101);assert.equal(ctx.run('game.disciplesState.lastProcessedYear'),101);assert.equal(ctx.run('game.tickDisciples()'),false);
});
test('Обычные тики начисляют дробный XP и переходят уровень до границы года',()=>{
 const ctx=setup();hire(ctx);ctx.run('for(let i=0;i<5;i++)game.tick();');assert.ok(Math.abs(learned(ctx)-1.2)<1e-8);
 assert.equal(ctx.run('game.disciplesState.roster[0].level'),1);ctx.run('for(let i=0;i<8;i++)game.tick();');
 assert.ok(Math.abs(learned(ctx)-3.12)<1e-8);assert.equal(ctx.run('game.disciplesState.roster[0].level'),2);assert.equal(ctx.run('game.years'),100);
});
test('25 тиков и годовая обработка вместе дают ровно 6 XP, а не двойную награду',()=>{
 const ctx=setup();hire(ctx);ctx.run('for(let i=0;i<25;i++)game.tick();');assert.equal(learned(ctx),6);
 ctx.run('for(let i=0;i<10;i++)game.tick();');assert.equal(learned(ctx),6);year(ctx);assert.equal(learned(ctx),6);
 assert.equal(ctx.run('game.disciplesState.roster[0].learningXpThisYear'),0);ctx.run('for(let i=0;i<25;i++)game.tick();');year(ctx);assert.equal(learned(ctx),12);
});
test('Дробное обучение переживает reload; письмо не поглощает обычный годовой XP',()=>{
 const ctx=setup();const id=hire(ctx);ctx.run(`for(let i=0;i<5;i++)game.tick();game.daoEssence=25;game.triggerDiscipleLetterEvent('${id}');game.acceptDiscipleTrainingOffer(game.getDiscipleTrainingOffer().id);saveGame();`);
 assert.ok(Math.abs(learned(ctx)-31.2)<1e-8);const loaded=createContext(ctx.saved());loaded.run('applyLoadedState(loadGame());');
 assert.ok(Math.abs(learned(loaded)-31.2)<1e-8);assert.equal(loaded.run('game.disciplesState.roster[0].learningXpThisYear'),1.2);
 year(loaded);assert.equal(learned(loaded),36);assert.equal(loaded.run('game.disciplesState.roster[0].learningXpThisYear'),0);
});
console.log(`\n${passed} passed, ${failed} failed`);process.exitCode=failed?1:0;
