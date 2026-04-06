// ============================================================
// MILESTONES.JS — Достижения (тировая система)
// Тиры: bronze, silver, gold, jade, secret
// Категории: cultivation, combat, sect, exploration, artifacts, prestige, secret
// ============================================================

const MILESTONE_TIERS = {
    bronze: { name: "Бронзовые", color: "#cd7f32", icon: "\u2605" },
    silver: { name: "Серебряные", color: "#c0c0c0", icon: "\u2605\u2605" },
    gold:   { name: "Золотые", color: "#ffd700", icon: "\u2605\u2605\u2605" },
    jade:   { name: "Нефритовые", color: "#4acc6a", icon: "\u2726" },
    secret: { name: "Секретные", color: "#cc44aa", icon: "\u2620" }
};

const MILESTONE_CATEGORIES = {
    cultivation: { name: "Культивация", icon: "\u262F" },
    combat:      { name: "Бой", icon: "\u2694" },
    sect:        { name: "Секта", icon: "\u26E9" },
    exploration: { name: "Исследование", icon: "\u2708" },
    artifacts:   { name: "Артефакты", icon: "\u2727" },
    prestige:    { name: "Перерождение", icon: "\u267E" },
    secret:      { name: "Секреты", icon: "\u2620" }
};

const MILESTONES = [
    // ==============================
    // БРОНЗОВЫЕ — первая жизнь, первые часы
    // ==============================

    // --- Культивация ---
    { id: "first_qi", name: "Первый Поток Ци", description: "Ощутить движение ци в меридианах",
      tier: "bronze", category: "cultivation",
      check: (g) => g.qi > 0 },

    { id: "five_breakthroughs", name: "Усердный Ученик", description: "Совершить 5 прорывов",
      tier: "bronze", category: "cultivation",
      check: (g) => g.totalBreakthroughs >= 5 },

    { id: "first_break", name: "Первый Прорыв", description: "Совершить первый прорыв",
      tier: "bronze", category: "cultivation",
      check: (g) => g.totalBreakthroughs >= 1 },

    { id: "realm_2", name: "Путь Очищения", description: "Достичь ступени Очищение Ци",
      tier: "bronze", category: "cultivation",
      check: (g) => g.realmIndex >= 1 },

    { id: "realm_3", name: "Основание Заложено", description: "Достичь ступени Закладка Основания",
      tier: "bronze", category: "cultivation",
      check: (g) => g.realmIndex >= 2 },

    { id: "first_technique", name: "Первая Техника", description: "Изучить первую технику",
      tier: "bronze", category: "cultivation",
      check: (g) => g.techniques.length >= 1 },

    { id: "age_100", name: "Столетний Старец", description: "Прожить 100 лет",
      tier: "bronze", category: "cultivation",
      check: (g) => g.characterAge() >= 100 },

    // --- Бой ---
    { id: "win_combat", name: "Первая Победа", description: "Победить в боевом событии",
      tier: "bronze", category: "combat",
      check: (g) => g.flags.wonCombat },

    // --- Ресурсы ---
    { id: "stones_100", name: "Малое Состояние", description: "Накопить 100 духовных камней",
      tier: "bronze", category: "exploration",
      check: (g) => g.stones >= 100 },

    { id: "first_pill", name: "Первая Пилюля", description: "Использовать пилюлю",
      tier: "bronze", category: "cultivation",
      check: (g) => (g.flags.pillsUsedTotal || 0) >= 1 },

    // ==============================
    // СЕРЕБРЯНЫЕ — первая жизнь, mid-game
    // ==============================

    // --- Культивация ---
    { id: "realm_4", name: "Золотое Ядро Сформировано", description: "Достичь ступени Золотое Ядро",
      tier: "silver", category: "cultivation",
      check: (g) => g.realmIndex >= 3 },

    { id: "realm_5", name: "Душа Пробудилась", description: "Достичь ступени Зарождающаяся Душа",
      tier: "silver", category: "cultivation",
      check: (g) => g.realmIndex >= 4 },

    { id: "ten_breakthroughs", name: "Неутомимый Практик", description: "Совершить 10 прорывов",
      tier: "silver", category: "cultivation",
      check: (g) => g.totalBreakthroughs >= 10 },

    { id: "five_techniques", name: "Собиратель Знаний", description: "Изучить 5 техник",
      tier: "silver", category: "cultivation",
      check: (g) => g.techniques.length >= 5 },

    { id: "age_500", name: "Пятьсот Вёсен", description: "Прожить 500 лет",
      tier: "silver", category: "cultivation",
      check: (g) => g.characterAge() >= 500 },

    { id: "three_techniques", name: "Путь Техник", description: "Изучить 3 техники",
      tier: "silver", category: "cultivation",
      check: (g) => g.techniques.length >= 3 },

    { id: "age_250", name: "Четверть Тысячелетия", description: "Прожить 250 лет",
      tier: "silver", category: "cultivation",
      check: (g) => g.characterAge() >= 250 },

    { id: "stat_10", name: "Закалённое Тело", description: "Любой стат достиг 10",
      tier: "silver", category: "cultivation",
      check: (g) => g.strength >= 10 || g.spirit >= 10 || g.luck >= 10 },

    { id: "first_formation", name: "Первая Формация", description: "Улучшить формацию",
      tier: "silver", category: "sect",
      check: (g) => Object.values(g.formations || {}).some(lvl => lvl >= 1) },

    // --- Бой ---
    { id: "combat_power_50", name: "Боец", description: "Боевая мощь 50+",
      tier: "silver", category: "combat",
      check: (g) => g.getCombatPower() >= 50 },

    { id: "failed_break", name: "Упавший и Вставший", description: "Пережить неудачный прорыв",
      tier: "silver", category: "combat",
      check: (g) => g.flags.failedBreakthrough },

    // --- Секта ---
    { id: "joined_sect", name: "Вступление в Секту", description: "Вступить в секту",
      tier: "silver", category: "sect",
      check: (g) => g.flags.joinedSect },

    // --- Исследование ---
    { id: "first_expedition", name: "Первая Экспедиция", description: "Завершить первую экспедицию",
      tier: "silver", category: "exploration",
      check: (g) => g.flags.completedExpedition },

    { id: "stones_500", name: "Духовное Состояние", description: "Накопить 500 духовных камней",
      tier: "silver", category: "exploration",
      check: (g) => g.stones >= 500 },

    { id: "first_adventure", name: "Искатель Приключений", description: "Завершить первое приключение",
      tier: "silver", category: "exploration",
      check: (g) => (g.completedAdventures || []).length >= 1 },

    // --- Артефакты ---
    { id: "first_artifact", name: "Первая Находка", description: "Получить первый артефакт",
      tier: "silver", category: "artifacts",
      check: (g) => g.artifacts.length >= 1 },

    { id: "artifact_rare", name: "Редкая Находка", description: "Получить редкий артефакт (или выше)",
      tier: "silver", category: "artifacts",
      check: (g) => g.artifacts.some(a => ["rare", "epic", "legendary", "divine"].includes(a.tier)) },

    // ==============================
    // ЗОЛОТЫЕ — несколько жизней, late-game
    // ==============================

    // --- Культивация ---
    { id: "realm_6", name: "Слияние с Пустотой", description: "Достичь ступени Слияние с Пустотой",
      tier: "gold", category: "cultivation",
      check: (g) => g.realmIndex >= 5 },

    { id: "realm_7", name: "Слияние Тела", description: "Достичь ступени Слияние Тела",
      tier: "gold", category: "cultivation",
      check: (g) => g.realmIndex >= 6 },

    { id: "realm_8", name: "Небесная Кара", description: "Преодолеть Небесную Кару",
      tier: "gold", category: "cultivation",
      check: (g) => g.realmIndex >= 7 },

    { id: "age_1000", name: "Тысячелетний Культиватор", description: "Прожить 1000 лет",
      tier: "gold", category: "cultivation",
      check: (g) => g.characterAge() >= 1000 },

    { id: "breakthroughs_20", name: "Неудержимый", description: "Совершить 20 прорывов за все жизни",
      tier: "gold", category: "cultivation",
      check: (g) => g.totalBreakthroughs >= 20 },

    { id: "breakthroughs_50", name: "Разрушитель Барьеров", description: "Совершить 50 прорывов за все жизни",
      tier: "gold", category: "cultivation",
      check: (g) => g.totalBreakthroughs >= 50 },

    { id: "stat_25", name: "Мастер Тела и Духа", description: "Любой стат достиг 25",
      tier: "gold", category: "cultivation",
      check: (g) => g.strength >= 25 || g.spirit >= 25 || g.luck >= 25 },

    // --- Бой ---
    { id: "combat_power_200", name: "Гроза Поднебесной", description: "Боевая мощь 200+",
      tier: "gold", category: "combat",
      check: (g) => g.getCombatPower() >= 200 },

    // --- Секта ---
    { id: "sect_rank_3", name: "Ядровой Ученик", description: "Достичь ранга Ядровой Ученик в секте",
      tier: "gold", category: "sect",
      check: (g) => g.sect && g.sect.rank >= 2 },

    { id: "sect_rank_5", name: "Глава Секты", description: "Достичь максимального ранга в секте",
      tier: "gold", category: "sect",
      check: (g) => g.sect && g.sect.rank >= 4 },

    { id: "mastered_jade", name: "Мастер Нефритовой Чистоты", description: "Стать Главой Секты Нефритовой Чистоты. Разблокирует выбор элемента Воды",
      tier: "gold", category: "sect",
      check: (g) => g.prestige.permanentMilestones.includes("mastered_sect_jade_purity") },

    { id: "mastered_crimson", name: "Мастер Алого Пламени", description: "Стать Главой Ордена Алого Пламени. Разблокирует выбор элемента Огня",
      tier: "gold", category: "sect",
      check: (g) => g.prestige.permanentMilestones.includes("mastered_sect_crimson_flame") },

    { id: "mastered_moon", name: "Мастер Лунного Озера", description: "Стать Главой Секты Лунного Озера. Разблокирует выбор элемента Дерева",
      tier: "gold", category: "sect",
      check: (g) => g.prestige.permanentMilestones.includes("mastered_sect_moon_lake") },

    { id: "mastered_abyss", name: "Мастер Культа Бездны", description: "Стать Главой Культа Бездны. Разблокирует выбор элемента Пустоты",
      tier: "gold", category: "sect",
      check: (g) => g.prestige.permanentMilestones.includes("mastered_sect_abyss_cult") },

    { id: "mastered_hermit", name: "Мастер Скрытой Секты", description: "Стать Главой Скрытой Секты. Разблокирует выбор элемента Ветра",
      tier: "jade", category: "sect",
      check: (g) => g.prestige.permanentMilestones.includes("mastered_sect_hidden_hermit") },

    { id: "sect_missions_20", name: "Верный Слуга Секты", description: "Выполнить 20 заданий секты",
      tier: "silver", category: "sect",
      check: (g) => (g.flags.sectMissionsCompleted || 0) >= 20 },

    // --- Исследование ---
    { id: "stones_1000", name: "Духовный Богач", description: "Накопить 1000 духовных камней",
      tier: "gold", category: "exploration",
      check: (g) => g.stones >= 1000 },

    { id: "expedition_demon_abyss", name: "Покоритель Бездны", description: "Завершить экспедицию в Бездну Демонов",
      tier: "gold", category: "exploration",
      check: (g) => g.flags.expedition_demon_abyss },

    // --- Артефакты ---
    { id: "artifact_enhance_5", name: "Начинающий Кузнец", description: "Заточить артефакт до +5",
      tier: "gold", category: "artifacts",
      check: (g) => g.artifacts.some(a => (a.enhance || 0) >= 5) },

    { id: "full_equipment", name: "Полное Снаряжение", description: "Экипировать все 4 слота артефактов",
      tier: "gold", category: "artifacts",
      check: (g) => {
          const slots = ["weapon", "armor", "accessory", "treasure"];
          return slots.every(s => g.equippedArtifacts[s] != null);
      }},

    // --- Статы ---
    { id: "stat_50", name: "Грань Совершенства", description: "Любой стат достиг 50",
      tier: "gold", category: "cultivation",
      check: (g) => g.strength >= 50 || g.spirit >= 50 || g.luck >= 50 },

    { id: "age_5000", name: "Древний", description: "Прожить 5000 лет",
      tier: "gold", category: "cultivation",
      check: (g) => g.characterAge() >= 5000 },

    { id: "artifact_epic", name: "Эпическая Находка", description: "Получить эпический артефакт (или выше)",
      tier: "gold", category: "artifacts",
      check: (g) => g.artifacts.some(a => ["epic", "legendary", "divine"].includes(a.tier)) },

    { id: "stones_2000", name: "Казна Секты", description: "Накопить 2000 духовных камней",
      tier: "gold", category: "exploration",
      check: (g) => g.stones >= 2000 },

    { id: "dao_3", name: "Путь Дао", description: "Достичь 3 уровня Дао",
      tier: "gold", category: "sect",
      check: (g) => g.daoLevel >= 3 },

    // --- Перерождение ---
    { id: "reborn", name: "Перерождённый", description: "Переродиться впервые",
      tier: "gold", category: "prestige",
      check: (g) => g.prestige.totalRebirths >= 1 },

    { id: "reborn_3", name: "Три Жизни", description: "Переродиться 3 раза",
      tier: "gold", category: "prestige",
      check: (g) => g.prestige.totalRebirths >= 3 },

    // ==============================
    // НЕФРИТОВЫЕ — endgame, бессмертие+
    // ==============================

    // --- Культивация ---
    { id: "realm_9", name: "Махаяна", description: "Достичь ступени Махаяна — вершины смертного пути",
      tier: "jade", category: "cultivation",
      check: (g) => g.realmIndex >= 9 },

    { id: "immortal", name: "Вознесение", description: "Стать Бессмертным (реалм 10)",
      tier: "jade", category: "cultivation",
      check: (g) => g.realmIndex >= 10 },

    { id: "realm_11", name: "Небесный Бессмертный", description: "Достичь ступени Небесный Бессмертный",
      tier: "jade", category: "cultivation",
      check: (g) => g.realmIndex >= 11 },

    { id: "realm_12", name: "Истинный Бессмертный", description: "Достичь ступени Истинный Бессмертный",
      tier: "jade", category: "cultivation",
      check: (g) => g.realmIndex >= 12 },

    { id: "realm_13", name: "Мистический Бессмертный", description: "Достичь ступени Мистический Бессмертный",
      tier: "jade", category: "cultivation",
      check: (g) => g.realmIndex >= 13 },

    { id: "realm_14", name: "Золотой Бессмертный", description: "Достичь вершины культивации",
      tier: "jade", category: "cultivation",
      check: (g) => g.realmIndex >= 14 },

    { id: "breakthroughs_100", name: "Сто Врат", description: "Совершить 100 прорывов за все жизни",
      tier: "jade", category: "cultivation",
      check: (g) => g.totalBreakthroughs >= 100 },

    { id: "age_10000", name: "Свидетель Эпох", description: "Прожить 10 000 лет",
      tier: "jade", category: "cultivation",
      check: (g) => g.characterAge() >= 10000 },

    { id: "ten_techniques", name: "Мастер Ста Школ", description: "Изучить 10 техник",
      tier: "jade", category: "cultivation",
      check: (g) => g.techniques.length >= 10 },

    // --- Бой ---
    { id: "combat_power_500", name: "Властелин Небес", description: "Боевая мощь 500+",
      tier: "jade", category: "combat",
      check: (g) => g.getCombatPower() >= 500 },

    // --- Секта ---
    { id: "sect_all_visited", name: "Странствующий Мудрец", description: "Вступить в 3 разные секты (за все жизни)",
      tier: "jade", category: "sect",
      check: (g) => {
          const visited = g.prestige.permanentMilestones.filter(m => m.startsWith("visited_sect_"));
          return visited.length >= 3;
      }},

    { id: "dao_level_5", name: "Постигший Дао", description: "Достичь 5 уровня Дао в любой секте",
      tier: "jade", category: "sect",
      check: (g) => {
          const levels = g.prestige.daoLevels || {};
          return Object.values(levels).some(l => l >= 5);
      }},

    // --- Исследование ---
    { id: "expedition_immortal_palace", name: "Наследник Бессмертного", description: "Завершить экспедицию во Дворец Бессмертного",
      tier: "jade", category: "exploration",
      check: (g) => g.flags.expedition_immortal_palace },

    { id: "stones_5000", name: "Сокровищница Дракона", description: "Накопить 5000 духовных камней",
      tier: "jade", category: "exploration",
      check: (g) => g.stones >= 5000 },

    { id: "adventures_5", name: "Искатель Древностей", description: "Завершить 5 приключений (за все жизни)",
      tier: "gold", category: "exploration",
      check: (g) => {
          const done = g.prestige.permanentMilestones.filter(m => m.startsWith("completed_adventure_"));
          return done.length >= 5;
      }},

    { id: "adventures_50", name: "Ветеран Приключений", description: "Завершить 50 приключений (за все жизни, с повторами)",
      tier: "jade", category: "exploration",
      check: (g) => (g.prestige.totalAdventures || 0) >= 50 },

    // --- Артефакты ---
    { id: "artifact_enhance_10", name: "Мастер-Кузнец", description: "Заточить артефакт до +10",
      tier: "jade", category: "artifacts",
      check: (g) => g.artifacts.some(a => (a.enhance || 0) >= 10) },

    { id: "artifact_transcend", name: "Трансценденция", description: "Совершить первый трансценд артефакта",
      tier: "jade", category: "artifacts",
      check: (g) => g.artifacts.some(a => (a.transcend || 0) >= 1) },

    { id: "artifact_legendary", name: "Легенда во Плоти", description: "Получить легендарный артефакт (или выше)",
      tier: "jade", category: "artifacts",
      check: (g) => g.artifacts.some(a => ["legendary", "divine"].includes(a.tier)) },

    // --- Перерождение ---
    { id: "reborn_5", name: "Вечный Странник", description: "Переродиться 5 раз",
      tier: "jade", category: "prestige",
      check: (g) => g.prestige.totalRebirths >= 5 },

    { id: "reborn_10", name: "Колесо Сансары", description: "Переродиться 10 раз",
      tier: "jade", category: "prestige",
      check: (g) => g.prestige.totalRebirths >= 10 },

    // ==============================
    // СЕКРЕТНЫЕ — скрытые условия, не видны до получения
    // ==============================

    // --- Прогрессия ---
    { id: "survived_demon", name: "Победивший Внутреннего Демона", description: "Пережить встречу с внутренним демоном",
      tier: "secret", category: "secret",
      check: (g) => g.flags.survivedDemon },

    { id: "natural_death", name: "Мудрость Полной Жизни", description: "Умереть от старости",
      tier: "secret", category: "secret",
      check: (g) => g.flags.diedNaturally },

    { id: "rebirth_all_events", name: "Память Всех Жизней", description: "Встретить все события перерождения за одну жизнь",
      tier: "secret", category: "secret",
      check: (g) => g.flags.rebirth_dejavu && g.flags.rebirth_body_memory && g.flags.rebirth_old_stash && g.flags.rebirth_dao_echo && g.flags.rebirth_master && g.flags.rebirth_forgotten },

    // --- Секты и Дао ---
    { id: "all_sects_mastered", name: "Владыка Пяти Путей", description: "Стать Главой Зала в каждой из 5 сект (за все жизни)",
      tier: "secret", category: "secret",
      check: (g) => {
          const mastered = g.prestige.permanentMilestones.filter(m => m.startsWith("mastered_sect_"));
          return mastered.length >= 5;
      }},

    // --- Артефакты ---
    { id: "artifact_tri", name: "Тройное Слияние", description: "Довести артефакт до TRI",
      tier: "secret", category: "secret",
      check: (g) => g.artifacts.some(a => (a.transcend || 0) >= 3) },

    { id: "four_tri", name: "Абсолютная Экипировка", description: "Экипировать 4 артефакта уровня TRI",
      tier: "secret", category: "secret",
      check: (g) => {
          const slots = ["weapon", "armor", "accessory", "treasure"];
          return slots.every(s => g.equippedArtifacts[s] && (g.equippedArtifacts[s].transcend || 0) >= 3);
      }},

    { id: "artifact_divine", name: "Дар Небес", description: "Получить божественный артефакт",
      tier: "secret", category: "secret",
      check: (g) => g.artifacts.some(a => a.tier === "divine") },

    { id: "failstacks_30", name: "Несгибаемая Воля", description: "Накопить 30 Воли Дао",
      tier: "secret", category: "secret",
      check: (g) => (g.enhanceFailstacks || 0) >= 30 },

    // --- Статы ---
    { id: "stat_100", name: "Совершенство Тела и Духа", description: "Все три стата достигли 100",
      tier: "secret", category: "secret",
      check: (g) => g.strength >= 100 && g.spirit >= 100 && g.luck >= 100 },

    { id: "stat_200", name: "За Гранью Смертных", description: "Любой стат достиг 200",
      tier: "secret", category: "secret",
      check: (g) => g.strength >= 200 || g.spirit >= 200 || g.luck >= 200 },

    // --- Приключения ---
    { id: "adventures_all", name: "Легенда Поднебесной", description: "Завершить все приключения (за все жизни)",
      tier: "secret", category: "secret",
      check: (g) => {
          const done = g.prestige.permanentMilestones.filter(m => m.startsWith("completed_adventure_"));
          return ADVENTURES.length > 0 && done.length >= ADVENTURES.length;
      }},

    { id: "adventures_10_life", name: "Неутомимый Искатель", description: "Завершить 10 приключений за одну жизнь",
      tier: "secret", category: "secret",
      check: (g) => (g.completedAdventures || []).length >= 10 },

    // --- Техники ---
    { id: "tech_divine", name: "Божественная Техника", description: "Вознести технику до божественного тира",
      tier: "secret", category: "secret",
      check: (g) => g.techniques.some(tid => {
          const t = TECHNIQUES.find(x => x.id === tid);
          return t && t.tier === "divine";
      })},
];
