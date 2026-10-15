// Пороговая проверка использует ровно тот же сценарий, что npm run balance:simulate.
const fs = require('node:fs');
const path = require('node:path');
const { simulate } = require('./simulate-balance');

const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--thresholds')) {
    console.error('Использование: node tools/check-balance.js [--thresholds путь.json]');
    process.exit(2);
}

const configPath = args.length ? path.resolve(args[1]) : path.join(__dirname, '../docs/balance_thresholds.json');
try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (!Number.isInteger(config.seed) || config.seed < 0 || config.seed > 0xffffffff) {
        throw new Error('seed должен быть целым числом от 0 до 2^32 - 1');
    }
    if (!Array.isArray(config.lives) || config.lives.length !== 4) {
        throw new Error('Ожидаются пороги для четырёх жизней');
    }

    const lives = simulate(config.seed, { quiet: true });
    if (!Array.isArray(lives) || lives.length !== config.lives.length) {
        throw new Error('Симулятор вернул неполные результаты');
    }

    const failures = [];
    for (let index = 0; index < config.lives.length; index++) {
        const expected = config.lives[index];
        const row = lives[index];
        if (expected.life !== index + 1 || row.life !== expected.life) {
            throw new Error(`Неверный номер жизни в записи ${index + 1}`);
        }
        for (const metric of ['age', 'realm', 'stones']) {
            const bounds = expected.ranges?.[metric];
            if (!Array.isArray(bounds) || bounds.length !== 2 ||
                !bounds.every(Number.isFinite) || bounds[0] > bounds[1]) {
                throw new Error(`Некорректные границы для жизни ${expected.life}, ${metric}`);
            }
            if (!Number.isFinite(row[metric])) {
                failures.push(`Жизнь ${row.life}, ${metric}: некорректное значение ${row[metric]}`);
            } else if (row[metric] < bounds[0] || row[metric] > bounds[1]) {
                failures.push(`Жизнь ${row.life}, ${metric}: ${row[metric]} вне [${bounds.join(', ')}]`);
            }
        }
        console.log(`Жизнь ${row.life}: возраст ${row.age}, реалм ${row.realm}, камни ${row.stones}`);
    }
    if (failures.length) {
        console.error(`Пороговая проверка не пройдена (seed=${config.seed}):\n${failures.join('\n')}`);
        process.exitCode = 1;
    } else {
        console.log(`Пороговая проверка пройдена (seed=${config.seed}).`);
    }
} catch (error) {
    console.error(`Ошибка пороговой проверки: ${error.message}`);
    process.exitCode = 1;
}
