// Связность всех каталогов и выполнение доступных событий на разных этапах пути.
const assert = require('node:assert/strict');
const test = require('node:test');
const { createContext } = require('./test-support');

test('ID и ссылки всех каталогов контента связаны с существующими определениями', () => {
    const ctx = createContext();
    const issues = JSON.parse(ctx.run(`JSON.stringify((() => {
        const issues=[];
        for (const [name,pool] of Object.entries({TECHNIQUES,EVENTS,ADVENTURES,MILESTONES,SECTS,CULT_FORMATIONS,LOCATIONS,REBIRTH_BODIES,KARMA_UPGRADES,WORLD_EVENTS})) {
            const seen=new Set();
            for (const entry of pool) {
                if (!entry.id || seen.has(entry.id)) issues.push(name+': duplicate/missing '+entry.id);
                seen.add(entry.id);
            }
        }
        const techniqueIds=new Set([...TECHNIQUES,...Object.values(SECT_TECHNIQUES)].map(t=>t.id));
        const sectIds=new Set(SECTS.map(s=>s.id));
        const milestoneIds=new Set(MILESTONES.map(m=>m.id));
        for (const sect of SECTS) {
            for (const id of [sect.technique,sect.advancedTechnique].filter(Boolean)) if (!techniqueIds.has(id)) issues.push(sect.id+': technique '+id);
            for (const id of sect.missions) if (!SECT_MISSION_TEMPLATES[id]) issues.push(sect.id+': mission '+id);
        }
        for (const body of REBIRTH_BODIES) {
            for (const id of body.startTechniques||[]) if (!techniqueIds.has(id)) issues.push(body.id+': technique '+id);
            for (const id of body.requirement?.milestones||[]) if (!milestoneIds.has(id)) issues.push(body.id+': milestone '+id);
        }
        for (const formation of CULT_FORMATIONS) if (formation.sect && !sectIds.has(formation.sect)) issues.push(formation.id+': sect '+formation.sect);
        for (const adv of ADVENTURES) for (const [stepIndex,step] of adv.steps.entries()) for (const choice of step.choices) {
            for (const outcome of [choice.success,choice.fail].filter(Boolean)) {
                if (outcome.nextStep!==undefined && (!Number.isInteger(outcome.nextStep) || !adv.steps[outcome.nextStep])) issues.push(adv.id+'/'+stepIndex+': nextStep '+outcome.nextStep);
                if (outcome.rewards && typeof outcome.rewards!=='function' && outcome.rewards.technique && !techniqueIds.has(outcome.rewards.technique)) issues.push(adv.id+': reward technique '+outcome.rewards.technique);
            }
        }
        return issues;
    })())`));
    assert.deepEqual(issues, []);
});

for (const realm of [0,3,7,10,14]) {
    for (const roll of [0,.5,.999]) {
        test(`Доступные события: реалм ${realm}, RNG ${roll}, без ошибок и нечисловых ресурсов`, () => {
            const ctx = createContext();
            const result = JSON.parse(ctx.run(`JSON.stringify((() => {
                game.realmIndex=${realm}; game.subLevel=2; game.years=30000; game.birthYear=29900;
                game.strength=250; game.spirit=250; game.luck=100;
                game.stones=100000; game.pills=100; game.daoEssence=10000; game.artifactDust=10000;
                game.prestige.totalRebirths=10; game.prestige.karma=3000;
                if(game.realmIndex>=3) { game.joinSect('jade_purity'); game.daoLevel=20; }
                const baseline=JSON.stringify(getSaveableState());
                const errors=[]; let executed=0;
                for (const event of EVENTS) {
                    applyLoadedState(JSON.parse(baseline)); Math.random=()=>${roll};
                    try {
                        if(event.condition && !event.condition(game)) continue;
                        game.executeEvent(event); executed++;
                        for (const key of ['qi','stones','pills','daoEssence','artifactDust','strength','spirit','luck','daoProgress']) {
                            if(!Number.isFinite(game[key]) || game[key]<0) errors.push(event.id+': '+key+'='+game[key]);
                        }
                    } catch(error) { errors.push(event.id+': '+error.message); }
                }
                return {executed,errors};
            })())`));
            assert.ok(result.executed > 10, `Слишком мало выполненных событий: ${result.executed}`);
            assert.deepEqual(result.errors, []);
        });
    }
}

test('Награда ци на максимальной ступени конечна и не зависит от выбранной активности', () => {
    const ctx = createContext();
    ctx.run('game.realmIndex=14; game.spirit=100;');
    const qi = ctx.run('eventQiBonus(game,.15)');
    assert.ok(Number.isFinite(qi));
    assert.ok(qi > 0);
    ctx.run(`game.currentActivity='dao';`);
    assert.equal(ctx.run('eventQiBonus(game,.15)'), qi);
});

test('Разбивка боя учитывает только экипировку и общий эффект ослабления техник', () => {
    const ctx = createContext();
    ctx.run(`game.learnTechnique('thunder_fist'); game.learnTechnique('sword_of_ten_thousand');
        game.equippedTechniques=[];`);
    assert.doesNotMatch(ctx.run(`game.getCombatPowerBreakdown().join(' | ')`), /Экипированные техники/);
    ctx.run(`game.equippedTechniques=['thunder_fist','sword_of_ten_thousand'];`);
    assert.ok(ctx.run(`game.getCombatPowerBreakdown().join(' | ')`).includes(ctx.run(`(1+game.getTechBonus('combatPower')).toFixed(2)`)));
});
