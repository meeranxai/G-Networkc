import CONFIG from './config.js';

const API_URL = `${CONFIG.API_BASE_URL}/api/posts`;
let currentPage = 1;
let isLoading = false;
let hasMore = true;
let observer;

// Initialize/Reuse socket
const socket = window.socket || io(CONFIG.SOCKET_URL);
if (!window.socket) window.socket = socket;

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Initial Load (Trends)
    await loadTrendingTags();
    await loadSuggestedUsers();

    // 2. Auth-Aware Feed Load
    let isFeedLoaded = false;
    firebase.auth().onAuthStateChanged(async (user) => {
        // Only load the feed once or if the user status changes fundamentally
        if (!isFeedLoaded) {
            await loadFeed();
            isFeedLoaded = true;
        }

        if (user) {
            const avatar = document.getElementById('composer-avatar');
            if (avatar) avatar.src = user.photoURL || './images/default-avatar.png';

            // Phase 17: Emit Online Status
            socket.emit('user_online', {
                firebaseUid: user.uid,
                displayName: user.displayName || user.email.split('@')[0],
                email: user.email,
                photoURL: user.photoURL
            });
        }
    });

    // 3. Initialize Interaction Wrappers (Delegation)
    const feedContainer = document.getElementById("social-feed-stream");
    if (feedContainer) {
        feedContainer.addEventListener('click', handleInteractions);

        // Follow button handler (delegation)
        feedContainer.addEventListener('click', async (e) => {
            const followBtn = e.target.closest('.btn-follow-post');
            if (!followBtn) return;

            // Get current user
            const currentUser = firebase.auth().currentUser;
            if (!currentUser) {
                window.showToast('Please log in to follow users', 'warning');
                return;
            }

            const authorId = followBtn.dataset.authorId;
            const authorName = followBtn.dataset.authorName;

            console.log('Follow button clicked:', { authorId, authorName, currentUserId: currentUser.uid });

            // Prevent following yourself
            if (authorId === currentUser.uid) {
                console.log('Cannot follow yourself - hiding button');
                followBtn.style.display = 'none';
                window.showToast('You cannot follow yourself', 'warning');
                return;
            }

            // Check if already following
            const isFollowing = followBtn.classList.contains('following');
            const action = isFollowing ? 'unfollow' : 'follow';

            console.log('Action:', action);

            // Optimistic UI
            followBtn.disabled = true;
            followBtn.innerHTML = isFollowing ? '<i class="fas fa-user-plus"></i> Follow' : '<i class="fas fa-check"></i> Following';
            followBtn.classList.toggle('following');

            try {
                const apiUrl = `${CONFIG.API_BASE_URL}/api/users/${action}`;
                console.log('Calling API:', apiUrl);
                console.log('Payload:', { userId: currentUser.uid, targetUid: authorId });

                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: currentUser.uid, targetUid: authorId })
                });

                console.log('Response status:', response.status);

                const data = await response.json();
                console.log('Response data:', data);

                if (data.success) {
                    window.showToast(isFollowing ? `Unfollowed ${authorName}` : `Now following ${authorName}`, 'success');
                } else {
                    // Revert
                    followBtn.innerHTML = isFollowing ? '<i class="fas fa-check"></i> Following' : '<i class="fas fa-user-plus"></i> Follow';
                    followBtn.classList.toggle('following');
                    const errorMsg = data.error || 'Action failed';
                    console.error('Follow failed:', errorMsg, data);
                    window.showToast(errorMsg, 'error');
                }
            } catch (err) {
                console.error('Follow error:', err);
                // Revert
                followBtn.innerHTML = isFollowing ? '<i class="fas fa-check"></i> Following' : '<i class="fas fa-user-plus"></i> Follow';
                followBtn.classList.toggle('following');
                window.showToast('Network error: ' + err.message, 'error');
            } finally {
                followBtn.disabled = false;
            }
        });
    }

    // 4. Socket Listeners (already implemented)
    socket.on('post_liked', (data) => {
        const card = document.querySelector(`.social-card[data-id="${data.postId}"]`);
        if (card) {
            const counterEl = card.querySelector('.like-counter b');
            const heartIcon = card.querySelector('.like-counter i');
            const likeBtn = card.querySelector('.btn-like');
            const btnIcon = likeBtn.querySelector('i');

            counterEl.textContent = data.likesCount;

            // Check if current user is the one who liked
            const currentUser = firebase.auth().currentUser;
            const isLikedByMe = currentUser && data.likes.includes(currentUser.uid);

            if (isLikedByMe) {
                heartIcon.style.color = '#ef4444';
                likeBtn.classList.add('liked');
                btnIcon.classList.replace('far', 'fas');
            } else {
                if (data.likesCount === 0) heartIcon.style.color = 'var(--text-tertiary)';
                // We don't forcefully remove 'liked' class from others as it might be confusing if they just liked it too
            }
        }
    });

    socket.on('new_comment', (data) => {
        const card = document.querySelector(`.social-card[data-id="${data.postId}"]`);
        if (card) {
            // Update UI count
            const commentCountSpan = card.querySelector('.card-stats span:last-child');
            if (commentCountSpan) commentCountSpan.textContent = `${data.commentCount} comments`;

            // Add to list only if NOT sent by me (to avoid duplicates)
            const currentUser = firebase.auth().currentUser;
            if (currentUser && data.comment.userId !== currentUser.uid) {
                addCommentToUI(data.postId, data.comment);
            }
        }
    });
    // 5. Close dropdowns on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.post-options-wrapper')) {
            document.querySelectorAll('.post-options-menu.active').forEach(m => m.classList.remove('active'));
        }
    });
});

async function loadTrendingTags() {
    const trendingContainer = document.getElementById('trending-list');
    if (!trendingContainer) return;

    try {
        const response = await fetch(`${API_URL}/trending-hashtags`);
        const tags = await response.json();

        if (tags.length === 0) {
            trendingContainer.innerHTML = '<p style="color:var(--text-tertiary); font-size: 0.9rem;">No trends yet</p>';
            return;
        }

        trendingContainer.innerHTML = tags.map(tag => `
            <div class="trend-item" onclick="searchByTag('${tag.tag}')">
                <div class="trend-info">
                    <h5>#${tag.tag}</h5>
                    <span class="trend-meta">${tag.count} posts</span>
                </div>
                <i class="fas fa-chart-line" style="color: var(--primary); font-size: 0.8rem; margin-top: 5px;"></i>
            </div>
        `).join('');
    } catch (err) {
        console.error("Trending error:", err);
    }
}

window.searchByTag = (tag) => {
    // Basic search integration
    alert("Searching for #" + tag);
    // In a full implementation, we'd update the feed with ?q=#tag
};

async function loadSuggestedUsers() {
    const container = document.getElementById('suggested-users-list');
    if (!container) return;

    // Only show if logged in
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) {
        container.innerHTML = '<p style="padding:20px; text-align:center; color: #94a3b8; font-size: 0.9rem;">Log in to see suggestions</p>';
        return;
    }

    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/users/suggestions/${currentUser.uid}?limit=5`);
        const users = await response.json();

        if (users.length === 0) {
            container.innerHTML = '<p style="padding:20px; text-align:center; color: #94a3b8; font-size: 0.9rem;">No suggestions available</p>';
            return;
        }

        container.innerHTML = '';
        users.forEach(user => {
            const item = document.createElement('div');
            item.className = 'suggested-user-item';
            item.innerHTML = `
                <div class="suggested-user-info">
                    <img src="${user.photoURL || './images/default-avatar.png'}" alt="${user.displayName}" class="suggested-avatar">
                    <div class="suggested-details">
                        <strong>${user.displayName}</strong>
                        <span>${user.followers.length} followers</span>
                    </div>
                </div>
                <button class="btn-follow-mini" data-user-id="${user.firebaseUid}" data-user-name="${user.displayName}">
                    <i class="fas fa-user-plus"></i>
                </button>
            `;

            // Follow handler
            const followBtn = item.querySelector('.btn-follow-mini');
            followBtn.onclick = async () => {
                followBtn.disabled = true;
                followBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

                try {
                    const res = await fetch(`${CONFIG.API_BASE_URL}/api/users/follow`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: currentUser.uid, targetUid: user.firebaseUid })
                    });

                    const data = await res.json();
                    if (data.success) {
                        followBtn.innerHTML = '<i class="fas fa-check"></i>';
                        followBtn.classList.add('followed');
                        window.showToast(`Now following ${user.displayName}`, 'success');

                        // Remove from suggestions after 1 second
                        setTimeout(() => item.remove(), 1000);
                    } else {
                        followBtn.innerHTML = '<i class="fas fa-user-plus"></i>';
                        followBtn.disabled = false;
                        window.showToast('Failed to follow', 'error');
                    }
                } catch (err) {
                    console.error('Follow error:', err);
                    followBtn.innerHTML = '<i class="fas fa-user-plus"></i>';
                    followBtn.disabled = false;
                    window.showToast('Network error', 'error');
                }
            };

            container.appendChild(item);
        });
    } catch (err) {
        console.error('Error loading suggestions:', err);
        container.innerHTML = '<p style="padding:20px; text-align:center; color: #ef4444; font-size: 0.9rem;">Failed to load suggestions</p>';
    }
}

async function loadFeed(page = 1) {
    const feedContainer = document.getElementById("social-feed-stream");
    if (isLoading || (!hasMore && page !== 1)) return;

    isLoading = true;

    // Show small loader if pagination
    if (page > 1) {
        const loader = document.createElement('div');
        loader.id = 'page-loader';
        loader.innerHTML = '<i class="fas fa-spinner fa-spin" style="text-align:center; display:block; padding:20px; color:var(--primary)"></i>';
        feedContainer.appendChild(loader);
    }

    try {
        // Fetch with pagination
        const response = await fetch(`${API_URL}?page=${page}&limit=10`);
        if (!response.ok) throw new Error("Failed to fetch posts");

        const data = await response.json();
        const posts = data.posts || []; // Handle new format
        hasMore = data.hasMore;

        // Clear skeleton/initial content only on first page
        if (page === 1) {
            feedContainer.innerHTML = '';
            if (posts.length === 0) {
                feedContainer.innerHTML = `
                <div style="text-align:center; padding:60px 20px; color:var(--text-secondary);">
                    <i class="fas fa-stream" style="font-size: 3rem; margin-bottom: 20px; color: var(--surface-200);"></i>
                    <p style="font-size: 1.1rem;">No posts yet.<br>Be the first to share something!</p>
                </div>`;
                isLoading = false;
                return;
            }
        } else {
            // Remove page loader
            const loader = document.getElementById('page-loader');
            if (loader) loader.remove();
        }

        // Render Posts
        posts.forEach((post, index) => {
            const postCard = createPostCard(post, index + (page - 1) * 10);
            feedContainer.appendChild(postCard);
        });

        // Setup Observer for next page
        if (hasMore) {
            setupInfiniteScroll();
        }

        currentPage = page;

        // Handle deep-linking (Only on page 1 for now)
        if (page === 1) {
            const params = new URLSearchParams(window.location.search);
            const targetId = params.get('postId');
            if (targetId) {
                // If post not in first page, we might need logic to fetch it specifically (Phase 17)
                // For now, try to find it
                setTimeout(() => {
                    const targetCard = document.querySelector(`.social-card[data-id="${targetId}"]`);
                    if (targetCard) {
                        targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        targetCard.classList.add('highlight-target');
                        setTimeout(() => targetCard.classList.remove('highlight-target'), 3000);
                    }
                }, 500);
            }
        }

    } catch (error) {
        console.error("Error loading feed:", error);
        if (page === 1) {
            feedContainer.innerHTML = `
            <div style="color:var(--error); text-align:center; padding: 40px; background: #fff; border-radius: 12px; border: 1px solid var(--border-color);">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px;"></i>
                <p>Failed to connect to the feed.</p>
                <button onclick="location.reload()" style="margin-top:10px; padding: 8px 16px; background: var(--surface-100); border-radius: 6px; font-weight: 600;">Retry</button>
            </div>`;
        }
    } finally {
        isLoading = false;
    }
}

function setupInfiniteScroll() {
    if (observer) observer.disconnect();

    const options = {
        root: null, // viewport
        rootMargin: '100px', // trigger before reaching bottom
        threshold: 0.1
    };

    observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !isLoading && hasMore) {
                loadFeed(currentPage + 1);
                observer.unobserve(entry.target); // Stop observing current trigger
            }
        });
    }, options);

    // Observe the last element in the feed
    const feedContainer = document.getElementById("social-feed-stream");
    const lastCard = feedContainer.lastElementChild;
    if (lastCard) {
        observer.observe(lastCard);
    }
}

function createPostCard(data, index) {
    const card = document.createElement("article");
    card.className = "social-card";
    card.dataset.id = data._id; // MongoDB uses _id

    // Staggered Animation Delay
    card.style.opacity = '0';
    card.style.animation = `fadeIn 0.5s ease forwards ${index * 0.1}s`;

    // Check if user already liked this post using real data
    const currentUser = firebase.auth().currentUser;
    const isLiked = currentUser ? (data.likes && data.likes.includes(currentUser.uid)) : false;

    // Mock user data if missing
    const authorName = data.author || "Tech Contributor";
    const authorAvatar = data.authorAvatar || "./images/default-avatar.png";

    // Format timestamp
    const date = data.createdAt ? new Date(data.createdAt).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric'
    }) : 'Just now';

    // Stats
    const likeCount = data.likes ? data.likes.length : 0;
    const commentCount = data.comments ? data.comments.length : 0;

    // Image Handling (Fix relative path from backend)
    let imageUrl = '';
    if (data.image) {
        imageUrl = data.image.startsWith('http') ? data.image : `${CONFIG.API_BASE_URL}${data.image}`;
    }

    card.innerHTML = `
        <div class="card-header">
            <div class="user-meta">
                <img src="${authorAvatar}" alt="${authorName}" class="user-avatar-sm" onclick="location.href='./profile.html?uid=${data.authorId}'">
                <div class="user-details">
                    <h4 class="clickable-author" onclick="location.href='./profile.html?uid=${data.authorId}'">${authorName}</h4>
                    <span class="timestamp">
                        ${data.category ? data.category + ' • ' : ''}${date}
                        ${data.isEdited ? '<span class="edited-label" title="Last edited: ' + new Date(data.lastEditedAt).toLocaleString() + '"> • Edited</span>' : ''}
                    </span>
                </div>
            </div>
            
            ${(() => {
            const isOwnPost = currentUser && currentUser.uid === data.authorId;
            console.log('Post ownership check:', {
                postId: data._id,
                authorId: data.authorId,
                currentUserId: currentUser?.uid,
                isOwnPost
            });

            if (isOwnPost) {
                return `
                    <div class="post-options-wrapper">
                        <button class="btn-more" data-action="toggle-options"><i class="fas fa-ellipsis-h"></i></button>
                        <div class="post-options-menu glass-blur">
                            <button class="post-option-item" data-action="edit-post">
                                <i class="fas fa-edit"></i> Edit Post
                            </button>
                            <button class="post-option-item delete" data-action="delete-post">
                                <i class="fas fa-trash-alt"></i> Delete Post
                            </button>
                        </div>
                    </div>
                    `;
            } else if (currentUser) {
                return `
                    <button class="btn-follow-post" data-author-id="${data.authorId}" data-author-name="${authorName}">
                        <i class="fas fa-user-plus"></i> Follow
                    </button>
                    `;
            } else {
                return '';
            }
        })()}
        </div>

        <div class="card-content">
            <p>${data.description || data.title}</p>
        </div>

        ${imageUrl ? `
        <div class="card-media">
            <img src="${imageUrl}" alt="Post Content" loading="lazy">
        </div>` : ''}

        <div class="card-stats">
            <span class="like-counter">
                <i class="fas fa-heart" style="color:${isLiked ? '#ef4444' : 'var(--text-tertiary)'}"></i> 
                <b>${likeCount}</b> likes
            </span>
            <span>${commentCount} comments</span>
        </div>

        <div class="card-actions">
            <button class="action-btn btn-like ${isLiked ? 'liked' : ''}" data-action="like">
                <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i> Like
            </button>
            <button class="action-btn" data-action="comment">
                <i class="far fa-comment-alt"></i> Comment
            </button>
            <button class="action-btn" data-action="share">
                <i class="far fa-share-square"></i> Share
            </button>
        </div>

        <!-- Hidden Comment Section -->
        <div class="comment-section glass" id="comments-${data._id}" style="display: none; padding: 15px; border-top: 1px solid var(--glass-border);">
            <div class="comments-list" style="max-height: 250px; overflow-y: auto; margin-bottom: 15px;">
                ${data.comments && data.comments.length > 0 ? data.comments.map(c => `
                    <div class="comment-item" style="margin-bottom: 12px; display: flex; gap: 10px;">
                        <img src="${c.userAvatar || './images/default-avatar.png'}" class="user-avatar-sm" style="width:30px; height:30px;">
                        <div class="comment-bubble" style="background: rgba(255,255,255,0.05); padding: 8px 12px; border-radius: 15px; flex: 1;">
                            <h5 style="margin: 0; font-size: 0.85rem; color: var(--primary);">${c.userName}</h5>
                            <p style="margin: 3px 0 0 0; font-size: 0.9rem;">${c.text}</p>
                        </div>
                    </div>
                `).join('') : '<p class="no-comments" style="text-align:center; color:var(--text-tertiary); font-size: 0.9rem;">No comments yet. Start the conversation!</p>'}
            </div>
            <div class="comment-input-row" style="display: flex; gap: 10px;">
                <img src="${currentUser ? currentUser.photoURL : './images/default-avatar.png'}" class="user-avatar-sm" style="width:32px; height:32px;">
                <div style="flex: 1; position: relative;">
                    <input type="text" class="comment-input" placeholder="Write a comment..." 
                        style="width: 100%; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); padding: 8px 40px 8px 15px; border-radius: 20px; color: white; outline: none;">
                    <button class="btn-send-comment" data-post-id="${data._id}" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--primary); cursor: pointer;">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    return card;
}

async function handleInteractions(e) {
    const btn = e.target.closest('.action-btn');
    const sendBtn = e.target.closest('.btn-send-comment');
    const moreBtn = e.target.closest('[data-action="toggle-options"]');
    const deleteBtn = e.target.closest('[data-action="delete-post"]');
    const editBtn = e.target.closest('[data-action="edit-post"]');

    if (moreBtn) {
        const menu = moreBtn.nextElementSibling;
        if (menu) menu.classList.toggle('active');
        return;
    }

    if (deleteBtn) {
        handlePostDelete(deleteBtn);
        return;
    }

    if (editBtn) {
        handlePostEdit(editBtn);
        return;
    }

    if (sendBtn) {
        handleCommentSubmit(sendBtn);
        return;
    }

    if (!btn) return;

    const card = btn.closest('.social-card');
    const postId = card.dataset.id;
    const action = btn.dataset.action;

    // Get current user
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) {
        alert("Please log in to interact with posts!");
        return;
    }

    // Add ripple click effect
    btn.style.transform = "scale(0.95)";
    setTimeout(() => btn.style.transform = "", 150);

    if (action === 'like') {
        const icon = btn.querySelector('i');
        const counterContainer = card.querySelector('.like-counter');
        const counterEl = counterContainer.querySelector('b');
        const heartIcon = counterContainer.querySelector('i');

        let currentCount = parseInt(counterEl.textContent);
        const isLiked = btn.classList.contains('liked');

        // Optimistic UI Update
        if (isLiked) {
            btn.classList.remove('liked');
            icon.classList.replace('fas', 'far');
            currentCount = Math.max(0, currentCount - 1);
            updateLikeStatus(postId, currentUser);

            if (currentCount === 0) heartIcon.style.color = 'var(--text-tertiary)';
        } else {
            btn.classList.add('liked');
            icon.classList.replace('far', 'fas');
            currentCount++;
            updateLikeStatus(postId, currentUser);

            heartIcon.style.color = '#ef4444';
            heartIcon.style.animation = 'none';
            heartIcon.offsetHeight;
            heartIcon.style.animation = 'pop 0.4s ease';
        }
        counterEl.textContent = currentCount;
    }

    if (action === 'comment') {
        const commentSection = document.getElementById(`comments-${postId}`);
        if (commentSection) {
            const isHidden = commentSection.style.display === 'none';
            commentSection.style.display = isHidden ? 'block' : 'none';
            if (isHidden) {
                const input = commentSection.querySelector('.comment-input');
                if (input) input.focus();
            }
        }
    }

    if (action === 'share') {
        handleShare(card);
    }
}

async function handleShare(card) {
    const postId = card.dataset.id;
    const author = card.querySelector('.user-name').textContent;
    const text = card.querySelector('.card-content p') ? card.querySelector('.card-content p').textContent : 'Check out this post!';

    // Construct deep link (assuming we have logic for ?postId=XYZ)
    const shareUrl = `${window.location.origin}/index.html?postId=${postId}`;
    const shareData = {
        title: `Post by ${author} | G-Network`,
        text: `"${text.substring(0, 50)}..."`,
        url: shareUrl
    };

    try {
        if (navigator.share) {
            await navigator.share(shareData);
        } else {
            await navigator.clipboard.writeText(shareUrl);
            alert('Link copied to clipboard!'); // We will upgrade this to Toast later
        }
    } catch (err) {
        console.error('Error sharing:', err);
    }
}

// === Lightbox Logic ===
const lightbox = document.getElementById('lightbox-modal');
if (lightbox) {
    const lightboxImg = document.getElementById('lightbox-img');
    const closeBtn = document.querySelector('.close-lightbox');

    // Close on click
    if (closeBtn) closeBtn.onclick = () => lightbox.style.display = "none";
    lightbox.onclick = (e) => {
        if (e.target === lightbox) lightbox.style.display = "none";
    };

    // Global listener for dynamic images
    document.addEventListener('click', (e) => {
        if (e.target.closest('.card-media img')) {
            const img = e.target;
            lightbox.style.display = "block";
            lightboxImg.src = img.src;
        }
    });
}


async function handleCommentSubmit(btn) {
    const postId = btn.dataset.postId;
    const card = btn.closest('.social-card');
    const input = card.querySelector('.comment-input');
    const text = input.value.trim();

    const currentUser = firebase.auth().currentUser;
    if (!currentUser) {
        alert("Log in to comment");
        return;
    }

    if (!text) return;

    // Disable input and button
    input.disabled = true;
    btn.disabled = true;

    try {
        const response = await fetch(`${API_URL}/${postId}/comment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUser.uid,
                userName: currentUser.displayName || currentUser.email.split('@')[0],
                userAvatar: currentUser.photoURL,
                text: text
            })
        });

        if (response.ok) {
            const comment = await response.json();
            addCommentToUI(postId, comment);
            input.value = '';
        }
    } catch (err) {
        console.error("Comment error:", err);
    } finally {
        input.disabled = false;
        btn.disabled = false;
    }
}

function addCommentToUI(postId, comment) {
    const commentSection = document.getElementById(`comments-${postId}`);
    const list = commentSection.querySelector('.comments-list');
    const noComments = list.querySelector('.no-comments');
    if (noComments) noComments.remove();

    const div = document.createElement('div');
    div.className = 'comment-item';
    div.style.cssText = 'margin-bottom: 12px; display: flex; gap: 10px; animation: slideIn 0.3s ease;';
    div.innerHTML = `
        <img src="${comment.userAvatar || './images/default-avatar.png'}" class="user-avatar-sm" style="width:30px; height:30px;">
        <div class="comment-bubble" style="background: rgba(255,255,255,0.05); padding: 8px 12px; border-radius: 15px; flex: 1;">
            <h5 style="margin: 0; font-size: 0.85rem; color: var(--primary);">${comment.userName}</h5>
            <p style="margin: 3px 0 0 0; font-size: 0.9rem;">${comment.text}</p>
        </div>
    `;
    list.appendChild(div);
    list.scrollTop = list.scrollHeight;
}

async function updateLikeStatus(postId, user) {
    try {
        await fetch(`${API_URL}/${postId}/like`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: user.uid,
                userName: user.displayName || user.email.split('@')[0],
                userAvatar: user.photoURL
            })
        });
    } catch (error) {
        console.error("Error updating likes:", error);
    }
}
// Expose globally for create-post.js
window.loadFeed = loadFeed;
window.loadTrendingTags = loadTrendingTags;

// --- Management Functions (Phase 13.5) ---

async function handlePostDelete(btn) {
    const card = btn.closest('.social-card');
    const postId = card.dataset.id;
    const currentUser = firebase.auth().currentUser;

    if (!confirm("Are you sure you want to delete this post? This action cannot be undone.")) return;

    try {
        const response = await fetch(`${API_URL}/${postId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.uid })
        });

        if (response.ok) {
            // Remove from UI with animation
            card.style.animation = "fadeIn 0.3s ease reverse forwards";
            setTimeout(() => card.remove(), 300);

            // Refresh trends in case hashtags were removed
            if (window.loadTrendingTags) window.loadTrendingTags();
        } else {
            const data = await response.json();
            alert("Error: " + (data.message || "Failed to delete post"));
        }
    } catch (err) {
        console.error("Delete error:", err);
        alert("Failed to connect to server");
    }
}

async function handlePostEdit(btn) {
    const card = btn.closest('.social-card');
    if (!card) return;

    const postId = card.dataset.id;
    const contentArea = card.querySelector('.card-content');
    const mediaArea = card.querySelector('.card-media');
    if (!contentArea) return;

    const p = contentArea.querySelector('p');
    const originalText = p ? p.textContent : "";
    const originalContentHTML = contentArea.innerHTML;
    const originalMediaHTML = mediaArea ? mediaArea.innerHTML : "";

    // Toggle menu off
    const menu = card.querySelector('.post-options-menu');
    if (menu) menu.classList.remove('active');

    // Switch to edit mode
    contentArea.innerHTML = `
        <textarea class="edit-textarea" rows="1" style="min-height: 40px; overflow: hidden;">${originalText}</textarea>
        <div class="edit-media-actions" style="margin: 10px 0; display: flex; gap: 10px;">
            <button class="btn-change-photo" style="background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); color: var(--text-primary); padding: 5px 12px; border-radius: 8px; cursor: pointer; font-size: 0.85rem;">
                <i class="fas fa-camera"></i> Change Photo
            </button>
            ${originalMediaHTML ? `
            <button class="btn-remove-photo" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #ef4444; padding: 5px 12px; border-radius: 8px; cursor: pointer; font-size: 0.85rem;">
                <i class="fas fa-trash"></i> Remove
            </button>` : ''}
            <input type="file" class="edit-file-input" accept="image/*" style="display: none;">
        </div>
        <div class="edit-actions" style="margin-top: 10px; display: flex; justify-content: flex-end; gap: 10px;">
            <button class="btn-cancel-edit" style="background: none; border: none; color: #64748b; cursor: pointer; font-size: 0.9rem; font-weight: 600;">Cancel</button>
            <button class="btn-save-edit" style="background: var(--primary); color: white; border: none; padding: 6px 16px; border-radius: 8px; cursor: pointer; font-size: 0.9rem; font-weight: 600; transition: opacity 0.2s;">Save</button>
        </div>
    `;

    const textarea = contentArea.querySelector('.edit-textarea');
    const saveBtn = contentArea.querySelector('.btn-save-edit');
    const cancelBtn = contentArea.querySelector('.btn-cancel-edit');
    const fileInput = contentArea.querySelector('.edit-file-input');
    const changePhotoBtn = contentArea.querySelector('.btn-change-photo');
    const removePhotoBtn = contentArea.querySelector('.btn-remove-photo');

    let pendingImage = null;
    let imageRemoved = false;

    // Auto-expand textarea
    const autoExpand = () => {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    };
    textarea.addEventListener('input', autoExpand);
    autoExpand();
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);

    // Media Logic
    changePhotoBtn.onclick = () => fileInput.click();

    if (removePhotoBtn) {
        removePhotoBtn.onclick = () => {
            imageRemoved = true;
            if (mediaArea) mediaArea.style.display = 'none';
            removePhotoBtn.style.display = 'none';
        };
    }

    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            pendingImage = file;
            imageRemoved = false;

            // Create preview
            const reader = new FileReader();
            reader.onload = (prev) => {
                if (mediaArea) {
                    mediaArea.style.display = 'block';
                    mediaArea.innerHTML = `<img src="${prev.target.result}" alt="Preview" style="max-height: 300px; width: 100%; object-fit: cover; border-radius: 12px;">`;
                } else {
                    const newMedia = document.createElement('div');
                    newMedia.className = 'card-media';
                    newMedia.innerHTML = `<img src="${prev.target.result}" alt="Preview" style="max-height: 300px; width: 100%; object-fit: cover; border-radius: 12px;">`;
                    card.insertBefore(newMedia, contentArea.nextSibling);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    cancelBtn.onclick = () => {
        contentArea.innerHTML = originalContentHTML;
        if (mediaArea) {
            mediaArea.style.display = 'block';
            mediaArea.innerHTML = originalMediaHTML;
        } else {
            const addedMedia = card.querySelector('.card-media');
            if (addedMedia && !originalMediaHTML) addedMedia.remove();
        }
    };

    saveBtn.onclick = async () => {
        const newText = textarea.value.trim();
        const currentUser = firebase.auth().currentUser;
        if (!currentUser) return;

        // Loading state
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        try {
            const formData = new FormData();
            formData.append('userId', currentUser.uid);
            formData.append('description', newText);
            if (pendingImage) formData.append('image', pendingImage);
            if (imageRemoved) formData.append('removeImage', 'true');

            const response = await fetch(`${API_URL}/${postId}`, {
                method: 'PUT',
                body: formData
            });

            if (response.ok) {
                const updatedPost = await response.json();

                // Update text
                contentArea.innerHTML = `<p>${updatedPost.description}</p>`;

                // Update media area
                const currentMedia = card.querySelector('.card-media');
                if (updatedPost.image) {
                    const imgUrl = updatedPost.image.startsWith('http') ? updatedPost.image : `${CONFIG.API_BASE_URL}${updatedPost.image}`;
                    if (currentMedia) {
                        currentMedia.style.display = 'block';
                        currentMedia.innerHTML = `<img src="${imgUrl}" alt="Post Content" loading="lazy">`;
                    } else {
                        const newMedia = document.createElement('div');
                        newMedia.className = 'card-media';
                        newMedia.innerHTML = `<img src="${imgUrl}" alt="Post Content" loading="lazy">`;
                        card.insertBefore(newMedia, contentArea.nextSibling);
                    }
                } else if (currentMedia) {
                    currentMedia.remove();
                }

                // Update 'Edited' badge
                const dateEl = card.querySelector('.timestamp');
                if (dateEl && !dateEl.querySelector('.edited-label')) {
                    dateEl.innerHTML += ` <span class="edited-label" title="Just edited"> • Edited</span>`;
                }

                if (window.loadTrendingTags) window.loadTrendingTags();
            } else {
                alert("Failed to save changes");
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save';
            }
        } catch (err) {
            console.error("Edit error:", err);
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save';
        }
    };

    textarea.onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            saveBtn.click();
        }
        if (e.key === 'Escape') {
            cancelBtn.click();
        }
    };
}
