
// Global Error Handler for Debugging Startup Issues
window.onerror = function (msg, url, lineNo, columnNo, error) {
    const loading = document.getElementById('loading-screen');
    if (loading) {
        loading.innerHTML = `
            <div style="background:rgba(0,0,0,0.9); color:red; padding:20px; text-align:left; font-family:monospace;">
                <h3>Startup Error</h3>
                <p><strong>Message:</strong> ${msg}</p>
                <p><strong>File:</strong> ${url.split('/').pop()}:${lineNo}</p>
                <p>Please report this to the developer.</p>
                <button onclick="window.location.reload()" style="background:white; padding:5px 10px;">Retry</button>
            </div>
        `;
    }
    return false;
};

window.addEventListener('unhandledrejection', function (event) {
    console.error('Unhandled rejection (promise):', event.reason);
    // Optional: Display promise errors if critical
});

console.log("Debug loader initialized.");
