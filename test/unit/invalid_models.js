var assert = require('assert')
  , model = require('../../lib')
  , tests;


function assertValidationErrorIsThrown (InvalidModel) {
  assert.throws(
    function () {
      model.register('InvalidModel', InvalidModel);
    },
    /Validation\scannot\sbe\sadded/
  );
}


tests = {
  "test instantiating a model with validatesPresent on a property that doesn't exist": function () {
    var InvalidModel = function () {
      this.validatesPresent('monkies');
    };

    assertValidationErrorIsThrown(InvalidModel);
  }

, "test instantiating a model with validatesConfirmed on a property that doesn't exist": function () {
    var InvalidModel = function () {
      this.validatesConfirmed('monkies', 'realMonkies');
    };

    assertValidationErrorIsThrown(InvalidModel);
  }

, "test instantiating a model with validatesAbsent on a property that doesn't exist": function () {
    var InvalidModel = function () {
      this.validatesAbsent('bananas');
    };

    assertValidationErrorIsThrown(InvalidModel);
  }

, "test instantiating a model with validatesLength on a property that doesn't exist": function () {
    var InvalidModel = function () {
      this.validatesLength('gorillas', {is: 12});
    };

    assertValidationErrorIsThrown(InvalidModel);
  }

, "test instantiating a model with validatesFormat on a property that doesn't exist": function () {
    var InvalidModel = function () {
      this.validatesFormat('chimpanzees', /hairy/);
    };

    assertValidationErrorIsThrown(InvalidModel);
  }

, "test instantiating a model with validatesWithFunction on a property that doesn't exist": function () {
    var InvalidModel = function () {
      this.validatesWithFunction('ocelot', function () {});
    };

    assertValidationErrorIsThrown(InvalidModel);
  }
};

module.exports = tests;
