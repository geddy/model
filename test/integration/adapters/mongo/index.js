var utils = require('utilities')
  , assert = require('assert')
  , model = require('../../../../lib')
  , helpers = require('.././helpers')
  , Adapter = require('../../../../lib/adapters/mongo').Adapter
  , adapter
  , tests
  , config = require('../../../config')
  , shared = require('../shared')
  , unique = require('../unique_id');

tests = {
  'before': function (next) {
    var relations = helpers.fixtures.slice()
      , models = [];
    adapter = new Adapter(config.mongo);

    adapter.once('connect', function () {
      adapter.dropTable(['Zooby', 'User'], next);
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
    adapter.dropTable(['Zooby', 'User'], function () {
      adapter.disconnect(function (err) {
        if (err) { throw err; }
        next();
      });
    });
  }

, 'test create adapter': function () {
    assert.ok(adapter instanceof Adapter);
  }
};

for (var p in shared) {
  if (p == 'beforeEach' || p == 'afterEach') {
    tests[p] = shared[p];
  }
  else {
    tests[p + ' (Mongo)'] = shared[p];
  }
}

for (var p in unique) {
  tests[p + ' (Mongo)'] = unique[p];
}

module.exports = tests;

