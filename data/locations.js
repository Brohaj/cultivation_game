// ============================================================
// LOCATIONS.JS — Тайные Царства (экспедиции)
// ============================================================

// Стоимость вознесения локации
const LOCATION_ASCEND_COST = { essence: 100, dust: 100, stones: 1000 };

// Добыча ци возвращает часть цены похода, но не обходит лимит текущей ступени.
// cultivationRealm — ступень ценности духовного опыта; minRealm — условие входа.
const EXPEDITION_CULTIVATION = { qiReturn: 0.8, daoYears: 10 };

// Вознесённые имена и описания
const LOCATION_ASCENDED = {
    spirit_forest:    { name: "Сердце Древнего Леса",          description: "Вы проникли глубже — туда, где деревья помнят начало мира." },
    beast_cave:       { name: "Логово Праотца Зверей",         description: "В глубине пещеры спит зверь, чей рёв сотрясал горы в эпоху Древних." },
    forgotten_ruins:  { name: "Запретный Архив Секты",         description: "Под руинами — нетронутое хранилище. Печати ослабли достаточно." },
    heavenly_auction: { name: "Небесный Чёрный Рынок",        description: "Закрытый зал. Здесь торгуют тем, что нельзя показывать на свету." },
    demon_abyss:      { name: "Сердце Бездны",                description: "Дно Бездны. Здесь демоны не охотятся — здесь они рождаются." },
    immortal_palace:  { name: "Тронный Зал Бессмертного",     description: "Самое сердце дворца. Трон пуст — но сила здесь всё ещё жива." },
    sect_secret_realm:{ name: "Истинное Царство Секты",       description: "Только избранные видели это место. Теперь — и вы." },
};

const LOCATION_ASCENDED_2 = {
    spirit_forest:    { name: "Корень Мира",                   description: "Подземное озеро ци у корней Древа. Источник, питающий весь лес." },
    beast_cave:       { name: "Охотничьи Угодья Праотца",     description: "Территории Праотца, где водятся звери из эпохи до культиваторов." },
    forgotten_ruins:  { name: "Тайна Совета Девяти",          description: "Бесконечный архив. Каждый поход открывает новые секции запрещённых знаний." },
};

const LOCATIONS = [
    {
        id: "spirit_forest",
        name: "Лес Духовных Трав",
        description: "Густой лес, наполненный духовной энергией. В кронах древнейших деревьев — целебные сады Секты Нефритовой Чистоты, куда допускаются лишь избранные. Здесь растут редкие травы, а потоки ци текут как подземные реки.",
        minRealm: 0,
        duration: 10,
        cultivationRealm: 1,
        entryCost: 10,
        daoSect: "jade_purity",
        rewards: {
            stones: { min: 8, max: 20 },
            pills: { min: 1, max: 3 },
            essence: { min: 5, max: 12 },
            dust: { min: 3, max: 8 },
            artifactChance: 0.15,
            artifactMaxTier: "common"
        },
        ascend: { dangerLevel: 100, artifactMaxTier: "uncommon", scrollChance: 0.10 },
        color: "#4acc6a"
    },
    {
        id: "beast_cave",
        name: "Пещера Древнего Зверя",
        description: "Опасная пещера с духовными минералами и древним зверем-стражем. Орден Алого Пламени использует верхние ярусы как испытательную арену — кто выживет в глубине, достоин клинка.",
        minRealm: 0,
        duration: 12,
        cultivationRealm: 2,
        entryCost: 15,
        dangerLevel: 20,
        daoSect: "crimson_flame",
        rewards: {
            stones: { min: 10, max: 30 },
            pills: { min: 1, max: 3 },
            essence: { min: 8, max: 20 },
            dust: { min: 5, max: 15 },
            artifactChance: 0.30,
            artifactMaxTier: "uncommon"
        },
        ascend: { dangerLevel: 120, artifactMinTier: "uncommon", artifactMaxTier: "rare", scrollChance: 0.10 },
        color: "#cc5a3a"
    },
    {
        id: "forgotten_ruins",
        name: "Руины Забытой Секты",
        description: "Развалины древней секты, предшественницы Лунного Озера. Архивы алхимических рецептов рассыпаются в пыль, но среди обломков всё ещё скрыты знания и сокровища.",
        minRealm: 0,
        duration: 15,
        cultivationRealm: 3,
        entryCost: 30,
        dangerLevel: 40,
        daoSect: "moon_lake",
        rewards: {
            stones: { min: 20, max: 60 },
            pills: { min: 2, max: 5 },
            essence: { min: 20, max: 50 },
            dust: { min: 15, max: 40 },
            artifactChance: 0.50,
            artifactMaxTier: "uncommon",
            techniqueChance: 0.10
        },
        ascend: { dangerLevel: 140, artifactMinTier: "uncommon", artifactMaxTier: "rare", scrollChance: 0.15 },
        color: "#aa44cc"
    },
    {
        id: "heavenly_auction",
        name: "Небесный Аукцион",
        description: "Торговый зал, где культиваторы обмениваются ресурсами. Нужны камни для входа. Артефакт гарантирован.",
        minRealm: 3,
        duration: 15,
        cultivationRealm: null,
        entryCost: 100,
        daoSect: "no_dao",
        rewards: {
            stones: { min: 0, max: 0 },
            pills: { min: 2, max: 6 },
            essence: { min: 0, max: 0 },
            dust: { min: 5, max: 20 },
            artifactChance: 1.0,
            artifactMaxTier: "uncommon"
        },
        ascend: { artifactMinTier: "uncommon", artifactMaxTier: "rare" },
        color: "#eebb44"
    },
    {
        id: "demon_abyss",
        name: "Бездна Демонов",
        description: "Мрачное измерение, кишащее демонами. Культ Бездны черпает силу из этого разлома — их ритуалы усиливаются вблизи его границ. Опасно, но награды велики.",
        minRealm: 6,
        duration: 45,
        cultivationRealm: 6,
        entryCost: 50,
        dangerLevel: 80,
        daoSect: "abyss_cult",
        rewards: {
            stones: { min: 40, max: 120 },
            pills: { min: 3, max: 8 },
            essence: { min: 40, max: 100 },
            dust: { min: 30, max: 80 },
            artifactChance: 0.65,
            artifactMinTier: "uncommon",
            artifactMaxTier: "rare",
            scrollChance: 0.15
        },
        ascend: { dangerLevel: 180, artifactMinTier: "rare", artifactMaxTier: "epic" },
        color: "#aa3355"
    },
    {
        id: "immortal_palace",
        name: "Дворец Павшего Бессмертного",
        description: "Дворец бессмертного, павшего эоны назад. Его наследие ждёт достойного.",
        minRealm: 7,
        duration: 60,
        cultivationRealm: 7,
        entryCost: 100,
        dangerLevel: 200,
        daoSect: null,
        rewards: {
            stones: { min: 80, max: 250 },
            pills: { min: 5, max: 12 },
            essence: { min: 80, max: 200 },
            dust: { min: 60, max: 150 },
            artifactChance: 1.0,
            artifactMinTier: "rare",
            artifactMaxTier: "epic",
            techniqueChance: 0.05,
            scrollChance: 0.25
        },
        ascend: { dangerLevel: 300, artifactMinTier: "rare", artifactMaxTier: "epic" },
        color: "#eebb44"
    },
    {
        id: "sect_secret_realm",
        name: "Тайное Царство Секты",
        description: "Внутреннее царство секты доступно Главам Сект. Знакомый Путь помогает постижению Дао; среди древних реликвий скрыты ресурсы и свитки.",
        minRealm: 7,
        duration: 30,
        cultivationRealm: 7,
        dangerLevel: 120,
        daoSect: "current_sect",
        rewards: {
            stones: { min: 50, max: 150 },
            pills: { min: 4, max: 10 },
            essence: { min: 50, max: 120 },
            dust: { min: 40, max: 100 },
            artifactChance: 0.70,
            artifactMinTier: "rare",
            artifactMaxTier: "rare",
            scrollChance: 0.20
        },
        ascend: { dangerLevel: 220, artifactMinTier: "rare", artifactMaxTier: "rare" },
        requiresSectRank: "hall",
        color: "#cc8844"
    },
];
