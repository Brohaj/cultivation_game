const PROJECT_ROOT = require('node:path').resolve(__dirname, '..');
const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// 6 ботов: жизнь 1 все в нефрит, потом 2 нефрит, 2 огонь, 2 алхимия
const bots = [
    { id: 1, sect: 'jade' },
    { id: 2, sect: 'jade' },
    { id: 3, sect: 'flame' },
    { id: 4, sect: 'flame' },
    { id: 5, sect: 'moon' },
    { id: 6, sect: 'moon' },
];

console.log('=== Запуск 6 ботов ===');
console.log('Бот 1-2: Нефритовая Чистота');
console.log('Бот 3-4: Багровое Пламя');
console.log('Бот 5-6: Лунное Озеро');
console.log('');

const processes = [];

for (const bot of bots) {
    const proc = spawn('node', ['tests/test-game.js', String(bot.id), bot.sect], {
        cwd: PROJECT_ROOT,
        stdio: ['ignore', 'pipe', 'pipe']
    });

    let lastLine = '';
    proc.stdout.on('data', (data) => {
        const lines = data.toString().split('\n').filter(l => l.trim());
        for (const line of lines) {
            lastLine = line;
            // Показываем смерти, жизни и итоги
            if (line.includes('☠') || line.includes('═══') || line.includes('ИТОГО') ||
                line.includes('Макс') || line.includes('Лучшие') || line.includes('Жизнь')) {
                console.log(line);
            }
        }
    });

    proc.stderr.on('data', (data) => {
        const msg = data.toString().trim();
        if (msg) console.error(`[Бот${bot.id} ERR] ${msg.substring(0, 200)}`);
    });

    proc.on('exit', (code) => {
        console.log(`[Бот${bot.id}-${bot.sect}] Завершён (код ${code})`);
    });

    processes.push({ ...bot, proc });
}

// Периодически выводим сводку
const summaryInterval = setInterval(() => {
    const logFiles = bots.map(b => {
        const logPath = path.resolve(PROJECT_ROOT, 'tests', 'output', `bot${b.id}_${b.sect}.log`);
        try {
            const content = fs.readFileSync(logPath, 'utf-8');
            const lines = content.split('\n');
            // Ищем макс возраст
            let maxAge = 0;
            let lives = 0;
            for (const line of lines) {
                const ageMatch = line.match(/(\d+) лет/);
                if (ageMatch) {
                    const age = parseInt(ageMatch[1]);
                    if (age > maxAge) maxAge = age;
                }
                if (line.includes('ЖИЗНЬ')) lives++;
            }
            return { id: b.id, sect: b.sect, maxAge, lives, lastLine: lines[lines.length - 1] || '' };
        } catch { return { id: b.id, sect: b.sect, maxAge: 0, lives: 0, lastLine: '(запуск...)' }; }
    });

    console.log('\n── Сводка ──');
    logFiles.sort((a, b) => b.maxAge - a.maxAge);
    for (const b of logFiles) {
        console.log(`  Бот${b.id} (${b.sect}): макс ${b.maxAge} лет, ${b.lives} жизней`);
    }
}, 120000); // каждые 2 мин

// Ждём завершения всех
Promise.all(processes.map(p => new Promise(resolve => p.proc.on('exit', resolve)))).then(() => {
    clearInterval(summaryInterval);
    console.log('\n\n=== ВСЕ БОТЫ ЗАВЕРШЕНЫ ===\n');

    // Финальная сводка
    const results = bots.map(b => {
        const logPath = path.resolve(PROJECT_ROOT, 'tests', 'output', `bot${b.id}_${b.sect}.log`);
        try {
            const content = fs.readFileSync(logPath, 'utf-8');
            let maxAge = 0, maxRealm = '', totalLives = 0;
            for (const line of content.split('\n')) {
                const ageMatch = line.match(/☠.*?(\d+) лет.*?(\S+)\[(\d+)\]/);
                if (ageMatch) {
                    const age = parseInt(ageMatch[1]);
                    if (age > maxAge) { maxAge = age; maxRealm = ageMatch[2]; }
                    totalLives++;
                }
            }
            return { id: b.id, sect: b.sect, maxAge, maxRealm, totalLives };
        } catch { return { id: b.id, sect: b.sect, maxAge: 0, maxRealm: '?', totalLives: 0 }; }
    });

    results.sort((a, b) => b.maxAge - a.maxAge);
    console.log('РЕЙТИНГ ПО МАКСИМАЛЬНОМУ ВОЗРАСТУ:');
    console.log('─'.repeat(55));
    results.forEach((r, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
        console.log(`${medal} #${i + 1} Бот${r.id} (${r.sect}): ${r.maxAge} лет, ${r.maxRealm}, ${r.totalLives} жизней`);
    });
    console.log('─'.repeat(55));

    // По сектам
    console.log('\nСРЕДНИЙ МАКС ВОЗРАСТ ПО СЕКТАМ:');
    for (const sect of ['jade', 'flame', 'moon']) {
        const sectBots = results.filter(r => r.sect === sect);
        const avg = sectBots.reduce((s, r) => s + r.maxAge, 0) / sectBots.length;
        console.log(`  ${sect}: ${Math.floor(avg)} лет`);
    }
});
