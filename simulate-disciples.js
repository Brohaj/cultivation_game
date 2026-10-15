// Контроль учеников 0.68: настоящий найм, старение, смена кандидатов и выплаты миссий.
const assert = require('node:assert/strict');
const {createContext} = require('./test-support');

function simulate(mode, years, rank, seed) {
    const ctx = createContext();
    ctx.run(`
        let seed=${seed};
        Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
        renderSects=renderDisciples=renderFormations=renderTechniques=function(){};
        const ranks=getSectRanks('crimson_flame');
        game.realmIndex=ranks[${rank}].realmReq;
        game.years=1000;game.birthYear=900;
        game.spirit=200;game.strength=200;game.daoLevel=8;game.stones=10000;
        game.sect={id:'crimson_flame',rank:${rank},contribution:ranks[${rank}].contribution};
        const templates=['slay_beast','arena_challenge','prove_strength'];
        const excluded=SECTS.find(s=>s.id==='crimson_flame').missions.filter(id=>!templates.includes(id));
        const factory=game._generateOneMission.bind(game);
        game._generateOneMission=exclude=>factory([...exclude,...excluded]);
        game.generateSectMissions();
        assertRank=()=>{if(game.getSectRankIndex()!==${rank})throw new Error('Контрольный ранг изменился');};
        assertRank();
        const initial={stones:game.stones,pills:game.pills,contribution:game.sect.contribution,
            claims:game.flags.sectMissionsCompleted||0};
        let hireCost=0,replacementCost=0,hires=0,replacements=0,deaths=0,manualClaims=0;
        let householdIncome=0,awaitingReplacement=0,studentYears=0;
        function recruitAvailable() {
            if('${mode}'==='manual')return;
            for(const offer of game.getDiscipleCandidates()) {
                if(game.disciplesState.roster.length>=game.getDiscipleCapacity())break;
                if(!game.hireDisciple(offer.id))continue;
                hires++;hireCost+=offer.cost;
                if(awaitingReplacement>0) {
                    awaitingReplacement--;replacements++;replacementCost+=offer.cost;
                }
            }
        }
        game.getDiscipleCandidates();
        recruitAvailable();
        for(let year=1;year<=${years};year++) {
            game.years++;
            game.tickSectMission();
            const result=game.tickDisciples();
            if(result) {
                householdIncome+=result.householdIncome;
                deaths+=result.deaths||0;awaitingReplacement+=result.deaths||0;
            }
            recruitAvailable();
            if('${mode}'==='manual') {
                for(let slot=0;slot<game.sectMissions.length;slot++) {
                    if(game.canCompleteSectMission(slot)&&game.completeSectMission(slot))manualClaims++;
                }
            }
            studentYears+=game.disciplesState.roster.length;
            assertRank();
        }
    `);
    return JSON.parse(ctx.run(`JSON.stringify({
        mode:'${mode}',years:${years},rank:${rank},seed:${seed},
        realm:game.realmIndex,capacity:game.getDiscipleCapacity(),
        netStones:game.stones-initial.stones,
        grossStones:game.stones-initial.stones+hireCost,householdIncome,
        missionStones:game.stones-initial.stones+hireCost-householdIncome,
        hireCost,replacementCost,hires,replacements,deaths,
        pills:game.pills-initial.pills,contribution:game.sect.contribution-initial.contribution,
        claims:(game.flags.sectMissionsCompleted||0)-initial.claims,
        manualMissionClicks:manualClaims,recruitClicks:hires,
        totalClicks:manualClaims+hires,students:game.disciplesState.roster.length,
        meanStudents:studentYears/${years},
        levelMean:game.disciplesState.roster.length
            ?game.disciplesState.roster.reduce((sum,d)=>sum+d.level,0)/game.disciplesState.roster.length:0
    })`));
}

const rows=[];
for(const rank of [1,2,3,4])for(const years of [100,500]) {
    const manualTrials=Array.from({length:20},(_,i)=>simulate('manual',years,rank,12345+i));
    const autoTrials=Array.from({length:20},(_,i)=>simulate('auto',years,rank,12345+i));
    autoTrials.forEach((trial,i)=>assert.ok(trial.claims<=manualTrials[i].claims,
        'Автоматика не увеличивает число миссий относительно своевременного ручного получения'));
    for(const trials of [manualTrials,autoTrials]) {
        const mean=key=>Number((trials.reduce((sum,row)=>sum+row[key],0)/trials.length).toFixed(2));
        const keys=['netStones','grossStones','householdIncome','missionStones','hireCost',
            'replacementCost','hires','replacements','deaths','pills','contribution','claims',
            'manualMissionClicks','recruitClicks','totalClicks','students','meanStudents','levelMean'];
        rows.push({mode:trials[0].mode,years,rank,realm:trials[0].realm,capacity:trials[0].capacity,
            ...Object.fromEntries(keys.map(key=>[key,mean(key)]))});
    }
}
console.log(JSON.stringify({
    description:'20 seed 12345–12364; Орден Алого Пламени; три реальные готовые миссии slay_beast/arena_challenge/prove_strength; фиксированные статы 200 и минимальная ступень выбранного ранга; без прорывов, стипендии героя, событий и походов',
    recruitment:'Состав заполняется любыми доступными кандидатами через реальные getDiscipleCandidates/hireDisciple. После смерти доступная замена нанимается сразу; пустые предложения ждут обычного срока обновления. Оба режима получают новые кандидаты по тем же игровым правилам; manual не нанимает.',
    limitations:'Измеряются расходы всех наймов и замен, пассивный доход, действительные миссии и клики. Это контроль при постоянном ранге, а не полное прохождение или оптимальная политика найма. Смена ранга могла бы ускорить окупаемость.',
    rows
},null,2));
