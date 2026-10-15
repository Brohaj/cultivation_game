// Постоянно открытые разделы: заголовок больше не служит переключателем.
(() => {
    function openSections() {
        for (const detail of document.querySelectorAll('details')) {
            if (!detail.open) detail.open = true;
            const heading = detail.querySelector(':scope > summary');
            if (heading && heading.getAttribute('role') !== 'heading') {
                heading.setAttribute('role', 'heading');
                heading.setAttribute('aria-level', '4');
                heading.tabIndex = -1;
            }
        }
    }
    document.addEventListener('click', event => {
        if (event.target.closest('summary')) event.preventDefault();
    }, true);
    document.addEventListener('keydown', event => {
        if ((event.key === 'Enter' || event.key === ' ') && event.target.closest('summary')) event.preventDefault();
    }, true);
    document.addEventListener('DOMContentLoaded', () => {
        openSections();
        new MutationObserver(openSections).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['open'] });
    });
})();
