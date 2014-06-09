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
  this.config = this.loadConfig(_baseConfig, opts);
  this.client = null;

  this.init.apply(this, arguments);
};

Adapter.prototype = new BaseAdapter();
Adapter.prototype.constructor = Adapter;

utils.mixin(Adapter.prototype, new (function () {

  this._getDatastore = function () {
    return _data;
  };

  this._writeDatastore = function () {};

  this.init = function () {};

  this.load = function (query, callback) {
    var datastore = this._getDatastore()
      , key = query.model.modelName
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
    if (!datastore[key]) {
      datastore[key] = {};
    }

    items = datastore[key];

    if (id) {
      item = datastore[key][id];

      // Re-validate params with the correct scenario
      if (item) {
        item = model[key].create(item);
        model.validateAndUpdateFromParams(item, item.toJSON(),
            {scenario: query.opts.scenario});
        item._saved = true;
      }

      if (limit == 1) {
        callback(null, item);
      }
      else {
        callback(null, (item) ? [item] : []);
      }
    }
    else {
      conditions = this.transformConditions(query.conditions);
      sort = this.transformSortOrder(query.opts.sort);

      filter = new Function('data', 'return (' + conditions + ')');
      for (var p in items) {
        item = model[key].create(items[p]);

        // Use data-only for filtering
        data = item.toJSON();

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
            data[p] = val.getTime();
          }
        }

        if (filter(data)) {
          model.validateAndUpdateFromParams(item, item.toJSON(),
              {scenario: query.opts.scenario});
          item._saved = true;
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

      if (query.opts.count) {
        res = res.length;
      }

      callback(null, res);
    }
  };

  this.update = function (data, query, callback) {
    var datastore = this._getDatastore()
      , key = query.model.modelName
      , id = query.byId
      , ids;

    // Lazy-create the collection
    if (!datastore[key]) {
      datastore[key] = {};
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
      var item = model[key].create(datastore[key][id]);
      item.updateProperties(data);
      datastore[key][id] = item;

    });
    if (data instanceof model.ModelBase) {
      this._writeDatastore(datastore);
      callback(null, data);
    }
    else {
      this._writeDatastore(datastore);
      callback(null, true);
    }
  };

  this.remove = function (query, callback) {
    var datastore = this._getDatastore()
      , key = query.model.modelName
      , id = query.byId
      , ids;

    // Lazy-create the collection
    if (!datastore[key]) {
      datastore[key] = {};
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
      delete datastore[key][id];
    });
    this._writeDatastore(datastore);
    callback(null, true);
  };

  this.insert = function (data, opts, callback) {
    var datastore = this._getDatastore()
      , items = Array.isArray(data) ? data.slice() : [data]
      , key = items[0].type;

    // Lazy-create the collection
    if (!datastore[key]) {
      datastore[key] = {};
    }

    items.forEach(function (item) {
      var id = item.id || utils.string.uuid()
        , itemClone;
      item.id = id;
      item._saved = true;

      datastore[key][id] = item.clone();
    });
    if (data instanceof model.ModelBase) {
      this._writeDatastore(datastore);
      callback(null, data);
    }
    else {
      this._writeDatastore(datastore);
      callback(null, true);
    }
  }

  this.createTable = function (names, callback) {
    var datastore = this._getDatastore()
      , arr = Array.isArray(names) ? names.slice() : [names];
    arr.forEach(function (item) {
      datastore[item] = {};
    });
    this._writeDatastore(datastore);
    callback(null, true);
  };

  this.dropTable = function (names, callback) {
    var datastore = this._getDatastore()
      , arr = Array.isArray(names) ? names.slice() : [names];
    arr.forEach(function (item) {
      delete datastore[item];
    });
    this._writeDatastore(datastore);
    callback(null, true);
  };

})());

utils.mixin(Adapter.prototype, mr);

module.exports.Adapter = Adapter;

