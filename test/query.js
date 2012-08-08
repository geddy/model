var model = require('../lib/model')
  , Query = require('../lib/mapper/query').Query
  , operation = require('../lib/mapper/operation')
  , comparison = require('../lib/mapper/comparison')
  , utils = require('utilities')
  , assert = require('assert')
  , User = require('./fixtures/user')
  , tests;

var tests = {
  'test condition': function () {
    var query = new Query(User, {login: {like: 'foo'}, firstName: null}, {});
    assert.ok(query.conditions instanceof operation.AndOperation);
    console.log(query.conditions.toString());
  }

};

module.exports = tests;
