// ============================================================
// ADVENTURES/_BASE.JS — Объявление массива приключений
// Загружать ПЕРВЫМ из папки adventures/
// ============================================================

const ADVENTURES = [];

// Фиксированные бюджеты поздних испытаний. Ступень задаёт сам сюжет,
// поэтому рост героя или переход реалма не повышают уже найденный порог.
const ADVENTURE_CHALLENGE_SCALING = {
    7: { strength: 3, spirit: 3.5, luck: 2, combatPower: 4 },
    8: { strength: 3, spirit: 4, luck: 2.4, combatPower: 5 },
    9: { strength: 3.2, spirit: 4.4, luck: 2.8, combatPower: 6 }
};

// Зал оставляет след на наследии; флаги старого JSON действуют так же.
function _tombLegacyRewards(flags, rewards) {
    const result = { ...rewards };
    const scaleRange = (range, mult) => ({ min: Math.floor(range.min * mult), max: Math.floor(range.max * mult) });
    if (flags.spirit_pass && result.essence) result.essence = scaleRange(result.essence, 1.25);
    if (flags.force_pass || flags.force_fail) {
        if (result.techniqueChance) result.techniqueChance *= 0.5;
        if (flags.force_pass && result.dust) result.dust = scaleRange(result.dust, 1.5);
    }
    if (flags.luck_pass && result.artifactChance) {
        result.artifactChance = Math.min(1, result.artifactChance + 0.25);
        result.artifactMinTier = result.artifactMinTier === "rare" ? "epic" : "rare";
    }
    if (flags.luck_fail && result.artifactChance) result.artifactChance *= 0.5;
    return result;
}
