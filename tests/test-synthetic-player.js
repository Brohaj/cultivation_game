// Выдуманный профиль для проверки миграции старого формата и интерфейса секты.
// Создаётся в памяти тестов; игровые сохранения пользователей в репозиторий не входят.
module.exports = function makeSyntheticSectPlayer() {
    return {
        name: 'Тестовый культиватор',
        version: 16,
        realmIndex: 3,
        subLevel: 3,
        years: 120,
        birthYear: 60,
        stones: 1200,
        strength: 40,
        spirit: 45,
        luck: 30,
        spiritualRoot: {
            id: 'common', name: 'Обычный корень', description: 'Тестовый духовный корень',
            qiMultiplier: 1, elements: [], tier: 'common', color: '#aaa'
        },
        sect: { id: 'jade_purity', rank: 2, contribution: 1000 },
        sectMissions: [{cooldown: 5}, {cooldown: 7}, {cooldown: 9}]
    };
};
