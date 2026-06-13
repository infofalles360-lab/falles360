(() => {
    const shell = document.querySelector('.dashboard-shell');
    const toggle = document.querySelector('[data-sidebar-toggle]');
    const overlay = document.querySelector('[data-sidebar-overlay]');
    const search = document.getElementById('dashboard-search');
    const searchRows = Array.from(document.querySelectorAll('[data-search-row]'));

    const closeSidebar = () => {
        shell?.classList.remove('is-sidebar-open');
        overlay?.classList.remove('is-visible');
    };

    const openSidebar = () => {
        shell?.classList.add('is-sidebar-open');
        overlay?.classList.add('is-visible');
    };

    toggle?.addEventListener('click', () => {
        if (shell?.classList.contains('is-sidebar-open')) {
            closeSidebar();
            return;
        }

        openSidebar();
    });

    overlay?.addEventListener('click', closeSidebar);

    window.addEventListener('resize', () => {
        if (window.innerWidth > 980) {
            closeSidebar();
        }
    });

    search?.addEventListener('input', () => {
        const value = search.value.trim().toLowerCase();

        searchRows.forEach((row) => {
            const haystack = (row.getAttribute('data-search-row') || '').toLowerCase();
            row.classList.toggle('is-hidden', value !== '' && !haystack.includes(value));
        });
    });
})();
