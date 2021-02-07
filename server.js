const http = require('http');
const fs = require('fs');
const path = require('path');
const stream = require('stream');
const WebSocket = require('ws');

const Client = require('./utils/sessions/client');
const Session = require('./utils/sessions/session');
const { staticHandler, multipartFormHandler } = require('./handlers');

const server = http.createServer(async (req, res) => {
  const client = await Client.retreiveClient(req, res);

  if ((req.url === '/' || req.url === '/setup') && client.session) {
    client.res.writeHead(302, {
      Location: 'chat.html',
    });
    client.res.end();
    return;
  }

  if (req.method === 'GET') {
    const filePath = req.url === '/' ? '/index.html' : req.url;
    staticHandler(filePath, res);
  }
  if (req.method === 'POST' && req.url === '/setup') {
    await Session.createSession(client);
    multipartFormHandler(client);
  }

  if (client.session) {
    client.session.save();
  }
});

server.listen(8000, () => {
  console.log('Server is listening');
});
