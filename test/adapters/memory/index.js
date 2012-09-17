var utils = require('utilities')
  , model = require('../../../lib')
  , Adapter = require('../../../lib/adapters/memory').Adapter
  , adapter
  , assert = require('assert')
  , tests
  , Zooby = require('../../fixtures/zooby').Zooby
  , User = require('../../fixtures/user').User
  , Profile = require('../../fixtures/profile').Profile
  , Account = require('../../fixtures/account').Account
  , shared = require('../shared');

tests = {
  'before': function (next) {
    adapter = new Adapter();

    model.adapters = {
      'Zooby': adapter
    , 'User': adapter
    , 'Profile': adapter
    , 'Account': adapter
    };

    adapter.createTable(Object.keys(model.adapters), next);
  }

, 'after': function () {
  }

, 'test create adapter': function () {
    assert.ok(adapter instanceof Adapter);
  }


};

for (var p in shared) {
  tests[p + ' (Memory)'] = shared[p];
}

module.exports = tests;


