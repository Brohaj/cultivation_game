// ============================================================
// UI/UPDATE.JS — Основное обновление интерфейса, табы, прогресс-бары
// ============================================================

// Не заменять DOM между нажатием и отпусканием кнопки: браузер иначе теряет click.
const _uiHeldControls = new Set();
const _deferredUIRenders = new Set();
let _uiReleaseTimer = null;

function deferUIRender(render) {
    if (_uiHeldControls.size === 0 && _uiReleaseTimer === null) return false;
    _deferredUIRenders.add(render);
    return true;
}

function beginUIInteraction(token) {
    if (_uiReleaseTimer !== null) clearTimeout(_uiReleaseTimer);
    _uiReleaseTimer = null;
    _uiHeldControls.add(token);
}

function endUIInteraction(token) {
    const held = _uiHeldControls.delete(token);
    if (!held && token !== null) return;
    if (_uiHeldControls.size > 0 || _uiReleaseTimer !== null) return;
    // click следует за pointerup/keyup в том же событии браузера.
    _uiReleaseTimer = setTimeout(() => {
        _uiReleaseTimer = null;
        const renders = [..._deferredUIRenders];
        _deferredUIRenders.clear();
        for (const render of renders) render();
    }, 0);
}

function _statSpeedBreakdown(stat) {
    const level = game[stat] || 1;
    const parts = [`База: 1.0`];
    const levelMult = Math.pow(level, 0.7);
    parts.push(`Ур.${level}: x${levelMult.toFixed(2)}`);
    const realmMult = 1 + game.realmIndex * 0.15;
    if (game.realmIndex > 0) parts.push(`Ступень ${game.realmIndex}: x${realmMult.toFixed(2)}`);
    parts.push("Совершенствование усиливает дух и медитацию; скорость тренировки статов не меняет");
    return parts.join(" | ");
}

// === ТАБЫ ===
function switchTab(tabId) {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    document.querySelector(`.tab-btn[data-tab="${tabId}"]`)?.classList.add("active");
    document.getElementById(`tab-${tabId}`)?.classList.add("active");

    if (tabId === "techniques") renderTechniques();
    if (tabId === "milestones") renderMilestones();
    if (tabId === "artifacts") renderArtifacts();
    if (tabId === "sect") renderSects();
    if (tabId === "expeditions" || game.expedition || game._expeditionJustEnded) {
        renderExpeditions();
        game._expeditionJustEnded = false;
    }
    if (tabId === "adventures") renderAdventures();
}

// === ЛЁГКОЕ ОБНОВЛЕНИЕ (каждый тик, 200ms) ===
// Только то, что реально меняется каждый тик: ци, прогресс-бары, экспедиция
function updateTickUI() {
    if (deferUIRender(updateTickUI)) return;
    const isMeditation = game.currentActivity === "meditation";
    const statMap = { body: "strength", dao: "spirit", fate: "luck" };
    const statNameMap = { strength: "Сила", spirit: "Дух", luck: "Удача" };
    const activeStat = statMap[game.currentActivity];

    const titleEl = document.getElementById("main-progress-title");
    const qiBar = document.getElementById("qi-bar");
    const qiText = document.getElementById("qi-text");
    const medSection = document.getElementById("main-progress-meditation");
    const statSection = document.getElementById("main-progress-stat");

    if (isMeditation) {
        // Режим ци
        const needed = game.qiNeeded();
        const pct = needed === Infinity ? 0 : Math.min(100, (game.qi / needed) * 100);
        if (titleEl) titleEl.textContent = game.expedition ? "Ци — медитация приостановлена" : "Ци";
        qiBar.style.width = pct + "%";
        qiBar.className = "qi-bar";
        qiText.textContent = needed === Infinity ? `${Math.floor(game.qi)}` : `${Math.floor(game.qi)} / ${needed}`;
        document.getElementById("qi-rate").textContent = game.expedition ? 0 : game.qiPerSec();
        if (medSection) medSection.style.display = "";
        if (statSection) statSection.style.display = "none";
    } else if (activeStat) {
        // Режим стата
        const needed = game.statXpNeeded(activeStat);
        const current = game.activityXP[activeStat] || 0;
        const pct = Math.min(100, (current / needed) * 100);
        const statName = statNameMap[activeStat];
        if (titleEl) titleEl.textContent = `${statName} (ур. ${game[activeStat]})`;
        qiBar.style.width = pct + "%";
        qiBar.className = `qi-bar bar-${activeStat === "strength" ? "strength" : activeStat === "spirit" ? "spirit" : "luck"}`;
        qiText.textContent = `${Math.floor(current)} / ${needed} XP`;
        if (medSection) medSection.style.display = "none";
        if (statSection) statSection.style.display = "";

        const speedEl = document.getElementById("stat-progress-speed");
        const breakdownEl = document.getElementById("stat-progress-breakdown");
        if (speedEl) {
            const speed = game.statXpPerTick(activeStat);
            speedEl.textContent = `+${speed.toFixed(1)} XP/сек`;
        }
        if (breakdownEl) {
            breakdownEl.textContent = _statSpeedBreakdown(activeStat);
        }
    }

    // Таймер до смерти
    const deathTimerRow = document.getElementById("death-timer-row");
    const deathTimerEl = document.getElementById("death-timer");
    if (deathTimerRow && deathTimerEl && game._showDeathTimer) {
        const maxAge = game.maxAge();
        const charAge = game.characterAge();
        if (maxAge !== Infinity && charAge < maxAge) {
            const totalSpeed = game.getSpeedMultiplier() * (game.debugSpeed || 1);
            const yearDuration = 5 / totalSpeed; // секунд на 1 год
            const elapsed = (Date.now() - (game._lastYearTime || Date.now())) / 1000;
            const fractionalYear = Math.min(elapsed / yearDuration, 1);
            const yearsLeft = maxAge - charAge - fractionalYear;
            const secsLeft = Math.max(0, yearsLeft * yearDuration);
            const h = Math.floor(secsLeft / 3600);
            const m = Math.floor((secsLeft % 3600) / 60);
            const s = Math.floor(secsLeft % 60);
            deathTimerEl.textContent = `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
            deathTimerRow.style.display = "";
        } else {
            deathTimerRow.style.display = "none";
        }
    } else if (deathTimerRow) {
        deathTimerRow.style.display = "none";
    }

    // Дао бар
    const daoSection = document.getElementById("dao-bar-section");
    if (daoSection) {
        if (game.realmIndex >= 3 && game.sect) {
            daoSection.style.display = "";
            const sect = SECTS.find(s => s.id === game.sect.id);
            const daoNeeded = game.daoNeeded();
            const daoPct = Math.min(100, (game.daoProgress / daoNeeded) * 100);
            const daoBar = document.getElementById("dao-bar");
            const daoText = document.getElementById("dao-text");
            if (daoBar) {
                daoBar.style.width = daoPct + "%";
                if (sect) daoBar.style.background = `linear-gradient(90deg, ${sect.color}88, ${sect.color})`;
            }
            if (daoText) {
                const daoLabel = sect ? (sect.daoDisplayName || "Дао") : "Дао";
                const daoPath = sect ? sect.daoPath : null;
                const rankNames = daoPath && typeof DAO_RANK_NAMES !== "undefined" && DAO_RANK_NAMES[daoPath] ? DAO_RANK_NAMES[daoPath] : null;
                const rankName = rankNames && game.daoLevel > 0 ? rankNames[Math.min(game.daoLevel - 1, rankNames.length - 1)] : null;
                const breakthroughsSinceDao = (game.realmIndex - 3) * SUB_LEVELS + (game.subLevel - 1);
                const requiredDao = breakthroughsSinceDao + 1;
                const daoReady = game.daoLevel >= requiredDao;
                const reqText = daoReady ? "" : ` | Прорыв: ${game.daoLevel}/${requiredDao}`;
                const rankText = rankName ? ` «${rankName}»` : "";
                daoText.textContent = `${daoLabel}${rankText}: ${Math.floor(game.daoProgress)}/${daoNeeded} (Ур. ${game.daoLevel}${reqText})`;

                // Описание уровня Дао под баром
                const daoDescEl = document.getElementById("dao-desc");
                if (daoDescEl) {
                    const levelDescsUI = daoPath && typeof DAO_LEVEL_DESCRIPTIONS !== "undefined" && DAO_LEVEL_DESCRIPTIONS[daoPath] ? DAO_LEVEL_DESCRIPTIONS[daoPath] : null;
                    if (game.daoLevel > 0 && levelDescsUI) {
                        daoDescEl.textContent = levelDescsUI[Math.min(game.daoLevel - 1, levelDescsUI.length - 1)];
                        daoDescEl.style.display = "";
                    } else {
                        daoDescEl.textContent = "Постижение ещё не началось. Тренируйтесь на активности секты.";
                        daoDescEl.style.display = "";
                    }
                }

                // Тултип Дао
                const activityNames = { dao: "Постижение Дао", body: "Закалка Тела", fate: "Испытание Судьбы" };
                const daoAct = sect.daoActivity;
                let actText;
                if (sect.id === "hidden_hermit") {
                    actText = "Любая тренировка (×0.5)";
                } else if (Array.isArray(daoAct)) {
                    actText = daoAct.map(a => activityNames[a] || a).join(" / ");
                } else {
                    actText = activityNames[daoAct] || daoAct;
                }
                const daoSpeedMult = game.getDaoSpeedMultiplier();
                const trainingMult = 1 + game.getTechBonus("techXpSpeed") + game.getArtifactBonus("techXpSpeed") * 0.01 + game.getFormationBonus("techXpSpeed");
                const daoPerYear = (3 * trainingMult * daoSpeedMult * (sect.id === "hidden_hermit" ? 0.5 : 1)).toFixed(1);
                const tipDaoBar = document.getElementById("tip-dao-bar");
                if (tipDaoBar) {
                    let tip = `Активность: ${actText} (+${daoPerYear}/год)`;
                    if (daoSpeedMult > 1) tip += ` | Скорость: ×${daoSpeedMult.toFixed(2)}`;
                    tipDaoBar.textContent = tip;
                }
            }
        } else {
            daoSection.style.display = "none";
        }
    }

    // Кнопки ци
    const btBtn = document.getElementById("btn-breakthrough");
    const tipBt = document.getElementById("tip-breakthrough");
    btBtn.disabled = !game.canBreakthrough();
    // Подсказка: нужно постижение Дао для смены реалма 3+
    if (game.canBreakthrough() && game.realmIndex >= 3) {
        if (!game.sect) {
            btBtn.disabled = true;
            if (tipBt) { tipBt.textContent = "Нужно вступить в секту для прорыва"; tipBt.style.display = ""; }
        } else {
            const breakthroughsSinceDao = (game.realmIndex - 3) * SUB_LEVELS + (game.subLevel - 1);
            const requiredDao = breakthroughsSinceDao + 1;
            if (game.daoLevel < requiredDao) {
                btBtn.disabled = true;
                if (tipBt) { tipBt.textContent = `Нужен ${requiredDao} ур. Дао (сейчас ${game.daoLevel})`; tipBt.style.display = ""; }
            } else {
                if (tipBt) tipBt.style.display = "none";
            }
        }
    } else {
        if (tipBt) tipBt.style.display = "none";
    }
    // Бейдж "прорыв доступен" на табе Культивация
    const btBadge = document.getElementById("breakthrough-badge");
    if (btBadge) {
        btBadge.style.display = !btBtn.disabled ? "" : "none";
    }
    // === ПИЛЮЛИ (таблица) ===
    const pillTable = document.getElementById("pill-table");
    if (pillTable) {
        // Кнопка авто-рефайна (Архиалхимик ★3)
        const autoRefinePerks = game.getActiveBodyPerks();
        let autoRefineHtml = "";
        if (autoRefinePerks.autoRefine) {
            const on = game._autoRefineEnabled !== false;
            autoRefineHtml = `<button class="btn btn-tiny ${on ? "btn-primary" : "btn-secondary"}" onclick="game._autoRefineEnabled = ${!on}; updateTickUI();" title="Автоматически переплавлять пилюли каждый год">${on ? "\u2699 Авто-рефайн: ВКЛ" : "\u2699 Авто-рефайн: ВЫКЛ"}</button>`;
        }

        const r2 = game.refinedPills || 0;
        const r3 = game.spiritualPills || 0;
        const r4 = game.heavenlyPills || 0;
        const rc = game.getRefineCount();
        const _qiN = game.qiNeeded();

        // Бонусы пилюль (для тултипов)
        const _pmParts = [];
        const _pmSect = game.getSectBonus("pillEffect");
        const _pmArt = game.getArtifactBonus("pillEffect") * 0.01;
        const _pmForm = game.getFormationBonus("pillEffect");
        const _pmFormReal = _pmForm;
        if (_pmSect > 0) _pmParts.push(`Секта +${Math.round(_pmSect * 100)}%`);
        if (_pmArt > 0) _pmParts.push(`Артефакт +${Math.round(_pmArt * 100)}%`);
        if (_pmFormReal > 0) _pmParts.push(`Печь +${Math.round(_pmFormReal * 100)}%`);
        if (game.worldEvent?.modifiers?.pillEffect) _pmParts.push(`Событие ×${game.worldEvent.modifiers.pillEffect}`);
        const _pmText = _pmParts.length > 0 ? ` | ${_pmParts.join(", ")}` : "";

        // Тултипы по тирам
        const daoGain = game.realmIndex >= 3 && game.sect ? Math.floor(game.daoNeeded() * 0.08) : 0;
        const pillBt = (game.flags && game.flags._pillBreakthroughBonus) || 0;
        const tips = {
            1: `+${game.getPillQi(1)} ци${_pmText}`,
            2: `+${game.getPillQi(2)} ци | Рефайн: ${rc} базовых + ${game.getRefineCost(1)} пыли${_pmText}`,
            3: `+${game.getPillQi(3)} ци + 8% дао${daoGain ? ` (+${daoGain})` : ""} + 5% прорыв${pillBt > 0 ? ` (накоплено +${(pillBt*100).toFixed(0)}%)` : ""} | Рефайн: ${rc} очищ. + ${game.getRefineCost(2)} пыли`,
            4: `+${game.getPillQi(4)} ци, +1 к наименьшему стату в этой жизни | Рефайн: ${rc} дух. + ${game.getRefineCost(3)} пыли`
        };

        const tiers = [
            { count: game.pills, tier: 1, name: "Пилюля Ци", cls: "", use: "game.usePill()", qi: game.getPillQi(1), extra: "", refTier: 1, refName: "Очищ.", refCount: game.pills },
            { count: r2, tier: 2, name: "Очищенная", cls: "pill-t2", use: "game.useRefinedPill()", qi: game.getPillQi(2), extra: "", refTier: 2, refName: "Дух.", refCount: r2 },
            { count: r3, tier: 3, name: "Духовная", cls: "pill-t3", use: "game.useSpiritualPill()", qi: game.getPillQi(3), extra: "+дао +прорыв", refTier: 3, refName: "Небесн.", refCount: r3 },
            { count: r4, tier: 4, name: "Небесная", cls: "pill-t4", use: "game.useHeavenlyPill()", qi: game.getPillQi(4), extra: "+1 стат", refTier: 0, refName: "", refCount: 0 }
        ];

        let rows = "";
        for (const t of tiers) {
            if (t.count <= 0 && t.tier > 1) continue;
            const extraText = t.extra ? ` <span class="pill-extra">${t.extra}</span>` : "";
            const tip = tips[t.tier] || "";

            // Кнопки использования: x1, x10, x100
            let useBtns = "";
            const amounts = [1, 10, 100];
            for (const n of amounts) {
                if (n > 1 && t.count < 2) continue;
                const qiFull = t.tier <= 2 && game.qi >= game.qiNeeded();
                const disabled = game.gameOver || qiFull || t.count < n ? "disabled" : "";
                const label = n === 1 ? `+${t.qi} ци${extraText}` : `\u00D7${n}`;
                useBtns += `<button class="btn btn-tiny btn-pill ${t.cls} ${n > 1 ? "pill-multi" : ""}" onclick="game.usePillMulti(${t.tier},${n});" ${disabled} title="${qiFull ? "Ци уже заполнена: сначала совершите прорыв" : tip}">${label}</button>`;
            }

            // Кнопки рефайна: x1, x10, x100
            let refBtns = "";
            if (t.refTier > 0 && t.refCount >= rc) {
                const req = t.refTier > 1 ? game.getRefineRequirement(t.refTier) : null;
                if (req) {
                    refBtns = `<button class="btn btn-tiny btn-secondary" disabled title="${req}">\uD83D\uDD12</button>`;
                } else {
                    const maxRef = Math.floor(t.refCount / rc);
                    const dustCost = game.getRefineCost(t.refTier);
                    const dustHave = game.artifactDust || 0;
                    for (const n of amounts) {
                        if (n > maxRef && n > 1) continue;
                        const totalDust = dustCost * n;
                        const refTip = `${rc * n} пилюль + ${totalDust} пыли${totalDust > dustHave ? ` (есть ${dustHave})` : ""} → ${n} ${t.refName}`;
                        const canN = game.canRefinePill(t.refTier) && maxRef >= n && dustHave >= totalDust;
                        const label = n === 1 ? `${rc}\u2192${t.refName}` : `\u00D7${n}`;
                        refBtns += `<button class="btn btn-tiny btn-secondary ${n > 1 ? "pill-multi" : ""}" onclick="game.refinePillMulti(${t.refTier},${n});" ${canN ? "" : "disabled"} title="${refTip}">${label}</button>`;
                    }
                }
            }

            rows += `<div class="pill-row" title="${tip}">
                <span class="pill-name ${t.cls}">${t.name}</span>
                <span class="pill-count">\u00D7${t.count}</span>
                <span class="pill-use-btns">${useBtns}</span>
                <span class="pill-refine">${refBtns}</span>
            </div>`;
        }
        const pillHtml = autoRefineHtml + rows;
        if (pillTable._renderedPillHTML !== pillHtml) {
            pillTable.innerHTML = pillHtml;
            pillTable._renderedPillHTML = pillHtml;
        }

        // Показать высшие пилюли в ресурсах
        const pillsHigher = document.getElementById("pills-higher");
        if (pillsHigher) {
            const parts = [];
            if (r2 > 0) parts.push(`${r2} очищ.`);
            if (r3 > 0) parts.push(`${r3} дух.`);
            if (r4 > 0) parts.push(`${r4} небесн.`);
            pillsHigher.textContent = parts.length > 0 ? ` (${parts.join(", ")})` : "";
        }
    }

    // Прогресс-бары активностей
    updateActivityBars();

    _updateInsightButtons();

    // Прогресс техник (если вкладка открыта)
    _updateTechXpBars();

    // Прогресс секты и экспедиции
    _updateSectMissionProgress();
    _updateExpeditionProgress();
    _updateAdventureProgress();
}

function _updateInsightButtons() {
    const btnInsight = document.getElementById("btn-insight");
    if (btnInsight) {
        const cost = game.getInsightCost();
        btnInsight.textContent = `Свиток Озарения (${cost} эссенции)`;
        btnInsight.disabled = !game.canBuyInsight();
    }
    const btnBulk = document.getElementById("btn-insight-multi10");
    if (btnBulk) {
        const purchase = game.getInsightPurchaseInfo(10);
        btnBulk.disabled = !game.canBuyInsight(10);
        btnBulk.textContent = "До 10";
        btnBulk.title = `${purchase.count} ${_plural(purchase.count, 'озарение', 'озарения', 'озарений')}: ${purchase.cost} эссенции`;
    }
}

function _updateTechXpBars() {
    for (const techId of game.techniques) {
        const card = document.getElementById(`tech-card-${techId}`);
        if (!card) return; // вкладка не открыта
        const tech = TECHNIQUES.find(t => t.id === techId);
        if (!tech) continue;
        const level = game.techLevels[techId] || 1;
        const atMax = level >= tech.maxLevel;
        const currentXP = game.techXP[techId] || 0;
        const neededXP = game.techXpNeeded(techId);
        const xpPct = atMax ? 100 : Math.min(100, (currentXP / neededXP) * 100);
        // XP strip bar
        const bar = card.querySelector(".tech-xp-bar");
        if (bar) bar.style.width = xpPct + "%";
        // XP числа
        const nums = card.querySelector(".tech-xp-nums");
        if (nums) nums.textContent = `${Math.floor(currentXP)}/${neededXP}`;
        // Уровень
        const lvlEl = card.querySelector(".tech-level");
        if (lvlEl) lvlEl.textContent = `Ур.${level}/${tech.maxLevel}`;
        // Скорость XP + тултип
        const speedEl = card.querySelector(".tech-xp-speed");
        if (speedEl && !atMax && game.isTechEquipped(techId)) {
            const tipEl = speedEl.querySelector(".tech-speed-tip");
            speedEl.childNodes[0].textContent = `+${game.techXpPerTick(techId).toFixed(1)}/с`;
            if (tipEl) tipEl.textContent = _techSpeedBreakdown(techId);
        }
        // Эффекты (пересчёт при смене уровня)
        const effectsEl = card.querySelector(".tech-effects-inline");
        if (effectsEl) {
            const hasAffinity = tech.element && game.spiritualRoot?.elements?.includes(tech.element);
            effectsEl.innerHTML = formatTechEffects(tech, level, hasAffinity);
        }
        // При макс уровне — полный ререндер чтобы показать вознесение
        if (atMax) {
            const prevLevel = card.dataset.lastLevel;
            if (prevLevel && parseInt(prevLevel) < level) {
                renderTechniques();
                return;
            }
        }
        card.dataset.lastLevel = level;
    }
}

// === ПОЛНОЕ ОБНОВЛЕНИЕ (вызывается из событий, НЕ из тика) ===
function updateUI() {
    if (deferUIRender(updateUI)) return;
    const realm = REALMS[game.realmIndex];

    // Имя культиватора
    const nameEl = document.getElementById("cultivator-name");
    if (nameEl) nameEl.textContent = game.name || "Культиватор";

    // Реалм и статы
    const realmEl = document.getElementById("realm");
    realmEl.textContent = `${realm.name} [${game.realmIndex}]`;
    realmEl.style.color = realm.color;
    document.getElementById("sub-realm").textContent = `${SUB_LEVEL_NAMES[game.subLevel - 1]} (${game.subLevel}/${SUB_LEVELS})`;
    const tipRealm = document.getElementById("tip-realm");
    if (tipRealm) {
        tipRealm.textContent = realm.desc || "";
    }
    const charAge = game.characterAge();
    const maxAge = game.maxAge();
    const yearsEl = document.getElementById("years");
    const maxAgeEl = document.getElementById("max-age");
    yearsEl.textContent = charAge;
    maxAgeEl.textContent = maxAge === Infinity ? "\u221E" : maxAge;
    const ageRow = yearsEl.closest(".stat");
    const maxAgeRow = maxAgeEl.closest(".stat");
    const ageTip = "Когда возраст достигнет предела — тело не выдержит. Перерождение неизбежно";
    if (ageRow) ageRow.title = ageTip;
    if (maxAgeRow) maxAgeRow.title = ageTip;

    // Тултип предела жизни (источники)
    const tipLifespan = document.getElementById("tip-lifespan");
    if (tipLifespan) {
        const cur = REALMS[game.realmIndex].maxAge;
        if (cur === Infinity) {
            tipLifespan.textContent = "Бессмертие. Время больше не властно над вами.";
        } else {
            const prev = game.realmIndex > 0 ? REALMS[game.realmIndex - 1].maxAge : cur;
            const subFraction = game.subLevel / SUB_LEVELS;
            const base = Math.floor(prev + (cur - prev) * subFraction);
            const techLife = game.getTechBonus("lifespan");
            const artLife = game.getArtifactBonus("lifespan") * 0.01;
            const totalBonus = techLife + artLife;
            const parts = [`Базовый: ${base} лет`];
            if (techLife > 0) parts.push(`Техника: +${Math.round(techLife * 100)}%`);
            if (artLife > 0) parts.push(`Артефакт: +${Math.round(artLife * 100)}%`);
            if (totalBonus > 0) parts.push(`Итого: ${base} × ${(1 + totalBonus).toFixed(2)} = ${maxAge}`);
            tipLifespan.textContent = parts.join(" | ");
        }
    }

    // Цветовая индикация возраста: жёлтый при >75%, красный при >90%, мигающий при смерти
    if (maxAge !== Infinity) {
        const agePct = charAge / maxAge;
        if (game.gameOver) {
            yearsEl.style.color = "#ff3333";
            yearsEl.classList.add("age-dead");
            maxAgeEl.style.color = "#ff3333";
        } else if (agePct >= 0.9) {
            yearsEl.style.color = "#ff4444";
            yearsEl.classList.remove("age-dead");
            maxAgeEl.style.color = "#ff4444";
        } else if (agePct >= 0.75) {
            yearsEl.style.color = "#eebb44";
            yearsEl.classList.remove("age-dead");
            maxAgeEl.style.color = "#eebb44";
        } else {
            yearsEl.style.color = "";
            yearsEl.classList.remove("age-dead");
            maxAgeEl.style.color = "";
        }
    } else {
        yearsEl.style.color = "";
        yearsEl.classList.remove("age-dead");
        maxAgeEl.style.color = "";
    }

    // Баннер смерти
    _updateDeathBanner();


    const artStr = game.getArtifactBonus("strength");
    const totalStr = game.strength + artStr;
    document.getElementById("strength").textContent = Math.floor(totalStr);
    const artSpi = game.getArtifactBonus("spirit");
    const totalSpi = game.spirit + artSpi;
    document.getElementById("spirit").textContent = Math.floor(totalSpi);
    const artLuck = game.getArtifactBonus("luck");
    const formLuck = game.getFormationBonus("luck");
    const totalLuck = game.luck + artLuck + formLuck;
    document.getElementById("luck").textContent = Math.floor(totalLuck);
    document.getElementById("combat-power").textContent = game.getCombatPower();

    // Совершенствование усиливает множитель духа для медитации.
    const perfBonus = game.getFormationBonus("statXpSpeed") + game.getSectBonus("statXpSpeed")
        + game.getArtifactBonus("statXpSpeed") * 0.01 + game.getTechBonus("statXpSpeed")
        + ((game.prestige.karmaUpgrades.statSpeed || 0) + (game.getActiveBodyPerks().freeUpgradeLevel || 0)) * 0.05;
    const perfText = perfBonus > 0 ? ` | Совершенствование духа: +${Math.round(softcap(perfBonus, 3, 0.5) * 100)}%` : "";

    // Тултипы статов
    const tipStr = document.getElementById("tip-strength");
    if (tipStr) {
        const strMult = game.getStrengthMultiplier();
        const cp = game.getCombatPower();
        const parts = [`База: ${game.strength}`];
        if (artStr > 0) parts.push(`Артефакт: +${artStr.toFixed(1)}`);
        parts.push(`Эффект: +${((strMult - 1) * 100).toFixed(0)}% ци`);
        parts.push(`Боевая мощь: ${cp}`);
        if (game.realmIndex >= 7) parts.push(game.realmIndex >= 10 ? "-2 при провале" : "-1 при провале");
        tipStr.textContent = parts.join(" | ") + perfText;
    }
    const tipSpi = document.getElementById("tip-spirit");
    if (tipSpi) {
        const spiMult = game.getSpiritMultiplier();
        const techSpeed = (1 + game.spirit * 0.02);
        const parts = [`База: ${game.spirit}`];
        if (artSpi > 0) parts.push(`Артефакт: +${artSpi.toFixed(1)}`);
        parts.push(`Эффект: +${((spiMult - 1) * 100).toFixed(0)}% ци`);
        parts.push(`Техники: x${techSpeed.toFixed(2)}`);
        tipSpi.textContent = parts.join(" | ") + perfText;
    }
    const tipLuck = document.getElementById("tip-luck");
    if (tipLuck) {
        const rewardBonus = (game.getRewardLuckBonus() * 100).toFixed(1);
        const btBonus = (Math.sqrt(totalLuck) * 0.6).toFixed(1);
        const parts = [`База: ${game.luck}`];
        if (artLuck > 0) parts.push(`Артефакт: +${artLuck.toFixed(1)}`);
        if (formLuck > 0) parts.push(`Формация: +${formLuck.toFixed(0)}`);
        parts.push(`Награды: +${rewardBonus}% (предел +50%)`);
        parts.push(`Прорыв: +${btBonus}%`);
        tipLuck.textContent = parts.join(" | ") + perfText;
    }
    const tipCombat = document.getElementById("tip-combat");
    if (tipCombat) {
        const breakdown = game.getCombatPowerBreakdown();
        tipCombat.textContent = breakdown.join(" | ");
    }

    // Награда за опасность
    const dangerRewardEl = document.getElementById("danger-reward");
    const dangerRewardRow = document.getElementById("danger-reward-row");
    const artDangerReward = game.getArtifactBonus("dangerReward") * 0.01;
    const sectDangerReward = game.getSectBonus("dangerReward");
    const formDangerReward = game.getFormationBonus("dangerReward");
    const bodyDangerReward = (game.getActiveBodyPerks().dangerReward || 0);
    const totalDangerReward = game.getDangerRewardBonus();
    if (dangerRewardEl) {
        dangerRewardEl.textContent = `+${Math.round(totalDangerReward * 100)}%`;
    }
    if (dangerRewardRow) {
        dangerRewardRow.style.display = totalDangerReward > 0 ? "" : "none";
    }
    const tipDangerReward = document.getElementById("tip-danger-reward");
    if (tipDangerReward) {
        const parts = [];
        if (artDangerReward > 0) parts.push(`Артефакт: +${Math.round(artDangerReward * 100)}%`);
        if (sectDangerReward > 0) parts.push(`Секта: +${Math.round(sectDangerReward * 100)}%`);
        if (formDangerReward > 0) parts.push(`Формация: +${Math.round(formDangerReward * 100)}%`);
        if (bodyDangerReward > 0) parts.push(`Тело: +${Math.round(bodyDangerReward * 100)}%`);
        parts.push("Бонус к наградам из опасных событий и экспедиций: предел +300%");
        tipDangerReward.textContent = parts.join(" | ");
    }

    // Удержание ци
    const retentionEl = document.getElementById("qi-retention");
    if (retentionEl) {
        const ret = game.getQiRetention();
        retentionEl.textContent = `${Math.round(ret * 100)}%`;
    }
    const retRow = document.getElementById("retention-row");
    if (retRow) {
        const ret = game.getQiRetention();
        retRow.style.display = (game.realmIndex >= 3 || ret > 0) ? "" : "none";
    }
    const tipRet = document.getElementById("tip-retention");
    if (tipRet) {
        const ret = game.getQiRetention();
        const parts = [];
        const techRet = game.getTechBonus("qiRetention");
        const artRet = game.getArtifactBonus("qiRetention") * 0.01;
        const sectRet = game.getSectBonus("qiRetention");
        const bodyPerks = game.getActiveBodyPerks();
        const bodyRet = bodyPerks.retention || 0;
        if (techRet > 0) parts.push(`Техники: +${Math.round(techRet * 100)}%`);
        if (artRet > 0) parts.push(`Артефакт: +${Math.round(artRet * 100)}%`);
        if (sectRet > 0) parts.push(`Секта: +${Math.round(sectRet * 100)}%`);
        if (bodyRet > 0) parts.push(`Тело: +${Math.round(bodyRet * 100)}%`);
        tipRet.textContent = parts.length > 0
            ? `Смягчает потерю ци при провале прорыва. ${parts.join(" | ")} (макс 95%)`
            : "Смягчает потерю ци при провале прорыва (макс 95%). Источники: техники, артефакты, секта, тело.";
    }

    // Совершенствование (бонус множителя духа)
    const perfRow = document.getElementById("perfection-row");
    const perfVal = document.getElementById("perfection-value");
    const tipPerf = document.getElementById("tip-perfection");
    if (perfRow && perfVal) {
        const formB = game.getFormationBonus("statXpSpeed");
        const sectB = game.getSectBonus("statXpSpeed");
        const artB = game.getArtifactBonus("statXpSpeed") * 0.01;
        const techB = game.getTechBonus("statXpSpeed");
        const karmaB = ((game.prestige.karmaUpgrades.statSpeed || 0) + (game.getActiveBodyPerks().freeUpgradeLevel || 0)) * 0.05;
        const total = formB + sectB + artB + techB + karmaB;
        perfRow.style.display = total > 0 ? "" : "none";
        const effective = softcap(total, 3, 0.5);
        perfVal.textContent = `+${Math.round(effective * 100)}%`;
        if (tipPerf) {
            const parts = [`Бонус к духу: +${Math.round(total * 100)}%`];
            if (formB > 0) parts.push(`Формация: +${Math.round(formB * 100)}%`);
            if (sectB > 0) parts.push(`Секта: +${Math.round(sectB * 100)}%`);
            if (artB > 0) parts.push(`Артефакт: +${Math.round(artB * 100)}%`);
            if (techB > 0) parts.push(`Техника: +${Math.round(techB * 100)}%`);
            if (karmaB > 0) parts.push(`Карма: +${Math.round(karmaB * 100)}%`);
            tipPerf.textContent = `Усиливает дух в формуле медитации; XP статов не ускоряет. ${parts.join(" | ")}. После +300% рост замедляется; итог +${Math.round(effective * 100)}%.`;
        }
    }

    // Мастерство техник (скорость XP техник)
    const techSpeedRow = document.getElementById("tech-speed-row");
    const techSpeedVal = document.getElementById("tech-speed-value");
    const tipTechSpeed = document.getElementById("tip-tech-speed");
    if (techSpeedRow && techSpeedVal) {
        const formB = game.getFormationBonus("techXpSpeed");
        const sectB = game.getSectBonus("techXpSpeed");
        const artB = game.getArtifactBonus("techXpSpeed") * 0.01;
        const techB = game.getTechBonus("techXpSpeed");
        const karmaB = ((game.prestige.karmaUpgrades.talent || 0) + (game.getActiveBodyPerks().freeUpgradeLevel || 0)) * 0.10;
        const spiB = game.spirit * 0.02;
        const total = (1 + formB) * (1 + sectB) * (1 + artB) * (1 + techB) * (1 + karmaB) * (1 + spiB);
        techSpeedRow.style.display = total > 1 ? "" : "none";
        techSpeedVal.textContent = `×${total.toFixed(2)}`;
        if (tipTechSpeed) {
            const parts = [`Дух (${game.spirit}): +${Math.round(spiB * 100)}%`];
            if (formB > 0) parts.push(`Формация: +${Math.round(formB * 100)}%`);
            if (sectB > 0) parts.push(`Секта: +${Math.round(sectB * 100)}%`);
            if (artB > 0) parts.push(`Артефакт: +${Math.round(artB * 100)}%`);
            if (techB > 0) parts.push(`Техника: +${Math.round(techB * 100)}%`);
            if (karmaB > 0) parts.push(`Карма: +${Math.round(karmaB * 100)}%`);
            tipTechSpeed.textContent = `Множители перемножаются; сродство конкретной техники дополнительно ×1.5. ${parts.join(" | ")}`;
        }
    }

    // Скорость Дао
    const daoSpeedRow = document.getElementById("dao-speed-row");
    const daoSpeedVal = document.getElementById("dao-speed-value");
    const tipDaoSpeed = document.getElementById("tip-dao-speed");
    if (daoSpeedRow && daoSpeedVal) {
        const daoMult = game.getDaoSpeedMultiplier();
        const bonus = daoMult - 1;
        daoSpeedRow.style.display = (bonus > 0.001 && game.realmIndex >= 3 && game.sect) ? "" : "none";
        daoSpeedVal.textContent = `+${Math.round(bonus * 100)}%`;
        if (tipDaoSpeed && bonus > 0.001) {
            const parts = [];
            const techB = game.getTechBonus("daoSpeed");
            const artB = game.getArtifactBonus("daoSpeed") * 0.01;
            if (techB > 0) parts.push(`Техника: +${Math.round(techB * 100)}%`);
            if (artB > 0) parts.push(`Артефакт: +${Math.round(artB * 100)}%`);
            let milestoneB = 0;
            for (const mid of game.milestones) {
                const m = MILESTONES.find(x => x.id === mid);
                if (m && m.tier === "jade") milestoneB += 0.02;
                else if (m && m.tier === "secret") milestoneB += 0.05;
            }
            if (milestoneB > 0) parts.push(`Достижения: +${Math.round(milestoneB * 100)}%`);
            tipDaoSpeed.textContent = `Ускоряет постижение Дао из всех источников. ${parts.join(" | ")}`;
        }
    }

    document.getElementById("stones").textContent = game.stones;
    document.getElementById("pills").textContent = game.pills;
    const essEl = document.getElementById("dao-essence");
    if (essEl) essEl.textContent = game.daoEssence;
    const dustEl = document.getElementById("artifact-dust");
    if (dustEl) dustEl.textContent = game.artifactDust;
    const scrollEl = document.getElementById("dao-scrolls");
    if (scrollEl) scrollEl.textContent = game.daoScrolls || 0;

    // Тултип камней
    const tipStones = document.getElementById("tip-stones");
    if (tipStones) {
        tipStones.textContent = "Формации, защита при заточке, вход в экспедиции, задания секты.";
    }

    // Тело перерождения
    const bodyNameEl = document.getElementById("body-name");
    const tipBody = document.getElementById("tip-body");
    if (bodyNameEl) {
        const body = REBIRTH_BODIES.find(b => b.id === (game.prestige.lastBody || "peasant"));
        const ascLevel = game.getBodyAscensionLevel(game.prestige.lastBody || "peasant");
        const ascensions = BODY_ASCENSIONS[game.prestige.lastBody];
        const displayName = ascLevel > 0 && ascensions && ascensions[ascLevel - 1].name ? ascensions[ascLevel - 1].name : (body ? body.name : "Крестьянин");
        bodyNameEl.textContent = displayName + (ascLevel > 0 ? ` ★${ascLevel}` : "");
        bodyNameEl.style.color = body ? body.color : "#888";
        if (tipBody && body) {
            tipBody.textContent = `${body.description}${body.perkDesc ? " | " + body.perkDesc : ""}`;
        }
    }

    // Духовный корень
    const rootEl = document.getElementById("spiritual-root");
    if (rootEl && game.spiritualRoot) {
        rootEl.textContent = game.spiritualRoot.name;
        rootEl.style.color = game.spiritualRoot.color;
    }
    const tipRoot = document.getElementById("tip-root");
    if (tipRoot && game.spiritualRoot) {
        const r = game.spiritualRoot;
        const mods = [];
        if (r.qiMultiplier !== 1) mods.push(_formatMod("Ци", r.qiMultiplier));
        if (r.statBonus) {
            const statNames = { spirit: "Дух", strength: "Сила", luck: "Удача" };
            for (const [k, v] of Object.entries(r.statBonus)) {
                mods.push(`<span class="tip-mod tip-mod-good">+${v} ${statNames[k] || k}</span>`);
            }
        }
        tipRoot.innerHTML = `<div class="tip-flavor" style="border-color:${r.color}">${r.description}</div>${mods.length > 0 ? `<div class="tip-mods">${mods.join("")}</div>` : ""}`;
    }

    // Элементы + резонанс
    const elemEl = document.getElementById("root-elements");
    if (elemEl && game.spiritualRoot) {
        if (game.spiritualRoot.elements.length > 0) {
            const elemNames = game.spiritualRoot.elements
                .map(eid => ELEMENTS.find(e => e.id === eid)?.name || eid)
                .join(", ");
            const resonance = game.getElementalResonance();
            elemEl.textContent = resonance > 0
                ? `${elemNames} (резонанс: +${resonance * 12}% ци)`
                : elemNames;
        } else {
            elemEl.textContent = "\u2014";
        }
    }
    const tipElements = document.getElementById("tip-elements");
    if (tipElements && game.spiritualRoot) {
        if (game.spiritualRoot.elements.length > 0) {
            const elemParts = game.spiritualRoot.elements.map(eid => {
                const el = ELEMENTS.find(e => e.id === eid);
                return el ? `<span style="color:${el.color}">${el.icon} ${el.name}</span>` : eid;
            });
            const resonance = game.getElementalResonance();
            let html = `<div class="tip-flavor" style="border-color:#888">Стихии определяют совместимость с техниками и сектами. Одинаковые элементы у техник дают бонус к эффекту.</div>`;
            html += `<div class="tip-mods">${elemParts.join(" ")}`;
            if (resonance > 0) html += ` <span class="tip-mod tip-mod-good">Резонанс: +${resonance * 12}% ци</span>`;
            html += `</div>`;
            tipElements.innerHTML = html;
        } else {
            tipElements.innerHTML = `<div class="tip-flavor" style="border-color:#666">Нет стихийной аффинности. Универсальный путь — без бонусов, но и без ограничений.</div>`;
        }
    }

    // Тултип скорости ци
    const tipQiRate = document.getElementById("tip-qi-rate");
    if (tipQiRate && game.currentActivity === "meditation") {
        const parts = [];
        const base = 5 + game.realmIndex * 3;
        parts.push(`База: ${base}`);
        const spiMult = game.getSpiritMultiplier();
        if (spiMult > 1) parts.push(`Дух: x${spiMult.toFixed(2)}`);
        const strMult = game.getStrengthMultiplier();
        if (strMult > 1) parts.push(`Сила: x${strMult.toFixed(2)}`);
        const qiMult = game.getQiMultiplier();
        if (qiMult > 1) parts.push(`Корень/Эпоха: x${qiMult.toFixed(2)}`);
        const techMult = game.getTechQiMultiplier();
        if (techMult > 1) parts.push(`Техники: x${techMult.toFixed(2)}`);
        const formMult = 1 + game.getFormationBonus("qi");
        if (formMult > 1) parts.push(`Формации: x${formMult.toFixed(2)}`);
        const artMult = 1 + game.getArtifactBonus("qi") * 0.01;
        if (artMult > 1) parts.push(`Артефакт: x${artMult.toFixed(2)}`);
        const sectMult = 1 + game.getSectBonus("qi");
        if (sectMult > 1) parts.push(`Секта: x${sectMult.toFixed(2)}`);
        const karmaMult = game.getKarmaQiMultiplier();
        if (karmaMult > 1) parts.push(`Карма: x${karmaMult.toFixed(2)}`);
        const elemMult = game.getElementalMultiplier();
        if (elemMult > 1) parts.push(`Резонанс: x${elemMult.toFixed(2)}`);
        tipQiRate.textContent = game.expedition ? "Медитация приостановлена до завершения экспедиции: 0 ци/сек" : parts.join(" | ");
    } else if (tipQiRate) {
        tipQiRate.textContent = "";
    }

    // Шанс прорыва + демон (раздельные тултипы)
    const btChanceText = document.getElementById("bt-chance-text");
    const demonEl = document.getElementById("demon-chance");
    const demonText = document.getElementById("demon-chance-text");
    const tipDemon = document.getElementById("tip-demon");
    if (btChanceText) {
        if (game.realmIndex >= 3) {
            const chance = game.getBreakthroughChance();
            btChanceText.textContent = `Шанс: ${(chance * 100).toFixed(0)}%`;
            btChanceText.style.color = chance >= 0.7 ? "#6aea8a" : chance >= 0.5 ? "#eebb44" : "#ee7a7a";

            const demonChance = game.getEffectiveDemonChance();
            if (demonChance > 0 && demonEl && demonText && tipDemon) {
                demonEl.style.display = "";
                const realmLoss = game.getDemonRealmLoss();
                const rawChance = game.getDemonChance();
                const bodyPerks = game.getActiveBodyPerks();
                const flatRed = (bodyPerks.demonReduction || 0) + game.getFormationBonus("demonReduction") + game.getArtifactBonus("demonReduction") * 0.01;
                const demonPctLoss = bodyPerks.demonStatPct || 0;
                const statLoss = demonPctLoss > 0
                    ? `${Math.round(demonPctLoss * 100)}% всех статов`
                    : `до ${Math.min(Math.floor(realmLoss * 1.5) + 1, 6)} сила/дух/удача`;
                demonText.textContent = `Демон: ${(demonChance * 100).toFixed(0)}% (-${realmLoss} ступ.)`;
                demonText.style.color = "#cc4a3a";
                const daoPressure = game.daoLevel >= 25 ? 15 : game.daoLevel >= 17 ? 10 : game.daoLevel >= 9 ? 5 : 0;
                const tipParts = [
                    `При провале: ${(rawChance * 100).toFixed(0)}% шанс демона`,
                ];
                if (daoPressure > 0) tipParts.push(`Давление Дао: +${daoPressure}%`);
                if (flatRed > 0) tipParts.push(`Защита: -${(flatRed * 100).toFixed(0)}%`);
                tipParts.push(`Итого: ${(demonChance * 100).toFixed(0)}%`);
                tipParts.push(`Потеря: ${realmLoss} ступеней + ${statLoss}`);
                tipParts.push(`Ци → 0; Дао: -${Math.max(0, realmLoss - 1)} ур.`);
                if (!game.flags.demonFailsafeUsed) tipParts.push("Первого демона в этой жизни отражает защитный инстинкт");
                tipDemon.textContent = tipParts.join(" | ");
            } else if (demonEl) {
                demonEl.style.display = "none";
            }
        } else {
            btChanceText.textContent = "";
            if (demonEl) demonEl.style.display = "none";
        }
    }

    // Тултип шанса прорыва
    const tipBtChance = document.getElementById("tip-bt-chance");
    if (tipBtChance) {
        if (game.realmIndex >= 3) {
            const parts = [];
            let realmPenalty = 0;
            const mortalSteps = Math.min(game.realmIndex - 3, 7);
            if (mortalSteps > 0) realmPenalty += mortalSteps * 0.10;
            const immortalSteps = Math.max(0, game.realmIndex - 10);
            if (immortalSteps > 0) realmPenalty += immortalSteps * 0.15;
            const baseChance = 0.70 - realmPenalty;
            parts.push(`База: ${(baseChance * 100).toFixed(0)}%`);
            const totalLuck = game.luck + game.getFormationBonus("luck") + game.getArtifactBonus("luck");
            const luckB = Math.sqrt(totalLuck) * 0.006;
            if (luckB > 0.001) parts.push(`Удача: +${(luckB * 100).toFixed(1)}%`);
            const techB = game.getTechBonus("breakthroughBonus");
            if (techB > 0) parts.push(`Техники: +${(techB * 100).toFixed(1)}%`);
            const artB = game.getArtifactBonus("breakthroughBonus") * 0.01;
            if (artB > 0) parts.push(`Артефакт: +${(artB * 100).toFixed(1)}%`);
            const sectB = game.getSectBonus("breakthroughBonus");
            if (sectB > 0) parts.push(`Секта: +${(sectB * 100).toFixed(1)}%`);
            const formB = game.getFormationBonus("breakthroughBonus");
            if (formB > 0) parts.push(`Формация: +${(formB * 100).toFixed(1)}%`);
            const bodyPerks = game.getActiveBodyPerks();
            const bodyB = bodyPerks.breakthroughBonus || 0;
            if (bodyB > 0) parts.push(`Тело: +${(bodyB * 100).toFixed(1)}%`);
            const pillB = game.flags._pillBreakthroughBonus || 0;
            if (pillB > 0) parts.push(`Дух. пилюля: +${(pillB * 100).toFixed(0)}%`);
            const techLuckB = game.getTechBonus("luck") * 0.01;
            if (techLuckB > 0) parts.push(`Удача техник: +${(techLuckB * 100).toFixed(2)}%`);
            if (game.flags.prophetic_dream) parts.push("Пророческий сон: +5%");
            parts.push(`Предел эпохи: ${(game.getEraBreakthroughCap() * 100).toFixed(0)}%`);
            tipBtChance.textContent = parts.join(" | ");
        } else {
            tipBtChance.textContent = "";
        }
    }

    // Подсказка на Махаяне — что делать дальше
    const btGuideEl = document.getElementById("breakthrough-guide");
    if (btGuideEl) {
        if (game.realmIndex >= 9 && !game.meetsRealmRequirement(10)) {
            const req = game.getRealmPrestigeRequirement(10);
            const totalKarma = game.prestige.karma + game._getTotalKarmaSpent();
            btGuideEl.style.display = "";
            btGuideEl.innerHTML = `
                <span class="guide-icon">\u26A0</span>
                Ступень «${REALMS[10].name}» требует перерождения!
                <br>Нужно: ${req.rebirths} перерожд. (${game.prestige.totalRebirths}/${req.rebirths}), ${req.karma} кармы (${totalKarma}/${req.karma})
                <br><em>Используйте "Рассеять Культивацию" в панели слева.</em>
            `;
        } else {
            btGuideEl.style.display = "none";
        }
    }

    // Кнопка Свитка Озарения (в табе техник)
    _updateInsightButtons();
    const tipInsight = document.getElementById("tip-insight");
    if (tipInsight) {
        const uses = game._insightUses || 0;
        tipInsight.textContent = `Сразу 10% XP, необходимого для текущего уровня каждой экипированной техники. Максимальные техники пропускаются. Использовано: ${uses}, стоимость растёт.`;
    }

    // Активности — подсветка активной
    document.querySelectorAll(".activity-row").forEach(row => {
        row.classList.toggle("active", row.dataset.activity === game.currentActivity);
    });

    // Эпоха
    const era2 = game.getCurrentEra();
    const eraEl = document.getElementById("current-era");
    if (eraEl && era2) {
        eraEl.textContent = era2.name;
        eraEl.style.color = era2.color;
    }
    const tipEra = document.getElementById("tip-era");
    if (tipEra && era2) {
        const mods = [];
        if (era2.qiMultiplier !== 1) mods.push(_formatMod("Ци", era2.qiMultiplier));
        if (era2.dangerWeight !== 1) mods.push(_formatMod("Опасность", era2.dangerWeight));
        if (era2.rewardWeight !== 1) mods.push(_formatMod("Награды", era2.rewardWeight));
        tipEra.innerHTML = `<div class="tip-flavor" style="border-color:${era2.color}">${era2.description}</div>${mods.length > 0 ? `<div class="tip-mods">${mods.join("")}</div>` : `<div class="tip-mods"><span class="tip-mod tip-mod-neutral">Без модификаторов</span></div>`}`;
    }

    // Мировое событие
    const weEl = document.getElementById("world-event");
    if (weEl) {
        if (game.worldEvent) {
            const remaining = (game.worldEvent.startYear + game.worldEvent.duration) - game.years;
            weEl.textContent = `${game.worldEvent.name} (${remaining} лет)`;
            weEl.style.color = game.worldEvent.color;
        } else {
            weEl.textContent = "Спокойно";
            weEl.style.color = "#6aea8a";
        }
    }
    const tipWE = document.getElementById("tip-world-event");
    if (tipWE) {
        if (game.worldEvent) {
            const we = game.worldEvent;
            const weDef = WORLD_EVENTS.find(w => w.id === we.id);
            const weDesc = (weDef && weDef.description) || we.name;
            const mod = we.modifiers;
            const mods = [];
            if (mod.qiMultiplier) mods.push(_formatMod("Ци", mod.qiMultiplier));
            if (mod.dangerWeight) mods.push(_formatMod("Опасность", mod.dangerWeight));
            if (mod.rewardWeight) mods.push(_formatMod("Награды", mod.rewardWeight));
            if (mod.stoneIncome) mods.push(_formatMod("Камни", mod.stoneIncome));
            if (mod.pillEffect) mods.push(_formatMod("Пилюли", mod.pillEffect));
            tipWE.innerHTML = `<div class="tip-flavor" style="border-color:${we.color}">${weDesc}</div><div class="tip-mods">${mods.join("")}</div>`;
        } else {
            tipWE.innerHTML = `<div class="tip-flavor" style="border-color:#6aea8a">Никаких потрясений — мир дышит ровно. Хорошее время для спокойной культивации.</div><div class="tip-mods"><span class="tip-mod tip-mod-neutral">Без модификаторов</span></div>`;
        }
    }

    // Техники badge — экипированные/слоты
    const techBadge = document.getElementById("tech-count");
    if (techBadge) techBadge.textContent = `${game.equippedTechniques.length}/${game.getMaxTechSlots()}`;

    // Достижения badge
    const mileBadge = document.getElementById("mile-count");
    if (mileBadge) {
        const realMileCount = game.milestones.filter(id => MILESTONES.some(m => m.id === id)).length;
        mileBadge.textContent = `${realMileCount}/${MILESTONES.length}`;
    }

    // Артефакты badge
    const artBadge = document.getElementById("art-count");
    if (artBadge) {
        const equipped = ARTIFACT_SLOTS.filter(s => game.equippedArtifacts[s] !== null).length;
        artBadge.textContent = `${equipped}/4`;
    }

    // Формации — полная перерисовка (стоимость/уровень могут измениться после reset)
    renderFormations();

    const techniquesTab = document.getElementById("tab-techniques");
    if (techniquesTab?.classList.contains("active")) renderTechniques();
    const artifactsTab = document.getElementById("tab-artifacts");
    if (artifactsTab?.classList.contains("active")) renderArtifacts();

    // Приключения — перерисовка если таб активен (прогресс-бары, шаги)
    const advTab = document.getElementById("tab-adventures");
    if (advTab && advTab.classList.contains("active")) renderAdventures();

    // Экспедиции — перерисовка если таб активен (завершение, новые локации)
    const expTab = document.getElementById("tab-expeditions");
    if (expTab && expTab.classList.contains("active")) renderExpeditions();

    // Секта — перерисовка если таб активен (кулдауны, новые задания)
    const sectTab = document.getElementById("tab-sect");
    if (sectTab && sectTab.classList.contains("active")) renderSects();

    // Секта — инфо в левой панели
    const sectInfoEl = document.getElementById("sect-info");
    if (sectInfoEl) {
        if (game.sect) {
            const sect = SECTS.find(s => s.id === game.sect.id);
            const rank = game.getCurrentSectRank();
            sectInfoEl.style.display = "";
            const sectNameEl = document.getElementById("sect-name");
            const sectRankEl = document.getElementById("sect-rank");
            if (sectNameEl && sect) { sectNameEl.textContent = sect.name; sectNameEl.style.color = sect.color; }
            if (sectRankEl && rank) sectRankEl.textContent = rank.name;
        } else {
            sectInfoEl.style.display = "none";
        }
    }

    // Экспедиция — инфо в левой панели
    const expInfoEl = document.getElementById("expedition-info");
    if (expInfoEl) {
        if (game.expedition) {
            const loc = LOCATIONS.find(l => l.id === game.expedition.locationId);
            expInfoEl.style.display = "";
            const expNameEl = document.getElementById("expedition-name");
            const expTimeEl = document.getElementById("expedition-time");
            if (expNameEl && loc) { expNameEl.textContent = game.getLocationName(loc.id); expNameEl.style.color = loc.color; }
            if (expTimeEl) expTimeEl.textContent = `${game.getExpeditionTimeLeft()} лет`;
        } else {
            expInfoEl.style.display = "none";
        }
    }

    // Перерождение: кнопка с превью кармы
    const btnRebirth = document.getElementById("btn-rebirth");
    const rebirthPanel = document.getElementById("rebirth-confirm-panel");
    const rebirthPanelOpen = rebirthPanel && rebirthPanel.style.display !== "none";
    if (btnRebirth && !rebirthPanelOpen) {
        const showRebirth = game.realmIndex >= 3;
        btnRebirth.style.display = showRebirth ? "" : "none";
        if (showRebirth) {
            const _erPerks2 = game.getActiveBodyPerks();
            const earlyRebirthLevel = (game.prestige.karmaUpgrades.earlyRebirth || 0) + (_erPerks2.freeUpgradeLevel || 0);
            const minAge = 150 - earlyRebirthLevel * 10;
            const age = game.characterAge();
            if (age < minAge) {
                btnRebirth.textContent = `Рассеивание через ${minAge - age} ${_plural(minAge - age, "год", "года", "лет")}`;
                btnRebirth.disabled = true;
            } else {
                const karmaPreview = game.calculateKarma(false);
                btnRebirth.textContent = `Рассеять Культивацию (+${karmaPreview} кармы)`;
                btnRebirth.disabled = false;
            }
        }
    }
    const karmaDisplay = document.getElementById("karma-display");
    if (karmaDisplay) {
        const show = game.prestige.totalRebirths > 0 || game.prestige.karma > 0;
        karmaDisplay.style.display = show ? "" : "none";
        const karmaVal = document.getElementById("karma-value");
        if (karmaVal) {
            karmaVal.textContent = game.prestige.karma;
            const totalKarma = game.prestige.karma + (typeof game._getTotalKarmaSpent === "function" ? game._getTotalKarmaSpent() : 0);
            const karmaMult = typeof game.getKarmaQiMultiplier === "function" ? game.getKarmaQiMultiplier() : 1;
            const tipKarma = document.getElementById("tip-karma");
            if (tipKarma) {
                const parts = [`Свободная: ${game.prestige.karma}`, `Всего: ${totalKarma}`];
                parts.push(`Множитель ци: ×${karmaMult.toFixed(2)}`);
                // Бонус кармы от ачивок
                if (game.prestige.totalRebirths >= 1) {
                    let achBonus = 0;
                    for (const mid of game.milestones) {
                        const m = MILESTONES.find(x => x.id === mid);
                        if (m && (m.tier === "bronze" || m.tier === "silver" || m.tier === "gold")) achBonus++;
                    }
                    if (achBonus > 0) parts.push(`Достижения: +${achBonus}% карма`);
                }
                tipKarma.textContent = parts.join(" | ");
            }
        }
        const rebirthsVal = document.getElementById("rebirths-value");
        if (rebirthsVal) rebirthsVal.textContent = game.prestige.totalRebirths;
    }

    // === Прогрессивное раскрытие механик ===
    const r = game.realmIndex;
    const hasReborn = game.prestige.totalRebirths > 0;

    // Табы
    const sectTabBtn = document.getElementById("tab-btn-sect");
    if (sectTabBtn) sectTabBtn.style.display = r >= 1 ? "" : "none";
    const sectMissionBadge = document.getElementById("sect-mission-badge");
    if (sectMissionBadge && game.sect) {
        const completable = game.sectMissions.filter((m, i) => m.templateId && game.canCompleteSectMission(i)).length;
        const total = game.sectMissions.filter(m => m.templateId).length;
        if (total > 0) {
            sectMissionBadge.textContent = `${completable}/${total}`;
            sectMissionBadge.style.display = "";
            sectMissionBadge.style.color = completable > 0 ? "#6aea8a" : "#888";
        } else {
            sectMissionBadge.style.display = "none";
        }
    } else if (sectMissionBadge) {
        sectMissionBadge.style.display = "none";
    }
    const expTabBtn = document.getElementById("tab-btn-expeditions");
    if (expTabBtn) expTabBtn.style.display = r >= 1 ? "" : "none";
    const expBadge = document.getElementById("expedition-badge");
    if (expBadge) {
        if (!game.expedition && game.sect) {
            expBadge.textContent = "!";
            expBadge.style.display = "";
            expBadge.style.color = "#6aea8a";
        } else {
            expBadge.style.display = "none";
        }
    }
    const advTabBtn = document.getElementById("tab-btn-adventures");
    const hasAdvContent = game.adventureRumors.length > 0 || game.activeAdventures.length > 0 || !!game.lastAdventureReward;
    if (advTabBtn) advTabBtn.style.display = hasAdvContent ? "" : "none";
    const advBadge = document.getElementById("adv-badge");
    if (advBadge) {
        const rumorCount = game.adventureRumors.length;
        const awaitingCount = game.activeAdventures.filter(a => a.awaitingChoice).length;
        const total = rumorCount + awaitingCount;
        advBadge.textContent = total;
        advBadge.style.display = total > 0 ? "" : "none";
    }
    const artTabBtn = document.getElementById("tab-btn-artifacts");
    if (artTabBtn) artTabBtn.style.display = (r >= 1 || game.artifacts.length > 0) ? "" : "none";
    const techTabBtn = document.getElementById("tab-btn-techniques");
    if (techTabBtn) techTabBtn.style.display = (game.techniques.length > 0) ? "" : "none";

    // Статы: удача и боевая мощь — после первого прорыва или если стат вырос
    const luckRow = document.getElementById("luck-row");
    if (luckRow) luckRow.style.display = (r >= 1 || hasReborn || game.luck > 1) ? "" : "none";
    const cpRow = document.getElementById("combat-power-row");
    if (cpRow) cpRow.style.display = (r >= 1 || hasReborn || game.getCombatPower() > 1) ? "" : "none";

    // Ресурсы: показывать когда есть или по ступени
    const pillsRow = document.getElementById("pills-row");
    if (pillsRow) pillsRow.style.display = (game.pills > 0 || r >= 1 || hasReborn) ? "" : "none";
    const essenceRow = document.getElementById("essence-row");
    if (essenceRow) essenceRow.style.display = (game.daoEssence > 0 || r >= 1 || game.techniques.length > 0) ? "" : "none";
    const dustRow = document.getElementById("dust-row");
    if (dustRow) dustRow.style.display = (game.artifactDust > 0 || r >= 3) ? "" : "none";
    const scrollsRow = document.getElementById("scrolls-row");
    if (scrollsRow) scrollsRow.style.display = (game.daoScrolls > 0 || r >= 3) ? "" : "none";

    // Активность «Испытание Судьбы» — после первого прорыва
    const fateRow = document.getElementById("activity-fate");
    if (fateRow) fateRow.style.display = (r >= 1 || hasReborn || game.luck > 1) ? "" : "none";

    // Формации — со 2 ступени
    const formSection = document.getElementById("formations-section");
    const unlocked = game.prestige.unlockedFormations || [];
    const hasBuyableFormation = unlocked.some(fId => {
        const f = CULT_FORMATIONS.find(x => x.id === fId);
        if (!f || !f.sect) return false;
        const daoCap = (game.prestige.daoLevels && game.prestige.daoLevels[f.sect]) || 0;
        return daoCap > 0;
    });
    const hasFormations = hasBuyableFormation || (game.selectedFormations && game.selectedFormations.length > 0);
    if (formSection) formSection.style.display = hasFormations ? "" : "none";

    // Таблица пилюль — показать когда есть пилюли
    const pillTable = document.getElementById("pill-table");
    if (pillTable) pillTable.style.display = (game.pills > 0 || (game.refinedPills || 0) > 0 || (game.spiritualPills || 0) > 0 || (game.heavenlyPills || 0) > 0 || hasReborn) ? "" : "none";

    // Синхронизация кнопок скорости
    document.querySelectorAll(".debug-speed-btn").forEach(btn => {
        btn.classList.toggle("active", btn.textContent === `x${game.debugSpeed}`);
    });

    // Тик-обновления тоже нужны при полном обновлении
    updateTickUI();
}

function _formatMod(label, value) {
    const isGood = (label === "Опасность") ? value < 1 : value > 1;
    const isBad = (label === "Опасность") ? value > 1 : value < 1;
    const cls = isGood ? "tip-mod-good" : isBad ? "tip-mod-bad" : "tip-mod-neutral";
    return `<span class="tip-mod ${cls}">${label}: \u00D7${value}</span>`;
}

function _updateDeathBanner() {
    let banner = document.getElementById("death-banner");
    if (game.gameOver) {
        if (!banner) {
            banner = document.createElement("div");
            banner.id = "death-banner";
            banner.innerHTML = `
                <div class="death-banner-content">
                    <div class="death-title">⚰ Ваша жизнь окончена</div>
                    <div class="death-summary">
                        Прожито <strong>${game.characterAge()}</strong> лет.
                        Ступень: <strong>${REALMS[game.realmIndex].name}</strong>.
                        Карма этой жизни: <strong>+${game.calculateKarma(true)}</strong>
                    </div>
                    <div class="death-hint">Мудрость прожитых лет обратится в карму. Перерождение ждёт.</div>
                    <button class="btn btn-primary death-rebirth-btn" onclick="showRebirthModal(true)">Переродиться</button>
                </div>
            `;
            const centerPanel = document.querySelector(".center-panel");
            if (centerPanel) {
                centerPanel.insertBefore(banner, centerPanel.firstChild);
            }
        }
        banner.style.display = "";
    } else {
        if (banner) banner.style.display = "none";
    }
}

function _updateSectMissionProgress() {
    if (!game.sectMissions || game.sectMissions.length === 0) return;

    const cards = document.querySelectorAll(".sect-mission-card[data-index]");
    cards.forEach(card => {
        const idx = parseInt(card.getAttribute("data-index"));
        const m = game.sectMissions[idx];
        if (!m || m.cooldown > 0) return;

        // Обновить текст прогресса
        const descEl = card.querySelector(".sect-mission-desc");
        if (descEl && m.check) {
            if (m.check.meditationYears) {
                const done = game.meditationYears - (m.meditationYearsAtStart || 0);
                descEl.textContent = `${m.description} (${Math.min(done, m.check.meditationYears)}/${m.check.meditationYears} лет)`;
            } else if (m.check.strength) {
                descEl.textContent = `${m.description} (${Math.floor(game.strength + game.getArtifactBonus("strength"))}/${m.check.strength})`;
            } else if (m.check.spirit) {
                descEl.textContent = `${m.description} (${Math.floor(game.spirit + game.getArtifactBonus("spirit"))}/${m.check.spirit})`;
            } else if (m.check.breakthroughs) {
                const done = game.totalBreakthroughs - (m.breakthroughsAtStart || 0);
                descEl.textContent = `${m.description} (${Math.min(done, m.check.breakthroughs)}/${m.check.breakthroughs})`;
            } else if (m.check.combatPower) {
                descEl.textContent = `${m.description} (${Math.floor(game.getCombatPower())}/${m.check.combatPower})`;
            } else if (m.check.pillsDonated) {
                const done = (game.flags.pillsDonated || 0) - (m.pillsDonatedAtStart || 0);
                descEl.textContent = `${m.description} (${Math.min(done, m.check.pillsDonated)}/${m.check.pillsDonated} пожертвовано)`;
            } else if (m.check.luck) {
                descEl.textContent = `${m.description} (${Math.floor(game.getTotalLuck())}/${m.check.luck})`;
            }
        }

        // Обновить кнопку выполнения
        const btn = card.querySelector(".btn");
        if (btn) {
            const canComplete = game.canCompleteSectMission(idx);
            btn.disabled = !canComplete;
            btn.textContent = canComplete ? "Выполнить" : "Не готово";
            btn.className = `btn btn-small ${canComplete ? "btn-primary" : "btn-secondary"}`;
        }
    });

    // Обновить прогресс-бар ранга
    _updateSectRankBar();
}

function _updateSectRankBar() {
    if (!game.sect) return;
    const bar = document.querySelector(".sect-rank-bar");
    const barText = document.querySelector(".sect-rank-bar-text");
    const contribEl = document.querySelector(".sect-contribution");
    if (!bar) return;

    const rank = game.getCurrentSectRank();
    const nextRank = game.getNextSectRank();
    if (!nextRank) return;

    const prevContrib = rank.contribution;
    const pct = Math.min(100, ((game.sect.contribution - prevContrib) / (nextRank.contribution - prevContrib)) * 100);
    bar.style.width = pct + "%";
    if (barText) barText.textContent = pct.toFixed(0) + "%";
    if (contribEl) contribEl.textContent = `Вклад: ${game.sect.contribution}`;
}

function _updateExpeditionProgress() {
    if (!game.expedition) return;
    const bar = document.querySelector(".expedition-bar");
    const text = document.querySelector(".expedition-bar-text");
    if (!bar && !text) return;

    const progress = game.getExpeditionProgress();
    const timeLeft = game.getExpeditionTimeLeft();
    const pct = (progress * 100).toFixed(0);

    if (bar) bar.style.width = pct + "%";
    if (text) text.textContent = `${pct}% — осталось ${timeLeft} лет`;
}

function _updateAdventureProgress() {
    game.activeAdventures.forEach((adventure, idx) => {
        if (adventure.awaitingChoice) return;
        const container = document.querySelector(`.adventure-progress-container[data-adv-idx="${idx}"]`);
        if (!container) return;

        const bar = container.querySelector(".adventure-progress-bar");
        const text = container.querySelector(".adventure-progress-text");
        const elapsed = game.years - adventure.stepStartYear;
        const pct = Math.min(100, (elapsed / adventure.stepDuration * 100)).toFixed(0);
        const timeLeft = Math.max(0, adventure.stepDuration - elapsed);

        if (bar) bar.style.width = pct + "%";
        if (text) text.textContent = `${pct}% — ${timeLeft} ${_plural(timeLeft, 'год', 'года', 'лет')}`;
    });
}

function _updateFormationButtons() {
    const container = document.getElementById("formations-list");
    if (!container || container.children.length === 0) {
        if (container) renderFormations();
        return;
    }
    const buttons = container.querySelectorAll("button[data-cost]");
    buttons.forEach(btn => {
        const cost = parseInt(btn.dataset.cost, 10);
        btn.disabled = game.gameOver || game.stones < cost;
    });
}

// === ПРОГРЕСС-БАРЫ АКТИВНОСТЕЙ ===
function updateActivityBars() {
    // Медитация — ци бар (уже есть основной)
    const medBar = document.getElementById("activity-bar-meditation");
    const medInfo = document.getElementById("activity-info-meditation");
    if (medBar && medInfo) {
        const needed = game.qiNeeded();
        const pct = needed === Infinity ? 0 : Math.min(100, (game.qi / needed) * 100);
        medBar.style.width = pct + "%";
        medInfo.textContent = game.expedition ? `${pct.toFixed(0)}% — приостановлена в экспедиции, 0 ци/сек` : `${pct.toFixed(0)}% \u2014 ${game.qiPerSec()} ци/сек`;
        const medRow = medBar.closest(".activity-row");
        if (medRow) medRow.title = game.expedition ? "Медитация возобновится после экспедиции. Тренировка статов и техник продолжается." : "Погружение в себя. Накапливает ци для прорыва на следующую ступень";
    }

    // Сила
    const bodyBar = document.getElementById("activity-bar-body");
    const bodyInfo = document.getElementById("activity-info-body");
    if (bodyBar && bodyInfo) {
        const needed = game.statXpNeeded("strength");
        const current = game.activityXP.strength || 0;
        const pct = Math.min(100, (current / needed) * 100);
        bodyBar.style.width = pct + "%";
        const artStr = game.getArtifactBonus("strength");
        const strText = artStr > 0 ? `Сила ${game.strength}+${Math.floor(artStr)}` : `Сила ${game.strength}`;
        bodyInfo.textContent = `${strText} \u2014 ${Math.floor(current)}/${needed} XP`;
    }

    // Дух
    const daoBar = document.getElementById("activity-bar-dao");
    const daoInfo = document.getElementById("activity-info-dao");
    if (daoBar && daoInfo) {
        const needed = game.statXpNeeded("spirit");
        const current = game.activityXP.spirit || 0;
        const pct = Math.min(100, (current / needed) * 100);
        daoBar.style.width = pct + "%";
        const artSpi = game.getArtifactBonus("spirit");
        const spiText = artSpi > 0 ? `Дух ${game.spirit}+${Math.floor(artSpi)}` : `Дух ${game.spirit}`;
        daoInfo.textContent = `${spiText} \u2014 ${Math.floor(current)}/${needed} XP`;
    }

    // Удача
    const fateBar = document.getElementById("activity-bar-fate");
    const fateInfo = document.getElementById("activity-info-fate");
    if (fateBar && fateInfo) {
        const needed = game.statXpNeeded("luck");
        const current = game.activityXP.luck || 0;
        const pct = Math.min(100, (current / needed) * 100);
        fateBar.style.width = pct + "%";
        const artLck = game.getArtifactBonus("luck");
        const lckText = artLck > 0 ? `Удача ${game.luck}+${Math.floor(artLck)}` : `Удача ${game.luck}`;
        fateInfo.textContent = `${lckText} \u2014 ${Math.floor(current)}/${needed} XP`;
    }
}

// === BREAKTHROUGH UI С АНИМАЦИЕЙ ===
function breakthroughUI() {
    const res = game.breakthrough();
    if (!res || res.result === "none") return;

    const qiSection = document.querySelector(".qi-section");
    const centerPanel = document.querySelector(".center-panel");
    const target = qiSection || centerPanel;
    if (!target) return;

    // Снимаем предыдущие анимации
    target.classList.remove("breakthrough-anim", "breakthrough-great-anim", "breakthrough-ascension-anim", "breakthrough-fail-anim", "breakthrough-demon-anim");
    void target.offsetWidth; // reflow

    if (res.result === "ascension") {
        target.classList.add("breakthrough-ascension-anim");
        _spawnBreakthroughParticles(target, "ascension");
        _breakthroughOverlay("ascension");
        setTimeout(() => _spawnBreakthroughParticles(target, "ascension"), 600);
        setTimeout(() => _spawnBreakthroughParticles(target, "ascension"), 1200);
        setTimeout(() => target.classList.remove("breakthrough-ascension-anim"), 4500);
    } else if (res.result === "great") {
        target.classList.add("breakthrough-great-anim");
        _spawnBreakthroughParticles(target, "great");
        _breakthroughOverlay("great");
        setTimeout(() => _spawnBreakthroughParticles(target, "great"), 500);
        setTimeout(() => target.classList.remove("breakthrough-great-anim"), 3000);
    } else if (res.result === "success") {
        target.classList.add("breakthrough-anim");
        _spawnBreakthroughParticles(target, "success");
        _breakthroughOverlay("success");
        setTimeout(() => target.classList.remove("breakthrough-anim"), 2500);
    } else if (res.result === "demon") {
        target.classList.add("breakthrough-demon-anim");
        _spawnBreakthroughParticles(target, "demon");
        _breakthroughOverlay("demon");
        setTimeout(() => target.classList.remove("breakthrough-demon-anim"), 2500);
    } else if (res.result === "fail") {
        target.classList.add("breakthrough-fail-anim");
        _spawnBreakthroughParticles(target, "fail");
        _breakthroughOverlay("fail");
        setTimeout(() => target.classList.remove("breakthrough-fail-anim"), 1500);
    }
    // "blocked" — no animation, just log messages
}

function _spawnBreakthroughParticles(el, type) {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const configs = {
        ascension: { colors: ["#ffd700", "#ffffff", "#88ccff", "#aaddff", "#c89aff", "#ffe080"], count: 60 },
        great:   { colors: ["#ffd700", "#ffe080", "#fff4cc", "#c89aff", "#ffffff"], count: 50 },
        success: { colors: ["#6aea8a", "#88ffaa", "#ccffdd", "#ffe080"], count: 25 },
        fail:    { colors: ["#ff4444", "#cc2222", "#884444", "#ff6666"], count: 12 },
        demon:   { colors: ["#8b0000", "#4a0030", "#660066", "#330033", "#ff0044"], count: 30 },
    };
    const cfg = configs[type] || configs.success;

    for (let i = 0; i < cfg.count; i++) {
        const particle = document.createElement("div");
        particle.className = "enhance-particle";
        particle.style.left = (cx + (Math.random() - 0.5) * rect.width * 0.8) + "px";
        particle.style.top = (cy + (Math.random() - 0.5) * rect.height * 0.5) + "px";
        particle.style.backgroundColor = cfg.colors[Math.floor(Math.random() * cfg.colors.length)];
        const spread = type === "ascension" ? 300 : type === "great" ? 220 : type === "demon" ? 180 : 120;
        particle.style.setProperty("--dx", ((Math.random() - 0.5) * spread) + "px");
        particle.style.setProperty("--dy", (-(40 + Math.random() * (type === "ascension" ? 200 : 120))) + "px");
        if (type === "ascension") {
            particle.style.width = (4 + Math.random() * 6) + "px";
            particle.style.height = particle.style.width;
            particle.style.animationDuration = (1.2 + Math.random() * 0.8) + "s";
        } else if (type === "great" || type === "demon") {
            particle.style.width = (3 + Math.random() * 4) + "px";
            particle.style.height = particle.style.width;
        }
        document.body.appendChild(particle);
        setTimeout(() => particle.remove(), 1500);
    }
}

function _breakthroughOverlay(type) {
    const overlay = document.createElement("div");
    overlay.className = "breakthrough-overlay";
    if (type === "fail" || type === "insured") overlay.classList.add("fail");
    if (type === "demon") overlay.classList.add("demon");
    if (type === "ascension") overlay.classList.add("ascension");
    document.body.appendChild(overlay);
    const duration = type === "ascension" ? 3500 : type === "demon" ? 2000 : 1500;
    setTimeout(() => overlay.remove(), duration);
}
