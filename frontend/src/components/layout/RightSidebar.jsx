import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../api/config';

const RightSidebar = () => {
    const [trends, setTrends] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTrends = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/posts/trending-hashtags`);
                if (res.ok) {
                    const data = await res.json();
                    setTrends(data);
                }
            } catch (err) {
                console.error("Error fetching trends:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchTrends();
    }, []);

    return (
        <aside className="sidebar-right">
            <div className="trending-box glass-blur">
                <h3>Discovery Trends</h3>
                <div id="trending-list">
                    {loading ? (
                        <div className="empty-state">
                            <p>Loading trends...</p>
                        </div>
                    ) : trends.length > 0 ? (
                        <ul className="trending-list">
                            {trends.map((trend, index) => (
                                <li key={index} className="trending-item">
                                    <div className="trend-tag">#{trend.tag}</div>
                                    <div className="trend-count">{trend.count} {trend.count === 1 ? 'post' : 'posts'}</div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="empty-state">
                            <p>No trending topics yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default RightSidebar;
