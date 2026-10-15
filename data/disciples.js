// Ученики: ограниченный состав, фиксированные жизни и предложения по срокам.
const DISCIPLE_CONFIG = {
    maxLevel: 10,
    slots: 3,
    maxRoster: 6,
    capacityByRank: [0, 2, 4, 6, 6],
    candidates: 2,
    candidateAge: { min: 16, max: 30 },
    candidateRefresh: { min: 30, max: 60 },
    rankDiscounts: [0, 0.05, 0.10, 0.15, 0.20],
    xpPerYear: 6,
    xpGrowth: 1.2,
    minSkill: 0.35,
    householdStipendShare: 0.40,
    stipends: [1, 2, 4, 8, 15],
    errandBaseChance: 0.60,
    errandSkillChance: 0.40,
};
const DISCIPLE_QUALITIES = {
    common: { name: "Обычный", color: "#aaa", weight: 60, basePrice: 20, xpBase: 3, skill: 0.75, lifespan: { min: 100, max: 200 } },
    uncommon: { name: "Необычный", color: "#6ab", weight: 30, basePrice: 45, xpBase: 4, skill: 0.90, lifespan: { min: 150, max: 400 } },
    rare: { name: "Редкий", color: "#aa6acc", weight: 10, basePrice: 90, xpBase: 5, skill: 1, lifespan: { min: 300, max: 700 } },
};
function createDiscipleState() {
    return {
        sectId: null,
        roster: [],
        offersBySect: {},
        nextId: 1,
        slotPaidYears: [null, null, null],
        slotAttemptYears: [null, null, null],
        missionReadyYears: [null, null, null],
        householdCarry: 0,
        lastProcessedYear: null,
    };
}
