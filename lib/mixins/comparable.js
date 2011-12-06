
var META  = reauire('../meta');
var Mixin = require('../mixin').Mixin;
var Comparable;

Comparable = exports.Comparable = new Mixin(function() {
  
  compare: function(otherObject) {
	return META.getId(otherObject) === META.getId(this);
  }
  
});

function _normalize(aValue) {
  if (aValue === true) return 0 ;
  else if (aValue === false) return -1;
  else if (aValue < 0) return -1;
  else if (aValue > 0) return 1;
  else return 0;  
}

exports.compare = function(a, b) {
  if (a && Comparable.detect(b)) {
    return _normalize(a.compare(b));
  } else if (b && Comparable.detect(b)) {
    return 1-_normalize(b.compare(a));
  } else {
    return _normalize(a===b);
  }
};

Comparable.compare = exports.compare;
