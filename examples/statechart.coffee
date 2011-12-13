


ButtonStates = new Statechart Actionable, 

  defaultState: 'ENABLED',

  enable: () ->
    @gotoState 'ENABLED'

  disable: () ->
    @gotoState: 'DISABLED'

  fire: () ->
    @target.trigger @actionName


  'ENABLED': new State
    
    classNames: 'enabled'

    mouseDown: () ->
      @gotoState: 'ACTIVE'
      true

  'ENABLED.ACTIVE': new State
    classNames: 'active'

    mouseUp: () ->
      @gotoState 'ENABLED'
      @trigger 'fire'

  'DISABLED': new State
    classNames: 'disabled'



ButtonView.reopen ButtonStates

    
