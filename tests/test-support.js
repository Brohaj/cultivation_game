const PROJECT_ROOT = require('node:path').resolve(__dirname, '..');
// Изолированная среда для регрессий и воспроизводимых расчётов баланса.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(PROJECT_ROOT, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(match => match[1]);

function createContext(saved) {
    const storage = new Map();
    if (saved) storage.set('cultivation_game_prototype_save', JSON.stringify(saved));
    const elements = new Map();
    let timerId = 0;
    const timers = new Set();
    const classList = () => ({ add() {}, remove() {}, toggle() {}, contains() { return false; } });
    const element = () => ({ style:{}, dataset:{}, classList:classList(), children:[], innerHTML:'', textContent:'',
        appendChild(node){this.children.push(node);return node;},setAttribute(){},addEventListener(){},removeEventListener(){},
        querySelector(){return null;},querySelectorAll(){return [];},remove(){},getBoundingClientRect(){return {left:0,top:0,width:0,height:0};} });
    for (const id of ['rebirth-modal', 'rebirth-content', 'rebirth-confirm-panel', 'btn-rebirth', 'root-modal', 'event-log', 'btn-breakthrough', 'btn-save', 'btn-new-game', 'btn-log-time-toggle']) {
        elements.set(id, { style: {}, classList: classList(), children: [], innerHTML: '', appendChild() {}, addEventListener() {} });
    }
    const context = vm.createContext({
        console,
        _testElement:element,
        document: {
            hidden: false,
            createElement:element,
            getElementById: id => elements.get(id) || null,
            querySelectorAll: () => [], querySelector: () => null,
            addEventListener() {}, removeEventListener() {},
        },
        localStorage: {
            getItem: key => storage.get(key) ?? null,
            setItem: (key, value) => storage.set(key, String(value)),
            removeItem: key => storage.delete(key),
        },
        setInterval() { const id = ++timerId; timers.add(id); return id; },
        clearInterval(id) { timers.delete(id); },
        setTimeout() { return ++timerId; }, clearTimeout() {},
        addEventListener() {}, navigator: {},
    });
    vm.runInContext('window = globalThis;', context);
    for (const script of scripts) {
        vm.runInContext(fs.readFileSync(path.join(PROJECT_ROOT, script), 'utf8'), context, { filename: script });
    }
    vm.runInContext(`
        addLog = function() {};
        updateUI = updateTickUI = function() {};
        renderRebirthContent = renderRootSelection = function() {};
        playIntro = function() {};
    `, context);
    return {
        run: code => vm.runInContext(code, context),
        saved: () => JSON.parse(storage.get('cultivation_game_prototype_save')),
        timers,
    };
}

module.exports = { createContext, scripts };
