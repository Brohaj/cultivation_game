// ============================================================
// GAME/ADVENTURES.JS — Логика приключений: слухи, квесты, шаги, выбор
// Зависит от: game/state.js, data/adventures.js
// ============================================================

Object.assign(game, {
    // Общий resolver для проверки, превью и UI. Зависит только от контента
    // и уже принятых решений, не от текущих статов/реалма персонажа.
    getAdventureCheck(adv, choice, flags = {}) {
        const raw = typeof choice.check === "function" ? choice.check(flags) : choice.check;
        if (!raw) return raw;
        const budget = ADVENTURE_CHALLENGE_SCALING[adv.challengeRealm];
        if (!budget) return raw;
        const resolved = { ...raw };
        for (const key of ["strength", "spirit", "luck", "combatPower"]) {
            if (resolved[key]) resolved[key] = Math.ceil(resolved[key] * budget[key]);
        }
        return resolved;
    },

    // Временные условия выбранного занятия выводятся из уже сохраняемого этапа.
    // Несколько одинаковых условий не перемножаются: действует самое сильное.
    getAdventureMeditationMultiplier() {
        if (this.gameOver || this.pendingRebirth) return 1;
        let multiplier = 1;
        for (const adventure of this.activeAdventures || []) {
            if (!adventure || adventure.awaitingChoice || !(adventure.stepDuration > 0)) continue;
            const elapsed = this.years - adventure.stepStartYear;
            if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed >= adventure.stepDuration) continue;
            const adv = ADVENTURES.find(item => item.id === adventure.id);
            const history = adventure.completedSteps || [];
            const selected = adventure._pendingOutcome || history[history.length - 1];
            if (!adv || !selected || selected.stepIdx !== adventure.currentStep || selected.passed === false) continue;
            const step = adv.steps[selected.stepIdx];
            if (!step) continue;
            const choiceIdx = Number.isInteger(selected.choiceIdx)
                ? selected.choiceIdx
                : step.choices.findIndex(choice => choice.text === selected.choiceText || choice.legacyTexts?.includes(selected.choiceText));
            const effect = step.choices[choiceIdx]?.waitEffects?.meditationQiMultiplier;
            if (Number.isFinite(effect) && effect > multiplier) multiplier = effect;
        }
        return multiplier;
    },

    // === СЛУХИ ===

    _getAvailableAdventureRumors() {
        return ADVENTURES.filter(adv =>
            adv.rumorSource !== "story"
            && adv.condition(this)
            && !this.completedAdventures.includes(adv.id)
            && !this.adventureRumors.some(r => r.id === adv.id)
            && !this.activeAdventures.some(a => a.id === adv.id)
        );
    },

    _syncAdventureDiscovery() {
        if (!this.adventureDiscovery) {
            this.adventureDiscovery = { poolKey: "", waitYears: 0, lastCompleteYear: null };
        }
        const available = this._getAvailableAdventureRumors();
        const poolKey = available.length
            ? `${this.realmIndex}:${available.map(a => a.id).sort().join(",")}`
            : "";
        if (this.adventureDiscovery.poolKey !== poolKey) {
            this.adventureDiscovery.poolKey = poolKey;
            this.adventureDiscovery.waitYears = 0;
        }
        return available;
    },

    canDiscoverAdventureRumor(adventureId) {
        if (this.gameOver || this.pendingRebirth) return false;
        const available = this._syncAdventureDiscovery();
        if (!available.some(a => a.id === adventureId)) return false;
        if (this.adventureRumors.length || this.activeAdventures.length) return false;
        const lastComplete = this.adventureDiscovery.lastCompleteYear;
        if (lastComplete !== null && this.years - lastComplete < 50) return false;
        return this.adventureDiscovery.waitYears >= 3;
    },

    discoverAdventureRumor(adventureId) {
        if (!this.canDiscoverAdventureRumor(adventureId)) return false;
        return this.addAdventureRumor(adventureId);
    },

    // Единственный накопительный таймер слухов: только годы с доступными квестами.
    tickAdventureRumors() {
        const previousPool = this.adventureDiscovery ? this.adventureDiscovery.poolKey : "";
        const available = this._syncAdventureDiscovery();
        const discovery = this.adventureDiscovery;
        if (this.gameOver || this.pendingRebirth || !available.length
            || this.adventureRumors.length || this.activeAdventures.length
            || (discovery.lastCompleteYear !== null && this.years - discovery.lastCompleteYear < 50)) {
            discovery.waitYears = 0;
            return false;
        }
        // Новый реалм или пул не наследует ожидание от прежних условий.
        if (previousPool !== discovery.poolKey) return false;
        discovery.waitYears++;
        if (discovery.waitYears < 3) return false;
        const chance = Math.min(1, (discovery.waitYears - 2) * 0.01);
        if (Math.random() >= chance) return false;
        const adv = available[Math.floor(Math.random() * available.length)];
        if (!this.discoverAdventureRumor(adv.id)) return false;
        addLog(`До вас дошёл слух: "${adv.rumor}"`, "event");
        return true;
    },

    addAdventureRumor(adventureId) {
        const adv = ADVENTURES.find(a => a.id === adventureId);
        if (!adv || !adv.condition(this)) return false;
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
        if (this.adventureDiscovery) this.adventureDiscovery.waitYears = 0;
        return true;
    },

    // === ПРИНЯТЬ ПРИКЛЮЧЕНИЕ ===

    acceptAdventure(adventureId) {
        if (this.activeAdventures.length >= 1) return false;
        const rumorIdx = this.adventureRumors.findIndex(r => r.id === adventureId);
        if (rumorIdx === -1) return false;

        const adv = ADVENTURES.find(a => a.id === adventureId);
        if (!adv || !adv.condition(this) || this.completedAdventures.includes(adventureId)) return false;

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

        // Стоимость может зависеть от сведений, полученных на предыдущем шаге.
        const cost = typeof choice.cost === "function" ? choice.cost(adventure.flags) : choice.cost;
        if (cost) {
            if (cost.stones && this.stones < cost.stones) return false;
            if (cost.essence && this.daoEssence < cost.essence) return false;
            if (cost.pills && this.pills < cost.pills) return false;
            if (cost.dust && this.artifactDust < cost.dust) return false;
        }

        // Проверить check (может быть объектом или функцией от флагов)
        let passed = true;
        const check = this.getAdventureCheck(adv, choice, adventure.flags);
        if (check) {
            if (check.strength && this.strength + this.getArtifactBonus("strength") < check.strength) passed = false;
            if (check.spirit && this.spirit + this.getArtifactBonus("spirit") < check.spirit) passed = false;
            if (check.luck && this.luck + this.getArtifactBonus("luck") < check.luck) passed = false;
            if (check.combatPower && this.getCombatPower() < check.combatPower) passed = false;
            if (check.hasSect && !this.sect) passed = false;
            // Проверка флага
            if (check.flag && !adventure.flags[check.flag]) {
                // Альтернативный флаг заменяет только этот флаг, а не остальные проверки.
                if (!choice.altCheck?.flag || !adventure.flags[choice.altCheck.flag]) {
                    passed = false;
                }
            }
        }

        const outcome = passed ? choice.success : choice.fail;
        if (!outcome) return false; // Нет fail-ветки = нельзя провалить

        // Списать стоимость только после того, как найден допустимый исход.
        if (cost) {
            if (cost.stones) this.stones -= cost.stones;
            if (cost.essence) this.daoEssence -= cost.essence;
            if (cost.pills) this.pills -= cost.pills;
            if (cost.dust) this.artifactDust -= cost.dust;
        }

        // Ветку с наградами сохраняем ссылкой на данные: функции не переживают JSON-сейв.
        if (outcome.rewards) {
            adventure._pendingOutcome = {
                stepIdx: adventure.currentStep,
                choiceIdx: choiceIdx,
                passed: passed
            };
        } else if (outcome.effect) {
            const stepResults = [];
            outcome.effect(this, adventure.flags, stepResults);
            if (stepResults.length > 0) addLog(`Награды: ${stepResults.join(", ")}`, "reward");
        }

        // Установить флаг
        if (outcome.flag) {
            adventure.flags[outcome.flag] = true;
        }

        // Сохранить историю шага
        adventure.completedSteps.push({
            stepIdx: adventure.currentStep,
            choiceIdx: choiceIdx,
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
        const isFinalReward = outcome.rewards && outcome.nextStep === undefined;
        // Ascend-приключения: финальный шаг = 20 лет исследования
        if ((adventure.id.startsWith("ascend_") || adventure.id.startsWith("ascend2_")) && isFinalReward && dur === 0) dur = 20;
        if (outcome.rewards) {
            adventure._pendingRewards = typeof outcome.rewards === "function"
                ? outcome.rewards(adventure.flags)
                : outcome.rewards;
        }
        adventure.awaitingChoice = false;
        adventure.stepDuration = dur;
        adventure.stepStartYear = this.years;
        if (isFinalReward) {
            adventure._finalStep = true;
            if (dur === 0) this._completeAdventure(adventureIdx);
        } else if (outcome.nextStep !== undefined) {
            adventure._nextStep = outcome.nextStep;
            if (dur === 0) this._advanceAdventureStep(adventureIdx, false);
        }

        updateUI();
        return true;
    },

    // === ТИК (из passYear) ===

    tickAdventures() {
        // Истечение слухов (100 лет)
        this.adventureRumors = this.adventureRumors.filter(r => {
            const adv = ADVENTURES.find(a => a.id === r.id);
            if (!adv || !adv.condition(this) || this.completedAdventures.includes(r.id)) return false;
            if (this.years - r.appearedYear >= 100 && !r.id.startsWith("ascend")) {
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

    _advanceAdventureStep(idx, announce = true) {
        const adventure = this.activeAdventures[idx];
        if (!adventure || adventure._nextStep === undefined) return;

        const adv = ADVENTURES.find(a => a.id === adventure.id);
        const outcome = adv ? this._getAdventureRewardOutcome(adventure, adv) : null;
        const rewards = adventure._pendingRewards || (outcome
            ? (typeof outcome.rewards === "function" ? outcome.rewards(adventure.flags) : outcome.rewards)
            : null);

        // Погасить переход и награды до эффектов: повторный тик не выдаст их ещё раз.
        adventure.currentStep = adventure._nextStep;
        delete adventure._nextStep;
        delete adventure._pendingOutcome;
        delete adventure._pendingRewards;
        delete adventure._pendingEffect;
        delete adventure._finalStep;
        adventure.stepDuration = 0;

        if (rewards) {
            const results = this._grantAdventureRewards(rewards, adventure, outcome);
            if (results.length > 0) addLog(`Награды: ${results.join(", ")}`, "reward");
            this.checkMilestones();
        }
        adventure.awaitingChoice = true;
        if (adv && announce) {
            addLog(`${adv.name}: новый этап приключения!`, "event");
        }
        updateUI();
    },

    // === ЗАВЕРШЕНИЕ ===

    hasClaimedLiuSword() {
        if (this.flags.liu_sword_claimed) return true;
        // В старых сейвах нет общего флага. Стадия цепочки и завершённый
        // квест относятся к текущей жизни, даже если меч уже разобран.
        const legacyClaim = (this.flags.sect_crisis_step || 0) >= 3
            || this.completedAdventures.includes("elder_betrayal")
            || this.artifacts.some(art =>
                (art.uniqueReward === "liu_sword" || ["Меч Старейшины Лю", "Очищенный Меч Лю"].includes(art.name))
                && (art.rewardBirthYear === undefined || art.rewardBirthYear === this.birthYear)
            );
        if (legacyClaim) this.flags.liu_sword_claimed = true;
        return legacyClaim;
    },

    grantLiuSword(purified = false, results) {
        if (this.hasClaimedLiuSword()) return null;
        const sword = this.generateArtifact("rare", "weapon");
        if (!sword) return null;
        sword.name = purified ? "Очищенный Меч Лю" : "Меч Старейшины Лю";
        sword.uniqueReward = "liu_sword";
        sword.rewardBirthYear = this.birthYear;
        if (!this.addArtifact(sword)) return null;
        this.flags.liu_sword_claimed = true;
        if (results) results.push(`артефакт: ${sword.name}`);
        return sword;
    },

    _getAdventureRewardOutcome(adventure, adv) {
        // Старые сейвы не содержат ссылки, но сохраняют текст выбора и результат проверки.
        const history = adventure.completedSteps || [];
        const selected = adventure._pendingOutcome || history[history.length - 1];
        if (!selected) return null;
        const step = adv.steps[selected.stepIdx];
        if (!step) return null;
        const choiceIdx = Number.isInteger(selected.choiceIdx)
            ? selected.choiceIdx
            : step.choices.findIndex(c => c.text === selected.choiceText || c.legacyTexts?.includes(selected.choiceText));
        const choice = step.choices[choiceIdx];
        if (!choice) return null;
        const outcome = selected.passed === false ? choice.fail : choice.success;
        return outcome && outcome.rewards ? outcome : null;
    },

    _grantAdventureRewards(rewards, adventure, outcome) {
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
            const unlearned = this.getRewardTechniquePool();
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

        // Эффект выбранной ветки
        if (outcome && outcome.effect) {
            outcome.effect(this, adventure.flags, results);
        }
        return results;
    },

    _completeAdventure(idx) {
        const adventure = this.activeAdventures[idx];
        if (!adventure) return;

        const adv = ADVENTURES.find(a => a.id === adventure.id);
        if (!adv) {
            this.activeAdventures.splice(idx, 1);
            return;
        }

        const outcome = this._getAdventureRewardOutcome(adventure, adv);
        // Старый сейв мог пометить промежуточный выбор как финал до исправления данных.
        if (outcome && outcome.nextStep !== undefined) {
            adventure._nextStep = outcome.nextStep;
            this._advanceAdventureStep(idx);
            return;
        }

        // Удаляем до вызова эффектов, чтобы повторный тик не выдал награды второй раз.
        this.activeAdventures.splice(idx, 1);
        if (this.completedAdventures && this.completedAdventures.includes(adv.id)) return;

        const rewards = adventure._pendingRewards || (outcome
            ? (typeof outcome.rewards === "function" ? outcome.rewards(adventure.flags) : outcome.rewards)
            : {});
        const results = this._grantAdventureRewards(rewards, adventure, outcome);

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
        this.adventureDiscovery = { poolKey: "", waitYears: 0, lastCompleteYear: this.years };

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
