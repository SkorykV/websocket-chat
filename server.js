const http = require('http');
const fs = require('fs');
const path = require('path');
const stream = require('stream');
const WebSocket = require('ws');

const { staticHandler, multipartFormHandler } = require('./handlers');

const server = http.createServer((req, res) => {
  if (req.method === 'GET') {
    const filePath = req.url === '/' ? '/index.html' : req.url;
    staticHandler(filePath, res);
  }
  if (req.method === 'POST' && req.url === '/setup') {
    multipartFormHandler(req, res);
  }
});

server.listen(8000, () => {
  console.log('Server is listening');
});
