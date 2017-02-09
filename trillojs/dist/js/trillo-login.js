/*!
 * TrilloJS v0.5.0 (https://github.com/trillo/trillojs#readme)
 * Copyright 2017 Collager Inc.
 * Licensed under the MIT license
 */
/*******************************************************************************
 * Copyright (c) 2015, 2016 Collager Inc.
 *
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *******************************************************************************/
(function() {

  "use strict";

  jQuery.fn.extend({
    dataOrAttr : function(key) {
      return this.data(key) || this.attr(key);
    }
  });
  
})();
/*******************************************************************************
 * Copyright (c) 2015, 2017 Collager Inc.
 *
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *******************************************************************************/
var Trillo = {

  appLocation : "",

  OBJ_LOCKED : 3,

  TrilloApp : {},

  appNamespace : null,

  isTouchSurface : false
};

(function() {

  "use strict";

  /**
   * For application specific initialization or installing custom factories,
   * subclass this. A custom initializer itself should be installed by providing
   * its name as "Trillo.appContext.app.appInitClass" (see main.js). This or its
   * subclass is constructed by supplying a callback function "cb". Subclass
   * "doCallback" to delay invoking the callback until all initializations are
   * completed (such as fetching initial data from the back-end).
   */
  Trillo.AppInitializer = function() {
    this.WIDTH_A = 800;
    this.WIDTH_B = 720;
    this.WIDTH_C = 640;
    this.WIDTH_D = 480;
    this.WIDTH_E = 320;
  };
  
  var AppInitializer = Trillo.AppInitializer.prototype;

  AppInitializer.initApp = function(cb) {
    this.cb = cb;

    // Create singleton (including factory objects).
    this.createAlertComponent();
    this.createLogComponent();
    this.createSearchHandler();

    this.createBuilder();
    this.createViewManager();
    this.createModelFactory();
    this.createApiAdapterFactory();
    this.createObserverFactory();
    this.createPage();
    this.createRouter();
    this.createTitleBarManager();
    this.createContextMenuManager();
    this.createPopoverMananger();
    this.doCallback();
  };

  AppInitializer.doCallback = function() {
    this.cb();
  };

  AppInitializer.createAlertComponent = function() {
    if (Trillo.Alert) {
      Trillo.alert = new Trillo.Alert();
    }
  };

  AppInitializer.createLogComponent = function() {
    if (Trillo.Log) {
      Trillo.log = new Trillo.Log();
    }
  };

  AppInitializer.createSearchHandler = function() {
    if (Trillo.SearchHandler) {
      Trillo.searchHandler = new Trillo.SearchHandler();
    }
  };

  AppInitializer.createViewManager = function() {
    if (Trillo.ViewManager) {
      Trillo.viewManager = new Trillo.ViewManager();
    }
  };

  AppInitializer.createBuilder = function() {
    if (Trillo.Builder) {
      Trillo.builder = new Trillo.Builder();
    }
  };

  AppInitializer.createModelFactory = function() {
    if (Trillo.ModelFactory) {
      Trillo.modelFactory = new Trillo.ModelFactory();
    }
  };

  AppInitializer.createApiAdapterFactory = function() {
    if (Trillo.ApiAdapterFactory) {
      Trillo.apiAdapterFactory = new Trillo.ApiAdapterFactory();
    }
  };

  AppInitializer.createObserverFactory = function() {
    if (Trillo.ObserverFactory) {
      Trillo.observerFactory = new Trillo.ObserverFactory();
    }
  };

  AppInitializer.createPage = function() {
    if (Trillo.Page) {
      Trillo.page = new Trillo.Page();
    }
  };

  AppInitializer.createRouter = function() {
    if (Trillo.Router) {
      Trillo.router = new Trillo.Router();
    }
  };

  AppInitializer.createTitleBarManager = function() {
    if (Trillo.TitleBarManager) {
      Trillo.titleBarManager = new Trillo.TitleBarManager();
    }
  };

  AppInitializer.createContextMenuManager = function() {
    if (Trillo.ContextMenuManager) {
      Trillo.contextMenuManager = new Trillo.ContextMenuManager();
    }
  };

  AppInitializer.createPopoverMananger = function() {
    if (Trillo.PopoverManager) {
      Trillo.popoverManager = new Trillo.PopoverManager();
    }
  };

  Trillo.Options = {
    V_MARGIN_TOP_ROW : 10,
    V_MARGIN : 20,
    H_MARGIN : 20,
    BOTTOM_SPACE_FOR_INF_SCROLL : 60,

    // options for a tree view
    OPEN_ALL : "openAll",
    CLOSE_ALL : "closeAll",
    SCROLL_ON_HOVER : "scrollOnHover",
    AUTO_SCROLL : "autoScroll",
    SMOOTH_SCROLL : "smoothScroll",
    NO_SCROLL : "noScroll",
    NON_NATIVE_SCROLLBAR : "nonNativeScrollBar",
    DIALOG_MAX_WIDTH : "400px"
  };

  Trillo.Config = {
    /**
     * The extension (,htm or .html or any other) of view templates for
     * non-Trillo server. Trillo Server uses .htm extension by default. If it
     * does not find a template with the ".htm" extension, it looks for a
     * template that matches the given name without extension.
     */
    viewFileExtension : "",

    /**
     * The path of the view template file. For a non-Trillo server the default
     * is /_view. Trillo Server uses /{app name}/view. It allows Trillo server to
     * serve multiple applications (tenants).
     */
    viewPath : null,

    /**
     * The base path that is used as prefix in router. Trillo Server uses the
     * application name as the base path.
     */
    basePath : null,

    pagePath : null
  };

  Trillo.HtmlTemplates = {
    /**
     * Template used for rendering title-bar title prefix. (TODO document what
     * title prefix means).
     */
    titleBarTitlePrefix : '<li nm="{{viewName}}-title-prefix">{{titlePrefix}}</li>',

    /**
     * Template used for rendering title-bar title (TODO document what title
     * means).
     */
    titleBarTitle : '<li nm="{{viewName}}-title">{{title}}</li>',

    /**
     * Template used for rendering title-bar title prefix. (TODO document what
     * title prefix means).
     */
    titleBarTitlePrefix2 : '<span nm="{{viewName}}-title-prefix">{{titlePrefix}}</span>',

    /**
     * Template used for rendering title-bar title (TODO document what title
     * means).
     */
    titleBarTitle2 : '<span nm="{{viewName}}-title">{{title}}</span>',

    /**
     * Template used for rendering dropdown list item
     */
    dropdownListItem : '<li><a class="js-list-item" nm="{{uid}}" href="#">{{name}}</a></li>'
  };

  Trillo.inherits = function(superClass, subclass) {
    subclass.prototype = Object.create(superClass.prototype);
    subclass.prototype.constructor = subclass;
    return subclass;
  };

  /* Examples of Trillo.inherits pattern */

  /*
   * var A = function (a) { this.a = a; console.log("Constructing A: ", a); };
   * A.prototype.say = function() { console.log("A.say(): ", this.a); };
   * 
   * var B = Trillo.inherits(A, function(a, b) { A.call(this, a); this.b = b;
   * console.log("Constructing B: ", a, " : ", b); }); B.prototype.say =
   * function() { A.prototype.say.call(this); console.log("B.say(): ", this.b); };
   * 
   * var C = Trillo.inherits(B, function(a, b, c) { B.call(this, a, b); this.c =
   * c; console.log("Constructing C: ", a, " : ", b, " : ", c); });
   * 
   * C.prototype.say = function() { B.prototype.say.call(this);
   * console.log("C.say(): ", this.c); };
   * 
   * 
   * var inst = new C(11, 12, 13); inst.say(); console.log("inst instanceof C: ",
   * (inst instanceof C)); console.log("inst instanceof B: ", (inst instanceof
   * B)); console.log("inst instanceof A: ", (inst instanceof A));
   * 
   * 
   * inst = new B(51, 52); inst.say(29); console.log("inst instanceof C: ",
   * (inst instanceof C)); console.log("inst instanceof B: ", (inst instanceof
   * B)); console.log("inst instanceof A: ", (inst instanceof A));
   * 
   */

})();
/*******************************************************************************
 * Copyright (c) 2015, 2016 Collager Inc.
 *
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *******************************************************************************/
// File css.js
// CSS classes used in JS to affect style of an element.
// They are defined in the css file as well (in some cases bootstrap). When
// alternate name is used then the value should be changed here to match the new name.
Trillo.CSS = {
    alertDanger: "alert-danger",  // failure alert
    alertSuccess : "alert-success", // success alert
    pointed: "trillo-pointed fa fa-hand-o-right", // content view pointer corresponding to selected Toc
    hasErrorCss : "trillo-has-error", // input field with error
    hasMessageCss : "trillo-has-message", // input field with message (non-error)
    positionOutside : "trillo-position-outside", // position an element out of view (but not hidden "display:none")
    selected : "trillo-selected", // selected element css
    
    appRready: "trillo-app-ready", // class added to body once the application is ready
    tabActive: "active", // class added to active tab
    treeItemTn : "trillo-tree-item-tn", // added class to thumb-nail image of a tree node 
    tnLabel : "trillo-tn-label", // thumb-nail label
    treeNode: "tree-node", // class applied to all tree node 
    treeNodeLevelPrefix: "lvl", // root node is level 0, its children are 1 and so on. A class lvl0 is added to the root node etc.
    treeItem: "trillo-tree-item", // class applied to all tree node text (content)
    itemClose : "trillo-item-close", // class applied to closed tree node item
    itemOpen : "trillo-item-open", // class applied to closed tree node item
    containerPreviewMode : "trillo-container-preview-mode", // added to a container in preview mode
    containerMark : "trillo-container-mark", // marking shown on container in preview mode (such as dashed border)
    buttonGroup : "btn-group", // button group (bootstrap)
    dropdown : "dropdown", // drop-down (bootstrap)
    buttonGroupOpen : "open", // button group open (bootstrap)
    dropdownOpen : "open", // drop down open (bootstrap)
    fieldMsg : "trillo-field-msg" // form field informational or error message
};

/*******************************************************************************
 * Copyright (c) 2015, 2017 Collager Inc.
 *
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *******************************************************************************/
/* globals moment, escape, unescape */
/**
 * Returns all classes associated with the element of a given jQuery object. If
 * a skip class is specified, it is removed from the class names.
 */
(function() {

  "use strict";
  
  var CsrfHeaderName = 'X-CSRF-TOKEN';
  var CsrfCookieName = 'CSRF-TOKEN';
  
  Trillo.isNumeric = function(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
  };
  
  Trillo.isArray = function(d) {
    return $.isArray(d);
  };
  
  Trillo.isObject = function(d) {
    return $.isPlainObject(d);
  };

  Trillo.getAllClasses = function($e, skipClass) {
    var className = $e.attr("class");
    if (!className) {
      className = "";
    } else {
      if (skipClass) {
        className = className.replace(skipClass, "");
      }
    }
    return className;
  };

  /**
   * Given name separated by dot (fully qualified name), it return the reference
   * to the object.
   */
  Trillo.getRefByQualifiedName = function(name) {
    var sl = name.split(".");
    var n = sl.length, idx = 0;
    var res = window;

    while (res && idx < n) {
      res = res[sl[idx++]];
    }

    return res;
  };

  /**
   * A class for creating key-value pairs list.
   */
  Trillo.KeyValue = function() {
    this.l = [];
  };
  
  var KeyValue = Trillo.KeyValue.prototype;

  KeyValue.add = function(k, v) {
    this.l.push({
      k : k,
      v : v
    });
  };
  KeyValue.getValue = function(k) {
    var l = this.l;
    for (var i = 0; i < l.length; i++) {
      if (l[i].k === k) {
        return l[i].v;
      }
    }
    return null;
  };
  
  // given an object returns its uid
  Trillo.uid = function(obj) {
    var temp = obj._uid_;
    var cls;
    if (temp) return temp;
    temp = obj._id_;
    if (temp) {
      cls = obj._class_;
      return cls ? cls + "." + temp : temp;
    }
    return obj.uid ? obj.uid : obj.name; // assumes the obj.uid is unique identifier.
  };

  Trillo.uidToClass = function(uid) {
    var cls = null;
    var idx;
    if (uid) {
      idx = uid.indexOf(".");
      if (idx > 0) {
        cls = uid.substring(0, idx);
      }
    }
    return cls;
  };

  Trillo.uidToId = function(uid) {
    var id = null;
    var idx;
    if (uid) {
      idx = uid.indexOf(".");
      if (idx > 0) {
        id = uid.substring(idx + 1);
      }
    }
    return id;
  };

  Trillo.isUid = function(uid) {
    if (uid) {
      var idx = uid.indexOf(".");
      return idx > 0;
    }
    return false;
  };

  // this method is used to position content area after tool/title bar etc.
  // content area is positioned relative. Bars have fixed position.
  Trillo.offsetByFixedAbsolute = function($e) {
    var h = 0;
    var pos;
    $e.prevAll().each(function() {
      pos = $(this).css("position");
      if (pos === "fixed" || pos === "absolute") {
        h += $(this).outerHeight();
      }
    });
    $e.css("margin-top", h);
  };

  Trillo.showBusy = function() {
    $('.js-busy-indicator').show().css("visibility", "visible");
  };

  Trillo.hideBusy = function() {
    $('.js-busy-indicator').css("visibility", "hidden");
  };

  Trillo.elemId = 0;

  Trillo.getUniqueElemId = function() {
    this.elemId++;
    return "_trillo_e_" + this.elemId;
  };

  // 'name' may be a qualified name separated by "."
  Trillo.getObjectValue = function(obj, name) {
    if (name && name.length !== 0) {
      var sl = name.split(".");
      for (var i = 0; i < sl.length; i++) {
        obj = obj[sl[i]];
        if (!obj) {
          break;
        }
      }
    }
    return obj === undefined || obj === null ? null : obj;
  };

  // 'name' may be a qualified name separated by "."
  Trillo.setObjectValue = function(obj, name, value) {
    var sl = name.split(".");
    var obj2 = obj;
    for (var i = 0; i < sl.length - 1; i++) {
      obj2 = obj[sl[i]];
      if (!obj2) {
        obj2 = {};
        obj[sl[i]] = obj2;
      }
      obj = obj2;
    }
    name = sl[sl.length - 1];
    /*
     * TODO-REVIEW The following code is useful for multi-valued field. if
     * (obj[name] !== undefined) { if (!obj[name].push) { obj[name] = [
     * obj[name] ]; } obj[name].push(value); } else { obj[name] = value; }
     */
    obj[name] = value;
  };

  // 'name' may be a qualified name separated by "."
  Trillo.mergeObject = function(obj, name, sourceObj) {
    var sl = name.split(".");
    var obj2 = obj;
    for (var i = 0; i < sl.length - 1; i++) {
      if (sl[i] === "") {
        continue;
      }
      obj2 = obj[sl[i]];
      if (!obj2) {
        obj2 = {};
        obj[sl[i]] = obj2;
      }
      obj = obj2;
    }
    name = sl[sl.length - 1];
    if (name === "") {
      $.extend(obj, sourceObj);
    } else {
      obj[name] = sourceObj;
    }
  };

  Trillo.formatValue = function($e, value, isField) {
    if (!value || value === "") {
      return isField ? "" : "&nbsp;";
    }
    var dt = $e.dataOrAttr("display-type");
    var enumName = $e.dataOrAttr("enum-name");
    if (dt) {
      if (dt === "date" || dt === "time" || dt === "datetime") {
        return this.formatDate($e, value);
      } else if (enumName) {
        return this.getEnumName($e, value);
      }
    }
    return value;
  };

  Trillo.formatDate = function($e, value) {
    var format = $e.dataOrAttr("format") || "M/D/YY hh:mm:ss A";
    return moment(value).format(format);
  };

  Trillo.getEnumName = function($e, value) {
    var enumName = $e.dataOrAttr("enum-name");
    return Trillo.enumCatalog.getName(enumName, value);
  };

  Trillo.setCookieValue = function(key, value, days) {
    // deleteCookie(key);
    // alert(document.cookie);
    var expires;
    var s;
    if (days) {
      var date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = "; expires=" + date.toGMTString();
    } else {
      expires = "";
    }
    s = value + expires + "; path=/";
    var dm = this.getCookieDomain();
    if (dm) {
      s += ";domain=" + dm;
    }
    document.cookie = key + "=" + s;
  };

  Trillo.getCookieValue = function(key) {
    key = key + "=";
    var i = document.cookie.indexOf(key);
    if (i >= 0) {
      var s = document.cookie.substring(i + key.length);
      i = s.indexOf(";");
      if (i < 0) {
        i = s.length;
      }
      s = s.substring(0, i);
      return unescape(s);
    }
    return "";
  };

  Trillo.deleteCookie = function(key) {
    if (Trillo.getCookieValue(key) !== "")
      document.cookie = key + "=" + ";expires=Thu, 01-Jan-1970 00:00:01 GMT";
  };

  Trillo.getCookieDomain = function() {
    var s = document.domain;
    if (!s || s === "") {
      return null;
    }
    var res = null;
    var n = s.lastIndexOf(".");
    if (n > 0) {
      var s1 = s.substring(0, n);
      var s2 = s.substring(n);
      n = s1.lastIndexOf(".");
      if (n >= 0) {
        s1 = s1.substring(n);
        res = s1 + s2;
      } else {
        res = "." + s1 + s2;
      }
    }
    return res;
  };

  Trillo.matches = function(obj1, obj2, deep) {
    var p;
    for (p in obj1) {
      if (typeof (obj2[p]) === 'undefined' && typeof (obj1[p]) !== 'undefined') {
        return false;
      }
    }

    for (p in obj1) {
      if (obj1[p]) {
        switch (typeof (obj1[p])) {
        case 'object':
          if (deep) {
            if (!Trillo.matches(obj1[p], obj2[p])) {
              return false;
            }
          } else {
            if (obj1[p] !== obj2[p]) {
              return false;
            }
          }
          break;
        case 'function':
          break;
        default:
          if (obj1[p] !== obj2[p]) {
            return false;
          }
        }
      } else {
        if (obj2[p])
          return false;
      }
    }

    for (p in obj2) {
      if (typeof (obj1[p]) === 'undefined') {
        return false;
      }
    }

    return true;
  };

  Trillo.replacer = function(key, value) {
    if (key.indexOf("_trillo_") === 0)
      return undefined;
    else
      return value;
  };

  Trillo.stringify = function(data) {
    return JSON.stringify(data, Trillo.replacer);
  };

  Trillo.getSpecObject = function($e, selector) {
    var $se = $e.find(selector);
    if ($se.length === 0) {
      return null;
    }
    function makeSpec($script) {
      var jsonText = $script.html();
      var temp = null;
      if (jsonText && jsonText.length) {
        try {
          temp = $.parseJSON(jsonText);
        } catch (exc) {
          Trillo.log.error("Failed to parse view spec JSON: " + exc.message + "<br/>" + jsonText);
        }
      }
      return temp;
    }

    function getSpecByName(list, name) {
      for (var j = 0; j < list.length; j++) {
        if (list[j].name === name) {
          return list[j];
        }
      }
      return null;
    }

    var $main = $se.length > 0 ? $($se[0]) : $se; // in case there are more than
                                                  // one viewSpec in a file
    var spec = makeSpec($main);
    if (spec && $se.length > 1) {
      for (var i = 1; i < $se.length; i++) {
        var spec2 = makeSpec($($se[i]));
        if (spec2 !== null) {
          spec2.embedded = true;
          if (!spec.nextViewSpecs) {
            spec.nextViewSpecs = [];
          }
          var vs = getSpecByName(spec.nextViewSpecs, spec2.name);
          if (!vs) {
            spec.nextViewSpecs.push(spec2);
          } else {
            $.extend(vs, spec2);
          }
        }
      }
    }
    $se.remove();
    return spec;
  };

  Trillo.getNearestInDOMTree = function($e, selector) {
    var $temp = $e.find(selector);
    while ($temp.length === 0 && $e.length && ($e.prop("nodeName") || "").toLowerCase() !== "html") {
      $e = $e.parent();
      $temp = $e.find(selector);
    }
    return $temp;
  };

  Trillo.getTriggerFromPath = function(path) {
    var idx = path.indexOf(":");
    if (idx >= 0) {
      return path.substring(0, idx);
    }
    return path;
  };

  Trillo.getViewNameFromPath = function(path) {
    var idx = path.indexOf(":");
    if (idx >= 0) {
      return path.substring(idx + 1);
    }
    return path;
  };

  Trillo.clearObj = function(obj) {
    var prop;
    for (prop in obj) {
      delete obj[prop];
    }
  };

  Trillo.endsWith = function(str, subStr) {
    if (str.length < subStr.length)
      return false;
    return str.lastIndexOf(subStr) === str.length - subStr.length;
  };

  Trillo.deleteFromArray = function(l, item) {
    var idx = l.indexOf(item);
    if (idx >= 0) {
      l.splice(idx, 1);
    }
  };

  Trillo.findByProp = function(l, prop, value) {
    if (l) {
      for (var i = 0; i < l.length; i++) {
        if (l[i][prop] === value) {
          return l[i];
        }
      }
    }
    return null;
  };

  Trillo.endsWith = function(str, suffix) {
    if (!str || !suffix)
      return false;
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
  };

  Trillo.endsWithIgnoreCase = function(str, suffix) {
    if (!str || !suffix)
      return false;
    str = str.toLowerCase();
    suffix = suffix.toLowerCase();
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
  };
  
  Trillo.setCSRFCookieHeader = function (xhr, newCookie) {
  
    //fancy random token, losely after https://gist.github.com/jed/982883
    function b(a) {
      return a ? (a ^ Math.random() * 16 >> a / 4).toString(16) : ([ 1e16 ] + 1e16).replace(/[01]/g, b)
    }

    var CsrfHeaderName = 'X-CSRF-TOKEN';
    var CsrfCookieName = 'CSRF-TOKEN';
    var token = $("meta[name='_csrf']").attr("content");
    var header = $("meta[name='_csrf_header']").attr("content");
    if (header && token) {
      xhr.setRequestHeader(header, token);
    } else {
      token = Trillo.getCookieValue(CsrfCookieName);
      if (newCookie || !token) {
        token = b();
        Trillo.setCookieValue(CsrfCookieName, token);
      }
      xhr.setRequestHeader(CsrfHeaderName, token);
    }
  };

})();

/*******************************************************************************
 * Copyright (c) 2015, 2017 Collager Inc.
 *
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *******************************************************************************/
(function() {

  "use strict";

  Trillo.Storage = function(storage) {
    this.storage = storage;
  };
  
  var Storage = Trillo.Storage.prototype;

  Storage.setItem = function(key, item) {
    item = typeof item === "string" ? item : JSON.stringify(item);
    this.storage.setItem(key, item);
  };
  Storage.getItem = function(key) {
    return this.storage.getItem(key);
  };
  Storage.getItemAsObj = function(key) {
    var s = this.storage.getItem(key);
    return s ? JSON.parse(s) : s;
  };
  Storage.removeItem = function(key) {
    this.storage.removeItem(key);
  };
  Storage.clear = function() {
    var keys = [], i;
    for (i = 0; i < this.storage.length; i++) {
      keys.push(this.storage.key(i));
    }
    for (i = 0; i < keys.length; i++) {
      this.removeItem(keys[i]);
    }
  };
  Storage.removeAllStartingWith = function(prefix) {
    var keys = [], i;
    for (i = 0; i < this.storage.length; i++) {
      if (this.storage.key(i).indexOf(prefix) === 0) {
        keys.push(this.storage.key(i));
      }
    }
    for (i = 0; i < keys.length; i++) {
      this.removeItem(keys[i]);
    }
  };

  Trillo.sessionStorage = new Trillo.Storage(sessionStorage);

  Trillo.localStorage = new Trillo.Storage(localStorage);

})();
/*******************************************************************************
 * Copyright (c) 2015, 2016 Collager Inc.
 *
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *******************************************************************************/
(function() {

  "use strict";

  Trillo.NavHistory = function() {
  };
  
  var NavHistory = Trillo.NavHistory.prototype;

  NavHistory.add = function(parentPath, nextPath, nextPathParams) {
    console.log("NavHistory.add(): " + parentPath + " -> " + nextPath);
    Trillo.localStorage.setItem(parentPath, nextPath);
    if (nextPathParams) {
      Trillo.localStorage.setItem("params://" + Trillo.getFullPath(parentPath, nextPath), nextPathParams);
    } else {
      Trillo.localStorage.removeItem("params://" + Trillo.getFullPath(parentPath, nextPath));
    }
  };

  NavHistory.get = function(parentPath) {
    if (this.isDisabled()) {
      return null;
    }
    var nextPath = Trillo.localStorage.getItem(parentPath);
    console.log("NavHistory.get(): " + parentPath + " -> " + nextPath);
    return nextPath;
  };

  NavHistory.remove = function(path) {
    if (this.isDisabled()) {
      return null;
    }
    console.log("NavHistory.remove(): " + path);
    Trillo.localStorage.removeItem(path);
  };

  NavHistory.getParams = function(parentPath, nextPath, nextPathParams) {
    if (this.isDisabled()) {
      return null;
    }
    var params = Trillo.localStorage.getItem("params://" + Trillo.getFullPath(parentPath, nextPath));
    console.log("NavHistory.getParams(): " + parentPath + "/" + nextPath + "?" + params);
    return params;
  };

  NavHistory.setDisabled = function(value) {
    // history disabled flag is set in the sessionStorage to be non-persistent
    Trillo.sessionStorage.setItem("_nav_history_disabled", "" + value);
  };

  NavHistory.isDisabled = function() {
    return Trillo.sessionStorage.getItem("_nav_history_disabled") === "true";
  };
})();

Trillo.navHistory = new Trillo.NavHistory();

/*******************************************************************************
 * Copyright (c) 2015, 2016 Collager Inc.
 *
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *******************************************************************************/
/* globals Trillo */

(function() {

  "use strict";

  Trillo.Alert = function() {
    this.$e = $('.js-alert');
    this.$t = this.$e.find('.js-title');
    this.$m = this.$e.find('.js-message');
    this.fo = $.proxy(this.fadeOut, this);
    this.actionM = $.proxy(this.doAction, this);
    this.initActionHandler();
  };
  
  var Alert = Trillo.Alert.prototype;

  Alert.initActionHandler = function() {
    this.$e.find('[nm="close"]').off("click", this.actionM).on("click", this.actionM);
  };

  Alert.show = function(title, msg, auto, $pe) {
    this.$e.removeClass(Trillo.CSS.alertDanger).addClass(Trillo.CSS.alertSuccess);
    this._show(title, msg, auto, $pe);
  };

  Alert.showError = function(title, msg, auto, $pe) {
    this.$e.removeClass(Trillo.CSS.alertSuccess).addClass(Trillo.CSS.alertDanger);
    this._show(title, msg, auto, $pe);
  };

  Alert._show = function(title, msg, auto, $pe) {
    this.$e.finish();
    if ($pe) {
      this.$e.css("left", $pe.offset().left + Math.floor($pe.width() / 2));
    } else {
      this.$e.css("left", 0);
    }
    this.$t.html(title);
    msg = msg.replace(/(?:\r\n|\r|\n)/g, '<br />');
    this.$m.html(msg);
    this.$e.hide();
    this.$e.fadeIn(1000, auto ? this.fo : null);
  };

  Alert.fadeOut = function(ev) {
    this.$e.fadeOut(8000);
  };

  Alert.doAction = function(ev) {
    if (ev) {
      ev.stopPropagation();
      var action = $(ev.target).dataOrAttr("nm");
      if (action === "close") {
        this.clear();
      }
    }
  };

  Alert.clear = function(ev) {
    this.$e.finish();
    this.$e.hide();
  };

  Alert.notYetImplemented = function(actionName) {
    this.showError("Not Implemented", "Action '" + actionName + "' is not yet implemented", true);
  }
})();

/*******************************************************************************
 * Copyright (c) 2015, 2017 Collager Inc.
 *
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *******************************************************************************/
(function() {

  "use strict";

  Trillo.BaseController = function(viewSpec) {
    this.viewSpec = viewSpec;
    this.name = viewSpec.name;
    this._view = null;
    this._model = null;
    this._parentController = null;
    this._nextController = null;
    this._embeddedControllers = [];
    this._bizDelegate = null;
    this.viewsInFlight = {};
  };
  
  var BaseController = Trillo.BaseController.prototype;

  BaseController.setView = function(view) {
    this._view = view;
  };

  BaseController.view = function() {
    return this._view;
  };

  BaseController.parentView = function() {
    return this._view.parentView();
  };

  BaseController.setBizDelegate = function(_bizDelegate) {
    this._bizDelegate = _bizDelegate;
  };

  BaseController.bizDelegate = function() {
    return this._bizDelegate;
  };

  BaseController.model = function() {
    return this._model;
  };

  BaseController.apiAdapter = function() {
    return this._apiAdapter;
  };

  BaseController.getData = function() {
    return this._model.data;
  };

  BaseController.parentModel = function() {
    return this._parentController ? this._parentController.model() : null;
  };

  BaseController.getParentData = function() {
    return this._parentController ? this._parentController.getData() : null;
  };

  BaseController.setParentController = function(parentController) {
    this._parentController = parentController;
  };

  BaseController.parentController = function() {
    return this._parentController;
  };

  BaseController.setNextController = function(controller) {
    this._nextController = controller;
  };

  BaseController.addEmbeddedController = function(embeddedController) {
    this._embeddedControllers.push(embeddedController);
  };

  BaseController.removeEmbeddedController = function(embeddedController) {
    this._embeddedControllers.splice(this._embeddedControllers.indexOf(embeddedController), 1);
  };

  BaseController.clear = function() {
  };
  
  BaseController.createModel = function() {
    var modelSpec = this.viewSpec.modelSpec;
    var apiSpec = this.viewSpec.apiSpec;

    debug.debug("BaseController.createModel() - creating new model for: " + this.viewSpec.name);
    if (this._model) {
      this._model.clear();
    }
    this._model = Trillo.modelFactory.createModel(modelSpec, this);
    var data = this.fetchDataLocally(modelSpec);
    if (!data) {
       if (apiSpec) {
        this._apiAdapter = Trillo.apiAdapterFactory.createApiAdapter(apiSpec, this);
        return this.loadData();
      } else if ((!apiSpec && Trillo.supportsTestData(this.viewSpec.type)) && (Trillo.isPreview || Trillo.useTestData)) {
        this._apiAdapter = new Trillo.TestDataAdapter(apiSpec, this);
        return this.loadData();
      } else {
        data = this.fetchDefaultData(modelSpec);
      }
    }
    // local data, create a deferred to support asynch call style
    this.dataAvailable(data);
    var myDeferred = $.Deferred();
    myDeferred.resolve(this._model);
    return myDeferred.promise();
  };
  
  BaseController.loadData = function(pageNumber) {
    var self = this;
    var myDeferred = $.Deferred();
    var promise = this._apiAdapter.loadData();
    promise.done(function(data, paginated, requireClearing) {
      self.dataAvailable(data, paginated, requireClearing);
      myDeferred.resolve(self._model);
    });
    promise.fail(function(result) {
      myDeferred.reject(result);
    });
    return myDeferred.promise();
  };

  BaseController.shouldLoadNewData = function() {
    if (!this.model()) {
      return true;
    }
    if (this.apiAdapter()) {
      return this.apiAdapter().isApiSpecChanged(this.viewSpec.apiSpec);
    }
    var currentData = this.getData();
    var newData = this.fetchDataLocally(this.viewSpec.modelSpec) || this.fetchDefaultData(this.viewSpec.modelSpec);
    return currentData !== newData;
  };
  
  BaseController.fetchDataLocally = function(modelSpec) {
    
    // This method returns model's data based on rules applicable in most common
    // scenario.
    // Override this method is controller to return model data based on some
    // other rule/ logic.
    
    if (modelSpec.data) {
      return modelSpec.data; // data is specified in the modelSpec, use it. 
    }

    // Rule 1: return parent selected data if parent is tree or collection and
    // selected obj's uid is -1
    var parentSelectedObj = this.getParentSelectedObj();
    if (parentSelectedObj && Trillo.uidToId(parentSelectedObj.uid) === "-1") {
      var parentViewType = this.parentView().viewSpec.type;
      if (parentViewType === Trillo.ViewType.Tree || Trillo.isCollectionView(parentViewType)) {
        // an object with -1 uid is selected in the tree or collection view. Use
        // it as as the data for this model
        // This is probably a newly created data and does not exists in the
        // server.
        return parentSelectedObj;
      }
    }

    // Rule 2: if "dataPath" is specified, look up data using it with respect to
    // parent selected obj or parent data.
    var parentContextData = this.getParentSelectedObj() || this.getParentData();
    var data = null;
    if (parentContextData && modelSpec.dataPath) {
      data = Trillo.getObjectValue(parentContextData, modelSpec.dataPath);
      if (data) {
        return data;
      } else {
        data = this.fetchDefaultData(modelSpec);
        if (data) {
          Trillo.setObjectValue(parentContextData, modelSpec.dataPath, data);
          return data;
        }
      }
    }
    
    return null;
  };
  
  BaseController.fetchDefaultData = function(modelSpec) {
    // Rule 3: make default data
    var type = this.viewSpec.type;
    if (Trillo.isCollectionView(type) || Trillo.isTreeView(type)) {
      return [];
    } else if (Trillo.isDetailView(type) || Trillo.isFormView(type)) {
      return {};
    } else {
      var parentData = this.getParentSelectedObj() || this.getParentData();
      // Rule 4: there is not "dataPath" and this is an embedded view, it is
      // probably part or parent view (included from
      // a different file to increase its reuse). Treat it like a part of parent
      // and use parent data.
      if (parentData && !modelSpec.dataPath && this.viewSpec.embedded) {
        // use parent data
        return parentData;
      }
    }
    return {}; // empty object
  };

  
  BaseController.dataAvailable = function(data, paginated, requireClearing) {
    var model = this.model();
    if (model) {
      if (paginated) {
        this.updatePaginatedData(data, requireClearing);
      } else {
        model.setDataQuiet(data);
        this.postProcessModel(this._model);
      }
    }
  };
  
  BaseController.updatePaginatedData = function(pageData, requireClearing) {
    var model = this.model();
    if (!model.data || requireClearing) {
      model.setDataQuiet(pageData.items);
    } else {
      model.appendDataQuiet(pageData.items);
    }
    pageData.items = null;  // remove items from pageData and store it in model
                            // as paginationInfo
    model.setPaginationInfo(pageData);
    this.postProcessModel(this._model);
  };


  BaseController.postProcessModel = function(model) {

  };

  BaseController.handleClickGeneric = function($e) {
    if ($e) {
      var actionFunc = $e.dataOrAttr("action-func");
      if (actionFunc && this[actionFunc]) {
        this[actionFunc]($e, this.getSelectedObj(), this);
        return true;
      }
    }
    if (this._handleClickGeneric($e.dataOrAttr("nm"), $e, this.getSelectedObj(), this)) {
      return true;
    }
    var actionName = $e.dataOrAttr("nm");
    if (actionName && actionName !== "_home" && actionName !== "_appHome") {
      var href = $e.attr("href");
      if (!href || href === "#") {
        Trillo.alert.notYetImplemented(actionName);
      }
    }
    return false;
  };

  BaseController._handleClickGeneric = function(actionName, $e, selectedObj, targetController) {
    var f = false;
    if (this._bizDelegate && this._bizDelegate.handleAction) {
      if (this._bizDelegate.handleAction(actionName, selectedObj, $e, targetController)) {
        return true;
      }
    }
    if (this.handleAction(actionName, selectedObj, $e, targetController)) {
      f = true;
    } else if (this.delegateActionToParent(actionName, selectedObj, $e, targetController)) {
      f = true;
    }
    return f;
  };

  BaseController.handleAction = function(actionName, selectedObj, $e, targetController) {

  };

  BaseController.delegateActionToParent = function(actionName, selectedObj, $e, targetController) {
    if (this.parentController()) {
      return this.parentController()._handleClickGeneric(actionName, $e, selectedObj, targetController);
    }
    return false;
  };

  /**
   * Called by BizDelegate when it completes a delegated action options - may
   * contain any app specific data such as original parameters, result of action
   * etc.
   */
  BaseController.actionDone = function(options) {

  };

  BaseController.getSelectedObj = function() {
    return this._view ? this._view.getSelectedObj() : null;
  };

  BaseController.getParentSelectedObj = function() {
    var pc = this.parentController();
    return pc ? pc.getSelectedObj() : null;
  };

  BaseController.getClosestSelectedObj = function() {
    var res = this.getSelectedObj();
    if (!res) {
      var p = this.parentController();
      res = p ? p.getClosestSelectedObj() : null;
    }
    return res;
  };

  BaseController.canSelectionChange = function(newObjOrName) {
    return true;
  };

  BaseController.selectionChanging = function(newObjOrName) {
  };

  BaseController.selectedObjChanged = function(selectedObj) {
    // custom controllers can take some action by overriding this method.
  };

  /*
   * The difference between customizeViewSpec & customizeChildViewSpec is that
   * "customizeViewSpec" is called on controller by builder for its owner
   * controller. "customizeChildViewSpec" is called due to propagation by the owner
   * or one of its parent. "customizeChildViewSpec" is particularly useful for
   * letting parent update the viewSpec (which is useful if parent needs to
   * update its parameter list or preserve parameter list when navigating across
   * peer. All such decisions are business logic specific.)
   */
  BaseController.customizeViewSpec = function(viewSpec) {
    if (this.parentController()) {
      return this.parentController().customizeChildViewSpec(viewSpec);
    }
  };

  BaseController.customizeChildViewSpec = function(viewSpec) {
    // only one level up, custom class is responsible for anything beyond it.
  };

  BaseController.routeToSelectedView = function(viewName) {
    this.updateRoute(viewName);
  };

  BaseController.getSelected$Elem = function() {
    return this._view.getSelected$Elem();
  };

  BaseController.getSelectedItem = function() {
    return this._view.getSelectedItem();
  };

  BaseController.selectedItemChanged = function(newObjOrName) {
  };

  BaseController.setParam = function(name, value) {
    this.viewSpec.setParam(name, value);
    this.updateRoute();
  };

  BaseController.getParam = function(name) {
    return this.viewSpec.getParam(name);
  };

  BaseController.getParams = function() {
    return this.viewSpec.getParams();
  };

  BaseController.getRouteUpTo = function(includeQuery, skipIfDefault) {
    if (!this.viewSpec.isAppView) {
      var pc = this.parentController();
      var route = pc ? pc.getRouteUpTo(includeQuery) : "";
      var parentNextView = pc ? pc.viewSpec.nextView : null;
      if (!this.viewSpec.embedded && !this.viewSpec.autoLoad) {
        var str = this.getMySubrouteAsStr(includeQuery);
        if (!skipIfDefault || str !== parentNextView) {
          route = route + (str.length > 0 && route.length > 1 ? "/" : "") + str;
        }
      }
      return route;
    }
    return Trillo.Config.pagePath;
  };

  BaseController.getInternalRoute = function() {
    return "";
  };

  BaseController.getMySubrouteAsStr = function(includeQuery) {
    var viewSpec = this.viewSpec;
    if (!viewSpec)
      return "";
    var str = viewSpec.getMyPath() + this.getInternalRoute();
    if (str.length === 0)
      return "";
    if (includeQuery) {
      var query = "";
      $.each(viewSpec.params, function(key, value) {
        query += (query.length ? ";" : "") + (key + "=" + value);
      });
      str += (query.length ? ";" + query : "");
    }
    return str;
  };

  BaseController.setRoute = function(route) {
    Trillo.router.routeTo(route, true);
  };

  BaseController.selectAndRoute = function(uid) {
    // implement in subclass
  };

  BaseController.updateRoute = function(lastSegement) {
    var route = this.getRouteUpTo(true);
    if (lastSegement) {
      route += (route.length ? "/" : "") + lastSegement;
    }
    Trillo.router.routeTo(route, true);
  };

   /*
    Generally, the two parameters that control the display of a view are - 
    a) its context (for example a parent view which is using it); 
    b) what is the current user selection (for example a row).
      If the current selection is available and it is uid then it is give
      preference. "sel" is also used for other selection 
      such as tab name etc therefore a check is made if it is "uid" before preferring it.
   */
  BaseController.getSelectionUidOrContextUid = function() {
    var uid = this.getParam("sel");
    if (!uid || !Trillo.isUid(uid)) {
      uid = this.getParam("uid");
    }
    if (!uid) {
      var p = this.parentController();
      uid = p ? p.getSelectionUidOrContextUid() : null;
    }
    return uid;
  };

  // returns context-uid of this view or
  // selection (sel) or context uid in hierarchy.
  BaseController.getContextUid = function() {
    var uid = this.getParam("uid");
    if (!uid) {
      var p = this.parentController();
      uid = p ? p.getSelectionUidOrContextUid() : null;
    }
    return uid;
  };

  BaseController.customizeModelSpec = function(modelSpec) {

  };

  BaseController.showView = function(viewSpec) {
    var myDeferred = $.Deferred();
    if (this.viewsInFlight[viewSpec.name]) {
      myDeferred.reject();
      return myDeferred.promise();
    }
    this.viewsInFlight[viewSpec.name] = viewSpec;
    viewSpec.params = viewSpec.params || {};
    viewSpec.embedded = true;
    var self = this;
    Trillo.builder.init(viewSpec, null, this._view).done(function(view) {
      view.postSetup();
      self.viewsInFlight[viewSpec.name] = null;
      myDeferred.resolve(view);
    });

    return myDeferred.promise();
  };

  BaseController.showViewByName = function(name, obj, options) {
    var viewSpec = {
      name : name,
      options : options
    };
    if (obj) {
      viewSpec.modelSpec = {
        data : obj
      };
    }
    return this.showView(viewSpec);
  };
  
  BaseController.preViewShown = function(view) {
    var p = this.parentController();
    if (p) {
      p.preViewShown(view);
    }
  };

  BaseController.postViewShown = function(view) {
    var p = this.parentController();
    if (p) {
      p.postViewShown(view);
    }
  };
  
  BaseController.preViewCleanup = function(view) {
    var p = this.parentController();
    if (p) {
      p.preViewCleanup(view);
    }
  };

  BaseController.postViewSetup = function() {
  };

  BaseController.viewByName = function(name) {
    var controller = this.controllerByName(name);
    return controller ? controller.view() : null;
  };

  BaseController.controllerByName = function(name) {
    var controller = this.findControllerByNameNextDir(name);
    if (controller) {
      return controller;
    }
    return this.findControllerByNamePrevDir(name);
  };

  BaseController.findControllerByNameNextDir = function(name) {
    if (this.name === name) {
      return this;
    }
    for (var i = 0; i < this._embeddedControllers.length; i++) {
      var controller = this._embeddedControllers[i].findControllerByNameNextDir(name);
      if (controller) {
        return controller;
      }
    }
    if (this._nextController) {
      return this._nextController.findControllerByNameNextDir(name);
    }
  };

  BaseController.findControllerByNamePrevDir = function(name) {
    if (this.name === name) {
      return this;
    }
    if (this._parentController) {
      return this._parentController.findControllerByNamePrevDir(name);
    }
  };

  BaseController.attrChanged = function(obj, name, value, oldValue, model) {
    var p = this.parentController();
    if (p) {
      p.attrChanged(obj, name, value, oldValue, model);
    }
  };

  BaseController.objChanged = function(obj) {
    this._view.objChanged(obj);
    var p = this.parentController();
    if (p) {
      p.objChanged(obj);
    }
  };

  BaseController.objAdded = function(newObj, atEnd) {
    this._view.objAdded(newObj, atEnd);
    var p = this.parentController();
    if (p) {
      p.objAdded(newObj, atEnd);
    }
  };

  BaseController.objDeleted = function(obj) {
    this._view.objDeleted(obj);
    var p = this.parentController();
    if (p) {
      p.objDeleted(obj);
    }
  };

  BaseController.modelDataChanged = function(model) {
    this._view.modelDataChanged(model);
    var p = this.parentController();
    if (p) {
      p.modelDataChanged(model);
    }
  };

  BaseController.refreshAllViews = function(lisOfViews) {
    // implemented by subclass
  };

  BaseController.refreshViews = function(lisOfViews) {
    // implemented by subclass
  };

  /** Requires this._super call */
  BaseController.updateTbState = function(selectedObj) {
    // this can be overridden by custom controllers to update tools state.
    if (this._bizDelegate && this._bizDelegate.updateTbState) {
      this._bizDelegate.updateTbState(selectedObj);
    }
  };

  BaseController.setToolVisible = function(name, visible) {
    this._view.toolsMgr.setToolVisible(name, visible);
  };

  BaseController.setToolVisibleBySelector = function(selector, visible) {
    this._view.toolsMgr.setToolVisibleBySelector(selector, visible);
  };

  BaseController.postToolsActivate = function() {
    // this can be overridden by custom controllers to do any custom logic
    // related to tools.
  };

  /** Requires this._super call */
  BaseController.showResult = function(result) {
    if (result.status === "failed") {
      Trillo.alert.showError("Error", result.message || result.status);
    } else {
      Trillo.alert.show("Success", result.message || result.status);
    }
  };

  BaseController.getAppRootElem = function() {
    if (this._parentController) {
      return this._parentController.getAppRootElem();
    }
    return this._view.$elem();
  };

  /** Requires this._super call */
  BaseController.showNamedMessagesAsError = function(messages) {
  };

  BaseController.updateTitle = function() {
  };

  BaseController.changeManagerUpdated = function(undoLen, redoLen) {
  };

  BaseController.undoing = function(change, firstInTx) {
  };

  BaseController.redoing = function(change, firstInTx) {
  };

  BaseController.undone = function(change, firstInTx) {
  };

  BaseController.redone = function(change, firstInTx) {
  };

  BaseController.undoCompleted = function() {
  };

  BaseController.redoCompleted = function() {
  };

  BaseController.txStarted = function() {
  };

  BaseController.txEnding = function() {
  };

  BaseController.txEnded = function() {
  };

  BaseController.beforeShowContextMenu = function() {
  }
})();
/*******************************************************************************
 * Copyright (c) 2015, 2017 Collager Inc.
 *
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *******************************************************************************/
(function() {

  "use strict";

  Trillo.Controller = Trillo.inherits(Trillo.BaseController, function(viewSpec) {
    Trillo.BaseController.call(this, viewSpec);
  });
  
  var Controller = Trillo.Controller.prototype;

  Controller.$elem = function() {
    return this._view.$elem();
  };

  Controller.$container = function() {
    return this._view.$container();
  };

  Controller.refreshAllViews = function() {
    return Trillo.builder.refresh(this._view);
  };

  Controller.refreshViews = function(listOfViews) {
    return Trillo.builder.refresh(this._view, listOfViews);
  };

  Controller.getInternalRoute = function() {
    return this._view.internalRoute.length ? "/" + this._view.internalRoute : "";
  };

  Controller.selectAndRoute = function(uid) {
    return this._view.selectAndRoute(uid);
  };

  Controller.showNamedMessagesAsError = function(messages) {
    this._view.showNamedMessagesAsError(messages);
  };

  /*
   * By default it lets the view compute its own title. Custom controller can
   * override this and set own title by calling this._view.setTitle(title,
   * titlePrefix);
   */
  Controller.updateTitle = function() {
    this._view.updateTitle();
  };

  Controller.handleAction = function(actionName, selectedObj, $e, targetController) {
    if (actionName === "close") {
      this.close();
      return true;
    } else if (actionName === "ok") {
      this.ok();
      return true;
    } else if (actionName === 'upload') {
      this.doUpload();
      return true;
    } else if (actionName === "hide") {
      this._view.hide();
      return true;
    } else if (actionName === "_home" || actionName === "_appHome") {
      // disable history until reload of the page and one cycle of routing.
      // router enables it after one cycle of routing is completed.
      Trillo.navHistory.setDisabled(true);
      // still return the false so that the "preventDefault" is not called.
      // These actions have "a" element with a navigable href. Due to default
      // action page will reload with the specified href.
      return false;
    } else if (this.viewSpec.type != "actionTool" && this.viewSpec.type != "menu") {
      return this.doTriggerNextView(actionName, selectedObj);
    }
    return false;
  };

  Controller.actionDone = function(options) {
    if (this.viewSpec.postRenderer) {
      this.viewSpec.postRenderer(options.selectedObj._trillo_infoBlock);
    }
    if (this.getSelectedObj() === options.selectedObj) {
      this._view.setTbState();
    }
  };

  Controller.close = function() {
    if (this.closing) {
      this.closing(this._view);
    }
    this._view.clear();
  };

  Controller.closing = function(view) {
    var p = this.parentController();
    if (p && p.closing) {
      p.closing(view);
    }
  };

  Controller.ok = function() {
    if (this.viewSpec.type === Trillo.ViewType.Form) {
      this.submitForm();
    }
  };

  // This is useful when a left tree displays a hierarchy, where a parent node
  // represents a collection of objects
  // and its children represent each object - for example in case of Trillo.Dev
  // view tree,
  // a node represents the name of application (folder) and each child
  // represents a view.
  // Selecting a folder node displays the collection view on the right side.
  // When user selects
  // detail of an object in the collection (using "Detail" button or double
  // click), the corresponding child node
  // is selected in the tree and its detail view is shown. This is default
  // behavior for a
  // folder->sub-folder_...->object kind of hierarchy.
  Controller.doTriggerNextView = function(actionName, selectedObj) {
    if (!selectedObj) {
      selectedObj = {};
    }
    var nextViewSpec = this.viewSpec.getNextViewSpecByTrigger(actionName);
    if (nextViewSpec) {
      if (nextViewSpec.type === "actionTool") {
        return false;
      }
      if (nextViewSpec.type === "page") {
        return false;
      }
      if (nextViewSpec.dialog) {
        this.showViewByName(nextViewSpec.name, selectedObj);
        return true;
      }
      var path;
      if (nextViewSpec.absoluteRoute) {
        path = nextViewSpec.name + ";uid=" + selectedObj.uid;
        this.setRoute(path);
      } else {
        path = nextViewSpec.name;
        this.updateRoute(path);
      }
      return true;
    } else {
      var p = this.parentController();
      if (p && Trillo.isCollectionView(this.viewSpec.type) && p.viewSpec.type === Trillo.ViewType.Tree) {
        var item = p.view().tree.getItemByUid(selectedObj.uid);
        if (item) {
          return p.selectAndRoute(selectedObj.uid);
        }
      }
      return false;
    }
  };

  Controller.doUpload = function() {
    this.showView(this.getFileUploadSpec());
  };

  Controller.getFileUploadSpec = function() {
    return {
      name : "FileUpload",
      type : Trillo.ViewType.Default,
      dialog : true,
      container : "trillo-dialog-container",
      controller : "Trillo.FileUploadC",
      modelSpec : {
        data : {
          fileName : "a"
        }
      },
      params : {
        targetViewName : this.viewSpec.name,
        folder : "",
        uploadUrl : "/fileUpload"
      }
    };
  };

  Controller.fileUploadSuccessful = function(option) {
    if (this.viewSpec.dialog) {
      this.close();
    }
  };

  Controller.fileUploadFailed = function(option) {
    this.showFileUploadError(option.error);
  };

  Controller.showFileUploadError = function(error) {
    this.$elem().find(".js-upload-alert").html(error).show();
  };

  Controller.clearFileUploadError = function(option) {
    this.$elem().find(".js-upload-alert").html("").hide();
  };

  Controller.submitForm = function() {
    if (this._view.canSubmit()) {
      var data = this.getData();
      if (!this.beforePost(data, this._view)) {
        return;
      }
      var cb = $.proxy(this.submitFormCompleted, this);
      var postData;
      var url;
      var viewSpec = this.viewSpec;
      postData = data;
      url = viewSpec.postUrl;
      $.ajax({
        url : url,
        type : 'post',
        data : Trillo.stringify(postData),
        contentType : "application/json"
      }).done(cb);
    }
  };

  Controller.getFormSubmitUrl = function() {
    return "/submitForm";
  };

  Controller.submitFormCompleted = function(result) {
    if (result.status === "failed") {
      this.showNamedMessagesAsError(result.namedMessages);
    } else {
      this.clear();
      if (this.viewSpec.dialog) {
        this.close();
      }
    }
    this.afterPost(result, this.view());
  };

  Controller.beforePost = function(data, view) {
    var p = this.parentController();
    if (p) {
      return p.beforePost(data, view);
    }
    return true;
  };

  Controller.afterPost = function(result, view) {
    var p = this.parentController();
    if (p) {
      p.afterPost(result, view);
    } else {
      if (result.status !== "failed") {
        (view || this.view()).$e.find('form')[0].reset();
      }
      this.showResult(result);
    }
  }
})();