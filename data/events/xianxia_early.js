// ============================================================
// EVENTS/XIANXIA_EARLY.JS — Новые события в стиле xianxia (реалм 0-4)
// Чеки через _eventCheck(stat, порог): 85-95% шанс
// ============================================================

EVENTS.push(
    // --- 1. Аукцион мелких сокровищ ---
    {
        id: "small_auction",
        text: "На обочине дороги расставлены лотки — мелкий аукцион бродячих торговцев. Среди хлама блеснуло что-то интересное.",
        type: "reward",
        condition: (g) => g.realmIndex >= 1 && g.realmIndex <= 4 && g.stones >= 10,
        effect: (g) => {
            g.stones -= 10;
            const totalLuck = g.luck + g.getArtifactBonus("luck") + g.getFormationBonus("luck");
            if (totalLuck >= 10 && Math.random() < 0.4) {
                const art = g.generateArtifact("common");
                if (art && g.addArtifact(art)) {
                    return `-10 камней. Среди хлама оказался артефакт! ${art.name}`;
                }
            }
            g.pills += 2;
            return "-10 камней, +2 пилюли. Неплохая находка среди барахла.";
        }
    },

    // --- 2. Надменный молодой мастер ---
    {
        id: "arrogant_young_master",
        text: "Разряженный юнец в шёлковых одеждах перегородил вам дорогу. «На колени, деревенщина! Ты стоишь на пути наследника рода Лю!» Его охранники ухмыляются за спиной.",
        type: "danger",
        condition: (g) => g.realmIndex >= 1 && g.realmIndex <= 4,
        effect: (g) => {
            const threshold = 5 + g.realmIndex * 8;
            if (_eventCheck(g.getCombatPower(), threshold)) {
                const stones = 8 + Math.floor(Math.random() * 8);
                g.stones += stones;
                g.luck += 1;
                return `Один удар — и «наследник» катится по земле. Охранники разбежались. +${stones} камней, +1 удача`;
            }
            const loss = Math.floor(g.qi * 0.15);
            g.qi = Math.max(0, g.qi - loss);
            g.spirit += 1;
            return `Охранники оказались крепче, чем выглядели. Унижение обжигает, но закаляет дух. -${loss} ци, +1 дух`;
        }
    },

    // --- 3. Сломанная духовная жила ---
    {
        id: "broken_meridian",
        text: "Во время утренней медитации что-то хрустнуло внутри. Один из меридианов треснул — боль пронзила тело. Но по мере заживления канал стал шире, чем прежде.",
        type: "event",
        condition: (g) => g.realmIndex >= 2 && g.realmIndex <= 4 && g.qi >= g.qiNeeded() * 0.1,
        effect: (g) => {
            const loss = Math.floor(g.qi * 0.10);
            g.qi = Math.max(0, g.qi - loss);
            g.strength += 2;
            return `-${loss} ци (шок от травмы), +2 сила (меридиан расширился). Что не убивает — делает сильнее.`;
        }
    },

    // --- 4. Бродячий лекарь ---
    {
        id: "wandering_physician",
        text: "Оборванный старик с тыквой-горлянкой покачивался на дороге. «Дай-ка пульс проверю, молодёжь...» Не дожидаясь ответа, он ткнул иглой вам в шею. Удивительно, но стало легче.",
        type: "reward",
        condition: (g) => g.realmIndex <= 3 && !g.flags.wandering_physician,
        effect: (g) => {
            g.flags.wandering_physician = true;
            g.spirit += 1;
            const qiGain = eventQiBonus(g,0.05);
            g.qi = Math.min(g.qi + qiGain, g.qiNeeded());
            return `+1 дух, +${qiGain} ци. Старик исчез, оставив запах вина и трав. Кто он?`;
        }
    },

    // --- 5. Испытание водопадом ---
    {
        id: "waterfall_trial",
        text: "Грохочущий водопад обрушивается со скалы. Духовная энергия бьёт по телу как молот. Другие культиваторы давно отступили. Вы входите в поток.",
        type: "danger",
        condition: (g) => g.realmIndex >= 1 && g.realmIndex <= 4,
        effect: (g) => {
            const threshold = 5 + g.realmIndex * 8;
            if (_eventCheck(g.strength, threshold)) {
                g.strength += 2;
                const qiGain = eventQiBonus(g,0.08);
                g.qi = Math.min(g.qi + qiGain, g.qiNeeded());
                return `Тело выдержало! Мышцы стали как сталь. +2 сила, +${qiGain} ци`;
            }
            const loss = Math.floor(g.qi * 0.15);
            g.qi = Math.max(0, g.qi - loss);
            g.strength += 1;
            return `Водопад сбил вас с ног. Но даже поражение закалило тело. -${loss} ци, +1 сила`;
        }
    },

    // --- 6. Нефритовая красавица в беде ---
    {
        id: "jade_beauty_rescue",
        text: "Девушка в белых одеждах мчится по тропе, за ней — трое в чёрном. Кровь на рукаве, в глазах — отчаяние. Ваши взгляды встретились.",
        type: "danger",
        condition: (g) => g.realmIndex >= 2 && g.realmIndex <= 5,
        effect: (g) => {
            const combatThreshold = 10 + g.realmIndex * 8;
            const spiritThreshold = 8 + g.realmIndex * 6;
            if (_eventCheck(g.getCombatPower(), combatThreshold)) {
                g.luck += 1;
                g.spirit += 1;
                const stones = 5 + Math.floor(Math.random() * 6);
                g.stones += stones;
                g.flags.jade_beauty_saved = true;
                return `Вы встали на пути преследователей. Бой был коротким. «Моя жизнь — ваш долг.» +1 удача, +1 дух, +${stones} камней`;
            }
            if (_eventCheck(g.spirit + g.getArtifactBonus("spirit"), spiritThreshold)) {
                g.spirit += 1;
                g.flags.jade_beauty_saved = true;
                return `Вы отвлекли преследователей иллюзией, пока она скрылась. Благодарный взгляд через плечо. +1 дух`;
            }
            return "Вы шагнули вперёд, но силы не хватило. Преследователи оттолкнули вас и скрылись. Горечь бессилия.";
        }
    },

    // --- 7. Ядовитое болото ---
    {
        id: "poison_swamp",
        text: "Миазмы ядовитого болота обжигают лёгкие. Ци утекает с каждым вдохом. Но в центре, среди гнили, пульсирует светящийся корень — Трава Девяти Ядов.",
        type: "danger",
        condition: (g) => g.realmIndex >= 2 && g.realmIndex <= 5,
        effect: (g) => {
            const threshold = 8 + g.realmIndex * 6;
            if (_eventCheck(g.spirit + g.getArtifactBonus("spirit"), threshold)) {
                g.pills += 3;
                const qiGain = eventQiBonus(g,0.05);
                g.qi = Math.min(g.qi + qiGain, g.qiNeeded());
                return `Духовный щит удержал яд. Вы добыли корень! +3 пилюли, +${qiGain} ци`;
            }
            const loss = Math.floor(g.qi * 0.20);
            g.qi = Math.max(0, g.qi - loss);
            g.pills += 1;
            return `Яд проник в меридианы. Схватили лишь обрывок корня. -${loss} ци, +1 пилюля`;
        }
    },

    // --- 8. Каменная стела предка ---
    {
        id: "ancestor_stele",
        text: "В горном ущелье — каменная стела, покрытая древними иероглифами. Они мерцают, когда вы подходите. Слова текут в разум: формулы, которым тысячи лет.",
        type: "reward",
        condition: (g) => g.realmIndex >= 1 && g.realmIndex <= 4,
        effect: (g) => {
            const qiGain = eventQiBonus(g,0.10);
            g.qi = Math.min(g.qi + qiGain, g.qiNeeded());
            g.spirit += 1;
            return `Древняя мудрость впиталась в сознание. +${qiGain} ци, +1 дух`;
        }
    },

    // --- 9. Проигранное пари ---
    {
        id: "qi_dice_gamble",
        text: "Улыбчивый культиватор с ци-костями подмигнул: «Ставлю 15 камней! Удвоим или ничего, друг?» Кости светятся духовной энергией.",
        type: "event",
        condition: (g) => g.realmIndex >= 1 && g.realmIndex <= 5 && g.stones >= 15,
        effect: (g) => {
            g.stones -= 15;
            const totalLuck = g.luck + g.getArtifactBonus("luck") + g.getFormationBonus("luck");
            if (_eventCheck(totalLuck, 8)) {
                g.stones += 30;
                return "Кости упали в вашу пользу! +15 камней чистой прибыли. Улыбчивый сплюнул и ушёл.";
            }
            g.spirit += 1;
            return "-15 камней. Кости не на вашей стороне. Урок стоит дороже камней. +1 дух";
        }
    },

    // --- 10. Опустевший рынок духов ---
    {
        id: "abandoned_spirit_market",
        text: "Заброшенный рынок духовных товаров. Прилавки перевёрнуты, шатры изодраны. Но среди обломков что-то поблёскивает.",
        type: "reward",
        condition: (g) => g.realmIndex >= 2 && g.realmIndex <= 5,
        effect: (g) => {
            const roll = Math.random();
            if (roll < 0.35) {
                const stones = 5 + Math.floor(Math.random() * 11);
                g.stones += stones;
                return `Мешочек с камнями под сломанным прилавком. +${stones} камней`;
            } else if (roll < 0.65) {
                const pills = 1 + Math.floor(Math.random() * 3);
                g.pills += pills;
                return `Коробка с пилюлями, чудом уцелевшая. +${pills} ${_plural(pills, "пилюля", "пилюли", "пилюль")}`;
            } else {
                const dust = 5 + Math.floor(Math.random() * 6);
                g.artifactDust += dust;
                return `Рассыпавшийся артефакт оставил пыль. +${dust} пыли`;
            }
        }
    },

    // --- Эхо: Лис из каравана ---
    {
        id: "fox_demon_echo",
        text: "На рыночной площади вы заметили лису с серебристой шерстью. Она сидела на крыше, наблюдая за толпой. Ваши взгляды встретились. Лиса моргнула — и исчезла.",
        type: "event",
        condition: (g) => g.realmIndex >= 3 && g.realmIndex <= 7 && (g.completedAdventures || []).includes("lost_caravan") && !g.flags.fox_echo,
        effect: (g) => {
            g.flags.fox_echo = true;
            return "Тот самый лис? Или другой? Демоны-лисы помнят лица.";
        }
    }
);
