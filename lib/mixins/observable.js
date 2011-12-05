
var MIXIN     = require('../mixin');
var Accessors = require('./accessors').Accessors;
var Eventable = require('./eventable').Eventable;

exports.Observable = MIXIN.create(Accessors, Eventable, function() {
  
});

