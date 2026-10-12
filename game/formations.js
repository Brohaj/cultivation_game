// ============================================================
// GAME/FORMATIONS.JS — Культивационные формации (выбор до 3)
// Сбрасываются при перерождении. Хранятся в game.formations / game.selectedFormations
// Зависит от: game/state.js, data/formations.js
// ============================================================

Object.assign(game, {

    // === ВЫБОР ФОРМАЦИЙ ===

    selectFormation(formationId) {
        const formation = CULT_FORMATIONS.find(f => f.id === formationId);
        if (!formation || this.gameOver) return false;

        // Проверка разблокировки через секту
        if (formation.sect && (!this.prestige.unlockedFormations || !this.prestige.unlockedFormations.includes(formationId))) {
            const sect = SECTS.find(s => s.id === formation.sect);
            addLog(`Формация "${formation.name}" заблокирована! Вступите в "${sect ? sect.name : 'секту'}" чтобы разблокировать.`, "danger");
            return false;
        }

        if (this.selectedFormations.includes(formationId)) {
            addLog("Эта формация уже выбрана!", "system");
            return false;
        }

        const karmaFormSlots = this.prestige.karmaUpgrades.formationSlot || 0;
        const eraFormSlots = this.getEraFormationSlotBonus();
        const maxSlots = MAX_FORMATION_SLOTS + (this.getActiveBodyPerks().formationSlots || 0) + karmaFormSlots + eraFormSlots;
        if (this.selectedFormations.length >= maxSlots) {
            addLog(`Можно выбрать не более ${maxSlots} формаций!`, "danger");
            return false;
        }

        this.selectedFormations.push(formationId);
        // Применить стартовый бонус уровней от тела
        const perks = this.getActiveBodyPerks();
        if (perks.formationBonus && !this.formations[formationId]) {
            this.formations[formationId] = Math.min(perks.formationBonus, formation.maxLevel);
        }
        addLog(`Формация "${formation.name}" активирована!`, "reward");
        updateUI();
        return true;
    },

    // Выбор формации окончательный — снять можно только через перерождение

    isFormationSelected(formationId) {
        return this.selectedFormations.includes(formationId);
    },

    // === УЛУЧШЕНИЕ ===

    getFormationUpgradeCost(formationId) {
        const formation = CULT_FORMATIONS.find(f => f.id === formationId);
        if (!formation) return Infinity;
        const level = this.formations[formationId] || 0;
        if (level >= formation.maxLevel) return Infinity;
        let cost = formation.baseCost + level * formation.costPerLevel;
        const perks = this.getActiveBodyPerks();
        if (perks.formationDiscount) {
            cost = Math.ceil(cost * (1 - perks.formationDiscount));
        }
        return cost;
    },

    buyFormation(formationId) {
        const formation = CULT_FORMATIONS.find(f => f.id === formationId);
        if (!formation || this.gameOver) return false;

        if (!this.isFormationSelected(formationId)) {
            addLog("Сначала выберите формацию!", "system");
            return false;
        }

        const level = this.formations[formationId] || 0;
        if (level >= formation.maxLevel) {
            addLog(`${formation.name} уже на максимальном уровне!`, "system");
            return false;
        }

        // Кап по текущему уровню Дао (любой путь)
        if (formation.sect) {
            const daoCap = this.daoLevel || 0;
            if (level >= daoCap) {
                const sect = SECTS.find(s => s.id === formation.sect);
                addLog(`Уровень Дао "${sect ? sect.name : 'секты'}" слишком низок! Макс уровень формации: ${daoCap}`, "danger");
                return false;
            }
        }

        const cost = this.getFormationUpgradeCost(formationId);
        if (this.stones < cost) {
            addLog(`Недостаточно камней! Нужно ${cost}.`, "danger");
            return false;
        }

        this.stones -= cost;
        this.formations[formationId] = level + 1;

        // Без лога в хрониках — видно в UI формации
        updateUI();
        return true;
    },


    // === БОНУСЫ ===

    getFormationBonus(effectKey) {
        let total = 0;
        for (const formation of CULT_FORMATIONS) {
            if (formation.effectKey !== effectKey) continue;
            if (!this.isFormationSelected(formation.id)) continue;
            const level = this.formations[formation.id] || 0;
            total += level * formation.effectPerLevel;
        }
        return total;
    },

    // Форматирование эффекта формации для UI
    _formatFormationEffect(formation, level) {
        const total = level * formation.effectPerLevel;
        if (formation.effectKey === "luck") {
            return `+${total} удача`;
        }
        if (formation.effectKey === "expeditionSpeed") {
            return `+${Math.round(total * 100)}% скорость экспедиций`;
        }
        if (formation.effectKey === "demonReduction") {
            return `-${Math.round(total * 100)}% шанс демона`;
        }
        if (formation.effectKey === "breakthroughBonus") {
            return `+${(total * 100).toFixed(1)}% шанс прорыва`;
        }
        return `+${Math.round(total * 100)}%`;
    },
});
