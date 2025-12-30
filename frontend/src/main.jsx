import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Production environment check
if (import.meta.env.PROD) {
  console.log('🚀 G-Network Production Mode');
} else {
  console.log('🔧 G-Network Development Mode');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
