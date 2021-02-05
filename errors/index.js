module.exports.http_404 = {
  message: 'Not Found',
  statusCode: 404,
};

module.exports.http_500 = {
  message: 'Server Error',
  statusCode: 500,
};

module.exports.sendHttpError = function (res, { message, statusCode }) {
  res.statusCode = statusCode;
  res.end(`"${message}"`);
};
