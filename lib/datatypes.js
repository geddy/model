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
  , _escape;

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
    val = _escape(val, opts.escape);
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

_escape = function (s, type) {
  var ret;
  switch (type) {
    // Scrub input for basic SQL injection protection
    case 'sql':
      ret = s.replace(/'/g, "''");
      break;
    // Backslash-esc single quotes for use in M/R JS sourcecode str
    case 'js':
      ret = s.replace(/'/g, "\\'");
      break;
    default:
      throw new Error(type + ' is not a valid type of escaping.');
  }
  return ret;
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
          switch (val) {
            case 'true':
            case 't':
            case 'yes':
            case '1':
              validated = true;
              break;
            case 'false':
            case 'f':
            case 'no':
            case '0':
              validated = false;
              break;
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
      // Allow saving of arrays as the datatype array only saves arrays
      // of numbers or strings correctly, but not arrays of objects
      // We're just not bothing with a separate Array datatype anymore

      // maybe a JSON string?
      if (typeof val === 'string') {
        try {
          var obj = JSON.parse(val);
          return {
            err: null,
            val: obj
          }
        }
        catch(err) {
          return {
            err: i18n.getText('model.validatesObject', {name: name}, locale),
            val: null
          }
        }
      }
      else if (typeof val != 'object') {
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

      // Arrays will be converted to JSON
      if (_isArray(input)) {
          val = JSON.stringify(input);
      }
      // Otherwise just try to serialize via toString
      else if (typeof input.toString == 'function') {
        val = input.toString();
        // If this happens the object had no usefull toString()
        // method and we should make JSON out of it
        if (val == "[object Object]") {
          val = JSON.stringify(input);
        }
      }
      else {
        val = JSON.stringify(input);
      }
      // FIXME: Does escaping a JSONized object make sense?
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
      if (model.config.useUTC) {
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
      if (model.config.useUTC) {
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
