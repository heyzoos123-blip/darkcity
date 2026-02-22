// Simple HTTP server for darkcity viewer
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
};

const server = http.createServer((req, res) => {
    let filePath = req.url === '/' ? '/arena3d.html' : req.url;
    filePath = path.join(__dirname, filePath);

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('404 - Not Found');
            return;
        }

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('DARKCITY COMBAT VIEWER');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`\n🔴 Server running at: http://localhost:${PORT}`);
    console.log('\nPress Ctrl+C to stop\n');
});
