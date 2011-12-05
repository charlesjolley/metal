
var MIXIN = require('../mixin');
var META  = require('../meta');

var getMeta = META.getMeta, getId = META.getId;

var SKIP_KEYS = {
  isEventListener: true
};

// placeholder used to represent 'this' in case of inheritence
var THIS_KEY = {}; 

function DEFAULT_XFORM(target, method, source, args) {
  method.apply(target, args);
}

function _trigger(source, eventName, listeners, args) {

  listeners = listeners[eventName];
  if (!listeners) return ;
  
  var target, method, recs, rec, xform;
      
  for(var targetId in listeners) {
    recs = listeners[targetId];
    if (!recs || !recs.isEventListener) continue;
    
    for(var methodId in recs) {
      if (SKIP_KEYS[methodId]) continue;
      rec = recs[methodId];
      
      target = rec.target;
      if (target === THIS_KEY) target = source;
      
      method = rec.method;
      if ('string' === typeof method) method = target[method];
      
      if (method) rec.xform(target, method, source, arguments);
    }
  }
}

/**
  Adds a generic event listening library to the object.
*/
exports.Eventable = MIXIN.create({
  
  /**
    Binds a new event listeners to the passed object.  The listeners will
    also be inherited on any child objects.  This allows you to add listeners
    to a prototype and receive events on instances.
  */
  bind: function(eventName, target, method, xform) {
    if (!method) {
      method = target;
      target = this;
    }
    
    if (target === this) target = THIS_KEY;
    

    var listeners = getMeta(this, 'listeners', eventName, getId(target));
    var methodId  = getId(method);
    
    listeners.isEventListener = true; // make detection easy
    if (!xform) xform = DEFAULT_XFORM;
    listeners[methodId] = { target: target, method: method, xform: xform };
    return this;
  },

  /**
    Removes an event listener.  Applies to the object and any children that
    are inheriting from the parent.
  */
  unbind: function(eventName, target, method) {
    if (!method) {
      method = target;
      target = this;
    }
    
    if (target === this) target = THIS_KEY;
    
    var listeners = getMeta(this, 'listeners', eventName, getId(target));
    // don't delete because properties might be inherited
    listeners[getId(method)] = null;
    return this;
  },

  eventsEnabled: true,
  
  /**
    Triggers an event notification, unless events are disabled.  (See the
    canSendEvents property.)  Any passed parameters will be passed to the
    method.
  */
  trigger: function(eventName) {
    
    if (!this.eventsEnabled) return this;
    
    var listeners = getMeta(this, 'listeners'),
        idx = 0, len = eventName.length, next, currentEventName;

    // this method steps through the event looking for namespaces without 
    // using extra memory like a [].split() would.
    while(idx<len) {
      next = eventName.indexOf(':');
      if (next<0) next = len;
      currentEventName = next>=len ? eventName : eventName.slice(0, next);
      _trigger(this, currentEventName, listeners, arguments);
      idx = next+1;
    }

    return this;
  }
  
});

exports.Eventable.makeEventName = function() {
  return Array.prototype.join.call(arguments, ':');
};
