var utils = require('utilities')
  , generator
  , datatypeMap;

// TODO Better map, SQL-implementation specific
datatypeMap = {
  'string': 'varchar(256)'
, 'text': 'text'
, 'number': 'real'
, 'int': 'integer'
, 'boolean': 'boolean'
, 'date': 'date'
, 'datetime': 'timestamp'
, 'time': 'time'
, 'object': 'text'
};

generator = new (function () {

  this.getDatatype = function (jsType) {
    return datatypeMap[jsType];
  };

  this.addColumnStatement = function (prop, options) {
    var sql = 'ADD COLUMN '
      , opts = options || {};
      sql += utils.string.snakeize(prop.name);
      if (prop.datatype) {
        sql += ' ' + this.getDatatype(prop.datatype);
      }
      if (opts.append) {
        sql += ' ' + opts.append;
      }
      return sql;
  };

  this.dropColumnStatement = function (prop) {
    var sql = 'DROP COLUMN ';
    sql += utils.string.snakeize(prop.name);
    return sql;
  }

  this.alterColumnStatement = function (prop) {
    var sql = 'ALTER COLUMN ';
    sql += utils.string.snakeize(prop.name) + ' ';
    sql += 'TYPE ' + this.getDatatype(prop.datatype);
    return sql;
  }

  this.renameColumnStatement = function (prop) {
    var sql = 'RENAME COLUMN ';
    sql += utils.string.snakeize(prop.name) + ' ';
    sql += 'TO ' + utils.string.snakeize(prop.newName);
    return sql;
  }

  // CREATE TABLE distributors (did integer, name varchar(40));
  this.createTableStatement = function (name, props, options) {
    var model = require('../index')
      , sql = ''
      , opts = options || {}
      , tableName
      , idCol
      , propArr = [];

    tableName = utils.string.getInflection(name, 'filename', 'plural');

    sql += 'CREATE TABLE ' + tableName + ' (';

    // Use DB auto-increment
    // FIXME: Is this syntax Postgres-specific?
    if (model.autoIncrementId) {
      idCol = this.addColumnStatement({
        name: 'id'
      }, {append: 'SERIAL PRIMARY KEY'});
    }
    // Use string UUIDs
    else {
      idCol = this.addColumnStatement({
        name: 'id'
      , datatype: 'string'
      }, {append: 'PRIMARY KEY'});
    }
    propArr.push(idCol);

    for (var p in props) {
      propArr.push(this.addColumnStatement(props[p]));
    }
    sql += propArr.join(', ');
    sql += ');';
    // Strip out the ADD COLUMN commands, which are implicit
    // in a CREATE TABLE
    sql = sql.replace(/ADD COLUMN /g, '');
    return sql;
  };

  this.alterTableStatement = function (name, alterations, options) {
    var self = this
      , sql = ''
      , opts = options || {}
      , alter = Array.isArray(alterations) ? alterations : [alterations]
      , alterArr = []
      , tableName;

    tableName = utils.string.getInflection(name, 'filename', 'plural');
    sql += 'ALTER TABLE ' + tableName + ' ';

    // {operation: 'add', property: {name: 'foo', datatype: 'string'}}
    alter.forEach(function (item) {
      alterArr.push(self[item.operation + 'ColumnStatement'](item.property));
    });
    sql += alterArr.join(', ');
    sql += ';';
    return sql;
  };

  this.dropTableStatement = function (name) {
    var sql = ''
      , tableName = utils.string.getInflection(name, 'filename', 'plural');
    sql += 'DROP TABLE IF EXISTS ' + tableName + '; ';
    return sql;
  };

  this.createTable = function (modelNames) {
    var model = require('../index')
      , self = this
      , sql = ''
      , reg = model.descriptionRegistry
      , props
      , names = Array.isArray(modelNames) ?
            modelNames : [modelNames];
    names.forEach(function (name) {
      props = reg[name].properties;
      sql += self.createTableStatement(name, props);
    });
    return sql;
  };

  this.dropTable = function (modelNames) {
    var self = this
      , sql = ''
      , names = Array.isArray(modelNames) ?
            modelNames : [modelNames];
    names.forEach(function (name) {
      sql += self.dropTableStatement(name);
    });
    return sql;
  };

})();

module.exports = generator;

