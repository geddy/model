var utils = require('utilities')
  , assert = require('assert')
  , model = require('../../../lib/index')
  , Query = require('../../../lib/query/query').Query
  , operation = require('../../../lib/query/operation')
  , comparison = require('../../../lib/query/comparison')
  , Zooby = require('../../fixtures/zooby').Zooby
  , Wooby = require('../../fixtures/wooby').Wooby
  , tests;

model.registerDefinitions([
  { ctorName: 'Wooby'
  , ctor: Wooby
  }
, { ctorName: 'Zooby'
  , ctor: Zooby
  }
]);

Wooby = model.Wooby;
Zooby = model.Zooby;

var tests = {
  'test condition is AndOperation': function () {
    var query = new Query(Zooby, {foo: {like: 'foo'}, bar: null}, {});
    assert.ok(query.conditions instanceof operation.AndOperation);
  }

, 'test isValid, valid Like comparison': function () {
    var query = new Query(Zooby, {foo: {like: 'foo'}, bar: null}, {});
    assert.ok(query.conditions.isValid());
  }

, 'test isValid, valid Inclusion comparison': function () {
    var query = new Query(Zooby, {foo: {'in': ['foo', 'bar', 'baz']}}, {});
    assert.ok(query.conditions.isValid());
  }

, 'test isValid, invalid Like comparison': function () {
    // 'bar' is numeric, doesn't support 'like'
    var query = new Query(Zooby, {bar: {like: 'foo'}}, {});
    assert.ok(!query.conditions.isValid());
  }

, 'test isValid, invalid EqualTo comparision': function () {
    // 'zong' is a datetime, shouldn't parse to a valid date
    var query = new Query(Zooby, {zong: 'hello'}, {});
    assert.ok(!query.conditions.isValid());
  }

, 'test isValid, invalid Inclusion comparision': function () {
    // In comparison requires an Array value
    var query = new Query(Zooby, {zong: {'in': 'howdy'}}, {});
    assert.ok(!query.conditions.isValid());
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

, 'test "not"': function () {
    var conditions = {foo: 'bar', not: {bar: 'baz', baz: 'zoobie'}}
      , query = new Query(Zooby, conditions, {})
      , operands;

    operands = query.conditions.operands;
    assert.ok(operands[0] instanceof comparison.EqualToComparison);
    assert.ok(operands[1] instanceof operation.NotOperation);
    operands = operands[1].operands;
    assert.ok(operands[0] instanceof operation.AndOperation);
  }

, 'test simple "or"': function () {
    var conditions = {or: [{foo: 'bar'}, {bar: 'baz'}]}
      , query = new Query(Zooby, conditions, {})
      , operands;

    operands = query.conditions.operands;
    assert.ok(operands[0] instanceof operation.OrOperation);
    operands = query.conditions.operands[0].operands;
    assert.ok(operands[0] instanceof operation.AndOperation);
    assert.ok(operands[1] instanceof operation.AndOperation);
  }

, 'test "and" with array of "or" sub-operations': function () {
    var conditions = {and: [{or: [{foo: 'bar'}, {bar: 'baz'}]},
            {or: [{foo: 'baz'}, {bar: 'quz'}]}]}
      , query = new Query(Zooby, conditions, {})
      , operands;

    operands = query.conditions.operands;
    assert.ok(operands[0] instanceof operation.OrOperation);
    assert.ok(operands[1] instanceof operation.OrOperation);
    operands = query.conditions.operands[0].operands;
    assert.ok(operands[0] instanceof operation.AndOperation);
    operands = query.conditions.operands[1].operands;
    assert.ok(operands[0] instanceof operation.AndOperation);
  }

, 'test condition witn nocase opts flag': function () {
    var query = new Query(Zooby, {foo: {like: 'foo'}, bar: null}, {nocase: true});
    assert.ok(query.conditions.operands[0].opts.nocase);
    assert.ok(!query.conditions.operands[1].opts.nocase);
  }

, 'test condition witn nocase opts array': function () {
    var query = new Query(Zooby, {foo: {like: 'foo'}, derf: 'blarg'}, {nocase: ['derf']});
    assert.ok(!query.conditions.operands[0].opts.nocase);
    assert.ok(query.conditions.operands[1].opts.nocase);
  }

/* We don't support this kind of query yet. wooby here is a property, not an assn.
, 'test object\'s properties with Model': function () {
    var query = new Query(Zooby, { 'wooby.foo': { like: 'foo' } });
    assert.ok(query.conditions.isValid());
  }
*/

, 'test "and" with multiple comparisions on same field, verbose': function () {
    var query = new Query(Zooby, {and: [
          {zong: {gte: new Date()}}
        , {zong: {lte: new Date()}}
        ]}, {})
      , operands = query.conditions.operands;
    assert.ok(query.conditions.isValid());
    assert.ok(operands[0] instanceof comparison.GreaterThanOrEqualComparison);
    assert.ok(operands[1] instanceof comparison.LessThanOrEqualComparison);
  }

, 'test "and" with mutliple comparisions on same field, shorthand': function () {
    var query = new Query(Zooby, {zong: {gte: new Date(), lte: new Date()}}, {})
      , operands = query.conditions.operands;
    assert.ok(query.conditions.isValid());
    assert.ok(operands[0] instanceof comparison.GreaterThanOrEqualComparison);
    assert.ok(operands[1] instanceof comparison.LessThanOrEqualComparison);
  }

, 'test options with non-existent property name throws the proper error': function () {
    assert.throws(
      function () {
        new Query(Zooby, {this_doesnt_exist_on_the_model: 'non-existent'}, {});
      },
      /is\snot\sa\svalid\sproperty/
    );
  }
};

module.exports = tests;
