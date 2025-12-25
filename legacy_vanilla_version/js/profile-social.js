// import { auth } from './firebase.js';
// import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import CONFIG from './config.js';

const API_URL = `${CONFIG.API_BASE_URL}/api/posts`;
const USERS_API = `${CONFIG.API_BASE_URL}/api/users`;
const SOCKET_URL = CONFIG.SOCKET_URL;
let socket;
let currentUser = null;
let profileUid = null;

document.addEventListener("DOMContentLoaded", () => {
    // Get UID from URL or default to current user
    const params = new URLSearchParams(window.location.search);
    profileUid = params.get('uid');

    initRealtime();

    // Wait for Firebase Compat
    const checkAuth = () => {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().onAuthStateChanged(async (user) => {
                currentUser = user;
                if (!profileUid && !user) {
                    window.location.href = './index.html';
                    return;
                }

                const targetUid = profileUid || user.uid;
                await loadProfileData(targetUid);
                await loadUserPosts(targetUid);

                // Initialize Edit Features if it's our own profile
                if (user && targetUid === user.uid) {
                    initEditFeatures();
                    initSettingsFeatures();
                }

                // Phase 17: Emit Online Status
                if (user && socket) {
                    socket.emit('user_online', {
                        firebaseUid: user.uid,
                        displayName: user.displayName || user.email.split('@')[0],
                        email: user.email,
                        photoURL: user.photoURL
                    });
                }
            });
        } else {
            setTimeout(checkAuth, 100);
        }
    };
    checkAuth();
});

function initEditFeatures() {
    const avatarUpload = document.getElementById('avatar-upload');
    const saveBtn = document.getElementById('btn-save-profile');
    const usernameInput = document.getElementById('edit-username');
    let usernameCheckTimeout;
    let originalUsername = '';
    let isUsernameValid = false;

    if (avatarUpload) {
        avatarUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const preview = document.getElementById('edit-avatar-preview');
                    if (preview) preview.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Username validation
    if (usernameInput) {
        usernameInput.addEventListener('input', (e) => {
            clearTimeout(usernameCheckTimeout);
            let username = e.target.value.toLowerCase().trim();

            // Auto-convert to lowercase
            e.target.value = username;

            // Validation
            if (username.length === 0) {
                updateUsernameStatus('empty');
                isUsernameValid = true; // Allow empty (will use original)
                return;
            }

            // If same as original, mark as valid immediately
            if (username === originalUsername) {
                updateUsernameStatus('unchanged', 'This is your current username');
                isUsernameValid = true;
                return;
            }

            // Show checking status
            updateUsernameStatus('checking');

            if (username.length < 3) {
                updateUsernameStatus('invalid', 'Username must be at least 3 characters');
                isUsernameValid = false;
                return;
            }

            if (!/^[a-z0-9_]+$/.test(username)) {
                updateUsernameStatus('invalid', 'Only lowercase letters, numbers, and underscores allowed');
                isUsernameValid = false;
                return;
            }

            // Check availability after 500ms delay
            usernameCheckTimeout = setTimeout(async () => {
                await checkUsernameAvailability(username);
            }, 500);
        });
    }

    async function checkUsernameAvailability(username) {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/users/check-username/${username}`);

            if (!response.ok) {
                throw new Error('Server error');
            }

            const data = await response.json();

            if (data.available) {
                updateUsernameStatus('available', '✓ Username is available!');
                isUsernameValid = true;
            } else {
                updateUsernameStatus('taken', '✗ This username is already taken. Try another one.');
                isUsernameValid = false;
            }
        } catch (err) {
            console.error('Username check error:', err);
            updateUsernameStatus('error', '⚠ Cannot check availability. Try again.');
            isUsernameValid = false;
        }
    }

    function updateUsernameStatus(status, message = '') {
        const statusEl = document.getElementById('edit-username-status');
        const errorEl = document.getElementById('edit-username-error');

        if (!statusEl || !errorEl) return;

        statusEl.className = 'username-status';
        errorEl.textContent = '';

        switch (status) {
            case 'empty':
                statusEl.innerHTML = '';
                break;
            case 'checking':
                statusEl.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>';
                break;
            case 'available':
                statusEl.innerHTML = '<i class="fas fa-check" style="color: #10b981;"></i>';
                errorEl.style.color = '#10b981';
                errorEl.textContent = message;
                break;
            case 'unchanged':
                statusEl.innerHTML = '<i class="fas fa-info-circle" style="color: #6366f1;"></i>';
                errorEl.style.color = '#6366f1';
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

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const username = usernameInput ? usernameInput.value.trim() : '';
            if (username && username !== originalUsername && !isUsernameValid) {
                window.showToast('Please fix username errors before saving', 'error');
                return;
            }
            saveProfile();
        });
    }

    // Store function to set original username
    window.setOriginalUsername = (username) => {
        originalUsername = username;
        isUsernameValid = true;
    };
}

window.toggleEditModal = async (show) => {
    const modal = document.getElementById('edit-profile-modal');
    if (!modal) return;

    if (show) {
        try {
            // Fetch current user data
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/users/${currentUser.uid}`);
            const user = await response.json();

            // Get UI elements
            const avatar = document.querySelector('.profile-avatar-lg');
            const tags = Array.from(document.querySelectorAll('.tech-tag')).map(t => t.textContent).join(', ');

            // Populate fields
            document.getElementById('edit-display-name').value = user.displayName || '';
            document.getElementById('edit-username').value = user.username || '';
            document.getElementById('edit-bio').value = user.bio || '';
            document.getElementById('edit-tech-stack').value = tags;
            document.getElementById('edit-avatar-preview').src = avatar?.src || './images/default-avatar.png';

            // Set original username for validation
            if (window.setOriginalUsername) {
                window.setOriginalUsername(user.username || '');
            }

            modal.classList.add('active');
        } catch (err) {
            console.error('Error loading profile data:', err);
            window.showToast('Error loading profile', 'error');
        }
    } else {
        modal.classList.remove('active');
    }
};

async function saveProfile() {
    const displayName = document.getElementById('edit-display-name').value.trim();
    const usernameInput = document.getElementById('edit-username');
    let username = usernameInput ? usernameInput.value.trim() : '';
    const bio = document.getElementById('edit-bio').value.trim();
    const techStackInput = document.getElementById('edit-tech-stack').value;

    // Validation
    if (!displayName) {
        window.showToast('Display name is required', 'error');
        return;
    }

    // If username is empty or unchanged, keep original
    if (!username && window.setOriginalUsername) {
        // Fetch current user data to get original username
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/users/${currentUser.uid}`);
            const user = await response.json();
            username = user.username;
        } catch (err) {
            window.showToast('Error loading current username', 'error');
            return;
        }
    }

    if (!username) {
        window.showToast('Username is required', 'error');
        return;
    }

    // Parse tags: split by comma, trim, remove empty
    const techStack = techStackInput.split(',').map(t => t.trim()).filter(t => t.length > 0);

    const saveBtn = document.getElementById('btn-save-profile');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
        // Update Profile Data
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/users/update-profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                firebaseUid: currentUser.uid,
                displayName,
                username,
                bio,
                techStack
            })
        });

        if (response.ok) {
            const updatedUser = await response.json();

            // Phase 4: Data Consistency
            // Broadcast update to other tabs
            const updateChannel = new BroadcastChannel('user_updates');
            updateChannel.postMessage({
                type: 'PROFILE_UPDATE',
                user: updatedUser
            });

            // Reload to reflect changes
            location.reload();
        } else {
            alert('Failed to update profile');
        }
    } catch (err) {
        console.error("Error saving profile:", err);
        alert('Error saving profile');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Changes';
        }
    }
}

function initRealtime() {
    socket = io(SOCKET_URL);

    socket.on('post_liked', (data) => {
        const postItem = document.querySelector(`[data-id="${data.postId}"]`);
        if (postItem) {
            const likeEl = postItem.querySelector('.overlay-stat:first-child');
            if (likeEl) likeEl.innerHTML = `<i class="fas fa-heart"></i> ${data.likesCount}`;
        }
    });

    socket.on('post_updated', (data) => {
        const postItem = document.querySelector(`[data-id="${data.postId}"]`);
        if (postItem) {
            const img = postItem.querySelector('img');
            if (data.image && img) {
                img.src = data.image.startsWith('http') ? data.image : `${SOCKET_URL}${data.image}`;
            }
        }
    });

    socket.on('post_deleted', (data) => {
        const postItem = document.querySelector(`[data-id="${data.postId}"]`);
        if (postItem) {
            postItem.style.transform = 'scale(0)';
            setTimeout(() => {
                postItem.remove();
                // Update count
                const countEl = document.getElementById("post-count");
                if (countEl) countEl.textContent = parseInt(countEl.textContent) - 1;
            }, 300);
        }
    });

    socket.on('user_followed', (data) => {
        // data: { followerId, followingId, followersCount, followingCount, action }
        const targetUid = profileUid || (currentUser ? currentUser.uid : null);
        if (data.followingId === targetUid) {
            const followerCountEl = document.querySelectorAll('.stat-item strong')[1]; // followers
            if (followerCountEl) {
                followerCountEl.textContent = data.followersCount;
                followerCountEl.classList.add('pulse-stat');
                setTimeout(() => followerCountEl.classList.remove('pulse-stat'), 1000);
            }
        }
    });
}

async function loadProfileData(uid) {
    try {
        // 1. Fetch User Info from backend
        const userRes = await fetch(`${CONFIG.API_BASE_URL}/api/users/${uid}`);
        const user = await userRes.json();

        // 2. Fetch Stats
        const statsRes = await fetch(`${USERS_API}/stats/${uid}`);
        const stats = await statsRes.json();

        updateProfileUI(user, stats);
    } catch (err) {
        console.error("Error loading profile data:", err);
    }
}

function updateProfileUI(user, stats) {
    const avatarImg = document.querySelector('.profile-avatar-lg');
    const usernameEl = document.querySelector('.profile-username');
    const displayNameEl = document.querySelector('.profile-displayname');
    const bioNameEl = document.getElementById('profile-bio-name');
    const bioTextEl = document.getElementById('profile-bio-text');
    const statsEls = document.querySelectorAll('.stat-item b');

    // Avatar Handling
    if (avatarImg) {
        let photoURL = user.photoURL || './images/default-avatar.png';
        if (photoURL && !photoURL.startsWith('http') && photoURL.startsWith('/uploads/')) {
            photoURL = `${CONFIG.API_BASE_URL}${photoURL}`;
        }
        avatarImg.src = photoURL;
    }

    // Display both names
    if (usernameEl) usernameEl.textContent = `@${user.username || 'user'}`;
    if (displayNameEl) displayNameEl.textContent = user.displayName || 'User';
    if (bioNameEl) bioNameEl.textContent = user.displayName || 'G-Network User';
    if (bioTextEl) bioTextEl.textContent = user.bio || 'No bio yet.';

    if (statsEls.length >= 3) {
        statsEls[0].textContent = stats.postsCount || 0;
        statsEls[1].textContent = stats.followersCount || 0;
        statsEls[2].textContent = stats.followingCount || 0;
    }

    // Populate Tech Stack
    const techStackContainer = document.getElementById('profile-tech-stack');
    if (techStackContainer && user.techStack && user.techStack.length > 0) {
        techStackContainer.innerHTML = user.techStack.map(tech => `<span class="tech-tag">${tech}</span>`).join('');
    } else if (techStackContainer) {
        techStackContainer.innerHTML = '';
    }

    // Populate Member Since
    const memberSinceEl = document.getElementById('profile-member-since');
    if (memberSinceEl) {
        const dateStr = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Recently';
        memberSinceEl.innerHTML = `<i class="far fa-calendar-alt"></i> Joined ${dateStr}`;
    }

    // Toggle Follow/Edit Button
    const actionContainer = document.querySelector('.profile-actions');
    const isOwnProfile = currentUser && currentUser.uid === user.firebaseUid;

    console.log('🔍 Profile button check:', {
        currentUserUid: currentUser?.uid,
        profileUserUid: user.firebaseUid,
        isOwnProfile,
        willShowEditButton: isOwnProfile,
        willShowFollowButton: !isOwnProfile && currentUser
    });

    if (isOwnProfile) {
        // Own profile - Show Edit button
        console.log('✅ Showing EDIT button (own profile)');
        actionContainer.innerHTML = `
            <button class="btn-profile-edit" onclick="toggleEditModal(true)">Edit Profile</button>
            <button class="btn-settings"><i class="fas fa-cog"></i></button>
        `;

        // Init settings btn logic
        const settingsBtn = actionContainer.querySelector('.btn-settings');
        if (settingsBtn) settingsBtn.onclick = () => toggleSettingsModal(true);

    } else if (currentUser) {
        // Someone else's profile - Show Follow button
        const isFollowing = stats.isFollowing;
        console.log('✅ Showing FOLLOW button (other user profile)', { isFollowing });
        actionContainer.innerHTML = `
            <button class="btn-follow-toggle ${isFollowing ? 'following' : ''}" id="btn-follow-action">
                ${isFollowing ? 'Following' : 'Follow'}
            </button>
            <button class="btn-settings" onclick="location.href='./chat.html'"><i class="fas fa-comment"></i></button>
        `;

        const followBtn = document.getElementById('btn-follow-action');
        if (followBtn) {
            followBtn.onclick = () => handleFollowToggle(user.firebaseUid, followBtn);
        }
    } else {
        // Not logged in
        console.log('⚠️ Showing LOGIN button (not authenticated)');
        actionContainer.innerHTML = '<button class="btn-profile-edit" onclick="location.href=\'./login.html\'">Log in to Follow</button>';
    }

    // Privacy View Handling - Hide posts if private and can't view
    if (!stats.canViewPosts) {
        const grid = document.getElementById('profile-posts-grid');
        if (grid) {
            grid.innerHTML = `
                <div class="private-profile-view">
                    <i class="fas fa-lock"></i>
                    <h3>This Account is Private</h3>
                    <p>Follow to see their photos and videos.</p>
                </div>
             `;
        }
    }
}

async function handleFollowToggle(targetUid, btn) {
    if (!currentUser) {
        console.error('No current user found');
        window.showToast('Please log in first', 'warning');
        return;
    }

    console.log('Profile follow button clicked:', { targetUid, currentUserId: currentUser.uid });

    // CRITICAL: Prevent self-follow
    if (targetUid === currentUser.uid) {
        console.error('❌ PREVENTED: Attempting to follow self!');
        console.error('targetUid:', targetUid);
        console.error('currentUser.uid:', currentUser.uid);
        window.showToast('You cannot follow yourself', 'warning');
        return;
    }

    // Optimistic UI
    const isFollowing = btn.classList.contains('following');
    const originalText = btn.textContent.trim();
    const action = isFollowing ? 'unfollow' : 'follow';

    console.log('Action:', action, '| IsFollowing:', isFollowing);
    console.log('✅ Valid follow request - different UIDs');

    btn.textContent = isFollowing ? 'Follow' : 'Following';
    btn.classList.toggle('following');
    btn.disabled = true;

    try {
        const apiUrl = `${CONFIG.API_BASE_URL}/api/users/${action}`;
        const payload = { userId: currentUser.uid, targetUid };

        console.log('Calling API:', apiUrl);
        console.log('Payload:', payload);
        console.log('Payload validation:', {
            userIdType: typeof payload.userId,
            targetUidType: typeof payload.targetUid,
            areEqual: payload.userId === payload.targetUid
        });

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        console.log('Response status:', response.status);

        const data = await response.json();
        console.log('Response data:', data);

        if (data.success) {
            window.showToast(isFollowing ? 'Unfollowed' : 'Now Following', 'success');
            // Reload to update stats
            loadProfileData(targetUid);
        } else {
            // Revert
            btn.textContent = originalText;
            btn.classList.toggle('following');
            const errorMsg = data.error || 'Action failed';
            console.error('Follow failed:', errorMsg, data);
            window.showToast(errorMsg, 'error');
        }
    } catch (err) {
        console.error('Follow error:', err);
        // Revert
        btn.textContent = originalText;
        btn.classList.toggle('following');
        window.showToast('Network error: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
    }
}

window.handleFollowToggle = async (targetUid, currentlyFollowing) => {
    if (!currentUser) return;
    const btn = document.querySelector('.btn-follow-toggle');
    const action = currentlyFollowing ? 'unfollow' : 'follow';

    try {
        btn.disabled = true;
        const response = await fetch(`${USERS_API}/${action}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                followerId: currentUser.uid,
                followingId: targetUid
            })
        });

        if (response.ok) {
            // Stats will be updated via Socket.io broadcast, but we toggle button immediately
            const newState = !currentlyFollowing;
            btn.textContent = newState ? 'Following' : 'Follow';
            btn.classList.toggle('following', newState);
            btn.onclick = () => handleFollowToggle(targetUid, newState);
        }
    } catch (err) {
        console.error("Follow error:", err);
    } finally {
        btn.disabled = false;
    }
};

async function loadUserPosts(uid) {
    const gridContainer = document.getElementById("profile-posts-grid") || document.getElementById("user-posts-grid");
    const countEl = document.getElementById("profile-posts-count") || document.getElementById("post-count");

    if (!gridContainer) {
        console.error('Posts grid container not found');
        return;
    }

    try {
        const response = await fetch(`${API_URL}?authorId=${uid}`);
        const data = await response.json();
        const posts = data.posts || [];

        gridContainer.innerHTML = '';
        if (countEl) {
            countEl.textContent = posts.length;
        }

        if (posts.length === 0) {
            gridContainer.innerHTML = `<div style="text-align:center; padding:40px; grid-column: 1/-1; color: var(--text-secondary);">No posts yet. Start sharing!</div>`;
            return;
        }

        posts.forEach((post) => {
            const gridItem = createGridItem(post);
            gridContainer.appendChild(gridItem);
        });

    } catch (error) {
        console.error("Error loading profile posts:", error);
        if (gridContainer) {
            gridContainer.innerHTML = `<div style="text-align:center; padding:40px; grid-column: 1/-1; color: var(--error);">Failed to load posts</div>`;
        }
    }
}

function createGridItem(post) {
    const item = document.createElement("div");
    item.className = "grid-post";
    item.dataset.id = post._id;

    // Fixed relative path if needed
    let imgUrl = './images/default-article.png';
    if (post.image) {
        imgUrl = post.image.startsWith('http') ? post.image : `${CONFIG.API_BASE_URL}${post.image}`;
    }

    const likeCount = post.likes ? post.likes.length : 0;
    const commentCount = post.comments ? post.comments.length : 0;

    item.innerHTML = `
        <img src="${imgUrl}" alt="Post thumbnail" loading="lazy">
        <div class="post-overlay">
            <div class="overlay-stat"><i class="fas fa-heart"></i> ${likeCount}</div>
            <div class="overlay-stat"><i class="fas fa-comment"></i> ${commentCount}</div>
        </div>
    `;

    // Click to view post detail on index.html
    item.addEventListener('click', () => {
        window.location.href = `./index.html?postId=${post._id}`;
    });

    return item;
}

// =========================================
// SETTINGS & PRIVACY
// =========================================
window.toggleSettingsModal = (show) => {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;
    if (show) {
        modal.classList.add('active');
        // Populate current values
        loadPrivacySettings();
    } else {
        modal.classList.remove('active');
    }
};

function initSettingsFeatures() {
    // 1. Open Settings Button
    const settingsBtns = document.querySelectorAll('.btn-settings');
    settingsBtns.forEach(btn => {
        btn.onclick = () => window.toggleSettingsModal(true);
    });

    // 2. Tabs Logic
    const tabs = document.querySelectorAll('.settings-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all
            document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));

            // Add active to clicked
            tab.classList.add('active');
            const targetId = `sec-${tab.dataset.tab}`;
            document.getElementById(targetId).classList.add('active');
        });
    });

    // 3. Private Account Toggle
    const privacyToggle = document.getElementById('privacy-is-private');
    if (privacyToggle && currentUser) {
        // Load current privacy setting
        fetch(`${CONFIG.API_BASE_URL}/api/users/${currentUser.uid}`)
            .then(res => res.json())
            .then(user => {
                if (user.privacy) {
                    privacyToggle.checked = user.privacy.isPrivate || false;

                    // Bind Change Listener
                    privacyToggle.addEventListener('change', async (e) => {
                        const isPrivate = e.target.checked;
                        try {
                            await fetch(`${CONFIG.API_BASE_URL}/api/users/update-privacy`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    firebaseUid: currentUser.uid,
                                    privacy: { isPrivate }
                                })
                            });
                            window.showToast(`Account is now ${isPrivate ? 'Private' : 'Public'}`, 'success');
                        } catch (err) {
                            window.showToast('Failed to update privacy', 'error');
                            e.target.checked = !isPrivate; // Revert
                        }
                    });
                }
            });
    }

    // 4. Logout
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            firebase.auth().signOut().then(() => {
                window.location.href = './login.html';
            });
        };
    }

    // 5. Save Privacy (other fields)
    const savePrivacyBtn = document.getElementById('btn-save-privacy');
    if (savePrivacyBtn) {
        savePrivacyBtn.onclick = savePrivacySettings;
    }
}

// 6. Dark Mode
const themeToggle = document.getElementById('theme-toggle');
if (themeToggle) {
    // Set initial state
    themeToggle.checked = document.body.classList.contains('dark-mode');
    themeToggle.onchange = (e) => {
        if (e.target.checked) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('theme', 'light');
        }
    }
}

async function loadPrivacySettings() {
    if (!currentUser) return;
    try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/api/users/${currentUser.uid}`);
        const user = await res.json();

        if (user.privacy) {
            if (user.privacy.lastSeen) document.getElementById('privacy-lastseen').value = user.privacy.lastSeen;
            if (user.privacy.profilePhoto) document.getElementById('privacy-photo').value = user.privacy.profilePhoto;
            if (user.privacy.about) document.getElementById('privacy-about').value = user.privacy.about;
        }
    } catch (err) {
        console.error("Error fetching privacy settings", err);
    }
}

async function savePrivacySettings() {
    if (!currentUser) return;
    const btn = document.getElementById('btn-save-privacy');

    const privacyData = {
        lastSeen: document.getElementById('privacy-lastseen').value,
        profilePhoto: document.getElementById('privacy-photo').value,
        about: document.getElementById('privacy-about').value
    };

    try {
        btn.textContent = 'Saving...';
        btn.disabled = true;

        const formData = new FormData();
        formData.append('userId', currentUser.uid);
        formData.append('privacy', JSON.stringify(privacyData));

        const response = await fetch(`${USERS_API}/profile`, {
            method: 'PUT',
            body: formData
        });

        const result = await response.json();
        if (result.success) {
            toggleSettingsModal(false);
            if (window.NotificationManager) {
                new window.NotificationManager().showToast("Privacy settings updated!", "success");
            } else {
                alert("Settings Saved!");
            }
        }
    } catch (err) {
        console.error("Error saving privacy:", err);
        alert("Failed to save settings.");
    } finally {
        btn.textContent = 'Save Privacy';
        btn.disabled = false;
    }
}
