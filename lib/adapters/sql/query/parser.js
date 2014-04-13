/**
* This used to be what was called "SQL Meta Data"
* That method was real messy when applied to nested associations
* This implementation neatens things up, deduplicates code,
* and runs faster.
*/

var model = require('../../../index')
  , Parser;

Parser = (new function () {
  /**
  * _parseQuery
  *
  * Given a query object, returns a dependency tree and dependency list
  */
  this._parseQuery = function (query) {
    var dependencyTree = this._getDependencies(query)
      , dependencyList = this._flattenDependencies(dependencyTree)
      , mainKey = Object.keys(dependencyTree)[0]
      , parsed;

    parsed = {
      mainKey: mainKey
    , mainTable: dependencyTree[mainKey].table
    , dependencyTree: dependencyTree
    , dependencyList: dependencyList
    };

    return parsed;
  };

  // Alias
  this._getSqlMetadata = this._parseQuery;

  /**
  * _getDependencies
  *
  * Given an "included" option that's a string, array, or object,
  * wrangles it into an structure that obviously dictates how
  * the query should be carried out
  *
  * EXAMPLES:
  * IN: Event.all({include: 'participants'})
  * OUT: {
  *   event: {
  *     model: 'Event'
  *     ctor: function () {}
  *     children: [
  *       {
  *         model: 'Person'
  *       , ctor: function () {}
  *       , assn: { type: 'through', name: 'participants', model: 'Person' }
  *       , key: 'event#participants'
  *       }
  *     ]
  *   }
  * }
  */
  this._getDependencies = function (query) {
    var self = this
      , tree = {}
      , parseDependencies;

    /*
    * The main table is always included. This sets up the basic structure
    * that the recursive helper expects.
    */
    tree[query.model.modelName] = {
      model: query.model.modelName
    , table: self._tableizeModelName(query.model.modelName)
    , ctor: model[query.model.modelName]
    , key: query.model.modelName
    };

    /*
    * Recursive helper function
    * includes - The string/arr/obj to parse
    * parent - The immediate parent of the current association
    * ancestors - The prefix to use
    */
    parseDependencies = function (includes, parent, ancestors) {
      var tempTableName
        , tempKey
        , assn
        , prependKey = parent.assn ? parent.assn : parent.model;

      switch (typeof includes) {
        case 'string':
          assn = model.getAssociation(parent.model, includes);
          tempTableName = self._tableizeModelName(includes);

          if(!assn) {
            throw new Error('Could not find the associated model');
          }

          return [{
            model: assn.model
          , table: tempTableName
          , ctor: model[assn.model] || null
          , assn: assn
          , key: ancestors.concat(prependKey, includes).join('#')
          }];

        case 'object':
          var newAssns = [];

          // If we got an array, just run recursively on each item
          if(Array.isArray(includes)) {
            for (var i=0, ii=includes.length; i<ii; ++i) {
              newAssns = newAssns.concat(parseDependencies(includes[i], parent, ancestors));
            }
            return newAssns;
          }

          // If we got an object, then the key is one level down,
          // and the value is two levels down
          // It's like this:
          // {person: {events: 'photos'}}
          // parent -> key -> includes[key]
          // Person -> Events -> Photos
          for (var k in includes) {
            // This is the first level
            assn = model.getAssociation(parent.model, k);
            tempTableName = self._tableizeModelName(k);
            tempKey = ancestors.concat(prependKey, k).join('#')
            newAssns.push ({
              model: assn.model
            , table: tempTableName
            , ctor: model[assn.model] || null
            , assn: assn
            , key: tempKey
              // This is the second level
            , children: parseDependencies(includes[k], {model: assn.model, assn: k}, ancestors.concat(prependKey))
            });
          }

          return newAssns;
      }
    };

    // If an includes option was given, recursively try to parse it
    if (query.opts.includes) {
      tree[query.model.modelName].children = parseDependencies(query.opts.includes, {model: query.model.modelName, assn: null}, []);
    }

    return tree;
  };

  /**
  * Flattens a dependency tree
  *
  * Will return something like:
  *
  * {
  *   'person': {}
  *   'person#events': {}
  *   'person#events#photo': {}
  * }
  *
  * Where the values are the nodes from the dependency tree,
  * missing the .key and .children fields, obviously.
  *
  */
  this._flattenDependencies = function (tree) {
    var flattened = {}
      , flattenIncludes;

    flattenIncludes = function (node, parent) {
      for(var key in node) {
        flattened[node[key].key] = {
          model: node[key].model
        , table: node[key].table
        , ctor: node[key].ctor
        , assn: node[key].assn
        , parent: parent
        };

        if (node[key].children != null) {
          flattenIncludes(node[key].children, node[key].model);
        }
      }
    };

    flattenIncludes(tree, null);

    return flattened;
  };

}());

module.exports = Parser;
