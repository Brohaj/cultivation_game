// ============================================================
// GAME/EXPEDITIONS.JS — Тайные Царства: экспедиции
// Зависит от: game/state.js, data/locations.js, game/artifacts.js
// ============================================================

Object.assign(game, {
    // === ВОЗНЕСЕНИЕ ЛОКАЦИИ ===

    canAscendLocation(locationId) {
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
        if (this.gameOver) return false;

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
        this.expedition = {
            locationId: locationId,
            startYear: this.years,
            baseDuration: loc.duration
        };

        const estDuration = this.getAdjustedExpeditionDuration();
        addLog(`\u2728 Экспедиция в «${loc.name}» начата! Ориентировочно ${estDuration} лет.`, "breakthrough");
        updateUI();
        return true;
    },

    // Динамическая длительность экспедиции (пересчитывается с текущими бонусами)
    getAdjustedExpeditionDuration() {
        if (!this.expedition) return 0;
        const base = this.expedition.baseDuration || this.expedition.duration || 0;
        const speedBonus = this.getFormationBonus("expeditionSpeed")
            + (this.getActiveBodyPerks().expeditionSpeed || 0)
            + this.getArtifactBonus("expeditionSpeed") * 0.01;
        return Math.max(10, Math.floor(base * (1 - speedBonus)));
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
        // Чем сильнее не дотягиваешь, тем выше шанс (макс ~8% в год)
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

        // Множитель эпохи и мирового события
        const era = this.getCurrentEra();
        const eraRewardMult = era ? (era.rewardWeight || 1) : 1;
        const eventRewardMult = (this.worldEvent && this.worldEvent.modifiers.expeditionReward) || 1;

        // Бонус за опасность (секта + техники + артефакты + формации + тело)
        const dangerBonus = this.getSectBonus("dangerReward")
            + this.getArtifactBonus("dangerReward") * 0.01
            + this.getFormationBonus("dangerReward")
            + (this.getActiveBodyPerks().dangerReward || 0);

        // Бонус за превышение боевой мощи (плавная асимптота к 1.5)
        let powerBonus = 0;
        const effectiveDanger = this.getEffectiveDangerLevel(loc);
        if (effectiveDanger > 0) {
            const power = this.getCombatPower();
            if (power > effectiveDanger) {
                const x = Math.max(0, (power - effectiveDanger) / effectiveDanger * 0.6);
                powerBonus = 1.5 * (1 - Math.exp(-x));
            }
        }

        const ascTier = this.ascendedLocations[loc.id] || 0;
        const ascendMult = ascTier >= 2 ? 3 : ascTier >= 1 ? 2 : 1;
        // danger + power — аддитивны между собой, era — мультипликативна
        const totalRewardMult = eraRewardMult * eventRewardMult * (1 + dangerBonus + powerBonus) * ascendMult;

        // Камни (+ бонус stoneIncome от мирового события)
        // realm кап на 10, luck через sqrt
        const _realmBonus = 1 + Math.min(this.realmIndex, 10) * 0.3;
        const _luckBonus = 1 + Math.sqrt(this.luck) * 0.08;
        if (rewards.stones && rewards.stones.max > 0) {
            const stoneBase = rewards.stones.min + Math.random() * (rewards.stones.max - rewards.stones.min);
            const stoneEventMult = (this.worldEvent && this.worldEvent.modifiers.stoneIncome) || 1;
            const stoneReward = Math.floor(stoneBase * _realmBonus * _luckBonus * totalRewardMult * stoneEventMult);
            this.stones += stoneReward;
            results.push(`+${stoneReward} камней`);
        }

        // Эссенция Дао
        if (rewards.essence && rewards.essence.max > 0) {
            const essBase = rewards.essence.min + Math.random() * (rewards.essence.max - rewards.essence.min);
            const essReward = Math.floor(essBase * _luckBonus * totalRewardMult);
            this.daoEssence += essReward;
            results.push(`+${essReward} эссенции`);
        }

        // Пыль артефактов
        if (rewards.dust && rewards.dust.max > 0) {
            const dustBase = rewards.dust.min + Math.random() * (rewards.dust.max - rewards.dust.min);
            const dustReward = Math.floor(dustBase * _luckBonus * totalRewardMult);
            if (dustReward > 0) {
                this.artifactDust += dustReward;
                results.push(`+${dustReward} пыли`);
            }
        }

        // Пилюли
        if (rewards.pills) {
            const pillBase = rewards.pills.min + Math.random() * (rewards.pills.max - rewards.pills.min);
            const pillReward = Math.floor(pillBase * totalRewardMult);
            if (pillReward > 0) {
                this.pills += pillReward;
                results.push(`+${pillReward} пилюль`);
            }
        }

        // Перк тела для артефактов экспедиций
        const bodyPerks = this.getActiveBodyPerks();

        // Артефакт (шанс масштабируется удачей; если >100%, остаток — шанс второго)
        if (rewards.artifactChance) {
            const tierOrder = ["common", "uncommon", "rare", "epic", "legendary", "divine"];
            const ascData = this.ascendedLocations[loc.id] && loc.ascend ? loc.ascend : null;
            let minTier = (ascData && ascData.artifactMinTier) || rewards.artifactMinTier || null;

            // Дитя Небес: бонус тира артефакта
            if (bodyPerks.artifactTierBonus && minTier) {
                const minIdx = tierOrder.indexOf(minTier);
                const boosted = Math.min(tierOrder.length - 1, minIdx + bodyPerks.artifactTierBonus);
                minTier = tierOrder[boosted];
            }

            const maxTier = (ascData && ascData.artifactMaxTier) || rewards.artifactMaxTier || null;
            const rollArt = () => {
                let art;
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
                art = this.generateArtifact(tier);
                return art;
            };

            let totalChance = rewards.artifactChance * (1 + this.luck * 0.01);

            // Первый артефакт
            const firstChance = Math.min(totalChance, 1);
            if (Math.random() < firstChance) {
                const art = rollArt();
                if (this.addArtifact(art)) {
                    results.push(`артефакт: ${art.name}`);
                }
            }

            // Второй артефакт: базовый шанс локации + остаток сверх 100%
            if (totalChance > 1) {
                const secondChance = rewards.artifactChance + (totalChance - 1);
                if (Math.random() < secondChance) {
                    const art = rollArt();
                    if (this.addArtifact(art)) {
                        results.push(`артефакт (бонус): ${art.name}`);
                    }
                }
            }
        }

        // Дитя Небес (вознесение 3): дополнительный артефакт
        if (bodyPerks.extraArtifact && rewards.artifactChance) {
            const extraArt = this.generateArtifact();
            if (this.addArtifact(extraArt)) {
                results.push(`доп. артефакт: ${extraArt.name}`);
            }
        }

        // Свиток Воли Дао (шанс, включая ascend)
        const scrollAscTier = this.ascendedLocations[loc.id] || 0;
        const ascScrollChance = (scrollAscTier >= 1 && loc.ascend && loc.ascend.scrollChance) ? loc.ascend.scrollChance : 0;
        const effectiveScrollChance = rewards.scrollChance || ascScrollChance;
        // Ascend тир 2+: гарантированные свитки (1-3)
        if (scrollAscTier >= 2) {
            const scrollCount = 1 + Math.floor(Math.random() * 3); // 1-3
            const added = this.addDaoScroll(scrollCount);
            if (added > 0) results.push(`+${added} Свиток Воли Дао`);
        } else if (effectiveScrollChance && Math.random() < effectiveScrollChance) {
            const added = this.addDaoScroll(1);
            if (added > 0) {
                results.push(`+1 Свиток Воли Дао`);
            }
        }

        // Техника (редкий шанс)
        if (rewards.techniqueChance && Math.random() < rewards.techniqueChance) {
            // Найти технику, которой у игрока нет
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

        // Дао прогресс от экспедиции (не для "no_dao" локаций)
        if (this.realmIndex >= 3 && this.sect && loc.daoSect !== "no_dao") {
            // Фиксированный Дао: база по реалму, не от daoNeeded
            const baseDaoByRealm = 15 + this.realmIndex * 8 + (this.subLevel - 1) * 3;
            const baseDao = baseDaoByRealm * (1 + Math.random() * 0.5); // ×1.0-1.5 разброс
            let daoMult = 1;
            const daoSect = loc.daoSect;
            if (daoSect === this.sect.id || daoSect === "current_sect") {
                daoMult = 2;
            }
            const daoSpeedBonus = this.getDaoSpeedMultiplier();
            // Дао не зависит от эпохи и превосходства — только секта и скорость Дао
            const daoGain = baseDao * daoMult * daoSpeedBonus;
            this.daoProgress += daoGain;
            this._checkDaoLevelUp();
            results.push(`+${Math.floor(daoGain)} постижение Дао${daoMult > 1 ? " (×2 секта)" : ""}`);
        }

        addLog(`Экспедиция в "${loc.name}" завершена!`, "breakthrough");
        const bonusParts = [];
        if (eraRewardMult > 1.01) bonusParts.push(`${era.name} ×${eraRewardMult.toFixed(1)}`);
        if (dangerBonus > 0.01) bonusParts.push(`опасность +${Math.round(dangerBonus * 100)}%`);
        if (powerBonus > 0.01) bonusParts.push(`превосходство +${Math.round(powerBonus * 100)}%`);
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
        // При 20 завершениях — слух о вознесении тир 3
        if (this.expeditionCompletions[loc.id] === 20 && this.ascendedLocations[loc.id] === 1) {
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

        const available = ADVENTURES.filter(a =>
            a.condition(this)
            && !this.adventureRumors.find(r => r.id === a.id)
            && !this.activeAdventures.find(aa => aa.id === a.id)
            && !(this.completedAdventures && this.completedAdventures.includes(a.id))
        );
        if (available.length === 0) return;

        const adv = available[Math.floor(Math.random() * available.length)];
        this.addAdventureRumor(adv.id);
        addLog(`Во время экспедиции вы услышали слух: "${adv.rumor}"`, "event");
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
