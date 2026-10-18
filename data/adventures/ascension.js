// ADVENTURES/ASCENSION.JS — Приключения вознесения локаций
// Разблокируются после нужного числа завершённых экспедиций для локации
// Завершение = локация вознесена (×2 награды)
// Зависит от: adventures/_base.js, locations.js

function revealSpiritForestDepth(g) {
    if ((g.expeditionCompletions?.spirit_forest || 0) < g.getLocationAscensionRequirement("spirit_forest", 2)) return;
    if (g.addAdventureRumor("ascend2_spirit_forest")) {
        addLog("Походы открыли проход к Корню Мира.", "breakthrough");
    }
}

ADVENTURES.push(
    // ── Вознесение: Лес Духовных Трав → Сердце Древнего Леса ──
    {
        id: "ascend_spirit_forest",
        name: "Сердце Древнего Леса",
        description: "Походы в Лес Духовных Трав открыли вам его тайну: в самом центре, за стеной тумана, растёт дерево, которому столько же лет, сколько миру.",
        condition: (g) => {
            const completions = (g.expeditionCompletions || {}).spirit_forest || 0;
            return completions >= g.getLocationAscensionRequirement("spirit_forest", 1) && !g.ascendedLocations.spirit_forest;
        },
        rumor: "Каждый раз, возвращаясь из Леса Духовных Трав, вы замечали туман на западной опушке. Теперь вы поняли: туман не случаен. Он что-то скрывает.",
        ascendCost: { stones: 300, essence: 50, dust: 50 },
        steps: [
            {
                text: "Западная опушка Леса Духовных Трав. Туман здесь густой, как молоко — не духовный, а живой. Он отталкивает тех, кто идёт без цели. Но вы уже знаете дорогу. Лес вас знает. Туман расступается, открывая тропу, заросшую светящимся мхом. Воздух тяжёлый от ци — каждый вдох как глоток концентрированной энергии.",
                choices: [
                    {
                        text: "Идти по тропе. Лес позвал — значит, пора",
                        description: "Нужен дух. Лес проверяет намерения",
                        check: { spirit: 14 },
                        success: { nextStep: 1, flag: "invited" },
                        fail: { nextStep: 1, flag: "forced", effect: (g) => { g.qi = Math.max(0, g.qi - Math.floor(g.qiNeeded() * 0.05)); }, failText: "Мох потемнел под ногами — лес сопротивляется. Вы продавились сквозь, но потеряли немного ци." }
                    },
                    {
                        text: "Оставить подношение у входа. Травы, камни, уважение",
                        description: "50 камней. Лес ценит дары",
                        cost: { stones: 50 },
                        success: { nextStep: 1, flag: "gifted" }
                    }
                ]
            },
            {
                text: (flags) => flags.invited
                    ? "Тропа вывела к поляне, которой нет ни на одной карте. В центре — Древо. Оно огромно: корни уходят глубоко в землю, крона теряется в облаках. Кора серебристая, листья золотые. От него исходит ци такой чистоты, что слёзы текут сами. Древо знает, что вы пришли. Оно ждало."
                    : flags.gifted
                        ? "Подношение растворилось в земле, и мох засветился ярче. Тропа раскрылась шире — лес принял дар. Поляна с Древом встретила вас тёплым ветром. Серебряная кора, золотые листья, ци чистейшей пробы. Древо склонило ветвь — жест приветствия."
                        : "Вы прошли силой, и лес это запомнил. Поляна перед вами, но Древо настороженно — ветви подняты, корни подрагивают. Ци здесь невероятной плотности, но она не течёт к вам свободно.",
                choices: [
                    {
                        text: "Медитировать у корней Древа. Впитать его мудрость",
                        description: "Дао прогресс + пыль + эссенция",
                        duration: 25,
                        success: {
                            effect: (g) => {
                                g.ascendedLocations.spirit_forest = 1;
                                if (typeof g.daoNeeded === "function" && g.sect) {
                                    const daoGain = Math.floor(g.daoNeeded() * 0.10);
                                    g.daoProgress += daoGain;
                                    g._checkDaoLevelUp();
                                    addLog(`+${daoGain} постижение Дао (Древнее Древо)`, "cultivation");
                                }
                                addLog("\u2728 Лес Духовных Трав вознесён! Награды экспедиций ×2.", "breakthrough");
                                if (!g.hasTechnique("stone_meditation")) {
                                    g.learnTechnique("stone_meditation");
                                    addLog("Древо научило вас: Медитация Каменного Будды!", "reward");
                                }
                                revealSpiritForestDepth(g);
                            },
                            rewards: (flags) => ({
                                dust: { min: 20, max: 40 },
                                essence: { min: 20, max: 40 },
                                bonusStats: { spirit: flags.invited ? 2 : 1 }
                            }),
                            flag: "ascended"
                        }
                    },
                    {
                        text: "Попросить у Древа семя. Связать эту жизнь со следующей",
                        legacyTexts: ["Попросить у Древа семя. На будущее"],
                        description: "Пыль + эссенция. +30% кармы этой жизни при перерождении; семена не складываются",
                        duration: 25,
                        success: {
                            effect: (g) => {
                                g.ascendedLocations.spirit_forest = 1;
                                g.flags.ancient_tree_seed = true;
                                addLog("\u2728 Лес Духовных Трав вознесён! Награды экспедиций ×2.", "breakthrough");
                                addLog("Древо уронило семя — маленькое, тёплое, пульсирующее. Оно усилит карму этой жизни на 30% при перерождении. Второе семя не увеличит бонус.", "reward");
                                revealSpiritForestDepth(g);
                            },
                            rewards: { dust: { min: 15, max: 30 }, essence: { min: 15, max: 30 } },
                            flag: "took_seed"
                        }
                    }
                ]
            }
        ]
    },

    // ── Вознесение: Пещера Древнего Зверя → Логово Праотца Зверей ──
    {
        id: "ascend_beast_cave",
        name: "Логово Праотца Зверей",
        description: "После походов в Пещеру Древнего Зверя вы нашли путь вглубь. Теперь вы знаете: пещера не заканчивается. Она уходит вниз — туда, где спит тот, кто был первым.",
        condition: (g) => {
            const completions = (g.expeditionCompletions || {}).beast_cave || 0;
            return completions >= g.getLocationAscensionRequirement("beast_cave", 1) && !g.ascendedLocations.beast_cave;
        },
        rumor: "В последнем походе вы заметили то, чего раньше не видели: трещину в задней стене пещеры. За ней — тёплый воздух и запах зверя. Но не обычного зверя. Чего-то древнего.",
        ascendCost: { stones: 500, essence: 80, dust: 80 },
        steps: [
            {
                text: "Трещина в задней стене пещеры — узкая, еле пролезть. За ней — спуск по спирали вглубь горы. Стены покрыты царапинами от когтей размером с человека. Воздух горячий, пахнет зверем и кровью. Чем глубже — тем сильнее давление: не духовное, а первобытное. Давление хищника, который старше сект и реалмов.",
                choices: [
                    {
                        text: "Подавить инстинкт бежать. Продолжать спуск",
                        description: "Нужна сила. Тело кричит «убегай»",
                        check: { strength: 22 },
                        success: { nextStep: 1, flag: "descended" },
                        fail: { nextStep: 1, flag: "descended_shaken", effect: (g) => { g.strength = Math.max(1, g.strength - 1); }, failText: "Колени подогнулись. Вы упали, поднялись, пошли дальше. Но руки дрожат. -1 сила." }
                    },
                    {
                        text: "Оставить подношение из добычи прошлых экспедиций",
                        description: "30 пыли. Зверь уважает охотников",
                        cost: { dust: 30 },
                        success: { nextStep: 1, flag: "offered" }
                    }
                ]
            },
            {
                text: (flags) => flags.descended
                    ? "На дне — пещера размером с озеро. И он. Праотец Зверей: существо из эпохи до культиваторов. Размером с холм, покрытый каменной чешуёй, с глазами как расплавленное золото. Он не спит — он наблюдает. Его ци давит, как гора. Но он не атакует. Вы прошли его территорию достойно."
                    : flags.offered
                        ? "Пыль растворилась в воздухе — и давление ослабло. Зверь принял подношение. Спуск стал легче. На дне пещеры — Праотец: существо из эпохи до культиваторов, размером с холм. Каменная чешуя, золотые глаза. Он смотрит на вас без злобы. Вы — охотник, принёсший дань. Это он понимает."
                        : "Вы спустились на дрожащих ногах. Праотец Зверей ждёт внизу — огромный, древний, равнодушный. Он видел тысячи таких как вы. Но вы всё ещё стоите. Это что-то значит.",
                choices: [
                    {
                        text: "Выдержать его взгляд. Не отвести глаз",
                        description: "Нужна боевая мощь. Он проверяет вашу волю",
                        duration: 30,
                        check: { combatPower: 20 },
                        success: {
                            effect: (g) => {
                                g.ascendedLocations.beast_cave = 1;
                                addLog("\u2728 Пещера Древнего Зверя вознесена! Награды экспедиций ×2.", "breakthrough");
                                addLog("Праотец закрыл глаза. Принял.", "reward");
                                if (!g.hasTechnique("thunder_fist")) {
                                    g.learnTechnique("thunder_fist");
                                    addLog("Сила грома Праотца вошла в ваши кулаки: Кулак Грома!", "reward");
                                }
                            },
                            rewards: (flags) => ({
                                dust: { min: 30, max: 50 },
                                essence: { min: 20, max: 40 },
                                bonusStats: { strength: flags.descended ? 2 : 1 }
                            }),
                            flag: "ascended"
                        },
                        fail: {
                            effect: (g) => {
                                g.ascendedLocations.beast_cave = 1;
                                addLog("\u2728 Пещера Древнего Зверя вознесена! Награды экспедиций ×2.", "breakthrough");
                                if (!g.hasTechnique("thunder_fist")) {
                                    g.learnTechnique("thunder_fist");
                                    addLog("Эхо грома Праотца научило вас: Кулак Грома!", "reward");
                                }
                            },
                            rewards: { dust: { min: 15, max: 25 }, essence: { min: 10, max: 20 } },
                            flag: "ascended_weak",
                            failText: "Вы отвели взгляд первым. Праотец фыркнул — но не атаковал. Он позволил вам остаться. Этого достаточно."
                        }
                    }
                ]
            }
        ]
    },

    // ── Вознесение: Руины Забытой Секты → Запретный Архив Секты ──
    {
        id: "ascend_forgotten_ruins",
        name: "Запретный Архив Секты",
        description: "После походов в руины вы нашли то, что не находил никто: лестницу вниз, под фундамент. Секта не была забыта. Она была запечатана.",
        condition: (g) => {
            const completions = (g.expeditionCompletions || {}).forgotten_ruins || 0;
            return completions >= g.getLocationAscensionRequirement("forgotten_ruins", 1) && !g.ascendedLocations.forgotten_ruins;
        },
        rumor: "В последнем походе в Руины вы заметили: формация в полу — не защитная. Она скрывает лестницу. Кто-то очень не хотел, чтобы то, что внизу, было найдено.",
        ascendCost: { stones: 800, essence: 120, dust: 100 },
        steps: [
            {
                text: "Формация в полу руин разблокирована — походы дали достаточно понимания её структуры. Лестница ведёт в подземелье: стены из чёрного мрамора, руны предупреждения на каждом шагу. «Запрещено Советом Девяти.» «Нарушителю — уничтожение.» «Знание внутри опаснее демонов.» Воздух сухой, холодный. Ци здесь странная — закрученная в спирали, как в ловушке.",
                choices: [
                    {
                        text: "Обезвредить руны-ловушки и войти в архив",
                        description: "Нужен дух. Формации Совета Девяти — высочайший класс",
                        check: { spirit: 35 },
                        success: { nextStep: 1, flag: "disarmed" },
                        fail: { nextStep: 1, flag: "triggered", effect: (g) => { g.spirit = Math.max(1, g.spirit - 2); g.qi = Math.max(0, g.qi - Math.floor(g.qiNeeded() * 0.10)); }, failText: "Одна из рун сработала — ментальный удар прошил сознание. Вы на коленях, голова раскалывается. -2 дух, -10% ци. Но архив открыт." }
                    },
                    {
                        text: "Пробить стену рядом с лестницей. Обойти ловушки",
                        description: "Нужна сила. Грубо, но стены старые",
                        check: { strength: 32 },
                        success: { nextStep: 1, flag: "smashed" },
                        fail: { nextStep: 1, flag: "smashed_fail", effect: (g) => { g.strength = Math.max(1, g.strength - 2); }, failText: "Стена крепче, чем выглядит — армированная формацией. Кулаки в крови. -2 сила. Но дыра есть." }
                    }
                ]
            },
            {
                text: (flags) => flags.disarmed
                    ? "Архив Запретных Знаний. Огромный зал, от пола до потолка забитый яшмовыми таблицами, свитками в хрустальных футлярах и кристаллами памяти. Всё это было запечатано Советом Девяти — сектой, которая решала, какие знания слишком опасны для мира. Об их судьбе давно нет достоверных вестей. А знания — живы."
                    : flags.smashed
                        ? "Вы ввалились в архив через дыру в стене, подняв облако древней пыли. Зал огромный — яшмовые таблицы, свитки, кристаллы. Часть стеллажей обрушилась от вашего входа, но большинство цело. Совет Девяти запечатал всё это как «опасное для мира». Они были правы — ци от этих свитков давит на разум."
                        : "Вы внутри архива, но ловушки частично активны. Часть стеллажей недоступна — руны не дают приблизиться. Но даже то, что открыто — бесценно.",
                choices: [
                    {
                        text: "Изучить запрещённые свитки. Знание не бывает опасным",
                        description: "Эссенция + свитки Дао + дао-прогресс",
                        duration: 35,
                        success: {
                            effect: (g, flags) => {
                                g.ascendedLocations.forgotten_ruins = 1;
                                if (typeof g.daoNeeded === "function" && g.sect) {
                                    const mult = flags.disarmed ? 0.12 : 0.06;
                                    const daoGain = Math.floor(g.daoNeeded() * mult);
                                    g.daoProgress += daoGain;
                                    g._checkDaoLevelUp();
                                    addLog(`+${daoGain} постижение Дао (Запретные Знания)`, "cultivation");
                                }
                                addLog("\u2728 Руины Забытой Секты вознесены! Награды экспедиций ×2.", "breakthrough");
                            },
                            rewards: (flags) => ({
                                essence: { min: flags.disarmed ? 60 : 30, max: flags.disarmed ? 120 : 60 },
                                dust: { min: 20, max: 40 },
                                scrollChance: flags.disarmed ? 0.5 : 0.25,
                                bonusStats: { spirit: flags.disarmed ? 2 : 1 }
                            }),
                            flag: "ascended"
                        }
                    },
                    {
                        text: "Собрать кристаллы памяти. Практичнее, чем свитки",
                        description: "Пыль + эссенция",
                        duration: 35,
                        success: {
                            effect: (g) => {
                                g.ascendedLocations.forgotten_ruins = 1;
                                addLog("\u2728 Руины Забытой Секты вознесены! Награды экспедиций ×2.", "breakthrough");
                            },
                            rewards: (flags) => ({
                                dust: { min: flags.disarmed ? 50 : 25, max: flags.disarmed ? 100 : 50 },
                                essence: { min: 30, max: 60 }
                            }),
                            flag: "ascended_practical"
                        }
                    }
                ]
            }
        ]
    },

    // ── Вознесение: Небесный Аукцион → Небесный Чёрный Рынок ──
    {
        id: "ascend_heavenly_auction",
        name: "Небесный Чёрный Рынок",
        description: "Десять визитов на Небесный Аукцион. Постоянные клиенты привлекают внимание — хозяин зала приглашает вас в закрытый зал.",
        condition: (g) => {
            const completions = (g.expeditionCompletions || {}).heavenly_auction || 0;
            return completions >= g.getLocationAscensionRequirement("heavenly_auction", 1) && !g.ascendedLocations.heavenly_auction;
        },
        rumor: "После десятого аукциона к вам подошёл человек в чёрной маске. «Господин, вы достаточно долго торгуете здесь. Хозяин приглашает вас... вниз.» Он указал на неприметную дверь за портьерой.",
        ascendCost: { stones: 1500, essence: 80, dust: 80 },
        steps: [
            {
                text: "За портьерой — лестница вниз, облицованная чёрным нефритом. Воздух пахнет благовониями и деньгами. Охрана у двери — два культиватора с пустыми глазами, явно под контролем формации. Маска ведёт дальше. «Чёрный Рынок — для тех, кто понимает цену настоящих вещей. Здесь нет правил аукциона. Только сделки.» Зал внизу — вдвое меньше верхнего, но товары... Артефакты, которых нет в каталогах. Техники, за которые казнят. Ингредиенты, которые запрещены Советом Сект.",
                choices: [
                    {
                        text: "Осмотреться и завести знакомства. Связи важнее товара",
                        description: "Нужен дух. Торговцы чёрного рынка читают намерения",
                        check: { spirit: 20 },
                        success: { nextStep: 1, flag: "connected" },
                        fail: { nextStep: 1, flag: "connected_fail", effect: (g) => { g.stones -= Math.min(g.stones, 50); }, failText: "Торговцы вас раскусили — новичок. Вам продали «информацию» за 50 камней. Она оказалась бесполезной. Но рынок вы запомнили." }
                    },
                    {
                        text: "Сразу к делу. Купить артефакт из закрытой витрины",
                        description: "200 камней. В финале — артефакт не ниже редкого вместо обычного ассортимента",
                        cost: { stones: 200 },
                        success: { nextStep: 1, flag: "bought" }
                    }
                ]
            },
            {
                text: (flags) => flags.connected
                    ? "Вы провели часы за разговорами. Торговцы оценили вашу проницательность — не каждый выживает здесь без кошелька. Хозяин рынка, старик с золотыми глазами, лично показал вам скрытую витрину. «Эти вещи я не продаю. Я ими обмениваюсь. Вы — интересный клиент.»"
                    : flags.bought
                        ? "За ваши камни хозяин отложил артефакт из закрытой витрины — не ниже редкого. Заберёте его после заключения контракта. «Знакомства приносят сырьё. Хорошие вещи приходится покупать», — заметил он."
                        : "Рынок вас запомнил — пусть и как неуклюжего новичка. Доступ ограничен, но вы здесь.",
                choices: [
                    {
                        text: "Заключить постоянный контракт. Чёрный Рынок — ваш",
                        description: (flags) => flags.bought
                            ? "Вознесение. Купленный артефакт не ниже редкого + пыль"
                            : flags.connected ? "Вознесение. Артефакт + больше пыли за связи" : "Вознесение. Артефакт + пыль",
                        success: {
                            effect: (g) => {
                                g.ascendedLocations.heavenly_auction = 1;
                                addLog("\u2728 Небесный Аукцион вознесён! Доступ к Чёрному Рынку. Награды ×2.", "breakthrough");
                            },
                            rewards: (flags) => ({
                                dust: { min: flags.connected ? 40 : 20, max: flags.connected ? 80 : 40 },
                                pills: { min: 3, max: 6 },
                                artifactChance: 1.0,
                                artifactMinTier: flags.bought ? "rare" : "uncommon"
                            }),
                            flag: "ascended"
                        }
                    }
                ]
            }
        ]
    },

    // ── Вознесение: Бездна Демонов → Сердце Бездны ──
    {
        id: "ascend_demon_abyss",
        name: "Сердце Бездны",
        description: "После походов в Бездну вы научились спускаться глубже. Теперь вы чувствуете пульс — ритмичный, глубокий. Это бьётся сердце самой Бездны.",
        condition: (g) => {
            const completions = (g.expeditionCompletions || {}).demon_abyss || 0;
            return completions >= g.getLocationAscensionRequirement("demon_abyss", 1) && !g.ascendedLocations.demon_abyss;
        },
        rumor: "В последней экспедиции в Бездну земля под ногами пульсировала. Не землетрясение — ритм. Как сердцебиение. Демоны вокруг замерли и склонили головы. Они молились. Чему-то внизу.",
        ascendCost: { stones: 2000, essence: 200, dust: 150 },
        steps: [
            {
                text: "Нижние уровни Бездны. Здесь демоны не атакуют — они расступаются. Стены из чёрной плоти пульсируют в такт невидимому сердцу. Воздух горячий, липкий, пропитан демонической ци. Коридор сужается и приводит к обрыву. Внизу — пустота, заполненная красным свечением. В центре пустоты — что-то огромное. Живое. Пульсирующее. Сердце Бездны — не метафора. Это буквально орган, размером с гору, подвешенный в пустоте на жилах из тьмы.",
                choices: [
                    {
                        text: "Спуститься к Сердцу. Прикоснуться к демонической силе",
                        description: "Нужна боевая мощь. Сердце защищает себя",
                        check: { combatPower: 40 },
                        success: { nextStep: 1, flag: "touched" },
                        fail: { nextStep: 1, flag: "touched_fail", effect: (g) => { g.strength = Math.max(1, g.strength - 3); g.qi = Math.max(0, g.qi - Math.floor(g.qiNeeded() * 0.10)); }, failText: "Пульсация Сердца отбросила вас — демоническая ци обожгла тело. -3 сила, -10% ци. Но вы видели его." }
                    },
                    {
                        text: "Медитировать на краю обрыва. Понять природу Бездны",
                        description: "Нужен дух. Бездна смотрит в ответ",
                        check: { spirit: 30 },
                        success: { nextStep: 1, flag: "meditated" },
                        fail: { nextStep: 1, flag: "meditated_fail", effect: (g) => { g.spirit = Math.max(1, g.spirit - 2); }, failText: "Бездна заглянула в вас — и вы не выдержали. Ментальный удар. -2 дух. Но вы теперь знаете, что она осознанна." }
                    }
                ]
            },
            {
                text: (flags) => flags.touched
                    ? "Ваша рука на поверхности Сердца. Оно горячее, скользкое, живое. Воспоминания хлынули потоком — не ваши. Бездна помнит всё: каждого демона, каждую жертву, каждый ритуал. Она не злая. Она — голодная. Всегда голодная. И теперь она знает вас. Сердце сжалось под вашей ладонью — и ударило. Волна демонической ци прошла через вас. Вы устояли. Бездна... уважает силу."
                    : flags.meditated
                        ? "Вы сидели на краю часами. Бездна наблюдала — вы чувствовали её взгляд, как физическое давление. Потом давление отступило. Она приняла вас — не как хозяина. Как свидетеля. Сердце замедлило ритм. Демоны вокруг легли. Тишина."
                        : "Вы на краю. Сердце пульсирует внизу. Полного доступа нет, но Бездна вас запомнила.",
                choices: [
                    {
                        text: "Принять связь с Бездной. Сердце бьётся — для вас тоже",
                        description: "Вознесение. Эссенция + пыль + стат-бонус",
                        success: {
                            effect: (g, flags) => {
                                g.ascendedLocations.demon_abyss = 1;
                                if (typeof g.daoNeeded === "function" && g.sect) {
                                    const mult = flags.touched ? 0.12 : flags.meditated ? 0.10 : 0.05;
                                    const daoGain = Math.floor(g.daoNeeded() * mult);
                                    g.daoProgress += daoGain;
                                    g._checkDaoLevelUp();
                                    addLog(`+${daoGain} постижение Дао (Сердце Бездны)`, "cultivation");
                                }
                                addLog("\u2728 Бездна Демонов вознесена! Сердце Бездны открыто. Награды ×2.", "breakthrough");
                            },
                            rewards: (flags) => ({
                                essence: { min: flags.touched ? 60 : 30, max: flags.touched ? 120 : 60 },
                                dust: { min: 40, max: 80 },
                                bonusStats: flags.touched ? { strength: 3 } : flags.meditated ? { spirit: 3 } : { strength: 1 }
                            }),
                            flag: "ascended"
                        }
                    }
                ]
            }
        ]
    },

    // ── Вознесение: Дворец Павшего Бессмертного → Тронный Зал Бессмертного ──
    {
        id: "ascend_immortal_palace",
        challengeRealm: 7,
        name: "Тронный Зал Бессмертного",
        description: "После походов во Дворец вы изучили его залы и коридоры. Осталось одно место, куда вы не заходили — Тронный Зал. Двери открываются только тому, кого Дворец признал достойным.",
        condition: (g) => {
            const completions = (g.expeditionCompletions || {}).immortal_palace || 0;
            return completions >= g.getLocationAscensionRequirement("immortal_palace", 1) && !g.ascendedLocations.immortal_palace;
        },
        rumor: "В последнем походе во Дворец двери Тронного Зала дрогнули. Печати на них потускнели от ваших визитов. Или... Дворец решил, что вы готовы.",
        ascendCost: { stones: 3000, essence: 300, dust: 250 },
        steps: [
            {
                text: "Тронный Зал. Двери высотой в десять чжанов, покрытые угасающими рунами. Они открываются медленно, с протяжным скрипом, который эхом разносится по всему Дворцу. За ними — зал невозможных размеров. Потолок теряется в звёздном небе — не нарисованном, настоящем. Трон в центре — из белого нефрита, испещрённый трещинами. Пуст. Но сила, что исходит от него, заставляет колени подгибаться. Перед троном — три алтаря.",
                choices: [
                    {
                        text: "Подойти к алтарю Силы. Бессмертный был воином",
                        description: "Нужна сила. Алтарь испытает тело",
                        check: { strength: 40 },
                        success: { nextStep: 1, flag: "altar_strength" },
                        fail: { nextStep: 1, flag: "altar_str_fail", effect: (g) => { g.strength = Math.max(1, g.strength - 3); }, failText: "Алтарь вспыхнул — давление бессмертного обрушилось на тело. Кости хрустнули. -3 сила. Но вы не отступили." }
                    },
                    {
                        text: "Подойти к алтарю Духа. Бессмертный был мудрецом",
                        description: "Нужен дух. Алтарь испытает разум",
                        check: { spirit: 40 },
                        success: { nextStep: 1, flag: "altar_spirit" },
                        fail: { nextStep: 1, flag: "altar_spi_fail", effect: (g) => { g.spirit = Math.max(1, g.spirit - 3); }, failText: "Воспоминания бессмертного хлынули в ваш разум — слишком много, слишком быстро. -3 дух. Но фрагменты остались." }
                    },
                    {
                        text: "Сесть на трон. Бессмертный был правителем",
                        description: "Нужна боевая мощь. Трон не терпит слабых",
                        check: { combatPower: 60 },
                        success: { nextStep: 1, flag: "throne" },
                        fail: { nextStep: 1, flag: "throne_fail", effect: (g) => { g.qi = Math.max(0, g.qi - Math.floor(g.qiNeeded() * 0.15)); g.strength = Math.max(1, g.strength - 2); g.spirit = Math.max(1, g.spirit - 2); }, failText: "Трон отверг вас — волна силы выбросила из зала. -15% ци, -2 сила, -2 дух. Вы недостойны. Пока." }
                    }
                ]
            },
            {
                text: (flags) => flags.altar_strength
                    ? "Алтарь Силы засветился — из него поднялся фантом бессмертного. Огромный, в доспехах из звёздного металла. Он замахнулся — и остановился. Посмотрел на вас. Кивнул. «Достойно.» Фантом растворился, оставив наследие: знание о том, как Бессмертный ковал своё тело."
                    : flags.altar_spirit
                        ? "Алтарь Духа раскрылся — из него потекли воспоминания. Не хаотичные — упорядоченные. Бессмертный при жизни систематизировал знания. Века медитации, озарения, ошибки — всё сжато в мгновение. Ваш разум расширился."
                        : flags.throne
                            ? "Трон принял вас. Звёздное небо над головой вспыхнуло — созвездия сложились в формацию. Наследие Бессмертного обрушилось потоком: не техники, не ресурсы — понимание. Что значит быть бессмертным. Что значит быть недостаточно бессмертным."
                            : "Испытание провалено, но зал вас не изгнал. Трещины в троне засветились — Дворец даёт второй шанс. Но не третий.",
                choices: [
                    {
                        text: "Принять наследие. Тронный Зал — ваш",
                        description: "Вознесение. Эссенция + пыль + свитки + стат-бонус",
                        success: {
                            effect: (g, flags) => {
                                g.ascendedLocations.immortal_palace = 1;
                                if (typeof g.daoNeeded === "function" && g.sect) {
                                    const mult = flags.throne ? 0.15 : (flags.altar_strength || flags.altar_spirit) ? 0.10 : 0.05;
                                    const daoGain = Math.floor(g.daoNeeded() * mult);
                                    g.daoProgress += daoGain;
                                    g._checkDaoLevelUp();
                                    addLog(`+${daoGain} постижение Дао (Наследие Бессмертного)`, "cultivation");
                                }
                                addLog("\u2728 Дворец Павшего Бессмертного вознесён! Тронный Зал открыт. Награды ×2.", "breakthrough");
                            },
                            rewards: (flags) => ({
                                essence: { min: flags.throne ? 100 : 50, max: flags.throne ? 200 : 100 },
                                dust: { min: 60, max: 120 },
                                scrollChance: flags.throne ? 0.6 : 0.3,
                                bonusStats: flags.altar_strength ? { strength: 3 } : flags.altar_spirit ? { spirit: 3 } : flags.throne ? { strength: 2, spirit: 2 } : { strength: 1 }
                            }),
                            flag: "ascended"
                        }
                    }
                ]
            }
        ]
    },

    // ══════════════════════════════════════════
    // ТИР 3 — Высшее вознесение
    // ══════════════════════════════════════════

    // ── Тир 3: Корень Мира (spirit_forest) ──
    {
        id: "ascend2_spirit_forest",
        name: "Корень Мира",
        description: "Древо показало вам путь вниз — по корням, к подземному озеру. Источник всей ци леса. Озеро живое, и оно не пускает чужих.",
        condition: (g) => {
            const completions = (g.expeditionCompletions || {}).spirit_forest || 0;
            return completions >= g.getLocationAscensionRequirement("spirit_forest", 2) && g.ascendedLocations.spirit_forest === 1;
        },
        rumor: "С каждым походом в Сердце Древнего Леса корни Древа расступаются чуть шире. Теперь вы видите: между ними — проход вниз. Оттуда поднимается влажный воздух и свечение, от которого дрожат меридианы.",
        ascendCost: { stones: 600, essence: 100, dust: 100 },
        steps: [
            {
                text: "Спуск по корням Древа — как спуск по венам живого существа. Корни пульсируют ци, тёплые на ощупь, гладкие. Чем глубже — тем ярче свечение внизу. Через час спуска вы слышите воду. Не ручей — озеро. Подземное, огромное, светящееся голубым. Воздух настолько пропитан ци, что каждый вдох обжигает лёгкие. Озеро гладкое, как зеркало. И оно вас чувствует.",
                choices: [
                    {
                        text: "Подойти к воде с открытым сердцем. Без страха, без жадности",
                        description: "Нужен дух. Озеро читает намерения",
                        check: { spirit: 20 },
                        success: { nextStep: 1, flag: "accepted" },
                        fail: { nextStep: 1, flag: "rejected", effect: (g) => { g.qi = Math.max(0, g.qi - Math.floor(g.qiNeeded() * 0.08)); }, failText: "Озеро всколыхнулось — волна ци ударила по меридианам. Оно вас не приняло. Но и не прогнало. -8% ци." }
                    },
                    {
                        text: "Принести дар — вылить собственную ци в озеро",
                        description: "Потеря 15% ци. Озеро ценит жертву",
                        success: {
                            nextStep: 1,
                            flag: "gifted_qi",
                            effect: (g) => { g.qi = Math.max(0, g.qi - Math.floor(g.qiNeeded() * 0.15)); }
                        }
                    }
                ]
            },
            {
                text: (flags) => flags.accepted
                    ? "Озеро приняло вас. Вода расступилась, образовав ступени к центру — там, где корни Древа пьют. Ци здесь такой концентрации, что воздух мерцает. Вы чувствуете каждую травинку в лесу наверху, каждую птицу, каждый камень. Это — пульс леса."
                    : flags.gifted_qi
                        ? "Ваша ци растворилась в озере — и оно засветилось ярче. Оно приняло дар. Вода отступила, открыв центр: место, где корни Древа уходят ещё глубже. Ваш дар вплёлся в пульс Древа, и корни засветились теплее."
                        : "Озеро вас терпит, но не приветствует. Вода не расступается. Вы можете черпать с берега, но центр — закрыт.",
                choices: [
                    {
                        text: "Пить из источника. Стать частью леса",
                        description: "Вознесение. Пыль + эссенция + дао + техника «Восстановление Древесной Ци» (если ещё не изучена)",
                        success: {
                            effect: (g, flags) => {
                                g.ascendedLocations.spirit_forest = 2;
                                if (typeof g.daoNeeded === "function" && g.sect) {
                                    const mult = flags.accepted ? 0.15 : flags.gifted_qi ? 0.12 : 0.05;
                                    const daoGain = Math.floor(g.daoNeeded() * mult);
                                    g.daoProgress += daoGain;
                                    g._checkDaoLevelUp();
                                    addLog(`+${daoGain} постижение Дао (Корень Мира)`, "cultivation");
                                }
                                addLog("\u2728\u2728 Корень Мира раскрыт! Награды экспедиций \u00D72.5.", "breakthrough");
                                // Техника Восстановление Древесной Ци
                                if (!g.hasTechnique("wood_rejuvenation")) {
                                    g.learnTechnique("wood_rejuvenation");
                                    addLog("Корни Мира передали знание: Восстановление Древесной Ци!", "reward");
                                }
                            },
                            rewards: (flags) => ({
                                dust: { min: flags.accepted ? 40 : 20, max: flags.accepted ? 80 : 40 },
                                essence: { min: 30, max: 60 },
                                scrollChance: flags.accepted ? 0.4 : 0.15,
                                bonusStats: { spirit: flags.accepted ? 2 : 1 }
                            }),
                            flag: "ascended_t3"
                        }
                    }
                ]
            }
        ]
    },

    // ── Тир 3: Охотничьи Угодья Праотца (beast_cave) ──
    {
        id: "ascend2_beast_cave",
        name: "Охотничьи Угодья Праотца",
        description: "Праотец Зверей признал вас. Теперь он открывает свои охотничьи территории — тоннели, которых раньше не существовало. Там водятся звери из эпохи до культиваторов.",
        condition: (g) => {
            const completions = (g.expeditionCompletions || {}).beast_cave || 0;
            return completions >= g.getLocationAscensionRequirement("beast_cave", 2) && g.ascendedLocations.beast_cave === 1;
        },
        rumor: "Праотец поднялся. Впервые за тысячелетия он встал на все четыре лапы. Земля вздрогнула. Он повернул голову к задней стене пещеры — и стена раскололась. За ней — тоннель, от которого несёт кровью и древностью.",
        ascendCost: { stones: 1000, essence: 150, dust: 150 },
        steps: [
            {
                text: "Праотец ведёт вас. Его массивное тело еле помещается в тоннеле — стены трещат от его спины. Он движется уверенно: знает каждый поворот. Воздух становится горячее, запах крови — сильнее. Через час спуска тоннель расширяется в огромную подземную долину, освещённую фосфоресцирующими грибами. Здесь — звери. Не демонические, не духовные. Первобытные. Те, что были до ци, до культиваторов, до всего. Праотец садится у входа и смотрит на вас. Ваш ход.",
                choices: [
                    {
                        text: "Охотиться. Для этого вы здесь",
                        description: "Нужна боевая мощь. Первобытные звери непредсказуемы",
                        check: { combatPower: 25 },
                        success: { nextStep: 1, flag: "hunted" },
                        fail: { nextStep: 1, flag: "hunted_fail", effect: (g) => { g.strength = Math.max(1, g.strength - 2); }, failText: "Зверь оказался быстрее, чем вы ожидали. Когти оставили глубокие борозды. -2 сила. Но вы стоите." }
                    },
                    {
                        text: "Наблюдать. Понять, как они живут без ци",
                        description: "Нужен дух. Они другие — не лучше, не хуже",
                        duration: 10,
                        check: { spirit: 22 },
                        success: { nextStep: 1, flag: "observed" },
                        fail: { nextStep: 1, flag: "observed_fail", failText: "Вы не смогли понять их. Слишком чужие. Но сама попытка чего-то стоит." }
                    }
                ]
            },
            {
                text: (flags) => flags.hunted
                    ? "Охота окончена. Зверь повержен — его тело рассыпается в пыль и кристаллы. Первобытная материя, не тронутая ци. Праотец одобрительно рычит. Он разрешает вам возвращаться в свои угодья."
                    : flags.observed
                        ? "Десять лет вы изучали жизнь долины. Звери перестали бояться вас — они просто не понимают, что вы опасны. В их мире нет культиваторов. Нет ци. Есть только жизнь и смерть. Это... освежает. Праотец кивнул. Он открывает угодья."
                        : "Праотец ждал. Вы попробовали — и это достаточно. Он открывает угодья, хоть и не полностью.",
                choices: [
                    {
                        text: "Принять дар Праотца. Охотничьи Угодья — ваши",
                        description: "Вознесение. Пыль + эссенция",
                        success: {
                            effect: (g, flags) => {
                                g.ascendedLocations.beast_cave = 2;
                                addLog("\u2728\u2728 Охотничьи Угодья Праотца открыты! Награды экспедиций \u00D72.5.", "breakthrough");
                                if (!g.hasTechnique("sword_of_ten_thousand")) {
                                    g.learnTechnique("sword_of_ten_thousand");
                                    addLog("Праотец вложил древнее знание: Десять Тысяч Мечей!", "reward");
                                }
                            },
                            rewards: (flags) => ({
                                dust: { min: flags.hunted ? 50 : 25, max: flags.hunted ? 100 : 50 },
                                essence: { min: 30, max: 60 },
                                bonusStats: flags.observed ? { spirit: 2 } : { strength: 2 }
                            }),
                            flag: "ascended_t3"
                        }
                    }
                ]
            }
        ]
    },

    // ── Тир 3: Тайна Совета Девяти (forgotten_ruins) ──
    {
        id: "ascend2_forgotten_ruins",
        name: "Тайна Совета Девяти",
        description: "В глубине Запретного Архива — дверь, которую вы раньше не замечали. Не запечатанная — заколоченная. Изнутри.",
        condition: (g) => {
            const completions = (g.expeditionCompletions || {}).forgotten_ruins || 0;
            return completions >= g.getLocationAscensionRequirement("forgotten_ruins", 2) && g.ascendedLocations.forgotten_ruins === 1;
        },
        rumor: "С каждым походом в Запретный Архив вы замечали: одна дверь в дальнем конце зала... дрожит. Как будто кто-то стучит изнутри. Тихо. Методично. Десять тысяч лет.",
        ascendCost: { stones: 1500, essence: 200, dust: 200 },
        steps: [
            {
                text: "Дверь в конце архива. Чёрное дерево, железные скобы. Руны предупреждения — но не защитные. Это руны сожаления. «Простите нас.» «Другого выхода не было.» «Не открывайте.» За дверью — тишина. А потом — стук. Три удара. Пауза. Три удара. Кто-то жив там уже десять тысяч лет.",
                choices: [
                    {
                        text: "Открыть дверь. Десять тысяч лет — достаточно",
                        description: "Нужен дух. Что бы ни было внутри — оно сильнее вас",
                        check: { spirit: 38 },
                        success: { nextStep: 1, flag: "opened" },
                        fail: { nextStep: 1, flag: "opened_fail", effect: (g) => { g.spirit = Math.max(1, g.spirit - 3); }, failText: "Дверь открылась — и волна чужой памяти ударила по сознанию. Десять тысяч лет одиночества хлынули в ваш разум. -3 дух. Но вы устояли." }
                    },
                    {
                        text: "Не открывать. Говорить через дверь",
                        description: "Безопасно. Но вы узнаете меньше",
                        success: { nextStep: 1, flag: "talked_through" }
                    },
                    {
                        text: "Уничтожить дверь вместе с тем, что за ней",
                        description: "Нужна сила. Решить проблему навсегда",
                        check: { strength: 40 },
                        success: { nextStep: 1, flag: "destroyed" },
                        fail: { nextStep: 1, flag: "destroyed_fail", effect: (g) => { g.strength = Math.max(1, g.strength - 3); }, failText: "Дверь выдержала. Но тот, кто за ней — перестал стучать. Тишина хуже стука. -3 сила." }
                    }
                ]
            },
            {
                text: (flags) => flags.opened
                    ? "За дверью — камера размером с комнату. В центре, скрестив ноги, сидит культиватор. Женщина. Молодая — на вид. Но её глаза... в них десять тысяч лет. Она была членом Совета Девяти. Единственной, кто голосовал против уничтожения секты. За это её заперли вместе с секретом, который Совет хотел похоронить. Она смотрит на вас и говорит: «Наконец-то.»"
                    : flags.talked_through
                        ? "Голос из-за двери — хриплый, но ясный. Женский. «Десять тысяч лет. Вы первый, кто остановился послушать.» Она рассказывает: Совет Девяти уничтожил секту не из злобы — из страха. Знания в архиве могли изменить мир. Или уничтожить. Она хранит ключ к самому опасному из них."
                        : flags.destroyed
                            ? "Дверь рухнула в пыль — вместе с формацией, которая поддерживала жизнь внутри. За ней — камера. На полу — скелет в позе медитации, рассыпавшийся в тот же миг, когда формация погасла. Рядом — нефритовая таблица с записями. Она ждала десять тысяч лет. Вы опоздали на секунду."
                            : "Дверь цела, стук продолжается. Вы не смогли ни открыть, ни разрушить. Но щель между досками позволяет увидеть: внутри кто-то есть.",
                choices: [
                    {
                        text: "Принять знание. Чего бы оно ни стоило",
                        description: "Вознесение. Эссенция + свитки + дао",
                        success: {
                            effect: (g, flags) => {
                                g.ascendedLocations.forgotten_ruins = 2;
                                if (typeof g.daoNeeded === "function" && g.sect) {
                                    const mult = flags.opened ? 0.15 : flags.talked_through ? 0.10 : 0.05;
                                    const daoGain = Math.floor(g.daoNeeded() * mult);
                                    g.daoProgress += daoGain;
                                    g._checkDaoLevelUp();
                                    addLog(`+${daoGain} постижение Дао (Тайна Совета)`, "cultivation");
                                }
                                if (flags.opened) g.flags.council_prisoner_freed = true;
                                addLog("\u2728\u2728 Тайна Совета Девяти раскрыта! Награды экспедиций \u00D72.5.", "breakthrough");
                                if (!g.hasTechnique("void_perception")) {
                                    g.learnTechnique("void_perception");
                                    addLog("Совет Девяти хранил запретное знание: Восприятие Пустоты!", "reward");
                                }
                            },
                            rewards: (flags) => ({
                                essence: { min: flags.opened ? 80 : 40, max: flags.opened ? 160 : 80 },
                                dust: { min: 30, max: 60 },
                                scrollChance: flags.opened ? 0.6 : flags.talked_through ? 0.4 : 0.15,
                                bonusStats: { spirit: flags.opened ? 3 : 1 }
                            }),
                            flag: "ascended_t3"
                        }
                    }
                ]
            }
        ]
    }
);
