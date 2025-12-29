import React, { useState, useEffect } from 'react';
import { checkAPIHealth, wakeUpBackend } from '../../api/config';

/**
 * Backend Wake-up Component for Railway Sleeping Issue
 * Shows loading state while waking up Railway backend
 */
const BackendWakeup = ({ children }) => {
    const [backendStatus, setBackendStatus] = useState('checking'); // checking, sleeping, awake, error
    const [wakeupProgress, setWakeupProgress] = useState(0);

    useEffect(() => {
        initializeBackend();
    }, []);

    const initializeBackend = async () => {
        console.log('🔍 Checking backend status...');
        
        // First quick check
        const isAwake = await checkAPIHealth(1);
        
        if (isAwake) {
            setBackendStatus('awake');
            return;
        }

        // Backend is sleeping, start wake-up process
        setBackendStatus('sleeping');
        setWakeupProgress(10);

        console.log('😴 Backend is sleeping, waking up...');
        
        // Show progress animation
        const progressInterval = setInterval(() => {
            setWakeupProgress(prev => {
                if (prev >= 90) return 90;
                return prev + 10;
            });
        }, 1000);

        try {
            const wakeupSuccess = await wakeUpBackend();
            
            clearInterval(progressInterval);
            setWakeupProgress(100);
            
            if (wakeupSuccess) {
                setBackendStatus('awake');
                console.log('✅ Backend is now awake!');
            } else {
                setBackendStatus('error');
                console.error('❌ Failed to wake up backend');
            }
        } catch (error) {
            clearInterval(progressInterval);
            setBackendStatus('error');
            console.error('❌ Wake-up error:', error);
        }
    };

    const retryWakeup = () => {
        setBackendStatus('checking');
        setWakeupProgress(0);
        initializeBackend();
    };

    if (backendStatus === 'awake') {
        return children;
    }

    return (
        <div className="backend-wakeup-overlay">
            <div className="backend-wakeup-container">
                <div className="backend-wakeup-content">
                    {backendStatus === 'checking' && (
                        <>
                            <div className="loading-spinner"></div>
                            <h3>🔍 Checking Backend Status...</h3>
                            <p>Verifying server connection</p>
                        </>
                    )}

                    {backendStatus === 'sleeping' && (
                        <>
                            <div className="railway-logo">🚂</div>
                            <h3>😴 Backend is Sleeping</h3>
                            <p>Waking up Railway server...</p>
                            <div className="progress-bar">
                                <div 
                                    className="progress-fill" 
                                    style={{ width: `${wakeupProgress}%` }}
                                ></div>
                            </div>
                            <p className="progress-text">{wakeupProgress}% Complete</p>
                            <small>This may take 10-15 seconds on first visit</small>
                        </>
                    )}

                    {backendStatus === 'error' && (
                        <>
                            <div className="error-icon">❌</div>
                            <h3>Backend Connection Failed</h3>
                            <p>Unable to connect to Railway server</p>
                            <button 
                                className="retry-button"
                                onClick={retryWakeup}
                            >
                                🔄 Retry Connection
                            </button>
                            <small>
                                If this persists, the Railway server may be down.
                                <br />
                                Try refreshing the page in a few minutes.
                            </small>
                        </>
                    )}
                </div>
            </div>

            <style jsx>{`
                .backend-wakeup-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }

                .backend-wakeup-container {
                    background: white;
                    border-radius: 20px;
                    padding: 40px;
                    text-align: center;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                    max-width: 400px;
                    width: 90%;
                    animation: slideUp 0.5s ease-out;
                }

                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .backend-wakeup-content h3 {
                    margin: 20px 0 10px 0;
                    color: #333;
                    font-size: 24px;
                    font-weight: 600;
                }

                .backend-wakeup-content p {
                    color: #666;
                    margin: 10px 0;
                    font-size: 16px;
                }

                .backend-wakeup-content small {
                    color: #888;
                    font-size: 14px;
                    line-height: 1.4;
                }

                .loading-spinner {
                    width: 50px;
                    height: 50px;
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #667eea;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 20px auto;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                .railway-logo {
                    font-size: 60px;
                    margin-bottom: 20px;
                    animation: bounce 2s infinite;
                }

                @keyframes bounce {
                    0%, 20%, 50%, 80%, 100% {
                        transform: translateY(0);
                    }
                    40% {
                        transform: translateY(-10px);
                    }
                    60% {
                        transform: translateY(-5px);
                    }
                }

                .error-icon {
                    font-size: 60px;
                    margin-bottom: 20px;
                }

                .progress-bar {
                    width: 100%;
                    height: 8px;
                    background: #f0f0f0;
                    border-radius: 4px;
                    overflow: hidden;
                    margin: 20px 0 10px 0;
                }

                .progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #667eea, #764ba2);
                    border-radius: 4px;
                    transition: width 0.3s ease;
                }

                .progress-text {
                    font-weight: 600;
                    color: #667eea;
                    margin: 5px 0 15px 0;
                }

                .retry-button {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 25px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    margin: 20px 0 10px 0;
                    transition: transform 0.2s ease;
                }

                .retry-button:hover {
                    transform: translateY(-2px);
                }

                .retry-button:active {
                    transform: translateY(0);
                }
            `}</style>
        </div>
    );
};

export default BackendWakeup;