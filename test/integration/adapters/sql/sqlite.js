var utils = require('utilities')
  , assert = require('assert')
  , model = require('../../../../lib')
  , helpers = require('../helpers')
  , eagerAssnTests = require('./eager_assn')
  , nestedEagerAssnTests = require('./nested_eager_assn')
  , Adapter = require('../../../../lib/adapters/sql/sqlite').Adapter
  , generator = require('../../../../lib/generators/sql')
  , adapter
  , currentId
  , tests
  , config = require('../../../config')
  , shared = require('../shared')
  , unique = require('../unique_id')
  , streaming = require('../streaming');

tests = {
  'before': function (next) {
    var relations = helpers.fixtures.slice()
      , models = [];

    adapter = new Adapter();
    adapter.once('connect', function () {
      var sql = ''
        , tables = helpers.fixtureNames;

      sql += adapter.generator.dropTable(tables);
      sql += adapter.generator.createTable(tables);

      adapter.exec(sql, function (err, data) {
        if (err) {
          throw err;
        }
        next();
      });
    });
    adapter.connect();

    relations.forEach(function (r) {
      models.push({
        ctorName: r.ctorName
      , ctor: r.ctor
      });
    });
    model.clearDefinitions(models);
    model.registerDefinitions(models);
    model.adapters = {};
    relations.forEach(function (r) {
      model[r.ctorName].adapter = adapter;
    });

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

};

for (var p in shared) {
  if (p == 'beforeEach' || p == 'afterEach') {
    tests[p] = shared[p];
  }
  else {
    tests[p + ' (SQLite)'] = shared[p];
  }
}

for (var p in eagerAssnTests) {
  tests[p + ' (SQLite)'] = eagerAssnTests[p];
}

for (var p in nestedEagerAssnTests) {
  tests[p + ' (SQLite)'] = nestedEagerAssnTests[p];
}

for (var p in unique) {
  tests[p + ' (SQLite)'] = unique[p];
}

for (var p in streaming) {
  tests[p + ' (SQLite)'] = streaming[p];
}

module.exports = tests;


