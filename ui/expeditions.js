// Походы: лор, виды добычи и условия отправления без подробной сводки наград.

function _artifactTierName(tier) {
    return ({ common: "смертного", uncommon: "духовного", rare: "мистического", epic: "небесного", legendary: "священного", divine: "божественного" })[tier] || tier;
}

function _artifactTierNameNom(tier) {
    return ({ common: "смертный", uncommon: "духовный", rare: "мистический", epic: "небесный", legendary: "священный", divine: "божественный" })[tier] || tier;
}

function _v2ExpeditionLore(description) {
    const sentences = description.match(/^.*?[.!?](?=\s|$)/)?.[0] || description;
    return sentences.length > 190 ? sentences.slice(0, 187).replace(/\s+\S*$/, "") + "…" : sentences;
}

function _v2ExpeditionTier(tier, genitive = false) {
    return `<b class="art-tier-${tier}">${genitive ? _artifactTierName(tier) : _artifactTierNameNom(tier)}</b>`;
}

function _v2ExpeditionLastRewardHtml(reward) {
    const text = String(reward);
    const types = [
        ["scrolls", /свиток|свитк/i], ["stones", /^\+?\d+(?:[.,]\d+)?\s+кам/i],
        ["essence", /^\+?\d+(?:[.,]\d+)?\s+эссенц/i], ["dust", /^\+?\d+(?:[.,]\d+)?\s+пыл/i],
        ["pills", /^\+?\d+(?:[.,]\d+)?\s+пилю/i], ["dao", /постижение\s+Дао|опыт\s+пути\s+секты/i]
    ];
    const type = /артефакт|техника:/i.test(text) ? null : types.find(([, pattern]) => pattern.test(text))?.[0];
    const escaped = text.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
    return `<span class="v2-expedition-result${type ? ` v2-resource-${type}` : ""}">${escaped}</span>`;
}

function renderExpeditions() {
    if (deferUIRender(renderExpeditions)) return;
    const container = document.getElementById("expeditions-list");
    if (!container) return;
    container.innerHTML = "";

    const guide = document.createElement("p");
    guide.className = "v2-section-intro";
    guide.textContent = "Медитация приостановлена на время похода. Успешное возвращение даёт ци за опыт царства. При провале добыча и плата за вход потеряны.";
    container.appendChild(guide);

    if (game.expedition) {
        const loc = LOCATIONS.find(l => l.id === game.expedition.locationId);
        if (loc) {
            const pct = (game.getExpeditionProgress() * 100).toFixed(0);
            const timeLeft = game.getExpeditionTimeLeft();
            const failChance = game.getExpeditionFailChance();
            const activeDiv = document.createElement("div");
            activeDiv.className = "expedition-active";
            activeDiv.style.borderColor = loc.color;
            activeDiv.innerHTML = `
                <div class="expedition-header"><span class="expedition-active-name" style="color:${loc.color}">${game.getLocationName(loc.id)}</span><span class="expedition-in-progress">В пути</span></div>
                <span class="expedition-danger ${failChance > 0 ? "expedition-risky" : "expedition-safe"}">Риск: ${(failChance * 100).toFixed(1)}%/год</span>
                <div class="expedition-bar-container">
                    <div class="expedition-bar" style="width:${pct}%; background:${loc.color}"></div>
                    <span class="expedition-bar-text">${pct}% — осталось ${timeLeft} ${_plural(timeLeft, "год", "года", "лет")}</span>
                </div>`;
            container.appendChild(activeDiv);
        }
    }

    if (game.lastExpeditionReward && !game.expedition) {
        const lr = game.lastExpeditionReward;
        const lastDiv = document.createElement("div");
        lastDiv.className = "expedition-last-reward";
        lastDiv.innerHTML = `<div class="expedition-last-header">Последний поход: ${lr.locationName} (год ${lr.year})</div><div class="expedition-last-items">${lr.rewards.map(_v2ExpeditionLastRewardHtml).join("")}</div>`;
        container.appendChild(lastDiv);
    }

    const header = document.createElement("h3");
    header.textContent = game.expedition ? "Другие походы" : "Куда отправиться";
    container.appendChild(header);

    if (game.getActiveBodyPerks().autoExpedition) {
        const autoEnabled = game._autoExpeditionEnabled !== false;
        const autoBtn = document.createElement("button");
        autoBtn.className = `btn btn-small ${autoEnabled ? "btn-primary" : "btn-secondary"}`;
        autoBtn.textContent = autoEnabled ? "Автоматические походы: включены" : "Автоматические походы: выключены";
        autoBtn.title = "После возвращения вы снова отправитесь в последнее выбранное царство, если сможете оплатить вход и выполнить требования. Медитация будет прерываться.";
        autoBtn.onclick = () => {
            game._autoExpeditionEnabled = !autoEnabled;
            renderExpeditions();
        };
        container.appendChild(autoBtn);
    }

    const sorted = [...LOCATIONS].sort((a, b) => a.minRealm - b.minRealm);
    let shownNextLocked = false;
    const grid = document.createElement("div");
    grid.className = "v2-expedition-grid";
    container.appendChild(grid);

    for (const loc of sorted) {
        const locName = game.getLocationName(loc.id);
        const locDesc = game.getLocationDescription(loc.id);
        if (game.realmIndex < loc.minRealm) {
            if (shownNextLocked) continue;
            shownNextLocked = true;
            const card = document.createElement("div");
            card.className = "expedition-card expedition-locked";
            card.dataset.location = loc.id;
            card.innerHTML = `${renderSceneryImage(getExpeditionScenery(loc.id, game.ascendedLocations[loc.id] || 0, game.sect?.id), "expedition-scenery")}<div class="expedition-header"><span class="expedition-name">${locName}</span></div><p class="expedition-desc v2-expedition-lore">${_v2ExpeditionLore(locDesc)}</p><div class="expedition-req">Откроется на ступени «${REALMS[loc.minRealm]?.name || loc.minRealm}»</div>`;
            grid.appendChild(card);
            continue;
        }

        const isActive = game.expedition?.locationId === loc.id;
        const canStart = game.canStartExpedition(loc.id);
        const duration = game.getExpeditionDuration(loc);
        const ascTier = game.ascendedLocations[loc.id] || 0;
        const entryCost = (loc.entryCost || 0) * (ascTier >= 2 ? 3 : ascTier >= 1 ? 2 : 1);
        const power = game.getCombatPower();
        const danger = game.getEffectiveDangerLevel(loc);
        const failPerYear = danger > power && danger > 0 ? Math.min(0.25, ((danger - power) / danger) * 0.30) : 0;
        const rankName = loc.requiresSectRank ? SECT_RANKS.find(rank => rank.id === loc.requiresSectRank)?.name || loc.requiresSectRank : "";
        const meetsSect = !loc.requiresSectRank || (game.sect && game.getSectRankIndex() >= SECT_RANKS.findIndex(rank => rank.id === loc.requiresSectRank));
        const unmet = [];
        if (loc.combatCheck && power < loc.combatCheck) unmet.push(`Нужно ${loc.combatCheck} боевой мощи`);
        if (!meetsSect) unmet.push(`Нужен ранг «${rankName}»`);
        if (game.stones < entryCost) unmet.push("Не хватает камней");

        const r = loc.rewards;
        const mainRewards = [];
        for (const [key, label] of [
            ["stones", "Камни"], ["essence", "Эссенция"],
            ["dust", "Пыль"], ["pills", "Пилюли"]
        ]) {
            if (!r[key] || r[key].max <= 0) continue;
            mainRewards.push(`<span class="reward-item v2-resource-${key}">${label}</span>`);
        }
        const daoReward = game.getExpeditionDaoReward(loc);
        const cultivationReward = game.getExpeditionCultivationReward(loc);
        if (cultivationReward.qi > 0) {
            mainRewards.push(`<span class="reward-item v2-resource-qi" title="При успешном возвращении. Выдача ограничена свободным местом на шкале ци.">До ${Math.floor(cultivationReward.qi).toLocaleString("ru-RU")} ци</span>`);
        }
        if (daoReward.max > 0 && game.getDaoProgressRoom() > 0) {
            mainRewards.push('<span class="reward-item v2-resource-dao">Опыт Дао</span>');
        }

        let artifactPreview = "";
        if (r.artifactChance) {
            const reward = game.getExpeditionArtifactReward(loc);
            let tier = "";
            if (reward.minTier && reward.maxTier && reward.minTier !== reward.maxTier) tier = `${_v2ExpeditionTier(reward.minTier)} — ${_v2ExpeditionTier(reward.maxTier)}`;
            else if (reward.minTier && reward.minTier === reward.maxTier) tier = _v2ExpeditionTier(reward.minTier);
            else if (reward.maxTier) tier = `до ${_v2ExpeditionTier(reward.maxTier, true)}`;
            else if (reward.minTier) tier = `от ${_v2ExpeditionTier(reward.minTier, true)}`;
            if (tier) artifactPreview = `<div class="v2-expedition-artifact-preview">Артефакт: ${tier}</div>`;
        }
        const scrollReward = game.getExpeditionScrollReward(loc);
        if (scrollReward.guaranteed || scrollReward.chance) mainRewards.push('<span class="reward-item v2-resource-scrolls">Свитки заточки</span>');
        if (r.techniqueChance && game.getRewardTechniquePool().length) mainRewards.push('<span class="reward-item">Техники</span>');

        const card = document.createElement("div");
        card.className = `expedition-card${isActive ? " expedition-current" : ""}`;
        card.dataset.location = loc.id;
        card.style.borderColor = loc.color;
        card.innerHTML = `
            ${renderSceneryImage(getExpeditionScenery(loc.id, ascTier, game.sect?.id), "expedition-scenery")}
            <div class="expedition-header"><span class="expedition-name" style="color:${loc.color}">${locName}</span><span class="expedition-duration">${duration} ${_plural(duration, "год", "года", "лет")}</span></div>
            <p class="expedition-desc v2-expedition-lore">${_v2ExpeditionLore(locDesc)}</p>
            <div class="v2-expedition-facts">
                <span class="expedition-cost">Вход: <b class="v2-resource-stones">${entryCost ? `${entryCost} камней` : "бесплатно"}</b></span>
                <span class="expedition-danger ${failPerYear > 0 ? "expedition-risky" : "expedition-safe"}" title="Вероятность провала за каждый год похода; при провале добыча и плата за вход потеряны.">Риск: ${(failPerYear * 100).toFixed(1)}%/год</span>
            </div>
            <div class="expedition-rewards v2-expedition-main-rewards">${mainRewards.join("")}</div>
            ${artifactPreview}
            ${unmet.length ? `<div class="expedition-req">${unmet.join(" · ")}</div>` : ""}
            <div class="v2-expedition-footer">
                <div class="expedition-actions">${isActive ? '<span class="expedition-in-progress">В пути…</span>' : canStart ? `<button class="btn btn-small btn-primary" onclick="startExpeditionUI('${loc.id}')">Отправиться</button>` : game.expedition ? '<span class="expedition-busy">Уже в походе</span>' : '<span class="expedition-unavailable">Недоступно</span>'}</div>
            </div>`;
        grid.appendChild(card);
    }
}

function startExpeditionUI(locationId) {
    game.startExpedition(locationId);
    renderExpeditions();
}

function ascendLocationUI(locationId) {
    if (game.ascendLocation(locationId)) renderExpeditions();
}
