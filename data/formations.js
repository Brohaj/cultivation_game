// ============================================================
// FORMATIONS.JS — Культивационные формации (выбор до 3 за жизнь)
// Сбрасываются при перерождении. Стратегический выбор каждый ран.
// ============================================================

const MAX_FORMATION_SLOTS = 3;

const CULT_FORMATIONS = [
    {
        id: "qiPillar",
        name: "Нефритовый Столб Ци",
        description: "Столб из чистого нефрита, добытого в глубинах Леса Духовных Трав. Усиливает поток ци в окрестностях.",
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
        description: "Алтарь, воздвигнутый на месте первого прорыва основателя Нефритовой Чистоты. Пропитан энергией прорыва, увеличивает шанс преодолеть барьер ступени.",
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
        description: "Древняя пагода, возведённая у входа в Пещеру Древнего Зверя. Её давление уплотняет духовную энергию и ускоряет накопление ци во время медитации.",
        effectKey: "statXpSpeed",
        effectPerLevel: 0.04,   // +4% к отдельному множителю ци при медитации за уровень
        baseCost: 80,
        costPerLevel: 50,
        maxLevel: 20,
        sect: "crimson_flame",
        color: "#cc7a3a"
    },
    {
        id: "bladeArena",
        name: "Арена Тысячи Клинков",
        description: "Арена, выкованная в огне Алого Пламени из камня, закалённого в недрах Пещеры Зверя. Здесь закаляется боевой дух.",
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
        description: "Печь, воссозданная по чертежам из Руин Забытой Секты. Очищает пилюли и усиливает их эффект.",
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
        description: "Библиотека, собранная поколениями алхимиков Лунного Озера из свитков, найденных в Руинах. Ускоряет постижение техник.",
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
        description: "Древний круг рун, вырезанных на границе Бездны Демонов. Подавляет внутренних демонов и защищает разум при прорыве.",
        effectKey: "demonReduction",
        effectPerLevel: 0.05,   // -5% шанс демона за уровень
        baseCost: 80,
        costPerLevel: 50,
        maxLevel: 16,
        sect: "abyss_cult",
        color: "#cc5a7a"
    },
    {
        id: "absorptionAltar",
        name: "Алтарь Поглощения",
        description: "Алтарь из чёрного камня, пропитанного энергией Бездны. Усиливает награды за опасные столкновения — боль обращается в силу.",
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
        description: "Мистические врата, открытые отшельником, познавшим ветра всех тайных царств. Сокращают путь в иные миры.",
        effectKey: "expeditionSpeed",
        effectPerLevel: 0.06,   // +6% скорости за уровень; длительность = база / (1 + скорость)
        baseCost: 150,
        costPerLevel: 80,
        maxLevel: 20,
        sect: "hidden_hermit",
        color: "#5aaacc"
    },
    {
        id: "fateHall",
        name: "Зал Судьбы",
        description: "Мистический зал на Вершине Ветров, где нити судьбы видны невооружённым глазом. Кармическая связь крепнет — карма за жизнь течёт щедрее.",
        effectKey: "karmaBonus",
        effectPerLevel: 0.04,   // +4% кармы за уровень
        baseCost: 120,
        costPerLevel: 80,
        maxLevel: 20,
        sect: "hidden_hermit",
        color: "#eebb44"
    },
];
