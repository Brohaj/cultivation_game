// ============================================================
// FORMATIONS.JS — Культивационные формации (выбор до 3 за жизнь)
// Сбрасываются при перерождении. Стратегический выбор каждый ран.
// ============================================================

const MAX_FORMATION_SLOTS = 3;

const CULT_FORMATIONS = [
    {
        id: "qiPillar",
        name: "Нефритовый Столб Ци",
        description: "Столб из чистого нефрита, усиливающий поток ци в окрестностях.",
        effectKey: "qi",
        effectPerLevel: 0.10,   // +10% ци за уровень
        baseCost: 40,
        costPerLevel: 25,
        maxLevel: 20,
        sect: "jade_purity",
        color: "#4acc6a"
    },
    {
        id: "breakthroughAltar",
        name: "Алтарь Прорыва",
        description: "Алтарь, пропитанный энергией прорыва. Увеличивает шанс преодолеть барьер ступени.",
        effectKey: "breakthroughBonus",
        effectPerLevel: 0.004,  // +0.4% шанс прорыва за уровень
        baseCost: 100,
        costPerLevel: 70,
        maxLevel: 20,
        sect: "jade_purity",
        color: "#aa44cc"
    },
    {
        id: "bodyPagoda",
        name: "Пагода Закалки",
        description: "Древняя пагода, чьё давление закаляет тело и дух тренирующихся.",
        effectKey: "statXpSpeed",
        effectPerLevel: 0.04,   // +4% XP статов за уровень
        baseCost: 80,
        costPerLevel: 50,
        maxLevel: 20,
        sect: "crimson_flame",
        color: "#cc7a3a"
    },
    {
        id: "bladeArena",
        name: "Арена Тысячи Клинков",
        description: "Арена, где закаляется боевой дух. Усиливает боевую мощь.",
        effectKey: "combatPower",
        effectPerLevel: 0.03,   // +3% боевая мощь за уровень
        baseCost: 90,
        costPerLevel: 55,
        maxLevel: 20,
        sect: "crimson_flame",
        color: "#cc4a3a"
    },
    {
        id: "alchemyFurnace",
        name: "Алхимическая Печь",
        description: "Печь для очистки пилюль. Усиливает эффект пилюль и ци от них.",
        effectKey: "pillEffect",
        effectPerLevel: 0.08,   // +8% эффект пилюль за уровень
        baseCost: 100,
        costPerLevel: 60,
        maxLevel: 20,
        sect: "moon_lake",
        color: "#ee7744"
    },
    {
        id: "wisdomLibrary",
        name: "Библиотека Мудрости",
        description: "Библиотека древних свитков, ускоряющая постижение боевых техник.",
        effectKey: "techXpSpeed",
        effectPerLevel: 0.05,   // +5% скорость техник за уровень
        baseCost: 90,
        costPerLevel: 55,
        maxLevel: 20,
        sect: "moon_lake",
        color: "#66ccff"
    },
    {
        id: "wardCircle",
        name: "Круг Подавления Демонов",
        description: "Древний круг рун, подавляющий внутренних демонов и защищающий разум при прорыве.",
        effectKey: "demonReduction",
        effectPerLevel: 0.05,   // -5% шанс демона за уровень
        baseCost: 80,
        costPerLevel: 50,
        maxLevel: 20,
        sect: "abyss_cult",
        color: "#cc5a7a"
    },
    {
        id: "absorptionAltar",
        name: "Алтарь Поглощения",
        description: "Алтарь, усиливающий награды за опасные столкновения.",
        effectKey: "dangerReward",
        effectPerLevel: 0.05,   // +5% награды за опасные события за уровень
        baseCost: 100,
        costPerLevel: 65,
        maxLevel: 20,
        sect: "abyss_cult",
        color: "#8a44aa"
    },
    {
        id: "realmGate",
        name: "Врата Тайного Царства",
        description: "Мистические врата, сокращающие путь в тайные царства.",
        effectKey: "expeditionSpeed",
        effectPerLevel: 0.06,   // -6% время экспедиций за уровень (макс -90%)
        baseCost: 150,
        costPerLevel: 80,
        maxLevel: 20,
        sect: "hidden_hermit",
        color: "#5aaacc"
    },
    {
        id: "fateHall",
        name: "Зал Судьбы",
        description: "Мистический зал, усиливающий кармическую связь. Карма за жизнь течёт щедрее.",
        effectKey: "karmaBonus",
        effectPerLevel: 0.04,   // +4% кармы за уровень
        baseCost: 120,
        costPerLevel: 80,
        maxLevel: 20,
        sect: "hidden_hermit",
        color: "#eebb44"
    },
];
