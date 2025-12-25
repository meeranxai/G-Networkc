
(function () {
    // Only run on mobile
    if (window.innerWidth > 768) return;

    // Check if we already have a FAB
    if (document.querySelector('.mobile-fab')) return;

    // Create FAB
    const fab = document.createElement('button');
    fab.className = 'mobile-fab';
    fab.innerHTML = '<i class="fas fa-pen"></i>';
    fab.setAttribute('aria-label', 'Create Post');

    // Logic to open post modal logic (simulate click on desktop button if present)
    fab.onclick = () => {
        // Trigger whatever the main post button does, usually requires logic import
        // For now, simpler: dispatch an event or alert
        const desktopBtn = document.querySelector('.btn-post-main');

        // Note: The logic for create-post might be module-scoped.
        // We might need to dispatch a custom event.
        window.dispatchEvent(new CustomEvent('open-post-modal'));
    };

    document.body.appendChild(fab);

    // Also: Listen for the custom event in create-post.js or here if we move logic
})();
