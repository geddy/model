var model = require('../../lib/index')
  , Query = require('../../lib/query/query').Query
  , operation = require('../../lib/query/operation')
  , comparison = require('../../lib/query/comparison')
  , utils = require('utilities')
  , assert = require('assert')
  , User = require('../fixtures/user')
  , tests;

var tests = {
  'test condition': function () {
    var query = new Query(User, {login: {like: 'foo'}, firstName: null}, {});
    assert.ok(query.conditions instanceof operation.AndOperation);
    console.log(query.conditions.toString());
  }

};

module.exports = tests;
