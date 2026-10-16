'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const port = Number(process.env.PORT || 4173);
const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'application/javascript; charset=utf-8']],
  ['/schedule-core.js', ['schedule-core.js', 'application/javascript; charset=utf-8']],
  ['/logo.png', ['logo.png', 'image/png']],
]);
const server = http.createServer((request, response) => {
  const file = files.get(new URL(request.url, 'http://localhost').pathname);
  if (!file) { response.writeHead(404); response.end('Not found'); return; }
  if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return; }
  fs.readFile(path.join(root, file[0]), (error, content) => {
    if (error) { response.writeHead(500); response.end('Could not read file'); return; }
    response.writeHead(200, { 'Content-Type': file[1], 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : content);
  });
});
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE' ? `Port ${port} is busy. Set PORT to another port, or open index.html directly.` : error.message);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => console.log(`summerschedule is ready at http://127.0.0.1:${port}`));
