var assert = require('assert')
  , model = require('../../../../lib')
  , helpers = require('../helpers')
  , tests;

tests = {

  'test includes eager-fetch of hasMany association': function (next) {
    model.Photo.all(function (err, data) {
      if (err) { throw err; }
      var photos = data;
      model.Event.all(function (err, data) {
        if (err) { throw err; }
        var ev = data[0];
        photos.forEach(function (p) {
          ev.addPhoto(p);
        });
        ev.save(function (err, data) {
          if (err) { throw err; }
          model.Event.first({id: ev.id}, {includes: 'photos'}, function (err, data) {
            if (err) { throw err; }
            assert.equal(20, data.photos.length);
            next();
          });
        });
      });
    });
  }

, 'test includes eager-fetch of named hasMany/through association': function (next) {
    model.Event.all(function (err, data) {
      if (err) { throw err; }
      var ev = data[0];
      model.Person.all(function (err, data) {
        if (err) { throw err; }
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
        if (err) { throw err; }
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
        helpers.updateItems(data, function () {
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
    model.Event.all({}, {sort: 'title'}, function (err, data) {
      if (err) { throw err; }
      var evA = data[0]
        , evB = data[1];
      model.Photo.all(function (err, data) {
        var incr = 0;
        if (err) { throw err; }
        data.forEach(function (p) {
          // Half of associated events to A, half to B
          if (!!(incr % 2)) {
            p.setEvent(evA);
          }
          else {
            p.setEvent(evB);
          }
          incr++;
        });
        helpers.updateItems(data, function () {
          model.Event.all({id: [evA.id, evB.id]},
              {includes: ['photos'], sort: {'title': 'desc',
              'photo.title': 'asc'}}, function (err, data) {
            assert.equal('b', data[0].title);
            assert.equal('a', data[1].title);
            assert.ok(!(data[0].photos.some(helpers.foundOutOfOrderItemAscending,
                data[0].photos)));
            assert.ok(!(data[1].photos.some(helpers.foundOutOfOrderItemAscending,
                data[1].photos)));
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

module.exports = tests;

