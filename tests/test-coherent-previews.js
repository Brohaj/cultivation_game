// Превью сроков использует настоящий рендер; награды и действия проверяются в отдельных VM.
const assert = require('node:assert/strict');
const test = require('node:test');
const {createContext} = require('./test-support');

function scenario() {
    const ctx=createContext();
    ctx.run(`
        game.stop();game.realmIndex=7;game.years=1000;game.birthYear=900;
        game.strength=200;game.spirit=200;game.luck=100;
        game.stones=10000;game.daoEssence=1000;game.artifactDust=1000;
        game.gameOver=false;game.pendingRebirth=null;
        game.activeAdventures=[];game.adventureRumors=[];game.completedAdventures=[];
        game.expeditionCompletions={spirit_forest:10,heavenly_auction:10};
        game.ascendedLocations={};game.lastAdventureReward=null;
        const previewContainer={..._testElement(),innerHTML:"",children:[],appendChild(node){this.children.push(node);}};
        document.getElementById=id=>id==="adventures-list"?previewContainer:null;
        document.createElement=()=>({className:"",innerHTML:"",textContent:""});
        deferUIRender=()=>false;
        function previewHtml(){
            previewContainer.children=[];renderAdventures();
            return previewContainer.children.map(node=>node.innerHTML).join("\\n");
        }
        function setActive(id,step,flags={}){
            game.activeAdventures=[{id,currentStep:step,stepStartYear:game.years,
                stepDuration:0,flags,awaitingChoice:true,completedSteps:[]}];
        }
        function rewardSnapshot(){
            return JSON.stringify({stones:game.stones,pills:game.pills,
                essence:game.daoEssence,dust:game.artifactDust,artifacts:game.artifacts,
                ascended:game.ascendedLocations,completed:game.completedAdventures,
                totalAdventures:game.prestige.totalAdventures});
        }
        function addDurationFixture(){
            ADVENTURES.push({
                id:"ascend_duration_fixture",name:"Проверка исследования",condition:()=>true,
                steps:[
                    {text:"Проверка",choices:[{
                        text:"Исследовать",description:"Проверка духа",check:{spirit:2},
                        success:{rewards:{stones:{min:1,max:1}}},
                        fail:{nextStep:1,effect:g=>{g.flags.durationFailed=true;}}
                    }]},
                    {text:"Другой маршрут",choices:[{text:"Закончить",description:"",success:{rewards:{}}}]}
                ]
            });
            setActive("ascend_duration_fixture",0);
        }
    `);
    return ctx;
}

test('Финал вознесения показывает 20 лет и выдаёт награду только после срока, один раз',()=>{
    const ctx=scenario();
    ctx.run('setActive("ascend_heavenly_auction",1,{bought:true});');
    assert.match(ctx.run('previewHtml()'),/adventure-choice-duration">20 лет/);
    const before=ctx.run('rewardSnapshot()');
    assert.equal(ctx.run('game.chooseAdventureOption(0,0)'),true);
    assert.equal(ctx.run('game.activeAdventures[0].stepDuration'),20);
    assert.equal(ctx.run('rewardSnapshot()'),before);
    ctx.run('game.years+=19;game.tickAdventures();');
    assert.equal(ctx.run('rewardSnapshot()'),before);
    assert.equal(ctx.run('game.activeAdventures.length'),1);
    ctx.run('game.years++;game.tickAdventures();');
    assert.equal(ctx.run('game.activeAdventures.length'),0);
    assert.equal(ctx.run('game.ascendedLocations.heavenly_auction'),1);
    const after=ctx.run('rewardSnapshot()');
    assert.notEqual(after,before);
    ctx.run('game.tickAdventures();');
    assert.equal(ctx.run('rewardSnapshot()'),after);
});

test('Явные 25 лет финала леса совпадают в превью и исполнении',()=>{
    const ctx=scenario();
    ctx.run('setActive("ascend_spirit_forest",1);');
    assert.match(ctx.run('previewHtml()'),/adventure-choice-duration">25 лет/);
    assert.equal(ctx.run('game.chooseAdventureOption(0,0)'),true);
    assert.equal(ctx.run('game.activeAdventures[0].stepDuration'),25);
    ctx.run('game.years+=24;game.tickAdventures();');
    assert.equal(ctx.run('game.activeAdventures.length'),1);
    ctx.run('game.years++;game.tickAdventures();');
    assert.equal(ctx.run('game.ascendedLocations.spirit_forest'),1);
});

test('Обычный мгновенный финал не получает исследовательскую задержку',()=>{
    const ctx=scenario();
    ctx.run('game.realmIndex=2;setActive("root_eater",1);');
    assert.doesNotMatch(ctx.run('previewHtml()'),/adventure-choice-duration/);
    assert.equal(ctx.run('game.chooseAdventureOption(0,0)'),true);
    assert.equal(ctx.run('game.activeAdventures.length'),0);
    assert.equal(ctx.run('game.completedAdventures.includes("root_eater")'),true);
});

test('Разные сроки исходов видны; провал переходит дальше мгновенно',()=>{
    const ctx=scenario();
    ctx.run('addDurationFixture();game.spirit=1;');
    const html=ctx.run('previewHtml()');
    assert.match(html,/При успехе: 20 лет · При (?:провале|неудаче): сразу/);
    assert.match(html,/adventure-check-fail[^>]*>Дух: нужно 2 · у вас 1/);
    assert.equal(ctx.run('game.chooseAdventureOption(0,0)'),true);
    assert.equal(ctx.run('game.activeAdventures[0].currentStep'),1);
    assert.equal(ctx.run('game.activeAdventures[0].awaitingChoice'),true);
    assert.equal(ctx.run('game.flags.durationFailed'),true);
});

test('Успех той же развилки ждёт показанные 20 лет без ранней награды',()=>{
    const ctx=scenario();
    ctx.run('addDurationFixture();game.spirit=2;');
    assert.match(ctx.run('previewHtml()'),/adventure-check-pass[^>]*>Дух: нужно 2 · у вас 2/);
    const before=ctx.run('game.stones');
    assert.equal(ctx.run('game.chooseAdventureOption(0,0)'),true);
    assert.equal(ctx.run('game.activeAdventures[0].stepDuration'),20);
    assert.equal(ctx.run('game.stones'),before);
    ctx.run('game.years+=20;game.tickAdventures();');
    assert.equal(ctx.run('game.activeAdventures.length'),0);
    assert.ok(ctx.run('game.stones')>before);
});

for(const closedState of ['gameOver','pendingRebirth']) {
    test('Приключения не меняют закрытую жизнь: '+closedState,()=>{
        const ctx=scenario();
        ctx.run(`game.${closedState}=${closedState==='gameOver'?'true':'{karmaEarned:17}'};
            game.adventureRumors=[{id:"ascend_spirit_forest",appearedYear:game.years}];`);
        const before=ctx.run('rewardSnapshot()');
        assert.equal(ctx.run('game.acceptAdventure("ascend_spirit_forest")'),false);
        assert.equal(ctx.run('game.activeAdventures.length'),0);
        assert.equal(ctx.run('game.adventureRumors.length'),1);
        assert.equal(ctx.run('rewardSnapshot()'),before);
        ctx.run('setActive("root_eater",1);');
        const active=ctx.run('JSON.stringify(game.activeAdventures)');
        assert.equal(ctx.run('game.chooseAdventureOption(0,0)'),false);
        assert.equal(ctx.run('game.abandonAdventure(0)'),false);
        assert.equal(ctx.run('JSON.stringify(game.activeAdventures)'),active);
        assert.equal(ctx.run('rewardSnapshot()'),before);
        assert.match(ctx.run('previewHtml()'),/onclick="chooseAdventureUI\(0, 0\)" disabled/);
        assert.match(ctx.run('previewHtml()'),/onclick="abandonAdventureUI\(0\)" disabled/);
    });
}
