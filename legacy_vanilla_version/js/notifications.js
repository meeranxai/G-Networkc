import CONFIG from './config.js';

const NOTIF_API = `${CONFIG.API_BASE_URL}/api/notifications`;
const SOCKET_URL = CONFIG.SOCKET_URL;

class NotificationManager {
    constructor() {
        this.socket = null;
        this.userId = null;
        this.unreadCount = 0;
        this.isVisible = false;

        this.init();
    }

    async init() {
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                this.userId = user.uid;
                this.setupSocket();
                await this.loadNotifications();
                this.setupUI();
            }
        });
    }

    setupSocket() {
        // Reuse or create socket connection
        if (window.socket) {
            this.socket = window.socket;
        } else {
            this.socket = io(SOCKET_URL);
            window.socket = this.socket;
        }

        // Join personal room for targeted notifications
        this.socket.emit('join_personal_room', this.userId);

        this.socket.on('new_notification', (notif) => {
            this.showToast(notif);
            this.addNotificationToList(notif, true); // add to top
            this.updateBadge(1); // Increment
        });
    }

    async loadNotifications() {
        try {
            const res = await fetch(`${NOTIF_API}/${this.userId}`);
            const data = await res.json();

            this.unreadCount = data.filter(n => !n.isRead).length;
            this.renderNotificationList(data);
            this.updateBadge(0); // Update with absolute value
        } catch (err) {
            console.error("Failed to load notifications:", err);
        }
    }

    setupUI() {
        const notifBtn = document.getElementById('notif-link');
        const notifMobileBtn = document.getElementById('notif-mobile-btn');
        const closeBtn = document.getElementById('close-notif-btn');
        const drawer = document.getElementById('notif-drawer');

        const toggleDrawer = () => {
            this.isVisible = !this.isVisible;
            drawer.classList.toggle('active', this.isVisible);
            if (this.isVisible) this.markAllAsRead();
        };

        if (notifBtn) notifBtn.addEventListener('click', (e) => { e.preventDefault(); toggleDrawer(); });
        if (notifMobileBtn) notifMobileBtn.addEventListener('click', (e) => { e.preventDefault(); toggleDrawer(); });
        if (closeBtn) closeBtn.addEventListener('click', toggleDrawer);
    }

    showToast(notif) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${notif.type}`;

        const iconClass = notif.type === 'like' ? 'fas fa-heart' : 'fas fa-comment';

        toast.innerHTML = `
            <div class="toast-icon">
                <i class="${iconClass}"></i>
            </div>
            <div class="toast-content">
                <h4>${notif.senderName}</h4>
                <p>${notif.content}</p>
            </div>
        `;

        container.appendChild(toast);

        // Trigger animation
        setTimeout(() => toast.classList.add('active'), 100);

        // Remove after delay
        setTimeout(() => {
            toast.classList.remove('active');
            setTimeout(() => toast.remove(), 400);
        }, 5000);
    }

    renderNotificationList(notifs) {
        const list = document.getElementById('notif-list-container');
        if (!list) return;

        if (notifs.length === 0) {
            list.innerHTML = `
                <div class="empty-notif" style="padding:40px; text-align:center; color: #94a3b8;">
                    <i class="fas fa-bell-slash" style="font-size: 2rem; margin-bottom: 10px; opacity: 0.5;"></i>
                    <p>No notifications yet</p>
                </div>`;
            return;
        }

        list.innerHTML = '';
        notifs.forEach(n => this.addNotificationToList(n));
    }

    addNotificationToList(n, atTop = false) {
        const list = document.getElementById('notif-list-container');
        if (!list) return;

        // Remove empty placeholder
        const empty = list.querySelector('.empty-notif');
        if (empty) empty.remove();

        const item = document.createElement('div');
        item.className = `notif-item ${n.isRead ? '' : 'unread'}`;
        item.innerHTML = `
            <img src="${n.senderAvatar || './images/default-avatar.png'}" class="sender-avatar">
            <div class="notif-body">
                <p><b>${n.senderName}</b> ${n.content}</p>
                <span class="notif-time">${this.formatTime(n.createdAt)}</span>
            </div>
        `;

        if (atTop) {
            list.insertBefore(item, list.firstChild);
        } else {
            list.appendChild(item);
        }
    }

    async markAllAsRead() {
        if (this.unreadCount === 0) return;

        try {
            await fetch(`${NOTIF_API}/read-all/${this.userId}`, { method: 'PUT' });
            this.unreadCount = 0;
            this.updateBadge(0);

            // UI Update
            document.querySelectorAll('.notif-item.unread').forEach(item => {
                item.classList.remove('unread');
            });
        } catch (err) {
            console.error("Failed to mark all as read:", err);
        }
    }

    updateBadge(change) {
        if (change > 0) this.unreadCount += change;

        const badge = document.getElementById('notif-badge');
        const mobileBadge = document.getElementById('notif-badge-mobile');

        if (this.unreadCount > 0) {
            if (badge) {
                badge.style.display = 'inline-block';
                badge.textContent = this.unreadCount > 9 ? '9+' : this.unreadCount;
            }
            if (mobileBadge) {
                mobileBadge.style.display = 'block';
            }
        } else {
            if (badge) badge.style.display = 'none';
            if (mobileBadge) mobileBadge.style.display = 'none';
        }
    }

    formatTime(date) {
        const d = new Date(date);
        const now = new Date();
        const diff = (now - d) / 1000; // seconds

        if (diff < 60) return 'Just now';
        if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
        if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
        return d.toLocaleDateString();
    }
}

// Global initialization
if (!window.notifManager) {
    window.notifManager = new NotificationManager();
}

// Export for module usage if needed
export default NotificationManager;
