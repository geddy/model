
var assert = require('assert')
  , Migration = require('../../lib/migration').Migration
  , StandardGenerator = require('../../lib/generators/sql').StandardGenerator
  , utils = require('utilities')
  , tests
  , fakeAdapter
  , createCallback
  , strIncl
  , strIncl;

fakeAdapter = {
  COLUMN_NAME_DELIMITER: '"'
, exec: function (sql, cb) {
    cb(null, sql);
  }
, generator: new StandardGenerator()
};
createCallback = function (next) {
  return function (err, data) {
    next();
  };
};
strIncl = function (searchIn, searchFor) {
    var sIn = utils.string.trim(searchIn.toLowerCase());
    var sFor = utils.string.trim(searchFor.toLowerCase());
    return sIn.indexOf(sFor) > -1;
};

Migration.setDefaultAdapter(fakeAdapter);

tests = {

  'createTable': function (next) {
    var m = new Migration('foo')
      , def = function (t) {
          t.column('fooBarBaz', 'string');
          t.column('bazBarQux', 'int');
          t.column('quxBazBar', 'boolean');
        };
    m.createTable('zerbs', def, function (err, data) {
      var sql = data;
      assert.ok(strIncl(sql,
          'create table zerbs ('));
      assert.ok(strIncl(sql,
          '"id" varchar(255) primary key'));
      assert.ok(strIncl(sql,
          '"foo_bar_baz" varchar(255)'));
      assert.ok(strIncl(sql,
          '"baz_bar_qux" integer'));
      assert.ok(strIncl(sql,
          '"qux_baz_bar" boolean'));
      next();
    });
  }

, 'addColumn': function (next) {
    var m = new Migration('foo');
    m.addColumn('zerbs', 'fooBarBaz', 'int', function (err, data) {
      var sql = data;
      assert.ok(strIncl(sql, 'alter table zerbs'));
      assert.ok(strIncl(sql, 'add column "foo_bar_baz" integer'));
      next();
    });
  }

, 'removeColumn': function (next) {
    var m = new Migration('foo');
    m.removeColumn('zerbs', 'fooBarBaz', function (err, data) {
      var sql = data;
      assert.ok(strIncl(sql, 'alter table zerbs'));
      assert.ok(strIncl(sql, 'drop column "foo_bar_baz"'));
      next();
    });
  }

, 'changeColumn': function (next) {
    var m = new Migration('foo');
    m.changeColumn('zerbs', 'fooBarBaz', 'string', function (err, data) {
      var sql = data;
      assert.ok(strIncl(sql, 'alter table zerbs'));
      assert.ok(strIncl(sql, 'alter column "foo_bar_baz" type varchar(255)'));
      next();
    });
  }

, 'renameColumn': function (next) {
    var m = new Migration('foo');
    m.renameColumn('zerbs', 'fooBarBaz', 'bazBarQux', function (err, data) {
      var sql = data;
      assert.ok(strIncl(sql, 'alter table zerbs'));
      assert.ok(strIncl(sql, 'rename column "foo_bar_baz" to "baz_bar_qux"'));
      next();
    });
  }

, 'dropTable': function (next) {
    var m = new Migration('foo');
    m.dropTable('zerbs', function (err, data) {
      var sql = data;
      assert.ok(strIncl(sql, 'drop table if exists zerbs'));
      next();
    });
  }

};

module.exports = tests;

