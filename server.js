const http = require('http');
const fs   = require('fs');
const path = require('path');
const { getHoldings, getTokenBalance } = require('./lib/holdings');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html',
  '.js':   'text/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
};

const CORS = { 'Access-Control-Allow-Origin': '*' };

function serveStatic(req, res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain', ...CORS });
    res.end(data);
  });
}

http.createServer(async (req, res) => {
  const url    = req.url.split('?')[0];
  const qs     = req.url.includes('?') ? req.url.split('?')[1] : '';
  const params = new URLSearchParams(qs);

  if (url === '/api/holdings') {
    const wallets = (params.get('wallets') || '').split(',').map(w => w.trim()).filter(Boolean);
    if (!wallets.length) {
      res.writeHead(400, { 'Content-Type': 'application/json', ...CORS });
      res.end(JSON.stringify({ error: 'missing wallets param' }));
      return;
    }
    try {
      const results = await Promise.all(
        wallets.map(async wallet => {
          const [holdings, tokenBalance] = await Promise.all([
            getHoldings(wallet),
            getTokenBalance(wallet),
          ]);
          return [wallet, { ...holdings, tokenBalance }];
        })
      );
      res.writeHead(200, { 'Content-Type': 'application/json', ...CORS });
      res.end(JSON.stringify(Object.fromEntries(results)));
    } catch (e) {
      res.writeHead(502, { 'Content-Type': 'application/json', ...CORS });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  const filePath = path.join(ROOT, url === '/' ? 'index.html' : url);
  serveStatic(req, res, filePath);

}).listen(PORT, () => {
  console.log(`Dumpster Boys tracker running → http://localhost:${PORT}`);
});
