// ============================================================
// EVENTS/FILLERS_MID.JS — Атмосферные филлеры (реалм 4-9)
// Повторяемые, кулдаун 50 лет. Ноль статов, максимум ци/дао 2-3%
// ============================================================

EVENTS.push(
    // --- 13. Гроза над горами ---
    {
        id: "mountain_storm",
        text: "Молнии били в горные пики одна за другой. Воздух звенел, волосы встали дыбом. Страшно. Но до чего же красиво.",
        type: "event",
        condition: (g) => g.realmIndex >= 4 && g.realmIndex <= 8 && g.years - (g.flags._cd_mountain_storm || 0) >= 50,
        effect: (g) => {
            g.flags._cd_mountain_storm = g.years;
            const bonus = eventQiBonus(g,0.03);
            g.qi = Math.min(g.qi + bonus, g.qiNeeded());
            return `+${bonus} ци`;
        }
    },

    // --- 14. Древний обелиск ---
    {
        id: "ancient_obelisk",
        text: "Каменный обелиск посреди поляны. Письмена стёрты до неузнаваемости. Руку покалывает, когда касаешься. Ничего не понятно, но хочется стоять и смотреть. Как будто что-то вот-вот станет понятным.",
        type: "event",
        condition: (g) => g.realmIndex >= 4 && g.realmIndex <= 9 && g.years - (g.flags._cd_ancient_obelisk || 0) >= 50,
        effect: (g) => {
            g.flags._cd_ancient_obelisk = g.years;
            if (g.realmIndex >= 3 && g.sect) {
                const bonus = Math.floor(g.daoNeeded() * 0.02);
                g.daoProgress += bonus;
                return `+${bonus} постижение Дао`;
            }
            return "Что-то вот-вот станет понятным. Но не сегодня.";
        }
    },

    // --- 15. Храпящий старейшина ---
    {
        id: "snoring_elder",
        text: "Старейшина секты заснул посреди собственной лекции о «Неколебимой Воле». Ученики сидят не шевелясь — боятся разбудить. Храп усиливается. Кто-то хихикнул. И тут же перестал.",
        type: "event",
        condition: (g) => g.realmIndex >= 4 && g.realmIndex <= 7 && g.sect && g.years - (g.flags._cd_snoring_elder || 0) >= 50,
        effect: (g) => {
            g.flags._cd_snoring_elder = g.years;
            return "Неколебимая Воля. В буквальном смысле.";
        }
    },

    // --- 16. Лепестки с неба ---
    {
        id: "petals_from_sky",
        text: "Белые лепестки падали с ясного неба. Ни ветра, ни деревьев вокруг. Лепестки таяли, не долетая до земли. Кто-то наверху медитирует... или плачет.",
        type: "event",
        condition: (g) => g.realmIndex >= 5 && g.realmIndex <= 9 && g.years - (g.flags._cd_petals || 0) >= 50,
        effect: (g) => {
            g.flags._cd_petals = g.years;
            if (g.realmIndex >= 3 && g.sect) {
                const bonus = Math.floor(g.daoNeeded() * 0.02);
                g.daoProgress += bonus;
                return `+${bonus} постижение Дао`;
            }
            return "Красота, которую нельзя объяснить.";
        }
    },

    // --- 17. Колокол в тумане ---
    {
        id: "bell_in_fog",
        text: "Один удар колокола из тумана. Низкий, протяжный. Вы замерли, ожидая второго удара. Его не было. Тишина после звука оказалась громче самого звука.",
        type: "event",
        condition: (g) => g.realmIndex >= 5 && g.realmIndex <= 9 && g.years - (g.flags._cd_bell_fog || 0) >= 50,
        effect: (g) => {
            g.flags._cd_bell_fog = g.years;
            return "Иногда тишина говорит больше слов.";
        }
    },

    // --- 18. Отражение в озере ---
    {
        id: "lake_reflection",
        text: "В озере ваше отражение выглядело иначе. Старше? Мудрее? Сильнее? Вы моргнули — и увидели себя обычного. Но ощущение осталось.",
        type: "event",
        condition: (g) => g.realmIndex >= 4 && g.realmIndex <= 8 && g.years - (g.flags._cd_lake_reflection || 0) >= 50,
        effect: (g) => {
            g.flags._cd_lake_reflection = g.years;
            if (g.realmIndex >= 3 && g.sect) {
                const bonus = Math.floor(g.daoNeeded() * 0.03);
                g.daoProgress += bonus;
                return `+${bonus} постижение Дао. Может, отражение знало больше вас.`;
            }
            return "Может, отражение знало больше вас.";
        }
    },

    // --- 19. Упавший свиток ---
    {
        id: "fallen_scroll_soup",
        text: "Свиток упал с неба и развернулся у ваших ног. Вы с трепетом прочитали... рецепт супа. Из лотосовых корней. Впрочем, суп оказался потрясающим.",
        type: "event",
        condition: (g) => g.realmIndex >= 4 && g.realmIndex <= 8 && g.years - (g.flags._cd_fallen_scroll_soup || 0) >= 50,
        effect: (g) => {
            g.flags._cd_fallen_scroll_soup = g.years;
            return "Не всякий свиток содержит технику. Но этот суп вы запомните.";
        }
    },

    // --- 20. Два облака ---
    {
        id: "two_clouds",
        text: "Два облака плыли навстречу друг другу. Столкнулись. Одно поглотило другое и стало вдвое больше. Вы смотрели на это минут десять. Это точно метафора. Но чего — вы так и не поняли.",
        type: "event",
        condition: (g) => g.realmIndex >= 5 && g.realmIndex <= 9 && g.years - (g.flags._cd_two_clouds || 0) >= 50,
        effect: (g) => {
            g.flags._cd_two_clouds = g.years;
            if (g.realmIndex >= 3 && g.sect) {
                const bonus = Math.floor(g.daoNeeded() * 0.02);
                g.daoProgress += bonus;
                return `+${bonus} постижение Дао. Может, это и есть ответ.`;
            }
            return "Может, это и есть ответ.";
        }
    }
);
