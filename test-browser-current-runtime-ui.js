// Текущий index.html: новый интерфейс использует сохранение и runtime 0.7.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright');

(async()=>{
    const root=path.resolve(__dirname);
    const server=http.createServer((req,res)=>{
        let file;
        try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));}
        catch{res.writeHead(400);res.end();return;}
        if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
        fs.readFile(file,(error,data)=>{
            if(error){res.writeHead(404);res.end();return;}
            const types={'.html':'text/html','.js':'text/javascript','.css':'text/css'};
            res.writeHead(200,{'Content-Type':(types[path.extname(file)]||'application/octet-stream')+'; charset=utf-8'});res.end(data);
        });
    });
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    let browser;
    try{
        browser=await chromium.launch({headless:true});
        const errors=[];
        const page=await browser.newPage({viewport:{width:1500,height:900}});
        page.on('pageerror',error=>errors.push(error.message));
        const time=new Date('2026-01-01T00:00:00Z');
        await page.clock.install({time});await page.clock.pauseAt(time);
        const url='http://127.0.0.1:'+server.address().port+'/index.html';
        await page.goto(url);let passed=0;
        async function check(name,fn){await fn();passed++;console.log('PASS '+name);}
        async function fresh(){await page.evaluate(()=>{
            game.reset();document.querySelectorAll('.modal-overlay.active').forEach(el=>el.classList.remove('active'));
            game.selectSpiritualRoot('common');game.learnTechnique('basic_breathing');
            game.realmIndex=3;game.subLevel=1;game.years=100;game.birthYear=0;
            game.strength=40;game.spirit=40;game.luck=40;game.stones=1000;Math.random=()=>0;
            game.joinSect('jade_purity');updateUI();
        });await page.clock.runFor(1);}
        await check('Сейв игрока: пауза, таймер смерти и reload используют runtime 0.7',async()=>{
            const fixture=JSON.parse(fs.readFileSync(path.join(root,'test-fixtures/player-report-v14.json'),'utf8'));
            await page.evaluate(save=>{importSave(JSON.stringify(save));game._showDeathTimer=true;updateUI();},fixture);
            await page.clock.runFor(1200);await page.locator('#btn-pause').click();
            const before=await page.evaluate(()=>({years:game.years,dao:game.daoProgress,xp:JSON.stringify(game.activityXP),
                death:document.getElementById('death-timer').textContent}));
            await page.clock.runFor(20000);await page.evaluate(()=>updateUI());
            assert.deepEqual(await page.evaluate(()=>({years:game.years,dao:game.daoProgress,xp:JSON.stringify(game.activityXP),
                death:document.getElementById('death-timer').textContent})),before);
            await page.evaluate(()=>saveGame());await page.reload();
            assert.equal(await page.evaluate(()=>game._paused),true);
            assert.match(await page.locator('#btn-pause').textContent(),/Продолжить/);
            assert.equal(await page.evaluate(()=>game.yearTimer),null);
        });
        await check('Количество пилюль сохраняется, а закрытая жизнь отключает действия',async()=>{
            await fresh();await page.evaluate(()=>{game.pills=30;game.qi=0;updateUI();});
            await page.locator('#v2-pill-amount').selectOption('10');
            await page.clock.runFor(1);
            await page.evaluate(()=>updateTickUI());assert.equal(await page.locator('#v2-pill-amount').inputValue(),'10');
            await page.locator('.pill-row').first().getByRole('button',{name:'Принять',exact:true}).click();
            await page.clock.runFor(1);
            assert.equal(await page.evaluate(()=>game.pills),20);
            await page.evaluate(()=>{game.beginRebirth(false);updateUI();});
            assert.equal(await page.locator('.pill-row button:enabled').count(),0);
            assert.equal(await page.locator('#btn-pause').isDisabled(),true);
            assert.equal(await page.locator('#btn-breakthrough').isDisabled(),true);
            assert.equal(await page.locator('#v2-breakthrough-risk').isVisible(),false);
        });
        await check('Ученики обновляют XP на тике, расписание доступно в текущем интерфейсе',async()=>{
            await fresh();await page.evaluate(()=>{
                game.sect.contribution=getSectRanks(game.sect.id)[1].contribution;
                game._syncSectRank();game.hireDisciple(game.getDiscipleCandidates()[0].id);
                game.prestige.karmaUpgrades.practiceSchedule=1;switchTab('sect');updateUI();
            });
            const before=await page.locator('.disciple-level-xp').first().textContent();
            await page.evaluate(()=>{for(let i=0;i<5;i++)game.tick();});
            assert.notEqual(await page.locator('.disciple-level-xp').first().textContent(),before);
            await page.evaluate(()=>{game.setPracticePlan('strength',game.strength+2);game.qi=game.qiNeeded();game.tick();});
            assert.equal(await page.locator('.activity-row.active').getAttribute('data-activity'),'dao',
                'Автосмена на тике обновляет видимую подсветку, а не только aria-pressed');
            await page.evaluate(()=>switchTab('formations'));
            assert.equal(await page.locator('#tab-cultivation').evaluate(el=>el.classList.contains('active')),true);
            assert.equal(await page.locator('#practice-plan-panel').isVisible(),true);
        });

        const logs=await browser.newPage({viewport:{width:1500,height:900}});
        logs.on('pageerror',error=>errors.push(error.message));await logs.goto(url);
        await logs.evaluate(()=>{game.stop();document.querySelectorAll('.modal-overlay.active').forEach(el=>el.classList.remove('active'));});
        async function settled(){await logs.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
        async function gap(){return logs.locator('#event-log').evaluate(el=>el.scrollHeight-el.clientHeight-el.scrollTop);}
        await check('Хроники следуют последней записи при resize без нового события',async()=>{
            await logs.evaluate(()=>{for(let i=0;i<80;i++)addLog(('Длинная запись хроники. ').repeat(12)+i,i%2?'danger':'system');});
            await settled();assert.ok(await gap()<=2);
            await logs.setViewportSize({width:800,height:900});await settled();assert.ok(await gap()<=2);
        });
        await check('Чтение старой истории не прерывается; кнопка свежих событий возвращает вниз',async()=>{
            await logs.locator('#event-log').evaluate(el=>{el.scrollTop=0;});await settled();
            await logs.evaluate(()=>addLog('Новое важное событие при чтении истории','danger'));await settled();
            assert.equal(await logs.locator('#event-log').evaluate(el=>el.scrollTop),0);
            assert.equal(await logs.locator('#v2-log-latest').isVisible(),true);
            await logs.setViewportSize({width:1500,height:900});await settled();
            assert.equal(await logs.locator('#event-log').evaluate(el=>el.scrollTop),0);
            await logs.locator('#v2-log-latest').click();await settled();
            assert.ok(await gap()<=2);assert.equal(await logs.locator('#v2-log-latest').isVisible(),false);
        });
        await check('Фильтр учитывает только видимые новые записи и сохраняет автопрокрутку',async()=>{
            await logs.locator('[data-log-filter="important"]').click();await settled();
            await logs.evaluate(()=>addLog('Обычная скрытая запись','system'));await settled();
            assert.equal(await logs.locator('#event-log').evaluate(el=>el.lastElementChild.hidden),true);
            assert.ok(await gap()<=2);
            await logs.locator('#event-log').evaluate(el=>{el.scrollTop=0;});await settled();
            await logs.evaluate(()=>addLog('Ещё одна скрытая запись','system'));await settled();
            assert.equal(await logs.locator('#v2-log-latest').isVisible(),false);
            await logs.evaluate(()=>addLog('Важная новая запись','danger'));await settled();
            assert.equal(await logs.locator('#v2-log-latest').isVisible(),true);
            await logs.locator('[data-log-filter="all"]').click();await settled();assert.ok(await gap()<=2);
        });
        await check('Переключение времени и восстановление хроник показывают последнюю запись',async()=>{
            await logs.evaluate(()=>{game.years=150000;game.birthYear=149984;toggleLogTimeMode();});
            await settled();assert.ok(await gap()<=2);
            await logs.evaluate(()=>_restoreLogEntries(Array.from({length:50},(_,i)=>({text:('Сохранённая хроника. ').repeat(12)+i,
                type:'danger',worldYear:150000,charAge:16}))));await settled();assert.ok(await gap()<=2);
        });
        assert.deepEqual(errors,[],'Нет ошибок страницы');console.log(`PASS ${passed} current runtime UI scenarios`);
    }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
