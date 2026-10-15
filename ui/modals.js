// ============================================================
// UI/MODALS.JS — Модалки: духовный корень, перерождение, вступление
// ============================================================

// === МОДАЛКА ДУХОВНОГО КОРНЯ ===
function showSpiritualRootModal() {
    const modal = document.getElementById("root-modal");
    if (!modal || game.spiritualRoot || game.gameOver || game.pendingRebirth) return;
    modal.classList.add("active");
    // Заполнить имя из прошлой жизни
    const nameInput = document.getElementById("cultivator-name-input");
    if (nameInput) nameInput.value = game.name || "";
    renderRootSelection();
}

function renderRootSelection() {
    const resultDiv = document.getElementById("root-result");
    if (!resultDiv) return;

    const available = game.getAvailableRoots();
    const availableIds = available.map(r => r.id);
    const minRootTier = game.getMinRootTier();
    const totalRebirths = game.prestige.totalRebirths || 0;
    const qualifiedRebirths = game.getQualifiedRebirths();
    const isFirstLife = totalRebirths === 0;

    if (isFirstLife && availableIds.includes("common")) {
        // Первая жизнь — только обычный корень, без выбора
        const common = SPIRITUAL_ROOTS.find(r => r.id === "common");
        resultDiv.innerHTML = `
            <p class="modal-first-life">Духовный корень — талант вашего персонажа: он определяет скорость накопления ци и стихии. В первой жизни доступен обычный корень.</p>
            <div class="root-card root-${common.tier} selected" style="border-color: ${common.color}">
                <h3 style="color: ${common.color}">${common.name}</h3>
                <p class="root-desc">${common.description}</p>
                <p class="root-mult">Скорость накопления ци: ×${common.qiMultiplier.toFixed(2)}</p>
            </div>
        `;
        const acceptBtn = document.getElementById("btn-accept-root");
        acceptBtn.style.display = "block";
        acceptBtn.textContent = "Начать первую жизнь";
        acceptBtn.onclick = () => acceptRoot("common");
    } else {
        // Перерождение — выбор из доступных корней
        // Показываем только: разблокированные + первые заблокированные как тизер
        let html = `<p class="modal-rebirth-hint">Выберите талант для нового пути. Более сильный корень ускоряет накопление ци; его стихии помогают совместимым техникам. Выбор действует до следующего перерождения.</p><p class="modal-rebirth-hint root-life-progress">Всего перерождений: ${totalRebirths}. Зачётных жизней: ${qualifiedRebirths}. При старте на Золотом Ядре или выше для зачёта нужен хотя бы один успешный прорыв.</p>`;
        html += `<div class="root-grid">`;

        const tierNames = { trash: "Ничтожный", common: "Смертный", uncommon: "Духовный", rare: "Мистический", epic: "Небесный", legendary: "Священный", divine: "Божественный" };

        // Определяем максимальный разблокированный тир корней
        const tierOrder = ["trash", "common", "uncommon", "rare", "epic", "legendary", "divine"];
        let maxUnlockedRootTier = -1;
        for (const root of SPIRITUAL_ROOTS) {
            if (availableIds.includes(root.id)) {
                const idx = tierOrder.indexOf(root.tier);
                if (idx > maxUnlockedRootTier) maxUnlockedRootTier = idx;
            }
        }

        for (const root of SPIRITUAL_ROOTS) {
            const unlocked = availableIds.includes(root.id);
            const rootTierIdx = tierOrder.indexOf(root.tier);
            // Корни ниже минимума нового происхождения не предлагаются даже как тизеры.
            if (minRootTier && rootTierIdx < TIER_ORDER[minRootTier]) continue;

            if (!unlocked) {
                // Показать тизер только для следующего тира
                if (rootTierIdx > maxUnlockedRootTier + 1) continue;
                // Тизер — просто "???"
                html += `<div class="root-card root-locked" style="border-color: #333">
                    <h3 style="color: #444">???</h3>
                    <p class="root-tier-label" style="color: #555">${tierNames[root.tier] || "???"}</p>
                </div>`;
                continue;
            }

            const elemCount = typeof root.elements === "number" ? root.elements : (Array.isArray(root.elements) ? root.elements.length : 0);

            html += `<div class="root-card root-${root.tier}"
                          style="border-color: ${root.color}"
                          onclick="selectRootUI('${root.id}')">
                <h3 style="color: ${root.color}">${root.name}</h3>
                <p class="root-tier-label" style="color: ${root.color}">${tierNames[root.tier] || root.tier}</p>
                <p class="root-desc">${root.description}</p>
                <p class="root-mult">Накопление ци: ×${root.qiMultiplier.toFixed(2)}</p>
                ${elemCount > 0 ? `<p class="root-elem-count">${elemCount} ${elemCount === 1 ? "элемент" : elemCount < 5 ? "элемента" : "элементов"}</p>` : ""}
                ${root.statBonus && Object.keys(root.statBonus).length > 0 ? `<p class="root-stat-bonus">${Object.entries(root.statBonus).map(([k, v]) => `+${v} ${k === "spirit" ? "дух" : k === "strength" ? "сила" : k === "luck" ? "удача" : k}`).join(", ")}</p>` : ""}
            </div>`;
        }
        html += `</div>`;
        resultDiv.innerHTML = html;

        const acceptBtn = document.getElementById("btn-accept-root");
        acceptBtn.style.display = "none"; // покажется при выборе
    }

}

let _selectedElements = [];
let _selectedRootId = null;

function selectRootUI(rootId) {
    if (game.spiritualRoot || game.gameOver || game.pendingRebirth) return;
    const root = game.getAvailableRoots().find(r => r.id === rootId);
    if (!root) return;

    _selectedRootId = rootId;
    _selectedElements = [];

    // Подсветить выбранный
    document.querySelectorAll(".root-card").forEach(c => c.classList.remove("selected"));
    document.querySelectorAll(".root-card").forEach(c => {
        if (c.getAttribute("onclick")?.includes(rootId)) c.classList.add("selected");
    });

    const maxElements = typeof root.elements === "number" ? root.elements : (Array.isArray(root.elements) ? root.elements.length : 0);
    const canChoose = game.canChooseElements() && maxElements > 0;

    // Показать/скрыть меню элементов
    const elemContainer = document.getElementById("element-choice-section");
    if (elemContainer) {
        if (canChoose) {
            const unlocked = game.getUnlockedElements();
            const allElements = typeof ELEMENTS !== "undefined" ? ELEMENTS : [];
            elemContainer.style.display = "";
            elemContainer.innerHTML = `
                <div class="element-choice-header">Выберите до ${maxElements} стихий. Если ничего не выбрать, они определятся случайно:</div>
                <div class="element-choice-grid">
                    ${allElements.map(e => {
                        const isUnlocked = unlocked.includes(e.id);
                        return `<button class="btn btn-small element-choice-btn ${isUnlocked ? "" : "btn-disabled"}"
                            data-element="${e.id}"
                            ${isUnlocked ? `onclick="toggleElementChoice('${e.id}', ${maxElements})"` : "disabled"}
                            style="border-color:${isUnlocked ? e.color : '#333'};color:${isUnlocked ? e.color : '#555'}">
                            ${e.icon} ${e.name}
                        </button>`;
                    }).join("")}
                </div>
                <div class="element-choice-hint" id="element-choice-hint">Выбрано: 0/${maxElements} · случайные стихии</div>
            `;
        } else {
            elemContainer.style.display = "none";
            elemContainer.innerHTML = "";
        }
    }

    const acceptBtn = document.getElementById("btn-accept-root");
    acceptBtn.style.display = "block";
    acceptBtn.textContent = `Выбрать: ${root.name}`;
    acceptBtn.onclick = () => acceptRoot(rootId);
}

function toggleElementChoice(elementId, maxElements) {
    const root = game.getAvailableRoots().find(r => r.id === _selectedRootId);
    const unlocked = game.getUnlockedElements();
    if (!root || game.spiritualRoot || !game.canChooseElements() || !unlocked.includes(elementId)) return;
    maxElements = typeof root.elements === "number" ? root.elements : (Array.isArray(root.elements) ? root.elements.length : 0);
    _selectedElements = [...new Set(_selectedElements)].filter(id => unlocked.includes(id)).slice(0, maxElements);
    const idx = _selectedElements.indexOf(elementId);
    if (idx >= 0) {
        _selectedElements.splice(idx, 1);
    } else if (_selectedElements.length < maxElements) {
        _selectedElements.push(elementId);
    }
    // Обновить подсветку кнопок
    document.querySelectorAll(".element-choice-btn").forEach(btn => {
        const eid = btn.dataset.element;
        if (_selectedElements.includes(eid)) {
            btn.classList.add("selected");
        } else {
            btn.classList.remove("selected");
        }
    });
    const hint = document.getElementById("element-choice-hint");
    if (hint) {
        hint.textContent = _selectedElements.length > 0
            ? `Выбрано: ${_selectedElements.length}/${maxElements}`
            : `Выбрано: 0/${maxElements} · случайные стихии`;
    }
}

function acceptRoot(rootId) {
    const root = game.selectSpiritualRoot(rootId, _selectedElements.length > 0 ? _selectedElements : null);
    if (!root) return;
    _selectedElements = [];
    _selectedRootId = null;

    // Имя культиватора
    const nameInput = document.getElementById("cultivator-name-input");
    const rawName = nameInput ? nameInput.value.trim() : "";
    game.name = rawName || "Культиватор";

    document.getElementById("root-modal").classList.remove("active");
    const startingTechnique = game.learnStartingTechnique();

    addLog(`${game.name} начинает путь культивации.`, "system");
    addLog(`Ваш духовный корень: ${root.name}`, "breakthrough");
    const elemNames = root.elements.map(eid => {
        const el = ELEMENTS.find(e => e.id === eid);
        return el ? el.name : eid;
    });
    if (elemNames.length > 0) {
        addLog(`Элементы: ${elemNames.join(", ")}`, "system");
    }
    addLog(`Изучена техника: ${startingTechnique.name}`, "reward");

    // Показать вступление только при первой жизни
    if (game.prestige.totalRebirths === 0) {
        document.getElementById("intro-modal").classList.add("active");
        // Игра стартует после закрытия intro-modal (см. closeIntroModal)
    } else {
        playIntro();
        game.start();
        updateUI();
    }
}

function closeIntroModal() {
    document.getElementById("intro-modal").classList.remove("active");
    playIntro();
    game.start();
    updateUI();
}

// === ВСТУПЛЕНИЕ ===
// === ПАУЗА ===

function _syncPauseButton() {
    const btn = document.getElementById('btn-pause');
    if (!btn) return;
    btn.textContent = game._paused ? '\u25B6 Продолжить' : '\u23F8 Пауза';
    btn.classList.toggle('btn-pause-active', !!game._paused);
    btn.disabled = !!(game.gameOver || game.pendingRebirth);
}

function togglePause() {
    const btn = document.getElementById("btn-pause");
    if (!btn || game.gameOver || game.pendingRebirth) return;
    if (game._paused) {
        game.start(); // start() сам сбрасывает _paused и пересоздаёт таймеры
        addLog("Игра возобновлена.", "system");
    } else {
        game.pause();
        saveGame();
        addLog("Игра на паузе.", "system");
    }
    _syncPauseButton();
    updateUI();
}

function playIntro() {
    const log = document.getElementById("event-log");
    if (!log) return;
    log.innerHTML = "";
    INTRO_LINES.forEach((line, i) => {
        setTimeout(() => addLog(line, "system"), i * 800);
    });
}

// === ПЕРЕРОЖДЕНИЕ ===

let selectedRebirthBody = "peasant";

function _v2BodyAscensionDescription(ascension) {
    return ascension.desc
        .replace(/статам/g, "характеристикам")
        .replace(/демон жрёт 50% статов/g, "при поражении от внутреннего демона теряется 50% характеристик")
        .replace(/КД/g, "ожидание")
        .replace(/авто-рефайн пилюль/g, "автоматическая очистка пилюль")
        .replace(/тир артефактов/g, "качество артефактов")
        .replace(/тир \+/g, "качество артефактов +")
        .replace(/экспедиций/g, "походов")
        .replace(/авто-экспедиции/g, "автоматические походы")
        .replace(/старт с ([123]) ступени/g, (_, index) => `старт: ${REALMS[Number(index)].name}`)
        .replace(/старт со ([123]) ступени/g, (_, index) => `старт: ${REALMS[Number(index)].name}`);
}

function showRebirthModal(naturalDeath) {
    const pending = game.beginRebirth(naturalDeath);
    selectedRebirthBody = pending.bodyId || "peasant";
    document.getElementById("rebirth-modal").classList.add("active");
    renderRebirthContent();
}

// Обычная загрузка и импорт одинаково возобновляют незавершённый выбор.
function resumeLoadedGame(keepPaused = false) {
    document.getElementById("rebirth-modal")?.classList.remove("active");
    document.getElementById("root-modal")?.classList.remove("active");
    if (game.pendingRebirth) {
        showRebirthModal(game.pendingRebirth.naturalDeath);
    } else {
        if (!game.gameOver) {
            if (!game.spiritualRoot) {
                showSpiritualRootModal();
            } else if (game._paused || keepPaused) {
                game.pause();
            } else {
                game.start();
            }
        }
    }
    _syncPauseButton();
    updateUI();
}

// Совместимость с обновлением содержимого: основные разделы всегда открыты.
function _saveAccordionState() {
    const state = {};
    document.querySelectorAll(".rebirth-accordion").forEach((el, i) => {
        state[i] = true;
    });
    state.details = {};
    document.querySelectorAll("details[data-rebirth-detail]").forEach(el => {
        state.details[el.dataset.rebirthDetail] = el.open;
    });
    return state;
}
function _restoreAccordionState(state) {
    document.querySelectorAll(".rebirth-accordion").forEach(el => {
        const body = el.querySelector(".rebirth-accordion-body");
        if (body) body.style.display = "block";
        el.classList.add("open");
    });
    document.querySelectorAll("details[data-rebirth-detail]").forEach(el => {
        if (state?.details && state.details[el.dataset.rebirthDetail] !== undefined) el.open = state.details[el.dataset.rebirthDetail];
    });
}

function renderRebirthContent() {
    const content = document.getElementById("rebirth-content");
    const savedState = _saveAccordionState();
    const karmaEarned = game.pendingRebirth ? game.pendingRebirth.karmaEarned : 0;
    const naturalDeath = !!game.pendingRebirth?.naturalDeath;

    let html = `<h2>Рассеивание культивации</h2>`;
    const noKarma = karmaEarned === 0 && game.realmIndex < 3;
    html += `<p class="rebirth-intro">${naturalDeath ? "Эта жизнь завершена. Впереди новый виток пути." : "Вы рассеиваете накопленную культивацию, чтобы начать новую жизнь."} ${noKarma ? '<span class="adventure-check-fail">Карма начисляется начиная с Золотого Ядра. За эту жизнь кармы нет.</span>' : "Карму можно потратить на постоянные улучшения."} Выберите происхождение нового персонажа и нажмите «Начать новый путь».</p>`;

    const currentPerks = game.getActiveBodyPerks();
    const carryover = currentPerks.carryOver || 0;
    const nextBody = REBIRTH_BODIES.find(body => body.id === selectedRebirthBody);
    const nextBodyAscension = BODY_ASCENSIONS[selectedRebirthBody]?.[game.getBodyAscensionLevel(selectedRebirthBody) - 1];
    // reset() применяет бесплатную Память Артефактов уже от нового происхождения.
    const nextBodyFreeLevel = nextBodyAscension?.perkUpgrade?.freeUpgradeLevel ?? (nextBody?.perk === "arhatWisdom" ? 1 : 0);
    const purchasedMemoryLevel = game.prestige.karmaUpgrades.artifactMemory || 0;
    const artifactMemoryLimit = purchasedMemoryLevel + nextBodyFreeLevel;
    const transferParts = [];
    if (carryover) transferParts.push(`${Math.floor(game.artifactDust * carryover)} пыли и ${Math.floor(game.daoEssence * carryover)} эссенции благодаря нынешнему телу`);
    if (currentPerks.carryArtifacts) transferParts.push(`до ${currentPerks.carryArtifacts} лучших артефактов благодаря нынешнему телу`);
    if (artifactMemoryLimit) transferParts.push(`до ${artifactMemoryLimit} экипированных артефактов по «Памяти Артефактов»${nextBodyFreeLevel ? ` (${purchasedMemoryLevel} купленных уровней + ${nextBodyFreeLevel} бесплатных от выбранного происхождения «${nextBody.name}»)` : ""}`);
    if (currentPerks.keepFailstacks) transferParts.push("бонус шанса от неудачной заточки");
    html += `<div class="v2-rebirth-summary"><p><strong>Сохранится:</strong> карма, купленные улучшения, достижения и доступ к открытым корням, телам и формациям.</p>
        <p><strong>Начнётся заново:</strong> ступень, характеристики, изученные техники, формации, секта, её путь (Дао) и вклад. Новое тело и улучшения дадут стартовые бонусы.</p>
        <p><strong>Ресурсы и артефакты:</strong> сбрасываются${transferParts.length ? `, кроме переноса: ${transferParts.join("; ")}` : ". Перенос артефактов открывается улучшениями и особенностями тел"}.</p></div>`;

    // Карма
    html += `<div class="karma-summary">`;
    html += `<div class="karma-earned">Получено за эту жизнь: <strong>+${karmaEarned} кармы</strong>${naturalDeath ? ' <span class="v2-muted">(включая +50% за полную жизнь)</span>' : ''}</div>`;
    const sectKarmaParts = game.sect ? ` Основа от секты: +${game.getSectRankIndex() + game.getSectContributionKarma()} до множителей.` : "";
    const seedKarmaParts = game.flags.ancient_tree_seed || game.flags.dao_tree_seed
        ? " Семя: ещё ×1.30 к итоговой карме; два семени не складываются." : "";
    html += `<details class="v2-details" data-rebirth-detail="karma"><summary>Откуда взялась карма</summary><p>Учитываются ступень, возраст, изученные техники, достижения и прорывы после Золотого Ядра. Тело, формации, артефакты и секта могут повысить награду.${sectKarmaParts}${naturalDeath ? " Жизнь до естественной смерти: ×1,5." : ""}${seedKarmaParts}</p></details>`;
    html += `<div class="karma-total">Доступно кармы: <strong id="karma-available">${game.prestige.karma}</strong></div>`;
    html += `</div>`;

    // Кармические улучшения — всегда открытый раздел.
    const totalUpgrades = KARMA_UPGRADES.length;
    const maxedUpgrades = KARMA_UPGRADES.filter(u => (game.prestige.karmaUpgrades[u.id] || 0) >= u.maxLevel).length;
    html += `<div class="rebirth-accordion open">
        <div class="rebirth-accordion-header" role="heading" aria-level="3" style="cursor:default">
            Постоянные улучшения за карму <span class="accordion-hint">(${maxedUpgrades}/${totalUpgrades})</span>
        </div>
        <div class="rebirth-accordion-body"><p class="empty-msg">Расходуют карму. Стартовые бонусы применятся в новой жизни; покупки сохраняются после следующих перерождений.</p><div class="karma-upgrades-grid">`;
    for (const u of KARMA_UPGRADES) {
        const level = game.prestige.karmaUpgrades[u.id] || 0;
        const atMax = level >= u.maxLevel;
        const cost = game.getUpgradeCost(u.id);
        const canAfford = game.prestige.karma >= cost;
        const locked = u.requirement && !u.requirement(game);
        const lockHint = locked && u.requirementHint ? u.requirementHint : "";
        html += `<div class="karma-upgrade ${atMax ? "maxed" : ""} ${locked ? "locked" : ""} ${!canAfford && !atMax && !locked ? "cant-afford" : ""}">
            <div class="ku-name">${u.name}</div>
            <div class="ku-desc">${u.description}${level > 0 && u.effect && u.effectMultiplier ? ` Сейчас: ${u.effect.stones * Math.pow(u.effectMultiplier, level - 1)} камней, ${u.effect.pills * Math.pow(u.effectMultiplier, level - 1)} пилюль, ${u.effect.essence * Math.pow(u.effectMultiplier, level - 1)} эссенции и ${u.effect.dust * Math.pow(u.effectMultiplier, level - 1)} пыли.` : ""}</div>
            ${locked && lockHint ? `<div class="ku-lock-hint" style="color:#ee7a7a;font-size:0.85em">${lockHint}</div>` : ""}
            <div class="ku-level">Уровень ${level}/${u.maxLevel}</div>
            <button class="btn btn-small ${atMax ? "" : "btn-secondary"}"
                    onclick="buyKarmaUpgradeUI('${u.id}')"
                    ${atMax || !canAfford || locked ? "disabled" : ""}>
                ${atMax ? "МАКС" : locked ? "Закрыто" : `Купить (${cost} кармы)`}
            </button>
        </div>`;
    }
    html += `</div></div></div>`;

    html += renderInheritedTechniqueChoice();

    // Тела — сгруппированы по тирам, раздел всегда открыт.
    html += `<div class="rebirth-accordion open">
        <div class="rebirth-accordion-header" role="heading" aria-level="3" style="cursor:default">
            Происхождение новой жизни
        </div>
        <div class="rebirth-accordion-body"><div class="bodies-section">
        <p class="bodies-hint">Всего перерождений: ${game.prestige.totalRebirths || 0}. Зачётных жизней: ${game.getQualifiedRebirths()}. Для зачёта нужно достигнуть Золотого Ядра; при старте на Ядре или выше нужен хотя бы один успешный прорыв. Зачёт начисляется один раз при завершении жизни. Продвинутые тела требуют указанной ступени этой жизни; проходить предыдущие тела необязательно.</p>`;
    const tierNames = { 0: "Начало", 1: "Уровень I", 2: "Уровень II", 3: "Уровень III", 4: "Уровень IV", 5: "Уровень V", 6: "Уровень VI" };
    const tierRebirths = { 0: 0, 1: 1, 2: 2, 3: 3, 4: 5, 5: 7, 6: 10 };
    const tiers = [...new Set(REBIRTH_BODIES.map(b => b.tier))].sort((a, b) => a - b);

    // Определяем макс. тир, в котором есть хотя бы одно разблокированное тело
    let maxUnlockedTier = -1;
    for (const body of REBIRTH_BODIES) {
        if (game.isBodyUnlocked(body.id) && body.tier > maxUnlockedTier) {
            maxUnlockedTier = body.tier;
        }
    }

    for (const tier of tiers) {
        const tierBodies = REBIRTH_BODIES.filter(b => b.tier === tier);
        const anyUnlocked = tierBodies.some(b => game.isBodyUnlocked(b.id));
        const isTeaserTier = !anyUnlocked && tier <= maxUnlockedTier + 1;

        // Полностью скрываем тиры, которые далеко впереди
        if (!anyUnlocked && !isTeaserTier) continue;

        const tierLabel = tierNames[tier] || `Тир ${tier}`;
        const tierReq = tierRebirths[tier] || 0;
        // Получить realm requirement из первого тела тира
        let tierRealmName = null;
        const sampleBody = tierBodies[0];
        if (sampleBody && sampleBody.requirement && sampleBody.requirement.milestones) {
            for (const mId of sampleBody.requirement.milestones) {
                const rm = mId.match(/^realm_(\d+)$/);
                if (rm) {
                    const m = MILESTONES.find(x => x.id === mId);
                    if (m) tierRealmName = m.name;
                    break;
                } else if (mId === "immortal") {
                    tierRealmName = "Бессмертный";
                    break;
                }
            }
        }
        const realmReqText = tierRealmName ? ` | ${tierRealmName}+` : "";
        html += `<div class="body-tier-group"><div class="body-tier-header">${tierLabel}${tierReq > 0 ? ` <span class="tier-req">(${tierReq} ${_plural(tierReq, "зачётная жизнь", "зачётные жизни", "зачётных жизней")}${realmReqText})</span>` : ""}</div>`;
        html += `<div class="bodies-grid">`;

        if (isTeaserTier) {
            // Тизерный тир — показываем только карточки "???"
            for (const body of tierBodies) {
                html += `<div class="body-card locked" style="border-color: #333">
                    <div class="body-name" style="color: #444">???</div>
                    <div class="body-desc" style="color: #555">Нужны зачётные жизни и соответствующая ступень...</div>
                </div>`;
            }
        } else {
            for (const body of tierBodies) {
                const unlocked = game.isBodyUnlocked(body.id);
                const selected = selectedRebirthBody === body.id;
                const ascLevel = game.getBodyAscensionLevel(body.id);
                const bonusParts = [];
                if (body.bonuses.strength) bonusParts.push(`+${body.bonuses.strength} сила`);
                if (body.bonuses.spirit) bonusParts.push(`+${body.bonuses.spirit} дух`);
                if (body.bonuses.luck) bonusParts.push(`+${body.bonuses.luck} удача`);
                if (body.bonuses.stones) bonusParts.push(`+${body.bonuses.stones} камней`);
                if (body.bonuses.pills) bonusParts.push(`+${body.bonuses.pills} пилюль`);
                if (body.startRealm) bonusParts.push(`старт: ${REALMS[body.startRealm].name}`);
                if (body.minRootTier) bonusParts.push(`корень не ниже ${({ uncommon: "духовного", rare: "мистического", epic: "небесного", legendary: "священного", divine: "божественного" })[body.minRootTier] || body.minRootTier}`);
                if (body.startTechniques.length) bonusParts.push(`${body.startTechniques.length} ${_plural(body.startTechniques.length, "стартовая техника", "стартовые техники", "стартовых техник")}`);

                // Текст перка и вознесения
                const ascensions = BODY_ASCENSIONS[body.id];
                let ascLabel = "";
                if (ascLevel > 0) ascLabel = ` <span class="body-asc-badge">★${ascLevel}</span>`;

                if (!unlocked) {
                    // Внутри разблокированного тира, но конкретно это тело заблокировано — показать "???" с требованиями
                    let reqText = "";
                    if (body.requirement) {
                        const parts = [];
                        if (body.requirement.milestones) {
                            for (const mId of body.requirement.milestones) {
                                const realmMatch = mId.match(/^realm_(\d+)$/);
                                let has;
                                let label;
                                if (realmMatch || mId === "immortal") {
                                    // Realm-гейты: используем milestone.check() как isBodyUnlocked
                                    const milestone = MILESTONES.find(m => m.id === mId);
                                    has = milestone ? milestone.check(game) : false;
                                    label = milestone ? milestone.name : mId;
                                } else {
                                    has = game.prestige.permanentMilestones.includes(mId);
                                    const m = typeof MILESTONES !== "undefined" ? MILESTONES.find(x => x.id === mId) : null;
                                    label = m ? m.name : mId;
                                }
                                parts.push(`<span class="${has ? "req-met" : "req-unmet"}">${label}</span>`);
                            }
                        }
                        if (body.requirement.rebirths) {
                            const has = game.getQualifiedRebirths(true) >= body.requirement.rebirths;
                            parts.push(`<span class="${has ? "req-met" : "req-unmet"}">${body.requirement.rebirths} зачётных жизней</span>`);
                        }
                        reqText = parts.join(", ");
                    }
                    html += `<div class="body-card locked" style="border-color: #333">
                        <div class="body-name" style="color: #444">???</div>
                        <div class="body-desc" style="color: #555">Заблокировано</div>
                        ${reqText ? `<div class="body-req">Требования: ${reqText}</div>` : ""}
                    </div>`;
                } else {
                    html += `<div class="body-card ${selected ? "selected" : ""}"
                                  onclick="selectBody('${body.id}')"
                                  style="border-color: ${body.color}">
                        <div class="body-name" style="color: ${body.color}">${ascLevel > 0 && ascensions && ascensions[ascLevel - 1].name ? ascensions[ascLevel - 1].name : body.name}${ascLabel}</div>
                        <div class="body-mastery">Освоение: ${game.getBodyLives(body.id)} зачётных жизней этим телом</div>
                        <div class="body-perk">\u26A1 ${ascLevel > 0 ? "Базовые особенности: " : ""}${body.perkDesc}</div>
                        <details class="v2-details" data-rebirth-detail="body-${body.id}" onclick="event.stopPropagation()"><summary>История происхождения</summary><p class="body-desc">${body.description}</p></details>
                        ${ascLevel > 0 && ascensions ? `<div class="body-asc-desc">\u2605 Вознесение заменяет указанные базовые значения: ${_v2BodyAscensionDescription(ascensions[ascLevel - 1])}. Остальные особенности сохраняются.</div>` : ""}
                        ${bonusParts.length ? `<div class="body-bonuses">${bonusParts.join(" | ")}</div>` : ""}
                    </div>`;
                }
            }
        }
        html += `</div></div>`;
    }
    html += `</div></div></div>`;

    // Вознесение тел — всегда открытый раздел.
    const totalAscBodies = REBIRTH_BODIES.filter(b => BODY_ASCENSIONS[b.id] && game.isBodyUnlocked(b.id)).length;
    html += `<div class="rebirth-accordion open">
        <div class="rebirth-accordion-header" role="heading" aria-level="3" style="cursor:default">
            Усилить происхождение (вознесение) <span class="accordion-hint">(${totalAscBodies} тел)</span>
        </div>
        <div class="rebirth-accordion-body"><div class="body-ascension-section"><p class="ascension-hint">Каждая зачётная жизнь этим телом открывает следующую звезду: одна жизнь — ★1, две — ★2, три — ★3. Открытую звезду нужно купить за карму. Указанные значения заменяют базовые; остальные особенности сохраняются. Бонус работает в жизнях с этим происхождением.</p>`;

    const ascTiers = [...new Set(REBIRTH_BODIES.filter(b => BODY_ASCENSIONS[b.id] && game.isBodyUnlocked(b.id)).map(b => b.tier))].sort((a, b) => a - b);
    for (const ascTier of ascTiers) {
        const ascTierLabel = tierNames[ascTier] || `Тир ${ascTier}`;
        html += `<div class="body-tier-group"><div class="body-tier-header">${ascTierLabel}</div>`;
        html += `<div class="ascension-grid">`;
        const ascBodies = REBIRTH_BODIES.filter(b => b.tier === ascTier && BODY_ASCENSIONS[b.id] && game.isBodyUnlocked(b.id));
        for (const body of ascBodies) {
        const ascensions = BODY_ASCENSIONS[body.id];
        const level = game.getBodyAscensionLevel(body.id);
        const maxed = level >= ascensions.length;
        const cost = game.getBodyAscendCost(body.id);
        const canAfford = game.prestige.karma >= cost;
        const bodyLives = game.getBodyLives(body.id);
        const masteryReady = bodyLives >= level + 1;

        let nextDesc = maxed ? "МАКС" : _v2BodyAscensionDescription(ascensions[level]);
        const currentName = level > 0 && ascensions[level - 1].name ? ascensions[level - 1].name : body.name;
        const nextName = !maxed && ascensions[level].name ? ascensions[level].name : null;

        html += `<div class="ascension-card ${maxed ? "maxed" : ""}"${maxed ? ' title="Это тело достигло предела вознесения. Для дальнейшего роста изберите другой путь перерождения"' : ""}>
            <div class="asc-body-name" style="color: ${body.color}">${currentName} <span class="asc-level">★${level}/${ascensions.length}</span></div>
            <div class="asc-next">${maxed ? "Максимальное вознесение" : `→ ★${level + 1} ${nextName ? `«${nextName}»` : ""}: ${nextDesc}`}</div>
            <div class="asc-mastery">Освоение: ${bodyLives} зачётных жизней${!maxed && !masteryReady ? `. Для ★${level + 1} нужно ${level + 1}.` : ""}</div>
            <button class="btn btn-small ${maxed ? "" : "btn-secondary"}"
                    onclick="ascendBodyUI('${body.id}')"
                    ${maxed || !canAfford || !masteryReady ? "disabled" : ""}>
                ${maxed ? "МАКС" : `Вознести (${cost} кармы)`}
            </button>
        </div>`;
        }
        html += `</div></div>`; // ascension-grid + body-tier-group
    }
    html += `</div></div></div>`; // body-ascension-section + accordion-body + accordion

    html += `<div class="rebirth-actions"><button class="btn btn-primary btn-rebirth-go" onclick="performRebirth()" title="Новая жизнь с сохранённой кармой и открытиями. Перерождение — новый виток пути.">Начать новый путь</button></div>`;

    content.innerHTML = html;
    _restoreAccordionState(savedState);
}

function toggleRebirthSection(header) {
    // Старые вызовы больше не сворачивают раздел.
    const accordion = header?.parentElement;
    if (!accordion) return;
    const body = accordion.querySelector(".rebirth-accordion-body");
    if (body) body.style.display = "block";
    accordion.classList.add("open");
}

function selectBody(bodyId) {
    if (!game.isBodyUnlocked(bodyId)) return;
    selectedRebirthBody = bodyId;
    if (game.pendingRebirth) {
        game.pendingRebirth.bodyId = bodyId;
        saveGame();
    }
    renderRebirthContent();
}

function buyKarmaUpgradeUI(upgradeId) {
    if (game.buyKarmaUpgrade(upgradeId)) {
        saveGame();
        renderRebirthContent();
    }
}

function ascendBodyUI(bodyId) {
    if (game.ascendBody(bodyId)) {
        saveGame();
        renderRebirthContent();
    }
}

function performRebirth() {
    if (!game.pendingRebirth) return;
    if (!game.rebirth(selectedRebirthBody, game.pendingRebirth.naturalDeath)) return;

    document.getElementById("rebirth-modal").classList.remove("active");
    document.getElementById("event-log").innerHTML = "";

    // Показать модалку корня
    showSpiritualRootModal();
    updateUI();
}

function voluntaryRebirth() {
    if (game.realmIndex < 3) {
        addLog("Рассеивание культивации доступно с Золотого Ядра.", "system");
        return;
    }
    const _erPerks = game.getActiveBodyPerks();
    const earlyRebirthLevel = (game.prestige.karmaUpgrades.earlyRebirth || 0) + (_erPerks.freeUpgradeLevel || 0);
    const minAge = 150 - earlyRebirthLevel * 10;
    if (game.characterAge() < minAge) {
        addLog(`Для рассеивания культивации нужно прожить ${minAge} лет. Сейчас вам ${game.characterAge()}.`, "system");
        return;
    }
    document.getElementById("btn-rebirth").style.display = "none";
    document.getElementById("rebirth-confirm-panel").style.display = "block";
}

function confirmVoluntaryRebirth() {
    document.getElementById("rebirth-confirm-panel").style.display = "none";
    game.stop();
    showRebirthModal(false);
}

function cancelVoluntaryRebirth() {
    document.getElementById("rebirth-confirm-panel").style.display = "none";
    document.getElementById("btn-rebirth").style.display = "";
}
