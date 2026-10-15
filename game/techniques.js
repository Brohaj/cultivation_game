// ============================================================
// GAME/TECHNIQUES.JS — Управление техниками (слоты)
// Только экипированные техники дают бонусы и качаются
// Зависит от: game/state.js, data/core.js (getTechSlots)
// ============================================================

// Силовые бонусы растут быстрее поддержки: процентные пункты шанса,
// скорость обучения и время не должны повторять масштаб боевой мощи.
const TECH_POWER_TIER_MULTIPLIERS = {
    common: 1, uncommon: 1.5, rare: 2, epic: 2.75, legendary: 3.5, divine: 4.5,
};
const TECH_SUPPORT_TIER_MULTIPLIERS = {
    common: 1, uncommon: 1.25, rare: 1.5, epic: 1.8, legendary: 2.1, divine: 2.5,
};
const TECH_POWER_EFFECTS = new Set(["qi", "combatPower", "strength", "spirit", "statXpSpeed"]);

Object.assign(game, {
    getTechniqueTierMultiplier(tier, effectKey) {
        const curve = TECH_POWER_EFFECTS.has(effectKey)
            ? TECH_POWER_TIER_MULTIPLIERS : TECH_SUPPORT_TIER_MULTIPLIERS;
        return curve[tier] || 1;
    },

    // Общий расчёт для игрового эффекта и карточки техники.
    getTechniqueEffectBonus(techOrId, effectKey, level = null) {
        const tech = typeof techOrId === "string" ? TECHNIQUES.find(t => t.id === techOrId) : techOrId;
        if (!tech || !tech.effects[effectKey]) return 0;
        const effectiveLevel = level ?? this.techLevels[tech.id] ?? 1;
        let bonus = tech.effects[effectKey] * effectiveLevel * this.getTechniqueTierMultiplier(tech.tier, effectKey);
        if (tech.element && this.spiritualRoot?.elements?.includes(tech.element)) bonus *= 1.25;
        return bonus;
    },
    hasTechnique(techId) {
        return this.techniques.includes(techId);
    },

    getRewardTechniquePool(tiers = null) {
        // Эксклюзивные техники выдаёт их собственный источник, а не случайный свиток.
        return TECHNIQUES.filter(tech =>
            !this.hasTechnique(tech.id)
            && !["sect", "body", "adventure"].includes(tech.source)
            && (!tiers || tiers.includes(tech.tier))
            && this.realmIndex >= (tech.requirement?.realm ?? 0)
        );
    },

    isTechEquipped(techId) {
        return this.equippedTechniques.includes(techId);
    },

    getMaxTechSlots() {
        const base = getTechSlots(this.realmIndex);
        const karmaSlots = this.prestige.karmaUpgrades.techSlots || 0;
        const freeLevel = this.getActiveBodyPerks().freeUpgradeLevel || 0;
        const eraBonus = this.getEraTechSlotBonus();
        return base + karmaSlots + freeLevel + eraBonus;
    },

    equipTechnique(techId) {
        if (this.gameOver || this.pendingRebirth) return false;
        if (!this.hasTechnique(techId)) return false;
        if (this.isTechEquipped(techId)) return false;
        if (this.equippedTechniques.length >= this.getMaxTechSlots()) return false;
        this.equippedTechniques.push(techId);
        const tech = TECHNIQUES.find(t => t.id === techId);
        if (tech && tech.effects.timeSpeed) this.refreshTimers();
        return true;
    },

    unequipTechnique(techId) {
        if (this.gameOver || this.pendingRebirth) return false;
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
            bonuses.push(this.getTechniqueEffectBonus(tech, effectKey));
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
