// ============================================================
// EVENTS/CAMEOS.JS — Пасхалки из сянься-новелл + артефактные события
// ============================================================

MANHUA_ENCOUNTERS.push(
    // --- Secretly Cultivate for a Thousand Years ---
    {
        id: "dark_lord_aura",
        text: "Вдалеке вы заметили человека, медитирующего у обрыва. Его аура... невозможно мощная. Давление пригнуло вас к земле. Он даже не повернул головы.",
        type: "event",
        condition: (g) => g.realmIndex >= 2 && !g.flags.met_dark_lord,
        weight: 0.02,
        effect: (g) => {
            g.flags.met_dark_lord = true;
            const bonus = eventQiBonus(g,0.25);
            g.qi += bonus;
            return `+${bonus} ци от воздействия его ауры. Говорят, он культивирует тут уже тысячу лет... и не собирается останавливаться.`;
        }
    },
    {
        id: "dark_lord_rumor",
        text: "В таверне шепчутся о Тёмном Запретном Владыке — существе, которого боятся даже Бессмертные. Говорят, он никогда не покидает свою гору...",
        type: "event",
        condition: (g) => g.realmIndex >= 4 && !g.flags.heard_dark_lord,
        weight: 0.04,
        effect: (g) => {
            g.flags.heard_dark_lord = true;
            g.luck += 1;
            return "+1 удача. Знание о великих мира сего — тоже своего рода удача.";
        }
    },

    // --- I Shall Seal the Heavens (Мэн Хао) ---
    {
        id: "pill_merchant",
        text: "На рынке к вам подбежал юноша с безумным блеском в глазах. «Купите медицинские пилюли! Отличного качества! Почти не просрочены!» Он торговался так отчаянно, что было проще купить.",
        type: "event",
        condition: (g) => g.realmIndex >= 1 && g.realmIndex <= 6 && g.stones >= 5 && !g.flags.met_pill_merchant,
        weight: 0.03,
        effect: (g) => {
            g.flags.met_pill_merchant = true;
            g.stones -= 5;
            g.pills += 3;
            g.luck += 1;
            return "-5 камней, +3 пилюли, +1 удача. Пилюли оказались... неожиданно хороши. Кто этот торгаш?";
        }
    },

    // --- A Will Eternal (Бай Сяочунь) ---
    {
        id: "alchemy_explosion",
        text: "БАБАХ! Алхимическая печь в соседней хижине взорвалась! Из дыма вылетел перепуганный юноша, вопя: «Я не виноват! Она сама!» Весь район затянуло зелёным облаком.",
        type: "danger",
        condition: (g) => g.realmIndex >= 1 && g.realmIndex <= 5 && !g.flags.saw_explosion,
        weight: 0.03,
        effect: (g) => {
            g.flags.saw_explosion = true;
            const loss = Math.floor(g.qi * 0.05);
            g.qi = Math.max(0, g.qi - loss);
            g.spirit += 1;
            return `-${loss} ци от токсичного облака, но +1 дух — вы поклялись никогда не заниматься алхимией рядом с таким соседом.`;
        }
    },

    // --- Renegade Immortal (Ван Линь) ---
    {
        id: "cold_gaze",
        text: "Молчаливый культиватор в потрёпанных одеждах прошёл мимо. На мгновение ваши глаза встретились — и вы ощутили волю, способную разрушить горы. Он отвёл взгляд, словно вы — пустое место.",
        type: "event",
        condition: (g) => g.realmIndex >= 3 && !g.flags.met_cold_gaze,
        weight: 0.02,
        effect: (g) => {
            g.flags.met_cold_gaze = true;
            g.spirit += 1;
            g.strength += 1;
            return "+1 дух, +1 сила. Этот взгляд вы не забудете. В нём не было злобы — только бесконечная решимость.";
        }
    },

    // --- Against the Gods (Юнь Чэ) ---
    {
        id: "miracle_survivor",
        text: "Местные обсуждают юношу, который упал с обрыва, был отравлен, предан невестой и атакован старейшинами секты. Он выжил. Снова. И стал сильнее. Снова.",
        type: "event",
        condition: (g) => g.realmIndex >= 2 && g.realmIndex <= 7 && !g.flags.heard_survivor,
        weight: 0.03,
        effect: (g) => {
            g.flags.heard_survivor = true;
            g.luck += 1;
            return "+1 удача. Если ОН может выжить после всего этого — у вас тоже есть шанс.";
        }
    },

    // --- Coiling Dragon (Линли) ---
    {
        id: "sculptor_cultivator",
        text: "В парке пожилой скульптор вырезает статую из цельной скалы. Каждое движение резца — как удар меча. В каменной крошке вы ощущаете... понимание Закона Земли?",
        type: "event",
        condition: (g) => g.realmIndex >= 3 && !g.flags.met_sculptor,
        weight: 0.02,
        effect: (g) => {
            g.flags.met_sculptor = true;
            g.spirit += 1;
            const bonus = eventQiBonus(g,0.1);
            g.qi += bonus;
            return `+1 дух, +${bonus} ци. Искусство и культивация — не так уж далеки друг от друга.`;
        }
    },

    // --- Battle Through the Heavens (Сяо Янь) ---
    {
        id: "broken_ring",
        text: "На стене постоялого двора кто-то нацарапал: «Через три года, на этом самом месте, я верну тебе этот позор!» Рядом на полу валяется сломанное кольцо. Внутри — слабый отголосок чужого сознания.",
        type: "event",
        condition: (g) => g.realmIndex >= 1 && g.realmIndex <= 5 && !g.flags.found_ring,
        weight: 0.03,
        effect: (g) => {
            g.flags.found_ring = true;
            g.strength += 1;
            return "+1 сила. Чужая решимость зажгла огонь и в вашем сердце.";
        }
    },

    // --- Desolate Era (Цзи Нин) ---
    {
        id: "lake_swordsman",
        text: "У горного озера вы увидели мечника в белом. Один взмах — и вода расступилась от берега до берега. Озеро не смыкалось целый час. Мечник ушёл, даже не оглянувшись.",
        type: "event",
        condition: (g) => g.realmIndex >= 5 && !g.flags.saw_swordsman,
        weight: 0.02,
        effect: (g) => {
            g.flags.saw_swordsman = true;
            g.strength += 1;
            g.spirit += 1;
            const loss = Math.floor(g.qi * 0.05);
            g.qi = Math.max(0, g.qi - loss);
            return `+1 сила, +1 дух, -${loss} ци от давления его меча. Вот что значит — постичь Дао Меча.`;
        }
    },

    // --- Tales of Demons and Gods (Не Ли) ---
    {
        id: "junk_buyer",
        text: "Мальчишка лет тринадцати скупает «мусорные» артефакты на аукционе. Торговцы смеются. Старики качают головой. А у мальчишки в глазах — уверенность того, кто уже знает ответ.",
        type: "event",
        condition: (g) => g.realmIndex >= 2 && g.realmIndex <= 6 && !g.flags.met_junk_buyer,
        weight: 0.03,
        effect: (g) => {
            g.flags.met_junk_buyer = true;
            g.luck += 1;
            g.stones += 10;
            return "+1 удача, +10 камней. Вдохновившись, вы тоже порылись в отбросах — и нашли кое-что стоящее!";
        }
    },

    // --- Soul Land (Тан Сань) ---
    {
        id: "hidden_weapon_boy",
        text: "На арене юноша с травинкой во рту победил культиватора на две ступени выше. Никто не заметил, как он это сделал — только блеск чего-то крошечного и смертоносного в его руке.",
        type: "event",
        condition: (g) => g.flags.joinedSect && g.realmIndex >= 2 && !g.flags.met_weapon_boy,
        weight: 0.03,
        effect: (g) => {
            g.flags.met_weapon_boy = true;
            g.strength += 1;
            g.spirit += 1;
            return "+1 сила, +1 дух. Скрытое оружие... Вы задумались: может, сила — это не всегда грубая мощь?";
        }
    },

    // --- Stellar Transformations (Цинь Юй) ---
    {
        id: "star_gazer",
        text: "Ночью вы встретили юношу, который часами смотрел на звёзды. «Мой путь — не ци», — сказал он. «Мой путь — звёздный свет». Безумие? Но его тело излучало силу, невозможную для его ступени.",
        type: "event",
        condition: (g) => g.realmIndex >= 3 && !g.flags.met_stargazer,
        weight: 0.02,
        effect: (g) => {
            g.flags.met_stargazer = true;
            g.spirit += 1;
            g.luck += 1;
            return "+1 дух, +1 удача. Возможно, путей к вершине — больше, чем вы думали.";
        }
    },

    // --- Артефакты ---
    {
        id: "artifact_cave",
        text: "В горной пещере вы обнаружили тайник древнего культиватора. Среди пыли блеснул артефакт!",
        type: "reward",
        condition: (g) => g.realmIndex >= 2,
        effect: (g) => {
            const art = g.generateArtifact();
            if (g.addArtifact(art)) {
                return `Найден артефакт: ${art.name}!`;
            }
            return "Инвентарь полон, артефакт рассыпался в пыль.";
        }
    },
    {
        id: "artifact_merchant",
        text: "Странствующий торговец предложил вам необычный предмет за 30 камней.",
        type: "event",
        condition: (g) => g.realmIndex >= 3 && g.stones >= 30,
        effect: (g) => {
            g.stones -= 30;
            const art = g.generateArtifact("uncommon");
            if (g.addArtifact(art)) {
                return `-30 камней. Куплен: ${art.name}!`;
            }
            return "-30 камней. Инвентарь полон, предмет рассыпался.";
        }
    },
    {
        id: "artifact_battle_spoils",
        text: "После битвы с демоническим зверем вы подобрали светящийся предмет из его логова.",
        type: "reward",
        condition: (g) => g.realmIndex >= 4 && g.getCombatPower() >= 15,
        effect: (g) => {
            // Лучше тир на высоком реалме
            const tierRoll = g.realmIndex >= 8 ? "rare" : null;
            const art = g.generateArtifact(tierRoll);
            if (g.addArtifact(art)) {
                return `Трофей: ${art.name}!`;
            }
            return "Инвентарь полон, предмет был утерян.";
        }
    },
    {
        id: "artifact_trial_reward",
        text: "За успешное прохождение секретного испытания вам вручили ценный артефакт!",
        type: "reward",
        condition: (g) => g.realmIndex >= 6 && !g.flags.trial_artifact,
        effect: (g) => {
            g.flags.trial_artifact = true;
            const art = g.generateArtifact("rare");
            if (g.addArtifact(art)) {
                return `Награда: ${art.name}!`;
            }
            return "Инвентарь полон!";
        }
    },
    {
        id: "artifact_heavenly",
        text: "Небеса разверзлись, и луч света осветил предмет, лежащий перед вами. Божественная аура!",
        type: "reward",
        condition: (g) => g.realmIndex >= 10 && !g.flags.heavenly_artifact,
        effect: (g) => {
            g.flags.heavenly_artifact = true;
            const art = g.generateArtifact("epic");
            if (g.addArtifact(art)) {
                return `Небесный дар: ${art.name}!`;
            }
            return "Инвентарь полон!";
        }
    },
);
