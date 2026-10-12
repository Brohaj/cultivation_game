// Подсказки живут вне прокручиваемых панелей и всегда помещаются в окне.
(() => {
    let layer, owner, source, previousDescription;
    const selectors = ".stat-tip, .header-tip, .currency-tip";
    function findSource(target) {
        if (!(target instanceof Element)) return null;
        let anchor = target.closest(".stat-with-tip, .header-with-tip, .currency-with-tip");
        while (anchor) {
            const tip = anchor.querySelector(selectors);
            if (tip?.textContent.trim()) return { anchor, tip };
            anchor = anchor.parentElement?.closest(".stat-with-tip, .header-with-tip, .currency-with-tip");
        }
        return null;
    }
    function hide() {
        if (!layer) return;
        layer.hidden = true;
        if (owner?.isConnected) {
            if (previousDescription) owner.setAttribute("aria-describedby", previousDescription);
            else owner.removeAttribute("aria-describedby");
        }
        owner = source = null;
    }
    function render() {
        if (!owner?.isConnected || !source?.isConnected || !owner.getClientRects().length) return hide();
        const modal = document.querySelector(".modal-overlay.active");
        if (modal && !modal.contains(owner)) return hide();
        const blocks = [...source.querySelectorAll(".tip-flavor, .tip-mod")];
        const copy = (blocks.length ? blocks.map(node => node.textContent.trim()).join("\n") : source.textContent.trim()).replace(/\s+\|\s+/g, "\n");
        if (!copy) return hide();
        if (layer.textContent !== copy) layer.textContent = copy;
        layer.hidden = false;
        layer.dataset.inModal = modal ? "true" : "false";
        const bounds = owner.getBoundingClientRect();
        const width = layer.offsetWidth, height = layer.offsetHeight;
        const left = Math.max(8, Math.min(bounds.left, window.innerWidth - width - 8));
        const below = bounds.bottom + 8;
        const top = below + height <= window.innerHeight - 8 ? below : Math.max(8, bounds.top - height - 8);
        layer.style.left = `${left}px`;
        layer.style.top = `${Math.min(top, Math.max(8, window.innerHeight - height - 8))}px`;
    }
    function show(anchor, tip) {
        if (!layer) return;
        if (owner !== anchor) {
            hide();
            owner = anchor;
            previousDescription = owner.getAttribute("aria-describedby");
            owner.setAttribute("aria-describedby", [previousDescription, layer.id].filter(Boolean).join(" "));
        }
        source = tip;
        render();
    }
    window.refreshV2Tooltip = render;
    document.addEventListener("DOMContentLoaded", () => {
        layer = document.createElement("div");
        layer.id = "v2-floating-tooltip";
        layer.className = "v2-floating-tooltip";
        layer.setAttribute("role", "tooltip");
        layer.hidden = true;
        document.body.appendChild(layer);
        document.addEventListener("pointerover", event => {
            const match = findSource(event.target);
            if (match) show(match.anchor, match.tip);
        });
        document.addEventListener("pointerout", event => {
            if (!owner || owner.contains(event.relatedTarget) || layer.contains(event.relatedTarget)) return;
            if (owner.contains(event.target) || layer.contains(event.target)) hide();
        });
        document.addEventListener("focusin", event => {
            const match = findSource(event.target);
            if (match) show(match.anchor, match.tip);
            else hide();
        });
        document.addEventListener("focusout", event => {
            if (!owner || owner.contains(event.relatedTarget)) return;
            hide();
        });
        document.addEventListener("pointerdown", event => { if (!layer.contains(event.target)) hide(); }, true);
        document.addEventListener("click", event => {
            if (event.target.closest("button, input, select, a, summary")) return;
            const match = findSource(event.target);
            if (match) show(match.anchor, match.tip);
        });
        document.addEventListener("keydown", event => { if (event.key === "Escape") hide(); });
        document.addEventListener("scroll", event => { if (event.target !== layer) hide(); }, true);
        window.addEventListener("resize", hide);
    });
})();
