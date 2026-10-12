// ============================================================
// PRESTIGE.JS — Тела перерождения, вознесение тел, кармические улучшения
// Зависит от: core.js (TIER_ORDER), milestones.js (MILESTONES)
// ============================================================

// === ТЕЛА ПЕРЕРОЖДЕНИЯ ===
// Тиры: 0 (всегда), 1 (1 reb), 2 (2 reb), 3 (3 reb), 4 (5 reb), 5 (7 reb), 6 (10 reb)
// В каждом тире — 2 тела на выбор (кроме тир 0)
// Каждое тело имеет уникальный перк (perk) помимо стартовых бонусов

const REBIRTH_BODIES = [
    // === ТИР 0: всегда доступен ===
    {
        id: "peasant",
        name: "Обычный Крестьянин",
        tier: 0,
        description: "Простой житель деревни, нашедший свиток. Путь начинается с нуля.",
        requirement: null,
        bonuses: {},
        minRootTier: null,
        startRealm: 0,
        startTechniques: [],
        karmaBonus: 0.25,
        perk: "karmaBonus",       // +25% карма (быстрые циклы)
        perkDesc: "+25% карма",
        color: "#888"
    },

    // === ТИР 1: первое перерождение ===
    {
        id: "merchant_son",
        name: "Сын Торговца",
        tier: 1,
        description: "Отец оставил состояние и связи. Ваш путь начинается с полным кошельком.",
        requirement: { milestones: ["realm_5", "stones_100"], rebirths: 1 },
        bonuses: { stones: 25, luck: 2 },
        minRootTier: null,
        startRealm: 0,
        startTechniques: [],
        karmaBonus: 0.1,
        perk: "stoneIncome",      // доход камней x1.3, формации -20%, обмен ресурсов, ×2 вклад секты
        perkDesc: "Доход камней x1.3, формации -20%, обмен ресурсов, вклад секты ×2",
        color: "#cc9"
    },
    {
        id: "wanderer_disciple",
        name: "Ученик Бродячего Мастера",
        tier: 1,
        description: "Странствующий мастер обучил вас с детства. Тело и дух закалены годами тренировок.",
        requirement: { milestones: ["win_combat", "realm_5"], rebirths: 1 },
        bonuses: { strength: 5, spirit: 3 },
        minRootTier: null,
        startRealm: 0,
        startTechniques: ["iron_body", "body_masters_legacy"],
        karmaBonus: 0,
        perk: "xpSpeed",          // эксклюзивная техника усиливает совершенствование и XP техник
        perkDesc: "Техника «Наследие Мастера» (совершенствование и опыт техник)",
        color: "#8ac"
    },

    // === ТИР 2: 2 перерождения ===
    {
        id: "alchemist_heir",
        name: "Наследник Алхимика",
        tier: 2,
        description: "Дед был великим алхимиком. Его лаборатория и знания — ваше наследство.",
        requirement: { milestones: ["realm_6", "ten_breakthroughs"], rebirths: 2 },
        bonuses: { spirit: 2, pills: 4, stones: 10 },
        minRootTier: null,
        startRealm: 0,
        startTechniques: [],
        karmaBonus: 0.05,
        perk: "alchemist",        // рефайн 4:1, перенос 50% пыли/эссенции, разбор +50%
        perkDesc: "Рефайн пилюль 4:1, перенос 50% пыли/эссенции, базовая добыча при разборе +50%",
        color: "#8c8"
    },
    {
        id: "wandering_warrior",
        name: "Странствующий Воин",
        tier: 2,
        description: "Вы росли на дорогах, сражаясь за каждый день. Тело — ваше оружие, мир — ваша арена.",
        requirement: { milestones: ["win_combat", "realm_6"], rebirths: 2 },
        bonuses: { strength: 6, spirit: 2, stones: 15 },
        minRootTier: null,
        startRealm: 0,
        startTechniques: ["thunder_fist"],
        karmaBonus: 0.05,
        perk: "warrior",          // экспедиции -5%, боевая мощь x1.3, Пространственное Кольцо
        perkDesc: "Скорость экспедиций +5%, боевая мощь x1.3. Пространственное Кольцо: артефакты переносятся в следующую жизнь (разблокируется вознесением)",
        color: "#c66"
    },

    // === ТИР 3: 3 перерождения ===
    {
        id: "demon_heir",
        name: "Сосуд Небесного Демона",
        tier: 3,
        description: "天魔之体 — демоническая кровь течёт в ваших жилах. Безграничная мощь, но внутренний демон голоден.",
        requirement: { milestones: ["realm_7", "failed_break"], rebirths: 3 },
        bonuses: { strength: 8, spirit: 2, luck: 1, stones: 20 },
        minRootTier: null,
        startRealm: 0,
        startTechniques: [],
        karmaBonus: 0.25,
        perk: "demonPact",        // +25% карма, +боевая мощь, но демон жрёт 50% статов
        perkDesc: "+25% карма, боевая мощь x1.5, но демон пожирает 50% статов",
        color: "#8a2a4a"
    },
    {
        id: "dao_hermit",
        name: "Отшельник Дао",
        tier: 3,
        description: "Десятилетия в уединении отточили ваше понимание Дао. Техники — ваш язык.",
        requirement: { milestones: ["realm_7", "five_techniques"], rebirths: 3 },
        bonuses: { spirit: 6, luck: 2, stones: 20 },
        minRootTier: null,
        startRealm: 0,
        startTechniques: ["body_dao_insight"],
        karmaBonus: 0.1,
        perk: "daoInsight",       // вознесение техник -30% эссенции, техника +qi/breakthrough
        perkDesc: "Вознесение техник -30% эссенции, техника «Прозрение Дао»",
        color: "#a8f"
    },

    // === ТИР 4: 5 перерождений ===
    {
        id: "sect_genius",
        name: "Гений Секты",
        tier: 4,
        description: "С рождения в элитном отделении. Ваш талант пугает даже старейшин.",
        requirement: { milestones: ["joined_sect", "realm_8"], rebirths: 5 },
        bonuses: { spirit: 8, strength: 3, luck: 2, stones: 40, pills: 3 },
        minRootTier: null,
        startRealm: 1,
        startTechniques: ["body_sect_prodigy"],
        karmaBonus: 0.15,
        perk: "sectProdigy",      // любая секта с realm 0, вклад заданий x1.5, техника
        perkDesc: "Вступление в секту с realm 0, вклад заданий x1.5, техника «Печать Гения»",
        color: "#a8c"
    },
    {
        id: "fortune_child",
        name: "Дитя Фортуны",
        tier: 4,
        description: "Вы родились под счастливой звездой. Небеса благоволят вашим прорывам.",
        requirement: { milestones: ["realm_8", "age_1000"], rebirths: 5 },
        bonuses: { luck: 10, spirit: 4, stones: 30 },
        minRootTier: null,
        startRealm: 0,
        startTechniques: ["body_fortune_star"],
        karmaBonus: 0.1,
        perk: "fortuneBreak",     // демон -50%, техника на breakthrough+luck
        perkDesc: "Демон -50%, +10% шанс прорыва, техника «Звезда Удачи»",
        color: "#eebb44"
    },

    // === ТИР 5: 7 перерождений ===
    {
        id: "ancient_smith",
        name: "Кузнец Древних",
        tier: 5,
        description: "В прошлой жизни вы ковали оружие богов. Руки помнят, как подчинять материю.",
        requirement: { milestones: ["realm_9", "age_1000"], rebirths: 7 },
        bonuses: { strength: 8, spirit: 5, stones: 50 },
        minRootTier: null,
        startRealm: 1,
        startTechniques: [],
        karmaBonus: 0.1,
        perk: "masterSmith",      // failstacks сохраняются, заточка +10%, разбор x2
        perkDesc: "Воля Дао сохраняется, заточка +10% шанс, базовая добыча при разборе x2",
        color: "#c93"
    },
    {
        id: "heavens_child",
        name: "Дитя Небес",
        tier: 5,
        description: "При рождении небо озарилось золотом. Тайные царства открывают вам свои двери.",
        requirement: { milestones: ["immortal", "age_1000"], rebirths: 7 },
        bonuses: { strength: 6, spirit: 6, luck: 5, stones: 60, pills: 3 },
        minRootTier: "uncommon",
        startRealm: 1,
        startTechniques: ["body_fortune_star"],
        karmaBonus: 0.15,
        perk: "heavenExplorer",   // экспедиции -10%, артефакт тир +1 при дропе
        perkDesc: "Скорость экспедиций +10%, артефакты из экспедиций +1 тир в пределах локации",
        color: "#ec8"
    },

    // === ТИР 6: 10 перерождений ===
    {
        id: "ancient_reincarnation",
        name: "Реинкарнация Древнего",
        tier: 6,
        description: "Память тысячелетий в вашем сознании. Каждое перерождение — шаг к совершенству.",
        requirement: { milestones: ["immortal", "age_10000"], rebirths: 10 },
        bonuses: { strength: 15, spirit: 15, luck: 10, stones: 150, pills: 5 },
        minRootTier: "rare",
        startRealm: 2,
        startTechniques: ["thunder_fist"],
        karmaBonus: 0.2,
        perk: "ancientPower",     // формации стартуют с +2 уровнями
        perkDesc: "Формации +2 стартовых уровня",
        color: "#fc8"
    },
    {
        id: "golden_arhat",
        name: "Золотой Архат",
        tier: 6,
        description: "Вы достигли просветления, но возвращаетесь в мир ради совершенствования Дао.",
        requirement: { milestones: ["immortal", "age_10000"], rebirths: 10 },
        bonuses: { spirit: 20, luck: 8, stones: 100, pills: 8 },
        minRootTier: "rare",
        startRealm: 2,
        startTechniques: ["body_golden_sutra"],
        karmaBonus: 0.5,
        perk: "arhatWisdom",      // +50% карма, кармические улучшения +1 бесплатный уровень
        perkDesc: "+50% карма, все кармические улучшения +1 бесплатный уровень",
        color: "#ffe066"
    },
];

// === ВОЗНЕСЕНИЕ ТЕЛ ===
// Тир 2+ тела можно возносить за карму (3 уровня)
// Каждый уровень усиливает уникальный перк

const BODY_ASCENSIONS = {
    // --- Тир 2 ---
    alchemist_heir: [
        { level: 1, cost: 40,  name: "Мастер Зелий", desc: "75% пыли и эссенции переносится в следующую жизнь", perkUpgrade: { carryOver: 0.75, disassembleBonus: 0.5 } },
        { level: 2, cost: 80,  name: "Великий Алхимик", desc: "100% переносится, базовая добыча при разборе x2", perkUpgrade: { carryOver: 1.0, disassembleBonus: 1.0 } },
        { level: 3, cost: 150, name: "Архиалхимик", desc: "100% переносится, базовая добыча при разборе x3, авто-рефайн пилюль", perkUpgrade: { carryOver: 1.0, disassembleBonus: 2.0, autoRefine: true } },
    ],
    wandering_warrior: [
        { level: 1, cost: 40,  name: "Закалённый Воин", desc: "Скорость экспедиций +10%, Пространственное Кольцо: 10 артефактов в след. жизнь", perkUpgrade: { expeditionSpeed: 0.10, carryArtifacts: 10 } },
        { level: 2, cost: 80,  name: "Полководец Дорог", desc: "Скорость экспедиций +20%, Пространственное Кольцо: 20 артефактов", perkUpgrade: { expeditionSpeed: 0.20, carryArtifacts: 20 } },
        { level: 3, cost: 150, name: "Бессмертный Странник", desc: "Скорость экспедиций +30%, Пространственное Кольцо: 30 артефактов, авто-экспедиции", perkUpgrade: { expeditionSpeed: 0.30, carryArtifacts: 30, autoExpedition: true } },
    ],

    // --- Тир 3 ---
    demon_heir: [
        { level: 1, cost: 60,  name: "Пробуждение Демонической Ци", desc: "+30% карма, боевая мощь x1.8, демон жрёт 50% статов", perkUpgrade: { karmaBonus: 0.30, combatMult: 1.8, demonStatPct: 0.5 } },
        { level: 2, cost: 120, name: "Владыка Внутреннего Демона", desc: "+40% карма, мощь x2.0, демон жрёт 50% статов, мин. корень: Редкий", perkUpgrade: { karmaBonus: 0.40, combatMult: 2.0, demonStatPct: 0.5, minRoot: "rare" } },
        { level: 3, cost: 200, name: "Небесный Демон", desc: "+50% карма, мощь x2.5, демон жрёт 50% статов, старт с 1 ступени, мин. корень: Редкий", perkUpgrade: { karmaBonus: 0.50, combatMult: 2.5, demonStatPct: 0.5, startRealm: 1, minRoot: "rare" } },
    ],
    dao_hermit: [
        { level: 1, cost: 60,  name: "Мудрец Дао", desc: "Вознесение техник стоит на 40% меньше эссенции", perkUpgrade: { ascendDiscount: 0.4 } },
        { level: 2, cost: 120, name: "Хранитель Дао", desc: "Вознесение на 50% дешевле, стартовая техника Редкого ранга", perkUpgrade: { ascendDiscount: 0.5, startTechTier: "rare" } },
        { level: 3, cost: 200, name: "Воплощение Дао", desc: "Вознесение на 60% дешевле, старт с 1 ступени, стартовая Эпическая техника, авто-вознесение техник", perkUpgrade: { ascendDiscount: 0.6, startRealm: 1, autoAscendTech: true, startTechTier: "epic" } },
    ],

    // --- Тир 4 ---
    sect_genius: [
        { level: 1, cost: 80,  name: "Первый Ученик", desc: "Вклад в секту x1.75, старт с ранга Внутренний Ученик", perkUpgrade: { contributionMult: 1.75, startRank: 1 } },
        { level: 2, cost: 160, name: "Старейшина Секты", desc: "Вклад x2.0, старт Внутренний, перезарядка заданий -30%", perkUpgrade: { contributionMult: 2.0, startRank: 1, missionCdReduction: 0.3 } },
        { level: 3, cost: 300, name: "Патриарх Секты", desc: "Вклад x2.5, старт Ядровой Ученик, задания -50% КД, мин. корень: Необычный", perkUpgrade: { contributionMult: 2.5, startRank: 2, missionCdReduction: 0.5, minRoot: "uncommon" } },
    ],
    fortune_child: [
        { level: 1, cost: 80,  name: "Избранник Судьбы", desc: "Шанс внутреннего демона -60%, +15% шанс прорыва", perkUpgrade: { demonReduction: 0.6, breakthroughBonus: 0.15 } },
        { level: 2, cost: 160, name: "Любимец Небес", desc: "Демон -75%, +20% шанс прорыва, +5 удача", perkUpgrade: { demonReduction: 0.75, breakthroughBonus: 0.20, bonusLuck: 5 } },
        { level: 3, cost: 300, name: "Повелитель Удачи", desc: "Демон -90%, +25% шанс прорыва, +10 удача", perkUpgrade: { demonReduction: 0.9, breakthroughBonus: 0.25, bonusLuck: 10 } },
    ],

    // --- Тир 5 ---
    ancient_smith: [
        { level: 1, cost: 120, name: "Мастер Реликвий", desc: "Шанс заточки +15%, шанс понижения уровня -50%", perkUpgrade: { enhanceBonus: 0.15, downgradeReduction: 0.5 } },
        { level: 2, cost: 250, name: "Кузнец Богов", desc: "Заточка +20%, безопасная заточка до +5, слияние на 20% дешевле", perkUpgrade: { enhanceBonus: 0.20, safeEnhance: 5, fusionDiscount: 0.2 } },
        { level: 3, cost: 500, name: "Создатель Легенд", desc: "Заточка +25%, безопасно до +7, слияние на 40% дешевле", perkUpgrade: { enhanceBonus: 0.25, safeEnhance: 7, fusionDiscount: 0.4 } },
    ],
    heavens_child: [
        { level: 1, cost: 120, name: "Посланник Небес", desc: "Скорость экспедиций +20%, тир артефактов +1 в пределах локации, мин. корень: Редкий", perkUpgrade: { expeditionSpeed: 0.20, artifactTierBonus: 1, minRoot: "rare" } },
        { level: 2, cost: 250, name: "Наследник Небес", desc: "Скорость экспедиций +30%, тир +1 в пределах локации, доп. артефакт из экспедиций", perkUpgrade: { expeditionSpeed: 0.30, artifactTierBonus: 1, extraArtifact: true, minRoot: "rare" } },
        { level: 3, cost: 500, name: "Небесный Владыка", desc: "Скорость экспедиций +40%, тир +2 в пределах локации, доп. артефакт, старт со 2 ступени", perkUpgrade: { expeditionSpeed: 0.40, artifactTierBonus: 2, extraArtifact: true, minRoot: "rare", startRealm: 2 } },
    ],

    // --- Тир 6 ---
    ancient_reincarnation: [
        { level: 1, cost: 200, name: "Пробуждённый Древний", desc: "Формации начинаются с 3 уровня, мин. корень: Эпический", perkUpgrade: { formationBonus: 3, minRoot: "epic" } },
        { level: 2, cost: 400, name: "Вечный Древний", desc: "Формации с 5 уровня, старт с 3 ступени, мин. корень: Эпический", perkUpgrade: { formationBonus: 5, startRealm: 3, minRoot: "epic" } },
        { level: 3, cost: 800, name: "Изначальный", desc: "Формации с 7 уровня, 4-й слот формаций, старт с 3 ступени, мин. корень: Эпический, +20 ко всем статам", perkUpgrade: { formationBonus: 7, formationSlots: 1, startRealm: 3, minRoot: "epic", bonusStats: 20 } },
    ],
    golden_arhat: [
        { level: 1, cost: 200, name: "Просветлённый Архат", desc: "+60% кармы, кармические улучшения +1 бесплатный уровень, вознесение тел на 20% дешевле", perkUpgrade: { karmaBonus: 0.6, freeUpgradeLevel: 1, bodyAscendDiscount: 0.2 } },
        { level: 2, cost: 400, name: "Алмазный Архат", desc: "+75% кармы, улучшения +2 уровня, вознесение на 30% дешевле", perkUpgrade: { karmaBonus: 0.75, freeUpgradeLevel: 2, bodyAscendDiscount: 0.3 } },
        { level: 3, cost: 800, name: "Будда Дао", desc: "+100% кармы, улучшения +2 уровня, вознесение на 50% дешевле, старт с 3 ступени", perkUpgrade: { karmaBonus: 1.0, freeUpgradeLevel: 2, bodyAscendDiscount: 0.5, startRealm: 3 } },
    ],
};

// === КАРМИЧЕСКИЕ УЛУЧШЕНИЯ ===

const KARMA_UPGRADES = [
    { id: "wealth",        name: "Кармическое Наследие",   description: "Стартовые ресурсы: 10 камней, 5 пилюль, 3 эссенции, 3 пыли (×2 за ур.)", costs: [5, 10, 20, 40, 80], maxLevel: 5, effect: { stones: 10, pills: 5, essence: 3, dust: 3 },
        effectMultiplier: 2 },
    { id: "memory",        name: "Остаточная Память",      description: "+2 ко всем статам",         cost: 15,  maxLevel: 10, effect: { strength: 2, spirit: 2, luck: 2 } },
    { id: "statSpeed",     name: "Совершенствование",       description: "+5% множитель духа", cost: 20,  maxLevel: 6,  effect: {} },
    { id: "enlightenment", name: "Просветление",           description: "+5% множитель ци",          cost: 20,  maxLevel: 8,  effect: { qiMultiplier: 0.05 } },
    { id: "talent",        name: "Врождённый Талант",       description: "+10% скорость XP техник",   cost: 25,  maxLevel: 6,  effect: { techXpSpeed: 0.10 } },
    { id: "artifactMemory", name: "Память Артефактов",       description: "Сохранить лучшие экипированные артефакты при перерождении (+1/ур.). Приоритет: слияние, заточка, тир.", cost: 50, maxLevel: 4, effect: {},
        requirement: (g) => g.prestige.permanentMilestones.includes("realm_3"),
        requirementHint: "Требуется: достичь Закладки Основания" },
    { id: "timeFlow",       name: "Ускорение Потока",        description: "+25% скорость течения времени", cost: 100, maxLevel: 5, effect: { timeFlow: 0.25 },
        requirement: (g) => g.prestige.permanentMilestones.includes("realm_5"),
        requirementHint: "Требуется: достичь Зарождающейся Души" },
    { id: "earlyRebirth",   name: "Ранняя Мудрость",        description: "Снижение минимального возраста рассеивания на 10 лет", cost: 15, maxLevel: 10, effect: {} },
    { id: "techSlots",      name: "Расширение Сознания",    description: "+1 слот техники", costs: [20, 40, 60, 80, 100], maxLevel: 5, effect: {} },
    { id: "pathMemory",     name: "Память Пути",             description: "Начать жизнь на более высокой ступени", costs: [10, 100, 200, 300], maxLevel: 4, effect: { startRealm: 1 },
        effectPerLevel: [
            { startRealm: 1, desc: "Старт: Очищение Ци" },
            { startRealm: 2, desc: "Старт: Закладка Основания" },
            { startRealm: 3, desc: "Старт: Золотое Ядро" },
            { startRealm: 3, startSubLevel: 2, desc: "Старт: Золотое Ядро (Средний)" }
        ] },
    { id: "daoCall",        name: "Зов Дао",                 description: "Начать жизнь с постижением Дао", costs: [150, 300, 450, 600], maxLevel: 4, effect: { startDao: 1 },
        requirement: (g) => g.prestige.permanentMilestones.includes("realm_4"),
        requirementHint: "Требуется: достичь Золотого Ядра" },
    { id: "ancestorLegacy", name: "Наследие Предков",        description: "Стартовая техника начинает на высшем тире", costs: [30, 80, 200, 500], maxLevel: 4, effect: { startTechTier: 1 },
        requirement: (g) => g.prestige.permanentMilestones.includes("realm_3"),
        requirementHint: "Требуется: достичь Закладки Основания" },
    { id: "elementChoice",  name: "Память Стихий",           description: "Выбирать элементы духовного корня при перерождении", cost: 80, maxLevel: 1, effect: { elementChoice: true },
        requirement: (g) => g.prestige.permanentMilestones.includes("sect_all_visited"),
        requirementHint: "Требуется: вступить в 3 разные секты" },
    { id: "formationSlot",  name: "Расширение Формаций",     description: "+1 слот активных формаций", costs: [200, 300], maxLevel: 2, effect: {},
        requirement: (g) => g.prestige.permanentMilestones.includes("realm_7"),
        requirementHint: "Требуется: достичь Слияния с Пустотой" },
];
