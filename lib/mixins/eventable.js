/**
 *   @module metal/mixins/eventable
 *   
 */


var Mixin = require('../mixin').Mixin;
var META  = require('../meta');
var getMeta = META.getMeta, getId = META.getId;

// make sure we can skip 
var SKIP_KEYS = {};
var THIS_PLACEHOLDER = { isThisPlaceholder: true };

// builds up the past used to register for events.  pushing in the targetId
// is optional
function _listenerPath(eventName, targetId) {
  var ret = ['listeners'];
  var cur = 0, len = eventName.length, next = 0, eventKey;
  while(cur < len) {
    next = eventName.indexOf(':', cur);
    if (next<0) next = eventName.length;
    eventKey = eventName.slice(cur, next);
    ret.push(eventKey);
    cur = next+1;
  }

  // last event key must always be 'all'
  if (eventKey !== 'all') ret.push('all');
  if (targetId) ret.push(targetId);
  return ret;
}

function bind(source, eventName, target, method, deferrable) {
  if (('function' === typeof target) && !method) {
    method = target;
    target = THIS_PLACEHOLDER;
  }

  var listenerPath = ['listeners'];
  var listeners = getMeta(source, _listenerPath(eventName, getId(target)));  
  listeners[getId(method)] = {
    target: target,
    method: method,
    deferred: deferrable !== false // default to deferrable
  };
}

function unbind(source, eventName, target, method) {
  if (('function' === typeof target) && !method) {
    method = target;
    target = THIS_PLACEHOLDER;
  }

  var listeners = getMeta(source, _listenerPath(eventName, getId(target)), false);
  if (listeners) listeners[getId(method)] = null;
}

function _invoke(target, method, source, args, deferred) {
  if (deferred) {
    // push args, removing the deferred flag at end
    deferQueue.push(Array.prototype.slice.call(arguments, 0, -1));
  } else {
    if (target === THIS_PLACEHOLDER) target = source;
    if ('string' === typeof method) method = target[method];
    method.apply(target, args);
  }
}

function _notify(listeners, source, eventName, args) {
  var targetId, methodId, infos, info;
  if (!listeners) return;
  for(targetId in listeners) {
    if ((targetId in SKIP_KEYS) || !listeners[targetId]) continue;
    infos = listeners[targetId];
    for(methodId in infos) {
      if (methodId in SKIP_KEYS) continue;
      info = infos[methodId];
      if (info) _invoke(info.target, info.method, source, args, info.deferred);
    }
  }   
}


function _trigger(source, eventName, args) {
  var path = _listenerPath(eventName);
  suspend();
  while(path.length > 1) {
    _notify(getMeta(source, path, false), source, eventName, args);
    path = path.slice(0, -2);
    path.push('all');
  }
  resume();
}

function trigger(source, eventName) {
  _trigger(source, eventName, Array.prototype.slice.call(arguments, 1));
}

var deferLevel = 0, deferQueue = [];

function _flush() {

  function iter(args) {
    _invoke.apply(this, args);
  }

  while(deferLevel <= 0 && deferQueue.length>0) {
    var queue  = deferQueue;
    deferQueue = []; 
    suspend();
    queue.forEach(iter);
    resume();
  }
}

// begins a suspended loop
function suspend() {
  deferLevel++;  
}

function resume() {
  if (deferLevel>0) deferLevel--;
  if (deferLevel<=0) _flush();
}

exports.Eventable = new Mixin(function(Eventable) {
  
  Eventable.bind = function(eventName, target, method, deferrable) {
    bind(this, eventName, target, method, deferrable);    
  };

  Eventable.unbind = function(eventName, target, method) {
    unbind(this, eventName, target, method);    
  };

  Eventable.trigger = function(eventName) {
    _trigger(this, eventName, arguments);
  };

});

exports.Eventable.suspend = suspend;
exports.Eventable.resume  = resume;

exports.bind    = bind;
exports.unbind  = unbind;
exports.trigger = trigger;
exports.suspend = suspend;
exports.resume  = resume;
