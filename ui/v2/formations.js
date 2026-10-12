// Карточки формаций V2. Загружается после artifacts.js; игровые обработчики прежние.
(function () {
    const descriptions = {
        qiPillar: "Нефрит из Леса Духовных Трав собирает рассеянную ци.",
        breakthroughAltar: "Камни хранят отзвук первого прорыва основателя Нефритовой Чистоты.",
        bodyPagoda: "У Пещеры Древнего Зверя духовная энергия сгущается под давлением пагоды.",
        bladeArena: "Камень, закалённый пламенем Пещеры Зверя, хранит боевой дух.",
        alchemyFurnace: "Печь по чертежам забытой секты пробуждает силу пилюль.",
        wisdomLibrary: "Поколения алхимиков Лунного Озера собрали здесь свитки из древних руин.",
        wardCircle: "Руны на границе Бездны удерживают тьму за пределами разума.",
        absorptionAltar: "Чёрный камень Бездны обращает опасные столкновения в источник силы.",
        realmGate: "Ветра тайных царств сходятся во вратах, сокращающих путь между мирами.",
        fateHall: "На Вершине Ветров нити прожитой жизни сплетаются в карму."
    };

    function element(tag, className, text) {
        const node = document.createElement(tag);
        node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function effectText(formation, level) {
        const amount = Number((level * formation.effectPerLevel * 100).toFixed(1)).toLocaleString("ru-RU");
        const effects = {
            qi: `+${amount}% к накоплению ци`,
            statXpSpeed: `+${amount}% к усилению медитации`,
            techXpSpeed: `+${amount}% к обучению техник`,
            pillEffect: `+${amount}% к ци от пилюль`,
            karmaBonus: `+${amount}% к карме за жизнь`,
            expeditionSpeed: `+${amount}% к скорости походов`,
            combatPower: `+${amount}% к боевой мощи`,
            dangerReward: `+${amount}% к наградам опасных событий`,
            breakthroughBonus: `+${amount}% к шансу прорыва`,
            demonReduction: `−${amount}% к шансу внутреннего демона при провале`
        };
        return effects[formation.effectKey] || formation.description;
    }

    function card(formation, selected, maxSlots, perks) {
        const savedLevel = game.formations[formation.id] || 0;
        const level = selected ? savedLevel : savedLevel || Math.min(perks.formationBonus || 0, formation.maxLevel);
        const maximum = level >= formation.maxLevel;
        const nextLevel = level + 1;
        const daoReady = !formation.sect || (game.daoLevel || 0) >= nextLevel;
        const row = element("article", `formation-row v2-formation-card${selected ? " v2-formation-active" : ""}`);
        row.dataset.formationCard = formation.id;
        row.style.setProperty("--v2-formation-accent", formation.color);

        const heading = element("div", "v2-formation-heading");
        heading.appendChild(element("h4", "v2-formation-name", formation.name));
        heading.appendChild(element("span", "v2-formation-level", `${selected ? "Уровень" : "Старт"} ${level} / ${formation.maxLevel}`));
        row.appendChild(heading);

        const progress = element("div", "v2-formation-progress");
        progress.setAttribute("role", "progressbar");
        progress.setAttribute("aria-label", `Уровень формации «${formation.name}»${selected ? "" : " после выбора"}`);
        progress.setAttribute("aria-valuemin", "0");
        progress.setAttribute("aria-valuemax", String(formation.maxLevel));
        progress.setAttribute("aria-valuenow", String(level));
        const fill = element("span", "v2-formation-progress-fill");
        fill.style.width = `${Math.min(100, level / formation.maxLevel * 100)}%`;
        progress.appendChild(fill);
        row.appendChild(progress);
        row.appendChild(element("p", "v2-formation-lore", descriptions[formation.id] || window.V2_HELP?.formationLore?.[formation.id] || formation.description));

        const effect = element("p", "v2-formation-bonus");
        effect.appendChild(element("span", "v2-formation-bonus-label", selected ? level ? "Сейчас: " : "С уровня 1: " : level ? "После выбора: " : "За уровень: "));
        effect.appendChild(document.createTextNode(effectText(formation, level || 1)));
        effect.title = formation.description;
        row.appendChild(effect);

        const action = element("div", "v2-formation-footer");
        if (!selected) {
            const canSelect = !game.gameOver && game.selectedFormations.length < maxSlots;
            action.appendChild(element("span", "v2-formation-condition", canSelect ? "Займёт 1 место" : game.gameOver ? "Путь завершён" : "Все места заняты"));
            const button = element("button", "btn btn-small btn-primary-outline v2-formation-button", "Выбрать · бесплатно");
            button.type = "button";
            button.dataset.formationSelect = formation.id;
            button.disabled = !canSelect;
            button.title = "Выбор сохраняется до новой жизни. Снять формацию в этой жизни нельзя.";
            button.addEventListener("click", () => selectFormationUI(formation.id));
            action.appendChild(button);
        } else if (maximum) {
            action.appendChild(element("span", "v2-formation-complete", "Формация завершена · максимальный уровень"));
        } else {
            const step = element("div", "v2-formation-next");
            step.appendChild(element("span", `v2-formation-condition${daoReady ? " v2-formation-ready" : " v2-formation-needs-dao"}`, formation.sect ? `Следующий уровень: Дао ${nextLevel}` : `Следующий уровень: ${nextLevel}`));
            action.appendChild(step);
            const cost = game.getFormationUpgradeCost(formation.id);
            const button = element("button", "btn btn-small btn-secondary v2-formation-button");
            button.type = "button";
            button.dataset.formation = formation.id;
            // update.js обновляет доступность кнопок с data-cost только по камням.
            // При нехватке Дао этот атрибут появится после следующего полного рендера.
            if (daoReady) button.dataset.cost = String(cost);
            button.appendChild(document.createTextNode("Улучшить "));
            const price = element("span", "v2-resource-stones v2-formation-price");
            price.appendChild(element("span", "v2-formation-stone-icon", "◇"));
            price.firstChild.setAttribute("aria-hidden", "true");
            price.appendChild(document.createTextNode(` ${cost.toLocaleString("ru-RU")}`));
            button.appendChild(price);
            button.disabled = game.gameOver || !daoReady || game.stones < cost;
            button.title = `Уровень ${nextLevel}: ${effectText(formation, nextLevel)}. Улучшение стоит ${cost} духовных камней.${!daoReady ? ` Сначала развейте путь секты до Дао ${nextLevel}.` : ""}`;
            button.setAttribute("aria-label", `Улучшить ${formation.name} до уровня ${nextLevel} за ${cost} духовных камней`);
            button.addEventListener("click", () => buyFormationUI(formation.id));
            action.appendChild(button);
        }
        row.appendChild(action);
        return row;
    }

    window.renderFormations = function renderFormations() {
        if (deferUIRender(renderFormations)) return;
        const container = document.getElementById("formations-list");
        if (!container) return;
        container.classList.add("v2-formations-list");
        if (game.realmIndex < 3) {
            container.replaceChildren();
            return;
        }
        const perks = game.getActiveBodyPerks();
        const maxSlots = MAX_FORMATION_SLOTS + (perks.formationSlots || 0)
            + (game.prestige.karmaUpgrades.formationSlot || 0) + game.getEraFormationSlotBonus();
        const fragment = document.createDocumentFragment();
        const count = document.getElementById("v2-formation-summary");
        if (count) count.textContent = `· ${game.selectedFormations.length}/${maxSlots}`;

        const unlocked = game.prestige.unlockedFormations || [];
        const chosen = game.selectedFormations.map(id => CULT_FORMATIONS.find(f => f.id === id)).filter(Boolean);
        const available = CULT_FORMATIONS.filter(f => !game.isFormationSelected(f.id) && (!f.sect || unlocked.includes(f.id)));
        for (const [title, formations, selected] of [["Действующие", chosen, true], ["Доступные для выбора", available, false]]) {
            if (!formations.length) continue;
            const group = element("div", "v2-formations-group");
            if (!selected) group.appendChild(element("h4", "v2-formations-group-title", title));
            const grid = element("div", "v2-formations-grid");
            grid.setAttribute("aria-label", title);
            for (const formation of formations) grid.appendChild(card(formation, selected, maxSlots, perks));
            group.appendChild(grid);
            fragment.appendChild(group);
        }
        if (!chosen.length && !available.length) fragment.appendChild(element("p", "v2-formations-empty", "Вступите в секту, чтобы открыть её формации."));
        container.replaceChildren(fragment);
    };
})();
