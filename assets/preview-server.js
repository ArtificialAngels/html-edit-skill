// 本地静态预览服务器（仅本机访问）
// 用法: node preview-server.js   然后浏览器打开 http://127.0.0.1:8765/
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = 8765;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp4': 'video/mp4'
};

const server = http.createServer(function (req, res) {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/presentation.html';

  // 防目录穿越
  const filePath = path.normalize(path.join(ROOT, urlPath));
  if (filePath.indexOf(ROOT) !== 0) {
    res.writeHead(403);
    res.end('forbidden');
    return;
  }

  fs.readFile(filePath, function (err, data) {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 not found: ' + urlPath);
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
});

server.on('error', function (err) {
  if (err.code === 'EADDRINUSE') {
    console.log('端口 ' + PORT + ' 已被占用，服务器可能已在运行。');
    console.log('直接打开: http://127.0.0.1:' + PORT + '/presentation.html');
  } else {
    console.error('启动失败:', err.message);
  }
});

server.listen(PORT, '127.0.0.1', function () {
  console.log('预览服务器已启动: http://127.0.0.1:' + PORT + '/presentation.html');
  console.log('按 Ctrl+C 停止');
});
