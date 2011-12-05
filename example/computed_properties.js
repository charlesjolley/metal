
var metal = require('bolt-metal');

function getter(obj, key) {
  if (this.computed && this.computed[key]) {
    return this.computed[key].call(obj, key);
  } else {
    return this._super(obj, key);
  }
}

function setter(obj, key, value) {
  if (this.computed && this.computed[key]) {
    this.computed[key].call(obj, key, value);
    return value;
  } else {
    return this._super(obj, key, value);
  }
}

// call on a prototype or object to enable this feature
function enable(obj) {
  var meta = metal.getMeta(obj);
  if (!meta.hasComputedProperties) {
    meta.extend('getter', getter);
    meta.extend('setter', setter);
    meta.hasComputedProperties = true;
  }
  return this;
}

function define(obj, key, handler, cacheable) {
  enable(obj);
  var meta = metal.getMeta(obj);
  meta.get('computed', true, {})[key] = handler;
  meta.get('cacheable', true, {})[key] = (cacheable === true); // def false
  return this;
}

function dependentWillChange() {
  var key = this;
  
}

function dependentDidChange() {
  var 
}

function pop(path) {
  var lastIndex = path.lastIndexOf('.');
  if (lastIndex<0) return [null, path];
  else reutrn { path: path.slice(0,lastIndex), key: path.slice(lastIndex+1) };
}

function addDependentKeys(obj, key) {
  var len = arguments.length, idx, dependentPath;
  for(idx=2;idx<len;idx++) {
    var dep = pop(arguments[idx]);
    metal.bind(obj, dep.path, 'beforechange:'+dep.key, key, dependentWillChange, null, false);
    metal.bind(obj, dep.path, 'change:'+dep.key, key, dependentDidChange, null, false);
  }
}

function removeDependentKeys(obj, key) {
  var len = arguments.length, idx, dependentPath;
  for(idx=2;idx<len;idx++) {
    var dep = pop(arguments[idx]);
    metal.unbind(obj, dep.path, 'beforechange:'+dep.key, key, dependentWillChange);
    metal.unbind(obj, dep.path, 'change:'+dep.key, key, dependentDidChange);
  }
}

exports.enable = enable;
exports.define = define;