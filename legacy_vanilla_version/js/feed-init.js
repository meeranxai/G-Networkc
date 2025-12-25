
import { auth } from './firebase.js';

document.addEventListener("DOMContentLoaded", () => {
    // Auth Listener
    auth.onAuthStateChanged((user) => {
        if (!user) {
            // Redirect if not logged in (Optional, but good for social focus)
            // window.location.href = './login.html'; 
            console.log("No user logged in to Feed");
        } else {
            console.log("Logged in user for Feed:", user.displayName);
            // Update user UI items if needed
            const avatarContainers = document.querySelectorAll('.user-avatar-sm');
            avatarContainers.forEach(img => {
                img.src = user.photoURL || './images/default-avatar.png';
            });

            const nameDisplay = document.querySelector('.user-name-small');
            if (nameDisplay) nameDisplay.textContent = user.displayName || user.email.split('@')[0];
        }
    });

    // Phase 4: Data Consistency Listener
    const updateChannel = new BroadcastChannel('user_updates');
    updateChannel.onmessage = (event) => {
        if (event.data.type === 'PROFILE_UPDATE') {
            const user = event.data.user;
            console.log("Received profile update:", user);

            // Update Feed UI
            const avatarContainers = document.querySelectorAll('.user-avatar-sm');
            avatarContainers.forEach(img => {
                // Ensure we handle absolute/relative paths correctly
                const src = user.photoURL || './images/default-avatar.png';
                img.src = src.startsWith('http') ? src : (window.location.origin + src);
            });

            const nameDisplay = document.querySelector('.user-name-small');
            if (nameDisplay) nameDisplay.textContent = user.displayName;
        }
    };

    // PWA Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .then(req => console.log('Service Worker Registered'))
                .catch(err => console.log('Service Worker Error', err));
        });
    }
});
