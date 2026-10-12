// ============================================================
// UI/TABS.JS — Рендер вкладок: Техники и Достижения
// ============================================================

function _techSpeedBreakdown(techId) {
    const tech = TECHNIQUES.find(t => t.id === techId);
    if (!tech) return "";
    const parts = [];
    const spiritMult = 1 + game.spirit * 0.02;
    parts.push(`Дух: x${spiritMult.toFixed(2)}`);
    const formB = game.getFormationBonus("techXpSpeed");
    if (formB > 0) parts.push(`Формация: +${Math.round(formB * 100)}%`);
    const techB = game.getTechBonus("techXpSpeed");
    if (techB > 0) parts.push(`Техники: +${Math.round(techB * 100)}%`);
    const artB = game.getArtifactBonus("techXpSpeed") * 0.01;
    if (artB > 0) parts.push(`Артефакт: +${Math.round(artB * 100)}%`);
    const sectB = game.getSectBonus("techXpSpeed");
    if (sectB > 0) parts.push(`Секта: +${Math.round(sectB * 100)}%`);
    const hasAffinity = tech.element && game.spiritualRoot?.elements?.includes(tech.element);
    if (hasAffinity) parts.push(`Сродство: x1.5`);
    const perks = game.getActiveBodyPerks();
    const freeLevel = perks.freeUpgradeLevel || 0;
    const talent = (game.prestige.karmaUpgrades.talent || 0) + freeLevel;
    if (talent > 0) parts.push(`Талант: +${talent * 10}%`);
    return parts.join(" · ");
}

// === ТЕХНИКИ TAB ===
function renderTechniques() {
    if (deferUIRender(renderTechniques)) return;
    const container = document.getElementById("techniques-list");
    if (!container) return;
    container.innerHTML = "";

    if (game.techniques.length === 0) {
        container.innerHTML = '<p class="empty-msg">У вас пока нет изученных техник. Они появятся через события.</p>';
        return;
    }

    // Слоты + эссенция
    const maxSlots = game.getMaxTechSlots();
    const usedSlots = game.equippedTechniques.length;
    const countInfo = document.createElement("p");
    countInfo.className = "slots-info";
    countInfo.innerHTML = `Слоты: <b>${usedSlots}/${maxSlots}</b> | Изучено: ${game.techniques.length} | <span style="color:#c89aff">\u2726</span> Эссенция Дао: <span style="color:#c89aff">${game.daoEssence}</span>`;
    countInfo.title = "Карточки показывают полный эффект каждой техники. Для каждого эффекта бонусы сортируются: сильнейший 100%, затем 60%, 40%, 25%, остальные 15%. Только экипированные техники действуют и получают XP.";
    container.appendChild(countInfo);

    // Свиток Озарения
    const insightDiv = document.createElement("div");
    insightDiv.className = "insight-section";
    const iCost = game.getInsightCost();
    const bulkPurchase = game.getInsightPurchaseInfo(10);
    const canBuy10 = game.canBuyInsight(10);
    insightDiv.innerHTML = `
        <button id="btn-insight" class="btn btn-small btn-secondary" onclick="game.buyInsight(); renderTechniques();" ${game.canBuyInsight() ? "" : "disabled"}>Свиток Озарения (${iCost} эсс.)</button>
        <button id="btn-insight-multi10" class="btn btn-small btn-secondary" onclick="game.buyInsight(10); renderTechniques();" ${canBuy10 ? "" : "disabled"} title="${bulkPurchase.count} ${_plural(bulkPurchase.count, 'озарение', 'озарения', 'озарений')}: ${bulkPurchase.cost} эссенции">До 10</button>
        <span id="tip-insight" class="insight-tip">Сразу +10% XP текущего уровня экипированным техникам. Цена растёт (исп.: ${game._insightUses || 0}).</span>
    `;
    container.appendChild(insightDiv);

    const tierNames = { common: "Смертная", uncommon: "Духовная", rare: "Мистическая", epic: "Небесная", legendary: "Священная", divine: "Божественная" };
    const tierOrder = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, divine: 5 };

    // Сортировка: экипированные первыми, внутри — по рарности (высокая выше)
    const sorted = [...game.techniques].sort((a, b) => {
        const eqA = game.isTechEquipped(a) ? 0 : 1;
        const eqB = game.isTechEquipped(b) ? 0 : 1;
        if (eqA !== eqB) return eqA - eqB;
        const tA = TECHNIQUES.find(t => t.id === a);
        const tB = TECHNIQUES.find(t => t.id === b);
        return (tierOrder[tB?.tier] || 0) - (tierOrder[tA?.tier] || 0);
    });

    for (const techId of sorted) {
        const tech = TECHNIQUES.find(t => t.id === techId);
        if (!tech) continue;
        const level = game.techLevels[techId] || 1;
        const atMax = level >= tech.maxLevel;
        const isEquipped = game.isTechEquipped(techId);

        // XP прогресс
        const currentXP = game.techXP[techId] || 0;
        const neededXP = game.techXpNeeded(techId);
        const xpPct = atMax ? 100 : Math.min(100, (currentXP / neededXP) * 100);
        const xpSpeed = game.techXpPerTick(techId);

        const card = document.createElement("div");
        card.className = `tech-card tech-${tech.tier}${isEquipped ? "" : " tech-unequipped"}`;
        card.id = `tech-card-${techId}`;
        card.dataset.lastLevel = level;

        // Элементный индикатор
        const elemData = tech.element ? ELEMENTS.find(e => e.id === tech.element) : null;
        const elemHtml = elemData
            ? `<span class="tech-elem-icon" title="Элемент: ${elemData.name}">${elemData.icon}</span> `
            : "";
        const hasAffinity = tech.element && game.spiritualRoot?.elements?.includes(tech.element);

        // Ascend info — компактная кнопка
        const ascendInfo = game.getTechAscendInfo(techId);
        let ascendHtml = "";
        if (ascendInfo && isEquipped && atMax) {
            const canAfford = game.daoEssence >= ascendInfo.essence;
            if (ascendInfo.locked) {
                const realmName = REALMS[ascendInfo.realmReq] ? REALMS[ascendInfo.realmReq].name : "ступень " + ascendInfo.realmReq;
                const reason = ascendInfo.insightPending ? "Дождитесь завершения озарения"
                    : ascendInfo.eraLocked ? `Достигните эпохи «${ERAS.find(era => era.id === ascendInfo.eraReq)?.name || ascendInfo.eraReq}»`
                    : `Вознесение доступно с «${realmName}»`;
                ascendHtml = `<span class="tech-ascend-inline ascend-locked stat-with-tip">\uD83D\uDD12<span class="stat-tip">${reason}</span></span>`;
            } else {
                ascendHtml = `<span class="tech-ascend-inline stat-with-tip"><button class="btn btn-tiny btn-ascend" onclick="event.stopPropagation();ascendTechniqueUI('${techId}')" ${canAfford ? "" : "disabled"}>\u2728</button><span class="stat-tip">Вознести \u2192 ${tierNames[ascendInfo.to]} (${ascendInfo.essence} \u2726)</span></span>`;
            }
        }

        // Кнопка экипировки
        let equipBtnHtml;
        if (isEquipped) {
            equipBtnHtml = `<button class="btn btn-tiny btn-unequip" onclick="event.stopPropagation();toggleTechEquip('${techId}')" title="Снять">\u2716</button>`;
        } else {
            const canEquip = usedSlots < maxSlots;
            equipBtnHtml = `<button class="btn btn-tiny btn-equip" onclick="event.stopPropagation();toggleTechEquip('${techId}')" ${canEquip ? "" : "disabled"} title="${canEquip ? "Экипировать" : "Нет свободных слотов"}">\u2714</button>`;
        }

        // XP текст для нижней строки
        let xpText;
        if (atMax) {
            xpText = `<span class="tech-xp-max">МАКС</span>`;
        } else if (isEquipped) {
            xpText = `<span class="tech-xp-nums">${Math.floor(currentXP)}/${neededXP}</span> <span class="tech-xp-speed stat-with-tip">+${xpSpeed.toFixed(1)}/с<span class="stat-tip tech-speed-tip">${_techSpeedBreakdown(techId)}</span></span>`;
        } else {
            xpText = `<span class="tech-xp-nums">${Math.floor(currentXP)}/${neededXP}</span> <span class="tech-paused">\u23F8</span>`;
        }

        card.innerHTML = `
            <div class="tech-row-top">
                <span class="tech-name stat-with-tip">${elemHtml}${tech.name}${(() => { if (!game.techAscendedTiers || !game.techAscendedTiers[techId]) return ""; const to = ["uncommon","rare","epic","legendary","divine"]; const idx = to.indexOf(game.techAscendedTiers[techId]); return " " + "\u2728".repeat(idx + 1); })()}${hasAffinity ? " \u2605" : ""}<span class="stat-tip tech-desc-tip">${tech.description}</span></span>
                <span class="tech-row-meta">
                    ${ascendHtml}
                    <span class="tech-level">Ур.${level}/${tech.maxLevel}</span>
                    <span class="tech-tier">${tierNames[tech.tier]}</span>
                    ${equipBtnHtml}
                </span>
            </div>
            <div class="tech-row-bottom">
                <span class="tech-effects-inline">${formatTechEffects(tech, level, hasAffinity)}</span>
                <span class="tech-xp-inline">${xpText}</span>
            </div>
            ${!atMax ? `<div class="tech-xp-strip"><div class="tech-xp-bar tech-xp-${tech.tier}" style="width:${xpPct}%"></div></div>` : ""}
        `;
        container.appendChild(card);
    }
}

function toggleTechEquip(techId) {
    if (game.isTechEquipped(techId)) {
        game.unequipTechnique(techId);
    } else {
        game.equipTechnique(techId);
    }
    renderTechniques();
    updateUI();
}

function formatTechEffects(tech, level, hasAffinity) {
    const parts = [];
    for (const key of Object.keys(tech.effects)) {
        const total = game.getTechniqueEffectBonus(tech, key, level);
        const names = {
            qi: "Ци",
            strength: "Множитель силы для ци",
            combatPower: "Боевая мощь",
            qiRetention: "Удержание ци",
            lifespan: "Долголетие",
            breakthroughBonus: "Шанс прорыва",
            luck: "Удача",
            spirit: "Множитель духа для ци",
            timeSpeed: "Скорость времени",
            statXpSpeed: "Совершенствование",
            techXpSpeed: "Скорость техник",
            daoSpeed: "Скорость Дао"
        };
        if (key === "luck") {
            parts.push(`+${total.toFixed(2)}% шанс прорыва от удачи`);
        } else if (key === "combatPower") {
            parts.push(`×${(1 + total).toFixed(2)} ${names[key]}`);
        } else {
            parts.push(`+${(total * 100).toFixed(0)}% ${names[key] || key}`);
        }
    }
    return parts.join(" | ");
}

function ascendTechniqueUI(techId) {
    const card = document.getElementById(`tech-card-${techId}`);
    const tech = TECHNIQUES.find(t => t.id === techId);
    if (!tech) return;

    const success = game.ascendTechnique(techId);
    if (success && card) {
        card.classList.add("ascend-anim");
        _spawnAscendParticles(card);
        setTimeout(() => {
            card.classList.remove("ascend-anim");
            renderTechniques();
            updateUI();
        }, 2000);
    } else {
        renderTechniques();
        updateUI();
    }
}

function _spawnAscendParticles(card) {
    const rect = card.getBoundingClientRect();
    const colors = ["#c89aff", "#ffe080", "#88ccff", "#ff88cc", "#ffffff"];
    for (let i = 0; i < 30; i++) {
        const particle = document.createElement("div");
        particle.className = "enhance-particle ascend-particle";
        particle.style.left = (rect.left + Math.random() * rect.width) + "px";
        particle.style.top = (rect.top + rect.height) + "px";
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        particle.style.setProperty("--dx", ((Math.random() - 0.5) * 150) + "px");
        particle.style.setProperty("--dy", (-(50 + Math.random() * 120)) + "px");
        document.body.appendChild(particle);
        setTimeout(() => particle.remove(), 1500);
    }
}

// === ДОСТИЖЕНИЯ TAB ===
function renderMilestones() {
    if (deferUIRender(renderMilestones)) return;
    const container = document.getElementById("milestones-list");
    if (!container) return;
    container.innerHTML = "";

    const achievedCount = game.milestones.filter(id => MILESTONES.some(m => m.id === id)).length;
    const total = MILESTONES.length;
    const counter = document.createElement("p");
    counter.className = "mile-counter";
    counter.textContent = `Достижения: ${achievedCount} / ${total}`;
    container.appendChild(counter);

    // Тир-фильтры
    const tierCounts = {};
    for (const m of MILESTONES) {
        const t = m.tier || "bronze";
        if (!tierCounts[t]) tierCounts[t] = { total: 0, done: 0 };
        tierCounts[t].total++;
        if (game.milestones.includes(m.id)) tierCounts[t].done++;
    }
    const filterDiv = document.createElement("div");
    filterDiv.className = "mile-tier-filters";
    filterDiv.innerHTML = `<button class="mile-filter active" data-tier="all">Все (${achievedCount}/${total})</button>` +
        Object.entries(MILESTONE_TIERS).map(([tid, t]) => {
            const c = tierCounts[tid] || { done: 0, total: 0 };
            return `<button class="mile-filter" data-tier="${tid}" style="color:${t.color}">${t.name} (${c.done}/${c.total})</button>`;
        }).join("");
    container.appendChild(filterDiv);

    filterDiv.addEventListener("click", (e) => {
        const btn = e.target.closest(".mile-filter");
        if (!btn) return;
        filterDiv.querySelectorAll(".mile-filter").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const tier = btn.dataset.tier;
        container.querySelectorAll(".mile-category-section").forEach(sec => {
            sec.querySelectorAll(".mile-item").forEach(item => {
                item.style.display = (tier === "all" || item.dataset.tier === tier) ? "" : "none";
            });
            const visible = sec.querySelectorAll(".mile-item:not([style*='display: none'])");
            sec.style.display = visible.length > 0 ? "" : "none";
        });
    });

    // Группировка по категориям
    const categories = {};
    for (const m of MILESTONES) {
        const cat = m.category || "cultivation";
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(m);
    }

    for (const [catId, catInfo] of Object.entries(MILESTONE_CATEGORIES)) {
        const milestones = categories[catId];
        if (!milestones || milestones.length === 0) continue;

        const section = document.createElement("div");
        section.className = "mile-category-section";

        const header = document.createElement("div");
        header.className = "mile-category-header";
        const catDone = milestones.filter(m => game.milestones.includes(m.id)).length;
        header.innerHTML = `<span class="mile-cat-icon">${catInfo.icon}</span> ${catInfo.name} <span class="mile-cat-count">(${catDone}/${milestones.length})</span>`;
        section.appendChild(header);

        for (const m of milestones) {
            const done = game.milestones.includes(m.id);
            const tierInfo = MILESTONE_TIERS[m.tier] || MILESTONE_TIERS.bronze;
            const item = document.createElement("div");
            item.className = `mile-item ${done ? "achieved" : "locked"}`;
            item.dataset.tier = m.tier || "bronze";
            item.innerHTML = `
                <span class="mile-icon" style="color:${done ? tierInfo.color : '#333'}">${done ? tierInfo.icon : "?"}</span>
                <div class="mile-text">
                    <div class="mile-name">${done ? m.name : (m.category === "secret" ? "???" : m.name)}</div>
                    <div class="mile-desc">${done ? m.description : (m.category === "secret" ? "Ещё не открыто" : m.description)}</div>
                </div>
                <span class="mile-tier-badge" style="color:${tierInfo.color}">${tierInfo.name.charAt(0)}</span>
            `;
            section.appendChild(item);
        }
        container.appendChild(section);
    }
}
