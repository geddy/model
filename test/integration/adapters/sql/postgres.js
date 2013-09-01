var utils = require('utilities')
  , assert = require('assert')
  , model = require('../../../../lib')
  , Adapter = require('../../../../lib/adapters/sql/postgres').Adapter
  , generator = require('../../../../lib/generators/sql')
  , adapter
  , currentId
  , tests
  , config = require('../../../config')
  , shared = require('../shared')
  , createFixtures
  , deleteFixtures
  , updateItems
  , fixtures = ['Event', 'Person', 'Participation', 'Message', 'Photo']

  // Fixtures
  , Zooby = require('../../../fixtures/zooby').Zooby
  , User = require('../../../fixtures/user').User
  , Profile = require('../../../fixtures/profile').Profile
  , Account = require('../../../fixtures/account').Account
  , Team = require('../../../fixtures/team').Team
  , Membership = require('../../../fixtures/membership').Membership;


fixtures.forEach(function (f) {
  model[f] = require('../../../fixtures/' + f.toLowerCase())[f];
});

createFixtures = function (cb) {
  var relations = fixtures.slice()
    , doIt = function () {
        var relation = relations.shift()
          , items = []
          , letter;
        if (relation) {
          letters = 'abcdefghijklmnopqrst'.split('');
          letters.forEach(function (letter) {
            items.push(model[relation].create({title: letter}));
          });
          model[relation].save(items);
          doIt();
        }
        else {
          cb();
        }
      };
  doIt();
};

deleteFixtures = function (cb) {
  var relations = fixtures.slice()
    , doIt = function () {
        var relation = relations.shift();
        if (relation) {
          model[relation].all({}, function (err, data) {
            var ids = [];
            if (err) { throw err; }
            data.forEach(function (item) {
              ids.push(item.id);
            });
            model[relation].remove({id: ids}, function (err, data) {
              if (err) { throw err; }
              doIt();
            });
          });
        }
        else {
          cb();
        }
      };
  doIt();
};

updateItems = function (coll, cb) {
  var collection = coll.slice()
    , doIt = function () {
        var item = collection.pop();
        if (item) {
          item.save(function (err, data) {
            if (err) { throw err; }
            doIt();
          });
        }
        else {
          cb();
        }
      };
  doIt();
};

tests = {
  'before': function (next) {
    var relations = [
          'Zooby'
        , 'User'
        , 'Profile'
        , 'Account'
        , 'Membership'
        , 'Team'
        ]
        relations = relations.concat(fixtures)
      , models = [];

    adapter = new Adapter(config.postgres);
    adapter.once('connect', function () {
      var sql = '';

      sql += generator.dropTable(relations);
      sql += generator.createTable(relations);

      adapter.exec(sql, function (err, data) {
        if (err) {
          throw err;
        }
        createFixtures(function () {
          deleteFixtures(next);
        });
      });
    });
    adapter.connect();

    model.adapters = {};
    relations.forEach(function (r) {
      model[r].adapter = adapter;
      models.push({
        ctorName: r
      });
    });

    model.registerDefinitions(models);
  }

, 'after': function (next) {
    adapter.once('disconnect', function () {
      next();
    });
    adapter.disconnect();
  }

, 'beforeEach': function (next) {
    createFixtures(next);
  }

, 'afterEach': function (next) {
    deleteFixtures(next);
  }

, 'test create adapter': function () {
    assert.ok(adapter instanceof Adapter);
  }

, 'test exec': function (next) {
    adapter.exec('CREATE TABLE foo (bar varchar(256) ); DROP TABLE foo;',
        function (err, data) {
      if (err) {
        throw err;
      }
      next();
    });
  }

};

for (var p in shared) {
  tests[p + ' (Postgres)'] = shared[p];
}

var eagerAssnTests = {

  'test includes eager-fetch of hasMany association': function (next) {
    User.all({}, {includes: ['kids', 'avatarProfiles']}, function (err, data) {
      data.forEach(function (u) {
        if (u.id == currentId) {
          assert.equal(2, u.avatarProfiles.length);
        }
      });
      next();
    });
  }

, 'test includes eager-fetch of named hasMany/through association': function (next) {
    model.Event.all(function (err, data) {
      if (err) { throw err; }
      var ev = data[0];
      model.Person.all(function (err, data) {
        var people = data;
        people.forEach(function (person) {
          ev.addParticipant(person);
        });
        ev.save(function (err, data) {
          if (err) { throw err; }
          model.Event.first({id: ev.id}, {includes: 'participant'}, function (err, data) {
            if (err) { throw err; }
            assert.equal(20, data.participants.length);
            next();
          });
        });
      });
    });
  }

, 'test includes eager-fetch of multiple hasMany associations': function (next) {
    model.Event.all(function (err, data) {
      if (err) { throw err; }
      var ev = data[0];
      model.Person.all(function (err, data) {
        var people = data;
        people.forEach(function (person) {
          ev.addParticipant(person);
          ev.addAdmin(person);
        });
        ev.save(function (err, data) {
          if (err) { throw err; }
          model.Event.first({id: ev.id}, {includes: ['participant',
              'admin']}, function (err, data) {
            assert.equal(20, data.participants.length);
            assert.equal(20, data.admins.length);
            next();
          });
        });
      });
    });
  }

, 'test includes eager-fetch of belongsTo association': function (next) {
    model.Event.all(function (err, data) {
      if (err) { throw err; }
      var ev = data[0];
      model.Photo.all(function (err, data) {
        if (err) { throw err; }
        data.forEach(function (p) {
          p.setEvent(ev);
        });
        updateItems(data, function () {
          model.Photo.all({}, {includes: ['event']}, function (err, data) {
            if (err) { throw err; }
            var every = data.every(function (p) {
              return !!p.event;
            });
            assert.ok(every);
            next();
          });
        });
      });
    });
  }

, 'test includes eager-fetch of hasMany with association sort': function (next) {
    model.Event.all(function (err, data) {
      if (err) { throw err; }
      var evA = data[0]
        , evB = data[1];
      model.Photo.all(function (err, data) {
        var incr = 0;
        if (err) { throw err; }
        data.forEach(function (p) {
          // Half to A, half to B
          if (!!(incr % 2)) {
            p.setEvent(evA);
          }
          else {
            p.setEvent(evB);
          }
          incr++;
        });
        updateItems(data, function () {
          model.Event.all({id: [evA.id, evB.id]},
              {includes: ['photos'], sort: {'title': 'desc',
              'photo.title': 'asc'}}, function (err, data) {
            var foundOutOfOrderItem = function (item, index) {
                  var nextItem = this[index + 1];
                  if (nextItem && (item.title.charCodeAt(0) >
                      nextItem.title.charCodeAt(0))) {
                    return true;
                  }
                };
            assert.equal('b', data[0].title);
            assert.equal('a', data[1].title);
            assert.ok(!(data[0].photos.some(foundOutOfOrderItem, data[0].photos)));
            assert.ok(!(data[1].photos.some(foundOutOfOrderItem, data[1].photos)));
            next();
          });
        });
      });
    });
  }

, 'test includes eager-fetch of hasMany with `first` lookup for owner obj': function (next) {
    model.Event.all(function (err, data) {
      if (err) { throw err; }
      var ev = data[0];
      model.Person.all(function (err, data) {
        if (err) { throw err; }
        data.forEach(function (p) {
          ev.addAdmin(p);
        });
        ev.save(function (err, data) {
          if (err) { throw err; }
          model.Event.first({id: ev.id}, {includes: 'admins'}, function (err, data) {
            if (err) { throw err; }
            assert.equal(20, data.admins.length);
            next();
          });
        });
      });
    });
  }

, 'test includes eager-fetch of hasMany/through association': function (next) {
    model.Event.all(function (err, data) {
      if (err) { throw err; }
      var ev = data[0];
      model.Person.all(function (err, data) {
        var people = data;
        people.forEach(function (person) {
          ev.addParticipant(person);
        });
        ev.save(function (err, data) {
          if (err) { throw err; }
          model.Event.first({id: ev.id}, {includes: ['participant',
              'admin']}, function (err, data) {
            assert.equal(20, data.participants.length);
            next();
          });
        });
      });
    });
  }

, 'test hasMany/through with auto-save for owned-object side': function (next) {
    model.Event.all(function (err, data) {
      if (err) { throw err; }
      var ev = data[0];
      ev.addPhoto(model.Photo.create({
        title: 'u'
      }));
      ev.save(function (err, data) {
        if (err) { throw err; }
        model.Event.first({id: ev.id}, {includes: 'photos'},
            function (err, data) {
          assert.equal(1, data.photos.length);
          assert.equal('u', data.photos[0].title);
          next();
        });
      });
    });
  }

};

for (var p in eagerAssnTests) {
  tests[p + ' (Postgres)'] = eagerAssnTests[p];
}

module.exports = tests;
