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

const wss = new WebSocket.Server({ server });

wss.on('connection', async (socket, req) => {
  // broadcastMessage(wss, 'Someone connected to the chat');

  socket.on('message', messageText => {
    const message = JSON.stringify({
      username: 'Volodymyr',
      avatar: 'images/avatars/pikachu.jpg',
      color: 'blue',
      data: messageText,
    });
    broadcastMessage(wss, message);
  });
});

function broadcastMessage(server, message) {
  sendMessage(server.clients, message);
}

function sendMessage(clients, message) {
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

function sendToOthers(server, sender, message) {
  const recepients = [...server.clients].filter(client => client !== sender);
  sendMessage(recepients, message);
}

server.listen(8000, () => {
  console.log('Server is listening');
});
