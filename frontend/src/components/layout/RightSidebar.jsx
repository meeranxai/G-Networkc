import React from 'react';

const RightSidebar = () => {
    return (
        <aside className="sidebar-right">
            <div className="trending-box glass-blur">
                <h3>Discovery Trends</h3>
                <div id="trending-list">
                    <div className="empty-notif" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                        <p>Loading trends...</p>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default RightSidebar;
