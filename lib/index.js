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

/*
Example model file, would be app/models/user.js:

var User = function () {
  this.property('login', 'string', {required: true});
  this.property('password', 'string', {required: true});
  this.property('lastName', 'string');
  this.property('firstName', 'string');

  this.validatesPresent('login');
  this.validatesFormat('login', /[a-z]+/, {message: 'Subdivisions!'});
  this.validatesLength('login', {min: 3});
  this.validatesConfirmed('password', 'confirmPassword');
  this.validatesWithFunction('password',
      function (s) { return s.length > 0; // Could be anything
  });
};

User.prototype.someMethod = function () {
  // Do some stuff on a User instance
};

User = model.register('User', User);
*/

var model = {}
  , EventEmitter = require('events').EventEmitter
  , utils = require('utilities')
  , adapters = require('./adapters')
  , query; // Lazy-load query; it depends on model/index

utils.mixin(model, new (function () {

  this.ModelBase = function () {};
  this.adapters = {};
  this.loadedAdapters = {};
  this.descriptionRegistry = {};
  this.useTimestamps = true;
  this.useUTC = true;
  this.forceCamel = true;

  this.datatypes = null // Lazy-load query; it depends on model/index
  this.validators = require('./validators');
  this.formatters = require('./formatters');

  var _createModelItemConstructor = function (def) {
    // Base constructor function for all model items
    var ModelItemConstructor = function (params) {
      var self = this
        , associations = model.descriptionRegistry[def.name].associations
        , assnKey;

      var _saveAssociations = function (callback) {
            var self = this
              , assn
              , unsaved = this._unsavedAssociations || []
              , doIt = function () {
                  if ((assn = unsaved.shift())) {
                    assn.save(function (err, data) {
                      if (err) {
                        throw err;
                      }
                      doIt();
                    });
                  }
                  else {
                    callback();
                  }
                };

            doIt();
          };

      this.type = def.name;
      // Items fetched from an API should have this flag set to true
      this._saved = params._saved || false;

      // If fetched and instantiated from an API-call, give the
      // instance the appropriate ID -- newly created objects won't
      // have one until saved
      if (params.id) {
        this.id = params.id;
      }

      this.isValid = function () {
        return !this.errors;
      };

      /**
        @name ModelBase#save
        @public
        @function
        @description Saves an instance of a Geddy ModelBase
        @param {Object} [opts]
          @param {String} [opts.locale=null] Optional locale for
          localizing error messages from validations
        @param {Function} [callback] Callback function that receives
        the result of the save action -- should be in the format of
        function (err, result) {}
       */
      this.save = function () {
        var args = Array.prototype.slice.call(arguments)
          , m = model[this.type];
        args.unshift(this);
        _saveAssociations.apply(this, [function () {
          m.save.apply(m, args);
        }]);
      };

      /**
        @name ModelBase#updateProperties
        @public
        @function
        @description Updates the attributes an instance of a Geddy
        ModelBase, and validate the changes
        @param {Object} params Object-literal with updated values for
        the instance
        the result of the save action -- should be in the format of
        function (err, result) {}
        @param {Object} [opts]
          @param {String} [opts.locale=null] Optional locale for
          localizing error messages from validations
       */
      this.updateProperties = function (params, opts) {
        model.updateItem(this, params, opts || {});
      };
      // TODO: Deprecate?
      this.updateAttributes = this.updateProperties;
      /**
        @name ModelBase#toData
        @public
        @function
        @description Returns an object with just the data properties
        defined by its model
       */
      this.toData = function (options) {
        var self = this
          , opts = options || {}
          , whitelist = opts.whitelist || []
          , obj = {}
          , reg = model.descriptionRegistry[this.type]
          , properties = reg.properties;

        for (var p in properties) {
          obj[p] = this[p];
        }
        whitelist.forEach(function (p) {
          if (self[p]) {
            obj[p] = self[p];
          }
        });

        return obj;
      };

      this.toObj = this.toData;

      this.toString = function () {
        var obj = {}
          , props = this.properties
          , formatter;

        obj.id = this.id;
        obj.type = this.type;

        for (var p in props) {
          formatter = model.formatters[props[p].datatype];
          obj[p] = typeof formatter == 'function' ?
              formatter(this[p]) : this[p];
        }

        return JSON.stringify(obj);
      };

      this.toJson = this.toString;

      this.getAssociation = function () {
        var args = Array.prototype.slice.call(arguments)
          , modelName = args.shift()
          , assnType = args.shift()
          , callback = args.pop()
          , query
          , opts
          , otherKeyName = utils.string.decapitalize(modelName)
          , selfKeyName = utils.string.decapitalize(this.type)
          , queryName;

        // Has query object
        if (assnType == 'hasMany') {
          query = args.shift() || {};
        }
        // No query object, create one
        else {
          query = {};
        }
        // Lastly grab opts if any
        opts = args.shift() || {};

        // I belong to the other model; look for the item
        // whose id matches my foreign key for that model
        if (assnType == 'belongsTo') {
          query.id = this[otherKeyName +  'Id'];
        }
        // The other model belongs to me; look for any
        // items whose foreign keys match my id
        // (hasOne is just a special case of hasMany)
        else {
          query[selfKeyName + 'Id'] = this.id;
        }

        queryName = assnType == 'hasMany' ? 'all' : 'load'
        model[modelName][queryName](query, opts, callback);
      };

      this.createAssociation = function () {
        var args = Array.prototype.slice.call(arguments)
          , modelName = args.shift()
          , assnType = args.shift()
          , data = args.shift()
          , otherKeyName = utils.string.decapitalize(modelName)
          , selfKeyName = utils.string.decapitalize(this.type)
          , unsaved;

        if (assnType == 'belongsTo') {
          if (!(data._saved && data.id)) {
            throw new Error('Item cannot have a belongTo association ' +
                'if the item it belongs to is not yet saved.');
          }
          this[otherKeyName + 'Id'] = data.id;
          unsaved = data._unsavedAssociations || [];
          unsaved.push(this);
          data._unsavedAssociations = unsaved;
        }
        else {
          if (!(this._saved && this.id)) {
            throw new Error('Item cannot have a hasOne/hasMany association ' +
                'if it is not yet saved..');
          }
          data[selfKeyName + 'Id'] = this.id;
          unsaved = this._unsavedAssociations || [];
          unsaved.push(data);
          this._unsavedAssociations = unsaved;
        }
      };

      // Relation intstance-methods
      assnKey = associations.hasMany;
      ['hasMany', 'hasOne', 'belongsTo'].forEach(function (k) {
        var assnKeys
          , assnKey
          , modelName
          , keyForCreate = k == 'hasMany' ? 'add' : 'set'
          , createMethod = function (type, keyName, assnType) {
              return function () {
                var args = Array.prototype.slice.call(arguments);
                args.unshift(assnType);
                args.unshift(keyName);
                self[type + 'Association'].apply(self, args);
              };
            };
        if ((assnKeys = associations[k])) {
          for (assnKey in assnKeys) {
            modelName = k == 'hasMany' ?
                utils.inflection.singularize(assnKey) : assnKey;
            // this.getBooks({}, {}, function () {}); =>
            // this.getAssociation('Book', 'hasMany', {}, {}, function () {});
            self['get' + assnKey] = createMethod('get', modelName, k);
            // this.addBook(book); =>
            // this.createAssociation('Book', 'hasMany', book);
            self[keyForCreate + modelName] = createMethod('create', modelName, k);
          }
        }
      });

    };

    return ModelItemConstructor;
  };

  var _createStaticMethodsMixin = function (name) {
    var obj = {};

    /**
      @name ModelBase.create
      @public
      @static
      @function
      @description Creates an instance of a Geddy ModelBase, validating
      the input parameters
      @param {Object} params Object-literal with updated values for
      the instance
      the result of the save action -- should be in the format of
      function (err, result) {}
      @param {Object} [opts]
        @param {String} [opts.locale=null] Optional locale for
        localizing error messages from validations
     */
    obj.create = function () {
      var args = Array.prototype.slice.call(arguments);
      args.unshift(name);
      return model.createItem.apply(model, args);
    };

    // Returns the first item found
    obj.first = function () {
      var args = Array.prototype.slice.call(arguments)
        , callback = args.pop()
        , query = args.shift() || {}
        , opts = args.shift() || {};

      if (typeof query == 'string' || typeof query == 'number') {
        query = {id: query};
      }
      opts.limit = 1;

      return obj.all(query, opts, callback);
    };

    // TODO: Deprecate
    obj.load = obj.first;

    obj.all = function () {
      var args = Array.prototype.slice.call(arguments)
        , Query = Query || require('./query/query').Query
        , callback = args.pop() || function () {}
        , query = args.shift() || {}
        , opts = args.shift() || {}
        , adapt;

      query = new Query(model[name], query, opts);

      adapt = model.adapters[name];
      if (!adapt) {
        throw new Error('Adapter not found for ' + name);
      }
      return adapt.load.apply(adapt, [query, callback]);
    };

    obj.save = function () {
      var args = Array.prototype.slice.call(arguments)
        , beforeSaveArgs = args.slice()
        , emitFunc = function () {
            model[name].emit.apply(model[name], beforeSaveArgs);
          }
        , data = args.shift()
        , callback = args.pop() || function () {}
        , opts = args.shift() || {}
        , adapt
        , saved
        , isCollection;

      beforeSaveArgs.unshift('beforeSave');

      adapt = model.adapters[name];
      if (!adapt) {
        throw new Error('Adapter not found for ' + name);
      }

      isCollection = Array.isArray(data);
      // Collection
      // Bulk save only works on new items -- existing item should only
      // be when doing instance.save because update takes only one set
      // of edited props to be applied to all items
      if (isCollection) {

        emitFunc();

        saved = false;
        for (var i = 0, ii = data.length; i < ii; i++) {
          item = data[i];
          if (item._saved) {
            return callback(new Error('A bulk-save can only have new ' +
                'items in it.'), null);
          }
          // Bail out if any instance isn't valid and no force flag
          if (!(item.isValid() || opts.force)) {
            return callback(item.errors, null);
          }
        }
      }
      // Single item
      else {

        saved = data._saved;
        // Bail out if instance isn't valid
        if (!(data.isValid() || opts.force)) {
          return callback(data.errors, null);
        }
        // Already existing instance, use update
        if (saved) {
          if (model.useTimestamps) {
            data.updatedAt = new Date();
          }
          // Re-route to update
          return obj.update.apply(obj, [data, {id: data.id},
              opts, callback]);
        }

        data.emit('beforeSave');
        emitFunc();
      }

      return adapt.insert.apply(adapt, [data, opts, function (err, res) {
        if (!err) {
          model[name].emit('save', res);
          if (!isCollection) {
            data.emit('save');
          }
        }
        callback(err, res);
      }]);
    };

    obj.update = function () {
      var args = Array.prototype.slice.call(arguments)
        , Query = Query || require('./query/query').Query
        , data
        , callback
        , query
        , opts
        , adapt;

      args.unshift('beforeUpdate');
      model[name].emit.apply(model[name], args);
      args.shift();

      data = args.shift();
      callback = args.pop() || function () {};
      query = args.shift() || {};
      opts = args.shift() || {};

      if (typeof query == 'string' || typeof query == 'number') {
        query = {id: query};
      }

      // Data may by just a bag or params, or an actual instance
      if (data instanceof model.ModelBase) {
        // Bail out if instance isn't valid
        if (!(data.isValid() || opts.force)) {
          return callback(data.errors, null);
        }
        data.emit('beforeUpdate');
      }

      query = new Query(model[name], query, opts);

      adapt = model.adapters[name];
      if (!adapt) {
        throw new Error('Adapter not found for ' + name);
      }

      return adapt.update.apply(adapt, [data, query, function (err, res) {
        if (!err) {
          model[name].emit('update', res);
          // Data may by just a bag or params, or an actual instance
          if (typeof data.emit == 'function') {
            data.emit('update');
          }
        }
        callback(err, res);
      }]);
    };

    obj.remove = function () {
      var args = Array.prototype.slice.call(arguments)
        , Query = Query || require('./query/query').Query
        , query
        , callback
        , opts
        , adapt;

      args.unshift('beforeRemove');
      model[name].emit.apply(model[name], args);
      args.shift();

      query = args.shift();
      callback = args.pop() || function () {};
      opts = args.shift() || {};

      if (typeof query == 'string' || typeof query == 'number') {
        query = {id: query};
        opts.limit = 1;
      }

      query = new Query(model[name], query, opts);

      adapt = model.adapters[name];
      if (!adapt) {
        throw new Error('Adapter not found for ' + name);
      }

      return adapt.remove.apply(adapt, [query, function (err, res) {
        if (!err) {
          model[name].emit('remove', res);
        }
        callback(err, res);
      }]);
    };

    obj.modelName = name;

    return obj;
  };

  this.register = function (name, ModelDefinition) {
    var origProto = ModelDefinition.prototype
      , defined
      , ModelCtor;

    // Create the place to store the metadata about the model structure
    // to use to do validations, etc. when constructing
    model.descriptionRegistry[name] = new model.ModelDescription(name);
    // Execute all the definition methods to create that metadata
    ModelDefinition.prototype = new model.ModelDefinitionBase(name);
    defined = new ModelDefinition();

    // Create the constructor function to use when calling static
    // ModelCtor.create. Gives them the proper instanceof value,
    // and .valid, etc. instance-methods.
    ModelCtor = _createModelItemConstructor(defined);

    // Mix in the static methods like .create and .load
    utils.mixin(ModelCtor, _createStaticMethodsMixin(name));
    // Mix on the statics
    utils.mixin(defined, ModelDefinition);
    // Same with statics
    utils.mixin(ModelCtor, defined);
    // Same with EventEmitter methods
    utils.enhance(ModelCtor, new EventEmitter());

    // Mix any functions defined directly in the model-item definition
    // 'constructor' into the original prototype, and set it as the prototype of the
    // actual constructor
    utils.mixin(origProto, defined);

    ModelCtor.prototype = new model.ModelBase();
    // Add eventing to instances
    utils.enhance(ModelCtor.prototype, new EventEmitter());
    // Preserve any inherited shit from the definition proto
    utils.enhance(ModelCtor.prototype, origProto);

    model[name] = ModelCtor;

    return ModelCtor;
  };

  this.createItem = function (name, p, o) {
    var params = p || {}
      , opts = o || {}
      , item = new model[name](params);

    model[name].emit('beforeCreate', p, o);

    item = this.validateAndUpdateFromParams(item, params, opts);

    if (this.useTimestamps && !item.createdAt) {
      item.createdAt = new Date();
    }

    // After-create hook
    if (typeof item.afterCreate === 'function') {
      item.afterCreate();
    }
    model[name].emit('create', item);
    return item;
  };

  this.updateItem = function (item, params, opts) {
    var data = {}
      , name = item.type;

    model[name].emit('beforeUpdateProperties', item, params, opts);
    item.emit('beforeUpdateProperties');

    utils.mixin(data, item);
    utils.mixin(data, params);
    this.validateAndUpdateFromParams(item, data, opts);

    // After-update hook
    if (typeof item.afterUpdate === 'function') {
      item.afterUpdate();
    }

    model[name].emit('updateProperties', item);
    item.emit('updateProperties');

    return item;
  };

  this.validateAndUpdateFromParams = function (item, passedParams, opts) {
    var params
      , name = item.type
      , type = model.descriptionRegistry[name]
      , properties = type.properties
      , validated = null
      , errs = null
      , camelizedKey
      , skip = opts.skip
      , skipKeys = {}
      , val;

    item.emit('beforeValidate')
    model[name].emit('beforeValidate', item, passedParams);

    // May be revalidating, clear errors
    delete item.errors;

    // Convert snake_case names in params to camelCase
    if (this.forceCamel) {
      params = {};
      for (var p in passedParams) {
        // Allow leading underscores in the keys for pseudo-privates
        camelizedKey = utils.string.camelize(p, {leadingUnderscore: true});
        params[camelizedKey] = passedParams[p];
      }
    }
    else {
      params = passedParams;
    }

    // User-input should never contain these -- but we still want
    // to validate them to make sure the format didn't get fucked up
    if (typeof item.createdAt != 'undefined') {
      params.createdAt = item.createdAt;
    }
    if (typeof item.updatedAt != 'undefined') {
      params.updatedAt = item.updatedAt;
    }

    if (skip) {
      for (var i in skip) {
        skipKeys[skip[i]] = true;
      }
    }

    for (var p in properties) {
      if (skipKeys[p]) {
        continue;
      }

      validated = this.validateProperty(properties[p], params);
      // If there are any failed validations, the errs param
      // contains an Object literal keyed by field name, and the
      // error message for the first failed validation for that
      // property
      // Use raw, invalid value on the instance
      if (validated.err) {
        errs = errs || {};
        errs[p] = validated.err;
        item[p] = params[p];
      }
      // Otherwise add the type-coerced, valid value to the return item
      else {
        item[p] = validated.val;
      }
    }

    // Should never have been incuded in user input, so safe to
    // rm these from the params
    delete params.createdAt;
    delete params.updatedAt;

    if (errs) {
      item.errors = errs;
    }

    item.emit('validate')
    model[name].emit('validate', item);

    return item;
  };

  this.validateProperty = function (prop, params, opts) {

    this.datatypes = this.datatypes || require('./datatypes');

    var options = opts || {}
      , name = prop.name
      , val = params[name]
      , datatypeName = prop.datatype.toLowerCase()
      , datatypeValidator = this.datatypes[datatypeName].validate
      , result
      , locale = options.locale || utils.i18n.getDefaultLocale();

    // Validate for the base datatype only if there actually is a value --
    // e.g., undefined will fail the validation for Number, even if the
    // field is optional
    if (val) {
      // 'Any' datatype
      if (prop.datatype == '*') {
        result = {
          val: val
        };
      }
      // Specific datatype -- perform validation/type-coercion
      else {
        result = datatypeValidator(name, val, locale);
        if (result.err) {
          return {
            err: result.err,
            val: null
          };
        }
      }
      // Value may have been modified in the datatype check -- e.g.,
      // 'false' changed to false, '8.0' changed to 8, '2112' changed to
      // 2112, etc.
      val = result.val;
    }

    // Now go through all the base validations for this property
    var validations = prop.validations;
    var validator;
    var err;
    for (var p in validations) {
      validator = model.validators[p]
      if (typeof validator != 'function') {
        throw new Error(p + ' is not a valid validator');
      }
      err = validator(name, val, params, validations[p], locale);
      // If there's an error for a validation, don't bother
      // trying to continue with more validations -- just return
      // this first error message
      if (err) {
        return {
          err: err,
          val: null
        };
      }
    }

    // If there weren't any errors, return the value for this property
    // and no error
    return {
      err: null,
      val: val
    };
  };

  this.getAdapterInfo = function (name) {
    return adapters.getAdapterInfo(name);
  };

})());

model.ModelDefinitionBase = function (name) {
  var self = this
    , reg = model.descriptionRegistry
    , _createValidator = function (p) {
        return function () {
          var args = Array.prototype.slice.call(arguments);
          args.unshift(p);
          return self.validates.apply(self, args);
        };
      };

  this.name = name;

  this.adapter = function (adapter, config) {
      var Adapter = require('./adapters/' + adapters.getAdapterInfo(adapter).filePath).Adapter;
      model.adapters[name] = new Adapter(config);
  };

  this.property = function (name, datatype, o) {
    reg[this.name].properties[name] =
      new model.PropertyDescription(name, datatype, o);
  };

  this.defineProperties = function (obj) {
    for (var property in obj) {
      this.property(property, obj[property].type, obj);
    }
  }

  this.validates = function (condition, name, qualifier, opts) {
    var rule = utils.mixin({}, opts, true);
    rule.qualifier = qualifier;
    reg[this.name].properties[name]
        .validations[condition] = rule;
  };

  // For each of the validators, create a validatesFooBar from
  // validates('fooBar' ...
  for (var p in model.validators) {
    this['validates' + utils.string.capitalize(p)] = _createValidator(p);
  }

  // Add the base model properties -- these should not be handled by user input
  if (model.useTimestamps) {
    this.property('createdAt', 'datetime');
    this.property('updatedAt', 'datetime');
  }

  ['hasMany', 'hasOne', 'belongsTo'].forEach(function (assnKey) {
    self[assnKey] = function (name) {
      var assn = reg[self.name].associations[assnKey] || {}
        , def
        , idDatatype;
      assn[name] = true;
      reg[self.name].associations[assnKey] = assn;
      if (assnKey == 'belongsTo') {
        // FIXME: Hack, let other models get defined first
        // Should probably listen for an event that signals
        // base models are set up
        setTimeout(function () {
          def = model[name];
          idDatatype = def.autoIncrementId ? 'int' : 'string';
          self.property(utils.string.decapitalize(name) + 'Id', idDatatype);
        }, 0);
      }
    };
  });
};

model.ModelDescription = function (name) {
  this.name = name;
  this.properties = {};
  this.associations = {};
};

model.PropertyDescription = function (name, datatype, o) {
  var opts = o || {};
  this.name = name;
  this.datatype = datatype;
  this.options = opts;
  var validations = {};
  for (var p in opts) {
    if (opts.required || opts.length) {
      validations.present = true;
    }
    if (opts.length) {
      validations.length = opts.length;
    }
    if (opts.format) {
      validations.format = opts.format;
    }
  }
  this.validations = validations;
};

module.exports = model;

