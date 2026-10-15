// ============================================================
// UI/ARTIFACTS.JS — Таб артефактов (заточка, разбор, BDO-style) + формации
// ============================================================

// === АРТЕФАКТЫ TAB ===
let _selectedArtifactId = null;
let _pendingDisassembleId = null;
let _disassembleKeyHandler = null;
const _v2ArtifactDetails = new Map();
const _v2FusionChoices = new Map();
const _v2ArtifactSlotIcons = { weapon: "⚔️", armor: "🛡️", accessory: "💍", treasure: "💎" };
let _v2EnhancePending = null;

function _v2ArtifactTypeIcon(slot) {
    return `<span class="v2-artifact-type-icon" aria-hidden="true">${_v2ArtifactSlotIcons[slot] || ""}</span>`;
}

function _v2ArtifactEffectLabel(effect) {
    const labels = {
        strength: "Сила", spirit: "Дух", combatPower: "Боевая мощь", qi: "Скорость накопления ци",
        qiRetention: "Сохранение ци при провале", lifespan: "Продолжительность жизни",
        techXpSpeed: "Скорость обучения", statXpSpeed: "Усиление медитации", luck: "Удача",
        breakthroughBonus: "Шанс прорыва", stoneIncome: "Доход камней", expeditionSpeed: "Скорость походов",
        pillEffect: "Эффект пилюль", demonReduction: "Снижение риска внутреннего демона", dangerReward: "Награды за опасные походы",
        timeSpeed: "Скорость времени", daoSpeed: "Скорость изучения Дао", karmaBonus: "Карма за жизнь"
    };
    const unit = ["strength", "spirit", "combatPower", "luck"].includes(effect.key) ? "" : "%";
    return `+${effect.value}${unit} ${labels[effect.key] || effect.name.replace(/\s*\(%\)/g, "")}`;
}

function _v2FusionGradeName(level) {
    return level > 0 ? `Слияние ${level}` : "без слияния";
}

function _v2ArtifactShortEffects(effects, limit = 2) {
    const names = {
        strength: "Сила", spirit: "Дух", combatPower: "Бой", qi: "Ци", lifespan: "Жизнь",
        luck: "Удача", techXpSpeed: "Обучение", statXpSpeed: "Медитация", daoSpeed: "Путь",
        breakthroughBonus: "Прорыв", qiRetention: "Сохранение ци", pillEffect: "Пилюли",
        dangerReward: "Добыча", karmaBonus: "Карма", expeditionSpeed: "Походы",
        timeSpeed: "Время", demonReduction: "Защита", stoneIncome: "Камни"
    };
    return effects.slice(0, limit).map(effect => {
        const unit = ["strength", "spirit", "combatPower", "luck"].includes(effect.key) ? "" : "%";
        return `${names[effect.key] || effect.name} +${effect.value}${unit}`;
    }).join(" · ");
}

function renderArtifacts() {
    if (deferUIRender(renderArtifacts)) return;
    if (_v2EnhancePending) {
        if (_v2EnhancePending.panel.isConnected && _v2EnhancePending.artifactId === _selectedArtifactId) {
            _patchV2EnhancePanel(_v2EnhancePending.panel);
            return;
        }
        _v2EnhancePending = null;
    }
    const closedLife = !!(game.gameOver || game.pendingRebirth);
    if (closedLife) { cancelDisassembleUI(); closeBulkDisassembleMenu(); }
    const container = document.getElementById("artifacts-list");
    if (!container) return;
    const listTop = container.querySelector(".artifact-inv-list")?.scrollTop || 0;
    const forgeTop = container.querySelector(".artifact-forge-panel")?.scrollTop || 0;
    const focused = container.contains(document.activeElement) ? document.activeElement : null;
    const focusedId = focused?.id;
    const focusedAction = focused?.getAttribute("onclick");
    container.querySelectorAll("details[data-artifact-detail]").forEach(el => _v2ArtifactDetails.set(el.dataset.artifactDetail, el.open));
    container.innerHTML = "";

    const sorted = [...game.artifacts].sort((a, b) => {
        const aEq = ARTIFACT_SLOTS.some(s => game.equippedArtifacts[s]?.id === a.id) ? 0 : 1;
        const bEq = ARTIFACT_SLOTS.some(s => game.equippedArtifacts[s]?.id === b.id) ? 0 : 1;
        return aEq - bEq;
    });
    if (!sorted.some(art => art.id === _selectedArtifactId)) _selectedArtifactId = sorted[0]?.id || null;

    const scrollCount = game.daoScrolls || 0;
    const scrollsUsed = game.scrollFailstacksApplied || 0;
    const currSection = document.createElement("div");
    currSection.className = "enhance-currencies v2-artifact-currencies";
    currSection.hidden = !(game.enhanceFailstacks > 0 || scrollCount > 0 || scrollsUsed > 0);
    currSection.innerHTML = `<div class="currency-row">
        <span id="v2-artifact-fail-bonus-wrap" class="currency-item" ${game.enhanceFailstacks > 0 ? "" : "hidden"} title="Растёт при неудаче, сбрасывается при успехе.">Бонус к заточке <b id="v2-artifact-fail-bonus">+${game.enhanceFailstacks * 2}%</b></span>
        ${scrollCount > 0 ? `<button class="btn btn-small btn-scroll v2-resource-scrolls" onclick="useDaoScrollUI()" ${!closedLife && scrollsUsed < 10 ? "" : "disabled"} title="Расходует один свиток: +2 процентных пункта к шансу заточки до следующего успеха. Применено ${scrollsUsed}/10."><span class="currency-icon" aria-hidden="true">✧</span> Свиток +2%</button>` : ""}
        <span id="v2-artifact-scroll-bonus" class="v2-artifact-scroll-count v2-resource-scrolls" ${scrollsUsed > 0 ? "" : "hidden"} title="Применено ${scrollsUsed}/10 свитков. Бонус сохраняется при провале и сбрасывается при успехе.">✧ Свитки +${scrollsUsed * 2}%</span>
    </div>`;
    container.appendChild(currSection);

    const loadout = document.createElement("div");
    loadout.className = "artifact-slots-grid v2-artifact-loadout";
    for (const slot of ARTIFACT_SLOTS) {
        const art = game.equippedArtifacts[slot];
        const slotEl = document.createElement(art ? "button" : "div");
        slotEl.className = `artifact-slot v2-artifact-slot ${art ? `artifact-slot-filled art-tier-${art.tier}` : "artifact-slot-empty"}`;
        const slotName = ARTIFACT_SLOT_NAMES[slot];
        if (art) {
            slotEl.type = "button";
            slotEl.title = `${slotName}: ${art.name}. Выбрать предмет.`;
            slotEl.addEventListener("click", () => selectArtifactForForge(art.id));
            slotEl.innerHTML = `<span class="artifact-slot-label">${_v2ArtifactTypeIcon(slot)} ${slotName}</span><span class="artifact-name">${art.name} ${_getGradeBadgeHtml(art)}</span>`;
        } else {
            slotEl.innerHTML = `<span class="artifact-slot-label">${_v2ArtifactTypeIcon(slot)} ${slotName}</span><span class="artifact-empty">Пусто</span>`;
        }
        loadout.appendChild(slotEl);
    }
    container.appendChild(loadout);

    const perks = game.getActiveBodyPerks();
    if (perks.carryArtifacts > 0) {
        const ring = document.createElement("span");
        ring.className = "v2-artifact-ring";
        ring.textContent = `Пространственное кольцо сохранит до ${perks.carryArtifacts} лучших предметов после этой жизни.`;
        container.appendChild(ring);
    }

    const workspace = document.createElement("div");
    workspace.className = "v2-artifact-workspace";
    const inventory = document.createElement("section");
    inventory.className = "artifact-inventory v2-artifact-inventory";
    inventory.innerHTML = `<div class="v2-artifact-list-heading"><strong>Предметы ${game.artifacts.length}/${ARTIFACT_MAX_INVENTORY}</strong><button class="btn btn-small btn-disassemble" onclick="openBulkDisassembleMenu()" ${!closedLife && sorted.length ? "" : "disabled"}>Разобрать несколько…</button></div>`;
    const list = document.createElement("div");
    list.className = "artifact-inv-list";
    list.setAttribute("aria-label", "Артефакты в инвентаре");
    for (const art of sorted) {
        const isEquipped = game.equippedArtifacts[art.slot]?.id === art.id;
        const isSelected = art.id === _selectedArtifactId;
        const effects = game.getArtifactEffectNames(art);
        const effectsText = effects.map(_v2ArtifactEffectLabel).join(", ");
        const shortEffectsText = _v2ArtifactShortEffects(effects);
        const tierData = ARTIFACT_TIERS[art.tier];
        const row = document.createElement("div");
        row.className = `artifact-row art-tier-${art.tier}${isSelected ? " artifact-row-selected" : ""}${isEquipped ? " artifact-row-equipped" : ""}`;
        row.id = `art-card-${art.id}`;
        row.setAttribute("role", "button");
        row.setAttribute("aria-pressed", String(isSelected));
        row.setAttribute("aria-label", `${art.name}, ${tierData.name}, ${ARTIFACT_SLOT_NAMES[art.slot]}${isEquipped ? ", надет" : ""}. ${effectsText}`);
        row.tabIndex = 0;
        row.title = `${art.name} · ${tierData.name} · ${ARTIFACT_SLOT_NAMES[art.slot]}\n${effectsText}`;
        row.addEventListener("click", () => selectArtifactForForge(art.id));
        row.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                selectArtifactForForge(art.id);
            }
        });
        row.innerHTML = `<span class="artrow-name">${_v2ArtifactTypeIcon(art.slot)} ${art.name} ${_getGradeBadgeHtml(art)}</span><span class="artrow-effects"><span class="v2-art-effects-short">${shortEffectsText}</span><span class="v2-art-effects-full">${effectsText}</span></span><span class="artrow-state">${isEquipped ? "Надет" : ""}</span><span class="artrow-tier">${tierData.name}</span>`;
        list.appendChild(row);
    }
    if (!sorted.length) list.innerHTML = '<p class="empty-msg">Артефакты появятся в событиях и походах.</p>';
    inventory.appendChild(list);
    workspace.appendChild(inventory);
    const forge = document.createElement("section");
    forge.className = "artifact-forge-panel v2-artifact-forge";
    forge.setAttribute("aria-label", "Выбранный артефакт и улучшение");
    const selected = sorted.find(art => art.id === _selectedArtifactId);
    if (selected) forge.classList.add(`art-tier-${selected.tier}`);
    forge.innerHTML = _buildForgePanel();
    forge.querySelectorAll("details[data-artifact-detail]").forEach(detail => {
        detail.open = _v2ArtifactDetails.get(detail.dataset.artifactDetail) || false;
    });
    workspace.appendChild(forge);
    container.appendChild(workspace);
    list.scrollTop = listTop;
    forge.scrollTop = forgeTop;
    if (_pendingDisassembleId) {
        const art = game.artifacts.find(a => a.id === _pendingDisassembleId);
        if (art && _selectedArtifactId === art.id && game.equippedArtifacts[art.slot]?.id !== art.id) disassembleArtifactUI(art.id);
        else cancelDisassembleUI();
    } else {
        const nextFocus = focusedId ? document.getElementById(focusedId)
            : focusedAction ? [...container.querySelectorAll("button[onclick]")].find(button => button.getAttribute("onclick") === focusedAction) : null;
        nextFocus?.focus({preventScroll: true});
    }
}
// Панель заточки — всегда видна, меняется только содержимое
function _buildForgePanel() {
    if (!_selectedArtifactId) return '<p class="empty-msg">Выберите артефакт</p>';
    const art = game.artifacts.find(a => a.id === _selectedArtifactId);
    if (!art) { _selectedArtifactId = null; return '<p class="empty-msg">Выберите артефакт</p>'; }

    const tierData = ARTIFACT_TIERS[art.tier];
    const effects = game.getArtifactEffectNames(art);
    const effectsText = effects.map(e => `<span class="forge-effect">${_v2ArtifactEffectLabel(e)}</span>`).join(" ");
    const gradeBadge = _getGradeBadgeHtml(art);
    const isEquipped = game.equippedArtifacts[art.slot]?.id === art.id;
    const replacing = !isEquipped && game.equippedArtifacts[art.slot];
    const disReward = game.getDisassembleReward(art);
    const enhanceCost = game.getEnhanceCost(art);
    const enhanceChance = game.getEnhanceChance(art);
    const t = art.transcend || 0;
    const closedLife = !!(game.gameOver || game.pendingRebirth);
    const disabled = closedLife ? "disabled" : "";

    // Заголовок: имя + эффекты + кнопки экип/разбор — в одном компактном блоке
    let html = `<div class="forge-top">
        <div class="forge-title">
            <span class="v2-artifact-selected-name">${_v2ArtifactTypeIcon(art.slot)} ${art.name} ${gradeBadge}</span>
            <span class="forge-tier">${tierData.name} · ${ARTIFACT_SLOT_NAMES[art.slot]}</span>
        </div>
        <div class="forge-effects">${effectsText}</div>
        ${replacing ? `<div class="v2-artifact-replacement">Заменит: <span class="art-tier-${replacing.tier}">${_v2ArtifactTypeIcon(replacing.slot)} ${replacing.name} ${_getGradeBadgeHtml(replacing)}</span></div>` : ""}
        <div class="forge-actions">
            ${isEquipped
                ? `<button class="btn btn-small btn-unequip" onclick="unequipArtifactUI('${art.slot}')" ${disabled}>Снять</button>`
                : `<button class="btn btn-small btn-equip" onclick="equipArtifactUI('${art.id}')" ${disabled}>${replacing ? "Заменить" : "Надеть"}</button>`
            }
            ${!isEquipped
                ? `<button class="btn btn-small btn-disassemble" onclick="disassembleArtifactUI('${art.id}')" ${disabled} title="Предмет исчезнет навсегда. Получите ${disReward.dust} пыли${disReward.essence > 0 ? ` и ${disReward.essence} эссенции` : ''}.">Разобрать…</button>`
                : ""
            }
        </div>
    </div>`;

    if (closedLife) html += '<p class="empty-msg">Жизнь завершена. Снаряжение больше нельзя менять.</p>';

    // Заточка
    if (enhanceCost) {
        const canEnhance = !closedLife && game.daoEssence >= enhanceCost.essence && game.artifactDust >= enhanceCost.dust;
        const canCrone = enhanceCost.croneStones > 0 && game.stones >= enhanceCost.croneStones;
        const perks = game.getActiveBodyPerks();
        const downgradeChance = perks.safeEnhance && art.enhance <= perks.safeEnhance ? 0 : getEnhanceDowngradeChance(art.enhance) * (1 - (perks.downgradeReduction || 0));
        const downgradeHint = downgradeChance > 0 ? `При провале: ${(downgradeChance * 100).toFixed(1)}% риск потери уровня` : "При провале уровень сохраняется";
        const nextMultiplier = game.getEnhanceMult(art.enhance + 1) * game.getTranscendMult(t);
        const nextEffects = effects.map(effect => ({ ...effect, value: Math.round(art.effects[effect.key] * nextMultiplier * 10) / 10 }));
        html += `
            <div class="enhance-section">
                <div class="enhance-info">
                    <span class="enhance-chance ${enhanceChance >= 0.5 ? 'chance-good' : enhanceChance >= 0.25 ? 'chance-mid' : 'chance-low'}">Успех: ${(enhanceChance * 100).toFixed(1)}%</span>
                    <span class="enhance-cost">Цена: <span class="v2-resource-essence">✦ ${enhanceCost.essence} эссенции</span> + <span class="v2-resource-dust">◆ ${enhanceCost.dust} пыли</span></span>
                    <span class="enhance-downgrade-hint">${downgradeHint}. Материалы расходуются всегда.</span>
                </div>
                <div class="enhance-buttons">
                    <button class="btn btn-small btn-enhance" onclick="enhanceArtifactUI('${art.id}', false)" ${canEnhance ? "" : "disabled"}>
                        Заточить \u2192 +${art.enhance + 1}
                    </button>
                    ${enhanceCost.croneStones > 0 ? `
                        <button class="btn btn-small btn-crone" onclick="enhanceArtifactUI('${art.id}', true)" ${canEnhance && canCrone ? "" : "disabled"} title="Уровень не упадёт при провале. Шанс успеха не меняется. Камни, эссенция и пыль расходуются при любом результате.">
                            Без потери уровня · <span class="v2-resource-stones">◇ ${enhanceCost.croneStones} камней</span>
                        </button>
                    ` : ""}
                </div>
                <p class="v2-artifact-preview">После заточки: ${_v2ArtifactShortEffects(nextEffects, nextEffects.length)}</p>
            </div>
        `;
    } else {
        if (t >= TRANSCEND_MAX) {
            html += `<div class="enhance-section"><span class="enhance-max">Максимальное слияние · заточка +${art.enhance}</span></div>`;
        } else {
            html += `<div class="enhance-section"><span class="enhance-max">${t > 0 ? `Заточка +${art.enhance} · дальнейшее усиление через слияние` : `Заточка +${ENHANCE_MAX} · доступно слияние`}</span></div>`;
        }
    }

    // Слияние
    if (t < TRANSCEND_MAX && (t > 0 || !enhanceCost)) {
        const candidates = game.getFusionCandidates(art.id);
        const baseCost = TRANSCEND_COST[t];
        const discount = game.getActiveBodyPerks().fusionDiscount || 0;
        const cost = { essence: Math.ceil(baseCost.essence * (1 - discount)), dust: Math.ceil(baseCost.dust * (1 - discount)) };
        const canAfford = !closedLife && game.daoEssence >= cost.essence && game.artifactDust >= cost.dust;
        const nextName = _v2FusionGradeName(t + 1);
        const needEnhance = t === 0;
        html += `
            <div class="fusion-section">
                <div class="fusion-header">Слияние \u2192 ${nextName}</div>
                <div class="fusion-cost">Цена: <span class="v2-resource-essence">✦ ${cost.essence} эссенции</span> + <span class="v2-resource-dust">◆ ${cost.dust} пыли</span></div>
        `;
        if (candidates.length > 0) {
            const candidate = candidates.find(item => item.id === _v2FusionChoices.get(art.id)) || candidates[0];
            _v2FusionChoices.set(art.id, candidate.id);
            const equippedVictim = game.equippedArtifacts[candidate.slot]?.id === candidate.id;
            html += `<label class="v2-fusion-choice" for="v2-artifact-fusion-choice">Второй предмет<select id="v2-artifact-fusion-choice" ${disabled} onchange="_setV2FusionChoice('${art.id}', this.value)">${candidates.map(item => `<option value="${item.id}" ${item.id === candidate.id ? "selected" : ""}>${item.name} · ${ARTIFACT_TIERS[item.tier].name} ${_getArtifactGradeText(item)}${game.equippedArtifacts[item.slot]?.id === item.id ? " · надет" : ""}</option>`).join("")}</select></label>
                <p class="v2-action-warning fusion-victim">«${candidate.name}» исчезнет навсегда${equippedVictim ? "; сейчас надет" : ""}. Заточка основного предмета сохранится.</p>
                <button class="btn btn-small btn-fuse" onclick="fuseArtifactUI('${art.id}','${candidate.id}')" ${canAfford ? "" : "disabled"}>Слить, уничтожив второй предмет</button>
                ${canAfford ? "" : '<span class="fusion-no-candidates">Недостаточно материалов</span>'}`;
        } else if (candidates.length === 0) {
            const needText = needEnhance
                ? `нужен ещё один +10 артефакт`
                : `нужен ещё один артефакт с уровнем слияния ${t}`;
            html += `<div class="fusion-no-candidates">Нет подходящих артефактов (${needText})</div>`;
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
        const label = _v2ArtifactEffectLabel({key, name, value: cur}).replace(/^\+[\d.]+%? /, "");
        const unit = ["strength", "spirit", "combatPower", "luck"].includes(key) ? "" : "%";
        parts.push(`${label}: +${cur}${unit} → +${next}${unit}`);
    }
    return `+${art.enhance} \u2192 +${art.enhance + 1}: ${parts.join(", ")}`;
}

function selectArtifactForForge(artifactId) {
    if (!game.artifacts.some(art => art.id === artifactId)) return;
    if (_pendingDisassembleId) cancelDisassembleUI();
    _selectedArtifactId = artifactId;
    renderArtifacts();
}

function _setV2FusionChoice(artifactId, candidateId) {
    _v2FusionChoices.set(artifactId, candidateId);
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
    const tName = t > 0 ? _v2FusionGradeName(t) : "";
    if (tName) return tName;
    return art.enhance > 0 ? `+${art.enhance}` : "";
}

function _getGradeBadgeHtml(art) {
    const t = art.transcend || 0;
    const tName = t > 0 ? _v2FusionGradeName(t) : "";
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
    if (game.gameOver || game.pendingRebirth) return;
    if (game.useDaoScroll()) {
        renderArtifacts();
        updateUI();
    }
}

function equipArtifactUI(artifactId) {
    if (game.gameOver || game.pendingRebirth) return;
    game.equipArtifact(artifactId);
    renderArtifacts();
    updateUI();
}

function unequipArtifactUI(slot) {
    if (game.gameOver || game.pendingRebirth) return;
    game.unequipArtifact(slot);
    renderArtifacts();
    updateUI();
}

function enhanceArtifactUI(artifactId, useCrone) {
    if (game.gameOver || game.pendingRebirth) return;
    if (_v2EnhancePending) return;
    const panel = document.querySelector(".artifact-forge-panel");
    const result = game.enhanceArtifact(artifactId, useCrone);
    if (result.reason) {
        const msgs = { essence: "Недостаточно эссенции!", dust: "Недостаточно пыли!", stones: "Недостаточно камней для защиты!", max: "Максимальная заточка!" };
        addLog(msgs[result.reason] || "Не удалось заточить.", "danger");
        renderArtifacts();
        updateUI();
        return;
    }
    if (!panel) {
        updateUI();
        return;
    }

    // Полное обновление интерфейса не должно удалять ещё проигрывающийся результат.
    const feedback = { artifactId, panel };
    _v2EnhancePending = feedback;
    _patchV2EnhancePanel(panel);
    _disableEnhanceButtons(panel);
    panel.classList.remove("enhance-success-anim", "enhance-fail-anim");
    void panel.offsetWidth;
    panel.classList.add(result.success ? "enhance-success-anim" : "enhance-fail-anim");
    _spawnEnhanceParticles(panel, result.success);
    _showEnhanceResult(panel, result.success ? `+${result.level}` : result.downgraded ? `\u2193 +${result.level}` : "Провал", result.success);
    setTimeout(() => {
        if (_v2EnhancePending !== feedback) return;
        _v2EnhancePending = null;
        renderArtifacts();
        updateUI();
    }, 420);
    updateUI();
}

function _patchV2EnhancePanel(panel) {
    _refreshEnhanceCurrencies();
    const art = game.artifacts.find(item => item.id === _selectedArtifactId);
    if (!art) return;
    const fresh = document.createElement("div");
    fresh.innerHTML = _buildForgePanel();
    for (const selector of [".forge-title", ".forge-effects", ".enhance-info", ".v2-artifact-preview"]) {
        const current = panel.querySelector(selector), next = fresh.querySelector(selector);
        if (current && next) current.innerHTML = next.innerHTML;
    }
    const row = document.getElementById(`art-card-${art.id}`);
    if (row) {
        const effects = game.getArtifactEffectNames(art);
        const name = row.querySelector(".artrow-name");
        if (name) name.innerHTML = `${_v2ArtifactTypeIcon(art.slot)} ${art.name} ${_getGradeBadgeHtml(art)}`;
        const short = row.querySelector(".v2-art-effects-short"), full = row.querySelector(".v2-art-effects-full");
        if (short) short.textContent = _v2ArtifactShortEffects(effects);
        if (full) full.textContent = effects.map(_v2ArtifactEffectLabel).join(", ");
    }
}

// Обновить отображение валют без полного ре-рендера
function _refreshEnhanceCurrencies() {
    const bonusValue = document.getElementById("v2-artifact-fail-bonus");
    if (bonusValue) bonusValue.textContent = `+${game.enhanceFailstacks * 2}%`;
    const bonus = document.getElementById("v2-artifact-fail-bonus-wrap");
    if (bonus) bonus.hidden = !game.enhanceFailstacks;
    const used = game.scrollFailstacksApplied || 0;
    const scrollBonus = document.getElementById("v2-artifact-scroll-bonus");
    if (scrollBonus) {
        scrollBonus.hidden = !used;
        scrollBonus.textContent = `✧ Свитки +${used * 2}%`;
    }
    const scrollButton = document.querySelector(".v2-artifact-currencies .btn-scroll");
    if (scrollButton) scrollButton.disabled = !!(game.gameOver || game.pendingRebirth) || !!_v2EnhancePending || !(game.daoScrolls > 0) || used >= 10;
    const header = document.querySelector(".v2-artifact-currencies");
    if (header) header.hidden = !(game.enhanceFailstacks > 0 || game.daoScrolls > 0 || used > 0);
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
    label.style.top = `${card.scrollTop + card.clientHeight / 2}px`;
    card.style.position = "relative";
    card.appendChild(label);

    if (success) {
        // Золотая вспышка поверх карточки
        const flash = document.createElement("div");
        flash.className = "enhance-flash-overlay";
        flash.style.top = `${card.scrollTop}px`;
        flash.style.bottom = "auto";
        flash.style.height = `${card.clientHeight}px`;
        card.appendChild(flash);
        setTimeout(() => flash.remove(), 250);
    }

    setTimeout(() => label.remove(), 400);
}

function fuseArtifactUI(keepId, consumeId) {
    if (game.gameOver || game.pendingRebirth) return;
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
    if (game.gameOver || game.pendingRebirth) { cancelDisassembleUI(); return; }
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
            <p class="v2-action-warning">Предмет исчезнет навсегда. Вы получите материалы ниже.</p>
            <div class="disassemble-rewards">
                <span class="v2-resource-dust">\u25C6 +${reward.dust} пыли</span>
                ${reward.essence > 0 ? `<span class="v2-resource-essence">\u2726 +${reward.essence} эссенции</span>` : ""}
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
    if (game.gameOver || game.pendingRebirth) return;
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
            <span class="bulk-reward">${count > 0 ? `<span class="v2-resource-dust">+${totalDust} \u25C6</span>${totalEssence > 0 ? ` <span class="v2-resource-essence">+${totalEssence} \u2726</span>` : ""}` : "—"}</span>
            <button class="btn btn-tiny btn-disassemble" onclick="confirmBulkDisassemble('${maxTier}')" ${count === 0 ? "disabled" : ""}>Разобрать</button>
        </div>`;
    }

    const popup = document.createElement("div");
    popup.id = "bulk-disassemble-popup";
    popup.className = "bulk-popup-overlay";
    popup.innerHTML = `
        <div class="bulk-popup">
            <div class="bulk-popup-header">Разбор артефактов</div>
            <div class="bulk-popup-hint">Надетые и заточённые предметы сохранятся. Все выбранные для разбора предметы исчезнут навсегда.</div>
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
    if (game.gameOver || game.pendingRebirth) { closeBulkDisassembleMenu(); return; }
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

// Обработчики формаций; карточки строит отдельный formations.js.
function buyFormationUI(formationId) {
    if (game.gameOver || game.pendingRebirth) return;
    game.buyFormation(formationId);
    renderFormations();
}

function selectFormationUI(formationId) {
    if (game.gameOver || game.pendingRebirth) return;
    game.selectFormation(formationId);
    renderFormations();
}
