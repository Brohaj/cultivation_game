// ============================================================
// EVENTS/_BASE.JS — Объявление массивов событий
// Загружать ПЕРВЫМ из папки events/
// ============================================================

const EVENTS = [];
const EVENT_CHAINS = [];
const MANHUA_ENCOUNTERS = [];

// Универсальная проверка стата: 85-95% шанс пройти
// chance = 0.85 + min(0.10, playerStat / threshold * 0.10)
function _eventCheck(playerStat, threshold) {
    const chance = 0.85 + Math.min(0.10, (playerStat / threshold) * 0.10);
    return Math.random() < chance;
}

// Пул случайных xianxia-имён
const _EVENT_SURNAMES = ["Чжан", "Ли", "Ван", "Лю", "Чэнь", "Сунь", "Фэн", "Чжоу", "У", "Хуан", "Линь", "Сяо", "Юй", "Цзян", "Бай", "Мо", "Е", "Лу", "Тань", "Цуй"];
const _EVENT_NAMES_M = ["Вэй", "Лэй", "Хао", "Юнь", "Ши", "Цзянь", "Мин", "Жуй", "Тянь", "Лун", "Фэй", "Сюань", "Цян", "Дэ", "Линь"];
const _EVENT_NAMES_F = ["Юэ", "Мэй", "Лань", "Сюэ", "Ин", "Хуа", "Жо", "Цин", "Яо", "Лянь", "Сян", "Жуй", "Фан", "Ци", "Нин"];
function _rname(female) {
    const s = _EVENT_SURNAMES[Math.floor(Math.random() * _EVENT_SURNAMES.length)];
    const pool = female ? _EVENT_NAMES_F : _EVENT_NAMES_M;
    const n = pool[Math.floor(Math.random() * pool.length)];
    return s + " " + n;
}
