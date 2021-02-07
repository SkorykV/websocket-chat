const fs = require('fs');
const path = require('path');

const { http_404, http_500, sendHttpError } = require('../errors');

const STATIC_PATH = path.join(process.cwd(), './static');
const MIME_TYPES = {
  html: 'text/html',
  js: 'application/javascript',
  css: 'text/css',
  png: 'image/png',
  ico: 'image/x-icon',
  svg: 'image/svg+xml',
  jpg: 'image/jpeg',
};

function staticHandler(filePath, res) {
  const absoluteFilePath = path.join(STATIC_PATH, filePath);

  if (!absoluteFilePath.startsWith(STATIC_PATH)) {
    sendHttpError(res, http_404);
    return;
  }

  const mime_type = MIME_TYPES[path.extname(absoluteFilePath).substring(1)];
  res.writeHead(200, { 'Content-Type': mime_type });

  const readStream = fs.createReadStream(absoluteFilePath);

  readStream.on('error', error => {
    if (error.code === 'ENOENT') {
      sendHttpError(res, http_404);
    } else {
      sendHttpError(res, http_500);
    }
  });

  readStream.pipe(res);
}

module.exports = staticHandler;
