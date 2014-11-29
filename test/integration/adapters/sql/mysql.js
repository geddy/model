var utils = require('utilities')
  , assert = require('assert')
  , model = require('../../../../lib')
  , helpers = require('.././helpers')
  , eagerAssnTests = require('./eager_assn')
  , nestedEagerAssnTests = require('./nested_eager_assn')
  , Adapter = require('../../../../lib/adapters/sql/mysql').Adapter
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

    // When creating test DB:
    // CREATE DATABASE model_test COLLATE latin1_general_cs;
    adapter = new Adapter({
      user: 'root'
    , multipleStatements: true
    , database: 'model_test'
    });

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

, 'test reconnect logic': function (next) {
    // Get a reference to the original client func
    var origGetClient = adapter._getClient;
    // Punch out the client func with one that returns a client
    // whose `connect` method always produces an error
    adapter._getClient = function () {
      var client = origGetClient.call(adapter);
      // Always error
      client.connect = function (cb) {
        cb({}, null);
      };
      return client;
    };
    // Disconnect, and try to reconnect -- this will fail
    adapter.disconnect(function (err, data) {
      // Until the _getClient function is replaced, this will continue
      // retrying, once we put it back, reconnect will succeed and
      // tests will resume
      adapter.connect(function (err, data) {
        next();
      });
      // Wait three seconds, restore the _getClient func to return
      // a good client
      setTimeout(function () {
        adapter._getClient = origGetClient;
      }, 3000);
    });
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

for (var p in eagerAssnTests) {
  tests[p + ' (MySQL)'] = eagerAssnTests[p];
}

for (var p in nestedEagerAssnTests) {
  tests[p + ' (MySQL)'] = nestedEagerAssnTests[p];
}

for (var p in unique) {
  tests[p + ' (MySQL)'] = unique[p];
}

for (var p in streaming) {
  tests[p + ' (MySQL)'] = streaming[p];
}

module.exports = tests;



