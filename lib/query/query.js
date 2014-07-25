
var query = {}
  , Query
  , utils = require('utilities')
  , model = require('../index')
  , operation = require('./operation')
  , comparison = require('./comparison');

Query = function (model, conditions, options) {
  this.model = null;
  this.conditions = null;
  this.initialize.apply(this, arguments);
};

Query.comparisonTypes = {
  'eql': 'EqualTo'
, 'ne': 'NotEqualTo'
, 'in': 'Inclusion'
, 'like': 'Like'
, 'gt': 'GreaterThan'
, 'lt': 'LessThan'
, 'gte': 'GreaterThanOrEqual'
, 'lte': 'LessThanOrEqual'
};

Query.prototype = new (function () {

  var _operationTypes = {
        'and': true
      , 'or': true
      , 'not': true
      , 'null': true
      }

    , _isQueryObject = function (obj) {
        // Just generic query object -- not null, Date, or Boolean, or Array
        return (obj && typeof obj == 'object' && !(obj instanceof Date) &&
            !(obj instanceof Boolean) && !Array.isArray(obj));
      }

    , _extractComparisonType = function (obj) {
        // Just generic query object -- not null, Date, or Boolean
        if (_isQueryObject(obj)) {
          // Return any valid comparison type used as key
          for (var p in obj) {
            if (Query.comparisonTypes[p]) {
              return p;
            }
          }
        }
      }

    , _createFieldValidator = function () {
        var self = this
          , baseProps = {
              id: true
            , createdAt: true
            , updatedAt: true
            };
        return function (k) {
          var keyName = k
            , keyNameArr
            , modelName
            , reg
            , assnTokens = [];

          // Users.loginId, Teams.name
          // Sort on nested association property
          modelName = self.model.modelName

          // Walks through the associations and updates modelName
          // until we reach the property name
          if (keyName.indexOf('.') > -1) {
            if(self.opts != null && self.opts.limit != null) {
              throw new Error('It is not possible to query on an association when there is a limit clause')
            }

            keyNameArr = keyName.split('.');

            while(keyNameArr.length > 1) {
              var tempAssnName = keyNameArr.shift()
                , assn = model.getAssociation(modelName, tempAssnName)

              assnTokens.push(tempAssnName)

              if(!assn) {
                throw new Error('The association "' + tempAssnName + '" is not a valid ' +
                                'property on the ' + modelName + ' model.');
              }
              else {
                modelName = assn.model
              }
            }

            keyName = keyNameArr[0]
          }

          reg = model.descriptionRegistry[modelName].properties;

          if (baseProps[keyName] || reg[keyName]) {
            return {
              modelName: modelName
            , propertyName: keyName
            , assnTokens: assnTokens
            };
          }
          else {
            return null;
          }
        };
      }

    , _createOperation = function (conditions, key) {
        var self = this
          , type = key || 'and'
          , cond
          , item
          , op = operation.create(type)
          , notOperand
          , operand
          , keys;

        // TODO: Handle associations
        for (var k in conditions) {
          cond = conditions[k];

          // Operation type, can contain other operations/conditions
          if (_operationTypes[k]) {
            // Base operation-type to create: if the type is a 'not',
            // create a single 'and' with the same conditions to wrap
            // in a 'not'
            type = k == 'not' ? 'and' : k;

            // If the conditions are an array, create a single 'and'
            // op that wraps each set of conditions in each item, and
            // add to the wrapper
            if (Array.isArray(cond)) {
              // Create empty wrapper
              operand = operation.create(type);
              cond.forEach(function (c) {
                operand.add(_createOperation.apply(self, [c, 'and']));
              });
            }
            // Simple object-literal, just create an operation
            else {
              operand = _createOperation.apply(this, [cond, type]);
            }

            // If this was a 'not' operation, create a wrapping 'not'
            // to contain the single operation created
            if (k == 'not') {
              notOperand = operation.create(k);
              notOperand.add(operand);
              operand = notOperand;
            }
          }
          // Condition, may be leaf-node or multiple comparisions
          // ANDed on the same field
          else {
            // Exclude null, exclude array-values, only consider actual objects
            if (_isQueryObject(cond)) {
              keys = Object.keys(cond);
            }
            // If there are multiple keys, means it's multiple comparisons on
            // the same field
            if (keys && keys.length > 1) {
              // Create wrapper operation
              operand = operation.create('and');
              // Go through each of the comparision keys in the object
              // and create single comparisions which can be ANDed together.
              // E.g.: {foo: {gte: 1, lte: 5}} =>
              // {and: [{foo: {gte: 1}}, {foo: {lte: 5}}]}
              keys.forEach(function (kk) {
                var q = {};
                q[k] = {};
                q[k][kk] = cond[kk];
                if (!Query.comparisonTypes[kk]) {
                  throw new Error(kk + ' is not a valid type of comparison');
                }
                operand.add(_createOperation.apply(self, [q, 'and']));
              });
            }
            // Simple condition (leaf-node)
            // {foo: {ne: 'asdf'} or {foo: 1} or {foo: [1, 2, 3]}
            else {
              operand = _createComparison.apply(this, [cond, k]);
            }
          }

          op.add(operand);
        }
        return op;
      }

    , _createComparison = function (val, key) {
        var type
          , keyName = key
          , keyNameArr
          , modelName
          , props
          , descr
          , datatype
          , opts
          , assnTokens = [];

        modelName = this.model.modelName
        assnTokens.push(modelName)

        // Walks through the associations and updates modelName
        // until we reach the property name
        if (keyName.indexOf('.') > -1) {
          if(this.opts != null && this.opts.limit != null) {
            throw new Error('It is not possible to query on an association when there is a limit clause')
          }

          keyNameArr = keyName.split('.');
          modelName = this.model.modelName;

          while(keyNameArr.length > 1) {
            var tempAssnName = keyNameArr.shift()
              , assn = model.getAssociation(modelName, tempAssnName)

            assnTokens.push(tempAssnName)

            if(!assn) {
              throw new Error('The association "' + tempAssnName + '" is not a valid ' +
                              'property on the ' + modelName + ' model.');
            }
            else {
              modelName = assn.model
            }
          }

          keyName = keyNameArr[0]
        }

        props = model.descriptionRegistry[modelName].properties;
        descr = props[keyName];

          // {id: ['foo', 'bar', 'baz']}, shorthand for Inclusion
        if (Array.isArray(val)) {
          type = 'in';
        }
        else {
          // Single query objects -- not null, Date, Boolean
          // e.g., {id: {'like': 'foo'}}
          type = _extractComparisonType(val);
          if (type) {
            val = val[type];
          }
          // Simple scalar value, default to equality
          else {
            type = 'eql';
          }
        }

        // FIXME: How the fuck to handle IDs?
        // id isn't in the defined props
        if (keyName == 'id') {
          if (model.config.autoIncrementId) {
            datatype = 'int';
          }
          else {
            datatype = 'string';
          }
        }
        else {
          if (typeof descr === 'undefined') {
            throw new Error('The property "' + keyName + '" is not a valid ' +
                            'property on the ' + modelName + ' model.');
          }

          datatype = descr.datatype;
        }

        opts = _createComparisonOpts.apply(this, [keyName, datatype, assnTokens]);

        // TODO: Validate the value for both the particular field
        // (e.g., must be a numeric) and the type of comparison
        // (e.g., 'IN' must be a collection, etc)
        return comparison.create(Query.comparisonTypes[type], modelName,
            keyName, val, datatype, opts);
      }

    , _createComparisonOpts = function (key, datatype, assnTokens) {
        var opts = this.opts
          , nocase = opts.nocase
          , ret = {};
        if (nocase && (datatype == 'string' || datatype == 'text')) {
          if (Array.isArray(nocase)) {
            if (nocase.some(function (o) {
              return o == key;
            })) {
              ret.nocase = true;
            }
          }
          else {
            ret.nocase = true;
          }
        }

        if(Array.isArray(assnTokens) && assnTokens.length) {
          ret.assnTokens = assnTokens
        }

        return ret;
      }

    , _parseOpts = function (options) {
        var opts = options || {}
          , ret = {}
          , val
          , parsed
          , validatedField
          , validated = {}
          , defaultDir = 'asc';
        for (var prop in opts) {
          val = opts[prop];
          switch (prop) {
            case 'sort':
              // 'foo,bar,baz'
              if (typeof val == 'string') {
                val = val.split(',');
              }
              // ['foo', 'bar', 'baz']
              if (Array.isArray(val)) {
                parsed = {};
                val.forEach(function (v) {
                  parsed[v] = defaultDir;
                });
              }
              else {
                parsed = val;
              }
              // Now there's a well-formed obj, validate fields
              for (var p in parsed) {
                val = parsed[p].toLowerCase();
                validatedField = this.getValidField(p);
                if (!validatedField) {
                  throw new Error(p + ' is not a valid field for ' +
                      this.model.modelName);
                }
                if (!(val == 'asc' || val == 'desc')) {
                  throw new Error('Sort directon for ' + p +
                      ' field on ' + validatedField.modelName + ' must be ' +
                      'either "asc" or "desc"');
                }
                if (validatedField.assnTokens.length) {
                  var temp = validatedField.assnTokens.concat(validatedField.propertyName).join('.');
                  validated[temp] = val;
                }
                else {
                  validated[p] = val;
                }
              }
              ret[prop] = validated;
              break;
            case 'limit':
            case 'skip':
              if (isNaN(val)) {
                throw new Error('"' + prop + '" must be a number.');
              }
              ret[prop] = Number(val);
              break;
            default:
              ret[prop] = val;
          }
        }
        return ret;
      }

    // If there's an 'id' property in the top-level of the query
    // object, allow non-relational stores to optimize
    , _isByIdQuery = function (params) {
        // Don't optimize if there is more than one property
        if(Object.keys(params).length > 1) {
          return null;
        }
        // Don't optimize if it's a list of ids
        if (Array.isArray(params.id)) {
          return null;
        }
        return params.id ? params.id : null;
      };

  this.initialize = function (model, conditionParams, opts) {

    this.model = model;
    this.byId = _isByIdQuery(conditionParams);
    this.getValidField = _createFieldValidator.apply(this);
    this.opts = _parseOpts.apply(this, [opts || {}]);
    this.conditions = _createOperation.apply(this, [conditionParams]);
    this.rawConditions = conditionParams;
  };

})();

query.Query = Query;

module.exports = query;
