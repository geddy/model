var utils = require('utilities')
  , assert = require('assert')
  , model = require('../../../../lib')
  , helpers = require('.././helpers')
  , eagerAssnTests = require('./eager_assn')
  , Adapter = require('../../../../lib/adapters/sql/mysql').Adapter
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

    adapter = new Adapter({
      user: 'root'
    , multipleStatements: true
    });
    adapter.once('connect', function () {
      var sql = '';

      sql += 'DROP DATABASE IF EXISTS model_test;';
      sql += 'CREATE DATABASE model_test COLLATE latin1_general_cs;';
      sql += 'USE model_test;';
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
      var sql = 'DROP DATABASE IF EXISTS model_test;';
      adapter.exec(sql, function (err, data) {
        if (err) {
          throw err;
        }
        adapter.once('disconnect', function () {
          next();
        });
        adapter.disconnect();
      });
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

};

for (var p in shared) {
  if (p == 'beforeEach' || p == 'afterEach') {
    tests[p] = shared[p];
  }
  else {
    tests[p + ' (MySQL)'] = shared[p];
  }
}

/*
for (var p in eagerAssnTests) {
  tests[p + ' (MySQL)'] = eagerAssnTests[p];
}
*/

module.exports = tests;



