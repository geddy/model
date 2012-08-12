
var assert = require('assert')
  , utils = require('utilities')
  , pg = require('pg')
  , model = require('../../lib')
  , Zooby = require('../fixtures/zooby').Zooby
  , generator = require('../../lib/generators/sql')
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

, 'test createTable in DB': function (next) {
    var client = new pg.Client('postgres://mde@localhost/model_test');
    var sql = generator.createTable(['Zooby']);
    client.connect(function () {
      client.on('drain', client.end.bind(client));
      client.query(sql, function (err, data) {
        console.dir(arguments);
        next();
      });
    });
  }

};

module.exports = tests;
