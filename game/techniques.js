// ============================================================
// GAME/TECHNIQUES.JS — Управление техниками (слоты)
// Только экипированные техники дают бонусы и качаются
// Зависит от: game/state.js, data/core.js (getTechSlots)
// ============================================================

Object.assign(game, {
    hasTechnique(techId) {
        return this.techniques.includes(techId);
    },

    isTechEquipped(techId) {
        return this.equippedTechniques.includes(techId);
    },

    getMaxTechSlots() {
        const base = getTechSlots(this.realmIndex);
        const karmaSlots = this.prestige.karmaUpgrades.techSlots || 0;
        const freeLevel = this.getActiveBodyPerks().freeUpgradeLevel || 0;
        return base + karmaSlots + freeLevel;
    },

    equipTechnique(techId) {
        if (!this.hasTechnique(techId)) return false;
        if (this.isTechEquipped(techId)) return false;
        if (this.equippedTechniques.length >= this.getMaxTechSlots()) return false;
        this.equippedTechniques.push(techId);
        const tech = TECHNIQUES.find(t => t.id === techId);
        if (tech && tech.effects.timeSpeed) this.refreshTimers();
        return true;
    },

    unequipTechnique(techId) {
        const idx = this.equippedTechniques.indexOf(techId);
        if (idx === -1) return false;
        this.equippedTechniques.splice(idx, 1);
        const tech = TECHNIQUES.find(t => t.id === techId);
        if (tech && tech.effects.timeSpeed) this.refreshTimers();
        return true;
    },

    learnTechnique(techId) {
        if (this.hasTechnique(techId)) return false;
        const tech = TECHNIQUES.find(t => t.id === techId);
        if (!tech) return false;
        this.techniques.push(techId);
        this.techLevels[techId] = 1;
        this.techXP[techId] = 0;
        // Авто-экипировка если есть свободный слот
        if (this.equippedTechniques.length < this.getMaxTechSlots()) {
            this.equippedTechniques.push(techId);
        }
        if (tech.effects.timeSpeed && this.isTechEquipped(techId)) this.refreshTimers();
        return true;
    },

    getTechBonus(effectKey) {
        // Собираем бонусы от каждой техники, сортируем по убыванию
        const bonuses = [];
        for (const techId of this.equippedTechniques) {
            const tech = TECHNIQUES.find(t => t.id === techId);
            if (!tech || !tech.effects[effectKey]) continue;
            const level = this.techLevels[techId] || 1;
            const tierMult = TIER_MULTIPLIERS[tech.tier] || 1;
            let bonus = tech.effects[effectKey] * level * tierMult;
            if (tech.element && this.spiritualRoot && this.spiritualRoot.elements) {
                if (this.spiritualRoot.elements.includes(tech.element)) {
                    bonus *= 1.25;
                }
            }
            bonuses.push(bonus);
        }
        // Diminishing returns: 1-я техника 100%, 2-я 60%, 3-я 40%, 4-я 25%, 5-я+ 15%
        const TECH_STACK_WEIGHTS = [1.0, 0.6, 0.4, 0.25, 0.15];
        bonuses.sort((a, b) => b - a); // сильнейшая первая
        let total = 0;
        for (let i = 0; i < bonuses.length; i++) {
            const w = i < TECH_STACK_WEIGHTS.length ? TECH_STACK_WEIGHTS[i] : 0.15;
            total += bonuses[i] * w;
        }
        return total;
    },
});
