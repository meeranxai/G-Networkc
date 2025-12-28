// Mock Backend for Development/Testing
class MockBackend {
    constructor() {
        this.users = new Map();
        this.isOnline = true;
    }

    async syncUser(userData) {
        console.log('🔄 Mock Backend: Syncing user', userData);
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (userData.firebaseUid) {
            this.users.set(userData.firebaseUid, {
                ...userData,
                syncedAt: new Date().toISOString()
            });
        }
        
        return {
            success: true,
            message: 'User synced successfully (Mock Backend)',
            user: userData,
            timestamp: new Date().toISOString()
        };
    }

    async getUnreadCounts(uid) {
        console.log('📊 Mock Backend: Getting unread counts for', uid);
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 200));
        
        return [
            { chatId: 'chat1', count: 0 },
            { chatId: 'chat2', count: 0 }
        ];
    }

    async getNotificationCount(uid) {
        console.log('🔔 Mock Backend: Getting notification count for', uid);
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 200));
        
        return { count: 0 };
    }

    async healthCheck() {
        return {
            status: 'OK',
            message: 'Mock Backend is working!',
            timestamp: new Date().toISOString(),
            platform: 'Mock Backend'
        };
    }
}

export const mockBackend = new MockBackend();

// Mock fetch function that intercepts API calls
export const mockFetch = async (url, options = {}) => {
    console.log('🔄 Mock Fetch:', url, options.method || 'GET');
    
    try {
        // Parse the URL to get the endpoint
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        
        // Health check
        if (pathname.includes('/health') || pathname.includes('/test')) {
            return {
                ok: true,
                status: 200,
                json: async () => await mockBackend.healthCheck()
            };
        }
        
        // User sync
        if (pathname.includes('/api/users/sync')) {
            const userData = options.body ? JSON.parse(options.body) : {};
            const result = await mockBackend.syncUser(userData);
            return {
                ok: true,
                status: 200,
                json: async () => result
            };
        }
        
        // Chat unread counts
        if (pathname.includes('/api/chat/unread-counts/')) {
            const uid = pathname.split('/').pop();
            const result = await mockBackend.getUnreadCounts(uid);
            return {
                ok: true,
                status: 200,
                json: async () => result
            };
        }
        
        // Notification counts
        if (pathname.includes('/api/notifications/unread-count/')) {
            const uid = pathname.split('/').pop();
            const result = await mockBackend.getNotificationCount(uid);
            return {
                ok: true,
                status: 200,
                json: async () => result
            };
        }
        
        // Default response for unhandled endpoints
        return {
            ok: true,
            status: 200,
            json: async () => ({
                message: 'Mock endpoint response',
                endpoint: pathname,
                timestamp: new Date().toISOString()
            })
        };
        
    } catch (error) {
        console.error('Mock fetch error:', error);
        return {
            ok: false,
            status: 500,
            json: async () => ({
                error: 'Mock backend error',
                message: error.message
            })
        };
    }
};