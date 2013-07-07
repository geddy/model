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
      , props = model.descriptionRegistry[key].properties
      , datatype
      , id = query.byId
      , conditions
      , sort
      , limit = query.opts.limit
      , items
      , item
      , data
      , val
      , filter
      , res = [];

    // Lazy-create the collection
    if (!_data[key]) {
      _data[key] = {};
    }

    items = _data[key];

    if (id) {
      item = _data[key][id];

      // Re-validate params with the correct scenario
      if(item) {
        item = item.clone();
        model.validateAndUpdateFromParams(item, item.toObj(), {scenario: query.opts.scenario});
      }

      callback(null, item);
    }
    else {
      conditions = this.transformConditions(query.conditions);
      sort = this.transformSortOrder(query.opts.sort);

      filter = new Function('data', 'return (' + conditions + ')');
      for (var p in items) {
        item = items[p];

        // Use data-only for filtering
        data = item.toData({whitelist: ['id', 'createdAt']});

        // Do annoying stringification for dates
        for (var p in data) {
          val = data[p];
          datatype = null;

          // Flag all date/datetime props
          if (p == 'createdAt' || p == 'updatedAt') {
            datatype = 'datetime';
          }
          else if (props[p])  {
            datatype = props[p].datatype;
          }

          if (val && (datatype == 'date' || datatype == 'datetime')) {
            data[p] = JSON.stringify(val).replace(/"/g, "'");
          }
        }

        if (filter(data)) {
          item = item.clone();
          model.validateAndUpdateFromParams(item, item.toObj(), {scenario: query.opts.scenario});
          res.push(item);
        }
      }
      if (sort) {
        sort(res);
      }

      if (limit) {
        if (limit == 1) {
          res = res[0];
        }
        else {
          res = res.slice(0, limit);
        }
      }

      callback(null, res);
    }
  };

  this.update = function (data, query, callback) {
    var key = query.model.modelName
      , id = query.byId
      , ids;

    // Lazy-create the collection
    if (!_data[key]) {
      _data[key] = {};
    }

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
    if (data instanceof model.ModelBase) {
      callback(null, data);
    }
    else {
      callback(null, true);
    }
  };

  this.remove = function (query, callback) {
    var key = query.model.modelName
      , id = query.byId
      , ids;

    // Lazy-create the collection
    if (!_data[key]) {
      _data[key] = {};
    }

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

    // Lazy-create the collection
    if (!_data[key]) {
      _data[key] = {};
    }

    items.forEach(function (item) {
      var id = item.id || utils.string.uuid()
        , itemClone;
      item.id = id;
      item._saved = true;

      _data[key][id] = item.clone();
    });
    if (data instanceof model.ModelBase) {
      callback(null, data);
    }
    else {
      callback(null, true);
    }
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

