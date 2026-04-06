// ============================================================
// EVENTS/ARTIFACT_FIND.JS — Артефакты для новой жизни
// Если у игрока нет экипированных артефактов (realm 1+, первые 200 лет)
// Один эвент на слот, разный флейвор
// ============================================================

EVENTS.push(
    {
        id: "find_weapon",
        text: "В расщелине скалы что-то блеснуло. Вы протянули руку — и пальцы сомкнулись на рукояти старого оружия. Оно тёплое, будто ждало именно вас.",
        type: "reward",
        condition: (g) => g.realmIndex >= 1 && g.characterAge() <= 200 && !g.equippedArtifacts.weapon && !g.flags.found_weapon,
        effect: (g) => {
            g.flags.found_weapon = true;
            const art = g.generateArtifact(null, "weapon");
            if (art) {
                g.addArtifact(art);
                g.equippedArtifacts.weapon = art;
                return `Найдено оружие: ${art.name}! Экипировано.`;
            }
            return "Оружие рассыпалось в руках...";
        }
    },
    {
        id: "find_armor",
        text: "Старая мантия висела на ветке мёртвого дерева. Ни пыли, ни дыр — словно кто-то оставил её вчера. Ткань мягко легла на плечи.",
        type: "reward",
        condition: (g) => g.realmIndex >= 1 && g.characterAge() <= 200 && !g.equippedArtifacts.armor && !g.flags.found_armor,
        effect: (g) => {
            g.flags.found_armor = true;
            const art = g.generateArtifact(null, "armor");
            if (art) {
                g.addArtifact(art);
                g.equippedArtifacts.armor = art;
                return `Найдена броня: ${art.name}! Экипирована.`;
            }
            return "Мантия рассыпалась при прикосновении...";
        }
    },
    {
        id: "find_accessory",
        text: "На берегу ручья лежал амулет. Камень в нём пульсировал в такт вашему сердцу. Вы надели его — и ци потекла ровнее.",
        type: "reward",
        condition: (g) => g.realmIndex >= 1 && g.characterAge() <= 200 && !g.equippedArtifacts.accessory && !g.flags.found_accessory,
        effect: (g) => {
            g.flags.found_accessory = true;
            const art = g.generateArtifact(null, "accessory");
            if (art) {
                g.addArtifact(art);
                g.equippedArtifacts.accessory = art;
                return `Найден аксессуар: ${art.name}! Экипирован.`;
            }
            return "Амулет потух...";
        }
    },
    {
        id: "find_treasure",
        text: "Под корнями древнего дуба — свёрток, обёрнутый в истлевший шёлк. Внутри — предмет, испускающий слабое свечение. Он гудит от накопленной ци.",
        type: "reward",
        condition: (g) => g.realmIndex >= 1 && g.characterAge() <= 200 && !g.equippedArtifacts.treasure && !g.flags.found_treasure,
        effect: (g) => {
            g.flags.found_treasure = true;
            const art = g.generateArtifact(null, "treasure");
            if (art) {
                g.addArtifact(art);
                g.equippedArtifacts.treasure = art;
                return `Найдено сокровище: ${art.name}! Экипировано.`;
            }
            return "Предмет рассыпался в пыль...";
        }
    }
);
