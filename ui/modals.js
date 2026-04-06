// ============================================================
// UI/MODALS.JS — Модалки: духовный корень, перерождение, вступление
// ============================================================

// === МОДАЛКА ДУХОВНОГО КОРНЯ ===
function showSpiritualRootModal() {
    const modal = document.getElementById("root-modal");
    if (!modal) return;
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
    const isFirstLife = (game.prestige.totalRebirths || 0) === 0;

    if (isFirstLife) {
        // Первая жизнь — только обычный корень, без выбора
        const common = SPIRITUAL_ROOTS.find(r => r.id === "common");
        resultDiv.innerHTML = `
            <p class="modal-first-life">Вы — обычный человек. Ваш духовный корень предопределён судьбой.</p>
            <div class="root-card root-${common.tier} selected" style="border-color: ${common.color}">
                <h3 style="color: ${common.color}">${common.name}</h3>
                <p class="root-desc">${common.description}</p>
                <p class="root-mult">Множитель ци: x${common.qiMultiplier.toFixed(2)}</p>
            </div>
        `;
        const acceptBtn = document.getElementById("btn-accept-root");
        acceptBtn.style.display = "block";
        acceptBtn.textContent = "Принять судьбу";
        acceptBtn.onclick = () => acceptRoot("common");
    } else {
        // Перерождение — выбор из доступных корней
        // Показываем только: разблокированные + первые заблокированные как тизер
        let html = `<p class="modal-rebirth-hint">Накопленная мудрость прошлых жизней открывает новые пути. Выберите духовный корень.</p>`;
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
                <p class="root-mult">Ци: x${root.qiMultiplier.toFixed(2)}</p>
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
    const root = SPIRITUAL_ROOTS.find(r => r.id === rootId);
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
                <div class="element-choice-header">Выберите элементы (до ${maxElements}) или оставьте пустым для случайного выбора:</div>
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
                <div class="element-choice-hint" id="element-choice-hint">Выбрано: 0/${maxElements} (рандом)</div>
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
            : `Выбрано: 0/${maxElements} (рандом)`;
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
    game.learnTechnique("basic_breathing");

    // Наследие Предков: вознести basic_breathing до целевого тира
    const ancestorLevel = game.prestige.karmaUpgrades.ancestorLegacy || 0;
    if (ancestorLevel > 0) {
        const tierOrder = ["common", "uncommon", "rare", "epic", "legendary"];
        const targetTier = tierOrder[ancestorLevel] || "uncommon";
        const tech = TECHNIQUES.find(t => t.id === "basic_breathing");
        if (tech) {
            const currentTierIdx = tierOrder.indexOf(tech.tier);
            const targetTierIdx = tierOrder.indexOf(targetTier);
            if (targetTierIdx > currentTierIdx) {
                tech.tier = targetTier;
                game.techAscendedTiers = game.techAscendedTiers || {};
                game.techAscendedTiers["basic_breathing"] = targetTier;
                const ascendNames = tech.ascendNames || {};
                if (ascendNames[targetTier]) tech.name = ascendNames[targetTier];
                const ascendDescs = tech.ascendDescriptions || {};
                if (ascendDescs[targetTier]) tech.description = ascendDescs[targetTier];
            }
        }
    }

    addLog(`${game.name} начинает путь культивации.`, "system");
    addLog(`Ваш духовный корень: ${root.name}`, "breakthrough");
    const elemNames = root.elements.map(eid => {
        const el = ELEMENTS.find(e => e.id === eid);
        return el ? el.name : eid;
    });
    if (elemNames.length > 0) {
        addLog(`Элементы: ${elemNames.join(", ")}`, "system");
    }
    addLog("Изучена техника: Базовая Техника Дыхания", "reward");

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

function togglePause() {
    const btn = document.getElementById("btn-pause");
    if (!btn) return;
    if (game._paused) {
        game.start(); // start() сам сбрасывает _paused и пересоздаёт таймеры
        btn.textContent = "\u23F8 Пауза";
        btn.classList.remove("btn-pause-active");
        addLog("Игра возобновлена.", "system");
    } else {
        game._paused = true;
        game.stop();
        saveGame();
        btn.textContent = "\u25B6 Продолжить";
        btn.classList.add("btn-pause-active");
        addLog("Игра на паузе.", "system");
    }
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

function showRebirthModal(naturalDeath) {
    game._naturalDeath = !!naturalDeath;
    // Обновить lastLifeResources ДО рендера модала (чтобы body unlock проверял текущую жизнь)
    game.prestige.lastLifeResources = {
        stones: game.stones || 0,
        pills: game.pills || 0,
        essence: game.daoEssence || 0,
        dust: game.artifactDust || 0,
        realmIndex: game._maxRealmThisLife || game.realmIndex,
        strength: game.strength,
        spirit: game.spirit,
        luck: game.luck
    };
    // Начислить карму этой жизни сразу
    const karmaEarned = game.calculateKarma(naturalDeath);
    game._pendingKarma = karmaEarned;
    game.prestige.karma += karmaEarned;
    // Мержим достижения
    for (const m of game.milestones) {
        if (!game.prestige.permanentMilestones.includes(m)) {
            game.prestige.permanentMilestones.push(m);
        }
    }
    selectedRebirthBody = "peasant";
    document.getElementById("rebirth-modal").classList.add("active");
    renderRebirthContent();
}

// Запомнить открытые секции аккордеона
function _saveAccordionState() {
    const state = {};
    document.querySelectorAll(".rebirth-accordion").forEach((el, i) => {
        state[i] = el.classList.contains("open");
    });
    return state;
}
function _restoreAccordionState(state) {
    if (!state) return;
    document.querySelectorAll(".rebirth-accordion").forEach((el, i) => {
        const body = el.querySelector(".rebirth-accordion-body");
        const arrow = el.querySelector(".accordion-arrow");
        if (!body || !arrow) return;
        const shouldBeOpen = state[i] !== undefined ? state[i] : el.classList.contains("open");
        body.style.display = shouldBeOpen ? "block" : "none";
        arrow.innerHTML = shouldBeOpen ? "&#9660;" : "&#9654;";
        el.classList.toggle("open", shouldBeOpen);
    });
}

function renderRebirthContent() {
    const content = document.getElementById("rebirth-content");
    const savedState = _saveAccordionState();
    const karmaEarned = game._pendingKarma || 0;

    let html = `<h2>Перерождение</h2>`;
    const noKarma = karmaEarned === 0 && game.realmIndex < 3;
    html += `<p class="rebirth-intro">${game.gameOver ? "Ваша жизнь подошла к концу..." : "Вы рассеиваете свою культивацию, жертвуя силу ради нового начала..."} ${noKarma ? '<span style="color:#ee7a7a">Душа слишком слаба для накопления кармы. Достигните Золотого Ядра (реалм 3), чтобы получать карму.</span>' : "Накопленная карма откроет новые возможности."}</p>`;

    // Карма
    html += `<div class="karma-summary">`;
    html += `<div class="karma-earned">Карма этой жизни: <strong>+${karmaEarned}</strong>${game._naturalDeath ? ' <span style="color:#6aea8a">(+50% Мудрость Полной Жизни)</span>' : ''}</div>`;
    const sectKarmaParts = game.sect ? ` | Секта +${game.getSectRankIndex() * 3 + Math.floor((game.sect.contribution || 0) / 100)}` : "";
    html += `<div class="karma-breakdown">Ступень +${Math.floor(Math.pow(game.realmIndex, 1.8))} | Годы +${Math.floor(game.characterAge() / 100)} | Техники +${game.techniques.length * 2} | Достижения +${game.milestones.length} | Прорывы +${Math.floor(game.totalBreakthroughs * 0.5)}${sectKarmaParts}${game._naturalDeath ? " | Полная жизнь \u00D71.5" : ""}</div>`;
    html += `<div class="karma-total">Доступно кармы: <strong id="karma-available">${game.prestige.karma}</strong></div>`;
    html += `</div>`;

    // Кармические улучшения (сворачиваемая секция)
    const totalUpgrades = KARMA_UPGRADES.length;
    const maxedUpgrades = KARMA_UPGRADES.filter(u => (game.prestige.karmaUpgrades[u.id] || 0) >= u.maxLevel).length;
    html += `<div class="rebirth-accordion open">
        <div class="rebirth-accordion-header" onclick="toggleRebirthSection(this)">
            <span class="accordion-arrow">&#9660;</span> Кармические Улучшения <span class="accordion-hint">(${maxedUpgrades}/${totalUpgrades})</span>
        </div>
        <div class="rebirth-accordion-body"><div class="karma-upgrades-grid">`;
    for (const u of KARMA_UPGRADES) {
        const level = game.prestige.karmaUpgrades[u.id] || 0;
        const atMax = level >= u.maxLevel;
        const cost = game.getUpgradeCost(u.id);
        const canAfford = game.prestige.karma >= cost;
        const locked = u.requirement && !u.requirement(game);
        const lockHint = locked && u.requirementHint ? u.requirementHint : "";
        html += `<div class="karma-upgrade ${atMax ? "maxed" : ""} ${locked ? "locked" : ""} ${!canAfford && !atMax && !locked ? "cant-afford" : ""}">
            <div class="ku-name">${u.name}</div>
            <div class="ku-desc">${u.description}${level > 0 && u.effect && u.effectMultiplier ? ` [сейчас: ×${Math.pow(u.effectMultiplier, level)}]` : ""}</div>
            ${locked && lockHint ? `<div class="ku-lock-hint" style="color:#ee7a7a;font-size:0.85em">${lockHint}</div>` : ""}
            <div class="ku-level">${level}/${u.maxLevel}</div>
            <button class="btn btn-small ${atMax ? "" : "btn-secondary"}"
                    onclick="buyKarmaUpgradeUI('${u.id}')"
                    ${atMax || !canAfford || locked ? "disabled" : ""}>
                ${atMax ? "МАКС" : locked ? "Закрыто" : `Купить (${cost} кармы)`}
            </button>
        </div>`;
    }
    html += `</div></div></div>`;

    // Тела — сгруппированы по тирам (открыто по умолчанию)
    html += `<div class="rebirth-accordion open">
        <div class="rebirth-accordion-header" onclick="toggleRebirthSection(this)">
            <span class="accordion-arrow">&#9660;</span> Выберите Тело Перерождения
        </div>
        <div class="rebirth-accordion-body"><div class="bodies-section">
        <p class="bodies-hint" style="color:#888;font-size:0.8em;margin-bottom:8px">Тела высших тиров требуют достижения определённой ступени в <b>прошлой жизни</b>. Прогресс прошлых жизней не суммируется.</p>`;
    const tierNames = { 0: "Начало", 1: "Тир I", 2: "Тир II", 3: "Тир III", 4: "Тир IV", 5: "Тир V", 6: "Тир VI" };
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
        html += `<div class="body-tier-group"><div class="body-tier-header">${tierLabel}${tierReq > 0 ? ` <span class="tier-req">(${tierReq} перерожд.${realmReqText})</span>` : ""}</div>`;
        html += `<div class="bodies-grid">`;

        if (isTeaserTier) {
            // Тизерный тир — показываем только карточки "???"
            for (const body of tierBodies) {
                html += `<div class="body-card locked" style="border-color: #333">
                    <div class="body-name" style="color: #444">???</div>
                    <div class="body-desc" style="color: #555">Требуется больше перерождений...</div>
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
                if (body.startRealm) bonusParts.push(`старт: ступень ${body.startRealm}`);
                if (body.minRootTier) bonusParts.push(`корень мин: ${body.minRootTier}`);
                if (body.startTechniques.length) bonusParts.push(`+${body.startTechniques.length} техн.`);

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
                            const has = game.prestige.totalRebirths >= body.requirement.rebirths;
                            parts.push(`<span class="${has ? "req-met" : "req-unmet"}">${body.requirement.rebirths} перерождений</span>`);
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
                        <div class="body-desc">${body.description}</div>
                        <div class="body-perk">\u26A1 ${body.perkDesc}</div>
                        ${ascLevel > 0 && ascensions ? `<div class="body-asc-desc">\u2605 ${ascensions[ascLevel - 1].desc}</div>` : ""}
                        ${bonusParts.length ? `<div class="body-bonuses">${bonusParts.join(" | ")}</div>` : ""}
                    </div>`;
                }
            }
        }
        html += `</div></div>`;
    }
    html += `</div></div></div>`;

    // Вознесение тел (сворачиваемая секция)
    const totalAscBodies = REBIRTH_BODIES.filter(b => BODY_ASCENSIONS[b.id] && game.isBodyUnlocked(b.id)).length;
    html += `<div class="rebirth-accordion open">
        <div class="rebirth-accordion-header" onclick="toggleRebirthSection(this)">
            <span class="accordion-arrow">&#9660;</span> Вознесение Тел <span class="accordion-hint">(${totalAscBodies} тел)</span>
        </div>
        <div class="rebirth-accordion-body"><div class="body-ascension-section"><p class="ascension-hint">Усильте перки тел, потратив карму. Эффект работает при выборе этого тела.</p>`;

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

        let nextDesc = maxed ? "МАКС" : ascensions[level].desc;
        const currentName = level > 0 && ascensions[level - 1].name ? ascensions[level - 1].name : body.name;
        const nextName = !maxed && ascensions[level].name ? ascensions[level].name : null;

        html += `<div class="ascension-card ${maxed ? "maxed" : ""}"${maxed ? ' title="Это тело достигло предела вознесения. Для дальнейшего роста изберите другой путь перерождения"' : ""}>
            <div class="asc-body-name" style="color: ${body.color}">${currentName} <span class="asc-level">★${level}/${ascensions.length}</span></div>
            <div class="asc-next">${maxed ? "Максимальное вознесение" : `→ ★${level + 1} ${nextName ? `«${nextName}»` : ""}: ${nextDesc}`}</div>
            <button class="btn btn-small ${maxed ? "" : "btn-secondary"}"
                    onclick="ascendBodyUI('${body.id}')"
                    ${maxed || !canAfford ? "disabled" : ""}>
                ${maxed ? "МАКС" : `Вознести (${cost} кармы)`}
            </button>
        </div>`;
        }
        html += `</div></div>`; // ascension-grid + body-tier-group
    }
    html += `</div></div></div>`; // body-ascension-section + accordion-body + accordion

    html += `<div class="rebirth-actions"><button class="btn btn-primary btn-rebirth-go" onclick="performRebirth()">Переродиться</button></div>`;

    content.innerHTML = html;
    _restoreAccordionState(savedState);
}

function toggleRebirthSection(header) {
    const accordion = header.parentElement;
    const body = header.nextElementSibling;
    const arrow = header.querySelector(".accordion-arrow");
    const isOpen = body.style.display !== "none";
    body.style.display = isOpen ? "none" : "block";
    arrow.innerHTML = isOpen ? "&#9654;" : "&#9660;";
    accordion.classList.toggle("open", !isOpen);
}

function selectBody(bodyId) {
    selectedRebirthBody = bodyId;
    renderRebirthContent();
}

function buyKarmaUpgradeUI(upgradeId) {
    if (game.buyKarmaUpgrade(upgradeId)) {
        renderRebirthContent();
    }
}

function ascendBodyUI(bodyId) {
    if (game.ascendBody(bodyId)) {
        renderRebirthContent();
    }
}

function performRebirth() {
    // Карма уже начислена в showRebirthModal, но rebirth() добавит снова — вычтем pending
    game.prestige.karma -= game._pendingKarma || 0;
    const wasNaturalDeath = game._naturalDeath;
    game._pendingKarma = 0;
    game._naturalDeath = false;

    game.rebirth(selectedRebirthBody, wasNaturalDeath);

    document.getElementById("rebirth-modal").classList.remove("active");
    document.getElementById("event-log").innerHTML = "";

    // Показать модалку корня
    showSpiritualRootModal();
    updateUI();
}

function voluntaryRebirth() {
    if (game.realmIndex < 3) {
        addLog("Рассеивание Культивации доступно с Золотого Ядра (ступень 3).", "system");
        return;
    }
    const _erPerks = game.getActiveBodyPerks();
    const earlyRebirthLevel = (game.prestige.karmaUpgrades.earlyRebirth || 0) + (_erPerks.freeUpgradeLevel || 0);
    const minAge = 150 - earlyRebirthLevel * 10;
    if (game.characterAge() < minAge) {
        addLog(`Ваше постижение слишком поверхностно. Рассеивание доступно с ${minAge} лет (сейчас: ${game.characterAge()}).`, "system");
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
