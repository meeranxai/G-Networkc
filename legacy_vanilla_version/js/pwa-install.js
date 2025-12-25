
let deferredPrompt;

document.addEventListener("DOMContentLoaded", () => {
    const installBtn = document.getElementById('btn-install-pwa');
    const mobileInstallBtn = document.getElementById('btn-install-mobile'); // Optional for mobile nav

    // Initially hide buttons
    if (installBtn) installBtn.style.display = 'none';
    if (mobileInstallBtn) mobileInstallBtn.style.display = 'none';

    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault();
        // Stash the event so it can be triggered later.
        deferredPrompt = e;

        // Show the install button
        if (installBtn) {
            installBtn.style.display = 'flex';
            installBtn.onclick = handleInstallClick;
        }
        if (mobileInstallBtn) {
            mobileInstallBtn.style.display = 'flex';
            mobileInstallBtn.onclick = handleInstallClick;
        }
    });

    window.addEventListener('appinstalled', () => {
        // Hide the app-provided install promotion
        if (installBtn) installBtn.style.display = 'none';
        if (mobileInstallBtn) mobileInstallBtn.style.display = 'none';
        deferredPrompt = null;
        console.log('PWA was installed');

        // Optional: Analytics or Toast
        if (window.NotificationManager) {
            new window.NotificationManager().showToast("App installed successfully!", "success");
        }
    });

    // Register Service Worker Globally
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
            .then(reg => {
                console.log('Service Worker Registered (Global)', reg.scope);
                // Optional: Check for updates
                reg.onupdatefound = () => {
                    const installingWorker = reg.installing;
                    installingWorker.onstatechange = () => {
                        if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New update available
                            if (confirm("New version available! Refresh now?")) {
                                window.location.reload();
                            }
                        }
                    };
                };
            })
            .catch(err => console.error('Service Worker Registration Failed', err));
    }
});

async function handleInstallClick() {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);

    // We've used the prompt, and can't use it again, throw it away
    deferredPrompt = null;
}
