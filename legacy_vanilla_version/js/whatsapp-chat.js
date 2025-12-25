// WhatsApp Web Clone - Chat Manager
import CONFIG from './config.js';
import WebrtcManager from './webrtc-call.js';

export default class ChatManager {
    constructor() {
        this.socket = io(CONFIG.SOCKET_URL);
        this.currentUser = null;
        this.userData = null;
        this.currentChatId = null;
        this.currentRecipientId = null;
        this.userCache = new Map();
        this.typingTimeout = null;

        // Initialize WebRTC
        this.webrtcManager = new WebrtcManager(this);
        this.webrtcManager.initSocketListeners(this.socket);

        this.initSocketListeners();
        this.initEventListeners();
    }

    async init(userId, userData) {
        this.currentUser = userId;
        this.userData = userData;

        // Update UI
        const userAvatar = document.getElementById('user-avatar');
        if (userAvatar) {
            userAvatar.src = userData.photoURL;
        }

        // Sync user to backend
        await fetch(`${CONFIG.API_BASE_URL}/api/users/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                firebaseUid: userId,
                displayName: userData.displayName,
                email: userData.email,
                photoURL: userData.photoURL
            })
        });

        // Emit user online
        this.socket.emit('user_online', {
            firebaseUid: userId,
            displayName: userData.displayName,
            email: userData.email,
            photoURL: userData.photoURL
        });

        // Load chats, online users and profile in parallel
        await Promise.all([
            this.loadChats(),
            this.loadOnlineUsers(),
            this.loadSelfProfile()
        ]);

        // Setup tabs and search
        this.setupTabs();
        this.setupSearch();

        // Apply saved theme and wallpaper
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
            const label = document.getElementById('current-theme-label');
            if (label) label.textContent = 'Dark';
        }

        const savedWallpaper = localStorage.getItem('chatWallpaper');
        if (savedWallpaper) {
            const container = document.getElementById('messages-container');
            if (container) container.style.backgroundColor = savedWallpaper;
        }

        // Initialize secondary features (Emoji & Voice)
        this.initEmojiPicker();
        this.initVoiceRecorder();
    }

    async loadSelfProfile() {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/users/${this.currentUser}?requesterId=${this.currentUser}`);
            const data = await response.json();
            this.userData.bio = data.bio || 'Hey there! I am using G-Network.';
            this.userData.displayName = data.displayName;

            // Update Drawer UI
            document.getElementById('profile-name-input').value = this.userData.displayName;
            document.getElementById('profile-bio-input').value = this.userData.bio;
            document.getElementById('drawer-user-avatar').src = this.userData.photoURL;

            // Update Settings UI
            const settingsName = document.getElementById('settings-user-name');
            const settingsBio = document.getElementById('settings-user-bio');
            const settingsAvatar = document.getElementById('settings-user-avatar');
            if (settingsName) settingsName.textContent = this.userData.displayName;
            if (settingsBio) settingsBio.textContent = this.userData.bio;
            if (settingsAvatar) settingsAvatar.src = this.userData.photoURL;

            // Update Privacy Selects
            if (data.privacy) {
                const aboutSelect = document.getElementById('privacy-about');
                const lastseenSelect = document.getElementById('privacy-lastseen');
                const photoSelect = document.getElementById('privacy-photo');
                if (aboutSelect) aboutSelect.value = data.privacy.about || 'everyone';
                if (lastseenSelect) lastseenSelect.value = data.privacy.lastSeen || 'everyone';
                if (photoSelect) photoSelect.value = data.privacy.profilePhoto || 'everyone';
            }

            // Sync counters
            this.updateCharCounter('profile-name-input', 'name-counter', 25);
            this.updateCharCounter('profile-bio-input', 'bio-counter', 139);
        } catch (err) {
            console.error('Error loading profile:', err);
        }
    }

    updateCharCounter(inputId, counterId, max) {
        const input = document.getElementById(inputId);
        const counter = document.getElementById(counterId);
        if (input && counter) {
            counter.textContent = max - input.value.length;
        }
    }

    initSocketListeners() {
        this.socket.on('connect', () => {
            console.log('Connected to server');
        });

        this.socket.on('receive_message', (message) => {
            if (this.currentChatId && message.chatId === this.currentChatId) {
                this.renderMessage(message);
            }
            this.loadChats(); // Update chat list
        });

        this.socket.on('message_sent', (data) => {
            if (!this.currentChatId && data.chatId) {
                this.currentChatId = data.chatId;
                this.socket.emit('join_chat', data.chatId);
            }
        });

        this.socket.on('new_group_created', (group) => {
            console.log('New group added:', group);
            this.loadChats();
        });

        this.socket.on('user_presence_changed', (data) => {
            // data: { firebaseUid, isOnline, lastSeen }

            // 1. Update list
            this.loadOnlineUsers();
            this.loadChats();

            // 2. Update active header if it's this user
            if (this.currentRecipientId === data.firebaseUid) {
                const chatStatus = document.getElementById('chat-status');
                if (chatStatus) {
                    if (data.isOnline) {
                        chatStatus.innerHTML = '<span class="status-dot"></span> Online';
                        chatStatus.classList.add('online');
                    } else {
                        chatStatus.textContent = 'Last seen ' + this.formatTime(data.lastSeen || new Date());
                        chatStatus.classList.remove('online');
                    }
                }
            }
        });

        this.socket.on('user_typing', (data) => {
            if (this.currentChatId && data.chatId === this.currentChatId && data.userId !== this.currentUser) {
                this.showTypingIndicator(data.isTyping, data.userName);
            }
        });

        this.socket.on('messages_read_update', (data) => {
            if (this.currentChatId && data.chatId === this.currentChatId) {
                this.updateAllMessagesToRead();
            }
        });

        this.socket.on('message_sent_sync', (data) => {
            if (this.currentChatId && data.chatId === this.currentChatId) {
                this.renderMessage(data.message);
            }
            this.loadChats();
        });

        this.socket.on('chat_cleared', (data) => {
            if (this.currentChatId === data.chatId) {
                document.getElementById('messages-container').innerHTML = '';
            }
            this.loadChats();
        });

        this.socket.on('chat_deleted', (data) => {
            if (this.currentChatId === data.chatId) {
                document.getElementById('active-chat').style.display = 'none';
                document.getElementById('welcome-screen').style.display = 'flex';
                this.currentChatId = null;
                this.currentRecipientId = null;
            }
            this.loadChats();
        });

        this.socket.on('error', (data) => {
            alert(data.message || 'An error occurred');
        });
    }

    updateAllMessagesToRead() {
        const statuses = document.querySelectorAll('.message.outgoing .message-status');
        statuses.forEach(s => {
            s.className = 'fas fa-check-double message-status read';
        });
    }

    initEventListeners() {
        const sendBtn = document.getElementById('send-btn');
        const messageInput = document.getElementById('message-input');

        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }

        if (messageInput) {
            let typingTimeout;
            messageInput.addEventListener('input', () => {
                this.emitTyping(true);
                clearTimeout(typingTimeout);
                typingTimeout = setTimeout(() => this.emitTyping(false), 2000);
            });
        }

        const attachBtn = document.getElementById('attach-btn');
        const fileInput = document.getElementById('file-input');

        if (attachBtn && fileInput) {
            attachBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        }

        // Media Modal Close
        const closeModal = document.getElementById('close-media');
        const mediaModal = document.getElementById('media-modal');
        if (closeModal && mediaModal) {
            closeModal.addEventListener('click', () => {
                mediaModal.style.display = 'none';
            });
            mediaModal.addEventListener('click', (e) => {
                if (e.target === mediaModal) mediaModal.style.display = 'none';
            });
        }

        // Other functional buttons
        const userAvatarBtn = document.getElementById('user-avatar');
        if (userAvatarBtn) {
            userAvatarBtn.addEventListener('click', () => this.toggleDrawer('self-profile-drawer', true));
        }

        const closeProfileBtn = document.getElementById('close-profile-drawer');
        if (closeProfileBtn) {
            closeProfileBtn.addEventListener('click', () => this.toggleDrawer('self-profile-drawer', false));
        }

        // Call Settings Setup
        this.setupSettingsListeners();

        // Group Chat Listeners
        if (createGroupBtn) {
            createGroupBtn.addEventListener('click', () => this.createGroup());
        }

        const saveProfileBtn = document.getElementById('save-profile-btn');
        if (saveProfileBtn) {
            saveProfileBtn.addEventListener('click', () => this.saveProfile());
        }


        // Profile Input Listeners (Counters)
        const nameInput = document.getElementById('profile-name-input');
        if (nameInput) {
            nameInput.addEventListener('input', () => this.updateCharCounter('profile-name-input', 'name-counter', 25));
        }

        const bioInput = document.getElementById('profile-bio-input');
        if (bioInput) {
            bioInput.addEventListener('input', () => this.updateCharCounter('profile-bio-input', 'bio-counter', 139));
        }

        // Bio Presets
        document.querySelectorAll('.preset-item').forEach(item => {
            item.addEventListener('click', () => {
                const bioInput = document.getElementById('profile-bio-input');
                if (bioInput) {
                    bioInput.value = item.textContent;
                    this.updateCharCounter('profile-bio-input', 'bio-counter', 139);
                }
            });
        });

        const chatAvatarBtn = document.getElementById('chat-avatar');
        if (chatAvatarBtn) {
            chatAvatarBtn.addEventListener('click', () => {
                if (this.currentRecipientId) {
                    this.getUserInfo(this.currentRecipientId).then(info => this.openContactInfo(info));
                }
            });
        }

        const closeContactBtn = document.getElementById('close-contact-drawer');
        if (closeContactBtn) {
            closeContactBtn.addEventListener('click', () => this.toggleDrawer('contact-info-drawer', false));
        }

        // Settings & Privacy Drawers
        const menuBtn = document.getElementById('menu-btn');
        const mainMenu = document.getElementById('main-menu');
        if (menuBtn && mainMenu) {
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                mainMenu.style.display = mainMenu.style.display === 'none' ? 'block' : 'none';
            });
            document.addEventListener('click', () => mainMenu.style.display = 'none');
        }

        const settingsBtn = document.getElementById('menu-settings');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.toggleDrawer('settings-drawer', true));
        }

        document.getElementById('close-settings-drawer').onclick = () => this.toggleDrawer('settings-drawer', false);
        document.getElementById('open-privacy-drawer').onclick = () => this.toggleDrawer('privacy-drawer', true);
        document.getElementById('close-privacy-drawer').onclick = () => this.toggleDrawer('privacy-drawer', false);

        document.getElementById('open-chats-settings').onclick = () => this.toggleDrawer('chats-drawer', true);
        document.getElementById('close-chats-drawer').onclick = () => this.toggleDrawer('chats-drawer', false);

        document.getElementById('open-notif-settings').onclick = () => this.toggleDrawer('notifications-drawer', true);
        document.getElementById('close-notifications-drawer').onclick = () => this.toggleDrawer('notifications-drawer', false);

        document.getElementById('open-help-settings').onclick = () => this.toggleDrawer('help-drawer', true);
        document.getElementById('close-help-drawer').onclick = () => this.toggleDrawer('help-drawer', false);

        const menuProfile = document.getElementById('menu-profile');
        if (menuProfile) {
            menuProfile.onclick = () => this.toggleDrawer('self-profile-drawer', true);
        }

        document.getElementById('open-profile-from-settings').onclick = () => {
            this.toggleDrawer('settings-drawer', false);
            this.toggleDrawer('self-profile-drawer', true);
        };

        // Theme and Wallpaper logic
        const themeBtn = document.getElementById('theme-toggle-btn');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => this.toggleTheme());
        }

        const wallpaperBtn = document.getElementById('wallpaper-btn');
        if (wallpaperBtn) {
            wallpaperBtn.addEventListener('click', () => this.changeWallpaper());
        }

        // Settings checkboxes logic
        const enterIsSendCheck = document.getElementById('enter-is-send');
        if (enterIsSendCheck) {
            enterIsSendCheck.checked = localStorage.getItem('enterIsSend') !== 'false';
            enterIsSendCheck.onchange = (e) => localStorage.setItem('enterIsSend', e.target.checked);
        }

        const notifSoundCheck = document.getElementById('notif-sound');
        if (notifSoundCheck) {
            notifSoundCheck.checked = localStorage.getItem('notifSound') !== 'false';
            notifSoundCheck.onchange = (e) => localStorage.setItem('notifSound', e.target.checked);
        }

        // Privacy change listeners
        ['privacy-about', 'privacy-lastseen', 'privacy-photo'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', () => this.updatePrivacy());
            }
        });

        // Other top buttons
        document.querySelectorAll('.fa-comment-alt').forEach(icon => {
            icon.parentElement.addEventListener('click', () => alert('This feature will be available in the next update!'));
        });

        // Search button in chat header
        const headerSearchBtn = document.querySelector('.chat-header-right .fa-search');
        if (headerSearchBtn) {
            headerSearchBtn.parentElement.addEventListener('click', () => {
                const searchInput = document.getElementById('search-input');
                if (searchInput) {
                    searchInput.focus();
                    searchInput.placeholder = 'Search contact or chat...';
                }
            });
        }

        // Update send message for Enter key
        // const msgInp = document.getElementById('message-input'); // Original line, now handled by messageInput
        if (messageInput) {
            // Initial state
            const sendBtn = document.getElementById('send-btn');
            const micBtn = document.getElementById('mic-btn');
            if (sendBtn && micBtn) {
                sendBtn.style.display = 'none';
                micBtn.style.display = 'flex';
            }

            // Remove existing input listener to replace it
            // messageInput.removeEventListener('input', ...); // Not strictly necessary if we just overwrite

            messageInput.addEventListener('input', (e) => {
                const hasText = e.target.value.trim().length > 0;
                if (sendBtn && micBtn) {
                    sendBtn.style.display = hasText ? 'flex' : 'none';
                    micBtn.style.display = hasText ? 'none' : 'flex';
                }
                // Original typing logic
                this.emitTyping(true);
                clearTimeout(this.typingTimeout);
                this.typingTimeout = setTimeout(() => this.emitTyping(false), 2000);
            });

            // Remove existing keypress listener to replace it
            // msgInp.removeEventListener('keypress', ...); // Not strictly necessary if we just overwrite

            messageInput.addEventListener('keypress', (e) => {
                const enterSend = localStorage.getItem('enterIsSend') !== 'false';
                if (e.key === 'Enter' && !e.shiftKey && enterSend) {
                    e.preventDefault();
                    this.sendMessage();
                    if (sendBtn && micBtn) {
                        sendBtn.style.display = 'none';
                        micBtn.style.display = 'flex';
                    }
                }
            });
        }

        // New Group logic
        const newGroupBtn = document.getElementById('menu-new-group');
        if (newGroupBtn) {
            newGroupBtn.addEventListener('click', () => {
                const modal = document.getElementById('group-modal');
                if (modal) {
                    modal.style.display = 'flex';
                    this.populateParticipantsList();
                    // Close menu
                    const menu = document.getElementById('main-menu');
                    if (menu) menu.style.display = 'none';
                }
            });
        }

        const closeGroupBtn = document.getElementById('close-group-modal');
        if (closeGroupBtn) {
            closeGroupBtn.addEventListener('click', () => {
                const modal = document.getElementById('group-modal');
                if (modal) modal.style.display = 'none';
            });
        }

        const createGrpBtn = document.getElementById('create-group-btn');
        if (createGrpBtn) {
            createGrpBtn.onclick = () => this.createGroup();
        }

        // Emoji Toggle
        const emojiBtn = document.getElementById('emoji-btn');
        if (emojiBtn) {
            emojiBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const container = document.getElementById('emoji-picker-container');
                if (container) {
                    container.style.display = container.style.display === 'none' ? 'flex' : 'none';
                }
            });
        }

        // Chat Header Menu logic
        const chatMenuBtn = document.getElementById('chat-menu-btn');
        if (chatMenuBtn) {
            chatMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const menu = document.getElementById('chat-context-menu');
                if (menu) {
                    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
                }
            });
        }

        const viewContactBtn = document.getElementById('menu-view-contact');
        if (viewContactBtn) {
            viewContactBtn.addEventListener('click', () => {
                if (this.currentRecipientId) {
                    this.getUserInfo(this.currentRecipientId).then(info => this.openContactInfo(info));
                }
                const menu = document.getElementById('chat-context-menu');
                if (menu) menu.style.display = 'none';
            });
        }

        // Global click to close modals/menus
        document.addEventListener('click', (e) => {
            const emojiContainer = document.getElementById('emoji-picker-container');
            if (emojiContainer) emojiContainer.style.display = 'none';

            const groupModal = document.getElementById('group-modal');
            if (groupModal && e.target === groupModal) {
                groupModal.style.display = 'none';
            }

            const chatMenu = document.getElementById('chat-context-menu');
            if (chatMenu && !chatMenu.contains(e.target) && e.target.id !== 'chat-menu-btn') {
                chatMenu.style.display = 'none';
            }

            const mainMenu = document.getElementById('main-menu');
            if (mainMenu && !mainMenu.contains(e.target) && e.target.id !== 'menu-btn') {
                mainMenu.style.display = 'none';
            }
        });

        const emojiContainer = document.getElementById('emoji-picker-container');
        if (emojiContainer) {
            emojiContainer.addEventListener('click', (e) => e.stopPropagation());
        }

        this.initChatMenuListeners();
    }

    initChatMenuListeners() {
        const handlers = {
            'menu-clear-chat': () => this.handleClearChat(),
            'menu-delete-chat': () => this.handleDeleteChat(),
            'menu-mute': () => this.handleMuteToggle(),
            'menu-block': () => this.handleBlockToggle(),
            'menu-export': () => this.handleExportChat(),
            'menu-shortcut': () => alert('Shortcut feature coming soon to mobile app!'),
            'menu-select-messages': () => alert('Multi-select messages coming in next update!'),
            'menu-disappearing': () => this.handleDisappearingToggle()
        };

        Object.entries(handlers).forEach(([id, handler]) => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    handler();
                    const menu = document.getElementById('chat-context-menu');
                    if (menu) menu.style.display = 'none';
                });
            }
        });
    }

    async handleClearChat() {
        if (!this.currentChatId || !confirm('Are you sure you want to clear all messages?')) return;
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/chat/${this.currentChatId}/clear`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: this.currentUser })
            });
            if (response.ok) {
                document.getElementById('messages-container').innerHTML = '';
                this.loadChats();
            }
        } catch (err) {
            console.error('Error clearing chat:', err);
        }
    }

    async handleDeleteChat() {
        if (!this.currentChatId || !confirm('Are you sure you want to delete this entire chat?')) return;
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/chat/${this.currentChatId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: this.currentUser })
            });
            if (response.ok) {
                document.getElementById('active-chat').style.display = 'none';
                document.getElementById('welcome-screen').style.display = 'flex';
                this.currentChatId = null;
                this.currentRecipientId = null;
                this.loadChats();
            }
        } catch (err) {
            console.error('Error deleting chat:', err);
        }
    }

    async handleMuteToggle() {
        if (!this.currentChatId) return;
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/chat/${this.currentChatId}/mute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: this.currentUser })
            });
            const data = await response.json();
            window.showToast(data.muted ? 'Chat Muted' : 'Chat Unmuted', 'info');
        } catch (err) {
            console.error('Error muting chat:', err);
            window.showToast('Failed to Mute Chat', 'error');
        }
    }

    async handleBlockToggle() {
        if (!this.currentRecipientId) return;
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/users/block`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: this.currentUser, targetUid: this.currentRecipientId })
            });
            const data = await response.json();
            window.showToast(data.blocked ? 'User Blocked' : 'User Unblocked', 'info');
            this.loadOnlineUsers(); // Refresh to potentially show status
        } catch (err) {
            console.error('Error blocking user:', err);
            window.showToast('Failed to Block User', 'error');
        }
    }

    async handleExportChat() {
        if (!this.currentChatId) return;
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/chat/${this.currentChatId}/messages`);
            const messages = await response.json();
            const exportText = messages.map(m => `[${new Date(m.timestamp).toLocaleString()}] ${m.senderId === this.currentUser ? 'Me' : 'Them'}: ${m.text}`).join('\n');

            const blob = new Blob([exportText], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `chat_export_${this.currentChatId}.txt`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Error exporting chat:', err);
        }
    }

    async handleDisappearingToggle() {
        if (!this.currentChatId) return;
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/chat/${this.currentChatId}/disappearing`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: this.currentUser })
            });
            const data = await response.json();
            window.showToast(data.timer > 0 ? 'Disappearing messages ON' : 'Disappearing messages OFF', 'info');
        } catch (err) {
            console.error('Error toggling disappearing messages:', err);
            window.showToast('Failed to toggle settings', 'error');
        }
    }

    initEmojiPicker() {
        const container = document.getElementById('emoji-picker-container');
        if (!container) return;

        const commonEmojis = [
            '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '🙈', '🙉', '🙊', '💋', '💌', '💘', '💝', '💖', '💗', '💓', '💞', '💕', '💟', '❣️', '💔', '❤️', '🧡', '💛', '💚', '💙', '💜', '🤎', '🖤', '🤍', '💯', '💢', '💥', '💫', '💦', '💨', '🕳️', '💣', '💬', '👁️‍🗨️', '🗨️', '🗯️', '💭', '💤', '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦵', '🦿', '🦶', '👣', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄', '🔥', '✨', '⚡', '⭐'
        ];

        commonEmojis.forEach(emoji => {
            const span = document.createElement('span');
            span.className = 'emoji-item';
            span.textContent = emoji;
            span.onclick = () => {
                const input = document.getElementById('message-input');
                if (input) {
                    const start = input.selectionStart;
                    const end = input.selectionEnd;
                    const text = input.value;
                    input.value = text.substring(0, start) + emoji + text.substring(end);
                    input.focus();
                    input.selectionStart = input.selectionEnd = start + emoji.length;
                    this.emitTyping(true);
                }
            };
            container.appendChild(span);
        });
    }

    initVoiceRecorder() {
        const micBtn = document.getElementById('mic-btn');
        const recordingUI = document.getElementById('recording-ui');
        const recordingTimer = document.getElementById('recording-timer');
        if (!micBtn) return;

        let mediaRecorder;
        let audioChunks = [];
        let timerInterval;
        let seconds = 0;

        micBtn.onclick = async () => {
            if (!mediaRecorder || mediaRecorder.state === 'inactive') {
                // Start Recording
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    mediaRecorder = new MediaRecorder(stream);
                    audioChunks = [];

                    mediaRecorder.ondataavailable = (event) => {
                        audioChunks.push(event.data);
                    };

                    mediaRecorder.onstop = async () => {
                        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                        if (seconds > 1) { // Only send if longer than 1s
                            this.uploadVoiceMessage(audioBlob);
                        }
                        stream.getTracks().forEach(track => track.stop());
                        this.toggleRecordingUI(false);
                    };

                    mediaRecorder.start();
                    this.toggleRecordingUI(true);

                    seconds = 0;
                    recordingTimer.textContent = '0:00';
                    timerInterval = setInterval(() => {
                        seconds++;
                        const min = Math.floor(seconds / 60);
                        const sec = seconds % 60;
                        recordingTimer.textContent = `${min}:${sec.toString().padStart(2, '0')}`;
                    }, 1000);

                    micBtn.classList.add('recording');
                    micBtn.innerHTML = '<i class="fas fa-stop" style="color:#ff3b30"></i>';

                } catch (err) {
                    console.error('Mic access denied:', err);
                    alert('Microphone access is required for voice messages.');
                }
            } else {
                // Stop Recording
                mediaRecorder.stop();
                clearInterval(timerInterval);
                micBtn.classList.remove('recording');
                micBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            }
        };
    }

    toggleRecordingUI(show) {
        const ui = document.getElementById('recording-ui');
        const input = document.getElementById('message-input');
        if (ui && input) {
            ui.style.display = show ? 'flex' : 'none';
            input.style.display = show ? 'none' : 'block';
        }
    }

    async uploadVoiceMessage(blob) {
        if (!this.currentRecipientId) return;

        const formData = new FormData();
        formData.append('file', blob, 'voice.webm');

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/chat/upload-media`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                const payload = {
                    chatId: this.currentChatId,
                    senderId: this.currentUser,
                    text: '[Voice Message]',
                    recipientId: this.currentRecipientId,
                    mediaUrl: data.mediaUrl,
                    mediaType: 'voice'
                };
                this.socket.emit('send_message', payload);
                this.renderMessage({
                    senderId: this.currentUser,
                    text: '[Voice Message]',
                    timestamp: new Date(),
                    mediaUrl: data.mediaUrl,
                    mediaType: 'voice'
                });
            }
        } catch (err) {
            console.error('Voice upload failed:', err);
        }
    }

    toggleTheme() {
        const isDark = document.body.classList.toggle('dark-mode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        const label = document.getElementById('current-theme-label');
        if (label) label.textContent = isDark ? 'Dark' : 'Light';
        // alert(`Theme changed to ${isDark ? 'Dark' : 'Light'} Mode! (Coming Fully Soon)`);
        window.showToast(`Theme changed to ${isDark ? 'Dark' : 'Light'}`, 'info');
    }

    changeWallpaper() {
        // Reuse existing method or this duplicate one? 
        // Note: There seem to be two changeWallpaper methods in this file based on previous views.
        // I will update this one first.
        const colors = ['#e5ddd5', '#f0f2f5', '#d9fdd3', '#cfe9ff', '#fff1c1', '#fecaca'];
        const current = localStorage.getItem('chatWallpaper') || '#e5ddd5';
        let nextIdx = (colors.indexOf(current) + 1) % colors.length;
        const nextColor = colors[nextIdx];

        const container = document.getElementById('messages-container');
        if (container) {
            container.style.backgroundColor = nextColor;
            localStorage.setItem('chatWallpaper', nextColor);
            window.showToast('Chat Wallpaper updated', 'success');
        }
    }

    toggleDrawer(id, open) {
        const drawer = document.getElementById(id);
        if (drawer) {
            if (open) drawer.classList.add('open');
            else drawer.classList.remove('open');
        }
    }

    async saveProfile() {
        const displayName = document.getElementById('profile-name-input').value.trim();
        const bio = document.getElementById('profile-bio-input').value.trim();

        if (!displayName) {
            window.showToast('Name cannot be empty', 'warning');
            return;
        }

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/users/update-profile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firebaseUid: this.currentUser,
                    displayName,
                    bio
                })
            });

            if (response.ok) {
                const updatedUser = await response.json();
                this.userData.displayName = updatedUser.displayName;
                this.userData.bio = updatedUser.bio;

                // Update header avatar
                this.loadSelfProfile();

                // Show success feedback
                const btn = document.getElementById('save-profile-btn');
                const oldText = btn.textContent;
                btn.textContent = 'Saved!';
                btn.style.background = '#25D366';
                setTimeout(() => {
                    btn.textContent = oldText;
                    btn.style.background = '';
                    this.toggleDrawer('self-profile-drawer', false);
                }, 1000);
            }
        } catch (err) {
            console.error('Error saving profile:', err);
            alert('Failed to save profile');
        }
    }

    openContactInfo(info) {
        document.getElementById('contact-drawer-avatar').src = info.photoURL || this.getDefaultAvatar(info.displayName);
        document.getElementById('contact-drawer-name').textContent = info.displayName;
        document.getElementById('contact-drawer-email').textContent = info.email || 'Private';
        document.getElementById('contact-drawer-bio').textContent = info.bio || 'Hey there! I am using G-Network.';

        this.toggleDrawer('contact-info-drawer', true);
    }

    async updatePrivacy() {
        const privacy = {
            about: document.getElementById('privacy-about').value,
            lastSeen: document.getElementById('privacy-lastseen').value,
            profilePhoto: document.getElementById('privacy-photo').value
        };

        try {
            await fetch(`${CONFIG.API_BASE_URL}/api/users/update-privacy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firebaseUid: this.currentUser,
                    privacy
                })
            });
        } catch (err) {
            console.error('Error updating privacy:', err);
        }
    }

    setupTabs() {
        const tabs = document.querySelectorAll('.tab');
        const chatsList = document.getElementById('chats-list');
        const onlineList = document.getElementById('online-users-list');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                const target = tab.dataset.tab;
                if (target === 'chats') {
                    chatsList.style.display = 'block';
                    onlineList.style.display = 'none';
                    this.loadChats();
                } else {
                    chatsList.style.display = 'none';
                    onlineList.style.display = 'block';
                    this.loadOnlineUsers();
                }
            });
        });
    }

    setupSearch() {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', async (e) => {
                const term = e.target.value.toLowerCase();
                const chatsList = document.getElementById('chats-list');

                // 1. Filter existing chats locally
                const items = document.querySelectorAll('.chat-item');
                let hasLocalMatch = false;
                items.forEach(item => {
                    const name = item.querySelector('.chat-item-name').textContent.toLowerCase();
                    if (name.includes(term)) {
                        item.style.display = 'flex';
                        hasLocalMatch = true;
                    } else {
                        item.style.display = 'none';
                    }
                });

                // 2. If short term, stop
                if (term.length < 3) return;

                // 3. Search Global Directory (Optimization: debounce this in real app)
                if (!hasLocalMatch) {
                    try {
                        // Show temp loading
                        // chatsList.innerHTML += '...searching users...'; 

                        const response = await fetch(`${CONFIG.API_BASE_URL}/api/users/search/${term}?requesterId=${this.currentUser}`);
                        const users = await response.json();

                        // Remove previous search results
                        const oldResults = document.querySelectorAll('.search-result-item');
                        oldResults.forEach(el => el.remove());

                        if (users.length > 0) {
                            const header = document.createElement('div');
                            header.className = 'search-result-item preset-header';
                            header.textContent = 'Global Search Results';
                            chatsList.appendChild(header);

                            users.forEach(user => {
                                if (user.firebaseUid === this.currentUser) return;

                                const div = document.createElement('div');
                                div.className = 'chat-item search-result-item';
                                div.innerHTML = `
                                    <img src="${user.photoURL || this.getDefaultAvatar(user.displayName)}" alt="${user.displayName}">
                                    <div class="chat-item-info">
                                        <div class="chat-item-name">${user.displayName}</div>
                                        <div class="chat-item-message">${user.bio || 'New User'}</div>
                                    </div>
                                 `;
                                div.addEventListener('click', () => this.startChatWithUser(user));
                                chatsList.appendChild(div);
                            });
                        }
                    } catch (err) {
                        console.error('Search error:', err);
                    }
                } else {
                    // Remove search results if we have local matches to avoid clutter, or keep them?
                    // For now, clear global results when filtering locally matches
                    const oldResults = document.querySelectorAll('.search-result-item');
                    oldResults.forEach(el => el.remove());
                }
            });
        }
    }

    async loadOnlineUsers() {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/users/online?requesterId=${this.currentUser}`);
            const users = await response.json();

            const onlineList = document.getElementById('online-users-list');
            const onlineCount = document.getElementById('online-count');

            if (onlineCount) onlineCount.textContent = users.length;
            if (!onlineList) return;

            onlineList.innerHTML = '';

            const filteredUsers = users.filter(u => u.firebaseUid !== this.currentUser);

            if (filteredUsers.length === 0) {
                onlineList.innerHTML = '<div style="text-align:center;padding:20px;color:#667781;">No other users online</div>';
                return;
            }

            filteredUsers.forEach(user => {
                const userItem = document.createElement('div');
                userItem.className = 'online-user-item';

                const avatar = user.photoURL || this.getDefaultAvatar(user.displayName);

                userItem.innerHTML = `
                    <div style="position:relative;">
                        <img src="${avatar}" alt="${user.displayName}">
                        <div class="online-indicator"></div>
                    </div>
                    <div class="online-user-info">
                        <h4>${user.displayName}</h4>
                        <p>Available</p>
                    </div>
                `;

                userItem.addEventListener('click', () => {
                    this.startChatWithUser(user);
                });

                onlineList.appendChild(userItem);
            });
        } catch (err) {
            console.error('Error loading online users:', err);
        }
    }

    async startChatWithUser(user) {
        // Find existing chat or start new one
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/chat/history/${this.currentUser}`);
            const chats = await response.json();

            const existingChat = chats.find(c => c.participants.includes(user.firebaseUid));

            if (existingChat) {
                this.openChat(existingChat._id, user.firebaseUid, user);
            } else {
                // New chat UI state
                this.currentChatId = null;
                this.currentRecipientId = user.firebaseUid;

                document.getElementById('welcome-screen').style.display = 'none';
                document.getElementById('active-chat').style.display = 'flex';

                document.getElementById('chat-avatar').src = user.photoURL || this.getDefaultAvatar(user.displayName);
                document.getElementById('chat-name').textContent = user.displayName;
                document.getElementById('chat-status').textContent = 'online';

                document.getElementById('messages-container').innerHTML = `
                    <div style="text-align:center;padding:40px;color:#94a3b8;">
                        <p>Start a new conversation with ${user.displayName}</p>
                    </div>
                `;
            }

            // Switch back to chats tab
            document.querySelector('[data-tab="chats"]').click();
        } catch (err) {
            console.error('Error starting chat:', err);
        }
    }

    emitTyping(isTyping) {
        if (!this.currentChatId || !this.currentRecipientId) return;

        this.socket.emit('typing', {
            chatId: this.currentChatId,
            userId: this.currentUser,
            userName: this.userData.displayName,
            recipientId: this.currentRecipientId,
            isTyping: isTyping
        });
    }

    showTypingIndicator(isTyping, userName) {
        const chatStatus = document.getElementById('chat-status');
        if (chatStatus) {
            if (isTyping) {
                chatStatus.textContent = 'typing...';
                chatStatus.style.color = 'var(--accent)';
            } else {
                chatStatus.textContent = 'online';
                chatStatus.style.color = '';
            }
        }
    }

    async loadChats() {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/chat/history/${this.currentUser}`);
            const chats = await response.json();

            const chatsList = document.getElementById('chats-list');
            if (!chatsList) return;
            chatsList.innerHTML = '';

            if (chats.length === 0) {
                chatsList.innerHTML = '<div style="text-align:center;padding:20px;color:#667781;">No chats yet</div>';
                return;
            }

            for (const chat of chats) {
                let chatName, chatAvatar, otherUserId;

                if (chat.isGroup) {
                    chatName = chat.groupName;
                    chatAvatar = chat.groupAvatar || this.getDefaultAvatar(chatName);
                    otherUserId = null; // Groups don't have a single "other" user
                } else {
                    otherUserId = chat.participants.find(id => id !== this.currentUser);
                    const userInfo = await this.getUserInfo(otherUserId);
                    chatName = userInfo.displayName;
                    chatAvatar = userInfo.photoURL || this.getDefaultAvatar(chatName);
                }

                const chatItem = document.createElement('div');
                chatItem.className = 'chat-item';
                if (this.currentChatId === chat._id) {
                    chatItem.classList.add('active');
                }

                const time = this.formatTime(chat.updatedAt || chat.lastMessageAt);

                chatItem.innerHTML = `
                    <img src="${chatAvatar}" alt="${chatName}">
                    <div class="chat-item-info">
                        <div class="chat-item-top">
                            <span class="chat-item-name">${chatName}</span>
                            <span class="chat-item-time">${time}</span>
                        </div>
                        </div>
                        <div class="chat-item-message">
                            ${chat.lastMessage || 'Click to start chatting'}
                            ${(chat.unreadCount && chat.unreadCount > 0) ? `<span class="unread-badge">${chat.unreadCount}</span>` : ''}
                        </div>
                    </div>
                `;

                chatItem.addEventListener('click', () => {
                    if (chat.isGroup) {
                        this.openChat(chat._id, null, { displayName: chat.groupName, photoURL: chat.groupAvatar, isGroup: true, participants: chat.participants });
                    } else {
                        this.openChat(chat._id, otherUserId, null);
                    }
                    // Optimistically clear badge
                    const badge = chatItem.querySelector('.unread-badge');
                    if (badge) badge.remove();
                });

                chatsList.appendChild(chatItem);
            }
        } catch (err) {
            console.error('Error loading chats:', err);
        }
    }

    async openChat(chatId, userId, userInfo) {
        this.currentChatId = chatId;
        this.currentRecipientId = userId; // null for groups

        // Join room
        this.socket.emit('join_chat', chatId);

        // Mark as read API
        fetch(`${CONFIG.API_BASE_URL}/api/chat/${chatId}/read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: this.currentUser })
        }).catch(err => console.error("Error marking read:", err));

        // Update UI
        document.getElementById('welcome-screen').style.display = 'none';
        document.getElementById('active-chat').style.display = 'flex';

        const chatAvatar = document.getElementById('chat-avatar');
        const chatName = document.getElementById('chat-name');
        const chatStatus = document.getElementById('chat-status');

        if (userInfo && userInfo.isGroup) {
            chatAvatar.src = userInfo.photoURL || this.getDefaultAvatar(userInfo.displayName);
            chatName.textContent = userInfo.displayName;
            // Calculate online members or just show participants
            chatStatus.textContent = `${userInfo.participants.length} participants`;
            chatStatus.style.color = 'var(--text-muted)';
        } else {
            // Individual user
            let user = userInfo;
            if (!user && userId) {
                user = await this.getUserInfo(userId);
            }

            if (user) {
                chatAvatar.src = user.photoURL || this.getDefaultAvatar(user.displayName);
                chatName.textContent = user.displayName;

                // Online Status Logic
                if (user.isOnline) {
                    chatStatus.innerHTML = '<span class="status-dot"></span> Online';
                    chatStatus.classList.add('online');
                } else {
                    chatStatus.textContent = 'Last seen ' + (user.lastSeen ? this.formatTime(user.lastSeen) : 'recently');
                    chatStatus.classList.remove('online');
                }
            }
        }

        // Load messages
        await this.loadMessages(chatId);

        // Mark as read
        this.socket.emit('mark_messages_read', { chatId, userId: this.currentUser });
        this.socket.emit('clear_unread_count', { chatId, userId: this.currentUser });

        // Update chat list
        this.loadChats();
    }

    async loadMessages(chatId) {
        const container = document.getElementById('messages-container');
        if (!container) return;
        container.innerHTML = '';

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/chat/${chatId}/messages`);
            const messages = await response.json();

            messages.forEach(msg => this.renderMessage(msg, (msg === messages[0])));

            container.scrollTop = container.scrollHeight;
        } catch (err) {
            console.error('Error loading messages:', err);
        }
    }

    renderMessage(message, isFirst = false) {
        const container = document.getElementById('messages-container');
        if (!container) return;
        const isOwn = message.senderId === this.currentUser;

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isOwn ? 'outgoing' : 'incoming'}`;

        const time = this.formatTime(message.timestamp);

        let statusIcon = 'fa-check';
        let statusClass = '';

        if (isOwn) {
            if (message.read) {
                statusIcon = 'fa-check-double';
                statusClass = 'read';
            } else if (message.delivered) {
                statusIcon = 'fa-check-double';
                statusClass = 'delivered';
            }
        }

        const status = isOwn ? `<i class="fas ${statusIcon} message-status ${statusClass}"></i>` : '';

        const hasImage = message.mediaUrl && (message.mediaType === 'image' || message.text === '[Image]');
        const hasVoice = message.mediaUrl && message.mediaType === 'voice';

        // Message HTML Structure
        messageDiv.innerHTML = `
            <div class="message-content ${hasImage ? 'has-image' : ''} ${hasVoice ? 'has-voice' : ''}" data-msg-id="${message._id || message.tempId}">
                <!-- Reply Block -->
                ${message.replyTo ? `
                    <div class="message-reply-preview">
                        <div class="reply-line"></div>
                        <div class="reply-content">
                            <span class="reply-sender">${message.replyTo.senderId === this.currentUser ? 'You' : 'Them'}</span>
                            <span class="reply-text">
                                ${message.replyTo.mediaType === 'image' ? '<i class="fas fa-camera"></i> Photo' :
                    message.replyTo.mediaType === 'voice' ? '<i class="fas fa-microphone"></i> Voice Message' :
                        this.escapeHtml(message.replyTo.text)}
                            </span>
                        </div>
                    </div>
                ` : ''}

                ${hasImage ? `<img src="${CONFIG.API_BASE_URL}${message.mediaUrl}" class="message-image" alt="Image">` : ''}
                ${hasVoice ? `
                    <div class="voice-message-player">
                        <button class="play-btn"><i class="fas fa-play"></i></button>
                        <div class="voice-visualizer">
                            <div class="voice-progress"></div>
                        </div>
                        <audio src="${CONFIG.API_BASE_URL}${message.mediaUrl}"></audio>
                    </div>
                ` : ''}
                ${message.text && message.text !== '[Image]' && message.text !== '[Voice Message]' ? `<div class="message-text">${this.escapeHtml(message.text)}</div>` : ''}
                <div class="message-meta">
                    <span class="message-time">${time}</span>
                    ${status}
                </div>
                
                <!-- Reply Action (visible on hover) -->
                <button class="btn-reply-action" title="Reply"><i class="fas fa-reply"></i></button>
            </div>
        `;

        const contentDiv = messageDiv.querySelector('.message-content');

        // Reply Button Listener
        const replyBtn = messageDiv.querySelector('.btn-reply-action');
        if (replyBtn) {
            replyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.initiateReply(message);
            });
        }

        // Double click to reply (desktop friendly)
        contentDiv.addEventListener('dblclick', () => {
            this.initiateReply(message);
        });

        // ... existing media logic
        if (hasImage) {
            const img = messageDiv.querySelector('.message-image');
            img.addEventListener('click', () => this.showMediaModal(img.src));
        }

        if (hasVoice) {
            const player = messageDiv.querySelector('.voice-message-player');
            const audio = player.querySelector('audio');
            const btn = player.querySelector('.play-btn');
            const progress = player.querySelector('.voice-progress');

            btn.onclick = () => {
                if (audio.paused) {
                    audio.play();
                    btn.innerHTML = '<i class="fas fa-pause"></i>';
                } else {
                    audio.pause();
                    btn.innerHTML = '<i class="fas fa-play"></i>';
                }
            };


            audio.ontimeupdate = () => {
                const per = (audio.currentTime / audio.duration) * 100;
                progress.style.width = per + '%';
            };

            audio.onended = () => {
                btn.innerHTML = '<i class="fas fa-play"></i>';
                progress.style.width = '0%';
            };
        }

        // Reactions Display
        if (message.reactions && message.reactions.length > 0) {
            this.updateReactionsUI(messageDiv, message.reactions);
        }

        // Reaction Picker on Hover (Desktop) or click context
        if (message._id) {
            messageDiv.setAttribute('data-id', message._id);
            messageDiv.addEventListener('mouseenter', () => {
                this.showReactionPicker(messageDiv, message._id);
            });
            messageDiv.addEventListener('mouseleave', () => {
                this.hideReactionPicker(messageDiv);
            });
        }

        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;
    }

    updateReactionsUI(messageEl, reactions) {
        let reactionsContainer = messageEl.querySelector('.message-reactions');
        if (!reactionsContainer) {
            reactionsContainer = document.createElement('div');
            reactionsContainer.className = 'message-reactions';
            messageEl.appendChild(reactionsContainer);
        }

        // Group by emoji
        const counts = {};
        reactions.forEach(r => {
            counts[r.emoji] = (counts[r.emoji] || 0) + 1;
        });

        reactionsContainer.innerHTML = Object.entries(counts).map(([emoji, count]) => `
            <span class="reaction-pill">${emoji} ${count > 1 ? count : ''}</span>
        `).join('');

        if (reactions.length === 0) {
            reactionsContainer.remove();
        }
    }

    showReactionPicker(messageEl, messageId) {
        if (messageEl.querySelector('.reaction-picker')) return;

        const picker = document.createElement('div');
        picker.className = 'reaction-picker glass';
        const emojis = ['❤️', '👍', '😂', '😮', '😢', '🙏'];

        emojis.forEach(emoji => {
            const span = document.createElement('span');
            span.textContent = emoji;
            span.onclick = () => this.reactToMessage(messageId, emoji);
            picker.appendChild(span);
        });

        messageEl.appendChild(picker);
    }

    initiateReply(message) {
        this.currentReplyTo = message;

        let previewText = message.text;
        if (message.mediaType === 'image') previewText = 'Photo';
        if (message.mediaType === 'voice') previewText = 'Voice Message';

        const bar = document.getElementById('reply-preview-bar');
        const nameEl = document.getElementById('reply-preview-name');
        const textEl = document.getElementById('reply-preview-text');

        if (bar && nameEl && textEl) {
            nameEl.textContent = message.senderId === this.currentUser ? 'You' : 'Them';
            textEl.textContent = previewText;
            bar.style.display = 'flex';

            // Focus input
            const input = document.getElementById('message-input');
            if (input) input.focus();
        }
    }

    cancelReply() {
        this.currentReplyTo = null;
        const bar = document.getElementById('reply-preview-bar');
        if (bar) bar.style.display = 'none';
    }

    sendMessage() {
        const input = document.getElementById('message-input');
        const text = input.value.trim();

        if (!text && !this.currentChatId) return;
        if (!text) return;

        const payload = {
            chatId: this.currentChatId,
            senderId: this.currentUser,
            text: text,
            recipientId: this.currentRecipientId,
            replyTo: this.currentReplyTo ? (this.currentReplyTo._id || this.currentReplyTo.tempId) : null
        };

        this.socket.emit('send_message', payload);

        // Optimistic Render
        this.renderMessage({
            senderId: this.currentUser,
            text: text,
            timestamp: new Date(),
            delivered: false, // will update on ack
            read: false,
            replyTo: this.currentReplyTo ? {
                senderId: this.currentReplyTo.senderId,
                text: this.currentReplyTo.text,
                mediaType: this.currentReplyTo.mediaType
            } : null
        });

        // Clear input and reply
        input.value = '';
        this.cancelReply();

        // Reset button state
        const sendBtn = document.getElementById('send-btn');
        const micBtn = document.getElementById('mic-btn');
        if (sendBtn && micBtn) {
            sendBtn.style.display = 'none';
            micBtn.style.display = 'flex';
        }
    }

    hideReactionPicker(messageEl) {
        const picker = messageEl.querySelector('.reaction-picker');
        if (picker) picker.remove();
    }

    async reactToMessage(messageId, emoji) {
        try {
            await fetch(`${CONFIG.API_BASE_URL}/api/chat/message/${messageId}/react`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    emoji,
                    userId: this.currentUser
                })
            });
        } catch (err) {
            console.error('Reaction error:', err);
        }
    }

    showMediaModal(src) {
        const modal = document.getElementById('media-modal');
        const modalImg = document.getElementById('modal-img');
        const downloadBtn = document.getElementById('download-btn');

        if (modal && modalImg) {
            modalImg.src = src;
            downloadBtn.href = src;
            modal.style.display = 'flex';
        }
    }

    async handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file || (!this.currentRecipientId && !this.currentChatId)) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            // Show optimistic loading message
            const tempId = 'temp-' + Date.now();
            this.renderMessage({
                senderId: this.currentUser,
                text: 'Uploading image...',
                timestamp: new Date(),
                tempId: tempId
            });

            const response = await fetch(`${CONFIG.API_BASE_URL}/api/chat/upload-media`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                // Remove temp message if needed (simplified for now: just send real message)
                const payload = {
                    chatId: this.currentChatId,
                    senderId: this.currentUser,
                    text: '', // Empty text for image-only
                    recipientId: this.currentRecipientId,
                    mediaUrl: data.mediaUrl,
                    mediaType: data.mediaType,
                    mediaMetadata: data.mediaMetadata
                };

                this.socket.emit('send_message', payload);

                // Refresh messages to show real image
                if (this.currentChatId) {
                    this.loadMessages(this.currentChatId);
                } else {
                    // If new chat, render immediately
                    this.renderMessage({
                        senderId: this.currentUser,
                        text: '',
                        timestamp: new Date(),
                        mediaUrl: data.mediaUrl,
                        mediaType: data.mediaType
                    });
                }
            }
        } catch (err) {
            console.error('Upload failed:', err);
            window.showToast('Upload failed. Please try again.', 'error');
        }

        // Clear input
        e.target.value = '';
    }

    sendMessage() {
        const input = document.getElementById('message-input');
        if (!input) return;
        const text = input.value.trim();

        if (!text || (!this.currentRecipientId && !this.currentChatId)) return;

        const payload = {
            chatId: this.currentChatId,
            senderId: this.currentUser,
            text,
            recipientId: this.currentRecipientId
        };

        this.socket.emit('send_message', payload);
        input.value = '';
        this.emitTyping(false);

        // Render immediately
        this.renderMessage({
            senderId: this.currentUser,
            text,
            timestamp: new Date()
        });
    }

    async getUserInfo(uid) {
        if (this.userCache.has(uid)) {
            return this.userCache.get(uid);
        }

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/users/${uid}?requesterId=${this.currentUser}`);
            const userInfo = await response.json();
            this.userCache.set(uid, userInfo);
            return userInfo;
        } catch (err) {
            return {
                displayName: uid.substring(0, 8),
                email: '',
                photoURL: '',
                isOnline: false
            };
        }
    }

    getDefaultAvatar(name) {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=128C7E&color=fff`;
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        // WhatsApp style formatting
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const timeStr = `${hours}:${minutes}`;

        if (date.toDateString() === now.toDateString()) {
            return timeStr;
        } else {
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            if (date.toDateString() === yesterday.toDateString()) {
                return 'Yesterday';
            }
            return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
        }
    }

    async populateParticipantsList() {
        const list = document.getElementById('group-participants-list');
        if (!list) return;

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/users/online?requesterId=${this.currentUser}`);
            const users = await response.json();
            const filteredUsers = users.filter(u => u.firebaseUid !== this.currentUser);

            list.innerHTML = '';
            if (filteredUsers.length === 0) {
                list.innerHTML = '<p style="color:#667781;font-size:12px;">No other users online</p>';
                return;
            }

            filteredUsers.forEach(user => {
                const div = document.createElement('div');
                div.style.display = 'flex';
                div.style.alignItems = 'center';
                div.style.padding = '8px';
                div.style.gap = '10px';
                div.style.borderBottom = '1px solid rgba(255,255,255,0.05)';

                div.innerHTML = `
                    <input type="checkbox" value="${user.firebaseUid}" class="participant-checkbox">
                    <img src="${user.photoURL || this.getDefaultAvatar(user.displayName)}" style="width:30px;height:30px;border-radius:50%;">
                    <span style="font-size:14px;color:var(--text-primary);">${user.displayName}</span>
                `;
                list.appendChild(div);
            });
        } catch (err) {
            console.error('Error populating participants:', err);
        }
    }

    async createGroup() {
        const groupName = document.getElementById('group-name-input').value.trim();
        const checkboxes = document.querySelectorAll('.participant-checkbox:checked');
        const participants = Array.from(checkboxes).map(cb => cb.value);

        if (!groupName) {
            window.showToast('Please enter a group name', 'warning');
            return;
        }
        if (participants.length < 2) {
            window.showToast('Please select at least 2 participants', 'warning');
            return;
        }

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/chat/groups/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    groupName,
                    participants,
                    adminId: this.currentUser
                })
            });

            if (response.ok) {
                document.getElementById('group-modal').style.display = 'none';
                document.getElementById('group-name-input').value = '';
                this.loadChats(); // Refresh list to show new group
                alert(`Group "${groupName}" created successfully!`);
            } else {
                const err = await response.json();
                alert(err.error || 'Failed to create group');
            }
        } catch (err) {
            console.error('Error creating group:', err);
            alert('An error occurred while creating the group');
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    setupSettingsListeners() {
        // Settings Toggles
        const wallpaperBtn = document.getElementById('wallpaper-btn');
        if (wallpaperBtn) {
            wallpaperBtn.addEventListener('click', () => this.changeWallpaper());
        }

        const enterSendCheckbox = document.getElementById('enter-is-send');
        if (enterSendCheckbox) {
            // Load state
            const savedState = localStorage.getItem('enterIsSend') !== 'false'; // Default true
            enterSendCheckbox.checked = savedState;
            enterSendCheckbox.addEventListener('change', (e) => {
                localStorage.setItem('enterIsSend', e.target.checked);
            });
        }
    }

    changeWallpaper() {
        const colors = ['#e5ddd5', '#cce6ff', '#e6ffcc', '#fff0cc', '#ffe6f2', '#111b21'];
        const container = document.getElementById('messages-container');
        if (!container) return;

        // Simple cycler for now
        // Helper to convert rgb to hex might be needed if style.backgroundColor returns rgb
        // but for now let's just cycle based on index if possible or random
        const newColor = colors[Math.floor(Math.random() * colors.length)];

        container.style.backgroundColor = newColor;
        localStorage.setItem('chatWallpaper', newColor);
    }
}
