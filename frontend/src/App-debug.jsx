import React from 'react';

function App() {
  console.log("🚀 React 18 Test App Loading...");
  
  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white'
    }}>
      <h1>🔧 G-Network React 18 Test</h1>
      <p>Testing with stable React 18 and Vite 4</p>
      <div style={{ 
        background: 'rgba(255,255,255,0.1)', 
        padding: '20px', 
        borderRadius: '10px',
        margin: '20px auto',
        maxWidth: '400px'
      }}>
        <h3>✅ Stable Version Test</h3>
        <p>React 18.2.0</p>
        <p>Vite 4.4.5</p>
        <p>No TypeScript conflicts</p>
        <p>Standard JSX syntax</p>
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
          console.log("Button clicked - React 18 working!");
          alert('React 18 test successful!');
        }}
      >
        Test React 18
      </button>
    </div>
  );
}

export default App;