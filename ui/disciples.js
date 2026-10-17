// Ученики растут и помогают автоматически. Рендер не обновляет предложения.
let _discipleDismissPendingId = null;
let _discipleUIMessage = "";

function _discipleEscape(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[ch]);
}
function _discipleQualityName(quality) { return DISCIPLE_QUALITIES[quality]?.name || quality; }
function _discipleQualityColor(quality) { return DISCIPLE_QUALITIES[quality]?.color || "#aaa"; }
function _discipleRate(rate) { return Number.isFinite(rate) ? Number(rate.toFixed(3)).toLocaleString("ru-RU") : "0"; }
function _discipleYears(years) {
    const value = Math.max(0, Math.ceil(Number(years) || 0));
    return `${value} ${_plural(value, "год", "года", "лет")}`;
}
function _discipleIncomeText(rate) {
    const amount = Number.isFinite(rate) ? rate : 0;
    return `${_discipleRate(amount)} ${Number.isInteger(amount) ? _plural(amount, "камень", "камня", "камней") : "камня"}/год`;
}
function _discipleSkillPercent(person, level = person.level) {
    return Math.round(game.getDiscipleSkill({ ...person, level }) * 100);
}
function _discipleIdentity(person) {
    return `<div class="disciple-topline"><span class="disciple-name">${_discipleEscape(person.name)}</span><span class="disciple-quality disciple-quality-${_discipleEscape(person.quality)}" style="color:${_discipleQualityColor(person.quality)}">${_discipleEscape(_discipleQualityName(person.quality))}</span></div>`;
}

function _discipleCard(disciple, training) {
    const id = _discipleEscape(disciple.id);
    const disabled = game.gameOver || game.pendingRebirth;
    const trainingOffer = training?.discipleId === disciple.id ? `<div class="disciple-training-offer" data-offer-id="${_discipleEscape(training.id)}">
        <p class="disciple-meta"><b>Письмо ученика</b> · ${training.cost} эссенции → ${training.xp} XP ученику сразу.</p>
        ${training.reason ? `<p class="disciple-unavailable">${_discipleEscape(training.reason)}</p>` : ""}
        <div class="disciple-controls"><button class="btn btn-small btn-primary" data-offer-id="${_discipleEscape(training.id)}" onclick="acceptDiscipleTrainingUI(this.dataset.offerId)" ${training.canAccept ? "" : "disabled"}>Поддержать (${training.cost} эсс.)</button><button class="btn btn-small btn-secondary" data-offer-id="${_discipleEscape(training.id)}" onclick="declineDiscipleTrainingUI(this.dataset.offerId)">${training.maxed ? "Закрыть письмо" : "Пусть растёт сам"}</button></div>
    </div>` : "";
    return `<article class="disciple-card" data-disciple-id="${id}">
        ${_discipleIdentity(disciple)}
        <p class="disciple-age"></p>
        <div class="disciple-meta disciple-level-xp"></div>
        <div class="disciple-xp" role="progressbar" aria-label="Опыт ученика" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"><div class="disciple-xp-fill" style="width:0%"></div></div>
        <p class="disciple-income"></p>
        ${trainingOffer}
        <div class="disciple-controls"><button class="btn btn-small btn-secondary disciple-dismiss" data-disciple-id="${id}" onclick="showDismissDiscipleUI(this.dataset.discipleId)" ${disabled ? "disabled" : ""}>Отпустить…</button></div>
        ${_discipleDismissPendingId === disciple.id ? `<div class="disciple-dismiss-confirm"><p class="disciple-unavailable">Ученик покинет секту вместе с прогрессом обучения. Камни за найм не возвращаются.</p><div class="disciple-controls"><button class="btn btn-small btn-danger-btn" data-disciple-id="${id}" onclick="dismissDiscipleUI(this.dataset.discipleId)">Отпустить</button><button class="btn btn-small btn-secondary" onclick="cancelDismissDiscipleUI()">Оставить</button></div></div>` : ""}
    </article>`;
}

function _discipleAutoHireStatus(view, enabled) {
    if (game.gameOver || game.pendingRebirth) return "Найм возобновится в новой жизни после вступления в секту.";
    if (view.disciples.length >= view.capacity) return "Свободных мест нет. Автонаём не заменяет нынешних учеников.";
    const qualityRank = { common: 0, uncommon: 1, rare: 2 };
    const byPriority = (a, b) => (qualityRank[b.quality] ?? -1) - (qualityRank[a.quality] ?? -1)
        || game._getDiscipleAgeView(b).remainingYears - game._getDiscipleAgeView(a).remainingYears || a.id.localeCompare(b.id);
    const offers = view.candidates.filter(candidate => candidate.expiresYear > game.years && game._isDiscipleAlive(candidate))
        .sort(byPriority);
    const best = offers.find(candidate => game.stones >= candidate.cost);
    if (best) return `Лучшее доступное предложение: ${_discipleQualityName(best.quality)} · ${best.cost} камней · предложение ещё ${_discipleYears(best.expiresYear - game.years)}. ${enabled ? "Автонаём проверит предложения в следующем году." : "Включите автонаём для найма."}`;
    if (offers.length) return `Пока не хватает камней. Лучшее предложение: ${_discipleQualityName(offers[0].quality)} · ${offers[0].cost} камней · предложение ещё ${_discipleYears(offers[0].expiresYear - game.years)}.`;
    return view.nextDeliveryIn === null ? "Действующих предложений нет. Ожидаем новых кандидатов."
        : `Действующих предложений нет. Новые кандидаты через ${_discipleYears(view.nextDeliveryIn)}.`;
}

function renderDisciples() {
    if (deferUIRender(renderDisciples)) return;
    const section = document.getElementById("disciples-section");
    if (!section || typeof game.getDiscipleView !== "function") return;
    const view = game.getDiscipleView();
    if (!view.disciples.some(d => d.id === _discipleDismissPendingId)) _discipleDismissPendingId = null;
    const training = typeof game.getDiscipleTrainingOffer === "function" ? game.getDiscipleTrainingOffer() : null;
    const autoHirePurchased = (game.prestige?.karmaUpgrades?.autoDiscipleHire || 0) > 0;
    const autoHireEnabled = autoHirePurchased && typeof game.isDiscipleAutoHireEnabled === "function"
        && game.isDiscipleAutoHireEnabled();
    const structure = JSON.stringify({
        sectId:view.sectId, available:view.available, unlocked:view.unlocked, capacity:view.capacity, discount:view.discount,
        disabled:!!(game.gameOver || game.pendingRebirth), message:_discipleUIMessage, dismiss:_discipleDismissPendingId,
        autoHirePurchased, autoHireEnabled,
        disciples:view.disciples.map(d => ({id:d.id,name:d.name,quality:d.quality})),
        candidates:view.candidates.map(c => ({id:c.id,name:c.name,quality:c.quality,cost:c.cost,
            canHire:c.canHire,expired:c.expiresIn <= 0,affordable:game.stones >= c.cost})),
        vacancies:view.offerVacancies, training,
    });
    section.dataset.sectId = view.sectId || "";
    section._discipleCandidates = view.candidates;
    section._discipleNextRefreshYear = view.nextRefreshYear;
    if (section._discipleStructure === structure && (!view.available || section.querySelector(".disciples-heading"))) {
        updateDisciplesProgress(view); return;
    }
    section._discipleStructure = structure;
    if (!view.available) { section.innerHTML = ""; return; }
    if (!view.unlocked) {
        section.innerHTML = '<div class="disciples-heading"><h4>Ваши ученики</h4></div><p class="disciples-help">Ученики появятся после повышения до Внутреннего ученика. На этом ранге вы сможете принять двух учеников.</p>';
        return;
    }
    const discount = Math.round(view.discount * 100);
    const candidates = view.candidates.map(candidate => {
        const id = _discipleEscape(candidate.id);
        const full = view.disciples.length >= view.capacity;
        return `<article class="disciple-candidate" data-candidate-id="${id}">
            ${_discipleIdentity(candidate)}
            <p class="disciple-age"></p>
            <p class="disciple-meta">Навык: ${_discipleSkillPercent(candidate, 1)}% при найме → ${_discipleSkillPercent(candidate, DISCIPLE_CONFIG.maxLevel)}% на 10 ур.</p>
            <p class="disciple-price">Приём: <b>${candidate.cost}</b> камней${discount > 0 ? ` · скидка ${discount}%` : ""}</p>
            <p class="disciple-offer-expiry"></p>
            <button class="btn btn-small btn-primary" data-candidate-id="${id}" onclick="hireDiscipleUI(this.dataset.candidateId)" ${candidate.canHire && !game.gameOver && !game.pendingRebirth ? "" : "disabled"}>${candidate.expiresIn <= 0 ? "Срок истёк" : full ? "Нет свободных мест" : game.stones < candidate.cost ? "Не хватает камней" : "Принять"}</button>
        </article>`;
    }).join("");
    section.innerHTML = `<div class="disciples-heading"><h4>Ваши ученики</h4><span class="disciples-capacity">${view.disciples.length}/${view.capacity} мест</span></div>
        <p class="disciples-help">Ученики растут, приносят камни и выполняют доступные задания секты автоматически.</p>
        <p class="disciples-budget"><span class="disciples-total-income"></span> · <span class="disciples-auto-status">${_discipleEscape(view.autoMissionStatus)}</span></p>
        <div class="disciples-autohire">
            <p class="disciples-help"><b>Автонаём:</b> заполняет только свободные места лучшими доступными кандидатами за обычные камни. Уже обученных учеников не увольняет.</p>
            ${autoHirePurchased ? `<div class="disciple-controls"><button class="btn btn-small btn-secondary disciples-autohire-toggle" type="button" aria-pressed="${autoHireEnabled}" onclick="toggleDiscipleAutoHireUI()" ${game.gameOver || game.pendingRebirth ? "disabled" : ""}>Автонаём: ${autoHireEnabled ? "включён" : "выключен"}</button></div><p class="disciples-help disciples-autohire-status"></p>`
                : '<p class="disciple-unavailable">Открывается за карму в окне перерождения.</p>'}
        </div>
        ${_discipleUIMessage ? `<p class="disciple-unavailable" role="status">${_discipleEscape(_discipleUIMessage)}</p>` : ""}
        ${view.disciples.length ? `<div class="disciple-roster">${view.disciples.map(d => _discipleCard(d,training)).join("")}</div>` : '<p class="disciple-empty">У вас пока нет учеников.</p>'}
        <div class="disciples-heading disciples-candidates-heading"><h4>Ищут наставника</h4><span class="disciple-delivery"></span></div>
        <div class="disciple-candidates">${candidates}</div>
        ${view.offerVacancies > 0 ? `<p class="disciple-empty">Свободных предложений: ${view.offerVacancies}. Новые желающие придут по истечении срока ожидания.</p>` : ""}`;
    updateDisciplesProgress(view);
}

function _setDiscipleText(node, text) {
    if (node && node.textContent !== text) node.textContent = text;
}

// Только чистые расчёты по текущему составу: getDiscipleView и генератор кандидатов здесь не вызываются.
function updateDisciplesProgress(view = null) {
    const section = document.getElementById("disciples-section");
    if (!section || !game.sect || section.dataset.sectId !== game.sect.id) return;
    const state = game.disciplesState;
    const roster = view ? view.disciples : (state?.sectId === game.sect.id ? state.roster : []);
    const people = new Map(roster.map(d => [d.id,d]));
    let income = 0;
    for (const card of section.querySelectorAll(".disciple-card")) {
        const disciple = people.get(card.dataset.discipleId);
        if (!disciple) continue;
        const age = game._getDiscipleAgeView(disciple);
        const needed = game.getDiscipleXpNeeded(disciple);
        const nextLevel = Number.isFinite(needed) && needed > 0;
        const progress = nextLevel ? Math.max(0, Math.min(100, disciple.xp / needed * 100)) : 100;
        const xpText = nextLevel ? `${_discipleRate(disciple.xp)} / ${Math.ceil(needed)} XP` : "Мастерство достигнуто";
        const rate = game.getDiscipleHouseholdRate(disciple);
        income += rate;
        _setDiscipleText(card.querySelector(".disciple-age"),`Возраст: ${age.age} / ${age.lifespan} лет · осталось ${_discipleYears(age.remainingYears)}`);
        _setDiscipleText(card.querySelector(".disciple-level-xp"),`Уровень ${disciple.level} · навык ${_discipleSkillPercent(disciple)}% · ${xpText}`);
        _setDiscipleText(card.querySelector(".disciple-income"),`Доход: ${_discipleIncomeText(rate)}`);
        const bar = card.querySelector(".disciple-xp"), fill = card.querySelector(".disciple-xp-fill");
        if (!bar || !fill) continue;
        const width = `${Number(progress.toFixed(4))}%`;
        // Проценты разных уровней не интерполируются: новый уровень начинается с нового остатка XP.
        if (card.dataset.discipleLevel !== String(disciple.level)) {
            fill.style.transition = "none";
            fill.style.width = width;
            void fill.offsetWidth;
            fill.style.transition = "";
            card.dataset.discipleLevel = String(disciple.level);
        } else if (fill.style.width !== width) fill.style.width = width;
        bar.setAttribute("aria-valuenow",String(Number(progress.toFixed(2))));
    }
    const active = !game.gameOver && !game.pendingRebirth && state?.sectId === game.sect.id && game.getDiscipleCapacity() > 0;
    const total = view ? view.incomeRate : active ? Math.min(game.getDiscipleHouseholdCap(),income) : 0;
    _setDiscipleText(section.querySelector(".disciples-total-income"),_discipleIncomeText(total));
    const next = view ? view.nextDeliveryIn : section._discipleNextRefreshYear === null ? null
        : Math.max(0,(section._discipleNextRefreshYear ?? game.years)-game.years);
    _setDiscipleText(section.querySelector(".disciple-delivery"),`Новые кандидаты через ${_discipleYears(next)}`);
    const statusView = view || { disciples: roster, capacity: game.getDiscipleCapacity(),
        candidates: section._discipleCandidates || [], nextDeliveryIn: next };
    const autoHireStatus = section.querySelector(".disciples-autohire-status");
    if (autoHireStatus) _setDiscipleText(autoHireStatus,_discipleAutoHireStatus(statusView,game.isDiscipleAutoHireEnabled()));
    const candidates = new Map((section._discipleCandidates || []).map(c => [c.id,c]));
    for (const card of section.querySelectorAll(".disciple-candidate")) {
        const candidate = candidates.get(card.dataset.candidateId);
        if (!candidate) continue;
        const age = game._getDiscipleAgeView(candidate);
        const remaining = candidate.expiresYear-game.years;
        _setDiscipleText(card.querySelector(".disciple-age"),`Возраст: ${age.age} лет · жизнь до ${age.lifespan} лет`);
        _setDiscipleText(card.querySelector(".disciple-offer-expiry"),remaining > 0
            ? `Предложение ещё ${_discipleYears(remaining)}` : "Срок предложения истёк");
    }
}

function hireDiscipleUI(candidateId) {
    const success = game.hireDisciple(candidateId);
    _discipleUIMessage = success ? "" : "Предложение истекло, состав заполнен или не хватает камней.";
    renderSects();
}
function toggleDiscipleAutoHireUI() {
    if (typeof game.isDiscipleAutoHireEnabled !== "function" || typeof game.setDiscipleAutoHireEnabled !== "function") return;
    game.setDiscipleAutoHireEnabled(!game.isDiscipleAutoHireEnabled());
}
function showDismissDiscipleUI(id) { _discipleDismissPendingId = id; renderDisciples(); }
function cancelDismissDiscipleUI() { _discipleDismissPendingId = null; renderDisciples(); }
function dismissDiscipleUI(id) {
    if (_discipleDismissPendingId !== id) return;
    const success = game.dismissDisciple(id);
    _discipleDismissPendingId = null;
    _discipleUIMessage = success ? "" : "Ученик уже покинул состав.";
    renderSects();
}
function acceptDiscipleTrainingUI(offerId) {
    const success = game.acceptDiscipleTrainingOffer(offerId);
    _discipleUIMessage = success ? "" : "Практика сейчас недоступна. Эссенция не потрачена.";
    renderSects();
}
function declineDiscipleTrainingUI(offerId) {
    game.declineDiscipleTrainingOffer(offerId);
    _discipleUIMessage = "";
    renderSects();
}
function getDiscipleLeaveWarning() {
    if (typeof game.getDiscipleView !== "function") return "";
    const disciples = game.getDiscipleView().disciples;
    return disciples.length ? ` Вы теряете учеников и их обучение: ${disciples.map(d => d.name).join(", ")}. Плата за найм не возвращается.` : "";
}
