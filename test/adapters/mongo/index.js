var utils = require('utilities')
  , model = require('../../../lib')
  , Adapter = require('../../../lib/adapters/mongo').Adapter
  , generator = require('../../../lib/generators/sql')
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
    adapter = new Adapter({
      dbname: 'model_test'
    });

    model.adapters = {
      'Zooby': adapter
    , 'User': adapter
    , 'Profile': adapter
    , 'Account': adapter
    };

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
  tests[p + ' (Mongo)'] = shared[p];
}

module.exports = tests;

