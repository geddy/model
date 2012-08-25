var utils = require('utilities')
  , request = utils.request
  , BaseAdapter = require('../base_adapter').BaseAdapter
  , _baseConfig
  , _bucketizeModelName;

_baseConfig = {
  protocol: 'http'
, host: 'localhost'
, port: 8098
};

var Adapter = function (options) {
  var opts = options || {}
    , config;

  this.name = 'riak';
  this.config = _baseConfig;
  this.client = null;

  utils.mixin(this.config, opts);

  this.init.apply(this, arguments);
};

Adapter.prototype = new BaseAdapter();
Adapter.prototype.constructor = Adapter;

_bucketizeModelName = function (name) {
  var bucketName = utils.inflection.pluralize(name);
  bucketName = utils.string.snakeize(bucketName);
  return bucketName;
};

utils.mixin(Adapter.prototype, new (function () {

  this.init = function () {
  };

  this.request = function (options, callback) {
    var opts = options || {}
      , config = this.config;
    request({
      method: opts.method || 'GET'
    , url: config.protocol + '://' + config.host + ':' + config.port +
          '/riak/' + opts.url
    , data: opts.data || null
    , dataType: 'json'
    , headers: {
        'Content-Type': 'application/json'
      }
    }, callback);
  };

  this.load = function (query, callback) {
    var bucket = _bucketizeModelName(query.model.modelName)
      , id = query.byId
      , requestOpts;

    // Single instance-lookup by id
    if (id) {
      requestOpts = {
          url: bucket + '/' + id
        , method: 'GET'
      };
      this.request(requestOpts, function (err, data) {
        var inst
          , res = [];
        if (err) {
          if (err.statusCode == 404) {
            callback(null, null);
          }
          else {
            callback(err, null);
          }
        }
        else {
          inst = query.model.create(data);
          inst.id = id;
          inst._saved = true;
          res.push(inst);
          // If explicitly limited to one, just return the single instance
          // This is also used by the `first` method
          if (query.opts.limit == 1) {
            res = res[0];
          }
          callback(null, res);
        }
      });
    }
    // Teh mapreducy
    else {
      callback(new Error('Complex queries not supported'), null);
    }
  };

  this.update = function (data, query, opts, callback) {
    var bucket = _bucketizeModelName(query.model.modelName)
      , id = query.byId
      , requestOpts
      , item = data;
    // Single instance-lookup by id
    if (id) {
      // Bail out if instance isn't valid
      if (!item.isValid()) {
        return callback(data.errors, null);
      }

      item = item.toData();
      item = JSON.stringify(item);

      requestOpts = {
          url: bucket + '/' + id
        , method: 'PUT'
        , data: item
      };

      this.request(requestOpts, function (err, data) {
        if (err) {
          callback(err, null);
        }
        else {
          // FIXME: What is the right data to return here? Right now this
          // is basically overwriting a doc, but we might be supporting
          // bulk-updates at some point
          callback(null, true);
        }
      });
    }
    // Bulk update?
    else {
      callback(new Error('Bulk update is not supported'), null);
    }
  };

  this.remove = function (query, opts, callback) {
    var bucket = _bucketizeModelName(query.model.modelName)
      , id = query.byId
      , requestOpts;

    // Single instance-lookup by id
    if (id) {
      requestOpts = {
          url: bucket + '/' + id
        , method: 'DELETE'
      };
      this.request(requestOpts, function (err, data) {
        var inst
          , res = [];
        if (err) {
          callback(err, null);
        }
        else {
          callback(null, true);
        }
      });
    }
    // Teh mapreducy
    else {
      callback(new Error('Bulk remove is not supported'), null);
    }
  };

  this.insert = function (data, opts, callback) {
    var self = this
      , item = data
      , bucket = _bucketizeModelName(item.type)
      , id = utils.string.uuid()
      , url = bucket + '/' + id
      , requestOpts;

    item.id = id;
    item = item.toData();
    item = JSON.stringify(item);

    requestOpts = {
      url: url
    , method: 'POST'
    , data: item
    };
    this.request(requestOpts, callback);
  };

  // May need to set bucket props here?
  this.createTable = function (names, callback) {};

})());

module.exports.Adapter = Adapter;

