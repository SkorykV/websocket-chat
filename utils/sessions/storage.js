const fs = require('fs').promises;
const path = require('path');
const { serialize, deserialize } = require('v8');

const STORAGE_PATH = path.join(process.cwd(), './sessions');

const withSavePath = fsFunc => async (token, ...args) => {
  const filePath = path.join(STORAGE_PATH, token);
  if (!filePath.startsWith(STORAGE_PATH)) {
    throw new Error('Someone tryied to find volnurability!!!');
  }

  return await fsFunc(filePath, ...args);
};

const saveRead = withSavePath(fs.readFile);
const saveWrite = withSavePath(fs.writeFile);

class Storage {
  constructor() {
    this.cache = new Map();
  }

  async create(token) {
    const data = new Map();

    this.cache.set(token, data);
    return data;
  }

  async load(token) {
    if (this.cache.has(token)) {
      return this.cache.get(token);
    }

    const data = deserialize(await saveRead(token));
    this.cache.set(token, data);
    return data;
  }

  async save(token) {
    await saveWrite(token, serialize(this.cache.get(token)));
  }
}

module.exports = new Storage();
