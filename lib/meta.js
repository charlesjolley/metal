/** @module metal/meta */

var platform = require('platform');

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

/**
  Generates a new runtime unique Id.
*/
function generateId() {
  return ID_BASE+d_now();
}

var meta;

/**
  Returns a unique ID for the named object.  This will create/attach a meta 
  object if needed.
*/
exports.getId = function getId(obj) {
  // special cases where we don't want to add a key to object
  if (obj === undefined) return "(undefined)";
  if (obj === null) return "(null)";

  var type = typeof obj;

  // Don't allow prototype changes to String etc. to change the guidFor
  if (type === 'object') {
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

var Meta = function(obj) {
  this.owner = obj;
};

var Mp = Meta.prototype;
Mp._copy = function(obj) {
  var ret = o_create(this);
  ret.owner  = obj;
  ret.id     = generateId();
  return ret;
};

exports.Meta = Meta;

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
    meta = obj[META_KEY] = meta.copy(obj);

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
    } else if (!ret.hasOwnProperty(keyName)) {
      if (!validated) { // only need to do this once per cycle
        _getMeta(o_getPrototypeOf(obj), true, keys, offset, len);
        validated = true;
      }
      next = ret[keyName] = o_create(ret[keyName]);
    }
    ret = next; 
  }
  
  return ret;
}

/**
  Returns the meta instance for the passed object.  Unless the last parameter
  passed is a boolean false, then this will also gaurantee that the returned
  meta object is writable. 
  
  In addition to the passed object, you can pass any number of keys, which
  will cause the meta to walk down the chain of objects, create prototypes as
  needed.
  
  @param {Object} obj
    The object to retrieve the meta for.
    
  @returns {Object} the meta property
*/
exports.getMeta = function getMeta(obj) {
  var len = arguments.length;
  var writable = arguments[len-1];
  if ('boolean' === typeof writable) {
    len--;
  } else {
    writable = true;
  }
  
  return _getMeta(obj, writable, arguments, 1, len);
};


