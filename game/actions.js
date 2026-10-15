// ============================================================
// GAME/ACTIONS.JS — Действия игрока: медитация, прорыв, активности, магазин
// Зависит от: game/state.js, game/formulas.js, game/techniques.js
// ============================================================

Object.assign(game, {
    // === АКТИВНОСТИ ===

    setActivity(activity) {
        if (this.gameOver || this.pendingRebirth) return;
        const stoppedPlan = !!this.practicePlan?.enabled;
        if (stoppedPlan) this.practicePlan.enabled = false;
        this.currentActivity = activity;
        if (stoppedPlan) saveGame();
        const names = {
            meditation: "Медитация",
            body: "Закалка Тела",
            dao: "Постижение Дао",
            fate: "Испытание Судьбы"
        };
        // Без лога — видно в UI (подсветка активной кнопки)
        updateUI();
    },

    // === ПРОВЕРКА УРОВНЯ СТАТА ===

    _checkStatLevelUp(stat) {
        let leveled = false;
        while (this.activityXP[stat] >= this.statXpNeeded(stat)) {
            this.activityXP[stat] -= this.statXpNeeded(stat);
            this[stat] += 1;
            leveled = true;
        }
        if (leveled) updateUI();
    },

    checkQiCap() {
        const needed = this.qiNeeded();
        if (needed !== Infinity && this.qi > needed) this.qi = needed;
    },

    canBreakthrough() {
        return !this.gameOver && !this.pendingRebirth && this.qi >= this.qiNeeded() && this.realmIndex < REALMS.length - 1;
    },

    // breakthrough() возвращает результат для UI-анимации
    // { result: "success"|"great"|"fail"|"demon"|"blocked", ... }
    breakthrough() {
        if (!this.canBreakthrough()) return { result: "none" };

        // Проверяем доступ до броска шанса и любых потерь ресурсов.
        // Каждый прорыв с реалма 3 требует ещё одного уровня Дао.
        if (this.realmIndex >= 3) {
            if (!this.sect) {
                addLog(`Для прорыва необходимо вступить в секту и постичь Дао!`, "danger");
                saveGame();
                updateUI();
                return { result: "blocked" };
            }
            const breakthroughsSinceDao = (this.realmIndex - 3) * SUB_LEVELS + (this.subLevel - 1);
            const requiredDao = breakthroughsSinceDao + 1;
            if (this.daoLevel < requiredDao) {
                addLog(`Постижение Дао недостаточно! Уровень: ${this.daoLevel}, нужно: ${requiredDao}`, "danger");
                saveGame();
                updateUI();
                return { result: "blocked" };
            }
        }

        if (this.subLevel === SUB_LEVELS) {
            const nextRealm = this.realmIndex + 1;
            if (!this.meetsRealmRequirement(nextRealm)) {
                const req = this.getRealmPrestigeRequirement(nextRealm);
                addLog(`Небесный Барьер! Для входа в "${REALMS[nextRealm].name}" требуется:`, "danger");
                if (req.rebirths) addLog(`  Зачётных жизней: ${this.getQualifiedRebirths()}/${req.rebirths}`, "danger");
                if (req.karma) {
                    const totalKarma = this.prestige.karma + this._getTotalKarmaSpent();
                    addLog(`  Карма (всего): ${totalKarma}/${req.karma}`, "danger");
                }
                addLog("Ци сохранена. Накопите опыт через перерождения.", "system");
                saveGame();
                updateUI();
                return { result: "blocked" };
            }
        }

        if (this.realmIndex >= 3) {
            const successChance = this.getBreakthroughChance();
            // Сброс бонуса духовной пилюли (расходуется при попытке)
            if (this.flags._pillBreakthroughBonus) delete this.flags._pillBreakthroughBonus;
            if (Math.random() > successChance) {
                // Потеря ци и дао (100%, удержание смягчает)
                const qiRetention = this.getQiRetention();
                const loss = Math.floor(this.qi * (1 - qiRetention));
                this.qi = Math.max(0, this.qi - loss);
                // Потеря прогресса Дао (100%, удержание смягчает)
                if (this.daoProgress > 0) {
                    const daoLoss = Math.floor(this.daoProgress * (1 - qiRetention));
                    this.daoProgress = Math.max(0, this.daoProgress - daoLoss);
                    if (daoLoss > 0) addLog(`-${daoLoss} постижение Дао.${qiRetention > 0 ? ` (удержание: ${Math.round(qiRetention * 100)}%)` : ""}`, "danger");
                }
                this.flags.failedBreakthrough = true;
                if (!this.flags.breakthroughFails) this.flags.breakthroughFails = {};
                this.flags.breakthroughFails[this.realmIndex] = (this.flags.breakthroughFails[this.realmIndex] || 0) + 1;
                addLog("Прорыв провалился! Ци хлынула обратно.", "danger");
                addLog(`-${loss} ци.${qiRetention > 0 ? ` (удержание: ${Math.round(qiRetention * 100)}%)` : ""}`, "danger");

                // Потеря статов на высоких реалмах (qiRetention может защитить)
                if (this.realmIndex >= 7) {
                    const statLoss = this.realmIndex >= 10 ? 2 : 1;
                    if (qiRetention > 0 && Math.random() < qiRetention) {
                        addLog("Удержание ци смягчило откат — статы сохранены!", "system");
                    } else {
                        if (this.strength > statLoss) {
                            this.strength -= statLoss;
                            addLog(`-${statLoss} сила от отката энергии.`, "danger");
                        }
                        if (this.spirit > statLoss) {
                            this.spirit -= statLoss;
                            addLog(`-${statLoss} дух от отката энергии.`, "danger");
                        }
                    }
                }

                // Внутренний демон — катастрофический откат реалмов
                const demonChance = this.getEffectiveDemonChance();
                let demonTriggered = false;
                if (demonChance > 0 && Math.random() < demonChance) {
                    // Failsafe: раз в жизнь демон отражается автоматически
                    if (!this.flags.demonFailsafeUsed) {
                        this.flags.demonFailsafeUsed = true;
                        addLog(`🛡 Внутренний демон попытался поглотить ваш разум... но скрытая воля оттолкнула его!`, "event");
                        addLog(`Защитный инстинкт сработал — но больше такого не повторится.`, "system");
                    } else {
                    const maxLoss = this.getDemonRealmLoss();
                    const actualLoss = Math.min(maxLoss, this.realmIndex);
                    if (actualLoss > 0) {
                        demonTriggered = true;
                        const oldRealm = REALMS[this.realmIndex].name;
                        this.realmIndex -= actualLoss;
                        this.subLevel = 1;
                        this.qi = 0;
                        // Демон жрёт статы
                        const bodyPerks = this.getActiveBodyPerks();
                        const strBefore = this.strength;
                        const sprBefore = this.spirit;
                        const lckBefore = this.luck;
                        const demonPctLoss = bodyPerks.demonStatPct || 0;
                        if (demonPctLoss > 0) {
                            // Пакт с Демоном: процентная потеря статов
                            this.strength = Math.max(1, Math.floor(this.strength * (1 - demonPctLoss)));
                            this.spirit = Math.max(1, Math.floor(this.spirit * (1 - demonPctLoss)));
                            this.luck = Math.max(1, Math.floor(this.luck * (1 - demonPctLoss)));
                        } else {
                            // Обычная потеря: чем выше ступень, тем больше
                            const demonStatLoss = Math.min(Math.floor(actualLoss * 1.5) + 1, 6);
                            this.strength = Math.max(1, this.strength - demonStatLoss);
                            this.spirit = Math.max(1, this.spirit - demonStatLoss);
                            this.luck = Math.max(1, this.luck - demonStatLoss);
                        }
                        const newRealm = REALMS[this.realmIndex].name;
                        // Текст демона зависит от пути Дао
                        const demonSect = this.sect ? SECTS.find(s => s.id === this.sect.id) : null;
                        const demonPath = demonSect ? demonSect.daoPath : null;
                        const demonTexts = {
                            water: "Зачем бороться? Позволь течению унести тебя. Растворись...",
                            sword: "Если всё можно рассечь — зачем что-то оставлять? Режь. Всё.",
                            alchemy: "Если всё можно изменить — существует ли вообще «настоящее»?",
                            void: "Если тебя нет — кто культивирует? Кто сейчас думает эту мысль?",
                            freedom: "Если нет обязательств — зачем продолжать путь? Остановись. Навсегда."
                        };
                        const demonVoice = demonPath && demonTexts[demonPath] ? demonTexts[demonPath] : "Ваш разум атакован!";
                        addLog(`\u2620 ВНУТРЕННИЙ ДЕМОН! ${demonVoice}`, "danger");
                        addLog(`Культивация рухнула! ${oldRealm} \u2192 ${newRealm} (-${actualLoss} ступеней)`, "danger");
                        addLog(`Демон пожрал основание: -${strBefore - this.strength} сила, -${sprBefore - this.spirit} дух, -${lckBefore - this.luck} удача`, "danger");
                        // Проверка: не убил ли откат реалма через предел жизни
                        const newMaxAge = this.maxAge();
                        const curAge = this.characterAge();
                        if (newMaxAge !== Infinity && curAge >= newMaxAge) {
                            addLog(`Предел жизни рухнул до ${newMaxAge} лет... Вам уже ${curAge}. Тело не выдержит.`, "danger");
                        } else if (newMaxAge !== Infinity && newMaxAge - curAge <= 20) {
                            addLog(`⚠ Предел жизни упал до ${newMaxAge} лет! Осталось всего ${newMaxAge - curAge} лет!`, "danger");
                        }
                        // Демон жрёт Дао (от��ат реалмов - 1, минимум 0)
                        const daoLoss = Math.max(0, actualLoss - 1);
                        if (daoLoss > 0 && this.daoLevel > 0) {
                            const oldDao = this.daoLevel;
                            this.daoLevel = Math.max(0, this.daoLevel - daoLoss);
                            this.daoProgress = 0;
                            addLog(`Постижение Дао пошатнулось: ${oldDao} \u2192 ${this.daoLevel} (-${oldDao - this.daoLevel})`, "danger");
                        }
                        addLog(`Основание нужно восстанавливать заново...`, "danger");
                        // Ачивка только если пережил (не умер от отката maxAge)
                        const survivedMaxAge = this.maxAge();
                        const survivedAge = this.characterAge();
                        if (survivedMaxAge === Infinity || survivedAge < survivedMaxAge) {
                            this.flags.survivedDemon = true;
                        }
                    }
                    }
                }

                // Обрезка экипированных техник при уменьшении слотов
                if (this.equippedTechniques && this.equippedTechniques.length > this.getMaxTechSlots()) {
                    const maxSlots = this.getMaxTechSlots();
                    const removed = this.equippedTechniques.splice(maxSlots);
                    for (const tid of removed) {
                        const tech = TECHNIQUES.find(t => t.id === tid);
                        addLog(`Техника "${tech ? tech.name : tid}" снята — слоты утрачены.`, "danger");
                    }
                }

                this.checkMilestones();
                saveGame();
                updateUI();
                return { result: demonTriggered ? "demon" : "fail" };
            }
        }

        this.qi = 0;
        this.totalBreakthroughs++;
        if (this.flags.prophetic_dream) delete this.flags.prophetic_dream;

        if (this.subLevel < SUB_LEVELS) {
            const oldMaxAge = this.maxAge();
            this.subLevel++;
            const newMaxAge = this.maxAge();
            addLog(
                `Прорыв! ${REALMS[this.realmIndex].name} — ${SUB_LEVEL_NAMES[this.subLevel - 1]} уровень`,
                "breakthrough"
            );
            if (newMaxAge !== Infinity && newMaxAge > oldMaxAge) {
                addLog(`Продолжительность жизни: ${oldMaxAge} → ${newMaxAge} лет`, "reward");
            }
            this.checkMilestones();
            saveGame();
            updateUI();
            return { result: "success" };
        } else {
            const oldMaxAge = this.maxAge();
            this.realmIndex++;
            this._maxRealmThisLife = Math.max(this._maxRealmThisLife || 0, this.realmIndex);
            this.subLevel = 1;

            const isAscension = REALMS[this.realmIndex].tier === "immortal" && REALMS[this.realmIndex - 1].tier === "mortal";
            const btText = REALM_BREAKTHROUGH_TEXTS[this.realmIndex];

            // Каскадные логи для эпичности
            if (btText && btText.flavor) {
                addLog(btText.flavor, "event");
            }

            if (isAscension) {
                addLog("══════════════════════════════", "breakthrough");
                addLog("Вы вознеслись в Бессмертный Мир!", "breakthrough");
                addLog("Невероятно для простого смертного...", "breakthrough");
                addLog("══════════════════════════════", "breakthrough");
            }

            addLog(
                `Великий прорыв! Ступень: «${REALMS[this.realmIndex].name}» — ${SUB_LEVEL_NAMES[0]} уровень`,
                "breakthrough"
            );

            if (btText && btText.log) {
                addLog(btText.log, "breakthrough");
            }

            this.strength += 2;
            this.spirit += 2;
            addLog("+2 сила, +2 дух", "reward");
            const newMaxAge = this.maxAge();
            if (newMaxAge !== Infinity && newMaxAge > oldMaxAge) {
                addLog(`Продолжительность жизни: ${oldMaxAge} → ${newMaxAge} лет`, "reward");
            }
            this.checkMilestones();
            saveGame();
            updateUI();
            return { result: isAscension ? "ascension" : "great" };
        }
    },

    // === ПИЛЮЛИ (4 тира, фиксированные значения) ===

    // Множитель эффекта пилюль (печь, секта, артефакт, мировое событие)
    _getPillMult() {
        let mult = 1.0;
        if (this.worldEvent && this.worldEvent.modifiers.pillEffect) mult *= this.worldEvent.modifiers.pillEffect;
        mult *= 1 + this.getSectBonus("pillEffect");
        mult *= 1 + this.getArtifactBonus("pillEffect") * 0.01;
        mult *= 1 + this.getFormationBonus("pillEffect");
        return mult;
    },

    // Ци от пилюли — фиксированное значение × множители
    getPillQi(tier) {
        const values = [500, 5000, 50000, 500000]; // тир 1/2/3/4
        const base = values[tier - 1] || 0;
        return Math.floor(base * this._getPillMult());
    },

    // Тир 1: Пилюля Ци (+500 ци × бонусы)
    usePill() {
        if (this.pills <= 0 || this.gameOver || this.pendingRebirth || this.qi >= this.qiNeeded()) return;
        this.pills--;
        this.flags.pillsUsedTotal = (this.flags.pillsUsedTotal || 0) + 1;
        const gain = this.getPillQi(1);
        this.qi = Math.min(this.qi + gain, this.qiNeeded());
        updateUI();
    },

    // Тир 2: Очищенная Пилюля (+5000 ци × бонусы)
    useRefinedPill() {
        if ((this.refinedPills || 0) <= 0 || this.gameOver || this.pendingRebirth || this.qi >= this.qiNeeded()) return;
        this.refinedPills--;
        const gain = this.getPillQi(2);
        this.qi = Math.min(this.qi + gain, this.qiNeeded());
        addLog(`Очищенная пилюля: +${gain} ци`, "reward");
        updateUI();
    },

    // Тир 3: Духовная Пилюля (+50000 ци × бонусы, +8% дао, +5% к следующему прорыву)
    useSpiritualPill() {
        if ((this.spiritualPills || 0) <= 0 || this.gameOver || this.pendingRebirth) return;
        this.spiritualPills--;
        // Ци
        const qiGain = this.getPillQi(3);
        this.qi = Math.min(this.qi + qiGain, this.qiNeeded());
        // Дао прогресс
        const parts = [`+${qiGain} ци`];
        if (this.realmIndex >= 3 && this.sect) {
            const daoGain = Math.floor(this.daoNeeded() * 0.08);
            this.daoProgress += daoGain;
            this._checkDaoLevelUp();
            parts.push(`+${daoGain} дао`);
        }
        // Бонус к прорыву (временный, на 1 попытку, макс +25%)
        this.flags._pillBreakthroughBonus = Math.min(0.25, (this.flags._pillBreakthroughBonus || 0) + 0.05);
        parts.push(`+5% прорыв`);
        addLog(`Духовная пилюля: ${parts.join(", ")}`, "reward");
        updateUI();
    },

    // Тир 4: Небесная Пилюля (+1 стат, наименьший из 3)
    useHeavenlyPill() {
        if ((this.heavenlyPills || 0) <= 0 || this.gameOver || this.pendingRebirth) return;
        this.heavenlyPills--;
        // Ци бонус
        const qiGain = this.getPillQi(4);
        if (qiGain > 0) this.qi = Math.min(this.qi + qiGain, this.qiNeeded());
        // Выбрать наименьший стат
        const stats = [
            { key: "strength", name: "сила", val: this.strength },
            { key: "spirit", name: "дух", val: this.spirit },
            { key: "luck", name: "удача", val: this.luck }
        ];
        stats.sort((a, b) => a.val - b.val);
        const target = stats[0];
        this[target.key]++;
        addLog(`Небесная пилюля: +${qiGain} ци, +1 ${target.name}!`, "breakthrough");
        updateUI();
    },

    // Массовое использование пилюль (для x10/x100)
    usePillMulti(tier, count) {
        if (this.gameOver || this.pendingRebirth || count <= 0) return;
        const fields = ["pills", "refinedPills", "spiritualPills", "heavenlyPills"];
        const funcs = ["usePill", "useRefinedPill", "useSpiritualPill", "useHeavenlyPill"];
        const field = fields[tier - 1];
        const func = funcs[tier - 1];
        if (!field || !func) return;
        const actual = Math.min(count, this[field] || 0);
        for (let i = 0; i < actual; i++) {
            if (tier <= 2 && this.qi >= this.qiNeeded()) break;
            this[func]();
        }
    },

    // Массовый рефайн (для x10/x100)
    refinePillMulti(fromTier, count) {
        if (this.gameOver || this.pendingRebirth || count <= 0) return;
        let done = 0;
        for (let i = 0; i < count; i++) {
            if (!this.canRefinePill(fromTier)) break;
            this.refinePillTier(fromTier);
            done++;
        }
    },

    // Рефайн: 5 текущего тира + пыль → 1 следующего
    getRefineCost(fromTier) {
        return [5, 20, 100][fromTier - 1] || 0; // пыль: тир 1→2: 5, 2→3: 20, 3→4: 100
    },

    // Количество пилюль для рефайна (5 базовое, 4 у Алхимика)
    getRefineCount() {
        const perks = this.getActiveBodyPerks();
        return perks.refineCount || 5;
    },

    canRefinePill(fromTier) {
        if (this.gameOver || this.pendingRebirth) return false;
        const fields = ["pills", "refinedPills", "spiritualPills", "heavenlyPills"];
        const fromField = fields[fromTier - 1];
        const toField = fields[fromTier];
        if (!fromField || !toField) return false;
        if ((this[fromField] || 0) < this.getRefineCount()) return false;
        if (this.artifactDust < this.getRefineCost(fromTier)) return false;
        // Тир 2→3 требует Алхимик ★1, тир 3→4 требует Алхимик ★2
        if (fromTier >= 2) {
            const ascLevel = this.getBodyAscensionLevel("alchemist_heir");
            if (ascLevel < fromTier - 1) return false;
        }
        return true;
    },

    // Проверка доступности рефайна (для UI подсказок)
    getRefineRequirement(fromTier) {
        if (fromTier === 1) return null; // всегда доступен
        const ascLevel = this.getBodyAscensionLevel("alchemist_heir");
        const needed = fromTier - 1;
        if (ascLevel >= needed) return null;
        const names = ["", "Мастер Зелий ★1", "Великий Алхимик ★2"];
        return names[needed] || "Алхимик";
    },

    refinePillTier(fromTier) {
        if (this.gameOver || this.pendingRebirth || !this.canRefinePill(fromTier)) return;
        const fields = ["pills", "refinedPills", "spiritualPills", "heavenlyPills"];
        const names = ["Пилюля Ци", "Очищенная", "Духовная", "Небесная"];
        const fromField = fields[fromTier - 1];
        const toField = fields[fromTier];
        const cost = this.getRefineCost(fromTier);
        const count = this.getRefineCount();
        this[fromField] -= count;
        this.artifactDust -= cost;
        this[toField] = (this[toField] || 0) + 1;
        addLog(`Переплавка: ${count}× ${names[fromTier - 1]} + ${cost} пыли → 1× ${names[fromTier]}`, "reward");
        updateUI();
    },

    // === ПОКУПКИ ЗА КАМНИ ===

    // getInsightCost() определён в formulas.js

    // Чистый предпросмотр последовательных покупок: новый уровень изменяет
    // выдачу следующего Озарения. Покупки прекращаются, когда все техники max.
    getInsightPurchaseInfo(count = 1) {
        const result = { count: 0, cost: 0, xpGains: {} };
        if (!Number.isSafeInteger(count) || count <= 0 || count > 1000) return result;
        const training = this.equippedTechniques.map(id => {
            const tech = TECHNIQUES.find(t => t.id === id);
            return tech ? { tech, level: this.techLevels[id] || 1, xp: this.techXP[id] || 0 } : null;
        }).filter(Boolean);
        for (let i = 0; i < count; i++) {
            if (!training.some(t => t.level < t.tech.maxLevel)) break;
            result.cost += this.getInsightCost((this._insightUses || 0) + result.count);
            result.count++;
            for (const t of training) {
                if (t.level >= t.tech.maxLevel) continue;
                const gain = this.getInsightXpGain(t.tech.id, t.level);
                result.xpGains[t.tech.id] = (result.xpGains[t.tech.id] || 0) + gain;
                t.xp += gain;
                while (t.level < t.tech.maxLevel && t.xp >= this.techXpNeeded(t.tech.id, t.level)) {
                    t.xp -= this.techXpNeeded(t.tech.id, t.level);
                    t.level++;
                }
            }
        }
        return result;
    },

    canBuyInsight(count = 1) {
        if (this.gameOver || this.pendingRebirth) return false;
        const purchase = this.getInsightPurchaseInfo(count);
        return purchase.count > 0 && this.daoEssence >= purchase.cost;
    },

    _grantTechniqueXP(techId, gain) {
        const tech = TECHNIQUES.find(t => t.id === techId);
        if (!tech || !Number.isFinite(gain) || gain <= 0) return false;
        this.techXP[techId] = (this.techXP[techId] || 0) + gain;
        while ((this.techLevels[techId] || 1) < tech.maxLevel && this.techXP[techId] >= this.techXpNeeded(techId)) {
            this.techXP[techId] -= this.techXpNeeded(techId);
            this.techLevels[techId] = (this.techLevels[techId] || 1) + 1;
            if (this.techLevels[techId] >= tech.maxLevel) addLog(`Техника "${tech.name}" достигла максимума! Вознесение доступно.`, "breakthrough");
            if (tech.effects.timeSpeed) this.refreshTimers();
        }
        return true;
    },

    buyInsight(count = 1) {
        if (this.gameOver || this.pendingRebirth) return false;
        this._flushPendingInsightXP();
        const purchase = this.getInsightPurchaseInfo(count);
        if (purchase.count <= 0 || this.daoEssence < purchase.cost) return false;
        this.daoEssence -= purchase.cost;
        this._insightUses = (this._insightUses || 0) + purchase.count;
        let totalXP = 0;
        for (const [techId, gain] of Object.entries(purchase.xpGains)) {
            this._grantTechniqueXP(techId, gain);
            totalXP += gain;
        }
        const nextCost = this.getInsightCost();
        addLog(`Озарение ×${purchase.count}: +${totalXP} XP экипированным техникам. Потрачено ${purchase.cost} эссенции. След.: ${nextCost}`, "reward");
        updateUI();
        return true;
    },

    // Совместимость со старыми сейвами: оплаченный остаток начисляется один
    // раз, включая избыток XP на максимальном уровне. Новые очереди не создаются.
    _flushPendingInsightXP() {
        const pending = this._pendingInsightXP;
        this._pendingInsightXP = null;
        this._insightTicksLeft = 0;
        if (!pending) return false;
        for (const [techId, gain] of Object.entries(pending)) this._grantTechniqueXP(techId, gain);
        return true;
    },

    _tickInsightXP() {
        if (this._flushPendingInsightXP() && typeof renderTechniques === "function") renderTechniques();
    },

});
