// Реальные действия текущего index.html: UI не подменяет игровую логику.
const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');

(async () => {
    const browser = await chromium.launch({headless:true});
    try {
        const page = await browser.newPage({viewport:{width:1500,height:1100}});
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.addInitScript(() => window.addEventListener('load', () => game.stop()));
        await page.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
        let passed = 0;
        async function check(name, fn) { await fn(); passed++; console.log(`PASS ${name}`); }
        async function fresh() {
            await page.evaluate(() => {
                game.reset(); game.stop();
                document.querySelectorAll('.modal-overlay.active').forEach(el => el.classList.remove('active'));
                game.selectSpiritualRoot('common'); game.learnTechnique('basic_breathing');
                game.realmIndex=7; game.subLevel=2; game.years=100; game.birthYear=0;
                game.strength=game.spirit=game.luck=1000; game.stones=20000;
                game.qi=0; game.daoEssence=10000; game.artifactDust=10000;
                game.worldEvent=null; Math.random=()=>0;
                game.joinSect('jade_purity'); game.daoLevel=1; game.daoProgress=0;
                game.prestige.daoLevels.jade_purity=1;
                switchTab('cultivation'); updateUI();
            });
        }
        async function clickAcrossRefresh(locator, refresh='updateUI') {
            await locator.scrollIntoViewIfNeeded();
            await locator.evaluate(el => window.pressedActionControl=el);
            const box=await locator.boundingBox(); assert.ok(box);
            await page.mouse.move(box.x+box.width/2,box.y+box.height/2); await page.mouse.down();
            await page.evaluate(name => {window[name](); window[name]();},refresh);
            assert.equal(await page.evaluate(() => pressedActionControl.isConnected),true,
                'Фоновое обновление сохраняет нажатый контрол');
            await page.mouse.up(); await page.evaluate(() => new Promise(resolve => setTimeout(resolve,0)));
        }
        const row = () => page.locator('.pill-row').first();
        const action = code => page.locator(`button[onclick="${code}"]`);

        await check('Количество 10: приём и очистка списывают ровно выбранное число рецептов',async () => {
            await fresh();
            await page.evaluate(() => {game.pills=110; game.refinedPills=0; updateUI();});
            await page.locator('#v2-pill-amount').selectOption('10');
            const before=await page.evaluate(() => ({gain:game.getPillQi(1),dust:game.artifactDust,
                count:game.getRefineCount(),cost:game.getRefineCost(1)}));
            await clickAcrossRefresh(row().getByRole('button',{name:'Принять',exact:true}),'updateTickUI');
            assert.deepEqual(await page.evaluate(() => ({pills:game.pills,qi:game.qi})),{pills:100,qi:10*before.gain});
            await clickAcrossRefresh(row().getByRole('button',{name:'Очистить',exact:true}));
            assert.deepEqual(await page.evaluate(() => ({pills:game.pills,refined:game.refinedPills,dust:game.artifactDust})),
                {pills:100-10*before.count,refined:10,dust:before.dust-10*before.cost});
            assert.equal(await page.locator('#v2-pill-amount').inputValue(),'10');
            await page.evaluate(() => {game.qi=game.qiNeeded()-1; updateUI();});
            const remaining=await page.evaluate(() => game.pills);
            await clickAcrossRefresh(row().getByRole('button',{name:'Принять',exact:true}),'updateTickUI');
            assert.equal(await page.evaluate(() => game.pills),remaining-1,'Пакет останавливается после заполнения ци');
            assert.equal(await row().getByRole('button',{name:'Принять',exact:true}).isDisabled(),true);
        });

        await check('Выбор формации бесплатен; улучшение оплачивается один раз и меняет её уровень',async () => {
            await fresh(); await page.evaluate(() => {game.daoLevel=5; updateUI();});
            const stones=await page.evaluate(() => game.stones);
            await clickAcrossRefresh(page.locator('[data-formation-select="qiPillar"]'));
            assert.equal(await page.evaluate(() => game.stones),stones);
            assert.deepEqual(await page.evaluate(() => game.selectedFormations),['qiPillar']);
            assert.equal(await page.locator('[data-formation-select="qiPillar"]').count(),0,'Выбранное не предлагается повторно');
            const cost=await page.evaluate(() => game.getFormationUpgradeCost('qiPillar'));
            await clickAcrossRefresh(page.locator('button[data-formation="qiPillar"]'));
            assert.equal(await page.evaluate(() => game.formations.qiPillar),1);
            assert.equal(await page.evaluate(() => game.stones),stones-cost);
            assert.match(await page.locator('[data-formation-card="qiPillar"] .v2-formation-level').innerText(),/Уровень 1/);
        });

        await check('Ручное поручение платит одну награду, списывает цену и уходит на кулдаун',async () => {
            await fresh();
            const before=await page.evaluate(() => {
                const t=SECT_MISSION_TEMPLATES.gather_stones;
                const m={...t.generate(game,{missionCostMult:1,missionRewardMult:1}),templateId:t.id,text:t.text,cooldown:0};
                game.sectMissions=[m]; switchTab('sect'); updateUI();
                return {stones:game.stones-(m.cost?.stones||0)+(m.reward.stones||0),
                    contribution:game.sect.contribution+game.getSectMissionContribution(m.reward.contribution||0),
                    count:(game.flags.sectMissionsCompleted||0)+1,cooldown:game.getSectMissionCooldown()};
            });
            await clickAcrossRefresh(action('completeSectMissionUI(0)'));
            assert.deepEqual(await page.evaluate(() => ({stones:game.stones,contribution:game.sect.contribution,
                count:game.flags.sectMissionsCompleted,cooldown:game.sectMissions[0].cooldown})),before);
            assert.equal(await action('completeSectMissionUI(0)').isDisabled(),true);
            const after=await page.evaluate(() => ({stones:game.stones,contribution:game.sect.contribution}));
            await action('completeSectMissionUI(0)').press('Enter');
            assert.deepEqual(await page.evaluate(() => ({stones:game.stones,contribution:game.sect.contribution})),after);
            await page.waitForTimeout(1300);
        });

        await check('Поход фиксирует ци, Дао и срок при отправлении; reload и новые бонусы не меняют выдачу',async () => {
            await fresh(); await page.evaluate(() => switchTab('expeditions'));
            const preview=await page.evaluate(() => game.getExpeditionCultivationReward(LOCATIONS.find(l=>l.id==='immortal_palace')));
            const card=page.locator('.expedition-card[data-location="immortal_palace"]');
            const text=await card.innerText();
            assert.ok(text.includes(await page.evaluate(qi=>Math.floor(qi).toLocaleString('ru-RU'),preview.qi)));
            assert.match(text,/Опыт Дао/);
            await clickAcrossRefresh(card.getByRole('button',{name:'Отправиться'}));
            assert.equal(await page.evaluate(() => game.stones),19900);
            const snapshot=await page.evaluate(() => game.expedition);
            assert.deepEqual(snapshot.cultivationReward,preview);
            await page.evaluate(() => saveGame()); await page.reload();
            assert.deepEqual(await page.evaluate(() => game.expedition),snapshot);
            const actual=await page.evaluate(() => {
                Math.random=()=>0; game.spirit*=2; game.selectedFormations=['realmGate']; game.formations.realmGate=10;
                game.worldEvent={...WORLD_EVENTS.find(e=>e.id==='secret_realm'),startYear:game.years};
                const saved=JSON.parse(JSON.stringify(game.expedition)), duration=game.getAdjustedExpeditionDuration();
                const daoExpected=Math.min(saved.cultivationReward.daoMin,game.getDaoProgressRoom());
                const daoBefore={level:game.daoLevel,xp:game.daoProgress};
                game.years+=duration; game.tickExpedition();
                let earnedDao=game.daoProgress-daoBefore.xp;
                for(let level=daoBefore.level;level<game.daoLevel;level++)earnedDao+=game.daoNeeded(level);
                const paid={qi:game.qi,daoLevel:game.daoLevel,dao:game.daoProgress,stones:game.stones,dust:game.artifactDust};
                game.tickExpedition(); switchTab('expeditions'); updateUI();
                return {saved,duration,daoExpected,earnedDao,paid,again:{qi:game.qi,daoLevel:game.daoLevel,dao:game.daoProgress,
                    stones:game.stones,dust:game.artifactDust},expedition:game.expedition};
            });
            assert.deepEqual(actual.saved,snapshot); assert.equal(actual.duration,preview.duration);
            assert.equal(actual.paid.qi,preview.qi); assert.ok(Math.abs(actual.earnedDao-actual.daoExpected)<1e-9);
            assert.deepEqual(actual.again,actual.paid); assert.equal(actual.expedition,null);
            assert.match(await page.locator('.expedition-last-items').innerText(),/ци/);
        });

        await check('Финал вознесения показывает 20 лет и сохраняет отложенную награду до срока',async () => {
            await fresh();
            await page.evaluate(() => {
                game.expeditionCompletions.heavenly_auction=10;
                game.addAdventureRumor('ascend_heavenly_auction'); switchTab('adventures'); updateUI();
            });
            await clickAcrossRefresh(action("acceptAdventureUI('ascend_heavenly_auction')"));
            await clickAcrossRefresh(action('chooseAdventureUI(0, 0)'));
            assert.match(await action('chooseAdventureUI(0, 0)').innerText(),/20 лет/);
            await clickAcrossRefresh(action('chooseAdventureUI(0, 0)'));
            const pending=await page.evaluate(() => ({journey:game.activeAdventures[0],pills:game.pills,dust:game.artifactDust}));
            assert.equal(pending.journey.stepDuration,20); assert.equal(pending.journey._finalStep,true);
            assert.ok(pending.journey._pendingRewards); assert.equal(await page.evaluate(() => game.ascendedLocations.heavenly_auction||0),0);
            await page.evaluate(() => saveGame()); await page.reload();
            assert.deepEqual(await page.evaluate(() => game.activeAdventures[0]._pendingRewards),pending.journey._pendingRewards);
            await page.evaluate(() => {Math.random=()=>0; game.years+=19; game.tickAdventures();});
            assert.equal(await page.evaluate(() => game.ascendedLocations.heavenly_auction||0),0);
            assert.equal(await page.evaluate(() => game.artifactDust),pending.dust);
            const result=await page.evaluate(() => {
                game.years++; game.tickAdventures(); const paid={dust:game.artifactDust,pills:game.pills,artifacts:game.artifacts.length};
                game.tickAdventures(); return {paid,again:{dust:game.artifactDust,pills:game.pills,artifacts:game.artifacts.length},
                    tier:game.ascendedLocations.heavenly_auction,active:game.activeAdventures.length};
            });
            assert.equal(result.tier,1); assert.equal(result.active,0); assert.ok(result.paid.dust>pending.dust);
            assert.ok(result.paid.pills>pending.pills); assert.equal(result.paid.artifacts,1); assert.deepEqual(result.again,result.paid);
        });

        await check('Заточка через настоящую кнопку платит материалы один раз и сразу показывает результат',async () => {
            await fresh();
            const cost=await page.evaluate(() => {
                const a=game.generateArtifact('common','weapon'); a.id='current_enhance'; game.artifacts=[a];
                switchTab('artifacts'); updateUI(); return game.getEnhanceCost(a);
            });
            await clickAcrossRefresh(page.locator('#art-card-current_enhance'));
            await clickAcrossRefresh(page.locator('.artifact-forge-panel .btn-enhance'));
            assert.deepEqual(await page.evaluate(() => ({level:game.artifacts[0].enhance,essence:game.daoEssence,dust:game.artifactDust})),
                {level:1,essence:10000-cost.essence,dust:10000-cost.dust});
            assert.match(await page.locator('.artifact-forge-panel').innerText(),/\+1/);
            await page.waitForTimeout(1500);
        });

        await check('Слияние показывает и списывает скидку кузнеца, уничтожая только выбранную жертву',async () => {
            await fresh();
            const costs=await page.evaluate(() => {
                game.prestige.lastBody='ancient_smith'; game.prestige.bodyAscensions.ancient_smith=3;
                const keep=game.generateArtifact('common','weapon'); keep.id='current_keep'; keep.enhance=10;
                const victim=game.generateArtifact('common','weapon'); victim.id='current_victim'; victim.enhance=10;
                game.artifacts=[keep,victim]; game.equippedArtifacts.weapon=victim;
                const discount=game.getActiveBodyPerks().fusionDiscount;
                game.daoEssence=Math.ceil(TRANSCEND_COST[0].essence*(1-discount));
                game.artifactDust=Math.ceil(TRANSCEND_COST[0].dust*(1-discount));
                switchTab('artifacts'); updateUI(); return {essence:game.daoEssence,dust:game.artifactDust,discount};
            });
            assert.equal(costs.discount,.4);
            await clickAcrossRefresh(page.locator('#art-card-current_keep'));
            const price=await page.locator('.fusion-cost').innerText();
            assert.ok(price.includes(`${costs.essence} эссенции`)); assert.ok(price.includes(`${costs.dust} пыли`));
            assert.match(await page.locator('.fusion-victim').innerText(),/сейчас надет/);
            await clickAcrossRefresh(page.locator('.artifact-forge-panel .btn-fuse'));
            assert.deepEqual(await page.evaluate(() => ({ids:game.artifacts.map(a=>a.id),level:game.artifacts[0].transcend,
                enhance:game.artifacts[0].enhance,essence:game.daoEssence,dust:game.artifactDust,equipped:game.equippedArtifacts.weapon})),
                {ids:['current_keep'],level:1,enhance:10,essence:0,dust:0,equipped:null});
        });

        await check('Обучение выдаёт XP сразу; активация и повышение качества закрываются после жизни',async () => {
            await fresh(); await page.evaluate(() => switchTab('techniques'));
            const card=page.locator('#tech-card-basic_breathing');
            await clickAcrossRefresh(card.locator('.btn-unequip'));
            assert.equal(await page.evaluate(() => game.isTechEquipped('basic_breathing')),false);
            await clickAcrossRefresh(card.locator('.btn-equip'));
            assert.equal(await page.evaluate(() => game.isTechEquipped('basic_breathing')),true);
            const bulk=await page.evaluate(() => game.getInsightPurchaseInfo(10));
            await clickAcrossRefresh(page.locator('#btn-insight-multi10'));
            assert.equal(await page.evaluate(() => game.daoEssence),10000-bulk.cost);
            assert.equal(await page.evaluate(() => game._insightUses),bulk.count);
            assert.equal(await page.evaluate(() => game._pendingInsightXP||null),null);
            assert.ok(await page.evaluate(() => game.techXP.basic_breathing>0||game.techLevels.basic_breathing>1));
            const info=await page.evaluate(() => {
                const t=TECHNIQUES.find(t=>t.id==='basic_breathing'); game.techLevels[t.id]=t.maxLevel; game.techXP[t.id]=0;
                renderTechniques(); return game.getTechAscendInfo(t.id);
            });
            const before=await page.evaluate(() => game.daoEssence);
            await clickAcrossRefresh(card.locator('.btn-ascend'));
            assert.equal(await page.evaluate(() => game.daoEssence),before-info.essence);
            assert.equal(await page.evaluate(() => TECHNIQUES.find(t=>t.id==='basic_breathing').tier),info.to);
            assert.equal(await page.evaluate(() => game.techLevels.basic_breathing),1);
            assert.equal(await page.evaluate(() => game.techXP.basic_breathing),0);
            await page.waitForTimeout(2100);
            await page.evaluate(() => {game.beginRebirth(false); renderTechniques(); updateUI();});
            assert.equal(await page.locator('#techniques-list .btn-equip:enabled,#techniques-list .btn-unequip:enabled,#techniques-list .btn-ascend:enabled').count(),0);
            assert.equal(await page.locator('#btn-insight').isDisabled(),true);
        });
        assert.deepEqual(errors,[],'Нет ошибок страницы');
        console.log(`${passed} current action scenarios passed, 0 page errors`);
    } finally {await browser.close();}
})().catch(error => {console.error(error);process.exitCode=1;});
