// ============================================================
// GAME/FORMULAS.JS — Расчёты и формулы
// Зависит от: game/state.js
// ============================================================

// Универсальный софт-кап: линейный рост до threshold, затем pow-scaling
function softcap(x, threshold, power = 0.5) {
    if (x <= threshold) return x;
    return threshold + Math.pow(x - threshold, power);
}

// Бонус ци от событий: % от qiNeeded с софт-капом для поздних реалмов
// На realm 0-5: без ограничений. На realm 6+: потолок = max(10 минут медитации, 10% исходной награды).
function eventQiBonus(game, pct) {
    const raw = Math.floor(game.qiNeeded() * pct);
    // На вершине пути qiNeeded=Infinity означает отсутствие следующей ступени,
    // но награда должна оставаться сериализуемым конечным числом.
    const qps = typeof game.getMeditationQiPerSec === "function" ? game.getMeditationQiPerSec() : game.qiPerSec();
    if (!Number.isFinite(raw)) return Math.max(0, qps * 600);
    if (game.realmIndex <= 5) return raw;
    // Ориентир потолка: 10 минут медитации (600 секунд × расчётный qiPerSec).
    if (qps <= 0) return raw;
    const cap = qps * 600;
    return Math.min(raw, Math.max(cap, raw * 0.1)); // минимум 10% от raw чтобы не обнулить
}

Object.assign(game, {
    // Полный множитель скорости Дао (техники + достижения)
    getDaoSpeedMultiplier() {
        const techBonus = this.getTechBonus("daoSpeed");
        // Нефритовые +2%, секретные +5%
        let milestoneBonus = 0;
        for (const mid of this.milestones) {
            const m = MILESTONES.find(x => x.id === mid);
            if (!m) continue;
            if (m.tier === "jade") milestoneBonus += 0.02;
            else if (m.tier === "secret") milestoneBonus += 0.05;
        }
        const artifactBonus = this.getArtifactBonus("daoSpeed") * 0.01;
        return 1 + techBonus + milestoneBonus + artifactBonus;
    },

    qiNeeded() {
        const realm = REALMS[this.realmIndex];
        return Math.floor(realm.baseQi * (1 + (this.subLevel - 1) * 0.6));
    },

    // Единый множитель ци (корень * эпоха * мировое событие * карма)
    getQiMultiplier() {
        let mult = 1.0;
        if (this.spiritualRoot) mult *= this.spiritualRoot.qiMultiplier;
        const era = this.getCurrentEra();
        if (era) mult *= era.qiMultiplier;
        if (this.worldEvent && this.worldEvent.modifiers.qiMultiplier) {
            mult *= this.worldEvent.modifiers.qiMultiplier;
        }
        // Кармический бонус ци (Просветление) + бонус Архата
        const perks = this.getActiveBodyPerks();
        const freeLevel = perks.freeUpgradeLevel || 0;
        const enlightenment = (this.prestige.karmaUpgrades.enlightenment || 0) + freeLevel;
        if (enlightenment > 0) mult *= (1 + enlightenment * 0.05);
        return mult;
    },

    // Множитель от техник (отдельно для разбивки)
    getTechQiMultiplier() {
        return 1 + this.getTechBonus("qi");
    },

    // Элементальный резонанс: бонус за совпадение элементов корня с экипированными техниками
    getElementalResonance() {
        if (!this.spiritualRoot || !this.spiritualRoot.elements || this.spiritualRoot.elements.length === 0) return 0;
        let matches = 0;
        for (const techId of this.equippedTechniques) {
            const tech = TECHNIQUES.find(t => t.id === techId);
            if (tech && tech.element && this.spiritualRoot.elements.includes(tech.element)) {
                matches++;
            }
        }
        return matches;
    },

    getElementalMultiplier() {
        const resonance = this.getElementalResonance();
        return 1 + resonance * 0.12;
    },

    // Множитель духа (flat бонус от артефактов)
    getSpiritMultiplier() {
        const total = this.spirit + this.getArtifactBonus("spirit");
        // Совершенствование: +% к духу вместо скорости прокачки
        const rawPerfBonus = this.getFormationBonus("statXpSpeed") + this.getSectBonus("statXpSpeed")
            + this.getArtifactBonus("statXpSpeed") * 0.01 + this.getTechBonus("statXpSpeed");
        const _spPerks = this.getActiveBodyPerks();
        const karmaPerf = ((this.prestige.karmaUpgrades.statSpeed || 0) + (_spPerks.freeUpgradeLevel || 0)) * 0.05;
        // Софт-кап на perfBonus: после +300% уходит в sqrt
        const totalPerf = 1 + softcap(rawPerfBonus + karmaPerf, 3.0, 0.5);
        // Софт-кап на spirit: линейно до порога (100/150/200 по эпохе), sqrt после
        const statCap = this.getEraStatSoftcap();
        const spiritBonus = softcap(total, statCap, 0.5) * 0.06;
        return (1 + spiritBonus + this.getTechBonus("spirit")) * totalPerf;
    },

    // Множитель силы (пассивный бонус ци)
    getStrengthMultiplier() {
        const totalStr = this.strength + this.getArtifactBonus("strength");
        const statCap = this.getEraStatSoftcap();
        return 1 + softcap(totalStr, statCap, 0.5) * 0.03 + this.getTechBonus("strength");
    },

    // Суммарная удача (база + артефакт + формация)
    getTotalLuck() {
        return this.luck + this.getFormationBonus("luck") + this.getArtifactBonus("luck");
    },

    // Удача улучшает добычу, но не превращает награду в новый множитель разгона.
    // При малой удаче рост близок к прежнему sqrt; предел — +50%.
    getRewardLuckBonus() {
        const luck = Math.max(0, this.getTotalLuck());
        return 0.5 * (1 - Math.exp(-Math.sqrt(luck) * 0.16));
    },

    getDangerRewardBonus() {
        const bonus = this.getSectBonus("dangerReward")
            + this.getArtifactBonus("dangerReward") * 0.01
            + this.getFormationBonus("dangerReward")
            + (this.getActiveBodyPerks().dangerReward || 0);
        return Math.max(0, Math.min(3, bonus));
    },

    // Множитель кармы (мудрость прошлых жизней ускоряет культивацию)
    getKarmaQiMultiplier() {
        const totalKarma = this.prestige.karma + this._getTotalKarmaSpent();
        if (totalKarma <= 0) return 1;
        return 1 + Math.log10(Math.max(1, totalKarma)) * 0.15;
    },

    qiPerSec() {
        if (this.currentActivity !== "meditation") return 0;
        return Math.floor(this.getMeditationQiPerSec() * this.getAdventureMeditationMultiplier());
    },

    getMeditationQiPerSec() {
        const base = 5 + this.realmIndex * 3;
        const formationMult = 1 + this.getFormationBonus("qi");
        const artifactMult = 1 + this.getArtifactBonus("qi") * 0.01;
        const sectMult = 1 + this.getSectBonus("qi");
        const karmaMult = this.getKarmaQiMultiplier();
        const elemMult = this.getElementalMultiplier();
        return Math.max(1, Math.floor(base * this.getSpiritMultiplier() * this.getStrengthMultiplier() * this.getQiMultiplier() * this.getTechQiMultiplier() * formationMult * artifactMult * sectMult * karmaMult * elemMult));
    },

    // === СТАТЫ ===

    statXpNeeded(stat) {
        const level = this[stat] || 1;
        const baseCost = stat === "luck" ? 8 : 5;
        return Math.floor(baseCost * level * Math.pow(1.05, level));
    },

    statXpPerTick(stat) {
        const level = this[stat] || 1;
        const base = 1.0;
        const levelMult = Math.pow(level, 0.7);
        const realmMult = 1 + this.realmIndex * 0.15;
        // Совершенствование теперь в getSpiritMultiplier(), не здесь
        const formationMult = 1;
        const sectMult = 1;
        const artifactMult = 1;
        const techMult = 1;
        const karmaMult = 1;
        return base * levelMult * realmMult * formationMult * sectMult * artifactMult * techMult * karmaMult;
    },

    // === ТЕХНИКИ ===

    techXpNeeded(techId, atLevel = null) {
        const tech = TECHNIQUES.find(t => t.id === techId);
        if (!tech) return Infinity;
        const level = atLevel ?? this.techLevels[techId] ?? 1;
        const base = TIER_XP_BASE[tech.tier] || 60;
        return Math.floor(base * level * Math.pow(1.2, level));
    },

    techXpPerTick(techId) {
        const tech = TECHNIQUES.find(t => t.id === techId);
        if (!tech) return 0;
        let speed = 1.0 * (1 + this.spirit * 0.02);
        speed *= (1 + this.getFormationBonus("techXpSpeed"));
        speed *= (1 + this.getArtifactBonus("techXpSpeed") * 0.01);
        speed *= (1 + this.getSectBonus("techXpSpeed"));
        speed *= (1 + this.getTechBonus("techXpSpeed"));
        if (tech.element && this.spiritualRoot && this.spiritualRoot.elements) {
            if (this.spiritualRoot.elements.includes(tech.element)) {
                speed *= 1.50;
            }
        }
        // Врождённый Талант + бонус Архата
        const techPerks = this.getActiveBodyPerks();
        const freeLevel = techPerks.freeUpgradeLevel || 0;
        const talent = (this.prestige.karmaUpgrades.talent || 0) + freeLevel;
        if (talent > 0) speed *= (1 + talent * 0.10);
        return speed;
    },

    // Свиток Озарения: % от XP нужного для уровня
    getInsightXpGain(techId, atLevel = null) {
        const xpNeeded = this.techXpNeeded(techId, atLevel);
        return Math.floor(xpNeeded * 0.10);
    },

    // Стоимость в эссенции Дао, растёт с каждым использованием за жизнь
    getInsightCost(uses = this._insightUses || 0) {
        return 10 + this.realmIndex * 3 + uses * 5;
    },

    getInsightBulkCost(count) {
        const baseUses = this._insightUses || 0;
        let cost = 0;
        for (let i = 0; i < count; i++) {
            cost += this.getInsightCost(baseUses + i);
        }
        return cost;
    },

    // === ВОЗРАСТ И БОЙ ===

    // Возраст персонажа (мировое время минус год рождения)
    characterAge() {
        return this.years - (this.birthYear || 0);
    },

    // Максимальный возраст персонажа (не мировой год!)
    // Подуровень определяет долю возраста: sub1=25%, sub2=50%, sub3=75%, sub4=100%
    maxAge() {
        const cur = REALMS[this.realmIndex].maxAge;
        if (cur === Infinity) return Infinity;
        const prev = this.realmIndex > 0 ? REALMS[this.realmIndex - 1].maxAge : cur;
        const subFraction = this.subLevel / SUB_LEVELS; // 1/4, 2/4, 3/4, 4/4
        const base = prev + (cur - prev) * subFraction;
        const lifespanBonus = this.getTechBonus("lifespan") + this.getArtifactBonus("lifespan") * 0.01;
        return Math.floor(base * (1 + lifespanBonus));
    },

    getCombatPower() {
        let power = this.strength + this.getArtifactBonus("strength");
        power += this.getArtifactBonus("combatPower");
        power *= (1 + this.getTechBonus("combatPower"));
        power *= (1 + this.getSectBonus("combatPower"));
        power *= (1 + this.getFormationBonus("combatPower"));
        // Странствующий Воин: множитель боевой мощи
        const perks = this.getActiveBodyPerks();
        if (perks.combatMult) {
            power *= perks.combatMult;
        }
        return Math.floor(power);
    },

    getCombatPowerBreakdown() {
        const baseStat = this.strength;
        const artStr = this.getArtifactBonus("strength");
        const sectCp = this.getSectBonus("combatPower");
        const artCp = this.getArtifactBonus("combatPower");
        const perks = this.getActiveBodyPerks();
        const combatMult = perks.combatMult || 0;

        const parts = [];
        parts.push(`Сила: ${baseStat}`);
        if (artStr > 0) parts.push(`Артефакт (сила): +${artStr.toFixed(1)}`);
        const techCp = this.getTechBonus("combatPower");
        if (techCp > 0) parts.push(`Экипированные техники (с учётом ослабления): ×${(1 + techCp).toFixed(2)}`);
        if (artCp > 0) parts.push(`Артефакт (бой): +${artCp.toFixed(1)}`);
        if (sectCp > 0) parts.push(`Секта: +${(sectCp * 100).toFixed(0)}%`);
        const formCp = this.getFormationBonus("combatPower");
        if (formCp > 0) parts.push(`Формация: +${(formCp * 100).toFixed(0)}%`);
        if (combatMult > 0) parts.push(`Тело: ×${combatMult.toFixed(1)}`);
        return parts;
    },

    // Суммарное удержание ци при провале (qiRetention от техник + артефактов + секты)
    getQiRetention() {
        // Отпрыск Клана: бонус удержания ци
        const perks = this.getActiveBodyPerks();
        const bodyRetention = perks.retention || 0;
        return Math.min(0.95,
            this.getTechBonus("qiRetention")
            + this.getArtifactBonus("qiRetention") * 0.01
            + this.getSectBonus("qiRetention")
            + bodyRetention);
    },

    // Элементальная предрасположенность к секте (совпадение элемента корня и секты)
    getSectElementAffinity() {
        if (!this.sect || !this.spiritualRoot) return 1;
        const sect = SECTS.find(s => s.id === this.sect.id);
        if (!sect || !sect.element) return 1; // секта без элемента — нет бонуса/штрафа
        const hasElement = this.spiritualRoot.elements && this.spiritualRoot.elements.includes(sect.element);
        return hasElement ? 1.5 : 0.75;
    },

    // === ПРОРЫВ ===

    getBreakthroughChance(includePillBonus = true) {
        if (this.realmIndex < 3) return 1.0;

        // Штраф: -2.5% за подуровень внутри реалма, -10% за полный смертный реалм (3-9), -15% за бессмертный (10+)
        let realmPenalty = 0;
        const mortalSteps = Math.min(this.realmIndex - 3, 7); // реалмы 3-9
        if (mortalSteps > 0) realmPenalty += mortalSteps * 0.10;
        const immortalSteps = Math.max(0, this.realmIndex - 10); // реалмы 10+
        if (immortalSteps > 0) realmPenalty += immortalSteps * 0.15;
        // Подуровень: -2.5% за каждый (sub 1 = 0%, sub 2 = -2.5%, sub 3 = -5%, sub 4 = -7.5%)
        realmPenalty += (this.subLevel - 1) * 0.025;
        const baseChance = 0.70 - realmPenalty;

        const totalLuck = this.getTotalLuck();

        const luckBonus = Math.sqrt(totalLuck) * 0.006;

        const techBonus = this.getTechBonus("breakthroughBonus");
        const artifactBonus = this.getArtifactBonus("breakthroughBonus") * 0.01;
        const sectBonus = this.getSectBonus("breakthroughBonus");
        const techLuckBonus = this.getTechBonus("luck") * 0.01;
        const formationBonus = this.getFormationBonus("breakthroughBonus");

        // Бонус от тела (Дитя Фортуны и вознесения)
        const bodyPerks = this.getActiveBodyPerks();
        const bodyBonus = bodyPerks.breakthroughBonus || 0;

        // Бонус от пророческого сна (одноразовый)
        const dreamBonus = this.flags.prophetic_dream ? 0.05 : 0;

        // Бонус от духовной пилюли (расходуется при попытке)
        const pillBonus = includePillBonus ? this.flags._pillBreakthroughBonus || 0 : 0;

        const chance = baseChance + luckBonus
            + techBonus + artifactBonus + sectBonus + techLuckBonus + formationBonus + bodyBonus + dreamBonus + pillBonus;

        return Math.max(0.01, Math.min(chance, this.getEraBreakthroughCap()));
    },

    // === ВНУТРЕННИЙ ДЕМОН ===

    // Шанс встречи с внутренним демоном (только при провале прорыва, когда шанс < 65%)
    getDemonChance() {
        // При провале пилюльный бонус уже израсходован до проверки демона.
        const btChance = this.getBreakthroughChance(false);
        // Давление Дао снижает порог (65% → 70/75/80%)
        const daoLevel = this.daoLevel || 0;
        let threshold = 0.65;
        if (daoLevel >= 25) threshold = 0.80;
        else if (daoLevel >= 17) threshold = 0.75;
        else if (daoLevel >= 9) threshold = 0.70;
        if (btChance >= threshold) return 0;
        return Math.min(0.80, (threshold - btChance) / threshold);
    },

    // Реальный шанс демона с учётом flat снижения (тело + формация)
    getEffectiveDemonChance() {
        let chance = this.getDemonChance();
        const bodyPerks = this.getActiveBodyPerks();
        const flatReduction = (bodyPerks.demonReduction || 0) + this.getFormationBonus("demonReduction") + this.getArtifactBonus("demonReduction") * 0.01;
        if (flatReduction > 0) chance = Math.max(0, chance - flatReduction);
        return chance;
    },

    // Сколько реалмов теряется при встрече с демоном
    getDemonRealmLoss() {
        if (this.realmIndex >= 10) return 4;
        if (this.realmIndex >= 8) return 3;
        if (this.realmIndex >= 6) return 2;
        return 1;
    },

    // === REALM WALL (Небесный Барьер) ===

    getRealmPrestigeRequirement(realmIndex) {
        if (realmIndex <= 9) return null;
        const requirements = {
            10: { rebirths: 1,  karma: 50 },
            11: { rebirths: 2,  karma: 150 },
            12: { rebirths: 4,  karma: 400 },
            13: { rebirths: 7,  karma: 1000 },
            14: { rebirths: 10, karma: 2500 },
        };
        return requirements[realmIndex] || null;
    },

    meetsRealmRequirement(realmIndex) {
        const req = this.getRealmPrestigeRequirement(realmIndex);
        if (!req) return true;
        if (this.prestige.totalRebirths < req.rebirths) return false;
        const totalKarmaEver = this.prestige.karma + this._getTotalKarmaSpent();
        if (req.karma > 0 && totalKarmaEver < req.karma) return false;
        return true;
    },

    _getTotalKarmaSpent() {
        // Номинальная цена купленных уровней не подтверждает заработок:
        // эпоха и тело могли дать скидку. Учитываются только реальные платежи.
        const spent = this.prestige.karmaSpent;
        return Number.isFinite(spent) && spent >= 0 ? spent : 0;
    },
});
