import React from 'react';
import { NavLink } from 'react-router-dom';

const MobileNav = () => {
    return (
        <nav className="bottom-nav">
            <NavLink to="/" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
                <i className="fas fa-home"></i>
            </NavLink>
            <a href="#" className="bottom-nav-item"><i className="fas fa-search"></i></a>
            <a href="#" className="bottom-nav-item" id="notif-mobile-btn">
                <i className="fas fa-bell"></i>
                <span className="unread-badge-sm" id="notif-badge-mobile" style={{ display: 'none' }}></span>
            </a>
            <NavLink to="/profile" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
                <i className="fas fa-user"></i>
            </NavLink>
        </nav>
    );
};

export default MobileNav;
