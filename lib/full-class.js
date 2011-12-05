
var Class = require('./class').Class;
var Accessors = require('./mixins/accessors').Accessors;
var Eventable = require('./mixins/eventable').Eventable;
var Observable = require('./mixins/observable').Observable;
var Bindable   = require('./mixins/bindable').Bindable;

exports.Class = Class.extend(Accessors, Eventable, Observable, Bindable);
