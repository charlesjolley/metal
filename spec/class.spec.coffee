Class = require('../lib/mixin').Class
Mixin = require('../lib/mixin').Mixin
getMeta = require('../lib/meta').getMeta

describe "Class Basics", () ->

  NewClass = null

  beforeEach () ->
    NewClass = Class.extend () ->
      @count = 1

  it "should define a new class using Class.extend()", () ->
    expect(NewClass).not.toEqual null

  it "should instantiate with new, invoking any constructors", () ->
    obj = new NewClass
    expect(obj.count).toEqual 1

  it "should extend from subclasses as well", () ->
    NewSubclass = NewClass.extend () ->
      @count += 1

    obj = new NewSubclass
    expect(obj.count).toEqual 2

  it "should accept mixins", () ->

    Mixin1 = new Mixin () ->
      @hasMixin = 'HAS MIXIN'

    NewClass = Class.extend Mixin1, () ->
      @configured = 'CONFIGURED'

    obj = new NewClass

    expect(obj.hasMixin).toEqual 'HAS MIXIN'
    expect(obj.configured).toEqual 'CONFIGURED'

  it "should invoke init() if defined", () ->

    NewClass = Class.extend () ->
      
      # configure initial state of class
      @count = 1

      # called on init
      @init = () ->
        @count += 1

    obj = new NewClass
    expect(obj.count).toEqual 2

  it "should add a subclass to the subclasses array", () ->
    NewSubclass = NewClass.extend()
    expect(NewClass.subclasses.length).toEqual 1
    expect(NewClass.subclasses).toContain NewSubclass


describe "Class.extend", () ->

  it "should work without arguments", () ->
    NewClass = Class.extend()
    expect(NewClass).not.toEqual null

    inst = new NewClass
    expect(inst instanceof Class).toEqual true

  it "should accept multiple constructor functions and mixin", () ->
    Mixin1 = new Mixin () ->
      @hasMixin1 = true

    const1 = () ->
      @hasConst1 = true

    NewClass = Class.extend const1, Mixin1, () ->
      @hasConst2 = true

    inst = new NewClass
    expect(inst.hasMixin1).toEqual true
    expect(inst.hasConst1).toEqual true
    expect(inst.hasConst2).toEqual true


describe "Class.reopen", () ->
  
  NewClass = null

  beforeEach () ->
    NewClass = Class.extend () ->
      @isNewClass = 'FIRST'

  it "should add new properties to a class prototype", () ->
    NewClass.reopen () ->
      @isReopened = 'REOPENED'
    
    inst = new NewClass()
    expect(inst.isNewClass).toEqual 'FIRST'
    expect(inst.isReopened).toEqual 'REOPENED'

  it "should apply to existing instances of the class", () ->
    inst = new NewClass()
    NewClass.reopen () ->
      @isReopened = 'REOPENED'

    expect(inst.isReopened).toEqual 'REOPENED'

  it "should automatically apply to subclasses", () ->
    Subclass = NewClass.extend()
    inst = new Subclass
    expect(inst.isNewClass).toEqual 'FIRST'
    
    NewClass.reopen () ->
      @isNewClass = 'NEW CLASS'
      
    inst = new Subclass
    expect(inst.isNewClass).toEqual 'NEW CLASS' 


describe "Create.reopenClass", () ->

  NewClass = null
  Mixin1 = new Mixin () ->
    @hasMixin = 'HAS MIXIN'

  beforeEach () ->
    NewClass = Class.extend()

  it "should add new property to the class itself", () ->

    NewClass.reopenClass Mixin1, () ->
      @addedToClass = 'ADDED'

    expect(NewClass.hasMixin).toEqual 'HAS MIXIN'
    expect(NewClass.addedToClass).toEqual 'ADDED'


  it "should automatically apply to subclasses", () ->
    Subclass = NewClass.extend()
    NewClass.reopenClass Mixin1, () ->
      @addedToClass = 'DID ADD'

    expect(Subclass.hasMixin).toEqual     'HAS MIXIN'
    expect(Subclass.addedToClass).toEqual 'DID ADD'


describe "Create.prepareMixin", () ->

  NewClass = null
  count = 0
  PassedMixin = null

  beforeEach () ->

    count = 0

    NewClass = Class.extend()
    NewClass.reopenClass () ->
      @prepareMixin = (desc, mixin) ->
        count++
        PassedMixin = mixin
        desc

  it "should be invoked when extend() is passed non-mixin", () ->
    Ret = NewClass.extend () ->
      # do nothing

    expect(PassedMixin).toEqual Ret.PrototypeMixin 
    expect(count).toEqual 1

  it "should be invoked when reopen() is passed non-mixin", () ->
    NewClass.reopen () ->
      # do nothing

    expect(PassedMixin).toEqual NewClass.PrototypeMixin 
    expect(count).toEqual 1

  it "should be invoked when reopenClass() is passed non-mixin", () ->
    NewClass.reopenClass () ->
      # do nothing

    expect(PassedMixin).toEqual NewClass.ClassMixin 
    expect(count).toEqual 1

  it "should be invoked when create() is passed non-mixin", () ->
    ExpectedMixin = NewClass.PrototypeMixin
    Ret = NewClass.extend () ->
      # do nothing

    expect(PassedMixin).toEqual Ret.PrototypeMixin 
    expect(count).toEqual 1



