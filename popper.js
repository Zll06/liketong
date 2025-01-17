;(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(factory)
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory()
  } else {
    root.Popper = factory()
  }
})(this, function () {
  'use strict'
  var root = window
  var DEFAULTS = {
    placement: 'bottom',
    gpuAcceleration: true,
    offset: 0,
    boundariesElement: 'viewport',
    boundariesPadding: 5,
    preventOverflowOrder: ['left', 'right', 'top', 'bottom'],
    flipBehavior: 'flip',
    arrowElement: '[x-arrow]',
    arrowOffset: 0,
    modifiers: [
      'shift',
      'offset',
      'preventOverflow',
      'keepTogether',
      'arrow',
      'flip',
      'applyStyle'
    ],
    modifiersIgnored: [],
    forceAbsolute: false
  }
  function Popper(reference, popper, options) {
    this._reference = reference.jquery ? reference[0] : reference
    this.state = {}
    var isNotDefined = typeof popper === 'undefined' || popper === null
    var isConfig =
      popper && Object.prototype.toString.call(popper) === '[object Object]'
    if (isNotDefined || isConfig) {
      this._popper = this.parse(isConfig ? popper : {})
    } else {
      this._popper = popper.jquery ? popper[0] : popper
    }
    this._options = Object.assign({}, DEFAULTS, options)
    this._options.modifiers = this._options.modifiers.map(
      function (modifier) {
        if (this._options.modifiersIgnored.indexOf(modifier) !== -1) return
        if (modifier === 'applyStyle') {
          this._popper.setAttribute('x-placement', this._options.placement)
        }
        return this.modifiers[modifier] || modifier
      }.bind(this)
    )
    this.state.position = this._getPosition(this._popper, this._reference)
    setStyle(this._popper, { position: this.state.position, top: 0 })
    this.update()
    this._setupEventListeners()
    return this
  }
  Popper.prototype.destroy = function () {
    this._popper.removeAttribute('x-placement')
    this._popper.style.left = ''
    this._popper.style.position = ''
    this._popper.style.top = ''
    this._popper.style[getSupportedPropertyName('transform')] = ''
    this._removeEventListeners()
    if (this._options.removeOnDestroy) {
      this._popper.remove()
    }
    return this
  }
  Popper.prototype.update = function () {
    var data = { instance: this, styles: {} }
    data.placement = this._options.placement
    data._originalPlacement = this._options.placement
    data.offsets = this._getOffsets(
      this._popper,
      this._reference,
      data.placement
    )
    data.boundaries = this._getBoundaries(
      data,
      this._options.boundariesPadding,
      this._options.boundariesElement
    )
    data = this.runModifiers(data, this._options.modifiers)
    if (typeof this.state.updateCallback === 'function') {
      this.state.updateCallback(data)
    }
  }
  Popper.prototype.onCreate = function (callback) {
    callback(this)
    return this
  }
  Popper.prototype.onUpdate = function (callback) {
    this.state.updateCallback = callback
    return this
  }
  Popper.prototype.parse = function (config) {
    var defaultConfig = {
      tagName: 'div',
      classNames: ['popper'],
      attributes: [],
      parent: root.document.body,
      content: '',
      contentType: 'text',
      arrowTagName: 'div',
      arrowClassNames: ['popper__arrow'],
      arrowAttributes: ['x-arrow']
    }
    config = Object.assign({}, defaultConfig, config)
    var d = root.document
    var popper = d.createElement(config.tagName)
    addClassNames(popper, config.classNames)
    addAttributes(popper, config.attributes)
    if (config.contentType === 'node') {
      popper.appendChild(
        config.content.jquery ? config.content[0] : config.content
      )
    } else if (config.contentType === 'html') {
      popper.innerHTML = config.content
    } else {
      popper.textContent = config.content
    }
    if (config.arrowTagName) {
      var arrow = d.createElement(config.arrowTagName)
      addClassNames(arrow, config.arrowClassNames)
      addAttributes(arrow, config.arrowAttributes)
      popper.appendChild(arrow)
    }
    var parent = config.parent.jquery ? config.parent[0] : config.parent
    if (typeof parent === 'string') {
      parent = d.querySelectorAll(config.parent)
      if (parent.length > 1) {
        console.warn(
          'WARNING: the given `parent` query(' +
            config.parent +
            ') matched more than one element, the first one will be used'
        )
      }
      if (parent.length === 0) {
        throw "ERROR: the given `parent` doesn't exists!"
      }
      parent = parent[0]
    }
    if (parent.length > 1 && parent instanceof Element === false) {
      console.warn(
        'WARNING: you have passed as parent a list of elements, the first one will be used'
      )
      parent = parent[0]
    }
    parent.appendChild(popper)
    return popper
    function addClassNames(element, classNames) {
      classNames.forEach(function (className) {
        element.classList.add(className)
      })
    }
    function addAttributes(element, attributes) {
      attributes.forEach(function (attribute) {
        element.setAttribute(
          attribute.split(':')[0],
          attribute.split(':')[1] || ''
        )
      })
    }
  }
  Popper.prototype._getPosition = function (popper, reference) {
    var container = getOffsetParent(reference)
    if (this._options.forceAbsolute) {
      return 'absolute'
    }
    var isParentFixed = isFixed(reference, container)
    return isParentFixed ? 'fixed' : 'absolute'
  }
  Popper.prototype._getOffsets = function (popper, reference, placement) {
    placement = placement.split('-')[0]
    var popperOffsets = {}
    popperOffsets.position = this.state.position
    var isParentFixed = popperOffsets.position === 'fixed'
    var referenceOffsets = getOffsetRectRelativeToCustomParent(
      reference,
      getOffsetParent(popper),
      isParentFixed
    )
    var popperRect = getOuterSizes(popper)
    if (['right', 'left'].indexOf(placement) !== -1) {
      popperOffsets.top =
        referenceOffsets.top +
        referenceOffsets.height / 2 -
        popperRect.height / 2
      if (placement === 'left') {
        popperOffsets.left = referenceOffsets.left - popperRect.width
      } else {
        popperOffsets.left = referenceOffsets.right
      }
    } else {
      popperOffsets.left =
        referenceOffsets.left +
        referenceOffsets.width / 2 -
        popperRect.width / 2
      if (placement === 'top') {
        popperOffsets.top = referenceOffsets.top - popperRect.height
      } else {
        popperOffsets.top = referenceOffsets.bottom
      }
    }
    popperOffsets.width = popperRect.width
    popperOffsets.height = popperRect.height
    return {
      popper: popperOffsets,
      reference: referenceOffsets
    }
  }
  Popper.prototype._setupEventListeners = function () {
    this.state.updateBound = this.update.bind(this)
    root.addEventListener('resize', this.state.updateBound)
    if (this._options.boundariesElement !== 'window') {
      var target = getScrollParent(this._reference)
      if (
        target === root.document.body ||
        target === root.document.documentElement
      ) {
        target = root
      }
      target.addEventListener('scroll', this.state.updateBound)
      this.state.scrollTarget = target
    }
  }
  Popper.prototype._removeEventListeners = function () {
    root.removeEventListener('resize', this.state.updateBound)
    if (
      this._options.boundariesElement !== 'window' &&
      this.state.scrollTarget
    ) {
      this.state.scrollTarget.removeEventListener(
        'scroll',
        this.state.updateBound
      )
      this.state.scrollTarget = null
    }
    this.state.updateBound = null
  }
  Popper.prototype._getBoundaries = function (
    data,
    padding,
    boundariesElement
  ) {
    var boundaries = {}
    var width, height
    if (boundariesElement === 'window') {
      var body = root.document.body,
        html = root.document.documentElement
      height = Math.max(
        body.scrollHeight,
        body.offsetHeight,
        html.clientHeight,
        html.scrollHeight,
        html.offsetHeight
      )
      width = Math.max(
        body.scrollWidth,
        body.offsetWidth,
        html.clientWidth,
        html.scrollWidth,
        html.offsetWidth
      )
      boundaries = {
        top: 0,
        right: width,
        bottom: height,
        left: 0
      }
    } else if (boundariesElement === 'viewport') {
      var offsetParent = getOffsetParent(this._popper)
      var scrollParent = getScrollParent(this._popper)
      var offsetParentRect = getOffsetRect(offsetParent)
      var getScrollTopValue = function (element) {
        return element == document.body
          ? Math.max(
              document.documentElement.scrollTop,
              document.body.scrollTop
            )
          : element.scrollTop
      }
      var getScrollLeftValue = function (element) {
        return element == document.body
          ? Math.max(
              document.documentElement.scrollLeft,
              document.body.scrollLeft
            )
          : element.scrollLeft
      }
      var scrollTop =
        data.offsets.popper.position === 'fixed'
          ? 0
          : getScrollTopValue(scrollParent)
      var scrollLeft =
        data.offsets.popper.position === 'fixed'
          ? 0
          : getScrollLeftValue(scrollParent)
      boundaries = {
        top: 0 - (offsetParentRect.top - scrollTop),
        right:
          root.document.documentElement.clientWidth -
          (offsetParentRect.left - scrollLeft),
        bottom:
          root.document.documentElement.clientHeight -
          (offsetParentRect.top - scrollTop),
        left: 0 - (offsetParentRect.left - scrollLeft)
      }
    } else {
      if (getOffsetParent(this._popper) === boundariesElement) {
        boundaries = {
          top: 0,
          left: 0,
          right: boundariesElement.clientWidth,
          bottom: boundariesElement.clientHeight
        }
      } else {
        boundaries = getOffsetRect(boundariesElement)
      }
    }
    boundaries.left += padding
    boundaries.right -= padding
    boundaries.top = boundaries.top + padding
    boundaries.bottom = boundaries.bottom - padding
    return boundaries
  }
  Popper.prototype.runModifiers = function (data, modifiers, ends) {
    var modifiersToRun = modifiers.slice()
    if (ends !== undefined) {
      modifiersToRun = this._options.modifiers.slice(
        0,
        getArrayKeyIndex(this._options.modifiers, ends)
      )
    }
    modifiersToRun.forEach(
      function (modifier) {
        if (isFunction(modifier)) {
          data = modifier.call(this, data)
        }
      }.bind(this)
    )
    return data
  }
  Popper.prototype.isModifierRequired = function (requesting, requested) {
    var index = getArrayKeyIndex(this._options.modifiers, requesting)
    return !!this._options.modifiers
      .slice(0, index)
      .filter(function (modifier) {
        return modifier === requested
      }).length
  }
  Popper.prototype.modifiers = {}
  Popper.prototype.modifiers.applyStyle = function (data) {
    var styles = {
      position: data.offsets.popper.position
    }
    var left = Math.round(data.offsets.popper.left)
    var top = Math.round(data.offsets.popper.top)
    var prefixedProperty
    if (
      this._options.gpuAcceleration &&
      (prefixedProperty = getSupportedPropertyName('transform'))
    ) {
      styles[prefixedProperty] = 'translate3d(' + left + 'px, ' + top + 'px, 0)'
      styles.top = 0
      styles.left = 0
    } else {
      styles.left = left
      styles.top = top
    }
    Object.assign(styles, data.styles)
    setStyle(this._popper, styles)
    this._popper.setAttribute('x-placement', data.placement)
    if (
      this.isModifierRequired(
        this.modifiers.applyStyle,
        this.modifiers.arrow
      ) &&
      data.offsets.arrow
    ) {
      setStyle(data.arrowElement, data.offsets.arrow)
    }
    return data
  }
  Popper.prototype.modifiers.shift = function (data) {
    var placement = data.placement
    var basePlacement = placement.split('-')[0]
    var shiftVariation = placement.split('-')[1]
    if (shiftVariation) {
      var reference = data.offsets.reference
      var popper = getPopperClientRect(data.offsets.popper)

      var shiftOffsets = {
        y: {
          start: { top: reference.top },
          end: { top: reference.top + reference.height - popper.height }
        },
        x: {
          start: { left: reference.left },
          end: { left: reference.left + reference.width - popper.width }
        }
      }
      var axis = ['bottom', 'top'].indexOf(basePlacement) !== -1 ? 'x' : 'y'
      data.offsets.popper = Object.assign(
        popper,
        shiftOffsets[axis][shiftVariation]
      )
    }
    return data
  }
  Popper.prototype.modifiers.preventOverflow = function (data) {
    var order = this._options.preventOverflowOrder
    var popper = getPopperClientRect(data.offsets.popper)
    var check = {
      left: function () {
        var left = popper.left
        if (popper.left < data.boundaries.left) {
          left = Math.max(popper.left, data.boundaries.left)
        }
        return { left: left }
      },
      right: function () {
        var left = popper.left
        if (popper.right > data.boundaries.right) {
          left = Math.min(popper.left, data.boundaries.right - popper.width)
        }
        return { left: left }
      },
      top: function () {
        var top = popper.top
        if (popper.top < data.boundaries.top) {
          top = Math.max(popper.top, data.boundaries.top)
        }
        return { top: top }
      },
      bottom: function () {
        var top = popper.top
        if (popper.bottom > data.boundaries.bottom) {
          top = Math.min(popper.top, data.boundaries.bottom - popper.height)
        }
        return { top: top }
      }
    }
    order.forEach(function (direction) {
      data.offsets.popper = Object.assign(popper, check[direction]())
    })
    return data
  }
  Popper.prototype.modifiers.keepTogether = function (data) {
    var popper = getPopperClientRect(data.offsets.popper)
    var reference = data.offsets.reference
    var f = Math.floor
    if (popper.right < f(reference.left)) {
      data.offsets.popper.left = f(reference.left) - popper.width
    }
    if (popper.left > f(reference.right)) {
      data.offsets.popper.left = f(reference.right)
    }
    if (popper.bottom < f(reference.top)) {
      data.offsets.popper.top = f(reference.top) - popper.height
    }
    if (popper.top > f(reference.bottom)) {
      data.offsets.popper.top = f(reference.bottom)
    }
    return data
  }
  Popper.prototype.modifiers.flip = function (data) {
    if (
      !this.isModifierRequired(
        this.modifiers.flip,
        this.modifiers.preventOverflow
      )
    ) {
      console.warn(
        'WARNING: preventOverflow modifier is required by flip modifier in order to work, be sure to include it before flip!'
      )
      return data
    }
    if (data.flipped && data.placement === data._originalPlacement) {
      return data
    }
    var placement = data.placement.split('-')[0]
    var placementOpposite = getOppositePlacement(placement)
    var variation = data.placement.split('-')[1] || ''

    var flipOrder = []
    if (this._options.flipBehavior === 'flip') {
      flipOrder = [placement, placementOpposite]
    } else {
      flipOrder = this._options.flipBehavior
    }
    flipOrder.forEach(
      function (step, index) {
        if (placement !== step || flipOrder.length === index + 1) {
          return
        }
        placement = data.placement.split('-')[0]
        placementOpposite = getOppositePlacement(placement)
        var popperOffsets = getPopperClientRect(data.offsets.popper)
        var a = ['right', 'bottom'].indexOf(placement) !== -1
        if (
          (a &&
            Math.floor(data.offsets.reference[placement]) >
              Math.floor(popperOffsets[placementOpposite])) ||
          (!a &&
            Math.floor(data.offsets.reference[placement]) <
              Math.floor(popperOffsets[placementOpposite]))
        ) {
          data.flipped = true
          data.placement = flipOrder[index + 1]
          if (variation) {
            data.placement += '-' + variation
          }
          data.offsets.popper = this._getOffsets(
            this._popper,
            this._reference,
            data.placement
          ).popper
          data = this.runModifiers(data, this._options.modifiers, this._flip)
        }
      }.bind(this)
    )
    return data
  }
  Popper.prototype.modifiers.offset = function (data) {
    var offset = this._options.offset
    var popper = data.offsets.popper
    if (data.placement.indexOf('left') !== -1) {
      popper.top -= offset
    } else if (data.placement.indexOf('right') !== -1) {
      popper.top += offset
    } else if (data.placement.indexOf('top') !== -1) {
      popper.left -= offset
    } else if (data.placement.indexOf('bottom') !== -1) {
      popper.left += offset
    }
    return data
  }
  Popper.prototype.modifiers.arrow = function (data) {
    var arrow = this._options.arrowElement
    var arrowOffset = this._options.arrowOffset
    if (typeof arrow === 'string') {
      arrow = this._popper.querySelector(arrow)
    }
    if (!arrow) {
      return data
    }
    if (!this._popper.contains(arrow)) {
      console.warn(
        'WARNING: `arrowElement` must be child of its popper element!'
      )
      return data
    }
    if (
      !this.isModifierRequired(
        this.modifiers.arrow,
        this.modifiers.keepTogether
      )
    ) {
      console.warn(
        'WARNING: keepTogether modifier is required by arrow modifier in order to work, be sure to include it before arrow!'
      )
      return data
    }
    var arrowStyle = {}
    var placement = data.placement.split('-')[0]
    var popper = getPopperClientRect(data.offsets.popper)
    var reference = data.offsets.reference
    var isVertical = ['left', 'right'].indexOf(placement) !== -1
    var len = isVertical ? 'height' : 'width'
    var side = isVertical ? 'top' : 'left'
    var translate = isVertical ? 'translateY' : 'translateX'
    var altSide = isVertical ? 'left' : 'top'
    var opSide = isVertical ? 'bottom' : 'right'
    var arrowSize = getOuterSizes(arrow)[len]
    if (reference[opSide] - arrowSize < popper[side]) {
      data.offsets.popper[side] -=
        popper[side] - (reference[opSide] - arrowSize)
    }
    if (reference[side] + arrowSize > popper[opSide]) {
      data.offsets.popper[side] += reference[side] + arrowSize - popper[opSide]
    }
    var center =
      reference[side] + (arrowOffset || reference[len] / 2 - arrowSize / 2)
    var sideValue = center - popper[side]
    sideValue = Math.max(Math.min(popper[len] - arrowSize - 8, sideValue), 8)
    arrowStyle[side] = sideValue
    arrowStyle[altSide] = '' // make sure to remove any old style from the arrow
    data.offsets.arrow = arrowStyle
    data.arrowElement = arrow
    return data
  }
  function getOuterSizes(element) {
    var _display = element.style.display,
      _visibility = element.style.visibility
    element.style.display = 'block'
    element.style.visibility = 'hidden'
    var calcWidthToForceRepaint = element.offsetWidth
    var styles = root.getComputedStyle(element)
    var x = parseFloat(styles.marginTop) + parseFloat(styles.marginBottom)
    var y = parseFloat(styles.marginLeft) + parseFloat(styles.marginRight)
    var result = {
      width: element.offsetWidth + y,
      height: element.offsetHeight + x
    }
    element.style.display = _display
    element.style.visibility = _visibility
    return result
  }
  function getOppositePlacement(placement) {
    var hash = { left: 'right', right: 'left', bottom: 'top', top: 'bottom' }
    return placement.replace(/left|right|bottom|top/g, function (matched) {
      return hash[matched]
    })
  }
  function getPopperClientRect(popperOffsets) {
    var offsets = Object.assign({}, popperOffsets)
    offsets.right = offsets.left + offsets.width
    offsets.bottom = offsets.top + offsets.height
    return offsets
  }
  function getArrayKeyIndex(arr, keyToFind) {
    var i = 0,
      key
    for (key in arr) {
      if (arr[key] === keyToFind) {
        return i
      }
      i++
    }
    return null
  }
  function getStyleComputedProperty(element, property) {
    var css = root.getComputedStyle(element, null)
    return css[property]
  }
  function getOffsetParent(element) {
    var offsetParent = element.offsetParent
    return offsetParent === root.document.body || !offsetParent
      ? root.document.documentElement
      : offsetParent
  }
  function getScrollParent(element) {
    var parent = element.parentNode
    if (!parent) {
      return element
    }
    if (parent === root.document) {
      if (root.document.body.scrollTop || root.document.body.scrollLeft) {
        return root.document.body
      } else {
        return root.document.documentElement
      }
    }
    if (
      ['scroll', 'auto'].indexOf(
        getStyleComputedProperty(parent, 'overflow')
      ) !== -1 ||
      ['scroll', 'auto'].indexOf(
        getStyleComputedProperty(parent, 'overflow-x')
      ) !== -1 ||
      ['scroll', 'auto'].indexOf(
        getStyleComputedProperty(parent, 'overflow-y')
      ) !== -1
    ) {
      return parent
    }
    return getScrollParent(element.parentNode)
  }
  function isFixed(element) {
    if (element === root.document.body) {
      return false
    }
    if (getStyleComputedProperty(element, 'position') === 'fixed') {
      return true
    }
    return element.parentNode ? isFixed(element.parentNode) : element
  }
  function setStyle(element, styles) {
    function is_numeric(n) {
      return n !== '' && !isNaN(parseFloat(n)) && isFinite(n)
    }
    Object.keys(styles).forEach(function (prop) {
      var unit = ''
      if (
        ['width', 'height', 'top', 'right', 'bottom', 'left'].indexOf(prop) !==
          -1 &&
        is_numeric(styles[prop])
      ) {
        unit = 'px'
      }
      element.style[prop] = styles[prop] + unit
    })
  }
  function isFunction(functionToCheck) {
    var getType = {}
    return (
      functionToCheck &&
      getType.toString.call(functionToCheck) === '[object Function]'
    )
  }
  function getOffsetRect(element) {
    var elementRect = {
      width: element.offsetWidth,
      height: element.offsetHeight,
      left: element.offsetLeft,
      top: element.offsetTop
    }
    elementRect.right = elementRect.left + elementRect.width
    elementRect.bottom = elementRect.top + elementRect.height
    return elementRect
  }
  function getBoundingClientRect(element) {
    var rect = element.getBoundingClientRect()
    var isIE = navigator.userAgent.indexOf('MSIE') != -1
    var rectTop =
      isIE && element.tagName === 'HTML' ? -element.scrollTop : rect.top
    return {
      left: rect.left,
      top: rectTop,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.right - rect.left,
      height: rect.bottom - rectTop
    }
  }
  function getOffsetRectRelativeToCustomParent(element, parent, fixed) {
    var elementRect = getBoundingClientRect(element)
    var parentRect = getBoundingClientRect(parent)
    if (fixed) {
      var scrollParent = getScrollParent(parent)
      parentRect.top += scrollParent.scrollTop
      parentRect.bottom += scrollParent.scrollTop
      parentRect.left += scrollParent.scrollLeft
      parentRect.right += scrollParent.scrollLeft
    }
    var rect = {
      top: elementRect.top - parentRect.top,
      left: elementRect.left - parentRect.left,
      bottom: elementRect.top - parentRect.top + elementRect.height,
      right: elementRect.left - parentRect.left + elementRect.width,
      width: elementRect.width,
      height: elementRect.height
    }
    return rect
  }
  function getSupportedPropertyName(property) {
    var prefixes = ['', 'ms', 'webkit', 'moz', 'o']
    for (var i = 0; i < prefixes.length; i++) {
      var toCheck = prefixes[i]
        ? prefixes[i] + property.charAt(0).toUpperCase() + property.slice(1)
        : property
      if (typeof root.document.body.style[toCheck] !== 'undefined') {
        return toCheck
      }
    }
    return null
  }
  if (!Object.assign) {
    Object.defineProperty(Object, 'assign', {
      enumerable: false,
      configurable: true,
      writable: true,
      value: function (target) {
        if (target === undefined || target === null) {
          throw new TypeError('Cannot convert first argument to object')
        }
        var to = Object(target)
        for (var i = 1; i < arguments.length; i++) {
          var nextSource = arguments[i]
          if (nextSource === undefined || nextSource === null) {
            continue
          }
          nextSource = Object(nextSource)

          var keysArray = Object.keys(nextSource)
          for (
            var nextIndex = 0, len = keysArray.length;
            nextIndex < len;
            nextIndex++
          ) {
            var nextKey = keysArray[nextIndex]
            var desc = Object.getOwnPropertyDescriptor(nextSource, nextKey)
            if (desc !== undefined && desc.enumerable) {
              to[nextKey] = nextSource[nextKey]
            }
          }
        }
        return to
      }
    })
  }
  return Popper
})
