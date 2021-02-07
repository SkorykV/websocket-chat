const storage = require('./storage');

const LETTERS = 'ABCDEFGHIJQLMNOPQRSTUVWXYZ';
const SMALL_LETTERS = LETTERS.toLowerCase();
const NUMBERS = '123456789';

const TOKEN_SYMBOLS = LETTERS + SMALL_LETTERS + NUMBERS;
const TOKEN_LENGTH = 32;

function generateToken() {
  let token = '';
  for (let i = 0; i < TOKEN_LENGTH; i++) {
    token += TOKEN_SYMBOLS[Math.floor(Math.random() * TOKEN_LENGTH)];
  }
  return token;
}

class Session extends Map {
  static async load(client) {
    if (!client.token) {
      return;
    }

    const session = await storage.load(client.token);
    if (!session) {
      return;
    }

    Object.setPrototypeOf(session, Session.prototype);
    session.token = client.token;
    client.session = session;
  }

  static async createSession(client) {
    const token = generateToken();
    const session = await storage.create(token);
    Object.setPrototypeOf(session, Session.prototype);
    session.token = token;

    client.token = token;
    client.setCookie('token', token);
    client.session = session;
  }

  async save() {
    await storage.save(this.token);
  }
}

module.exports = Session;
