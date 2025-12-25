import React from 'react';
import { NavLink } from 'react-router-dom';

const LeftSidebar = () => {
    return (
        <aside className="sidebar-left">
            <div className="social-brand">
                <h1>G-Network<span style={{ color: 'var(--primary)' }}>.</span></h1>
            </div>

            <nav className="nav-links">
                <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <i className="fas fa-home"></i> <span>Home</span>
                </NavLink>
                <NavLink to="/chat" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <i className="fas fa-comment-dots"></i> <span>G-Chat</span>
                </NavLink>
                <a href="#" className="nav-item">
                    <i className="fas fa-compass"></i> <span>Explore</span>
                </a>
                <a href="#" className="nav-item" id="notif-link">
                    <i className="fas fa-bell"></i> <span>Notifications</span>
                    <span className="unread-badge" id="notif-badge" style={{ display: 'none' }}>0</span>
                </a>
                <a href="#" className="nav-item">
                    <i className="fas fa-envelope"></i> <span>Messages</span>
                </a>
                <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <i className="fas fa-user"></i> <span>Profile</span>
                </NavLink>
            </nav>

            <button className="btn-post-main">
                <i className="fas fa-pen-nib"></i> Post
            </button>
        </aside>
    );
};

export default LeftSidebar;
