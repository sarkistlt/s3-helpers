'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _awsSdk = require('aws-sdk');

var _awsSdk2 = _interopRequireDefault(_awsSdk);

var _s3UploadStream = require('s3-upload-stream');

var _s3UploadStream2 = _interopRequireDefault(_s3UploadStream);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ObjectStorageAdapter = function () {
  function ObjectStorageAdapter(_ref) {
    var authentication = _ref.authentication,
        _ref$params = _ref.params,
        params = _ref$params === undefined ? {} : _ref$params;

    _classCallCheck(this, ObjectStorageAdapter);

    this.timeout = params.connectionTimeout || 1000 * 60 * 3;
    this.authentication = authentication;
    this.params = params;
    this.s3Params = this.params.s3 || {};
    this.filenameTransformer = function (name) {
      return name;
    };

    _awsSdk2.default.config.httpOptions = { timeout: this.timeout };

    if (typeof params.filenameTransformer === 'function') {
      this.filenameTransformer = params.filenameTransformer;
    }
  }

  _createClass(ObjectStorageAdapter, [{
    key: 'getWriteStream',
    value: function () {
      var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(_ref2) {
        var container = _ref2.container,
            filename = _ref2.filename,
            _ref2$metaData = _ref2.metaData,
            metaData = _ref2$metaData === undefined ? {} : _ref2$metaData,
            _ref2$rawMeta = _ref2.rawMeta,
            rawMeta = _ref2$rawMeta === undefined ? {} : _ref2$rawMeta;
        var s3, newFilename, extension, metadata, writeStream;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                s3 = new _awsSdk2.default.S3(this.authentication);
                newFilename = this.filenameTransformer(filename);
                extension = filename.split('.').pop();
                metadata = _extends({
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

                writeStream = (0, _s3UploadStream2.default)(s3).upload(_extends({
                  Bucket: container || this.params.defaultContainer,
                  Key: newFilename,
                  Metadata: metadata
                }, this.s3Params));


                writeStream.on('uploaded', function (response) {
                  this.emit('success', {
                    location: response.Location,
                    filename: response.Key,
                    container: response.Bucket
                  });
                });

                return _context.abrupt('return', writeStream);

              case 8:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function getWriteStream(_x) {
        return _ref3.apply(this, arguments);
      }

      return getWriteStream;
    }()
  }, {
    key: 'delete',
    value: function () {
      var _ref4 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(container, file) {
        var s3;
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                if (!(!container || !file)) {
                  _context2.next = 2;
                  break;
                }

                throw new Error('you must provide container, and full file path');

              case 2:
                s3 = new _awsSdk2.default.S3(this.authentication);
                return _context2.abrupt('return', new Promise(function (resolve, reject) {
                  s3.deleteObject({
                    Bucket: container,
                    Key: file
                  }, function (err, data) {
                    if (err) {
                      return reject(err);
                    }
                    resolve(data);
                  });
                }));

              case 4:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function _delete(_x2, _x3) {
        return _ref4.apply(this, arguments);
      }

      return _delete;
    }()
  }, {
    key: 'getObject',
    value: function () {
      var _ref5 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(container, file) {
        var s3;
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                if (!(!container || !file)) {
                  _context3.next = 2;
                  break;
                }

                throw new Error('you must provide container, and full file path');

              case 2:
                s3 = new _awsSdk2.default.S3(this.authentication);
                return _context3.abrupt('return', new Promise(function (resolve, reject) {
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
                }));

              case 4:
              case 'end':
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function getObject(_x4, _x5) {
        return _ref5.apply(this, arguments);
      }

      return getObject;
    }()
  }, {
    key: 'getObjectMeta',
    value: function () {
      var _ref6 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee4(container, file) {
        var s3;
        return regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                if (!(!container || !file)) {
                  _context4.next = 2;
                  break;
                }

                throw new Error('you must provide container, and full file path');

              case 2:
                s3 = new _awsSdk2.default.S3(this.authentication);
                return _context4.abrupt('return', new Promise(function (resolve, reject) {
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
                }));

              case 4:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function getObjectMeta(_x6, _x7) {
        return _ref6.apply(this, arguments);
      }

      return getObjectMeta;
    }()
  }, {
    key: 'copyObject',
    value: function () {
      var _ref7 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee5(container, oldFile, newFile) {
        var s3;
        return regeneratorRuntime.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                if (!(!container || !newFile || !oldFile)) {
                  _context5.next = 2;
                  break;
                }

                throw new Error('validation error');

              case 2:
                s3 = new _awsSdk2.default.S3(this.authentication);
                return _context5.abrupt('return', new Promise(function (resolve, reject) {
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
                }));

              case 4:
              case 'end':
                return _context5.stop();
            }
          }
        }, _callee5, this);
      }));

      function copyObject(_x8, _x9, _x10) {
        return _ref7.apply(this, arguments);
      }

      return copyObject;
    }()
  }, {
    key: 'butchDelete',
    value: function () {
      var _ref8 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee6(container, files) {
        var s3;
        return regeneratorRuntime.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                if (!(!container || !Array.isArray(files))) {
                  _context6.next = 2;
                  break;
                }

                throw new Error('you must provide container, array of files');

              case 2:
                s3 = new _awsSdk2.default.S3(this.authentication);
                return _context6.abrupt('return', new Promise(function (resolve, reject) {
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
                }));

              case 4:
              case 'end':
                return _context6.stop();
            }
          }
        }, _callee6, this);
      }));

      function butchDelete(_x11, _x12) {
        return _ref8.apply(this, arguments);
      }

      return butchDelete;
    }()
  }, {
    key: 'list',
    value: function () {
      var _ref9 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee7(container, prefix) {
        var max = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 50;
        var marker = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : '';
        var s3;
        return regeneratorRuntime.wrap(function _callee7$(_context7) {
          while (1) {
            switch (_context7.prev = _context7.next) {
              case 0:
                if (container) {
                  _context7.next = 2;
                  break;
                }

                throw new Error('you must provide container');

              case 2:
                s3 = new _awsSdk2.default.S3(this.authentication);
                return _context7.abrupt('return', new Promise(function (resolve, reject) {
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
                }));

              case 4:
              case 'end':
                return _context7.stop();
            }
          }
        }, _callee7, this);
      }));

      function list(_x15, _x16) {
        return _ref9.apply(this, arguments);
      }

      return list;
    }()
  }, {
    key: 'nestedDelete',
    value: function () {
      var _ref10 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee8(container) {
        var prefix = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
        var marker = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';
        var response;
        return regeneratorRuntime.wrap(function _callee8$(_context8) {
          while (1) {
            switch (_context8.prev = _context8.next) {
              case 0:
                if (!(!container || prefix.length < 3)) {
                  _context8.next = 2;
                  break;
                }

                throw new Error('you must provide container and prefix');

              case 2:
                _context8.next = 4;
                return this.list(container, prefix, 50, marker);

              case 4:
                response = _context8.sent;

                if (!(!response.Contents || !response.Contents[0])) {
                  _context8.next = 7;
                  break;
                }

                return _context8.abrupt('return', true);

              case 7:
                _context8.next = 9;
                return this.butchDelete(container, response.Contents.map(function (_ref11) {
                  var Key = _ref11.Key;
                  return { Key };
                }));

              case 9:
                return _context8.abrupt('return', this.nestedDelete(container, prefix, response.Contents.reverse()[0].Key));

              case 10:
              case 'end':
                return _context8.stop();
            }
          }
        }, _callee8, this);
      }));

      function nestedDelete(_x19) {
        return _ref10.apply(this, arguments);
      }

      return nestedDelete;
    }()
  }, {
    key: 'nestedCb',
    value: function () {
      var _ref12 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee9(container) {
        var prefix = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
        var cb = arguments[2];
        var marker = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : '';
        var response;
        return regeneratorRuntime.wrap(function _callee9$(_context9) {
          while (1) {
            switch (_context9.prev = _context9.next) {
              case 0:
                if (!(!container || prefix.length < 3 || typeof cb !== 'function')) {
                  _context9.next = 2;
                  break;
                }

                throw new Error(`validation fail ${JSON.stringify({ container, prefix, cb }, null, 2)}`);

              case 2:
                _context9.next = 4;
                return this.list(container, prefix, 50, marker);

              case 4:
                response = _context9.sent;

                if (!(!response.Contents || !response.Contents[0])) {
                  _context9.next = 7;
                  break;
                }

                return _context9.abrupt('return', true);

              case 7:
                if (!Array.isArray(response.Contents)) {
                  _context9.next = 10;
                  break;
                }

                _context9.next = 10;
                return cb(response.Contents);

              case 10:
                return _context9.abrupt('return', this.nestedCb(container, prefix, cb, response.Contents.reverse()[0].Key));

              case 11:
              case 'end':
                return _context9.stop();
            }
          }
        }, _callee9, this);
      }));

      function nestedCb(_x22) {
        return _ref12.apply(this, arguments);
      }

      return nestedCb;
    }()
  }]);

  return ObjectStorageAdapter;
}();

exports.default = ObjectStorageAdapter;

//# sourceMappingURL=index.js.map