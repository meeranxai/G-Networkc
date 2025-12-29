import React from 'react'
import ReactDOM from 'react-dom/client'
import AppSimple from './App-simple.jsx'

// Simple CSS reset and basic styles
const simpleStyles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background-color: #ffffff;
    color: #333333;
  }

  button {
    font-family: inherit;
  }

  button:hover {
    opacity: 0.8;
    transition: opacity 0.2s;
  }

  input, select {
    font-family: inherit;
    border: 1px solid #ddd;
    border-radius: 4px;
  }

  input:focus, select:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }
`;

// Inject simple styles
const styleSheet = document.createElement("style");
styleSheet.innerText = simpleStyles;
document.head.appendChild(styleSheet);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppSimple />
  </React.StrictMode>,
)