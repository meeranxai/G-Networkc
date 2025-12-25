import React, { useState } from 'react';

const ChatSidebar = ({ activeChatId, onSelectChat }) => {
    // Placeholder contacts
    const [contacts] = useState([
        { id: '1', name: 'Tech Support', lastMessage: 'How can I help you?', time: '10:00 AM', avatar: '/images/default-avatar.png' },
        { id: '2', name: 'Alice', lastMessage: 'See you later', time: 'Yesterday', avatar: '/images/default-avatar.png' },
    ]);

    return (
        <aside className="sidebar">
            <header className="sidebar-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div className="user-profile">
                        <img id="user-avatar" src="/images/default-avatar.png" alt="User" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                    </div>
                </div>
                <div className="header-actions">
                    <button className="icon-btn" title="New Chat"><i className="fas fa-comment-alt"></i></button>
                    <button className="icon-btn" title="Menu"><i className="fas fa-ellipsis-v"></i></button>
                </div>
            </header>

            <div className="search-container">
                <div className="search-box">
                    <i className="fas fa-search" id="search-icon"></i>
                    <input type="text" placeholder="Search or start new chat" id="search-input" />
                </div>
            </div>

            <div className="tabs-container">
                <div className="tab active" data-tab="chats">
                    <i className="fas fa-comment"></i> Chats
                </div>
                <div className="tab" data-tab="online">
                    <i className="fas fa-user-friends"></i> Online
                </div>
            </div>

            <div className="chats-list">
                {contacts.map(contact => (
                    <div
                        key={contact.id}
                        className={`chat-item ${activeChatId === contact.id ? 'active' : ''}`}
                        onClick={() => onSelectChat(contact)}
                    >
                        <img src={contact.avatar} alt={contact.name} />
                        <div className="chat-item-info">
                            <div className="chat-item-name">
                                {contact.name}
                                <span className="chat-time">{contact.time}</span>
                            </div>
                            <div className="chat-item-message">
                                {contact.lastMessage}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </aside>
    );
};

export default ChatSidebar;
