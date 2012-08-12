var Adapter
  , EventEmitter = require('events').EventEmitter
  , utils = require('utilities');

Adapter = function () {
};

Adapter.prototype = new EventEmitter();
utils.mixin(Adapter.prototype, new (function () {

  this.tableizeModelName = function (name) {
    var tableName = utils.inflection.pluralize(name);
    tableName = utils.string.snakeize(tableName);
    return tableName;
  };

  this.columnizePropertyName = function (name, options) {
    var opts = options || {}
    , columnName = utils.string.snakeize(name);
    if (opts.useQuotes) {
      columnName = '"' +  columnName + '"';
    }
    return columnName;
  };

})());

module.exports.Adapter = Adapter;
