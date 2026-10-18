# Архитектура игры "Путь Культиватора"

## Текущая основная версия v0.7

Актуальные модули учеников, кармических путей, зачётных жизней и формат 18 описаны в [prototype_report.md](prototype_report.md). Единственный вход — `index.html` с текущим интерфейсом; ключ профиля — `cultivation_game_prototype_save`. Кандидаты обновляются по срокам, ученики стареют и работают автоматически; за карму открывается автонайм на свободные места. Ниже сохранена подробная историческая карта базовой игры; старые числа и перечни файлов не заменяют действующие правила отчёта.

## Структура файлов

```
cultivation_game/
├── index.html              — HTML-каркас, подключение скриптов
├── style.css               — Все стили (тёмная тема, табы, модалки, карточки)
├── save.js                 — Сохранение/загрузка (localStorage)
│
├── data/                   — Игровые определения, условия и эффекты контента
│   ├── core.js             — Реалмы, подуровни, элементы, дух. корни, тир-константы
│   ├── world.js            — Эпохи, мировые события, вступление
│   ├── techniques.js       — 18 базовых техник; техники сект регистрируются при вступлении
│   ├── milestones.js       — 88 достижений в 5 тирах (bronze/silver/gold/jade/secret), 7 категорий
│   ├── events/             — События (разбиты по тирам)
│   │   ├── _base.js        — Массивы EVENTS/EVENT_CHAINS/MANHUA_ENCOUNTERS + хелперы _eventCheck(), _rname()
│   │   ├── early.js        — ~48 ранних событий (реалм 0-7) + follow-up цепочки
│   │   ├── sects.js        — ~16 событий сект (общие + уникальные для каждой)
│   │   ├── mid.js          — ~15 событий среднего тира (реалм 4-8)
│   │   ├── late.js         — ~30 событий высшего + бессмертного тира (реалм 8+)
│   │   ├── chains.js       — Цепочки событий (Торговец, Наследие, Кризис)
│   │   ├── cameos.js       — ~17 пасхалок из сянься-новелл + артефактные события
│   │   ├── rebirth.js      — 8 событий перерождения (масштабируются с totalRebirths)
│   │   ├── xianxia_early.js — 10 новых xianxia-событий (реалм 0-4)
│   │   ├── xianxia_mid.js  — 10 новых xianxia-событий (реалм 4-9)
│   │   ├── fillers_early.js / fillers_mid.js / fillers_anomaly.js — фоновые события
│   │   ├── dao_pressure.js — события постижения Дао
│   │   └── artifact_find.js — 4 события находки артефактов (реалм 1+, первые 200 лет)
│   ├── prestige.js         — 13 тел перерождения, 19 кармических улучшений
│   ├── artifacts.js        — Тиры, слоты, имена, эффекты артефактов
│   ├── formations.js       — 10 культивационных формаций (привязаны к сектам через Дао)
│   ├── sects/              — Секты (разбиты по типу данных)
│   │   ├── definitions.js  — 5 сект, ранги, сложность, getSectRanks()
│   │   ├── techniques.js   — Техники сект (начальные + продвинутые)
│   │   └── missions.js     — Шаблоны заданий секты
│   ├── locations.js        — 7 локаций тайных царств
│   └── adventures/         — 27 приключений (квесты с выбором)
│       ├── _base.js        — Объявление массива ADVENTURES
│       ├── early.js        — Ранние (реалм 2-8): 6 приключений
│       ├── mid.js          — Средние (реалм 5-8): 2 приключения
│       ├── late.js         — Поздние (реалм 7-12): 4 приключения
│       └── ascension.js    — Вознесения тайных царств
│
├── game/                   — Логика и состояние игры
│   ├── state.js            — Начальное состояние (объект game)
│   ├── formulas.js         — Все расчёты и формулы
│   ├── techniques.js       — Управление техниками (learn/equip/getTechBonus)
│   ├── actions.js          — Прорыв, активности, пилюли, очистка, Свиток Озарения
│   ├── world.js            — Эпохи, мировые события, достижения, игровые события
│   ├── prestige.js         — Духовный корень, карма, перерождение
│   ├── sects.js            — Секты: вступление, ранги, задания, бонусы
│   ├── expeditions.js      — Тайные Царства: экспедиции, таймеры, награды
│   ├── adventures.js       — Приключения: слухи, принятие, шаги, выбор, награды
│   ├── artifacts.js        — Артефакты: генерация, экипировка, улучшение
│   ├── formations.js       — Формации: выбор и уровни на жизнь; открытия сохраняются
│   └── lifecycle.js        — Тики, годы, старт/стоп, сброс
│
├── ui/                     — DOM-манипуляции и рендер
│   ├── update.js           — updateUI(), updateActivityBars(), switchTab()
│   ├── tabs.js             — renderTechniques(), renderMilestones(), formatTechEffects()
│   ├── artifacts.js        — renderArtifacts(), renderFormations(), экипировка/улучшение UI
│   ├── sects.js            — renderSects(), вступление/задания UI
│   ├── expeditions.js      — renderExpeditions(), старт экспедиций UI
│   ├── adventures.js       — renderAdventures(), слухи/активные приключения UI
│   ├── modals.js           — Модалки: духовный корень, перерождение, вступление
│   └── init.js             — addLog(), initGame(), DOMContentLoaded
│
└── docs/
    ├── lore_reference.md   — Справочник по лору манхвы
    ├── mechanics.md        — Все геймплейные механики и формулы
    ├── development_log.md  — Лог разработки и TODO
    └── architecture.md     — Этот файл
```

### Порядок загрузки скриптов

```
data/core.js → data/world.js → data/techniques.js → data/milestones.js
  → data/events/_base.js → events/early.js → events/sects.js → events/mid.js → events/late.js → events/chains.js → events/cameos.js
  → events/rebirth.js → events/xianxia_early.js → events/xianxia_mid.js
  → events/fillers_early.js → events/fillers_mid.js → events/fillers_anomaly.js → events/dao_pressure.js → events/artifact_find.js
  → data/prestige.js → data/artifacts.js → data/formations.js
  → data/sects/definitions.js → sects/techniques.js → sects/missions.js → data/locations.js
  → data/adventures/_base.js → adventures/early.js → adventures/mid.js → adventures/late.js → adventures/ascension.js
  → save.js
  → game/state.js → game/formulas.js → game/techniques.js → game/actions.js → game/world.js
  → game/prestige.js → game/sects.js → game/expeditions.js → game/adventures.js → game/artifacts.js → game/formations.js
  → game/lifecycle.js
  → ui/update.js → ui/tabs.js → ui/artifacts.js → ui/sects.js → ui/expeditions.js
  → ui/adventures.js → ui/modals.js → ui/init.js
```

Всего: **52 скрипта** (31 data + 1 save + 12 game + 8 ui). Точный порядок подключений задаёт `index.html`.

---

## data/ — Данные

Игровые массивы и объекты. Контент также задаёт функции требований, проверок и эффектов; системные расчёты находятся в `game/`.

### core.js
| Константа | Тип | Описание |
|-----------|-----|----------|
| `SUB_LEVEL_NAMES` | `string[]` | Названия подуровней (4 шт) |
| `SUB_LEVELS` | `number` | Количество подуровней (4) |
| `REALMS` | `object[]` | 15 реалмов. Поля: `name, baseQi, maxAge, color, tier`. Точные требования определяет `qiNeeded()` из текущего `baseQi`; последняя ступень — завершение прогрессии |
| `ELEMENTS` | `object[]` | 7 элементов (огонь, вода, дерево, земля, ветер, гром, пустота). Поля: `id, name, color, icon` |
| `SPIRITUAL_ROOTS` | `object[]` | 7 типов корней. Поля: `id, name, description, rarity, qiMultiplier, statBonus, elements, tier, color` |
| `TIER_MULTIPLIERS` | `object` | Старый общий справочник тиров; расчёт техник использует семейства из game/techniques.js |
| `TIER_XP_BASE` | `object` | Базовый XP для прокачки техники по тиру (30→1000) |
| `TIER_ORDER` | `object` | Порядок тиров (trash→divine: 0→6) |

### world.js
| Константа | Описание |
|-----------|----------|
| `ERAS` | 12 эпох мира |
| `WORLD_EVENTS` | 13 мировых событий |
| `INTRO_LINES` | 6 строк вступления |

### techniques.js
| Константа | Описание |
|-----------|----------|
| `TECHNIQUES` | 18 базовых техник. Поля: `id, name, tier, type, element, maxLevel, effects, requirement, source` |

### milestones.js
| Константа | Описание |
|-----------|----------|
| `MILESTONES` | 88 достижений в 5 тирах (bronze/silver/gold/jade/secret). Поля: `id, name, description, check(game), tier, category`. Тир "secret" (☠, #cc44aa) — скрыт до получения. Награды: bronze/silver/gold +1% карма (после 1-го перерождения), jade +2% скорость Дао, secret +5% скорость Дао |

### events/ (папка)
Массивы объявляются в `_base.js`, остальные файлы добавляют через `.push()`.

| Файл | Содержимое |
|------|------------|
| `_base.js` | Объявление `EVENTS`, `EVENT_CHAINS`, `MANHUA_ENCOUNTERS` |
| `early.js` | ~30 ранних событий (награды, нейтральные, опасности, техники; реалм 0-7) |
| `sects.js` | ~17 событий сект (общие + уникальные для 5 сект) |
| `mid.js` | ~12 событий среднего тира (реалм 4-8) |
| `late.js` | ~25 событий высшего и бессмертного тира (реалм 8+) |
| `chains.js` | 12 шагов цепочек (3 цепочки: Торговец, Наследие, Кризис) |
| `cameos.js` | 10 встреч из сянься-новелл + 5 артефактных событий |
| `artifact_find.js` | 4 события находки артефактов (weapon/armor/accessory/treasure). Реалм 1+, первые 200 лет, пустой слот, одноразовые флаги. Авто-экипировка |

Поля событий: `id, text, type, condition?(game), effect(game), weight?`

### prestige.js
| Константа | Описание |
|-----------|----------|
| `REBIRTH_BODIES` | 13 тел перерождения |
| `KARMA_UPGRADES` | Кармические улучшения (вкл. "Память Артефактов", "Расширение Сознания" +1 слот техник/ур макс 5, "Расширение Формаций" +1 слот формаций/ур макс 2) |

### artifacts.js
| Константа | Описание |
|-----------|----------|
| `ARTIFACT_TIERS` | 6 тиров (common→divine): mult, maxLevel, color, dropWeight |
| `ARTIFACT_SLOTS` | 4 слота: weapon, armor, accessory, treasure |
| `ARTIFACT_SLOT_NAMES` | Русские названия слотов |
| `ARTIFACT_PREFIXES` | Префиксы имён по тиру (6 тиров × 4 варианта) |
| `ARTIFACT_SUFFIXES` | Суффиксы имён по слоту (4 слота × 6 вариантов) |
| `ARTIFACT_EFFECT_POOLS` | Пулы эффектов по слоту (3-4 эффекта на слот) |
| `ENHANCE_TABLE` | 10 уровней заточки: essence, dust, chance, croneStones |
| `ENHANCE_MAX` | Макс. уровень заточки (10) |
| `TRANSCEND_NAMES/MULTS/COLORS/COST` | Слияние PRI→PEN: названия, множители, стоимости |
| `TRANSCEND_MAX` | Макс. уровень слияния (5) |
| `DISASSEMBLE_DUST` | Пыль при разборе по тиру |
| `ARTIFACT_MAX_INVENTORY` | Макс. инвентарь (40) |
| `TECH_ASCEND_TABLE` | Вознесение техник: тиры, эссенция, требования реалма |

### formations.js
| Константа | Описание |
|-----------|----------|
| `CULT_FORMATIONS` | 10 формаций: по две на секту; текущий уровень Дао ограничивает покупку уровней |

### sects/ (папка)

| Файл | Содержимое |
|------|------------|
| `definitions.js` | `SECT_DIFFICULTY` (4 уровня), `SECTS` (5 сект), `SECT_RANKS_BASE`/`SECT_RANKS` (5 рангов), `getSectRanks(sectId)` |
| `techniques.js` | `SECT_TECHNIQUES` — 10 техник (5 начальных + 5 продвинутых) |
| `missions.js` | `SECT_MISSION_TEMPLATES` — 28 определений, 18 используются пятью пулами сект; 10 сохранены как reserve/legacy для совместимости активных миссий старых сейвов |

### locations.js
| Константа | Описание |
|-----------|----------|
| `LOCATIONS` | 7 тайных царств. Поля: id, name, minRealm, duration, rewards, combatCheck, requiresSectRank |

---

## save.js — Сохранение

| Функция | Описание |
|---------|----------|
| `saveGame()` | Сериализует `game` в localStorage. Также вызывается при `beforeunload` и при паузе |
| `loadGame()` | Парсит сохранение из localStorage |
| `hasSave()` | Проверяет наличие сохранения |
| `deleteSave()` | Удаляет сохранение |
| `applyLoadedState(data)` | Применяет данные к `game` (с дефолтами для новых полей). Миграция: очистка техник прежних сект |
| `getSaveableState()` | Возвращает сериализуемое состояние, включая поля совместимости старого Озарения и `pendingRebirth` |
| `startAutoSave()` / `stopAutoSave()` | Авто-сохранение каждые 30 сек |

Текущая версия сохранения: **16**. Карма хранит фактические расходы в `prestige.karmaSpent`; прежние цены уровней не используются для реконструкции заработка.

`pendingRebirth` хранит начисленную карму, тип завершения жизни и выбранное тело. `beginRebirth()` сохраняет его один раз; `resumeLoadedGame()` открывает незавершённую модалку без таймеров. После выполненного перерождения загрузка возобновляет выбор духовного корня.

Техники секты регистрируются до восстановления карты вознесений. Исходные тиры, имена и описания фиксируются через `rememberTechniqueOriginal()`, включая динамические техники; импорт сначала очищает мутации прежнего сейва.

Новое Озарение сразу начисляет XP. После восстановления всех техник и тиров `applyLoadedState()` вызывает `_flushPendingInsightXP()`, выдавая оплаченный остаток старого сейва один раз и очищая legacy-поля. Покупки и повторная загрузка не создают новую очередь.

Состояние приключений не содержит функций. `_pendingOutcome` указывает на шаг, выбор и результат проверки; старые сейвы восстанавливают ветку по истории `completedSteps`. Контракт эффектов: `(game, flags, results)`. Наличие `nextStep` означает продолжение, даже если шаг также выдаёт награду.

Стоимость выбора задаётся объектом `cost` или функцией `cost(flags)`. UI и оплата используют флаги активного приключения, поэтому ключи и договорённости из предыдущих шагов одинаково меняют показанную и списанную цену. Проверки разрешает `getAdventureCheck(adv, choice, flags)`: функция читает `check(flags)` и фиксированный `challengeRealm` содержимого. Логика, варианты выбора и сведения о боссе используют один результат; текущие статы героя не меняют пороги.

`adventureDiscovery` сохраняет состояние единого таймера слухов. `expedition.rewardMultipliers` фиксирует множители ресурсов при отправлении; v14-походы получают снимок известных условий при загрузке. `deferUIRender()` удерживает кнопки в DOM до завершения pointer/keyboard-клика.

При добавлении нового поля в `game`:
1. Добавить в `game/state.js`
2. Добавить в `game/lifecycle.js` → `reset()`
3. Добавить в `getSaveableState()` в `save.js`
4. Добавить в `applyLoadedState()` в `save.js` с дефолтом

---

## game/ — Логика

### Состояние (game/state.js)

```
game.qi / realmIndex / subLevel / years     — прогрессия
game.strength / spirit / luck               — характеристики
game.stones / pills                         — ресурсы
game.currentActivity                        — текущая активность (meditation/body/dao/fate)
game.activityXP                             — { strength, spirit, luck } XP статов
game._paused / gameOver / pendingRebirth    — пауза, завершение жизни, незавершённое перерождение
game.flags                                  — флаги для событий и цепочек
game.techniques / techLevels / techXP       — техники, уровни, XP (jobs)
game.equippedTechniques                     — экипированные техники
game.spiritualRoot                          — духовный корень
game.milestones                             — достигнутые вехи
game.totalMeditations / totalBreakthroughs  — счётчики
game.worldEvent / lastWorldEventYear        — мировые события
game.debugSpeed                             — множитель скорости (debug)
game.sect                                   — { id, rank, contribution } или null
game.sectMissions                            — массив заданий секты (до 3, каждый слот с раздельным cooldown)
game.expedition                             — { locationId, startYear, baseDuration, rewardMultipliers } или null
game.daoEssence / artifactDust              — ресурсы крафта (заточка, слияние, вознесение)
game.enhanceFailstacks                      — накопленные провалы заточки (+2% шанс каждый)
game.daoScrolls                             — кол-во Свитков Воли Дао в инвентаре
game.scrollFailstacksApplied                — применённых свитков (макс 10 = +20%, сброс при успехе)
game.artifacts                              — инвентарь артефактов (массив, макс 40)
game.equippedArtifacts                      — { weapon, armor, accessory, treasure }
game.prestige                               — { karma, totalRebirths, permanentMilestones, karmaUpgrades, lastBody, bodyAscensions, daoLevels, unlockedFormations, ... }
                                              permanentMilestones также содержит: completed_adventure_X (завершённые приключения), mastered_sect_X (секты с рангом 4)
game._minRootTier                           — мин. тир корня от тела (временное)
game._maxRealmThisLife                       — макс. реалм, достигнутый в текущей жизни (для разблокировки тел)
game.prestige.lastLifeResources              — тайники прошлой жизни (вкл. maxRealmThisLife); после rebirth пыль/эссенция за вычетом carryOver
game.prestige.karmaSpent                     — сумма фактически оплаченной кармы; покупки со скидкой не увеличивают karma + karmaSpent
game.ascendedLocations                       — { locationId: ascTier } — тиры вознесения локаций (сброс при перерождении)
game._insightUses                            — количество использований Свитка Озарения в текущей жизни (влияет на стоимость, сохраняется)
game._showDeathTimer                         — опциональный переключатель таймера смерти (ч:мин:сек до maxAge с учётом скорости игры)
```

### Ключевые методы

| Файл | Метод | Описание |
|------|-------|----------|
| formulas.js | `qiNeeded()` | Ци для прорыва |
| | `qiPerSec()` | Ци/сек (авто, × формация × техники × артефакты × секта) |
| | `getSpiritMultiplier()` | Вклад духа в ци × отдельный множитель усиления медитации (`statXpSpeed` и кармическое `statSpeed`); XP характеристик не ускоряется |
| | `getStrengthMultiplier()` | Множитель ци от силы: 1 + softcap(totalStrength) × 0.03 + techStrength |
| | `statXpNeeded(stat)` | XP до следующего уровня стата (baseCost × level × 1.05^level) |
| | `statXpPerTick(stat)` | XP стата в секунду (уровень и реалм); тик начисляет 1/5, активный стат 100%, остальные 15% |
| | `techXpNeeded(techId)` | XP до следующего уровня техники |
| | `techXpPerTick(techId)` | XP техники в секунду; тик начисляет 1/5 (бонусы техник, формаций, артефактов и секты) |
| | `getCombatPower()` | Сила + плоские бонусы артефактов, затем множители техник, секты, формаций и тела |
| | `getBreakthroughChance()` | Шанс прорыва: база − штраф реалма/подуровня + √totalLuck×0.006 + бонусы. Дух/сила не влияют; эпоха ограничивает итог |
| | `getDaoSpeedMultiplier()` | 1 + бонусы техник и артефактов + jade milestones ×2% + secret milestones ×5% |
| techniques.js | `learnTechnique(id)` | Изучить (авто-экипировка если есть слот) |
| | `equipTechnique(id)` / `unequipTechnique(id)` | Надеть/снять (проверка слотов) |
| | `getMaxTechSlots()` | Макс слотов (реалм + кармическое улучшение + бесплатный уровень тела + эпоха) |
| | `isTechEquipped(id)` | Экипирована ли техника |
| | `getTechBonus(effectKey)` | Суммарный бонус только экипированных техник |
| actions.js | `breakthrough()` | Проверка ци, Дао и Небесного Барьера до RNG/расходов; прорыв, удержание ци и внутренний демон |
| | `setActivity(type)` | Смена активности |
| | `usePill()` | Тир 1: +500 ци × бонусы |
| | `useRefinedPill()` | Тир 2: +5000 ци × бонусы |
| | `useSpiritualPill()` | Тир 3: +50000 ци × бонусы, +8% дао, +5 п.п. прорыва |
| | `useHeavenlyPill()` | Тир 4: +500000 ци × бонусы, +1 стат текущей жизни |
| | `usePillMulti(tier, count)` | Массовое использование (x1/x10/x100) |
| | `refinePillTier(fromTier)` | Рефайн: 5 пилюль + пыль → 1 следующего тира |
| | `refinePillMulti(fromTier, count)` | Массовый рефайн (x1/x10/x100) |
| | `_getPillMult()` | Общий множитель эффекта пилюль (секта/артефакт/формация/мировое событие) |
| | `canBuyInsight(count)` | Проверка жизни, Дао, полной стоимости и наличия немаксимальной экипированной техники |
| | `getInsightPurchaseInfo(count)` | Чистый расчёт последовательного пакета: использованное число свитков, цена и XP с учётом повышений и максимума |
| | `buyInsight(count)` | Оплата рассчитанного пакета и немедленное начисление XP |
| | `_grantTechniqueXP(id, gain)` / `_flushPendingInsightXP()` | Единое повышение уровней; разовая выдача legacy-остатка после загрузки |
| techniques.js | `getTechniqueTierMultiplier(tier, effectKey)` | Силовая кривая 1/1.5/2/2.75/3.5/4.5; поддержка 1/1.25/1.5/1.8/2.1/2.5 |
| | `getTechniqueEffectBonus(techOrId, key, level)` | Общий эффект с уровнем, семейством тира и совпадением элемента для логики и UI |
| world.js | `getCurrentEra()` | Текущая эпоха |
| | `checkWorldEvent()` | Проверка/запуск мировых событий |
| | `checkMilestones()` | Проверка достижений |
| | `triggerEvent()` | Запуск случайных событий |
| prestige.js | `getMinRootTier()` / `getAvailableRoots()` / `selectSpiritualRoot(id)` | Гарантированный минимум тела, доступные корни и однократное подтверждение; ручные элементы только открытые/уникальные |
| | `calculateKarma(naturalDeath)` | Расчёт кармы (+50% за естественную смерть) |
| | `beginRebirth(naturalDeath)` | Фиксация и сохранение кармы перед магазином перерождения |
| | `rebirth(bodyId, naturalDeath)` | Перерождение с выбранным телом без повторного начисления pending-кармы |
| | `buyKarmaUpgrade(id)` | Купить кармическое улучшение |
| | `exchangeResources(from, to, amount)` | Обмен ресурсов (Сын Торговца): 10 камней=1 пыль, 15=1 эссенция, 20=1 пилюля, 2 пыли=1 эссенция, 1 эссенция=1 пыль |
| sects.js | `canJoinSect(id)` | Проверка требований секты |
| | `joinSect(id)` | Вступление (+ изучение техники) |
| | `leaveSect()` | Покинуть секту (unequip + удаление техник секты из learned и TECHNIQUES) |
| | `getSectBonus(effectKey)` | Бонус секты по уровню Дао; ранговый множитель применяется к вкладу заданий |
| | `tickSectMission()` | Раздельный кулдаун для каждого слота заданий (из passYear) |
| | `completeSectMission(index)` | Выполнить задание по индексу, слот переходит на кулдаун |
| | `_completePillDonationMissions()` | Завершить только поручение сдачи пилюль после пожертвования или годовой проверки |
| expeditions.js | `canStartExpedition(id)` | Проверка доступа |
| | `startExpedition(id)` | Начать экспедицию |
| | `tickExpedition()` | Проверка завершения (из passYear) |
| | `getExpeditionProgress()` | Прогресс 0-1 |
| | `getExpeditionRewardMultipliers(loc)` | Ограниченные множители ресурсов; общий источник UI и выдачи |
| | `getExpeditionDuration(loc)` | База / (1 + скорость), минимум 10 лет |
| | `getExpeditionArtifactReward(loc)` / `getExpeditionScrollReward(loc)` / `getExpeditionDaoReward(loc)` | Общие расчёты шансов, тиров и диапазонов наград |
| adventures.js | `getAdventureCheck(adv, choice, flags)` | Общий resolver проверок; фиксированные бюджеты challengeRealm 7/8/9, функции подготовки читают сохранённые флаги |
| | `acceptAdventure(id)` / `chooseAdventureOption(index, choice)` | Принятие с атомарной оплатой, выбор и сохранение отложенной ветки |
| artifacts.js | `generateArtifact(tier?, slot?)` | Процедурная генерация артефакта |
| | `addArtifact(art)` | Добавить в инвентарь |
| | `equipArtifact(id)` / `unequipArtifact(slot)` | Экипировка |
| | `enhanceArtifact(id, useCrone)` | Заточка +0..+10 (BDO-style с failstacks) |
| | `getEnhanceMult(enhance)` | Множитель заточки: 1.2^enhance |
| | `getTranscendMult(transcend)` | Множитель слияния PRI→PEN |
| | `getArtifactEffectMult(art)` | enhanceMult × transcendMult |
| | `fuseArtifacts(keepId, consumeId)` | Первое слияние двух +10 артефактов; далее одинаковый уровень слияния, тир и слот могут различаться |
| | `disassembleArtifact(id)` | Бонусы только к базовой добыче, возврат 50% вложений отдельно |
| | `ascendTechnique(techId)` | Вознесение техники на следующий тир |
| | `getArtifactBonus(effectKey)` | Суммарный бонус экипированных артефактов |
| formations.js | `buyFormation(id)` | Купить уровень формации за камни (на текущую жизнь) |
| | `getFormationBonus(effectKey)` | Бонус формаций |
| lifecycle.js | `tick()` [200мс] | Авто-ци/XP, прокачка техник |
| | `passYear()` [5с] | Возраст, доход, эпохи, смерть, секта, экспедиции |
| | `start()` / `stop()` | Запуск/остановка таймеров |
| | `reset(keepPrestige)` | Полный сброс состояния |

---

## ui/ — Интерфейс

| Файл | Функция | Описание |
|------|---------|----------|
| update.js | `switchTab(tabId)` | Переключение вкладок (8 табов) |
| | `updateUI()` | Полное обновление (статы, реалм, тултипы, множители) — по событиям |
| | `updateTickUI()` | Лёгкое обновление (ци-бар, кнопки, прогресс-бары) — 5×/сек |
| | `updateActivityBars()` | Прогресс-бары активностей |
| tabs.js | `renderTechniques()` | Карточки техник с XP-барами |
| | `renderMilestones()` | Список достижений |
| | `formatTechEffects()` | Форматирование эффектов через общий getTechniqueEffectBonus() |
| | `toggleTechEquip(id)` | Надеть/снять технику |
| artifacts.js | `renderArtifacts()` | Таб артефактов: экипировка (4 слота) + компактный список инвентаря (1 строка/артефакт) + выпадающая панель заточки под выбранным |
| | `renderFormations()` | Секция формаций (в табе культивации) |
| | `selectArtifactForForge(id)` | Выбрать артефакт — панель заточки/слияния выпадает inline |
| | `_buildForgePanel()` | Генерация HTML панели: инфо + заточка + слияние + экип/разбор |
| | `enhanceArtifactUI()` / `disassembleArtifactUI()` | Заточка (BDO-style, анимации) / разбор (оверлей в панели) |
| | `openBulkDisassembleMenu()` / `confirmBulkDisassemble()` | Массовый разбор выбранных тиров; пропускает экипированные и заточенные артефакты |
| sects.js | `renderSects()` | Таб секты: выбор или инфо + задание. `_sectAnimLock` предотвращает ре-рендер во время анимации завершения/повышения |
| | `updateSectRankBar()` | Обновление прогресс-бара ранга секты (плавная анимация при пожертвовании, без полного ре-рендера) |
| | `joinSectUI()` / `showLeaveSectConfirm()` / `confirmLeaveSect()` | Вступление/подтверждение выхода |
| | `completeSectMissionUI()` | Выполнить задание |
| expeditions.js | `renderExpeditions()` | Таб тайных царств: список + активная экспедиция |
| | `startExpeditionUI()` | Начать экспедицию |
| modals.js | `showSpiritualRootModal()` | Модалка при старте |
| | `showRebirthModal(naturalDeath)` | Модалка перерождения (900px шир., 95vw макс, все аккордеон-секции открыты по умолчанию) |
| | `performRebirth()` | Выполнить перерождение из модалки |
| | `voluntaryRebirth()` | Рассеивание (инлайн-панель с списком потерь) |
| | `confirmVoluntaryRebirth()` / `cancelVoluntaryRebirth()` | Подтверждение/отмена рассеивания |
| | `playIntro()` | Вступительная история |
| init.js | `addLog(text, type)` | Запись в хроники (с data-worldYear/data-charAge) |
| | `toggleLogTimeMode()` | Переключение мир/возраст в хрониках |
| | `initGame()` | Точка входа (биндинги, загрузка сохранения) |

---

## index.html — Структура

```
#rebirth-modal           — Модалка перерождения
#root-modal              — Модалка духовного корня
#app
  header                 — Заголовок + эпоха + мировое событие
  .main-layout           — 3 колонки (grid)
    .stats-panel         — Корень, реалм, статы, ресурсы, секта, экспедиция, рассеивание
    .center-panel        — Табы:
      #tab-cultivation   — Ци-бар, Дао, множители, прорыв, пилюли, формации, активности
      #tab-sect          — Выбор/инфо секты, ранг, задания
      #tab-expeditions   — Тайные царства, прогресс экспедиции
      #tab-adventures    — Слухи, активные приключения и выборы
      #tab-artifacts     — Слоты экипировки + инвентарь артефактов
      #tab-techniques    — Карточки техник с XP-барами
      #tab-milestones    — Список достижений
      #tab-options       — Настройки, сохранение/импорт, debug, FAQ
    .log-panel           — Хроники событий
```

---

## Поток игры

```
initGame()
  ├── hasSave()? → loadGame() → applyLoadedState() → resumeLoadedGame()
  │                 ├── pendingRebirth → showRebirthModal() без таймеров
  │                 ├── нет корня → showSpiritualRootModal() без таймеров
  │                 └── есть корень и жизнь не окончена → game.start()
  └── new game  → showSpiritualRootModal() → acceptRoot() → game.selectSpiritualRoot()
                    → learnTechnique("basic_breathing")
                    → вступление в первой жизни → game.start()

game.start()
  ├── tick()         [200ms, 5×/сек]  → авто-ци/XP, прокачка техник XP, updateTickUI()
  ├── passYear()     [5s]  → возраст++, доход, эпохи, мир. события, секта задания, экспедиции, смерть
  ├── triggerEvent() [15s] → цепочки → манхва → обычные события (вкл. артефакты)
  └── autoSave       [30s] → localStorage

tick() → ци при meditation, если нет экспедиции; XP статов и экипированных техник продолжается в пути
breakthrough() → checkMilestones() → updateUI()
setActivity() → смена текущей тренировки
joinSect() → техника секты, бонусы
startExpedition() → снимок множителей ресурсов → таймер → награды
```

Интервалы тика, года и случайных событий делятся на текущую скорость времени и `debugSpeed`; авто-сохранение остаётся раз в 30 реальных секунд.

---

## Как добавить...

### Новое событие
Добавить в нужный файл в `data/events/` (early/mid/late/sects/chains/cameos) через `.push()`:
```js
EVENTS.push({
    id: "unique_id", text: "Текст", type: "reward",
    condition: (g) => g.realmIndex >= 3 && g.realmIndex <= 7,
    effect: (g) => { g.stones += 10; return "+10 камней"; }
});
```

### Новую технику
Добавить в `data/techniques.js` → массив `TECHNIQUES`:
```js
{ id: "unique_id", name: "Название", description: "...",
  tier: "rare", type: "cultivation", element: "fire", maxLevel: 10,
  effects: { qi: 0.04 },
  requirement: { realm: 3 }, source: "event" }
// + событие выдачи в data/events/early.js (или mid.js, late.js)
```

### Новый таб
1. `index.html` — `.tab-btn` + `div.tab-content`
2. `ui/` — render-функция в новом или существующем файле
3. `ui/update.js` — условие в `switchTab()`
4. `style.css` — стили

### Новое поле в game
1. Добавить в `game/state.js`
2. Добавить в `game/lifecycle.js` → `reset()`
3. Добавить в `getSaveableState()` в `save.js`
4. Добавить в `applyLoadedState()` в `save.js` с дефолтом

### Новую секту
Добавить в `data/sects/definitions.js` → массив `SECTS`, технику в `data/sects/techniques.js` → `SECT_TECHNIQUES`, задания в `data/sects/missions.js` → `SECT_MISSION_TEMPLATES`

### Новое тайное царство
Добавить в `data/locations.js` → массив `LOCATIONS`

### Новую формацию
Добавить в `data/formations.js` → массив `CULT_FORMATIONS`
