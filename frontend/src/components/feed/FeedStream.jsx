import React, { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE_URL } from '../../api/config';
import { useAuth } from '../../contexts/AuthContext';
import { useGNavigation } from '../../contexts/NavigationContext';
import PostCard from './PostCard';
import SuggestedReels from './SuggestedReels';

const FeedStream = ({ feedType = 'home' }) => {
    const { currentUser } = useAuth();
    const { setFeedContext } = useGNavigation();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState(null);

    // Refs for cleanup
    const abortControllerRef = useRef(null);
    const timeoutRef = useRef(null);

    // For Infinite Scroll with cleanup
    const observer = useRef();
    const lastPostElementRef = useCallback(node => {
        if (loading || loadingMore) return;
        if (observer.current) observer.current.disconnect();
        
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore && !loadingMore) {
                setPage(prevPage => prevPage + 1);
            }
        }, {
            threshold: 0.1,
            rootMargin: '100px'
        });
        
        if (node) observer.current.observe(node);
    }, [loading, loadingMore, hasMore]);

    const fetchPosts = useCallback(async (pageNum = 1, shouldAppend = false) => {
        try {
            // Cancel previous request
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            
            // Create new abort controller
            abortControllerRef.current = new AbortController();
            
            if (pageNum === 1 && !shouldAppend) {
                setLoading(true);
                setError(null);
            } else {
                setLoadingMore(true);
            }

            const url = new URL(`${API_BASE_URL}/api/posts`);
            url.searchParams.append('page', pageNum);
            url.searchParams.append('limit', 5); // Reduced from 10 to 5
            url.searchParams.append('feedContext', feedType);
            if (currentUser) {
                url.searchParams.append('currentUserId', currentUser.uid);
            }

            // Add timeout
            const timeoutPromise = new Promise((_, reject) => {
                timeoutRef.current = setTimeout(() => reject(new Error('Request timeout')), 10000);
            });

            const fetchPromise = fetch(url, {
                signal: abortControllerRef.current.signal,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const res = await Promise.race([fetchPromise, timeoutPromise]);
            
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }

            const data = await res.json();

            // Handle different response formats from backend
            let postsArray = [];
            let hasMorePosts = false;

            if (Array.isArray(data)) {
                postsArray = data;
                hasMorePosts = data.length >= 5;
            } else if (data && data.posts) {
                postsArray = Array.isArray(data.posts) ? data.posts : [];
                hasMorePosts = data.hasMore || data.posts.length >= 5;
            } else {
                console.warn('Unexpected posts response format:', data);
                postsArray = [];
                hasMorePosts = false;
            }

            // Limit total posts to prevent memory issues
            setPosts(prev => {
                const newPosts = shouldAppend ? [...prev, ...postsArray] : postsArray;
                // Keep only last 50 posts to prevent memory issues
                return newPosts.slice(-50);
            });

            setHasMore(hasMorePosts);
            setError(null);
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error("Failed to fetch posts", err);
                setError(err.message);
            }
        } finally {
            setLoading(false);
            setLoadingMore(false);
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        }
    }, [currentUser, feedType]);

    // Debounced feed context update
    useEffect(() => {
        if (posts.length > 0) {
            const timeoutId = setTimeout(() => {
                setFeedContext(posts, feedType);
            }, 300);
            return () => clearTimeout(timeoutId);
        }
    }, [posts, feedType, setFeedContext]);

    // Initial load
    useEffect(() => {
        setPage(1);
        setPosts([]);
        setError(null);
        fetchPosts(1, false);
    }, [currentUser, feedType, fetchPosts]);

    // Load more pages
    useEffect(() => {
        if (page > 1) {
            fetchPosts(page, true);
        }
    }, [page, fetchPosts]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            if (observer.current) {
                observer.current.disconnect();
            }
        };
    }, []);

    // Error state
    if (error && posts.length === 0) {
        return (
            <div className="card" style={{ 
                padding: '40px', 
                textAlign: 'center', 
                background: 'var(--background-elevated)', 
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--error, #ef4444)'
            }}>
                <i className="fas fa-exclamation-triangle" style={{ 
                    fontSize: '2rem', 
                    color: 'var(--error, #ef4444)', 
                    marginBottom: '15px' 
                }}></i>
                <h3 style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>
                    Failed to load posts
                </h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                    {error}
                </p>
                <button 
                    onClick={() => {
                        setError(null);
                        setPage(1);
                        fetchPosts(1, false);
                    }}
                    style={{
                        padding: '10px 20px',
                        background: 'var(--primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer'
                    }}
                >
                    Try Again
                </button>
            </div>
        );
    }

    // Loading state
    if (loading && posts.length === 0) {
        return (
            <div className="card" style={{ 
                padding: '60px', 
                textAlign: 'center', 
                background: 'var(--background-elevated)', 
                borderRadius: 'var(--radius-xl)' 
            }}>
                <i className="fas fa-circle-notch fa-spin" style={{ 
                    fontSize: '2.5rem', 
                    color: 'var(--primary)', 
                    marginBottom: '15px' 
                }}></i>
                <p style={{ 
                    color: 'var(--text-tertiary)', 
                    fontWeight: 'var(--font-semibold)' 
                }}>
                    Discovering new updates...
                </p>
            </div>
        );
    }

    return (
        <div id="social-feed-stream" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 'var(--space-2)' 
        }}>
            {posts.map((post, index) => {
                if (!post || !post._id) return null;
                
                const showReels = index === 4 && index < posts.length - 1;

                const postElement = (
                    <div 
                        ref={posts.length === index + 1 ? lastPostElementRef : null} 
                        key={`${post._id}-${index}`}
                    >
                        <PostCard
                            post={post}
                            feedType={feedType}
                            onUpdate={(updatedPost) => {
                                setPosts(prev => prev.map(p => 
                                    p._id === updatedPost._id ? updatedPost : p
                                ));
                            }}
                        />
                    </div>
                );

                return (
                    <React.Fragment key={`fragment-${post._id}-${index}`}>
                        {postElement}
                        {showReels && <SuggestedReels key={`reels-${index}`} />}
                    </React.Fragment>
                );
            })}

            {/* Empty state */}
            {posts.length === 0 && !loading && !error && (
                <div className="card" style={{ 
                    textAlign: 'center', 
                    padding: '80px 40px', 
                    background: 'var(--background-elevated)', 
                    borderRadius: 'var(--radius-xl)', 
                    border: '1px dashed var(--border-light)' 
                }}>
                    <div style={{ fontSize: '50px', marginBottom: '20px', opacity: 0.2 }}>
                        <i className="fas fa-stream"></i>
                    </div>
                    <h3 style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>
                        Your feed is empty
                    </h3>
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>
                        Follow more creators or explore trending topics to see what's happening!
                    </p>
                </div>
            )}

            {/* Loading more indicator */}
            {loadingMore && (
                <div style={{ textAlign: 'center', padding: 'var(--space-4) 0' }}>
                    <i className="fas fa-spinner fa-spin" style={{ color: 'var(--primary)' }}></i>
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', marginTop: '8px' }}>
                        Loading more posts...
                    </p>
                </div>
            )}

            {/* End of feed indicator */}
            {!hasMore && posts.length > 0 && (
                <div style={{ textAlign: 'center', padding: 'var(--space-4) 0' }}>
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                        You're all caught up! 🎉
                    </p>
                </div>
            )}
        </div>
    );
};

export default React.memo(FeedStream);
