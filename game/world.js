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

    // === БОНУСЫ ЭПОХ (перманентные) ===

    // Проверяет, достигнута ли эпоха (мировое время не сбрасывается)
    hasReachedEra(eraId) {
        const era = ERAS.find(e => e.id === eraId);
        if (!era) return false;
        return this.years >= era.startYear;
    },

    // Бонус к слотам техник (+1 с Эпохи Конфликта)
    getEraTechSlotBonus() {
        return this.hasReachedEra("conflict") ? 1 : 0;
    },

    // Бонус к доходу камней (+1 с Золотой Эры)
    getEraStoneIncomeBonus() {
        return this.hasReachedEra("golden") ? 1 : 0;
    },

    // Бонус к слотам формаций (+1 с Раскола Небес)
    getEraFormationSlotBonus() {
        return this.hasReachedEra("heavenly_schism") ? 1 : 0;
    },

    // Софткап статов (100 → 150 → 200 по эпохам)
    getEraStatSoftcap() {
        if (this.hasReachedEra("chaos")) return 200;
        if (this.hasReachedEra("desolation")) return 150;
        return 100;
    },

    // Divine-тир вознесения техник (с Пробуждения Древних)
    isDivineTechAscendUnlocked() {
        return this.hasReachedEra("awakening");
    },

    // Скидка на кармические улучшения (-20% с Нового Порядка)
    getEraKarmaDiscount() {
        return this.hasReachedEra("new_order") ? 0.20 : 0;
    },

    // Кап прорыва (95% → 100% с Разрушения Дао)
    getEraBreakthroughCap() {
        return this.hasReachedEra("dao_erosion") ? 1.0 : 0.95;
    },

    // === ПЕРЕХОД ЭПОХИ ===

    _onEraChange(era) {
        const messages = {
            conflict: [
                "Старые обиды между сектами, тлевшие поколениями, вспыхнули открытым пламенем. Караваны горят на горных перевалах, а в тавернах шепчутся о том, кто нанёс первый удар.",
                "Дороги стали опасны. Но в хаосе — и возможности: забытые тайники, заброшенные наследия павших мастеров."
            ],
            invasion: [
                "Бездна разверзлась без предупреждения. Чёрный туман хлынул из разломов, и с ним — существа, которым нет имени на человеческом языке. Малые секты исчезли за одну ночь.",
                "Впервые за тысячелетия праведные и демонические культиваторы сражаются плечом к плечу. Каждый вздох ци отдаёт гарью."
            ],
            golden: [
                "Нашествие разбилось о единство сект. Из пепла войны расцвела невиданная эра — алхимики варят эликсиры из трофейных материалов, а забытые тайные царства открываются одно за другим.",
                "Ци течёт рекой, чистая и обильная, словно сами Небеса благословили мир за стойкость."
            ],
            twilight: [
                "Когда Золотая Эра угасла, в мире появились трещины, которых раньше не было. Сквозь них просочилось нечто древнее — не энергия, а память о временах, когда законы ещё не устоялись. Там, где она касается мира, вещи начинают вести себя неправильно — слишком рано, слишком поздно, или вовсе не так.",
                "Древние артефакты откликнулись первыми. Говорят, некоторые из них вновь обрели забытые свойства, неподвластные обычной логике."
            ],
            heavenly_schism: [
                "Небесный Двор — вечная твердыня, что стояла над миром как закон над хаосом — раскололся. Бессмертные, некогда хранившие равновесие, обратили силу друг против друга.",
                "Горы рассыпаются от отголосков их битв. Реки текут вспять. Звёзды гаснут среди бела дня. Смертные — лишь пыль между жерновами."
            ],
            desolation: [
                "Война бессмертных выпила мир досуха. Великие секты — руины. Духовные жилы земли иссохли, и ци приходится выскребать по крупицам из камней и умирающих трав.",
                "Тех, кто остался, немного. Но каждый из них закалён отчаянием — и стоит армии."
            ],
            awakening: [
                "Печати лопнули. Существа, заточённые в незапамятные времена, вырвались на свободу. Некоторые безумны от тысячелетий одиночества. Другие несут мудрость, которую мир давно забыл.",
                "Мир начинает вспоминать, каким он был до людей. И это знание — не утешительно."
            ],
            immortal_war: [
                "Кланы бессмертных вцепились друг другу в глотки за осколки Небесного Дао. Пространство рвётся, как мокрая бумага. Каждый день мир становится немного меньше.",
                "Небо трескается во время их сражений. Законы, казавшиеся вечными, начинают сбоить."
            ],
            new_order: [
                "Из пепла поднялся новый Небесный Двор. Девять Мудрецов установили законы, которые невозможно нарушить. Ци течёт ровно, дороги безопасны.",
                "Но те, кто помнит прежний мир, чувствуют: этот порядок не рождён — он навязан. И не все уверены, что его можно выдержать вечно."
            ],
            dao_erosion: [
                "Само Небесное Дао — основа всех законов реальности — начало разрушаться. Не из-за войны, не из-за демонов. Просто… износилось, как старая ткань.",
                "Техники работают иначе, чем должны. Причина и следствие меняются местами. Сильнейшие культиваторы ищут путь за пределы — в Изначальный Хаос, откуда всё началось."
            ],
            chaos: [
                "Границы рухнули. Энергия Изначального Хаоса — сырая, необузданная, старше самих Небес — затопила реальность. Слабые обращаются в прах от одного прикосновения этой силы.",
                "Результаты больше не соответствуют действиям. Система перестала быть системой. Но для тех, кто выстоит — пределов больше нет. Или больше нет самого «предела»."
            ]
        };
        // Механические бонусы (перманентные)
        const bonuses = {
            conflict:        "Мир изменился: +1 слот техники.",
            golden:          "Мир изменился: +1 камень дохода в год.",
            twilight:        "Мир изменился: артефакты высших рангов могут нести редкие свойства.",
            heavenly_schism: "Мир изменился: +1 слот формации.",
            desolation:      "Мир изменился: софткап статов повышен (100 → 150).",
            awakening:       "Мир изменился: техники можно вознести до божественного тира.",
            new_order:       "Мир изменился: кармические улучшения стоят на 20% меньше.",
            dao_erosion:     "Мир изменился: кап шанса прорыва повышен до 100%.",
            chaos:           "Мир изменился: софткап статов повышен (150 → 200)."
        };

        const lines = messages[era.id];
        if (lines) {
            addLog(lines[0], "reward");
            if (lines[1]) addLog(lines[1], "breakthrough");
        }
        if (bonuses[era.id]) {
            addLog(bonuses[era.id], "system");
        }
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
        if (this.gameOver || this.pendingRebirth) return;
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
                weight *= (1 + this.getRewardLuckBonus());
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
            const dangerBonus = this.getDangerRewardBonus();
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
            const luckBonus = this.getRewardLuckBonus();
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
