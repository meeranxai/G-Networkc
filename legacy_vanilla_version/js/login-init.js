
import { auth } from './firebase.js';

document.addEventListener("DOMContentLoaded", () => {
    // Service Worker Registration
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .then(req => console.log('Service Worker Registered'))
                .catch(err => console.log('Service Worker Error', err));
        });
    }

    // Optional: Redirect to index if already logged in?
    // auth.onAuthStateChanged((user) => {
    //     if (user) {
    //         console.log("User already logged in, redirecting...");
    //         window.location.href = "./index.html";
    //     }
    // });
});
