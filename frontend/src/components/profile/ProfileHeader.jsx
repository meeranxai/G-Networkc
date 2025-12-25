import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getMediaUrl } from '../../api/config';

const ProfileHeader = ({ user, stats, isOwnProfile }) => {
    return (
        <header className="profile-header">
            <div className="header-avatar-col">
                <img src={getMediaUrl(user?.photoURL) || '/images/default-avatar.png'} alt="Profile" className="profile-avatar-lg" />
            </div>

            <div className="header-info-col">
                <div className="profile-title-row">
                    <h2 className="profile-username">{user?.displayName || 'G-Network User'}</h2>
                    <div className="profile-actions">
                        {isOwnProfile ? (
                            <>
                                <button className="btn-profile-edit">Edit Profile</button>
                                <button className="btn-settings"><i className="fas fa-cog"></i></button>
                            </>
                        ) : (
                            <button className="btn-follow-toggle">Follow</button>
                        )}
                    </div>
                </div>

                <ul className="profile-stats-row">
                    <li className="stat-item"><strong id="post-count">{stats?.postsCount || 0}</strong> posts</li>
                    <li className="stat-item"><strong>{stats?.followersCount || 0}</strong> followers</li>
                    <li className="stat-item"><strong>{stats?.followingCount || 0}</strong> following</li>
                </ul>

                <div className="profile-bio">
                    <span className="bio-name">{user?.displayName}</span>
                    <p>{user?.bio || 'No bio yet.'}</p>
                    <a href="#" className="bio-link">g-network.com</a>
                </div>
            </div>
        </header>
    );
};

export default ProfileHeader;
