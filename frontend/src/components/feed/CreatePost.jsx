import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../api/config';

const CreatePost = () => {
    const { currentUser } = useAuth();
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');

    const handlePost = async () => {
        setStatusMsg("Processing...");
        console.log("Attempting to post. User:", currentUser, "Text:", text);

        if (!text.trim()) {
            setStatusMsg("Please write something!");
            return;
        }
        if (!currentUser) {
            setStatusMsg("Not logged in. Please wait...");
            return;
        }

        setLoading(true);

        try {
            const token = await currentUser.getIdToken();

            // Backend uses Multer (Upload), so we must use FormData
            const formData = new FormData();
            formData.append('description', text);
            formData.append('authorId', currentUser.uid);
            formData.append('author', currentUser.displayName || 'User');
            formData.append('authorAvatar', currentUser.photoURL || '');
            // formData.append('image', file); // Future media support

            const response = await fetch(`${API_BASE_URL}/api/posts`, {
                method: 'POST',
                headers: {
                    // 'Content-Type': 'multipart/form-data', // Skip content-type for FormData (let browser set boundary)
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (response.ok) {
                setText('');
                setStatusMsg("Success! Reloading...");
                setTimeout(() => window.location.reload(), 1000);
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error('Post failed', errorData);
                const msg = errorData.message || (await response.text()).substring(0, 100) || response.statusText;
                setStatusMsg(`Error ${response.status}: ${msg}`);
            }
        } catch (error) {
            console.error('Error posting:', error);
            setStatusMsg(`Network Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

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
                        disabled={loading}
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
                    onClick={handlePost}
                    disabled={loading}
                >
                    {loading ? 'Posting...' : 'Post'}
                </button>
            </div>
            {statusMsg && <div style={{ color: statusMsg.includes('Success') ? 'green' : 'red', padding: '10px', textAlign: 'center', background: 'rgba(0,0,0,0.8)' }}>{statusMsg}</div>}
            <input type="file" id="inline-file-input" hidden accept="image/*" />
        </section>
    );
};

export default CreatePost;
