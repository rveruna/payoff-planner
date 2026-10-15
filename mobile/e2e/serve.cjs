const http = require('http'),
  fs = require('fs'),
  path = require('path');
const root = process.argv[2],
  port = Number(process.argv[3] || 4176),
  base = '/payoff-planner/app';
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
};
http
  .createServer((q, r) => {
    let u = decodeURIComponent(new URL(q.url, 'http://x').pathname);
    if (u.startsWith(base)) u = u.slice(base.length) || '/';
    let f = path.join(root, u);
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(root, 'index.html');
    r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(r);
  })
  .listen(port, () => console.log('up'));
