var assert = require('assert')
  , model = require('../../../../lib')
  , helpers = require('../helpers')
  , tests;

tests = {
  'test `first`, includes eager-fetch of nested hasMany/through > hasMany relationship': function (next) {
    model.Event.first({}, function (err, data) {
      if (err) { throw err; }
      var ev = data;
      model.Person.first({}, function (err, data) {
        if (err) { throw err; }
        var person = data;
        model.Photo.first({}, function (err, data) {
          if (err) { throw err; }
          var photo = data;
          ev.addPhoto(photo);
          ev.addParticipant(person);
          ev.save(function (err) {
            if (err) { throw err; }
            // At this point we have a person > participation > event > photo relationship set up
            model.Person.all({id: person.id}, {includes: {events: 'photos'}}, function (err, data) {
              if(err) { throw err; }
              assert.ok(data);
              assert.equal(data.length, 1);
              assert.equal(data[0].id, person.id);
              assert.equal(data[0].events.length, 1);
              assert.equal(data[0].events[0].id, ev.id);
              assert.equal(data[0].events[0].photos.length, 1);
              assert.equal(data[0].events[0].photos[0].id, photo.id);
              next();
            });
          });
        });
      });
    });
  }

, 'test `first`, includes eager-fetch of nested hasMany/through > hasMany/through relationship': function (next) {
    model.Person.all({}, {sort: 'title'}, function (err, data) {
      if(err) { throw err; }

      // Set up these friendships
      var a = data[0]
        , b = data[1]
        , c = data[2]
        , d = data[3]
        , e = data[4]
        , f = data[5];

      // a -> b, c
      a.addFriend(b);
      a.addFriend(c);
      // b -> d
      b.addFriend(d);
      // c -> e f
      c.addFriend(e);
      c.addFriend(f);

      a.save(function (err) {
        if(err) { throw err; }
        b.save(function (err) {
          if(err) { throw err; }
          c.save(function (err) {
            if(err) { throw err; }
            model.Person.all({}, {
              sort: {
                title: 'asc'
              , 'friends.title': 'asc'
              , 'friends.friends.title': 'asc'
              }
            , includes: {friends: 'friends'}}
            , function (err, data) {
              if(err) { throw err; }
              // a -> b, c
              assert.equal(data[0].friends.length, 2);
              assert.equal(data[0].friends[0].id, b.id);
              assert.equal(data[0].friends[1].id, c.id);

              // a -> b -> d
              assert.equal(data[0].friends[0].friends.length, 1);
              assert.equal(data[0].friends[0].friends[0].id, d.id);

              // a -> c -> e, f
              assert.equal(data[0].friends[1].friends.length, 2);

              assert.equal(data[0].friends[1].friends[0].id, e.id);
              assert.equal(data[0].friends[1].friends[1].id, f.id);

              // b -> d
              assert.equal(data[1].friends.length, 1);
              assert.equal(data[1].friends[0].id, d.id);

              // d -> no friends
              assert.equal(data[1].friends[0].friends, null);

              // c -> e, f
              assert.equal(data[2].friends.length, 2);
              assert.equal(data[2].friends[0].id, e.id);
              assert.equal(data[2].friends[1].id, f.id);

              // c -> e -> no friends
              assert.equal(data[2].friends[0].friends, null);

              // c -> f -> no friends
              assert.equal(data[2].friends[1].friends, null);

              next();
            });
          });
        })
      });
    });
  }

, 'test includes eager-fetch of nested hasMany/through > hasMany relationship': function (next) {
    model.Event.first({}, function (err, data) {
      if (err) { throw err; }
      var ev = data;
      model.Person.first({}, function (err, data) {
        if (err) { throw err; }
        var person = data;
        model.Photo.first({}, function (err, data) {
          if (err) { throw err; }
          var photo = data;
          ev.addPhoto(photo);
          ev.addParticipant(person);
          ev.save(function (err) {
            if (err) { throw err; }
            // At this point we have a person > participation > event > photo relationship set up
            model.Person.all({id: person.id}, {includes: {events: 'photos'}}, function (err, data) {
              if(err) { throw err; }
              assert.ok(data);
              assert.equal(data.length, 1);
              assert.equal(data[0].id, person.id);
              assert.equal(data[0].events.length, 1);
              assert.equal(data[0].events[0].id, ev.id);
              assert.equal(data[0].events[0].photos.length, 1);
              assert.equal(data[0].events[0].photos[0].id, photo.id);
              next();
            });
          });
        });
      });
    });
  }

, 'test includes eager-fetch of nested hasMany/through > hasMany/through relationship': function (next) {
    model.Person.all({}, {sort: 'title'}, function (err, data) {
      if(err) { throw err; }

      // Set up these friendships
      var a = data[0]
        , b = data[1]
        , c = data[2]
        , d = data[3]
        , e = data[4]
        , f = data[5];

      // a -> b, c
      a.addFriend(b);
      a.addFriend(c);
      // b -> d
      b.addFriend(d);
      // c -> e f
      c.addFriend(e);
      c.addFriend(f);

      helpers.updateItems([a, b, c], function (err) {
        if(err) { throw err; }
        model.Person.all({}, {
          sort: {
            title: 'asc'
          , 'friends.title': 'asc'
          , 'friends.friends.title': 'asc'
          }
          // "Get friends of friends"
        , includes: {friends: 'friends'}}
        , function (err, data) {
          if(err) { throw err; }
          // a -> b, c
          assert.equal(data[0].friends.length, 2);
          assert.equal(data[0].friends[0].id, b.id);
          assert.equal(data[0].friends[1].id, c.id);

          // a -> b -> d
          assert.equal(data[0].friends[0].friends.length, 1);
          assert.equal(data[0].friends[0].friends[0].id, d.id);

          // a -> c -> e, f
          assert.equal(data[0].friends[1].friends.length, 2);
          assert.equal(data[0].friends[1].friends[0].id, e.id);
          assert.equal(data[0].friends[1].friends[1].id, f.id);

          // b -> d
          assert.equal(data[1].friends.length, 1);
          assert.equal(data[1].friends[0].id, d.id);

          // d -> no friends
          assert.equal(data[1].friends[0].friends, null);

          // c -> e, f
          assert.equal(data[2].friends.length, 2);
          assert.equal(data[2].friends[0].id, e.id);
          assert.equal(data[2].friends[1].id, f.id);

          // c -> e -> no friends
          assert.equal(data[2].friends[0].friends, null);

          // c -> f -> no friends
          assert.equal(data[2].friends[1].friends, null);

          next();
        });
      });
    });
  }

, 'test includes eager-fetch of nested hasMany/through > hasOne relationship': function (next) {
    model.Event.first({}, function (err, data) {
      if (err) { throw err; }
      var ev = data;
      model.Person.all({}, {sort: {id: 'desc'}}, function (err, data) {
        if (err) { throw err; }
        var person = data[0]
          , owner = data[1];

        ev.addParticipant(person);
        ev.setOwner(owner);

        ev.save(function (err) {
          if (err) { throw err; }
          // At this point we have a person > participation > event > person relationship set up
          model.Person.all({id: person.id}, {includes: {events: 'owner'}}, function (err, data) {
            if(err) { throw err; }
            assert.ok(data);
            assert.equal(data.length, 1);
            assert.equal(data[0].id, person.id);
            assert.equal(data[0].events.length, 1);
            assert.equal(data[0].events[0].owner.id, owner.id);
            next();
          });
        });
      });
    });
  }

, 'test includes eager-fetch of hasMany -> belongsTo relationship': function (next) {
    model.Schedule.all(function (err, schedules) {
      if (err) { throw err; }
      model.FunActivity.all({}, {sort: {id: 'desc'}}, function (err, activities) {
        if (err) { throw err; }
        for (var i = 0, ii = activities.length; i < ii; i++) {
          schedules[i].addFunActivity(activities[i]);
        }
        helpers.updateItems(schedules, function (err) {
          if (err) { throw err; }
          model.Schedule.all({}
            , {includes: {'funActivities': 'Schedule'}
            , sort: {'funActivities.id': 'desc'}}
            , function (err, data) {
            if (err) { throw err; }
            for (var i = 0, ii = activities.length; i < ii; i++) {
              assert.equal(activities[i].id, data[i].funActivities[0].id);
            }
            next();
          });
        });
      });
    });
  }

, 'test includes eager-fetch of belongsTo -> hasMany association': function (next) {
    model.Schedule.all(function (err, schedules) {
      if (err) { throw err; }
      model.Photo.all({}, {sort: {id: 'desc'}}, function (err, photos) {
        if (err) { throw err; }
        model.Event.all({}, {sort: {id: 'desc'}}, function (err, events) {
          if (err) { throw err; }
          for (var i = 0, ii = events.length; i < ii; i++) {
            events[i].addPhoto(photos[i])
            schedules[i].setEvent(events[i]);
          }
          helpers.updateItems(schedules.concat.apply(schedules, events), function (err) {
            if (err) { throw err; }
            model.Schedule.all({}, {includes: {event: 'photos'}, sort: {'event.id': 'desc'}}, function (err, data) {
              if (err) { throw err; }
              for (var i = 0, ii = events.length; i < ii; i++) {
                assert.equal(events[i].id, data[i].event.id);
                assert.equal(data[i].event.photos.length, 1);
                assert.equal(data[i].event.photos[0].id, photos[i].id);
              }
              next();
            });
          });
        });
      });
    });
  }

, 'test includes eager-fetch of belongsTo -> through association': function (next) {
    model.Schedule.all({}, {sort: {id: 'desc'}}, function (err, schedules) {
      if (err) { throw err; }
      model.Person.all({}, {sort: {id: 'desc'}}, function (err, people) {
        if (err) { throw err; }
        for (var i = 0, ii = (people.length-1); i < ii; i++) {
          schedules[i].setEditor(people[i]);
          people[i].addFriend(people[i+1])
        }
        helpers.updateItems(schedules.concat(people), function (err) {
          if (err) { throw err; }
          model.Schedule.all({}, {includes: {editor: 'friends'}, sort: {'id': 'desc'}}, function (err, data) {
            if (err) { throw err; }
            for (var i = 0, ii = (people.length-1); i < ii; i++) {
              assert.equal(data[i].editor.id, people[i].id);
              assert.equal(data[i].editor.friends[0].id, people[i+1].id);
            }
            next();
          });
        });
      });
    });
  }

, 'test includes eager-fetch of hasMany -> belongsTo with array of ids': function (next) {
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
          model.Schedule.all({id: ids}, {includes: {'funActivities': 'schedule'}},
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
                assert.equal(d, a.schedule);
              });
            });
            next();
          });
        });
      });
    });
  }

, 'test includes eager-fetch of hasMany -> belongsTo with query on nested assn': function (next) {
    /*
    * This is the same test as the previous one, the only difference is that
    * the query we assert on does the id includes query on the nested association
    */
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
          var activityList = activities.slice(start, end);
          activityList.forEach(function (activity) {
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
          // Note that the correct syntax is to use the association name
          model.Schedule.all({'funActivities.schedule.id': ids}, {includes: {'funActivities': 'schedule'}},
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
                assert.equal(d, a.schedule);
              });
            });
            next();
          });
        });
      });
    });
  }

};

module.exports = tests;

