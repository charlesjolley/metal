/*globals Descriptor Mixin */

/**
  @module metal/mixins

  Mixins make it easy to create units functionality that can be applied to
  multiple objects, even those with unrelated parent classes.

  A mixin is made up of a constructor function and optional dependency mixins.
  When you apply a mixin, any dependent mixins will first be applied and then
  the constructor function will be called to add any properties or methods you
  desire on the object.

  Unlike most property libraries, however, Metal mixins can only be applied 
  once to an object.  Once you apply a mixin to an object - or to one of its
  prototypes - applying a mixin again will have no effect.  This makes it 
  safe for you to apply mixins over and over, or to name dependent mixins more
  than once, without having to worry about the mixin overwriting properties.

  = Mixin Basics
  
  Defining a mixin is a simple as creating a mixin with a constructor 
  function:
  
      var Mixin = require('metal/mixin').Mixin;
      var MyMixin = new Mixin(function() {
        this.foo = 'bar';
        this.sayHello = function() {
          console.log('HELLO!');
        };
      });

  When a mixin is applied, the constructor function you passed in will be 
  invoked with `this` set to the target object.  You can think of this just
  like writing a normal object constructor:
  
      var object = {};
      MyMixin.apply(object);
      object.sayHello();
      > HELLO!
      
  = Dependencies
  
  You can name mixin dependencies by passing them in to the constructor
  before you pass the constructor function itself:
  
      var Mixin = require('metal/mixin').Mixin;
      var Eventable = require('metal/mixins/eventable').Eventable;
      
      var MyMixin = new Mixin(Eventable, function() {
        this.addListener('change', function() {
          console.log('DID CHANGE!');
        });
      });
      
      var obj = {};
      MyMixin.apply(obj);  // applies Eventable, then MyMixin
      obj.trigger('change');
      > DID CHANGE!
      
  Note that since mixins will be applied to an object only once, it is safe
  to name dependent mixins even if they might already be applied to an object.
  Dependent mixins that have already been applied to an object won't be
  applied again.
  
  = Inheritence
  
  Mixin properties are inherited when using prototypes just like any other
  property.  Likewise, Metal keeps track of which mixins have been applied to
  prototype objects.  Thus, applying a mixin to an object that was applied to
  a prototype object is safe.  For example:
  
      var Mixin = require('metal/mixin').Mixin;
      var MyMixin = new Mixin(function(helpers) {
        console.log('Applying mixin!'); // let us know when this runs.
        this.sayHello = function() {
          console.log('Hello');
        }
      });
      
      var SomeClass = function() {};
      MyMixin.apply(SomeClass.prototype);
      > Applying mixin!
      
      var someObject = new SomeClass(); 
      someObject.sayHello(); // inherited from prototype!
      > Hello! 
      
      MyMixin.apply(someObject); // does not run constructor again!
  
  = Property Mixins
  
  A common use of mixins is to simply copy some properties and methods onto
  an object.  In this case, you can simply pass a hash of properties to the
  Mixin constructor instead of a function:
  
      var Mixin = require('metal/mixin').Mixin;
      var MyMixin = new Mixin({
        sayHello: function() {
          console.log("HELLO!");
        },
        
        foo: 'bar'
      });
      
      var object = {};
      MyMixin.apply(object); // copies properties
      
      object.sayHello();
      > HELLO!
      
        
  @since 1.0
*/

var META = require('./meta');

function _makeHandler(props) {
  return function() {
    for(var key in props) {
      if (!props.hasOwnProperty(key)) continue;
      this[key] = props;
    }
  };
}


/**
  The core Mixin class.  See module documentation for complete details on
  how to use it.
*/
exports.Mixin = function Mixin(handler) {
  
  // build a primitive mixin if you pass in only a single handler.  Else,
  // make a compound mixin.

  var len, idx, mixin, mixins;
  mixin = this.mixins  = [];
  
  // NOTE: accessing arguments the first time is expensive on V8.  Test it
  // last.
  if (handler && !(handler instanceof Mixin) && (arguments.length === 1)) {
    if ('function' !== typeof handler) handler = _makeHandler(handler);
    this.handler = handler;
  } else {
    len = arguments.length;
    for(idx=0;idx<len;idx++) {
      mixin = arguments[idx];
      if (!mixin instanceof Mixin) mixin = new Mixin(mixin);
      mixins.push(mixin);
    }
  }
};

function _applyMixin(mixin, obj) {
  if (!obj) obj = this;
  var mixinsMeta = META.getMeta(obj, 'mixins');
  var id         = META.getId(mixin);
  if (mixinsMeta[id]) return ; // already applied
  mixinsMeta[id] = mixin;
  
  mixin.mixins.forEach(_applyMixin, obj); // apply dependencies
  if (mixin.handler) mixin.handler.call(obj, mixin);
}

function _applyMixins(obj, mixins, offset) {
  var len = mixins.length;
  for(;offset<len;offset++) {
    _applyMixin(mixins[offset], obj);
  }
}

/**
  Applies the receiver mixin to the passed object.  If the mixin was already
  applied it will only be applied once.
  
  @param {Object} obj
    The object to apply the mixin to
    
  @returns {Mixin} receiver
*/
Mixin.prototype.apply = function(obj) {
  _applyMixin(this, obj);
  return this;
};

/**
  Reopens the current mixin, adding any passed constructors or mixins to the
  current set of mixins.  Note that this will not effect any objects the mixin 
  has already been applied to.

  @param {Object} mixins...
    Zero or more mixins, constructor functions, or property hashes.

  @returns {Mixin} receiver
*/
Mixin.prototype.reopen = function() {
  if (this.handler) {
    this.mixins.push(new Mixin(this.handler));  
    this.handler = null;
  }

  var len = arguments.length, idx, mixin;
  if (idx=0;idx<len;idx++) {
    mixin = arguments[idx];
    bolt_assert('Mixin#reopen() does not accept a null value', !!mixin);
    if (!mixin instanceof Mixin) mixin = new Mixin(mixin);
    this.mixins.push(mixin);
  }
  return this;
};

/**
  Returns true if the passed object has the passed mixin applied.

  @param {Object} obj
    The object to test

  @param {Boolean} true if mixin has been applied
*/
Mixin.prototype.detect = function(obj) {
  !!META.getMeta(obj, 'mixins')[META.getId(this)];  
};

/**
  Applies the passed mixins to the passed object.  If any mixin was already
  applied it will not be applied again.
  
  @param {Object} obj
    The object to apply mixins to
    
  @param {Mixin} mixins...
    Zero or more mixins to apply
    
  @return {void}
*/
Mixin.apply = exports.applyMixin = function(obj, mixins) {
  if ((arguments.length === 2) && (mixins instanceof Array)) {
    _applyMixins(obj, mixins, 0);
  } else {
    _applyMixins(obj, arguments, 1);
  }
};
