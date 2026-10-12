// Общая серия иллюстраций для обеих версий интерфейса.
const SCENERY_LOCATION_TIERS = Object.freeze({
    spirit_forest: 2, beast_cave: 2, forgotten_ruins: 2,
    heavenly_auction: 1, demon_abyss: 1, immortal_palace: 1,
    sect_secret_realm: 1
});

const SCENERY_SECTS = Object.freeze({
    jade_purity: "Секта Нефритовой Чистоты",
    crimson_flame: "Орден Алого Пламени",
    moon_lake: "Секта Лунного Озера",
    abyss_cult: "Культ Бездны",
    hidden_hermit: "Скрытая Секта"
});

function getExpeditionScenery(locationId, ascTier = 0, sectId) {
    if (!Object.hasOwn(SCENERY_LOCATION_TIERS, locationId)) return null;
    const tier = Math.min(SCENERY_LOCATION_TIERS[locationId], Math.max(0, Math.floor(Number(ascTier) || 0)));
    const location = LOCATIONS.find(loc => loc.id === locationId);
    const names = tier === 2 ? LOCATION_ASCENDED_2 : tier === 1 ? LOCATION_ASCENDED : null;
    const name = names?.[locationId]?.name || location?.name || "Тайное царство";
    if (locationId === "sect_secret_realm") {
        const sect = Object.hasOwn(SCENERY_SECTS, sectId) ? sectId : "jade_purity";
        return { src: `assets/art/expeditions/sect-${sect}-${tier}.webp`, alt: `${name} · ${SCENERY_SECTS[sect]}` };
    }
    return { src: `assets/art/expeditions/${locationId}-${tier}.webp`, alt: name };
}

function getSectScenery(sectId) {
    if (!Object.hasOwn(SCENERY_SECTS, sectId)) return null;
    return { src: `assets/art/sects/${sectId}.webp`, alt: SCENERY_SECTS[sectId] };
}

function renderSceneryImage(art, extraClass = "") {
    if (!art) return "";
    const escape = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
    return `<div class="scenery-frame ${escape(extraClass)}"><img class="scenery-image" src="${escape(art.src)}" alt="${escape(art.alt)}" width="1024" height="683" loading="lazy" decoding="async"></div>`;
}
