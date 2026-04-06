// ============================================================
// EVENTS/XIANXIA_MID.JS — Новые события в стиле xianxia (реалм 4-9)
// Чеки через _eventCheck(stat, порог): 85-95% шанс
// ============================================================

EVENTS.push(
    // --- 11. Великий аукцион Золотого Лотоса ---
    {
        id: "golden_lotus_auction",
        text: "Аукционный Дом Золотого Лотоса открывает двери раз в столетие! Культиваторы трёх континентов съехались. На торги выставлен запечатанный ларец.",
        type: "event",
        condition: (g) => g.realmIndex >= 4 && g.realmIndex <= 8 && g.stones >= 50,
        effect: (g) => {
            g.stones -= 50;
            const totalLuck = g.luck + g.getArtifactBonus("luck") + g.getFormationBonus("luck");
            if (_eventCheck(totalLuck, 20)) {
                const tier = g.realmIndex >= 6 ? "rare" : "uncommon";
                const art = g.generateArtifact(tier);
                if (art && g.addArtifact(art)) {
                    return `-50 камней. Ларец содержал артефакт! ${art.name}. Зал ахнул.`;
                }
            }
            g.pills += 5;
            return "-50 камней, +5 пилюль высшего качества. Достойная покупка.";
        }
    },

    // --- 12. Состязание алхимиков ---
    {
        id: "alchemy_competition",
        text: "Региональное Состязание Алхимиков! Мастера со всех провинций варят пилюли на скорость и качество. Вас пригласили как участника.",
        type: "event",
        condition: (g) => g.realmIndex >= 4 && g.realmIndex <= 7 && g.pills >= 2,
        effect: (g) => {
            g.pills -= 2;
            const totalSpirit = g.spirit + g.getArtifactBonus("spirit");
            const threshold = 10 + g.realmIndex * 8;
            if (_eventCheck(totalSpirit, threshold)) {
                g.pills += 5;
                const stones = 10 + Math.floor(Math.random() * 11);
                g.stones += stones;
                g.spirit += 1;
                return `Победа! Ваши пилюли поразили жюри. -2 пилюли, +5 пилюль, +${stones} камней, +1 дух`;
            }
            g.spirit += 1;
            return "-2 пилюли (испорчены). Печь взорвалась на третьем круге. Публика вежливо отвернулась. +1 дух";
        }
    },

    // --- 13. Пробуждение духовного зверя ---
    {
        id: "spirit_beast_awakening",
        text: "На обочине лежит раненый духовный зверь. Шерсть залита кровью, но глаза — разумные, умоляющие. Его ядро мерцает: он при смерти.",
        type: "event",
        condition: (g) => g.realmIndex >= 4 && g.realmIndex <= 8 && g.pills >= 2,
        effect: (g) => {
            g.pills -= 2;
            g.luck += 2;
            g.spirit += 1;
            g.flags.spirit_beast_healed = true;
            return "-2 пилюли. Вы влили лечебную ци в раненого зверя. Он лизнул вашу руку и скрылся в лесу. Кармическая связь. +2 удача, +1 дух";
        }
    },

    // --- 14. Карма прошлого: долг крови ---
    {
        id: "blood_karma_debt",
        text: "Культиватор в рваных одеждах перегородил путь, сжимая ржавый меч. «Твоя секта уничтожила мою семью 300 лет назад!» Вы никогда его не видели, но ненависть в его глазах настоящая.",
        type: "danger",
        condition: (g) => g.realmIndex >= 5 && g.realmIndex <= 9,
        effect: (g) => {
            const totalSpirit = g.spirit + g.getArtifactBonus("spirit");
            const spiritThreshold = 15 + g.realmIndex * 8;
            // Уговорить — лучший исход
            if (_eventCheck(totalSpirit, spiritThreshold)) {
                g.spirit += 2;
                g.luck += 1;
                return "«Я не из той секты. Но я понимаю твою боль.» Ваши слова остановили клинок. Он опустил меч и заплакал. +2 дух, +1 удача";
            }
            // Бой
            const combatThreshold = 20 + g.realmIndex * 10;
            if (_eventCheck(g.getCombatPower(), combatThreshold)) {
                g.strength += 1;
                const stones = 10 + Math.floor(Math.random() * 11);
                g.stones += stones;
                return `Вы отбили атаку. Мститель бежал, бросив мешок. +1 сила, +${stones} камней`;
            }
            const loss = Math.floor(g.qi * 0.20);
            g.qi = Math.max(0, g.qi - loss);
            return `Его ненависть дала ему силу. Вам досталось. -${loss} ци`;
        }
    },

    // --- 15. Нежданный прорыв (озарение) ---
    {
        id: "sudden_epiphany",
        text: "Посреди обычной медитации мир замер. Ваша ци взбунтовалась — не против вас, а ЗА вас. Тело двигается само, выполняя формы, которым вас никто не учил.",
        type: "reward",
        condition: (g) => g.realmIndex >= 4 && g.realmIndex <= 9 && g.currentActivity === "meditation" && Math.random() < 0.3,
        effect: (g) => {
            const gain = eventQiBonus(g,(0.20 + Math.random() * 0.10));
            g.qi = Math.min(g.qi + gain, g.qiNeeded());
            return `Озарение! Культивация рванула вперёд. +${gain} ци. Что это было?..`;
        }
    },

    // --- 16. Проверка небесного ока ---
    {
        id: "heavenly_eye_test",
        text: "Торговец разложил на циновке десять предметов. «Выбери один. Бесплатно. Но выбирай мудро.» Девять подделок. Один — настоящее сокровище.",
        type: "event",
        condition: (g) => g.realmIndex >= 4 && g.realmIndex <= 8,
        effect: (g) => {
            const totalLuck = g.luck + g.getArtifactBonus("luck") + g.getFormationBonus("luck");
            if (_eventCheck(totalLuck, 15)) {
                if (totalLuck >= 15) {
                    const tier = g.realmIndex >= 7 ? "rare" : "uncommon";
                    const art = g.generateArtifact(tier);
                    if (art && g.addArtifact(art)) {
                        return `Ваш взор безошибочен. ${art.name}! Торговец побледнел.`;
                    }
                }
                const stones = 8 + Math.floor(Math.random() * 8);
                g.stones += stones;
                return `Не лучший предмет, но и не подделка. +${stones} камней`;
            }
            return "Камень. Просто камень. Торговец рассмеялся. «В следующий раз повезёт!»";
        }
    },

    // --- 17. Печь девяти трансформаций (рефайн пилюль) ---
    {
        id: "nine_transformations_furnace",
        text: "В заброшенном гроте — древняя алхимическая печь. Небесное пламя тлеет внутри. Его жар способен очистить пилюли, превращая обычные в нечто более мощное.",
        type: "danger",
        condition: (g) => g.realmIndex >= 5 && g.realmIndex <= 9 && g.pills >= 5,
        effect: (g) => {
            const totalSpirit = g.spirit + g.getArtifactBonus("spirit");
            const threshold = 15 + g.realmIndex * 8;
            if (_eventCheck(totalSpirit, threshold)) {
                const count = Math.min(Math.floor(g.pills / 5), 3);
                g.pills -= count * 5;
                g.refinedPills = (g.refinedPills || 0) + count;
                return `Небесное пламя очистило пилюли! ${count * 5} пилюль → ${count} очищенных.`;
            }
            const lost = Math.min(3, g.pills);
            g.pills -= lost;
            g.spirit += 1;
            return `Печь взорвалась! -${lost} пилюль, +1 дух.`;
        }
    },

    // --- 18. Странствующий оружейник Грид ---
    {
        id: "wandering_blacksmith_grid",
        text: "Массивный кузнец с молотом размером с человека перегородил тропу. «Меня зовут Грид! Я точу клинки всем, от нищих до императоров. Покажи, что у тебя есть!»",
        type: "event",
        condition: (g) => {
            if (g.realmIndex > 9 || g.stones < 10) return false;
            return g.artifacts.length > 1;
        },
        effect: (g) => {
            // Выбрать случайный экипированный артефакт
            const slots = ["weapon", "armor", "accessory", "treasure"].filter(s => g.equippedArtifacts[s] != null);
            if (slots.length === 0) {
                g.artifactDust += 15;
                return "Грид осмотрел вас и хмыкнул: «Ни одной вещи на теле? Держи хоть пыль.» +15 пыли";
            }
            const slot = slots[Math.floor(Math.random() * slots.length)];
            const art = g.equippedArtifacts[slot];

            // PRI-PEN (трансценд >= 1): кланяется, просит взять учеником
            if (art && (art.transcend || 0) >= 1) {
                g.flags.grid_wants_apprentice = true;
                return `Грид уставился на ${art.name} и рухнул на колени. «Это... PRI-ранг?! Мастер! Возьмите меня в ученики! Я буду точить ваши клинки до конца дней!» Он не отстаёт...`;
            }

            // +7 до +10: не может улучшить, даёт свитки
            if (art && (art.enhance || 0) >= 7) {
                const scrolls = g.addDaoScroll(3);
                return `Грид повертел ${art.name} в руках и присвистнул: «+${art.enhance}?! Я такого в жизни не держал. Тут мой молот бессилен.» Он отдал вам ${scrolls > 0 ? scrolls + " Свитка Воли Дао" : "свитки"} в знак уважения.`;
            }

            // 0-6: улучшает за 10 камней
            if (art && (art.enhance || 0) < 7) {
                g.stones -= 10;
                art.enhance = (art.enhance || 0) + 1;
                return `-10 камней. Грид стукнул молотом — искры полетели! ${art.name} теперь +${art.enhance}. «Грид не подводит!»`;
            }

            g.artifactDust += 15;
            return "Грид покрутил головой и вздохнул: «Нечего тут точить.» Оставил горсть пыли и ушёл. +15 пыли";
        }
    },

    // --- 19. Демон в обличье монаха ---
    {
        id: "demon_monk_disguise",
        text: "Странствующий монах в золотых одеждах предложил «благословение». Улыбка безмятежна, но что-то не так. Интуиция кричит — глаза мертвеца за маской святости.",
        type: "danger",
        condition: (g) => g.realmIndex >= 5 && g.realmIndex <= 9,
        effect: (g) => {
            const totalSpirit = g.spirit + g.getArtifactBonus("spirit");
            const threshold = 12 + g.realmIndex * 8;
            if (_eventCheck(totalSpirit, threshold)) {
                g.spirit += 1;
                const stones = 10 + Math.floor(Math.random() * 11);
                g.stones += stones;
                return `«Ты не монах.» Духовный взор пробил маскировку. Демон зашипел и бежал, бросив награбленное. +1 дух, +${stones} камней`;
            }
            const loss = Math.floor(g.qi * 0.20);
            g.qi = Math.max(0, g.qi - loss);
            return `«Благословение» оказалось проклятьем. Демоническая ци ударила по меридианам. -${loss} ци`;
        }
    },

    // --- 20. Благословение умирающего старейшины ---
    {
        id: "dying_elder_blessing",
        text: "Умирающий старейшина неизвестной секты сидел под сосной, кашляя кровью. «Мой путь окончен. Но знания не должны умереть со мной. Подойди...» Он коснулся вашего лба.",
        type: "reward",
        condition: (g) => g.realmIndex >= 6 && g.realmIndex <= 9 && Math.random() < 0.4,
        effect: (g) => {
            g.spirit += 2;
            g.strength += 1;
            const qiGain = eventQiBonus(g,0.15);
            g.qi = Math.min(g.qi + qiGain, g.qiNeeded());
            const essence = 10 + Math.floor(Math.random() * 11);
            g.daoEssence += essence;
            return `Поток чужих воспоминаний хлынул в разум. Целая жизнь за мгновение. +2 дух, +1 сила, +${qiGain} ци, +${essence} эссенции`;
        }
    }
);
