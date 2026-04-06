// ============================================================
// EVENTS/LATE.JS — Высший тир (реалм 8-9) + Бессмертный тир (10+)
// ============================================================

EVENTS.push(
    // === ВЫСШИЙ ТИР (реалм 8-9) ===
    {
        id: "nearby_tribulation",
        text: "Небо почернело! Кто-то поблизости пытается преодолеть Небесную Кару. Остаточные молнии бьют повсюду!",
        type: "danger",
        condition: (g) => g.realmIndex >= 8 && g.realmIndex <= 9,
        effect: (g) => {
            if (g.spirit >= 30 + g.realmIndex * 5) {
                const bonus = eventQiBonus(g,0.1);
                g.qi += bonus;
                return `Вы поглотили остаточную энергию молний! +${bonus} ци`;
            }
            const loss = Math.floor(g.qi * 0.2);
            g.qi = Math.max(0, g.qi - loss);
            return `Молнии ранили вас. -${loss} ци`;
        }
    },
    {
        id: "demon_lord_awakens",
        text: "Древний демон-лорд пробудился в подземелье! Его аура затмила солнце.",
        type: "danger",
        condition: (g) => g.realmIndex >= 8 && g.realmIndex <= 9,
        effect: (g) => {
            if (g.getCombatPower() >= 60 + g.realmIndex * 10) {
                const reward = 50 + g.realmIndex * 10;
                const strBonus = 1 + Math.floor(g.realmIndex / 2);
                g.stones += reward;
                g.strength += strBonus;
                g.flags.wonCombat = true;
                return `Невероятно! Вы запечатали демон-лорда! +${reward} камней, +${strBonus} сила`;
            }
            const loss = Math.floor(g.qi * 0.35);
            g.qi = Math.max(0, g.qi - loss);
            return `Демон-лорд слишком силён. Вы отступили. -${loss} ци`;
        }
    },
    {
        id: "spatial_rift",
        text: "Пространственная трещина открылась прямо перед вами! Внутри мерцает энергия иного мира.",
        type: "reward",
        condition: (g) => g.realmIndex >= 8 && g.realmIndex <= 9,
        effect: (g) => {
            const bonus = eventQiBonus(g,0.25);
            g.qi += bonus;
            g.pills += 5;
            return `Вы проникли в трещину и вернулись с сокровищами! +${bonus} ци, +5 пилюль`;
        }
    },
    {
        id: "fallen_immortal_will",
        text: "Остаточная воля падшего бессмертного пытается захватить ваше тело! Ваше сознание — поле битвы.",
        type: "danger",
        condition: (g) => g.realmIndex >= 8,
        effect: (g) => {
            if (g.spirit >= 40 + g.realmIndex * 5) {
                g.spirit += 2;
                g.luck += 1;
                return "Вы подавили волю и поглотили её знания! +2 дух, +1 удача";
            }
            const loss = Math.floor(g.qi * 0.4);
            g.qi = Math.max(0, g.qi - loss);
            return `Еле вырвались из-под контроля! -${loss} ци`;
        }
    },

    // === ВЫСШИЙ ТИР (доп. события) ===
    {
        id: "heavenly_dao_whisper",
        text: "На вершине горы вы услышали шёпот Небесного Дао. Слова не имели смысла — но тело впитало их, как губка.",
        type: "reward",
        condition: (g) => g.realmIndex >= 8 && g.realmIndex <= 9,
        effect: (g) => {
            const bonus = eventQiBonus(g,0.15);
            g.qi += bonus;
            g.spirit += 1;
            return `+${bonus} ци, +1 дух. Небесное Дао говорит с теми, кто готов слушать.`;
        }
    },
    {
        id: "tribulation_lightning_harvest",
        text: "Остаточные молнии после чьей-то Небесной Кары бьют в скалы. Вы собрали насыщенные громовой энергией минералы.",
        type: "reward",
        condition: (g) => g.realmIndex >= 8 && g.realmIndex <= 9,
        effect: (g) => {
            const stones = 25 + Math.floor(g.luck * 4);
            g.stones += stones;
            return `+${stones} камней. Громовые минералы высоко ценятся.`;
        }
    },
    {
        id: "mahayana_pressure",
        text: "Другой культиватор Махаяны решил испытать вас давлением ауры. Воздух загустел.",
        type: "danger",
        condition: (g) => g.realmIndex >= 8 && g.realmIndex <= 9,
        effect: (g) => {
            if (g.spirit >= 25 + g.realmIndex * 4) {
                g.strength += 1;
                g.spirit += 1;
                return "+1 сила, +1 дух. Вы выдержали — и ответили тем же. Взаимное уважение.";
            }
            const loss = Math.floor(g.qi * 0.12);
            g.qi = Math.max(0, g.qi - loss);
            return `-${loss} ци. Давление было невыносимым, но вы устояли на ногах.`;
        }
    },
    {
        id: "ancient_battlefield_legacy",
        text: "На месте древней битвы бессмертных вы обнаружили кристаллизованные остатки ци. Им тысячи лет, но сила не угасла.",
        type: "reward",
        condition: (g) => g.realmIndex >= 8 && g.realmIndex <= 9,
        effect: (g) => {
            const bonus = eventQiBonus(g,0.18);
            g.qi += bonus;
            const stones = 15 + g.realmIndex * 3;
            g.stones += stones;
            return `+${bonus} ци, +${stones} камней из кристаллов древней силы`;
        }
    },
    {
        id: "heavenly_dao_test",
        text: "Небо озарилось! Вы чувствуете, как Небесное Дао проверяет вашу решимость. Невидимая сила давит на сознание.",
        type: "danger",
        condition: (g) => g.realmIndex >= 8 && g.realmIndex <= 9,
        effect: (g) => {
            const totalPower = g.strength + g.spirit;
            if (totalPower >= 40 + g.realmIndex * 5) {
                g.spirit += 1;
                const bonus = eventQiBonus(g,0.1);
                g.qi += bonus;
                return `+1 дух, +${bonus} ци. Небесное Дао признало вашу волю.`;
            }
            const loss = Math.floor(g.qi * 0.2);
            g.qi = Math.max(0, g.qi - loss);
            return `-${loss} ци. Испытание оказалось не по силам... пока.`;
        }
    },
    {
        id: "void_whale_sighting",
        text: "В небе проплыло гигантское существо — Пустотный Кит. Его тень накрыла горы. Остаточная ци с его чешуи осыпалась, как золотая пыль.",
        type: "event",
        condition: (g) => g.realmIndex >= 8 && g.realmIndex <= 9,
        effect: (g) => {
            const bonus = eventQiBonus(g,0.08);
            g.qi += bonus;
            g.luck += 1;
            return `+${bonus} ци, +1 удача. Увидеть Пустотного Кита — к великой удаче.`;
        }
    },

    // === БЕССМЕРТНЫЙ ТИР (реалм 10+) ===
    {
        id: "immortal_clan_war",
        text: "Битва между кланами бессмертных сотрясла пространство! Волны энергии разрушают горы.",
        type: "danger",
        condition: (g) => g.realmIndex >= 10,
        effect: (g) => {
            if (g.getCombatPower() >= 100 + g.realmIndex * 15) {
                const reward = 100 + g.realmIndex * 20;
                g.stones += reward;
                g.flags.wonCombat = true;
                return `Вы вмешались и заслужили уважение обоих кланов! +${reward} камней`;
            }
            const loss = Math.floor(g.qi * 0.2);
            g.qi = Math.max(0, g.qi - loss);
            g.stones += 30;
            return `Вы укрылись от ударной волны. -${loss} ци, но +30 камней из обломков`;
        }
    },
    {
        id: "divine_artifact_shard",
        text: "Среди осколков древнего храма вы нашли фрагмент Божественного Артефакта! Он пульсирует невероятной силой.",
        type: "reward",
        condition: (g) => g.realmIndex >= 10,
        effect: (g) => {
            const statBonus = 2 + Math.floor(g.realmIndex / 2);
            g.strength += statBonus;
            g.spirit += statBonus;
            const bonus = eventQiBonus(g,0.3);
            g.qi += bonus;
            return `Фрагмент артефакта влился в ваше тело! +${statBonus} сила, +${statBonus} дух, +${bonus} ци`;
        }
    },
    {
        id: "golden_immortal_message",
        text: "Древний Золотой Бессмертный оставил послание в потоке времени. Слова обращены... к вам?",
        type: "reward",
        condition: (g) => g.realmIndex >= 11,
        effect: (g) => {
            const spiritBonus = 1 + Math.floor(g.realmIndex / 2);
            const luckBonus = 1 + Math.floor(g.realmIndex / 3);
            g.spirit += spiritBonus;
            g.luck += luckBonus;
            const bonus = eventQiBonus(g,0.2);
            g.qi += bonus;
            return `«Упорство — единственный путь.» Мудрость Золотого Бессмертного! +${spiritBonus} дух, +${luckBonus} удача, +${bonus} ци`;
        }
    },
    {
        id: "heavenly_palace_hunt",
        text: "Небесный Дворец объявил охоту на отступников! Вас приняли за одного из них. Небесные стражи атакуют!",
        type: "danger",
        condition: (g) => g.realmIndex >= 10,
        effect: (g) => {
            if (g.getCombatPower() >= 120 + g.realmIndex * 20) {
                const strBonus = 1 + Math.floor(g.realmIndex / 2);
                g.strength += strBonus;
                const reward = 80 + g.realmIndex * 15;
                g.stones += reward;
                g.flags.wonCombat = true;
                return `Вы доказали свою невиновность силой! +${strBonus} сила, +${reward} камней`;
            }
            const loss = Math.floor(g.qi * 0.3);
            g.qi = Math.max(0, g.qi - loss);
            return `Вы бежали, скрывшись в пространственном разрыве. -${loss} ци`;
        }
    },
    {
        id: "spatial_storm_immortal",
        text: "Пространственная буря обрушилась на Бессмертный Мир! Законы реальности искажаются.",
        type: "danger",
        condition: (g) => g.realmIndex >= 10,
        effect: (g) => {
            if (g.spirit >= 60 + g.realmIndex * 10) {
                const bonus = eventQiBonus(g,0.15);
                g.qi += bonus;
                g.luck += 1;
                return `Вы прочитали узоры бури и постигли тайну пространства! +${bonus} ци, +1 удача`;
            }
            const loss = Math.floor(g.qi * 0.25);
            g.qi = Math.max(0, g.qi - loss);
            return `Буря швырнула вас через пространство. -${loss} ци`;
        }
    },
    {
        id: "immortal_treasure_realm",
        text: "Тайное Царство Бессмертных открыло врата! Внутри — ресурсы, немыслимые для смертных.",
        type: "reward",
        condition: (g) => g.realmIndex >= 10,
        effect: (g) => {
            const stones = 50 + g.realmIndex * 10;
            g.stones += stones;
            g.pills += 8;
            return `+${stones} камней, +8 пилюль из Бессмертного Царства`;
        }
    },

    // === БЕССМЕРТНЫЙ ТИР (доп. события) ===
    {
        id: "dao_law_comprehension",
        text: "Сидя между облаками, вы внезапно узрели Закон — нить, связывающую все вещи. Понимание длилось лишь вздох, но изменило вас навсегда.",
        type: "reward",
        condition: (g) => g.realmIndex >= 10,
        effect: (g) => {
            const bonus = eventQiBonus(g,0.12);
            g.qi += bonus;
            g.spirit += 1 + Math.floor(g.realmIndex / 4);
            return `+${bonus} ци, +${1 + Math.floor(g.realmIndex / 4)} дух. Постижение Закона.`;
        }
    },
    {
        id: "immortal_herb_garden",
        text: "Вы набрели на заброшенный сад бессмертного. Травы здесь росли тысячелетиями — каждый стебель пропитан эпохами.",
        type: "reward",
        condition: (g) => g.realmIndex >= 10,
        effect: (g) => {
            g.pills += 5 + Math.floor(g.realmIndex / 2);
            return `+${5 + Math.floor(g.realmIndex / 2)} пилюль из трав тысячелетней выдержки`;
        }
    },
    {
        id: "heavenly_court_decree",
        text: "Посланник Небесного Двора зачитал указ: новый закон о распределении духовных территорий. Это не касается вас напрямую... пока.",
        type: "event",
        condition: (g) => g.realmIndex >= 10,
        effect: (g) => {
            g.luck += 1;
            return "+1 удача. Политика бессмертных — опасная игра, но осведомлённость не помешает.";
        }
    },
    {
        id: "ancient_immortal_duel",
        text: "Два древних бессмертных сошлись в поединке! Пространство трещит, звёзды гаснут. Вы едва успели поставить защитный барьер.",
        type: "danger",
        condition: (g) => g.realmIndex >= 10,
        effect: (g) => {
            if (g.spirit >= 50 + g.realmIndex * 8) {
                g.strength += 1;
                g.spirit += 1;
                const bonus = eventQiBonus(g,0.08);
                g.qi += bonus;
                return `+1 сила, +1 дух, +${bonus} ци. Наблюдение за боем мастеров — бесценный опыт.`;
            }
            const loss = Math.floor(g.qi * 0.15);
            g.qi = Math.max(0, g.qi - loss);
            return `-${loss} ци от ударных волн. Слишком близко!`;
        }
    },
    {
        id: "time_river_glimpse",
        text: "Вы заглянули в Реку Времени. На миг увидели прошлое — и возможное будущее. Голова раскалывается, но знание осталось.",
        type: "event",
        condition: (g) => g.realmIndex >= 11,
        effect: (g) => {
            g.spirit += 2;
            g.luck += 1;
            return "+2 дух, +1 удача. Время — величайший учитель.";
        }
    },
    {
        id: "void_beast_territory",
        text: "Вы случайно забрели на территорию Пустотного Зверя! Его рёв исказил пространство вокруг.",
        type: "danger",
        condition: (g) => g.realmIndex >= 10,
        effect: (g) => {
            const power = 80 + g.realmIndex * 12;
            if (g.getCombatPower() >= power) {
                const reward = 60 + g.realmIndex * 10;
                g.stones += reward;
                g.strength += 1;
                g.flags.wonCombat = true;
                return `Зверь повержен! +${reward} камней, +1 сила`;
            }
            const loss = Math.floor(g.qi * 0.2);
            g.qi = Math.max(0, g.qi - loss);
            return `-${loss} ци. Вы сбежали через пространственный разрыв.`;
        }
    },
    {
        id: "karma_thread_vision",
        text: "На мгновение вы увидели нити кармы, опутывающие мир. Ваша собственная нить тянулась далеко — к чему-то огромному.",
        type: "event",
        condition: (g) => g.realmIndex >= 11,
        effect: (g) => {
            const bonus = eventQiBonus(g,0.1);
            g.qi += bonus;
            g.spirit += 1;
            return `+${bonus} ци, +1 дух. Карма плетёт свои узоры...`;
        }
    },
    {
        id: "celestial_phenomenon",
        text: "Девять солнц взошли одновременно! Небесная аномалия наполнила мир невиданной энергией.",
        type: "reward",
        condition: (g) => g.realmIndex >= 10,
        effect: (g) => {
            const bonus = eventQiBonus(g,0.2);
            g.qi += bonus;
            const stones = 30 + g.realmIndex * 5;
            g.stones += stones;
            return `+${bonus} ци, +${stones} камней. Такое бывает раз в десять тысяч лет!`;
        }
    },
    {
        id: "immortal_dao_conference",
        text: "Великая Конференция Дао! Бессмертные со всех сторон света собрались для обмена знаниями. Вы слушали три дня и три ночи.",
        type: "reward",
        condition: (g) => g.realmIndex >= 10,
        effect: (g) => {
            g.spirit += 2;
            const bonus = eventQiBonus(g,0.1);
            g.qi += bonus;
            return `+2 дух, +${bonus} ци. Мудрость тысячелетий сконцентрирована в одном зале.`;
        }
    },
    {
        id: "space_fold_treasure",
        text: "Складка пространства! Вы провалились в щель между мирами и обнаружили забытое хранилище.",
        type: "reward",
        condition: (g) => g.realmIndex >= 11,
        effect: (g) => {
            const stones = 70 + g.realmIndex * 15;
            g.stones += stones;
            g.pills += 5;
            return `+${stones} камней, +5 пилюль из межмирового хранилища`;
        }
    },
    {
        id: "heavenly_dao_erosion",
        text: "Небесное Дао давит на вас! Чем сильнее вы становитесь, тем больше оно пытается стереть ваше существование.",
        type: "danger",
        condition: (g) => g.realmIndex >= 12,
        effect: (g) => {
            if (g.spirit >= 80 + g.realmIndex * 10) {
                g.strength += 2;
                g.spirit += 1;
                return "+2 сила, +1 дух. Вы выдержали давление Небесного Дао! Это закалило вашу волю.";
            }
            const loss = Math.floor(g.qi * 0.25);
            g.qi = Math.max(0, g.qi - loss);
            g.strength = Math.max(1, g.strength - 1);
            return `-${loss} ци, -1 сила. Давление Небесного Дао разрушительно.`;
        }
    },
    {
        id: "reincarnation_memory",
        text: "Во время медитации вы ощутили отголоски чужих жизней. Может быть, ваших прошлых воплощений?",
        type: "event",
        condition: (g) => g.realmIndex >= 10,
        effect: (g) => {
            g.spirit += 1;
            g.strength += 1;
            return "+1 дух, +1 сила. Эхо прошлых жизней принесло крупицы опыта.";
        }
    },

    // === СЛУХИ О ПРИКЛЮЧЕНИЯХ ===
    {
        id: "rumor_fallen_immortal",
        text: "Небо раскололось над Пиком Девяти Драконов. Пространственная рябь не исчезает — старейшины шепчутся: «Осколок Небесного Дворца...»",
        type: "event",
        condition: (g) => g.realmIndex >= 9 && Math.random() < 0.20
            && !g.adventureRumors.find(r => r.id === "fallen_immortal")
            && !g.activeAdventures.find(a => a.id === "fallen_immortal"),
        effect: (g) => {
            return g.addAdventureRumor("fallen_immortal") ? "Новый слух! Проверьте вкладку Приключения." : "";
        }
    },
    {
        id: "rumor_oblivion_gate",
        text: "На краю мира появилась трещина, из которой сочится тьма. Те, кто подходил близко, забывали своё имя. Старейшины назвали её Вратами Забвения.",
        type: "event",
        condition: (g) => g.realmIndex >= 9 && Math.random() < 0.20
            && !g.adventureRumors.find(r => r.id === "oblivion_gate")
            && !g.activeAdventures.find(a => a.id === "oblivion_gate"),
        effect: (g) => {
            return g.addAdventureRumor("oblivion_gate") ? "Новый слух! Проверьте вкладку Приключения." : "";
        }
    },
);
