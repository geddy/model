var model = require('../lib')
  , validators = model.validators
  , assert = require('assert')
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
    var msg = validators.present('foo', 0, null, {qualifier:true});
    assert.ok(!msg);
  }

, 'Validating present with null': function () {
    var msg = validators.present('foo', null, null, {qualifier:true});
    assert.equal('[[model.validatesPresent]]', msg);
  }

, 'Validating present with undefined': function () {
    var msg = validators.present('foo', undefined, null, {qualifier:true});
    assert.equal('[[model.validatesPresent]]', msg);
  }

, 'Validating exact length with incorrect length': function () {
    var msg = validators.length('foo', '1111', null, {qualifier: 3});
    assert.equal('[[model.validatesExactLength]]', msg);
  }

, 'Validating exact length with correct length': function () {
    var msg = validators.length('foo', '111', null, {qualifier: 3});
    assert.ok(!msg);
  }

, 'Validating exact length with correct length and string qualifier': function () {
    var msg = validators.length('foo', '111', null, {qualifier: '3'});
    assert.ok(!msg);
  }

, 'Validating exact length with correct length and string qualifier': function () {
    var msg = validators.length('foo', '111', null, {qualifier: '3'});
    assert.ok(!msg);
  }

, 'Validating exact length with correct length and non-number string qualifier': function () {
    assert.throws(function () {
      var msg = validators.length('foo', '111', null, {qualifier: 'hello'});
    });
  }

, 'Validating min length with incorrect length': function () {
    var msg = validators.length('foo', '11', null, {qualifier: {min: 3}});
    assert.equal('[[model.validatesMinLength]]', msg);
  }

, 'Validating min length with correct length': function () {
    var msg = validators.length('foo', '111', null, {qualifier: {min: 3}});
    assert.ok(!msg);
  }

, 'Validating min length with correct length and string qualifier': function () {
    var msg = validators.length('foo', '111', null, {qualifier: {min: '3'}});
    assert.ok(!msg);
  }

, 'Validating min length with correct length and non-number string qualifier': function () {
    assert.throws(function () {
      var msg = validators.length('foo', '111', null, {qualifier: {min: 'hello'}});
    });
  }

, 'Validating max length with incorrect length': function () {
    var msg = validators.length('foo', '1111', null, {qualifier: {max: 3}});
    assert.equal('[[model.validatesMaxLength]]', msg);
  }

, 'Validating max length with correct length': function () {
    var msg = validators.length('foo', '111', null, {qualifier: {min: 3}});
    assert.ok(!msg);
  }

, 'Validating max length with correct length and string qualifier': function () {
    var msg = validators.length('foo', '111', null, {qualifier: {min: '3'}});
    assert.ok(!msg);
  }

, 'Validating max length with correct length and non-number string qualifier': function () {
    assert.throws(function () {
      var msg = validators.length('foo', '111', null, {qualifier: {min: 'hello'}});
    });
  }

};

module.exports = tests;
