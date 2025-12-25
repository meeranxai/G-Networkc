
import { auth } from './firebase.js';

document.addEventListener("DOMContentLoaded", () => {
    // Auth Listener
    auth.onAuthStateChanged((user) => {
        if (!user) {
            // Redirect if not logged in (Optional, but good for social focus)
            // window.location.href = './login.html'; 
            console.log("No user logged in to Profile");
        } else {
            console.log("Logged in user for Profile:", user.displayName);
        }
    });

    // PWA Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .then(req => console.log('Service Worker Registered'))
                .catch(err => console.log('Service Worker Error', err));
        });
    }
});
