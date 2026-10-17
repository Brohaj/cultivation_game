// ============================================================
// EVENTS/SECTS.JS — События сект (общие + уникальные для каждой)
// ============================================================

EVENTS.push(
    // --- Секта (общие) ---
    {
        id: "sect_recruitment",
        text: "Странствующий старейшина заметил вашу одарённость и вручил рекомендательную печать секты.",
        type: "reward",
        condition: (g) => g.realmIndex >= 1 && g.realmIndex <= 3 && !g.flags.sectRecommendation,
        effect: (g) => {
            g.flags.sectRecommendation = true;
            g.spirit += 1; g.stones += 20;
            return "Вы получили рекомендацию для вступления в секту! +1 дух, +20 камней";
        }
    },

    // == Секта Нефритовой Чистоты (jade_purity) ==
    {
        id: "jade_herb_garden",
        text: "Старшие ученики допустили вас в Нефритовый Сад секты. Среди изумрудных растений витает густая духовная энергия.",
        type: "reward",
        condition: (g) => g.sect && g.sect.id === "jade_purity" && g.realmIndex >= 2,
        effect: (g) => {
            const bonus = eventQiBonus(g,0.1);
            g.qi += bonus;
            g.pills += 2;
            return `+${bonus} ци от нефритовой энергии сада, +2 пилюли из редких трав`;
        }
    },
    {
        id: "jade_elder_lecture",
        text: "Старейшина Нефритовой Чистоты провёл открытую лекцию о гармонии стихий. Слова проникли прямо в сознание.",
        type: "reward",
        condition: (g) => g.sect && g.sect.id === "jade_purity" && g.realmIndex >= 3,
        effect: (g) => {
            g.spirit += 1;
            return "+1 дух. Мудрость старейшины укрепила ваше Дао.";
        }
    },
    {
        id: "jade_formation_practice",
        text: "Секта проводит совместную тренировку защитных формаций. Ваше участие оценено.",
        type: "reward",
        condition: (g) => g.sect && g.sect.id === "jade_purity" && g.sect.rank >= 1,
        effect: (g) => {
            g.spirit += 1;
            g.luck += 1;
            const stones = 5 + g.sect.rank * 5;
            g.stones += stones;
            return `+1 дух, +1 удача, +${stones} камней за вклад в формацию`;
        }
    },

    // == Орден Алого Пламени (crimson_flame) ==
    {
        id: "crimson_arena",
        text: "В Ордене начался ежегодный Турнир Пламени! Горячая кровь кипит, трибуны ревут!",
        type: "danger",
        condition: (g) => g.sect && g.sect.id === "crimson_flame" && g.realmIndex >= 3,
        effect: (g) => {
            const power = 10 + g.realmIndex * 5;
            if (g.getCombatPower() >= power) {
                const reward = 10 + g.realmIndex * 5;
                g.stones += reward;
                g.strength += 1;
                g.flags.wonCombat = true;
                return `Победа в турнире! +${reward} камней, +1 сила. Орден гордится вами!`;
            }
            g.strength += 1;
            return "+1 сила. Поражение, но каждый бой — урок.";
        }
    },
    {
        id: "crimson_forge_access",
        text: "Кузнец Ордена разрешил вам использовать Пламенную Печь для закалки тела. Жар невыносимый!",
        type: "reward",
        condition: (g) => g.sect && g.sect.id === "crimson_flame" && g.realmIndex >= 4,
        effect: (g) => {
            g.strength += 1;
            return "+1 сила. Огонь Ордена укрепил каждую кость.";
        }
    },
    {
        id: "crimson_beast_hunt",
        text: "Орден организовал групповую охоту на демонических зверей! Старшие братья зовут вас с собой.",
        type: "danger",
        condition: (g) => g.sect && g.sect.id === "crimson_flame" && g.realmIndex >= 3,
        effect: (g) => {
            const power = 8 + g.realmIndex * 4;
            if (g.getCombatPower() >= power) {
                const stones = 8 + g.realmIndex * 3;
                g.stones += stones;
                g.pills += 1;
                g.flags.wonCombat = true;
                return `Удачная охота! +${stones} камней, +1 пилюля из ядра зверя`;
            }
            const loss = Math.floor(g.qi * 0.1);
            g.qi = Math.max(0, g.qi - loss);
            return `Зверь оказался слишком силён. -${loss} ци, но вы выжили благодаря братьям.`;
        }
    },

    // == Секта Лунного Озера (moon_lake) ==
    {
        id: "moon_alchemy_lesson",
        text: "Мастер алхимии Лунного Озера проводит урок очищения пилюль при лунном свете. Вы допущены наблюдать.",
        type: "reward",
        condition: (g) => g.sect && g.sect.id === "moon_lake" && g.realmIndex >= 3,
        effect: (g) => {
            g.pills += 3;
            g.spirit += 1;
            return "+3 пилюли, +1 дух. Секреты лунной алхимии бесценны.";
        }
    },
    {
        id: "moon_lake_ritual",
        text: "Лунная ци наполнила озеро секты чистейшим сиянием. Ученикам разрешено медитировать у берега.",
        type: "reward",
        condition: (g) => g.sect && g.sect.id === "moon_lake" && g.realmIndex >= 4,
        effect: (g) => {
            const bonus = eventQiBonus(g,0.18);
            g.qi += bonus;
            g.spirit += 1;
            return `+${bonus} ци от лунной энергии озера, +1 дух`;
        }
    },
    {
        id: "moon_herb_exchange",
        text: "Сёстры-алхимики Лунного Озера дарят вам пилюли из редких лекарственных трав.",
        type: "reward",
        condition: (g) => g.sect && g.sect.id === "moon_lake",
        effect: (g) => {
            g.pills += 2;
            return "+2 пилюли из редких трав.";
        }
    },

    // == Культ Бездны (abyss_cult) ==
    {
        id: "abyss_dark_meditation",
        text: "Культ проводит ритуал Тёмной Медитации. Бездна шепчет вам — обещает силу в обмен на... что-то неуловимое.",
        type: "reward",
        condition: (g) => g.sect && g.sect.id === "abyss_cult" && g.realmIndex >= 5,
        effect: (g) => {
            const bonus = eventQiBonus(g,0.2);
            g.qi += bonus;
            g.strength += 1;
            return `+${bonus} ци, +1 сила. Бездна щедра... пока что.`;
        }
    },
    {
        id: "abyss_forbidden_tome",
        text: "В тайной библиотеке Культа вы нашли запретный том. Знания внутри... опасны, но невероятно ценны.",
        type: "danger",
        condition: (g) => g.sect && g.sect.id === "abyss_cult" && g.realmIndex >= 6 && !g.flags.abyss_tome,
        effect: (g) => {
            if (g.spirit >= 15 + g.realmIndex * 3) {
                g.flags.abyss_tome = true;
                g.spirit += 2;
                g.strength += 1;
                return "+2 дух, +1 сила. Вы усвоили запретное знание, сохранив рассудок.";
            }
            const loss = Math.floor(g.qi * 0.25);
            g.qi = Math.max(0, g.qi - loss);
            return `-${loss} ци. Знания оказались слишком тяжелы для вашего разума.`;
        }
    },
    {
        id: "abyss_sacrifice_offering",
        text: "Старшие адепты проводят жертвоприношение Бездне. Тёмная энергия наполняет зал.",
        type: "event",
        condition: (g) => g.sect && g.sect.id === "abyss_cult",
        effect: (g) => {
            const bonus = eventQiBonus(g,0.08);
            g.qi += bonus;
            return `+${bonus} ци. Тёмная энергия просочилась в ваши меридианы.`;
        }
    },

    // == Скрытая Секта (hidden_hermit) ==
    {
        id: "hermit_dao_discussion",
        text: "Мастер Скрытой Секты пригласил вас на чаепитие. За чашкой чая он рассуждал о природе Дао. Каждое слово — как удар грома в сознании.",
        type: "reward",
        condition: (g) => g.sect && g.sect.id === "hidden_hermit" && g.realmIndex >= 7,
        effect: (g) => {
            g.spirit += 2;
            g.luck += 1;
            return "+2 дух, +1 удача. Простой чай — но какая глубина в каждом глотке.";
        }
    },
    {
        id: "hermit_secret_cave",
        text: "Вам доверили координаты тайной пещеры для уединённой медитации. Внутри — идеальная тишина и концентрация ци.",
        type: "reward",
        condition: (g) => g.sect && g.sect.id === "hidden_hermit" && g.realmIndex >= 8,
        effect: (g) => {
            const bonus = eventQiBonus(g,0.22);
            g.qi += bonus;
            return `+${bonus} ци. В абсолютной тишине культивация идёт невероятно быстро.`;
        }
    },
    {
        id: "hermit_wind_walk",
        text: "Старший брат из Скрытой Секты показал, как ступать в такт ветру. Шорох ваших шагов потерялся в листве.",
        type: "reward",
        condition: (g) => g.sect && g.sect.id === "hidden_hermit" && g.sect.rank >= 1,
        effect: (g) => {
            g.spirit += 1;
            g.luck += 1;
            return "+1 дух, +1 удача. Вы стали чуть ближе к ветру.";
        }
    },

    // === МЕЖСЕКТОВЫЕ СОБЫТИЯ ===

    {
        id: "jade_vs_crimson",
        text: "На границе территорий два ученика — в нефритовом и алом — стоят друг напротив друга. Воздух дрожит от сдержанной силы. Пограничный спор.",
        type: "event",
        condition: (g) => g.sect && (g.sect.id === "jade_purity" || g.sect.id === "crimson_flame")
            && g.realmIndex >= 3 && g.realmIndex <= 6
            && (g.flags.jade_crimson_cd == null || g.years - g.flags.jade_crimson_cd >= 80),
        effect: (g) => {
            g.flags.jade_crimson_cd = g.years;
            if (g.sect.id === "jade_purity") {
                g.spirit += 1;
                return "Вы разрешили спор словом, не мечом. Орден отступил — пока. +1 дух";
            } else {
                g.strength += 1;
                return "Ваш клинок говорил за вас. Нефритовые ученики отступили — с уважением. +1 сила";
            }
        }
    },
    {
        id: "moon_lake_supplies",
        text: "Секта Лунного Озера отправила караван с целебными пилюлями в пострадавшие деревни. Местные кланяются.",
        type: "event",
        condition: (g) => g.sect && g.realmIndex >= 4 && g.realmIndex <= 7
            && (!g.flags.moon_supply_cd || g.years - g.flags.moon_supply_cd >= 100),
        effect: (g) => {
            g.flags.moon_supply_cd = g.years;
            if (g.sect.id === "moon_lake") {
                g.sect.contribution += 10;
                g.pills += 3;
                return "Вы возглавили караван. Благодарность простых людей — тоже путь Дао. +10 вклада, +3 пилюли";
            }
            g.pills += 1;
            return "Алхимики Лунного Озера раздают пилюли. Вам тоже досталась. +1 пилюля";
        }
    },
    {
        id: "abyss_suspicion",
        text: "Торговец духовными камнями взглянул на вашу мантию, побледнел и захлопнул ставни. «С Бездной дел не имею!»",
        type: "event",
        condition: (g) => g.sect && g.sect.id === "abyss_cult"
            && g.realmIndex >= 5 && g.realmIndex <= 8
            && (!g.flags.abyss_suspicion_cd || g.years - g.flags.abyss_suspicion_cd >= 120),
        effect: (g) => {
            g.flags.abyss_suspicion_cd = g.years;
            g.luck += 1;
            return "Страх — тоже форма уважения. +1 удача. Следующий торговец будет сговорчивее.";
        }
    },
    {
        id: "hermit_whispers",
        text: "В чайной шепчутся: «Видели его? Говорят, из Скрытой Секты...» «Тише! Они слышат ветер.»",
        type: "event",
        condition: (g) => g.sect && g.sect.id === "hidden_hermit"
            && g.realmIndex >= 7
            && (!g.flags.hermit_whisper_cd || g.years - g.flags.hermit_whisper_cd >= 150),
        effect: (g) => {
            g.flags.hermit_whisper_cd = g.years;
            g.spirit += 1;
            return "Вы допили чай и ушли. Никто не заметил, когда. +1 дух";
        }
    },
    {
        id: "sect_territory_patrol",
        text: "Секта поручила вам дозор на границе территории. Знакомые горы, знакомый ветер.",
        type: "event",
        condition: (g) => g.sect && g.realmIndex >= 3 && g.realmIndex <= 7
            && (!g.flags.patrol_cd || g.years - g.flags.patrol_cd >= 60),
        effect: (g) => {
            g.flags.patrol_cd = g.years;
            const sectLoc = { jade_purity: "Лес Духовных Трав", crimson_flame: "Пещера Древнего Зверя",
                              moon_lake: "Руины Забытой Секты", abyss_cult: "Бездна Демонов",
                              hidden_hermit: "Вершина Ветров" };
            const loc = sectLoc[g.sect.id] || "священные земли";
            g.stones += 5;
            const bonus = eventQiBonus(g, 0.05);
            g.qi += bonus;
            return `Дозор у ${loc}. Тишина — лучший знак. +5 камней, +${bonus} ци`;
        }
    },

    // === ЭПОХА-ЗАВИСИМЫЕ СОБЫТИЯ ===

    {
        id: "sect_era_conflict",
        text: "Эпоха Конфликта. Секта созывает всех учеников. Старейшины стоят у карты: границы горят.",
        type: "event",
        condition: (g) => g.sect && g.getCurrentEra && g.getCurrentEra().id === "conflict"
            && g.realmIndex >= 3
            && (!g.flags.era_conflict_cd || g.years - g.flags.era_conflict_cd >= 200),
        effect: (g) => {
            g.flags.era_conflict_cd = g.years;
            g.strength += 1;
            g.sect.contribution += 5;
            return "Секта мобилизуется. Каждый клинок на счету. +1 сила, +5 вклада";
        }
    },
    {
        id: "sect_era_invasion",
        text: "Демоническое Нашествие. Впервые за столетия все пять сект действуют как одна. Бывшие соперники стоят плечом к плечу.",
        type: "event",
        condition: (g) => g.sect && g.getCurrentEra && g.getCurrentEra().id === "invasion"
            && g.realmIndex >= 3
            && (!g.flags.era_invasion_cd || g.years - g.flags.era_invasion_cd >= 200),
        effect: (g) => {
            g.flags.era_invasion_cd = g.years;
            g.spirit += 1;
            g.strength += 1;
            return "Единство перед лицом Бездны. +1 дух, +1 сила";
        }
    },
    {
        id: "sect_era_golden",
        text: "Золотая Эра. Секта процветает. Ученики смеются, сокровищница полна, а воздух пропитан чистейшей ци.",
        type: "reward",
        condition: (g) => g.sect && g.getCurrentEra && g.getCurrentEra().id === "golden"
            && g.realmIndex >= 2
            && (!g.flags.era_golden_cd || g.years - g.flags.era_golden_cd >= 200),
        effect: (g) => {
            g.flags.era_golden_cd = g.years;
            g.stones += 20;
            g.pills += 3;
            return "Процветание секты. Щедрые дары из сокровищницы. +20 камней, +3 пилюли";
        }
    },
);
