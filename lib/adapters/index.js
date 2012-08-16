
var adapters
  , path = require('path')
  , _aliases
  , _paths;

_aliases = {
  postgres: 'postgres'
, pg: 'postgres'
, postgresql: 'postgres'
};

_paths = {
  postgres: 'sql/postgres'
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
