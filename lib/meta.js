/** @module metal/meta */

var platform = require('./platform');

// TODO: Can we define this somewhere and have build tools remove it on
// production build?
function bolt_assert(check, msg) {
  if ('function' === typeof test) test = test()!==false;
  if (!test) throw new Error("assertion failed: "+desc);
}

var o_defineProperty = platform.defineProperty;
var o_create         = platform.create;
var o_getPrototypeOf = platform.getPrototypeOf;
var d_now            = Date.now;
var a_join           = Array.prototype.join;

var ID_BASE = '_bolt_'+d_now()+'_';
var uuid = 0;
var generateId, getId, getMeta;


/**
  Generates a new runtime-unique ID.  These ID's will reset each time you
  reload the app.  They should not be used in any permanently stored data.
  
  @returns {String} id
*/
exports.generateId = generateId = function() {
  return 'bolt'+uuid++;
};

function makeError(defaultMessage, Base) {
  if (!Base) Base = Error;
  var ret = function() {
    Base.call(this);
  };

  ret.prototype = o_create(Base.prototype);
  ret.message = defaultMessage;
  return ret;
}

var UnsupportedType = makeError('Unsupported Meta Type');
exports.UnsupportedType = UnsupportedType;

function _checkUnsupportedType(obj) {
  var type = typeof obj;
  if (('object' !== type && 'function' !== type) || 
      (obj === null || obj === undefined)) throw new UnsupportedType(); 
}

var meta;

/**
  Returns a unique ID for the named object.  The ID for a given object will
  remain constant through the current application runtime, but will change
  on each reload.  Use this ID like you would use a pointer in C.
  
  @param {Object} obj
    Object for the ID.
    
  @returns {String} id
*/
exports.getId = getId = function(obj) {
  // special cases where we don't want to add a key to object
  if (obj === undefined) return "(undefined)";
  if (obj === null) return "(null)";

  var type = typeof obj;

  // Don't allow prototype changes to String etc. to change the guidFor
  if (type === 'object' || type === 'function') {
    if (obj instanceof Number) {
      type = 'number';
    } else if (obj instanceof String) {
      type = 'string';
    } else if (obj instanceof Boolean) {
      type = 'boolean';
    } else {
      var m = exports.getMeta(obj);
      if (!m.hasOwnProperty('id')) m.id = generateId();
      return m.id;
    }
  }

  return '('+type+':'+obj.toString()+')';
};

// ..........................................................
// THE META OBJECT
// 

var META_KEY  = ID_BASE+'meta';

var META_DESC = {
  writable:     true,
  enumerable:   false,
  configurable: true,
  value:        null
};

/**
  The base class for the 'meta' object that is attached to an object when
  you call getMeta().  In general you should never directly access or modify
  the Meta class or instances.  Instead use getMeta() to manage instead.
  
  This class is exposed only so you can do instanceof tests.
  
  @constructor
*/
var Meta = exports.Meta = function Meta(obj) {
  this.owner = obj;
};

// META HELPER OBJECTS GO HERE

var Mp = Meta.prototype;
Mp._copy = function(obj) {
  var ret = o_create(this);
  ret.owner  = obj;
  ret.id     = generateId();
  return ret;
};

function _getMeta(obj, writable, keys, offset, len) {

  if (!obj) return null;

  // get first meta
  var meta = obj[META_KEY];
  if (!meta) {
    if (!writable) return null;
    
    meta = new Meta(obj);
    META_DESC.value = meta;
    o_defineProperty(obj, META_KEY, META_DESC);
    META_DESC.value = null;

  } else if (!obj.hasOwnProperty(META_KEY)) {
    _getMeta(o_getPrototypeOf(obj), true, null, 0, 0);
    meta = obj[META_KEY] = obj[META_KEY]._copy(obj);

  } else {
    meta = obj[META_KEY];
  }

  var ret = meta,
      validated = false,
      idx, keyName, next;
    
  for(idx=offset||0; idx<len; idx++) {
    keyName = keys[idx];
    next    = ret[keyName];
    if (!next) {
      if (!writable) return null;
      next = ret[keyName] = {};
    } else {
      _checkUnsupportedType(next);

      if (!ret.hasOwnProperty(keyName)) {
        if (!validated) { // only need to do this once per cycle
          _getMeta(o_getPrototypeOf(obj), true, keys, offset, len);
          validated = true;
        }

        next = ret[keyName] = o_create(ret[keyName]);
      }
    }
    
    ret = next; 
  }
  
  return ret;
}

/**
  Returns a named hash that can be used to store meta properties about an 
  object.  Meta hashes are a very fast and memory efficient mechanism to 
  implement low-level class-behaviors such as event listeners, property 
  observing and so on.  
  
  Meta hashes are automatically inherited when using prototype inheritence 
  (i.e. with `Object.create()` or `new Object`) and copied only on demand.
  This means you can configure the meta hash on a base class and then have it
  automatically available to instances without any cost.

  To use this method, pass in a reference object along with zero or more key
  names that will be used to return a hash.  The returned hash can then be
  inspected and modified as needed.  
  
  This method will ensure the meta hash returned is unqiue to the object you
  pass in - incorporating any values found up the prototype chain.

  If you do not need to modify the returned hash, you should pass `false` as
  the final parameter.  This will allow the method to skip certain steps, 
  saving on memory.
  
  == Examples
  
  The best way to understand how to use this method is to see it in action 
  with some real code.  For example, Mixins should not be applied more than
  once.  This is implemented by checking the  'mixins' meta:
  
      var meta = require('metal/meta');
      function applyMixin(obj, mixin) {
        var mixinId = meta.getId(mixin);
        var mixins  = meta.getMeta(obj, 'mixins');
        if (mixins[mixinId]) {
          mixins[mixinId] = mixin;
          mixin.handler(obj); // apply actual mixin.
        }
      }
      
  Event listeners use multiple keys to allow for namespacing:
  
      var meta = require('metal/meta');
      function addListener(obj, eventName, func) {
        var cur = meta.getMeta(obj, 'listeners');
        eventName.split(':').forEach(function(key) { 
          if (!cur[key]) cur[key] = {};
          cur = cur[key];
        });

        if (cur.all) cur.all = {};
        cur.all[meta.getId(func)] = func;
      }
      
      function trigger(obj, eventName) {
        var args = Array.prototype.slice.call(arguments, 1);
        var params = [obj, 'listeners'].concat(eventName.split(':'));
        params.push('all');
        
        // call meta - walking down the namespaced set of events.
        var listeners = meta.getMeta.apply(meta, params);
        for(var funcId in listeners) {
          var func = listeners[funcId];
          if ('function' === tpyeof func) func.apply(obj, args);
        }
      }
    
  @param {Object} obj
    The object to retrieve the meta for.
    
  @returns {Object} the meta property
*/
exports.getMeta = function getMeta(obj, keys, _writable) {

  _checkUnsupportedType(obj);

  var len = arguments.length, writable, args, offset;
  
  if ((len < 4) && (keys instanceof Array)) {
    args = keys;
    len  = keys.length;
    offset = 0;
    writable = _writable !== false;
  } else {
    args     = arguments;
    writable = arguments[len-1];
    offset = 1;
    if ('boolean' === typeof writable) {
      len--;
    } else {
      writable = true;
    }
  }

  return _getMeta(obj, writable, args, offset, len);
};
