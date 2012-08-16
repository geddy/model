var model = require('../../lib/index')
  , Query = require('../../lib/query/query').Query
  , operation = require('../../lib/query/operation')
  , comparison = require('../../lib/query/comparison')
  , utils = require('utilities')
  , assert = require('assert')
  , Zooby = require('../fixtures/zooby').Zooby
  , tests;

var tests = {
  'test condition is AndOperation': function () {
    var query = new Query(Zooby, {foo: {like: 'foo'}, bar: null}, {});
    assert.ok(query.conditions instanceof operation.AndOperation);
  }

, 'test nested conditions': function () {
    var conditions = {foo: 'bar', baz: 'qux', or: {foo: 'baz', baz: 'zoobie'}}
      , query = new Query(Zooby, conditions, {})
      , operands;
    operands = query.conditions.operands;
    assert.ok(operands[0] instanceof comparison.EqualToComparison);
    assert.ok(operands[1] instanceof comparison.EqualToComparison);
    assert.ok(operands[2] instanceof operation.OrOperation);
    operands = operands[2].operands;
    assert.ok(operands[0] instanceof comparison.EqualToComparison);
    assert.ok(operands[1] instanceof comparison.EqualToComparison);
  }

, 'test nested conditions': function () {
    var conditions = {foo: 'bar', baz: 'qux', or: {foo: 'baz', baz: 'zoobie'}}
      , query = new Query(Zooby, conditions, {})
      , operands;
  }

, 'test not': function () {
    var conditions = {foo: 'bar', not: {bar: 'baz', baz: 'zoobie'}}
      , query = new Query(Zooby, conditions, {})
      , operands;

    operands = query.conditions.operands;
    assert.ok(operands[0] instanceof comparison.EqualToComparison);
    assert.ok(operands[1] instanceof operation.NotOperation);
    operands = operands[1].operands;
    assert.ok(operands[0] instanceof operation.AndOperation);
  }

, 'test or': function () {
    var conditions = {or: [{foo: 'bar'}, {bar: 'baz'}]}
      , query = new Query(Zooby, conditions, {})
      , operands;

    operands = query.conditions.operands;
    assert.ok(operands[0] instanceof operation.OrOperation);
    operands = query.conditions.operands[0].operands;
    assert.ok(operands[0] instanceof operation.AndOperation);
    assert.ok(operands[1] instanceof operation.AndOperation);
  }

};

module.exports = tests;
