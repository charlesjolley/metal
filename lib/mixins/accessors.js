
var MIXIN = require('../mixin');
var META  = require('../meta');
var Eventable = require('./eventable').Eventable;

var getMeta = META.getMeta;
var makeEventName = Eventable.makeEventName;

function _makeComputed(handler) {
  var cacheable = false,
      value     = undefined,
      isCached  = false;

  var ret = function(keyName, value) {
    if (value === undefined) {
      if (isCached) return value;
      if (!cacheable) return handler.call(this, keyName) ;
      value = handler.call(this, keyName);
      isCached = true;
      return value;

    } else {
      var tmp = handler.call(this, keyName, value);
      if (cacheable) {
        isCached = true;
        value    = tmp;
      }
      return tmp;
    }
  };
  
  ret.cacheable = function(flag) {
    cacheable = flag !== false;
    return this.valueDidChange();
  };
  
  ret.valueDidChange = function() {
    isCached = false;
    value    = undefined;
    return this;
  };
  
  return ret;
}

/**
  @mixin
  
  Adds a generic facility for defining accessor functions on an object.
  
  = Examples
  
  Defining a few basic computed properties:
  
      Contact = MIXIN.apply({}, Accessors, function(obj) {
      
        this.properties('firstName', 'lastName');

        this.computed('fullName', function() {
          return [this.get('firstName'), this.get('lastName')].join(' ');
        }).cacheable();

        this.method()
      });
      
*/
exports.Accessors = MIXIN.create(Eventable, function() {

  function _get(obj, keyName) {
    var getter = getMeta(obj, 'getters')[keyName];
    return getter ? getter.call(obj, keyName) : obj[keyName];
  }
  
  function _set(obj, keyName, value) {
    var setter = getMeta(obj, 'setters')[keyName];
    obj.trigger(makeEventName('beforechange', keyName) , value);
    if (setter) {
      if (setter.valueWillChange) setter.valueWillChange();
      setter.call(obj, keyName, value);
      if (setter.valueDidChange) setter.valueDidChange();
    } else {
      obj[keyName] = value;
    }
    obj.trigger(makeEventName('change', keyName), value);
  }
  
  function _everyKey(keyPath, ret, callback) {
    var len = keyPath.length, idx=0, next, keyName;
    while(ret && idx<len) {
      next = keyPath.indexOf('.', idx);
      if (next<0) next = len;
      keyName = (idx===0 && next>=len) ? keyPath : keyPath.slice(idx, next);
      ret = callback(ret, keyName, next>=len);
      idx = next+1;
    }
    return ret;
  }
  
  // add universal accessors
  this.defineProperties(/** @scope exports.Accessors */{

    /**
      Retrieves the passed key path on the object, invoking any accessor
      functions along the way.  If any key along the path returns null or 
      undefined, then returns null or undefined.
      
      @param {String} keyPath
        A key or key path to return.
        
      @returns {Object} the found value
    */
    get: function(keyPath) {
      return _everyKey(keyPath, this, _get);
    },

    /**
      Sets the passed key path to the specified value, invoking any accessor
      functions along the way.  If any key along the path returns null or 
      undefined, an exception will be raised.
      
      @param {String} keyPath
        A key or key path to set.
        
      @param {Object} value
        The value to set
        
      @returns {Object} the value that was passed
    */
    set: function(keyPath, value) {
      _everyKey(keyPath, this, function(obj, keyName, isLast) {
        if (isLast) {
          _set(obj, keyName, value);
          return true;
        } else {
          obj = _get(obj, keyName);
          if (!obj) throw new Error(keyName+' is undefined');
          return obj;
        }
      });
      
      return value;
    }
  });
  
  // add helpers
  this.defineHelpers({
    getter: function(keyName, handler) {
      getMeta(this.target, 'getters')[keyName] = handler;
      return this;
    },
    
    setter: function(keyName, handler) {
      getMeta(this.target, 'setters')[keyName] = handler;
      return this;
    },
  
    computed: function(keyName, handler) {
      handler = _makeComputed(keyName, handler);
      getMeta(this.target, 'getters')[keyName] = handler;
      getMeta(this.target, 'setters')[keyName] = handler;
      return handler;
    }
  });
  
});
