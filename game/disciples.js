// Нанятые ученики приносят камни и помогают с обычными заданиями автоматически.
Object.assign(game, {
    _getDiscipleState() {
        if (!this.disciplesState) this.disciplesState = createDiscipleState();
        return this.disciplesState;
    },

    _isDiscipleAlive(disciple) {
        return !!disciple && Number.isFinite(disciple.birthYear) && Number.isFinite(disciple.maxAge)
            && this.years - disciple.birthYear < disciple.maxAge;
    },

    _getDiscipleAgeView(disciple) {
        const age = Math.max(0, this.years - disciple.birthYear);
        return { age, lifespan: disciple.maxAge, remainingYears: Math.max(0, disciple.maxAge - age) };
    },

    _restoreDiscipleState(raw) {
        const state = createDiscipleState();
        const saved = raw && typeof raw === "object" ? raw : {};
        state.sectId = this.sect?.id || null;
        state.nextId = Number.isSafeInteger(saved.nextId) && saved.nextId > 0 ? saved.nextId : 1;
        state.lastProcessedYear = Number.isFinite(saved.lastProcessedYear) ? saved.lastProcessedYear : null;
        for (const key of ["slotPaidYears", "slotAttemptYears", "missionReadyYears"]) {
            state[key] = Array.from({ length: DISCIPLE_CONFIG.slots }, (_, i) =>
                Number.isFinite(saved[key]?.[i]) ? saved[key][i] : null);
        }
        state.householdCarry = Number.isFinite(saved.householdCarry) && saved.householdCarry >= 0 && saved.householdCarry < 1
            ? saved.householdCarry : 0;
        const valid = item => item && typeof item.id === "string" && typeof item.name === "string"
            && Object.hasOwn(DISCIPLE_QUALITIES, item.quality);
        const lifetime = item => ({
            birthYear: Number.isFinite(item.birthYear) ? item.birthYear : this.years - DISCIPLE_CONFIG.candidateAge.min,
            maxAge: Number.isFinite(item.maxAge) && item.maxAge > 0
                ? item.maxAge : DISCIPLE_QUALITIES[item.quality].lifespan.min,
        });
        for (const sect of SECTS) {
            const offers = saved.offersBySect?.[sect.id];
            if (!offers) continue;
            const oldCandidates = Array.isArray(offers.candidates) ? offers.candidates : [];
            const count = Math.min(3, Math.max(DISCIPLE_CONFIG.candidates, oldCandidates.length));
            const ids = new Set();
            const bucket = { candidates: [], refreshYears: [],
                lastRefreshYear: Number.isFinite(offers.lastRefreshYear) ? offers.lastRefreshYear : null };
            for (let i = 0; i < count; i++) {
                const old = oldCandidates[i];
                const refreshYear = Number.isFinite(offers.refreshYears?.[i]) ? offers.refreshYears[i]
                    : Number.isFinite(old?.expiresYear) ? old.expiresYear : this.years + DISCIPLE_CONFIG.candidateRefresh.min;
                bucket.refreshYears.push(refreshYear);
                if (!valid(old) || ids.has(old.id)) bucket.candidates.push(null);
                else {
                    ids.add(old.id);
                    bucket.candidates.push({ id: old.id, name: old.name, quality: old.quality,
                        ...lifetime(old), expiresYear: refreshYear });
                }
            }
            state.offersBySect[sect.id] = bucket;
        }
        if (state.sectId && saved.sectId === state.sectId) {
            const ids = new Set();
            for (const item of (Array.isArray(saved.roster) ? saved.roster : []).filter(valid).slice(0, DISCIPLE_CONFIG.maxRoster)) {
                if (ids.has(item.id)) continue;
                ids.add(item.id);
                state.roster.push({ id: item.id, name: item.name, quality: item.quality, ...lifetime(item),
                    level: Math.max(1, Math.min(DISCIPLE_CONFIG.maxLevel, Math.floor(Number(item.level) || 1))),
                    xp: Number.isFinite(item.xp) && item.xp >= 0 ? item.xp : 0,
                    learningXpThisYear: Number.isFinite(item.learningXpThisYear)
                        ? Math.max(0, Math.min(DISCIPLE_CONFIG.xpPerYear, item.learningXpThisYear)) : 0,
                    hiredYear: Number.isFinite(item.hiredYear) ? item.hiredYear : this.years - 1 });
            }
        } else state.householdCarry = 0;
        this.disciplesState = state; // Нормализация не бросает RNG и не обновляет предложения.
    },

    _newDiscipleId(prefix) {
        const state = this._getDiscipleState();
        const used = new Set([...state.roster, ...Object.values(state.offersBySect)
            .flatMap(bucket => bucket.candidates).filter(Boolean)].map(item => item.id));
        let id;
        do { id = prefix + state.nextId++; } while (used.has(id));
        return id;
    },

    _randomDiscipleInt(range) {
        return range.min + Math.floor(Math.random() * (range.max - range.min + 1));
    },

    _generateDiscipleCandidate() {
        const qualities = Object.entries(DISCIPLE_QUALITIES);
        let roll = Math.random() * qualities.reduce((total, [, data]) => total + data.weight, 0);
        let quality = qualities.at(-1)[0];
        for (const [id, data] of qualities) {
            roll -= data.weight;
            if (roll < 0) { quality = id; break; }
        }
        return { id: this._newDiscipleId("candidate_"), name: _rname(Math.random() < 0.5), quality,
            birthYear: this.years - this._randomDiscipleInt(DISCIPLE_CONFIG.candidateAge),
            maxAge: this._randomDiscipleInt(DISCIPLE_QUALITIES[quality].lifespan),
            expiresYear: this.years + this._randomDiscipleInt(DISCIPLE_CONFIG.candidateRefresh) };
    },

    getDiscipleCapacity() {
        return this.sect ? DISCIPLE_CONFIG.capacityByRank[this.getSectRankIndex()] : 0;
    },

    _getDiscipleCandidateCapacity() {
        return DISCIPLE_CONFIG.candidates + Math.min(1, Math.max(0, this.prestige.karmaUpgrades.mentorEye || 0));
    },

    _prepareDiscipleOffers(persist = true) {
        if (!this.sect || !this.getDiscipleCapacity() || this.gameOver || this.pendingRebirth) return null;
        const state = this._getDiscipleState();
        if (state.sectId !== this.sect.id) {
            state.roster = []; state.householdCarry = 0; state.missionReadyYears = [null, null, null];
            state.sectId = this.sect.id;
        }
        const count = this._getDiscipleCandidateCapacity();
        const bucket = state.offersBySect[this.sect.id] ||= { candidates: [], refreshYears: [], lastRefreshYear: null };
        let changed = false;
        // Первое открытие и дополнительный кандидат Глаза наставника — однократные появления.
        while (bucket.candidates.length < count) {
            const candidate = this._generateDiscipleCandidate();
            bucket.candidates.push(candidate); bucket.refreshYears.push(candidate.expiresYear); changed = true;
        }
        if (bucket.lastRefreshYear !== this.years) {
            const expired = bucket.refreshYears.map((year, index) => ({ year, index }))
                .filter(item => item.index < count && item.year <= this.years)
                .sort((a, b) => a.year - b.year || a.index - b.index)[0];
            if (expired) {
                const candidate = this._generateDiscipleCandidate();
                bucket.candidates[expired.index] = candidate;
                bucket.refreshYears[expired.index] = candidate.expiresYear;
                bucket.lastRefreshYear = this.years; changed = true;
            }
        }
        if (changed && persist) saveGame();
        return bucket;
    },

    getDiscipleHireCost(candidateOrId) {
        const state = this._getDiscipleState();
        const candidate = typeof candidateOrId === "string"
            ? state.offersBySect[this.sect?.id]?.candidates.find(item => item?.id === candidateOrId) : candidateOrId;
        const quality = DISCIPLE_QUALITIES[candidate?.quality];
        if (!quality || !this.sect || !this.getDiscipleCapacity()) return Infinity;
        return Math.ceil(quality.basePrice * (1 - DISCIPLE_CONFIG.rankDiscounts[this.getSectRankIndex()]));
    },

    getDiscipleCandidates() {
        if (!this.sect || !this.getDiscipleCapacity()) return [];
        const bucket = this._prepareDiscipleOffers() || this._getDiscipleState().offersBySect[this.sect.id];
        if (!bucket) return [];
        return bucket.candidates.slice(0, this._getDiscipleCandidateCapacity()).filter(Boolean).map(candidate => {
            const cost = this.getDiscipleHireCost(candidate);
            return { ...candidate, ...this._getDiscipleAgeView(candidate), cost,
                expiresIn: Math.max(0, candidate.expiresYear - this.years),
                canHire: !this.gameOver && !this.pendingRebirth && this._isDiscipleAlive(candidate)
                    && candidate.expiresYear > this.years && this._getDiscipleState().roster.length < this.getDiscipleCapacity()
                    && Number.isFinite(cost) && this.stones >= cost };
        });
    },

    _refreshDiscipleUI() {
        saveGame(); updateUI();
        if (typeof renderDisciples === "function") renderDisciples();
    },

    hireDisciple(candidateId) {
        if (!this.sect || !this.getDiscipleCapacity() || this.gameOver || this.pendingRebirth) return false;
        const candidate = this.getDiscipleCandidates().find(item => item.id === candidateId);
        if (!candidate?.canHire) return false;
        const state = this._getDiscipleState();
        const bucket = state.offersBySect[this.sect.id];
        const index = bucket.candidates.findIndex(item => item?.id === candidateId);
        this.stones -= candidate.cost;
        state.roster.push({ id: this._newDiscipleId("disciple_"), name: candidate.name, quality: candidate.quality,
            birthYear: candidate.birthYear, maxAge: candidate.maxAge, level: 1, xp: 0, learningXpThisYear: 0, hiredYear: this.years });
        bucket.candidates[index] = null; // Дедлайн места сохраняется; покупка не бросает следующего кандидата.
        addLog("Вы поддержали обучение: " + candidate.name + " становится вашим учеником. −" + candidate.cost + " камней.", "reward");
        this._refreshDiscipleUI();
        return true;
    },

    dismissDisciple(discipleId) {
        if (!this.sect || this.gameOver || this.pendingRebirth) return false;
        const state = this._getDiscipleState();
        const index = state.roster.findIndex(item => item.id === discipleId);
        if (index < 0) return false;
        const [disciple] = state.roster.splice(index, 1);
        if (this.flags.discipleTrainingOffer?.discipleId === discipleId) this.flags.discipleTrainingOffer = null;
        addLog(disciple.name + " остаётся учиться в секте. Вложения не возвращаются.", "system");
        this._refreshDiscipleUI();
        return true;
    },

    _clearDiscipleRoster() {
        const state = this._getDiscipleState();
        state.roster = []; state.householdCarry = 0; state.sectId = null; state.missionReadyYears = [null, null, null];
        this.flags.discipleTrainingOffer = null;
        // Предложения, вакансии, их сроки и отметки выплат сохраняются до новой жизни.
    },

    getDiscipleXpNeeded(disciple) {
        if (disciple.level >= DISCIPLE_CONFIG.maxLevel) return Infinity;
        return Math.max(1, Math.floor(DISCIPLE_QUALITIES[disciple.quality].xpBase
            * disciple.level * Math.pow(DISCIPLE_CONFIG.xpGrowth, disciple.level)));
    },

    getDiscipleSkill(disciple) {
        const growth = DISCIPLE_CONFIG.minSkill + (1 - DISCIPLE_CONFIG.minSkill)
            * (disciple.level - 1) / (DISCIPLE_CONFIG.maxLevel - 1);
        return DISCIPLE_QUALITIES[disciple.quality].skill * growth;
    },

    _addDiscipleLearningXp(disciple, amount) {
        if (!(amount > 0) || disciple.level >= DISCIPLE_CONFIG.maxLevel) return false;
        disciple.xp = Math.round((disciple.xp + amount) * 1e9) / 1e9;
        while (disciple.level < DISCIPLE_CONFIG.maxLevel && disciple.xp >= this.getDiscipleXpNeeded(disciple)) {
            disciple.xp -= this.getDiscipleXpNeeded(disciple);
            disciple.level++;
            addLog(disciple.name + " достиг " + disciple.level + " уровня обучения.", "cultivation");
        }
        return true;
    },

    // Обычные тики показывают реальный рост; годовой обработчик дополняет только недостающий XP.
    tickDiscipleLearning(seconds) {
        if (!this.sect || !this.getDiscipleCapacity() || this.gameOver || this.pendingRebirth
            || !Number.isFinite(seconds) || seconds <= 0) return false;
        const state = this._getDiscipleState();
        if (state.sectId !== this.sect.id) return false;
        let changed = false;
        for (const disciple of state.roster) {
            if (!this._isDiscipleAlive(disciple) || disciple.level >= DISCIPLE_CONFIG.maxLevel) continue;
            const paid = Math.max(0, Math.min(DISCIPLE_CONFIG.xpPerYear, disciple.learningXpThisYear || 0));
            const gain = Math.min(DISCIPLE_CONFIG.xpPerYear - paid, DISCIPLE_CONFIG.xpPerYear * seconds / 5);
            if (!this._addDiscipleLearningXp(disciple, gain)) continue;
            disciple.learningXpThisYear = Math.round((paid + gain) * 1e9) / 1e9;
            changed = true;
        }
        return changed;
    },

    getDiscipleHouseholdCap() {
        return this.getDiscipleCapacity() ? DISCIPLE_CONFIG.stipends[this.getSectRankIndex()]
            * DISCIPLE_CONFIG.householdStipendShare : 0;
    },

    getDiscipleHouseholdRate(disciple) {
        if (!this._isDiscipleAlive(disciple)) return 0;
        return this.getDiscipleHouseholdCap() / DISCIPLE_CONFIG.maxRoster * this.getDiscipleSkill(disciple);
    },

    isDiscipleSlotBlocked(slot) {
        return this._getDiscipleState().slotPaidYears[slot] === this.years;
    },

    _markDiscipleSlotPaid(slot) {
        const state = this._getDiscipleState();
        state.slotPaidYears[slot] = this.years; state.missionReadyYears[slot] = null;
    },

    _isDiscipleMissionEligible(slot) {
        const mission = this.sectMissions[slot];
        return !!mission && !mission.cost && mission.templateId !== "donate_pills_sect"
            && !mission.check?.pillsDonated && this.canCompleteSectMission(slot);
    },

    canAutoCompleteDiscipleMission(slot) {
        const state = this._getDiscipleState();
        return !!this.sect && !!this.getDiscipleCapacity() && !this.gameOver && !this.pendingRebirth
            && state.sectId === this.sect.id && state.roster.some(item => this._isDiscipleAlive(item) && item.hiredYear < this.years)
            && this._isDiscipleMissionEligible(slot);
    },

    getDiscipleView() {
        const candidates = this.getDiscipleCandidates();
        const state = this._getDiscipleState();
        const available = !!this.sect;
        const unlocked = this.getDiscipleCapacity() > 0;
        const active = available && unlocked && !this.gameOver && !this.pendingRebirth && state.sectId === this.sect.id;
        const disciples = (state.sectId === this.sect?.id ? state.roster : []).filter(item => this._isDiscipleAlive(item))
            .map(item => ({ ...item, ...this._getDiscipleAgeView(item), xpNeeded: this.getDiscipleXpNeeded(item),
                incomeRate: this.getDiscipleHouseholdRate(item),
                autoMissionChance: DISCIPLE_CONFIG.errandBaseChance + DISCIPLE_CONFIG.errandSkillChance * this.getDiscipleSkill(item) }));
        const bucket = state.offersBySect[this.sect?.id];
        const count = this._getDiscipleCandidateCapacity();
        const deadlines = unlocked && bucket ? bucket.refreshYears.slice(0, count) : [];
        const nextRefreshYear = deadlines.length
            ? Math.max(Math.min(...deadlines), bucket.lastRefreshYear === this.years ? this.years + 1 : this.years) : null;
        return { available, unlocked, sectId: this.sect?.id || null, rank: this.getSectRankIndex(),
            capacity: this.getDiscipleCapacity(), candidateCapacity: count,
            discount: this.sect ? DISCIPLE_CONFIG.rankDiscounts[this.getSectRankIndex()] : 0,
            candidates, disciples, nextRefreshYear,
            nextDeliveryIn: nextRefreshYear === null ? null : Math.max(0, nextRefreshYear - this.years),
            offerVacancies: unlocked && bucket ? bucket.candidates.slice(0, count).filter(item => item === null).length : 0,
            householdCap: this.getDiscipleHouseholdCap(), householdCarry: state.householdCarry,
            incomeRate: active ? Math.min(this.getDiscipleHouseholdCap(), disciples.reduce((sum, item) => sum + item.incomeRate, 0)) : 0,
            autoMissionChance: active && disciples.length ? Math.max(...disciples.map(item => item.autoMissionChance)) : 0,
            autoMissionStatus: !unlocked ? "Ученики доступны с ранга Внутреннего ученика."
                : !active ? "Обучение остановлено вместе с этой жизнью."
                : !disciples.length ? "Нанятые ученики будут сами помогать с обычными заданиями секты."
                : "До трёх обычных заданий в год. Требования героя и кулдаун сохраняются.",
            autoMissionPolicy: { maxMissionsPerYear: DISCIPLE_CONFIG.slots, attemptsPerDisciple: 1,
                requiresHeroChecks: true, respectsCooldown: true, excludesResourceCosts: true } };
    },

    tickDisciples() {
        if (!this.sect || this.gameOver || this.pendingRebirth) return false;
        const state = this._getDiscipleState();
        if (state.sectId !== this.sect.id || (state.lastProcessedYear !== null && state.lastProcessedYear >= this.years)) return false;
        state.lastProcessedYear = this.years;
        let deaths = 0;
        state.roster = state.roster.filter(disciple => {
            if (this._isDiscipleAlive(disciple)) return true;
            if (this.flags.discipleTrainingOffer?.discipleId === disciple.id) this.flags.discipleTrainingOffer = null;
            addLog(disciple.name + " скончался от старости (" + disciple.maxAge + " лет).", "system");
            deaths++; return false;
        });
        if (!this.getDiscipleCapacity()) {
            if (deaths) this._refreshDiscipleUI();
            return { householdIncome: 0, missionsCompleted: 0, deaths, missionAttempts: 0 };
        }
        this._prepareDiscipleOffers(false);
        const workers = state.roster.filter(item => item.hiredYear < this.years);
        for (const disciple of workers) {
            const alreadyLearned = Math.max(0, Math.min(DISCIPLE_CONFIG.xpPerYear, disciple.learningXpThisYear || 0));
            this._addDiscipleLearningXp(disciple, DISCIPLE_CONFIG.xpPerYear - alreadyLearned);
            disciple.learningXpThisYear = 0;
        }
        const income = Math.min(this.getDiscipleHouseholdCap(), workers.reduce((sum, item) => sum + this.getDiscipleHouseholdRate(item), 0));
        const accrued = state.householdCarry + income;
        const payout = Math.floor(accrued + 1e-9);
        state.householdCarry = Math.max(0, accrued - payout); this.stones += payout;
        for (let slot = 0; slot < DISCIPLE_CONFIG.slots; slot++) {
            if (!this._isDiscipleMissionEligible(slot)) state.missionReadyYears[slot] = null;
            else if (state.missionReadyYears[slot] === null) state.missionReadyYears[slot] = this.years;
        }
        const strongFirst = [...workers].sort((a, b) => this.getDiscipleSkill(b) - this.getDiscipleSkill(a)
            || a.hiredYear - b.hiredYear || a.id.localeCompare(b.id));
        let completed = 0;
        let attempts = 0;
        for (const disciple of strongFirst) {
            const next = state.missionReadyYears.map((year, slot) => ({ year, slot }))
                .filter(item => item.year !== null && state.slotAttemptYears[item.slot] !== this.years
                    && this.canAutoCompleteDiscipleMission(item.slot))
                .sort((a, b) => a.year - b.year || a.slot - b.slot)[0];
            if (!next) break;
            state.slotAttemptYears[next.slot] = this.years; attempts++;
            const chance = DISCIPLE_CONFIG.errandBaseChance + DISCIPLE_CONFIG.errandSkillChance * this.getDiscipleSkill(disciple);
            if (Math.random() < chance && this.completeSectMission(next.slot, "disciple")) completed++;
        }
        if (completed) this.checkMilestones();
        this._refreshDiscipleUI();
        return { householdIncome: payout, missionsCompleted: completed, deaths, missionAttempts: attempts };
    },
});
