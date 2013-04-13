var model = require('../index')
  , utils = require('utilities')
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

  this.columnStatement = function (prop, options) {
    var sql = ''
      , opts = options || {};
      sql = '  ' + utils.string.snakeize(prop.name) + ' ' +
          datatypeMap[prop.datatype];
      if (opts.append) {
        sql += ' ' + opts.append;
      }
      return sql;
  };

  this.createTableStatement = function (name, props, options) {
        var sql = ''
          , opts = options || {}
          , tableName
          , idCol
          , propArr = [];

        tableName = utils.string.getInflection(name, 'filename', 'plural');

        sql += 'DROP TABLE IF EXISTS ' + tableName + ';\n';
        sql += 'CREATE TABLE ' + tableName + ' (\n';

        // Use DB auto-increment
        if (opts.autoIncrementId) {
          idCol = this.columnStatement({
            name: 'id'
          }, {append: 'SERIAL PRIMARY KEY'});
        }
        // Use string UUIDs
        else {
          idCol = this.columnStatement({
            name: 'id'
          , datatype: 'string'
          }, {append: 'PRIMARY KEY'});
        }
        propArr.push(idCol);

        for (var p in props) {
          propArr.push(this.columnStatement(props[p]));
        }
        sql += propArr.join(',\n') + '\n';
        sql += ');\n';
        return sql;
      };

  this.createTable = function (modelNames) {
    var self = this
      , sql = ''
      , reg = model.descriptionRegistry
      , ctor
      , props
      , opts
      , names = Array.isArray(modelNames) ?
            modelNames : [modelNames];
    names.forEach(function (name) {
      opts = {};
      ctor = model[name];
      opts.autoIncrementId = ctor.autoIncrementId;
      props = reg[name].properties;
      sql += self.createTableStatement(name, props, opts);
    });
    return sql;
  };

})();

module.exports = generator;

