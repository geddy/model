var Adapter
  , BaseAdapter = require('../base_adapter').BaseAdapter
  , datatypes = require('../../datatypes')
  , utils = require('utilities');

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

  this._serializeSortOrder = function (sort) {
    var sql = ''
      , fieldArr = [];
    for (var p in sort) {
      fieldArr.push(this._columnizePropertyName(p) + ' ' + sort[p].toUpperCase());
    }
    sql += 'ORDER BY ' + fieldArr.join(', ');
    return sql;
  }

  this._serializeConditions = function (conditions) {
    var self = this
      , operation = conditions
      , ops = []
      , str = '';
    if (operation.isEmpty()) {
      return '';
    }
    else {
      operation.forEach(function (op) {
        ops.push(self._serializeComparison(op));
      });
      if (operation.type == 'Not') {
        return 'NOT(' + operation.operand() + ')';
      }
      else {
        return '(' + ops.join(' ' + operation.type.toUpperCase() + ' ') + ')';
      }
    }
  };

  this._serializeComparison = function (comp) {
    return [this._serializeComparisonFieldName(comp),
        this._serializeComparisonComparator(comp),
        this._serializeComparisonValue(comp)].join(' ');
  };

  this._serializeComparisonFieldName = function (comp) {
    var name = comp.field;
    if (comp.opts.lowercase) {
      name = 'LOWER(' + name + ')';
    }
    return name;
  };

  this._serializeComparisonComparator = function (comp) {
    var val = comp.value
      , comparator = comp.comparatorString;
    if (val === null) {
      comparator = comp.type == 'EqualTo' ?
        'IS' : 'IS NOT';
    }
    return comparator;
  };

  this._serializeComparisonValue = function (comp) {
    var val = comp.value;
    if (val === null) {
      val = 'NULL';
    }
    else {
      if (comp.type == 'Like') {
        if (val.indexOf('%') == -1) {
          val += '%';
        }
      }
      val = datatypes[comp.datatype].serialize(val, {
          useQuotes: true
        , escape: true
      });
    }
    return val;
  };

})());

module.exports.Adapter = Adapter;
