// ADVENTURES/MID.JS — Средние приключения (реалм 5-8)
// Зависит от: adventures/_base.js

ADVENTURES.push(
    // ── 3. Гробница Патриарха Лазурного Облака (realm 5+, 4 шага) ──
    {
        id: "ancient_tomb",
        name: "Гробница Патриарха Лазурного Облака",
        description: "Землетрясение вскрыло вход в гробницу Патриарха Лэй Юня — культиватора, достигшего Слияния с Пустотой четыре тысячи лет назад. Он славился искусством формаций.",
        condition: (g) => g.realmIndex >= 5 && g.realmIndex <= 8,
        rumor: "Земля разверзлась у Пика Грома. Из расщелины хлынула древняя ци — такую плотность энергии не видели со времён Патриарха Лазурного Облака...",
        steps: [
            {
                text: "Расщелина ведёт вниз — каменные ступени, вырезанные в скале четыре тысячи лет назад. Воздух пахнет озоном и древностью. Через двести шагов путь перекрывает Формация Небесного Грома: молнии бьют из стен каждые несколько ударов сердца, оставляя на камне оплавленные следы. За четыре тысячелетия она не ослабла ни на каплю — до недавнего землетрясения. Теперь трещина в стене пересекает питающую руну. Вспышки ещё сильны, но между ними растут паузы.",
                choices: [
                    {
                        text: "Четыре тысячи лет — а всё равно это просто камни",
                        description: "Нужна сила",
                        check: { strength: 22 },
                        success: { nextStep: 1, flag: "brute" },
                        fail: { nextStep: 1, flag: "brute_fail", effect: (g) => { g.strength = Math.max(1, g.strength - 2); }, failText: "Молния ударила в момент атаки. Тело онемело, мышцы горят. -2 сила. Но узел разрушен." }
                    },
                    {
                        text: "Понять её — и развязать, как узел",
                        description: "Контр-ритуал. 50 эссенции",
                        cost: { essence: 50 },
                        success: { nextStep: 1, flag: "ritual" }
                    },
                    {
                        text: "Небо само разберётся с чужими молниями. Подождать",
                        description: "Формация теряет подпитку. Но угасает и ци наследия",
                        duration: 10,
                        success: { nextStep: 1, flag: "waited" }
                    }
                ]
            },
            {
                text: "За формацией — Зал Девяти Испытаний. Огромное пространство, вырезанное в толще горы. Пол исчерчен рунами, от которых воздух дрожит и плывёт. Стены покрыты фресками — древние воины в доспехах, битвы с чудовищами, ритуалы. Когда вы делаете первый шаг, фрески оживают: лица поворачиваются, глаза следят. Кто-то шепчет из камня.",
                choices: [
                    {
                        text: "Иллюзии — не реальны. Подавить их волей",
                        description: "Нужен дух. Понимание иллюзий сохранит на 25% больше эссенции наследия",
                        check: { spirit: 25 },
                        success: { nextStep: 2, flag: "spirit_pass" },
                        fail: { nextStep: 2, flag: "spirit_fail", effect: (g) => { g.spirit = Math.max(1, g.spirit - 2); }, failText: "Иллюзии Патриарха проникли в сознание. Вы очнулись через несколько дней с гудящей головой. -2 дух." }
                    },
                    {
                        text: "Нет рун — нет иллюзий. Простое решение",
                        description: "Нужна сила. Руны дадут на 50% больше пыли, но половина записей о техниках погибнет",
                        check: { strength: 28 },
                        success: { nextStep: 2, flag: "force_pass" },
                        fail: { nextStep: 2, flag: "force_fail", effect: (g) => { g.qi = Math.max(0, g.qi - Math.floor(g.qiNeeded() * 0.12)); }, failText: "Руны взорвались обратной связью. -12% ци. Зал пройден, но вы оглушены." }
                    },
                    {
                        text: "Закрыть глаза. Не думать. Идти",
                        description: "Нужна удача. Целая печать откроет лучший артефакт; при провале шанс артефакта вдвое ниже",
                        check: { luck: 18 },
                        success: { nextStep: 2, flag: "luck_pass" },
                        fail: { nextStep: 2, flag: "luck_fail", failText: "Вы наступили на руну. До стража успели проскочить, но одна печать тайника сгорела. Шанс получить артефакт снижен вдвое." }
                    }
                ]
            },
            {
                text: "В сердце гробницы — тишина. А потом — давление. Невидимая сила прижимает вас к полу, как каменная плита. Дух-Страж Патриарха: не голем, не зверь — призрак самого Лэй Юня, оставленный охранять наследие. Его силуэт мерцает голубым, лицо спокойное. Он был культиватором ступени Слияния с Пустотой. Четыре тысячи лет смерти не ослабили его.",
                choices: [
                    {
                        text: "Он четыре тысячи лет ждал достойного. Показать, что это вы",
                        description: "Нужна боевая мощь",
                        check: { combatPower: 25 },
                        success: { nextStep: 3, flag: "guardian_defeated" },
                        fail: { nextStep: 3, flag: "guardian_escaped", effect: (g) => { g.strength = Math.max(1, g.strength - 3); g.spirit = Math.max(1, g.spirit - 3); }, failText: "Давление духа раздавило вашу защиту. Вы отступили с разорванными меридианами. -3 сила, -3 дух." }
                    },
                    {
                        text: "Сесть перед духом и медитировать. Показать уважение, а не силу",
                        description: "Нужен дух",
                        check: { spirit: 30 },
                        success: { nextStep: 3, flag: "guardian_calmed" },
                        fail: { nextStep: 3, flag: "guardian_escaped", failText: "Дух Патриарха фыркнул: «Недостаточно.» Он исчез, заблокировав часть наследия." }
                    }
                ]
            },
            {
                text: (flags) => flags.guardian_defeated
                    ? "Дух рассеялся с усмешкой: «Давно не встречал такой дерзости. Бери, ты заслужил.» Печати на хранилище открылись."
                    : flags.guardian_calmed
                        ? "Дух склонил голову: «Ты напомнил мне меня в молодости. Возьми всё — мне это больше не нужно.» Хранилище открыто полностью."
                        : "Дух ушёл, но часть печатей осталась. Вы можете забрать лишь то, что лежит снаружи.",
                choices: [
                    {
                        text: "Протянуть руку к тому, что блестит",
                        description: (flags) => flags.luck_fail
                            ? "Печать тайника повреждена: шанс артефакта снижен вдвое"
                            : flags.luck_pass ? "Целая печать: артефакт лучшего тира" : "Артефакт Патриарха",
                        duration: 0,
                        success: {
                            rewards: (flags) => _tombLegacyRewards(flags, {
                                artifactChance: flags.waited ? 0.5 : 1.0,
                                artifactMinTier: (flags.guardian_defeated || flags.guardian_calmed) ? "rare" : flags.waited ? "common" : "uncommon",
                                essence: { min: flags.waited ? 10 : 25, max: flags.waited ? 25 : 50 },
                                dust: { min: flags.waited ? 5 : 15, max: flags.waited ? 15 : 30 }
                            }),
                            flag: "took_artifact"
                        }
                    },
                    {
                        text: "Сесть и читать. Он оставил это не просто так",
                        description: (flags) => flags.force_pass || flags.force_fail
                            ? "Половина записей разрушена: шанс техники 50%"
                            : flags.spirit_pass ? "Техника и на 25% больше эссенции благодаря пониманию иллюзий" : "Знания. Техника",
                        success: {
                            rewards: (flags) => _tombLegacyRewards(flags, {
                                essence: { min: flags.waited ? 20 : 60, max: flags.waited ? 50 : 120 },
                                techniqueChance: 1.0,
                                dust: { min: flags.waited ? 3 : 10, max: flags.waited ? 10 : 20 }
                            }),
                            flag: "took_knowledge"
                        }
                    },
                    {
                        text: "Взять всё. Он сам разрешил",
                        description: (flags) => "Только если дух Патриарха покорён. " + (flags.force_pass || flags.force_fail
                            ? "Часть записей разрушена: шанс техники 50%" : flags.spirit_pass
                                ? "Сохранено больше эссенции" : flags.luck_pass
                                    ? "Целая печать: артефакт не ниже эпического" : flags.luck_fail
                                        ? "Повреждённая печать: шанс артефакта снижен вдвое" : "Полное наследие"),
                        duration: 0,
                        check: { flag: "guardian_calmed" },
                        altCheck: { flag: "guardian_defeated" },
                        success: {
                            rewards: (flags) => _tombLegacyRewards(flags, {
                                artifactChance: 1.0, artifactMinTier: "rare",
                                essence: { min: 50, max: 90 },
                                techniqueChance: 1.0,
                                dust: { min: 20, max: 40 }
                            }),
                            flag: "took_all"
                        },
                        fail: {
                            rewards: { essence: { min: 15, max: 30 }, dust: { min: 5, max: 12 } },
                            flag: "took_scraps",
                            failText: "Печати не дали забрать всё. Вы унесли лишь россыпь кристаллов из-под саркофага."
                        }
                    }
                ]
            }
        ]
    },

    // ── 8. Озеро Зеркальной Души (realm 5+, 3 шага) ──
    {
        id: "mirror_lake",
        name: "Озеро Зеркальной Души",
        description: "На дне Озера Зеркальной Души покоится запечатанный артефакт эпохи Древних. Озеро отражает не лицо, а душу — и тех, чья душа слаба, утягивает на дно навечно.",
        condition: (g) => g.realmIndex >= 5 && g.realmIndex <= 8,
        rumor: "Рыбак клянётся: «Я видел на дне озера свечение — золотое, пульсирующее. А потом вода показала мне... меня. Но другого. Злого. Я бежал.»",
        steps: [
            {
                text: "Озеро Зеркальной Души — идеально круглый водоём, гладкий как полированный нефрит. Ни ветерка, ни ряби. Вода чёрная, как чернила, но прозрачная до самого дна. А на дне — что-то светится золотым пульсирующим светом. Когда вы наклоняетесь к воде, поверхность показывает ваше лицо. Потом лицо начинает меняться. Ваш двойник в отражении медленно ухмыляется. Вы — нет.",
                choices: [
                    {
                        text: "Войти в воду. Принять всё, что озеро покажет",
                        description: "Нужен дух. Вода пытается проникнуть в сознание",
                        check: { spirit: 24 },
                        success: { nextStep: 1, flag: "dove" },
                        fail: { nextStep: 1, flag: "dove_fail", effect: (g) => { g.spirit = Math.max(1, g.spirit - 2); }, failText: "Озеро вцепилось в ваш разум. Вы вынырнули с криком. Образы чужих жизней всё ещё мелькают перед глазами. -2 дух." }
                    },
                    {
                        text: "Осушить часть озера — направить ци вниз, выдавив воду",
                        description: "Нужна сила. Сдвинуть тонны воды",
                        check: { strength: 26 },
                        success: { nextStep: 1, flag: "drained" },
                        fail: { nextStep: 1, flag: "drained_fail", effect: (g) => { g.strength = Math.max(1, g.strength - 2); }, failText: "Озеро оказалось бездонным. Вы выдохлись, едва сдвинув воду. -2 сила. Но кое-что обнажилось." }
                    },
                    {
                        text: "Ничего не делать. Озеро старше вас. Пусть решает",
                        description: "Долго",
                        duration: 15,
                        success: { nextStep: 1, flag: "meditated" }
                    }
                ]
            },
            {
                text: (flags) => flags.dove
                    ? "Вы на дне. Вокруг — тишина. Свечение исходит от саркофага из белого нефрита. Но между вами и саркофагом стоит ваш двойник — точная копия, но с пустыми глазами. Он поднимает руку, повторяя ваши движения."
                    : flags.drained
                        ? "Вода отступила, обнажив саркофаг. Но из мокрого камня поднимается ваш двойник — зеркальная копия, сотканная из воды и ци. Он молча встаёт в боевую стойку."
                        : flags.meditated
                            ? "После долгой медитации озеро расступилось, образовав коридор ко дну. В конце — саркофаг. Но ваш двойник уже ждёт. Он знает все ваши техники."
                            : "Вы добрались до дна, с трудом удерживая остатки духовной защиты. Нефритовый саркофаг мерцает впереди. Между вами и ним стоит двойник — он видел вашу неудачную попытку и теперь смотрит с холодной усмешкой.",
                choices: [
                    {
                        text: "Он знает ваши приёмы. Но вы знаете свои слабости",
                        description: (flags) => flags.meditated ? "Нужна боевая мощь. Двойник успел подготовиться" : "Нужна боевая мощь",
                        check: (flags) => ({ combatPower: flags.meditated ? 30 : 22 }),
                        success: { nextStep: 2, flag: "mirror_defeated" },
                        fail: { nextStep: 2, flag: "mirror_stalemate", effect: (g) => { g.strength = Math.max(1, g.strength - 2); g.spirit = Math.max(1, g.spirit - 2); }, failText: "Бой окончился вничью — двойник рассеялся, но и вы на грани. -2 сила, -2 дух." }
                    },
                    {
                        text: "Перестать бороться. Он — это вы. Принять это",
                        description: (flags) => flags.meditated ? "Нужен дух. Он знает вас слишком хорошо" : "Нужен дух",
                        check: (flags) => ({ spirit: flags.meditated ? 35 : 28 }),
                        success: { nextStep: 2, flag: "mirror_merged", effect: (g) => { g.spirit += 2; } },
                        fail: { nextStep: 2, flag: "mirror_stalemate", failText: "Вы не смогли принять себя полностью. Двойник рассеялся с усмешкой." }
                    }
                ]
            },
            {
                text: (flags) => flags.mirror_defeated
                    ? "Двойник рассыпался каплями, вернувшимися в озеро. Саркофаг открыт. Внутри — артефакт, переливающийся всеми цветами, и свиток с записями о природе отражений."
                    : flags.mirror_merged
                        ? "Двойник вошёл в вас. На мгновение мир стал ярче, звуки — чётче. Вы стали... полнее. Саркофаг открылся сам — озеро признало вас."
                        : "Двойник исчез, но саркофаг открылся лишь наполовину. Вы просунули руку и нащупали содержимое.",
                choices: [
                    {
                        text: "Протянуть руку. Взять то, что лежало здесь тысячелетия",
                        description: "Артефакт",
                        duration: 0,
                        success: {
                            effect: (g, flags) => {
                                if ((flags.mirror_defeated || flags.mirror_merged) && !g.hasTechnique("mirror_soul_art")) {
                                    g.learnTechnique("mirror_soul_art");
                                    addLog("Озеро запечатлело в вас Искусство Зеркальной Души!", "breakthrough");
                                }
                            },
                            rewards: (flags) => ({
                                artifactChance: (flags.mirror_defeated || flags.mirror_merged) ? 1.0 : 0.6,
                                artifactMinTier: (flags.mirror_defeated || flags.mirror_merged) ? "rare" : "uncommon",
                                essence: { min: 20, max: 45 },
                                dust: { min: 10, max: 25 }
                            }),
                            flag: "took_artifact"
                        }
                    },
                    {
                        text: "Прочитать свиток. Узнать, что озеро знало о вас",
                        description: (flags) => flags.mirror_defeated || flags.mirror_merged ? "Техника Искусство Зеркальной Души" : "Знания о душе. Шанс техники",
                        success: {
                            effect: (g, flags) => {
                                if ((flags.mirror_defeated || flags.mirror_merged) && !g.hasTechnique("mirror_soul_art")) {
                                    g.learnTechnique("mirror_soul_art");
                                    addLog("Свиток раскрыл тайну: Искусство Зеркальной Души!", "breakthrough");
                                }
                            },
                            rewards: (flags) => ({
                                essence: { min: 35, max: 70 },
                                bonusStats: { spirit: (flags.mirror_merged) ? 3 : 1 }
                            }),
                            flag: "took_scroll"
                        }
                    }
                ]
            }
        ]
    },

    // ── 13. Рынок Теней (realm 5+, 3 шага, без боя) ──
    {
        id: "shadow_market",
        name: "Рынок Теней",
        description: "В полнолуние на перекрёстке трёх дорог открывается Рынок Теней — подпольная ярмарка, где торгуют тем, что секты запрещают.",
        condition: (g) => g.realmIndex >= 5 && g.realmIndex <= 8,
        rumor: "Пьяный торговец прошептал: «В полнолуние, на перекрёстке у Чёрной Сосны... не ходи туда. Или ходи. Но возьми побольше камней.»",
        steps: [
            {
                text: "Перекрёсток затянут туманом. Фонари горят без огня — холодным синим светом. Прилавки появляются и исчезают. Торговцы в масках не называют имён. У входа — женщина с весами. «Входной взнос. Или уходи.»",
                choices: [
                    {
                        text: "Заплатить. Любопытство сильнее осторожности",
                        description: "30 камней. Доступ ко всему рынку",
                        cost: { stones: 30 },
                        success: { nextStep: 1, flag: "paid_full" }
                    },
                    {
                        text: "Торговаться. На рынке теней торгуются все",
                        description: "Нужна удача",
                        check: { luck: 15 },
                        success: { nextStep: 1, flag: "bargained" },
                        fail: { nextStep: 1, flag: "paid_full", effect: (g, flags, results) => {
                            const paid = Math.min(g.stones, 30);
                            g.stones -= paid;
                            if (paid > 0) results.push(`-${paid} камней`);
                        }, failText: "Женщина рассмеялась: «Ты мне нравишься. Отдашь всё, что есть при себе.»" }
                    },
                    {
                        text: "Пройти через задний вход. Где рынок — там и чёрный ход",
                        description: "Нужен дух. Найти брешь в защитной формации",
                        check: { spirit: 20 },
                        success: { nextStep: 1, flag: "snuck_in" },
                        fail: { nextStep: 1, flag: "snuck_fail", effect: (g) => { g.qi = Math.max(0, g.qi - Math.floor(g.qiNeeded() * 0.08)); }, failText: "Формация ударила по меридианам. Вы ввалились на рынок, шатаясь. Все смотрят. -8% ци." }
                    }
                ]
            },
            {
                text: (flags) => flags.bargained
                    ? "Женщина пропустила вас бесплатно и шепнула: «Третий прилавок слева. Скажи, что от меня.» Рынок гудит: маски, свитки, запечатанные банки, мерцающие кристаллы."
                    : flags.snuck_in
                        ? "Вы внутри, но без приглашения. Торговцы косятся с подозрением. Доступ ограничен — только три прилавка готовы иметь с вами дело."
                        : "Рынок открыт для вас. Десятки прилавков, сотни товаров. Запах благовоний и чего-то горького. Три товара привлекли ваше внимание.",
                choices: [
                    {
                        text: "Запечатанный ларец с пометкой «Не открывать»",
                        description: "Нужна удача. Что внутри — неизвестно",
                        check: { luck: 18 },
                        success: {
                            nextStep: 2,
                            flag: "bought_box",
                            effect: (g, flags, results) => {
                                const art = g.generateArtifact(g.realmIndex >= 7 ? "rare" : "uncommon");
                                if (art && g.addArtifact(art)) {
                                    if (results) results.push(`артефакт: ${art.name}`);
                                }
                            }
                        },
                        fail: {
                            nextStep: 2,
                            flag: "bought_box_bad",
                            failText: "В ларце — горсть пыли и записка: «Следующий раз повезёт.»"
                        }
                    },
                    {
                        text: "Кристалл чистой эссенции Дао — торговец клянётся, что настоящий",
                        description: "Нужен дух. Отличить подделку",
                        check: { spirit: 22 },
                        success: {
                            nextStep: 2,
                            flag: "bought_essence",
                            effect: (g) => {
                                const essence = 30 + Math.floor(Math.random() * 20);
                                g.daoEssence += essence;
                                addLog(`+${essence} эссенции. Кристалл настоящий.`, "reward");
                            }
                        },
                        fail: {
                            nextStep: 2,
                            flag: "bought_fake",
                            effect: (g) => { g.daoEssence += 5; },
                            failText: "Кристалл рассыпался через час. Подделка. Но крошки содержали немного эссенции. +5 эссенции."
                        }
                    },
                    {
                        text: "Возвращаться сюда в полнолуние. Информация дороже товаров",
                        description: "Годы наблюдений. Ничего не покупать",
                        duration: 8,
                        success: { nextStep: 2, flag: "observed" }
                    }
                ]
            },
            {
                text: (flags) => flags.observed
                    ? "Восемь лет вы возвращались к Чёрной Сосне в полнолуние. Разговоры повторялись, маски менялись, но за ними проступали знакомые лица. В последнюю ночь рынок исчез, оставив только запах благовоний. Но в кармане — свиток, которого раньше не было."
                    : "Рынок начинает сворачиваться. Туман густеет, прилавки тают. Женщина с весами кивнула на прощание. В руке — покупка и странное ощущение, что вы оставили здесь больше, чем камни.",
                choices: [
                    {
                        text: "Уйти с тем, что есть",
                        description: "Забрать покупки и знания",
                        duration: 0,
                        success: {
                            rewards: (flags) => ({
                                dust: { min: 8, max: 15 },
                                essence: { min: flags.bargained ? 15 : 5, max: flags.bargained ? 30 : 12 },
                                scrollChance: flags.observed ? 0.6 : 0.15,
                                bonusStats: flags.observed ? { spirit: 1 } : {},
                                artifactChance: 1.0,
                                artifactMinTier: "uncommon"
                            }),
                            flag: "left_market"
                        }
                    }
                ]
            }
        ]
    },

    // ── 14. Наставник из Тумана (realm 5+, 2 шага) ──
    {
        id: "fog_mentor",
        name: "Наставник из Тумана",
        description: "На горной тропе вас ждёт фигура в тумане. Не враг, не зверь — учитель. Он предлагает знание. Цена — не камни.",
        condition: (g) => g.realmIndex >= 5 && g.realmIndex <= 8 && g.realmIndex >= 3 && g.sect,
        rumor: "Пастух рассказывает: «На перевале Белого Тумана я видел старика. Он сидел на камне и разговаривал с ветром. Ветер отвечал.»",
        steps: [
            {
                text: "Туман на перевале густой, как молоко. Вы не видите ничего дальше вытянутой руки. Но голос — спокойный, глубокий — звучит отовсюду: «Ты пришёл учиться? Или просто заблудился?» Фигура проступает из белизны: старик без лица. Нет — лицо есть, но вы не можете его запомнить.",
                choices: [
                    {
                        text: "Я пришёл учиться",
                        description: "Принять обучение. Нужен дух",
                        check: { spirit: 22 },
                        success: { nextStep: 1, flag: "accepted" },
                        fail: { nextStep: 1, flag: "accepted_fail", failText: "Старик вздохнул: «Ты искренен, но разум шумит. Вернись, когда научишься слышать тишину.»" }
                    },
                    {
                        text: "Я заблудился. Но раз уж мы встретились...",
                        description: "Честность. Не все пути выбираешь сам",
                        success: { nextStep: 1, flag: "honest" }
                    },
                    {
                        text: "Молча сесть напротив. Не отвечать",
                        description: "Недеяние",
                        success: { nextStep: 1, flag: "silent" }
                    }
                ]
            },
            {
                text: (flags) => flags.accepted
                    ? "Старик учил три дня. Не словами — образами. Вы видели, как ци течёт через горы, как корни деревьев пьют дао, как ветер несёт обрывки чужих техник. Когда вы открыли глаза, старика не было. Но знание осталось."
                    : flags.honest
                        ? "Старик рассмеялся: «Честный дурак — мой любимый ученик.» Он провёл вас через туман коротким путём, по дороге рассказывая о природе Дао. Половину вы не поняли. Другая половина изменила вас."
                        : flags.silent
                            ? "Вы сидели молча. Час. Два. День. Старик тоже молчал. На закате он встал и положил вам на колени свиток. «Ты понял главное — не всё нужно говорить вслух.» И растворился в тумане."
                            : "Старик покачал головой и исчез. Но даже мимолётная встреча оставила след.",
                choices: [
                    {
                        text: "Осмыслить то, что узнали",
                        description: "Медитация после обучения",
                        success: {
                            rewards: (flags) => {
                                const base = { dust: { min: 5, max: 10 }, artifactChance: 1.0, artifactMinTier: "uncommon" };
                                if (flags.accepted) {
                                    base.essence = { min: 25, max: 45 };
                                    base.bonusStats = { spirit: 1 };
                                    base.scrollChance = 0.3;
                                }
                                if (flags.honest) {
                                    base.essence = { min: 15, max: 30 };
                                    base.scrollChance = 0.2;
                                }
                                if (flags.silent) {
                                    base.essence = { min: 10, max: 20 };
                                    base.scrollChance = 0.5;
                                    base.bonusStats = { spirit: 2 };
                                }
                                return base;
                            },
                            effect: (g, flags) => {
                                // Дао прогресс
                                if (typeof g.daoNeeded === "function" && g.sect) {
                                    const mult = flags.silent ? 0.15 : flags.accepted ? 0.10 : 0.05;
                                    const daoGain = Math.floor(g.daoNeeded() * mult);
                                    g.daoProgress += daoGain;
                                    g._checkDaoLevelUp();
                                    addLog(`+${daoGain} постижение Дао`, "cultivation");
                                }
                            },
                            flag: "mentored"
                        }
                    }
                ]
            }
        ]
    },

    // ── 15. Кости Небесного Дракона (realm 6+, 3 шага) ──
    {
        id: "dragon_bones",
        name: "Кости Небесного Дракона",
        description: "В Пустоши Забвения нашли скелет дракона. Ему сто тысяч лет, но кости до сих пор пропитаны небесной ци. Секты уже отправили разведчиков.",
        condition: (g) => g.realmIndex >= 6 && g.realmIndex <= 9,
        rumor: "Торговец пылью, дрожа от возбуждения: «Кости дракона! В Пустоши! Одна фаланга стоит больше, чем всё моё имущество! Но... там уже не только мы.»",
        steps: [
            {
                text: "Пустошь Забвения — ни травинки, ни зверя. Земля белая, как пепел. Скелет виден за десять ли — он огромен. Рёбра торчат как арки моста. Вокруг — лагеря других культиваторов. Некоторые уже дерутся между собой.",
                choices: [
                    {
                        text: "Прорваться к черепу. Самое ценное — там",
                        description: "Нужна боевая мощь. Другие тоже хотят череп",
                        check: { combatPower: 25 },
                        success: { nextStep: 1, flag: "skull" },
                        fail: { nextStep: 1, flag: "skull_fail", effect: (g) => { g.strength = Math.max(1, g.strength - 2); }, failText: "Группа культиваторов оттеснила вас от черепа. Вам досталось по рёбрам — в обоих смыслах. -2 сила." }
                    },
                    {
                        text: "Обойти толпу. Хвост и когти не хуже черепа",
                        description: "Нужен дух. Найти ценное там, где не ищут другие",
                        check: { spirit: 24 },
                        success: { nextStep: 1, flag: "tail" },
                        fail: { nextStep: 1, flag: "tail_fail", failText: "Хвостовые кости оказались пустыми — ци давно выветрилась. Вы нашли только обломки." }
                    },
                    {
                        text: "Подождать, пока остальные перебьют друг друга",
                        description: "Долго. Но кто знает, что останется",
                        duration: 12,
                        success: { nextStep: 1, flag: "waited_dragon" }
                    }
                ]
            },
            {
                text: (flags) => flags.skull
                    ? "Вы у черепа! Глазницы размером с пещеру. Внутри — кристаллизованная драконья ци, чистейшая пыль и... что-то мерцает в глубине черепной коробки."
                    : flags.tail
                        ? "В основании хвоста — спрятанная камера. Древний дракон хранил здесь что-то ценное. Стенки покрыты кристаллами эссенции."
                        : "Бойня закончилась. Половина культиваторов ушла, остальные лежат. Вы подходите к рёбрам — основная добыча разграблена, но в костном мозге ещё есть ци.",
                choices: [
                    {
                        text: "Собрать всё, до чего дотянутся руки",
                        description: "Пыль и эссенция. Жадно, но эффективно",
                        success: {
                            rewards: (flags) => ({
                                dust: { min: flags.skull ? 30 : flags.tail ? 25 : 10, max: flags.skull ? 60 : flags.tail ? 45 : 20 },
                                essence: { min: flags.skull ? 25 : flags.tail ? 35 : 8, max: flags.skull ? 50 : flags.tail ? 60 : 15 },
                                artifactChance: 1.0,
                                artifactMinTier: "uncommon"
                            }),
                            flag: "gathered"
                        }
                    },
                    {
                        text: "Исследовать мерцание в глубине",
                        description: "Что-то спрятано внутри кости. Шанс артефакта",
                        check: (flags) => ({ spirit: flags.skull ? 20 : flags.tail ? 22 : 28 }),
                        success: {
                            rewards: (flags) => ({
                                artifactChance: flags.skull ? 0.8 : flags.tail ? 0.6 : 0.3,
                                artifactMinTier: flags.skull ? "rare" : "uncommon",
                                dust: { min: 15, max: 30 },
                                essence: { min: 10, max: 25 }
                            }),
                            flag: "explored_deep"
                        },
                        fail: {
                            rewards: { dust: { min: 10, max: 20 }, essence: { min: 5, max: 12 } },
                            flag: "explored_deep_fail",
                            failText: "Остаточная ци дракона обожгла руки. Вы отдёрнулись — но горсть пыли успели схватить."
                        }
                    },
                    {
                        text: "Медитировать у костей. Дракон мёртв, но его Дао — нет",
                        description: "Дао прогресс. Нужна секта",
                        success: {
                            effect: (g) => {
                                if (typeof g.daoNeeded === "function" && g.sect) {
                                    const daoGain = Math.floor(g.daoNeeded() * 0.12);
                                    g.daoProgress += daoGain;
                                    g._checkDaoLevelUp();
                                    addLog(`+${daoGain} постижение Дао (эхо драконьего Дао)`, "cultivation");
                                }
                            },
                            rewards: (flags) => ({
                                essence: { min: 15, max: 30 },
                                dust: { min: 5, max: 12 },
                                scrollChance: 0.25
                            }),
                            flag: "meditated_dragon"
                        }
                    }
                ]
            }
        ]
    },

    // ── 18. Зеркальная Библиотека (realm 5+, 3 шага, без боя) ──
    {
        id: "mirror_library",
        name: "Зеркальная Библиотека",
        description: "Библиотека, которая существует одновременно в реальности и в отражении. Книги на полках пусты — текст виден только в зеркалах.",
        condition: (g) => g.realmIndex >= 5 && g.realmIndex <= 8,
        rumor: "Торговец свитками шепчет: «Я видел библиотеку, где книги пусты. Но если поднести зеркало — текст проступает. Беда в том, что зеркало показывает не только текст...»",
        steps: [
            {
                text: "Библиотека высечена в скале. Тысячи полок, тысячи книг — и все пусты. Белые страницы. Но на стенах — зеркала. В них полки отражаются иначе: книги полны текста, символов, формул. Вы тянетесь к зеркалу — и ваше отражение качает головой.",
                choices: [
                    {
                        text: "Читать через зеркало. Осторожно, не касаясь стекла",
                        description: "Нужен дух. Текст в отражении плывёт",
                        check: { spirit: 22 },
                        success: { nextStep: 1, flag: "read_careful" },
                        fail: { nextStep: 1, flag: "read_blur", failText: "Символы расплылись. Вы запомнили обрывки, но целой картины нет." }
                    },
                    {
                        text: "Войти в зеркало. Если книги там — нужно быть там",
                        description: "Нужна удача. Что на той стороне?",
                        check: { luck: 18 },
                        success: { nextStep: 1, flag: "entered_mirror" },
                        fail: { nextStep: 1, flag: "mirror_reject", effect: (g) => { g.qi = Math.max(0, g.qi - Math.floor(g.qiNeeded() * 0.10)); }, failText: "Зеркало оттолкнуло вас. Удар отражённой ци прошёл по меридианам. -10% ци." }
                    },
                    {
                        text: "Разбить зеркало. Может, текст останется на осколках",
                        description: "Быстро. Но библиотека может обидеться",
                        success: { nextStep: 1, flag: "broken_mirror" }
                    }
                ]
            },
            {
                text: (flags) => flags.read_careful
                    ? "Часы чтения через зеркало. Глаза болят, но знания текут: формулы ци, схемы формаций, обрывки техник. Ваше отражение перестало сопротивляться — оно читает вместе с вами."
                    : flags.entered_mirror
                        ? "Вы — по ту сторону. Мир зеркальный: свет идёт снизу, тени падают вверх. Книги здесь полны текста, но буквы — задом наперёд. Ваше отражение стоит по эту сторону стекла и смотрит на вас."
                        : flags.broken_mirror
                            ? "Зеркало разлетелось. Текст застыл на осколках — но фрагментарно. Библиотека загудела — стены дрожат. Она недовольна."
                            : "Вы внутри библиотеки, но текст расплывается. Удаётся разобрать лишь отдельные строки.",
                choices: [
                    {
                        text: "Собрать знания. Каждый обрывок ценен",
                        description: "Эссенция и свитки",
                        success: {
                            rewards: (flags) => ({
                                essence: { min: flags.read_careful ? 35 : flags.entered_mirror ? 45 : 15, max: flags.read_careful ? 65 : flags.entered_mirror ? 80 : 30 },
                                scrollChance: flags.entered_mirror ? 0.45 : flags.read_careful ? 0.30 : 0.10
                            }),
                            flag: "gathered_knowledge"
                        }
                    },
                    {
                        text: "Искать конкретную книгу. Ту, что зовёт именно вас",
                        description: "Нужен дух. Одна книга из тысяч",
                        check: (flags) => ({ spirit: flags.entered_mirror ? 20 : flags.read_careful ? 25 : 30 }),
                        success: {
                            nextStep: 2,
                            flag: "found_book"
                        },
                        fail: {
                            rewards: { essence: { min: 15, max: 30 } },
                            flag: "book_not_found",
                            failText: "Вы искали, но книга ускользала. Зеркала показывали другие полки, другие залы. Она не для вас. Пока."
                        }
                    }
                ]
            },
            {
                text: (flags) => flags.entered_mirror
                    ? "Книга нашлась — она ждала на столе, раскрытая на нужной странице. Отражение кивнуло: «Давно пора.» Текст пульсирует, как живой."
                    : "После долгих поисков — книга. Тонкая, без названия. Но когда вы открыли её, символы загорелись, и знание хлынуло потоком.",
                choices: [
                    {
                        text: "Читать до конца, чего бы это ни стоило",
                        description: "Дао прогресс + эссенция + свиток",
                        duration: 30,
                        success: {
                            effect: (g, flags) => {
                                if (typeof g.daoNeeded === "function" && g.sect) {
                                    const mult = flags.entered_mirror ? 0.15 : 0.10;
                                    const daoGain = Math.floor(g.daoNeeded() * mult);
                                    g.daoProgress += daoGain;
                                    g._checkDaoLevelUp();
                                    addLog(`+${daoGain} постижение Дао (Зеркальная Книга)`, "cultivation");
                                }
                            },
                            rewards: (flags) => ({
                                essence: { min: 30, max: 60 },
                                dust: { min: 10, max: 25 },
                                scrollChance: flags.entered_mirror ? 0.50 : 0.30,
                                bonusStats: { spirit: flags.entered_mirror ? 2 : 1 },
                                artifactChance: 1.0,
                                artifactMinTier: "uncommon"
                            }),
                            flag: "read_complete"
                        }
                    },
                    {
                        text: "Забрать книгу с собой. Разберётесь позже",
                        description: "Быстро, но зеркальные вещи непредсказуемы",
                        success: {
                            rewards: (flags) => ({
                                dust: { min: 20, max: 40 },
                                essence: { min: 20, max: 45 },
                                artifactChance: 1.0,
                                artifactMinTier: "uncommon",
                                scrollChance: 0.20
                            }),
                            flag: "took_book"
                        }
                    }
                ]
            }
        ]
    }
);
