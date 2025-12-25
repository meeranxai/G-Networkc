import React from 'react';
import { getMediaUrl } from '../../api/config';
import { useAuth } from '../../contexts/AuthContext';

const PostCard = ({ post }) => {
    const { currentUser } = useAuth();
    const isLiked = post.likes && currentUser ? post.likes.includes(currentUser.uid) : false;

    return (
        <article className="social-card" data-id={post._id}>
            <div className="card-header">
                <div className="user-meta">
                    <img src={post.authorAvatar || '/images/default-avatar.png'} alt={post.author} className="user-avatar-sm" />
                    <div className="user-details">
                        <h4>{post.author}</h4>
                        <span className="timestamp">
                            {post.category ? `${post.category} • ` : ''}
                            {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                </div>
                {currentUser?.uid === post.authorId && (
                    <button className="btn-more"><i className="fas fa-ellipsis-h"></i></button>
                )}
            </div>

            <div className="card-content">
                <p>{post.description}</p>
            </div>

            {post.image && (
                <div className="card-media">
                    <img src={getMediaUrl(post.image)} alt="Post Content" loading="lazy" />
                </div>
            )}

            <div className="card-stats">
                <span className="like-counter">
                    <i className={`fas fa-heart`} style={{ color: isLiked ? '#ef4444' : 'var(--text-tertiary)' }}></i>
                    <b>{post.likes?.length || 0}</b> likes
                </span>
                <span>{post.comments?.length || 0} comments</span>
            </div>

            <div className="card-actions">
                <button className={`action-btn ${isLiked ? 'liked' : ''}`}>
                    <i className={`${isLiked ? 'fas' : 'far'} fa-heart`}></i> Like
                </button>
                <button className="action-btn">
                    <i className="far fa-comment-alt"></i> Comment
                </button>
                <button className="action-btn">
                    <i className="far fa-share-square"></i> Share
                </button>
            </div>
        </article>
    );
};

export default PostCard;
