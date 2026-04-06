// ============================================================
// UI/EXPEDITIONS.JS — Таб тайных царств (экспедиции)
// ============================================================

// Словесное описание шанса
function _chanceTier(chance) {
    if (chance >= 0.7) return "высокий";
    if (chance >= 0.4) return "средний";
    if (chance >= 0.15) return "низкий";
    return "редкий";
}

// Имя тира артефакта
function _artifactTierName(tier) {
    const names = { common: "смертного", uncommon: "духовного", rare: "мистического", epic: "небесного", legendary: "священного", divine: "божественного" };
    return names[tier] || tier;
}
function _artifactTierNameNom(tier) {
    const names = { common: "смертный", uncommon: "духовный", rare: "мистический", epic: "небесный", legendary: "священный", divine: "божественный" };
    return names[tier] || tier;
}

// Рассчитать общий множитель наград экспедиции
function _getExpeditionRewardMult(loc) {
    const era = game.getCurrentEra();
    const eraM = era ? (era.rewardWeight || 1) : 1;
    const eventM = (game.worldEvent && game.worldEvent.modifiers.expeditionReward) || 1;
    const dangerM = game.getSectBonus("dangerReward")
        + game.getArtifactBonus("dangerReward") * 0.01
        + game.getFormationBonus("dangerReward")
        + (game.getActiveBodyPerks().dangerReward || 0);
    let powerM = 0;
    const effectiveDanger = game.getEffectiveDangerLevel(loc);
    if (effectiveDanger > 0) {
        const power = game.getCombatPower();
        if (power > effectiveDanger) {
            const x = Math.max(0, (power - effectiveDanger) / effectiveDanger * 0.6);
            powerM = 1.5 * (1 - Math.exp(-x));
        }
    }
    const ascTier = game.ascendedLocations[loc.id] || 0;
    const ascM = ascTier >= 2 ? 3 : ascTier >= 1 ? 2 : 1;
    // danger + power аддитивны между собой, era мультипликативна
    return { total: eraM * eventM * (1 + dangerM + powerM) * ascM, era: eraM, event: eventM, danger: dangerM, power: powerM, ascend: ascM };
}

function renderExpeditions() {
    const container = document.getElementById("expeditions-list");
    if (!container) return;
    container.innerHTML = "";

    // Текущая экспедиция
    if (game.expedition) {
        const loc = LOCATIONS.find(l => l.id === game.expedition.locationId);
        if (loc) {
            const progress = game.getExpeditionProgress();
            const timeLeft = game.getExpeditionTimeLeft();
            const pct = (progress * 100).toFixed(0);

            const activeDiv = document.createElement("div");
            activeDiv.className = "expedition-active";
            activeDiv.style.borderColor = loc.color;
            const failChance = game.getExpeditionFailChance();
            const riskText = failChance > 0
                ? `<div class="expedition-danger expedition-risky">\u26A0 Риск провала: ~${(failChance * 100).toFixed(1)}%/год</div>`
                : loc.dangerLevel ? `<div class="expedition-danger expedition-safe">\u2694 Безопасно</div>` : "";
            activeDiv.innerHTML = `
                <h3>Текущая экспедиция</h3>
                <div class="expedition-active-name" style="color:${loc.color}">${game.getLocationName(loc.id)}</div>
                ${riskText}
                <div class="expedition-bar-container">
                    <div class="expedition-bar" style="width:${pct}%; background:${loc.color}"></div>
                    <span class="expedition-bar-text">${pct}% — осталось ${timeLeft} ${_plural(timeLeft, "год", "года", "лет")}</span>
                </div>
            `;
            container.appendChild(activeDiv);
        }
    }

    // Последняя награда
    if (game.lastExpeditionReward && !game.expedition) {
        const lr = game.lastExpeditionReward;
        const lastDiv = document.createElement("div");
        lastDiv.className = "expedition-last-reward";
        lastDiv.innerHTML = `
            <div class="expedition-last-header">Последняя экспедиция: ${lr.locationName} (год ${lr.year})</div>
            <div class="expedition-last-items">${lr.rewards.join(", ")}</div>
        `;
        container.appendChild(lastDiv);
    }

    // Список локаций — только доступные + одна следующая как превью
    const header = document.createElement("h3");
    header.textContent = game.expedition ? "Другие царства" : "Тайные Царства";
    container.appendChild(header);

    // Кнопка авто-экспедиции (если перк есть)
    const autoPerksUI = game.getActiveBodyPerks();
    if (autoPerksUI.autoExpedition) {
        const autoEnabled = game._autoExpeditionEnabled !== false;
        const autoBtn = document.createElement("button");
        autoBtn.className = `btn btn-small ${autoEnabled ? "btn-primary" : "btn-secondary"}`;
        autoBtn.textContent = autoEnabled ? "Авто-экспедиция: ВКЛ" : "Авто-экспедиция: ВЫКЛ";
        autoBtn.onclick = () => {
            game._autoExpeditionEnabled = !autoEnabled;
            renderExpeditions();
        };
        container.appendChild(autoBtn);
    }

    // Сортируем по minRealm для корректного определения "следующей"
    const sorted = [...LOCATIONS].sort((a, b) => a.minRealm - b.minRealm);
    let shownNextLocked = false;

    for (const loc of sorted) {
        const isActive = game.expedition && game.expedition.locationId === loc.id;
        const meetsRealm = game.realmIndex >= loc.minRealm;

        // Скрываем недоступные, кроме первой следующей (превью)
        if (!meetsRealm) {
            if (shownNextLocked) continue;
            shownNextLocked = true;

            const card = document.createElement("div");
            card.className = "expedition-card expedition-locked";
            card.style.borderColor = "#333";
            card.innerHTML = `
                <div class="expedition-header">
                    <span class="expedition-name" style="color:#555">??? ${loc.name}</span>
                </div>
                <div class="expedition-desc" style="color:#555">${loc.description}</div>
                <div class="expedition-req">Требуется: ступень ${loc.minRealm}+ (${REALMS[loc.minRealm]?.name || "???"})</div>
            `;
            container.appendChild(card);
            continue;
        }

        const canStart = game.canStartExpedition(loc.id);
        const meetsCombat = !loc.combatCheck || game.getCombatPower() >= loc.combatCheck;
        const meetsSect = !loc.requiresSectRank || (game.sect && game.getSectRankIndex() >= SECT_RANKS.findIndex(r => r.id === loc.requiresSectRank));
        const locAscTier = game.ascendedLocations[loc.id] || 0;
        const entryCostMult = locAscTier >= 2 ? 3 : locAscTier >= 1 ? 2 : 1;
        const actualEntryCost = (loc.entryCost || 0) * entryCostMult;
        const meetsStones = !loc.entryCost || game.stones >= actualEntryCost;

        const card = document.createElement("div");
        card.className = `expedition-card ${isActive ? "expedition-current" : ""}`;
        card.style.borderColor = loc.color;

        // Бонус к скорости экспедиций (формация + тело + артефакт)
        const speedBonus = game.getFormationBonus("expeditionSpeed")
            + (game.getActiveBodyPerks().expeditionSpeed || 0)
            + game.getArtifactBonus("expeditionSpeed") * 0.01;
        const adjustedDuration = Math.max(10, Math.floor(loc.duration * (1 - speedBonus)));

        // Опасность (с учётом эпохи/событий)
        const power = game.getCombatPower();
        const danger = game.getEffectiveDangerLevel(loc);
        let dangerHtml = "";
        if (danger > 0) {
            const safe = power >= danger;
            if (safe) {
                dangerHtml = `<div class="expedition-danger expedition-safe">\u2694 Мощь ${power}/${danger} — безопасно</div>`;
            } else {
                const deficit = (danger - power) / danger;
                const failPerYear = Math.min(0.25, deficit * 0.30);
                dangerHtml = `<div class="expedition-danger expedition-risky">\u2694 Мощь ${power}/${danger} — риск провала ~${(failPerYear * 100).toFixed(1)}%/год</div>`;
            }
        }

        // Требования (только невыполненные)
        let reqParts = [];
        if (loc.combatCheck && !meetsCombat) reqParts.push(`Мощь ${loc.combatCheck}+ \u2717`);
        if (loc.requiresSectRank && !meetsSect) reqParts.push(`Ранг: Глава Зала \u2717`);
        if (loc.entryCost) reqParts.push(`Вход: ${actualEntryCost} камней ${meetsStones ? "\u2713" : "\u2717"}`);

        // Награды — конкретные цифры с учётом множителей
        const r = loc.rewards;
        const mult = _getExpeditionRewardMult(loc);
        const stoneEventMult = (game.worldEvent && game.worldEvent.modifiers.stoneIncome) || 1;
        const _realmB = 1 + Math.min(game.realmIndex, 10) * 0.3;
        const _luckB = 1 + Math.sqrt(game.luck) * 0.08;
        const stoneMult = mult.total * _realmB * _luckB * stoneEventMult;
        const essMult = mult.total * _luckB;
        const pillMult = mult.total;

        let rewardLines = [];
        if (r.stones && r.stones.max > 0) {
            const sMin = Math.floor(r.stones.min * stoneMult);
            const sMax = Math.floor(r.stones.max * stoneMult);
            rewardLines.push(`<span class="reward-item reward-stones">\u25C7 Камни: ${sMin}–${sMax}</span>`);
        }
        if (r.essence && r.essence.max > 0) {
            const eMin = Math.floor(r.essence.min * essMult);
            const eMax = Math.floor(r.essence.max * essMult);
            rewardLines.push(`<span class="reward-item reward-essence">\u2726 Эссенция: ${eMin}–${eMax}</span>`);
        }
        if (r.dust && r.dust.max > 0) {
            const dMin = Math.floor(r.dust.min * essMult);
            const dMax = Math.floor(r.dust.max * essMult);
            rewardLines.push(`<span class="reward-item reward-dust">\u2B29 Пыль: ${dMin}–${dMax}</span>`);
        }
        if (r.pills && r.pills.max > 0) {
            const pMin = Math.floor(r.pills.min * pillMult);
            const pMax = Math.floor(r.pills.max * pillMult);
            rewardLines.push(`<span class="reward-item reward-pills">\u25CB Пилюли: ${pMin}–${pMax}</span>`);
        }
        if (r.artifactChance) {
            const ascLoc = (game.ascendedLocations[loc.id] || 0) >= 1 && loc.ascend ? loc.ascend : null;
            const dispMaxTier = (ascLoc && ascLoc.artifactMaxTier) || r.artifactMaxTier;
            const dispMinTier = (ascLoc && ascLoc.artifactMinTier) || r.artifactMinTier;
            const artChance = Math.min(1, r.artifactChance * (1 + game.luck * 0.01));
            let artText = `${_chanceTier(artChance)} (${Math.round(artChance * 100)}%)`;
            if (dispMinTier && dispMaxTier && dispMinTier !== dispMaxTier) {
                artText += ` | <b>${_artifactTierNameNom(dispMinTier)}</b> — <b>${_artifactTierNameNom(dispMaxTier)}</b>`;
            } else if (dispMaxTier) {
                artText += ` | до <b>${_artifactTierName(dispMaxTier)}</b>`;
            } else if (dispMinTier) {
                artText += ` | от <b>${_artifactTierName(dispMinTier)}</b>`;
            }
            rewardLines.push(`<span class="reward-item reward-artifact">\u2666 Артефакт: ${artText}</span>`);
        }
        if (r.scrollChance) {
            rewardLines.push(`<span class="reward-item reward-scroll">\u25AB Свиток: ${_chanceTier(r.scrollChance)} (${Math.round(r.scrollChance * 100)}%)</span>`);
        }
        if (r.techniqueChance) {
            rewardLines.push(`<span class="reward-item reward-technique">\u25AB Техника: ${_chanceTier(r.techniqueChance)} (${Math.round(r.techniqueChance * 100)}%)</span>`);
        }

        // Дао бонус
        if (game.realmIndex >= 3 && game.sect) {
            const daoNeeded = typeof game.daoNeeded === "function" ? game.daoNeeded() : 100;
            const isMatch = loc.daoSect && (loc.daoSect === game.sect.id || loc.daoSect === "current_sect");
            const daoMult = isMatch ? 2 : 1;
            const daoMin = Math.floor(daoNeeded * 0.15 * daoMult);
            const daoMax = Math.floor(daoNeeded * 0.30 * daoMult);
            const sect = SECTS.find(s => s.id === game.sect.id);
            const daoLabel = sect ? (sect.daoDisplayName || "Дао") : "Дао";
            if (isMatch) {
                rewardLines.push(`<span class="reward-item" style="color:#eebb44">\u262F Дао: ${daoMin}–${daoMax} (×2 ${daoLabel})</span>`);
            } else {
                rewardLines.push(`<span class="reward-item" style="color:#888">\u262F Дао: ${daoMin}–${daoMax}</span>`);
            }
        }

        // Разбивка множителей
        const era = game.getCurrentEra();
        let bonusParts = [];
        let tipParts = [];
        if (mult.era > 1.01) {
            bonusParts.push(`<span style="color:${era.color}">${era.name} ×${mult.era.toFixed(1)}</span>`);
            tipParts.push(`${era.name}: все награды ×${mult.era.toFixed(1)}`);
        }
        if (mult.danger > 0.01) {
            bonusParts.push(`<span style="color:#cc4a3a">опасность +${Math.round(mult.danger * 100)}%</span>`);
            tipParts.push(`Опасность: бонус секты/техник/артефактов к наградам за опасные локации`);
        }
        if (mult.power > 0.01) {
            bonusParts.push(`<span style="color:#4acc6a">превосходство +${Math.round(mult.power * 100)}%</span>`);
            tipParts.push(`Превосходство: ваша мощь (${game.getCombatPower()}) выше сложности (${danger}) — доп. награды`);
        }
        if (bonusParts.length > 0) {
            tipParts.push(`Итого: все награды ×${mult.total.toFixed(2)}`);
        }
        const bonusLabel = bonusParts.length > 0
            ? `<div class="expedition-era-bonus stat-with-tip">\u2605 ${bonusParts.join(" | ")}<span class="stat-tip expedition-bonus-tip">${tipParts.join(" | ")}</span></div>`
            : "";

        const locName = game.getLocationName(loc.id);
        const locDesc = game.getLocationDescription(loc.id);
        const ascTierLoc = game.ascendedLocations[loc.id] || 0;
        const isAscended = ascTierLoc >= 1;
        const isAscended2 = ascTierLoc >= 2;

        // Прогресс вознесения (тир 2 и тир 3)
        let ascendInfo = "";
        if (game.flags["expedition_" + loc.id]) {
            const completions = (game.expeditionCompletions || {})[loc.id] || 0;
            if (!isAscended) {
                // Путь к тиру 2
                const ascAdvId = "ascend_" + loc.id;
                const ascAdvDone = (game.completedAdventures || []).includes(ascAdvId);
                if (completions < 10) {
                    ascendInfo = `<div class="expedition-ascend-progress">\u2728 Изучение: ${completions}/10 походов</div>`;
                } else if (!ascAdvDone) {
                    const ascDanger = loc.ascend && loc.ascend.dangerLevel ? loc.ascend.dangerLevel : 0;
                    ascendInfo = `<div class="expedition-ascend-ready">\u2728 Доступно испытание вознесения! <span style="color:#ee7a7a">\u26A0 Опасность вырастет${ascDanger ? " до " + ascDanger : ""}</span></div>`;
                }
            } else if (!isAscended2) {
                // Путь к тиру 3 (считаем завершения после вознесения)
                const t3completions = Math.max(0, completions - 10);
                const ascAdvId = "ascend2_" + loc.id;
                const ascAdvDone = (game.completedAdventures || []).includes(ascAdvId);
                if (t3completions < 10) {
                    ascendInfo = `<div class="expedition-ascend-progress">\u2728\u2728 Глубокое изучение: ${t3completions}/10 походов</div>`;
                } else if (!ascAdvDone) {
                    ascendInfo = `<div class="expedition-ascend-ready">\u2728\u2728 Доступно высшее испытание! <span style="color:#ee7a7a">\u26A0 Опасность значительно вырастет</span></div>`;
                }
            }
        }

        card.innerHTML = `
            <div class="expedition-header">
                <span class="expedition-name" style="color:${loc.color}">${isAscended ? "\u2728".repeat(game.ascendedLocations[loc.id]) + " " : ""}${locName}</span>
                <span class="expedition-duration">${adjustedDuration} лет</span>
            </div>
            <div class="expedition-desc">${locDesc}</div>
            ${isAscended2 ? '<div class="expedition-ascended">\u2728\u2728 Высшее вознесение — награды ×3</div>' : isAscended ? '<div class="expedition-ascended">\u2728 Вознесено — награды ×2</div>' : ""}
            ${dangerHtml}
            <div class="expedition-rewards">${rewardLines.join("")}${bonusLabel}</div>
            ${reqParts.length > 0 ? `<div class="expedition-req">${reqParts.join(" | ")}</div>` : ""}
            ${ascendInfo}
            <div class="expedition-actions">
                ${isActive
                    ? '<span class="expedition-in-progress">В пути...</span>'
                    : canStart
                        ? `<button class="btn btn-small btn-primary" onclick="startExpeditionUI('${loc.id}')">Отправиться</button>`
                        : game.expedition
                            ? `<span class="expedition-busy">Уже в экспедиции</span>`
                            : `<span class="expedition-unavailable">Недоступно</span>`
                }
            </div>
        `;
        container.appendChild(card);
    }
}

function startExpeditionUI(locationId) {
    game.startExpedition(locationId);
    renderExpeditions();
}

function ascendLocationUI(locationId) {
    if (game.ascendLocation(locationId)) {
        renderExpeditions();
    }
}
