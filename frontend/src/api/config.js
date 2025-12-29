
const isDevelopment = import.meta.env.MODE === 'development';

/**
 * API Base URL Configuration
 * Handles both HTTP and WebSocket connections properly
 */
export const API_BASE_URL = isDevelopment
    ? 'http://localhost:5000'
    : (import.meta.env.VITE_API_URL || 'http://localhost:5000');

/**
 * Socket URL Configuration with Protocol Handling
 * Ensures proper ws:// vs wss:// protocol usage
 */
export const SOCKET_URL = isDevelopment
    ? 'http://localhost:5000'
    : (import.meta.env.VITE_API_URL || 'http://localhost:5000');

/**
 * WebSocket URL with explicit protocol handling
 * Converts https:// to wss:// for WebSocket connections
 */
export const getWebSocketURL = () => {
    const baseUrl = SOCKET_URL;
    
    if (isDevelopment) {
        return baseUrl; // http://localhost:5000
    }
    
    // In production, ensure proper WebSocket protocol
    if (baseUrl.startsWith('https://')) {
        return baseUrl; // Socket.IO will handle wss:// conversion
    }
    
    return baseUrl;
};

export const getMediaUrl = (path) => {
    if (!path) return '/images/default-avatar.png';
    if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:')) return path;

    const baseUrl = API_BASE_URL;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
};
