#* @module specs/platform.spec

platform = require '../lib/platform';

describe 'platform.create()', ->
  
  it "should exporta create function", ->
    expect(platform.create).not.toBeNull()
  
  it "should create a new object with the passed object as prototype", ->
    foo = {}
    foo2 = platform.create foo

    foo.property = 'hasOne'

    expect(foo2.property).toEqual foo.property

  it "should define property descriptors passed as a second argument", ->
    foo = {}
    desc = {
      property:
        value: 'VALUE'
    }

    foo2 = platform.create foo, desc
    expect(foo2.property).toEqual 'VALUE'


describe "platform.defineProperty", ->
  it "should export a defineProperty function", ->
    expect(platform.defineProperty).not.toBeNull()

describe "platform.getPrototypeOf", ->
  it "should export a getPrototypeOf function", ->
    expect(platform.getPrototypeOf).not.toBeNull()



