// ============================================================
// GAME/ADVENTURES.JS — Логика приключений: слухи, квесты, шаги, выбор
// Зависит от: game/state.js, data/adventures.js
// ============================================================

Object.assign(game, {
    // === СЛУХИ ===

    addAdventureRumor(adventureId) {
        const adv = ADVENTURES.find(a => a.id === adventureId);
        if (!adv) return false;
        // Не дублировать
        if (this.adventureRumors.find(r => r.id === adventureId)) return false;
        if (this.activeAdventures.find(a => a.id === adventureId)) return false;
        // Одноразовые — не давать повторно завершённые
        if (this.completedAdventures && this.completedAdventures.includes(adventureId)) return false;
        if (this.adventureRumors.length >= 5) return false;

        this.adventureRumors.push({
            id: adventureId,
            appearedYear: this.years
        });
        return true;
    },

    // === ПРИНЯТЬ ПРИКЛЮЧЕНИЕ ===

    acceptAdventure(adventureId) {
        if (this.activeAdventures.length >= 1) return false;
        const rumorIdx = this.adventureRumors.findIndex(r => r.id === adventureId);
        if (rumorIdx === -1) return false;

        const adv = ADVENTURES.find(a => a.id === adventureId);
        if (!adv) return false;

        // Стоимость входа (для приключений вознесения)
        if (adv.ascendCost) {
            const c = adv.ascendCost;
            if ((c.stones && this.stones < c.stones) || (c.essence && this.daoEssence < c.essence) || (c.dust && this.artifactDust < c.dust)) {
                addLog("Недостаточно ресурсов для этого приключения.", "danger");
                return false;
            }
            if (c.stones) this.stones -= c.stones;
            if (c.essence) this.daoEssence -= c.essence;
            if (c.dust) this.artifactDust -= c.dust;
            const parts = [];
            if (c.stones) parts.push(`-${c.stones} камней`);
            if (c.essence) parts.push(`-${c.essence} эссенции`);
            if (c.dust) parts.push(`-${c.dust} пыли`);
            addLog(`Подготовка к испытанию: ${parts.join(", ")}`, "system");
        }

        // Удалить слух
        this.adventureRumors.splice(rumorIdx, 1);

        // Создать активное приключение (сразу ждёт выбора на шаге 0)
        this.activeAdventures.push({
            id: adventureId,
            currentStep: 0,
            stepStartYear: this.years,
            stepDuration: 0,
            flags: {},
            awaitingChoice: true,
            completedSteps: []
        });

        addLog(`Приключение начато: "${adv.name}"!`, "breakthrough");
        updateUI();
        return true;
    },

    // === ВЫБОР НА ШАГЕ ===

    chooseAdventureOption(adventureIdx, choiceIdx) {
        const adventure = this.activeAdventures[adventureIdx];
        if (!adventure || !adventure.awaitingChoice) return false;

        const adv = ADVENTURES.find(a => a.id === adventure.id);
        if (!adv) return false;

        const step = adv.steps[adventure.currentStep];
        if (!step) return false;

        const choice = step.choices[choiceIdx];
        if (!choice) return false;

        // Проверить стоимость
        if (choice.cost) {
            if (choice.cost.stones && this.stones < choice.cost.stones) return false;
            if (choice.cost.essence && this.daoEssence < choice.cost.essence) return false;
            if (choice.cost.pills && this.pills < choice.cost.pills) return false;
            if (choice.cost.dust && this.artifactDust < choice.cost.dust) return false;
        }

        // Списать стоимость
        if (choice.cost) {
            if (choice.cost.stones) this.stones -= choice.cost.stones;
            if (choice.cost.essence) this.daoEssence -= choice.cost.essence;
            if (choice.cost.pills) this.pills -= choice.cost.pills;
            if (choice.cost.dust) this.artifactDust -= choice.cost.dust;
        }

        // Проверить check (может быть объектом или функцией от флагов)
        let passed = true;
        const check = typeof choice.check === "function" ? choice.check(adventure.flags) : choice.check;
        if (check) {
            if (check.strength && this.strength + this.getArtifactBonus("strength") < check.strength) passed = false;
            if (check.spirit && this.spirit + this.getArtifactBonus("spirit") < check.spirit) passed = false;
            if (check.luck && this.luck + this.getArtifactBonus("luck") < check.luck) passed = false;
            if (check.combatPower && this.getCombatPower() < check.combatPower) passed = false;
            if (check.hasSect && !this.sect) passed = false;
            // Проверка флага
            if (check.flag && !adventure.flags[check.flag]) {
                // Попробовать altCheck
                if (choice.altCheck && choice.altCheck.flag && adventure.flags[choice.altCheck.flag]) {
                    passed = true;
                } else {
                    passed = false;
                }
            }
        }

        const outcome = passed ? choice.success : choice.fail;
        if (!outcome) return false; // Нет fail-ветки = нельзя провалить

        // Применить эффект: если финальный шаг с rewards — отложить до _completeAdventure
        if (outcome.effect) {
            if (outcome.rewards) {
                adventure._pendingEffect = outcome.effect;
            } else {
                outcome.effect(this, adventure.flags);
            }
        }

        // Установить флаг
        if (outcome.flag) {
            adventure.flags[outcome.flag] = true;
        }

        // Сохранить историю шага
        adventure.completedSteps.push({
            stepIdx: adventure.currentStep,
            choiceText: choice.text,
            passed: passed,
            failText: (!passed && outcome.failText) ? outcome.failText : null
        });

        // Лог
        addLog(`${adv.name}: ${choice.text}`, "event");
        if (!passed && outcome.failText) {
            addLog(outcome.failText, "danger");
        }

        // Определить следующее состояние
        let dur = choice.duration || 0;
        // Ascend-приключения: финальный шаг = 20 лет исследования
        if (adventure.id.startsWith("ascend_") && outcome.rewards && dur === 0) dur = 20;
        if (outcome.rewards) {
            // Финальный шаг
            if (dur === 0) {
                // Мгновенное завершение
                adventure._pendingRewards = typeof outcome.rewards === "function"
                    ? outcome.rewards(adventure.flags)
                    : outcome.rewards;
                adventure._finalStep = true;
                const idx = this.activeAdventures.indexOf(adventure);
                if (idx >= 0) this._completeAdventure(idx);
            } else {
                adventure.awaitingChoice = false;
                adventure.stepDuration = dur;
                adventure.stepStartYear = this.years;
                adventure._pendingRewards = typeof outcome.rewards === "function"
                    ? outcome.rewards(adventure.flags)
                    : outcome.rewards;
                adventure._finalStep = true;
            }
        } else if (outcome.nextStep !== undefined) {
            if (dur === 0) {
                // Мгновенный переход к следующему шагу (без лога — игрок видит новый выбор сразу)
                adventure.currentStep = outcome.nextStep;
                adventure.awaitingChoice = true;
                adventure.stepDuration = 0;
            } else {
                adventure.awaitingChoice = false;
                adventure.stepDuration = dur;
                adventure.stepStartYear = this.years;
                adventure._nextStep = outcome.nextStep;
            }
        }

        updateUI();
        return true;
    },

    // === ТИК (из passYear) ===

    tickAdventures() {
        // Истечение слухов (100 лет)
        this.adventureRumors = this.adventureRumors.filter(r => {
            if (this.years - r.appearedYear >= 100 && !r.id.startsWith("ascend")) {
                const adv = ADVENTURES.find(a => a.id === r.id);
                if (adv) addLog(`Слух о "${adv.name}" развеялся...`, "system");
                return false;
            }
            return true;
        });

        // Тик активных приключений
        for (let i = this.activeAdventures.length - 1; i >= 0; i--) {
            const adventure = this.activeAdventures[i];
            if (adventure.awaitingChoice) continue; // Ждём решения игрока

            const elapsed = this.years - adventure.stepStartYear;
            if (elapsed >= adventure.stepDuration) {
                if (adventure._finalStep) {
                    this._completeAdventure(i);
                } else if (adventure._nextStep !== undefined) {
                    this._advanceAdventureStep(i);
                }
            }
        }
    },

    _advanceAdventureStep(idx) {
        const adventure = this.activeAdventures[idx];
        if (!adventure) return;

        adventure.currentStep = adventure._nextStep;
        delete adventure._nextStep;
        adventure.awaitingChoice = true;
        adventure.stepDuration = 0;

        const adv = ADVENTURES.find(a => a.id === adventure.id);
        if (adv) {
            addLog(`${adv.name}: новый этап приключения!`, "event");
        }
        updateUI();
    },

    // === ЗАВЕРШЕНИЕ ===

    _completeAdventure(idx) {
        const adventure = this.activeAdventures[idx];
        if (!adventure) return;

        const adv = ADVENTURES.find(a => a.id === adventure.id);
        if (!adv) {
            this.activeAdventures.splice(idx, 1);
            return;
        }

        const rewards = adventure._pendingRewards || {};
        const results = [];

        // Камни
        if (rewards.stones && rewards.stones.max > 0) {
            const base = rewards.stones.min + Math.random() * (rewards.stones.max - rewards.stones.min);
            const amount = Math.floor(base * (1 + this.realmIndex * 0.2));
            this.stones += amount;
            results.push(`+${amount} камней`);
        }
        if (rewards.bonusStones) {
            this.stones += rewards.bonusStones;
            results.push(`+${rewards.bonusStones} бонус камней`);
        }

        // Эссенция
        if (rewards.essence && rewards.essence.max > 0) {
            const base = rewards.essence.min + Math.random() * (rewards.essence.max - rewards.essence.min);
            const amount = Math.floor(base);
            this.daoEssence += amount;
            results.push(`+${amount} эссенции`);
        }

        // Пилюли
        if (rewards.pills && rewards.pills.max > 0) {
            const base = rewards.pills.min + Math.random() * (rewards.pills.max - rewards.pills.min);
            const amount = Math.floor(base);
            if (amount > 0) {
                this.pills += amount;
                results.push(`+${amount} пилюль`);
            }
        }

        // Пыль артефактов
        if (rewards.dust && rewards.dust.max > 0) {
            const base = rewards.dust.min + Math.random() * (rewards.dust.max - rewards.dust.min);
            const amount = Math.floor(base);
            if (amount > 0) {
                this.artifactDust += amount;
                results.push(`+${amount} пыли`);
            }
        }

        // Артефакт
        if (rewards.artifactChance && Math.random() < rewards.artifactChance) {
            const tierOrder = ["common", "uncommon", "rare", "epic", "legendary", "divine"];
            let minTier = rewards.artifactMinTier || null;
            let art;
            if (minTier) {
                const minIdx = tierOrder.indexOf(minTier);
                let tier = this._rollArtifactTier();
                const rolledIdx = tierOrder.indexOf(tier);
                if (rolledIdx < minIdx) tier = minTier;
                art = this.generateArtifact(tier);
            } else {
                art = this.generateArtifact();
            }
            if (art && this.addArtifact(art)) {
                results.push(`артефакт: ${art.name}`);
            }
        }

        // Техника
        if (rewards.techniqueChance && Math.random() < rewards.techniqueChance) {
            const unlearned = TECHNIQUES.filter(t =>
                !this.hasTechnique(t.id) &&
                t.source !== "sect" && t.source !== "body" && t.source !== "adventure" &&
                (!t.requirement || !t.requirement.realm || this.realmIndex >= t.requirement.realm)
            );
            if (unlearned.length > 0) {
                const tech = unlearned[Math.floor(Math.random() * unlearned.length)];
                this.learnTechnique(tech.id);
                results.push(`техника: ${tech.name}`);
            }
        }

        // Свиток
        if (rewards.scrollChance && Math.random() < rewards.scrollChance) {
            const added = this.addDaoScroll(1);
            if (added > 0) results.push(`+1 Свиток Воли Дао`);
        }

        // Вклад секты
        if (rewards.contribution && this.sect) {
            this.sect.contribution += rewards.contribution;
            results.push(`+${rewards.contribution} вклад секты`);
        }

        // Бонус статов
        if (rewards.bonusStats) {
            if (rewards.bonusStats.strength) { this.strength += rewards.bonusStats.strength; results.push(`+${rewards.bonusStats.strength} сила`); }
            if (rewards.bonusStats.spirit) { this.spirit += rewards.bonusStats.spirit; results.push(`+${rewards.bonusStats.spirit} дух`); }
            if (rewards.bonusStats.luck) { this.luck += rewards.bonusStats.luck; results.push(`+${rewards.bonusStats.luck} удача`); }
        }

        // Финальный эффект
        if (adventure._pendingEffect) {
            adventure._pendingEffect(this, results);
        }

        // Дао прогресс от приключения (+5-15%)
        if (this.realmIndex >= 3 && this.sect) {
            const daoSpeedBonus = this.getDaoSpeedMultiplier();
            const daoGain = this.daoNeeded() * (0.05 + Math.random() * 0.10) * daoSpeedBonus;
            this.daoProgress += daoGain;
            this._checkDaoLevelUp();
            results.push(`+${Math.floor(daoGain)} постижение Дао`);
        }

        addLog(`Приключение "${adv.name}" завершено!`, "breakthrough");
        if (results.length > 0) {
            addLog(`Награды: ${results.join(", ")}`, "reward");
        }

        this.lastAdventureReward = {
            id: adv.id,
            name: adv.name,
            rewards: results.slice(),
            year: this.years
        };

        // Кулдаун для pity-системы
        this._lastAdventureCompleteYear = this.years;

        // Одноразовое — запомнить завершённое (текущая жизнь + перманентно)
        if (!this.completedAdventures) this.completedAdventures = [];
        if (!this.completedAdventures.includes(adv.id)) {
            this.completedAdventures.push(adv.id);
        }
        const advKey = "completed_adventure_" + adv.id;
        if (!this.prestige.permanentMilestones.includes(advKey)) {
            this.prestige.permanentMilestones.push(advKey);
        }
        // Счётчик общих завершений (с повторами, за все жизни)
        this.prestige.totalAdventures = (this.prestige.totalAdventures || 0) + 1;

        this.activeAdventures.splice(idx, 1);
        this.checkMilestones();
        updateUI();
    },

    // === ОТКАЗ ===

    abandonAdventure(idx) {
        const adventure = this.activeAdventures[idx];
        if (!adventure) return false;

        const adv = ADVENTURES.find(a => a.id === adventure.id);
        addLog(`Приключение "${adv ? adv.name : "???"}" прервано.`, "system");
        this.activeAdventures.splice(idx, 1);
        updateUI();
        return true;
    }
});
