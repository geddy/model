
var assert = require('assert')
  , utils = require('utilities')
  , Zooby = require('../../fixtures/zooby').Zooby
  , generator = require('../../../lib/generators/sql')
  , tests
  , arrIncl;

arrIncl = function (array, item) {
  return array.some(function (arrItem) {
    var str = utils.string.trim(arrItem.toLowerCase());
    return str.indexOf(item) == 0;
  });
};

tests = {
  'test createTable SQL': function () {
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

