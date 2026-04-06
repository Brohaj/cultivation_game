// ============================================================
// UI/ADVENTURES.JS — Таб приключений: слухи + активные квесты
// ============================================================

// Показать мощь босса (только для приключений с showBossPower — игрок уже проиграл боссу в цепочке)
function _getAdventureBossPower(adv) {
    if (!adv.showBossPower) return "";
    let maxCombat = 0;
    for (const step of adv.steps) {
        for (const choice of step.choices) {
            const chk = typeof choice.check === "function" ? choice.check({}) : choice.check;
            if (chk && chk.combatPower)
                maxCombat = Math.max(maxCombat, chk.combatPower);
        }
    }
    if (!maxCombat) return "";
    const current = Math.floor(game.getCombatPower());
    const has = current >= maxCombat;
    return `<span class="${has ? 'adventure-check-pass' : 'adventure-check-fail'}">Босс: мощь ${maxCombat} (ваша: ${current})</span>`;
}

function renderAdventures() {
    const container = document.getElementById("adventures-list");
    if (!container) return;
    container.innerHTML = "";

    const hasRumors = game.adventureRumors.length > 0;
    const hasActive = game.activeAdventures.length > 0;

    const hasLastReward = game.lastAdventureReward && !hasActive;

    if (!hasRumors && !hasActive && !hasLastReward) {
        container.innerHTML = '<div class="adventure-empty">Пока нет слухов о приключениях. Они появятся со временем через события.</div>';
        return;
    }

    // Последняя награда
    if (hasLastReward) {
        const lr = game.lastAdventureReward;
        const lastDiv = document.createElement("div");
        lastDiv.className = "adventure-last-reward";
        lastDiv.innerHTML = `
            <div class="adventure-last-header">Последнее приключение: ${lr.name} (год ${lr.year})</div>
            <div class="adventure-last-items">${lr.rewards.join(", ")}</div>
        `;
        container.appendChild(lastDiv);
    }

    // ── Активные приключения ──
    if (hasActive) {
        const activeHeader = document.createElement("h3");
        activeHeader.textContent = "Активные приключения";
        container.appendChild(activeHeader);

        game.activeAdventures.forEach((adventure, idx) => {
            const adv = ADVENTURES.find(a => a.id === adventure.id);
            if (!adv) return;

            const card = document.createElement("div");
            card.className = "adventure-card adventure-active";

            // История шагов
            let historyHtml = "";
            if (adventure.completedSteps.length > 0) {
                const items = adventure.completedSteps.map(s =>
                    `<div class="adventure-history-item ${s.passed ? '' : 'adventure-history-failed'}">`
                    + `<span class="adventure-history-check">${s.passed ? '\u2713' : '\u2717'}</span> ${s.choiceText}`
                    + (s.failText ? ` <span class="adventure-history-note">(${s.failText})</span>` : "")
                    + `</div>`
                ).join("");
                historyHtml = `<div class="adventure-history"><div class="adventure-history-label">Пройденные этапы:</div>${items}</div>`;
            }

            if (adventure.awaitingChoice) {
                // Шаг с выбором
                const step = adv.steps[adventure.currentStep];
                if (!step) return;

                const stepText = typeof step.text === "function" ? step.text(adventure.flags) : step.text;

                let choicesHtml = step.choices.map((choice, ci) => {
                    let reqParts = [];
                    let canChoose = true;

                    // Стоимость
                    if (choice.cost) {
                        if (choice.cost.stones) {
                            const has = game.stones >= choice.cost.stones;
                            reqParts.push(`<span class="${has ? 'adventure-req-met' : 'adventure-req-unmet'}">${choice.cost.stones} камней</span>`);
                            if (!has) canChoose = false;
                        }
                        if (choice.cost.essence) {
                            const has = game.daoEssence >= choice.cost.essence;
                            reqParts.push(`<span class="${has ? 'adventure-req-met' : 'adventure-req-unmet'}">${choice.cost.essence} эссенции</span>`);
                            if (!has) canChoose = false;
                        }
                        if (choice.cost.pills) {
                            const has = game.pills >= choice.cost.pills;
                            reqParts.push(`<span class="${has ? 'adventure-req-met' : 'adventure-req-unmet'}">${choice.cost.pills} пилюль</span>`);
                            if (!has) canChoose = false;
                        }
                    }

                    // Проверка стата (check может быть функцией от флагов)
                    const resolvedCheck = typeof choice.check === "function" ? choice.check(adventure.flags) : choice.check;
                    if (resolvedCheck) {
                        if (resolvedCheck.strength) {
                            const has = game.strength >= resolvedCheck.strength;
                            reqParts.push(`<span class="${has ? 'adventure-check-pass' : 'adventure-check-fail'}">Сила: ${game.strength}/${resolvedCheck.strength}</span>`);
                        }
                        if (resolvedCheck.spirit) {
                            const has = game.spirit >= resolvedCheck.spirit;
                            reqParts.push(`<span class="${has ? 'adventure-check-pass' : 'adventure-check-fail'}">Дух: ${game.spirit}/${resolvedCheck.spirit}</span>`);
                        }
                        if (resolvedCheck.luck) {
                            const has = game.luck >= resolvedCheck.luck;
                            reqParts.push(`<span class="${has ? 'adventure-check-pass' : 'adventure-check-fail'}">Удача: ${game.luck}/${resolvedCheck.luck}</span>`);
                        }
                        if (resolvedCheck.combatPower) {
                            const has = game.getCombatPower() >= resolvedCheck.combatPower;
                            reqParts.push(`<span class="${has ? 'adventure-check-pass' : 'adventure-check-fail'}">Мощь: ${game.getCombatPower()}/${resolvedCheck.combatPower}</span>`);
                        }
                        if (resolvedCheck.hasSect) {
                            const has = !!game.sect;
                            reqParts.push(`<span class="${has ? 'adventure-check-pass' : 'adventure-check-fail'}">Секта: ${has ? '\u2713' : '\u2717'}</span>`);
                        }
                        if (resolvedCheck.flag) {
                            const has = adventure.flags[resolvedCheck.flag] || (choice.altCheck && choice.altCheck.flag && adventure.flags[choice.altCheck.flag]);
                            reqParts.push(`<span class="${has ? 'adventure-check-pass' : 'adventure-check-fail'}">Особое условие ${has ? '\u2713' : '\u2717'}</span>`);
                        }
                    }

                    // Провал не блокирует, но показывает что check не пройден
                    const hasFail = !!choice.fail;
                    const reqHtml = reqParts.length > 0 ? `<div class="adventure-choice-reqs">${reqParts.join(" | ")}</div>` : "";

                    return `<button class="btn adventure-choice-btn ${!canChoose ? 'btn-disabled' : ''}" `
                        + `onclick="chooseAdventureUI(${idx}, ${ci})" ${!canChoose ? 'disabled' : ''}>`
                        + `<div class="adventure-choice-text">${choice.text}</div>`
                        + `<div class="adventure-choice-desc">${typeof choice.description === "function" ? choice.description(adventure.flags) : choice.description}</div>`
                        + (choice.duration ? `<div class="adventure-choice-duration">${choice.duration} ${_plural(choice.duration, 'год', 'года', 'лет')}</div>` : '')
                        + reqHtml
                        + `</button>`;
                }).join("");

                card.innerHTML = `
                    <div class="adventure-card-header">
                        <span class="adventure-name">${adv.name}</span>
                        <span class="adventure-step">Этап ${adventure.currentStep + 1}/${adv.steps.length}</span>
                    </div>
                    ${historyHtml}
                    <div class="adventure-step-text">${stepText}</div>
                    <div class="adventure-choices">${choicesHtml}</div>
                    <button class="btn btn-small btn-danger adventure-abandon" onclick="abandonAdventureUI(${idx})">Отказаться</button>
                `;
            } else {
                // В процессе — прогресс-бар (для приключений с duration)
                const elapsed = game.years - adventure.stepStartYear;
                const pct = adventure.stepDuration > 0 ? Math.min(100, (elapsed / adventure.stepDuration * 100)).toFixed(0) : 100;
                const timeLeft = adventure.stepDuration > 0 ? Math.max(0, adventure.stepDuration - elapsed) : 0;

                card.innerHTML = `
                    <div class="adventure-card-header">
                        <span class="adventure-name">${adv.name}</span>
                        <span class="adventure-step">Этап ${adventure.currentStep + 1}/${adv.steps.length}</span>
                    </div>
                    ${historyHtml}
                    ${adventure.stepDuration > 0 ? `
                    <div class="adventure-progress-container" data-adv-idx="${idx}">
                        <div class="adventure-progress-bar" style="width:${pct}%"></div>
                        <span class="adventure-progress-text">${pct}% — ${timeLeft} ${_plural(timeLeft, 'год', 'года', 'лет')}</span>
                    </div>` : ''}
                    <button class="btn btn-small btn-danger adventure-abandon" onclick="abandonAdventureUI(${idx})">Отказаться</button>
                `;
            }

            container.appendChild(card);
        });
    }

    // ── Слухи ──
    if (hasRumors) {
        const rumorHeader = document.createElement("h3");
        rumorHeader.textContent = "Слухи";
        container.appendChild(rumorHeader);

        game.adventureRumors.forEach((rumor) => {
            const adv = ADVENTURES.find(a => a.id === rumor.id);
            if (!adv) return;

            const isAscend = rumor.id.startsWith("ascend_");
            const yearsLeft = isAscend ? Infinity : Math.max(0, 100 - (game.years - rumor.appearedYear));
            const canAccept = game.activeAdventures.length < 1;

            const bossPower = _getAdventureBossPower(adv);

            const card = document.createElement("div");
            card.className = "adventure-card adventure-rumor";
            card.innerHTML = `
                <div class="adventure-card-header">
                    <span class="adventure-name">${adv.name}</span>
                    ${isAscend ? '<span class="adventure-rumor-timer" style="color:#eebb44">\u2728 Постоянное</span>' : `<span class="adventure-rumor-timer">Истекает через ${yearsLeft} ${_plural(yearsLeft, 'год', 'года', 'лет')}</span>`}
                </div>
                <div class="adventure-desc">${adv.description}</div>
                ${bossPower ? `<div class="adventure-reqs-summary">${bossPower}</div>` : ""}
                ${adv.ascendCost ? `<div class="adventure-reqs-summary" style="color:#cc7a3a">\u2728 Стоимость: ${adv.ascendCost.stones ? adv.ascendCost.stones + " камней" : ""}${adv.ascendCost.essence ? ", " + adv.ascendCost.essence + " эссенции" : ""}${adv.ascendCost.dust ? ", " + adv.ascendCost.dust + " пыли" : ""}</div>` : ""}
                ${game.realmIndex >= 3 && game.sect ? `<div class="adventure-reqs-summary" style="color:#eebb44">\u262F +Дао за завершение</div>` : ""}
                <div class="adventure-actions">
                    ${canAccept
                        ? `<button class="btn btn-small btn-primary" onclick="acceptAdventureUI('${adv.id}')">Принять</button>`
                        : '<span class="adventure-busy">Макс. 2 активных</span>'
                    }
                </div>
            `;
            container.appendChild(card);
        });
    }
}

function acceptAdventureUI(adventureId) {
    game.acceptAdventure(adventureId);
    renderAdventures();
}

function chooseAdventureUI(adventureIdx, choiceIdx) {
    game.chooseAdventureOption(adventureIdx, choiceIdx);
    renderAdventures();
}

function abandonAdventureUI(idx) {
    game.abandonAdventure(idx);
    renderAdventures();
}
