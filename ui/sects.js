// ============================================================
// UI/SECTS.JS — Таб секты: вступление, ранг, задания
// ============================================================

let _sectAnimLock = false;

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
    const container = document.getElementById("sects-list");
    if (!container) return;
    // Не перерисовывать пока идёт анимация завершения/повышения
    if (_sectAnimLock || container.querySelector(".sect-rankup-overlay")) return;
    container.innerHTML = "";

    if (!game.sect) {
        // Выбор секты
        container.innerHTML = "<h3>Выберите секту</h3>";
        const desc = document.createElement("p");
        desc.className = "empty-msg";
        desc.textContent = "Вступление в секту даёт бонусы, техники и задания. Выбор влияет на весь путь культивации.";
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
                qi: "Ци", combatPower: "Боевая мощь",
                breakthroughBonus: "Шанс прорыва", dangerReward: "Награды за опасность",
                pillEffect: "Эффект пилюль", qiRetention: "Удержание ци",
                techXpSpeed: "Скорость техник", statXpSpeed: "Совершенствование",
                karmaMultiplier: "Карма", disassembleBonus: "Разбор артефактов",
                missionCdMult: "КД заданий"
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
            const affinityText = !sect.element ? "" : hasAffinity ? ' <span style="color:#6aea8a" title="Совпадение элемента корня с сектой: все Дао-бонусы секты ×1.5">x1.5 бонусы</span>' : ' <span style="color:#ee7a7a" title="Элемент корня не совпадает: все Дао-бонусы секты ×0.75">x0.75 бонусы</span>';

            const diffNames = { easy: "Лёгкая", medium: "Средняя", hard: "Сложная", very_hard: "Очень сложная" };
            const diffColors = { easy: "#6aea8a", medium: "#eebb44", hard: "#ee7a7a", very_hard: "#cc4a3a" };
            const daoPathText = sect.daoDisplayName || "";
            const daoLevelSaved = "";
            card.innerHTML = `
                <div class="sect-name" style="color:${sect.color}">${sect.name}</div>
                <div class="sect-path">${sect.path === "righteous" ? "Праведный" : sect.path === "combat" ? "Боевой" : sect.path === "alchemy" ? "Алхимический" : sect.path === "demonic" ? "Демонический" : "Отшельнический"} путь <span style="color:${diffColors[sect.difficulty] || '#aaa'}" title="Чем сложнее секта — тем больше вклада нужно для повышения ранга, но и бонусы Дао мощнее">(${diffNames[sect.difficulty] || sect.difficulty})</span></div>
                ${daoPathText ? `<div class="sect-dao-path" style="color:${sect.color}">Дао: ${daoPathText}${daoLevelSaved}</div>` : ""}
                <div class="sect-element">Стихия: ${elemObj ? `<span style="color:${elemObj.color}">${elemObj.icon} ${elemText}</span>` : elemText}${affinityText}</div>
                <div class="sect-desc">${sect.description}</div>
                <div class="sect-bonuses">Дао бонусы: ${bonusParts.join(" | ")}</div>
                <div class="sect-req">${reqText.join(" | ")}</div>
                ${canJoin
                    ? `<button class="btn btn-small btn-primary" onclick="joinSectUI('${sect.id}')">Вступить</button>`
                    : `<span class="sect-locked-text">Недоступно</span>`
                }
            `;
            grid.appendChild(card);
        }
        container.appendChild(grid);
    } else {
        // В секте — показать инфо, ранг, задание
        const sect = SECTS.find(s => s.id === game.sect.id);
        if (!sect) return;
        const rank = game.getCurrentSectRank();
        const nextRank = game.getNextSectRank();

        // Заголовок
        const header = document.createElement("div");
        header.className = "sect-active-header";
        header.innerHTML = `
            <div class="sect-name" style="color:${sect.color}">${sect.name}</div>
            <div class="sect-rank-info">
                <span class="sect-rank-name">Ранг: ${rank.name}</span>
                <span class="sect-contribution">Вклад: ${game.sect.contribution}</span>
                ${nextRank ? `<span class="sect-next-rank">До «${nextRank.name}»: ${game.sect.contribution >= nextRank.contribution ? "✓" : nextRank.contribution - game.sect.contribution + " вклада"}${nextRank.realmReq > 0 ? `, ${REALMS[nextRank.realmReq] ? REALMS[nextRank.realmReq].name : "Ступень " + nextRank.realmReq}+ ${game.realmIndex >= nextRank.realmReq ? "✓" : "✗"}` : ""}</span>` : `<span class="sect-max-rank">Максимальный ранг!</span>`}
            </div>
        `;
        container.appendChild(header);

        // Ранг прогресс-бар
        if (nextRank) {
            const prevContrib = rank.contribution;
            const pct = Math.min(100, ((game.sect.contribution - prevContrib) / (nextRank.contribution - prevContrib)) * 100);
            const bar = document.createElement("div");
            bar.className = "sect-rank-bar-container";
            bar.innerHTML = `
                <div class="sect-rank-bar" id="sect-rank-bar-fill" style="width:${pct}%"></div>
                <span class="sect-rank-bar-text" id="sect-rank-bar-pct">${pct.toFixed(0)}%</span>
            `;
            container.appendChild(bar);
        }

        // Бонусы (из dao)
        const bonusNames = {
            qi: "Ци", combatPower: "Боевая мощь",
            breakthroughBonus: "Шанс прорыва", dangerReward: "Награды за опасность",
            pillEffect: "Эффект пилюль", qiRetention: "Удержание ци",
            techXpSpeed: "Скорость техник", statXpSpeed: "Совершенствование",
            karmaMultiplier: "Карма", disassembleBonus: "Разбор артефактов",
            missionCdMult: "КД заданий"
        };
        const elemAffinity = game.getSectElementAffinity();
        const elemObj = sect.element ? ELEMENTS.find(e => e.id === sect.element) : null;
        const bonusDiv = document.createElement("div");
        bonusDiv.className = "sect-active-bonuses";
        let bonusHtml = `<h4>${sect.daoDisplayName || "Дао"} (ур. ${game.daoLevel}, ранг x${rank.bonusMult.toFixed(1)}${elemAffinity !== 1 ? `, стихия x${elemAffinity.toFixed(1)}` : ""})</h4>`;
        if (elemObj) {
            const affinityColor = elemAffinity >= 1.5 ? "#6aea8a" : elemAffinity < 1 ? "#ee7a7a" : "#aaa";
            bonusHtml += `<span class="sect-bonus-item" style="color:${affinityColor}">Стихия: ${elemObj.icon} ${elemObj.name} (x${elemAffinity.toFixed(1)})</span>`;
        }
        if (sect.dao) {
            for (const [key, val] of Object.entries(sect.dao)) {
                const effective = game.getSectBonus(key);
                if (key === "missionCdMult") {
                    bonusHtml += `<span class="sect-bonus-item">${bonusNames[key] || key}: x${effective.toFixed(2)}</span>`;
                } else if (key === "karmaMultiplier") {
                    bonusHtml += `<span class="sect-bonus-item">${bonusNames[key] || key}: x${effective.toFixed(2)}</span>`;
                } else {
                    const color = effective > 0 ? "#6aea8a" : effective < 0 ? "#ee7a7a" : "#aaa";
                    bonusHtml += `<span class="sect-bonus-item" style="color:${color}">${effective > 0 ? "+" : ""}${Math.round(effective * 100)}% ${bonusNames[key] || key}</span>`;
                }
            }
        }
        bonusDiv.innerHTML = bonusHtml;
        container.appendChild(bonusDiv);

        // Пожертвования
        const donateDiv = document.createElement("div");
        donateDiv.className = "sect-mission-section";
        const rankIdx = game.getSectRankIndex();
        const pillContrib = [5, 8, 12, 16, 20][rankIdx] || 5;
        const stoneContrib = [1, 2, 3, 4, 5][rankIdx] || 1;
        const essContrib = [2, 3, 5, 7, 10][rankIdx] || 2;
        const dustContrib = [1, 2, 3, 5, 7][rankIdx] || 1;

        const donateRows = [
            { icon: "🔮", name: "Пилюли", resource: "pills", have: game.pills, amounts: [1, 5, game.pills],
              perUnit: pillContrib, extra: (rankIdx >= 2 ? " + камни" : "") + (rankIdx >= 4 ? " + эссенция" : "") },
            { icon: "💎", name: "Камни", resource: "stones", have: game.stones, amounts: [100, 500],
              perUnit: stoneContrib, batch: 100, extra: "" },
            { icon: "✦", name: "Эссенция", resource: "essence", have: game.daoEssence, amounts: [10, 50],
              perUnit: essContrib, batch: 10, extra: ", 25% свиток" },
            { icon: "◆", name: "Пыль", resource: "dust", have: game.artifactDust, amounts: [10, 50],
              perUnit: dustContrib, batch: 10, extra: ", 10% свиток" },
        ];

        const donateFunc = { pills: "donatePills", stones: "donateStones", essence: "donateEssence", dust: "donateDust" };

        let donateHtml = `<h4>Пожертвования</h4><div class="sect-donate-grid">`;
        for (const row of donateRows) {
            const batch = row.batch || 1;
            const contribPer = batch > 1 ? `${batch}→${row.perUnit * batch}` : `1→${row.perUnit}`;
            donateHtml += `<div class="sect-donate-item">`;
            donateHtml += `<span class="sect-donate-label">${row.icon} ${row.name} <span class="sect-donate-rate">(${contribPer} вкл.${row.extra})</span></span>`;
            donateHtml += `<span class="sect-donate-buttons">`;
            for (const amt of row.amounts) {
                if (amt <= 0) continue;
                const label = amt === row.have && amt > 1 ? `Все (${amt})` : `×${amt}`;
                const canAfford = row.have >= amt;
                donateHtml += `<button class="btn btn-small btn-secondary" onclick="game.${donateFunc[row.resource]}(${amt}); renderSects();" ${canAfford ? "" : "disabled"}>${label}</button>`;
            }
            donateHtml += `</span></div>`;
        }
        donateHtml += `</div>`;
        donateDiv.innerHTML = donateHtml;
        container.appendChild(donateDiv);

        // Задания
        const missionDiv = document.createElement("div");
        missionDiv.className = "sect-mission-section";
        missionDiv.innerHTML = `<h4>Задания секты</h4>`;
        if (game.sectMissions.length > 0) {
            for (let i = 0; i < game.sectMissions.length; i++) {
                const m = game.sectMissions[i];
                const card = document.createElement("div");
                card.className = "sect-mission-card";
                card.setAttribute("data-index", i);

                // Слот на кулдауне — та же структура что и активное задание
                if (m.cooldown > 0) {
                    card.classList.add("sect-mission-cooldown");
                    card.innerHTML = `
                        <div class="sect-mission-text" style="color:#555">Ожидание нового задания...</div>
                        <div class="sect-mission-desc" style="color:#444">Новое задание через ${m.cooldown} ${_plural(m.cooldown, "год", "года", "лет")}</div>
                        <div class="sect-mission-reward" style="color:#444">—</div>
                        <button class="btn btn-small btn-secondary" disabled>Ожидание</button>
                    `;
                    missionDiv.appendChild(card);
                    continue;
                }

                const canComplete = game.canCompleteSectMission(i);
                let progressText = "";
                if (m.check && m.check.meditationYears) {
                    const done = game.meditationYears - (m.meditationYearsAtStart || 0);
                    progressText = ` (${Math.min(done, m.check.meditationYears)}/${m.check.meditationYears} лет)`;
                }
                if (m.check && m.check.pillsDonated) {
                    const done = (game.flags.pillsDonated || 0) - (m.pillsDonatedAtStart || 0);
                    progressText = ` (${Math.min(done, m.check.pillsDonated)}/${m.check.pillsDonated} пожертвовано)`;
                }
                // Формируем текст стоимости
                let costParts = [];
                if (m.cost) {
                    if (m.cost.stones) costParts.push(`${m.cost.stones} ${_plural(m.cost.stones, "камень", "камня", "камней")}`);
                    if (m.cost.pills) costParts.push(`${m.cost.pills} ${_plural(m.cost.pills, "пилюля", "пилюли", "пилюль")}`);
                    if (m.cost.dust) costParts.push(`<span style="color:#aaa">\u25C6 ${m.cost.dust} пыли</span>`);
                    if (m.cost.essence) costParts.push(`<span style="color:#c89aff">\u2726 ${m.cost.essence} эссенции</span>`);
                }
                const costText = costParts.length > 0 ? ` | Цена: ${costParts.join(", ")}` : "";
                card.innerHTML = `
                    <div class="sect-mission-text">${m.text}</div>
                    <div class="sect-mission-desc">${m.description}${progressText}</div>
                    <div class="sect-mission-reward">Награда: ${m.reward.contribution ? `+${Math.floor(m.reward.contribution * rank.bonusMult)} вклад${rank.bonusMult > 1 ? ` (\u00D7${rank.bonusMult.toFixed(1)})` : ""}` : ""}${m.reward.stones ? `${m.reward.contribution ? ", " : ""}+${m.reward.stones} ${_plural(m.reward.stones, "камень", "камня", "камней")}` : ""}${m.reward.pills ? `, +${m.reward.pills} ${_plural(m.reward.pills, "пилюля", "пилюли", "пилюль")}` : ""}${m.reward.daoScroll ? `, <span style="color:#66ccff">\u2721 +${m.reward.daoScroll} ${_plural(m.reward.daoScroll, "свиток", "свитка", "свитков")}</span>` : ""}${m.reward.artifact ? `, <span style="color:#cc7a3a">\u2694 артефакт (${{common:"обычный",uncommon:"необычный",rare:"редкий",epic:"эпический",legendary:"легендарный",divine:"божественный"}[m.reward.artifact] || m.reward.artifact})</span>` : ""}${game.realmIndex >= 3 ? `, <span style="color:#eebb44" title="2-5% от ${game.daoNeeded()} постижения">\u262F +Дао (2-5%)</span>` : ""}${costText}</div>
                    <button class="btn btn-small ${canComplete ? "btn-primary" : "btn-secondary"}" onclick="completeSectMissionUI(${i})" ${canComplete ? "" : "disabled"}>
                        ${canComplete ? "Выполнить" : "Не готово"}
                    </button>
                `;
                missionDiv.appendChild(card);
            }
        } else {
            if (game.sectMissionTimer > 0) {
                missionDiv.innerHTML += `<p class="empty-msg">Вы — новый ученик. Старейшины ещё присматриваются к вам. Задания появятся через ${game.sectMissionTimer} ${_plural(game.sectMissionTimer, "год", "года", "лет")}.</p>`;
            } else {
                missionDiv.innerHTML += `<p class="empty-msg">Нет заданий</p>`;
            }
        }
        container.appendChild(missionDiv);

        // Кнопка покинуть
        const leaveDiv = document.createElement("div");
        leaveDiv.className = "sect-leave";
        leaveDiv.innerHTML = `
            <button class="btn btn-small btn-danger-btn" id="btn-leave-sect" onclick="showLeaveSectConfirm()">Покинуть секту</button>
            <div id="leave-sect-confirm" class="inline-confirm-panel" style="display:none">
                <p class="inline-confirm-warning">Покинуть секту и сменить Путь Дао?</p>
                <p class="inline-confirm-detail">Весь вклад и ранг будут потеряны. Прогресс Дао этой секты сохранён, но активный Путь сменится.</p>
                <div class="inline-confirm-actions">
                    <button class="btn btn-small btn-danger-btn" onclick="confirmLeaveSect()">Покинуть</button>
                    <button class="btn btn-small btn-secondary" onclick="cancelLeaveSect()">Отмена</button>
                </div>
            </div>
        `;
        container.appendChild(leaveDiv);
    }
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
