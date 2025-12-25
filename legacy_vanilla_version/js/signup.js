import { auth, db } from './firebase.js';
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// DOM Elements
const signupForm = document.getElementById('signup-form');
const signupBtn = document.getElementById('signup-btn');
const authMessage = document.getElementById('auth-message');
const googleBtn = document.querySelector('.google-auth');
const togglePasswordBtn = document.getElementById('toggle-password');
const passwordInput = document.getElementById('signup-password');

// --- Status Message Function ---
const showStatus = (text, isError = true) => {
    if (!authMessage) return;
    authMessage.textContent = text;
    authMessage.className = `auth-message ${isError ? 'error' : 'success'}`;
    authMessage.classList.remove('hidden');
    // Auto hide after 5 seconds
    setTimeout(() => authMessage.classList.add('hidden'), 5000);
};

// --- Password Toggle ---
if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        const icon = togglePasswordBtn.querySelector('i');
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
    });
}

// --- MAIN SIGNUP LOGIC ---
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;

        if (!username || !email || !password) {
            showStatus("Please fill in all fields.");
            return;
        }

        if (password.length < 6) {
            showStatus("Password must be at least 6 characters.");
            return;
        }

        try {
            // UI Loading
            const originalBtnText = signupBtn.innerHTML;
            signupBtn.disabled = true;
            signupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';

            // 1. Create Identity
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Update Profile (Display Name)
            await updateProfile(user, {
                displayName: username,
                photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=2563eb&color=fff`
            });

            // 3. Create Firestore Document
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                displayName: username,
                email: user.email,
                photoURL: user.photoURL,
                bio: "New to G-Network",
                role: "user",
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
                settings: {
                    theme: "light",
                    notifications: true
                }
            });

            // Success
            showStatus("Account Created! Redirecting...", false);

            setTimeout(() => {
                window.location.href = "index.html";
            }, 1000);

        } catch (error) {
            console.error("Signup Error:", error);
            signupBtn.disabled = false;
            signupBtn.innerHTML = `<span>Create Free Account</span> <i class="fas fa-user-plus"></i>`;

            let msg = "Signup failed.";
            if (error.code === 'auth/email-already-in-use') {
                msg = "Email is already registered. Please login.";
            } else if (error.code === 'auth/invalid-email') {
                msg = "Invalid email address.";
            } else if (error.code === 'auth/weak-password') {
                msg = "Password is too weak.";
            }
            showStatus(msg);
        }
    });
}

// --- GOOGLE SIGNUP ---
if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Create/Update User Doc
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                lastLogin: serverTimestamp()
            }, { merge: true });

            showStatus("Signed up with Google! Redirecting...", false);
            setTimeout(() => window.location.href = "index.html", 1000);

        } catch (error) {
            console.error("Google Signup Error:", error);
            showStatus("Google Signup Failed.");
        }
    });
}