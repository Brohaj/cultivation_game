// ============================================================
// EVENTS/FILLERS_EARLY.JS — Атмосферные филлеры (реалм 0-7)
// Повторяемые, кулдаун 50 лет. Ноль статов, максимум ци/дао 2-3%
// ============================================================

EVENTS.push(
    // --- 1. Рассвет над долиной ---
    {
        id: "valley_dawn",
        text: "Первые лучи солнца окрасили туман в золото. Долина внизу дышала покоем. Вы забыли, зачем встали так рано — и просто стояли, глядя.",
        type: "event",
        condition: (g) => g.realmIndex <= 5 && g.years - (g.flags._cd_valley_dawn || 0) >= 50,
        effect: (g) => {
            g.flags._cd_valley_dawn = g.years;
            const bonus = eventQiBonus(g,0.03);
            g.qi = Math.min(g.qi + bonus, g.qiNeeded());
            return `+${bonus} ци`;
        }
    },

    // --- 2. Дождь на черепице ---
    {
        id: "rain_on_tiles",
        text: "Дождь стучит по черепице. Запах мокрой земли, прохлада. Идеальный день для того, чтобы никуда не идти и ни о чём не думать.",
        type: "event",
        condition: (g) => g.realmIndex <= 4 && g.years - (g.flags._cd_rain_on_tiles || 0) >= 50,
        effect: (g) => {
            g.flags._cd_rain_on_tiles = g.years;
            if (g.realmIndex >= 3 && g.sect) {
                const bonus = Math.floor(g.daoNeeded() * 0.02);
                g.daoProgress += bonus;
                return `+${bonus} постижение Дао. Иногда покой — лучший учитель.`;
            }
            return "Иногда покой — лучший учитель.";
        }
    },

    // --- 3. Пьяный культиватор ---
    {
        id: "drunk_cultivator",
        text: "Мужик в рваном халате лежал в канаве и декламировал стихи. «Дао — как вода! Вода — как вино! Вино — как Дао!» На удивление, в его словах было зерно истины.",
        type: "event",
        condition: (g) => g.realmIndex >= 1 && g.realmIndex <= 5 && g.years - (g.flags._cd_drunk_cultivator || 0) >= 50,
        effect: (g) => {
            g.flags._cd_drunk_cultivator = g.years;
            if (g.realmIndex >= 3 && g.sect) {
                const bonus = Math.floor(g.daoNeeded() * 0.02);
                g.daoProgress += bonus;
                return `+${bonus} постижение Дао. Мудрость приходит из неожиданных мест.`;
            }
            return "Мудрость приходит из неожиданных мест.";
        }
    },

    // --- 4. Ночной рынок ---
    {
        id: "night_market_filler",
        text: "Ночной рынок! Фонари, запах жареного теста, зазывалы. Вы купили сахарного дракона на палочке и съели его, глядя на звёзды. Хороший вечер. Из тех, что не хочется заканчивать.",
        type: "event",
        condition: (g) => g.realmIndex >= 1 && g.realmIndex <= 6 && g.years - (g.flags._cd_night_market_filler || 0) >= 50,
        effect: (g) => {
            g.flags._cd_night_market_filler = g.years;
            const bonus = eventQiBonus(g,0.02);
            g.qi = Math.min(g.qi + bonus, g.qiNeeded());
            return `+${bonus} ци`;
        }
    },

    // --- 5. Журавли летят на юг ---
    {
        id: "cranes_south",
        text: "Клин журавлей тянулся к югу. Один отстал — крыло задевало облака. Но он догнал. Почему-то после этого стало спокойнее на душе.",
        type: "event",
        condition: (g) => g.realmIndex >= 1 && g.realmIndex <= 5 && g.years - (g.flags._cd_cranes_south || 0) >= 50,
        effect: (g) => {
            g.flags._cd_cranes_south = g.years;
            if (g.realmIndex >= 3 && g.sect) {
                const bonus = Math.floor(g.daoNeeded() * 0.03);
                g.daoProgress += bonus;
                return `+${bonus} постижение Дао`;
            }
            const bonus = eventQiBonus(g,0.03);
            g.qi = Math.min(g.qi + bonus, g.qiNeeded());
            return `+${bonus} ци`;
        }
    },

    // --- 6. Неудачный алхимик ---
    {
        id: "failed_alchemist",
        text: "Юноша рыдал над котлом с зелёной жижей. «ЭТО ДОЛЖНА БЫЛА БЫТЬ ПИЛЮЛЯ БЕССМЕРТИЯ!» Жижа булькнула и взорвалась ему в лицо. Вы ушли, пока не прилетело.",
        type: "event",
        condition: (g) => g.realmIndex >= 1 && g.realmIndex <= 5 && g.years - (g.flags._cd_failed_alchemist || 0) >= 50,
        effect: (g) => {
            g.flags._cd_failed_alchemist = g.years;
            return "Алхимия — опасное ремесло.";
        }
    },

    // --- 7. Спящий кот-дух ---
    {
        id: "sleeping_spirit_cat",
        text: "Кот с двумя хвостами спал на тёплом камне у дороги. Вы сели рядом. Он приоткрыл один глаз, зевнул и снова уснул. Мудрый зверь. Вы почувствовали, что вас только что оценили... и признали неинтересным.",
        type: "event",
        condition: (g) => g.realmIndex >= 1 && g.realmIndex <= 4 && g.years - (g.flags._cd_sleeping_spirit_cat || 0) >= 50,
        effect: (g) => {
            g.flags._cd_sleeping_spirit_cat = g.years;
            const bonus = eventQiBonus(g,0.02);
            g.qi = Math.min(g.qi + bonus, g.qiNeeded());
            return `+${bonus} ци`;
        }
    },

    // --- 8. Спор торговцев ---
    {
        id: "merchant_argument",
        text: "Два торговца орали друг на друга из-за цены на обычный булыжник. «Это духовный камень!» — «Это КАМЕНЬ!» Вы обошли их стороной. Камень остался при них. Истина — тоже.",
        type: "event",
        condition: (g) => g.realmIndex >= 2 && g.realmIndex <= 6 && g.years - (g.flags._cd_merchant_argument || 0) >= 50,
        effect: (g) => {
            g.flags._cd_merchant_argument = g.years;
            return "Некоторые споры не стоят вашего времени.";
        }
    },

    // --- 9. Старая чайная ---
    {
        id: "old_teahouse",
        text: "Чайная на перекрёстке. Старик-хозяин молча налил чай. Вы молча выпили. Он молча кивнул. Сказать было нечего. И не надо было.",
        type: "event",
        condition: (g) => g.realmIndex >= 1 && g.realmIndex <= 5 && g.years - (g.flags._cd_old_teahouse || 0) >= 50,
        effect: (g) => {
            g.flags._cd_old_teahouse = g.years;
            if (g.realmIndex >= 3 && g.sect) {
                const bonus = Math.floor(g.daoNeeded() * 0.02);
                g.daoProgress += bonus;
                return `+${bonus} постижение Дао`;
            }
            return "Хороший чай.";
        }
    },

    // --- 10. Звёздная ночь ---
    {
        id: "starry_night",
        text: "Ночь без единого облака. Столько звёзд, что голова кружилась. Где-то среди них — бессмертные, которые смотрят вниз. Или им уже давно не до нас.",
        type: "event",
        condition: (g) => g.realmIndex >= 2 && g.realmIndex <= 7 && g.years - (g.flags._cd_starry_night || 0) >= 50,
        effect: (g) => {
            g.flags._cd_starry_night = g.years;
            const bonus = eventQiBonus(g,0.03);
            g.qi = Math.min(g.qi + bonus, g.qiNeeded());
            return `+${bonus} ци`;
        }
    },

    // --- 11. Курица переходит дорогу ---
    {
        id: "chicken_crosses_road",
        text: "Обычная курица перешла дорогу прямо перед вами. Остановилась. Посмотрела. Ушла. Вы десять минут думали, зачем она это сделала.",
        type: "event",
        condition: (g) => g.realmIndex <= 3 && g.years - (g.flags._cd_chicken || 0) >= 50,
        effect: (g) => {
            g.flags._cd_chicken = g.years;
            return "Некоторые загадки не имеют ответа.";
        }
    },

    // --- 12. Ребёнок и жаба ---
    {
        id: "kid_and_toad",
        text: "Мальчишка сидел на корточках перед жабой и показывал ей боевую стойку. Жаба моргнула и ускакала. «Ну и ладно!» — крикнул он вслед. «Ты просто не готова!» Жаба не возразила.",
        type: "event",
        condition: (g) => g.realmIndex >= 1 && g.realmIndex <= 4 && g.years - (g.flags._cd_kid_toad || 0) >= 50,
        effect: (g) => {
            g.flags._cd_kid_toad = g.years;
            return "Невинность — тоже форма Дао.";
        }
    }
);
