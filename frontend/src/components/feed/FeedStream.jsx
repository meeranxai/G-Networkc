import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../api/config';
import PostCard from './PostCard';

const FeedStream = () => {
    // Placeholder State - will replace with usePosts hook later
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Mock fetch for now to verify UI
        // In real impl, we fetch from /api/posts
        const fetchPosts = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/posts`);
                const data = await res.json();
                setPosts(data.posts || []);
            } catch (err) {
                console.error("Failed to fetch posts", err);
            } finally {
                setLoading(false);
            }
        };

        fetchPosts();
    }, []);

    if (loading) {
        return (
            <div className="social-card" style={{ padding: '40px', textAlign: 'center' }}>
                <i className="fas fa-circle-notch fa-spin" style={{ fontSize: '2rem', color: 'var(--primary)' }}></i>
                <p style={{ marginTop: '15px', color: '#64748b' }}>Loading community posts...</p>
            </div>
        );
    }

    return (
        <div id="social-feed-stream">
            {posts.map(post => (
                <PostCard key={post._id} post={post} />
            ))}
            {posts.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
                    <p>No posts yet.</p>
                </div>
            )}
        </div>
    );
};

export default FeedStream;
