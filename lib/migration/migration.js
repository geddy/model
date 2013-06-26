
var utils = require('utilities')
  , generator = require('../generators/sql')
  , Migration
  , Columnator
  , defaultAdapter = null;

Migration = function (name, adapter) {
  this.name = name;
  this.adapter = adapter || defaultAdapter;
};
Migration.prototype = new (function () {

  this.up = function (next) {
    next();
  };

  this.down = function (next) {
    next();
  };

  // ALTER TABLE distributors ADD COLUMN address varchar(30);
  this.addColumn = function (/* table, column, datatype, [options], cb*/) {
    var args = Array.prototype.slice.call(arguments)
      , sql = ''
      , table = args.shift()
      , column = args.shift()
      , datatype = args.shift()
      , cb = args.pop()
      , opts = args.pop() || {} // Optional

    sql = generator.alterTableStatement(table, {
      operation: 'add'
    , property: {
        name: column
      , datatype: datatype
      }
    });
    this.adapter.exec(sql, cb);
  };

  // ALTER TABLE distributors DROP COLUMN address;
  this.removeColumn = function (table, column, cb) {
    var sql = generator.alterTableStatement(table, {
      operation: 'drop'
    , property: {
        name: column
      }
    });
    this.adapter.exec(sql, cb);
  };

  // TODO
  this.addIndex = function (table, column, options, cb) {};

  // ALTER TABLE distributors ALTER COLUMN address TYPE varchar(30);
  this.changeColumn = function (table, column, datatype, options, cb) {
    var args = Array.prototype.slice.call(arguments)
      , sql = ''
      , table = args.shift()
      , column = args.shift()
      , datatype = args.shift()
      , cb = args.pop()
      , opts = args.pop() || {} // Optional

    sql = generator.alterTableStatement(table, {
      operation: 'alter'
    , property: {
        name: column
      , datatype: datatype
      }
    });
    this.adapter.exec(sql, cb);
  };

  // ALTER TABLE distributors RENAME COLUMN address TO city;
  this.renameColumn = function (table, column, newColumn, cb) {
    var sql = generator.alterTableStatement(table, {
      operation: 'rename'
    , property: {
        name: column
      , newName: newColumn
      }
    });
    this.adapter.exec(sql, cb);
  };

  // CREATE TABLE distributors (did integer, name varchar(40));
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
  this.dropTable = function (name, cb) {
    var sql = generator.dropTableStatement(name);
    this.adapter.exec(sql, cb);
  };

  // TODO
  this.removeIndex = function (table, column, cb) {};

})();

Migration.setDefaultAdapter = function (adapter) {
  defaultAdapter = adapter;
};

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
