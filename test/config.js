(function () {
  var userOpts
  , fs = require('fs')
  , utils = require('utilities')
  , path = require('path')
  , userOptsFile = path.join(__dirname, 'db')
  , existsSync
  , config = {
      mongo: {
        dbname:   process.env.MONGO_DATABASE    || 'model_test'
      }
    , postgres: {
        user:     process.env.POSTGRES_USER     || 'postgres'
      , database: process.env.POSTGRES_DATABASE || 'model_test'
      , host:     process.env.POSTGRES_HOST     || '127.0.0.1'
      }
    , riak: {
        protocol: 'http'
      , host: process.env.RIAK_HOST || 'localhost'
      , port: process.env.RIAK_PORT || 8098
      , testInterval: 3000
      }
    , level: {
        db: process.env.LEVEL_DATABASE || '/tmp/foo'
      }
    };

  try {
    userOpts = require(userOptsFile);
    utils.object.merge(config, userOpts);
  }
  catch (e) {
    //Support node 0.6
    if(typeof fs.existsSync != 'function') {
      existsSync = path.exists;
    }
    else {
      existsSync = fs.existsSync;
    }
    
    // Check if JSON parsing failed
    if(existsSync(userOptsFile)) {
      throw new Error("Could not parse user options, check if your file is valid JSON");
    }
  }
  
  module.exports = config;
}());
