'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _awsSdk = require('aws-sdk');

var _awsSdk2 = _interopRequireDefault(_awsSdk);

var _s3UploadStream = require('s3-upload-stream');

var _s3UploadStream2 = _interopRequireDefault(_s3UploadStream);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

class ObjectStorageAdapter {
  constructor({ authentication, params = {} }) {
    this.timeout = params.connectionTimeout || 1000 * 60 * 3;
    this.authentication = authentication;
    this.params = params;
    this.s3Params = this.params.s3 || {};
    this.filenameTransformer = name => name;

    _awsSdk2.default.config.httpOptions = { timeout: this.timeout };

    if (typeof params.filenameTransformer === 'function') {
      this.filenameTransformer = params.filenameTransformer;
    }
  }

  getWriteStream({ container, filename, folder = '', metaData = {}, rawMeta = {} }) {
    var _this = this;

    return _asyncToGenerator(function* () {
      const s3 = new _awsSdk2.default.S3(_this.authentication);
      const newFilename = _this.filenameTransformer(filename);
      const extension = filename.split('.').pop();
      const metadata = _extends({
        'X-Object-Meta-filename': newFilename,
        'X-Object-Meta-originalfilename': filename,
        'X-Object-Meta-extension': extension,
        'Content-Disposition': `attachment; filename="${newFilename}"`
      }, rawMeta);

      Object.keys(metaData).forEach(function (key) {
        if (metaData[key]) {
          metadata[`X-Object-Meta-${key}`] = metaData[key];
        }
      });

      const writeStream = (0, _s3UploadStream2.default)(s3).upload(_extends({
        Bucket: container || _this.params.defaultContainer,
        Key: `${folder}${newFilename}`,
        Metadata: metadata
      }, _this.s3Params));

      writeStream.on('uploaded', function (response) {
        this.emit('success', {
          location: response.Location,
          filename: response.Key,
          container: response.Bucket
        });
      });

      return writeStream;
    })();
  }

  delete(container, file) {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      if (!container || !file) {
        throw new Error('you must provide container, and full file path');
      }

      const s3 = new _awsSdk2.default.S3(_this2.authentication);

      return new Promise(function (resolve, reject) {
        s3.deleteObject({
          Bucket: container,
          Key: file
        }, function (err, data) {
          if (err) {
            return reject(err);
          }
          resolve(data);
        });
      });
    })();
  }

  getObject(container, file) {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      if (!container || !file) {
        throw new Error('you must provide container, and full file path');
      }

      const s3 = new _awsSdk2.default.S3(_this3.authentication);

      return new Promise(function (resolve, reject) {
        s3.getObject({
          Bucket: container,
          Key: file
        }, function (err, data) {
          if (err && err.message === 'The specified key does not exist.') {
            return resolve();
          } else if (err) {
            return reject(err);
          }
          resolve(data);
        });
      });
    })();
  }

  getObjectMeta(container, file) {
    var _this4 = this;

    return _asyncToGenerator(function* () {
      if (!container || !file) {
        throw new Error('you must provide container, and full file path');
      }

      const s3 = new _awsSdk2.default.S3(_this4.authentication);

      return new Promise(function (resolve, reject) {
        s3.headObject({
          Bucket: container,
          Key: file
        }, function (err, data) {
          if (err && err.message === null) {
            return resolve();
          } else if (err) {
            return reject(err);
          }
          resolve(data);
        });
      });
    })();
  }

  copyObject(container, oldFile, newFile) {
    var _this5 = this;

    return _asyncToGenerator(function* () {
      if (!container || !newFile || !oldFile) {
        throw new Error('validation error');
      }

      const s3 = new _awsSdk2.default.S3(_this5.authentication);

      return new Promise(function (resolve, reject) {
        s3.copyObject({
          Bucket: container,
          CopySource: oldFile,
          Key: newFile
        }, function (err, data) {
          if (err) {
            return reject(err);
          }
          resolve(data);
        });
      });
    })();
  }

  butchDelete(container, files) {
    var _this6 = this;

    return _asyncToGenerator(function* () {
      if (!container || !Array.isArray(files)) {
        throw new Error('you must provide container, array of files');
      }

      const s3 = new _awsSdk2.default.S3(_this6.authentication);

      return new Promise(function (resolve, reject) {
        s3.deleteObjects({
          Bucket: container,
          Delete: {
            Objects: files,
            Quiet: true
          }
        }, function (err, data) {
          if (err) {
            return reject(err);
          }
          resolve(data);
        });
      });
    })();
  }

  list(container, prefix, max = 50, marker = '') {
    var _this7 = this;

    return _asyncToGenerator(function* () {
      if (!container) {
        throw new Error('you must provide container');
      }

      const s3 = new _awsSdk2.default.S3(_this7.authentication);

      return new Promise(function (resolve, reject) {
        s3.listObjects({
          Bucket: container,
          Prefix: prefix,
          Marker: marker,
          MaxKeys: max
        }, function (err, data) {
          if (err) {
            return reject(err);
          }
          resolve(data);
        });
      });
    })();
  }

  nestedDelete(container, prefix = '', marker = '') {
    var _this8 = this;

    return _asyncToGenerator(function* () {
      if (!container || prefix.length < 3) {
        throw new Error('you must provide container and prefix');
      }

      const response = yield _this8.list(container, prefix, 50, marker);

      if (!response.Contents || !response.Contents[0]) {
        return true;
      }

      yield _this8.butchDelete(container, response.Contents.map(function ({ Key }) {
        return { Key };
      }));

      return _this8.nestedDelete(container, prefix, response.Contents.reverse()[0].Key);
    })();
  }

  nestedCb(container, prefix = '', cb, marker = '') {
    var _this9 = this;

    return _asyncToGenerator(function* () {
      if (!container || prefix.length < 3 || typeof cb !== 'function') {
        throw new Error(`validation fail ${JSON.stringify({ container, prefix, cb }, null, 2)}`);
      }

      const response = yield _this9.list(container, prefix, 50, marker);

      if (!response.Contents || !response.Contents[0]) {
        return true;
      }

      if (Array.isArray(response.Contents)) {
        yield cb(response.Contents);
      }

      return _this9.nestedCb(container, prefix, cb, response.Contents.reverse()[0].Key);
    })();
  }
}
exports.default = ObjectStorageAdapter;

//# sourceMappingURL=index.js.map