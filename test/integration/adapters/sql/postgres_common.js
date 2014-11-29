var helpers = require('../helpers')
  , model = require('../../../../lib')
  , eagerAssnTests = require('./eager_assn')
  , nestedEagerAssnTests = require('./nested_eager_assn')
  , Adapter = require('../../../../lib/adapters/sql/postgres').Adapter
  , config = require('../../../config')
  , shared = require('../shared')
  , eagerAssnTests = require('./eager_assn')
  , unique = require('../unique_id')
  , streaming = require('../streaming')
  , tests
  , common;

common = new (function () {

  this.connect = function (callback) {
    var relations = helpers.fixtures.slice()
      , models = [];

    adapter = new Adapter(config.postgres);
    adapter.once('connect', function () {
      var sql = ''
        , tables = helpers.fixtureNames;

      sql += adapter.generator.dropTable(tables);
      sql += adapter.generator.createTable(tables);
      adapter.exec(sql, function (err, data) {
        if (err) {
          throw err;
        }
        callback();
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

    return adapter;
  };

  this.disconnect = function (adapter, callback) {
    adapter.once('disconnect', function () {
      callback();
    });
    adapter.disconnect();
  };

})();

tests = {
  'test exec': function (next) {
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
    tests[p + ' (Postgres)'] = shared[p];
  }
}

for (var p in eagerAssnTests) {
  tests[p + ' (Postgres)'] = eagerAssnTests[p];
}

for (var p in nestedEagerAssnTests) {
  tests[p + ' (Postgres)'] = nestedEagerAssnTests[p];
}

for (var p in unique) {
  tests[p + ' (Postgres)'] = unique[p];
}

for (var p in streaming) {
  tests[p + ' (Postgres)'] = streaming[p];
}

common.tests = tests;
module.exports = common;
