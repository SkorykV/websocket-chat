const socket = new WebSocket(`ws://localhost:8000/chat`);
document.addEventListener('DOMContentLoaded', ready);

COLOR_CLASSES = {
  blue: 'chat-content-message-text-container__text--blue',
  yellow: 'chat-content-message-text-container__text--yellow',
};

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

  const textContainer = document.createElement('div');
  textContainer.className = 'chat-content-message-text-container';

  const username = document.createElement('div');
  username.className = 'chat-content-message-text-container__username';
  username.textContent = config.username + ':';

  const text = document.createElement('div');
  text.className = 'chat-content-message-text-container__text';
  text.textContent = message;

  const colorClass = COLOR_CLASSES[config.color];

  if (colorClass) {
    text.className += ` ${colorClass}`;
  }

  textContainer.appendChild(username);
  textContainer.appendChild(text);

  messageContainer.appendChild(avatar);
  messageContainer.appendChild(textContainer);

  chat.appendChild(messageContainer);
}
