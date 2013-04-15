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
  , i18n = utils.i18n;

/*
 * Basic validators -- name is the field name, params is the entire params
 * collection (needed for stuff like password confirmation so it's possible
 * to compare with other field values, and the rule is the data for this
 * particular validation
 * Rules can look like this:
 * present: {qualifier: true, {message: 'Gotta be here'}}
 * length: {qualifier: {min: 2, max: 12}}
 * withFunction: {qualifier: function (s) { return true },
 *    message: 'Something is wrong'}
 */
var validators = {
  present: function (name, val, params, rule, locale) {
    var msg;
    if (utils.isEmpty(val)) {
      //'Field "' + name + '" is required.';
      msg = rule.message || i18n.getText('model.validatesPresent',
        {name: name}, locale);
    }
    return msg;
  },

  absent: function (name, val, params, rule, locale) {
    var msg;
    if (val) {
      //return rule.message || 'Field "' + name + '" must not be filled in.';
      msg = rule.message || i18n.getText('model.validatesAbsent',
        {name: name}, locale);
    }
    return msg;
  },

  confirmed: function (name, val, params, rule, locale) {
    var qual = rule.qualifier
      , msg;
    if (val != params[qual]) {
      //return rule.message || 'Field "' + name + '" and field "' + qual +
      //    '" must match.';
      msg = rule.message || i18n.getText('model.validatesConfirmed',
        {name: name, qual: qual}, locale);
    }
    return msg;
  },

  format: function (name, val, params, rule, locale) {
    var msg;
    if (!rule.qualifier.test(val)) {
      //return rule.message || 'Field "' + name + '" is not correctly formatted.';
      msg = rule.message || i18n.getText('model.validatesFormat',
        {name: name}, locale);
    }
    return msg;
  },

  length: function (name, val, params, rule, locale) {
    var qual = rule.qualifier
      , err
      , msg
      , intVal
      , errMsg = 'validatesLength must be set to a integer ' +
            'or object with min/max integer properties.'
      // Coerces a value to an integer, only if it's coercible
      // Returns null otherwise
      , validInteger = function (n) {
          var intVal = Math.round(n);
          if (intVal == n) {
            return intVal;
          }
          else {
            return null;
          }
        };

    // If a specific length is wanted, there has to be a value
    // in the first place
    if (!val) {
      return rule.message || i18n.getText('model.validatesPresent', {name: name}, locale);
    }

    // Validate that there's a qualifier to check against
    if (!qual) {
      throw new Error(errMsg);
    }

    // First check to see if the qualifier is itself a number
    // If so, validate the precise length
    if ((intVal = validInteger(qual))) {
      qual = intVal;
      if (val.length != qual) {
        msg = rule.message || i18n.getText('model.validatesExactLength',
          {name: name}, locale);
      }
    }
    // If the qualifier wasn't a number, check for min or max
    // property to validate against
    else if (qual.min || qual.max) {
      // If there's either a min or max, make sure at least one
      // of them is a usable number
      if ((intVal = validInteger(qual.min))) {
        if (val.length < intVal) {
          msg = rule.message || i18n.getText('model.validatesMinLength',
            {name: name, min: qual.min}, locale);
        }
      }
      else if ((intVal = validInteger(qual.max))) {
        if (val.length > intVal) {
          msg = rule.message || i18n.getText('model.validatesMaxLength',
            {name: name, max: qual.max}, locale);
        }
      }
      // If neither min nor max provided a valid number, throw an error
      if (!intVal) {
        throw new Error(errMsg);
      }
    }
    // The qualifier wasn't a number, and there's no min or max
    // property work with -- throw
    else {
      throw new Error(errMsg);
    }

    return msg;
  },

  withFunction: function (name, val, params, rule, locale) {
    var func = rule.qualifier
      , msg;
    if (typeof func != 'function') {
      throw new Error('withFunction validator for field "' + name +
          '" must be a function.');
    }
    if (!func(val, params)) {
      //return rule.message || 'Field "' + name + '" is not valid.';
      msg = rule.message || i18n.getText('model.validatesWithFunction',
        {name: name}, locale);
    }
    return msg;
  }
};

module.exports = validators;
