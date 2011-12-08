
META = require '../lib/meta'

describe "META.getMeta()", ->

  it "should return a meta hash for a regular object", ->
    object = {}
    expect(META.getMeta object)
    