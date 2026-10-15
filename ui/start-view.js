// Прямая ссылка на раздел; состояние загружает обычный initGame.
// Подключён после ui/init.js, поэтому обработчик выполняется после восстановления сейва.
document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get("view") || params.get("demo");
    if (game.gameOver || game.pendingRebirth) return;
    if (view === "disciples" || view === "sect") switchTab("sect");
    if (view === "expeditions") switchTab("expeditions");
});
