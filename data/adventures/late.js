// ADVENTURES/LATE.JS — Поздние приключения (реалм 7-12)
// Зависит от: adventures/_base.js

ADVENTURES.push(
    // ── 4. Бездна Кровавой Луны (realm 7+, 3 шага, опасное) ──
    {
        id: "demon_lair",
        challengeRealm: 7,
        name: "Бездна Кровавой Луны",
        description: "В ночь Кровавой Луны разверзлась Бездна — логово Культа Вечной Ночи. Демоническая ци отравляет землю на десятки ли вокруг. Внутри — тысячелетние запасы секты тёмных культиваторов.",
        condition: (g) => g.realmIndex >= 7 && g.realmIndex <= 10,
        rumor: "Алые молнии бьют из-под земли у Чёрного Утёса. Старейшина местной секты побледнел: «Это Бездна Кровавой Луны. Последний раз она открывалась при моём деде...»",
        steps: [
            {
                text: "Чёрный Утёс расколот надвое, как разрубленный мечом бога. Из трещины поднимается багровый туман — он жжёт кожу, разъедает духовную защиту и пахнет старой кровью. Изнутри доносится низкий гул, как дыхание чего-то огромного. Стены расщелины покрыты рунами Культа Вечной Ночи — они светятся тёмно-красным, пульсируя в ритме этого дыхания.",
                choices: [
                    {
                        text: "Стать невидимым. Тьма не заметит того, кто не дышит",
                        description: "Нужен дух",
                        check: { spirit: 32 },
                        success: { nextStep: 1, flag: "stealth" },
                        fail: { nextStep: 1, flag: "stealth_fail", failText: "Ваша маскировка дала трещину. Тёмные сущности почуяли вас — пришлось прорываться." }
                    },
                    {
                        text: "Выжечь тьму светом. Здесь нечего прятать",
                        description: "Нужна сила",
                        check: { strength: 30 },
                        success: { nextStep: 1, flag: "assault" },
                        fail: { nextStep: 1, flag: "assault_fail", effect: (g) => { g.strength = Math.max(1, g.strength - 2); }, failText: "Туман оказался токсичнее, чем казалось. Тело горит изнутри. -2 сила." }
                    },
                    {
                        text: "Это не подвиг одиночки. Позвать братьев",
                        description: "Нужна секта",
                        check: { hasSect: true },
                        success: { nextStep: 1, flag: "sect_help" },
                        fail: { nextStep: 1, flag: "assault", failText: "Без секты за спиной придётся идти одному." }
                    }
                ]
            },
            {
                text: (flags) => flags.stealth
                    ? "Вы проникли в самое сердце Бездны незамеченным. Здесь — Алтарь Кровавой Луны, сотканный из костей и демонической ци. Он пульсирует, как живое сердце. Вокруг — сотни запечатанных сосудов с тёмной энергией."
                    : flags.sect_help
                        ? "Объединённая атака расчистила путь. Братья по секте держат периметр, пока вы спускаетесь к Алтарю. Но дальше — только вы. Алтарь из костей и тёмной ци пульсирует перед вами."
                        : "Пробившись через тёмных тварей, вы добрались до Алтаря Кровавой Луны. Вы ранены, но стоите. Алтарь гудит, стены дрожат.",
                choices: [
                    {
                        text: "Очистить Алтарь праведной ци. Выжечь скверну",
                        description: "Нужен дух",
                        check: { spirit: 38 },
                        success: { nextStep: 2, flag: "purified" },
                        fail: { nextStep: 2, flag: "purified_partial", effect: (g) => { g.spirit = Math.max(1, g.spirit - 3); }, failText: "Скверна хлестнула обратной волной. Ваш разум горит. Алтарь очищен лишь наполовину. -3 дух." }
                    },
                    {
                        text: "Принять тьму в себя. Что не убьёт — сделает сильнее. Или убьёт",
                        description: "Огромный риск. Уникальная техника",
                        check: { strength: 35 },
                        success: { nextStep: 2, flag: "absorbed", effect: (g) => {
                            g.strength += 4;
                            if (!g.hasTechnique("blood_moon_sutra")) {
                                g.learnTechnique("blood_moon_sutra");
                                addLog("Тёмная ци кристаллизовалась в знание: Сутра Кровавой Луны!", "breakthrough");
                            }
                        } },
                        fail: { nextStep: 2, flag: "absorbed_fail", effect: (g) => { g.strength = Math.max(1, g.strength - 4); g.spirit = Math.max(1, g.spirit - 3); }, failText: "Демоническая ци разорвала ваши меридианы изнутри! Тело корчится от боли. -4 сила, -3 дух." }
                    }
                ]
            },
            {
                text: (flags) => flags.purified
                    ? "Алтарь рассыпался в прах. Под ним — хранилище Культа: тысячелетия накопленных ресурсов, артефакты и запечатанные техники."
                    : flags.absorbed
                        ? "Тёмная мощь бурлит в ваших жилах. Алтарь мёртв, но его тайник открыт. Вы чувствуете каждый предмет внутри, будто он часть вас."
                        : "Алтарь ослаблен, но не уничтожен. Тайник приоткрылся — можно забрать часть, пока скверна не восстановилась.",
                choices: [
                    {
                        text: "Разделить честно. Секта помнит тех, кто делится",
                        description: "Вклад секты + награды",
                        duration: 0,
                        success: {
                            rewards: (flags) => ({
                                stones: { min: 60, max: 120 },
                                contribution: (flags.sect_help ? 150 : 70),
                                artifactChance: flags.purified ? 0.65 : 0.35,
                                artifactMinTier: "uncommon"
                            }),
                            flag: "reported"
                        }
                    },
                    {
                        text: "Мёртвым не нужны сокровища. А вам — нужны",
                        description: "Больше ресурсов. Без вклада секты",
                        duration: 0,
                        success: {
                            rewards: (flags) => ({
                                stones: { min: 80, max: 150 },
                                essence: { min: 30, max: 60 },
                                artifactChance: flags.purified || flags.absorbed ? 0.55 : 0.25,
                                artifactMinTier: "uncommon",
                                dust: { min: 15, max: 35 }
                            }),
                            flag: "kept"
                        }
                    }
                ]
            }
        ]
    },

    // ── 9. Испытание Небесной Кары (realm 7+, 3 шага) ──
    {
        id: "tribulation_trial",
        challengeRealm: 7,
        name: "Испытание Небесной Кары",
        description: "Древний Алтарь Небесной Кары активировался. Говорят, тот, кто пройдёт испытание добровольно, получит закалку, равную настоящей Небесной Каре — без риска смерти.",
        condition: (g) => g.realmIndex >= 7 && g.realmIndex <= 10,
        rumor: "На Пике Сломанного Неба загремел гром среди ясного дня. Отшельник-даос спустился с горы: «Алтарь Небесной Кары пробудился. Последний раз он призывал молнии при моём учителе, две тысячи лет назад...»",
        steps: [
            {
                text: "Пик Сломанного Неба: выше облаков, выше птиц. Алтарь Небесной Кары — чёрная каменная платформа, исчерченная грозовыми рунами. Небо над ней никогда не проясняется: тучи кружат воронкой, молнии бьют в камень каждые несколько минут. Земля вокруг оплавлена. Воздух пахнет озоном и страхом. Чтобы начать испытание — нужно встать в центр. И выдержать первый удар.",
                choices: [
                    {
                        text: "Встать и не двигаться. Пусть небо бьёт",
                        description: "Нужна сила",
                        check: { strength: 34 },
                        success: { nextStep: 1, flag: "body_took" },
                        fail: { nextStep: 1, flag: "body_fail", effect: (g) => { g.strength = Math.max(1, g.strength - 3); }, failText: "Молния прошла насквозь. Тело дымится. Вы стоите, но еле держитесь. -3 сила." }
                    },
                    {
                        text: "Не сопротивляться. Направить молнию через себя, как реку",
                        description: "Нужен дух",
                        check: { spirit: 36 },
                        success: { nextStep: 1, flag: "redirect" },
                        fail: { nextStep: 1, flag: "redirect_fail", effect: (g) => { g.spirit = Math.max(1, g.spirit - 3); g.qi = Math.max(0, g.qi - Math.floor(g.qiNeeded() * 0.15)); }, failText: "Меридианы не выдержали потока небесной энергии. Ци взорвалась изнутри. -3 дух, -15% ци." }
                    },
                    {
                        text: "Подготовиться. Небеса не торопятся — и вам не стоит",
                        description: "100 камней на формации",
                        cost: { stones: 100 },
                        success: { nextStep: 1, flag: "shielded" }
                    }
                ]
            },
            {
                text: (flags) => flags.body_took
                    ? "Первая молния принята! Ваше тело гудит от небесной энергии. Алтарь засветился — испытание началось. Вторая волна: девять молний одновременно, каждая сильнее предыдущей."
                    : flags.redirect
                        ? "Молния прошла по меридианам — болезненно, но контролируемо. Алтарь активен. Девять молний выстраиваются в небе, как копья."
                        : "Формации приняли первый удар. Они трещат, но держатся. Алтарь засветился. Девять молний готовятся обрушиться.",
                choices: [
                    {
                        text: "Девять ударов. Не уклоняться. Ни от одного",
                        description: "Нужна боевая мощь",
                        check: { combatPower: 45 },
                        success: { nextStep: 2, flag: "nine_survived", effect: (g) => { g.strength += 3; g.spirit += 2; } },
                        fail: { nextStep: 2, flag: "nine_failed", effect: (g) => { g.strength = Math.max(1, g.strength - 3); g.spirit = Math.max(1, g.spirit - 2); g.qi = Math.max(0, g.qi - Math.floor(g.qiNeeded() * 0.20)); }, failText: "Седьмая молния пробила защиту. Вы упали. Алтарь зафиксировал семь из девяти. -3 сила, -2 дух, -20% ци." }
                    },
                    {
                        text: "Танцевать между молниями. Принять ровно столько, сколько нужно",
                        description: "Нужна удача",
                        check: { luck: 25 },
                        success: { nextStep: 2, flag: "dodged_survived", effect: (g) => { g.luck += 2; } },
                        fail: { nextStep: 2, flag: "dodged_failed", effect: (g) => { g.luck = Math.max(1, g.luck - 2); }, failText: "Молнии не уклоняются — они преследуют. Три попали. -2 удача." }
                    }
                ]
            },
            {
                text: (flags) => flags.nine_survived
                    ? "Все девять молний приняты! Ваше тело светится изнутри. Алтарь гудит — полное испытание пройдено. Из камня поднимается хранилище с наградой."
                    : flags.dodged_survived
                        ? "Вы танцевали между молниями, как змея. Алтарь признал вашу ловкость. Хранилище открывается."
                        : "Испытание не пройдено полностью, но алтарь оценил вашу смелость. Часть хранилища доступна.",
                choices: [
                    {
                        text: "Взять то, что выдержало небесный огонь",
                        description: "Артефакт",
                        duration: 0,
                        success: {
                            rewards: (flags) => ({
                                artifactChance: (flags.nine_survived || flags.dodged_survived) ? 1.0 : 0.5,
                                artifactMinTier: flags.nine_survived ? "rare" : "uncommon",
                                essence: { min: 30, max: 60 },
                                dust: { min: 15, max: 35 }
                            }),
                            flag: "took_artifact"
                        }
                    },
                    {
                        text: "Не трогать артефакт. Впитать то, что осталось в камне",
                        description: "Статы. Эссенция",
                        success: {
                            rewards: (flags) => ({
                                bonusStats: (flags.nine_survived) ? { strength: 3, spirit: 3 } : { strength: 1, spirit: 1 },
                                essence: { min: 40, max: 80 }
                            }),
                            flag: "absorbed_energy"
                        }
                    }
                ]
            }
        ]
    },

    // ── 5. Осколок Небесного Дворца (realm 9+, 4 шага) ──
    {
        id: "fallen_immortal",
        challengeRealm: 9,
        name: "Осколок Небесного Дворца",
        description: "Пространственная трещина открыла доступ к осколку Небесного Дворца — карманному измерению, где погиб бессмертный эпохи Древних. Его наследие ждёт того, кто сможет выдержать давление Небес.",
        condition: (g) => g.realmIndex >= 9 && g.realmIndex <= 12,
        rumor: "Небо раскололось над Пиком Девяти Драконов. Пространственная рябь не исчезает третьи сутки — старейшины в ужасе. Кто-то шепчет: «Это осколок Небесного Дворца. Последний раз такое видели десять тысяч лет назад...»",
        steps: [
            {
                text: "Пространственная трещина висит в воздухе на высоте трёх человек — как разбитое зеркало, в осколках которого видно другой мир. Золотые колонны, мраморные полы, покрытые трещинами — величие, пережившее десять тысяч лет. От трещины исходит давление бессмертной ци: физическая волна, отталкивающая назад. Каждый шаг к ней — как идти против урагана. Несколько культиваторов уже лежат без сознания вокруг. Они попробовали.",
                choices: [
                    {
                        text: "Войти. Давление — это просто ци. Ваша ци сильнее",
                        description: "Нужен дух",
                        check: { spirit: 45 },
                        success: { nextStep: 1, flag: "spirit_entry" },
                        fail: { nextStep: 1, flag: "spirit_entry_fail", effect: (g) => { g.spirit = Math.max(1, g.spirit - 4); }, failText: "Давление бессмертного разбило вашу духовную защиту, как стекло. Вы внутри, но разум горит. -4 дух." }
                    },
                    {
                        text: "Подготовить путь. Даже бессмертные не входили без подготовки",
                        description: "200 камней, 100 эссенции",
                        cost: { stones: 200, essence: 100 },
                        success: { nextStep: 1, flag: "stabilized" }
                    },
                    {
                        text: "Разорвать трещину шире — голыми руками",
                        description: "Нужна сила. Раздвинуть пространство",
                        check: { strength: 48 },
                        success: { nextStep: 1, flag: "forced_entry" },
                        fail: { nextStep: 1, flag: "forced_fail", effect: (g) => { g.strength = Math.max(1, g.strength - 4); g.qi = Math.max(0, g.qi - Math.floor(g.qiNeeded() * 0.20)); }, failText: "Пространство захлопнулось на ваших руках. Кости хрустнули. -4 сила, -20% ци. Но вы внутри." }
                    }
                ]
            },
            {
                text: "Внутри — мёртвый мир золота и мрамора. Время застыло: капли воды висят в воздухе, пыль не движется. В центре дворца — трон, а на нём — скелет в истлевших одеждах. Аура Дао исходит от костей, как жар от печи. Он был как минимум Земным Бессмертным. Определить, насколько выше он поднялся, вы не можете.",
                choices: [
                    {
                        text: "Сесть напротив мёртвого бога. Слушать тишину",
                        description: "Долгая медитация укрепит дух и тело",
                        duration: 18,
                        success: { nextStep: 2, flag: "meditated", effect: (g) => { g.spirit += 3; g.strength += 2; } }
                    },
                    {
                        text: "Коснуться костей. Узнать, каково это — быть бессмертным",
                        description: "Нужна боевая мощь — пережить удар воли мёртвого бессмертного",
                        check: { combatPower: 55 },
                        success: { nextStep: 2, flag: "trial_passed", effect: (g) => { g.strength += 4; g.spirit += 4; } },
                        fail: { nextStep: 2, flag: "trial_failed", effect: (g) => { g.strength = Math.max(1, g.strength - 3); g.spirit = Math.max(1, g.spirit - 3); }, failText: "Воля бессмертного обрушилась как гора. Вы устояли, но еле дышите. -3 сила, -3 дух." }
                    }
                ]
            },
            {
                text: (flags) => flags.trial_passed
                    ? "Скелет рассыпался в золотую пыль. Голос прозвучал в голове: «Ты выдержал. Возьми всё — продолжи мой Путь.» Печати на хранилище, библиотеке и оружейной сняты."
                    : flags.meditated
                        ? "Долгая медитация наполнила вас остатками Дао бессмертного. Часть печатей ослабла — вы можете выбрать, что забрать."
                        : "Вы внутри дворца, но полного доступа нет. Берите, что можете унести.",
                choices: [
                    {
                        text: "Оружейная. Он ковал это для себя — теперь оно ваше",
                        description: (flags) => flags.trial_passed ? "Артефакт не ниже эпического" : "Артефакт не ниже редкого",
                        duration: 0,
                        success: {
                            nextStep: 3,
                            rewards: (flags) => ({
                                artifactChance: 1.0,
                                artifactMinTier: flags.trial_passed ? "epic" : "rare",
                                techniqueChance: flags.trial_passed ? 0.35 : 0.15,
                                essence: { min: 80, max: 150 }
                            }),
                            flag: "took_legacy"
                        }
                    },
                    {
                        text: "Сокровищница. Забрать всё, до чего дотянутся руки",
                        description: "Ресурсы. Много",
                        duration: 0,
                        success: {
                            nextStep: 3,
                            rewards: {
                                stones: { min: 150, max: 300 },
                                essence: { min: 100, max: 200 },
                                scrollChance: 0.50,
                                dust: { min: 30, max: 60 }
                            },
                            flag: "took_resources"
                        }
                    }
                ]
            },
            {
                text: "Дворец содрогается. Трещины бегут по колоннам. Пространственный карман схлопывается — бессмертный, державший его, окончательно мёртв. У вас минуты, чтобы выбраться.",
                choices: [
                    {
                        text: "Отдать часть себя. Ци — это просто энергия. Жизнь дороже",
                        description: "Потеря ци: 25% от запаса для прорыва",
                        success: {
                            effect: (g) => { g.qi = Math.max(0, g.qi - Math.floor(g.qiNeeded() * 0.25)); },
                            rewards: (flags) => ({
                                bonusStats: flags.trial_passed ? { strength: 3, spirit: 3 } : { strength: 1, spirit: 1 }
                            }),
                            flag: "qi_sacrifice"
                        }
                    },
                    {
                        text: "Пробиться. Даже коллапсирующее пространство — просто стена",
                        description: "Нужна боевая мощь",
                        check: { combatPower: 50 },
                        success: {
                            rewards: (flags) => ({
                                bonusStats: { strength: 3, spirit: 3, luck: 2 },
                                scrollChance: flags.trial_passed ? 0.45 : 0.20
                            }),
                            flag: "escaped_power"
                        },
                        fail: {
                            rewards: {},
                            effect: (g) => { g.strength = Math.max(1, g.strength - 5); g.spirit = Math.max(1, g.spirit - 5); g.qi = 0; },
                            flag: "escaped_hurt",
                            failText: "Пространство схлопнулось на вас. Вы выжили чудом, но тело и дух разорваны. -5 сила, -5 дух, вся ци потеряна."
                        }
                    }
                ]
            }
        ]
    },

    // ── 10. Врата Забвения (realm 9+, 4 шага) ──
    {
        id: "oblivion_gate",
        challengeRealm: 9,
        name: "Врата Забвения",
        description: "На границе Смертного и Бессмертного миров появились Врата Забвения — портал, стирающий память тех, кто слаб. За ними — библиотека Небесного Суда, где записаны техники, забытые смертными.",
        condition: (g) => g.realmIndex >= 9 && g.realmIndex <= 12,
        rumor: "Бессмертный странник спустился с небес и оставил послание на каменной стеле: «Врата Забвения открыты. Кто войдёт — потеряет себя. Кто выйдет — обретёт то, чего не знал мир десять тысяч лет.»",
        steps: [
            {
                text: "Врата Забвения: две колонны из белого мрамора, висящие в воздухе без опоры. Между ними — пустота, от которой болит голова и плывёт зрение. Стоит посмотреть слишком долго — забываешь, зачем пришёл. Потом — кто ты. Несколько культиваторов стоят вокруг с пустыми глазами, не помня своих имён. Один плачет, но не знает почему. За Вратами — библиотека Небесного Суда: техники, забытые смертными десять тысяч лет назад.",
                choices: [
                    {
                        text: "Помнить. Что бы ни случилось — помнить, кто вы",
                        description: "Нужен дух",
                        check: { spirit: 48 },
                        success: { nextStep: 1, flag: "mental_shield" },
                        fail: { nextStep: 1, flag: "mental_crack", effect: (g) => { g.spirit = Math.max(1, g.spirit - 4); }, failText: "Забвение пробило третий слой защиты. Вы забыли несколько лет жизни, но помните своё имя. -4 дух." }
                    },
                    {
                        text: "Вырезать своё имя на кости. Боль не забывается",
                        description: "200 камней на ритуал",
                        cost: { stones: 200 },
                        success: { nextStep: 1, flag: "anchored" }
                    },
                    {
                        text: "Тело помнит то, что забывает разум. Идти вперёд",
                        description: "Нужна сила",
                        check: { strength: 50 },
                        success: { nextStep: 1, flag: "body_through" },
                        fail: { nextStep: 1, flag: "body_crack", effect: (g) => { g.strength = Math.max(1, g.strength - 4); g.qi = Math.max(0, g.qi - Math.floor(g.qiNeeded() * 0.20)); }, failText: "Тело прошло, но ци рассеялась — врата восприняли её как «память энергии». -4 сила, -20% ци." }
                    }
                ]
            },
            {
                text: "За Вратами — бесконечный белый зал. Ни стен, ни потолка. Тысячи нефритовых таблиц парят в воздухе — каждая содержит технику или знание. Но среди них бродят Стражи Забвения — силуэты без лиц, стирающие память прикосновением.",
                choices: [
                    {
                        text: "Пробиться к центру зала сквозь Стражей",
                        description: "Нужна боевая мощь. Стражи не пропускают",
                        check: { combatPower: 55 },
                        success: { nextStep: 2, flag: "reached_center" },
                        fail: { nextStep: 2, flag: "stayed_edge", effect: (g) => { g.strength = Math.max(1, g.strength - 3); g.spirit = Math.max(1, g.spirit - 3); }, failText: "Стражи окружили вас. Каждое касание стирало фрагмент. Вы отступили к краю. -3 сила, -3 дух." }
                    },
                    {
                        text: "Остаться у края. Не всё ценное — в центре",
                        description: "Безопасно",
                        success: { nextStep: 2, flag: "read_edge" }
                    },
                    {
                        text: "Стражи подчиняются воле. Показать, чья воля сильнее",
                        description: "Нужен дух",
                        check: { spirit: 52 },
                        success: { nextStep: 2, flag: "guardian_enslaved", effect: (g) => { g.spirit += 3; } },
                        fail: { nextStep: 2, flag: "stayed_edge", effect: (g) => { g.spirit = Math.max(1, g.spirit - 5); }, failText: "Страж обратил вашу атаку — забвение хлынуло в разум. Знакомые движения на миг стали чужими. Вы отступили, собирая рассыпавшиеся мысли. -5 дух." }
                    }
                ]
            },
            {
                text: (flags) => flags.reached_center
                    ? "В центре парит золотая таблица размером с дверь. На ней — техника, которую Небесный Суд счёл слишком опасной для смертных. Рядом — хранилище с ресурсами, оставленными прошлыми посетителями, которые не смогли выйти."
                    : flags.guardian_enslaved
                        ? "Подчинённый Страж провёл вас к золотой таблице. Другие Стражи расступились — они подчиняются иерархии. Перед вами — запрещённая техника и хранилище."
                        : "У края зала — несколько десятков таблиц. Не лучшие, но каждая содержит крупицу забытого знания.",
                choices: [
                    {
                        text: "Прочитать то, что Небеса запретили. Что бы это ни значило",
                        description: (flags) => flags.reached_center || flags.guardian_enslaved ? "Техника Память Забвения" : "Обрывки знаний. Шанс случайной техники",
                        check: { flag: "reached_center" },
                        altCheck: { flag: "guardian_enslaved" },
                        success: {
                            nextStep: 3,
                            effect: (g) => {
                                if (!g.hasTechnique("oblivion_memory")) {
                                    g.learnTechnique("oblivion_memory");
                                    addLog("Вы запомнили запрещённую технику: Память Забвения!", "breakthrough");
                                }
                            },
                            rewards: {
                                scrollChance: 0.60,
                                essence: { min: 80, max: 150 },
                                bonusStats: { spirit: 3 }
                            },
                            flag: "learned_forbidden"
                        },
                        fail: {
                            nextStep: 3,
                            rewards: { essence: { min: 30, max: 60 }, techniqueChance: 0.15 },
                            flag: "learned_scraps",
                            failText: "Золотая таблица недоступна с края зала. Вы выучили что смогли."
                        }
                    },
                    {
                        text: "Забрать всё, что оставили те, кто не вышел",
                        description: "Ресурсы прошлых эпох",
                        duration: 0,
                        success: {
                            nextStep: 3,
                            rewards: (flags) => ({
                                stones: { min: (flags.reached_center || flags.guardian_enslaved) ? 180 : 80, max: (flags.reached_center || flags.guardian_enslaved) ? 350 : 150 },
                                essence: { min: 80, max: 180 },
                                artifactChance: (flags.reached_center || flags.guardian_enslaved) ? 0.80 : 0.35,
                                artifactMinTier: (flags.reached_center || flags.guardian_enslaved) ? "rare" : "uncommon",
                                dust: { min: 25, max: 50 }
                            }),
                            flag: "looted"
                        }
                    }
                ]
            },
            {
                text: "Вы чувствуете, как Забвение тянет вас обратно. С каждой минутой вы забываете всё больше — дорогу, цель, имя. Нужно выбраться, пока помните, кто вы.",
                choices: [
                    {
                        text: "Вспомнить боль. Она выведет обратно",
                        description: "Потеря ци: 25% от запаса для прорыва",
                        success: {
                            effect: (g) => { g.qi = Math.max(0, g.qi - Math.floor(g.qiNeeded() * 0.25)); },
                            rewards: (flags) => ({
                                bonusStats: (flags.reached_center || flags.guardian_enslaved) ? { strength: 2, spirit: 3, luck: 1 } : { spirit: 1 }
                            }),
                            flag: "safe_exit"
                        }
                    },
                    {
                        text: "Разорвать Забвение. Вы — реальнее, чем оно",
                        description: "Нужна боевая мощь",
                        check: { combatPower: 52 },
                        success: {
                            rewards: (flags) => ({
                                bonusStats: { strength: 3, spirit: 3, luck: 2 },
                                scrollChance: (flags.reached_center || flags.guardian_enslaved) ? 0.50 : 0.15
                            }),
                            flag: "broke_out"
                        },
                        fail: {
                            rewards: {},
                            effect: (g) => { g.strength = Math.max(1, g.strength - 5); g.spirit = Math.max(1, g.spirit - 5); g.luck = Math.max(1, g.luck - 3); g.qi = 0; },
                            flag: "barely_escaped",
                            failText: "Забвение едва не поглотило вас. Вы вырвались, но потеряли часть себя. -5 сила, -5 дух, -3 удача, вся ци потеряна."
                        }
                    }
                ]
            }
        ]
    },

    // ── 16. Алтарь Тысячи Душ (realm 8+, 3 шага) ──
    {
        id: "thousand_souls_altar",
        challengeRealm: 8,
        name: "Алтарь Тысячи Душ",
        description: "В разломе между мирами обнаружен древний алтарь. Души тысяч павших культиваторов всё ещё связаны с ним. Каждая знает фрагмент забытой истории.",
        condition: (g) => g.realmIndex >= 8 && g.realmIndex <= 11,
        rumor: "Караванщик прибежал бледный как мел: «В Расщелине Стонущих Ветров голоса! Сотни голосов! Они зовут по имени — и знают такое, чего знать не могут...»",
        steps: [
            {
                text: "Расщелина узкая — два человека не пройдут рядом. Стены гудят от голосов. Чем глубже, тем яснее слова. Некоторые — на языках, которых давно нет. Алтарь внизу, окутанный сиянием тысяч призрачных огоньков. Каждый — чья-то душа.",
                choices: [
                    {
                        text: "Спуститься, не слушая. Закрыть разум",
                        description: "Нужен дух. Голоса пытаются проникнуть внутрь",
                        check: { spirit: 38 },
                        success: { nextStep: 1, flag: "descended_closed" },
                        fail: { nextStep: 1, flag: "descended_open", effect: (g) => { g.spirit = Math.max(1, g.spirit - 3); }, failText: "Голоса проникли сквозь защиту. Чужие воспоминания хлынули потоком. Ваши собственные стали тише. -3 дух." }
                    },
                    {
                        text: "Слушать. Каждая душа знает что-то ценное",
                        description: "Тысяча историй — услышать ту, что нужна вам",
                        success: { nextStep: 1, flag: "listened" }
                    },
                    {
                        text: "Подавить души силой ци. Они мертвы — вы нет",
                        description: "Нужна сила",
                        check: { strength: 40 },
                        success: { nextStep: 1, flag: "suppressed" },
                        fail: { nextStep: 1, flag: "suppressed_fail", effect: (g) => { g.strength = Math.max(1, g.strength - 2); }, failText: "Души оказались сильнее вместе, чем по отдельности. Давление обратилось на вас. -2 сила." }
                    }
                ]
            },
            {
                text: (flags) => flags.descended_closed
                    ? "Алтарь перед вами. Души кружат, не касаясь. Они чувствуют вашу силу и не решаются приблизиться. В центре алтаря — кристалл, пульсирующий памятью тысячи жизней."
                    : flags.listened
                        ? "Вы слушали часами. Десятки историй о войнах, секретах, техниках. Большинство бесполезны, но несколько — бесценны. Алтарь светится ровнее — души благодарны за внимание."
                        : "Вы добрались до алтаря, но души агрессивны. Кристалл мерцает — доступ есть, но времени мало.",
                choices: [
                    {
                        text: "Поглотить кристалл. Тысяча жизней — в одну",
                        description: "Пыль, эссенция, дао. Души исчезнут",
                        success: {
                            rewards: (flags) => ({
                                dust: { min: flags.descended_closed ? 40 : 20, max: flags.descended_closed ? 80 : 40 },
                                essence: { min: 40, max: 80 },
                                scrollChance: 0.35
                            }),
                            effect: (g, flags) => {
                                if (typeof g.daoNeeded === "function" && g.sect) {
                                    const mult = flags.descended_closed ? 0.10 : 0.05;
                                    g.daoProgress += Math.floor(g.daoNeeded() * mult);
                                    g._checkDaoLevelUp();
                                }
                            },
                            flag: "absorbed_souls"
                        }
                    },
                    {
                        text: "Освободить души. Они достаточно настрадались",
                        description: "Меньше ресурсов. Больше... чего-то другого",
                        success: {
                            rewards: (flags) => ({
                                dust: { min: 10, max: 20 },
                                essence: { min: 20, max: 40 },
                                bonusStats: { spirit: flags.listened ? 3 : 2 },
                                scrollChance: flags.listened ? 0.45 : 0.20
                            }),
                            effect: (g, flags) => {
                                if (typeof g.daoNeeded === "function" && g.sect) {
                                    const mult = flags.listened ? 0.15 : 0.08;
                                    g.daoProgress += Math.floor(g.daoNeeded() * mult);
                                    g._checkDaoLevelUp();
                                    addLog(`Души уходят с миром. Их благодарность — как тёплый ветер.`, "cultivation");
                                }
                            },
                            flag: "freed_souls"
                        }
                    }
                ]
            }
        ]
    },

    // ── 17. Сад Забытых Бессмертных (realm 9+, 3 шага) ──
    {
        id: "forgotten_garden",
        challengeRealm: 9,
        name: "Сад Забытых Бессмертных",
        description: "В пространственной складке обнаружен сад, посаженный бессмертными до Великого Раскола. Растения здесь — живые хранилища ци и Дао. Но сад защищает себя.",
        condition: (g) => g.realmIndex >= 9 && g.realmIndex <= 12,
        rumor: "Пространство дрогнуло — и на мгновение стал виден сад. Цветущий, невозможный, висящий в пустоте. Бессмертные сажали его для себя. Он всё ещё жив.",
        steps: [
            {
                text: "Складка пространства раскрывается как цветок. Внутри — сад размером с долину. Деревья из чистого нефрита, цветы из кристаллизованной ци, ручьи из жидкой эссенции. Красота невыносимая. Но корни деревьев шевелятся, когда вы приближаетесь.",
                choices: [
                    {
                        text: "Войти с уважением. Этот сад старше вас на вечность",
                        description: "Нужен дух. Сад чувствует намерения",
                        check: { spirit: 45 },
                        success: { nextStep: 1, flag: "respectful" },
                        fail: { nextStep: 1, flag: "respectful_fail", effect: (g) => { g.spirit = Math.max(1, g.spirit - 3); }, failText: "Сад не принял вас. Корни ударили по ногам, лианы сжали горло. Вы вырвались, но разум звенит. -3 дух." }
                    },
                    {
                        text: "Прорубить путь. Растения — это растения, какими бы древними они ни были",
                        description: "Нужна сила. Сад будет сопротивляться",
                        check: { strength: 48 },
                        success: { nextStep: 1, flag: "forced_garden" },
                        fail: { nextStep: 1, flag: "forced_fail", effect: (g) => { g.strength = Math.max(1, g.strength - 3); g.qi = Math.max(0, g.qi - Math.floor(g.qiNeeded() * 0.15)); }, failText: "Нефритовое дерево ударило веткой как мечом. Кровь на траве, ци утекает. -3 сила, -15% ци." }
                    },
                    {
                        text: "Ничего не делать. Сесть у входа и ждать",
                        description: "Очень долго. Может, сад сам решит",
                        duration: 15,
                        success: { nextStep: 1, flag: "waited_garden" }
                    }
                ]
            },
            {
                text: (flags) => flags.respectful
                    ? "Сад принял вас. Деревья расступились, создав тропу к центру. Там — Древо Дао: ствол из чистого золота, листья из света. Оно гудит от энергии. У корней — россыпь плодов и кристаллов."
                    : flags.forced_garden
                        ? "Вы прорубились к центру. Сад истекает соком — нефритовая кровь на ваших руках. Древо Дао перед вами, но оно дрожит. Вы чувствуете его гнев."
                        : flags.waited_garden
                            ? "Через годы ожидания сад раскрыл тропу. Вы шли по ней, как во сне. Древо Дао встретило вас как старого друга. Ветви опустились, предлагая плоды."
                            : "Вы внутри, но сад враждебен. Древо Дао далеко, и путь к нему опасен.",
                choices: [
                    {
                        text: "Собрать плоды и кристаллы. Практичность превыше всего",
                        description: "Пыль, эссенция, свитки",
                        success: {
                            rewards: (flags) => ({
                                dust: { min: flags.respectful || flags.waited_garden ? 50 : 20, max: flags.respectful || flags.waited_garden ? 100 : 40 },
                                essence: { min: 50, max: 100 },
                                scrollChance: flags.waited_garden ? 0.50 : 0.25
                            }),
                            flag: "harvested"
                        }
                    },
                    {
                        text: "Медитировать у Древа. Оно знает Дао лучше любого бессмертного",
                        description: "Дао прогресс. Нужна секта",
                        success: {
                            effect: (g, flags) => {
                                if (typeof g.daoNeeded === "function" && g.sect) {
                                    const mult = flags.waited_garden ? 0.20 : flags.respectful ? 0.15 : 0.05;
                                    const daoGain = Math.floor(g.daoNeeded() * mult);
                                    g.daoProgress += daoGain;
                                    g._checkDaoLevelUp();
                                    addLog(`+${daoGain} постижение Дао (Древо Дао)`, "cultivation");
                                }
                            },
                            rewards: (flags) => ({
                                essence: { min: 30, max: 60 },
                                dust: { min: 15, max: 30 },
                                bonusStats: { spirit: flags.waited_garden ? 3 : flags.respectful ? 2 : 1 },
                                scrollChance: flags.waited_garden ? 0.40 : 0.15
                            }),
                            flag: "communed_tree"
                        }
                    },
                    {
                        text: "Попросить семя. Связать эту жизнь со следующей",
                        legacyTexts: ["Попросить семя. Вырастить своё Древо... когда-нибудь"],
                        description: "Немного пыли и эссенции. +30% кармы этой жизни при перерождении; семена не складываются",
                        check: (flags) => ({ spirit: flags.waited_garden ? 30 : flags.respectful ? 40 : 55 }),
                        success: {
                            rewards: { dust: { min: 10, max: 20 }, essence: { min: 10, max: 20 } },
                            effect: (g) => {
                                g.flags.dao_tree_seed = true;
                                addLog("Семя Древа Дао усилит карму этой жизни на 30% при перерождении. Второе семя не увеличит бонус.", "reward");
                            },
                            flag: "took_seed"
                        },
                        fail: {
                            rewards: { dust: { min: 5, max: 10 } },
                            flag: "seed_refused",
                            failText: "Древо не ответило. Может, вы ещё не готовы."
                        }
                    }
                ]
            }
        ]
    }
);
