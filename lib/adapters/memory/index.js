var model = require('../../index')
  , utils = require('utilities')
  , mr = require('../transformers/mr')
  , operation = require('../../query/operation')
  , comparison = require('../../query/comparison')
  , datatypes = require('../../datatypes')
  , request = utils.request
  , BaseAdapter = require('../base_adapter').BaseAdapter
  , _baseConfig
  , _data = {};

_baseConfig = {};

var Adapter = function (options) {
  var opts = options || {}
    , config;

  this.name = 'memory';
  this.config = _baseConfig;
  this.client = null;

  utils.mixin(this.config, opts);

  this.init.apply(this, arguments);
};

Adapter.prototype = new BaseAdapter();
Adapter.prototype.constructor = Adapter;

utils.mixin(Adapter.prototype, new (function () {

  this.init = function () {};

  this.load = function (query, callback) {
    var key = query.model.modelName
      , id = query.byId
      , conditions
      , sort
      , items = _data[key]
      , item
      , filter
      , res = [];
    if (id) {
      item = _data[key][id];
      callback(null, item);
    }
    else {
      conditions = this.transformConditions(query.conditions);
      sort = this.transformSortOrder(query.opts.sort);

      filter = new Function('data', 'return (' + conditions + ')');
      for (var p in items) {
        item = items[p];
        if (filter(item)) {
          res.push(item);
        }
      }
      if (sort) {
        sort(res);
      }

      callback(null, res);
    }
  };

  this.update = function (data, query, callback) {
    var key = query.model.modelName
      , id = query.byId
      , ids;
    if (id) {
      ids = [id];
    }
    else {
      ids = query.rawConditions.id;
      // Mapreduce for the list of ids
      if (!ids) {
        ids = [];
        this.load(query, function (err, items) {
          if (err) {
            callback(err, null);
          }
          else {
            items.forEach(function (item) {
              ids.push(item.id);
            });
          }
        });
      }
    }
    ids.forEach(function (id) {
      var item = _data[key][id];
      item.updateProperties(data);
      _data[key][id] = item;

    });
    callback(null, true);
  };

  this.remove = function (query, callback) {
    var key = query.model.modelName
      , id = query.byId
      , ids;
    if (id) {
      ids = [id];
    }
    else {
      ids = query.rawConditions.id;
      // Mapreduce for the list of ids
      if (!ids) {
        ids = [];
        this.load(query, function (err, items) {
          if (err) {
            callback(err, null);
          }
          else {
            items.forEach(function (item) {
              ids.push(item.id);
            });
          }
        });
      }
    }
    ids.forEach(function (id) {
      delete _data[key][id];
    });
    callback(null, true);
  };

  this.insert = function (data, opts, callback) {
    var items = Array.isArray(data) ? data.slice() : [data]
      , key = items[0].type;
    items.forEach(function (item) {
      var id = utils.string.uuid();
      item.id = id;
      item._saved = true;
      _data[key][id] = item;
    });
    callback(null, true);
  }

  this.createTable = function (names, callback) {
    var arr = Array.isArray(names) ? names.slice() : [names];
    arr.forEach(function (item) {
      _data[item] = {};
    });
    callback(null, true);
  };

  this.dropTable = function (names, callback) {
    var arr = Array.isArray(names) ? names.slice() : [names];
    arr.forEach(function (item) {
      delete _data[item];
    });
    callback(null, true);
  };

})());

utils.mixin(Adapter.prototype, mr);

module.exports.Adapter = Adapter;

