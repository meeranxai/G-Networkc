const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5174;
const PUBLIC_DIR = path.join(__dirname, 'public');

// MIME types
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

const server = http.createServer((req, res) => {
  // Log request
  console.log(`${req.method} ${req.url}`);

  // Parse URL
  let filePath = path.join(PUBLIC_DIR, req.url);

  // If it's a directory or root, serve index.html
  if (req.url === '/' || req.url === '') {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  }

  // Get file extension
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  // Read and serve file
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // If file not found, try to serve index.html (for SPA routing)
      if (err.code === 'ENOENT' && !ext) {
        fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err2, data2) => {
          if (err2) {
            res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end('<h1>404 - File Not Found</h1>', 'utf-8');
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(data2);
        });
        return;
      }

      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>404 - File Not Found</h1>', 'utf-8');
      return;
    }

    // Set headers
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*'
    });

    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║     🚀 G-Network Frontend Server       ║
╠════════════════════════════════════════╣
║  Server: http://localhost:${PORT}       ║
║  Directory: ${PUBLIC_DIR}
║  Status: ✅ Running                    ║
╚════════════════════════════════════════╝
  `);
  console.log('Press Ctrl+C to stop the server');
});