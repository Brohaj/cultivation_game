const PROJECT_ROOT = require('node:path').resolve(__dirname, '..');
// Снимки ценности царств 0.66→0.67, не прохождение жизни и не доказательство общего баланса.
// Все сборки изолированы; таблица предполагает успешное возвращение и фиксированные
// параметры отправления. Потеря ци — потенциальная медитация, без прорывов/роста статов.
const fs = require('node:fs');
const path = require('node:path');
const { createContext } = require('../tests/test-support');
const BASELINE_DURATIONS = {
    spirit_forest:25,beast_cave:30,forgotten_ruins:35,heavenly_auction:15,
    demon_abyss:120,immortal_palace:200,sect_secret_realm:80,
};
const BUILDS = [
    {id:'early0',label:'Начало первой жизни',realm:0,sub:1,year:16,birth:0,stats:[1,1,1],root:'common',techs:[]},
    {id:'early1',label:'Ранняя подготовленная',realm:1,sub:2,year:70,birth:20,stats:[8,12,6],root:'common',
        techs:[['basic_breathing',5],['stone_meditation',3]]},
    {id:'mid4',label:'Средняя подготовленная',realm:4,sub:2,year:500,birth:150,stats:[35,60,20],root:'dual',
        sect:'jade_purity',dao:6,formation:5,techs:[['jade_meditation',8],['wood_rejuvenation',6],['thunder_fist',6]]},
    {id:'player',label:'Реальный экспорт v14',fixture:true},
    {id:'late10',label:'Поздняя, нативные техники',realm:10,sub:2,year:150000,birth:149000,stats:[150,200,80],
        root:'spirit_body',sect:'jade_purity',dao:30,formation:15,karma:500,
        techs:[['immortal_dao_heart',20],['void_perception',12],['mirror_soul_art',12],['heavenly_shield',12],['thunder_fist',10]]},
    {id:'late12',label:'Бессмертная, нативные техники',realm:12,sub:2,year:150000,birth:149000,stats:[200,280,100],
        root:'spirit_body',sect:'jade_purity',dao:38,formation:20,karma:1000,
        techs:[['immortal_dao_heart',20],['void_perception',12],['mirror_soul_art',12],['heavenly_shield',12],['thunder_fist',10]]},
];
// Те же поздние сборки с уже пройденным первым вознесением царств.
// Время получения вознесений не включено: это отдельные подготовленные снимки.
BUILDS.push(...BUILDS.filter(b=>['late10','late12'].includes(b.id)).map(b=>({...b,
    id:b.id+'asc1',label:b.label+', царства★1',ascension:1})));
function json(ctx,code) { return JSON.parse(ctx.run('JSON.stringify('+code+')')); }
function round(value,n=2) { return Number.isFinite(value) ? +value.toFixed(n) : null; }
function percent(value) { return (value>0&&value<.01?value.toExponential(2):round(value))+'%'; }
function prepareBuild(spec) {
    const fixture = spec.fixture && JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT,'test-fixtures/player-report-v14.json'),'utf8'));
    const ctx = createContext(fixture || undefined);
    if (fixture) ctx.run('applyLoadedState(loadGame());game.expedition=null;');
    else ctx.run(`game.realmIndex=${spec.realm};game.subLevel=${spec.sub};game.years=${spec.year};game.birthYear=${spec.birth};
        [game.strength,game.spirit,game.luck]=${JSON.stringify(spec.stats)};
        game.spiritualRoot={...SPIRITUAL_ROOTS.find(r=>r.id===${JSON.stringify(spec.root)}),elements:${spec.root==='common'?'[]':"['water','wood']"}};
        game.stones=100000;game.prestige.lastBody='peasant';game.prestige.karma=${spec.karma||0};
        game.prestige.totalRebirths=${spec.realm>=10?7:spec.realm>=4?1:0};game.prestige.qualifiedRebirths=game.prestige.totalRebirths;
        game.sect=${spec.sect?JSON.stringify({id:spec.sect,rank:4,contribution:100000}):'null'};game.daoLevel=${spec.dao||0};
        for(const t of Object.values(SECT_TECHNIQUES))if(!TECHNIQUES.some(x=>x.id===t.id))TECHNIQUES.push(t);
        game.techniques=[];game.equippedTechniques=[];
        for(const [id,level] of ${JSON.stringify(spec.techs)}){
            const tech=TECHNIQUES.find(t=>t.id===id);
            if(!tech || (tech.requirement?.realm||0)>game.realmIndex)throw Error('Invalid audit technique '+id);
            game.techniques.push(id);game.equippedTechniques.push(id);game.techLevels[id]=Math.min(level,tech.maxLevel);
        }
        game.formations=${spec.formation?JSON.stringify({qiPillar:spec.formation}):'{}'};
        game.selectedFormations=${spec.formation?"['qiPillar']":'[]'};`);
    ctx.run('game._autoExpeditionEnabled=false;');
    if(spec.ascension)ctx.run('for(const loc of LOCATIONS)game.ascendedLocations[loc.id]='+spec.ascension+';');
    return ctx;
}
function baselineDao(ctx,loc) {
    return json(ctx,`(() => {
        const loc=${JSON.stringify(loc)};
        if(game.realmIndex<3||!game.sect||loc.daoSect==='no_dao')return {min:0,max:0};
        const match=loc.daoSect===game.sect.id||loc.daoSect==='current_sect'?2:1;
        const min=(15+game.realmIndex*8+(game.subLevel-1)*3)*match*game.getDaoSpeedMultiplier();
        return {min,max:min*1.5};
    })()`);
}
function range(value,mult) { return value ? {min:Math.floor(value.min*mult),max:Math.floor(value.max*mult)} : {min:0,max:0}; }
function snapshot(spec) {
    const ctx=prepareBuild(spec);
    const build={id:spec.id,label:spec.label,...json(ctx,`({realm:game.realmIndex,sub:game.subLevel,
        qps:game.getMeditationQiPerSec(),qiNeeded:game.qiNeeded(),qi:game.qi,
        age:game.characterAge(),maxAge:game.maxAge(),cp:game.getCombatPower(),
        daoLevel:game.daoLevel,daoNeeded:game.daoNeeded(),daoSpeed:game.getDaoSpeedMultiplier(),
        sect:game.sect?.id||null,body:game.prestige.lastBody,equipped:game.equippedTechniques})`)};
    const rows=[];
    for(const loc of json(ctx,'LOCATIONS')) {
        const tier=ctx.run('game.ascendedLocations['+JSON.stringify(loc.id)+']||0');
        const mult=json(ctx,'game.getExpeditionRewardMultipliers('+JSON.stringify(loc)+')');
        const current=json(ctx,'game.getExpeditionCultivationReward('+JSON.stringify(loc)+')');
        const daoBefore=baselineDao(ctx,loc);
        const durationBefore=ctx.run('game.getExpeditionDuration({duration:'+BASELINE_DURATIONS[loc.id]+'})');
        const artBeforeLoc={...loc,rewards:{...loc.rewards}};
        if(loc.id==='immortal_palace')Object.assign(artBeforeLoc.rewards,{artifactChance:.8,artifactMaxTier:'rare'});
        if(loc.id==='sect_secret_realm')Object.assign(artBeforeLoc.rewards,{artifactMinTier:null,artifactMaxTier:'uncommon'});
        const artBefore=json(ctx,'game.getExpeditionArtifactReward('+JSON.stringify(artBeforeLoc)+')');
        const artAfter=json(ctx,'game.getExpeditionArtifactReward('+JSON.stringify(loc)+')');
        const danger=ctx.run('game.getEffectiveDangerLevel('+JSON.stringify(loc)+')');
        const fail=build.cp>=danger||danger<=0?0:Math.min(.25,(danger-build.cp)/danger*.30);
        const entry=(loc.entryCost||0)*(tier>=2?3:tier>=1?2:1);
        const stones=range(loc.rewards.stones,mult.stones);
        const pills=range(loc.rewards.pills,mult.pills);
        const pillQi=ctx.run('game.getPillQi(1)');
        const scroll=json(ctx,'game.getExpeditionScrollReward('+JSON.stringify(loc)+')');
        const oldLost=build.qps*5*durationBefore;
        rows.push({build:spec.id,location:loc.id,ascension:tier,accessible:ctx.run('game.canStartExpedition('+JSON.stringify(loc.id)+')'),
            durationBefore,durationAfter:current.duration,lostQiBefore:oldLost,lostQiAfter:current.meditationQi,
            qiReward:current.qi,recoveredPercent:current.meditationQi?100*current.qi/current.meditationQi:0,
            lostBarsBefore:build.qiNeeded?oldLost/build.qiNeeded:null,lostBarsAfter:build.qiNeeded?current.meditationQi/build.qiNeeded:null,
            emptyBarReward:current.qi,actualRewardAtSavedQi:Math.max(0,Math.min(current.qi,(build.qiNeeded||0)-build.qi)),
            grade:current.grade,relevance:current.relevance,daoBefore,daoAfter:{min:current.daoMin,max:current.daoMax},
            netStones:{min:stones.min-entry,max:stones.max-entry},essence:range(loc.rewards.essence,mult.resources),
            dust:range(loc.rewards.dust,mult.resources),pills,pillQiEquivalent:{min:pills.min*pillQi,max:pills.max*pillQi},
            artifactsBefore:{...artBefore,expectedCount:artBefore.firstChance+artBefore.secondChance+(artBefore.extraArtifact?1:0)},
            artifactsAfter:{...artAfter,expectedCount:artAfter.firstChance+artAfter.secondChance+(artAfter.extraArtifact?1:0)},
            scrollExpected:scroll.guaranteed||scroll.chance||0,techniqueChance:loc.rewards.techniqueChance||0,
            annualFailChance:fail,survivalBefore:Math.pow(1-fail,durationBefore),survivalAfter:Math.pow(1-fail,current.duration)});
    }
    return {build,rows};
}
function report() { return {
    note:'Conditional on success. Fixed departure snapshots, not a whole-life simulation. Baseline 0.66 durations/Dao/artefact floors; money formula unchanged. Potential Qi assumes repeated timely breakthroughs; current bar caps remain. Skill/stat growth, changing events and other actions are excluded.',
    versions:{baseline:'0.66',current:'0.67'},secondsPerYear:5,results:BUILDS.map(snapshot),
}; }
if(require.main===module) {
    const result=report();
    if(process.argv.includes('--json'))console.log(JSON.stringify(result,null,2));
    else {
        console.log(result.note);
        console.table(result.results.map(({build:b})=>({build:b.id,realm:b.realm+'.'+b.sub,qps:b.qps,
            needed:b.qiNeeded,age:b.age,maxAge:b.maxAge,cp:b.cp,daoNeeded:b.daoNeeded})));
        const rows=result.results.flatMap(r=>r.rows).filter(r=>r.accessible||process.argv.includes('--all'));
        console.table(rows.map(r=>({build:r.build,location:r.location,tier:r.ascension,years:r.durationBefore+'→'+r.durationAfter,
            lostOld:r.lostQiBefore,lostNew:r.lostQiAfter,qi:r.qiReward,recovered:percent(r.recoveredPercent),
            dao:round((r.daoBefore.min+r.daoBefore.max)/2)+'→'+round((r.daoAfter.min+r.daoAfter.max)/2),
            artifacts:round(r.artifactsBefore.expectedCount)+'→'+round(r.artifactsAfter.expectedCount),
            survival:percent(r.survivalBefore*100)+'→'+percent(r.survivalAfter*100)})));
        console.table(rows.filter(r=>r.build==='player').map(r=>({location:r.location,netStones:r.netStones.min+'–'+r.netStones.max,
            essence:r.essence.min+'–'+r.essence.max,dust:r.dust.min+'–'+r.dust.max,pills:r.pills.min+'–'+r.pills.max,
            pillQi:r.pillQiEquivalent.min+'–'+r.pillQiEquivalent.max,artTier:(r.artifactsAfter.minTier||'common')+'–'+r.artifactsAfter.maxTier,
            scrollChance:r.scrollExpected,techniqueChance:r.techniqueChance})));
    }
}
module.exports={BASELINE_DURATIONS,BUILDS,prepareBuild,baselineDao,snapshot,report};
