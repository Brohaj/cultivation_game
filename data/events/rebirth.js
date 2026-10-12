// ============================================================
// EVENTS/REBIRTH.JS — События, связанные с перерождениями
// Флаги сбрасываются каждую жизнь — повторяются между жизнями
// Тайник использует prestige.lastLifeResources (ресурсы до перерождения)
// ============================================================

EVENTS.push(
    // --- 1+ перерождение ---
    {
        id: "rebirth_dejavu",
        text: "Странное чувство дежавю. Вы точно были здесь раньше... Обрывок воспоминания подсказывает, где искать.",
        type: "reward",
        condition: (g) => g.prestige.totalRebirths >= 1 && !g.flags.rebirth_dejavu,
        effect: (g) => {
            g.flags.rebirth_dejavu = true;
            g.spirit += 1;
            return "+1 дух (вспышка памяти прошлой жизни)";
        }
    },
    // --- 2+ перерождения ---
    {
        id: "rebirth_body_memory",
        text: "Ваше тело помнит то, что разум забыл. Руки сами принимают боевую стойку. Мышечная память пробуждается.",
        type: "reward",
        condition: (g) => g.prestige.totalRebirths >= 2 && !g.flags.rebirth_body_memory && g.realmIndex >= 2,
        effect: (g) => {
            g.flags.rebirth_body_memory = true;
            g.strength += 1;
            g.spirit += 1;
            return "+1 сила, +1 дух (память тела)";
        }
    },
    {
        id: "rebirth_old_stash",
        text: "Во сне вы увидели место, где в прошлой жизни спрятали запасы. Проснувшись, вы точно знаете, куда идти.",
        type: "reward",
        condition: (g) => {
            if (g.prestige.totalRebirths < 2 || g.flags.rebirth_old_stash) return false;
            if (g.realmIndex < 3) return false;
            return g.prestige.lastLifeResources != null;
        },
        effect: (g) => {
            g.flags.rebirth_old_stash = true;
            const res = g.prestige.lastLifeResources;
            if (!res) return "+0 (тайник пуст)";

            const rebirths = g.prestige.totalRebirths;
            // 5% базово, +2% за каждое перерождение, макс 25%
            const pct = Math.min(0.25, 0.05 + (rebirths - 1) * 0.02);

            // Выбрать случайный ресурс, в котором что-то было
            const available = [];
            if (res.stones > 10) available.push("stones");
            if (res.pills > 1) available.push("pills");
            if (res.essence > 10) available.push("essence");
            if (res.dust > 5) available.push("dust");
            if (available.length === 0) return "+0 (тайник пуст)";

            const pick = available[Math.floor(Math.random() * available.length)];
            const names = { stones: "камней", pills: "пилюль", essence: "эссенции", dust: "пыли" };
            const props = { stones: "stones", pills: "pills", essence: "daoEssence", dust: "artifactDust" };

            const amount = Math.max(1, Math.floor((res[pick] || 0) * pct));
            g[props[pick]] += amount;
            return `+${amount} ${names[pick]} (${Math.round(pct * 100)}% из тайника прошлой жизни)`;
        }
    },
    // --- 3+ перерождения ---
    {
        id: "rebirth_karmic_debt",
        text: "Тёмная фигура в капюшоне преградила путь. «Ты задолжал мне из прошлой жизни. Плати камнями — или я возьму ци.»",
        type: "danger",
        condition: (g) => g.prestige.totalRebirths >= 3 && !g.flags.rebirth_karmic_debt && g.realmIndex >= 4,
        effect: (g) => {
            g.flags.rebirth_karmic_debt = true;
            const cost = 20 + g.prestige.totalRebirths * 5;
            if (g.stones >= cost) {
                g.stones -= cost;
                const essReward = Math.floor(cost * 1.5);
                g.daoEssence += essReward;
                return `-${cost} камней → +${essReward} эссенции (долг погашен, дух-кредитор отдал эссенцию)`;
            } else {
                const qiLoss = Math.floor(g.qi * 0.15);
                g.qi -= qiLoss;
                return `-${qiLoss} ци (кармический долг взыскан силой)`;
            }
        }
    },
    {
        id: "rebirth_familiar_enemy",
        text: "Культиватор с пугающе знакомым лицом перегородил вам путь. На миг вы вспомнили удары его меча — из одной из прошлых жизней или из сна. Он вас не узнаёт.",
        type: "danger",
        condition: (g) => g.prestige.totalRebirths >= 3 && !g.flags.rebirth_familiar_enemy && g.realmIndex >= 5,
        effect: (g) => {
            g.flags.rebirth_familiar_enemy = true;
            const power = g.getCombatPower();
            const needed = 10 + g.realmIndex * 8;
            if (power >= needed) {
                g.strength += 1;
                g.luck += 1;
                return `Победа! +1 сила, +1 удача (месть свершилась)`;
            } else {
                g.qi -= Math.floor(g.qi * 0.20);
                return "Поражение... Он всё ещё сильнее. -20% ци";
            }
        }
    },
    // --- 5+ перерождений: шанс технику найти ---
    {
        id: "rebirth_dao_echo",
        text: "Медитируя, вы услышали свой голос из прошлой жизни. «Запомни эту формулу...» Обрывки древних техник хлынули потоком.",
        type: "reward",
        condition: (g) => g.prestige.totalRebirths >= 5 && !g.flags.rebirth_dao_echo && g.realmIndex >= 6,
        effect: (g) => {
            g.flags.rebirth_dao_echo = true;
            const results = [];

            // Свиток Дао
            const scrolls = g.addDaoScroll(1);
            if (scrolls > 0) results.push("+1 Свиток Воли Дао");

            // Шанс на технику (до epic включительно)
            const maxTiers = ["common", "uncommon", "rare", "epic"];
            const unlearned = g.getRewardTechniquePool(maxTiers);
            if (unlearned.length > 0 && Math.random() < 0.50) {
                const tech = unlearned[Math.floor(Math.random() * unlearned.length)];
                g.learnTechnique(tech.id);
                results.push(`техника: ${tech.name}`);
            }

            return results.length > 0 ? results.join(", ") + " (эхо Древнего Дао)" : "Голос затих, не успев договорить...";
        }
    },
    // --- 7+ перерождений: тайник побольше + техника ---
    {
        id: "rebirth_master",
        text: "Старый отшельник заглянул вам в глаза и побледнел. «Семь жизней... Ты — Перерождённый Мастер. Прими этот свиток и знания, что принадлежали тебе в первой жизни.»",
        type: "reward",
        condition: (g) => g.prestige.totalRebirths >= 7 && !g.flags.rebirth_master && g.realmIndex >= 8,
        effect: (g) => {
            g.flags.rebirth_master = true;
            const results = [];

            // Свиток Дао
            const scrolls = g.addDaoScroll(2);
            if (scrolls > 0) results.push(`+${scrolls} Свиток Воли Дао`);

            // Техника (гарантированная, до epic)
            const maxTiers = ["common", "uncommon", "rare", "epic"];
            const unlearned = g.getRewardTechniquePool(maxTiers);
            if (unlearned.length > 0) {
                const tech = unlearned[Math.floor(Math.random() * unlearned.length)];
                g.learnTechnique(tech.id);
                results.push(`техника: ${tech.name}`);
            }

            // Тайник из прошлой жизни (15% ресурсов)
            const res = g.prestige.lastLifeResources;
            if (res) {
                const pct = 0.15;
                if (res.stones > 0) {
                    const amt = Math.floor(res.stones * pct);
                    if (amt > 0) { g.stones += amt; results.push(`+${amt} камней`); }
                }
                if (res.essence > 0) {
                    const amt = Math.floor(res.essence * pct);
                    if (amt > 0) { g.daoEssence += amt; results.push(`+${amt} эссенции`); }
                }
            }

            return results.join(", ") + " (дар Перерождённого Мастера)";
        }
    },
    // --- 10+ перерождений: 2 техники + большой тайник ---
    {
        id: "rebirth_forgotten",
        text: "Вы нашли древнюю пещеру. Внутри — ваши собственные записи тысячелетней давности. Два свитка техник и сундук ресурсов, спрятанные вами десять жизней назад.",
        type: "reward",
        condition: (g) => g.prestige.totalRebirths >= 10 && !g.flags.rebirth_forgotten && g.realmIndex >= 9,
        effect: (g) => {
            g.flags.rebirth_forgotten = true;
            const results = [];

            // 2 техники (до epic)
            const maxTiers = ["common", "uncommon", "rare", "epic"];
            const unlearned = g.getRewardTechniquePool(maxTiers);
            for (let i = 0; i < 2 && unlearned.length > 0; i++) {
                const idx = Math.floor(Math.random() * unlearned.length);
                const tech = unlearned.splice(idx, 1)[0];
                g.learnTechnique(tech.id);
                results.push(`техника: ${tech.name}`);
            }

            // Свитки
            const scrolls = g.addDaoScroll(2);
            if (scrolls > 0) results.push(`+${scrolls} Свиток Воли Дао`);

            // Тайник 20% ресурсов
            const res = g.prestige.lastLifeResources;
            if (res) {
                const pct = 0.20;
                for (const [key, prop] of [["stones", "stones"], ["pills", "pills"], ["essence", "daoEssence"], ["dust", "artifactDust"]]) {
                    const amt = Math.floor((res[key] || 0) * pct);
                    if (amt > 0) {
                        g[prop] += amt;
                        const names = { stones: "камней", pills: "пилюль", essence: "эссенции", dust: "пыли" };
                        results.push(`+${amt} ${names[key]}`);
                    }
                }
            }

            return results.join(", ") + " (наследие десяти жизней)";
        }
    }
);
