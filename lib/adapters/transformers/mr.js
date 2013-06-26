var BaseTransformer = require('./base_transformer').BaseTransformer
  , utils = require('utilities')
  , operation = require('../../query/operation')
  , comparison = require('../../query/comparison')
  , datatypes = require('../../datatypes');

var mr = utils.mixin(new BaseTransformer(), new (function () {

  var _transformForDataType = function (datatype, val, nocase) {
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
            if (nocase) {
              val = val.toLowerCase();
            }
            
            ret = datatypes[datatype].serialize(val, {
                useQuotes: true
              , escape: 'js'
            });
        }
        return ret;
      }

    // This function is special -- its source is transformed by
    // replacing the __sort__ variable. It's also converted into
    // a JSON-safe string in the Riak adapter and posted as the
    // reduce-sort
    , _sortFunction = function (values) {
        // Dummy value to replace with real sort data -- will look
        // like {'foo': 'asc', 'bar': 'desc'}
        var sort = '__sort__'
        // Directional sort, returns explicit zero if equal
          , baseSort = function (a, b, dir) {
            if (a == b) {
              return 0;
            }
            if (dir == 'asc') {
              return a > b ? 1 : -1;
            }
            else {
              return a > b ? -1 : 1;
            }
          }
        // Iterates each of the sort columns until it finds a
        // pair of values that are not the same
        , columnSort = function (a, b) {
            var ret;
            for (var p in sort) {
              // Call the directional sort for the two values
              // in this property
              ret = baseSort(a[p], b[p], sort[p]);
              // -1 and 1 are truthy
              if (ret) {
                return ret;
              }
            }
            return 1;
          };
        return values.sort(columnSort);
      }

    , _operationSymbols = {
        'and': '&&'
      , 'or': '||'
      };

  this.transformSortOrder = function (sort) {
    var sortString
      , sortSource;

    if (!sort) {
      return null;
    }

    sortString = JSON.stringify(sort).replace(/"/g, "'")
    sortSource = _sortFunction.toString()
        // Strip comments
        .replace(/\/\/.*(\n)/g, '')
        // Strip linebreaks
        .replace(/\n/g, ' ')
        // Reduce multiple spaces to single space
        .replace(/ {2,}/g, ' ')
        // Replace placeholder with real sort, e.g., {'foo': 'asc'}
        .replace('\'__sort__\'', sortString);

    // Get the function body
    sortSource = sortSource.replace('function (values) { ', '');
    sortSource = sortSource.substr(0, sortSource.length - 1);

    return new Function('values', sortSource);
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
              _transformForDataType(comp.datatype, item));
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
    return _transformForDataType(comp.datatype, comp.value, comp.opts.nocase);
  };

})());

module.exports = mr;
