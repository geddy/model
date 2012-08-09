
var model = require('../index')
  , utils = require('utilities')
  , generator
  , datatypeMap;

datatypeMap = {
  'string': 'varchar(256)'
, 'number': 'real'
, 'integer': 'integer'
, 'boolean': 'boolean'
, 'date': 'date'
, 'datetime': 'timestamp'
, 'time': 'time'
};

generator = new (function () {
  var _createTable = function (name, props) {
        var sql = ''
          , tableName
          , prop
          , datatype;

        tableName = utils.inflection.pluralize(name);
        tableName = utils.string.snakeize(tableName);

        sql += 'DROP TABLE IF EXISTS ' + tableName + ';\n';
        sql += 'CREATE TABLE ' + tableName + ' (\n';
        for (var p in props) {
          prop = props[p];
          datatype = datatypeMap[prop.datatype];
          // Only create cols for known datatypes
          if (datatype) {
            sql += '  ' + utils.string.snakeize(prop.name) + ' ' +
                datatypeMap[prop.datatype] + ',\n';
            }
        }
        sql += ');\n';
        return sql;
      };

  this.run = function (modelNames) {
    var sql = ''
      , reg = model.descriptionRegistry
      , props;
    modelNames.forEach(function (name) {
      props = reg[name].properties;
      sql += _createTable(name, props);
    });
    return sql;
  };

})();

module.exports = generator;

