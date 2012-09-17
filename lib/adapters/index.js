
var adapters
  , path = require('path')
  , _aliases
  , _paths;

_aliases = {
  postgres: 'postgres'
, pg: 'postgres'
, postgresql: 'postgres'
, riak: 'riak'
, memory: 'memory'
};

_paths = {
  postgres: 'sql/postgres'
, riak: 'riak/index'
, memory: 'memory/index'
};

adapters = new (function () {

  this.getAdapterInfo = function (adapter) {
    var canonical = _aliases[adapter];
    return {
      name: canonical
    , filePath: _paths[canonical]
    };
  };

})();

module.exports = adapters;
