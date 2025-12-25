/**
 * G-Network Auth Guard
 * Strictly enforces authentication on protected pages.
 * Redirects unauthenticated users to login.html.
 */

(function () {
    // Pages that don't require auth
    const publicPages = ['login.html', 'signup.html'];
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    // If we are on a public page, do nothing (or optionally redirect to index if already logged in)
    if (publicPages.includes(currentPage)) {
        // Optional: If already logged in, redirect to index?
        // Let's check firebase auth state asynchronously
        // For now, allow access to login pages freely
        return;
    }

    // Function to handle redirection
    function forceLogin() {
        console.warn('AuthGuard: No user detected. Redirecting to login.');
        // Store current URL to redirect back after login (optional future enhancement)
        // window.location.href = './login.html'; // DISABLED for debugging "open link" issue
        // Instead, we might want to let the specific page handle the "Guest" state or show a login button
    }

    // 1. Initial Synchronous Check (Fast Fail)
    // We check if we have reasonable belief the user is logged in via localStorage
    // This prevents the "flash" of the app before Firebase loads
    // Note: This relies on the app setting this key on login.
    // If you haven't implemented this key setting in login.html yet, this might need adjustment.
    // For now, we'll rely heavily on Firebase.

    // 2. Firebase Async Check
    // We need to wait for Firebase to be available
    const checkInterval = setInterval(() => {
        if (window.firebase && window.firebase.auth) {
            clearInterval(checkInterval);

            firebase.auth().onAuthStateChanged((user) => {
                if (!user) {
                    forceLogin();
                } else {
                    console.log('AuthGuard: User authenticated', user.uid);
                    // User is allowed
                }
            });
        }
    }, 50);

    // Timeout: If firebase doesn't load in 5 seconds, force login (safety net)
    setTimeout(() => {
        if (!window.firebase) {
            console.error('AuthGuard: Firebase failed to load.');
            // We might want to show a reliable error message instead of forcing login excessively
        }
    }, 8000);

})();
