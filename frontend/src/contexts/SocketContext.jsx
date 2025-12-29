import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../api/config';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        console.error('❌ useSocket called outside SocketProvider');
        // Return safe defaults instead of throwing
        return { 
            socket: null, 
            onlineUsers: {},
            isConnected: false,
            connectionStatus: 'disconnected'
        };
    }
    return context;
};

export const SocketProvider = ({ children }) => {
    const { currentUser, userActivity } = useAuth();
    const [socket, setSocket] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState({});
    const [isConnected, setIsConnected] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('disconnected');

    useEffect(() => {
        if (!currentUser) {
            if (socket) {
                console.log('🔌 Disconnecting socket - user logged out');
                socket.disconnect();
                setSocket(null);
                setIsConnected(false);
                setConnectionStatus('disconnected');
                setOnlineUsers({});
            }
            return;
        }

        console.log('🔌 Connecting socket for user:', currentUser.email);
        setConnectionStatus('connecting');

        const newSocket = io(SOCKET_URL, {
            transports: ['websocket'],
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            timeout: 10000
        });

        newSocket.on('connect', () => {
            console.log('✅ Socket Connected:', newSocket.id);
            setIsConnected(true);
            setConnectionStatus('connected');
            
            // Announce presence with full user data
            newSocket.emit('user_online', {
                firebaseUid: currentUser.uid,
                displayName: currentUser.displayName,
                email: currentUser.email,
                photoURL: currentUser.photoURL,
                isActive: userActivity?.isActive || true,
                lastActivity: userActivity?.lastActivity || new Date(),
                sessionStart: userActivity?.sessionStart || new Date()
            });
            
            // Join personal room for notifications
            newSocket.emit('join_personal_room', currentUser.uid);
        });

        newSocket.on('disconnect', (reason) => {
            console.log('🔌 Socket Disconnected:', reason);
            setIsConnected(false);
            setConnectionStatus('disconnected');
        });

        newSocket.on('reconnect', (attemptNumber) => {
            console.log('🔄 Socket Reconnected after', attemptNumber, 'attempts');
            setIsConnected(true);
            setConnectionStatus('connected');
        });

        newSocket.on('reconnect_attempt', (attemptNumber) => {
            console.log('🔄 Socket Reconnection attempt:', attemptNumber);
            setConnectionStatus('reconnecting');
        });

        newSocket.on('reconnect_failed', () => {
            console.log('❌ Socket Reconnection failed');
            setConnectionStatus('failed');
        });

        // Handle user presence updates
        newSocket.on('user_presence_changed', (data) => {
            console.log('👤 User presence changed:', data);
            setOnlineUsers(prev => ({
                ...prev,
                [data.firebaseUid]: {
                    isOnline: data.isOnline,
                    isActive: data.isActive,
                    lastSeen: data.lastSeen,
                    displayName: data.displayName,
                    photoURL: data.photoURL
                }
            }));
        });

        // Handle online users list
        newSocket.on('online_users_list', (users) => {
            console.log('📋 Online users list received:', users.length, 'users');
            const usersMap = {};
            users.forEach(user => {
                usersMap[user.firebaseUid] = {
                    isOnline: user.isOnline,
                    isActive: user.isActive,
                    lastSeen: user.lastSeen,
                    displayName: user.displayName,
                    photoURL: user.photoURL
                };
            });
            setOnlineUsers(usersMap);
        });

        // Handle connection errors
        newSocket.on('connect_error', (error) => {
            console.error('❌ Socket Connection Error:', error);
            setConnectionStatus('error');
        });

        setSocket(newSocket);

        return () => {
            console.log('🔌 Cleaning up socket connection');
            newSocket.disconnect();
        };
    }, [currentUser]);

    // Update user activity status via socket
    useEffect(() => {
        if (socket && currentUser && userActivity) {
            socket.emit('user_activity_update', {
                firebaseUid: currentUser.uid,
                isActive: userActivity.isActive,
                lastActivity: userActivity.lastActivity
            });
        }
    }, [socket, currentUser, userActivity?.isActive, userActivity?.lastActivity]);

    const sendMessage = useCallback((chatId, recipientId, text, mediaUrl = null, mediaType = 'text', replyTo = null) => {
        if (!socket || !currentUser || !isConnected) {
            console.warn('⚠️ Cannot send message: socket not connected');
            return false;
        }

        socket.emit('send_message', {
            chatId,
            senderId: currentUser.uid,
            recipientId,
            text,
            mediaUrl,
            mediaType,
            replyTo,
            timestamp: new Date()
        });
        return true;
    }, [socket, currentUser, isConnected]);

    const sendTyping = useCallback((chatId, isTyping) => {
        if (!socket || !currentUser || !isConnected) return false;
        
        socket.emit('typing', {
            chatId,
            senderId: currentUser.uid,
            isTyping,
            timestamp: new Date()
        });
        return true;
    }, [socket, currentUser, isConnected]);

    const markRead = useCallback((chatId) => {
        if (!socket || !currentUser || !chatId || !isConnected) return false;
        
        socket.emit('mark_messages_read', {
            chatId,
            userId: currentUser.uid,
            timestamp: new Date()
        });
        
        socket.emit('clear_unread_count', {
            chatId,
            userId: currentUser.uid
        });
        return true;
    }, [socket, currentUser, isConnected]);

    const updatePresence = useCallback((status) => {
        if (!socket || !currentUser || !isConnected) return false;
        
        socket.emit('update_presence', {
            firebaseUid: currentUser.uid,
            status, // 'online', 'away', 'busy', 'offline'
            timestamp: new Date()
        });
        return true;
    }, [socket, currentUser, isConnected]);

    const value = {
        socket,
        onlineUsers,
        isConnected,
        connectionStatus,
        sendMessage,
        sendTyping,
        markRead,
        updatePresence
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};
