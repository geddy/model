var utils = require('utilities')
  , assert = require('assert')
  , model = require('../../../../lib')
  , helpers = require('.././helpers')
  , Adapter = require('../../../../lib/adapters/level').Adapter
  , adapter
  , tests
  , config = require('../../../config')
  , shared = require('../shared');

tests = {
  'before': function (next) {
    var relations = helpers.fixtures.slice()
      , models = [];
    adapter = new Adapter(config.level);

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
    tests[p + ' (LevelDB)'] = shared[p];
  }
}

module.exports = tests;


