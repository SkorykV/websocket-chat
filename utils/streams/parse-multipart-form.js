const stream = require('stream');
const fs = require('fs');
const path = require('path');
const { Buffer } = require('buffer');

const CRLF = '\r\n';
const HEADER_BODY_SEPARATOR = CRLF.repeat(2);
const UPLOAD_DIR = './static/images/avatars';
const UPLOAD_DIR_ABSOLUTE_PATH = path.join(process.cwd(), UPLOAD_DIR);

class MultipartFormParser extends stream.Transform {
  constructor(boundary, options) {
    super({ ...options, decodeStrings: true });
    this.data = Buffer.alloc(0);
    this.fields = {};

    this.states = {
      'waiting-next-part': new WaitingNextPartState(boundary, this),
      'receiving-body-headers': new ParsingPartHeaders(this),
      'receiving-body-part': new ReceivingPartBodyState(boundary, this),
      'uploading-file-part': new UploadingFileState(boundary, this),
    };

    this.currentState = 'waiting-next-part';

    this.finishedProcessingChunk = null;
  }

  _transform(chunk, encoding, done) {
    this.data = chunk;
    this.finishedProcessingChunk = done;
    if (this.states[this.currentState].inProgress) {
      this.states[this.currentState].parseNextChunk(chunk);
    } else {
      this.states[this.currentState].activate();
    }
  }

  changeState(state) {
    this.states[this.currentState].inProgress = false;
    this.currentState = state;
    if (this.data.length === 0 && this.finishedProcessingChunk) {
      this.finishedProcessingChunk();
      return;
    }
    this.states[this.currentState].activate();
  }

  formParsedSuccessfully() {
    if (this.finishedProcessingChunk) {
      this.finishedProcessingChunk();
    }
    console.log(this.fields);
  }
}

class ParsingPartHeaders {
  constructor(multipartFormHandler) {
    this.multipartFormHandler = multipartFormHandler;
    this.inProgress = false;
  }

  activate() {
    this.inProgress = true;
    const firstChunk = this.multipartFormHandler.data;
    this.multipartFormHandler.data = Buffer.alloc(0);
    this.headersData = Buffer.alloc(0);
    this.parseNextChunk(firstChunk);
  }

  parseNextChunk(chunk) {
    const data = Buffer.concat([this.headersData, chunk]);
    const headersEndIndex = data.indexOf(HEADER_BODY_SEPARATOR);

    if (headersEndIndex === -1) {
      this.headersData = data;
      this.multipartFormHandler.finishedProcessingChunk();
      return;
    }

    this.headersData = data.slice(0, headersEndIndex);

    this.multipartFormHandler.data = data.slice(
      headersEndIndex + HEADER_BODY_SEPARATOR.length
    );
    this.multipartFormHandler.currentPartHeaders = this._parseHeaders();
    if (this.multipartFormHandler.currentPartHeaders['filename']) {
      this.multipartFormHandler.changeState('uploading-file-part');
    } else {
      this.multipartFormHandler.changeState('receiving-body-part');
    }
  }

  _parseHeaders() {
    const headers = this.headersData
      .toString()
      .split(CRLF)
      .map(header => header.split(': '));

    const contentDispositionValue = headers.find(
      header => header[0] === 'Content-Disposition'
    )[1];

    const params = contentDispositionValue.split('; ').slice(1);

    const headersObj = {};
    for (const param of params) {
      const [key, value] = param.split('=');
      headersObj[key] = JSON.parse(value);
    }

    return headersObj;
  }
}

class ReceivingPartBodyState {
  constructor(boundary, multipartFormHandler) {
    this.boundary = `${CRLF}--${boundary}`;
    this.multipartFormHandler = multipartFormHandler;
    this.inProgress = false;
  }

  activate() {
    this.inProgress = true;
    this.headers = this.multipartFormHandler.currentPartHeaders;
    this.multipartFormHandler.currentPartHeaders = null;

    this.field = this.headers['name'];

    const firstChunk = this.multipartFormHandler.data;
    this.multipartFormHandler.data = Buffer.alloc(0);
    this.bodyPartData = Buffer.alloc(0);
    this.parseNextChunk(firstChunk);
  }

  parseNextChunk(chunk) {
    const data = Buffer.concat([this.bodyPartData, chunk]);
    const bodyPartEndIndex = data.indexOf(this.boundary);
    if (bodyPartEndIndex === -1) {
      this.bodyPartData = data;
      this.multipartFormHandler.finishedProcessingChunk();
      return;
    }

    this.bodyPartData = data.slice(0, bodyPartEndIndex);

    this.multipartFormHandler.fields[this.field] = this.bodyPartData.toString();
    this.multipartFormHandler.data = data.slice(bodyPartEndIndex + CRLF.length);
    this.multipartFormHandler.changeState('waiting-next-part');
  }
}

class UploadingFileState {
  constructor(boundary, multipartFormHandler) {
    this.boundary = `${CRLF}--${boundary}`;
    this.multipartFormHandler = multipartFormHandler;
    this.inProgress = false;
  }

  activate() {
    this.inProgress = true;
    const headers = this.multipartFormHandler.currentPartHeaders;
    this.field = headers['name'];
    this.filename = headers['filename'];
    this.multipartFormHandler.currentPartHeaders = null;

    const firstChunk = this.multipartFormHandler.data;
    this.multipartFormHandler.data = Buffer.alloc(0);
    this.tail = Buffer.alloc(0);

    this.writeStream = this._createFile(this.filename);
    this.parseNextChunk(firstChunk);
  }

  parseNextChunk(chunk) {
    const data = Buffer.concat([this.tail, chunk]);

    const bodyPartEndIndex = data.indexOf(this.boundary);
    if (bodyPartEndIndex === -1) {
      const fileChunk = data.slice(0, -(this.boundary.length - 1));
      this.writeStream.write(fileChunk);
      this.tail = data.slice(-(this.boundary.length - 1));
      this.multipartFormHandler.finishedProcessingChunk();
      return;
    }

    const fileChunk = data.slice(0, bodyPartEndIndex);
    this.writeStream.end(fileChunk);

    this.multipartFormHandler.fields[this.field] = this.filename;
    this.multipartFormHandler.data = data.slice(bodyPartEndIndex + CRLF.length);
    this.multipartFormHandler.changeState('waiting-next-part');
  }

  _createFile(filename) {
    const filePath = path.join(UPLOAD_DIR_ABSOLUTE_PATH, filename);
    if (!filePath.startsWith(UPLOAD_DIR_ABSOLUTE_PATH)) {
      this.multipartFormHandler.emit(
        'error',
        Error('SOMEONE TRIED TO FIND A VOLNURABILITY!!!')
      );
      return;
    }
    return fs.createWriteStream(filePath);
  }
}

class WaitingNextPartState {
  constructor(boundary, multipartFormHandler) {
    this.boundary = `--${boundary}`;
    this.endBoundary = `--${boundary}--`;
    this.multipartFormHandler = multipartFormHandler;
    this.inProgress = false;
  }

  activate() {
    this.inProgress = true;
    const firstChunk = this.multipartFormHandler.data;
    this.multipartFormHandler.data = Buffer.alloc(0);
    this.separatorData = Buffer.alloc(0);
    this.parseNextChunk(firstChunk);
  }

  parseNextChunk(chunk) {
    const data = Buffer.concat([this.separatorData, chunk]);

    if (data.length < this.boundary.length + 2) {
      this.separatorData = data;
      this.multipartFormHandler.finishedProcessingChunk();
      return;
    }

    if (data.indexOf(this.endBoundary) === 0) {
      this.multipartFormHandler.formParsedSuccessfully();
      return;
    }

    if (data.indexOf(this.boundary) !== 0) {
      this.multipartFormHandler.emit('error', new Error('FORMAT IS WRONG'));
      return;
    }

    this.multipartFormHandler.data = data.slice(this.boundary.length + 2);
    this.multipartFormHandler.changeState('receiving-body-headers');
  }
}

module.exports = MultipartFormParser;
