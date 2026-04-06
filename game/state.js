// ============================================================
// GAME/STATE.JS — Начальное состояние игры
// Загружается первым из game/*.js
// ============================================================

const game = {
    // Основное
    name: "Культиватор",
    qi: 0,
    realmIndex: 0,
    subLevel: 1,
    years: 16,        // мировое время (продолжается между жизнями)
    birthYear: 0,     // год рождения текущего персонажа (возраст = years - birthYear)
    strength: 1,
    spirit: 1,
    luck: 1,
    stones: 0,
    pills: 0,
    daoEssence: 0,
    artifactDust: 0,
    daoProgress: 0,           // Прогресс постижения Дао (абсолютное значение)
    daoLevel: 0,              // Уровень Дао (сколько раз заполнил бар)
    refinedPills: 0,         // Тир 2: Очищенная Пилюля
    spiritualPills: 0,       // Тир 3: Духовная Пилюля
    heavenlyPills: 0,        // Тир 4: Небесная Пилюля
    enhanceFailstacks: 0,    // Воля Дао (failstacks)
    daoScrolls: 0,              // Свитки Воли Дао (каждый = +2 failstacks)
    scrollFailstacksApplied: 0, // сколько фейлстаков от свитков уже применено (макс 10, сброс при заточке)
    // autoActive removed — game is always idle
    gameOver: false,

    // Система активностей
    currentActivity: "meditation", // meditation | body | dao | fate
    activityXP: { strength: 0, spirit: 0, luck: 0 },

    // Системы
    flags: {},
    techniques: [],       // id изученных техник
    equippedTechniques: [], // id экипированных техник (ограничено слотами)
    techLevels: {},       // { techId: level }
    techXP: {},           // { techId: currentXP } — XP техник (jobs)
    spiritualRoot: null,
    milestones: [],
    totalMeditations: 0,
    meditationYears: 0,   // лет проведённых в медитации (для заданий секты)
    totalBreakthroughs: 0,

    // Мировые события
    worldEvent: null,
    lastWorldEventYear: 0,

    // Секта
    sect: null,                 // { id, rank, contribution } или null
    sectMissions: [],            // текущие задания секты (до 3)
    sectMissionTimer: 0,        // лет до нового задания

    // Экспедиции
    expedition: null,           // { locationId, startYear, duration } или null
    ascendedLocations: {},      // { locationId: true } — вознесённые локации (×2 награды, сброс при перерождении)
    expeditionCompletions: {},  // { locationId: count } — счётчик завершений по локации

    // Приключения
    adventureRumors: [],        // [{id, appearedYear}]
    activeAdventures: [],       // [{id, currentStep, stepStartYear, stepDuration, flags, awaitingChoice, completedSteps}]
    completedAdventures: [],    // [id, id, ...] — одноразовые, сбрасываются при перерождении

    // Артефакты
    artifacts: [],              // инвентарь артефактов (массив объектов)
    equippedArtifacts: { weapon: null, armor: null, accessory: null, treasure: null },

    // Формации (сбрасываются при перерождении)
    formations: {},             // { formationId: level }
    selectedFormations: [],     // до MAX_FORMATION_SLOTS выбранных id

    // Перерождение (сохраняется между жизнями)
    prestige: {
        karma: 0,
        totalRebirths: 0,
        permanentMilestones: [],
        karmaUpgrades: {},
        lastBody: "peasant",
        bodyAscensions: {},      // { bodyId: level } — вознесения тел
        worldAge: 0,             // мировое время при перерождении
        daoLevels: {},           // { sectId: maxLevel } — макс уровень Дао по секте (перманентный)
        unlockedFormations: []   // [formationId, ...] — разблокированные формации (перманентно)
    },
    _minRootTier: null, // временное: мин. тир корня от тела

    // Таймеры
    tickTimer: null,
    eventTimer: null,
    yearTimer: null,
    debugSpeed: 1,
};
