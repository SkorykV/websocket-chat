const stream = require('stream');

const { http_500, sendHttpError } = require('../errors');
const MultipartFormParser = require('../utils/streams/parse-multipart-form');

function multipartFormHandler(client) {
  const boundary = client.req.headers['content-type']
    .split('; ')[1]
    .split('=')[1];

  stream.pipeline(
    client.req,
    new MultipartFormParser(boundary, client),
    error => {
      if (error) {
        console.log('Something went wrong during form parsing');
        sendHttpError(client.res, http_500);
        return;
      }
      client.res.writeHead(302, {
        Location: 'chat.html',
        'Set-Cookie': client.getNewCookies(),
      });
      client.res.end();
    }
  );
}

module.exports = multipartFormHandler;
