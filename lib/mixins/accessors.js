
/**
  @module metal/mixins/accessors

  Adds support for generic get() and set() functions to an object.  Whenever you 
  set() a property, the property will also generate the following events:

      beforechange
      beforechange:{PROPERTY_NAME}
      // property changes...
      change:{PROPERTY_NAME}
      change
*/
      
var Mixin = require('../mixin').Mixin;
var Eventable = require('./eventable').Eventable;

var makeEventName = Eventable.makeEventName;

exports.Accessors = new Mixin(Eventable, function() {

  function _join(first, second) {
    return first + second.slice(0,1).toUpperCase() + second.slice(1);  
  }

  function _getter(keyName) {
    // TODO: cache?
    return _join('get', keyName);
  }

  function _setter(keyName) {
    // TODO: cache?
    return _join('set', keyName);
  }

  function _get(obj, keyName) {
    var getterKey = _getter(keyName);
    return 'function' === typeof obj[getterKey] ? obj[getterKey]() : obj[keyName];
  }
  
  function _set(obj, keyName, value) {
    var setterKey = _setter[keyName];
    obj.trigger(makeEventName('beforechange', keyName) , value);
    if ('function' === typeof obj[setterKey]) {
      obj[setterKey](value);
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
  
  /**
    Retrieves the passed key path on the object, invoking any accessor
    functions along the way.  If any key along the path returns null or 
    undefined, then returns null or undefined.
    
    @param {String} keyPath
      A key or key path to return.
      
    @returns {Object} the found value
  */
  this.get = function(keyPath) {
    return _everyKey(keyPath, this, _get);
  };

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
  this.set = function(keyPath, value) {
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
  };

});
  