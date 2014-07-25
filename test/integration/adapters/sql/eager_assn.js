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
        ev.save(function (err) {
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

, 'test includes eager-fetch of reflexive hasMany association': function (next) {
    model.Person.all(function (err, data) {
      if (err) { throw err; }
      var children = data.slice()
        , person = children.shift();
      children.forEach(function (c) {
        person.addChild(c);
      });
      person.save(function (err) {
        if (err) { throw err; }
        model.Person.first({id: person.id}, {includes: 'children'}, function (err, data) {
          if (err) { throw err; }
          assert.equal(19, data.children.length);
          next();
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
        ev.save(function (err) {
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
        ev.save(function (err) {
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
        ev.save(function (err) {
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
        , firstEvent = events[0]
        , incr = 0
        , people
        , associate = function () {
            var ev;
            // Add a participant and admin to every event
            if ((ev = events.shift())) {
              ev.addParticipant(people[incr]);
              ev.addAdmin(people[incr]);
              incr++;
              ev.save(function (err) {
                if (err) { throw err; }
                associate();
              });
            }
            else {
              model.Event.all({}, {includes: ['participant',
                  'admin', 'photo']}, function (err, data) {
                if (err) { throw err; }
                var events = data;
                events.forEach(function (ev) {
                  assert.equal(1, ev.participants.length);
                  assert.equal(1, ev.admins.length);

                  // Can't guarantee order without a sort,
                  // was previously events[0]
                  if(ev.id == firstEvent.id) {
                    assert.equal(20, ev.photos.length);
                  }
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
          firstEvent.addPhoto(photo);
        });
        model.Person.all(function (err, data) {
          if (err) { throw err; }
          people = data;
          associate();
        });
      });

    });
  }

, 'test includes, using an invalid association name throws the proper error': function () {
    assert.throws(
      function () {
        model.Person.all({}, { includes: 'this_doesnt_exist' }, function () {

        });
      },
      /Could\snot\sfind\sthe\sassociated\smodel/
    );
  }

, 'test includes, querying on an association with a limit clause throws the proper error': function () {
    assert.throws(
      function () {
        model.Person.all({'friends.id': 1}, { includes: 'friends', limit: 1 }, function () {

        });
      },
      /It\sis\snot\spossible\sto\squery\son\san\sassociation\swhen\sthere\sis\sa\slimit\sclause/
    );
  }

, 'test includes, querying on an association with an implicit limit clause throws the proper error': function () {
    assert.throws(
      function () {
        model.Person.first({'friends.id': 1}, { includes: 'friends' }, function () {

        });
      },
      /It\sis\snot\spossible\sto\squery\son\san\sassociation\swhen\sthere\sis\sa\slimit\sclause/
    );
  }

, 'test named, reflexive, hasMany/through with properties on the join-model': function (next) {
    model.Person.all({}, {sort: 'title'}, function (err, data) {
      if (err) { throw err; }
      var friends = data.slice()
        , person = friends.shift();
      // The first guy is friends with all other 19 guys
      // (He's their friender, they're his friends)
      // First guy's title is 'a', friends are 'b' through 't'
      friends.forEach(function (f) {
        person.addFriend(f);
      });
      person.save(function (err) {
        var query
          , opts;
        if (err) { throw err; }
        query = {
          frienderPersonId: person.id
        };
        opts = {
          includes: ['friends']
        };
        model.Friendship.all(query, opts, function (err, data) {
          if (err) { throw err; }
          var approvals = []
            , friendTitles = {
                b: true
              , c: true
              , d: true
              };
          data.forEach(function (f) {
            if (friendTitles[f.friend.title]) {
              f.approved = true;
              approvals.push(f);
            }
          });
          helpers.updateItems(approvals, function () {
            var query
              , opts;
            query = {
              frienderPersonId: person.id
            , approved: true
            };
            opts = {
              includes: ['friends']
            };
            model.Friendship.all(query, opts, function (err, data) {
              assert.equal(3, data.length);
              data.forEach(function (f) {
                assert.ok(friendTitles[f.friend.title]);
              });
              next();
            });
          });
        });
      });
    });
  }


, 'test includes eager-fetch of belongsTo association': function (next) {
    model.Schedule.all(function (err, schedules) {
      if (err) { throw err; }
      model.Event.all({}, {sort: {id: 'desc'}}, function (err, events) {
        if (err) { throw err; }
        for (var i = 0, ii = events.length; i < ii; i++) {
          schedules[i].setEvent(events[i]);
        }
        helpers.updateItems(schedules, function (err) {
          if (err) { throw err; }
          model.Schedule.all({}, {includes: ['event'], sort: {'event.id': 'desc'}}, function (err, data) {
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
              sort: {'editors.id': 'desc'}}, function (err, data) {
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
          if (incr % 2 === 0) {
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
              'photos.title': 'asc'}}, function (err, data) {
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
        ev.save(function (err) {
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
        ev.save(function (err) {
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

, 'test includes eager-fetch of two-word assocation name': function (next) {
    model.Schedule.all(function (err, data) {
      if (err) { throw err; }
      var sc = data[0];
      model.FunActivity.all(function (err, data) {
        var activities = data;
        activities.forEach(function (ac) {
          sc.addFunActivity(ac);
        });
        sc.save(function (err) {
          if (err) { throw err; }
          model.Schedule.first({id: sc.id}, {includes: 'funActivities'},
              function (err, data) {
            assert.equal(20, data.funActivities.length);
            next();
          });
        });
      });
    });
  }

, 'test includes eager-fetch querying on association': function (next) {
    model.Schedule.all(function (err, data) {
      if (err) { throw err; }
      var sc = data[0];
      model.FunActivity.all(function (err, data) {
        var activities = data;
        activities.forEach(function (ac) {
          sc.addFunActivity(ac);
        });
        sc.save(function (err) {
          if (err) { throw err; }
          global.debug = true
          model.Schedule.all({'funActivities.id': activities[0].id}, {includes: 'funActivities'},
              function (err, data) {
          global.debug = false
            assert.equal(1, data.length);
            assert.equal(sc.id, data[0].id);
            next();
          });
        });
      });
    });
  }

, 'test includes eager-fetch of hasMany with array of ids': function (next) {
    model.Schedule.all(function (err, schedules) {
      if (err) { throw err; }
      // Grab the first five items
      var scheduleList = schedules.slice(0, 5);
      model.FunActivity.all({}, {sort: {id: 'desc'}}, function (err, activities) {
        if (err) { throw err; }
        // Give each schedule item four associated FunActivities
        var interval = 4
          , start = 0
          , end = 4;
        scheduleList.forEach(function (schedule) {
          activities.slice(start, end).forEach(function (activity) {
            schedule.addFunActivity(activity);
          });
          start += interval;
          end += interval;
        });
        helpers.updateItems(scheduleList, function (err) {
          if (err) { throw err; }
          // Grab a few ids
          var ids = scheduleList.map(function (schedule) {
            return schedule.id;
          });
          model.Schedule.all({id: ids}, {includes: 'funActivities'},
              function (err, data) {
            var scheduleIds = {}
              , activityIds = {};
            if (err) { throw err; }
            // Should be five results
            assert.equal(5, data.length);
            // No schedule id should show up more than once
            data.forEach(function (d) {
              assert.ok(!scheduleIds[d.id]);
              scheduleIds[d.id] = true;
              // Should have four associated activities each
              assert.equal(4, d.funActivities.length);
              d.funActivities.forEach(function (a) {
                // No activity id should show up more than once
                assert.ok(!activityIds[a.id]);
                activityIds[a.id] = true;
              });
            });
            next();
          });
        });
      });
    });
  }

, 'test includes eager-fetch of hasMany with array of ids and limit': function (next) {
    model.Schedule.all(function (err, schedules) {
      if (err) { throw err; }
      // Grab the first five items
      var scheduleList = schedules.slice(0, 5);
      model.FunActivity.all({}, {sort: {id: 'desc'}}, function (err, activities) {
        if (err) { throw err; }
        // Give each schedule item four associated FunActivities
        var interval = 4
          , start = 0
          , end = 4;
        scheduleList.forEach(function (schedule) {
          activities.slice(start, end).forEach(function (activity) {
            schedule.addFunActivity(activity);
          });
          start += interval;
          end += interval;
        });
        helpers.updateItems(scheduleList, function (err) {
          if (err) { throw err; }

          // Grab a few ids
          var ids = scheduleList.map(function (schedule) {
                return schedule.id;
              })
            , results = []
            , processor = model.Schedule.all({id: ids}, {
                includes: 'funActivities',
                limit: 4,
                sort: ['createdAt', 'FunActivities.createdAt']
              })

          processor.on('data', function (model) { results.push(model) })
          processor.on('end', function () {
            assert.equal(4, results.length);
            next();
          })
        });
      });
    });
  }

};

module.exports = tests;

