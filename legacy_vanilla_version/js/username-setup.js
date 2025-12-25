// Username Setup Manager
class UsernameSetup {
    constructor() {
        this.modal = null;
        this.currentUser = null;
    }

    async checkAndPrompt(user) {
        this.currentUser = user;

        // Check if user has username
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/users/${user.uid}`);
            const userData = await response.json();

            if (!userData.username) {
                this.showSetupModal();
            }
        } catch (err) {
            console.error('Error checking username:', err);
        }
    }

    showSetupModal() {
        // Create modal if doesn't exist
        if (!this.modal) {
            this.createModal();
        }

        this.modal.classList.add('active');
    }

    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'username-setup-modal';
        this.modal.innerHTML = `
            <div class="username-setup-content glass-blur">
                <div class="setup-header">
                    <i class="fas fa-user-tag"></i>
                    <h2>Choose Your Username</h2>
                    <p>This will be your unique identity on G-Network</p>
                </div>
                
                <div class="setup-body">
                    <div class="input-group">
                        <label for="username-input">Username</label>
                        <div class="username-input-wrapper">
                            <span class="username-prefix">@</span>
                            <input 
                                type="text" 
                                id="username-input" 
                                placeholder="john_doe" 
                                maxlength="30"
                                autocomplete="off"
                            >
                            <span class="username-status" id="username-status">
                                <i class="fas fa-circle-notch fa-spin"></i>
                            </span>
                        </div>
                        <small class="input-hint">3-30 characters, lowercase letters, numbers, and underscores only</small>
                        <small class="input-error" id="username-error"></small>
                    </div>
                    
                    <button class="btn-setup-submit" id="btn-submit-username" disabled>
                        Continue
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);

        // Add event listeners
        const input = document.getElementById('username-input');
        const submitBtn = document.getElementById('btn-submit-username');

        let checkTimeout;
        input.addEventListener('input', (e) => {
            clearTimeout(checkTimeout);
            const username = e.target.value.toLowerCase().trim();

            // Clear previous status
            this.updateStatus('checking');

            if (username.length < 3) {
                this.updateStatus('invalid', 'Username must be at least 3 characters');
                submitBtn.disabled = true;
                return;
            }

            if (!/^[a-z0-9_]+$/.test(username)) {
                this.updateStatus('invalid', 'Only lowercase letters, numbers, and underscores allowed');
                submitBtn.disabled = true;
                return;
            }

            // Check availability after 500ms delay
            checkTimeout = setTimeout(() => {
                this.checkAvailability(username, submitBtn);
            }, 500);
        });

        submitBtn.addEventListener('click', () => this.submitUsername());
    }

    async checkAvailability(username, submitBtn) {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/users/check-username/${username}`);
            const data = await response.json();

            if (data.available) {
                this.updateStatus('available', 'Username is available!');
                submitBtn.disabled = false;
            } else {
                this.updateStatus('taken', data.error || 'Username is already taken');
                submitBtn.disabled = true;
            }
        } catch (err) {
            this.updateStatus('error', 'Error checking availability');
            submitBtn.disabled = true;
        }
    }

    updateStatus(status, message = '') {
        const statusEl = document.getElementById('username-status');
        const errorEl = document.getElementById('username-error');

        statusEl.className = 'username-status';
        errorEl.textContent = '';

        switch (status) {
            case 'checking':
                statusEl.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>';
                break;
            case 'available':
                statusEl.innerHTML = '<i class="fas fa-check" style="color: #10b981;"></i>';
                errorEl.style.color = '#10b981';
                errorEl.textContent = message;
                break;
            case 'taken':
            case 'invalid':
                statusEl.innerHTML = '<i class="fas fa-times" style="color: #ef4444;"></i>';
                errorEl.style.color = '#ef4444';
                errorEl.textContent = message;
                break;
            case 'error':
                statusEl.innerHTML = '<i class="fas fa-exclamation-triangle" style="color: #f59e0b;"></i>';
                errorEl.style.color = '#f59e0b';
                errorEl.textContent = message;
                break;
        }
    }

    async submitUsername() {
        const input = document.getElementById('username-input');
        const submitBtn = document.getElementById('btn-submit-username');
        const username = input.value.toLowerCase().trim();

        submitBtn.disabled = true;
        submitBtn.textContent = 'Setting up...';

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/users/update-profile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firebaseUid: this.currentUser.uid,
                    username,
                    displayName: this.currentUser.displayName
                })
            });

            if (response.ok) {
                window.showToast('Username set successfully!', 'success');
                this.modal.classList.remove('active');
                setTimeout(() => this.modal.remove(), 300);
            } else {
                const error = await response.json();
                window.showToast(error.error || 'Failed to set username', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Continue';
            }
        } catch (err) {
            console.error('Error setting username:', err);
            window.showToast('Network error', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Continue';
        }
    }
}

// Initialize on auth state change
if (typeof firebase !== 'undefined') {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            const usernameSetup = new UsernameSetup();
            await usernameSetup.checkAndPrompt(user);
        }
    });
}
