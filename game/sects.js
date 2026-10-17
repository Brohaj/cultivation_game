// ============================================================
// GAME/SECTS.JS — Логика сект: вступление, ранги, задания, бонусы
// Зависит от: game/state.js, data/sects/*
// ============================================================

Object.assign(game, {
    // === ПРОВЕРКА ТРЕБОВАНИЙ ===

    canJoinSect(sectId) {
        if (this.gameOver || this.pendingRebirth) return false;
        const sect = SECTS.find(s => s.id === sectId);
        if (!sect) return false;
        if (this.sect) return false; // уже в секте

        const req = sect.requirement;
        // Гений Секты: доступ к сектам с реалма 0
        const perks = this.getActiveBodyPerks();
        const bypassRealm = perks.sectFromRealm0 || false;
        if (req.realm && !bypassRealm && this.realmIndex < req.realm) return false;
        if (req.milestone && !this.milestones.includes(req.milestone)) return false;
        if (req.rebirths && this.prestige.totalRebirths < req.rebirths) return false;
        return true;
    },

    // === ВСТУПЛЕНИЕ ===

    joinSect(sectId) {
        if (!this.canJoinSect(sectId)) return false;
        const sect = SECTS.find(s => s.id === sectId);
        if (!sect) return false;

        // Гений Секты (вознесение): стартовый ранг
        const bodyPerks = this.getActiveBodyPerks();
        const ranks = getSectRanks(sectId);
        const startRank = Math.max(0, Math.min(bodyPerks.startRank || 0, ranks.length - 1));

        this.sect = {
            id: sectId,
            rank: startRank,
            contribution: 0
        };
        // Выучить технику секты (начальная)
        const techData = SECT_TECHNIQUES[sect.technique];
        if (techData && !this.hasTechnique(techData.id)) {
            // Добавляем технику в глобальный массив если её нет
            if (!TECHNIQUES.find(t => t.id === techData.id)) {
                TECHNIQUES.push(techData);
            }
            this.learnTechnique(techData.id);
            addLog(`Изучена техника секты: ${techData.name}!`, "reward");
        }
        // Стартовый ранг тела действует и при раннем вступлении с реалма 0.
        this._syncSectRank(false);

        // Разблокировать формации секты навсегда
        if (sect.formations) {
            if (!this.prestige.unlockedFormations) this.prestige.unlockedFormations = [];
            for (const fId of sect.formations) {
                if (!this.prestige.unlockedFormations.includes(fId)) {
                    this.prestige.unlockedFormations.push(fId);
                    const formation = CULT_FORMATIONS.find(f => f.id === fId);
                    if (formation) {
                        addLog(`Формация разблокирована: "${formation.name}"!`, "reward");
                    }
                }
            }
        }

        this.flags.joinedSect = true;
        // Перманентный трекинг посещённых сект (для достижений)
        const visitedKey = "visited_sect_" + sectId;
        if (!this.prestige.permanentMilestones.includes(visitedKey)) {
            this.prestige.permanentMilestones.push(visitedKey);
        }
        addLog(`Вы вступили в "${sect.name}"!`, "breakthrough");
        // Кулдаун заданий: 5 лет если недавно покидали секту
        const leftYear = this.flags.leftSectYear || 0;
        const rejoinCooldown = 5;
        const yearsSinceLeft = this.years - leftYear;
        if (leftYear > 0 && yearsSinceLeft < rejoinCooldown) {
            const wait = rejoinCooldown - yearsSinceLeft;
            this.sectMissions = [];
            this.sectMissionTimer = wait;
            addLog(`Новый ученик находится на испытательном сроке. Задания через ${wait} ${_plural(wait, "год", "года", "лет")}.`, "system");
        } else {
            this.generateSectMissions();
            this.sectMissionTimer = this.getSectMissionCooldown();
        }
        this.checkMilestones();
        if (typeof this._getDiscipleState === "function") this._getDiscipleState().sectId = this.sect.id;
        if (typeof this.getDiscipleCandidates === "function") this.getDiscipleCandidates();
        updateUI();
        return true;
    },

    leaveSect() {
        if (!this.sect || this.gameOver || this.pendingRebirth) return false;
        if (typeof this._clearDiscipleRoster === "function") this._clearDiscipleRoster();
        const sect = SECTS.find(s => s.id === this.sect.id);
        // Сохранить уровень Дао перед уходом
        if (sect && this.daoLevel > 0) {
            if (!this.prestige.daoLevels) this.prestige.daoLevels = {};
            this.prestige.daoLevels[sect.id] = Math.max(this.prestige.daoLevels[sect.id] || 0, this.daoLevel);
        }
        const daoLabel = sect ? (sect.daoDisplayName || "Дао") : "Дао";
        addLog(`Вы покинули "${sect ? sect.name : 'секту'}". ${daoLabel} (ур. ${this.daoLevel}) сохранён в памяти, но при вступлении в новую секту постижение начнётся с нуля — это другой Путь.`, "system");
        // Снять и заблокировать техники секты
        if (sect) {
            const sectTechIds = [];
            if (sect.technique) {
                const bt = SECT_TECHNIQUES[sect.technique];
                if (bt) sectTechIds.push(bt.id);
            }
            if (sect.advancedTechnique) {
                const at = SECT_TECHNIQUES[sect.advancedTechnique];
                if (at) sectTechIds.push(at.id);
            }
            for (const tid of sectTechIds) {
                // Снять из экипированных
                const eqIdx = this.equippedTechniques.indexOf(tid);
                if (eqIdx !== -1) {
                    this.equippedTechniques.splice(eqIdx, 1);
                    const tech = TECHNIQUES.find(t => t.id === tid);
                    addLog(`Техника "${tech ? tech.name : tid}" снята — вы покинули секту.`, "system");
                }
                // Убрать из изученных
                const tIdx = this.techniques.indexOf(tid);
                if (tIdx !== -1) this.techniques.splice(tIdx, 1);
            }
            // Убрать техники секты из глобального массива
            for (let i = TECHNIQUES.length - 1; i >= 0; i--) {
                if (TECHNIQUES[i].source === "sect" && sectTechIds.includes(TECHNIQUES[i].id)) {
                    TECHNIQUES.splice(i, 1);
                }
            }
        }
        this.sect = null;
        this.sectMissions = [];
        this.sectMissionTimer = 0;
        this.daoProgress = 0;
        this.daoLevel = 0;
        this.flags.leftSectYear = this.years;
        updateUI();
        return true;
    },

    // === ПОЖЕРТВОВАНИЕ ПИЛЮЛЬ ===

    getSectPillDonationRemaining(index) {
        const mission = this.sectMissions?.[index];
        if (!this.sect || mission?.templateId !== "donate_pills_sect"
            || !mission.reward || mission.cooldown > 0 || !mission.check?.pillsDonated) return null;
        const donated = (this.flags.pillsDonated || 0) - (mission.pillsDonatedAtStart || 0);
        return Math.max(0, mission.check.pillsDonated - donated);
    },

    donatePillsForMission(index) {
        const remaining = this.getSectPillDonationRemaining(index);
        if (remaining === null || this.gameOver || this.pendingRebirth
            || (typeof this.isDiscipleSlotBlocked === "function" && this.isDiscipleSlotBlocked(index))) return false;
        // Старый сейв мог сохранить уже готовое поручение до его автозачёта.
        if (remaining === 0) {
            if (!this.completeSectMission(index)) return false;
            this.checkMilestones();
            updateUI();
            if (typeof renderSects === "function") renderSects();
            return true;
        }
        // При нехватке не списываем часть: один клик всегда закрывает поручение.
        if (this.pills < remaining) return false;
        return this.donatePills(remaining);
    },

    donatePills(amount) {
        if (!this.sect || this.gameOver || this.pendingRebirth || this.pills < amount || amount <= 0) return false;
        const rankIdx = this.getSectRankIndex();
        // Вклад растёт с рангом: 5 / 8 / 12 / 16 / 20 за пилюлю
        const contribPerPill = [5, 8, 12, 16, 20][rankIdx] || 5;
        // Бонус камней с ранга 2+
        const stonesPerPill = rankIdx >= 2 ? [0, 0, 2, 4, 5][rankIdx] : 0;
        // Бонус эссенции с ранга 4
        const essencePerPill = rankIdx >= 4 ? 1 : 0;

        this.pills -= amount;
        // Трекинг для миссий пожертвования
        this.flags.pillsDonated = (this.flags.pillsDonated || 0) + amount;
        const oldRankIdx = this.getSectRankIndex();
        const donatePerks = this.getActiveBodyPerks();
        const donateMult = donatePerks.contributionMult || 1;
        const contrib = Math.floor(contribPerPill * amount * donateMult);
        this.sect.contribution += contrib;
        const stones = stonesPerPill * amount;
        if (stones > 0) this.stones += stones;
        const essence = essencePerPill * amount;
        if (essence > 0) this.daoEssence += essence;

        const parts = [`+${contrib} вклад`];
        if (stones > 0) parts.push(`+${stones} камней`);
        if (essence > 0) parts.push(`+${essence} эссенции`);
        addLog(`Пожертвовано ${amount} ${_plural(amount, "пилюля", "пилюли", "пилюль")} секте. ${parts.join(", ")}.`, "reward");

        // Проверка повышения ранга
        const newRankIdx = this.getSectRankIndex();
        if (newRankIdx > oldRankIdx) {
            const ranks = getSectRanks(this.sect.id);
            const newRank = ranks[newRankIdx];
            this.sect.rank = newRankIdx;
            addLog(`Повышение! Новый ранг: ${newRank.name}`, "breakthrough");
            if (newRank.unlockTechnique) {
                const sect = SECTS.find(s => s.id === this.sect.id);
                if (sect && sect.advancedTechnique) {
                    const advTech = SECT_TECHNIQUES[sect.advancedTechnique];
                    if (advTech && !this.hasTechnique(advTech.id)) {
                        if (!TECHNIQUES.find(t => t.id === advTech.id)) TECHNIQUES.push(advTech);
                        this.learnTechnique(advTech.id);
                        addLog(`Изучена продвинутая техника секты: ${advTech.name}!`, "reward");
                    }
                }
            }
        }

        // Сдача уже выполнила требование задания: выдаём его обычную награду
        // после повышения от пожертвования, чтобы учесть актуальный ранг.
        const completedDonationMissions = this._completePillDonationMissions();
        this.checkMilestones();
        updateUI();
        if (completedDonationMissions > 0 || this.getSectRankIndex() > oldRankIdx) {
            if (typeof renderSects === "function") renderSects();
        } else {
            if (typeof updateSectRankBar === "function") updateSectRankBar();
        }
        return true;
    },

    donateStones(amount) {
        if (!this.sect || this.gameOver || this.pendingRebirth || this.stones < amount || amount <= 0) return false;
        const rankIdx = this.getSectRankIndex();
        // 10 камней = 1 вклад базовый, растёт с рангом
        const contribPer10 = [1, 2, 3, 4, 5][rankIdx] || 1;
        const donatePerksS = this.getActiveBodyPerks();
        const donateMultS = donatePerksS.contributionMult || 1;
        const contrib = Math.floor(amount / 10 * contribPer10 * donateMultS);
        if (contrib <= 0) return false;

        this.stones -= amount;
        const oldRankIdx = this.getSectRankIndex();
        this.sect.contribution += contrib;
        addLog(`Пожертвовано ${amount} камней секте. +${contrib} вклад.`, "reward");

        const newRankIdx = this.getSectRankIndex();
        if (newRankIdx > oldRankIdx) {
            const ranks = getSectRanks(this.sect.id);
            const newRank = ranks[newRankIdx];
            this.sect.rank = newRankIdx;
            addLog(`Повышение! Новый ранг: ${newRank.name}`, "breakthrough");
            if (newRank.unlockTechnique) {
                const sect = SECTS.find(s => s.id === this.sect.id);
                if (sect && sect.advancedTechnique) {
                    const advTech = SECT_TECHNIQUES[sect.advancedTechnique];
                    if (advTech && !this.hasTechnique(advTech.id)) {
                        if (!TECHNIQUES.find(t => t.id === advTech.id)) TECHNIQUES.push(advTech);
                        this.learnTechnique(advTech.id);
                        addLog(`Изучена продвинутая техника секты: ${advTech.name}!`, "reward");
                    }
                }
            }
        }
        this.checkMilestones();
        updateUI();
        if (newRankIdx > oldRankIdx) {
            if (typeof renderSects === "function") renderSects();
        } else {
            if (typeof updateSectRankBar === "function") updateSectRankBar();
        }
        return true;
    },

    donateEssence(amount) {
        if (!this.sect || this.gameOver || this.pendingRebirth || this.daoEssence < amount || amount <= 0) return false;
        const rankIdx = this.getSectRankIndex();
        // 1 эссенция = 2 вклада базовый, растёт с рангом
        const contribPerEssence = [2, 3, 5, 7, 10][rankIdx] || 2;
        const donatePerksE = this.getActiveBodyPerks();
        const donateMultE = donatePerksE.contributionMult || 1;
        const contrib = Math.floor(contribPerEssence * amount * donateMultE);

        this.daoEssence -= amount;
        const oldRankIdx = this.getSectRankIndex();
        this.sect.contribution += contrib;
        const parts = [`+${contrib} вклад`];
        // 25% шанс получить Свиток Воли Дао за каждые 10 эссенции
        const scrollRolls = Math.floor(amount / 10);
        let scrollsGained = 0;
        for (let i = 0; i < scrollRolls; i++) {
            if (Math.random() < 0.25) scrollsGained++;
        }
        if (scrollsGained > 0) {
            const added = this.addDaoScroll(scrollsGained);
            if (added > 0) parts.push(`+${added} Свиток Воли Дао`);
        }
        addLog(`Пожертвовано ${amount} эссенции секте. ${parts.join(", ")}.`, "reward");

        const newRankIdx = this.getSectRankIndex();
        if (newRankIdx > oldRankIdx) {
            const ranks = getSectRanks(this.sect.id);
            const newRank = ranks[newRankIdx];
            this.sect.rank = newRankIdx;
            addLog(`Повышение! Новый ранг: ${newRank.name}`, "breakthrough");
            if (newRank.unlockTechnique) {
                const sect = SECTS.find(s => s.id === this.sect.id);
                if (sect && sect.advancedTechnique) {
                    const advTech = SECT_TECHNIQUES[sect.advancedTechnique];
                    if (advTech && !this.hasTechnique(advTech.id)) {
                        if (!TECHNIQUES.find(t => t.id === advTech.id)) TECHNIQUES.push(advTech);
                        this.learnTechnique(advTech.id);
                        addLog(`Изучена продвинутая техника секты: ${advTech.name}!`, "reward");
                    }
                }
            }
        }
        this.checkMilestones();
        updateUI();
        if (newRankIdx > oldRankIdx) {
            if (typeof renderSects === "function") renderSects();
        } else {
            if (typeof updateSectRankBar === "function") updateSectRankBar();
        }
        return true;
    },

    donateDust(amount) {
        if (!this.sect || this.gameOver || this.pendingRebirth || this.artifactDust < amount || amount <= 0) return false;
        const rankIdx = this.getSectRankIndex();
        // 1 пыль = 1.5 вклада базовый, растёт с рангом
        const contribPerDust = [1, 2, 3, 5, 7][rankIdx] || 1;
        const donatePerksD = this.getActiveBodyPerks();
        const donateMultD = donatePerksD.contributionMult || 1;
        const contrib = Math.floor(contribPerDust * amount * donateMultD);

        this.artifactDust -= amount;
        const oldRankIdx = this.getSectRankIndex();
        this.sect.contribution += contrib;
        const parts = [`+${contrib} вклад`];
        // 10% шанс получить Свиток Воли Дао за каждые 10 пыли
        const scrollRolls = Math.floor(amount / 10);
        let scrollsGained = 0;
        for (let i = 0; i < scrollRolls; i++) {
            if (Math.random() < 0.10) scrollsGained++;
        }
        if (scrollsGained > 0) {
            const added = this.addDaoScroll(scrollsGained);
            if (added > 0) parts.push(`+${added} Свиток Воли Дао`);
        }
        addLog(`Пожертвовано ${amount} пыли секте. ${parts.join(", ")}.`, "reward");

        const newRankIdx = this.getSectRankIndex();
        if (newRankIdx > oldRankIdx) {
            const ranks = getSectRanks(this.sect.id);
            const newRank = ranks[newRankIdx];
            this.sect.rank = newRankIdx;
            addLog(`Повышение! Новый ранг: ${newRank.name}`, "breakthrough");
            if (newRank.unlockTechnique) {
                const sect = SECTS.find(s => s.id === this.sect.id);
                if (sect && sect.advancedTechnique) {
                    const advTech = SECT_TECHNIQUES[sect.advancedTechnique];
                    if (advTech && !this.hasTechnique(advTech.id)) {
                        if (!TECHNIQUES.find(t => t.id === advTech.id)) TECHNIQUES.push(advTech);
                        this.learnTechnique(advTech.id);
                        addLog(`Изучена продвинутая техника секты: ${advTech.name}!`, "reward");
                    }
                }
            }
        }
        this.checkMilestones();
        updateUI();
        if (newRankIdx > oldRankIdx) {
            if (typeof renderSects === "function") renderSects();
        } else {
            if (typeof updateSectRankBar === "function") updateSectRankBar();
        }
        return true;
    },

    // === РАНГИ (динамические пороги по difficulty) ===

    _syncSectRank(announce = true) {
        if (!this.sect) return false;
        const ranks = getSectRanks(this.sect.id);
        const rankIdx = this.getSectRankIndex();
        const oldRankIdx = this.sect.rank || 0;
        let changed = rankIdx !== oldRankIdx;
        this.sect.rank = rankIdx;
        if (announce && rankIdx > oldRankIdx) {
            addLog(`Повышение! Новый ранг: ${ranks[rankIdx].name}`, "breakthrough");
        }
        // Ранг может открыться после прорыва реалма или перескочить Ядрового ученика.
        if (ranks.slice(0, rankIdx + 1).some(r => r.unlockTechnique)) {
            const sect = SECTS.find(s => s.id === this.sect.id);
            const tech = sect && SECT_TECHNIQUES[sect.advancedTechnique];
            if (tech && !this.hasTechnique(tech.id)) {
                if (!TECHNIQUES.find(t => t.id === tech.id)) TECHNIQUES.push(tech);
                this.learnTechnique(tech.id);
                addLog(`Изучена продвинутая техника секты: ${tech.name}!`, "reward");
                changed = true;
            }
        }
        return changed;
    },

    getCurrentSectRank() {
        if (!this.sect) return null;
        const ranks = getSectRanks(this.sect.id);
        const startRank = Math.max(0, Math.min(this.getActiveBodyPerks().startRank || 0, ranks.length - 1));
        let rank = ranks[startRank];
        // Только подаренный ранг обходит требования; дальнейшие повышения — по обычным порогам.
        for (const r of ranks.slice(startRank + 1)) {
            if (this.sect.contribution >= r.contribution && this.realmIndex >= r.realmReq) rank = r;
        }
        return rank;
    },

    getSectRankIndex() {
        if (!this.sect) return 0;
        const ranks = getSectRanks(this.sect.id);
        const rank = this.getCurrentSectRank();
        if (!rank) return 0;
        return ranks.findIndex(r => r.id === rank.id);
    },

    getNextSectRank() {
        if (!this.sect) return null;
        const idx = this.getSectRankIndex();
        const ranks = getSectRanks(this.sect.id);
        if (idx >= ranks.length - 1) return null;
        return ranks[idx + 1];
    },

    // Ранг улучшает вклад, но не увеличивает частоту кликов по заданиям.
    getSectMissionCooldown() {
        let cd = 20;
        // Гений Секты (вознесение): снижение кулдауна миссий
        const perks = this.getActiveBodyPerks();
        if (perks.missionCdReduction) {
            cd = Math.max(1, Math.floor(cd * (1 - perks.missionCdReduction)));
        }
        // Дао бонус: множитель КД заданий (Скрытая Секта)
        const missionCdMult = this.getSectBonus("missionCdMult");
        if (missionCdMult && missionCdMult !== 0) {
            cd = Math.max(1, Math.round(cd * missionCdMult));
        }
        return Math.max(12, cd);
    },

    // === БОНУСЫ СЕКТЫ (через Дао) ===

    // Интерполяция бонуса Дао между уровнем 0 и 5
    getDaoBonus(sectId, effectKey) {
        const sect = SECTS.find(s => s.id === sectId);
        if (!sect || !sect.dao || !sect.dao[effectKey]) return 0;
        const { min, max } = sect.dao[effectKey];
        const daoLevel = Math.min(5, this.daoLevel || 0);
        return min + (max - min) * (daoLevel / 5);
    },

    // Необходимый прогресс Дао для текущего уровня (линейный рост)
    daoNeeded(atLevel = this.daoLevel) {
        const lvl = atLevel;
        if (lvl <= 8) return 80 + lvl * 20; // 80-240, линейно
        // После 8: экспоненциальный рост, округление до 50
        const base = 80 + lvl * 20;
        const scaleMult = 1 + (lvl - 8) * 0.25;
        return Math.round(base * scaleMult / 50) * 50;
    },

    getDaoLevelCap() {
        return (this.realmIndex - 3) * SUB_LEVELS + this.subLevel + 4;
    },

    // Доступный прогресс до потолка, включая неполную полоску последнего уровня.
    getDaoProgressRoom() {
        if (!this.sect || this.realmIndex < 3) return 0;
        const cap = Math.max(this.daoLevel, this.getDaoLevelCap());
        let room = this.daoNeeded(cap) - 1 - this.daoProgress;
        for (let level = this.daoLevel; level < cap; level++) room += this.daoNeeded(level);
        return Math.max(0, room);
    },

    // Автоповышение Дао при заполнении бара
    _checkDaoLevelUp() {
        if (!this.sect || this.realmIndex < 3) return;
        // Кэп: не более +4 выше требования текущей ступени
        const daoCap = this.getDaoLevelCap();
        if (this.daoLevel >= daoCap) {
            this.daoProgress = Math.min(this.daoProgress, this.daoNeeded() - 1);
            return;
        }
        while (this.daoProgress >= this.daoNeeded() && this.daoLevel < daoCap) {
            this.daoProgress -= this.daoNeeded();
            this.daoLevel++;
            if (!this.prestige.daoLevels) this.prestige.daoLevels = {};
            const sectId = this.sect.id;
            this.prestige.daoLevels[sectId] = Math.max(this.prestige.daoLevels[sectId] || 0, this.daoLevel);
            const sect = SECTS.find(s => s.id === sectId);
            const daoPath = sect ? sect.daoPath : null;
            const rankNames = daoPath && DAO_RANK_NAMES[daoPath] ? DAO_RANK_NAMES[daoPath] : null;
            const rankName = rankNames ? rankNames[Math.min(this.daoLevel - 1, rankNames.length - 1)] : null;
            const levelDescs = daoPath && typeof DAO_LEVEL_DESCRIPTIONS !== "undefined" && DAO_LEVEL_DESCRIPTIONS[daoPath] ? DAO_LEVEL_DESCRIPTIONS[daoPath] : null;
            const levelDesc = levelDescs ? levelDescs[Math.min(this.daoLevel - 1, levelDescs.length - 1)] : null;
            const pathName = sect ? sect.daoDisplayName : "Дао";
            addLog(`${pathName} достигло ${this.daoLevel} уровня${rankName ? ": " + rankName : ""}!`, "breakthrough");
            if (levelDesc) addLog(levelDesc, "cultivation");
            // Предупреждение о давлении Дао
            if (this.daoLevel === 9) addLog("Ваше постижение углубилось до опасного предела. Внутренний демон чувствует это. (+5% шанс демона)", "danger");
            if (this.daoLevel === 17) addLog("Дао давит на разум. Грань между просветлением и безумием истончается. (+10% шанс демона)", "danger");
            if (this.daoLevel === 25) addLog("Вы заглянули так глубоко, что бездна заглянула в ответ. Демон голоден как никогда. (+15% шанс демона)", "danger");
            // События Давления Дао (лорные)
            if (typeof DAO_PRESSURE_EVENTS !== "undefined" && daoPath && DAO_PRESSURE_EVENTS[daoPath]) {
                const pressureText = DAO_PRESSURE_EVENTS[daoPath][this.daoLevel];
                if (pressureText) addLog(pressureText, "event");
            }
        }
    },

    getSectBonus(effectKey) {
        if (!this.sect) return 0;
        const sect = SECTS.find(s => s.id === this.sect.id);
        if (!sect || !sect.dao || !sect.dao[effectKey]) return 0;

        const daoValue = this.getDaoBonus(this.sect.id, effectKey);
        return daoValue;
    },

    // === ЗАДАНИЯ ===

    // Получить доступные шаблоны (с учётом ранга)
    _getAvailableMissionTemplates() {
        if (!this.sect) return [];
        const sect = SECTS.find(s => s.id === this.sect.id);
        if (!sect) return [];
        const rankIdx = this.getSectRankIndex();
        const pool = sect.missions || ["gather_stones", "slay_beast", "meditate_count"];
        return pool.filter(tid => {
            const tpl = SECT_MISSION_TEMPLATES[tid];
            if (!tpl) return false;
            if (tpl.minRank && rankIdx < tpl.minRank) return false;
            return true;
        });
    },

    // Сгенерировать одно задание, избегая шаблонов уже активных слотов
    _generateOneMission(excludeTemplates) {
        const sect = SECTS.find(s => s.id === this.sect.id);
        if (!sect) return null;
        const diff = SECT_DIFFICULTY[sect.difficulty] || SECT_DIFFICULTY.medium;
        const available = this._getAvailableMissionTemplates().filter(tid => !excludeTemplates.includes(tid));
        if (available.length === 0) return null;

        const templateId = available[Math.floor(Math.random() * available.length)];
        const template = SECT_MISSION_TEMPLATES[templateId];
        if (!template) return null;

        const mission = template.generate(this, diff);

        // На максимальном ранге: конвертировать вклад в реальные награды
        const isMaxRank = this.getNextSectRank() === null;
        if (isMaxRank && mission.reward) {
            const contrib = mission.reward.contribution || 0;
            if (contrib > 0) {
                // Конвертировать вклад в камни + бонусные награды
                const r = this.realmIndex;
                if (!mission.reward.stones) mission.reward.stones = 0;
                mission.reward.stones += Math.floor(contrib * 0.5 * (1 + r * 0.1));
                // Убираем вклад — он бесполезен
                delete mission.reward.contribution;
                // Небольшой бонус пилюль; свитки остаются только явной
                // наградой конкретного задания.
                if (contrib >= 25) {
                    const pillBonus = Math.floor(r * 0.25);
                    if (pillBonus > 0) {
                        if (!mission.reward.pills) mission.reward.pills = 0;
                        mission.reward.pills += pillBonus;
                    }
                }
            }
        }

        return {
            templateId: template.id,
            text: template.text,
            type: template.type,
            description: mission.description,
            cost: mission.cost || null,
            check: mission.check || null,
            reward: mission.reward,
            cooldown: 0,
            meditationYearsAtStart: this.meditationYears,
            breakthroughsAtStart: this.totalBreakthroughs,
            pillsDonatedAtStart: this.flags.pillsDonated || 0
        };
    },

    generateSectMissions() {
        if (!this.sect) return;
        const available = this._getAvailableMissionTemplates();
        const count = Math.min(3, available.length);
        this.sectMissions = [];
        const used = [];

        for (let i = 0; i < count; i++) {
            const m = this._generateOneMission(used);
            if (m) {
                used.push(m.templateId);
                this.sectMissions.push(m);
            }
        }
        addLog(`Новые задания секты (${this.sectMissions.length})`, "event");
    },

    canCompleteSectMission(index) {
        if (this.gameOver || this.pendingRebirth) return false;
        const m = this.sectMissions[index];
        if (!m || !m.reward || m.cooldown > 0) return false;
        if (typeof this.isDiscipleSlotBlocked === "function" && this.isDiscipleSlotBlocked(index)) return false;

        if (m.cost) {
            if (m.cost.stones && this.stones < m.cost.stones) return false;
            if (m.cost.pills && this.pills < m.cost.pills) return false;
            if (m.cost.dust && this.artifactDust < m.cost.dust) return false;
            if (m.cost.essence && this.daoEssence < m.cost.essence) return false;
        }
        if (m.check) {
            if (m.check.combatPower && this.getCombatPower() < m.check.combatPower) return false;
            if (m.check.meditationYears) {
                const done = this.meditationYears - (m.meditationYearsAtStart || 0);
                if (done < m.check.meditationYears) return false;
            }
            if (m.check.strength && this.strength + this.getArtifactBonus("strength") < m.check.strength) return false;
            if (m.check.spirit && this.spirit + this.getArtifactBonus("spirit") < m.check.spirit) return false;
            if (m.check.breakthroughs) {
                const done = this.totalBreakthroughs - (m.breakthroughsAtStart || 0);
                if (done < m.check.breakthroughs) return false;
            }
            if (m.check.luck && this.luck + this.getArtifactBonus("luck") + this.getFormationBonus("luck") < m.check.luck) return false;
            if (m.check.pillsDonated) {
                const donated = (this.flags.pillsDonated || 0) - (m.pillsDonatedAtStart || 0);
                if (donated < m.check.pillsDonated) return false;
            }
        }
        return true;
    },

    // Только это поручение подтверждает уже совершённое пожертвование.
    // Обычные готовые задания остаются на ручном выполнении.
    _completePillDonationMissions() {
        if (!this.sect || this.gameOver || this.pendingRebirth) return 0;
        let completed = 0;
        for (let i = 0; i < this.sectMissions.length; i++) {
            const mission = this.sectMissions[i];
            if (mission?.templateId === "donate_pills_sect" && mission.check?.pillsDonated > 0
                && this.completeSectMission(i)) completed++;
        }
        return completed;
    },

    getSectMissionContribution(baseContribution) {
        const rank = this.getCurrentSectRank();
        const rankMult = rank ? rank.bonusMult : 1;
        const bodyMult = this.getActiveBodyPerks().contributionMult || 1;
        return Math.floor(baseContribution * rankMult * bodyMult);
    },

    getSectMissionArtifactReward(mission) {
        if (!mission || !mission.reward || !mission.reward.artifact) return null;
        // Флаг сохраняется при загрузке/смене секты и сбрасывается при перерождении.
        const flag = "sectMissionArtifact_" + (mission.templateId || "legacy");
        const firstReward = !this.flags[flag];
        let tier = mission.reward.artifact;
        if (!firstReward) {
            const tiers = ["common", "uncommon", "rare", "epic", "legendary", "divine"];
            const maxIdx = tiers.indexOf(SECT_MISSION_REPEAT_ARTIFACT_MAX_TIER);
            if (tiers.indexOf(tier) > maxIdx) tier = tiers[maxIdx];
        }
        return { tier, chance: firstReward ? 1 : SECT_MISSION_REPEAT_ARTIFACT_CHANCE, firstReward, flag };
    },

    completeSectMission(index, source = "manual") {
        if (source === "disciple" && !this.canAutoCompleteDiscipleMission(index)) return false;
        if (!this.canCompleteSectMission(index)) return false;
        const m = this.sectMissions[index];
        if (typeof this._markDiscipleSlotPaid === "function") this._markDiscipleSlotPaid(index);

        // Оплата
        if (m.cost) {
            if (m.cost.stones) this.stones -= m.cost.stones;
            if (m.cost.pills) this.pills -= m.cost.pills;
            if (m.cost.dust) this.artifactDust -= m.cost.dust;
            if (m.cost.essence) this.daoEssence -= m.cost.essence;
        }

        // Запомнить старый ранг до добавления вклада
        const oldRankIdx = this.getSectRankIndex();

        // Вклад масштабируется с рангом и телом; предметные награды не умножаются.
        const rewardParts = [];
        if (m.reward.contribution) {
            const contrib = this.getSectMissionContribution(m.reward.contribution);
            this.sect.contribution += contrib;
            rewardParts.push(`+${contrib} вклад`);
        }
        if (m.reward.stones) {
            this.stones += m.reward.stones;
            rewardParts.push(`+${m.reward.stones} камней`);
        }
        if (m.reward.pills) {
            this.pills += m.reward.pills;
            rewardParts.push(`+${m.reward.pills} пилюль`);
        }
        if (m.reward.daoScroll) {
            const added = this.addDaoScroll(m.reward.daoScroll);
            if (added > 0) rewardParts.push(`+${added} Свиток Воли Дао`);
        }
        const artifactReward = this.getSectMissionArtifactReward(m);
        if (artifactReward && (artifactReward.firstReward || Math.random() < artifactReward.chance)) {
            const art = this.generateArtifact(artifactReward.tier);
            if (art && this.addArtifact(art)) {
                this.flags[artifactReward.flag] = true;
                rewardParts.push(`артефакт: ${art.name}`);
            }
        }
        addLog(`${m.text || "Задание выполнено."} ${rewardParts.join(", ")}.`, "reward");

        // Проверка повышения ранга (после добавления вклада)
        const newRankIdx = this.getSectRankIndex();
        if (newRankIdx > oldRankIdx) {
            const ranks = getSectRanks(this.sect.id);
            const newRank = ranks[newRankIdx];
            this.sect.rank = newRankIdx;
            addLog(`Повышение! Новый ранг: ${newRank.name}`, "breakthrough");

            if (newRank.unlockTechnique) {
                const sect = SECTS.find(s => s.id === this.sect.id);
                if (sect && sect.advancedTechnique) {
                    const advTech = SECT_TECHNIQUES[sect.advancedTechnique];
                    if (advTech && !this.hasTechnique(advTech.id)) {
                        if (!TECHNIQUES.find(t => t.id === advTech.id)) {
                            TECHNIQUES.push(advTech);
                        }
                        this.learnTechnique(advTech.id);
                        addLog(`Изучена продвинутая техника секты: ${advTech.name}!`, "reward");
                    }
                }
            }
        }

        // Дао прогресс от задания секты (+3-8%)
        if (this.realmIndex >= 3) {
            const daoSpeedBonus = this.getDaoSpeedMultiplier();
            const daoGain = this.daoNeeded() * (0.02 + Math.random() * 0.03) * daoSpeedBonus;
            this.daoProgress += daoGain;
            this._checkDaoLevelUp();
        }

        // Счётчик для достижений
        this.flags.sectMissionsCompleted = (this.flags.sectMissionsCompleted || 0) + 1;
        // Поставить слот на кулдаун (не удалять — раздельный КД)
        this.sectMissions[index] = { cooldown: this.getSectMissionCooldown() };
        // UI обновляет вызывающее действие: ручное выполнение или пожертвование.
        return true;
    },

    // Вызывается из passYear() — раздельный кулдаун для каждого слота
    tickSectMission() {
        if (!this.sect) return;
        if (this._syncSectRank()) updateUI();

        // Кулдаун после вступления — тикаем таймер и генерируем миссии когда он истечёт
        if ((!this.sectMissions || this.sectMissions.length === 0) && this.sectMissionTimer > 0) {
            this.sectMissionTimer--;
            if (this.sectMissionTimer <= 0) {
                this.generateSectMissions();
                this.sectMissionTimer = this.getSectMissionCooldown();
                addLog("Испытательный срок окончен. Задания секты доступны!", "event");
                updateUI();
            }
            return;
        }
        if (!this.sectMissions || this.sectMissions.length === 0) return;

        let newMissions = [];
        for (let i = 0; i < this.sectMissions.length; i++) {
            const m = this.sectMissions[i] || { cooldown: 0 };
            if (m.cooldown > 0 || !m.reward) {
                m.cooldown = Math.max(0, (m.cooldown || 0) - 1);
                this.sectMissions[i] = m;
                if (m.cooldown <= 0) {
                    const exclude = this.sectMissions
                        .filter((s, j) => j !== i && s?.templateId)
                        .map(s => s.templateId);
                    const newMission = this._generateOneMission(exclude);
                    if (newMission) {
                        this.sectMissions[i] = newMission;
                        newMissions.push(newMission);
                    } else {
                        // Пока все доступные шаблоны заняты, слот ждёт, а не становится пустым заданием.
                        this.sectMissions[i] = { cooldown: 1 };
                    }
                }
            }
        }
        // Старое сохранение могло оставить оплаченный квест на ручном получении.
        // Проверяем после кулдаунов: новый квест отсчитывает только новые сдачи,
        // а только что завершённый получает полный кулдаун без лишнего вычета.
        const completedDonationMissions = this._completePillDonationMissions();
        if (newMissions.length > 0) {
            addLog(`Новые задания секты (${newMissions.length})`, "event");
        }
        if (newMissions.length > 0 || completedDonationMissions > 0) {
            if (completedDonationMissions > 0) this.checkMilestones();
            updateUI();
        }
    },
});
