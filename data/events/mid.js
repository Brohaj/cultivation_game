// ============================================================
// EVENTS/MID.JS — Средний тир (реалм 4-8)
// ============================================================

EVENTS.push(
    // === Филлер: тень демона ===
    {
        id: "demon_shadow_flicker",
        text: "Во время медитации — холод в груди. Тень шевельнулась за закрытыми веками. Чужой голос шепнул ваше имя. Вы открыли глаза — ничего. Тишина. Сердце колотится.",
        type: "event",
        condition: (g) => g.getEffectiveDemonChance() > 0,
        effect: () => "Просто тень. Пока — просто тень."
    },

    // === СРЕДНИЙ ТИР (реалм 4-7) ===
    {
        id: "sect_barrier_breach",
        text: "Вы почувствовали вибрацию защитной формации секты — кто-то пытается прорвать барьер!",
        type: "danger",
        condition: (g) => g.realmIndex >= 4 && g.realmIndex <= 7,
        effect: (g) => {
            if (g.getCombatPower() >= 15 + g.realmIndex * 5) {
                const reward = 10 + g.realmIndex * 5;
                g.stones += reward;
                g.flags.wonCombat = true;
                return `Вы отразили вторжение! +${reward} камней`;
            }
            const loss = Math.floor(g.qi * 0.15);
            g.qi = Math.max(0, g.qi - loss);
            return `Враг прорвался. Вы получили ранения. -${loss} ци`;
        }
    },
    {
        id: "heavenly_auction",
        text: "Небесный Аукцион открыл двери! Культиваторы со всего региона торгуются за редкости.",
        type: "event",
        condition: (g) => g.realmIndex >= 4 && g.realmIndex <= 8 && g.stones >= 20,
        effect: (g) => {
            g.stones -= 20;
            g.pills += 4;
            g.spirit += 1;
            return "-20 камней, +4 пилюли, +1 дух — удачные торги!";
        }
    },
    {
        id: "high_beast_attack",
        text: "Демонический зверь уровня Формирования Души напал на окрестности! Его аура подавляет всё живое.",
        type: "danger",
        condition: (g) => g.realmIndex >= 4 && g.realmIndex <= 7,
        effect: (g) => {
            if (g.getCombatPower() >= 20 + g.realmIndex * 6) {
                const reward = 15 + g.realmIndex * 4;
                g.stones += reward;
                g.pills += 2;
                g.flags.wonCombat = true;
                return `Вы сразили зверя! +${reward} камней, +2 пилюли из его ядра`;
            }
            const loss = Math.floor(g.qi * 0.25);
            g.qi = Math.max(0, g.qi - loss);
            return `Вы едва спаслись от зверя. -${loss} ци`;
        }
    },
    {
        id: "ancient_ruins_explore",
        text: "Вы наткнулись на руины древней секты, уничтоженной тысячелетия назад. Внутри ещё витает остаточная ци.",
        type: "reward",
        condition: (g) => g.realmIndex >= 4 && g.realmIndex <= 8,
        effect: (g) => {
            const bonus = eventQiBonus(g,0.15);
            g.qi += bonus;
            const stones = 10 + Math.floor(g.luck * 3);
            g.stones += stones;
            return `+${bonus} ци из остаточных формаций, +${stones} камней среди руин`;
        }
    },
    {
        id: "void_cultivator_duel",
        text: "Культиватор Слияния с Пустотой бросил вам вызов! Его глаза пусты, как сама Бездна.",
        type: "danger",
        condition: (g) => g.realmIndex >= 5 && g.realmIndex <= 8,
        effect: (g) => {
            if (g.getCombatPower() >= 30 + g.realmIndex * 8) {
                g.strength += 1;
                g.spirit += 1;
                g.flags.wonCombat = true;
                return "Вы победили! Его техника впечатлила вас. +1 сила, +1 дух";
            }
            const loss = Math.floor(g.qi * 0.3);
            g.qi = Math.max(0, g.qi - loss);
            g.strength += 1;
            return `Поражение. Но урок усвоен. -${loss} ци, +1 сила`;
        }
    },

    // === СРЕДНИЙ ТИР (доп. события) ===
    {
        id: "inner_world_glimpse",
        text: "Во время медитации вы на мгновение заглянули внутрь себя — и увидели бескрайнее пространство. Ваш внутренний мир растёт.",
        type: "reward",
        condition: (g) => g.realmIndex >= 4 && g.realmIndex <= 7,
        effect: (g) => {
            const bonus = eventQiBonus(g,0.12);
            g.qi += bonus;
            g.spirit += 1;
            return `+${bonus} ци, +1 дух`;
        }
    },
    {
        id: "rogue_cultivator_trade",
        text: "Бродячий культиватор предложил обмен: его редкие минералы за ваши пилюли.",
        type: "event",
        condition: (g) => g.realmIndex >= 4 && g.realmIndex <= 8 && g.pills >= 3,
        effect: (g) => {
            g.pills -= 3;
            const stones = 15 + Math.floor(g.luck * 2);
            g.stones += stones;
            return `-3 пилюли, +${stones} камней. Справедливый обмен.`;
        }
    },
    {
        id: "dao_enlightenment_flash",
        text: "Наблюдая за падением листа, вы внезапно осознали нечто о природе движения. Озарение длилось мгновение, но его хватило.",
        type: "reward",
        condition: (g) => g.realmIndex >= 4 && g.realmIndex <= 8,
        effect: (g) => {
            const bonus = eventQiBonus(g,0.08);
            g.qi += bonus;
            return `+${bonus} ци от мгновенного озарения`;
        }
    },
    {
        id: "demon_cultivator_ambush",
        text: "Демонический культиватор подстерёг вас на горной тропе! Его глаза горят красным, от тела исходит смрад крови.",
        type: "danger",
        condition: (g) => g.realmIndex >= 4 && g.realmIndex <= 8,
        effect: (g) => {
            const power = 18 + g.realmIndex * 6;
            if (g.getCombatPower() >= power) {
                const reward = 12 + g.realmIndex * 4;
                g.stones += reward;
                g.strength += 1;
                g.flags.wonCombat = true;
                return `Вы очистили мир от скверны! +${reward} камней, +1 сила`;
            }
            const loss = Math.floor(g.qi * 0.2);
            g.qi = Math.max(0, g.qi - loss);
            return `Еле вырвались! -${loss} ци. Нужно быть осторожнее.`;
        }
    },
    {
        id: "ancient_formation_study",
        text: "В горах вы наткнулись на древнюю формацию. Она давно угасла, но её узоры всё ещё можно прочесть.",
        type: "reward",
        condition: (g) => g.realmIndex >= 5 && g.realmIndex <= 8,
        effect: (g) => {
            g.spirit += 1;
            const bonus = eventQiBonus(g,0.06);
            g.qi += bonus;
            return `+1 дух, +${bonus} ци. Мудрость древних — лучший учитель.`;
        }
    },
    {
        id: "pill_tribulation",
        text: "Вы нашли пилюлю в заброшенной печи. Она фонит остаточной энергией Небесной Кары — рискнуть?",
        type: "danger",
        condition: (g) => g.realmIndex >= 5 && g.realmIndex <= 9,
        effect: (g) => {
            if (g.spirit >= 10 + g.realmIndex * 2) {
                g.pills += 3;
                g.strength += 1;
                return "+3 пилюли, +1 сила. Риск окупился!";
            }
            const loss = Math.floor(g.qi * 0.15);
            g.qi = Math.max(0, g.qi - loss);
            return `-${loss} ци. Пилюля оказалась слишком нестабильной!`;
        }
    },

    // === СЛУХИ О ПРИКЛЮЧЕНИЯХ ===
    {
        id: "rumor_ancient_tomb",
        text: "Землетрясение обнажило древние руины на окраине. Знаки на камнях указывают на гробницу великого культиватора.",
        type: "event",
        condition: (g) => g.realmIndex >= 5 && Math.random() < 0.20
            && !g.adventureRumors.find(r => r.id === "ancient_tomb")
            && !g.activeAdventures.find(a => a.id === "ancient_tomb"),
        effect: (g) => {
            return g.addAdventureRumor("ancient_tomb") ? "Новый слух! Проверьте вкладку Приключения." : "";
        }
    },
    {
        id: "rumor_demon_lair",
        text: "Алые молнии бьют из-под земли у Чёрного Утёса. Старейшины говорят — это Бездна Кровавой Луны открылась.",
        type: "event",
        condition: (g) => g.realmIndex >= 7 && Math.random() < 0.20
            && !g.adventureRumors.find(r => r.id === "demon_lair")
            && !g.activeAdventures.find(a => a.id === "demon_lair"),
        effect: (g) => {
            return g.addAdventureRumor("demon_lair") ? "Новый слух! Проверьте вкладку Приключения." : "";
        }
    },
    {
        id: "rumor_mirror_lake",
        text: "Рыбак вернулся с озера в горах седым за одну ночь. Твердит одно: «Вода показала мне меня — но это был не я...»",
        type: "event",
        condition: (g) => g.realmIndex >= 5 && Math.random() < 0.20
            && !g.adventureRumors.find(r => r.id === "mirror_lake")
            && !g.activeAdventures.find(a => a.id === "mirror_lake"),
        effect: (g) => {
            return g.addAdventureRumor("mirror_lake") ? "Новый слух! Проверьте вкладку Приключения." : "";
        }
    },
    {
        id: "rumor_tribulation_trial",
        text: "На Пике Девяти Молний молнии бьют без остановки уже третий месяц. Говорят, там открылось Испытание Небес — войти может каждый, выйти — лишь достойный.",
        type: "event",
        condition: (g) => g.realmIndex >= 7 && Math.random() < 0.20
            && !g.adventureRumors.find(r => r.id === "tribulation_trial")
            && !g.activeAdventures.find(a => a.id === "tribulation_trial"),
        effect: (g) => {
            return g.addAdventureRumor("tribulation_trial") ? "Новый слух! Проверьте вкладку Приключения." : "";
        }
    },
);
