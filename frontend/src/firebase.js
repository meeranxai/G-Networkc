import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyD8Sg8rBwkCS4BYwgVrb_V_KQ4eMd0PkZ0",
    authDomain: "g-network-community.firebaseapp.com",
    projectId: "g-network-community",
    storageBucket: "g-network-community.firebasestorage.app",
    messagingSenderId: "358032029950",
    appId: "1:358032029950:web:a8dc470de9d85ead240daf"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
console.log("🔥 Firebase Initialized in React");

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export default app;
