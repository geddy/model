var utils = require('utilities')
  , assert = require('assert')
  , fork = require('child_process').fork
  , path = require('path')
  , model = require('../../../../lib')
  , helpers = require('.././helpers')
  , config = require('../../../config')
  , Adapter = require('../../../../lib/adapters/rest').Adapter
  , adapter
  , tests
  , mockServer
  , shared = require('../shared');

tests = {
  'before': function (next) {
    var relations = helpers.fixtures.slice()
      , models = [];
    adapter = new Adapter(config.rest);

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

    mockServer = fork(path.join(__dirname, '/server'));

    // wait for the mock server to run
    setTimeout(next, 2000);
  }

, 'after': function () {
    // stop the mock server
    mockServer.kill();
  }

, 'beforeEach': function(next) {
    model.Event.adapter.restApi.read('beforeEach', null, next);
  }

, 'afterEach': function(next) {
    model.Event.adapter.restApi.read('afterEach', null, next);
  }

, 'test create adapter': function () {
    assert.ok(adapter instanceof Adapter);
  }

, 'test instance cache': function (next) {
    var events;
    model.Event.all(function (err, _events) {
      events = _events;

      assert.ok(model.Event.adapter.cache.Event);

      events.forEach(function (event) {
        assert.strictEqual(model.Event.adapter.cache.Event[event.id], event);
      });

      // wait until cache lifetime expires
      setTimeout(function () {
        assert.ok(model.Event.adapter.cache.Event);
        events.forEach(function (event) {
          assert.ok(!model.Event.adapter.cache.Event[event.id]);
        });
        next();
      }, model.Event.adapter.config.instanceCacheLifetime + 100);

    });
  }
};


var disabled = [
  // paramifying empty Arrays does not work, so this test fails as no id parameter will be send
  'test all with empty id inclusion in query object'

  // paramifying undefined or null properties does not work, so this test fails as no id parameter will be send
, 'test all, id does not override other conditions'

  // TODO: seems that mock server does not send validation errors on GET/load requests
, 'test validations on reification'
];

for (var p in shared) {
  if (p == 'beforeEach' || p == 'afterEach') {
    //tests[p] = shared[p];
  }
  else if(disabled.indexOf(p) === -1) {
    tests[p + ' (Rest)'] = shared[p];
  }
}

module.exports = tests;
