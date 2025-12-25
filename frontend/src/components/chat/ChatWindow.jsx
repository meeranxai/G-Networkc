import React, { useState } from 'react';

const ChatWindow = ({ activeChat }) => {
    const [messages, setMessages] = useState([
        { id: 1, text: 'Hello there!', sender: 'them' },
        { id: 2, text: 'Hi! How are you?', sender: 'me' }
    ]);
    const [inputText, setInputText] = useState('');

    const handleSend = () => {
        if (!inputText.trim()) return;
        setMessages([...messages, { id: Date.now(), text: inputText, sender: 'me' }]);
        setInputText('');
    };

    if (!activeChat) {
        return (
            <main className="chat-window chat-empty-state">
                <div className="welcome-content">
                    <img src="/images/logo.png" alt="G-Network" className="welcome-img" />
                    <h1>G-Network</h1>
                    <p>Select a chat to start messaging</p>
                </div>
            </main>
        );
    }

    return (
        <main className="chat-window">
            <header className="chat-header">
                <div className="chat-header-left">
                    <img id="chat-avatar" src={activeChat.avatar} alt="User" />
                    <div className="chat-info">
                        <h3 id="chat-name">{activeChat.name}</h3>
                        <span className="chat-status">online</span>
                    </div>
                </div>
                <div className="chat-header-right">
                    <button className="icon-btn"><i className="fas fa-search"></i></button>
                    <button className="icon-btn"><i className="fas fa-ellipsis-v"></i></button>
                </div>
            </header>

            <div className="messages-container">
                {messages.map(msg => (
                    <div key={msg.id} className={`message ${msg.sender === 'me' ? 'outgoing' : 'incoming'}`}>
                        <div className="message-content">
                            {msg.text}
                            <span className="msg-time">10:05 AM</span>
                        </div>
                    </div>
                ))}
            </div>

            <footer className="chat-footer">
                <button className="icon-btn"><i className="far fa-smile"></i></button>
                <div className="message-input-container">
                    <input
                        type="text"
                        placeholder="Type a message"
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && handleSend()}
                    />
                </div>
                <button className="icon-btn" onClick={handleSend}>
                    <i className="fas fa-paper-plane"></i>
                </button>
            </footer>
        </main>
    );
};

export default ChatWindow;
