var assert = require('assert')
  , model = require('../../lib')
  , User = require('../fixtures/user').User
  , Wooby = require('../fixtures/wooby').Wooby
  , Zooby = require('../fixtures/zooby').Zooby
  , config = require('../config')
  , tests;

model.registerDefinitions([
  { ctorName: 'User'
  , ctor: User
  }
, { ctorName: 'Wooby'
  , ctor: Wooby
  }
, { ctorName: 'Zooby'
  , ctor: Zooby
  }
]);

tests = {
  'beforeEach': function() {
    // tear down already attached adapters, if any exist
    for(var modelName in model.descriptionRegistry) {
      if (model[modelName].adapter) {
        model[modelName].adapter = null;
      }
    }
  }

, 'test default with multiple adapters': function() {
    var memoryAdapter = model.createAdapter('memory');
    var filesystemAdapter = model.createAdapter('filesystem', config.filesystem);

    model.defaultAdapter = memoryAdapter;
    model.Zooby.adapter = filesystemAdapter;

    assert.equal(model.User.getAdapter(), memoryAdapter);
    assert.equal(model.Wooby.getAdapter(), memoryAdapter);
    assert.equal(model.Zooby.getAdapter(), filesystemAdapter);
  }
};

module.exports = tests;

