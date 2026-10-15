// Один профиль текущей версии: перенос прежнего UI и отсутствие возврата старой игры после сброса.
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const makeSyntheticSectPlayer=require('./test-synthetic-player');
const player=makeSyntheticSectPlayer();

(async()=>{
    const browser=await chromium.launch({headless:true});
    try {
        let passed=0;
        async function scenario(name,primary,fn){
            const context=await browser.newContext();
            const page=await context.newPage(),errors=[];
            page.on('pageerror',error=>errors.push(error.message));
            await page.addInitScript(({player,primary})=>{
                if(!sessionStorage.getItem('profile-test-ready')){
                    localStorage.setItem('cultivation_game_save_v2',JSON.stringify(player));
                    if(primary)localStorage.setItem('cultivation_game_prototype_save',JSON.stringify(primary));
                    sessionStorage.setItem('profile-test-ready','1');
                }
                window.addEventListener('load',()=>game.stop());
            },{player,primary});
            await page.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
            await fn(page);assert.deepEqual(errors,[]);passed++;console.log('PASS '+name);
            await context.close();
        }
        await scenario('Прежний профиль UI переносится в текущую игру без изменения исходной копии',null,async page=>{
            assert.deepEqual(await page.evaluate(()=>({stones:game.stones,years:game.years,capacity:game.getDiscipleCapacity()})),
                {stones:1200,years:120,capacity:4});
            assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('cultivation_game_save_v2')).version),16);
            await page.evaluate(()=>{switchTab('sect');saveGame();});
            assert.equal(await page.evaluate(()=>getSaveableState().version),18);
            assert.equal(await page.locator('.disciple-candidate').count(),2);
            await page.evaluate(()=>{addLog('Контроль сохранённой угрозы','danger');saveGame();});
            assert.equal(await page.evaluate(()=>getSaveableState().logEntries.find(entry=>entry.text==='Контроль сохранённой угрозы').type),'danger');
            await page.reload();
            assert.equal(await page.locator('#event-log .log-danger').filter({hasText:'Контроль сохранённой угрозы'}).count(),1);
        });
        await scenario('Существующий текущий профиль имеет приоритет над прежним UI',{...player,stones:777,name:'Текущий герой'},async page=>{
            assert.equal(await page.evaluate(()=>game.stones),777);
            assert.equal(await page.evaluate(()=>game.name),'Текущий герой');
            await page.reload();assert.equal(await page.evaluate(()=>game.stones),777);
        });
        await scenario('Новая игра и reload не воскрешают прежний профиль',null,async page=>{
            await page.evaluate(()=>game.reset());await page.reload();
            assert.equal(await page.evaluate(()=>game.sect),null);
            assert.equal(await page.evaluate(()=>game.realmIndex),0);
            assert.equal(await page.evaluate(()=>localStorage.getItem('cultivation_game_migrated_to_v07')),'1');
            assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('cultivation_game_save_v2')).stones),1200);
        });
        console.log(passed+' current profile browser checks passed, 0 page errors');
    }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
