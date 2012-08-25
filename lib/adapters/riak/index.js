var utils = require('utilities')
  , operation = require('../../query/operation')
  , datatypes = require('../../datatypes')
  , request = utils.request
  , BaseAdapter = require('../base_adapter').BaseAdapter
  , _baseConfig
  , _mapReduceQuery
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

_mapReduceQuery = function (bucket, conditions) {
  return '{"inputs": "' + bucket + '", "query": [{"map": {"language": "javascript","source": "function (value, keyData, arg) { var data = Riak.mapValuesJson(value)[0]; if ' + conditions + ' { return [data]; } else { return []; } }"}}]}';
};

utils.mixin(Adapter.prototype, new (function () {

  var _operationSymbols = {
    'and': '&&'
  , 'or': '||'
  };

  this._serializeConditions = function (conditions) {
    var cond = this._serializeOperation(conditions);
    return cond;
  };

  this._serializeOperation = function (op) {
    var self = this
      , ops = [];
    if (op.isEmpty()) {
      return '(true)';
    }
    else {
      op.forEach(function (o) {
        if (o instanceof operation.OperationBase) {
          ops.push(self._serializeOperation(o));
        }
        else {
          ops.push(self._serializeComparison(o));
        }
      });
      if (op.type == 'not') {
        return '(!(' + self._serializeOperation(op.operand()) + '))';
      }
      else {
        return '(' + ops.join(' ' + _operationSymbols[op.type.toLowerCase()] +
            ' ') + ')';
      }
    }
  };

  this._serializeComparison = function (comp) {
    return [this._serializeComparisonFieldName(comp),
        this._serializeComparisonComparator(comp),
        this._serializeComparisonValue(comp)].join(' ');
  };

  this._serializeComparisonFieldName = function (comp) {
    // Use bracket-notation, in case field-name has special chars
    // or is a reserved word
    var name = 'data[\'' + comp.field + '\']';
    if (comp.opts.lowercase) {
      name += '.toLowerCase()';
    }
    return name;
  };

  this._serializeComparisonComparator = function (comp) {
    var comparator = comp.jsComparatorString;
    return comparator;
  };

  this._serializeComparisonValue = function (comp) {
    var val = comp.value;
    switch (true) {
      case val === null:
        val = 'null';
        break;
      case val === '':
        val = '\'\'';
        break;
      case comp.datatype == 'date' || comp.datatype == 'datetime':
        val = JSON.stringify(val).replace(/"/g, "'");
        break;
      default:
        val = datatypes[comp.datatype].serialize(val, {
            useQuotes: true
          , escape: true
        });
    }
    return val;
  };

  this.init = function () {};

  this.request = function (options, callback) {
    var opts = options || {}
      , config = this.config;
    request({
      method: opts.method || 'GET'
    , url: config.protocol + '://' + config.host + ':' + config.port + opts.url
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
      , requestOpts
      , conditions;

    // Single instance-lookup by id
    if (id) {
      requestOpts = {
          url: '/riak/' + bucket + '/' + id
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
      conditions = this._serializeConditions(query.conditions);
      requestOpts = {
          url: '/mapred'
        , method: 'POST'
        , data: _mapReduceQuery(bucket, conditions)
      };
      this.request(requestOpts, function (err, data) {
        var rows
          , res = [];
        if (err) {
          callback(err, null);
        }
        else {
          rows = data;
          rows.forEach(function (row) {
            var inst = query.model.create(row);
            inst.id = row.id;
            inst._saved = true;
            res.push(inst);
          });
          // If explicitly limited to one, just return the single instance
          // This is also used by the `first` method
          if (query.opts.limit == 1) {
            res = res[0];
          }
          callback(null, res);
        }
      });
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
      item.id = id;
      item = JSON.stringify(item);

      requestOpts = {
          url: '/riak/' + bucket + '/' + id
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
          url: '/riak/' + bucket + '/' + id
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
      , url = '/riak/' + bucket + '/' + id
      , requestOpts;

    item = item.toData();
    item.id = id;
    item = JSON.stringify(item);

    requestOpts = {
      url: url
    , method: 'POST'
    , data: item
    };
    this.request(requestOpts, function (err, res) {
      if (err) {
        callback(err, null);
      }
      else {
        data.id = id;
        data._saved = true;
        callback(null, data);
      }
    });
  };

  // May need to set bucket props here?
  this.createTable = function (names, callback) {};

})());

module.exports.Adapter = Adapter;

