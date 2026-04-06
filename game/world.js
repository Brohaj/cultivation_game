// ============================================================
// GAME/WORLD.JS — Эпохи, мировые события, достижения, игровые события
// Зависит от: game/state.js, game/formulas.js, game/techniques.js
// ============================================================

Object.assign(game, {
    // === ЭПОХИ ===

    getCurrentEra() {
        let currentEra = ERAS[0];
        for (const era of ERAS) {
            if (this.years >= era.startYear) currentEra = era;
        }
        return currentEra;
    },

    // === МИРОВЫЕ СОБЫТИЯ ===

    checkWorldEvent() {
        if (this.worldEvent) {
            if (this.years >= this.worldEvent.startYear + this.worldEvent.duration) {
                addLog(`Мировое событие "${this.worldEvent.name}" завершилось.`, "system");
                this.worldEvent = null;
            }
            return;
        }
        if (this.years - this.lastWorldEventYear < 150) return;
        if (Math.random() > 0.03) return;

        const available = WORLD_EVENTS.filter(we => this.years >= we.minYear && (!we.minRealm || this.realmIndex >= we.minRealm));
        if (available.length === 0) return;

        const we = available[Math.floor(Math.random() * available.length)];
        this.worldEvent = {
            id: we.id,
            name: we.name,
            startYear: this.years,
            duration: we.duration,
            modifiers: { ...we.modifiers },
            color: we.color
        };
        this.lastWorldEventYear = this.years;
        addLog(`--- МИРОВОЕ СОБЫТИЕ: ${we.name} ---`, "breakthrough");
        addLog(we.description, "system");
        addLog(`Продлится ~${we.duration} лет.`, "system");
    },

    // === ДОСТИЖЕНИЯ ===

    checkMilestones() {
        // Трекинг: Глава Секты (rank 4) → перманентный маркер
        if (this.sect && this.getSectRankIndex() >= 4) {
            const key = "mastered_sect_" + this.sect.id;
            if (!this.prestige.permanentMilestones.includes(key)) {
                this.prestige.permanentMilestones.push(key);
            }
        }
        for (const m of MILESTONES) {
            if (this.milestones.includes(m.id)) continue;
            if (m.check(this)) {
                this.milestones.push(m.id);
                const isNew = !this.prestige.permanentMilestones.includes(m.id);
                // Добавить в перманентные
                if (isNew) {
                    this.prestige.permanentMilestones.push(m.id);
                }
                // Логировать только впервые полученные (не повторно в новой жизни)
                if (isNew) {
                    const tierInfo = MILESTONE_TIERS[m.tier] || MILESTONE_TIERS.bronze;
                    addLog(`${tierInfo.icon} "${m.name}"`, "breakthrough");
                }
            }
        }
    },

    // === СОБЫТИЯ ===

    triggerEvent() {
        if (this.gameOver) return;
        this._lastEventTime = Date.now();

        const era = this.getCurrentEra();

        const chainEvent = this.getChainEvent();
        if (chainEvent) {
            this.executeEvent(chainEvent);
            return;
        }

        // 50% шанс что события не будет (разгрузка лога)
        if (Math.random() < 0.50) return;

        // Пасхалки — редкие (5% шанс на проверку, потом выбор из доступных)
        if (Math.random() < 0.05) {
            const availableEnc = MANHUA_ENCOUNTERS.filter(enc => !enc.condition || enc.condition(this));
            if (availableEnc.length > 0) {
                const enc = availableEnc[Math.floor(Math.random() * availableEnc.length)];
                const logType = enc.type === "danger" ? "danger" : "event";
                addLog(enc.text, logType);
                const result = enc.effect(this);
                if (result) addLog(result, logType);
                this.checkMilestones();
                updateUI();
                return;
            }
        }

        const available = EVENTS.filter(e => !e.condition || e.condition(this));
        if (available.length === 0) return;

        const weighted = available.map(e => {
            let weight = 1;
            if (e.type === "danger") weight *= (era ? era.dangerWeight : 1);
            if (e.type === "reward") {
                weight *= (era ? era.rewardWeight : 1);
                // Удача увеличивает вес наградных событий
                weight *= (1 + this.luck * 0.01 + this.getTechBonus("luck") * 0.5);
            }
            if (this.worldEvent) {
                if (e.type === "danger" && this.worldEvent.modifiers.dangerWeight) {
                    weight *= this.worldEvent.modifiers.dangerWeight;
                }
                if (e.type === "reward" && this.worldEvent.modifiers.rewardWeight) {
                    weight *= this.worldEvent.modifiers.rewardWeight;
                }
            }
            return { event: e, weight };
        });

        const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
        let roll = Math.random() * totalWeight;
        let chosen = weighted[0].event;
        for (const w of weighted) {
            roll -= w.weight;
            if (roll <= 0) { chosen = w.event; break; }
        }

        this.executeEvent(chosen);
    },

    executeEvent(event) {
        // Запоминаем ресурсы для расчёта бонусов
        const savedStones = this.stones;
        const savedPills = this.pills;

        addLog(event.text, event.type);
        const result = event.effect(this);
        if (result) addLog(result, event.type === "danger" ? "danger" : "reward");

        // Общий бонус за опасные события (секта + техники + артефакты + формации + тело)
        if (event.type === "danger") {
            const dangerBonus = this.getSectBonus("dangerReward")
                + this.getArtifactBonus("dangerReward") * 0.01
                + this.getFormationBonus("dangerReward")
                + (this.getActiveBodyPerks().dangerReward || 0);
            if (dangerBonus > 0) {
                const gainedStones = this.stones - savedStones;
                const gainedPills = this.pills - savedPills;
                if (gainedStones > 0) {
                    const extraStones = Math.max(1, Math.floor(gainedStones * dangerBonus));
                    this.stones += extraStones;
                    addLog(`Бонус за опасность: +${extraStones} камней (+${Math.round(dangerBonus * 100)}%)`, "reward");
                }
                if (gainedPills > 0) {
                    const extraPills = Math.max(1, Math.floor(gainedPills * dangerBonus));
                    this.pills += extraPills;
                    addLog(`Бонус за опасность: +${extraPills} пилюль`, "reward");
                }
            }
        }

        // Бонус удачи к наградам (только для reward событий)
        if (event.type === "reward") {
            const luckBonus = this.luck * 0.01 + this.getTechBonus("luck");
            if (luckBonus > 0) {
                const extraStones = Math.floor((this.stones - savedStones) * luckBonus);
                const extraPills = Math.floor((this.pills - savedPills) * luckBonus);
                if (extraStones > 0) { this.stones += extraStones; addLog(`Удача: +${extraStones} камней`, "reward"); }
                if (extraPills > 0) { this.pills += extraPills; addLog(`Удача: +${extraPills} пилюль`, "reward"); }
            }
        }

        this.checkQiCap();
        this.checkMilestones();
        updateUI();
    },

    getChainEvent() {
        for (const chain of EVENT_CHAINS) {
            if (chain.condition && !chain.condition(this)) continue;
            if (chain.minYearsBetween) {
                const lastYear = this.flags[`${chain.chainId}_year`];
                if (lastYear && this.years - lastYear < chain.minYearsBetween) continue;
            }
            if (Math.random() < 0.3) {
                return chain;
            }
        }
        return null;
    },
});
