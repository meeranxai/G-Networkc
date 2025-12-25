import React from 'react';
import CreatePost from '../components/feed/CreatePost';
import FeedStream from '../components/feed/FeedStream';

const Home = () => {
    return (
        <main className="feed-container">
            {/* Mobile Header */}
            <header className="feed-header">
                G-Network
            </header>

            <CreatePost />
            <FeedStream />
        </main>
    );
};

export default Home;
