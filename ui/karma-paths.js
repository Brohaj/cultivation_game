// Настройки кармических разрешений общего интерфейса.
function renderInheritedTechniqueChoice() {
    if (!(game.prestige.karmaUpgrades.pastLifeBook >= 1) || !game.pendingRebirth) return '';
    const options = game.getInheritedTechniqueOptions(selectedRebirthBody).filter(t => t.id !== 'basic_breathing');
    const selected = game.pendingRebirth.pastLifeTechniqueId || 'basic_breathing';
    return `<div class="karma-path-tool"><b>Книга прошлых жизней</b>
        <p class="empty-msg">Одна обычная техника вместо Дыхания. Начинает с уровня 1 и исходного качества; требует подходящей стартовой ступени.</p>
        <select id="inherited-technique-choice" onchange="game.chooseInheritedTechnique(this.value, selectedRebirthBody); renderRebirthContent();">
            <option value="basic_breathing">Дыхание — работает Наследие Предков</option>
            ${options.map(t => `<option value="${t.id}" ${selected === t.id ? 'selected' : ''}>${t.name} (${ARTIFACT_TIERS[t.tier]?.name || t.tier})</option>`).join('')}
        </select></div>`;
}

let _practicePanelKey = '';
function renderPracticePlan() {
    const panel = document.getElementById('practice-plan-panel');
    if (!panel) return;
    if (!(game.prestige.karmaUpgrades.practiceSchedule >= 1)) { panel.style.display = 'none'; return; }
    panel.style.display = '';
    const lifeKey = `${game.birthYear}/${game.prestige.totalRebirths}`;
    if (panel._practiceLifeKey !== lifeKey) {
        panel._practiceLifeKey = lifeKey;
        panel._defaultPlan = {enabled: false, stat: 'strength', target: Math.ceil(game.strength + 5)};
    }
    const plan = game.practicePlan || panel._defaultPlan;
    const closedLife = !!(game.gameOver || game.pendingRebirth);
    const key = `${plan.enabled}/${plan.stat}/${plan.target}/${closedLife}`;
    if (key !== _practicePanelKey || !panel.children.length) {
        if (typeof deferUIRender === 'function' && deferUIRender(renderPracticePlan)) return;
        _practicePanelKey = key;
        panel.innerHTML = `<b>Расписание практики</b>
            <p class="empty-msg">Ци до следующего прорыва → нужное Дао → выбранная характеристика. Прорыв выполняете вы; ручная смена занятия выключает расписание.</p>
            <div class="karma-path-controls"><select id="practice-target-stat" ${closedLife ? 'disabled' : ''}>
                ${[['strength','Сила'],['spirit','Дух'],['luck','Удача']].map(([id, name]) => `<option value="${id}" ${plan.stat === id ? 'selected' : ''}>${name}</option>`).join('')}
            </select><input id="practice-target-level" type="number" min="1" max="10000" value="${plan.target}" aria-label="Цель характеристики" ${closedLife ? 'disabled' : ''}>
            <button class="btn btn-small" id="practice-plan-start" onclick="startPracticePlanUI();" ${closedLife ? 'disabled' : ''}>${plan.enabled ? 'Обновить цель' : 'Включить'}</button>
            <button class="btn btn-small btn-secondary" id="practice-plan-stop" onclick="game.stopPracticePlan();" ${!closedLife && plan.enabled ? '' : 'disabled'}>Выключить</button></div>
            <div id="practice-plan-status" class="empty-msg"></div>`;
    }
    updatePracticePlanStatus();
}

function startPracticePlanUI() {
    if (game.gameOver || game.pendingRebirth) return;
    const target = document.getElementById('practice-target-level');
    if (!target || !target.reportValidity()) return;
    game.setPracticePlan(document.getElementById('practice-target-stat').value, Number(target.value));
}

function updatePracticePlanStatus() {
    const status = document.getElementById('practice-plan-status');
    if (!status) return;
    if (game.gameOver || game.pendingRebirth) { status.textContent = 'Жизнь завершена. Расписание не работает.'; return; }
    const names = {meditation: 'медитация', body: 'закалка тела', dao: 'постижение Дао', fate: 'испытание судьбы'};
    status.textContent = game.practicePlan?.enabled ? `Сейчас: ${names[game.currentActivity]}. Цель характеристики: ${game[game.practicePlan.stat]}/${game.practicePlan.target}.` : 'Расписание выключено.';
}

function renderFormationRespec(container) {
    if (!(game.prestige.karmaUpgrades.formationRespec >= 1) || !game.selectedFormations.length) return;
    const panel = document.createElement('div');
    panel.className = 'karma-path-tool';
    if (game.flags.formationRespecUsed) {
        panel.textContent = 'Пересмотр пути использован в этой жизни.';
    } else {
        const closedLife = !!(game.pendingRebirth || game.gameOver);
        const available = CULT_FORMATIONS.filter(f => !game.isFormationSelected(f.id) && (!f.sect || game.prestige.unlockedFormations.includes(f.id)));
        panel.innerHTML = `<b>Пересмотр пути — одна замена за жизнь</b>
            <p class="empty-msg">Уровни прежней формации теряются, камни не возвращаются. Новая начинает с обычного для вашего тела уровня.</p>
            <div class="karma-path-controls"><select id="formation-replace-old" aria-label="Заменяемая формация" ${closedLife ? 'disabled' : ''}>
                ${game.selectedFormations.map(id => `<option value="${id}">${CULT_FORMATIONS.find(f => f.id === id)?.name} — ур. ${game.formations[id] || 0}</option>`).join('')}
            </select><span>→</span><select id="formation-replace-new" aria-label="Новая формация" ${closedLife ? 'disabled' : ''}>
                ${available.map(f => `<option value="${f.id}">${f.name}</option>`).join('')}
            </select><button class="btn btn-small btn-secondary" id="formation-replace-confirm" ${!available.length || closedLife ? 'disabled' : ''}
                onclick="game.replaceFormation(document.getElementById('formation-replace-old').value, document.getElementById('formation-replace-new').value); renderFormations();">Заменить с потерей уровней</button></div>`;
    }
    container.appendChild(panel);
}
