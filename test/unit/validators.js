var assert = require('assert')
  , model = require('../../lib')
  , validators = model.validators
  , tests;

var ModelWithValidations = function () {
  this.defineProperties({
    requiredPropertyAddedByDefineProperties: {type: 'string', required: true},
  });

  this.property('requiredPropertyAddedByProperty', 'string', { required: true});
};

ModelWithValidations = model.register('ModelWithValidations', ModelWithValidations);

tests = {
  'Required option adds a validatesPresent rule when using defineProperties': function () {
    assert.ok(model.descriptionRegistry['ModelWithValidations'].properties.
      requiredPropertyAddedByDefineProperties.validations.present);
  }

, 'Required option adds a validatesPresent rule when using property': function () {
    assert.ok(model.descriptionRegistry['ModelWithValidations'].properties.
        requiredPropertyAddedByProperty.validations.present);
  }

, 'Validating present with 0': function () {
    var msg = validators.present('foo', 0, null, {opts:true});
    assert.ok(!msg);
  }

, 'Validating present with null': function () {
    var msg = validators.present('foo', null, null, {opts:true});
    assert.equal('[[model.validatesPresent]]', msg);
  }

, 'Validating present with undefined': function () {
    var msg = validators.present('foo', undefined, null, {opts:true});
    assert.equal('[[model.validatesPresent]]', msg);
  }

, 'Validating exact length with incorrect length': function () {
    var msg = validators.length('foo', '1111', null, {opts: {is: 3}});
    assert.equal('[[model.validatesExactLength]]', msg);
  }

, 'Validating exact length with correct length': function () {
    var msg = validators.length('foo', '111', null, {opts: {is: 3}});
    assert.ok(!msg);
  }

, 'Validating exact length with correct length and string opts': function () {
    var msg = validators.length('foo', '111', null, {opts: {is: '3'}});
    assert.ok(!msg);
  }

, 'Validating exact length with correct length and non-number string opts': function () {
    assert.throws(function () {
      var msg = validators.length('foo', '111', null, {opts: {is: 'hello'}});
    });
  }

, 'Validating exact length with old API': function () {
    var msg = validators.length('foo', '111', null, {opts: 3});
    assert.ok(!msg);
 }

, 'Validating min length with incorrect length': function () {
    var msg = validators.length('foo', '11', null, {opts: {min: 3}});
    assert.equal('[[model.validatesMinLength]]', msg);
  }

, 'Validating min length with correct length': function () {
    var msg = validators.length('foo', '111', null, {opts: {min: 3}});
    assert.ok(!msg);
  }

, 'Validating min length with correct length and string opts': function () {
    var msg = validators.length('foo', '111', null, {opts: {min: '3'}});
    assert.ok(!msg);
  }

, 'Validating min length with correct length and non-number string opts': function () {
    assert.throws(function () {
      var msg = validators.length('foo', '111', null, {opts: {min: 'hello'}});
    });
  }

, 'Validating max length with incorrect length': function () {
    var msg = validators.length('foo', '1111', null, {opts: {max: 3}});
    assert.equal('[[model.validatesMaxLength]]', msg);
  }

, 'Validating max length with correct length': function () {
    var msg = validators.length('foo', '111', null, {opts: {min: 3}});
    assert.ok(!msg);
  }

, 'Validating max length with correct length and string opts': function () {
    var msg = validators.length('foo', '111', null, {opts: {min: '3'}});
    assert.ok(!msg);
  }

, 'Validating max length with correct length and non-number string opts': function () {
    assert.throws(function () {
      var msg = validators.length('foo', '111', null, {opts: {min: 'hello'}});
    });
  }

, 'Validating with function': function () {
    var msg = validators.withFunction('foo', 'zerp', null, {reference: function (v) { return !!v; }});
    assert.ok(!msg);
  }

, 'Validating with function returning message error': function () {
    var customError = "I'm a custom error";
    var msg = validators.withFunction('foo', 'zerp', null, {reference: function (v) { return customError; }});
    assert.ok(msg === customError);
  }

, 'Validating format': function () {
    var msg = validators.format('foo', 'ABC', null, {reference: /abc/i});
    assert.ok(!msg);
  }

, 'Validating confirmed': function () {
    var msg = validators.confirmed('foo', 'ABC', {bar: 'ABC'}, {reference: 'bar'});
    assert.ok(!msg);
  }

, 'Validating present with null scenario inactive': function () {
    var msg = validators.present('foo', null, null,
        {opts: {on:'create'}, scenario:'update'});
    assert.ok(!msg);
  }

, 'Validating present with null scenario active': function () {
    var msg = validators.present('foo', null, null,
        {opts: {on:'create'}, scenario:'create'});
    assert.equal('[[model.validatesPresent]]', msg);
  }

, 'Validating present with null scenario array active front': function () {
    var msg = validators.present('foo', null, null,
        {opts: {on:['create', 'update']}, scenario:'create'});
    assert.equal('[[model.validatesPresent]]', msg);
  }

, 'Validating present with null scenario array active back': function () {
    var msg = validators.present('foo', null, null,
        {opts: {on:['create', 'reify']}, scenario:'reify'});
    assert.equal('[[model.validatesPresent]]', msg);
  }

};

module.exports = tests;
