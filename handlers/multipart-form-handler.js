const stream = require('stream');

const { http_500, sendHttpError } = require('../errors');
const MultipartFormParser = require('../utils/streams/parse-multipart-form');

function multipartFormHandler(req, res) {
  const boundary = req.headers['content-type'].split('; ')[1].split('=')[1];

  stream.pipeline(req, new MultipartFormParser(boundary), error => {
    if (error) {
      console.log('Something went wrong during form parsing');
      sendHttpError(res, http_500);
      return;
    }
    res.writeHead(302, {
      Location: 'chat.html',
    });
    res.end();
  });
}

module.exports = multipartFormHandler;
