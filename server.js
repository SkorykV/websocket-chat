const http = require('http');
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

  if (req.url === '/chat.html' && !client.session) {
    client.res.writeHead(302, {
      Location: '/',
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

wss.on('connection', async (socket, request) => {
  // broadcastMessage(wss, 'Someone connected to the chat');
  const client = await Client.retreiveClient(request, socket);

  if (!client.session) {
    socket.close();
    return;
  }

  socket.on('message', messageText => {
    const message = JSON.stringify({
      username: client.session.get('username'),
      avatar: 'images/avatars/' + client.session.get('avatar'),
      color: client.session.get('color'),
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
