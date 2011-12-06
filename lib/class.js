
/**
  @module metal/object
  
  Defines a basic Mixin-aware object with classical inheritence.
  
  = Defining a new Class
  
  Create a new class by calling the extend() method.  This method works 
  exactly like MIXIN.create() except that it will by default assign all new
  properties to the prototype instead of the class itself.  Additionally, the
  class will avoid actually applying your mixins until you instantiate the
  class.
  
  Here is how you define a basic class:
  
      var Class = require('metal/class').Class;
      var MyClass = Class.extend({
        foo: 'bar'
      });

  You can also make the class include mixins:
  
      var Class = require('metal/class').Class;
      var Eventalbe = require('metal/mixins/eventable').Eventable;
      
      var EventableClass = Class.extend(Eventable, {
        // ... other properties here
      });
      
  Mixins will only be applied once to a class when it is instantiated, so
  you don't have to worry about a superclass possibly defining a parent class.
  
  = Instantiating an Object
  
  You create an instance just like any other object in JavaScript, using the
  new operator:
  
      vay object = new MyClass();
      
  When defining your class, you define the constructor function you want to 
  use with the init() helper:
  
      var Class = require('metal/class').Class;
      var Contact = Class.extend({
        constructor: function() {
          
        }
      });
      
  Any arguments you pass to the `new` operator will be passed to your init
  function.
*/
      
var Mixin     = require('./mixin').Mixin;
var META      = require('./meta');
var platform  = require('./platform');

var getMeta  = META.getMeta;
var o_create = platform.create;
var Class;

function bolt_assert() {
  //TODO: implement assert
}

// For best performance, we actually defer applying mixins or properties to
// constructed classes until the first time you instantiate the object.  This
// also allows you to load classes at arbitrary times without having to worry
// as much about load order.

function _prepare(ctor) {
  if (!ctor || ctor._prepared) return;
  ctor._prepared = true;
  _prepare(ctor.constructor); // make sure parent is prepared first
  Mixin.apply(ctor, ctor.ObjectMixin);
}

// create a new constructor function.  To optimize performance, we avoid applying
// any actual mixins until the first time the object is instantiated.
function _makeCtor() {
  var prepared = false;
  var init;
  
  return function() {
    if (!prepared) {
      prepared = true;
      var ctor = this.constructor;
      ctor.prepare();
      init = this.init;
    }
    
    if (init) init.apply(this, arguments);
    return this;
  };
}

Class = exports.Class = _makeCtor();

// defines the default mixin for the class
Class.ClassMixin  =  new Mixin({
  
  extend: function() {
    var ctor = _makeCtor(), proto;
    ctor.superclass = this;
    proto = ctor.prototype = o_create(this.prototype);
    proto.constructor = ctor;
    ctor.ObjectMixin = new Mixin(this.ObjectMixin);
    ctor.ClassMixin  = new Mixin(this.ClassMixin);
    ctor.ClassMixin.apply(ctor);
    return ctor;
  },

  reopen: function() {
    bolt_assert('You cannot reopen a class once it has been instantiated',
      !this._prepared);
    this.ObjectMixin.reopen.apply(this.ObjectMixin, arguments);
    return this;
  },

  reopenClass: function() {
    this.ClassMixin.reopen.apply(this.ClassMixin, arguments);
    var len = arguments.length, idx, mixin;
    for(idx=0;idx<len;idx++) {
      mixin = arguments[idx];
      bolt_assert('reopenClass() cannot accept null value', !!mixin);
      if (!mixin instanceof Mixin) mixin = new Mixin(mixin);
      mixin.apply(this); // apply immediately.
    }
    return this;
  },

  prepare: function() {
    _prepare(this);
    return this;
  },

  create: function() {
    // TODO: optimize
    var Ctor = this.extend.apply(this, arguments);
    return new Ctor();
  }
});

Class.ClassMixin.apply(Class);

Class.ObjectMixin = new Mixin();

