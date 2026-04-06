// ============================================================
// GAME/PRESTIGE.JS — Духовный корень, карма, перерождение, вознесение тел
// Зависит от: game/state.js, game/formulas.js, game/techniques.js
// ============================================================

Object.assign(game, {
    // === ДУХОВНЫЙ КОРЕНЬ ===

    getAvailableRoots() {
        const available = SPIRITUAL_ROOTS.filter(root => {
            const req = root.unlock;
            if (!req) return true;
            if (req.rebirths && (this.prestige.totalRebirths || 0) < req.rebirths) return false;
            if (req.milestone && !(this.prestige.permanentMilestones || []).includes(req.milestone)) return false;
            return true;
        });
        if (!available.some(r => r.id === "common")) {
            const common = SPIRITUAL_ROOTS.find(r => r.id === "common");
            if (common) available.unshift(common);
        }
        return available;
    },

    // Получить разблокированные элементы для выбора (из мастерства сект)
    getUnlockedElements() {
        const map = {
            mastered_sect_jade_purity: "water",
            mastered_sect_crimson_flame: "fire",
            mastered_sect_moon_lake: "wood",
            mastered_sect_hidden_hermit: "wind",
            mastered_abyss: "void"
        };
        const unlocked = [];
        for (const [key, elem] of Object.entries(map)) {
            if (this.prestige.permanentMilestones.includes(key)) {
                unlocked.push(elem);
            }
        }
        return unlocked;
    },

    // Может ли игрок выбирать элементы (кармический апгрейд + есть разблокированные)
    canChooseElements() {
        return (this.prestige.karmaUpgrades.elementChoice || 0) >= 1 && this.getUnlockedElements().length > 0;
    },

    selectSpiritualRoot(rootId, chosenElements) {
        const chosen = SPIRITUAL_ROOTS.find(r => r.id === rootId);
        if (!chosen) return null;

        let elements = [];
        const maxElements = typeof chosen.elements === "number" ? chosen.elements : (Array.isArray(chosen.elements) ? chosen.elements.length : 0);

        if (chosenElements && chosenElements.length > 0 && this.canChooseElements()) {
            // Игрок выбрал элементы — ограничить количеством слотов корня
            elements = chosenElements.slice(0, maxElements);
        } else if (typeof chosen.elements === "number" && chosen.elements > 0) {
            const shuffled = [...ELEMENTS].sort(() => Math.random() - 0.5);
            elements = shuffled.slice(0, Math.min(chosen.elements, ELEMENTS.length)).map(e => e.id);
        } else if (Array.isArray(chosen.elements)) {
            elements = [...chosen.elements];
        }

        this.spiritualRoot = {
            id: chosen.id,
            name: chosen.name,
            description: chosen.description,
            qiMultiplier: chosen.qiMultiplier,
            elements: elements,
            tier: chosen.tier,
            color: chosen.color
        };

        if (chosen.statBonus) {
            for (const [stat, val] of Object.entries(chosen.statBonus)) {
                this[stat] = (this[stat] || 0) + val;
            }
        }

        return this.spiritualRoot;
    },

    // === АКТИВНЫЙ ПЕРК ТЕЛА ===
    // Возвращает id перка текущего тела (учитывая вознесение)
    getBodyPerk() {
        const body = REBIRTH_BODIES.find(b => b.id === (this.prestige.lastBody || "peasant"));
        return body ? body.perk : null;
    },

    // Уровень вознесения тела
    getBodyAscensionLevel(bodyId) {
        return (this.prestige.bodyAscensions && this.prestige.bodyAscensions[bodyId]) || 0;
    },

    // Активный перк с учётом вознесения — возвращает объект с параметрами
    getActiveBodyPerks() {
        const bodyId = this.prestige.lastBody || "peasant";
        const body = REBIRTH_BODIES.find(b => b.id === bodyId);
        if (!body) return {};

        const ascLevel = this.getBodyAscensionLevel(bodyId);
        const ascensions = BODY_ASCENSIONS[bodyId];

        // Базовые перки тела
        const perks = { id: body.perk };

        // Перки по типу тела
        switch (body.perk) {
            case "karmaBonus":
                perks.karmaBonus = body.karmaBonus;
                break;
            case "stoneIncome":
                perks.stoneIncomeMult = 1.3;
                perks.formationDiscount = 0.2;
                perks.contributionMult = 2.0;
                perks.canExchange = true;
                break;
            case "xpSpeed":
                // Эффект через технику body_masters_legacy
                break;
            case "alchemist":
                perks.refineCount = 4; // рефайн 4:1 вместо 5:1
                perks.carryOver = 0.5;
                perks.disassembleBonus = 0.5;
                break;
            case "warrior":
                perks.expeditionSpeed = 0.3;
                perks.combatMult = 1.3;
                break;
            case "demonPact":
                perks.karmaBonus = 0.25;
                perks.combatMult = 1.5;
                perks.demonStatPct = 0.5;
                break;
            case "daoInsight":
                perks.ascendDiscount = 0.3;
                break;
            case "sectProdigy":
                perks.sectFromRealm0 = true;
                perks.contributionMult = 1.5;
                break;
            case "fortuneBreak":
                perks.demonReduction = 0.5;
                perks.breakthroughBonus = 0.10;
                break;
            case "masterSmith":
                perks.keepFailstacks = true;
                perks.enhanceBonus = 0.1;
                perks.disassembleBonus = 1.0;
                break;
            case "heavenExplorer":
                perks.expeditionSpeed = 0.4;
                perks.artifactTierBonus = 1;
                break;
            case "ancientPower":
                perks.formationBonus = 2;
                break;
            case "arhatWisdom":
                perks.karmaBonus = 0.5;
                perks.freeUpgradeLevel = 1;
                break;
        }

        // Применить вознесение — перезаписывает/усиливает перки
        if (ascLevel > 0 && ascensions) {
            const asc = ascensions[ascLevel - 1]; // 0-indexed
            if (asc && asc.perkUpgrade) {
                Object.assign(perks, asc.perkUpgrade);
            }
        }

        return perks;
    },

    // === ПЕРЕРОЖДЕНИЕ ===

    calculateKarma(naturalDeath) {
        // Минимум realm 3 (Золотое Ядро) для получения кармы
        if (this.realmIndex < 3) return 0;

        let karma = 0;
        // Реалм: экспоненциальная прогрессия (—,—,—,4,7,11,17,25,36,50,68,90,118,152,195)
        karma += this.realmIndex;
        karma += Math.floor(this.characterAge() / 500);
        karma += Math.floor(this.techniques.length * 0.3);
        karma += Math.floor(this.milestones.length * 0.2);
        // Прорывы: считаем только с реалма 3+, после Махаяны каждый прорыв ценен
        let btKarma = 0;
        const subLevels = 4; // SUB_LEVELS
        for (let r = 3; r < this.realmIndex; r++) {
            const perBreak = r >= 9 ? 5 + (r - 9) * 3 : 0.5;
            btKarma += subLevels * perBreak;
        }
        if (this.realmIndex >= 3) {
            btKarma += this.subLevel * (this.realmIndex >= 9 ? 5 + (this.realmIndex - 9) * 3 : 0.5);
        }
        karma += Math.floor(btKarma);
        // Бонус от секты: ранг + вклад
        if (this.sect) {
            karma += this.getSectRankIndex();
            karma += Math.floor((this.sect.contribution || 0) / 300);
        }
        // Бонус кармы от тела (базовый + вознесённый) + формации
        const perks = this.getActiveBodyPerks();
        const bodyKarmaBonus = perks.karmaBonus || 0;
        const formationKarmaBonus = this.getFormationBonus("karmaBonus");
        const artifactKarmaBonus = this.getArtifactBonus("karmaBonus") * 0.01;
        const totalKarmaBonus = bodyKarmaBonus + formationKarmaBonus + artifactKarmaBonus;
        if (totalKarmaBonus > 0) {
            karma = Math.floor(karma * (1 + totalKarmaBonus));
        }
        // Множитель кармы от секты (масштабируется рангом: низкий ранг — штраф, высокий — бонус)
        const sectKarmaMult = this.getSectBonus("karmaMultiplier");
        if (sectKarmaMult && sectKarmaMult !== 0) {
            karma = Math.floor(karma * sectKarmaMult);
        }
        // Бонус кармы от достижений: +1% за каждое бронзовое/серебряное/золотое (только после первого перерождения)
        if (this.prestige.totalRebirths >= 1) {
            let milestoneKarmaBonus = 0;
            for (const mid of this.milestones) {
                const m = MILESTONES.find(x => x.id === mid);
                if (m && (m.tier === "bronze" || m.tier === "silver" || m.tier === "gold")) {
                    milestoneKarmaBonus += 0.01;
                }
            }
            if (milestoneKarmaBonus > 0) {
                karma = Math.floor(karma * (1 + milestoneKarmaBonus));
            }
        }
        // Мудрость Полной Жизни: +50% за естественную смерть
        if (naturalDeath) {
            karma = Math.floor(karma * 1.5);
        }
        return karma;
    },

    isBodyUnlocked(bodyId) {
        const body = REBIRTH_BODIES.find(b => b.id === bodyId);
        if (!body || !body.requirement) return true;
        const req = body.requirement;
        if (req.milestones) {
            for (const mId of req.milestones) {
                // Realm-гейты и immortal: проверяем через milestone.check с текущим состоянием
                const realmMatch = mId.match(/^realm_(\d+)$/);
                if (realmMatch || mId === "immortal") {
                    const milestone = MILESTONES.find(m => m.id === mId);
                    if (milestone && !milestone.check(this)) return false;
                } else {
                    if (!this.prestige.permanentMilestones.includes(mId)) return false;
                }
            }
        }
        // +1 потому что текущее перерождение ещё не засчитано в totalRebirths
        if (req.rebirths && (this.prestige.totalRebirths + 1) < req.rebirths) return false;
        return true;
    },

    applyKarmaUpgrades() {
        // Бонус Золотого Архата: +N бесплатных уровней ко всем улучшениям
        const perks = this.getActiveBodyPerks();
        const freeLevel = perks.freeUpgradeLevel || 0;

        for (const upgrade of KARMA_UPGRADES) {
            const baseLevel = this.prestige.karmaUpgrades[upgrade.id] || 0;
            const level = baseLevel + freeLevel;
            if (level <= 0) continue;
            // Множитель ×2 за уровень (для Кармического Наследия)
            const mult = upgrade.effectMultiplier ? Math.pow(upgrade.effectMultiplier, level - 1) : 1;
            const effectLevel = upgrade.effectMultiplier ? mult : level;
            if (upgrade.effect.strength) this.strength += Math.floor(upgrade.effect.strength * effectLevel);
            if (upgrade.effect.spirit) this.spirit += Math.floor(upgrade.effect.spirit * effectLevel);
            if (upgrade.effect.luck) this.luck += Math.floor(upgrade.effect.luck * effectLevel);
            if (upgrade.effect.stones) this.stones += Math.floor(upgrade.effect.stones * effectLevel);
            if (upgrade.effect.pills) this.pills += Math.floor(upgrade.effect.pills * effectLevel);
            if (upgrade.effect.essence) this.daoEssence += Math.floor(upgrade.effect.essence * effectLevel);
            if (upgrade.effect.dust) this.artifactDust += Math.floor(upgrade.effect.dust * effectLevel);
        }

        // Память Пути: стартовый реалм
        const pathLevel = this.prestige.karmaUpgrades.pathMemory || 0;
        if (pathLevel > 0) {
            const realmStarts = [1, 2, 3, 3];
            const subStarts = [1, 1, 1, 2];
            const newRealm = realmStarts[pathLevel - 1] || 0;
            const newSub = subStarts[pathLevel - 1] || 1;
            if (newRealm > this.realmIndex || (newRealm === this.realmIndex && newSub > this.subLevel)) {
                this.realmIndex = newRealm;
                this.subLevel = newSub;
            }
        }

        // Зов Дао: стартовый уровень Дао
        const daoCallLevel = this.prestige.karmaUpgrades.daoCall || 0;
        if (daoCallLevel > 0) {
            this.daoLevel = Math.max(this.daoLevel, daoCallLevel);
        }

        // Небесные пилюли: перманентные статы
        if (this.prestige.heavenlyStats) {
            if (this.prestige.heavenlyStats.strength) this.strength += this.prestige.heavenlyStats.strength;
            if (this.prestige.heavenlyStats.spirit) this.spirit += this.prestige.heavenlyStats.spirit;
            if (this.prestige.heavenlyStats.luck) this.luck += this.prestige.heavenlyStats.luck;
        }
    },

    // Обмен ресурсов (Торговец)
    exchangeResources(from, to, amount) {
        const perks = this.getActiveBodyPerks();
        if (!perks.canExchange) return false;
        const rates = {
            "stones_dust": 10,      // 10 камней = 1 пыль
            "stones_essence": 15,   // 15 камней = 1 эссенция
            "stones_pills": 20,    // 20 камней = 1 пилюля
            "dust_essence": 2,     // 2 пыли = 1 эссенция
            "essence_dust": 1,     // 1 эссенция = 1 пыль
        };
        const key = from + "_" + to;
        const rate = rates[key];
        if (!rate) return false;
        const cost = rate * amount;
        const sources = { stones: "stones", dust: "artifactDust", essence: "daoEssence", pills: "pills" };
        const targets = { stones: "stones", dust: "artifactDust", essence: "daoEssence", pills: "pills" };
        if (this[sources[from]] < cost) return false;
        this[sources[from]] -= cost;
        this[targets[to]] += amount;
        updateUI();
        return true;
    },

    rebirth(bodyId, naturalDeath) {
        const karmaEarned = this.calculateKarma(naturalDeath);
        this.prestige.karma += karmaEarned;
        this.prestige.totalRebirths++;
        // Сохранить достижения
        for (const m of this.milestones) {
            if (!this.prestige.permanentMilestones.includes(m)) {
                this.prestige.permanentMilestones.push(m);
            }
        }

        // Перенос ресурсов Алхимика
        const oldPerks = this.getActiveBodyPerks();
        const carryDust = Math.floor((this.artifactDust || 0) * (oldPerks.carryOver || 0));
        const carryEssence = Math.floor((this.daoEssence || 0) * (oldPerks.carryOver || 0));

        // Перенос артефактов Воина
        let carryArtifacts = [];
        if (oldPerks.carryArtifacts && oldPerks.carryArtifacts > 0) {
            const tierOrder = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, divine: 5 };
            const sorted = [...this.artifacts].sort((a, b) =>
                (b.enhance || 0) - (a.enhance || 0) || (tierOrder[b.tier] || 0) - (tierOrder[a.tier] || 0)
            );
            carryArtifacts = sorted.slice(0, oldPerks.carryArtifacts);
        }

        // Перенос failstacks Кузнеца
        const carryFailstacks = oldPerks.keepFailstacks ? this.enhanceFailstacks : 0;

        // Сохранить ресурсы прошлой жизни для событий перерождения
        this.prestige.lastLifeResources = {
            stones: this.stones || 0,
            pills: this.pills || 0,
            essence: this.daoEssence || 0,
            dust: this.artifactDust || 0,
            realmIndex: this._maxRealmThisLife || this.realmIndex,
            strength: this.strength,
            spirit: this.spirit,
            luck: this.luck
        };

        this.prestige.lastBody = bodyId;
        // Мир продолжает жить
        const reincarnationGap = 20 + Math.floor(Math.random() * 80);
        this.prestige.worldAge = this.years + reincarnationGap;
        const savedPrestige = JSON.parse(JSON.stringify(this.prestige));

        // Сброс
        this.reset(true);
        this.prestige = savedPrestige;

        // Применить бонусы тела
        const body = REBIRTH_BODIES.find(b => b.id === bodyId);
        if (body) {
            this.strength += body.bonuses.strength || 0;
            this.spirit += body.bonuses.spirit || 0;
            this.luck += body.bonuses.luck || 0;
            this.stones += body.bonuses.stones || 0;
            this.pills += body.bonuses.pills || 0;

            // Вознесение может переопределить startRealm и minRootTier
            const newPerks = this.getActiveBodyPerks();
            const startRealm = newPerks.startRealm || body.startRealm || 0;
            if (startRealm) this.realmIndex = startRealm;

            const minRoot = newPerks.minRoot || body.minRootTier || null;
            this._minRootTier = minRoot;

            // Бонусные статы от вознесения
            if (newPerks.bonusStats) {
                this.strength += newPerks.bonusStats;
                this.spirit += newPerks.bonusStats;
                this.luck += newPerks.bonusStats;
            }
            if (newPerks.bonusLuck) {
                this.luck += newPerks.bonusLuck;
            }

            // Стартовые техники
            for (const techId of (body.startTechniques || [])) {
                if (!TECHNIQUES.find(t => t.id === techId)) {
                    // Техники тел уже в TECHNIQUES (source: "body")
                }
                this.learnTechnique(techId);
            }

            // Бонусная техника от вознесения тела (startTechTier)
            if (newPerks.startTechTier) {
                const tierOrder = ["common", "uncommon", "rare", "epic", "legendary", "divine"];
                const minIdx = tierOrder.indexOf(newPerks.startTechTier);
                const candidates = TECHNIQUES.filter(t =>
                    !this.hasTechnique(t.id) &&
                    t.source !== "sect" && t.source !== "body" &&
                    tierOrder.indexOf(t.tier) >= minIdx &&
                    (!t.requirement || !t.requirement.realm || this.realmIndex >= t.requirement.realm)
                );
                if (candidates.length > 0) {
                    const tech = candidates[Math.floor(Math.random() * candidates.length)];
                    this.learnTechnique(tech.id);
                    addLog(`Наследие прошлой жизни: техника "${tech.name}"!`, "reward");
                }
            }

            // Формации Древнего: стартовые уровни применяются при выборе формации (в selectFormation)

        }

        // Применить кармические улучшения
        this.applyKarmaUpgrades();

        // Перенос ресурсов Алхимика
        if (carryDust > 0) this.artifactDust += carryDust;
        if (carryEssence > 0) this.daoEssence += carryEssence;

        // Перенос артефактов Воина (добавляем к существующим из Памяти Артефактов)
        for (const art of carryArtifacts) {
            if (!this.artifacts.find(a => a.id === art.id)) {
                this.artifacts.push(art);
            }
        }

        // Перенос failstacks Кузнеца
        if (carryFailstacks > 0) this.enhanceFailstacks = carryFailstacks;

        saveGame();
    },

    // === ВОЗНЕСЕНИЕ ТЕЛ ===

    getBodyAscendCost(bodyId) {
        const ascensions = BODY_ASCENSIONS[bodyId];
        if (!ascensions) return Infinity;
        const level = this.getBodyAscensionLevel(bodyId);
        if (level >= ascensions.length) return Infinity;
        let cost = ascensions[level].cost;
        // Скидка Золотого Архата
        const perks = this.getActiveBodyPerks();
        if (perks.bodyAscendDiscount) {
            cost = Math.ceil(cost * (1 - perks.bodyAscendDiscount));
        }
        return cost;
    },

    canAscendBody(bodyId) {
        const ascensions = BODY_ASCENSIONS[bodyId];
        if (!ascensions) return false;
        const level = this.getBodyAscensionLevel(bodyId);
        if (level >= ascensions.length) return false;
        return this.prestige.karma >= this.getBodyAscendCost(bodyId);
    },

    ascendBody(bodyId) {
        if (!this.canAscendBody(bodyId)) return false;
        const cost = this.getBodyAscendCost(bodyId);
        this.prestige.karma -= cost;
        if (!this.prestige.bodyAscensions) this.prestige.bodyAscensions = {};
        this.prestige.bodyAscensions[bodyId] = (this.prestige.bodyAscensions[bodyId] || 0) + 1;
        return true;
    },

    // === КАРМИЧЕСКИЕ УЛУЧШЕНИЯ ===

    getUpgradeCost(upgradeId) {
        const upgrade = KARMA_UPGRADES.find(u => u.id === upgradeId);
        if (!upgrade) return Infinity;
        const level = this.prestige.karmaUpgrades[upgradeId] || 0;
        // Фиксированные цены по уровням (если заданы)
        if (upgrade.costs && upgrade.costs[level] !== undefined) return upgrade.costs[level];
        return Math.ceil(upgrade.cost * (1 + level * 0.5));
    },

    buyKarmaUpgrade(upgradeId) {
        const upgrade = KARMA_UPGRADES.find(u => u.id === upgradeId);
        if (!upgrade) return false;
        if (upgrade.requirement && !upgrade.requirement(this)) return false;
        const level = this.prestige.karmaUpgrades[upgradeId] || 0;
        if (level >= upgrade.maxLevel) return false;
        const cost = this.getUpgradeCost(upgradeId);
        if (this.prestige.karma < cost) return false;
        this.prestige.karma -= cost;
        this.prestige.karmaUpgrades[upgradeId] = level + 1;
        return true;
    },
});
