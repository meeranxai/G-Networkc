
import CONFIG from './config.js';

let debounceTimer;

document.addEventListener("DOMContentLoaded", () => {
    // Tab Switching
    const tabs = document.querySelectorAll('.explore-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const target = tab.dataset.tab;
            document.getElementById('people-grid').style.display = target === 'people' ? 'grid' : 'none';
            document.getElementById('posts-grid').style.display = target === 'posts' ? 'block' : 'none';

            // Trigger load if empty
            if (target === 'posts' && document.getElementById('posts-grid').children.length === 0) {
                loadTrendingPosts();
            }
        });
    });

    // Search Input
    const searchInput = document.getElementById('explore-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            const query = e.target.value.trim();

            if (query.length === 0) {
                loadSuggestedUsers();
                return;
            }

            debounceTimer = setTimeout(() => {
                performSearch(query);
            }, 300);
        });

        // Load suggestions initially
        loadSuggestedUsers();
    }
});

async function performSearch(query) {
    const peopleGrid = document.getElementById('people-grid');
    peopleGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;"><i class="fas fa-spinner fa-spin"></i> Searching...</div>';

    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/users/search/${query}`);
        const users = await response.json();

        peopleGrid.innerHTML = '';
        if (users.length === 0) {
            peopleGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#64748b;">No users found</div>';
            return;
        }

        renderUsers(users);
    } catch (err) {
        console.error("Search error:", err);
        peopleGrid.innerHTML = '<div style="text-align:center;color:red;">Error searching</div>';
    }
}

async function loadSuggestedUsers() {
    const peopleGrid = document.getElementById('people-grid');
    // Using 'online' as a proxy for suggestions for now
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/users/online`);
        const users = await response.json();

        peopleGrid.innerHTML = '';
        if (users.length === 0) {
            peopleGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px;">No suggestions available right now. Try searching!</div>';
            return;
        }

        renderUsers(users);
    } catch (err) {
        console.warn("Could not load suggestions", err);
    }
}

async function loadTrendingPosts() {
    const postsGrid = document.getElementById('posts-grid');
    postsGrid.innerHTML = '<div style="text-align:center;padding:20px;"><i class="fas fa-spinner fa-spin"></i> Loading posts...</div>';

    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/posts`);
        const posts = await response.json();

        postsGrid.innerHTML = '';
        if (posts.length === 0) {
            postsGrid.innerHTML = '<p style="text-align:center">No posts found.</p>';
            return;
        }

        posts.forEach(post => {
            const div = document.createElement('div');
            div.className = 'masonry-item social-card';
            // Simplified Card
            div.innerHTML = `
                <div class="card-header" style="padding:15px;">
                    <img src="${post.userAvatar || './images/default-avatar.png'}" class="user-avatar-sm">
                    <div class="user-info">
                        <span class="user-name-small">${post.userName}</span>
                        <span class="post-time">${new Date(post.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="card-content" style="padding:0 15px 15px;">
                    ${post.text ? `<p>${post.text.substring(0, 100)}${post.text.length > 100 ? '...' : ''}</p>` : ''}
                    ${post.image ? `<img src="${post.image.startsWith('http') ? post.image : CONFIG.API_BASE_URL + post.image}" style="width:100%;border-radius:8px;margin-top:10px;">` : ''}
                </div>
             `;
            postsGrid.appendChild(div);
        });

    } catch (err) {
        console.error("Error loading posts", err);
        postsGrid.innerHTML = '<p style="text-align:center;color:red">Failed to load posts.</p>';
    }
}

function renderUsers(users) {
    const peopleGrid = document.getElementById('people-grid');
    users.forEach(user => {
        const card = document.createElement('div');
        card.className = 'user-card-explore';
        card.innerHTML = `
            <img src="${user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=random`}" class="explore-user-avatar">
            <h3 style="margin-bottom:5px;font-size:1.1rem;">${user.displayName}</h3>
            <p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:15px;height:40px;overflow:hidden;">${user.bio || 'Member'}</p>
            <button class="btn-post-minimal" style="width:100%;">View Profile</button>
        `;

        card.onclick = () => {
            window.location.href = `./profile.html?uid=${user.firebaseUid}`;
        };
        peopleGrid.appendChild(card);
    });
}
