const PROJECT_ROOT = require('node:path').resolve(__dirname, '..');
// Автоматические ученики: реальные клики, сохранение и время в отдельном Chromium.
const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');

(async () => {
    const browser = await chromium.launch({headless:true});
    try {
        const page = await browser.newPage({viewport:{width:1500,height:1100}});
        const errors = []; page.on('pageerror', error => errors.push(error.message));
        await page.addInitScript(() => window.addEventListener('load', () => { if (typeof game !== 'undefined') game.stop(); }));
        await page.goto(pathToFileURL(path.join(PROJECT_ROOT,'index.html')).href);
        const view = () => page.evaluate(() => game.getDiscipleView());
        const candidateCard = id => page.locator(`.disciple-candidate[data-candidate-id="${id}"]`);
        const discipleCard = id => page.locator(`.disciple-card[data-disciple-id="${id}"]`);
        const xpLedger = id => page.evaluate(id => {
            const d = game.disciplesState.roster.find(d => d.id === id); let xp = d.xp;
            for (let level=1;level<d.level;level++) xp += game.getDiscipleXpNeeded({...d,level});
            return xp;
        }, id);
        async function setup(rank=0, mentorEye=0) {
            await page.evaluate(({rank,mentorEye}) => {
                game.stop(); document.querySelectorAll('.modal-overlay.active').forEach(el => el.classList.remove('active'));
                game.reset(); game.stop(); game.selectSpiritualRoot('common'); game.learnTechnique('basic_breathing');
                game.realmIndex=7;game.subLevel=1;game.years=100;game.birthYear=100;game.strength=game.spirit=100;
                game.stones=10000;game.flags.wonCombat=true;Math.random=()=>0;
                game.prestige.karmaUpgrades.mentorEye=mentorEye;
                game.joinSect('jade_purity');game.sect.contribution=getSectRanks(game.sect.id)[rank].contribution;game._syncSectRank(false);
                game._calcStoneIncome=()=>0;game.checkWorldEvent=game.tickAdventureRumors=game.checkMilestones=()=>{};
                game.sectMissions=[{cooldown:10000},{cooldown:10000},{cooldown:10000}];
                switchTab('sect');updateUI();
            }, {rank,mentorEye});
        }
        async function clickAcrossRefresh(locator) {
            await locator.scrollIntoViewIfNeeded();await locator.evaluate(el => window.disciplePressed=el);
            const box=await locator.boundingBox();assert.ok(box);
            await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
            await page.evaluate(() => {renderSects();updateUI();});
            assert.equal(await page.evaluate(() => disciplePressed.isConnected),true,'Перерисовка сохраняет нажатый контрол');
            await page.mouse.up();await page.evaluate(() => new Promise(resolve => setTimeout(resolve,0)));
        }
        async function hireFirst() {
            const before=await view(),candidate=before.candidates.find(c=>c.canHire);assert.ok(candidate);
            await clickAcrossRefresh(candidateCard(candidate.id).locator('button'));
            assert.equal((await view()).disciples.length,before.disciples.length+1,'Настоящий клик принимает ровно одного ученика');
            return candidate;
        }
        async function reloadSect() {await page.reload();await page.evaluate(() => {game.stop();switchTab('sect');});}
        async function assertNoAssignments() {
            assert.equal(await page.locator('#disciples-section select,#disciples-section [data-mode],#disciples-section [draggable="true"]').count(),0);
            assert.doesNotMatch(await page.locator('#disciples-section').innerText(),/Назначить|Отдых|Хозяйство|Слот|первое задание.*вручную/i);
        }
        let passed=0;
        async function check(name,fn) {await fn();passed++;console.log(`PASS ${name}`);}
        let firstId;

        await check('Старейшина после загрузки видит учеников даже с пустым слотом задания',async () => {
            await setup(3);
            await page.evaluate(() => {
                game.sectMissions=[{cooldown:0},null,{cooldown:20}];
                const data=getSaveableState(); delete data.disciplesState;
                localStorage.setItem(SAVE_KEY,JSON.stringify(data));
            });
            await reloadSect();
            assert.equal(await page.evaluate(() => game.getCurrentSectRank().name),'Старейшина');
            assert.equal((await view()).capacity,6);
            assert.match(await page.locator('.disciples-capacity').innerText(),/0\/6/);
            assert.equal(await page.locator('.disciple-candidate').count(),2);
            assert.equal(await page.locator('.sect-mission-cooldown').count(),3);
            assert.equal(await page.evaluate(() => game.completeSectMission(0)),false);
            await page.evaluate(() => {game.tickSectMission();renderSects();});
            assert.ok(await page.evaluate(() => game.sectMissions.slice(0,2).every(m=>m.reward)));
            await page.evaluate(() => {document.getElementById('disciples-section').innerHTML='';renderDisciples();});
            assert.match(await page.locator('.disciples-capacity').innerText(),/0\/6/);
        });

        await check('Внешний ранг даёт подсказку; повышение открывает два, четыре и шесть мест',async () => {
            await setup();assert.equal((await view()).capacity,0);
            assert.match(await page.locator('#disciples-section').innerText(),/Внутреннего ученика.*двух/i);
            assert.equal(await page.locator('.disciple-candidate').count(),0);
            for (const [rank,capacity] of [[1,2],[2,4],[3,6],[4,6]]) {
                await page.evaluate(rank => {game.sect.contribution=getSectRanks(game.sect.id)[rank].contribution;game._syncSectRank(false);renderSects();},rank);
                assert.equal((await view()).capacity,capacity);
                assert.match(await page.locator('.disciples-capacity').innerText(),new RegExp(`0/${capacity}`));
            }
            await setup(1);const initial=await view();assert.equal(initial.candidates.length,2);
            assert.deepEqual(await page.locator('#disciples-section h4').allTextContents(),['Ваши ученики','Ищут наставника']);
            for (const candidate of initial.candidates) {
                const text=await candidateCard(candidate.id).innerText();
                assert.ok(text.includes(candidate.name));assert.ok(text.includes(String(candidate.cost)));
                assert.ok(text.includes(String(candidate.age)));assert.ok(text.includes(String(candidate.lifespan)));
                assert.ok(text.includes(String(candidate.expiresIn)));assert.equal(candidate.canHire,true);
            }
            await assertNoAssignments();
        });
        await check('Один клик принимает ученика без нового предложения; возраст, цена и состав переживают reload',async () => {
            const initial=await view(),candidate=initial.candidates[0],balance=await page.evaluate(() => game.stones);
            await hireFirst();firstId=(await view()).disciples[0].id;
            const after=await view();assert.equal(after.disciples.length,1);assert.equal(after.disciples[0].name,candidate.name);
            assert.equal(after.disciples[0].age,candidate.age);assert.equal(after.disciples[0].lifespan,candidate.lifespan);
            assert.equal(after.candidates.length,initial.candidates.length-1);assert.equal(after.offerVacancies,1);
            assert.equal(await page.evaluate(() => game.stones),balance-candidate.cost);
            assert.match(await page.locator('.disciple-delivery').innerText(),/Новые кандидаты через/);
            assert.equal(await page.evaluate(id => game.hireDisciple(id),candidate.id),false);
            await page.evaluate(() => {renderDisciples();renderSects();saveGame();});await reloadSect();
            assert.deepEqual(await view(),after);assert.equal(await page.evaluate(() => SAVE_KEY),'cultivation_game_prototype_save');
            assert.equal(await page.evaluate(() => localStorage.getItem('cultivation_game_save')),null);
            await assertNoAssignments();
        });
        await check('Ученик растёт и получает доход сразу; первое готовое задание автоматическое, расход ресурсов остаётся ручным',async () => {
            const before=await xpLedger(firstId),age=(await view()).disciples[0].age;
            await page.evaluate(() => {
                Math.random=()=>0;game._calcStoneIncome=()=>0;game.checkWorldEvent=game.tickAdventureRumors=game.checkMilestones=()=>{};
                game.sectMissions=[{templateId:'prove_spirit',text:'Испытание духа',description:'Дух 10+',check:{spirit:10},reward:{contribution:5,stones:7},cooldown:0},
                    {templateId:'prove_strength',text:'Платное испытание',description:'Дух 10+',check:{spirit:10},cost:{stones:10},reward:{stones:999},cooldown:0},
                    {cooldown:10000}];
                game.passYear();updateUI();
            });
            assert.equal(await xpLedger(firstId),before+6);assert.equal((await view()).disciples[0].age,age+1);
            assert.equal(await page.evaluate(() => game.flags.sectMissionsCompleted),1);
            assert.equal(await page.evaluate(() => game.sectMissions[0].cooldown),await page.evaluate(() => game.getSectMissionCooldown()));
            assert.equal(await page.evaluate(() => game.sectMissions[1].cooldown),0);
            const paid=await page.evaluate(() => ({stones:game.stones,xp:game.disciplesState.roster[0].xp,completed:game.flags.sectMissionsCompleted}));
            await page.evaluate(() => {game.tickDisciples();game.completeSectMission(0);});
            assert.deepEqual(await page.evaluate(() => ({stones:game.stones,xp:game.disciplesState.roster[0].xp,completed:game.flags.sectMissionsCompleted})),paid);
            assert.ok((await view()).incomeRate>0);assert.match(await page.locator('.disciples-budget').innerText(),/кам.*\/год/);
            await page.evaluate(() => {game.sectMissions=[{cooldown:10000},{cooldown:10000},{cooldown:10000}];
                game.disciplesState.householdCarry=0;game._calcStoneIncome=()=>0;game.reviewIncomeStart=game.stones;
                game.reviewIncomeExpected=0;
                for(let i=0;i<25;i++){game.passYear();game.reviewIncomeExpected+=game.getDiscipleView().incomeRate;}updateUI();});
            assert.ok(await page.evaluate(() => game.stones>game.reviewIncomeStart),'Дробный доход действительно выплачивается');
            assert.equal(await page.evaluate(() => game.stones-game.reviewIncomeStart),await page.evaluate(() => Math.floor(game.reviewIncomeExpected+1e-9)));
            const stable=await view();await page.evaluate(() => saveGame());await reloadSect();assert.deepEqual(await view(),stable);
        });
        await check('Кандидаты обновляются по сроку, Око даёт третьего, шесть учеников помещаются на1100px',async () => {
            await setup(3,1);const original=await view();assert.equal(original.candidates.length,3);
            await page.evaluate(() => {renderSects();renderDisciples();saveGame();});await reloadSect();
            assert.deepEqual((await view()).candidates,original.candidates);
            const oldIds=original.candidates.map(c=>c.id),deadline=original.nextRefreshYear;
            await page.evaluate(year => {game.years=year;game.tickDisciples();renderSects();},deadline);
            const renewed=await view();assert.equal(renewed.candidates.length,3);
            assert.ok(renewed.candidates.some(c=>!oldIds.includes(c.id)));
            let iterations=0;
            while ((await view()).disciples.length<6) {
                assert.ok(++iterations<=12,'Шесть учеников набираются за конечное число поступлений');
                if (!(await view()).candidates.some(c=>c.canHire)) {
                    await page.evaluate(() => {game.years=Math.max(game.years+1,game.getDiscipleView().nextRefreshYear);game.tickDisciples();renderSects();});
                }
                await hireFirst();
            }
            await page.setViewportSize({width:1100,height:1000});
            await page.evaluate(() => {renderSects();updateUI();});await assertNoAssignments();
            const sizes=await page.evaluate(() => ({viewport:innerWidth,page:document.documentElement.scrollWidth,
                cards:[...document.querySelectorAll('.disciple-card')].map(card=>({width:card.clientWidth,content:card.scrollWidth}))}));
            assert.equal(sizes.cards.length,6);assert.ok(sizes.page<=sizes.viewport);
            for(const card of sizes.cards)assert.ok(card.content<=card.width);
            assert.equal(await page.locator('.disciple-roster .disciple-dismiss').count(),6);
            await page.screenshot({path:path.join(PROJECT_ROOT,'docs','screenshots','prototype-disciples-six-1100.png'),fullPage:true});
            await page.locator('#disciples-section').screenshot({path:path.join(PROJECT_ROOT,'docs','screenshots','prototype-disciples-six-cards.png')});
        });
        await check('Неоплаченное письмо сохраняется; один клик тратит эссенцию только на XP ученика',async () => {
            await setup(1);await hireFirst();const target=(await view()).disciples[0],before=await xpLedger(target.id);
            await page.evaluate(id => {game.daoEssence=0;game.triggerDiscipleLetterEvent(id);renderSects();},target.id);
            const offer=await page.evaluate(() => game.getDiscipleTrainingOffer());assert.ok(offer);
            assert.equal(await discipleCard(target.id).locator('.disciple-training-offer button.btn-primary').isDisabled(),true);
            await reloadSect();assert.deepEqual(await page.evaluate(() => game.getDiscipleTrainingOffer()),offer);
            assert.equal(await xpLedger(target.id),before);
            const hero=await page.evaluate(() => JSON.stringify({qi:game.qi,spirit:game.spirit,strength:game.strength,techXP:game.techXP}));
            await page.evaluate(() => {game.daoEssence=25;renderSects();});
            await clickAcrossRefresh(discipleCard(target.id).locator('.disciple-training-offer button.btn-primary'));
            assert.equal(await page.evaluate(() => game.daoEssence),5);assert.equal(await xpLedger(target.id),before+30);
            assert.equal(await page.evaluate(id => game.acceptDiscipleTrainingOffer(id),offer.id),false);
            assert.equal(await page.evaluate(() => JSON.stringify({qi:game.qi,spirit:game.spirit,strength:game.strength,techXP:game.techXP})),hero);
            await reloadSect();assert.equal(await xpLedger(target.id),before+30);assert.equal(await page.locator('.disciple-training-offer').count(),0);
        });
        await check('Смерть и подтверждённый отпуск убирают ученика и устаревшее письмо без оплаты',async () => {
            async function newLetter() {
                await setup(1);await hireFirst();const id=(await view()).disciples[0].id;
                await page.evaluate(id => {game.daoEssence=25;game.triggerDiscipleLetterEvent(id);renderSects();},id);
                return page.evaluate(() => game.getDiscipleTrainingOffer());
            }
            let offer=await newLetter();
            await page.evaluate(id => {const d=game.disciplesState.roster.find(d=>d.id===id);game.years=d.birthYear+d.maxAge;
                game.tickDisciples();renderSects();},offer.discipleId);
            assert.equal(await discipleCard(offer.discipleId).count(),0);assert.equal(await page.locator('.disciple-training-offer').count(),0);
            assert.equal(await page.evaluate(id => game.acceptDiscipleTrainingOffer(id),offer.id),false);
            assert.equal(await page.evaluate(() => game.daoEssence),25);
            await page.evaluate(() => saveGame());await reloadSect();assert.equal(await discipleCard(offer.discipleId).count(),0);
            offer=await newLetter();const before=await page.evaluate(() => game.stones),remaining=(await view()).candidates;
            await clickAcrossRefresh(discipleCard(offer.discipleId).locator('.disciple-dismiss'));
            assert.equal((await view()).disciples.length,1);assert.match(await page.locator('.disciple-dismiss-confirm').innerText(),/не возвращаются/);
            await clickAcrossRefresh(discipleCard(offer.discipleId).locator('.disciple-dismiss-confirm .btn-danger-btn'));
            assert.equal((await view()).disciples.length,0);assert.equal(await page.evaluate(() => game.stones),before);
            assert.deepEqual((await view()).candidates,remaining);assert.equal(await page.evaluate(id => game.acceptDiscipleTrainingOffer(id),offer.id),false);
            assert.equal(await page.evaluate(() => game.daoEssence),25);
            offer=await newLetter();
            await clickAcrossRefresh(page.locator('#btn-leave-sect'));assert.match(await page.locator('#leave-sect-confirm').innerText(),/ученик/i);
            await clickAcrossRefresh(page.locator('#leave-sect-confirm button[onclick="confirmLeaveSect()"]'));
            assert.equal(await page.evaluate(() => game.sect),null);assert.equal(await page.evaluate(id => game.acceptDiscipleTrainingOffer(id),offer.id),false);
            assert.equal(await page.evaluate(() => game.daoEssence),25);
        });
        await check('Реальные дробные XP двигают прежний DOM и плавный бар; rollover и reload сохраняют годовой бюджет',async () => {
            await setup(1);await hireFirst();const id=(await view()).disciples[0].id;
            const animation=await page.evaluate(async id => {
                const card=document.querySelector(`.disciple-card[data-disciple-id="${id}"]`);
                window.savedDiscipleSection=document.getElementById('disciples-section');
                window.savedDiscipleCard=card;window.savedDiscipleFill=card.querySelector('.disciple-xp-fill');
                const initial=parseFloat(getComputedStyle(savedDiscipleFill).width);
                game.tick();
                const d=game.disciplesState.roster.find(d=>d.id===id);
                const target=savedDiscipleFill.parentElement.clientWidth*parseFloat(savedDiscipleFill.style.width)/100;
                await new Promise(resolve=>setTimeout(resolve,90));
                return {xp:d.xp,initial,target,intermediate:parseFloat(getComputedStyle(savedDiscipleFill).width),
                    transition:getComputedStyle(savedDiscipleFill).transitionDuration};
            },id);
            assert.equal(animation.xp,.24);assert.equal(animation.transition,'0.18s');
            assert.ok(animation.intermediate>animation.initial&&animation.intermediate<animation.target,'CSS рисует промежуточную ширину реальной прибавки');
            const twelve=await page.evaluate(id => {
                for(let i=1;i<12;i++)game.tick();
                renderSects();renderDisciples();updateUI();
                const d=game.disciplesState.roster.find(d=>d.id===id);
                return {xp:d.xp,level:d.level,budget:d.learningXpThisYear,width:savedDiscipleFill.style.width,
                    persistent:savedDiscipleSection===document.getElementById('disciples-section')
                        &&savedDiscipleCard===document.querySelector(`.disciple-card[data-disciple-id="${id}"]`)
                        &&savedDiscipleFill===savedDiscipleCard.querySelector('.disciple-xp-fill')};
            },id);
            assert.equal(twelve.xp,2.88);assert.equal(twelve.budget,2.88);assert.equal(twelve.level,1);
            assert.equal(twelve.width,'96%');assert.equal(twelve.persistent,true);
            const rollover=await page.evaluate(id => {game.tick();const d=game.disciplesState.roster.find(d=>d.id===id);
                return {xp:d.xp,level:d.level,budget:d.learningXpThisYear,computed:parseFloat(getComputedStyle(savedDiscipleFill).width),
                    target:savedDiscipleFill.parentElement.clientWidth*parseFloat(savedDiscipleFill.style.width)/100,
                    text:savedDiscipleCard.querySelector('.disciple-level-xp').textContent};},id);
            assert.ok(Math.abs(rollover.xp-.12)<1e-8);assert.equal(rollover.level,2);assert.equal(rollover.budget,3.12);
            assert.ok(Math.abs(rollover.computed-rollover.target)<.1,'Rollover сразу устанавливает остаток нового уровня');
            assert.match(rollover.text,/Уровень 2.*0,12/);
            const stopped=await page.evaluate(id => {game.stop();const d=game.disciplesState.roster.find(d=>d.id===id);
                const before=JSON.stringify(d);updateTickUI();renderSects();saveGame();return {before,after:JSON.stringify(d)};},id);
            assert.equal(stopped.after,stopped.before,'UI не начисляет XP на паузе');
            await reloadSect();const restored=(await view()).disciples.find(d=>d.id===id);
            assert.equal(restored.learningXpThisYear,3.12);assert.equal(restored.level,2);assert.ok(Math.abs(restored.xp-.12)<1e-8);
            await page.evaluate(()=>{game.passYear();updateTickUI();});
            assert.equal(await xpLedger(id),6);assert.equal((await view()).disciples.find(d=>d.id===id).learningXpThisYear,0);
        });
        assert.deepEqual(errors,[],`Ошибки страницы: ${errors.join('; ')}`);
        console.log(`${passed} disciple browser scenarios passed, 0 page errors`);
    } finally {await browser.close();}
})().catch(error => {console.error(error);process.exitCode=1;});
