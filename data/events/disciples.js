// Сцены доступны только с текущим учеником; новых подопечных они не создают.
EVENTS.push(
    {
        id: "disciple_help_in_courtyard",
        text: "После дождя у склада секты намокли тяжёлые связки трав. Один из ваших подопечных берётся помочь. Вы показываете, как распределить усилие, чтобы не порвать канат. Простая работа становится уроком.",
        type: "reward",
        condition: g => g.canTriggerDiscipleHelpEvent(),
        effect: g => g.triggerDiscipleHelpEvent(),
    },
    {
        id: "disciple_training_letter",
        text: "На столе лежит письмо, перевязанное тонкой нитью. Ваш подопечный просит немного эссенции для учебной практики. Поддержать занятия можно, но привычное обучение продолжится и без этого.",
        type: "event",
        condition: g => g.canTriggerDiscipleLetterEvent(),
        effect: g => g.triggerDiscipleLetterEvent(),
    }
);
