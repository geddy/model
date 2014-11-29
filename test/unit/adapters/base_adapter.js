var utils = require('utilities')
  , assert = require('assert')
  , tests
  , BaseAdapter = require('../../../lib/adapters/base_adapter').BaseAdapter;

tests = {
  'loadConfig handles alias property names': function () {
    var b = new BaseAdapter
      , baseConfig = {
          username: 'foo'
        , password: 'bar'
        , hostname: 'baz'
        , database: 'qux'
        }
      , opts = {
          user: 'asdf'
        , pass: 'qwer'
        , host: 'zxcv'
        , dbname: 'uiop'
        }
      , config = b.loadConfig(baseConfig, opts);
    assert.equal(config.username, 'asdf');
    assert.equal(config.password, 'qwer');
    assert.equal(config.hostname, 'zxcv');
    assert.equal(config.database, 'uiop');
  }

};

module.exports = tests;

