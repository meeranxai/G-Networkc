import React from 'react';
import { getMediaUrl } from '../../api/config';

const ProfileGridItem = ({ post }) => {
    // Fix image URL using helper
    const imgUrl = getMediaUrl(post.image);

    return (
        <div className="grid-post" style={{ backgroundImage: `url(${imgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', height: '300px' }}>
            {/* Original HTML used img tag inside, but CSS background is easier for grid. Let's stick to original HTML structure for exact CSS match though */}
            <img src={imgUrl} alt="Post" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'none' }} />

            <div className="post-overlay">
                <div className="overlay-stat"><i className="fas fa-heart"></i> {post.likes?.length || 0}</div>
                <div className="overlay-stat"><i className="fas fa-comment"></i> {post.comments?.length || 0}</div>
            </div>
        </div>
    );
};

export default ProfileGridItem;
