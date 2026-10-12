// ============================================================
// UI/ARTIFACTS.JS — Таб артефактов (заточка, разбор, BDO-style) + формации
// ============================================================

// === АРТЕФАКТЫ TAB ===
let _selectedArtifactId = null;
let _pendingDisassembleId = null;
let _disassembleKeyHandler = null;

function renderArtifacts() {
    if (deferUIRender(renderArtifacts)) return;
    const container = document.getElementById("artifacts-list");
    if (!container) return;
    container.innerHTML = "";

    // --- Валюты ---
    const currSection = document.createElement("div");
    currSection.className = "enhance-currencies";
    const scrollCount = game.daoScrolls || 0;
    const scrollsUsed = game.scrollFailstacksApplied || 0;
    const canUseScroll = scrollCount > 0 && scrollsUsed < 10;
    const scrollBonusPct = scrollsUsed * 2;
    currSection.innerHTML = `
        <div class="currency-row">
            <span class="currency-item currency-with-tip"><span class="currency-icon" style="color:#c89aff">\u2726</span> Эссенция: <b>${game.daoEssence}</b><span class="currency-tip">Из экспедиций и разбора. Для заточки и слияния артефактов, вознесения техник и Свитков Озарения.</span></span>
            <span class="currency-item currency-with-tip"><span class="currency-icon" style="color:#aaa">\u25C6</span> Пыль: <b>${game.artifactDust}</b><span class="currency-tip">Из разбора артефактов. Бонусы усиливают базовую добычу; заточка возвращает 50% материалов успешных попыток.</span></span>
        </div>
        <div class="currency-row">
            <span class="currency-item currency-with-tip"><span class="currency-icon" style="color:#eebb44">\u2605</span> Воля Дао: <b>${game.enhanceFailstacks}</b>${game.enhanceFailstacks > 0 ? ` (+${game.enhanceFailstacks * 2}%)` : ""}<span class="currency-tip">Копится при провале заточки. +2% за ед. Сбрасывается при успехе.</span></span>
            <span class="currency-item currency-with-tip"><span class="currency-icon" style="color:#66ccff">\u2721</span> Свитки: <b>${scrollCount}</b>${scrollsUsed > 0 ? ` <span style="color:#66ccff">(+${scrollBonusPct}%)</span>` : ""}<span class="currency-tip">+2% к шансу за свиток. Макс 10 (+20%). Не пропадают при провале, сбрасываются при успехе.</span></span>
            ${canUseScroll ? `<button class="btn btn-tiny btn-scroll" onclick="useDaoScrollUI()" title="Добавить 2 процентных пункта к шансу заточки. Бонус действует до следующего успеха и не привязан к выбранному артефакту.">Применить свиток (+2%)</button>` : scrollsUsed >= 10 ? `<span style="color:#666;font-size:0.75em">макс</span>` : ""}
        </div>
    `;
    container.appendChild(currSection);

    // --- Пространственное Кольцо (Воин) ---
    const perks = game.getActiveBodyPerks();
    if (perks.carryArtifacts && perks.carryArtifacts > 0) {
        const ringSection = document.createElement("div");
        ringSection.className = "enhance-currencies";
        ringSection.style.borderLeft = "3px solid #c66";
        const artCount = Math.min(game.artifacts.length, perks.carryArtifacts);
        ringSection.innerHTML = `
            <div class="currency-row">
                <span class="currency-item currency-with-tip" style="color:#c66">💍 Пространственное Кольцо: ${artCount} / ${perks.carryArtifacts} артефактов<span class="currency-tip">При перерождении ${perks.carryArtifacts} лучших артефактов переносятся в следующую жизнь.\nПриоритет: слияние → заточка → тир.\nАлхимик усиливает базовую добычу при разборе. Возврат материалов успешной заточки всегда 50%.</span></span>
            </div>
        `;
        container.appendChild(ringSection);
    }

    // --- Экипировка (4 слота) ---
    const slotsSection = document.createElement("div");
    slotsSection.className = "artifact-slots";
    slotsSection.innerHTML = "<h3>Экипировка</h3>";

    const slotsGrid = document.createElement("div");
    slotsGrid.className = "artifact-slots-grid";

    for (const slot of ARTIFACT_SLOTS) {
        const art = game.equippedArtifacts[slot];
        const slotEl = document.createElement("div");
        slotEl.className = `artifact-slot ${art ? "artifact-slot-filled" : "artifact-slot-empty"}`;

        if (art) {
            const tierData = ARTIFACT_TIERS[art.tier];
            const effects = game.getArtifactEffectNames(art);
            const effectsText = effects.map(e => `+${e.value} ${e.name}`).join(", ");
            const gradeBadge = _getGradeBadgeHtml(art);
            const glowClass = _getEnhanceGlowClass(art.enhance, art.transcend);
            slotEl.style.borderColor = tierData.color;
            if (glowClass) slotEl.classList.add(glowClass);
            slotEl.innerHTML = `
                <div class="artifact-slot-header">
                    <span class="artifact-slot-label"><span class="slot-icon">${{weapon: "\u2694\uFE0F", armor: "\uD83D\uDEE1\uFE0F", accessory: "\uD83D\uDC8D", treasure: "\uD83D\uDC8E"}[slot] || ""}</span> ${ARTIFACT_SLOT_NAMES[slot]}</span>
                    <span class="artifact-tier-badge" style="color:${tierData.color}">${tierData.name}</span>
                </div>
                <div class="artifact-name" style="color:${tierData.color}">${art.name} ${gradeBadge}</div>
                <div class="artifact-effects">${effectsText}</div>
                <div class="artifact-slot-actions">
                    <button class="btn btn-small btn-secondary" onclick="unequipArtifactUI('${slot}')">Снять</button>
                </div>
            `;
        } else {
            slotEl.innerHTML = `
                <div class="artifact-slot-header">
                    <span class="artifact-slot-label"><span class="slot-icon">${{weapon: "\u2694\uFE0F", armor: "\uD83D\uDEE1\uFE0F", accessory: "\uD83D\uDC8D", treasure: "\uD83D\uDC8E"}[slot] || ""}</span> ${ARTIFACT_SLOT_NAMES[slot]}</span>
                </div>
                <div class="artifact-empty">Пусто</div>
            `;
        }
        slotsGrid.appendChild(slotEl);
    }
    slotsSection.appendChild(slotsGrid);
    container.appendChild(slotsSection);

    // --- Инвентарь (компактный список) ---
    const invSection = document.createElement("div");
    invSection.className = "artifact-inventory";
    invSection.innerHTML = `<h3>Инвентарь (${game.artifacts.length}/${ARTIFACT_MAX_INVENTORY}) <button class="btn btn-tiny btn-disassemble" onclick="openBulkDisassembleMenu()" style="margin-left:8px">Разобрать...</button></h3>`;

    if (game.artifacts.length === 0) {
        invSection.innerHTML += '<p class="empty-msg">Артефакты можно получить из событий и тайных царств.</p>';
    } else {
        const invList = document.createElement("div");
        invList.className = "artifact-inv-list";

        const sorted = [...game.artifacts].sort((a, b) => {
            const aEq = ARTIFACT_SLOTS.some(s => game.equippedArtifacts[s]?.id === a.id) ? 0 : 1;
            const bEq = ARTIFACT_SLOTS.some(s => game.equippedArtifacts[s]?.id === b.id) ? 0 : 1;
            return aEq - bEq;
        });

        // Сбросить выбор если артефакт пропал
        if (_selectedArtifactId && !game.artifacts.find(a => a.id === _selectedArtifactId)) {
            _selectedArtifactId = null;
        }

        for (const art of sorted) {
            const tierData = ARTIFACT_TIERS[art.tier];
            const effects = game.getArtifactEffectNames(art);
            const effectsText = effects.map(e => `+${e.value} ${e.name}`).join(", ");
            const isEquipped = game.equippedArtifacts[art.slot]?.id === art.id;
            const gradeBadge = _getGradeBadgeHtml(art);
            const glowClass = _getEnhanceGlowClass(art.enhance, art.transcend);
            const isSelected = _selectedArtifactId === art.id;
            const slotIcon = {weapon: "\u2694\uFE0F", armor: "\uD83D\uDEE1\uFE0F", accessory: "\uD83D\uDC8D", treasure: "\uD83D\uDC8E"}[art.slot] || "";

            const row = document.createElement("div");
            row.className = `artifact-row ${isSelected ? "artifact-row-selected" : ""} ${isEquipped ? "artifact-row-equipped" : ""}`;
            if (glowClass) row.classList.add(glowClass);
            row.id = `art-card-${art.id}`;
            row.setAttribute("role", "button");
            row.tabIndex = 0;
            row.addEventListener("click", () => selectArtifactForForge(art.id));
            row.addEventListener("keydown", event => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    selectArtifactForForge(art.id);
                }
            });

            row.innerHTML = `
                <span class="artrow-name" style="color:${tierData.color}">${slotIcon} ${art.name} ${gradeBadge}</span>
                <span class="artrow-effects">${effectsText}</span>
                <span class="artrow-tier" style="color:${tierData.color}">${tierData.name}</span>
            `;
            invList.appendChild(row);

            // Панель заточки — выпадает прямо под выбранной строкой
            if (isSelected) {
                const forgePanel = document.createElement("div");
                forgePanel.className = "artifact-forge-panel";
                forgePanel.innerHTML = _buildForgePanel();
                invList.appendChild(forgePanel);
            }
        }
        invSection.appendChild(invList);
    }
    container.appendChild(invSection);
    if (_pendingDisassembleId) {
        const art = game.artifacts.find(a => a.id === _pendingDisassembleId);
        if (art && _selectedArtifactId === art.id && game.equippedArtifacts[art.slot]?.id !== art.id) {
            disassembleArtifactUI(art.id);
        } else {
            cancelDisassembleUI();
        }
    }
}

// Панель заточки — всегда видна, меняется только содержимое
function _buildForgePanel() {
    if (!_selectedArtifactId) return '<p class="empty-msg">Выберите артефакт</p>';
    const art = game.artifacts.find(a => a.id === _selectedArtifactId);
    if (!art) { _selectedArtifactId = null; return '<p class="empty-msg">Выберите артефакт</p>'; }

    const tierData = ARTIFACT_TIERS[art.tier];
    const effects = game.getArtifactEffectNames(art);
    const effectsText = effects.map(e => `<span class="forge-effect">+${e.value} ${e.name}</span>`).join(" ");
    const gradeBadge = _getGradeBadgeHtml(art);
    const isEquipped = game.equippedArtifacts[art.slot]?.id === art.id;
    const disReward = game.getDisassembleReward(art);
    const enhanceCost = game.getEnhanceCost(art);
    const enhanceChance = game.getEnhanceChance(art);
    const t = art.transcend || 0;

    // Заголовок: имя + эффекты + кнопки экип/разбор — в одном компактном блоке
    let html = `<div class="forge-top">
        <div class="forge-title">
            <span style="color:${tierData.color}">${art.name} ${gradeBadge}</span>
            <span class="forge-tier" style="color:${tierData.color}">${tierData.name}</span>
        </div>
        <div class="forge-effects">${effectsText}</div>
        <div class="forge-actions">
            ${isEquipped
                ? `<button class="btn btn-small btn-unequip" onclick="unequipArtifactUI('${art.slot}')">Снять</button>`
                : `<button class="btn btn-small btn-equip" onclick="equipArtifactUI('${art.id}')">Надеть</button>`
            }
            ${!isEquipped
                ? `<button class="btn btn-small btn-disassemble" onclick="disassembleArtifactUI('${art.id}')" title="+${disReward.dust} пыли${disReward.essence > 0 ? `, +${disReward.essence} эссенции` : ''}. Возврат 50% материалов успешной заточки; бонусы усиливают базовую добычу.">Разобрать</button>`
                : ""
            }
        </div>
    </div>`;

    // Заточка
    if (enhanceCost) {
        const canEnhance = game.daoEssence >= enhanceCost.essence && game.artifactDust >= enhanceCost.dust;
        const canCrone = enhanceCost.croneStones > 0 && game.stones >= enhanceCost.croneStones;
        const fsBonus = game.enhanceFailstacks > 0 ? `+${game.enhanceFailstacks * 2}% воля` : "";
        const scBonus = (game.scrollFailstacksApplied || 0) > 0 ? `+${game.scrollFailstacksApplied * 2}% свитки` : "";
        const failstackBonus = (fsBonus || scBonus) ? ` (${[fsBonus, scBonus].filter(Boolean).join(", ")})` : "";
        const perks = game.getActiveBodyPerks();
        const downgradeChance = perks.safeEnhance && art.enhance <= perks.safeEnhance ? 0 : getEnhanceDowngradeChance(art.enhance) * (1 - (perks.downgradeReduction || 0));
        const downgradeHint = downgradeChance > 0 ? `\u26A0 При провале: ${Math.round(downgradeChance * 100)}% шанс -1 уровня` : "\u2714 При провале уровень сохраняется";
        html += `
            <div class="enhance-section">
                <div class="enhance-info">
                    <span class="enhance-chance ${enhanceChance >= 0.5 ? 'chance-good' : enhanceChance >= 0.25 ? 'chance-mid' : 'chance-low'}">Шанс: ${(enhanceChance * 100).toFixed(0)}%${failstackBonus}</span>
                    <span class="enhance-cost">Цена: ${enhanceCost.essence} эссенции + ${enhanceCost.dust} пыли</span>
                    <span class="enhance-downgrade-hint" style="color:${downgradeChance > 0 ? '#cc6644' : '#6aea8a'}; font-size:0.85em">${downgradeHint}. Материалы расходуются.</span>
                    <span class="enhance-bonus-preview">${_enhancePreviewText(art)}</span>
                </div>
                <div class="enhance-buttons">
                    <button class="btn btn-small btn-enhance" onclick="enhanceArtifactUI('${art.id}', false)" ${canEnhance ? "" : "disabled"}>
                        Заточить \u2192 +${art.enhance + 1}
                    </button>
                    ${enhanceCost.croneStones > 0 ? `
                        <button class="btn btn-small btn-crone" onclick="enhanceArtifactUI('${art.id}', true)" ${canEnhance && canCrone ? "" : "disabled"} title="При провале уровень заточки не упадёт">
                            \uD83D\uDEE1 С защитой \u2014 ${enhanceCost.croneStones} камней
                        </button>
                    ` : ""}
                </div>
            </div>
        `;
    } else {
        if (t >= TRANSCEND_MAX) {
            html += `<div class="enhance-section"><span class="enhance-max">\u2728 PEN +${ENHANCE_MAX} \u2014 АБСОЛЮТ</span></div>`;
        } else {
            html += `<div class="enhance-section"><span class="enhance-max">\u2728 +${ENHANCE_MAX} МАКС</span></div>`;
        }
    }

    // Слияние
    if (t < TRANSCEND_MAX && (t > 0 || !enhanceCost)) {
        const candidates = game.getFusionCandidates(art.id);
        const baseCost = TRANSCEND_COST[t];
        const discount = game.getActiveBodyPerks().fusionDiscount || 0;
        const cost = { essence: Math.ceil(baseCost.essence * (1 - discount)), dust: Math.ceil(baseCost.dust * (1 - discount)) };
        const canAfford = game.daoEssence >= cost.essence && game.artifactDust >= cost.dust;
        const nextName = TRANSCEND_NAMES[t + 1];
        const nextColor = TRANSCEND_COLORS[t + 1];
        const needEnhance = t === 0;
        const reqText = needEnhance ? `Два +10 артефакта` : `Два ${TRANSCEND_NAMES[t]} артефакта`;
        html += `
            <div class="fusion-section">
                <div class="fusion-header" style="color:${nextColor}">\u2726 Слияние \u2192 ${nextName}</div>
                <div class="fusion-desc">${reqText} сливаются в ${nextName}. Заточка сохраняется.</div>
                <div class="fusion-cost">Цена: ${cost.essence} эссенции + ${cost.dust} пыли</div>
        `;
        if (candidates.length > 0 && canAfford) {
            html += `<div class="fusion-candidates">`;
            for (const c of candidates) {
                const cTier = ARTIFACT_TIERS[c.tier];
                html += `<button class="btn btn-small btn-fuse" style="border-color:${cTier.color}" onclick="fuseArtifactUI('${art.id}','${c.id}')">Поглотить: <span style="color:${cTier.color}">${c.name}</span> ${_getArtifactGradeText(c)}</button>`;
            }
            html += `</div>`;
        } else if (candidates.length === 0) {
            const needText = needEnhance
                ? `нужен ещё один +10 артефакт`
                : `нужен ещё один ${TRANSCEND_NAMES[t]} артефакт`;
            html += `<div class="fusion-no-candidates">Нет подходящих артефактов (${needText})</div>`;
        } else {
            html += `<div class="fusion-no-candidates">Недостаточно ресурсов</div>`;
        }
        html += `</div>`;
    }

    return html;
}

function _enhancePreviewText(art) {
    const curMult = game.getArtifactEffectMult(art);
    const nextMult = game.getEnhanceMult(art.enhance + 1) * game.getTranscendMult(art.transcend);
    const parts = [];
    for (const [key, val] of Object.entries(art.effects)) {
        const pool = ARTIFACT_EFFECT_POOLS[art.slot];
        const rare = ARTIFACT_RARE_EFFECTS[art.slot];
        let name = key;
        if (pool) { const f = pool.find(e => e.key === key); if (f) name = f.name; }
        if (rare) { const rares = Array.isArray(rare) ? rare : [rare]; const f = rares.find(r => r.key === key); if (f) name = f.name; }
        const cur = Math.round(val * curMult * 10) / 10;
        const next = Math.round(val * nextMult * 10) / 10;
        parts.push(`${name}: ${cur} \u2192 ${next}`);
    }
    return `+${art.enhance} \u2192 +${art.enhance + 1}: ${parts.join(", ")}`;
}

function selectArtifactForForge(artifactId) {
    if (_pendingDisassembleId) cancelDisassembleUI();
    _selectedArtifactId = (_selectedArtifactId === artifactId) ? null : artifactId;
    renderArtifacts();
}

function _getEnhanceGlowClass(enhance, transcend) {
    if (transcend >= 4) return "enhance-glow-divine";
    if (transcend >= 2) return "enhance-glow-legendary";
    if (transcend >= 1) return "enhance-glow-epic";
    if (enhance >= 9) return "enhance-glow-divine";
    if (enhance >= 7) return "enhance-glow-legendary";
    if (enhance >= 5) return "enhance-glow-epic";
    if (enhance >= 3) return "enhance-glow-rare";
    return "";
}

function _getArtifactGradeText(art) {
    const t = art.transcend || 0;
    const tName = TRANSCEND_NAMES[t];
    if (tName) return tName;
    return art.enhance > 0 ? `+${art.enhance}` : "";
}

function _getGradeBadgeHtml(art) {
    const t = art.transcend || 0;
    const tName = TRANSCEND_NAMES[t];
    let html = "";
    if (tName) {
        // Transcend артефакты показывают только PRI/DUO/TRI/TET/PEN
        const tColor = TRANSCEND_COLORS[t] || "#fff";
        html += `<span class="transcend-badge" style="color:${tColor}">${tName}</span>`;
    } else if (art.enhance > 0) {
        html += `<span class="enhance-badge">+${art.enhance}</span>`;
    }
    return html;
}

// === UI-ОБРАБОТЧИКИ АРТЕФАКТОВ ===

function useDaoScrollUI() {
    if (game.useDaoScroll()) {
        renderArtifacts();
        updateUI();
    }
}

function equipArtifactUI(artifactId) {
    game.equipArtifact(artifactId);
    renderArtifacts();
    updateUI();
}

function unequipArtifactUI(slot) {
    game.unequipArtifact(slot);
    renderArtifacts();
    updateUI();
}

function enhanceArtifactUI(artifactId, useCrone) {
    const panel = document.querySelector(".artifact-forge-panel");
    const result = game.enhanceArtifact(artifactId, useCrone);

    _refreshEnhanceCurrencies();
    if (panel) _disableEnhanceButtons(panel);

    if (result.success) {
        if (panel) {
            panel.classList.add("enhance-success-anim");
            _spawnEnhanceParticles(panel, true);
            _showEnhanceResult(panel, `+${result.level}`, true);
        }
        setTimeout(() => renderArtifacts(), 350);
    } else {
        if (result.reason) {
            const msgs = { essence: "Недостаточно Эссенции Дао!", dust: "Недостаточно Пыли Артефактов!", stones: "Недостаточно камней для защиты!", max: "Максимальная заточка!" };
            addLog(msgs[result.reason] || "Не удалось заточить.", "danger");
            renderArtifacts();
        } else if (panel) {
            panel.classList.add("enhance-fail-anim");
            _spawnEnhanceParticles(panel, false);
            _showEnhanceResult(panel, result.downgraded ? `\u2193 +${result.level}` : "Провал", false);
            setTimeout(() => renderArtifacts(), 350);
        } else {
            renderArtifacts();
        }
    }
    updateUI();
}

// Обновить отображение валют без полного ре-рендера
function _refreshEnhanceCurrencies() {
    const curr = document.querySelector(".enhance-currencies");
    if (!curr) return;
    const bs = curr.querySelectorAll("b");
    if (bs[0]) bs[0].textContent = game.daoEssence;
    if (bs[1]) bs[1].textContent = game.artifactDust;
    if (bs[2]) bs[2].textContent = game.enhanceFailstacks;
}

// Отключить все кнопки заточки на карточке
function _disableEnhanceButtons(card) {
    const btns = card.querySelectorAll(".btn-enhance, .btn-crone");
    btns.forEach(b => b.disabled = true);
}

function _spawnEnhanceParticles(card, success) {
    const rect = card.getBoundingClientRect();
    const colors = success ? ["#ffe080", "#ffd700", "#fff4cc", "#ffaa00", "#ffffff"] : ["#ff4444", "#cc2222", "#884444", "#ff6666"];
    const count = success ? 35 : 12;

    for (let i = 0; i < count; i++) {
        const particle = document.createElement("div");
        particle.className = "enhance-particle";
        particle.style.left = (rect.left + rect.width / 2 + (Math.random() - 0.5) * rect.width) + "px";
        particle.style.top = (rect.top + rect.height / 2) + "px";
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        particle.style.setProperty("--dx", ((Math.random() - 0.5) * 120) + "px");
        particle.style.setProperty("--dy", (-(30 + Math.random() * 80)) + "px");
        document.body.appendChild(particle);
        setTimeout(() => particle.remove(), 600);
    }
}

function _showEnhanceResult(card, text, success) {
    const label = document.createElement("div");
    label.className = `enhance-result-label ${success ? "enhance-result-success" : "enhance-result-fail"}`;
    label.textContent = text;
    card.style.position = "relative";
    card.appendChild(label);

    if (success) {
        // Золотая вспышка поверх карточки
        const flash = document.createElement("div");
        flash.className = "enhance-flash-overlay";
        card.appendChild(flash);
        setTimeout(() => flash.remove(), 250);
    }

    setTimeout(() => label.remove(), 400);
}

function fuseArtifactUI(keepId, consumeId) {
    game.fuseArtifacts(keepId, consumeId);
    _selectedArtifactId = keepId;
    renderArtifacts();
    updateUI();
}

function cancelDisassembleUI() {
    if (_disassembleKeyHandler) document.removeEventListener("keydown", _disassembleKeyHandler);
    _disassembleKeyHandler = null;
    _pendingDisassembleId = null;
    document.querySelector(".disassemble-overlay")?.remove();
}

function disassembleArtifactUI(artifactId, confirmed) {
    const art = game.artifacts.find(a => a.id === artifactId);
    if (!art) return;

    if (!confirmed) {
        const panel = document.querySelector(".artifact-forge-panel");
        if (!panel) return;
        cancelDisassembleUI();
        _pendingDisassembleId = artifactId;
        const reward = game.getDisassembleReward(art);
        const overlay = document.createElement("div");
        overlay.className = "disassemble-overlay";
        overlay.innerHTML = `
            <div class="disassemble-title">Разобрать «${art.name}»?</div>
            <div class="disassemble-rewards">
                <span style="color:#aaa">\u25C6 +${reward.dust} пыли</span>
                ${reward.essence > 0 ? `<span style="color:#c89aff">\u2726 +${reward.essence} эссенции</span>` : ""}
            </div>
            <div class="disassemble-buttons">
                <button class="btn btn-small btn-disassemble" onclick="disassembleArtifactUI('${artifactId}', true)">Разобрать</button>
                <button class="btn btn-small btn-secondary" onclick="cancelDisassembleUI()">Отмена</button>
            </div>
        `;
        panel.appendChild(overlay);
        overlay.querySelector(".btn-disassemble")?.focus();
        const keyHandler = (e) => {
            if (e.key === "Enter" && e.target?.closest?.(".disassemble-overlay") === overlay && !e.target?.closest?.("button")) {
                e.preventDefault();
                disassembleArtifactUI(artifactId, true);
            } else if (e.key === "Escape") {
                cancelDisassembleUI();
            }
        };
        _disassembleKeyHandler = keyHandler;
        document.addEventListener("keydown", keyHandler);
        return;
    }

    cancelDisassembleUI();
    if (_selectedArtifactId === artifactId) _selectedArtifactId = null;
    game.disassembleArtifact(artifactId);
    renderArtifacts();
    updateUI();
}

function openBulkDisassembleMenu() {
    // Убрать старый попап
    const old = document.getElementById("bulk-disassemble-popup");
    if (old) { closeBulkDisassembleMenu(); return; }

    const tierOrder = ["common", "uncommon", "rare", "epic", "legendary"];
    const tierNamesRu = { common: "Смертный", uncommon: "Духовный", rare: "Мистический", epic: "Небесный", legendary: "Священный" };
    const tierColors = { common: "#888", uncommon: "#4acc6a", rare: "#4488ff", epic: "#aa44cc", legendary: "#ff8844" };

    let rows = "";
    for (let i = 0; i < tierOrder.length; i++) {
        const maxTier = tierOrder[i];
        const label = tierNamesRu[maxTier];
        const color = tierColors[maxTier];
        const count = game.artifacts.filter(a => {
            if ((a.enhance || 0) > 0) return false;
            if (ARTIFACT_SLOTS.some(s => game.equippedArtifacts[s]?.id === a.id)) return false;
            const tierIdx = tierOrder.indexOf(a.tier);
            return tierIdx >= 0 && tierIdx <= i;
        }).length;
        let totalDust = 0, totalEssence = 0;
        if (count > 0) {
            game.artifacts.filter(a => {
                if ((a.enhance || 0) > 0) return false;
                if (ARTIFACT_SLOTS.some(s => game.equippedArtifacts[s]?.id === a.id)) return false;
                const tierIdx = tierOrder.indexOf(a.tier);
                return tierIdx >= 0 && tierIdx <= i;
            }).forEach(a => {
                const r = game.getDisassembleReward(a);
                totalDust += r.dust;
                totalEssence += r.essence;
            });
        }
        rows += `<div class="bulk-row ${count === 0 ? "bulk-row-empty" : ""}" style="border-left-color:${color}">
            <span class="bulk-tier" style="color:${color}">${label} и ниже</span>
            <span class="bulk-count">${count} шт.</span>
            <span class="bulk-reward">${count > 0 ? `<span style="color:#aaa">+${totalDust} \u25C6</span>${totalEssence > 0 ? ` <span style="color:#c89aff">+${totalEssence} \u2726</span>` : ""}` : "—"}</span>
            <button class="btn btn-tiny btn-disassemble" onclick="confirmBulkDisassemble('${maxTier}')" ${count === 0 ? "disabled" : ""}>Разобрать</button>
        </div>`;
    }

    const popup = document.createElement("div");
    popup.id = "bulk-disassemble-popup";
    popup.className = "bulk-popup-overlay";
    popup.innerHTML = `
        <div class="bulk-popup">
            <div class="bulk-popup-header">Разбор артефактов</div>
            <div class="bulk-popup-hint">Экипированные и заточённые не затрагиваются</div>
            <div class="bulk-rows">${rows}</div>
            <button class="btn btn-small btn-secondary bulk-popup-close" onclick="closeBulkDisassembleMenu()">Закрыть (Esc)</button>
        </div>
    `;
    document.body.appendChild(popup);

    const escHandler = (e) => {
        if (e.key === "Escape") {
            closeBulkDisassembleMenu();
        }
    };
    document.addEventListener("keydown", escHandler);
    popup._escHandler = escHandler;
}

function closeBulkDisassembleMenu() {
    const popup = document.getElementById("bulk-disassemble-popup");
    if (!popup) return;
    if (popup._escHandler) document.removeEventListener("keydown", popup._escHandler);
    popup.remove();
}

function confirmBulkDisassemble(maxTier) {
    const tierOrder = ["common", "uncommon", "rare", "epic", "legendary"];
    const maxIdx = tierOrder.indexOf(maxTier);
    const targets = game.artifacts.filter(a => {
        if ((a.enhance || 0) > 0) return false;
        if (ARTIFACT_SLOTS.some(s => game.equippedArtifacts[s]?.id === a.id)) return false;
        const tierIdx = tierOrder.indexOf(a.tier);
        return tierIdx >= 0 && tierIdx <= maxIdx;
    });
    if (targets.length === 0) return;

    const ids = targets.map(a => a.id);
    if (ids.includes(_selectedArtifactId)) _selectedArtifactId = null;
    for (const id of ids) {
        game.disassembleArtifact(id);
    }
    // Без лога — итог виден в UI

    // Закрыть попап и обновить
    closeBulkDisassembleMenu();
    renderArtifacts();
    updateUI();
}

// === ФОРМАЦИИ SECTION (внутри таба культивации) ===
function _getDaoHint() {
    if (!game.sect) return "Вступите в секту";
    const sect = SECTS.find(s => s.id === game.sect.id);
    if (!sect) return "Постигайте Дао";
    const actNames = { dao: "Постигайте Дао", body: "Закаляйте Тело", fate: "Испытайте Судьбу" };
    if (sect.id === "hidden_hermit") return "Тренируйтесь";
    const act = sect.daoActivity;
    if (Array.isArray(act)) return act.map(a => actNames[a] || a).join(" / ");
    return actNames[act] || "Постигайте Дао";
}

function renderFormations() {
    if (deferUIRender(renderFormations)) return;
    const container = document.getElementById("formations-list");
    if (!container) return;
    container.innerHTML = "";

    const karmaFormSlots = game.prestige.karmaUpgrades.formationSlot || 0;
    const eraFormSlots = game.getEraFormationSlotBonus();
    const maxSlots = MAX_FORMATION_SLOTS + (game.getActiveBodyPerks().formationSlots || 0) + karmaFormSlots + eraFormSlots;
    const selectedCount = game.selectedFormations.length;

    // До Золотого Ядра — скрыть полностью
    if (game.realmIndex < 3) return;

    // Заголовок со счётчиком слотов
    const header = document.createElement("div");
    header.className = "formation-slots-header";
    header.innerHTML = `Культивационные Формации: <span class="formation-slot-count">${selectedCount}/${maxSlots}</span>`;
    container.appendChild(header);

    // Выбранные формации
    for (const fId of game.selectedFormations) {
        const formation = CULT_FORMATIONS.find(f => f.id === fId);
        if (!formation) continue;
        container.appendChild(_renderFormationRow(formation, true, maxSlots));
    }

    // Доступные (не выбранные) — только разблокированные
    const unlocked = game.prestige.unlockedFormations || [];
    const available = CULT_FORMATIONS.filter(f => !game.isFormationSelected(f.id) && (!f.sect || unlocked.includes(f.id)));

    if (available.length > 0) {
        const divider = document.createElement("div");
        divider.className = "formation-divider";
        divider.textContent = "Доступные формации";
        container.appendChild(divider);

        for (const formation of available) {
            container.appendChild(_renderFormationRow(formation, false, maxSlots));
        }
    }

    // Заблокированные формации скрыты полностью
}

function _renderFormationRow(formation, isSelected, maxSlots) {
    const level = game.formations[formation.id] || 0;
    // Dao cap: max level limited by dao level of the formation's sect
    // Кап = текущий daoLevel (любой путь Дао открывает формации)
    const daoCap = formation.sect ? (game.daoLevel || 0) : formation.maxLevel;
    const effectiveMax = Math.min(formation.maxLevel, daoCap);
    const atMax = level >= effectiveMax;
    const atAbsoluteMax = level >= formation.maxLevel;
    const cost = atMax ? null : game.getFormationUpgradeCost(formation.id);
    const canBuy = !game.gameOver && isSelected && !atMax && cost !== null && game.stones >= cost;
    const canSelect = !game.gameOver && !isSelected && game.selectedFormations.length < maxSlots;

    const perLevelText = _formationPerLevelText(formation);
    const currentText = level > 0 ? game._formatFormationEffect(formation, level) : "\u2014";
    const daoCapText = formation.sect && daoCap > 0 && daoCap < formation.maxLevel ? ` (постижение: ${daoCap})` : "";

    const row = document.createElement("div");
    row.className = `formation-row ${isSelected ? "formation-selected" : "formation-available"}`;
    row.innerHTML = `
        <div class="formation-info">
            <span class="formation-name" style="color:${formation.color}">${formation.name}</span>
            <span class="formation-desc">${formation.description}</span>
            <span class="formation-effect">${perLevelText} | Сейчас: ${currentText}</span>
        </div>
        <div class="formation-action">
            ${isSelected ? `
                <span class="formation-level">Ур. ${level}/${effectiveMax}${daoCapText}</span>
                ${atAbsoluteMax
                    ? '<span class="formation-max">МАКС</span>'
                    : atMax
                        ? `<span class="formation-max" style="color:#eebb44">${daoCap === 0 ? _getDaoHint() : "Углубите постижение"}</span>`
                        : `<button class="btn btn-small btn-secondary" data-formation="${formation.id}" data-cost="${cost}" onclick="buyFormationUI('${formation.id}')" ${canBuy ? "" : "disabled"}>\u2191 ${cost}</button>`
                }
            ` : `
                ${level > 0 ? `<span class="formation-level">Ур. ${level}</span>` : ""}
                <button class="btn btn-small btn-primary-outline" onclick="selectFormationUI('${formation.id}')" ${canSelect ? "" : "disabled"}>Выбрать</button>
            `}
        </div>
    `;
    return row;
}

function _formationPerLevelText(formation) {
    const effectNames = {
        qi: "ци",
        statXpSpeed: "совершенствование",
        techXpSpeed: "скорость техник",
        luck: "удача",
        demonReduction: "шанс демона",
        pillEffect: "эффект пилюль",
        karmaBonus: "карма",
        expeditionSpeed: "скорость экспедиций",
        breakthroughBonus: "шанс прорыва",
        combatPower: "боевая мощь",
        dangerReward: "награды за опасность"
    };
    const name = effectNames[formation.effectKey] || formation.effectKey;
    if (formation.effectKey === "demonReduction") {
        return `-${Math.round(formation.effectPerLevel * 100)}% ${name} за ур.`;
    }
    if (formation.effectKey === "breakthroughBonus") {
        return `+${(formation.effectPerLevel * 100).toFixed(1)}% ${name} за ур.`;
    }
    if (formation.effectKey === "luck") {
        return `+${formation.effectPerLevel} ${name} за ур.`;
    }
    return `+${Math.round(formation.effectPerLevel * 100)}% ${name} за ур.`;
}

function buyFormationUI(formationId) {
    game.buyFormation(formationId);
    renderFormations();
}

function selectFormationUI(formationId) {
    game.selectFormation(formationId);
    renderFormations();
}
