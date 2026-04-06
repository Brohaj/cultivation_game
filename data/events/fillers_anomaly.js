// ============================================================
// EVENTS/FILLERS_ANOMALY.JS — Аномальные филлеры (реалм 5-10)
// Повторяемые, кулдаун 50 лет. Сюр, лёгкий хоррор, атмосфера
// ============================================================

EVENTS.push(
    // --- 21. Эхо без источника ---
    {
        id: "echo_without_source",
        text: "Вы услышали шаги позади. Остановились — шаги тоже. Повернулись — никого. Пошли дальше. Теперь шаги звучали впереди.",
        type: "event",
        condition: (g) => g.realmIndex >= 5 && g.realmIndex <= 10 && g.years - (g.flags._cd_echo || 0) >= 50,
        effect: (g) => {
            g.flags._cd_echo = g.years;
            return "Вы ускорили шаг. Шаги впереди тоже.";
        }
    },

    // --- 22. Человек, который вас помнит ---
    {
        id: "man_who_remembers_you",
        text: "Незнакомец улыбнулся вам, как старому другу. Назвал по имени. Спросил, как дела. Вы не помнили его. Он — помнил слишком хорошо. Когда вы обернулись — улица была пуста.",
        type: "event",
        condition: (g) => g.realmIndex >= 6 && g.realmIndex <= 10 && g.prestige.totalRebirths >= 1 && g.years - (g.flags._cd_remembers_you || 0) >= 50,
        effect: (g) => {
            g.flags._cd_remembers_you = g.years;
            return "Кто-то помнит вас. Из жизни, которой вы не помните.";
        }
    },

    // --- 23. Река течёт вверх ---
    {
        id: "river_flows_upstream",
        text: "Река текла вверх по склону. Тихо и уверенно, как будто так и должно быть. Вы смотрели, пока не перестали быть уверены, что вообще бывает «вниз».",
        type: "event",
        condition: (g) => g.realmIndex >= 7 && g.realmIndex <= 10 && g.years - (g.flags._cd_river_upstream || 0) >= 50,
        effect: (g) => {
            g.flags._cd_river_upstream = g.years;
            const bonus = eventQiBonus(g,0.03);
            g.qi = Math.min(g.qi + bonus, g.qiNeeded());
            return `+${bonus} ци. Законы мира — не так незыблемы, как казалось.`;
        }
    },

    // --- 24. Тень отстаёт ---
    {
        id: "shadow_lagging",
        text: "Вы сделали шаг. Тень повторила его... с задержкой. Вы остановились. Тень сделала ещё один шаг вперёд. Потом замерла. Как будто поняла, что вы заметили.",
        type: "event",
        condition: (g) => g.realmIndex >= 6 && g.realmIndex <= 9 && g.years - (g.flags._cd_shadow || 0) >= 50,
        effect: (g) => {
            g.flags._cd_shadow = g.years;
            return "Вы старались не думать об этом до конца дня.";
        }
    },

    // --- 25. Незаконченная мысль ---
    {
        id: "unfinished_sentence",
        text: "Вы вспомнили важную мысль. Почти поймали её за хвост. Она начиналась со слов: «Если всё это правда, тогда...» Дальше — тишина. Мысль ушла. Вы не уверены, что хотели бы её поймать.",
        type: "event",
        condition: (g) => g.realmIndex >= 5 && g.realmIndex <= 9 && g.years - (g.flags._cd_unfinished || 0) >= 50,
        effect: (g) => {
            g.flags._cd_unfinished = g.years;
            return "Некоторые мысли лучше не додумывать.";
        }
    },

    // --- 26. Дверь в никуда ---
    {
        id: "door_in_nowhere",
        text: "Посреди пустого поля стояла дверь. Просто дверь, без стен. Она была приоткрыта. Внутри — темнота. Вы не стали проверять. Дверь закрылась сама.",
        type: "event",
        condition: (g) => g.realmIndex >= 7 && g.realmIndex <= 10 && g.years - (g.flags._cd_door || 0) >= 50,
        effect: (g) => {
            g.flags._cd_door = g.years;
            return "Правильное решение. Наверное.";
        }
    },

    // --- 27. Голос вашим голосом ---
    {
        id: "voice_with_your_voice",
        text: "Вы услышали свой голос. Он звал вас по имени. Спокойно. Уверенно. Он доносился откуда-то изнутри вас. Вы молчали. Голос тоже замолчал. Последним.",
        type: "event",
        condition: (g) => g.realmIndex >= 8 && g.realmIndex <= 10 && g.years - (g.flags._cd_voice || 0) >= 50,
        effect: (g) => {
            g.flags._cd_voice = g.years;
            const bonus = eventQiBonus(g,0.02);
            g.qi = Math.min(g.qi + bonus, g.qiNeeded());
            return `+${bonus} ци. Кто говорил — вы или он?`;
        }
    },

    // --- 28. Люди, которые вас не видят ---
    {
        id: "people_who_dont_see_you",
        text: "Оживлённая улица. Люди смеялись, торговались, ругались. Никто не посмотрел на вас. Вы остановились посреди толпы. Мир не заметил. Или вы перестали быть частью мира?",
        type: "event",
        condition: (g) => g.realmIndex >= 6 && g.realmIndex <= 10 && g.years - (g.flags._cd_invisible || 0) >= 50,
        effect: (g) => {
            g.flags._cd_invisible = g.years;
            return "Культиватор стоит между мирами. Это цена.";
        }
    },

    // --- 29. Небо слишком близко ---
    {
        id: "sky_too_close",
        text: "Небо казалось слишком близким. Стоило поднять руку — и можно было коснуться облаков. Вы не стали проверять. Почему-то это было важно — не проверять.",
        type: "event",
        condition: (g) => g.realmIndex >= 7 && g.realmIndex <= 10 && g.years - (g.flags._cd_sky_close || 0) >= 50,
        effect: (g) => {
            g.flags._cd_sky_close = g.years;
            return "Небо смотрело в ответ.";
        }
    },

    // --- 30. Чужая память ---
    {
        id: "memory_that_isnt_yours",
        text: "На мгновение вы вспомнили жизнь, которой не было. Другой дом. Других людей. Другого себя. Воспоминание исчезло, оставив лёгкую тоску. И уверенность, что оно было настоящим.",
        type: "event",
        condition: (g) => g.realmIndex >= 8 && g.realmIndex <= 10 && g.prestige.totalRebirths >= 1 && g.years - (g.flags._cd_false_memory || 0) >= 50,
        effect: (g) => {
            g.flags._cd_false_memory = g.years;
            return "Сколько жизней вы прожили? Сколько — забыли?";
        }
    }
);
