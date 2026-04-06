# Путь Культиватора — Контекст для Claude

## Что это
Инкрементальная idle-игра в жанре xianxia (cultivation). Vanilla JS, без фреймворков, один HTML-файл + подключаемые скрипты. Открывается через index.html в браузере. Версия: **0.6**.

Вдохновение: Realm Grinder (prestige-петля), Perfect Keystroke (культивация), классические сянься-новеллы.

## Структура проекта

```
data/           — Константы, массивы, без логики. События через .push() в подфайлах
  core.js       — REALMS (15), ELEMENTS (7), SPIRITUAL_ROOTS (7), тиры
  events/       — ~150 событий (early/mid/late/sects/chains/cameos/rebirth/xianxia/artifact_find)
  adventures/   — 12 приключений (квесты с выборами и шагами)
  sects/        — 5 сект (definitions + techniques + missions)
  prestige.js   — 13 тел перерождения, 7 кармических апгрейдов
  artifacts.js  — 6 тиров артефактов, 4 слота, заточка BDO-style, слияние PRI→PEN
  formations.js — 5 формаций (перманентные через перерождения)
  locations.js  — 7 тайных царств (экспедиции)
  milestones.js — 82 достижения (bronze/silver/gold/jade/secret)

game/           — Логика и состояние
  state.js      — Объект `game` (всё состояние в одном глобальном объекте)
  formulas.js   — ВСЕ расчёты: qiPerClick, qiPerSec, combatPower, breakthroughChance и т.д.
  lifecycle.js  — tick() [200ms], passYear() [5s], start/stop, reset()
  actions.js    — meditate, breakthrough, pills, setActivity, buyInsight
  prestige.js   — rebirth, karma, spiritualRoot
  sects.js      — joinSect, leaveSect, missions (leaveSect удаляет техники секты)
  expeditions.js — экспедиции с таймерами
  adventures.js — слухи, шаги, выбор, награды
  artifacts.js  — генерация, заточка, слияние, разбор, вознесение техник
  formations.js — покупка формаций (prestige-persistent)
  world.js      — эпохи, мировые события, достижения, triggerEvent

ui/             — DOM-рендер (прямые манипуляции, без шаблонизатора)
  init.js       — addLog(), initGame(), DOMContentLoaded
  update.js     — updateUI() (полный), updateTickUI() (лёгкий, 5×/сек), switchTab()
  tabs.js       — renderTechniques(), renderMilestones()
  artifacts.js  — renderArtifacts(), renderFormations(), панель заточки
  sects.js      — renderSects(), _sectAnimLock
  expeditions.js — renderExpeditions()
  adventures.js — renderAdventures()
  modals.js     — модалки: духовный корень, перерождение, вступление

save.js         — localStorage, версия сейва: 12
style.css       — тёмная тема, 3-колоночный layout
index.html      — каркас + подключение 37 скриптов в строгом порядке
```

## Ключевые паттерны кода

- **Глобальный объект `game`** — всё состояние. Никаких классов, ООП или модулей
- **Добавление нового поля**: state.js → lifecycle.js reset() → save.js getSaveableState() + applyLoadedState() с дефолтом
- **События**: EVENTS.push({id, text, type, condition(g), effect(g), weight?}) в файлах data/events/
- **Техники**: TECHNIQUES.push({...}) в data/techniques.js, эффекты суммируются через getTechBonus(key)
- **Бонусы**: getTechBonus() + getArtifactBonus() + getSectBonus() + getFormationBonus() — все суммируются в formulas.js
- **UI**: innerHTML-рендер по вызову (renderX()), updateTickUI() обновляет бары/числа без перерисовки
- **Загрузка скриптов**: data/* → save.js → game/* → ui/* (порядок важен, нет import/export)
- **Язык**: весь UI и данные на русском. Комментарии к коду — на русском или английском

## Игровая петля

```
tick() [200ms]  — авто-ци, XP статов (пассивно 15%, активный 100%), XP техник
passYear() [5s] — возраст++, доход камней, эпохи, мир.события, секта, экспедиции, смерть
triggerEvent() [15s] — цепочки → манхва → обычные события
autoSave [30s]
```

## Прогрессия

- 15 реалмов (0-14), каждый × 4 подуровня. Реалмы 0-9 смертные, 10-14 бессмертные
- Prestige через перерождение: карма → тела → кармические апгрейды → формации
- Дао: 28 уровней, бар заполняется через активность "Постижение Дао"
- Секты (5 шт) → ранги → техники → задания → вклад
- Артефакты: генерация → заточка +0..+10 → слияние PRI→PEN → вознесение техник

## Документация

- `docs/architecture.md` — полная карта файлов, методов, констант
- `docs/mechanics.md` — все механики и формулы
- `docs/game_balance.md` — числа, таблицы, пейсинг
- `docs/development_log.md` — лог фаз разработки (текущая: 3E завершена)
- `docs/content_guide.md` — гайд по написанию событий/приключений
- `docs/worldbuilding.md` — лор мира
- `docs/lore_reference.md` — справочник по лору манхвы
- `docs/backlog.md` — бэклог задач (приоритизированный)
- `CHANGELOG.md` — публичный ченджлог по версиям

## Правила работы

1. **Читай architecture.md и mechanics.md** перед крупными изменениями — там актуальная карта
2. **formulas.js — центр расчётов**. Не дублируй формулы в других файлах
3. **save.js** — при добавлении полей: state.js + reset() + getSaveableState() + applyLoadedState()
4. **Обновляй CHANGELOG.md** при значимых изменениях (текущая версия 0.6)
5. **Обновляй docs/** если меняешь механики, архитектуру или баланс
6. **Тестируй в браузере** — открой index.html, используй дебаг-панель (скорость x10/x50/x100)
7. **Не ломай сейвы** — applyLoadedState() должен мигрировать старые сохранения через дефолты
8. **Баланс**: смотри docs/game_balance.md для целевого пейсинга перед изменением чисел
9. **Бэклог**: актуальный список задач в `docs/backlog.md`. Отмечай `[x]` при завершении
