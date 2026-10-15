// Две редкие сцены обучения. Цена письма — ориентир прототипа, не обязательный расход.
const DISCIPLE_EVENT_TRAINING = { essence: 20, xp: 30 };

Object.assign(game, {
    _getDiscipleEventLearners() {
        if (!this.sect || !this.getDiscipleCapacity() || this.gameOver || this.pendingRebirth || this.disciplesState?.sectId !== this.sect.id) return [];
        return this.disciplesState.roster.filter(d => this._isDiscipleAlive(d) && d.level < DISCIPLE_CONFIG.maxLevel);
    },

    _grantDiscipleEventXP(discipleId, amount) {
        if (!Number.isSafeInteger(amount) || amount <= 0) return false;
        const disciple = this._getDiscipleEventLearners().find(d => d.id === discipleId);
        if (!disciple) return false;
        disciple.xp += amount;
        while (disciple.level < DISCIPLE_CONFIG.maxLevel) {
            const needed = this.getDiscipleXpNeeded(disciple);
            if (!Number.isFinite(needed) || needed <= 0 || disciple.xp < needed) break;
            disciple.xp -= needed;
            disciple.level++;
            addLog(`${disciple.name} достиг ${disciple.level} уровня обучения.`, "cultivation");
        }
        return true;
    },

    canTriggerDiscipleHelpEvent() {
        return !this.expedition && !this.flags.discipleHelpEventSeen && this._getDiscipleEventLearners().length > 0;
    },

    triggerDiscipleHelpEvent(discipleId = null) {
        if (!this.canTriggerDiscipleHelpEvent()) return false;
        const learners = this._getDiscipleEventLearners();
        const disciple = discipleId ? learners.find(d => d.id === discipleId) : learners[Math.floor(Math.random() * learners.length)];
        if (!disciple || !this._grantDiscipleEventXP(disciple.id, 5)) return false;
        this.flags.discipleHelpEventSeen = true;
        this.flags.discipleHelpTargetId = disciple.id;
        saveGame();
        if (typeof renderDisciples === "function") renderDisciples();
        return `${disciple.name} закрепляет урок на практике. +5 XP ученику.`;
    },

    canTriggerDiscipleLetterEvent() {
        return !this.expedition && !this.flags.discipleLetterEventSeen && this._getDiscipleEventLearners().length > 0;
    },

    triggerDiscipleLetterEvent(discipleId = null) {
        if (!this.canTriggerDiscipleLetterEvent()) return false;
        const learners = this._getDiscipleEventLearners();
        const disciple = discipleId ? learners.find(d => d.id === discipleId) : learners[Math.floor(Math.random() * learners.length)];
        if (!disciple) return false;
        this.flags.discipleLetterEventSeen = true;
        this.flags.discipleTrainingOffer = {
            id: `disciple-letter:${this.sect.id}:${disciple.id}:${this.years}`,
            discipleId: disciple.id, sectId: this.sect.id, issuedYear: this.years,
        };
        saveGame();
        if (typeof renderDisciples === "function") renderDisciples();
        return `Письмо от ${disciple.name}: ${DISCIPLE_EVENT_TRAINING.essence} эссенции для практики → ${DISCIPLE_EVENT_TRAINING.xp} XP ученику. Решение — на карточке ученика в секте.`;
    },

    getDiscipleTrainingOffer() {
        const offer = this.flags.discipleTrainingOffer;
        if (!offer || typeof offer.id !== "string" || !this.sect || this.gameOver || this.pendingRebirth
            || offer.sectId !== this.sect.id || this.disciplesState?.sectId !== this.sect.id) return null;
        const disciple = this.disciplesState.roster.find(d => d.id === offer.discipleId);
        if (!disciple || !this.getDiscipleCapacity() || !this._isDiscipleAlive(disciple)) return null;
        const maxed = disciple.level >= DISCIPLE_CONFIG.maxLevel;
        const enough = this.daoEssence >= DISCIPLE_EVENT_TRAINING.essence;
        return { id: offer.id, discipleId: disciple.id, name: disciple.name, issuedYear: offer.issuedYear,
            cost: DISCIPLE_EVENT_TRAINING.essence, xp: DISCIPLE_EVENT_TRAINING.xp,
            maxed, canAccept: !maxed && enough,
            reason: maxed ? "Ученик уже достиг максимального уровня." : enough ? "" : "Не хватает эссенции. Письмо остаётся доступным." };
    },

    acceptDiscipleTrainingOffer(offerId) {
        const offer = this.getDiscipleTrainingOffer();
        if (!offer || offer.id !== offerId || !offer.canAccept) return false;
        // Результат фиксируется до начисления XP, повторный клик не оплачивается.
        this.flags.discipleTrainingOffer = null;
        this.flags.discipleTrainingDecision = { discipleId: offer.discipleId, outcome: "accepted", year: this.years };
        this.daoEssence -= offer.cost;
        this._grantDiscipleEventXP(offer.discipleId, offer.xp);
        addLog(`${offer.name}: практика поддержана. −${offer.cost} эссенции, +${offer.xp} XP ученику.`, "reward");
        saveGame();
        if (typeof renderDisciples === "function") renderDisciples();
        return true;
    },

    declineDiscipleTrainingOffer(offerId) {
        const offer = this.getDiscipleTrainingOffer();
        if (!offer || offer.id !== offerId) return false;
        this.flags.discipleTrainingOffer = null;
        this.flags.discipleTrainingDecision = { discipleId: offer.discipleId, outcome: "declined", year: this.years };
        addLog(offer.maxed ? `${offer.name} уже завершил обучение. Письмо закрыто.`
            : `${offer.name} продолжает обычные занятия. Вы оставили прежний темп обучения.`, "event");
        saveGame();
        if (typeof renderDisciples === "function") renderDisciples();
        return true;
    },
});
