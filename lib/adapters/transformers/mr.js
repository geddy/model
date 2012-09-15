var operation = require('../../query/operation')
  , comparison = require('../../query/comparison')
  , datatypes = require('../../datatypes')
  , _serializeForDataType;

_serializeForDataType = function (datatype, val) {
  var ret;
  switch (true) {
    case val === null:
      ret = 'null';
      break;
    case val === '':
      ret = '\'\'';
      break;
    case datatype == 'date' || datatype == 'datetime':
      ret = JSON.stringify(val).replace(/"/g, "'");
      break;
    default:
      ret = datatypes[datatype].serialize(val, {
          useQuotes: true
        , escape: true
      });
  }
  return ret;
};

var mr = new (function () {

  var _operationSymbols = {
    'and': '&&'
  , 'or': '||'
  };

  this.transformSortOrder = function (sort) {
    return sort ? JSON.stringify(sort).replace(/"/g, "'") : '';
  };

  this.transformConditions = function (conditions) {
    var cond = this.transformOperation(conditions);
    return cond;
  };

  this.transformOperation = function (op) {
    var self = this
      , ops = [];
    if (op.isEmpty()) {
      return '(true)';
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
      if (op.type == 'not') {
        return '(!(' + self.transformOperation(op.operand()) + '))';
      }
      else {
        return '(' + ops.join(' ' + _operationSymbols[op.type.toLowerCase()] +
            ' ') + ')';
      }
    }
  };

  this.transformComparison = function (comp) {
    var ret = ''
      , name = this.transformComparisonFieldName(comp)
      , arr = [];
    switch (true) {
      case comp instanceof comparison.LikeComparison:
        ret = name + '.indexOf(' +
            this.transformComparisonValue(comp) + ') === 0';
        break;
      case comp instanceof comparison.InclusionComparison:
        comp.value.forEach(function (item) {
          arr.push(name + ' == ' +
              _serializeForDataType(comp.datatype, item));
        });
        ret = arr.join(' || ');
        break;
      default:
        ret = [name, this.transformComparisonComparator(comp),
            this.transformComparisonValue(comp)].join(' ');

    }
    return ret;
  };

  this.transformComparisonFieldName = function (comp) {
    // Use bracket-notation, in case field-name has special chars
    // or is a reserved word
    var name = 'data[\'' + comp.field + '\']';
    if (comp.opts.nocase) {
      name += '.toLowerCase()';
    }
    return name;
  };

  this.transformComparisonComparator = function (comp) {
    var comparator = comp.jsComparatorString;
    return comparator;
  };

  this.transformComparisonValue = function (comp) {
    return _serializeForDataType(comp.datatype, comp.value);
  };

})();

module.exports = mr;
