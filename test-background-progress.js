// Компенсация фоновой вкладки должна соблюдать тот же порядок тиков и лет, что обычная игра.
const assert = require('node:assert/strict');
const test = require('node:test');
const {createContext} = require('./test-support');

function expeditionContext() {
    const ctx=createContext();
    ctx.run(`game.reset();game.selectSpiritualRoot('common');game.realmIndex=3;game.stones=1000;
        Math.random=()=>0;game.getCombatPower=()=>10000;game.qiPerSec=()=>10;
        game.checkWorldEvent=game.tickAdventureRumors=game.checkMilestones=game.triggerEvent=()=>{};
        game.startExpedition('spirit_forest');game.qi=0;
        Date.now=()=>100000;game.tickTimer=1;
        game._lastTickTime=40000;game._lastYearTime=40000;game._lastEventTime=40000;
        game._startVisibilityHandler();`);
    return ctx;
}

test('Возврат через минуту восстанавливает медитацию после похода как обычные тики', () => {
    const background=expeditionContext(),foreground=expeditionContext();
    background.run('game._visHandler();');
    foreground.run('for(let i=1;i<=300;i++){game.tick();if(i%25===0)game.passYear();}');
    for (const field of ['qi','years','totalMeditations','meditationYears','stones']) {
        assert.equal(background.run(`game.${field}`),foreground.run(`game.${field}`),field);
    }
    assert.equal(background.run('game.totalMeditations'),50);
    assert.equal(background.run('game.expedition'),null);
});

test('Долгая компенсация сохраняет лимиты таймеров и порядок событий относительно лет', () => {
    const ctx=createContext();
    ctx.run(`Date.now=()=>2000000;game.tickTimer=1;
        game._lastTickTime=1000;game._lastYearTime=1000;game._lastEventTime=1000;
        var counts={ticks:0,years:0,events:0};var eventYears=[];
        game.tick=()=>counts.ticks++;game.passYear=()=>counts.years++;
        game.triggerEvent=()=>{counts.events++;eventYears.push(counts.years);};
        game._startVisibilityHandler();game._visHandler();`);
    assert.deepEqual(JSON.parse(ctx.run('JSON.stringify(counts)')),{ticks:300,years:200,events:20});
    assert.deepEqual(JSON.parse(ctx.run('JSON.stringify(eventYears)')),Array.from({length:20},(_,i)=>(i+1)*3));
    ctx.run('game._visHandler();');
    assert.deepEqual(JSON.parse(ctx.run('JSON.stringify(counts)')),{ticks:300,years:200,events:20});
});

test('Компенсация прекращает жизнь в момент смерти, не исполняя последующие события', () => {
    const ctx=createContext();
    ctx.run(`Date.now=()=>100000;game.tickTimer=1;
        game._lastTickTime=40000;game._lastYearTime=40000;game._lastEventTime=40000;
        var counts={ticks:0,years:0,events:0};game.tick=()=>counts.ticks++;
        game.passYear=()=>{counts.years++;game.gameOver=true;};game.triggerEvent=()=>counts.events++;
        game._startVisibilityHandler();game._visHandler();`);
    assert.deepEqual(JSON.parse(ctx.run('JSON.stringify(counts)')),{ticks:25,years:1,events:0});
});

test('Большое ускорение использует положительные интервалы и в игре, и при компенсации', () => {
    const ctx=createContext();
    ctx.run(`var intervals=[];setInterval=(fn,ms)=>{intervals.push(ms);return intervals.length;};
        game.getSpeedMultiplier=()=>225;game.start();
        Date.now=()=>2000000;game._lastTickTime=1000;game._lastYearTime=1000;game._lastEventTime=1000;
        var ticksBeforeFirstYear=null;var tickCount=0;game.tick=()=>tickCount++;
        game.passYear=()=>{if(ticksBeforeFirstYear===null)ticksBeforeFirstYear=tickCount;};
        game.triggerEvent=()=>{};game._visHandler();`);
    assert.deepEqual(JSON.parse(ctx.run('JSON.stringify(intervals.slice(0,3))')),[1,22,66]);
    assert.equal(ctx.run('ticksBeforeFirstYear'),22);
    assert.equal(ctx.run('tickCount'),300);
});
