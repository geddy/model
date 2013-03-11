var model = require('../lib')
  , assert = require('assert')
  , model = require('../lib')
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
};

module.exports = tests;