
var model = require('../index')
  , utils = require('utilities')
  , generator
  , datatypeMap;

datatypeMap = {
  'string': 'varchar(256)'
, 'text': 'text'
, 'number': 'real'
, 'int': 'integer'
, 'boolean': 'boolean'
, 'date': 'date'
, 'datetime': 'timestamp'
, 'time': 'time'
};

generator = new (function () {
  var _createTable = function (name, props, opts) {
        var sql = ''
          , tableName
          , prop
          , propArr = []
          , datatype;

        tableName = utils.inflection.pluralize(name);
        tableName = utils.string.snakeize(tableName);

        sql += 'DROP TABLE IF EXISTS ' + tableName + ';\n';
        sql += 'CREATE TABLE ' + tableName + ' (\n';

        // Use DB auto-increment
        if (opts.autoIncrementId) {
          propArr.push('  id SERIAL PRIMARY KEY');
        }
        // Use string UUIDs
        else {
          propArr.push('  id varchar(256) PRIMARY KEY');
        }

        for (var p in props) {
          prop = props[p];
          datatype = datatypeMap[prop.datatype];
          // Only create cols for known datatypes
          if (datatype) {
            propArr.push('  ' + utils.string.snakeize(prop.name) + ' ' +
                datatypeMap[prop.datatype]);
            }
        }
        sql += propArr.join(',\n') + '\n';
        sql += ');\n';
        return sql;
      };

  this.createTable = function (modelNames) {
    var sql = ''
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
      sql += _createTable(name, props, opts);
    });
    return sql;
  };

})();

module.exports = generator;

