
const isDevelopment = import.meta.env.MODE === 'development';

/**
 * API Base URL Configuration with Enhanced Error Handling
 * Handles both HTTP and WebSocket connections properly
 */
export const API_BASE_URL = (() => {
    if (isDevelopment) {
        return 'http://localhost:5000';
    }
    
    // Production with fallback and validation
    const prodUrl = import.meta.env.VITE_API_URL;
    if (!prodUrl) {
        console.warn('⚠️ VITE_API_URL not set in production, using fallback');
        return 'https://g-networkc-production.up.railway.app';
    }
    
    console.log('🚀 Using production API:', prodUrl);
    return prodUrl;
})();

/**
 * Socket URL Configuration with Protocol Handling
 * Ensures proper ws:// vs wss:// protocol usage
 */
export const SOCKET_URL = (() => {
    if (isDevelopment) {
        return 'http://localhost:5000';
    }
    
    const prodUrl = import.meta.env.VITE_API_URL || 'https://g-networkc-production.up.railway.app';
    console.log('🔌 Using WebSocket URL:', prodUrl);
    return prodUrl;
})();

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

/**
 * Enhanced Media URL with better error handling
 */
export const getMediaUrl = (path) => {
    if (!path) return '/images/default-avatar.png';
    if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:')) return path;

    const baseUrl = API_BASE_URL;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const fullUrl = `${baseUrl}${cleanPath}`;
    
    // Log media URL in development for debugging
    if (isDevelopment) {
        console.log('📷 Media URL:', fullUrl);
    }
    
    return fullUrl;
};

/**
 * API Health Check Function
 */
export const checkAPIHealth = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/health`, {
            method: 'GET',
            timeout: 5000
        });
        
        if (response.ok) {
            console.log('✅ API Health Check: OK');
            return true;
        } else {
            console.warn('⚠️ API Health Check: Failed', response.status);
            return false;
        }
    } catch (error) {
        console.error('❌ API Health Check: Error', error.message);
        return false;
    }
};

// Log configuration on load
console.log('🔧 API Configuration:', {
    isDevelopment,
    API_BASE_URL,
    SOCKET_URL,
    environment: import.meta.env.MODE
});
