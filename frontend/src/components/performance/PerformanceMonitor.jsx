import React, { useEffect, useState, useRef } from 'react';

const PerformanceMonitor = () => {
    const [metrics, setMetrics] = useState({
        memoryUsage: 0,
        connectionCount: 0,
        renderTime: 0,
        bundleSize: 0
    });
    const [isVisible, setIsVisible] = useState(false);
    const renderStartTime = useRef(Date.now());

    useEffect(() => {
        const updateMetrics = () => {
            // Memory usage
            if (performance.memory) {
                setMetrics(prev => ({
                    ...prev,
                    memoryUsage: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024)
                }));
            }

            // Connection count (estimate from network entries)
            const entries = performance.getEntriesByType('navigation');
            const resourceEntries = performance.getEntriesByType('resource');
            
            setMetrics(prev => ({
                ...prev,
                connectionCount: resourceEntries.length,
                renderTime: Date.now() - renderStartTime.current
            }));
        };

        // Update metrics every 5 seconds
        const interval = setInterval(updateMetrics, 5000);
        updateMetrics(); // Initial update

        // Cleanup
        return () => clearInterval(interval);
    }, []);

    // Show/hide with Ctrl+Shift+P
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'P') {
                setIsVisible(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, []);

    if (!isVisible) return null;

    const getMemoryStatus = () => {
        if (metrics.memoryUsage < 50) return { color: '#4CAF50', status: 'Good' };
        if (metrics.memoryUsage < 100) return { color: '#FF9800', status: 'Warning' };
        return { color: '#F44336', status: 'Critical' };
    };

    const memoryStatus = getMemoryStatus();

    return (
        <div style={{
            position: 'fixed',
            top: '10px',
            right: '10px',
            background: 'rgba(0, 0, 0, 0.9)',
            color: 'white',
            padding: '15px',
            borderRadius: '8px',
            fontSize: '12px',
            fontFamily: 'monospace',
            zIndex: 10000,
            minWidth: '200px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
        }}>
            <div style={{ marginBottom: '10px', fontWeight: 'bold', borderBottom: '1px solid #333', paddingBottom: '5px' }}>
                🔍 Performance Monitor
            </div>
            
            <div style={{ marginBottom: '5px' }}>
                <span style={{ color: memoryStatus.color }}>●</span> Memory: {metrics.memoryUsage}MB ({memoryStatus.status})
            </div>
            
            <div style={{ marginBottom: '5px' }}>
                <span style={{ color: metrics.connectionCount > 50 ? '#F44336' : '#4CAF50' }}>●</span> Resources: {metrics.connectionCount}
            </div>
            
            <div style={{ marginBottom: '5px' }}>
                <span style={{ color: '#2196F3' }}>●</span> Render: {metrics.renderTime}ms
            </div>
            
            <div style={{ fontSize: '10px', color: '#888', marginTop: '10px' }}>
                Press Ctrl+Shift+P to toggle
            </div>
        </div>
    );
};

export default PerformanceMonitor;