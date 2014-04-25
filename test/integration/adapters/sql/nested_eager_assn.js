var assert = require('assert')
  , model = require('../../../../lib')
  , helpers = require('../helpers')
  , tests;

tests = {
  'test includes eager-fetch of nested hasMany/through > hasMany relationship': function (next) {
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
        , f = data[5]
        , byTitleComparator = function (l, r) {
            return l.title < r.title ? -1 : 1;
          };

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
          // FIXME: Need to be able to sort on nested assocs
          data[0].friends[1].friends.sort(byTitleComparator);
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
            , {includes: {'FunActivities': 'Schedule'}
            , sort: {'FunActivities.id': 'desc'}}
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

};

module.exports = tests;

