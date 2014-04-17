/*
 * Geddy JavaScript Web development framework
 * Copyright 2112 Matthew Eernisse (mde@fleegix.org)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
*/

var utils = require('utilities')
  , i18n = utils.i18n
  , validators = {}
  , baseValidators
  , createScenarioWrappedValidator;

/*
 * Basic validators -- name is the field name, params is the entire params
 * collection (needed for stuff like password confirmation so it's possible
 * to compare with other field values, and the rule is the data for this
 * particular validation
 * Rules can look like this:
 * present: {opts: {message: 'Gotta be here'}}
 * length: {opts: {min: 2, max: 12}}
 * withFunction: {reference: function (s) { return true },
 *    message: 'Something is wrong'}
 */
baseValidators = {
  present: function (name, val, params, rule, locale) {
    var msg;
    if (utils.isEmpty(val)) {
      //'Field "' + name + '" is required.';
      msg = rule.opts.message || i18n.getText('model.validatesPresent',
        {name: name}, locale);
    }
    return msg;
  },

  absent: function (name, val, params, rule, locale) {
    var msg;
    if (val) {
      //return rule.opts.message || 'Field "' + name + '" must not be filled in.';
      msg = rule.opts.message || i18n.getText('model.validatesAbsent',
        {name: name}, locale);
    }
    return msg;
  },

  confirmed: function (name, val, params, rule, locale) {
    var qual = rule.reference
      , msg;
    if (val != params[qual]) {
      //return rule.opts.message || 'Field "' + name + '" and field "' + qual +
      //    '" must match.';
      msg = rule.opts.message || i18n.getText('model.validatesConfirmed',
        {name: name, qual: qual}, locale);
    }
    return msg;
  },

  format: function (name, val, params, rule, locale) {
    var msg;
    if (!rule.reference.test(val)) {
      //return rule.opts.message || 'Field "' + name + '" is not correctly formatted.';
      msg = rule.opts.message || i18n.getText('model.validatesFormat',
        {name: name}, locale);
    }
    return msg;
  },

  length: function (name, val, params, rule, locale) {
    var qual = rule.opts
      , validQualifier = false
      , err
      , msg
      , numVal
      , errMsg = 'validatesLength must be set to a integer ' +
            'or object with min/max integer properties.';

    // If a specific length is wanted, there has to be a value
    // in the first place
    if (!val) {
      return rule.opts.message || i18n.getText('model.validatesPresent', {name: name}, locale);
    }

    // Validate that there's a opts to check against
    if (!qual) {
      throw new Error(errMsg);
    }

    // Check if using old API of passing just a number
    if (typeof qual != 'object') {
      qual = {is: qual};
    }

    // First check for an exact length qualifier
    numVal = parseFloat(qual.is);
    if (!isNaN(numVal)) {
      validQualifier = true;
      if (val.length !== numVal) {
        msg = rule.opts.message || i18n.getText('model.validatesExactLength',
          {name: name, is: qual.is}, locale);
      }
    }
    else {
      numVal = parseFloat(qual.min);
      if (!isNaN(numVal)) {
        validQualifier = true;
        if (val.length < numVal) {
          msg = rule.opts.message || i18n.getText('model.validatesMinLength',
            {name: name, min: qual.min}, locale);
        }
      }
      // Still valid, check for a max
      if (!msg) {
        numVal = parseFloat(qual.max);
        if (!isNaN(numVal)) {
          validQualifier = true;
          if (val.length > numVal) {
          msg = rule.opts.message || i18n.getText('model.validatesMaxLength',
            {name: name, max: qual.max}, locale);
          }
        }
      }
    }

    if (!validQualifier) {
      throw new Error(errMsg);
    }

    return msg;
  },

  withFunction: function (name, val, params, rule, locale) {
    var func = rule.reference
      , msg;
    if (typeof func != 'function') {
      throw new Error('withFunction validator for field "' + name +
          '" must be a function.');
    }
    
    var resultValidation = func(val, params);
    if (typeof resultValidation === typeof "") {
      msg = resultValidation;
    } 
    else if (!resultValidation) {
        //return rule.opts.message || 'Field "' + name + '" is not valid.';
        msg = rule.opts.message || i18n.getText('model.validatesWithFunction',
          {name: name}, locale);
    }

    return msg;
  }
};

createScenarioWrappedValidator = function (baseValidator) {
  return function (name, val, params, rule, locale) {
    var validScenarios = rule.opts && rule.opts.on
      , scenario = rule.scenario
      , shouldValidate = false;

    // By default, we should validate on all scenarios
    if (!validScenarios) {
      shouldValidate = true;
    }

    // If the user specified scenarios
    if (!shouldValidate) {
      // Accept strings too
      if (! validScenarios instanceof Array) {
        validScenarios = [validScenarios];
      }

      // Normalize the input
      for(var i=0, ii=validScenarios.length; i < ii; i++) {
        validScenarios[i] = validScenarios[i].toLowerCase();
      }

      // Scenario might be undefined here, but don't hide the error as
      // we should always validate with a scenario in mind lest something
      // unexpected happen.
      shouldValidate = validScenarios.indexOf(scenario.toLowerCase()) >= 0;
    }

    if (shouldValidate) {
      return baseValidator(name, val, params, rule, locale);
    }
    else {
      return null;
    }
  }
};

// Wrap all the base validators in a scenario-aware wrapper
for (var key in baseValidators) {
  validators[key] = createScenarioWrappedValidator(baseValidators[key]);
}

module.exports = validators;
