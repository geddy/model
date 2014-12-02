var utils = require('utilities')
  , restify = require('restify')
  , model = require('../../../../lib')
  , helpers = require('.././helpers')
  , MemoryAdapter = require('../../../../lib/adapters/memory').Adapter
  , adapter
  , server
  , shared = require('../shared');

function init()
{
  var relations = helpers.fixtures.slice()
    , models = [];
  adapter = new MemoryAdapter();

  relations.forEach(function (r) {
    models.push({
      ctorName: r.ctorName
      , ctor: r.ctor
    });
  });
  model.clearDefinitions(models);
  model.registerDefinitions(models);
  model.adapters = {};
  relations.forEach(function (r) {
    model[r.ctorName].adapter = adapter;
  });

  // create mock server
  server = restify.createServer();
  server.use(restify.acceptParser(server.acceptable));
  server.use(restify.queryParser());
  server.use(restify.bodyParser());
  server.use(logRequest);

  server.pre(function (req, res, next) {
    // strip file format suffixes
    req.url = req.url.replace(/\.json/,'');

    return next();
  });

  server.get('/beforeEach', function(req, resp, next) {
    shared.beforeEach(function() {
      res.send({});
      next()
    });
  });

  server.get('/afterEach', function(req, resp, next) {
    shared.afterEach(function() {
      res.send({});
      next();
    });
  });

  // GET all
  server.get('/:resourceType', function (req, res, next) {
    getAll(req.params.resourceType, req.params.query, getValidOptions(req.params), function(err, resp) {
      res.send(resp);

      return next();
    });
  });

  // GET first by id
  server.get('/:resourceType/:id', function (req, res, next) {
    getFirst(req.params.resourceType, req.params.id, function(err, resp) {
      res.send(resp);

      return next();
    });
  });

  // update
  server.put('/:resourceType/:id', function (req, res, next) {
    updateFirst(req.params.resourceType, req.params.id, req.params, function(err, resp) {
      res.send(resp);

      return next();
    });
  });

  // remove
  server.del('/:resourceType', function(req, res, next) {
    removeAll(req.params.resourceType, req.params.query, getValidOptions(req.params), function(err, resp) {
      res.send(resp);

      return next();
    });
  });

  server.del('/:resourceType/:id', function(req, res, next) {
    removeFirst(req.params.resourceType, req.params.id, req.params, function(err, resp) {
      res.send(resp);

      return next();
    });
  });

  // Browser compliant post: Update/Remove first by id
  server.post('/:resourceType/:id', function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    if (req.params._method === 'PUT') {
      updateFirst(req.params.resourceType, req.params.id, req.params, function(err, resp) {
        res.send(resp);

        return next();
      });
    }
    else if(req.params._method === 'DELETE') {
      removeFirst(req.params.resourceType, req.params.id, req.params, function(err, resp) {
        res.send(resp);

        return next();
      });
    }
    else {
      throw new Error('method must be PUT or DELETE.');
      return next();
    }
  });

  // insert new
  server.post('/:resourceType', function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    create(req.params.resourceType, req.params, function(err, resp) {
      res.send(resp);

      return next();
    });
  });

  server.listen(3000, function() {
    console.log('listening at localhost:3000');
  });
}

function logRequest(req, resp, next) {
  console.log((new Date()) + ' - ' + req.method + ': ' + req.url);
  if (req.route) {
    console.log('\troute: ' + req.route.path);
  }
  if (next) {
    return next();
  }
  else {
    return;
  }
}

function getAll(resourceType, query, opts, cb) {
  // normalize resourceType
  resourceType = utils.string.getInflection(resourceType, 'constructor', 'singular');

  if (model[resourceType]) {
    var res = {};
    model[resourceType].all(query || {}, opts || {}, function (err, all) {
      if (err) {
        throw err;
        return;
      }

      if (opts && opts.limit === 1) {
        all = [all];
      }

      var pluralName = utils.string.getInflection(resourceType, 'property', 'plural');

      res[pluralName] = all || [];
      res.query = query;
      res.count = (all) ? all.length : 0;

      cb(null, res);
    });
  }
  else {
    var err = new Error('Resource "' + resourceType + '" does not exist.', 404)
    throw err;
  }
}

function getFirst(resourceType, query, cb)
{
  // normalize resourceType
  resourceType = utils.string.getInflection(resourceType, 'constructor', 'singular');

  if (model[resourceType]) {
    var res = {};
    model[resourceType].first(query, function(err, first) {
      if (err) {
        throw err;
        return;
      }

      var all = [first];

      var pluralName = utils.string.getInflection(resourceType, 'property', 'plural');

      res[pluralName] = all || [];
      res.count = (all) ? all.length : 0;

      cb(null, res);
    });
  }
  else {
    var err = new Error('Resource "' + resourceType + '" does not exist.', 404);
    cb(err, {
      error: getErrorObject(err)
    });
  }
}

function updateFirst(resourceType, query, data, cb)
{
  // normalize resourceType
  resourceType = utils.string.getInflection(resourceType, 'constructor', 'singular');
  var propType = utils.string.getInflection(resourceType, 'property', 'singular');

  if (model[resourceType]) {
    var res = {};
    model[resourceType].first(query, function(err, first) {
      if (err) {
        throw err;
        return;
      }

      if (first) {
        first.updateProperties(data[propType]);

        if (first.isValid()) {
          first.save(onSaved);
        }
        else {
          first.save(onSaved);
        }
      }
    });
  }
  else {
    var err = new Error('Resource "' + resourceType + '" does not exist.', 404);
    throw err;
  }

  function onSaved(err, first) {
    if (err) {
      throw err;
      return;
    }
    else {
      var resp = {};

      var pluralName = utils.string.getInflection(resourceType, 'property', 'plural');

      resp[pluralName] = [first];
      cb(null, resp);
    }
  }
}

function removeFirst(resourceType, id, params, cb)
{
  // normalize resourceType
  resourceType = utils.string.getInflection(resourceType, 'constructor', 'singular');

  if (model[resourceType]) {
    var res = {};
    model[resourceType].remove(id, function(err, data) {
      if (err) {
        throw err;
        return;
      }

      cb(null, {
        success: true,
        data: data
      });
    });
  }
  else {
    var err = new Error('Resource "' + resourceType + '" does not exist.', 404);
    throw err;
  }
}

function removeAll(resourceType, query, opts, cb)
{
  // if no query is given do nothing
  if (!query) {
    cb(null, { success: true });
    return;
  }

  // normalize resourceType
  resourceType = utils.string.getInflection(resourceType, 'constructor', 'singular');

  if (model[resourceType]) {
    var res = {};
    model[resourceType].remove(query, opts, function(err, data) {
      if (err) {
        throw err;
        return;
      }

      cb(null, {
        success: true,
        data: data
      });
    });
  }
  else {
    var err = new Error('Resource "' + resourceType + '" does not exist.', 404);
    throw err;
  }
}

function create(resourceType, params, cb)
{
  // normalize resourceType
  resourceType = utils.string.getInflection(resourceType, 'constructor', 'singular');
  var propType = utils.string.getInflection(resourceType, 'property', 'singular');

  if (model[resourceType]) {
    var resource = model[resourceType].create(params[propType]);

    if (resource.isValid()) {
      resource.save(function(err, data) {
        if (err) {
          throw err;
          return;
        }
        else {
          var resp = {};
          var pluralName = utils.string.getInflection(resourceType, 'property', 'plural');
          resp[pluralName] = [resource.toJSON()];
          cb(null, resp);
        }
      });
    }
    else {
      var resp = {};
      var pluralName = utils.string.getInflection(resourceType, 'property', 'plural');
      resp[pluralName] = [resource.toJSON()];
      cb(null, resp);
    }
  }
  else {
    var err = new Error('Resource "' + resourceType + '" does not exist.', 404);
    throw err;
  }
}

function getErrorObject(error) {
  console.error(error);

  return  {
    message: error.message,
    stack: error.stack,
    code: error.code
  }
}

function getValidOptions(params)
{
  var opts = {};

  if (params.limit) opts.limit = parseInt(params.limit);
  if (params.offset) opts.offset = parseInt(params.offset);
  if (params.page && params.per) {
    opts.limit = parseInt(params.per);
    opts.offset = (parseInt(params.page) - 1) * opts.limit;
  }
  if (params.sort) opts.sort = params.sort;
  if (params.nocase) opts.nocase = (params.nocase === true || params.nocase === 'true' || params.nocase === '1');
  return opts;
}

init();