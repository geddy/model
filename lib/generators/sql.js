var utils = require('utilities')
  , StandardGenerator
  , MySQLGenerator
  , PostgresGenerator
  , SQLiteGenerator
  , datatypeMap
  , generatorMap;

// TODO Better map, SQL-implementation specific
datatypeMap = {
  'string': 'VARCHAR(255)'
, 'text': 'TEXT'
, 'number': 'REAL'
, 'int': 'INTEGER'
, 'boolean': 'BOOLEAN'
, 'date': 'DATE'
, 'datetime': 'TIMESTAMP'
, 'time': 'TIME'
, 'object': 'TEXT'
};

StandardGenerator = function () {
  this._datatypes = utils.mixin({}, datatypeMap);
  this.COLUMN_NAME_DELIMITER = '"';
};

StandardGenerator.prototype = new (function () {

  this.getDatatype = function (jsType) {
    return this._datatypes[jsType];
  };

  this.addColumnStatement = function (prop, options) {
    var sql = 'ADD COLUMN '
      , opts = options || {}
      , delimiter = this.COLUMN_NAME_DELIMITER;
      sql += delimiter + utils.string.snakeize(prop.name) + delimiter;
      if (prop.datatype) {
        sql += ' ' + this.getDatatype(prop.datatype);
      }
      if (opts.append) {
        sql += ' ' + opts.append;
      }
      return sql;
  };

  this.dropColumnStatement = function (prop) {
    var sql = 'DROP COLUMN '
      , delimiter = this.COLUMN_NAME_DELIMITER;
    sql += delimiter + utils.string.snakeize(prop.name) + delimiter;
    return sql;
  };

  this.alterColumnStatement = function (prop) {
    var sql = 'ALTER COLUMN '
      , delimiter = this.COLUMN_NAME_DELIMITER;
    sql += delimiter + utils.string.snakeize(prop.name) + delimiter + ' ';
    sql += 'TYPE ' + this.getDatatype(prop.datatype);
    return sql;
  };

  this.renameColumnStatement = function (prop) {
    var sql = 'RENAME COLUMN '
      , delimiter = this.COLUMN_NAME_DELIMITER;
    sql += delimiter + utils.string.snakeize(prop.name) + delimiter + ' ';
    sql += 'TO ' + delimiter + utils.string.snakeize(prop.newName) + delimiter;
    return sql;
  };

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
    if (model.config.autoIncrementId) {
      idCol = this.addColumnStatement({
        name: 'id'
      }, {append: 'BIGSERIAL PRIMARY KEY'});
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

PostgresGenerator = function () {
  StandardGenerator.call(this);
  this._datatypes = utils.mixin({}, datatypeMap);
  utils.mixin(this._datatypes, {
    'int': 'BIGINT'
  , 'object': 'JSON'
  });
};
PostgresGenerator.prototype = Object.create(StandardGenerator.prototype);

MySQLGenerator = function () {
  StandardGenerator.call(this);
  this._datatypes = utils.mixin({}, datatypeMap);
  utils.mixin(this._datatypes, {
    'int': 'BIGINT'
  , 'datetime': 'TIMESTAMP NULL'
  });
  this.COLUMN_NAME_DELIMITER = '`';
};
MySQLGenerator.prototype = Object.create(StandardGenerator.prototype);
MySQLGenerator.prototype.alterColumnStatement = function (prop) {
  var sql = 'MODIFY COLUMN '
    , delimiter = this.COLUMN_NAME_DELIMITER;
  sql += delimiter + utils.string.snakeize(prop.name) + delimiter + ' ';
  sql += this.getDatatype(prop.datatype);
  return sql;
};

SQLiteGenerator = function () {
  StandardGenerator.call(this);
};
SQLiteGenerator.prototype = Object.create(StandardGenerator.prototype);
SQLiteGenerator.prototype.alterColumnStatement = function (prop) {
  var msg = 'Sorry, SQLite does not support ALTER COLUMN: ' +
      'http://www.sqlite.org/lang_altertable.html\n' +
      'Please use PostgreSQL or MySQL, ' +
      'or work around using ADD/REMOVE and a temp column: ' +
      'http://stackoverflow.com/questions/805363/how-do-i-rename-a-column-in-a-sqlite-database-table';
  throw new Error(msg);
};

generatorMap = {
  postgres: PostgresGenerator
, mysql: MySQLGenerator
, sqlite: SQLiteGenerator
};

module.exports = {
  StandardGenerator: StandardGenerator
, getGeneratorForAdapter: function (adapter) {
    var ctor = generatorMap[adapter.name];
    return new ctor();
  }
};

