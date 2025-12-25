
document.addEventListener("DOMContentLoaded", () => {
    // Service Worker Registration
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .then(req => console.log('Service Worker Registered'))
                .catch(err => console.log('Service Worker Error', err));
        });
    }
});
