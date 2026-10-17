const PROJECT_ROOT = require('node:path').resolve(__dirname, '..');
// Единый актуальный index: секты и ученики 0.7 в новом интерфейсе.
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const makeSyntheticSectPlayer=require('./test-synthetic-player');

(async()=>{
    const browser=await chromium.launch({headless:true});
    try {
        const fixture=makeSyntheticSectPlayer();
        const page=await browser.newPage({viewport:{width:1280,height:900}});
        const errors=[];page.on('pageerror',error=>errors.push(error.message));
        await page.addInitScript(save=>{
            if(localStorage.getItem('cultivation_game_prototype_save')===null)
                localStorage.setItem('cultivation_game_prototype_save',JSON.stringify(save));
            window.addEventListener('load',()=>{if(typeof game!=='undefined')game.stop();});
        },fixture);
        await page.goto(pathToFileURL(path.join(PROJECT_ROOT,'index.html')).href+'?demo=disciples');
        await page.locator('.tab-btn[data-tab="sect"]').click();
        const view=()=>page.evaluate(()=>game.getDiscipleView());
        const candidateCard=id=>page.locator(`.disciple-candidate[data-candidate-id="${id}"]`);
        const discipleCard=id=>page.locator(`.disciple-card[data-disciple-id="${id}"]`);
        async function clickAcrossRefresh(locator){
            await locator.scrollIntoViewIfNeeded();await locator.evaluate(el=>window.pressedSectControl=el);
            const box=await locator.boundingBox();assert.ok(box);
            await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
            await page.evaluate(()=>{renderSects();updateUI();});
            assert.equal(await page.evaluate(()=>pressedSectControl.isConnected),true,'Тики не заменяют нажатую кнопку');
            await page.mouse.up();await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,0)));
        }
        async function hireAvailable(){
            const initial=await view(),candidate=initial.candidates.find(c=>c.canHire);assert.ok(candidate);
            const before=await page.evaluate(()=>game.stones);
            await clickAcrossRefresh(candidateCard(candidate.id).locator('button'));
            assert.equal((await view()).disciples.length,initial.disciples.length+1);
            assert.equal(await page.evaluate(()=>game.stones),before-candidate.cost);
            return candidate;
        }
        let passed=0;
        async function check(name,fn){await fn();passed++;console.log(`PASS ${name}`);}

        await check('Синтетический сейв v16 открывает 4 места и кандидатов в едином новом интерфейсе',async()=>{
            assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('ui-v2')),true);
            assert.equal(await page.evaluate(()=>game.getSectRankIndex()),2);
            assert.equal((await view()).capacity,4);assert.equal((await view()).unlocked,true);
            assert.match(await page.locator('.sect-rank-name').innerText(),/Ядровой/);
            assert.deepEqual(await page.locator('#disciples-section h4').allTextContents(),['Ваши ученики','Ищут наставника']);
            assert.equal(await page.locator('.disciple-candidate').count(),2);
            assert.equal(await page.locator('.sect-active-header .sect-scenery').count(),1);
            assert.equal(await page.locator('.sect-donations').count(),1);
            assert.equal(await page.evaluate(()=>SAVE_KEY),'cultivation_game_prototype_save');
        });
        await check('Пустое поручение не прячет учеников и безопасно показывает ожидание',async()=>{
            await page.evaluate(()=>{game.sectMissions=[null,{cooldown:0},{cooldown:10}];renderSects();});
            assert.equal(await page.locator('.sect-mission-card').count(),3);
            assert.equal(await page.locator('.sect-mission-card button:disabled').count(),3);
            assert.equal(await page.locator('.disciple-candidate').count(),2);
            assert.match(await page.locator('.sect-mission-section').innerText(),/подбирают новое поручение/);
        });
        await check('Найм и дробный XP сохраняют DOM ученика после полной перерисовки и reload',async()=>{
            await page.evaluate(()=>{game.stones=10000;renderSects();});await hireAvailable();
            const id=(await view()).disciples[0].id;
            const result=await page.evaluate(id=>{
                const section=document.getElementById('disciples-section'),card=section.querySelector(`[data-disciple-id="${id}"]`),fill=card.querySelector('.disciple-xp-fill');
                for(let i=0;i<12;i++)game.tick();renderSects();updateUI();
                const d=game.disciplesState.roster.find(d=>d.id===id);
                return {xp:d.xp,budget:d.learningXpThisYear,level:d.level,persistent:section===document.getElementById('disciples-section')
                    &&card===section.querySelector(`[data-disciple-id="${id}"]`)&&fill===card.querySelector('.disciple-xp-fill'),
                    width:parseFloat(fill.style.width),transition:getComputedStyle(fill).transitionDuration};
            },id);
            assert.equal(result.xp,2.88);assert.equal(result.budget,2.88);assert.equal(result.level,1);
            assert.equal(result.persistent,true);assert.ok(result.width>0);assert.equal(result.transition,'0.18s');
            const before=await view();await page.evaluate(()=>saveGame());await page.reload();
            await page.locator('.tab-btn[data-tab="sect"]').click();assert.deepEqual(await view(),before);
        });
        await check('Шесть настоящих учеников не переполняют 1280/1100px и телефон; пожертвования остаются справа на ПК',async()=>{
            await page.evaluate(()=>{
                game.reset();game.stop();game.selectSpiritualRoot('common');game.realmIndex=7;game.years=100;game.birthYear=100;
                game.strength=game.spirit=100;game.stones=10000;game.prestige.karmaUpgrades.mentorEye=1;Math.random=()=>0;
                game.joinSect('jade_purity');game.sect.contribution=getSectRanks(game.sect.id)[3].contribution;game._syncSectRank(false);
                game.sectMissions=[{cooldown:10000},{cooldown:10000},{cooldown:10000}];switchTab('sect');updateUI();
            });
            let iterations=0;
            while((await view()).disciples.length<6){
                assert.ok(++iterations<=12);
                if(!(await view()).candidates.some(c=>c.canHire))await page.evaluate(()=>{
                    game.years=Math.max(game.years+1,game.getDiscipleView().nextRefreshYear);game.tickDisciples();renderSects();
                });
                await hireAvailable();
            }
            for(const width of [1280,1100,390]){
                await page.setViewportSize({width,height:900});await page.evaluate(()=>{renderSects();updateUI();});
                const sizes=await page.evaluate(()=>({viewport:innerWidth,page:document.documentElement.scrollWidth,
                    cards:[...document.querySelectorAll('.disciple-card')].map(el=>({width:el.clientWidth,content:el.scrollWidth})),
                    main:document.querySelector('.v2-sect-main').getBoundingClientRect().x,
                    donation:document.querySelector('.sect-donations').getBoundingClientRect().x}));
                assert.equal(sizes.cards.length,6);assert.ok(sizes.page<=sizes.viewport);
                for(const card of sizes.cards)assert.ok(card.content<=card.width);
                if(width===1280)assert.ok(sizes.donation>sizes.main);
                assert.equal(await page.locator('#disciples-section select,#disciples-section [data-mode],#disciples-section [draggable="true"]').count(),0);
            }
            // Дополнительная высота только для снимка: размеры игрового экрана проверены выше.
            await page.setViewportSize({width:1280,height:1200});
            await page.locator('#disciples-section').scrollIntoViewIfNeeded();
            await page.locator('#disciples-section').screenshot({path:path.join(PROJECT_ROOT,'docs','screenshots','current-sect-six-disciples.png')});
            await page.setViewportSize({width:1280,height:900});
        });
        await check('Письмо и подтверждение ухода используют современный состав и переживают перерисовку',async()=>{
            const id=(await view()).disciples[0].id;
            await page.evaluate(id=>{game.daoEssence=25;game.triggerDiscipleLetterEvent(id);renderSects();},id);
            assert.equal(await discipleCard(id).locator('.disciple-training-offer').count(),1);
            await clickAcrossRefresh(discipleCard(id).locator('.disciple-training-offer .btn-primary'));
            assert.equal(await page.evaluate(()=>game.daoEssence),5);assert.equal(await page.locator('.disciple-training-offer').count(),0);
            await clickAcrossRefresh(page.locator('#btn-leave-sect'));
            assert.match(await page.locator('#leave-sect-confirm').innerText(),/теряете учеников/i);
            await page.evaluate(()=>{renderSects();updateUI();});assert.equal(await page.locator('#leave-sect-confirm').isVisible(),true);
            await clickAcrossRefresh(page.locator('#leave-sect-confirm button[onclick="confirmLeaveSect()"]'));
            assert.equal(await page.evaluate(()=>game.sect),null);assert.equal(await page.locator('#disciples-section').count(),0);
        });
        await check('Кнопка поручения сдаёт только недостающие пилюли и сразу выдаёт награду',async()=>{
            await page.evaluate(()=>{
                game.reset();game.stop();game.selectSpiritualRoot('common');
                game.realmIndex=3;game.subLevel=1;game.years=100;
                game.sect={id:'moon_lake',rank:0,contribution:0};
                game.pills=6;game.stones=0;game.flags.pillsDonated=0;
                Math.random=()=>.5;
                const excludes=SECTS.find(s=>s.id==='moon_lake').missions.filter(id=>id!=='donate_pills_sect');
                game.sectMissions=[game._generateOneMission(excludes)];
                switchTab('sect');updateUI();
                game.donatePills(2);game.pills=3;updateTickUI();
            });
            const action=page.locator('.sect-mission-card[data-index="0"] .sect-mission-action button');
            assert.equal(await action.getAttribute('onclick'),'game.donatePillsForMission(0)');
            assert.equal(await action.innerText(),'Пожертвовать 4');
            assert.equal(await action.isEnabled(),false);
            assert.match(await action.getAttribute('title'),/Требуется 4 пилюли \(есть 3\)/);
            assert.equal(await page.evaluate(()=>game.pills),3);
            await page.evaluate(()=>{game.pills=4;updateTickUI();});
            assert.equal(await action.isEnabled(),true);
            await action.click();
            assert.deepEqual(await page.evaluate(()=>({
                pills:game.pills,donated:game.flags.pillsDonated,contribution:game.sect.contribution,
                stones:game.stones,completed:game.flags.sectMissionsCompleted,cooldown:game.sectMissions[0].cooldown
            })),{pills:0,donated:6,contribution:73,stones:19,completed:1,cooldown:20});
            await page.waitForFunction(()=>document.querySelector('.sect-mission-card[data-index="0"] .sect-mission-action button')?.disabled);
            assert.equal(await page.locator('.sect-mission-card[data-index="0"] .sect-mission-action button').isEnabled(),false);
        });
        assert.deepEqual(errors,[]);console.log(`${passed} current sect UI scenarios passed,0 page errors`);
    } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
