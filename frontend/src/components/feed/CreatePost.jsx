import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const CreatePost = () => {
    const { currentUser } = useAuth();
    const [text, setText] = useState('');

    return (
        <section className="create-composer glass-blur" id="inline-composer">
            <div className="composer-top">
                <img
                    src={currentUser?.photoURL || '/images/default-avatar.png'}
                    alt="User"
                    className="user-avatar-sm"
                    id="composer-avatar"
                />
                <div className="input-wrapper">
                    <textarea
                        id="composer-text"
                        placeholder="What's happening in tech?"
                        rows="1"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                    ></textarea>
                </div>
            </div>

            <div className="composer-actions" id="composer-actions">
                <div className="media-trigger">
                    <button className="action-btn-text icon-photo">
                        <i className="fas fa-image"></i> <span>Photo</span>
                    </button>
                    <button className="action-btn-text icon-video">
                        <i className="fas fa-video"></i> <span>Video</span>
                    </button>
                </div>
                <button
                    className="btn-post-minimal"
                    id="inline-post-btn"
                    style={{ display: text ? 'block' : 'none' }}
                >
                    Post
                </button>
            </div>
            <input type="file" id="inline-file-input" hidden accept="image/*" />
        </section>
    );
};

export default CreatePost;
