var Adapter
  , BaseAdapter = require('../base_adapter').BaseAdapter
  , sql = require('../transformers/sql')
  , datatypes = require('../../datatypes')
  , utils = require('utilities')
  , operation = require('../../query/operation')
  , comparison = require('../../query/comparison');

Adapter = function () {
};

Adapter.prototype = new BaseAdapter();
utils.mixin(Adapter.prototype, new (function () {

  this._tableizeModelName = function (name) {
    var tableName = utils.inflection.pluralize(name);
    tableName = utils.string.snakeize(tableName);
    return tableName;
  };

  this._columnizePropertyName = function (name, options) {
    var opts = options || {}
    , columnName = utils.string.snakeize(name)
    , useQuotes = typeof opts.useQuotes != 'undefined' ?
          opts.useQuotes : true;
    if (useQuotes) {
      columnName = '"' +  columnName + '"';
    }
    return columnName;
  };

})());

utils.mixin(Adapter.prototype, sql);

module.exports.Adapter = Adapter;
