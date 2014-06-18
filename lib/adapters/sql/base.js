var model = require('../../index')
  , Adapter
  , EventedQueryProcessor
  , EventEmitter = require('events').EventEmitter
  , Query = require('../../query/query').Query
  , BaseAdapter = require('../base_adapter').BaseAdapter
  , sqlTransformer = require('../transformers/sql')
  , queryParser = require('./query/parser')
  , converter = require('./converter')
  , datatypes = require('../../datatypes')
  , util = require('util') // Native Node, for `inherits`
  , utils = require('utilities')
  , association = require('../../association');

Adapter = function () {
};

Adapter.prototype = new BaseAdapter();

// Mix in query transformer methods
utils.mixin(Adapter.prototype, queryParser);

utils.mixin(Adapter.prototype, new (function () {
  // MySQL overrides this to use backtick
  this.COLUMN_NAME_DELIMITER = '"';
  // SQLite still uses 1 and 0 for these
  this.TRUE_VALUE = true;
  this.FALSE_VALUE = false;
  this.FETCH_METHOD = 'exec';

  this._getCount = function (data) {
    return data[0]['COUNT(*)'];
  };

  // Wraps a string with delimiters, cleans up query builder code a whole lot
  this.d = function (t) {
    return this.COLUMN_NAME_DELIMITER + t + this.COLUMN_NAME_DELIMITER;
  };

  this._createSelectStatementWithConditions = function (query) {
    var self = this
      , sql = ''
      , selects = []
      , meta = query._sqlMetadata
      , dependencyList = meta.dependencyList
      , conditions = this.transformConditions(query.conditions)
      , opts = query.opts
      , sort = opts.sort
      , limit = opts.limit
      , skip = opts.skip;

    /**
    * Because SQL doesn't specify a row order, if the user does
    * an eager loading query, we have no way to stream the
    * result set because the main table rows might be out of
    * order, which means that events fire before submodels
    * have all been initialized. If there is no top level id sort,
    * then we add an ascending sort on the main table id, which
    * is what you'd probably expect anyway.
    */
    if(opts.includes && !sort) {
      sort = {id: 'asc'};
    }

    sql += 'SELECT\n';
    if (query.opts.count) {
      sql += 'COUNT(*)\n';
    }
    else if (query.opts.limitedEagerPrequery) {
      var fakesort

      // Need sort cols in SELECT with DISTINCT
      if (!sort) {
        fakesort = {id: 'asc'}
      }
      else {
        // Make a copy and extend with id: asc
        fakesort = utils.enhance({}, sort, {id: 'asc'})
      }

      // Abuse the sort transform to create the distinct clause
      sql += 'DISTINCT ' + this.transformSortOrder(fakesort, meta)
          .replace(/^ORDER BY /, '')
          .replace(/ ASC/g, '')
          .replace(/ DESC/g, '')
          .split(',')
          .map(function (columnField) {
              columnField = columnField.trim()
              return columnField + ' ' + self.COLUMN_NAME_DELIMITER +
                      columnField.replace(new RegExp(meta.mainTable + '\\.' + self.COLUMN_NAME_DELIMITER), meta.mainKey + '#')
            })
          .join(', ')
    }
    else {
      for (var key in dependencyList) {
        selects.push(self._createSelectStatement(key, dependencyList[key]));
      }
      sql += selects.join(',\n')
    }
    sql += '\n';
    sql += self._createFromStatement(meta.dependencyTree) + '\n';
    if (conditions) {
      sql += 'WHERE ' + conditions + '\n';
    }
    if (sort) {
      sql += this.transformSortOrder(sort, meta) + '\n';
    }
    if (skip) {
      sql += 'OFFSET ' + skip + '\n';
    }
    if (limit) {
      sql += 'LIMIT ' + limit + '\n';
    }
    sql += ';';

    return sql;
  };

  this._createUpdateStatementWithConditions = function (data, query) {
    var modelName = data.type
      , reg = model.descriptionRegistry
      , props = reg[modelName].properties
      , prop
      , def
      , sql = ''
      , updates = []
      , update;

    // Iterate over the properties in the params, make sure each
    // property exists in the definition
    for (var p in data) {
      def = props[p];
      prop = data[p];
      if (props.hasOwnProperty(p)) {
        update = this._columnizePropertyName(p, {
          useQuotes: true
        }) +
        ' = ';

        update += this.transformValue(prop, def.datatype);

        updates.push(update);
      }
    }
    sql += 'UPDATE ' + this._tableizeModelName(modelName) + ' SET ';
    sql += updates.join(', ') + ' ';
    sql += 'WHERE ' + this.transformConditions(query.conditions);
    sql += ';'

    return sql;
  };

  this._createDeleteStatementWithConditions = function (query) {
    var sql = '';
    sql += 'DELETE FROM ' + this._tableizeModelName(query.model.modelName) + ' ';
    sql += 'WHERE ' + this.transformConditions(query.conditions);
    sql += ';'

    return sql;
  };

  this._createSelectStatement = function (key, dependency) {
    var name = dependency.model
      , tableName
      , props
      , propArr
      , propName
      , srcKey;

    if(dependency.parent == null) {
      srcKey = dependency.table;
    }
    else {
      srcKey = key;
    }

    tableName = this._tableizeModelName(name);
    props = model.descriptionRegistry[name].properties;
    propArr = [];

    propArr.push(this.d(converter._aliasAssociationkey(srcKey)) + '.' + this.d('id') +
       ' AS ' + converter._aliasAssociationkey(this.d(key + '#id')));

    for (var p in props) {
      propName = this.d(converter._aliasAssociationkey(srcKey)) + '.' + this._columnizePropertyName(p);

      // Holy motherfucking shit. We need to coerce
      // these date strings to be interpreted by all the various
      // libraries as UTC dates. Otherwise they helpfully assume you've
      // stored these values with the same local timezone as the server
      if (props[p].datatype == 'datetime') {
        switch (this.name) {
          case 'postgres':
            propName += ' AT TIME ZONE \'UTC\'';
            break;
          case 'mysql':
            propName = 'CONCAT(' + propName + ' , \'Z\')';
            break;
          case 'sqlite':
            propName = propName + ' || \'Z\'';
            break;
          default:
            throw new Error('Unknown SQL datastore type');
        }
      }

      propName += ' AS ' +
        this.d(converter._aliasAssociationkey(key + '#' + this._columnizePropertyName(p, {useQuotes: false})));
      propArr.push(propName);
    }
    return propArr.join(', ');
  };

  /**
  * tree - the dependency tree
  */
  this._createFromStatement = function (tree, parent, ancestors) {
    var self = this
      , sql = ''
      , assn
      , assnName
      , singularAssnName
      , mainColName
      , assnColName
      , mainTableName
      , assnTableName
      , assnModelTableName
      , throughModelTableName
      , throughTableName
      , throughAssnColName;

    // If parent is null then this is the root node
    if(parent == null) {
      assnName = Object.keys(tree)[0]; // There will only be one key at the root node
      sql += 'FROM ' + tree[assnName].table + ' ' + tree[assnName].table + '\n';

      // Iterate through children
      if(tree[assnName].children) {
        sql += self._createFromStatement(tree[assnName].children, assnName, []);
      }

      return sql;
    }

    // If tree is an array, then just make a statement for each item
    if (Array.isArray(tree)) {
      return tree.map(function (dep) {
        return self._createFromStatement(dep, parent, ancestors);
      }).join('\n');
    }

    // Otherwise, tree is a dependency node
    assn = tree.assn;
    assnName = assn.name;
    singularAssnName = utils.string.getInflection(assnName, 'constructor', 'singular');

    // belongsTo is the reverse of a hasMany/hasOne
    if (assn.type == 'belongsTo') {
      // Normal assn
      if (singularAssnName == assn.model) {
        mainColName = singularAssnName + 'Id';
      }
      // Named assn, namespace the id
      else {
        mainColName = singularAssnName + assn.model + 'Id';
      }

      assnColName = 'id';
    }
    else {
      mainColName = 'id';

      // Named assn, namespace the id
      if (assn.through) {
        assnColName = association.getThroughAssnKey(assn,
              assn.type, parent, {side: 'other'});
      }
      // Normal assn
      else if (singularAssnName == assn.model) {
        assnColName = parent + 'Id';
      }
      // Named assn
      else {
        assnColName = singularAssnName + parent + 'Id';
      }
    }

    assnColName = converter._columnizePropertyName(assnColName, {useQuotes: false});
    mainColName = converter._columnizePropertyName(mainColName, {useQuotes: false});
    assnModelTableName = converter._tableizeModelName(assn.model);

    if(ancestors.length === 0) {
      mainTableName = converter._tableizeModelName(parent);
    }
    else {
      mainTableName = tree.key.substring(0, tree.key.lastIndexOf('#'));
    }

    // Through assn
    // Ex., Baz model has association Foo through Bar
    // LEFT OUTER JOIN bars ON (bazes."id" = bars."baz_id")
    // LEFT OUTER JOIN foos foos ON (bars."foo_id" = foos."id")
    assnTableName = converter._aliasAssociationkey(tree.key);
    mainTableName = converter._aliasAssociationkey(mainTableName);

    if (assn.through) {
      throughModelTableName = converter._tableizeModelName(assn.through);
      throughTableName = tree.key + '#' + throughModelTableName + '_join';

      throughAssnColName =
          utils.string.getInflection(assn.model, 'constructor', 'singular') + 'Id';

      if (assnName != assn.model) {
        throughAssnColName = assnName + throughAssnColName;
      }

      throughAssnColName = converter._columnizePropertyName(throughAssnColName,
          {useQuotes: false});

      sql = 'LEFT OUTER JOIN ' + this.d(throughModelTableName) + ' ' +
          this.d(throughTableName) + ' ON (' +
          this.d(mainTableName) + '.' + this.d(mainColName) + ' = ' +
          this.d(throughTableName) + '.' + this.d(assnColName) + ')\n';
      sql += 'LEFT OUTER JOIN ' + this.d(assnModelTableName) + ' ' +
          this.d(assnTableName) + ' ON (' +
          this.d(throughTableName) + '.' + this.d(throughAssnColName) + ' = ' +
          this.d(assnTableName) + '.' + this.d(mainColName) + ')\n';
    }
    // Normal
    // Ex., Baz model has named association Foo {model: Bar}
    // LEFT OUTER JOIN bars foos ON (bazes."id" = foos."baz_id")
    else {
      sql = 'LEFT OUTER JOIN ' + this.d(assnModelTableName) + ' ' +
          this.d(assnTableName) + ' ON (' +
          this.d(mainTableName) + '.' + this.d(mainColName) + ' = ' +
          this.d(assnTableName) + '.' + this.d(assnColName) + ')\n';
    }

    if(tree.children) {
      sql += self._createFromStatement(tree.children, assnName, ancestors.concat(parent));
    }

    return sql;
  };

  this._createInsertStatement = function (item, props) {
    var sql = ''
      , modelName = item.type
      , def
      , prop
      , cols = []
      , vals = [];

    // If using string UUID ids
    if (model.config.autoIncrementId) {
      cols.push(this._columnizePropertyName('id'));
      vals.push('DEFAULT');
    }
    else {
      item.id = item.id || utils.string.uuid();
      cols.push(this._columnizePropertyName('id'));
      vals.push(datatypes.string.serialize(item.id, {
        escape: 'sql'
      , useQuotes: true
      }));
    }

    for (var p in props) {
      def = props[p];
      prop = item[p];
      // Use the same definition of NULL as for updates
      prop = this.transformValue(prop, def.datatype);
      if (prop != 'NULL') {
        cols.push(this._columnizePropertyName(p, {
          useQuotes: true
        }));
        vals.push(prop);
      }
    }
    sql += 'INSERT INTO ' + this._tableizeModelName(modelName) + ' ';
    sql += '(' + cols.join(', ') + ')';
    sql += ' VALUES ';
    sql += '(' + vals.join(', ') + ')';
    sql += ';';

    return sql;
  };

  this.load = function (query, callback) {
    var self = this
      , fetch = this.FETCH_METHOD
      , sql = ''
      , cb
      , processor
      , innerProcessor;

    if (query.opts.count) {
      query._sqlMetadata = this._getSqlMetadata(query);
      sql = this._createSelectStatementWithConditions(query);
      this[fetch](sql, function (err, data) {
        if (err) {
          callback(err, null);
        }
        else {
          callback(null, self._getCount(data));
        }
      });
    }
    else {
      if (callback) {
        cb = function (err, res) {
          // If explicitly limited to one, just return the single instance
          // This is also used by the `first` method
          if (res && query.opts.limit == 1) {
            res = res[0];
          }
          callback(null, res);
        };
      }

      // JOINs don't work with limit/offset, have to do an initial query to
      // grab a list of ids to do the includes query with
      if (query.opts.includes && (query.opts.limit || query.opts.offset)) {

        // Save includes, and sort, then strip off current query obj
        var includes = query.opts.includes
          , sort = query.opts.sort;

        delete query.opts.includes;
        query.opts.limitedEagerPrequery = true

        query.opts.sort = {}

        // Only keep top level sorts
        for(var k in sort) {
          if(k.indexOf('.') < 0) {
            query.opts.sort[k] = sort[k]
          }
        }

        // Generate the SQL and metadata
        query._sqlMetadata = this._getSqlMetadata(query);
        sql = this._createSelectStatementWithConditions(query);

        // Generate the actual EQP which will be returned
        processor = new EventedQueryProcessor(query);

        // Do an initial query to get the list of ids that match
        innerProcessor = new EventedQueryProcessor(query, function (err, res) {
          var ids;
          if (err) {
            cb(err, null);
          }

          // Grab the list of ids
          ids = res.map(function (item) {
            return item.id;
          });
          // Strip the limit/offset opts
          delete query.opts.limit;
          delete query.opts.offset;
          delete query.opts.limitedEagerPrequery;

          // Put back the includes
          query.opts.includes = includes;
          // Put back the sort
          query.opts.sort = sort;

          // Create a new query without the filter and with the simple list of ids
          query = new Query(query.model, {id: ids}, query.opts);

          // Attach the new query and callback
          // This method also mutates query, which is why it happens before the next two things
          processor.setQuery(query);

          // Create SQL and metadata again
          query._sqlMetadata = self._getSqlMetadata(query);
          sql = self._createSelectStatementWithConditions(query);

          processor.callback = cb;

          processor.process(self[fetch](sql));
        });
        innerProcessor.process(self[fetch](sql));
        return processor;
      }
      else {
        query._sqlMetadata = this._getSqlMetadata(query);
        sql = this._createSelectStatementWithConditions(query);

        processor = new EventedQueryProcessor(query, cb);
        setTimeout(function () {
          processor.process(self[fetch](sql));
        }, 0);
        return processor;
      }
    }

  };
})());

// Mix in basic conversion methods
utils.mixin(Adapter.prototype, converter);

// Mix in query transformer methods
utils.mixin(Adapter.prototype, sqlTransformer);

EventedQueryProcessor = function (query, callback) {
  this._source = null;
  this._allItems = [];
  this._allItemsHash = {};
  this._lastMainModel = null;
  this._rowEventName = query.model.getAdapter().name == 'mysql' ?
      'result' : 'row';
  this.models = {};
  this.setQuery(query);
  this.callback = callback;
};

util.inherits(EventedQueryProcessor, EventEmitter);

utils.mixin(EventedQueryProcessor.prototype, new (function () {
  this.process = function (source) {

    var self = this
      , scenario = this.query.opts.scenario
      , dependencyList = this.query._sqlMetadata.dependencyList;

    // This serves as a cache for all objects ever instantiated
    this._instantiatedObjects = {};

    // This function caches the properties returned per key to speed up reification
    // Hot path code depends on this stuff being available
    this.keyCache = null;
    this.constructKeyCache = function (row) {
      var index
        , key;

      self.keyCache = {};

      for(var propKey in row) {
        index = propKey.lastIndexOf('#');
        key = propKey.substring(0, index);
        self.keyCache[key] = self.keyCache[key] || [];
        self.keyCache[key].push(propKey.substring(index + 1));
      }
    };

    // These functions take the row object and create new model objects
    // Hot-path code; thus the heavy optimizations
    this.modelMakers = {};
    this.constructModelMakers = function () {
      self.modelMakers = {};

      var makeModelMaker = function (propPrefix, prop) {
        propPrefix = converter._aliasAssociationkey(propPrefix)

        // These only ever have to run once
        var cachePrefix = prop.model + ':'
          , idKey = propPrefix + '#id'
          , propList = self.keyCache[propPrefix]
          , propKeys = propList.map(function (propName) {
              return propPrefix + '#' + propName;
            })
          , isMainModel = prop.parent == null
          , ownerPropPrefix
          , assnKey = null;

        // Figure out in advance how to append this model to its owner
        if(!isMainModel) {
          if (prop.assn.type == 'hasMany') {
            assnKey = utils.string.getInflection(prop.assn.name, 'property', 'plural');
          }
          else {
            assnKey = utils.string.getInflection(prop.assn.name, 'property', 'singular');
          }

          ownerPropPrefix = propPrefix.substring(0, propPrefix.lastIndexOf('#'))
        }


        self.modelMakers[propPrefix] = function (row) {
          var inst
            , params = {}
            , parentInst;

          // Ignore empty records
          if(!row[idKey]) {
            return;
          }

          // Try to be lazy and return a cached object
          var cacheKey = cachePrefix + row[idKey];
          if(self._instantiatedObjects[cacheKey]) {
            inst = self._instantiatedObjects[cacheKey];

            // This is needed for tying together associations later
            params = {id: row[idKey]};
          }
          else {
            for(var i=0, ii=propList.length; i<ii; ++i) {
              params[propList[i]] = row[propKeys[i]];
            }

            inst = new prop.ctor.create(params, {scenario: scenario});
            inst._saved = true;
          }

          if(isMainModel) {
            // If we switched to a new main model
            if (self._lastMainModel != null) {
              if (self._lastMainModel.id !== params.id) {
                // Flush the old one
                if(self.streamable) {
                  self.emit('data', self._lastMainModel);
                }

                self._lastMainModel = inst;

                if (self.callback && !self._allItemsHash[inst.id]) {
                  self._allItems.push(inst);
                  self._allItemsHash[inst.id] = true
                }
              }
            }
            else {
              self._lastMainModel = inst;

              if (self.callback && !self._allItemsHash[inst.id]) {
                self._allItems.push(inst);
                self._allItemsHash[inst.id] = true
              }
            }
          }
          // Assn models
          else {
            // Neat way to get the parent instance
            parentInst = self.modelMakers[ownerPropPrefix](row);

            if(!parentInst) {
              throw new Error('Could not get parent instance using ' + ownerPropPrefix);
            }

            // Multiple assns go on an array
            if(prop.assn.type == 'hasMany') {
              if (parentInst[assnKey]) {
                if (parentInst[assnKey]._ids[params.id]) {
                  return inst;
                }
              }
              else {
                parentInst[assnKey] = [];
                parentInst[assnKey]._ids = {};
              }

              parentInst[assnKey]._ids[params.id] = true;
              parentInst[assnKey].push(inst);
            }
            // Single assns go by themselves
            else {
              parentInst[assnKey] = inst;
            }
          }

          self._instantiatedObjects[cacheKey] = inst;

          return inst;
        };
      };

      for(var propPrefix in dependencyList) {
        makeModelMaker(propPrefix, dependencyList[propPrefix])
      }
    };

    source.on(this._rowEventName, function (row) {
      // Only do this once
      if(!self.keyCache) {
        self.constructKeyCache(row);
        self.constructModelMakers();
      }

      // Then use the premade functions
      for(var key in self.modelMakers) {
        self.modelMakers[key](row);
      }
    });
    source.on('end', function () {
      // If there's a previous item sitting in the buffer, flush it
      if (self._lastMainModel) {
        if(self.streamable) {
          self.emit('data', self._lastMainModel);
        }

        if (self.callback && !self._allItemsHash[self._lastMainModel.id]) {
          self._allItems.push(self._lastMainModel);
          self._allItemsHash[self._lastMainModel.id] = true
        }
      }

      if(!self.streamable) {
        for(var i=0, ii=self._allItems.length; i<ii; ++i) {
          self.emit('data', self._allItems[i]);
        }
      }

      self.emit('end');

      if (self.callback) {
        self.callback(null, self._allItems);
      }

      // Clean up memory
      self._lastMainModel = null;
      self._instantiatedObjects = null;
    });
    source.on('error', function (err) {
      self.emit('error', err);
      if (self.callback) {
        self.callback(err, null);
      }
    });
    this._source = source;

  };

  this.setQuery = function (query) {
    /**
    * If you do an include query without a top level sort on ID,
    * it is not possible to stream the result set because the top level
    * model's rows might be out of order
    */

    var hasDominantTopLevelIdSort = false
      , sortFields
      , idIndex
      , firstNestedSortIndex = -1
      , newSortOptions = {}

    if(query.opts.includes) {
      if(query.opts.sort) {
        sortFields = Object.keys(query.opts.sort);
        idIndex = sortFields.indexOf('id');

        // First the index of the first nested sort attrib
        for(var i=0, ii=sortFields.length; i<ii; ++i) {
          if(sortFields[i].indexOf('.') >= 0) {
            firstNestedSortIndex = i;
            break;
          }
        }

        if(idIndex < 0 || idIndex < firstNestedSortIndex) {
          if(firstNestedSortIndex < 0) {
            sortFields.push('id');
          }
          else {
            sortFields.splice(firstNestedSortIndex, 0, 'id');
          }

          for(var i=0, ii=sortFields.length; i<ii; ++i) {
            if(sortFields[i] == 'id') {
              newSortOptions[sortFields[i]] = 'asc';
            }
            else {
              newSortOptions[sortFields[i]] = query.opts.sort[sortFields[i]];
            }
          }

          query.opts.sort = newSortOptions
          hasDominantTopLevelIdSort = true;
        }
      }
      else {
        query.opts.sort = {id: 'asc'};
        hasDominantTopLevelIdSort = true;
      }
    }

    this.streamable = (!query.opts.includes || hasDominantTopLevelIdSort)
    this.query = query
  }

})());

Adapter.EventedQueryProcessor = EventedQueryProcessor;

module.exports.Adapter = Adapter;
