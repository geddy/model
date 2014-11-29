
var assert = require('assert')
  , utils = require('utilities')
  , model = require('../../../lib')
  , Zooby = require('../../fixtures/zooby').Zooby
  , StandardGenerator = require('../../../lib/generators/sql').StandardGenerator
  , generator = new StandardGenerator()
  , tests
  , strIncl;

strIncl = function (searchIn, searchFor) {
    var sIn = utils.string.trim(searchIn.toLowerCase());
    var sFor = utils.string.trim(searchFor.toLowerCase());
    return sIn.indexOf(sFor) > -1;
};

model.registerDefinitions([
  { ctorName: 'Zooby'
  , ctor: Zooby
  }
]);

Zooby = model.Zooby;

tests = {

  'addColumnStatement': function () {
    var sql = generator.addColumnStatement({
      name: 'barBazQux'
    , datatype: 'string'
    });
    assert.ok(strIncl(sql, 'ADD COLUMN "bar_baz_qux" varchar(255)'));
  }

, 'createTableStatement': function () {
    var sql = generator.createTableStatement('Zerb', {
      foo: {
        name: 'foo'
      , datatype: 'string'
      }
    });
    assert.ok(strIncl(sql,
        'create table zerbs ('));
    assert.ok(strIncl(sql,
        '"id" varchar(255) primary key'));
    assert.ok(strIncl(sql,
        '"foo" varchar(255)'));
  }

, 'alterTableStatement single alteration': function () {
    var sql = generator.alterTableStatement('Zerb', {
      operation: 'add'
    , property: {
        name: 'foo'
      , datatype: 'string'
      }
    });
    assert.ok(strIncl(sql,
        'alter table zerbs'));
    assert.ok(strIncl(sql,
        'add column "foo" varchar(255)'));
  }

, 'alterTableStatement array of alterations': function () {
    var alter = [
          { operation: 'alter'
          , property: {
              name: 'foo'
            , datatype: 'int'
            }
          }
        , { operation: 'drop'
          , property: {
              name: 'bar'
            }
          }
        , { operation: 'rename'
          , property: {
              name: 'bar'
            , newName: 'bazBar'
            }
          }
        ]
      , sql = generator.alterTableStatement('Zerb', alter);

    assert.ok(strIncl(sql,
        'alter table zerbs'));
    assert.ok(strIncl(sql,
        'alter column "foo" type integer'));
    assert.ok(strIncl(sql,
        'drop column "bar"'));
    assert.ok(strIncl(sql,
        'rename column "bar" to "baz_bar"'));
  }

, 'createTable with single model object': function () {
    var sql = generator.createTable(['Zooby']);
    assert.ok(strIncl(sql,
        'create table zoobies ('));
    assert.ok(strIncl(sql,
        '"foo" varchar(255)'));
    assert.ok(strIncl(sql,
        '"bar" real'));
    assert.ok(strIncl(sql,
        '"woot" boolean'));
    assert.ok(strIncl(sql,
        '"freen" date'));
    assert.ok(strIncl(sql,
        '"zong" timestamp'));
    assert.ok(strIncl(sql,
        '"blarg" time'));
  }

};

module.exports = tests;

