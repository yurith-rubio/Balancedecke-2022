var SECTION_ID_ATTR$1 = 'data-section-id';

function Section(container, properties) {
  this.container = validateContainerElement(container);
  this.id = container.getAttribute(SECTION_ID_ATTR$1);
  this.extensions = [];

  // eslint-disable-next-line es5/no-es6-static-methods
  Object.assign(this, validatePropertiesObject(properties));

  this.onLoad();
}

Section.prototype = {
  onLoad: Function.prototype,
  onUnload: Function.prototype,
  onSelect: Function.prototype,
  onDeselect: Function.prototype,
  onBlockSelect: Function.prototype,
  onBlockDeselect: Function.prototype,

  extend: function extend(extension) {
    this.extensions.push(extension); // Save original extension

    // eslint-disable-next-line es5/no-es6-static-methods
    var extensionClone = Object.assign({}, extension);
    delete extensionClone.init; // Remove init function before assigning extension properties

    // eslint-disable-next-line es5/no-es6-static-methods
    Object.assign(this, extensionClone);

    if (typeof extension.init === 'function') {
      extension.init.apply(this);
    }
  }
};

function validateContainerElement(container) {
  if (!(container instanceof Element)) {
    throw new TypeError(
      'Theme Sections: Attempted to load section. The section container provided is not a DOM element.'
    );
  }
  if (container.getAttribute(SECTION_ID_ATTR$1) === null) {
    throw new Error(
      'Theme Sections: The section container provided does not have an id assigned to the ' +
        SECTION_ID_ATTR$1 +
        ' attribute.'
    );
  }

  return container;
}

function validatePropertiesObject(value) {
  if (
    (typeof value !== 'undefined' && typeof value !== 'object') ||
    value === null
  ) {
    throw new TypeError(
      'Theme Sections: The properties object provided is not a valid'
    );
  }

  return value;
}

// Object.assign() polyfill from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign#Polyfill
if (typeof Object.assign != 'function') {
  // Must be writable: true, enumerable: false, configurable: true
  Object.defineProperty(Object, 'assign', {
    value: function assign(target) {
      if (target == null) {
        // TypeError if undefined or null
        throw new TypeError('Cannot convert undefined or null to object');
      }

      var to = Object(target);

      for (var index = 1; index < arguments.length; index++) {
        var nextSource = arguments[index];

        if (nextSource != null) {
          // Skip over if undefined or null
          for (var nextKey in nextSource) {
            // Avoid bugs when hasOwnProperty is shadowed
            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
              to[nextKey] = nextSource[nextKey];
            }
          }
        }
      }
      return to;
    },
    writable: true,
    configurable: true
  });
}

/*
 * @shopify/theme-sections
 * -----------------------------------------------------------------------------
 *
 * A framework to provide structure to your Shopify sections and a load and unload
 * lifecycle. The lifecycle is automatically connected to theme editor events so
 * that your sections load and unload as the editor changes the content and
 * settings of your sections.
 */

var SECTION_TYPE_ATTR = 'data-section-type';
var SECTION_ID_ATTR = 'data-section-id';

window.Shopify = window.Shopify || {};
window.Shopify.theme = window.Shopify.theme || {};
window.Shopify.theme.sections = window.Shopify.theme.sections || {};

var registered = (window.Shopify.theme.sections.registered =
  window.Shopify.theme.sections.registered || {});
var instances = (window.Shopify.theme.sections.instances =
  window.Shopify.theme.sections.instances || []);

function register(type, properties) {
  if (typeof type !== 'string') {
    throw new TypeError(
      'Theme Sections: The first argument for .register must be a string that specifies the type of the section being registered'
    );
  }

  if (typeof registered[type] !== 'undefined') {
    throw new Error(
      'Theme Sections: A section of type "' +
        type +
        '" has already been registered. You cannot register the same section type twice'
    );
  }

  function TypedSection(container) {
    Section.call(this, container, properties);
  }

  TypedSection.constructor = Section;
  TypedSection.prototype = Object.create(Section.prototype);
  TypedSection.prototype.type = type;

  return (registered[type] = TypedSection);
}

function load(types, containers) {
  types = normalizeType(types);

  if (typeof containers === 'undefined') {
    containers = document.querySelectorAll('[' + SECTION_TYPE_ATTR + ']');
  }

  containers = normalizeContainers(containers);

  types.forEach(function(type) {
    var TypedSection = registered[type];

    if (typeof TypedSection === 'undefined') {
      return;
    }

    containers = containers.filter(function(container) {
      // Filter from list of containers because container already has an instance loaded
      if (isInstance(container)) {
        return false;
      }

      // Filter from list of containers because container doesn't have data-section-type attribute
      if (container.getAttribute(SECTION_TYPE_ATTR) === null) {
        return false;
      }

      // Keep in list of containers because current type doesn't match
      if (container.getAttribute(SECTION_TYPE_ATTR) !== type) {
        return true;
      }

      instances.push(new TypedSection(container));

      // Filter from list of containers because container now has an instance loaded
      return false;
    });
  });
}

function unload(selector) {
  var instancesToUnload = getInstances(selector);

  instancesToUnload.forEach(function(instance) {
    var index = instances
      .map(function(e) {
        return e.id;
      })
      .indexOf(instance.id);
    instances.splice(index, 1);
    instance.onUnload();
  });
}

function getInstances(selector) {
  var filteredInstances = [];

  // Fetch first element if its an array
  if (NodeList.prototype.isPrototypeOf(selector) || Array.isArray(selector)) {
    var firstElement = selector[0];
  }

  // If selector element is DOM element
  if (selector instanceof Element || firstElement instanceof Element) {
    var containers = normalizeContainers(selector);

    containers.forEach(function(container) {
      filteredInstances = filteredInstances.concat(
        instances.filter(function(instance) {
          return instance.container === container;
        })
      );
    });

    // If select is type string
  } else if (typeof selector === 'string' || typeof firstElement === 'string') {
    var types = normalizeType(selector);

    types.forEach(function(type) {
      filteredInstances = filteredInstances.concat(
        instances.filter(function(instance) {
          return instance.type === type;
        })
      );
    });
  }

  return filteredInstances;
}

function getInstanceById(id) {
  var instance;

  for (var i = 0; i < instances.length; i++) {
    if (instances[i].id === id) {
      instance = instances[i];
      break;
    }
  }
  return instance;
}

function isInstance(selector) {
  return getInstances(selector).length > 0;
}

function normalizeType(types) {
  // If '*' then fetch all registered section types
  if (types === '*') {
    types = Object.keys(registered);

    // If a single section type string is passed, put it in an array
  } else if (typeof types === 'string') {
    types = [types];

    // If single section constructor is passed, transform to array with section
    // type string
  } else if (types.constructor === Section) {
    types = [types.prototype.type];

    // If array of typed section constructors is passed, transform the array to
    // type strings
  } else if (Array.isArray(types) && types[0].constructor === Section) {
    types = types.map(function(TypedSection) {
      return TypedSection.prototype.type;
    });
  }

  types = types.map(function(type) {
    return type.toLowerCase();
  });

  return types;
}

function normalizeContainers(containers) {
  // Nodelist with entries
  if (NodeList.prototype.isPrototypeOf(containers) && containers.length > 0) {
    containers = Array.prototype.slice.call(containers);

    // Empty Nodelist
  } else if (
    NodeList.prototype.isPrototypeOf(containers) &&
    containers.length === 0
  ) {
    containers = [];

    // Handle null (document.querySelector() returns null with no match)
  } else if (containers === null) {
    containers = [];

    // Single DOM element
  } else if (!Array.isArray(containers) && containers instanceof Element) {
    containers = [containers];
  }

  return containers;
}

if (window.Shopify.designMode) {
  document.addEventListener('shopify:section:load', function(event) {
    var id = event.detail.sectionId;
    var container = event.target.querySelector(
      '[' + SECTION_ID_ATTR + '="' + id + '"]'
    );

    if (container !== null) {
      load(container.getAttribute(SECTION_TYPE_ATTR), container);
    }
  });

  document.addEventListener('shopify:section:unload', function(event) {
    var id = event.detail.sectionId;
    var container = event.target.querySelector(
      '[' + SECTION_ID_ATTR + '="' + id + '"]'
    );
    var instance = getInstances(container)[0];

    if (typeof instance === 'object') {
      unload(container);
    }
  });

  document.addEventListener('shopify:section:select', function(event) {
    var instance = getInstanceById(event.detail.sectionId);

    if (typeof instance === 'object') {
      instance.onSelect(event);
    }
  });

  document.addEventListener('shopify:section:deselect', function(event) {
    var instance = getInstanceById(event.detail.sectionId);

    if (typeof instance === 'object') {
      instance.onDeselect(event);
    }
  });

  document.addEventListener('shopify:block:select', function(event) {
    var instance = getInstanceById(event.detail.sectionId);

    if (typeof instance === 'object') {
      instance.onBlockSelect(event);
    }
  });

  document.addEventListener('shopify:block:deselect', function(event) {
    var instance = getInstanceById(event.detail.sectionId);

    if (typeof instance === 'object') {
      instance.onBlockDeselect(event);
    }
  });
}

/*!
 * slide-anim
 * https://github.com/yomotsu/slide-anim
 * (c) 2017 @yomotsu
 * Released under the MIT License.
 */
var global$1 = window;
var isPromiseSuppoted = typeof global$1.Promise === 'function';
var PromiseLike = isPromiseSuppoted ? global$1.Promise : (function () {
    function PromiseLike(executor) {
        var callback = function () { };
        var resolve = function () {
            callback();
        };
        executor(resolve);
        return {
            then: function (_callback) {
                callback = _callback;
            }
        };
    }
    return PromiseLike;
}());

var pool = [];
var inAnimItems = {
    add: function (el, defaultStyle, timeoutId, onCancelled) {
        var inAnimItem = { el: el, defaultStyle: defaultStyle, timeoutId: timeoutId, onCancelled: onCancelled };
        this.remove(el);
        pool.push(inAnimItem);
    },
    remove: function (el) {
        var index = inAnimItems.findIndex(el);
        if (index === -1)
            return;
        var inAnimItem = pool[index];
        clearTimeout(inAnimItem.timeoutId);
        inAnimItem.onCancelled();
        pool.splice(index, 1);
    },
    find: function (el) {
        return pool[inAnimItems.findIndex(el)];
    },
    findIndex: function (el) {
        var index = -1;
        pool.some(function (item, i) {
            if (item.el === el) {
                index = i;
                return true;
            }
            return false;
        });
        return index;
    }
};

var CSS_EASEOUT_EXPO = 'cubic-bezier( 0.19, 1, 0.22, 1 )';
function slideDown(el, options) {
    if (options === void 0) { options = {}; }
    return new PromiseLike(function (resolve) {
        if (inAnimItems.findIndex(el) !== -1)
            return;
        var _isVisible = isVisible(el);
        var hasEndHeight = typeof options.endHeight === 'number';
        var display = options.display || 'block';
        var duration = options.duration || 400;
        var onCancelled = options.onCancelled || function () { };
        var defaultStyle = el.getAttribute('style') || '';
        var style = window.getComputedStyle(el);
        var defaultStyles = getDefaultStyles(el, display);
        var isBorderBox = /border-box/.test(style.getPropertyValue('box-sizing'));
        var contentHeight = defaultStyles.height;
        var minHeight = defaultStyles.minHeight;
        var paddingTop = defaultStyles.paddingTop;
        var paddingBottom = defaultStyles.paddingBottom;
        var borderTop = defaultStyles.borderTop;
        var borderBottom = defaultStyles.borderBottom;
        var cssDuration = duration + "ms";
        var cssEasing = CSS_EASEOUT_EXPO;
        var cssTransition = [
            "height " + cssDuration + " " + cssEasing,
            "min-height " + cssDuration + " " + cssEasing,
            "padding " + cssDuration + " " + cssEasing,
            "border-width " + cssDuration + " " + cssEasing
        ].join();
        var startHeight = _isVisible ? style.height : '0px';
        var startMinHeight = _isVisible ? style.minHeight : '0px';
        var startPaddingTop = _isVisible ? style.paddingTop : '0px';
        var startPaddingBottom = _isVisible ? style.paddingBottom : '0px';
        var startBorderTopWidth = _isVisible ? style.borderTopWidth : '0px';
        var startBorderBottomWidth = _isVisible ? style.borderBottomWidth : '0px';
        var endHeight = (function () {
            if (hasEndHeight)
                return options.endHeight + "px";
            return !isBorderBox ?
                contentHeight - paddingTop - paddingBottom + "px" :
                contentHeight + borderTop + borderBottom + "px";
        })();
        var endMinHeight = minHeight + "px";
        var endPaddingTop = paddingTop + "px";
        var endPaddingBottom = paddingBottom + "px";
        var endBorderTopWidth = borderTop + "px";
        var endBorderBottomWidth = borderBottom + "px";
        if (startHeight === endHeight &&
            startPaddingTop === endPaddingTop &&
            startPaddingBottom === endPaddingBottom &&
            startBorderTopWidth === endBorderTopWidth &&
            startBorderBottomWidth === endBorderBottomWidth) {
            resolve();
            return;
        }
        requestAnimationFrame(function () {
            el.style.height = startHeight;
            el.style.minHeight = startMinHeight;
            el.style.paddingTop = startPaddingTop;
            el.style.paddingBottom = startPaddingBottom;
            el.style.borderTopWidth = startBorderTopWidth;
            el.style.borderBottomWidth = startBorderBottomWidth;
            el.style.display = display;
            el.style.overflow = 'hidden';
            el.style.visibility = 'visible';
            el.style.transition = cssTransition;
            el.style.webkitTransition = cssTransition;
            requestAnimationFrame(function () {
                el.style.height = endHeight;
                el.style.minHeight = endMinHeight;
                el.style.paddingTop = endPaddingTop;
                el.style.paddingBottom = endPaddingBottom;
                el.style.borderTopWidth = endBorderTopWidth;
                el.style.borderBottomWidth = endBorderBottomWidth;
            });
        });
        var timeoutId = setTimeout(function () {
            resetStyle(el);
            el.style.display = display;
            if (hasEndHeight) {
                el.style.height = options.endHeight + "px";
                el.style.overflow = "hidden";
            }
            inAnimItems.remove(el);
            resolve();
        }, duration);
        inAnimItems.add(el, defaultStyle, timeoutId, onCancelled);
    });
}
function slideUp(el, options) {
    if (options === void 0) { options = {}; }
    return new PromiseLike(function (resolve) {
        if (inAnimItems.findIndex(el) !== -1)
            return;
        var _isVisible = isVisible(el);
        var display = options.display || 'block';
        var duration = options.duration || 400;
        var onCancelled = options.onCancelled || function () { };
        if (!_isVisible) {
            resolve();
            return;
        }
        var defaultStyle = el.getAttribute('style') || '';
        var style = window.getComputedStyle(el);
        var isBorderBox = /border-box/.test(style.getPropertyValue('box-sizing'));
        var minHeight = pxToNumber(style.getPropertyValue('min-height'));
        var paddingTop = pxToNumber(style.getPropertyValue('padding-top'));
        var paddingBottom = pxToNumber(style.getPropertyValue('padding-bottom'));
        var borderTop = pxToNumber(style.getPropertyValue('border-top-width'));
        var borderBottom = pxToNumber(style.getPropertyValue('border-bottom-width'));
        var contentHeight = el.scrollHeight;
        var cssDuration = duration + 'ms';
        var cssEasing = CSS_EASEOUT_EXPO;
        var cssTransition = [
            "height " + cssDuration + " " + cssEasing,
            "padding " + cssDuration + " " + cssEasing,
            "border-width " + cssDuration + " " + cssEasing
        ].join();
        var startHeight = !isBorderBox ?
            contentHeight - paddingTop - paddingBottom + "px" :
            contentHeight + borderTop + borderBottom + "px";
        var startMinHeight = minHeight + "px";
        var startPaddingTop = paddingTop + "px";
        var startPaddingBottom = paddingBottom + "px";
        var startBorderTopWidth = borderTop + "px";
        var startBorderBottomWidth = borderBottom + "px";
        requestAnimationFrame(function () {
            el.style.height = startHeight;
            el.style.minHeight = startMinHeight;
            el.style.paddingTop = startPaddingTop;
            el.style.paddingBottom = startPaddingBottom;
            el.style.borderTopWidth = startBorderTopWidth;
            el.style.borderBottomWidth = startBorderBottomWidth;
            el.style.display = display;
            el.style.overflow = 'hidden';
            el.style.transition = cssTransition;
            el.style.webkitTransition = cssTransition;
            requestAnimationFrame(function () {
                el.style.height = '0';
                el.style.minHeight = '0';
                el.style.paddingTop = '0';
                el.style.paddingBottom = '0';
                el.style.borderTopWidth = '0';
                el.style.borderBottomWidth = '0';
            });
        });
        var timeoutId = setTimeout(function () {
            resetStyle(el);
            el.style.display = 'none';
            inAnimItems.remove(el);
            resolve();
        }, duration);
        inAnimItems.add(el, defaultStyle, timeoutId, onCancelled);
    });
}
function slideStop(el) {
    var elementObject = inAnimItems.find(el);
    if (!elementObject)
        return;
    var style = window.getComputedStyle(el);
    var height = style.height;
    var paddingTop = style.paddingTop;
    var paddingBottom = style.paddingBottom;
    var borderTopWidth = style.borderTopWidth;
    var borderBottomWidth = style.borderBottomWidth;
    resetStyle(el);
    el.style.height = height;
    el.style.paddingTop = paddingTop;
    el.style.paddingBottom = paddingBottom;
    el.style.borderTopWidth = borderTopWidth;
    el.style.borderBottomWidth = borderBottomWidth;
    el.style.overflow = 'hidden';
    inAnimItems.remove(el);
}
function isVisible(el) {
    return el.offsetHeight !== 0;
}
function resetStyle(el) {
    el.style.visibility = '';
    el.style.height = '';
    el.style.minHeight = '';
    el.style.paddingTop = '';
    el.style.paddingBottom = '';
    el.style.borderTopWidth = '';
    el.style.borderBottomWidth = '';
    el.style.overflow = '';
    el.style.transition = '';
    el.style.webkitTransition = '';
}
function getDefaultStyles(el, defaultDisplay) {
    if (defaultDisplay === void 0) { defaultDisplay = 'block'; }
    var defaultStyle = el.getAttribute('style') || '';
    var style = window.getComputedStyle(el);
    el.style.visibility = 'hidden';
    el.style.display = defaultDisplay;
    var width = pxToNumber(style.getPropertyValue('width'));
    el.style.position = 'absolute';
    el.style.width = width + "px";
    el.style.height = '';
    el.style.minHeight = '';
    el.style.paddingTop = '';
    el.style.paddingBottom = '';
    el.style.borderTopWidth = '';
    el.style.borderBottomWidth = '';
    var minHeight = pxToNumber(style.getPropertyValue('min-height'));
    var paddingTop = pxToNumber(style.getPropertyValue('padding-top'));
    var paddingBottom = pxToNumber(style.getPropertyValue('padding-bottom'));
    var borderTop = pxToNumber(style.getPropertyValue('border-top-width'));
    var borderBottom = pxToNumber(style.getPropertyValue('border-bottom-width'));
    var height = el.scrollHeight;
    el.setAttribute('style', defaultStyle);
    return {
        height: height,
        minHeight: minHeight,
        paddingTop: paddingTop,
        paddingBottom: paddingBottom,
        borderTop: borderTop,
        borderBottom: borderBottom
    };
}
function pxToNumber(px) {
    return +px.replace(/px/, '');
}

function n$3(n,t){return void 0===t&&(t=document),t.querySelector(n)}function t$7(n,t){return void 0===t&&(t=document),[].slice.call(t.querySelectorAll(n))}function c$2(n,t){return Array.isArray(n)?n.forEach(t):t(n)}function r$3(n){return function(t,r,e){return c$2(t,function(t){return t[n+"EventListener"](r,e)})}}function e$3(n,t,c){return r$3("add")(n,t,c),function(){return r$3("remove")(n,t,c)}}function o$2(n){return function(t){var r=arguments;return c$2(t,function(t){var c;return (c=t.classList)[n].apply(c,[].slice.call(r,1))})}}function u$2(n){o$2("add").apply(void 0,[n].concat([].slice.call(arguments,1)));}function i$1(n){o$2("remove").apply(void 0,[n].concat([].slice.call(arguments,1)));}function l(n){o$2("toggle").apply(void 0,[n].concat([].slice.call(arguments,1)));}function a$1(n,t){return n.classList.contains(t)}

var selectors$P = {
  labels: '.accordion__label'
};

var accordion = node => {
  node.classList.add('accordion--active');
  var labels = t$7(selectors$P.labels, node);
  labels.forEach(label => {
    if (!a$1(label, 'type-heading-3')) u$2(label, 'type-heading-3');
  });
  var events = [];

  var _handleAnimation = e => {
    var {
      parentNode: group,
      nextElementSibling: content
    } = e.currentTarget;
    e.preventDefault();
    slideStop(content);

    if (isVisible(content)) {
      slideUp(content);
      e.currentTarget.setAttribute('aria-expanded', false);
      group.setAttribute('data-open', false);
      content.setAttribute('aria-hidden', true);
    } else {
      slideDown(content);
      e.currentTarget.setAttribute('aria-expanded', true);
      group.setAttribute('data-open', true);
      content.setAttribute('aria-hidden', false);
    }
  };

  labels.forEach(label => {
    if (label.tagName === 'A') {
      label.href = '#';
    }

    events.push(e$3(label, 'click', e => _handleAnimation(e)));
  });

  var unload = () => {
    events.forEach(event => {
      event.element.removeEventListener(event.action, event.function);
    });
  };

  return {
    unload
  };
};

var n$2,e$2,i,o$1,t$6,r$2,f,d$1,p,u$1=[];function w(n,a){return e$2=window.pageXOffset,o$1=window.pageYOffset,r$2=window.innerHeight,d$1=window.innerWidth,void 0===i&&(i=e$2),void 0===t$6&&(t$6=o$1),void 0===p&&(p=d$1),void 0===f&&(f=r$2),(a||o$1!==t$6||e$2!==i||r$2!==f||d$1!==p)&&(!function(n){for(var w=0;w<u$1.length;w++)u$1[w]({x:e$2,y:o$1,px:i,py:t$6,vh:r$2,pvh:f,vw:d$1,pvw:p},n);}(n),i=e$2,t$6=o$1,f=r$2,p=d$1),requestAnimationFrame(w)}function srraf(e){return u$1.indexOf(e)<0&&u$1.push(e),n$2=n$2||w(performance.now()),{update:function(){return w(performance.now(),!0),this},destroy:function(){u$1.splice(u$1.indexOf(e),1);}}}

var n$1=function(n){if("object"!=typeof(t=n)||Array.isArray(t))throw "state should be an object";var t;},t$5=function(n,t,e,c){return (r=n,r.reduce(function(n,t,e){return n.indexOf(t)>-1?n:n.concat(t)},[])).reduce(function(n,e){return n.concat(t[e]||[])},[]).map(function(n){return n(e,c)});var r;},e$1=a(),c$1=e$1.on,r$1=e$1.emit,o=e$1.hydrate,u=e$1.getState;function a(e){void 0===e&&(e={});var c={};return {getState:function(){return Object.assign({},e)},hydrate:function(r){return n$1(r),Object.assign(e,r),function(){var n=["*"].concat(Object.keys(r));t$5(n,c,e);}},on:function(n,t){return (n=[].concat(n)).map(function(n){return c[n]=(c[n]||[]).concat(t)}),function(){return n.map(function(n){return c[n].splice(c[n].indexOf(t),1)})}},emit:function(r,o,u){var a=("*"===r?[]:["*"]).concat(r);(o="function"==typeof o?o(e):o)&&(n$1(o),Object.assign(e,o),a=a.concat(Object.keys(o))),t$5(a,c,e,u);}}}

var selectors$O = {
  headerContainer: '.header-container',
  headerWrapper: '#header',
  utilityBar: '.utility-bar-section',
  logoWrapper: '.header__logo-wrapper'
};

var stickyHeader = node => {
  if (!node) return;
  var root = document.documentElement; // Elements can change when resizing or altering header

  var headerParent = null;
  var headerHeight = null;
  var headerWrapper = null;
  var utilityBar = null;
  var utilityBarHeight = null;
  var headerHasCustomLogoImage = null;
  var initialHeightSet = false;
  var transparentEnabled = null;
  var scroller = null;
  var stickyScroller = null; // Breakpoint is equal to 60em

  var mediumBP = 960;
  var offsetRootVar = '--header-offset-height';
  var initialHeight = '--header-initial-height'; // get elements & element heights

  var _defineElements = () => {
    headerParent = document.querySelector(selectors$O.headerContainer);
    headerWrapper = node.querySelector(selectors$O.headerWrapper);
    utilityBar = node.querySelector(selectors$O.utilityBar);
    utilityBarHeight = utilityBar ? utilityBar.offsetHeight : 0;
    headerHeight = utilityBarHeight + headerWrapper.offsetHeight;
    node.querySelector(selectors$O.logoWrapper);
    headerHasCustomLogoImage = node.querySelector('.header__logo-image img'); // True if the transparent header is enabled in the theme editor

    transparentEnabled = JSON.parse(headerWrapper.dataset.transparentHeader);
  };

  _defineElements();

  var _screenUnderMediumBP = () => {
    var viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    return viewportWidth <= mediumBP;
  };

  var screenUnderMediumBP = _screenUnderMediumBP();

  scroller = srraf(_ref => {
    var {
      vw
    } = _ref;

    _setRootVar('--header-height', utilityBarHeight + headerWrapper.offsetHeight);

    var currentScreenWidthUnderMediumBP = vw <= mediumBP;

    if (currentScreenWidthUnderMediumBP !== screenUnderMediumBP) {
      screenUnderMediumBP = currentScreenWidthUnderMediumBP;

      _setupStickyHeader();
    }
  });

  var _setRootVar = (name, value) => {
    root.style.setProperty(name, "".concat(value, "px"));
  };

  var _setHeaderType = () => {
    // Remove header types incase of customizer changes
    root.classList.remove('header-transparent', 'header-sticky');
    root.classList.add(transparentEnabled ? 'header-transparent' : 'header-sticky');
  };

  var _setupStickyHeader = () => {
    //redifine elements & heights
    _defineElements(); // If the header has a logo image we calculate values after image has loaded


    if (!headerHasCustomLogoImage || headerHasCustomLogoImage && headerHasCustomLogoImage.complete) {
      _processStickyHeader();
    } else {
      headerHasCustomLogoImage.addEventListener('load', _processStickyHeader, {
        once: true
      });
    }
  };

  var _processStickyHeader = () => {
    if (!initialHeightSet) {
      _setRootVar(initialHeight, headerHeight);

      initialHeightSet = true;
    }

    _setRootVar(offsetRootVar, headerHeight);

    _setHeaderType();

    _initStickyHeader(_getStickyOffsets());
  }; // Returns object of offset values


  var _getStickyOffsets = () => {
    var offsets = {};
    offsets.stickyHeaderResetPosition = utilityBarHeight ? 0 : 1; // Set offSets based on size and content of header

    offsets.offsetHeight = utilityBarHeight;
    offsets.scrollYToSticky = utilityBarHeight ? utilityBarHeight : 1;
    return offsets;
  };

  var _initStickyHeader = offsets => {
    var {
      scrollYToSticky,
      offsetHeight,
      stickyHeaderResetPosition
    } = offsets; // Destroy stickyScroller if one already exists

    if (stickyScroller) {
      stickyScroller.destroy();
    } // Init the scroller to monitor for y position to stick/unstick header


    stickyScroller = srraf(_ref2 => {
      var {
        y
      } = _ref2;

      if (!document.body.classList.contains('scroll-lock')) {
        if (y < scrollYToSticky) {
          _toggleStickyHeader(false, headerParent);

          if (utilityBarHeight) {
            _setElementTopPosition(headerParent, stickyHeaderResetPosition);
          }

          _setRootVar(offsetRootVar, headerHeight - y);
        } else if (y >= scrollYToSticky) {
          _toggleStickyHeader(true, headerParent);

          if (utilityBarHeight) {
            _setElementTopPosition(headerParent, -offsetHeight);
          }

          _setRootVar(offsetRootVar, headerHeight);
        }
      }
    });
    stickyScroller.update();
  };

  var _setElementTopPosition = (element, value) => {
    element.style.top = "".concat(value, "px");
  };

  var _toggleStickyHeader = (isSticky, element) => {
    if (isSticky) {
      root.classList.add('header-stuck');
      element.classList.add('is-sticky');
      headerWrapper.classList.remove('header--transparent');
      r$1('sticky-header:stuck');
    } else {
      element.classList.remove('is-sticky');
      root.classList.remove('header-stuck');

      if (transparentEnabled) {
        headerWrapper.classList.add('header--transparent');
      }
    }
  };

  var _reload = () => {
    scroller.update();

    _setupStickyHeader(); // Let pages know the header changed


    r$1('headerChange', () => {});
  };

  c$1('sticky-header:reload', () => {
    _reload();
  });

  _setupStickyHeader();

  var unload = () => {
    if (scroller) {
      scroller.destroy();
    }

    if (stickyScroller) {
      stickyScroller.destroy();
    }
  };

  return {
    unload
  };
};

var events = {
  filters: {
    updated: 'filters:updated'
  },
  sort: {
    updated: 'sort:updated'
  },
  reviews: {
    added: 'reviews:added'
  },
  headerOverlay: {
    show: 'headerOverlay:show',
    hide: 'headerOverlay:hide',
    hiding: 'headerOverlay:hiding'
  },
  drawerOverlay: {
    show: 'drawerOverlay:show',
    hide: 'drawerOverlay:hide',
    hiding: 'drawerOverlay:hiding'
  }
};

var classes$f = {
  visible: 'visible'
};

var headerOverlay = node => {
  if (!node) return;
  var overlay = node;
  var overlayShowListener = c$1(events.headerOverlay.show, () => _showOverlay());
  var overlayHideListener = c$1(events.headerOverlay.hide, () => _hideOverlay());

  var _showOverlay = () => {
    o({
      headerOverlayOpen: true
    });
    overlay.classList.add(classes$f.visible);
  };

  var _hideOverlay = () => {
    o({
      headerOverlayOpen: false
    });
    r$1(events.headerOverlay.hiding);
    overlay.classList.remove(classes$f.visible);
  };

  var unload = () => {
    overlayShowListener();
    overlayHideListener();
  };

  return {
    unload
  };
};

var selectors$N = {
  innerOverlay: '.drawer-overlay__inner'
};
var classes$e = {
  isVisible: 'is-visible',
  isActive: 'is-active'
};

var drawerOverlay = node => {
  if (!node) return;
  var overlay = node;
  var overlayInner = node.querySelector(selectors$N.innerOverlay);
  var overlayShowListener = c$1(events.drawerOverlay.show, () => _showOverlay());
  var overlayHideListener = c$1(events.drawerOverlay.hide, () => _hideOverlay());

  var _showOverlay = () => {
    overlay.classList.add(classes$e.isActive);
    setTimeout(() => {
      overlayInner.classList.add(classes$e.isVisible);
    }, 10);
  };

  var _hideOverlay = () => {
    r$1(events.drawerOverlay.hiding);
    overlayInner.classList.remove(classes$e.isVisible);
    setTimeout(() => {
      overlay.classList.remove(classes$e.isActive);
    }, 300);
  };

  overlay.addEventListener('click', _hideOverlay);

  var unload = () => {
    overlayShowListener();
    overlayHideListener();
    overlay.removeEventListener('click', _hideOverlay);
  };

  return {
    unload
  };
};

/*!
* tabbable 5.2.1
* @license MIT, https://github.com/focus-trap/tabbable/blob/master/LICENSE
*/
var candidateSelectors$1 = ['input', 'select', 'textarea', 'a[href]', 'button', '[tabindex]', 'audio[controls]', 'video[controls]', '[contenteditable]:not([contenteditable="false"])', 'details>summary:first-of-type', 'details'];
var candidateSelector$1 = /* #__PURE__ */candidateSelectors$1.join(',');
var matches$1 = typeof Element === 'undefined' ? function () {} : Element.prototype.matches || Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;

var getCandidates = function getCandidates(el, includeContainer, filter) {
  var candidates = Array.prototype.slice.apply(el.querySelectorAll(candidateSelector$1));

  if (includeContainer && matches$1.call(el, candidateSelector$1)) {
    candidates.unshift(el);
  }

  candidates = candidates.filter(filter);
  return candidates;
};

var isContentEditable$1 = function isContentEditable(node) {
  return node.contentEditable === 'true';
};

var getTabindex$1 = function getTabindex(node) {
  var tabindexAttr = parseInt(node.getAttribute('tabindex'), 10);

  if (!isNaN(tabindexAttr)) {
    return tabindexAttr;
  } // Browsers do not return `tabIndex` correctly for contentEditable nodes;
  // so if they don't have a tabindex attribute specifically set, assume it's 0.


  if (isContentEditable$1(node)) {
    return 0;
  } // in Chrome, <details/>, <audio controls/> and <video controls/> elements get a default
  //  `tabIndex` of -1 when the 'tabindex' attribute isn't specified in the DOM,
  //  yet they are still part of the regular tab order; in FF, they get a default
  //  `tabIndex` of 0; since Chrome still puts those elements in the regular tab
  //  order, consider their tab index to be 0.


  if ((node.nodeName === 'AUDIO' || node.nodeName === 'VIDEO' || node.nodeName === 'DETAILS') && node.getAttribute('tabindex') === null) {
    return 0;
  }

  return node.tabIndex;
};

var sortOrderedTabbables$1 = function sortOrderedTabbables(a, b) {
  return a.tabIndex === b.tabIndex ? a.documentOrder - b.documentOrder : a.tabIndex - b.tabIndex;
};

var isInput$1 = function isInput(node) {
  return node.tagName === 'INPUT';
};

var isHiddenInput$1 = function isHiddenInput(node) {
  return isInput$1(node) && node.type === 'hidden';
};

var isDetailsWithSummary = function isDetailsWithSummary(node) {
  var r = node.tagName === 'DETAILS' && Array.prototype.slice.apply(node.children).some(function (child) {
    return child.tagName === 'SUMMARY';
  });
  return r;
};

var getCheckedRadio$1 = function getCheckedRadio(nodes, form) {
  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i].checked && nodes[i].form === form) {
      return nodes[i];
    }
  }
};

var isTabbableRadio$1 = function isTabbableRadio(node) {
  if (!node.name) {
    return true;
  }

  var radioScope = node.form || node.ownerDocument;

  var queryRadios = function queryRadios(name) {
    return radioScope.querySelectorAll('input[type="radio"][name="' + name + '"]');
  };

  var radioSet;

  if (typeof window !== 'undefined' && typeof window.CSS !== 'undefined' && typeof window.CSS.escape === 'function') {
    radioSet = queryRadios(window.CSS.escape(node.name));
  } else {
    try {
      radioSet = queryRadios(node.name);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Looks like you have a radio button with a name attribute containing invalid CSS selector characters and need the CSS.escape polyfill: %s', err.message);
      return false;
    }
  }

  var checked = getCheckedRadio$1(radioSet, node.form);
  return !checked || checked === node;
};

var isRadio$1 = function isRadio(node) {
  return isInput$1(node) && node.type === 'radio';
};

var isNonTabbableRadio$1 = function isNonTabbableRadio(node) {
  return isRadio$1(node) && !isTabbableRadio$1(node);
};

var isHidden$1 = function isHidden(node, displayCheck) {
  if (getComputedStyle(node).visibility === 'hidden') {
    return true;
  }

  var isDirectSummary = matches$1.call(node, 'details>summary:first-of-type');
  var nodeUnderDetails = isDirectSummary ? node.parentElement : node;

  if (matches$1.call(nodeUnderDetails, 'details:not([open]) *')) {
    return true;
  }

  if (!displayCheck || displayCheck === 'full') {
    while (node) {
      if (getComputedStyle(node).display === 'none') {
        return true;
      }

      node = node.parentElement;
    }
  } else if (displayCheck === 'non-zero-area') {
    var _node$getBoundingClie = node.getBoundingClientRect(),
        width = _node$getBoundingClie.width,
        height = _node$getBoundingClie.height;

    return width === 0 && height === 0;
  }

  return false;
}; // form fields (nested) inside a disabled fieldset are not focusable/tabbable
//  unless they are in the _first_ <legend> element of the top-most disabled
//  fieldset


var isDisabledFromFieldset = function isDisabledFromFieldset(node) {
  if (isInput$1(node) || node.tagName === 'SELECT' || node.tagName === 'TEXTAREA' || node.tagName === 'BUTTON') {
    var parentNode = node.parentElement;

    while (parentNode) {
      if (parentNode.tagName === 'FIELDSET' && parentNode.disabled) {
        // look for the first <legend> as an immediate child of the disabled
        //  <fieldset>: if the node is in that legend, it'll be enabled even
        //  though the fieldset is disabled; otherwise, the node is in a
        //  secondary/subsequent legend, or somewhere else within the fieldset
        //  (however deep nested) and it'll be disabled
        for (var i = 0; i < parentNode.children.length; i++) {
          var child = parentNode.children.item(i);

          if (child.tagName === 'LEGEND') {
            if (child.contains(node)) {
              return false;
            } // the node isn't in the first legend (in doc order), so no matter
            //  where it is now, it'll be disabled


            return true;
          }
        } // the node isn't in a legend, so no matter where it is now, it'll be disabled


        return true;
      }

      parentNode = parentNode.parentElement;
    }
  } // else, node's tabbable/focusable state should not be affected by a fieldset's
  //  enabled/disabled state


  return false;
};

var isNodeMatchingSelectorFocusable$1 = function isNodeMatchingSelectorFocusable(options, node) {
  if (node.disabled || isHiddenInput$1(node) || isHidden$1(node, options.displayCheck) || // For a details element with a summary, the summary element gets the focus
  isDetailsWithSummary(node) || isDisabledFromFieldset(node)) {
    return false;
  }

  return true;
};

var isNodeMatchingSelectorTabbable$1 = function isNodeMatchingSelectorTabbable(options, node) {
  if (!isNodeMatchingSelectorFocusable$1(options, node) || isNonTabbableRadio$1(node) || getTabindex$1(node) < 0) {
    return false;
  }

  return true;
};

var tabbable$1 = function tabbable(el, options) {
  options = options || {};
  var regularTabbables = [];
  var orderedTabbables = [];
  var candidates = getCandidates(el, options.includeContainer, isNodeMatchingSelectorTabbable$1.bind(null, options));
  candidates.forEach(function (candidate, i) {
    var candidateTabindex = getTabindex$1(candidate);

    if (candidateTabindex === 0) {
      regularTabbables.push(candidate);
    } else {
      orderedTabbables.push({
        documentOrder: i,
        tabIndex: candidateTabindex,
        node: candidate
      });
    }
  });
  var tabbableNodes = orderedTabbables.sort(sortOrderedTabbables$1).map(function (a) {
    return a.node;
  }).concat(regularTabbables);
  return tabbableNodes;
};

var focusable = function focusable(el, options) {
  options = options || {};
  var candidates = getCandidates(el, options.includeContainer, isNodeMatchingSelectorFocusable$1.bind(null, options));
  return candidates;
};

var isTabbable$1 = function isTabbable(node, options) {
  options = options || {};

  if (!node) {
    throw new Error('No node provided');
  }

  if (matches$1.call(node, candidateSelector$1) === false) {
    return false;
  }

  return isNodeMatchingSelectorTabbable$1(options, node);
};

var focusableCandidateSelector$1 = /* #__PURE__ */candidateSelectors$1.concat('iframe').join(',');

var isFocusable$1 = function isFocusable(node, options) {
  options = options || {};

  if (!node) {
    throw new Error('No node provided');
  }

  if (matches$1.call(node, focusableCandidateSelector$1) === false) {
    return false;
  }

  return isNodeMatchingSelectorFocusable$1(options, node);
};

/*!
* focus-trap 6.7.3
* @license MIT, https://github.com/focus-trap/focus-trap/blob/master/LICENSE
*/

function ownKeys$1(object, enumerableOnly) {
  var keys = Object.keys(object);

  if (Object.getOwnPropertySymbols) {
    var symbols = Object.getOwnPropertySymbols(object);
    enumerableOnly && (symbols = symbols.filter(function (sym) {
      return Object.getOwnPropertyDescriptor(object, sym).enumerable;
    })), keys.push.apply(keys, symbols);
  }

  return keys;
}

function _objectSpread2$1(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = null != arguments[i] ? arguments[i] : {};
    i % 2 ? ownKeys$1(Object(source), !0).forEach(function (key) {
      _defineProperty$1(target, key, source[key]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys$1(Object(source)).forEach(function (key) {
      Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
    });
  }

  return target;
}

function _defineProperty$1(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

var activeFocusTraps = function () {
  var trapQueue = [];
  return {
    activateTrap: function activateTrap(trap) {
      if (trapQueue.length > 0) {
        var activeTrap = trapQueue[trapQueue.length - 1];

        if (activeTrap !== trap) {
          activeTrap.pause();
        }
      }

      var trapIndex = trapQueue.indexOf(trap);

      if (trapIndex === -1) {
        trapQueue.push(trap);
      } else {
        // move this existing trap to the front of the queue
        trapQueue.splice(trapIndex, 1);
        trapQueue.push(trap);
      }
    },
    deactivateTrap: function deactivateTrap(trap) {
      var trapIndex = trapQueue.indexOf(trap);

      if (trapIndex !== -1) {
        trapQueue.splice(trapIndex, 1);
      }

      if (trapQueue.length > 0) {
        trapQueue[trapQueue.length - 1].unpause();
      }
    }
  };
}();

var isSelectableInput = function isSelectableInput(node) {
  return node.tagName && node.tagName.toLowerCase() === 'input' && typeof node.select === 'function';
};

var isEscapeEvent = function isEscapeEvent(e) {
  return e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27;
};

var isTabEvent = function isTabEvent(e) {
  return e.key === 'Tab' || e.keyCode === 9;
};

var delay = function delay(fn) {
  return setTimeout(fn, 0);
}; // Array.find/findIndex() are not supported on IE; this replicates enough
//  of Array.findIndex() for our needs


var findIndex = function findIndex(arr, fn) {
  var idx = -1;
  arr.every(function (value, i) {
    if (fn(value)) {
      idx = i;
      return false; // break
    }

    return true; // next
  });
  return idx;
};
/**
 * Get an option's value when it could be a plain value, or a handler that provides
 *  the value.
 * @param {*} value Option's value to check.
 * @param {...*} [params] Any parameters to pass to the handler, if `value` is a function.
 * @returns {*} The `value`, or the handler's returned value.
 */


var valueOrHandler = function valueOrHandler(value) {
  for (var _len = arguments.length, params = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    params[_key - 1] = arguments[_key];
  }

  return typeof value === 'function' ? value.apply(void 0, params) : value;
};

var getActualTarget = function getActualTarget(event) {
  // NOTE: If the trap is _inside_ a shadow DOM, event.target will always be the
  //  shadow host. However, event.target.composedPath() will be an array of
  //  nodes "clicked" from inner-most (the actual element inside the shadow) to
  //  outer-most (the host HTML document). If we have access to composedPath(),
  //  then use its first element; otherwise, fall back to event.target (and
  //  this only works for an _open_ shadow DOM; otherwise,
  //  composedPath()[0] === event.target always).
  return event.target.shadowRoot && typeof event.composedPath === 'function' ? event.composedPath()[0] : event.target;
};

var createFocusTrap = function createFocusTrap(elements, userOptions) {
  // SSR: a live trap shouldn't be created in this type of environment so this
  //  should be safe code to execute if the `document` option isn't specified
  var doc = (userOptions === null || userOptions === void 0 ? void 0 : userOptions.document) || document;

  var config = _objectSpread2$1({
    returnFocusOnDeactivate: true,
    escapeDeactivates: true,
    delayInitialFocus: true
  }, userOptions);

  var state = {
    // @type {Array<HTMLElement>}
    containers: [],
    // list of objects identifying the first and last tabbable nodes in all containers/groups in
    //  the trap
    // NOTE: it's possible that a group has no tabbable nodes if nodes get removed while the trap
    //  is active, but the trap should never get to a state where there isn't at least one group
    //  with at least one tabbable node in it (that would lead to an error condition that would
    //  result in an error being thrown)
    // @type {Array<{
    //   container: HTMLElement,
    //   firstTabbableNode: HTMLElement|null,
    //   lastTabbableNode: HTMLElement|null,
    //   nextTabbableNode: (node: HTMLElement, forward: boolean) => HTMLElement|undefined
    // }>}
    tabbableGroups: [],
    nodeFocusedBeforeActivation: null,
    mostRecentlyFocusedNode: null,
    active: false,
    paused: false,
    // timer ID for when delayInitialFocus is true and initial focus in this trap
    //  has been delayed during activation
    delayInitialFocusTimer: undefined
  };
  var trap; // eslint-disable-line prefer-const -- some private functions reference it, and its methods reference private functions, so we must declare here and define later

  var getOption = function getOption(configOverrideOptions, optionName, configOptionName) {
    return configOverrideOptions && configOverrideOptions[optionName] !== undefined ? configOverrideOptions[optionName] : config[configOptionName || optionName];
  };

  var containersContain = function containersContain(element) {
    return !!(element && state.containers.some(function (container) {
      return container.contains(element);
    }));
  };
  /**
   * Gets the node for the given option, which is expected to be an option that
   *  can be either a DOM node, a string that is a selector to get a node, `false`
   *  (if a node is explicitly NOT given), or a function that returns any of these
   *  values.
   * @param {string} optionName
   * @returns {undefined | false | HTMLElement | SVGElement} Returns
   *  `undefined` if the option is not specified; `false` if the option
   *  resolved to `false` (node explicitly not given); otherwise, the resolved
   *  DOM node.
   * @throws {Error} If the option is set, not `false`, and is not, or does not
   *  resolve to a node.
   */


  var getNodeForOption = function getNodeForOption(optionName) {
    var optionValue = config[optionName];

    if (typeof optionValue === 'function') {
      for (var _len2 = arguments.length, params = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        params[_key2 - 1] = arguments[_key2];
      }

      optionValue = optionValue.apply(void 0, params);
    }

    if (!optionValue) {
      if (optionValue === undefined || optionValue === false) {
        return optionValue;
      } // else, empty string (invalid), null (invalid), 0 (invalid)


      throw new Error("`".concat(optionName, "` was specified but was not a node, or did not return a node"));
    }

    var node = optionValue; // could be HTMLElement, SVGElement, or non-empty string at this point

    if (typeof optionValue === 'string') {
      node = doc.querySelector(optionValue); // resolve to node, or null if fails

      if (!node) {
        throw new Error("`".concat(optionName, "` as selector refers to no known node"));
      }
    }

    return node;
  };

  var getInitialFocusNode = function getInitialFocusNode() {
    var node = getNodeForOption('initialFocus'); // false explicitly indicates we want no initialFocus at all

    if (node === false) {
      return false;
    }

    if (node === undefined) {
      // option not specified: use fallback options
      if (containersContain(doc.activeElement)) {
        node = doc.activeElement;
      } else {
        var firstTabbableGroup = state.tabbableGroups[0];
        var firstTabbableNode = firstTabbableGroup && firstTabbableGroup.firstTabbableNode; // NOTE: `fallbackFocus` option function cannot return `false` (not supported)

        node = firstTabbableNode || getNodeForOption('fallbackFocus');
      }
    }

    if (!node) {
      throw new Error('Your focus-trap needs to have at least one focusable element');
    }

    return node;
  };

  var updateTabbableNodes = function updateTabbableNodes() {
    state.tabbableGroups = state.containers.map(function (container) {
      var tabbableNodes = tabbable$1(container); // NOTE: if we have tabbable nodes, we must have focusable nodes; focusable nodes
      //  are a superset of tabbable nodes

      var focusableNodes = focusable(container);

      if (tabbableNodes.length > 0) {
        return {
          container: container,
          firstTabbableNode: tabbableNodes[0],
          lastTabbableNode: tabbableNodes[tabbableNodes.length - 1],

          /**
           * Finds the __tabbable__ node that follows the given node in the specified direction,
           *  in this container, if any.
           * @param {HTMLElement} node
           * @param {boolean} [forward] True if going in forward tab order; false if going
           *  in reverse.
           * @returns {HTMLElement|undefined} The next tabbable node, if any.
           */
          nextTabbableNode: function nextTabbableNode(node) {
            var forward = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
            // NOTE: If tabindex is positive (in order to manipulate the tab order separate
            //  from the DOM order), this __will not work__ because the list of focusableNodes,
            //  while it contains tabbable nodes, does not sort its nodes in any order other
            //  than DOM order, because it can't: Where would you place focusable (but not
            //  tabbable) nodes in that order? They have no order, because they aren't tabbale...
            // Support for positive tabindex is already broken and hard to manage (possibly
            //  not supportable, TBD), so this isn't going to make things worse than they
            //  already are, and at least makes things better for the majority of cases where
            //  tabindex is either 0/unset or negative.
            // FYI, positive tabindex issue: https://github.com/focus-trap/focus-trap/issues/375
            var nodeIdx = focusableNodes.findIndex(function (n) {
              return n === node;
            });

            if (forward) {
              return focusableNodes.slice(nodeIdx + 1).find(function (n) {
                return isTabbable$1(n);
              });
            }

            return focusableNodes.slice(0, nodeIdx).reverse().find(function (n) {
              return isTabbable$1(n);
            });
          }
        };
      }

      return undefined;
    }).filter(function (group) {
      return !!group;
    }); // remove groups with no tabbable nodes
    // throw if no groups have tabbable nodes and we don't have a fallback focus node either

    if (state.tabbableGroups.length <= 0 && !getNodeForOption('fallbackFocus') // returning false not supported for this option
    ) {
      throw new Error('Your focus-trap must have at least one container with at least one tabbable node in it at all times');
    }
  };

  var tryFocus = function tryFocus(node) {
    if (node === false) {
      return;
    }

    if (node === doc.activeElement) {
      return;
    }

    if (!node || !node.focus) {
      tryFocus(getInitialFocusNode());
      return;
    }

    node.focus({
      preventScroll: !!config.preventScroll
    });
    state.mostRecentlyFocusedNode = node;

    if (isSelectableInput(node)) {
      node.select();
    }
  };

  var getReturnFocusNode = function getReturnFocusNode(previousActiveElement) {
    var node = getNodeForOption('setReturnFocus', previousActiveElement);
    return node ? node : node === false ? false : previousActiveElement;
  }; // This needs to be done on mousedown and touchstart instead of click
  // so that it precedes the focus event.


  var checkPointerDown = function checkPointerDown(e) {
    var target = getActualTarget(e);

    if (containersContain(target)) {
      // allow the click since it ocurred inside the trap
      return;
    }

    if (valueOrHandler(config.clickOutsideDeactivates, e)) {
      // immediately deactivate the trap
      trap.deactivate({
        // if, on deactivation, we should return focus to the node originally-focused
        //  when the trap was activated (or the configured `setReturnFocus` node),
        //  then assume it's also OK to return focus to the outside node that was
        //  just clicked, causing deactivation, as long as that node is focusable;
        //  if it isn't focusable, then return focus to the original node focused
        //  on activation (or the configured `setReturnFocus` node)
        // NOTE: by setting `returnFocus: false`, deactivate() will do nothing,
        //  which will result in the outside click setting focus to the node
        //  that was clicked, whether it's focusable or not; by setting
        //  `returnFocus: true`, we'll attempt to re-focus the node originally-focused
        //  on activation (or the configured `setReturnFocus` node)
        returnFocus: config.returnFocusOnDeactivate && !isFocusable$1(target)
      });
      return;
    } // This is needed for mobile devices.
    // (If we'll only let `click` events through,
    // then on mobile they will be blocked anyways if `touchstart` is blocked.)


    if (valueOrHandler(config.allowOutsideClick, e)) {
      // allow the click outside the trap to take place
      return;
    } // otherwise, prevent the click


    e.preventDefault();
  }; // In case focus escapes the trap for some strange reason, pull it back in.


  var checkFocusIn = function checkFocusIn(e) {
    var target = getActualTarget(e);
    var targetContained = containersContain(target); // In Firefox when you Tab out of an iframe the Document is briefly focused.

    if (targetContained || target instanceof Document) {
      if (targetContained) {
        state.mostRecentlyFocusedNode = target;
      }
    } else {
      // escaped! pull it back in to where it just left
      e.stopImmediatePropagation();
      tryFocus(state.mostRecentlyFocusedNode || getInitialFocusNode());
    }
  }; // Hijack Tab events on the first and last focusable nodes of the trap,
  // in order to prevent focus from escaping. If it escapes for even a
  // moment it can end up scrolling the page and causing confusion so we
  // kind of need to capture the action at the keydown phase.


  var checkTab = function checkTab(e) {
    var target = getActualTarget(e);
    updateTabbableNodes();
    var destinationNode = null;

    if (state.tabbableGroups.length > 0) {
      // make sure the target is actually contained in a group
      // NOTE: the target may also be the container itself if it's focusable
      //  with tabIndex='-1' and was given initial focus
      var containerIndex = findIndex(state.tabbableGroups, function (_ref) {
        var container = _ref.container;
        return container.contains(target);
      });
      var containerGroup = containerIndex >= 0 ? state.tabbableGroups[containerIndex] : undefined;

      if (containerIndex < 0) {
        // target not found in any group: quite possible focus has escaped the trap,
        //  so bring it back in to...
        if (e.shiftKey) {
          // ...the last node in the last group
          destinationNode = state.tabbableGroups[state.tabbableGroups.length - 1].lastTabbableNode;
        } else {
          // ...the first node in the first group
          destinationNode = state.tabbableGroups[0].firstTabbableNode;
        }
      } else if (e.shiftKey) {
        // REVERSE
        // is the target the first tabbable node in a group?
        var startOfGroupIndex = findIndex(state.tabbableGroups, function (_ref2) {
          var firstTabbableNode = _ref2.firstTabbableNode;
          return target === firstTabbableNode;
        });

        if (startOfGroupIndex < 0 && (containerGroup.container === target || isFocusable$1(target) && !isTabbable$1(target) && !containerGroup.nextTabbableNode(target, false))) {
          // an exception case where the target is either the container itself, or
          //  a non-tabbable node that was given focus (i.e. tabindex is negative
          //  and user clicked on it or node was programmatically given focus)
          //  and is not followed by any other tabbable node, in which
          //  case, we should handle shift+tab as if focus were on the container's
          //  first tabbable node, and go to the last tabbable node of the LAST group
          startOfGroupIndex = containerIndex;
        }

        if (startOfGroupIndex >= 0) {
          // YES: then shift+tab should go to the last tabbable node in the
          //  previous group (and wrap around to the last tabbable node of
          //  the LAST group if it's the first tabbable node of the FIRST group)
          var destinationGroupIndex = startOfGroupIndex === 0 ? state.tabbableGroups.length - 1 : startOfGroupIndex - 1;
          var destinationGroup = state.tabbableGroups[destinationGroupIndex];
          destinationNode = destinationGroup.lastTabbableNode;
        }
      } else {
        // FORWARD
        // is the target the last tabbable node in a group?
        var lastOfGroupIndex = findIndex(state.tabbableGroups, function (_ref3) {
          var lastTabbableNode = _ref3.lastTabbableNode;
          return target === lastTabbableNode;
        });

        if (lastOfGroupIndex < 0 && (containerGroup.container === target || isFocusable$1(target) && !isTabbable$1(target) && !containerGroup.nextTabbableNode(target))) {
          // an exception case where the target is the container itself, or
          //  a non-tabbable node that was given focus (i.e. tabindex is negative
          //  and user clicked on it or node was programmatically given focus)
          //  and is not followed by any other tabbable node, in which
          //  case, we should handle tab as if focus were on the container's
          //  last tabbable node, and go to the first tabbable node of the FIRST group
          lastOfGroupIndex = containerIndex;
        }

        if (lastOfGroupIndex >= 0) {
          // YES: then tab should go to the first tabbable node in the next
          //  group (and wrap around to the first tabbable node of the FIRST
          //  group if it's the last tabbable node of the LAST group)
          var _destinationGroupIndex = lastOfGroupIndex === state.tabbableGroups.length - 1 ? 0 : lastOfGroupIndex + 1;

          var _destinationGroup = state.tabbableGroups[_destinationGroupIndex];
          destinationNode = _destinationGroup.firstTabbableNode;
        }
      }
    } else {
      // NOTE: the fallbackFocus option does not support returning false to opt-out
      destinationNode = getNodeForOption('fallbackFocus');
    }

    if (destinationNode) {
      e.preventDefault();
      tryFocus(destinationNode);
    } // else, let the browser take care of [shift+]tab and move the focus

  };

  var checkKey = function checkKey(e) {
    if (isEscapeEvent(e) && valueOrHandler(config.escapeDeactivates, e) !== false) {
      e.preventDefault();
      trap.deactivate();
      return;
    }

    if (isTabEvent(e)) {
      checkTab(e);
      return;
    }
  };

  var checkClick = function checkClick(e) {
    if (valueOrHandler(config.clickOutsideDeactivates, e)) {
      return;
    }

    var target = getActualTarget(e);

    if (containersContain(target)) {
      return;
    }

    if (valueOrHandler(config.allowOutsideClick, e)) {
      return;
    }

    e.preventDefault();
    e.stopImmediatePropagation();
  }; //
  // EVENT LISTENERS
  //


  var addListeners = function addListeners() {
    if (!state.active) {
      return;
    } // There can be only one listening focus trap at a time


    activeFocusTraps.activateTrap(trap); // Delay ensures that the focused element doesn't capture the event
    // that caused the focus trap activation.

    state.delayInitialFocusTimer = config.delayInitialFocus ? delay(function () {
      tryFocus(getInitialFocusNode());
    }) : tryFocus(getInitialFocusNode());
    doc.addEventListener('focusin', checkFocusIn, true);
    doc.addEventListener('mousedown', checkPointerDown, {
      capture: true,
      passive: false
    });
    doc.addEventListener('touchstart', checkPointerDown, {
      capture: true,
      passive: false
    });
    doc.addEventListener('click', checkClick, {
      capture: true,
      passive: false
    });
    doc.addEventListener('keydown', checkKey, {
      capture: true,
      passive: false
    });
    return trap;
  };

  var removeListeners = function removeListeners() {
    if (!state.active) {
      return;
    }

    doc.removeEventListener('focusin', checkFocusIn, true);
    doc.removeEventListener('mousedown', checkPointerDown, true);
    doc.removeEventListener('touchstart', checkPointerDown, true);
    doc.removeEventListener('click', checkClick, true);
    doc.removeEventListener('keydown', checkKey, true);
    return trap;
  }; //
  // TRAP DEFINITION
  //


  trap = {
    activate: function activate(activateOptions) {
      if (state.active) {
        return this;
      }

      var onActivate = getOption(activateOptions, 'onActivate');
      var onPostActivate = getOption(activateOptions, 'onPostActivate');
      var checkCanFocusTrap = getOption(activateOptions, 'checkCanFocusTrap');

      if (!checkCanFocusTrap) {
        updateTabbableNodes();
      }

      state.active = true;
      state.paused = false;
      state.nodeFocusedBeforeActivation = doc.activeElement;

      if (onActivate) {
        onActivate();
      }

      var finishActivation = function finishActivation() {
        if (checkCanFocusTrap) {
          updateTabbableNodes();
        }

        addListeners();

        if (onPostActivate) {
          onPostActivate();
        }
      };

      if (checkCanFocusTrap) {
        checkCanFocusTrap(state.containers.concat()).then(finishActivation, finishActivation);
        return this;
      }

      finishActivation();
      return this;
    },
    deactivate: function deactivate(deactivateOptions) {
      if (!state.active) {
        return this;
      }

      clearTimeout(state.delayInitialFocusTimer); // noop if undefined

      state.delayInitialFocusTimer = undefined;
      removeListeners();
      state.active = false;
      state.paused = false;
      activeFocusTraps.deactivateTrap(trap);
      var onDeactivate = getOption(deactivateOptions, 'onDeactivate');
      var onPostDeactivate = getOption(deactivateOptions, 'onPostDeactivate');
      var checkCanReturnFocus = getOption(deactivateOptions, 'checkCanReturnFocus');

      if (onDeactivate) {
        onDeactivate();
      }

      var returnFocus = getOption(deactivateOptions, 'returnFocus', 'returnFocusOnDeactivate');

      var finishDeactivation = function finishDeactivation() {
        delay(function () {
          if (returnFocus) {
            tryFocus(getReturnFocusNode(state.nodeFocusedBeforeActivation));
          }

          if (onPostDeactivate) {
            onPostDeactivate();
          }
        });
      };

      if (returnFocus && checkCanReturnFocus) {
        checkCanReturnFocus(getReturnFocusNode(state.nodeFocusedBeforeActivation)).then(finishDeactivation, finishDeactivation);
        return this;
      }

      finishDeactivation();
      return this;
    },
    pause: function pause() {
      if (state.paused || !state.active) {
        return this;
      }

      state.paused = true;
      removeListeners();
      return this;
    },
    unpause: function unpause() {
      if (!state.paused || !state.active) {
        return this;
      }

      state.paused = false;
      updateTabbableNodes();
      addListeners();
      return this;
    },
    updateContainerElements: function updateContainerElements(containerElements) {
      var elementsAsArray = [].concat(containerElements).filter(Boolean);
      state.containers = elementsAsArray.map(function (element) {
        return typeof element === 'string' ? doc.querySelector(element) : element;
      });

      if (state.active) {
        updateTabbableNodes();
      }

      return this;
    }
  }; // initialize container elements

  trap.updateContainerElements(elements);
  return trap;
};

var commonjsGlobal$1 = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function commonjsRequire (path) {
	throw new Error('Could not dynamically require "' + path + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
}

var currency_cjs = {};

Object.defineProperty(currency_cjs, "__esModule", {
  value: true
});
var formatMoney_1 = currency_cjs.formatMoney = formatMoney$2;
/**
 * Currency Helpers
 * -----------------------------------------------------------------------------
 * A collection of useful functions that help with currency formatting
 *
 * Current contents
 * - formatMoney - Takes an amount in cents and returns it as a formatted dollar value.
 *
 */

var moneyFormat = '${{amount}}';

/**
 * Format money values based on your shop currency settings
 * @param  {Number|string} cents - value in cents or dollar amount e.g. 300 cents
 * or 3.00 dollars
 * @param  {String} format - shop money_format setting
 * @return {String} value - formatted value
 */
function formatMoney$2(cents, format) {
  if (typeof cents === 'string') {
    cents = cents.replace('.', '');
  }
  var value = '';
  var placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
  var formatString = format || moneyFormat;

  function formatWithDelimiters(number) {
    var precision = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 2;
    var thousands = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : ',';
    var decimal = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : '.';

    if (isNaN(number) || number == null) {
      return 0;
    }

    number = (number / 100.0).toFixed(precision);

    var parts = number.split('.');
    var dollarsAmount = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands);
    var centsAmount = parts[1] ? decimal + parts[1] : '';

    return dollarsAmount + centsAmount;
  }

  switch (formatString.match(placeholderRegex)[1]) {
    case 'amount':
      value = formatWithDelimiters(cents, 2);
      break;
    case 'amount_no_decimals':
      value = formatWithDelimiters(cents, 0);
      break;
    case 'amount_with_comma_separator':
      value = formatWithDelimiters(cents, 2, '.', ',');
      break;
    case 'amount_no_decimals_with_comma_separator':
      value = formatWithDelimiters(cents, 0, '.', ',');
      break;
  }

  return formatString.replace(placeholderRegex, value);
}

var m$1={USD:{money_format:"${{amount}}",money_with_currency_format:"${{amount}} USD"},EUR:{money_format:"&euro;{{amount}}",money_with_currency_format:"&euro;{{amount}} EUR"},GBP:{money_format:"&pound;{{amount}}",money_with_currency_format:"&pound;{{amount}} GBP"},CAD:{money_format:"${{amount}}",money_with_currency_format:"${{amount}} CAD"},ALL:{money_format:"Lek {{amount}}",money_with_currency_format:"Lek {{amount}} ALL"},DZD:{money_format:"DA {{amount}}",money_with_currency_format:"DA {{amount}} DZD"},AOA:{money_format:"Kz{{amount}}",money_with_currency_format:"Kz{{amount}} AOA"},ARS:{money_format:"${{amount_with_comma_separator}}",money_with_currency_format:"${{amount_with_comma_separator}} ARS"},AMD:{money_format:"{{amount}} AMD",money_with_currency_format:"{{amount}} AMD"},AWG:{money_format:"Afl{{amount}}",money_with_currency_format:"Afl{{amount}} AWG"},AUD:{money_format:"${{amount}}",money_with_currency_format:"${{amount}} AUD"},BBD:{money_format:"${{amount}}",money_with_currency_format:"${{amount}} Bds"},AZN:{money_format:"m.{{amount}}",money_with_currency_format:"m.{{amount}} AZN"},BDT:{money_format:"Tk {{amount}}",money_with_currency_format:"Tk {{amount}} BDT"},BSD:{money_format:"BS${{amount}}",money_with_currency_format:"BS${{amount}} BSD"},BHD:{money_format:"{{amount}}0 BD",money_with_currency_format:"{{amount}}0 BHD"},BYR:{money_format:"Br {{amount}}",money_with_currency_format:"Br {{amount}} BYR"},BZD:{money_format:"BZ${{amount}}",money_with_currency_format:"BZ${{amount}} BZD"},BTN:{money_format:"Nu {{amount}}",money_with_currency_format:"Nu {{amount}} BTN"},BAM:{money_format:"KM {{amount_with_comma_separator}}",money_with_currency_format:"KM {{amount_with_comma_separator}} BAM"},BRL:{money_format:"R$ {{amount_with_comma_separator}}",money_with_currency_format:"R$ {{amount_with_comma_separator}} BRL"},BOB:{money_format:"Bs{{amount_with_comma_separator}}",money_with_currency_format:"Bs{{amount_with_comma_separator}} BOB"},BWP:{money_format:"P{{amount}}",money_with_currency_format:"P{{amount}} BWP"},BND:{money_format:"${{amount}}",money_with_currency_format:"${{amount}} BND"},BGN:{money_format:"{{amount}} лв",money_with_currency_format:"{{amount}} лв BGN"},MMK:{money_format:"K{{amount}}",money_with_currency_format:"K{{amount}} MMK"},KHR:{money_format:"KHR{{amount}}",money_with_currency_format:"KHR{{amount}}"},KYD:{money_format:"${{amount}}",money_with_currency_format:"${{amount}} KYD"},XAF:{money_format:"FCFA{{amount}}",money_with_currency_format:"FCFA{{amount}} XAF"},CLP:{money_format:"${{amount_no_decimals}}",money_with_currency_format:"${{amount_no_decimals}} CLP"},CNY:{money_format:"&#165;{{amount}}",money_with_currency_format:"&#165;{{amount}} CNY"},COP:{money_format:"${{amount_with_comma_separator}}",money_with_currency_format:"${{amount_with_comma_separator}} COP"},CRC:{money_format:"&#8353; {{amount_with_comma_separator}}",money_with_currency_format:"&#8353; {{amount_with_comma_separator}} CRC"},HRK:{money_format:"{{amount_with_comma_separator}} kn",money_with_currency_format:"{{amount_with_comma_separator}} kn HRK"},CZK:{money_format:"{{amount_with_comma_separator}} K&#269;",money_with_currency_format:"{{amount_with_comma_separator}} K&#269;"},DKK:{money_format:"{{amount_with_comma_separator}}",money_with_currency_format:"kr.{{amount_with_comma_separator}}"},DOP:{money_format:"RD$ {{amount}}",money_with_currency_format:"RD$ {{amount}}"},XCD:{money_format:"${{amount}}",money_with_currency_format:"EC${{amount}}"},EGP:{money_format:"LE {{amount}}",money_with_currency_format:"LE {{amount}} EGP"},ETB:{money_format:"Br{{amount}}",money_with_currency_format:"Br{{amount}} ETB"},XPF:{money_format:"{{amount_no_decimals_with_comma_separator}} XPF",money_with_currency_format:"{{amount_no_decimals_with_comma_separator}} XPF"},FJD:{money_format:"${{amount}}",money_with_currency_format:"FJ${{amount}}"},GMD:{money_format:"D {{amount}}",money_with_currency_format:"D {{amount}} GMD"},GHS:{money_format:"GH&#8373;{{amount}}",money_with_currency_format:"GH&#8373;{{amount}}"},GTQ:{money_format:"Q{{amount}}",money_with_currency_format:"{{amount}} GTQ"},GYD:{money_format:"G${{amount}}",money_with_currency_format:"${{amount}} GYD"},GEL:{money_format:"{{amount}} GEL",money_with_currency_format:"{{amount}} GEL"},HNL:{money_format:"L {{amount}}",money_with_currency_format:"L {{amount}} HNL"},HKD:{money_format:"${{amount}}",money_with_currency_format:"HK${{amount}}"},HUF:{money_format:"{{amount_no_decimals_with_comma_separator}}",money_with_currency_format:"{{amount_no_decimals_with_comma_separator}} Ft"},ISK:{money_format:"{{amount_no_decimals}} kr",money_with_currency_format:"{{amount_no_decimals}} kr ISK"},INR:{money_format:"Rs. {{amount}}",money_with_currency_format:"Rs. {{amount}}"},IDR:{money_format:"{{amount_with_comma_separator}}",money_with_currency_format:"Rp {{amount_with_comma_separator}}"},ILS:{money_format:"{{amount}} NIS",money_with_currency_format:"{{amount}} NIS"},JMD:{money_format:"${{amount}}",money_with_currency_format:"${{amount}} JMD"},JPY:{money_format:"&#165;{{amount_no_decimals}}",money_with_currency_format:"&#165;{{amount_no_decimals}} JPY"},JEP:{money_format:"&pound;{{amount}}",money_with_currency_format:"&pound;{{amount}} JEP"},JOD:{money_format:"{{amount}}0 JD",money_with_currency_format:"{{amount}}0 JOD"},KZT:{money_format:"{{amount}} KZT",money_with_currency_format:"{{amount}} KZT"},KES:{money_format:"KSh{{amount}}",money_with_currency_format:"KSh{{amount}}"},KWD:{money_format:"{{amount}}0 KD",money_with_currency_format:"{{amount}}0 KWD"},KGS:{money_format:"лв{{amount}}",money_with_currency_format:"лв{{amount}}"},LVL:{money_format:"Ls {{amount}}",money_with_currency_format:"Ls {{amount}} LVL"},LBP:{money_format:"L&pound;{{amount}}",money_with_currency_format:"L&pound;{{amount}} LBP"},LTL:{money_format:"{{amount}} Lt",money_with_currency_format:"{{amount}} Lt"},MGA:{money_format:"Ar {{amount}}",money_with_currency_format:"Ar {{amount}} MGA"},MKD:{money_format:"ден {{amount}}",money_with_currency_format:"ден {{amount}} MKD"},MOP:{money_format:"MOP${{amount}}",money_with_currency_format:"MOP${{amount}}"},MVR:{money_format:"Rf{{amount}}",money_with_currency_format:"Rf{{amount}} MRf"},MXN:{money_format:"$ {{amount}}",money_with_currency_format:"$ {{amount}} MXN"},MYR:{money_format:"RM{{amount}} MYR",money_with_currency_format:"RM{{amount}} MYR"},MUR:{money_format:"Rs {{amount}}",money_with_currency_format:"Rs {{amount}} MUR"},MDL:{money_format:"{{amount}} MDL",money_with_currency_format:"{{amount}} MDL"},MAD:{money_format:"{{amount}} dh",money_with_currency_format:"Dh {{amount}} MAD"},MNT:{money_format:"{{amount_no_decimals}} &#8366",money_with_currency_format:"{{amount_no_decimals}} MNT"},MZN:{money_format:"{{amount}} Mt",money_with_currency_format:"Mt {{amount}} MZN"},NAD:{money_format:"N${{amount}}",money_with_currency_format:"N${{amount}} NAD"},NPR:{money_format:"Rs{{amount}}",money_with_currency_format:"Rs{{amount}} NPR"},ANG:{money_format:"&fnof;{{amount}}",money_with_currency_format:"{{amount}} NA&fnof;"},NZD:{money_format:"${{amount}}",money_with_currency_format:"${{amount}} NZD"},NIO:{money_format:"C${{amount}}",money_with_currency_format:"C${{amount}} NIO"},NGN:{money_format:"&#8358;{{amount}}",money_with_currency_format:"&#8358;{{amount}} NGN"},NOK:{money_format:"kr {{amount_with_comma_separator}}",money_with_currency_format:"kr {{amount_with_comma_separator}} NOK"},OMR:{money_format:"{{amount_with_comma_separator}} OMR",money_with_currency_format:"{{amount_with_comma_separator}} OMR"},PKR:{money_format:"Rs.{{amount}}",money_with_currency_format:"Rs.{{amount}} PKR"},PGK:{money_format:"K {{amount}}",money_with_currency_format:"K {{amount}} PGK"},PYG:{money_format:"Gs. {{amount_no_decimals_with_comma_separator}}",money_with_currency_format:"Gs. {{amount_no_decimals_with_comma_separator}} PYG"},PEN:{money_format:"S/. {{amount}}",money_with_currency_format:"S/. {{amount}} PEN"},PHP:{money_format:"&#8369;{{amount}}",money_with_currency_format:"&#8369;{{amount}} PHP"},PLN:{money_format:"{{amount_with_comma_separator}} zl",money_with_currency_format:"{{amount_with_comma_separator}} zl PLN"},QAR:{money_format:"QAR {{amount_with_comma_separator}}",money_with_currency_format:"QAR {{amount_with_comma_separator}}"},RON:{money_format:"{{amount_with_comma_separator}} lei",money_with_currency_format:"{{amount_with_comma_separator}} lei RON"},RUB:{money_format:"&#1088;&#1091;&#1073;{{amount_with_comma_separator}}",money_with_currency_format:"&#1088;&#1091;&#1073;{{amount_with_comma_separator}} RUB"},RWF:{money_format:"{{amount_no_decimals}} RF",money_with_currency_format:"{{amount_no_decimals}} RWF"},WST:{money_format:"WS$ {{amount}}",money_with_currency_format:"WS$ {{amount}} WST"},SAR:{money_format:"{{amount}} SR",money_with_currency_format:"{{amount}} SAR"},STD:{money_format:"Db {{amount}}",money_with_currency_format:"Db {{amount}} STD"},RSD:{money_format:"{{amount}} RSD",money_with_currency_format:"{{amount}} RSD"},SCR:{money_format:"Rs {{amount}}",money_with_currency_format:"Rs {{amount}} SCR"},SGD:{money_format:"${{amount}}",money_with_currency_format:"${{amount}} SGD"},SYP:{money_format:"S&pound;{{amount}}",money_with_currency_format:"S&pound;{{amount}} SYP"},ZAR:{money_format:"R {{amount}}",money_with_currency_format:"R {{amount}} ZAR"},KRW:{money_format:"&#8361;{{amount_no_decimals}}",money_with_currency_format:"&#8361;{{amount_no_decimals}} KRW"},LKR:{money_format:"Rs {{amount}}",money_with_currency_format:"Rs {{amount}} LKR"},SEK:{money_format:"{{amount_no_decimals}} kr",money_with_currency_format:"{{amount_no_decimals}} kr SEK"},CHF:{money_format:"SFr. {{amount}}",money_with_currency_format:"SFr. {{amount}} CHF"},TWD:{money_format:"${{amount}}",money_with_currency_format:"${{amount}} TWD"},THB:{money_format:"{{amount}} &#xe3f;",money_with_currency_format:"{{amount}} &#xe3f; THB"},TZS:{money_format:"{{amount}} TZS",money_with_currency_format:"{{amount}} TZS"},TTD:{money_format:"${{amount}}",money_with_currency_format:"${{amount}} TTD"},TND:{money_format:"{{amount}}",money_with_currency_format:"{{amount}} DT"},TRY:{money_format:"{{amount}}TL",money_with_currency_format:"{{amount}}TL"},UGX:{money_format:"Ush {{amount_no_decimals}}",money_with_currency_format:"Ush {{amount_no_decimals}} UGX"},UAH:{money_format:"₴{{amount}}",money_with_currency_format:"₴{{amount}} UAH"},AED:{money_format:"Dhs. {{amount}}",money_with_currency_format:"Dhs. {{amount}} AED"},UYU:{money_format:"${{amount_with_comma_separator}}",money_with_currency_format:"${{amount_with_comma_separator}} UYU"},VUV:{money_format:"${{amount}}",money_with_currency_format:"${{amount}}VT"},VEF:{money_format:"Bs. {{amount_with_comma_separator}}",money_with_currency_format:"Bs. {{amount_with_comma_separator}} VEF"},VND:{money_format:"{{amount_no_decimals_with_comma_separator}}&#8363;",money_with_currency_format:"{{amount_no_decimals_with_comma_separator}} VND"},XBT:{money_format:"{{amount_no_decimals}} BTC",money_with_currency_format:"{{amount_no_decimals}} BTC"},XOF:{money_format:"CFA{{amount}}",money_with_currency_format:"CFA{{amount}} XOF"},ZMW:{money_format:"K{{amount_no_decimals_with_comma_separator}}",money_with_currency_format:"ZMW{{amount_no_decimals_with_comma_separator}}"}},t$4=function(o){return o.toLowerCase().split("").map(function(o,m){return 0===m?o.toUpperCase():o}).join("")};function c(n){void 0===n&&(n={});var a=Object.assign({},{format:"money_with_currency_format",formats:{},storageKey:"shopify-currency"},n);a.formats=Object.assign({},m$1,a.formats);var r,_=(void 0===(r=a.storageKey)&&(r="currency"),{key:r,read:function(){return localStorage.getItem(r)},write:function(o){localStorage.setItem(r,o);},remove:function(){localStorage.removeItem(r);}});function e(o){_.write(o);}return {getCurrent:function(){return _.read()},setCurrent:e,convertAll:function(m,n,r,_){if(void 0===_&&(_=a.format),"undefined"==typeof Currency)throw new Error("Can't access Shopify Currency library. Make sure it's properly loaded.");n&&((r||document.querySelectorAll("span.money")).forEach(function(r){if(r.dataset.current!==n){if(Boolean(r.dataset["currency"+t$4(n)]))return r.innerHTML=r.dataset["currency"+t$4(n)],void(r.dataset.currency=n);var e,u=a.formats[m][_]||"{{amount}}",y=a.formats[n][_]||"{{amount}}",c=function(o){return Currency.convert(o,m,n)},f=parseInt(r.innerHTML.replace(/[^0-9]/g,""),10);e=-1!==u.indexOf("amount_no_decimals")?c(100*f):["JOD","KWD","BHD"].includes(m)?c(f/10):c(f);var i=formatMoney_1(e,y);r.innerHTML=i,r.dataset.currency=n,r.setAttribute("data-currency-"+n,i);}}),e(n));}}}

c(typeof currencyOpts !== 'undefined' ? currencyOpts : {});
var formatMoney$1 = val => formatMoney_1(val, theme.moneyFormat || '${{amount}}');

function ownKeys(object, enumerableOnly) {
  var keys = Object.keys(object);

  if (Object.getOwnPropertySymbols) {
    var symbols = Object.getOwnPropertySymbols(object);
    enumerableOnly && (symbols = symbols.filter(function (sym) {
      return Object.getOwnPropertyDescriptor(object, sym).enumerable;
    })), keys.push.apply(keys, symbols);
  }

  return keys;
}

function _objectSpread2(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = null != arguments[i] ? arguments[i] : {};
    i % 2 ? ownKeys(Object(source), !0).forEach(function (key) {
      _defineProperty(target, key, source[key]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) {
      Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
    });
  }

  return target;
}

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
  try {
    var info = gen[key](arg);
    var value = info.value;
  } catch (error) {
    reject(error);
    return;
  }

  if (info.done) {
    resolve(value);
  } else {
    Promise.resolve(value).then(_next, _throw);
  }
}

function _asyncToGenerator(fn) {
  return function () {
    var self = this,
        args = arguments;
    return new Promise(function (resolve, reject) {
      var gen = fn.apply(self, args);

      function _next(value) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
      }

      function _throw(err) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
      }

      _next(undefined);
    });
  };
}

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

function _objectWithoutPropertiesLoose(source, excluded) {
  if (source == null) return {};
  var target = {};
  var sourceKeys = Object.keys(source);
  var key, i;

  for (i = 0; i < sourceKeys.length; i++) {
    key = sourceKeys[i];
    if (excluded.indexOf(key) >= 0) continue;
    target[key] = source[key];
  }

  return target;
}

function _objectWithoutProperties(source, excluded) {
  if (source == null) return {};

  var target = _objectWithoutPropertiesLoose(source, excluded);

  var key, i;

  if (Object.getOwnPropertySymbols) {
    var sourceSymbolKeys = Object.getOwnPropertySymbols(source);

    for (i = 0; i < sourceSymbolKeys.length; i++) {
      key = sourceSymbolKeys[i];
      if (excluded.indexOf(key) >= 0) continue;
      if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue;
      target[key] = source[key];
    }
  }

  return target;
}

/**
 * Image Helper Functions
 * -----------------------------------------------------------------------------
 * A collection of functions that help with basic image operations.
 *
 */
/**
 * Find the Shopify image attribute size
 *
 * @param {string} src
 * @returns {null}
 */

function imageSize(src) {
  /* eslint-disable */
  var match = src.match(/.+_((?:pico|icon|thumb|small|compact|medium|large|grande)|\d{1,4}x\d{0,4}|x\d{1,4})[_\.@]/);
  /* esling-enable */

  if (match) {
    return match[1];
  } else {
    return null;
  }
}
/**
 * Adds a Shopify size attribute to a URL
 *
 * @param src
 * @param size
 * @returns {*}
 */

function getSizedImageUrl$1(src, size) {
  if (size === null) {
    return src;
  }

  if (size === 'master') {
    return removeProtocol$1(src);
  }

  var match = src.match(/\.(jpg|jpeg|gif|png|bmp|bitmap|tiff|tif)(\?v=\d+)?$/i);

  if (match) {
    var prefix = src.split(match[0]);
    var suffix = match[0];
    return removeProtocol$1(prefix[0] + '_' + size + suffix);
  } else {
    return null;
  }
}
function removeProtocol$1(path) {
  return path.replace(/http(s)?:/, '');
}
function onImagesLoaded(container, event) {
  var images = container.getElementsByTagName('img');
  var imageCount = images.length;
  var imagesLoaded = 0;

  for (var i = 0; i < imageCount; i++) {
    images[i].onload = function () {
      imagesLoaded++;

      if (imagesLoaded === imageCount) {
        event();
      }
    };
  }
}

function quantityInput (quantitySelector, container) {
  var quantityWrapper;

  if (container) {
    quantityWrapper = container.querySelector(quantitySelector);
  } else {
    quantityWrapper = this.container.querySelector(quantitySelector);
  }

  var quantityInput = quantityWrapper.querySelector('[data-quantity-input]');
  var addQuantity = quantityWrapper.querySelector('.product-form__quantity-add-item');
  var subtractQuanity = quantityWrapper.querySelector('.product-form__quantity-subtract-item');

  var handleAddQuantity = () => {
    var currentValue = parseInt(quantityInput.value);
    var newValue = currentValue + 1;
    quantityInput.value = addLeadingZero(newValue);
    quantityInput.dispatchEvent(new Event('change'));
  };

  var handleSubtractQuantity = () => {
    var currentValue = parseInt(quantityInput.value);
    if (currentValue === 1) return;
    var newValue = currentValue - 1;
    quantityInput.value = addLeadingZero(newValue);
    quantityInput.dispatchEvent(new Event('change'));
  };

  var addLeadingZero = number => {
    var s = number + '';

    if (s.length < 2) {
      s = '0' + s;
    }

    return s;
  };

  addQuantity.addEventListener('click', handleAddQuantity);
  subtractQuanity.addEventListener('click', handleSubtractQuantity);
  return () => {
    addQuantity.removeEventListener('click', handleAddQuantity);
    subtractQuanity.removeEventListener('click', handleSubtractQuantity);
  };
}

var selectors$M = {
  product: {
    addButton: '[data-add-to-cart]',
    addButtonQuickShop: '[data-add-button]',
    addButtonText: '[data-add-to-cart-text]',
    comparePrice: '[data-compare-price]',
    comparePriceText: '[data-compare-text]',
    form: '[data-product-form]',
    imageById: id => "[data-image-id='".concat(id, "']"),
    imageWrapper: '[data-product-image-wrapper]',
    optionById: id => "[value='".concat(id, "']"),
    price: '[data-product-price]',
    thumb: '[data-product-single-thumbnail]',
    thumbById: id => "[data-thumbnail-id='".concat(id, "']"),
    thumbs: '[data-product-thumbnails]',
    variantSelect: '[data-variant-select]',
    zoom: '[data-product-zoom]',
    storeAvailability: '[data-store-availability-container]'
  },
  a11y: {
    formStatus: '.form-status'
  }
};

function updateBuyButton (node, variant) {
  var btn = node.querySelector(selectors$M.product.addButton);
  var text = btn.querySelector(selectors$M.product.addButtonText);
  var {
    langAvailable,
    langSoldOut,
    langUnavailable
  } = btn.dataset;

  if (!variant) {
    btn.setAttribute('disabled', 'disabled');
    text.textContent = langUnavailable;
  } else if (variant.available) {
    btn.removeAttribute('disabled');
    text.textContent = langAvailable;
  } else {
    btn.setAttribute('disabled', 'disabled');
    text.textContent = langSoldOut;
  }
}

theme;

function fetch$1(e,n){return n=n||{},new Promise(function(t,r){var s=new XMLHttpRequest,o=[],u=[],i={},a=function(){return {ok:2==(s.status/100|0),statusText:s.statusText,status:s.status,url:s.responseURL,text:function(){return Promise.resolve(s.responseText)},json:function(){return Promise.resolve(s.responseText).then(JSON.parse)},blob:function(){return Promise.resolve(new Blob([s.response]))},clone:a,headers:{keys:function(){return o},entries:function(){return u},get:function(e){return i[e.toLowerCase()]},has:function(e){return e.toLowerCase()in i}}}};for(var l in s.open(n.method||"get",e,!0),s.onload=function(){s.getAllResponseHeaders().replace(/^(.*?):[^\S\n]*([\s\S]*?)$/gm,function(e,n,t){o.push(n=n.toLowerCase()),u.push([n,t]),i[n]=i[n]?i[n]+","+t:t;}),t(a());},s.onerror=r,s.withCredentials="include"==n.credentials,n.headers)s.setRequestHeader(l,n.headers[l]);s.send(n.body||null);})}

var CustomEvents = {
  cartItemAdded: 'flu:cart:item-added',
  cartUpdated: 'flu:cart:updated',
  cartError: 'flu:cart:error',
  productVariantChange: 'flu:product:variant-change',
  productQuanityUpdate: 'flu:product:quantity-update',
  quickCartOpen: 'flu:quick-cart:open',
  quickCartClose: 'flu:quick-cart:close'
};

var dispatchCustomEvent = function dispatchCustomEvent(eventName) {
  var data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var detail = {
    detail: data
  };
  var event = new CustomEvent(eventName, data ? detail : null);
  document.dispatchEvent(event);
};

var ls$2 = {
  get: () => JSON.parse(localStorage.getItem('cartItemOrder')),
  set: val => localStorage.setItem('cartItemOrder', val)
};
function updateAddon(id, quantity) {
  return fetchCart().then(_ref2 => {
    var {
      items
    } = _ref2;

    for (var i = 0; i < items.length; i++) {
      if (items[i].variant_id === parseInt(id)) {
        return changeAddon(i + 1, quantity); // shopify cart is a 1-based index
      }
    }
  });
}
function removeAddon(id) {
  if (localStorageAvailable() && ls$2.get()) {
    removeItemFromLocalOrder(id);
  }

  return updateAddon(id, 0);
}

function changeAddon(line, quantity) {
  r$1('cart:updating');
  return fetch$1("".concat(theme.routes.cart.change, ".js"), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      line,
      quantity
    })
  }).then(res => res.json()).then(cart => {
    if (localStorageAvailable() && ls$2.get()) {
      cart.items = reorderCartItems(cart.items, ls$2.get());
    }

    o({
      cart: cart
    });
    r$1('cart:updated', {
      cart: cart
    });
    dispatchCustomEvent(CustomEvents.cartUpdated, {
      cart: cart
    });
    return cart;
  });
}
function getCart() {
  return fetch$1("".concat(theme.routes.cart.base, ".js"), {
    method: 'GET',
    credentials: 'include'
  }).then(res => res.json()).then(data => {
    if (localStorageAvailable() && ls$2.get()) {
      data.items = reorderCartItems(data.items, ls$2.get());
    }

    return data;
  });
}
function addItem(form) {
  r$1('cart:updating');
  return fetch$1("".concat(theme.routes.cart.add, ".js"), {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest'
    },
    body: serialize(form)
  }).then(r => r.json()).then(item => {
    if (item.status == '422') {
      var errorMessage = {
        code: 422,
        message: item.description
      };
      dispatchCustomEvent(CustomEvents.cartError, {
        errorMessage: item.description
      });
      throw errorMessage;
    }

    return fetchCart(item.id).then(cart => {
      o({
        cart: cart
      });
      dispatchCustomEvent(CustomEvents.cartItemAdded, {
        product: item
      });
      r$1('cart:updated');
      return {
        item,
        cart
      };
    });
  });
}
function fetchCart(newestProductId) {
  return fetch$1("".concat(theme.routes.cart.base, ".js"), {
    method: 'GET',
    credentials: 'include'
  }).then(res => res.json()).then(cart => {
    if (localStorageAvailable()) {
      var cartOrder = cart.items.map(e => e.id); // Set the initial cart order if one does not exist in storage

      if (!ls$2.get()) {
        ls$2.set(JSON.stringify(cartOrder));
      }

      if (newestProductId) {
        var indexOfNewProduct = cartOrder.indexOf(newestProductId); // Place newest product at the front of the cart order

        cartOrder.unshift(cartOrder.splice(indexOfNewProduct, 1)[0]);
        ls$2.set(JSON.stringify(cartOrder)); // Let the cart know there is a new product at the front of the order

        o({
          newItemInCart: true
        });
      }

      cart.items = reorderCartItems(cart.items, cartOrder);
    }

    return cart;
  });
} // Match the cart order with the order determined in local storage

function reorderCartItems(items, sortOrder) {
  return items.sort(function (a, b) {
    return sortOrder.indexOf(a.id) - sortOrder.indexOf(b.id);
  });
}

function removeItemFromLocalOrder(id) {
  var cartOrder = ls$2.get();
  var indexOfProduct = cartOrder.indexOf(id);
  cartOrder.splice(indexOfProduct, 1);
  ls$2.set(JSON.stringify(cartOrder));
} // See if user has local storage enabled


function localStorageAvailable() {
  var test = 'test';

  try {
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}
/*!
 * Serialize all form data into a SearchParams string
 * (c) 2020 Chris Ferdinandi, MIT License, https://gomakethings.com
 * @param  {Node}   form The form to serialize
 * @return {String}      The serialized form data
 */


function serialize(form) {
  var arr = [];
  Array.prototype.slice.call(form.elements).forEach(function (field) {
    if (!field.name || field.disabled || ['file', 'reset', 'submit', 'button'].indexOf(field.type) > -1) return;

    if (field.type === 'select-multiple') {
      Array.prototype.slice.call(field.options).forEach(function (option) {
        if (!option.selected) return;
        arr.push(encodeURIComponent(field.name) + '=' + encodeURIComponent(option.value));
      });
      return;
    }

    if (['checkbox', 'radio'].indexOf(field.type) > -1 && !field.checked) return;
    arr.push(encodeURIComponent(field.name) + '=' + encodeURIComponent(field.value));
  });
  return arr.join('&');
}

var formatMoney = (val => formatMoney_1(val, window.theme.moneyFormat || '${{amount}}'));

// Fetch the product data from the .js endpoint because it includes
// more data than the .json endpoint.
var getProduct = (handle => cb => fetch("".concat(window.theme.routes.products, "/").concat(handle, ".js")).then(res => res.json()).then(data => cb(data)).catch(err => console.log(err.message)));

var {
  strings: {
    products: strings$6
  }
} = theme;
var selectors$L = {
  unitPriceContainer: '[data-unit-price-container]',
  unitPrice: '[data-unit-price]',
  unitPriceBase: '[data-unit-base]'
};
var classes$d = {
  available: 'unit-price--available'
};

var updateUnitPrices = (container, variant) => {
  var unitPriceContainers = t$7(selectors$L.unitPriceContainer, container);
  var unitPrices = t$7(selectors$L.unitPrice, container);
  var unitPriceBases = t$7(selectors$L.unitPriceBase, container);
  l(unitPriceContainers, classes$d.available, variant.unit_price !== undefined);
  if (!variant.unit_price) return;

  _replaceText(unitPrices, formatMoney(variant.unit_price));

  _replaceText(unitPriceBases, _getBaseUnit(variant.unit_price_measurement));
};

var renderUnitPrice = (unitPrice, unitPriceMeasurement) => {
  if (unitPrice && unitPriceMeasurement) {
    var label = strings$6.product.unitPrice;
    return "\n      <div class=\"unit-price ".concat(classes$d.available, "\">\n        <dt>\n          <span class=\"visually-hidden visually-hidden--inline\">").concat(label, "</span>\n        </dt>\n        <dd class=\"unit-price__price\">\n          <span data-unit-price>").concat(formatMoney(unitPrice), "</span><span aria-hidden=\"true\">/</span><span class=\"visually-hidden\">").concat(strings$6.product.unitPriceSeparator, "&nbsp;</span><span data-unit-base>").concat(_getBaseUnit(unitPriceMeasurement), "</span>\n        </dd>\n      </div>\n    ");
  } else {
    return '';
  }
};

var _getBaseUnit = unitPriceMeasurement => {
  return unitPriceMeasurement.reference_value === 1 ? unitPriceMeasurement.reference_unit : unitPriceMeasurement.reference_value + unitPriceMeasurement.reference_unit;
};

var _replaceText = (nodeList, replacementText) => {
  nodeList.forEach(node => node.innerText = replacementText);
};

var selectors$K = {
  imageById: id => "[data-media-id='".concat(id, "']"),
  imageWrapper: '[data-product-media-wrapper]',
  inYourSpace: '[data-in-your-space]'
};
var classes$c = {
  hidden: 'hidden'
};
function switchImage (container, imageId) {
  var newImage = n$3(selectors$K.imageWrapper + selectors$K.imageById(imageId), container);
  var newImageMedia = n$3('.media', newImage);
  var otherImages = t$7("".concat(selectors$K.imageWrapper, ":not(").concat(selectors$K.imageById(imageId), ")"), container);
  i$1(newImage, classes$c.hidden); // Update view in space button

  var inYourSpaceButton = n$3(selectors$K.inYourSpace, container);

  if (inYourSpaceButton) {
    if (newImageMedia.dataset.mediaType === 'model') {
      inYourSpaceButton.setAttribute('data-shopify-model3d-id', newImageMedia.dataset.mediaId);
    }
  }

  otherImages.forEach(image => u$2(image, classes$c.hidden));
}

function OptionButtons(els) {
  var groups = els.map(createOptionGroup);

  function destroy() {
    groups && groups.forEach(group => group());
  }

  return {
    groups,
    destroy
  };
}

function createOptionGroup(el) {
  var select = n$3('select', el);
  var buttons = t$7('[data-button]', el);
  var buttonClick = e$3(buttons, 'click', e => {
    e.preventDefault();
    var {
      button
    } = e.currentTarget.dataset;
    buttons.forEach(btn => l(btn, 'selected', btn.dataset.button === button));
    var opt = n$3("[data-value-handle=\"".concat(button, "\"]"), select);
    opt.selected = true; // const chip = e.target;
    // const selectedLabel = qs('.product-form__selected-label', el);
    // selectedLabel.innerText = chip.dataset.button;

    select.dispatchEvent(new Event('change'));
  });
  return () => buttonClick();
}

var selectors$J = {
  counterContainer: '[data-inventory-counter]',
  inventoryMessage: '.inventory-counter__message',
  countdownBar: '.inventory-counter__bar',
  progressBar: '.inventory-counter__bar-progress'
};
var classes$b = {
  active: 'active',
  inventoryLow: 'inventory--low'
};

var inventoryCounter = (container, config) => {
  var variantsInventories = config.variantsInventories;
  var counterContainer = n$3(selectors$J.counterContainer, container);
  var inventoryMessageElement = n$3(selectors$J.inventoryMessage, container);
  var progressBar = n$3(selectors$J.progressBar, container);
  var {
    lowInventoryThreshold,
    stockCountdownMax
  } = counterContainer.dataset; // If the threshold or countdownmax contains anything but numbers abort

  if (!lowInventoryThreshold.match(/^[0-9]+$/) || !stockCountdownMax.match(/^[0-9]+$/)) {
    return;
  }

  var threshold = parseInt(lowInventoryThreshold, 10);
  var countDownMax = parseInt(stockCountdownMax, 10);
  l(counterContainer, classes$b.active, productIventoryValid(variantsInventories[config.id]));
  checkThreshold(variantsInventories[config.id]);
  setProgressBar(variantsInventories[config.id].inventory_quantity);
  setInventoryMessage(variantsInventories[config.id].inventory_message);

  function checkThreshold(_ref) {
    var {
      inventory_policy,
      inventory_quantity,
      inventory_management
    } = _ref;
    i$1(counterContainer, classes$b.inventoryLow);

    if (inventory_management !== null && inventory_policy === 'deny') {
      if (inventory_quantity <= threshold) {
        u$2(counterContainer, classes$b.inventoryLow);
      }
    }
  }

  function setProgressBar(inventoryQuantity) {
    if (inventoryQuantity <= 0) {
      progressBar.style.width = "".concat(0, "%");
      return;
    }

    var progressValue = inventoryQuantity < countDownMax ? inventoryQuantity / countDownMax * 100 : 100;
    progressBar.style.width = "calc(".concat(progressValue, "% + 2px)");
  }

  function setInventoryMessage(message) {
    inventoryMessageElement.innerText = message;
  }

  function productIventoryValid(product) {
    return product.inventory_message && product.inventory_policy === 'deny';
  }

  var update = variant => {
    l(counterContainer, classes$b.active, variant && productIventoryValid(variantsInventories[variant.id]));
    if (!variant) return;
    checkThreshold(variantsInventories[variant.id]);
    setProgressBar(variantsInventories[variant.id].inventory_quantity);
    setInventoryMessage(variantsInventories[variant.id].inventory_message);
  };

  return {
    update
  };
};

var selectors$I = {
  productSku: '[data-product-sku]'
};
var {
  strings: {
    products: strings$5
  }
} = window.theme;
function updateSku (container, variant) {
  var skuElement = n$3(selectors$I.productSku, container);
  if (!skuElement) return;
  var {
    sku
  } = strings$5.product;

  var skuString = value => "".concat(sku, ": ").concat(value);

  if (!variant || !variant.sku) {
    skuElement.innerText = '';
    return;
  }

  skuElement.innerText = skuString(variant.sku);
}

var _excluded = ["variant_id", "product_title", "original_line_price", "price", "variant_title", "line_level_discount_allocations", "options_with_values", "product_has_only_default_variant", "image", "url", "quantity", "unit_price", "unit_price_measurement", "selling_plan_allocation"],
    _excluded2 = ["handle", "title", "url", "featured_image"];
var plus = "<svg width=\"11\" height=\"11\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M5.5 0v11M0 5.5h11\" stroke=\"currentColor\"/></svg>";
var minus = "<svg width=\"10\" height=\"2\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M1 1h8\" stroke=\"currentColor\" stroke-linecap=\"square\"/></svg>";

var renderLineDiscounts = discounts => {
  if (Boolean(discounts.length)) {
    var formatted_discounts = discounts.map(_ref => {
      var {
        amount,
        discount_application: {
          title
        }
      } = _ref;
      return "<li>".concat(title, " (-").concat(formatMoney$1(amount), ")</li>");
    });
    return "\n      <ul class=\"quick-cart__item-discounts\">\n        ".concat(formatted_discounts, "\n      </ul>\n    ");
  } else {
    return '';
  }
};

function createItem(_ref2, highlightProduct) {
  var {
    variant_id: id,
    product_title: title,
    original_line_price: original_price,
    price,
    variant_title: color,
    line_level_discount_allocations: line_discounts,
    options_with_values,
    product_has_only_default_variant,
    image,
    url,
    quantity,
    unit_price,
    unit_price_measurement,
    selling_plan_allocation
  } = _ref2;
      _objectWithoutProperties(_ref2, _excluded);

  var img = image && getSizedImageUrl$1(image.replace('.' + imageSize(image), ''), '200x');
  var priceQuanity = '';

  if (quantity > 1) {
    priceQuanity = "x ".concat(quantity);
  }

  var productOptions = "";
  var quantityZeroLeading = quantity > 9 ? quantity : "0".concat(quantity);

  if (!product_has_only_default_variant) {
    options_with_values.forEach(option => {
      var optionItem = "\n        <div>\n          ".concat(option.name, ": ").concat(option.value, "\n        </div>\n      ");
      productOptions += optionItem;
    });
  }

  var sellingPlanName = selling_plan_allocation ? "<p class=\"type-body-regular mt0 mb0\">".concat(selling_plan_allocation.selling_plan.name, "</p>") : "";
  return (
    /*html*/
    "\n    <div class='cart__item".concat(highlightProduct ? ' cart__item--highlight' : '', "' data-component='quickCartItem' data-id=").concat(id, ">\n      <div class=\"cart__item-content\">\n        <div class='quick-cart__image'>\n        ").concat(img ? "\n              <a href='".concat(url, "'>\n                <img src='").concat(img, "' alt='").concat(title, "' />\n              </a>\n            ") : "<div class=\"placeholder\"></div>", "\n        </div>\n        <div class='quick-cart__product-details justify-between'>\n          <div>\n            <h4 class=\"ma0\">\n              <a href='").concat(url, "'>").concat(title, "</a>\n            </h4>\n            <span class=\"quick-cart__product-price\">\n              <span class=\"quick-cart__product-price-value\">\n                ").concat(formatMoney$1(price), " <span>").concat(priceQuanity, "</span>\n              </span>\n              ").concat(renderUnitPrice(unit_price, unit_price_measurement), "\n              ").concat(renderLineDiscounts(line_discounts), "\n              ").concat(sellingPlanName, "\n            </span>\n            ").concat(productOptions, "\n          </div>\n        </div>\n      </div>\n\n      <div class='quick-cart__item-bottom'>\n        <div class='quick-cart__quantity'>\n          <button type=\"button\" class='quick-cart__quantity-button js-remove-single px05'>").concat(minus, "</button>\n          <div class='quick-cart__item-total js-single-quantity'>").concat(quantityZeroLeading, "</div>\n          <button type=\"button\" class='quick-cart__quantity-button js-add-single px05'>").concat(plus, "</button>\n        </div>\n      </div>\n    </div>\n  ")
  );
}
function createRecent(_ref3) {
  var {
    handle,
    title,
    url,
    featured_image: image
  } = _ref3,
      product = _objectWithoutProperties(_ref3, _excluded2);

  var img = image && getSizedImageUrl$1(image.replace('.' + imageSize(image), ''), '200x');
  return (
    /*html*/
    "\n    <div class=\"cart__item justify-around\">\n      <div class=\"cart__item-content\">\n        <div class=\"quick-cart__image\">\n          ".concat(img ? "\n              <a href='".concat(url, "'>\n                <img src='").concat(img, "' />\n              </a>\n            ") : "<div class=\"placeholder\"></div>", "\n        </div>\n        <div class=\"quick-cart__product-details\">\n          <a href=\"").concat(url, "\">\n            <h3 class=\"ma0\">").concat(title, "</h3>\n          </a>\n          <span class=\"quick-cart__product-price\">").concat(formatMoney$1(product.price), "</span>\n        </div>\n      </div>\n    </div>\n  ")
  );
}

var ls$1 = {
  get: () => JSON.parse(localStorage.getItem('recentlyViewed')),
  set: val => localStorage.setItem('recentlyViewed', val)
};
var updateRecentProducts = product => {
  var recentlyViewed = [];

  if (ls$1.get() !== null) {
    recentlyViewed = ls$1.get().filter(item => item.id !== product.id);
    recentlyViewed.unshift(product);
    ls$1.set(JSON.stringify(recentlyViewed.slice(0, 20)));
  } else if (ls$1.get() === null) {
    recentlyViewed.push(product);
    ls$1.set(JSON.stringify(recentlyViewed));
  }
};
var getRecentProducts = () => ls$1.get();

var quickCartItem = item => {
  var decrease = item.querySelector('.js-remove-single');
  var increase = item.querySelector('.js-add-single');
  var currentQty = item.querySelector('.js-single-quantity').innerHTML;
  var id = item.getAttribute('data-id');
  decrease.addEventListener('click', e => {
    e.preventDefault();

    if (currentQty === 1) {
      removeAddon(id);
    } else {
      updateAddon(id, parseInt(currentQty) - 1);
    }
  });
  increase.addEventListener('click', e => {
    e.preventDefault();
    updateAddon(id, parseInt(currentQty) + 1);
  });
};

function renderItems(items) {
  return items.length > 0 ? items.reduce((markup, item) => {
    var hightlightProduct = u().newItemInCart; // Only the first product should be highlighted. If a product
    // is highlighted set the flag to false after the first

    if (hightlightProduct) {
      o({
        newItemInCart: false
      });
    }

    markup += createItem(item, hightlightProduct);
    return markup;
  }, '') : "<p class=\"quick-cart__empty-state\">".concat(theme.strings.cart.general.empty, "</p>");
}

function renderDiscounts(discounts) {
  return discounts.length > 0 ? "\n    <div>\n      ".concat(discounts.map(_ref => {
    var {
      title,
      total_allocated_amount: value
    } = _ref;
    return "<div>".concat(title, " (-").concat(formatMoney$1(value), ")</div>");
  }), "\n    </div>\n  ") : "";
}

function renderRecent(products) {
  return products.length > 0 ? products.reduce((markup, product) => {
    markup += createRecent(product);
    return markup;
  }, '') : "<p class=\"quick-cart__empty-state\">".concat(general.products.no_recently_viewed, "</p>");
}

var selectors$H = {
  cartItems: '.cart__item'
};

var cartDrawer = node => {
  if (!node) return;
  var focusTrap = createFocusTrap(node, {
    allowOutsideClick: true
  });
  var discounts = node.querySelector('.js-discounts');
  var subtotal = node.querySelector('.js-subtotal');
  var itemsRoot = node.querySelector('.js-items');
  var footer = node.querySelector('.js-footer');
  var closeIcon = node.querySelector('.js-close');
  var loading = itemsRoot.innerHTML;
  var tabLinkCart = node.querySelector('.js-tab-link-cart');
  var tabLinkRecent = node.querySelector('.js-tab-link-recent');

  var render = cart => {
    var {
      cart_level_discount_applications: cart_discounts
    } = cart;
    tabLinkCart.classList.add('active');
    tabLinkRecent.classList.remove('active');
    itemsRoot.innerHTML = renderItems(cart.items);
    var cartItems = itemsRoot.querySelectorAll(selectors$H.cartItems);

    if (cartItems.length) {
      cartItems.forEach(item => {
        quickCartItem(item);
      });
    }

    if (getRecentProducts()) {
      tabLinkRecent.classList.remove('hide');
    }

    discounts.innerHTML = renderDiscounts(cart_discounts);
    cart.items.length > 0 ? footer.classList.add('active') : footer.classList.remove('active');
    Boolean(cart_discounts.length > 0) ? discounts.classList.add('active') : discounts.classList.remove('active');

    if (subtotal) {
      subtotal.innerHTML = formatMoney$1(cart.total_price);
    }
  };

  var open = cart => {
    node.classList.add('is-visible');
    r$1('drawerOverlay:show');
    node.classList.add('is-active');
    itemsRoot.innerHTML = loading;
    r$1('cart:open', state => {
      return {
        cartOpen: true
      };
    });
    closeIcon.setAttribute('aria-expanded', true);
    setTimeout(() => {
      getCart().then(cart => dispatchCustomEvent(CustomEvents.quickCartOpen, {
        cart: cart
      }));
      focusTrap.activate();
      tabLinkCart.classList.add('active');
      setTimeout(render(cart), 10);
    }, 50);
  };

  var close = function close() {
    var hideOverlay = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
    hideOverlay && r$1('drawerOverlay:hide');
    node.classList.remove('is-visible');
    document.querySelectorAll('[aria-controls="cart-flyout-drawer"]').forEach(control => {
      control.setAttribute('aria-expanded', false);
    });
    r$1('cart:close', state => {
      return {
        cartOpen: false
      };
    });
    tabLinkRecent.classList.remove('active');
    tabLinkCart.classList.remove('active');
    setTimeout(() => {
      focusTrap.deactivate();
      o({
        cartOpen: false
      });
      dispatchCustomEvent(CustomEvents.quickCartClose);
    }, 50);
  };

  var overlayHideListener = c$1('drawerOverlay:hiding', () => close(false));

  var viewCart = () => {
    tabLinkCart.classList.add('active');
    tabLinkRecent.classList.remove('active');
    var cart = u().cart;
    render(cart);
  };

  var viewRecent = products => {
    if (!products) return;
    tabLinkCart.classList.remove('active');
    tabLinkRecent.classList.add('active');
    footer.classList.remove('active');
    itemsRoot.innerHTML = renderRecent(products);
  };

  var handleKeyboard = e => {
    var cartOpen = u().cartOpen;

    if (!cartOpen) {
      return;
    }

    if (e.key == 'Escape' || e.keyCode === 27 && drawerOpen) {
      close();
    }
  };

  render(u().cart);
  tabLinkCart.addEventListener('click', e => e.preventDefault() || viewCart());
  tabLinkRecent.addEventListener('click', e => e.preventDefault() || viewRecent(getRecentProducts()));
  closeIcon.addEventListener('click', close);
  c$1('cart:toggle', _ref2 => {
    var {
      cart,
      cartOpen
    } = _ref2;
    cartOpen ? open(cart) : close();
  });
  c$1('cart:updated', _ref3 => {
    var {
      cartOpen,
      cart
    } = _ref3;

    // Rerender the cart list only if cart is open
    if (cartOpen) {
      render(cart);
    } else {
      o({
        cartOpen: true
      });
      open(cart);
    }
  });
  window.addEventListener('keydown', handleKeyboard);

  var unload = () => {
    window.removeEventListener('keydown', handleKeyboard);
    overlayHideListener();
  };

  return {
    unload,
    open
  };
};

var classes$a = {
  visible: 'is-visible'
};
var selectors$G = {
  closeBtn: '[data-modal-close]',
  modalContent: '.modal__content',
  accordion: '.accordion'
};

var modal = node => {
  if (!node) return;
  var focusTrap = createFocusTrap(node, {
    allowOutsideClick: true
  });
  var modalContent = n$3(selectors$G.modalContent, node);
  var accordionElement = null;
  var events = [e$3(n$3(selectors$G.closeBtn, node), 'click', e => {
    e.preventDefault();

    _close();
  }), e$3(node, 'keydown', _ref => {
    var {
      keyCode
    } = _ref;
    if (keyCode === 27) _close();
  }), c$1('drawerOverlay:hiding', () => _close(false)), c$1('modal:open', (state, _ref2) => {
    var {
      modalContent
    } = _ref2;

    _renderModalContent(modalContent);

    _open();
  })];

  var _renderModalContent = content => {
    var clonedContent = content.cloneNode(true);
    modalContent.innerHTML = '';
    modalContent.appendChild(clonedContent);

    _initAccordion();
  };

  var _initAccordion = () => {
    var accordionItem = modalContent.querySelector(selectors$G.accordion);
    if (!accordionItem) return;
    accordionElement = accordion(accordionItem);
  };

  var _open = () => {
    u$2(node, classes$a.visible);
    n$3(selectors$G.closeBtn, node).setAttribute('aria-expanded', true);
    focusTrap.activate();
    r$1('drawerOverlay:show');
  };

  var _close = function _close() {
    var hideOverlay = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
    modalContent.innerHTML = '';
    focusTrap.deactivate();
    hideOverlay && r$1('drawerOverlay:hide');
    i$1(node, classes$a.visible);
    t$7("[aria-controls=\"".concat(node.id, "\"]")).forEach(controls => {
      controls.setAttribute('aria-expanded', false);
    });
  };

  var unload = () => {
    events.forEach(unsubscribe => unsubscribe());
    accordionElement && accordionElement.unload();
  };

  return {
    unload
  };
};

var browser$1 = {exports: {}};

(function (module, exports) {

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

/**
 * DOM event delegator
 *
 * The delegator will listen
 * for events that bubble up
 * to the root node.
 *
 * @constructor
 * @param {Node|string} [root] The root node or a selector string matching the root node
 */
function Delegate(root) {
  /**
   * Maintain a map of listener
   * lists, keyed by event name.
   *
   * @type Object
   */
  this.listenerMap = [{}, {}];

  if (root) {
    this.root(root);
  }
  /** @type function() */


  this.handle = Delegate.prototype.handle.bind(this); // Cache of event listeners removed during an event cycle

  this._removedListeners = [];
}
/**
 * Start listening for events
 * on the provided DOM element
 *
 * @param  {Node|string} [root] The root node or a selector string matching the root node
 * @returns {Delegate} This method is chainable
 */


Delegate.prototype.root = function (root) {
  var listenerMap = this.listenerMap;
  var eventType; // Remove master event listeners

  if (this.rootElement) {
    for (eventType in listenerMap[1]) {
      if (listenerMap[1].hasOwnProperty(eventType)) {
        this.rootElement.removeEventListener(eventType, this.handle, true);
      }
    }

    for (eventType in listenerMap[0]) {
      if (listenerMap[0].hasOwnProperty(eventType)) {
        this.rootElement.removeEventListener(eventType, this.handle, false);
      }
    }
  } // If no root or root is not
  // a dom node, then remove internal
  // root reference and exit here


  if (!root || !root.addEventListener) {
    if (this.rootElement) {
      delete this.rootElement;
    }

    return this;
  }
  /**
   * The root node at which
   * listeners are attached.
   *
   * @type Node
   */


  this.rootElement = root; // Set up master event listeners

  for (eventType in listenerMap[1]) {
    if (listenerMap[1].hasOwnProperty(eventType)) {
      this.rootElement.addEventListener(eventType, this.handle, true);
    }
  }

  for (eventType in listenerMap[0]) {
    if (listenerMap[0].hasOwnProperty(eventType)) {
      this.rootElement.addEventListener(eventType, this.handle, false);
    }
  }

  return this;
};
/**
 * @param {string} eventType
 * @returns boolean
 */


Delegate.prototype.captureForType = function (eventType) {
  return ['blur', 'error', 'focus', 'load', 'resize', 'scroll'].indexOf(eventType) !== -1;
};
/**
 * Attach a handler to one
 * event for all elements
 * that match the selector,
 * now or in the future
 *
 * The handler function receives
 * three arguments: the DOM event
 * object, the node that matched
 * the selector while the event
 * was bubbling and a reference
 * to itself. Within the handler,
 * 'this' is equal to the second
 * argument.
 *
 * The node that actually received
 * the event can be accessed via
 * 'event.target'.
 *
 * @param {string} eventType Listen for these events
 * @param {string|undefined} selector Only handle events on elements matching this selector, if undefined match root element
 * @param {function()} handler Handler function - event data passed here will be in event.data
 * @param {boolean} [useCapture] see 'useCapture' in <https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener>
 * @returns {Delegate} This method is chainable
 */


Delegate.prototype.on = function (eventType, selector, handler, useCapture) {
  var root;
  var listenerMap;
  var matcher;
  var matcherParam;

  if (!eventType) {
    throw new TypeError('Invalid event type: ' + eventType);
  } // handler can be passed as
  // the second or third argument


  if (typeof selector === 'function') {
    useCapture = handler;
    handler = selector;
    selector = null;
  } // Fallback to sensible defaults
  // if useCapture not set


  if (useCapture === undefined) {
    useCapture = this.captureForType(eventType);
  }

  if (typeof handler !== 'function') {
    throw new TypeError('Handler must be a type of Function');
  }

  root = this.rootElement;
  listenerMap = this.listenerMap[useCapture ? 1 : 0]; // Add master handler for type if not created yet

  if (!listenerMap[eventType]) {
    if (root) {
      root.addEventListener(eventType, this.handle, useCapture);
    }

    listenerMap[eventType] = [];
  }

  if (!selector) {
    matcherParam = null; // COMPLEX - matchesRoot needs to have access to
    // this.rootElement, so bind the function to this.

    matcher = matchesRoot.bind(this); // Compile a matcher for the given selector
  } else if (/^[a-z]+$/i.test(selector)) {
    matcherParam = selector;
    matcher = matchesTag;
  } else if (/^#[a-z0-9\-_]+$/i.test(selector)) {
    matcherParam = selector.slice(1);
    matcher = matchesId;
  } else {
    matcherParam = selector;
    matcher = Element.prototype.matches;
  } // Add to the list of listeners


  listenerMap[eventType].push({
    selector: selector,
    handler: handler,
    matcher: matcher,
    matcherParam: matcherParam
  });
  return this;
};
/**
 * Remove an event handler
 * for elements that match
 * the selector, forever
 *
 * @param {string} [eventType] Remove handlers for events matching this type, considering the other parameters
 * @param {string} [selector] If this parameter is omitted, only handlers which match the other two will be removed
 * @param {function()} [handler] If this parameter is omitted, only handlers which match the previous two will be removed
 * @returns {Delegate} This method is chainable
 */


Delegate.prototype.off = function (eventType, selector, handler, useCapture) {
  var i;
  var listener;
  var listenerMap;
  var listenerList;
  var singleEventType; // Handler can be passed as
  // the second or third argument

  if (typeof selector === 'function') {
    useCapture = handler;
    handler = selector;
    selector = null;
  } // If useCapture not set, remove
  // all event listeners


  if (useCapture === undefined) {
    this.off(eventType, selector, handler, true);
    this.off(eventType, selector, handler, false);
    return this;
  }

  listenerMap = this.listenerMap[useCapture ? 1 : 0];

  if (!eventType) {
    for (singleEventType in listenerMap) {
      if (listenerMap.hasOwnProperty(singleEventType)) {
        this.off(singleEventType, selector, handler);
      }
    }

    return this;
  }

  listenerList = listenerMap[eventType];

  if (!listenerList || !listenerList.length) {
    return this;
  } // Remove only parameter matches
  // if specified


  for (i = listenerList.length - 1; i >= 0; i--) {
    listener = listenerList[i];

    if ((!selector || selector === listener.selector) && (!handler || handler === listener.handler)) {
      this._removedListeners.push(listener);

      listenerList.splice(i, 1);
    }
  } // All listeners removed


  if (!listenerList.length) {
    delete listenerMap[eventType]; // Remove the main handler

    if (this.rootElement) {
      this.rootElement.removeEventListener(eventType, this.handle, useCapture);
    }
  }

  return this;
};
/**
 * Handle an arbitrary event.
 *
 * @param {Event} event
 */


Delegate.prototype.handle = function (event) {
  var i;
  var l;
  var type = event.type;
  var root;
  var phase;
  var listener;
  var returned;
  var listenerList = [];
  var target;
  var eventIgnore = 'ftLabsDelegateIgnore';

  if (event[eventIgnore] === true) {
    return;
  }

  target = event.target; // Hardcode value of Node.TEXT_NODE
  // as not defined in IE8

  if (target.nodeType === 3) {
    target = target.parentNode;
  } // Handle SVG <use> elements in IE


  if (target.correspondingUseElement) {
    target = target.correspondingUseElement;
  }

  root = this.rootElement;
  phase = event.eventPhase || (event.target !== event.currentTarget ? 3 : 2); // eslint-disable-next-line default-case

  switch (phase) {
    case 1:
      //Event.CAPTURING_PHASE:
      listenerList = this.listenerMap[1][type];
      break;

    case 2:
      //Event.AT_TARGET:
      if (this.listenerMap[0] && this.listenerMap[0][type]) {
        listenerList = listenerList.concat(this.listenerMap[0][type]);
      }

      if (this.listenerMap[1] && this.listenerMap[1][type]) {
        listenerList = listenerList.concat(this.listenerMap[1][type]);
      }

      break;

    case 3:
      //Event.BUBBLING_PHASE:
      listenerList = this.listenerMap[0][type];
      break;
  }

  var toFire = []; // Need to continuously check
  // that the specific list is
  // still populated in case one
  // of the callbacks actually
  // causes the list to be destroyed.

  l = listenerList.length;

  while (target && l) {
    for (i = 0; i < l; i++) {
      listener = listenerList[i]; // Bail from this loop if
      // the length changed and
      // no more listeners are
      // defined between i and l.

      if (!listener) {
        break;
      }

      if (target.tagName && ["button", "input", "select", "textarea"].indexOf(target.tagName.toLowerCase()) > -1 && target.hasAttribute("disabled")) {
        // Remove things that have previously fired
        toFire = [];
      } // Check for match and fire
      // the event if there's one
      //
      // TODO:MCG:20120117: Need a way
      // to check if event#stopImmediatePropagation
      // was called. If so, break both loops.
      else if (listener.matcher.call(target, listener.matcherParam, target)) {
          toFire.push([event, target, listener]);
        }
    } // TODO:MCG:20120117: Need a way to
    // check if event#stopPropagation
    // was called. If so, break looping
    // through the DOM. Stop if the
    // delegation root has been reached


    if (target === root) {
      break;
    }

    l = listenerList.length; // Fall back to parentNode since SVG children have no parentElement in IE

    target = target.parentElement || target.parentNode; // Do not traverse up to document root when using parentNode, though

    if (target instanceof HTMLDocument) {
      break;
    }
  }

  var ret;

  for (i = 0; i < toFire.length; i++) {
    // Has it been removed during while the event function was fired
    if (this._removedListeners.indexOf(toFire[i][2]) > -1) {
      continue;
    }

    returned = this.fire.apply(this, toFire[i]); // Stop propagation to subsequent
    // callbacks if the callback returned
    // false

    if (returned === false) {
      toFire[i][0][eventIgnore] = true;
      toFire[i][0].preventDefault();
      ret = false;
      break;
    }
  }

  return ret;
};
/**
 * Fire a listener on a target.
 *
 * @param {Event} event
 * @param {Node} target
 * @param {Object} listener
 * @returns {boolean}
 */


Delegate.prototype.fire = function (event, target, listener) {
  return listener.handler.call(target, event, target);
};
/**
 * Check whether an element
 * matches a tag selector.
 *
 * Tags are NOT case-sensitive,
 * except in XML (and XML-based
 * languages such as XHTML).
 *
 * @param {string} tagName The tag name to test against
 * @param {Element} element The element to test with
 * @returns boolean
 */


function matchesTag(tagName, element) {
  return tagName.toLowerCase() === element.tagName.toLowerCase();
}
/**
 * Check whether an element
 * matches the root.
 *
 * @param {?String} selector In this case this is always passed through as null and not used
 * @param {Element} element The element to test with
 * @returns boolean
 */


function matchesRoot(selector, element) {
  if (this.rootElement === window) {
    return (// Match the outer document (dispatched from document)
      element === document || // The <html> element (dispatched from document.body or document.documentElement)
      element === document.documentElement || // Or the window itself (dispatched from window)
      element === window
    );
  }

  return this.rootElement === element;
}
/**
 * Check whether the ID of
 * the element in 'this'
 * matches the given ID.
 *
 * IDs are case-sensitive.
 *
 * @param {string} id The ID to test against
 * @param {Element} element The element to test with
 * @returns boolean
 */


function matchesId(id, element) {
  return id === element.id;
}
/**
 * Short hand for off()
 * and root(), ie both
 * with no parameters
 *
 * @return void
 */


Delegate.prototype.destroy = function () {
  this.off();
  this.root();
};

var _default = Delegate;
exports.default = _default;
module.exports = exports.default;
}(browser$1, browser$1.exports));

var Delegate = /*@__PURE__*/getDefaultExportFromCjs(browser$1.exports);

/**
 * Returns a product JSON object when passed a product URL
 * @param {*} url
 */

/**
 * Convert the Object (with 'name' and 'value' keys) into an Array of values, then find a match & return the variant (as an Object)
 * @param {Object} product Product JSON object
 * @param {Object} collection Object with 'name' and 'value' keys (e.g. [{ name: "Size", value: "36" }, { name: "Color", value: "Black" }])
 * @returns {Object || null} The variant object once a match has been successful. Otherwise null will be returned
 */
function getVariantFromSerializedArray(product, collection) {
  _validateProductStructure(product);

  // If value is an array of options
  var optionArray = _createOptionArrayFromOptionCollection(product, collection);
  return getVariantFromOptionArray(product, optionArray);
}

/**
 * Find a match in the project JSON (using Array with option values) and return the variant (as an Object)
 * @param {Object} product Product JSON object
 * @param {Array} options List of submitted values (e.g. ['36', 'Black'])
 * @returns {Object || null} The variant object once a match has been successful. Otherwise null will be returned
 */
function getVariantFromOptionArray(product, options) {
  _validateProductStructure(product);
  _validateOptionsArray(options);

  var result = product.variants.filter(function(variant) {
    return options.every(function(option, index) {
      return variant.options[index] === option;
    });
  });

  return result[0] || null;
}

/**
 * Creates an array of selected options from the object
 * Loops through the project.options and check if the "option name" exist (product.options.name) and matches the target
 * @param {Object} product Product JSON object
 * @param {Array} collection Array of object (e.g. [{ name: "Size", value: "36" }, { name: "Color", value: "Black" }])
 * @returns {Array} The result of the matched values. (e.g. ['36', 'Black'])
 */
function _createOptionArrayFromOptionCollection(product, collection) {
  _validateProductStructure(product);
  _validateSerializedArray(collection);

  var optionArray = [];

  collection.forEach(function(option) {
    for (var i = 0; i < product.options.length; i++) {
      if (product.options[i].name.toLowerCase() === option.name.toLowerCase()) {
        optionArray[i] = option.value;
        break;
      }
    }
  });

  return optionArray;
}

/**
 * Check if the product data is a valid JS object
 * Error will be thrown if type is invalid
 * @param {object} product Product JSON object
 */
function _validateProductStructure(product) {
  if (typeof product !== 'object') {
    throw new TypeError(product + ' is not an object.');
  }

  if (Object.keys(product).length === 0 && product.constructor === Object) {
    throw new Error(product + ' is empty.');
  }
}

/**
 * Validate the structure of the array
 * It must be formatted like jQuery's serializeArray()
 * @param {Array} collection Array of object [{ name: "Size", value: "36" }, { name: "Color", value: "Black" }]
 */
function _validateSerializedArray(collection) {
  if (!Array.isArray(collection)) {
    throw new TypeError(collection + ' is not an array.');
  }

  if (collection.length === 0) {
    return [];
  }

  if (collection[0].hasOwnProperty('name')) {
    if (typeof collection[0].name !== 'string') {
      throw new TypeError(
        'Invalid value type passed for name of option ' +
          collection[0].name +
          '. Value should be string.'
      );
    }
  } else {
    throw new Error(collection[0] + 'does not contain name key.');
  }
}

/**
 * Validate the structure of the array
 * It must be formatted as list of values
 * @param {Array} collection Array of object (e.g. ['36', 'Black'])
 */
function _validateOptionsArray(options) {
  if (Array.isArray(options) && typeof options[0] === 'object') {
    throw new Error(options + 'is not a valid array of options.');
  }
}

// Public Methods
// -----------------------------------------------------------------------------

/**
 * Returns a URL with a variant ID query parameter. Useful for updating window.history
 * with a new URL based on the currently select product variant.
 * @param {string} url - The URL you wish to append the variant ID to
 * @param {number} id  - The variant ID you wish to append to the URL
 * @returns {string} - The new url which includes the variant ID query parameter
 */

function getUrlWithVariant(url, id) {
  if (/variant=/.test(url)) {
    return url.replace(/(variant=)[^&]+/, '$1' + id);
  } else if (/\?/.test(url)) {
    return url.concat('&variant=').concat(id);
  }

  return url.concat('?variant=').concat(id);
}

var selectors$F = {
  idInput: '[name="id"]',
  optionInput: '[name^="options"]',
  quantityInput: '[name="quantity"]',
  propertyInput: '[name^="properties"]'
};
var defaultOptions$1 = {
  variantSelector: selectors$F.idInput
};
function ProductForm(form, prod) {
  var opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  var config = Object.assign({}, defaultOptions$1, opts);
  var product = validateProductObject(prod);
  var events = [];

  var _addEvent = (element, action, func) => {
    element.addEventListener(action, func, true);
    events.push({
      element,
      action,
      func
    });
  };

  var getOptions = () => {
    return _serializeOptionValues(optionInputs, function (item) {
      var regex = /(?:^(options\[))(.*?)(?:\])/;
      item.name = regex.exec(item.name)[2]; // Use just the value between 'options[' and ']'

      return item;
    });
  };

  var getVariant = () => {
    return getVariantFromSerializedArray(product, getOptions());
  };

  var getProperties = () => {
    var properties = _serializePropertyValues(propertyInputs, function (propertyName) {
      var regex = /(?:^(properties\[))(.*?)(?:\])/;
      var name = regex.exec(propertyName)[2]; // Use just the value between 'properties[' and ']'

      return name;
    });

    return Object.entries(properties).length === 0 ? null : properties;
  };

  var getQuantity = () => {
    return quantityInputs[0] ? Number.parseInt(quantityInputs[0].value, 10) : 1;
  };

  var getProductFormEventData = () => ({
    options: getOptions(),
    variant: getVariant(),
    properties: getProperties(),
    quantity: getQuantity()
  });

  var onFormEvent = cb => {
    if (typeof cb === 'undefined') return;
    return event => {
      event.dataset = getProductFormEventData();
      cb(event);
    };
  };

  var setIdInputValue = value => {
    var idInputElement = form.querySelector(config.variantSelector);

    if (!idInputElement) {
      idInputElement = document.createElement('input');
      idInputElement.type = 'hidden';
      idInputElement.name = 'id';
      form.appendChild(idInputElement);
    }

    idInputElement.value = value.toString();
  };

  var onSubmit = event => {
    event.dataset = getProductFormEventData();
    setIdInputValue(event.dataset.variant.id);

    if (config.onFormSubmit) {
      config.onFormSubmit(event);
    }
  };

  var initInputs = (selector, cb) => {
    var elements = [...form.querySelectorAll(selector)];
    return elements.map(element => {
      _addEvent(element, 'change', onFormEvent(cb));

      return element;
    });
  };

  _addEvent(form, 'submit', onSubmit);

  var optionInputs = initInputs(selectors$F.optionInput, config.onOptionChange);
  var quantityInputs = initInputs(selectors$F.quantityInput, config.onQuantityChange);
  var propertyInputs = initInputs(selectors$F.propertyInput, config.onPropertyChange);

  var destroy = () => {
    events.forEach(event => {
      event.element.removeEventListener(event.action, event.function);
    });
  };

  return {
    getVariant,
    destroy
  };
}

function validateProductObject(product) {
  if (typeof product !== 'object') {
    throw new TypeError(product + ' is not an object.');
  }

  if (typeof product.variants[0].options === 'undefined') {
    throw new TypeError('Product object is invalid. Make sure you use the product object that is output from {{ product | json }} or from the http://[your-product-url].js route');
  }

  return product;
}

function _serializeOptionValues(inputs, transform) {
  return inputs.reduce(function (options, input) {
    if (input.checked || // If input is a checked (means type radio or checkbox)
    input.type !== 'radio' && input.type !== 'checkbox' // Or if its any other type of input
    ) {
      options.push(transform({
        name: input.name,
        value: input.value
      }));
    }

    return options;
  }, []);
}

function _serializePropertyValues(inputs, transform) {
  return inputs.reduce(function (properties, input) {
    if (input.checked || // If input is a checked (means type radio or checkbox)
    input.type !== 'radio' && input.type !== 'checkbox' // Or if its any other type of input
    ) {
      properties[transform(input.name)] = input.value;
    }

    return properties;
  }, {});
}

var selectors$E = {
  drawerTrigger: '[data-store-availability-drawer-trigger]',
  drawer: '[data-store-availability-drawer]',
  productTitle: '[data-store-availability-product-title]',
  storeList: '[data-store-availability-list-content]'
};

var storeAvailability = (container, product, variant) => {
  var storeList = null;
  var currentVariant = variant;
  var delegate = new Delegate(container);

  var _clickHandler = e => {
    e.preventDefault();
    r$1('availability:showMore', () => ({
      product,
      variant: currentVariant,
      storeList
    }));
  };

  var update = variant => {
    currentVariant = variant;
    var variantSectionUrl = "".concat(container.dataset.baseUrl, "/variants/").concat(variant.id, "/?section_id=store-availability");
    fetch(variantSectionUrl).then(response => {
      return response.text();
    }).then(storeAvailabilityHTML => {
      container.innerHTML = '';
      if (storeAvailabilityHTML.trim() === '') return; // Remove section wrapper that throws nested sections error

      container.innerHTML = storeAvailabilityHTML;
      container.innerHTML = container.firstElementChild.innerHTML;
      storeList = n$3(selectors$E.storeList, container);
    });
  }; // Intialize


  update(variant);
  delegate.on('click', selectors$E.drawerTrigger, _clickHandler);

  var unload = () => {
    container.innerHTML = '';
  };

  return {
    unload,
    update
  };
};

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

// Older browsers don't support event options, feature detect it.

// Adopted and modified solution from Bohdan Didukh (2017)
// https://stackoverflow.com/questions/41594997/ios-10-safari-prevent-scrolling-behind-a-fixed-overlay-and-maintain-scroll-posi

var hasPassiveEvents = false;
if (typeof window !== 'undefined') {
  var passiveTestOptions = {
    get passive() {
      hasPassiveEvents = true;
      return undefined;
    }
  };
  window.addEventListener('testPassive', null, passiveTestOptions);
  window.removeEventListener('testPassive', null, passiveTestOptions);
}

var isIosDevice = typeof window !== 'undefined' && window.navigator && window.navigator.platform && (/iP(ad|hone|od)/.test(window.navigator.platform) || window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);


var locks = [];
var documentListenerAdded = false;
var initialClientY = -1;
var previousBodyOverflowSetting = void 0;
var previousBodyPaddingRight = void 0;

// returns true if `el` should be allowed to receive touchmove events.
var allowTouchMove = function allowTouchMove(el) {
  return locks.some(function (lock) {
    if (lock.options.allowTouchMove && lock.options.allowTouchMove(el)) {
      return true;
    }

    return false;
  });
};

var preventDefault = function preventDefault(rawEvent) {
  var e = rawEvent || window.event;

  // For the case whereby consumers adds a touchmove event listener to document.
  // Recall that we do document.addEventListener('touchmove', preventDefault, { passive: false })
  // in disableBodyScroll - so if we provide this opportunity to allowTouchMove, then
  // the touchmove event on document will break.
  if (allowTouchMove(e.target)) {
    return true;
  }

  // Do not prevent if the event has more than one touch (usually meaning this is a multi touch gesture like pinch to zoom).
  if (e.touches.length > 1) return true;

  if (e.preventDefault) e.preventDefault();

  return false;
};

var setOverflowHidden = function setOverflowHidden(options) {
  // If previousBodyPaddingRight is already set, don't set it again.
  if (previousBodyPaddingRight === undefined) {
    var _reserveScrollBarGap = !!options && options.reserveScrollBarGap === true;
    var scrollBarGap = window.innerWidth - document.documentElement.clientWidth;

    if (_reserveScrollBarGap && scrollBarGap > 0) {
      previousBodyPaddingRight = document.body.style.paddingRight;
      document.body.style.paddingRight = scrollBarGap + 'px';
    }
  }

  // If previousBodyOverflowSetting is already set, don't set it again.
  if (previousBodyOverflowSetting === undefined) {
    previousBodyOverflowSetting = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
};

var restoreOverflowSetting = function restoreOverflowSetting() {
  if (previousBodyPaddingRight !== undefined) {
    document.body.style.paddingRight = previousBodyPaddingRight;

    // Restore previousBodyPaddingRight to undefined so setOverflowHidden knows it
    // can be set again.
    previousBodyPaddingRight = undefined;
  }

  if (previousBodyOverflowSetting !== undefined) {
    document.body.style.overflow = previousBodyOverflowSetting;

    // Restore previousBodyOverflowSetting to undefined
    // so setOverflowHidden knows it can be set again.
    previousBodyOverflowSetting = undefined;
  }
};

// https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollHeight#Problems_and_solutions
var isTargetElementTotallyScrolled = function isTargetElementTotallyScrolled(targetElement) {
  return targetElement ? targetElement.scrollHeight - targetElement.scrollTop <= targetElement.clientHeight : false;
};

var handleScroll = function handleScroll(event, targetElement) {
  var clientY = event.targetTouches[0].clientY - initialClientY;

  if (allowTouchMove(event.target)) {
    return false;
  }

  if (targetElement && targetElement.scrollTop === 0 && clientY > 0) {
    // element is at the top of its scroll.
    return preventDefault(event);
  }

  if (isTargetElementTotallyScrolled(targetElement) && clientY < 0) {
    // element is at the bottom of its scroll.
    return preventDefault(event);
  }

  event.stopPropagation();
  return true;
};

var disableBodyScroll = function disableBodyScroll(targetElement, options) {
  // targetElement must be provided
  if (!targetElement) {
    // eslint-disable-next-line no-console
    console.error('disableBodyScroll unsuccessful - targetElement must be provided when calling disableBodyScroll on IOS devices.');
    return;
  }

  // disableBodyScroll must not have been called on this targetElement before
  if (locks.some(function (lock) {
    return lock.targetElement === targetElement;
  })) {
    return;
  }

  var lock = {
    targetElement: targetElement,
    options: options || {}
  };

  locks = [].concat(_toConsumableArray(locks), [lock]);

  if (isIosDevice) {
    targetElement.ontouchstart = function (event) {
      if (event.targetTouches.length === 1) {
        // detect single touch.
        initialClientY = event.targetTouches[0].clientY;
      }
    };
    targetElement.ontouchmove = function (event) {
      if (event.targetTouches.length === 1) {
        // detect single touch.
        handleScroll(event, targetElement);
      }
    };

    if (!documentListenerAdded) {
      document.addEventListener('touchmove', preventDefault, hasPassiveEvents ? { passive: false } : undefined);
      documentListenerAdded = true;
    }
  } else {
    setOverflowHidden(options);
  }
};

var enableBodyScroll = function enableBodyScroll(targetElement) {
  if (!targetElement) {
    // eslint-disable-next-line no-console
    console.error('enableBodyScroll unsuccessful - targetElement must be provided when calling enableBodyScroll on IOS devices.');
    return;
  }

  locks = locks.filter(function (lock) {
    return lock.targetElement !== targetElement;
  });

  if (isIosDevice) {
    targetElement.ontouchstart = null;
    targetElement.ontouchmove = null;

    if (documentListenerAdded && locks.length === 0) {
      document.removeEventListener('touchmove', preventDefault, hasPassiveEvents ? { passive: false } : undefined);
      documentListenerAdded = false;
    }
  } else if (!locks.length) {
    restoreOverflowSetting();
  }
};

var routes = window.theme.routes.cart || {};
var {
  strings: strings$4
} = window.theme;
var selectors$D = {
  productVariant: '[data-variant-select]',
  form: '[data-form]',
  country: '[data-address-country]',
  province: '[data-address-province]',
  provinceWrapper: '[data-address-province-wrapper]',
  zip: '[data-address-zip]',
  modal: '[data-estimator-modal]',
  wash: '[data-mobile-wash]',
  trigger: '[data-estimator-trigger]',
  estimateButton: '[data-estimator-button]',
  success: '[data-estimator-success]',
  error: '[data-estimator-error]',
  close: '[data-close-icon]'
};
var classes$9 = {
  active: 'active',
  hidden: 'hidden',
  visible: 'is-visible',
  fixed: 'is-fixed'
};

var ShippingEstimator = (node, container) => {
  var form = n$3(selectors$D.form, node);
  var productSelect = n$3(selectors$D.productVariant, container);
  var countrySelector = n$3(selectors$D.country, node);
  var provinceSelector = n$3(selectors$D.province, node);
  var provinceWrapper = n$3(selectors$D.provinceWrapper, node);
  var zipInput = n$3(selectors$D.zip, node);
  var modal = n$3(selectors$D.modal, node);
  var wash = n$3(selectors$D.wash, node);
  var trigger = n$3(selectors$D.trigger, node);
  var estimate = n$3(selectors$D.estimateButton, node);
  var successMessage = n$3(selectors$D.success, node);
  var errorMessage = n$3(selectors$D.error, node);
  var focusTrap = null;
  var cartCookie; // Add dummy placeholder option

  var firstCountryOptions = t$7('option', countrySelector);

  if (firstCountryOptions.length > 1) {
    firstCountryOptions[0].setAttribute('selected', true);
    firstCountryOptions[0].innerText = strings$4.products.product.country_placeholder;
  }

  _checkForProvince();

  var events = [e$3(form, 'submit', e => {
    e.preventDefault();

    _estimateShipping();
  }), e$3(countrySelector, 'change', _checkForProvince), e$3(trigger, 'click', _open), e$3(wash, 'click', _close), e$3(n$3(selectors$D.close, node), 'click', _close), e$3(estimate, 'click', _estimateShipping), e$3(modal, 'keydown', _ref => {
    var {
      keyCode
    } = _ref;
    if (keyCode === 27) _close();
  })];
  /* get cookie by name */

  var getCookie = name => {
    var value = '; ' + document.cookie;
    var parts = value.split('; ' + name + '=');
    if (parts.length == 2) return parts.pop().split(';').shift();
  };
  /* update the cart cookie value */


  var updateCartCookie = a => {
    var date = new Date();
    date.setTime(date.getTime() + 14 * 86400000);
    var expires = '; expires=' + date.toGMTString();
    document.cookie = 'cart=' + a + expires + '; path=/';
  };
  /* reset the cart cookie value */


  var resetCartCookie = () => {
    updateCartCookie(cartCookie);
  };
  /* get the rates */


  var getRates = variantId => {
    u$2(estimate, 'loading');
    if (typeof variantId === 'undefined') return;
    var productQuantity = n$3('[data-quantity-input]', container);
    var quantity = productQuantity ? parseInt(productQuantity.value) : 1;
    var addData = {
      id: variantId,
      quantity: quantity
    };
    fetch(routes.add + '.js', {
      body: JSON.stringify(addData),
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'xmlhttprequest'
      },
      method: 'POST'
    }).then(response => {
      return response.json();
    }).then(() => {
      errorMessage.innerHTML = '';
      successMessage.innerHTML = '';
      i$1(successMessage, 'active');
      var countryQuery = "shipping_address%5Bcountry%5D=".concat(countrySelector.value);
      var provinceQuery = "shipping_address%5Bprovince%5D=".concat(provinceSelector.value);
      var zipQuery = "shipping_address%5Bzip%5D=".concat(zipInput.value);
      var requestUrl = "".concat(routes.shipping, ".json?").concat(countryQuery, "&").concat(provinceQuery, "&").concat(zipQuery);
      var request = new XMLHttpRequest();
      request.open('GET', requestUrl, true);

      request.onload = () => {
        var response = JSON.parse(request.response);

        if (request.status >= 200 && request.status < 300) {
          if (response.shipping_rates && response.shipping_rates.length) {
            u$2(successMessage, 'active');
            response.shipping_rates.forEach(rate => {
              var rateElement = "\n                  <li class=\"shipping-estimator-modal__success-item\">\n                    <h4 class=\"ma0\">".concat(rate.name, "</h4>\n                    <span>").concat(formatMoney(rate.price), "</span>\n                  </li>\n                ");
              successMessage.insertAdjacentHTML('beforeend', rateElement);
            });
          } else {
            var noRate = "\n                <li class=\"shipping-estimator-modal__success-item\">\n                  <span>".concat(strings$4.products.product.no_shipping_rates, "</span>\n                </li>\n              ");
            successMessage.insertAdjacentHTML('beforeend', noRate);
          }
        } else {
          for (var [key, value] of Object.entries(response)) {
            var errorElement = "\n              <li class=\"shipping-estimator-modal__error-item\">\n                <div><span>".concat(key, "</span> ").concat(value, "</div>\n              </li>\n            ");
            errorMessage.insertAdjacentHTML('beforeend', errorElement);
          }
        }

        resetCartCookie();
        i$1(estimate, 'loading');
      };

      request.send();
    }).catch(() => {
      resetCartCookie();
      i$1(estimate, 'loading');
    });
  };

  function _checkForProvince() {
    var selected = n$3("[value=\"".concat(countrySelector.value, "\"]"), countrySelector);
    var provinces = JSON.parse(selected.dataset.provinces);
    l(provinceWrapper, classes$9.hidden, !provinces.length);
    provinceSelector.innerHTML = provinces.reduce((acc, curr) => {
      return acc + "<option value=\"".concat(curr[0], "\">").concat(curr[0], "</option>");
    }, '');
  }

  function _estimateShipping() {
    if (!productSelect.value.length) return;
    cartCookie = getCookie('cart');
    var tempCookieValue = 'temp-cart-cookie___' + Date.now();
    var fakeCookieValue = 'fake-cart-cookie___' + Date.now(); // If not found, make a new temp cookie

    if (!cartCookie) {
      updateCartCookie(tempCookieValue);
      cartCookie = getCookie('cart');
    } // If found but has a weird length, abort


    if (cartCookie.length < 32) return;
    /* Change the cookie value to a new 32 character value */

    updateCartCookie(fakeCookieValue);
    getRates(parseInt(productSelect.value));
  }

  function _open(e) {
    e.preventDefault();
    u$2(modal, classes$9.fixed);
    setTimeout(() => {
      u$2(modal, classes$9.visible, classes$9.active);
    }, 50);
    modal.setAttribute('aria-hidden', 'false');
    focusTrap = createFocusTrap(modal, {
      allowOutsideClick: true
    });
    focusTrap.activate();
    disableBodyScroll(modal, {
      allowTouchMove: el => {
        while (el && el !== document.body) {
          if (el.getAttribute('data-scroll-lock-ignore') !== null) {
            return true;
          }

          el = el.parentNode;
        }
      },
      reserveScrollBarGap: true
    });
  }

  function _close(e) {
    e && e.preventDefault();
    i$1(modal, classes$9.visible, classes$9.active);
    focusTrap && focusTrap.deactivate();
    setTimeout(() => {
      i$1(modal, classes$9.fixed);
    }, 300);
    modal.setAttribute('aria-hidden', 'true');
    enableBodyScroll(modal);
  }

  return () => {
    events.forEach(unsubscribe => unsubscribe());
  };
};

var {
  strings: {
    products: strings$3
  }
} = theme;
var classes$8 = {
  hide: 'hide'
};

var productForm = function productForm(formElement) {
  var config = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var {
    productHandle,
    ajaxEnabled
  } = formElement.dataset;
  var {
    product: selector
  } = selectors$M;
  var storeAvailabilityContainer = formElement.querySelector(selector.storeAvailability);
  var shippingEstimatorButtons = t$7('[data-estimator-trigger]', config.container);
  var shippingEstimator = shippingEstimatorButtons.map(button => ShippingEstimator(button.parentNode, config.container));
  var thisInventoryCounter;

  var formSubmit = evt => {
    if (ajaxEnabled !== 'true') return;
    evt.preventDefault();
    evt.dataset;
    var button = formElement.querySelector(selector.addButton);
    var quantityError = formElement.querySelector('[data-quantity-error]');
    button.classList.add('bttn--loading');

    if (quantityError) {
      quantityError.classList.add('hidden');
    }

    addItem(formElement).then(() => {
      button.classList.remove('bttn--loading');
      r$1('product:added');
    }).catch(() => {
      button.classList.remove('bttn--loading');

      if (quantityError) {
        quantityError.classList.remove('hidden');
      }
    });
  };

  var defaultConfig = {
    isProductPage: false,
    isFeaturedProduct: false,
    onOptionChange: e => optionChange(e),
    onQuantityChange: e => quantityChange(e),
    onFormSubmit: formSubmit,
    container: formElement
  };
  var {
    isProductPage,
    isFeaturedProduct,
    onOptionChange,
    onQuantityChange,
    onFormSubmit,
    container
  } = Object.assign(defaultConfig, config);
  var form = null;
  var availability = null;
  var product = getProduct(productHandle);
  product(data => {
    form = ProductForm(formElement, data, {
      variantSelector: '[data-variant-select]',
      onOptionChange,
      onQuantityChange,
      onFormSubmit
    });

    if (isProductPage) {
      updateRecentProducts(data);
    } // Surface pickup


    var variant = form.getVariant();

    if (storeAvailabilityContainer && variant) {
      availability = storeAvailability(storeAvailabilityContainer, data, variant);
    }

    var productInventoryJson = formElement.querySelector('[data-product-inventory-json]');

    if (productInventoryJson) {
      var jsonData = JSON.parse(productInventoryJson.innerHTML);
      var variantsInventories = jsonData.inventory;

      if (variantsInventories) {
        var _config = {
          id: variant.id,
          variantsInventories
        };
        thisInventoryCounter = inventoryCounter(formElement, _config);
      }
    }
  }); // When the user changes the quanitity

  function quantityChange(_ref) {
    var {
      dataset: {
        variant,
        quantity
      }
    } = _ref;
    dispatchCustomEvent(CustomEvents.productQuanityUpdate, {
      quantity: quantity,
      variant: variant
    });
  } // When the user changes a product option


  var optionChange = _ref2 => {
    var {
      dataset: {
        variant
      },
      target
    } = _ref2;
    // Update product option visable value. Essential for swatch/chips
    var optionSelectedLabel = n$3('[data-option-selected]', target.closest('.product-form__option'));
    if (optionSelectedLabel) optionSelectedLabel.innerHTML = target.value;
    dispatchCustomEvent(CustomEvents.productVariantChange, {
      variant: variant
    });

    if (!variant) {
      updateBuyButton(formElement);
      updatePrices(variant);

      if (availability && storeAvailabilityContainer) {
        availability.unload();
      }

      shippingEstimatorButtons.forEach(btn => u$2(btn.parentNode, 'hidden'));
      return;
    }

    if (isProductPage) {
      // Update URL with selected variant
      var url = getUrlWithVariant(window.location.href, variant.id);
      window.history.replaceState({
        path: url
      }, '', url);
    } // Update prices to reflect selected variant


    updatePrices(variant); // We need to set the id input manually so the Dynamic Checkout Button works

    var selectedVariantOpt = formElement.querySelector("".concat(selector.variantSelect, " ").concat(selector.optionById(variant.id)));
    selectedVariantOpt.selected = true; // We need to dispatch an event so Shopify pay knows the form has changed

    formElement.dispatchEvent(new Event('change')); // Update buy button to reflect selected variant

    updateBuyButton(formElement, variant); // Update unit pricing

    updateUnitPrices(container, variant); // Update sku

    updateSku(container, variant);

    if (thisInventoryCounter) {
      thisInventoryCounter && thisInventoryCounter.update(variant);
    } // Scroll to variant media


    if (isProductPage && variant.featured_media) {
      if (window.matchMedia('(min-width: 60em)').matches) {
        var image = document.querySelector("[data-media-id=\"".concat(variant.featured_media.id, "\"]"));

        if (document.querySelector('.product-thumbnails')) {
          var thumb = document.querySelector("[data-thumbnail-id=\"".concat(variant.featured_media.id, "\"]"));
          var allThumbs = document.querySelectorAll('.product-thumbnails__item-link');
          var allImages = document.querySelectorAll('.media-wrapper');
          allThumbs.forEach(thumb => thumb.classList.remove('active'));
          allImages.forEach(image => image.classList.add('hidden'));
          image && image.classList.remove('hidden');
          thumb && thumb.classList.add('active');
        } else {
          image && image.scrollIntoView({
            behavior: 'smooth'
          });
        }
      } else {
        r$1('product:mediaSelect', () => ({
          selectedMedia: variant.featured_media.position - 1
        }));
      }
    } // Show variant


    if (isFeaturedProduct && variant.featured_media) {
      var featureProductImages = container.querySelectorAll('[data-media-id]');
      featureProductImages.forEach(element => {
        element.classList.add('hidden');
      });

      var _image = container.querySelector("[data-media-id=\"".concat(variant.featured_media.id, "\"]"));

      _image.classList.remove('hidden');
    } // Update store availability


    if (availability && isFeaturedProduct || availability && isProductPage) {
      availability.update(variant);
    }

    shippingEstimatorButtons.forEach(btn => i$1(btn.parentNode, 'hidden'));
  };

  var updatePrices = variant => {
    var target = container ? container : formElement;
    var price = target.querySelectorAll(selector.price);
    var comparePrice = target.querySelectorAll(selector.comparePrice);
    var unavailableString = strings$3.product.unavailable;

    if (!variant) {
      price.forEach(el => el.innerHTML = unavailableString);
      comparePrice.forEach(el => el.innerHTML = '');
      comparePrice.forEach(el => el.classList.add(classes$8.hide));
      return;
    }

    price.forEach(el => el.innerHTML = formatMoney(variant.price));

    if (variant.compare_at_price > variant.price) {
      comparePrice.forEach(el => el.innerHTML = formatMoney(variant.compare_at_price));
      comparePrice.forEach(el => el.classList.remove(classes$8.hide));
    } else {
      comparePrice.forEach(el => el.innerHTML = '');
      comparePrice.forEach(el => el.classList.add(classes$8.hide));
    }
  };

  var unload = () => {
    form.destroy();
    shippingEstimator.forEach(unsubscribe => unsubscribe());
  };

  return {
    unload
  };
};

var selectors$C = {
  addToCart: '[data-add-to-cart]',
  price: '[data-price]',
  comparePrice: '[data-compare-price]',
  quickAddModal: '[data-quick-add-modal]',
  quickAddModalClose: '[data-quick-add-close]',
  quickAddModalInner: '.quick-add__inner',
  quickAddModalContent: '.quick-add__content',
  quickAddModalWash: '.quick-add__wash',
  quickAddProduct: '.quick-add__product-wrapper'
};
var classes$7 = {
  visible: 'visible',
  hidden: 'hidden',
  loaded: 'loaded'
};

var getProductMarkup = handle => cb => fetch("".concat(window.theme.routes.products, "/").concat(encodeURIComponent(handle), "?section_id=quick-add-item")).then(res => res.text()).then(data => cb(data)).catch(err => console.log(err.message));

function quickAdd () {
  var quickAddModal = n$3(selectors$C.quickAddModal, document);
  var quickAddModalContent = n$3(selectors$C.quickAddModalContent, quickAddModal);
  var quickAddModalWash = n$3(selectors$C.quickAddModalWash, quickAddModal);
  var delegate = new Delegate(document.body);
  [e$3(quickAddModalWash, 'click', close), e$3(n$3(selectors$C.quickAddModalClose, quickAddModal), 'click', close), e$3(quickAddModal, 'keydown', _ref => {
    var {
      keyCode
    } = _ref;
    if (keyCode === 27) close();
  }), c$1('product:added', () => close())];
  delegate.on('click', 'button[data-quick-add]', handleClick);
  var focusTrap = createFocusTrap(n$3(selectors$C.quickAddModalInner, quickAddModal), {
    allowOutsideClick: true
  });
  var form, specialityVariantButtons, quanityInputEl;

  function handleClick(event, target) {
    event.preventDefault();
    var {
      quickAdd: handle
    } = target.dataset;
    open(handle);
  }

  function open(handle) {
    quickAddModalContent.innerHTML = '';
    u$2(quickAddModal, classes$7.visible);
    focusTrap.activate(); // Fetch markup and open quick add

    var product = getProductMarkup(handle);
    product(html => {
      u$2(quickAddModal, classes$7.loaded);
      var container = document.createElement('div');
      container.innerHTML = html;
      quickAddModalContent.innerHTML = n$3(selectors$C.quickAddProduct, container).innerHTML;
      form = productForm(n$3('form', quickAddModalContent), {
        isProductPage: false,
        container: quickAddModalContent
      });
      var quantityEl = n$3('.product-form__input', quickAddModalContent);

      if (quantityEl) {
        quanityInputEl = quantityInput('.product-form__quantity', quickAddModalContent);
      }

      specialityVariantButtons = OptionButtons(t$7('[data-option-buttons]', quickAddModalContent));
    });
  }

  function close() {
    var _form, _quanityInputEl, _specialityVariantBut;

    focusTrap.deactivate();
    i$1(quickAddModal, classes$7.loaded);
    i$1(quickAddModal, classes$7.visible);
    (_form = form) === null || _form === void 0 ? void 0 : _form.unload();
    (_quanityInputEl = quanityInputEl) === null || _quanityInputEl === void 0 ? void 0 : _quanityInputEl.quanityInputEl();
    (_specialityVariantBut = specialityVariantButtons) === null || _specialityVariantBut === void 0 ? void 0 : _specialityVariantBut.destroy();
  }
}

var classes$6 = {
  visible: 'is-visible'
};
var selectors$B = {
  closeBtn: '[data-store-availability-close]',
  productTitle: '[data-store-availability-product-title]',
  variantTitle: '[data-store-availability-variant-title]',
  productCard: '[data-store-availability-product]',
  storeListcontainer: '[data-store-list-container]'
};

var storeAvailabilityDrawer = node => {
  if (!node) return;
  var focusTrap = createFocusTrap(node, {
    allowOutsideClick: true
  });
  var productCard = n$3(selectors$B.productCard, node);
  var storeListContainer = n$3(selectors$B.storeListcontainer, node);
  var events = [e$3(n$3(selectors$B.closeBtn, node), 'click', e => {
    e.preventDefault();

    _close();
  }), e$3(node, 'keydown', _ref => {
    var {
      keyCode
    } = _ref;
    if (keyCode === 27) _close();
  }), c$1('drawerOverlay:hiding', () => _close(false)), c$1('availability:showMore', _ref2 => {
    var {
      product,
      variant,
      storeList
    } = _ref2;
    productCard.innerHTML = _renderProductCard(product, variant);

    _renderAvailabilityList(storeList);

    _open();
  })];

  var _renderAvailabilityList = storeList => {
    storeListContainer.innerHTML = '';
    storeListContainer.appendChild(storeList);
  };

  var _renderProductCard = (_ref3, _ref4) => {
    var {
      featured_image: image,
      title
    } = _ref3;
    var {
      title: variant_title,
      featured_image,
      price,
      unit_price,
      unit_price_measurement
    } = _ref4;

    var productImage = _getVariantImage(image, featured_image);

    return "\n      <div class=\"store-availbility-flyout__product-card type-body-regular\">\n        ".concat(productImage ? "\n            <div class='store-availbility-flyout__product-card-image'>\n              <img src='".concat(productImage, "' alt='").concat(title, "'/>\n            </div>\n          ") : '', "\n        <div class='store-availbility-flyout__product-card-details'>\n          <div>\n            <h4 class=\"ma0\">\n              <span>").concat(title, "</span>\n            </h4>\n            <div class=\"store-availbility-flyout__product-price-wrapper\">\n              <span class=\"store-availbility-flyout__product-price\">").concat(formatMoney$1(price), "</span>\n              ").concat(renderUnitPrice(unit_price, unit_price_measurement), "\n            </div>\n            <div class=\"store-availbility-flyout__product-card-options\">\n              ").concat(variant_title, "\n            </div>\n          </div>\n        </div>\n      </div>\n    ");
  };

  var _getVariantImage = (productImage, variantImage) => {
    if (!productImage && !variantImage) return '';

    if (variantImage) {
      return _updateImageSize(variantImage.src);
    }

    return _updateImageSize(productImage);
  };

  var _updateImageSize = imageUrl => {
    return getSizedImageUrl$1(imageUrl.replace('.' + imageSize(imageUrl), ''), '200x');
  };

  var _open = () => {
    u$2(node, classes$6.visible);
    node.setAttribute('aria-hidden', 'false');
    focusTrap.activate();
    r$1('drawerOverlay:show');
  };

  var _close = function _close() {
    var hideOverlay = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
    focusTrap.deactivate();
    hideOverlay && r$1('drawerOverlay:hide');
    i$1(node, classes$6.visible);
    node.setAttribute('aria-hidden', 'true');
  };

  var unload = () => {
    events.forEach(unsubscribe => unsubscribe());
  };

  return {
    unload
  };
};

var ls_objectFit = {exports: {}};

var lazysizes = {exports: {}};

(function (module) {
(function(window, factory) {
	var lazySizes = factory(window, window.document, Date);
	window.lazySizes = lazySizes;
	if(module.exports){
		module.exports = lazySizes;
	}
}(typeof window != 'undefined' ?
      window : {}, 
/**
 * import("./types/global")
 * @typedef { import("./types/lazysizes-config").LazySizesConfigPartial } LazySizesConfigPartial
 */
function l(window, document, Date) { // Pass in the window Date function also for SSR because the Date class can be lost
	/*jshint eqnull:true */

	var lazysizes,
		/**
		 * @type { LazySizesConfigPartial }
		 */
		lazySizesCfg;

	(function(){
		var prop;

		var lazySizesDefaults = {
			lazyClass: 'lazyload',
			loadedClass: 'lazyloaded',
			loadingClass: 'lazyloading',
			preloadClass: 'lazypreload',
			errorClass: 'lazyerror',
			//strictClass: 'lazystrict',
			autosizesClass: 'lazyautosizes',
			fastLoadedClass: 'ls-is-cached',
			iframeLoadMode: 0,
			srcAttr: 'data-src',
			srcsetAttr: 'data-srcset',
			sizesAttr: 'data-sizes',
			//preloadAfterLoad: false,
			minSize: 40,
			customMedia: {},
			init: true,
			expFactor: 1.5,
			hFac: 0.8,
			loadMode: 2,
			loadHidden: true,
			ricTimeout: 0,
			throttleDelay: 125,
		};

		lazySizesCfg = window.lazySizesConfig || window.lazysizesConfig || {};

		for(prop in lazySizesDefaults){
			if(!(prop in lazySizesCfg)){
				lazySizesCfg[prop] = lazySizesDefaults[prop];
			}
		}
	})();

	if (!document || !document.getElementsByClassName) {
		return {
			init: function () {},
			/**
			 * @type { LazySizesConfigPartial }
			 */
			cfg: lazySizesCfg,
			/**
			 * @type { true }
			 */
			noSupport: true,
		};
	}

	var docElem = document.documentElement;

	var supportPicture = window.HTMLPictureElement;

	var _addEventListener = 'addEventListener';

	var _getAttribute = 'getAttribute';

	/**
	 * Update to bind to window because 'this' becomes null during SSR
	 * builds.
	 */
	var addEventListener = window[_addEventListener].bind(window);

	var setTimeout = window.setTimeout;

	var requestAnimationFrame = window.requestAnimationFrame || setTimeout;

	var requestIdleCallback = window.requestIdleCallback;

	var regPicture = /^picture$/i;

	var loadEvents = ['load', 'error', 'lazyincluded', '_lazyloaded'];

	var regClassCache = {};

	var forEach = Array.prototype.forEach;

	/**
	 * @param ele {Element}
	 * @param cls {string}
	 */
	var hasClass = function(ele, cls) {
		if(!regClassCache[cls]){
			regClassCache[cls] = new RegExp('(\\s|^)'+cls+'(\\s|$)');
		}
		return regClassCache[cls].test(ele[_getAttribute]('class') || '') && regClassCache[cls];
	};

	/**
	 * @param ele {Element}
	 * @param cls {string}
	 */
	var addClass = function(ele, cls) {
		if (!hasClass(ele, cls)){
			ele.setAttribute('class', (ele[_getAttribute]('class') || '').trim() + ' ' + cls);
		}
	};

	/**
	 * @param ele {Element}
	 * @param cls {string}
	 */
	var removeClass = function(ele, cls) {
		var reg;
		if ((reg = hasClass(ele,cls))) {
			ele.setAttribute('class', (ele[_getAttribute]('class') || '').replace(reg, ' '));
		}
	};

	var addRemoveLoadEvents = function(dom, fn, add){
		var action = add ? _addEventListener : 'removeEventListener';
		if(add){
			addRemoveLoadEvents(dom, fn);
		}
		loadEvents.forEach(function(evt){
			dom[action](evt, fn);
		});
	};

	/**
	 * @param elem { Element }
	 * @param name { string }
	 * @param detail { any }
	 * @param noBubbles { boolean }
	 * @param noCancelable { boolean }
	 * @returns { CustomEvent }
	 */
	var triggerEvent = function(elem, name, detail, noBubbles, noCancelable){
		var event = document.createEvent('Event');

		if(!detail){
			detail = {};
		}

		detail.instance = lazysizes;

		event.initEvent(name, !noBubbles, !noCancelable);

		event.detail = detail;

		elem.dispatchEvent(event);
		return event;
	};

	var updatePolyfill = function (el, full){
		var polyfill;
		if( !supportPicture && ( polyfill = (window.picturefill || lazySizesCfg.pf) ) ){
			if(full && full.src && !el[_getAttribute]('srcset')){
				el.setAttribute('srcset', full.src);
			}
			polyfill({reevaluate: true, elements: [el]});
		} else if(full && full.src){
			el.src = full.src;
		}
	};

	var getCSS = function (elem, style){
		return (getComputedStyle(elem, null) || {})[style];
	};

	/**
	 *
	 * @param elem { Element }
	 * @param parent { Element }
	 * @param [width] {number}
	 * @returns {number}
	 */
	var getWidth = function(elem, parent, width){
		width = width || elem.offsetWidth;

		while(width < lazySizesCfg.minSize && parent && !elem._lazysizesWidth){
			width =  parent.offsetWidth;
			parent = parent.parentNode;
		}

		return width;
	};

	var rAF = (function(){
		var running, waiting;
		var firstFns = [];
		var secondFns = [];
		var fns = firstFns;

		var run = function(){
			var runFns = fns;

			fns = firstFns.length ? secondFns : firstFns;

			running = true;
			waiting = false;

			while(runFns.length){
				runFns.shift()();
			}

			running = false;
		};

		var rafBatch = function(fn, queue){
			if(running && !queue){
				fn.apply(this, arguments);
			} else {
				fns.push(fn);

				if(!waiting){
					waiting = true;
					(document.hidden ? setTimeout : requestAnimationFrame)(run);
				}
			}
		};

		rafBatch._lsFlush = run;

		return rafBatch;
	})();

	var rAFIt = function(fn, simple){
		return simple ?
			function() {
				rAF(fn);
			} :
			function(){
				var that = this;
				var args = arguments;
				rAF(function(){
					fn.apply(that, args);
				});
			}
		;
	};

	var throttle = function(fn){
		var running;
		var lastTime = 0;
		var gDelay = lazySizesCfg.throttleDelay;
		var rICTimeout = lazySizesCfg.ricTimeout;
		var run = function(){
			running = false;
			lastTime = Date.now();
			fn();
		};
		var idleCallback = requestIdleCallback && rICTimeout > 49 ?
			function(){
				requestIdleCallback(run, {timeout: rICTimeout});

				if(rICTimeout !== lazySizesCfg.ricTimeout){
					rICTimeout = lazySizesCfg.ricTimeout;
				}
			} :
			rAFIt(function(){
				setTimeout(run);
			}, true)
		;

		return function(isPriority){
			var delay;

			if((isPriority = isPriority === true)){
				rICTimeout = 33;
			}

			if(running){
				return;
			}

			running =  true;

			delay = gDelay - (Date.now() - lastTime);

			if(delay < 0){
				delay = 0;
			}

			if(isPriority || delay < 9){
				idleCallback();
			} else {
				setTimeout(idleCallback, delay);
			}
		};
	};

	//based on http://modernjavascript.blogspot.de/2013/08/building-better-debounce.html
	var debounce = function(func) {
		var timeout, timestamp;
		var wait = 99;
		var run = function(){
			timeout = null;
			func();
		};
		var later = function() {
			var last = Date.now() - timestamp;

			if (last < wait) {
				setTimeout(later, wait - last);
			} else {
				(requestIdleCallback || run)(run);
			}
		};

		return function() {
			timestamp = Date.now();

			if (!timeout) {
				timeout = setTimeout(later, wait);
			}
		};
	};

	var loader = (function(){
		var preloadElems, isCompleted, resetPreloadingTimer, loadMode, started;

		var eLvW, elvH, eLtop, eLleft, eLright, eLbottom, isBodyHidden;

		var regImg = /^img$/i;
		var regIframe = /^iframe$/i;

		var supportScroll = ('onscroll' in window) && !(/(gle|ing)bot/.test(navigator.userAgent));

		var shrinkExpand = 0;
		var currentExpand = 0;

		var isLoading = 0;
		var lowRuns = -1;

		var resetPreloading = function(e){
			isLoading--;
			if(!e || isLoading < 0 || !e.target){
				isLoading = 0;
			}
		};

		var isVisible = function (elem) {
			if (isBodyHidden == null) {
				isBodyHidden = getCSS(document.body, 'visibility') == 'hidden';
			}

			return isBodyHidden || !(getCSS(elem.parentNode, 'visibility') == 'hidden' && getCSS(elem, 'visibility') == 'hidden');
		};

		var isNestedVisible = function(elem, elemExpand){
			var outerRect;
			var parent = elem;
			var visible = isVisible(elem);

			eLtop -= elemExpand;
			eLbottom += elemExpand;
			eLleft -= elemExpand;
			eLright += elemExpand;

			while(visible && (parent = parent.offsetParent) && parent != document.body && parent != docElem){
				visible = ((getCSS(parent, 'opacity') || 1) > 0);

				if(visible && getCSS(parent, 'overflow') != 'visible'){
					outerRect = parent.getBoundingClientRect();
					visible = eLright > outerRect.left &&
						eLleft < outerRect.right &&
						eLbottom > outerRect.top - 1 &&
						eLtop < outerRect.bottom + 1
					;
				}
			}

			return visible;
		};

		var checkElements = function() {
			var eLlen, i, rect, autoLoadElem, loadedSomething, elemExpand, elemNegativeExpand, elemExpandVal,
				beforeExpandVal, defaultExpand, preloadExpand, hFac;
			var lazyloadElems = lazysizes.elements;

			if((loadMode = lazySizesCfg.loadMode) && isLoading < 8 && (eLlen = lazyloadElems.length)){

				i = 0;

				lowRuns++;

				for(; i < eLlen; i++){

					if(!lazyloadElems[i] || lazyloadElems[i]._lazyRace){continue;}

					if(!supportScroll || (lazysizes.prematureUnveil && lazysizes.prematureUnveil(lazyloadElems[i]))){unveilElement(lazyloadElems[i]);continue;}

					if(!(elemExpandVal = lazyloadElems[i][_getAttribute]('data-expand')) || !(elemExpand = elemExpandVal * 1)){
						elemExpand = currentExpand;
					}

					if (!defaultExpand) {
						defaultExpand = (!lazySizesCfg.expand || lazySizesCfg.expand < 1) ?
							docElem.clientHeight > 500 && docElem.clientWidth > 500 ? 500 : 370 :
							lazySizesCfg.expand;

						lazysizes._defEx = defaultExpand;

						preloadExpand = defaultExpand * lazySizesCfg.expFactor;
						hFac = lazySizesCfg.hFac;
						isBodyHidden = null;

						if(currentExpand < preloadExpand && isLoading < 1 && lowRuns > 2 && loadMode > 2 && !document.hidden){
							currentExpand = preloadExpand;
							lowRuns = 0;
						} else if(loadMode > 1 && lowRuns > 1 && isLoading < 6){
							currentExpand = defaultExpand;
						} else {
							currentExpand = shrinkExpand;
						}
					}

					if(beforeExpandVal !== elemExpand){
						eLvW = innerWidth + (elemExpand * hFac);
						elvH = innerHeight + elemExpand;
						elemNegativeExpand = elemExpand * -1;
						beforeExpandVal = elemExpand;
					}

					rect = lazyloadElems[i].getBoundingClientRect();

					if ((eLbottom = rect.bottom) >= elemNegativeExpand &&
						(eLtop = rect.top) <= elvH &&
						(eLright = rect.right) >= elemNegativeExpand * hFac &&
						(eLleft = rect.left) <= eLvW &&
						(eLbottom || eLright || eLleft || eLtop) &&
						(lazySizesCfg.loadHidden || isVisible(lazyloadElems[i])) &&
						((isCompleted && isLoading < 3 && !elemExpandVal && (loadMode < 3 || lowRuns < 4)) || isNestedVisible(lazyloadElems[i], elemExpand))){
						unveilElement(lazyloadElems[i]);
						loadedSomething = true;
						if(isLoading > 9){break;}
					} else if(!loadedSomething && isCompleted && !autoLoadElem &&
						isLoading < 4 && lowRuns < 4 && loadMode > 2 &&
						(preloadElems[0] || lazySizesCfg.preloadAfterLoad) &&
						(preloadElems[0] || (!elemExpandVal && ((eLbottom || eLright || eLleft || eLtop) || lazyloadElems[i][_getAttribute](lazySizesCfg.sizesAttr) != 'auto')))){
						autoLoadElem = preloadElems[0] || lazyloadElems[i];
					}
				}

				if(autoLoadElem && !loadedSomething){
					unveilElement(autoLoadElem);
				}
			}
		};

		var throttledCheckElements = throttle(checkElements);

		var switchLoadingClass = function(e){
			var elem = e.target;

			if (elem._lazyCache) {
				delete elem._lazyCache;
				return;
			}

			resetPreloading(e);
			addClass(elem, lazySizesCfg.loadedClass);
			removeClass(elem, lazySizesCfg.loadingClass);
			addRemoveLoadEvents(elem, rafSwitchLoadingClass);
			triggerEvent(elem, 'lazyloaded');
		};
		var rafedSwitchLoadingClass = rAFIt(switchLoadingClass);
		var rafSwitchLoadingClass = function(e){
			rafedSwitchLoadingClass({target: e.target});
		};

		var changeIframeSrc = function(elem, src){
			var loadMode = elem.getAttribute('data-load-mode') || lazySizesCfg.iframeLoadMode;

			// loadMode can be also a string!
			if (loadMode == 0) {
				elem.contentWindow.location.replace(src);
			} else if (loadMode == 1) {
				elem.src = src;
			}
		};

		var handleSources = function(source){
			var customMedia;

			var sourceSrcset = source[_getAttribute](lazySizesCfg.srcsetAttr);

			if( (customMedia = lazySizesCfg.customMedia[source[_getAttribute]('data-media') || source[_getAttribute]('media')]) ){
				source.setAttribute('media', customMedia);
			}

			if(sourceSrcset){
				source.setAttribute('srcset', sourceSrcset);
			}
		};

		var lazyUnveil = rAFIt(function (elem, detail, isAuto, sizes, isImg){
			var src, srcset, parent, isPicture, event, firesLoad;

			if(!(event = triggerEvent(elem, 'lazybeforeunveil', detail)).defaultPrevented){

				if(sizes){
					if(isAuto){
						addClass(elem, lazySizesCfg.autosizesClass);
					} else {
						elem.setAttribute('sizes', sizes);
					}
				}

				srcset = elem[_getAttribute](lazySizesCfg.srcsetAttr);
				src = elem[_getAttribute](lazySizesCfg.srcAttr);

				if(isImg) {
					parent = elem.parentNode;
					isPicture = parent && regPicture.test(parent.nodeName || '');
				}

				firesLoad = detail.firesLoad || (('src' in elem) && (srcset || src || isPicture));

				event = {target: elem};

				addClass(elem, lazySizesCfg.loadingClass);

				if(firesLoad){
					clearTimeout(resetPreloadingTimer);
					resetPreloadingTimer = setTimeout(resetPreloading, 2500);
					addRemoveLoadEvents(elem, rafSwitchLoadingClass, true);
				}

				if(isPicture){
					forEach.call(parent.getElementsByTagName('source'), handleSources);
				}

				if(srcset){
					elem.setAttribute('srcset', srcset);
				} else if(src && !isPicture){
					if(regIframe.test(elem.nodeName)){
						changeIframeSrc(elem, src);
					} else {
						elem.src = src;
					}
				}

				if(isImg && (srcset || isPicture)){
					updatePolyfill(elem, {src: src});
				}
			}

			if(elem._lazyRace){
				delete elem._lazyRace;
			}
			removeClass(elem, lazySizesCfg.lazyClass);

			rAF(function(){
				// Part of this can be removed as soon as this fix is older: https://bugs.chromium.org/p/chromium/issues/detail?id=7731 (2015)
				var isLoaded = elem.complete && elem.naturalWidth > 1;

				if( !firesLoad || isLoaded){
					if (isLoaded) {
						addClass(elem, lazySizesCfg.fastLoadedClass);
					}
					switchLoadingClass(event);
					elem._lazyCache = true;
					setTimeout(function(){
						if ('_lazyCache' in elem) {
							delete elem._lazyCache;
						}
					}, 9);
				}
				if (elem.loading == 'lazy') {
					isLoading--;
				}
			}, true);
		});

		/**
		 *
		 * @param elem { Element }
		 */
		var unveilElement = function (elem){
			if (elem._lazyRace) {return;}
			var detail;

			var isImg = regImg.test(elem.nodeName);

			//allow using sizes="auto", but don't use. it's invalid. Use data-sizes="auto" or a valid value for sizes instead (i.e.: sizes="80vw")
			var sizes = isImg && (elem[_getAttribute](lazySizesCfg.sizesAttr) || elem[_getAttribute]('sizes'));
			var isAuto = sizes == 'auto';

			if( (isAuto || !isCompleted) && isImg && (elem[_getAttribute]('src') || elem.srcset) && !elem.complete && !hasClass(elem, lazySizesCfg.errorClass) && hasClass(elem, lazySizesCfg.lazyClass)){return;}

			detail = triggerEvent(elem, 'lazyunveilread').detail;

			if(isAuto){
				 autoSizer.updateElem(elem, true, elem.offsetWidth);
			}

			elem._lazyRace = true;
			isLoading++;

			lazyUnveil(elem, detail, isAuto, sizes, isImg);
		};

		var afterScroll = debounce(function(){
			lazySizesCfg.loadMode = 3;
			throttledCheckElements();
		});

		var altLoadmodeScrollListner = function(){
			if(lazySizesCfg.loadMode == 3){
				lazySizesCfg.loadMode = 2;
			}
			afterScroll();
		};

		var onload = function(){
			if(isCompleted){return;}
			if(Date.now() - started < 999){
				setTimeout(onload, 999);
				return;
			}


			isCompleted = true;

			lazySizesCfg.loadMode = 3;

			throttledCheckElements();

			addEventListener('scroll', altLoadmodeScrollListner, true);
		};

		return {
			_: function(){
				started = Date.now();

				lazysizes.elements = document.getElementsByClassName(lazySizesCfg.lazyClass);
				preloadElems = document.getElementsByClassName(lazySizesCfg.lazyClass + ' ' + lazySizesCfg.preloadClass);

				addEventListener('scroll', throttledCheckElements, true);

				addEventListener('resize', throttledCheckElements, true);

				addEventListener('pageshow', function (e) {
					if (e.persisted) {
						var loadingElements = document.querySelectorAll('.' + lazySizesCfg.loadingClass);

						if (loadingElements.length && loadingElements.forEach) {
							requestAnimationFrame(function () {
								loadingElements.forEach( function (img) {
									if (img.complete) {
										unveilElement(img);
									}
								});
							});
						}
					}
				});

				if(window.MutationObserver){
					new MutationObserver( throttledCheckElements ).observe( docElem, {childList: true, subtree: true, attributes: true} );
				} else {
					docElem[_addEventListener]('DOMNodeInserted', throttledCheckElements, true);
					docElem[_addEventListener]('DOMAttrModified', throttledCheckElements, true);
					setInterval(throttledCheckElements, 999);
				}

				addEventListener('hashchange', throttledCheckElements, true);

				//, 'fullscreenchange'
				['focus', 'mouseover', 'click', 'load', 'transitionend', 'animationend'].forEach(function(name){
					document[_addEventListener](name, throttledCheckElements, true);
				});

				if((/d$|^c/.test(document.readyState))){
					onload();
				} else {
					addEventListener('load', onload);
					document[_addEventListener]('DOMContentLoaded', throttledCheckElements);
					setTimeout(onload, 20000);
				}

				if(lazysizes.elements.length){
					checkElements();
					rAF._lsFlush();
				} else {
					throttledCheckElements();
				}
			},
			checkElems: throttledCheckElements,
			unveil: unveilElement,
			_aLSL: altLoadmodeScrollListner,
		};
	})();


	var autoSizer = (function(){
		var autosizesElems;

		var sizeElement = rAFIt(function(elem, parent, event, width){
			var sources, i, len;
			elem._lazysizesWidth = width;
			width += 'px';

			elem.setAttribute('sizes', width);

			if(regPicture.test(parent.nodeName || '')){
				sources = parent.getElementsByTagName('source');
				for(i = 0, len = sources.length; i < len; i++){
					sources[i].setAttribute('sizes', width);
				}
			}

			if(!event.detail.dataAttr){
				updatePolyfill(elem, event.detail);
			}
		});
		/**
		 *
		 * @param elem {Element}
		 * @param dataAttr
		 * @param [width] { number }
		 */
		var getSizeElement = function (elem, dataAttr, width){
			var event;
			var parent = elem.parentNode;

			if(parent){
				width = getWidth(elem, parent, width);
				event = triggerEvent(elem, 'lazybeforesizes', {width: width, dataAttr: !!dataAttr});

				if(!event.defaultPrevented){
					width = event.detail.width;

					if(width && width !== elem._lazysizesWidth){
						sizeElement(elem, parent, event, width);
					}
				}
			}
		};

		var updateElementsSizes = function(){
			var i;
			var len = autosizesElems.length;
			if(len){
				i = 0;

				for(; i < len; i++){
					getSizeElement(autosizesElems[i]);
				}
			}
		};

		var debouncedUpdateElementsSizes = debounce(updateElementsSizes);

		return {
			_: function(){
				autosizesElems = document.getElementsByClassName(lazySizesCfg.autosizesClass);
				addEventListener('resize', debouncedUpdateElementsSizes);
			},
			checkElems: debouncedUpdateElementsSizes,
			updateElem: getSizeElement
		};
	})();

	var init = function(){
		if(!init.i && document.getElementsByClassName){
			init.i = true;
			autoSizer._();
			loader._();
		}
	};

	setTimeout(function(){
		if(lazySizesCfg.init){
			init();
		}
	});

	lazysizes = {
		/**
		 * @type { LazySizesConfigPartial }
		 */
		cfg: lazySizesCfg,
		autoSizer: autoSizer,
		loader: loader,
		init: init,
		uP: updatePolyfill,
		aC: addClass,
		rC: removeClass,
		hC: hasClass,
		fire: triggerEvent,
		gW: getWidth,
		rAF: rAF,
	};

	return lazysizes;
}
));
}(lazysizes));

(function (module) {
(function(window, factory) {
	if(!window) {return;}
	var globalInstall = function(initialEvent){
		factory(window.lazySizes, initialEvent);
		window.removeEventListener('lazyunveilread', globalInstall, true);
	};

	factory = factory.bind(null, window, window.document);

	if(module.exports){
		factory(lazysizes.exports);
	} else if(window.lazySizes) {
		globalInstall();
	} else {
		window.addEventListener('lazyunveilread', globalInstall, true);
	}
}(typeof window != 'undefined' ?
	window : 0, function(window, document, lazySizes, initialEvent) {
	var cloneElementClass;
	var style = document.createElement('a').style;
	var fitSupport = 'objectFit' in style;
	var positionSupport = fitSupport && 'objectPosition' in style;
	var regCssFit = /object-fit["']*\s*:\s*["']*(contain|cover)/;
	var regCssPosition = /object-position["']*\s*:\s*["']*(.+?)(?=($|,|'|"|;))/;
	var blankSrc = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
	var regBgUrlEscape = /\(|\)|'/;
	var positionDefaults = {
		center: 'center',
		'50% 50%': 'center',
	};

	function getObject(element){
		var css = (getComputedStyle(element, null) || {});
		var content = css.fontFamily || '';
		var objectFit = content.match(regCssFit) || '';
		var objectPosition = objectFit && content.match(regCssPosition) || '';

		if(objectPosition){
			objectPosition = objectPosition[1];
		}

		return {
			fit: objectFit && objectFit[1] || '',
			position: positionDefaults[objectPosition] || objectPosition || 'center',
		};
	}

	function generateStyleClass() {
		if (cloneElementClass) {
			return;
		}

		var styleElement = document.createElement('style');

		cloneElementClass = lazySizes.cfg.objectFitClass || 'lazysizes-display-clone';

		document.querySelector('head').appendChild(styleElement);
	}

	function removePrevClone(element) {
		var prev = element.previousElementSibling;

		if (prev && lazySizes.hC(prev, cloneElementClass)) {
			prev.parentNode.removeChild(prev);
			element.style.position = prev.getAttribute('data-position') || '';
			element.style.visibility = prev.getAttribute('data-visibility') || '';
		}
	}

	function initFix(element, config){
		var switchClassesAdded, addedSrc, styleElement, styleElementStyle;
		var lazysizesCfg = lazySizes.cfg;

		var onChange = function(){
			var src = element.currentSrc || element.src;

			if(src && addedSrc !== src){
				addedSrc = src;
				styleElementStyle.backgroundImage = 'url(' + (regBgUrlEscape.test(src) ? JSON.stringify(src) : src ) + ')';

				if(!switchClassesAdded){
					switchClassesAdded = true;
					lazySizes.rC(styleElement, lazysizesCfg.loadingClass);
					lazySizes.aC(styleElement, lazysizesCfg.loadedClass);
				}
			}
		};
		var rafedOnChange = function(){
			lazySizes.rAF(onChange);
		};

		element._lazysizesParentFit = config.fit;

		element.addEventListener('lazyloaded', rafedOnChange, true);
		element.addEventListener('load', rafedOnChange, true);

		lazySizes.rAF(function(){

			var hideElement = element;
			var container = element.parentNode;

			if(container.nodeName.toUpperCase() == 'PICTURE'){
				hideElement = container;
				container = container.parentNode;
			}

			removePrevClone(hideElement);

			if (!cloneElementClass) {
				generateStyleClass();
			}

			styleElement = element.cloneNode(false);
			styleElementStyle = styleElement.style;

			styleElement.addEventListener('load', function(){
				var curSrc = styleElement.currentSrc || styleElement.src;

				if(curSrc && curSrc != blankSrc){
					styleElement.src = blankSrc;
					styleElement.srcset = '';
				}
			});

			lazySizes.rC(styleElement, lazysizesCfg.loadedClass);
			lazySizes.rC(styleElement, lazysizesCfg.lazyClass);
			lazySizes.rC(styleElement, lazysizesCfg.autosizesClass);
			lazySizes.aC(styleElement, lazysizesCfg.loadingClass);
			lazySizes.aC(styleElement, cloneElementClass);

			['data-parent-fit', 'data-parent-container', 'data-object-fit-polyfilled',
				lazysizesCfg.srcsetAttr, lazysizesCfg.srcAttr].forEach(function(attr) {
				styleElement.removeAttribute(attr);
			});

			styleElement.src = blankSrc;
			styleElement.srcset = '';

			styleElementStyle.backgroundRepeat = 'no-repeat';
			styleElementStyle.backgroundPosition = config.position;
			styleElementStyle.backgroundSize = config.fit;

			styleElement.setAttribute('data-position', hideElement.style.position);
			styleElement.setAttribute('data-visibility', hideElement.style.visibility);

			hideElement.style.visibility = 'hidden';
			hideElement.style.position = 'absolute';

			element.setAttribute('data-parent-fit', config.fit);
			element.setAttribute('data-parent-container', 'prev');
			element.setAttribute('data-object-fit-polyfilled', '');
			element._objectFitPolyfilledDisplay = styleElement;

			container.insertBefore(styleElement, hideElement);

			if(element._lazysizesParentFit){
				delete element._lazysizesParentFit;
			}

			if(element.complete){
				onChange();
			}
		});
	}

	if(!fitSupport || !positionSupport){
		var onRead = function(e){
			if(e.detail.instance != lazySizes){return;}

			var element = e.target;
			var obj = getObject(element);

			if(obj.fit && (!fitSupport || (obj.position != 'center'))){
				initFix(element, obj);
				return true;
			}

			return false;
		};

		window.addEventListener('lazybeforesizes', function(e) {
			if(e.detail.instance != lazySizes){return;}
			var element = e.target;

			if (element.getAttribute('data-object-fit-polyfilled') != null && !element._objectFitPolyfilledDisplay) {
				if(!onRead(e)){
					lazySizes.rAF(function () {
						element.removeAttribute('data-object-fit-polyfilled');
					});
				}
			}
		});
		window.addEventListener('lazyunveilread', onRead, true);

		if(initialEvent && initialEvent.detail){
			onRead(initialEvent);
		}
	}
}));
}(ls_objectFit));

var ls_parentFit = {exports: {}};

(function (module) {
(function(window, factory) {
	if(!window) {return;}
	var globalInstall = function(){
		factory(window.lazySizes);
		window.removeEventListener('lazyunveilread', globalInstall, true);
	};

	factory = factory.bind(null, window, window.document);

	if(module.exports){
		factory(lazysizes.exports);
	} else if(window.lazySizes) {
		globalInstall();
	} else {
		window.addEventListener('lazyunveilread', globalInstall, true);
	}
}(typeof window != 'undefined' ?
	window : 0, function(window, document, lazySizes) {

	if(!window.addEventListener){return;}

	var regDescriptors = /\s+(\d+)(w|h)\s+(\d+)(w|h)/;
	var regCssFit = /parent-fit["']*\s*:\s*["']*(contain|cover|width)/;
	var regCssObject = /parent-container["']*\s*:\s*["']*(.+?)(?=(\s|$|,|'|"|;))/;
	var regPicture = /^picture$/i;
	var cfg = lazySizes.cfg;

	var getCSS = function (elem){
		return (getComputedStyle(elem, null) || {});
	};

	var parentFit = {

		getParent: function(element, parentSel){
			var parent = element;
			var parentNode = element.parentNode;

			if((!parentSel || parentSel == 'prev') && parentNode && regPicture.test(parentNode.nodeName || '')){
				parentNode = parentNode.parentNode;
			}

			if(parentSel != 'self'){
				if(parentSel == 'prev'){
					parent = element.previousElementSibling;
				} else if(parentSel && (parentNode.closest || window.jQuery)){
					parent = (parentNode.closest ?
							parentNode.closest(parentSel) :
							jQuery(parentNode).closest(parentSel)[0]) ||
						parentNode
					;
				} else {
					parent = parentNode;
				}
			}

			return parent;
		},

		getFit: function(element){
			var tmpMatch, parentObj;
			var css = getCSS(element);
			var content = css.content || css.fontFamily;
			var obj = {
				fit: element._lazysizesParentFit || element.getAttribute('data-parent-fit')
			};

			if(!obj.fit && content && (tmpMatch = content.match(regCssFit))){
				obj.fit = tmpMatch[1];
			}

			if(obj.fit){
				parentObj = element._lazysizesParentContainer || element.getAttribute('data-parent-container');

				if(!parentObj && content && (tmpMatch = content.match(regCssObject))){
					parentObj = tmpMatch[1];
				}

				obj.parent = parentFit.getParent(element, parentObj);


			} else {
				obj.fit = css.objectFit;
			}

			return obj;
		},

		getImageRatio: function(element){
			var i, srcset, media, ratio, match, width, height;
			var parent = element.parentNode;
			var elements = parent && regPicture.test(parent.nodeName || '') ?
					parent.querySelectorAll('source, img') :
					[element]
				;

			for(i = 0; i < elements.length; i++){
				element = elements[i];
				srcset = element.getAttribute(cfg.srcsetAttr) || element.getAttribute('srcset') || element.getAttribute('data-pfsrcset') || element.getAttribute('data-risrcset') || '';
				media = element._lsMedia || element.getAttribute('media');
				media = cfg.customMedia[element.getAttribute('data-media') || media] || media;

				if(srcset && (!media || (window.matchMedia && matchMedia(media) || {}).matches )){
					ratio = parseFloat(element.getAttribute('data-aspectratio'));

					if (!ratio) {
						match = srcset.match(regDescriptors);

						if (match) {
							if(match[2] == 'w'){
								width = match[1];
								height = match[3];
							} else {
								width = match[3];
								height = match[1];
							}
						} else {
							width = element.getAttribute('width');
							height = element.getAttribute('height');
						}

						ratio = width / height;
					}

					break;
				}
			}

			return ratio;
		},

		calculateSize: function(element, width){
			var displayRatio, height, imageRatio, retWidth;
			var fitObj = this.getFit(element);
			var fit = fitObj.fit;
			var fitElem = fitObj.parent;

			if(fit != 'width' && ((fit != 'contain' && fit != 'cover') || !(imageRatio = this.getImageRatio(element)))){
				return width;
			}

			if(fitElem){
				width = fitElem.clientWidth;
			} else {
				fitElem = element;
			}

			retWidth = width;

			if(fit == 'width'){
				retWidth = width;
			} else {
				height = fitElem.clientHeight;

				if((displayRatio =  width / height) && ((fit == 'cover' && displayRatio < imageRatio) || (fit == 'contain' && displayRatio > imageRatio))){
					retWidth = width * (imageRatio / displayRatio);
				}
			}

			return retWidth;
		}
	};

	lazySizes.parentFit = parentFit;

	document.addEventListener('lazybeforesizes', function(e){
		if(e.defaultPrevented || e.detail.instance != lazySizes){return;}

		var element = e.target;
		e.detail.width = parentFit.calculateSize(element, e.detail.width);
	});
}));
}(ls_parentFit));

var ls_rias = {exports: {}};

(function (module) {
(function(window, factory) {
	var globalInstall = function(){
		factory(window.lazySizes);
		window.removeEventListener('lazyunveilread', globalInstall, true);
	};

	factory = factory.bind(null, window, window.document);

	if(module.exports){
		factory(lazysizes.exports);
	} else if(window.lazySizes) {
		globalInstall();
	} else {
		window.addEventListener('lazyunveilread', globalInstall, true);
	}
}(window, function(window, document, lazySizes) {

	var config, riasCfg;
	var lazySizesCfg = lazySizes.cfg;
	var replaceTypes = {string: 1, number: 1};
	var regNumber = /^\-*\+*\d+\.*\d*$/;
	var regPicture = /^picture$/i;
	var regWidth = /\s*\{\s*width\s*\}\s*/i;
	var regHeight = /\s*\{\s*height\s*\}\s*/i;
	var regPlaceholder = /\s*\{\s*([a-z0-9]+)\s*\}\s*/ig;
	var regObj = /^\[.*\]|\{.*\}$/;
	var regAllowedSizes = /^(?:auto|\d+(px)?)$/;
	var anchor = document.createElement('a');
	var img = document.createElement('img');
	var buggySizes = ('srcset' in img) && !('sizes' in img);
	var supportPicture = !!window.HTMLPictureElement && !buggySizes;

	(function(){
		var prop;
		var noop = function(){};
		var riasDefaults = {
			prefix: '',
			postfix: '',
			srcAttr: 'data-src',
			absUrl: false,
			modifyOptions: noop,
			widthmap: {},
			ratio: false,
			traditionalRatio: false,
			aspectratio: false,
		};

		config = lazySizes && lazySizes.cfg;

		if(!config.supportsType){
			config.supportsType = function(type/*, elem*/){
				return !type;
			};
		}

		if(!config.rias){
			config.rias = {};
		}
		riasCfg = config.rias;

		if(!('widths' in riasCfg)){
			riasCfg.widths = [];
			(function (widths){
				var width;
				var i = 0;
				while(!width || width < 3000){
					i += 5;
					if(i > 30){
						i += 1;
					}
					width = (36 * i);
					widths.push(width);
				}
			})(riasCfg.widths);
		}

		for(prop in riasDefaults){
			if(!(prop in riasCfg)){
				riasCfg[prop] = riasDefaults[prop];
			}
		}
	})();

	function getElementOptions(elem, src, options){
		var attr, parent, setOption, prop, opts;
		var elemStyles = window.getComputedStyle(elem);

		if (!options) {
			parent = elem.parentNode;

			options = {
				isPicture: !!(parent && regPicture.test(parent.nodeName || ''))
			};
		} else {
			opts = {};

			for (prop in options) {
				opts[prop] = options[prop];
			}

			options = opts;
		}

		setOption = function(attr, run){
			var attrVal = elem.getAttribute('data-'+ attr);

			if (!attrVal) {
				// no data- attr, get value from the CSS
				var styles = elemStyles.getPropertyValue('--ls-' + attr);
				// at least Safari 9 returns null rather than
				// an empty string for getPropertyValue causing
				// .trim() to fail
				if (styles) {
					attrVal = styles.trim();
				}
			}

			if (attrVal) {
				if(attrVal == 'true'){
					attrVal = true;
				} else if(attrVal == 'false'){
					attrVal = false;
				} else if(regNumber.test(attrVal)){
					attrVal = parseFloat(attrVal);
				} else if(typeof riasCfg[attr] == 'function'){
					attrVal = riasCfg[attr](elem, attrVal);
				} else if(regObj.test(attrVal)){
					try {
						attrVal = JSON.parse(attrVal);
					} catch(e){}
				}
				options[attr] = attrVal;
			} else if((attr in riasCfg) && typeof riasCfg[attr] != 'function' && !options[attr]){
				options[attr] = riasCfg[attr];
			} else if(run && typeof riasCfg[attr] == 'function'){
				options[attr] = riasCfg[attr](elem, attrVal);
			}
		};

		for(attr in riasCfg){
			setOption(attr);
		}
		src.replace(regPlaceholder, function(full, match){
			if(!(match in options)){
				setOption(match, true);
			}
		});

		return options;
	}

	function replaceUrlProps(url, options){
		var candidates = [];
		var replaceFn = function(full, match){
			return (replaceTypes[typeof options[match]]) ? options[match] : full;
		};
		candidates.srcset = [];

		if(options.absUrl){
			anchor.setAttribute('href', url);
			url = anchor.href;
		}

		url = ((options.prefix || '') + url + (options.postfix || '')).replace(regPlaceholder, replaceFn);

		options.widths.forEach(function(width){
			var widthAlias = options.widthmap[width] || width;
			var ratio = options.aspectratio || options.ratio;
			var traditionalRatio = !options.aspectratio && riasCfg.traditionalRatio;
			var candidate = {
				u: url.replace(regWidth, widthAlias)
						.replace(regHeight, ratio ?
							traditionalRatio ?
								Math.round(width * ratio) :
								Math.round(width / ratio)
							: ''),
				w: width
			};

			candidates.push(candidate);
			candidates.srcset.push( (candidate.c = candidate.u + ' ' + width + 'w') );
		});
		return candidates;
	}

	function setSrc(src, opts, elem){
		var elemW = 0;
		var elemH = 0;
		var sizeElement = elem;

		if(!src){return;}

		if (opts.ratio === 'container') {
			// calculate image or parent ratio
			elemW = sizeElement.scrollWidth;
			elemH = sizeElement.scrollHeight;

			while ((!elemW || !elemH) && sizeElement !== document) {
				sizeElement = sizeElement.parentNode;
				elemW = sizeElement.scrollWidth;
				elemH = sizeElement.scrollHeight;
			}
			if (elemW && elemH) {
				opts.ratio = opts.traditionalRatio ? elemH / elemW : elemW / elemH;
			}
		}

		src = replaceUrlProps(src, opts);

		src.isPicture = opts.isPicture;

		if(buggySizes && elem.nodeName.toUpperCase() == 'IMG'){
			elem.removeAttribute(config.srcsetAttr);
		} else {
			elem.setAttribute(config.srcsetAttr, src.srcset.join(', '));
		}

		Object.defineProperty(elem, '_lazyrias', {
			value: src,
			writable: true
		});
	}

	function createAttrObject(elem, src){
		var opts = getElementOptions(elem, src);

		riasCfg.modifyOptions.call(elem, {target: elem, details: opts, detail: opts});

		lazySizes.fire(elem, 'lazyriasmodifyoptions', opts);
		return opts;
	}

	function getSrc(elem){
		return elem.getAttribute( elem.getAttribute('data-srcattr') || riasCfg.srcAttr ) || elem.getAttribute(config.srcsetAttr) || elem.getAttribute(config.srcAttr) || elem.getAttribute('data-pfsrcset') || '';
	}

	addEventListener('lazybeforesizes', function(e){
		if(e.detail.instance != lazySizes){return;}

		var elem, src, elemOpts, sourceOpts, parent, sources, i, len, sourceSrc, sizes, detail, hasPlaceholder, modified, emptyList;
		elem = e.target;

		if(!e.detail.dataAttr || e.defaultPrevented || riasCfg.disabled || !((sizes = elem.getAttribute(config.sizesAttr) || elem.getAttribute('sizes')) && regAllowedSizes.test(sizes))){return;}

		src = getSrc(elem);

		elemOpts = createAttrObject(elem, src);

		hasPlaceholder = regWidth.test(elemOpts.prefix) || regWidth.test(elemOpts.postfix);

		if(elemOpts.isPicture && (parent = elem.parentNode)){
			sources = parent.getElementsByTagName('source');
			for(i = 0, len = sources.length; i < len; i++){
				if ( hasPlaceholder || regWidth.test(sourceSrc = getSrc(sources[i])) ){
					sourceOpts = getElementOptions(sources[i], sourceSrc, elemOpts);
					setSrc(sourceSrc, sourceOpts, sources[i]);
					modified = true;
				}
			}
		}

		if ( hasPlaceholder || regWidth.test(src) ){
			setSrc(src, elemOpts, elem);
			modified = true;
		} else if (modified) {
			emptyList = [];
			emptyList.srcset = [];
			emptyList.isPicture = true;
			Object.defineProperty(elem, '_lazyrias', {
				value: emptyList,
				writable: true
			});
		}

		if(modified){
			if(supportPicture){
				elem.removeAttribute(config.srcAttr);
			} else if(sizes != 'auto') {
				detail = {
					width: parseInt(sizes, 10)
				};
				polyfill({
					target: elem,
					detail: detail
				});
			}
		}
	}, true);
	// partial polyfill
	var polyfill = (function(){
		var ascendingSort = function( a, b ) {
			return a.w - b.w;
		};

		var reduceCandidate = function (srces) {
			var lowerCandidate, bonusFactor;
			var len = srces.length;
			var candidate = srces[len -1];
			var i = 0;

			for(i; i < len;i++){
				candidate = srces[i];
				candidate.d = candidate.w / srces.w;
				if(candidate.d >= srces.d){
					if(!candidate.cached && (lowerCandidate = srces[i - 1]) &&
						lowerCandidate.d > srces.d - (0.13 * Math.pow(srces.d, 2.2))){

						bonusFactor = Math.pow(lowerCandidate.d - 0.6, 1.6);

						if(lowerCandidate.cached) {
							lowerCandidate.d += 0.15 * bonusFactor;
						}

						if(lowerCandidate.d + ((candidate.d - srces.d) * bonusFactor) > srces.d){
							candidate = lowerCandidate;
						}
					}
					break;
				}
			}
			return candidate;
		};

		var getWSet = function(elem, testPicture){
			var src;
			if(!elem._lazyrias && lazySizes.pWS && (src = lazySizes.pWS(elem.getAttribute(config.srcsetAttr || ''))).length){
				Object.defineProperty(elem, '_lazyrias', {
					value: src,
					writable: true
				});
				if(testPicture && elem.parentNode){
					src.isPicture = elem.parentNode.nodeName.toUpperCase() == 'PICTURE';
				}
			}
			return elem._lazyrias;
		};

		var getX = function(elem){
			var dpr = window.devicePixelRatio || 1;
			var optimum = lazySizes.getX && lazySizes.getX(elem);
			return Math.min(optimum || dpr, 2.4, dpr);
		};

		var getCandidate = function(elem, width){
			var sources, i, len, media, srces, src;

			srces = elem._lazyrias;

			if(srces.isPicture && window.matchMedia){
				for(i = 0, sources = elem.parentNode.getElementsByTagName('source'), len = sources.length; i < len; i++){
					if(getWSet(sources[i]) && !sources[i].getAttribute('type') && ( !(media = sources[i].getAttribute('media')) || ((matchMedia(media) || {}).matches))){
						srces = sources[i]._lazyrias;
						break;
					}
				}
			}

			if(!srces.w || srces.w < width){
				srces.w = width;
				srces.d = getX(elem);
				src = reduceCandidate(srces.sort(ascendingSort));
			}

			return src;
		};

		var polyfill = function(e){
			if(e.detail.instance != lazySizes){return;}

			var candidate;
			var elem = e.target;

			if(!buggySizes && (window.respimage || window.picturefill || lazySizesCfg.pf)){
				document.removeEventListener('lazybeforesizes', polyfill);
				return;
			}

			if(!('_lazyrias' in elem) && (!e.detail.dataAttr || !getWSet(elem, true))){
				return;
			}

			candidate = getCandidate(elem, e.detail.width);

			if(candidate && candidate.u && elem._lazyrias.cur != candidate.u){
				elem._lazyrias.cur = candidate.u;
				candidate.cached = true;
				lazySizes.rAF(function(){
					elem.setAttribute(config.srcAttr, candidate.u);
					elem.setAttribute('src', candidate.u);
				});
			}
		};

		if(!supportPicture){
			addEventListener('lazybeforesizes', polyfill);
		} else {
			polyfill = function(){};
		}

		return polyfill;

	})();

}));
}(ls_rias));

var ls_bgset = {exports: {}};

(function (module) {
(function(window, factory) {
	var globalInstall = function(){
		factory(window.lazySizes);
		window.removeEventListener('lazyunveilread', globalInstall, true);
	};

	factory = factory.bind(null, window, window.document);

	if(module.exports){
		factory(lazysizes.exports);
	} else if(window.lazySizes) {
		globalInstall();
	} else {
		window.addEventListener('lazyunveilread', globalInstall, true);
	}
}(window, function(window, document, lazySizes) {
	if(!window.addEventListener){return;}

	var lazySizesCfg = lazySizes.cfg;
	var regWhite = /\s+/g;
	var regSplitSet = /\s*\|\s+|\s+\|\s*/g;
	var regSource = /^(.+?)(?:\s+\[\s*(.+?)\s*\])(?:\s+\[\s*(.+?)\s*\])?$/;
	var regType = /^\s*\(*\s*type\s*:\s*(.+?)\s*\)*\s*$/;
	var regBgUrlEscape = /\(|\)|'/;
	var allowedBackgroundSize = {contain: 1, cover: 1};
	var proxyWidth = function(elem){
		var width = lazySizes.gW(elem, elem.parentNode);

		if(!elem._lazysizesWidth || width > elem._lazysizesWidth){
			elem._lazysizesWidth = width;
		}
		return elem._lazysizesWidth;
	};
	var getBgSize = function(elem){
		var bgSize;

		bgSize = (getComputedStyle(elem) || {getPropertyValue: function(){}}).getPropertyValue('background-size');

		if(!allowedBackgroundSize[bgSize] && allowedBackgroundSize[elem.style.backgroundSize]){
			bgSize = elem.style.backgroundSize;
		}

		return bgSize;
	};
	var setTypeOrMedia = function(source, match){
		if(match){
			var typeMatch = match.match(regType);
			if(typeMatch && typeMatch[1]){
				source.setAttribute('type', typeMatch[1]);
			} else {
				source.setAttribute('media', lazySizesCfg.customMedia[match] || match);
			}
		}
	};
	var createPicture = function(sets, elem, img){
		var picture = document.createElement('picture');
		var sizes = elem.getAttribute(lazySizesCfg.sizesAttr);
		var ratio = elem.getAttribute('data-ratio');
		var optimumx = elem.getAttribute('data-optimumx');

		if(elem._lazybgset && elem._lazybgset.parentNode == elem){
			elem.removeChild(elem._lazybgset);
		}

		Object.defineProperty(img, '_lazybgset', {
			value: elem,
			writable: true
		});
		Object.defineProperty(elem, '_lazybgset', {
			value: picture,
			writable: true
		});

		sets = sets.replace(regWhite, ' ').split(regSplitSet);

		picture.style.display = 'none';
		img.className = lazySizesCfg.lazyClass;

		if(sets.length == 1 && !sizes){
			sizes = 'auto';
		}

		sets.forEach(function(set){
			var match;
			var source = document.createElement('source');

			if(sizes && sizes != 'auto'){
				source.setAttribute('sizes', sizes);
			}

			if((match = set.match(regSource))){
				source.setAttribute(lazySizesCfg.srcsetAttr, match[1]);

				setTypeOrMedia(source, match[2]);
				setTypeOrMedia(source, match[3]);
			} else {
				source.setAttribute(lazySizesCfg.srcsetAttr, set);
			}

			picture.appendChild(source);
		});

		if(sizes){
			img.setAttribute(lazySizesCfg.sizesAttr, sizes);
			elem.removeAttribute(lazySizesCfg.sizesAttr);
			elem.removeAttribute('sizes');
		}
		if(optimumx){
			img.setAttribute('data-optimumx', optimumx);
		}
		if(ratio) {
			img.setAttribute('data-ratio', ratio);
		}

		picture.appendChild(img);

		elem.appendChild(picture);
	};

	var proxyLoad = function(e){
		if(!e.target._lazybgset){return;}

		var image = e.target;
		var elem = image._lazybgset;
		var bg = image.currentSrc || image.src;


		if(bg){
			var useSrc = regBgUrlEscape.test(bg) ? JSON.stringify(bg) : bg;
			var event = lazySizes.fire(elem, 'bgsetproxy', {
				src: bg,
				useSrc: useSrc,
				fullSrc: null,
			});

			if(!event.defaultPrevented){
				elem.style.backgroundImage = event.detail.fullSrc || 'url(' + event.detail.useSrc + ')';
			}
		}

		if(image._lazybgsetLoading){
			lazySizes.fire(elem, '_lazyloaded', {}, false, true);
			delete image._lazybgsetLoading;
		}
	};

	addEventListener('lazybeforeunveil', function(e){
		var set, image, elem;

		if(e.defaultPrevented || !(set = e.target.getAttribute('data-bgset'))){return;}

		elem = e.target;
		image = document.createElement('img');

		image.alt = '';

		image._lazybgsetLoading = true;
		e.detail.firesLoad = true;

		createPicture(set, elem, image);

		setTimeout(function(){
			lazySizes.loader.unveil(image);

			lazySizes.rAF(function(){
				lazySizes.fire(image, '_lazyloaded', {}, true, true);
				if(image.complete) {
					proxyLoad({target: image});
				}
			});
		});

	});

	document.addEventListener('load', proxyLoad, true);

	window.addEventListener('lazybeforesizes', function(e){
		if(e.detail.instance != lazySizes){return;}
		if(e.target._lazybgset && e.detail.dataAttr){
			var elem = e.target._lazybgset;
			var bgSize = getBgSize(elem);

			if(allowedBackgroundSize[bgSize]){
				e.target._lazysizesParentFit = bgSize;

				lazySizes.rAF(function(){
					e.target.setAttribute('data-parent-fit', bgSize);
					if(e.target._lazysizesParentFit){
						delete e.target._lazysizesParentFit;
					}
				});
			}
		}
	}, true);

	document.documentElement.addEventListener('lazybeforesizes', function(e){
		if(e.defaultPrevented || !e.target._lazybgset || e.detail.instance != lazySizes){return;}
		e.detail.width = proxyWidth(e.target._lazybgset);
	});
}));
}(ls_bgset));

var ls_respimg = {exports: {}};

(function (module) {
(function(window, factory) {
	if(!window) {return;}
	var globalInstall = function(){
		factory(window.lazySizes);
		window.removeEventListener('lazyunveilread', globalInstall, true);
	};

	factory = factory.bind(null, window, window.document);

	if(module.exports){
		factory(lazysizes.exports);
	} else if(window.lazySizes) {
		globalInstall();
	} else {
		window.addEventListener('lazyunveilread', globalInstall, true);
	}
}(typeof window != 'undefined' ?
	window : 0, function(window, document, lazySizes) {
	var polyfill;
	var lazySizesCfg = lazySizes.cfg;
	var img = document.createElement('img');
	var supportSrcset = ('sizes' in img) && ('srcset' in img);
	var regHDesc = /\s+\d+h/g;
	var fixEdgeHDescriptor = (function(){
		var regDescriptors = /\s+(\d+)(w|h)\s+(\d+)(w|h)/;
		var forEach = Array.prototype.forEach;

		return function(){
			var img = document.createElement('img');
			var removeHDescriptors = function(source){
				var ratio, match;
				var srcset = source.getAttribute(lazySizesCfg.srcsetAttr);
				if(srcset){
					if((match = srcset.match(regDescriptors))){
						if(match[2] == 'w'){
							ratio = match[1] / match[3];
						} else {
							ratio = match[3] / match[1];
						}

						if(ratio){
							source.setAttribute('data-aspectratio', ratio);
						}
						source.setAttribute(lazySizesCfg.srcsetAttr, srcset.replace(regHDesc, ''));
					}
				}
			};
			var handler = function(e){
				if(e.detail.instance != lazySizes){return;}
				var picture = e.target.parentNode;

				if(picture && picture.nodeName == 'PICTURE'){
					forEach.call(picture.getElementsByTagName('source'), removeHDescriptors);
				}
				removeHDescriptors(e.target);
			};

			var test = function(){
				if(!!img.currentSrc){
					document.removeEventListener('lazybeforeunveil', handler);
				}
			};

			document.addEventListener('lazybeforeunveil', handler);

			img.onload = test;
			img.onerror = test;

			img.srcset = 'data:,a 1w 1h';

			if(img.complete){
				test();
			}
		};
	})();

	if(!lazySizesCfg.supportsType){
		lazySizesCfg.supportsType = function(type/*, elem*/){
			return !type;
		};
	}

	if (window.HTMLPictureElement && supportSrcset) {
		if(!lazySizes.hasHDescriptorFix && document.msElementsFromPoint){
			lazySizes.hasHDescriptorFix = true;
			fixEdgeHDescriptor();
		}
		return;
	}

	if(window.picturefill || lazySizesCfg.pf){return;}

	lazySizesCfg.pf = function(options){
		var i, len;
		if(window.picturefill){return;}
		for(i = 0, len = options.elements.length; i < len; i++){
			polyfill(options.elements[i]);
		}
	};

	// partial polyfill
	polyfill = (function(){
		var ascendingSort = function( a, b ) {
			return a.w - b.w;
		};
		var regPxLength = /^\s*\d+\.*\d*px\s*$/;
		var reduceCandidate = function (srces) {
			var lowerCandidate, bonusFactor;
			var len = srces.length;
			var candidate = srces[len -1];
			var i = 0;

			for(i; i < len;i++){
				candidate = srces[i];
				candidate.d = candidate.w / srces.w;

				if(candidate.d >= srces.d){
					if(!candidate.cached && (lowerCandidate = srces[i - 1]) &&
						lowerCandidate.d > srces.d - (0.13 * Math.pow(srces.d, 2.2))){

						bonusFactor = Math.pow(lowerCandidate.d - 0.6, 1.6);

						if(lowerCandidate.cached) {
							lowerCandidate.d += 0.15 * bonusFactor;
						}

						if(lowerCandidate.d + ((candidate.d - srces.d) * bonusFactor) > srces.d){
							candidate = lowerCandidate;
						}
					}
					break;
				}
			}
			return candidate;
		};

		var parseWsrcset = (function(){
			var candidates;
			var regWCandidates = /(([^,\s].[^\s]+)\s+(\d+)w)/g;
			var regMultiple = /\s/;
			var addCandidate = function(match, candidate, url, wDescriptor){
				candidates.push({
					c: candidate,
					u: url,
					w: wDescriptor * 1
				});
			};

			return function(input){
				candidates = [];
				input = input.trim();
				input
					.replace(regHDesc, '')
					.replace(regWCandidates, addCandidate)
				;

				if(!candidates.length && input && !regMultiple.test(input)){
					candidates.push({
						c: input,
						u: input,
						w: 99
					});
				}

				return candidates;
			};
		})();

		var runMatchMedia = function(){
			if(runMatchMedia.init){return;}

			runMatchMedia.init = true;
			addEventListener('resize', (function(){
				var timer;
				var matchMediaElems = document.getElementsByClassName('lazymatchmedia');
				var run = function(){
					var i, len;
					for(i = 0, len = matchMediaElems.length; i < len; i++){
						polyfill(matchMediaElems[i]);
					}
				};

				return function(){
					clearTimeout(timer);
					timer = setTimeout(run, 66);
				};
			})());
		};

		var createSrcset = function(elem, isImage){
			var parsedSet;
			var srcSet = elem.getAttribute('srcset') || elem.getAttribute(lazySizesCfg.srcsetAttr);

			if(!srcSet && isImage){
				srcSet = !elem._lazypolyfill ?
					(elem.getAttribute(lazySizesCfg.srcAttr) || elem.getAttribute('src')) :
					elem._lazypolyfill._set
				;
			}

			if(!elem._lazypolyfill || elem._lazypolyfill._set != srcSet){

				parsedSet = parseWsrcset( srcSet || '' );
				if(isImage && elem.parentNode){
					parsedSet.isPicture = elem.parentNode.nodeName.toUpperCase() == 'PICTURE';

					if(parsedSet.isPicture){
						if(window.matchMedia){
							lazySizes.aC(elem, 'lazymatchmedia');
							runMatchMedia();
						}
					}
				}

				parsedSet._set = srcSet;
				Object.defineProperty(elem, '_lazypolyfill', {
					value: parsedSet,
					writable: true
				});
			}
		};

		var getX = function(elem){
			var dpr = window.devicePixelRatio || 1;
			var optimum = lazySizes.getX && lazySizes.getX(elem);
			return Math.min(optimum || dpr, 2.5, dpr);
		};

		var matchesMedia = function(media){
			if(window.matchMedia){
				matchesMedia = function(media){
					return !media || (matchMedia(media) || {}).matches;
				};
			} else {
				return !media;
			}

			return matchesMedia(media);
		};

		var getCandidate = function(elem){
			var sources, i, len, source, srces, src, width;

			source = elem;
			createSrcset(source, true);
			srces = source._lazypolyfill;

			if(srces.isPicture){
				for(i = 0, sources = elem.parentNode.getElementsByTagName('source'), len = sources.length; i < len; i++){
					if( lazySizesCfg.supportsType(sources[i].getAttribute('type'), elem) && matchesMedia( sources[i].getAttribute('media')) ){
						source = sources[i];
						createSrcset(source);
						srces = source._lazypolyfill;
						break;
					}
				}
			}

			if(srces.length > 1){
				width = source.getAttribute('sizes') || '';
				width = regPxLength.test(width) && parseInt(width, 10) || lazySizes.gW(elem, elem.parentNode);
				srces.d = getX(elem);
				if(!srces.src || !srces.w || srces.w < width){
					srces.w = width;
					src = reduceCandidate(srces.sort(ascendingSort));
					srces.src = src;
				} else {
					src = srces.src;
				}
			} else {
				src = srces[0];
			}

			return src;
		};

		var p = function(elem){
			if(supportSrcset && elem.parentNode && elem.parentNode.nodeName.toUpperCase() != 'PICTURE'){return;}
			var candidate = getCandidate(elem);

			if(candidate && candidate.u && elem._lazypolyfill.cur != candidate.u){
				elem._lazypolyfill.cur = candidate.u;
				candidate.cached = true;
				elem.setAttribute(lazySizesCfg.srcAttr, candidate.u);
				elem.setAttribute('src', candidate.u);
			}
		};

		p.parse = parseWsrcset;

		return p;
	})();

	if(lazySizesCfg.loadedClass && lazySizesCfg.loadingClass){
		(function(){
			var sels = [];
			['img[sizes$="px"][srcset].', 'picture > img:not([srcset]).'].forEach(function(sel){
				sels.push(sel + lazySizesCfg.loadedClass);
				sels.push(sel + lazySizesCfg.loadingClass);
			});
			lazySizesCfg.pf({
				elements: document.querySelectorAll(sels.join(', '))
			});
		})();

	}
}));
}(ls_respimg));

var selectors$A = {
  form: '.selectors-form',
  disclosureList: '[data-disclosure-list]',
  disclosureToggle: '[data-disclosure-toggle]',
  disclosureInput: '[data-disclosure-input]',
  disclosureOptions: '[data-disclosure-option]'
};
var classes$5 = {
  listVisible: 'disclosure-list--visible'
};

function has(list, selector) {
  return list.map(l => l.contains(selector)).filter(Boolean);
}

var disclosure = (node, container) => {
  var form = container.querySelector(selectors$A.form);
  var disclosureList = node.querySelector(selectors$A.disclosureList);
  var disclosureToggle = node.querySelector(selectors$A.disclosureToggle);
  var disclosureInput = node.querySelector(selectors$A.disclosureInput);
  var disclosureOptions = node.querySelectorAll(selectors$A.disclosureOptions);
  disclosureOptions.forEach(option => option.addEventListener('click', submitForm));
  disclosureToggle.addEventListener('click', handleToggle);
  disclosureToggle.addEventListener('focusout', handleToggleFocusOut);
  disclosureList.addEventListener('focusout', handleListFocusOut);
  node.addEventListener('keyup', handleKeyup);
  document.addEventListener('click', handleBodyClick);

  function submitForm(evt) {
    evt.preventDefault();
    var {
      value
    } = evt.currentTarget.dataset;
    disclosureInput.value = value;
    form.submit();
  }

  function handleToggleFocusOut(evt) {
    var disclosureLostFocus = has([node], evt.relatedTarget).length === 0;

    if (disclosureLostFocus) {
      hideList();
    }
  }

  function handleListFocusOut(evt) {
    var childInFocus = has([node], evt.relatedTarget).length > 0;
    var isVisible = disclosureList.classList.contains(classes$5.listVisible);

    if (isVisible && !childInFocus) {
      hideList();
    }
  }

  function handleKeyup(evt) {
    if (evt.which !== 27) return;
    hideList();
    disclosureToggle.focus();
  }

  function handleToggle(evt) {
    disclosureList.classList.toggle(classes$5.listVisible);
    var ariaExpanded = disclosureList.classList.contains(classes$5.listVisible);
    evt.currentTarget.setAttribute('aria-expanded', ariaExpanded);

    if (ariaExpanded) {
      r$1('navitem:closeOthers');
    }
  }

  function handleBodyClick(evt) {
    var isOption = has([node], evt.target).length > 0;
    var isVisible = disclosureList.classList.contains(classes$5.listVisible);

    if (isVisible && !isOption) {
      hideList();
    }
  }

  function hideList() {
    disclosureToggle.setAttribute('aria-expanded', false);
    disclosureList.classList.remove(classes$5.listVisible);
  }

  var unload = () => {
    disclosureOptions.forEach(o => o.removeEventListener('click', submitForm));
    disclosureToggle.removeEventListener('click', handleToggle);
    disclosureToggle.removeEventListener('focusout', handleToggleFocusOut);
    disclosureList.removeEventListener('focusout', handleListFocusOut);
    node.removeEventListener('keyup', handleKeyup);
    document.removeEventListener('click', handleBodyClick);
  };

  return {
    unload,
    hideList
  };
};

var selectors$z = {
  disclosure: '[data-disclosure]'
};
register('footer', {
  crossBorder: {},

  onLoad() {
    // Wire up Cross Border disclosures
    var cbSelectors = this.container.querySelectorAll(selectors$z.disclosure);

    if (cbSelectors) {
      cbSelectors.forEach(selector => {
        var {
          disclosure: d
        } = selector.dataset;
        this.crossBorder[d] = disclosure(selector, this.container);
      });
    }
  },

  onUnload() {
    Object.keys(this.crossBorder).forEach(t => {
      this.crossBorder[t].unload();
    });
  }

});

var selectors$y = {
  activeItem: 'nav__item--active',
  activeMenu: 'nav__menu--active',
  navTrigger: '[data-navmenu-trigger]',
  subMenu: '[data-nav-submenu]',
  headerNav: '.header__nav',
  navLink: '.nav__link',
  linkParent: '.nav__link-parent',
  itemParent: '.nav__item-parent',
  navDepthOne: '.nav--depth-1',
  navDepthTwo: '.nav--depth-2',
  navDepthThree: '.nav--depth-3',
  quickSearchTrigger: '.quick-search__trigger',
  headerAcccountIcon: '.header__icon--account',
  logoTrigger: '.header__logo-image'
};

var navigation = node => {
  node.querySelector('.header');
  var headerNav = node.querySelector(selectors$y.headerNav);
  var navDepthOne = headerNav.querySelector(selectors$y.navDepthOne);
  var navDepthThree = headerNav.querySelectorAll(selectors$y.navDepthThree);
  var headerLinks = navDepthOne.querySelectorAll("".concat(selectors$y.navDepthOne, " > li:not(").concat(selectors$y.itemParent, ") > ").concat(selectors$y.navLink));
  var logoTrigger = node.querySelector(selectors$y.logoTrigger);
  var quickSearchTrigger = node.querySelector(selectors$y.quickSearchTrigger);
  var accountTrigger = node.querySelector("".concat(selectors$y.headerAcccountIcon, " > a"));
  var navMenuTrigger = node.querySelectorAll("".concat(selectors$y.navTrigger, " > ").concat(selectors$y.linkParent));
  var {
    navigationInteraction
  } = node.dataset;
  var mouseInteractionIsHover = navigationInteraction === 'mouseover';
  var events = [];

  var _addEvent = (element, action, func) => {
    element.addEventListener(action, func, true);
    events.push({
      element,
      action,
      func
    });
  };

  var _bindEvents = () => {
    _addEvent(document, 'click', _handleBodyClick);

    navMenuTrigger.forEach(trigger => {
      _addEvent(trigger, 'focusin', _handleFocusIn);

      _addEvent(trigger, navigationInteraction, _toggleMenu);

      if (!mouseInteractionIsHover) {
        _addEvent(trigger, 'click', _preventHandler);
      }
    });
    headerLinks.forEach(link => {
      _addEvent(link, 'focus', _hideOverlay);

      _addEvent(link, 'focus', closeAll);
    });

    if (logoTrigger) {
      _addEvent(logoTrigger, 'focus', closeAll);

      _addEvent(logoTrigger, 'focus', _hideOverlay);
    }

    if (quickSearchTrigger) {
      _addEvent(quickSearchTrigger, 'focus', closeAll);

      _addEvent(quickSearchTrigger, 'focus', _hideOverlay);
    }

    if (accountTrigger) {
      _addEvent(accountTrigger, 'focus', closeAll);

      _addEvent(accountTrigger, 'focus', _hideOverlay);
    } // Init scroll watcher


    _addEvent(navDepthOne, 'scroll', _handleScroll);
  }; // Close all nav drop downs if anything is clicked outside of menu


  var _handleBodyClick = event => {
    if (!u().headerOverlayOpen) return;

    if (event.target.matches('[data-navigation-dropdown-trigger], [data-navigation-dropdown-trigger] *')) {
      return;
    }

    if (!event.target.matches('[data-navigation-dropdown], [data-navigation-dropdown] *')) {
      _hideOverlay();

      closeAll();
    }
  };

  var _handleFocusIn = event => {
    event.preventDefault();

    if (document.body.classList.contains('user-is-tabbing')) {
      _toggleMenu(event);
    }
  };

  var _handleMouseleave = event => {
    closeAll();

    _hideOverlay();
  };

  var _toggleMenu = event => {
    event.preventDefault();
    var element = event.currentTarget.parentNode;
    var menu = element.querySelector(selectors$y.subMenu);

    if (menu.classList.contains('visible') && !mouseInteractionIsHover) {
      _closeMenu(element);
    } else {
      r$1('headerOverlay:show');

      _openMenu(element);
    }

    if (mouseInteractionIsHover && !menu.classList.contains('nav--depth-3')) {
      menu.addEventListener('mouseleave', _handleMouseleave, {
        once: true
      });
    }
  };

  var _preventHandler = e => {
    e.preventDefault();
  };

  var _hideOverlay = () => {
    r$1('headerOverlay:hide');
  };

  var _openMenu = target => {
    if (!target.parentNode.classList.contains('nav--depth-2')) {
      closeAll();
    } else {
      // Close all submenus
      target.parentNode.querySelectorAll(selectors$y.navTrigger).forEach(submenu => _closeMenu(submenu));
    }

    var menu = target.querySelector(selectors$y.subMenu);
    var menuLink = target.querySelector(selectors$y.navLink);
    menu.classList.add('visible');
    menuLink.classList.add(selectors$y.activeMenu);
    menuLink.setAttribute('aria-expanded', true);
  };

  var _closeMenu = target => {
    var menu = target.querySelector(selectors$y.subMenu);
    var menuLink = target.querySelector(selectors$y.navLink);

    if (!target.parentNode.classList.contains('nav--depth-2')) {
      _hideOverlay();
    }

    menu.classList.remove('visible');
    menuLink.classList.remove(selectors$y.activeMenu);
    menuLink.setAttribute('aria-expanded', false);
  };

  var closeAll = () => {
    node.classList.remove();
    var menuTriggers = node.querySelectorAll(selectors$y.navTrigger);
    menuTriggers.forEach(trigger => {
      var menu = trigger.querySelector(selectors$y.subMenu);
      var menuLink = trigger.querySelector(selectors$y.navLink);
      menu.classList.remove('visible');
      menuLink.classList.remove(selectors$y.activeMenu);
      menuLink.setAttribute('aria-expanded', false);
    });
  };

  var _handleScroll = () => {
    var scroll = navDepthOne.scrollLeft;
    var root = document.documentElement;
    root.style.setProperty('--navigation-scroll-offset', "".concat(scroll, "px"));
  }; // https://stackoverflow.com/a/9333474


  function absleft(el) {
    var x = 0;

    for (; el; el = el.offsetParent) {
      x += el.offsetLeft;
    }

    return x;
  }

  function overflows(el, opt_container) {
    var left = absleft(el);
    var right = left + el.offsetWidth;
    var cleft = absleft(opt_container);
    var cright = cleft + opt_container.offsetWidth;
    return left < cleft || right > cright;
  } // Depth 3 menus can overflow the document need to check and adjust


  var _handleSubmenuPageOverflow = menus => {
    menus.forEach(menu => {
      if (overflows(menu, document.body)) {
        menu.classList.add('overflows');
      }
    });
  };

  _bindEvents();

  _handleSubmenuPageOverflow(navDepthThree);

  var unload = () => {
    events.forEach(event => {
      event.element.removeEventListener(event.action, event.function);
    });
  };

  return {
    unload,
    closeAll
  };
};

function validateQuery(query) {
  var error;

  if (query === null || query === undefined) {
    error = new TypeError("'query' is missing");
    error.type = "argument";
    throw error;
  }

  if (typeof query !== "string") {
    error = new TypeError("'query' is not a string");
    error.type = "argument";
    throw error;
  }
}

function GenericError() {
  var error = Error.call(this);

  error.name = "Server error";
  error.message = "Something went wrong on the server";
  error.status = 500;

  return error;
}

function NotFoundError(status) {
  var error = Error.call(this);

  error.name = "Not found";
  error.message = "Not found";
  error.status = status;

  return error;
}

function ServerError() {
  var error = Error.call(this);

  error.name = "Server error";
  error.message = "Something went wrong on the server";
  error.status = 500;

  return error;
}

function ContentTypeError(status) {
  var error = Error.call(this);

  error.name = "Content-Type error";
  error.message = "Content-Type was not provided or is of wrong type";
  error.status = status;

  return error;
}

function JsonParseError(status) {
  var error = Error.call(this);

  error.name = "JSON parse error";
  error.message = "JSON syntax error";
  error.status = status;

  return error;
}

function ThrottledError(status, name, message, retryAfter) {
  var error = Error.call(this);

  error.name = name;
  error.message = message;
  error.status = status;
  error.retryAfter = retryAfter;

  return error;
}

function InvalidParameterError(status, name, message) {
  var error = Error.call(this);

  error.name = name;
  error.message = message;
  error.status = status;

  return error;
}

function ExpectationFailedError(status, name, message) {
  var error = Error.call(this);

  error.name = name;
  error.message = message;
  error.status = status;

  return error;
}

function request(searchPath, configParams, query, onSuccess, onError) {
  var xhr = new XMLHttpRequest();
  var route = searchPath + '/suggest.json';

  xhr.onreadystatechange = function () {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      var contentType = xhr.getResponseHeader("Content-Type");

      if (xhr.status >= 500) {
        onError(new ServerError());

        return;
      }

      if (xhr.status === 404) {
        onError(new NotFoundError(xhr.status));

        return;
      }

      if (
        typeof contentType !== "string" ||
        contentType.toLowerCase().match("application/json") === null
      ) {
        onError(new ContentTypeError(xhr.status));

        return;
      }

      if (xhr.status === 417) {
        try {
          var invalidParameterJson = JSON.parse(xhr.responseText);

          onError(
            new InvalidParameterError(
              xhr.status,
              invalidParameterJson.message,
              invalidParameterJson.description
            )
          );
        } catch (error) {
          onError(new JsonParseError(xhr.status));
        }

        return;
      }

      if (xhr.status === 422) {
        try {
          var expectationFailedJson = JSON.parse(xhr.responseText);

          onError(
            new ExpectationFailedError(
              xhr.status,
              expectationFailedJson.message,
              expectationFailedJson.description
            )
          );
        } catch (error) {
          onError(new JsonParseError(xhr.status));
        }

        return;
      }

      if (xhr.status === 429) {
        try {
          var throttledJson = JSON.parse(xhr.responseText);

          onError(
            new ThrottledError(
              xhr.status,
              throttledJson.message,
              throttledJson.description,
              xhr.getResponseHeader("Retry-After")
            )
          );
        } catch (error) {
          onError(new JsonParseError(xhr.status));
        }

        return;
      }

      if (xhr.status === 200) {
        try {
          var res = JSON.parse(xhr.responseText);
          res.query = query;
          onSuccess(res);
        } catch (error) {
          onError(new JsonParseError(xhr.status));
        }

        return;
      }

      try {
        var genericErrorJson = JSON.parse(xhr.responseText);
        onError(
          new GenericError(
            xhr.status,
            genericErrorJson.message,
            genericErrorJson.description
          )
        );
      } catch (error) {
        onError(new JsonParseError(xhr.status));
      }

      return;
    }
  };

  xhr.open(
    "get",
    route + "?q=" + encodeURIComponent(query) + "&" + configParams
  );

  xhr.setRequestHeader("Content-Type", "application/json");

  xhr.send();
}

function Cache(config) {
  this._store = {};
  this._keys = [];
  if (config && config.bucketSize) {
    this.bucketSize = config.bucketSize;
  } else {
    this.bucketSize = 20;
  }
}

Cache.prototype.set = function(key, value) {
  if (this.count() >= this.bucketSize) {
    var deleteKey = this._keys.splice(0, 1);
    this.delete(deleteKey);
  }

  this._keys.push(key);
  this._store[key] = value;

  return this._store;
};

Cache.prototype.get = function(key) {
  return this._store[key];
};

Cache.prototype.has = function(key) {
  return Boolean(this._store[key]);
};

Cache.prototype.count = function() {
  return Object.keys(this._store).length;
};

Cache.prototype.delete = function(key) {
  var exists = Boolean(this._store[key]);
  delete this._store[key];
  return exists && !this._store[key];
};

function Dispatcher() {
  this.events = {};
}

Dispatcher.prototype.on = function(eventName, callback) {
  var event = this.events[eventName];
  if (!event) {
    event = new DispatcherEvent(eventName);
    this.events[eventName] = event;
  }
  event.registerCallback(callback);
};

Dispatcher.prototype.off = function(eventName, callback) {
  var event = this.events[eventName];
  if (event && event.callbacks.indexOf(callback) > -1) {
    event.unregisterCallback(callback);
    if (event.callbacks.length === 0) {
      delete this.events[eventName];
    }
  }
};

Dispatcher.prototype.dispatch = function(eventName, payload) {
  var event = this.events[eventName];
  if (event) {
    event.fire(payload);
  }
};

function DispatcherEvent(eventName) {
  this.eventName = eventName;
  this.callbacks = [];
}

DispatcherEvent.prototype.registerCallback = function(callback) {
  this.callbacks.push(callback);
};

DispatcherEvent.prototype.unregisterCallback = function(callback) {
  var index = this.callbacks.indexOf(callback);
  if (index > -1) {
    this.callbacks.splice(index, 1);
  }
};

DispatcherEvent.prototype.fire = function(payload) {
  var callbacks = this.callbacks.slice(0);
  callbacks.forEach(function(callback) {
    callback(payload);
  });
};

function debounce$1(func, wait) {
  var timeout = null;
  return function() {
    var context = this;
    var args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(function() {
      timeout = null;
      func.apply(context, args);
    }, wait || 0);
  };
}

function objectToQueryParams(obj, parentKey) {
  var output = "";
  parentKey = parentKey || null;

  Object.keys(obj).forEach(function (key) {
    var outputKey = key + "=";
    if (parentKey) {
      outputKey = parentKey + "[" + key + "]";
    }

    switch (trueTypeOf(obj[key])) {
      case "object":
        output += objectToQueryParams(obj[key], parentKey ? outputKey : key);
        break;
      case "array":
        output += outputKey + "=" + obj[key].join(",") + "&";
        break;
      default:
        if (parentKey) {
          outputKey += "=";
        }
        output += outputKey + encodeURIComponent(obj[key]) + "&";
        break;
    }
  });

  return output;
}

function trueTypeOf(obj) {
  return Object.prototype.toString
    .call(obj)
    .slice(8, -1)
    .toLowerCase();
}

var DEBOUNCE_RATE = 10;
var requestDebounced = debounce$1(request, DEBOUNCE_RATE);

function PredictiveSearch$1(config) {
  if (!config) {
    throw new TypeError("No config object was specified");
  }

  var configParameters = config;

  this._retryAfter = null;
  this._currentQuery = null;

  this.dispatcher = new Dispatcher();
  this.cache = new Cache({ bucketSize: 40 });

  this.searchPath = configParameters.search_path || "/search";

  if(configParameters.search_path) {
    delete configParameters['search_path'];
  }

  this.configParams = objectToQueryParams(configParameters);
}

PredictiveSearch$1.SEARCH_PATH = "/search";

PredictiveSearch$1.TYPES = {
  PRODUCT: "product",
  PAGE: "page",
  ARTICLE: "article",
  COLLECTION: "collection"
};

PredictiveSearch$1.FIELDS = {
  AUTHOR: "author",
  BODY: "body",
  PRODUCT_TYPE: "product_type",
  TAG: "tag",
  TITLE: "title",
  VARIANTS_BARCODE: "variants.barcode",
  VARIANTS_SKU: "variants.sku",
  VARIANTS_TITLE: "variants.title",
  VENDOR: "vendor"
};

PredictiveSearch$1.UNAVAILABLE_PRODUCTS = {
  SHOW: "show",
  HIDE: "hide",
  LAST: "last"
};

PredictiveSearch$1.prototype.query = function query(query) {
  try {
    validateQuery(query);
  } catch (error) {
    this.dispatcher.dispatch("error", error);
    return;
  }

  if (query === "") {
    return this;
  }

  this._currentQuery = normalizeQuery(query);
  var cacheResult = this.cache.get(this._currentQuery);
  if (cacheResult) {
    this.dispatcher.dispatch("success", cacheResult);
    return this;
  }

  requestDebounced(
    this.searchPath,
    this.configParams,
    query,
    function(result) {
      this.cache.set(normalizeQuery(result.query), result);
      if (normalizeQuery(result.query) === this._currentQuery) {
        this._retryAfter = null;
        this.dispatcher.dispatch("success", result);
      }
    }.bind(this),
    function(error) {
      if (error.retryAfter) {
        this._retryAfter = error.retryAfter;
      }
      this.dispatcher.dispatch("error", error);
    }.bind(this)
  );

  return this;
};

PredictiveSearch$1.prototype.on = function on(eventName, callback) {
  this.dispatcher.on(eventName, callback);

  return this;
};

PredictiveSearch$1.prototype.off = function on(eventName, callback) {
  this.dispatcher.off(eventName, callback);

  return this;
};

function normalizeQuery(query) {
  if (typeof query !== "string") {
    return null;
  }

  return query
    .trim()
    .replace(" ", "-")
    .toLowerCase();
}

/**
 * Image Helper Functions
 * -----------------------------------------------------------------------------
 * https://github.com/Shopify/slate.git.
 *
 */

/**
 * Adds a Shopify size attribute to a URL
 *
 * @param src
 * @param size
 * @returns {*}
 */
function getSizedImageUrl(src, size) {
  if (size === null) {
    return src;
  }

  if (size === 'master') {
    return removeProtocol(src);
  }

  const match = src.match(/\.(jpg|jpeg|gif|png|bmp|bitmap|tiff|tif)(\?v=\d+)?$/i);

  if (match) {
    const prefix = src.split(match[0]);
    const suffix = match[0];

    return removeProtocol(`${prefix[0]}_${size}${suffix}`);
  } else {
    return null;
  }
}

function removeProtocol(path) {
  return path.replace(/http(s)?:/, '');
}

var stringStripHtml_umd = {exports: {}};

/**
 * string-strip-html
 * Strips HTML tags from strings. No parser, accepts mixed sources.
 * Version: 4.5.1
 * Author: Roy Revelt, Codsen Ltd
 * License: MIT
 * Homepage: https://gitlab.com/codsen/codsen/tree/master/packages/string-strip-html
 */

(function (module, exports) {
!function(r,e){module.exports=e();}(commonjsGlobal$1,(function(){function r(e){return (r="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(r){return typeof r}:function(r){return r&&"function"==typeof Symbol&&r.constructor===Symbol&&r!==Symbol.prototype?"symbol":typeof r})(e)}function e(r,e){for(var t=0;t<e.length;t++){var n=e[t];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(r,n.key,n);}}function t(r,e,t){return e in r?Object.defineProperty(r,e,{value:t,enumerable:!0,configurable:!0,writable:!0}):r[e]=t,r}function n(r,e){var t=Object.keys(r);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(r);e&&(n=n.filter((function(e){return Object.getOwnPropertyDescriptor(r,e).enumerable}))),t.push.apply(t,n);}return t}function a(r){for(var e=1;e<arguments.length;e++){var a=null!=arguments[e]?arguments[e]:{};e%2?n(Object(a),!0).forEach((function(e){t(r,e,a[e]);})):Object.getOwnPropertyDescriptors?Object.defineProperties(r,Object.getOwnPropertyDescriptors(a)):n(Object(a)).forEach((function(e){Object.defineProperty(r,e,Object.getOwnPropertyDescriptor(a,e));}));}return r}function o(r){return function(r){if(Array.isArray(r))return i(r)}(r)||function(r){if("undefined"!=typeof Symbol&&Symbol.iterator in Object(r))return Array.from(r)}(r)||function(r,e){if(!r)return;if("string"==typeof r)return i(r,e);var t=Object.prototype.toString.call(r).slice(8,-1);"Object"===t&&r.constructor&&(t=r.constructor.name);if("Map"===t||"Set"===t)return Array.from(r);if("Arguments"===t||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t))return i(r,e)}(r)||function(){throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function i(r,e){(null==e||e>r.length)&&(e=r.length);for(var t=0,n=new Array(e);t<e;t++)n[t]=r[t];return n}function s(r,e){if(!Array.isArray(r)||!r.length)return r;var t,n,o=a(a({},{strictlyTwoElementsInRangeArrays:!1,progressFn:null}),e);if(o.strictlyTwoElementsInRangeArrays&&!r.every((function(r,e){return 2===r.length||(t=e,n=r.length,!1)})))throw new TypeError("ranges-sort: [THROW_ID_03] The first argument should be an array and must consist of arrays which are natural number indexes representing TWO string index ranges. However, ".concat(t,"th range (").concat(JSON.stringify(r[t],null,4),") has not two but ").concat(n," elements!"));if(!r.every((function(r,e){return !(!Number.isInteger(r[0])||r[0]<0||!Number.isInteger(r[1])||r[1]<0)||(t=e,!1)})))throw new TypeError("ranges-sort: [THROW_ID_04] The first argument should be an array and must consist of arrays which are natural number indexes representing string index ranges. However, ".concat(t,"th range (").concat(JSON.stringify(r[t],null,4),") does not consist of only natural numbers!"));var i=r.length*r.length,s=0;return Array.from(r).sort((function(r,e){return o.progressFn&&(s+=1,o.progressFn(Math.floor(100*s/i))),r[0]===e[0]?r[1]<e[1]?-1:r[1]>e[1]?1:0:r[0]<e[0]?-1:1}))}function c(e,t){function n(r){return "string"==typeof r}function i(e){return e&&"object"===r(e)&&!Array.isArray(e)}if(!Array.isArray(e)||!e.length)return e;var c,l={mergeType:1,progressFn:null,joinRangesThatTouchEdges:!0};if(t){if(!i(t))throw new Error("emlint: [THROW_ID_03] the second input argument must be a plain object. It was given as:\n".concat(JSON.stringify(t,null,4)," (type ").concat(r(t),")"));if((c=a(a({},l),t)).progressFn&&i(c.progressFn)&&!Object.keys(c.progressFn).length)c.progressFn=null;else if(c.progressFn&&"function"!=typeof c.progressFn)throw new Error('ranges-merge: [THROW_ID_01] opts.progressFn must be a function! It was given of a type: "'.concat(r(c.progressFn),'", equal to ').concat(JSON.stringify(c.progressFn,null,4)));if(c.mergeType&&1!==c.mergeType&&2!==c.mergeType)if(n(c.mergeType)&&"1"===c.mergeType.trim())c.mergeType=1;else {if(!n(c.mergeType)||"2"!==c.mergeType.trim())throw new Error('ranges-merge: [THROW_ID_02] opts.mergeType was customised to a wrong thing! It was given of a type: "'.concat(r(c.mergeType),'", equal to ').concat(JSON.stringify(c.mergeType,null,4)));c.mergeType=2;}if("boolean"!=typeof c.joinRangesThatTouchEdges)throw new Error('ranges-merge: [THROW_ID_04] opts.joinRangesThatTouchEdges was customised to a wrong thing! It was given of a type: "'.concat(r(c.joinRangesThatTouchEdges),'", equal to ').concat(JSON.stringify(c.joinRangesThatTouchEdges,null,4)))}else c=a({},l);for(var u,p,f,g=e.map((function(r){return o(r)})).filter((function(r){return void 0!==r[2]||r[0]!==r[1]})),d=(u=c.progressFn?s(g,{progressFn:function(r){(f=Math.floor(r/5))!==p&&(p=f,c.progressFn(f));}}):s(g)).length-1,h=d;h>0;h--)c.progressFn&&(f=Math.floor(78*(1-h/d))+21)!==p&&f>p&&(p=f,c.progressFn(f)),(u[h][0]<=u[h-1][0]||!c.joinRangesThatTouchEdges&&u[h][0]<u[h-1][1]||c.joinRangesThatTouchEdges&&u[h][0]<=u[h-1][1])&&(u[h-1][0]=Math.min(u[h][0],u[h-1][0]),u[h-1][1]=Math.max(u[h][1],u[h-1][1]),void 0!==u[h][2]&&(u[h-1][0]>=u[h][0]||u[h-1][1]<=u[h][1])&&null!==u[h-1][2]&&(null===u[h][2]&&null!==u[h-1][2]?u[h-1][2]=null:void 0!==u[h-1][2]?2===c.mergeType&&u[h-1][0]===u[h][0]?u[h-1][2]=u[h][2]:u[h-1][2]+=u[h][2]:u[h-1][2]=u[h][2]),u.splice(h,1),h=u.length);return u}function l(r){return null!=r}function u(r){return "string"==typeof r}function p(e,t,n){var a,o=0,i=0;if(0===arguments.length)throw new Error("ranges-apply: [THROW_ID_01] inputs missing!");if(!u(e))throw new TypeError("ranges-apply: [THROW_ID_02] first input argument must be a string! Currently it's: ".concat(r(e),", equal to: ").concat(JSON.stringify(e,null,4)));if(null===t)return e;if(!Array.isArray(t))throw new TypeError("ranges-apply: [THROW_ID_03] second input argument must be an array (or null)! Currently it's: ".concat(r(t),", equal to: ").concat(JSON.stringify(t,null,4)));if(n&&"function"!=typeof n)throw new TypeError("ranges-apply: [THROW_ID_04] the third input argument must be a function (or falsey)! Currently it's: ".concat(r(n),", equal to: ").concat(JSON.stringify(n,null,4)));var s=(a=Array.isArray(t)&&(Number.isInteger(t[0])&&t[0]>=0||/^\d*$/.test(t[0]))&&(Number.isInteger(t[1])&&t[1]>=0||/^\d*$/.test(t[1]))?[Array.from(t)]:Array.from(t)).length,p=0;a.forEach((function(e,t){if(n&&(o=Math.floor(p/s*10))!==i&&(i=o,n(o)),!Array.isArray(e))throw new TypeError("ranges-apply: [THROW_ID_05] ranges array, second input arg., has ".concat(t,"th element not an array: ").concat(JSON.stringify(e,null,4),", which is ").concat(r(e)));if(!Number.isInteger(e[0])||e[0]<0){if(!/^\d*$/.test(e[0]))throw new TypeError("ranges-apply: [THROW_ID_06] ranges array, second input arg. has ".concat(t,"th element, array [").concat(e[0],",").concat(e[1],"]. That array has first element not an integer, but ").concat(r(e[0]),", equal to: ").concat(JSON.stringify(e[0],null,4),". Computer doesn't like this."));a[t][0]=Number.parseInt(a[t][0],10);}if(!Number.isInteger(e[1])){if(!/^\d*$/.test(e[1]))throw new TypeError("ranges-apply: [THROW_ID_07] ranges array, second input arg. has ".concat(t,"th element, array [").concat(e[0],",").concat(e[1],"]. That array has second element not an integer, but ").concat(r(e[1]),", equal to: ").concat(JSON.stringify(e[1],null,4),". Computer doesn't like this."));a[t][1]=Number.parseInt(a[t][1],10);}p+=1;}));var f=c(a,{progressFn:function(r){n&&(o=10+Math.floor(r/10))!==i&&(i=o,n(o));}}),g=f.length;if(g>0){var d=e.slice(f[g-1][1]);e=f.reduce((function(r,t,a,s){n&&(o=20+Math.floor(a/g*80))!==i&&(i=o,n(o));var c=0===a?0:s[a-1][1],u=s[a][0];return r+e.slice(c,u)+(l(s[a][2])?s[a][2]:"")}),""),e+=d;}return e}function f(r){var e=!(arguments.length>1&&void 0!==arguments[1])||arguments[1],t=arguments.length>2?arguments[2]:void 0;if(!(t.trim()||r.length&&"\n"!==t&&" "!==t&&" "===(e?r[r.length-1]:r[0])||r.length&&"\n"===(e?r[r.length-1]:r[0])&&"\n"!==t&&" "!==t))if(e){if(("\n"===t||" "===t)&&r.length&&" "===r[r.length-1])for(;r.length&&" "===r[r.length-1];)r.pop();r.push(" "===t||"\n"===t?t:" ");}else {if(("\n"===t||" "===t)&&r.length&&" "===r[0])for(;r.length&&" "===r[0];)r.shift();r.unshift(" "===t||"\n"===t?t:" ");}}function g(r,e){if("string"==typeof r&&r.length){var t,n,a=!1;if(r.includes("\r\n")&&(a=!0),t=e&&"number"==typeof e?e:1,""===r.trim()){var o=[];for(n=t,Array.from(r).forEach((function(r){("\n"!==r||n)&&("\n"===r&&(n-=1),f(o,!0,r));}));o.length>1&&" "===o[o.length-1];)o.pop();return o.join("")}var i=[];if(n=t,""===r[0].trim())for(var s=0,c=r.length;s<c&&!r[s].trim();s++)("\n"!==r[s]||n)&&("\n"===r[s]&&(n-=1),f(i,!0,r[s]));var l=[];if(n=t,""===r.slice(-1).trim())for(var u=r.length;u--&&!r[u].trim();)("\n"!==r[u]||n)&&("\n"===r[u]&&(n-=1),f(l,!1,r[u]));return a?"".concat(i.join("")).concat(r.trim()).concat(l.join("")).replace(/\n/g,"\r\n"):i.join("")+r.trim()+l.join("")}return r}function d(r){return null!=r}function h(r){return Number.isInteger(r)&&r>=0}function m(r){return "string"==typeof r}function b(r){return /^\d*$/.test(r)?parseInt(r,10):r}var y=function(){function t(e){!function(r,e){if(!(r instanceof e))throw new TypeError("Cannot call a class as a function")}(this,t);var n=a(a({},{limitToBeAddedWhitespace:!1,limitLinebreaksCount:1,mergeType:1}),e);if(n.mergeType&&1!==n.mergeType&&2!==n.mergeType)if(m(n.mergeType)&&"1"===n.mergeType.trim())n.mergeType=1;else {if(!m(n.mergeType)||"2"!==n.mergeType.trim())throw new Error('ranges-push: [THROW_ID_02] opts.mergeType was customised to a wrong thing! It was given of a type: "'.concat(r(n.mergeType),'", equal to ').concat(JSON.stringify(n.mergeType,null,4)));n.mergeType=2;}this.opts=n;}var n,i;return n=t,(i=[{key:"add",value:function(e,t,n){for(var a=this,i=arguments.length,s=new Array(i>3?i-3:0),c=3;c<i;c++)s[c-3]=arguments[c];if(s.length>0)throw new TypeError("ranges-push/Ranges/add(): [THROW_ID_03] Please don't overload the add() method. From the 4th input argument onwards we see these redundant arguments: ".concat(JSON.stringify(s,null,4)));if(d(e)||d(t)){if(d(e)&&!d(t)){if(Array.isArray(e)){if(e.length){if(e.some((function(r){return Array.isArray(r)})))return void e.forEach((function(r){Array.isArray(r)&&a.add.apply(a,o(r));}));e.length>1&&h(b(e[0]))&&h(b(e[1]))&&this.add.apply(this,o(e));}return}throw new TypeError('ranges-push/Ranges/add(): [THROW_ID_12] the first input argument, "from" is set ('.concat(JSON.stringify(e,null,0),') but second-one, "to" is not (').concat(JSON.stringify(t,null,0),")"))}if(!d(e)&&d(t))throw new TypeError('ranges-push/Ranges/add(): [THROW_ID_13] the second input argument, "to" is set ('.concat(JSON.stringify(t,null,0),') but first-one, "from" is not (').concat(JSON.stringify(e,null,0),")"));var l=/^\d*$/.test(e)?parseInt(e,10):e,u=/^\d*$/.test(t)?parseInt(t,10):t;if(h(n)&&(n=String(n)),!h(l)||!h(u))throw h(l)&&l>=0?new TypeError('ranges-push/Ranges/add(): [THROW_ID_10] "to" value, the second input argument, must be a natural number or zero! Currently it\'s of a type "'.concat(r(u),'" equal to: ').concat(JSON.stringify(u,null,4))):new TypeError('ranges-push/Ranges/add(): [THROW_ID_09] "from" value, the first input argument, must be a natural number or zero! Currently it\'s of a type "'.concat(r(l),'" equal to: ').concat(JSON.stringify(l,null,4)));if(d(n)&&!m(n)&&!h(n))throw new TypeError("ranges-push/Ranges/add(): [THROW_ID_08] The third argument, the value to add, was given not as string but ".concat(r(n),", equal to:\n").concat(JSON.stringify(n,null,4)));if(d(this.slices)&&Array.isArray(this.last())&&l===this.last()[1]){if(this.last()[1]=u,this.last()[2],null!==this.last()[2]&&d(n)){var p=!(d(this.last()[2])&&this.last()[2].length>0)||this.opts&&this.opts.mergeType&&1!==this.opts.mergeType?n:this.last()[2]+n;this.opts.limitToBeAddedWhitespace&&(p=g(p,this.opts.limitLinebreaksCount)),m(p)&&!p.length||(this.last()[2]=p);}}else {this.slices||(this.slices=[]);var f=void 0===n||m(n)&&!n.length?[l,u]:[l,u,this.opts.limitToBeAddedWhitespace?g(n,this.opts.limitLinebreaksCount):n];this.slices.push(f);}}}},{key:"push",value:function(r,e,t){for(var n=arguments.length,a=new Array(n>3?n-3:0),o=3;o<n;o++)a[o-3]=arguments[o];this.add.apply(this,[r,e,t].concat(a));}},{key:"current",value:function(){var r=this;return null!=this.slices?(this.slices=c(this.slices,{mergeType:this.opts.mergeType}),this.opts.limitToBeAddedWhitespace?this.slices.map((function(e){return d(e[2])?[e[0],e[1],g(e[2],r.opts.limitLinebreaksCount)]:e})):this.slices):null}},{key:"wipe",value:function(){this.slices=void 0;}},{key:"replace",value:function(r){if(Array.isArray(r)&&r.length){if(!Array.isArray(r[0])||!h(r[0][0]))throw new Error("ranges-push/Ranges/replace(): [THROW_ID_11] Single range was given but we expected array of arrays! The first element, ".concat(JSON.stringify(r[0],null,4)," should be an array and its first element should be an integer, a string index."));this.slices=Array.from(r);}else this.slices=void 0;}},{key:"last",value:function(){return void 0!==this.slices&&Array.isArray(this.slices)?this.slices[this.slices.length-1]:null}}])&&e(n.prototype,i),t}();var v,w,q=Function.prototype,A=Object.prototype,T=q.toString,E=A.hasOwnProperty,k=T.call(Object),O=A.toString,S=(v=Object.getPrototypeOf,w=Object,function(r){return v(w(r))});var _=function(e){if(!function(e){return !!e&&"object"==r(e)}(e)||"[object Object]"!=O.call(e)||function(r){var e=!1;if(null!=r&&"function"!=typeof r.toString)try{e=!!(r+"");}catch(r){}return e}(e))return !1;var t=S(e);if(null===t)return !0;var n=E.call(t,"constructor")&&t.constructor;return "function"==typeof n&&n instanceof n&&T.call(n)==k},x="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof window?window:"undefined"!=typeof commonjsGlobal$1?commonjsGlobal$1:"undefined"!=typeof self?self:{};function D(r){return r&&r.default||r}var L=/^\s+|\s+$/g,j="[\\ud800-\\udfff]",R="[\\u0300-\\u036f\\ufe20-\\ufe23\\u20d0-\\u20f0]",N="\\ud83c[\\udffb-\\udfff]",C="[^\\ud800-\\udfff]",I="(?:\\ud83c[\\udde6-\\uddff]){2}",B="[\\ud800-\\udbff][\\udc00-\\udfff]",H="(?:"+R+"|"+N+")"+"?",U="[\\ufe0e\\ufe0f]?"+H+("(?:\\u200d(?:"+[C,I,B].join("|")+")[\\ufe0e\\ufe0f]?"+H+")*"),V="(?:"+[C+R+"?",R,I,B,j].join("|")+")",P=RegExp(N+"(?="+N+")|"+V+U,"g"),W=RegExp("[\\u200d\\ud800-\\udfff\\u0300-\\u036f\\ufe20-\\ufe23\\u20d0-\\u20f0\\ufe0e\\ufe0f]"),F="object"==r(x)&&x&&x.Object===Object&&x,G="object"==("undefined"==typeof self?"undefined":r(self))&&self&&self.Object===Object&&self,z=F||G||Function("return this")();function J(r,e,t){if(e!=e)return function(r,e,t,n){for(var a=r.length,o=t+(n?1:-1);n?o--:++o<a;)if(e(r[o],o,r))return o;return -1}(r,M,t);for(var n=t-1,a=r.length;++n<a;)if(r[n]===e)return n;return -1}function M(r){return r!=r}function $(r){return function(r){return W.test(r)}(r)?function(r){return r.match(P)||[]}(r):function(r){return r.split("")}(r)}var Y=Object.prototype.toString,Z=z.Symbol,K=Z?Z.prototype:void 0,Q=K?K.toString:void 0;function X(e){if("string"==typeof e)return e;if(function(e){return "symbol"==r(e)||function(e){return !!e&&"object"==r(e)}(e)&&"[object Symbol]"==Y.call(e)}(e))return Q?Q.call(e):"";var t=e+"";return "0"==t&&1/e==-1/0?"-0":t}function rr(r,e,t){var n=r.length;return t=void 0===t?n:t,!e&&t>=n?r:function(r,e,t){var n=-1,a=r.length;e<0&&(e=-e>a?0:a+e),(t=t>a?a:t)<0&&(t+=a),a=e>t?0:t-e>>>0,e>>>=0;for(var o=Array(a);++n<a;)o[n]=r[n+e];return o}(r,e,t)}var er=function(r,e,t){var n;if((r=null==(n=r)?"":X(n))&&(t||void 0===e))return r.replace(L,"");if(!r||!(e=X(e)))return r;var a=$(r),o=$(e);return rr(a,function(r,e){for(var t=-1,n=r.length;++t<n&&J(e,r[t],0)>-1;);return t}(a,o),function(r,e){for(var t=r.length;t--&&J(e,r[t],0)>-1;);return t}(a,o)+1).join("")},tr=/^\[object .+?Constructor\]$/,nr="object"==r(x)&&x&&x.Object===Object&&x,ar="object"==("undefined"==typeof self?"undefined":r(self))&&self&&self.Object===Object&&self,or=nr||ar||Function("return this")();function ir(r,e,t){switch(t.length){case 0:return r.call(e);case 1:return r.call(e,t[0]);case 2:return r.call(e,t[0],t[1]);case 3:return r.call(e,t[0],t[1],t[2])}return r.apply(e,t)}function sr(r,e){return !!(r?r.length:0)&&function(r,e,t){if(e!=e)return function(r,e,t,n){var a=r.length,o=t+(n?1:-1);for(;n?o--:++o<a;)if(e(r[o],o,r))return o;return -1}(r,lr,t);var n=t-1,a=r.length;for(;++n<a;)if(r[n]===e)return n;return -1}(r,e,0)>-1}function cr(r,e,t){for(var n=-1,a=r?r.length:0;++n<a;)if(t(e,r[n]))return !0;return !1}function lr(r){return r!=r}function ur(r,e){return r.has(e)}var pr,fr=Array.prototype,gr=Function.prototype,dr=Object.prototype,hr=or["__core-js_shared__"],mr=(pr=/[^.]+$/.exec(hr&&hr.keys&&hr.keys.IE_PROTO||""))?"Symbol(src)_1."+pr:"",br=gr.toString,yr=dr.hasOwnProperty,vr=dr.toString,wr=RegExp("^"+br.call(yr).replace(/[\\^$.*+?()[\]{}|]/g,"\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g,"$1.*?")+"$"),qr=fr.splice,Ar=Math.max,Tr=Rr(or,"Map"),Er=Rr(Object,"create");function kr(r){var e=-1,t=r?r.length:0;for(this.clear();++e<t;){var n=r[e];this.set(n[0],n[1]);}}function Or(r){var e=-1,t=r?r.length:0;for(this.clear();++e<t;){var n=r[e];this.set(n[0],n[1]);}}function Sr(r){var e=-1,t=r?r.length:0;for(this.clear();++e<t;){var n=r[e];this.set(n[0],n[1]);}}function _r(r){var e=-1,t=r?r.length:0;for(this.__data__=new Sr;++e<t;)this.add(r[e]);}function xr(r,e){for(var t,n,a=r.length;a--;)if((t=r[a][0])===(n=e)||t!=t&&n!=n)return a;return -1}function Dr(r,e,t,n){var a=-1,o=sr,i=!0,s=r.length,c=[],l=e.length;if(!s)return c;t&&(e=function(r,e){for(var t=-1,n=r?r.length:0,a=Array(n);++t<n;)a[t]=e(r[t],t,r);return a}(e,function(r){return function(e){return r(e)}}(t))),n?(o=cr,i=!1):e.length>=200&&(o=ur,i=!1,e=new _r(e));r:for(;++a<s;){var u=r[a],p=t?t(u):u;if(u=n||0!==u?u:0,i&&p==p){for(var f=l;f--;)if(e[f]===p)continue r;c.push(u);}else o(e,p,n)||c.push(u);}return c}function Lr(r){return !(!Cr(r)||function(r){return !!mr&&mr in r}(r))&&(Nr(r)||function(r){var e=!1;if(null!=r&&"function"!=typeof r.toString)try{e=!!(r+"");}catch(r){}return e}(r)?wr:tr).test(function(r){if(null!=r){try{return br.call(r)}catch(r){}try{return r+""}catch(r){}}return ""}(r))}function jr(e,t){var n,a,o=e.__data__;return ("string"==(a=r(n=t))||"number"==a||"symbol"==a||"boolean"==a?"__proto__"!==n:null===n)?o["string"==typeof t?"string":"hash"]:o.map}function Rr(r,e){var t=function(r,e){return null==r?void 0:r[e]}(r,e);return Lr(t)?t:void 0}function Nr(r){var e=Cr(r)?vr.call(r):"";return "[object Function]"==e||"[object GeneratorFunction]"==e}function Cr(e){var t=r(e);return !!e&&("object"==t||"function"==t)}kr.prototype.clear=function(){this.__data__=Er?Er(null):{};},kr.prototype.delete=function(r){return this.has(r)&&delete this.__data__[r]},kr.prototype.get=function(r){var e=this.__data__;if(Er){var t=e[r];return "__lodash_hash_undefined__"===t?void 0:t}return yr.call(e,r)?e[r]:void 0},kr.prototype.has=function(r){var e=this.__data__;return Er?void 0!==e[r]:yr.call(e,r)},kr.prototype.set=function(r,e){return this.__data__[r]=Er&&void 0===e?"__lodash_hash_undefined__":e,this},Or.prototype.clear=function(){this.__data__=[];},Or.prototype.delete=function(r){var e=this.__data__,t=xr(e,r);return !(t<0)&&(t==e.length-1?e.pop():qr.call(e,t,1),!0)},Or.prototype.get=function(r){var e=this.__data__,t=xr(e,r);return t<0?void 0:e[t][1]},Or.prototype.has=function(r){return xr(this.__data__,r)>-1},Or.prototype.set=function(r,e){var t=this.__data__,n=xr(t,r);return n<0?t.push([r,e]):t[n][1]=e,this},Sr.prototype.clear=function(){this.__data__={hash:new kr,map:new(Tr||Or),string:new kr};},Sr.prototype.delete=function(r){return jr(this,r).delete(r)},Sr.prototype.get=function(r){return jr(this,r).get(r)},Sr.prototype.has=function(r){return jr(this,r).has(r)},Sr.prototype.set=function(r,e){return jr(this,r).set(r,e),this},_r.prototype.add=_r.prototype.push=function(r){return this.__data__.set(r,"__lodash_hash_undefined__"),this},_r.prototype.has=function(r){return this.__data__.has(r)};var Ir=function(r,e){return e=Ar(void 0===e?r.length-1:e,0),function(){for(var t=arguments,n=-1,a=Ar(t.length-e,0),o=Array(a);++n<a;)o[n]=t[e+n];n=-1;for(var i=Array(e+1);++n<e;)i[n]=t[n];return i[e]=o,ir(r,this,i)}}((function(e,t){return function(e){return !!e&&"object"==r(e)}(n=e)&&function(r){return null!=r&&function(r){return "number"==typeof r&&r>-1&&r%1==0&&r<=9007199254740991}(r.length)&&!Nr(r)}(n)?Dr(e,t):[];var n;})),Br=2147483647,Hr=/^xn--/,Ur=/[^\x20-\x7E]/,Vr=/[\x2E\u3002\uFF0E\uFF61]/g,Pr={overflow:"Overflow: input needs wider integers to process","not-basic":"Illegal input >= 0x80 (not a basic code point)","invalid-input":"Invalid input"},Wr=Math.floor,Fr=String.fromCharCode;
/*! https://mths.be/punycode v1.4.1 by @mathias */function Gr(r){throw new RangeError(Pr[r])}function zr(r,e){for(var t=r.length,n=[];t--;)n[t]=e(r[t]);return n}function Jr(r,e){var t=r.split("@"),n="";return t.length>1&&(n=t[0]+"@",r=t[1]),n+zr((r=r.replace(Vr,".")).split("."),e).join(".")}function Mr(r){for(var e,t,n=[],a=0,o=r.length;a<o;)(e=r.charCodeAt(a++))>=55296&&e<=56319&&a<o?56320==(64512&(t=r.charCodeAt(a++)))?n.push(((1023&e)<<10)+(1023&t)+65536):(n.push(e),a--):n.push(e);return n}function $r(r){return zr(r,(function(r){var e="";return r>65535&&(e+=Fr((r-=65536)>>>10&1023|55296),r=56320|1023&r),e+=Fr(r)})).join("")}function Yr(r,e){return r+22+75*(r<26)-((0!=e)<<5)}function Zr(r,e,t){var n=0;for(r=t?Wr(r/700):r>>1,r+=Wr(r/e);r>455;n+=36)r=Wr(r/35);return Wr(n+36*r/(r+38))}function Kr(r){var e,t,n,a,o,i,s,c,l,u,p,f=[],g=r.length,d=0,h=128,m=72;for((t=r.lastIndexOf("-"))<0&&(t=0),n=0;n<t;++n)r.charCodeAt(n)>=128&&Gr("not-basic"),f.push(r.charCodeAt(n));for(a=t>0?t+1:0;a<g;){for(o=d,i=1,s=36;a>=g&&Gr("invalid-input"),((c=(p=r.charCodeAt(a++))-48<10?p-22:p-65<26?p-65:p-97<26?p-97:36)>=36||c>Wr((Br-d)/i))&&Gr("overflow"),d+=c*i,!(c<(l=s<=m?1:s>=m+26?26:s-m));s+=36)i>Wr(Br/(u=36-l))&&Gr("overflow"),i*=u;m=Zr(d-o,e=f.length+1,0==o),Wr(d/e)>Br-h&&Gr("overflow"),h+=Wr(d/e),d%=e,f.splice(d++,0,h);}return $r(f)}function Qr(r){var e,t,n,a,o,i,s,c,l,u,p,f,g,d,h,m=[];for(f=(r=Mr(r)).length,e=128,t=0,o=72,i=0;i<f;++i)(p=r[i])<128&&m.push(Fr(p));for(n=a=m.length,a&&m.push("-");n<f;){for(s=Br,i=0;i<f;++i)(p=r[i])>=e&&p<s&&(s=p);for(s-e>Wr((Br-t)/(g=n+1))&&Gr("overflow"),t+=(s-e)*g,e=s,i=0;i<f;++i)if((p=r[i])<e&&++t>Br&&Gr("overflow"),p==e){for(c=t,l=36;!(c<(u=l<=o?1:l>=o+26?26:l-o));l+=36)h=c-u,d=36-u,m.push(Fr(Yr(u+h%d,0))),c=Wr(h/d);m.push(Fr(Yr(c,0))),o=Zr(t,g,n==a),t=0,++n;}++t,++e;}return m.join("")}var Xr={version:"1.4.1",ucs2:{decode:Mr,encode:$r},toASCII:function(r){return Jr(r,(function(r){return Ur.test(r)?"xn--"+Qr(r):r}))},toUnicode:function(r){return Jr(r,(function(r){return Hr.test(r)?Kr(r.slice(4).toLowerCase()):r}))},encode:Qr,decode:Kr},re=D(Object.freeze({__proto__:null,default:{9:"Tab;",10:"NewLine;",33:"excl;",34:"quot;",35:"num;",36:"dollar;",37:"percnt;",38:"amp;",39:"apos;",40:"lpar;",41:"rpar;",42:"midast;",43:"plus;",44:"comma;",46:"period;",47:"sol;",58:"colon;",59:"semi;",60:"lt;",61:"equals;",62:"gt;",63:"quest;",64:"commat;",91:"lsqb;",92:"bsol;",93:"rsqb;",94:"Hat;",95:"UnderBar;",96:"grave;",123:"lcub;",124:"VerticalLine;",125:"rcub;",160:"NonBreakingSpace;",161:"iexcl;",162:"cent;",163:"pound;",164:"curren;",165:"yen;",166:"brvbar;",167:"sect;",168:"uml;",169:"copy;",170:"ordf;",171:"laquo;",172:"not;",173:"shy;",174:"reg;",175:"strns;",176:"deg;",177:"pm;",178:"sup2;",179:"sup3;",180:"DiacriticalAcute;",181:"micro;",182:"para;",183:"middot;",184:"Cedilla;",185:"sup1;",186:"ordm;",187:"raquo;",188:"frac14;",189:"half;",190:"frac34;",191:"iquest;",192:"Agrave;",193:"Aacute;",194:"Acirc;",195:"Atilde;",196:"Auml;",197:"Aring;",198:"AElig;",199:"Ccedil;",200:"Egrave;",201:"Eacute;",202:"Ecirc;",203:"Euml;",204:"Igrave;",205:"Iacute;",206:"Icirc;",207:"Iuml;",208:"ETH;",209:"Ntilde;",210:"Ograve;",211:"Oacute;",212:"Ocirc;",213:"Otilde;",214:"Ouml;",215:"times;",216:"Oslash;",217:"Ugrave;",218:"Uacute;",219:"Ucirc;",220:"Uuml;",221:"Yacute;",222:"THORN;",223:"szlig;",224:"agrave;",225:"aacute;",226:"acirc;",227:"atilde;",228:"auml;",229:"aring;",230:"aelig;",231:"ccedil;",232:"egrave;",233:"eacute;",234:"ecirc;",235:"euml;",236:"igrave;",237:"iacute;",238:"icirc;",239:"iuml;",240:"eth;",241:"ntilde;",242:"ograve;",243:"oacute;",244:"ocirc;",245:"otilde;",246:"ouml;",247:"divide;",248:"oslash;",249:"ugrave;",250:"uacute;",251:"ucirc;",252:"uuml;",253:"yacute;",254:"thorn;",255:"yuml;",256:"Amacr;",257:"amacr;",258:"Abreve;",259:"abreve;",260:"Aogon;",261:"aogon;",262:"Cacute;",263:"cacute;",264:"Ccirc;",265:"ccirc;",266:"Cdot;",267:"cdot;",268:"Ccaron;",269:"ccaron;",270:"Dcaron;",271:"dcaron;",272:"Dstrok;",273:"dstrok;",274:"Emacr;",275:"emacr;",278:"Edot;",279:"edot;",280:"Eogon;",281:"eogon;",282:"Ecaron;",283:"ecaron;",284:"Gcirc;",285:"gcirc;",286:"Gbreve;",287:"gbreve;",288:"Gdot;",289:"gdot;",290:"Gcedil;",292:"Hcirc;",293:"hcirc;",294:"Hstrok;",295:"hstrok;",296:"Itilde;",297:"itilde;",298:"Imacr;",299:"imacr;",302:"Iogon;",303:"iogon;",304:"Idot;",305:"inodot;",306:"IJlig;",307:"ijlig;",308:"Jcirc;",309:"jcirc;",310:"Kcedil;",311:"kcedil;",312:"kgreen;",313:"Lacute;",314:"lacute;",315:"Lcedil;",316:"lcedil;",317:"Lcaron;",318:"lcaron;",319:"Lmidot;",320:"lmidot;",321:"Lstrok;",322:"lstrok;",323:"Nacute;",324:"nacute;",325:"Ncedil;",326:"ncedil;",327:"Ncaron;",328:"ncaron;",329:"napos;",330:"ENG;",331:"eng;",332:"Omacr;",333:"omacr;",336:"Odblac;",337:"odblac;",338:"OElig;",339:"oelig;",340:"Racute;",341:"racute;",342:"Rcedil;",343:"rcedil;",344:"Rcaron;",345:"rcaron;",346:"Sacute;",347:"sacute;",348:"Scirc;",349:"scirc;",350:"Scedil;",351:"scedil;",352:"Scaron;",353:"scaron;",354:"Tcedil;",355:"tcedil;",356:"Tcaron;",357:"tcaron;",358:"Tstrok;",359:"tstrok;",360:"Utilde;",361:"utilde;",362:"Umacr;",363:"umacr;",364:"Ubreve;",365:"ubreve;",366:"Uring;",367:"uring;",368:"Udblac;",369:"udblac;",370:"Uogon;",371:"uogon;",372:"Wcirc;",373:"wcirc;",374:"Ycirc;",375:"ycirc;",376:"Yuml;",377:"Zacute;",378:"zacute;",379:"Zdot;",380:"zdot;",381:"Zcaron;",382:"zcaron;",402:"fnof;",437:"imped;",501:"gacute;",567:"jmath;",710:"circ;",711:"Hacek;",728:"breve;",729:"dot;",730:"ring;",731:"ogon;",732:"tilde;",733:"DiacriticalDoubleAcute;",785:"DownBreve;",913:"Alpha;",914:"Beta;",915:"Gamma;",916:"Delta;",917:"Epsilon;",918:"Zeta;",919:"Eta;",920:"Theta;",921:"Iota;",922:"Kappa;",923:"Lambda;",924:"Mu;",925:"Nu;",926:"Xi;",927:"Omicron;",928:"Pi;",929:"Rho;",931:"Sigma;",932:"Tau;",933:"Upsilon;",934:"Phi;",935:"Chi;",936:"Psi;",937:"Omega;",945:"alpha;",946:"beta;",947:"gamma;",948:"delta;",949:"epsilon;",950:"zeta;",951:"eta;",952:"theta;",953:"iota;",954:"kappa;",955:"lambda;",956:"mu;",957:"nu;",958:"xi;",959:"omicron;",960:"pi;",961:"rho;",962:"varsigma;",963:"sigma;",964:"tau;",965:"upsilon;",966:"phi;",967:"chi;",968:"psi;",969:"omega;",977:"vartheta;",978:"upsih;",981:"varphi;",982:"varpi;",988:"Gammad;",989:"gammad;",1008:"varkappa;",1009:"varrho;",1013:"varepsilon;",1014:"bepsi;",1025:"IOcy;",1026:"DJcy;",1027:"GJcy;",1028:"Jukcy;",1029:"DScy;",1030:"Iukcy;",1031:"YIcy;",1032:"Jsercy;",1033:"LJcy;",1034:"NJcy;",1035:"TSHcy;",1036:"KJcy;",1038:"Ubrcy;",1039:"DZcy;",1040:"Acy;",1041:"Bcy;",1042:"Vcy;",1043:"Gcy;",1044:"Dcy;",1045:"IEcy;",1046:"ZHcy;",1047:"Zcy;",1048:"Icy;",1049:"Jcy;",1050:"Kcy;",1051:"Lcy;",1052:"Mcy;",1053:"Ncy;",1054:"Ocy;",1055:"Pcy;",1056:"Rcy;",1057:"Scy;",1058:"Tcy;",1059:"Ucy;",1060:"Fcy;",1061:"KHcy;",1062:"TScy;",1063:"CHcy;",1064:"SHcy;",1065:"SHCHcy;",1066:"HARDcy;",1067:"Ycy;",1068:"SOFTcy;",1069:"Ecy;",1070:"YUcy;",1071:"YAcy;",1072:"acy;",1073:"bcy;",1074:"vcy;",1075:"gcy;",1076:"dcy;",1077:"iecy;",1078:"zhcy;",1079:"zcy;",1080:"icy;",1081:"jcy;",1082:"kcy;",1083:"lcy;",1084:"mcy;",1085:"ncy;",1086:"ocy;",1087:"pcy;",1088:"rcy;",1089:"scy;",1090:"tcy;",1091:"ucy;",1092:"fcy;",1093:"khcy;",1094:"tscy;",1095:"chcy;",1096:"shcy;",1097:"shchcy;",1098:"hardcy;",1099:"ycy;",1100:"softcy;",1101:"ecy;",1102:"yucy;",1103:"yacy;",1105:"iocy;",1106:"djcy;",1107:"gjcy;",1108:"jukcy;",1109:"dscy;",1110:"iukcy;",1111:"yicy;",1112:"jsercy;",1113:"ljcy;",1114:"njcy;",1115:"tshcy;",1116:"kjcy;",1118:"ubrcy;",1119:"dzcy;",8194:"ensp;",8195:"emsp;",8196:"emsp13;",8197:"emsp14;",8199:"numsp;",8200:"puncsp;",8201:"ThinSpace;",8202:"VeryThinSpace;",8203:"ZeroWidthSpace;",8204:"zwnj;",8205:"zwj;",8206:"lrm;",8207:"rlm;",8208:"hyphen;",8211:"ndash;",8212:"mdash;",8213:"horbar;",8214:"Vert;",8216:"OpenCurlyQuote;",8217:"rsquor;",8218:"sbquo;",8220:"OpenCurlyDoubleQuote;",8221:"rdquor;",8222:"ldquor;",8224:"dagger;",8225:"ddagger;",8226:"bullet;",8229:"nldr;",8230:"mldr;",8240:"permil;",8241:"pertenk;",8242:"prime;",8243:"Prime;",8244:"tprime;",8245:"bprime;",8249:"lsaquo;",8250:"rsaquo;",8254:"OverBar;",8257:"caret;",8259:"hybull;",8260:"frasl;",8271:"bsemi;",8279:"qprime;",8287:"MediumSpace;",8288:"NoBreak;",8289:"ApplyFunction;",8290:"it;",8291:"InvisibleComma;",8364:"euro;",8411:"TripleDot;",8412:"DotDot;",8450:"Copf;",8453:"incare;",8458:"gscr;",8459:"Hscr;",8460:"Poincareplane;",8461:"quaternions;",8462:"planckh;",8463:"plankv;",8464:"Iscr;",8465:"imagpart;",8466:"Lscr;",8467:"ell;",8469:"Nopf;",8470:"numero;",8471:"copysr;",8472:"wp;",8473:"primes;",8474:"rationals;",8475:"Rscr;",8476:"Rfr;",8477:"Ropf;",8478:"rx;",8482:"trade;",8484:"Zopf;",8487:"mho;",8488:"Zfr;",8489:"iiota;",8492:"Bscr;",8493:"Cfr;",8495:"escr;",8496:"expectation;",8497:"Fscr;",8499:"phmmat;",8500:"oscr;",8501:"aleph;",8502:"beth;",8503:"gimel;",8504:"daleth;",8517:"DD;",8518:"DifferentialD;",8519:"exponentiale;",8520:"ImaginaryI;",8531:"frac13;",8532:"frac23;",8533:"frac15;",8534:"frac25;",8535:"frac35;",8536:"frac45;",8537:"frac16;",8538:"frac56;",8539:"frac18;",8540:"frac38;",8541:"frac58;",8542:"frac78;",8592:"slarr;",8593:"uparrow;",8594:"srarr;",8595:"ShortDownArrow;",8596:"leftrightarrow;",8597:"varr;",8598:"UpperLeftArrow;",8599:"UpperRightArrow;",8600:"searrow;",8601:"swarrow;",8602:"nleftarrow;",8603:"nrightarrow;",8605:"rightsquigarrow;",8606:"twoheadleftarrow;",8607:"Uarr;",8608:"twoheadrightarrow;",8609:"Darr;",8610:"leftarrowtail;",8611:"rightarrowtail;",8612:"mapstoleft;",8613:"UpTeeArrow;",8614:"RightTeeArrow;",8615:"mapstodown;",8617:"larrhk;",8618:"rarrhk;",8619:"looparrowleft;",8620:"rarrlp;",8621:"leftrightsquigarrow;",8622:"nleftrightarrow;",8624:"lsh;",8625:"rsh;",8626:"ldsh;",8627:"rdsh;",8629:"crarr;",8630:"curvearrowleft;",8631:"curvearrowright;",8634:"olarr;",8635:"orarr;",8636:"lharu;",8637:"lhard;",8638:"upharpoonright;",8639:"upharpoonleft;",8640:"RightVector;",8641:"rightharpoondown;",8642:"RightDownVector;",8643:"LeftDownVector;",8644:"rlarr;",8645:"UpArrowDownArrow;",8646:"lrarr;",8647:"llarr;",8648:"uuarr;",8649:"rrarr;",8650:"downdownarrows;",8651:"ReverseEquilibrium;",8652:"rlhar;",8653:"nLeftarrow;",8654:"nLeftrightarrow;",8655:"nRightarrow;",8656:"Leftarrow;",8657:"Uparrow;",8658:"Rightarrow;",8659:"Downarrow;",8660:"Leftrightarrow;",8661:"vArr;",8662:"nwArr;",8663:"neArr;",8664:"seArr;",8665:"swArr;",8666:"Lleftarrow;",8667:"Rrightarrow;",8669:"zigrarr;",8676:"LeftArrowBar;",8677:"RightArrowBar;",8693:"duarr;",8701:"loarr;",8702:"roarr;",8703:"hoarr;",8704:"forall;",8705:"complement;",8706:"PartialD;",8707:"Exists;",8708:"NotExists;",8709:"varnothing;",8711:"nabla;",8712:"isinv;",8713:"notinva;",8715:"SuchThat;",8716:"NotReverseElement;",8719:"Product;",8720:"Coproduct;",8721:"sum;",8722:"minus;",8723:"mp;",8724:"plusdo;",8726:"ssetmn;",8727:"lowast;",8728:"SmallCircle;",8730:"Sqrt;",8733:"vprop;",8734:"infin;",8735:"angrt;",8736:"angle;",8737:"measuredangle;",8738:"angsph;",8739:"VerticalBar;",8740:"nsmid;",8741:"spar;",8742:"nspar;",8743:"wedge;",8744:"vee;",8745:"cap;",8746:"cup;",8747:"Integral;",8748:"Int;",8749:"tint;",8750:"oint;",8751:"DoubleContourIntegral;",8752:"Cconint;",8753:"cwint;",8754:"cwconint;",8755:"CounterClockwiseContourIntegral;",8756:"therefore;",8757:"because;",8758:"ratio;",8759:"Proportion;",8760:"minusd;",8762:"mDDot;",8763:"homtht;",8764:"Tilde;",8765:"bsim;",8766:"mstpos;",8767:"acd;",8768:"wreath;",8769:"nsim;",8770:"esim;",8771:"TildeEqual;",8772:"nsimeq;",8773:"TildeFullEqual;",8774:"simne;",8775:"NotTildeFullEqual;",8776:"TildeTilde;",8777:"NotTildeTilde;",8778:"approxeq;",8779:"apid;",8780:"bcong;",8781:"CupCap;",8782:"HumpDownHump;",8783:"HumpEqual;",8784:"esdot;",8785:"eDot;",8786:"fallingdotseq;",8787:"risingdotseq;",8788:"coloneq;",8789:"eqcolon;",8790:"eqcirc;",8791:"cire;",8793:"wedgeq;",8794:"veeeq;",8796:"trie;",8799:"questeq;",8800:"NotEqual;",8801:"equiv;",8802:"NotCongruent;",8804:"leq;",8805:"GreaterEqual;",8806:"LessFullEqual;",8807:"GreaterFullEqual;",8808:"lneqq;",8809:"gneqq;",8810:"NestedLessLess;",8811:"NestedGreaterGreater;",8812:"twixt;",8813:"NotCupCap;",8814:"NotLess;",8815:"NotGreater;",8816:"NotLessEqual;",8817:"NotGreaterEqual;",8818:"lsim;",8819:"gtrsim;",8820:"NotLessTilde;",8821:"NotGreaterTilde;",8822:"lg;",8823:"gtrless;",8824:"ntlg;",8825:"ntgl;",8826:"Precedes;",8827:"Succeeds;",8828:"PrecedesSlantEqual;",8829:"SucceedsSlantEqual;",8830:"prsim;",8831:"succsim;",8832:"nprec;",8833:"nsucc;",8834:"subset;",8835:"supset;",8836:"nsub;",8837:"nsup;",8838:"SubsetEqual;",8839:"supseteq;",8840:"nsubseteq;",8841:"nsupseteq;",8842:"subsetneq;",8843:"supsetneq;",8845:"cupdot;",8846:"uplus;",8847:"SquareSubset;",8848:"SquareSuperset;",8849:"SquareSubsetEqual;",8850:"SquareSupersetEqual;",8851:"SquareIntersection;",8852:"SquareUnion;",8853:"oplus;",8854:"ominus;",8855:"otimes;",8856:"osol;",8857:"odot;",8858:"ocir;",8859:"oast;",8861:"odash;",8862:"plusb;",8863:"minusb;",8864:"timesb;",8865:"sdotb;",8866:"vdash;",8867:"LeftTee;",8868:"top;",8869:"UpTee;",8871:"models;",8872:"vDash;",8873:"Vdash;",8874:"Vvdash;",8875:"VDash;",8876:"nvdash;",8877:"nvDash;",8878:"nVdash;",8879:"nVDash;",8880:"prurel;",8882:"vltri;",8883:"vrtri;",8884:"trianglelefteq;",8885:"trianglerighteq;",8886:"origof;",8887:"imof;",8888:"mumap;",8889:"hercon;",8890:"intercal;",8891:"veebar;",8893:"barvee;",8894:"angrtvb;",8895:"lrtri;",8896:"xwedge;",8897:"xvee;",8898:"xcap;",8899:"xcup;",8900:"diamond;",8901:"sdot;",8902:"Star;",8903:"divonx;",8904:"bowtie;",8905:"ltimes;",8906:"rtimes;",8907:"lthree;",8908:"rthree;",8909:"bsime;",8910:"cuvee;",8911:"cuwed;",8912:"Subset;",8913:"Supset;",8914:"Cap;",8915:"Cup;",8916:"pitchfork;",8917:"epar;",8918:"ltdot;",8919:"gtrdot;",8920:"Ll;",8921:"ggg;",8922:"LessEqualGreater;",8923:"gtreqless;",8926:"curlyeqprec;",8927:"curlyeqsucc;",8928:"nprcue;",8929:"nsccue;",8930:"nsqsube;",8931:"nsqsupe;",8934:"lnsim;",8935:"gnsim;",8936:"prnsim;",8937:"succnsim;",8938:"ntriangleleft;",8939:"ntriangleright;",8940:"ntrianglelefteq;",8941:"ntrianglerighteq;",8942:"vellip;",8943:"ctdot;",8944:"utdot;",8945:"dtdot;",8946:"disin;",8947:"isinsv;",8948:"isins;",8949:"isindot;",8950:"notinvc;",8951:"notinvb;",8953:"isinE;",8954:"nisd;",8955:"xnis;",8956:"nis;",8957:"notnivc;",8958:"notnivb;",8965:"barwedge;",8966:"doublebarwedge;",8968:"LeftCeiling;",8969:"RightCeiling;",8970:"lfloor;",8971:"RightFloor;",8972:"drcrop;",8973:"dlcrop;",8974:"urcrop;",8975:"ulcrop;",8976:"bnot;",8978:"profline;",8979:"profsurf;",8981:"telrec;",8982:"target;",8988:"ulcorner;",8989:"urcorner;",8990:"llcorner;",8991:"lrcorner;",8994:"sfrown;",8995:"ssmile;",9005:"cylcty;",9006:"profalar;",9014:"topbot;",9021:"ovbar;",9023:"solbar;",9084:"angzarr;",9136:"lmoustache;",9137:"rmoustache;",9140:"tbrk;",9141:"UnderBracket;",9142:"bbrktbrk;",9180:"OverParenthesis;",9181:"UnderParenthesis;",9182:"OverBrace;",9183:"UnderBrace;",9186:"trpezium;",9191:"elinters;",9251:"blank;",9416:"oS;",9472:"HorizontalLine;",9474:"boxv;",9484:"boxdr;",9488:"boxdl;",9492:"boxur;",9496:"boxul;",9500:"boxvr;",9508:"boxvl;",9516:"boxhd;",9524:"boxhu;",9532:"boxvh;",9552:"boxH;",9553:"boxV;",9554:"boxdR;",9555:"boxDr;",9556:"boxDR;",9557:"boxdL;",9558:"boxDl;",9559:"boxDL;",9560:"boxuR;",9561:"boxUr;",9562:"boxUR;",9563:"boxuL;",9564:"boxUl;",9565:"boxUL;",9566:"boxvR;",9567:"boxVr;",9568:"boxVR;",9569:"boxvL;",9570:"boxVl;",9571:"boxVL;",9572:"boxHd;",9573:"boxhD;",9574:"boxHD;",9575:"boxHu;",9576:"boxhU;",9577:"boxHU;",9578:"boxvH;",9579:"boxVh;",9580:"boxVH;",9600:"uhblk;",9604:"lhblk;",9608:"block;",9617:"blk14;",9618:"blk12;",9619:"blk34;",9633:"square;",9642:"squf;",9643:"EmptyVerySmallSquare;",9645:"rect;",9646:"marker;",9649:"fltns;",9651:"xutri;",9652:"utrif;",9653:"utri;",9656:"rtrif;",9657:"triangleright;",9661:"xdtri;",9662:"dtrif;",9663:"triangledown;",9666:"ltrif;",9667:"triangleleft;",9674:"lozenge;",9675:"cir;",9708:"tridot;",9711:"xcirc;",9720:"ultri;",9721:"urtri;",9722:"lltri;",9723:"EmptySmallSquare;",9724:"FilledSmallSquare;",9733:"starf;",9734:"star;",9742:"phone;",9792:"female;",9794:"male;",9824:"spadesuit;",9827:"clubsuit;",9829:"heartsuit;",9830:"diams;",9834:"sung;",9837:"flat;",9838:"natural;",9839:"sharp;",10003:"checkmark;",10007:"cross;",10016:"maltese;",10038:"sext;",10072:"VerticalSeparator;",10098:"lbbrk;",10099:"rbbrk;",10184:"bsolhsub;",10185:"suphsol;",10214:"lobrk;",10215:"robrk;",10216:"LeftAngleBracket;",10217:"RightAngleBracket;",10218:"Lang;",10219:"Rang;",10220:"loang;",10221:"roang;",10229:"xlarr;",10230:"xrarr;",10231:"xharr;",10232:"xlArr;",10233:"xrArr;",10234:"xhArr;",10236:"xmap;",10239:"dzigrarr;",10498:"nvlArr;",10499:"nvrArr;",10500:"nvHarr;",10501:"Map;",10508:"lbarr;",10509:"rbarr;",10510:"lBarr;",10511:"rBarr;",10512:"RBarr;",10513:"DDotrahd;",10514:"UpArrowBar;",10515:"DownArrowBar;",10518:"Rarrtl;",10521:"latail;",10522:"ratail;",10523:"lAtail;",10524:"rAtail;",10525:"larrfs;",10526:"rarrfs;",10527:"larrbfs;",10528:"rarrbfs;",10531:"nwarhk;",10532:"nearhk;",10533:"searhk;",10534:"swarhk;",10535:"nwnear;",10536:"toea;",10537:"tosa;",10538:"swnwar;",10547:"rarrc;",10549:"cudarrr;",10550:"ldca;",10551:"rdca;",10552:"cudarrl;",10553:"larrpl;",10556:"curarrm;",10557:"cularrp;",10565:"rarrpl;",10568:"harrcir;",10569:"Uarrocir;",10570:"lurdshar;",10571:"ldrushar;",10574:"LeftRightVector;",10575:"RightUpDownVector;",10576:"DownLeftRightVector;",10577:"LeftUpDownVector;",10578:"LeftVectorBar;",10579:"RightVectorBar;",10580:"RightUpVectorBar;",10581:"RightDownVectorBar;",10582:"DownLeftVectorBar;",10583:"DownRightVectorBar;",10584:"LeftUpVectorBar;",10585:"LeftDownVectorBar;",10586:"LeftTeeVector;",10587:"RightTeeVector;",10588:"RightUpTeeVector;",10589:"RightDownTeeVector;",10590:"DownLeftTeeVector;",10591:"DownRightTeeVector;",10592:"LeftUpTeeVector;",10593:"LeftDownTeeVector;",10594:"lHar;",10595:"uHar;",10596:"rHar;",10597:"dHar;",10598:"luruhar;",10599:"ldrdhar;",10600:"ruluhar;",10601:"rdldhar;",10602:"lharul;",10603:"llhard;",10604:"rharul;",10605:"lrhard;",10606:"UpEquilibrium;",10607:"ReverseUpEquilibrium;",10608:"RoundImplies;",10609:"erarr;",10610:"simrarr;",10611:"larrsim;",10612:"rarrsim;",10613:"rarrap;",10614:"ltlarr;",10616:"gtrarr;",10617:"subrarr;",10619:"suplarr;",10620:"lfisht;",10621:"rfisht;",10622:"ufisht;",10623:"dfisht;",10629:"lopar;",10630:"ropar;",10635:"lbrke;",10636:"rbrke;",10637:"lbrkslu;",10638:"rbrksld;",10639:"lbrksld;",10640:"rbrkslu;",10641:"langd;",10642:"rangd;",10643:"lparlt;",10644:"rpargt;",10645:"gtlPar;",10646:"ltrPar;",10650:"vzigzag;",10652:"vangrt;",10653:"angrtvbd;",10660:"ange;",10661:"range;",10662:"dwangle;",10663:"uwangle;",10664:"angmsdaa;",10665:"angmsdab;",10666:"angmsdac;",10667:"angmsdad;",10668:"angmsdae;",10669:"angmsdaf;",10670:"angmsdag;",10671:"angmsdah;",10672:"bemptyv;",10673:"demptyv;",10674:"cemptyv;",10675:"raemptyv;",10676:"laemptyv;",10677:"ohbar;",10678:"omid;",10679:"opar;",10681:"operp;",10683:"olcross;",10684:"odsold;",10686:"olcir;",10687:"ofcir;",10688:"olt;",10689:"ogt;",10690:"cirscir;",10691:"cirE;",10692:"solb;",10693:"bsolb;",10697:"boxbox;",10701:"trisb;",10702:"rtriltri;",10703:"LeftTriangleBar;",10704:"RightTriangleBar;",10716:"iinfin;",10717:"infintie;",10718:"nvinfin;",10723:"eparsl;",10724:"smeparsl;",10725:"eqvparsl;",10731:"lozf;",10740:"RuleDelayed;",10742:"dsol;",10752:"xodot;",10753:"xoplus;",10754:"xotime;",10756:"xuplus;",10758:"xsqcup;",10764:"qint;",10765:"fpartint;",10768:"cirfnint;",10769:"awint;",10770:"rppolint;",10771:"scpolint;",10772:"npolint;",10773:"pointint;",10774:"quatint;",10775:"intlarhk;",10786:"pluscir;",10787:"plusacir;",10788:"simplus;",10789:"plusdu;",10790:"plussim;",10791:"plustwo;",10793:"mcomma;",10794:"minusdu;",10797:"loplus;",10798:"roplus;",10799:"Cross;",10800:"timesd;",10801:"timesbar;",10803:"smashp;",10804:"lotimes;",10805:"rotimes;",10806:"otimesas;",10807:"Otimes;",10808:"odiv;",10809:"triplus;",10810:"triminus;",10811:"tritime;",10812:"iprod;",10815:"amalg;",10816:"capdot;",10818:"ncup;",10819:"ncap;",10820:"capand;",10821:"cupor;",10822:"cupcap;",10823:"capcup;",10824:"cupbrcap;",10825:"capbrcup;",10826:"cupcup;",10827:"capcap;",10828:"ccups;",10829:"ccaps;",10832:"ccupssm;",10835:"And;",10836:"Or;",10837:"andand;",10838:"oror;",10839:"orslope;",10840:"andslope;",10842:"andv;",10843:"orv;",10844:"andd;",10845:"ord;",10847:"wedbar;",10854:"sdote;",10858:"simdot;",10861:"congdot;",10862:"easter;",10863:"apacir;",10864:"apE;",10865:"eplus;",10866:"pluse;",10867:"Esim;",10868:"Colone;",10869:"Equal;",10871:"eDDot;",10872:"equivDD;",10873:"ltcir;",10874:"gtcir;",10875:"ltquest;",10876:"gtquest;",10877:"LessSlantEqual;",10878:"GreaterSlantEqual;",10879:"lesdot;",10880:"gesdot;",10881:"lesdoto;",10882:"gesdoto;",10883:"lesdotor;",10884:"gesdotol;",10885:"lessapprox;",10886:"gtrapprox;",10887:"lneq;",10888:"gneq;",10889:"lnapprox;",10890:"gnapprox;",10891:"lesseqqgtr;",10892:"gtreqqless;",10893:"lsime;",10894:"gsime;",10895:"lsimg;",10896:"gsiml;",10897:"lgE;",10898:"glE;",10899:"lesges;",10900:"gesles;",10901:"eqslantless;",10902:"eqslantgtr;",10903:"elsdot;",10904:"egsdot;",10905:"el;",10906:"eg;",10909:"siml;",10910:"simg;",10911:"simlE;",10912:"simgE;",10913:"LessLess;",10914:"GreaterGreater;",10916:"glj;",10917:"gla;",10918:"ltcc;",10919:"gtcc;",10920:"lescc;",10921:"gescc;",10922:"smt;",10923:"lat;",10924:"smte;",10925:"late;",10926:"bumpE;",10927:"preceq;",10928:"succeq;",10931:"prE;",10932:"scE;",10933:"prnE;",10934:"succneqq;",10935:"precapprox;",10936:"succapprox;",10937:"prnap;",10938:"succnapprox;",10939:"Pr;",10940:"Sc;",10941:"subdot;",10942:"supdot;",10943:"subplus;",10944:"supplus;",10945:"submult;",10946:"supmult;",10947:"subedot;",10948:"supedot;",10949:"subseteqq;",10950:"supseteqq;",10951:"subsim;",10952:"supsim;",10955:"subsetneqq;",10956:"supsetneqq;",10959:"csub;",10960:"csup;",10961:"csube;",10962:"csupe;",10963:"subsup;",10964:"supsub;",10965:"subsub;",10966:"supsup;",10967:"suphsub;",10968:"supdsub;",10969:"forkv;",10970:"topfork;",10971:"mlcp;",10980:"DoubleLeftTee;",10982:"Vdashl;",10983:"Barv;",10984:"vBar;",10985:"vBarv;",10987:"Vbar;",10988:"Not;",10989:"bNot;",10990:"rnmid;",10991:"cirmid;",10992:"midcir;",10993:"topcir;",10994:"nhpar;",10995:"parsim;",11005:"parsl;",64256:"fflig;",64257:"filig;",64258:"fllig;",64259:"ffilig;",64260:"ffllig;"}})),ee=function(r,e){if("string"!=typeof r)throw new TypeError("Expected a String");e||(e={});var t=!0;e.named&&(t=!1);void 0!==e.numeric&&(t=e.numeric);for(var n=e.special||{'"':!0,"'":!0,"<":!0,">":!0,"&":!0},a=Xr.ucs2.decode(r),o=[],i=0;i<a.length;i++){var s=a[i],c=Xr.ucs2.encode([s]),l=re[s];l&&(s>=127||n[c])&&!t?o.push("&"+(/;$/.test(l)?l:l+";")):s<32||s>=127||n[c]?o.push("&#"+s+";"):o.push(c);}return o.join("")};var te={"Aacute;":"Á",Aacute:"Á","aacute;":"á",aacute:"á","Abreve;":"Ă","abreve;":"ă","ac;":"∾","acd;":"∿","acE;":"∾̳","Acirc;":"Â",Acirc:"Â","acirc;":"â",acirc:"â","acute;":"´",acute:"´","Acy;":"А","acy;":"а","AElig;":"Æ",AElig:"Æ","aelig;":"æ",aelig:"æ","af;":"⁡","Afr;":"𝔄","afr;":"𝔞","Agrave;":"À",Agrave:"À","agrave;":"à",agrave:"à","alefsym;":"ℵ","aleph;":"ℵ","Alpha;":"Α","alpha;":"α","Amacr;":"Ā","amacr;":"ā","amalg;":"⨿","AMP;":"&",AMP:"&","amp;":"&",amp:"&","And;":"⩓","and;":"∧","andand;":"⩕","andd;":"⩜","andslope;":"⩘","andv;":"⩚","ang;":"∠","ange;":"⦤","angle;":"∠","angmsd;":"∡","angmsdaa;":"⦨","angmsdab;":"⦩","angmsdac;":"⦪","angmsdad;":"⦫","angmsdae;":"⦬","angmsdaf;":"⦭","angmsdag;":"⦮","angmsdah;":"⦯","angrt;":"∟","angrtvb;":"⊾","angrtvbd;":"⦝","angsph;":"∢","angst;":"Å","angzarr;":"⍼","Aogon;":"Ą","aogon;":"ą","Aopf;":"𝔸","aopf;":"𝕒","ap;":"≈","apacir;":"⩯","apE;":"⩰","ape;":"≊","apid;":"≋","apos;":"'","ApplyFunction;":"⁡","approx;":"≈","approxeq;":"≊","Aring;":"Å",Aring:"Å","aring;":"å",aring:"å","Ascr;":"𝒜","ascr;":"𝒶","Assign;":"≔","ast;":"*","asymp;":"≈","asympeq;":"≍","Atilde;":"Ã",Atilde:"Ã","atilde;":"ã",atilde:"ã","Auml;":"Ä",Auml:"Ä","auml;":"ä",auml:"ä","awconint;":"∳","awint;":"⨑","backcong;":"≌","backepsilon;":"϶","backprime;":"‵","backsim;":"∽","backsimeq;":"⋍","Backslash;":"∖","Barv;":"⫧","barvee;":"⊽","Barwed;":"⌆","barwed;":"⌅","barwedge;":"⌅","bbrk;":"⎵","bbrktbrk;":"⎶","bcong;":"≌","Bcy;":"Б","bcy;":"б","bdquo;":"„","becaus;":"∵","Because;":"∵","because;":"∵","bemptyv;":"⦰","bepsi;":"϶","bernou;":"ℬ","Bernoullis;":"ℬ","Beta;":"Β","beta;":"β","beth;":"ℶ","between;":"≬","Bfr;":"𝔅","bfr;":"𝔟","bigcap;":"⋂","bigcirc;":"◯","bigcup;":"⋃","bigodot;":"⨀","bigoplus;":"⨁","bigotimes;":"⨂","bigsqcup;":"⨆","bigstar;":"★","bigtriangledown;":"▽","bigtriangleup;":"△","biguplus;":"⨄","bigvee;":"⋁","bigwedge;":"⋀","bkarow;":"⤍","blacklozenge;":"⧫","blacksquare;":"▪","blacktriangle;":"▴","blacktriangledown;":"▾","blacktriangleleft;":"◂","blacktriangleright;":"▸","blank;":"␣","blk12;":"▒","blk14;":"░","blk34;":"▓","block;":"█","bne;":"=⃥","bnequiv;":"≡⃥","bNot;":"⫭","bnot;":"⌐","Bopf;":"𝔹","bopf;":"𝕓","bot;":"⊥","bottom;":"⊥","bowtie;":"⋈","boxbox;":"⧉","boxDL;":"╗","boxDl;":"╖","boxdL;":"╕","boxdl;":"┐","boxDR;":"╔","boxDr;":"╓","boxdR;":"╒","boxdr;":"┌","boxH;":"═","boxh;":"─","boxHD;":"╦","boxHd;":"╤","boxhD;":"╥","boxhd;":"┬","boxHU;":"╩","boxHu;":"╧","boxhU;":"╨","boxhu;":"┴","boxminus;":"⊟","boxplus;":"⊞","boxtimes;":"⊠","boxUL;":"╝","boxUl;":"╜","boxuL;":"╛","boxul;":"┘","boxUR;":"╚","boxUr;":"╙","boxuR;":"╘","boxur;":"└","boxV;":"║","boxv;":"│","boxVH;":"╬","boxVh;":"╫","boxvH;":"╪","boxvh;":"┼","boxVL;":"╣","boxVl;":"╢","boxvL;":"╡","boxvl;":"┤","boxVR;":"╠","boxVr;":"╟","boxvR;":"╞","boxvr;":"├","bprime;":"‵","Breve;":"˘","breve;":"˘","brvbar;":"¦",brvbar:"¦","Bscr;":"ℬ","bscr;":"𝒷","bsemi;":"⁏","bsim;":"∽","bsime;":"⋍","bsol;":"\\","bsolb;":"⧅","bsolhsub;":"⟈","bull;":"•","bullet;":"•","bump;":"≎","bumpE;":"⪮","bumpe;":"≏","Bumpeq;":"≎","bumpeq;":"≏","Cacute;":"Ć","cacute;":"ć","Cap;":"⋒","cap;":"∩","capand;":"⩄","capbrcup;":"⩉","capcap;":"⩋","capcup;":"⩇","capdot;":"⩀","CapitalDifferentialD;":"ⅅ","caps;":"∩︀","caret;":"⁁","caron;":"ˇ","Cayleys;":"ℭ","ccaps;":"⩍","Ccaron;":"Č","ccaron;":"č","Ccedil;":"Ç",Ccedil:"Ç","ccedil;":"ç",ccedil:"ç","Ccirc;":"Ĉ","ccirc;":"ĉ","Cconint;":"∰","ccups;":"⩌","ccupssm;":"⩐","Cdot;":"Ċ","cdot;":"ċ","cedil;":"¸",cedil:"¸","Cedilla;":"¸","cemptyv;":"⦲","cent;":"¢",cent:"¢","CenterDot;":"·","centerdot;":"·","Cfr;":"ℭ","cfr;":"𝔠","CHcy;":"Ч","chcy;":"ч","check;":"✓","checkmark;":"✓","Chi;":"Χ","chi;":"χ","cir;":"○","circ;":"ˆ","circeq;":"≗","circlearrowleft;":"↺","circlearrowright;":"↻","circledast;":"⊛","circledcirc;":"⊚","circleddash;":"⊝","CircleDot;":"⊙","circledR;":"®","circledS;":"Ⓢ","CircleMinus;":"⊖","CirclePlus;":"⊕","CircleTimes;":"⊗","cirE;":"⧃","cire;":"≗","cirfnint;":"⨐","cirmid;":"⫯","cirscir;":"⧂","ClockwiseContourIntegral;":"∲","CloseCurlyDoubleQuote;":"”","CloseCurlyQuote;":"’","clubs;":"♣","clubsuit;":"♣","Colon;":"∷","colon;":":","Colone;":"⩴","colone;":"≔","coloneq;":"≔","comma;":",","commat;":"@","comp;":"∁","compfn;":"∘","complement;":"∁","complexes;":"ℂ","cong;":"≅","congdot;":"⩭","Congruent;":"≡","Conint;":"∯","conint;":"∮","ContourIntegral;":"∮","Copf;":"ℂ","copf;":"𝕔","coprod;":"∐","Coproduct;":"∐","COPY;":"©",COPY:"©","copy;":"©",copy:"©","copysr;":"℗","CounterClockwiseContourIntegral;":"∳","crarr;":"↵","Cross;":"⨯","cross;":"✗","Cscr;":"𝒞","cscr;":"𝒸","csub;":"⫏","csube;":"⫑","csup;":"⫐","csupe;":"⫒","ctdot;":"⋯","cudarrl;":"⤸","cudarrr;":"⤵","cuepr;":"⋞","cuesc;":"⋟","cularr;":"↶","cularrp;":"⤽","Cup;":"⋓","cup;":"∪","cupbrcap;":"⩈","CupCap;":"≍","cupcap;":"⩆","cupcup;":"⩊","cupdot;":"⊍","cupor;":"⩅","cups;":"∪︀","curarr;":"↷","curarrm;":"⤼","curlyeqprec;":"⋞","curlyeqsucc;":"⋟","curlyvee;":"⋎","curlywedge;":"⋏","curren;":"¤",curren:"¤","curvearrowleft;":"↶","curvearrowright;":"↷","cuvee;":"⋎","cuwed;":"⋏","cwconint;":"∲","cwint;":"∱","cylcty;":"⌭","Dagger;":"‡","dagger;":"†","daleth;":"ℸ","Darr;":"↡","dArr;":"⇓","darr;":"↓","dash;":"‐","Dashv;":"⫤","dashv;":"⊣","dbkarow;":"⤏","dblac;":"˝","Dcaron;":"Ď","dcaron;":"ď","Dcy;":"Д","dcy;":"д","DD;":"ⅅ","dd;":"ⅆ","ddagger;":"‡","ddarr;":"⇊","DDotrahd;":"⤑","ddotseq;":"⩷","deg;":"°",deg:"°","Del;":"∇","Delta;":"Δ","delta;":"δ","demptyv;":"⦱","dfisht;":"⥿","Dfr;":"𝔇","dfr;":"𝔡","dHar;":"⥥","dharl;":"⇃","dharr;":"⇂","DiacriticalAcute;":"´","DiacriticalDot;":"˙","DiacriticalDoubleAcute;":"˝","DiacriticalGrave;":"`","DiacriticalTilde;":"˜","diam;":"⋄","Diamond;":"⋄","diamond;":"⋄","diamondsuit;":"♦","diams;":"♦","die;":"¨","DifferentialD;":"ⅆ","digamma;":"ϝ","disin;":"⋲","div;":"÷","divide;":"÷",divide:"÷","divideontimes;":"⋇","divonx;":"⋇","DJcy;":"Ђ","djcy;":"ђ","dlcorn;":"⌞","dlcrop;":"⌍","dollar;":"$","Dopf;":"𝔻","dopf;":"𝕕","Dot;":"¨","dot;":"˙","DotDot;":"⃜","doteq;":"≐","doteqdot;":"≑","DotEqual;":"≐","dotminus;":"∸","dotplus;":"∔","dotsquare;":"⊡","doublebarwedge;":"⌆","DoubleContourIntegral;":"∯","DoubleDot;":"¨","DoubleDownArrow;":"⇓","DoubleLeftArrow;":"⇐","DoubleLeftRightArrow;":"⇔","DoubleLeftTee;":"⫤","DoubleLongLeftArrow;":"⟸","DoubleLongLeftRightArrow;":"⟺","DoubleLongRightArrow;":"⟹","DoubleRightArrow;":"⇒","DoubleRightTee;":"⊨","DoubleUpArrow;":"⇑","DoubleUpDownArrow;":"⇕","DoubleVerticalBar;":"∥","DownArrow;":"↓","Downarrow;":"⇓","downarrow;":"↓","DownArrowBar;":"⤓","DownArrowUpArrow;":"⇵","DownBreve;":"̑","downdownarrows;":"⇊","downharpoonleft;":"⇃","downharpoonright;":"⇂","DownLeftRightVector;":"⥐","DownLeftTeeVector;":"⥞","DownLeftVector;":"↽","DownLeftVectorBar;":"⥖","DownRightTeeVector;":"⥟","DownRightVector;":"⇁","DownRightVectorBar;":"⥗","DownTee;":"⊤","DownTeeArrow;":"↧","drbkarow;":"⤐","drcorn;":"⌟","drcrop;":"⌌","Dscr;":"𝒟","dscr;":"𝒹","DScy;":"Ѕ","dscy;":"ѕ","dsol;":"⧶","Dstrok;":"Đ","dstrok;":"đ","dtdot;":"⋱","dtri;":"▿","dtrif;":"▾","duarr;":"⇵","duhar;":"⥯","dwangle;":"⦦","DZcy;":"Џ","dzcy;":"џ","dzigrarr;":"⟿","Eacute;":"É",Eacute:"É","eacute;":"é",eacute:"é","easter;":"⩮","Ecaron;":"Ě","ecaron;":"ě","ecir;":"≖","Ecirc;":"Ê",Ecirc:"Ê","ecirc;":"ê",ecirc:"ê","ecolon;":"≕","Ecy;":"Э","ecy;":"э","eDDot;":"⩷","Edot;":"Ė","eDot;":"≑","edot;":"ė","ee;":"ⅇ","efDot;":"≒","Efr;":"𝔈","efr;":"𝔢","eg;":"⪚","Egrave;":"È",Egrave:"È","egrave;":"è",egrave:"è","egs;":"⪖","egsdot;":"⪘","el;":"⪙","Element;":"∈","elinters;":"⏧","ell;":"ℓ","els;":"⪕","elsdot;":"⪗","Emacr;":"Ē","emacr;":"ē","empty;":"∅","emptyset;":"∅","EmptySmallSquare;":"◻","emptyv;":"∅","EmptyVerySmallSquare;":"▫","emsp;":" ","emsp13;":" ","emsp14;":" ","ENG;":"Ŋ","eng;":"ŋ","ensp;":" ","Eogon;":"Ę","eogon;":"ę","Eopf;":"𝔼","eopf;":"𝕖","epar;":"⋕","eparsl;":"⧣","eplus;":"⩱","epsi;":"ε","Epsilon;":"Ε","epsilon;":"ε","epsiv;":"ϵ","eqcirc;":"≖","eqcolon;":"≕","eqsim;":"≂","eqslantgtr;":"⪖","eqslantless;":"⪕","Equal;":"⩵","equals;":"=","EqualTilde;":"≂","equest;":"≟","Equilibrium;":"⇌","equiv;":"≡","equivDD;":"⩸","eqvparsl;":"⧥","erarr;":"⥱","erDot;":"≓","Escr;":"ℰ","escr;":"ℯ","esdot;":"≐","Esim;":"⩳","esim;":"≂","Eta;":"Η","eta;":"η","ETH;":"Ð",ETH:"Ð","eth;":"ð",eth:"ð","Euml;":"Ë",Euml:"Ë","euml;":"ë",euml:"ë","euro;":"€","excl;":"!","exist;":"∃","Exists;":"∃","expectation;":"ℰ","ExponentialE;":"ⅇ","exponentiale;":"ⅇ","fallingdotseq;":"≒","Fcy;":"Ф","fcy;":"ф","female;":"♀","ffilig;":"ﬃ","fflig;":"ﬀ","ffllig;":"ﬄ","Ffr;":"𝔉","ffr;":"𝔣","filig;":"ﬁ","FilledSmallSquare;":"◼","FilledVerySmallSquare;":"▪","fjlig;":"fj","flat;":"♭","fllig;":"ﬂ","fltns;":"▱","fnof;":"ƒ","Fopf;":"𝔽","fopf;":"𝕗","ForAll;":"∀","forall;":"∀","fork;":"⋔","forkv;":"⫙","Fouriertrf;":"ℱ","fpartint;":"⨍","frac12;":"½",frac12:"½","frac13;":"⅓","frac14;":"¼",frac14:"¼","frac15;":"⅕","frac16;":"⅙","frac18;":"⅛","frac23;":"⅔","frac25;":"⅖","frac34;":"¾",frac34:"¾","frac35;":"⅗","frac38;":"⅜","frac45;":"⅘","frac56;":"⅚","frac58;":"⅝","frac78;":"⅞","frasl;":"⁄","frown;":"⌢","Fscr;":"ℱ","fscr;":"𝒻","gacute;":"ǵ","Gamma;":"Γ","gamma;":"γ","Gammad;":"Ϝ","gammad;":"ϝ","gap;":"⪆","Gbreve;":"Ğ","gbreve;":"ğ","Gcedil;":"Ģ","Gcirc;":"Ĝ","gcirc;":"ĝ","Gcy;":"Г","gcy;":"г","Gdot;":"Ġ","gdot;":"ġ","gE;":"≧","ge;":"≥","gEl;":"⪌","gel;":"⋛","geq;":"≥","geqq;":"≧","geqslant;":"⩾","ges;":"⩾","gescc;":"⪩","gesdot;":"⪀","gesdoto;":"⪂","gesdotol;":"⪄","gesl;":"⋛︀","gesles;":"⪔","Gfr;":"𝔊","gfr;":"𝔤","Gg;":"⋙","gg;":"≫","ggg;":"⋙","gimel;":"ℷ","GJcy;":"Ѓ","gjcy;":"ѓ","gl;":"≷","gla;":"⪥","glE;":"⪒","glj;":"⪤","gnap;":"⪊","gnapprox;":"⪊","gnE;":"≩","gne;":"⪈","gneq;":"⪈","gneqq;":"≩","gnsim;":"⋧","Gopf;":"𝔾","gopf;":"𝕘","grave;":"`","GreaterEqual;":"≥","GreaterEqualLess;":"⋛","GreaterFullEqual;":"≧","GreaterGreater;":"⪢","GreaterLess;":"≷","GreaterSlantEqual;":"⩾","GreaterTilde;":"≳","Gscr;":"𝒢","gscr;":"ℊ","gsim;":"≳","gsime;":"⪎","gsiml;":"⪐","GT;":">",GT:">","Gt;":"≫","gt;":">",gt:">","gtcc;":"⪧","gtcir;":"⩺","gtdot;":"⋗","gtlPar;":"⦕","gtquest;":"⩼","gtrapprox;":"⪆","gtrarr;":"⥸","gtrdot;":"⋗","gtreqless;":"⋛","gtreqqless;":"⪌","gtrless;":"≷","gtrsim;":"≳","gvertneqq;":"≩︀","gvnE;":"≩︀","Hacek;":"ˇ","hairsp;":" ","half;":"½","hamilt;":"ℋ","HARDcy;":"Ъ","hardcy;":"ъ","hArr;":"⇔","harr;":"↔","harrcir;":"⥈","harrw;":"↭","Hat;":"^","hbar;":"ℏ","Hcirc;":"Ĥ","hcirc;":"ĥ","hearts;":"♥","heartsuit;":"♥","hellip;":"…","hercon;":"⊹","Hfr;":"ℌ","hfr;":"𝔥","HilbertSpace;":"ℋ","hksearow;":"⤥","hkswarow;":"⤦","hoarr;":"⇿","homtht;":"∻","hookleftarrow;":"↩","hookrightarrow;":"↪","Hopf;":"ℍ","hopf;":"𝕙","horbar;":"―","HorizontalLine;":"─","Hscr;":"ℋ","hscr;":"𝒽","hslash;":"ℏ","Hstrok;":"Ħ","hstrok;":"ħ","HumpDownHump;":"≎","HumpEqual;":"≏","hybull;":"⁃","hyphen;":"‐","Iacute;":"Í",Iacute:"Í","iacute;":"í",iacute:"í","ic;":"⁣","Icirc;":"Î",Icirc:"Î","icirc;":"î",icirc:"î","Icy;":"И","icy;":"и","Idot;":"İ","IEcy;":"Е","iecy;":"е","iexcl;":"¡",iexcl:"¡","iff;":"⇔","Ifr;":"ℑ","ifr;":"𝔦","Igrave;":"Ì",Igrave:"Ì","igrave;":"ì",igrave:"ì","ii;":"ⅈ","iiiint;":"⨌","iiint;":"∭","iinfin;":"⧜","iiota;":"℩","IJlig;":"Ĳ","ijlig;":"ĳ","Im;":"ℑ","Imacr;":"Ī","imacr;":"ī","image;":"ℑ","ImaginaryI;":"ⅈ","imagline;":"ℐ","imagpart;":"ℑ","imath;":"ı","imof;":"⊷","imped;":"Ƶ","Implies;":"⇒","in;":"∈","incare;":"℅","infin;":"∞","infintie;":"⧝","inodot;":"ı","Int;":"∬","int;":"∫","intcal;":"⊺","integers;":"ℤ","Integral;":"∫","intercal;":"⊺","Intersection;":"⋂","intlarhk;":"⨗","intprod;":"⨼","InvisibleComma;":"⁣","InvisibleTimes;":"⁢","IOcy;":"Ё","iocy;":"ё","Iogon;":"Į","iogon;":"į","Iopf;":"𝕀","iopf;":"𝕚","Iota;":"Ι","iota;":"ι","iprod;":"⨼","iquest;":"¿",iquest:"¿","Iscr;":"ℐ","iscr;":"𝒾","isin;":"∈","isindot;":"⋵","isinE;":"⋹","isins;":"⋴","isinsv;":"⋳","isinv;":"∈","it;":"⁢","Itilde;":"Ĩ","itilde;":"ĩ","Iukcy;":"І","iukcy;":"і","Iuml;":"Ï",Iuml:"Ï","iuml;":"ï",iuml:"ï","Jcirc;":"Ĵ","jcirc;":"ĵ","Jcy;":"Й","jcy;":"й","Jfr;":"𝔍","jfr;":"𝔧","jmath;":"ȷ","Jopf;":"𝕁","jopf;":"𝕛","Jscr;":"𝒥","jscr;":"𝒿","Jsercy;":"Ј","jsercy;":"ј","Jukcy;":"Є","jukcy;":"є","Kappa;":"Κ","kappa;":"κ","kappav;":"ϰ","Kcedil;":"Ķ","kcedil;":"ķ","Kcy;":"К","kcy;":"к","Kfr;":"𝔎","kfr;":"𝔨","kgreen;":"ĸ","KHcy;":"Х","khcy;":"х","KJcy;":"Ќ","kjcy;":"ќ","Kopf;":"𝕂","kopf;":"𝕜","Kscr;":"𝒦","kscr;":"𝓀","lAarr;":"⇚","Lacute;":"Ĺ","lacute;":"ĺ","laemptyv;":"⦴","lagran;":"ℒ","Lambda;":"Λ","lambda;":"λ","Lang;":"⟪","lang;":"⟨","langd;":"⦑","langle;":"⟨","lap;":"⪅","Laplacetrf;":"ℒ","laquo;":"«",laquo:"«","Larr;":"↞","lArr;":"⇐","larr;":"←","larrb;":"⇤","larrbfs;":"⤟","larrfs;":"⤝","larrhk;":"↩","larrlp;":"↫","larrpl;":"⤹","larrsim;":"⥳","larrtl;":"↢","lat;":"⪫","lAtail;":"⤛","latail;":"⤙","late;":"⪭","lates;":"⪭︀","lBarr;":"⤎","lbarr;":"⤌","lbbrk;":"❲","lbrace;":"{","lbrack;":"[","lbrke;":"⦋","lbrksld;":"⦏","lbrkslu;":"⦍","Lcaron;":"Ľ","lcaron;":"ľ","Lcedil;":"Ļ","lcedil;":"ļ","lceil;":"⌈","lcub;":"{","Lcy;":"Л","lcy;":"л","ldca;":"⤶","ldquo;":"“","ldquor;":"„","ldrdhar;":"⥧","ldrushar;":"⥋","ldsh;":"↲","lE;":"≦","le;":"≤","LeftAngleBracket;":"⟨","LeftArrow;":"←","Leftarrow;":"⇐","leftarrow;":"←","LeftArrowBar;":"⇤","LeftArrowRightArrow;":"⇆","leftarrowtail;":"↢","LeftCeiling;":"⌈","LeftDoubleBracket;":"⟦","LeftDownTeeVector;":"⥡","LeftDownVector;":"⇃","LeftDownVectorBar;":"⥙","LeftFloor;":"⌊","leftharpoondown;":"↽","leftharpoonup;":"↼","leftleftarrows;":"⇇","LeftRightArrow;":"↔","Leftrightarrow;":"⇔","leftrightarrow;":"↔","leftrightarrows;":"⇆","leftrightharpoons;":"⇋","leftrightsquigarrow;":"↭","LeftRightVector;":"⥎","LeftTee;":"⊣","LeftTeeArrow;":"↤","LeftTeeVector;":"⥚","leftthreetimes;":"⋋","LeftTriangle;":"⊲","LeftTriangleBar;":"⧏","LeftTriangleEqual;":"⊴","LeftUpDownVector;":"⥑","LeftUpTeeVector;":"⥠","LeftUpVector;":"↿","LeftUpVectorBar;":"⥘","LeftVector;":"↼","LeftVectorBar;":"⥒","lEg;":"⪋","leg;":"⋚","leq;":"≤","leqq;":"≦","leqslant;":"⩽","les;":"⩽","lescc;":"⪨","lesdot;":"⩿","lesdoto;":"⪁","lesdotor;":"⪃","lesg;":"⋚︀","lesges;":"⪓","lessapprox;":"⪅","lessdot;":"⋖","lesseqgtr;":"⋚","lesseqqgtr;":"⪋","LessEqualGreater;":"⋚","LessFullEqual;":"≦","LessGreater;":"≶","lessgtr;":"≶","LessLess;":"⪡","lesssim;":"≲","LessSlantEqual;":"⩽","LessTilde;":"≲","lfisht;":"⥼","lfloor;":"⌊","Lfr;":"𝔏","lfr;":"𝔩","lg;":"≶","lgE;":"⪑","lHar;":"⥢","lhard;":"↽","lharu;":"↼","lharul;":"⥪","lhblk;":"▄","LJcy;":"Љ","ljcy;":"љ","Ll;":"⋘","ll;":"≪","llarr;":"⇇","llcorner;":"⌞","Lleftarrow;":"⇚","llhard;":"⥫","lltri;":"◺","Lmidot;":"Ŀ","lmidot;":"ŀ","lmoust;":"⎰","lmoustache;":"⎰","lnap;":"⪉","lnapprox;":"⪉","lnE;":"≨","lne;":"⪇","lneq;":"⪇","lneqq;":"≨","lnsim;":"⋦","loang;":"⟬","loarr;":"⇽","lobrk;":"⟦","LongLeftArrow;":"⟵","Longleftarrow;":"⟸","longleftarrow;":"⟵","LongLeftRightArrow;":"⟷","Longleftrightarrow;":"⟺","longleftrightarrow;":"⟷","longmapsto;":"⟼","LongRightArrow;":"⟶","Longrightarrow;":"⟹","longrightarrow;":"⟶","looparrowleft;":"↫","looparrowright;":"↬","lopar;":"⦅","Lopf;":"𝕃","lopf;":"𝕝","loplus;":"⨭","lotimes;":"⨴","lowast;":"∗","lowbar;":"_","LowerLeftArrow;":"↙","LowerRightArrow;":"↘","loz;":"◊","lozenge;":"◊","lozf;":"⧫","lpar;":"(","lparlt;":"⦓","lrarr;":"⇆","lrcorner;":"⌟","lrhar;":"⇋","lrhard;":"⥭","lrm;":"‎","lrtri;":"⊿","lsaquo;":"‹","Lscr;":"ℒ","lscr;":"𝓁","Lsh;":"↰","lsh;":"↰","lsim;":"≲","lsime;":"⪍","lsimg;":"⪏","lsqb;":"[","lsquo;":"‘","lsquor;":"‚","Lstrok;":"Ł","lstrok;":"ł","LT;":"<",LT:"<","Lt;":"≪","lt;":"<",lt:"<","ltcc;":"⪦","ltcir;":"⩹","ltdot;":"⋖","lthree;":"⋋","ltimes;":"⋉","ltlarr;":"⥶","ltquest;":"⩻","ltri;":"◃","ltrie;":"⊴","ltrif;":"◂","ltrPar;":"⦖","lurdshar;":"⥊","luruhar;":"⥦","lvertneqq;":"≨︀","lvnE;":"≨︀","macr;":"¯",macr:"¯","male;":"♂","malt;":"✠","maltese;":"✠","Map;":"⤅","map;":"↦","mapsto;":"↦","mapstodown;":"↧","mapstoleft;":"↤","mapstoup;":"↥","marker;":"▮","mcomma;":"⨩","Mcy;":"М","mcy;":"м","mdash;":"—","mDDot;":"∺","measuredangle;":"∡","MediumSpace;":" ","Mellintrf;":"ℳ","Mfr;":"𝔐","mfr;":"𝔪","mho;":"℧","micro;":"µ",micro:"µ","mid;":"∣","midast;":"*","midcir;":"⫰","middot;":"·",middot:"·","minus;":"−","minusb;":"⊟","minusd;":"∸","minusdu;":"⨪","MinusPlus;":"∓","mlcp;":"⫛","mldr;":"…","mnplus;":"∓","models;":"⊧","Mopf;":"𝕄","mopf;":"𝕞","mp;":"∓","Mscr;":"ℳ","mscr;":"𝓂","mstpos;":"∾","Mu;":"Μ","mu;":"μ","multimap;":"⊸","mumap;":"⊸","nabla;":"∇","Nacute;":"Ń","nacute;":"ń","nang;":"∠⃒","nap;":"≉","napE;":"⩰̸","napid;":"≋̸","napos;":"ŉ","napprox;":"≉","natur;":"♮","natural;":"♮","naturals;":"ℕ","nbsp;":" ",nbsp:" ","nbump;":"≎̸","nbumpe;":"≏̸","ncap;":"⩃","Ncaron;":"Ň","ncaron;":"ň","Ncedil;":"Ņ","ncedil;":"ņ","ncong;":"≇","ncongdot;":"⩭̸","ncup;":"⩂","Ncy;":"Н","ncy;":"н","ndash;":"–","ne;":"≠","nearhk;":"⤤","neArr;":"⇗","nearr;":"↗","nearrow;":"↗","nedot;":"≐̸","NegativeMediumSpace;":"​","NegativeThickSpace;":"​","NegativeThinSpace;":"​","NegativeVeryThinSpace;":"​","nequiv;":"≢","nesear;":"⤨","nesim;":"≂̸","NestedGreaterGreater;":"≫","NestedLessLess;":"≪","NewLine;":"\n","nexist;":"∄","nexists;":"∄","Nfr;":"𝔑","nfr;":"𝔫","ngE;":"≧̸","nge;":"≱","ngeq;":"≱","ngeqq;":"≧̸","ngeqslant;":"⩾̸","nges;":"⩾̸","nGg;":"⋙̸","ngsim;":"≵","nGt;":"≫⃒","ngt;":"≯","ngtr;":"≯","nGtv;":"≫̸","nhArr;":"⇎","nharr;":"↮","nhpar;":"⫲","ni;":"∋","nis;":"⋼","nisd;":"⋺","niv;":"∋","NJcy;":"Њ","njcy;":"њ","nlArr;":"⇍","nlarr;":"↚","nldr;":"‥","nlE;":"≦̸","nle;":"≰","nLeftarrow;":"⇍","nleftarrow;":"↚","nLeftrightarrow;":"⇎","nleftrightarrow;":"↮","nleq;":"≰","nleqq;":"≦̸","nleqslant;":"⩽̸","nles;":"⩽̸","nless;":"≮","nLl;":"⋘̸","nlsim;":"≴","nLt;":"≪⃒","nlt;":"≮","nltri;":"⋪","nltrie;":"⋬","nLtv;":"≪̸","nmid;":"∤","NoBreak;":"⁠","NonBreakingSpace;":" ","Nopf;":"ℕ","nopf;":"𝕟","Not;":"⫬","not;":"¬",not:"¬","NotCongruent;":"≢","NotCupCap;":"≭","NotDoubleVerticalBar;":"∦","NotElement;":"∉","NotEqual;":"≠","NotEqualTilde;":"≂̸","NotExists;":"∄","NotGreater;":"≯","NotGreaterEqual;":"≱","NotGreaterFullEqual;":"≧̸","NotGreaterGreater;":"≫̸","NotGreaterLess;":"≹","NotGreaterSlantEqual;":"⩾̸","NotGreaterTilde;":"≵","NotHumpDownHump;":"≎̸","NotHumpEqual;":"≏̸","notin;":"∉","notindot;":"⋵̸","notinE;":"⋹̸","notinva;":"∉","notinvb;":"⋷","notinvc;":"⋶","NotLeftTriangle;":"⋪","NotLeftTriangleBar;":"⧏̸","NotLeftTriangleEqual;":"⋬","NotLess;":"≮","NotLessEqual;":"≰","NotLessGreater;":"≸","NotLessLess;":"≪̸","NotLessSlantEqual;":"⩽̸","NotLessTilde;":"≴","NotNestedGreaterGreater;":"⪢̸","NotNestedLessLess;":"⪡̸","notni;":"∌","notniva;":"∌","notnivb;":"⋾","notnivc;":"⋽","NotPrecedes;":"⊀","NotPrecedesEqual;":"⪯̸","NotPrecedesSlantEqual;":"⋠","NotReverseElement;":"∌","NotRightTriangle;":"⋫","NotRightTriangleBar;":"⧐̸","NotRightTriangleEqual;":"⋭","NotSquareSubset;":"⊏̸","NotSquareSubsetEqual;":"⋢","NotSquareSuperset;":"⊐̸","NotSquareSupersetEqual;":"⋣","NotSubset;":"⊂⃒","NotSubsetEqual;":"⊈","NotSucceeds;":"⊁","NotSucceedsEqual;":"⪰̸","NotSucceedsSlantEqual;":"⋡","NotSucceedsTilde;":"≿̸","NotSuperset;":"⊃⃒","NotSupersetEqual;":"⊉","NotTilde;":"≁","NotTildeEqual;":"≄","NotTildeFullEqual;":"≇","NotTildeTilde;":"≉","NotVerticalBar;":"∤","npar;":"∦","nparallel;":"∦","nparsl;":"⫽⃥","npart;":"∂̸","npolint;":"⨔","npr;":"⊀","nprcue;":"⋠","npre;":"⪯̸","nprec;":"⊀","npreceq;":"⪯̸","nrArr;":"⇏","nrarr;":"↛","nrarrc;":"⤳̸","nrarrw;":"↝̸","nRightarrow;":"⇏","nrightarrow;":"↛","nrtri;":"⋫","nrtrie;":"⋭","nsc;":"⊁","nsccue;":"⋡","nsce;":"⪰̸","Nscr;":"𝒩","nscr;":"𝓃","nshortmid;":"∤","nshortparallel;":"∦","nsim;":"≁","nsime;":"≄","nsimeq;":"≄","nsmid;":"∤","nspar;":"∦","nsqsube;":"⋢","nsqsupe;":"⋣","nsub;":"⊄","nsubE;":"⫅̸","nsube;":"⊈","nsubset;":"⊂⃒","nsubseteq;":"⊈","nsubseteqq;":"⫅̸","nsucc;":"⊁","nsucceq;":"⪰̸","nsup;":"⊅","nsupE;":"⫆̸","nsupe;":"⊉","nsupset;":"⊃⃒","nsupseteq;":"⊉","nsupseteqq;":"⫆̸","ntgl;":"≹","Ntilde;":"Ñ",Ntilde:"Ñ","ntilde;":"ñ",ntilde:"ñ","ntlg;":"≸","ntriangleleft;":"⋪","ntrianglelefteq;":"⋬","ntriangleright;":"⋫","ntrianglerighteq;":"⋭","Nu;":"Ν","nu;":"ν","num;":"#","numero;":"№","numsp;":" ","nvap;":"≍⃒","nVDash;":"⊯","nVdash;":"⊮","nvDash;":"⊭","nvdash;":"⊬","nvge;":"≥⃒","nvgt;":">⃒","nvHarr;":"⤄","nvinfin;":"⧞","nvlArr;":"⤂","nvle;":"≤⃒","nvlt;":"<⃒","nvltrie;":"⊴⃒","nvrArr;":"⤃","nvrtrie;":"⊵⃒","nvsim;":"∼⃒","nwarhk;":"⤣","nwArr;":"⇖","nwarr;":"↖","nwarrow;":"↖","nwnear;":"⤧","Oacute;":"Ó",Oacute:"Ó","oacute;":"ó",oacute:"ó","oast;":"⊛","ocir;":"⊚","Ocirc;":"Ô",Ocirc:"Ô","ocirc;":"ô",ocirc:"ô","Ocy;":"О","ocy;":"о","odash;":"⊝","Odblac;":"Ő","odblac;":"ő","odiv;":"⨸","odot;":"⊙","odsold;":"⦼","OElig;":"Œ","oelig;":"œ","ofcir;":"⦿","Ofr;":"𝔒","ofr;":"𝔬","ogon;":"˛","Ograve;":"Ò",Ograve:"Ò","ograve;":"ò",ograve:"ò","ogt;":"⧁","ohbar;":"⦵","ohm;":"Ω","oint;":"∮","olarr;":"↺","olcir;":"⦾","olcross;":"⦻","oline;":"‾","olt;":"⧀","Omacr;":"Ō","omacr;":"ō","Omega;":"Ω","omega;":"ω","Omicron;":"Ο","omicron;":"ο","omid;":"⦶","ominus;":"⊖","Oopf;":"𝕆","oopf;":"𝕠","opar;":"⦷","OpenCurlyDoubleQuote;":"“","OpenCurlyQuote;":"‘","operp;":"⦹","oplus;":"⊕","Or;":"⩔","or;":"∨","orarr;":"↻","ord;":"⩝","order;":"ℴ","orderof;":"ℴ","ordf;":"ª",ordf:"ª","ordm;":"º",ordm:"º","origof;":"⊶","oror;":"⩖","orslope;":"⩗","orv;":"⩛","oS;":"Ⓢ","Oscr;":"𝒪","oscr;":"ℴ","Oslash;":"Ø",Oslash:"Ø","oslash;":"ø",oslash:"ø","osol;":"⊘","Otilde;":"Õ",Otilde:"Õ","otilde;":"õ",otilde:"õ","Otimes;":"⨷","otimes;":"⊗","otimesas;":"⨶","Ouml;":"Ö",Ouml:"Ö","ouml;":"ö",ouml:"ö","ovbar;":"⌽","OverBar;":"‾","OverBrace;":"⏞","OverBracket;":"⎴","OverParenthesis;":"⏜","par;":"∥","para;":"¶",para:"¶","parallel;":"∥","parsim;":"⫳","parsl;":"⫽","part;":"∂","PartialD;":"∂","Pcy;":"П","pcy;":"п","percnt;":"%","period;":".","permil;":"‰","perp;":"⊥","pertenk;":"‱","Pfr;":"𝔓","pfr;":"𝔭","Phi;":"Φ","phi;":"φ","phiv;":"ϕ","phmmat;":"ℳ","phone;":"☎","Pi;":"Π","pi;":"π","pitchfork;":"⋔","piv;":"ϖ","planck;":"ℏ","planckh;":"ℎ","plankv;":"ℏ","plus;":"+","plusacir;":"⨣","plusb;":"⊞","pluscir;":"⨢","plusdo;":"∔","plusdu;":"⨥","pluse;":"⩲","PlusMinus;":"±","plusmn;":"±",plusmn:"±","plussim;":"⨦","plustwo;":"⨧","pm;":"±","Poincareplane;":"ℌ","pointint;":"⨕","Popf;":"ℙ","popf;":"𝕡","pound;":"£",pound:"£","Pr;":"⪻","pr;":"≺","prap;":"⪷","prcue;":"≼","prE;":"⪳","pre;":"⪯","prec;":"≺","precapprox;":"⪷","preccurlyeq;":"≼","Precedes;":"≺","PrecedesEqual;":"⪯","PrecedesSlantEqual;":"≼","PrecedesTilde;":"≾","preceq;":"⪯","precnapprox;":"⪹","precneqq;":"⪵","precnsim;":"⋨","precsim;":"≾","Prime;":"″","prime;":"′","primes;":"ℙ","prnap;":"⪹","prnE;":"⪵","prnsim;":"⋨","prod;":"∏","Product;":"∏","profalar;":"⌮","profline;":"⌒","profsurf;":"⌓","prop;":"∝","Proportion;":"∷","Proportional;":"∝","propto;":"∝","prsim;":"≾","prurel;":"⊰","Pscr;":"𝒫","pscr;":"𝓅","Psi;":"Ψ","psi;":"ψ","puncsp;":" ","Qfr;":"𝔔","qfr;":"𝔮","qint;":"⨌","Qopf;":"ℚ","qopf;":"𝕢","qprime;":"⁗","Qscr;":"𝒬","qscr;":"𝓆","quaternions;":"ℍ","quatint;":"⨖","quest;":"?","questeq;":"≟","QUOT;":'"',QUOT:'"',"quot;":'"',quot:'"',"rAarr;":"⇛","race;":"∽̱","Racute;":"Ŕ","racute;":"ŕ","radic;":"√","raemptyv;":"⦳","Rang;":"⟫","rang;":"⟩","rangd;":"⦒","range;":"⦥","rangle;":"⟩","raquo;":"»",raquo:"»","Rarr;":"↠","rArr;":"⇒","rarr;":"→","rarrap;":"⥵","rarrb;":"⇥","rarrbfs;":"⤠","rarrc;":"⤳","rarrfs;":"⤞","rarrhk;":"↪","rarrlp;":"↬","rarrpl;":"⥅","rarrsim;":"⥴","Rarrtl;":"⤖","rarrtl;":"↣","rarrw;":"↝","rAtail;":"⤜","ratail;":"⤚","ratio;":"∶","rationals;":"ℚ","RBarr;":"⤐","rBarr;":"⤏","rbarr;":"⤍","rbbrk;":"❳","rbrace;":"}","rbrack;":"]","rbrke;":"⦌","rbrksld;":"⦎","rbrkslu;":"⦐","Rcaron;":"Ř","rcaron;":"ř","Rcedil;":"Ŗ","rcedil;":"ŗ","rceil;":"⌉","rcub;":"}","Rcy;":"Р","rcy;":"р","rdca;":"⤷","rdldhar;":"⥩","rdquo;":"”","rdquor;":"”","rdsh;":"↳","Re;":"ℜ","real;":"ℜ","realine;":"ℛ","realpart;":"ℜ","reals;":"ℝ","rect;":"▭","REG;":"®",REG:"®","reg;":"®",reg:"®","ReverseElement;":"∋","ReverseEquilibrium;":"⇋","ReverseUpEquilibrium;":"⥯","rfisht;":"⥽","rfloor;":"⌋","Rfr;":"ℜ","rfr;":"𝔯","rHar;":"⥤","rhard;":"⇁","rharu;":"⇀","rharul;":"⥬","Rho;":"Ρ","rho;":"ρ","rhov;":"ϱ","RightAngleBracket;":"⟩","RightArrow;":"→","Rightarrow;":"⇒","rightarrow;":"→","RightArrowBar;":"⇥","RightArrowLeftArrow;":"⇄","rightarrowtail;":"↣","RightCeiling;":"⌉","RightDoubleBracket;":"⟧","RightDownTeeVector;":"⥝","RightDownVector;":"⇂","RightDownVectorBar;":"⥕","RightFloor;":"⌋","rightharpoondown;":"⇁","rightharpoonup;":"⇀","rightleftarrows;":"⇄","rightleftharpoons;":"⇌","rightrightarrows;":"⇉","rightsquigarrow;":"↝","RightTee;":"⊢","RightTeeArrow;":"↦","RightTeeVector;":"⥛","rightthreetimes;":"⋌","RightTriangle;":"⊳","RightTriangleBar;":"⧐","RightTriangleEqual;":"⊵","RightUpDownVector;":"⥏","RightUpTeeVector;":"⥜","RightUpVector;":"↾","RightUpVectorBar;":"⥔","RightVector;":"⇀","RightVectorBar;":"⥓","ring;":"˚","risingdotseq;":"≓","rlarr;":"⇄","rlhar;":"⇌","rlm;":"‏","rmoust;":"⎱","rmoustache;":"⎱","rnmid;":"⫮","roang;":"⟭","roarr;":"⇾","robrk;":"⟧","ropar;":"⦆","Ropf;":"ℝ","ropf;":"𝕣","roplus;":"⨮","rotimes;":"⨵","RoundImplies;":"⥰","rpar;":")","rpargt;":"⦔","rppolint;":"⨒","rrarr;":"⇉","Rrightarrow;":"⇛","rsaquo;":"›","Rscr;":"ℛ","rscr;":"𝓇","Rsh;":"↱","rsh;":"↱","rsqb;":"]","rsquo;":"’","rsquor;":"’","rthree;":"⋌","rtimes;":"⋊","rtri;":"▹","rtrie;":"⊵","rtrif;":"▸","rtriltri;":"⧎","RuleDelayed;":"⧴","ruluhar;":"⥨","rx;":"℞","Sacute;":"Ś","sacute;":"ś","sbquo;":"‚","Sc;":"⪼","sc;":"≻","scap;":"⪸","Scaron;":"Š","scaron;":"š","sccue;":"≽","scE;":"⪴","sce;":"⪰","Scedil;":"Ş","scedil;":"ş","Scirc;":"Ŝ","scirc;":"ŝ","scnap;":"⪺","scnE;":"⪶","scnsim;":"⋩","scpolint;":"⨓","scsim;":"≿","Scy;":"С","scy;":"с","sdot;":"⋅","sdotb;":"⊡","sdote;":"⩦","searhk;":"⤥","seArr;":"⇘","searr;":"↘","searrow;":"↘","sect;":"§",sect:"§","semi;":";","seswar;":"⤩","setminus;":"∖","setmn;":"∖","sext;":"✶","Sfr;":"𝔖","sfr;":"𝔰","sfrown;":"⌢","sharp;":"♯","SHCHcy;":"Щ","shchcy;":"щ","SHcy;":"Ш","shcy;":"ш","ShortDownArrow;":"↓","ShortLeftArrow;":"←","shortmid;":"∣","shortparallel;":"∥","ShortRightArrow;":"→","ShortUpArrow;":"↑","shy;":"­",shy:"­","Sigma;":"Σ","sigma;":"σ","sigmaf;":"ς","sigmav;":"ς","sim;":"∼","simdot;":"⩪","sime;":"≃","simeq;":"≃","simg;":"⪞","simgE;":"⪠","siml;":"⪝","simlE;":"⪟","simne;":"≆","simplus;":"⨤","simrarr;":"⥲","slarr;":"←","SmallCircle;":"∘","smallsetminus;":"∖","smashp;":"⨳","smeparsl;":"⧤","smid;":"∣","smile;":"⌣","smt;":"⪪","smte;":"⪬","smtes;":"⪬︀","SOFTcy;":"Ь","softcy;":"ь","sol;":"/","solb;":"⧄","solbar;":"⌿","Sopf;":"𝕊","sopf;":"𝕤","spades;":"♠","spadesuit;":"♠","spar;":"∥","sqcap;":"⊓","sqcaps;":"⊓︀","sqcup;":"⊔","sqcups;":"⊔︀","Sqrt;":"√","sqsub;":"⊏","sqsube;":"⊑","sqsubset;":"⊏","sqsubseteq;":"⊑","sqsup;":"⊐","sqsupe;":"⊒","sqsupset;":"⊐","sqsupseteq;":"⊒","squ;":"□","Square;":"□","square;":"□","SquareIntersection;":"⊓","SquareSubset;":"⊏","SquareSubsetEqual;":"⊑","SquareSuperset;":"⊐","SquareSupersetEqual;":"⊒","SquareUnion;":"⊔","squarf;":"▪","squf;":"▪","srarr;":"→","Sscr;":"𝒮","sscr;":"𝓈","ssetmn;":"∖","ssmile;":"⌣","sstarf;":"⋆","Star;":"⋆","star;":"☆","starf;":"★","straightepsilon;":"ϵ","straightphi;":"ϕ","strns;":"¯","Sub;":"⋐","sub;":"⊂","subdot;":"⪽","subE;":"⫅","sube;":"⊆","subedot;":"⫃","submult;":"⫁","subnE;":"⫋","subne;":"⊊","subplus;":"⪿","subrarr;":"⥹","Subset;":"⋐","subset;":"⊂","subseteq;":"⊆","subseteqq;":"⫅","SubsetEqual;":"⊆","subsetneq;":"⊊","subsetneqq;":"⫋","subsim;":"⫇","subsub;":"⫕","subsup;":"⫓","succ;":"≻","succapprox;":"⪸","succcurlyeq;":"≽","Succeeds;":"≻","SucceedsEqual;":"⪰","SucceedsSlantEqual;":"≽","SucceedsTilde;":"≿","succeq;":"⪰","succnapprox;":"⪺","succneqq;":"⪶","succnsim;":"⋩","succsim;":"≿","SuchThat;":"∋","Sum;":"∑","sum;":"∑","sung;":"♪","Sup;":"⋑","sup;":"⊃","sup1;":"¹",sup1:"¹","sup2;":"²",sup2:"²","sup3;":"³",sup3:"³","supdot;":"⪾","supdsub;":"⫘","supE;":"⫆","supe;":"⊇","supedot;":"⫄","Superset;":"⊃","SupersetEqual;":"⊇","suphsol;":"⟉","suphsub;":"⫗","suplarr;":"⥻","supmult;":"⫂","supnE;":"⫌","supne;":"⊋","supplus;":"⫀","Supset;":"⋑","supset;":"⊃","supseteq;":"⊇","supseteqq;":"⫆","supsetneq;":"⊋","supsetneqq;":"⫌","supsim;":"⫈","supsub;":"⫔","supsup;":"⫖","swarhk;":"⤦","swArr;":"⇙","swarr;":"↙","swarrow;":"↙","swnwar;":"⤪","szlig;":"ß",szlig:"ß","Tab;":"\t","target;":"⌖","Tau;":"Τ","tau;":"τ","tbrk;":"⎴","Tcaron;":"Ť","tcaron;":"ť","Tcedil;":"Ţ","tcedil;":"ţ","Tcy;":"Т","tcy;":"т","tdot;":"⃛","telrec;":"⌕","Tfr;":"𝔗","tfr;":"𝔱","there4;":"∴","Therefore;":"∴","therefore;":"∴","Theta;":"Θ","theta;":"θ","thetasym;":"ϑ","thetav;":"ϑ","thickapprox;":"≈","thicksim;":"∼","ThickSpace;":"  ","thinsp;":" ","ThinSpace;":" ","thkap;":"≈","thksim;":"∼","THORN;":"Þ",THORN:"Þ","thorn;":"þ",thorn:"þ","Tilde;":"∼","tilde;":"˜","TildeEqual;":"≃","TildeFullEqual;":"≅","TildeTilde;":"≈","times;":"×",times:"×","timesb;":"⊠","timesbar;":"⨱","timesd;":"⨰","tint;":"∭","toea;":"⤨","top;":"⊤","topbot;":"⌶","topcir;":"⫱","Topf;":"𝕋","topf;":"𝕥","topfork;":"⫚","tosa;":"⤩","tprime;":"‴","TRADE;":"™","trade;":"™","triangle;":"▵","triangledown;":"▿","triangleleft;":"◃","trianglelefteq;":"⊴","triangleq;":"≜","triangleright;":"▹","trianglerighteq;":"⊵","tridot;":"◬","trie;":"≜","triminus;":"⨺","TripleDot;":"⃛","triplus;":"⨹","trisb;":"⧍","tritime;":"⨻","trpezium;":"⏢","Tscr;":"𝒯","tscr;":"𝓉","TScy;":"Ц","tscy;":"ц","TSHcy;":"Ћ","tshcy;":"ћ","Tstrok;":"Ŧ","tstrok;":"ŧ","twixt;":"≬","twoheadleftarrow;":"↞","twoheadrightarrow;":"↠","Uacute;":"Ú",Uacute:"Ú","uacute;":"ú",uacute:"ú","Uarr;":"↟","uArr;":"⇑","uarr;":"↑","Uarrocir;":"⥉","Ubrcy;":"Ў","ubrcy;":"ў","Ubreve;":"Ŭ","ubreve;":"ŭ","Ucirc;":"Û",Ucirc:"Û","ucirc;":"û",ucirc:"û","Ucy;":"У","ucy;":"у","udarr;":"⇅","Udblac;":"Ű","udblac;":"ű","udhar;":"⥮","ufisht;":"⥾","Ufr;":"𝔘","ufr;":"𝔲","Ugrave;":"Ù",Ugrave:"Ù","ugrave;":"ù",ugrave:"ù","uHar;":"⥣","uharl;":"↿","uharr;":"↾","uhblk;":"▀","ulcorn;":"⌜","ulcorner;":"⌜","ulcrop;":"⌏","ultri;":"◸","Umacr;":"Ū","umacr;":"ū","uml;":"¨",uml:"¨","UnderBar;":"_","UnderBrace;":"⏟","UnderBracket;":"⎵","UnderParenthesis;":"⏝","Union;":"⋃","UnionPlus;":"⊎","Uogon;":"Ų","uogon;":"ų","Uopf;":"𝕌","uopf;":"𝕦","UpArrow;":"↑","Uparrow;":"⇑","uparrow;":"↑","UpArrowBar;":"⤒","UpArrowDownArrow;":"⇅","UpDownArrow;":"↕","Updownarrow;":"⇕","updownarrow;":"↕","UpEquilibrium;":"⥮","upharpoonleft;":"↿","upharpoonright;":"↾","uplus;":"⊎","UpperLeftArrow;":"↖","UpperRightArrow;":"↗","Upsi;":"ϒ","upsi;":"υ","upsih;":"ϒ","Upsilon;":"Υ","upsilon;":"υ","UpTee;":"⊥","UpTeeArrow;":"↥","upuparrows;":"⇈","urcorn;":"⌝","urcorner;":"⌝","urcrop;":"⌎","Uring;":"Ů","uring;":"ů","urtri;":"◹","Uscr;":"𝒰","uscr;":"𝓊","utdot;":"⋰","Utilde;":"Ũ","utilde;":"ũ","utri;":"▵","utrif;":"▴","uuarr;":"⇈","Uuml;":"Ü",Uuml:"Ü","uuml;":"ü",uuml:"ü","uwangle;":"⦧","vangrt;":"⦜","varepsilon;":"ϵ","varkappa;":"ϰ","varnothing;":"∅","varphi;":"ϕ","varpi;":"ϖ","varpropto;":"∝","vArr;":"⇕","varr;":"↕","varrho;":"ϱ","varsigma;":"ς","varsubsetneq;":"⊊︀","varsubsetneqq;":"⫋︀","varsupsetneq;":"⊋︀","varsupsetneqq;":"⫌︀","vartheta;":"ϑ","vartriangleleft;":"⊲","vartriangleright;":"⊳","Vbar;":"⫫","vBar;":"⫨","vBarv;":"⫩","Vcy;":"В","vcy;":"в","VDash;":"⊫","Vdash;":"⊩","vDash;":"⊨","vdash;":"⊢","Vdashl;":"⫦","Vee;":"⋁","vee;":"∨","veebar;":"⊻","veeeq;":"≚","vellip;":"⋮","Verbar;":"‖","verbar;":"|","Vert;":"‖","vert;":"|","VerticalBar;":"∣","VerticalLine;":"|","VerticalSeparator;":"❘","VerticalTilde;":"≀","VeryThinSpace;":" ","Vfr;":"𝔙","vfr;":"𝔳","vltri;":"⊲","vnsub;":"⊂⃒","vnsup;":"⊃⃒","Vopf;":"𝕍","vopf;":"𝕧","vprop;":"∝","vrtri;":"⊳","Vscr;":"𝒱","vscr;":"𝓋","vsubnE;":"⫋︀","vsubne;":"⊊︀","vsupnE;":"⫌︀","vsupne;":"⊋︀","Vvdash;":"⊪","vzigzag;":"⦚","Wcirc;":"Ŵ","wcirc;":"ŵ","wedbar;":"⩟","Wedge;":"⋀","wedge;":"∧","wedgeq;":"≙","weierp;":"℘","Wfr;":"𝔚","wfr;":"𝔴","Wopf;":"𝕎","wopf;":"𝕨","wp;":"℘","wr;":"≀","wreath;":"≀","Wscr;":"𝒲","wscr;":"𝓌","xcap;":"⋂","xcirc;":"◯","xcup;":"⋃","xdtri;":"▽","Xfr;":"𝔛","xfr;":"𝔵","xhArr;":"⟺","xharr;":"⟷","Xi;":"Ξ","xi;":"ξ","xlArr;":"⟸","xlarr;":"⟵","xmap;":"⟼","xnis;":"⋻","xodot;":"⨀","Xopf;":"𝕏","xopf;":"𝕩","xoplus;":"⨁","xotime;":"⨂","xrArr;":"⟹","xrarr;":"⟶","Xscr;":"𝒳","xscr;":"𝓍","xsqcup;":"⨆","xuplus;":"⨄","xutri;":"△","xvee;":"⋁","xwedge;":"⋀","Yacute;":"Ý",Yacute:"Ý","yacute;":"ý",yacute:"ý","YAcy;":"Я","yacy;":"я","Ycirc;":"Ŷ","ycirc;":"ŷ","Ycy;":"Ы","ycy;":"ы","yen;":"¥",yen:"¥","Yfr;":"𝔜","yfr;":"𝔶","YIcy;":"Ї","yicy;":"ї","Yopf;":"𝕐","yopf;":"𝕪","Yscr;":"𝒴","yscr;":"𝓎","YUcy;":"Ю","yucy;":"ю","Yuml;":"Ÿ","yuml;":"ÿ",yuml:"ÿ","Zacute;":"Ź","zacute;":"ź","Zcaron;":"Ž","zcaron;":"ž","Zcy;":"З","zcy;":"з","Zdot;":"Ż","zdot;":"ż","zeetrf;":"ℨ","ZeroWidthSpace;":"​","Zeta;":"Ζ","zeta;":"ζ","Zfr;":"ℨ","zfr;":"𝔷","ZHcy;":"Ж","zhcy;":"ж","zigrarr;":"⇝","Zopf;":"ℤ","zopf;":"𝕫","Zscr;":"𝒵","zscr;":"𝓏","zwj;":"‍","zwnj;":"‌"},ne=D(Object.freeze({__proto__:null,Aacute:"Á",aacute:"á",Acirc:"Â",acirc:"â",acute:"´",AElig:"Æ",aelig:"æ",Agrave:"À",agrave:"à",AMP:"&",amp:"&",Aring:"Å",aring:"å",Atilde:"Ã",atilde:"ã",Auml:"Ä",auml:"ä",brvbar:"¦",Ccedil:"Ç",ccedil:"ç",cedil:"¸",cent:"¢",COPY:"©",copy:"©",curren:"¤",deg:"°",divide:"÷",Eacute:"É",eacute:"é",Ecirc:"Ê",ecirc:"ê",Egrave:"È",egrave:"è",ETH:"Ð",eth:"ð",Euml:"Ë",euml:"ë",frac12:"½",frac14:"¼",frac34:"¾",GT:">",gt:">",Iacute:"Í",iacute:"í",Icirc:"Î",icirc:"î",iexcl:"¡",Igrave:"Ì",igrave:"ì",iquest:"¿",Iuml:"Ï",iuml:"ï",laquo:"«",LT:"<",lt:"<",macr:"¯",micro:"µ",middot:"·",nbsp:" ",not:"¬",Ntilde:"Ñ",ntilde:"ñ",Oacute:"Ó",oacute:"ó",Ocirc:"Ô",ocirc:"ô",Ograve:"Ò",ograve:"ò",ordf:"ª",ordm:"º",Oslash:"Ø",oslash:"ø",Otilde:"Õ",otilde:"õ",Ouml:"Ö",ouml:"ö",para:"¶",plusmn:"±",pound:"£",QUOT:'"',quot:'"',raquo:"»",REG:"®",reg:"®",sect:"§",shy:"­",sup1:"¹",sup2:"²",sup3:"³",szlig:"ß",THORN:"Þ",thorn:"þ",times:"×",Uacute:"Ú",uacute:"ú",Ucirc:"Û",ucirc:"û",Ugrave:"Ù",ugrave:"ù",uml:"¨",Uuml:"Ü",uuml:"ü",Yacute:"Ý",yacute:"ý",yen:"¥",yuml:"ÿ",default:te}));var ae={encode:ee,decode:function(r){if("string"!=typeof r)throw new TypeError("Expected a String");return r.replace(/&(#?[^;\W]+;?)/g,(function(r,e){var t;if(t=/^#(\d+);?$/.exec(e))return Xr.ucs2.encode([parseInt(t[1],10)]);if(t=/^#[Xx]([A-Fa-f0-9]+);?/.exec(e))return Xr.ucs2.encode([parseInt(t[1],16)]);var n=/;$/.test(e),a=n?e.replace(/;$/,""):e,o=ne[a]||n&&ne[e];return "number"==typeof o?Xr.ucs2.encode([o]):"string"==typeof o?o:"&"+e}))}};!function(r,e,t){r(t={path:e,exports:{},require:function(r,e){return function(){throw new Error("Dynamic requires are not currently supported by @rollup/plugin-commonjs")}(null==e&&t.path)}},t.exports),t.exports;}((function(e,t){var n="[object Arguments]",a="[object Function]",o="[object GeneratorFunction]",i="[object Map]",s="[object Set]",c=/\w*$/,l=/^\[object .+?Constructor\]$/,u=/^(?:0|[1-9]\d*)$/,p={};p[n]=p["[object Array]"]=p["[object ArrayBuffer]"]=p["[object DataView]"]=p["[object Boolean]"]=p["[object Date]"]=p["[object Float32Array]"]=p["[object Float64Array]"]=p["[object Int8Array]"]=p["[object Int16Array]"]=p["[object Int32Array]"]=p[i]=p["[object Number]"]=p["[object Object]"]=p["[object RegExp]"]=p[s]=p["[object String]"]=p["[object Symbol]"]=p["[object Uint8Array]"]=p["[object Uint8ClampedArray]"]=p["[object Uint16Array]"]=p["[object Uint32Array]"]=!0,p["[object Error]"]=p[a]=p["[object WeakMap]"]=!1;var f="object"==r(x)&&x&&x.Object===Object&&x,g="object"==("undefined"==typeof self?"undefined":r(self))&&self&&self.Object===Object&&self,d=f||g||Function("return this")(),h=t&&!t.nodeType&&t,m=h&&e&&!e.nodeType&&e,b=m&&m.exports===h;function y(r,e){return r.set(e[0],e[1]),r}function v(r,e){return r.add(e),r}function w(r,e,t,n){var a=-1,o=r?r.length:0;for(n&&o&&(t=r[++a]);++a<o;)t=e(t,r[a],a,r);return t}function q(r){var e=!1;if(null!=r&&"function"!=typeof r.toString)try{e=!!(r+"");}catch(r){}return e}function A(r){var e=-1,t=Array(r.size);return r.forEach((function(r,n){t[++e]=[n,r];})),t}function T(r,e){return function(t){return r(e(t))}}function E(r){var e=-1,t=Array(r.size);return r.forEach((function(r){t[++e]=r;})),t}var k=Array.prototype,O=Function.prototype,S=Object.prototype,_=d["__core-js_shared__"],D=function(){var r=/[^.]+$/.exec(_&&_.keys&&_.keys.IE_PROTO||"");return r?"Symbol(src)_1."+r:""}(),L=O.toString,j=S.hasOwnProperty,R=S.toString,N=RegExp("^"+L.call(j).replace(/[\\^$.*+?()[\]{}|]/g,"\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g,"$1.*?")+"$"),C=b?d.Buffer:void 0,I=d.Symbol,B=d.Uint8Array,H=T(Object.getPrototypeOf,Object),U=Object.create,V=S.propertyIsEnumerable,P=k.splice,W=Object.getOwnPropertySymbols,F=C?C.isBuffer:void 0,G=T(Object.keys,Object),z=mr(d,"DataView"),J=mr(d,"Map"),M=mr(d,"Promise"),$=mr(d,"Set"),Y=mr(d,"WeakMap"),Z=mr(Object,"create"),K=qr(z),Q=qr(J),X=qr(M),rr=qr($),er=qr(Y),tr=I?I.prototype:void 0,nr=tr?tr.valueOf:void 0;function ar(r){var e=-1,t=r?r.length:0;for(this.clear();++e<t;){var n=r[e];this.set(n[0],n[1]);}}function or(r){var e=-1,t=r?r.length:0;for(this.clear();++e<t;){var n=r[e];this.set(n[0],n[1]);}}function ir(r){var e=-1,t=r?r.length:0;for(this.clear();++e<t;){var n=r[e];this.set(n[0],n[1]);}}function sr(r){this.__data__=new or(r);}function cr(e,t){var a=Tr(e)||function(e){return function(e){return function(e){return !!e&&"object"==r(e)}(e)&&Er(e)}(e)&&j.call(e,"callee")&&(!V.call(e,"callee")||R.call(e)==n)}(e)?function(r,e){for(var t=-1,n=Array(r);++t<r;)n[t]=e(t);return n}(e.length,String):[],o=a.length,i=!!o;for(var s in e)!t&&!j.call(e,s)||i&&("length"==s||vr(s,o))||a.push(s);return a}function lr(r,e,t){var n=r[e];j.call(r,e)&&Ar(n,t)&&(void 0!==t||e in r)||(r[e]=t);}function ur(r,e){for(var t=r.length;t--;)if(Ar(r[t][0],e))return t;return -1}function pr(r,e,t,l,u,f,g){var d;if(l&&(d=f?l(r,u,f,g):l(r)),void 0!==d)return d;if(!Sr(r))return r;var h=Tr(r);if(h){if(d=function(r){var e=r.length,t=r.constructor(e);e&&"string"==typeof r[0]&&j.call(r,"index")&&(t.index=r.index,t.input=r.input);return t}(r),!e)return function(r,e){var t=-1,n=r.length;e||(e=Array(n));for(;++t<n;)e[t]=r[t];return e}(r,d)}else {var m=yr(r),b=m==a||m==o;if(kr(r))return function(r,e){if(e)return r.slice();var t=new r.constructor(r.length);return r.copy(t),t}(r,e);if("[object Object]"==m||m==n||b&&!f){if(q(r))return f?r:{};if(d=function(r){return "function"!=typeof r.constructor||wr(r)?{}:(e=H(r),Sr(e)?U(e):{});var e;}(b?{}:r),!e)return function(r,e){return dr(r,br(r),e)}(r,function(r,e){return r&&dr(e,_r(e),r)}(d,r))}else {if(!p[m])return f?r:{};d=function(r,e,t,n){var a=r.constructor;switch(e){case"[object ArrayBuffer]":return gr(r);case"[object Boolean]":case"[object Date]":return new a(+r);case"[object DataView]":return function(r,e){var t=e?gr(r.buffer):r.buffer;return new r.constructor(t,r.byteOffset,r.byteLength)}(r,n);case"[object Float32Array]":case"[object Float64Array]":case"[object Int8Array]":case"[object Int16Array]":case"[object Int32Array]":case"[object Uint8Array]":case"[object Uint8ClampedArray]":case"[object Uint16Array]":case"[object Uint32Array]":return function(r,e){var t=e?gr(r.buffer):r.buffer;return new r.constructor(t,r.byteOffset,r.length)}(r,n);case i:return function(r,e,t){return w(e?t(A(r),!0):A(r),y,new r.constructor)}(r,n,t);case"[object Number]":case"[object String]":return new a(r);case"[object RegExp]":return function(r){var e=new r.constructor(r.source,c.exec(r));return e.lastIndex=r.lastIndex,e}(r);case s:return function(r,e,t){return w(e?t(E(r),!0):E(r),v,new r.constructor)}(r,n,t);case"[object Symbol]":return o=r,nr?Object(nr.call(o)):{}}var o;}(r,m,pr,e);}}g||(g=new sr);var T=g.get(r);if(T)return T;if(g.set(r,d),!h)var k=t?function(r){return function(r,e,t){var n=e(r);return Tr(r)?n:function(r,e){for(var t=-1,n=e.length,a=r.length;++t<n;)r[a+t]=e[t];return r}(n,t(r))}(r,_r,br)}(r):_r(r);return function(r,e){for(var t=-1,n=r?r.length:0;++t<n&&!1!==e(r[t],t,r););}(k||r,(function(n,a){k&&(n=r[a=n]),lr(d,a,pr(n,e,t,l,a,r,g));})),d}function fr(r){return !(!Sr(r)||function(r){return !!D&&D in r}(r))&&(Or(r)||q(r)?N:l).test(qr(r))}function gr(r){var e=new r.constructor(r.byteLength);return new B(e).set(new B(r)),e}function dr(r,e,t,n){t||(t={});for(var a=-1,o=e.length;++a<o;){var i=e[a],s=n?n(t[i],r[i],i,t,r):void 0;lr(t,i,void 0===s?r[i]:s);}return t}function hr(e,t){var n,a,o=e.__data__;return ("string"==(a=r(n=t))||"number"==a||"symbol"==a||"boolean"==a?"__proto__"!==n:null===n)?o["string"==typeof t?"string":"hash"]:o.map}function mr(r,e){var t=function(r,e){return null==r?void 0:r[e]}(r,e);return fr(t)?t:void 0}ar.prototype.clear=function(){this.__data__=Z?Z(null):{};},ar.prototype.delete=function(r){return this.has(r)&&delete this.__data__[r]},ar.prototype.get=function(r){var e=this.__data__;if(Z){var t=e[r];return "__lodash_hash_undefined__"===t?void 0:t}return j.call(e,r)?e[r]:void 0},ar.prototype.has=function(r){var e=this.__data__;return Z?void 0!==e[r]:j.call(e,r)},ar.prototype.set=function(r,e){return this.__data__[r]=Z&&void 0===e?"__lodash_hash_undefined__":e,this},or.prototype.clear=function(){this.__data__=[];},or.prototype.delete=function(r){var e=this.__data__,t=ur(e,r);return !(t<0)&&(t==e.length-1?e.pop():P.call(e,t,1),!0)},or.prototype.get=function(r){var e=this.__data__,t=ur(e,r);return t<0?void 0:e[t][1]},or.prototype.has=function(r){return ur(this.__data__,r)>-1},or.prototype.set=function(r,e){var t=this.__data__,n=ur(t,r);return n<0?t.push([r,e]):t[n][1]=e,this},ir.prototype.clear=function(){this.__data__={hash:new ar,map:new(J||or),string:new ar};},ir.prototype.delete=function(r){return hr(this,r).delete(r)},ir.prototype.get=function(r){return hr(this,r).get(r)},ir.prototype.has=function(r){return hr(this,r).has(r)},ir.prototype.set=function(r,e){return hr(this,r).set(r,e),this},sr.prototype.clear=function(){this.__data__=new or;},sr.prototype.delete=function(r){return this.__data__.delete(r)},sr.prototype.get=function(r){return this.__data__.get(r)},sr.prototype.has=function(r){return this.__data__.has(r)},sr.prototype.set=function(r,e){var t=this.__data__;if(t instanceof or){var n=t.__data__;if(!J||n.length<199)return n.push([r,e]),this;t=this.__data__=new ir(n);}return t.set(r,e),this};var br=W?T(W,Object):function(){return []},yr=function(r){return R.call(r)};function vr(r,e){return !!(e=null==e?9007199254740991:e)&&("number"==typeof r||u.test(r))&&r>-1&&r%1==0&&r<e}function wr(r){var e=r&&r.constructor;return r===("function"==typeof e&&e.prototype||S)}function qr(r){if(null!=r){try{return L.call(r)}catch(r){}try{return r+""}catch(r){}}return ""}function Ar(r,e){return r===e||r!=r&&e!=e}(z&&"[object DataView]"!=yr(new z(new ArrayBuffer(1)))||J&&yr(new J)!=i||M&&"[object Promise]"!=yr(M.resolve())||$&&yr(new $)!=s||Y&&"[object WeakMap]"!=yr(new Y))&&(yr=function(r){var e=R.call(r),t="[object Object]"==e?r.constructor:void 0,n=t?qr(t):void 0;if(n)switch(n){case K:return "[object DataView]";case Q:return i;case X:return "[object Promise]";case rr:return s;case er:return "[object WeakMap]"}return e});var Tr=Array.isArray;function Er(r){return null!=r&&function(r){return "number"==typeof r&&r>-1&&r%1==0&&r<=9007199254740991}(r.length)&&!Or(r)}var kr=F||function(){return !1};function Or(r){var e=Sr(r)?R.call(r):"";return e==a||e==o}function Sr(e){var t=r(e);return !!e&&("object"==t||"function"==t)}function _r(r){return Er(r)?cr(r):function(r){if(!wr(r))return G(r);var e=[];for(var t in Object(r))j.call(r,t)&&"constructor"!=t&&e.push(t);return e}(r)}e.exports=function(r){return pr(r,!0,!0)};}));function oe(r,e){return function(r,e,t){if("string"!=typeof r||!r.length)return null;if(e&&"number"==typeof e||(e=0),!r[e+1])return null;if(r[e+1]&&(!t&&r[e+1].trim()||t&&(r[e+1].trim()||"\n\r".includes(r[e+1]))))return e+1;if(r[e+2]&&(!t&&r[e+2].trim()||t&&(r[e+2].trim()||"\n\r".includes(r[e+2]))))return e+2;for(var n=e+1,a=r.length;n<a;n++)if(r[n]&&(!t&&r[n].trim()||t&&(r[n].trim()||"\n\r".includes(r[n]))))return n;return null}(r,e,!1)}function ie(e,t){if(!e)return [];if(Array.isArray(e))return e.filter((function(r){return "string"==typeof r&&r.trim()}));if("string"==typeof e)return e.trim()?[e]:[];throw new TypeError("string-strip-html/stripHtml(): [THROW_ID_03] ".concat(t," must be array containing zero or more strings or something falsey. Currently it's equal to: ").concat(e,", that a type of ").concat(r(e),"."))}return function e(t,n){var i,s=new Set(["!doctype","abbr","address","area","article","aside","audio","base","bdi","bdo","blockquote","body","br","button","canvas","caption","cite","code","col","colgroup","data","datalist","dd","del","details","dfn","dialog","div","dl","doctype","dt","em","embed","fieldset","figcaption","figure","footer","form","h1","h2","h3","h4","h5","h6","head","header","hgroup","hr","html","iframe","img","input","ins","kbd","keygen","label","legend","li","link","main","map","mark","math","menu","menuitem","meta","meter","nav","noscript","object","ol","optgroup","option","output","param","picture","pre","progress","rb","rp","rt","rtc","ruby","samp","script","section","select","slot","small","source","span","strong","style","sub","summary","sup","svg","table","tbody","td","template","textarea","tfoot","th","thead","time","title","tr","track","ul","var","video","wbr","xml"]),c=new Set(["a","b","i","p","q","s","u"]),l=new Set([".",",","?",";",")","…",'"',"»"]),u=new Set(["script","style","xml"]),f={attributes:[]},g=null,d=null,h=[],m={},b={},v="",w=null;function q(r,e,n){if(Array.isArray(e.stripTogetherWithTheirContents)&&e.stripTogetherWithTheirContents.includes(f.name))if(Array.isArray(h)&&h.some((function(e){return e.name===f.name&&e.lastClosingBracketAt<r}))){for(var a=h.length;a--;)if(h[a].name===f.name){l.has(t[r])?e.cb({tag:f,deleteFrom:h[a].lastOpeningBracketAt,deleteTo:r,insert:null,rangesArr:n,proposedReturn:[h[a].lastOpeningBracketAt,r,null]}):e.cb({tag:f,deleteFrom:h[a].lastOpeningBracketAt,deleteTo:r,insert:"",rangesArr:n,proposedReturn:[h[a].lastOpeningBracketAt,r,""]}),h.splice(a,1);break}}else h.push(f);}function A(r,e,t,n,a,o){var i="";if(t<a&&(i+=r.slice(t,a)),n>o+1){var s=r.slice(o+1,n);s.includes("\n")&&"<"===r[n]?i+=" ":i+=s;}if(!l.has(r[e])&&"!"!==r[e]){var c=i.match(/\n/g);return Array.isArray(c)&&c.length?1===c.length?"\n":2===c.length?"\n\n":"\n\n\n":" "}return ""}function T(r){if(r.dumpLinkHrefsNearby.enabled&&Object.keys(b).length&&b.tagName===f.name&&f.lastOpeningBracketAt&&(b.openingTagEnds&&f.lastOpeningBracketAt>b.openingTagEnds||!b.openingTagEnds)&&(i=!0),i){var e=r.dumpLinkHrefsNearby.putOnNewLine?"\n\n":"";v="".concat(e).concat(b.hrefValue).concat(e);}}if("string"!=typeof t)throw new TypeError("string-strip-html/stripHtml(): [THROW_ID_01] Input must be string! Currently it's: ".concat(r(t).toLowerCase(),", equal to:\n").concat(JSON.stringify(t,null,4)));if(!t||!t.trim())return t;if(null!=n&&!_(n))throw new TypeError("string-strip-html/stripHtml(): [THROW_ID_02] Optional Options Object must be a plain object! Currently it's: ".concat(r(n).toLowerCase(),", equal to:\n").concat(JSON.stringify(n,null,4)));function E(){i&&(b={},i=!1);}var k={ignoreTags:[],onlyStripTags:[],stripTogetherWithTheirContents:o(u),skipHtmlDecoding:!1,returnRangesOnly:!1,trimOnlySpaces:!1,dumpLinkHrefsNearby:{enabled:!1,putOnNewLine:!1,wrapHeads:"",wrapTails:""},cb:null},O=a(a({},k),n);O.ignoreTags=ie(O.ignoreTags,"opts.ignoreTags"),O.onlyStripTags=ie(O.onlyStripTags,"opts.onlyStripTags");var S=!!O.onlyStripTags.length;if(O.onlyStripTags.length&&O.ignoreTags.length&&(O.onlyStripTags=Ir.apply(void 0,[O.onlyStripTags].concat(o(O.ignoreTags)))),_(O.dumpLinkHrefsNearby)||(O.dumpLinkHrefsNearby=a({},k.dumpLinkHrefsNearby)),O.dumpLinkHrefsNearby=k.dumpLinkHrefsNearby,_(n)&&Object.prototype.hasOwnProperty.call(n,"dumpLinkHrefsNearby")&&null!=n.dumpLinkHrefsNearby)if(_(n.dumpLinkHrefsNearby))O.dumpLinkHrefsNearby=a(a({},k.dumpLinkHrefsNearby),n.dumpLinkHrefsNearby);else if(n.dumpLinkHrefsNearby)throw new TypeError("string-strip-html/stripHtml(): [THROW_ID_04] Optional Options Object's key dumpLinkHrefsNearby was set to ".concat(r(n.dumpLinkHrefsNearby),", equal to ").concat(JSON.stringify(n.dumpLinkHrefsNearby,null,4),". The only allowed value is a plain object. See the API reference."));O.stripTogetherWithTheirContents?"string"==typeof O.stripTogetherWithTheirContents&&O.stripTogetherWithTheirContents.length>0&&(O.stripTogetherWithTheirContents=[O.stripTogetherWithTheirContents]):O.stripTogetherWithTheirContents=[];var x={};if(O.stripTogetherWithTheirContents&&Array.isArray(O.stripTogetherWithTheirContents)&&O.stripTogetherWithTheirContents.length&&!O.stripTogetherWithTheirContents.every((function(r,e){return "string"==typeof r||(x.el=r,x.i=e,!1)})))throw new TypeError("string-strip-html/stripHtml(): [THROW_ID_06] Optional Options Object's key stripTogetherWithTheirContents was set to contain not just string elements! For example, element at index ".concat(x.i," has a value ").concat(x.el," which is not string but ").concat(r(x.el).toLowerCase(),"."));O.cb||(O.cb=function(r){var e=r.rangesArr,t=r.proposedReturn;e.push.apply(e,o(t));});var D,L=new y({limitToBeAddedWhitespace:!0,limitLinebreaksCount:2});if(!O.skipHtmlDecoding)for(;t!==ae.decode(t);)t=ae.decode(t);O.trimOnlySpaces||(t=t.trim());for(var j=0,R=t.length;j<R;j++){if(Object.keys(f).length>1&&f.lastClosingBracketAt&&f.lastClosingBracketAt<j&&" "!==t[j]&&null===w&&(w=j),">"===t[j]&&(!f||Object.keys(f).length<2)&&j>1)for(var N=j;N--;){if(void 0===t[N-1]||">"===t[N])if("break"===function(){var r=void 0===t[N-1]?N:N+1,n=t.slice(r,j+1);if(t!=="<".concat(er(n.trim(),"/>"),">")&&o(s).some((function(r){return er(n.trim().split(" ").filter((function(r){return r.trim()})).filter((function(r,e){return 0===e})),"/>").toLowerCase()===r}))&&""===e("<".concat(n.trim(),">"),O)){var a=A(t,j,r,j+1,r,j+1),i=j+1;if(t[i]&&!t[i].trim())for(var c=i;c<R;c++)if(t[c].trim()){i=c;break}O.cb({tag:f,deleteFrom:r,deleteTo:i,insert:a,rangesArr:L,proposedReturn:[r,i,a]});}return "break"}())break}if("/"!==t[j]||f.quotes&&f.quotes.value||!Number.isInteger(f.lastOpeningBracketAt)||Number.isInteger(f.lastClosingBracketAt)||(f.slashPresent=j),'"'===t[j]||"'"===t[j])if(f.nameStarts&&f.quotes&&f.quotes.value&&f.quotes.value===t[j]){m.valueEnds=j,m.value=t.slice(m.valueStarts,j),f.attributes.push(m),m={},f.quotes=void 0;var C=void 0;O.dumpLinkHrefsNearby.enabled&&f.attributes.some((function(r){if(r.name&&"href"===r.name.toLowerCase())return C="".concat(O.dumpLinkHrefsNearby.wrapHeads||"").concat(r.value).concat(O.dumpLinkHrefsNearby.wrapTails||""),!0}))&&(b={tagName:f.name,hrefValue:C});}else !f.quotes&&f.nameStarts&&(f.quotes={},f.quotes.value=t[j],f.quotes.start=j,m.nameStarts&&m.nameEnds&&m.nameEnds<j&&m.nameStarts<j&&!m.valueStarts&&(m.name=t.slice(m.nameStarts,m.nameEnds)));if(!(void 0===f.nameStarts||void 0!==f.nameEnds||t[j].trim()&&(D=t[j],/[-_A-Za-z0-9]/.test(D)))){if(f.nameEnds=j,f.name=t.slice(f.nameStarts,f.nameEnds+(">"!==t[j]&&"/"!==t[j]&&void 0===t[j+1]?1:0)),"!"!==t[f.nameStarts-1]&&!f.name.replace(/-/g,"").length||/^\d+$/.test(f.name[0])){f={};continue}if("<"===t[j]){T(O);var I=A(t,j,f.leftOuterWhitespace,j,f.lastOpeningBracketAt,j);O.cb({tag:f,deleteFrom:f.leftOuterWhitespace,deleteTo:j,insert:"".concat(I).concat(v).concat(I),rangesArr:L,proposedReturn:[f.leftOuterWhitespace,j,"".concat(I).concat(v).concat(I)]}),E(),q(j,O,L);}}if(f.quotes&&f.quotes.start&&f.quotes.start<j&&!f.quotes.end&&m.nameEnds&&m.equalsAt&&!m.valueStarts&&(m.valueStarts=j),f.quotes||!m.nameEnds||"="!==t[j]||m.valueStarts||m.equalsAt||(m.equalsAt=j),!f.quotes&&m.nameStarts&&m.nameEnds&&!m.valueStarts&&t[j].trim()&&"="!==t[j]&&(f.attributes.push(m),m={}),f.quotes||!m.nameStarts||m.nameEnds||(t[j].trim()?"="===t[j]?m.equalsAt||(m.nameEnds=j,m.equalsAt=j,m.name=t.slice(m.nameStarts,m.nameEnds)):("/"===t[j]||">"===t[j]||"<"===t[j])&&(m.nameEnds=j,m.name=t.slice(m.nameStarts,m.nameEnds),f.attributes.push(m),m={}):(m.nameEnds=j,m.name=t.slice(m.nameStarts,m.nameEnds))),f.quotes||!(f.nameEnds<j)||t[j-1].trim()||!t[j].trim()||"<>/!".includes(t[j])||m.nameStarts||f.lastClosingBracketAt||(m.nameStarts=j),null!==f.lastOpeningBracketAt&&f.lastOpeningBracketAt<j&&"/"===t[j]&&f.onlyPlausible&&(f.onlyPlausible=!1),null!==f.lastOpeningBracketAt&&f.lastOpeningBracketAt<j&&"/"!==t[j]&&(void 0===f.onlyPlausible&&(t[j].trim()&&"<"!==t[j]||f.slashPresent?f.onlyPlausible=!1:f.onlyPlausible=!0),t[j].trim()&&void 0===f.nameStarts&&"<"!==t[j]&&"/"!==t[j]&&">"!==t[j]&&"!"!==t[j]&&(f.nameStarts=j,f.nameContainsLetters=!1)),f.nameStarts&&!f.quotes&&t[j].toLowerCase()!==t[j].toUpperCase()&&(f.nameContainsLetters=!0),">"===t[j]&&void 0!==f.lastOpeningBracketAt&&(f.lastClosingBracketAt=j,w=null,Object.keys(m).length&&(f.attributes.push(m),m={}),O.dumpLinkHrefsNearby.enabled&&b.tagName&&!b.openingTagEnds&&(b.openingTagEnds=j)),void 0!==f.lastOpeningBracketAt)if(void 0===f.lastClosingBracketAt){if(f.lastOpeningBracketAt<j&&"<"!==t[j]&&(void 0===t[j+1]||"<"===t[j+1])&&f.nameContainsLetters){if(f.name=t.slice(f.nameStarts,f.nameEnds?f.nameEnds:j+1).toLowerCase(),O.ignoreTags.includes(f.name)||f.onlyPlausible&&!s.has(f.name)){f={},m={};continue}if((s.has(f.name)||c.has(f.name))&&(!1===f.onlyPlausible||!0===f.onlyPlausible&&f.attributes.length)||void 0===t[j+1]){T(O);var B=A(t,j,f.leftOuterWhitespace,j+1,f.lastOpeningBracketAt,f.lastClosingBracketAt);O.cb({tag:f,deleteFrom:f.leftOuterWhitespace,deleteTo:j+1,insert:"".concat(B).concat(v).concat(B),rangesArr:L,proposedReturn:[f.leftOuterWhitespace,j+1,"".concat(B).concat(v).concat(B)]}),E(),q(j,O,L);}}}else if(j>f.lastClosingBracketAt&&t[j].trim()||void 0===t[j+1]){var H=f.lastClosingBracketAt===j?j+1:j;if(O.trimOnlySpaces&&H===R-1&&null!==w&&w<j&&(H=w),!S&&O.ignoreTags.includes(f.name)||S&&!O.onlyStripTags.includes(f.name))O.cb({tag:f,deleteFrom:null,deleteTo:null,insert:null,rangesArr:L,proposedReturn:[]}),f={},m={};else if(!f.onlyPlausible||0===f.attributes.length&&f.name&&(s.has(f.name.toLowerCase())||c.has(f.name.toLowerCase()))||f.attributes&&f.attributes.some((function(r){return r.equalsAt}))){var U=A(t,j,f.leftOuterWhitespace,H,f.lastOpeningBracketAt,f.lastClosingBracketAt);v="",i=!1,T(O);var V=void 0;V="string"==typeof v&&v.length?"".concat(U).concat(v).concat("\n\n"===U?"\n":U):U,0!==f.leftOuterWhitespace&&oe(t,H-1)||(V=""),O.cb({tag:f,deleteFrom:f.leftOuterWhitespace,deleteTo:H,insert:V,rangesArr:L,proposedReturn:[f.leftOuterWhitespace,H,V]}),E(),q(j,O,L);}else f={};">"!==t[j]&&(f={});}if("<"===t[j]&&"<"!==t[j-1]){if(">"===t[oe(t,j)])continue;if(f.nameEnds&&f.nameEnds<j&&!f.lastClosingBracketAt&&(!0===f.onlyPlausible&&f.attributes&&f.attributes.length||!1===f.onlyPlausible)){var P=A(t,j,f.leftOuterWhitespace,j,f.lastOpeningBracketAt,j);O.cb({tag:f,deleteFrom:f.leftOuterWhitespace,deleteTo:j,insert:P,rangesArr:L,proposedReturn:[f.leftOuterWhitespace,j,P]}),q(j,O,L),f={},m={};}if(void 0!==f.lastOpeningBracketAt&&f.onlyPlausible&&f.name&&!f.quotes&&(f.lastOpeningBracketAt=void 0,f.onlyPlausible=!1),!(void 0!==f.lastOpeningBracketAt&&f.onlyPlausible||f.quotes)&&(f.lastOpeningBracketAt=j,f.slashPresent=!1,f.attributes=[],null===g?f.leftOuterWhitespace=j:O.trimOnlySpaces&&0===g?f.leftOuterWhitespace=d||j:f.leftOuterWhitespace=g,"!--"==="".concat(t[j+1]).concat(t[j+2]).concat(t[j+3])||"![CDATA["==="".concat(t[j+1]).concat(t[j+2]).concat(t[j+3]).concat(t[j+4]).concat(t[j+5]).concat(t[j+6]).concat(t[j+7]).concat(t[j+8]))){var W=!0;"-"===t[j+2]&&(W=!1);for(var F=void 0,G=j;G<R;G++)if((!F&&W&&"]]>"==="".concat(t[G-2]).concat(t[G-1]).concat(t[G])||!W&&"--\x3e"==="".concat(t[G-2]).concat(t[G-1]).concat(t[G]))&&(F=G),F&&(F<G&&t[G].trim()||void 0===t[G+1])){var z=G;(void 0===t[G+1]&&!t[G].trim()||">"===t[G])&&(z+=1);var J=A(t,G,f.leftOuterWhitespace,z,f.lastOpeningBracketAt,F);O.cb({tag:f,deleteFrom:f.leftOuterWhitespace,deleteTo:z,insert:J,rangesArr:L,proposedReturn:[f.leftOuterWhitespace,z,J]}),j=G-1,">"===t[G]&&(j=G),f={},m={};break}}}""===t[j].trim()?null===g&&(g=j,void 0!==f.lastOpeningBracketAt&&f.lastOpeningBracketAt<j&&f.nameStarts&&f.nameStarts<f.lastOpeningBracketAt&&j===f.lastOpeningBracketAt+1&&!h.some((function(r){return r.name===f.name}))&&(f.onlyPlausible=!0,f.name=void 0,f.nameStarts=void 0)):null!==g&&(!f.quotes&&m.equalsAt>g-1&&m.nameEnds&&m.equalsAt>m.nameEnds&&'"'!==t[j]&&"'"!==t[j]&&(_(m)&&f.attributes.push(m),m={},f.equalsSpottedAt=void 0),g=null)," "===t[j]?null===d&&(d=j):null!==d&&(d=null);}if(L.current()){if(O.returnRangesOnly)return L.current();var M=p(t,L.current());return O.trimOnlySpaces?er(M," "):M.trim()}return O.returnRangesOnly?[]:O.trimOnlySpaces?er(t," "):t.trim()}}));
}(stringStripHtml_umd));

var strip = stringStripHtml_umd.exports;

var {
  strings: strings$2
} = window.theme;
var placeholderSVG = "\n  <svg xmlns=\"http://www.w3.org/2000/svg\">\n    <rect width=\"100%\" height=\"100%\" fill=\"transparent\"/>\n    <svg\n      fill=\"none\"\n      xmlns=\"http://www.w3.org/2000/svg\"\n      preserveAspectRatio=\"none\"\n    >\n      <text\n        x=\"50%\"\n        y=\"50%\"\n        text-anchor=\"middle\"\n        alignment-baseline=\"middle\"\n        fill=\"currentColor\"\n      >\n        Abc\n      </text>\n    </svg>\n  </svg>\n";
var defaultOptions = {
  limit: 4,
  show_articles: true,
  show_pages: true,
  show_products: true,
  show_price: true,
  show_vendor: false
};
function PredictiveSearch (_ref) {
  var {
    opts
  } = _ref;
  var {
    limit,
    show_articles,
    show_pages,
    show_products,
    show_price,
    show_vendor
  } = Object.assign(defaultOptions, opts); // Create a new event bus

  var {
    emit,
    getState,
    hydrate,
    on
  } = a({
    count: 0
  });
  var types = [show_articles && PredictiveSearch$1.TYPES.ARTICLE, show_pages && PredictiveSearch$1.TYPES.PAGE, show_products && PredictiveSearch$1.TYPES.PRODUCT].filter(Boolean);
  var instance = new PredictiveSearch$1({
    resources: {
      type: types,
      limit,
      options: {
        unavailable_products: 'last',
        fields: [PredictiveSearch$1.FIELDS.TITLE, PredictiveSearch$1.FIELDS.PRODUCT_TYPE, PredictiveSearch$1.FIELDS.VARIANTS_TITLE]
      }
    }
  });
  on('search', (data, _ref2) => {
    var {
      query
    } = _ref2;
    return instance.query(query);
  });
  instance.on('success', _ref3 => {
    var {
      query,
      resources: {
        results
      }
    } = _ref3;
    hydrate({
      query
    });
    var markup = renderResults(results);
    emit('success', {
      markup,
      query
    });
  });
  instance.on('error', err => {});

  function renderResults(results) {
    var {
      articles,
      pages,
      products
    } = results;

    if (!articles.length && !pages.length && !products.length) {
      return "\n        <div class=\"quick-search__no-results\">\n          ".concat(strings$2.search.no_results, "\n        </div>\n      ");
    }

    var resultsMarkup = '';

    if (products) {
      // Render product results
      resultsMarkup += renderGroup(products, strings$2.search.headings.products, _ref4 => {
        var {
          url,
          image,
          title,
          price,
          vendor
        } = _ref4;
        var formattedPrice = formatMoney$1(price * Shopify.currency.rate * 100.0);
        var subheading = [show_vendor && vendor, show_price && strip(formattedPrice)].filter(Boolean).join(' • ');
        return renderResult({
          url,
          image,
          heading: title,
          subheading
        });
      });
    }

    if (pages) {
      // Render page results
      resultsMarkup += renderGroup(pages, strings$2.search.headings.pages, _ref5 => {
        var {
          url,
          image,
          title,
          body
        } = _ref5;
        return renderResult({
          url,
          image,
          heading: title,
          subheading: strip(body)
        });
      });
    }

    if (articles) {
      // Render article results
      resultsMarkup += renderGroup(articles, strings$2.search.headings.articles, _ref6 => {
        var {
          url,
          image,
          title,
          body
        } = _ref6;
        return renderResult({
          url,
          image,
          heading: title,
          subheading: strip(body)
        });
      });
    }

    var viewAll = "\n      <div class=\"quick-search__view-all accent\">\n        <button type=\"submit\">".concat(strings$2.search.view_all, " &rarr;</button>\n      </div>\n    ");
    return resultsMarkup + viewAll;
  }

  function renderGroup(items, heading, cb) {
    var headingMarkup = "<div class=\"quick-search__header type-heading-meta overline\">".concat(heading, "</div>");
    return items.length >= 1 ? headingMarkup + items.map(cb).join('') : '';
  }

  function renderResult(_ref7) {
    var {
      url,
      image,
      heading,
      subheading
    } = _ref7;
    var {
      query
    } = getState();
    var regex = new RegExp('(' + query + ')', 'gi');
    var hlHeading = heading.replace(regex, '<span class="hl">$1</span>');
    var hlSubheading = subheading.replace(regex, '<span class="hl">$1</span>');
    var img = image ? "<img class=\"image__img lazyload\" data-src=\"".concat(getSizedImageUrl(image, '120x'), "\" alt=\"").concat(heading, "\" />") : placeholderSVG;
    return "\n      <a class=\"quick-search__result\" href=\"".concat(url, "\">\n        <div class=\"quick-search__result-image\">").concat(img, "</div>\n        <div class=\"quick-search__result-details\">\n          <div class=\"quick-search__result-heading type-body-regular\">").concat(hlHeading, "</div>\n          <div class=\"quick-search__result-subheading type-body-small\">").concat(hlSubheading, "</div>\n        </div>\n      </a>\n    ");
  }

  function query(q) {
    emit('search', null, {
      query: q
    });
  }

  return {
    on,
    query
  };
}

var selectors$x = {
  trigger: '.quick-search__trigger',
  searchOverlay: '.search__overlay',
  searchInput: '.search__input',
  inputClear: '.search__input-clear',
  inputClose: '.search__input-close',
  results: '.search__results',
  settings: '[data-settings]'
};
var classNames = {
  active: 'is-active',
  activeQuery: 'has-active-query',
  activeSuggestions: 'has-suggestions'
};

var quickSearch = opts => {
  var container = opts.container;
  var settings = container.querySelector(selectors$x.settings);
  var trigger = container.querySelector(selectors$x.trigger);
  var overlay = container.querySelector(selectors$x.searchOverlay);
  var searchInput = container.querySelector(selectors$x.searchInput);
  var searchInputClear = container.querySelector(selectors$x.inputClear);
  var searchInputClose = container.querySelector(selectors$x.inputClose);
  var resultsContainer = container.querySelector(selectors$x.results);
  var events = [];
  var options = JSON.parse(settings.innerHTML);
  var search = PredictiveSearch({
    opts: options
  });
  search.on('success', _ref => {
    var {
      markup
    } = _ref;
    container.classList.add(classNames.activeSuggestions);
    resultsContainer.innerHTML = markup;
  });

  var _bindEvents = () => {
    _addEvent(trigger, 'click', _showSearchBar);

    _addEvent(overlay, 'click', _hideSearchBar);

    _addEvent(document, 'keydown', _handleEsq);

    _addEvent(searchInput, 'input', _searchInputHandler);

    _addEvent(searchInputClose, 'click', _hideSearchBar);

    _addEvent(searchInputClear, 'click', _clearSearchInput);
  };

  var _addEvent = (element, action, func) => {
    element.addEventListener(action, func, true);
    events.push({
      element,
      action,
      func
    });
  };

  var _showSearchBar = e => {
    e.preventDefault();
    trigger.setAttribute('aria-expanded', true);
    searchInputClose.setAttribute('aria-expanded', true);
    container.classList.add(classNames.active);
    searchInput.focus();
  };

  var _hideSearchBar = e => {
    e.preventDefault();
    trigger.setAttribute('aria-expanded', false);
    searchInputClose.setAttribute('aria-expanded', false);
    container.classList.remove(classNames.active);
  };

  var _handleEsq = e => {
    if (container.classList.contains(classNames.active) && e.keyCode === 27) {
      _hideSearchBar(e);
    }
  };

  var _clearSearchInput = e => {
    e.preventDefault();
    searchInput.value = '';

    _searchInputHandler(e);

    searchInput.focus();
  };

  var _searchInputHandler = event => {
    var query = event.target.value;

    if (!query) {
      container.classList.remove(classNames.activeQuery);
      container.classList.remove(classNames.activeSuggestions);
      return;
    }

    container.classList.add(classNames.activeQuery);

    if (options.show_products || options.show_pages || options.show_articles) {
      search.query(query);
    }
  };

  var unload = () => {
    events.forEach(event => {
      event.element.removeEventListener(event.action, event.function);
    });
  };

  _bindEvents();

  return {
    unload
  };
};

/*
 * anime.js v3.2.1
 * (c) 2020 Julian Garnier
 * Released under the MIT license
 * animejs.com
 */

// Defaults

var defaultInstanceSettings = {
  update: null,
  begin: null,
  loopBegin: null,
  changeBegin: null,
  change: null,
  changeComplete: null,
  loopComplete: null,
  complete: null,
  loop: 1,
  direction: 'normal',
  autoplay: true,
  timelineOffset: 0
};

var defaultTweenSettings = {
  duration: 1000,
  delay: 0,
  endDelay: 0,
  easing: 'easeOutElastic(1, .5)',
  round: 0
};

var validTransforms = ['translateX', 'translateY', 'translateZ', 'rotate', 'rotateX', 'rotateY', 'rotateZ', 'scale', 'scaleX', 'scaleY', 'scaleZ', 'skew', 'skewX', 'skewY', 'perspective', 'matrix', 'matrix3d'];

// Caching

var cache = {
  CSS: {},
  springs: {}
};

// Utils

function minMax(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

function stringContains(str, text) {
  return str.indexOf(text) > -1;
}

function applyArguments(func, args) {
  return func.apply(null, args);
}

var is = {
  arr: function (a) { return Array.isArray(a); },
  obj: function (a) { return stringContains(Object.prototype.toString.call(a), 'Object'); },
  pth: function (a) { return is.obj(a) && a.hasOwnProperty('totalLength'); },
  svg: function (a) { return a instanceof SVGElement; },
  inp: function (a) { return a instanceof HTMLInputElement; },
  dom: function (a) { return a.nodeType || is.svg(a); },
  str: function (a) { return typeof a === 'string'; },
  fnc: function (a) { return typeof a === 'function'; },
  und: function (a) { return typeof a === 'undefined'; },
  nil: function (a) { return is.und(a) || a === null; },
  hex: function (a) { return /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(a); },
  rgb: function (a) { return /^rgb/.test(a); },
  hsl: function (a) { return /^hsl/.test(a); },
  col: function (a) { return (is.hex(a) || is.rgb(a) || is.hsl(a)); },
  key: function (a) { return !defaultInstanceSettings.hasOwnProperty(a) && !defaultTweenSettings.hasOwnProperty(a) && a !== 'targets' && a !== 'keyframes'; },
};

// Easings

function parseEasingParameters(string) {
  var match = /\(([^)]+)\)/.exec(string);
  return match ? match[1].split(',').map(function (p) { return parseFloat(p); }) : [];
}

// Spring solver inspired by Webkit Copyright © 2016 Apple Inc. All rights reserved. https://webkit.org/demos/spring/spring.js

function spring(string, duration) {

  var params = parseEasingParameters(string);
  var mass = minMax(is.und(params[0]) ? 1 : params[0], .1, 100);
  var stiffness = minMax(is.und(params[1]) ? 100 : params[1], .1, 100);
  var damping = minMax(is.und(params[2]) ? 10 : params[2], .1, 100);
  var velocity =  minMax(is.und(params[3]) ? 0 : params[3], .1, 100);
  var w0 = Math.sqrt(stiffness / mass);
  var zeta = damping / (2 * Math.sqrt(stiffness * mass));
  var wd = zeta < 1 ? w0 * Math.sqrt(1 - zeta * zeta) : 0;
  var a = 1;
  var b = zeta < 1 ? (zeta * w0 + -velocity) / wd : -velocity + w0;

  function solver(t) {
    var progress = duration ? (duration * t) / 1000 : t;
    if (zeta < 1) {
      progress = Math.exp(-progress * zeta * w0) * (a * Math.cos(wd * progress) + b * Math.sin(wd * progress));
    } else {
      progress = (a + b * progress) * Math.exp(-progress * w0);
    }
    if (t === 0 || t === 1) { return t; }
    return 1 - progress;
  }

  function getDuration() {
    var cached = cache.springs[string];
    if (cached) { return cached; }
    var frame = 1/6;
    var elapsed = 0;
    var rest = 0;
    while(true) {
      elapsed += frame;
      if (solver(elapsed) === 1) {
        rest++;
        if (rest >= 16) { break; }
      } else {
        rest = 0;
      }
    }
    var duration = elapsed * frame * 1000;
    cache.springs[string] = duration;
    return duration;
  }

  return duration ? solver : getDuration;

}

// Basic steps easing implementation https://developer.mozilla.org/fr/docs/Web/CSS/transition-timing-function

function steps(steps) {
  if ( steps === void 0 ) steps = 10;

  return function (t) { return Math.ceil((minMax(t, 0.000001, 1)) * steps) * (1 / steps); };
}

// BezierEasing https://github.com/gre/bezier-easing

var bezier = (function () {

  var kSplineTableSize = 11;
  var kSampleStepSize = 1.0 / (kSplineTableSize - 1.0);

  function A(aA1, aA2) { return 1.0 - 3.0 * aA2 + 3.0 * aA1 }
  function B(aA1, aA2) { return 3.0 * aA2 - 6.0 * aA1 }
  function C(aA1)      { return 3.0 * aA1 }

  function calcBezier(aT, aA1, aA2) { return ((A(aA1, aA2) * aT + B(aA1, aA2)) * aT + C(aA1)) * aT }
  function getSlope(aT, aA1, aA2) { return 3.0 * A(aA1, aA2) * aT * aT + 2.0 * B(aA1, aA2) * aT + C(aA1) }

  function binarySubdivide(aX, aA, aB, mX1, mX2) {
    var currentX, currentT, i = 0;
    do {
      currentT = aA + (aB - aA) / 2.0;
      currentX = calcBezier(currentT, mX1, mX2) - aX;
      if (currentX > 0.0) { aB = currentT; } else { aA = currentT; }
    } while (Math.abs(currentX) > 0.0000001 && ++i < 10);
    return currentT;
  }

  function newtonRaphsonIterate(aX, aGuessT, mX1, mX2) {
    for (var i = 0; i < 4; ++i) {
      var currentSlope = getSlope(aGuessT, mX1, mX2);
      if (currentSlope === 0.0) { return aGuessT; }
      var currentX = calcBezier(aGuessT, mX1, mX2) - aX;
      aGuessT -= currentX / currentSlope;
    }
    return aGuessT;
  }

  function bezier(mX1, mY1, mX2, mY2) {

    if (!(0 <= mX1 && mX1 <= 1 && 0 <= mX2 && mX2 <= 1)) { return; }
    var sampleValues = new Float32Array(kSplineTableSize);

    if (mX1 !== mY1 || mX2 !== mY2) {
      for (var i = 0; i < kSplineTableSize; ++i) {
        sampleValues[i] = calcBezier(i * kSampleStepSize, mX1, mX2);
      }
    }

    function getTForX(aX) {

      var intervalStart = 0;
      var currentSample = 1;
      var lastSample = kSplineTableSize - 1;

      for (; currentSample !== lastSample && sampleValues[currentSample] <= aX; ++currentSample) {
        intervalStart += kSampleStepSize;
      }

      --currentSample;

      var dist = (aX - sampleValues[currentSample]) / (sampleValues[currentSample + 1] - sampleValues[currentSample]);
      var guessForT = intervalStart + dist * kSampleStepSize;
      var initialSlope = getSlope(guessForT, mX1, mX2);

      if (initialSlope >= 0.001) {
        return newtonRaphsonIterate(aX, guessForT, mX1, mX2);
      } else if (initialSlope === 0.0) {
        return guessForT;
      } else {
        return binarySubdivide(aX, intervalStart, intervalStart + kSampleStepSize, mX1, mX2);
      }

    }

    return function (x) {
      if (mX1 === mY1 && mX2 === mY2) { return x; }
      if (x === 0 || x === 1) { return x; }
      return calcBezier(getTForX(x), mY1, mY2);
    }

  }

  return bezier;

})();

var penner = (function () {

  // Based on jQuery UI's implemenation of easing equations from Robert Penner (http://www.robertpenner.com/easing)

  var eases = { linear: function () { return function (t) { return t; }; } };

  var functionEasings = {
    Sine: function () { return function (t) { return 1 - Math.cos(t * Math.PI / 2); }; },
    Circ: function () { return function (t) { return 1 - Math.sqrt(1 - t * t); }; },
    Back: function () { return function (t) { return t * t * (3 * t - 2); }; },
    Bounce: function () { return function (t) {
      var pow2, b = 4;
      while (t < (( pow2 = Math.pow(2, --b)) - 1) / 11) {}
      return 1 / Math.pow(4, 3 - b) - 7.5625 * Math.pow(( pow2 * 3 - 2 ) / 22 - t, 2)
    }; },
    Elastic: function (amplitude, period) {
      if ( amplitude === void 0 ) amplitude = 1;
      if ( period === void 0 ) period = .5;

      var a = minMax(amplitude, 1, 10);
      var p = minMax(period, .1, 2);
      return function (t) {
        return (t === 0 || t === 1) ? t : 
          -a * Math.pow(2, 10 * (t - 1)) * Math.sin((((t - 1) - (p / (Math.PI * 2) * Math.asin(1 / a))) * (Math.PI * 2)) / p);
      }
    }
  };

  var baseEasings = ['Quad', 'Cubic', 'Quart', 'Quint', 'Expo'];

  baseEasings.forEach(function (name, i) {
    functionEasings[name] = function () { return function (t) { return Math.pow(t, i + 2); }; };
  });

  Object.keys(functionEasings).forEach(function (name) {
    var easeIn = functionEasings[name];
    eases['easeIn' + name] = easeIn;
    eases['easeOut' + name] = function (a, b) { return function (t) { return 1 - easeIn(a, b)(1 - t); }; };
    eases['easeInOut' + name] = function (a, b) { return function (t) { return t < 0.5 ? easeIn(a, b)(t * 2) / 2 : 
      1 - easeIn(a, b)(t * -2 + 2) / 2; }; };
    eases['easeOutIn' + name] = function (a, b) { return function (t) { return t < 0.5 ? (1 - easeIn(a, b)(1 - t * 2)) / 2 : 
      (easeIn(a, b)(t * 2 - 1) + 1) / 2; }; };
  });

  return eases;

})();

function parseEasings(easing, duration) {
  if (is.fnc(easing)) { return easing; }
  var name = easing.split('(')[0];
  var ease = penner[name];
  var args = parseEasingParameters(easing);
  switch (name) {
    case 'spring' : return spring(easing, duration);
    case 'cubicBezier' : return applyArguments(bezier, args);
    case 'steps' : return applyArguments(steps, args);
    default : return applyArguments(ease, args);
  }
}

// Strings

function selectString(str) {
  try {
    var nodes = document.querySelectorAll(str);
    return nodes;
  } catch(e) {
    return;
  }
}

// Arrays

function filterArray(arr, callback) {
  var len = arr.length;
  var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
  var result = [];
  for (var i = 0; i < len; i++) {
    if (i in arr) {
      var val = arr[i];
      if (callback.call(thisArg, val, i, arr)) {
        result.push(val);
      }
    }
  }
  return result;
}

function flattenArray(arr) {
  return arr.reduce(function (a, b) { return a.concat(is.arr(b) ? flattenArray(b) : b); }, []);
}

function toArray(o) {
  if (is.arr(o)) { return o; }
  if (is.str(o)) { o = selectString(o) || o; }
  if (o instanceof NodeList || o instanceof HTMLCollection) { return [].slice.call(o); }
  return [o];
}

function arrayContains(arr, val) {
  return arr.some(function (a) { return a === val; });
}

// Objects

function cloneObject(o) {
  var clone = {};
  for (var p in o) { clone[p] = o[p]; }
  return clone;
}

function replaceObjectProps(o1, o2) {
  var o = cloneObject(o1);
  for (var p in o1) { o[p] = o2.hasOwnProperty(p) ? o2[p] : o1[p]; }
  return o;
}

function mergeObjects(o1, o2) {
  var o = cloneObject(o1);
  for (var p in o2) { o[p] = is.und(o1[p]) ? o2[p] : o1[p]; }
  return o;
}

// Colors

function rgbToRgba(rgbValue) {
  var rgb = /rgb\((\d+,\s*[\d]+,\s*[\d]+)\)/g.exec(rgbValue);
  return rgb ? ("rgba(" + (rgb[1]) + ",1)") : rgbValue;
}

function hexToRgba(hexValue) {
  var rgx = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  var hex = hexValue.replace(rgx, function (m, r, g, b) { return r + r + g + g + b + b; } );
  var rgb = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  var r = parseInt(rgb[1], 16);
  var g = parseInt(rgb[2], 16);
  var b = parseInt(rgb[3], 16);
  return ("rgba(" + r + "," + g + "," + b + ",1)");
}

function hslToRgba(hslValue) {
  var hsl = /hsl\((\d+),\s*([\d.]+)%,\s*([\d.]+)%\)/g.exec(hslValue) || /hsla\((\d+),\s*([\d.]+)%,\s*([\d.]+)%,\s*([\d.]+)\)/g.exec(hslValue);
  var h = parseInt(hsl[1], 10) / 360;
  var s = parseInt(hsl[2], 10) / 100;
  var l = parseInt(hsl[3], 10) / 100;
  var a = hsl[4] || 1;
  function hue2rgb(p, q, t) {
    if (t < 0) { t += 1; }
    if (t > 1) { t -= 1; }
    if (t < 1/6) { return p + (q - p) * 6 * t; }
    if (t < 1/2) { return q; }
    if (t < 2/3) { return p + (q - p) * (2/3 - t) * 6; }
    return p;
  }
  var r, g, b;
  if (s == 0) {
    r = g = b = l;
  } else {
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return ("rgba(" + (r * 255) + "," + (g * 255) + "," + (b * 255) + "," + a + ")");
}

function colorToRgb(val) {
  if (is.rgb(val)) { return rgbToRgba(val); }
  if (is.hex(val)) { return hexToRgba(val); }
  if (is.hsl(val)) { return hslToRgba(val); }
}

// Units

function getUnit(val) {
  var split = /[+-]?\d*\.?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?(%|px|pt|em|rem|in|cm|mm|ex|ch|pc|vw|vh|vmin|vmax|deg|rad|turn)?$/.exec(val);
  if (split) { return split[1]; }
}

function getTransformUnit(propName) {
  if (stringContains(propName, 'translate') || propName === 'perspective') { return 'px'; }
  if (stringContains(propName, 'rotate') || stringContains(propName, 'skew')) { return 'deg'; }
}

// Values

function getFunctionValue(val, animatable) {
  if (!is.fnc(val)) { return val; }
  return val(animatable.target, animatable.id, animatable.total);
}

function getAttribute(el, prop) {
  return el.getAttribute(prop);
}

function convertPxToUnit(el, value, unit) {
  var valueUnit = getUnit(value);
  if (arrayContains([unit, 'deg', 'rad', 'turn'], valueUnit)) { return value; }
  var cached = cache.CSS[value + unit];
  if (!is.und(cached)) { return cached; }
  var baseline = 100;
  var tempEl = document.createElement(el.tagName);
  var parentEl = (el.parentNode && (el.parentNode !== document)) ? el.parentNode : document.body;
  parentEl.appendChild(tempEl);
  tempEl.style.position = 'absolute';
  tempEl.style.width = baseline + unit;
  var factor = baseline / tempEl.offsetWidth;
  parentEl.removeChild(tempEl);
  var convertedUnit = factor * parseFloat(value);
  cache.CSS[value + unit] = convertedUnit;
  return convertedUnit;
}

function getCSSValue(el, prop, unit) {
  if (prop in el.style) {
    var uppercasePropName = prop.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    var value = el.style[prop] || getComputedStyle(el).getPropertyValue(uppercasePropName) || '0';
    return unit ? convertPxToUnit(el, value, unit) : value;
  }
}

function getAnimationType(el, prop) {
  if (is.dom(el) && !is.inp(el) && (!is.nil(getAttribute(el, prop)) || (is.svg(el) && el[prop]))) { return 'attribute'; }
  if (is.dom(el) && arrayContains(validTransforms, prop)) { return 'transform'; }
  if (is.dom(el) && (prop !== 'transform' && getCSSValue(el, prop))) { return 'css'; }
  if (el[prop] != null) { return 'object'; }
}

function getElementTransforms(el) {
  if (!is.dom(el)) { return; }
  var str = el.style.transform || '';
  var reg  = /(\w+)\(([^)]*)\)/g;
  var transforms = new Map();
  var m; while (m = reg.exec(str)) { transforms.set(m[1], m[2]); }
  return transforms;
}

function getTransformValue(el, propName, animatable, unit) {
  var defaultVal = stringContains(propName, 'scale') ? 1 : 0 + getTransformUnit(propName);
  var value = getElementTransforms(el).get(propName) || defaultVal;
  if (animatable) {
    animatable.transforms.list.set(propName, value);
    animatable.transforms['last'] = propName;
  }
  return unit ? convertPxToUnit(el, value, unit) : value;
}

function getOriginalTargetValue(target, propName, unit, animatable) {
  switch (getAnimationType(target, propName)) {
    case 'transform': return getTransformValue(target, propName, animatable, unit);
    case 'css': return getCSSValue(target, propName, unit);
    case 'attribute': return getAttribute(target, propName);
    default: return target[propName] || 0;
  }
}

function getRelativeValue(to, from) {
  var operator = /^(\*=|\+=|-=)/.exec(to);
  if (!operator) { return to; }
  var u = getUnit(to) || 0;
  var x = parseFloat(from);
  var y = parseFloat(to.replace(operator[0], ''));
  switch (operator[0][0]) {
    case '+': return x + y + u;
    case '-': return x - y + u;
    case '*': return x * y + u;
  }
}

function validateValue(val, unit) {
  if (is.col(val)) { return colorToRgb(val); }
  if (/\s/g.test(val)) { return val; }
  var originalUnit = getUnit(val);
  var unitLess = originalUnit ? val.substr(0, val.length - originalUnit.length) : val;
  if (unit) { return unitLess + unit; }
  return unitLess;
}

// getTotalLength() equivalent for circle, rect, polyline, polygon and line shapes
// adapted from https://gist.github.com/SebLambla/3e0550c496c236709744

function getDistance(p1, p2) {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

function getCircleLength(el) {
  return Math.PI * 2 * getAttribute(el, 'r');
}

function getRectLength(el) {
  return (getAttribute(el, 'width') * 2) + (getAttribute(el, 'height') * 2);
}

function getLineLength(el) {
  return getDistance(
    {x: getAttribute(el, 'x1'), y: getAttribute(el, 'y1')}, 
    {x: getAttribute(el, 'x2'), y: getAttribute(el, 'y2')}
  );
}

function getPolylineLength(el) {
  var points = el.points;
  var totalLength = 0;
  var previousPos;
  for (var i = 0 ; i < points.numberOfItems; i++) {
    var currentPos = points.getItem(i);
    if (i > 0) { totalLength += getDistance(previousPos, currentPos); }
    previousPos = currentPos;
  }
  return totalLength;
}

function getPolygonLength(el) {
  var points = el.points;
  return getPolylineLength(el) + getDistance(points.getItem(points.numberOfItems - 1), points.getItem(0));
}

// Path animation

function getTotalLength(el) {
  if (el.getTotalLength) { return el.getTotalLength(); }
  switch(el.tagName.toLowerCase()) {
    case 'circle': return getCircleLength(el);
    case 'rect': return getRectLength(el);
    case 'line': return getLineLength(el);
    case 'polyline': return getPolylineLength(el);
    case 'polygon': return getPolygonLength(el);
  }
}

function setDashoffset(el) {
  var pathLength = getTotalLength(el);
  el.setAttribute('stroke-dasharray', pathLength);
  return pathLength;
}

// Motion path

function getParentSvgEl(el) {
  var parentEl = el.parentNode;
  while (is.svg(parentEl)) {
    if (!is.svg(parentEl.parentNode)) { break; }
    parentEl = parentEl.parentNode;
  }
  return parentEl;
}

function getParentSvg(pathEl, svgData) {
  var svg = svgData || {};
  var parentSvgEl = svg.el || getParentSvgEl(pathEl);
  var rect = parentSvgEl.getBoundingClientRect();
  var viewBoxAttr = getAttribute(parentSvgEl, 'viewBox');
  var width = rect.width;
  var height = rect.height;
  var viewBox = svg.viewBox || (viewBoxAttr ? viewBoxAttr.split(' ') : [0, 0, width, height]);
  return {
    el: parentSvgEl,
    viewBox: viewBox,
    x: viewBox[0] / 1,
    y: viewBox[1] / 1,
    w: width,
    h: height,
    vW: viewBox[2],
    vH: viewBox[3]
  }
}

function getPath(path, percent) {
  var pathEl = is.str(path) ? selectString(path)[0] : path;
  var p = percent || 100;
  return function(property) {
    return {
      property: property,
      el: pathEl,
      svg: getParentSvg(pathEl),
      totalLength: getTotalLength(pathEl) * (p / 100)
    }
  }
}

function getPathProgress(path, progress, isPathTargetInsideSVG) {
  function point(offset) {
    if ( offset === void 0 ) offset = 0;

    var l = progress + offset >= 1 ? progress + offset : 0;
    return path.el.getPointAtLength(l);
  }
  var svg = getParentSvg(path.el, path.svg);
  var p = point();
  var p0 = point(-1);
  var p1 = point(+1);
  var scaleX = isPathTargetInsideSVG ? 1 : svg.w / svg.vW;
  var scaleY = isPathTargetInsideSVG ? 1 : svg.h / svg.vH;
  switch (path.property) {
    case 'x': return (p.x - svg.x) * scaleX;
    case 'y': return (p.y - svg.y) * scaleY;
    case 'angle': return Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180 / Math.PI;
  }
}

// Decompose value

function decomposeValue(val, unit) {
  // const rgx = /-?\d*\.?\d+/g; // handles basic numbers
  // const rgx = /[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g; // handles exponents notation
  var rgx = /[+-]?\d*\.?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g; // handles exponents notation
  var value = validateValue((is.pth(val) ? val.totalLength : val), unit) + '';
  return {
    original: value,
    numbers: value.match(rgx) ? value.match(rgx).map(Number) : [0],
    strings: (is.str(val) || unit) ? value.split(rgx) : []
  }
}

// Animatables

function parseTargets(targets) {
  var targetsArray = targets ? (flattenArray(is.arr(targets) ? targets.map(toArray) : toArray(targets))) : [];
  return filterArray(targetsArray, function (item, pos, self) { return self.indexOf(item) === pos; });
}

function getAnimatables(targets) {
  var parsed = parseTargets(targets);
  return parsed.map(function (t, i) {
    return {target: t, id: i, total: parsed.length, transforms: { list: getElementTransforms(t) } };
  });
}

// Properties

function normalizePropertyTweens(prop, tweenSettings) {
  var settings = cloneObject(tweenSettings);
  // Override duration if easing is a spring
  if (/^spring/.test(settings.easing)) { settings.duration = spring(settings.easing); }
  if (is.arr(prop)) {
    var l = prop.length;
    var isFromTo = (l === 2 && !is.obj(prop[0]));
    if (!isFromTo) {
      // Duration divided by the number of tweens
      if (!is.fnc(tweenSettings.duration)) { settings.duration = tweenSettings.duration / l; }
    } else {
      // Transform [from, to] values shorthand to a valid tween value
      prop = {value: prop};
    }
  }
  var propArray = is.arr(prop) ? prop : [prop];
  return propArray.map(function (v, i) {
    var obj = (is.obj(v) && !is.pth(v)) ? v : {value: v};
    // Default delay value should only be applied to the first tween
    if (is.und(obj.delay)) { obj.delay = !i ? tweenSettings.delay : 0; }
    // Default endDelay value should only be applied to the last tween
    if (is.und(obj.endDelay)) { obj.endDelay = i === propArray.length - 1 ? tweenSettings.endDelay : 0; }
    return obj;
  }).map(function (k) { return mergeObjects(k, settings); });
}


function flattenKeyframes(keyframes) {
  var propertyNames = filterArray(flattenArray(keyframes.map(function (key) { return Object.keys(key); })), function (p) { return is.key(p); })
  .reduce(function (a,b) { if (a.indexOf(b) < 0) { a.push(b); } return a; }, []);
  var properties = {};
  var loop = function ( i ) {
    var propName = propertyNames[i];
    properties[propName] = keyframes.map(function (key) {
      var newKey = {};
      for (var p in key) {
        if (is.key(p)) {
          if (p == propName) { newKey.value = key[p]; }
        } else {
          newKey[p] = key[p];
        }
      }
      return newKey;
    });
  };

  for (var i = 0; i < propertyNames.length; i++) loop( i );
  return properties;
}

function getProperties(tweenSettings, params) {
  var properties = [];
  var keyframes = params.keyframes;
  if (keyframes) { params = mergeObjects(flattenKeyframes(keyframes), params); }
  for (var p in params) {
    if (is.key(p)) {
      properties.push({
        name: p,
        tweens: normalizePropertyTweens(params[p], tweenSettings)
      });
    }
  }
  return properties;
}

// Tweens

function normalizeTweenValues(tween, animatable) {
  var t = {};
  for (var p in tween) {
    var value = getFunctionValue(tween[p], animatable);
    if (is.arr(value)) {
      value = value.map(function (v) { return getFunctionValue(v, animatable); });
      if (value.length === 1) { value = value[0]; }
    }
    t[p] = value;
  }
  t.duration = parseFloat(t.duration);
  t.delay = parseFloat(t.delay);
  return t;
}

function normalizeTweens(prop, animatable) {
  var previousTween;
  return prop.tweens.map(function (t) {
    var tween = normalizeTweenValues(t, animatable);
    var tweenValue = tween.value;
    var to = is.arr(tweenValue) ? tweenValue[1] : tweenValue;
    var toUnit = getUnit(to);
    var originalValue = getOriginalTargetValue(animatable.target, prop.name, toUnit, animatable);
    var previousValue = previousTween ? previousTween.to.original : originalValue;
    var from = is.arr(tweenValue) ? tweenValue[0] : previousValue;
    var fromUnit = getUnit(from) || getUnit(originalValue);
    var unit = toUnit || fromUnit;
    if (is.und(to)) { to = previousValue; }
    tween.from = decomposeValue(from, unit);
    tween.to = decomposeValue(getRelativeValue(to, from), unit);
    tween.start = previousTween ? previousTween.end : 0;
    tween.end = tween.start + tween.delay + tween.duration + tween.endDelay;
    tween.easing = parseEasings(tween.easing, tween.duration);
    tween.isPath = is.pth(tweenValue);
    tween.isPathTargetInsideSVG = tween.isPath && is.svg(animatable.target);
    tween.isColor = is.col(tween.from.original);
    if (tween.isColor) { tween.round = 1; }
    previousTween = tween;
    return tween;
  });
}

// Tween progress

var setProgressValue = {
  css: function (t, p, v) { return t.style[p] = v; },
  attribute: function (t, p, v) { return t.setAttribute(p, v); },
  object: function (t, p, v) { return t[p] = v; },
  transform: function (t, p, v, transforms, manual) {
    transforms.list.set(p, v);
    if (p === transforms.last || manual) {
      var str = '';
      transforms.list.forEach(function (value, prop) { str += prop + "(" + value + ") "; });
      t.style.transform = str;
    }
  }
};

// Set Value helper

function setTargetsValue(targets, properties) {
  var animatables = getAnimatables(targets);
  animatables.forEach(function (animatable) {
    for (var property in properties) {
      var value = getFunctionValue(properties[property], animatable);
      var target = animatable.target;
      var valueUnit = getUnit(value);
      var originalValue = getOriginalTargetValue(target, property, valueUnit, animatable);
      var unit = valueUnit || getUnit(originalValue);
      var to = getRelativeValue(validateValue(value, unit), originalValue);
      var animType = getAnimationType(target, property);
      setProgressValue[animType](target, property, to, animatable.transforms, true);
    }
  });
}

// Animations

function createAnimation(animatable, prop) {
  var animType = getAnimationType(animatable.target, prop.name);
  if (animType) {
    var tweens = normalizeTweens(prop, animatable);
    var lastTween = tweens[tweens.length - 1];
    return {
      type: animType,
      property: prop.name,
      animatable: animatable,
      tweens: tweens,
      duration: lastTween.end,
      delay: tweens[0].delay,
      endDelay: lastTween.endDelay
    }
  }
}

function getAnimations(animatables, properties) {
  return filterArray(flattenArray(animatables.map(function (animatable) {
    return properties.map(function (prop) {
      return createAnimation(animatable, prop);
    });
  })), function (a) { return !is.und(a); });
}

// Create Instance

function getInstanceTimings(animations, tweenSettings) {
  var animLength = animations.length;
  var getTlOffset = function (anim) { return anim.timelineOffset ? anim.timelineOffset : 0; };
  var timings = {};
  timings.duration = animLength ? Math.max.apply(Math, animations.map(function (anim) { return getTlOffset(anim) + anim.duration; })) : tweenSettings.duration;
  timings.delay = animLength ? Math.min.apply(Math, animations.map(function (anim) { return getTlOffset(anim) + anim.delay; })) : tweenSettings.delay;
  timings.endDelay = animLength ? timings.duration - Math.max.apply(Math, animations.map(function (anim) { return getTlOffset(anim) + anim.duration - anim.endDelay; })) : tweenSettings.endDelay;
  return timings;
}

var instanceID = 0;

function createNewInstance(params) {
  var instanceSettings = replaceObjectProps(defaultInstanceSettings, params);
  var tweenSettings = replaceObjectProps(defaultTweenSettings, params);
  var properties = getProperties(tweenSettings, params);
  var animatables = getAnimatables(params.targets);
  var animations = getAnimations(animatables, properties);
  var timings = getInstanceTimings(animations, tweenSettings);
  var id = instanceID;
  instanceID++;
  return mergeObjects(instanceSettings, {
    id: id,
    children: [],
    animatables: animatables,
    animations: animations,
    duration: timings.duration,
    delay: timings.delay,
    endDelay: timings.endDelay
  });
}

// Core

var activeInstances = [];

var engine = (function () {
  var raf;

  function play() {
    if (!raf && (!isDocumentHidden() || !anime.suspendWhenDocumentHidden) && activeInstances.length > 0) {
      raf = requestAnimationFrame(step);
    }
  }
  function step(t) {
    // memo on algorithm issue:
    // dangerous iteration over mutable `activeInstances`
    // (that collection may be updated from within callbacks of `tick`-ed animation instances)
    var activeInstancesLength = activeInstances.length;
    var i = 0;
    while (i < activeInstancesLength) {
      var activeInstance = activeInstances[i];
      if (!activeInstance.paused) {
        activeInstance.tick(t);
        i++;
      } else {
        activeInstances.splice(i, 1);
        activeInstancesLength--;
      }
    }
    raf = i > 0 ? requestAnimationFrame(step) : undefined;
  }

  function handleVisibilityChange() {
    if (!anime.suspendWhenDocumentHidden) { return; }

    if (isDocumentHidden()) {
      // suspend ticks
      raf = cancelAnimationFrame(raf);
    } else { // is back to active tab
      // first adjust animations to consider the time that ticks were suspended
      activeInstances.forEach(
        function (instance) { return instance ._onDocumentVisibility(); }
      );
      engine();
    }
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  return play;
})();

function isDocumentHidden() {
  return !!document && document.hidden;
}

// Public Instance

function anime(params) {
  if ( params === void 0 ) params = {};


  var startTime = 0, lastTime = 0, now = 0;
  var children, childrenLength = 0;
  var resolve = null;

  function makePromise(instance) {
    var promise = window.Promise && new Promise(function (_resolve) { return resolve = _resolve; });
    instance.finished = promise;
    return promise;
  }

  var instance = createNewInstance(params);
  makePromise(instance);

  function toggleInstanceDirection() {
    var direction = instance.direction;
    if (direction !== 'alternate') {
      instance.direction = direction !== 'normal' ? 'normal' : 'reverse';
    }
    instance.reversed = !instance.reversed;
    children.forEach(function (child) { return child.reversed = instance.reversed; });
  }

  function adjustTime(time) {
    return instance.reversed ? instance.duration - time : time;
  }

  function resetTime() {
    startTime = 0;
    lastTime = adjustTime(instance.currentTime) * (1 / anime.speed);
  }

  function seekChild(time, child) {
    if (child) { child.seek(time - child.timelineOffset); }
  }

  function syncInstanceChildren(time) {
    if (!instance.reversePlayback) {
      for (var i = 0; i < childrenLength; i++) { seekChild(time, children[i]); }
    } else {
      for (var i$1 = childrenLength; i$1--;) { seekChild(time, children[i$1]); }
    }
  }

  function setAnimationsProgress(insTime) {
    var i = 0;
    var animations = instance.animations;
    var animationsLength = animations.length;
    while (i < animationsLength) {
      var anim = animations[i];
      var animatable = anim.animatable;
      var tweens = anim.tweens;
      var tweenLength = tweens.length - 1;
      var tween = tweens[tweenLength];
      // Only check for keyframes if there is more than one tween
      if (tweenLength) { tween = filterArray(tweens, function (t) { return (insTime < t.end); })[0] || tween; }
      var elapsed = minMax(insTime - tween.start - tween.delay, 0, tween.duration) / tween.duration;
      var eased = isNaN(elapsed) ? 1 : tween.easing(elapsed);
      var strings = tween.to.strings;
      var round = tween.round;
      var numbers = [];
      var toNumbersLength = tween.to.numbers.length;
      var progress = (void 0);
      for (var n = 0; n < toNumbersLength; n++) {
        var value = (void 0);
        var toNumber = tween.to.numbers[n];
        var fromNumber = tween.from.numbers[n] || 0;
        if (!tween.isPath) {
          value = fromNumber + (eased * (toNumber - fromNumber));
        } else {
          value = getPathProgress(tween.value, eased * toNumber, tween.isPathTargetInsideSVG);
        }
        if (round) {
          if (!(tween.isColor && n > 2)) {
            value = Math.round(value * round) / round;
          }
        }
        numbers.push(value);
      }
      // Manual Array.reduce for better performances
      var stringsLength = strings.length;
      if (!stringsLength) {
        progress = numbers[0];
      } else {
        progress = strings[0];
        for (var s = 0; s < stringsLength; s++) {
          strings[s];
          var b = strings[s + 1];
          var n$1 = numbers[s];
          if (!isNaN(n$1)) {
            if (!b) {
              progress += n$1 + ' ';
            } else {
              progress += n$1 + b;
            }
          }
        }
      }
      setProgressValue[anim.type](animatable.target, anim.property, progress, animatable.transforms);
      anim.currentValue = progress;
      i++;
    }
  }

  function setCallback(cb) {
    if (instance[cb] && !instance.passThrough) { instance[cb](instance); }
  }

  function countIteration() {
    if (instance.remaining && instance.remaining !== true) {
      instance.remaining--;
    }
  }

  function setInstanceProgress(engineTime) {
    var insDuration = instance.duration;
    var insDelay = instance.delay;
    var insEndDelay = insDuration - instance.endDelay;
    var insTime = adjustTime(engineTime);
    instance.progress = minMax((insTime / insDuration) * 100, 0, 100);
    instance.reversePlayback = insTime < instance.currentTime;
    if (children) { syncInstanceChildren(insTime); }
    if (!instance.began && instance.currentTime > 0) {
      instance.began = true;
      setCallback('begin');
    }
    if (!instance.loopBegan && instance.currentTime > 0) {
      instance.loopBegan = true;
      setCallback('loopBegin');
    }
    if (insTime <= insDelay && instance.currentTime !== 0) {
      setAnimationsProgress(0);
    }
    if ((insTime >= insEndDelay && instance.currentTime !== insDuration) || !insDuration) {
      setAnimationsProgress(insDuration);
    }
    if (insTime > insDelay && insTime < insEndDelay) {
      if (!instance.changeBegan) {
        instance.changeBegan = true;
        instance.changeCompleted = false;
        setCallback('changeBegin');
      }
      setCallback('change');
      setAnimationsProgress(insTime);
    } else {
      if (instance.changeBegan) {
        instance.changeCompleted = true;
        instance.changeBegan = false;
        setCallback('changeComplete');
      }
    }
    instance.currentTime = minMax(insTime, 0, insDuration);
    if (instance.began) { setCallback('update'); }
    if (engineTime >= insDuration) {
      lastTime = 0;
      countIteration();
      if (!instance.remaining) {
        instance.paused = true;
        if (!instance.completed) {
          instance.completed = true;
          setCallback('loopComplete');
          setCallback('complete');
          if (!instance.passThrough && 'Promise' in window) {
            resolve();
            makePromise(instance);
          }
        }
      } else {
        startTime = now;
        setCallback('loopComplete');
        instance.loopBegan = false;
        if (instance.direction === 'alternate') {
          toggleInstanceDirection();
        }
      }
    }
  }

  instance.reset = function() {
    var direction = instance.direction;
    instance.passThrough = false;
    instance.currentTime = 0;
    instance.progress = 0;
    instance.paused = true;
    instance.began = false;
    instance.loopBegan = false;
    instance.changeBegan = false;
    instance.completed = false;
    instance.changeCompleted = false;
    instance.reversePlayback = false;
    instance.reversed = direction === 'reverse';
    instance.remaining = instance.loop;
    children = instance.children;
    childrenLength = children.length;
    for (var i = childrenLength; i--;) { instance.children[i].reset(); }
    if (instance.reversed && instance.loop !== true || (direction === 'alternate' && instance.loop === 1)) { instance.remaining++; }
    setAnimationsProgress(instance.reversed ? instance.duration : 0);
  };

  // internal method (for engine) to adjust animation timings before restoring engine ticks (rAF)
  instance._onDocumentVisibility = resetTime;

  // Set Value helper

  instance.set = function(targets, properties) {
    setTargetsValue(targets, properties);
    return instance;
  };

  instance.tick = function(t) {
    now = t;
    if (!startTime) { startTime = now; }
    setInstanceProgress((now + (lastTime - startTime)) * anime.speed);
  };

  instance.seek = function(time) {
    setInstanceProgress(adjustTime(time));
  };

  instance.pause = function() {
    instance.paused = true;
    resetTime();
  };

  instance.play = function() {
    if (!instance.paused) { return; }
    if (instance.completed) { instance.reset(); }
    instance.paused = false;
    activeInstances.push(instance);
    resetTime();
    engine();
  };

  instance.reverse = function() {
    toggleInstanceDirection();
    instance.completed = instance.reversed ? false : true;
    resetTime();
  };

  instance.restart = function() {
    instance.reset();
    instance.play();
  };

  instance.remove = function(targets) {
    var targetsArray = parseTargets(targets);
    removeTargetsFromInstance(targetsArray, instance);
  };

  instance.reset();

  if (instance.autoplay) { instance.play(); }

  return instance;

}

// Remove targets from animation

function removeTargetsFromAnimations(targetsArray, animations) {
  for (var a = animations.length; a--;) {
    if (arrayContains(targetsArray, animations[a].animatable.target)) {
      animations.splice(a, 1);
    }
  }
}

function removeTargetsFromInstance(targetsArray, instance) {
  var animations = instance.animations;
  var children = instance.children;
  removeTargetsFromAnimations(targetsArray, animations);
  for (var c = children.length; c--;) {
    var child = children[c];
    var childAnimations = child.animations;
    removeTargetsFromAnimations(targetsArray, childAnimations);
    if (!childAnimations.length && !child.children.length) { children.splice(c, 1); }
  }
  if (!animations.length && !children.length) { instance.pause(); }
}

function removeTargetsFromActiveInstances(targets) {
  var targetsArray = parseTargets(targets);
  for (var i = activeInstances.length; i--;) {
    var instance = activeInstances[i];
    removeTargetsFromInstance(targetsArray, instance);
  }
}

// Stagger helpers

function stagger(val, params) {
  if ( params === void 0 ) params = {};

  var direction = params.direction || 'normal';
  var easing = params.easing ? parseEasings(params.easing) : null;
  var grid = params.grid;
  var axis = params.axis;
  var fromIndex = params.from || 0;
  var fromFirst = fromIndex === 'first';
  var fromCenter = fromIndex === 'center';
  var fromLast = fromIndex === 'last';
  var isRange = is.arr(val);
  var val1 = isRange ? parseFloat(val[0]) : parseFloat(val);
  var val2 = isRange ? parseFloat(val[1]) : 0;
  var unit = getUnit(isRange ? val[1] : val) || 0;
  var start = params.start || 0 + (isRange ? val1 : 0);
  var values = [];
  var maxValue = 0;
  return function (el, i, t) {
    if (fromFirst) { fromIndex = 0; }
    if (fromCenter) { fromIndex = (t - 1) / 2; }
    if (fromLast) { fromIndex = t - 1; }
    if (!values.length) {
      for (var index = 0; index < t; index++) {
        if (!grid) {
          values.push(Math.abs(fromIndex - index));
        } else {
          var fromX = !fromCenter ? fromIndex%grid[0] : (grid[0]-1)/2;
          var fromY = !fromCenter ? Math.floor(fromIndex/grid[0]) : (grid[1]-1)/2;
          var toX = index%grid[0];
          var toY = Math.floor(index/grid[0]);
          var distanceX = fromX - toX;
          var distanceY = fromY - toY;
          var value = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
          if (axis === 'x') { value = -distanceX; }
          if (axis === 'y') { value = -distanceY; }
          values.push(value);
        }
        maxValue = Math.max.apply(Math, values);
      }
      if (easing) { values = values.map(function (val) { return easing(val / maxValue) * maxValue; }); }
      if (direction === 'reverse') { values = values.map(function (val) { return axis ? (val < 0) ? val * -1 : -val : Math.abs(maxValue - val); }); }
    }
    var spacing = isRange ? (val2 - val1) / maxValue : val1;
    return start + (spacing * (Math.round(values[i] * 100) / 100)) + unit;
  }
}

// Timeline

function timeline(params) {
  if ( params === void 0 ) params = {};

  var tl = anime(params);
  tl.duration = 0;
  tl.add = function(instanceParams, timelineOffset) {
    var tlIndex = activeInstances.indexOf(tl);
    var children = tl.children;
    if (tlIndex > -1) { activeInstances.splice(tlIndex, 1); }
    function passThrough(ins) { ins.passThrough = true; }
    for (var i = 0; i < children.length; i++) { passThrough(children[i]); }
    var insParams = mergeObjects(instanceParams, replaceObjectProps(defaultTweenSettings, params));
    insParams.targets = insParams.targets || params.targets;
    var tlDuration = tl.duration;
    insParams.autoplay = false;
    insParams.direction = tl.direction;
    insParams.timelineOffset = is.und(timelineOffset) ? tlDuration : getRelativeValue(timelineOffset, tlDuration);
    passThrough(tl);
    tl.seek(insParams.timelineOffset);
    var ins = anime(insParams);
    passThrough(ins);
    children.push(ins);
    var timings = getInstanceTimings(children, params);
    tl.delay = timings.delay;
    tl.endDelay = timings.endDelay;
    tl.duration = timings.duration;
    tl.seek(0);
    tl.reset();
    if (tl.autoplay) { tl.play(); }
    return tl;
  };
  return tl;
}

anime.version = '3.2.1';
anime.speed = 1;
// TODO:#review: naming, documentation
anime.suspendWhenDocumentHidden = true;
anime.running = activeInstances;
anime.remove = removeTargetsFromActiveInstances;
anime.get = getOriginalTargetValue;
anime.set = setTargetsValue;
anime.convertPx = convertPxToUnit;
anime.path = getPath;
anime.setDashoffset = setDashoffset;
anime.stagger = stagger;
anime.timeline = timeline;
anime.easing = parseEasings;
anime.penner = penner;
anime.random = function (min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; };

var candidateSelectors = [
  'input',
  'select',
  'textarea',
  'a[href]',
  'button',
  '[tabindex]',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
];
var candidateSelector = candidateSelectors.join(',');

var matches = typeof Element === 'undefined'
  ? function () {}
  : Element.prototype.matches || Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;

function tabbable(el, options) {
  options = options || {};

  var regularTabbables = [];
  var orderedTabbables = [];

  var candidates = el.querySelectorAll(candidateSelector);

  if (options.includeContainer) {
    if (matches.call(el, candidateSelector)) {
      candidates = Array.prototype.slice.apply(candidates);
      candidates.unshift(el);
    }
  }

  var i, candidate, candidateTabindex;
  for (i = 0; i < candidates.length; i++) {
    candidate = candidates[i];

    if (!isNodeMatchingSelectorTabbable(candidate)) continue;

    candidateTabindex = getTabindex(candidate);
    if (candidateTabindex === 0) {
      regularTabbables.push(candidate);
    } else {
      orderedTabbables.push({
        documentOrder: i,
        tabIndex: candidateTabindex,
        node: candidate,
      });
    }
  }

  var tabbableNodes = orderedTabbables
    .sort(sortOrderedTabbables)
    .map(function(a) { return a.node })
    .concat(regularTabbables);

  return tabbableNodes;
}

tabbable.isTabbable = isTabbable;
tabbable.isFocusable = isFocusable;

function isNodeMatchingSelectorTabbable(node) {
  if (
    !isNodeMatchingSelectorFocusable(node)
    || isNonTabbableRadio(node)
    || getTabindex(node) < 0
  ) {
    return false;
  }
  return true;
}

function isTabbable(node) {
  if (!node) throw new Error('No node provided');
  if (matches.call(node, candidateSelector) === false) return false;
  return isNodeMatchingSelectorTabbable(node);
}

function isNodeMatchingSelectorFocusable(node) {
  if (
    node.disabled
    || isHiddenInput(node)
    || isHidden(node)
  ) {
    return false;
  }
  return true;
}

var focusableCandidateSelector = candidateSelectors.concat('iframe').join(',');
function isFocusable(node) {
  if (!node) throw new Error('No node provided');
  if (matches.call(node, focusableCandidateSelector) === false) return false;
  return isNodeMatchingSelectorFocusable(node);
}

function getTabindex(node) {
  var tabindexAttr = parseInt(node.getAttribute('tabindex'), 10);
  if (!isNaN(tabindexAttr)) return tabindexAttr;
  // Browsers do not return `tabIndex` correctly for contentEditable nodes;
  // so if they don't have a tabindex attribute specifically set, assume it's 0.
  if (isContentEditable(node)) return 0;
  return node.tabIndex;
}

function sortOrderedTabbables(a, b) {
  return a.tabIndex === b.tabIndex ? a.documentOrder - b.documentOrder : a.tabIndex - b.tabIndex;
}

function isContentEditable(node) {
  return node.contentEditable === 'true';
}

function isInput(node) {
  return node.tagName === 'INPUT';
}

function isHiddenInput(node) {
  return isInput(node) && node.type === 'hidden';
}

function isRadio(node) {
  return isInput(node) && node.type === 'radio';
}

function isNonTabbableRadio(node) {
  return isRadio(node) && !isTabbableRadio(node);
}

function getCheckedRadio(nodes) {
  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i].checked) {
      return nodes[i];
    }
  }
}

function isTabbableRadio(node) {
  if (!node.name) return true;
  // This won't account for the edge case where you have radio groups with the same
  // in separate forms on the same page.
  var radioSet = node.ownerDocument.querySelectorAll('input[type="radio"][name="' + node.name + '"]');
  var checked = getCheckedRadio(radioSet);
  return !checked || checked === node;
}

function isHidden(node) {
  // offsetParent being null will allow detecting cases where an element is invisible or inside an invisible element,
  // as long as the element does not use position: fixed. For them, their visibility has to be checked directly as well.
  return node.offsetParent === null || getComputedStyle(node).visibility === 'hidden';
}

var tabbable_1 = tabbable;

function t$3(e){var t=e.onfocus,n=document.createElement("div");return n.style.cssText="\n    width: 1px;\n    height: 0px;\n    padding: 0px;\n    overflow: hidden;\n    position: fixed;\n    top: 1px;\n    left: 1px;\n  ",n.onfocus=t,n.setAttribute("tabindex","0"),n.setAttribute("aria-hidden","true"),n.setAttribute("data-lockbox",""),n}function n(n){if(n){var o,i,r=document.activeElement,c=tabbable_1(n);if(!n.querySelector("[data-lockbox]")){o=t$3({onfocus:function(){var e=c[c.length-1];e&&e.focus();}}),i=t$3({onfocus:function(){var e=c[0];e&&e.focus();}}),n.insertBefore(o,n.children[0]),n.appendChild(i);var u=c[0];u&&u.focus();}return function(){n.removeChild(o),n.removeChild(i),r.focus();}}}

var classes$4 = {
  active: 'active',
  visible: 'visible'
};
function mobileQuickSearch (node) {
  var form = node.querySelector('form');
  var input = node.querySelector('[data-input]');
  var closeBtn = node.querySelector('[data-close]');
  var resultsContainer = node.querySelector('[data-results]');
  var settings = node.querySelector('[data-settings]'); // This gets replaced with a focus trapping util on `open` however
  // this should prevent any errors if the quick search is destroyed
  // when it wasn't open

  var lockbox = () => {};

  closeBtn.addEventListener('click', close);
  node.addEventListener('keydown', checkEscape);
  input.addEventListener('input', handleInput);
  var options = JSON.parse(settings.innerHTML);
  var search = PredictiveSearch({
    opts: options
  });
  search.on('success', _ref => {
    var {
      markup
    } = _ref;
    resultsContainer.classList.add(classes$4.visible);
    resultsContainer.innerHTML = markup;
  });

  function handleInput(e) {
    if (e.target.value === '') resultsContainer.classList.remove(classes$4.visible);

    if (options.show_products || options.show_pages || options.show_articles) {
      search.query(e.target.value);
    }
  }

  function checkEscape(_ref2) {
    var {
      keyCode
    } = _ref2;
    if (keyCode === 27) close();
  } // Clear contents of the search input and hide results container

  function open() {
    node.classList.add(classes$4.active);
    closeBtn.setAttribute('aria-expanded', true); // setTimeout(() => {

    lockbox = n(form);
    disableBodyScroll(node);
    node.classList.add(classes$4.visible);
    input.focus(); // }, 50);
  }

  function close(e) {
    e && e.preventDefault();
    document.querySelectorAll("[aria-controls=\"".concat(node.id, "\"]")).forEach(control => {
      control.setAttribute('aria-expanded', false);
    });
    node.classList.remove(classes$4.visible);
    setTimeout(() => {
      node.classList.remove(classes$4.active);
      enableBodyScroll(node);
      lockbox();
    }, 350);
  }

  function destroy() {
    close();
    closeBtn.addEventListener('click', close);
    node.removeEventListener('keydown', checkEscape);
    input.removeEventListener('input', handleInput);
  }

  return {
    open,
    close,
    destroy
  };
}

var sel$3 = {
  overlay: '[data-overlay]',
  listItem: '[data-list-item]',
  item: '[data-item]',
  allLinks: '[data-all-links]',
  main: '[data-main]',
  primary: '[data-primary-container]',
  footer: '[data-footer]',
  close: '[data-close-drawer]',
  logo: '.drawer-menu__logo',
  // Cross border
  form: '.drawer-menu__form',
  localeInput: '[data-locale-input]',
  currencyInput: '[data-currency-input]',
  // Quick search
  quickSearch: '[data-quick-search]'
};
var classes$3 = {
  active: 'active',
  visible: 'visible',
  countrySelector: 'drawer-menu__list--country-selector'
};

var transitionIn = targets => anime({
  targets,
  translateX: [40, 0],
  opacity: [0, 1],
  easing: 'cubicBezier(.5, .05, .1, .3)',
  duration: 120,
  delay: anime.stagger(60, {
    start: 60
  }),
  complete: function complete() {
    targets.forEach(el => el.style.removeProperty('transform'));
  }
}); // Extra space we add to the height of the inner container


var formatHeight = h => h + 8 + 'px';

var menu = node => {
  // Entire links container
  var primaryDepth = 0; // The individual link list the merchant selected

  var linksDepth = 0;
  var scrollPosition = 0;
  var focusTrap = createFocusTrap(node, {
    allowOutsideClick: true
  });
  var overlay = node.querySelector(sel$3.overlay);
  overlay.addEventListener('click', close);
  var quickSearchEl = node.querySelector(sel$3.quickSearch);
  var quickSearch = mobileQuickSearch(quickSearchEl);
  var searchLink = node.querySelector('[data-search]');
  searchLink.addEventListener('click', openSearch); // Element that holds all links, primary and secondary

  var everything = node.querySelector(sel$3.allLinks); // This is the element that holds the one we move left and right (primary)
  // We also need to assign its height initially so we get smooth transitions

  var main = node.querySelector(sel$3.main); // Element that holds all the primary links and moves left and right

  var primary = node.querySelector(sel$3.primary); // Cross border

  var form = node.querySelector(sel$3.form);
  var localeInput = node.querySelector(sel$3.localeInput);
  var currencyInput = node.querySelector(sel$3.currencyInput);
  var closeBtn = node.querySelector(sel$3.close);
  closeBtn.addEventListener('click', close); // Every individual menu item

  var items = node.querySelectorAll(sel$3.item);
  items.forEach(item => item.addEventListener('click', handleItem));

  function openSearch(e) {
    e.preventDefault();
    e.target.setAttribute('aria-expanded', true);
    quickSearch.open();
  }

  function handleItem(e) {
    e.preventDefault();
    var {
      item
    } = e.currentTarget.dataset;

    switch (item) {
      // Standard link that goes to a different url
      case 'link':
        close();
        window.location = e.currentTarget.href;
        break;
      // Element that will navigate to child navigation list

      case 'parent':
        clickParent(e);
        break;
      // Element that will navigate back up the tree

      case 'back':
        clickBack(e);
        break;
      // Account, currency, and language link at the bottom

      case 'secondary':
        handleSecondaryLink(e);
        break;
      // Back link within 'Currency' or 'Language'

      case 'secondaryHeading':
        handleSecondaryHeading(e);
        break;
      // Individual language

      case 'locale':
        handleLanguage(e);
        break;
      // Individual currency

      case 'currency':
        handleCurrency(e);
        break;
    }
  }

  function open() {
    node.classList.add(classes$3.active);
    setTimeout(() => {
      focusTrap.activate();
      node.classList.add(classes$3.visible);
      disableBodyScroll(node, {
        hideBodyOverflow: true,
        allowTouchMove: el => {
          while (el && el !== document.body && el.id !== 'main-content') {
            if (el.getAttribute('data-scroll-lock-ignore') !== null) {
              return true;
            }

            el = el.parentNode;
          }
        }
      });
      scrollPosition = window.pageYOffset;
      document.body.style.top = "-".concat(scrollPosition, "px");
      document.body.classList.add('scroll-lock');
      var elements = node.querySelectorAll("".concat(sel$3.primary, " > ").concat(sel$3.listItem, ", ").concat(sel$3.footer, " > li, ").concat(sel$3.footer, " > form > li"));

      if (primaryDepth === 0 && linksDepth === 0) {
        main.style.height = formatHeight(primary.offsetHeight);
        transitionIn(elements);
      }
    }, 50);
  }

  function close(e) {
    e && e.preventDefault();
    focusTrap.deactivate();
    node.classList.remove(classes$3.visible);
    setTimeout(() => {
      node.classList.remove(classes$3.active);
      enableBodyScroll(node);
      document.body.classList.remove('scroll-lock');
      document.body.style.top = '';
      window.scrollTo(0, scrollPosition);
    }, 350);
  }

  function clickParent(e) {
    e.preventDefault();
    var parentLink = e.currentTarget;
    parentLink.ariaExpanded = 'true';
    var childMenu = parentLink.nextElementSibling;
    childMenu.classList.add(classes$3.visible);
    main.style.height = formatHeight(childMenu.offsetHeight); // childMenu.querySelector('a').focus();

    var elements = childMenu.querySelectorAll(":scope > ".concat(sel$3.listItem));
    transitionIn(elements);
    navigate(linksDepth += 1);
  }

  function navigate(depth) {
    linksDepth = depth;
    primary.setAttribute('data-depth', depth);
  }

  function navigatePrimary(depth) {
    primaryDepth = depth;
    everything.setAttribute('data-depth', depth);
  }

  function clickBack(e) {
    e.preventDefault();
    var menuBefore = e.currentTarget.closest(sel$3.listItem).closest('ul');
    main.style.height = formatHeight(menuBefore.offsetHeight);
    var parent = e.currentTarget.closest('ul');
    parent.classList.remove(classes$3.visible);
    var parentLink = parent.previousElementSibling;
    parentLink.ariaExpanded = 'false';
    navigate(linksDepth -= 1);
  }

  function handleSecondaryLink(e) {
    e.preventDefault();
    navigatePrimary(1);
    var childMenu = e.currentTarget.nextElementSibling;
    childMenu.classList.add(classes$3.visible);
    var elements = childMenu.querySelectorAll(":scope > ".concat(sel$3.listItem)); // Due to the country selectors length it cannot be transitioned in

    if (!childMenu.classList.contains(classes$3.countrySelector)) {
      transitionIn(elements);
    }
  }

  function handleSecondaryHeading(e) {
    e.preventDefault();
    navigatePrimary(0);
    var parent = e.currentTarget.closest('ul');
    parent.classList.remove(classes$3.visible);
  }

  function handleCrossBorder(e, input) {
    var {
      value
    } = e.currentTarget.dataset;
    input.value = value;
    close();
    form.submit();
  }

  function handleKeyboard(e) {
    if (!node.classList.contains(classes$3.visible)) return;

    if (e.key == 'Escape' || e.keyCode === 27 && drawerOpen) {
      close();
    }
  }

  var handleLanguage = e => handleCrossBorder(e, localeInput);

  var handleCurrency = e => handleCrossBorder(e, currencyInput);

  window.addEventListener('keydown', handleKeyboard);

  function destroy() {
    overlay.removeEventListener('click', close);
    closeBtn.removeEventListener('click', close);
    searchLink.removeEventListener('click', openSearch);
    items.forEach(item => item.removeEventListener('click', handleItem));
    enableBodyScroll(node);
    document.body.classList.remove('scroll-lock');
    document.body.style.top = '';
    window.scrollTo(0, scrollPosition);
    window.removeEventListener('keydown', handleKeyboard);
  }

  return {
    close,
    destroy,
    open
  };
};

var selectors$w = {
  jsCartCount: '.js-cart-count',
  jsCartToggle: '.js-cart-drawer-toggle',
  cartCountInner: '.quick-cart__indicator-inner',
  currencySelector: '.header__icon--currency',
  languageSelector: '.header__icon--language',
  disclosure: '[data-disclosure]',
  drawerMenu: '[data-drawer-menu]'
};
register('header', {
  crossBorder: {},

  onLoad() {
    var drawerMenu = document.querySelector(selectors$w.drawerMenu);
    this.menu = menu(drawerMenu);
    this.menuButton = this.container.querySelector('#mobile-nav');
    var cartCount = this.container.querySelector(selectors$w.jsCartCount);
    var cartToggle = this.container.querySelector(selectors$w.jsCartToggle);
    this.navigation = navigation(this.container);
    this.navigationCloseHandler = c$1('navitem:closeOthers', () => {
      this.navigation.closeAll();
    });
    this.menuButton.addEventListener('click', this._openMenu.bind(this));
    c$1('cart:updated', state => {
      var cartCountInner = cartCount.querySelector(selectors$w.cartCountInner);
      cartCountInner.innerHTML = state.cart.item_count;
      cartCount.classList.toggle('hidden', !state.cart.item_count);
    });
    cartToggle.addEventListener('click', e => {
      e.preventDefault();
      r$1('cart:toggle', state => {
        return {
          cartOpen: !state.cartOpen
        };
      });
    });
    c$1('cart:open', _ref => {
      cartToggle.setAttribute('aria-expanded', true);
    });
    c$1('cart:close', _ref2 => {
      cartToggle.setAttribute('aria-expanded', false);
    });
    c$1('section:first-full-height', () => this.container.classList.add('first-section-is-full-width'));
    this.quickSearch = this.container.querySelector('.quick-search');
    this.predictiveSearch = quickSearch({
      container: this.quickSearch
    });

    this._initDisclosure();
  },

  _openMenu(e) {
    e.preventDefault();
    this.menu.open();
  },

  _showHeaderOverlay(event) {
    if (event.target.ariaExpanded === 'true') {
      r$1('headerOverlay:show');
    } else {
      r$1('headerOverlay:hide');
    }
  },

  _initDisclosure() {
    var languageSelectorContainer = this.container.querySelector(selectors$w.languageSelector);
    var currencySelectorContainer = this.container.querySelector(selectors$w.currencySelector);

    if (languageSelectorContainer) {
      this.languageTrigger = languageSelectorContainer.querySelector(selectors$w.disclosure);
      var {
        disclosure: d
      } = this.languageTrigger.dataset;
      this.crossBorder[d] = disclosure(this.languageTrigger, languageSelectorContainer);
      this.languageTrigger.addEventListener('click', this._showHeaderOverlay);
    }

    if (currencySelectorContainer) {
      this.currencyTrigger = currencySelectorContainer.querySelector(selectors$w.disclosure);
      var {
        disclosure: _d
      } = this.currencyTrigger.dataset;
      this.crossBorder[_d] = disclosure(this.currencyTrigger, currencySelectorContainer);
      this.currencyTrigger.addEventListener('click', this._showHeaderOverlay);
    }
  },

  onSelect() {
    r$1('sticky-header:reload', () => {});
  },

  onBlockSelect(_ref3) {
  },

  onUnload() {
    this.menu.destroy();
    this.predictiveSearch.unload();
    this.navigation.unload();
    this.navigationCloseHandler();
    this.currencyTrigger && this.currencyTrigger.removeEventListener('click', this._showHeaderOverlay);
    this.languageTrigger && this.languageTrigger.removeEventListener('click', this._showHeaderOverlay);
    Object.keys(this.crossBorder).forEach(t => {
      this.crossBorder[t].unload();
    });
  }

});

var isMobile$2 = {exports: {}};

isMobile$2.exports = isMobile;
isMobile$2.exports.isMobile = isMobile;
isMobile$2.exports.default = isMobile;

var mobileRE = /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series[46]0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i;

var tabletRE = /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series[46]0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino|android|ipad|playbook|silk/i;

function isMobile (opts) {
  if (!opts) opts = {};
  var ua = opts.ua;
  if (!ua && typeof navigator !== 'undefined') ua = navigator.userAgent;
  if (ua && ua.headers && typeof ua.headers['user-agent'] === 'string') {
    ua = ua.headers['user-agent'];
  }
  if (typeof ua !== 'string') return false

  var result = opts.tablet ? tabletRE.test(ua) : mobileRE.test(ua);

  if (
    !result &&
    opts.tablet &&
    opts.featureDetect &&
    navigator &&
    navigator.maxTouchPoints > 1 &&
    ua.indexOf('Macintosh') !== -1 &&
    ua.indexOf('Safari') !== -1
  ) {
    result = true;
  }

  return result
}

var isMobile$1 = isMobile$2.exports;

var ei = {
  get: () => JSON.parse(localStorage.getItem('exitIntent')),
  set: val => localStorage.setItem('exitIntent', val)
};
register('exit-intent', {
  onLoad() {
    this.closeBtn = this.container.querySelector('[data-close-icon]');
    var mobileTimeout = parseInt(this.container.dataset.mobileLandingTimeout);

    var mouseLeave = e => {
      if (!e.relatedTarget && !e.toElement) {
        this.showPopup();
        document.body.removeEventListener('mouseout', mouseLeave);
      }
    };

    var close = e => {
      e.preventDefault();
      this.hidePopup();
      ei.set(true);
    };

    if (!ei.get()) {
      if (isMobile$1()) {
        setTimeout(() => {
          this.showPopup();
        }, mobileTimeout);
      } else {
        document.body.addEventListener('mouseout', mouseLeave);
      }

      this.closeBtn.addEventListener('click', close);
      this.container.addEventListener('keyup', close);
    }
  },

  showPopup() {
    this.container.classList.add('animating');
    setTimeout(() => {
      this.container.classList.add('visible');
    }, 250);
  },

  hidePopup() {
    this.container.classList.remove('visible');
    this.container.classList.add('hidden');
    setTimeout(() => {
      this.container.classList.remove('animating');
    }, 250);
  },

  onSelect() {
    this.showPopup();
  },

  onDeselect() {
    this.hidePopup();
  },

  onUnload() {
    this.closeBtn.removeEventListener('click', close);
    this.container.removeEventListener('keyup', close);
  }

});

var js = {exports: {}};

var flickity = {exports: {}};

var evEmitter = {exports: {}};

/**
 * EvEmitter v1.1.0
 * Lil' event emitter
 * MIT License
 */

(function (module) {
/* jshint unused: true, undef: true, strict: true */

( function( global, factory ) {
  // universal module definition
  /* jshint strict: false */ /* globals define, module, window */
  if ( module.exports ) {
    // CommonJS - Browserify, Webpack
    module.exports = factory();
  } else {
    // Browser globals
    global.EvEmitter = factory();
  }

}( typeof window != 'undefined' ? window : commonjsGlobal$1, function() {

function EvEmitter() {}

var proto = EvEmitter.prototype;

proto.on = function( eventName, listener ) {
  if ( !eventName || !listener ) {
    return;
  }
  // set events hash
  var events = this._events = this._events || {};
  // set listeners array
  var listeners = events[ eventName ] = events[ eventName ] || [];
  // only add once
  if ( listeners.indexOf( listener ) == -1 ) {
    listeners.push( listener );
  }

  return this;
};

proto.once = function( eventName, listener ) {
  if ( !eventName || !listener ) {
    return;
  }
  // add event
  this.on( eventName, listener );
  // set once flag
  // set onceEvents hash
  var onceEvents = this._onceEvents = this._onceEvents || {};
  // set onceListeners object
  var onceListeners = onceEvents[ eventName ] = onceEvents[ eventName ] || {};
  // set flag
  onceListeners[ listener ] = true;

  return this;
};

proto.off = function( eventName, listener ) {
  var listeners = this._events && this._events[ eventName ];
  if ( !listeners || !listeners.length ) {
    return;
  }
  var index = listeners.indexOf( listener );
  if ( index != -1 ) {
    listeners.splice( index, 1 );
  }

  return this;
};

proto.emitEvent = function( eventName, args ) {
  var listeners = this._events && this._events[ eventName ];
  if ( !listeners || !listeners.length ) {
    return;
  }
  // copy over to avoid interference if .off() in listener
  listeners = listeners.slice(0);
  args = args || [];
  // once stuff
  var onceListeners = this._onceEvents && this._onceEvents[ eventName ];

  for ( var i=0; i < listeners.length; i++ ) {
    var listener = listeners[i];
    var isOnce = onceListeners && onceListeners[ listener ];
    if ( isOnce ) {
      // remove listener
      // remove before trigger to prevent recursion
      this.off( eventName, listener );
      // unset once flag
      delete onceListeners[ listener ];
    }
    // trigger listener
    listener.apply( this, args );
  }

  return this;
};

proto.allOff = function() {
  delete this._events;
  delete this._onceEvents;
};

return EvEmitter;

}));
}(evEmitter));

var getSize = {exports: {}};

/*!
 * getSize v2.0.3
 * measure size of elements
 * MIT license
 */

(function (module) {
/* jshint browser: true, strict: true, undef: true, unused: true */
/* globals console: false */

( function( window, factory ) {
  /* jshint strict: false */ /* globals define, module */
  if ( module.exports ) {
    // CommonJS
    module.exports = factory();
  } else {
    // browser global
    window.getSize = factory();
  }

})( window, function factory() {

// -------------------------- helpers -------------------------- //

// get a number from a string, not a percentage
function getStyleSize( value ) {
  var num = parseFloat( value );
  // not a percent like '100%', and a number
  var isValid = value.indexOf('%') == -1 && !isNaN( num );
  return isValid && num;
}

function noop() {}

var logError = typeof console == 'undefined' ? noop :
  function( message ) {
    console.error( message );
  };

// -------------------------- measurements -------------------------- //

var measurements = [
  'paddingLeft',
  'paddingRight',
  'paddingTop',
  'paddingBottom',
  'marginLeft',
  'marginRight',
  'marginTop',
  'marginBottom',
  'borderLeftWidth',
  'borderRightWidth',
  'borderTopWidth',
  'borderBottomWidth'
];

var measurementsLength = measurements.length;

function getZeroSize() {
  var size = {
    width: 0,
    height: 0,
    innerWidth: 0,
    innerHeight: 0,
    outerWidth: 0,
    outerHeight: 0
  };
  for ( var i=0; i < measurementsLength; i++ ) {
    var measurement = measurements[i];
    size[ measurement ] = 0;
  }
  return size;
}

// -------------------------- getStyle -------------------------- //

/**
 * getStyle, get style of element, check for Firefox bug
 * https://bugzilla.mozilla.org/show_bug.cgi?id=548397
 */
function getStyle( elem ) {
  var style = getComputedStyle( elem );
  if ( !style ) {
    logError( 'Style returned ' + style +
      '. Are you running this code in a hidden iframe on Firefox? ' +
      'See https://bit.ly/getsizebug1' );
  }
  return style;
}

// -------------------------- setup -------------------------- //

var isSetup = false;

var isBoxSizeOuter;

/**
 * setup
 * check isBoxSizerOuter
 * do on first getSize() rather than on page load for Firefox bug
 */
function setup() {
  // setup once
  if ( isSetup ) {
    return;
  }
  isSetup = true;

  // -------------------------- box sizing -------------------------- //

  /**
   * Chrome & Safari measure the outer-width on style.width on border-box elems
   * IE11 & Firefox<29 measures the inner-width
   */
  var div = document.createElement('div');
  div.style.width = '200px';
  div.style.padding = '1px 2px 3px 4px';
  div.style.borderStyle = 'solid';
  div.style.borderWidth = '1px 2px 3px 4px';
  div.style.boxSizing = 'border-box';

  var body = document.body || document.documentElement;
  body.appendChild( div );
  var style = getStyle( div );
  // round value for browser zoom. desandro/masonry#928
  isBoxSizeOuter = Math.round( getStyleSize( style.width ) ) == 200;
  getSize.isBoxSizeOuter = isBoxSizeOuter;

  body.removeChild( div );
}

// -------------------------- getSize -------------------------- //

function getSize( elem ) {
  setup();

  // use querySeletor if elem is string
  if ( typeof elem == 'string' ) {
    elem = document.querySelector( elem );
  }

  // do not proceed on non-objects
  if ( !elem || typeof elem != 'object' || !elem.nodeType ) {
    return;
  }

  var style = getStyle( elem );

  // if hidden, everything is 0
  if ( style.display == 'none' ) {
    return getZeroSize();
  }

  var size = {};
  size.width = elem.offsetWidth;
  size.height = elem.offsetHeight;

  var isBorderBox = size.isBorderBox = style.boxSizing == 'border-box';

  // get all measurements
  for ( var i=0; i < measurementsLength; i++ ) {
    var measurement = measurements[i];
    var value = style[ measurement ];
    var num = parseFloat( value );
    // any 'auto', 'medium' value will be 0
    size[ measurement ] = !isNaN( num ) ? num : 0;
  }

  var paddingWidth = size.paddingLeft + size.paddingRight;
  var paddingHeight = size.paddingTop + size.paddingBottom;
  var marginWidth = size.marginLeft + size.marginRight;
  var marginHeight = size.marginTop + size.marginBottom;
  var borderWidth = size.borderLeftWidth + size.borderRightWidth;
  var borderHeight = size.borderTopWidth + size.borderBottomWidth;

  var isBorderBoxSizeOuter = isBorderBox && isBoxSizeOuter;

  // overwrite width and height if we can get it from style
  var styleWidth = getStyleSize( style.width );
  if ( styleWidth !== false ) {
    size.width = styleWidth +
      // add padding and border unless it's already including it
      ( isBorderBoxSizeOuter ? 0 : paddingWidth + borderWidth );
  }

  var styleHeight = getStyleSize( style.height );
  if ( styleHeight !== false ) {
    size.height = styleHeight +
      // add padding and border unless it's already including it
      ( isBorderBoxSizeOuter ? 0 : paddingHeight + borderHeight );
  }

  size.innerWidth = size.width - ( paddingWidth + borderWidth );
  size.innerHeight = size.height - ( paddingHeight + borderHeight );

  size.outerWidth = size.width + marginWidth;
  size.outerHeight = size.height + marginHeight;

  return size;
}

return getSize;

});
}(getSize));

var utils = {exports: {}};

var matchesSelector = {exports: {}};

/**
 * matchesSelector v2.0.2
 * matchesSelector( element, '.selector' )
 * MIT license
 */

(function (module) {
/*jshint browser: true, strict: true, undef: true, unused: true */

( function( window, factory ) {
  // universal module definition
  if ( module.exports ) {
    // CommonJS
    module.exports = factory();
  } else {
    // browser global
    window.matchesSelector = factory();
  }

}( window, function factory() {

  var matchesMethod = ( function() {
    var ElemProto = window.Element.prototype;
    // check for the standard method name first
    if ( ElemProto.matches ) {
      return 'matches';
    }
    // check un-prefixed
    if ( ElemProto.matchesSelector ) {
      return 'matchesSelector';
    }
    // check vendor prefixes
    var prefixes = [ 'webkit', 'moz', 'ms', 'o' ];

    for ( var i=0; i < prefixes.length; i++ ) {
      var prefix = prefixes[i];
      var method = prefix + 'MatchesSelector';
      if ( ElemProto[ method ] ) {
        return method;
      }
    }
  })();

  return function matchesSelector( elem, selector ) {
    return elem[ matchesMethod ]( selector );
  };

}));
}(matchesSelector));

/**
 * Fizzy UI utils v2.0.7
 * MIT license
 */

(function (module) {
/*jshint browser: true, undef: true, unused: true, strict: true */

( function( window, factory ) {
  // universal module definition
  /*jshint strict: false */ /*globals define, module, require */

  if ( module.exports ) {
    // CommonJS
    module.exports = factory(
      window,
      matchesSelector.exports
    );
  } else {
    // browser global
    window.fizzyUIUtils = factory(
      window,
      window.matchesSelector
    );
  }

}( window, function factory( window, matchesSelector ) {

var utils = {};

// ----- extend ----- //

// extends objects
utils.extend = function( a, b ) {
  for ( var prop in b ) {
    a[ prop ] = b[ prop ];
  }
  return a;
};

// ----- modulo ----- //

utils.modulo = function( num, div ) {
  return ( ( num % div ) + div ) % div;
};

// ----- makeArray ----- //

var arraySlice = Array.prototype.slice;

// turn element or nodeList into an array
utils.makeArray = function( obj ) {
  if ( Array.isArray( obj ) ) {
    // use object if already an array
    return obj;
  }
  // return empty array if undefined or null. #6
  if ( obj === null || obj === undefined ) {
    return [];
  }

  var isArrayLike = typeof obj == 'object' && typeof obj.length == 'number';
  if ( isArrayLike ) {
    // convert nodeList to array
    return arraySlice.call( obj );
  }

  // array of single index
  return [ obj ];
};

// ----- removeFrom ----- //

utils.removeFrom = function( ary, obj ) {
  var index = ary.indexOf( obj );
  if ( index != -1 ) {
    ary.splice( index, 1 );
  }
};

// ----- getParent ----- //

utils.getParent = function( elem, selector ) {
  while ( elem.parentNode && elem != document.body ) {
    elem = elem.parentNode;
    if ( matchesSelector( elem, selector ) ) {
      return elem;
    }
  }
};

// ----- getQueryElement ----- //

// use element as selector string
utils.getQueryElement = function( elem ) {
  if ( typeof elem == 'string' ) {
    return document.querySelector( elem );
  }
  return elem;
};

// ----- handleEvent ----- //

// enable .ontype to trigger from .addEventListener( elem, 'type' )
utils.handleEvent = function( event ) {
  var method = 'on' + event.type;
  if ( this[ method ] ) {
    this[ method ]( event );
  }
};

// ----- filterFindElements ----- //

utils.filterFindElements = function( elems, selector ) {
  // make array of elems
  elems = utils.makeArray( elems );
  var ffElems = [];

  elems.forEach( function( elem ) {
    // check that elem is an actual element
    if ( !( elem instanceof HTMLElement ) ) {
      return;
    }
    // add elem if no selector
    if ( !selector ) {
      ffElems.push( elem );
      return;
    }
    // filter & find items if we have a selector
    // filter
    if ( matchesSelector( elem, selector ) ) {
      ffElems.push( elem );
    }
    // find children
    var childElems = elem.querySelectorAll( selector );
    // concat childElems to filterFound array
    for ( var i=0; i < childElems.length; i++ ) {
      ffElems.push( childElems[i] );
    }
  });

  return ffElems;
};

// ----- debounceMethod ----- //

utils.debounceMethod = function( _class, methodName, threshold ) {
  threshold = threshold || 100;
  // original method
  var method = _class.prototype[ methodName ];
  var timeoutName = methodName + 'Timeout';

  _class.prototype[ methodName ] = function() {
    var timeout = this[ timeoutName ];
    clearTimeout( timeout );

    var args = arguments;
    var _this = this;
    this[ timeoutName ] = setTimeout( function() {
      method.apply( _this, args );
      delete _this[ timeoutName ];
    }, threshold );
  };
};

// ----- docReady ----- //

utils.docReady = function( callback ) {
  var readyState = document.readyState;
  if ( readyState == 'complete' || readyState == 'interactive' ) {
    // do async to allow for other scripts to run. metafizzy/flickity#441
    setTimeout( callback );
  } else {
    document.addEventListener( 'DOMContentLoaded', callback );
  }
};

// ----- htmlInit ----- //

// http://jamesroberts.name/blog/2010/02/22/string-functions-for-javascript-trim-to-camel-case-to-dashed-and-to-underscore/
utils.toDashed = function( str ) {
  return str.replace( /(.)([A-Z])/g, function( match, $1, $2 ) {
    return $1 + '-' + $2;
  }).toLowerCase();
};

var console = window.console;
/**
 * allow user to initialize classes via [data-namespace] or .js-namespace class
 * htmlInit( Widget, 'widgetName' )
 * options are parsed from data-namespace-options
 */
utils.htmlInit = function( WidgetClass, namespace ) {
  utils.docReady( function() {
    var dashedNamespace = utils.toDashed( namespace );
    var dataAttr = 'data-' + dashedNamespace;
    var dataAttrElems = document.querySelectorAll( '[' + dataAttr + ']' );
    var jsDashElems = document.querySelectorAll( '.js-' + dashedNamespace );
    var elems = utils.makeArray( dataAttrElems )
      .concat( utils.makeArray( jsDashElems ) );
    var dataOptionsAttr = dataAttr + '-options';
    var jQuery = window.jQuery;

    elems.forEach( function( elem ) {
      var attr = elem.getAttribute( dataAttr ) ||
        elem.getAttribute( dataOptionsAttr );
      var options;
      try {
        options = attr && JSON.parse( attr );
      } catch ( error ) {
        // log error, do not initialize
        if ( console ) {
          console.error( 'Error parsing ' + dataAttr + ' on ' + elem.className +
          ': ' + error );
        }
        return;
      }
      // initialize
      var instance = new WidgetClass( elem, options );
      // make available via $().data('namespace')
      if ( jQuery ) {
        jQuery.data( elem, namespace, instance );
      }
    });

  });
};

// -----  ----- //

return utils;

}));
}(utils));

var cell = {exports: {}};

(function (module) {
// Flickity.Cell
( function( window, factory ) {
  // universal module definition
  if ( module.exports ) {
    // CommonJS
    module.exports = factory(
        window,
        getSize.exports
    );
  } else {
    // browser global
    window.Flickity = window.Flickity || {};
    window.Flickity.Cell = factory(
        window,
        window.getSize
    );
  }

}( window, function factory( window, getSize ) {

function Cell( elem, parent ) {
  this.element = elem;
  this.parent = parent;

  this.create();
}

var proto = Cell.prototype;

proto.create = function() {
  this.element.style.position = 'absolute';
  this.element.setAttribute( 'aria-hidden', 'true' );
  this.x = 0;
  this.shift = 0;
};

proto.destroy = function() {
  // reset style
  this.unselect();
  this.element.style.position = '';
  var side = this.parent.originSide;
  this.element.style[ side ] = '';
  this.element.removeAttribute('aria-hidden');
};

proto.getSize = function() {
  this.size = getSize( this.element );
};

proto.setPosition = function( x ) {
  this.x = x;
  this.updateTarget();
  this.renderPosition( x );
};

// setDefaultTarget v1 method, backwards compatibility, remove in v3
proto.updateTarget = proto.setDefaultTarget = function() {
  var marginProperty = this.parent.originSide == 'left' ? 'marginLeft' : 'marginRight';
  this.target = this.x + this.size[ marginProperty ] +
    this.size.width * this.parent.cellAlign;
};

proto.renderPosition = function( x ) {
  // render position of cell with in slider
  var side = this.parent.originSide;
  this.element.style[ side ] = this.parent.getPositionValue( x );
};

proto.select = function() {
  this.element.classList.add('is-selected');
  this.element.removeAttribute('aria-hidden');
};

proto.unselect = function() {
  this.element.classList.remove('is-selected');
  this.element.setAttribute( 'aria-hidden', 'true' );
};

/**
 * @param {Integer} shift - 0, 1, or -1
 */
proto.wrapShift = function( shift ) {
  this.shift = shift;
  this.renderPosition( this.x + this.parent.slideableWidth * shift );
};

proto.remove = function() {
  this.element.parentNode.removeChild( this.element );
};

return Cell;

} ) );
}(cell));

var slide = {exports: {}};

(function (module) {
// slide
( function( window, factory ) {
  // universal module definition
  if ( module.exports ) {
    // CommonJS
    module.exports = factory();
  } else {
    // browser global
    window.Flickity = window.Flickity || {};
    window.Flickity.Slide = factory();
  }

}( window, function factory() {

function Slide( parent ) {
  this.parent = parent;
  this.isOriginLeft = parent.originSide == 'left';
  this.cells = [];
  this.outerWidth = 0;
  this.height = 0;
}

var proto = Slide.prototype;

proto.addCell = function( cell ) {
  this.cells.push( cell );
  this.outerWidth += cell.size.outerWidth;
  this.height = Math.max( cell.size.outerHeight, this.height );
  // first cell stuff
  if ( this.cells.length == 1 ) {
    this.x = cell.x; // x comes from first cell
    var beginMargin = this.isOriginLeft ? 'marginLeft' : 'marginRight';
    this.firstMargin = cell.size[ beginMargin ];
  }
};

proto.updateTarget = function() {
  var endMargin = this.isOriginLeft ? 'marginRight' : 'marginLeft';
  var lastCell = this.getLastCell();
  var lastMargin = lastCell ? lastCell.size[ endMargin ] : 0;
  var slideWidth = this.outerWidth - ( this.firstMargin + lastMargin );
  this.target = this.x + this.firstMargin + slideWidth * this.parent.cellAlign;
};

proto.getLastCell = function() {
  return this.cells[ this.cells.length - 1 ];
};

proto.select = function() {
  this.parent.checkVisibility();
  
  this.cells.forEach( function( cell ) {
    cell.select();
  } );
};

proto.unselect = function() {
  this.cells.forEach( function( cell ) {
    cell.unselect();
  } );
};

proto.getCellElements = function() {
  return this.cells.map( function( cell ) {
    return cell.element;
  } );
};

return Slide;

} ) );
}(slide));

var animate = {exports: {}};

(function (module) {
// animate
( function( window, factory ) {
  // universal module definition
  if ( module.exports ) {
    // CommonJS
    module.exports = factory(
        window,
        utils.exports
    );
  } else {
    // browser global
    window.Flickity = window.Flickity || {};
    window.Flickity.animatePrototype = factory(
        window,
        window.fizzyUIUtils
    );
  }

}( window, function factory( window, utils ) {

// -------------------------- animate -------------------------- //

var proto = {};

proto.startAnimation = function() {
  if ( this.isAnimating ) {
    return;
  }

  this.isAnimating = true;
  this.restingFrames = 0;
  this.animate();
};

proto.animate = function() {
  this.applyDragForce();
  this.applySelectedAttraction();

  var previousX = this.x;

  this.integratePhysics();
  this.positionSlider();
  this.settle( previousX );
  // animate next frame
  if ( this.isAnimating ) {
    var _this = this;
    requestAnimationFrame( function animateFrame() {
      _this.animate();
    } );
  }
};

proto.positionSlider = function() {
  var x = this.x;
  // wrap position around
  if ( this.options.wrapAround && this.cells.length > 1 ) {
    x = utils.modulo( x, this.slideableWidth );
    x -= this.slideableWidth;
    this.shiftWrapCells( x );
  }

  this.setTranslateX( x, this.isAnimating );
  this.dispatchScrollEvent();
};

proto.setTranslateX = function( x, is3d ) {
  x += this.cursorPosition;
  // reverse if right-to-left and using transform
  x = this.options.rightToLeft ? -x : x;
  var translateX = this.getPositionValue( x );
  // use 3D transforms for hardware acceleration on iOS
  // but use 2D when settled, for better font-rendering
  this.slider.style.transform = is3d ?
    'translate3d(' + translateX + ',0,0)' : 'translateX(' + translateX + ')';
};

proto.dispatchScrollEvent = function() {
  var firstSlide = this.slides[0];
  if ( !firstSlide ) {
    return;
  }
  var positionX = -this.x - firstSlide.target;
  var progress = positionX / this.slidesWidth;
  this.dispatchEvent( 'scroll', null, [ progress, positionX ] );
};

proto.positionSliderAtSelected = function() {
  if ( !this.cells.length ) {
    return;
  }
  this.x = -this.selectedSlide.target;
  this.velocity = 0; // stop wobble
  this.positionSlider();
};

proto.getPositionValue = function( position ) {
  if ( this.options.percentPosition ) {
    // percent position, round to 2 digits, like 12.34%
    return ( Math.round( ( position / this.size.innerWidth ) * 10000 ) * 0.01 ) + '%';
  } else {
    // pixel positioning
    return Math.round( position ) + 'px';
  }
};

proto.settle = function( previousX ) {
  // keep track of frames where x hasn't moved
  var isResting = !this.isPointerDown &&
      Math.round( this.x * 100 ) == Math.round( previousX * 100 );
  if ( isResting ) {
    this.restingFrames++;
  }
  // stop animating if resting for 3 or more frames
  if ( this.restingFrames > 2 ) {
    this.isAnimating = false;
    delete this.isFreeScrolling;
    // render position with translateX when settled
    this.positionSlider();
    this.dispatchEvent( 'settle', null, [ this.selectedIndex ] );
  }

  this.checkVisibility();
};

proto.shiftWrapCells = function( x ) {
  // shift before cells
  var beforeGap = this.cursorPosition + x;
  this._shiftCells( this.beforeShiftCells, beforeGap, -1 );
  // shift after cells
  var afterGap = this.size.innerWidth - ( x + this.slideableWidth + this.cursorPosition );
  this._shiftCells( this.afterShiftCells, afterGap, 1 );
};

proto._shiftCells = function( cells, gap, shift ) {
  for ( var i = 0; i < cells.length; i++ ) {
    var cell = cells[i];
    var cellShift = gap > 0 ? shift : 0;
    cell.wrapShift( cellShift );
    gap -= cell.size.outerWidth;
  }
};

proto._unshiftCells = function( cells ) {
  if ( !cells || !cells.length ) {
    return;
  }
  for ( var i = 0; i < cells.length; i++ ) {
    cells[i].wrapShift( 0 );
  }
};

// -------------------------- physics -------------------------- //

proto.integratePhysics = function() {
  this.x += this.velocity;
  this.velocity *= this.getFrictionFactor();
};

proto.applyForce = function( force ) {
  this.velocity += force;
};

proto.getFrictionFactor = function() {
  return 1 - this.options[ this.isFreeScrolling ? 'freeScrollFriction' : 'friction' ];
};

proto.getRestingPosition = function() {
  // my thanks to Steven Wittens, who simplified this math greatly
  return this.x + this.velocity / ( 1 - this.getFrictionFactor() );
};

proto.applyDragForce = function() {
  if ( !this.isDraggable || !this.isPointerDown ) {
    return;
  }
  // change the position to drag position by applying force
  var dragVelocity = this.dragX - this.x;
  var dragForce = dragVelocity - this.velocity;
  this.applyForce( dragForce );
};

proto.applySelectedAttraction = function() {
  // do not attract if pointer down or no slides
  var dragDown = this.isDraggable && this.isPointerDown;
  if ( dragDown || this.isFreeScrolling || !this.slides.length ) {
    return;
  }
  var distance = this.selectedSlide.target * -1 - this.x;
  var force = distance * this.options.selectedAttraction;
  this.applyForce( force );
};

return proto;

} ) );
}(animate));

(function (module) {
// Flickity main
/* eslint-disable max-params */
( function( window, factory ) {
  // universal module definition
  if ( module.exports ) {
    // CommonJS
    module.exports = factory(
        window,
        evEmitter.exports,
        getSize.exports,
        utils.exports,
        cell.exports,
        slide.exports,
        animate.exports
    );
  } else {
    // browser global
    var _Flickity = window.Flickity;

    window.Flickity = factory(
        window,
        window.EvEmitter,
        window.getSize,
        window.fizzyUIUtils,
        _Flickity.Cell,
        _Flickity.Slide,
        _Flickity.animatePrototype
    );
  }

}( window, function factory( window, EvEmitter, getSize,
    utils, Cell, Slide, animatePrototype ) {

// vars
var jQuery = window.jQuery;
var getComputedStyle = window.getComputedStyle;
var console = window.console;

function moveElements( elems, toElem ) {
  elems = utils.makeArray( elems );
  while ( elems.length ) {
    toElem.appendChild( elems.shift() );
  }
}

// -------------------------- Flickity -------------------------- //

// globally unique identifiers
var GUID = 0;
// internal store of all Flickity intances
var instances = {};

function Flickity( element, options ) {
  var queryElement = utils.getQueryElement( element );
  if ( !queryElement ) {
    if ( console ) {
      console.error( 'Bad element for Flickity: ' + ( queryElement || element ) );
    }
    return;
  }
  this.element = queryElement;
  // do not initialize twice on same element
  if ( this.element.flickityGUID ) {
    var instance = instances[ this.element.flickityGUID ];
    if ( instance ) instance.option( options );
    return instance;
  }

  // add jQuery
  if ( jQuery ) {
    this.$element = jQuery( this.element );
  }
  // options
  this.options = utils.extend( {}, this.constructor.defaults );
  this.option( options );

  // kick things off
  this._create();
}

Flickity.defaults = {
  accessibility: true,
  // adaptiveHeight: false,
  cellAlign: 'center',
  // cellSelector: undefined,
  // contain: false,
  freeScrollFriction: 0.075, // friction when free-scrolling
  friction: 0.28, // friction when selecting
  namespaceJQueryEvents: true,
  // initialIndex: 0,
  percentPosition: true,
  resize: true,
  selectedAttraction: 0.025,
  setGallerySize: true,
  // watchCSS: false,
  // wrapAround: false
};

// hash of methods triggered on _create()
Flickity.createMethods = [];

var proto = Flickity.prototype;
// inherit EventEmitter
utils.extend( proto, EvEmitter.prototype );

proto._create = function() {
  // add id for Flickity.data
  var id = this.guid = ++GUID;
  this.element.flickityGUID = id; // expando
  instances[ id ] = this; // associate via id
  // initial properties
  this.selectedIndex = 0;
  // how many frames slider has been in same position
  this.restingFrames = 0;
  // initial physics properties
  this.x = 0;
  this.velocity = 0;
  this.originSide = this.options.rightToLeft ? 'right' : 'left';
  // create viewport & slider
  this.viewport = document.createElement('div');
  this.viewport.className = 'flickity-viewport';
  this._createSlider();

  if ( this.options.resize || this.options.watchCSS ) {
    window.addEventListener( 'resize', this );
  }

  // add listeners from on option
  for ( var eventName in this.options.on ) {
    var listener = this.options.on[ eventName ];
    this.on( eventName, listener );
  }

  Flickity.createMethods.forEach( function( method ) {
    this[ method ]();
  }, this );

  if ( this.options.watchCSS ) {
    this.watchCSS();
  } else {
    this.activate();
  }

};

/**
 * set options
 * @param {Object} opts - options to extend
 */
proto.option = function( opts ) {
  utils.extend( this.options, opts );
};

proto.activate = function() {
  if ( this.isActive ) {
    return;
  }
  this.isActive = true;
  this.element.classList.add('flickity-enabled');
  if ( this.options.rightToLeft ) {
    this.element.classList.add('flickity-rtl');
  }

  this.getSize();
  // move initial cell elements so they can be loaded as cells
  var cellElems = this._filterFindCellElements( this.element.children );
  moveElements( cellElems, this.slider );
  this.viewport.appendChild( this.slider );
  this.element.appendChild( this.viewport );
  // get cells from children
  this.reloadCells();

  if ( this.options.accessibility ) {
    // allow element to focusable
    this.element.tabIndex = 0;
    // listen for key presses
    this.element.addEventListener( 'keydown', this );
  }

  this.emitEvent('activate');
  this.selectInitialIndex();
  // flag for initial activation, for using initialIndex
  this.isInitActivated = true;
  // ready event. #493
  this.dispatchEvent('ready');
};

// slider positions the cells
proto._createSlider = function() {
  // slider element does all the positioning
  var slider = document.createElement('div');
  slider.className = 'flickity-slider';
  slider.style[ this.originSide ] = 0;
  this.slider = slider;
};

proto._filterFindCellElements = function( elems ) {
  return utils.filterFindElements( elems, this.options.cellSelector );
};

// goes through all children
proto.reloadCells = function() {
  // collection of item elements
  this.cells = this._makeCells( this.slider.children );
  this.positionCells();
  this._getWrapShiftCells();
  this.setGallerySize();
};

/**
 * turn elements into Flickity.Cells
 * @param {[Array, NodeList, HTMLElement]} elems - elements to make into cells
 * @returns {Array} items - collection of new Flickity Cells
 */
proto._makeCells = function( elems ) {
  var cellElems = this._filterFindCellElements( elems );

  // create new Flickity for collection
  var cells = cellElems.map( function( cellElem ) {
    return new Cell( cellElem, this );
  }, this );

  return cells;
};

proto.getLastCell = function() {
  return this.cells[ this.cells.length - 1 ];
};

proto.getLastSlide = function() {
  return this.slides[ this.slides.length - 1 ];
};

// positions all cells
proto.positionCells = function() {
  // size all cells
  this._sizeCells( this.cells );
  // position all cells
  this._positionCells( 0 );
};

/**
 * position certain cells
 * @param {Integer} index - which cell to start with
 */
proto._positionCells = function( index ) {
  index = index || 0;
  // also measure maxCellHeight
  // start 0 if positioning all cells
  this.maxCellHeight = index ? this.maxCellHeight || 0 : 0;
  var cellX = 0;
  // get cellX
  if ( index > 0 ) {
    var startCell = this.cells[ index - 1 ];
    cellX = startCell.x + startCell.size.outerWidth;
  }
  var len = this.cells.length;
  for ( var i = index; i < len; i++ ) {
    var cell = this.cells[i];
    cell.setPosition( cellX );
    cellX += cell.size.outerWidth;
    this.maxCellHeight = Math.max( cell.size.outerHeight, this.maxCellHeight );
  }
  // keep track of cellX for wrap-around
  this.slideableWidth = cellX;
  // slides
  this.updateSlides();
  // contain slides target
  this._containSlides();
  // update slidesWidth
  this.slidesWidth = len ? this.getLastSlide().target - this.slides[0].target : 0;
};

/**
 * cell.getSize() on multiple cells
 * @param {Array} cells - cells to size
 */
proto._sizeCells = function( cells ) {
  cells.forEach( function( cell ) {
    cell.getSize();
  } );
};

// --------------------------  -------------------------- //

proto.updateSlides = function() {
  this.slides = [];
  if ( !this.cells.length ) {
    return;
  }

  var slide = new Slide( this );
  this.slides.push( slide );
  var isOriginLeft = this.originSide == 'left';
  var nextMargin = isOriginLeft ? 'marginRight' : 'marginLeft';

  var canCellFit = this._getCanCellFit();

  this.cells.forEach( function( cell, i ) {
    // just add cell if first cell in slide
    if ( !slide.cells.length ) {
      slide.addCell( cell );
      return;
    }

    var slideWidth = ( slide.outerWidth - slide.firstMargin ) +
      ( cell.size.outerWidth - cell.size[ nextMargin ] );

    if ( canCellFit.call( this, i, slideWidth ) ) {
      slide.addCell( cell );
    } else {
      // doesn't fit, new slide
      slide.updateTarget();

      slide = new Slide( this );
      this.slides.push( slide );
      slide.addCell( cell );
    }
  }, this );
  // last slide
  slide.updateTarget();
  // update .selectedSlide
  this.updateSelectedSlide();
};

proto._getCanCellFit = function() {
  var groupCells = this.options.groupCells;
  if ( !groupCells ) {
    return function() {
      return false;
    };
  } else if ( typeof groupCells == 'number' ) {
    // group by number. 3 -> [0,1,2], [3,4,5], ...
    var number = parseInt( groupCells, 10 );
    return function( i ) {
      return ( i % number ) !== 0;
    };
  }
  // default, group by width of slide
  // parse '75%
  var percentMatch = typeof groupCells == 'string' &&
    groupCells.match( /^(\d+)%$/ );
  var percent = percentMatch ? parseInt( percentMatch[1], 10 ) / 100 : 1;
  return function( i, slideWidth ) {
    /* eslint-disable-next-line no-invalid-this */
    return slideWidth <= ( this.size.innerWidth + 1 ) * percent;
  };
};

// alias _init for jQuery plugin .flickity()
proto._init =
proto.reposition = function() {
  this.positionCells();
  this.positionSliderAtSelected();
};

proto.getSize = function() {
  this.size = getSize( this.element );
  this.setCellAlign();
  this.cursorPosition = this.size.innerWidth * this.cellAlign;
};

var cellAlignShorthands = {
  // cell align, then based on origin side
  center: {
    left: 0.5,
    right: 0.5,
  },
  left: {
    left: 0,
    right: 1,
  },
  right: {
    right: 0,
    left: 1,
  },
};

proto.setCellAlign = function() {
  var shorthand = cellAlignShorthands[ this.options.cellAlign ];
  this.cellAlign = shorthand ? shorthand[ this.originSide ] : this.options.cellAlign;
};

proto.setGallerySize = function() {
  if ( this.options.setGallerySize ) {
    var height = this.options.adaptiveHeight && this.selectedSlide ?
      this.selectedSlide.height : this.maxCellHeight;
    this.viewport.style.height = height + 'px';
  }
};

proto._getWrapShiftCells = function() {
  // only for wrap-around
  if ( !this.options.wrapAround ) {
    return;
  }
  // unshift previous cells
  this._unshiftCells( this.beforeShiftCells );
  this._unshiftCells( this.afterShiftCells );
  // get before cells
  // initial gap
  var gapX = this.cursorPosition;
  var cellIndex = this.cells.length - 1;
  this.beforeShiftCells = this._getGapCells( gapX, cellIndex, -1 );
  // get after cells
  // ending gap between last cell and end of gallery viewport
  gapX = this.size.innerWidth - this.cursorPosition;
  // start cloning at first cell, working forwards
  this.afterShiftCells = this._getGapCells( gapX, 0, 1 );
};

proto._getGapCells = function( gapX, cellIndex, increment ) {
  // keep adding cells until the cover the initial gap
  var cells = [];
  while ( gapX > 0 ) {
    var cell = this.cells[ cellIndex ];
    if ( !cell ) {
      break;
    }
    cells.push( cell );
    cellIndex += increment;
    gapX -= cell.size.outerWidth;
  }
  return cells;
};

// ----- contain ----- //

// contain cell targets so no excess sliding
proto._containSlides = function() {
  if ( !this.options.contain || this.options.wrapAround || !this.cells.length ) {
    return;
  }
  var isRightToLeft = this.options.rightToLeft;
  var beginMargin = isRightToLeft ? 'marginRight' : 'marginLeft';
  var endMargin = isRightToLeft ? 'marginLeft' : 'marginRight';
  var contentWidth = this.slideableWidth - this.getLastCell().size[ endMargin ];
  // content is less than gallery size
  var isContentSmaller = contentWidth < this.size.innerWidth;
  // bounds
  var beginBound = this.cursorPosition + this.cells[0].size[ beginMargin ];
  var endBound = contentWidth - this.size.innerWidth * ( 1 - this.cellAlign );
  // contain each cell target
  this.slides.forEach( function( slide ) {
    if ( isContentSmaller ) {
      // all cells fit inside gallery
      slide.target = contentWidth * this.cellAlign;
    } else {
      // contain to bounds
      slide.target = Math.max( slide.target, beginBound );
      slide.target = Math.min( slide.target, endBound );
    }
  }, this );
};

// -----  ----- //

/**
 * emits events via eventEmitter and jQuery events
 * @param {String} type - name of event
 * @param {Event} event - original event
 * @param {Array} args - extra arguments
 */
proto.dispatchEvent = function( type, event, args ) {
  var emitArgs = event ? [ event ].concat( args ) : args;
  this.emitEvent( type, emitArgs );

  if ( jQuery && this.$element ) {
    // default trigger with type if no event
    type += this.options.namespaceJQueryEvents ? '.flickity' : '';
    var $event = type;
    if ( event ) {
      // create jQuery event
      var jQEvent = new jQuery.Event( event );
      jQEvent.type = type;
      $event = jQEvent;
    }
    this.$element.trigger( $event, args );
  }
};

// -------------------------- select -------------------------- //

/**
 * @param {Integer} index - index of the slide
 * @param {Boolean} isWrap - will wrap-around to last/first if at the end
 * @param {Boolean} isInstant - will immediately set position at selected cell
 */
proto.select = function( index, isWrap, isInstant ) {
  if ( !this.isActive ) {
    return;
  }
  index = parseInt( index, 10 );
  this._wrapSelect( index );

  if ( this.options.wrapAround || isWrap ) {
    index = utils.modulo( index, this.slides.length );
  }
  // bail if invalid index
  if ( !this.slides[ index ] ) {
    return;
  }
  var prevIndex = this.selectedIndex;
  this.selectedIndex = index;
  this.updateSelectedSlide();
  if ( isInstant ) {
    this.positionSliderAtSelected();
  } else {
    this.startAnimation();
  }
  if ( this.options.adaptiveHeight ) {
    this.setGallerySize();
  }
  // events
  this.dispatchEvent( 'select', null, [ index ] );
  // change event if new index
  if ( index != prevIndex ) {
    this.dispatchEvent( 'change', null, [ index ] );
  }
  // old v1 event name, remove in v3
  this.dispatchEvent('cellSelect');
};

// wraps position for wrapAround, to move to closest slide. #113
proto._wrapSelect = function( index ) {
  var len = this.slides.length;
  var isWrapping = this.options.wrapAround && len > 1;
  if ( !isWrapping ) {
    return index;
  }
  var wrapIndex = utils.modulo( index, len );
  // go to shortest
  var delta = Math.abs( wrapIndex - this.selectedIndex );
  var backWrapDelta = Math.abs( ( wrapIndex + len ) - this.selectedIndex );
  var forewardWrapDelta = Math.abs( ( wrapIndex - len ) - this.selectedIndex );
  if ( !this.isDragSelect && backWrapDelta < delta ) {
    index += len;
  } else if ( !this.isDragSelect && forewardWrapDelta < delta ) {
    index -= len;
  }
  // wrap position so slider is within normal area
  if ( index < 0 ) {
    this.x -= this.slideableWidth;
  } else if ( index >= len ) {
    this.x += this.slideableWidth;
  }
};

proto.previous = function( isWrap, isInstant ) {
  this.select( this.selectedIndex - 1, isWrap, isInstant );
};

proto.next = function( isWrap, isInstant ) {
  this.select( this.selectedIndex + 1, isWrap, isInstant );
};

proto.updateSelectedSlide = function() {
  var slide = this.slides[ this.selectedIndex ];
  // selectedIndex could be outside of slides, if triggered before resize()
  if ( !slide ) {
    return;
  }
  // unselect previous selected slide
  this.unselectSelectedSlide();
  // update new selected slide
  this.selectedSlide = slide;
  slide.select();
  this.selectedCells = slide.cells;
  this.selectedElements = slide.getCellElements();
  // HACK: selectedCell & selectedElement is first cell in slide, backwards compatibility
  // Remove in v3?
  this.selectedCell = slide.cells[0];
  this.selectedElement = this.selectedElements[0];
};

proto.unselectSelectedSlide = function() {
  if ( this.selectedSlide ) {
    this.selectedSlide.unselect();
  }
};

proto.selectInitialIndex = function() {
  var initialIndex = this.options.initialIndex;
  // already activated, select previous selectedIndex
  if ( this.isInitActivated ) {
    this.select( this.selectedIndex, false, true );
    return;
  }
  // select with selector string
  if ( initialIndex && typeof initialIndex == 'string' ) {
    var cell = this.queryCell( initialIndex );
    if ( cell ) {
      this.selectCell( initialIndex, false, true );
      return;
    }
  }

  var index = 0;
  // select with number
  if ( initialIndex && this.slides[ initialIndex ] ) {
    index = initialIndex;
  }
  // select instantly
  this.select( index, false, true );
};

/**
 * select slide from number or cell element
 * @param {[Element, Number]} value - zero-based index or element to select
 * @param {Boolean} isWrap - enables wrapping around for extra index
 * @param {Boolean} isInstant - disables slide animation
 */
proto.selectCell = function( value, isWrap, isInstant ) {
  // get cell
  var cell = this.queryCell( value );
  if ( !cell ) {
    return;
  }

  var index = this.getCellSlideIndex( cell );
  this.select( index, isWrap, isInstant );
};

proto.getCellSlideIndex = function( cell ) {
  // get index of slides that has cell
  for ( var i = 0; i < this.slides.length; i++ ) {
    var slide = this.slides[i];
    var index = slide.cells.indexOf( cell );
    if ( index != -1 ) {
      return i;
    }
  }
};

// -------------------------- get cells -------------------------- //

/**
 * get Flickity.Cell, given an Element
 * @param {Element} elem - matching cell element
 * @returns {Flickity.Cell} cell - matching cell
 */
proto.getCell = function( elem ) {
  // loop through cells to get the one that matches
  for ( var i = 0; i < this.cells.length; i++ ) {
    var cell = this.cells[i];
    if ( cell.element == elem ) {
      return cell;
    }
  }
};

/**
 * get collection of Flickity.Cells, given Elements
 * @param {[Element, Array, NodeList]} elems - multiple elements
 * @returns {Array} cells - Flickity.Cells
 */
proto.getCells = function( elems ) {
  elems = utils.makeArray( elems );
  var cells = [];
  elems.forEach( function( elem ) {
    var cell = this.getCell( elem );
    if ( cell ) {
      cells.push( cell );
    }
  }, this );
  return cells;
};

/**
 * get cell elements
 * @returns {Array} cellElems
 */
proto.getCellElements = function() {
  return this.cells.map( function( cell ) {
    return cell.element;
  } );
};

/**
 * get parent cell from an element
 * @param {Element} elem - child element
 * @returns {Flickit.Cell} cell - parent cell
 */
proto.getParentCell = function( elem ) {
  // first check if elem is cell
  var cell = this.getCell( elem );
  if ( cell ) {
    return cell;
  }
  // try to get parent cell elem
  elem = utils.getParent( elem, '.flickity-slider > *' );
  return this.getCell( elem );
};

/**
 * get cells adjacent to a slide
 * @param {Integer} adjCount - number of adjacent slides
 * @param {Integer} index - index of slide to start
 * @returns {Array} cells - array of Flickity.Cells
 */
proto.getAdjacentCellElements = function( adjCount, index ) {
  if ( !adjCount ) {
    return this.selectedSlide.getCellElements();
  }
  index = index === undefined ? this.selectedIndex : index;

  var len = this.slides.length;
  if ( 1 + ( adjCount * 2 ) >= len ) {
    return this.getCellElements();
  }

  var cellElems = [];
  for ( var i = index - adjCount; i <= index + adjCount; i++ ) {
    var slideIndex = this.options.wrapAround ? utils.modulo( i, len ) : i;
    var slide = this.slides[ slideIndex ];
    if ( slide ) {
      cellElems = cellElems.concat( slide.getCellElements() );
    }
  }
  return cellElems;
};

/**
 * select slide from number or cell element
 * @param {[Element, String, Number]} selector - element, selector string, or index
 * @returns {Flickity.Cell} - matching cell
 */
proto.queryCell = function( selector ) {
  if ( typeof selector == 'number' ) {
    // use number as index
    return this.cells[ selector ];
  }
  if ( typeof selector == 'string' ) {
    // do not select invalid selectors from hash: #123, #/. #791
    if ( selector.match( /^[#.]?[\d/]/ ) ) {
      return;
    }
    // use string as selector, get element
    selector = this.element.querySelector( selector );
  }
  // get cell from element
  return this.getCell( selector );
};

proto.checkVisibility = function() {
  var viewportX = this.viewport.getBoundingClientRect().x;
  var viewportWidth = this.viewport.offsetWidth;

  // Lorenza pulls content that should be out of the viewport in to
  // force slides on either side of the viewport. We need to offset
  // the viewport by the maximum amount it can be pulled in 4px.
  if (this.options.wrapAround) {
    viewportWidth = viewportWidth - 4;
  }

  this.cells.forEach(function (cell) {
    var cellX = cell.element.getBoundingClientRect().x - viewportX;
    var isVisible = (
        (cellX > -1 && cellX < 1) ||
        (cellX + cell.size.innerWidth > viewportX) && (cellX + cell.size.innerWidth < viewportWidth) ||
        (cellX > viewportX) && (cellX < viewportWidth)
    );

    if (isVisible) {
      cell.element.classList.add('is-visible');
      cell.element.removeAttribute('aria-hidden');
      const targetable =  cell.element.querySelectorAll('button, a');

      targetable.forEach(target => target.tabIndex = 0);

    } else {
      cell.element.classList.remove('is-visible');
      cell.element.setAttribute('aria-hidden', true);
      const targetable =  cell.element.querySelectorAll('button, a');

      targetable.forEach(target => target.tabIndex = -1);
    }
  });
};

// -------------------------- events -------------------------- //

proto.uiChange = function() {
  this.emitEvent('uiChange');
};

// keep focus on element when child UI elements are clicked
proto.childUIPointerDown = function( event ) {
  // HACK iOS does not allow touch events to bubble up?!
  if ( event.type != 'touchstart' ) {
    event.preventDefault();
  }
  this.focus();
};

// ----- resize ----- //

proto.onresize = function() {
  this.watchCSS();
  this.resize();
};

utils.debounceMethod( Flickity, 'onresize', 150 );

proto.resize = function() {
  if ( !this.isActive ) {
    return;
  }
  this.getSize();
  // wrap values
  if ( this.options.wrapAround ) {
    this.x = utils.modulo( this.x, this.slideableWidth );
  }
  this.positionCells();
  this._getWrapShiftCells();
  this.setGallerySize();
  this.emitEvent('resize');
  // update selected index for group slides, instant
  // TODO: position can be lost between groups of various numbers
  var selectedElement = this.selectedElements && this.selectedElements[0];
  this.selectCell( selectedElement, false, true );
};

// watches the :after property, activates/deactivates
proto.watchCSS = function() {
  var watchOption = this.options.watchCSS;
  if ( !watchOption ) {
    return;
  }

  var afterContent = getComputedStyle( this.element, ':after' ).content;
  // activate if :after { content: 'flickity' }
  if ( afterContent.indexOf('flickity') != -1 ) {
    this.activate();
  } else {
    this.deactivate();
  }
};

// ----- keydown ----- //

// go previous/next if left/right keys pressed
proto.onkeydown = function( event ) {
  // only work if element is in focus
  var isNotFocused = document.activeElement && document.activeElement != this.element;
  if ( !this.options.accessibility || isNotFocused ) {
    return;
  }

  var handler = Flickity.keyboardHandlers[ event.keyCode ];
  if ( handler ) {
    handler.call( this );
  }
};

Flickity.keyboardHandlers = {
  // left arrow
  37: function() {
    var leftMethod = this.options.rightToLeft ? 'next' : 'previous';
    this.uiChange();
    this[ leftMethod ]();
  },
  // right arrow
  39: function() {
    var rightMethod = this.options.rightToLeft ? 'previous' : 'next';
    this.uiChange();
    this[ rightMethod ]();
  },
};

// ----- focus ----- //

proto.focus = function() {
  // TODO remove scrollTo once focus options gets more support
  // https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/focus ...
  //    #Browser_compatibility
  var prevScrollY = window.pageYOffset;
  this.element.focus({ preventScroll: true });
  // hack to fix scroll jump after focus, #76
  if ( window.pageYOffset != prevScrollY ) {
    window.scrollTo( window.pageXOffset, prevScrollY );
  }
};

// -------------------------- destroy -------------------------- //

// deactivate all Flickity functionality, but keep stuff available
proto.deactivate = function() {
  if ( !this.isActive ) {
    return;
  }
  this.element.classList.remove('flickity-enabled');
  this.element.classList.remove('flickity-rtl');
  this.unselectSelectedSlide();
  // destroy cells
  this.cells.forEach( function( cell ) {
    cell.destroy();
  } );
  this.element.removeChild( this.viewport );
  // move child elements back into element
  moveElements( this.slider.children, this.element );
  if ( this.options.accessibility ) {
    this.element.removeAttribute('tabIndex');
    this.element.removeEventListener( 'keydown', this );
  }
  // set flags
  this.isActive = false;
  this.emitEvent('deactivate');
};

proto.destroy = function() {
  this.deactivate();
  window.removeEventListener( 'resize', this );
  this.allOff();
  this.emitEvent('destroy');
  if ( jQuery && this.$element ) {
    jQuery.removeData( this.element, 'flickity' );
  }
  delete this.element.flickityGUID;
  delete instances[ this.guid ];
};

// -------------------------- prototype -------------------------- //

utils.extend( proto, animatePrototype );

// -------------------------- extras -------------------------- //

/**
 * get Flickity instance from element
 * @param {[Element, String]} elem - element or selector string
 * @returns {Flickity} - Flickity instance
 */
Flickity.data = function( elem ) {
  elem = utils.getQueryElement( elem );
  var id = elem && elem.flickityGUID;
  return id && instances[ id ];
};

utils.htmlInit( Flickity, 'flickity' );

if ( jQuery && jQuery.bridget ) {
  jQuery.bridget( 'flickity', Flickity );
}

// set internal jQuery, for Webpack + jQuery v3, #478
Flickity.setJQuery = function( jq ) {
  jQuery = jq;
};

Flickity.Cell = Cell;
Flickity.Slide = Slide;

return Flickity;

} ) );
}(flickity));

var drag = {exports: {}};

var unidragger = {exports: {}};

var unipointer = {exports: {}};

/*!
 * Unipointer v2.4.0
 * base class for doing one thing with pointer event
 * MIT license
 */

(function (module) {
/*jshint browser: true, undef: true, unused: true, strict: true */

( function( window, factory ) {
  // universal module definition
  /* jshint strict: false */ /*global define, module, require */
  if ( module.exports ) {
    // CommonJS
    module.exports = factory(
      window,
      evEmitter.exports
    );
  } else {
    // browser global
    window.Unipointer = factory(
      window,
      window.EvEmitter
    );
  }

}( window, function factory( window, EvEmitter ) {

function noop() {}

function Unipointer() {}

// inherit EvEmitter
var proto = Unipointer.prototype = Object.create( EvEmitter.prototype );

proto.bindStartEvent = function( elem ) {
  this._bindStartEvent( elem, true );
};

proto.unbindStartEvent = function( elem ) {
  this._bindStartEvent( elem, false );
};

/**
 * Add or remove start event
 * @param {Boolean} isAdd - remove if falsey
 */
proto._bindStartEvent = function( elem, isAdd ) {
  // munge isAdd, default to true
  isAdd = isAdd === undefined ? true : isAdd;
  var bindMethod = isAdd ? 'addEventListener' : 'removeEventListener';

  // default to mouse events
  var startEvent = 'mousedown';
  if ( 'ontouchstart' in window ) {
    // HACK prefer Touch Events as you can preventDefault on touchstart to
    // disable scroll in iOS & mobile Chrome metafizzy/flickity#1177
    startEvent = 'touchstart';
  } else if ( window.PointerEvent ) {
    // Pointer Events
    startEvent = 'pointerdown';
  }
  elem[ bindMethod ]( startEvent, this );
};

// trigger handler methods for events
proto.handleEvent = function( event ) {
  var method = 'on' + event.type;
  if ( this[ method ] ) {
    this[ method ]( event );
  }
};

// returns the touch that we're keeping track of
proto.getTouch = function( touches ) {
  for ( var i=0; i < touches.length; i++ ) {
    var touch = touches[i];
    if ( touch.identifier == this.pointerIdentifier ) {
      return touch;
    }
  }
};

// ----- start event ----- //

proto.onmousedown = function( event ) {
  // dismiss clicks from right or middle buttons
  var button = event.button;
  if ( button && ( button !== 0 && button !== 1 ) ) {
    return;
  }
  this._pointerDown( event, event );
};

proto.ontouchstart = function( event ) {
  this._pointerDown( event, event.changedTouches[0] );
};

proto.onpointerdown = function( event ) {
  this._pointerDown( event, event );
};

/**
 * pointer start
 * @param {Event} event
 * @param {Event or Touch} pointer
 */
proto._pointerDown = function( event, pointer ) {
  // dismiss right click and other pointers
  // button = 0 is okay, 1-4 not
  if ( event.button || this.isPointerDown ) {
    return;
  }

  this.isPointerDown = true;
  // save pointer identifier to match up touch events
  this.pointerIdentifier = pointer.pointerId !== undefined ?
    // pointerId for pointer events, touch.indentifier for touch events
    pointer.pointerId : pointer.identifier;

  this.pointerDown( event, pointer );
};

proto.pointerDown = function( event, pointer ) {
  this._bindPostStartEvents( event );
  this.emitEvent( 'pointerDown', [ event, pointer ] );
};

// hash of events to be bound after start event
var postStartEvents = {
  mousedown: [ 'mousemove', 'mouseup' ],
  touchstart: [ 'touchmove', 'touchend', 'touchcancel' ],
  pointerdown: [ 'pointermove', 'pointerup', 'pointercancel' ],
};

proto._bindPostStartEvents = function( event ) {
  if ( !event ) {
    return;
  }
  // get proper events to match start event
  var events = postStartEvents[ event.type ];
  // bind events to node
  events.forEach( function( eventName ) {
    window.addEventListener( eventName, this );
  }, this );
  // save these arguments
  this._boundPointerEvents = events;
};

proto._unbindPostStartEvents = function() {
  // check for _boundEvents, in case dragEnd triggered twice (old IE8 bug)
  if ( !this._boundPointerEvents ) {
    return;
  }
  this._boundPointerEvents.forEach( function( eventName ) {
    window.removeEventListener( eventName, this );
  }, this );

  delete this._boundPointerEvents;
};

// ----- move event ----- //

proto.onmousemove = function( event ) {
  this._pointerMove( event, event );
};

proto.onpointermove = function( event ) {
  if ( event.pointerId == this.pointerIdentifier ) {
    this._pointerMove( event, event );
  }
};

proto.ontouchmove = function( event ) {
  var touch = this.getTouch( event.changedTouches );
  if ( touch ) {
    this._pointerMove( event, touch );
  }
};

/**
 * pointer move
 * @param {Event} event
 * @param {Event or Touch} pointer
 * @private
 */
proto._pointerMove = function( event, pointer ) {
  this.pointerMove( event, pointer );
};

// public
proto.pointerMove = function( event, pointer ) {
  this.emitEvent( 'pointerMove', [ event, pointer ] );
};

// ----- end event ----- //


proto.onmouseup = function( event ) {
  this._pointerUp( event, event );
};

proto.onpointerup = function( event ) {
  if ( event.pointerId == this.pointerIdentifier ) {
    this._pointerUp( event, event );
  }
};

proto.ontouchend = function( event ) {
  var touch = this.getTouch( event.changedTouches );
  if ( touch ) {
    this._pointerUp( event, touch );
  }
};

/**
 * pointer up
 * @param {Event} event
 * @param {Event or Touch} pointer
 * @private
 */
proto._pointerUp = function( event, pointer ) {
  this._pointerDone();
  this.pointerUp( event, pointer );
};

// public
proto.pointerUp = function( event, pointer ) {
  this.emitEvent( 'pointerUp', [ event, pointer ] );
};

// ----- pointer done ----- //

// triggered on pointer up & pointer cancel
proto._pointerDone = function() {
  this._pointerReset();
  this._unbindPostStartEvents();
  this.pointerDone();
};

proto._pointerReset = function() {
  // reset properties
  this.isPointerDown = false;
  delete this.pointerIdentifier;
};

proto.pointerDone = noop;

// ----- pointer cancel ----- //

proto.onpointercancel = function( event ) {
  if ( event.pointerId == this.pointerIdentifier ) {
    this._pointerCancel( event, event );
  }
};

proto.ontouchcancel = function( event ) {
  var touch = this.getTouch( event.changedTouches );
  if ( touch ) {
    this._pointerCancel( event, touch );
  }
};

/**
 * pointer cancel
 * @param {Event} event
 * @param {Event or Touch} pointer
 * @private
 */
proto._pointerCancel = function( event, pointer ) {
  this._pointerDone();
  this.pointerCancel( event, pointer );
};

// public
proto.pointerCancel = function( event, pointer ) {
  this.emitEvent( 'pointerCancel', [ event, pointer ] );
};

// -----  ----- //

// utility function for getting x/y coords from event
Unipointer.getPointerPoint = function( pointer ) {
  return {
    x: pointer.pageX,
    y: pointer.pageY
  };
};

// -----  ----- //

return Unipointer;

}));
}(unipointer));

/*!
 * Unidragger v2.4.0
 * Draggable base class
 * MIT license
 */

(function (module) {
/*jshint browser: true, unused: true, undef: true, strict: true */

( function( window, factory ) {
  // universal module definition
  /*jshint strict: false */ /*globals define, module, require */

  if ( module.exports ) {
    // CommonJS
    module.exports = factory(
      window,
      unipointer.exports
    );
  } else {
    // browser global
    window.Unidragger = factory(
      window,
      window.Unipointer
    );
  }

}( window, function factory( window, Unipointer ) {

// -------------------------- Unidragger -------------------------- //

function Unidragger() {}

// inherit Unipointer & EvEmitter
var proto = Unidragger.prototype = Object.create( Unipointer.prototype );

// ----- bind start ----- //

proto.bindHandles = function() {
  this._bindHandles( true );
};

proto.unbindHandles = function() {
  this._bindHandles( false );
};

/**
 * Add or remove start event
 * @param {Boolean} isAdd
 */
proto._bindHandles = function( isAdd ) {
  // munge isAdd, default to true
  isAdd = isAdd === undefined ? true : isAdd;
  // bind each handle
  var bindMethod = isAdd ? 'addEventListener' : 'removeEventListener';
  var touchAction = isAdd ? this._touchActionValue : '';
  for ( var i=0; i < this.handles.length; i++ ) {
    var handle = this.handles[i];
    this._bindStartEvent( handle, isAdd );
    handle[ bindMethod ]( 'click', this );
    // touch-action: none to override browser touch gestures. metafizzy/flickity#540
    if ( window.PointerEvent ) {
      handle.style.touchAction = touchAction;
    }
  }
};

// prototype so it can be overwriteable by Flickity
proto._touchActionValue = 'none';

// ----- start event ----- //

/**
 * pointer start
 * @param {Event} event
 * @param {Event or Touch} pointer
 */
proto.pointerDown = function( event, pointer ) {
  var isOkay = this.okayPointerDown( event );
  if ( !isOkay ) {
    return;
  }
  // track start event position
  // Safari 9 overrides pageX and pageY. These values needs to be copied. flickity#842
  this.pointerDownPointer = {
    pageX: pointer.pageX,
    pageY: pointer.pageY,
  };

  event.preventDefault();
  this.pointerDownBlur();
  // bind move and end events
  this._bindPostStartEvents( event );
  this.emitEvent( 'pointerDown', [ event, pointer ] );
};

// nodes that have text fields
var cursorNodes = {
  TEXTAREA: true,
  INPUT: true,
  SELECT: true,
  OPTION: true,
};

// input types that do not have text fields
var clickTypes = {
  radio: true,
  checkbox: true,
  button: true,
  submit: true,
  image: true,
  file: true,
};

// dismiss inputs with text fields. flickity#403, flickity#404
proto.okayPointerDown = function( event ) {
  var isCursorNode = cursorNodes[ event.target.nodeName ];
  var isClickType = clickTypes[ event.target.type ];
  var isOkay = !isCursorNode || isClickType;
  if ( !isOkay ) {
    this._pointerReset();
  }
  return isOkay;
};

// kludge to blur previously focused input
proto.pointerDownBlur = function() {
  var focused = document.activeElement;
  // do not blur body for IE10, metafizzy/flickity#117
  var canBlur = focused && focused.blur && focused != document.body;
  if ( canBlur ) {
    focused.blur();
  }
};

// ----- move event ----- //

/**
 * drag move
 * @param {Event} event
 * @param {Event or Touch} pointer
 */
proto.pointerMove = function( event, pointer ) {
  var moveVector = this._dragPointerMove( event, pointer );
  this.emitEvent( 'pointerMove', [ event, pointer, moveVector ] );
  this._dragMove( event, pointer, moveVector );
};

// base pointer move logic
proto._dragPointerMove = function( event, pointer ) {
  var moveVector = {
    x: pointer.pageX - this.pointerDownPointer.pageX,
    y: pointer.pageY - this.pointerDownPointer.pageY
  };
  // start drag if pointer has moved far enough to start drag
  if ( !this.isDragging && this.hasDragStarted( moveVector ) ) {
    this._dragStart( event, pointer );
  }
  return moveVector;
};

// condition if pointer has moved far enough to start drag
proto.hasDragStarted = function( moveVector ) {
  return Math.abs( moveVector.x ) > 3 || Math.abs( moveVector.y ) > 3;
};

// ----- end event ----- //

/**
 * pointer up
 * @param {Event} event
 * @param {Event or Touch} pointer
 */
proto.pointerUp = function( event, pointer ) {
  this.emitEvent( 'pointerUp', [ event, pointer ] );
  this._dragPointerUp( event, pointer );
};

proto._dragPointerUp = function( event, pointer ) {
  if ( this.isDragging ) {
    this._dragEnd( event, pointer );
  } else {
    // pointer didn't move enough for drag to start
    this._staticClick( event, pointer );
  }
};

// -------------------------- drag -------------------------- //

// dragStart
proto._dragStart = function( event, pointer ) {
  this.isDragging = true;
  // prevent clicks
  this.isPreventingClicks = true;
  this.dragStart( event, pointer );
};

proto.dragStart = function( event, pointer ) {
  this.emitEvent( 'dragStart', [ event, pointer ] );
};

// dragMove
proto._dragMove = function( event, pointer, moveVector ) {
  // do not drag if not dragging yet
  if ( !this.isDragging ) {
    return;
  }

  this.dragMove( event, pointer, moveVector );
};

proto.dragMove = function( event, pointer, moveVector ) {
  event.preventDefault();
  this.emitEvent( 'dragMove', [ event, pointer, moveVector ] );
};

// dragEnd
proto._dragEnd = function( event, pointer ) {
  // set flags
  this.isDragging = false;
  // re-enable clicking async
  setTimeout( function() {
    delete this.isPreventingClicks;
  }.bind( this ) );

  this.dragEnd( event, pointer );
};

proto.dragEnd = function( event, pointer ) {
  this.emitEvent( 'dragEnd', [ event, pointer ] );
};

// ----- onclick ----- //

// handle all clicks and prevent clicks when dragging
proto.onclick = function( event ) {
  if ( this.isPreventingClicks ) {
    event.preventDefault();
  }
};

// ----- staticClick ----- //

// triggered after pointer down & up with no/tiny movement
proto._staticClick = function( event, pointer ) {
  // ignore emulated mouse up clicks
  if ( this.isIgnoringMouseUp && event.type == 'mouseup' ) {
    return;
  }

  this.staticClick( event, pointer );

  // set flag for emulated clicks 300ms after touchend
  if ( event.type != 'mouseup' ) {
    this.isIgnoringMouseUp = true;
    // reset flag after 300ms
    setTimeout( function() {
      delete this.isIgnoringMouseUp;
    }.bind( this ), 400 );
  }
};

proto.staticClick = function( event, pointer ) {
  this.emitEvent( 'staticClick', [ event, pointer ] );
};

// ----- utils ----- //

Unidragger.getPointerPoint = Unipointer.getPointerPoint;

// -----  ----- //

return Unidragger;

}));
}(unidragger));

(function (module) {
// drag
( function( window, factory ) {
  // universal module definition
  if ( module.exports ) {
    // CommonJS
    module.exports = factory(
        window,
        flickity.exports,
        unidragger.exports,
        utils.exports
    );
  } else {
    // browser global
    window.Flickity = factory(
        window,
        window.Flickity,
        window.Unidragger,
        window.fizzyUIUtils
    );
  }

}( window, function factory( window, Flickity, Unidragger, utils ) {

// ----- defaults ----- //

utils.extend( Flickity.defaults, {
  draggable: '>1',
  dragThreshold: 3,
} );

// ----- create ----- //

Flickity.createMethods.push('_createDrag');

// -------------------------- drag prototype -------------------------- //

var proto = Flickity.prototype;
utils.extend( proto, Unidragger.prototype );
proto._touchActionValue = 'pan-y';

// --------------------------  -------------------------- //

var isTouch = 'createTouch' in document;
var isTouchmoveScrollCanceled = false;

proto._createDrag = function() {
  this.on( 'activate', this.onActivateDrag );
  this.on( 'uiChange', this._uiChangeDrag );
  this.on( 'deactivate', this.onDeactivateDrag );
  this.on( 'cellChange', this.updateDraggable );
  // TODO updateDraggable on resize? if groupCells & slides change
  // HACK - add seemingly innocuous handler to fix iOS 10 scroll behavior
  // #457, RubaXa/Sortable#973
  if ( isTouch && !isTouchmoveScrollCanceled ) {
    window.addEventListener( 'touchmove', function() {} );
    isTouchmoveScrollCanceled = true;
  }
};

proto.onActivateDrag = function() {
  this.handles = [ this.viewport ];
  this.bindHandles();
  this.updateDraggable();
};

proto.onDeactivateDrag = function() {
  this.unbindHandles();
  this.element.classList.remove('is-draggable');
};

proto.updateDraggable = function() {
  // disable dragging if less than 2 slides. #278
  if ( this.options.draggable == '>1' ) {
    this.isDraggable = this.slides.length > 1;
  } else if (this.options.draggable === 'onOverflow') {
    this.isDraggable = this.viewport.scrollWidth > this.viewport.offsetWidth;
  } else {
    this.isDraggable = this.options.draggable;
  }
  if ( this.isDraggable ) {
    this.element.classList.add('is-draggable');
  } else {
    this.element.classList.remove('is-draggable');
  }
};

// backwards compatibility
proto.bindDrag = function() {
  this.options.draggable = true;
  this.updateDraggable();
};

proto.unbindDrag = function() {
  this.options.draggable = false;
  this.updateDraggable();
};

proto._uiChangeDrag = function() {
  delete this.isFreeScrolling;
};

// -------------------------- pointer events -------------------------- //

proto.pointerDown = function( event, pointer ) {
  if ( !this.isDraggable ) {
    this._pointerDownDefault( event, pointer );
    return;
  }
  var isOkay = this.okayPointerDown( event );
  if ( !isOkay ) {
    return;
  }

  this._pointerDownPreventDefault( event );
  this.pointerDownFocus( event );
  // blur
  if ( document.activeElement != this.element ) {
    // do not blur if already focused
    this.pointerDownBlur();
  }

  // stop if it was moving
  this.dragX = this.x;
  this.viewport.classList.add('is-pointer-down');
  // track scrolling
  this.pointerDownScroll = getScrollPosition();
  window.addEventListener( 'scroll', this );

  this._pointerDownDefault( event, pointer );
};

// default pointerDown logic, used for staticClick
proto._pointerDownDefault = function( event, pointer ) {
  // track start event position
  // Safari 9 overrides pageX and pageY. These values needs to be copied. #779
  this.pointerDownPointer = {
    pageX: pointer.pageX,
    pageY: pointer.pageY,
  };
  // bind move and end events
  this._bindPostStartEvents( event );
  this.dispatchEvent( 'pointerDown', event, [ pointer ] );
};

var focusNodes = {
  INPUT: true,
  TEXTAREA: true,
  SELECT: true,
};

proto.pointerDownFocus = function( event ) {
  var isFocusNode = focusNodes[ event.target.nodeName ];
  if ( !isFocusNode ) {
    this.focus();
  }
};

proto._pointerDownPreventDefault = function( event ) {
  var isTouchStart = event.type == 'touchstart';
  var isTouchPointer = event.pointerType == 'touch';
  var isFocusNode = focusNodes[ event.target.nodeName ];
  if ( !isTouchStart && !isTouchPointer && !isFocusNode ) {
    event.preventDefault();
  }
};

// ----- move ----- //

proto.hasDragStarted = function( moveVector ) {
  return Math.abs( moveVector.x ) > this.options.dragThreshold;
};

// ----- up ----- //

proto.pointerUp = function( event, pointer ) {
  delete this.isTouchScrolling;
  this.viewport.classList.remove('is-pointer-down');
  this.dispatchEvent( 'pointerUp', event, [ pointer ] );
  this._dragPointerUp( event, pointer );
};

proto.pointerDone = function() {
  window.removeEventListener( 'scroll', this );
  delete this.pointerDownScroll;
};

// -------------------------- dragging -------------------------- //

proto.dragStart = function( event, pointer ) {
  if ( !this.isDraggable ) {
    return;
  }
  this.dragStartPosition = this.x;
  this.startAnimation();
  window.removeEventListener( 'scroll', this );
  this.dispatchEvent( 'dragStart', event, [ pointer ] );
};

proto.pointerMove = function( event, pointer ) {
  var moveVector = this._dragPointerMove( event, pointer );
  this.dispatchEvent( 'pointerMove', event, [ pointer, moveVector ] );
  this._dragMove( event, pointer, moveVector );
};

proto.dragMove = function( event, pointer, moveVector ) {
  if ( !this.isDraggable ) {
    return;
  }
  event.preventDefault();

  this.previousDragX = this.dragX;
  // reverse if right-to-left
  var direction = this.options.rightToLeft ? -1 : 1;
  if ( this.options.wrapAround ) {
    // wrap around move. #589
    moveVector.x %= this.slideableWidth;
  }
  var dragX = this.dragStartPosition + moveVector.x * direction;

  if ( !this.options.wrapAround && this.slides.length ) {
    // slow drag
    var originBound = Math.max( -this.slides[0].target, this.dragStartPosition );
    dragX = dragX > originBound ? ( dragX + originBound ) * 0.5 : dragX;
    var endBound = Math.min( -this.getLastSlide().target, this.dragStartPosition );
    dragX = dragX < endBound ? ( dragX + endBound ) * 0.5 : dragX;
  }

  this.dragX = dragX;

  this.dragMoveTime = new Date();
  this.dispatchEvent( 'dragMove', event, [ pointer, moveVector ] );
};

proto.dragEnd = function( event, pointer ) {
  if ( !this.isDraggable ) {
    return;
  }
  if ( this.options.freeScroll ) {
    this.isFreeScrolling = true;
  }
  // set selectedIndex based on where flick will end up
  var index = this.dragEndRestingSelect();

  if ( this.options.freeScroll && !this.options.wrapAround ) {
    // if free-scroll & not wrap around
    // do not free-scroll if going outside of bounding slides
    // so bounding slides can attract slider, and keep it in bounds
    var restingX = this.getRestingPosition();
    this.isFreeScrolling = -restingX > this.slides[0].target &&
      -restingX < this.getLastSlide().target;
  } else if ( !this.options.freeScroll && index == this.selectedIndex ) {
    // boost selection if selected index has not changed
    index += this.dragEndBoostSelect();
  }
  delete this.previousDragX;
  // apply selection
  // TODO refactor this, selecting here feels weird
  // HACK, set flag so dragging stays in correct direction
  this.isDragSelect = this.options.wrapAround;
  this.select( index );
  delete this.isDragSelect;
  this.dispatchEvent( 'dragEnd', event, [ pointer ] );
};

proto.dragEndRestingSelect = function() {
  var restingX = this.getRestingPosition();
  // how far away from selected slide
  var distance = Math.abs( this.getSlideDistance( -restingX, this.selectedIndex ) );
  // get closet resting going up and going down
  var positiveResting = this._getClosestResting( restingX, distance, 1 );
  var negativeResting = this._getClosestResting( restingX, distance, -1 );
  // use closer resting for wrap-around
  var index = positiveResting.distance < negativeResting.distance ?
    positiveResting.index : negativeResting.index;
  return index;
};

/**
 * given resting X and distance to selected cell
 * get the distance and index of the closest cell
 * @param {Number} restingX - estimated post-flick resting position
 * @param {Number} distance - distance to selected cell
 * @param {Integer} increment - +1 or -1, going up or down
 * @returns {Object} - { distance: {Number}, index: {Integer} }
 */
proto._getClosestResting = function( restingX, distance, increment ) {
  var index = this.selectedIndex;
  var minDistance = Infinity;
  var condition = this.options.contain && !this.options.wrapAround ?
    // if contain, keep going if distance is equal to minDistance
    function( dist, minDist ) {
      return dist <= minDist;
    } : function( dist, minDist ) {
      return dist < minDist;
    };
  while ( condition( distance, minDistance ) ) {
    // measure distance to next cell
    index += increment;
    minDistance = distance;
    distance = this.getSlideDistance( -restingX, index );
    if ( distance === null ) {
      break;
    }
    distance = Math.abs( distance );
  }
  return {
    distance: minDistance,
    // selected was previous index
    index: index - increment,
  };
};

/**
 * measure distance between x and a slide target
 * @param {Number} x - horizontal position
 * @param {Integer} index - slide index
 * @returns {Number} - slide distance
 */
proto.getSlideDistance = function( x, index ) {
  var len = this.slides.length;
  // wrap around if at least 2 slides
  var isWrapAround = this.options.wrapAround && len > 1;
  var slideIndex = isWrapAround ? utils.modulo( index, len ) : index;
  var slide = this.slides[ slideIndex ];
  if ( !slide ) {
    return null;
  }
  // add distance for wrap-around slides
  var wrap = isWrapAround ? this.slideableWidth * Math.floor( index/len ) : 0;
  return x - ( slide.target + wrap );
};

proto.dragEndBoostSelect = function() {
  // do not boost if no previousDragX or dragMoveTime
  if ( this.previousDragX === undefined || !this.dragMoveTime ||
    // or if drag was held for 100 ms
    new Date() - this.dragMoveTime > 100 ) {
    return 0;
  }

  var distance = this.getSlideDistance( -this.dragX, this.selectedIndex );
  var delta = this.previousDragX - this.dragX;
  if ( distance > 0 && delta > 0 ) {
    // boost to next if moving towards the right, and positive velocity
    return 1;
  } else if ( distance < 0 && delta < 0 ) {
    // boost to previous if moving towards the left, and negative velocity
    return -1;
  }
  return 0;
};

// ----- staticClick ----- //

proto.staticClick = function( event, pointer ) {
  // get clickedCell, if cell was clicked
  var clickedCell = this.getParentCell( event.target );
  var cellElem = clickedCell && clickedCell.element;
  var cellIndex = clickedCell && this.cells.indexOf( clickedCell );
  this.dispatchEvent( 'staticClick', event, [ pointer, cellElem, cellIndex ] );
};

// ----- scroll ----- //

proto.onscroll = function() {
  var scroll = getScrollPosition();
  var scrollMoveX = this.pointerDownScroll.x - scroll.x;
  var scrollMoveY = this.pointerDownScroll.y - scroll.y;
  // cancel click/tap if scroll is too much
  if ( Math.abs( scrollMoveX ) > 3 || Math.abs( scrollMoveY ) > 3 ) {
    this._pointerDone();
  }
};

// ----- utils ----- //

function getScrollPosition() {
  return {
    x: window.pageXOffset,
    y: window.pageYOffset,
  };
}

// -----  ----- //

return Flickity;

} ) );
}(drag));

var prevNextButton = {exports: {}};

(function (module) {
// prev/next buttons
( function( window, factory ) {
  // universal module definition
  if ( module.exports ) {
    // CommonJS
    module.exports = factory(
        window,
        flickity.exports,
        unipointer.exports,
        utils.exports
    );
  } else {
    // browser global
    factory(
        window,
        window.Flickity,
        window.Unipointer,
        window.fizzyUIUtils
    );
  }

}( window, function factory( window, Flickity, Unipointer, utils ) {

var svgURI = 'http://www.w3.org/2000/svg';

// -------------------------- PrevNextButton -------------------------- //

function PrevNextButton( direction, parent ) {
  this.direction = direction;
  this.parent = parent;
  this._create();
}

PrevNextButton.prototype = Object.create( Unipointer.prototype );

PrevNextButton.prototype._create = function() {
  // properties
  this.isEnabled = true;
  this.isPrevious = this.direction == -1;
  var leftDirection = this.parent.options.rightToLeft ? 1 : -1;
  this.isLeft = this.direction == leftDirection;

  var element = this.element = document.createElement('button');
  element.className = 'flickity-button flickity-prev-next-button';
  element.className += this.isPrevious ? ' previous' : ' next';
  // prevent button from submitting form http://stackoverflow.com/a/10836076/182183
  element.setAttribute( 'type', 'button' );
  // init as disabled
  this.disable();

  element.setAttribute( 'aria-label', this.isPrevious ? 'Previous' : 'Next' );

  // create arrow
  var svg = this.createSVG();
  element.appendChild( svg );
  // events
  this.parent.on( 'select', this.update.bind( this ) );
  this.on( 'pointerDown', this.parent.childUIPointerDown.bind( this.parent ) );
};

PrevNextButton.prototype.activate = function() {
  this.bindStartEvent( this.element );
  this.element.addEventListener( 'click', this );
  // add to DOM
  this.parent.element.appendChild( this.element );
};

PrevNextButton.prototype.deactivate = function() {
  // remove from DOM
  this.parent.element.removeChild( this.element );
  // click events
  this.unbindStartEvent( this.element );
  this.element.removeEventListener( 'click', this );
};

PrevNextButton.prototype.createSVG = function() {
  var svg = document.createElementNS( svgURI, 'svg' );
  svg.setAttribute( 'class', 'flickity-button-icon' );
  svg.setAttribute( 'viewBox', '0 0 100 100' );
  var path = document.createElementNS( svgURI, 'path' );
  var pathMovements = getArrowMovements( this.parent.options.arrowShape );
  path.setAttribute( 'd', pathMovements );
  path.setAttribute( 'class', 'arrow' );
  // rotate arrow
  if ( !this.isLeft ) {
    path.setAttribute( 'transform', 'translate(100, 100) rotate(180) ' );
  }
  svg.appendChild( path );
  return svg;
};

// get SVG path movmement
function getArrowMovements( shape ) {
  // use shape as movement if string
  if ( typeof shape == 'string' ) {
    return shape;
  }
  // create movement string
  return 'M ' + shape.x0 + ',50' +
    ' L ' + shape.x1 + ',' + ( shape.y1 + 50 ) +
    ' L ' + shape.x2 + ',' + ( shape.y2 + 50 ) +
    ' L ' + shape.x3 + ',50 ' +
    ' L ' + shape.x2 + ',' + ( 50 - shape.y2 ) +
    ' L ' + shape.x1 + ',' + ( 50 - shape.y1 ) +
    ' Z';
}

PrevNextButton.prototype.handleEvent = utils.handleEvent;

PrevNextButton.prototype.onclick = function() {
  if ( !this.isEnabled ) {
    return;
  }
  this.parent.uiChange();
  var method = this.isPrevious ? 'previous' : 'next';
  this.parent[ method ]();
};

// -----  ----- //

PrevNextButton.prototype.enable = function() {
  if ( this.isEnabled ) {
    return;
  }
  this.element.disabled = false;
  this.isEnabled = true;
};

PrevNextButton.prototype.disable = function() {
  if ( !this.isEnabled ) {
    return;
  }
  this.element.disabled = true;
  this.isEnabled = false;
};

PrevNextButton.prototype.update = function() {
  // index of first or last slide, if previous or next
  var slides = this.parent.slides;
  // enable is wrapAround and at least 2 slides
  if ( this.parent.options.wrapAround && slides.length > 1 ) {
    this.enable();
    return;
  }
  var lastIndex = slides.length ? slides.length - 1 : 0;
  var boundIndex = this.isPrevious ? 0 : lastIndex;
  var method = this.parent.selectedIndex == boundIndex ? 'disable' : 'enable';
  this[ method ]();
};

PrevNextButton.prototype.destroy = function() {
  this.deactivate();
  this.allOff();
};

// -------------------------- Flickity prototype -------------------------- //

utils.extend( Flickity.defaults, {
  prevNextButtons: true,
  arrowShape: {
    x0: 10,
    x1: 60, y1: 50,
    x2: 70, y2: 40,
    x3: 30,
  },
} );

Flickity.createMethods.push('_createPrevNextButtons');
var proto = Flickity.prototype;

proto._createPrevNextButtons = function() {
  if ( !this.options.prevNextButtons ) {
    return;
  }

  this.prevButton = new PrevNextButton( -1, this );
  this.nextButton = new PrevNextButton( 1, this );

  this.on( 'activate', this.activatePrevNextButtons );
};

proto.activatePrevNextButtons = function() {
  this.prevButton.activate();
  this.nextButton.activate();
  this.on( 'deactivate', this.deactivatePrevNextButtons );
};

proto.deactivatePrevNextButtons = function() {
  this.prevButton.deactivate();
  this.nextButton.deactivate();
  this.off( 'deactivate', this.deactivatePrevNextButtons );
};

// --------------------------  -------------------------- //

Flickity.PrevNextButton = PrevNextButton;

return Flickity;

} ) );
}(prevNextButton));

var pageDots$1 = {exports: {}};

(function (module) {
// page dots
( function( window, factory ) {
  // universal module definition
  if ( module.exports ) {
    // CommonJS
    module.exports = factory(
        window,
        flickity.exports,
        unipointer.exports,
        utils.exports
    );
  } else {
    // browser global
    factory(
        window,
        window.Flickity,
        window.Unipointer,
        window.fizzyUIUtils
    );
  }

}( window, function factory( window, Flickity, Unipointer, utils ) {

function PageDots( parent ) {
  this.parent = parent;
  this._create();
}

PageDots.prototype = Object.create( Unipointer.prototype );

PageDots.prototype._create = function() {
  // create holder element
  this.holder = document.createElement('ol');
  this.holder.className = 'flickity-page-dots';
  // create dots, array of elements
  this.dots = [];
  // events
  this.handleClick = this.onClick.bind( this );
  this.on( 'pointerDown', this.parent.childUIPointerDown.bind( this.parent ) );
};

PageDots.prototype.activate = function() {
  this.setDots();
  this.holder.addEventListener( 'click', this.handleClick );
  this.bindStartEvent( this.holder );
  // add to DOM
  this.parent.element.appendChild( this.holder );
};

PageDots.prototype.deactivate = function() {
  this.holder.removeEventListener( 'click', this.handleClick );
  this.unbindStartEvent( this.holder );
  // remove from DOM
  this.parent.element.removeChild( this.holder );
};

PageDots.prototype.setDots = function() {
  // get difference between number of slides and number of dots
  var delta = this.parent.slides.length - this.dots.length;
  if ( delta > 0 ) {
    this.addDots( delta );
  } else if ( delta < 0 ) {
    this.removeDots( -delta );
  }
};

PageDots.prototype.addDots = function( count ) {
  var fragment = document.createDocumentFragment();
  var newDots = [];
  var length = this.dots.length;
  var max = length + count;

  for ( var i = length; i < max; i++ ) {
    var dot = document.createElement('li');
    dot.className = 'dot';
    dot.setAttribute( 'aria-label', 'Page dot ' + ( i + 1 ) );
    fragment.appendChild( dot );
    newDots.push( dot );
  }

  this.holder.appendChild( fragment );
  this.dots = this.dots.concat( newDots );
};

PageDots.prototype.removeDots = function( count ) {
  // remove from this.dots collection
  var removeDots = this.dots.splice( this.dots.length - count, count );
  // remove from DOM
  removeDots.forEach( function( dot ) {
    this.holder.removeChild( dot );
  }, this );
};

PageDots.prototype.updateSelected = function() {
  // remove selected class on previous
  if ( this.selectedDot ) {
    this.selectedDot.className = 'dot';
    this.selectedDot.removeAttribute('aria-current');
  }
  // don't proceed if no dots
  if ( !this.dots.length ) {
    return;
  }
  this.selectedDot = this.dots[ this.parent.selectedIndex ];
  this.selectedDot.className = 'dot is-selected';
  this.selectedDot.setAttribute( 'aria-current', 'step' );
};

PageDots.prototype.onTap = // old method name, backwards-compatible
PageDots.prototype.onClick = function( event ) {
  var target = event.target;
  // only care about dot clicks
  if ( target.nodeName != 'LI' ) {
    return;
  }

  this.parent.uiChange();
  var index = this.dots.indexOf( target );
  this.parent.select( index );
};

PageDots.prototype.destroy = function() {
  this.deactivate();
  this.allOff();
};

Flickity.PageDots = PageDots;

// -------------------------- Flickity -------------------------- //

utils.extend( Flickity.defaults, {
  pageDots: true,
} );

Flickity.createMethods.push('_createPageDots');

var proto = Flickity.prototype;

proto._createPageDots = function() {
  if ( !this.options.pageDots ) {
    return;
  }
  this.pageDots = new PageDots( this );
  // events
  this.on( 'activate', this.activatePageDots );
  this.on( 'select', this.updateSelectedPageDots );
  this.on( 'cellChange', this.updatePageDots );
  this.on( 'resize', this.updatePageDots );
  this.on( 'deactivate', this.deactivatePageDots );
};

proto.activatePageDots = function() {
  this.pageDots.activate();
};

proto.updateSelectedPageDots = function() {
  this.pageDots.updateSelected();
};

proto.updatePageDots = function() {
  this.pageDots.setDots();
};

proto.deactivatePageDots = function() {
  this.pageDots.deactivate();
};

// -----  ----- //

Flickity.PageDots = PageDots;

return Flickity;

} ) );
}(pageDots$1));

var player = {exports: {}};

(function (module) {
// player & autoPlay
( function( window, factory ) {
  // universal module definition
  if ( module.exports ) {
    // CommonJS
    module.exports = factory(
        evEmitter.exports,
        utils.exports,
        flickity.exports
    );
  } else {
    // browser global
    factory(
        window.EvEmitter,
        window.fizzyUIUtils,
        window.Flickity
    );
  }

}( window, function factory( EvEmitter, utils, Flickity ) {

// -------------------------- Player -------------------------- //

function Player( parent ) {
  this.parent = parent;
  this.state = 'stopped';
  // visibility change event handler
  this.onVisibilityChange = this.visibilityChange.bind( this );
  this.onVisibilityPlay = this.visibilityPlay.bind( this );
}

Player.prototype = Object.create( EvEmitter.prototype );

// start play
Player.prototype.play = function() {
  if ( this.state == 'playing' ) {
    return;
  }
  // do not play if page is hidden, start playing when page is visible
  var isPageHidden = document.hidden;
  if ( isPageHidden ) {
    document.addEventListener( 'visibilitychange', this.onVisibilityPlay );
    return;
  }

  this.state = 'playing';
  // listen to visibility change
  document.addEventListener( 'visibilitychange', this.onVisibilityChange );
  // start ticking
  this.tick();
};

Player.prototype.tick = function() {
  // do not tick if not playing
  if ( this.state != 'playing' ) {
    return;
  }

  var time = this.parent.options.autoPlay;
  // default to 3 seconds
  time = typeof time == 'number' ? time : 3000;
  var _this = this;
  // HACK: reset ticks if stopped and started within interval
  this.clear();
  this.timeout = setTimeout( function() {
    _this.parent.next( true );
    _this.tick();
  }, time );
};

Player.prototype.stop = function() {
  this.state = 'stopped';
  this.clear();
  // remove visibility change event
  document.removeEventListener( 'visibilitychange', this.onVisibilityChange );
};

Player.prototype.clear = function() {
  clearTimeout( this.timeout );
};

Player.prototype.pause = function() {
  if ( this.state == 'playing' ) {
    this.state = 'paused';
    this.clear();
  }
};

Player.prototype.unpause = function() {
  // re-start play if paused
  if ( this.state == 'paused' ) {
    this.play();
  }
};

// pause if page visibility is hidden, unpause if visible
Player.prototype.visibilityChange = function() {
  var isPageHidden = document.hidden;
  this[ isPageHidden ? 'pause' : 'unpause' ]();
};

Player.prototype.visibilityPlay = function() {
  this.play();
  document.removeEventListener( 'visibilitychange', this.onVisibilityPlay );
};

// -------------------------- Flickity -------------------------- //

utils.extend( Flickity.defaults, {
  pauseAutoPlayOnHover: true,
} );

Flickity.createMethods.push('_createPlayer');
var proto = Flickity.prototype;

proto._createPlayer = function() {
  this.player = new Player( this );

  this.on( 'activate', this.activatePlayer );
  this.on( 'uiChange', this.stopPlayer );
  this.on( 'pointerDown', this.stopPlayer );
  this.on( 'deactivate', this.deactivatePlayer );
};

proto.activatePlayer = function() {
  if ( !this.options.autoPlay ) {
    return;
  }
  this.player.play();
  this.element.addEventListener( 'mouseenter', this );
};

// Player API, don't hate the ... thanks I know where the door is

proto.playPlayer = function() {
  this.player.play();
};

proto.stopPlayer = function() {
  this.player.stop();
};

proto.pausePlayer = function() {
  this.player.pause();
};

proto.unpausePlayer = function() {
  this.player.unpause();
};

proto.deactivatePlayer = function() {
  this.player.stop();
  this.element.removeEventListener( 'mouseenter', this );
};

// ----- mouseenter/leave ----- //

// pause auto-play on hover
proto.onmouseenter = function() {
  if ( !this.options.pauseAutoPlayOnHover ) {
    return;
  }
  this.player.pause();
  this.element.addEventListener( 'mouseleave', this );
};

// resume auto-play on hover off
proto.onmouseleave = function() {
  this.player.unpause();
  this.element.removeEventListener( 'mouseleave', this );
};

// -----  ----- //

Flickity.Player = Player;

return Flickity;

} ) );
}(player));

var addRemoveCell = {exports: {}};

(function (module) {
// add, remove cell
( function( window, factory ) {
  // universal module definition
  if ( module.exports ) {
    // CommonJS
    module.exports = factory(
        window,
        flickity.exports,
        utils.exports
    );
  } else {
    // browser global
    factory(
        window,
        window.Flickity,
        window.fizzyUIUtils
    );
  }

}( window, function factory( window, Flickity, utils ) {

// append cells to a document fragment
function getCellsFragment( cells ) {
  var fragment = document.createDocumentFragment();
  cells.forEach( function( cell ) {
    fragment.appendChild( cell.element );
  } );
  return fragment;
}

// -------------------------- add/remove cell prototype -------------------------- //

var proto = Flickity.prototype;

/**
 * Insert, prepend, or append cells
 * @param {[Element, Array, NodeList]} elems - Elements to insert
 * @param {Integer} index - Zero-based number to insert
 */
proto.insert = function( elems, index ) {
  var cells = this._makeCells( elems );
  if ( !cells || !cells.length ) {
    return;
  }
  var len = this.cells.length;
  // default to append
  index = index === undefined ? len : index;
  // add cells with document fragment
  var fragment = getCellsFragment( cells );
  // append to slider
  var isAppend = index == len;
  if ( isAppend ) {
    this.slider.appendChild( fragment );
  } else {
    var insertCellElement = this.cells[ index ].element;
    this.slider.insertBefore( fragment, insertCellElement );
  }
  // add to this.cells
  if ( index === 0 ) {
    // prepend, add to start
    this.cells = cells.concat( this.cells );
  } else if ( isAppend ) {
    // append, add to end
    this.cells = this.cells.concat( cells );
  } else {
    // insert in this.cells
    var endCells = this.cells.splice( index, len - index );
    this.cells = this.cells.concat( cells ).concat( endCells );
  }

  this._sizeCells( cells );
  this.cellChange( index, true );
};

proto.append = function( elems ) {
  this.insert( elems, this.cells.length );
};

proto.prepend = function( elems ) {
  this.insert( elems, 0 );
};

/**
 * Remove cells
 * @param {[Element, Array, NodeList]} elems - ELements to remove
 */
proto.remove = function( elems ) {
  var cells = this.getCells( elems );
  if ( !cells || !cells.length ) {
    return;
  }

  var minCellIndex = this.cells.length - 1;
  // remove cells from collection & DOM
  cells.forEach( function( cell ) {
    cell.remove();
    var index = this.cells.indexOf( cell );
    minCellIndex = Math.min( index, minCellIndex );
    utils.removeFrom( this.cells, cell );
  }, this );

  this.cellChange( minCellIndex, true );
};

/**
 * logic to be run after a cell's size changes
 * @param {Element} elem - cell's element
 */
proto.cellSizeChange = function( elem ) {
  var cell = this.getCell( elem );
  if ( !cell ) {
    return;
  }
  cell.getSize();

  var index = this.cells.indexOf( cell );
  this.cellChange( index );
};

/**
 * logic any time a cell is changed: added, removed, or size changed
 * @param {Integer} changedCellIndex - index of the changed cell, optional
 * @param {Boolean} isPositioningSlider - Positions slider after selection
 */
proto.cellChange = function( changedCellIndex, isPositioningSlider ) {
  var prevSelectedElem = this.selectedElement;
  this._positionCells( changedCellIndex );
  this._getWrapShiftCells();
  this.setGallerySize();
  // update selectedIndex
  // try to maintain position & select previous selected element
  var cell = this.getCell( prevSelectedElem );
  if ( cell ) {
    this.selectedIndex = this.getCellSlideIndex( cell );
  }
  this.selectedIndex = Math.min( this.slides.length - 1, this.selectedIndex );

  this.emitEvent( 'cellChange', [ changedCellIndex ] );
  // position slider
  this.select( this.selectedIndex );
  // do not position slider after lazy load
  if ( isPositioningSlider ) {
    this.positionSliderAtSelected();
  }
};

// -----  ----- //

return Flickity;

} ) );
}(addRemoveCell));

var lazyload = {exports: {}};

(function (module) {
// lazyload
( function( window, factory ) {
  // universal module definition
  if ( module.exports ) {
    // CommonJS
    module.exports = factory(
        window,
        flickity.exports,
        utils.exports
    );
  } else {
    // browser global
    factory(
        window,
        window.Flickity,
        window.fizzyUIUtils
    );
  }

}( window, function factory( window, Flickity, utils ) {

Flickity.createMethods.push('_createLazyload');
var proto = Flickity.prototype;

proto._createLazyload = function() {
  this.on( 'select', this.lazyLoad );
};

proto.lazyLoad = function() {
  var lazyLoad = this.options.lazyLoad;
  if ( !lazyLoad ) {
    return;
  }
  // get adjacent cells, use lazyLoad option for adjacent count
  var adjCount = typeof lazyLoad == 'number' ? lazyLoad : 0;
  var cellElems = this.getAdjacentCellElements( adjCount );
  // get lazy images in those cells
  var lazyImages = [];
  cellElems.forEach( function( cellElem ) {
    var lazyCellImages = getCellLazyImages( cellElem );
    lazyImages = lazyImages.concat( lazyCellImages );
  } );
  // load lazy images
  lazyImages.forEach( function( img ) {
    new LazyLoader( img, this );
  }, this );
};

function getCellLazyImages( cellElem ) {
  // check if cell element is lazy image
  if ( cellElem.nodeName == 'IMG' ) {
    var lazyloadAttr = cellElem.getAttribute('data-flickity-lazyload');
    var srcAttr = cellElem.getAttribute('data-flickity-lazyload-src');
    var srcsetAttr = cellElem.getAttribute('data-flickity-lazyload-srcset');
    if ( lazyloadAttr || srcAttr || srcsetAttr ) {
      return [ cellElem ];
    }
  }
  // select lazy images in cell
  var lazySelector = 'img[data-flickity-lazyload], ' +
    'img[data-flickity-lazyload-src], img[data-flickity-lazyload-srcset]';
  var imgs = cellElem.querySelectorAll( lazySelector );
  return utils.makeArray( imgs );
}

// -------------------------- LazyLoader -------------------------- //

/**
 * class to handle loading images
 * @param {Image} img - Image element
 * @param {Flickity} flickity - Flickity instance
 */
function LazyLoader( img, flickity ) {
  this.img = img;
  this.flickity = flickity;
  this.load();
}

LazyLoader.prototype.handleEvent = utils.handleEvent;

LazyLoader.prototype.load = function() {
  this.img.addEventListener( 'load', this );
  this.img.addEventListener( 'error', this );
  // get src & srcset
  var src = this.img.getAttribute('data-flickity-lazyload') ||
    this.img.getAttribute('data-flickity-lazyload-src');
  var srcset = this.img.getAttribute('data-flickity-lazyload-srcset');
  // set src & serset
  this.img.src = src;
  if ( srcset ) {
    this.img.setAttribute( 'srcset', srcset );
  }
  // remove attr
  this.img.removeAttribute('data-flickity-lazyload');
  this.img.removeAttribute('data-flickity-lazyload-src');
  this.img.removeAttribute('data-flickity-lazyload-srcset');
};

LazyLoader.prototype.onload = function( event ) {
  this.complete( event, 'flickity-lazyloaded' );
};

LazyLoader.prototype.onerror = function( event ) {
  this.complete( event, 'flickity-lazyerror' );
};

LazyLoader.prototype.complete = function( event, className ) {
  // unbind events
  this.img.removeEventListener( 'load', this );
  this.img.removeEventListener( 'error', this );

  var cell = this.flickity.getParentCell( this.img );
  var cellElem = cell && cell.element;
  this.flickity.cellSizeChange( cellElem );

  this.img.classList.add( className );
  this.flickity.dispatchEvent( 'lazyLoad', event, cellElem );
};

// -----  ----- //

Flickity.LazyLoader = LazyLoader;

return Flickity;

} ) );
}(lazyload));

/*!
 * Flickity v2.2.2
 * Touch, responsive, flickable carousels
 *
 * Licensed GPLv3 for open source use
 * or Flickity Commercial License for commercial use
 *
 * https://flickity.metafizzy.co
 * Copyright 2015-2021 Metafizzy
 */

(function (module) {
( function( window, factory ) {
  // universal module definition
  if ( module.exports ) {
    // CommonJS
    module.exports = factory(
        flickity.exports,
        drag.exports,
        prevNextButton.exports,
        pageDots$1.exports,
        player.exports,
        addRemoveCell.exports,
        lazyload.exports
    );
  }

} )( window, function factory( Flickity ) {
  return Flickity;
} );
}(js));

var Flickity = js.exports;

function debounce(func) {
  var time = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 100;
  var timer;
  return function (event) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(func, time, event);
  };
}

var slideshowOpts$1 = {
  adaptiveHeight: false,
  pageDots: false,
  prevNextButtons: false,
  wrapAround: true,
  draggable: false
};
var selectors$v = {
  sliderContainer: '.utility-bar__announcements',
  announcements: '.utility-bar__announcement-item',
  socialContainer: '.utlity-bar__social-icons',
  disclosureContainer: '.utility-bar__disclosure-container',
  disclosure: '[data-disclosure]'
};
var modifiers = {
  active: 'is-active',
  hidden: 'is-hidden'
};
var rootVars = {
  utilityBar: '--utility-bar-height'
};
register('utility-bar', {
  crossBorder: {},

  onLoad() {
    this.sliderContainer = n$3(selectors$v.sliderContainer, this.container);
    this.announcements = t$7(selectors$v.announcements, this.container);
    this.events = [e$3(window, 'resize', debounce(this._matchContentWidths, 150))];

    this._matchContentWidths();

    this._setUtilityBarVars();

    if (this.announcements.length) {
      this._initSlider();
    } // Wire up Cross Border disclosures


    var cbSelectors = t$7(selectors$v.disclosure, this.container);

    if (cbSelectors) {
      cbSelectors.forEach(selector => {
        var {
          disclosure: d
        } = selector.dataset;
        this.crossBorder[d] = disclosure(selector, this.container);
      });
    }

    c$1('sticky-header:stuck', () => Object.keys(this.crossBorder).forEach(t => {
      this.crossBorder[t].hideList();
    }));
  },

  _initSlider() {
    var {
      timing
    } = this.container.dataset;
    slideshowOpts$1.autoPlay = parseInt(timing, 10);
    this.slideshow = new Flickity(this.sliderContainer, _objectSpread2(_objectSpread2({}, slideshowOpts$1), {}, {
      on: {
        // Need to add a modifier to animate after the first slide has changed
        change: index => {
          this.announcements.forEach((element, i) => {
            l(element, modifiers.active, i === index);
            element.setAttribute('aria-hidden', false);

            if (element.className.indexOf(modifiers.active) >= 0) {
              element.setAttribute('aria-hidden', true);
            }
          });
        }
      }
    }));
  },

  _setRootVar(name, value) {
    document.documentElement.style.setProperty(name, "".concat(value, "px"));
  },

  _setUtilityBarVars() {
    document.documentElement.style.removeProperty(rootVars.utilityBar);

    this._setRootVar(rootVars.utilityBar, this.container.offsetHeight);

    r$1('sticky-header:reload', () => {});
  },

  _matchContentWidths() {
    // To keep our announcements fully centered we must ensure both elements
    // on either side are the same width.
    var socialContainer = n$3(selectors$v.socialContainer, this.container);
    var disclosureContainer = n$3(selectors$v.disclosureContainer, this.container);
    var socialWidth = socialContainer.offsetWidth;
    var disclosureWidth = disclosureContainer.offsetWidth;
    if (socialWidth === disclosureWidth) return;

    if (socialWidth > disclosureWidth) {
      disclosureContainer.setAttribute('style', "width:".concat(socialWidth, "px"));
    } else {
      socialContainer.setAttribute('style', "width:".concat(disclosureWidth, "px"));
    }
  },

  onBlockSelect(_ref) {
    var {
      target
    } = _ref;
    this.slideshow.pausePlayer();
    this.slideshow.select(target.dataset.index);
  },

  onBlockDeselect() {
    this.slideshow.unpausePlayer();
  },

  onUnload() {
    this.slideshow && this.slideshow.destroy();
    this.resizeObserver && this.resizeObserver.disconnect();
    Object.keys(this.crossBorder).forEach(t => {
      this.crossBorder[t].unload();
    });
  }

});

var bp = {
  isSmall: () => window.matchMedia('(max-width: 38em)').matches,
  isLarge: () => window.matchMedia('(min-width: 60em)').matches
};

var selectors$u = {
  carousel: '[data-carousel]',
  slides: '.carousel__slide',
  carouselWraps: 'carousel--columns-wrap-around',
  textBlock: '.text-block',
  nextButton: '.carousel__next-button',
  previousButton: '.carousel__previous-button',
  textBlock: '.text-block'
}; // carouslePosition denotes where the carousel lies within the container
// depending on if there is text content above or below. Carousel navigation
// paddles will be adjusted to the carousel.

var carousel = function carousel(node) {
  var {
    carouselPosition = 'bottom'
  } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var carousel = null;
  var {
    textPosition,
    textAlignment
  } = node.dataset;
  var carouselIsInline = textPosition === 'middle';
  var carouselWraps = node.classList.contains(selectors$u.carouselWraps);
  var navPrevButton = node.querySelector(selectors$u.previousButton);
  var navNextButton = node.querySelector(selectors$u.nextButton);
  var carouselContainer = node.querySelector(selectors$u.carousel);
  var slides = node.querySelectorAll(selectors$u.slides);
  var textBlock = node.querySelector(selectors$u.textBlock);

  var _init = () => {
    var carouselOpts = {
      adaptiveHeight: false,
      wrapAround: false,
      contain: true,
      cellAlign: 'left',
      prevNextButtons: false,
      pageDots: false,
      initialIndex: 0,
      dragThreshold: 1
    }; // Only wrap around if there is enough content to wrap

    if (carouselWraps) {
      carouselOpts.wrapAround = true;
    } else if (!carouselWraps && textAlignment == 'right') {
      carouselOpts.initialIndex = slides.length - 1;
      carouselOpts.cellAlign = 'right';
    }

    carousel = new Flickity(carouselContainer, _objectSpread2(_objectSpread2({}, carouselOpts), {}, {
      on: {
        ready: function ready() {
          _initNavigation();
        },
        scroll: progress => {
          if (carouselIsInline) {
            _updateTextBlock(progress);
          }

          if (!carouselWraps) {
            _updateNavigation(progress);
          }
        }
      }
    }));
    carouselContainer.addEventListener('dragStart', () => document.ontouchmove = () => false);
    carouselContainer.addEventListener('dragEnd', () => document.ontouchmove = () => true);
    carousel.resize();
    setTimeout(() => {
      _updateNavigationPosition(carousel.size.height);
    }, 1000);
  };

  var _updateTextBlock = progress => {
    if (!textBlock) return;
    var progressScale = progress * 100;

    if (textAlignment == 'left') {
      textBlock.classList.toggle('out-of-view', progressScale > 1);
    } else if (textAlignment == 'right') {
      textBlock.classList.toggle('out-of-view', progressScale < 99);
    }
  };

  var _updateNavigation = progress => {
    var progressScale = progress * 100; // Need to hide the prev/next navigation if progress meets thresholds
    // https://github.com/metafizzy/flickity/issues/289

    navPrevButton.disabled = progressScale < 1;
    navPrevButton.setAttribute('focusable', progressScale < 1 ? false : true);
    navNextButton.disabled = progressScale > 99;
    navNextButton.setAttribute('focusable', progressScale > 99 ? false : true);
  };

  var _initNavigation = () => {
    navPrevButton.addEventListener('click', _previousSlide);
    navNextButton.addEventListener('click', _nextSlide);

    if (!carouselWraps && textAlignment == 'right') {
      navNextButton.disabled = true;
      navNextButton.setAttribute('focusable', false);
    } else if (!carouselWraps) {
      navPrevButton.disabled = true;
      navPrevButton.setAttribute('focusable', false);
    }
  };

  var _updateNavigationPosition = carouselHeight => {
    var buttonHeight = navNextButton.clientHeight;
    var containerPadding = parseFloat(window.getComputedStyle(node).getPropertyValue('padding-top'));
    var offset = carouselHeight / 2 - buttonHeight / 2 + containerPadding;
    navNextButton.style[carouselPosition] = "".concat(offset, "px");
    navPrevButton.style[carouselPosition] = "".concat(offset, "px");
    navNextButton.classList.remove('hidden');
    navPrevButton.classList.remove('hidden');
  };

  var _nextSlide = () => {
    carousel.next();
  };

  var _previousSlide = () => {
    carousel.previous();
  };

  _init();

  var unload = () => {
    carousel.destroy();
    navPrevButton.removeEventListener('click', _previousSlide);
    navNextButton.removeEventListener('click', _nextSlide);
  };

  var goToSlide = index => {
    carousel.select(index);
  };

  return {
    unload,
    goToSlide
  };
};

var scrollIntoView = function scrollIntoView(container, animatableItems) {
  var animationDelay = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
  var animationPlayedOnLoad = false;
  var previousY = 0;
  var previousRatio = 0;
  var animation = null;

  if (animatableItems) {
    animation = anime({
      targets: animatableItems,
      opacity: {
        value: 1,
        duration: 750,
        delay: anime.stagger(200),
        easing: 'easeInOutSine',
        delay: animationDelay
      },
      autoplay: false
    });
  }

  var observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0
  };
  var observer = new IntersectionObserver(_onIntersection, observerOptions);
  observer.observe(container);

  function _onIntersection(entries) {
    entries.forEach(entry => {
      var currentY = entry.boundingClientRect.y;
      var currentRatio = entry.intersectionRatio;
      var isIntersecting = entry.isIntersecting;

      if (isIntersecting && !animationPlayedOnLoad) {
        animationPlayedOnLoad = true;

        _handleContainerInView();
      }

      if (currentY < previousY) {
        if (currentRatio > previousRatio && isIntersecting) {
          // Scrolling down and entering view
          _handleContainerInView();
        }
      } else if (currentY > previousY && !isIntersecting) {
        if (currentRatio < previousRatio) {
          // Scrolling up and leaving view
          container.classList.remove('in-view');
        }
      }

      previousY = currentY;
      previousRatio = currentRatio;
    });
  }

  function _handleContainerInView() {
    if (animation) {
      animation.play();
    }

    container.classList.add('in-view');
    observer.disconnect();
  }

  var unload = () => {
    observer.disconnect();
  };

  return {
    unload
  };
};

var selectors$t = {
  carousel: '[data-carousel]',
  animatedSlides: '.animates'
};
register('blog-posts', {
  onLoad() {
    this.animatedSlides = this.container.querySelectorAll(selectors$t.animatedSlides);
    this.carouselContainer = this.container.querySelector(selectors$t.carouselContainer);

    if (this.animatedSlides.length > 1) {
      this.carousel = carousel(this.container);
    }

    if (this.animatedSlides.length) {
      this.scrollAnimation = scrollIntoView(this.container, this.animatedSlides);
    }
  },

  onUnload() {
    this.carousel && this.carousel.unload();

    if (this.animatedSlides.length) {
      this.scrollAnimation.unload();
    }
  }

});

var productItem = node => {
  var imageWrapper = node.querySelector('.product-item__image-wrapper');

  if (imageWrapper) {
    initImageHover();
  }

  function handleOver(e) {
    console.log("handleOver");
    var second = imageWrapper.querySelector('.not-first');

    if (second) {
      second.classList.add('visible');
    }
  }

  function handleOut(e) {
    var second = imageWrapper.querySelector('.not-first');

    if (second) {
      second.classList.remove('visible');
    }
  }

  function initImageHover() {
    imageWrapper.addEventListener('mouseover', handleOver);
    imageWrapper.addEventListener('mouseout', handleOut);
  }

  var unload = () => {
    if (imageWrapper) {
      imageWrapper.removeEventListener('mouseover', handleOver);
      imageWrapper.removeEventListener('mouseout', handleOut);
    }
  };

  return {
    unload
  };
};

var orderCarouselItems = (container, slides) => {
  var animationSlides = [...slides];
  var {
    textPosition,
    textAlignment
  } = container.dataset;
  var carouselOverhangs = textPosition === 'top';
  var carouselWraps = container.classList.contains('carousel--columns-wrap-around');

  if (carouselWraps && carouselOverhangs) {
    // Animate the last overhanging slide first
    animationSlides.unshift(animationSlides.pop());
  } else if (!carouselOverhangs && textAlignment == 'right') {
    // Reverse animation order
    animationSlides.reverse();
  }

  return animationSlides;
};

var selectors$s = {
  carousel: '[data-carousel]',
  animatedSlides: '.animates',
  products: '.product-item'
};
register('collection-list', {
  onLoad() {
    this.animatedSlides = this.container.querySelectorAll(selectors$s.animatedSlides);
    this.carouselContainer = this.container.querySelector(selectors$s.carouselContainer);
    this.carousel = carousel(this.container);
    var products = this.container.querySelectorAll(selectors$s.products);
    this.productItems = [];
    products.forEach(element => {
      this.productItems.push(productItem(element));
    });

    if (this.animatedSlides.length) {
      this._initScrollAnimation(orderCarouselItems(this.container, this.animatedSlides));
    }
  },

  _initScrollAnimation(items) {
    var {
      textPosition
    } = this.container.dataset; // If the caorusle is inline the animation needs to delay
    // to account for text-block fade in.

    var animationDelay = textPosition === 'top' ? 0 : 750;
    this.scrollAnimation = scrollIntoView(this.container, items, animationDelay);
  },

  onBlockSelect(_ref) {
    var {
      target: slide
    } = _ref;
    this.carousel.goToSlide(slide.dataset.index);
  },

  onUnload() {
    this.carousel.unload();
    this.productItems.forEach(item => item.unload());

    if (this.animatedSlides.length) {
      this.scrollAnimation.unload();
    }
  }

});

var selectors$r = {
  animatedItems: '.animates'
};
register('collection-list-grid', {
  onLoad() {
    this.animatedItems = this.container.querySelectorAll(selectors$r.animatedItems);

    if (this.animatedItems.length) {
      this.scrollAnimation = scrollIntoView(this.container, this.animatedItems);
    }
  },

  onUnload() {
    if (this.animatedItems.length) {
      this.scrollAnimation.unload();
    }
  }

});

register('custom-content', {
  onLoad() {},

  onUnload() {}

});

var selectors$q = {
  carouselContainer: '.featured-collection__slides',
  animatedSlides: '.animates',
  products: '.product-item'
};
register('featured-collection', {
  onLoad() {
    this.animatedSlides = this.container.querySelectorAll(selectors$q.animatedSlides);
    this.carouselContainer = this.container.querySelector(selectors$q.carouselContainer);
    this.carousel = carousel(this.container);
    var products = this.container.querySelectorAll(selectors$q.products);
    this.productItems = [];
    products.forEach(element => {
      this.productItems.push(productItem(element));
    });

    if (this.animatedSlides.length) {
      this._initScrollAnimation(orderCarouselItems(this.container, this.animatedSlides));
    }
  },

  _initScrollAnimation(items) {
    this.container.dataset;
    this.scrollAnimation = scrollIntoView(this.container, items);
  },

  onBlockSelect(_ref) {
    var {
      target: slide
    } = _ref;
    this.carousel.goToSlide(slide.dataset.index);
  },

  onUnload() {
    this.carousel.unload();
    this.productItems.forEach(item => item.unload());

    if (this.animatedSlides.length) {
      this.scrollAnimation.unload();
    }
  }

});

var selectors$p = {
  products: '.product-item',
  animatedItems: '.animates'
};
register('featured-collection-grid', {
  onLoad() {
    this.animatedItems = this.container.querySelectorAll(selectors$p.animatedItems);
    var products = this.container.querySelectorAll(selectors$p.products);
    this.productItems = [];
    products.forEach(element => {
      this.productItems.push(productItem(element));
    });

    if (this.animatedItems.length) {
      this.scrollAnimation = scrollIntoView(this.container, this.animatedItems);
    }
  },

  onUnload() {
    this.productItems.forEach(item => item.unload());
    this.animatedItems.length && this.scrollAnimation.unload();
  }

});

var selectors$o = {
  carouselContainer: '.featured-collection-row__slides',
  animatedSlides: '.animates',
  products: '.product-item'
};
register('featured-collection-row', {
  onLoad() {
    this.animatedSlides = this.container.querySelectorAll(selectors$o.animatedSlides);
    this.carouselContainer = this.container.querySelector(selectors$o.carouselContainer);
    this.carousel = carousel(this.container);
    var products = this.container.querySelectorAll(selectors$o.products);
    this.productItems = [];
    products.forEach(element => {
      this.productItems.push(productItem(element));
    });

    if (this.animatedSlides.length) {
      this._initScrollAnimation(orderCarouselItems(this.container, this.animatedSlides));
    }
  },

  _initScrollAnimation(items) {
    // If the caorusle is inline the animation needs to delay
    // to account for text-block fade in.
    var animationDelay = 750;
    this.scrollAnimation = scrollIntoView(this.container, items, animationDelay);
  },

  onBlockSelect(_ref) {
    var {
      target: slide
    } = _ref;
    this.carousel.goToSlide(slide.dataset.index);
  },

  onUnload() {
    this.carousel.unload();
    this.productItems.forEach(item => item.unload());

    if (this.animatedSlides.length) {
      this.scrollAnimation.unload();
    }
  }

});

function Media(node) {
  if (!node) return;
  var {
    Shopify,
    YT
  } = window;
  var elements = t$7('[data-interactive]', node);
  if (!elements.length) return;
  var acceptedTypes = ['video', 'model', 'external_video'];
  var activeMedia = null;
  var featuresLoaded = false;
  var instances = {};

  if (featuresLoaded) {
    elements.forEach(initElement);
  }

  window.Shopify.loadFeatures([{
    name: 'model-viewer-ui',
    version: '1.0'
  }, {
    name: 'shopify-xr',
    version: '1.0'
  }, {
    name: 'video-ui',
    version: '1.0'
  }], () => {
    featuresLoaded = true;

    if ('YT' in window && Boolean(YT.loaded)) {
      elements.forEach(initElement);
    } else {
      window.onYouTubeIframeAPIReady = function () {
        elements.forEach(initElement);
      };
    }
  });

  function initElement(el) {
    var {
      mediaId,
      mediaType
    } = el.dataset;
    if (!mediaType || !acceptedTypes.includes(mediaType)) return;
    if (Object.keys(instances).includes(mediaId)) return;
    var instance = {
      id: mediaId,
      type: mediaType,
      container: el,
      media: el.children[0]
    };

    switch (instance.type) {
      case 'video':
        instance.player = new Shopify.Plyr(instance.media, {
          loop: {
            active: el.dataset.loop == 'true'
          }
        });
        break;

      case 'external_video':
        instance.player = new YT.Player(instance.media);
        break;

      case 'model':
        instance.viewer = new Shopify.ModelViewerUI(n$3('model-viewer', el));
        e$3(n$3('.model-poster', el), 'click', e => {
          e.preventDefault();
          playModel(instance);
        });
        break;
    }

    instances[mediaId] = instance;

    if (instance.player) {
      if (instance.type === 'video') {
        instance.player.on('playing', () => {
          pauseActiveMedia(instance);
          activeMedia = instance;
        });
      } else if (instance.type === 'external_video') {
        instance.player.addEventListener('onStateChange', event => {
          if (event.data === 1) {
            pauseActiveMedia(instance);
            activeMedia = instance;
          }
        });
      }
    }
  }

  function playModel(instance) {
    pauseActiveMedia(instance);
    instance.viewer.play();
    u$2(instance.container, 'model-active');
    activeMedia = instance;
    setTimeout(() => {
      n$3('model-viewer', instance.container).focus();
    }, 300);
  }

  function pauseActiveMedia(instance) {
    if (!activeMedia || instance == activeMedia) return;

    if (activeMedia.player) {
      if (activeMedia.type === 'video') {
        activeMedia.player.pause();
      } else if (activeMedia.type === 'external_video') {
        activeMedia.player.pauseVideo();
      }

      activeMedia = null;
      return;
    }

    if (activeMedia.viewer) {
      i$1(activeMedia.container, 'model-active');
      activeMedia.viewer.pause();
      activeMedia = null;
    }
  }

  return {
    pauseActiveMedia
  };
}

var selectors$n = {
  variantPopupTrigger: '[data-variant-popup-trigger]'
};

var variantPopup = node => {
  var delegate = new Delegate(node);

  var _variantPopupHandler = e => {
    e.preventDefault();
    var {
      modalContentId
    } = e.target.dataset;
    var moreInfoContent = n$3("#".concat(modalContentId), node);
    e.target.setAttribute('aria-expanded', true);
    r$1('modal:open', null, {
      modalContent: moreInfoContent
    });
  };

  var unload = () => {
    delegate.destroy();
  };

  delegate.on('click', selectors$n.variantPopupTrigger, _variantPopupHandler);
  return {
    unload
  };
};

theme;

var reviewsDrawer = node => {
  var closeBtn = node.querySelector('[data-reviews-close]');
  var focusTrap = createFocusTrap(node, {
    allowOutsideClick: true
  });
  closeBtn.addEventListener('click', close); // const starRating = node.querySelector(selectors.stars);
  // const totalReviewsContainer = node.querySelector(
  //   selectors.totalReviewsContainer
  // );
  // let totalReviews = strings.product.write_review;
  // if (totalReviewsContainer) {
  //   const totalReviewsString = totalReviewsContainer.innerText;
  //   totalReviews = `${totalReviewsString.match(/\d+/g)} ${
  //     strings.product.total_reviews
  //   }`;
  // }
  // emit(events.reviews.added, () => ({
  //   starRating,
  //   totalReviews,
  // }));

  var overlayHideListener = c$1('drawerOverlay:hiding', () => close(false));
  window.addEventListener('keydown', handleKeyboard);

  function handleKeyboard(e) {
    if (!node.classList.contains('is-visible')) return;

    if (e.key == 'Escape' || e.keyCode === 27 && drawerOpen) {
      close();
    }
  }

  var open = () => {
    node.classList.add('is-visible');
    r$1('drawerOverlay:show');
    var reviewsToggle = node.querySelector('.spr-summary-actions-togglereviews');

    if (reviewsToggle) {
      reviewsToggle.tabIndex = -1;
    }

    setTimeout(() => {
      focusTrap.activate();
    }, 50);
  };

  var close = function close() {
    var hideOverlay = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
    hideOverlay && r$1('drawerOverlay:hide');
    node.classList.remove('is-visible');
    setTimeout(() => {
      focusTrap.deactivate();
    }, 50);
  };

  var unload = () => {
    closeBtn.removeEventListener('click', close());
    overlayHideListener();
  };

  return {
    unload,
    open
  };
};

var selectors$m = {
  reviewsFlyout: '[data-reviews-drawer]',
  reviewsContainers: '.product__reviews',
  reviewStars: '.product__reviews-stars',
  reviewsTriggers: '.product__reviews-trigger'
};

var reviews = function reviews(node) {
  var isDrawer = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
  node.querySelectorAll(selectors$m.reviewsContainers);
  var reviewsFlyout = node.querySelector(selectors$m.reviewsFlyout);
  var reviewsTriggers = node.querySelectorAll(selectors$m.reviewsTriggers);

  var _handleReviewsTrigger = e => {
    e.preventDefault();

    if (drawer) {
      drawer.open();
    } else {
      var reviewsContainer = document.querySelector('#shopify-product-reviews');

      if (reviewsContainer) {
        reviewsContainer.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    }
  }; // const _addReviewStars = stars => {
  //   reviewsContainers.forEach(container => {
  //     const reviewStars = container.querySelector(selectors.reviewStars);
  //     if (stars) {
  //       const starRating = stars.cloneNode(true);
  //       reviewStars.classList.remove('hidden');
  //       reviewStars.appendChild(starRating);
  //     }
  //   });
  // };
  // const _addReviewDrawerTrigger = totalReviews => {
  //   reviewsTriggers.forEach(trigger => {
  //     trigger.style.display = '';
  //     trigger.innerText = totalReviews;
  //   });
  // };


  reviewsTriggers.forEach(trigger => {
    trigger.addEventListener('click', _handleReviewsTrigger);
  }); // const reviewsListener = on(
  //   events.reviews.added,
  //   ({ starRating, totalReviews }) => {
  //     _addReviewDrawerTrigger(totalReviews);
  //     _addReviewStars(starRating);
  //     reviewsContainers.forEach(container => {
  //       container.classList.remove('hidden');
  //     });
  //   }
  // );

  var drawer = null;

  if (isDrawer) {
    drawer = reviewsDrawer(reviewsFlyout);
  }

  var unload = () => {
    // reviewsListener();
    drawer && drawer.unload();
    reviewsTriggers.forEach(trigger => {
      trigger.removeEventListener('click', _handleReviewsTrigger);
    });
  };

  return {
    unload
  };
};

theme;
var selectors$l = {
  swatches: '[data-product-swatches]',
  chips: '[data-product-chips]',
  quantityInput: '.product-form__quantity',
  socialSharing: '.share',
  productDetailsWrapper: '.product__meta-inner',
  productDescription: '.product__description',
  productForm: '[data-product-form]'
};
register('featured-product', {
  onLoad() {
    this.media = Media(this.container);
    var productFormContainer = this.container.querySelector(selectors$l.productForm);

    if (productFormContainer) {
      this.productForm = productForm(productFormContainer, {
        isProductPage: false,
        isFeaturedProduct: true,
        container: this.container
      });
      this.optionButtons = OptionButtons(t$7('[data-option-buttons]', this.container));
      this.quantityInput = quantityInput.call(this, selectors$l.quantityInput);
      this.variantPopup = variantPopup(this.container);
    }

    this.productDetails = this.container.querySelector(selectors$l.productDetailsWrapper); // Here we check if the merchant added a product reviews section or not

    var reviewsTemplate = this.container.querySelector('.product-reviews-template');
    var reviewsDrawer = this.container.querySelector('[data-reviews-drawer]');
    var reviewsIsDrawer = false;

    if (reviewsTemplate && reviewsDrawer) {
      reviewsDrawer.classList.add('reviews-flyout--active');
      reviewsDrawer.appendChild(reviewsTemplate.content.cloneNode(true));
      reviewsIsDrawer = true;
    }

    window.SPRCallbacks = {};

    window.SPRCallbacks.onReviewsLoad = () => {
      if (!this.reviews) {
        this.reviews = reviews(this.container, reviewsIsDrawer);
      }
    };

    this.accordions = this.container.querySelectorAll(selectors$l.accordion);
    this.accordions.forEach(item => {
      if (!item.classList.contains('accordion--active')) {
        accordion(item);
      }
    });
    this.socialButtons = t$7('[data-social-share]', this.container);
    this.socialButtonsClick = e$3(this.socialButtons, 'click', e => {
      l(e.target, 'active');
      var sub = n$3('.product__share-icons', e.target);
      sub.setAttribute('aria-hidden', !e.target.classList.contains('active'));
    });
  },

  onUnload() {
    this.quantityInput && this.quantityInput();
    this.productForm && this.productForm.unload();
    this.variantPopup && this.variantPopup.unload();
    this.optionButtons.destroy();
  }

});

var {
  strings: {
    accessibility: strings$1
  }
} = theme;

var focusFormStatus = node => {
  var formStatus = n$3(selectors$M.a11y.formStatus, node);
  if (!formStatus) return;
  var focusElement = n$3('[data-form-status]', formStatus);
  focusElement.focus();
};

var prefersReducedMotion = () => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

function backgroundVideoHandler(container) {
  var pause = n$3('.video-pause', container);
  var video = container.getElementsByTagName('VIDEO')[0];
  if (!pause || !video) return;
  var pauseListener = e$3(pause, 'click', e => {
    e.preventDefault();

    if (video.paused) {
      video.play();
      pause.innerText = strings$1.pause_video;
    } else {
      video.pause();
      pause.innerText = strings$1.play_video;
    }
  });
  return () => pauseListener();
}

var selectors$k = {
  image: '.image',
  textBlock: '.image-with-text__text-block',
  video: '.image-with-text__video'
};
register('image-with-text', {
  animationObserver: null,
  videoHandler: null,

  onLoad() {
    this.textBlock = this.container.querySelector(selectors$k.textBlock);
    this.image = this.container.querySelector(selectors$k.image);
    var videoWrapper = this.container.querySelector(selectors$k.video);
    this.scrollAnimation = scrollIntoView(this.container);

    if (videoWrapper) {
      this.videoHandler = backgroundVideoHandler(this.container);
    }
  },

  onUnload() {
    this.videoHandler && this.videoHandler();
    this.scrollAnimation.unload();
  }

});

register('newsletter', {
  onLoad() {
    focusFormStatus(this.container);
    this.scrollAnimation = scrollIntoView(this.container);
  },

  onUnload() {
    this.scrollAnimation.unload();
  }

});

var selectors$j = {
  section: 'product-recommendations',
  innerContainer: '.product-recommendations__inner',
  productsContainer: '.product-recommendations__products',
  products: '.product-item'
};
register('product-recommendations', {
  onLoad() {
    this._getProductRecommendations();

    this.scrollAnimation = scrollIntoView(this.container);
  },

  _getProductRecommendations() {
    var {
      sectionId,
      productId,
      limit
    } = this.container.dataset; // Build request URL

    var requestUrl = "".concat(window.theme.routes.productRecommendations, "?section_id=").concat(sectionId, "&limit=").concat(limit, "&product_id=").concat(productId); // Create request and submit it using Ajax

    var request = new XMLHttpRequest();
    request.open('GET', requestUrl, true);

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        var container = document.createElement('div');
        container.innerHTML = request.response;
        this.container.innerHTML = container.querySelector('.product-recommendations').innerHTML;

        this._initProductItems();

        this._initSlider();
      }
    };

    request.send();
  },

  _initProductItems() {
    var products = this.container.querySelectorAll(selectors$j.products);
    this.productItems = [];
    products.forEach(element => {
      this.productItems.push(productItem(element));
    });
  },

  _initSlider() {
    this.carousel = carousel(this.container);
  },

  onUnload() {
    this.productItems.forEach(item => item.unload());
    this.carousel.unload();
  }

});

var selectors$i = {
  hotspotWrappers: '.shoppable-item',
  hotspots: '.shoppable-item__hotspot',
  productCard: '.shoppable-item__product-card',
  closeButtons: '[data-shoppable-item-close]',
  scrollAnimationElement: '.animation__staggered-children-fade-in'
};
var classes$2 = {
  animating: 'shoppable-item--animating',
  unset: 'shoppable-item--position-unset',
  hidden: 'hidden',
  active: 'active',
  scrollAnimationDisabler: 'animation-disabled'
};
register('shoppable', {
  onLoad() {
    this.productCards = t$7(selectors$i.productCard, this.container);
    this.hotspotContainers = t$7(selectors$i.hotspotWrappers, this.container);
    this.hotspots = t$7(selectors$i.hotspots, this.container);
    var closeButtons = t$7(selectors$i.closeButtons, this.container);
    var scrollAnimationElement = n$3(selectors$i.scrollAnimationElement, this.container); // Self terminating mouseenter events

    this.hotspotEvents = this.hotspots.map(hotspot => {
      return {
        element: hotspot,
        event: e$3(hotspot, 'mouseenter', e => {
          i$1(e.currentTarget.parentNode, classes$2.animating);
          this.hotspotEvents.find(o => o.element === hotspot).event();
        })
      };
    });
    this.events = [e$3(this.hotspots, 'click', e => this._hotspotClickHandler(e)), e$3(document, 'click', e => this._clickOutsideHandler(e)), e$3(closeButtons, 'click', () => this._closeAll()), e$3(this.container, 'keydown', _ref => {
      var {
        keyCode
      } = _ref;
      if (keyCode === 27) this._closeAll();
    })];
    this.scrollAnimation = scrollIntoView(this.container); // Editor causes the title animation to trigger on moving hostpos
    // Animations will be disabled by default then enabled if not in editor

    if (!Shopify.designMode) {
      i$1(scrollAnimationElement, classes$2.scrollAnimationDisabler);
    }
  },

  _hotspotClickHandler(e) {
    var hotspot = e.currentTarget;
    var wrapper = e.currentTarget.parentNode;
    var card = e.currentTarget.nextElementSibling;
    if (!card) return;

    if (a$1(card, 'hidden')) {
      var cardHeight = card.offsetHeight;
      var cardWidth = card.offsetWidth;

      this._closeAll();

      card.setAttribute('aria-hidden', false);
      card.style.setProperty('--card-height', cardHeight + 'px');
      card.style.setProperty('--card-width', cardWidth + 'px');
      i$1(card, classes$2.hidden);
      u$2(wrapper, classes$2.active);
      i$1(wrapper, classes$2.unset);
      u$2(this.container, classes$2.flyupActive); // Offset flyup height and scroll hotspot into view

      if (!window.matchMedia('(min-width: 45em)').matches) {
        var hotspotOffsetMargin = 70;
        var hotspotOffsetTop = hotspot.getBoundingClientRect().top;
        var positionFromBottom = window.innerHeight - (hotspotOffsetTop + hotspotOffsetMargin);

        if (cardHeight > positionFromBottom) {
          var y = window.pageYOffset + cardHeight - positionFromBottom;
          window.scrollTo({
            top: y,
            behavior: 'smooth'
          });
        }
      }
    } else {
      card.setAttribute('aria-hidden', true);
      u$2(card, classes$2.hidden);
      i$1(this.container, classes$2.flyupActive);
      i$1(wrapper, classes$2.active);
    }
  },

  _clickOutsideHandler(e) {
    if (!e.target.closest(selectors$i.productCard) && !a$1(e.target, 'shoppable-item__hotspot')) {
      this._closeAll();
    }
  },

  _closeAll() {
    this.productCards.forEach(card => {
      u$2(card, classes$2.hidden);
      card.setAttribute('aria-hidden', true);
    });
    this.hotspotContainers.forEach(spot => i$1(spot, classes$2.active));
    i$1(this.container, classes$2.flyupActive);
  },

  onUnload() {
    this.events.forEach(unsubscribe => unsubscribe());
    this.scrollAnimation.unload();
  }

});

var isFirstSectionOnHomepage = node => {
  var body = document.body;
  if (!body.classList.contains('template-index')) return;
  var firstSection = body.querySelector('.section-dynamic');
  var sectionParent = node.parentNode;
  if (firstSection === sectionParent) r$1('section:first-full-height');
  return firstSection === sectionParent;
};

var selectors$h = {
  dots: '.page-dot'
};

var pageDots = (container, slider, slideCount) => {
  var pageDots = t$7(selectors$h.dots, container);
  var events = [];
  pageDots.forEach(dot => {
    events.push(e$3(dot, 'click', e => _handlePageDot(e)));
  });

  var _handlePageDot = e => {
    e.preventDefault();
    if (e.target.classList.contains('is-selected')) return; // 3 or more page dots is handled differently than 2 due to having
    // to load aditional slides because of transition animation

    if (slideCount > 2) {
      var {
        slideIndex
      } = e.target.dataset;
      slider.select(slideIndex);
      return;
    } // 2 slides actually loads 4 slides, however we are using
    // 2 page dots to fake only showing 2 slides.


    if (e.target.classList.contains('next')) {
      slider.next();
    } else {
      slider.previous();
    }
  };

  var update = cellIndex => {
    var activeClass = 'is-selected';
    pageDots.forEach(dot => i$1(dot, activeClass));

    if (slideCount > 2) {
      u$2(pageDots[cellIndex], activeClass);
      return;
    }

    u$2(pageDots[cellIndex % 2], activeClass);
  };

  var unload = () => {
    events.forEach(unsubscribe => unsubscribe());
  };

  return {
    update,
    unload
  };
};

var selectors$g = {
  slideshow: '.js-slideshow',
  slide: '.slideshow__slide',
  images: '.slideshow__image',
  desktopImages: '.slideshow__image--desktop',
  mobileImages: '.slideshow__image--mobile',
  innerImage: '.image__img'
};
register('slideshow', {
  slideshow: null,
  events: [],

  onLoad() {
    this.slideshowContainer = n$3(selectors$g.slideshow, this.container);
    this.slides = t$7(selectors$g.slide, this.container);
    this.slideImagesDesktop = t$7(selectors$g.desktopImages, this.container);
    this.slideImagesMobile = t$7(selectors$g.mobileImages, this.container);
    var docStyle = document.documentElement.style;
    this.transformProp = typeof docStyle.transform == 'string' ? 'transform' : 'WebkitTransform';

    if (isFirstSectionOnHomepage(this.container)) {
      u$2(this.container, 'first-full-height');
    }

    this._initSlideshow();
  },

  _initSlideshow() {
    var slideshowOpts = {
      percentPosition: true,
      wrapAround: true,
      prevNextButtons: false,
      adaptiveHeight: true,
      pageDots: false
    };
    var {
      timer,
      slideCount
    } = this.container.dataset;
    slideshowOpts.autoPlay = parseInt(timer);

    if (this.slides.length > 1) {
      this.slideshow = new Flickity(this.slideshowContainer, _objectSpread2({}, slideshowOpts));
      this.pageDots = pageDots(this.container, this.slideshow, slideCount);
      this.slideshow.on('scroll', () => {
        if (!prefersReducedMotion()) {
          this.slideshow.slides.forEach((slide, i) => {
            this._handleSlideScroll(slide, i);
          });
        }
      });
      this.slideshow.on('select', () => {
        this.pageDots.update(this.slideshow.selectedIndex);
      });
      this.navListener = e$3(this.container, 'click', evt => {
        this._clickListener(evt, this.slideshow);
      });
    } else if (this.slides.length === 1) {
      this.slides[0].classList.add('is-selected');
    }
  },

  _clickListener(evt, slideshow) {
    var {
      control
    } = evt.target.dataset;

    if (control === 'next') {
      evt && evt.preventDefault();
      slideshow.next();
    } else if (control === 'prev') {
      evt && evt.preventDefault();
      slideshow.previous();
    } else if (control === 'pause') {
      evt && evt.preventDefault();

      if (slideshow.player.state === 'playing') {
        slideshow.stopPlayer();
      } else {
        slideshow.playPlayer();
      }
    }
  },

  _handleSlideScroll(slide, index) {
    var img;

    if (bp.isSmall()) {
      img = this.slideImagesMobile[index];
    } else {
      img = this.slideImagesDesktop[index];
    }

    var x = 0;

    if (index === 0) {
      x = Math.abs(this.slideshow.x) > this.slideshow.slidesWidth ? this.slideshow.slidesWidth + this.slideshow.x + this.slideshow.slides[this.slideshow.slides.length - 1].outerWidth + slide.target : slide.target + this.slideshow.x;
    } else if (index === this.slideshow.slides.length - 1) {
      x = Math.abs(this.slideshow.x) + this.slideshow.slides[index].outerWidth < this.slideshow.slidesWidth ? slide.target - this.slideshow.slidesWidth + this.slideshow.x - this.slideshow.slides[index].outerWidth : slide.target + this.slideshow.x;
    } else {
      x = slide.target + this.slideshow.x;
    }

    img.style[this.transformProp] = 'translateX(' + x * -1 / 2 + 'px)';
  },

  onUnload() {
    if (this.slideshow) {
      this.slideshow.destroy();
      this.pageDots.unload();
    }

    this.atBreakpointChange.unload();
    this.events.forEach(unsubscribe => unsubscribe());
  },

  onBlockSelect(_ref) {
    var {
      target: slide
    } = _ref;

    if (this.slideshow) {
      this.slideshow.pausePlayer();
      this.slideshow.select(slide.dataset.index, true, true);
    }
  },

  onBlockDeselect() {
    if (this.slideshow) {
      this.slideshow.unpausePlayer();
    }
  }

});

var selectors$f = {
  slideshow: '.slideshow-split__slideshow',
  slide: '.slideshow-split__slide',
  innerImage: '.image__img',
  underlay: '.slideshow-split__underlay',
  video: '.slideshow-split__video'
};
register('slideshow-split', {
  events: [],

  onLoad() {
    this.slideshowContainer = n$3(selectors$f.slideshow, this.container);
    this.slides = t$7(selectors$f.slide, this.container);
    this.videoElements = [];
    var underlay = n$3(selectors$f.underlay, this.container);

    if (isFirstSectionOnHomepage(this.container)) {
      u$2(this.container, 'first-full-height');
    }

    if (this.slides.length > 1) {
      this._initSlideshow();

      onImagesLoaded(this.container, () => underlay.classList.remove('hide'));
    }

    this.scrollAnimation = scrollIntoView(this.container);
    this.slides.forEach(item => {
      var videoWrapper = item.querySelector(selectors$f.video);

      if (videoWrapper) {
        this.events.push(backgroundVideoHandler(item));
        this.videoElements.push(videoWrapper);
      }
    });
    this.autoPlayListeners = [e$3(window, 'click', () => this._handleAutoPlay()), e$3(window, 'touchstart', () => this._handleAutoPlay())];
  },

  _initSlideshow() {
    var slideshowOpts = {
      percentPosition: true,
      wrapAround: true,
      prevNextButtons: false,
      adaptiveHeight: false,
      pageDots: false,
      cellAlign: 'left'
    };
    var {
      timer,
      slideCount
    } = this.container.dataset;
    slideshowOpts.autoPlay = parseInt(timer);
    this.slideshow = new Flickity(this.slideshowContainer, _objectSpread2({}, slideshowOpts));
    this.pageDots = pageDots(this.container, this.slideshow, slideCount);
    this.slideshow.on('select', () => {
      this.pageDots.update(this.slideshow.selectedIndex);
    });
    this.navListener = e$3(this.container, 'click', evt => {
      this._clickListener(evt, this.slideshow);
    });
    setTimeout(() => {
      this.slideshow.resize();
    }, 100);
  },

  _clickListener(evt, slideshow) {
    var {
      control
    } = evt.target.dataset;

    if (control === 'next') {
      evt && evt.preventDefault();
      slideshow.next();
    } else if (control === 'prev') {
      evt && evt.preventDefault();
      slideshow.previous();
    } else if (control === 'pause') {
      evt && evt.preventDefault();

      if (slideshow.player.state === 'playing') {
        slideshow.stopPlayer();
      } else {
        slideshow.playPlayer();
      }
    }
  },

  // Force autoplay after device interaction if in low power mode
  _handleAutoPlay() {
    this.videoElements.forEach(video => {
      if (!video.playing) {
        video.play();
      }
    });
    this.autoPlayListeners.forEach(unsubscribe => unsubscribe());
  },

  onUnload() {
    this.slideshow && this.slideshow.destroy();
    this.scrollAnimation.unload();
    this.events.forEach(unsubscribe => unsubscribe());
  },

  onBlockSelect(_ref) {
    var {
      target: slide
    } = _ref;

    if (this.slideshow) {
      this.slideshow.pausePlayer();
      this.slideshow.select(slide.dataset.index);
    }
  },

  onBlockDeselect() {
    if (this.slideshow) {
      this.slideshow.unpausePlayer();
    }
  }

});

var dist = {exports: {}};

var Sister;

/**
* @link https://github.com/gajus/sister for the canonical source repository
* @license https://github.com/gajus/sister/blob/master/LICENSE BSD 3-Clause
*/
Sister = function () {
    var sister = {},
        events = {};

    /**
     * @name handler
     * @function
     * @param {Object} data Event data.
     */

    /**
     * @param {String} name Event name.
     * @param {handler} handler
     * @return {listener}
     */
    sister.on = function (name, handler) {
        var listener = {name: name, handler: handler};
        events[name] = events[name] || [];
        events[name].unshift(listener);
        return listener;
    };

    /**
     * @param {listener}
     */
    sister.off = function (listener) {
        var index = events[listener.name].indexOf(listener);

        if (index !== -1) {
            events[listener.name].splice(index, 1);
        }
    };

    /**
     * @param {String} name Event name.
     * @param {Object} data Event data.
     */
    sister.trigger = function (name, data) {
        var listeners = events[name],
            i;

        if (listeners) {
            i = listeners.length;
            while (i--) {
                listeners[i].handler(data);
            }
        }
    };

    return sister;
};

var sister = Sister;

var loadYouTubeIframeApi = {exports: {}};

var loadScript = function load (src, opts, cb) {
  var head = document.head || document.getElementsByTagName('head')[0];
  var script = document.createElement('script');

  if (typeof opts === 'function') {
    cb = opts;
    opts = {};
  }

  opts = opts || {};
  cb = cb || function() {};

  script.type = opts.type || 'text/javascript';
  script.charset = opts.charset || 'utf8';
  script.async = 'async' in opts ? !!opts.async : true;
  script.src = src;

  if (opts.attrs) {
    setAttributes(script, opts.attrs);
  }

  if (opts.text) {
    script.text = '' + opts.text;
  }

  var onend = 'onload' in script ? stdOnEnd : ieOnEnd;
  onend(script, cb);

  // some good legacy browsers (firefox) fail the 'in' detection above
  // so as a fallback we always set onload
  // old IE will ignore this and new IE will set onload
  if (!script.onload) {
    stdOnEnd(script, cb);
  }

  head.appendChild(script);
};

function setAttributes(script, attrs) {
  for (var attr in attrs) {
    script.setAttribute(attr, attrs[attr]);
  }
}

function stdOnEnd (script, cb) {
  script.onload = function () {
    this.onerror = this.onload = null;
    cb(null, script);
  };
  script.onerror = function () {
    // this.onload = null here is necessary
    // because even IE9 works not like others
    this.onerror = this.onload = null;
    cb(new Error('Failed to load ' + this.src), script);
  };
}

function ieOnEnd (script, cb) {
  script.onreadystatechange = function () {
    if (this.readyState != 'complete' && this.readyState != 'loaded') return
    this.onreadystatechange = null;
    cb(null, script); // there is no way to catch loading errors in IE8
  };
}

(function (module, exports) {

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _loadScript = loadScript;

var _loadScript2 = _interopRequireDefault(_loadScript);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (emitter) {
  /**
   * A promise that is resolved when window.onYouTubeIframeAPIReady is called.
   * The promise is resolved with a reference to window.YT object.
   */
  var iframeAPIReady = new Promise(function (resolve) {
    if (window.YT && window.YT.Player && window.YT.Player instanceof Function) {
      resolve(window.YT);

      return;
    } else {
      var protocol = window.location.protocol === 'http:' ? 'http:' : 'https:';

      (0, _loadScript2.default)(protocol + '//www.youtube.com/iframe_api', function (error) {
        if (error) {
          emitter.trigger('error', error);
        }
      });
    }

    var previous = window.onYouTubeIframeAPIReady;

    // The API will call this function when page has finished downloading
    // the JavaScript for the player API.
    window.onYouTubeIframeAPIReady = function () {
      if (previous) {
        previous();
      }

      resolve(window.YT);
    };
  });

  return iframeAPIReady;
};

module.exports = exports['default'];
}(loadYouTubeIframeApi, loadYouTubeIframeApi.exports));

var YouTubePlayer = {exports: {}};

var browser = {exports: {}};

var debug = {exports: {}};

/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} [options]
 * @throws {Error} throw an error if val is not a non-empty string or a number
 * @return {String|Number}
 * @api public
 */

var ms = function(val, options) {
  options = options || {};
  var type = typeof val;
  if (type === 'string' && val.length > 0) {
    return parse(val);
  } else if (type === 'number' && isNaN(val) === false) {
    return options.long ? fmtLong(val) : fmtShort(val);
  }
  throw new Error(
    'val is not a non-empty string or a valid number. val=' +
      JSON.stringify(val)
  );
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  str = String(str);
  if (str.length > 100) {
    return;
  }
  var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(
    str
  );
  if (!match) {
    return;
  }
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
    default:
      return undefined;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtShort(ms) {
  if (ms >= d) {
    return Math.round(ms / d) + 'd';
  }
  if (ms >= h) {
    return Math.round(ms / h) + 'h';
  }
  if (ms >= m) {
    return Math.round(ms / m) + 'm';
  }
  if (ms >= s) {
    return Math.round(ms / s) + 's';
  }
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtLong(ms) {
  return plural(ms, d, 'day') ||
    plural(ms, h, 'hour') ||
    plural(ms, m, 'minute') ||
    plural(ms, s, 'second') ||
    ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, n, name) {
  if (ms < n) {
    return;
  }
  if (ms < n * 1.5) {
    return Math.floor(ms / n) + ' ' + name;
  }
  return Math.ceil(ms / n) + ' ' + name + 's';
}

(function (module, exports) {
/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = createDebug.debug = createDebug['default'] = createDebug;
exports.coerce = coerce;
exports.disable = disable;
exports.enable = enable;
exports.enabled = enabled;
exports.humanize = ms;

/**
 * The currently active debug mode names, and names to skip.
 */

exports.names = [];
exports.skips = [];

/**
 * Map of special "%n" handling functions, for the debug "format" argument.
 *
 * Valid key names are a single, lower or upper-case letter, i.e. "n" and "N".
 */

exports.formatters = {};

/**
 * Previous log timestamp.
 */

var prevTime;

/**
 * Select a color.
 * @param {String} namespace
 * @return {Number}
 * @api private
 */

function selectColor(namespace) {
  var hash = 0, i;

  for (i in namespace) {
    hash  = ((hash << 5) - hash) + namespace.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }

  return exports.colors[Math.abs(hash) % exports.colors.length];
}

/**
 * Create a debugger with the given `namespace`.
 *
 * @param {String} namespace
 * @return {Function}
 * @api public
 */

function createDebug(namespace) {

  function debug() {
    // disabled?
    if (!debug.enabled) return;

    var self = debug;

    // set `diff` timestamp
    var curr = +new Date();
    var ms = curr - (prevTime || curr);
    self.diff = ms;
    self.prev = prevTime;
    self.curr = curr;
    prevTime = curr;

    // turn the `arguments` into a proper Array
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }

    args[0] = exports.coerce(args[0]);

    if ('string' !== typeof args[0]) {
      // anything else let's inspect with %O
      args.unshift('%O');
    }

    // apply any `formatters` transformations
    var index = 0;
    args[0] = args[0].replace(/%([a-zA-Z%])/g, function(match, format) {
      // if we encounter an escaped % then don't increase the array index
      if (match === '%%') return match;
      index++;
      var formatter = exports.formatters[format];
      if ('function' === typeof formatter) {
        var val = args[index];
        match = formatter.call(self, val);

        // now we need to remove `args[index]` since it's inlined in the `format`
        args.splice(index, 1);
        index--;
      }
      return match;
    });

    // apply env-specific formatting (colors, etc.)
    exports.formatArgs.call(self, args);

    var logFn = debug.log || exports.log || console.log.bind(console);
    logFn.apply(self, args);
  }

  debug.namespace = namespace;
  debug.enabled = exports.enabled(namespace);
  debug.useColors = exports.useColors();
  debug.color = selectColor(namespace);

  // env-specific initialization logic for debug instances
  if ('function' === typeof exports.init) {
    exports.init(debug);
  }

  return debug;
}

/**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} namespaces
 * @api public
 */

function enable(namespaces) {
  exports.save(namespaces);

  exports.names = [];
  exports.skips = [];

  var split = (typeof namespaces === 'string' ? namespaces : '').split(/[\s,]+/);
  var len = split.length;

  for (var i = 0; i < len; i++) {
    if (!split[i]) continue; // ignore empty strings
    namespaces = split[i].replace(/\*/g, '.*?');
    if (namespaces[0] === '-') {
      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    } else {
      exports.names.push(new RegExp('^' + namespaces + '$'));
    }
  }
}

/**
 * Disable debug output.
 *
 * @api public
 */

function disable() {
  exports.enable('');
}

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

function enabled(name) {
  var i, len;
  for (i = 0, len = exports.skips.length; i < len; i++) {
    if (exports.skips[i].test(name)) {
      return false;
    }
  }
  for (i = 0, len = exports.names.length; i < len; i++) {
    if (exports.names[i].test(name)) {
      return true;
    }
  }
  return false;
}

/**
 * Coerce `val`.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}
}(debug, debug.exports));

/**
 * This is the web browser implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

(function (module, exports) {
exports = module.exports = debug.exports;
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;
exports.storage = 'undefined' != typeof chrome
               && 'undefined' != typeof chrome.storage
                  ? chrome.storage.local
                  : localstorage();

/**
 * Colors.
 */

exports.colors = [
  'lightseagreen',
  'forestgreen',
  'goldenrod',
  'dodgerblue',
  'darkorchid',
  'crimson'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

function useColors() {
  // NB: In an Electron preload script, document will be defined but not fully
  // initialized. Since we know we're in Chrome, we'll just detect this case
  // explicitly
  if (typeof window !== 'undefined' && window.process && window.process.type === 'renderer') {
    return true;
  }

  // is webkit? http://stackoverflow.com/a/16459606/376773
  // document is undefined in react-native: https://github.com/facebook/react-native/pull/1632
  return (typeof document !== 'undefined' && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance) ||
    // is firebug? http://stackoverflow.com/a/398120/376773
    (typeof window !== 'undefined' && window.console && (window.console.firebug || (window.console.exception && window.console.table))) ||
    // is firefox >= v31?
    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31) ||
    // double check webkit in userAgent just in case we are in a worker
    (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/));
}

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

exports.formatters.j = function(v) {
  try {
    return JSON.stringify(v);
  } catch (err) {
    return '[UnexpectedJSONParseError]: ' + err.message;
  }
};


/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs(args) {
  var useColors = this.useColors;

  args[0] = (useColors ? '%c' : '')
    + this.namespace
    + (useColors ? ' %c' : ' ')
    + args[0]
    + (useColors ? '%c ' : ' ')
    + '+' + exports.humanize(this.diff);

  if (!useColors) return;

  var c = 'color: ' + this.color;
  args.splice(1, 0, c, 'color: inherit');

  // the final "%c" is somewhat tricky, because there could be other
  // arguments passed either before or after the %c, so we need to
  // figure out the correct index to insert the CSS into
  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-zA-Z%]/g, function(match) {
    if ('%%' === match) return;
    index++;
    if ('%c' === match) {
      // we only are interested in the *last* %c
      // (the user may have provided their own)
      lastC = index;
    }
  });

  args.splice(lastC, 0, c);
}

/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */

function log() {
  // this hackery is required for IE8/9, where
  // the `console.log` function doesn't have 'apply'
  return 'object' === typeof console
    && console.log
    && Function.prototype.apply.call(console.log, console, arguments);
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  try {
    if (null == namespaces) {
      exports.storage.removeItem('debug');
    } else {
      exports.storage.debug = namespaces;
    }
  } catch(e) {}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  var r;
  try {
    r = exports.storage.debug;
  } catch(e) {}

  // If debug isn't set in LS, and we're in Electron, try to load $DEBUG
  if (!r && typeof process !== 'undefined' && 'env' in process) {
    r = process.env.DEBUG;
  }

  return r;
}

/**
 * Enable namespaces listed in `localStorage.debug` initially.
 */

exports.enable(load());

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function localstorage() {
  try {
    return window.localStorage;
  } catch (e) {}
}
}(browser, browser.exports));

var functionNames = {exports: {}};

(function (module, exports) {

Object.defineProperty(exports, "__esModule", {
  value: true
});


/**
 * @see https://developers.google.com/youtube/iframe_api_reference#Functions
 */
exports.default = ['cueVideoById', 'loadVideoById', 'cueVideoByUrl', 'loadVideoByUrl', 'playVideo', 'pauseVideo', 'stopVideo', 'getVideoLoadedFraction', 'cuePlaylist', 'loadPlaylist', 'nextVideo', 'previousVideo', 'playVideoAt', 'setShuffle', 'setLoop', 'getPlaylist', 'getPlaylistIndex', 'setOption', 'mute', 'unMute', 'isMuted', 'setVolume', 'getVolume', 'seekTo', 'getPlayerState', 'getPlaybackRate', 'setPlaybackRate', 'getAvailablePlaybackRates', 'getPlaybackQuality', 'setPlaybackQuality', 'getAvailableQualityLevels', 'getCurrentTime', 'getDuration', 'removeEventListener', 'getVideoUrl', 'getVideoEmbedCode', 'getOptions', 'getOption', 'addEventListener', 'destroy', 'setSize', 'getIframe'];
module.exports = exports['default'];
}(functionNames, functionNames.exports));

var eventNames = {exports: {}};

(function (module, exports) {

Object.defineProperty(exports, "__esModule", {
  value: true
});


/**
 * @see https://developers.google.com/youtube/iframe_api_reference#Events
 * `volumeChange` is not officially supported but seems to work
 * it emits an object: `{volume: 82.6923076923077, muted: false}`
 */
exports.default = ['ready', 'stateChange', 'playbackQualityChange', 'playbackRateChange', 'error', 'apiChange', 'volumeChange'];
module.exports = exports['default'];
}(eventNames, eventNames.exports));

var FunctionStateMap = {exports: {}};

var PlayerStates = {exports: {}};

(function (module, exports) {

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = {
  BUFFERING: 3,
  ENDED: 0,
  PAUSED: 2,
  PLAYING: 1,
  UNSTARTED: -1,
  VIDEO_CUED: 5
};
module.exports = exports["default"];
}(PlayerStates, PlayerStates.exports));

(function (module, exports) {

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _PlayerStates = PlayerStates.exports;

var _PlayerStates2 = _interopRequireDefault(_PlayerStates);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = {
  pauseVideo: {
    acceptableStates: [_PlayerStates2.default.ENDED, _PlayerStates2.default.PAUSED],
    stateChangeRequired: false
  },
  playVideo: {
    acceptableStates: [_PlayerStates2.default.ENDED, _PlayerStates2.default.PLAYING],
    stateChangeRequired: false
  },
  seekTo: {
    acceptableStates: [_PlayerStates2.default.ENDED, _PlayerStates2.default.PLAYING, _PlayerStates2.default.PAUSED],
    stateChangeRequired: true,

    // TRICKY: `seekTo` may not cause a state change if no buffering is
    // required.
    timeout: 3000
  }
};
module.exports = exports['default'];
}(FunctionStateMap, FunctionStateMap.exports));

(function (module, exports) {

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _debug = browser.exports;

var _debug2 = _interopRequireDefault(_debug);

var _functionNames = functionNames.exports;

var _functionNames2 = _interopRequireDefault(_functionNames);

var _eventNames = eventNames.exports;

var _eventNames2 = _interopRequireDefault(_eventNames);

var _FunctionStateMap = FunctionStateMap.exports;

var _FunctionStateMap2 = _interopRequireDefault(_FunctionStateMap);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* eslint-disable promise/prefer-await-to-then */

var debug = (0, _debug2.default)('youtube-player');

var YouTubePlayer = {};

/**
 * Construct an object that defines an event handler for all of the YouTube
 * player events. Proxy captured events through an event emitter.
 *
 * @todo Capture event parameters.
 * @see https://developers.google.com/youtube/iframe_api_reference#Events
 */
YouTubePlayer.proxyEvents = function (emitter) {
  var events = {};

  var _loop = function _loop(eventName) {
    var onEventName = 'on' + eventName.slice(0, 1).toUpperCase() + eventName.slice(1);

    events[onEventName] = function (event) {
      debug('event "%s"', onEventName, event);

      emitter.trigger(eventName, event);
    };
  };

  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = _eventNames2.default[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var eventName = _step.value;

      _loop(eventName);
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  return events;
};

/**
 * Delays player API method execution until player state is ready.
 *
 * @todo Proxy all of the methods using Object.keys.
 * @todo See TRICKY below.
 * @param playerAPIReady Promise that resolves when player is ready.
 * @param strictState A flag designating whether or not to wait for
 * an acceptable state when calling supported functions.
 * @returns {Object}
 */
YouTubePlayer.promisifyPlayer = function (playerAPIReady) {
  var strictState = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

  var functions = {};

  var _loop2 = function _loop2(functionName) {
    if (strictState && _FunctionStateMap2.default[functionName]) {
      functions[functionName] = function () {
        for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }

        return playerAPIReady.then(function (player) {
          var stateInfo = _FunctionStateMap2.default[functionName];
          var playerState = player.getPlayerState();

          // eslint-disable-next-line no-warning-comments
          // TODO: Just spread the args into the function once Babel is fixed:
          // https://github.com/babel/babel/issues/4270
          //
          // eslint-disable-next-line prefer-spread
          var value = player[functionName].apply(player, args);

          // TRICKY: For functions like `seekTo`, a change in state must be
          // triggered given that the resulting state could match the initial
          // state.
          if (stateInfo.stateChangeRequired ||

          // eslint-disable-next-line no-extra-parens
          Array.isArray(stateInfo.acceptableStates) && stateInfo.acceptableStates.indexOf(playerState) === -1) {
            return new Promise(function (resolve) {
              var onPlayerStateChange = function onPlayerStateChange() {
                var playerStateAfterChange = player.getPlayerState();

                var timeout = void 0;

                if (typeof stateInfo.timeout === 'number') {
                  timeout = setTimeout(function () {
                    player.removeEventListener('onStateChange', onPlayerStateChange);

                    resolve();
                  }, stateInfo.timeout);
                }

                if (Array.isArray(stateInfo.acceptableStates) && stateInfo.acceptableStates.indexOf(playerStateAfterChange) !== -1) {
                  player.removeEventListener('onStateChange', onPlayerStateChange);

                  clearTimeout(timeout);

                  resolve();
                }
              };

              player.addEventListener('onStateChange', onPlayerStateChange);
            }).then(function () {
              return value;
            });
          }

          return value;
        });
      };
    } else {
      functions[functionName] = function () {
        for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
          args[_key2] = arguments[_key2];
        }

        return playerAPIReady.then(function (player) {
          // eslint-disable-next-line no-warning-comments
          // TODO: Just spread the args into the function once Babel is fixed:
          // https://github.com/babel/babel/issues/4270
          //
          // eslint-disable-next-line prefer-spread
          return player[functionName].apply(player, args);
        });
      };
    }
  };

  var _iteratorNormalCompletion2 = true;
  var _didIteratorError2 = false;
  var _iteratorError2 = undefined;

  try {
    for (var _iterator2 = _functionNames2.default[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
      var functionName = _step2.value;

      _loop2(functionName);
    }
  } catch (err) {
    _didIteratorError2 = true;
    _iteratorError2 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion2 && _iterator2.return) {
        _iterator2.return();
      }
    } finally {
      if (_didIteratorError2) {
        throw _iteratorError2;
      }
    }
  }

  return functions;
};

exports.default = YouTubePlayer;
module.exports = exports['default'];
}(YouTubePlayer, YouTubePlayer.exports));

(function (module, exports) {

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _sister = sister;

var _sister2 = _interopRequireDefault(_sister);

var _loadYouTubeIframeApi = loadYouTubeIframeApi.exports;

var _loadYouTubeIframeApi2 = _interopRequireDefault(_loadYouTubeIframeApi);

var _YouTubePlayer = YouTubePlayer.exports;

var _YouTubePlayer2 = _interopRequireDefault(_YouTubePlayer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @typedef YT.Player
 * @see https://developers.google.com/youtube/iframe_api_reference
 * */

/**
 * @see https://developers.google.com/youtube/iframe_api_reference#Loading_a_Video_Player
 */
var youtubeIframeAPI = void 0;

/**
 * A factory function used to produce an instance of YT.Player and queue function calls and proxy events of the resulting object.
 *
 * @param maybeElementId Either An existing YT.Player instance,
 * the DOM element or the id of the HTML element where the API will insert an <iframe>.
 * @param options See `options` (Ignored when using an existing YT.Player instance).
 * @param strictState A flag designating whether or not to wait for
 * an acceptable state when calling supported functions. Default: `false`.
 * See `FunctionStateMap.js` for supported functions and acceptable states.
 */

exports.default = function (maybeElementId) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var strictState = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

  var emitter = (0, _sister2.default)();

  if (!youtubeIframeAPI) {
    youtubeIframeAPI = (0, _loadYouTubeIframeApi2.default)(emitter);
  }

  if (options.events) {
    throw new Error('Event handlers cannot be overwritten.');
  }

  if (typeof maybeElementId === 'string' && !document.getElementById(maybeElementId)) {
    throw new Error('Element "' + maybeElementId + '" does not exist.');
  }

  options.events = _YouTubePlayer2.default.proxyEvents(emitter);

  var playerAPIReady = new Promise(function (resolve) {
    if ((typeof maybeElementId === 'undefined' ? 'undefined' : _typeof(maybeElementId)) === 'object' && maybeElementId.playVideo instanceof Function) {
      var player = maybeElementId;

      resolve(player);
    } else {
      // asume maybeElementId can be rendered inside
      // eslint-disable-next-line promise/catch-or-return
      youtubeIframeAPI.then(function (YT) {
        // eslint-disable-line promise/prefer-await-to-then
        var player = new YT.Player(maybeElementId, options);

        emitter.on('ready', function () {
          resolve(player);
        });

        return null;
      });
    }
  });

  var playerApi = _YouTubePlayer2.default.promisifyPlayer(playerAPIReady, strictState);

  playerApi.on = emitter.on;
  playerApi.off = emitter.off;

  return playerApi;
};

module.exports = exports['default'];
}(dist, dist.exports));

var t$2 = /*@__PURE__*/getDefaultExportFromCjs(dist.exports);

/*! @vimeo/player v2.16.4 | (c) 2022 Vimeo | MIT License | https://github.com/vimeo/player.js */
function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ("value" in descriptor) descriptor.writable = true;
    Object.defineProperty(target, descriptor.key, descriptor);
  }
}

function _createClass(Constructor, protoProps, staticProps) {
  if (protoProps) _defineProperties(Constructor.prototype, protoProps);
  if (staticProps) _defineProperties(Constructor, staticProps);
  return Constructor;
}

/**
 * @module lib/functions
 */

/**
 * Check to see this is a node environment.
 * @type {Boolean}
 */

/* global global */
var isNode = typeof global !== 'undefined' && {}.toString.call(global) === '[object global]';
/**
 * Get the name of the method for a given getter or setter.
 *
 * @param {string} prop The name of the property.
 * @param {string} type Either “get” or “set”.
 * @return {string}
 */

function getMethodName(prop, type) {
  if (prop.indexOf(type.toLowerCase()) === 0) {
    return prop;
  }

  return "".concat(type.toLowerCase()).concat(prop.substr(0, 1).toUpperCase()).concat(prop.substr(1));
}
/**
 * Check to see if the object is a DOM Element.
 *
 * @param {*} element The object to check.
 * @return {boolean}
 */

function isDomElement(element) {
  return Boolean(element && element.nodeType === 1 && 'nodeName' in element && element.ownerDocument && element.ownerDocument.defaultView);
}
/**
 * Check to see whether the value is a number.
 *
 * @see http://dl.dropboxusercontent.com/u/35146/js/tests/isNumber.html
 * @param {*} value The value to check.
 * @param {boolean} integer Check if the value is an integer.
 * @return {boolean}
 */

function isInteger(value) {
  // eslint-disable-next-line eqeqeq
  return !isNaN(parseFloat(value)) && isFinite(value) && Math.floor(value) == value;
}
/**
 * Check to see if the URL is a Vimeo url.
 *
 * @param {string} url The url string.
 * @return {boolean}
 */

function isVimeoUrl(url) {
  return /^(https?:)?\/\/((player|www)\.)?vimeo\.com(?=$|\/)/.test(url);
}
/**
 * Get the Vimeo URL from an element.
 * The element must have either a data-vimeo-id or data-vimeo-url attribute.
 *
 * @param {object} oEmbedParameters The oEmbed parameters.
 * @return {string}
 */

function getVimeoUrl() {
  var oEmbedParameters = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var id = oEmbedParameters.id;
  var url = oEmbedParameters.url;
  var idOrUrl = id || url;

  if (!idOrUrl) {
    throw new Error('An id or url must be passed, either in an options object or as a data-vimeo-id or data-vimeo-url attribute.');
  }

  if (isInteger(idOrUrl)) {
    return "https://vimeo.com/".concat(idOrUrl);
  }

  if (isVimeoUrl(idOrUrl)) {
    return idOrUrl.replace('http:', 'https:');
  }

  if (id) {
    throw new TypeError("\u201C".concat(id, "\u201D is not a valid video id."));
  }

  throw new TypeError("\u201C".concat(idOrUrl, "\u201D is not a vimeo.com url."));
}

var arrayIndexOfSupport = typeof Array.prototype.indexOf !== 'undefined';
var postMessageSupport = typeof window !== 'undefined' && typeof window.postMessage !== 'undefined';

if (!isNode && (!arrayIndexOfSupport || !postMessageSupport)) {
  throw new Error('Sorry, the Vimeo Player API is not available in this browser.');
}

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

/*!
 * weakmap-polyfill v2.0.1 - ECMAScript6 WeakMap polyfill
 * https://github.com/polygonplanet/weakmap-polyfill
 * Copyright (c) 2015-2020 Polygon Planet <polygon.planet.aqua@gmail.com>
 * @license MIT
 */
(function (self) {

  if (self.WeakMap) {
    return;
  }

  var hasOwnProperty = Object.prototype.hasOwnProperty;

  var defineProperty = function (object, name, value) {
    if (Object.defineProperty) {
      Object.defineProperty(object, name, {
        configurable: true,
        writable: true,
        value: value
      });
    } else {
      object[name] = value;
    }
  };

  self.WeakMap = function () {
    // ECMA-262 23.3 WeakMap Objects
    function WeakMap() {
      if (this === void 0) {
        throw new TypeError("Constructor WeakMap requires 'new'");
      }

      defineProperty(this, '_id', genId('_WeakMap')); // ECMA-262 23.3.1.1 WeakMap([iterable])

      if (arguments.length > 0) {
        // Currently, WeakMap `iterable` argument is not supported
        throw new TypeError('WeakMap iterable is not supported');
      }
    } // ECMA-262 23.3.3.2 WeakMap.prototype.delete(key)


    defineProperty(WeakMap.prototype, 'delete', function (key) {
      checkInstance(this, 'delete');

      if (!isObject(key)) {
        return false;
      }

      var entry = key[this._id];

      if (entry && entry[0] === key) {
        delete key[this._id];
        return true;
      }

      return false;
    }); // ECMA-262 23.3.3.3 WeakMap.prototype.get(key)

    defineProperty(WeakMap.prototype, 'get', function (key) {
      checkInstance(this, 'get');

      if (!isObject(key)) {
        return void 0;
      }

      var entry = key[this._id];

      if (entry && entry[0] === key) {
        return entry[1];
      }

      return void 0;
    }); // ECMA-262 23.3.3.4 WeakMap.prototype.has(key)

    defineProperty(WeakMap.prototype, 'has', function (key) {
      checkInstance(this, 'has');

      if (!isObject(key)) {
        return false;
      }

      var entry = key[this._id];

      if (entry && entry[0] === key) {
        return true;
      }

      return false;
    }); // ECMA-262 23.3.3.5 WeakMap.prototype.set(key, value)

    defineProperty(WeakMap.prototype, 'set', function (key, value) {
      checkInstance(this, 'set');

      if (!isObject(key)) {
        throw new TypeError('Invalid value used as weak map key');
      }

      var entry = key[this._id];

      if (entry && entry[0] === key) {
        entry[1] = value;
        return this;
      }

      defineProperty(key, this._id, [key, value]);
      return this;
    });

    function checkInstance(x, methodName) {
      if (!isObject(x) || !hasOwnProperty.call(x, '_id')) {
        throw new TypeError(methodName + ' method called on incompatible receiver ' + typeof x);
      }
    }

    function genId(prefix) {
      return prefix + '_' + rand() + '.' + rand();
    }

    function rand() {
      return Math.random().toString().substring(2);
    }

    defineProperty(WeakMap, '_polyfill', true);
    return WeakMap;
  }();

  function isObject(x) {
    return Object(x) === x;
  }
})(typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : typeof commonjsGlobal !== 'undefined' ? commonjsGlobal : commonjsGlobal);

var npo_src = createCommonjsModule(function (module) {
/*! Native Promise Only
    v0.8.1 (c) Kyle Simpson
    MIT License: http://getify.mit-license.org
*/
(function UMD(name, context, definition) {
  // special form of UMD for polyfilling across evironments
  context[name] = context[name] || definition();

  if (module.exports) {
    module.exports = context[name];
  }
})("Promise", typeof commonjsGlobal != "undefined" ? commonjsGlobal : commonjsGlobal, function DEF() {

  var builtInProp,
      cycle,
      scheduling_queue,
      ToString = Object.prototype.toString,
      timer = typeof setImmediate != "undefined" ? function timer(fn) {
    return setImmediate(fn);
  } : setTimeout; // dammit, IE8.

  try {
    Object.defineProperty({}, "x", {});

    builtInProp = function builtInProp(obj, name, val, config) {
      return Object.defineProperty(obj, name, {
        value: val,
        writable: true,
        configurable: config !== false
      });
    };
  } catch (err) {
    builtInProp = function builtInProp(obj, name, val) {
      obj[name] = val;
      return obj;
    };
  } // Note: using a queue instead of array for efficiency


  scheduling_queue = function Queue() {
    var first, last, item;

    function Item(fn, self) {
      this.fn = fn;
      this.self = self;
      this.next = void 0;
    }

    return {
      add: function add(fn, self) {
        item = new Item(fn, self);

        if (last) {
          last.next = item;
        } else {
          first = item;
        }

        last = item;
        item = void 0;
      },
      drain: function drain() {
        var f = first;
        first = last = cycle = void 0;

        while (f) {
          f.fn.call(f.self);
          f = f.next;
        }
      }
    };
  }();

  function schedule(fn, self) {
    scheduling_queue.add(fn, self);

    if (!cycle) {
      cycle = timer(scheduling_queue.drain);
    }
  } // promise duck typing


  function isThenable(o) {
    var _then,
        o_type = typeof o;

    if (o != null && (o_type == "object" || o_type == "function")) {
      _then = o.then;
    }

    return typeof _then == "function" ? _then : false;
  }

  function notify() {
    for (var i = 0; i < this.chain.length; i++) {
      notifyIsolated(this, this.state === 1 ? this.chain[i].success : this.chain[i].failure, this.chain[i]);
    }

    this.chain.length = 0;
  } // NOTE: This is a separate function to isolate
  // the `try..catch` so that other code can be
  // optimized better


  function notifyIsolated(self, cb, chain) {
    var ret, _then;

    try {
      if (cb === false) {
        chain.reject(self.msg);
      } else {
        if (cb === true) {
          ret = self.msg;
        } else {
          ret = cb.call(void 0, self.msg);
        }

        if (ret === chain.promise) {
          chain.reject(TypeError("Promise-chain cycle"));
        } else if (_then = isThenable(ret)) {
          _then.call(ret, chain.resolve, chain.reject);
        } else {
          chain.resolve(ret);
        }
      }
    } catch (err) {
      chain.reject(err);
    }
  }

  function resolve(msg) {
    var _then,
        self = this; // already triggered?


    if (self.triggered) {
      return;
    }

    self.triggered = true; // unwrap

    if (self.def) {
      self = self.def;
    }

    try {
      if (_then = isThenable(msg)) {
        schedule(function () {
          var def_wrapper = new MakeDefWrapper(self);

          try {
            _then.call(msg, function $resolve$() {
              resolve.apply(def_wrapper, arguments);
            }, function $reject$() {
              reject.apply(def_wrapper, arguments);
            });
          } catch (err) {
            reject.call(def_wrapper, err);
          }
        });
      } else {
        self.msg = msg;
        self.state = 1;

        if (self.chain.length > 0) {
          schedule(notify, self);
        }
      }
    } catch (err) {
      reject.call(new MakeDefWrapper(self), err);
    }
  }

  function reject(msg) {
    var self = this; // already triggered?

    if (self.triggered) {
      return;
    }

    self.triggered = true; // unwrap

    if (self.def) {
      self = self.def;
    }

    self.msg = msg;
    self.state = 2;

    if (self.chain.length > 0) {
      schedule(notify, self);
    }
  }

  function iteratePromises(Constructor, arr, resolver, rejecter) {
    for (var idx = 0; idx < arr.length; idx++) {
      (function IIFE(idx) {
        Constructor.resolve(arr[idx]).then(function $resolver$(msg) {
          resolver(idx, msg);
        }, rejecter);
      })(idx);
    }
  }

  function MakeDefWrapper(self) {
    this.def = self;
    this.triggered = false;
  }

  function MakeDef(self) {
    this.promise = self;
    this.state = 0;
    this.triggered = false;
    this.chain = [];
    this.msg = void 0;
  }

  function Promise(executor) {
    if (typeof executor != "function") {
      throw TypeError("Not a function");
    }

    if (this.__NPO__ !== 0) {
      throw TypeError("Not a promise");
    } // instance shadowing the inherited "brand"
    // to signal an already "initialized" promise


    this.__NPO__ = 1;
    var def = new MakeDef(this);

    this["then"] = function then(success, failure) {
      var o = {
        success: typeof success == "function" ? success : true,
        failure: typeof failure == "function" ? failure : false
      }; // Note: `then(..)` itself can be borrowed to be used against
      // a different promise constructor for making the chained promise,
      // by substituting a different `this` binding.

      o.promise = new this.constructor(function extractChain(resolve, reject) {
        if (typeof resolve != "function" || typeof reject != "function") {
          throw TypeError("Not a function");
        }

        o.resolve = resolve;
        o.reject = reject;
      });
      def.chain.push(o);

      if (def.state !== 0) {
        schedule(notify, def);
      }

      return o.promise;
    };

    this["catch"] = function $catch$(failure) {
      return this.then(void 0, failure);
    };

    try {
      executor.call(void 0, function publicResolve(msg) {
        resolve.call(def, msg);
      }, function publicReject(msg) {
        reject.call(def, msg);
      });
    } catch (err) {
      reject.call(def, err);
    }
  }

  var PromisePrototype = builtInProp({}, "constructor", Promise,
  /*configurable=*/
  false); // Note: Android 4 cannot use `Object.defineProperty(..)` here

  Promise.prototype = PromisePrototype; // built-in "brand" to signal an "uninitialized" promise

  builtInProp(PromisePrototype, "__NPO__", 0,
  /*configurable=*/
  false);
  builtInProp(Promise, "resolve", function Promise$resolve(msg) {
    var Constructor = this; // spec mandated checks
    // note: best "isPromise" check that's practical for now

    if (msg && typeof msg == "object" && msg.__NPO__ === 1) {
      return msg;
    }

    return new Constructor(function executor(resolve, reject) {
      if (typeof resolve != "function" || typeof reject != "function") {
        throw TypeError("Not a function");
      }

      resolve(msg);
    });
  });
  builtInProp(Promise, "reject", function Promise$reject(msg) {
    return new this(function executor(resolve, reject) {
      if (typeof resolve != "function" || typeof reject != "function") {
        throw TypeError("Not a function");
      }

      reject(msg);
    });
  });
  builtInProp(Promise, "all", function Promise$all(arr) {
    var Constructor = this; // spec mandated checks

    if (ToString.call(arr) != "[object Array]") {
      return Constructor.reject(TypeError("Not an array"));
    }

    if (arr.length === 0) {
      return Constructor.resolve([]);
    }

    return new Constructor(function executor(resolve, reject) {
      if (typeof resolve != "function" || typeof reject != "function") {
        throw TypeError("Not a function");
      }

      var len = arr.length,
          msgs = Array(len),
          count = 0;
      iteratePromises(Constructor, arr, function resolver(idx, msg) {
        msgs[idx] = msg;

        if (++count === len) {
          resolve(msgs);
        }
      }, reject);
    });
  });
  builtInProp(Promise, "race", function Promise$race(arr) {
    var Constructor = this; // spec mandated checks

    if (ToString.call(arr) != "[object Array]") {
      return Constructor.reject(TypeError("Not an array"));
    }

    return new Constructor(function executor(resolve, reject) {
      if (typeof resolve != "function" || typeof reject != "function") {
        throw TypeError("Not a function");
      }

      iteratePromises(Constructor, arr, function resolver(idx, msg) {
        resolve(msg);
      }, reject);
    });
  });
  return Promise;
});
});

/**
 * @module lib/callbacks
 */
var callbackMap = new WeakMap();
/**
 * Store a callback for a method or event for a player.
 *
 * @param {Player} player The player object.
 * @param {string} name The method or event name.
 * @param {(function(this:Player, *): void|{resolve: function, reject: function})} callback
 *        The callback to call or an object with resolve and reject functions for a promise.
 * @return {void}
 */

function storeCallback(player, name, callback) {
  var playerCallbacks = callbackMap.get(player.element) || {};

  if (!(name in playerCallbacks)) {
    playerCallbacks[name] = [];
  }

  playerCallbacks[name].push(callback);
  callbackMap.set(player.element, playerCallbacks);
}
/**
 * Get the callbacks for a player and event or method.
 *
 * @param {Player} player The player object.
 * @param {string} name The method or event name
 * @return {function[]}
 */

function getCallbacks(player, name) {
  var playerCallbacks = callbackMap.get(player.element) || {};
  return playerCallbacks[name] || [];
}
/**
 * Remove a stored callback for a method or event for a player.
 *
 * @param {Player} player The player object.
 * @param {string} name The method or event name
 * @param {function} [callback] The specific callback to remove.
 * @return {boolean} Was this the last callback?
 */

function removeCallback(player, name, callback) {
  var playerCallbacks = callbackMap.get(player.element) || {};

  if (!playerCallbacks[name]) {
    return true;
  } // If no callback is passed, remove all callbacks for the event


  if (!callback) {
    playerCallbacks[name] = [];
    callbackMap.set(player.element, playerCallbacks);
    return true;
  }

  var index = playerCallbacks[name].indexOf(callback);

  if (index !== -1) {
    playerCallbacks[name].splice(index, 1);
  }

  callbackMap.set(player.element, playerCallbacks);
  return playerCallbacks[name] && playerCallbacks[name].length === 0;
}
/**
 * Return the first stored callback for a player and event or method.
 *
 * @param {Player} player The player object.
 * @param {string} name The method or event name.
 * @return {function} The callback, or false if there were none
 */

function shiftCallbacks(player, name) {
  var playerCallbacks = getCallbacks(player, name);

  if (playerCallbacks.length < 1) {
    return false;
  }

  var callback = playerCallbacks.shift();
  removeCallback(player, name, callback);
  return callback;
}
/**
 * Move callbacks associated with an element to another element.
 *
 * @param {HTMLElement} oldElement The old element.
 * @param {HTMLElement} newElement The new element.
 * @return {void}
 */

function swapCallbacks(oldElement, newElement) {
  var playerCallbacks = callbackMap.get(oldElement);
  callbackMap.set(newElement, playerCallbacks);
  callbackMap.delete(oldElement);
}

/**
 * @module lib/embed
 */
var oEmbedParameters = ['autopause', 'autoplay', 'background', 'byline', 'color', 'controls', 'dnt', 'height', 'id', 'interactive_params', 'keyboard', 'loop', 'maxheight', 'maxwidth', 'muted', 'playsinline', 'portrait', 'responsive', 'speed', 'texttrack', 'title', 'transparent', 'url', 'width'];
/**
 * Get the 'data-vimeo'-prefixed attributes from an element as an object.
 *
 * @param {HTMLElement} element The element.
 * @param {Object} [defaults={}] The default values to use.
 * @return {Object<string, string>}
 */

function getOEmbedParameters(element) {
  var defaults = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  return oEmbedParameters.reduce(function (params, param) {
    var value = element.getAttribute("data-vimeo-".concat(param));

    if (value || value === '') {
      params[param] = value === '' ? 1 : value;
    }

    return params;
  }, defaults);
}
/**
 * Create an embed from oEmbed data inside an element.
 *
 * @param {object} data The oEmbed data.
 * @param {HTMLElement} element The element to put the iframe in.
 * @return {HTMLIFrameElement} The iframe embed.
 */

function createEmbed(_ref, element) {
  var html = _ref.html;

  if (!element) {
    throw new TypeError('An element must be provided');
  }

  if (element.getAttribute('data-vimeo-initialized') !== null) {
    return element.querySelector('iframe');
  }

  var div = document.createElement('div');
  div.innerHTML = html;
  element.appendChild(div.firstChild);
  element.setAttribute('data-vimeo-initialized', 'true');
  return element.querySelector('iframe');
}
/**
 * Make an oEmbed call for the specified URL.
 *
 * @param {string} videoUrl The vimeo.com url for the video.
 * @param {Object} [params] Parameters to pass to oEmbed.
 * @param {HTMLElement} element The element.
 * @return {Promise}
 */

function getOEmbedData(videoUrl) {
  var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var element = arguments.length > 2 ? arguments[2] : undefined;
  return new Promise(function (resolve, reject) {
    if (!isVimeoUrl(videoUrl)) {
      throw new TypeError("\u201C".concat(videoUrl, "\u201D is not a vimeo.com url."));
    }

    var url = "https://vimeo.com/api/oembed.json?url=".concat(encodeURIComponent(videoUrl));

    for (var param in params) {
      if (params.hasOwnProperty(param)) {
        url += "&".concat(param, "=").concat(encodeURIComponent(params[param]));
      }
    }

    var xhr = 'XDomainRequest' in window ? new XDomainRequest() : new XMLHttpRequest();
    xhr.open('GET', url, true);

    xhr.onload = function () {
      if (xhr.status === 404) {
        reject(new Error("\u201C".concat(videoUrl, "\u201D was not found.")));
        return;
      }

      if (xhr.status === 403) {
        reject(new Error("\u201C".concat(videoUrl, "\u201D is not embeddable.")));
        return;
      }

      try {
        var json = JSON.parse(xhr.responseText); // Check api response for 403 on oembed

        if (json.domain_status_code === 403) {
          // We still want to create the embed to give users visual feedback
          createEmbed(json, element);
          reject(new Error("\u201C".concat(videoUrl, "\u201D is not embeddable.")));
          return;
        }

        resolve(json);
      } catch (error) {
        reject(error);
      }
    };

    xhr.onerror = function () {
      var status = xhr.status ? " (".concat(xhr.status, ")") : '';
      reject(new Error("There was an error fetching the embed code from Vimeo".concat(status, ".")));
    };

    xhr.send();
  });
}
/**
 * Initialize all embeds within a specific element
 *
 * @param {HTMLElement} [parent=document] The parent element.
 * @return {void}
 */

function initializeEmbeds() {
  var parent = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : document;
  var elements = [].slice.call(parent.querySelectorAll('[data-vimeo-id], [data-vimeo-url]'));

  var handleError = function handleError(error) {
    if ('console' in window && console.error) {
      console.error("There was an error creating an embed: ".concat(error));
    }
  };

  elements.forEach(function (element) {
    try {
      // Skip any that have data-vimeo-defer
      if (element.getAttribute('data-vimeo-defer') !== null) {
        return;
      }

      var params = getOEmbedParameters(element);
      var url = getVimeoUrl(params);
      getOEmbedData(url, params, element).then(function (data) {
        return createEmbed(data, element);
      }).catch(handleError);
    } catch (error) {
      handleError(error);
    }
  });
}
/**
 * Resize embeds when messaged by the player.
 *
 * @param {HTMLElement} [parent=document] The parent element.
 * @return {void}
 */

function resizeEmbeds() {
  var parent = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : document;

  // Prevent execution if users include the player.js script multiple times.
  if (window.VimeoPlayerResizeEmbeds_) {
    return;
  }

  window.VimeoPlayerResizeEmbeds_ = true;

  var onMessage = function onMessage(event) {
    if (!isVimeoUrl(event.origin)) {
      return;
    } // 'spacechange' is fired only on embeds with cards


    if (!event.data || event.data.event !== 'spacechange') {
      return;
    }

    var iframes = parent.querySelectorAll('iframe');

    for (var i = 0; i < iframes.length; i++) {
      if (iframes[i].contentWindow !== event.source) {
        continue;
      } // Change padding-bottom of the enclosing div to accommodate
      // card carousel without distorting aspect ratio


      var space = iframes[i].parentElement;
      space.style.paddingBottom = "".concat(event.data.data[0].bottom, "px");
      break;
    }
  };

  window.addEventListener('message', onMessage);
}

/**
 * @module lib/postmessage
 */
/**
 * Parse a message received from postMessage.
 *
 * @param {*} data The data received from postMessage.
 * @return {object}
 */

function parseMessageData(data) {
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch (error) {
      // If the message cannot be parsed, throw the error as a warning
      console.warn(error);
      return {};
    }
  }

  return data;
}
/**
 * Post a message to the specified target.
 *
 * @param {Player} player The player object to use.
 * @param {string} method The API method to call.
 * @param {object} params The parameters to send to the player.
 * @return {void}
 */

function postMessage(player, method, params) {
  if (!player.element.contentWindow || !player.element.contentWindow.postMessage) {
    return;
  }

  var message = {
    method: method
  };

  if (params !== undefined) {
    message.value = params;
  } // IE 8 and 9 do not support passing messages, so stringify them


  var ieVersion = parseFloat(navigator.userAgent.toLowerCase().replace(/^.*msie (\d+).*$/, '$1'));

  if (ieVersion >= 8 && ieVersion < 10) {
    message = JSON.stringify(message);
  }

  player.element.contentWindow.postMessage(message, player.origin);
}
/**
 * Parse the data received from a message event.
 *
 * @param {Player} player The player that received the message.
 * @param {(Object|string)} data The message data. Strings will be parsed into JSON.
 * @return {void}
 */

function processData(player, data) {
  data = parseMessageData(data);
  var callbacks = [];
  var param;

  if (data.event) {
    if (data.event === 'error') {
      var promises = getCallbacks(player, data.data.method);
      promises.forEach(function (promise) {
        var error = new Error(data.data.message);
        error.name = data.data.name;
        promise.reject(error);
        removeCallback(player, data.data.method, promise);
      });
    }

    callbacks = getCallbacks(player, "event:".concat(data.event));
    param = data.data;
  } else if (data.method) {
    var callback = shiftCallbacks(player, data.method);

    if (callback) {
      callbacks.push(callback);
      param = data.value;
    }
  }

  callbacks.forEach(function (callback) {
    try {
      if (typeof callback === 'function') {
        callback.call(player, param);
        return;
      }

      callback.resolve(param);
    } catch (e) {// empty
    }
  });
}

/* MIT License

Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (sindresorhus.com)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
Terms */
function initializeScreenfull() {
  var fn = function () {
    var val;
    var fnMap = [['requestFullscreen', 'exitFullscreen', 'fullscreenElement', 'fullscreenEnabled', 'fullscreenchange', 'fullscreenerror'], // New WebKit
    ['webkitRequestFullscreen', 'webkitExitFullscreen', 'webkitFullscreenElement', 'webkitFullscreenEnabled', 'webkitfullscreenchange', 'webkitfullscreenerror'], // Old WebKit
    ['webkitRequestFullScreen', 'webkitCancelFullScreen', 'webkitCurrentFullScreenElement', 'webkitCancelFullScreen', 'webkitfullscreenchange', 'webkitfullscreenerror'], ['mozRequestFullScreen', 'mozCancelFullScreen', 'mozFullScreenElement', 'mozFullScreenEnabled', 'mozfullscreenchange', 'mozfullscreenerror'], ['msRequestFullscreen', 'msExitFullscreen', 'msFullscreenElement', 'msFullscreenEnabled', 'MSFullscreenChange', 'MSFullscreenError']];
    var i = 0;
    var l = fnMap.length;
    var ret = {};

    for (; i < l; i++) {
      val = fnMap[i];

      if (val && val[1] in document) {
        for (i = 0; i < val.length; i++) {
          ret[fnMap[0][i]] = val[i];
        }

        return ret;
      }
    }

    return false;
  }();

  var eventNameMap = {
    fullscreenchange: fn.fullscreenchange,
    fullscreenerror: fn.fullscreenerror
  };
  var screenfull = {
    request: function request(element) {
      return new Promise(function (resolve, reject) {
        var onFullScreenEntered = function onFullScreenEntered() {
          screenfull.off('fullscreenchange', onFullScreenEntered);
          resolve();
        };

        screenfull.on('fullscreenchange', onFullScreenEntered);
        element = element || document.documentElement;
        var returnPromise = element[fn.requestFullscreen]();

        if (returnPromise instanceof Promise) {
          returnPromise.then(onFullScreenEntered).catch(reject);
        }
      });
    },
    exit: function exit() {
      return new Promise(function (resolve, reject) {
        if (!screenfull.isFullscreen) {
          resolve();
          return;
        }

        var onFullScreenExit = function onFullScreenExit() {
          screenfull.off('fullscreenchange', onFullScreenExit);
          resolve();
        };

        screenfull.on('fullscreenchange', onFullScreenExit);
        var returnPromise = document[fn.exitFullscreen]();

        if (returnPromise instanceof Promise) {
          returnPromise.then(onFullScreenExit).catch(reject);
        }
      });
    },
    on: function on(event, callback) {
      var eventName = eventNameMap[event];

      if (eventName) {
        document.addEventListener(eventName, callback);
      }
    },
    off: function off(event, callback) {
      var eventName = eventNameMap[event];

      if (eventName) {
        document.removeEventListener(eventName, callback);
      }
    }
  };
  Object.defineProperties(screenfull, {
    isFullscreen: {
      get: function get() {
        return Boolean(document[fn.fullscreenElement]);
      }
    },
    element: {
      enumerable: true,
      get: function get() {
        return document[fn.fullscreenElement];
      }
    },
    isEnabled: {
      enumerable: true,
      get: function get() {
        // Coerce to boolean in case of old WebKit
        return Boolean(document[fn.fullscreenEnabled]);
      }
    }
  });
  return screenfull;
}

var playerMap = new WeakMap();
var readyMap = new WeakMap();
var screenfull = {};

var Player = /*#__PURE__*/function () {
  /**
   * Create a Player.
   *
   * @param {(HTMLIFrameElement|HTMLElement|string|jQuery)} element A reference to the Vimeo
   *        player iframe, and id, or a jQuery object.
   * @param {object} [options] oEmbed parameters to use when creating an embed in the element.
   * @return {Player}
   */
  function Player(element) {
    var _this = this;

    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    _classCallCheck(this, Player);

    /* global jQuery */
    if (window.jQuery && element instanceof jQuery) {
      if (element.length > 1 && window.console && console.warn) {
        console.warn('A jQuery object with multiple elements was passed, using the first element.');
      }

      element = element[0];
    } // Find an element by ID


    if (typeof document !== 'undefined' && typeof element === 'string') {
      element = document.getElementById(element);
    } // Not an element!


    if (!isDomElement(element)) {
      throw new TypeError('You must pass either a valid element or a valid id.');
    } // Already initialized an embed in this div, so grab the iframe


    if (element.nodeName !== 'IFRAME') {
      var iframe = element.querySelector('iframe');

      if (iframe) {
        element = iframe;
      }
    } // iframe url is not a Vimeo url


    if (element.nodeName === 'IFRAME' && !isVimeoUrl(element.getAttribute('src') || '')) {
      throw new Error('The player element passed isn’t a Vimeo embed.');
    } // If there is already a player object in the map, return that


    if (playerMap.has(element)) {
      return playerMap.get(element);
    }

    this._window = element.ownerDocument.defaultView;
    this.element = element;
    this.origin = '*';
    var readyPromise = new npo_src(function (resolve, reject) {
      _this._onMessage = function (event) {
        if (!isVimeoUrl(event.origin) || _this.element.contentWindow !== event.source) {
          return;
        }

        if (_this.origin === '*') {
          _this.origin = event.origin;
        }

        var data = parseMessageData(event.data);
        var isError = data && data.event === 'error';
        var isReadyError = isError && data.data && data.data.method === 'ready';

        if (isReadyError) {
          var error = new Error(data.data.message);
          error.name = data.data.name;
          reject(error);
          return;
        }

        var isReadyEvent = data && data.event === 'ready';
        var isPingResponse = data && data.method === 'ping';

        if (isReadyEvent || isPingResponse) {
          _this.element.setAttribute('data-ready', 'true');

          resolve();
          return;
        }

        processData(_this, data);
      };

      _this._window.addEventListener('message', _this._onMessage);

      if (_this.element.nodeName !== 'IFRAME') {
        var params = getOEmbedParameters(element, options);
        var url = getVimeoUrl(params);
        getOEmbedData(url, params, element).then(function (data) {
          var iframe = createEmbed(data, element); // Overwrite element with the new iframe,
          // but store reference to the original element

          _this.element = iframe;
          _this._originalElement = element;
          swapCallbacks(element, iframe);
          playerMap.set(_this.element, _this);
          return data;
        }).catch(reject);
      }
    }); // Store a copy of this Player in the map

    readyMap.set(this, readyPromise);
    playerMap.set(this.element, this); // Send a ping to the iframe so the ready promise will be resolved if
    // the player is already ready.

    if (this.element.nodeName === 'IFRAME') {
      postMessage(this, 'ping');
    }

    if (screenfull.isEnabled) {
      var exitFullscreen = function exitFullscreen() {
        return screenfull.exit();
      };

      this.fullscreenchangeHandler = function () {
        if (screenfull.isFullscreen) {
          storeCallback(_this, 'event:exitFullscreen', exitFullscreen);
        } else {
          removeCallback(_this, 'event:exitFullscreen', exitFullscreen);
        } // eslint-disable-next-line


        _this.ready().then(function () {
          postMessage(_this, 'fullscreenchange', screenfull.isFullscreen);
        });
      };

      screenfull.on('fullscreenchange', this.fullscreenchangeHandler);
    }

    return this;
  }
  /**
   * Get a promise for a method.
   *
   * @param {string} name The API method to call.
   * @param {Object} [args={}] Arguments to send via postMessage.
   * @return {Promise}
   */


  _createClass(Player, [{
    key: "callMethod",
    value: function callMethod(name) {
      var _this2 = this;

      var args = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      return new npo_src(function (resolve, reject) {
        // We are storing the resolve/reject handlers to call later, so we
        // can’t return here.
        // eslint-disable-next-line promise/always-return
        return _this2.ready().then(function () {
          storeCallback(_this2, name, {
            resolve: resolve,
            reject: reject
          });
          postMessage(_this2, name, args);
        }).catch(reject);
      });
    }
    /**
     * Get a promise for the value of a player property.
     *
     * @param {string} name The property name
     * @return {Promise}
     */

  }, {
    key: "get",
    value: function get(name) {
      var _this3 = this;

      return new npo_src(function (resolve, reject) {
        name = getMethodName(name, 'get'); // We are storing the resolve/reject handlers to call later, so we
        // can’t return here.
        // eslint-disable-next-line promise/always-return

        return _this3.ready().then(function () {
          storeCallback(_this3, name, {
            resolve: resolve,
            reject: reject
          });
          postMessage(_this3, name);
        }).catch(reject);
      });
    }
    /**
     * Get a promise for setting the value of a player property.
     *
     * @param {string} name The API method to call.
     * @param {mixed} value The value to set.
     * @return {Promise}
     */

  }, {
    key: "set",
    value: function set(name, value) {
      var _this4 = this;

      return new npo_src(function (resolve, reject) {
        name = getMethodName(name, 'set');

        if (value === undefined || value === null) {
          throw new TypeError('There must be a value to set.');
        } // We are storing the resolve/reject handlers to call later, so we
        // can’t return here.
        // eslint-disable-next-line promise/always-return


        return _this4.ready().then(function () {
          storeCallback(_this4, name, {
            resolve: resolve,
            reject: reject
          });
          postMessage(_this4, name, value);
        }).catch(reject);
      });
    }
    /**
     * Add an event listener for the specified event. Will call the
     * callback with a single parameter, `data`, that contains the data for
     * that event.
     *
     * @param {string} eventName The name of the event.
     * @param {function(*)} callback The function to call when the event fires.
     * @return {void}
     */

  }, {
    key: "on",
    value: function on(eventName, callback) {
      if (!eventName) {
        throw new TypeError('You must pass an event name.');
      }

      if (!callback) {
        throw new TypeError('You must pass a callback function.');
      }

      if (typeof callback !== 'function') {
        throw new TypeError('The callback must be a function.');
      }

      var callbacks = getCallbacks(this, "event:".concat(eventName));

      if (callbacks.length === 0) {
        this.callMethod('addEventListener', eventName).catch(function () {// Ignore the error. There will be an error event fired that
          // will trigger the error callback if they are listening.
        });
      }

      storeCallback(this, "event:".concat(eventName), callback);
    }
    /**
     * Remove an event listener for the specified event. Will remove all
     * listeners for that event if a `callback` isn’t passed, or only that
     * specific callback if it is passed.
     *
     * @param {string} eventName The name of the event.
     * @param {function} [callback] The specific callback to remove.
     * @return {void}
     */

  }, {
    key: "off",
    value: function off(eventName, callback) {
      if (!eventName) {
        throw new TypeError('You must pass an event name.');
      }

      if (callback && typeof callback !== 'function') {
        throw new TypeError('The callback must be a function.');
      }

      var lastCallback = removeCallback(this, "event:".concat(eventName), callback); // If there are no callbacks left, remove the listener

      if (lastCallback) {
        this.callMethod('removeEventListener', eventName).catch(function (e) {// Ignore the error. There will be an error event fired that
          // will trigger the error callback if they are listening.
        });
      }
    }
    /**
     * A promise to load a new video.
     *
     * @promise LoadVideoPromise
     * @fulfill {number} The video with this id or url successfully loaded.
     * @reject {TypeError} The id was not a number.
     */

    /**
     * Load a new video into this embed. The promise will be resolved if
     * the video is successfully loaded, or it will be rejected if it could
     * not be loaded.
     *
     * @param {number|string|object} options The id of the video, the url of the video, or an object with embed options.
     * @return {LoadVideoPromise}
     */

  }, {
    key: "loadVideo",
    value: function loadVideo(options) {
      return this.callMethod('loadVideo', options);
    }
    /**
     * A promise to perform an action when the Player is ready.
     *
     * @todo document errors
     * @promise LoadVideoPromise
     * @fulfill {void}
     */

    /**
     * Trigger a function when the player iframe has initialized. You do not
     * need to wait for `ready` to trigger to begin adding event listeners
     * or calling other methods.
     *
     * @return {ReadyPromise}
     */

  }, {
    key: "ready",
    value: function ready() {
      var readyPromise = readyMap.get(this) || new npo_src(function (resolve, reject) {
        reject(new Error('Unknown player. Probably unloaded.'));
      });
      return npo_src.resolve(readyPromise);
    }
    /**
     * A promise to add a cue point to the player.
     *
     * @promise AddCuePointPromise
     * @fulfill {string} The id of the cue point to use for removeCuePoint.
     * @reject {RangeError} the time was less than 0 or greater than the
     *         video’s duration.
     * @reject {UnsupportedError} Cue points are not supported with the current
     *         player or browser.
     */

    /**
     * Add a cue point to the player.
     *
     * @param {number} time The time for the cue point.
     * @param {object} [data] Arbitrary data to be returned with the cue point.
     * @return {AddCuePointPromise}
     */

  }, {
    key: "addCuePoint",
    value: function addCuePoint(time) {
      var data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      return this.callMethod('addCuePoint', {
        time: time,
        data: data
      });
    }
    /**
     * A promise to remove a cue point from the player.
     *
     * @promise AddCuePointPromise
     * @fulfill {string} The id of the cue point that was removed.
     * @reject {InvalidCuePoint} The cue point with the specified id was not
     *         found.
     * @reject {UnsupportedError} Cue points are not supported with the current
     *         player or browser.
     */

    /**
     * Remove a cue point from the video.
     *
     * @param {string} id The id of the cue point to remove.
     * @return {RemoveCuePointPromise}
     */

  }, {
    key: "removeCuePoint",
    value: function removeCuePoint(id) {
      return this.callMethod('removeCuePoint', id);
    }
    /**
     * A representation of a text track on a video.
     *
     * @typedef {Object} VimeoTextTrack
     * @property {string} language The ISO language code.
     * @property {string} kind The kind of track it is (captions or subtitles).
     * @property {string} label The human‐readable label for the track.
     */

    /**
     * A promise to enable a text track.
     *
     * @promise EnableTextTrackPromise
     * @fulfill {VimeoTextTrack} The text track that was enabled.
     * @reject {InvalidTrackLanguageError} No track was available with the
     *         specified language.
     * @reject {InvalidTrackError} No track was available with the specified
     *         language and kind.
     */

    /**
     * Enable the text track with the specified language, and optionally the
     * specified kind (captions or subtitles).
     *
     * When set via the API, the track language will not change the viewer’s
     * stored preference.
     *
     * @param {string} language The two‐letter language code.
     * @param {string} [kind] The kind of track to enable (captions or subtitles).
     * @return {EnableTextTrackPromise}
     */

  }, {
    key: "enableTextTrack",
    value: function enableTextTrack(language, kind) {
      if (!language) {
        throw new TypeError('You must pass a language.');
      }

      return this.callMethod('enableTextTrack', {
        language: language,
        kind: kind
      });
    }
    /**
     * A promise to disable the active text track.
     *
     * @promise DisableTextTrackPromise
     * @fulfill {void} The track was disabled.
     */

    /**
     * Disable the currently-active text track.
     *
     * @return {DisableTextTrackPromise}
     */

  }, {
    key: "disableTextTrack",
    value: function disableTextTrack() {
      return this.callMethod('disableTextTrack');
    }
    /**
     * A promise to pause the video.
     *
     * @promise PausePromise
     * @fulfill {void} The video was paused.
     */

    /**
     * Pause the video if it’s playing.
     *
     * @return {PausePromise}
     */

  }, {
    key: "pause",
    value: function pause() {
      return this.callMethod('pause');
    }
    /**
     * A promise to play the video.
     *
     * @promise PlayPromise
     * @fulfill {void} The video was played.
     */

    /**
     * Play the video if it’s paused. **Note:** on iOS and some other
     * mobile devices, you cannot programmatically trigger play. Once the
     * viewer has tapped on the play button in the player, however, you
     * will be able to use this function.
     *
     * @return {PlayPromise}
     */

  }, {
    key: "play",
    value: function play() {
      return this.callMethod('play');
    }
    /**
     * Request that the player enters fullscreen.
     * @return {Promise}
     */

  }, {
    key: "requestFullscreen",
    value: function requestFullscreen() {
      if (screenfull.isEnabled) {
        return screenfull.request(this.element);
      }

      return this.callMethod('requestFullscreen');
    }
    /**
     * Request that the player exits fullscreen.
     * @return {Promise}
     */

  }, {
    key: "exitFullscreen",
    value: function exitFullscreen() {
      if (screenfull.isEnabled) {
        return screenfull.exit();
      }

      return this.callMethod('exitFullscreen');
    }
    /**
     * Returns true if the player is currently fullscreen.
     * @return {Promise}
     */

  }, {
    key: "getFullscreen",
    value: function getFullscreen() {
      if (screenfull.isEnabled) {
        return npo_src.resolve(screenfull.isFullscreen);
      }

      return this.get('fullscreen');
    }
    /**
     * Request that the player enters picture-in-picture.
     * @return {Promise}
     */

  }, {
    key: "requestPictureInPicture",
    value: function requestPictureInPicture() {
      return this.callMethod('requestPictureInPicture');
    }
    /**
     * Request that the player exits picture-in-picture.
     * @return {Promise}
     */

  }, {
    key: "exitPictureInPicture",
    value: function exitPictureInPicture() {
      return this.callMethod('exitPictureInPicture');
    }
    /**
     * Returns true if the player is currently picture-in-picture.
     * @return {Promise}
     */

  }, {
    key: "getPictureInPicture",
    value: function getPictureInPicture() {
      return this.get('pictureInPicture');
    }
    /**
     * A promise to unload the video.
     *
     * @promise UnloadPromise
     * @fulfill {void} The video was unloaded.
     */

    /**
     * Return the player to its initial state.
     *
     * @return {UnloadPromise}
     */

  }, {
    key: "unload",
    value: function unload() {
      return this.callMethod('unload');
    }
    /**
     * Cleanup the player and remove it from the DOM
     *
     * It won't be usable and a new one should be constructed
     *  in order to do any operations.
     *
     * @return {Promise}
     */

  }, {
    key: "destroy",
    value: function destroy() {
      var _this5 = this;

      return new npo_src(function (resolve) {
        readyMap.delete(_this5);
        playerMap.delete(_this5.element);

        if (_this5._originalElement) {
          playerMap.delete(_this5._originalElement);

          _this5._originalElement.removeAttribute('data-vimeo-initialized');
        }

        if (_this5.element && _this5.element.nodeName === 'IFRAME' && _this5.element.parentNode) {
          // If we've added an additional wrapper div, remove that from the DOM.
          // If not, just remove the iframe element.
          if (_this5.element.parentNode.parentNode && _this5._originalElement && _this5._originalElement !== _this5.element.parentNode) {
            _this5.element.parentNode.parentNode.removeChild(_this5.element.parentNode);
          } else {
            _this5.element.parentNode.removeChild(_this5.element);
          }
        } // If the clip is private there is a case where the element stays the
        // div element. Destroy should reset the div and remove the iframe child.


        if (_this5.element && _this5.element.nodeName === 'DIV' && _this5.element.parentNode) {
          _this5.element.removeAttribute('data-vimeo-initialized');

          var iframe = _this5.element.querySelector('iframe');

          if (iframe && iframe.parentNode) {
            // If we've added an additional wrapper div, remove that from the DOM.
            // If not, just remove the iframe element.
            if (iframe.parentNode.parentNode && _this5._originalElement && _this5._originalElement !== iframe.parentNode) {
              iframe.parentNode.parentNode.removeChild(iframe.parentNode);
            } else {
              iframe.parentNode.removeChild(iframe);
            }
          }
        }

        _this5._window.removeEventListener('message', _this5._onMessage);

        if (screenfull.isEnabled) {
          screenfull.off('fullscreenchange', _this5.fullscreenchangeHandler);
        }

        resolve();
      });
    }
    /**
     * A promise to get the autopause behavior of the video.
     *
     * @promise GetAutopausePromise
     * @fulfill {boolean} Whether autopause is turned on or off.
     * @reject {UnsupportedError} Autopause is not supported with the current
     *         player or browser.
     */

    /**
     * Get the autopause behavior for this player.
     *
     * @return {GetAutopausePromise}
     */

  }, {
    key: "getAutopause",
    value: function getAutopause() {
      return this.get('autopause');
    }
    /**
     * A promise to set the autopause behavior of the video.
     *
     * @promise SetAutopausePromise
     * @fulfill {boolean} Whether autopause is turned on or off.
     * @reject {UnsupportedError} Autopause is not supported with the current
     *         player or browser.
     */

    /**
     * Enable or disable the autopause behavior of this player.
     *
     * By default, when another video is played in the same browser, this
     * player will automatically pause. Unless you have a specific reason
     * for doing so, we recommend that you leave autopause set to the
     * default (`true`).
     *
     * @param {boolean} autopause
     * @return {SetAutopausePromise}
     */

  }, {
    key: "setAutopause",
    value: function setAutopause(autopause) {
      return this.set('autopause', autopause);
    }
    /**
     * A promise to get the buffered property of the video.
     *
     * @promise GetBufferedPromise
     * @fulfill {Array} Buffered Timeranges converted to an Array.
     */

    /**
     * Get the buffered property of the video.
     *
     * @return {GetBufferedPromise}
     */

  }, {
    key: "getBuffered",
    value: function getBuffered() {
      return this.get('buffered');
    }
    /**
     * @typedef {Object} CameraProperties
     * @prop {number} props.yaw - Number between 0 and 360.
     * @prop {number} props.pitch - Number between -90 and 90.
     * @prop {number} props.roll - Number between -180 and 180.
     * @prop {number} props.fov - The field of view in degrees.
     */

    /**
     * A promise to get the camera properties of the player.
     *
     * @promise GetCameraPromise
     * @fulfill {CameraProperties} The camera properties.
     */

    /**
     * For 360° videos get the camera properties for this player.
     *
     * @return {GetCameraPromise}
     */

  }, {
    key: "getCameraProps",
    value: function getCameraProps() {
      return this.get('cameraProps');
    }
    /**
     * A promise to set the camera properties of the player.
     *
     * @promise SetCameraPromise
     * @fulfill {Object} The camera was successfully set.
     * @reject {RangeError} The range was out of bounds.
     */

    /**
     * For 360° videos set the camera properties for this player.
     *
     * @param {CameraProperties} camera The camera properties
     * @return {SetCameraPromise}
     */

  }, {
    key: "setCameraProps",
    value: function setCameraProps(camera) {
      return this.set('cameraProps', camera);
    }
    /**
     * A representation of a chapter.
     *
     * @typedef {Object} VimeoChapter
     * @property {number} startTime The start time of the chapter.
     * @property {object} title The title of the chapter.
     * @property {number} index The place in the order of Chapters. Starts at 1.
     */

    /**
     * A promise to get chapters for the video.
     *
     * @promise GetChaptersPromise
     * @fulfill {VimeoChapter[]} The chapters for the video.
     */

    /**
     * Get an array of all the chapters for the video.
     *
     * @return {GetChaptersPromise}
     */

  }, {
    key: "getChapters",
    value: function getChapters() {
      return this.get('chapters');
    }
    /**
     * A promise to get the currently active chapter.
     *
     * @promise GetCurrentChaptersPromise
     * @fulfill {VimeoChapter|undefined} The current chapter for the video.
     */

    /**
     * Get the currently active chapter for the video.
     *
     * @return {GetCurrentChaptersPromise}
     */

  }, {
    key: "getCurrentChapter",
    value: function getCurrentChapter() {
      return this.get('currentChapter');
    }
    /**
     * A promise to get the color of the player.
     *
     * @promise GetColorPromise
     * @fulfill {string} The hex color of the player.
     */

    /**
     * Get the color for this player.
     *
     * @return {GetColorPromise}
     */

  }, {
    key: "getColor",
    value: function getColor() {
      return this.get('color');
    }
    /**
     * A promise to set the color of the player.
     *
     * @promise SetColorPromise
     * @fulfill {string} The color was successfully set.
     * @reject {TypeError} The string was not a valid hex or rgb color.
     * @reject {ContrastError} The color was set, but the contrast is
     *         outside of the acceptable range.
     * @reject {EmbedSettingsError} The owner of the player has chosen to
     *         use a specific color.
     */

    /**
     * Set the color of this player to a hex or rgb string. Setting the
     * color may fail if the owner of the video has set their embed
     * preferences to force a specific color.
     *
     * @param {string} color The hex or rgb color string to set.
     * @return {SetColorPromise}
     */

  }, {
    key: "setColor",
    value: function setColor(color) {
      return this.set('color', color);
    }
    /**
     * A representation of a cue point.
     *
     * @typedef {Object} VimeoCuePoint
     * @property {number} time The time of the cue point.
     * @property {object} data The data passed when adding the cue point.
     * @property {string} id The unique id for use with removeCuePoint.
     */

    /**
     * A promise to get the cue points of a video.
     *
     * @promise GetCuePointsPromise
     * @fulfill {VimeoCuePoint[]} The cue points added to the video.
     * @reject {UnsupportedError} Cue points are not supported with the current
     *         player or browser.
     */

    /**
     * Get an array of the cue points added to the video.
     *
     * @return {GetCuePointsPromise}
     */

  }, {
    key: "getCuePoints",
    value: function getCuePoints() {
      return this.get('cuePoints');
    }
    /**
     * A promise to get the current time of the video.
     *
     * @promise GetCurrentTimePromise
     * @fulfill {number} The current time in seconds.
     */

    /**
     * Get the current playback position in seconds.
     *
     * @return {GetCurrentTimePromise}
     */

  }, {
    key: "getCurrentTime",
    value: function getCurrentTime() {
      return this.get('currentTime');
    }
    /**
     * A promise to set the current time of the video.
     *
     * @promise SetCurrentTimePromise
     * @fulfill {number} The actual current time that was set.
     * @reject {RangeError} the time was less than 0 or greater than the
     *         video’s duration.
     */

    /**
     * Set the current playback position in seconds. If the player was
     * paused, it will remain paused. Likewise, if the player was playing,
     * it will resume playing once the video has buffered.
     *
     * You can provide an accurate time and the player will attempt to seek
     * to as close to that time as possible. The exact time will be the
     * fulfilled value of the promise.
     *
     * @param {number} currentTime
     * @return {SetCurrentTimePromise}
     */

  }, {
    key: "setCurrentTime",
    value: function setCurrentTime(currentTime) {
      return this.set('currentTime', currentTime);
    }
    /**
     * A promise to get the duration of the video.
     *
     * @promise GetDurationPromise
     * @fulfill {number} The duration in seconds.
     */

    /**
     * Get the duration of the video in seconds. It will be rounded to the
     * nearest second before playback begins, and to the nearest thousandth
     * of a second after playback begins.
     *
     * @return {GetDurationPromise}
     */

  }, {
    key: "getDuration",
    value: function getDuration() {
      return this.get('duration');
    }
    /**
     * A promise to get the ended state of the video.
     *
     * @promise GetEndedPromise
     * @fulfill {boolean} Whether or not the video has ended.
     */

    /**
     * Get the ended state of the video. The video has ended if
     * `currentTime === duration`.
     *
     * @return {GetEndedPromise}
     */

  }, {
    key: "getEnded",
    value: function getEnded() {
      return this.get('ended');
    }
    /**
     * A promise to get the loop state of the player.
     *
     * @promise GetLoopPromise
     * @fulfill {boolean} Whether or not the player is set to loop.
     */

    /**
     * Get the loop state of the player.
     *
     * @return {GetLoopPromise}
     */

  }, {
    key: "getLoop",
    value: function getLoop() {
      return this.get('loop');
    }
    /**
     * A promise to set the loop state of the player.
     *
     * @promise SetLoopPromise
     * @fulfill {boolean} The loop state that was set.
     */

    /**
     * Set the loop state of the player. When set to `true`, the player
     * will start over immediately once playback ends.
     *
     * @param {boolean} loop
     * @return {SetLoopPromise}
     */

  }, {
    key: "setLoop",
    value: function setLoop(loop) {
      return this.set('loop', loop);
    }
    /**
     * A promise to set the muted state of the player.
     *
     * @promise SetMutedPromise
     * @fulfill {boolean} The muted state that was set.
     */

    /**
     * Set the muted state of the player. When set to `true`, the player
     * volume will be muted.
     *
     * @param {boolean} muted
     * @return {SetMutedPromise}
     */

  }, {
    key: "setMuted",
    value: function setMuted(muted) {
      return this.set('muted', muted);
    }
    /**
     * A promise to get the muted state of the player.
     *
     * @promise GetMutedPromise
     * @fulfill {boolean} Whether or not the player is muted.
     */

    /**
     * Get the muted state of the player.
     *
     * @return {GetMutedPromise}
     */

  }, {
    key: "getMuted",
    value: function getMuted() {
      return this.get('muted');
    }
    /**
     * A promise to get the paused state of the player.
     *
     * @promise GetLoopPromise
     * @fulfill {boolean} Whether or not the video is paused.
     */

    /**
     * Get the paused state of the player.
     *
     * @return {GetLoopPromise}
     */

  }, {
    key: "getPaused",
    value: function getPaused() {
      return this.get('paused');
    }
    /**
     * A promise to get the playback rate of the player.
     *
     * @promise GetPlaybackRatePromise
     * @fulfill {number} The playback rate of the player on a scale from 0.5 to 2.
     */

    /**
     * Get the playback rate of the player on a scale from `0.5` to `2`.
     *
     * @return {GetPlaybackRatePromise}
     */

  }, {
    key: "getPlaybackRate",
    value: function getPlaybackRate() {
      return this.get('playbackRate');
    }
    /**
     * A promise to set the playbackrate of the player.
     *
     * @promise SetPlaybackRatePromise
     * @fulfill {number} The playback rate was set.
     * @reject {RangeError} The playback rate was less than 0.5 or greater than 2.
     */

    /**
     * Set the playback rate of the player on a scale from `0.5` to `2`. When set
     * via the API, the playback rate will not be synchronized to other
     * players or stored as the viewer's preference.
     *
     * @param {number} playbackRate
     * @return {SetPlaybackRatePromise}
     */

  }, {
    key: "setPlaybackRate",
    value: function setPlaybackRate(playbackRate) {
      return this.set('playbackRate', playbackRate);
    }
    /**
     * A promise to get the played property of the video.
     *
     * @promise GetPlayedPromise
     * @fulfill {Array} Played Timeranges converted to an Array.
     */

    /**
     * Get the played property of the video.
     *
     * @return {GetPlayedPromise}
     */

  }, {
    key: "getPlayed",
    value: function getPlayed() {
      return this.get('played');
    }
    /**
     * A promise to get the qualities available of the current video.
     *
     * @promise GetQualitiesPromise
     * @fulfill {Array} The qualities of the video.
     */

    /**
     * Get the qualities of the current video.
     *
     * @return {GetQualitiesPromise}
     */

  }, {
    key: "getQualities",
    value: function getQualities() {
      return this.get('qualities');
    }
    /**
     * A promise to get the current set quality of the video.
     *
     * @promise GetQualityPromise
     * @fulfill {string} The current set quality.
     */

    /**
     * Get the current set quality of the video.
     *
     * @return {GetQualityPromise}
     */

  }, {
    key: "getQuality",
    value: function getQuality() {
      return this.get('quality');
    }
    /**
     * A promise to set the video quality.
     *
     * @promise SetQualityPromise
     * @fulfill {number} The quality was set.
     * @reject {RangeError} The quality is not available.
     */

    /**
     * Set a video quality.
     *
     * @param {string} quality
     * @return {SetQualityPromise}
     */

  }, {
    key: "setQuality",
    value: function setQuality(quality) {
      return this.set('quality', quality);
    }
    /**
     * A promise to get the seekable property of the video.
     *
     * @promise GetSeekablePromise
     * @fulfill {Array} Seekable Timeranges converted to an Array.
     */

    /**
     * Get the seekable property of the video.
     *
     * @return {GetSeekablePromise}
     */

  }, {
    key: "getSeekable",
    value: function getSeekable() {
      return this.get('seekable');
    }
    /**
     * A promise to get the seeking property of the player.
     *
     * @promise GetSeekingPromise
     * @fulfill {boolean} Whether or not the player is currently seeking.
     */

    /**
     * Get if the player is currently seeking.
     *
     * @return {GetSeekingPromise}
     */

  }, {
    key: "getSeeking",
    value: function getSeeking() {
      return this.get('seeking');
    }
    /**
     * A promise to get the text tracks of a video.
     *
     * @promise GetTextTracksPromise
     * @fulfill {VimeoTextTrack[]} The text tracks associated with the video.
     */

    /**
     * Get an array of the text tracks that exist for the video.
     *
     * @return {GetTextTracksPromise}
     */

  }, {
    key: "getTextTracks",
    value: function getTextTracks() {
      return this.get('textTracks');
    }
    /**
     * A promise to get the embed code for the video.
     *
     * @promise GetVideoEmbedCodePromise
     * @fulfill {string} The `<iframe>` embed code for the video.
     */

    /**
     * Get the `<iframe>` embed code for the video.
     *
     * @return {GetVideoEmbedCodePromise}
     */

  }, {
    key: "getVideoEmbedCode",
    value: function getVideoEmbedCode() {
      return this.get('videoEmbedCode');
    }
    /**
     * A promise to get the id of the video.
     *
     * @promise GetVideoIdPromise
     * @fulfill {number} The id of the video.
     */

    /**
     * Get the id of the video.
     *
     * @return {GetVideoIdPromise}
     */

  }, {
    key: "getVideoId",
    value: function getVideoId() {
      return this.get('videoId');
    }
    /**
     * A promise to get the title of the video.
     *
     * @promise GetVideoTitlePromise
     * @fulfill {number} The title of the video.
     */

    /**
     * Get the title of the video.
     *
     * @return {GetVideoTitlePromise}
     */

  }, {
    key: "getVideoTitle",
    value: function getVideoTitle() {
      return this.get('videoTitle');
    }
    /**
     * A promise to get the native width of the video.
     *
     * @promise GetVideoWidthPromise
     * @fulfill {number} The native width of the video.
     */

    /**
     * Get the native width of the currently‐playing video. The width of
     * the highest‐resolution available will be used before playback begins.
     *
     * @return {GetVideoWidthPromise}
     */

  }, {
    key: "getVideoWidth",
    value: function getVideoWidth() {
      return this.get('videoWidth');
    }
    /**
     * A promise to get the native height of the video.
     *
     * @promise GetVideoHeightPromise
     * @fulfill {number} The native height of the video.
     */

    /**
     * Get the native height of the currently‐playing video. The height of
     * the highest‐resolution available will be used before playback begins.
     *
     * @return {GetVideoHeightPromise}
     */

  }, {
    key: "getVideoHeight",
    value: function getVideoHeight() {
      return this.get('videoHeight');
    }
    /**
     * A promise to get the vimeo.com url for the video.
     *
     * @promise GetVideoUrlPromise
     * @fulfill {number} The vimeo.com url for the video.
     * @reject {PrivacyError} The url isn’t available because of the video’s privacy setting.
     */

    /**
     * Get the vimeo.com url for the video.
     *
     * @return {GetVideoUrlPromise}
     */

  }, {
    key: "getVideoUrl",
    value: function getVideoUrl() {
      return this.get('videoUrl');
    }
    /**
     * A promise to get the volume level of the player.
     *
     * @promise GetVolumePromise
     * @fulfill {number} The volume level of the player on a scale from 0 to 1.
     */

    /**
     * Get the current volume level of the player on a scale from `0` to `1`.
     *
     * Most mobile devices do not support an independent volume from the
     * system volume. In those cases, this method will always return `1`.
     *
     * @return {GetVolumePromise}
     */

  }, {
    key: "getVolume",
    value: function getVolume() {
      return this.get('volume');
    }
    /**
     * A promise to set the volume level of the player.
     *
     * @promise SetVolumePromise
     * @fulfill {number} The volume was set.
     * @reject {RangeError} The volume was less than 0 or greater than 1.
     */

    /**
     * Set the volume of the player on a scale from `0` to `1`. When set
     * via the API, the volume level will not be synchronized to other
     * players or stored as the viewer’s preference.
     *
     * Most mobile devices do not support setting the volume. An error will
     * *not* be triggered in that situation.
     *
     * @param {number} volume
     * @return {SetVolumePromise}
     */

  }, {
    key: "setVolume",
    value: function setVolume(volume) {
      return this.set('volume', volume);
    }
  }]);

  return Player;
}(); // Setup embed only if this is not a node environment


if (!isNode) {
  screenfull = initializeScreenfull();
  initializeEmbeds();
  resizeEmbeds();
}

function Video(a$1,n){void 0===n&&(n={});var u,r=n.id,d=n.playerEl,p=n.type;if(r&&p){var y=a(),f=y.on,l=y.emit;return "youtube"===p?((u=t$2(d)).loadVideoById({videoId:r,suggestedQuality:"large"}),u.stopVideo(),u.on("stateChange",function(e){1===e.data?l("play"):2===e.data&&l("pause");}),u.on("ready",function(){l("ready"),m();})):"vimeo"===p&&((u=new Player(d,{id:r})).on("play",function(){return l("play")}),u.on("pause",function(){return l("pause")}),u.ready().then(function(){l("ready"),m();})),{destroy:function(){},on:f,pause:function(){"youtube"===p?u.pauseVideo():"vimeo"===p&&u.pause();},play:function(){"youtube"===p?u.playVideo():"vimeo"===p&&u.play();}}}function m(){var o=n$3("iframe",a$1),t=o.height/o.width*100,i=o.parentNode;o.height="100%",o.width="100%","youtube"===p?i.style.paddingTop=t+"%":"vimeo"===p&&(i.parentNode.style.paddingTop=t+"%"),l("resized");}}

var selectors$e = {
  overlay: '.video__overlay',
  player: '.video__player',
  button: '[data-video-trigger]',
  wrapper: '.video__wrapper'
};
register('video', {
  videoType: null,
  videoPlayer: null,

  onLoad() {
    this._initPlayer();

    this.scrollAnimation = scrollIntoView(this.container);
  },

  _initPlayer() {
    var {
      videoId,
      videoType
    } = this.container.dataset;
    if (!videoId || !videoType) return;
    var overlay = this.container.querySelector(selectors$e.overlay);
    var player = this.container.querySelector(selectors$e.player);
    this.button = this.container.querySelector(selectors$e.button);
    this.video = Video(this.container, {
      id: videoId,
      type: videoType,
      playerEl: player
    });
    this.video.on('play', () => {
      overlay.classList.remove('visible');
    });
    this.button && this.button.addEventListener('click', this._playVideo.bind(this));
  },

  _playVideo(e) {
    e.preventDefault();
    this.video.play();
  },

  onUnload() {
    this.video && this.video.destroy();
    this.button && this.button.removeEventListener('click', this.video.play);
    this.scrollAnimation.unload();
  }

});

var slideshowOpts = {
  prevNextButtons: false,
  adaptiveHeight: false,
  pauseAutoPlayOnHover: false,
  wrapAround: true,
  pageDots: false,
  cellAlign: 'center',
  draggable: false,
  fade: true
};
register('quote', {
  listeners: [],

  onLoad() {
    var {
      timer
    } = this.container.dataset;
    slideshowOpts.autoPlay = parseInt(timer);
    var quoteContainer = n$3('.quote__container', this.container);
    this.slideshow = new Flickity(quoteContainer, slideshowOpts);
    this.scrollAnimation = scrollIntoView(this.container);

    this._initNavigation();
  },

  _initNavigation() {
    var navNextButton = n$3('.carousel__next-button', this.container);
    var navPrevButton = n$3('.carousel__previous-button', this.container);
    this.listeners.push(e$3(navPrevButton, 'click', () => this.slideshow.previous()));
    this.listeners.push(e$3(navNextButton, 'click', () => this.slideshow.next()));
  },

  onBlockSelect(_ref) {
    var {
      target: slide
    } = _ref;
    this.slideshow.select(slide.dataset.index);
    this.slideshow.pausePlayer();
  },

  onBlockDeselect() {
    this.slideshow.unpausePlayer();
  },

  onUnload() {
    this.slideshow.destroy();
    this.scrollAnimation.unload();
    this.listeners.forEach(unsub => unsub());
  }

});

var selectors$d = {
  carouselContainer: '.gallery__slides',
  animatedSlides: '.animates'
};
register('gallery', {
  onLoad() {
    this.animatedSlides = this.container.querySelectorAll(selectors$d.animatedSlides);
    this.carouselContainer = this.container.querySelector(selectors$d.carouselContainer);
    this.carousel = carousel(this.container);

    if (this.animatedSlides.length) {
      this._initScrollAnimation(orderCarouselItems(this.container, this.animatedSlides));
    }
  },

  _initScrollAnimation(items) {
    var {
      textPosition
    } = this.container.dataset; // If the caorusle is inline the animation needs to delay
    // to account for text-block fade in.

    var animationDelay = textPosition === 'top' ? 0 : 750;
    this.scrollAnimation = scrollIntoView(this.container, items, animationDelay);
  },

  onBlockSelect(_ref) {
    var {
      target: slide
    } = _ref;
    this.carousel.goToSlide(slide.dataset.index);
  },

  onUnload() {
    this.carousel.unload();

    if (this.animatedSlides.length) {
      this.scrollAnimation.unload();
    }
  }

});

var Google = {exports: {}};

(function (module, exports) {
(function(root, factory) {

	if (root === null) {
		throw new Error('Google-maps package can be used only in browser');
	}

	{
		module.exports = factory();
	}

})(typeof window !== 'undefined' ? window : null, function() {


	var googleVersion = '3.31';

	var script = null;

	var google = null;

	var loading = false;

	var callbacks = [];

	var onLoadEvents = [];

	var originalCreateLoaderMethod = null;


	var GoogleMapsLoader = {};


	GoogleMapsLoader.URL = 'https://maps.googleapis.com/maps/api/js';

	GoogleMapsLoader.KEY = null;

	GoogleMapsLoader.LIBRARIES = [];

	GoogleMapsLoader.CLIENT = null;

	GoogleMapsLoader.CHANNEL = null;

	GoogleMapsLoader.LANGUAGE = null;

	GoogleMapsLoader.REGION = null;

	GoogleMapsLoader.VERSION = googleVersion;

	GoogleMapsLoader.WINDOW_CALLBACK_NAME = '__google_maps_api_provider_initializator__';


	GoogleMapsLoader._googleMockApiObject = {};


	GoogleMapsLoader.load = function(fn) {
		if (google === null) {
			if (loading === true) {
				if (fn) {
					callbacks.push(fn);
				}
			} else {
				loading = true;

				window[GoogleMapsLoader.WINDOW_CALLBACK_NAME] = function() {
					ready(fn);
				};

				GoogleMapsLoader.createLoader();
			}
		} else if (fn) {
			fn(google);
		}
	};


	GoogleMapsLoader.createLoader = function() {
		script = document.createElement('script');
		script.type = 'text/javascript';
		script.src = GoogleMapsLoader.createUrl();

		document.body.appendChild(script);
	};


	GoogleMapsLoader.isLoaded = function() {
		return google !== null;
	};


	GoogleMapsLoader.createUrl = function() {
		var url = GoogleMapsLoader.URL;

		url += '?callback=' + GoogleMapsLoader.WINDOW_CALLBACK_NAME;

		if (GoogleMapsLoader.KEY) {
			url += '&key=' + GoogleMapsLoader.KEY;
		}

		if (GoogleMapsLoader.LIBRARIES.length > 0) {
			url += '&libraries=' + GoogleMapsLoader.LIBRARIES.join(',');
		}

		if (GoogleMapsLoader.CLIENT) {
			url += '&client=' + GoogleMapsLoader.CLIENT;
		}

		if (GoogleMapsLoader.CHANNEL) {
			url += '&channel=' + GoogleMapsLoader.CHANNEL;
		}

		if (GoogleMapsLoader.LANGUAGE) {
			url += '&language=' + GoogleMapsLoader.LANGUAGE;
		}

		if (GoogleMapsLoader.REGION) {
			url += '&region=' + GoogleMapsLoader.REGION;
		}

		if (GoogleMapsLoader.VERSION) {
			url += '&v=' + GoogleMapsLoader.VERSION;
		}

		return url;
	};


	GoogleMapsLoader.release = function(fn) {
		var release = function() {
			GoogleMapsLoader.KEY = null;
			GoogleMapsLoader.LIBRARIES = [];
			GoogleMapsLoader.CLIENT = null;
			GoogleMapsLoader.CHANNEL = null;
			GoogleMapsLoader.LANGUAGE = null;
			GoogleMapsLoader.REGION = null;
			GoogleMapsLoader.VERSION = googleVersion;

			google = null;
			loading = false;
			callbacks = [];
			onLoadEvents = [];

			if (typeof window.google !== 'undefined') {
				delete window.google;
			}

			if (typeof window[GoogleMapsLoader.WINDOW_CALLBACK_NAME] !== 'undefined') {
				delete window[GoogleMapsLoader.WINDOW_CALLBACK_NAME];
			}

			if (originalCreateLoaderMethod !== null) {
				GoogleMapsLoader.createLoader = originalCreateLoaderMethod;
				originalCreateLoaderMethod = null;
			}

			if (script !== null) {
				script.parentElement.removeChild(script);
				script = null;
			}

			if (fn) {
				fn();
			}
		};

		if (loading) {
			GoogleMapsLoader.load(function() {
				release();
			});
		} else {
			release();
		}
	};


	GoogleMapsLoader.onLoad = function(fn) {
		onLoadEvents.push(fn);
	};


	GoogleMapsLoader.makeMock = function() {
		originalCreateLoaderMethod = GoogleMapsLoader.createLoader;

		GoogleMapsLoader.createLoader = function() {
			window.google = GoogleMapsLoader._googleMockApiObject;
			window[GoogleMapsLoader.WINDOW_CALLBACK_NAME]();
		};
	};


	var ready = function(fn) {
		var i;

		loading = false;

		if (google === null) {
			google = window.google;
		}

		for (i = 0; i < onLoadEvents.length; i++) {
			onLoadEvents[i](google);
		}

		if (fn) {
			fn(google);
		}

		for (i = 0; i < callbacks.length; i++) {
			callbacks[i](google);
		}

		callbacks = [];
	};


	return GoogleMapsLoader;

});
}(Google));

var GoogleMapsLoader = Google.exports;

var selectors$c = {
  mapContainer: '.location__map-container',
  mapElement: '.location__map-element'
};
var fullMapURL = 'https://www.google.com/maps/place/';
register('location', {
  onLoad() {
    this._initMap();

    this.scrollAnimation = scrollIntoView(this.container);
  },

  _initMap() {
    this.mapContainer = this.container.querySelector(selectors$c.mapContainer);
    var address = null;
    var apiKey = null;

    if (this.mapContainer) {
      address = this.mapContainer.dataset.address;
      apiKey = this.mapContainer.dataset.apiKey;
    }

    if (!apiKey || !address) {
      return;
    }

    var {
      sectionId
    } = this.container.dataset;
    var styledData = document.querySelector("#map-styles-".concat(sectionId));
    var data = JSON.parse(styledData.innerHTML);
    GoogleMapsLoader.KEY = apiKey;
    GoogleMapsLoader.VERSION = '3.34';
    GoogleMapsLoader.LIBRARIES = ['geocoding-api'];
    GoogleMapsLoader.load(google => {
      var geocoder = new google.maps.Geocoder();
      geocoder.geocode({
        address
      }, (res, status) => {
        if (res.length === 0) {
          return console.error("Google Maps Geocoding failed, reason: ".concat(status));
        }

        var {
          location
        } = res[0].geometry;
        var latLong = {
          lat: location.lat(),
          lng: location.lng()
        };
        this.mapContainer.classList.add('active');
        var map = new google.maps.Map(this.container.querySelector(selectors$c.mapElement), {
          center: latLong,
          zoom: 12,
          styles: data.styles
        });
        var marker = new google.maps.Marker({
          position: latLong,
          map
        });
        marker.addListener('click', () => {
          window.open(fullMapURL + address);
        });
      });
    });
  },

  onUnload() {
    GoogleMapsLoader.release();
    this.scrollAnimation.unload();
  }

});

var selectors$b = {
  carouselContainer: '.testimonials__slides',
  animatedSlides: '.animates'
};
register('testimonials', {
  onLoad() {
    this.animatedSlides = this.container.querySelectorAll(selectors$b.animatedSlides);
    this.carouselContainer = this.container.querySelector(selectors$b.carouselContainer);
    this.carousel = carousel(this.container);

    if (this.animatedSlides.length) {
      this._initScrollAnimation(orderCarouselItems(this.container, this.animatedSlides));
    }
  },

  _initScrollAnimation(slides) {
    var {
      textPosition
    } = this.container.dataset; // If the caorusle is inline the animation needs to delay
    // to account for text-block fade in.

    var animationDelay = textPosition === 'top' ? 0 : 750;
    this.scrollAnimation = scrollIntoView(this.container, slides, animationDelay);
  },

  onBlockSelect(_ref) {
    var {
      target: slide
    } = _ref;
    this.carousel.goToSlide(slide.dataset.index);
  },

  onUnload() {
    this.carousel.unload();

    if (this.animatedSlides.length) {
      this.scrollAnimation.unload();
    }
  }

});

var selectors$a = {
  gridItem: '.mosaic-grid__item',
  video: '.mosaic-grid__item-video'
};
register('mosaic-grid', {
  onLoad() {
    var videos = t$7(selectors$a.video, this.container);
    this.videoHandlers = [];

    if (videos.length) {
      videos.forEach(video => {
        this.videoHandlers.push(backgroundVideoHandler(video.parentNode));
      });
    }

    this.scrollAnimation = scrollIntoView(this.container, t$7(selectors$a.gridItem, this.container));
  },

  onUnload() {
    this.videoHandlers.forEach(handler => handler());
    this.scrollAnimation.unload();
  }

});

var selectors$9 = {
  sliderContainer: '.text-columns__content',
  animatedItems: '.animates'
};
register('text-columns-with-images', {
  animationPlayedOnLoad: false,

  onLoad() {
    this.animatedItems = this.container.querySelectorAll(selectors$9.animatedItems);
    this.scrollAnimation = scrollIntoView(this.container, this.animatedItems);
  },

  onUnload() {
    this.scrollAnimation.unload();
  }

});

register('rich-text', {
  onLoad() {
    this.scrollAnimation = scrollIntoView(this.container);
  },

  onUnload() {
    this.scrollAnimation.unload();
  }

});

register('image-hero', {
  onLoad() {
    this.scrollAnimation = scrollIntoView(this.container);

    if (isFirstSectionOnHomepage(this.container)) {
      u$2(this.container, 'first-full-height');
    }
  },

  onUnload() {
    this.scrollAnimation.unload();
  }

});

var selectors$8 = {
  videoWrapper: '.video-hero__video'
};
register('video-hero', {
  onLoad() {
    this.scrollAnimation = scrollIntoView(this.container);
    var videoWrapper = n$3(selectors$8.videoWrapper, this.container);

    if (isFirstSectionOnHomepage(this.container)) {
      u$2(this.container, 'first-full-height');
    }

    if (videoWrapper) {
      this.videoHandler = backgroundVideoHandler(this.container);
    }
  },

  onUnload() {
    this.scrollAnimation.unload();
    this.videoHandler && this.videoHandler();
  }

});

register('article', {
  onLoad() {
    this.socialButtons = t$7('[data-social-share]', this.container);
    this.socialButtonsClick = e$3(this.socialButtons, 'click', e => {
      l(e.target, 'active');
      var sub = n$3('.product__share-icons', e.target);
      sub.setAttribute('aria-hidden', !e.target.classList.contains('active'));
    });
  },

  onUnload() {
    this.socialButtonsClick();
  }

});

var selectors$7 = {
  cartItems: '[data-cart-items]',
  cartInfo: '[data-cart-info]',
  quantityInput: '[data-quantity-input]',
  quantityButton: '[data-quantity-button]',
  quantityWrapper: '[data-quantity-wrapper]',
  loading: '[data-loading]'
};
register('cart', {
  onLoad() {
    this.dynamicCartEnabled = this.container.dataset.dynamicCartEnabled;
    this.cartItems = this.container.querySelector(selectors$7.cartItems);
    this.cartInfo = this.container.querySelector(selectors$7.cartInfo);
    this.loading = this.container.querySelector(selectors$7.loading);
    this.delegate = new Delegate(this.container);
    this.delegate.on('click', selectors$7.quantityButton, this._handleQuantityButton);
    this.delegate.on('change', selectors$7.quantityInput, evt => {
      this._handleQuantitychange(evt);
    });
  },

  _handleQuantitychange(evt) {
    var key = evt.target.dataset.lineItemKey;
    var quantity = parseInt(evt.target.value);
    var inventoryQuantity = parseInt(evt.target.dataset.inventoryQuantity);
    var inventoryManagement = evt.target.dataset.inventoryManagement;

    if (this.dynamicCartEnabled === 'true') {
      this._updateLineItemQuantity(key, quantity).then(() => {
        this._renderView().then(() => {
          if (inventoryManagement === 'shopify' && quantity > inventoryQuantity) {
            var quantityInput = this.container.querySelector("".concat(selectors$7.quantityInput, "[data-line-item-key='").concat(key, "']"));
            quantityInput.setCustomValidity("".concat(theme.strings.cart.general.quantity_error_updated, " ").concat(quantity, " \u2192 ").concat(inventoryQuantity));
            quantityInput.reportValidity();
          }
        });
      });
    } else {
      if (inventoryManagement === 'shopify' && quantity > inventoryQuantity) {
        var quantityInput = this.container.querySelector("".concat(selectors$7.quantityInput, "[data-line-item-key='").concat(key, "']"));
        quantityInput.setCustomValidity(theme.strings.cart.general.quantity_error);
        quantityInput.reportValidity();
      }
    }
  },

  _handleQuantityButton(evt) {
    var {
      quantityButton
    } = evt.target.closest(selectors$7.quantityButton).dataset;
    var quantityWrapper = evt.target.closest(selectors$7.quantityWrapper);
    var quantityInput = quantityWrapper.querySelector(selectors$7.quantityInput);
    var currentValue = parseInt(quantityInput.value);
    var newValue = currentValue;

    if (quantityButton === 'subtract') {
      newValue = currentValue - 1;
    } else if (quantityButton === 'add') {
      newValue = currentValue + 1;
    }

    quantityInput.value = newValue;
    quantityInput.dispatchEvent(new Event('change', {
      "bubbles": true
    }));
  },

  _updateLineItemQuantity(id, quantity) {
    var _this = this;

    return _asyncToGenerator(function* () {
      _this.loading.classList.add('is-active');

      return fetch("".concat(theme.routes.cart.change, ".js"), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id,
          quantity
        })
      }).then(res => res.json());
    })();
  },

  _renderView() {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      var url = "".concat(window.location.pathname, "?section_id=").concat(_this2.container.dataset.sectionId);
      return fetch(url, {
        credentials: 'include'
      }).then(res => res.text()).then(res => {
        var doc = new window.DOMParser().parseFromString(res, 'text/html');
        var items = doc.querySelector(selectors$7.cartItems).innerHTML;
        _this2.cartItems.innerHTML = items;
        var info = doc.querySelector(selectors$7.cartInfo).innerHTML;
        _this2.cartInfo.innerHTML = info;
        return fetchCart().then(cart => {
          o({
            cart: cart
          });
          r$1('cart:updated', {
            cartOpen: true,
            cart: cart
          });

          _this2.loading.classList.remove('is-active');

          return {
            cart
          };
        });
      });
    })();
  },

  onUnload() {
    this.delegate.off();
  }

});

var selectors$6 = {
  close: '[data-close]',
  slider: '[data-slider]',
  slide: '[data-slide]',
  imageById: id => "[data-id='".concat(id, "']"),
  navItem: '[data-nav-item]',
  wrapper: '.lightbox__images-wrapper',
  prevButton: '[data-prev]',
  nextButton: '[data-next]'
};
var classes$1 = {
  visible: 'visible',
  active: 'active',
  zoom: 'zoom'
};
function Lightbox(node) {
  var trap = createFocusTrap(node);
  var navItems = t$7(selectors$6.navItem, node);
  var wrapper = n$3(selectors$6.wrapper, node);
  var images = t$7(selectors$6.slide, node);
  var previousButton = n$3(selectors$6.prevButton, node);
  var nextButton = n$3(selectors$6.nextButton, node);
  var sliderContainer = n$3(selectors$6.slider, node);
  var slider = new Flickity(sliderContainer, {
    adaptiveHeight: true,
    draggable: isMobile$1({
      tablet: true,
      featureDetect: true
    }),
    prevNextButtons: false,
    wrapAround: false,
    pageDots: false
  });

  if (images.length > 1) {
    slider.on('scroll', progress => {
      _resetZoom();

      var progressScale = progress * 100; // https://github.com/metafizzy/flickity/issues/289

      previousButton.disabled = progressScale < 1;
      nextButton.disabled = progressScale > 99;
    });
    slider.on('select', () => {
      navItems.forEach(item => i$1(item, classes$1.active));
      u$2(navItems[slider.selectedIndex], classes$1.active);
      navItems[slider.selectedIndex].scrollIntoView({
        behavior: 'smooth',
        inline: 'nearest'
      });
    });
  } else {
    u$2(previousButton, 'hidden');
    u$2(nextButton, 'hidden');
    previousButton.disabled = true;
    nextButton.disabled = true;
  }

  var events = [e$3(n$3(selectors$6.close, node), 'click', e => {
    e.preventDefault();
    close();
  }), e$3(node, 'keydown', _ref => {
    var {
      keyCode
    } = _ref;
    if (keyCode === 27) close();
  }), e$3(navItems, 'click', e => {
    e.preventDefault();
    var {
      index
    } = e.currentTarget.dataset;
    slider.select(index);
  }), e$3(images, 'click', e => {
    e.preventDefault();

    _handleZoom(e);
  }), e$3(previousButton, 'click', () => slider.previous()), e$3(nextButton, 'click', () => slider.next())];

  function _handleZoom(event) {
    var image = event.currentTarget;
    var zoomed = image.classList.contains(classes$1.zoom);
    l(image, classes$1.zoom, !zoomed);

    if (zoomed) {
      _resetZoom(image);

      return;
    }

    var x = event.clientX;
    var y = event.clientY + wrapper.scrollTop - sliderContainer.offsetTop;
    var xDelta = (x - image.clientWidth / 2) * -1;
    var yDelta = (y - image.clientHeight / 2) * -1;
    image.style.transform = "translate3d(".concat(xDelta, "px, ").concat(yDelta, "px, 0) scale(2)");
  }

  function _resetZoom(image) {
    if (image) {
      i$1(image, classes$1.zoom);
      image.style.transform = "translate3d(0px, 0px, 0) scale(1)";
      return;
    }

    images.forEach(image => {
      i$1(image, classes$1.zoom);
      image.style.transform = "translate3d(0px, 0px, 0) scale(1)";
    });
  }

  function open(id) {
    u$2(node, classes$1.active);
    setTimeout(() => {
      u$2(node, classes$1.visible);
      disableBodyScroll(node, {
        allowTouchMove: el => {
          while (el && el !== document.body) {
            if (el.getAttribute('data-scroll-lock-ignore') !== null) {
              return true;
            }

            el = el.parentNode;
          }
        },
        reserveScrollBarGap: true
      });
      trap.activate();
      var image = n$3(selectors$6.imageById(id), node);
      var {
        slideIndex
      } = image.dataset;
      slider.select(slideIndex, false, true);
    }, 50);
  }

  function close() {
    _resetZoom();

    i$1(node, classes$1.visible);
    setTimeout(() => {
      i$1(node, classes$1.active);
      enableBodyScroll(node);
      trap.deactivate();
    }, 300);
  }

  function destroy() {
    events.forEach(unsubscribe => unsubscribe());
    slider.destroy();
  }

  return {
    destroy,
    open
  };
}

var heightObserver = callback => {
  var observables = []; // Array of observed elements that looks like const :
  // [{
  //   el: domNode,
  //   size: {height: x}
  // }]

  var observe = el => {
    if (observables.some(observable => observable.el === el)) {
      return;
    }

    var newObservable = {
      el: el,
      size: {
        height: el.clientHeight
      }
    };
    observables.push(newObservable);
  };

  var unobserve = el => {
    observables = observables.filter(obj => obj.el !== el);
  };

  var check = () => {
    var changedEntries = observables.filter(obj => {
      var currentHeight = obj.el.clientHeight;

      if (obj.size.height !== currentHeight) {
        obj.size.height = currentHeight;
        return true;
      }
    }).map(obj => obj.el);

    if (changedEntries.length > 0) {
      callback(changedEntries);
    }

    window.requestAnimationFrame(check);
  };

  check();

  var unload = () => {
    observables = [];
  };

  return {
    unload,
    observe,
    unobserve
  };
};

var selectors$5 = {
  sectionWrapper: '.product-page-wrapper',
  imagesContainer: '.product__media',
  images: '.media__image',
  swatches: '[data-product-swatches]',
  chips: '[data-product-chips]',
  quantityInput: '.product-form__quantity',
  socialSharing: '.share',
  productDetailsWrapper: '.product__meta-inner',
  productDescription: '.product__description',
  accordion: '.accordion',
  productForm: '[data-product-form]',
  lightboxTrigger: '.product__media-action-button',
  thumb: '[data-product-thumbnail]',
  inYourSpace: '[data-in-your-space]'
};
var carouselOpts = {
  adaptiveHeight: false,
  arrowShape: 'M27.64 51.03 42.52 35.13 45.43 37.89 34.83 49.09 71.63 49.09 71.63 53.09 34.83 53.09 45.25 64.12 42.52 67.05 27.64 51.03z',
  pageDots: false,
  watchCSS: true
}; // LERP returns a number between start and end based on the amt
// Often used to smooth animations
// Eg. Given: start = 0, end = 100
// - if amt = 0.1 then lerp will return 10
// - if amt = 0.5 then lerp will return 50
// - if amt = 0.9 then lerp will return 90

function lerp(start, end, amt) {
  return (1 - amt) * start + amt * end;
}

register('product', {
  onLoad() {
    this.container.classList.add('product--loaded');
    this.media = Media(n$3('.product__media-container', this.container));
    var productFormContainer = this.container.querySelector(selectors$5.productForm);
    var inYourSpaceButton = this.container.querySelector('.product__view-in-space');

    if (isMobile$1() && Boolean(inYourSpaceButton)) {
      inYourSpaceButton.classList.add('visible');
    }

    this.productForm = productForm(productFormContainer, {
      isProductPage: true,
      container: this.container
    });
    this.optionButtons = OptionButtons(t$7('[data-option-buttons]', this.container));
    this.quantityInput = quantityInput.call(this, selectors$5.quantityInput);
    this.sectionWrapper = document.querySelector(selectors$5.sectionWrapper);
    this.productDetails = this.container.querySelector(selectors$5.productDetailsWrapper);
    this.variantPopup = variantPopup(this.container); // Here we check if the merchant added a product reviews section or not

    var reviewsContainer = document.querySelector('#shopify-product-reviews');
    var reviewsTemplate = this.container.querySelector('.product-reviews-template');
    var reviewsDrawer = this.container.querySelector('[data-reviews-drawer]');
    var reviewsIsDrawer = false;

    if (!reviewsContainer && reviewsTemplate && reviewsDrawer) {
      reviewsDrawer.classList.add('reviews-flyout--active');
      reviewsDrawer.appendChild(reviewsTemplate.content.cloneNode(true));
      reviewsIsDrawer = true;
    }

    window.SPRCallbacks = {};

    window.SPRCallbacks.onReviewsLoad = () => {
      if (!this.reviews) {
        this.reviews = reviews(this.container, reviewsIsDrawer);
      }
    };

    this.accordions = this.container.querySelectorAll(selectors$5.accordion);
    this.accordions.forEach(item => {
      if (!item.classList.contains('accordion--active')) {
        accordion(item);
      }
    });
    this.socialButtons = t$7('[data-social-share]', this.container);
    this.socialButtonsClick = e$3(this.socialButtons, 'click', e => {
      l(e.target, 'active');
      var sub = n$3('.product__share-icons', e.target);
      sub.setAttribute('aria-hidden', !e.target.classList.contains('active'));
    });

    this._initLightbox();

    this._initThumbnails();

    this._initSlider();

    this._wrapTables();

    this.mediaUpateListener = c$1('product:mediaSelect', _ref => {
      var {
        selectedMedia
      } = _ref;
      return this.carousel.select(selectedMedia);
    });
    document.body.classList.remove('product--full-width');

    if (this.container.classList.contains('product--full-width')) {
      document.body.classList.add('product--full-width');
    }

    var featureWidgetVideo = n$3('.product-feature-widget--video', this.container);

    if (featureWidgetVideo) {
      this.videoHandler = backgroundVideoHandler(this.container);
    }

    this.container.style.setProperty('--product-details-top', 0);

    if (!isMobile$1()) {
      this._initDetailsScroll();
    }
  },

  _initDetailsScroll() {
    // The previous scroll position of the page
    this.previousScrollY = window.scrollY; // To keep track of the amount scrolled per event

    this.currentScrollAmount = 0; // Height of the header bar, used for calculating position

    this.headerHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height').replace(/px/gi, '')); // The value to set the product details `top` value to

    this.detailsTop = this.headerHeight;
    this.detailsTopPrevious = this.detailsTop; // The height of the product details container
    // Gets updated by a resize observer on the window and the details container

    this.detailsHeight = this.productDetails.offsetHeight; // The height of the product details container plus the height of the header

    this.detailsHeightWithHeader = this.detailsHeight + this.headerHeight; // The max amount to set the details `top` value
    // This is equal to the number of pixels that the details container is hidden by the viewport
    // Gets updated by a resize observer on the window and the details container

    this.detailsMaxTop = this.detailsHeightWithHeader - window.innerHeight;
    this.container.style.setProperty('--product-details-top', "".concat(this.detailsTop, "px")); // Whatch scroll updates

    this.scroller = srraf(_ref2 => {
      var {
        y
      } = _ref2;

      this._scrollHandler(y);
    }); // Resize observer on the window and the product details
    // Things like accordions can change the height of the details container

    this.resizeObserver = heightObserver(() => {
      this.detailsHeight = this.productDetails.offsetHeight;
      this.headerHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height').replace(/px/gi, ''));
      this.detailsHeightWithHeader = this.detailsHeight + this.headerHeight;
      this.detailsMaxTop = this.detailsHeightWithHeader - window.innerHeight; // Check if the product details container is taller than the viewport
      // and section container has room for the details to scroll.
      // If thumbnails are shown then the details are probably the tallest
      // element in the section and won't have room to scroll.

      if (this.detailsHeightWithHeader > window.innerHeight && this.container.offsetHeight > this.detailsHeightWithHeader) {
        u$2(this.container, 'product--has-sticky-scroll');

        this._scrollHandler(window.scrollY);
      } else {
        i$1(this.container, 'product--has-sticky-scroll');
      }
    });
    this.resizeObserver.observe(this.productDetails);
    this.resizeObserver.observe(document.documentElement); // Start the animation loop

    requestAnimationFrame(() => this.updateDetailsTopLoop());
  },

  // This is an endless RAF loop used to update the top position CSS var
  // We're using this with a LERP function to smooth out the position updating
  // instead of having large jumps while scrolling fast
  updateDetailsTopLoop() {
    // We want to continue to update the top var until fully into the stopped position
    if (this.detailsTop !== this.detailsTopPrevious) {
      this.detailsTopPrevious = lerp(this.detailsTopPrevious, this.detailsTop, 0.5);
      this.container.style.setProperty('--product-details-top', "".concat(this.detailsTopPrevious, "px"));
    }

    requestAnimationFrame(() => this.updateDetailsTopLoop());
  },

  _scrollHandler(y) {
    // this.detailsTopPrevious = this.detailsTop;
    this.currentScrollAmount = this.previousScrollY - y; // The offset based on how far the page has been scrolled from last event

    var currentScrollOffset = this.detailsTop + this.currentScrollAmount; // The max top value while scrolling up

    var topMax = this.headerHeight; // The max top value while scrolling down

    var bottomMax = -this.detailsMaxTop + this.headerHeight - 40; // Calculate the current top value based on the currentScrollOffset value in the range of topMax and bottomMax

    this.detailsTop = Math.max(bottomMax, Math.min(currentScrollOffset, topMax)); // Update the previous scroll position for next time

    this.previousScrollY = y;
  },

  _initThumbnails() {
    this.productThumbs = this.container.querySelectorAll(selectors$5.thumb);
    this.productThumbs.forEach(thumb => {
      thumb.addEventListener('click', this._handleThumbClick.bind(this));
    });
  },

  _handleThumbClick(e) {
    e.preventDefault();
    var {
      currentTarget: {
        dataset
      }
    } = e;
    this.productThumbs.forEach(thumb => thumb.classList.remove('active'));
    e.currentTarget.classList.add('active');
    switchImage(this.container, dataset.thumbnailId);
  },

  _initLightbox() {
    this.images = this.container.querySelectorAll(selectors$5.images);
    this.lightboxTrigger = this.container.querySelector(selectors$5.lightboxTrigger);
    var lightbox = this.container.querySelector('[data-lightbox]');
    this.lightbox = Lightbox(lightbox);
    this.images.forEach(image => {
      image.addEventListener('click', this._handleImageClick.bind(this));
    });
    this.lightboxTrigger && this.lightboxTrigger.addEventListener('click', this.lightbox.open);
  },

  _handleImageClick(e) {
    e.preventDefault();
    this.lightbox.open(e.currentTarget.dataset.open);
    this.media && this.media.pauseActiveMedia();
  },

  _initSlider() {
    var imagesContainer = this.container.querySelector(selectors$5.imagesContainer);
    var images = imagesContainer.querySelectorAll('.media-wrapper');
    carouselOpts.wrapAround = images.length > 2;
    this.carousel = new Flickity(imagesContainer, _objectSpread2(_objectSpread2({}, carouselOpts), {}, {
      on: {
        ready: function ready() {
          if (this.selectedElement.querySelector('[data-media-type="model"]')) {
            this.unbindDrag();
          }
        },
        change: () => {
          // Disable dragging so user can interact with model
          if (this.carousel.selectedElement.querySelector('[data-media-type="model"]')) {
            this.carousel.unbindDrag();
            var newImageMedia = n$3('.media', this.carousel.selectedElement);
            var inYourSpaceButton = n$3(selectors$5.inYourSpace, this.container);

            if (inYourSpaceButton) {
              if (newImageMedia.dataset.mediaType === 'model') {
                inYourSpaceButton.setAttribute('data-shopify-model3d-id', newImageMedia.dataset.mediaId);
              }
            }
          } else {
            this.carousel.bindDrag();
          }
        }
      }
    }));
  },

  _wrapTables() {
    var tables = this.container.querySelectorAll('table');
    tables.forEach(el => {
      var wrapper = document.createElement('div');
      wrapper.classList.add('rte-table');
      el.parentNode.insertBefore(wrapper, el);
      wrapper.appendChild(el);
    });
  },

  onUnload() {
    var _this$resizeObserver, _this$scroller;

    this.lightbox.destroy();
    this.reviews && this.reviews.unload();
    this.quantityInput && this.quantityInput();
    this.productForm.unload();
    this.carousel.destroy();
    this.mediaUpateListener();
    this.variantPopup.unload();
    this.optionButtons.destroy();
    this.socialButtonsClick();
    (_this$resizeObserver = this.resizeObserver) === null || _this$resizeObserver === void 0 ? void 0 : _this$resizeObserver.unload();
    (_this$scroller = this.scroller) === null || _this$scroller === void 0 ? void 0 : _this$scroller.scroller.destroy();
    this.images.forEach(image => {
      image.removeEventListener('click', this._handleImageClick);
    });
    this.lightboxTrigger && this.lightboxTrigger.removeEventListener('click', this.lightbox.open);
  }

});

var url_min = {exports: {}};

(function (module) {
!function(t){var y=/^[a-z]+:/,d=/[-a-z0-9]+(\.[-a-z0-9])*:\d+/i,v=/\/\/(.*?)(?::(.*?))?@/,r=/^win/i,g=/:$/,m=/^\?/,q=/^#/,w=/(.*\/)/,A=/^\/{2,}/,I=/(^\/?)/,e=/'/g,o=/%([ef][0-9a-f])%([89ab][0-9a-f])%([89ab][0-9a-f])/gi,n=/%([cd][0-9a-f])%([89ab][0-9a-f])/gi,i=/%([0-7][0-9a-f])/gi,s=/\+/g,a=/^\w:$/,C=/[^/#?]/;var p,S="undefined"==typeof window&&"undefined"!=typeof commonjsGlobal$1&&"function"==typeof commonjsRequire,b=!S&&t.navigator&&t.navigator.userAgent&&~t.navigator.userAgent.indexOf("MSIE"),x=S?t.require:null,j={protocol:"protocol",host:"hostname",port:"port",path:"pathname",query:"search",hash:"hash"},z={ftp:21,gopher:70,http:80,https:443,ws:80,wss:443};function E(){return S?p=p||"file://"+(process.platform.match(r)?"/":"")+x("fs").realpathSync("."):"about:srcdoc"===document.location.href?self.parent.document.location.href:document.location.href}function h(t,r,e){var o,n,i;r=r||E(),S?o=x("url").parse(r):(o=document.createElement("a")).href=r;var a,s,p=(s={path:!0,query:!0,hash:!0},(a=r)&&y.test(a)&&(s.protocol=!0,s.host=!0,d.test(a)&&(s.port=!0),v.test(a)&&(s.user=!0,s.pass=!0)),s);for(n in i=r.match(v)||[],j)p[n]?t[n]=o[j[n]]||"":t[n]="";if(t.protocol=t.protocol.replace(g,""),t.query=t.query.replace(m,""),t.hash=F(t.hash.replace(q,"")),t.user=F(i[1]||""),t.pass=F(i[2]||""),t.port=z[t.protocol]==t.port||0==t.port?"":t.port,!p.protocol&&C.test(r.charAt(0))&&(t.path=r.split("?")[0].split("#")[0]),!p.protocol&&e){var h=new L(E().match(w)[0]),u=h.path.split("/"),c=t.path.split("/"),f=["protocol","user","pass","host","port"],l=f.length;for(u.pop(),n=0;n<l;n++)t[f[n]]=h[f[n]];for(;".."===c[0];)u.pop(),c.shift();t.path=("/"!==r.charAt(0)?u.join("/"):"")+"/"+c.join("/");}t.path=t.path.replace(A,"/"),b&&(t.path=t.path.replace(I,"/")),t.paths(t.paths()),t.query=new U(t.query);}function u(t){return encodeURIComponent(t).replace(e,"%27")}function F(t){return (t=(t=(t=t.replace(s," ")).replace(o,function(t,r,e,o){var n=parseInt(r,16)-224,i=parseInt(e,16)-128;if(0==n&&i<32)return t;var a=(n<<12)+(i<<6)+(parseInt(o,16)-128);return 65535<a?t:String.fromCharCode(a)})).replace(n,function(t,r,e){var o=parseInt(r,16)-192;if(o<2)return t;var n=parseInt(e,16)-128;return String.fromCharCode((o<<6)+n)})).replace(i,function(t,r){return String.fromCharCode(parseInt(r,16))})}function U(t){for(var r=t.split("&"),e=0,o=r.length;e<o;e++){var n=r[e].split("="),i=decodeURIComponent(n[0].replace(s," "));if(i){var a=void 0!==n[1]?F(n[1]):null;void 0===this[i]?this[i]=a:(this[i]instanceof Array||(this[i]=[this[i]]),this[i].push(a));}}}function L(t,r){h(this,t,!r);}U.prototype.toString=function(){var t,r,e="",o=u;for(t in this){var n=this[t];if(!(n instanceof Function||void 0===n))if(n instanceof Array){var i=n.length;if(!i){e+=(e?"&":"")+o(t)+"=";continue}for(r=0;r<i;r++){var a=n[r];void 0!==a&&(e+=e?"&":"",e+=o(t)+(null===a?"":"="+o(a)));}}else e+=e?"&":"",e+=o(t)+(null===n?"":"="+o(n));}return e},L.prototype.clearQuery=function(){for(var t in this.query)this.query[t]instanceof Function||delete this.query[t];return this},L.prototype.queryLength=function(){var t=0;for(var r in this.query)this.query[r]instanceof Function||t++;return t},L.prototype.isEmptyQuery=function(){return 0===this.queryLength()},L.prototype.paths=function(t){var r,e="",o=0;if(t&&t.length&&t+""!==t){for(this.isAbsolute()&&(e="/"),r=t.length;o<r;o++)t[o]=!o&&a.test(t[o])?t[o]:u(t[o]);this.path=e+t.join("/");}for(o=0,r=(t=("/"===this.path.charAt(0)?this.path.slice(1):this.path).split("/")).length;o<r;o++)t[o]=F(t[o]);return t},L.prototype.encode=u,L.prototype.decode=F,L.prototype.isAbsolute=function(){return this.protocol||"/"===this.path.charAt(0)},L.prototype.toString=function(){return (this.protocol&&this.protocol+"://")+(this.user&&u(this.user)+(this.pass&&":"+u(this.pass))+"@")+(this.host&&this.host)+(this.port&&":"+this.port)+(this.path&&this.path)+(this.query.toString()&&"?"+this.query)+(this.hash&&"#"+u(this.hash))},t[t.exports?"exports":"Url"]=L;}(module.exports?module:window);
}(url_min));

var t$1 = url_min.exports;

function Collection(e){var r=new t$1(e||window.location.href),n=r.paths().indexOf("collections")>0?3:2;function o(t){var e=r.paths().slice(0,n);r.paths([].concat(e,[t]));}function u(){var t=r.paths().filter(Boolean);return t[n]?t[n].split(" "):[]}return {getState:function(){return {handle:r.paths()[1],page:Number(r.query.page)||1,sort_by:r.query.sort_by||null,tags:u(),url:r.toString().replace(/%20/g,"+")}},addTags:function(t,e){return o([].concat(u(),t).filter(function(t,e,r){return r.indexOf(t)==e}).join(" ")),delete r.query.page,e(this.getState())},removeTags:function(t,e){return o(u().filter(function(e){return !t.includes(e)}).join(" ")),delete r.query.page,e(this.getState())},setSort:function(t,e){return r.query.sort_by=t,e(this.getState())},clearSort:function(t){return delete r.query.sort_by,t(this.getState())},clearAll:function(t){return delete r.query.sort_by,o(""),t(this.getState())}}}

/* @preserve
 * https://github.com/Elkfox/Ajaxinate
 * Copyright (c) 2017 Elkfox Co Pty Ltd (elkfox.com)
 * MIT License (do not remove above copyright!)
 */

/* Configurable options;
 *
 * method: scroll or click
 * container: selector of repeating content
 * pagination: selector of pagination container
 * offset: number of pixels before the bottom to start loading more on scroll
 * loadingText: 'Loading', The text shown during when appending new content
 * callback: null, callback function after new content is appended
 *
 * Usage;
 *
 * import {Ajaxinate} from 'ajaxinate';
 *
 * new Ajaxinate({
 *   offset: 5000,
 *   loadingText: 'Loading more...',
 * });
 */

/* eslint-env browser */
function Ajaxinate(config) {
  const settings = config || {};

  const defaults = {
    method: 'scroll',
    container: '#AjaxinateContainer',
    pagination: '#AjaxinatePagination',
    offset: 0,
    loadingText: 'Loading',
    callback: null,
  };

  // Merge custom configs with defaults
  this.settings = Object.assign(defaults, settings);

  // Functions
  this.addScrollListeners = this.addScrollListeners.bind(this);
  this.addClickListener = this.addClickListener.bind(this);
  this.checkIfPaginationInView = this.checkIfPaginationInView.bind(this);
  this.preventMultipleClicks = this.preventMultipleClicks.bind(this);
  this.removeClickListener = this.removeClickListener.bind(this);
  this.removeScrollListener = this.removeScrollListener.bind(this);
  this.removePaginationElement = this.removePaginationElement.bind(this);
  this.destroy = this.destroy.bind(this);

  // Selectors
  this.containerElement = document.querySelector(this.settings.container);
  this.paginationElement = document.querySelector(this.settings.pagination);
  this.initialize();
}

Ajaxinate.prototype.initialize = function initialize() {
  if (!this.containerElement) { return; }

  const initializers = {
    click: this.addClickListener,
    scroll: this.addScrollListeners,
  };

  initializers[this.settings.method]();
};

Ajaxinate.prototype.addScrollListeners = function addScrollListeners() {
  if (!this.paginationElement) { return; }

  document.addEventListener('scroll', this.checkIfPaginationInView);
  window.addEventListener('resize', this.checkIfPaginationInView);
  window.addEventListener('orientationchange', this.checkIfPaginationInView);
};

Ajaxinate.prototype.addClickListener = function addClickListener() {
  if (!this.paginationElement) { return; }

  this.nextPageLinkElement = this.paginationElement.querySelector('a');
  this.clickActive = true;

  if (typeof this.nextPageLinkElement !== 'undefined' && this.nextPageLinkElement !== null) {
    this.nextPageLinkElement.addEventListener('click', this.preventMultipleClicks);
  }
};

Ajaxinate.prototype.preventMultipleClicks = function preventMultipleClicks(event) {
  event.preventDefault();

  if (!this.clickActive) { return; }

  this.nextPageLinkElement.innerText = this.settings.loadingText;
  this.nextPageUrl = this.nextPageLinkElement.href;
  this.clickActive = false;

  this.loadMore();
};

Ajaxinate.prototype.checkIfPaginationInView = function checkIfPaginationInView() {
  const top = this.paginationElement.getBoundingClientRect().top - this.settings.offset;
  const bottom = this.paginationElement.getBoundingClientRect().bottom + this.settings.offset;

  if (top <= window.innerHeight && bottom >= 0) {
    this.nextPageLinkElement = this.paginationElement.querySelector('a');
    this.removeScrollListener();

    if (this.nextPageLinkElement) {
      this.nextPageLinkElement.innerText = this.settings.loadingText;
      this.nextPageUrl = this.nextPageLinkElement.href;

      this.loadMore();
    }
  }
};

Ajaxinate.prototype.loadMore = function loadMore() {
  this.request = new XMLHttpRequest();

  this.request.onreadystatechange = function success() {
    if (!this.request.responseXML) { return; }
    if (!this.request.readyState === 4 || !this.request.status === 200) { return; }

    const newContainer = this.request.responseXML.querySelectorAll(this.settings.container)[0];
    const newPagination = this.request.responseXML.querySelectorAll(this.settings.pagination)[0];

    this.containerElement.insertAdjacentHTML('beforeend', newContainer.innerHTML);

    if (typeof newPagination === 'undefined') {
      this.removePaginationElement();
    } else {
      this.paginationElement.innerHTML = newPagination.innerHTML;

      if (this.settings.callback && typeof this.settings.callback === 'function') {
        this.settings.callback(this.request.responseXML);
      }

      this.initialize();
    }
  }.bind(this);

  this.request.open('GET', this.nextPageUrl);
  this.request.responseType = 'document';
  this.request.send();
};

Ajaxinate.prototype.removeClickListener = function removeClickListener() {
  this.nextPageLinkElement.removeEventListener('click', this.preventMultipleClicks);
};

Ajaxinate.prototype.removePaginationElement = function removePaginationElement() {
  this.paginationElement.innerHTML = '';
  this.destroy();
};

Ajaxinate.prototype.removeScrollListener = function removeScrollListener() {
  document.removeEventListener('scroll', this.checkIfPaginationInView);
  window.removeEventListener('resize', this.checkIfPaginationInView);
  window.removeEventListener('orientationchange', this.checkIfPaginationInView);
};

Ajaxinate.prototype.destroy = function destroy() {
  const destroyers = {
    click: this.removeClickListener,
    scroll: this.removeScrollListener,
  };

  destroyers[this.settings.method]();

  return this;
};

// Ajaxinate custmoizer fix https://github.com/Elkfox/Ajaxinate/issues/26
var AjaxinateShim = lib => {
  lib.prototype.loadMore = function getTheHtmlOfTheNextPageWithAnAjaxRequest() {
    this.request = new XMLHttpRequest();

    this.request.onreadystatechange = function success() {
      if (this.request.readyState === 4 && this.request.status === 200) {
        var parser = new DOMParser();
        var htmlDoc = parser.parseFromString(this.request.responseText, 'text/html');
        var newContainer = htmlDoc.querySelectorAll(this.settings.container)[0];
        var newPagination = htmlDoc.querySelectorAll(this.settings.pagination)[0];
        this.containerElement.insertAdjacentHTML('beforeend', newContainer.innerHTML);
        this.paginationElement.innerHTML = newPagination.innerHTML;

        if (this.settings.callback && typeof this.settings.callback === 'function') {
          this.settings.callback(this.request.responseXML);
        }

        this.initialize();
      }
    }.bind(this);

    this.request.open('GET', this.nextPageUrl, false);
    this.request.send();
  };
};

function t(){try{return localStorage.setItem("test","test"),localStorage.removeItem("test"),!0}catch(t){return !1}}function e(e){if(t())return JSON.parse(localStorage.getItem("neon_"+e))}function r(e,r){if(t())return localStorage.setItem("neon_"+e,r)}

var nouislider = {exports: {}};

(function (module, exports) {
(function (global, factory) {
    factory(exports) ;
})(commonjsGlobal$1, (function (exports) {
    exports.PipsMode = void 0;
    (function (PipsMode) {
        PipsMode["Range"] = "range";
        PipsMode["Steps"] = "steps";
        PipsMode["Positions"] = "positions";
        PipsMode["Count"] = "count";
        PipsMode["Values"] = "values";
    })(exports.PipsMode || (exports.PipsMode = {}));
    exports.PipsType = void 0;
    (function (PipsType) {
        PipsType[PipsType["None"] = -1] = "None";
        PipsType[PipsType["NoValue"] = 0] = "NoValue";
        PipsType[PipsType["LargeValue"] = 1] = "LargeValue";
        PipsType[PipsType["SmallValue"] = 2] = "SmallValue";
    })(exports.PipsType || (exports.PipsType = {}));
    //region Helper Methods
    function isValidFormatter(entry) {
        return isValidPartialFormatter(entry) && typeof entry.from === "function";
    }
    function isValidPartialFormatter(entry) {
        // partial formatters only need a to function and not a from function
        return typeof entry === "object" && typeof entry.to === "function";
    }
    function removeElement(el) {
        el.parentElement.removeChild(el);
    }
    function isSet(value) {
        return value !== null && value !== undefined;
    }
    // Bindable version
    function preventDefault(e) {
        e.preventDefault();
    }
    // Removes duplicates from an array.
    function unique(array) {
        return array.filter(function (a) {
            return !this[a] ? (this[a] = true) : false;
        }, {});
    }
    // Round a value to the closest 'to'.
    function closest(value, to) {
        return Math.round(value / to) * to;
    }
    // Current position of an element relative to the document.
    function offset(elem, orientation) {
        var rect = elem.getBoundingClientRect();
        var doc = elem.ownerDocument;
        var docElem = doc.documentElement;
        var pageOffset = getPageOffset(doc);
        // getBoundingClientRect contains left scroll in Chrome on Android.
        // I haven't found a feature detection that proves this. Worst case
        // scenario on mis-match: the 'tap' feature on horizontal sliders breaks.
        if (/webkit.*Chrome.*Mobile/i.test(navigator.userAgent)) {
            pageOffset.x = 0;
        }
        return orientation ? rect.top + pageOffset.y - docElem.clientTop : rect.left + pageOffset.x - docElem.clientLeft;
    }
    // Checks whether a value is numerical.
    function isNumeric(a) {
        return typeof a === "number" && !isNaN(a) && isFinite(a);
    }
    // Sets a class and removes it after [duration] ms.
    function addClassFor(element, className, duration) {
        if (duration > 0) {
            addClass(element, className);
            setTimeout(function () {
                removeClass(element, className);
            }, duration);
        }
    }
    // Limits a value to 0 - 100
    function limit(a) {
        return Math.max(Math.min(a, 100), 0);
    }
    // Wraps a variable as an array, if it isn't one yet.
    // Note that an input array is returned by reference!
    function asArray(a) {
        return Array.isArray(a) ? a : [a];
    }
    // Counts decimals
    function countDecimals(numStr) {
        numStr = String(numStr);
        var pieces = numStr.split(".");
        return pieces.length > 1 ? pieces[1].length : 0;
    }
    // http://youmightnotneedjquery.com/#add_class
    function addClass(el, className) {
        if (el.classList && !/\s/.test(className)) {
            el.classList.add(className);
        }
        else {
            el.className += " " + className;
        }
    }
    // http://youmightnotneedjquery.com/#remove_class
    function removeClass(el, className) {
        if (el.classList && !/\s/.test(className)) {
            el.classList.remove(className);
        }
        else {
            el.className = el.className.replace(new RegExp("(^|\\b)" + className.split(" ").join("|") + "(\\b|$)", "gi"), " ");
        }
    }
    // https://plainjs.com/javascript/attributes/adding-removing-and-testing-for-classes-9/
    function hasClass(el, className) {
        return el.classList ? el.classList.contains(className) : new RegExp("\\b" + className + "\\b").test(el.className);
    }
    // https://developer.mozilla.org/en-US/docs/Web/API/Window/scrollY#Notes
    function getPageOffset(doc) {
        var supportPageOffset = window.pageXOffset !== undefined;
        var isCSS1Compat = (doc.compatMode || "") === "CSS1Compat";
        var x = supportPageOffset
            ? window.pageXOffset
            : isCSS1Compat
                ? doc.documentElement.scrollLeft
                : doc.body.scrollLeft;
        var y = supportPageOffset
            ? window.pageYOffset
            : isCSS1Compat
                ? doc.documentElement.scrollTop
                : doc.body.scrollTop;
        return {
            x: x,
            y: y,
        };
    }
    // we provide a function to compute constants instead
    // of accessing window.* as soon as the module needs it
    // so that we do not compute anything if not needed
    function getActions() {
        // Determine the events to bind. IE11 implements pointerEvents without
        // a prefix, which breaks compatibility with the IE10 implementation.
        return window.navigator.pointerEnabled
            ? {
                start: "pointerdown",
                move: "pointermove",
                end: "pointerup",
            }
            : window.navigator.msPointerEnabled
                ? {
                    start: "MSPointerDown",
                    move: "MSPointerMove",
                    end: "MSPointerUp",
                }
                : {
                    start: "mousedown touchstart",
                    move: "mousemove touchmove",
                    end: "mouseup touchend",
                };
    }
    // https://github.com/WICG/EventListenerOptions/blob/gh-pages/explainer.md
    // Issue #785
    function getSupportsPassive() {
        var supportsPassive = false;
        /* eslint-disable */
        try {
            var opts = Object.defineProperty({}, "passive", {
                get: function () {
                    supportsPassive = true;
                },
            });
            // @ts-ignore
            window.addEventListener("test", null, opts);
        }
        catch (e) { }
        /* eslint-enable */
        return supportsPassive;
    }
    function getSupportsTouchActionNone() {
        return window.CSS && CSS.supports && CSS.supports("touch-action", "none");
    }
    //endregion
    //region Range Calculation
    // Determine the size of a sub-range in relation to a full range.
    function subRangeRatio(pa, pb) {
        return 100 / (pb - pa);
    }
    // (percentage) How many percent is this value of this range?
    function fromPercentage(range, value, startRange) {
        return (value * 100) / (range[startRange + 1] - range[startRange]);
    }
    // (percentage) Where is this value on this range?
    function toPercentage(range, value) {
        return fromPercentage(range, range[0] < 0 ? value + Math.abs(range[0]) : value - range[0], 0);
    }
    // (value) How much is this percentage on this range?
    function isPercentage(range, value) {
        return (value * (range[1] - range[0])) / 100 + range[0];
    }
    function getJ(value, arr) {
        var j = 1;
        while (value >= arr[j]) {
            j += 1;
        }
        return j;
    }
    // (percentage) Input a value, find where, on a scale of 0-100, it applies.
    function toStepping(xVal, xPct, value) {
        if (value >= xVal.slice(-1)[0]) {
            return 100;
        }
        var j = getJ(value, xVal);
        var va = xVal[j - 1];
        var vb = xVal[j];
        var pa = xPct[j - 1];
        var pb = xPct[j];
        return pa + toPercentage([va, vb], value) / subRangeRatio(pa, pb);
    }
    // (value) Input a percentage, find where it is on the specified range.
    function fromStepping(xVal, xPct, value) {
        // There is no range group that fits 100
        if (value >= 100) {
            return xVal.slice(-1)[0];
        }
        var j = getJ(value, xPct);
        var va = xVal[j - 1];
        var vb = xVal[j];
        var pa = xPct[j - 1];
        var pb = xPct[j];
        return isPercentage([va, vb], (value - pa) * subRangeRatio(pa, pb));
    }
    // (percentage) Get the step that applies at a certain value.
    function getStep(xPct, xSteps, snap, value) {
        if (value === 100) {
            return value;
        }
        var j = getJ(value, xPct);
        var a = xPct[j - 1];
        var b = xPct[j];
        // If 'snap' is set, steps are used as fixed points on the slider.
        if (snap) {
            // Find the closest position, a or b.
            if (value - a > (b - a) / 2) {
                return b;
            }
            return a;
        }
        if (!xSteps[j - 1]) {
            return value;
        }
        return xPct[j - 1] + closest(value - xPct[j - 1], xSteps[j - 1]);
    }
    //endregion
    //region Spectrum
    var Spectrum = /** @class */ (function () {
        function Spectrum(entry, snap, singleStep) {
            this.xPct = [];
            this.xVal = [];
            this.xSteps = [];
            this.xNumSteps = [];
            this.xHighestCompleteStep = [];
            this.xSteps = [singleStep || false];
            this.xNumSteps = [false];
            this.snap = snap;
            var index;
            var ordered = [];
            // Map the object keys to an array.
            Object.keys(entry).forEach(function (index) {
                ordered.push([asArray(entry[index]), index]);
            });
            // Sort all entries by value (numeric sort).
            ordered.sort(function (a, b) {
                return a[0][0] - b[0][0];
            });
            // Convert all entries to subranges.
            for (index = 0; index < ordered.length; index++) {
                this.handleEntryPoint(ordered[index][1], ordered[index][0]);
            }
            // Store the actual step values.
            // xSteps is sorted in the same order as xPct and xVal.
            this.xNumSteps = this.xSteps.slice(0);
            // Convert all numeric steps to the percentage of the subrange they represent.
            for (index = 0; index < this.xNumSteps.length; index++) {
                this.handleStepPoint(index, this.xNumSteps[index]);
            }
        }
        Spectrum.prototype.getDistance = function (value) {
            var distances = [];
            for (var index = 0; index < this.xNumSteps.length - 1; index++) {
                distances[index] = fromPercentage(this.xVal, value, index);
            }
            return distances;
        };
        // Calculate the percentual distance over the whole scale of ranges.
        // direction: 0 = backwards / 1 = forwards
        Spectrum.prototype.getAbsoluteDistance = function (value, distances, direction) {
            var xPct_index = 0;
            // Calculate range where to start calculation
            if (value < this.xPct[this.xPct.length - 1]) {
                while (value > this.xPct[xPct_index + 1]) {
                    xPct_index++;
                }
            }
            else if (value === this.xPct[this.xPct.length - 1]) {
                xPct_index = this.xPct.length - 2;
            }
            // If looking backwards and the value is exactly at a range separator then look one range further
            if (!direction && value === this.xPct[xPct_index + 1]) {
                xPct_index++;
            }
            if (distances === null) {
                distances = [];
            }
            var start_factor;
            var rest_factor = 1;
            var rest_rel_distance = distances[xPct_index];
            var range_pct = 0;
            var rel_range_distance = 0;
            var abs_distance_counter = 0;
            var range_counter = 0;
            // Calculate what part of the start range the value is
            if (direction) {
                start_factor = (value - this.xPct[xPct_index]) / (this.xPct[xPct_index + 1] - this.xPct[xPct_index]);
            }
            else {
                start_factor = (this.xPct[xPct_index + 1] - value) / (this.xPct[xPct_index + 1] - this.xPct[xPct_index]);
            }
            // Do until the complete distance across ranges is calculated
            while (rest_rel_distance > 0) {
                // Calculate the percentage of total range
                range_pct = this.xPct[xPct_index + 1 + range_counter] - this.xPct[xPct_index + range_counter];
                // Detect if the margin, padding or limit is larger then the current range and calculate
                if (distances[xPct_index + range_counter] * rest_factor + 100 - start_factor * 100 > 100) {
                    // If larger then take the percentual distance of the whole range
                    rel_range_distance = range_pct * start_factor;
                    // Rest factor of relative percentual distance still to be calculated
                    rest_factor = (rest_rel_distance - 100 * start_factor) / distances[xPct_index + range_counter];
                    // Set start factor to 1 as for next range it does not apply.
                    start_factor = 1;
                }
                else {
                    // If smaller or equal then take the percentual distance of the calculate percentual part of that range
                    rel_range_distance = ((distances[xPct_index + range_counter] * range_pct) / 100) * rest_factor;
                    // No rest left as the rest fits in current range
                    rest_factor = 0;
                }
                if (direction) {
                    abs_distance_counter = abs_distance_counter - rel_range_distance;
                    // Limit range to first range when distance becomes outside of minimum range
                    if (this.xPct.length + range_counter >= 1) {
                        range_counter--;
                    }
                }
                else {
                    abs_distance_counter = abs_distance_counter + rel_range_distance;
                    // Limit range to last range when distance becomes outside of maximum range
                    if (this.xPct.length - range_counter >= 1) {
                        range_counter++;
                    }
                }
                // Rest of relative percentual distance still to be calculated
                rest_rel_distance = distances[xPct_index + range_counter] * rest_factor;
            }
            return value + abs_distance_counter;
        };
        Spectrum.prototype.toStepping = function (value) {
            value = toStepping(this.xVal, this.xPct, value);
            return value;
        };
        Spectrum.prototype.fromStepping = function (value) {
            return fromStepping(this.xVal, this.xPct, value);
        };
        Spectrum.prototype.getStep = function (value) {
            value = getStep(this.xPct, this.xSteps, this.snap, value);
            return value;
        };
        Spectrum.prototype.getDefaultStep = function (value, isDown, size) {
            var j = getJ(value, this.xPct);
            // When at the top or stepping down, look at the previous sub-range
            if (value === 100 || (isDown && value === this.xPct[j - 1])) {
                j = Math.max(j - 1, 1);
            }
            return (this.xVal[j] - this.xVal[j - 1]) / size;
        };
        Spectrum.prototype.getNearbySteps = function (value) {
            var j = getJ(value, this.xPct);
            return {
                stepBefore: {
                    startValue: this.xVal[j - 2],
                    step: this.xNumSteps[j - 2],
                    highestStep: this.xHighestCompleteStep[j - 2],
                },
                thisStep: {
                    startValue: this.xVal[j - 1],
                    step: this.xNumSteps[j - 1],
                    highestStep: this.xHighestCompleteStep[j - 1],
                },
                stepAfter: {
                    startValue: this.xVal[j],
                    step: this.xNumSteps[j],
                    highestStep: this.xHighestCompleteStep[j],
                },
            };
        };
        Spectrum.prototype.countStepDecimals = function () {
            var stepDecimals = this.xNumSteps.map(countDecimals);
            return Math.max.apply(null, stepDecimals);
        };
        Spectrum.prototype.hasNoSize = function () {
            return this.xVal[0] === this.xVal[this.xVal.length - 1];
        };
        // Outside testing
        Spectrum.prototype.convert = function (value) {
            return this.getStep(this.toStepping(value));
        };
        Spectrum.prototype.handleEntryPoint = function (index, value) {
            var percentage;
            // Covert min/max syntax to 0 and 100.
            if (index === "min") {
                percentage = 0;
            }
            else if (index === "max") {
                percentage = 100;
            }
            else {
                percentage = parseFloat(index);
            }
            // Check for correct input.
            if (!isNumeric(percentage) || !isNumeric(value[0])) {
                throw new Error("noUiSlider: 'range' value isn't numeric.");
            }
            // Store values.
            this.xPct.push(percentage);
            this.xVal.push(value[0]);
            var value1 = Number(value[1]);
            // NaN will evaluate to false too, but to keep
            // logging clear, set step explicitly. Make sure
            // not to override the 'step' setting with false.
            if (!percentage) {
                if (!isNaN(value1)) {
                    this.xSteps[0] = value1;
                }
            }
            else {
                this.xSteps.push(isNaN(value1) ? false : value1);
            }
            this.xHighestCompleteStep.push(0);
        };
        Spectrum.prototype.handleStepPoint = function (i, n) {
            // Ignore 'false' stepping.
            if (!n) {
                return;
            }
            // Step over zero-length ranges (#948);
            if (this.xVal[i] === this.xVal[i + 1]) {
                this.xSteps[i] = this.xHighestCompleteStep[i] = this.xVal[i];
                return;
            }
            // Factor to range ratio
            this.xSteps[i] =
                fromPercentage([this.xVal[i], this.xVal[i + 1]], n, 0) / subRangeRatio(this.xPct[i], this.xPct[i + 1]);
            var totalSteps = (this.xVal[i + 1] - this.xVal[i]) / this.xNumSteps[i];
            var highestStep = Math.ceil(Number(totalSteps.toFixed(3)) - 1);
            var step = this.xVal[i] + this.xNumSteps[i] * highestStep;
            this.xHighestCompleteStep[i] = step;
        };
        return Spectrum;
    }());
    //endregion
    //region Options
    /*	Every input option is tested and parsed. This will prevent
        endless validation in internal methods. These tests are
        structured with an item for every option available. An
        option can be marked as required by setting the 'r' flag.
        The testing function is provided with three arguments:
            - The provided value for the option;
            - A reference to the options object;
            - The name for the option;

        The testing function returns false when an error is detected,
        or true when everything is OK. It can also modify the option
        object, to make sure all values can be correctly looped elsewhere. */
    //region Defaults
    var defaultFormatter = {
        to: function (value) {
            return value === undefined ? "" : value.toFixed(2);
        },
        from: Number,
    };
    var cssClasses = {
        target: "target",
        base: "base",
        origin: "origin",
        handle: "handle",
        handleLower: "handle-lower",
        handleUpper: "handle-upper",
        touchArea: "touch-area",
        horizontal: "horizontal",
        vertical: "vertical",
        background: "background",
        connect: "connect",
        connects: "connects",
        ltr: "ltr",
        rtl: "rtl",
        textDirectionLtr: "txt-dir-ltr",
        textDirectionRtl: "txt-dir-rtl",
        draggable: "draggable",
        drag: "state-drag",
        tap: "state-tap",
        active: "active",
        tooltip: "tooltip",
        pips: "pips",
        pipsHorizontal: "pips-horizontal",
        pipsVertical: "pips-vertical",
        marker: "marker",
        markerHorizontal: "marker-horizontal",
        markerVertical: "marker-vertical",
        markerNormal: "marker-normal",
        markerLarge: "marker-large",
        markerSub: "marker-sub",
        value: "value",
        valueHorizontal: "value-horizontal",
        valueVertical: "value-vertical",
        valueNormal: "value-normal",
        valueLarge: "value-large",
        valueSub: "value-sub",
    };
    // Namespaces of internal event listeners
    var INTERNAL_EVENT_NS = {
        tooltips: ".__tooltips",
        aria: ".__aria",
    };
    //endregion
    function testStep(parsed, entry) {
        if (!isNumeric(entry)) {
            throw new Error("noUiSlider: 'step' is not numeric.");
        }
        // The step option can still be used to set stepping
        // for linear sliders. Overwritten if set in 'range'.
        parsed.singleStep = entry;
    }
    function testKeyboardPageMultiplier(parsed, entry) {
        if (!isNumeric(entry)) {
            throw new Error("noUiSlider: 'keyboardPageMultiplier' is not numeric.");
        }
        parsed.keyboardPageMultiplier = entry;
    }
    function testKeyboardMultiplier(parsed, entry) {
        if (!isNumeric(entry)) {
            throw new Error("noUiSlider: 'keyboardMultiplier' is not numeric.");
        }
        parsed.keyboardMultiplier = entry;
    }
    function testKeyboardDefaultStep(parsed, entry) {
        if (!isNumeric(entry)) {
            throw new Error("noUiSlider: 'keyboardDefaultStep' is not numeric.");
        }
        parsed.keyboardDefaultStep = entry;
    }
    function testRange(parsed, entry) {
        // Filter incorrect input.
        if (typeof entry !== "object" || Array.isArray(entry)) {
            throw new Error("noUiSlider: 'range' is not an object.");
        }
        // Catch missing start or end.
        if (entry.min === undefined || entry.max === undefined) {
            throw new Error("noUiSlider: Missing 'min' or 'max' in 'range'.");
        }
        parsed.spectrum = new Spectrum(entry, parsed.snap || false, parsed.singleStep);
    }
    function testStart(parsed, entry) {
        entry = asArray(entry);
        // Validate input. Values aren't tested, as the public .val method
        // will always provide a valid location.
        if (!Array.isArray(entry) || !entry.length) {
            throw new Error("noUiSlider: 'start' option is incorrect.");
        }
        // Store the number of handles.
        parsed.handles = entry.length;
        // When the slider is initialized, the .val method will
        // be called with the start options.
        parsed.start = entry;
    }
    function testSnap(parsed, entry) {
        if (typeof entry !== "boolean") {
            throw new Error("noUiSlider: 'snap' option must be a boolean.");
        }
        // Enforce 100% stepping within subranges.
        parsed.snap = entry;
    }
    function testAnimate(parsed, entry) {
        if (typeof entry !== "boolean") {
            throw new Error("noUiSlider: 'animate' option must be a boolean.");
        }
        // Enforce 100% stepping within subranges.
        parsed.animate = entry;
    }
    function testAnimationDuration(parsed, entry) {
        if (typeof entry !== "number") {
            throw new Error("noUiSlider: 'animationDuration' option must be a number.");
        }
        parsed.animationDuration = entry;
    }
    function testConnect(parsed, entry) {
        var connect = [false];
        var i;
        // Map legacy options
        if (entry === "lower") {
            entry = [true, false];
        }
        else if (entry === "upper") {
            entry = [false, true];
        }
        // Handle boolean options
        if (entry === true || entry === false) {
            for (i = 1; i < parsed.handles; i++) {
                connect.push(entry);
            }
            connect.push(false);
        }
        // Reject invalid input
        else if (!Array.isArray(entry) || !entry.length || entry.length !== parsed.handles + 1) {
            throw new Error("noUiSlider: 'connect' option doesn't match handle count.");
        }
        else {
            connect = entry;
        }
        parsed.connect = connect;
    }
    function testOrientation(parsed, entry) {
        // Set orientation to an a numerical value for easy
        // array selection.
        switch (entry) {
            case "horizontal":
                parsed.ort = 0;
                break;
            case "vertical":
                parsed.ort = 1;
                break;
            default:
                throw new Error("noUiSlider: 'orientation' option is invalid.");
        }
    }
    function testMargin(parsed, entry) {
        if (!isNumeric(entry)) {
            throw new Error("noUiSlider: 'margin' option must be numeric.");
        }
        // Issue #582
        if (entry === 0) {
            return;
        }
        parsed.margin = parsed.spectrum.getDistance(entry);
    }
    function testLimit(parsed, entry) {
        if (!isNumeric(entry)) {
            throw new Error("noUiSlider: 'limit' option must be numeric.");
        }
        parsed.limit = parsed.spectrum.getDistance(entry);
        if (!parsed.limit || parsed.handles < 2) {
            throw new Error("noUiSlider: 'limit' option is only supported on linear sliders with 2 or more handles.");
        }
    }
    function testPadding(parsed, entry) {
        var index;
        if (!isNumeric(entry) && !Array.isArray(entry)) {
            throw new Error("noUiSlider: 'padding' option must be numeric or array of exactly 2 numbers.");
        }
        if (Array.isArray(entry) && !(entry.length === 2 || isNumeric(entry[0]) || isNumeric(entry[1]))) {
            throw new Error("noUiSlider: 'padding' option must be numeric or array of exactly 2 numbers.");
        }
        if (entry === 0) {
            return;
        }
        if (!Array.isArray(entry)) {
            entry = [entry, entry];
        }
        // 'getDistance' returns false for invalid values.
        parsed.padding = [parsed.spectrum.getDistance(entry[0]), parsed.spectrum.getDistance(entry[1])];
        for (index = 0; index < parsed.spectrum.xNumSteps.length - 1; index++) {
            // last "range" can't contain step size as it is purely an endpoint.
            if (parsed.padding[0][index] < 0 || parsed.padding[1][index] < 0) {
                throw new Error("noUiSlider: 'padding' option must be a positive number(s).");
            }
        }
        var totalPadding = entry[0] + entry[1];
        var firstValue = parsed.spectrum.xVal[0];
        var lastValue = parsed.spectrum.xVal[parsed.spectrum.xVal.length - 1];
        if (totalPadding / (lastValue - firstValue) > 1) {
            throw new Error("noUiSlider: 'padding' option must not exceed 100% of the range.");
        }
    }
    function testDirection(parsed, entry) {
        // Set direction as a numerical value for easy parsing.
        // Invert connection for RTL sliders, so that the proper
        // handles get the connect/background classes.
        switch (entry) {
            case "ltr":
                parsed.dir = 0;
                break;
            case "rtl":
                parsed.dir = 1;
                break;
            default:
                throw new Error("noUiSlider: 'direction' option was not recognized.");
        }
    }
    function testBehaviour(parsed, entry) {
        // Make sure the input is a string.
        if (typeof entry !== "string") {
            throw new Error("noUiSlider: 'behaviour' must be a string containing options.");
        }
        // Check if the string contains any keywords.
        // None are required.
        var tap = entry.indexOf("tap") >= 0;
        var drag = entry.indexOf("drag") >= 0;
        var fixed = entry.indexOf("fixed") >= 0;
        var snap = entry.indexOf("snap") >= 0;
        var hover = entry.indexOf("hover") >= 0;
        var unconstrained = entry.indexOf("unconstrained") >= 0;
        var dragAll = entry.indexOf("drag-all") >= 0;
        if (fixed) {
            if (parsed.handles !== 2) {
                throw new Error("noUiSlider: 'fixed' behaviour must be used with 2 handles");
            }
            // Use margin to enforce fixed state
            testMargin(parsed, parsed.start[1] - parsed.start[0]);
        }
        if (unconstrained && (parsed.margin || parsed.limit)) {
            throw new Error("noUiSlider: 'unconstrained' behaviour cannot be used with margin or limit");
        }
        parsed.events = {
            tap: tap || snap,
            drag: drag,
            dragAll: dragAll,
            fixed: fixed,
            snap: snap,
            hover: hover,
            unconstrained: unconstrained,
        };
    }
    function testTooltips(parsed, entry) {
        if (entry === false) {
            return;
        }
        if (entry === true || isValidPartialFormatter(entry)) {
            parsed.tooltips = [];
            for (var i = 0; i < parsed.handles; i++) {
                parsed.tooltips.push(entry);
            }
        }
        else {
            entry = asArray(entry);
            if (entry.length !== parsed.handles) {
                throw new Error("noUiSlider: must pass a formatter for all handles.");
            }
            entry.forEach(function (formatter) {
                if (typeof formatter !== "boolean" && !isValidPartialFormatter(formatter)) {
                    throw new Error("noUiSlider: 'tooltips' must be passed a formatter or 'false'.");
                }
            });
            parsed.tooltips = entry;
        }
    }
    function testHandleAttributes(parsed, entry) {
        if (entry.length !== parsed.handles) {
            throw new Error("noUiSlider: must pass a attributes for all handles.");
        }
        parsed.handleAttributes = entry;
    }
    function testAriaFormat(parsed, entry) {
        if (!isValidPartialFormatter(entry)) {
            throw new Error("noUiSlider: 'ariaFormat' requires 'to' method.");
        }
        parsed.ariaFormat = entry;
    }
    function testFormat(parsed, entry) {
        if (!isValidFormatter(entry)) {
            throw new Error("noUiSlider: 'format' requires 'to' and 'from' methods.");
        }
        parsed.format = entry;
    }
    function testKeyboardSupport(parsed, entry) {
        if (typeof entry !== "boolean") {
            throw new Error("noUiSlider: 'keyboardSupport' option must be a boolean.");
        }
        parsed.keyboardSupport = entry;
    }
    function testDocumentElement(parsed, entry) {
        // This is an advanced option. Passed values are used without validation.
        parsed.documentElement = entry;
    }
    function testCssPrefix(parsed, entry) {
        if (typeof entry !== "string" && entry !== false) {
            throw new Error("noUiSlider: 'cssPrefix' must be a string or `false`.");
        }
        parsed.cssPrefix = entry;
    }
    function testCssClasses(parsed, entry) {
        if (typeof entry !== "object") {
            throw new Error("noUiSlider: 'cssClasses' must be an object.");
        }
        if (typeof parsed.cssPrefix === "string") {
            parsed.cssClasses = {};
            Object.keys(entry).forEach(function (key) {
                parsed.cssClasses[key] = parsed.cssPrefix + entry[key];
            });
        }
        else {
            parsed.cssClasses = entry;
        }
    }
    // Test all developer settings and parse to assumption-safe values.
    function testOptions(options) {
        // To prove a fix for #537, freeze options here.
        // If the object is modified, an error will be thrown.
        // Object.freeze(options);
        var parsed = {
            margin: null,
            limit: null,
            padding: null,
            animate: true,
            animationDuration: 300,
            ariaFormat: defaultFormatter,
            format: defaultFormatter,
        };
        // Tests are executed in the order they are presented here.
        var tests = {
            step: { r: false, t: testStep },
            keyboardPageMultiplier: { r: false, t: testKeyboardPageMultiplier },
            keyboardMultiplier: { r: false, t: testKeyboardMultiplier },
            keyboardDefaultStep: { r: false, t: testKeyboardDefaultStep },
            start: { r: true, t: testStart },
            connect: { r: true, t: testConnect },
            direction: { r: true, t: testDirection },
            snap: { r: false, t: testSnap },
            animate: { r: false, t: testAnimate },
            animationDuration: { r: false, t: testAnimationDuration },
            range: { r: true, t: testRange },
            orientation: { r: false, t: testOrientation },
            margin: { r: false, t: testMargin },
            limit: { r: false, t: testLimit },
            padding: { r: false, t: testPadding },
            behaviour: { r: true, t: testBehaviour },
            ariaFormat: { r: false, t: testAriaFormat },
            format: { r: false, t: testFormat },
            tooltips: { r: false, t: testTooltips },
            keyboardSupport: { r: true, t: testKeyboardSupport },
            documentElement: { r: false, t: testDocumentElement },
            cssPrefix: { r: true, t: testCssPrefix },
            cssClasses: { r: true, t: testCssClasses },
            handleAttributes: { r: false, t: testHandleAttributes },
        };
        var defaults = {
            connect: false,
            direction: "ltr",
            behaviour: "tap",
            orientation: "horizontal",
            keyboardSupport: true,
            cssPrefix: "noUi-",
            cssClasses: cssClasses,
            keyboardPageMultiplier: 5,
            keyboardMultiplier: 1,
            keyboardDefaultStep: 10,
        };
        // AriaFormat defaults to regular format, if any.
        if (options.format && !options.ariaFormat) {
            options.ariaFormat = options.format;
        }
        // Run all options through a testing mechanism to ensure correct
        // input. It should be noted that options might get modified to
        // be handled properly. E.g. wrapping integers in arrays.
        Object.keys(tests).forEach(function (name) {
            // If the option isn't set, but it is required, throw an error.
            if (!isSet(options[name]) && defaults[name] === undefined) {
                if (tests[name].r) {
                    throw new Error("noUiSlider: '" + name + "' is required.");
                }
                return;
            }
            tests[name].t(parsed, !isSet(options[name]) ? defaults[name] : options[name]);
        });
        // Forward pips options
        parsed.pips = options.pips;
        // All recent browsers accept unprefixed transform.
        // We need -ms- for IE9 and -webkit- for older Android;
        // Assume use of -webkit- if unprefixed and -ms- are not supported.
        // https://caniuse.com/#feat=transforms2d
        var d = document.createElement("div");
        var msPrefix = d.style.msTransform !== undefined;
        var noPrefix = d.style.transform !== undefined;
        parsed.transformRule = noPrefix ? "transform" : msPrefix ? "msTransform" : "webkitTransform";
        // Pips don't move, so we can place them using left/top.
        var styles = [
            ["left", "top"],
            ["right", "bottom"],
        ];
        parsed.style = styles[parsed.dir][parsed.ort];
        return parsed;
    }
    //endregion
    function scope(target, options, originalOptions) {
        var actions = getActions();
        var supportsTouchActionNone = getSupportsTouchActionNone();
        var supportsPassive = supportsTouchActionNone && getSupportsPassive();
        // All variables local to 'scope' are prefixed with 'scope_'
        // Slider DOM Nodes
        var scope_Target = target;
        var scope_Base;
        var scope_Handles;
        var scope_Connects;
        var scope_Pips;
        var scope_Tooltips;
        // Slider state values
        var scope_Spectrum = options.spectrum;
        var scope_Values = [];
        var scope_Locations = [];
        var scope_HandleNumbers = [];
        var scope_ActiveHandlesCount = 0;
        var scope_Events = {};
        // Document Nodes
        var scope_Document = target.ownerDocument;
        var scope_DocumentElement = options.documentElement || scope_Document.documentElement;
        var scope_Body = scope_Document.body;
        // For horizontal sliders in standard ltr documents,
        // make .noUi-origin overflow to the left so the document doesn't scroll.
        var scope_DirOffset = scope_Document.dir === "rtl" || options.ort === 1 ? 0 : 100;
        // Creates a node, adds it to target, returns the new node.
        function addNodeTo(addTarget, className) {
            var div = scope_Document.createElement("div");
            if (className) {
                addClass(div, className);
            }
            addTarget.appendChild(div);
            return div;
        }
        // Append a origin to the base
        function addOrigin(base, handleNumber) {
            var origin = addNodeTo(base, options.cssClasses.origin);
            var handle = addNodeTo(origin, options.cssClasses.handle);
            addNodeTo(handle, options.cssClasses.touchArea);
            handle.setAttribute("data-handle", String(handleNumber));
            if (options.keyboardSupport) {
                // https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/tabindex
                // 0 = focusable and reachable
                handle.setAttribute("tabindex", "0");
                handle.addEventListener("keydown", function (event) {
                    return eventKeydown(event, handleNumber);
                });
            }
            if (options.handleAttributes !== undefined) {
                var attributes_1 = options.handleAttributes[handleNumber];
                Object.keys(attributes_1).forEach(function (attribute) {
                    handle.setAttribute(attribute, attributes_1[attribute]);
                });
            }
            handle.setAttribute("role", "slider");
            handle.setAttribute("aria-orientation", options.ort ? "vertical" : "horizontal");
            if (handleNumber === 0) {
                addClass(handle, options.cssClasses.handleLower);
            }
            else if (handleNumber === options.handles - 1) {
                addClass(handle, options.cssClasses.handleUpper);
            }
            return origin;
        }
        // Insert nodes for connect elements
        function addConnect(base, add) {
            if (!add) {
                return false;
            }
            return addNodeTo(base, options.cssClasses.connect);
        }
        // Add handles to the slider base.
        function addElements(connectOptions, base) {
            var connectBase = addNodeTo(base, options.cssClasses.connects);
            scope_Handles = [];
            scope_Connects = [];
            scope_Connects.push(addConnect(connectBase, connectOptions[0]));
            // [::::O====O====O====]
            // connectOptions = [0, 1, 1, 1]
            for (var i = 0; i < options.handles; i++) {
                // Keep a list of all added handles.
                scope_Handles.push(addOrigin(base, i));
                scope_HandleNumbers[i] = i;
                scope_Connects.push(addConnect(connectBase, connectOptions[i + 1]));
            }
        }
        // Initialize a single slider.
        function addSlider(addTarget) {
            // Apply classes and data to the target.
            addClass(addTarget, options.cssClasses.target);
            if (options.dir === 0) {
                addClass(addTarget, options.cssClasses.ltr);
            }
            else {
                addClass(addTarget, options.cssClasses.rtl);
            }
            if (options.ort === 0) {
                addClass(addTarget, options.cssClasses.horizontal);
            }
            else {
                addClass(addTarget, options.cssClasses.vertical);
            }
            var textDirection = getComputedStyle(addTarget).direction;
            if (textDirection === "rtl") {
                addClass(addTarget, options.cssClasses.textDirectionRtl);
            }
            else {
                addClass(addTarget, options.cssClasses.textDirectionLtr);
            }
            return addNodeTo(addTarget, options.cssClasses.base);
        }
        function addTooltip(handle, handleNumber) {
            if (!options.tooltips || !options.tooltips[handleNumber]) {
                return false;
            }
            return addNodeTo(handle.firstChild, options.cssClasses.tooltip);
        }
        function isSliderDisabled() {
            return scope_Target.hasAttribute("disabled");
        }
        // Disable the slider dragging if any handle is disabled
        function isHandleDisabled(handleNumber) {
            var handleOrigin = scope_Handles[handleNumber];
            return handleOrigin.hasAttribute("disabled");
        }
        function removeTooltips() {
            if (scope_Tooltips) {
                removeEvent("update" + INTERNAL_EVENT_NS.tooltips);
                scope_Tooltips.forEach(function (tooltip) {
                    if (tooltip) {
                        removeElement(tooltip);
                    }
                });
                scope_Tooltips = null;
            }
        }
        // The tooltips option is a shorthand for using the 'update' event.
        function tooltips() {
            removeTooltips();
            // Tooltips are added with options.tooltips in original order.
            scope_Tooltips = scope_Handles.map(addTooltip);
            bindEvent("update" + INTERNAL_EVENT_NS.tooltips, function (values, handleNumber, unencoded) {
                if (!scope_Tooltips || !options.tooltips) {
                    return;
                }
                if (scope_Tooltips[handleNumber] === false) {
                    return;
                }
                var formattedValue = values[handleNumber];
                if (options.tooltips[handleNumber] !== true) {
                    formattedValue = options.tooltips[handleNumber].to(unencoded[handleNumber]);
                }
                scope_Tooltips[handleNumber].innerHTML = formattedValue;
            });
        }
        function aria() {
            removeEvent("update" + INTERNAL_EVENT_NS.aria);
            bindEvent("update" + INTERNAL_EVENT_NS.aria, function (values, handleNumber, unencoded, tap, positions) {
                // Update Aria Values for all handles, as a change in one changes min and max values for the next.
                scope_HandleNumbers.forEach(function (index) {
                    var handle = scope_Handles[index];
                    var min = checkHandlePosition(scope_Locations, index, 0, true, true, true);
                    var max = checkHandlePosition(scope_Locations, index, 100, true, true, true);
                    var now = positions[index];
                    // Formatted value for display
                    var text = String(options.ariaFormat.to(unencoded[index]));
                    // Map to slider range values
                    min = scope_Spectrum.fromStepping(min).toFixed(1);
                    max = scope_Spectrum.fromStepping(max).toFixed(1);
                    now = scope_Spectrum.fromStepping(now).toFixed(1);
                    handle.children[0].setAttribute("aria-valuemin", min);
                    handle.children[0].setAttribute("aria-valuemax", max);
                    handle.children[0].setAttribute("aria-valuenow", now);
                    handle.children[0].setAttribute("aria-valuetext", text);
                });
            });
        }
        function getGroup(pips) {
            // Use the range.
            if (pips.mode === exports.PipsMode.Range || pips.mode === exports.PipsMode.Steps) {
                return scope_Spectrum.xVal;
            }
            if (pips.mode === exports.PipsMode.Count) {
                if (pips.values < 2) {
                    throw new Error("noUiSlider: 'values' (>= 2) required for mode 'count'.");
                }
                // Divide 0 - 100 in 'count' parts.
                var interval = pips.values - 1;
                var spread = 100 / interval;
                var values = [];
                // List these parts and have them handled as 'positions'.
                while (interval--) {
                    values[interval] = interval * spread;
                }
                values.push(100);
                return mapToRange(values, pips.stepped);
            }
            if (pips.mode === exports.PipsMode.Positions) {
                // Map all percentages to on-range values.
                return mapToRange(pips.values, pips.stepped);
            }
            if (pips.mode === exports.PipsMode.Values) {
                // If the value must be stepped, it needs to be converted to a percentage first.
                if (pips.stepped) {
                    return pips.values.map(function (value) {
                        // Convert to percentage, apply step, return to value.
                        return scope_Spectrum.fromStepping(scope_Spectrum.getStep(scope_Spectrum.toStepping(value)));
                    });
                }
                // Otherwise, we can simply use the values.
                return pips.values;
            }
            return []; // pips.mode = never
        }
        function mapToRange(values, stepped) {
            return values.map(function (value) {
                return scope_Spectrum.fromStepping(stepped ? scope_Spectrum.getStep(value) : value);
            });
        }
        function generateSpread(pips) {
            function safeIncrement(value, increment) {
                // Avoid floating point variance by dropping the smallest decimal places.
                return Number((value + increment).toFixed(7));
            }
            var group = getGroup(pips);
            var indexes = {};
            var firstInRange = scope_Spectrum.xVal[0];
            var lastInRange = scope_Spectrum.xVal[scope_Spectrum.xVal.length - 1];
            var ignoreFirst = false;
            var ignoreLast = false;
            var prevPct = 0;
            // Create a copy of the group, sort it and filter away all duplicates.
            group = unique(group.slice().sort(function (a, b) {
                return a - b;
            }));
            // Make sure the range starts with the first element.
            if (group[0] !== firstInRange) {
                group.unshift(firstInRange);
                ignoreFirst = true;
            }
            // Likewise for the last one.
            if (group[group.length - 1] !== lastInRange) {
                group.push(lastInRange);
                ignoreLast = true;
            }
            group.forEach(function (current, index) {
                // Get the current step and the lower + upper positions.
                var step;
                var i;
                var q;
                var low = current;
                var high = group[index + 1];
                var newPct;
                var pctDifference;
                var pctPos;
                var type;
                var steps;
                var realSteps;
                var stepSize;
                var isSteps = pips.mode === exports.PipsMode.Steps;
                // When using 'steps' mode, use the provided steps.
                // Otherwise, we'll step on to the next subrange.
                if (isSteps) {
                    step = scope_Spectrum.xNumSteps[index];
                }
                // Default to a 'full' step.
                if (!step) {
                    step = high - low;
                }
                // If high is undefined we are at the last subrange. Make sure it iterates once (#1088)
                if (high === undefined) {
                    high = low;
                }
                // Make sure step isn't 0, which would cause an infinite loop (#654)
                step = Math.max(step, 0.0000001);
                // Find all steps in the subrange.
                for (i = low; i <= high; i = safeIncrement(i, step)) {
                    // Get the percentage value for the current step,
                    // calculate the size for the subrange.
                    newPct = scope_Spectrum.toStepping(i);
                    pctDifference = newPct - prevPct;
                    steps = pctDifference / (pips.density || 1);
                    realSteps = Math.round(steps);
                    // This ratio represents the amount of percentage-space a point indicates.
                    // For a density 1 the points/percentage = 1. For density 2, that percentage needs to be re-divided.
                    // Round the percentage offset to an even number, then divide by two
                    // to spread the offset on both sides of the range.
                    stepSize = pctDifference / realSteps;
                    // Divide all points evenly, adding the correct number to this subrange.
                    // Run up to <= so that 100% gets a point, event if ignoreLast is set.
                    for (q = 1; q <= realSteps; q += 1) {
                        // The ratio between the rounded value and the actual size might be ~1% off.
                        // Correct the percentage offset by the number of points
                        // per subrange. density = 1 will result in 100 points on the
                        // full range, 2 for 50, 4 for 25, etc.
                        pctPos = prevPct + q * stepSize;
                        indexes[pctPos.toFixed(5)] = [scope_Spectrum.fromStepping(pctPos), 0];
                    }
                    // Determine the point type.
                    type = group.indexOf(i) > -1 ? exports.PipsType.LargeValue : isSteps ? exports.PipsType.SmallValue : exports.PipsType.NoValue;
                    // Enforce the 'ignoreFirst' option by overwriting the type for 0.
                    if (!index && ignoreFirst && i !== high) {
                        type = 0;
                    }
                    if (!(i === high && ignoreLast)) {
                        // Mark the 'type' of this point. 0 = plain, 1 = real value, 2 = step value.
                        indexes[newPct.toFixed(5)] = [i, type];
                    }
                    // Update the percentage count.
                    prevPct = newPct;
                }
            });
            return indexes;
        }
        function addMarking(spread, filterFunc, formatter) {
            var _a, _b;
            var element = scope_Document.createElement("div");
            var valueSizeClasses = (_a = {},
                _a[exports.PipsType.None] = "",
                _a[exports.PipsType.NoValue] = options.cssClasses.valueNormal,
                _a[exports.PipsType.LargeValue] = options.cssClasses.valueLarge,
                _a[exports.PipsType.SmallValue] = options.cssClasses.valueSub,
                _a);
            var markerSizeClasses = (_b = {},
                _b[exports.PipsType.None] = "",
                _b[exports.PipsType.NoValue] = options.cssClasses.markerNormal,
                _b[exports.PipsType.LargeValue] = options.cssClasses.markerLarge,
                _b[exports.PipsType.SmallValue] = options.cssClasses.markerSub,
                _b);
            var valueOrientationClasses = [options.cssClasses.valueHorizontal, options.cssClasses.valueVertical];
            var markerOrientationClasses = [options.cssClasses.markerHorizontal, options.cssClasses.markerVertical];
            addClass(element, options.cssClasses.pips);
            addClass(element, options.ort === 0 ? options.cssClasses.pipsHorizontal : options.cssClasses.pipsVertical);
            function getClasses(type, source) {
                var a = source === options.cssClasses.value;
                var orientationClasses = a ? valueOrientationClasses : markerOrientationClasses;
                var sizeClasses = a ? valueSizeClasses : markerSizeClasses;
                return source + " " + orientationClasses[options.ort] + " " + sizeClasses[type];
            }
            function addSpread(offset, value, type) {
                // Apply the filter function, if it is set.
                type = filterFunc ? filterFunc(value, type) : type;
                if (type === exports.PipsType.None) {
                    return;
                }
                // Add a marker for every point
                var node = addNodeTo(element, false);
                node.className = getClasses(type, options.cssClasses.marker);
                node.style[options.style] = offset + "%";
                // Values are only appended for points marked '1' or '2'.
                if (type > exports.PipsType.NoValue) {
                    node = addNodeTo(element, false);
                    node.className = getClasses(type, options.cssClasses.value);
                    node.setAttribute("data-value", String(value));
                    node.style[options.style] = offset + "%";
                    node.innerHTML = String(formatter.to(value));
                }
            }
            // Append all points.
            Object.keys(spread).forEach(function (offset) {
                addSpread(offset, spread[offset][0], spread[offset][1]);
            });
            return element;
        }
        function removePips() {
            if (scope_Pips) {
                removeElement(scope_Pips);
                scope_Pips = null;
            }
        }
        function pips(pips) {
            // Fix #669
            removePips();
            var spread = generateSpread(pips);
            var filter = pips.filter;
            var format = pips.format || {
                to: function (value) {
                    return String(Math.round(value));
                },
            };
            scope_Pips = scope_Target.appendChild(addMarking(spread, filter, format));
            return scope_Pips;
        }
        // Shorthand for base dimensions.
        function baseSize() {
            var rect = scope_Base.getBoundingClientRect();
            var alt = ("offset" + ["Width", "Height"][options.ort]);
            return options.ort === 0 ? rect.width || scope_Base[alt] : rect.height || scope_Base[alt];
        }
        // Handler for attaching events trough a proxy.
        function attachEvent(events, element, callback, data) {
            // This function can be used to 'filter' events to the slider.
            // element is a node, not a nodeList
            var method = function (event) {
                var e = fixEvent(event, data.pageOffset, data.target || element);
                // fixEvent returns false if this event has a different target
                // when handling (multi-) touch events;
                if (!e) {
                    return false;
                }
                // doNotReject is passed by all end events to make sure released touches
                // are not rejected, leaving the slider "stuck" to the cursor;
                if (isSliderDisabled() && !data.doNotReject) {
                    return false;
                }
                // Stop if an active 'tap' transition is taking place.
                if (hasClass(scope_Target, options.cssClasses.tap) && !data.doNotReject) {
                    return false;
                }
                // Ignore right or middle clicks on start #454
                if (events === actions.start && e.buttons !== undefined && e.buttons > 1) {
                    return false;
                }
                // Ignore right or middle clicks on start #454
                if (data.hover && e.buttons) {
                    return false;
                }
                // 'supportsPassive' is only true if a browser also supports touch-action: none in CSS.
                // iOS safari does not, so it doesn't get to benefit from passive scrolling. iOS does support
                // touch-action: manipulation, but that allows panning, which breaks
                // sliders after zooming/on non-responsive pages.
                // See: https://bugs.webkit.org/show_bug.cgi?id=133112
                if (!supportsPassive) {
                    e.preventDefault();
                }
                e.calcPoint = e.points[options.ort];
                // Call the event handler with the event [ and additional data ].
                callback(e, data);
                return;
            };
            var methods = [];
            // Bind a closure on the target for every event type.
            events.split(" ").forEach(function (eventName) {
                element.addEventListener(eventName, method, supportsPassive ? { passive: true } : false);
                methods.push([eventName, method]);
            });
            return methods;
        }
        // Provide a clean event with standardized offset values.
        function fixEvent(e, pageOffset, eventTarget) {
            // Filter the event to register the type, which can be
            // touch, mouse or pointer. Offset changes need to be
            // made on an event specific basis.
            var touch = e.type.indexOf("touch") === 0;
            var mouse = e.type.indexOf("mouse") === 0;
            var pointer = e.type.indexOf("pointer") === 0;
            var x = 0;
            var y = 0;
            // IE10 implemented pointer events with a prefix;
            if (e.type.indexOf("MSPointer") === 0) {
                pointer = true;
            }
            // Erroneous events seem to be passed in occasionally on iOS/iPadOS after user finishes interacting with
            // the slider. They appear to be of type MouseEvent, yet they don't have usual properties set. Ignore
            // events that have no touches or buttons associated with them. (#1057, #1079, #1095)
            if (e.type === "mousedown" && !e.buttons && !e.touches) {
                return false;
            }
            // The only thing one handle should be concerned about is the touches that originated on top of it.
            if (touch) {
                // Returns true if a touch originated on the target.
                var isTouchOnTarget = function (checkTouch) {
                    var target = checkTouch.target;
                    return (target === eventTarget ||
                        eventTarget.contains(target) ||
                        (e.composed && e.composedPath().shift() === eventTarget));
                };
                // In the case of touchstart events, we need to make sure there is still no more than one
                // touch on the target so we look amongst all touches.
                if (e.type === "touchstart") {
                    var targetTouches = Array.prototype.filter.call(e.touches, isTouchOnTarget);
                    // Do not support more than one touch per handle.
                    if (targetTouches.length > 1) {
                        return false;
                    }
                    x = targetTouches[0].pageX;
                    y = targetTouches[0].pageY;
                }
                else {
                    // In the other cases, find on changedTouches is enough.
                    var targetTouch = Array.prototype.find.call(e.changedTouches, isTouchOnTarget);
                    // Cancel if the target touch has not moved.
                    if (!targetTouch) {
                        return false;
                    }
                    x = targetTouch.pageX;
                    y = targetTouch.pageY;
                }
            }
            pageOffset = pageOffset || getPageOffset(scope_Document);
            if (mouse || pointer) {
                x = e.clientX + pageOffset.x;
                y = e.clientY + pageOffset.y;
            }
            e.pageOffset = pageOffset;
            e.points = [x, y];
            e.cursor = mouse || pointer; // Fix #435
            return e;
        }
        // Translate a coordinate in the document to a percentage on the slider
        function calcPointToPercentage(calcPoint) {
            var location = calcPoint - offset(scope_Base, options.ort);
            var proposal = (location * 100) / baseSize();
            // Clamp proposal between 0% and 100%
            // Out-of-bound coordinates may occur when .noUi-base pseudo-elements
            // are used (e.g. contained handles feature)
            proposal = limit(proposal);
            return options.dir ? 100 - proposal : proposal;
        }
        // Find handle closest to a certain percentage on the slider
        function getClosestHandle(clickedPosition) {
            var smallestDifference = 100;
            var handleNumber = false;
            scope_Handles.forEach(function (handle, index) {
                // Disabled handles are ignored
                if (isHandleDisabled(index)) {
                    return;
                }
                var handlePosition = scope_Locations[index];
                var differenceWithThisHandle = Math.abs(handlePosition - clickedPosition);
                // Initial state
                var clickAtEdge = differenceWithThisHandle === 100 && smallestDifference === 100;
                // Difference with this handle is smaller than the previously checked handle
                var isCloser = differenceWithThisHandle < smallestDifference;
                var isCloserAfter = differenceWithThisHandle <= smallestDifference && clickedPosition > handlePosition;
                if (isCloser || isCloserAfter || clickAtEdge) {
                    handleNumber = index;
                    smallestDifference = differenceWithThisHandle;
                }
            });
            return handleNumber;
        }
        // Fire 'end' when a mouse or pen leaves the document.
        function documentLeave(event, data) {
            if (event.type === "mouseout" &&
                event.target.nodeName === "HTML" &&
                event.relatedTarget === null) {
                eventEnd(event, data);
            }
        }
        // Handle movement on document for handle and range drag.
        function eventMove(event, data) {
            // Fix #498
            // Check value of .buttons in 'start' to work around a bug in IE10 mobile (data.buttonsProperty).
            // https://connect.microsoft.com/IE/feedback/details/927005/mobile-ie10-windows-phone-buttons-property-of-pointermove-event-always-zero
            // IE9 has .buttons and .which zero on mousemove.
            // Firefox breaks the spec MDN defines.
            if (navigator.appVersion.indexOf("MSIE 9") === -1 && event.buttons === 0 && data.buttonsProperty !== 0) {
                return eventEnd(event, data);
            }
            // Check if we are moving up or down
            var movement = (options.dir ? -1 : 1) * (event.calcPoint - data.startCalcPoint);
            // Convert the movement into a percentage of the slider width/height
            var proposal = (movement * 100) / data.baseSize;
            moveHandles(movement > 0, proposal, data.locations, data.handleNumbers, data.connect);
        }
        // Unbind move events on document, call callbacks.
        function eventEnd(event, data) {
            // The handle is no longer active, so remove the class.
            if (data.handle) {
                removeClass(data.handle, options.cssClasses.active);
                scope_ActiveHandlesCount -= 1;
            }
            // Unbind the move and end events, which are added on 'start'.
            data.listeners.forEach(function (c) {
                scope_DocumentElement.removeEventListener(c[0], c[1]);
            });
            if (scope_ActiveHandlesCount === 0) {
                // Remove dragging class.
                removeClass(scope_Target, options.cssClasses.drag);
                setZindex();
                // Remove cursor styles and text-selection events bound to the body.
                if (event.cursor) {
                    scope_Body.style.cursor = "";
                    scope_Body.removeEventListener("selectstart", preventDefault);
                }
            }
            data.handleNumbers.forEach(function (handleNumber) {
                fireEvent("change", handleNumber);
                fireEvent("set", handleNumber);
                fireEvent("end", handleNumber);
            });
        }
        // Bind move events on document.
        function eventStart(event, data) {
            // Ignore event if any handle is disabled
            if (data.handleNumbers.some(isHandleDisabled)) {
                return;
            }
            var handle;
            if (data.handleNumbers.length === 1) {
                var handleOrigin = scope_Handles[data.handleNumbers[0]];
                handle = handleOrigin.children[0];
                scope_ActiveHandlesCount += 1;
                // Mark the handle as 'active' so it can be styled.
                addClass(handle, options.cssClasses.active);
            }
            // A drag should never propagate up to the 'tap' event.
            event.stopPropagation();
            // Record the event listeners.
            var listeners = [];
            // Attach the move and end events.
            var moveEvent = attachEvent(actions.move, scope_DocumentElement, eventMove, {
                // The event target has changed so we need to propagate the original one so that we keep
                // relying on it to extract target touches.
                target: event.target,
                handle: handle,
                connect: data.connect,
                listeners: listeners,
                startCalcPoint: event.calcPoint,
                baseSize: baseSize(),
                pageOffset: event.pageOffset,
                handleNumbers: data.handleNumbers,
                buttonsProperty: event.buttons,
                locations: scope_Locations.slice(),
            });
            var endEvent = attachEvent(actions.end, scope_DocumentElement, eventEnd, {
                target: event.target,
                handle: handle,
                listeners: listeners,
                doNotReject: true,
                handleNumbers: data.handleNumbers,
            });
            var outEvent = attachEvent("mouseout", scope_DocumentElement, documentLeave, {
                target: event.target,
                handle: handle,
                listeners: listeners,
                doNotReject: true,
                handleNumbers: data.handleNumbers,
            });
            // We want to make sure we pushed the listeners in the listener list rather than creating
            // a new one as it has already been passed to the event handlers.
            listeners.push.apply(listeners, moveEvent.concat(endEvent, outEvent));
            // Text selection isn't an issue on touch devices,
            // so adding cursor styles can be skipped.
            if (event.cursor) {
                // Prevent the 'I' cursor and extend the range-drag cursor.
                scope_Body.style.cursor = getComputedStyle(event.target).cursor;
                // Mark the target with a dragging state.
                if (scope_Handles.length > 1) {
                    addClass(scope_Target, options.cssClasses.drag);
                }
                // Prevent text selection when dragging the handles.
                // In noUiSlider <= 9.2.0, this was handled by calling preventDefault on mouse/touch start/move,
                // which is scroll blocking. The selectstart event is supported by FireFox starting from version 52,
                // meaning the only holdout is iOS Safari. This doesn't matter: text selection isn't triggered there.
                // The 'cursor' flag is false.
                // See: http://caniuse.com/#search=selectstart
                scope_Body.addEventListener("selectstart", preventDefault, false);
            }
            data.handleNumbers.forEach(function (handleNumber) {
                fireEvent("start", handleNumber);
            });
        }
        // Move closest handle to tapped location.
        function eventTap(event) {
            // The tap event shouldn't propagate up
            event.stopPropagation();
            var proposal = calcPointToPercentage(event.calcPoint);
            var handleNumber = getClosestHandle(proposal);
            // Tackle the case that all handles are 'disabled'.
            if (handleNumber === false) {
                return;
            }
            // Flag the slider as it is now in a transitional state.
            // Transition takes a configurable amount of ms (default 300). Re-enable the slider after that.
            if (!options.events.snap) {
                addClassFor(scope_Target, options.cssClasses.tap, options.animationDuration);
            }
            setHandle(handleNumber, proposal, true, true);
            setZindex();
            fireEvent("slide", handleNumber, true);
            fireEvent("update", handleNumber, true);
            if (!options.events.snap) {
                fireEvent("change", handleNumber, true);
                fireEvent("set", handleNumber, true);
            }
            else {
                eventStart(event, { handleNumbers: [handleNumber] });
            }
        }
        // Fires a 'hover' event for a hovered mouse/pen position.
        function eventHover(event) {
            var proposal = calcPointToPercentage(event.calcPoint);
            var to = scope_Spectrum.getStep(proposal);
            var value = scope_Spectrum.fromStepping(to);
            Object.keys(scope_Events).forEach(function (targetEvent) {
                if ("hover" === targetEvent.split(".")[0]) {
                    scope_Events[targetEvent].forEach(function (callback) {
                        callback.call(scope_Self, value);
                    });
                }
            });
        }
        // Handles keydown on focused handles
        // Don't move the document when pressing arrow keys on focused handles
        function eventKeydown(event, handleNumber) {
            if (isSliderDisabled() || isHandleDisabled(handleNumber)) {
                return false;
            }
            var horizontalKeys = ["Left", "Right"];
            var verticalKeys = ["Down", "Up"];
            var largeStepKeys = ["PageDown", "PageUp"];
            var edgeKeys = ["Home", "End"];
            if (options.dir && !options.ort) {
                // On an right-to-left slider, the left and right keys act inverted
                horizontalKeys.reverse();
            }
            else if (options.ort && !options.dir) {
                // On a top-to-bottom slider, the up and down keys act inverted
                verticalKeys.reverse();
                largeStepKeys.reverse();
            }
            // Strip "Arrow" for IE compatibility. https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key
            var key = event.key.replace("Arrow", "");
            var isLargeDown = key === largeStepKeys[0];
            var isLargeUp = key === largeStepKeys[1];
            var isDown = key === verticalKeys[0] || key === horizontalKeys[0] || isLargeDown;
            var isUp = key === verticalKeys[1] || key === horizontalKeys[1] || isLargeUp;
            var isMin = key === edgeKeys[0];
            var isMax = key === edgeKeys[1];
            if (!isDown && !isUp && !isMin && !isMax) {
                return true;
            }
            event.preventDefault();
            var to;
            if (isUp || isDown) {
                var direction = isDown ? 0 : 1;
                var steps = getNextStepsForHandle(handleNumber);
                var step = steps[direction];
                // At the edge of a slider, do nothing
                if (step === null) {
                    return false;
                }
                // No step set, use the default of 10% of the sub-range
                if (step === false) {
                    step = scope_Spectrum.getDefaultStep(scope_Locations[handleNumber], isDown, options.keyboardDefaultStep);
                }
                if (isLargeUp || isLargeDown) {
                    step *= options.keyboardPageMultiplier;
                }
                else {
                    step *= options.keyboardMultiplier;
                }
                // Step over zero-length ranges (#948);
                step = Math.max(step, 0.0000001);
                // Decrement for down steps
                step = (isDown ? -1 : 1) * step;
                to = scope_Values[handleNumber] + step;
            }
            else if (isMax) {
                // End key
                to = options.spectrum.xVal[options.spectrum.xVal.length - 1];
            }
            else {
                // Home key
                to = options.spectrum.xVal[0];
            }
            setHandle(handleNumber, scope_Spectrum.toStepping(to), true, true);
            fireEvent("slide", handleNumber);
            fireEvent("update", handleNumber);
            fireEvent("change", handleNumber);
            fireEvent("set", handleNumber);
            return false;
        }
        // Attach events to several slider parts.
        function bindSliderEvents(behaviour) {
            // Attach the standard drag event to the handles.
            if (!behaviour.fixed) {
                scope_Handles.forEach(function (handle, index) {
                    // These events are only bound to the visual handle
                    // element, not the 'real' origin element.
                    attachEvent(actions.start, handle.children[0], eventStart, {
                        handleNumbers: [index],
                    });
                });
            }
            // Attach the tap event to the slider base.
            if (behaviour.tap) {
                attachEvent(actions.start, scope_Base, eventTap, {});
            }
            // Fire hover events
            if (behaviour.hover) {
                attachEvent(actions.move, scope_Base, eventHover, {
                    hover: true,
                });
            }
            // Make the range draggable.
            if (behaviour.drag) {
                scope_Connects.forEach(function (connect, index) {
                    if (connect === false || index === 0 || index === scope_Connects.length - 1) {
                        return;
                    }
                    var handleBefore = scope_Handles[index - 1];
                    var handleAfter = scope_Handles[index];
                    var eventHolders = [connect];
                    var handlesToDrag = [handleBefore, handleAfter];
                    var handleNumbersToDrag = [index - 1, index];
                    addClass(connect, options.cssClasses.draggable);
                    // When the range is fixed, the entire range can
                    // be dragged by the handles. The handle in the first
                    // origin will propagate the start event upward,
                    // but it needs to be bound manually on the other.
                    if (behaviour.fixed) {
                        eventHolders.push(handleBefore.children[0]);
                        eventHolders.push(handleAfter.children[0]);
                    }
                    if (behaviour.dragAll) {
                        handlesToDrag = scope_Handles;
                        handleNumbersToDrag = scope_HandleNumbers;
                    }
                    eventHolders.forEach(function (eventHolder) {
                        attachEvent(actions.start, eventHolder, eventStart, {
                            handles: handlesToDrag,
                            handleNumbers: handleNumbersToDrag,
                            connect: connect,
                        });
                    });
                });
            }
        }
        // Attach an event to this slider, possibly including a namespace
        function bindEvent(namespacedEvent, callback) {
            scope_Events[namespacedEvent] = scope_Events[namespacedEvent] || [];
            scope_Events[namespacedEvent].push(callback);
            // If the event bound is 'update,' fire it immediately for all handles.
            if (namespacedEvent.split(".")[0] === "update") {
                scope_Handles.forEach(function (a, index) {
                    fireEvent("update", index);
                });
            }
        }
        function isInternalNamespace(namespace) {
            return namespace === INTERNAL_EVENT_NS.aria || namespace === INTERNAL_EVENT_NS.tooltips;
        }
        // Undo attachment of event
        function removeEvent(namespacedEvent) {
            var event = namespacedEvent && namespacedEvent.split(".")[0];
            var namespace = event ? namespacedEvent.substring(event.length) : namespacedEvent;
            Object.keys(scope_Events).forEach(function (bind) {
                var tEvent = bind.split(".")[0];
                var tNamespace = bind.substring(tEvent.length);
                if ((!event || event === tEvent) && (!namespace || namespace === tNamespace)) {
                    // only delete protected internal event if intentional
                    if (!isInternalNamespace(tNamespace) || namespace === tNamespace) {
                        delete scope_Events[bind];
                    }
                }
            });
        }
        // External event handling
        function fireEvent(eventName, handleNumber, tap) {
            Object.keys(scope_Events).forEach(function (targetEvent) {
                var eventType = targetEvent.split(".")[0];
                if (eventName === eventType) {
                    scope_Events[targetEvent].forEach(function (callback) {
                        callback.call(
                        // Use the slider public API as the scope ('this')
                        scope_Self, 
                        // Return values as array, so arg_1[arg_2] is always valid.
                        scope_Values.map(options.format.to), 
                        // Handle index, 0 or 1
                        handleNumber, 
                        // Un-formatted slider values
                        scope_Values.slice(), 
                        // Event is fired by tap, true or false
                        tap || false, 
                        // Left offset of the handle, in relation to the slider
                        scope_Locations.slice(), 
                        // add the slider public API to an accessible parameter when this is unavailable
                        scope_Self);
                    });
                }
            });
        }
        // Split out the handle positioning logic so the Move event can use it, too
        function checkHandlePosition(reference, handleNumber, to, lookBackward, lookForward, getValue) {
            var distance;
            // For sliders with multiple handles, limit movement to the other handle.
            // Apply the margin option by adding it to the handle positions.
            if (scope_Handles.length > 1 && !options.events.unconstrained) {
                if (lookBackward && handleNumber > 0) {
                    distance = scope_Spectrum.getAbsoluteDistance(reference[handleNumber - 1], options.margin, false);
                    to = Math.max(to, distance);
                }
                if (lookForward && handleNumber < scope_Handles.length - 1) {
                    distance = scope_Spectrum.getAbsoluteDistance(reference[handleNumber + 1], options.margin, true);
                    to = Math.min(to, distance);
                }
            }
            // The limit option has the opposite effect, limiting handles to a
            // maximum distance from another. Limit must be > 0, as otherwise
            // handles would be unmovable.
            if (scope_Handles.length > 1 && options.limit) {
                if (lookBackward && handleNumber > 0) {
                    distance = scope_Spectrum.getAbsoluteDistance(reference[handleNumber - 1], options.limit, false);
                    to = Math.min(to, distance);
                }
                if (lookForward && handleNumber < scope_Handles.length - 1) {
                    distance = scope_Spectrum.getAbsoluteDistance(reference[handleNumber + 1], options.limit, true);
                    to = Math.max(to, distance);
                }
            }
            // The padding option keeps the handles a certain distance from the
            // edges of the slider. Padding must be > 0.
            if (options.padding) {
                if (handleNumber === 0) {
                    distance = scope_Spectrum.getAbsoluteDistance(0, options.padding[0], false);
                    to = Math.max(to, distance);
                }
                if (handleNumber === scope_Handles.length - 1) {
                    distance = scope_Spectrum.getAbsoluteDistance(100, options.padding[1], true);
                    to = Math.min(to, distance);
                }
            }
            to = scope_Spectrum.getStep(to);
            // Limit percentage to the 0 - 100 range
            to = limit(to);
            // Return false if handle can't move
            if (to === reference[handleNumber] && !getValue) {
                return false;
            }
            return to;
        }
        // Uses slider orientation to create CSS rules. a = base value;
        function inRuleOrder(v, a) {
            var o = options.ort;
            return (o ? a : v) + ", " + (o ? v : a);
        }
        // Moves handle(s) by a percentage
        // (bool, % to move, [% where handle started, ...], [index in scope_Handles, ...])
        function moveHandles(upward, proposal, locations, handleNumbers, connect) {
            var proposals = locations.slice();
            // Store first handle now, so we still have it in case handleNumbers is reversed
            var firstHandle = handleNumbers[0];
            var b = [!upward, upward];
            var f = [upward, !upward];
            // Copy handleNumbers so we don't change the dataset
            handleNumbers = handleNumbers.slice();
            // Check to see which handle is 'leading'.
            // If that one can't move the second can't either.
            if (upward) {
                handleNumbers.reverse();
            }
            // Step 1: get the maximum percentage that any of the handles can move
            if (handleNumbers.length > 1) {
                handleNumbers.forEach(function (handleNumber, o) {
                    var to = checkHandlePosition(proposals, handleNumber, proposals[handleNumber] + proposal, b[o], f[o], false);
                    // Stop if one of the handles can't move.
                    if (to === false) {
                        proposal = 0;
                    }
                    else {
                        proposal = to - proposals[handleNumber];
                        proposals[handleNumber] = to;
                    }
                });
            }
            // If using one handle, check backward AND forward
            else {
                b = f = [true];
            }
            var state = false;
            // Step 2: Try to set the handles with the found percentage
            handleNumbers.forEach(function (handleNumber, o) {
                state = setHandle(handleNumber, locations[handleNumber] + proposal, b[o], f[o]) || state;
            });
            // Step 3: If a handle moved, fire events
            if (state) {
                handleNumbers.forEach(function (handleNumber) {
                    fireEvent("update", handleNumber);
                    fireEvent("slide", handleNumber);
                });
                // If target is a connect, then fire drag event
                if (connect != undefined) {
                    fireEvent("drag", firstHandle);
                }
            }
        }
        // Takes a base value and an offset. This offset is used for the connect bar size.
        // In the initial design for this feature, the origin element was 1% wide.
        // Unfortunately, a rounding bug in Chrome makes it impossible to implement this feature
        // in this manner: https://bugs.chromium.org/p/chromium/issues/detail?id=798223
        function transformDirection(a, b) {
            return options.dir ? 100 - a - b : a;
        }
        // Updates scope_Locations and scope_Values, updates visual state
        function updateHandlePosition(handleNumber, to) {
            // Update locations.
            scope_Locations[handleNumber] = to;
            // Convert the value to the slider stepping/range.
            scope_Values[handleNumber] = scope_Spectrum.fromStepping(to);
            var translation = transformDirection(to, 0) - scope_DirOffset;
            var translateRule = "translate(" + inRuleOrder(translation + "%", "0") + ")";
            scope_Handles[handleNumber].style[options.transformRule] = translateRule;
            updateConnect(handleNumber);
            updateConnect(handleNumber + 1);
        }
        // Handles before the slider middle are stacked later = higher,
        // Handles after the middle later is lower
        // [[7] [8] .......... | .......... [5] [4]
        function setZindex() {
            scope_HandleNumbers.forEach(function (handleNumber) {
                var dir = scope_Locations[handleNumber] > 50 ? -1 : 1;
                var zIndex = 3 + (scope_Handles.length + dir * handleNumber);
                scope_Handles[handleNumber].style.zIndex = String(zIndex);
            });
        }
        // Test suggested values and apply margin, step.
        // if exactInput is true, don't run checkHandlePosition, then the handle can be placed in between steps (#436)
        function setHandle(handleNumber, to, lookBackward, lookForward, exactInput) {
            if (!exactInput) {
                to = checkHandlePosition(scope_Locations, handleNumber, to, lookBackward, lookForward, false);
            }
            if (to === false) {
                return false;
            }
            updateHandlePosition(handleNumber, to);
            return true;
        }
        // Updates style attribute for connect nodes
        function updateConnect(index) {
            // Skip connects set to false
            if (!scope_Connects[index]) {
                return;
            }
            var l = 0;
            var h = 100;
            if (index !== 0) {
                l = scope_Locations[index - 1];
            }
            if (index !== scope_Connects.length - 1) {
                h = scope_Locations[index];
            }
            // We use two rules:
            // 'translate' to change the left/top offset;
            // 'scale' to change the width of the element;
            // As the element has a width of 100%, a translation of 100% is equal to 100% of the parent (.noUi-base)
            var connectWidth = h - l;
            var translateRule = "translate(" + inRuleOrder(transformDirection(l, connectWidth) + "%", "0") + ")";
            var scaleRule = "scale(" + inRuleOrder(connectWidth / 100, "1") + ")";
            scope_Connects[index].style[options.transformRule] =
                translateRule + " " + scaleRule;
        }
        // Parses value passed to .set method. Returns current value if not parse-able.
        function resolveToValue(to, handleNumber) {
            // Setting with null indicates an 'ignore'.
            // Inputting 'false' is invalid.
            if (to === null || to === false || to === undefined) {
                return scope_Locations[handleNumber];
            }
            // If a formatted number was passed, attempt to decode it.
            if (typeof to === "number") {
                to = String(to);
            }
            to = options.format.from(to);
            if (to !== false) {
                to = scope_Spectrum.toStepping(to);
            }
            // If parsing the number failed, use the current value.
            if (to === false || isNaN(to)) {
                return scope_Locations[handleNumber];
            }
            return to;
        }
        // Set the slider value.
        function valueSet(input, fireSetEvent, exactInput) {
            var values = asArray(input);
            var isInit = scope_Locations[0] === undefined;
            // Event fires by default
            fireSetEvent = fireSetEvent === undefined ? true : fireSetEvent;
            // Animation is optional.
            // Make sure the initial values were set before using animated placement.
            if (options.animate && !isInit) {
                addClassFor(scope_Target, options.cssClasses.tap, options.animationDuration);
            }
            // First pass, without lookAhead but with lookBackward. Values are set from left to right.
            scope_HandleNumbers.forEach(function (handleNumber) {
                setHandle(handleNumber, resolveToValue(values[handleNumber], handleNumber), true, false, exactInput);
            });
            var i = scope_HandleNumbers.length === 1 ? 0 : 1;
            // Spread handles evenly across the slider if the range has no size (min=max)
            if (isInit && scope_Spectrum.hasNoSize()) {
                exactInput = true;
                scope_Locations[0] = 0;
                if (scope_HandleNumbers.length > 1) {
                    var space_1 = 100 / (scope_HandleNumbers.length - 1);
                    scope_HandleNumbers.forEach(function (handleNumber) {
                        scope_Locations[handleNumber] = handleNumber * space_1;
                    });
                }
            }
            // Secondary passes. Now that all base values are set, apply constraints.
            // Iterate all handles to ensure constraints are applied for the entire slider (Issue #1009)
            for (; i < scope_HandleNumbers.length; ++i) {
                scope_HandleNumbers.forEach(function (handleNumber) {
                    setHandle(handleNumber, scope_Locations[handleNumber], true, true, exactInput);
                });
            }
            setZindex();
            scope_HandleNumbers.forEach(function (handleNumber) {
                fireEvent("update", handleNumber);
                // Fire the event only for handles that received a new value, as per #579
                if (values[handleNumber] !== null && fireSetEvent) {
                    fireEvent("set", handleNumber);
                }
            });
        }
        // Reset slider to initial values
        function valueReset(fireSetEvent) {
            valueSet(options.start, fireSetEvent);
        }
        // Set value for a single handle
        function valueSetHandle(handleNumber, value, fireSetEvent, exactInput) {
            // Ensure numeric input
            handleNumber = Number(handleNumber);
            if (!(handleNumber >= 0 && handleNumber < scope_HandleNumbers.length)) {
                throw new Error("noUiSlider: invalid handle number, got: " + handleNumber);
            }
            // Look both backward and forward, since we don't want this handle to "push" other handles (#960);
            // The exactInput argument can be used to ignore slider stepping (#436)
            setHandle(handleNumber, resolveToValue(value, handleNumber), true, true, exactInput);
            fireEvent("update", handleNumber);
            if (fireSetEvent) {
                fireEvent("set", handleNumber);
            }
        }
        // Get the slider value.
        function valueGet(unencoded) {
            if (unencoded === void 0) { unencoded = false; }
            if (unencoded) {
                // return a copy of the raw values
                return scope_Values.length === 1 ? scope_Values[0] : scope_Values.slice(0);
            }
            var values = scope_Values.map(options.format.to);
            // If only one handle is used, return a single value.
            if (values.length === 1) {
                return values[0];
            }
            return values;
        }
        // Removes classes from the root and empties it.
        function destroy() {
            // remove protected internal listeners
            removeEvent(INTERNAL_EVENT_NS.aria);
            removeEvent(INTERNAL_EVENT_NS.tooltips);
            Object.keys(options.cssClasses).forEach(function (key) {
                removeClass(scope_Target, options.cssClasses[key]);
            });
            while (scope_Target.firstChild) {
                scope_Target.removeChild(scope_Target.firstChild);
            }
            delete scope_Target.noUiSlider;
        }
        function getNextStepsForHandle(handleNumber) {
            var location = scope_Locations[handleNumber];
            var nearbySteps = scope_Spectrum.getNearbySteps(location);
            var value = scope_Values[handleNumber];
            var increment = nearbySteps.thisStep.step;
            var decrement = null;
            // If snapped, directly use defined step value
            if (options.snap) {
                return [
                    value - nearbySteps.stepBefore.startValue || null,
                    nearbySteps.stepAfter.startValue - value || null,
                ];
            }
            // If the next value in this step moves into the next step,
            // the increment is the start of the next step - the current value
            if (increment !== false) {
                if (value + increment > nearbySteps.stepAfter.startValue) {
                    increment = nearbySteps.stepAfter.startValue - value;
                }
            }
            // If the value is beyond the starting point
            if (value > nearbySteps.thisStep.startValue) {
                decrement = nearbySteps.thisStep.step;
            }
            else if (nearbySteps.stepBefore.step === false) {
                decrement = false;
            }
            // If a handle is at the start of a step, it always steps back into the previous step first
            else {
                decrement = value - nearbySteps.stepBefore.highestStep;
            }
            // Now, if at the slider edges, there is no in/decrement
            if (location === 100) {
                increment = null;
            }
            else if (location === 0) {
                decrement = null;
            }
            // As per #391, the comparison for the decrement step can have some rounding issues.
            var stepDecimals = scope_Spectrum.countStepDecimals();
            // Round per #391
            if (increment !== null && increment !== false) {
                increment = Number(increment.toFixed(stepDecimals));
            }
            if (decrement !== null && decrement !== false) {
                decrement = Number(decrement.toFixed(stepDecimals));
            }
            return [decrement, increment];
        }
        // Get the current step size for the slider.
        function getNextSteps() {
            return scope_HandleNumbers.map(getNextStepsForHandle);
        }
        // Updatable: margin, limit, padding, step, range, animate, snap
        function updateOptions(optionsToUpdate, fireSetEvent) {
            // Spectrum is created using the range, snap, direction and step options.
            // 'snap' and 'step' can be updated.
            // If 'snap' and 'step' are not passed, they should remain unchanged.
            var v = valueGet();
            var updateAble = [
                "margin",
                "limit",
                "padding",
                "range",
                "animate",
                "snap",
                "step",
                "format",
                "pips",
                "tooltips",
            ];
            // Only change options that we're actually passed to update.
            updateAble.forEach(function (name) {
                // Check for undefined. null removes the value.
                if (optionsToUpdate[name] !== undefined) {
                    originalOptions[name] = optionsToUpdate[name];
                }
            });
            var newOptions = testOptions(originalOptions);
            // Load new options into the slider state
            updateAble.forEach(function (name) {
                if (optionsToUpdate[name] !== undefined) {
                    options[name] = newOptions[name];
                }
            });
            scope_Spectrum = newOptions.spectrum;
            // Limit, margin and padding depend on the spectrum but are stored outside of it. (#677)
            options.margin = newOptions.margin;
            options.limit = newOptions.limit;
            options.padding = newOptions.padding;
            // Update pips, removes existing.
            if (options.pips) {
                pips(options.pips);
            }
            else {
                removePips();
            }
            // Update tooltips, removes existing.
            if (options.tooltips) {
                tooltips();
            }
            else {
                removeTooltips();
            }
            // Invalidate the current positioning so valueSet forces an update.
            scope_Locations = [];
            valueSet(isSet(optionsToUpdate.start) ? optionsToUpdate.start : v, fireSetEvent);
        }
        // Initialization steps
        function setupSlider() {
            // Create the base element, initialize HTML and set classes.
            // Add handles and connect elements.
            scope_Base = addSlider(scope_Target);
            addElements(options.connect, scope_Base);
            // Attach user events.
            bindSliderEvents(options.events);
            // Use the public value method to set the start values.
            valueSet(options.start);
            if (options.pips) {
                pips(options.pips);
            }
            if (options.tooltips) {
                tooltips();
            }
            aria();
        }
        setupSlider();
        var scope_Self = {
            destroy: destroy,
            steps: getNextSteps,
            on: bindEvent,
            off: removeEvent,
            get: valueGet,
            set: valueSet,
            setHandle: valueSetHandle,
            reset: valueReset,
            // Exposed for unit testing, don't use this in your application.
            __moveHandles: function (upward, proposal, handleNumbers) {
                moveHandles(upward, proposal, scope_Locations, handleNumbers);
            },
            options: originalOptions,
            updateOptions: updateOptions,
            target: scope_Target,
            removePips: removePips,
            removeTooltips: removeTooltips,
            getPositions: function () {
                return scope_Locations.slice();
            },
            getTooltips: function () {
                return scope_Tooltips;
            },
            getOrigins: function () {
                return scope_Handles;
            },
            pips: pips, // Issue #594
        };
        return scope_Self;
    }
    // Run the standard initializer
    function initialize(target, originalOptions) {
        if (!target || !target.nodeName) {
            throw new Error("noUiSlider: create requires a single element, got: " + target);
        }
        // Throw an error if the slider was already initialized.
        if (target.noUiSlider) {
            throw new Error("noUiSlider: Slider was already initialized.");
        }
        // Test the options and create the slider environment;
        var options = testOptions(originalOptions);
        var api = scope(target, options, originalOptions);
        target.noUiSlider = api;
        return api;
    }
    var nouislider = {
        // Exposed for unit testing, don't use this in your application.
        __spectrum: Spectrum,
        // A reference to the default classes, allows global changes.
        // Use the cssClasses option for changes to one slider.
        cssClasses: cssClasses,
        create: initialize,
    };

    exports.create = initialize;
    exports.cssClasses = cssClasses;
    exports["default"] = nouislider;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
}(nouislider, nouislider.exports));

var noUiSlider = /*@__PURE__*/getDefaultExportFromCjs(nouislider.exports);

var {
  strings
} = window.theme;

var priceRange = container => {
  var inputs = t$7('input', container);
  var minInput = inputs[0];
  var maxInput = inputs[1];
  var events = [e$3(inputs, 'change', onRangeChange)];
  var slider = n$3('[data-range-slider]', container);
  noUiSlider.create(slider, {
    start: [minInput.value ? minInput.value : minInput.getAttribute('min'), maxInput.value ? maxInput.value : maxInput.getAttribute('max')],
    handleAttributes: [{
      'aria-label': strings.accessibility.range_lower
    }, {
      'aria-label': strings.accessibility.range_upper
    }],
    connect: true,
    range: {
      'min': parseInt(minInput.getAttribute('min')),
      'max': parseInt(maxInput.getAttribute('max'))
    }
  });
  slider.noUiSlider.on('slide', e => {
    var max, min;
    [min, max] = e;
    minInput.value = Math.floor(min);
    maxInput.value = Math.floor(max);
    setMinAndMaxValues();
  });
  slider.noUiSlider.on('set', e => {
    var max, min;
    [min, max] = e;
    minInput.value = Math.floor(min);
    maxInput.value = Math.floor(max);
    fireChangeEvent();
    setMinAndMaxValues();
  });
  setMinAndMaxValues();

  function setMinAndMaxValues() {
    if (maxInput.value) minInput.setAttribute('max', maxInput.value);
    if (minInput.value) maxInput.setAttribute('min', minInput.value);
    if (minInput.value === '') maxInput.setAttribute('min', 0);
    if (maxInput.value === '') minInput.setAttribute('max', maxInput.getAttribute('max'));
  }

  function adjustToValidValues(input) {
    var value = Number(input.value);
    var min = Number(input.getAttribute('min'));
    var max = Number(input.getAttribute('max'));
    if (value < min) input.value = min;
    if (value > max) input.value = max;
  }

  function fireChangeEvent() {
    minInput.dispatchEvent(new Event('change', {
      bubbles: true
    }));
    maxInput.dispatchEvent(new Event('change', {
      bubbles: true
    }));
  }

  function onRangeChange(event) {
    adjustToValidValues(event.currentTarget);
    setMinAndMaxValues();
    if (minInput.value === '' && maxInput.value === '') return;
    var currentMax, currentMin;
    [currentMin, currentMax] = slider.noUiSlider.get();
    currentMin = Math.floor(currentMin);
    currentMax = Math.floor(currentMax);
    if (currentMin !== Math.floor(minInput.value)) slider.noUiSlider.set([minInput.value, null]);
    if (currentMax !== Math.floor(maxInput.value)) slider.noUiSlider.set([null, maxInput.value]);
  }

  function validateRange() {
    inputs.forEach(input => setMinAndMaxValues());
  }

  var reset = () => {
    slider.noUiSlider.set([minInput.getAttribute('min'), maxInput.getAttribute('max')]);
    minInput.value = '';
    maxInput.value = '';
    fireChangeEvent();
    setMinAndMaxValues();
  };

  var unload = () => {
    events.forEach(unsubscribe => unsubscribe());
  };

  return {
    unload,
    reset,
    validateRange
  };
};

var FILTERS_REMOVE = 'collection:filters:remove';
var RANGE_REMOVE = 'collection:range:remove';
var EVERYTHING_CLEAR = 'collection:clear';
var FILTERS_UPDATE = 'collection:filters:update'; // export const updateFilters = () => emit(FILTERS_UPDATE);

var updateFilters = target => r$1(FILTERS_UPDATE, null, {
  target
});
var clearAll = () => r$1(EVERYTHING_CLEAR);
var removeFilters = target => r$1(FILTERS_REMOVE, null, {
  target
});
var removeRange = () => r$1(RANGE_REMOVE);
var filtersUpdated = cb => c$1(FILTERS_UPDATE, cb);
var filtersRemoved = cb => c$1(FILTERS_REMOVE, cb);
var everythingCleared = cb => c$1(EVERYTHING_CLEAR, cb);
var rangeRemoved = cb => c$1(RANGE_REMOVE, cb);

var classes = {
  active: 'active',
  closed: 'closed'
};
var ls = {
  getClosed: () => e('closed_sidebar_groups') || [],
  setClosed: val => r('closed_sidebar_groups', JSON.stringify(val))
};
var sel$2 = {
  heading: '[data-heading]',
  tag: '[data-tag]',
  filterItemLabel: '[data-filter-item-label]',
  sort: '[data-sort]',
  priceRange: '[data-price-range]',
  sidebarForm: '[data-filer-sidebar-form]',
  getGroup: group => "[data-group=\"".concat(group, "\"]")
};
var sidebar = (node => {
  if (!node) return Function();
  var sidebarForm = n$3(sel$2.sidebarForm, node);
  var click = e$3(node, 'click', handleClick);
  var change = e$3(node, 'change', handleChange);
  var range = null;
  var rangeContainer = n$3(sel$2.priceRange, sidebarForm);

  if (rangeContainer) {
    range = priceRange(rangeContainer);
  }

  var collectionUpdatedHanlder = c$1('collection:updated', collectionUpdated);

  function collectionUpdated(evt) {
    var updatedFilterItems = t$7("".concat(sel$2.sidebarForm, " ").concat(sel$2.filterItemLabel), evt.doc);
    updatedFilterItems.forEach(element => {
      updateInnerHTML("".concat(sel$2.sidebarForm, " ").concat(sel$2.filterItemLabel, "[for=\"").concat(element.getAttribute('for'), "\"]"), evt.doc);
    });
  }

  function updateInnerHTML(selector, doc) {
    var updatedItem = n$3(selector, doc);
    var oldItem = n$3(selector, sidebarForm);

    if (updatedItem && oldItem) {
      oldItem.innerHTML = updatedItem.innerHTML;
      oldItem.className = updatedItem.className;
    }
  }

  function handleChange(evt) {
    var {
      sort,
      filter,
      rangeInput
    } = evt.target.dataset;

    if (rangeInput || sort || filter) {
      updateFilters(sidebarForm);
    }
  }

  function handleClick(evt) {
    // evt.preventDefault();
    var {
      heading
    } = evt.target.dataset;

    if (heading) {
      evt.preventDefault();
      var {
        nextElementSibling: content
      } = evt.target;
      slideStop(content);
      var current = ls.getClosed();

      if (isVisible(content)) {
        u$2(evt.target, classes.closed);
        slideUp(content);
        ls.setClosed([...current, heading]);
      } else {
        i$1(evt.target, classes.closed);
        var slideOptions = {
          display: 'block'
        };

        if (content.classList.contains('filter-drawer__list--swatch') || content.classList.contains('filter-drawer__list--chip')) {
          slideOptions.display = 'flex';
        }

        slideDown(content, slideOptions);
        ls.setClosed(current.filter(item => item !== heading));
      }
    }
  }

  function unload() {
    click();
    change();
    range && range.unload();
    collectionUpdatedHanlder();
  }

  return () => {
    unload();
  };
});

var sel$1 = {
  filter: '[data-filter-open]',
  flyouts: '[data-filter-flyout]',
  button: '[data-button]',
  wash: '[data-filter-wash]',
  tag: '[data-tag]',
  sort: '[data-sort]',
  close: '[data-close-icon]',
  form: '[data-filter-form-flyout]',
  priceRange: '[data-price-range]'
};
var selectors$4 = {
  active: 'active',
  checked: ':checked'
};
var flyout = (node => {
  var flyoutForm = n$3(sel$1.form, node);
  if (!flyoutForm) return Function();
  var wash = n$3(sel$1.wash, node);
  var focusTrap = null;
  var scrollPosition = 0;
  var range = null;
  var rangeContainer = n$3(sel$1.priceRange, flyoutForm);

  if (rangeContainer) {
    range = priceRange(rangeContainer);
  }

  var delegate = new Delegate(node);
  delegate.on('click', sel$1.wash, clickWash);
  delegate.on('click', sel$1.button, clickButton);
  delegate.on('click', sel$1.close, clickWash);
  var events = [e$3(t$7(sel$1.filter, node), 'click', clickFlyoutTrigger), e$3(node, 'keydown', _ref => {
    var {
      keyCode
    } = _ref;
    if (keyCode === 27) clickWash();
  })];
  var collectionUpdatedHanlder = c$1('collection:updated', collectionUpdated);

  function collectionUpdated(evt) {
    range && range.unload();
    rangeContainer = n$3(sel$1.priceRange, flyoutForm);

    if (rangeContainer) {
      range = priceRange(rangeContainer);
    }
  }

  function clickFlyoutTrigger(e) {
    e.preventDefault();
    var drawer = n$3("#".concat(e.currentTarget.getAttribute('aria-controls')));

    if (drawer) {
      var close = n$3(sel$1.close, drawer);
      close.setAttribute('aria-expanded', true);
      e.currentTarget.setAttribute('aria-expanded', true);
      u$2(wash, selectors$4.active);
      u$2(drawer, selectors$4.active);
      focusTrap = createFocusTrap(drawer, {
        allowOutsideClick: true
      });
      focusTrap.activate();
      disableBodyScroll(node, {
        hideBodyOverflow: true,
        allowTouchMove: el => {
          while (el && el !== document.body && el.id !== 'main-content') {
            if (el.getAttribute('data-scroll-lock-ignore') !== null) {
              return true;
            }

            el = el.parentNode;
          }
        },
        reserveScrollBarGap: true
      });
      scrollPosition = window.pageYOffset;
      document.body.style.top = "-".concat(scrollPosition, "px");
      document.body.classList.add('scroll-lock');
    }
  }

  function clickWash(e) {
    e && e.preventDefault();
    focusTrap && focusTrap.deactivate();
    var flyouts = t$7(sel$1.flyouts, node);
    i$1([...flyouts, wash], selectors$4.active);
    enableBodyScroll(node);
    document.body.classList.remove('scroll-lock');
    document.body.style.top = '';
    window.scrollTo(0, scrollPosition);
    flyouts.forEach(flyout => {
      var flyoutControls = t$7("[aria-controls=\"".concat(flyout.id, "\"]"));
      flyoutControls.forEach(control => {
        control.setAttribute('aria-expanded', false);
      });
    });
  }

  function clickButton(e) {
    e.preventDefault();
    var {
      button
    } = e.target.dataset;
    var scope = e.target.closest(sel$1.flyouts);

    if (button === 'clear') {
      var inputs = t$7('[data-filter-item]', scope);
      inputs.forEach(input => {
        if (input.type === 'checkbox' || input.type === 'radio') {
          input.checked = false;
        } else {
          input.value = '';
        }
      });
      removeRange();
    } else if (button === 'apply') {
      updateFilters(flyoutForm);
      clickWash();
    }
  }

  function removeRange() {
    range && range.reset();
  }

  return () => {
    events.forEach(unsubscribe => unsubscribe());
    range && range.unload();
    delegate.off();
    collectionUpdatedHanlder();
  };
});

var filtering = container => {
  var forms = t$7('[data-filter-form]', container);
  var formData, searchParams;
  setParams();

  function setParams(form) {
    form = form || forms[0];
    formData = new FormData(form);
    searchParams = new URLSearchParams(formData).toString();
  }
  /**
   * Takes the updated form element and updates all other forms with the updated values
   * @param {*} target
   */


  function syncForms(target) {
    if (!target) return;
    var targetInputs = t$7('[data-filter-item]', target);
    targetInputs.forEach(targetInput => {
      if (targetInput.type === 'checkbox' || targetInput.type === 'radio') {
        var {
          valueEscaped
        } = targetInput.dataset;
        var items = t$7("input[name='".concat(targetInput.name, "'][data-value-escaped='").concat(valueEscaped, "']"));
        items.forEach(input => {
          input.checked = targetInput.checked;
        });
      } else {
        var _items = t$7("input[name='".concat(targetInput.name, "']"));

        _items.forEach(input => {
          input.value = targetInput.value;
        });
      }
    });
  }
  /**
   * When filters are removed, set the checked attribute to false
   * for all filter inputs for that filter.
   * Can accept multiple filters
   * @param {Array} targets Array of inputs
   */


  function uncheckFilters(targets) {
    if (!targets) return;
    var selector;
    targets.forEach(target => {
      selector = !selector ? '' : ", ".concat(selector);
      var {
        name,
        valueEscaped
      } = target.dataset;
      selector = "input[name='".concat(name, "'][data-value-escaped='").concat(valueEscaped, "']").concat(selector);
    });
    var inputs = t$7(selector, container);
    inputs.forEach(input => {
      input.checked = false;
    });
  }

  function clearRangeInputs() {
    var rangeInputs = t$7('[data-range-input]', container);
    rangeInputs.forEach(input => {
      input.value = '';
    });
  }

  function resetForms() {
    forms.forEach(form => {
      form.reset();
    });
  }

  return {
    getState() {
      return {
        url: searchParams
      };
    },

    filtersUpdated(target, cb) {
      syncForms(target);
      setParams(target);
      return cb(this.getState());
    },

    removeFilters(target, cb) {
      uncheckFilters(target);
      setParams();
      return cb(this.getState());
    },

    removeRange(cb) {
      clearRangeInputs();
      setParams();
      return cb(this.getState());
    },

    clearAll(cb) {
      searchParams = '';
      resetForms();
      return cb(this.getState());
    },

    unload() {}

  };
};

var selectors$3 = {
  products: '.product-item',
  infiniteScrollContainer: '.collection__infinite-container',
  infiniteScrollTrigger: '.collection__infinite-trigger',
  sidebar: '[data-sidebar]',
  partial: '[data-partial]',
  sort: '[data-sort]',
  filterFlyoutForm: '[data-filter-form-flyout]'
};
register('collection', {
  infiniteScroll: null,

  onLoad() {
    var {
      collectionItemCount,
      paginationType
    } = this.container.dataset;
    if (!parseInt(collectionItemCount)) return;
    this.paginationType = paginationType;
    this.paginated = this.paginationType === 'paginated';
    this.infiniteScrollTrigger = n$3(selectors$3.infiniteScrollTrigger, this.container);
    this.collection = Collection(window.location.href);
    this.sidebar = sidebar(n$3(selectors$3.sidebar, this.container));
    this.flyout = flyout(this.container);
    this.filterForm = n$3('[data-filter-form]', this.container);

    if (this.filterForm) {
      this._initFiltering();
    } // Set initial evx state from collection url object


    o(this.collection.getState());
    this.partial = n$3(selectors$3.partial, this.container);

    this._initInfiniteScroll();

    this._initProductItems();
  },

  _initFiltering() {
    // collection filters
    this.filtering = filtering(this.container); // Set initial evx state from collection url object

    o(this.filtering.getState());
    this.partial = n$3(selectors$3.partial, this.container);
    this.subscriptions = [filtersRemoved((_, _ref) => {
      var {
        target
      } = _ref;
      this.filtering.removeFilters(target, data => {
        this._renderView(data.url);

        o(data)();
      });
    }), rangeRemoved(() => {
      this.filtering.removeRange(data => {
        this._renderView(data.url);

        o(data)();
      });
    }), filtersUpdated((_, _ref2) => {
      var {
        target
      } = _ref2;
      this.filtering.filtersUpdated(target, data => {
        this._renderView(data.url);

        o(data)();
      });
    }), everythingCleared(() => {
      this.filtering.clearAll(data => {
        this._renderView(data.url);

        o(data)();
      });
    })];
    this.delegate = new Delegate(this.partial);
    this.delegate.on('click', '[data-remove-filter]', e => {
      e.preventDefault();
      removeFilters([e.target]);
    });
    this.delegate.on('click', '[data-remove-range]', e => {
      e.preventDefault();
      removeRange();
    });
    this.delegate.on('click', '[data-clear]', e => {
      e.preventDefault();
      clearAll();
    });
    this.collectionUpdatedHanlder = c$1('collection:updated', () => {
      this.productItems.forEach(item => item.unload());

      this._initProductItems();
    });
  },

  _initInfiniteScroll() {
    if (this.paginated) return;
    var infiniteScrollOptions = {
      container: selectors$3.infiniteScrollContainer,
      pagination: selectors$3.infiniteScrollTrigger,
      loadingText: 'Loading...',
      callback: () => r$1('collection:updated')
    };

    if (this.paginationType === 'click') {
      infiniteScrollOptions.method = 'click';
    }

    AjaxinateShim(Ajaxinate);
    this.infiniteScroll = new Ajaxinate(infiniteScrollOptions);
  },

  _initProductItems() {
    var products = this.container.querySelectorAll(selectors$3.products);
    this.productItems = [];
    products.forEach(element => {
      this.productItems.push(productItem(element));
    });
  },

  _renderView(searchParams) {
    var url = "".concat(window.location.pathname, "?section_id=").concat(this.container.dataset.sectionId, "&").concat(searchParams);
    var loading = n$3('.collection__loading', this.container);
    u$2(loading, 'is-active');
    fetch(url, {
      credentials: 'include'
    }).then(res => res.text()).then(res => {
      this._updateURLHash(searchParams);

      var doc = new window.DOMParser().parseFromString(res, 'text/html');
      var contents = n$3(selectors$3.partial, doc).innerHTML;
      this.partial.innerHTML = contents;
      var filterFlyoutForm = n$3(selectors$3.filterFlyoutForm, doc).innerHTML;
      n$3(selectors$3.filterFlyoutForm, this.container).innerHTML = filterFlyoutForm;

      if (!this.paginated) {
        this.infiniteScrollTrigger.innerHTML = '';

        this._initInfiniteScroll();
      }

      i$1(loading, 'is-active');
      r$1('collection:updated', {
        doc: doc
      });
    });
  },

  _updateURLHash(searchParams) {
    history.pushState({
      searchParams
    }, '', "".concat(window.location.pathname).concat(searchParams && '?'.concat(searchParams)));
  },

  onUnload() {
    this.infiniteScroll && this.infiniteScroll.destroy();
    this.productItems && this.productItems.forEach(item => item.unload());
    this.sidebar && this.sidebar();
    this.flyout && this.flyout();
    this.filtering && this.filtering.unload();
    this.delegate && this.delegate.off();
    this.subscriptions && this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.collectionUpdatedHanlder && this.collectionUpdatedHanlder();
  }

});

var selectors$2 = {
  partial: '[data-partial]',
  sort: '[data-sort]'
};
register('search', {
  onLoad() {
    var {
      searchItemCount
    } = this.container.dataset;
    if (!parseInt(searchItemCount)) return;
    this.partial = n$3(selectors$2.partial, this.container);
    this.flyout = flyout(this.container);
    this.filterForm = n$3('[data-filter-form]', this.container);

    if (this.filterForm) {
      this._initFiltering();
    }
  },

  _initFiltering() {
    // search filters
    this.filtering = filtering(this.container);
    this.partial = n$3(selectors$2.partial, this.container);
    this.subscriptions = [filtersRemoved((_, _ref) => {
      var {
        target
      } = _ref;
      this.filtering.removeFilters(target, data => {
        this._renderView(data.url);
      });
    }), rangeRemoved(() => {
      this.filtering.removeRange(data => {
        this._renderView(data.url);
      });
    }), filtersUpdated((_, _ref2) => {
      var {
        target
      } = _ref2;
      this.filtering.filtersUpdated(target, data => {
        this._renderView(data.url);
      });
    }), everythingCleared(() => {
      this.filtering.clearAll(data => {
        this._renderView(data.url);
      });
    })];
    this.delegate = new Delegate(this.partial);
    this.delegate.on('click', '[data-remove-filter]', e => {
      e.preventDefault();
      removeFilters([e.target]);
    });
    this.delegate.on('click', '[data-remove-range]', e => {
      e.preventDefault();
      removeRange();
    });
    this.delegate.on('click', '[data-clear]', e => {
      e.preventDefault();
      clearAll();
    });
  },

  _renderView(searchParams) {
    var url = "".concat(window.location.pathname, "?section_id=").concat(this.container.dataset.sectionId, "&").concat(searchParams);
    var loading = n$3('.search-template__loading', this.container);
    u$2(loading, 'is-active');
    fetch(url, {
      credentials: 'include'
    }).then(res => res.text()).then(res => {
      this._updateURLHash(searchParams);

      var doc = new window.DOMParser().parseFromString(res, 'text/html');
      var contents = n$3(selectors$2.partial, doc).innerHTML;
      this.partial.innerHTML = contents;
      i$1(loading, 'is-active');
      r$1('collection:updated');
    });
  },

  _updateURLHash(searchParams) {
    history.pushState({
      searchParams
    }, '', "".concat(window.location.pathname).concat(searchParams && '?'.concat(searchParams)));
  },

  onUnload() {
    this.flyout();
    this.filtering();
    this.delegate.off();
    this.subscriptions.forEach(unsubscribe => unsubscribe());
  }

});

var selectors$1 = {
  recoverPasswordLink: '#RecoverPassword',
  recoverPasswordForm: '#RecoverPasswordForm',
  hideRecoverPasswordLink: '#HideRecoverPasswordLink',
  customerLoginForm: '#CustomerLoginForm',
  resetFormState: '.reset-password-success',
  resetFormMessage: '#ResetSuccess'
};
register('login', {
  onLoad() {
    this.recoverPasswordLink = this.container.querySelector(selectors$1.recoverPasswordLink);
    this.hideRecoverPasswordLink = this.container.querySelector(selectors$1.hideRecoverPasswordLink);
    this.customerLoginForm = this.container.querySelector(selectors$1.customerLoginForm);
    this._onShowHidePasswordForm = this._onShowHidePasswordForm.bind(this);

    if (this.recoverPasswordLink) {
      this._checkUrlHash();

      this._resetPasswordSuccess();

      this.recoverPasswordLink.addEventListener('click', this._onShowHidePasswordForm);
      this.hideRecoverPasswordLink.addEventListener('click', this._onShowHidePasswordForm);
    }
  },

  _onShowHidePasswordForm(evt) {
    evt.preventDefault();

    this._toggleRecoverPasswordForm();
  },

  _checkUrlHash() {
    var hash = window.location.hash; // Allow deep linking to recover password form

    if (hash === '#recover') {
      this._toggleRecoverPasswordForm();
    }
  },

  /**
   *  Show/Hide recover password form
   */
  _toggleRecoverPasswordForm() {
    var recoverPasswordForm = this.container.querySelector(selectors$1.recoverPasswordForm);
    recoverPasswordForm.classList.toggle('hide');
    this.customerLoginForm.classList.toggle('hide');
  },

  /**
   *  Show reset password success message
   */
  _resetPasswordSuccess() {
    var formState = this.container.querySelector(selectors$1.resetFormState);
    var formMessage = this.container.querySelector(selectors$1.resetFormMessage); // check if reset password form was successfully submited.

    if (!formState) {
      return;
    } // show success message


    formMessage.classList.remove('hide');
  },

  onUnload() {}

});

/**
 * CountryProvinceSelector Constructor
 * @param {String} countryOptions the country options in html string
 */
function CountryProvinceSelector(countryOptions) {
  if (typeof countryOptions !== 'string') {
    throw new TypeError(countryOptions + ' is not a string.');
  }
  this.countryOptions = countryOptions;
}

/**
 * Builds the country and province selector with the given node element
 * @param {Node} countryNodeElement The <select> element for country
 * @param {Node} provinceNodeElement The <select> element for province
 * @param {Object} options Additional settings available
 * @param {CountryProvinceSelector~onCountryChange} options.onCountryChange callback after a country `change` event
 * @param {CountryProvinceSelector~onProvinceChange} options.onProvinceChange callback after a province `change` event
 */
CountryProvinceSelector.prototype.build = function (countryNodeElement, provinceNodeElement, options) {
  if (typeof countryNodeElement !== 'object') {
    throw new TypeError(countryNodeElement + ' is not a object.');
  }

  if (typeof provinceNodeElement !== 'object') {
    throw new TypeError(provinceNodeElement + ' is not a object.');
  }

  var defaultValue = countryNodeElement.getAttribute('data-default');
  options = options || {};

  countryNodeElement.innerHTML = this.countryOptions;
  countryNodeElement.value = defaultValue;

  if (defaultValue && getOption(countryNodeElement, defaultValue)) {
    var provinces = buildProvince(countryNodeElement, provinceNodeElement, defaultValue);
    options.onCountryChange && options.onCountryChange(provinces, provinceNodeElement, countryNodeElement);
  }

  // Listen for value change on the country select
  countryNodeElement.addEventListener('change', function (event) {
    var target = event.target;
    var selectedValue = target.value;
    
    var provinces = buildProvince(target, provinceNodeElement, selectedValue);
    options.onCountryChange && options.onCountryChange(provinces, provinceNodeElement, countryNodeElement);
  });

  options.onProvinceChange && provinceNodeElement.addEventListener('change', options.onProvinceChange);
};

/**
 * This callback is called after a user interacted with a country `<select>`
 * @callback CountryProvinceSelector~onCountryChange
 * @param {array} provinces the parsed provinces
 * @param {Node} provinceNodeElement province `<select>` element
 * @param {Node} countryNodeElement country `<select>` element
 */

 /**
 * This callback is called after a user interacted with a province `<select>`
 * @callback CountryProvinceSelector~onProvinceChange
 * @param {Event} event the province selector `change` event object
 */

/**
 * Returns the <option> with the specified value from the
 * given node element
 * A null is returned if no such <option> is found
 */
function getOption(nodeElement, value) {
  return nodeElement.querySelector('option[value="' + value +'"]')
}

/**
 * Builds the options for province selector
 */
function buildOptions (provinceNodeElement, provinces) {
  var defaultValue = provinceNodeElement.getAttribute('data-default');

  provinces.forEach(function (option) {
    var optionElement = document.createElement('option');
    optionElement.value = option[0];
    optionElement.textContent = option[1];

    provinceNodeElement.appendChild(optionElement);
  });

  if (defaultValue && getOption(provinceNodeElement, defaultValue)) {
    provinceNodeElement.value = defaultValue;
  }
}

/**
 * Builds the province selector
 */
function buildProvince (countryNodeElement, provinceNodeElement, selectedValue) {
  var selectedOption = getOption(countryNodeElement, selectedValue);
  var provinces = JSON.parse(selectedOption.getAttribute('data-provinces'));

  provinceNodeElement.options.length = 0;

  if (provinces.length) {
    buildOptions(provinceNodeElement, provinces);
  }

  return provinces;
}

/**
 * Customer Addresses Script
 * ------------------------------------------------------------------------------
 * A file that contains scripts highly couple code to the Customer Addresses
 * template.
 *
 * @namespace customerAddresses
 */
var selectors = {
  addressContainer: '[data-address]',
  addressToggle: '[data-address-toggle]',
  addressCountry: '[data-address-country]',
  addressProvince: '[data-address-province]',
  addressProvinceWrapper: '[data-address-province-wrapper]',
  addressForm: '[data-address-form]',
  addressDeleteForm: '[data-address-delete-form]'
};
var hideClass = 'hide';
register('addresses', {
  onLoad() {
    var addresses = this.container.querySelectorAll(selectors.addressContainer);

    if (addresses.length) {
      var countryProvinceSelector = new CountryProvinceSelector(window.theme.allCountryOptionTags);
      addresses.forEach(addressContainer => {
        this._initializeAddressForm(countryProvinceSelector, addressContainer);
      });
    }
  },

  _initializeAddressForm(countryProvinceSelector, container) {
    var countrySelector = container.querySelector(selectors.addressCountry);
    var provinceSelector = container.querySelector(selectors.addressProvince);
    var provinceWrapper = container.querySelector(selectors.addressProvinceWrapper);
    var addressForm = container.querySelector(selectors.addressForm);
    var deleteForm = container.querySelector(selectors.addressDeleteForm);
    var formToggles = container.querySelectorAll(selectors.addressToggle);
    countryProvinceSelector.build(countrySelector, provinceSelector, {
      onCountryChange: provinces => provinceWrapper.classList.toggle(hideClass, !provinces.length)
    });
    formToggles.forEach(button => {
      button.addEventListener('click', () => {
        addressForm.classList.toggle(hideClass);
        formToggles.forEach(innerButton => {
          innerButton.setAttribute('aria-expanded', innerButton.getAttribute('aria-expanded') === 'true' ? false : true);
        });
      });
    });

    if (deleteForm) {
      deleteForm.addEventListener('submit', event => {
        var confirmMessage = deleteForm.getAttribute('data-confirm-message');

        if (!window.confirm(confirmMessage || 'Are you sure you wish to delete this address?')) {
          event.preventDefault();
        }
      });
    }
  },

  onUnload() {}

});

register('page', {
  onLoad() {},

  onUnload() {}

});

var sel = {
  toggle: '[data-js-toggle]'
};
register('password', {
  onLoad() {
    this.toggleButton = this.container.querySelector(sel.toggle);
    this.toggleButton.addEventListener('click', e => this.toggleView(e));
    var passwordInput = this.container.querySelector('[data-storefront-password-input]');

    if (passwordInput) {
      if (passwordInput.className.indexOf('storefront-password-error') >= 0) {
        this.toggleView();
      }
    }
  },

  onUnload() {
    this.toggleButton.removeEventListener('click', e => this.toggleView(e));
  },

  toggleView(e) {
    e && e.preventDefault();
    this.container.classList.toggle('welcome');
  }

});

document.addEventListener('DOMContentLoaded', () => {
  load('*'); // Get cart state before initializing quick cart

  fetchCart().then(cart => {
    o({
      cart
    }); // Setup cart drawer

    var cartDrawerElement = document.querySelector('[data-cart-drawer]');
    cartDrawer(cartDrawerElement);
  });
}); // Make it easy to see exactly what theme version
// this is by commit SHA
// window.SHA = SHA;
// Detect theme editor

if (Shopify.designMode === true) {
  document.documentElement.classList.add('theme-editor');
} else {
  var el = document.querySelector('.theme-editor-scroll-offset');
  el && el.remove();
} // Handle all accordion shortcodes


var accordions = document.querySelectorAll('.accordion');

if (accordions.length) {
  accordions.forEach(item => {
    accordion(item);
  });
} // Setup sticky header


var headerWrapper = document.querySelector('.header-container');
stickyHeader(headerWrapper); // Setup header overlay

var headerOverlayContainer = document.querySelector('[data-header-overlay]');
headerOverlay(headerOverlayContainer); // Setup drawer overlay

var drawerOverlayContainer = document.querySelector('[data-drawer-overlay]');
drawerOverlay(drawerOverlayContainer); // Setup modal

var modalElement = document.querySelector('[data-modal]');
modal(modalElement); // Quick add to cart

quickAdd(); // Prdocut availabilty drawer

var availabilityDrawer = document.querySelector('[data-store-availability-drawer]');
storeAvailabilityDrawer(availabilityDrawer); // Determine if the user is a mouse or keyboard user

function handleFirstTab(e) {
  if (e.keyCode === 9) {
    document.body.classList.add('user-is-tabbing');
    window.removeEventListener('keydown', handleFirstTab);
    window.addEventListener('mousedown', handleMouseDownOnce);
  }
}

function handleMouseDownOnce() {
  document.body.classList.remove('user-is-tabbing');
  window.removeEventListener('mousedown', handleMouseDownOnce);
  window.addEventListener('keydown', handleFirstTab);
}

window.addEventListener('keydown', handleFirstTab); // Disable auto zoom on input field for ios devices.
// https://stackoverflow.com/a/57527009

var addMaximumScaleToMetaViewport = () => {
  var el = document.querySelector('meta[name=viewport]');

  if (el !== null) {
    var content = el.getAttribute('content');
    var re = /maximum\-scale=[0-9\.]+/g;

    if (re.test(content)) {
      content = content.replace(re, 'maximum-scale=1.0');
    } else {
      content = [content, 'maximum-scale=1.0'].join(', ');
    }

    el.setAttribute('content', content);
  }
};

var disableIosTextFieldZoom = addMaximumScaleToMetaViewport; // https://stackoverflow.com/questions/9038625/detect-if-device-is-ios/9039885#9039885

var checkIsIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

if (checkIsIOS()) {
  disableIosTextFieldZoom();
} // Wrap all tables


var tables = document.querySelectorAll('table');
tables.forEach(el => {
  var wrapper = document.createElement('div');
  wrapper.classList.add('rte-table');
  wrapper.tabIndex = 0;
  el.parentNode.insertBefore(wrapper, el);
  wrapper.appendChild(el);
}); // Focus errors

var errorEl = document.querySelector('.form-status__message--error');

if (errorEl) {
  errorEl.focus();
  document.title = 'Error - ' + document.title;
} // Make it easy to see exactly what theme version
// this is by commit SHA


window.SHA = 'b0b5d1b7bb';
//# sourceMappingURL=theme.js.map
