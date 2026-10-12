// ============================================================
// UI/ADVENTURES.JS — Таб приключений: слухи + активные квесты
// ============================================================

let _v2AdventureHelpOpen = false;

// Показать мощь босса (только для приключений с showBossPower — игрок уже проиграл боссу в цепочке)
function _getAdventureBossPower(adv) {
    if (!adv.showBossPower) return "";
    let maxCombat = 0;
    for (const step of adv.steps) {
        for (const choice of step.choices) {
            const chk = game.getAdventureCheck(adv, choice, {});
            if (chk && chk.combatPower)
                maxCombat = Math.max(maxCombat, chk.combatPower);
        }
    }
    if (!maxCombat) return "";
    const current = Math.floor(game.getCombatPower());
    const has = current >= maxCombat;
    return `<span class="${has ? 'adventure-check-pass' : 'adventure-check-fail'}">Боевая мощь босса: ${maxCombat} · ваша: ${current}</span>`;
}

function renderAdventures() {
    if (deferUIRender(renderAdventures)) return;
    const container = document.getElementById("adventures-list");
    if (!container) return;
    const previousHelp = container.querySelector("#v2-adventure-help");
    if (previousHelp) _v2AdventureHelpOpen = previousHelp.open;
    container.innerHTML = `<p class="v2-section-intro">Приключения — истории с выбором и наградами. Возьмите одно из доступных и решайте, как пройти каждый этап.</p>
        <details class="v2-details" id="v2-adventure-help"${_v2AdventureHelpOpen ? " open" : ""}><summary>Как читать условия</summary>
        <p>Проверка сравнивает ваше значение с требуемым. Если условие не выполнено, вариант либо недоступен, либо ведёт к указанной неудаче. Цена списывается при выборе, включая неудачу.</p>
        <p>Боевая мощь учитывает силу и боевые бонусы. Проверка силы использует силу с бонусами артефактов. Для духа и удачи проверяются соответствующие характеристики с бонусами артефактов.</p>
        <p>Время этапа расходует годы жизни. Слухи обычно исчезают через 100 лет; испытания для вознесения остаются доступны.</p></details>`;

    const hasRumors = game.adventureRumors.length > 0;
    const hasActive = game.activeAdventures.length > 0;

    const hasLastReward = game.lastAdventureReward && !hasActive;

    if (!hasRumors && !hasActive && !hasLastReward) {
        container.innerHTML += '<div class="adventure-empty">Пока нет доступных приключений. Слухи появляются со временем по мере роста персонажа. После завершения приключения новые слухи не появляются 50 лет.</div>';
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
                    let canChoose = !game.gameOver;
                    let failedCheck = false;

                    // Стоимость рассчитывается по тем же флагам, что и при выборе.
                    const cost = typeof choice.cost === "function" ? choice.cost(adventure.flags) : choice.cost;
                    if (cost) {
                        if (cost.stones) {
                            const has = game.stones >= cost.stones;
                            reqParts.push(`<span class="${has ? 'adventure-req-met' : 'adventure-req-unmet'}">Цена: ${cost.stones} камней</span>`);
                            if (!has) canChoose = false;
                        }
                        if (cost.essence) {
                            const has = game.daoEssence >= cost.essence;
                            reqParts.push(`<span class="${has ? 'adventure-req-met' : 'adventure-req-unmet'}">Цена: ${cost.essence} эссенции</span>`);
                            if (!has) canChoose = false;
                        }
                        if (cost.pills) {
                            const has = game.pills >= cost.pills;
                            reqParts.push(`<span class="${has ? 'adventure-req-met' : 'adventure-req-unmet'}">Цена: ${cost.pills} пилюль</span>`);
                            if (!has) canChoose = false;
                        }
                        if (cost.dust) {
                            const has = game.artifactDust >= cost.dust;
                            reqParts.push(`<span class="${has ? 'adventure-req-met' : 'adventure-req-unmet'}">Цена: ${cost.dust} пыли</span>`);
                            if (!has) canChoose = false;
                        }
                    }

                    // Проверка стата (check может быть функцией от флагов)
                    const resolvedCheck = game.getAdventureCheck(adv, choice, adventure.flags);
                    if (resolvedCheck) {
                        if (resolvedCheck.strength) {
                            const value = game.strength + game.getArtifactBonus("strength");
                            const has = value >= resolvedCheck.strength;
                            failedCheck ||= !has;
                            if (!has && !choice.fail) canChoose = false;
                            reqParts.push(`<span class="${has ? 'adventure-check-pass' : 'adventure-check-fail'}">Сила: нужно ${resolvedCheck.strength} · у вас ${Number(value.toFixed(1))}</span>`);
                        }
                        if (resolvedCheck.spirit) {
                            const value = game.spirit + game.getArtifactBonus("spirit");
                            const has = value >= resolvedCheck.spirit;
                            failedCheck ||= !has;
                            if (!has && !choice.fail) canChoose = false;
                            reqParts.push(`<span class="${has ? 'adventure-check-pass' : 'adventure-check-fail'}">Дух: нужно ${resolvedCheck.spirit} · у вас ${Number(value.toFixed(1))}</span>`);
                        }
                        if (resolvedCheck.luck) {
                            const value = game.luck + game.getArtifactBonus("luck");
                            const has = value >= resolvedCheck.luck;
                            failedCheck ||= !has;
                            if (!has && !choice.fail) canChoose = false;
                            reqParts.push(`<span class="${has ? 'adventure-check-pass' : 'adventure-check-fail'}">Удача: нужно ${resolvedCheck.luck} · у вас ${Number(value.toFixed(1))}</span>`);
                        }
                        if (resolvedCheck.combatPower) {
                            const has = game.getCombatPower() >= resolvedCheck.combatPower;
                            failedCheck ||= !has;
                            if (!has && !choice.fail) canChoose = false;
                            reqParts.push(`<span class="${has ? 'adventure-check-pass' : 'adventure-check-fail'}">Боевая мощь: нужно ${resolvedCheck.combatPower} · у вас ${game.getCombatPower()}</span>`);
                        }
                        if (resolvedCheck.hasSect) {
                            const has = !!game.sect;
                            failedCheck ||= !has;
                            if (!has && !choice.fail) canChoose = false;
                            reqParts.push(`<span class="${has ? 'adventure-check-pass' : 'adventure-check-fail'}">Секта: ${has ? '\u2713' : '\u2717'}</span>`);
                        }
                        if (resolvedCheck.flag) {
                            const has = adventure.flags[resolvedCheck.flag] || (choice.altCheck && choice.altCheck.flag && adventure.flags[choice.altCheck.flag]);
                            failedCheck ||= !has;
                            if (!has && !choice.fail) canChoose = false;
                            reqParts.push(`<span class="${has ? 'adventure-check-pass' : 'adventure-check-fail'}">Особое условие ${has ? '\u2713' : '\u2717'}</span>`);
                        }
                    }

                    // Провал не блокирует, но показывает что check не пройден
                    const reqHtml = reqParts.length > 0 ? `<div class="adventure-choice-reqs">${reqParts.join(" | ")}</div>` : "";
                    const failureHint = failedCheck && choice.fail ? `<div class="adventure-check-fail">Условие не выполнено: этот выбор приведёт к неудаче.${cost ? " Цена всё равно будет списана." : ""}</div>` : "";

                    return `<button class="btn adventure-choice-btn ${!canChoose ? 'btn-disabled' : ''}" `
                        + `onclick="chooseAdventureUI(${idx}, ${ci})" ${!canChoose ? 'disabled' : ''}>`
                        + `<div class="adventure-choice-text">${choice.text}</div>`
                        + `<div class="adventure-choice-desc">${typeof choice.description === "function" ? choice.description(adventure.flags) : choice.description}</div>`
                        + (choice.duration ? `<div class="adventure-choice-duration">${choice.duration} ${_plural(choice.duration, 'год', 'года', 'лет')}</div>` : '')
                        + reqHtml
                        + failureHint
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
                        <span class="adventure-progress-text">${pct}% · осталось ${timeLeft} ${_plural(timeLeft, 'год', 'года', 'лет')}</span>
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

            const isAscend = rumor.id.startsWith("ascend_") || rumor.id.startsWith("ascend2_");
            const yearsLeft = isAscend ? Infinity : Math.max(0, 100 - (game.years - rumor.appearedYear));
            const cost = adv.ascendCost || {};
            const hasEntryCost = (!cost.stones || game.stones >= cost.stones) && (!cost.essence || game.daoEssence >= cost.essence) && (!cost.dust || game.artifactDust >= cost.dust);
            const canAccept = !game.gameOver && game.activeAdventures.length < 1 && adv.condition(game) && !game.completedAdventures.includes(adv.id) && hasEntryCost;

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
                ${game.realmIndex >= 3 && game.sect ? `<div class="adventure-reqs-summary">Завершение продвигает путь секты (Дао)</div>` : ""}
                <div class="adventure-actions">
                    ${canAccept
                        ? `<button class="btn btn-small btn-primary" onclick="acceptAdventureUI('${adv.id}')">Начать приключение</button>`
                        : `<span class="adventure-busy">${game.activeAdventures.length >= 1 ? "Сначала завершите текущее приключение" : !hasEntryCost ? "Недостаточно ресурсов для входа" : "Условия не выполнены"}</span>`
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
