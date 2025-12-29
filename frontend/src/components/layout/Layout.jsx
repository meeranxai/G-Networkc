import React, { useEffect, useState } from 'react';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import MobileNav from './MobileNav';
import { Outlet, useLocation } from 'react-router-dom';
import { API_BASE_URL } from '../../api/config';
import PostViewer from '../feed/PostViewer';
import GlobalSearch from '../common/GlobalSearch';

const Layout = () => {
    const [serverStatus, setServerStatus] = useState('checking');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const location = useLocation();
    const isChatPage = location.pathname === '/chat' || location.pathname === '/messages';
    const isSettingsPage = location.pathname.includes('/settings');

    useEffect(() => {
        document.body.classList.add('social-app');
        if (isSettingsPage) {
            document.body.classList.add('settings-view');
        } else {
            document.body.classList.remove('settings-view');
        }

        // Check backend connection
        const checkConnection = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/health`);
                if (response.ok) {
                    const data = await response.json();
                    console.log('✅ Backend connected:', data.status);
                    setServerStatus('online');
                } else {
                    console.warn(`Backend health check failed with status: ${response.status}`);
                    setServerStatus('offline');
                }
            } catch (err) {
                console.error("Backend Connection Failed:", err);
                setServerStatus('offline');
            }
        };

        checkConnection();

        // Add keyboard shortcut for search (Ctrl+K or Cmd+K)
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsSearchOpen(true);
            }
            // Escape to close
            if (e.key === 'Escape' && isSearchOpen) {
                setIsSearchOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.classList.remove('social-app');
            document.body.classList.remove('settings-view');
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isSettingsPage, isSearchOpen]);

    return (
        <React.Fragment>
            {serverStatus === 'offline' && (
                <div className="offline-server-warning">
                    ⚠️ Cannot connect to Backend. API URL: {API_BASE_URL || 'Not Set'}
                </div>
            )}
            <div className={`app-layout ${isChatPage ? 'full-page-chat' : ''} ${isSettingsPage ? 'full-page-settings' : ''}`}>
                {!isChatPage && !isSettingsPage && <LeftSidebar />}

                {/* Main Content Area */}
                <div className={`main-content-wrapper ${isChatPage ? 'full-height' : ''} ${isSettingsPage ? 'full-width' : ''}`}>
                    <Outlet />
                </div>

            </div>

            {/* Mobile Nav */}
            {!isChatPage && !isSettingsPage && <MobileNav />}

            {/* Global Post Viewer Modal */}
            <PostViewer />

            {/* Global Search */}
            <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

            {/* Global Toast Container */}
            <div id="toast-container" className="toast-container"></div>
        </React.Fragment>
    );
};

export default Layout;
