var utils = require('utilities')
  , assert = require('assert')
  , model = require('../../../../lib')
  , helpers = require('.././helpers')
  , Adapter = require('../../../../lib/adapters/memory').Adapter
  , adapter
  , tests
  , Zooby = require('../../../fixtures/zooby').Zooby
  , User = require('../../../fixtures/user').User
  , Profile = require('../../../fixtures/profile').Profile
  , Account = require('../../../fixtures/account').Account
  , shared = require('../shared');

tests = {
  'before': function (next) {
    var relations = [
          'Zooby'
        , 'User'
        , 'Profile'
        , 'Account'
        , 'Membership'
        , 'Team'
        ]
        relations = relations.concat(helpers.fixtures)
      , models = [];
    adapter = new Adapter();

    model.adapters = {};
    relations.forEach(function (r) {
      model[r].adapter = adapter;
      models.push({
        ctorName: r
      });
    });

    model.registerDefinitions(models);

    adapter.createTable(Object.keys(model.adapters), next);
  }

, 'after': function () {
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
    tests[p + ' (Memory)'] = shared[p];
  }
}

module.exports = tests;


