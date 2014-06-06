var utils = require('utilities')
  , assert = require('assert')
  , config = require('../../config')
  , model = require('../../../lib')
  , helpers = require('./helpers')
  , tests;

tests = {

  'beforeEach': function (next) {
    var timeout = model.Event.adapter.name == 'riak' ?
        config.riak.testInterval : 0;
    helpers.createFixtures(function (err) {
      if (err) {
        fail(JSON.stringify(err));
      }
      setTimeout(next, timeout);
    });
  }

, 'afterEach': function (next) {
    var timeout = model.Event.adapter.name == 'riak' ?
        config.riak.testInterval : 0;
    helpers.deleteFixtures(function (err) {
      if (err) {
        fail(JSON.stringify(err));
      }
      setTimeout(next, timeout);
    });
  }

, 'test count': function (next) {
    model.Person.count(function (err, data) {
      assert.equal(20, data);
      next();
    });
  }

, 'test first via string id': function (next) {
    model.Person.all(function (err, data) {
      if (err) { throw err; }
      var id = data[0].id
        , title = data[0].title;
      model.Person.first(id, function (err, data) {
        if (err) { throw err; }
        assert.equal(title, data.title);
        next();
      });
    });
  }

, 'test first via non-existent string id': function (next) {
    if (!model.config.autoIncrementId) {
      model.Person.first('bogus-id', function (err, data) {
        if (err) { throw err; }
        assert.strictEqual(data, undefined);
        next();
      });
    }
    else {
      next();
    }
  }

, 'test first via id in query object': function (next) {
    model.Person.all(function (err, data) {
      if (err) { throw err; }
      var id = data[0].id
        , title = data[0].title;
      model.Person.first({id: id}, function (err, data) {
        if (err) { throw err; }
        assert.equal(title, data.title);
        next();
      });
    });
  }

, 'test first with multiple props in query object': function (next) {
    model.Person.all(function (err, data) {
      if (err) { throw err; }
      var item = data[0]
        , id = item.id
        , title = item.title
        , createdAt = item.createdAt;
      model.Person.first({id: id, createdAt: createdAt}, function (err, data) {
        if (err) { throw err; }
        assert.equal(title, data.title);
        next();
      });
    });
  }

, 'test all via id in query object': function (next) {
    model.Person.all(function (err, data) {
      if (err) { throw err; }
      var id = data[0].id
        , title = data[0].title;
      model.Person.all({id: id}, function (err, data) {
        if (err) { throw err; }
        assert.equal(title, data[0].title);
        next();
      });
    });
  }

, 'test all with empty id inclusion in query object': function (next) {
    model.Person.all({id: []}, function (err, data) {
      if (err) { throw err; }
      assert.strictEqual(data.length, 0)
      next();
    });
  }

, 'test all via non-existent string id': function (next) {
    if (!model.config.autoIncrementId) {
      model.Person.all({id: 'bogus-id'}, function (err, data) {
        if (err) { throw err; }
        assert.equal(typeof data, 'object');
        assert.equal(data.length, 0);
        next();
      });
    }
    else {
      next();
    }
  }

, 'test all via list of ids in query object': function (next) {
    model.Person.all({}, {sort: 'title'}, function (err, origData) {
      if (err) { throw err; }
      var ids = origData.map(function (item) {
        return item.id;
      });
      model.Person.all({id: ids}, {sort: 'title'}, function (err, data) {
        if (err) { throw err; }
        for (var i = 0, ii = data.length; i < ii; i++) {
          assert.equal(origData[i].title, data[i].title);
        }
        next();
      });
    });
  }

, 'test datetime round-trip': function (next) {
    var dt = new Date()
      , photo;

    // Fucking MySQL, throws away milliseconds
    dt.setMilliseconds(1000);

    photo = model.Photo.create({
      takenAt: dt
    });
    photo.save(function (err, data) {
      if (err) { throw err; }
      model.Photo.first({id: data.id}, function (err, data) {
        if (err) { throw err; }
        assert.equal(dt.getTime(), data.takenAt.getTime());
        next();
      });
    });
  }

, 'test updateProperties without save does not affect datastore': function (next) {
    model.Person.all({}, {sort: 'title'}, function (err, data) {
      if (err) { throw err; }
      var id = data[0].id
        , title = data[0].title;
      data[0].updateProperties({title: 'zerb'});
      model.Person.first({id: id}, function (err, data) {
        if (err) { throw err; }
        assert.equal(title, data.title);
        next();
      });
    });
  }

, 'test save existing': function (next) {
    model.Person.all({}, {sort: 'title'}, function (err, data) {
      if (err) { throw err; }
      var id = data[0].id
        , title = 'zerb';
      data[0].updateProperties({title: title});
      data[0].save(function (err, data) {
        if (err) { throw err; }
        assert.equal(title, data.title);
        model.Person.first({id: id}, function (err, data) {
          if (err) { throw err; }
          assert.equal(title, data.title);
          next();
        });
      });
    });
  }

, 'test save collection': function (next) {
    var P = model.Person
      , items = [];
    items.push(P.create({}));
    items.push(P.create({}));
    items.push(P.create({}));
    items.push(P.create({}));
    P.save(items, function (err, data) {
      if (err) { throw err; }
      P.all(function (err, data) {
        if (err) { throw err; }
        assert.equal(24, data.length);
        next();
      });
    });
  }

, 'single-quote in string property': function (next) {
    var title = "Fonebone's shoes"
      , p = model.Person.create({
          title: title
        });
    p.save(function (err, data) {
      if (err) { throw err; }
      model.Person.first({id: data.id}, function (err, data) {
        if (err) { throw err; }
        assert.equal(title, data.title);
        next();
      });
    });
  }

, 'test all, by string equality': function (next) {
    model.Person.all({title: 'a'}, {}, function (err, data) {
      if (err) { throw err; }
      assert.equal(1, data.length);
      next();
    });
  }

, 'test all, id does not override other conditions': function (next) {
    model.Person.all({title: 'a'}, {}, function (err, data) {
      if (err) { throw err; }
      assert.equal(1, data.length);
      model.Person.all({id: data.id, title: 'b'}, function (err, data) {
        if (err) { throw err; }
        // `all` call, no items in the collection
        assert.equal(0, data.length);
        model.Person.first({id: data.id, title: 'b'}, function (err, data) {
          if (err) { throw err; }
          // `first` call, no data at all
          assert.ok(!data);
          next();
        });
      });
    });
  }

, 'test all, by string with metacharacters equality': function (next) {
    model.Person.all({title: '.*'}, {nocase: true}, function (err, data) {
      if (err) { throw err; }
      assert.equal(0, data.length);
      next();
    });
  }

, 'test all, by string case-insensitive bool': function (next) {
    model.Person.all({title: 'A'}, {nocase: true}, function (err, data) {
      if (err) { throw err; }
      assert.equal(1, data.length);
      next();
    });
  }

, 'test all, by string LIKE case-sensitive': function (next) {
    model.Person.all({title: {'like': 'B'}}, function (err, data) {
      if (err) { throw err; }
      assert.equal(0, data.length);
      next();
    });
  }

, 'test all, by string LIKE case-insensitive bool': function (next) {
    model.Person.all({title: {'like': 'B'}}, {nocase: true}, function (err, data) {
      if (err) { throw err; }
      assert.equal(1, data.length);
      next();
    });
  }

, 'test all, by string LIKE case-insensitive array': function (next) {
    model.Person.all({title: {'like': 'B'}}, {nocase: ['title']}, function (err, data) {
      if (err) { throw err; }
      assert.equal(1, data.length);
      next();
    });
  }

, 'test all, by string LIKE percent in front': function (next) {
    var p = model.Person.create({title: 'ZZZ'});
    p.save(function (err, data) {
      if (err) { throw err; }
      model.Person.all({title: {'like': '%ZZ'}}, function (err, data) {
        if (err) { throw err; }
        assert.equal(1, data.length);
        next();
      });
    });
  }

, 'test all, by string LIKE percent in back': function (next) {
    var p = model.Person.create({title: 'ZZZ'});
    p.save(function (err, data) {
      if (err) { throw err; }
      model.Person.all({title: {'like': 'ZZ%'}}, function (err, data) {
        if (err) { throw err; }
        assert.equal(1, data.length);
        next();
      });
    });
  }

, 'test all, by string LIKE percent in front and back': function (next) {
    var p = model.Person.create({title: 'ZZZ'});
    p.save(function (err, data) {
      if (err) { throw err; }
      model.Person.all({title: {'like': '%Z%'}}, function (err, data) {
        if (err) { throw err; }
        assert.equal(1, data.length);
        next();
      });
    });
  }

, 'test all, by string LIKE percent in front, case-insensitive': function (next) {
    var p = model.Person.create({title: 'ZZZ'});
    p.save(function (err, data) {
      if (err) { throw err; }
      model.Person.all({title: {'like': '%zz'}}, {nocase: true}, function (err, data) {
        if (err) { throw err; }
        assert.equal(1, data.length);
        next();
      });
    });
  }

, 'test all, by string LIKE percent in back, case-insensitive': function (next) {
    var p = model.Person.create({title: 'ZZZ'});
    p.save(function (err, data) {
      if (err) { throw err; }
      model.Person.all({title: {'like': 'zz%'}}, {nocase: true}, function (err, data) {
        if (err) { throw err; }
        assert.equal(1, data.length);
        next();
      });
    });
  }

, 'test all, by string LIKE percent in front and back, case-insensitive': function (next) {
    var p = model.Person.create({title: 'ZZZ'});
    p.save(function (err, data) {
      if (err) { throw err; }
      model.Person.all({title: {'like': '%z%'}}, {nocase: true}, function (err, data) {
        if (err) { throw err; }
        assert.equal(1, data.length);
        next();
      });
    });
  }

, 'test all, array of ids (shortcut for IN), with one other property': function (next) {
    model.Person.all(function (err, data) {
      var ids = [];
      if (err) { throw err; }
      data.forEach(function (p) {
        ids.push(p.id);
      });
      model.Person.all({id: ids, title: 'a'}, function (err, data) {
        assert.equal(1, data.length);
        next();
      });
    });
  }

, 'test all, by IN': function (next) {
    model.Person.all({title: {'in': ['a', 'b']}}, function (err, data) {
      if (err) { throw err; }
      assert.equal(2, data.length);
      next();
    });
  }

, 'test all, sort string column name': function (next) {
    model.Person.all({}, {sort: 'title'}, function (err, data) {
      if (err) { throw err; }
      assert.ok(!(data.some(helpers.foundOutOfOrderItemAscending, data)));
      next();
    });
  }

, 'test all, sort incorrect string column name': function () {
    assert.throws(function () {
      model.Person.all({}, {sort: 'asdf'}, function (err, data) {
      });
    }, Error);
  }

, 'test all, sort multiple columns in array': function (next) {
    var people = [];
    // Add some other people with an 'a' title, and sortable descriptions
    people.push(model.Person.create({
      title: 'a'
    , description: 'r'
    }));
    people.push(model.Person.create({
      title: 'a'
    , description: 's'
    }));
    model.Person.save(people, function (err, data) {
      if (err) { throw err; }
      model.Person.all({}, {sort: ['title', 'description']},
          function (err, data) {
        if (err) { throw err; }
        assert.equal('a', data[0].title);
        assert.equal('t', data[data.length - 1].title);
        assert.equal('r', data[0].description);
        assert.equal('s', data[1].description);
        assert.equal('t', data[2].description);
        next();
      });
    });
  }

, 'test all, sort object literal asc': function (next) {
    model.Person.all({}, {sort: {title: 'asc'}}, function (err, data) {
      if (err) { throw err; }
      assert.ok(!(data.some(helpers.foundOutOfOrderItemAscending, data)));
      next();
    });
  }

, 'test all, sort object literal desc': function (next) {
    model.Person.all({}, {sort: {title: 'desc'}}, function (err, data) {
      if (err) { throw err; }
      assert.ok(!(data.some(helpers.foundOutOfOrderItemDescending, data)));
      next();
    });
  }

, 'test all, sort incorrect sort direction': function () {
    assert.throws(function () {
    model.Person.all({}, {sort: {title: 'descX'}}, function (err, data) {
      next();
    });
    }, Error);
  }

, 'test all, sort string wtih limit': function (next) {
    model.Person.all({}, {sort: 'title', limit: 4}, function (err, data) {
      if (err) { throw err; }
      assert.ok(!(data.some(helpers.foundOutOfOrderItemAscending, data)));
      assert.equal(4, data.length);
      next();
    });
  }

, 'test all, sort object literal wtih limit': function (next) {
    model.Person.all({}, {sort: {title: 'asc'}, limit: 4}, function (err, data) {
      if (err) { throw err; }
      assert.ok(!(data.some(helpers.foundOutOfOrderItemAscending, data)));
      assert.equal(4, data.length);
      next();
    });
  }

, 'test all, simple equality with or': function (next) {
    model.Person.all({or: [{title: 'a'}, {title: 't'}]}, {}, function (err, data) {
      if (err) { throw err; }
      assert.equal(2, data.length);
      next();
    });
  }

, 'test all, simple equality with or on an id property': function (next) {
    model.Person.all(function (err, data) {
      if (err) { throw err; }
      var idMap = {}
        , ids = data.slice(0, 3).map(function (item) {
            idMap[item.id] = true;
            return {id: item.id}
          });
      model.Person.all({or: ids}, function (err, data) {
        if (err) { throw err; }
        assert.ok(data.every(function (item) {
          return idMap[item.id];
        }));
        next();
      });

    });
  }

, 'test all, or with simple equality and like comparison': function (next) {
    var p = model.Person.create({title: 'zzz'});
    p.save(function (err, data) {
      if (err) { throw err; }
      model.Person.all({or: [{title: {'like': 'z%'}}, {title: 'a'}]},
          function (err, data) {
        if (err) { throw err; }
        assert.equal(2, data.length);
        next();
      });
    });
  }

, 'test all, or with simple equality and like comparison 2': function (next) {
    model.Person.all({title: {eql: 'a', ne: 'b'}},
        function (err, data) {
      if (err) { throw err; }
      assert.equal(1, data.length);
      next();
    });
  }

, 'test all, or with simple equality and like comparison, and not': function (next) {
    var p = model.Person.create({title: 'aaa'});
    p.save(function (err, data) {
      if (err) { throw err; }
      model.Person.all({or: [{title: {'like': 'a%'}}, {title: 'b'}],
          not: {title: 'a'}}, function (err, data) {
        if (err) { throw err; }
        assert.equal(2, data.length);
        next();
      });
    });
  }

, 'test all, using less-than createdAt': function (next) {
    var dt
      , p = model.Photo.create({title: 'z'});

    p.save(function (err, data) {
      var lt = new Date(data.createdAt.getTime() + 5000);

      if (err) { throw err; }
      model.Person.all({createdAt: {lt: lt}},
          function (err, data) {
        if (err) { throw err; }
        assert.equal(20, data.length);
        next();
      });
    });
  }

, 'test all, using less-than and greater-than with createdAt': function (next) {
    var dt
      , p = model.Photo.create({title: 'z'});

    p.save(function (err, data) {
      var lt = new Date(data.createdAt.getTime() + 5000)
        , gt = new Date(data.createdAt.getTime() - 5000);

      if (err) { throw err; }
      model.Person.all({createdAt: {lt: lt, gt: gt}},
          function (err, data) {
        if (err) { throw err; }
        assert.equal(20, data.length);
        next();
      });
    });
  }

, 'test remove by id': function (next) {
    model.Person.all(function (err, data) {
      if (err) { throw err; }
      var id = data[0].id;
      model.Person.remove(id, function (err, data) {
        if (err) { throw err; }
        model.Person.first(id, function (err, data) {
          if (err) { throw err; }
          assert.ok(!data);
          next();
        });
      });
    });
  }

, 'test remove with query': function (next) {
    model.Person.all(function (err, data) {
      if (err) { throw err; }
      var title = data[0].title
        , id = data[0].id
        , query = {
            or: [
              {
                title: {
                  like: title
                }
              }
            , {
                description: {
                  like: 'bogus'
                }
              }
            ]
          };

      model.Person.remove(query, function (err, data) {
        if (err) { throw err; }
        model.Person.first(id, function (err, data) {
          if (err) { throw err; }
          assert.ok(!data);
          next();
        });
      });
    });
  }

, 'test remove collection': function (next) {
    model.Person.all(function (err, data) {
      if (err) { throw err; }
      var ids = data.slice(0, 3).map(function (item) {
        return item.id;
      });
      model.Person.remove({id: ids}, function (err, data) {
        if (err) { throw err; }
        model.Person.all({id: ids}, function (err, data) {
          if (err) { throw err; }
          assert.equal(0, data.length);
          next();
        });
      });
    });
  }

, 'test reification of invalid model': function (next) {
    var ev = model.Event.create({
      // Invalid model as it has no title
      description: 'zerb'
    });
    assert.equal('Argle-bargle', ev.errors.title);
    ev.save({force: true}, function (err, data) {
      if (err) { throw err; }
      var id = data.id;

      // Fetch the invalid model
      model.Event.first(id, function (err, data) {
        if (err) { throw err; }
        // Ensure that reification worked
        assert.ok(typeof data.toJSON === 'function');

        // Since confirmPassword should only trigger on
        // 'create', ensure that there were no errors
        assert.ok(!data.errors);
        next();
      });
    });
  }

, 'test validations on reification': function (next) {
    var ev = model.Event.create({
      // Invalid model as it has no title or description
    });
    assert.equal('Argle-bargle', ev.errors.title);
    assert.ok(ev.errors.description);
    ev.save({force: true}, function (err, data) {
      if (err) { throw err; }
      var id = data.id;

      // Fetch the invalid model
      model.Event.first(id, function (err, data) {
        if (err) { throw err; }
        // Ensure that reification worked
        assert.ok(typeof data.toJSON === 'function');

        assert.ok(!data.errors.titls);
        assert.ok(data.errors.description);
        next();
      });
    });
  }

, 'test named hasOne association, owned object already saved': function (next) {
    model.Person.all(function (err, data) {
      if (err) { throw err; }
      var person = data[0];
      model.Event.all(function (err, data) {
        if (err) { throw err; }
        var ev = data[0];
        ev.setOwner(person);
        ev.save(function (err, data) {
          if (err) { throw err; }
          ev.getOwner(function (err, data) {
            if (err) { throw err; }
            assert.equal(person.id, data.id);
            next();
          });
        });
      });
    });
  }

, 'test named hasOne association, owned object not yet saved': function (next) {
    var person = model.Person.create({
      title: 'zerb'
    });
    model.Event.all(function (err, data) {
      if (err) { throw err; }
      var ev = data[0];
      ev.setOwner(person);
      ev.save(function (err, data) {
        if (err) { throw err; }
        ev.getOwner(function (err, data) {
          if (err) { throw err; }
          assert.equal('zerb', data.title);
          next();
        });
      });
    });
  }

, 'test named hasMany association, owned objects already saved': function (next) {
    model.Person.all(function (err, people) {
      if (err) { throw err; }
      model.Event.all(function (err, data) {
        if (err) { throw err; }
        var ev = data[0];
        ev.addAdmin(people[0]);
        ev.addAdmin(people[1]);
        ev.addAdmin(people[2]);
        ev.save(function (err, data) {
          if (err) { throw err; }
          ev.getAdmins(function (err, data) {
            if (err) { throw err; }
            var ids = {};
            assert.equal(3, data.length);
            data.forEach(function (item) {
              ids[item.id] = true;
            });
            [0, 1, 2].forEach(function (index) {
              assert.ok(ids[people[index].id]);
            });
            next();
          });
        });
      });
    });
  }

, 'test named hasMany association, owned objects not yet saved': function (next) {
    var people = [];
    people.push(model.Person.create({title: 'zzz'}));
    people.push(model.Person.create({title: 'yyy'}));
    people.push(model.Person.create({title: 'xxx'}));
    model.Event.all(function (err, data) {
      if (err) { throw err; }
      var ev = data[0];
      ev.addAdmin(people[0]);
      ev.addAdmin(people[1]);
      ev.addAdmin(people[2]);
      ev.save(function (err, data) {
        if (err) { throw err; }
        ev.getAdmins(function (err, data) {
          if (err) { throw err; }
          var ids = {};
          assert.equal(3, data.length);
          data.forEach(function (item) {
            ids[item.title] = true;
          });
          [0, 1, 2].forEach(function (index) {
            assert.ok(ids[people[index].title]);
          });
          next();
        });
      });
    });
  }

, 'test named hasMany, id array (shortcut for IN) and title array (shortcut for IN)': function (next) {
    model.Person.all({}, {sort: 'title'}, function (err, people) {
      if (err) { throw err; }
      model.Event.all(function (err, data) {
        if (err) { throw err; }
        var ev = data[0]
          , ids = [];
        ev.addAdmin(people[0]);
        ev.addAdmin(people[1]);
        ev.addAdmin(people[2]);
        people.forEach(function (p) {
          ids.push(p.id);
        });
        ev.save(function (err, data) {
          if (err) { throw err; }
          ev.getAdmins({id: ids, title: ['a', 'b']}, function (err, data) {
            assert.equal(2, data.length);
            next();
          });
        });
      });
    });
  }

, 'test mix of named hasMany/hasOne with same model, owned objects all already saved':
    function (next) {
    model.Person.all(function (err, people) {
      if (err) { throw err; }
      model.Event.all(function (err, data) {
        if (err) { throw err; }
        var ev = data[0];
        ev.setOwner(people[0]);
        ev.addAdmin(people[0]);
        ev.addAdmin(people[1]);
        ev.addAdmin(people[2]);
        ev.save(function (err, data) {
          if (err) { throw err; }
          ev.getAdmins(function (err, data) {
            if (err) { throw err; }
            var ids = {};
            assert.equal(3, data.length);
            data.forEach(function (item) {
              ids[item.id] = true;
            });
            [0, 1, 2].forEach(function (index) {
              assert.ok(ids[people[index].id]);
            });
            ev.getOwner(function (err, data) {
              assert.equal(people[0].id, data.id);
              next();
            });
          });
        });
      });
    });
  }

, 'test belongsTo': function (next) {
    model.Schedule.all(function (err, data) {
      if (err) { throw err; }
      var schedule = data[0];
      model.Event.all(function (err, data) {
        if (err) { throw err; }
        var ev = data[0];
        schedule.setEvent(ev);
        schedule.save(function (err, data) {
          if (err) { throw err; }
          schedule.getEvent(function (err, data) {
            if (err) { throw err; }
            assert.equal(ev.id, data.id);
            next();
          });
        });
      });
    });
  }

, 'test named belongsTo': function (next) {
    model.Schedule.all(function (err, data) {
      if (err) { throw err; }
      var schedule = data[0];
      model.Person.all(function (err, data) {
        if (err) { throw err; }
        var person = data[0];
        schedule.setEditor(person);
        schedule.save(function (err, data) {
          if (err) { throw err; }
          schedule.getEditor(function (err, data) {
            if (err) { throw err; }
            assert.equal(person.id, data.id);
            next();
          });
        });
      });
    });
  }

, 'test hasMany/through association': function (next) {
    model.Person.all(function (err, data) {
      if (err) { throw err; }
      var person = data[0];
      model.Event.all(function (err, data) {
        if (err) { throw err; }
        var events = data;
        events.forEach(function (ev) {
          person.addEvent(ev);
        });
        person.save(function (err, data) {
          if (err) { throw err; }
          person.getEvents(function (err, data) {
            if (err) { throw err; }
            assert.equal(20, data.length);
            next();
          });
        });
      });
    });
  }

, 'test hasMany/through association lookup with query': function (next) {
    model.Person.all(function (err, data) {
      if (err) { throw err; }
      var person = data[0];
      model.Event.all(function (err, data) {
        if (err) { throw err; }
        var events = data;
        events.forEach(function (ev) {
          person.addEvent(ev);
        });
        person.save(function (err, data) {
          if (err) { throw err; }
          person.getEvents({title: 'a'}, function (err, data) {
            if (err) { throw err; }
            assert.equal(1, data.length);
            next();
          });
        });
      });
    });
  }

, 'test named hasMany/through association': function (next) {
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
          ev.getParticipants(function (err, data) {
            if (err) { throw err; }
            assert.equal(20, data.length);
            next();
          });
        });
      });
    });
  }

, 'test named hasMany/through association, no associated objects': function (next) {
    model.Event.all(function (err, data) {
      if (err) { throw err; }
      data[0].getParticipants(function (err, data) {
        if (err) { throw err; }
        assert.equal(0, data.length);
        next();
      });
    });
  }

, 'test named hasMany with same model (reflexive association)': function (next) {
    model.Person.all(function (err, data) {
      if (err) { throw err; }
      var children = data.slice()
        , person = children.shift();
      children.forEach(function (c) {
        person.addChild(c);
      });
      person.save(function (err, data) {
        if (err) { throw err; }
        person.getChildren(function (err, data) {
          if (err) { throw err; }
          assert.equal(19, data.length);
          next();
        });
      });
    });
  }

, 'test named hasMany/through with same model (reflexive association)': function (next) {
    model.Person.all(function (err, data) {
      if (err) { throw err; }
      var friends = data.slice()
        , person = friends.shift();
      friends.forEach(function (f) {
        person.addFriend(f);
      });
      person.save(function (err, data) {
        if (err) { throw err; }
        person.getFriends(function (err, data) {
          if (err) { throw err; }
          assert.equal(19, data.length);
          next();
        });
      });
    });
  }

, 'test remove hasMany item': function (next) {
    model.Event.first({title: 'a'}, function (err, data) {
      var ev = data;
      if (err) { throw err; }
      model.Photo.all(function (err, data) {
        if (err) { throw err; }
        data.forEach(function (photo) {
          ev.addPhoto(photo);
        });
        ev.save(function (err) {
          ev.getPhotos(function (err, data) {
            if (err) { throw err; }
            assert.equal(20, data.length);
            ev.removePhoto(data[0]);
            ev.save(function (err) {
              if (err) { throw err; }
              ev.getPhotos(function (err, data) {
                if (err) { throw err; }
                assert.equal(19, data.length);
                next();
              });
            });
          });
        });
      });
    });
  }

, 'test remove named hasMany item': function (next) {
    model.Event.first({title: 'a'}, function (err, data) {
      var ev = data;
      if (err) { throw err; }
      model.Message.all(function (err, data) {
        if (err) { throw err; }
        data.forEach(function (message) {
          ev.addComment(message);
        });
        ev.save(function (err) {
          ev.getComments(function (err, data) {
            if (err) { throw err; }
            assert.equal(20, data.length);
            ev.removeComment(data[0]);
            ev.save(function (err) {
              if (err) { throw err; }
              ev.getComments(function (err, data) {
                if (err) { throw err; }
                assert.equal(19, data.length);
                next();
              });
            });
          });
        });
      });
    });
  }

, 'test remove named hasMany through item': function (next) {
    model.Event.first({title: 'a'}, function (err, data) {
      var ev = data;
      if (err) { throw err; }
      model.Person.all(function (err, data) {
        if (err) { throw err; }
        data.forEach(function (person) {
          ev.addParticipant(person);
        });
        ev.save(function (err) {
          ev.getParticipants(function (err, data) {
            if (err) { throw err; }
            assert.equal(20, data.length);
            ev.removeParticipant(data[0]);
            ev.save(function (err) {
              if (err) { throw err; }
              ev.getParticipants(function (err, data) {
                if (err) { throw err; }
                assert.equal(19, data.length);
                next();
              });
            });
          });
        });
      });
    });
  }

, 'test remove named hasMany/through with same model (reflexive association)': function (next) {
    model.Person.all(function (err, data) {
      if (err) { throw err; }
      var friends = data.slice()
        , person = friends.shift();
      friends.forEach(function (f) {
        person.addFriend(f);
      });
      person.save(function (err, data) {
        if (err) { throw err; }
        person.getFriends(function (err, data) {
          if (err) { throw err; }
          assert.equal(19, data.length);
          person.removeFriend(data[0]);
          person.save(function (err) {
            if (err) { throw err; }
            person.getFriends(function (err, data) {
              if (err) { throw err; }
              assert.equal(18, data.length);
              next();
            });
          });
        });
      });
    });
  }

, 'test remove with empty query': function (next) {
    model.Person.all(function (err, data) {
      if (err) { throw err; }

      var initial_count = data.length;

      model.Person.remove({id: []}, function (err, data) {
        if (err) { throw err; }

        model.Person.all(function (err, data) {
          if (err) { throw err; }

          assert.equal(data.length, initial_count, 'Nothing should have been deleted');

          next();
        });
      });
    });
  }

// FIXME: This isn't really an integration test
, 'test static methods on model': function (next) {
    model.Event.findByTitle('a', function (err, data) {
      assert.equal(1, data.length);
      if (err) { throw err; }
      next();
    });
  }

, 'test save new with custom string id': function (next) {
    if (!model.config.autoIncrementId) {
      var customId = 'zerb';
      var p = model.Person.create({
        id: customId
      });
      p.save(function (err, data) {
        if (err) { throw err; }
        assert.equal(data.id, customId);
        next();
      });
    }
    else {
      next();
    }
  }

, 'test save new with custom int id': function (next) {
    if (!model.config.autoIncrementId) {
      var customId = 2112;
      var p = model.Person.create({
        id: customId
      });
      p.save(function (err, data) {
        if (err) { throw err; }
        assert.equal(data.id, customId);
        next();
      });
    }
    else {
      next();
    }
  }

, 'test count all': function (next) {
    model.Person.count({}, function (err, data) {
      if (err) { throw err; }
      assert.equal(20, data);
      next();
    });
  }

, 'test count query': function (next) {
    model.Person.count({title: 'a'}, function (err, data) {
      if (err) { throw err; }
      assert.equal(1, data);
      next();
    });
  }

, 'test number query': function(next) {
  var val = 3.8
    , title = 'foo'
    , result = model.Result.create({
    value: val,
    title: title
  });

  result.save(function(err, data) {
    if (err) { throw err; }
    model.Result.first({
      title: title,
      value: val
    }, function(err, result) {
      if (err) { throw err; }
      var value = result && result.value;
      assert.equal(val, value);
      next();
    });
  });
}
};

module.exports = tests;
