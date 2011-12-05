
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
      var Contact = Class.extend(function() {
        this.init(function() {
          // called on init
        });
      });
      
  Any arguments you pass to the `new` operator will be passed to your init
  function.
*/
      
var MIXIN     = require('./mixin');
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
  MIXIN.apply(ctor, ctor.ObjectMixin);
}

function _makeCtor() {
  var prepared = false;
  var init;
  
  return function() {
    if (!prepared) {
      prepared = true;
      var ctor = this.constructor;
      ctor.prepare();
      init = getMeta(this, false).initMethod;
    }
    
    if (init) init.apply(this, arguments);
    return this;
  };
}

Class = exports.Class = _makeCtor();

// defines the default mixin
Class.ObjectMixin = MIXIN.create(function() {  
  
  // make the default defineProperty actually work on the prototype.
  this.defineHelpers({
    defineProperty: function(keyName, value) {
      this.target.prototype[keyName] = value;
      return this;
    },
    
    defineClassProperty: function(keyName, value) {
      this.target[keyName] = value;
      return this;
    },
    
    defineClassProperties: function(props) {
      for(var key in props) {
        if (props.hasOwnProperty(key)) {
          this.defineClassProperty(key, props[key]);
        }
      }
      return this;
    },
    
    init: function(func) {
      getMeta(this.prototype).initMethod = func;
      return this;
    }
  });
  
  this.defineClassProperties({
    extend: function() {
      var ctor = _makeCtor(), proto;
      ctor.superclass = this;
      proto = ctor.prototype = o_create(this.prototype);
      proto.constructor = ctor;
      ctor.ObjectMixin = MIXIN.create(this.ObjectMixin);
      ctor.ObjectMixin._reopen(arguments);
      return ctor;
    },
    
    reopen: function() {
      bolt_assert('You cannot reopen a class once it has been instantiated',
        !this._prepared);
      this.ObjectMixin._reopen(arguments);
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
  
});

// applies the class properties immediately
_prepare(Class);
