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

, 'test includes eager-fetch of named hasMany/through association, join-model in results': function (next) {
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
          model.Event.first({id: ev.id}, {includes: ['participation', 'participant']}, function (err, data) {
            if (err) { throw err; }
            assert.equal(20, data.participations.length);
            assert.equal(20, data.participants.length);
            next();
          });
        });
      });
    });
  }

, 'test `first`, includes eager-fetch of multiple hasMany associations': function (next) {
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

, 'test `all`, includes eager-fetch of multiple hasMany associations': function (next) {
    model.Event.all(function (err, data) {
      if (err) { throw err; }
      var events = data
        , incr = 0
        , people
        , ids = []
        , associate = function () {
            var ev;
            // Add a participant and admin to every event
            if ((ev = events.shift())) {
              ev.addParticipant(people[incr]);
              ev.addAdmin(people[incr]);
              incr++;
              ev.save(function (err, data) {
                if (err) { throw err; }
                associate();
              });
            }
            else {
              var q = model.Event.all({}, {includes: ['participant',
                  'admin', 'photo']}, function (err, data) {
                if (err) { throw err; }
                var events = data;
                assert.equal(20, events[0].photos.length);
                events.forEach(function (ev) {
                  assert.equal(1, ev.participants.length);
                  assert.equal(1, ev.admins.length);
                });
                next();
              });
            }
          };
      model.Photo.all(function (err, data) {
        if (err) { throw err; }
        var photos = data;
        // Add a bunch of photos to the first event
        photos.forEach(function (photo) {
          events[0].addPhoto(photo);
        });
        model.Person.all(function (err, data) {
          if (err) { throw err; }
          people = data;
          associate();
        });
      });

    });
  }

, 'test named hasMany/through with same model (reflexive association)': function (next) {
    model.Person.all(function (err, data) {
      if (err) { throw err; }
      var friends = data.slice()
        , person = friends.shift();
      // The first guy is friends with all other 19 guys
      // (He's their friender, they're his friends)
      friends.forEach(function (f) {
        person.addFriend(f);
      });
      person.save(function (err, data) {
        if (err) { throw err; }
        // Check both sides of the association
        model.Person.all({id: person.id}, {includes: ['friend']},
            function (err, data) {
          if (err) { throw err; }
          // Does he have all 19 friends?
          assert.equal(19, data[0].friends.length);
          model.Person.all({id: {ne: person.id}},
              {includes: ['friender']}, function (err, data) {
            // Do all 19 of them has him as a friender?
            data.forEach(function (p) {
              assert.equal(person.id, p.frienders[0].id);
            });
            next();
          });
        });
      });
    });
  }

, 'test includes eager-fetch of belongsTo association': function (next) {
    model.Schedule.all(function (err, schedules) {
      if (err) { throw err; }
      model.Event.all(function (err, events) {
        if (err) { throw err; }
        for (var i = 0, ii = events.length; i < ii; i++) {
          schedules[i].setEvent(events[i]);
        }
        helpers.updateItems(schedules, function (err) {
          if (err) { throw err; }
          model.Schedule.all({}, {includes: ['event']}, function (err, data) {
            if (err) { throw err; }
            for (var i = 0, ii = events.length; i < ii; i++) {
              assert.equal(events[i].id, data[i].event.id);
            }
            next();
          });
        });
      });
    });
  }

, 'test includes eager-fetch of named belongsTo association': function (next) {
    model.Schedule.all(function (err, schedules) {
      if (err) { throw err; }
      model.Person.all({}, {sort: {id: 'desc'}}, function (err, people) {
        if (err) { throw err; }
        for (var i = 0, ii = people.length; i < ii; i++) {
          schedules[i].setEditor(people[i]);
        }
        helpers.updateItems(schedules, function (err) {
          if (err) { throw err; }
          model.Schedule.all({}, {includes: ['editors'],
              sort: {'editor.id': 'desc'}}, function (err, data) {
            if (err) { throw err; }
            for (var i = 0, ii = people.length; i < ii; i++) {
              assert.equal(people[i].id, data[i].editor.id);
            }
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

