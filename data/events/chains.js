// ============================================================
// EVENTS/CHAINS.JS — Цепочки событий (многочастевые квесты)
// ============================================================

EVENT_CHAINS.push(
    // --- Загадочный Торговец (3 части) ---
    {
        chainId: "merchant",
        step: 1,
        text: "На перекрёстке вы встретили странного торговца в чёрном плаще. Он подмигнул вам и исчез в толпе. Странно...",
        type: "event",
        condition: (g) => g.realmIndex >= 1 && g.years >= 30 && !g.flags.merchant_step,
        minYearsBetween: 20,
        effect: (g) => {
            g.flags.merchant_step = 1;
            g.flags.merchant_year = g.years;
            return "Что-то подсказывает — вы ещё встретитесь.";
        }
    },
    {
        chainId: "merchant",
        step: 2,
        text: "Торговец в чёрном плаще снова! На этот раз он предложил вам сделку: запечатанный свёрток за 30 камней. «Поверь, оно того стоит», — сказал он с усмешкой.",
        type: "event",
        condition: (g) => g.flags.merchant_step === 1 && g.years - g.flags.merchant_year >= 15 && g.stones >= 30,
        effect: (g) => {
            g.stones -= 30;
            g.flags.merchant_step = 2;
            g.flags.merchant_year = g.years;
            return "-30 камней. Торговец вручил вам запечатанный свёрток.";
        }
    },
    {
        chainId: "merchant",
        step: 3,
        text: "Вы наконец вскрыли свёрток торговца. Внутри — пять древних пилюль и записка: «Для того, кто не побоялся рискнуть». Пилюли сохранили силу за долгие годы!",
        type: "reward",
        condition: (g) => g.flags.merchant_step === 2 && g.years - g.flags.merchant_year >= 5,
        effect: (g) => {
            g.flags.merchant_step = 99;
            g.pills += 5;
            g.spirit += 1;
            g.luck += 1;
            return "+5 пилюль, +1 дух, +1 удача — невероятная сделка!";
        }
    },

    // --- Наследие Древнего (5 частей) ---
    {
        chainId: "ancient",
        step: 1,
        text: "В старой библиотеке вы нашли странную карту с пометкой «Наследие Мастера Юнь». Часть карты стёрта...",
        type: "event",
        condition: (g) => g.realmIndex >= 3 && !g.flags.ancient_step,
        minYearsBetween: 30,
        effect: (g) => {
            g.flags.ancient_step = 1;
            g.flags.ancient_year = g.years;
            return "Вы сохранили карту. Не хватает её второй половины.";
        }
    },
    {
        chainId: "ancient",
        step: 2,
        text: "Странствующий торговец продавал старые свитки. Среди них — вторая часть карты Мастера Юнь!",
        type: "event",
        condition: (g) => g.flags.ancient_step === 1 && g.years - g.flags.ancient_year >= 20,
        effect: (g) => {
            g.flags.ancient_step = 2;
            g.flags.ancient_year = g.years;
            const price = Math.min(g.stones, 10);
            g.stones -= price;
            return `Обе части карты у вас. Но последний знак пока не удаётся прочесть. (-${price} камней)`;
        }
    },
    {
        chainId: "ancient",
        step: 3,
        text: "Во сне вам явился призрак старика. «Ты собрал мою карту. Твоя ци раскроет последний знак. Иди к Пику Облачного Журавля. Я жду.» Вы проснулись в холодном поту.",
        type: "event",
        condition: (g) => g.flags.ancient_step === 2 && g.years - g.flags.ancient_year >= 15,
        effect: (g) => {
            g.flags.ancient_step = 3;
            g.flags.ancient_year = g.years;
            return "Путь к Пику Облачного Журавля теперь ясен.";
        }
    },
    {
        chainId: "ancient",
        step: 4,
        text: "У подножия Пика Облачного Журавля вас встретил каменный голем — страж наследия. Бой неизбежен!",
        type: "danger",
        condition: (g) => g.flags.ancient_step === 3 && g.years - g.flags.ancient_year >= 10,
        effect: (g) => {
            // Если приключение "Пик Журавля" уже пройдено — голем побеждён автоматически
            if (g.completedAdventures && g.completedAdventures.includes("crane_peak")) {
                g.flags.ancient_step = 4;
                g.flags.ancient_year = g.years;
                g.strength += 1;
                return "Голем узнал вас — вы уже прошли его испытание. Путь открыт. +1 сила.";
            }
            const power = 15 + g.realmIndex * 5;
            if (g.getCombatPower() >= power) {
                g.flags.ancient_step = 4;
                g.flags.ancient_year = g.years;
                g.strength += 1;
                return "Голем повержен! +1 сила. Путь к вершине открыт.";
            } else {
                g.flags.ancient_year = g.years;
                const baseLoss = 0.15;
                const retention = g.getQiRetention();
                const loss = Math.floor(g.qi * baseLoss * (1 - retention));
                g.qi = Math.max(0, g.qi - loss);
                g.addAdventureRumor("crane_peak");
                return `Голем отбросил вас! -${loss} ци${retention > 0 ? ` (удержание: ${Math.round(retention * 100)}%)` : ""}. Мощь: ${Math.floor(g.getCombatPower())}/${power}. Возможно, есть обходной путь...`;
            }
        }
    },
    {
        chainId: "ancient",
        step: 5,
        text: "На вершине Пика вы нашли пещеру Мастера Юнь. Его призрак улыбнулся: «Достойный наследник». Он передал вам технику Восприятия Пустоты и исчез навсегда.",
        type: "reward",
        condition: (g) => g.flags.ancient_step === 4 && g.years - g.flags.ancient_year >= 5 && g.realmIndex >= 6,
        effect: (g) => {
            g.flags.ancient_step = 99;
            g.learnTechnique("void_perception");
            g.spirit += 2;
            g.stones += 50;
            return "Техника: Восприятие Пустоты! +2 дух, +50 камней. Наследие обретено.";
        }
    },

    // --- Кризис Секты (4 части) ---
    {
        chainId: "sect_crisis",
        step: 1,
        text: "В секте ходят тревожные слухи: кто-то из старейшин замечен на встрече с культиваторами Тьмы.",
        type: "event",
        condition: (g) => g.flags.joinedSect && g.realmIndex >= 4 && !g.flags.sect_crisis_step,
        effect: (g) => {
            g.flags.sect_crisis_step = 1;
            g.flags.sect_crisis_year = g.years;
            return "Вы решили следить за ситуацией.";
        }
    },
    {
        chainId: "sect_crisis",
        step: 2,
        text: "Вы обнаружили тайный проход под залом совещаний. Там — следы демонической культивации!",
        type: "event",
        condition: (g) => g.flags.sect_crisis_step === 1 && g.years - g.flags.sect_crisis_year >= 15,
        effect: (g) => {
            g.flags.sect_crisis_step = 2;
            g.flags.sect_crisis_year = g.years;
            g.spirit += 1;
            return "+1 дух от напряжённого расследования. Нужно найти предателя.";
        }
    },
    {
        chainId: "sect_crisis",
        step: 3,
        text: "Предатель раскрыт — Старейшина Лю! Он атакует вас, чтобы скрыть правду!",
        type: "danger",
        condition: (g) => g.flags.sect_crisis_step === 2 && g.years - g.flags.sect_crisis_year >= 15,
        effect: (g) => {
            // Если приключение "Предательство Лю" уже пройдено — цепочка завершается
            if (g.hasClaimedLiuSword()) {
                g.flags.sect_crisis_step = 3;
                g.flags.sect_crisis_year = g.years;
                return "Старейшина Лю уже повержен. Секта в безопасности.";
            }
            const power = 20 + g.realmIndex * 4;
            if (g.getCombatPower() >= power) {
                const sword = g.grantLiuSword();
                g.flags.sect_crisis_step = 3;
                g.flags.sect_crisis_year = g.years;
                g.strength += 2;
                return `Вы победили Старейшину Лю! +2 сила.${sword ? ` Трофей: ${sword.name}!` : ""} Секта спасена!`;
            } else {
                g.flags.sect_crisis_year = g.years;
                const baseLoss = 0.20;
                const retention = g.getQiRetention();
                const loss = Math.floor(g.qi * baseLoss * (1 - retention));
                g.qi = Math.max(0, g.qi - loss);
                g.addAdventureRumor("elder_betrayal");
                return `Старейшина Лю сильнее! -${loss} ци${retention > 0 ? ` (удержание: ${Math.round(retention * 100)}%)` : ""}. Мощь: ${Math.floor(g.getCombatPower())}/${power}. Он сбежал в Ущелье Чёрного Тумана...`;
            }
        }
    },
    {
        chainId: "sect_crisis",
        step: 4,
        text: "Мастер секты лично благодарит вас за спасение. Секта щедро вознаграждает верных.",
        type: "reward",
        condition: (g) => g.flags.sect_crisis_step === 3 && g.years - g.flags.sect_crisis_year >= 5,
        effect: (g) => {
            g.flags.sect_crisis_step = 99;
            g.flags.coreDisciple = true;
            g.spirit += 2;
            g.stones += 100;
            g.pills += 5;
            return "Награда за верность: +2 дух, +100 камней, +5 пилюль";
        }
    },
);
