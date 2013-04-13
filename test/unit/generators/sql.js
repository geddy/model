
var assert = require('assert')
  , utils = require('utilities')
  , Zooby = require('../../fixtures/zooby').Zooby
  , generator = require('../../../lib/generators/sql')
  , tests
  , strIncl;

strIncl = function (searchIn, searchFor) {
    var sIn = utils.string.trim(searchIn.toLowerCase());
    var sFor = utils.string.trim(searchFor.toLowerCase());
    return sIn.indexOf(sFor) > -1;
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
    assert.ok(strIncl(sql,
        'drop table if exists zerbs;'));
    assert.ok(strIncl(sql,
        'create table zerbs ('));
    assert.ok(strIncl(sql,
        'id varchar(256) primary key'));
    assert.ok(strIncl(sql,
        'foo varchar(256)'));
  }

, 'createTable with single model object': function () {
    var sql = generator.createTable(['Zooby']);
    assert.ok(strIncl(sql,
        'drop table if exists zoobies;'));
    assert.ok(strIncl(sql,
        'create table zoobies ('));
    assert.ok(strIncl(sql,
        'foo varchar(256)'));
    assert.ok(strIncl(sql,
        'bar real'));
    assert.ok(strIncl(sql,
        'woot boolean'));
    assert.ok(strIncl(sql,
        'freen date'));
    assert.ok(strIncl(sql,
        'zong timestamp'));
    assert.ok(strIncl(sql,
        'blarg time'));
  }

};

module.exports = tests;

