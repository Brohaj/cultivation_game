// ============================================================
// SAVE.JS — Сохранение и загрузка игры
// ============================================================

const SAVE_KEY = "cultivation_game_prototype_save";
const SAVE_MIGRATION_KEY = "cultivation_game_migrated_to_v07";
const AUTO_SAVE_INTERVAL = 30000; // 30 секунд

function getSaveableState() {
    return {
        name: game.name,
        qi: game.qi,
        daoProgress: game.daoProgress,
        daoLevel: game.daoLevel,
        realmIndex: game.realmIndex,
        _maxRealmThisLife: Math.max(game.realmIndex, game._maxRealmThisLife || 0),
        _startingRealmThisLife: game._startingRealmThisLife || 0,
        subLevel: game.subLevel,
        years: game.years,
        birthYear: game.birthYear,
        strength: game.strength,
        spirit: game.spirit,
        luck: game.luck,
        stones: game.stones,
        pills: game.pills,
        daoEssence: game.daoEssence,
        artifactDust: game.artifactDust,
        refinedPills: game.refinedPills || 0,
        spiritualPills: game.spiritualPills || 0,
        heavenlyPills: game.heavenlyPills || 0,
        enhanceFailstacks: game.enhanceFailstacks,
        daoScrolls: game.daoScrolls,
        scrollFailstacksApplied: game.scrollFailstacksApplied,
        flags: game.flags,
        techniques: game.techniques,
        equippedTechniques: game.equippedTechniques,
        techLevels: game.techLevels,
        techAscendedTiers: game._getAscendedTiers(),
        spiritualRoot: game.spiritualRoot,
        milestones: game.milestones,
        totalMeditations: game.totalMeditations,
        meditationYears: game.meditationYears,
        totalBreakthroughs: game.totalBreakthroughs,
        worldEvent: game.worldEvent,
        lastWorldEventYear: game.lastWorldEventYear,
        currentActivity: game.currentActivity,
        activityXP: game.activityXP,
        techXP: game.techXP,
        _pendingInsightXP: game._pendingInsightXP,
        _insightTicksLeft: game._insightTicksLeft || 0,
        sect: game.sect,
        sectMissions: game.sectMissions,
        sectMissionTimer: game.sectMissionTimer,
        disciplesState: game.disciplesState,
        startingTechniqueId: game.startingTechniqueId,
        practicePlan: game.practicePlan,
        expedition: game.expedition,
        _insightUses: game._insightUses || 0,
        ascendedLocations: game.ascendedLocations || {},
        expeditionCompletions: game.expeditionCompletions || {},
        lastExpeditionReward: game.lastExpeditionReward || null,
        _lastExpeditionId: game._lastExpeditionId || null,
        adventureRumors: game.adventureRumors || [],
        activeAdventures: game.activeAdventures || [],
        completedAdventures: game.completedAdventures || [],
        adventureDiscovery: game.adventureDiscovery,
        lastAdventureReward: game.lastAdventureReward || null,
        artifacts: game.artifacts,
        equippedArtifacts: game.equippedArtifacts,
        formations: game.formations,
        selectedFormations: game.selectedFormations,
        gameOver: game.gameOver,
        prestige: game.prestige,
        pendingRebirth: game.pendingRebirth,
        paused: !!game._paused,
        pausedTimerProgress: game._paused ? game._pauseTimerProgress : null,
        _minRootTier: game._minRootTier || null,
        logEntries: _getLogEntries(),
        version: 18
    };
}

function saveGame() {
    try {
        const data = getSaveableState();
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
        localStorage.setItem(SAVE_MIGRATION_KEY, "1");
        return true;
    } catch (e) {
        console.error("Ошибка сохранения:", e);
        return false;
    }
}

function loadGame() {
    try {
        let raw = localStorage.getItem(SAVE_KEY);
        if (!raw && localStorage.getItem(SAVE_MIGRATION_KEY) !== "1") {
            // Новый единый интерфейс принимает прежний профиль один раз, не изменяя исходную копию.
            for (const key of ["cultivation_game_save_v2", "cultivation_game_save"]) {
                const previous = localStorage.getItem(key);
                if (!previous) continue;
                try {
                    const data = JSON.parse(previous);
                    if (!Number.isInteger(data.realmIndex) || data.realmIndex < 0 || data.realmIndex >= 15) continue;
                    raw = previous;
                    localStorage.setItem(SAVE_KEY, raw);
                    break;
                } catch { /* Пропустить некорректный прежний профиль. */ }
            }
            localStorage.setItem(SAVE_MIGRATION_KEY, "1");
        }
        if (!raw) return null;
        const data = JSON.parse(raw);
        localStorage.setItem(SAVE_MIGRATION_KEY, "1");
        return data;
    } catch (e) {
        console.error("Ошибка загрузки:", e);
        return null;
    }
}

function hasSave() {
    return localStorage.getItem(SAVE_KEY) !== null || loadGame() !== null;
}

function deleteSave() {
    localStorage.removeItem(SAVE_KEY);
    localStorage.setItem(SAVE_MIGRATION_KEY, "1");
}

function applyLoadedState(data) {
    if (!data) return false;

    // Импорт заменяет текущую жизнь: не переносить мутации глобальных техник
    // из предыдущего сейва. Техники загруженной секты зарегистрируем ниже.
    for (const tech of new Set([...TECHNIQUES, ...Object.values(SECT_TECHNIQUES)])) {
        if (TECHNIQUES_ORIGINAL_TIERS[tech.id]) tech.tier = TECHNIQUES_ORIGINAL_TIERS[tech.id];
        if (TECHNIQUES_ORIGINAL_NAMES[tech.id]) tech.name = TECHNIQUES_ORIGINAL_NAMES[tech.id];
        if (TECHNIQUES_ORIGINAL_DESCRIPTIONS[tech.id]) tech.description = TECHNIQUES_ORIGINAL_DESCRIPTIONS[tech.id];
    }
    for (let i = TECHNIQUES.length - 1; i >= 0; i--) {
        if (TECHNIQUES[i].source === "sect") TECHNIQUES.splice(i, 1);
    }

    game.name = data.name || "Культиватор";
    game.qi = data.qi || 0;
    game.daoProgress = data.daoProgress || 0;
    game.daoLevel = data.daoLevel || 0;
    game.realmIndex = data.realmIndex || 0;
    game._maxRealmThisLife = Math.max(game.realmIndex, Number.isFinite(data._maxRealmThisLife) ? data._maxRealmThisLife : 0);
    game._startingRealmThisLife = Number.isInteger(data._startingRealmThisLife) && data._startingRealmThisLife >= 0
        && data._startingRealmThisLife < REALMS.length ? data._startingRealmThisLife : 0;
    game.subLevel = data.subLevel || 1;
    game.years = data.years ?? 16;
    game.birthYear = data.birthYear || 0;
    game.strength = data.strength || 1;
    game.spirit = data.spirit || 1;
    game.luck = data.luck || 1;
    game.stones = data.stones || 0;
    game.pills = data.pills || 0;
    game.daoEssence = data.daoEssence || 0;
    game.artifactDust = data.artifactDust || 0;
    game.refinedPills = data.refinedPills || 0;
    game.spiritualPills = data.spiritualPills || 0;
    game.heavenlyPills = data.heavenlyPills || 0;
    // Миграция: конвертировать старые пилюли (pillsUsedThisLife больше не нужен)
    game.enhanceFailstacks = data.enhanceFailstacks || 0;
    game.daoScrolls = data.daoScrolls || 0;
    game.scrollFailstacksApplied = data.scrollFailstacksApplied || 0;
    game.gameOver = data.gameOver || false;
    game.flags = data.flags || {};
    game.techniques = data.techniques || [];
    game.techLevels = data.techLevels || {};
    // Пустой массив означает осознанно снятые техники; только отсутствующее
    // поле требует миграции. Лимит старого сейва рассчитаем после prestige.
    if (Array.isArray(data.equippedTechniques)) {
        game.equippedTechniques = data.equippedTechniques.filter(tid => game.techniques.includes(tid));
    } else {
        game.equippedTechniques = [];
    }
    game.spiritualRoot = data.spiritualRoot || null;
    game.milestones = data.milestones || [];
    // Миграция переименованных milestone ID
    const _milestoneRenames = {
        "ten_meditations": "five_breakthroughs",
        "hundred_med": "ten_breakthroughs"
    };
    for (const [oldId, newId] of Object.entries(_milestoneRenames)) {
        const replaceIn = (arr) => {
            const idx = arr.indexOf(oldId);
            if (idx !== -1) {
                if (!arr.includes(newId)) arr[idx] = newId;
                else arr.splice(idx, 1);
            }
        };
        replaceIn(game.milestones);
    }
    game.totalMeditations = data.totalMeditations || 0;
    game.meditationYears = data.meditationYears || 0;
    game.totalBreakthroughs = data.totalBreakthroughs || 0;
    game.worldEvent = data.worldEvent || null;
    if (game.worldEvent && game.worldEvent.id === "secret_realm") {
        const eventDefinition = WORLD_EVENTS.find(event => event.id === "secret_realm");
        game.worldEvent.name = eventDefinition.name;
        game.worldEvent.modifiers = { ...eventDefinition.modifiers };
    }
    if (game.worldEvent && game.years >= game.worldEvent.startYear + game.worldEvent.duration) {
        game.worldEvent = null;
    }
    game.lastWorldEventYear = data.lastWorldEventYear || 0;
    game.currentActivity = data.currentActivity || "meditation";
    game.activityXP = data.activityXP || { strength: 0, spirit: 0, luck: 0 };
    game.techXP = data.techXP || {};
    game._pendingInsightXP = data._pendingInsightXP || null;
    game._insightTicksLeft = data._insightTicksLeft || 0;
    game.sect = data.sect || null;
    // Миграция: старый sectMission (одиночный) → sectMissions (массив)
    if (data.sectMission && !data.sectMissions) {
        game.sectMissions = [data.sectMission];
    } else {
        game.sectMissions = Array.isArray(data.sectMissions) ? data.sectMissions : [];
    }
    game.sectMissions = game.sectMissions.map(mission => mission || { cooldown: 1 });
    // Дополнить до 3 слотов если их меньше (миграция или старое сохранение)
    if (game.sect && game.sectMissions.length > 0 && game.sectMissions.length < 3) {
        while (game.sectMissions.length < 3) {
            game.sectMissions.push({ cooldown: 1 });
        }
    }
    game.sectMissionTimer = data.sectMissionTimer || 0;
    game.disciplesState = data.disciplesState || null;
    game.startingTechniqueId = data.startingTechniqueId || "basic_breathing";
    game.practicePlan = data.practicePlan || null;
    game.expedition = data.expedition || null;
    game._insightUses = data._insightUses || 0;
    game.ascendedLocations = data.ascendedLocations || {};
    game.expeditionCompletions = data.expeditionCompletions || {};
    game.lastExpeditionReward = data.lastExpeditionReward || null;
    game._lastExpeditionId = data._lastExpeditionId || null;
    game.adventureRumors = data.adventureRumors || [];
    game.activeAdventures = data.activeAdventures || [];
    game.completedAdventures = data.completedAdventures || [];
    game.adventureDiscovery = data.adventureDiscovery || {
        poolKey: "", waitYears: 0,
        lastCompleteYear: data.lastAdventureReward ? data.lastAdventureReward.year : null
    };
    game._yearsSinceAdventure = 0;
    game._lastAdventureCompleteYear = game.adventureDiscovery.lastCompleteYear || 0;
    game.lastAdventureReward = data.lastAdventureReward || null;
    game.artifacts = data.artifacts || [];
    game.equippedArtifacts = data.equippedArtifacts || { weapon: null, armor: null, accessory: null, treasure: null };
    game.formations = data.formations || {};
    game.selectedFormations = data.selectedFormations || [];
    game.prestige = data.prestige || { karma: 0, karmaSpent: 0, totalRebirths: 0, permanentMilestones: [], karmaUpgrades: {}, lastBody: "peasant", bodyAscensions: {}, worldAge: 0, daoLevels: {}, unlockedFormations: [] };
    game.pendingRebirth = data.pendingRebirth || null;
    game.prestige.qualifiedRebirths ??= 0;
    game.prestige.bodyLives ||= {};
    // Миграция переименованных milestone ID в permanentMilestones
    if (game.prestige.permanentMilestones) {
        for (const [oldId, newId] of Object.entries(_milestoneRenames)) {
            const idx = game.prestige.permanentMilestones.indexOf(oldId);
            if (idx !== -1) {
                if (!game.prestige.permanentMilestones.includes(newId)) {
                    game.prestige.permanentMilestones[idx] = newId;
                } else {
                    game.prestige.permanentMilestones.splice(idx, 1);
                }
            }
        }
    }
    // Миграция v9→v10: формации из prestige в game (перманентные → за жизнь)
    if (data.version < 10 && game.prestige.formations) {
        // Старые перманентные формации убираются — камни уже потрачены
        delete game.prestige.formations;
    }
    // Миграция worldAge: старые сейвы без worldAge
    if (game.prestige.worldAge === undefined) game.prestige.worldAge = 0;
    // Миграция bodyAscensions: старые сейвы
    if (!game.prestige.bodyAscensions) game.prestige.bodyAscensions = {};
    // Не реконструируем расходы по ценам: это завышало заработанную карму.
    if (!Number.isFinite(game.prestige.karmaSpent) || game.prestige.karmaSpent < 0) {
        game.prestige.karmaSpent = 0;
    }
    // Миграция v11→v12: дао уровни и формации
    if (!game.prestige.daoLevels) game.prestige.daoLevels = {};
    if (!game.prestige.unlockedFormations) game.prestige.unlockedFormations = [];
    if (!game.prestige.heavenlyStats) game.prestige.heavenlyStats = {};
    game._minRootTier = data._minRootTier || null;
    // Миграция артефактов: старые сейвы с level/maxLevel → enhance, transcend
    for (const art of game.artifacts) {
        art.enhance ??= 0;
        art.investedEssence ??= 0;
        art.investedDust ??= 0;
        art.transcend ??= 0;
    }
    for (const slot of ARTIFACT_SLOTS) {
        const art = game.equippedArtifacts[slot];
        if (art && art.enhance === undefined) {
            art.enhance = 0;
            art.investedEssence = 0;
            art.investedDust = 0;
        }
        if (art && art.transcend === undefined) art.transcend = 0;
    }
    // Связать equippedArtifacts с объектами из artifacts (JSON.parse создаёт копии)
    for (const slot of ARTIFACT_SLOTS) {
        const eq = game.equippedArtifacts[slot];
        if (eq) {
            const real = game.artifacts.find(a => a.id === eq.id);
            if (real) {
                game.equippedArtifacts[slot] = real;
            } else {
                game.equippedArtifacts[slot] = null;
            }
        }
    }
    // Миграция: убрать техники сект, в которых игрок не состоит (старые сейвы до правки leaveSect)
    const currentSectId = game.sect ? game.sect.id : null;
    for (const sect of SECTS) {
        if (sect.id === currentSectId) continue; // текущая секта — не трогать
        const sectTechIds = [];
        if (sect.technique && SECT_TECHNIQUES[sect.technique]) sectTechIds.push(SECT_TECHNIQUES[sect.technique].id);
        if (sect.advancedTechnique && SECT_TECHNIQUES[sect.advancedTechnique]) sectTechIds.push(SECT_TECHNIQUES[sect.advancedTechnique].id);
        for (const tid of sectTechIds) {
            const idx = game.techniques.indexOf(tid);
            if (idx !== -1) game.techniques.splice(idx, 1);
            const eqIdx = game.equippedTechniques.indexOf(tid);
            if (eqIdx !== -1) game.equippedTechniques.splice(eqIdx, 1);
        }
    }

    // Миграция v12→v13: синхронизация sect.rank с реальным рангом
    if (game.sect && typeof game.getSectRankIndex === "function") {
        const realRank = game.getSectRankIndex();
        if (game.sect.rank !== realRank) {
            game.sect.rank = realRank;
        }
    }
    // Миграция v12→v13: восстановить ascendedLocations из completedAdventures
    if (game.completedAdventures) {
        const ascendMap = {
            ascend_spirit_forest: ["spirit_forest", 1],
            ascend_beast_cave: ["beast_cave", 1],
            ascend_forgotten_ruins: ["forgotten_ruins", 1],
            ascend_heavenly_auction: ["heavenly_auction", 1],
            ascend_demon_abyss: ["demon_abyss", 1],
            ascend_immortal_palace: ["immortal_palace", 1],
            ascend2_spirit_forest: ["spirit_forest", 2],
            ascend2_beast_cave: ["beast_cave", 2],
            ascend2_forgotten_ruins: ["forgotten_ruins", 2],
        };
        if (!game.ascendedLocations) game.ascendedLocations = {};
        for (const [advId, [locId, tier]] of Object.entries(ascendMap)) {
            if (game.completedAdventures.includes(advId)) {
                if ((game.ascendedLocations[locId] || 0) < tier) {
                    game.ascendedLocations[locId] = tier;
                }
            }
        }
    }

    // Миграция: добавить техники сект в глобальный массив TECHNIQUES
    if (game.sect) {
        const sect = SECTS.find(s => s.id === game.sect.id);
        if (sect) {
            // Базовая техника секты
            const baseTech = SECT_TECHNIQUES[sect.technique];
            if (baseTech && !TECHNIQUES.find(t => t.id === baseTech.id)) {
                TECHNIQUES.push(baseTech);
            }
            // Продвинутая техника (если ранг >= core и техника не выдана)
            if (sect.advancedTechnique && game.sect.rank >= 2) {
                const advTech = SECT_TECHNIQUES[sect.advancedTechnique];
                if (advTech) {
                    if (!TECHNIQUES.find(t => t.id === advTech.id)) {
                        TECHNIQUES.push(advTech);
                    }
                    if (!game.techniques.includes(advTech.id)) {
                        game.techniques.push(advTech.id);
                        // Сохранить существующий уровень если есть
                        if (!game.techLevels[advTech.id]) game.techLevels[advTech.id] = 1;
                    }
                }
            }
        }
    }

    // Техники секты добавляются динамически, поэтому их тиры восстанавливаем
    // только после регистрации. Отсутствующая карта означает исходные тиры.
    game._restoreAscendedTiers(data.techAscendedTiers || {});
    if (!Array.isArray(data.equippedTechniques)) {
        game.equippedTechniques = game.techniques.slice(0, game.getMaxTechSlots());
    }
    game.ensureExpeditionRewardSnapshot();

    // Восстановить хроники
    if (data.logEntries && data.logEntries.length > 0) {
        _restoreLogEntries(data.logEntries);
    }

    // Старый оплаченный опыт выдаётся после восстановления всех техник и тиров.
    // Новые покупки начисляют XP сразу; сохранённая очередь остаётся миграцией.
    if (typeof game._flushPendingInsightXP === "function") game._flushPendingInsightXP();
    if (typeof game._restoreDiscipleState === "function") game._restoreDiscipleState(game.disciplesState);
    if (typeof game._restorePauseState === "function") game._restorePauseState(data);

    return true;
}

// === ХРОНИКИ: сохранение/загрузка ===

function _getLogEntries() {
    const log = document.getElementById("event-log");
    if (!log || !log.children) return [];
    const entries = [];
    const children = log.children;
    const start = Math.max(0, children.length - 50);
    for (let i = start; i < children.length; i++) {
        const el = children[i];
        entries.push({
            text: el.dataset.text || el.textContent,
            type: el.className.split(/\s+/).find(name => name.startsWith("log-") && name !== "log-entry")?.slice(4) || "system",
            worldYear: el.dataset.worldYear || "",
            charAge: el.dataset.charAge || ""
        });
    }
    return entries;
}

function _restoreLogEntries(entries) {
    const log = document.getElementById("event-log");
    if (!log) return;
    log.innerHTML = "";
    for (const e of entries) {
        const el = document.createElement("div");
        el.className = `log-entry log-${e.type}`;
        el.dataset.worldYear = e.worldYear;
        el.dataset.charAge = e.charAge;
        el.dataset.text = e.text;
        el.textContent = `[${_getLogTimeLabel(e)}] ${e.text}`;
        log.appendChild(el);
    }
    if (typeof _scrollLogToBottom === "function") _scrollLogToBottom();
    else log.scrollTop = log.scrollHeight;
}

function exportSave() {
    const json = JSON.stringify(getSaveableState());
    navigator.clipboard.writeText(json).then(() => {
        addLog("Сейв скопирован в буфер обмена!", "system");
    }).catch(() => {
        prompt("Скопируйте текст ниже:", json);
    });
}

function exportDetailedSave() {
    const save = getSaveableState();
    // Убрать logEntries — занимает много места и не нужен для анализа
    delete save.logEntries;

    // Добавить computed-данные
    const realm = REALMS[game.realmIndex];
    const root = game.spiritualRoot;
    const rank = game.getCurrentSectRank();
    const nextRank = game.getNextSectRank();
    const sect = game.sect ? SECTS.find(s => s.id === game.sect.id) : null;
    const era = game.getCurrentEra();
    const bodyPerks = game.getActiveBodyPerks();
    const body = REBIRTH_BODIES.find(b => b.id === (game.prestige.lastBody || "peasant"));

    save._computed = {
        // --- Персонаж ---
        characterAge: game.characterAge(),
        maxAge: game.maxAge(),
        realmName: realm ? realm.name : "?",
        subLevelName: SUB_LEVEL_NAMES[game.subLevel - 1],
        rootName: root ? root.name : "нет",
        rootTier: root ? root.tier : "нет",
        rootElements: root && root.elements ? root.elements : [],
        rootQiMultiplier: root ? root.qiMultiplier : 1,
        bodyName: body ? body.name : "?",
        bodyId: game.prestige.lastBody || "peasant",

        // --- Ци ---
        qiPerSec: game.qiPerSec(),
        qiNeeded: game.qiNeeded(),
        qiPct: game.qiNeeded() === Infinity ? 0 : Math.round(game.qi / game.qiNeeded() * 10000) / 100,
        spiritMult: game.getSpiritMultiplier(),
        strengthMult: game.getStrengthMultiplier(),
        qiMultiplier: game.getQiMultiplier(),
        techQiMult: game.getTechQiMultiplier(),
        karmaQiMult: game.getKarmaQiMultiplier(),
        elementalMult: game.getElementalMultiplier(),
        formationQiMult: 1 + game.getFormationBonus("qi"),
        artifactQiMult: 1 + game.getArtifactBonus("qi") * 0.01,
        sectQiMult: 1 + game.getSectBonus("qi"),

        // --- Бой ---
        combatPower: game.getCombatPower(),
        artifactStrength: game.getArtifactBonus("strength"),
        artifactCombatPower: game.getArtifactBonus("combatPower"),
        techCombatMult: 1 + game.getTechBonus("combatPower"),
        sectCombatMult: 1 + game.getSectBonus("combatPower"),

        // --- Дао ---
        daoProgress: game.daoProgress || 0,
        daoLevel: game.daoLevel || 0,
        daoNeeded: typeof game.daoNeeded === "function" ? game.daoNeeded() : 0,
        daoPct: typeof game.daoNeeded === "function" && game.daoNeeded() > 0 ? Math.round((game.daoProgress || 0) / game.daoNeeded() * 10000) / 100 : 0,
        daoPath: sect ? (sect.daoPath || "нет") : "нет",
        daoName: sect ? (sect.daoName || "нет") : "нет",
        daoActivity: sect ? (sect.daoActivity || "нет") : "нет",
        daoLevelsAll: game.prestige.daoLevels || {},
        unlockedFormations: game.prestige.unlockedFormations || [],

        // --- Прорыв ---
        breakthroughChance: Math.round(game.getBreakthroughChance() * 10000) / 100,
        demonChance: Math.round(game.getEffectiveDemonChance() * 10000) / 100,
        techBreakthroughBonus: game.getTechBonus("breakthroughBonus"),
        artifactBreakthroughBonus: game.getArtifactBonus("breakthroughBonus") * 0.01,
        sectBreakthroughBonus: game.getSectBonus("breakthroughBonus"),
        formationBreakthroughBonus: game.getFormationBonus("breakthroughBonus"),
        qiRetention: game.getQiRetention(),

        // --- Статы ---
        statXpPerTick_strength: game.statXpPerTick("strength"),
        statXpPerTick_spirit: game.statXpPerTick("spirit"),
        statXpPerTick_luck: game.statXpPerTick("luck"),
        statXpNeeded_strength: game.statXpNeeded("strength"),
        statXpNeeded_spirit: game.statXpNeeded("spirit"),
        statXpNeeded_luck: game.statXpNeeded("luck"),
        totalLuck: game.luck + game.getFormationBonus("luck") + game.getArtifactBonus("luck"),

        // --- Техники (развёрнутые) ---
        techSlots: `${game.equippedTechniques.length}/${game.getMaxTechSlots()}`,
        techniquesDetail: game.techniques.map(tid => {
            const t = TECHNIQUES.find(x => x.id === tid);
            if (!t) return { id: tid, error: "not found" };
            return {
                id: tid,
                name: t.name,
                tier: t.tier,
                equipped: game.isTechEquipped(tid),
                level: game.techLevels[tid] || 1,
                maxLevel: t.maxLevel,
                xp: game.techXP[tid] || 0,
                xpNeeded: game.techXpNeeded(tid),
                xpPerTick: game.isTechEquipped(tid) ? game.techXpPerTick(tid) : 0,
                effects: t.effects,
                element: t.element || null
            };
        }),

        // --- Артефакты (развёрнутые) ---
        equippedDetail: Object.entries(game.equippedArtifacts).map(([slot, art]) => {
            if (!art) return { slot, empty: true };
            return {
                slot,
                name: art.name,
                tier: art.tier,
                enhance: art.enhance || 0,
                transcend: art.transcend || 0,
                effects: art.effects,
                enhanceMult: Math.pow(1.2, art.enhance || 0) * (typeof TRANSCEND_MULTS !== "undefined" ? (TRANSCEND_MULTS[art.transcend || 0] || 1) : 1)
            };
        }),

        // --- Формации (активные) ---
        activeFormations: (game.selectedFormations || []).map(fid => {
            const f = CULT_FORMATIONS.find(x => x.id === fid);
            if (!f) return { id: fid, error: "not found" };
            const level = game.formations[fid] || 0;
            const daoCap = f.sect ? (game.daoLevel || 0) : f.maxLevel;
            return {
                id: fid,
                name: f.name,
                effectKey: f.effectKey,
                level: level,
                maxLevel: f.maxLevel,
                daoCap: daoCap,
                effectiveMax: Math.min(f.maxLevel, daoCap),
                sect: f.sect || null,
                totalBonus: level * f.effectPerLevel
            };
        }),

        // --- Секта ---
        sectName: sect ? sect.name : "нет",
        sectRankName: rank ? rank.name : "нет",
        sectRankMult: rank ? rank.bonusMult : 0,
        sectContribution: game.sect ? game.sect.contribution : 0,
        sectNextRank: nextRank ? { name: nextRank.name, contribution: nextRank.contribution } : null,
        sectElementAffinity: game.sect ? game.getSectElementAffinity() : 1,

        // --- Эпоха и мир ---
        eraName: era ? era.name : "?",
        eraQiMult: era ? era.qiMultiplier : 1,
        eraDangerWeight: era ? era.dangerWeight : 1,
        eraRewardWeight: era ? era.rewardWeight : 1,
        worldEventName: game.worldEvent ? game.worldEvent.name : "нет",

        // --- Перки тела ---
        bodyPerks: bodyPerks,

        // --- Скорость ---
        speedMultiplier: game.getSpeedMultiplier(),
        debugSpeed: game.debugSpeed,

        // --- Пейсинг (время до ключевых событий) ---
        pacing: (() => {
            const qps = game.qiPerSec();
            const qiLeft = game.qiNeeded() - game.qi;
            const secsToBreakthrough = qps > 0 && qiLeft > 0 ? Math.ceil(qiLeft / qps) : 0;
            const btChance = game.getBreakthroughChance();
            // Среднее число попыток = 1/chance, каждая попытка = накопить ци заново
            const avgAttempts = btChance > 0 ? Math.ceil(1 / btChance) : Infinity;
            const secsPerAttempt = qps > 0 ? Math.ceil(game.qiNeeded() / qps) : Infinity;

            const statPacing = {};
            for (const stat of ["strength", "spirit", "luck"]) {
                const xpLeft = game.statXpNeeded(stat) - (game.activityXP[stat] || 0);
                const xpTick = game.statXpPerTick(stat);
                statPacing[stat] = {
                    level: game[stat],
                    xpLeft: Math.max(0, Math.round(xpLeft * 100) / 100),
                    secsToNextLevel: xpTick > 0 ? Math.ceil(Math.max(0, xpLeft) / xpTick) : Infinity,
                    secsToNextLevel_passive: xpTick > 0 ? Math.ceil(Math.max(0, xpLeft) / (xpTick * 0.15)) : Infinity
                };
            }

            // Дао пейсинг
            const daoNeeded = typeof game.daoNeeded === "function" ? game.daoNeeded() : 0;
            const daoLeft = Math.max(0, daoNeeded - (game.daoProgress || 0));
            const daoPct = daoNeeded > 0 ? Math.round((game.daoProgress || 0) / daoNeeded * 100) : 0;

            return {
                secsToQiFull: secsToBreakthrough,
                minsToQiFull: Math.round(secsToBreakthrough / 60 * 10) / 10,
                breakthroughChancePct: Math.round(btChance * 100 * 100) / 100,
                avgAttemptsToBreakthrough: avgAttempts,
                avgSecsPerBreakthrough: secsPerAttempt * avgAttempts,
                avgMinsPerBreakthrough: Math.round(secsPerAttempt * avgAttempts / 60 * 10) / 10,
                yearsToMaxAge: game.maxAge() === Infinity ? Infinity : game.maxAge() - game.characterAge(),
                daoPct: daoPct,
                daoLeft: Math.floor(daoLeft),
                daoNeeded: daoNeeded,
                stats: statPacing
            };
        })(),

        // --- Прорыв: провалы по реалмам ---
        breakthroughFails: game.flags.breakthroughFails || {},
        pills: { basic: game.pills, refined: game.refinedPills || 0, spiritual: game.spiritualPills || 0, heavenly: game.heavenlyPills || 0 },
        pillBreakthroughBonus: game.flags._pillBreakthroughBonus || 0,
        heavenlyStats: game.prestige.heavenlyStats || {},

        // --- Доход ресурсов ---
        income: (() => {
            const stonePerYear = game._calcStoneIncome();
            const totalSpeed = game.getSpeedMultiplier() * (game.debugSpeed || 1);
            const yearMs = 5000 / totalSpeed;
            const yearsPerMinute = 60000 / yearMs;
            return {
                stonesPerYear: stonePerYear,
                stonesPerMinute: Math.round(stonePerYear * yearsPerMinute * 10) / 10,
                yearsPerMinuteRealtime: Math.round(yearsPerMinute * 10) / 10,
                expeditionActive: game.expedition ? {
                    location: game.expedition.locationId,
                    timeLeft: Math.max(0, game.getAdjustedExpeditionDuration() - (game.years - game.expedition.startYear))
                } : null
            };
        })(),

        // --- Инвентарь артефактов (все, не только экипированные) ---
        allArtifacts: (game.artifacts || []).map(art => ({
            id: art.id,
            name: art.name,
            slot: art.slot,
            tier: art.tier,
            enhance: art.enhance || 0,
            transcend: art.transcend || 0,
            effects: art.effects,
            equipped: Object.values(game.equippedArtifacts).some(eq => eq && eq.id === art.id)
        })),

        // --- Вознесение царств ---
        expeditions: (() => {
            const result = {};
            for (const loc of LOCATIONS) {
                const completions = (game.expeditionCompletions || {})[loc.id] || 0;
                const ascTier = (game.ascendedLocations || {})[loc.id] || 0;
                if (completions > 0 || ascTier > 0) {
                    result[loc.id] = {
                        name: game.getLocationName(loc.id),
                        completions: completions,
                        ascendTier: ascTier,
                        rewardMult: ascTier >= 2 ? 3 : ascTier >= 1 ? 2 : 1,
                        nextAscend: ascTier === 0 ? (completions >= 10 ? "готово к тир 2" : `${completions}/10`) : ascTier === 1 ? (completions >= 20 ? "готово к тир 3" : `${completions}/20`) : "макс"
                    };
                }
            }
            return result;
        })(),

        // --- Дао скорость ---
        daoSpeedMult: typeof game.getDaoSpeedMultiplier === "function" ? game.getDaoSpeedMultiplier() : 1,

        // --- Совершенствование (statXpSpeed) ---
        statXpSpeedTotal: (() => {
            const form = game.getFormationBonus("statXpSpeed");
            const sect = game.getSectBonus("statXpSpeed");
            const art = game.getArtifactBonus("statXpSpeed") * 0.01;
            const tech = game.getTechBonus("statXpSpeed");
            return { formation: form, sect: sect, artifact: art, technique: tech, total: form + sect + art + tech };
        })(),

        // --- Мастерство техник (techXpSpeed) ---
        techXpSpeedTotal: (() => {
            const form = game.getFormationBonus("techXpSpeed");
            const sect = game.getSectBonus("techXpSpeed");
            const art = game.getArtifactBonus("techXpSpeed") * 0.01;
            const tech = game.getTechBonus("techXpSpeed");
            return { formation: form, sect: sect, artifact: art, technique: tech, total: form + sect + art + tech };
        })(),

        // --- Приключения ---
        adventureStats: {
            totalAdventures: game.prestige.totalAdventures || 0,
            completedThisLife: (game.completedAdventures || []).length,
            activeRumors: game.adventureRumors.length,
            activeAdventures: game.activeAdventures.length
        },

        // --- Стоимости (что можно купить прямо сейчас) ---
        costs: (() => {
            const costs = {};
            // Формации
            costs.formations = (game.selectedFormations || []).map(fid => {
                const f = CULT_FORMATIONS.find(x => x.id === fid);
                if (!f) return null;
                const lvl = game.formations[fid] || 0;
                return lvl < f.maxLevel ? { name: f.name, nextLevelCost: game.getFormationUpgradeCost(fid), currentLevel: lvl } : null;
            }).filter(Boolean);
            // Заточка экипированных
            costs.enhance = Object.entries(game.equippedArtifacts).map(([slot, art]) => {
                if (!art) return null;
                const lvl = art.enhance || 0;
                const chance = typeof game.getEnhanceChance === "function" ? Math.round(game.getEnhanceChance(art) * 100) + "%" : "?";
                return { slot, name: art.name, enhance: lvl, nextChance: chance, failstacks: game.enhanceFailstacks };
            }).filter(Boolean);
            // Страховка прорыва
            costs.breakthroughInsurance = 50 + game.realmIndex * 20;
            // Свиток озарения
            costs.insightScroll = typeof game.getInsightCost === "function" ? game.getInsightCost() : "?";
            return costs;
        })(),

        // --- Долголетие ---
        lifespan: (() => {
            const techLifespan = game.getTechBonus("lifespan");
            const artLifespan = game.getArtifactBonus("lifespan") * 0.01;
            return {
                baseMaxAge: REALMS[game.realmIndex] ? REALMS[game.realmIndex].maxAge : "?",
                techBonus: techLifespan,
                artifactBonus: artLifespan,
                totalBonus: techLifespan + artLifespan,
                effectiveMaxAge: game.maxAge()
            };
        })(),

        // --- Удержание ци (разбивка) ---
        qiRetentionBreakdown: (() => {
            const tech = game.getTechBonus("qiRetention");
            const art = game.getArtifactBonus("qiRetention") * 0.01;
            const sect = game.getSectBonus("qiRetention");
            const body = (game.getActiveBodyPerks().retention || 0);
            return { technique: tech, artifact: art, sect: sect, body: body, total: game.getQiRetention() };
        })(),

        // --- Карма ---
        karma: {
            current: game.prestige.karma,
            totalSpent: typeof game._getTotalKarmaSpent === "function" ? game._getTotalKarmaSpent() : 0,
            totalEver: game.prestige.karma + (typeof game._getTotalKarmaSpent === "function" ? game._getTotalKarmaSpent() : 0),
            karmaPreview: typeof game.calculateKarma === "function" ? game.calculateKarma(false) : 0,
            karmaPreviewNatural: typeof game.calculateKarma === "function" ? game.calculateKarma(true) : 0,
            upgrades: game.prestige.karmaUpgrades || {},
            bodyAscensions: game.prestige.bodyAscensions || {}
        },

        // --- Экспедиция: опасность ---
        expeditionDanger: (() => {
            if (!game.expedition) return null;
            const loc = LOCATIONS.find(l => l.id === game.expedition.locationId);
            if (!loc) return null;
            return {
                dangerLevel: game.getEffectiveDangerLevel(loc),
                combatPower: game.getCombatPower(),
                failChancePerYear: game.getExpeditionFailChance(),
                duration: game.getAdjustedExpeditionDuration(),
                timeLeft: Math.max(0, game.getAdjustedExpeditionDuration() - (game.years - game.expedition.startYear))
            };
        })(),

        // --- Мировое событие ---
        worldEventDetail: game.worldEvent ? {
            name: game.worldEvent.name,
            yearsLeft: Math.max(0, (game.worldEvent.startYear + game.worldEvent.duration) - game.years),
            modifiers: game.worldEvent.modifiers
        } : null,

        // --- Элементальный резонанс ---
        elementalResonance: (() => {
            if (!game.spiritualRoot || !game.spiritualRoot.elements || game.spiritualRoot.elements.length === 0) return { count: 0, techs: [] };
            const matching = (game.equippedTechniques || []).filter(tid => {
                const t = TECHNIQUES.find(x => x.id === tid);
                return t && t.element && game.spiritualRoot.elements.includes(t.element);
            }).map(tid => {
                const t = TECHNIQUES.find(x => x.id === tid);
                return { id: tid, name: t.name, element: t.element };
            });
            return { count: matching.length, techs: matching };
        })(),

        // --- Bottleneck (что лимитирует прогресс) ---
        bottleneck: (() => {
            const qps = game.qiPerSec();
            const btChance = game.getBreakthroughChance();
            const age = game.characterAge();
            const maxAge = game.maxAge();
            const qiLeft = game.qiNeeded() - game.qi;
            const secsToFull = qps > 0 ? qiLeft / qps : Infinity;
            const yearsToFull = secsToFull / (5 / game.getSpeedMultiplier());
            const yearsLeft = maxAge === Infinity ? Infinity : maxAge - age;

            const issues = [];
            if (maxAge !== Infinity && yearsToFull > yearsLeft * 0.8) {
                issues.push("LIFESPAN: не хватает лет жизни для накопления ци");
            }
            if (btChance < 0.10) {
                issues.push(`LOW_BREAKTHROUGH: шанс прорыва ${Math.round(btChance*100)}% — нужны бонусы`);
            }
            if (game.getEffectiveDemonChance() > 0.30) {
                issues.push(`HIGH_DEMON: шанс демона ${Math.round(game.getEffectiveDemonChance()*100)}%`);
            }
            if (qps < game.qiNeeded() * 0.001) {
                issues.push("SLOW_QI: очень медленный набор ци относительно требования");
            }
            if (game.realmIndex >= 3 && !game.sect) {
                issues.push("NO_SECT: реалм 3+, но нет секты — нет Пути Дао, прорыв реалма заблокирован");
            }
            if (game.realmIndex >= 3 && game.sect && game.subLevel >= SUB_LEVELS) {
                const daoNeeded = typeof game.daoNeeded === "function" ? game.daoNeeded() : 0;
                const daoPct = daoNeeded > 0 ? (game.daoProgress || 0) / daoNeeded : 0;
                if (daoPct < 0.5) {
                    issues.push(`LOW_DAO: постижение Дао ${Math.round(daoPct*100)}% — нужны экспедиции, тренировки, задания`);
                }
            }
            if (game.realmIndex >= 9 && game.prestige.totalRebirths === 0) {
                issues.push("SHOULD_REBIRTH: реалм 9+, но ни одного перерождения");
            }
            if (issues.length === 0) issues.push("OK: прогресс сбалансирован");
            return issues;
        })(),

        // --- Достижения (развёрнутые) ---
        milestonesDetail: (() => {
            const tierCounts = {};
            const catCounts = {};
            const achieved = [];
            const locked = [];

            for (const m of MILESTONES) {
                const t = m.tier || "bronze";
                const c = m.category || "cultivation";
                if (!tierCounts[t]) tierCounts[t] = { done: 0, total: 0 };
                if (!catCounts[c]) catCounts[c] = { done: 0, total: 0 };
                tierCounts[t].total++;
                catCounts[c].total++;

                if (game.milestones.includes(m.id)) {
                    tierCounts[t].done++;
                    catCounts[c].done++;
                    achieved.push({ id: m.id, name: m.name, tier: t, category: c });
                } else {
                    locked.push({ id: m.id, name: m.name, tier: t, category: c, description: m.description });
                }
            }

            return {
                total: MILESTONES.length,
                achieved: achieved.length,
                byTier: tierCounts,
                byCategory: catCounts,
                achievedList: achieved,
                lockedList: locked
            };
        })()
    };

    const json = JSON.stringify(save, null, 2);
    navigator.clipboard.writeText(json).then(() => {
        addLog("Подробный сейв скопирован в буфер обмена!", "system");
    }).catch(() => {
        prompt("Скопируйте текст ниже:", json);
    });
}

function importSave(json) {
    if (!json) {
        json = prompt("Вставьте строку сейва:");
        if (!json) return false;
    }
    // Очистка: убрать метаданные мессенджеров, переносы строк, лишний текст
    json = json.replace(/\n/g, "");
    json = json.replace(/\[\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}\]\s*[^:]*:\s*/g, "");
    const start = json.indexOf("{");
    const end = json.lastIndexOf("}");
    if (start !== -1 && end !== -1) json = json.substring(start, end + 1);
    try {
        const data = JSON.parse(json);
        if (!data.realmIndex && data.realmIndex !== 0) {
            addLog("Некорректный формат сейва.", "danger");
            return false;
        }
        const keepPaused = !!game._paused;
        game.stop();
        applyLoadedState(data);
        resumeLoadedGame(keepPaused);
        saveGame();
        addLog("Сейв успешно загружен!", "system");
        return true;
    } catch (e) {
        addLog("Ошибка импорта: " + e.message, "danger");
        return false;
    }
}

let autoSaveTimer = null;

function startAutoSave() {
    if (autoSaveTimer) clearInterval(autoSaveTimer);
    autoSaveTimer = setInterval(() => {
        if (!game.gameOver) {
            saveGame();
        }
    }, AUTO_SAVE_INTERVAL);
}

function stopAutoSave() {
    if (autoSaveTimer) {
        clearInterval(autoSaveTimer);
        autoSaveTimer = null;
    }
}
