// import { auth } from './firebase.js'; // REMOVED: Using global firebase compat to match login session
import ChatManager from './whatsapp-chat.js';

document.addEventListener('DOMContentLoaded', function () {
    const loading = document.getElementById('loading-screen');
    const app = document.getElementById('app-container');

    // Wait for Firebase Compat to be ready (it's loaded via script tags)
    const checkAuth = () => {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().onAuthStateChanged((user) => {
                if (user) {
                    // Only show app and hide loader if user is authenticated
                    loading.style.display = 'none';
                    app.style.display = 'flex';

                    window.currentUser = user; // Set global for other scripts like webrtc if needed
                    if (!window.chatManager) {
                        window.chatManager = new ChatManager();
                        window.chatManager.init(user.uid, {
                            uid: user.uid,
                            displayName: user.displayName || user.email.split('@')[0],
                            email: user.email,
                            photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=128C7E&color=fff`
                        });
                    }
                }
                // If !user, AuthGuard (auth-guard.js) will handle the redirect to login.html
                // We do nothing here to avoid conflicts/loops.
            });
        } else {
            setTimeout(checkAuth, 100);
        }
    };

    checkAuth();

    // Safety Timeout: If not loaded in 5 seconds, show manual login option
    setTimeout(() => {
        if (loading.style.display !== 'none') {
            console.warn("Auth check timed out.");
            loading.innerHTML = `
                <div style="text-align:center; color:white;">
                    <p>Connection taking too long or not logged in.</p>
                    <button onclick="window.location.href='./login.html'" style="padding:10px 20px; background:white; color:#2563eb; border:none; border-radius:5px; margin-top:10px; cursor:pointer;">
                        Go to Login
                    </button>
                    <button onclick="window.location.reload()" style="padding:10px 20px; background:transparent; border:1px solid white; color:white; border-radius:5px; margin-top:10px; cursor:pointer; margin-left:10px;">
                        Retry
                    </button>
                </div>
            `;
        }
    }, 5000);
});

// TEMPORARY: Unregister invalid Service Workers to fix cache issues
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (registrations) {
        for (let registration of registrations) {
            registration.unregister();
        }
        console.log('🧹 Service Workers cleared for debugging from Chat');
    });
}
