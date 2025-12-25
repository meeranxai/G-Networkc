// Firebase Configuration (Compat Mode)
if (typeof window.firebaseConfig === 'undefined') {
    window.firebaseConfig = {
        apiKey: "AIzaSyD8Sg8rBwkCS4BYwgVrb_V_KQ4eMd0PkZ0",
        authDomain: "g-network-community.firebaseapp.com",
        projectId: "g-network-community",
        storageBucket: "g-network-community.firebasestorage.app",
        messagingSenderId: "358032029950",
        appId: "1:358032029950:web:a8dc470de9d85ead240daf"
    };
}

// Initialize Firebase if not already initialized
if (firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
    console.log("🔥 Firebase Compat Initialized for Chat");
} else {
    firebase.app(); // if already initialized, use that one
}
