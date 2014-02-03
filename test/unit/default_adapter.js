var assert = require('assert')
  , model = require('../../lib')
  , User = require('../fixtures/user').User
  , Wooby = require('../fixtures/wooby').Wooby
  , Zooby = require('../fixtures/zooby').Zooby
  , config = require('../config')
  , tests;

tests = {
  'beforeEach': function() {
    // tear down the already attached adapters
    for(var modelName in model.descriptionRegistry) {
      model[modelName].adapter = null;
    }
  },

  'test default adapter': function() {
    var memoryAdapter = model.createAdapter('memory');
    var mongoAdapter = model.createAdapter('mongo', config.mongo);

    model.defaultAdapter = memoryAdapter;
    model.Zooby.adapter = mongoAdapter;

    assert.equal(model.getAdapterForModel('User'), memoryAdapter);
    assert.equal(model.getAdapterForModel('Zooby'), mongoAdapter);
  }
};

module.exports = tests;

