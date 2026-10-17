// ============================================================
// SECTS/MISSIONS.JS — Шаблоны заданий секты
// ============================================================

// Шаблоны заданий секты (по id)
// 28 определений, 18 входят в текущие пулы SECTS.missions.
// Остальные сохранены как резерв/legacy: старый сейв может содержать такое задание.
// Артефакт — памятная награда за первое выполнение; затем редкий подарок.
const SECT_MISSION_REPEAT_ARTIFACT_CHANCE = 0.05;
const SECT_MISSION_REPEAT_ARTIFACT_MAX_TIER = "rare";

const SECT_MISSION_TEMPLATES = {
    // === Общие ===
    gather_stones: {
        id: "gather_stones",
        text: "Секта просит собрать духовные камни для нужд секты.",
        type: "resource",
        generate: (g, diff) => {
            const r = g.realmIndex;
            const amount = Math.floor((15 + r * 8 + r * r * 2) * diff.missionCostMult);
            return {
                description: `Сдать ${amount} духовных камней`,
                cost: { stones: amount },
                reward: { contribution: Math.floor((15 + r * 4) * diff.missionRewardMult) }
            };
        }
    },
    slay_beast: {
        id: "slay_beast",
        text: "Демонический зверь замечен у границ территории секты. Охотники уже выдвинулись, но нужна поддержка.",
        type: "combat",
        generate: (g, diff) => {
            const r = g.realmIndex;
            const powerNeeded = Math.floor((8 + r * 5 + r * r * 0.8) * diff.missionCostMult);
            return {
                description: `Боевая мощь ${powerNeeded}+ для победы`,
                check: { combatPower: powerNeeded },
                reward: {
                    contribution: Math.floor((20 + r * 5) * diff.missionRewardMult),
                    stones: Math.floor((5 + r * 3) * diff.missionRewardMult)
                }
            };
        }
    },
    meditate_count: {
        id: "meditate_count",
        text: "Старейшины открыли Нефритовый Сад для коллективной медитации. Каждый ученик укрепляет ауру секты.",
        type: "meditation",
        generate: (g, diff) => {
            const r = g.realmIndex;
            const years = Math.floor((5 + r * 2 + Math.floor(r / 3) * 3) * diff.missionCostMult);
            return {
                description: `Медитировать ${years} ${_plural(years, "год", "года", "лет")}`,
                check: { meditationYears: years },
                reward: { contribution: Math.floor((12 + r * 3) * diff.missionRewardMult) }
            };
        }
    },
    donate_stones_alchemy: {
        id: "donate_stones_alchemy",
        text: "Алхимический зал нуждается в духовных камнях для экспериментов.",
        type: "resource",
        generate: (g, diff) => {
            const r = g.realmIndex;
            const amount = Math.floor((20 + r * 12 + r * r * 3) * diff.missionCostMult);
            return {
                description: `Сдать ${amount} духовных камней`,
                cost: { stones: amount },
                reward: { contribution: Math.floor((18 + r * 4) * diff.missionRewardMult) }
            };
        }
    },

    // === Секта Нефритовой Чистоты (easy) ===
    purify_qi: {
        id: "purify_qi",
        text: "Нефритовые воды ждут. Очистите ци через медитацию у священного истока — секта вознаградит усердие.",
        type: "meditation",
        generate: (g, diff) => {
            const r = g.realmIndex;
            const years = Math.floor((4 + r + Math.floor(r / 3) * 2) * diff.missionCostMult);
            return {
                description: `Медитировать ${years} ${_plural(years, "год", "года", "лет")} для очищения`,
                check: { meditationYears: years },
                reward: {
                    contribution: Math.floor((10 + r * 2) * diff.missionRewardMult),
                    stones: Math.floor((3 + r) * diff.missionRewardMult)
                }
            };
        }
    },

    // === Орден Алого Пламени (medium) ===
    arena_challenge: {
        id: "arena_challenge",
        text: "Арена Тысячи Клинков ждёт! Докажите свою силу в пламени боя перед старейшинами Ордена.",
        type: "combat",
        generate: (g, diff) => {
            const r = g.realmIndex;
            const powerNeeded = Math.floor((12 + r * 6 + r * r * 1.2) * diff.missionCostMult);
            return {
                description: `Боевая мощь ${powerNeeded}+ для победы на арене`,
                check: { combatPower: powerNeeded },
                reward: {
                    contribution: Math.floor((25 + r * 6) * diff.missionRewardMult),
                    stones: Math.floor((8 + r * 4) * diff.missionRewardMult)
                }
            };
        }
    },

    // === Секта Лунного Озера (medium) ===
    brew_elixir: {
        id: "brew_elixir",
        text: "Алхимическая Печь раскалена — Лунное Озеро варит партию эликсиров. Мастера ждут камни и усердие.",
        type: "resource",
        generate: (g, diff) => {
            const r = g.realmIndex;
            const stones = Math.floor((25 + r * 10 + r * r * 2) * diff.missionCostMult);
            return {
                description: `Сдать ${stones} камней для варки эликсиров`,
                cost: { stones: stones },
                reward: {
                    contribution: Math.floor((20 + r * 5) * diff.missionRewardMult),
                    stones: Math.floor((5 + r * 2) * diff.missionRewardMult)
                }
            };
        }
    },

    // === Культ Бездны (hard) ===
    devour_essence: {
        id: "devour_essence",
        text: "Бездна жаждет. Поглотите эссенцию демонического зверя у разлома — и обратите его силу в свою.",
        type: "combat",
        generate: (g, diff) => {
            const r = g.realmIndex;
            const powerNeeded = Math.floor((15 + r * 8 + r * r * 1.5) * diff.missionCostMult);
            return {
                description: `Боевая мощь ${powerNeeded}+ — поглотить зверя`,
                check: { combatPower: powerNeeded },
                reward: {
                    contribution: Math.floor((30 + r * 7) * diff.missionRewardMult),
                    stones: Math.floor((10 + r * 5) * diff.missionRewardMult)
                }
            };
        }
    },
    dark_ritual: {
        id: "dark_ritual",
        text: "У Алтаря Поглощения начертаны руны нового ритуала. Камни — плата за знание, которое Бездна готова открыть.",
        type: "resource",
        generate: (g, diff) => {
            const r = g.realmIndex;
            const amount = Math.floor((30 + r * 15 + r * r * 4) * diff.missionCostMult);
            return {
                description: `Сдать ${amount} камней для ритуала`,
                cost: { stones: amount },
                reward: {
                    contribution: Math.floor((35 + r * 6) * diff.missionRewardMult)
                }
            };
        }
    },

    // === Ресурсные (пыль / эссенция) — minRank: 2 (Ядровой+) ===
    donate_dust: {
        id: "donate_dust",
        text: "Мастера артефактов нуждаются в пыли для исследований.",
        type: "resource",
        minRank: 2,
        generate: (g, diff) => {
            const r = g.realmIndex;
            const amount = Math.floor((3 + r * 2 + r * r * 0.3) * diff.missionCostMult);
            return {
                description: `Сдать ${amount} пыли артефактов`,
                cost: { dust: amount },
                reward: { contribution: Math.floor((18 + r * 4) * diff.missionRewardMult) }
            };
        }
    },
    donate_essence: {
        id: "donate_essence",
        text: "Секта изучает сущность Дао. Пожертвуйте эссенцию для исследований.",
        type: "resource",
        minRank: 2,
        generate: (g, diff) => {
            const r = g.realmIndex;
            const amount = Math.floor((8 + r * 5 + r * r * 1.5) * diff.missionCostMult);
            return {
                description: `Сдать ${amount} эссенции Дао`,
                cost: { essence: amount },
                reward: {
                    contribution: Math.floor((22 + r * 5) * diff.missionRewardMult),
                    daoScroll: 1
                }
            };
        }
    },

    // === Общие новые ===
    gather_pills: {
        id: "gather_pills",
        text: "Лекарственная палата нуждается в пилюлях.",
        type: "resource",
        generate: (g, diff) => {
            const r = g.realmIndex;
            const amount = Math.max(1, Math.floor((1 + r * 0.8) * diff.missionCostMult));
            return {
                description: `Сдать ${amount} ${_plural(amount, "пилюлю", "пилюли", "пилюль")}`,
                cost: { pills: amount },
                reward: {
                    contribution: Math.floor((20 + r * 5) * diff.missionRewardMult),
                    stones: Math.floor((8 + r * 3) * diff.missionRewardMult)
                }
            };
        }
    },
    prove_strength: {
        id: "prove_strength",
        text: "Старейшины хотят проверить вашу физическую силу.",
        type: "combat",
        generate: (g, diff) => {
            const r = g.realmIndex;
            const needed = Math.floor((5 + r * 4 + r * r * 0.3) * diff.missionCostMult);
            return {
                description: `Сила ${needed}+ для прохождения испытания`,
                check: { strength: needed },
                reward: { contribution: Math.floor((15 + r * 4) * diff.missionRewardMult) }
            };
        }
    },
    prove_spirit: {
        id: "prove_spirit",
        text: "Тишина ждёт. Покажите глубину духа — путь к мастерству лежит через познание себя.",
        type: "meditation",
        generate: (g, diff) => {
            const r = g.realmIndex;
            const needed = Math.floor((5 + r * 4 + r * r * 0.3) * diff.missionCostMult);
            return {
                description: `Дух ${needed}+ для прохождения`,
                check: { spirit: needed },
                reward: { contribution: Math.floor((15 + r * 4) * diff.missionRewardMult) }
            };
        }
    },
    perform_breakthroughs: {
        id: "perform_breakthroughs",
        text: "Путь к вершине лежит через прорыв. Каждая преодолённая ступень укрепляет и вас, и секту.",
        type: "cultivation",
        generate: (g, diff) => {
            const r = g.realmIndex;
            const count = 1;
            return {
                description: `Совершить ${count} ${_plural(count, "прорыв", "прорыва", "прорывов")}`,
                check: { breakthroughs: count },
                reward: { contribution: Math.floor((25 + r * 6) * diff.missionRewardMult) }
            };
        }
    },

    // === Задания за артефакты (Внутренний+) ===
    relic_hunt: {
        id: "relic_hunt",
        text: "Разведчики обнаружили реликт в тайном царстве. Секта отправляет вас — сила и осторожность понадобятся в равной мере.",
        type: "combat",
        minRank: 1,
        generate: (g, diff) => {
            const r = g.realmIndex;
            const powerNeeded = Math.floor((12 + r * 6 + r * r * 0.8) * diff.missionCostMult);
            const tier = r >= 5 ? "uncommon" : "common";
            return {
                description: `Боевая мощь ${powerNeeded}+ — добыть реликт`,
                check: { combatPower: powerNeeded },
                reward: {
                    contribution: Math.floor((15 + r * 4) * diff.missionRewardMult),
                    artifact: tier
                }
            };
        }
    },
    treasure_expedition: {
        id: "treasure_expedition",
        text: "Секта обнаружила вход в тайное хранилище. Нужна сила для вскрытия печатей.",
        type: "combat",
        minRank: 1,
        generate: (g, diff) => {
            const r = g.realmIndex;
            const powerNeeded = Math.floor((18 + r * 8 + r * r * 1.2) * diff.missionCostMult);
            const tier = r >= 6 ? "rare" : r >= 3 ? "uncommon" : "common";
            return {
                description: `Боевая мощь ${powerNeeded}+ — вскрыть хранилище`,
                check: { combatPower: powerNeeded },
                reward: {
                    contribution: Math.floor((20 + r * 5) * diff.missionRewardMult),
                    artifact: tier
                }
            };
        }
    },
    sect_armory: {
        id: "sect_armory",
        text: "За выдающийся вклад секта открывает доступ к оружейной. Выберите награду.",
        type: "resource",
        minRank: 2,
        generate: (g, diff) => {
            const r = g.realmIndex;
            const stones = Math.floor((40 + r * 15 + r * r * 4) * diff.missionCostMult);
            const tier = r >= 5 ? "rare" : "uncommon";
            return {
                description: `Сдать ${stones} камней за доступ в оружейную`,
                cost: { stones: stones },
                reward: {
                    contribution: Math.floor((25 + r * 6) * diff.missionRewardMult),
                    artifact: tier
                }
            };
        }
    },

    // === Ветеранские задания (Старейшина+) — награда: Свитки Воли Дао ===
    elder_trial_strength: {
        id: "elder_trial_strength",
        text: "Испытание Старейшин: докажите свою мощь в бою с элитными стражами секты.",
        type: "combat",
        minRank: 3,
        generate: (g, diff) => {
            const r = g.realmIndex;
            const powerNeeded = Math.floor((30 + r * 12 + r * r * 2) * diff.missionCostMult);
            return {
                description: `Боевая мощь ${powerNeeded}+ для испытания`,
                check: { combatPower: powerNeeded },
                reward: {
                    contribution: Math.floor((40 + r * 10) * diff.missionRewardMult),
                    daoScroll: 1
                }
            };
        }
    },
    elder_trial_spirit: {
        id: "elder_trial_spirit",
        text: "Испытание Духа: Старейшины проверяют глубину вашего постижения Дао.",
        type: "meditation",
        minRank: 3,
        generate: (g, diff) => {
            const r = g.realmIndex;
            const needed = Math.floor((12 + r * 6 + r * r * 0.5) * diff.missionCostMult);
            return {
                description: `Дух ${needed}+ для прохождения`,
                check: { spirit: needed },
                reward: {
                    contribution: Math.floor((35 + r * 8) * diff.missionRewardMult),
                    daoScroll: 1
                }
            };
        }
    },
    elder_offering: {
        id: "elder_offering",
        text: "Великое подношение: секта просит значительный вклад ресурсами в обмен на древний свиток.",
        type: "resource",
        minRank: 3,
        generate: (g, diff) => {
            const r = g.realmIndex;
            const stones = Math.floor((60 + r * 25 + r * r * 6) * diff.missionCostMult);
            return {
                description: `Сдать ${stones} духовных камней`,
                cost: { stones: stones },
                reward: {
                    contribution: Math.floor((50 + r * 12) * diff.missionRewardMult),
                    daoScroll: 1
                }
            };
        }
    },

    // === Задания Главы Зала (minRank: 4) — чистые награды, без сдачи ресурсов ===
    hall_master_treasury: {
        id: "hall_master_treasury",
        text: "Глава Зала открывает доступ к тайной сокровищнице секты.",
        type: "combat",
        minRank: 4,
        generate: (g, diff) => {
            const r = g.realmIndex;
            const powerNeeded = Math.floor((40 + r * 15 + r * r * 2.5) * diff.missionCostMult);
            return {
                description: `Боевая мощь ${powerNeeded}+ — пройти стражей сокровищницы`,
                check: { combatPower: powerNeeded },
                reward: {
                    contribution: Math.floor((60 + r * 15) * diff.missionRewardMult),
                    stones: Math.floor((30 + r * 12) * diff.missionRewardMult),
                    daoScroll: 1
                }
            };
        }
    },
    hall_master_artifact: {
        id: "hall_master_artifact",
        text: "Секта поручает Главе Зала возглавить экспедицию за древним артефактом.",
        type: "combat",
        minRank: 4,
        generate: (g, diff) => {
            const r = g.realmIndex;
            const powerNeeded = Math.floor((50 + r * 18 + r * r * 3) * diff.missionCostMult);
            const tier = r >= 8 ? "epic" : r >= 5 ? "rare" : "uncommon";
            return {
                description: `Боевая мощь ${powerNeeded}+ — добыть древний артефакт`,
                check: { combatPower: powerNeeded },
                reward: {
                    contribution: Math.floor((50 + r * 12) * diff.missionRewardMult),
                    artifact: tier
                }
            };
        }
    },
    hall_master_wisdom: {
        id: "hall_master_wisdom",
        text: "Глава Зала проводит закрытое духовное испытание для совета секты.",
        type: "meditation",
        minRank: 4,
        generate: (g, diff) => {
            const r = g.realmIndex;
            const needed = Math.floor((18 + r * 8 + r * r * 0.8) * diff.missionCostMult);
            return {
                description: `Дух ${needed}+ для прохождения совета`,
                check: { spirit: needed },
                reward: {
                    contribution: Math.floor((55 + r * 14) * diff.missionRewardMult),
                    daoScroll: 2,
                    stones: Math.floor((20 + r * 8) * diff.missionRewardMult)
                }
            };
        }
    },

    // === Скрытая Секта (very_hard) ===
    deep_meditation: {
        id: "deep_meditation",
        text: "Отшельники требуют глубочайшей медитации. Путь к Дао лежит через тишину.",
        type: "meditation",
        generate: (g, diff) => {
            const r = g.realmIndex;
            const years = Math.floor((10 + r * 3 + Math.floor(r / 3) * 4) * diff.missionCostMult);
            return {
                description: `Медитировать ${years} ${_plural(years, "год", "года", "лет")}`,
                check: { meditationYears: years },
                reward: {
                    contribution: Math.floor((25 + r * 6) * diff.missionRewardMult),
                    stones: Math.floor((15 + r * 4) * diff.missionRewardMult)
                }
            };
        }
    },
    dao_comprehension: {
        id: "dao_comprehension",
        text: "Постичь фрагмент Великого Дао. Требует духовных камней и мудрости.",
        type: "resource",
        generate: (g, diff) => {
            const r = g.realmIndex;
            const amount = Math.floor((40 + r * 18 + r * r * 5) * diff.missionCostMult);
            return {
                description: `Сдать ${amount} камней для постижения`,
                cost: { stones: amount },
                reward: {
                    contribution: Math.floor((40 + r * 8) * diff.missionRewardMult)
                }
            };
        }
    },

    // === Алхимические задания (Лунное Озеро) ===
    gather_herbs: {
        id: "gather_herbs",
        text: "Алхимический зал нуждается в редких духовных травах для варки эликсиров.",
        type: "resource",
        generate: (g, diff) => {
            const r = g.realmIndex;
            const needed = Math.floor((3 + r * 2) * diff.missionCostMult);
            return {
                description: `Удача ${needed}+ для поиска трав`,
                check: { luck: needed },
                reward: {
                    contribution: Math.floor((18 + r * 4) * diff.missionRewardMult),
                    pills: Math.max(1, Math.floor((1 + r * 0.5) * diff.missionRewardMult))
                }
            };
        }
    },
    donate_pills_sect: {
        id: "donate_pills_sect",
        text: "Секта просит пожертвовать пилюли для нужд лекарственной палаты.",
        type: "resource",
        generate: (g, diff) => {
            const r = g.realmIndex;
            const amount = Math.max(2, Math.floor((2 + r * 1.5) * diff.missionCostMult));
            return {
                description: `Пожертвовать ${amount} ${_plural(amount, "пилюлю", "пилюли", "пилюль")} секте`,
                check: { pillsDonated: amount },
                reward: {
                    contribution: Math.floor((25 + r * 6) * diff.missionRewardMult),
                    stones: Math.floor((10 + r * 3) * diff.missionRewardMult)
                }
            };
        }
    },
};
