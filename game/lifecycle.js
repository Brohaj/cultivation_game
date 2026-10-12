// ============================================================
// GAME/LIFECYCLE.JS — Тики, годы, старт/стоп, сброс
// Зависит от: всех game/*.js
// ============================================================

const TICK_RATE = 5; // тиков в секунду (200ms каждый)

Object.assign(game, {
    _getBestArtifact() {
        if (!this.artifacts || this.artifacts.length === 0) return null;
        const tierOrder = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, divine: 5 };
        return this.artifacts.reduce((best, art) => {
            if (!best) return art;
            return (tierOrder[art.tier] || 0) > (tierOrder[best.tier] || 0) ? art : best;
        }, null);
    },

    setDebugSpeed(speed) {
        this.debugSpeed = speed;
        if (!this._paused && this.tickTimer) this.start();
        addLog(`Скорость: x${speed}`, "system");
        updateUI();
    },

    debugGive(type) {
        switch (type) {
            case "stones":   this.stones += 1000; addLog("[DEBUG] +1000 камней", "system"); break;
            case "essence":  this.daoEssence += 1000; addLog("[DEBUG] +1000 эссенции", "system"); break;
            case "dust":     this.artifactDust += 1000; addLog("[DEBUG] +1000 пыли", "system"); break;
            case "artifact":
                const art = this.generateArtifact();
                this.addArtifact(art);
                break;
            case "scroll":
                const added = this.addDaoScroll(1);
                if (added > 0) addLog("[DEBUG] +1 Свиток Воли Дао", "system");
                break;
        }
        updateUI();
    },

    // === ТИКИ ===

    tick() {
        if (this.gameOver || this.pendingRebirth) return;
        const tickFraction = 1 / TICK_RATE; // доля секунды за 1 тик
        {
            // Авто-активность + пассивная прокачка статов
            const PASSIVE_STAT_RATE = 0.15;
            const statMap = { body: "strength", dao: "spirit", fate: "luck" };
            const activeStat = statMap[this.currentActivity]; // null если медитация

            if (this.currentActivity === "meditation" && !this.expedition) {
                this.qi += this.qiPerSec() * tickFraction;
                this.totalMeditations++;
                this.checkQiCap();
            }

            // Все 3 стата качаются: активный на 100%, остальные на 25%
            for (const stat of ["strength", "spirit", "luck"]) {
                const rate = (stat === activeStat) ? 1.0 : PASSIVE_STAT_RATE;
                this.activityXP[stat] = (this.activityXP[stat] || 0) + this.statXpPerTick(stat) * tickFraction * rate;
                this._checkStatLevelUp(stat);
            }

            // Постижение Дао (реалм 3+ и есть секта)
            if (this.realmIndex >= 3 && this.sect) {
                const sect = SECTS.find(s => s.id === this.sect.id);
                if (sect && sect.daoActivity) {
                    const activities = Array.isArray(sect.daoActivity) ? sect.daoActivity : [sect.daoActivity];
                    const isHidden = sect.id === "hidden_hermit";
                    let givesDao = false;
                    if (isHidden && this.currentActivity !== "meditation") {
                        // Скрытая секта: любая активность кроме медитации, но x0.5
                        givesDao = true;
                    } else if (activities.includes(this.currentActivity)) {
                        givesDao = true;
                    }
                    if (givesDao) {
                        // База: 3 дао/год + бонус от XP техник + бонус от daoSpeed + достижения
                        const techBonus = 1 + this.getTechBonus("techXpSpeed") + this.getArtifactBonus("techXpSpeed") * 0.01 + this.getFormationBonus("techXpSpeed");
                        const daoSpeedBonus = this.getDaoSpeedMultiplier();
                        const daoPerYear = 3 * techBonus * daoSpeedBonus;
                        const secondsPerYear = 5;
                        let daoPerSec = daoPerYear / secondsPerYear;
                        // Скрытая секта: x0.5 (любая активность, но медленнее)
                        if (isHidden) daoPerSec *= 0.5;
                        this.daoProgress += daoPerSec * tickFraction;
                    }
                }
            }
            this._checkDaoLevelUp();

            // Совместимость: разовая выдача остатка оплаченного XP старого сейва.
            this._tickInsightXP();

            // Пассивная прокачка техник (только экипированные)
            for (const techId of this.equippedTechniques) {
                const tech = TECHNIQUES.find(t => t.id === techId);
                if (!tech) continue;
                const lvl = this.techLevels[techId] || 1;
                if (lvl >= tech.maxLevel) continue;

                this.techXP[techId] = (this.techXP[techId] || 0) + this.techXpPerTick(techId) * tickFraction;
                while (this.techXP[techId] >= this.techXpNeeded(techId)) {
                    this.techXP[techId] -= this.techXpNeeded(techId);
                    const newLvl = (this.techLevels[techId] || 1) + 1;
                    this.techLevels[techId] = newLvl;
                    if (newLvl >= tech.maxLevel) addLog(`Техника "${tech.name}" достигла максимума! Вознесение доступно.`, "breakthrough");
                    if (tech.effects.timeSpeed) this.refreshTimers();
                    if (newLvl >= tech.maxLevel) break;
                }
            }
        }
        this._lastTickTime = Date.now();
        updateTickUI();
    },

    passYear() {
        if (this.gameOver || this.pendingRebirth) return;
        this._lastYearTime = Date.now();
        {
            if (this.gameOver) return;
            this.years++;

            // === Доход камней ===
            let income = this._calcStoneIncome();
            if (this.worldEvent && this.worldEvent.modifiers.stoneIncome) {
                income = Math.floor(income * this.worldEvent.modifiers.stoneIncome);
            }
            this.stones += income;

            // Трекинг лет медитации (для заданий секты) — постижение Дао тоже считается
            if (!this.expedition && (this.currentActivity === "meditation" || this.currentActivity === "dao")) {
                this.meditationYears++;
            }

            // === Атмосферный лог каждые 50 лет ===
            const charAge = this.characterAge();
            if (charAge % 50 === 0 && charAge > 0) {
                this._logLifeUpdate(charAge);
            }

            // Проверка эпохи
            const era = this.getCurrentEra();
            const prevEra = this._lastEra;
            if (era && era.id !== prevEra) {
                this._lastEra = era.id;
                if (prevEra) {
                    addLog(`\u2550\u2550\u2550 Наступила новая эпоха: ${era.name} \u2550\u2550\u2550`, "breakthrough");
                    addLog(era.description, "system");
                    this._onEraChange(era);
                }
            }

            this.checkWorldEvent();
            this.tickAdventureRumors();
            // Гарантированный бой: если реалм 2+ и ещё нет победы, каждый год ~15% шанс
            if (this.realmIndex >= 2 && !this.flags.wonCombat && Math.random() < 0.15) {
                const power = 1 + this.realmIndex;
                if (this.getCombatPower() >= power) {
                    this.flags.wonCombat = true;
                    this.stones += 5;
                    addLog("На дороге вас атаковал демонический зверь — и вы его одолели! +5 камней. (Первая Победа!)", "event");
                }
            }
            this.checkMilestones();
            this.tickSectMission();
            this.tickExpedition();
            this.tickAdventures();

            // Авто-функции (тир 3 вознесений тел)
            const autoPerks = this.getActiveBodyPerks();
            // Авто-рефайн пилюль (Архиалхимик ★3, тоггл)
            if (autoPerks.autoRefine && this._autoRefineEnabled !== false) {
                for (let t = 1; t <= 3; t++) {
                    while (this.canRefinePill(t)) this.refinePillTier(t);
                }
            }
            // Авто-вознесение техник (Воплощение Дао)
            if (autoPerks.autoAscendTech) {
                for (const techId of this.techniques) {
                    const info = this.getTechAscendInfo(techId);
                    if (info && !info.locked && this.daoEssence >= info.essence) {
                        this.ascendTechnique(techId);
                    }
                }
            }

            // === Дебаг-автоматизация ===
            const da = this._debugAuto || {};
            // Авто-прорыв (когда ци и дао заполнены, пока нет демона)
            if (da.breakthrough && this.canBreakthrough() && this.getEffectiveDemonChance() <= 0) {
                this.breakthrough();
            }
            // Авто-задания секты
            if (da.sectMissions && this.sect && this.sectMissions) {
                for (let i = 0; i < this.sectMissions.length; i++) {
                    if (this.canCompleteSectMission(i)) {
                        this.completeSectMission(i);
                    }
                }
            }
            // Авто-повтор экспедиций
            if (da.expeditions && !this.expedition) {
                const lastLoc = this._lastExpeditionId;
                if (lastLoc && this.canStartExpedition(lastLoc)) {
                    this.startExpedition(lastLoc);
                }
            }
            // Авто-озарение за эссенцию
            if (da.insight && typeof this.buyInsight === "function") {
                if (this.canBuyInsight()) this.buyInsight();
            }

            // Смерть (по возрасту персонажа, не мировому времени)
            const maxAge = this.maxAge();
            if (maxAge !== Infinity && charAge >= maxAge) {
                addLog("Ваше тело не выдержало бремени времени...", "danger");
                addLog(`Прожито ${charAge} лет. Мировой год: ${this.years}. Ступень: «${REALMS[this.realmIndex].name}», ${SUB_LEVEL_NAMES[this.subLevel - 1]}.`, "system");
                addLog("Но путь не заканчивается... Перерождение ждёт.", "system");
                this.gameOver = true;
                this.flags.diedNaturally = true;
                this.stop();
                saveGame();
                if (typeof showRebirthModal === "function") showRebirthModal(true);
                return;
            }

            if (maxAge !== Infinity && maxAge - charAge === 10) {
                addLog("Вы чувствуете приближение старости. Осталось мало времени...", "danger");
            } else if (maxAge !== Infinity && charAge === Math.floor(maxAge * 0.75)) {
                const remaining = maxAge - charAge;
                addLog(`Тело стареет. Осталось ~${remaining} лет жизни. Подумайте о прорыве или перерождении.`, "danger");
            }
        }
        updateUI();
    },

    // === УПРАВЛЕНИЕ ИГРОЙ ===

    getSpeedMultiplier() {
        const _tfPerks = this.getActiveBodyPerks();
        const timeFlow = (this.prestige.karmaUpgrades.timeFlow || 0) + (_tfPerks.freeUpgradeLevel || 0);
        const techTimeSpeed = this.getTechBonus("timeSpeed");
        const artifactTimeSpeed = this.getArtifactBonus("timeSpeed") * 0.01;
        return 1 + timeFlow * 0.25 + techTimeSpeed + artifactTimeSpeed;
    },

    start() {
        // Остановить предыдущие таймеры чтобы не дублировать
        this.stop();
        if (this.gameOver || this.pendingRebirth) return;
        this._paused = false;
        const speedMult = this.getSpeedMultiplier();
        const totalSpeed = speedMult * (this.debugSpeed || 1);
        this._currentSpeedMult = speedMult;
        const tickMs = Math.floor(1000 / TICK_RATE / totalSpeed);
        const yearMs = Math.floor(5000 / totalSpeed);
        const eventMs = Math.floor(15000 / totalSpeed);
        this.tickTimer = setInterval(() => this.tick(), tickMs);
        this.yearTimer = setInterval(() => this.passYear(), yearMs);
        this.eventTimer = setInterval(() => this.triggerEvent(), eventMs);
        this._lastEra = this.getCurrentEra().id;
        this._lastTickTime = Date.now();
        this._lastYearTime = Date.now();
        this._lastEventTime = Date.now();
        startAutoSave();
        this._startVisibilityHandler();
    },

    stop() {
        clearInterval(this.tickTimer);
        clearInterval(this.yearTimer);
        clearInterval(this.eventTimer);
        this.tickTimer = null;
        this.yearTimer = null;
        this.eventTimer = null;
        stopAutoSave();
        // НЕ удаляем visibility handler — он сам проверяет _paused
    },

    // Компенсация фоновой вкладки: при возврате прокручиваем пропущенное время
    _startVisibilityHandler() {
        if (this._visHandler) return;
        this._visHandler = () => {
            if (document.hidden || this.gameOver || this._paused || !this.tickTimer) return;
            const now = Date.now();
            const totalSpeed = this.getSpeedMultiplier() * (this.debugSpeed || 1);

            // Пропущенные тики (ци + статы + техники)
            const tickMs = Math.floor(1000 / TICK_RATE / totalSpeed);
            const missedTicks = Math.floor((now - (this._lastTickTime || now)) / tickMs);
            if (missedTicks > 1) {
                const catchUpTicks = Math.min(missedTicks, TICK_RATE * 60);
                for (let i = 0; i < catchUpTicks; i++) {
                    this.tick();
                }
            }

            // Пропущенные годы
            const yearMs = Math.floor(5000 / totalSpeed);
            const missedYears = Math.floor((now - (this._lastYearTime || now)) / yearMs);
            if (missedYears > 1) {
                const catchUpYears = Math.min(missedYears, 200);
                for (let i = 0; i < catchUpYears; i++) {
                    this.passYear();
                }
            }

            // Пропущенные события
            const eventMs = Math.floor(15000 / totalSpeed);
            const missedEvents = Math.floor((now - (this._lastEventTime || now)) / eventMs);
            if (missedEvents > 1) {
                const catchUpEvents = Math.min(missedEvents, 20);
                for (let i = 0; i < catchUpEvents; i++) {
                    this.triggerEvent();
                }
            }

            // Обновить таймстампы
            this._lastTickTime = now;
            this._lastYearTime = now;
            this._lastEventTime = now;
            updateUI();
        };
        document.addEventListener("visibilitychange", this._visHandler);
    },

    _stopVisibilityHandler() {
        if (this._visHandler) {
            document.removeEventListener("visibilitychange", this._visHandler);
            this._visHandler = null;
        }
    },

    // Пересчитать таймеры если скорость изменилась (прокачка техники и т.д.)
    refreshTimers() {
        if (this._paused || !this.tickTimer) return;
        const newMult = this.getSpeedMultiplier();
        if (Math.abs(newMult - (this._currentSpeedMult || 1)) < 0.001) return;
        this.start(); // start() сам вызывает stop() первой строкой
    },

    reset(keepPrestige = false) {
        this.stop();
        const savedPrestige = keepPrestige ? JSON.parse(JSON.stringify(this.prestige)) : null;
        const savedName = keepPrestige ? this.name : "Культиватор";
        // Мировое время: при перерождении мир продолжает жить
        const worldAge = keepPrestige ? (this.prestige.worldAge || 0) : 0;
        this.name = savedName;
        this.qi = 0;
        this.realmIndex = 0;
        this.subLevel = 1;
        this.years = worldAge;
        this.birthYear = worldAge;
        this.strength = 1;
        this.spirit = 1;
        this.luck = 1;
        this.stones = 0;
        this.pills = 0;
        // autoActive removed — always idle
        this.gameOver = false;
        this.pendingRebirth = null;
        this._maxRealmThisLife = 0;
        this.currentActivity = "meditation";
        this.activityXP = { strength: 0, spirit: 0, luck: 0 };
        this.daoProgress = 0;
        this.daoLevel = 0;
        this.daoEssence = 0;
        this.artifactDust = 0;
        this.refinedPills = 0;
        this.spiritualPills = 0;
        this.heavenlyPills = 0;
        this.enhanceFailstacks = 0;
        this.daoScrolls = 0;
        this.scrollFailstacksApplied = 0;
        // Секта сбрасывается при перерождении
        this.sect = null;
        this.sectMissions = [];
        this.sectMissionTimer = 0;
        // Экспедиция сбрасывается
        this.expedition = null;
        this.lastExpeditionReward = null;
        this.ascendedLocations = {};
        this.expeditionCompletions = {};
        // Приключения сбрасываются
        this.adventureRumors = [];
        this.activeAdventures = [];
        this.completedAdventures = [];
        this.adventureDiscovery = { poolKey: "", waitYears: 0, lastCompleteYear: null };
        this._yearsSinceAdventure = 0;
        this._lastAdventureCompleteYear = 0;
        this.lastAdventureReward = null;
        // Формации сбрасываются при перерождении
        this.formations = {};
        this.selectedFormations = [];
        this.flags = {};
        this._insightUses = 0;
        this.techniques = [];
        this.equippedTechniques = [];
        this.techLevels = {};
        this.techXP = {};
        this._pendingInsightXP = null;
        this._insightTicksLeft = 0;
        // Восстановить оригинальные тиры и имена техник (вознесение мутирует глобальный массив)
        for (const t of new Set([...TECHNIQUES, ...Object.values(SECT_TECHNIQUES)])) {
            if (TECHNIQUES_ORIGINAL_TIERS[t.id]) t.tier = TECHNIQUES_ORIGINAL_TIERS[t.id];
            if (TECHNIQUES_ORIGINAL_NAMES[t.id]) t.name = TECHNIQUES_ORIGINAL_NAMES[t.id];
            if (TECHNIQUES_ORIGINAL_DESCRIPTIONS[t.id]) t.description = TECHNIQUES_ORIGINAL_DESCRIPTIONS[t.id];
        }
        // Удалить техники сект из глобального массива (они добавляются при joinSect)
        for (let i = TECHNIQUES.length - 1; i >= 0; i--) {
            if (TECHNIQUES[i].source === "sect") TECHNIQUES.splice(i, 1);
        }
        // Артефакты сбрасываются при перерождении
        // (кармическое улучшение "Память Артефактов" сохраняет N экипированных)
        const _amPerks = keepPrestige ? this.getActiveBodyPerks() : {};
        const artMemLevel = keepPrestige ? (this.prestige.karmaUpgrades.artifactMemory || 0) + (_amPerks.freeUpgradeLevel || 0) : 0;
        if (artMemLevel > 0) {
            const tierOrder = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, divine: 5 };
            // Читаем из artifacts (источник правды), фильтруя только экипированные
            const equippedIds = new Set(ARTIFACT_SLOTS.map(s => this.equippedArtifacts[s]?.id).filter(Boolean));
            const equipped = this.artifacts
                .filter(a => equippedIds.has(a.id))
                .sort((a, b) => (b.transcend || 0) - (a.transcend || 0) || (b.enhance || 0) - (a.enhance || 0) || (tierOrder[b.tier] || 0) - (tierOrder[a.tier] || 0));
            const kept = equipped.slice(0, artMemLevel);
            this.artifacts = kept;
            this.equippedArtifacts = { weapon: null, armor: null, accessory: null, treasure: null };
            for (const art of kept) {
                this.equippedArtifacts[art.slot] = art;
            }
        } else {
            this.artifacts = [];
            this.equippedArtifacts = { weapon: null, armor: null, accessory: null, treasure: null };
        }
        this.spiritualRoot = null;
        this.milestones = [];
        this.totalMeditations = 0;
        this.meditationYears = 0;
        this.totalBreakthroughs = 0;
        // Мировые события: при перерождении мировое событие может продолжаться
        if (!keepPrestige) {
            this.worldEvent = null;
            this.lastWorldEventYear = 0;
        } else {
            // Сохраняем текущее мировое событие, но если оно уже закончилось — убираем
            if (this.worldEvent && this.years >= this.worldEvent.startYear + this.worldEvent.duration) {
                this.worldEvent = null;
            }
            // lastWorldEventYear сохраняется — мир помнит
        }
        this.debugSpeed = 1;
        this._lastEra = null;
        this._minRootTier = null;
        this.prestige = savedPrestige || { karma: 0, karmaSpent: 0, totalRebirths: 0, permanentMilestones: [], karmaUpgrades: {}, lastBody: "peasant", formations: {}, bodyAscensions: {}, worldAge: 0, daoLevels: {}, unlockedFormations: [] };
        // Восстановить достижения из перманентных
        this.milestones = [...(this.prestige.permanentMilestones || [])].filter(m => !m.startsWith("visited_sect_"));
        deleteSave();
    },

    // === ДОХОД КАМНЕЙ ===

    _calcStoneIncome() {
        // Реалм: экспоненциальный рост (1, 1, 2, 2, 3, 4, 5, 7, 9, 12, 16, 21, 27, 35, 46)
        let base = Math.max(1, Math.floor(Math.pow(1.3, this.realmIndex)));

        // Секта: стипендия (зависит от ранга)
        if (this.sect) {
            const rankIdx = this.getSectRankIndex();
            const stipends = [1, 2, 4, 8, 15]; // Внешний → Глава Зала
            base += stipends[rankIdx] || 0;
        }

        // Активность: небольшой бонус
        const activityBonus = { meditation: 1, body: 0, dao: 1, fate: 0 };
        base += activityBonus[this.currentActivity] || 0;

        // Артефакты: бонус дохода камней (%)
        const artStoneBonus = this.getArtifactBonus("stoneIncome");
        if (artStoneBonus > 0) {
            base = Math.floor(base * (1 + artStoneBonus * 0.01));
        }

        // Перк тела: Сын Торговца — множитель дохода камней
        const perks = this.getActiveBodyPerks();
        if (perks.stoneIncomeMult) {
            base = Math.floor(base * perks.stoneIncomeMult);
        }

        // Бонус эпохи: Золотая Эра +1
        base += this.getEraStoneIncomeBonus();

        return base;
    },

    // === АТМОСФЕРНЫЕ ЛОГИ ===

    _logLifeUpdate(charAge) {
        const realm = REALMS[this.realmIndex];
        const realmName = realm ? realm.name : "";

        // Фразы зависят от контекста
        if (charAge === 50) {
            addLog("Полвека прошло с начала вашего пути. Мир вокруг тот же — но вы уже другой.", "year");
        } else if (charAge === 100) {
            addLog("Сто лет. Ваши ровесники давно в земле, а вы всё ещё идёте по Пути.", "year");
        } else if (charAge === 500) {
            addLog("Пять веков. Королевства рождались и гибли, пока вы медитировали в горах.", "year");
        } else if (charAge === 1000) {
            addLog("Тысяча лет. Ваше имя стало легендой — или забытым шёпотом в руинах.", "year");
        } else if (charAge === 5000) {
            addLog("Пять тысячелетий. Вы помните мир, которого больше нет.", "year");
        } else if (charAge === 10000) {
            addLog("Десять тысяч лет. Время потеряло значение — остался только Путь.", "year");
        } else {
            // Обычные вехи — короткие атмосферные фразы
            const phrases = this._getLifePhrases();
            const phrase = phrases[Math.floor(Math.random() * phrases.length)];
            addLog(`${phrase} [${charAge} лет, ${realmName}]`, "year");
        }
    },

    _getLifePhrases() {
        const base = [
            "Годы текут, как вода в горном ручье.",
            "Ещё одна веха на бесконечном пути.",
            "Мир изменился. Вы — тоже.",
            "Тишина практики нарушается лишь сменой сезонов.",
        ];

        // Фразы по активности
        if (this.currentActivity === "meditation") {
            base.push(
                "Ци течёт ровнее с каждым годом медитации.",
                "В тишине медитации время течёт незаметно.",
                "Даньтянь расширяется, вмещая всё больше энергии.",
            );
        } else if (this.currentActivity === "body") {
            base.push(
                "Тело закалилось — каждая мышца подобна стальному тросу.",
                "Физическая практика укрепляет не только плоть, но и волю.",
            );
        } else if (this.currentActivity === "dao") {
            base.push(
                "Постижение Дао открывает новые грани реальности.",
                "Мудрость накапливается, как снег на горных вершинах.",
            );
        } else if (this.currentActivity === "fate") {
            base.push(
                "Вы чувствуете, как нити судьбы переплетаются вокруг вас.",
                "Удача — не случайность, а мастерство чтения потоков мира.",
            );
        }

        // Фразы по секте
        if (this.sect) {
            base.push(
                "Секта поддерживает вас ресурсами и знаниями.",
                "Жизнь в секте имеет свой ритм — задания, практика, рост.",
            );
        }

        return base;
    },
});
