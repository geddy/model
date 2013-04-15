
var assert = require('assert')
  , utils = require('utilities')
  , Zooby = require('../../fixtures/zooby').Zooby
  , generator = require('../../../lib/generators/sql')
  , tests
  , arrIncl;

arrIncl = function (array, item) {
  return array.some(function (arrItem) {
    return strIncl(arrItem, item);
  });
};

strIncl = function (searchIn, searchFor) {
    var sIn = utils.string.trim(searchIn.toLowerCase());
    var sFor = utils.string.trim(searchFor.toLowerCase());
    return sIn.indexOf(sFor) == 0;
};

tests = {

  'columnStatement': function () {
    var sql = generator.columnStatement({
      name: 'barBazQux'
    , datatype: 'string'
    });
    assert.ok(strIncl(sql, 'bar_baz_qux varchar(256)'));
  }

, 'createTableStatement': function () {
    var sql = generator.createTableStatement('Zerb', {
      foo: {
        name: 'foo'
      , datatype: 'string'
      }
    });
    sql = sql.split('\n');
    assert.ok(arrIncl(sql,
        'drop table if exists zerbs;'));
    assert.ok(arrIncl(sql,
        'create table zerbs ('));
    assert.ok(arrIncl(sql,
        'id varchar(256) primary key'));
    assert.ok(arrIncl(sql,
        'foo varchar(256)'));
  }

, 'createTable with single model object': function () {
    var sql = generator.createTable(['Zooby']);
    sql = sql.split('\n');
    assert.ok(arrIncl(sql,
        'drop table if exists zoobies;'));
    assert.ok(arrIncl(sql,
        'create table zoobies ('));
    assert.ok(arrIncl(sql,
        'foo varchar(256)'));
    assert.ok(arrIncl(sql,
        'bar real'));
    assert.ok(arrIncl(sql,
        'woot boolean'));
    assert.ok(arrIncl(sql,
        'freen date'));
    assert.ok(arrIncl(sql,
        'zong timestamp'));
    assert.ok(arrIncl(sql,
        'blarg time'));
  }

};

module.exports = tests;

