var utils = require('utilities')
  , assert = require('assert')
  , model = require('../../../../lib')
  , helpers = require('.././helpers')
  , Adapter = require('../../../../lib/adapters/sql/sqlite').Adapter
  , generator = require('../../../../lib/generators/sql')
  , adapter
  , currentId
  , tests
  , config = require('../../../config')
  , shared = require('../shared');

tests = {
  'before': function (next) {
    var relations = helpers.fixtures.slice()
      , models = [];

    adapter = new Adapter();
    adapter.once('connect', function () {
      var sql = '';

      sql += generator.dropTable(relations);
      sql += generator.createTable(relations);

      adapter.exec(sql, function (err, data) {
        if (err) {
          throw err;
        }
        next();
      });
    });
    adapter.connect();

    model.adapters = {};
    relations.forEach(function (r) {
      model[r].adapter = adapter;
      models.push({
        ctorName: r
      });
    });

    model.registerDefinitions(models);
  }

, 'after': function (next) {
    adapter.once('disconnect', function () {
      next();
    });
    adapter.disconnect();
  }

, 'test create adapter': function () {
    assert.ok(adapter instanceof Adapter);
  }

, 'test exec': function (next) {
    adapter.exec('CREATE TABLE foo (bar varchar(256) ); DROP TABLE foo;',
        function (err, data) {
      if (err) {
        throw err;
      }
      next();
    });
  }

, 'beforeEach': function (next) {
    var timeout = model.Event.adapter.name == 'riak' ?
        config.riak.testInterval : 0;
    helpers.createFixtures(function () {
      setTimeout(next, timeout);
    });
  }

, 'afterEach': function (next) {
    var timeout = model.Event.adapter.name == 'riak' ?
        config.riak.testInterval : 0;
    helpers.deleteFixtures(function () {
      setTimeout(next, timeout);
    });
  }



};

module.exports = tests;


