// Представление V2: текущая ступень, компактная история и словарь.
// Расчёты и действия всегда берём из общей игровой логики.
(() => {
    let logFilter = "all";
    let unreadLogs = 0;
    const byId = id => document.getElementById(id);
    const setText = (id, text) => { const node = byId(id); if (node && node.textContent !== text) node.textContent = text; };
    const important = entry => {
        if (/log-(danger|breakthrough|cultivation)/.test(entry.className)) return true;
        const text = entry.dataset.text || entry.textContent;
        if (/слух|новый этап приключения|формация разблокирована|изучена .*техника|изучена техника|вступили в секту/i.test(text)) return true;
        if (/артефакт.*(?:мистический|небесный|священный|божественный)/i.test(text)) return true;
        return /свиток|свитки|карм[аы]|скрытый мастер|редк(?:ая|ие|ий|ое) наход/i.test(text);
    };
    function readableLog(text) {
        return _v2UpdateCopy(text)
            .replace(/^Озарение(?=\s|×)/, "Обучение техник")
            .replace(/экипированным техникам/g, "используемым техникам")
            .replace(/След\.:/g, "Следующая цена:");
    }

    function refreshLogPreview() {
        const log = byId("event-log");
        if (!log) return;
        const entries = [...log.children];
        for (const entry of entries) entry.hidden = logFilter === "important" && !important(entry);
        const visibleCount = entries.filter(entry => !entry.hidden).length;
        setText("v2-log-count", logFilter === "important" ? `${visibleCount} из ${entries.length}` : `${entries.length} записей`);
        updateUnreadIndicator();
    }

    function updateUnreadIndicator() {
        const latest = byId("v2-log-latest");
        if (latest) {
            latest.hidden = unreadLogs === 0;
            latest.textContent = `↓ Новое: ${unreadLogs}`;
        }
    }

    const baseAddLog = window.addLog;
    window.addLog = function(text, type) {
        const log = byId("event-log");
        const oldPosition = log?.scrollTop || 0;
        const follow = !log || log.scrollHeight - oldPosition - log.clientHeight < 36;
        baseAddLog(readableLog(text), type);
        refreshLogPreview();
        if (log) {
            if (follow) { log.scrollTop = log.scrollHeight; unreadLogs = 0; }
            else if (log.lastElementChild && !log.lastElementChild.hidden) unreadLogs++;
        }
        updateUnreadIndicator();
    };
    const baseToggleLogTimeMode = window.toggleLogTimeMode;
    window.toggleLogTimeMode = function() {
        baseToggleLogTimeMode();
        refreshLogPreview();
    };
    const baseTogglePause = window.togglePause;
    window.togglePause = function() {
        baseTogglePause();
        window.updateV2Summary();
    };

    function drawChecks(checks) {
        const box = byId("v2-goal-checklist");
        if (!box) return;
        const signature = JSON.stringify(checks);
        if (box.dataset.checks === signature) return;
        box.dataset.checks = signature;
        box.replaceChildren();
        for (const check of checks) {
            const node = document.createElement("span");
            node.className = "v2-check " + (check.ready ? "ready" : "pending");
            node.textContent = `${check.ready ? "✓" : "○"} ${check.text}`;
            box.appendChild(node);
        }
    }

    window.updateV2Summary = function() {
        if (!byId("v2-goal-title")) return;
        const top = game.realmIndex >= REALMS.length - 1;
        const nextRealm = game.subLevel === SUB_LEVELS ? game.realmIndex + 1 : game.realmIndex;
        const qiNeeded = game.qiNeeded();
        const requiredDao = game.realmIndex >= 3 ? (game.realmIndex - 3) * SUB_LEVELS + game.subLevel : 0;
        const daoReady = !requiredDao || (game.sect && game.daoLevel >= requiredDao);
        const barrierReady = game.subLevel !== SUB_LEVELS || game.meetsRealmRequirement(nextRealm);
        const checks = [];
        const lifeEnded = !!(game.gameOver || game.pendingRebirth);
        const title = lifeEnded ? "Следующая жизнь" : top ? "Золотой Бессмертный · вершина пути" : `${REALMS[game.realmIndex].name} · ${SUB_LEVEL_NAMES[game.subLevel - 1].toLowerCase()}`;
        setText("v2-goal-title", title);
        const scene = window.v2GetBreakthroughLore?.(game.realmIndex, game.subLevel);
        const description = scene ? scene.text.match(/^.*?[.!?](?:\s|$)/)?.[0].trim() || scene.text
            : game.realmIndex === 0 ? "Старый свиток открыт перед вами. За привычным дыханием едва угадывается движение ци." : REALMS[game.realmIndex].desc;
        setText("v2-next-step", lifeEnded ? "Пламя этой жизни угасло. Впереди — новое рождение." : description);
        if (!top && !lifeEnded) {
            if (requiredDao) checks.push({ ready: !!daoReady, text: game.sect ? `Путь секты ${game.daoLevel} / ${requiredDao}` : "Нужна секта" });
            if (!barrierReady) {
                const req = game.getRealmPrestigeRequirement(nextRealm);
                checks.push({ ready: game.prestige.totalRebirths >= req.rebirths, text: `Перерождения ${game.prestige.totalRebirths} / ${req.rebirths}` });
                const earnedKarma = game.prestige.karma + game._getTotalKarmaSpent();
                checks.push({ ready: earnedKarma >= req.karma, text: `Карма ${earnedKarma} / ${req.karma}` });
            }
        }
        drawChecks(checks);
        const btBtn = byId("btn-breakthrough");
        if (byId("breakthrough-chance")) byId("breakthrough-chance").hidden = game.realmIndex < 3 || top || lifeEnded;
        if (btBtn) {
            btBtn.textContent = top ? "Последняя ступень" : "Совершить прорыв";
            // canBreakthrough проверяет ци; дополнительные запреты берём из механики.
            btBtn.disabled = !game.canBreakthrough() || !daoReady || !barrierReady;
            const badge = byId("breakthrough-badge");
            if (badge) badge.style.display = btBtn.disabled ? "none" : "";
        }
        if (top) {
            if (game.currentActivity === "meditation") setText("main-progress-title", "Запас ци");
            const risk = byId("v2-breakthrough-risk");
            if (risk) risk.style.display = "none";
            const probabilities = document.querySelector(".breakthrough-info");
            if (probabilities) probabilities.hidden = true;
        } else {
            const probabilities = document.querySelector(".breakthrough-info");
            if (probabilities) probabilities.hidden = false;
        }
        const overview = byId("v2-qi-overview");
        if (overview) {
            overview.hidden = game.currentActivity === "meditation" || top;
            setText("v2-qi-overview-text", `Запас ци для прорыва: ${Math.floor(game.qi)} / ${qiNeeded}`);
            byId("v2-qi-overview-bar").style.width = Math.min(100, game.qi / qiNeeded * 100) + "%";
        }
        setText("v2-current-activity", lifeEnded ? "Эта жизнь завершена" : game._paused ? "Игра на паузе" : "");
        if (lifeEnded) setText("qi-rate", "0");
        setText("btn-pause", game._paused ? "▶ Продолжить" : "⏸ Пауза");
        if (byId("btn-pause")) {
            byId("btn-pause").classList.toggle("btn-pause-active", !!game._paused);
            byId("btn-pause").disabled = !!(game.gameOver || game.pendingRebirth);
        }
        const activityHelp = byId("v2-activity-help");
        if (activityHelp) {
            activityHelp.hidden = !game.expedition || game.currentActivity !== "meditation" || lifeEnded;
            setText("v2-activity-help", "Медитация приостановлена на время похода.");
        }
        const purposes = { meditation: "Накапливает ци", body: "Повышает силу", dao: "Повышает дух", fate: "Повышает удачу" };
        const sect = game.sect && SECTS.find(item => item.id === game.sect.id);
        const sectActivities = sect?.id === "hidden_hermit" ? ["body", "dao", "fate"]
            : Array.isArray(sect?.daoActivity) ? sect.daoActivity : [sect?.daoActivity];
        for (const [key, purpose] of Object.entries(purposes)) {
            const row = document.querySelector(`.activity-row[data-activity="${key}"]`);
            const developsSect = !!sect && sectActivities.includes(key);
            row?.setAttribute("aria-pressed", String(game.currentActivity === key));
            if (row) {
                row.disabled = lifeEnded;
                row.classList.toggle("activity-sect-path", developsSect);
                if (developsSect) row.title = `${purpose}. Развивает путь секты${game.realmIndex < 3 ? " с Золотого Ядра" : ""}.`;
            }
            setText(`activity-info-${key}`, developsSect ? `${game.currentActivity === key ? "✓ " : "☯ "}Путь секты` : game.currentActivity === key ? "✓ Выбрано" : purpose);
        }
        const supplies = byId("v2-supplies");
        if (supplies) supplies.hidden = !(game.pills || game.refinedPills || game.spiritualPills || game.heavenlyPills || game.prestige.totalRebirths);
        const maxAge = game.maxAge(), age = game.characterAge();
        document.querySelector(".v2-age")?.classList.toggle("v2-age-warning", Number.isFinite(maxAge) && maxAge - age <= 15);
        setText("v2-tip-essence", window.V2_TERMS?.essence?.text || "Материал из походов и разбора артефактов. Нужен для обучения техник и улучшения предметов.");
        setText("v2-tip-dust", window.V2_TERMS?.dust?.text || "Материал из походов и разбора артефактов. Нужен для заточки, слияния и очистки пилюль.");
        setText("v2-tip-scrolls", "Свитки Воли Дао увеличивают шанс заточки на 2 процентных пункта каждый. До 10 свитков на попытку; бонус расходуется при успехе.");
        setText("tip-pills-all", "Пилюли дают ци сразу. Духовные также помогают пути секты и следующему прорыву; небесные повышают наименьшую характеристику.");
        for (const id of ["pills-row", "essence-row", "dust-row", "scrolls-row"]) {
            if (byId(id)) byId(id).style.display = "";
        }
        for (const [kind, amount] of [["refined", game.refinedPills], ["spiritual", game.spiritualPills], ["heavenly", game.heavenlyPills]]) {
            setText(`v2-${kind}-stock`, amount || 0);
            if (byId(`v2-${kind}-stock-row`)) byId(`v2-${kind}-stock-row`).hidden = !amount;
        }
        const attention = byId("v2-event-attention");
        if (attention) {
            const choices = game.activeAdventures.filter(adv => adv.awaitingChoice).length;
            const rumors = game.adventureRumors.length;
            attention.hidden = choices + rumors === 0;
            setText("v2-event-attention-text", choices ? `Ожидают решения: ${choices}` : `Новые слухи: ${rumors}`);
        }
        window.refreshV2Tooltip?.();
    };

    document.addEventListener("DOMContentLoaded", () => {
        const glossary = byId("v2-glossary");
        if (glossary) {
            for (const term of Object.values(window.V2_TERMS || {})) {
                const article = document.createElement("article");
                const heading = document.createElement("h4");
                const description = document.createElement("p");
                heading.textContent = term.label;
                description.textContent = term.text;
                article.append(heading, description);
                glossary.appendChild(article);
            }
        }
        document.querySelectorAll("[data-log-filter]").forEach(button => {
            button.addEventListener("click", () => {
                logFilter = button.dataset.logFilter;
                document.querySelectorAll("[data-log-filter]").forEach(item => {
                    const active = item === button;
                    item.classList.toggle("active", active);
                    item.setAttribute("aria-pressed", String(active));
                });
                refreshLogPreview();
                byId("event-log").scrollTop = byId("event-log").scrollHeight;
                unreadLogs = 0;
                updateUnreadIndicator();
            });
        });
        byId("v2-log-latest")?.addEventListener("click", () => {
            const log = byId("event-log");
            log.scrollTop = log.scrollHeight;
            unreadLogs = 0;
            refreshLogPreview();
        });
        byId("event-log")?.addEventListener("scroll", () => {
            const log = byId("event-log");
            if (unreadLogs && log.scrollHeight - log.scrollTop - log.clientHeight < 36) {
                unreadLogs = 0;
                refreshLogPreview();
            }
        });
        // Информация по наведению также доступна с клавиатуры и по касанию.
        document.querySelectorAll(".stats-panel .stat-with-tip, .v2-world .header-with-tip").forEach(node => { node.tabIndex = 0; });
        window.updateV2Summary();
        refreshLogPreview();
    });
})();
