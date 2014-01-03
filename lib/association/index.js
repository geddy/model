var association
  , model = require('../index')
  , utils = require('utilities');

association = new (function () {

  this.getThroughAssnKey = function (assn, assnType, modelType, opts) {
    var through = assn.through
      , assns
      , reg = model.descriptionRegistry
      , keyAssn
      , keyName
      , side = opts.side;

    if (side == 'other') {
      if (!assn.inverse) {
        // Look through other associations, find the inverse, and cache
        // for later lookup
        for (var p in reg) {
          assns = reg[p].associations[assnType];
          for (var q in assns) {
            if (q != assn.name && assns[q].through == through) {
              assn.inverse = assns[q];
            }
          }
        }
      }
      if (!assn.inverse) {
        throw new Error('No inverse found for this through-association.');
      }
      keyAssn = assn.inverse;
    }
    else {
      keyAssn = assn;
    }

    if (keyAssn.name != keyAssn.model) {
      keyName = keyAssn.name + keyAssn.model;
    }
    else {
      keyName = keyAssn.name;
    }
    keyName = utils.string.decapitalize(keyName + 'Id');

    return keyName;
  };

  this._getAssociation = function () {
    var args = Array.prototype.slice.call(arguments)
      , assnName = args.shift()
      , assnType = args.shift()
      , callback = args.pop()
      , query
      , throughQuery
      , opts
      , otherKeyName
      , selfKeyName
      , keyName
      , queryName
      , reg = model.descriptionRegistry
      , assn = reg[this.type].associations[assnType]
      , modelName
      , through
      , throughModelName
      , throughAssn;

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
      if (through) {
        query = {};
        throughQuery = args.shift() || {};
      }
      else {
        query = args.shift() || {};
      }
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
      if (through) {
        selfKeyName = association.getThroughAssnKey(assn[assnName], assnType,
            this.type, {side: 'other'});
      }
      else {
        selfKeyName = this.type;
        if (modelName != assnName) {
          selfKeyName = assnName + selfKeyName;
        }
        selfKeyName = utils.string.decapitalize(selfKeyName + 'Id');
      }

      query[selfKeyName] = this.id;
    }

    queryName = assnType == 'hasMany' ? 'all' : 'first';

    // -----------
    // FIXME: This is pretty terrible -- should really do these
    // async queries in some sort of composable Promisey API
    // TODO: Optimize SQL adapters by using eager-fetch w. join
    // -----------
    // Through's -- get the join-model instances, and re-fetch
    // actual assns
    if (through) {
      through = utils.string.getInflection(through, 'constructor', 'singular');
      model[through][queryName](query, opts, function (err, data) {
        var query = throughQuery
          , idColName
          , idParam;

        if (err) {
          return callback(err, null);
        }

        idColName = association.getThroughAssnKey(assn[assnName], assnType,
            modelName, {side: 'this'});

        if (assnType == 'hasMany') {
          idParam = [];
          data.forEach(function (item) {
            idParam.push(item[idColName]);
          });
        }
        else {
          idParam = item[idColName];
        }
        // No join-instances, no associated items
        if (!idParam.length) {
          callback(null, []);
        }
        else {
          query.id = idParam;
          model[modelName][queryName](query, opts, callback);
        }
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
      , throughModelName
      , throughAssn
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

    // belongsTo
    if (assnType == 'belongsTo') {
      if (!(data._saved && data.id)) {
        throw new Error('Item cannot have a belongTo association ' +
            'if the item it belongs to is not yet saved.');
      }
      // Prefix named assns
      if (modelName != assnName) {
        otherKeyName = assnName + otherKeyName;
      }
      otherKeyName = utils.string.decapitalize(otherKeyName + 'Id');

      this[otherKeyName] = data.id;
      unsaved = data._unsavedAssociations || [];
      unsaved.push({operation: 'save', item: this});
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
        // Prefix named assns
        if (modelName != assnName) {
          otherKeyName = assnName + otherKeyName;
        }
        otherKeyName = association.getThroughAssnKey(assn[assnName], assnType,
            this.type, {side: 'this'});
        selfKeyName = association.getThroughAssnKey(assn[assnName], assnType,
            this.type, {side: 'other'});

        through = utils.string.getInflection(through, 'constructor', 'singular');
        // Create join-instance
        params = {};
        params[selfKeyName] = this.id;
        joinInstance = model[through].create(params);

        unsaved = this._unsavedAssociations || [];
        if (!data._saved) {
          // Mark actual assn for chained save
          unsaved.push({operation: 'save', item: data});
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
        unsaved.push({operation: 'save', item: joinInstance});
        this._unsavedAssociations = unsaved;
      }
      else {
        // Prefix named assns
        if (modelName != assnName) {
          selfKeyName = assnName + selfKeyName;
        }
        selfKeyName = utils.string.decapitalize(selfKeyName + 'Id');

        data[selfKeyName] = this.id;
        unsaved = this._unsavedAssociations || [];
        unsaved.push({operation: 'save', item: data});
        this._unsavedAssociations = unsaved;
      }
    }
  };

  this._removeAssociation = function () {
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
      , throughModelName
      , throughAssn
      , removeQuery
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

    // belongsTo -- remove the foreign-key value on this obj
    if (assnType == 'belongsTo') {
      if (modelName != assnName) {
        otherKeyName = assnName + otherKeyName;
      }
      otherKeyName = utils.string.decapitalize(otherKeyName + 'Id');

      this[otherKeyName] = null; // Remove value
      unsaved = data._unsavedAssociations || [];
      unsaved.push({operation: 'save', item: this});
      data._unsavedAssociations = unsaved;
    }
    // hasOne, hasMany (through) -- remove the foreign-key value
    // on the other obj, or remove the join-model instance for through-assn
    else {
      // ---------------
      // FIXME: This chained saving happens automagically, so
      // validation errors in the instances just throw, with
      // no visible .errors property
      // ---------------
      // Through assn
      if (through) {
        // Prefix named assns
        if (modelName != assnName) {
          otherKeyName = assnName + otherKeyName;
        }
        otherKeyName = association.getThroughAssnKey(assn[assnName], assnType,
            this.type, {side: 'this'});
        selfKeyName = association.getThroughAssnKey(assn[assnName], assnType,
            this.type, {side: 'other'});

        through = utils.string.getInflection(through, 'constructor', 'singular');

        // Create join-instance
        removeQuery = {};
        removeQuery[selfKeyName] = this.id;
        removeQuery[otherKeyName] = data.id;

        unsaved = this._unsavedAssociations || [];
        // Mark join-instance for removal
        unsaved.push({operation: 'remove', query: removeQuery, through: through});
        this._unsavedAssociations = unsaved;
      }
      else {
        // Prefix named assns
        if (modelName != assnName) {
          selfKeyName = assnName + selfKeyName;
        }
        selfKeyName = utils.string.decapitalize(selfKeyName + 'Id');

        data[selfKeyName] = null;
        unsaved = this._unsavedAssociations || [];
        unsaved.push({operation: 'save', item: data});
        this._unsavedAssociations = unsaved;
      }
    }
  };

  this._commitAssociationChanges = function (callback) {
    var self = this
      , assn
      , unsaved = this._unsavedAssociations || []
      , doIt = function () {
          if ((assn = unsaved.shift())) {
            if (assn.operation == 'save') {
              assn.item.save(function (err, data) {
                if (err) {
                  callback(err);
                }
                else {
                  doIt();
                }
              });
            }
            // Through-associations, removing join-model inst
            else if (assn.operation == 'remove') {
              model[assn.through].remove(assn.query, function (err, data) {
                if (err) {
                  callback(err);
                }
                else {
                  doIt();
                }
              });
            }
            else {
              callback(new Error('Association items can only be saved or removed.'));
            }
          }
          else {
            callback();
          }
        };

    doIt();
  };

})();

module.exports = association;
