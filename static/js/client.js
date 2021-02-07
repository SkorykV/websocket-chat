const socket = new WebSocket('ws://127.0.0.1:8000/chat');
const CHAR_RETURN = 13;
document.addEventListener('DOMContentLoaded', ready);

function ready() {
  const chat = document.getElementsByClassName('chat-content')[0];
  const chatInput = document.getElementsByClassName(
    'chat-control-form__input'
  )[0];

  socket.onmessage = function (message) {
    const parsedMessage = JSON.parse(message.data);
    const config = {
      color: parsedMessage.color,
      username: parsedMessage.username,
      avatar: parsedMessage.avatar,
    };
    printMessage(chat, parsedMessage.data, config);
    chat.scrollTop = chat.scrollHeight;
  };

  socket.onclose = function () {
    // printMessage(chat, 'disconnected');
  };

  document.forms.chat.onsubmit = function () {
    if (chatInput.value) {
      socket.send(chatInput.value);
      chatInput.value = '';
    }
    return false;
  };
}

function printMessage(chat, message, config) {
  const messageContainer = document.createElement('div');
  messageContainer.className = 'chat-content-message';

  const avatar = document.createElement('img');
  avatar.className = 'chat-content-message__image';
  avatar.setAttribute('src', config.avatar);

  const username = document.createElement('div');
  username.className = 'chat-content-message__username';
  username.textContent = config.username + ':';

  const text = document.createElement('div');
  text.className = 'chat-content-message__text';
  text.textContent = message;

  messageContainer.appendChild(avatar);
  messageContainer.appendChild(username);
  messageContainer.appendChild(text);

  chat.appendChild(messageContainer);
}
