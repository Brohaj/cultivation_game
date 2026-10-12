// Все проверки логики используют отдельные VM и не меняют пользовательский save.
const suites = [
    './test-regression',
    './test-balance-expeditions',
    './test-balance-sects',
    './test-balance-artifacts',
    './test-balance-inheritance',
    './test-balance-events',
    './test-player-expeditions',
    './test-player-events',
    './test-audit-systems',
    './test-content-integrity',
    './test-user-decisions',
    './test-adventure-meditation',
    './test-demon-preview',
    './test-technique-balance',
    './test-sect-donation',
    './test-karma-progression',
    './test-prestige-roots',
];
let failed = false;
for (const suite of suites) {
    process.exitCode = 0;
    require(suite);
    failed ||= process.exitCode !== 0;
}
process.exitCode = failed ? 1 : 0;
