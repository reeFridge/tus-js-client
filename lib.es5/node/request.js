"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.newRequest = newRequest;
exports.resolveUrl = resolveUrl;

var _http = require("http");

var http = _interopRequireWildcard(_http);

var _https = require("https");

var https = _interopRequireWildcard(_https);

var _url = require("url");

var _stream = require("stream");

var _lodash = require("lodash.throttle");

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function noop() {}

var Request = function () {
  function Request() {
    _classCallCheck(this, Request);

    this._method = "";
    this._url = "";
    this._headers = {};
    this._resHeaders = {};
    this._request = null;
    this._aborted = false;

    this.status = 0;

    this.onerror = noop;
    this.onload = noop;

    this.upload = {};
    this.upload.onprogress = noop;

    // Ignored field
    this.withCredentials = false;
    this.responseText = "";
  }

  _createClass(Request, [{
    key: "open",
    value: function open(method, url) {
      this._method = method;
      this._url = url;
    }
  }, {
    key: "setRequestHeader",
    value: function setRequestHeader(key, value) {
      this._headers[key] = value;
    }
  }, {
    key: "send",
    value: function send(body) {
      var _this = this;

      var options = (0, _url.parse)(this._url);
      options.method = this._method;
      options.headers = this._headers;
      if (body && body.size) options.headers["Content-Length"] = body.size;

      var req = this._request = options.protocol !== "https:" ? http.request(options) : https.request(options);
      req.on("response", function (res) {
        if (_this._aborted) return;

        _this.status = res.statusCode;
        _this._resHeaders = res.headers;

        var resChunks = [];
        res.on("data", function (data) {
          resChunks.push(data);
        });

        res.on("end", function () {
          _this.responseText = Buffer.concat(resChunks).toString("utf8");
          _this.onload();
        });
      });

      req.on("error", function (err) {
        if (_this._aborted) return;

        _this.onerror(err);
      });

      if (body instanceof _stream.Readable) {
        body.pipe(new ProgressEmitter(this.upload.onprogress)).pipe(req);
      } else {
        req.end(body);
      }
    }
  }, {
    key: "getResponseHeader",
    value: function getResponseHeader(key) {
      return this._resHeaders[key.toLowerCase()];
    }
  }, {
    key: "abort",
    value: function abort() {
      this._aborted = true;
      if (this._request !== null) this._request.abort();
    }
  }]);

  return Request;
}();

// ProgressEmitter is a simple PassThrough-style transform stream which keeps
// track of the number of bytes which have been piped through it and will
// invoke the `onprogress` function whenever new number are available.


var ProgressEmitter = function (_Transform) {
  _inherits(ProgressEmitter, _Transform);

  function ProgressEmitter(onprogress) {
    _classCallCheck(this, ProgressEmitter);

    // The _onprogress property will be invoked, whenever a chunk is piped
    // through this transformer. Since chunks are usually quite small (64kb),
    // these calls can occur frequently, especially when you have a good
    // connection to the remote server. Therefore, we are throtteling them to
    // prevent accessive function calls.
    var _this2 = _possibleConstructorReturn(this, (ProgressEmitter.__proto__ || Object.getPrototypeOf(ProgressEmitter)).call(this));

    _this2._onprogress = (0, _lodash2.default)(onprogress, 100, {
      leading: true,
      trailing: false
    });
    _this2._position = 0;
    return _this2;
  }

  _createClass(ProgressEmitter, [{
    key: "_transform",
    value: function _transform(chunk, encoding, callback) {
      this._position += chunk.length;
      this._onprogress({
        lengthComputable: true,
        loaded: this._position
      });
      callback(null, chunk);
    }
  }]);

  return ProgressEmitter;
}(_stream.Transform);

function newRequest() {
  return new Request();
}

function resolveUrl(origin, link) {
  return (0, _url.resolve)(origin, link);
}