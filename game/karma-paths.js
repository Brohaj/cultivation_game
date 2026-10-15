// Кармические разрешения: наследие, пересмотр формации и расписание практики.
Object.assign(game, {
    getStartingRealmForBody(bodyId) {
        const body = REBIRTH_BODIES.find(b => b.id === bodyId);
        const asc = BODY_ASCENSIONS[bodyId]?.[this.getBodyAscensionLevel(bodyId) - 1];
        const path = [0, 1, 2, 3, 3][this.prestige.karmaUpgrades.pathMemory || 0] || 0;
        return Math.max(body?.startRealm || 0, asc?.perkUpgrade?.startRealm || 0, path);
    },
    getInheritedTechniqueOptions(bodyId = this.pendingRebirth?.bodyId || 'peasant') {
        const startRealm = this.getStartingRealmForBody(bodyId);
        return this.techniques.map(id => TECHNIQUES.find(t => t.id === id)).filter(tech =>
            tech && !['sect', 'body', 'adventure'].includes(tech.source)
            && (tech.requirement?.realm || 0) <= startRealm
        ).map(tech => ({id: tech.id, name: TECHNIQUES_ORIGINAL_NAMES[tech.id] || tech.name,
            tier: TECHNIQUES_ORIGINAL_TIERS[tech.id] || tech.tier}));
    },
    chooseInheritedTechnique(techId, bodyId) {
        if (!this.pendingRebirth || !(this.prestige.karmaUpgrades.pastLifeBook >= 1)) return false;
        if (techId !== 'basic_breathing' && !this.getInheritedTechniqueOptions(bodyId).some(t => t.id === techId)) return false;
        this.pendingRebirth.pastLifeTechniqueId = techId;
        saveGame();
        return true;
    },
    resolveInheritedTechnique(techId) {
        const tech = TECHNIQUES.find(t => t.id === techId);
        return this.prestige.karmaUpgrades.pastLifeBook >= 1 && tech
            && !['sect', 'body', 'adventure'].includes(tech.source)
            && this.realmIndex >= (tech.requirement?.realm || 0) ? techId : 'basic_breathing';
    },
    learnStartingTechnique() {
        const id = this.resolveInheritedTechnique(this.startingTechniqueId || 'basic_breathing');
        this.learnTechnique(id);
        if (id === 'basic_breathing') {
            const level = this.prestige.karmaUpgrades.ancestorLegacy || 0;
            const tiers = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
            const tier = tiers[level] || 'common';
            const tech = TECHNIQUES.find(t => t.id === id);
            if (tech && TIER_ORDER[tier] > TIER_ORDER[tech.tier]) {
                rememberTechniqueOriginal(tech);
                tech.tier = tier;
                if (tech.ascendNames?.[tier]) tech.name = tech.ascendNames[tier];
                if (tech.ascendDescriptions?.[tier]) tech.description = tech.ascendDescriptions[tier];
            }
        }
        return TECHNIQUES.find(t => t.id === id);
    },
    canReplaceFormation(oldId, newId) {
        if (this.gameOver || this.pendingRebirth || !(this.prestige.karmaUpgrades.formationRespec >= 1)
            || this.flags.formationRespecUsed || oldId === newId || !this.isFormationSelected(oldId)
            || this.isFormationSelected(newId)) return false;
        const formation = CULT_FORMATIONS.find(f => f.id === newId);
        return !!formation && (!formation.sect || this.prestige.unlockedFormations.includes(newId));
    },
    replaceFormation(oldId, newId) {
        if (!this.canReplaceFormation(oldId, newId)) return false;
        const formation = CULT_FORMATIONS.find(f => f.id === newId);
        this.flags.formationRespecUsed = true;
        this.selectedFormations[this.selectedFormations.indexOf(oldId)] = newId;
        delete this.formations[oldId];
        this.formations[newId] = Math.min(this.getActiveBodyPerks().formationBonus || 0, formation.maxLevel);
        saveGame();
        addLog(`Пересмотр пути: активирована «${formation.name}». Камни прежней формации потрачены.`, 'system');
        updateUI();
        return true;
    },
    setPracticePlan(stat, target) {
        if (this.gameOver || this.pendingRebirth || !(this.prestige.karmaUpgrades.practiceSchedule >= 1)
            || !['strength', 'spirit', 'luck'].includes(stat) || !Number.isSafeInteger(target)
            || target < 1 || target > 10000) return false;
        this.practicePlan = {enabled: true, stat, target};
        this.tickPracticePlan();
        saveGame();
        updateUI();
        return true;
    },
    stopPracticePlan() {
        if (!this.practicePlan?.enabled) return false;
        this.practicePlan.enabled = false;
        saveGame();
        updateUI();
        return true;
    },
    getPracticePlanActivity() {
        const plan = this.practicePlan;
        if (!plan?.enabled || !(this.prestige.karmaUpgrades.practiceSchedule >= 1)) return null;
        if (!this.expedition && this.realmIndex < REALMS.length - 1 && this.qi < this.qiNeeded()) return 'meditation';
        const neededDao = (this.realmIndex - 3) * SUB_LEVELS + this.subLevel;
        if (this.realmIndex >= 3 && this.sect && this.daoLevel < neededDao) {
            const sect = SECTS.find(s => s.id === this.sect.id);
            return Array.isArray(sect?.daoActivity) ? sect.daoActivity[0] : sect?.daoActivity || 'dao';
        }
        const activity = {strength: 'body', spirit: 'dao', luck: 'fate'}[plan.stat];
        if (this[plan.stat] < plan.target || this.expedition || this.realmIndex >= REALMS.length - 1) return activity;
        return 'meditation';
    },
    tickPracticePlan() {
        if (this.gameOver || this.pendingRebirth) return;
        const activity = this.getPracticePlanActivity();
        if (activity && activity !== this.currentActivity) {
            this.currentActivity = activity;
            updateUI();
        }
    },
});
