function App() {
  console.log("🚀 Minimal App is loading...");
  
  return React.createElement('div', {
    style: { 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white'
    }
  }, [
    React.createElement('h1', { key: 'title' }, '🔧 G-Network Minimal Test'),
    React.createElement('p', { key: 'desc' }, 'Testing without any imports or complex structure'),
    React.createElement('div', {
      key: 'box',
      style: { 
        background: 'rgba(255,255,255,0.1)', 
        padding: '20px', 
        borderRadius: '10px',
        margin: '20px auto',
        maxWidth: '400px'
      }
    }, [
      React.createElement('h3', { key: 'success' }, '✅ Minimal Test'),
      React.createElement('p', { key: 'react' }, 'Pure React without JSX'),
      React.createElement('p', { key: 'build' }, 'No TypeScript, no complex imports'),
      React.createElement('p', { key: 'deploy' }, 'Testing Vercel deployment')
    ]),
    React.createElement('button', {
      key: 'btn',
      style: {
        background: '#4CAF50',
        color: 'white',
        border: 'none',
        padding: '10px 20px',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '16px'
      },
      onClick: () => {
        console.log("Button clicked!");
        alert('Minimal test is working!');
      }
    }, 'Test Click')
  ]);
}

export default App;