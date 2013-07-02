var utils = require('utilities')
  , assert = require('assert')
  , model = require('../../../../lib')
  , Adapter = require('../../../../lib/adapters/mongo').Adapter
  , generator = require('../../../../lib/generators/sql')
  , adapter
  , tests
  , Zooby = require('../../../fixtures/zooby').Zooby
  , User = require('../../../fixtures/user').User
  , Profile = require('../../../fixtures/profile').Profile
  , Account = require('../../../fixtures/account').Account
  , config = require('../../../config')
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
  tests[p + ' (Mongo)'] = shared[p];
}

module.exports = tests;

