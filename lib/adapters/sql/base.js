var Adapter
  , BaseAdapter = require('../base_adapter').BaseAdapter
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

  this.transformValue = function (prop, datatype) {
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

  this.transformSortOrder = function (sort) {
    var sql = ''
      , fieldArr = [];
    for (var p in sort) {
      fieldArr.push(this._columnizePropertyName(p) + ' ' + sort[p].toUpperCase());
    }
    sql += 'ORDER BY ' + fieldArr.join(', ');
    return sql;
  }

  this.transformConditions = function (conditions) {
    var sql = this.transformOperation(conditions);
    return sql;
  };

  this.transformOperation = function (op) {
    var self = this
      , ops = [];
    if (op.isEmpty()) {
      return '';
    }
    else {
      if (op.type == 'not') {
        return 'NOT (' + self.transformOperation(op.operand()) + ')';
      }
      else {
        op.forEach(function (o) {
          if (o instanceof operation.OperationBase) {
            ops.push(self.transformOperation(o));
          }
          else {
            ops.push(self.transformComparison(o));
          }
        });
        return '(' + ops.join(' ' + op.type.toUpperCase() + ' ') + ')';
      }
    }
  };

  this.transformComparison = function (comp) {
    return [this.transformComparisonFieldName(comp),
        this.transformComparisonComparator(comp),
        this.transformComparisonValue(comp)].join(' ');
  };

  this.transformComparisonFieldName = function (comp) {
    var name = this._columnizePropertyName(comp.field);
    if (comp.opts.nocase) {
      name = 'LOWER(' + name + ')';
    }
    return name;
  };

  this.transformComparisonComparator = function (comp) {
    var val = comp.value
      , comparator = comp.sqlComparatorString;
    if (val === null) {
      comparator = (comp instanceof comparison.EqualToComparison) ?
        'IS' : 'IS NOT';
    }
    return comparator;
  };

  this.transformComparisonValue = function (comp) {
    var val = comp.value
      , ret = ''
      , serialize = function (val) {
          return datatypes[comp.datatype].serialize(val, {
              useQuotes: true
            , escape: true
          });
        }
    if (val === null) {
      val = 'NULL';
    }
    else {
      if (comp instanceof comparison.LikeComparison) {
        // Prefix with percent if they didn't include one
        if (val.indexOf('%') == -1) {
          val += '%';
        }
      }

      // Inclusion, multiple values
      if (comp instanceof comparison.InclusionComparison) {
        ret = [];
        val.forEach(function (item) {
          ret.push(serialize(item));
        });
        ret = '(' + ret.join(', ') + ')';
      }
      // Single val
      else {
        ret = serialize(val);
      }
    }
    return ret;
  };

})());

module.exports.Adapter = Adapter;
