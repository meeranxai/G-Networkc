import React, { createContext, useState, useEffect, useContext } from 'react';
import { API_BASE_URL } from '../api/config';
import { auth } from '../firebase';
import { onAuthStateChanged, getRedirectResult } from 'firebase/auth';
import { mockFetch } from '../api/mockBackend';

const AuthContext = createContext();

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        console.error('❌ useAuth called outside AuthProvider. Make sure component is wrapped with AuthProvider.');
        // Return default values instead of throwing to prevent destructuring errors
        return { currentUser: null, loading: true };
    }
    return context;
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authInitialized, setAuthInitialized] = useState(false);

    useEffect(() => {
        console.log("🔑 Initializing Auth Listener...");
        
        // Check if Firebase auth is properly initialized
        if (!auth) {
            console.error("❌ Firebase auth is not initialized");
            setLoading(false);
            return;
        }

        let isMounted = true;
        let redirectCheckDone = false;

        // Add a timeout to ensure auth initializes
        const initTimeout = setTimeout(() => {
            if (!authInitialized && isMounted) {
                console.log("⏰ Auth initialization timeout, setting as initialized");
                setAuthInitialized(true);
                if (!auth.currentUser) {
                    setLoading(false);
                }
            }
        }, 3000);

        // 1. Listen for auth state changes immediately
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!isMounted) return;

            console.log("🔄 Auth State Changed:", user ? `Logged in as ${user.email}` : "Logged out");
            setAuthInitialized(true);
            
            if (user) {
                setCurrentUser(user);
                setLoading(false);

                try {
                    console.log("Syncing user with backend...");
                    
                    // Use mock backend for now
                    const res = await mockFetch(`${API_BASE_URL}/api/users/sync`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            firebaseUid: user.uid,
                            email: user.email,
                            displayName: user.displayName || 'New User',
                            photoURL: user.photoURL
                        })
                    });

                    if (res.ok) {
                        console.log("✅ User Synced with Backend");
                    } else {
                        const errorData = await res.json().catch(() => ({}));
                        console.error("❌ Sync Error:", res.status, errorData);
                    }
                } catch (err) {
                    console.error("❌ Failed to sync user:", err);
                }
            } else {
                setCurrentUser(null);
                // Only set loading false if we're not waiting for a redirect result
                if (redirectCheckDone) {
                    setLoading(false);
                }
            }
        });

        // 2. Check for redirect results in the background
        const checkRedirect = async () => {
            try {
                console.log("🔍 Checking for redirect result...");
                const result = await getRedirectResult(auth);
                if (result && isMounted) {
                    console.log("✅ Redirect result captured:", result.user.email);
                    setCurrentUser(result.user);
                }
            } catch (err) {
                console.error("❌ Global Redirect Error:", err);
            } finally {
                redirectCheckDone = true;
                // If we're logged out, now we can safely stop loading
                if (isMounted && !auth.currentUser) {
                    setLoading(false);
                }
            }
        };

        checkRedirect();

        return () => {
            isMounted = false;
            clearTimeout(initTimeout);
            unsubscribe();
        };
    }, [authInitialized]);

    const value = {
        currentUser,
        loading
    };

    console.log("🔑 AuthContext value:", { currentUser: !!currentUser, loading });

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
