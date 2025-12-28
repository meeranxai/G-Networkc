import React from 'react';

function App() {
  console.log("🚀 App-debug is loading...");
  
  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white'
    }}>
      <h1>🔧 G-Network Debug Mode</h1>
      <p>If you can see this, React is working!</p>
      <div style={{ 
        background: 'rgba(255,255,255,0.1)', 
        padding: '20px', 
        borderRadius: '10px',
        margin: '20px auto',
        maxWidth: '400px'
      }}>
        <h3>✅ Debug Test Successful</h3>
        <p>React app is loading properly</p>
        <p>Vite build is working</p>
        <p>Vercel deployment is active</p>
      </div>
      <button 
        style={{
          background: '#4CAF50',
          color: 'white',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '16px'
        }}
        onClick={() => {
          console.log("Button clicked!");
          alert('Debug mode is working!');
        }}
      >
        Test Click
      </button>
      
      <div style={{ marginTop: '20px', fontSize: '14px' }}>
        <p>Environment: {import.meta.env.MODE}</p>
        <p>API URL: {import.meta.env.VITE_API_URL || 'Not set'}</p>
      </div>
    </div>
  );
}

export default App;