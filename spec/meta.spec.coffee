
META = require '../lib/meta'
PLATFORM = require '../lib/platform'
o_create = PLATFORM.create

describe "META.getMeta()", ->

  describe "Basic Object", ->

    object = null

    beforeEach ->
      object = {}

    it "should return a meta hash for a regular object", ->
      expect(META.getMeta object).not.toBeNull()
       
    it "should preserve any keys that are set", ->
      firstMeta = META.getMeta object
      firstMeta.foo = "bar"
      expect(META.getMeta(object).foo)
        .toEqual 'bar'

    describe "inherited meta properties", ->

      object1 = object2 = object3 = object4 = null
      meta1 = meta2 = meta3 = meta4 = null

      beforeEach ->
        meta1 = META.getMeta object
        meta1.foo1 = "foo1"

        object1 = object
        object2 = o_create object1

      it "should inherit meta properties from parent", ->
        meta2 = META.getMeta object2
        expect(meta2.foo1).toEqual 'foo1'
        
      it "should not pass properties to parent", ->
        meta2 = META.getMeta object2
        meta2.foo2 = "foo2"
        expect(meta1.foo2).not.toEqual 'foo2'

      describe "creating intermediate parents implicitly", ->

        beforeEach () ->
          # IMPORTANT: get meta4 before meta2 & 3.  We are trying to verify 
          # that intermediate prototypes are create implicitly even if they 
          # have never been called in the mean time.
          object3 = o_create object2
          object4 = o_create object3

          meta4   = META.getMeta object4
          meta3   = META.getMeta object3
          meta2   = META.getMeta object2

          meta2.foo2 = 'foo2'
          meta3.foo3 = 'foo3'
          meta4.foo4 = 'foo4'

        it "should have all properties on meta4", () ->
          for keyName in ['foo1', 'foo2', 'foo3', 'foo4']
            do (keyName) ->
              expect(meta4[keyName]).toEqual(keyName)

        it "should have partial properties on meta3", () ->
          for keyName in ['foo1', 'foo2', 'foo3']
            do (keyName) ->
              expect(meta3[keyName]).toEqual(keyName)
          
          expect(meta3.foo4).not.toEqual('foo4')

        it "should have partial properties on meta2", () ->
          for keyName in ['foo1', 'foo2']
            do (keyName) ->
              expect(meta2[keyName]).toEqual(keyName)
          
          for keyName in ['foo3', 'foo4']
            do (keyName) ->
              expect(meta2[keyName]).not.toEqual(keyName)

        it "should have partial properties on meta1", () ->
          expect(meta1.foo1).toEqual('foo1')

          for keyName in ['foo2', 'foo3', 'foo4']
            do (keyName) ->
              expect(meta1[keyName]).not.toEqual(keyName)


  describe "unsupported and non standard types", ->

    for item in [null, 'string', 123, true, false]
      do (item) ->
        it "with "+item+' (type: ' + typeof item + ')', ->
          expect () ->
            META.getMeta(item)
          .toThrow(new META.UnsupportedType())

    func = () ->
    for item in [[], func, {}]
      do (item) ->
        it "with "+item+' (type: ' + typeof item + ')', ->
          expect(META.getMeta(item)).not.toEqual null

  describe "meta key paths", ->

    object1 = null

    beforeEach ->
      object1 = {}

    it "should return the object for a meta key path", ->
      meta1 = META.getMeta(object1, 'key', 'path')
      expect(META.getMeta(object1, 'key', 'path')).toEqual(meta1);

    it "should return parent object in key path", ->
      meta1 = META.getMeta object1, 'key'
      meta2 = META.getMeta object1, 'key', 'path'

      expect(meta1.path).toEqual(meta2)
      expect(META.getMeta(object1).key).toEqual(meta1)

    describe "unsupported property types", ->
      it "should throw exception if a key path resolves to a non-object", () ->
        META.getMeta(object1).foo = 'foo'

        expect(() ->
          META.getMeta(object1, 'foo')
        ).toThrow(new META.UnsupportedType())

      it "should throw exception of item in key path is non-object", () ->
        META.getMeta(object1, 'key').path = 'foo'
        expect(() ->
          META.getMeta(object1, 'key', 'path', 'part')
        ).toThrow(new META.UnsupportedType())


    describe "inherited key paths", ->

      it "should automatically inherit from parent", ->

        object2 = o_create object1

        meta1   = META.getMeta object1, 'key', 'path'
        meta1.foo1 = 'foo1'

        meta2   = META.getMeta object2, 'key', 'path'
        expect(meta2.foo1).toEqual 'foo1'

      describe "implicitly created intermediate prototypes", ->

        object2 = object3 = meta1 = meta2 = meta3 = null

        beforeEach () ->
          object2 = o_create object1
          object3 = o_create object2

          meta1   = META.getMeta object1, 'key', 'path'
          meta1.foo1 = 'foo1'

          # important - get meta3 before meta2
          meta3  = META.getMeta object3, 'key', 'path'
          meta3.foo3  = 'foo3'

          # important: set foo2 after getting foo3
          meta2  = META.getMeta object2, 'key', 'path'
          meta2.foo2 = 'foo2'


        it "should have all properties for meta3", () ->
          for keyName in ['foo1', 'foo2', 'foo3']
            do (keyName) ->
              expect(meta3[keyName]).toEqual(keyName)
        
        it "should have partial properties for meta2", () ->
          for keyName in ['foo1', 'foo2']
            do (keyName) ->
              expect(meta2[keyName]).toEqual(keyName)

          expect(meta2.foo3).not.toEqual('foo3')

        it "should have partial properties for meta1", () ->
          expect(meta1.foo1).toEqual('foo1')

          for keyName in ['foo2', 'foo3']
            do (keyName) ->
              expect(meta1[keyName]).not.toEqual(keyName)

  describe "alternate parameters", () ->

    it "should not clone instance of last param is boolean true", () ->
      obj = {}
      expected = META.getMeta obj, 'foo', 'bar'

      obj2 = o_create obj
      expect(META.getMeta obj2, 'foo', 'bar', false).toEqual expected

    it "should accept an array of properties", () ->
      obj = {}
      expected = META.getMeta obj, 'foo', 'bar'
      expect(META.getMeta obj, ['foo', 'bar']).toEqual expected

    it "should accept writable flag with array", () ->
      obj = {}
      expected = META.getMeta obj, 'foo', 'bar'

      obj2 = o_create obj
      expect(META.getMeta obj2, ['foo', 'bar'], false).toEqual expected



