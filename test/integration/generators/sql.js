
var assert = require('assert')
  , utils = require('utilities')
  , pg = require('pg')
  , model = require('../../../lib')
  , Zooby = require('../../fixtures/zooby').Zooby
  , StandardGenerator = require('../../../lib/generators/sql').StandardGenerator
  , generator = new StandardGenerator()
  , config = require('../../config')
  , tests
  , arrIncl;

arrIncl = function (array, item) {
  return array.some(function (arrItem) {
    var str = utils.string.trim(arrItem.toLowerCase());
    return str.indexOf(item) == 0;
  });
};

tests = {

  'test createTable in DB, string id': function (next) {
    var client = new pg.Client('postgres://' + config.postgres.user + '@' + config.postgres.host + '/' + config.postgres.database);
    var sql = generator.createTable(['Zooby']);
    client.connect(function () {
      client.on('drain', client.end.bind(client));
      client.query(sql, function (err, data) {
        next();
      });
    });
  }

/*
, 'test createTable in DB, autoIncrement id': function (next) {
    var client = new pg.Client('postgres://mde@localhost/model_test');
    var sql = generator.createTable(['User']);
    client.connect(function () {
      client.on('drain', client.end.bind(client));
      client.query(sql, function (err, data) {
        next();
      });
    });
  }

, 'test createTable in DB with association, autoIncrement id': function (next) {
    var client = new pg.Client('postgres://mde@localhost/model_test');
    var sql = generator.createTable(['Profile']);
    client.connect(function () {
      client.on('drain', client.end.bind(client));
      client.query(sql, function (err, data) {
        sql = sql.split('\n');
        assert.ok(arrIncl(sql,
            'user_id integer'));
        next();
      });
    });
  }
*/

};

module.exports = tests;
