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

  this._createSelectStatement = function (modelName, ownerModelName) {
    var name
      , assumedName = utils.string.getInflection(modelName, 'constructor', 'singular')
      , ownerName
      , tableName
      , assumedTableName
      , props
      , propArr
      , propertyNameExpression;

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
    propArr.push(assumedTableName + '."id" AS "' + assumedTableName + '#id"');

    for (var p in props) {
      propertyNameExpression = assumedTableName + '.' + this._columnizePropertyName(p);

      if(props[p].datatype === 'datetime')
        propertyNameExpression = propertyNameExpression +  'AT TIME ZONE \'UTC\'';

      propArr.push(propertyNameExpression + ' AS "' +
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
