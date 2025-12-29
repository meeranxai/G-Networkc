import React from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';

const UserActivityStatus = ({ userId, showText = false, size = 'sm' }) => {
    const { onlineUsers } = useSocket();
    const { currentUser } = useAuth();
    
    // Don't show status for current user
    if (userId === currentUser?.uid) return null;
    
    const userStatus = onlineUsers[userId];
    
    if (!userStatus) return null;
    
    const getStatusInfo = () => {
        if (userStatus.isOnline && userStatus.isActive) {
            return {
                status: 'active',
                color: '#22c55e', // green
                text: 'Active now',
                dot: true
            };
        } else if (userStatus.isOnline && !userStatus.isActive) {
            return {
                status: 'away',
                color: '#f59e0b', // yellow
                text: 'Away',
                dot: true
            };
        } else if (!userStatus.isOnline && userStatus.lastSeen) {
            const lastSeen = new Date(userStatus.lastSeen);
            const now = new Date();
            const diffMinutes = Math.floor((now - lastSeen) / (1000 * 60));
            
            if (diffMinutes < 5) {
                return {
                    status: 'recent',
                    color: '#10b981', // emerald
                    text: 'Just now',
                    dot: false
                };
            } else if (diffMinutes < 60) {
                return {
                    status: 'minutes',
                    color: '#6b7280', // gray
                    text: `${diffMinutes}m ago`,
                    dot: false
                };
            } else if (diffMinutes < 1440) { // 24 hours
                const hours = Math.floor(diffMinutes / 60);
                return {
                    status: 'hours',
                    color: '#6b7280',
                    text: `${hours}h ago`,
                    dot: false
                };
            } else {
                const days = Math.floor(diffMinutes / 1440);
                return {
                    status: 'days',
                    color: '#9ca3af',
                    text: `${days}d ago`,
                    dot: false
                };
            }
        }
        
        return {
            status: 'offline',
            color: '#9ca3af', // gray
            text: 'Offline',
            dot: false
        };
    };
    
    const statusInfo = getStatusInfo();
    
    const sizeClasses = {
        xs: 'w-2 h-2',
        sm: 'w-3 h-3',
        md: 'w-4 h-4',
        lg: 'w-5 h-5'
    };
    
    const textSizeClasses = {
        xs: 'text-xs',
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base'
    };
    
    return (
        <div className="flex items-center gap-1.5">
            {statusInfo.dot && (
                <div 
                    className={`${sizeClasses[size]} rounded-full border-2 border-white`}
                    style={{ backgroundColor: statusInfo.color }}
                >
                    {statusInfo.status === 'active' && (
                        <div 
                            className="w-full h-full rounded-full animate-pulse"
                            style={{ backgroundColor: statusInfo.color }}
                        />
                    )}
                </div>
            )}
            
            {showText && (
                <span 
                    className={`${textSizeClasses[size]} font-medium`}
                    style={{ color: statusInfo.color }}
                >
                    {statusInfo.text}
                </span>
            )}
        </div>
    );
};

export default UserActivityStatus;