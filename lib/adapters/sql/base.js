var model = require('../../index')
  , Adapter
  , BaseAdapter = require('../base_adapter').BaseAdapter
  , sql = require('../transformers/sql')
  , converter = require('./converter')
  , datatypes = require('../../datatypes')
  , utils = require('utilities')
  , operation = require('../../query/operation')
  , comparison = require('../../query/comparison');

Adapter = function () {
};

Adapter.prototype = new BaseAdapter();
utils.mixin(Adapter.prototype, new (function () {

  this.COLUMN_NAME_DELIMITER = '"';

  this._createItemProcessor = function (sql, tables, mainTable, query, callback) {
    var self = this;
    return function (err, rows) {
      var res
        , inst
        , assnInst
        , models = {}
        , instantiatedObjects = {};

      if (err) {
        callback(err, null);
      }
      else {
        // Make a map of the constructors for each table-name
        // Note that the table-name may be an alias for an association
        // First item in this list should be the owner table for
        // any subsequent associations, e.g., ['users', 'profiles']
        tables.forEach(function (t) {
          models[t] = {
            ctor: self._modelizeTableName(t, mainTable)
          , assnType: t == mainTable ? null : model.getAssociation(mainTable, t).type
          }
        });

        res = [];

        rows.forEach(function (row) {
          var obj = {}
            , colArr
            , table
            , key;

          // Create a column object with mapped params
          // users#login: 'foo', users#name: 'adsf', profiles#nickname: 'qwer'
          //{ users: {login: 'foo', name: 'asdf'}
          //, profile: {nickname: 'qewr'}
          //}
          for (var p in row) {
            colArr = p.split('#');
            table = colArr[0];
            key = colArr[1];
            obj[table] = obj[table] || {}
            obj[table][key] = row[p];
          }

          // Iterate over the list of table names, create a base owner object
          // when a new id shows up. (Owner object record is repeated for multiple
          // associations.) For each subsquent record, instantiate the association
          // and append it to an array in the named property for that association
          tables.forEach(function (p) {
            var params = obj[p]
              , modelItem = models[p]
              , keyName;

            if (!instantiatedObjects[p]) {
              instantiatedObjects[p] = {};
            }

            // Owner table-name
            if (p == mainTable) {
              if (instantiatedObjects[p][params.id]) {
                inst = instantiatedObjects[p][params.id];
              }
              else {
                // This is a new id -- create an owner object
                inst = modelItem.ctor.create(params, {scenario: query.opts.scenario});
                inst._saved = true;
                res.push(inst);
                instantiatedObjects[p][params.id] = inst;
              }
            }
            // Association table-name
            else {
              // Ignore empty records
              if (params.id) {
                if (modelItem.assnType == 'hasMany') {
                  keyName = p;
                  if (inst[keyName]) {
                    if (inst[keyName]._ids[params.id]) {
                      return;
                    }
                  }
                  else {
                    // Create an array to hold the items
                    inst[keyName] = [];
                    inst[keyName]._ids = {};
                  }
                }
                else {
                  keyName = utils.string.getInflection(p, 'property', 'singular');
                  if (inst[keyName]) {
                    if (inst[keyName].id == params.id) {
                      return;
                    }
                  }
                }

                if (instantiatedObjects[p][params.id]) {
                  assnInst = instantiatedObjects[p][params.id];
                }
                else {
                  assnInst = modelItem.ctor.create(params, {scenario: query.opts.scenario});
                  assnInst._saved = true;
                  instantiatedObjects[p][params.id] = assnInst;
                }

                if (modelItem.assnType == 'hasMany') {
                  inst[keyName]._ids[params.id] = true;
                  inst[keyName].push(assnInst);
                }
                else {
                  inst[keyName] = assnInst;
                }
              }
            }
          });
        });
        callback(null, res);
      }
    };
  };

  this._getIncludes = function (query) {
    var self = this
      , includes = query.opts.includes;
    if (includes) {
      includes = Array.isArray(includes) ? includes : [includes];
      includes = includes.map(function (t) {
        return self._tableizeModelName(t);
      });
    }
    return includes;
  };

  this._getSelectCols = function (query, tableName, includes) {
    var selects = [tableName];
    if (includes) {
      selects = selects.concat(includes);
    }
    return selects;
  };

  this._createSelectStatementWithConditions = function (query, selects, tableName, includes) {
    var self = this
      , sql = ''
      , conditions = this.transformConditions(query.conditions)
      , includesTableName
      , includesColName
      , opts = query.opts
      , sort = opts.sort
      , limit = opts.limit
      , skip = opts.skip;

    sql += 'SELECT ';
    if (query.opts.count) {
      sql += 'COUNT(*) ';
    }
    else {
      sql += selects.map(function (item) {
        return self._createSelectStatement(item, tableName);
      }).join(', ');
    }
    sql += ' ';
    sql += 'FROM ' + tableName;
    if (includes) {
      sql += ' ' + includes.map(function (item) {
        return self._createLeftOuterJoinStatement(tableName, item);
      }).join(' ');
    }
    if (conditions) {
      sql += ' ';
      sql += 'WHERE ' + conditions;
    }
    if (sort) {
      sql += ' ';
      sql += this.transformSortOrder(sort, tableName);
    }
    if (skip) {
      sql += ' ';
      sql += 'OFFSET ' + skip;
    }
    if (limit) {
      sql += ' ';
      sql += 'LIMIT ' + limit;
    }
    sql += ';'

    return sql;
  };

  this._createUpdateStatementWithConditions = function (data, query) {
    var modelName = data.type
      , reg = model.descriptionRegistry
      , props = reg[modelName].properties
      , prop
      , def
      , datatypes = model.datatypes
      , sql = ''
      , updates = []
      , update;

    // Iterate over the properties in the params, make sure each
    // property exists in the definition
    for (var p in data) {
      def = props[p];
      prop = data[p];
      if (props.hasOwnProperty(p)) {
        update = this._columnizePropertyName(p, {
          useQuotes: true
        }) +
        ' = ';

        update += this.transformValue(prop, def.datatype);

        updates.push(update);
      }
    }
    sql += 'UPDATE ' + this._tableizeModelName(modelName) + ' SET ';
    sql += updates.join(', ') + ' ';
    sql += 'WHERE ' + this.transformConditions(query.conditions);
    sql += ';'

    return sql;
  };

  this._createDeleteStatementWithConditions = function (query) {
    var sql = '';
    sql += 'DELETE FROM ' + this._tableizeModelName(query.model.modelName) + ' ';
    sql += 'WHERE ' + this.transformConditions(query.conditions);
    sql += ';'
    return sql;
  };

  this._createSelectStatement = function (modelName, ownerModelName) {
    var name
      , assumedName = utils.string.getInflection(modelName, 'constructor', 'singular')
      , ownerName
      , tableName
      , assumedTableName
      , props
      , propArr;

    // Assumed name is a real model
    if (model.descriptionRegistry[assumedName]) {
      name = assumedName;
    }
    // Otherwise it's a named association, need to look up the
    // actual model via it's owner's associations list
    else {
      ownerName = utils.string.getInflection(ownerModelName, 'constructor', 'singular');
      name = model.getAssociation(ownerName, assumedName).model;
    }

    tableName = this._tableizeModelName(name);
    assumedTableName = this._tableizeModelName(assumedName);
    props = model.descriptionRegistry[name].properties;
    propArr = [];

    propArr.push(assumedTableName + '.' +
       this.COLUMN_NAME_DELIMITER + 'id' + this.COLUMN_NAME_DELIMITER
       + ' AS "' + assumedTableName + '#id"');

    for (var p in props) {
      propArr.push(assumedTableName + '.' + this._columnizePropertyName(p) + ' AS "' +
        assumedTableName + '#' + this._columnizePropertyName(p, {useQuotes: false}) + '"');
    }
    return propArr.join(', ');
  };

  this._createLeftOuterJoinStatement = function (mainModelNameParam, assnModelNameParam) {
    var assn
      , mainName
      , mainTableName
      , mainColName
      , assnName
      , assnModelName
      , assnTableName
      , assnModelTableName
      , assnColName
      , through
      , throughTableName
      , throughAssnColName
      , sql;

    mainName = utils.string.getInflection(mainModelNameParam, 'constructor', 'singular');
    mainTableName = this._tableizeModelName(mainName);
    assnName = utils.string.getInflection(assnModelNameParam, 'constructor', 'singular');
    assn = model.getAssociation(mainName, assnName);
    assnModelName = assn.model;
    assnTableName = this._tableizeModelName(assnName);
    assnModelTableName = this._tableizeModelName(assnModelName);
    through = assn.through;

    // belongsTo is the reverse of a hasMany/hasOne
    if (assn.type == 'belongsTo') {
      // Normal assn
      if (assnName == assnModelName) {
        mainColName = assnName + 'Id';
      }
      // Named assn, namespace the id
      else {
        mainColName = mainName + assnName + 'Id';
      }

      assnColName = 'id';
    }
    else {
      mainColName = 'id';

      // Normal assn
      if (assnName == assnModelName) {
        assnColName = mainName + 'Id';
      }
      // Named assn, namespace the id
      else {
        if (through) {
          assnColName = mainName + 'Id';
        }
        else {
          assnColName = assnName + mainName + 'Id';
        }
      }
    }

    assnColName = this._columnizePropertyName(assnColName, {useQuotes: false});
    mainColName = this._columnizePropertyName(mainColName, {useQuotes: false});

    // Through assn
    // Ex., Baz model has association Foo through Bar
    // LEFT OUTER JOIN bars ON (bazes."id" = bars."baz_id")
    // LEFT OUTER JOIN foos foos ON (bars."foo_id" = foos."id")
    if (through) {
      throughTableName = this._tableizeModelName(through);
      throughAssnColName =
          utils.string.getInflection(assnModelName, 'constructor', 'singular') + 'Id';

      if (assnName != assnModelName) {
        throughAssnColName = assnName + throughAssnColName;
      }

      throughAssnColName = this._columnizePropertyName(throughAssnColName,
          {useQuotes: false});

      sql = 'LEFT OUTER JOIN ' + throughTableName + ' ON (' +
          mainTableName + '."' + mainColName + '" = ' +
          throughTableName + '."' + assnColName + '")';
      sql += ' ';
      sql += 'LEFT OUTER JOIN ' + assnModelTableName + ' ' + assnTableName + ' ON (' +
          throughTableName + '."' + throughAssnColName + '" = ' +
          assnTableName + '."' + mainColName + '")';
    }
    // Normal
    // Ex., Baz model has named association Foo {model: Bar}
    // LEFT OUTER JOIN bars foos ON (bazes."id" = foos."baz_id")
    else {
      sql = 'LEFT OUTER JOIN ' + assnModelTableName + ' ' + assnTableName + ' ON (' +
          mainTableName + '."' + mainColName + '" = ' +
          assnTableName + '."' + assnColName + '")';
    }

    return sql;
  };

  this._createInsertStatement = function (item, props, useAutoIncrementId) {
    var sql = ''
      , modelName = item.type
      , cols = []
      , vals = [];

    // If using string UUID ids
    if (!useAutoIncrementId) {
      item.id = item.id || utils.string.uuid();
      cols.push(this._columnizePropertyName('id'));
      vals.push(datatypes.string.serialize(item.id, {
        escape: 'sql'
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

})());

// Mix in basic conversion methods
utils.mixin(Adapter.prototype, converter);

// Mix in query transformer methods
utils.mixin(Adapter.prototype, sql);

module.exports.Adapter = Adapter;
