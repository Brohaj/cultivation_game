// ============================================================
// EVENTS/EARLY.JS — Ранние события (реалм 0-7)
// Награды, нейтральные, опасности, находки техник
// ============================================================

EVENTS.push(
    // --- Награды ---
    {
        id: "herbalist_gift",
        text: "Старый травник на рынке узнал в вас культиватора и бесплатно отдал пучок духовных трав.",
        type: "reward",
        condition: (g) => g.realmIndex <= 3,
        effect: (g) => { g.pills += 1; return "+1 пилюля"; }
    },
    {
        id: "caravan_guard",
        text: "Торговый караван нуждался в охране через Перевал Костей. Вы вызвались.",
        type: "reward",
        condition: (g) => g.realmIndex <= 4 && !g.flags.caravan_ally,
        effect: (g) => {
            const name = _rname();
            const threshold = 3 + g.realmIndex * 3;
            if (_eventCheck(g.getCombatPower(), threshold)) {
                const amount = 5 + Math.floor(Math.random() * 6);
                g.stones += amount;
                g.flags.wonCombat = true;
                g.flags.caravan_ally = true;
                g.flags.caravan_ally_year = g.years;
                g.flags.caravan_ally_name = name;
                return `Караван доставлен! Торговец ${name} пожал вам руку: «Я вас запомню.» +${amount} камней`;
            }
            const amount = 2 + Math.floor(Math.random() * 3);
            g.stones += amount;
            return `Бандиты растащили часть груза, но вы спасли остальное. +${amount} камней. Торговец ${name} вздохнул и заплатил.`;
        }
    },
    {
        id: "caravan_ally_return",
        text: "На рынке вас окликнули: «Друг! Помнишь Перевал Костей?» Знакомый торговец, теперь в богатых одеждах, сияет: «Дела пошли в гору!»",
        type: "reward",
        condition: (g) => g.flags.caravan_ally && !g.flags.caravan_ally_returned && g.years - (g.flags.caravan_ally_year || 0) >= 30,
        effect: (g) => {
            g.flags.caravan_ally_returned = true;
            const name = g.flags.caravan_ally_name || "торговец";
            if (Math.random() < 0.5) {
                g.pills += 3;
                const stones = 5 + Math.floor(Math.random() * 6);
                g.stones += stones;
                return `${name} выложил на стол редкие пилюли и камни. «Половина цены для друга.» +3 пилюли, +${stones} камней`;
            }
            const stones = 15 + Math.floor(Math.random() * 11);
            const dust = 5 + Math.floor(Math.random() * 6);
            g.stones += stones;
            g.artifactDust += dust;
            return `${name} развернул карту: «Тайник моего деда — координаты внутри.» +${stones} камней, +${dust} пыли`;
        }
    },
    {
        id: "stone_vein",
        text: "Во время прогулки по лесу вы наткнулись на жилу духовных камней у ручья!",
        type: "reward",
        condition: (g) => g.realmIndex <= 6,
        effect: (g) => {
            const amount = 5 + Math.floor(g.luck * 2 * Math.random());
            g.stones += amount;
            return `+${amount} духовных камней`;
        }
    },
    {
        id: "elder_advice",
        text: "Сгорбленный старик тащил мешки по горной тропе. Вы помогли донести. Он поблагодарил и сказал нечто странное о течении ци.",
        type: "reward",
        condition: (g) => g.realmIndex <= 4 && !g.flags.elder_kindness,
        effect: (g) => {
            g.spirit += 1;
            g.flags.elder_kindness = true;
            g.flags.elder_kindness_year = g.years;
            g.flags.elder_kindness_name = _rname();
            return "+1 дух. Совет казался простым, но что-то в его словах засело в голове.";
        }
    },
    {
        id: "elder_patriarch_reveal",
        text: "На площади секты вы увидели знакомое лицо — тот самый «старик» с мешками! Но теперь он в церемониальных одеждах, и от него исходит давление, от которого колени подгибаются.",
        type: "reward",
        condition: (g) => g.flags.elder_kindness && !g.flags.elder_patriarch_done && g.years - (g.flags.elder_kindness_year || 0) >= 40,
        effect: (g) => {
            g.flags.elder_patriarch_done = true;
            const elderName = g.flags.elder_kindness_name || "Патриарх";
            const totalSpirit = g.spirit + g.getArtifactBonus("spirit");
            if (_eventCheck(totalSpirit, 6 + g.realmIndex * 5)) {
                const essence = 8 + g.realmIndex * 3;
                g.daoEssence += essence;
                g.spirit += 1;
                // Озарение: +10% xp ко всем техникам
                for (const techId of g.techniques) {
                    const needed = g.techXpNeeded(techId);
                    g.techXP[techId] = (g.techXP[techId] || 0) + needed * 0.10;
                }
                return `${elderName} усмехнулся: «Единственный, кто помог. Остальные прошли мимо.» Он коснулся вашего лба — знания хлынули потоком. +1 дух, +${essence} эссенции, +10% XP ко всем техникам`;
            }
            g.spirit += 1;
            return `${elderName} кивнул вам издалека и ушёл. Связь не раскрыта. Но +1 дух от осознания, кому вы помогали.`;
        }
    },
    {
        id: "pill_shop",
        text: "В тёмном переулке ночного рынка — лавка, которой вчера не было. За прилавком — старуха с хитрыми глазами. «Пилюли, юный? Лучшие в городе. Пять камней.»",
        type: "reward",
        condition: (g) => g.stones >= 5 && g.realmIndex <= 5 && !g.flags.met_granny,
        effect: (g) => {
            g.stones -= 5;
            const name = "Бабушка " + _EVENT_SURNAMES[Math.floor(Math.random() * _EVENT_SURNAMES.length)];
            g.flags.met_granny = true;
            g.flags.met_granny_year = g.years;
            g.flags.met_granny_name = name;
            const totalLuck = g.luck + g.getArtifactBonus("luck") + g.getFormationBonus("luck");
            if (_eventCheck(totalLuck, 5)) {
                g.pills += 3;
                const qiGain = eventQiBonus(g,0.05);
                g.qi = Math.min(g.qi + qiGain, g.qiNeeded());
                return `-5 камней, +3 пилюли. ${name} подмигнула: «Медитируй на рассвете, юный.» +${qiGain} ци`;
            }
            g.pills += 1;
            return `-5 камней, +1 пилюля. На вкус как мел. «Не нравится — не ешь!» — каркнула старуха.`;
        }
    },
    {
        id: "granny_return",
        text: "Знакомая лавка в переулке! Та самая старуха совсем не изменилась за десятилетия. «А, ты! Помню-помню. Сегодня кое-что особенное...»",
        type: "reward",
        condition: (g) => g.flags.met_granny && !g.flags.granny_special && g.years - (g.flags.met_granny_year || 0) >= 40,
        effect: (g) => {
            g.flags.granny_special = true;
            const name = g.flags.met_granny_name || "Старуха";
            if (g.pills >= 10) {
                // Если много обычных — дать очищенную
                g.refinedPills = (g.refinedPills || 0) + 1;
                return `${name} протянула мерцающую пилюлю. «Обычные у тебя есть. Эта — другого уровня.» +1 очищенная пилюля. ${name} исчезла вместе с лавкой к утру.`;
            }
            g.pills += 3;
            return `«Возьми, пригодится.» +3 пилюли. ${name} исчезла вместе с лавкой к утру.`;
        }
    },
    {
        id: "lake_meditation",
        text: "Горное озеро — гладкое, как нефрит. Ни ветерка. Вы сели на берегу и закрыли глаза. Ци потекла сама — от воды, от камней, от неба.",
        type: "reward",
        condition: (g) => g.realmIndex <= 6,
        effect: (g) => {
            const bonus = eventQiBonus(g,0.12);
            g.qi = Math.min(g.qi + bonus, g.qiNeeded());
            return `+${bonus} ци. Когда вы открыли глаза, прошло три дня.`;
        }
    },
    {
        id: "monk_technique",
        text: "Босой монах в заплатанной рясе сидел на камне у развилки. Когда вы прошли мимо, он произнёс одну фразу — и ваше дыхание само выровнялось. Вы обернулись, но камень был пуст.",
        type: "reward",
        condition: (g) => g.realmIndex <= 5,
        effect: (g) => {
            g.spirit += 1;
            const bonus = eventQiBonus(g,0.05);
            g.qi = Math.min(g.qi + bonus, g.qiNeeded());
            return `+1 дух, +${bonus} ци`;
        }
    },
    {
        id: "hermit_master",
        text: "Вы нашли раненого путника и помогли ему. Он оказался скрытым мастером!",
        type: "reward",
        condition: (g) => g.realmIndex <= 6 && !g.flags.helped_hermit,
        effect: (g) => {
            g.strength += 1; g.spirit += 1;
            g.flags.helped_hermit = true;
            g.flags.helped_hermit_year = g.years;
            return "+1 сила, +1 дух — мастер показал вам боевые приёмы. «Я запомню эту доброту.»";
        }
    },
    {
        id: "hermit_master_return",
        text: "На горной тропе вас окликнул знакомый голос. Тот самый путник — но теперь его аура давит как гора. «Я говорил, что запомню. Пришло время отплатить.»",
        type: "reward",
        condition: (g) => g.flags.helped_hermit && !g.flags.hermit_returned && g.years - (g.flags.helped_hermit_year || 0) >= 50,
        effect: (g) => {
            g.flags.hermit_returned = true;
            const totalSpirit = g.spirit + g.getArtifactBonus("spirit");
            if (_eventCheck(totalSpirit, 8 + g.realmIndex * 6)) {
                // Spirit-чек: техника
                const unlearned = TECHNIQUES.filter(t =>
                    !g.hasTechnique(t.id) && t.source !== "sect" &&
                    ["common", "uncommon", "rare"].includes(t.tier) &&
                    (!t.requirement || !t.requirement.realm || g.realmIndex >= t.requirement.realm)
                );
                if (unlearned.length > 0) {
                    const tech = unlearned[Math.floor(Math.random() * unlearned.length)];
                    g.learnTechnique(tech.id);
                    return `Мастер передал вам технику: ${tech.name}! «Используй с умом.»`;
                }
                g.spirit += 2;
                return "Мастер обучал вас три дня. +2 дух. «Техники у тебя уже хватает. Вот мудрость.»";
            }
            // Провал spirit-чека: артефакт
            const art = g.generateArtifact(g.realmIndex >= 4 ? "uncommon" : "common");
            if (art && g.addArtifact(art)) {
                return `Мастер покачал головой: «Ты ещё не готов к моим техникам. Возьми это.» ${art.name}`;
            }
            g.stones += 20;
            return "Мастер оставил мешочек с камнями. «Тренируйся усерднее.» +20 камней";
        }
    },
    {
        id: "lightning_minerals",
        text: "Небесная молния ударила в скалу! В расщелине блестят редкие минералы.",
        type: "reward",
        condition: (g) => g.realmIndex >= 3,
        effect: (g) => {
            const amount = 15 + Math.floor(g.luck * 3);
            g.stones += amount;
            return `+${amount} духовных камней`;
        }
    },
    {
        id: "spirit_cave",
        text: "Вы почувствовали зов из глубины горы — пещера, пропитанная чистой ци!",
        type: "reward",
        condition: (g) => g.realmIndex >= 5,
        effect: (g) => {
            const bonus = eventQiBonus(g,0.2);
            g.qi += bonus;
            g.pills += 3;
            return `+${bonus} ци, +3 пилюли`;
        }
    },

    // --- Награды (дополнительные) ---
    {
        id: "wandering_dao_singer",
        text: "У реки сидел слепой старик с бамбуковой флейтой. Мелодия текла как вода — ваша ци сама начала двигаться в ритм, очищая меридианы один за другим.",
        type: "reward",
        condition: (g) => g.realmIndex >= 1 && g.realmIndex <= 5,
        effect: (g) => {
            const bonus = eventQiBonus(g,0.07);
            g.qi = Math.min(g.qi + bonus, g.qiNeeded());
            g.spirit += 1;
            return `+${bonus} ци, +1 дух`;
        }
    },
    {
        id: "fallen_star_fragment",
        text: "Ночью с неба упал метеорит! Осколок светился духовной энергией. В его сиянии мелькнули образы...",
        type: "reward",
        condition: (g) => g.realmIndex >= 2 && g.realmIndex <= 7,
        effect: (g) => {
            const stones = 8 + Math.floor(g.luck * 2);
            g.stones += stones;
            const totalSpirit = g.spirit + g.getArtifactBonus("spirit");
            if (_eventCheck(totalSpirit, 6 + g.realmIndex * 4) && !g.flags.star_prophecy) {
                // Определить следующую эпоху
                const currentEra = g.getCurrentEra();
                const nextEra = ERAS.find(e => e.startYear > g.years);
                if (nextEra) {
                    g.flags.star_prophecy = true;
                    g.flags.star_prophecy_era = nextEra.id;
                    g.spirit += 1;
                    return `+${stones} камней. В осколке вы увидели будущее: звёзды шепчут о грядущей эпохе — «${nextEra.name}». +1 дух`;
                }
            }
            return `+${stones} духовных камней из осколка небесного тела`;
        }
    },
    {
        id: "star_prophecy_fulfilled",
        text: "Вы вспомнили видение из метеорита — оно сбылось! Эпоха сменилась именно так, как предсказывали звёзды. Знание будущего дало вам преимущество.",
        type: "reward",
        condition: (g) => {
            if (!g.flags.star_prophecy || g.flags.star_prophecy_claimed) return false;
            const currentEra = g.getCurrentEra();
            return currentEra && currentEra.id === g.flags.star_prophecy_era;
        },
        effect: (g) => {
            g.flags.star_prophecy_claimed = true;
            g.luck += 2;
            g.spirit += 1;
            const stones = 15 + Math.floor(g.luck * 3);
            g.stones += stones;
            const essence = 10 + g.realmIndex * 3;
            g.daoEssence += essence;
            return `Пророчество сбылось! Вы были готовы. +2 удача, +1 дух, +${stones} камней, +${essence} эссенции`;
        }
    },
    {
        id: "spirit_spring",
        text: "Тысячелетний дуб раздвинул корни, и из-под земли ударил родник. Вода светится изнутри — настоящий Духовный Источник. Вы пьёте жадно. Каждый глоток — как пилюля.",
        type: "reward",
        condition: (g) => g.realmIndex >= 1 && g.realmIndex <= 6,
        effect: (g) => {
            g.pills += 1;
            const bonus = eventQiBonus(g,0.05);
            g.qi = Math.min(g.qi + bonus, g.qiNeeded());
            return `+1 пилюля, +${bonus} ци`;
        }
    },
    {
        id: "old_cultivator_grave",
        text: "На заброшенном кладбище — одинокая могила. Надпись почти стёрта временем. Рядом — мешочек с камнями и записка.",
        type: "reward",
        condition: (g) => g.realmIndex >= 2 && g.realmIndex <= 7,
        effect: (g) => {
            const stones = 6 + g.realmIndex * 2;
            g.stones += stones;
            g.spirit += 1;
            const name = _rname();
            return `Записка: «Я, ${name}, не дошёл. Дойди ты.» +${stones} камней, +1 дух`;
        }
    },
    {
        id: "qi_rain",
        text: "Пошёл редкий Духовный Дождь! Капли пропитаны ци. Вы раскинули руки и впитали влагу всем телом.",
        type: "reward",
        condition: (g) => g.realmIndex >= 3 && g.realmIndex <= 8,
        effect: (g) => {
            const bonus = eventQiBonus(g,0.1);
            g.qi += bonus;
            return `+${bonus} ци от Духовного Дождя`;
        }
    },

    // --- Нейтральные ---
    {
        id: "cultivator_tea",
        text: "Костёр в лесу — группа странствующих культиваторов делит чай и истории. Один из них, седой мечник, жестом пригласил вас к огню.",
        type: "event",
        condition: (g) => g.realmIndex <= 6 && !g.flags.campfire_friend,
        effect: (g) => {
            const totalSpirit = g.spirit + g.getArtifactBonus("spirit");
            if (_eventCheck(totalSpirit, 4 + g.realmIndex * 3)) {
                g.spirit += 1;
                const qiGain = eventQiBonus(g,0.08);
                g.qi = Math.min(g.qi + qiGain, g.qiNeeded());
                g.flags.campfire_friend = true;
                g.flags.campfire_friend_year = g.years;
                const cfName = _rname();
                g.flags.campfire_friend_name = cfName;
                return `Вы обменялись знаниями о медитации. ${cfName} кивнул: «Ещё встретимся.» +1 дух, +${qiGain} ци`;
            }
            const qiGain = eventQiBonus(g,0.03);
            g.qi = Math.min(g.qi + qiGain, g.qiNeeded());
            return `Чай оказался крепким, истории — длинными. +${qiGain} ци`;
        }
    },
    {
        id: "campfire_sparring",
        text: "На горной дороге — знакомая фигура с мечом. Тот мечник у костра! Он возмужал, аура стала плотнее. «Помнишь меня? Давай проверим, кто вырос больше.»",
        type: "danger",
        condition: (g) => g.flags.campfire_friend && !g.flags.campfire_sparred && g.years - (g.flags.campfire_friend_year || 0) >= 60,
        effect: (g) => {
            g.flags.campfire_sparred = true;
            const sparName = g.flags.campfire_friend_name || "мечник";
            const threshold = 8 + g.realmIndex * 6;
            if (_eventCheck(g.getCombatPower(), threshold)) {
                g.strength += 2;
                return `Три обмена ударами — и ${sparName} отступил, смеясь: «Ты вырос!» +2 сила`;
            }
            g.strength += 1;
            return `${sparName} оказался быстрее. Меч остановился у горла. «Не расстраивайся. В следующий раз.» +1 сила`;
        }
    },
    {
        id: "tournament",
        text: "Городской Турнир Сотни Кулаков! Трибуны ревут, пыль столбом. Распорядитель выкрикивает: «Есть ещё желающие?!» Взгляды толпы обращаются к вам.",
        type: "event",
        condition: (g) => g.realmIndex <= 5,
        effect: (g) => {
            const threshold = 5 + g.realmIndex * 5;
            if (_eventCheck(g.getCombatPower(), threshold)) {
                g.strength += 2;
                g.luck += 1;
                const stones = 8 + Math.floor(Math.random() * 8);
                g.stones += stones;
                g.flags.wonCombat = true;
                return `Вы вышли на арену — и победили! Толпа скандирует! +2 сила, +1 удача, +${stones} камней (призовой фонд)`;
            }
            if (_eventCheck(g.getCombatPower(), threshold * 0.6)) {
                g.strength += 1;
                return "Вышли на арену, дошли до полуфинала. Достойное выступление. +1 сила";
            }
            g.spirit += 1;
            return "Решили понаблюдать из толпы. Приёмы бойцов впечатлили. +1 дух";
        }
    },
    {
        id: "ruins_rumor",
        text: "Старик у колодца схватил вас за рукав. «Руины в горах! Я видел свечение! Там сокровища, клянусь!» Глаза горят, руки дрожат. Вы запоминаете его слова.",
        type: "event",
        condition: (g) => g.realmIndex <= 5,
        effect: (g) => {
            const bonus = eventQiBonus(g,0.03);
            g.qi = Math.min(g.qi + bonus, g.qiNeeded());
            return `+${bonus} ци. Правда это или бред — но мысли о приключениях согрели душу.`;
        }
    },
    {
        id: "torn_scroll",
        text: "На дне заброшенного колодца — обрывок свитка. Иероглифы мерцают, но половина текста съедена временем. В голове вспыхивают обрывки понимания.",
        type: "event",
        condition: (g) => g.realmIndex <= 6 && !g.flags.scroll_fragment_1,
        effect: (g) => {
            const bonus = eventQiBonus(g,0.08);
            g.qi += bonus;
            g.flags.scroll_fragment_1 = true;
            g.flags.scroll_fragment_1_year = g.years;
            return `+${bonus} ци. Фрагмент бережно спрятан. Может, вторая половина ещё найдётся...`;
        }
    },
    {
        id: "torn_scroll_2",
        text: "В лавке старьёвщика вы заметили обрывок свитка с знакомыми иероглифами. Сердце ёкнуло — это вторая часть!",
        type: "event",
        condition: (g) => g.flags.scroll_fragment_1 && !g.flags.scroll_fragment_2 && g.years - (g.flags.scroll_fragment_1_year || 0) >= 50,
        effect: (g) => {
            g.flags.scroll_fragment_2 = true;
            const totalSpirit = g.spirit + g.getArtifactBonus("spirit");
            if (_eventCheck(totalSpirit, 5 + g.realmIndex * 5)) {
                const unlearned = TECHNIQUES.filter(t =>
                    !g.hasTechnique(t.id) && t.source !== "sect" &&
                    ["common", "uncommon"].includes(t.tier) &&
                    (!t.requirement || !t.requirement.realm || g.realmIndex >= t.requirement.realm)
                );
                if (unlearned.length > 0) {
                    const tech = unlearned[Math.floor(Math.random() * unlearned.length)];
                    g.learnTechnique(tech.id);
                    return `Две половины сложились! Текст ожил — это полная техника: ${tech.name}!`;
                }
                g.spirit += 2;
                return "Свиток собран, но техника вам уже знакома. Зато понимание углубилось. +2 дух";
            }
            g.spirit += 1;
            const essence = 5 + g.realmIndex * 2;
            g.daoEssence += essence;
            return `Свиток собран, но часть символов всё ещё не поддаётся. +1 дух, +${essence} эссенции`;
        }
    },
    {
        id: "golden_sky",
        text: "Небо на рассвете окрасилось в золотой цвет. Звери замолкли, ветер стих. Даже облака застыли. Старики шепчутся: знамение.",
        type: "event",
        condition: (g) => g.realmIndex <= 5,
        effect: (g) => {
            const totalSpirit = g.spirit + g.getArtifactBonus("spirit");
            if (_eventCheck(totalSpirit, 4 + g.realmIndex * 3)) {
                g.luck += 1;
                g.spirit += 1;
                const qiGain = eventQiBonus(g,0.08);
                g.qi = Math.min(g.qi + qiGain, g.qiNeeded());
                return `Вы медитировали в золотом свете. Небесное Дао коснулось вас на мгновение. +1 удача, +1 дух, +${qiGain} ци`;
            }
            g.luck += 1;
            return "+1 удача. Красиво, но смысл ускользнул.";
        }
    },
    {
        id: "mortal_funeral",
        text: "Похоронная процессия. Белые одежды, плач. Вы узнали лицо в гробу — торговец, у которого вы покупали первые пилюли. Он выглядел старым. Вы не изменились.",
        type: "event",
        condition: (g) => g.realmIndex >= 2 && g.realmIndex <= 7,
        effect: (g) => {
            g.spirit += 1;
            return "+1 дух. Смертные живут так быстро. Или это вы живёте так медленно?";
        }
    },
    {
        id: "children_playing",
        text: "Деревенские дети играли в «культиваторов», размахивая палками. Один подбежал: «Дядя, покажи настоящую технику!»",
        type: "event",
        condition: (g) => g.realmIndex >= 1 && g.realmIndex <= 4,
        effect: (g) => {
            g.luck += 1;
            const threshold = 3 + g.realmIndex * 3;
            if (_eventCheck(g.strength, threshold)) {
                g.strength += 1;
                const stones = 3 + Math.floor(Math.random() * 3);
                g.stones += stones;
                return `Вы показали простой приём. Дети визжали от восторга. Один протянул «сокровище» — камешек, который оказался духовным камнем! +1 сила, +1 удача, +${stones} камней`;
            }
            // XP бонус к случайной технике
            if (g.techniques.length > 0) {
                const tid = g.techniques[Math.floor(Math.random() * g.techniques.length)];
                const needed = g.techXpNeeded(tid);
                g.techXP[tid] = (g.techXP[tid] || 0) + needed * 0.05;
                const tech = TECHNIQUES.find(t => t.id === tid);
                return `Объясняя ребёнку базовые формы, вы вдруг поняли что-то о собственной технике. +1 удача, +5% XP к ${tech ? tech.name : "технике"}`;
            }
            return "+1 удача. Невинность — тоже форма Дао.";
        }
    },
    {
        id: "dao_debate",
        text: "Два культиватора спорят посреди площади. Один кричит: «Дао — это порядок!» Другой: «Дао — это хаос!» Толпа раскрыла рты. Вы задержались.",
        type: "event",
        condition: (g) => g.realmIndex >= 3 && g.realmIndex <= 8,
        effect: (g) => {
            const totalSpirit = g.spirit + g.getArtifactBonus("spirit");
            if (_eventCheck(totalSpirit, 5 + g.realmIndex * 3)) {
                g.spirit += 1;
                const bonus = eventQiBonus(g,0.06);
                g.qi = Math.min(g.qi + bonus, g.qiNeeded());
                return `Истина — посередине. Оба правы и оба ошибаются. Это понимание пронзило вас как молния. +1 дух, +${bonus} ци`;
            }
            const bonus = eventQiBonus(g,0.03);
            g.qi = Math.min(g.qi + bonus, g.qiNeeded());
            return `Голова гудит от чужих аргументов. Ничего не поняли, но задумались. +${bonus} ци`;
        }
    },
    {
        id: "strange_dream",
        text: "Вам приснился странный сон: бескрайнее море облаков, а вы стоите на вершине мира.",
        type: "event",
        condition: (g) => g.realmIndex >= 2 && g.realmIndex <= 8,
        effect: (g) => {
            // Разные сны в зависимости от состояния
            if (g.qi >= g.qiNeeded() * 0.5) {
                const bonus = eventQiBonus(g,0.08);
                g.qi = Math.min(g.qi + bonus, g.qiNeeded());
                if (!g.flags.prophetic_dream) {
                    g.flags.prophetic_dream = true;
                    return `+${bonus} ци. Во сне вы успешно прорвались! Уверенность осталась и после пробуждения. (+5% к следующему прорыву)`;
                }
                return `+${bonus} ци. Вершина мира всё ближе.`;
            }
            if (g.expedition) {
                g.luck += 1;
                return "+1 удача. Во сне вы видели, что ждёт в экспедиции. Предупреждён — вооружён.";
            }
            g.spirit += 1;
            return "+1 дух. Во сне вы падали в бездну — и не боялись. Страх отступил.";
        }
    },
    {
        id: "merchant_caravan_news",
        text: "Купеческий караван из восточных провинций остановился у чайного дома. Торговцы наперебой делятся новостями и предлагают товар.",
        type: "event",
        condition: (g) => g.realmIndex >= 1 && g.realmIndex <= 6,
        effect: (g) => {
            // Если есть мировое событие — новости о нём
            if (g.worldEvent) {
                const stones = 3 + Math.floor(Math.random() * 5);
                g.stones += stones;
                g.luck += 1;
                return `Караван принёс вести о «${g.worldEvent.name}». Слухи ценны! +${stones} камней, +1 удача`;
            }
            // Иначе — торговый обмен
            if (g.pills >= 3 && g.stones < 50) {
                g.pills -= 2;
                const stones = 12 + Math.floor(Math.random() * 8);
                g.stones += stones;
                return `Торговец предложил хороший курс: -2 пилюли → +${stones} камней. «На востоке камни дороже!»`;
            }
            if (g.stones >= 20) {
                g.stones -= 15;
                g.pills += 2;
                return "-15 камней → +2 пилюли. Торговец достал флакон из рукава: «Лучшее с западных плантаций.»";
            }
            const bonus = eventQiBonus(g,0.02);
            g.qi = Math.min(g.qi + bonus, g.qiNeeded());
            return `Новости из далёких земель: войны, открытия, чудеса. Вдохновляет. +${bonus} ци`;
        }
    },

    // --- Опасности ---
    {
        id: "wild_dog_attack",
        text: "Тварь выскочила из-за угла — одичавший пёс-дух с горящими глазами! Шерсть дыбом, клыки светятся демонической ци. Прохожие разбежались.",
        type: "danger",
        condition: (g) => g.realmIndex <= 3 && !g.flags.wonCombat,
        effect: (g) => {
            const power = 1 + g.realmIndex;
            if (_eventCheck(g.getCombatPower(), power)) {
                g.stones += 2;
                g.strength += 1;
                g.flags.wonCombat = true;
                return "Один удар — и тварь отлетела. Ядро зверя рассыпалось в руке. +2 камня, +1 сила. Первая Победа!";
            }
            const loss = Math.floor(g.qi * 0.05);
            g.qi = Math.max(0, g.qi - loss);
            return `Вы едва увернулись от клыков и сбежали. -${loss} ци. Нужно стать сильнее...`;
        }
    },
    {
        id: "beast_attack",
        text: "На горной тропе вас атаковал дикий демонический зверь!",
        type: "danger",
        condition: (g) => g.realmIndex <= 5,
        effect: (g) => {
            const power = 2 + g.realmIndex * 2;
            if (g.getCombatPower() >= power) {
                const reward = 2 + g.realmIndex * 2;
                g.stones += reward;
                g.flags.wonCombat = true;
                return `Вы отбились! +${reward} камней`;
            } else {
                const loss = Math.floor(g.qi * 0.2);
                g.qi = Math.max(0, g.qi - loss);
                if (g.qi < g.qiNeeded() * 0.1) g.flags.survivedLowQi = true;
                return `Вы едва сбежали. -${loss} ци`;
            }
        }
    },
    {
        id: "bandit_attack",
        text: "Бандиты-культиваторы потребовали духовные камни!",
        type: "danger",
        condition: (g) => g.realmIndex <= 5 && !g.flags.paid_bandits,
        effect: (g) => {
            const power = 3 + g.realmIndex * 2;
            if (_eventCheck(g.getCombatPower(), power)) {
                g.strength += 1;
                const reward = 4 + g.realmIndex;
                g.stones += reward;
                g.flags.wonCombat = true;
                return `Вы дали отпор! +${reward} камней, +1 сила`;
            } else if (g.stones > 3) {
                const lost = Math.min(g.stones, 3 + Math.floor(Math.random() * 5));
                g.stones -= lost;
                g.flags.paid_bandits = true;
                g.flags.paid_bandits_year = g.years;
                return `Пришлось откупиться. -${lost} камней. Главарь ухмыльнулся: «Мы ещё вернёмся.»`;
            } else {
                const loss = Math.floor(g.qi * 0.15);
                g.qi = Math.max(0, g.qi - loss);
                g.flags.paid_bandits = true;
                g.flags.paid_bandits_year = g.years;
                return `Вас побили. -${loss} ци. «Мы ещё вернёмся,» — бросил главарь.`;
            }
        }
    },
    {
        id: "bandit_revenge",
        text: "Знакомые рожи! Те самые бандиты вернулись: «Помнишь нас? Плати снова, или будет хуже!» Их главарь ощерился, поигрывая ножом.",
        type: "danger",
        condition: (g) => g.flags.paid_bandits && !g.flags.bandit_revenge_done && g.years - (g.flags.paid_bandits_year || 0) >= 30,
        effect: (g) => {
            g.flags.bandit_revenge_done = true;
            const power = 5 + g.realmIndex * 3;
            if (_eventCheck(g.getCombatPower(), power)) {
                const reward = 10 + g.realmIndex * 3;
                g.stones += reward;
                g.luck += 1;
                g.flags.wonCombat = true;
                return `«Помню. Очень хорошо помню.» Один удар — и банда разбежалась. +${reward} камней (с процентами), +1 удача. Судьба любит терпеливых.`;
            }
            const lost = Math.min(g.stones, 5 + Math.floor(Math.random() * 8));
            if (g.stones >= lost) {
                g.stones -= lost;
                return `Они всё ещё сильнее. -${lost} камней. Но теперь — в последний раз.`;
            }
            const loss = Math.floor(g.qi * 0.15);
            g.qi = Math.max(0, g.qi - loss);
            return `Они избили вас снова. -${loss} ци. Но теперь — в последний раз.`;
        }
    },
    {
        id: "formation_trap",
        text: "Руны на земле вспыхнули под ногами — вы наступили на чужую защитную формацию! Энергия хлестнула по меридианам.",
        type: "danger",
        condition: (g) => g.realmIndex <= 7,
        effect: (g) => {
            if (_eventCheck(g.spirit + g.getArtifactBonus("spirit"), 5 + g.realmIndex * 3)) {
                const bonus = eventQiBonus(g,0.03);
                g.qi = Math.min(g.qi + bonus, g.qiNeeded());
                return `Дух стабилизировал поток. Обошлось! Более того — вы поняли структуру формации. +${bonus} ци`;
            }
            const loss = Math.floor(g.qi * 0.18);
            g.qi = Math.max(0, g.qi - loss);
            return `Энергетический удар! -${loss} ци`;
        }
    },
    {
        id: "energy_storm",
        text: "Небо раскололось — буря духовной энергии! Молнии из чистой ци бьют в землю, деревья рассыпаются в пыль. Ветер сбивает с ног.",
        type: "danger",
        condition: (g) => g.realmIndex <= 7,
        effect: (g) => {
            if (_eventCheck(g.strength, 3 + g.realmIndex * 3)) {
                g.strength += 1;
                const bonus = eventQiBonus(g,0.03);
                g.qi = Math.min(g.qi + bonus, g.qiNeeded());
                return `Вы выстояли в буре! Тело впитало остатки дикой ци. +1 сила, +${bonus} ци`;
            }
            const loss = Math.floor(g.qi * 0.1);
            g.qi = Math.max(0, g.qi - loss);
            return `-${loss} ци. Вас швырнуло в овраг. Пока выбирались — буря стихла.`;
        }
    },
    {
        id: "battlefield_remains",
        text: "Выжженная земля, трещины в скале, воздух дрожит от остаточной ци. Здесь дрались двое — и ни один не ушёл. Среди обломков блестят духовные камни.",
        type: "danger",
        condition: (g) => g.realmIndex >= 2,
        effect: (g) => {
            const totalSpirit = g.spirit + g.getArtifactBonus("spirit");
            const threshold = 5 + g.realmIndex * 4;
            if (_eventCheck(totalSpirit, threshold)) {
                const stones = 5 + g.realmIndex * 2;
                g.stones += stones;
                g.spirit += 1;
                return `Вы стабилизировали ци и собрали осколки. +${stones} камней, +1 дух (уроки чужого боя)`;
            }
            const loss = Math.floor(g.qi * 0.12);
            g.qi = Math.max(0, g.qi - loss);
            g.stones += 3;
            return `-${loss} ци от ударной волны, но +3 камня подобрали убегая`;
        }
    },
    {
        id: "heavenly_tribulation",
        text: "Небо потемнело. Тучи сгущаются — Небесная Кара обрушивается на вас!",
        type: "danger",
        condition: (g) => g.realmIndex === 8,
        effect: (g) => {
            const totalPower = g.strength + g.spirit + g.luck;
            if (totalPower >= 50 + g.subLevel * 10) {
                g.strength += 2; g.spirit += 2;
                return "Вы выстояли под молниями! +2 сила, +2 дух";
            } else {
                const loss = Math.floor(g.qi * 0.4);
                g.qi = Math.max(0, g.qi - loss);
                return `Молнии обрушились! -${loss} ци`;
            }
        }
    },

    // --- Техники через события ---
    // iron_body убрана из случайных событий — будет наградой за приключение (см. бэклог)
    {
    // thunder_fist → ascend_beast_cave (тир 2)
    // stone_meditation → ascend_spirit_forest (тир 2)
    // wood_rejuvenation → ascend2_spirit_forest (тир 3)
    // sword_of_ten_thousand → ascend2_beast_cave (тир 3)

    // === СЛУХИ О ПРИКЛЮЧЕНИЯХ ===
    {
        id: "rumor_lost_caravan",
        text: "На рынке обсуждают пропавший караван с редкими пилюлями. Купец обещает щедрую награду за находку.",
        type: "event",
        condition: (g) => g.realmIndex >= 2 && Math.random() < 0.20
            && !g.adventureRumors.find(r => r.id === "lost_caravan")
            && !g.activeAdventures.find(a => a.id === "lost_caravan"),
        effect: (g) => {
            return g.addAdventureRumor("lost_caravan") ? "Новый слух! Проверьте вкладку Приключения." : "";
        }
    },
    {
        id: "rumor_abandoned_temple",
        text: "Путник рассказал о странном сиянии в Нефритовых горах — там, где стоял древний храм...",
        type: "event",
        condition: (g) => g.realmIndex >= 3 && Math.random() < 0.20
            && !g.adventureRumors.find(r => r.id === "abandoned_temple")
            && !g.activeAdventures.find(a => a.id === "abandoned_temple"),
        effect: (g) => {
            return g.addAdventureRumor("abandoned_temple") ? "Новый слух! Проверьте вкладку Приключения." : "";
        }
    },
    {
        id: "rumor_root_eater",
        text: "Крестьяне в панике: духовные посевы гибнут за одну ночь. Что-то под землёй пожирает корни, и оно растёт...",
        type: "event",
        condition: (g) => g.realmIndex >= 2 && Math.random() < 0.20
            && !g.adventureRumors.find(r => r.id === "root_eater")
            && !g.activeAdventures.find(a => a.id === "root_eater"),
        effect: (g) => {
            return g.addAdventureRumor("root_eater") ? "Новый слух! Проверьте вкладку Приключения." : "";
        }
    },
    {
        id: "rumor_hundred_schools",
        text: "На стене таверны — объявление, написанное золотыми чернилами: «Поединок Ста Школ. Вход свободный. Выход — только для победителей.»",
        type: "event",
        condition: (g) => g.realmIndex >= 3 && Math.random() < 0.20
            && !g.adventureRumors.find(r => r.id === "hundred_schools")
            && !g.activeAdventures.find(a => a.id === "hundred_schools"),
        effect: (g) => {
            return g.addAdventureRumor("hundred_schools") ? "Новый слух! Проверьте вкладку Приключения." : "";
        }
    },
);
