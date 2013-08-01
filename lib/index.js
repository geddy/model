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

var util = require('util') // Native Node util module
  , model = {}
  , EventEmitter = require('events').EventEmitter
  , utils = require('utilities')
  , adapters = require('./adapters')
  , Query
  , query; // Lazy-load query; it depends on model/index

var _foreignKeyCreators = [];

utils.mixin(model, new (function () {

  this.ModelBase = function () {};
  this.adapters = {};
  this.loadedAdapters = {};
  this.descriptionRegistry = {};
  this.useTimestamps = true;
  this.useUTC = true;
  this.forceCamel = true;
  this.autoIncrementId = false;

  this.datatypes = null // Lazy-load query; it depends on model/index
  this.validators = require('./validators');
  this.formatters = require('./formatters');
  this.Migration = require('./migration').Migration;

  util.inherits(this.ModelBase, EventEmitter);

  var _createModelItemConstructor = function (def) {
    // Base constructor function for all model items
    var ModelItemConstructor = function (params) {
      var self = this
        , associations = model.descriptionRegistry[def.name].associations;

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
          , reg = model.descriptionRegistry[this.type]
          , properties = reg.properties
          , formatter;

        obj.id = this.id;
        obj.type = this.type;

        for (var p in properties) {
          formatter = model.formatters[properties[p].datatype];
          obj[p] = typeof formatter == 'function' ?
              formatter(this[p]) : this[p];
        }

        return JSON.stringify(obj);
      };

      this.toJson = this.toString;

      this._getAssociation = function () {
        var args = Array.prototype.slice.call(arguments)
          , assnName = args.shift()
          , assnType = args.shift()
          , callback = args.pop()
          , query
          , opts
          , otherKeyName
          , selfKeyName
          , keyName
          , queryName
          , reg = model.descriptionRegistry
          , assn = reg[this.type].associations[assnType]
          , modelName
          , through;

        // Bail out if the association doesn't exist
        if (!assn) {
          throw new Error('Model ' + this.type + ' does not have ' + assnType +
              ' association.');
        }

        modelName = assn[assnName].model;
        through = assn[assnName].through;

        // Normalize inflection
        modelName = utils.inflection.singularize(modelName);
        assnName = utils.inflection.singularize(assnName);

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
          otherKeyName = modelName;
          if (modelName != assnName) {
            otherKeyName = assnName + otherKeyName;
          }
          otherKeyName = utils.string.decapitalize(otherKeyName + 'Id');
          query.id = this[otherKeyName];
        }
        // The other model belongs to me; look for any
        // items whose foreign keys match my id
        // (hasOne is just a special case of hasMany)
        else {
          selfKeyName = this.type;
          if (modelName != assnName) {
            selfKeyName = assnName + selfKeyName;
          }
          selfKeyName = utils.string.decapitalize(selfKeyName + 'Id');
          query[selfKeyName] = this.id;
        }

        queryName = assnType == 'hasMany' ? 'all' : 'first';

        // -----------
        // FIXME: This is pretty terrible -- should really do these
        // async queries in some sort of composable Promisey API
        // -----------
        // Through's -- get the join-model instances, and re-fetch
        // actual assns
        if (through) {
          through = utils.string.getInflection(through, 'constructor', 'singular');
          model[through][queryName](query, opts, function (err, data) {
            var query = {}
              , idColName = utils.string.getInflection(modelName,
                    'property', 'singular') + 'Id'
              , idParam;
            if (err) {
              return callback(err, null);
            }
            if (assnType == 'hasMany') {
              idParam = [];
              data.forEach(function (item) {
                idParam.push(item[idColName]);
              });
            }
            else {
              idParam = item[idColName];
            }
            query.id = idParam;
            model[modelName][queryName](query, opts, callback);
          });
        }
        // Normal assns, just do the damn query
        else {
          model[modelName][queryName](query, opts, callback);
        }
      };

      this._createAssociation = function () {
        var args = Array.prototype.slice.call(arguments)
          , assnName = args.shift()
          , assnType = args.shift()
          , data = args.shift()
          , otherKeyName
          , selfKeyName
          , reg = model.descriptionRegistry
          , assn = reg[this.type].associations[assnType]
          , modelName
          , through
          , joinInstance
          , unsaved
          , params;

        // Bail out if the association doesn't exist
        if (!assn) {
          throw new Error('Model ' + this.type + ' does not have ' + assnType +
              ' association.');
        }

        modelName = assn[assnName].model
        through = assn[assnName].through;

        // Normalize inflection
        modelName = utils.inflection.singularize(modelName);
        assnName = utils.inflection.singularize(assnName);

        otherKeyName = modelName;
        selfKeyName = this.type;
        // Prefix named assns
        if (modelName != assnName) {
          otherKeyName = assnName + otherKeyName;
          selfKeyName = assnName + selfKeyName;
        }
        otherKeyName = utils.string.decapitalize(otherKeyName + 'Id');
        selfKeyName = utils.string.decapitalize(selfKeyName + 'Id');

        // belongsTo
        if (assnType == 'belongsTo') {
          if (!(data._saved && data.id)) {
            throw new Error('Item cannot have a belongTo association ' +
                'if the item it belongs to is not yet saved.');
          }
          this[otherKeyName] = data.id;
          unsaved = data._unsavedAssociations || [];
          unsaved.push(this);
          data._unsavedAssociations = unsaved;
        }
        // hasOne, hasMany (through)
        else {
          if (!(this._saved && this.id)) {
            throw new Error('Item cannot have a hasOne/hasMany association ' +
                'if it is not yet saved.');
          }

          // ---------------
          // FIXME: This chained saving happens automagically, so
          // validation errors in the instances just throw, with
          // no visible .errors property
          // ---------------
          // Through assn
          if (through) {
            through = utils.string.getInflection(through, 'constructor', 'singular');
            // Create join-instance
            params = {};
            params[selfKeyName] = this.id;
            joinInstance = model[through].create(params);
            unsaved = this._unsavedAssociations || [];
            if (!data._saved) {
              // Mark actual assn for chained save
              unsaved.push(data);
              // When this item gets saved, update the join-instance
              // with the correct assn foreign key
              data.on('save', function () {
                joinInstance[otherKeyName] = data.id;
              });
            }
            else {
              joinInstance[otherKeyName] = data.id;
            }
            // Mark join-instance for chained save
            unsaved.push(joinInstance);
            this._unsavedAssociations = unsaved;
          }
          else {
            data[selfKeyName] = this.id;
            unsaved = this._unsavedAssociations || [];
            unsaved.push(data);
            this._unsavedAssociations = unsaved;
          }
        }
      };

      /**
        @name ModelBase#clone
        @private
        @function
        @description Creates a 'deep copy' of the model object
      */
      this.clone = function () {
        var itemClone;

        // clone the item
        itemClone = model[this.type].create(utils.enhance({}, this.toObj(), {id:this.id}));
        itemClone.associations = utils.enhance({}, this.associations);
        itemClone._saved = this._saved;

        return itemClone;
      };

      // Relation intstance-methods
      ['hasMany', 'hasOne', 'belongsTo'].forEach(function (k) {
        var assns
          , createMethod = function (type, keyName, assnType) {
              return function () {
                var args = Array.prototype.slice.call(arguments);
                args.unshift(assnType);
                args.unshift(keyName);
                self[type + 'Association'].apply(self, args);
              };
            };
        if ((assns = associations[k])) {
          for (var assnName in assns) {
            (function (assnName) {
              var methodName = k == 'hasMany' ?
                      utils.inflection.pluralize(assnName) : assnName
                , keyForCreate = k == 'hasMany' ? 'add' : 'set';

              // get can be singular or plural, depending on hasMany/hasOne
              // this.getBooks({}, {}, function () {}); =>
              // this.getAssociation('Book', 'hasMany', {}, {}, function () {});
              self['get' + methodName] = createMethod('_get', assnName, k);

              // add/set is always singular, just use assnName for method
              // this.addBook(book); =>
              // this.createAssociation('Book', 'hasMany', book);
              self[keyForCreate + assnName] = createMethod('_create', assnName, k);
            })(assnName);
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
        , opts = args.shift() || {}
        , includeOpts;

      if (typeof query == 'string' || typeof query == 'number') {
        query = {id: query};
      }

      if (!opts.id) {
        opts.limit = 1;
        // Can't use simple LIMIT with eager-fetch of associations
        // Do an additional query with LIMIT to fetch the first object,
        // then the normal query by ID with associations
        if (opts.includes) {
          includeOpts = utils.mixin({}, opts);
          delete includeOpts.includes;
          return obj.all(query, includeOpts, function (err, data) {
            if (err) {
              return callback(err, null);
            }
            if (data && data.id) {
              delete opts.limit;
              // TODO: If queries eventually return EventEmitters,
              // need to proxy the events upward to the wrapping query
              obj.all({id: data.id}, opts, function (err, data) {
                if (err) {
                  return callback(err, null);
                }
                if (data && data.length) {
                  callback(null, data[0]);
                }
                else {
                  callback(null, null);
                }
              });
            }
            else {
              callback(null, null);
            }
          });
        }
      }

      return obj.all(query, opts, callback);
    };

    // TODO: Deprecate
    obj.load = obj.first;

    obj.all = function () {
      var args = Array.prototype.slice.call(arguments)
        , callback = args.pop() || function () {}
        , query = args.shift() || {}
        , opts = args.shift() || {}
        , adapt;

      opts.scenario = opts.scenario || 'reify';

      query = new Query(model[name], query, opts);

      adapt = model.getAdapterForModel(name);
      if (!adapt) {
        throw new Error('Adapter not found for ' + name);
      }
      else {
        if (opts.includes && adapt.name != 'postgres') {
          throw new Error('Only SQL adapters support ' +
              'the "includes" option for queries.');
        }
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

      adapt = model.getAdapterForModel(name);
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

      adapt = model.getAdapterForModel(name);
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

      adapt = model.getAdapterForModel(name);
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

  this.registerDefinitions = function (defs) {
    var self = this;
    defs.forEach(function (m) {
      // Registration may have happened in the model definition file
      // if using the old templates. Don't re-register
      if (!self[m.ctorName]) {
        self.registerDefinition(m.ctorName, m.ctor);
      }
    });
    this.createForeignKeys();
  };

  // Alias to single-def registration method
  this.register = function (name, ModelDefinition) {
    return this.registerDefinition(name, ModelDefinition);
  };

  this.registerDefinition = function (name, ModelDefinition) {
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
    // Preserve any inherited shit from the definition proto
    utils.enhance(ModelCtor.prototype, origProto);

    model[name] = ModelCtor;

    return ModelCtor;
  };

  this.createItem = function (name, p, o) {
    var params = p || {}
      , opts = o || {}
      , item = new model[name](params);

    // Default to the 'create' scenario
    opts.scenario = opts.scenario || 'create'

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
      , name = item.type
      , opts = opts || {};

    // Default to the 'update' scenario
    opts.scenario = opts.scenario || 'update'

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
      , scenario = opts.scenario
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

      validated = this.validateProperty(properties[p], params, {scenario: scenario});
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

    var options = opts || {}
      , name = prop.name
      , val = params[name]
      , datatypeName = prop.datatype.toLowerCase()
      , datatypeValidator = this.datatypes[datatypeName].validate
      , result
      , scenario = opts.scenario
      , locale = options.locale || utils.i18n.getDefaultLocale();

    // Validate for the base datatype only if there actually is a value --
    // e.g., undefined will fail the validation for Number, even if the
    // field is optional
    if (!utils.isEmpty(val)) {
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
    var validations = prop.validations
      , validator
      , err
      , rule;

    for (var p in validations) {
      validator = model.validators[p]
      rule = utils.mixin({}, validations[p], {scenario: opts.scenario});

      if (typeof validator != 'function') {
        throw new Error(p + ' is not a valid validator');
      }

      err = validator(name, val, params, rule, locale);
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

  this.getAdapterForModel = function (modelName) {
    var ctor = this[modelName];
    return ctor && ctor.adapter;
  };

  // FIXME: Move this into an associations lib
  this.getAssociation = function (main, assn) {
    var mainName = utils.string.getInflection(main, 'constructor', 'singular')
      , assnName = utils.string.getInflection(assn, 'constructor', 'singular')
      , assn
      , assnItem;
    assn = this.descriptionRegistry[mainName].associations;
    for (var p in assn) {
      assnItem = assn[p][assnName];
      if (assnItem) {
        return assnItem;
      }
    }
  };

  this.getAssociationType = function (main, assn) {
    var mainName = utils.string.getInflection(main, 'constructor', 'singular')
      , assnName = utils.string.getInflection(assn, 'constructor', 'singular')
      , assn
      , assnItem;
    assn = this.descriptionRegistry[mainName].associations;
    for (var p in assn) {
      assnItem = assn[p][assnName];
      if (assnItem) {
        return p;
      }
    }
  };

  this.getModelByName = function (name) {
    return this[name];
  };

  this.createForeignKeys = function () {
    var creator;
    while((creator = _foreignKeyCreators.pop())) {
      creator();
    }
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

  this.property = function (name, datatype, o) {
    reg[this.name].properties[name] =
      new model.PropertyDescription(name, datatype, o);
  };

  this.defineProperties = function (obj) {
    for (var property in obj) {
      this.property(property, obj[property].type, obj[property]);
    }
  }

  // (condition, name, [reference], [opts])
  this.validates = function () {
    var args = Array.prototype.slice.call(arguments)
      , arg
      , condition = args.shift()
      , name = args.shift()
      , reference
      , opts = {};
    while ((arg = args.pop())) {
      // Regex for validatesFormat or function for validatesWithFunction
      // or string param name for validatesConfirmed
      if (arg instanceof RegExp || typeof arg == 'function' ||
          typeof arg == 'string') {
        reference = arg;
      }
      else {
        opts = utils.mixin(opts, arg);
      }
    }

    // Old API allows passing simple number to validatesLength
    if (!isNaN(opts)) {
      opts = {is: opts};
    }

    // Default to 'create' and 'update' only for scenarios
    opts.on = opts.on || ['create', 'update'];

    reg[this.name].properties[name].validations[condition] =
        new model.ValidationDescription(condition, reference, opts);
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
    self[assnKey] = function (name, options) {
      var opts = options || {}
        , assn = reg[self.name].associations[assnKey] || {}
        , assnName = name
        , modelName = opts.model || name;

      // Normalize inflection; we don't care which they use
      assnName = utils.string.getInflection(assnName, 'constructor', 'singular');
      modelName = utils.string.getInflection(modelName, 'constructor', 'singular');

      assn[assnName] = {
        model: modelName
      , through: opts.through
      , type: assnKey
      };

      reg[self.name].associations[assnKey] = assn;

      // Set up foreign keys
      var createForeignKey = function (assnName) {
        return function () {
          var ownerModelName
            , ownedModelName
            , idKey
            , datatype
            , def;

          if (assnKey == 'belongsTo') {
            ownerModelName = modelName;
            ownedModelName = self.name;
            idKey = modelName;
          }
          else {
            ownerModelName = self.name;
            ownedModelName = modelName;
            idKey = self.name;
          }

          if (assnName == modelName) {
            idKey = utils.string.decapitalize(idKey) + 'Id'
          }
          else {
            idKey = utils.string.decapitalize(assnName) + idKey  + 'Id'
          }

          if (!reg[ownedModelName].properties[idKey]) {
            def = model[ownerModelName];
            datatype = model.autoIncrementId ? 'int' : 'string';

            reg[ownedModelName].properties[idKey] =
              new model.PropertyDescription(idKey, datatype);
          }
        }
      };

      // Set up foreign keys except in the case of virtual 'throughs'
      // FIXME: Hack, let other models get defined first
      // Should probably listen for an event that signals
      // base models are set up
      if (!opts.through) {
        _foreignKeyCreators.push(createForeignKey(assnName));
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
  var opts = o || {}
    , validations = {}
    , validationOpts = utils.mixin({}, opts);

  delete validationOpts.required;
  delete validationOpts.length;
  delete validationOpts.format;

  this.name = name;
  this.datatype = datatype;
  this.options = opts;

  // Creates results similar to `this.validates`, above in ModelDefinitionBase
  // Would be great to remove the duplication of logic
  for (var p in opts) {
    if (opts.required || opts.length) {
      validations.present =
          new model.ValidationDescription('present', null, validationOpts);
    }
    if (opts.length) {
      if (typeof opts.length == 'object') {
      // {min: 1, max: 2} or {is: 3}
      validations.length =
          new model.ValidationDescription('length', null,
              utils.mixin(opts.length, validationOpts));
      }
      // 1 or '1'
      else {
      validations.length =
          new model.ValidationDescription('length', null,
              utils.mixin({is: opts.length}, validationOpts));
      }
    }
    if (opts.format) {
      validations.format =
          new model.ValidationDescription('length', opts.format,
              validationOpts);
    }
  }
  this.validations = validations;
};

model.ValidationDescription = function (type, reference, opts) {
  this.type = type;
  this.reference = reference;
  this.opts = opts || {};
};

module.exports = model;

// Load last, these depend on index.js
Query = require('./query/query').Query;
model.datatypes = require('./datatypes');


