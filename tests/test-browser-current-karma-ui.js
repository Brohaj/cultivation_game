const PROJECT_ROOT = require('node:path').resolve(__dirname, '..');
// Проверки основного интерфейса: сохранённая пауза и неизменяемая закрытая жизнь.
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');

(async()=>{
    const browser=await chromium.launch({headless:true});
    const errors=[];
    try {
        async function click(page,selector) {
            await page.locator(selector).click();
            await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,0)));
        }
        async function freshPage() {
            const page=await browser.newPage({viewport:{width:1500,height:1100}});
            page.on('pageerror',error=>errors.push(error.message));
            await page.goto(pathToFileURL(path.join(PROJECT_ROOT,'index.html')).href);
            await click(page,'#btn-accept-root');
            await click(page,'#intro-modal button');
            await page.evaluate(()=>game.stop());
            return page;
        }
        const paused=await freshPage();
        await click(paused,'#btn-pause');
        assert.equal(await paused.evaluate(()=>game._paused),true);
        await paused.reload();
        assert.equal(await paused.evaluate(()=>game._paused),true);
        assert.match(await paused.locator('#btn-pause').textContent(),/Продолжить/);
        const pausedState=await paused.evaluate(()=>({qi:game.qi,year:game.years}));
        await paused.waitForTimeout(350);
        assert.deepEqual(await paused.evaluate(()=>({qi:game.qi,year:game.years})),pausedState);
        console.log('PASS Сохранённая пауза переживает reload и показывает кнопку продолжения');
        await paused.close();

        const imported=await freshPage();
        await imported.evaluate(()=>{game.start();resumeLoadedGame(true);});
        assert.equal(await imported.evaluate(()=>game._paused),true);
        assert.match(await imported.locator('#btn-pause').textContent(),/Продолжить/);
        const keptState=await imported.evaluate(()=>({qi:game.qi,year:game.years}));
        await imported.waitForTimeout(350);
        assert.deepEqual(await imported.evaluate(()=>({qi:game.qi,year:game.years})),keptState);
        console.log('PASS resumeLoadedGame(keepPaused) сохраняет явную паузу загрузки');
        await imported.close();

        for(const phase of ['pendingRebirth','gameOver']) {
            const page=await freshPage();
            await page.evaluate(phase=>{
                game.realmIndex=7;game.years=1000;game.birthYear=900;
                game.daoLevel=20;game.stones=10000;game.daoEssence=10000;game.artifactDust=10000;
                game.daoScrolls=3;game.prestige.karma=1000;
                game.prestige.karmaUpgrades.practiceSchedule=1;
                game.prestige.karmaUpgrades.formationRespec=1;
                game.prestige.unlockedFormations=['qiPillar','wardCircle'];
                game.selectedFormations=['qiPillar'];game.formations={qiPillar:2};
                game.artifacts=[];game.equippedArtifacts={weapon:null,armor:null,accessory:null,treasure:null};
                const first=game.generateArtifact('rare');game.addArtifact(first);game.equipArtifact(first.id);
                const second=game.generateArtifact('rare');game.addArtifact(second);_selectedArtifactId=second.id;
                game.techLevels.basic_breathing=TECHNIQUES.find(t=>t.id==='basic_breathing').maxLevel;
                game.learnTechnique('iron_body');game.unequipTechnique('iron_body');
                if(phase==='pendingRebirth')game.beginRebirth(false);else game.gameOver=true;
                updateUI();renderTechniques();renderArtifacts();renderFormations();renderPracticePlan();
                window.closedEconomySnapshot=()=>JSON.stringify({
                    qi:game.qi,stones:game.stones,essence:game.daoEssence,dust:game.artifactDust,
                    scrolls:game.daoScrolls,artifacts:game.artifacts,equipment:game.equippedArtifacts,
                    techniques:game.equippedTechniques,tiers:game.techAscendedTiers,levels:game.techLevels,
                    selected:game.selectedFormations,formations:game.formations,flags:game.flags,
                    pending:game.pendingRebirth,practice:game.practicePlan
                });
            },phase);
            assert.equal(await page.locator('#btn-pause').isDisabled(),true);
            assert.equal(await page.locator('#practice-plan-start').isDisabled(),true);
            assert.equal(await page.locator('#formation-replace-confirm').isDisabled(),true);
            const techButtons=page.locator('#techniques-list button');
            assert.ok(await techButtons.count()>=3);
            assert.equal(await techButtons.evaluateAll(buttons=>buttons.every(button=>button.disabled)),true);
            const forgeButtons=page.locator('#artifacts-list .btn-equip,#artifacts-list .btn-unequip,#artifacts-list .btn-disassemble,#artifacts-list .btn-enhance,#artifacts-list .btn-crone,#artifacts-list .btn-fuse,#artifacts-list .btn-scroll');
            assert.ok(await forgeButtons.count()>=5);
            assert.equal(await forgeButtons.evaluateAll(buttons=>buttons.every(button=>button.disabled)),true);
            assert.equal(await page.locator('[data-formation="qiPillar"]').isDisabled(),true);
            const before=await page.evaluate(()=>closedEconomySnapshot());
            await page.evaluate(()=>{
                const id=game.artifacts[0].id;
                toggleTechEquip('basic_breathing');ascendTechniqueUI('basic_breathing');
                equipArtifactUI(id);unequipArtifactUI(game.artifacts[0].slot);
                enhanceArtifactUI(id,false);disassembleArtifactUI(id,true);
                fuseArtifactUI(id,game.artifacts[1].id);useDaoScrollUI();
                confirmBulkDisassemble('rare');buyFormationUI('qiPillar');selectFormationUI('wardCircle');
                startPracticePlanUI();togglePause();
            });
            assert.equal(await page.evaluate(()=>closedEconomySnapshot()),before);
            console.log('PASS '+phase+': техники, кузня, формации, расписание и пауза заблокированы без изменения ресурсов');
            await page.close();
        }
        assert.deepEqual(errors,[]);
        console.log('4 current karma UI browser checks passed, 0 page errors');
    } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
