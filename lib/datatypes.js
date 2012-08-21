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

var model = require('./index')
  , utils = require('utilities')
  , i18n = utils.i18n
  , datatypes
  , _isArray
  , _serialize
  , _quoteize
  , _escape
  , _unescape;

_isArray = function (obj) {
  // Defer to native if possible
  if (typeof Array.isArray == 'function') {
    return Array.isArray(obj);
  }
  return obj &&
    typeof obj === 'object' &&
    typeof obj.length === 'number' &&
    typeof obj.splice === 'function' &&
    !(obj.propertyIsEnumerable('length'));
};

_serialize = function (input, options) {
  var val = String(input)
    , opts = options || {};
  if (opts.escape) {
    val = _escape(val);
  }
  if (opts.useQuotes) {
    val = _quoteize(val);
  }
  if (opts.lowercase) {
    val = val.toLowerCase();
  }
  return val;
};

_quoteize = function (val) {
  return ["'", "'"].join(val);
}

// Scrub input for basic SQL injection protection
_escape = function (s) {
  return s.replace(/'/g, "''");
};

tunescape = function (s) {
  return s.replace(/''/g, "'");
};

/*
 * Datatype verification -- may modify the value by casting
 */
datatypes = {

  'string': {
    validate: function (name, val, locale) {
      return {
        err: null
      , val: String(val)
      };
    }
  , serialize: function (input, options) {
      return _serialize(input, options);
    }
  }

, 'text': {
    validate: function (name, val, locale) {
      return {
        err: null
      , val: String(val)
      };
    }
  , serialize: function (input, options) {
      return _serialize(input, options);
    }
  }

, 'number': {
    validate: function (name, val, locale) {
      if (isNaN(val)) {
        return {
          err: i18n.getText('model.validatesNumber', {name: name}, locale)
        , val: null
        };
      }
      return {
        err: null
      , val: Number(val)
      };
    }
  , serialize: function (input, options) {
      var opts = options || {};
      return _serialize(input, {
        escape: opts.escape
      });
    }
  }

, 'int': {
    validate: function (name, val, locale) {
      // Allow decimal values like 10.0 and 3.0
      if (Math.round(val) != val) {
        return {
          err: i18n.getText('model.validatesInteger', {name: name}, locale)
        , val: null
        };
      }
      return {
        err: null
      , val: parseInt(val, 10)
      };
    }
  , serialize: function (input, options) {
      var opts = options || {};
      return _serialize(input, {
        escape: opts.escape
      });
    }
  }

, 'boolean': {
    validate: function (name, val, locale) {
      var validated;
      switch (typeof val) {
        case 'string':
          if (val == 'true') {
            validated = true;
          }
          else if (val == 'false') {
            validated = false;
          }
          break;
        case 'number':
          if (val == 1) {
            validated = true;
          }
          else if (val == 0) {
            validated = false;
          }
          break;
        case 'boolean':
          validated = val;
          break;
        default:
          // Nothing
      }

      if (typeof validated != 'boolean') {
        return {
          err: i18n.getText('model.validatesBoolean', {name: name}, locale)
        , val: null
        };
      }
      return {
        err: null
        , val: validated
      };
    }
  , serialize: function (input, options) {
      var opts = options || {};
      return _serialize(input, {
        escape: opts.escape
      });
    }
  }

, 'object': {
    validate: function (name, val, locale) {
      // Sure, Arrays are technically Objects, but we're treating Array as a
      // separate datatype. Remember, instanceof Array fails across window
      // boundaries, so let's also make sure the Object isn't Array-ish
      if (typeof val != 'object' || _isArray(val)) {
        return {
          err: i18n.getText('model.validatesObject', {name: name}, locale)
        , val: null
        };
      }
      return {
        err: null
      , val: val
      };
    }
  , serialize: function (input, options) {
      var val
        , opts = options || {};
      if (typeof val.toString == 'function') {
        val = input.toString();
      }
      else {
        val = JSON.stringify(input);
      }
      // FIXME: Does escaping a JSONized object make sense?
      return _serialize(val, opts);
    }
  }

, 'array': {
    validate: function (name, val, locale) {
      // instanceof check can fail across window boundaries. Also check
      // to make sure there's a length property
      if (!_isArray(val)) {
        return {
          err: i18n.getText('model.validatesArray', {name: name}, locale)
        , val: null
        };
      }
      return {
        err: null
      , val: val
      };
    }
  , serialize: function (input, options) {
      var val
        , opts = options || {};
      val = input.toString();
      return _serialize(val, opts);
    }
  }

, 'date': {
    validate: function (name, val, locale) {
      var dt = utils.date.parse(val);
      if (dt) {
        return {
          err: null
        , val: dt
        };
      }
      else {
        return {
          err: i18n.getText('model.validatesDate', {name: name}, locale)
        , val: null
        };
      }
    }
  , serialize: function (input, options) {
      var val
        , opts = options || {};
      if (model.useUTC) {
        val = utils.date.toUTC(input);
      }
      else {
        val = input;
      }
      val = utils.date.strftime(val, '%F');
      return _serialize(val, opts);
    }
  }

, 'datetime': {
    validate: function (name, val, locale) {
      var dt = utils.date.parse(val);
      if (dt) {
        return {
          err: null
        , val: dt
        };
      }
      else {
        return {
          err: i18n.getText('model.validatesDatetime', {name: name}, locale)
        , val: null
        };
      }
    }
  , serialize: function (input, options) {
      var val
        , opts = options || {};
      if (model.useUTC) {
        val = utils.date.toUTC(input);
      }
      else {
        val = input;
      }
      val = utils.date.toISO8601(val, {utc: true});
      return _serialize(val, options);
    }
  }

  // This is a hack -- we're saving times as Dates of 12/31/1969, and the
  // desired time
, 'time': {
    validate: function (name, val, locale) {
      var dt = utils.date.parse(val);
      if (dt) {
        return {
          err: null
        , val: dt
        };
      }
      else {
        return {
          err: i18n.getText('model.validatesTime', {name: name}, locale)
        , val: null
        };
      }
    }
  , serialize: function (input, options) {
      var val
        , opts = options || {};
      val = utils.date.strftime(val, '%T');
      return _serialize(val, opts);
    }
  }

};

module.exports = datatypes;

// Lazy-load; model loads this file first
model = require('./index');
