// Детерминированный активный игрок: настоящие тики, годы, награды и перерождения.
// Это контрольный сценарий на 1000 лет жизни, а не оценка времени прохождения.
const { createContext } = require('./test-support');
const seed = Number(process.argv[2] || 12345);
const ctx = createContext();
ctx.run(`
    let simulationSeed = ${seed >>> 0};
    Math.random = () => {
        simulationSeed = (Math.imul(simulationSeed, 1664525) + 1013904223) >>> 0;
        return simulationSeed / 4294967296;
    };
    renderSects = renderExpeditions = renderAdventures = renderArtifacts = function() {};
    renderFormations = renderTechniques = renderMilestones = function() {};
    game.name = 'Контроль баланса';
    game.selectSpiritualRoot('common');
    game.learnTechnique('basic_breathing');

    function manageArtifacts() {
        const tierValue = {common:1,uncommon:1.5,rare:2,epic:3,legendary:4,divine:6};
        const score = art => tierValue[art.tier] * game.getArtifactEffectMult(art);
        for (const slot of ARTIFACT_SLOTS) {
            const best = game.artifacts.filter(a => a.slot === slot).sort((a,b) => score(b)-score(a))[0];
            if (best && game.equippedArtifacts[slot]?.id !== best.id) game.equipArtifact(best.id);
        }
        const equipped = new Set(Object.values(game.equippedArtifacts).filter(Boolean).map(a => a.id));
        for (const art of [...game.artifacts]) {
            if (!equipped.has(art.id)) game.disassembleArtifact(art.id);
        }
        for (const art of Object.values(game.equippedArtifacts).filter(Boolean)) {
            if (art.enhance < 5) game.enhanceArtifact(art.id, false);
        }
    }

    function manageAdventures() {
        for (const rumor of [...game.adventureRumors]) {
            if (game.activeAdventures.length < 1) game.acceptAdventure(rumor.id);
        }
        for (const adventure of [...game.activeAdventures]) {
            if (!adventure.awaitingChoice) continue;
            const definition = ADVENTURES.find(a => a.id === adventure.id);
            const choices = definition?.steps[adventure.currentStep]?.choices || [];
            const index = choices.findIndex(c => {
                const cost = typeof c.cost === 'function' ? c.cost(adventure.flags) : c.cost;
                return !cost || (
                    (!cost.stones || game.stones >= cost.stones) &&
                    (!cost.essence || game.daoEssence >= cost.essence) &&
                    (!cost.pills || game.pills >= cost.pills) &&
                    (!cost.dust || game.artifactDust >= cost.dust)
                );
            });
            const activeIndex = game.activeAdventures.indexOf(adventure);
            if (index >= 0 && activeIndex >= 0) game.chooseAdventureOption(activeIndex, index);
        }
    }

    function act() {
        if (!game.sect && game.canJoinSect('jade_purity')) game.joinSect('jade_purity');
        const requiredDao = (game.realmIndex - 3) * SUB_LEVELS + game.subLevel;
        if (game.canBreakthrough() && (game.realmIndex < 3 || !game.sect || game.daoLevel >= requiredDao)) {
            game.breakthrough();
        }
        const daoActivity = SECTS.find(s => s.id === game.sect?.id)?.daoActivity || 'dao';
        const training = Array.isArray(daoActivity) ? daoActivity[0] : daoActivity;
        game.setActivity(game.qi < game.qiNeeded() ? 'meditation' :
            game.daoLevel < requiredDao ? training : game.strength < game.spirit ? 'body' : 'dao');
        for (let i=0; i<game.sectMissions.length; i++) game.completeSectMission(i);
        if (game.characterAge() % 5 === 0) {
            manageArtifacts();
            manageAdventures();
            for (const id of ['qiPillar','wardCircle','realmGate']) {
                if (!game.isFormationSelected(id)) game.selectFormation(id);
                if (game.stones > 150) game.buyFormation(id);
            }
            const nextRank = game.getNextSectRank();
            if (nextRank && game.realmIndex >= nextRank.realmReq && game.stones > 500) game.donateStones(25);
            if (game.pills > 0 && game.qi < game.qiNeeded() * .7) game.usePill();
        }
        // После похода игрок оставляет время на медитацию: в царстве ци не растёт.
        if (!game.expedition && game.realmIndex >= 2 && game.qi >= game.qiNeeded()) {
            const locations = LOCATIONS.filter(loc => game.canStartExpedition(loc.id) &&
                game.getCombatPower() >= game.getEffectiveDangerLevel(loc));
            locations.sort((a,b) => b.minRealm-a.minRealm || b.rewards.essence?.max/b.duration-a.rewards.essence?.max/a.duration);
            if (locations[0]) game.startExpedition(locations[0].id);
        }
    }
`);

console.log(`Контрольный сценарий: seed=${seed}, до 1000 лет на жизнь, 25 тиков/год, без debug-бонусов.`);
const rows = [];
for (let life=1; life<=4; life++) {
    ctx.run(`
        for (let year=0; year<1000 && !game.gameOver; year++) {
            act();
            for (let tick=0; tick<25; tick++) game.tick();
            game.passYear();
            if (game.years % 3 === 0 && !game.gameOver) game.triggerEvent();
        }
    `);
    const row = ctx.run(`({age:game.characterAge(), realm:game.realmIndex, sub:game.subLevel,
        stones:Math.floor(game.stones), essence:Math.floor(game.daoEssence), dust:Math.floor(game.artifactDust),
        pills:game.pills, scrolls:game.daoScrolls, karma:game.calculateKarma(game.gameOver),
        totalKarma:game.prestige.karma+game._getTotalKarmaSpent(), body:game.prestige.lastBody,
        rank:game.getSectRankIndex(), artifacts:game.artifacts.length, dead:game.gameOver})`);
    rows.push({life,...row});
    console.log(JSON.stringify(rows.at(-1)));
    if (life === 4) break;
    ctx.run(`{
        game.beginRebirth(game.gameOver);
        const nextBody = ['alchemist_heir','merchant_son','peasant'].find(id => game.isBodyUnlocked(id));
        // Покупки оплачены только заработанной кармой, начисление один раз.
        for (const id of ['wealth','pathMemory','memory','statSpeed','enlightenment']) game.buyKarmaUpgrade(id);
        game.rebirth(nextBody, game.gameOver);
        const root = [...game.getAvailableRoots()].sort((a,b) => b.qiMultiplier-a.qiMultiplier)[0];
        game.selectSpiritualRoot(root.id);
        game.learnTechnique('basic_breathing');
    }`);
}
if (rows.some(row => Object.values(row).some(value => typeof value === 'number' && (!Number.isFinite(value) || value < 0)))) {
    throw new Error('Некорректные ресурсы после нескольких жизней');
}
