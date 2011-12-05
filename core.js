
/*globals trigger suspend resume */

// TODO: Strip out calls during minification
function bolt_assert(check, msg) {
  if ('function' === typeof test) test = test()!==false;
  if (!test) throw new Error("assertion failed: "+desc);
}

// ..........................................................
// ES5 compatibility
// 

// TODO: swap in compatibility modes if supporting < IE8.
var o_create = Object.create;
var o_defineProperty = Object.defineProperty ;
var d_now = Date.now;
var a_slice = Array.prototype.slice;
var a_join  = Array.prototype.join;
var currentEvent;

// ..........................................................
// UTILS
// 

var ID_BASE = '_bolt_'+d_now()+'_';
var META_KEY = ID_BASE+'meta';

var META_DESC = {
  writable:     true,
  enumerable:   false,
  configurable: true,
  value:        null
};

/**
  Generates a new runtime unique Id.
*/
function generateId() {
  return ID_BASE+d_now();
}

function m_copy(obj) {
  var ret = o_create(this);
  ret.prototype = this;
  ret.source = obj;
  return ret;
}

function m_getter(obj, key) {
  return obj[key];
}

function m_setter(obj, key, value) {
  obj[key] = value;
}

function m_get(key, writable, def) {
  if (writable && !this.hasOwnProperty(key)) {
    this[key] = o_create(this[key] || def);
  }
  return this[key] || def ;
}

function K() {}

function _wrap(base, next) {
  return function() {
    var old = this._super, ret;
    this._super = base || K;
    ret = next.apply(this, arguments);
    this._super = old;
    return ret;
  };
}

// extends the current meta by applying any passed functions or hashes, 
// enhancing the current values.
function m_extend(props) {
  var value;

  for(var key in props) {
    if (!props.hasOwnProperty(key)) continue;
    value = props[key];

    if ('function' === typeof value) {
      bolt_assert('The meta property '+key+' cannot be a function', 
        !this[key] || ('function' !== typeof this[key]));
      this[key] = _wrap(this[key], value);
    } else {
      bolt_assert('meta.extend() currently only supports functions', false);
    }
  }
}

var EMPTY_META = {
  getter: m_getter,
  setter: m_setter,
  fake:   true
};


/**
  Returns the meta hash for the specified object.  Unless writable is false,
  the returned hash can be modified.  If writable is false, then you should
  not modify any property in the hash.
*/
function getMeta(obj, writable) {
  bolt_assert("You must pass an object to SC.meta. This was probably called from Bolt internals, so you probably called a Bold method with undefined that was expecting an object", typeof obj === 'object');

  var ret = obj[META_KEY];
  if (writable===false) return ret || EMPTY_META;

  if (!ret) {
    o_defineProperty(obj, META_KEY, META_DESC);
    ret = obj[META_KEY] = o_create(EMPTY_META);
    ret.source    = obj;
    ret.prototype = null;
    ret.copy      = m_copy;
    ret.extend    = m_extend;
    ret.get       = m_get;
    
  } else if (ret.source !== obj) {
    ret = obj[META_KEY] = ret.copy(obj);
  }

  return ret;
}

/**
  Returns true if the object has its own meta hash already.  Otherwise the 
  object is inheriting its meta from its parent or hasn't had a meta added
  yet.
*/
function hasOwnMeta(obj) {
  return obj && obj[META_KEY] && obj[META_KEY].source === obj;
}

/**
  Returns a unique ID for the named object.  This will create/attach a meta 
  object if needed.
*/
function getId(obj) {
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
      var m = getMeta(obj, true);
      if (!m.hasOwnProperty('id')) m.id = generateId();
      return m.id;
    }
  }

  return '('+type+':'+obj.toString()+')';
}

exports.generateId = generateId;
exports.getId = getId;
exports.getMeta = getMeta;

function _pushPath(ary, path, separator, requiredLastItem) {
  var len = path.length, idx = 0, next, component;
  while(idx<len) {
    next = path.indexOf(separator, idx+1);
    if (next<0) next = len;
    component = path.slice(idx, next);
    bolt_assert(requiredLastItem+' cannot be used except at end of path',
      !requiredLastItem || (component !== requiredLastItem) || (next >= len));
    if (component.length>0) ary.push(component);
  }
  
  if (requiredLastItem && (ary[ary.length-1] !== requiredLastItem)) {
    ary.push(requiredLastItem);
  }
  return ary;
}

// TODO: cache results to reduce memory churn?
function _eventName() {
  return a_join.call(arguments, ':');
}

// ..........................................................
// GET/SET
// 

/**
  Returns the object on the key.  Uses a default getting in the meta
*/
function get(obj, key) {
  return getMeta(obj, false).getter(obj, key);
}

/**
  Modifies the property using a default setter in the meta.
*/
function set(obj, key, value) {
  trigger(obj, _eventName('beforechange', key), obj, key);
  getMeta(obj, false).setter(obj, key, value);
  trigger(obj, _eventName('change', key), obj, key);

  return value;
}

var PATH_COMPONENTS = [];

function getPath(obj, path) {
  var components = PATH_COMPONENTS.length===0 ? PATH_COMPONENTS : [];
  _pushPath(components, path, '.');
  var len = components.length, idx;
  for(idx=0; obj && idx<len; idx++) {
    obj = get(obj, components[idx]);
  }
  components.length = 0; //reset
  return obj;
}

function setPath(obj, path, value) {
  var components = PATH_COMPONENTS.length===0 ? PATH_COMPONENTS : [];
  _pushPath(components, path, '.');
  var len = components.length-1, idx;
  for(idx=0; obj && idx<len; idx++) {
    obj = get(obj, components[idx]);
  }

  if (obj) set(obj, components[len-1], value);
  return value;
}

exports.get = get;
exports.set = set;
exports.getPath = getPath;
exports.setPath = setPath;

// ..........................................................
// EVENTS
// 
// Simple event system based on meta to support listeners

function _walkMetaKeys(root, createIfNeeded, items, tmpl) {
  var len = items.length, key, cur = -1;
  while(root && (++cur < len)) {
    key = items[cur];
    if (!root.hasOwnProperty(key)) {
      if (createIfNeeded) root = root[key] = o_create(root[key] || tmpl);
      else root = null;
    } else root = root[key];
  }
  return root;
}

var LISTENERS_TMPL = {};
var LISTENERS_COUNT_KEY = ID_BASE+'count';

// walks down the listeners chain until it finds the final node for the 
// specified path.  This node will always be stored in a '*' key.
function _getListeners(obj, path, createIfNeeded) {
  if (!createIfNeeded && !hasOwnMeta(obj)) return null ; // no listeners
  return _walkMetaKeys(obj, createIfNeeded, 
    _pushPath(['listeners'], path, '.', '*', LISTENERS_TMPL));
}

// walks down the chain of nodes for the passed event.  Always returns the
// listeners for 'all'.  This allows for chained notifications.
function _getEventListeners(node, event, createIfNeeded) {
  return _walkMetaKeys(node, createIfNeeded, 
    _pushPath([], event, ':', 'all', LISTENERS_TMPL));
}

var WATCHER_KEY = ID_BASE+'watcher';

// determines if there are any event listeners on the current path then adds
// or removes the current object/path if needed.
function _resetWatcher(node, path) {
  var target = path === '*' ? node : getPath(node, path);
  if (!target) return; // no target to update
  
  var listeners = _getListeners(node, path, false),
      nodeId    = getId(node),
      watchers;
      
  // set or clear watcher flag to enable/disable
  watchers = _walkMetaKeys(getMeta(target, true), true, ['watchers', nodeId]);
  watchers[WATCHER_KEY] = node;
  watchers[path] = listeners[LISTENERS_COUNT_KEY] <= 0;
}

function identityXform(args) {
  return args;
}

var bindObject, bindPath, bindEvent, bindTarget, bindFunc, bindXform, bindDeferrable;

// Shared utility method that will populate some module variables with 
// normalized arguments.  Used by both bind and unbind. 
function extractBindArguments(methodName, args) {
  
  var offset;
  
  bindObject = args[0];
  bolt_assert(methodName+' requires at least an object, event, and funcion',
    args.length < 3);
    
  // detect bind(obj, [PATH], event, ...)
  if (typeof args[2] === 'string') {
    bindPath  = args[1];
    bindEvent = args[2];
    offset = 2;
    
  // path not included.
  } else {
    bindPath  = null;
    bindEvent = args[1];
    offset = 3;
  }
    
  bindTarget = args[offset];
  bindFunc   = args[offset+1];
  
  // detect bind(..., [target], func) vs (..., func)
  if (!bindFunc) {
    bolt_assert(methodName+' requires a callback function or target/method',
      typeof bindTarget === 'function');
    bindFunc = bindTarget;
    bindTarget = bindXform = null;
    bindDeferrable = true;
    
  // xform && deferrable are only valid if a target is passed
  } else {
    bindXform = args[offset+2];
    bindDeferrable = args[offset+3] !== false; // def to true
  }
  
  if (!bindTarget) bindTarget = bindObject;
  if (!bindPath)   bindPath   = '*';
}

/**
  Binds an event listener to a particular object.  This is functionally 
  identical to the bind method in Backbone with some additional features:
  
      * You can define a target/function pair instead of having to create a 
        unique binding.
        
      * You can define an arbtirary transform function that will be applied 
        before invoking your function.  This allows you to implement high
        level abstractions on top of it.
        
      * You can pass an optional property path before the event name which
        will setup the listener down the property path.  Changes to the 
        objects in the property path will automatically update.
        
    Thus there are several possible call signatures:
    
        bolt.bind(obj, event, func);
        bolt.bind(obj, 'foo.bar', event, func);
        bolt.bind(obj, event, target, func, xform);
        bold.bind(obj, 'foo.bar', event, target, func, xform, immediate);
        
    
*/
function bind(obj) {
  
  extractBindArguments('bind', arguments);
    
  // register chain.
  var listeners = _getListeners(bindObject, bindPath, true);
  var targetId  = getId(bindTarget);
  
  listeners = _getEventListeners(listeners, bindEvent, true);
  listeners[LISTENERS_COUNT_KEY]++;
  
  listeners = listeners[targetId] = (listeners[targetId] || {});
  listeners[LISTENERS_COUNT_KEY]++;

  listeners[getId(bindFunc)] = {
    target: bindTarget, 
    func:   bindFunc, 
    xform:  bindXform || identityXform,
    deferrable: bindDeferrable
   };

  // make sure notifications are sent properly
  _resetWatcher(bindObject, bindPath);
  return this;
}

/**
  Available signatures:

    unbind(obj, event, func);
    unbind(obj, path, event, func);
    unbind(obj, event, target, func);
    unbind(obj, path, event, target, func)
*/
function unbind(obj) {
  extractBindArguments('unbind', arguments);
  var listeners = _getListeners(bindObject, bindPath, false);
  if (!listeners) return this; // no event listeners for the path
  
  listeners = _getEventListeners(listeners, bindEvent, false);
  if (!listeners) return this; // listeners for this event
  listeners[LISTENERS_COUNT_KEY]--;
  
  // to remove a listener, overwrite the setting instead of using 'delete'
  // since we are using inherited events.
  var targetId = getId(bindTarget), funcId = getId(bindFunc);
  listeners = listeners[targetId];
  if (!listeners || !listeners[funcId]) return this; // not a listener

  listeners[LISTENERS_COUNT_KEY]--;
  listeners[getId(bindFunc)] = null;
  
  // cleanup notifications if needed
  _resetWatcher(bindObject, bindPath);
  
  return this;
}

// queue of deferred events.  call flush() to immediately call listeners
var deferred = [];
var deferLevel = 0;

// make sure to skip any keys defined on Object.prototype
var SKIP_KEYS = {};
SKIP_KEYS[LISTENERS_COUNT_KEY] = true;

function _notifyListeners(listeners, args) {
  var targetId, profiles, funcId, profile, func;
  for(targetId in listeners) {
    if (targetId in SKIP_KEYS) continue;
    profiles = listeners[targetId];
    for(funcId in profiles) {
      if (funcId in SKIP_KEYS) continue;
      profile = profiles[funcId];
      func = profile.func;
      if ('string' === typeof func) func = get(profile.target, func);
      bolt_assert('listener '+profile.func+' must resolve to a function',
        'function' === typeof func);
      
      var transformedArgs = profile.xform(args, profile.target, profile.func);
      if (profile.deferrable) {
        deferred.push({
          func:   func, 
          target: profile.target,
          args:   transformedArgs,
          event:  currentEvent
        });
      } else {
        func.apply(profile.target, transformedArgs); // invoke immediately
      }
    }
  }
}

function _trigger(onObject, eventName, watcherObject, path, args) {
  var listeners = _getListeners(watcherObject, path, false);
  if (!listeners) return this; // no event listeners on this path

  var len = eventName.length, key, idx = 0, next;
  while(listeners && idx<len) {

    // notify listeners on the 'all' event then walk down chain.
    _notifyListeners(listeners.all, args);
    
    next = eventName.indexOf(':', idx);
    if (next<0) next = len;
    key = eventName.slice(idx, next);
    listeners = listeners[key];
    idx = next+1;
  }
}

function flush(force) {
  while (deferred.length>0 && (deferLevel <= 0 || force===true)) {
    var queue = deferred, len = queue.length, idx, profile;
    deferred  = [];
    var oldEvent = currentEvent;
    
    for(idx=0;idx<len;idx++) {
      profile = queue[idx];
      currentEvent = exports.currentEvent = profile.event;
      profile.func.call(profile.target, profile.args);
    }
    currentEvent = oldEvent;
  }
}

// suspend deferrable event notifications
function suspend() {
  deferLevel++;
}

// resume deferrable event notifications.  be sure to also call flush.
function resume() {
  deferLevel--;
}

/**
  Triggers an event handler.  Note that while the event is processing, 
  additional (deferrable) events are suspended minimize "echoing".
*/
function trigger(obj, eventName, event) {
  var watchers = _walkMetaKeys(getMeta(obj, false), false, ['watchers']);
  var watcherObject, paths, watcherId, path;
  
  var args = a_slice.call(arguments, 2);
  
  var baseEvent = {
    target:    obj,
    eventName: eventName,
    data:      args
  };
  
  var oldEvent = currentEvent;
  
  args.length = args.length+3; // add space for default params.
  
  for(watcherId in watchers) {
    if (watcherId in SKIP_KEYS) continue;
    paths = watchers[watcherId];
    watcherObject  = paths[WATCHER_KEY];
    for(path in paths) {
      if (path in SKIP_KEYS || path === WATCHER_KEY) continue;
      
      // clone event for each call to a different watcher object because 
      // the source and path need to be saved in the case of deferred 
      // listeners.
      currentEvent = exports.currentEvent = o_create(baseEvent);
      currentEvent.source     = watcherObject;
      currentEvent.sourcePath = path;
      _trigger(obj, eventName, watcherObject, path, args);
      currentEvent = exports.currentEvent = oldEvent;
    }
  }

  // invoke deferred event notifications.
  flush();
}

function resetListeners(obj) {
  var meta = getMeta(obj, true);
  meta.listeners = null; // boom!
}

exports.bind    = bind;
exports.unbind  = unbind;
exports.trigger = trigger;
exports.suspend = suspend;
exports.resume  = resume;
exports.flush   = flush;
exports.resetListeners = resetListeners;

