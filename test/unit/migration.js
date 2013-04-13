
var assert = require('assert')
  , Migration = require('../../lib/migration').Migration
  , utils = require('utilities')
  , tests
  , fakeAdapter
  , createCallback
  , strIncl
  , strIncl;

fakeAdapter = {
  exec: function (sql, cb) {
    cb(null, sql);
  }
};
createCallback = function (next) {
  return function (err, data) {
    console.log(data);
    next();
  };
};
strIncl = function (searchIn, searchFor) {
    var sIn = utils.string.trim(searchIn.toLowerCase());
    var sFor = utils.string.trim(searchFor.toLowerCase());
    return sIn.indexOf(sFor) > -1;
};

tests = {

  'createTable': function (next) {
    var m = new Migration(fakeAdapter)
      , def = function (t) {
          t.column('fooBarBaz', 'string');
          t.column('bazBarQux', 'int');
          t.column('quxBazBar', 'boolean');
        };
    m.createTable('zerbs', def, function (err, data) {
      sql = data;
      assert.ok(strIncl(sql,
          'drop table if exists zerbs;'));
      assert.ok(strIncl(sql,
          'create table zerbs ('));
      assert.ok(strIncl(sql,
          'id varchar(256) primary key'));
      assert.ok(strIncl(sql,
          'foo_bar_baz varchar(256)'));
      assert.ok(strIncl(sql,
          'baz_bar_qux integer'));
      assert.ok(strIncl(sql,
          'qux_baz_bar boolean'));
      next();
    });
  }

};

module.exports = tests;

