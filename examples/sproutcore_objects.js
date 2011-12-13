
var Class = require('metal').Class;
var Mixin = require('metal').Mixin;


var SC = exports;

function _wrapMethod(func) {
  return function() {
    var _super = this._super;
    this._super = this[key];
    var ret = func.apply(this, arguments);
    this._super = _super;
    return ret;
  };
}

function _preparemMixin(desc, Target) {
  if ('object' === typeof desc) {
    return new Mixin(function() {
      var value;
      for(var key in desc) {
        if (!desc.hasOwnProperty(key)) continue;
        value = desc[key];
        if ('function' === typeof value) value = _wrapMethod(value, this[key]);
        this[key] = value;
      }
    });
  } else {
    return Mixin.prepareMixin.call(this, desc, Target);
  }
}

SC.Mixin = Mixin.extend();
SC.Mixin.reopenClass(function() {
  this.prepareMixin = _prepareMixin;
  this.create = function() {
    var Ret = new SC.Mixin();
    var len = arguments.length;
    for(var idx=0;idx<len;idx++) Ret.reopen(arguments[idx]);
    return Ret;
  };
});


SC.Accessors = SC.Mixin.create({
  
  get: function(keyName) {
    return this[keyName];
  },

  set: function(keyName, value) {
    this[keyName] = value;
    return this;
  }

});

SC.Object = Class.extend(Accessors);
SC.Object.reopenClass(function() {
  this.prepareMixin = _prepareMixin;

  this.create = function() {
    var TmpClass = this.extend.apply(this, arguments);
    return new TmpClass();
  };

});

//.........................
// USAGE

var Contact = SC.Object.extend({

  firstName: null,
  lastName:  null,

  fullName: function() {
    return [this.get('firstName'), this.get('lastName')].join(' ');
  }.property('firstName', 'lastName').cacheable()
  
});

contact = Contact.create({
  firstName: 'Barack',
  lastName:  'Obama'  
});







