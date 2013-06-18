var BaseTransformer = require('./base_transformer').BaseTransformer
  , utils = require('utilities')
  , operation = require('../../query/operation')
  , comparison = require('../../query/comparison')
  , datatypes = require('../../datatypes');

var sql = utils.mixin(new BaseTransformer(), new (function () {

  this.transformValue = function (prop, datatype) {
    var ret;
    // FIXME: Is special-casing this the right way to go?
    if (utils.isEmpty(prop)) {
      ret = 'NULL';
    }
    else {
      ret = datatypes[datatype].serialize(prop, {
        escape: 'sql'
      , useQuotes: true
      });
    }
    return ret;
  };

  this.transformSortOrder = function (sort, tableName) {
    var sql = ''
      , fieldArr = []
      , names
      , modelName
      , propertyName;
    for (var p in sort) {
      if (p.indexOf('.') > -1) {
        names = p.split('.');
        modelName = this._tableizeModelName(names[0]);
        propertyName = this._columnizePropertyName(names[1]);
      }
      else {
        modelName = this._tableizeModelName(tableName);
        propertyName = this._columnizePropertyName(p);
      }
      fieldArr.push(modelName + '.' + propertyName + ' ' + sort[p].toUpperCase());
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
    var name;
    name = this._tableizeModelName(comp.model);
    name += '.';
    name += this._columnizePropertyName(comp.field);
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
            , escape: 'sql'
          });
        };
    if (val === null) {
      ret = 'NULL';
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
          item = serialize(item);
          
          if (comp.opts.nocase) {
            item = 'LOWER(' + item + ')';
          }
          
          ret.push(item);
        });
        ret = '(' + ret.join(', ') + ')';
      }
      // Single val
      else {
        ret = serialize(val);
        
        if (comp.opts.nocase) {
          ret = 'LOWER(' + ret + ')';
        }
      }
    }
    return ret;
  };

})());

module.exports = sql;


