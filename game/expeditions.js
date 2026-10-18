// ============================================================
// GAME/EXPEDITIONS.JS — Тайные Царства: экспедиции
// Зависит от: game/state.js, data/locations.js, game/artifacts.js
// ============================================================

Object.assign(game, {
    // === ВОЗНЕСЕНИЕ ЛОКАЦИИ ===

    canAscendLocation(locationId) {
        if (this.gameOver || this.pendingRebirth) return false;
        if (this.ascendedLocations[locationId]) return false;
        if (!this.flags["expedition_" + locationId]) return false; // нужна хотя бы 1 экспедиция
        const cost = LOCATION_ASCEND_COST;
        return this.stones >= cost.stones && this.daoEssence >= cost.essence && this.artifactDust >= cost.dust;
    },

    ascendLocation(locationId) {
        if (!this.canAscendLocation(locationId)) return false;
        const cost = LOCATION_ASCEND_COST;
        this.stones -= cost.stones;
        this.daoEssence -= cost.essence;
        this.artifactDust -= cost.dust;
        this.ascendedLocations[locationId] = (this.ascendedLocations[locationId] || 0) + 1;
        if (this.expeditionCompletions) this.expeditionCompletions[locationId] = 0;
        const ascData = LOCATION_ASCENDED[locationId];
        const name = ascData ? ascData.name : locationId;
        addLog(`Тайное Царство вознесено! ${name} — награды удвоены.`, "breakthrough");
        updateUI();
        return true;
    },

    getLocationName(locationId) {
        const tier = this.ascendedLocations[locationId] || 0;
        if (tier >= 2 && typeof LOCATION_ASCENDED_2 !== "undefined" && LOCATION_ASCENDED_2[locationId]) {
            return LOCATION_ASCENDED_2[locationId].name;
        }
        if (tier >= 1 && LOCATION_ASCENDED[locationId]) {
            return LOCATION_ASCENDED[locationId].name;
        }
        const loc = LOCATIONS.find(l => l.id === locationId);
        return loc ? loc.name : locationId;
    },

    getLocationDescription(locationId) {
        const tier = this.ascendedLocations[locationId] || 0;
        if (tier >= 2 && typeof LOCATION_ASCENDED_2 !== "undefined" && LOCATION_ASCENDED_2[locationId]) {
            return LOCATION_ASCENDED_2[locationId].description;
        }
        if (tier >= 1 && LOCATION_ASCENDED[locationId]) {
            return LOCATION_ASCENDED[locationId].description;
        }
        const loc = LOCATIONS.find(l => l.id === locationId);
        return loc ? loc.description : "";
    },

    // === ПРОВЕРКА ДОСТУПА ===

    canStartExpedition(locationId) {
        if (this.expedition) return false; // уже в экспедиции
        if (this.gameOver || this.pendingRebirth) return false;

        const loc = LOCATIONS.find(l => l.id === locationId);
        if (!loc) return false;
        if (this.realmIndex < loc.minRealm) return false;
        if (loc.combatCheck && this.getCombatPower() < loc.combatCheck) return false;
        const ascTierCheck = this.ascendedLocations[locationId] || 0;
        const entryCostMult = ascTierCheck >= 2 ? 3 : ascTierCheck >= 1 ? 2 : 1;
        if (loc.entryCost && this.stones < loc.entryCost * entryCostMult) return false;
        if (loc.requiresSectRank) {
            if (!this.sect) return false;
            const rank = this.getCurrentSectRank();
            const reqRankIdx = SECT_RANKS.findIndex(r => r.id === loc.requiresSectRank);
            if (this.getSectRankIndex() < reqRankIdx) return false;
        }
        return true;
    },

    // === СТАРТ ЭКСПЕДИЦИИ ===

    startExpedition(locationId) {
        if (!this.canStartExpedition(locationId)) return false;
        const loc = LOCATIONS.find(l => l.id === locationId);
        if (!loc) return false;

        // Оплата входа
        if (loc.entryCost) {
            const ascTierCost = this.ascendedLocations[locationId] || 0;
            const costMult = ascTierCost >= 2 ? 3 : ascTierCost >= 1 ? 2 : 1;
            this.stones -= loc.entryCost * costMult;
        }

        this._lastExpeditionId = locationId;
        const rewardMultipliers = this.getExpeditionRewardMultipliers(loc);
        const cultivationReward = this.getExpeditionCultivationReward(loc);
        this.expedition = {
            locationId: locationId,
            startYear: this.years,
            baseDuration: loc.duration,
            rewardMultipliers,
            cultivationReward
        };

        const estDuration = this.getAdjustedExpeditionDuration();
        addLog(`\u2728 Экспедиция в «${loc.name}» начата! Ориентировочно ${estDuration} лет.`, "breakthrough");
        updateUI();
        return true;
    },

    // Условия похода фиксируются при отправлении; новые ускорения действуют на следующий.
    getAdjustedExpeditionDuration() {
        if (!this.expedition) return 0;
        const promisedDuration = this.expedition.cultivationReward?.duration;
        if (Number.isFinite(promisedDuration) && promisedDuration >= 10) return promisedDuration;
        const base = this.expedition.baseDuration || this.expedition.duration || 0;
        return this.getExpeditionDuration({ duration: base });
    },

    getExpeditionDuration(loc) {
        const speedBonus = this.getFormationBonus("expeditionSpeed")
            + (this.getActiveBodyPerks().expeditionSpeed || 0)
            + this.getArtifactBonus("expeditionSpeed") * 0.01;
        return Math.max(10, Math.floor(loc.duration / (1 + Math.max(0, speedBonus))));
    },

    // === ЭФФЕКТИВНАЯ ОПАСНОСТЬ (с учётом эпохи, мировых событий и вознесения) ===

    _getLocDangerBase(loc) {
        if (!loc) return 0;
        if (this.ascendedLocations[loc.id] && loc.ascend && loc.ascend.dangerLevel !== undefined) {
            return loc.ascend.dangerLevel;
        }
        return loc.dangerLevel || 0;
    },

    getEffectiveDangerLevel(loc) {
        const base = this._getLocDangerBase(loc);
        if (base <= 0) return 0;
        let mult = 1;
        const era = this.getCurrentEra();
        if (era && era.dangerWeight) mult *= era.dangerWeight;
        if (this.worldEvent && this.worldEvent.modifiers.dangerWeight) {
            mult *= this.worldEvent.modifiers.dangerWeight;
        }
        return Math.floor(base * mult);
    },

    // === ПРОВЕРКА ЗАВЕРШЕНИЯ (вызывается из passYear) ===

    // Шанс провала экспедиции за год (0 если мощь >= effectiveDanger)
    getExpeditionFailChance() {
        if (!this.expedition) return 0;
        const loc = LOCATIONS.find(l => l.id === this.expedition.locationId);
        if (!loc) return 0;
        const danger = this.getEffectiveDangerLevel(loc);
        if (danger <= 0) return 0;
        const power = this.getCombatPower();
        if (power >= danger) return 0;
        // Чем сильнее не дотягиваешь, тем выше шанс (максимум 25% в год).
        const deficit = (danger - power) / danger;
        return Math.min(0.25, deficit * 0.30);
    },

    tickExpedition() {
        if (!this.expedition) return;

        // Проверка провала (каждый год)
        const failChance = this.getExpeditionFailChance();
        if (failChance > 0 && Math.random() < failChance) {
            this._failExpedition();
            return;
        }

        const elapsed = this.years - this.expedition.startYear;
        if (elapsed >= this.getAdjustedExpeditionDuration()) {
            this._completeExpedition();
        }
    },

    _failExpedition() {
        if (!this.expedition) return;
        const loc = LOCATIONS.find(l => l.id === this.expedition.locationId);
        const name = loc ? loc.name : "неизвестная локация";
        const elapsed = this.years - this.expedition.startYear;

        addLog(`Экспедиция в "${name}" провалена! Вы столкнулись с опасностью, которую не смогли преодолеть.`, "danger");
        addLog(`Прошло ${elapsed} лет из ${this.getAdjustedExpeditionDuration()}. Вы вернулись ни с чем.`, "system");

        this.expedition = null;
        this._expeditionJustEnded = true;
        updateUI();
    },

    // === РАСЧЁТ НАГРАД ===

    // Общая модель для выдачи наград и их предпросмотра.
    getExpeditionRewardMultipliers(loc) {
        if (this.expedition && this.expedition.locationId === loc.id && this.expedition.rewardMultipliers) {
            return this.expedition.rewardMultipliers;
        }
        const era = this.getCurrentEra();
        const modifiers = (this.worldEvent && this.worldEvent.modifiers) || {};
        const eraBonus = Math.max(0, (era ? era.rewardWeight || 1 : 1) - 1);
        const eventBonus = Math.max(0, (modifiers.expeditionReward || 1) - 1);
        const stoneEventBonus = Math.max(0, (modifiers.stoneIncome || 1) - 1);
        const dangerBonus = this._getLocDangerBase(loc) > 0 ? this.getDangerRewardBonus() : 0;
        const ascTier = this.ascendedLocations[loc.id] || 0;
        const ascendMult = ascTier >= 2 ? 2.5 : ascTier >= 1 ? 2 : 1;
        const bonus = Math.min(3, eraBonus + eventBonus + dangerBonus);
        const stoneBonus = Math.min(3, eraBonus + eventBonus + dangerBonus + stoneEventBonus);
        const total = (1 + bonus) * ascendMult;
        const stoneTotal = (1 + stoneBonus) * ascendMult;
        const rewardRealm = Math.max(0, Math.min(this.realmIndex, loc.minRealm + 2 * ascTier, 10));
        const realmMult = 1 + rewardRealm * 0.3;
        const luckMult = 1 + this.getRewardLuckBonus();
        return {
            eraName: era ? era.name : "",
            eventName: this.worldEvent ? this.worldEvent.name : "",
            total, stoneTotal, bonus, stoneBonus, era: eraBonus, event: eventBonus,
            danger: dangerBonus, ascend: ascendMult, realm: realmMult, luck: luckMult,
            stones: stoneTotal * realmMult * luckMult,
            resources: total * luckMult, pills: total,
        };
    },

    // Для незавершённого снимка фиксируем доступные при загрузке условия.
    ensureExpeditionRewardSnapshot() {
        if (!this.expedition) return;
        const loc = LOCATIONS.find(l => l.id === this.expedition.locationId);
        if (!loc) return;
        if (!this.expedition.rewardMultipliers) this.expedition.rewardMultipliers = this.getExpeditionRewardMultipliers(loc);
        if (!this.expedition.cultivationReward) this.expedition.cultivationReward = this.getExpeditionCultivationReward(loc);
    },

    getExpeditionArtifactReward(loc) {
        const rewards = loc.rewards;
        const ascData = this.ascendedLocations[loc.id] && loc.ascend ? loc.ascend : null;
        const tiers = ["common", "uncommon", "rare", "epic", "legendary", "divine"];
        const maxTier = (ascData && ascData.artifactMaxTier) || rewards.artifactMaxTier || null;
        let minTier = (ascData && ascData.artifactMinTier) || rewards.artifactMinTier || null;
        const tierBonus = this.getActiveBodyPerks().artifactTierBonus || 0;
        if (tierBonus) {
            const minIdx = minTier ? tiers.indexOf(minTier) : 0;
            minTier = tiers[Math.min(tiers.length - 1, minIdx + tierBonus)];
        }
        // Повышение тира телом соблюдает верхнюю границу самой локации.
        if (minTier && maxTier && tiers.indexOf(minTier) > tiers.indexOf(maxTier)) minTier = maxTier;
        const luck = Math.max(0, this.getTotalLuck());
        const totalChance = (rewards.artifactChance || 0) * (1 + 0.5 * luck / (luck + 50));
        return {
            minTier, maxTier,
            firstChance: Math.min(1, totalChance),
            secondChance: Math.min(1, Math.max(0, totalChance - 1)),
            extraArtifact: !!(rewards.artifactChance && this.getActiveBodyPerks().extraArtifact),
        };
    },

    getExpeditionScrollReward(loc) {
        const ascTier = this.ascendedLocations[loc.id] || 0;
        const ascChance = ascTier >= 1 && loc.ascend ? loc.ascend.scrollChance || 0 : 0;
        return { guaranteed: ascTier >= 2 ? 1 : 0, chance: loc.rewards.scrollChance || ascChance };
    },

    getExpeditionCultivationReward(loc) {
        if (this.expedition && this.expedition.locationId === loc.id && this.expedition.cultivationReward) {
            return this.expedition.cultivationReward;
        }
        const duration = this.getExpeditionDuration(loc);
        const ascTier = this.ascendedLocations[loc.id] || 0;
        const grade = loc.cultivationRealm === null ? null : Math.min(10, loc.cultivationRealm + 2 * ascTier);
        const relevance = grade === null ? 0 : Math.pow(0.5, Math.max(0, this.realmIndex - grade));
        const needed = this.qiNeeded();
        const meditationQi = this.getMeditationQiPerSec() * 5 * duration;
        const qi = Number.isFinite(needed)
            ? Math.floor(Math.max(0, Math.min(needed, meditationQi * EXPEDITION_CULTIVATION.qiReturn * relevance))) : 0;
        const sectMultiplier = this.sect && (loc.daoSect === this.sect.id || loc.daoSect === "current_sect") ? 2 : 1;
        let daoMin = 0;
        if (this.realmIndex >= 3 && this.sect && loc.daoSect !== "no_dao" && grade !== null) {
            const rewardRealm = Math.min(this.realmIndex, grade);
            const base = 15 + rewardRealm * 8 + (this.subLevel - 1) * 3;
            daoMin = base * duration / EXPEDITION_CULTIVATION.daoYears * sectMultiplier * this.getDaoSpeedMultiplier();
        }
        return { qi, meditationQi, duration, grade, relevance,
            daoMin, daoMax: daoMin * 1.5, sectMultiplier, sectId: this.sect ? this.sect.id : null };
    },

    getExpeditionDaoReward(loc) {
        const reward = this.getExpeditionCultivationReward(loc);
        // Постижение относится к Пути секты, в которой был начат поход.
        const sameSect = this.sect && this.sect.id === reward.sectId;
        return { min: sameSect ? reward.daoMin : 0, max: sameSect ? reward.daoMax : 0, sectMultiplier: reward.sectMultiplier };
    },

    _completeExpedition() {
        if (!this.expedition) return;
        const loc = LOCATIONS.find(l => l.id === this.expedition.locationId);
        if (!loc) {
            this.expedition = null;
            this._expeditionJustEnded = true;
            return;
        }

        const rewards = loc.rewards;
        const results = [];

        const era = this.getCurrentEra();
        const mult = this.getExpeditionRewardMultipliers(loc);

        if (rewards.stones && rewards.stones.max > 0) {
            const stoneBase = rewards.stones.min + Math.random() * (rewards.stones.max - rewards.stones.min);
            const stoneReward = Math.floor(stoneBase * mult.stones);
            this.stones += stoneReward;
            results.push(`+${stoneReward} камней`);
        }

        // Эссенция Дао
        if (rewards.essence && rewards.essence.max > 0) {
            const essBase = rewards.essence.min + Math.random() * (rewards.essence.max - rewards.essence.min);
            const essReward = Math.floor(essBase * mult.resources);
            this.daoEssence += essReward;
            results.push(`+${essReward} эссенции`);
        }

        // Пыль артефактов
        if (rewards.dust && rewards.dust.max > 0) {
            const dustBase = rewards.dust.min + Math.random() * (rewards.dust.max - rewards.dust.min);
            const dustReward = Math.floor(dustBase * mult.resources);
            if (dustReward > 0) {
                this.artifactDust += dustReward;
                results.push(`+${dustReward} пыли`);
            }
        }

        // Пилюли
        if (rewards.pills) {
            const pillBase = rewards.pills.min + Math.random() * (rewards.pills.max - rewards.pills.min);
            const pillReward = Math.floor(pillBase * mult.pills);
            if (pillReward > 0) {
                this.pills += pillReward;
                results.push(`+${pillReward} пилюль`);
            }
        }

        // Артефакт (шанс масштабируется удачей; если >100%, остаток — шанс второго)
        if (rewards.artifactChance) {
            const tierOrder = ["common", "uncommon", "rare", "epic", "legendary", "divine"];
            const artifactReward = this.getExpeditionArtifactReward(loc);
            const { minTier, maxTier } = artifactReward;
            const rollArt = () => {
                let tier = this._rollArtifactTier();
                // Кап тира сверху
                if (maxTier) {
                    const maxIdx = tierOrder.indexOf(maxTier);
                    const rolledIdx = tierOrder.indexOf(tier);
                    if (rolledIdx > maxIdx) tier = tierOrder[maxIdx];
                }
                // Мин тир снизу
                if (minTier) {
                    const minIdx = tierOrder.indexOf(minTier);
                    const rolledIdx = tierOrder.indexOf(tier);
                    if (rolledIdx < minIdx) tier = minTier;
                }
                return this.generateArtifact(tier);
            };

            // Первый артефакт
            if (Math.random() < artifactReward.firstChance) {
                const art = rollArt();
                if (this.addArtifact(art)) {
                    results.push(`артефакт: ${art.name}`);
                }
            }

            // Второй артефакт: только остаток сверх 100%.
            if (artifactReward.secondChance > 0) {
                if (Math.random() < artifactReward.secondChance) {
                    const art = rollArt();
                    if (this.addArtifact(art)) {
                        results.push(`артефакт (бонус): ${art.name}`);
                    }
                }
            }

            // Дополнительный артефакт соблюдает те же границы тира локации.
            if (artifactReward.extraArtifact) {
                const extraArt = rollArt();
                if (this.addArtifact(extraArt)) {
                    results.push(`доп. артефакт: ${extraArt.name}`);
                }
            }
        }

        // Свиток Воли Дао (шанс, включая ascend)
        const scrollReward = this.getExpeditionScrollReward(loc);
        if (scrollReward.guaranteed) {
            const added = this.addDaoScroll(scrollReward.guaranteed);
            if (added > 0) results.push(`+${added} Свиток Воли Дао`);
        } else if (scrollReward.chance && Math.random() < scrollReward.chance) {
            const added = this.addDaoScroll(1);
            if (added > 0) {
                results.push(`+1 Свиток Воли Дао`);
            }
        }

        // Техника (редкий шанс)
        if (rewards.techniqueChance && Math.random() < rewards.techniqueChance) {
            // Найти технику, которой у игрока нет
            const unlearned = this.getRewardTechniquePool();
            if (unlearned.length > 0) {
                const tech = unlearned[Math.floor(Math.random() * unlearned.length)];
                this.learnTechnique(tech.id);
                results.push(`техника: ${tech.name}`);
            }
        }

        const cultivationReward = this.getExpeditionCultivationReward(loc);
        if (cultivationReward.qi > 0) {
            const qiBefore = this.qi;
            this.qi += cultivationReward.qi;
            this.checkQiCap();
            const qiGain = Math.max(0, Math.floor(this.qi - qiBefore));
            if (qiGain > 0) results.push(`+${qiGain.toLocaleString("ru-RU")} ци`);
        }

        const daoReward = this.getExpeditionDaoReward(loc);
        if (daoReward.max > 0) {
            const rolledDao = daoReward.min + Math.random() * (daoReward.max - daoReward.min);
            const daoGain = Math.min(rolledDao, this.getDaoProgressRoom());
            if (daoGain > 0) {
                this.daoProgress += daoGain;
                this._checkDaoLevelUp();
                results.push(`+${Math.floor(daoGain)} постижение Дао${daoReward.sectMultiplier > 1 ? " (×2 секта)" : ""}`);
            } else {
                results.push("Дао: достигнут предел текущей ступени");
            }
        }

        addLog(`Экспедиция в "${loc.name}" завершена!`, "breakthrough");
        const bonusParts = [];
        if (mult.era > 0.01) bonusParts.push(`${mult.eraName || era.name} +${Math.round(mult.era * 100)}%`);
        if (mult.event > 0.01) bonusParts.push(`${mult.eventName || "мировое событие"} +${Math.round(mult.event * 100)}%`);
        if (mult.danger > 0.01) bonusParts.push(`опасность +${Math.round(mult.danger * 100)}%`);
        if (mult.bonus > 0.01) bonusParts.push(`итого ×${mult.total.toFixed(2)}`);
        const bonusSuffix = bonusParts.length > 0 ? ` (${bonusParts.join(", ")})` : "";
        addLog(`Награды: ${results.join(", ")}${bonusSuffix}`, "reward");

        // Сохраняем последнюю награду для отображения в UI
        this.lastExpeditionReward = {
            locationId: loc.id,
            locationName: loc.name,
            rewards: results.slice(),
            year: this.years
        };

        this.expedition = null;
        this._expeditionJustEnded = true;

        // Флаги для достижений
        this.flags.completedExpedition = true;
        this.flags["expedition_" + loc.id] = true;
        // Счётчик завершений для вознесения
        if (!this.expeditionCompletions) this.expeditionCompletions = {};
        this.expeditionCompletions[loc.id] = (this.expeditionCompletions[loc.id] || 0) + 1;

        // При 10 завершениях — слух о вознесении тир 2
        if (this.expeditionCompletions[loc.id] === 10 && !this.ascendedLocations[loc.id]) {
            const ascAdvId = "ascend_" + loc.id;
            const ascAdv = ADVENTURES.find(a => a.id === ascAdvId);
            if (ascAdv && ascAdv.condition(this)) {
                if (this.addAdventureRumor(ascAdvId)) {
                    addLog(`Десять походов в "${loc.name}" открыли новый путь. Вы готовы к испытанию вознесения.`, "breakthrough");
                }
            }
        }
        // После 20 завершений повторяем выдачу, если слух пропустили или прервали.
        // Дубликаты и уже завершённые испытания отсекает addAdventureRumor.
        if (this.expeditionCompletions[loc.id] >= 20 && this.ascendedLocations[loc.id] === 1) {
            const ascAdvId = "ascend2_" + loc.id;
            const ascAdv = ADVENTURES.find(a => a.id === ascAdvId);
            if (ascAdv && ascAdv.condition(this)) {
                if (this.addAdventureRumor(ascAdvId)) {
                    addLog(`Двадцать походов. "${this.getLocationName(loc.id)}" готово открыть последнюю тайну.`, "breakthrough");
                }
            }
        }

        // Шанс услышать слух о приключении во время экспедиции
        this._rollExpeditionRumor();

        // Авто-экспедиция (Небесный Владыка): повторить в ту же локацию
        const autoPerks = this.getActiveBodyPerks();
        if (autoPerks.autoExpedition && this._autoExpeditionEnabled !== false && this.canStartExpedition(loc.id)) {
            this.startExpedition(loc.id);
            addLog(`Авто-экспедиция: отправляемся в "${loc.name}" снова.`, "system");
        }

        this.checkMilestones();
        updateUI();
    },

    // Шанс слуха о приключении после экспедиции (~20%)
    _rollExpeditionRumor() {
        if (Math.random() > 0.20) return;
        if (this.adventureRumors.length >= 5) return;

        const available = this._getAvailableAdventureRumors().filter(a => this.canDiscoverAdventureRumor(a.id));
        if (available.length === 0) return;

        const adv = available[Math.floor(Math.random() * available.length)];
        if (this.discoverAdventureRumor(adv.id)) {
            addLog(`Во время экспедиции вы услышали слух: "${adv.rumor}"`, "event");
        }
    },

    // Прогресс экспедиции (0-1)
    getExpeditionProgress() {
        if (!this.expedition) return 0;
        const elapsed = this.years - this.expedition.startYear;
        return Math.min(1, elapsed / this.getAdjustedExpeditionDuration());
    },

    // Оставшееся время
    getExpeditionTimeLeft() {
        if (!this.expedition) return 0;
        const elapsed = this.years - this.expedition.startYear;
        return Math.max(0, this.getAdjustedExpeditionDuration() - elapsed);
    },
});
