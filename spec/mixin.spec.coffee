
Mixin = require('../lib/mixin').Mixin
o_create = require('../lib/platform').create

describe 'Mixin Basics', () ->

  MyMixin = obj = null

  beforeEach () ->
    MyMixin = new Mixin (object) ->
      object.something = 'foo'

    obj = {}
      
  it "should accept a constructor function", () ->
    expect(MyMixin).not.toBeNull()

  it "should invoke constructor function on mixin when applied", () ->
    MyMixin.apply obj
    expect(obj.something).toEqual 'foo'

  it "should accept dependent mixins which it will also apply before", () ->
    MyMixin2 = new Mixin MyMixin, (object) ->
      object.another = object.something + ' dep'

    MyMixin2.apply obj
    expect(obj.something).toEqual 'foo' # should have applied dependent
    expect(obj.another).toEqual 'foo dep' # should have applied current after dep
    

describe "Mixin constructor", () ->

  it "should pass the object and mixin itself as parameters", () ->
    obj = {}
    didRun = false
    MyMixin = new Mixin (object, mixin) ->
      didRun = true
      expect(object).toEqual obj
      expect(mixin).toEqual MyMixin
    
    MyMixin.apply obj
    expect(didRun).toEqual true # make sure tests ran

  # not sure if this is better or if `this` should point to someplace to store
  # helper functions but this is simplest for now
  it "should set `this` to the object being configured", () ->
    obj = {}
    didRun = false
    MyMixin = new Mixin () ->
      didRun = true
      expect(@).toEqual obj
    
    MyMixin.apply obj
    expect(didRun).toEqual true # make sure tests ran



describe "Applying Mixins more than once", () ->

  count = null
  MyMixin = obj = null

  beforeEach () ->
    count = 0
    MyMixin = new Mixin (object) ->
      count += 1
    obj = {}
  
  it "should only invoke construction function on a given object once", () ->
    MyMixin.apply obj
    MyMixin.apply obj
    expect(count).toEqual 1
  
  it "should not invoke constructor function on inherited objects", () ->
    obj2 = o_create obj
    MyMixin.apply obj
    MyMixin.apply obj2
    expect(count).toEqual 1

  it "should not invoke constructor function when applied indirectly", () ->
    MyMixin2 = new Mixin MyMixin, (target) ->
      target.something = 'foo'

    MyMixin2.apply obj
    expect(count).toEqual 1 # should have applied indirectly

    MyMixin.apply obj
    expect(count).toEqual 1 # should not have applied again

  
describe "Advanced Use Cases", () ->

  describe "invalid parameters", () ->
    for item in [null, "string", 1, true, false, {}]
      do (item) ->
        it "should throw when passed " + item + " (type: "+typeof item+")",() ->
          expect () ->
            mixin = new Mixin(item)
          .toThrow()

  it "should register dependencies and call constructors in order passed", () ->

    Mixin1 = new Mixin () ->
      @called.push 'mixin1'
    
    Mixin2 = new Mixin () ->
      @called.push 'mixin2'

    const1 = () ->
      @called.push 'const1'

    const2 = () ->
      @called.push 'const2'

    Mixin2 = new Mixin const1, Mixin1, Mixin2, const2
    
    obj = { called: [] }
    Mixin2.apply obj
    
    expect(obj.called).toEqual 'const1 mixin1 mixin2 const2'.split(' ') 
  
  it "should work when applying to a function instance", () ->
    
    func = () ->
      
    Mixin1 = new Mixin (obj) ->
      obj.foo = 'bar'

    Mixin1.apply func
    expect(func.foo).toEqual 'bar'

              
describe "circular dependencies", () ->

  Mixin1 = Mixin2 = Mixin3 = obj = null

  beforeEach () ->
    Mixin1 = new Mixin (object) ->
      object.hasMixin1 = 'mixin1'

    Mixin2 = new Mixin Mixin1, (object) ->
      object.hasMixin2 = 'mixin2'

    Mixin3 = new Mixin Mixin2, (object) ->
      object.hasMixin3 = 'mixin3'

    Mixin1.reopen Mixin3
    obj = {}

  it "should apply all mixins without going into a loop", () ->
    Mixin1.apply obj

    expect(obj.hasMixin1).toEqual 'mixin1'
    expect(obj.hasMixin2).toEqual 'mixin2'
    expect(obj.hasMixin3).toEqual 'mixin3'        


describe "Mixin.reopen", () ->

  Mixin1 = obj = null

  beforeEach () ->
    Mixin1 = new Mixin () ->
      @applied = 1
    obj = {}      

  it "should call new constructor after any current one", () ->
    Mixin1.reopen () ->
      @applied += 1

    Mixin1.apply obj
    expect(obj.applied).toEqual 2 

  it "should call any new dependencies and constructors after current one", ()->
    Mixin2 = new Mixin () ->
      @applied += 1
      @hasMixin2 = true
    
    Mixin1.reopen Mixin2, () ->
      @applied += 1 
      expect(@hasMixin2).toEqual true

    Mixin1.apply obj
    expect(obj.applied).toEqual 3


  it "should not modify objects to which mixin is already applied without reapplying", () ->
    
    Mixin1.apply obj
    expect(obj.applied).toEqual 1

    Mixin1.reopen () ->
      @applied += 1

    expect(obj.applied).toEqual 1

  it "should apply new items to object if mixin has changed", () ->
    Mixin1.apply obj
    expect(obj.applied).toEqual 1

    Mixin1.reopen () ->
      @applied += 1

    Mixin1.apply obj
    expect(obj.applied).toEqual 2
    

  it "should throw exception when passed null value", () ->
    Mixin2 = new Mixin
    expect () ->
      Mixin1.reopen Mixin2, null
    .toThrow()


describe "Mixin.detect", () ->

  Mixin1 = Mixin2 = obj = {}

  beforeEach () ->
    Mixin1 = new Mixin
    Mixin2 = new Mixin Mixin1
    obj = {}

  it "should detect mixins applied directly", () ->
    Mixin1.apply obj
    expect(Mixin1.detect obj).toEqual true

  it "should detect mixins applied indirectly", () ->
    Mixin2.apply obj
    expect(Mixin1.detect obj).toEqual true

  it "should detect mixins that are not applied", () ->
    Mixin1.apply obj
    expect(Mixin2.detect obj).toEqual false

  it "should detect a mixin that has been applied after reopen even if out of date", () ->
    Mixin1.apply obj
    Mixin1.reopen () ->
      @demo = true

    expect(Mixin1.detect obj).toEqual true


describe "Mixin.apply", () ->

  it "should apply one or more mixins to first passed object", () ->
    Mixin1 = new Mixin
    Mixin2 = new Mixin

    # note - returns the first object
    obj = Mixin.apply {}, Mixin1, Mixin2
    expect(Mixin1.detect obj).toEqual true
    expect(Mixin2.detect obj).toEqual true

  it "should construct mixins from constructors if needed", () ->
    obj = Mixin.apply {}, () ->
      @applied = 'mixin'

    expect(obj.applied).toEqual 'mixin'

describe "Mixin.prepareMixin", () ->
  
  count = null
  MyMixin = null
  
  beforeEach () ->
    count = 0
    MyMixin = Mixin.extend()
    MyMixin.reopenClass (MyMixin) ->
      MyMixin.prepareMixin = (data) ->
        count++
        new Mixin
    
  dummyFunc = () ->
  for desc in [dummyFunc, new Mixin]
    do (desc) ->
      it "should not invoke for type " + typeof desc, () ->
        new MyMixin desc
        expect(count).toEqual 0
  
  for desc in [123, true, false, "STRING", { foo: 'bar' }, []]
    do (desc) ->
      it "should invoke for type " + typeof desc, () ->
        new MyMixin desc
        expect(count).toEqual 1

  for desc in [null, undefined]
    do (desc) ->
      it "should raise exception for " + desc, () ->
      expect () ->
        new MyMixin desc
      .toThrow()


