var Adapter
  , BaseAdapter = require('../base_adapter').BaseAdapter
  , datatypes = require('../../datatypes')
  , utils = require('utilities')
  , operation = require('../../query/operation');

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

  this._serializeValue = function (prop, datatype) {
    var ret;
    // FIXME: Is special-casing this the right way to go?
    if (prop === null || prop === undefined || prop == '') {
      ret = 'NULL';
    }
    else {
      ret = datatypes[datatype].serialize(prop, {
        escape: true
      , useQuotes: true
      });
    }
    return ret;
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
    var sql = this._serializeOperation(conditions);
    return sql;
  };

  this._serializeOperation = function (op) {
    var self = this
      , ops = [];
    if (op.isEmpty()) {
      return '';
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
        return 'NOT (' + self._serializeOperation(op.operand()) + ')';
      }
      else {
        return '(' + ops.join(' ' + op.type.toUpperCase() + ' ') + ')';
      }
    }
  };

  this._serializeComparison = function (comp) {
    return [this._serializeComparisonFieldName(comp),
        this._serializeComparisonComparator(comp),
        this._serializeComparisonValue(comp)].join(' ');
  };

  this._serializeComparisonFieldName = function (comp) {
    var name = this._columnizePropertyName(comp.field);
    if (comp.opts.lowercase) {
      name = 'LOWER(' + name + ')';
    }
    return name;
  };

  this._serializeComparisonComparator = function (comp) {
    var val = comp.value
      , comparator = comp.sqlComparatorString;
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
