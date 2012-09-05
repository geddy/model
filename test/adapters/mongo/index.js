var utils = require('utilities')
  , model = require('../../../lib')
  , Adapter = require('../../../lib/adapters/mongo').Adapter
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

    Zooby.remove({}, function (err, data) {
      if (err) {
        throw err;
      }
      next();
    });
  }

, 'after': function (next) {
    Zooby.remove({}, function (err, data) {
      if (err) {
        throw err;
      }
      next();
    });
  }

, 'test create adapter': function () {
    assert.ok(adapter instanceof Adapter);
  }


};

for (var p in shared) {
  tests[p + ' (Mongo)'] = shared[p];
}

module.exports = tests;

