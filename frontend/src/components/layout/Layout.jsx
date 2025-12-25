import React from 'react';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import MobileNav from './MobileNav';
import { Outlet } from 'react-router-dom';

const Layout = () => {
    return (
        <React.Fragment>
            <div className="app-layout">
                <LeftSidebar />

                {/* Main Content Area */}
                <Outlet />

                <RightSidebar />
            </div>

            {/* Mobile Nav */}
            <MobileNav />

            {/* Global Toast Container */}
            <div id="toast-container" className="toast-container"></div>
        </React.Fragment>
    );
};

export default Layout;
