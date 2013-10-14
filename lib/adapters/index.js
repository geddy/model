
var adapters
  , path = require('path')
  , _aliases
  , _paths;

_aliases = {
  postgres: 'postgres'
, pg: 'postgres'
, postgresql: 'postgres'
, riak: 'riak'
, mongo: 'mongo'
, memory: 'memory'
, filesystem: 'filesystem'
, level: 'level'
};

_paths = {
  postgres: 'sql/postgres'
, riak: 'riak/index'
, mongo: 'mongo/index'
, memory: 'memory/index'
, filesystem: 'filesystem/index'
, level: 'level/index'
};

adapters = new (function () {

  this.getAdapterInfo = function (adapter) {
    var canonical = _aliases[adapter];
    if (!canonical) {
      return null;
    }
    else {
      return {
        name: canonical
      , filePath: _paths[canonical]
      };
    }
  };

})();

module.exports = adapters;
