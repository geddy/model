
var fs = require('fs')
  , path = require('path')
  , utils = require('utilities')
  , MemoryAdapter = require('../memory').Adapter
  , _baseConfig;

_baseConfig = {
  location: '.'
, filename: '_datastore.json'
};

var Adapter = function (options) {
  var opts = options || {}
    , config;

  this.name = 'filesystem';
  this.config = this.loadConfig(_baseConfig, opts);
  this.client = null;

  this.init.apply(this, arguments);
};

Adapter.prototype = Object.create(MemoryAdapter.prototype);
Adapter.prototype.constructor = Adapter;

utils.mixin(Adapter.prototype, new (function () {

  this.destroy = function (cb) {
    var cfg = this.config
      , p = path.join(cfg.location, cfg.filename);
    utils.file.rmRf(p, {
      silent: true
    });
    if (typeof cb == 'function') {
      cb();
    }
  };

  this._getDatastore = function () {
    var data = {}
      , cfg = this.config
      , p = path.join(cfg.location, cfg.filename);
    if (fs.existsSync(p)) {
      data = fs.readFileSync(p);
      data = data.toString();
      data = JSON.parse(data);
    }
    return data;
  };

  this._writeDatastore = function (data) {
    var cfg = this.config
      , p = path.join(cfg.location, cfg.filename);
    utils.file.mkdirP(cfg.location);
    fs.writeFileSync(p, JSON.stringify(data));
  };

})());

module.exports.Adapter = Adapter;

