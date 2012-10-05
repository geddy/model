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

  this._createInsertStatement = function (item, props, useAutoIncrementId) {
    var sql = ''
      , modelName = item.type
      , cols = []
      , vals = [];

    // If using string UUID ids
    if (!useAutoIncrementId) {
      item.id = utils.string.uuid();
      cols.push(this._columnizePropertyName('id'));
      vals.push(datatypes.string.serialize(item.id, {
        escape: true
      , useQuotes: true
      }));
    }
    else {
      cols.push(this._columnizePropertyName('id'));
      vals.push('DEFAULT');
    }

    for (var p in props) {
      def = props[p];
      prop = item[p];
      // Use the same definition of NULL as for updates
      prop = this.transformValue(prop, def.datatype);
      if (prop != 'NULL') {
        cols.push(this._columnizePropertyName(p, {
          useQuotes: true
        }));
        vals.push(prop);
      }
    }
    sql += 'INSERT INTO ' + this._tableizeModelName(modelName) + ' ';
    sql += '(' + cols.join(', ') + ')';
    sql += ' VALUES ';
    sql += '(' + vals.join(', ') + ')';
    sql += ';';

    return sql;
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
