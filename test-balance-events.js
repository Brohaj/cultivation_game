// Регрессии повторяемых каменных наград: вклад удачи ограничен, ранние числа прежние.
const assert = require('node:assert/strict');
const test = require('node:test');
const { createContext } = require('./test-support');

const cases = [
    { id:'stone_vein', realm:2, base:5, rate:1 }, // RNG=.5, значит 2*.5.
    { id:'lightning_minerals', realm:3, base:15, rate:3 },
    { id:'fallen_star_fragment', realm:2, base:8, rate:2 },
    { id:'ancient_ruins_explore', realm:4, base:10, rate:3 },
    { id:'rogue_cultivator_trade', realm:4, base:15, rate:2 },
    { id:'tribulation_lightning_harvest', realm:8, base:25, rate:4 },
];

function collect(entry, luck) {
    const ctx=createContext();
    ctx.run(`game.realmIndex=${entry.realm}; game.luck=${luck}; game.stones=0;
        game.pills=100; Math.random=()=>.5;`);
    return JSON.parse(ctx.run(`JSON.stringify((() => {
        const event=EVENTS.find(e=>e.id==='${entry.id}');
        const gains=[];
        for (let i=0;i<2;i++) {
            if (!event.condition(game)) throw new Error('Expected repeatable event: '+event.id);
            const before=game.stones;
            game.executeEvent(event);
            gains.push(game.stones-before);
        }
        return { gains, luckBonus:game.getRewardLuckBonus(), type:event.type };
    })())`));
}

for (const entry of cases) {
    test(`${entry.id}: 100 и 10 000 удачи дают одинаковую базовую награду`, () => {
        const normal=collect(entry,100);
        const extreme=collect(entry,10000);
        const cappedBase=entry.base+100*entry.rate;
        const expected=result=>cappedBase+(result.type==='reward' ? Math.floor(cappedBase*result.luckBonus) : 0);
        assert.deepEqual(normal.gains,[expected(normal),expected(normal)]);
        assert.deepEqual(extreme.gains,[expected(extreme),expected(extreme)]);
        assert.ok(extreme.gains[0] <= Math.floor(cappedBase*1.5));
    });

    test(`${entry.id}: обычная удача сохраняет цену, отрицательная не уменьшает награду`, () => {
        const normal=collect(entry,5);
        const oldBase=entry.base+5*entry.rate;
        const expected=oldBase+(normal.type==='reward' ? Math.floor(oldBase*normal.luckBonus) : 0);
        assert.deepEqual(normal.gains,[expected,expected]);
        const negative=collect(entry,-10000);
        assert.deepEqual(negative.gains,[entry.base,entry.base]);
    });
}
