import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { SOCKET_URL } from '../api/config';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export function useSocket() {
    return useContext(SocketContext);
}

export function SocketProvider({ children }) {
    const [socket, setSocket] = useState(null);
    const { currentUser } = useAuth();
    // Use proxy path /socket.io, but simpler to point to backend URL explicitly if proxy has issues with WS
    // Vite proxy handles standard http well, WS sometimes tricky. 
    // Let's rely on proxy '/socket.io' if possible, or explicit URL.
    // Explicit URL is safer for now: 'http://127.0.0.1:5000'


    useEffect(() => {
        if (currentUser) {
            const newSocket = io(SOCKET_URL);
            setSocket(newSocket);
            console.log("🔌 Socket Connected for:", currentUser.email);

            return () => newSocket.close();
        } else {
            if (socket) {
                socket.close();
                setSocket(null);
            }
        }
    }, [currentUser]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
}
