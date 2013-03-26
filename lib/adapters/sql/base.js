var model = require('../../index')
  , Adapter
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

  var _getModelNameForAssociation = function (mainName, assnName) {
    var assn
      , assnItem;
    if (model.descriptionRegistry[assnName]) {
      return assnName;
    }
    assn = model.descriptionRegistry[mainName].associations;
    for (var p in assn) {
      assnItem = assn[p][assnName];
      if (assnItem) {
        return assnItem.model;
      }
    }
  };

  this._tableizeModelName = function (name) {
    var tableName = utils.inflection.pluralize(name);
    tableName = utils.string.snakeize(tableName);
    return tableName;
  };

  this._createSelectStatement = function (modelName, ownerModelName) {

    var infl = utils.string.getInflections(modelName)
      , name
      , assumedName = infl.constructor.singular
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
      infl = utils.string.getInflections(ownerModelName);
      ownerName = infl.constructor.singular;
      name = _getModelNameForAssociation(ownerName, assumedName);
    }

    tableName = this._tableizeModelName(name);
    assumedTableName = this._tableizeModelName(assumedName);
    props = model.descriptionRegistry[name].properties;
    propArr = [];
    propArr.push(assumedTableName + '."id" AS "' + assumedTableName + '#id"');

    for (var p in props) {
      propArr.push(tableName + '.' + this._columnizePropertyName(p) + ' AS "' +
        assumedTableName + '#' + this._columnizePropertyName(p, {useQuotes: false}) + '"');
    }
    return propArr.join(', ');
  };

  this._createLeftOuterJoinStatement = function (mainModelName, assnModelName) {
    var mainInfl
      , mainName
      , mainTableName
      , assnInfl
      , assnName
      , assnModelName
      , assnTableName
      , assnModelTableName
      , assnColName

    mainInfl = utils.string.getInflections(mainModelName);
    mainName = mainInfl.constructor.singular;
    mainTableName = this._tableizeModelName(mainName);
    assnInfl = utils.string.getInflections(assnModelName);
    assnName = assnInfl.constructor.singular;
    assnModelName = _getModelNameForAssociation(mainName, assnName);
    assnTableName = this._tableizeModelName(assnName);
    assnModelTableName = this._tableizeModelName(assnModelName);
    if (assnName == assnModelName) {
      assnColName = assnName + 'Id';
    }
    else {
      assnColName = assnName + assnModelName + 'Id';
    }
    assnColName = this._columnizePropertyName(assnColName);

      return 'LEFT OUTER JOIN ' + assnModelTableName + ' ' + assnTableName +' ON (' +
          mainTableName + '."id" = ' + assnTableName + '.' + assnColName + ')';
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
