// ============================================================
// TECHNIQUES.JS — Все техники культивации
// Зависит от: core.js (TIER_MULTIPLIERS, TIER_XP_BASE)
// ============================================================

const TECHNIQUES = [
    // Культивационные (ци)
    {
        id: "basic_breathing",
        name: "Базовая Техника Дыхания",
        description: "Простейшая техника из найденного свитка. Основа основ.",
        tier: "common",
        type: "cultivation",
        element: null,
        maxLevel: 5,
        effects: { qi: 0.03 },
        requirement: null,
        source: "start",
        ascendNames: {
            uncommon: "Техника Глубокого Дыхания",
            rare:     "Дыхание Небесного Потока",
            epic:     "Дыхание Изначальной Ци",
            legendary:"Дыхание Великого Дао"
        },
        ascendDescriptions: {
            uncommon: "Глубокое дыхание раскрывает скрытые меридианы. Ци течёт ровнее.",
            rare:     "Небесный поток наполняет тело с каждым вдохом. Границы размываются.",
            epic:     "Изначальная ци пронизывает каждую клетку. Дыхание синхронизировано с пульсом мира.",
            legendary:"Каждый вдох — эхо Великого Дао. Ци бесконечна, как само небо."
        }
    },
{
        id: "stone_meditation",
        name: "Медитация Каменного Будды",
        description: "Неподвижность камня, терпение горы. Идеально для длительной культивации.",
        tier: "uncommon",
        type: "cultivation",
        element: "earth",
        maxLevel: 8,
        effects: { qi: 0.04 },
        requirement: { realm: 1 },
        source: "event",
        ascendNames: {
            rare:     "Медитация Горного Владыки",
            epic:     "Незыблемость Древнего Пика",
            legendary:"Сознание Вечной Горы"
        }
    },
    // Боевые
    {
        id: "thunder_fist",
        name: "Кулак Грома",
        description: "Удар, несущий мощь грозы. Сотрясает землю и врагов.",
        tier: "rare",
        type: "combat",
        element: "thunder",
        maxLevel: 10,
        effects: { combatPower: 0.05 },
        requirement: { realm: 3 },
        source: "event",
        ascendNames: {
            epic:     "Кулак Девяти Громов",
            legendary:"Небесная Кара Громовержца"
        }
    },
    // Защитные
    {
        id: "iron_body",
        name: "Техника Железного Тела",
        description: "Тело становится крепким как железо. Ци не покидает меридианы при провале.",
        tier: "uncommon",
        type: "defense",
        element: null,
        maxLevel: 8,
        effects: { qiRetention: 0.0125 },
        requirement: { realm: 1 },
        source: "event",
        ascendNames: {
            rare:     "Тело Звёздного Металла",
            epic:     "Несокрушимая Оболочка Дао",
            legendary:"Тело Алмазного Архата"
        }
    },
    // Выживание
    {
        id: "wood_rejuvenation",
        name: "Восстановление Древесной Ци",
        description: "Жизненная энергия дерева продлевает жизнь далеко за обычные пределы.",
        tier: "rare",
        type: "cultivation",
        element: "wood",
        maxLevel: 10,
        effects: { lifespan: 0.03 },
        requirement: { realm: 3 },
        source: "event",
        ascendNames: {
            epic:     "Вечнозелёное Древо Жизни",
            legendary:"Корни Мирового Древа"
        }
    },
    // Высшие
    {
        id: "void_perception",
        name: "Восприятие Пустоты",
        description: "Разум расширяется за пределы материального. Поток ци становится безграничным.",
        tier: "epic",
        type: "cultivation",
        element: null,
        maxLevel: 12,
        effects: { qi: 0.04 },
        requirement: { realm: 6 },
        source: "chain",
        ascendNames: {
            legendary:"Всевидящее Око Пустоты"
        }
    },
    {
        id: "six_paths_breathing",
        name: "Дыхание Шести Путей",
        description: "Легендарная техника, гармонизирующая все шесть элементов. Пробивает небесные барьеры.",
        tier: "legendary",
        type: "cultivation",
        element: null,
        maxLevel: 15,
        effects: { breakthroughBonus: 0.008 },
        requirement: { realm: 8 },
        source: "chain"
    },
    {
        id: "sword_of_ten_thousand",
        name: "Десять Тысяч Мечей",
        description: "Ваша ци меча призывает тени древних мечей из потока истории.",
        tier: "epic",
        type: "combat",
        element: null,
        maxLevel: 12,
        effects: { combatPower: 0.06 },
        requirement: { realm: 5 },
        source: "event",
        ascendNames: {
            legendary:"Бесконечный Меч Вечности"
        }
    },
    {
        id: "heavenly_shield",
        name: "Щит Небесного Дао",
        description: "Щит из чистой ци, защищающий от откатов при провале прорыва.",
        tier: "epic",
        type: "defense",
        element: null,
        maxLevel: 12,
        effects: { qiRetention: 0.004 },
        requirement: { realm: 7 },
        source: "event",
        ascendNames: {
            legendary:"Непроницаемый Барьер Небес"
        }
    },
    // Бессмертные техники
    {
        id: "immortal_dao_heart",
        name: "Сердце Бессмертного Дао",
        description: "Ваше сердце Дао непоколебимо. Бесконечный поток ци пронизывает всё сущее.",
        tier: "divine",
        type: "cultivation",
        element: null,
        maxLevel: 20,
        effects: { qi: 0.07 },
        requirement: { realm: 10 },
        source: "chain"
    },

    // === ЭКСКЛЮЗИВНЫЕ ТЕХНИКИ ПРИКЛЮЧЕНИЙ ===
    // Нельзя получить иначе, source: "adventure"

    {
        id: "oblivion_memory",
        name: "Память Забвения",
        description: "Техника, украденная из библиотеки Небесного Суда. Забвение стирает время — кто познал его природу, может ускорить его течение.",
        tier: "legendary",
        type: "cultivation",
        element: null,
        maxLevel: 10,
        effects: { timeSpeed: 0.006 },
        requirement: { realm: 9 },
        source: "adventure"
    },
    {
        id: "blood_moon_sutra",
        name: "Сутра Кровавой Луны",
        description: "Демоническая сутра, выжженная на стенах Бездны. Преобразует боевой дух врагов в собственную силу. Запрещена всеми ортодоксальными сектами.",
        tier: "legendary",
        type: "combat",
        element: null,
        maxLevel: 15,
        effects: { combatPower: 0.035 },
        requirement: { realm: 7 },
        source: "adventure"
    },
    {
        id: "mirror_soul_art",
        name: "Искусство Зеркальной Души",
        description: "Победив своё отражение, вы познали природу Дао. Двойственность духа ускоряет постижение Пути.",
        tier: "epic",
        type: "cultivation",
        element: null,
        maxLevel: 12,
        effects: { daoSpeed: 0.0075 },
        requirement: { realm: 5 },
        source: "adventure"
    },

    // === ЭКСКЛЮЗИВНЫЕ ТЕХНИКИ ТЕЛ ПЕРЕРОЖДЕНИЯ ===
    // Нельзя получить иначе, source: "body"

    {
        id: "body_masters_legacy",
        name: "Наследие Бродячего Мастера",
        description: "Уроки странствующего мастера ускоряют постижение любых искусств.",
        tier: "uncommon",
        type: "cultivation",
        element: null,
        maxLevel: 8,
        effects: { statXpSpeed: 0.02, techXpSpeed: 0.02 },
        requirement: null,
        source: "body",
        ascendNames: {
            rare:      "Путь Тысячи Учителей",
            epic:      "Наставление Бессмертного Странника",
            legendary: "Абсолютное Постижение"
        }
    },
    {
        id: "body_dao_insight",
        name: "Прозрение Дао",
        description: "Годы медитации в уединении дали глубокое понимание потоков ци.",
        tier: "uncommon",
        type: "cultivation",
        element: null,
        maxLevel: 8,
        effects: { qi: 0.03, breakthroughBonus: 0.005 },
        requirement: null,
        source: "body",
        ascendNames: {
            rare:      "Око Дао",
            epic:      "Прорыв Сквозь Иллюзии",
            legendary: "Абсолютное Прозрение"
        }
    },
    {
        id: "body_sect_prodigy",
        name: "Печать Гениального Ученика",
        description: "Врождённый талант к технике секты. Ци течёт легче, техники постигаются быстрее.",
        tier: "rare",
        type: "cultivation",
        element: null,
        maxLevel: 10,
        effects: { qi: 0.04, techXpSpeed: 0.03 },
        requirement: null,
        source: "body",
        ascendNames: {
            epic:      "Печать Избранного Небесами",
            legendary: "Печать Основателя Секты"
        }
    },
    {
        id: "body_fortune_star",
        name: "Благословение Счастливой Звезды",
        description: "Звезда удачи освещает ваш путь. Прорывы даются легче, а опасности обходят стороной.",
        tier: "rare",
        type: "cultivation",
        element: null,
        maxLevel: 10,
        effects: { breakthroughBonus: 0.008, luck: 0.02 },
        requirement: null,
        source: "body",
        ascendNames: {
            epic:      "Созвездие Девяти Удач",
            legendary: "Небесный Жребий Бессмертного"
        }
    },
    {
        id: "body_golden_sutra",
        name: "Золотая Сутра Архата",
        description: "Буддийская мудрость прошлых жизней. Карма течёт щедрее, а дух непоколебим.",
        tier: "epic",
        type: "cultivation",
        element: null,
        maxLevel: 12,
        effects: { qi: 0.06, breakthroughBonus: 0.006 },
        requirement: null,
        source: "body",
        ascendNames: {
            legendary: "Сутра Бодхисаттвы"
        }
    },
];

// Сохраняем оригинальные тиры, имена и описания для сброса после вознесения
const TECHNIQUES_ORIGINAL_TIERS = {};
const TECHNIQUES_ORIGINAL_NAMES = {};
const TECHNIQUES_ORIGINAL_DESCRIPTIONS = {};
for (const t of TECHNIQUES) {
    TECHNIQUES_ORIGINAL_TIERS[t.id] = t.tier;
    TECHNIQUES_ORIGINAL_NAMES[t.id] = t.name;
    TECHNIQUES_ORIGINAL_DESCRIPTIONS[t.id] = t.description;
}
