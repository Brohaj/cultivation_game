const PROJECT_ROOT = require('node:path').resolve(__dirname, '..');
// Реальное превью и клики содержательных развилок, без пользовательского профиля.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({headless:true});
    try {
        const page = await browser.newPage({viewport:{width:1500,height:1100}});
        const errors=[];
        page.on('pageerror',error=>errors.push(error.message));
        const save=JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT,'test-fixtures','player-report-v14.json'),'utf8'));
        await page.addInitScript(data=>localStorage.setItem('cultivation_game_prototype_save',JSON.stringify(data)),save);
        await page.goto(pathToFileURL(path.join(PROJECT_ROOT,'index.html')).href);
        await page.evaluate(()=>game.stop());
        await page.evaluate(()=>{
            window.setDecisionScenario=(id,step,flags={})=>{
                game.gameOver=false;game.pendingRebirth=null;game.realmIndex=7;
                game.strength=100;game.spirit=100;game.luck=30;game.stones=5000;
                game.daoEssence=1000;game.artifactDust=1000;game.flags={};game.sect=null;
                game.artifacts=[];game.equippedArtifacts={weapon:null,armor:null,accessory:null,treasure:null};
                game.lastAdventureReward=null;game.completedAdventures=[];game.adventureRumors=[];
                game.activeAdventures=[{id,currentStep:step,flags,awaitingChoice:true,completedSteps:[],stepStartYear:game.years,stepDuration:0}];
                Math.random=()=>0;switchTab('adventures');updateUI();
            };
        });
        async function clickChoice(button) {
            await button.click();
            // Продукт откладывает замену нажатого DOM до завершения click.
            await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,0)));
        }

        await page.evaluate(()=>{setDecisionScenario('demon_lair',1,{stealth:true});game.spirit=132;renderAdventures();});
        let button=page.locator('.adventure-choice-btn').first();
        assert.match(await button.locator('.adventure-choice-reqs').textContent(),/Дух: нужно 133 · у вас 132/);
        assert.equal(await button.locator('.adventure-choice-reqs .adventure-check-fail').count(),1);
        await clickChoice(button);
        assert.equal(await page.evaluate(()=>game.activeAdventures[0].flags.purified_partial),true);
        assert.equal(await page.evaluate(()=>game.spirit),129);
        console.log('PASS Позднее превью показывает фиксированный порог 133 и исполняет красную провальную ветку');

        await page.evaluate(()=>{setDecisionScenario('demon_lair',1,{stealth:true});game.spirit=133;renderAdventures();});
        button=page.locator('.adventure-choice-btn').first();
        assert.match(await button.locator('.adventure-choice-reqs').textContent(),/Дух: нужно 133 · у вас 133/);
        assert.equal(await button.locator('.adventure-choice-reqs .adventure-check-pass').count(),1);
        await clickChoice(button);
        assert.equal(await page.evaluate(()=>game.activeAdventures[0].flags.purified),true);
        assert.equal(await page.evaluate(()=>game.spirit),133);
        console.log('PASS Точная граница поздней проверки совпадает у UI и обработчика');

        await page.evaluate(()=>{setDecisionScenario('root_eater',1,{flooded:true});game.realmIndex=2;game.strength=6;renderAdventures();});
        button=page.locator('.adventure-choice-btn').first();
        assert.match(await button.locator('.adventure-choice-reqs').textContent(),/Сила: нужно 6 · у вас 6/);
        assert.match(await button.locator('.adventure-choice-desc').textContent(),/Ослабленная/);
        await clickChoice(button);
        assert.equal(await page.evaluate(()=>game.daoEssence),1005);
        assert.equal(await page.evaluate(()=>game.artifacts.length),1);
        console.log('PASS Затопление облегчает проверку в реальном интерфейсе и сохраняет ядро');

        await page.evaluate(()=>{setDecisionScenario('root_eater',1,{lured:true});game.realmIndex=2;game.luck=4;renderAdventures();});
        button=page.locator('.adventure-choice-btn').nth(1);
        assert.match(await button.locator('.adventure-choice-reqs').textContent(),/Удача: нужно 4 · у вас 4/);
        await clickChoice(button);
        assert.equal(await page.evaluate(()=>game.stones),5035);
        console.log('PASS Ловушка показывает и применяет отдельный порог захвата');

        await page.evaluate(()=>setDecisionScenario('ancient_tomb',3,{luck_pass:true,guardian_defeated:true}));
        button=page.locator('.adventure-choice-btn').nth(2);
        assert.match(await button.locator('.adventure-choice-desc').textContent(),/не ниже эпического/);
        await clickChoice(button);
        assert.equal(await page.evaluate(()=>game.artifacts[0].tier),'epic');
        console.log('PASS Итог Зала обещает и выдаёт эпический артефакт при целой печати');

        await page.evaluate(()=>setDecisionScenario('ascend_heavenly_auction',0,{}));
        button=page.locator('.adventure-choice-btn').nth(1);
        assert.match(await button.locator('.adventure-choice-reqs').textContent(),/200 камней/);
        assert.match(await button.locator('.adventure-choice-desc').textContent(),/не ниже редкого/);
        await clickChoice(button);
        assert.equal(await page.evaluate(()=>game.stones),4800);
        assert.equal(await page.evaluate(()=>game.activeAdventures[0].flags.bought),true);
        button=page.locator('.adventure-choice-btn').first();
        assert.match(await button.locator('.adventure-choice-desc').textContent(),/Купленный артефакт не ниже редкого/);
        assert.match(await button.locator('.adventure-choice-duration').textContent(),/20 лет/);
        await clickChoice(button);
        assert.equal(await page.evaluate(()=>game.activeAdventures[0].stepDuration),20);
        assert.equal(await page.evaluate(()=>game.artifacts.length),0);
        await page.evaluate(()=>{game.years+=game.activeAdventures[0].stepDuration;game.tickAdventures();});
        assert.equal(await page.evaluate(()=>game.artifacts[0].tier),'rare');
        console.log('PASS Платная покупка Чёрного Рынка показывает цену и отдельный результат');

        await page.evaluate(()=>setDecisionScenario('ascend_spirit_forest',1,{invited:true}));
        button=page.locator('.adventure-choice-btn').nth(1);
        assert.match(await button.locator('.adventure-choice-desc').textContent(),/\+30% кармы/);
        assert.match(await button.locator('.adventure-choice-desc').textContent(),/не складываются/);
        await clickChoice(button);
        await page.evaluate(()=>{game.years+=game.activeAdventures[0].stepDuration;game.tickAdventures();});
        assert.equal(await page.evaluate(()=>game.flags.ancient_tree_seed),true);
        console.log('PASS Семя честно показывает кармический бонус и выдаётся после исследования');

        assert.deepEqual(errors,[]);
        console.log('7 браузерных сценариев прошли, 0 ошибок страницы');
    } finally {
        await browser.close();
    }
})().catch(error=>{console.error(error);process.exitCode=1;});
