var BaseAdapter
  , configPropertyAliases
  , EventEmitter = require('events').EventEmitter
  , model = require('../index')
  , adapter = require('./index')
  , utils = require('utilities');

configPropertyAliases = [
  ['user', 'username', 'userName']
, ['pass', 'password']
, ['database', 'dbname', 'db', 'dbName']
, ['host', 'hostname', 'hostName']
];

BaseAdapter = function () {
};

BaseAdapter.prototype = new EventEmitter();
utils.mixin(BaseAdapter.prototype, new (function () {

  this.loadConfig = function (baseConfig, options) {
    var base = utils.mixin({}, baseConfig)
      , opts = utils.mixin({}, options || {})
      , found
      , aliasKeys
      , aliasKey;
    // If there's a property name on the passed in opts that is
    // an alias for a property on the config, set the correct
    // property name and delete the alias
    for (var p in base) {
      // Is this possibly an aliased property?
      found = configPropertyAliases.some(function (aliases) {
        aliasKeys = aliases;
        return aliases.indexOf(p) > -1;
      });
      if (found) {
        // Does the opts obj have an aliased keys?
        found = aliasKeys.some(function (alias) {
          aliasKey = alias;
          // Possible key isn't the same as the real key
          // Key has a defined value on the opts obj
          return alias != p && typeof opts[alias] != 'undefined';
        });
        if (found) {
          opts[p] = opts[aliasKey];
          delete opts[aliasKey]
        }
      }
    }
    return utils.mixin(base, opts);
  };

  this.connect = function (callback) {
    var self = this
      , cb = callback || function () {};
    setTimeout(function () {
      self.emit('connect');
      cb();
    }, 0);
  };

  this.disconnect = function (callback) {
    var self = this
      , cb = callback || function () {};
    setTimeout(function () {
      self.emit('disconnect');
      cb();
    }, 0);
  };

  this.load = function (query, callback) {
    callback(null, []);
  };

  this.update = function (data, query, callback) {
    if (data instanceof model.ModelBase) {
      callback(null, data);
    }
    else {
      callback(null, true);
    }
  };

  this.remove = function (query, callback) {
    callback(null, true);
  };

  this.insert = function (data, opts, callback) {
    data.id = data.id || utils.string.uuid()
    data._saved = true;
    callback(null, data);
  };

  this.count = function (query, callback) {
    callback(null, 0);
  };

  this.createTable = function (names, callback) {
    callback(null, null);
  };

  this.dropTable = function (names, callback) {
    callback(null, null);
  };

})());

module.exports.BaseAdapter = BaseAdapter;
