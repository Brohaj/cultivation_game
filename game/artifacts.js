// ============================================================
// GAME/ARTIFACTS.JS — Артефакты: генерация, экипировка, заточка, разбор
// Зависит от: game/state.js, data/artifacts.js
// ============================================================

Object.assign(game, {
    // === ГЕНЕРАЦИЯ АРТЕФАКТА ===

    generateArtifact(forceTier, forceSlot) {
        const tier = forceTier || this._rollArtifactTier();
        const tierData = ARTIFACT_TIERS[tier];
        const slot = forceSlot || ARTIFACT_SLOTS[Math.floor(Math.random() * ARTIFACT_SLOTS.length)];

        const prefixes = ARTIFACT_PREFIXES[tier];
        const suffixes = ARTIFACT_SUFFIXES[slot];
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];

        const pool = ARTIFACT_EFFECT_POOLS[slot];
        const isHighTier = (tier === "epic" || tier === "legendary" || tier === "divine");
        const numEffects = isHighTier ? 2 : 1;
        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        const chosen = shuffled.slice(0, Math.min(numEffects, pool.length));

        // Редкий бонусный эффект (только epic+, эпоха Сумерки Богов+)
        const era = this.getCurrentEra();
        const rareUnlocked = era && ERAS.indexOf(era) >= ERAS.findIndex(e => e.id === "twilight");
        const rareEffRaw = ARTIFACT_RARE_EFFECTS[slot];
        if (isHighTier && rareEffRaw && numEffects >= 2 && rareUnlocked) {
            const rareEffs = Array.isArray(rareEffRaw) ? [...rareEffRaw].sort(() => Math.random() - 0.5) : [rareEffRaw];
            for (const re of rareEffs) {
                if (Math.random() < re.chance) {
                    chosen[chosen.length - 1] = re;
                    break;
                }
            }
        }

        const effects = {};
        for (const eff of chosen) {
            const range = eff.max - eff.min;
            const tierMin = eff.min + range * 0.5;
            const tierMax = eff.max;
            const rawVal = tierMin + Math.random() * (tierMax - tierMin);
            effects[eff.key] = Math.round(rawVal * tierData.mult * 10) / 10;
        }

        // Нейминг PoE-стиль:
        // 1 стат (common-rare): "[Тир-Префикс] Базовое_Имя Суффикс"  → "Грозовой Меч Силы"
        // 2 стата (epic+):      "[Стат-Аффикс] Базовое_Имя Суффикс"  → "Разящий Меч Удачи"
        let name;
        if (chosen.length >= 2 && ARTIFACT_STAT_AFFIXES[chosen[0].key]) {
            const affixByTier = ARTIFACT_STAT_AFFIXES[chosen[0].key][tier];
            const affix = affixByTier || ARTIFACT_STAT_AFFIXES[chosen[0].key].epic;
            const statSuffix = ARTIFACT_EFFECT_SUFFIXES[chosen[1].key] || "";
            name = `${affix[suffix.g]} ${suffix.name}${statSuffix ? ` ${statSuffix}` : ""}`;
        } else {
            const statSuffix = chosen[0] && ARTIFACT_EFFECT_SUFFIXES[chosen[0].key]
                ? ` ${ARTIFACT_EFFECT_SUFFIXES[chosen[0].key]}`
                : "";
            name = `${prefix[suffix.g]} ${suffix.name}${statSuffix}`;
        }

        this._artifactIdSerial = (this._artifactIdSerial || 0) + 1;
        let artifactId = "art_" + Date.now() + "_" + this._artifactIdSerial + "_" + Math.floor(Math.random() * 10000);
        while (this.artifacts.some(artifact => artifact.id === artifactId)) artifactId += "_next";
        return {
            id: artifactId,
            name,
            slot,
            tier,
            effects,
            enhance: 0,              // уровень заточки +0..+10
            transcend: 0,            // уровень слияния 0..5 (PRI-PEN)
            investedEssence: 0,       // эссенция потраченная на УСПЕШНЫЕ заточки
            investedDust: 0,          // пыль потраченная на УСПЕШНЫЕ заточки
        };
    },

    _rollArtifactTier() {
        const tiers = Object.entries(ARTIFACT_TIERS);
        const totalWeight = tiers.reduce((sum, [, t]) => sum + t.dropWeight, 0);
        let roll = Math.random() * totalWeight;
        for (const [key, t] of tiers) {
            roll -= t.dropWeight;
            if (roll <= 0) return key;
        }
        return "common";
    },

    // === ИНВЕНТАРЬ ===

    addArtifact(artifact) {
        if (this.artifacts.length >= ARTIFACT_MAX_INVENTORY) {
            addLog("Инвентарь артефактов полон! Освободите место.", "danger");
            return false;
        }
        this.artifacts.push(artifact);
        const tierData = ARTIFACT_TIERS[artifact.tier];
        addLog(`Получен артефакт: ${artifact.name} (${tierData.name})`, "reward");
        return true;
    },

    removeArtifact(artifactId) {
        const equipped = this.equippedArtifacts;
        let affectsTime = false;
        for (const slot of ARTIFACT_SLOTS) {
            if (equipped[slot] && equipped[slot].id === artifactId) {
                affectsTime = !!equipped[slot].effects.timeSpeed;
                equipped[slot] = null;
                break;
            }
        }
        this.artifacts = this.artifacts.filter(a => a.id !== artifactId);
        if (affectsTime) this.refreshTimers();
    },

    // === ЭКИПИРОВКА ===

    equipArtifact(artifactId) {
        if (this.gameOver || this.pendingRebirth) return false;
        const artifact = this.artifacts.find(a => a.id === artifactId);
        if (!artifact) return false;
        const current = this.equippedArtifacts[artifact.slot];
        if (current && current.id === artifactId) return false;
        this.equippedArtifacts[artifact.slot] = artifact;
        addLog(`Экипирован: ${artifact.name}`, "system");
        if (artifact.effects.timeSpeed || (current && current.effects.timeSpeed)) this.refreshTimers();
        return true;
    },

    unequipArtifact(slot) {
        if (this.gameOver || this.pendingRebirth) return false;
        if (!this.equippedArtifacts[slot]) return false;
        const art = this.equippedArtifacts[slot];
        const name = art.name;
        const hadTimeSpeed = art.effects.timeSpeed;
        this.equippedArtifacts[slot] = null;
        addLog(`Снят: ${name}`, "system");
        if (hadTimeSpeed) this.refreshTimers();
        return true;
    },

    // === ЗАТОЧКА (Enhancement, BDO-style) ===

    getEnhanceCost(artifact) {
        if (!artifact || artifact.enhance >= ENHANCE_MAX || (artifact.transcend || 0) > 0) return null;
        const row = ENHANCE_TABLE[artifact.enhance];
        return { essence: row.essence, dust: row.dust, chance: row.chance, croneStones: row.croneStones };
    },

    getEnhanceChance(artifact) {
        if (!artifact) return 0;
        const row = ENHANCE_TABLE[artifact.enhance];
        if (!row) return 0;
        // Кузнец Древних: бонус к шансу заточки
        const perks = this.getActiveBodyPerks();
        const enhanceBonus = perks.enhanceBonus || 0;
        const scrollBonus = (this.scrollFailstacksApplied || 0) * 0.02; // каждый свиток = +2%
        // Штраф тира: выше тир = ниже шанс
        const tierPenalty = { common: 0, uncommon: 0.03, rare: 0.06, epic: 0.10, legendary: 0.15, divine: 0.20 };
        const penalty = tierPenalty[artifact.tier] || 0;
        return Math.min(1.0, Math.max(0.01, row.chance - penalty + this.enhanceFailstacks * 0.02 + scrollBonus + enhanceBonus));
    },

    enhanceArtifact(artifactId, useCrone) {
        if (this.gameOver || this.pendingRebirth) return { success: false, reason: "closedLife" };
        const artifact = this.artifacts.find(a => a.id === artifactId);
        if (!artifact || artifact.enhance >= ENHANCE_MAX || (artifact.transcend || 0) > 0) return { success: false, reason: "max" };

        const row = ENHANCE_TABLE[artifact.enhance];
        if (this.daoEssence < row.essence) return { success: false, reason: "essence" };
        if (this.artifactDust < row.dust) return { success: false, reason: "dust" };
        if (useCrone && row.croneStones > 0 && this.stones < row.croneStones) return { success: false, reason: "stones" };

        // Оплата материалов
        this.daoEssence -= row.essence;
        this.artifactDust -= row.dust;
        if (useCrone && row.croneStones > 0) {
            this.stones -= row.croneStones;
        }

        const chance = this.getEnhanceChance(artifact);
        const roll = Math.random();

        if (roll < chance) {
            // УСПЕХ
            artifact.enhance++;
            artifact.investedEssence += row.essence;
            artifact.investedDust += row.dust;
            this.enhanceFailstacks = 0;
            this.scrollFailstacksApplied = 0;
            addLog(`\u2728 Заточка успешна! ${artifact.name} +${artifact.enhance}`, "breakthrough");
            if (artifact.effects.timeSpeed) this.refreshTimers();
            saveGame();
            return { success: true, level: artifact.enhance };
        } else {
            // ПРОВАЛ — свитки НЕ пропадают, только обычные фейлстаки растут
            this.enhanceFailstacks++;
            addLog(`Заточка провалилась! Воля Дао: ${this.enhanceFailstacks}`, "danger");

            // Даунгрейд (если не защищён кронкой)
            if (!useCrone || row.croneStones === 0) {
                // Кузнец Древних: safeEnhance — нет даунгрейда до +N
                const perks2 = this.getActiveBodyPerks();
                if (perks2.safeEnhance && artifact.enhance <= perks2.safeEnhance) {
                    addLog("Мастерство Кузнеца защитило артефакт от падения!", "system");
                } else {
                    let downgradeChance = getEnhanceDowngradeChance(artifact.enhance);
                    // Кузнец Древних ★1: downgradeReduction — снижение шанса даунгрейда
                    if (perks2.downgradeReduction) {
                        downgradeChance = Math.max(0, downgradeChance * (1 - perks2.downgradeReduction));
                    }
                    if (downgradeChance > 0 && Math.random() < downgradeChance) {
                        artifact.enhance = Math.max(0, artifact.enhance - 1);
                        addLog(`${artifact.name} упал до +${artifact.enhance}!`, "danger");
                        if (artifact.effects.timeSpeed) this.refreshTimers();
                        saveGame();
                        return { success: false, downgraded: true, level: artifact.enhance };
                    }
                }
            } else if (useCrone && row.croneStones > 0) {
                addLog("Духовные камни защитили артефакт от падения.", "system");
            }

            saveGame();
            return { success: false, downgraded: false, level: artifact.enhance };
        }
    },

    // === СЛИЯНИЕ (Transcend) ===

    getTranscendMult(transcend) {
        return TRANSCEND_MULTS[transcend || 0] || 1;
    },

    // Полный множитель: экспоненциальная заточка × transcend (PRI=×2, DUO=×3, TRI=×4, TET=×6, PEN=×8)
    getArtifactEffectMult(artifact) {
        return this.getEnhanceMult(artifact.enhance) * this.getTranscendMult(artifact.transcend);
    },

    // Список кандидатов для слияния (тот же transcend, любой слот)
    // transcend 0: оба должны быть +10. transcend 1+: заточка не важна.
    getFusionCandidates(artifactId) {
        const artifact = this.artifacts.find(a => a.id === artifactId);
        if (!artifact) return [];
        const t = artifact.transcend || 0;
        if (t >= TRANSCEND_MAX) return [];
        if (t === 0 && artifact.enhance < ENHANCE_MAX) return [];
        return this.artifacts.filter(a =>
            a.id !== artifactId &&
            (a.transcend || 0) === t &&
            (t > 0 || a.enhance >= ENHANCE_MAX)
        );
    },

    canFuseArtifact(artifactId) {
        if (this.gameOver || this.pendingRebirth) return false;
        const artifact = this.artifacts.find(a => a.id === artifactId);
        if (!artifact) return false;
        const t = artifact.transcend || 0;
        if (t >= TRANSCEND_MAX) return false;
        if (t === 0 && artifact.enhance < ENHANCE_MAX) return false;
        const cost = TRANSCEND_COST[t];
        const fusePerks = this.getActiveBodyPerks();
        const fusionDiscount = fusePerks.fusionDiscount || 0;
        const essenceCost = fusionDiscount > 0 ? Math.ceil(cost.essence * (1 - fusionDiscount)) : cost.essence;
        const dustCost = fusionDiscount > 0 ? Math.ceil(cost.dust * (1 - fusionDiscount)) : cost.dust;
        if (this.daoEssence < essenceCost || this.artifactDust < dustCost) return false;
        return this.getFusionCandidates(artifactId).length > 0;
    },

    fuseArtifacts(keepId, consumeId) {
        if (this.gameOver || this.pendingRebirth) return false;
        if (keepId === consumeId) return false;
        const keep = this.artifacts.find(a => a.id === keepId);
        const consume = this.artifacts.find(a => a.id === consumeId);
        if (!keep || !consume) return false;
        const t = keep.transcend || 0;
        if ((consume.transcend || 0) !== t) return false;
        if (t >= TRANSCEND_MAX) return false;
        // Для первого слияния (0→PRI) оба должны быть +10
        if (t === 0 && (keep.enhance < ENHANCE_MAX || consume.enhance < ENHANCE_MAX)) return false;

        const cost = TRANSCEND_COST[t];
        // Кузнец Древних: скидка на слияние
        const fusePerks = this.getActiveBodyPerks();
        const fusionDiscount = fusePerks.fusionDiscount || 0;
        const essenceCost = fusionDiscount > 0 ? Math.ceil(cost.essence * (1 - fusionDiscount)) : cost.essence;
        const dustCost = fusionDiscount > 0 ? Math.ceil(cost.dust * (1 - fusionDiscount)) : cost.dust;
        if (this.daoEssence < essenceCost || this.artifactDust < dustCost) return false;

        // Оплата
        this.daoEssence -= essenceCost;
        this.artifactDust -= dustCost;

        // Снять расходный с экипировки если надет
        for (const slot of ARTIFACT_SLOTS) {
            if (this.equippedArtifacts[slot]?.id === consumeId) {
                this.equippedArtifacts[slot] = null;
                break;
            }
        }

        // Удалить расходный
        this.artifacts = this.artifacts.filter(a => a.id !== consumeId);

        // Повысить (заточка сохраняется — жертва артефакта и ресурсов достаточная цена)
        keep.transcend = t + 1;
        // keep.enhance сохраняется
        keep.investedEssence = 0;
        keep.investedDust = 0;

        const newName = TRANSCEND_NAMES[keep.transcend];
        addLog(`\u2728 Слияние успешно! ${keep.name} → ${newName}!`, "breakthrough");
        this.refreshTimers();
        updateUI();
        return true;
    },

    // === РАЗБОР АРТЕФАКТА ===

    getDisassembleReward(artifact) {
        const baseDust = DISASSEMBLE_DUST[artifact.tier] || 1;
        const baseEssence = (typeof DISASSEMBLE_ESSENCE !== "undefined" ? DISASSEMBLE_ESSENCE[artifact.tier] : 0) || 0;
        const transcendBonus = (artifact.transcend || 0) * baseDust * 2;
        const refundDust = Math.floor((artifact.investedDust || 0) * 0.5);
        const refundEssence = Math.floor((artifact.investedEssence || 0) * 0.5);
        let dust = baseDust + transcendBonus;
        let essence = baseEssence + transcendBonus;
        // Перки усиливают добычу, но не возврат вложенных ресурсов.
        const perks = this.getActiveBodyPerks();
        if (perks.disassembleBonus) {
            dust = Math.floor(dust * (1 + perks.disassembleBonus));
            essence = Math.floor(essence * (1 + perks.disassembleBonus));
        }
        // Бонус Дао секты к разбору (Лунное Озеро)
        const sectDisBonus = this.getSectBonus("disassembleBonus");
        if (sectDisBonus > 0) {
            dust = Math.floor(dust * (1 + sectDisBonus));
            essence = Math.floor(essence * (1 + sectDisBonus));
        }
        return { dust: dust + refundDust, essence: essence + refundEssence };
    },

    disassembleArtifact(artifactId) {
        if (this.gameOver || this.pendingRebirth) return false;
        const artifact = this.artifacts.find(a => a.id === artifactId);
        if (!artifact) return false;

        // Нельзя разобрать экипированный
        for (const slot of ARTIFACT_SLOTS) {
            if (this.equippedArtifacts[slot]?.id === artifactId) {
                addLog("Снимите артефакт перед разбором!", "system");
                return false;
            }
        }

        const reward = this.getDisassembleReward(artifact);
        this.artifactDust += reward.dust;
        this.daoEssence += reward.essence;
        this.removeArtifact(artifactId);

        // Без лога — итог виден в UI
        return true;
    },

    // === СВИТКИ ВОЛИ ДАО ===

    useDaoScroll() {
        if (this.gameOver || this.pendingRebirth) return false;
        if (!this.daoScrolls || this.daoScrolls <= 0) return false;
        const maxScrolls = 10;
        if ((this.scrollFailstacksApplied || 0) >= maxScrolls) {
            addLog(`Уже применено ${maxScrolls} свитков (макс. +20%).`, "system");
            return false;
        }
        this.daoScrolls--;
        this.scrollFailstacksApplied = (this.scrollFailstacksApplied || 0) + 1;
        addLog(`Свиток Воли Дао применён! Бонус свитков: +${this.scrollFailstacksApplied * 2}% (${this.scrollFailstacksApplied}/${maxScrolls})`, "reward");
        return true;
    },

    addDaoScroll(count) {
        this.daoScrolls = (this.daoScrolls || 0) + count;
        return count;
    },

    // === БОНУСЫ ===

    // Экспоненциальный бонус заточки: +5=×2.5, +10=×6.2
    getEnhanceMult(enhance) {
        const e = enhance || 0;
        if (e === 0) return 1;
        return Math.pow(1.2, e);
    },

    getArtifactBonus(effectKey) {
        let total = 0;
        for (const slot of ARTIFACT_SLOTS) {
            const art = this.equippedArtifacts[slot];
            if (!art || !art.effects[effectKey]) continue;
            total += art.effects[effectKey] * this.getArtifactEffectMult(art);
        }
        // Софт-кап для %-эффектов: после 50 растёт медленнее (pow 0.7)
        // Flat-эффекты (combatPower, spirit, strength) не капятся
        const FLAT_EFFECTS = ["combatPower", "spirit", "strength"];
        if (!FLAT_EFFECTS.includes(effectKey) && total > 0) {
            total = softcap(total, 50, 0.7);
        }
        return total;
    },

    getArtifactEffectNames(artifact) {
        const result = [];
        const enhanceMult = this.getArtifactEffectMult(artifact);
        for (const [key, val] of Object.entries(artifact.effects)) {
            let name = key;
            const pool = ARTIFACT_EFFECT_POOLS[artifact.slot];
            if (pool) {
                const found = pool.find(e => e.key === key);
                if (found) name = found.name;
            }
            // Редкие бонусные эффекты
            const rareRaw = ARTIFACT_RARE_EFFECTS[artifact.slot];
            if (rareRaw) {
                const rares = Array.isArray(rareRaw) ? rareRaw : [rareRaw];
                const found = rares.find(r => r.key === key);
                if (found) name = found.name;
            }
            const displayVal = Math.round(val * enhanceMult * 10) / 10;
            result.push({ name, value: displayVal, key });
        }
        return result;
    },

    // === ASCEND ТЕХНИК ===

    getTechAscendInfo(techId) {
        const tech = TECHNIQUES.find(t => t.id === techId);
        if (!tech) return null;
        const level = this.techLevels[techId] || 1;
        if (level < tech.maxLevel) return null; // не на макс уровне

        const row = TECH_ASCEND_TABLE.find(r => r.from === tech.tier);
        if (!row) return null; // уже на макс тире
        // Стоимость остаётся правдивой и в закрытой жизни; доступность отдельна.
        const perks = this.getActiveBodyPerks();
        const discount = perks.ascendDiscount || 0;
        const discountedEssence = discount > 0 ? Math.ceil(row.essence * (1 - discount)) : row.essence;
        if (this.gameOver || this.pendingRebirth) return { ...row, essence: discountedEssence, locked: true, closedLife: true };
        if (this._pendingInsightXP && this._pendingInsightXP[techId] > 0) {
            return { ...row, locked: true, insightPending: true };
        }
        if (row.eraReq && !this.hasReachedEra(row.eraReq)) return { ...row, locked: true, eraLocked: true };
        if (this.realmIndex < row.realmReq) return { ...row, locked: true };
        // Отшельник Дао: скидка на вознесение техник
        return { ...row, essence: discountedEssence, locked: false };
    },

    ascendTechnique(techId) {
        if (this.gameOver || this.pendingRebirth) return false;
        const info = this.getTechAscendInfo(techId);
        if (!info || info.locked) return false;
        if (this.daoEssence < info.essence) {
            addLog("Недостаточно Эссенции Дао!", "danger");
            return false;
        }

        const tech = TECHNIQUES.find(t => t.id === techId);
        if (!tech) return false;

        // Динамические техники тоже должны сохранять исходные данные для сброса.
        rememberTechniqueOriginal(tech);
        this.daoEssence -= info.essence;
        const oldName = tech.name;
        tech.tier = info.to;
        // Эволюция имени при вознесении
        if (tech.ascendNames && tech.ascendNames[info.to]) {
            tech.name = tech.ascendNames[info.to];
        }
        // Эволюция описания при вознесении
        if (tech.ascendDescriptions && tech.ascendDescriptions[info.to]) {
            tech.description = tech.ascendDescriptions[info.to];
        } else {
            // Авто-описание по тиру
            const autoDesc = {
                uncommon: `Техника окрепла. Ци течёт глубже, каждое движение — точнее.`,
                rare:     `Годы практики кристаллизовались в мастерство. Немногие постигают этот уровень.`,
                epic:     `Техника превзошла границы обычного. Воздух вибрирует при каждом применении.`,
                legendary:`Забытое искусство, возрождённое вашим постижением. Мир замирает, когда вы его применяете.`,
                divine:   `Вы не используете технику — вы стали ею. Грань между вами и Дао стёрлась.`,
            };
            if (autoDesc[info.to]) tech.description = autoDesc[info.to];
        }
        this.techLevels[techId] = 1;
        this.techXP[techId] = 0;
        this.refreshTimers();

        const tierNames = { uncommon: "Духовная", rare: "Мистическая", epic: "Небесная", legendary: "Священная", divine: "Божественная" };
        const tierLabel = tierNames[info.to] || info.to;
        if (tech.name !== oldName) {
            addLog(`\u2728 «${oldName}» трансформировалась в «${tech.name}»! [${tierLabel}]`, "breakthrough");
        } else {
            addLog(`\u2728 Техника «${tech.name}» вознесена! [${tierLabel}]`, "breakthrough");
        }
        return true;
    },

    // Сохранение/загрузка вознесённых тиров и имён
    _getAscendedTiers() {
        const result = {};
        for (const tech of TECHNIQUES) {
            if (TECHNIQUES_ORIGINAL_TIERS[tech.id] && tech.tier !== TECHNIQUES_ORIGINAL_TIERS[tech.id]) {
                result[tech.id] = tech.tier;
            }
        }
        return result;
    },

    _restoreAscendedTiers(map) {
        if (!map) return;
        for (const [techId, tier] of Object.entries(map)) {
            const tech = TECHNIQUES.find(t => t.id === techId);
            if (tech) {
                tech.tier = tier;
                if (tech.ascendNames && tech.ascendNames[tier]) {
                    tech.name = tech.ascendNames[tier];
                }
                if (tech.ascendDescriptions && tech.ascendDescriptions[tier]) {
                    tech.description = tech.ascendDescriptions[tier];
                } else {
                    const autoDesc = {
                        uncommon: "Техника окрепла. Ци течёт глубже, каждое движение — точнее.",
                        rare:     "Годы практики кристаллизовались в мастерство. Немногие постигают этот уровень.",
                        epic:     "Техника превзошла границы обычного. Воздух вибрирует при каждом применении.",
                        legendary:"Забытое искусство, возрождённое вашим постижением. Мир замирает, когда вы его применяете.",
                        divine:   "Вы не используете технику — вы стали ею. Грань между вами и Дао стёрлась.",
                    };
                    if (autoDesc[tier]) tech.description = autoDesc[tier];
                }
            }
        }
    },
});
