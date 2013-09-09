var utils = require('utilities')
  , assert = require('assert')
  , model = require('../../../../lib')
  , helpers = require('.././helpers')
  , Adapter = require('../../../../lib/adapters/riak').Adapter
  , adapter
  , tests
  , config = require('../../../config')
  , shared = require('../shared');

tests = {
  'before': function (next) {
    var relations = helpers.fixtures.slice()
      , models = [];
    adapter = new Adapter(config.mongo);

    model.adapters = {};
    relations.forEach(function (r) {
      model[r].adapter = adapter;
      models.push({
        ctorName: r
      });
    });

    model.registerDefinitions(models);

    adapter.dropTable(['Zooby', 'User'], next);
  }

, 'after': function (next) {
    adapter.dropTable(['Zooby', 'User'], next);
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
    tests[p + ' (Riak)'] = shared[p];
  }
}

module.exports = tests;
