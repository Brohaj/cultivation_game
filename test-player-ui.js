// Настоящие клики удерживаются через фоновое обновление DOM.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless:true });
    try {
        const page = await browser.newPage({ viewport:{width:1500,height:1100} });
        const errors=[];
        page.on('pageerror', error=>errors.push(error.message));
        const savePath=process.argv[2] || path.join(__dirname,'test-fixtures','player-report-v14.json');
        const save=JSON.parse(fs.readFileSync(savePath,'utf8').replace(/^\uFEFF/,''));
        await page.addInitScript(data=>localStorage.setItem('cultivation_game_prototype_save',JSON.stringify(data)),save);
        await page.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
        if (await page.locator('#btn-accept-root').isVisible()) {
            await page.locator('#btn-accept-root').click();
            await page.locator('#intro-modal button').click();
        }
        await page.evaluate(()=>game.stop());

        async function clickAcrossRefresh(locator, refresh='updateUI') {
            await locator.scrollIntoViewIfNeeded();
            await locator.evaluate(el=>window.pressedControl=el);
            const box=await locator.boundingBox();
            assert.ok(box);
            await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
            await page.mouse.down();
            await page.evaluate(name=>{ window[name](); window[name](); },refresh);
            assert.equal(await page.evaluate(()=>pressedControl.isConnected),true,'Фоновое обновление не должно заменять нажатую кнопку');
            await page.mouse.up();
            await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,0)));
        }

        await page.evaluate(()=>{game.realmIndex=7;game.subLevel=2;game.qi=0;game.pills=110;game.artifactDust=157;switchTab('cultivation');updateUI();});
        const gain=await page.evaluate(()=>game.getPillQi(1));
        await clickAcrossRefresh(page.locator('.pill-row').first().locator('.pill-use-btns button').first(),'updateTickUI');
        assert.deepEqual(await page.evaluate(()=>({pills:game.pills,qi:game.qi})),{pills:109,qi:gain});
        console.log('PASS Пилюля Ци: один настоящий клик через два тика');

        const beforeRefine=await page.evaluate(()=>({pills:game.pills,refined:game.refinedPills||0,dust:game.artifactDust,count:game.getRefineCount(),cost:game.getRefineCost(1)}));
        await clickAcrossRefresh(page.locator('.pill-row').first().locator('.pill-refine button').first());
        assert.deepEqual(await page.evaluate(()=>({pills:game.pills,refined:game.refinedPills||0,dust:game.artifactDust})),{pills:beforeRefine.pills-beforeRefine.count,refined:beforeRefine.refined+1,dust:beforeRefine.dust-beforeRefine.cost});
        console.log('PASS Переплавка: один настоящий клик списывает один рецепт');

        await page.evaluate(()=>{game.expedition=null;game.stones=100000;game.daoLevel=20;game.realmIndex=7;game.selectedFormations=['qiPillar'];game.formations.qiPillar=0;updateUI();});
        const formCost=await page.evaluate(()=>game.getFormationUpgradeCost('qiPillar'));
        await clickAcrossRefresh(page.locator('button[data-formation="qiPillar"]'));
        assert.equal(await page.evaluate(()=>game.formations.qiPillar),1);
        assert.equal(await page.evaluate(()=>game.stones),100000-formCost);
        console.log('PASS Формация: один клик через полное обновление');

        await page.evaluate(()=>{game.expedition=null;game.stones=100000;switchTab('expeditions');});
        const entryCost=await page.evaluate(()=>{const loc=LOCATIONS.find(l=>l.id==='spirit_forest');const asc=game.ascendedLocations[loc.id]||0;return (loc.entryCost||0)*(asc>=2?3:asc>=1?2:1);});
        await clickAcrossRefresh(page.locator('button[onclick="startExpeditionUI(\'spirit_forest\')"]'));
        assert.equal(await page.evaluate(()=>game.expedition?.locationId),'spirit_forest');
        assert.equal(await page.evaluate(()=>game.stones),100000-entryCost);
        await page.evaluate(()=>{game.currentActivity='meditation';switchTab('cultivation');updateUI();});
        assert.equal(await page.locator('#qi-rate').textContent(),'0');
        assert.match(await page.locator('#activity-info-meditation').textContent(),/приостановлена/);
        console.log('PASS Тайное царство: один клик запускает поход');

        await page.evaluate(()=>{
            game.expedition=null;
            game.sect={id:'jade_purity',rank:0,contribution:0};
            game.stones=100000;
            const template=SECT_MISSION_TEMPLATES.gather_stones;
            const mission=template.generate(game,{missionCostMult:1,missionRewardMult:1});
            game.sectMissions=[{...mission,templateId:template.id,text:template.text,cooldown:0}];
            switchTab('sect');
            updateUI();
        });
        const beforeMission=await page.evaluate(()=>({stones:game.stones,cost:game.sectMissions[0].cost.stones,contribution:game.getSectMissionContribution(game.sectMissions[0].reward.contribution),completed:game.flags.sectMissionsCompleted||0,cooldown:game.getSectMissionCooldown()}));
        await clickAcrossRefresh(page.locator('button[onclick="completeSectMissionUI(0)"]'));
        assert.deepEqual(await page.evaluate(()=>({stones:game.stones,contribution:game.sect.contribution,completed:game.flags.sectMissionsCompleted,cooldown:game.sectMissions[0].cooldown})),{stones:beforeMission.stones-beforeMission.cost,contribution:beforeMission.contribution,completed:beforeMission.completed+1,cooldown:beforeMission.cooldown});
        console.log('PASS Задание секты: один клик списывает цену и выдаёт одну награду');

        await page.evaluate(()=>{game.pills=20;game.refinedPills=2;game.qi=game.qiNeeded()-1;switchTab('cultivation');updateUI();});
        await clickAcrossRefresh(page.locator('.pill-row').first().locator('.pill-use-btns button').nth(1),'updateTickUI');
        assert.equal(await page.evaluate(()=>game.pills),19,'Массовый приём останавливается при заполнении ци');
        assert.equal(await page.locator('.pill-row').first().locator('.pill-use-btns button').first().isDisabled(),true);
        await page.evaluate(()=>{game.usePill();game.useRefinedPill();});
        assert.deepEqual(await page.evaluate(()=>({pills:game.pills,refined:game.refinedPills})),{pills:19,refined:2});
        console.log('PASS Пилюли при полной ци не тратятся впустую');

        await page.evaluate(()=>{game.pills=100;game.artifactDust=game.getRefineCost(1);updateUI();});
        const refineTen=page.locator('.pill-row').first().locator('.pill-refine button').nth(1);
        assert.equal(await refineTen.isDisabled(),true);
        const recipe=await page.evaluate(()=>({count:game.getRefineCount()*10,dust:game.getRefineCost(1)*10}));
        assert.match(await refineTen.getAttribute('title'),new RegExp(`${recipe.count} пилюль \\+ ${recipe.dust} пыли`));
        console.log('PASS Переплавка x10 проверяет и показывает полную стоимость');

        await page.evaluate(()=>{
            game.realmIndex=7;game.prestige.lastBody='peasant';game.daoEssence=10000;
            game.techniques=['basic_breathing'];game.equippedTechniques=['basic_breathing'];
            const tech=TECHNIQUES.find(t=>t.id==='basic_breathing');
            game.techLevels[tech.id]=tech.maxLevel;game.techXP[tech.id]=0;
            game._pendingInsightXP=null;game._insightTicksLeft=0;
            switchTab('techniques');updateUI();
        });
        assert.equal(await page.locator('#btn-insight').isDisabled(),true);
        assert.equal(await page.locator('#btn-insight-multi10').isDisabled(),true);
        const insightState=await page.evaluate(()=>({essence:game.daoEssence,uses:game._insightUses||0}));
        await page.evaluate(()=>game.buyInsight());
        assert.deepEqual(await page.evaluate(()=>({essence:game.daoEssence,uses:game._insightUses||0})),insightState);
        console.log('PASS Озарение при всех максимальных техниках не списывает эссенцию');

        await page.evaluate(()=>{game._pendingInsightXP={basic_breathing:1};game._insightTicksLeft=1;renderTechniques();});
        assert.match(await page.locator('#tech-card-basic_breathing .ascend-locked .stat-tip').textContent(),/Дождитесь завершения озарения/);
        await page.evaluate(()=>game._tickInsightXP());
        assert.equal(await page.locator('#tech-card-basic_breathing .btn-ascend').isVisible(),true);
        console.log('PASS Вознесение сообщает о pending XP и открывается по окончании озарения');

        await page.evaluate(()=>{
            game.prestige.lastBody='ancient_smith';game.prestige.bodyAscensions.ancient_smith=3;
            const a=game.generateArtifact('common','weapon');a.id='ui_keep';a.enhance=10;
            const b=game.generateArtifact('common','weapon');b.id='ui_consume';b.enhance=10;
            game.artifacts=[a,b];game.equippedArtifacts={weapon:null,armor:null,accessory:null,treasure:null};
            const discount=game.getActiveBodyPerks().fusionDiscount;
            game.daoEssence=Math.ceil(TRANSCEND_COST[0].essence*(1-discount));
            game.artifactDust=Math.ceil(TRANSCEND_COST[0].dust*(1-discount));
            switchTab('artifacts');updateUI();
        });
        await clickAcrossRefresh(page.locator('#art-card-ui_keep'));
        const fusionCosts=await page.evaluate(()=>({essence:game.daoEssence,dust:game.artifactDust}));
        assert.equal(await page.locator('.btn-fuse').isEnabled(),true);
        assert.equal(await page.locator('.fusion-cost').textContent(),`Цена: ${fusionCosts.essence} эссенции + ${fusionCosts.dust} пыли`);
        await clickAcrossRefresh(page.locator('.btn-fuse'));
        assert.deepEqual(await page.evaluate(()=>({ids:game.artifacts.map(a=>a.id),transcend:game.artifacts[0].transcend,essence:game.daoEssence,dust:game.artifactDust})),{ids:['ui_keep'],transcend:1,essence:0,dust:0});
        console.log('PASS Слияние применяет скидку кузнеца в цене, доступности и оплате');

        await page.evaluate(()=>{
            game.prestige.lastBody='peasant';
            const a=game.generateArtifact('common','weapon');a.id='ui_cancel';
            game.artifacts=[a];_selectedArtifactId=null;renderArtifacts();
        });
        await clickAcrossRefresh(page.locator('#art-card-ui_cancel'));
        await clickAcrossRefresh(page.locator('.forge-actions .btn-disassemble'));
        await page.evaluate(()=>updateUI());
        assert.equal(await page.locator('.disassemble-overlay').isVisible(),true,'Подтверждение переживает фоновую перерисовку');
        await clickAcrossRefresh(page.locator('.disassemble-overlay button').last());
        await page.keyboard.press('Enter');
        await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,0)));
        assert.deepEqual(await page.evaluate(()=>game.artifacts.map(a=>a.id)),['ui_cancel']);
        console.log('PASS Отмена разбора снимает Enter-handler и сохраняет артефакт');

        await page.evaluate(()=>{
            const common=game.generateArtifact('common','weapon');common.id='ui_common';
            const divine=game.generateArtifact('divine','weapon');divine.id='ui_divine';
            game.artifacts=[common,divine];_selectedArtifactId=null;renderArtifacts();
        });
        await clickAcrossRefresh(page.locator('.artifact-inventory h3 button'));
        assert.equal(await page.locator('.bulk-row').first().locator('.bulk-count').textContent(),'1 шт.');
        await clickAcrossRefresh(page.locator('button[onclick="confirmBulkDisassemble(\'common\')"]'));
        assert.deepEqual(await page.evaluate(()=>game.artifacts.map(a=>a.id)),['ui_divine']);
        console.log('PASS Массовый разбор смертных не затрагивает божественный тир');

        await page.evaluate(()=>{game.pills=5;game.qi=0;switchTab('cultivation');updateUI();});
        const keyboardPill=page.locator('.pill-row').first().locator('.pill-use-btns button').first();
        await keyboardPill.focus();
        await keyboardPill.evaluate(el=>window.pressedControl=el);
        await page.keyboard.down('Space');
        await page.evaluate(()=>updateTickUI());
        assert.equal(await page.evaluate(()=>pressedControl.isConnected),true);
        await page.keyboard.up('Space');
        await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,0)));
        assert.equal(await page.evaluate(()=>game.pills),4);
        console.log('PASS Клавиатурный Space-клик переживает тик и выполняется один раз');

        await page.evaluate(()=>{
            game.spirit=1;game.stones=1000;game.daoEssence=100;game.artifactDust=100;
            game.completedAdventures=[];game.activeAdventures=[];
            game.ascendedLocations.spirit_forest=0;game.expeditionCompletions.spirit_forest=10;
            game.adventureRumors=[{id:'ascend_spirit_forest',appearedYear:game.years}];
            const art=game.generateArtifact('common','treasure');art.effects={spirit:20};
            game.artifacts=[art];game.equippedArtifacts={weapon:null,armor:null,accessory:null,treasure:art};
            switchTab('adventures');updateUI();
        });
        await clickAcrossRefresh(page.locator('button[onclick="acceptAdventureUI(\'ascend_spirit_forest\')"]'));
        assert.match(await page.locator('.adventure-choice-btn').first().locator('.adventure-choice-reqs').textContent(),/Дух: 21\/14/);
        assert.equal(await page.locator('.adventure-choice-btn').first().locator('.adventure-check-pass').count(),1);
        await clickAcrossRefresh(page.locator('button[onclick="chooseAdventureUI(0, 0)"]'));
        assert.equal(await page.evaluate(()=>game.activeAdventures[0].flags.invited),true);
        console.log('PASS Проверка приключения показывает и применяет дух вместе с артефактом');

        await page.evaluate(()=>{
            game.activeAdventures=[];game.ascendedLocations.spirit_forest=1;game.expeditionCompletions.spirit_forest=20;
            game.adventureRumors=[{id:'ascend2_spirit_forest',appearedYear:0}];
            game.stones=0;game.daoEssence=0;game.artifactDust=0;renderAdventures();
        });
        assert.match(await page.locator('.adventure-rumor-timer').textContent(),/Постоянное/);
        assert.match(await page.locator('.adventure-busy').textContent(),/Недостаточно ресурсов для входа/);
        assert.equal(await page.locator('button[onclick="acceptAdventureUI(\'ascend2_spirit_forest\')"]').count(),0);
        console.log('PASS Высшее вознесение постоянно и не предлагает неоплачиваемый вход');

        await page.evaluate(()=>{
            game.luck=10000;game.equippedArtifacts={weapon:null,armor:null,accessory:null,treasure:null};
            game.techniques=['basic_breathing'];game.equippedTechniques=['basic_breathing'];game.techLevels.basic_breathing=1;
            game.selectedFormations=['qiPillar'];game.formations.qiPillar=0;game.stones=100000;game.realmIndex=7;
            game.prestige.lastBody='peasant';game.prestige.karmaUpgrades.talent=2;
            switchTab('cultivation');updateUI();
        });
        const rewardBonus=await page.evaluate(()=>(game.getRewardLuckBonus()*100).toFixed(1));
        assert.match(await page.locator('#tip-luck').textContent(),new RegExp(`Награды: \\+${rewardBonus}%`));
        const expectedSpeed=await page.evaluate(()=>game.techXpPerTick('basic_breathing').toFixed(2));
        assert.equal(await page.locator('#tech-speed-value').textContent(),`×${expectedSpeed}`);
        assert.doesNotMatch(await page.locator('#tip-karma').textContent(),/Сокровищница/);
        console.log('PASS Подсказки удачи и скорости техник показывают реальные формулы');

        async function openContentAdventure(id, stones) {
            const added=await page.evaluate(({id,stones})=>{
                game.realmIndex=3;game.subLevel=1;game.stones=stones;
                game.strength=1;game.spirit=1;game.luck=1;
                game.pills=0;game.daoEssence=0;game.artifactDust=0;
                game.sect=null;game.expedition=null;game.prestige.lastBody='peasant';
                game.artifacts=[];game.equippedArtifacts={weapon:null,armor:null,accessory:null,treasure:null};
                game.completedAdventures=[];game.activeAdventures=[];game.adventureRumors=[];
                game.lastAdventureReward=null;
                const added=game.addAdventureRumor(id);
                switchTab('adventures');updateUI();
                return added;
            },{id,stones});
            assert.equal(added,true);
            await clickAcrossRefresh(page.locator(`button[onclick="acceptAdventureUI('${id}')"]`));
            await page.evaluate(()=>{window.uiContentJourney=game.activeAdventures[0];});
        }

        await page.evaluate(()=>{window.uiContentOriginalRandom=Math.random;Math.random=()=>0;});
        await openContentAdventure('lost_caravan',0);
        await clickAcrossRefresh(page.locator('button[onclick="chooseAdventureUI(0, 0)"]'));
        const poorBribe=page.locator('button[onclick="chooseAdventureUI(0, 1)"]');
        assert.equal(await poorBribe.isDisabled(),true,'Без сведений старосты подкуп требует 20 камней');
        assert.match(await poorBribe.textContent(),/20 камней/);
        assert.equal(await page.evaluate(()=>game.stones),0);

        await openContentAdventure('lost_caravan',15);
        await clickAcrossRefresh(page.locator('button[onclick="chooseAdventureUI(0, 1)"]'));
        assert.deepEqual(await page.evaluate(()=>({stones:game.stones,village:uiContentJourney.flags.village})),{stones:0,village:true});
        const informedBribe=page.locator('button[onclick="chooseAdventureUI(0, 1)"]');
        assert.equal(await informedBribe.isEnabled(),true,'Имя лиса позволяет договориться с нулевым кошельком');
        assert.match(await informedBribe.locator('.adventure-choice-desc').textContent(),/Без крови и дополнительной платы/);
        assert.doesNotMatch(await informedBribe.textContent(),/20 камней/);
        assert.equal(await informedBribe.locator('.adventure-choice-reqs').count(),0);
        await clickAcrossRefresh(informedBribe);
        assert.deepEqual(await page.evaluate(()=>({stones:game.stones,pills:game.pills,bribed:uiContentJourney.flags.bribed,active:game.activeAdventures.length,completed:game.completedAdventures})),{stones:48,pills:3,bribed:true,active:0,completed:['lost_caravan']});
        console.log('PASS Совет старосты включает бесплатный финал с нулём камней, обычный подкуп остаётся платным');

        await openContentAdventure('abandoned_temple',0);
        await clickAcrossRefresh(page.locator('button[onclick="chooseAdventureUI(0, 1)"]'));
        await clickAcrossRefresh(page.locator('button[onclick="chooseAdventureUI(0, 2)"]'));
        const trappedLoot=page.locator('button[onclick="chooseAdventureUI(0, 0)"]');
        assert.match(await trappedLoot.locator('.adventure-choice-reqs').textContent(),/Удача: 1\/12/);
        assert.equal(await trappedLoot.locator('.adventure-check-fail').count(),1,'Обход стража не снимает защиту наследия');

        await openContentAdventure('abandoned_temple',30);
        await clickAcrossRefresh(page.locator('button[onclick="chooseAdventureUI(0, 2)"]'));
        assert.deepEqual(await page.evaluate(()=>({stones:game.stones,guide:uiContentJourney.flags.guide})),{stones:0,guide:true});
        const command=page.locator('button[onclick="chooseAdventureUI(0, 1)"]');
        assert.equal(await command.isEnabled(),true);
        assert.match(await command.locator('.adventure-choice-desc').textContent(),/Произнести команду отшельника/);
        assert.doesNotMatch(await command.textContent(),/Дух:/);
        await clickAcrossRefresh(command);
        assert.equal(await page.evaluate(()=>uiContentJourney.flags.sealed),true);
        const safeLoot=page.locator('button[onclick="chooseAdventureUI(0, 0)"]');
        assert.equal(await safeLoot.isEnabled(),true);
        assert.match(await safeLoot.locator('.adventure-choice-desc').textContent(),/Защита снята/);
        assert.doesNotMatch(await safeLoot.textContent(),/Удача:|12/);
        assert.equal(await safeLoot.locator('.adventure-choice-reqs').count(),0);
        await clickAcrossRefresh(safeLoot);
        assert.deepEqual(await page.evaluate(()=>({luck:game.luck,stones:game.stones,essence:game.daoEssence,success:uiContentJourney.flags.greedy_ok,failed:!!uiContentJourney.flags.greedy_fail,completed:game.completedAdventures})),{luck:1,stones:80,essence:25,success:true,failed:false,completed:['abandoned_temple']});
        await page.evaluate(()=>{Math.random=uiContentOriginalRandom;delete window.uiContentOriginalRandom;});
        console.log('PASS Команда проводника снимает требования духа и финальную ловушку при удаче 1');

        await page.evaluate(()=>{
            game.realmIndex=10;game.stones=100000;game.sect={id:'jade_purity',contribution:100000,rank:4};
            game.expedition=null;game.gameOver=false;game.pendingRebirth=null;
            game.flags.expedition_sect_secret_realm=true;
            game.flags.expedition_heavenly_auction=true;game.flags.expedition_spirit_forest=true;
            game.expeditionCompletions={sect_secret_realm:30,heavenly_auction:30,spirit_forest:14};
            game.ascendedLocations={heavenly_auction:1,spirit_forest:1};
            game.completedAdventures=[];switchTab('expeditions');renderExpeditions();
        });
        const realmCard = id=>page.locator('.expedition-card').filter({has:page.locator(`button[onclick="startExpeditionUI('${id}')"]`)});
        for (const id of ['sect_secret_realm','heavenly_auction','spirit_forest']) assert.equal(await realmCard(id).count(),1);
        assert.equal(await realmCard('sect_secret_realm').locator('.expedition-ascend-ready,.expedition-ascend-progress').count(),0);
        assert.equal(await realmCard('heavenly_auction').locator('.expedition-ascend-ready,.expedition-ascend-progress').count(),0);
        assert.match(await realmCard('spirit_forest').innerText(),/14\/20 общих походов/);
        await page.evaluate(()=>{game.expeditionCompletions.spirit_forest=20;renderExpeditions();});
        assert.match(await realmCard('spirit_forest').innerText(),/Доступно высшее испытание/);
        assert.doesNotMatch(await realmCard('spirit_forest').innerText(),/Опасность значительно вырастет/);
        console.log('PASS показаны только существующие испытания локаций и 20 общих походов');

        await page.evaluate(()=>{
            game.reset();game.stop();game.selectSpiritualRoot('common');game.realmIndex=7;
            game.years=1000;game.birthYear=900;game.stones=game.daoEssence=game.artifactDust=10000;
            game.pills=10;game.refinedPills=10;game.daoScrolls=3;game.daoLevel=5;
            game.learnTechnique('basic_breathing');game.techLevels.basic_breathing=10;
            game.prestige.unlockedFormations=['qiPillar','breakthroughAltar'];game.selectFormation('qiPillar');
            game.artifacts=[{id:'closed_blade',name:'Учебный меч',slot:'weapon',tier:'common',effects:{strength:1},
                enhance:0,transcend:0,investedDust:0,investedEssence:0}];game.equipArtifact('closed_blade');
            _selectedArtifactId='closed_blade';game.beginRebirth(false);
            document.querySelectorAll('.modal-overlay.active').forEach(el=>el.classList.remove('active'));
            switchTab('artifacts');renderArtifacts();updateTickUI();
        });
        const closedForge=page.locator('.artifact-forge-panel');
        assert.match(await closedForge.innerText(),/Жизнь завершена/);
        assert.doesNotMatch(await closedForge.innerText(),/\+10 МАКС|PEN.*АБСОЛЮТ/);
        assert.equal(await closedForge.locator('.btn-enhance').isDisabled(),true);
        assert.equal(await closedForge.locator('.btn-unequip').isDisabled(),true);
        assert.equal(await page.locator('.btn-scroll').count(),0);
        for(const button of await page.locator('#pill-table button.btn-pill').all())assert.equal(await button.isDisabled(),true);
        console.log('PASS Закрытая жизнь блокирует снаряжение и пилюли, не выдавая +0 артефакт за +10');

        await page.evaluate(()=>{switchTab('formations');renderFormations();updateTickUI();});
        for(const button of await page.locator('#formations-list button[onclick^="selectFormationUI"],#formations-list button[data-cost]').all()) {
            assert.equal(await button.isDisabled(),true);
        }
        assert.ok(await page.locator('#formations-list button[data-cost]').count()>0);
        await page.evaluate(()=>{switchTab('techniques');renderTechniques();});
        assert.match(await page.locator('.ascend-locked .stat-tip').first().textContent(),/Жизнь завершена/);
        for(const button of await page.locator('#techniques-list .btn-equip,#techniques-list .btn-unequip').all())assert.equal(await button.isDisabled(),true);
        console.log('PASS Превью формаций и техник объясняет запрет закрытой жизни, лёгкий тик его сохраняет');

        assert.deepEqual(errors,[]);
        console.log('21 player UI checks passed, 0 page errors');
    } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
