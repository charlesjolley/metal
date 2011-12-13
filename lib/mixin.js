/**
 * @module metal/mixins
 * 
 * Mixins and Classes provide two very simple ways for you to factor you code
 * into reusable units.  Unlike most libraries, this module attempts only to 
 * provide a very basic implementation that can be extended.  It includes hooks
 * so that you can extend these base components with your own custom DSL.
 * 
 * = Mixins
 * 
 * The lowest-level unit is a Mixin, is simply a collection of constructor
 * functions that can be applied to one or more objects.  Unlike regular 
 * functions, Mixins can only be applied to particular object - or its 
 * prototype ancestors - one time.  Subsequent attempts to apply the same mixin
 * will have no effect.  This gives you the freedom to apply mixins without
 * having to worry that they might destroy existing properties.
 * 
 * In addition, mixins can have dependent mixins.  Applying a mixin will 
 * implicitly apply any dependent mixins as well.  There are similar guards in
 * place to ensure that dependent mixins are applied only once and circular
 * references cannot cause infinite loops.
 * 
 * == Defining a Mixin
 * 
 * You care a new Mixin using the `new` keyword, passing any dependent mixins
 * and constructors that you want:
 * 
 *     var Eventable = new Mixin(Accessors, function() {
 *       this.trigger = function() {
 *         // code goes here
 *        }
 *      });
 *      
 * Applying the example above to an object would apply the `Accessors` mixin 
 * as well a invoke the passed function, defining the `trigger` method on the
 * target object.
 * 
 * By default, mixins accept only constructor functions - like the one above -
 * that will be called when the mixin is applied.  The constructor functions 
 * will have their `this` property set to the target object.  The object and
 * mixin will also be passed to the function as optional parameters.  This 
 * allows you to define well documented code like so:
 * 
 *     var Eventable = new Mixin(Accessors, function(Eventable) {
 *     
 *       // document...
 *       Eventable.trigger = function() {
 *         // code goes here
 *       };
 *       
 *       Eventable.bind = function() {
 *       };
 *       
 *       //etc.
 *     });
 *     
 * You can extend the base Mixin class to support additional types of 
 * constructors.  See the section on enumlating other APIs as an example.
 *  
 * == Applying Mixins
 * 
 * Once you have defined a mixin, you probably want to apply it to an object.
 * Usually you will do this as part of the Class system, but if you want to
 * apply a Mixin directly to an object, you can do so with the `apply()`
 * method.
 * 
 *     myObject = {};
 *     Eventable.apply(myObject);
 *     
 * There is also a global version that allows you to apply multiple mixins at
 * once:
 * 
 *     myObject = {};
 *     Mixin.apply(myObject, Eventable, Accessors);
 *     
 * Note that since mixins are only applied once, it is safe to include any 
 * mixins you need in calls to apply, even if they might be included elsewhere
 * as dependencies.
 * 
 * == Emulating Other APIs
 * 
 * The Metal mixin system is designed to be mostly unopionated about the way
 * you construct your mixins.  Instead, it includes a way for you to enhance
 * the base Mixin class with your own DSLs.
 * 
 * Whenever a new Mixin is created and you pass any parameter to the `new`
 * function aside from a constructor function or another Mixin, the Mixin will 
 * call a method on itself called `prepareMixin()` to convert the passed 
 * parameter into a real mixin.
 * 
 * You can override this method to add support for your own features.  For 
 * example, here is how you would add support for copying property hashes onto
 * the object:
 * 
 *     MyMixin = Mixin.extend();
 *     MyMixin.reopenClass(function(MyMixin) {
 *       MyMixin.prepareMixin = function(props) {
 *       
 *         // look for a passed in object type we understand.
 *         if ('object' === typeof props && !(props instanceof Array)) {
 *         
 *           // build a mixin with a constructor function for the passed props
 *           // this mixin will be invoked when applying.
 *           return new Mixin(function() {
 *             for(var key in props) {
 *               if (!props.hasOwnProperty(key)) continue;
 *               this[key] = props[key];
 *             }
 *           });
 *           
 *         // otherwise invoke previous implementation
 *         } else {
 *           return Mixin.prepareMixin.call(this, props);
 *         }
 *       };
 *       
 *     });
 *     
 *  With this code in place, you could now just pass in property hashes like
 *  so:
 *  
 *     Eventable = new MyMixin({
 *       trigger: function() {
 *         // code goes here
 *       },
 *       
 *       bind: function() {
 *         // code goes here
 *       }
 *     });
 *     
 *  When the mixin is built, `prepareMixin()` will be called, allowing you to
 *  convert this into a real mixin object.
 *  
 *  = Classes
 *  
 *  Classes are an extension on Mixins that allows you to actually instantiate
 *  objects built from various properties.  Metal Classes are regular
 *  JavaScript objects, using normal prototype inheritence to build out the
 *  hierarchy.  This makes them very fast to initialize and use.
 *  
 *  Unlike most Class libraries, however, Metal Classes are actually built from
 *  a combination of Mixins.  This allows us to properly update classes as you
 *  build out the hierarchy.  Classes are also very fast to define as they 
 *  avoid doing almost all work until the first time an object is instantiated.
 *  
 *  == Defining a Class
 *  
 *  Defining a new Class is exactly like defining a Mixin except you will get
 *  something that can be instantiated:
 *  
 *      MyClass = Class.extend(Eventable, function() {
 *         this.firstName = 'Charles';
 *         this.lastName  = 'Jolley';
 *      });
 *      
 *  One thing that is important to understand is that the functions you pass
 *  into `extend()` will be called __one timed__ to setup the prototype of the
 *  object the first time it is instantiated.   These are not init functions.
 *  
 *  To setup an init function to be called when the object is instantiated, 
 *  just define an init method on the class:
 *  
 *     MyClass = Class.extend(Eventable, function() {
 *     
 *       // set once on the prototype
 *       this.firstName = 'Charles';
 *       
 *       // will be called on each instantiation
 *       this.init = function() {
 *         this.lastName = 'Jolley';
 *       }
 *       
 *     });
 *     
 * To create a new object just use the `new` keyword.  Any parameters you pass
 * to the constructor will be passed to the `init()` method you define.
 * 
 * = TO DOCUMENT
 * 
 *  * Mixin.reopen() vs mixin.reopen() vs Mixin.reopenClass()
 *  * Class.reopen() vs Class.reopenClass()
 *  * Defining Class.prepareMixin() to implement DSL 
 * 
 */


var PLATFORM = require('./platform');
var META     = require('./meta');

var o_create = PLATFORM.create,
    o_defineProperty = PLATFORM.defineProperty,
    getMeta  = META.getMeta,
    getId    = META.getId;

var K = function () {};

var Class, Mixin, ClassMixin, PrototypeMixin;

// TODO: make this a real thing
function bolt_assert(message, test) {
  if (!test) throw new Error(message);
}

var NO_ENUM = {
  enumerable: false,
  configurable: true,
  writable: true,
  value: null
};

function _noEnum(obj, name, value) {
  NO_ENUM.value = value;
  o_defineProperty(obj, name, NO_ENUM);
  NO_ENUM.value = null;
}

/**
 * Applies a mixin to the passed object. A mixin must have either a handler
 * property, which is a function to invoke when applying, or a mixins property
 * which is an array of other mising. 
 * 
 * @param  {Object} obj   Object to apply the mixin
 * @param  {Mixin} mixin  A Mixin instance
 * @return {void}
 */
function _applyMixin(obj, mixin, seen) {
  var meta    = getMeta(obj, 'mixins');
  var mixinId = getId(mixin);

  if (seen[mixinId]) return; // avoid infinite loops
  seen[mixinId] = mixin;
  meta[mixinId] = mixin; // keep track for detect()

  // add dependencies recursively
  var mixins = mixin.mixins, len = mixins.length, idx;
  for(idx=0;idx<len;idx++) _applyMixin(obj, mixins[idx], seen);

  // make sure a given handler is only called once.  test separately from the
  // mixin itself because sometimes a handler function can be moved to another
  // anonymous mixin.
  var handlerId = mixin.handler && getId(mixin.handler);
  if (handlerId && !meta[handlerId]) {
    meta[handlerId] = mixin.handler;
    mixin.handler.call(obj, obj, mixin);
  }
}

function _ensureMixin(MixinClass, mixin, methodName) {
  bolt_assert('Mixin#'+methodName+'() does not accept a null value', !!mixin);
  return mixin instanceof Mixin ? mixin : new MixinClass(mixin);
}

// works for both init() and reopen().
function _initMixin(handler) {
  var len, idx, mixin, mixins = this.mixins, MixinClass = this.constructor;
  if (!mixins) mixins = this.mixins = [];
  if (this.handler) mixins.push(new MixinClass(this.handler));

  // NOTE: accessing arguments the first time is expensive on V8.  Test it
  // last.
  // Special case: try to create a primitive mixin if passed in a single
  // handler.
  if (mixins.length===0 && (handler || (handler === false)) && 
      !(handler instanceof Mixin) && (arguments.length === 1)) {

    if ('function' === typeof handler) {
      this.handler = handler;      
    } else {
      handler = MixinClass.prepareMixin(handler, this);
      if (handler instanceof Mixin) {
        mixins.push(handler);
      } else {
        throw new Error("Invalid Parameter (type: "+typeof handler+")");
      }
    }

 
  // otherwise just build a compound mixin
  } else {
    len = arguments.length;
    for(idx=0;idx<len;idx++) {
      mixins.push(_ensureMixin(MixinClass, arguments[idx], 'init'));
    }
  }
  return this;
}

function _createMixin(desc, BaseMixin) {
  bolt_assert('Class only accepts function constructors', 
    'function' === typeof desc);
  return new Mixin(desc);    
}

/**
 * Build a constructor for a new object.  The constructor will assign a 
 * Class and Prototype mixin as needed.
 * 
 * @param  {Function} BaseMixin
 *         The base constructor function
 * @return {Mixin} A Mixin subclass
 */
function _makeConstructor() {
  return function() {
    var prepared = false;
    var init ;

    if (!prepared) {
      prepared = true;
      this.constructor.prepareClass();
      init = this.init;
    }

    if (init) init.apply(this, arguments);
  };  
}


/**
 * Core extend functionality.  Does not configure mixins properly.  Used to
 * bootstrap the mixin/class functionality.
 *  
 * @param  {Class} BaseClass The base class to extend
 * @return {Class} New Subclass
 */
function _extend(BaseClass) {
  var Ret = _makeConstructor();
  Ret.prototype = o_create(BaseClass.prototype);
  Ret.superclass = BaseClass;
  _noEnum(Ret.prototype, 'constructor', Ret);
  return Ret;
}

Class = _makeConstructor();
Mixin = _extend(Class);
Mixin.prototype.init = _initMixin;
Mixin.prepareClass = K;
Mixin.prepareMixin = _createMixin;

// setup classes
ClassMixin = new Mixin(function(Class) {

  function applyArguments(self, BaseMixin, args) {
    var len = args.length, mixin;
    for(var idx=0;idx<len;idx++) {
      mixin = args[idx];
      if (!(mixin instanceof Mixin)) mixin = self.prepareMixin(mixin, BaseMixin);
      BaseMixin.reopen(mixin);
    }  
  }

  function applyToSubclasses(self, seen, callback) {
    var id = getId(self);
    if (seen[id]) return;
    seen[id] = true;

    var ret = callback(self);
    if (ret === false) return ;
    self.subclasses.forEach(function(Subclass) {
      applyToSubclasses(Subclass, seen, callback);
    });
  }

  /**
   * Creates a new subclass of the receiver class.  This method accepts both 
   * Mixin instances and other parameters, which will be used to configure the
   * class itself.  If you pass any parameter other than a Mixin, then the 
   * value will be bassed to the class method createPrototypeMixin() which you
   * can override to handle property values.  The default implementation just 
   * accepts functions.
   * 
   * @param {Mixin|Object} mixins... 
   *        Optional zero or more mixins or other property descriptors used to
   *        configure the class.
   *  
   * @return New class
   */
  Class.extend = function() {
    var NewClass = _extend(this);
    NewClass.ClassMixin     = new Mixin(this.ClassMixin);
    NewClass.PrototypeMixin = new Mixin(this.PrototypeMixin);
    NewClass.ClassMixin.apply(NewClass);
    applyArguments(NewClass, NewClass.PrototypeMixin, arguments);
    this.subclasses.push(NewClass);
    return NewClass;
  };

  /**
   * This method is invoked by extend() whenever you pass a parameter into the
   * extend() method that is not a mixin instance.  You normally will not need
   * to call this method directly but you may want to override it to implement
   * more sophisticated handling of passed in properties.
   * 
   * The default implementation throws an exception unless you pass in a 
   * function like you would for a mixin.
   * 
   * @param  {Object} desc The descriptor that was passed into extend()
   * @return {Mixin} a constructed mixin to apply
   */
  Class.prepareMixin = _createMixin;

  Class.reopen = function() {
    applyArguments(this, this.PrototypeMixin, arguments);
    applyToSubclasses(this, {}, function(Class) {
      if (!getMeta(Class, false).prepared) return false;
      Class.PrototypeMixin.apply(Class.prototype);
    });
    return this;    
  };

  Class.reopenClass = function() {
    applyArguments(this, this.ClassMixin, arguments);
    applyToSubclasses(this, {}, function(Class) {
      Class.ClassMixin.apply(Class);
    });
    return this;    
  };


  Class.subclasses = [];

  /**
   * Invoked the first time a class is instantiated to prepare the instance 
   * for use.  Usually you will not need to call or override this method.
   * However you may sometimes want to override it if you want to perform some
   * one time setup on the class before it is first used in an instance.
   * 
   * @return {void}
   */
  Class.prepareClass = function() {
    _applyMixin(this.prototype, this.PrototypeMixin, {});
    getMeta(this).prepared = true;   
  };
});

PrototypeMixin = new Mixin(function() {
  
});

Class.ClassMixin = ClassMixin;
Class.PrototypeMixin = PrototypeMixin;
_applyMixin(Class, ClassMixin, {});

Mixin.ClassMixin = new Mixin(ClassMixin, function(Mixin) {
  
  function _applyMixins(MixinClass, obj, mixins, offset) {
    var len = mixins.length, seen = {};
    for(;offset<len;offset++) {
      _applyMixin(obj, _ensureMixin(MixinClass, mixins[offset], 'apply'), seen);
    }
  }

  /**
   * Static version of Mixin#apply.  This will apply any passed mixins to the 
   * passed object.  In addition to regular mixins you can pass any other 
   * parameters what will be accepted by `new Mixin()` and an anonymous mixin 
   * will be created for you.
   * 
   * @param  {Object} obj    Object to apply mixins to
   * @param  {Mixin|Function} mixins.. 
   *         Zero or more mixins or other constructors that will be applied to
   *         the mixin.  Any parameters you can pass to new Mixin() will also
   *         be accepted here. 
   * @return {Object} The same passed object
   */
  Mixin.apply = function(obj, mixins) {
    if ((arguments.length === 2) && (mixins instanceof Array)) {
      _applyMixins(this, obj, mixins, 0);
    } else {
      _applyMixins(this, obj, arguments, 1);
    }
    return obj;
  };

});

Mixin.PrototypeMixin = new Mixin(PrototypeMixin, function() {

  /**
   * @private
   */
  this.init   = _initMixin;

  /**
   * [reopen description]
   * @function
   * @param {Mixin|Function} mixins...
   *        Zero or more mixins or constructors that will be added to the mixin.
   *        By default you can pass only mixins or constructor functions. 
   *        Subclasses of Mixin may add support for additional options.
   *        
   *  @return {Mixin} Receiver
   */
  this.reopen = _initMixin;

  /**
   * @function
   *
   * Applies the receiver mixin to the object.  Any dependent mixins will also
   * be applied.  Mixins are only be applied to an object or any of its 
   * prototype ancestors once.  It is safe to call this method multiple times 
   * on the same object as subsequent calls will have no effect.
   * 
   * @param  {Object} obj Object to apply mixin to.
   * @return {Mixin}
   */
  this.apply  = function(obj) {
    _applyMixin(obj, this, {});
    return this;
  };

  /**
   * Detects if the mixin has been applied to the object.
   * 
   * @param  {Object} obj The object to test
   * @return {Boolean} true if applied
   */
  this.detect = function(obj) {
    return !!getMeta(obj, 'mixins')[getId(this)];
  };

});

_applyMixin(Mixin, Mixin.ClassMixin, {});
Mixin.prepareClass();

exports.Mixin = Mixin;
exports.Class = Class;

 