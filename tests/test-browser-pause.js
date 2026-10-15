const PROJECT_ROOT = require('node:path').resolve(__dirname, '..');
// Отдельный Chromium: пауза игрового времени, счётчиков и визуального таймера.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright');
const makeSyntheticSectPlayer=require('./test-synthetic-player');

(async()=>{
    const root=path.resolve(PROJECT_ROOT);
    const server=http.createServer((req,res)=>{
        const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
        if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
        fs.readFile(file,(error,data)=>{
            if(error){res.writeHead(404);res.end();return;}
            const types={'.html':'text/html','.js':'text/javascript','.css':'text/css'};
            res.writeHead(200,{'Content-Type':(types[path.extname(file)]||'application/octet-stream')+'; charset=utf-8'});res.end(data);
        });
    });
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    let browser;
    try {
        browser=await chromium.launch({headless:true});
        const page=await browser.newPage({viewport:{width:1500,height:1000}});
        const errors=[];page.on('pageerror',error=>errors.push(error.message));
        const initialTime=new Date('2026-01-01T00:00:00Z');
        await page.clock.install({time:initialTime});
        await page.clock.pauseAt(initialTime);
        await page.goto('http://127.0.0.1:'+server.address().port+'/index.html');
        let passed=0,failed=0;
        async function check(name,fn){
            try {await fn();passed++;console.log('PASS '+name);}
            catch(error){failed++;console.error('FAIL '+name+': '+error.message);}
        }
        async function progress(){return page.evaluate(()=>JSON.stringify({years:game.years,qi:game.qi,
            daoProgress:game.daoProgress,daoLevel:game.daoLevel,strength:game.strength,spirit:game.spirit,luck:game.luck,
            stones:game.stones,pills:game.pills,activityXP:game.activityXP,techXP:game.techXP,flags:game.flags,
            sectMissions:game.sectMissions,sectMissionTimer:game.sectMissionTimer,worldEvent:game.worldEvent,
            expedition:game.expedition,activeAdventures:game.activeAdventures,adventureDiscovery:game.adventureDiscovery,
            disciplesState:game.disciplesState}));}
        async function setup(){await page.evaluate(()=>{
            game.reset();game._paused=false;
            document.querySelectorAll('.modal-overlay.active').forEach(el=>el.classList.remove('active'));
            game.selectSpiritualRoot('common');game.learnTechnique('basic_breathing');
            game.realmIndex=3;game.subLevel=1;game.years=100;game.birthYear=0;
            game.strength=40;game.spirit=40;game.luck=40;game.stones=1000;
            game.joinSect('jade_purity');game.sectMissions=[{cooldown:20},{cooldown:15},{cooldown:12}];
            Math.random=()=>.99;game.startExpedition('spirit_forest');
            game.addAdventureRumor('root_eater');game.acceptAdventure('root_eater');
            game.chooseAdventureOption(0,2);game._showDeathTimer=true;game.start();updateUI();
        });}

        await check('Обычная пауза замораживает годы, задания, поход, приключение и обучение',async()=>{
            await setup();await page.clock.runFor(1200);
            await page.locator('#btn-pause').click();
            const before=await progress();
            await page.clock.runFor(20000);
            await page.evaluate(()=>{document.dispatchEvent(new Event('visibilitychange'));game.refreshTimers();updateUI();});
            assert.equal(await progress(),before);
            assert.deepEqual(await page.evaluate(()=>({paused:game._paused,tick:game.tickTimer,year:game.yearTimer,event:game.eventTimer})),
                {paused:true,tick:null,year:null,event:null});
        });
        await check('Таймер смерти не расходует реальное время при обновлении UI на паузе',async()=>{
            await setup();await page.clock.runFor(1200);
            await page.locator('#btn-pause').click();await page.evaluate(()=>updateUI());
            const before=await page.locator('#death-timer').textContent();
            await page.clock.runFor(20000);await page.evaluate(()=>{switchTab('sect');updateUI();});
            const after=await page.locator('#death-timer').textContent();
            console.log('Death countdown',JSON.stringify({before,after}));
            assert.equal(after,before);
        });
        await check('Импорт на паузе сохраняет паузу и согласованное состояние кнопки',async()=>{
            await setup();await page.locator('#btn-pause').click();
            const save=await page.evaluate(()=>JSON.stringify(getSaveableState()));
            await page.evaluate(json=>importSave(json),save);
            const state=await page.evaluate(()=>({paused:game._paused,button:document.getElementById('btn-pause').textContent,
                year:game.years,hasTimer:!!game.yearTimer}));
            console.log('Import while paused',JSON.stringify(state));
            const before=await progress();await page.clock.runFor(6000);
            assert.equal(await progress(),before,'Импорт не запускает время за кнопкой «Продолжить»');
            assert.equal(state.paused,true);assert.equal(state.hasTimer,false);
            assert.match(state.button,/Продолжить/);
        });
        await check('После возобновления оставшаяся часть года не начинается заново',async()=>{
            await setup();await page.clock.runFor(4000);await page.locator('#btn-pause').click();
            const year=await page.evaluate(()=>game.years);
            await page.clock.runFor(20000);await page.locator('#btn-pause').click();
            await page.clock.runFor(1200);
            assert.equal(await page.evaluate(()=>game.years),year+1);
        });
        await check('Сохранённая пауза переживает reload и сохраняет оставшуюся часть года',async()=>{
            await setup();await page.clock.runFor(4000);await page.locator('#btn-pause').click();
            await page.evaluate(()=>saveGame());await page.reload();
            assert.equal(await page.evaluate(()=>game._paused),true);
            const before=await progress();const year=await page.evaluate(()=>game.years);
            await page.clock.runFor(20000);assert.equal(await progress(),before);
            await page.locator('#btn-pause').click();await page.clock.runFor(1200);
            assert.equal(await page.evaluate(()=>game.years),year+1);
        });
        await check('Быстрые переключения не оставляют лишних callback и сохраняют фазу всех таймеров',async()=>{
            await setup();await page.evaluate(()=>{
                window.pauseCounts={tick:0,year:0,event:0};
                for(const [key,name] of [['tick','tick'],['year','passYear'],['event','triggerEvent']]){
                    const original=game[name];game[name]=function(){pauseCounts[key]++;return original.apply(this,arguments);};
                }
            });
            await page.clock.runFor(14000);await page.locator('#btn-pause').click();
            const counts=await page.evaluate(()=>({...pauseCounts}));
            for(let i=0;i<10;i++){
                await page.locator('#btn-pause').click();await page.clock.runFor(50);
                await page.locator('#btn-pause').click();await page.clock.runFor(1000);
            }
            await page.locator('#btn-pause').click();await page.clock.runFor(700);
            const delta=await page.evaluate(before=>({tick:pauseCounts.tick-before.tick,year:pauseCounts.year-before.year,event:pauseCounts.event-before.event}),counts);
            assert.deepEqual(delta,{tick:6,year:1,event:1});
            await page.locator('#btn-pause').click();const stopped=await progress();
            await page.clock.runFor(20000);assert.equal(await progress(),stopped);
        });
        await check('Изменение скорости сохраняет прогресс года и не дублирует интервалы',async()=>{
            await setup();await page.clock.runFor(4000);const year=await page.evaluate(()=>game.years);
            await page.evaluate(()=>game.setDebugSpeed(2));await page.clock.runFor(600);
            assert.equal(await page.evaluate(()=>game.years),year+1);
            await page.clock.runFor(2600);assert.equal(await page.evaluate(()=>game.years),year+2);
            await page.evaluate(()=>game.setDebugSpeed(1));
        });
        if(process.argv.includes('--player')) {
            const save=JSON.stringify(makeSyntheticSectPlayer());
            await check('Синтетический v16 сейв: пауза останавливает весь игровой прогресс',async()=>{
                await page.evaluate(json=>importSave(json),save);
                await page.clock.runFor(1200);
                if(!await page.evaluate(()=>game._paused))await page.locator('#btn-pause').click();
                const before=await progress();await page.clock.runFor(20000);
                await page.evaluate(()=>{document.dispatchEvent(new Event('visibilitychange'));updateUI();});
                assert.equal(await progress(),before);
            });
        }
        assert.deepEqual(errors,[],'Нет ошибок страницы');
        console.log(`${passed} PASS, ${failed} FAIL pause scenarios`);
        if(failed)process.exitCode=1;
    } finally {
        if(browser)await browser.close();
        await new Promise(resolve=>server.close(resolve));
    }
})().catch(error=>{console.error(error);process.exitCode=1;});
