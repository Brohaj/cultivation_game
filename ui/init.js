// ============================================================
// UI/INIT.JS — Лог, сохранение UI, инициализация
// Загружается последним из ui/*.js
// ============================================================

// === ЛОГ СОБЫТИЙ ===
// Режим отображения времени: "world" (мировой год) или "char" (возраст персонажа)
let logTimeMode = "world";
let _logScrollState = null;

function _ensureLogScrollState() {
    const log = document.getElementById('event-log');
    if (!log) return null;
    if (_logScrollState?.log === log) return _logScrollState;
    if (_logScrollState) {
        _logScrollState.observer?.disconnect();
        _logScrollState.log.removeEventListener?.('scroll', _logScrollState.onScroll);
    }
    const state = { log, follow: log.scrollHeight - log.clientHeight - log.scrollTop <= 36,
        width: log.clientWidth, height: log.clientHeight, pending: false, observer: null };
    state.onScroll = () => {
        // Изменение раскладки не означает, что читатель ушёл от свежих событий.
        if (state.pending || log.clientWidth !== state.width || log.clientHeight !== state.height) return;
        state.follow = log.scrollHeight - log.clientHeight - log.scrollTop <= 36;
    };
    log.addEventListener?.('scroll', state.onScroll);
    _logScrollState = state;
    if (typeof ResizeObserver === 'function') {
        state.observer = new ResizeObserver(() => {
            state.width = log.clientWidth; state.height = log.clientHeight;
            if (state.follow) _scrollLogToBottom(false);
        });
        state.observer.observe(log);
    }
    return state;
}

function _isLogFollowing() {
    const state = _ensureLogScrollState();
    if (!state) return true;
    const log = state.log;
    if (log.clientWidth === state.width && log.clientHeight === state.height) {
        state.follow = log.scrollHeight - log.clientHeight - log.scrollTop <= 36;
    }
    return state.follow;
}

// После очистки, фильтра и соседних рендеров удерживаем нижнюю границу.
// Ручное чтение старой истории сохраняется, пока игрок сам не выберет свежие записи.
function _scrollLogToBottom(force = true) {
    const state = _ensureLogScrollState();
    if (!state) return;
    if (force) state.follow = true;
    if (!state.follow) return;
    const log = state.log;
    log.scrollTop = log.scrollHeight;
    state.width = log.clientWidth; state.height = log.clientHeight;
    if (state.pending || typeof requestAnimationFrame !== 'function') return;
    state.pending = true;
    requestAnimationFrame(() => {
        state.pending = false;
        if (_logScrollState !== state || log.isConnected === false || !state.follow) return;
        log.scrollTop = log.scrollHeight;
        state.width = log.clientWidth; state.height = log.clientHeight;
    });
}

function _getLogTimeLabel(saved) {
    if (logTimeMode === "char") {
        return `${saved ? saved.charAge : game.characterAge()} л.`;
    }
    return `${saved ? saved.worldYear : game.years} г.`;
}

function toggleLogTimeMode() {
    logTimeMode = logTimeMode === "world" ? "char" : "world";
    const btn = document.getElementById("btn-log-time-toggle");
    if (btn) btn.textContent = logTimeMode === "world" ? "Мир" : "Возраст";
    // Обновить все существующие записи
    const log = document.getElementById("event-log");
    if (!log) return;
    const followedBottom = _isLogFollowing();
    for (const entry of log.children) {
        const y = entry.dataset.worldYear;
        const a = entry.dataset.charAge;
        const txt = entry.dataset.text;
        if (txt) {
            const label = logTimeMode === "char" ? `${a} л.` : `${y} г.`;
            entry.textContent = `[${label}] ${txt}`;
        }
    }
    if (followedBottom) _scrollLogToBottom(false);
}

function addLog(text, type = "system") {
    const log = document.getElementById("event-log");
    if (!log) return;
    const follow = _isLogFollowing();
    const entry = document.createElement("div");
    entry.className = `log-entry log-${type}`;
    // Сохраняем оба значения и текст для переключения
    entry.dataset.worldYear = game.years;
    entry.dataset.charAge = game.characterAge();
    entry.dataset.text = text;
    entry.textContent = `[${_getLogTimeLabel()}] ${text}`;
    log.appendChild(entry);

    // При чтении старой истории не сдвигаем прокрутку и не удаляем её записи.
    // Ограничиваем размер только при следующем событии, когда читатель внизу.
    if (follow) {
        while (log.children.length > 1000) log.removeChild(log.firstChild);
        _scrollLogToBottom(false);
    }
}

// === СКОРОСТЬ ===
function setDebugSpeed(speed) {
    game.setDebugSpeed(speed);
    document.querySelectorAll(".debug-speed-btn").forEach(btn => {
        btn.classList.toggle("active", btn.textContent === `x${speed}`);
    });
}

// === ДЕБАГ-ТОГГЛЫ ===
function debugToggle(key, enabled) {
    if (!game._debugAuto) game._debugAuto = {};
    game._debugAuto[key] = enabled;
    addLog(`[DEBUG] ${key}: ${enabled ? "ВКЛ" : "ВЫКЛ"}`, "system");
}

// === ДЕБАГ ===
function debugAddStats(n) {
    const amt = n || 1;
    game.strength += amt;
    game.spirit += amt;
    game.luck += amt;
    addLog(`[DEBUG] +${amt} сила, +${amt} дух, +${amt} удача`, "system");
    updateUI();
}

function debugMaxQi() {
    game.qi = game.qiNeeded();
    addLog(`[DEBUG] Ци заполнена: ${game.qi}`, "system");
    updateUI();
}

function debugMaxDao() {
    if (typeof game.daoNeeded === "function") {
        game.daoProgress = game.daoNeeded();
        game._checkDaoLevelUp();
        addLog(`[DEBUG] Дао заполнено`, "system");
        updateUI();
    }
}

function debugBreakthrough() {
    // Заполнить ци + дао и сделать прорыв
    game.qi = game.qiNeeded();
    if (typeof game.daoNeeded === "function" && game.sect) {
        game.daoProgress = game.daoNeeded();
        game._checkDaoLevelUp();
    }
    const result = game.breakthrough();
    addLog(`[DEBUG] Прорыв: ${result.result}`, "system");
    updateUI();
}

function debugSetRealm() {
    const input = prompt(`Реалм (0-${REALMS.length - 1}):`, game.realmIndex);
    if (input === null) return;
    const idx = parseInt(input);
    if (isNaN(idx) || idx < 0 || idx >= REALMS.length) return;
    game.realmIndex = idx;
    game.subLevel = 1;
    game.qi = 0;
    addLog(`[DEBUG] Реалм → ${REALMS[idx].name} [${idx}]`, "system");
    updateUI();
}

function debugCompleteExpedition() {
    if (!game.expedition) {
        addLog("[DEBUG] Нет активной экспедиции", "system");
        return;
    }
    game.expedition.startYear = game.years - 9999;
    game.tickExpedition();
    addLog("[DEBUG] Экспедиция завершена", "system");
    updateUI();
}

function debugSectRankUp() {
    if (!game.sect) {
        addLog("[DEBUG] Нет секты", "system");
        return;
    }
    const nextRank = game.getNextSectRank();
    if (!nextRank) {
        addLog("[DEBUG] Уже максимальный ранг", "system");
        return;
    }
    game.sect.contribution = nextRank.contribution;
    game.sect.rank = game.getSectRankIndex();
    addLog(`[DEBUG] Вклад установлен на ${nextRank.contribution} (ранг: ${nextRank.name})`, "system");
    updateUI();
}

function debugGiveResources() {
    game.stones += 1000;
    game.pills += 100;
    game.daoEssence += 500;
    game.artifactDust += 500;
    addLog("[DEBUG] +1000 камней, +100 пилюль, +500 эссенции, +500 пыли", "system");
    updateUI();
}

function debugGiveArtifact() {
    const tiers = ["common", "uncommon", "rare", "epic", "legendary"];
    const tier = tiers[Math.min(Math.floor(game.realmIndex / 2), tiers.length - 1)];
    const art = game.generateArtifact(tier);
    if (art && game.addArtifact(art)) {
        addLog(`[DEBUG] Артефакт: ${art.name} (${ARTIFACT_TIERS[art.tier].name})`, "system");
    } else {
        addLog("[DEBUG] Инвентарь полон", "system");
    }
    updateUI();
}

function debugGiveKarma() {
    if (!game.prestige) game.prestige = {};
    game.prestige.karma = (game.prestige.karma || 0) + 100;
    addLog("[DEBUG] +100 кармы", "system");
    updateUI();
}

function debugSkipYears() {
    for (let i = 0; i < 100; i++) {
        game.passYear();
    }
    addLog("[DEBUG] +100 лет промотано", "system");
    updateUI();
}

// === СОХРАНЕНИЕ UI ===
function onSaveClick() {
    if (saveGame()) {
        addLog("Игра сохранена.", "system");
    }
}

function onNewGameClick() {
    if (confirm("Начать новую игру? Текущий прогресс будет потерян.")) {
        game.reset();
        document.getElementById("event-log").innerHTML = "";
        showSpiritualRootModal();
        updateUI();
    }
}

// === ИНИЦИАЛИЗАЦИЯ ===
function initGame() {
    _ensureLogScrollState();
    // Удерживаем интерактивный DOM до native click, включая касания и клавиатуру.
    document.addEventListener("pointerdown", event => {
        if (event.target?.closest?.("button, input, select, textarea, [role='button'], [onclick]")) {
            beginUIInteraction(event.pointerId);
        }
    }, true);
    document.addEventListener("pointerup", event => endUIInteraction(event.pointerId), true);
    document.addEventListener("pointercancel", event => endUIInteraction(event.pointerId), true);
    document.addEventListener("keydown", event => {
        if ((event.key === "Enter" || event.key === " ") && event.target?.closest?.("button, [role='button']")) {
            beginUIInteraction("key:" + event.key);
        }
    }, true);
    document.addEventListener("keyup", event => {
        if (event.key === "Enter" || event.key === " ") endUIInteraction("key:" + event.key);
    }, true);
    window.addEventListener("blur", () => {
        _uiHeldControls.clear();
        endUIInteraction(null);
    });

    // Биндим табы
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", () => switchTab(btn.dataset.tab));
    });

    // Сбросить состояние кнопки паузы (Chrome может кешировать DOM)
    const pauseBtn = document.getElementById("btn-pause");
    if (pauseBtn) {
        pauseBtn.textContent = "\u23F8 Пауза";
        pauseBtn.classList.remove("btn-pause-active");
    }

    // Биндим кнопки
    document.getElementById("btn-breakthrough").addEventListener("click", () => breakthroughUI());
    document.getElementById("btn-save").addEventListener("click", onSaveClick);
    document.getElementById("btn-new-game").addEventListener("click", onNewGameClick);
    document.getElementById("btn-log-time-toggle").addEventListener("click", toggleLogTimeMode);

    // Проверяем сейв
    if (hasSave()) {
        const data = loadGame();
        if (data && applyLoadedState(data)) {
            addLog("Игра загружена.", "system");
            resumeLoadedGame();
            if (game.gameOver && !game.pendingRebirth) {
                // Персонаж мёртв — не запускаем тики, показываем баннер смерти
                addLog("Ваш персонаж мёртв. Переродитесь для продолжения.", "danger");
            }
            return;
        }
    }

    // Новая игра — показываем модалку корня
    showSpiritualRootModal();
    updateUI();
}

// Запуск при загрузке DOM
document.addEventListener("DOMContentLoaded", initGame);

// Сохранение при закрытии/обновлении страницы
window.addEventListener("beforeunload", () => { if (!game.gameOver) saveGame(); });
