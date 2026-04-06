// ============================================================
// SECTS/TECHNIQUES.JS — Техники сект (начальные + продвинутые)
// ============================================================

// Техники сект (добавляются в TECHNIQUES динамически при вступлении)
const SECT_TECHNIQUES = {
    // === Начальные техники ===
    jade_meditation: {
        id: "jade_meditation", name: "Нефритовая Медитация",
        description: "Техника Секты Нефритовой Чистоты. Очищает ци и усиливает поток энергии.",
        tier: "rare", type: "cultivation", element: "water", maxLevel: 12,
        effects: { qi: 0.04 },
        requirement: { realm: 2 }, source: "sect",
        ascendNames: { epic: "Нефритовое Перерождение Ци", legendary: "Вечный Нефритовый Поток" }
    },
    blazing_fist: {
        id: "blazing_fist", name: "Пылающий Кулак",
        description: "Техника Ордена Алого Пламени. Огненная ци пронизывает каждый удар.",
        tier: "rare", type: "combat", element: "fire", maxLevel: 12,
        effects: { combatPower: 0.05 },
        requirement: { realm: 3 }, source: "sect",
        ascendNames: { epic: "Кулак Алого Феникса", legendary: "Карающее Пламя Небес" }
    },
    moon_cleansing: {
        id: "moon_cleansing", name: "Лунное Очищение",
        description: "Техника Секты Лунного Озера. Лунный свет защищает ци от рассеивания.",
        tier: "rare", type: "defense", element: "wood", maxLevel: 12,
        effects: { qiRetention: 0.008 },
        requirement: { realm: 3 }, source: "sect",
        ascendNames: { epic: "Сияние Полной Луны", legendary: "Лунный Щит Бессмертия" }
    },
    void_absorption: {
        id: "void_absorption", name: "Поглощение Тьмы",
        description: "Техника Культа Бездны. Чужая ци становится вашей. Опасно, но эффективно.",
        tier: "epic", type: "cultivation", element: null, maxLevel: 10,
        effects: { qi: 0.08 },
        requirement: { realm: 5 }, source: "sect",
        ascendNames: { legendary: "Бездонная Пасть Бездны" }
    },
    solitude_breath: {
        id: "solitude_breath", name: "Дыхание Уединения",
        description: "Техника Скрытой Секты. В тишине дух крепнет безгранично.",
        tier: "epic", type: "cultivation", element: "wind", maxLevel: 10,
        effects: { spirit: 0.04 },
        requirement: { realm: 7 }, source: "sect",
        ascendNames: { legendary: "Безмолвие Великого Дао" }
    },

    // === Продвинутые техники (Ядровой Ученик) ===
    jade_barrier: {
        id: "jade_barrier", name: "Нефритовый Барьер Духа",
        description: "Секретная техника внутреннего круга. Нефритовая ци формирует защитный барьер, оберегающий от откатов при провале.",
        tier: "epic", type: "defense", element: "water", maxLevel: 5,
        effects: { qiRetention: 0.02 },
        requirement: { realm: 3 }, source: "sect"
    },
    flame_tempering: {
        id: "flame_tempering", name: "Закалка Алым Пламенем",
        description: "Тайная техника Ордена. Внутренний огонь закаляет тело, увеличивая силу и стойкость.",
        tier: "epic", type: "combat", element: "fire", maxLevel: 10,
        effects: { strength: 0.03 },
        requirement: { realm: 4 }, source: "sect"
    },
    moon_elixir_body: {
        id: "moon_elixir_body", name: "Тело Лунного Эликсира",
        description: "Продвинутая алхимическая техника. Лунная ци трансформирует тело, продлевая жизнь.",
        tier: "epic", type: "cultivation", element: "wood", maxLevel: 10,
        effects: { lifespan: 0.04 },
        requirement: { realm: 4 }, source: "sect"
    },
    soul_devour: {
        id: "soul_devour", name: "Пожирание Душ",
        description: "Запретная техника Культа. Поглощает духовную сущность врагов, обращая её в чистую мощь.",
        tier: "epic", type: "combat", element: null, maxLevel: 10,
        effects: { combatPower: 0.06 },
        requirement: { realm: 6 }, source: "sect"
    },
    dao_heart_mirror: {
        id: "dao_heart_mirror", name: "Зеркало Сердца Дао",
        description: "Высшая медитативная техника. Зеркало души отражает суть Дао, ускоряя постижение всех техник.",
        tier: "epic", type: "cultivation", element: "wind", maxLevel: 10,
        effects: { techXpSpeed: 0.05 },
        requirement: { realm: 8 }, source: "sect"
    },
};
