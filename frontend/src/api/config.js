
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
 * API Health Check Function with Railway Wake-up Support
 */
export const checkAPIHealth = async (retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            console.log(`🔄 API Health Check attempt ${i + 1}/${retries}`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout for Railway wake-up
            
            const response = await fetch(`${API_BASE_URL}/api/health`, {
                method: 'GET',
                signal: controller.signal,
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                console.log('✅ API Health Check: OK');
                return true;
            } else {
                console.warn(`⚠️ API Health Check: Failed with status ${response.status}`);
                if (i < retries - 1) {
                    console.log('🔄 Retrying in 3 seconds (Railway may be waking up)...');
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }
        } catch (error) {
            console.error(`❌ API Health Check attempt ${i + 1}: ${error.message}`);
            if (i < retries - 1) {
                console.log('🔄 Retrying in 3 seconds (Railway may be sleeping)...');
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
    }
    
    console.error('❌ API Health Check: All attempts failed');
    return false;
};

/**
 * Wake up Railway backend if sleeping
 */
export const wakeUpBackend = async () => {
    console.log('🚀 Attempting to wake up Railway backend...');
    
    try {
        // Multiple wake-up attempts to different endpoints
        const wakeUpPromises = [
            fetch(`${API_BASE_URL}/api/health`, { method: 'GET' }),
            fetch(`${API_BASE_URL}/api/users/ping`, { method: 'GET' }),
            fetch(`${API_BASE_URL}/`, { method: 'GET' })
        ];
        
        // Wait for any response (don't care about success)
        await Promise.allSettled(wakeUpPromises);
        
        console.log('⏰ Wake-up requests sent, waiting for Railway to respond...');
        
        // Wait a bit for Railway to wake up
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Now check if it's actually awake
        return await checkAPIHealth(2);
        
    } catch (error) {
        console.error('❌ Wake-up failed:', error.message);
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
