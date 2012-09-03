var utils = require('utilities')
  , model = require('../../../lib')
  , Adapter = require('../../../lib/adapters/riak').Adapter
  , Query = require('../../../lib/query/query').Query
  , generator = require('../../../lib/generators/sql')
  , adapter
  , assert = require('assert')
  , currentId
  , tests
  , testItems = []
  , Zooby = require('../../fixtures/zooby').Zooby
  , User = require('../../fixtures/user').User
  , Profile = require('../../fixtures/profile').Profile
  , Account = require('../../fixtures/account').Account
  , shared = require('../shared');

tests = {
  'before': function () {
    adapter = new Adapter();

    model.adapters = {
      'Zooby': adapter
    , 'User': adapter
    , 'Profile': adapter
    , 'Account': adapter
    };
  }

, 'test create adapter': function () {
    assert.ok(adapter instanceof Adapter);
  }

};

for (var p in shared) {
  tests[p + ' (Riak)'] = shared[p];
}

module.exports = tests;
