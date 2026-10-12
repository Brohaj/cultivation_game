// ============================================================
// UI/SECTS.JS — Таб секты: вступление, ранг, задания
// ============================================================

let _sectAnimLock = false;
const _v2SectDetails = {};

function _v2SectTrainingText(sect) {
    if (sect.id === "hidden_hermit") return "Любая тренировка, кроме медитации · ×0,5.";
    const names = { meditation: "Медитация", body: "Тренировка силы", dao: "Развитие духа", fate: "Испытание судьбы" };
    const activities = Array.isArray(sect.daoActivity) ? sect.daoActivity : [sect.daoActivity];
    return activities.map(activity => names[activity] || activity).join(" или ") + ".";
}

function _v2SectOpen(key) {
    return _v2SectDetails[key] ? " open" : "";
}

function updateSectRankBar() {
    const fill = document.getElementById("sect-rank-bar-fill");
    const pctEl = document.getElementById("sect-rank-bar-pct");
    if (!fill || !pctEl || !game.sect) return;
    const ranks = getSectRanks(game.sect.id);
    const rankIdx = game.getSectRankIndex();
    const rank = ranks[rankIdx];
    const nextRank = ranks[rankIdx + 1];
    if (!nextRank) return;
    const pct = Math.min(100, ((game.sect.contribution - rank.contribution) / (nextRank.contribution - rank.contribution)) * 100);
    fill.style.width = pct + "%";
    pctEl.textContent = pct.toFixed(0) + "%";
}

function renderSects() {
    if (deferUIRender(renderSects)) return;
    const container = document.getElementById("sects-list");
    if (!container) return;
    container.classList.add("v2-sect-screen");
    container.classList.toggle("v2-sect-member", !!game.sect);
    // Не перерисовывать пока идёт анимация завершения/повышения
    if (_sectAnimLock || container.querySelector(".sect-rankup-overlay")) return;
    container.querySelectorAll("details[data-sect-detail]").forEach(detail => {
        _v2SectDetails[detail.dataset.sectDetail] = detail.open;
    });
    container.innerHTML = "";

    if (!game.sect) {
        // Выбор секты
        container.innerHTML = "<h3>Выберите секту</h3>";
        const desc = document.createElement("p");
        desc.className = "empty-msg";
        desc.textContent = "Каждая секта хранит свой путь, техники и формации.";
        container.appendChild(desc);

        const grid = document.createElement("div");
        grid.className = "sect-grid";

        for (const sect of SECTS) {
            const canJoin = game.canJoinSect(sect.id);
            const card = document.createElement("div");
            card.className = `sect-card ${canJoin ? "" : "sect-locked"}`;
            card.style.borderColor = canJoin ? sect.color : "#333";

            // Требования
            const req = sect.requirement;
            let reqText = [];
            if (req.realm) reqText.push(`${REALMS[req.realm].name}+ ${game.realmIndex >= req.realm ? "✓" : "✗"}`);
            if (req.milestone) {
                const msObj = MILESTONES.find(m => m.id === req.milestone);
                const msName = msObj ? msObj.name : req.milestone;
                reqText.push(`Достижение: ${msName} ${game.milestones.includes(req.milestone) ? "✓" : "✗"}`);
            }
            if (req.rebirths) reqText.push(`Перерождений: ${req.rebirths}+ ${game.prestige.totalRebirths >= req.rebirths ? "✓" : "✗"}`);

            // Бонусы (из dao)
            const bonusNames = {
                qi: "Накопление ци", combatPower: "Боевая мощь",
                breakthroughBonus: "Шанс прорыва", dangerReward: "Награды за опасность",
                pillEffect: "Эффект пилюль", qiRetention: "Удержание ци",
                techXpSpeed: "Обучение техник", statXpSpeed: "Усиление медитации",
                karmaMultiplier: "Карма", disassembleBonus: "Разбор артефактов",
                missionCdMult: "Ожидание заданий"
            };
            const bonusParts = [];
            if (sect.dao) {
                for (const [k, v] of Object.entries(sect.dao)) {
                    if (k === "missionCdMult") {
                        bonusParts.push(`${v.min > 1 ? "x" + v.min.toFixed(1) : "x" + v.min.toFixed(1)} -> ${v.max < 1 ? "x" + v.max.toFixed(1) : "x" + v.max.toFixed(1)} ${bonusNames[k] || k}`);
                    } else if (k === "karmaMultiplier") {
                        bonusParts.push(`x${v.min.toFixed(2)} -> x${v.max.toFixed(2)} ${bonusNames[k] || k}`);
                    } else {
                        bonusParts.push(`${v.min > 0 ? "+" : ""}${Math.round(v.min * 100)}% -> ${v.max > 0 ? "+" : ""}${Math.round(v.max * 100)}% ${bonusNames[k] || k}`);
                    }
                }
            }

            // Элемент секты и предрасположенность
            const elemObj = sect.element ? ELEMENTS.find(e => e.id === sect.element) : null;
            const elemText = elemObj ? elemObj.name : "Любой";
            const hasAffinity = sect.element && game.spiritualRoot && game.spiritualRoot.elements && game.spiritualRoot.elements.includes(sect.element);
            const affinityText = !sect.element ? "" : hasAffinity ? ' <span class="v2-muted">· совпадает с корнем</span>' : ' <span class="v2-muted">· другая стихия</span>';

            const diffNames = { easy: "Лёгкая", medium: "Средняя", hard: "Сложная", very_hard: "Очень сложная" };
            const diffColors = { easy: "#6aea8a", medium: "#eebb44", hard: "#ee7a7a", very_hard: "#cc4a3a" };
            const daoPathText = sect.daoDisplayName || "";
            const daoLevelSaved = "";
            card.innerHTML = `
                ${renderSceneryImage(getSectScenery(sect.id), 'sect-scenery')}
                <div class="sect-name" style="color:${sect.color}">${sect.name}</div>
                <div class="sect-path">${sect.path === "righteous" ? "Праведный" : sect.path === "combat" ? "Боевой" : sect.path === "alchemy" ? "Алхимический" : sect.path === "demonic" ? "Демонический" : "Отшельнический"} путь <span style="color:${diffColors[sect.difficulty] || '#aaa'}" title="В сложных сектах нужно больше вклада для повышения ранга">(${diffNames[sect.difficulty] || sect.difficulty})</span></div>
                ${daoPathText ? `<div class="sect-dao-path">Путь секты: ${daoPathText}${daoLevelSaved}</div>` : ""}
                <p class="sect-training-hint">Тренировка пути: ${_v2SectTrainingText(sect)}</p>
                <div class="sect-bonuses">Основные бонусы: ${Object.keys(sect.dao || {}).map(key => bonusNames[key] || key).join(", ")}</div>
                <details class="v2-details" data-sect-detail="sect-${sect.id}"${_v2SectOpen(`sect-${sect.id}`)}><summary>Бонусы и история секты</summary>
                <div class="sect-element">Стихия: ${elemObj ? `<span style="color:${elemObj.color}">${elemObj.icon} ${elemText}</span>` : elemText}${affinityText}</div>
                <div class="sect-desc">${sect.description}</div>
                <div class="sect-bonuses">От начального пути до 5-го уровня: ${bonusParts.join(" | ")}</div>
                </details>
                <div class="sect-req">Для вступления: ${reqText.length ? reqText.join(" | ") : "доступно сразу"}</div>
                ${canJoin
                    ? `<button class="btn btn-small btn-primary" onclick="joinSectUI('${sect.id}')">Вступить</button>`
                    : `<span class="sect-locked-text">Недоступно</span>`
                }
            `;
            grid.appendChild(card);
        }
        container.appendChild(grid);
    } else {
        const sect = SECTS.find(s => s.id === game.sect.id);
        if (sect) _renderV2SectMember(container, sect);
    }
}

const _v2SectMissionTitles = {
    gather_stones: "Камни для секты", slay_beast: "Зверь у границ", meditate_count: "Нефритовый сад",
    donate_stones_alchemy: "Алхимический зал", purify_qi: "Священный исток", arena_challenge: "Арена Тысячи Клинков",
    brew_elixir: "Эликсир для палаты", devour_essence: "Подношение Бездне", dark_ritual: "Тёмный ритуал",
    donate_dust: "Материалы для мастеров", donate_essence: "Сосуд эссенции", gather_pills: "Запас пилюль",
    prove_strength: "Испытание силы", prove_spirit: "Испытание духа", perform_breakthroughs: "Новый рубеж",
    relic_hunt: "Охота за реликвией", treasure_expedition: "Забытая сокровищница", sect_armory: "Арсенал секты",
    elder_trial_strength: "Испытание старейшин", elder_trial_spirit: "Совет старейшин", elder_offering: "Подношение старейшинам",
    hall_master_treasury: "Стражи сокровищницы", hall_master_artifact: "Древний артефакт", hall_master_wisdom: "Закрытый совет",
    deep_meditation: "Тишина отшельников", dao_comprehension: "Фрагмент Великого Дао", gather_herbs: "Травы для лекарей",
    donate_pills_sect: "Лекарственная палата",
};

function _v2SectResource(text, kind) {
    return `<span class="v2-resource-${kind}">${text}</span>`;
}

function _v2SectRequirements(mission) {
    const checks = mission.check || {};
    const values = {
        combatPower: ["Боевая мощь", game.getCombatPower()],
        strength: ["Сила", game.strength + game.getArtifactBonus("strength")],
        spirit: ["Дух", game.spirit + game.getArtifactBonus("spirit")],
        luck: ["Удача", game.luck + game.getArtifactBonus("luck") + game.getFormationBonus("luck")],
        breakthroughs: ["Прорывы", game.totalBreakthroughs - (mission.breakthroughsAtStart || 0)],
        meditationYears: ["Медитация, лет", game.meditationYears - (mission.meditationYearsAtStart || 0)],
        pillsDonated: ["Пожертвовано пилюль", (game.flags.pillsDonated || 0) - (mission.pillsDonatedAtStart || 0)],
    };
    return Object.entries(values).filter(([key]) => checks[key]).map(([key, [label, value]]) =>
        `<span class="${value >= checks[key] ? "sect-check-ready" : "sect-check-pending"}" title="${label}: требуется не менее ${checks[key]}">${label} ${Number(value.toFixed(1))} / ${checks[key]}</span>`
    ).join(" · ");
}

function _renderV2SectMember(container, sect) {
    const main = document.createElement("div");
    main.className = "v2-sect-main";
    container.appendChild(main);
    const rank = game.getCurrentSectRank();
    const nextRank = game.getNextSectRank();
    const header = document.createElement("div");
    header.className = "sect-active-header";
    header.innerHTML = `${renderSceneryImage(getSectScenery(sect.id), 'sect-scenery')}<div class="sect-title-line"><div class="sect-name" style="color:${sect.color}">${sect.name}</div><span class="sect-rank-name">${rank.name}</span></div>
        <p class="sect-lore-prose">${sect.description}</p>
        <div class="sect-rank-info"><span class="sect-contribution" title="Вклад за поручения и пожертвования">Вклад ${game.sect.contribution}</span>
        ${nextRank ? `<span class="sect-next-rank">${nextRank.name}: ${Math.max(0, nextRank.contribution - game.sect.contribution)} вклада${nextRank.realmReq > 0 ? ` · ${REALMS[nextRank.realmReq]?.name || "Ступень " + nextRank.realmReq} ${game.realmIndex >= nextRank.realmReq ? "✓" : "✗"}` : ""}</span>` : '<span class="sect-max-rank">Высший ранг</span>'}</div>`;
    main.appendChild(header);
    if (nextRank) {
        const pct = Math.min(100, ((game.sect.contribution - rank.contribution) / (nextRank.contribution - rank.contribution)) * 100);
        const bar = document.createElement("div");
        bar.className = "sect-rank-bar-container";
        bar.innerHTML = `<div class="sect-rank-bar" id="sect-rank-bar-fill" style="width:${pct}%"></div><span class="sect-rank-bar-text" id="sect-rank-bar-pct">${pct.toFixed(0)}%</span>`;
        main.appendChild(bar);
    }

    const bonusNames = {
        qi: "Ци", combatPower: "Боевая мощь", breakthroughBonus: "Шанс прорыва", dangerReward: "Награды за опасность",
        pillEffect: "Пилюли", qiRetention: "Сохранение ци", techXpSpeed: "Обучение", statXpSpeed: "Медитация",
        karmaMultiplier: "Карма", disassembleBonus: "Разбор", missionCdMult: "Ожидание заданий",
    };
    const bonusParts = Object.keys(sect.dao || {}).map(key => {
        const value = game.getSectBonus(key);
        const amount = key === "karmaMultiplier" || key === "missionCdMult" ? `×${Number(value.toFixed(2))}`
            : `${value >= 0 ? "+" : ""}${Number((value * 100).toFixed(1))}%`;
        const resource = key === "pillEffect" ? " v2-resource-pills" : "";
        return `<span class="sect-bonus-item${resource}${value < 0 ? " sect-bonus-negative" : ""}">${bonusNames[key] || key} ${amount}</span>`;
    });
    const bonuses = document.createElement("div");
    bonuses.className = "sect-active-bonuses";
    const daoDescriptions = typeof DAO_LEVEL_DESCRIPTIONS !== "undefined" ? DAO_LEVEL_DESCRIPTIONS[sect.daoPath] : null;
    const daoLore = game.daoLevel > 0 && daoDescriptions?.length ? daoDescriptions[Math.min(game.daoLevel - 1, daoDescriptions.length - 1)] : "";
    bonuses.innerHTML = `<div class="sect-path-line"><h4>${sect.daoDisplayName || "Путь секты"} · ${game.daoLevel}</h4></div>${daoLore ? `<p class="sect-path-lore">${daoLore}</p>` : ""}<div class="sect-bonus-list">${bonusParts.join("")}</div>`;
    main.appendChild(bonuses);

    const missions = document.createElement("div");
    missions.className = "sect-mission-section sect-missions";
    missions.innerHTML = `<div class="sect-section-line"><h4>Поручения</h4><span>Новое через ${game.getSectMissionCooldown()} ${_plural(game.getSectMissionCooldown(), "год", "года", "лет")}</span></div>`;
    if (!game.sectMissions.length) missions.innerHTML += `<p class="empty-msg">${game.sectMissionTimer > 0 ? `Поручения появятся через ${game.sectMissionTimer} ${_plural(game.sectMissionTimer, "год", "года", "лет")}.` : "Поручений пока нет."}</p>`;
    for (let i = 0; i < game.sectMissions.length; i++) {
        const mission = game.sectMissions[i];
        const card = document.createElement("div");
        card.className = "sect-mission-card";
        card.dataset.index = i;
        if (mission.cooldown > 0) {
            card.classList.add("sect-mission-cooldown");
            card.innerHTML = `<div class="sect-mission-main"><div class="sect-mission-text">Старейшины готовят поручение</div><div class="sect-mission-desc">Через ${mission.cooldown} ${_plural(mission.cooldown, "год", "года", "лет")}</div></div><div class="sect-mission-action"><button class="btn btn-small btn-secondary" disabled>Ожидание</button></div>`;
            missions.appendChild(card);
            continue;
        }
        const autoDonation = mission.templateId === "donate_pills_sect";
        const canComplete = game.canCompleteSectMission(i);
        const costs = [];
        const resourceNames = { stones: ["камень", "камня", "камней"], pills: ["пилюля", "пилюли", "пилюль"], dust: ["пыли", "пыли", "пыли"], essence: ["эссенции", "эссенции", "эссенции"] };
        for (const [key, amount] of Object.entries(mission.cost || {})) {
            if (amount) costs.push(_v2SectResource(`${amount} ${resourceNames[key] ? _plural(amount, ...resourceNames[key]) : key}`, key));
        }
        const reward = mission.reward || {};
        const rewards = [];
        if (reward.contribution) rewards.push(`<span title="Вклад с учётом ранга и происхождения">+${game.getSectMissionContribution(reward.contribution)} вклада</span>`);
        if (reward.stones) rewards.push(_v2SectResource(`+${reward.stones} ${_plural(reward.stones, "камень", "камня", "камней")}`, "stones"));
        if (reward.pills) rewards.push(_v2SectResource(`+${reward.pills} ${_plural(reward.pills, "пилюля", "пилюли", "пилюль")}`, "pills"));
        if (reward.daoScroll) rewards.push(_v2SectResource(`+${reward.daoScroll} ${_plural(reward.daoScroll, "свиток", "свитка", "свитков")}`, "scrolls"));
        const artifact = game.getSectMissionArtifactReward(mission);
        if (artifact) rewards.push(`<span class="art-tier-${artifact.tier}">${ARTIFACT_TIERS[artifact.tier]?.name || artifact.tier} артефакт · ${artifact.firstReward ? "гарантирован" : `${Math.round(artifact.chance * 100)}%`}</span>`);
        if (game.realmIndex >= 3) rewards.push('<span class="v2-resource-dao">+опыт Дао</span>');
        const requirements = _v2SectRequirements(mission);
        const title = _v2SectMissionTitles[mission.templateId] || mission.text || "Поручение секты";
        card.innerHTML = `<div class="sect-mission-main"><div class="sect-mission-text">${title}</div>
            ${requirements || costs.length ? `<div class="sect-mission-desc">${requirements}${requirements && costs.length ? " · " : ""}${costs.length ? `Цена: ${costs.join(", ")}` : ""}</div>` : ""}
            <div class="sect-mission-reward">${rewards.join(" · ")}</div></div>
            <div class="sect-mission-action">${autoDonation ? '<button class="btn btn-small btn-secondary" onclick="openSectDonations()" title="Награда за поручение придёт автоматически после пожертвования нужного количества пилюль">Пожертвовать</button>' : `<button class="btn btn-small ${canComplete ? "btn-primary" : "btn-secondary"}" onclick="completeSectMissionUI(${i})" ${canComplete ? "" : "disabled"}>${canComplete ? "Выполнить" : "Не готово"}</button>`}</div>`;
        missions.appendChild(card);
    }
    main.appendChild(missions);

    const rankIdx = game.getSectRankIndex();
    const mult = game.getActiveBodyPerks().contributionMult || 1;
    const donationRows = [
        { key: "pills", name: "Пилюли", have: game.pills, amounts: [1, 5, game.pills], perUnit: [5, 8, 12, 16, 20][rankIdx] || 5, batch: 1, extra: (rankIdx >= 2 ? " · камни" : "") + (rankIdx >= 4 ? " · эссенция" : "") },
        { key: "stones", name: "Камни", have: game.stones, amounts: [100, 500], perUnit: ([1, 2, 3, 4, 5][rankIdx] || 1) / 10, batch: 100, extra: "" },
        { key: "essence", name: "Эссенция", have: game.daoEssence, amounts: [10, 50], perUnit: [2, 3, 5, 7, 10][rankIdx] || 2, batch: 10, extra: " · 25% свиток за каждые 10" },
        { key: "dust", name: "Пыль", have: game.artifactDust, amounts: [10, 50], perUnit: [1, 2, 3, 5, 7][rankIdx] || 1, batch: 10, extra: " · 10% свиток за каждые 10" },
    ];
    const functions = { pills: "donatePills", stones: "donateStones", essence: "donateEssence", dust: "donateDust" };
    const donations = document.createElement("section");
    donations.className = "sect-donations";
    donations.innerHTML = `<h4>Пожертвования</h4><div class="sect-donate-grid">${donationRows.map(row => `<div class="sect-donate-item"><span class="sect-donate-label v2-resource-${row.key}">${row.name}<span class="sect-donate-rate">${row.batch} → ${Math.floor(row.batch * row.perUnit * mult)} вклада${row.extra}</span></span><span class="sect-donate-buttons">${[...new Set(row.amounts)].filter(amount => amount > 0).map(amount => `<button class="btn btn-small btn-secondary" onclick="game.${functions[row.key]}(${amount}); renderSects();" title="Пожертвовать ${amount}; ресурсы расходуются сразу" ${row.have >= amount ? "" : "disabled"}>${row.key === "pills" && amount === row.have && ![1, 5].includes(amount) ? "Все" : amount}</button>`).join("")}</span></div>`).join("")}</div>`;
    container.appendChild(donations);

    const leave = document.createElement("div");
    leave.className = "sect-leave";
    leave.innerHTML = `<button class="btn btn-small btn-danger-btn" id="btn-leave-sect" onclick="showLeaveSectConfirm()">Покинуть секту</button>
        <div id="leave-sect-confirm" class="inline-confirm-panel" style="display:none"><p class="inline-confirm-warning">Покинуть ${sect.name}?</p><p class="inline-confirm-detail">Вклад и ранг обнулятся; техники и бонусы секты перестанут действовать. Активный путь начнётся с нуля. Достигнутый уровень останется в истории, открытые формации сохранятся.</p><div class="inline-confirm-actions"><button class="btn btn-small btn-danger-btn" onclick="confirmLeaveSect()">Покинуть</button><button class="btn btn-small btn-secondary" onclick="cancelLeaveSect()">Отмена</button></div></div>`;
    main.appendChild(leave);
}

function openSectDonations() {
    document.querySelector("#sects-list .sect-donations")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function joinSectUI(sectId) {
    game.joinSect(sectId);
    renderSects();
}

function completeSectMissionUI(index) {
    const oldRankIdx = game.getSectRankIndex();
    const oldContrib = game.sect ? game.sect.contribution : 0;

    const card = document.querySelector(`.sect-mission-card[data-index="${index}"]`);

    if (!game.completeSectMission(index)) return;

    const newContrib = game.sect ? game.sect.contribution : 0;
    const gained = newContrib - oldContrib;
    const newRankIdx = game.getSectRankIndex();

    // Сразу обновить прогресс-бар
    _updateSectRankBar();

    // Блокируем renderSects() от тиков на время анимации
    _sectAnimLock = true;
    // Награды видны сразу и на паузе; карточка остаётся до завершения анимации.
    updateUI();

    // Анимация завершения на карточке
    if (card) {
        card.classList.add("sect-mission-complete-anim");
        const btn = card.querySelector(".btn");
        if (btn) btn.disabled = true;
        // Fly-up текст вклада
        if (gained > 0) {
            const flyup = document.createElement("div");
            flyup.className = "sect-contrib-flyup";
            flyup.textContent = `+${gained} вклад`;
            card.style.position = "relative";
            card.appendChild(flyup);
            setTimeout(() => flyup.remove(), 2000);
        }
    }

    // Перерисовка — повышение ранга показывается дольше
    if (newRankIdx > oldRankIdx) {
        setTimeout(() => {
            _sectAnimLock = false;
            renderSects();
            _showRankUpEffect();
        }, 1500);
    } else {
        setTimeout(() => {
            _sectAnimLock = false;
            renderSects();
        }, 1200);
    }
}

function _showRankUpEffect() {
    const container = document.getElementById("sects-list");
    if (!container) return;

    const rank = game.getCurrentSectRank();
    const overlay = document.createElement("div");
    overlay.className = "sect-rankup-overlay";
    overlay.innerHTML = `
        <div class="sect-rankup-content">
            <div class="sect-rankup-icon">\u2728</div>
            <div class="sect-rankup-title">Повышение ранга!</div>
            <div class="sect-rankup-name">${rank ? rank.name : ""}</div>
        </div>
    `;
    container.style.position = "relative";
    container.appendChild(overlay);

    // Частицы
    const rect = container.getBoundingClientRect();
    const colors = ["#eebb44", "#ffd700", "#fff4cc", "#ffaa00", "#ffffff"];
    for (let i = 0; i < 40; i++) {
        const p = document.createElement("div");
        p.className = "enhance-particle";
        p.style.left = (rect.left + Math.random() * rect.width) + "px";
        p.style.top = (rect.top + rect.height * 0.4) + "px";
        p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        p.style.setProperty("--dx", ((Math.random() - 0.5) * 200) + "px");
        p.style.setProperty("--dy", (-(40 + Math.random() * 100)) + "px");
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 1200);
    }

    setTimeout(() => overlay.remove(), 2500);
}

function showLeaveSectConfirm() {
    document.getElementById("btn-leave-sect").style.display = "none";
    document.getElementById("leave-sect-confirm").style.display = "block";
}

function confirmLeaveSect() {
    game.leaveSect();
    renderSects();
}

function cancelLeaveSect() {
    document.getElementById("leave-sect-confirm").style.display = "none";
    document.getElementById("btn-leave-sect").style.display = "";
}
