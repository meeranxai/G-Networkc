import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../api/config';
import { useAuth } from '../contexts/AuthContext';
import ProfileHeader from '../components/profile/ProfileHeader';
import ProfileGridItem from '../components/profile/ProfileGridItem';

const Profile = () => {
    const { currentUser } = useAuth();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfileData = async () => {
            if (!currentUser) return;
            try {
                // Fetch posts for current user
                // Note: Logic adapted from profile-social.js
                const res = await fetch(`${API_BASE_URL}/api/posts?authorId=${currentUser.uid}`);
                const data = await res.json();
                // API return object { posts: [...] } based on our fix earlier
                setPosts(data.posts || []);
            } catch (err) {
                console.error("Profile fetch error", err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfileData();
    }, [currentUser]);

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Profile...</div>;

    return (
        <main className="feed-container" style={{ width: '100%', maxWidth: '935px' }}>
            <div className="profile-container">
                <ProfileHeader
                    user={currentUser}
                    stats={{ postsCount: posts.length }}
                    isOwnProfile={true}
                />

                <div className="profile-tabs">
                    <a href="#" className="tab-item active"><i className="fas fa-th"></i> POSTS</a>
                    <a href="#" className="tab-item"><i className="fas fa-bookmark"></i> SAVED</a>
                    <a href="#" className="tab-item"><i className="fas fa-user-tag"></i> TAGGED</a>
                </div>

                <div className="posts-grid" id="user-posts-grid">
                    {posts.map(post => (
                        <ProfileGridItem key={post._id} post={post} />
                    ))}
                    {posts.length === 0 && (
                        <div style={{ textAlign: 'center', gridColumn: '1/-1', padding: '40px', color: 'var(--text-secondary)' }}>
                            No posts yet.
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
};

export default Profile;
