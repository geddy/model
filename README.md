Model
==============

[![Build Status](https://travis-ci.org/geddy/model.png?branch=master)](https://travis-ci.org/geddy/model)

Model is a datastore-agnostic ORM in JavaScript. It serves as the
model-component for the [Geddy MVC Web framework](http://geddyjs.org/) for
NodeJS.

## TOC

- [Overview](#overview)
- [Bootstrapping Model](#bootstrapping-model)
- [Defining Models](#defining-models)
  - [Abbreviated syntax](#abbreviated-syntax)
  - [Adapters](#adapters)
  - [Datatypes](#datatypes)
- [Creating instances](#creating-instances)
- [Validations](#validations)
  - [Common options](#common-options)
  - [Validation errors](#validation-errors)
- [Saving items](#saving-items)
- [Updating items](#updating-items)
- [Removing items](#removing-items)
- [Lifecycle events](#lifecycle-events)
- [Associations](#associations)
  - [Creating associations](#creating-associations)
  - [Removing associations](#removing-associations)
  - ['Through' associations](#through-associations)
  - [Named associations](#named-associations)
  - [Named Through associations](#named-through-associations)
- [Querying](#querying)
  - [Finding a single item](#finding-a-single-item)
  - [Collections of items](#collections-of-items)
  - [Comparison operators](#comparison-operators)
- [More complex queries](#more-complex-queries)
- [Options: sort, skip, limit](#options-sort-skip-limit)
  - [Sorting](#sorting)
  - [Simplified syntax for sorting](#simplified-syntax-for-sorting)
  - [Skip and limit](#skip-and-limit)
- [Eager loading of associations (SQL adpaters only)](#eager-loading-of-associations-sql-adpaters-only)
  - [Sorting results](#sorting-results)
  - [Checking for loaded associations](#checking-for-loaded-associations)

## Overview

Model currently implements adapters for:

* Postgres
* MySQL
* SQLite
* Riak
* MongoDB
* LevelDB
* In-memory
* Filesystem

### License

Apache License, Version 2

### Prerequisites

Model requires version 0.8.x of Node.js or higher. If you want to run the tests,
or work on Model, you'll want the [Jake](https://github.com/mde/jake) JavaScript
build-tool.

### Installing with [NPM](http://npmjs.org/)

```
NPM install model
```

## Bootstrapping Model

Here's a minimal example which uses the LevelDB adapter for a `Foo` model:

```javascript
var model = require('model');

// Setup the blueprint of the model. This is where you can
// setup the model properties, defaults, and validations
var Foo = function () {
  this.setAdapter('level', {
    db: './data'
  });

  // Define the whitelisted properties on the model.
  // Properties not listed wont be saved
  this.defineProperties({
    name: { type: 'string', required: true },
    description: { type: 'text' },
    enabled: { type: 'boolean' },
    archived: { type: 'boolean' },
  });
};

// This registers the model with the model package so
// things like associations can work
Foo = model.register('Foo', Foo);

// Now we export Foo to create a reusable model module
module.exports = Foo;
```

You can then use it like the following example:

```js
var Foo = require('./foo.js');
Foo.first(1, function (err, model) {
  // Check if there was an error with the DB
  if (err) throw new Error('Uh oh, something broke');

  // If there was no error, but no model was found it must be missing
  if (!err && !model) throw new Error('Foo not found');

  // Update the model's name property
  model.name = "New name!";

  // Once we're done updating properties we can call save on the model.
  // Save will send the current model data to the DB you specified
  model.save(function (err, updatedModel) {
    if (err) throw new Error('Could not save the model');
    console.log("The model was updated!");
  });
});

```

## Defining models

Model uses a pretty simple syntax for defining a model. (It should look familiar
to anyone who has used an ORM like ActiveRecord, DataMapper, Django's models, or
SQLAlchemy.)

```javascript
var User = function () {
  this.property('login', 'string', {required: true});
  this.property('password', 'string', {required: true});
  this.property('lastName', 'string');
  this.property('firstName', 'string');

  this.validatesPresent('login');
  this.validatesFormat('login', /[a-z]+/, {message: 'Subdivisions!'});
  this.validatesLength('login', {min: 3});
  this.validatesConfirmed('password', 'confirmPassword');
  this.validatesWithFunction('password', function (s) {
      if (password.indexOf('login')) {
          // Returning a string indicates that the validation has failed.
          // The string will be used as the message.
          return "Password must not contain your username";
      }
      return true;
  });

  this.someMethod = function () {
    // Do some stuff
  };
};

// prepares the model and adds it as a property on `model`
User = model.register('User', User);
```

### Setting an adapter

Although you can set a [default adapter](#modelconfigdefaultadapter), you may want to override that default on a per model basis. To do that simply call `this.setAdapter(name, config)` just like you would with [createAdapter](#modelcreateadaptername-config), like so for a MongoDB adapter:

```javascript
var model = require('model');

var Foo = function () {
  this.setAdapter('mongo', {
    "hostname":"localhost",
    "port":27017,
    "username":"",
    "password":"",
    "dbName":"mydatabase"
  });

  this.defineProperties({
    name: { type: 'string', required: true }
  });
};

Foo = model.register('Foo', Foo);

module.exports = Foo;
```

### Defining properties

Properties can be defined using the `property` method, which takes a name, a type,
and some options.

Alternatively, you can use the `defineProperties` method to lay out your model's
properties with a single method call:

```javascript
var User = function () {
  this.defineProperties({
    login: {type: 'string', required: true}
  , password: {type: 'string', required: true}
  , lastName: {type: 'string'}
  , firstName: {type: 'string'}
  });
}
```

### Datatypes

Model supports the following datatypes:

* `string`
* `text`
* `number`
* `int`
* `boolean`
* `date`
* `datetime`
* `time`
* `object`

The `object` data type can take a JSON string or an object that will serialize
to JSON.

There is no currency or decimal datatype. For currencies it is recommended to use an
int representing the smallest domination (such as cents), like the
[Stripe](http://stripe.com/) API does.

### Custom Methods

Custom instance methods can be attached to the prototype of a model. Be careful
not to use a name that conflicts with a property, and avoid overriding a method
supplied by *model* like `save` (instead use a [[lifecycle event](#lifecycle-events)).

Class methods can be attached to the constructor of a model. As with instance
methods, take care not to override existing class methods, such as `all`,
`first`, and `count`.

Here is an example of declaring class and instance methods:

```javascript
var User = function () {
    this.property('email', 'string');
    this.property('sendUpdates', 'boolean');

    // setting a property on `this` in the constructor creates an instance method
    this.sendConfirmation = function (callback) {
        // send confirmation message
    }
}

// setting a property on the prototype creates an instance method
User.prototype.sendNewsletter = function (callback) {
    // send newsletter
}

// setting a property on the constructor creates a class method
User.sendNewsletters = function (callback) {
    // send newsletter to users that opted into updates
}

User = model.register('User', User);
```

### Adapters

An adapter allows a model to communicate with the database in a common way across any supported
databases. For example, this allows you to easily switch from an in memory database for testing
to something like MongoDB just by changing a single line in your model config.


#### How to install adapters

Some adapters require you to install a 3rd party module from NPM. Below is a list of the
adapters that require an install and how to install it. The `--save` flag is optional on
all of these but will put it in your `package.json` file for you:

- Postgres: `npm install pg --save`
- MySQL: `npm install mysql --save`
- SQLite: `npm install sqlite3 --save`
- MongoDB: `npm install mongodb --save`
- LevelDB: `npm install level --save`

The in-memory, filesystem, and Riak adapters work out of the box and don't need any
additional libraries.

#### model.createAdapter(_name_, _config_)

Use `model.createAdapter(name, config)` to initialize an adapter and connect to the database.

_NOTE:_ The `config` parameter for each adapter depends on the module used. As an example,
postgres uses `database` for the database name whereas MongoDB uses `dbName`. Model doesn't
try to standardize the config for each adapter. Instead it just passes the config you give it
in `createAdapter` to the NPM module. To check the config setup for your adapter go to the
module's official site and look at their docs.

```javascript
var adapter = model.createAdapter('postgres', {
, host: 'localhost'
, username: 'user'
, password: 'password'
, database: 'mydb'
});
```

#### model.config.defaultAdapter

Use the `defaultAdapter` property on `model.config` to set a default adapter for all models that don't manually specify
`.setAdapter` in the model definition.

```javascript
model.config.defaultAdapter = model.createAdapter('postgres', {
  host: 'localhost',
  username: 'user',
  password: 'password',
  database: 'mydb'
});
```

#### adapter.connect(cb)

If you want to hook into when the adapter connects to the database you
can hook into the connect method which will fire when the connection
is either successful or it fails.

```js
myAdapter.connect(function (err) {
  if (err) throw new Error('Error: ' + err);
  console.log('Database connection successful');
}
```

#### adapter.disconnect(cb)

Same as `adapter.connect`, but when a disconnect happens.

```js
myAdapter.disconnect(function (err) {
  if (err) throw new Error('Error: ' + err);
  console.log('Database disconnected successfully');
}
```

#### adapter.addListener('connect', callback)

Same as `adapter.connect`, but in event form and only when it is successful.

```js
myAdapter.addListener('connect', function () {
  console.log('Database connection successful');
});
```

#### adapter.addListener('disconnect', callback)

Same as `adapter.disconnect`, but in event form and only when it is successful.

```js
myAdapter.addListener('disconnect', function () {
  console.log('Database disconnected successfully');
});
```

#### adapter.addListener('error', callback)

Fires whenever there is any error in the database connection during a connect or
disconnect attempt.

```js
myAdapter.addListener('error', function (err) {
  throw new Error('Error: ' + err);
});
```

## Creating instances

Creating an instance of one of these models is easy:

```javascript
var params = {
  login: 'alex'
, password: 'lerxst'
, lastName: 'Lifeson'
, firstName: 'Alex'
};
var user = User.create(params);
```

## Validations

Validations provide a nice API for making sure your data items are in a good
state, and creates friendly error messages to provide feedback to the user. When
an item is "valid" it means that its data meet all the criteria you've set for
it. You can specify that certain fields have to be present, have to be certain
length, or meet any other specific criteria you want to set.

Here's a list of supported validation methods:

 * `validatesPresent` – ensures the property exists
 * `validatesLength` – ensures the minimum, maximum, or exact length
 * `validatesFormat` – validates using a passed-in regex
 * `validatesConfirmed` – validates a match against another named parameter (useful for passwords)
 * `validatesAbsent` – ensures the property does not exist
 * `validatesWithFunction` – uses an arbitrary function to validate

Here are some simple examples of each validation method:

```javascript
var User = function () {
  this.property('login', 'string', {required: true});
  this.property('password', 'string', {required: true});
  this.property('lastName', 'string');
  this.property('firstName', 'string');

  this.validatesPresent('login');
  this.validatesFormat('login', /[a-z]+/, {message: 'Subdivisions!'});
  this.validatesLength('login', {min: 3});
  this.validatesConfirmed('password', 'confirmPassword');
  this.validatesWithFunction('password', function (s) {
      // Something that returns true or false
      return s.length > 0;
  });
  this.validatesAbsent('unconfirmed');
  this.validatesWithFunction('password', function (value, model) {
      // if the function returns false it will use a standard message
      if (typeof value != typeof "") {
      	 return false;
      }

      // if it returns a string the string will be used as an error message
      if  (value.length <= 3) {
      	 return "Your password must be at least 4 characters long ";
      }

      // return true if the validation passed
      return true;
  });

  // methods for instances can be defined in the constructor like this
  this.someMethod = function () {
    // Do some stuff
  };
};
```

#### Common validation options

You can specify a custom error message for when a validation fails using the
'message' option:

```javascript
var Zerb = function () {
  this.property('name', 'string');
  this.validatesLength('name', {is: 3, message: 'Try again, gotta be 3!'});
};
```

You can decide when you want validations to run by passing the 'on' option.

```javascript
var User = function () {
  this.property('name', 'string', {required: false});
  this.property('password', 'string', {required: false});

  this.validatesLength('name', {min: 3, on: ['create', 'update']});
  this.validatesPresent('password', {on: 'create'});
  this.validatesConfirmed('password', 'confirmPassword', {on: 'create'});
};

// Name validation will pass, but password will fail
myUser = User.create({name: 'aaa'});

```

The default behavior is for validation on both 'create' and 'update':

 * `create` – validates on MyModelDefinition.`create`
 * `update` – validates on myModelInstance.`updateProperties`

You can also define custom validation scenarios other than create and update.
(There is a builtin custom 'reify' scenario which it uses when instantiating
items out of your datastore. This happens when the `first` and `all` query
methods are called.)

```javascript
// Force validation with the `reify` scenario, ignore the too-short name property
myUser = User.create({name: 'aa'}, {scenario: 'reify'});

// You can also specify a scenario with these methods:
// Enforce 'create' validations on a fetch -- may result in invalid instances
User.first(query, {scenario: 'create'}, cb);
// Do some special validations you need for credit-card payment
User.updateProperties(newAttrs, {scenario: 'creditCardPayment'});
```

### Validation errors

Any validation errors show up inside an `errors` property on the instance, keyed
by field name. Instances have an `isValid` method that returns a Boolean
indicating whether the instance is valid.

```javascript
// Leaving out the required password field
var params = {
  login: 'alex'
};
var user = User.create(params);

// Prints 'false'
console.log(user.isValid());
// Prints 'Field "password" is required'
console.log(user.errors.password);
```

## Saving items

After creating the instance, call the `save` method on the instance. This method
takes a callback in the familiar (err, data) format for Node.

```javascript
if (user.isValid()) {
  user.save(function (err, data) {
    if (err) {
      throw err;
    }
    console.log('New item saved!');
  });
}
```

## Updating items

Use the `updateProperties` method to update the values of the properties on an
instance with the appropriate validations. Then call `save` on the instance.

```javascript
user.updateProperties({
  login: 'alerxst'
});
if (user.isValid()) {
  user.save(function (err, data) {
    if (err) {
      throw err;
    }
    console.log('Item updated!');
  });
}
```

## Removing items

Use the `remove` method to remove one ore multiple instances.

```javascript
model.User.remove(user.id, function(err) {
  if (err) {
    throw err;
  }
  console.log('Item removed!');
});
```

You can also pass a query to the `remove` method instead of an id.

## Lifecycle events

Both the base model *constructors* and model instances are EventEmitters. They
emit events during the create/update/remove lifecycle of model instances. In all
cases, the plain-named event is fired after the event in question, the
'before'-prefixed event, of course happens before.

The *constructor* for a model emits the following events:

 * `beforeCreate`
 * `create`
 * `beforeValidate`
 * `validate`
 * `beforeUpdateProperties`
 * `updateProperties`
 * `beforeSave (new instances, single and bulk)`
 * `save (new instances, single and bulk)`
 * `beforeUpdate (existing single instances, bulk updates)`
 * `update (existing single instances, bulk updates)`
 * `beforeRemove`
 * `remove`

Model-item instances emit these events:

 * `beforeUpdateProperties`
 * `updateProperties`
 * `beforeSave`
 * `save`
 * `beforeUpdate`
 * `update`

Model-item instances also have the following lifecycle methods:

 * `afterCreate`
 * `beforeValidate`
 * `afterValidate`
 * `beforeUpdateProperties`
 * `afterUpdateProperties`
 * `beforeSave`
 * `afterSave`
 * `beforeUpdate`
 * `afterUpdate`

If these methods are defined, they will be called at the
appropriate time. You can hook into this lifecycle to do things
like set default values for your items:

```javascript
var User = function () {
  this.property('name', 'string', {required: false});

  // Make sure there's a name in the params before validating
  this.beforeValidate = function (params) {
    params.name = params.name || 'Zerp Derp';
  };
};
```

## Associations

Model has support for paired associations including `hasMany`/`belongsTo`
and hasOne/belongsTo. For example, if you had a `User` model with a single
`Profile`, and potentially many `Accounts`:

```javascript
var User = function () {
  this.property('login', 'string', {required: true});
  this.property('password', 'string', {required: true});
  this.property('confirmPassword', 'string', {required: true});

  this.hasOne('Profile');
  this.hasMany('Accounts');
};

var Profile = function() {
  // properties

  this.belongsTo('Account');
};

var Account = function() {
  // properties

  this.belongsTo('User');
};

// Names in association methods must match the names that models are registered with.
// The name given to hasMany is pluralized.
User = model.register('User', User);
Profile = model.register('Profile', Profile);
Account = model.register('Account', Account);
```

### Creating associations

Add the `hasOne` relationship by calling 'set' plus the name of the owned
model in singular (in this case `setProfile`). Retrieve the associated item by
using 'get' plus the name of the owned model in singular (in this case
`getProfile`). Here's an example:

```javascript
var user = User.create({
  login: 'asdf'
, password: 'zerb'
, confirmPassword: 'zerb'
});
user.save(function (err, data) {
  var profile;
  if (err) {
    throw err;
  }
  profile = Profile.create({});
  user.setProfile(profile);
  user.save(function (err, data) {
    if (err) {
      throw err;
    }
    user.getProfile(function (err, data) {
      if (err) {
        throw err;
      }
      console.log(profile.id ' is the same as ' + data.id);
    });
  });
});
```

Set up the `hasMany` relationship by calling 'add' plus the name of the
owned model in singular (in this case `addAccount`). Retrieve the associated
items with a call to 'get' plus the name of the owned model in plural (in
this case `getAccounts`). An example:

```javascript
var user = User.create({
  login: 'asdf'
, password: 'zerb'
, confirmPassword: 'zerb'
});
user.save(function (err, data) {
  if (err) {
    throw err;
  }
  user.addAccount(Account.create({}));
  user.addAccount(Account.create({}));
  user.save(function (err, data) {
    if (err) {
      throw err;
    }
    user.getAccounts(function (err, data) {
      if (err) {
        throw err;
      }
      console.log('This number should be 2: ' + data.length);
    });
  });
});
```

A `belongsTo` relationship is created similarly to a `hasOne`: by calling 'set'
plus the name of the owner model in singular (in this case `setAuthor`).
Retrieve the associated item by using 'get' plus the name of the owner model
in singular (in this case `getAuthor`). Here's an example:

```javascript
var book = Book.create({
  title: 'How to Eat an Entire Ham'
, description: 'Such a poignant book. I cried.'
});
book.save(function (err, data) {
  if (err) {
    throw err;
  }
  book.setAuthor(Author.create({
    familyName: 'Neeble'
  , givenName: 'Leonard'
  }));
  book.save(function (err, data) {
    if (err) {
      throw err;
    }
    book.getAuthor(function (err, data) {
      if (err) {
        throw err;
      }
      console.log('This name should be "Neeble": ' + data.familyName);
    });
  });
});
```

### Removing associations

A similar API is used for removing associations, with the word 'remove' plus the
name of the owned model:

```javascript
User.first({login: 'asdf'}, function (err, user) {
  if (err) {
    throw err;
  }
  // Fetch accounts
  user.getAccounts(function (err, accounts) {
    var originalCount;
    if (err) {
      throw err;
    }
    originalCount = accounts.length;

    // Remove the first account
    user.removeAccount(accounts[0]);
    // Save the user
    user.save(function (err) {
      if (err) {
        throw err;
      }
      // Fetch accounts again
      user.getAccounts(function (err, accounts) {
        if (err) {
          throw err;
        }
        Console.log(accounts.length + ' should be one less than ' +
            originalCount);
      });
    });
  });
});
```

Note that this does not remove the associated item itself -- only the
association linking it to the owner object.

### 'Through' associations

'Through' associations allow a model to be associated with another *through* a
third model. A good example would be a Team linked to Players through
Memberships.

```javascript
var Player = function () {
  this.property('familyName', 'string', {required: true});
  this.property('givenName', 'string', {required: true});
  this.property('jerseyNumber', 'string', {required: true});

  this.hasMany('Memberships');
  this.hasMany('Teams', {through: 'Memberships'});
};

var Team = function () {
  this.property('name', 'string', {required: true});

  this.hasMany('Memberships');
  this.hasMany('Players', {through: 'Memberships'});
};

var Membership = function () {
  this.belongsTo('User');
  this.belongsTo('Team');
};
```

The API for this is the same as with normal associations, using the `set`/`add`
and `get`, with the appropriate association name (not the model name). For
example, in the case of the Team adding Players, you'd use `addPlayer` and
`getPlayer`.

### Named associations

Sometimes you need mutliple associations to the same type of model (e.g., I have
lots of Friends and Relatives who are all Users). You can accomplish this in
Model using named associations:

```javascript
var User = function () {
  this.property('familyName', 'string', {required: true});
  this.property('givenName', 'string', {required: true});

  this.hasMany('Kids', {model: 'Users'});
};
```

The API for this is the same as with normal associations, using the `set`/`add`
and `get`, with the appropriate association name (not the model name). For
example, in the case of `Kids`, you'd use `addKid` and `getKids`.

### Named 'through' associations

If one of your named associations of a model is 'through' another model, such as
a join table, it is necessary that the association's name is the same for the
model declaring the through association as it is for the model who the
association is through.

For example, a team may have many players, but may also have many coaches.

```javascript
var Team = function(){
  this.hasMany('Players');
  this.hasMany('Coaches', {through: 'TeamCoaches', model: 'Players'});
};
var TeamCoaches = function(){
  this.belongsTo('CoachedTeam', {model: 'Team'});
  this.belongsTo('Coach', {model: 'Player'});
}
var Player = function(){
  this.hasMany('Teams');
  this.hasMany('CoachedTeams', {through: 'TeamCoaches', model: 'Team'});
}
```

Here a `Team` has many `Players`, but also has many `Coaches`, and we have an
inverse relationship set up as well so that a `Player` has many `Teams` but also
has many `CoachedTeams`.

## Querying

Model uses a simple API for finding and sorting items. Again, it should look
familiar to anyone who has used a similar ORM for looking up records. The only
wrinkle with Model is that the API is (as you might expect for a NodeJS library)
asynchronous.

Methods for querying are static methods on each model constructor.

### Finding a single item

Use the `first` method to find a single item. You can pass it an id, or a set of
query parameters in the form of an object-literal. In the case of a query, it
will return the first item that matches, according to whatever sort you've
specified.

```javascript
var user;
User.first({login: 'alerxst'}, function (err, data) {
  if (err) {
    throw err;
  }
  user = data;
  console.log('Found user');
  console.dir(user);
});
```

### Finding a collection of items

Use the `all` method to find lots of items. Pass it a set of query parameters in
the form of an object-literal, where each key is a field to compare, and the
value is either a simple value for comparison (equal to), or another
object-literal where the key is the comparison-operator, and the value is the
value to use for the comparison.

In SQL adapters, you can pass a callback to the `all` method if you want the
results buffered and returned all at once, or steam the results using events.

#### Using a callback

Pass your callback function as a final argument. Callbacks use the normal `(err,
data)` pattern. Here's an example:

```javascript
var users
  , dt;

dt = new Date();
dt.setHours(dt.getHours() - 24);

// Find all the users created since yesterday
User.all({createdAt: {gt: dt}, function (err, data) {
  if (err) {
    throw err;
  }
  users = data;
  console.log('Found users');
  console.dir(users);
});
```

#### Streaming results with events (SQL adapters only)

The `all` method returns an EventedQueryProcessor which emits the normal 'data',
'end', and 'error' events. Each 'data' event will return a single model-item.

NOTE: Do not pass a callback to the `all` method if you're streaming -- passing
a callback will cause the results to be buffered internally. If you need
something to happen when the stream ends, use the 'end' event.

```javascript
var users
  , dt
  , processor;

dt = new Date();
dt.setHours(dt.getHours() - 24);

// Find all the users created since yesterday
processor = User.all({createdAt: {gt: dt});
processor.on('data', function (user) {
  console.log('Found user');
  console.dir(user);
});
processor.on('error', function (err) {
  console.log('whoops');
  throw err;
});
processor.on('end', function () {
  console.log('No more users');
});
```

#### Examples of queries

Here are a few more examples of queries you can pass to the `all` method:

```javascript
// Where "foo" is 'BAR' and "bar" is not null
{foo: 'BAR', bar: {ne: null}}
// Where "foo" begins with 'B'
{foo: {'like': 'B'}}
// Where foo is less than 2112, and bar is 'BAZ'
{foo: {lt: 2112}, bar: 'BAZ'}
```

### Comparison operators

Here is the list of comparison operators currently supported:

 * eql: equal to
 * ne: not equal to
 * gt: greater than
 * lt: less than
 * gte: greater than or equal
 * lte: less than or equal
 * like: like

A simple string-value for a query parameter is the same as 'eql'. `{foo: 'bar'}`
is the same as `{foo: {eql: 'bar'}}`.

For case-insensitive comparisons, use the 'nocase' option. Set it to `true` to
affect all 'like' or equality comparisons, or use an array of specific keys you
want to affect.

```javascript
// Zoobies whose "foo" begin with 'b', with no case-sensitivity
Zooby.all({foo: {'like': 'b'}}, {nocase: true}, ...
// Zoobies whose "foo" begin with 'b' and "bar" is 'baz'
// The "bar" comparison will be case-sensitive, and the "foo" will not
Zooby.all({or: [{foo: {'like': 'b'}}, {bar: 'baz'}]}, {nocase: ['foo']},
```

## More complex queries

Model supports combining queries with OR and negating queries with NOT.

To perform an 'or' query, use an object-literal with a key of 'or', and an array
of query-objects to represent each set of alternative conditions:

```javascript
// Where "foo" is 'BAR' OR "bar" is 'BAZ'
{or: [{foo: 'BAR'}, {bar: 'BAZ'}]}
// Where "foo" is not 'BAR' OR "bar" is null OR "baz" is less than 2112
{or: [{foo {ne: 'BAR'}}, {bar: null}, {baz: {lt: 2112}}]}
```

To negate a query with 'not', simply use a query-object where 'not' is the key,
and the value is the set of conditions to negate:

```javascript
// Where NOT ("foo" is 'BAR' and "bar" is 'BAZ')
{not: {foo: 'BAR', bar: 'BAZ'}}
// Where NOT ("foo" is 'BAZ' and "bar" is less than 1001)
{not: {foo: 'BAZ', bar: {lt: 1001}}}
```

These OR and NOT queries can be nested and combined:

```javascript
// Where ("foo" is like 'b' OR "foo" is 'foo') and NOT "foo" is 'baz'
{or: [{foo: {'like': 'b'}}, {foo: 'foo'}], not: {foo: 'baz'}}
```

## Options: sort, skip, limit

The `all` API-call for querying accepts an optional options-object after the
query-conditions for doing sorting, skipping to particular records (i.e., SQL
OFFSET), and limiting the number of results returned.

### Sorting

Set a 'sort' in that options-object to specifiy properties to
sort on, and the sort-direction for each one:

```javascript
var users
// Find all the users who have ever been updated, and sort by
// creation-date, ascending, then last name, descending
User.all({updatedAt: {ne: null}}, {sort: {createdAt: 'asc', lastName: 'desc'}},
    function (err, data) {
  if (err) {
    throw err;
  }
  users = data;
  console.log('Updated users');
  console.dir(users);
});
```

### Simplified syntax for sorting

You can use a simplified syntax for specifying the sort. The default
sort-direction is ascending ('asc'), so you can specify a property to sort on
(or multiple properties as an array) if you want all sorts to be ascending:

```javascript
// Sort by createdAt, ascending
{sort: 'createdAt'}
// Sort by createdAt, then updatedAt, then lastName,
// then firstName -- all ascending
{sort: ['createdAt', 'updatedAt', 'lastName', 'firstName']}
```

### Skip and limit

The 'skip' option allows you to return records beginning at a certain item
number. Using 'limit' will return you only the desired number of items in your
response. Using these options together allow you to implement pagination.

Remember that both these option assume you have your items sorted in the
desired order. If you don't sort your items before using these options, you'll
end up with a random subset instead of the items you want.

```javascript
// Returns items 501-600
{skip: 500, limit: 100}
```

## Eager loading of associations (SQL adapters only)

You can use the 'includes' option to specify second-order associations that
should be eager-loaded in a particular query (avoiding the so-called N + 1 Query
Problem). This will also work for 'through' associations.

For example, with a Team that `hasMany` Players through Memberships, you might
want to display the roster of player for every team when you display teams in a
list. You could do it like so:

```javascript
var opts = {
  includes: ['players']
, sort: {
    name: 'desc'
  , 'players.familyName': 'desc'
  , 'players.givenName': 'desc'
  }
};
Team.all({}, opts, function (err, data) {
  var teams;
  if (err) {
    throw err;
  }
  teams = data;
  teams.forEach(function (team) {
    console.log(team.name);
    team.players.forEach(function (player) {
      console.log(player.familyName + ', ' + player.givenName);
    });
  });
});
```

### Eager loading of nested associations

You can also do an eager load of nested associations. If you wanted to get the
sponsors of each player, you can do it like so:

```javascript
Team.all({}, {includes: {players: 'sponsors'}}, function (err, data) {});
```

You can also get the investors of the teams like so:
```javascript
Team.all({}, {includes: [{players: 'sponsors'}, 'investors']}, function (err, data) {});
```

Or get the investors' spouses as well:
```javascript
Team.all({}, {includes: {players: 'sponsors', investors: 'spouse'}, function (err, data) {});
```

While there is no hard limit on nesting associations, queries like this search for
friends of friends of friends are likely to have poor performance:
```javascript
Person.all({}, {includes: {friends: {friends: 'friends'}}, function (err, data) {});
```

You can also query on nested associations. This query will return teams with players sponsored by Daffy Duck:
```javascript
Team.all({'players.sponsors.name': 'Daffy Duck'}, {includes: {players: 'sponsors'}}, function (err, data) {});
```

### Sorting results

Notice that it's possible to sort the eager-loaded associations in the above
queries. Just pass the association-names + properties in the 'sort' property.

In the first example, the 'name' property of the sort refers to the team-names.
The other two, 'players.familyName' and 'players.givenName', refer to the loaded
associations. This will result in a list where the teams are initially sorted by
name, and the contents of their 'players' list have the players sorted by given
name, then first name.

You can sort on nested attributes by specifying the association name:
```javascript
{sort: 'players.sponsors.id'}
```

#### Limitations when eager loading

Due to limitations in SQL, please take note of the following when using eager loading:

 * Querying on associations is only possible when including the associated model

If you query on an association, you *must* include the relationship, or the query will fail.

```javascript
// Good
Team.all({'players.sponsors.name': 'Daffy Duck'}
        , {includes: {players: 'sponsors'}}
        , function (err, data) {});

// Bad
Team.all({'players.sponsors.name': 'Daffy Duck'}
        , {includes: 'players'}
        , function (err, data) {});
```

 * Querying on associations is not possible when there is a limit clause

This is a limitation of the current implementation. An exception will be thrown when queries like this are attempted.

```javascript
// Bad
Team.all({'players.sponsors.name': 'Daffy Duck'}
        , {includes: {players: 'sponsors'}, limit: 5}
        , function (err, data) {});

// Bad too, since .first is an implicit "limit: 1"
Team.first({'players.sponsors.name': 'Daffy Duck'}
        , {includes: {players: 'sponsors'}, limit: 5}
        , function (err, data) {});
```

 * Streaming is not possible when sorting on a nested association before the top level id

```javascript
// Streaming API will work, the sort clause will be modified to ['id', 'players.name']
Team.all({'players.sponsors.name': 'Daffy Duck'}
        , {includes: {players: 'sponsors'}, sort: ['players.name']});

// Streaming API will still work, but results will only be sent at the end of the query
Team.all({'players.sponsors.name': 'Daffy Duck'}
        , {includes: {players: 'sponsors'}, sort: ['players.name', 'id']});
```


### Checking for loaded associations

The eagerly fetched association will be in a property on the top-level item with
the same name as the association (e.g., Players will be in `players`).

If you have an item, and you're not certain whether an association is already
loaded, you can check for the existence of this property before doing a per-item
fetch:

```javascript
if (!someTeam.players) {
  someTeam.getPlayers(function (err, data) {
    console.dir(data);
  });
}
```

## Contributing

### Hacking on Model: running tests

Run the tests with `jake test`. Run only unit tests with `jake test[unit]`.

The integration tests require the appropriate database and supporting library.
(For example, running the Postgres tests require a running Postgres server, and
the 'pg' module NPM-installed in your model project directory.) To install the
needed modules, just run `npm install` in the root model directory.

To run the tests on a specific adapter, use `jake test[mongo]`, `jake
test[postgres]`, or `jake test[memory]`.

Configure adapter options by creating a `test/db.json` file. See
`test/db.sample.json` for available options.

- - -
Model JavaScript ORM copyright 2112 mde@fleegix.org.

