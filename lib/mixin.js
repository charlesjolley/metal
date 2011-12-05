
/**
  @module metal/mixins

  A mixin is an object that can extend another object and will only be 
  applied once.  Mixins can require other mixins, which will ensure they will
  also only be applied once.
  
  All mixins contain simply an array of functions that will be called to apply
  the actual mixin.
  
  To define a mixin, use the create method:
  
      var MIXIN = reauire('metal/mixins');
      var MyMixin = MIXIN.create({
        foo: 'bar',
        doSomething: function() {}
      });
      
      // or use a constructor
      var MyMixin = MIXIN.create(function(obj) {
        obj.foo = 'bar';
        obj.doSomething = function() {};
      });
      
  To define a mixin that requires another mixin to be applied first:
  
      var MIXIN = require('metal/mixins');
      var MyMixin = require('my_mixin');
      
      var NextMixin = MIXIN.create(MyMixin, {
      
      });
      
  = Mixin Builders

  The `this` context of a mixin constructor function always points to a 
  special has called 'mixin helpers'.  A unique mixin methods hash is defined
  for each object a mixin is applied to.  Your mixin can actually modify this
  hash to include new helpers.  For example, here is how you might define
  new accessor helpers:
  
      var Accessors = MIXIN.create(function(obj) {
      
        function caps(keyName) {
          return keyName.slice(0,1).toUppercase() + keyName.slice(1)
        }
        
        this.getter = function(keyName) {
          var methodName = 'get' + caps(keyName);
          var propertyName = '_'+keyName;
        
          this.target[methodName] = function() {
            return this[propertyName];
          };
        };
          
        this.setter = function(keyName) {
          var methodName = 'set' + caps(keyName);
          var propertyName = '_'+keyName;
          this.target[methodName] = function(value) {
            this[propertyName] = value;
            return value;
          };
        };
          
        this.attr = function(keyName) {
          this.getter(keyName);
          this.setter(keyName);
        };
        
      });
      
      
      var MyMixin = MIXIN.create(Accessors, function() {
        this.getter('foo');
        this.attr('bar');
      });

      // CoffeeScript
      MyMixin = MIXIN.create Accessors, ->
        @getter 'foo'
        @setter 'bar'
        
*/

// API
var META = require('./meta');

// skip built-in properties
var SKIP_KEYS = {};

function _makeHandler(props) {
  return function(obj, mixin) {
    this.defineProperties(obj, props, mixin);
  };
}

var Mixin = function(args) {
  if (args.length === 1) {
    var handler = args[0];
    if ('function' !== typeof handler) handler = _makeHandler(handler);
    this.handler = handler;
    this.mixins  = [];
  } else {
    var len = args.length, idx, mixin;
    var mixins = [];
    for(idx=0;idx<len; idx++) {
      mixin = args[idx];
      if (!mixin instanceof Mixin) mixin = Mixin.create(mixin);
      mixins.push(mixin);    
    }
  }
};

function K() {}

var HELPERS = {
  
  __ready__: true,
  
  defineHelper: function(keyName, func) {
    var _super = this[keyName] || K;
    var helper = function() {
      var prev = this._super, ret;
      this._super = _super;
      ret = func.apply(this, arguments);
      this._super = prev;
      return ret;
    };

    this[keyName] = helper;
    helper._func = func;
    return this;
  },

  defineHelpers: function(props) {
    for(var key in props) {
      if (props.hasOwnProperty(key)) this.defineHelper(key, props[key]);
    }
  },

  defineProperties: function(props) {
    for(var key in props) {
      if (!props.hasOwnProperty(key) && (key in SKIP_KEYS)) continue;
      this.defineProperty(key, props[key]);
    }
  },
  
  defineProperty: function(keyName, value) {
    this.target[keyName] = value;
  } 
};

function _applyHandler(obj, handler, mixin) {
  var helpers = META.getMeta(obj, 'mixinHelpers'), prev;
  if (!helpers.__ready__) {
    for(var key in HELPERS) {
      if (HELPERS.hasOwnProperty(key)) helpers[key] = HELPERS[key];
    }
  }
  
  prev = helpers.target;
  helpers.target = obj;
  handler.apply(helpers, obj, mixin);
  helpers.target = prev;
}

Mixin.prototype.apply = function(obj) {
  var meta = META.getMeta(obj, 'mixins'),
      id   = META.getId(this);
  
  if (meta[id]) return this;
  meta[id] = this; // avoid circular loops
  
  this.mixins.forEach(function(mixin) {
    mixin.apply(obj);
  });

  if (this.willApply) this.willApply(obj);
  if (this.handler) _applyHandler(obj, this.handler, this);
  if (this.didApply)  this.didApply(obj);
  
  return this;
};

/**
  Adds more mixins to the current mixin.  Note that this will not update 
  objects to which the mixin has already been applied.
  
  @param {Mixin,Function...} mixins
    Zero or more mixins, constructor functions or property hashes.  Anything
    that is not an actual mixin instance will be converted to a mixin.
    
  @returns {Mixin} receiver
*/
Mixin.prototype.reopen = function() {
  this._reopen(arguments);
  return this;
};

Mixin.prototype._reopen = function(args) {

  var mixins = this.mixins, mixin;
  
  // reopened mixins can only be composite
  if (this.handler) {
    mixins.push(Mixin.create(this.handler));
    this.handler = null;
  }

  var len = args.length;
  for(var idx=0;idx<len;idx++) {
    mixin = args[idx];
    if (!mixin instanceof Mixin) mixin = Mixin.create(mixin);
    mixins.push(mixin);
  }
  
  return this;
};

/**
  Creates a new mixin.  Accepts zero or more dependent mixin instances and 
  finally a hash of properties or a constructor function.  When the mixin 
  instance is applied to an object, it will ensure that any dependent mixins
  are applied first and then will invoke the properties or constructor 
  function on itself.  Mixins will only be applied to an object once.
*/
exports.create = function create() {
  return new Mixin(arguments);
};

Mixin.create = exports.create;

function _apply(obj, args, offset) {
  var len = args.length;
  for(var idx=offset;idx<len;idx++) {
    var mixin = args[idx];
    if ('function' === typeof mixin) {
      _applyHandler(obj, mixin, null); // fast path for common case
    } else {
      if (!mixin instanceof Mixin) mixin = Mixin.create(mixin);
      mixin.apply(obj);
    }
  }
}

exports._apply = _apply;

/**
  Applies zero or more mixins to the passed object.
*/
exports.apply = function apply(obj) {
  return _apply(obj, arguments, 1);
};

exports.Mixin = Mixin;
