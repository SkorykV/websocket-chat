const Session = require('./session');

function generateCookieValue(key, value) {
  const expire = new Date();
  expire.setFullYear(expire.getFullYear() + 100);
  return `${key}=${value}; Path=/; Expires=${expire.toUTCString()}; HttpOnly;`;
}

class Client {
  constructor(req, res) {
    this.req = req;
    this.res = res;
    this.token = null;
    this.session = null;
    this.newCookies = {};
  }

  static async retreiveClient(req, res) {
    const client = new Client(req, res);
    const cookies = client.parseCookies();

    if (cookies.token) {
      client.token = cookies.token;
      await Session.load(client);
    }

    return client;
  }

  parseCookies() {
    const cookiesHeader = this.req.headers['cookie'];
    const cookies = {};

    if (!cookiesHeader) {
      return cookies;
    }

    const pairs = cookiesHeader.split('; ');
    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      cookies[key] = value;
    }

    return cookies;
  }

  setCookie(key, value) {
    this.newCookies[key] = generateCookieValue(key, value);
  }

  getNewCookies() {
    return Object.values(this.newCookies);
  }
}

module.exports = Client;
