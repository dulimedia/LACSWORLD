import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server = http.createServer((req, res) => {
  let filePath;
  
  // Decode URL to handle spaces and special characters
  const decodedUrl = decodeURIComponent(req.url);
  
  // Serve from dist directory (built files)
  if (decodedUrl === '/') {
    filePath = path.join(__dirname, 'dist', 'index.html');
  } else if (decodedUrl.startsWith('/assets/')) {
    filePath = path.join(__dirname, 'dist', decodedUrl);
  } else if (decodedUrl.startsWith('/models/')) {
    // Serve 3D models from public directory
    filePath = path.join(__dirname, 'public', decodedUrl);
  } else if (decodedUrl.startsWith('/public/')) {
    // Serve from public directory for other assets
    filePath = path.join(__dirname, decodedUrl);
  } else if (fs.existsSync(path.join(__dirname, 'public', decodedUrl.substring(1)))) {
    // Check if file exists in public directory
    filePath = path.join(__dirname, 'public', decodedUrl.substring(1));
  } else {
    // Default to dist directory
    filePath = path.join(__dirname, 'dist', decodedUrl);
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm',
    '.glb': 'model/gltf-binary',
    '.hdr': 'application/octet-stream'
  };

  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1><p>File: ' + filePath + '</p>');
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + error.code);
      }
    } else {
      res.writeHead(200, { 
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache'
      });
      res.end(content, 'utf-8');
    }
  });
});

const PORT = 3092;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Development server running on http://localhost:${PORT}`);
  console.log(`Serving files from: ${__dirname}`);
});