
Class     = require('../../lib/index').Class
Eventable = require('../../lib/mixins/eventable').Eventable

EventedClass = Class.extend Eventable

describe "Basic Event Listening", () ->

  inst = count = listener = null

  beforeEach () ->
    inst = new EventedClass
    count = 0
    listener =
      onFire: () -> count += 1

    inst.bind 'change', listener, listener.onFire
    expect(count).toEqual 0 # should not fire yet

  it "should deliver to a target/method pair on trigger", () ->
    inst.trigger 'change'
    expect(count).toEqual 1 # should trigger

  it "unbind should stop delivery", () ->
    inst.trigger 'change'
    expect(count).toEqual 1 # precondition: must be registered

    count = 0
    inst.unbind 'change', listener, listener.onFire
    inst.trigger 'change'
    expect(count).toEqual 0

describe "Alternate bind/unbind call formats", () ->

  inst = count = listener = null

  trigger = (amt=1) ->
    inst.trigger 'change'
    expect(count).toEqual amt

  beforeEach () ->
    inst = new EventedClass
    count = 0
    listener =
      onFire: () -> count += 1
  
  it "should accept a target/method pair", () ->
    inst.bind 'change', listener, listener.onFire
    trigger()

    inst.unbind 'change', listener, listener.onFire
    trigger()

  it "should accept a target/method with method as string", () ->
    inst.bind 'change', listener, 'onFire'
    trigger()

    inst.unbind 'change', listener, 'onFire'
    trigger()

  it "should accept just a method", () ->
    inst.bind 'change', listener.onFire
    trigger()

    inst.unbind 'change', listener.onFire
    trigger()

describe "namespaced events", () ->

  it "should trigger generic listeners on more specific events", () ->
    inst     = new EventedClass
    count    = 0
    listener = () -> count += 1

    inst.bind 'change', listener
    inst.bind 'change:something', listener
    inst.trigger 'change:something'
    expect(count).toEqual 2 

describe "deferred events", () ->

  count = inst = null

  listener1 = () ->
    count += 1
    inst.trigger 'second'
    expect(count).toEqual 1 # should not have triggered listener2 yet

  listener2 = () ->
    count += 1

  beforeEach () ->
    count = 0
    inst = new EventedClass
    inst.bind 'first', listener1
    inst.bind 'second', listener2

  it "should defer most event notifications until end of loop", () ->
    inst.trigger 'first'
    expect(count).toEqual 2 # should have triggered both listeners

  it "should defer all triggers when loop/unloop are called", () ->
    Eventable.loop()
    inst.trigger 'first'
    expect(count).toEqual 0

    Eventable.unloop()
    expect(count).toEqual 2



    
    
