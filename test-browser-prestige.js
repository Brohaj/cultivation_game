// Реальные клики пожертвования и переходов prestige в одном изолированном Chromium.
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({headless:true});
    try {
        const page = await browser.newPage({viewport:{width:1500,height:1100}});
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        // При настоящих reload сохраняем localStorage; только останавливаем
        // новые таймеры после инициализации, чтобы проверять точные границы.
        await page.addInitScript(() => {
            window.addEventListener('load', () => {
                if (typeof game !== 'undefined') game.stop();
            });
        });
        await page.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
        await page.evaluate(() => {
            game.stop();
            document.querySelectorAll('.modal-overlay.active').forEach(el => el.classList.remove('active'));
            game.reset(); game.stop(); game.selectSpiritualRoot('common');
            game.realmIndex=3; game.subLevel=1; game.years=100; game.birthYear=16;
            game.sect={id:'moon_lake',rank:0,contribution:0};
            game.pills=100; game.stones=0; game.daoEssence=0; game.flags={};
            Math.random=()=>.5;
            const excludes=SECTS.find(s=>s.id==='moon_lake').missions.filter(id=>id!=='donate_pills_sect');
            game.sectMissions=[
                game._generateOneMission(excludes),
                {templateId:'prove_spirit',text:'Проверка духа',description:'Дух 1+',check:{spirit:1},reward:{stones:100},cooldown:0}
            ];
            window.donationCalls=[];
            const original=game.donatePills;
            game.donatePills=function(amount){donationCalls.push(amount);return original.call(this,amount);};
            switchTab('sect'); updateUI();
        });
        async function click(button) {
            await button.click();
            // Рендер продукта откладывается до окончания исходного click.
            await page.evaluate(() => new Promise(resolve => setTimeout(resolve,0)));
        }
        const donate5 = () => page.locator('button[onclick="game.donatePills(5); renderSects();"]');
        const donate1 = () => page.locator('button[onclick="game.donatePills(1); renderSects();"]').first();

        assert.match(await page.locator('.sect-mission-card[data-index="0"]').textContent(), /Награда автоматически при сдаче пилюль/);
        assert.equal(await page.locator('button[onclick="completeSectMissionUI(0)"]').count(),0);
        await click(donate5());
        assert.deepEqual(await page.evaluate(() => ({
            pills:game.pills,contribution:game.sect.contribution,stones:game.stones,cooldown:game.sectMissions[0].cooldown
        })),{pills:95,contribution:25,stones:0,cooldown:0});
        assert.match(await page.locator('.sect-mission-card[data-index="0"] .sect-mission-desc').textContent(),/5\/6 пожертвовано/);
        await click(donate1());
        const donation = await page.evaluate(() => ({
            pills:game.pills,contribution:game.sect.contribution,stones:game.stones,
            cooldown:game.sectMissions[0].cooldown,completed:game.flags.sectMissionsCompleted
        }));
        assert.deepEqual(donation,{pills:94,contribution:73,stones:19,cooldown:20,completed:1});
        assert.deepEqual(await page.evaluate(() => donationCalls),[5,1]);
        assert.match(await page.locator('.sect-mission-card[data-index="0"]').textContent(),/через 20/);
        assert.equal(await page.locator('button[onclick="completeSectMissionUI(1)"]').isEnabled(),true);
        assert.equal(await page.evaluate(() => game.canCompleteSectMission(1)),true);
        console.log('PASS Одиночные клики сдачи 5 и 1 сохраняют обе награды и закрывают только квест пожертвования');

        await page.evaluate(() => saveGame());
        await page.reload();
        assert.deepEqual(await page.evaluate(() => {
            game.stop(); switchTab('sect');
            return {pills:game.pills,contribution:game.sect.contribution,stones:game.stones,
                cooldown:game.sectMissions[0].cooldown,completed:game.flags.sectMissionsCompleted};
        }),donation);
        assert.equal(await page.evaluate(() => game.completeSectMission(0)),false);
        await click(donate1());
        assert.deepEqual(await page.evaluate(() => ({
            pills:game.pills,contribution:game.sect.contribution,stones:game.stones,
            cooldown:game.sectMissions[0].cooldown,completed:game.flags.sectMissionsCompleted
        })),{pills:93,contribution:78,stones:19,cooldown:20,completed:1});
        assert.equal(await page.evaluate(() => game.sectMissions[1].templateId),'prove_spirit');
        await click(page.locator('button[onclick="completeSectMissionUI(1)"]'));
        assert.equal(await page.evaluate(() => game.stones),119);
        assert.equal(await page.evaluate(() => game.flags.sectMissionsCompleted),2);
        console.log('PASS Reload не дублирует автоматическую выплату; обычное готовое задание требует своего клика');

        await page.evaluate(() => {
            game.stop();
            document.querySelectorAll('.modal-overlay.active').forEach(el => el.classList.remove('active'));
            game.reset(); game.stop(); game.selectSpiritualRoot('common');
            game.realmIndex=10; game.subLevel=4; game.years=150000; game.birthYear=149000;
            game.prestige.totalRebirths=2; game.prestige.qualifiedRebirths=2;game.prestige.karma=149; game.prestige.karmaSpent=0;
            game.prestige.karmaUpgrades={}; game.prestige.bodyAscensions={};
            game.prestige.permanentMilestones=[]; game.prestige.lastBody='peasant';
            // Не beginRebirth: этот сценарий проверяет прежние 149, без новой кармы жизни.
            game.pendingRebirth={karmaEarned:0,naturalDeath:false,bodyId:'peasant'};
            selectedRebirthBody='peasant';
            document.getElementById('rebirth-modal').classList.add('active');
            renderRebirthContent(); updateUI();
        });
        const wealth = page.locator('button[onclick="buyKarmaUpgradeUI(\'wealth\')"]');
        assert.match(await wealth.textContent(),/Купить \(4 кармы\)/);
        assert.equal(await page.evaluate(() => game.meetsRealmRequirement(11)),false);
        await click(wealth);
        const ledger = await page.evaluate(() => ({
            karma:game.prestige.karma,spent:game.prestige.karmaSpent,
            total:game.prestige.karma+game._getTotalKarmaSpent(),wealth:game.prestige.karmaUpgrades.wealth,
            gate11:game.meetsRealmRequirement(11),rebirths:game.prestige.totalRebirths,pendingEarned:game.pendingRebirth.karmaEarned
        }));
        assert.deepEqual(ledger,{karma:145,spent:4,total:149,wealth:1,gate11:false,rebirths:2,pendingEarned:0});
        await page.reload();
        assert.equal(await page.locator('#rebirth-modal').evaluate(el=>el.classList.contains('active')),true);
        assert.deepEqual(await page.evaluate(() => ({
            karma:game.prestige.karma,spent:game.prestige.karmaSpent,
            total:game.prestige.karma+game._getTotalKarmaSpent(),wealth:game.prestige.karmaUpgrades.wealth,
            gate11:game.meetsRealmRequirement(11),rebirths:game.prestige.totalRebirths,pendingEarned:game.pendingRebirth.karmaEarned
        })),ledger);
        console.log('PASS Покупка со скидкой тратит ровно 4 кармы; накопленные 149 не открывают барьер 150 после reload');

        assert.equal(await page.evaluate(() => game.isBodyUnlocked('ancient_reincarnation')),false);
        await page.evaluate(() => selectBody('ancient_reincarnation'));
        assert.deepEqual(await page.evaluate(() => ({
            selected:selectedRebirthBody,pending:game.pendingRebirth.bodyId
        })),{selected:'peasant',pending:'peasant'});
        await page.evaluate(() => {
            game.pendingRebirth.bodyId='ancient_reincarnation';
            selectedRebirthBody='ancient_reincarnation';
            saveGame();
        });
        await page.reload();
        const beforeClosed = await page.evaluate(() => ({
            rebirths:game.prestige.totalRebirths,realm:game.realmIndex,sub:game.subLevel,
            karma:game.prestige.karma,spent:game.prestige.karmaSpent,body:game.prestige.lastBody,
            pending:game.pendingRebirth.bodyId,root:game.spiritualRoot.id
        }));
        await click(page.locator('#rebirth-modal button[onclick="performRebirth()"]'));
        assert.deepEqual(await page.evaluate(() => ({
            rebirths:game.prestige.totalRebirths,realm:game.realmIndex,sub:game.subLevel,
            karma:game.prestige.karma,spent:game.prestige.karmaSpent,body:game.prestige.lastBody,
            pending:game.pendingRebirth.bodyId,root:game.spiritualRoot.id
        })),beforeClosed);
        assert.equal(await page.locator('#rebirth-modal').evaluate(el=>el.classList.contains('active')),true);
        assert.equal(await page.locator('#root-modal').evaluate(el=>el.classList.contains('active')),false);
        console.log('PASS Закрытое тело нельзя выбрать или применить из подменённого сохранённого pending; модалка остаётся');

        await page.evaluate(() => {
            game.stop();
            document.querySelectorAll('.modal-overlay.active').forEach(el => el.classList.remove('active'));
            game.reset(); game.stop();
            game.prestige.totalRebirths=10; game.prestige.lastBody='ancient_reincarnation';
            game.prestige.bodyAscensions={ancient_reincarnation:1};
            game.prestige.permanentMilestones=[]; game._minRootTier=null;
            game.spiritualRoot=null; game.pendingRebirth=null; game.spirit=10; game.strength=10;
            showSpiritualRootModal();
        });
        assert.equal(await page.evaluate(() => game.getMinRootTier()),'epic');
        assert.deepEqual(await page.evaluate(() => game.getAvailableRoots().map(root=>root.id)),['spirit_body']);
        assert.equal(await page.locator('.root-card[onclick="selectRootUI(\'common\')"]').count(),0);
        await page.evaluate(() => {selectRootUI('common');acceptRoot('common');});
        assert.deepEqual(await page.evaluate(() => ({
            root:game.spiritualRoot,spirit:game.spirit,strength:game.strength
        })),{root:null,spirit:10,strength:10});
        assert.equal(await page.locator('#root-modal').evaluate(el=>el.classList.contains('active')),true);
        await click(page.locator('.root-card[onclick="selectRootUI(\'spirit_body\')"]'));
        assert.equal(await page.locator('#btn-accept-root').isVisible(),true);
        await click(page.locator('#btn-accept-root'));
        const accepted = await page.evaluate(() => {
            game.stop();
            return {root:game.spiritualRoot.id,spirit:game.spirit,strength:game.strength};
        });
        assert.deepEqual(accepted,{root:'spirit_body',spirit:13,strength:11});
        await page.evaluate(() => {acceptRoot('spirit_body');acceptRoot('common');showSpiritualRootModal();});
        assert.deepEqual(await page.evaluate(() => ({
            root:game.spiritualRoot.id,spirit:game.spirit,strength:game.strength
        })),accepted);
        assert.equal(await page.locator('#root-modal').evaluate(el=>el.classList.contains('active')),false);
        console.log('PASS Минимум epic скрывает и отвергает common; принятие Духовного Тела даёт статы один раз');

        assert.deepEqual(errors,[]);
        console.log('5 браузерных сценариев прошли, 0 ошибок страницы');
    } finally {
        await browser.close();
    }
})().catch(error=>{console.error(error);process.exitCode=1;});
