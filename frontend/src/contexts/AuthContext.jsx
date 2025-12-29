import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import { API_BASE_URL } from '../api/config';
import { auth } from '../firebase';
import { onAuthStateChanged, getRedirectResult } from 'firebase/auth';

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
    const [userActivity, setUserActivity] = useState({
        isActive: false,
        lastActivity: null,
        sessionStart: null
    });

    // Refs for cleanup and preventing memory leaks
    const activityTimeoutRef = useRef(null);
    const updateTimeoutRef = useRef(null);
    const eventListenersRef = useRef([]);
    const isMountedRef = useRef(true);

    // Debounced activity update to prevent excessive API calls
    const debouncedActivityUpdate = useCallback((activityData) => {
        if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
        }
        
        updateTimeoutRef.current = setTimeout(() => {
            if (!isMountedRef.current || !currentUser) return;
            
            fetch(`${API_BASE_URL}/api/users/activity`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firebaseUid: currentUser.uid,
                    ...activityData
                })
            }).catch(err => console.error('Activity update failed:', err));
        }, 1000); // 1 second debounce
    }, [currentUser]);

    // Activity tracking with cleanup
    useEffect(() => {
        if (!currentUser || !isMountedRef.current) return;

        const updateActivity = () => {
            if (!isMountedRef.current) return;
            
            const now = new Date();
            setUserActivity(prev => ({
                ...prev,
                isActive: true,
                lastActivity: now
            }));

            // Debounced backend update
            debouncedActivityUpdate({
                lastActivity: now,
                isActive: true
            });
        };

        const handleActivity = () => {
            updateActivity();
        };

        // Track user activity with passive listeners for better performance
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        const eventOptions = { passive: true, capture: true };
        
        events.forEach(event => {
            document.addEventListener(event, handleActivity, eventOptions);
            eventListenersRef.current.push({ event, handler: handleActivity, options: eventOptions });
        });

        // Set initial activity
        updateActivity();
        setUserActivity(prev => ({
            ...prev,
            sessionStart: new Date()
        }));

        // Activity timeout (5 minutes of inactivity = inactive)
        const checkInactivity = () => {
            if (!isMountedRef.current) return;
            
            const now = new Date();
            const lastActivity = userActivity.lastActivity;
            
            if (lastActivity && (now - lastActivity) > 5 * 60 * 1000) { // 5 minutes
                setUserActivity(prev => ({
                    ...prev,
                    isActive: false
                }));

                // Send inactive status to backend
                debouncedActivityUpdate({
                    lastActivity: lastActivity,
                    isActive: false
                });
            }
        };

        activityTimeoutRef.current = setInterval(checkInactivity, 60000); // Check every minute

        return () => {
            // Cleanup event listeners
            eventListenersRef.current.forEach(({ event, handler, options }) => {
                document.removeEventListener(event, handler, options);
            });
            eventListenersRef.current = [];
            
            // Clear timeouts
            if (activityTimeoutRef.current) {
                clearInterval(activityTimeoutRef.current);
            }
            if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current);
            }
        };
    }, [currentUser, debouncedActivityUpdate]);

    useEffect(() => {
        console.log("🔑 Initializing Auth Listener...");
        
        // Check if Firebase auth is properly initialized
        if (!auth) {
            console.error("❌ Firebase auth is not initialized");
            setLoading(false);
            return;
        }

        let redirectCheckDone = false;

        // Add a timeout to ensure auth initializes
        const initTimeout = setTimeout(() => {
            if (!authInitialized && isMountedRef.current) {
                console.log("⏰ Auth initialization timeout, setting as initialized");
                setAuthInitialized(true);
                if (!auth.currentUser) {
                    setLoading(false);
                }
            }
        }, 3000);

        // 1. Listen for auth state changes immediately
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!isMountedRef.current) return;

            console.log("🔄 Auth State Changed:", user ? `Logged in as ${user.email}` : "Logged out");
            setAuthInitialized(true);
            
            if (user) {
                setCurrentUser(user);
                setLoading(false);

                try {
                    console.log("Syncing user with backend...");
                    const res = await fetch(`${API_BASE_URL}/api/users/sync`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            firebaseUid: user.uid,
                            email: user.email,
                            displayName: user.displayName || 'New User',
                            photoURL: user.photoURL,
                            isOnline: true,
                            lastSeen: new Date(),
                            sessionStart: new Date()
                        })
                    });

                    if (res.ok) {
                        console.log("✅ User Synced with Backend");
                        
                        // Initialize activity tracking
                        if (isMountedRef.current) {
                            setUserActivity({
                                isActive: true,
                                lastActivity: new Date(),
                                sessionStart: new Date()
                            });
                        }
                    } else {
                        const errorData = await res.json().catch(() => ({}));
                        console.error("❌ Sync Error:", res.status, errorData);
                    }
                } catch (err) {
                    console.error("❌ Failed to sync user:", err);
                }
            } else {
                setCurrentUser(null);
                setUserActivity({
                    isActive: false,
                    lastActivity: null,
                    sessionStart: null
                });
                
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
                if (result && isMountedRef.current) {
                    console.log("✅ Redirect result captured:", result.user.email);
                    setCurrentUser(result.user);
                }
            } catch (err) {
                console.error("❌ Global Redirect Error:", err);
            } finally {
                redirectCheckDone = true;
                // If we're logged out, now we can safely stop loading
                if (isMountedRef.current && !auth.currentUser) {
                    setLoading(false);
                }
            }
        };

        checkRedirect();

        return () => {
            clearTimeout(initTimeout);
            unsubscribe();
        };
    }, [authInitialized]);

    // Cleanup on unmount or logout
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (currentUser) {
                // Send offline status using sendBeacon for reliability
                const data = JSON.stringify({
                    firebaseUid: currentUser.uid,
                    isActive: false,
                    isOnline: false,
                    lastSeen: new Date()
                });
                
                navigator.sendBeacon(`${API_BASE_URL}/api/users/activity`, data);
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            isMountedRef.current = false;
            
            // Clear all timeouts
            if (activityTimeoutRef.current) {
                clearInterval(activityTimeoutRef.current);
            }
            if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current);
            }
            
            // Cleanup event listeners
            eventListenersRef.current.forEach(({ event, handler, options }) => {
                document.removeEventListener(event, handler, options);
            });
        };
    }, [currentUser]);

    const value = {
        currentUser,
        loading,
        userActivity
    };

    // Only log state changes in development and when they are meaningful
    useEffect(() => {
        const isDevelopment = import.meta.env.MODE === 'development';
        if (isDevelopment) {
            console.log("🔑 Auth State Updated:", { 
                currentUser: !!currentUser, 
                loading, 
                isActive: userActivity.isActive
            });
        }
    }, [currentUser, loading, userActivity.isActive]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
