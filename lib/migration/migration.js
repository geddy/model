
var utils = require('utilities')
  , generator = require('../generators/sql')
  , Migration
  , Columnator;

Migration = function (adapter) {
  this.adapter = adapter;
};
Migration.prototype = new (function () {

  this.up = function (next) {
    next();
  };

  this.down = function (next) {
    next();
  };

  // ALTER TABLE distributors ADD COLUMN address varchar(30);
  this.addColumn = function (table, column, datatype, options, cb) {};

  // ALTER TABLE distributors DROP COLUMN address RESTRICT;
  this.removeColumn = function (table, column, cb) {};

  this.addIndex = function (table, column, options, cb) {};

  // ALTER TABLE distributors ALTER COLUMN address TYPE varchar(30);
  this.changeColumn = function (table, column, datatype, options, cb) {};

  // ALTER TABLE distributors RENAME COLUMN address TO city;
  this.renameColumn = function (table, column, newColumn, cb) {};

  this.createTable = function (/*name, [opts], [definition], cb*/) {
    var args = Array.prototype.slice.call(arguments)
      , arg
      , sql = ''
      , name = args.shift()
      , opts = {}
      , definition = function () {}
      , cb = args.pop()
      , col = new Columnator();

    // Optional opts/callback or callback/opts
    while ((arg = args.pop())) {
      if (typeof arg == 'function') {
        definition = arg;
      }
      else {
        opts = arg;
      }
    }

    definition(col);
    sql = generator.createTableStatement(name, col.cols);
    this.adapter.exec(sql, cb);
  };

  // DROP TABLE IF EXISTS distributors;
  this.dropTable = function (name, cb) {};

  this.removeIndex = function (table, column, cb) {};

})();

Columnator = function () {
  this.cols = {};
};
Columnator.prototype = new (function () {

  this.column = function (name, datatype) {
    this.cols[name] = {
      name: name
    , datatype: datatype
    };
  };

})();

exports.Migration = Migration;
