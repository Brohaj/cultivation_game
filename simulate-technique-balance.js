// Сравнение только техник: одинаковые статы, корень, секта и слоты.
// Это потолок подготовленных сборок, а не прохождение или скорость получения XP.
const { createContext } = require('./test-support');
const fs = require('node:fs');
const path = require('node:path');

const OLD_COEFFICIENTS = {
    immortal_dao_heart: { qi: .07 }, sword_of_ten_thousand: { combatPower: .06 },
    dao_heart_mirror: { techXpSpeed: .05 }, void_absorption: { qi: .08 },
    body_golden_sutra: { qi: .06 }, heavenly_shield: { qiRetention: .004 },
};
const OLD_TIER_CURVE = { common: 1, uncommon: 1.5, rare: 2.5, epic: 4, legendary: 7, divine: 12 };
const ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'divine'];
const BUILD_PRIORITIES = {
    cultivation: ['immortal_dao_heart','void_perception','stone_meditation','solitude_breath','basic_breathing','dao_heart_mirror','mirror_soul_art','wood_rejuvenation','six_paths_breathing','blood_moon_sutra','iron_body','sword_of_ten_thousand','thunder_fist','heavenly_shield','oblivion_memory'],
    combat: ['blood_moon_sutra','sword_of_ten_thousand','thunder_fist','iron_body','heavenly_shield','six_paths_breathing','immortal_dao_heart','dao_heart_mirror','mirror_soul_art','wood_rejuvenation','solitude_breath','stone_meditation','basic_breathing','oblivion_memory'],
    balanced: ['immortal_dao_heart','void_perception','blood_moon_sutra','dao_heart_mirror','mirror_soul_art','heavenly_shield','six_paths_breathing','oblivion_memory','wood_rejuvenation','solitude_breath','stone_meditation','sword_of_ten_thousand','iron_body','thunder_fist','basic_breathing'],
};

function prepareCatalog(legacy = false) {
    const ctx = createContext();
    ctx.run(`for (const tech of Object.values(SECT_TECHNIQUES)) {
        if (!TECHNIQUES.some(t => t.id === tech.id)) TECHNIQUES.push(tech);
    }`);
    if (legacy) {
        ctx.run(`for (const [id, effects] of Object.entries(${JSON.stringify(OLD_COEFFICIENTS)})) {
            Object.assign(TECHNIQUES.find(t=>t.id===id).effects,effects);
        }
        game.getTechniqueTierMultiplier = tier => (${JSON.stringify(OLD_TIER_CURVE)})[tier] || 1;`);
    }
    return ctx;
}

function buildSnapshot({ realm, build, ascended = false, affinity = true, allSlots = false, legacy = false }) {
    const ctx = prepareCatalog(legacy);
    const stats = {7:[80,120,50],10:[150,200,80],12:[200,280,100],14:[300,400,120]}[realm];
    const allowedTier = realm >= 12 ? 'divine' : realm >= 9 ? 'legendary' : 'epic';
    ctx.run(`game.realmIndex=${realm}; game.years=${realm>=12?30000:1000};
        [game.strength,game.spirit,game.luck]=${JSON.stringify(stats)};
        game.spiritualRoot={elements:${affinity?"['wind']":"[]"},qiMultiplier:1};
        game.prestige.lastBody='peasant'; game.prestige.totalRebirths=10;
        game.prestige.karmaUpgrades.techSlots=${allSlots?5:0};
        game.sect={id:'hidden_hermit',rank:2,contribution:1500}; game.daoLevel=10;
        game.techniques=[]; game.equippedTechniques=[];
        var baselineQi=game.getMeditationQiPerSec();
        var baselineXP=game.techXpPerTick('basic_breathing');
        var baselineDao=game.getDaoSpeedMultiplier();
        var ids=${JSON.stringify(BUILD_PRIORITIES[build])}.filter(id=>{
            const tech=TECHNIQUES.find(t=>t.id===id);
            return tech && (tech.requirement?.realm??0)<=game.realmIndex;
        }).slice(0,game.getMaxTechSlots());
        for(const id of ids){
            const tech=TECHNIQUES.find(t=>t.id===id);
            if(${ascended} && ${JSON.stringify(ORDER)}.indexOf(tech.tier)<${ORDER.indexOf(allowedTier)}) tech.tier='${allowedTier}';
            game.learnTechnique(id); game.techLevels[id]=tech.maxLevel;
        }`);
    return JSON.parse(ctx.run(`JSON.stringify({
        realm:game.realmIndex,build:'${build}',ascended:${ascended},affinity:${affinity},allSlots:${allSlots},
        slots:game.getMaxTechSlots(),equipped:game.equippedTechniques,
        qiFactor:game.getMeditationQiPerSec()/baselineQi, cp:game.getCombatPower(),
        cpFactor:game.getCombatPower()/game.strength,
        xpFactor:game.techXpPerTick('basic_breathing')/baselineXP,
        daoFactor:game.getDaoSpeedMultiplier()/baselineDao,
        breakthrough:game.getBreakthroughChance(), techBreakthrough:game.getTechBonus('breakthroughBonus'),
        retention:game.getQiRetention(), lifespanFactor:1+game.getTechBonus('lifespan'),
    })`));
}

function soloSnapshots() {
    const current = prepareCatalog(), legacy = prepareCatalog(true);
    const specs = JSON.parse(current.run('JSON.stringify(TECHNIQUES.map(t=>({id:t.id,effects:Object.keys(t.effects),tier:t.tier,maxLevel:t.maxLevel,element:t.element})))'));
    return specs.flatMap(spec => spec.effects.map(key => {
        function effect(ctx, tier, affinity) {
            return ctx.run(`(() => {const t=TECHNIQUES.find(t=>t.id==='${spec.id}');
                t.tier='${tier}';game.spiritualRoot={elements:${affinity&&spec.element?JSON.stringify([spec.element]):'[]'}};
                return game.getTechniqueEffectBonus(t,'${key}',${spec.maxLevel});})()`);
        }
        return {id:spec.id,effect:key,
            nativeBefore:effect(legacy,spec.tier,false), nativeAfter:effect(current,spec.tier,false),
            divineAffinityBefore:effect(legacy,'divine',true), divineAffinityAfter:effect(current,'divine',true)};
    }));
}

function playerSnapshot() {
    const fixture = JSON.parse(fs.readFileSync(path.join(__dirname,'test-fixtures/player-report-v14.json'),'utf8'));
    const ctx = createContext(fixture);
    ctx.run('applyLoadedState(loadGame());');
    const current = JSON.parse(ctx.run('JSON.stringify({cp:game.getCombatPower(),qi:game.getMeditationQiPerSec(),breakthrough:game.getBreakthroughChance(),retention:game.getQiRetention()})'));
    ctx.run(`for(const [id,effects] of Object.entries(${JSON.stringify(OLD_COEFFICIENTS)})) {
        const tech=TECHNIQUES.find(t=>t.id===id);if(tech)Object.assign(tech.effects,effects);
    } game.getTechniqueTierMultiplier=tier=>(${JSON.stringify(OLD_TIER_CURVE)})[tier]||1;`);
    const before = JSON.parse(ctx.run('JSON.stringify({cp:game.getCombatPower(),qi:game.getMeditationQiPerSec(),breakthrough:game.getBreakthroughChance(),retention:game.getQiRetention()})'));
    return { before, current };
}

function comparisonSnapshots() {
    const rows = [];
    for (const realm of [7,10,12,14]) for (const build of Object.keys(BUILD_PRIORITIES)) {
        for (const ascended of [false,true]) for (const allSlots of [false,true]) {
            const spec={realm,build,ascended,allSlots,affinity:true};
            rows.push({ ...spec, before:buildSnapshot({...spec,legacy:true}), after:buildSnapshot(spec) });
        }
    }
    return rows;
}

if (require.main === module) {
    const result={player:playerSnapshot(),solo:soloSnapshots(),builds:comparisonSnapshots()};
    if(process.argv.includes('--json')) console.log(JSON.stringify(result,null,2));
    else {
        console.log('Игрок:',JSON.stringify(result.player));
        console.table(result.solo.map(r=>({...r,nativeBefore:+r.nativeBefore.toFixed(4),nativeAfter:+r.nativeAfter.toFixed(4),divineAffinityBefore:+r.divineAffinityBefore.toFixed(4),divineAffinityAfter:+r.divineAffinityAfter.toFixed(4)})));
        console.table(result.builds.map(r=>({realm:r.realm,build:r.build,ascended:r.ascended,allSlots:r.allSlots,slots:r.after.slots,
            qiBefore:+r.before.qiFactor.toFixed(2),qiAfter:+r.after.qiFactor.toFixed(2),
            cpBefore:r.before.cp,cpAfter:r.after.cp,xpBefore:+r.before.xpFactor.toFixed(2),xpAfter:+r.after.xpFactor.toFixed(2),
            chanceBefore:+r.before.breakthrough.toFixed(3),chanceAfter:+r.after.breakthrough.toFixed(3)})));
    }
}
module.exports={prepareCatalog,buildSnapshot,soloSnapshots,playerSnapshot,comparisonSnapshots};
