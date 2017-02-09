/*!
 * TrilloJS v0.5.0 (https://github.com/trillo/trillojs#readme)
 * Copyright 2017 Collager Inc.
 * Licensed under the MIT license
 */
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
/*******************************************************************************
 * Copyright (c) 2015, 2017 Collager Inc.
 *
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *******************************************************************************/
(function() {

  "use strict";

  Trillo.Tools = function(options) {
    this.mgr = options.mgr;
    this.$toolsE = options.$toolsE;
    this.$toolsContainer = options.$toolsContainer;
    this.toolSelectedMethod = $.proxy(this.toolSelected, this);
    this.actionablToolElems = [];
    this.makeActionableToolElemsList(this.$toolsE, this.actionablToolElems);
  };
  
  var Tools = Trillo.Tools.prototype;
  
  Tools.activate = function() {
    if (this.$toolsContainer) {
      this.$toolsContainer.append(this.$toolsE);
    }
    if (!this.$toolsE.is('.js-app-managed-visibility')) {
      this.$toolsE.removeClass("hide");
    }
    this.$toolsE.css("display", "");
    this.$toolsE.off("click", this.toolSelectedMethod);
    this.$toolsE.on("click", this.toolSelectedMethod);
  };
  Tools.clear = function() {
    this.$toolsE.off("click", this.toolSelectedMethod);
    this.$toolsE.addClass("hide");
    if (this.$toolsContainer) {
      this.$toolsE.remove();
    }
  };
  Tools.toolSelected = function(ev) {
    Trillo.hideCurrentOverlays(true, false);
    var $e = Trillo.getActualTarget(ev);
    if (!$e) {
      return;
    }

    if ($e.hasClass("dropdown-toggle")) {
      return;
    }
    if (ev) {
      ev.stopPropagation();
    }
    $e.closest("." + Trillo.CSS.buttonGroup + "." + Trillo.CSS.buttonGroupOpen).removeClass(Trillo.CSS.buttonGroupOpen);
    $e.closest("." + Trillo.CSS.dropdown + "." + Trillo.CSS.dropdownOpen).removeClass(Trillo.CSS.dropdownOpen);

    if (this.mgr.handleClickGeneric($e)) {
      $(".js-navbar-toggle").each(function() {
        $($(this).data("target")).removeClass("in").addClass('collapse');
      });
      ev.preventDefault();
    } else {
      var tag = $e.prop("tagName").toLowerCase();
      if (tag === "a") {
        var href = $e.attr("href");
        if (!href || href === "#") {
          ev.preventDefault();
        }
      }
    }
  };

  Tools.setDisabled = function(disabled) {
    if (disabled) {
      this.$toolsE.find("button").attr("disabled", true);
      this.$toolsE.find("a").attr("disabled", true);
    } else {
      this.$toolsE.find("button").removeAttr("disabled");
      this.$toolsE.find("a").removeAttr("disabled");
    }
  };

  Tools.makeActionableToolElemsList = function($c, l) {
    var self = this;
    $.each($c.children(), function(idx, e) {
      var $e = $(e);
      var tag = $e.prop("tagName").toLowerCase();
      if ($e.hasClass("js-tool") || tag === "a" || tag === "button") {
        l.push($e);
      } else {
        self.makeActionableToolElemsList($e, l);
      }
    });
  };

  Tools.allHidden = function() {
    var l = this.actionablToolElems;
    for (var i = 0; i < l.length; i++) {
      if (!l[i].hasClass("hide") && l[i].css("display") !== "none") {
        return false;
      }
    }
    return true;
  };
})();

/*******************************************************************************
 * Copyright (c) 2015, 2017 Collager Inc.
 *
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *******************************************************************************/
(function() {

  "use strict";

  Trillo.ToolManager = function(view) {
    this._view = view;
    this._controller = view.controller();
    this.toolbarTools = null;
    this.hoverTools = null;
    this.contextTools = null;
    this.tools = [];

    var self = this;
    var $e = view.$elem();

    if (view.viewSpec.type != "menu") {
      var $te, t;
      if (view.$container()) {
        var $tce = view.getToolBar$Elem();
        if ($tce.length > 0) {
          this.toolbarTools = this.makeTools($e.find(".js-toolbar-tools"), $tce, true);
        }
      }

      this.hoverTools = this.makeTools($e.find(".js-hover-tools"), null, true);
      this.contextTools = this.makeTools($e.find(".js-context-menu"), null, true);

      $e.find(".js-tool").each(function() {
        self.makeTools($(this), null, false);
      });
    } else {
      $e.find(
          ".js-menu-item-trigger, .js-menu-item a, .js-menu-item button, "
              + ".js-menu-item :input[type=button], .js-menu-item :input[type=submit], "
              + ".js-menu-item :input[type=reset]").each(function() {
        self.makeTools($(this), null, false);
      });
    }
    $e.find(".js-popover-trigger").each(function() {
      self.makePopover($(this));
    });
  };
  
  var ToolManager = Trillo.ToolManager.prototype;

  ToolManager.makeTools = function($te, $tce, remove) {
    if (Trillo.belongsToView($te, this._view.name)) {
      $te.data("for-view", this._view.name);
      if (remove) {
        $te.remove();
      }
      var t = new Trillo.Tools({
        $toolsE : $te,
        $toolsContainer : $tce,
        mgr : this
      });
      this.tools.push(t);
      return t;
    }
    return null;
  };

  ToolManager.makePopover = function($te) {
    if (Trillo.belongsToView($te, this._view.name)) {
      $te.data("for-view", this._view.name);
      Trillo.popoverManager.createPopoverForTrigger($te);
    }
    return null;
  };

  ToolManager.activate = function() {
    var tools = this.tools;
    for (var i = 0; i < tools.length; i++) {
      tools[i].activate();
    }
    this.setTbState(null);
    this._controller.postToolsActivate();
  };

  ToolManager.clear = function(ah) {
    var tools = this.tools;
    for (var i = 0; i < tools.length; i++) {
      tools[i].clear();
    }
  };

  ToolManager.handleClickGeneric = function($e) {
    if (this._controller.handleClickGeneric($e)) {
      Trillo.popoverManager.hideCurrentPopupIfContains($e);
      return true;
    } else {
      return false;
    }
  };

  ToolManager.setTbState = function(obj) {
    var tools = this.tools;
    var disabled = obj && obj.availabilityState === Trillo.OBJ_LOCKED;
    var i;
    for (i = 0; i < tools.length; i++) {
      Trillo.findAndSelf(tools[i].$toolsE, '[data-for-class]').addClass("hide");
      tools[i].setDisabled(disabled);
    }
    if (obj) {
      var cls = Trillo.uidToClass(obj.uid);
      if (cls) {
        for (i = 0; i < tools.length; i++) {
          Trillo.findAndSelf(tools[i].$toolsE, '[data-for-class="' + cls + '"]').css("display", "").removeClass("hide");
        }
      }
      for (i = 0; i < tools.length; i++) {
        if (tools[i].$toolsE.is(':not([data-for-class])') && !tools[i].$toolsE.is('.js-context-menu')
            && !tools[i].$toolsE.is('.js-app-managed-visibility')) {
          tools[i].$toolsE.css("display", "").removeClass("hide");
        }
      }
    }

    this._controller.updateTbState(obj);
  };

  ToolManager.setPopoverTriggerState = function($tce, popoverToolsVisible) {
    var tools = this.tools;
    var $e = this._view.$elem();
    var $te;
    var i;
    if (!popoverToolsVisible) {
      for (i = 0; i < tools.length; i++) {
        popoverToolsVisible = !tools[i].allHidden();
        if (popoverToolsVisible) {
          break;
        }
      }
    }
    $e.find(".js-popover-trigger").each(function() {
      $te = $(this);
      if (popoverToolsVisible) {
        $te.removeClass("trillo-trigger-has-no-content");
      } else {
        $te.addClass("trillo-trigger-has-no-content");
      }
    });
    return popoverToolsVisible;
  };

  ToolManager.showContextMenu = function(x, y) {
    if (this.contextTools) {
      this._controller.beforeShowContextMenu(this.contextTools.$toolsE);
      if (!this.contextTools.allHidden()) {
        Trillo.contextMenuManager.showContextMenu(this.contextTools.$toolsE, x, y);
        return true;
      }
    }
    return false;
  };

  ToolManager.setToolVisible = function(name, visible) {
    var selector = '[nm="' + name + '"]';
    this.setToolVisibleBySelector(selector, visible);
  };

  ToolManager.setToolVisibleBySelector = function(selector, visible) {
    var tools = this.tools;
    var i;
    if (visible) {
      for (i = 0; i < tools.length; i++) {
        Trillo.findAndSelf(tools[i].$toolsE, selector).css("display", "").removeClass("hide");
      }
    } else {
      for (i = 0; i < tools.length; i++) {
        Trillo.findAndSelf(tools[i].$toolsE, selector).addClass("hide");
      }
    }
  };

  ToolManager.removeToolsWithInElement = function() {
    var tools = this.tools;
    var newTools = [];
    for (var i = 0; i < tools.length; i++) {
      if (tools[i].$toolsE.hasClass(".js-tool")) {
        tools[i].clear(this);
      } else {
        newTools.push(tools[i]);
      }
    }
    this.tools = newTools;
  };

  ToolManager.addToolsWithInElement = function($e) {
    var $te = $e.find(".js-tool");
    if (Trillo.belongsToView($te, this._view.name)) {
      var t = new Trillo.Tools({
        $toolsE : $te,
        mgr : this
      });
      this.tools.push(t);
      return t;
    }
    return null;
  };

  ToolManager.enableTool = function(name, enable) {
    var selector = '[nm="' + name + '"]';
    this.enableToolBySelector(selector, enable);
  };

  ToolManager.enableToolBySelector = function(selector, enable) {
    var tools = this.tools;
    var i;
    if (enable) {
      for (i = 0; i < tools.length; i++) {
        Trillo.findAndSelf(tools[i].$toolsE, selector).removeAttr("disabled");
      }
    } else {
      for (i = 0; i < tools.length; i++) {
        Trillo.findAndSelf(tools[i].$toolsE, selector).attr("disabled", "disabled");
      }
    }
  };
})();

/*******************************************************************************
 * Copyright (c) 2015, 2017 Collager Inc.
 *
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *******************************************************************************/
/* globals Mustache */
(function() {

  "use strict";

  Trillo.InfoElementRepo = function() {
    this.table = {}; // template element by elemKey
    this.tableOfList = {}; // elements created using template and available for
                            // use
  };
  
  var InfoElementRepo = Trillo.InfoElementRepo.prototype;
  
  InfoElementRepo.addTemplate = function($e, elemKey) {
    $e.show();
    this.table[elemKey] = new Trillo.InfoElement(elemKey, $e, true);
  };
  InfoElementRepo.getE = function(elemKey, obj) {
    var l = this.tableOfList[elemKey];
    if (l && l.length > 0) {
      return l.pop();
    }

    var infoE = this.table[elemKey];
    if (!infoE) {
      return null;
    }

    return infoE.copyIt(obj);
  };
  InfoElementRepo.releaseE = function(infoE) {
    if (infoE.useTemplate) {
      return; // info blocks using template need to recreated therefore do not
              // save them.
    }
    var l = this.tableOfList[infoE.elemKey];
    if (!l) {
      this.tableOfList[infoE.elemKey] = l = [];
    }
    l.push(infoE);
    infoE.clear();
  };
  InfoElementRepo.makeInfoBlockList = function(elemKey, l, canvas) {
    var infoE = this.table[elemKey];
    if (!infoE) {
      return null;
    }
    if (infoE.requiresPositioning) {
      return this.makePositionedInfoBlockList(infoE, elemKey, l, canvas);
    } else {
      return this.makeAutoInfoBlockList(infoE, elemKey, l, canvas);
    }
  };
  InfoElementRepo.makePositionedInfoBlockList = function(infoE, elemKey, l, canvas) {
    var infoBlock;
    var res = [];
    infoE.$rootE.addClass(Trillo.CSS.positionOutside);
    canvas.canvasE.appendChild(infoE.e);
    var maxH = 0;
    var h;
    var i;
    var tabular = canvas.parent.viewSpec.type === "table";
    var colWidths = infoE.colWidths;
    var $h, w, dw, $el, $e, percent;
    if (tabular && !colWidths && canvas.$headerRow) {
      $h = canvas.$headerRow;
      $h.addClass(Trillo.CSS.positionOutside);
      canvas.$canvasE.append($h);
      w = canvas.$canvasE.width();
      dw = w;
      $el = canvas.$headerRow.children();
      if ($el.length) {
        $el.each(function() {
          $e = $(this);
          dw = dw - $e.width();
        });
        colWidths = [];
        dw = dw / $el.length;
        $el.each(function() {
          $e = $(this);
          percent = Math.round((($e.width() + dw) / w) * 100);
          $e.css("width", percent + "%");
          colWidths.push(percent);
        });
        $el = infoE.$rootE.children();
        i = 0;
        $el.each(function() {
          if (i < colWidths.length) {
            $e = $(this);
            $e.css("width", colWidths[i] + "%");
            i++;
          }
        });
      }
      $h.removeClass(Trillo.CSS.positionOutside);
    }
    for (i = 0; i < l.length; i++) {
      if (l[i]._trillo_infoBlock) {
        continue;
      }
      infoBlock = new Trillo.InfoBlock(elemKey, l[i], canvas);
      // infoE.$rootE.height("auto"); //setting auto computes incorrect height
      infoE.show(l[i], infoBlock);
      h = infoBlock.h = infoE.$rootE.outerHeight();
      infoBlock.contentH = infoE.$rootE.height();
      if (h > maxH) {
        maxH = h;
      }
      infoBlock.w = infoE.$rootE.outerWidth();
      res.push(infoBlock);
      l[i]._trillo_infoBlock = infoBlock;
      infoE.clear();
    }
    if (canvas.areAllSameSize) {
      for (i = 0; i < res.length; i++) {
        res[i].contentH += maxH - res[i].h;
        res[i].h = maxH;
      }
    }
    infoE.$rootE.removeClass(Trillo.CSS.positionOutside);
    infoE.clear();
    canvas.canvasE.removeChild(infoE.e);
    return res;
  };
  InfoElementRepo.makeAutoInfoBlockList = function(infoE, elemKey, l, canvas) {
    var infoBlock;
    var res = [];

    for (var i = 0; i < l.length; i++) {
      if (l[i]._trillo_infoBlock) {
        continue;
      }
      infoBlock = new Trillo.InfoBlock(elemKey, l[i], canvas);
      res.push(infoBlock);
      l[i]._trillo_infoBlock = infoBlock;
    }
    return res;
  };

  InfoElementRepo.requiresLayout = function(elemKey) {
    var infoE = this.table[elemKey];
    return infoE && infoE.requiresPositioning;
  };

  /**
   * @param elemKey -
   *          unique key for the template
   * @param $rootE -
   *          jquery object for the element
   * @param isTemplate -
   *          if true it means it is constructing an object that will be used as
   *          template to create more objects with similar element
   */
  Trillo.InfoElement = function(elemKey, $rootE, isTemplate) {
    this.$rootE = $rootE;
    this.elemKey = elemKey;
    this.e = $rootE[0];
    this.elements = [];
    this.hasTemplateTokens = false;
    this.requiresPositioning = true;
    if (isTemplate) {
      var html = $rootE[0].outerHTML;
      if (html.indexOf("{{") >= 0) {
        debug.debug("Trillo.InfoElement - parsing using Mustache");
        var tokens = Mustache.parse(html);
        // tokens .length === 1 means that entire template is one token and
        // there is no mustache directive ({{...}}) present.
        if (tokens.length > 1) {
          debug.debug("Trillo.InfoElement - requires template processing while doing copyIt");
          this.templateHtml = html;
          this.useTemplate = true;
        } else {
          debug.debug("Trillo.InfoElement - no template processing needed");
        }
      } else {
        debug.debug("Trillo.InfoElement - no template parsing done");
      }
      $rootE.hide();
      document.body.appendChild($rootE[0]);
      var temp = $rootE.css("position");
      document.body.removeChild($rootE[0]);
      $rootE.show();
      this.requiresPositioning = temp && temp.toLowerCase() === "absolute";
    }
    var el = this.e.getElementsByTagName("*");
    var e;
    for (var i = 0; i < el.length; i++) {
      e = el[i];
      if (!Trillo.isActionElement($(e)) && e.getAttribute("nm")) {
        this.elements.push(e);
      }
    }
    this.$inputs = Trillo.getInputs($rootE);
  };
  
  var InfoElement = Trillo.InfoElement.prototype;
  
  InfoElement.show = function(obj, infoBlock) {
    var $e, $c, $gcl, el = this.elements, n = el.length, name;
    for (var i = 0; i < n; i++) {
      $e = $(el[i]);
      name = $e.dataOrAttr("nm");
      Trillo.setFieldValue($e, obj[name], false);
    }
    var contentH = infoBlock.contentH;
    if (this.$rootE.hasClass("js-content-row") && contentH) {
      this.$rootE.height(contentH);
      this.$rootE.children().each(function() {
        // Following logic to vertically align the content of the table.
        $c = $(this);
        $c.height(contentH);
        $gcl = $c.children();
        if ($gcl.length === 0) {
          $c.css("line-height", contentH + "px");
        } else if ($gcl.length === 1) {
          $gcl.css("margin-top", ((contentH - $gcl.outerHeight()) / 2) + "px");
        }
      });
    }
  };
  InfoElement.clear = function() {
    var e, el = this.elements, n = el.length;
    for (var i = 0; i < n; i++) {
      e = el[i];
      Trillo.setFieldValue($(e), null, false);
    }
  };
  InfoElement.copyIt = function(obj) {
    var $e;
    if (this.useTemplate) {
      var newHtml = Mustache.render(this.templateHtml, obj);
      $e = $('<div/>').html(newHtml).contents();
    } else {
      $e = this.$rootE.clone();
    }
    var infoE = new Trillo.InfoElement(this.elemKey, $e, false);
    infoE.useTemplate = this.useTemplate;
    infoE.requiresPositioning = this.requiresPositioning;
    return infoE;
  };

  Trillo.InfoBlock = function(elemKey, obj, canvas) {
    this.elemKey = elemKey;
    this.obj = obj;
    this.canvas = canvas;
    this.x = 0;
    this.y = 0;
    this.h = -1;
    this.w = -1;
    this.infoE = null;
    this.clickHandler = $.proxy(this.clicked, this);
    this.dblClickHandler = $.proxy(this.dblClicked, this);
    this.contextMenuHandler = $.proxy(this.onContextMenu, this);
    if (canvas.supportsHoverTools) {
      this.mouseOverHandler = $.proxy(this.mouseOver, this);
      this.mouseLeaveHandler = $.proxy(this.mouseLeave, this);
    }
    this.changeHandler = $.proxy(this.fieldChanged, this);
  };
  
  var InfoBlock = Trillo.InfoBlock.prototype;

  InfoBlock.show = function() {
    var infoE = this.infoE;
    if (!infoE) {
      this.infoE = infoE = Trillo.infoElementRepo.getE(this.elemKey, this.obj);
      if (infoE.requiresPositioning) {
        // this.infoE.$rootE.css("min-height", this.h + "px");
      }
      this.canvas.canvasE.appendChild(infoE.e);
      infoE.show(this.obj, this);
    } else {
      this.canvas.canvasE.appendChild(infoE.e);
    }
    if (infoE.requiresPositioning) {
      infoE.$rootE.css({
        left : this.x,
        top : this.y
      });
    }

    infoE.$rootE.off("click", this.clickHandler);
    infoE.$rootE.on("click", this.clickHandler);
    infoE.$rootE.off("dblclick", this.dblClickHandler);
    infoE.$rootE.on("dblclick", this.dblClickHandler);

    infoE.$rootE.off("contextmenu", this.contextMenuHandler);
    infoE.$rootE.on("contextmenu", this.contextMenuHandler);
    if (this.mouseOverHandler) {
      infoE.$rootE.off("mouseover", this.mouseOverHandler);
      infoE.$rootE.on("mouseover", this.mouseOverHandler);
    }
    if (infoE.$inputs.length > 0) {
      infoE.$inputs.off("change", this.changeHandler);
      infoE.$inputs.on("change", this.changeHandler);
    }
    if (this.canvas.postRenderer) {
      this.canvas.postRenderer(this);
    }
  };

  InfoBlock.refresh = function() {
    if (this.infoE) {
      this.infoE.show(this.obj, this);
      if (this.canvas.postRenderer) {
        this.canvas.postRenderer(this);
      }
    }
  };

  InfoBlock.hide = function() {
    var infoE = this.infoE;
    if (infoE) {
      infoE.$rootE.off("click", this.clickHandler);
      infoE.$rootE.off("dblclick", this.dblClickHandler);
      infoE.$rootE.off("contextmenu", this.contextMenuHandler);
      if (this.mouseOverHandler) {
        infoE.$rootE.off("mouseover", this.mouseOverHandler);
        infoE.$rootE.off("mouseleave", this.mouseLeaveHandler);
      }
      Trillo.infoElementRepo.releaseE(infoE);
      if (this.canvas.selected === this) {
        this.canvas.unselectInfoItem(this);
      }
      if (infoE.$inputs.length > 0) {
        infoE.$inputs.off("change", this.changeHandler);
      }
      this.infoE = null;
    }
  };
  InfoBlock.setPosition = function(x, y) {
    this.x = x;
    this.y = y;
  };
  InfoBlock.move = function(dx, dy) {
    this.x += dx;
    this.y += dy;
  };
  InfoBlock.clicked = function(ev) {
    Trillo.hideCurrentOverlays(true, false);
    var isAnchorWithoutHref = false;
    if (ev && !$(ev.target).is(":input")) {
      ev.stopPropagation();
      var $t = $(ev.target);
      if ($t.prop("tagName").toLowerCase() == "a") {
        var href = $t.attr("href");
        if (!href || href === "#") {
          isAnchorWithoutHref = true;
        }
      }
    }
    if (this.canvas.clicked(this, ev) || isAnchorWithoutHref) {
      ev.preventDefault();
    }
  };
  InfoBlock.dblClicked = function(ev) {
    Trillo.hideCurrentOverlays(true, false);
    if (ev && !$(ev.target).is(":input")) {
      ev.stopPropagation();
    }
    this.canvas.dblClicked(this, ev);
  };
  InfoBlock.onContextMenu = function(ev) {
    ev.stopPropagation();
    if (this.canvas.doContextMenu(this, ev.pageX, ev.pageY)) {
      ev.preventDefault();
    }
  };
  InfoBlock.select = function() {
    if (this.infoE) {
      this.infoE.$rootE.addClass(Trillo.CSS.selected);
    }
  };
  InfoBlock.unselect = function() {
    if (this.infoE) {
      this.infoE.$rootE.removeClass(Trillo.CSS.selected);
    }
  };
  InfoBlock.mouseOver = function(ev) {
    var infoE = this.infoE;
    infoE.$rootE.off("mouseover", this.mouseOverHandler);
    infoE.$rootE.on("mouseleave", this.mouseLeaveHandler);
    this.canvas.setHoverInfoItem(this);
    return true;
  };
  InfoBlock.mouseLeave = function(ev, cb2) {
    var infoE = this.infoE;
    infoE.$rootE.on("mouseover", this.mouseOverHandler);
    infoE.$rootE.off("mouseleave", this.mouseLeaveHandler);
    this.canvas.setHoverInfoItem(null);
  };
  InfoBlock.fieldChanged = function(ev) {
    var $e = $(ev.target);
    var name = $e.dataOrAttr("nm");
    var value = Trillo.getFieldValue($e);
    this.canvas.changeAttr(this.obj, name, value);
  };

  Trillo.infoElementRepo = new Trillo.InfoElementRepo();

})();

/*******************************************************************************
 * Copyright (c) 2015, 2017 Collager Inc.
 *
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *******************************************************************************/
(function() {

  "use strict";

  Trillo.Canvas = function(parent, options) {
    // TODO paremeterize this
    this.areAllSameSize = true;
    this.parent = parent;
    this.$c = parent.$container();
    this.$canvasE = parent.$e.hasClass('js-grid') ? parent.$e : parent.$e.find('.js-grid');
    this.canvasE = this.$canvasE[0];
    this.virtual = options.virtual;
    this.elemKey = options.elemKey;
    this.isListViewMode = options.isListViewMode;
    this.$headerRow = options.$headerRow;
    this.dialog = options.dialog;
    this.postRenderer = options.postRenderer;
    this.loadingData = true;
    this.scrollListener = $.proxy(this.doScrolling, this, false);
    this.actualScrollHandler = $.proxy(this._doScrolling, this);
    this.showListHandler = $.proxy(this.doShowList, this);
    this.scrollTimer = null;
    this.actualScrollTimer = null;
    this.showTimer = null;
    this.isScrollListenerAdded = false;
    this.nonNativeSB = parent.$_sb;
    if (Trillo.isTouchSurface && !this.nonNativeSB) {
      document.addEventListener('touchstart', $.proxy(this.scrollListener, this));
    }
    this.$pagination = $('.js-pagination');
    this.selected = null;

    this.supportsHoverTools = false;
    if (options.canvasToolsSelector) {
      var $te = $(options.canvasToolsSelector);
      if ($te.length > 0) {
        this.canvasTools = new Trillo.Tools({
          $toolsE : $te,
          mgr : this
        });
        this.canvasTools.actionHandler = this;
        this.supportsHoverTools = true;
      }
    }

    var $ce = this.$canvasE;
    this.sortM = $.proxy(this.doSort, this);
    var temp = $ce.attr("row-gap");
    this.rowGap = temp ? parseInt(temp, 10) : Trillo.Options.V_MARGIN;
    temp = $ce.attr("top-row-gap");
    this.topRowGap = temp ? parseInt(temp, 10) : Trillo.Options.V_MARGIN_TOP_ROW;
    temp = $ce.attr("col-gap");
    this.colGap = temp ? parseInt(temp, 10) : Trillo.Options.H_MARGIN;
    temp = $ce.attr("max-cols");
    this.maxCols = temp ? parseInt(temp, 10) : -1;
    temp = $ce.attr("h-align");
    this.hAlign = temp || "auto";
    temp = $ce.attr("auto-select");
    this.autoSelect = temp && temp.toLowerCase() === "true";
  };
  
  var Canvas = Trillo.Canvas.prototype;

  Canvas.windowResized = function() {
    this.layout();
    this.showChildren();
    this.updatePagination();
  };

  Canvas.clear = function() {
    this.$canvasE.empty();
    if (this.$headerRow) {
      this.$headerRow.find("[sortable]").off("click", this.sortM);
    }
    if (this.page && this.page.items) {
      $.each(this.page.items, function() {
        this._trillo_infoBlock = undefined;
      });
    }
    this.page = null;
    this.infoBlocks = null;
    this.clearShowTimer();
    this.clearScrollTimer();
    this.clearActualScrollTimer();
    this.$pagination.hide();
    this.removeScrollListener();
    this.setScrollBarPos(0);
  };
  Canvas.setScrollBarPos = function(v) {
    if (this.nonNativeSB) {
      this.parent.setScrollBarPos(0);
    } else {
      $(window).scrollTop(0);
    }
  };
  Canvas.getScrollBarPos = function() {
    if (this.nonNativeSB) {
      return this.parent.getScrollBarPos();
    } else {
      return $(document).scrollTop();
    }
  };
  Canvas.objAdded = function(newObj, atEnd) {
    var il = Trillo.infoElementRepo.makeInfoBlockList(this.elemKey, [ newObj ], this);
    if (!this.infoBlocks) {
      this.infoBlocks = il;
    } else {
      if (atEnd) {
        this.infoBlocks = this.infoBlocks.concat(il);
      } else {
        for (var i = il.length - 1; i >= 0; i--) {
          this.infoBlocks.unshift(il[i]);
        }
      }
    }
    this.refresh();
    if (atEnd) {
      this.setScrollBarPos(this.contentH);
    }
  };
  Canvas.objChanged = function(item) {
    if (item._trillo_infoBlock) {
      item._trillo_infoBlock.refresh();
    }
  };
  Canvas.setContent = function(page) {
    this.addScrollListener();
    this.loadingData = false;
    // We pass all items to the makeInfoBlockList. In case of a paginated model,
    // this will include old and new.
    // "makeInfoBlockList" is smart to skip item which are old (due to
    // _trillo_infoBlock).
    var il = Trillo.infoElementRepo.makeInfoBlockList(this.elemKey, page.items, this);
    if (!this.infoBlocks) {
      this.infoBlocks = il || [];
    } else {
      this.infoBlocks = this.infoBlocks.concat(il);
    }
    this.page = page;
    this.refresh();
  };

  Canvas.refresh = function(page) {
    this.$canvasE.empty();
    this.showHeader();
    this.layout();
    this.showChildren();
    this.updatePagination();
    this.parent.updateScrollBar();
  };
  Canvas.showHeader = function() {
    var $h = this.$headerRow;
    if ($h && $h.length > 0) {
      this.canvasE.appendChild($h[0]);
      $h.find("[sortable]").off("click", this.sortM);
      $h.find("[sortable]").on("click", this.sortM);
      return $h.outerHeight();
    }
    return 0;
  };

  Canvas.layout = function() {
    if (Trillo.infoElementRepo.requiresLayout(this.elemKey)) {
      this._layout();
    }
  };

  Canvas._layout = function() {
    var l = this.infoBlocks, n = l.length, w = 0, h = 0, temp, x, y;
    var colWidth, nCols;
    // Trillo.offsetByFixedAbsolute(this.$canvasE);
    if (this.$headerRow) {
      this.$headerRow.css("top", this.$canvasE.offset().top);
    }

    if (this.isListViewMode) {
      nCols = 1;
      colWidth = $(this.$canvasE).width();
    } else {
      colWidth = (n > 0 ? l[0].w : 0) + this.colGap;
      nCols = Math.floor(($(this.$canvasE).width() - this.colGap) / colWidth);
      if (nCols <= 0)
        nCols = 1;
      if (this.maxCols > 0 && nCols > this.maxCols) {
        nCols = this.maxCols;
      }
      if (nCols === 1) {
        colWidth -= this.colGap;
      }
    }

    var yStart = this.showHeader();
    if (yStart === 0) {
      yStart = this.isListViewMode ? 0 : this.topRowGap;
    }

    var ys = [];
    var i;
    for (i = 0; i < nCols; i++) {
      ys[i] = yStart;
    }
    var idx = 0, o = null, prev = null, minY;
    for (i = 0; i < n; i++) {
      prev = o;
      o = l[i];
      idx = 0;
      minY = ys[0];
      for (var j = 1; j < ys.length; j++) {
        if (ys[j] < minY && (ys[j] === 0 || (minY - ys[j]) > 50)) {
          minY = ys[j];
          idx = j;
        }
      }
      y = ys[idx];
      x = colWidth * idx;
      o.setPosition(x, y);
      temp = x + colWidth;
      if (temp > w) {
        w = temp;
      }

      temp = y + o.h + (this.isListViewMode ? 0 : this.rowGap);
      ys[idx] = temp;
      if (temp > h) {
        h = temp;
      }
    }
    if (h === 0) {
      h = yStart; // account for header.
    }
    this.contentW = this.$canvasE.outerWidth();
    this.contentH = h
        + (this.page.pageNumber < this.page.numberOfPages ? Trillo.Options.BOTTOM_SPACE_FOR_INF_SCROLL : 0);
    this.$canvasE.css({
      height : this.contentH
    });
    var hAlign = this.hAlign;
    if (!this.isListViewMode && this.hAlign !== "left") {
      var delta = Math.floor((this.contentW - w) / 2);
      if ((hAlign === "auto") && (delta > w / 4)) {
        delta = 0;
      } else if (hAlign == "right") {
        delta = delta * 2;
      }
      if (delta > 0) {
        for (i = 0; i < n; i++) {
          o = l[i];
          o.move(delta, 0);
        }
      }
    }

    if (!this.dialog && this.$headerRow) {
      this.$headerRow.css({
        width : this.contentW
      });
    }

    this.updateContainerGeom();
  };

  Canvas.showChildren = function() {
    if (this.virtual && Trillo.infoElementRepo.requiresLayout(this.elemKey)) {
      this.showSomeChildren();
    } else {
      this.showAllChildren();
    }
  };

  Canvas.showSomeChildren = function() {
    if (this.loadingData) {
      return;
    }
    this.clearShowTimer();
    this.showList = [];
    var someNotShown = false;
    var h = $(window).height() - this.$canvasE.offset().top;
    var t, b, t2, b2; // t2 and b2 are top and bottom of viewable area
    var inview, pno;
    t = t2 = this.getScrollBarPos();
    b = b2 = t + h;
    t = t - h * 5;
    if (t < 0)
      t = 0;
    b = b + h * 5;
    if (b > (t + this.contentH))
      b = t + this.contentH;
    var l = this.infoBlocks;
    var n = l.length;
    var f;
    var i;
    for (i = 0; i < n; i++) {
      var o = l[i];
      if (o.y > b) {
        o.hide(true);
        continue;
      }
      var y2 = o.y + o.h;
      if (y2 <= t) {
        o.hide(true);
        continue;
      }
      inview = (y2 >= t2) && (o.y <= b2);
      if (inview) {
        o.show();
      } else {
        if (!o.shown)
          this.showList.push(o);
      }
    }
    $('.js-load-indicator-top').hide();
    $('.js-load-indicator-bottom').hide();
    if (b2 >= this.contentH) {
      this.loadingData = this.loadNextPage();
      if (this.loadingData) {
        $('.js-load-indicator-bottom').show();
      } else {
        this.noMoreItems = true;
      }
    }
    if (this.showList.length > 0) {
      this.showTimer = setTimeout(this.showListHandler, 200);
    }
  };

  Canvas.showAllChildren = function() {
    if (this.loadingData) {
      return;
    }
    this.clearShowTimer();

    var l = this.infoBlocks;
    var n = l.length;
    for (var i = 0; i < n; i++) {
      var o = l[i];
      o.show();
    }
  };

  Canvas.doShowList = function() {
    var il = this.showList, n = il.length;
    for (var i = 0; i < n; i++) {
      il[i].show();
    }
  };

  Canvas.clearShowTimer = function() {
    if (this.showTimer) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
  };

  Canvas.loadNextPage = function() {
    if (this.page.pageNumber < this.page.numberOfPages) {
      this.parent.loadPage(this.page.pageNumber + 1);
      return true;
    }
    return false;
  };

  Canvas.addScrollListener = function() {
    if (!this.virtual) {
      return;
    }
    if (!this.isScrollListenerAdded) {
      this.isScrollListenerAdded = true;
      if (this.nonNativeSB) {
        this.parent.$_sb.bind("scroll", this.scrollListener);
      } else {
        $(window).bind("scroll", this.scrollListener);
      }
    }
  };
  Canvas.removeScrollListener = function() {
    if (this.isScrollListenerAdded) {
      this.isScrollListenerAdded = false;
      if (this.nonNativeSB) {
        this.parent.$_sb.unbind("scroll", this.scrollListener);
      } else {
        $(window).unbind("scroll", this.scrollListener);
      }
    }
  };
  Canvas.doScrolling = function(ev) {
    this.clearScrollTimer();
    this.updatePagination();
    if (this.loadingData) {
      this.scrollTimer = setTimeout(this.scrollListener, 200);
      return;
    }
    this.clearActualScrollTimer();
    this.clearShowTimer();
    var top = this.getScrollBarPos();
    var bottom = top + $(window).height() - this.$canvasE.offset().top;

    if ((Trillo.isTouchSurface || this.nonNativeSB) && (bottom < this.contentH)) {
      this.actualScrollTimer = setTimeout(this.actualScrollHandler, 100);
    } else {
      this._doScrolling();
    }

  };
  Canvas.updatePagination = function() {
    if (this.virtual) {
      var top = this.getScrollBarPos();
      var bottom = top + $(window).height() - this.$canvasE.offset().top;
      var l = this.infoBlocks;
      var n = l.length;
      var from = -1;
      var to = -1;
      var o, y2;
      var count = 0;
      for (var i = 0; i < n; i++) {
        o = l[i];
        count++;
        y2 = o.y + o.h;
        if ((y2 >= top) && (o.y <= bottom - 20)) {
          if (from === -1)
            from = count;
          to = count;
        }
      }
      this.$pagination.show();
      this.$pagination.html(from + "-" + to);
    } else {
      this.$pagination.hide();
    }
  };
  Canvas._doScrolling = function() {
    this.showChildren();
  };
  Canvas.clearScrollTimer = function() {
    if (this.scrollTimer) {
      clearTimeout(this.scrollTimer);
      this.scrollTimer = null;
    }
  };
  Canvas.clearActualScrollTimer = function() {
    if (this.actualScrollTimer) {
      clearTimeout(this.actualScrollTimer);
      this.actualScrollTimer = null;
    }
  };
  Canvas.clicked = function(infoItem, ev) {
    this.parent.hideOverlaidContainer();
    var $e = $(ev.target);
    if (Trillo.isActionElement($e)) {
      if (this.selected !== infoItem) {
        this.selectInfoItem(infoItem);
      }
      return this.parent.controller().handleClickGeneric($e);
    }

    this.selectInfoItem(infoItem);
    if (!this.parent.clicked(infoItem, ev)) {
      return false;
    }
    return true;
  };
  Canvas.dblClicked = function(infoItem, ev) {
    this.parent.hideOverlaidContainer();
    var $e = $(ev.target);
    if (Trillo.isActionElement($e)) {
      if (this.selected !== infoItem) {
        this.selectInfoItem(infoItem);
      }
      return this.parent.controller().handleClickGeneric($e);
    }
    if (!this.parent.infoItemDblClicked(infoItem, ev)) {
      this.selectInfoItem(infoItem);
      return false;
    }
    return true;
  };
  Canvas.doContextMenu = function(infoItem, x, y) {
    if (this.selected !== infoItem) {
      this.selectInfoItem(infoItem);
    }
    return this.parent.showContextMenu(x, y);
  };
  /** called by toolbar manager, all tools are managed by toolbar hander. */
  Canvas.handleClickGeneric = function($e) {
    if (this.hoverInfoItem) {
      var infoItem = this.hoverInfoItem;
      if (this.selected !== infoItem) {
        if (this.selected) {
          this.selected.unselect();
        }
        this.selected = infoItem;
        infoItem.select();
        this.parent.selectInfoItem(infoItem);
      }
      this.parent.controller().handleClickGeneric($e);
    }
  };
  Canvas.setHoverInfoItem = function(hi) {
    this.hoverInfoItem = hi;
    if (!hi) {
      this.canvasTools.clear();
    } else {
      if (hi.obj.availabilityState === Trillo.OBJ_LOCKED) {
        return;
      }
      hi.infoE.$rootE.append(this.canvasTools.$toolsE);
      this.canvasTools.activate();
    }
  };
  Canvas.selectInfoItem = function(infoItem) {
    if (!this.parent.canSelectionChange(infoItem.obj)) {
      return;
    }
    this.parent.selectionChanging(infoItem.obj);
    if (this.selected === infoItem) {
      this.unselectInfoItem(infoItem);
      return;
    }
    if (this.selected) {
      this.selected.unselect();
    }
    this.selected = infoItem;
    infoItem.select();
    this.parent.selectInfoItem(infoItem);
  };
  Canvas.unselectInfoItem = function(infoItem) {
    if (this.selected === infoItem) {
      this.parent.unselectInfoItem(infoItem);
      infoItem.unselect();
      this.selected = null;
    }
  };
  Canvas.selectItemByUid = function(uid) {
    if (!uid) {
      return null;
    }
    var obj = this.parent.model().getObj(uid);
    if (obj && obj._trillo_infoBlock) {
      var item = obj._trillo_infoBlock;
      if (item !== this.selected) {
        this.selectInfoItem(item);
      }
      return item;
    }
    return null;
  };
  Canvas.updateContainerGeom = function() {
    var p = this.$canvasE.parent().css("position");
    if (p === "absolute") {
      this.$canvasE.parent().height(this.$canvasE.outerHeight());
    }
    /*
     * review old logic if it is needed if (this.$c.css("position") ===
     * "absolute") { if (this.$c.is(this.$canvasE.parent())) { // need a inner
     * container for proper size and scroll behavior. return; } var h = 0;
     * this.$c.children().each(function(){ h = h + $(this).outerHeight(); }); h -=
     * this.$canvasE.parent().outerHeight(); h = this.$c.height() - h; if (h <
     * 10) { h = 10; } this.$canvasE.parent().height(h); }
     */
  };
  Canvas.doSort = function(ev) {
    ev.stopPropagation();
    ev.preventDefault();
    this.parent.doSort(ev);
  };
  Canvas.changeAttr = function(obj, name, value) {
    this.parent.changeAttr(obj, name, value);
  };
})();

/*******************************************************************************
 * Copyright (c) 2015, 2017 Collager Inc.
 *
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *******************************************************************************/
(function() {

  "use strict";

  Trillo.Tree = function(options) {
    // To do, remove it after all existing tree templates specify nodes within.
    this.DEFAULT_NODE_TEMPLATE = '<div class="tree-node js-tree-node">'
        + '<div class="trillo-tree-item js-tree-node-inner">' + '<span nm="name"></span>' + '</div>' + '</div>';
    this.name = 'TrilloTree';
    this.parent = options.parent;
    this.alwaysOpen = options.alwaysOpen;
    this.scrollPolicy = options.scrollPolicy || Trillo.Options.NO_SCROLL;
    this.openOnFirstClick = options.openOnFirstClick;
    this.closeOthers = options.closeOthers;
    this.toc = options.toc;
    this.timer = null;
    this.$e = options.$e;
    this.$treeE = this.$e.find(".js-tree");
    this.$treeNodes = [];
    this.prepareNodeTemplates(this.$treeE, 0);
    this._lookupTable = {};
    this.clickHandler = $.proxy(this.linkClicked, this);
    this.contextMenuHandler = $.proxy(this.onContextMenu, this);
    if (this.scrollPolicy === Trillo.Options.SCROLL_ON_HOVER) {
      this.mouseOverHandler = $.proxy(this.onMouseOver, this);
      this.mouseOutHandler = $.proxy(this.onMouseOut, this);
      this.delayedOnMouseOut = $.proxy(this._onMouseOut, this);
    }
  };
  
  var Tree = Trillo.Tree.prototype;
  
  Tree.clear = function() {
    this.setTreeData([]);
    this.clearTimeout();
    this.removeEventHandlers();
  };

  Tree.prepareNodeTemplates = function($c) {
    var $node = $c.find(".js-tree-node");
    if ($node.length === 0) {
      if (this.$treeNodes.length === 0) {
        $node = $(this.DEFAULT_NODE_TEMPLATE);
      } else {
        return;
      }
    } else {
      $node = $($node[0]); // select first jquery
      $node.remove();
    }
    this.$treeNodes.push($node);
    this.prepareNodeTemplates($node);
  };

  Tree.newNode = function(lvl) {
    var n = lvl >= this.$treeNodes.length ? this.$treeNodes.length - 1 : lvl;
    return this.$treeNodes[n].clone(true);
  };

  Tree.removeEventHandlers = function() {
    var $e = this.$e;
    $e.off("click", this.clickHandler);
    $e.off("contextmenu", this.contextMenuHandler);
    if (this.mouseOverHandler) {
      $e.off("mouseover", this.mouseOverHandler);
      $e.off("mouseout", this.mouseOutHandler);
    }
  };

  Tree.addHandlers = function() {
    var $e = this.$e;
    this.removeEventHandlers();
    if (this.scrollPolicy === Trillo.Options.SCROLL_ON_HOVER) {
      $e.on("mouseover", this.mouseOverHandler);
      $e.on("mouseout", this.mouseOutHandler);
    }
    $e.on("click", this.clickHandler);
    $e.on("contextmenu", this.contextMenuHandler);
  };

  Tree.getSelectedItem = function() {
    return this.getObj(this._selectedItem);
  };
  Tree.getSelectedItemUid = function() {
    return this._selectedItem ? this._selectedItem.uid : null;
  };

  Tree.setTreeData = function(l, action) {
    this.addHandlers();
    
    this._lookupTable = {};
    l = this.traverseTree(l);
    this.unselectCurrent();
    this._list = l;
    this._selectedItem = null;

    this.resetElements(l);
    this.$treeE.empty();
    this.renderList(null, l, this.$treeE);
    if (this.alwaysOpen || action === Trillo.Options.OPEN_ALL) {
      this.openAll();
    } else if (action === Trillo.Options.CLOSE_ALL) {
      this.closeAll();
    }
  };

  Tree.renderList = function(parent, l, ce, e2) {
    for (var i = 0; i < l.length; i++) {
      var item = l[i];
      var es = item._es_;
      if (!es) {
        item._es_ = es = this.renderElement(item);
      } else {
        es.e.data("uid", item.uid); // set new uid value, it may change for a
                                    // navigation
        es.e.data("nm", item.uid); // used by handleClickGeneric
        if (typeof item.hideNode !== "undefined" && item.hideNode) {
          es.e.hide();
        }
      }
      ce.append(es.e);
    }
    this.parent.updateScrollBar();
  };

  Tree.renderElement = function(item) {
    var lvl = item._lvl_;
    var e = this.newNode(lvl);
    var temp = e.find(".js-lvl-" + lvl);
    if (temp.length) {
      e = temp;
    }
    e.addClass(Trillo.CSS.treeNodeLevelPrefix + lvl);
    e.data("uid", item.uid);
    e.data("nm", item.uid);

    var e2 = e.find(".js-tree-node-inner");

    if (this.canExpand(item)) {
      e2.addClass(Trillo.CSS.itemClose);
    }
    this.setFieldsValues(e2, item);
    if (item.hideNode) {
      e.hide();
    }
    return {
      e : e,
      e2 : e2,
      lvl : lvl
    };
  };

  Tree.setFieldsValues = function(e2, item) {
    var el = e2.find("[nm]"), temp;
    var n = el.length;
    for (var i = 0; i < n; i++) {
      temp = $(el[i]);
      Trillo.setFieldValue(temp, item[temp.dataOrAttr("nm")], false);
    }
  };

  Tree.refresh = function() {
    this._refresh(this._list);
    this.parent.updateScrollBar();
  };

  Tree._refresh = function(l) {
    if (!l) {
      return;
    }
    for (var i = 0; i < l.length; i++) {
      var item = l[i];
      var es = item._es_;
      if (es) {
        this.setFieldsValues(es.e2, item);
        this._refresh(item.children);
      }
    }
  };

  Tree.resetElements = function(l) {
    var item;
    for (var i = 0; i < l.length; i++) {
      item = l[i];
      item._es_ = null;
      if (item.children) {
        this.resetElements(item.children);
      }
    }
  };

  Tree.linkClicked = function(ev, showingContextMenu) {
    var uid = $(ev.target).closest("." + Trillo.CSS.treeNode).dataOrAttr("uid");
    if (uid) {
      if (!showingContextMenu) {
        Trillo.hideCurrentOverlays(true, false);
      }
      this.parent.hideOverlaidContainer();
      var item = this._lookupTable[uid];
      if (showingContextMenu) {
        if (item === this._selectedItem) {
          return;
        }
      } else {
        ev.stopPropagation();
      }
      if (item._isAction && !showingContextMenu) {
        this.parent.handleClickGeneric(item._es_.e, this.getObj(item));
        return;
      }
      if (!this.parent.canSelectionChange(this.getObj(item))) {
        return;
      }
      this.parent.selectionChanging(this.getObj(item));
      var es = item._es_;
      var open = true;
      if (!this.alwaysOpen && this.canExpand(item)) {
        var flag1 = item === this._selectedItem || es.e2[0] === ev.target;
        var flag2 = this.openOnFirstClick || flag1;
        if (!es.open) {
          if (flag2) {
            this.openItem(item);
          }
        } else {
          if (flag1) {
            this.closeItem(item);
            open = false;
          }
        }
      }
      if (item !== this._selectedItem) {
        this.selectItem(item, open, !showingContextMenu);
      }
      this.parent.treeItemSelected(this.getObj(item));
    }
  };

  Tree.onContextMenu = function(ev) {
    ev.stopPropagation();
    var uid = $(ev.target).closest("." + Trillo.CSS.treeNode).dataOrAttr("uid");
    if (uid) {
      var item = this._lookupTable[uid];
      var es = item._es_;
      var offset1 = es.e.offset();
      this.linkClicked(ev, true);
      var offset2 = es.e.offset();
      if (this.parent.showContextMenu(ev.pageX + offset2.left - offset1.left, ev.pageY + offset2.top - offset1.top)) {
        ev.preventDefault();
      } else {
        Trillo.hideCurrentOverlays(true, true);
      }
    }
  };

  Tree.openItem = function(item) {
    if (!this.canExpand(item, this)) {
      return;
    }
    var es = item._es_;
    if (es && es.open) {
      return;
    }
    if (!es) {
      item._es_ = es = this.renderElement(item);
    }
    es.open = true;
    this.renderList(item, item.children, es.e, es.e2);
    es.e2.removeClass(Trillo.CSS.itemClose).addClass(Trillo.CSS.itemOpen);
  };

  Tree.closeItem = function(item) {
    var es = item._es_;
    if (!es) {
      return;
    }
    es.open = false;
    es.e.find(".js-tree-node").remove();
    if (this.canExpand(item, this)) {
      es.e2.removeClass(Trillo.CSS.itemOpen).addClass(Trillo.CSS.itemClose);
    }
    es.e.append(es.e2);
  };

  Tree.openItem2 = function(item) {
    var l = [];
    var item2 = item;
    while (item2 && typeof item2._lvl_ !== "undefined") {
      l.push(item2);
      item2 = item2.parent;
    }
    for (var i = l.length - 1; i >= 0; i--) {
      item2 = l[i];
      var es = item2._es_;
      if (!es) {
        item2._es_ = es = this.renderElement(item2);
      }
      this.openItem(item2);
    }
  };

  Tree.selectItem = function(item, open, scrollInView) {
    if (item === this._selectedItem) {
      return;
    }
    var es;
    var unselected = this.unselectCurrent();
    if (item) {
      if (open) {
        this.openItem2(item);
      }
      this._selectedItem = item;
      es = item._es_;
      es.e2.addClass(Trillo.CSS.selected);
      if (scrollInView) {
        this.scrollSelectedInView();
      }
    }
    if (this.closeOthers && scrollInView && unselected) {
      var p1 = this.getCloseableParent(unselected);
      var p2 = !item ? {} : this.getCloseableParent(item);
      if (p1 !== p2 && p1 !== p2.parent) {
        this.closeItem(p1);
        if (item)
          this.scrollSelectedInView(true);
      }
    }
  };
  Tree.unselectCurrent = function() {
    var es;
    var res = this._selectedItem;
    if (res) {
      es = res._es_;
      es.e2.removeClass(Trillo.CSS.selected);
      this._selectedItem = null;
    }
    return res;
  };
  Tree.selectItemByUid = function(uid) {
    if (!uid || this._list.length === 0) {
      return false;
    }
    var item = this._lookupTable[uid];
    this.selectItem(item, true, true);
    return item;
  };
  Tree.getItemByUid = function(uid) {
    return this._lookupTable[uid];
  };
  Tree.scrollSelectedInView = function(forceScroll) {
    setTimeout($.proxy(this._scrollSelectedInView, this, forceScroll), 100);
  };
  Tree._scrollSelectedInView = function(forceScroll) {
    if (!this._selectedItem) {
      return;
    }
    if (!forceScroll && this.scrollPolicy === Trillo.Options.NO_SCROLL) {
      return;
    }
    var cTop, cBottom, eTop, saved, vh, reTop, reBottom;
    var es = this._selectedItem._es_;
    var e = es.e;
    var el = this.$e;
    var pTop = el.offset().top;
    eTop = e.offset().top;
    if (this.scrollPolicy === Trillo.Options.SCROLL_ON_HOVER || this.scrollPolicy === Trillo.Options.AUTO_SCROLL
        || this.scrollPolicy === Trillo.Options.NON_NATIVE_SCROLLBAR) {
      vh = el.outerHeight();
      cTop = el.scrollTop();
      cBottom = cTop + vh;
      reTop = eTop - pTop + cTop;
      reBottom = reTop + e.outerHeight();
      if (this.scrollPolicy === Trillo.Options.NON_NATIVE_SCROLLBAR) {
        cTop = reTop - parseInt((vh - es.e2.outerHeight()) / 2, 10);
        this.parent.setScrollBarPos(cTop);
      } else {
        if (reTop > cTop && reBottom < cBottom) {
          return; // in view
        }
        saved = el.css("overflow");
        el.css("overflow", "auto");
        cTop = reTop - parseInt((vh - es.e2.outerHeight()) / 2, 10);
        el.scrollTop(cTop);
        if (saved !== "auto") {
          el.css("overflow", "hidden");
        }
      }
    } else if (this.scrollPolicy === Trillo.Options.SMOOTH_SCROLL) {
      cTop = document.viewport.getScrollOffsets().top;
      vh = $(window).height() - pTop;
      cBottom = cTop + vh;
      reTop = eTop - pTop;
      reBottom = reTop + e.outerHeight();
      var tp = this.getTopParent(this._selectedItem);
      if ((tp !== this._selectedItem) && (reTop > cTop) && (reBottom < cBottom)) {
        return; // in view
      }
      var e2 = tp._es_.e;
      var eTop2 = e2.offset().top;
      if ((eTop - eTop2 + es.e2.outerHeight()) < vh) {
        cTop = eTop2 - pTop - cTop + parseInt(es.e.css("padding-top"), 10);
      } else {
        cTop = reTop - parseInt((vh - es.e2.outerHeight()) / 2, 10) - cTop;
      }
      if (cTop === 0)
        return;
      var dir = cTop < 0 ? 1 : 2;
      cTop = Math.abs(cTop);
      this.smoothVScroll(cTop, dir);
    }
  };
  Tree.openAll = function() {
    this._openAll(this._list);
    this.parent.updateScrollBar();
  };
  Tree._openAll = function(l) {
    var item;
    for (var i = 0; i < l.length; i++) {
      item = l[i];
      if (item.children.length) {
        this.closeItem(l[i]);
        this.openItem(l[i]);
        this._openAll(item.children);
      }
    }
  };
  Tree.closeAll = function() {
    this._closeAll(this._list);
    this.parent.updateScrollBar();
  };
  Tree._closeAll = function(l) {
    var item;
    for (var i = 0; i < l.length; i++) {
      item = l[i];
      if (item.children.length) {
        this.closeItem(l[i]);
        this._closeAll(item.children);
      }
    }
  };

  Tree.clearTimeout = function() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  };

  Tree.onMouseOver = function() {
    this.clearTimeout();
    this.$e.css("overflow", "auto");
  };

  Tree.onMouseOut = function() {
    this.clearTimeout();
    this.timer = setTimeout(this.delayedOnMouseOut, 1000);
  };

  Tree._onMouseOut = function() {
    this.clearTimeout();
    this.$e.css("overflow", "hidden");
  };

  Tree.getTopParent = function(item) {
    if (!item) {
      return null;
    }
    while (item.parent && typeof item.parent._lvl_ !== "undefined") {
      item = item.parent;
    }
    return item;
  };

  Tree.getCloseableParent = function(item) {
    while (item.parent && !item.parent.closeOthers) {
      item = item.parent;
    }
    return item;
  };

  Tree.canExpand = function(item) {
    if (!item)
      return true;
    return item.children && item.children.length > 0;
  };

  Tree.smoothVScroll = function(scrollLimit, dir) {
    var smoothScrollLimit = 100;
    var scrollBy = 10;
    var timeout = 30;
    var t;
    function smoothScroll() {
      t = scrollLimit < scrollBy ? scrollLimit : scrollBy;
      window.scrollBy(0, dir === 1 ? -t : t);
      scrollLimit -= scrollBy;
      if (scrollLimit > 0) {
        setTimeout(smoothScroll, timeout);
      }
    }
    if (scrollLimit > smoothScrollLimit) {
      t = scrollLimit - smoothScrollLimit;
      window.scrollBy(0, dir === 1 ? -t : t);
      scrollLimit = smoothScrollLimit;
      setTimeout(smoothScroll, timeout);
    } else {
      smoothScroll();
    }
  };
  
  Tree.traverseTree = function(data) {
    var arr = [];
    var newData = this._traverseTree(data, null, 0, arr);
    var prev = null;
    var lt = this._lookupTable;
    var temp, uid;
    for (var i=0, n=arr.length; i<n; i++) {
      temp = arr[i];
      temp._prev_ = prev;
      if (prev) {
        prev._next_ = temp;
      }
      prev = temp;
      uid = Trillo.uid(temp);
      if (uid) {
        lt[uid] = temp;
      }
    }
    return newData;
  };
  
  Tree._traverseTree = function(data, parent, lvl, arr) {
    if (Trillo.isObject(data)) {
      return this._traverseObj(data, parent, lvl, arr);
    } else if (Trillo.isArray(data)) {
      return this._traverseArray(data, parent, lvl, arr);
    } else {
      return data;
    }
  };
  

  Tree._traverseObj = function(obj, parent, lvl, arr) {
    obj = $.extend({}, obj);
    obj.parent = parent;
    obj._lvl_ = lvl;
    arr.push(obj);
    for ( var key in obj) {
      if (key != 'parent' && obj.hasOwnProperty(key)) {
        obj[key] = this._traverseTree(obj[key], obj, lvl + 1, arr);
      }
    }
    return obj;
  };
  
  Tree._traverseArray = function(dl, parent, lvl, arr) {
    var n = dl.length;
    var i;
    var dl2 = [];
    for (i = 0; i < n; i++) {
      dl2.push(this._traverseTree(dl[i], parent, lvl, arr));
    }
    return dl2;
  };
  
  Tree.getObj = function(item) {
    return this.parent.model().getObj(item.uid);
  }
})();
/*******************************************************************************
 * Copyright (c) 2015, 2017 Collager Inc.
 *
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *******************************************************************************/
/* globals Mustache */
(function() {

  "use strict";

  Trillo.TitleBar = function(options) {
    this.titleBar = options.titleBar;
    this.ownerView = options.ownerView;
    this.$titleBarE = $(options.titleBar);
  };
  
  var TitleBar = Trillo.TitleBar.prototype;
  
  TitleBar.setTitle = function(viewName, title, titlePrefix) {
    if (this.$titleBarE.length === 0) {
      return;
    }
    title = title || "";
    titlePrefix = titlePrefix || "";
    if (title.length === 0) {
      this.clearTitle(viewName);
      return;
    }

    // parse templates and cache
    if (Trillo.HtmlTemplates.titleBarTitlePrefix && !Trillo.HtmlTemplates.titleBarTemplates__parsed__) {
      Mustache.parse(Trillo.HtmlTemplates.titleBarTitlePrefix);
      Mustache.parse(Trillo.HtmlTemplates.titleBarTitle);
      Mustache.parse(Trillo.HtmlTemplates.titleBarTitlePrefix2);
      Mustache.parse(Trillo.HtmlTemplates.titleBarTitle2);
      Trillo.HtmlTemplates.titleBarTemplates__parsed__ = true;
    }

    var $e;

    var useOld = this.$titleBarE.prop("tagName").toLowerCase() === "ol";

    $e = this.$titleBarE.find('[nm="' + viewName + '-title-prefix' + '"]');
    if (titlePrefix.length) {
      if ($e.length) {
        $e.html(titlePrefix);
      } else {
        $e = this.$titleBarE.append(Mustache.render(useOld ? Trillo.HtmlTemplates.titleBarTitlePrefix
            : Trillo.HtmlTemplates.titleBarTitlePrefix2, {
          viewName : viewName,
          titlePrefix : titlePrefix
        }));
      }
    } else {
      if ($e.length) {
        $e.remove();
      }
    }

    $e = this.$titleBarE.find('[nm="' + viewName + "-title" + '"]');
    if ($e.length) {
      $e.html(title);
    } else {
      $e = this.$titleBarE.append(Mustache.render(useOld ? Trillo.HtmlTemplates.titleBarTitle
          : Trillo.HtmlTemplates.titleBarTitle2, {
        viewName : viewName,
        title : title
      }));
    }
  };
  TitleBar.clearTitle = function(viewName) {
    if (this.$titleBarE.length === 0) {
      return;
    }
    this.$titleBarE.find('[nm="' + viewName + "-title-prefix" + '"]').remove();
    this.$titleBarE.find('[nm="' + viewName + "-title" + '"]').remove();
  };
})();

/*******************************************************************************
 * Copyright (c) 2015, 2017 Collager Inc.
 *
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *******************************************************************************/
(function() {

  "use strict";

  Trillo.TitleBarManager = function(options) {
    this.options = options;
    this.table = {};
  };
  
  var TitleBarManager = Trillo.TitleBarManager.prototype;

  TitleBarManager.getTitleBar = function(titleBar, view) {
    if (!this.table[titleBar]) {
      debug.debug("Adding titleBar: " + titleBar);
      this.table[titleBar] = new Trillo.TitleBar({
        titleBar : titleBar,
        ownerView : view
      });
    }
    return this.table[titleBar];
  };

  TitleBarManager.viewCleared = function(view) {
    var self = this;
    var titleBar = null;
    $.each(self.table, function() {
      if (this.viewOwner === view) {
        titleBar = this.titleBar;
        return false;
      }
    });
    if (titleBar) {
      debug.debug("Removing titleBar: " + titleBar);
      this.table[titleBar].$titleBarE.html("");
      this.table[titleBar] = null;
    }
  };
})();

/*******************************************************************************
 * Copyright (c) 2015, 2016 Collager Inc.
 *
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *******************************************************************************/
(function() {

  "use strict";
  
  Trillo.DragHandler = function($e, listener) {
    this.$e = $e;
    this.listener = listener;
    this.dragHandleMouseDownM = $.proxy(this.mouseDownOnDragHandle, this);
    this.dragHandleMouseUpLeaveM = $.proxy(this.mouseUpLeaveDragHandle, this);
    this.dragHandleMouseMoveM = $.proxy(this.mouseMoveOnDragHandle, this);

    var $h = $e.find(".js-drag-handle, .js-size-handle");
    if ($h.length > 0) {
      this.dragHandleMouseDownM = $.proxy(this.mouseDownOnDragHandle, this);
      this.dragHandleMouseUpLeaveM = $.proxy(this.mouseUpLeaveDragHandle, this);
      this.dragHandleMouseMoveM = $.proxy(this.mouseMoveOnDragHandle, this);
      $h.on("mousedown", this.dragHandleMouseDownM);
    }
  };
  
  var DragHandler = Trillo.DragHandler.prototype;

  DragHandler.dispose = function() {
    if (this.dragHandleMouseDownM) {
      var $h = this.$e.find(".js-drag-handle, .js-size-handle");
      $h.off("mousedown", this.dragHandleMouseDownM);
      var $body = $(document.body);
      $body.off("mouseup mouseleave", this.dragHandleMouseUpLeaveM);
      $body.off("mousemove", this.dragHandleMouseMoveM);
    }
  };

  DragHandler._updateDragData = function(ev) {
    var d = this.dragData;
    d.lastX = d.currentX;
    d.lastY = d.currentY;
    d.currentX = ev.clientX + $(document).scrollLeft();
    d.currentY = ev.clientY + $(document).scrollTop();
    if (typeof d.initX === "undefined") {
      d.initX = d.currentX;
      d.initY = d.currentY;
    }
  };

  DragHandler.mouseDownOnDragHandle = function(ev) {
    if (this.dragData) {
      // Previous drag operation is pending.
      // Probably mouse up occurred outside window
      this.mouseUpLeaveDragHandle(ev);
      return;
    }
    var $t = $(ev.target);
    if ($t.hasClass("js-drag-handle") || $t.hasClass("js-size-handle")) {
      var $body = $(document.body);
      $body.off("mouseup", this.dragHandleMouseUpLeaveM);
      $body.on("mouseup", this.dragHandleMouseUpLeaveM);
      $body.off("mousemove", this.dragHandleMouseMoveM);
      $body.on("mousemove", this.dragHandleMouseMoveM);
      this.dragData = {
        $target : $t,
        userData : null
      // this may be updated by the listener
      };
      this._updateDragData(ev);
      if (this.listener && this.listener.handleMouseDownOnDragHandle) {
        this.listener.handleMouseDownOnDragHandle(this.dragData);
      }
    }
  };

  DragHandler.mouseUpLeaveDragHandle = function(ev) {
    var $body = $(document.body);
    $body.off("mouseup", this.dragHandleMouseUpLeaveM);
    $body.off("mousemove", this.dragHandleMouseMoveM);
    if (this.listener && this.listener.handleMouseUpOnDragHandle) {
      this._updateDragData(ev);
      this.listener.handleMouseUpOnDragHandle(this.dragData);
    }
    this.dragData = null;
  };

  DragHandler.mouseMoveOnDragHandle = function(ev) {
    ev.preventDefault();
    if (this.listener && this.listener.handleMouseMoveOnDragHandle) {
      this._updateDragData(ev);
      this.listener.handleMouseMoveOnDragHandle(this.dragData);
    }
  }
})();

/*******************************************************************************
 * Copyright (c) 2015, 2017 Collager Inc.
 *
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *******************************************************************************/
/* globals Mustache */

(function() {

  "use strict";

  Trillo.BaseView = function($e, controller, viewSpec) {
    this.$e = $e;
    this.viewSpec = viewSpec;
    this.name = viewSpec.name;
    this._controller = controller;
    this.$c = null;
    this._nextView = null;
    this._parentView = null;
    this._prevView = null;
    this.selected = null;
    this.cleared = true;
    this.editable = false;
    this.internalRoute = ""; // the part of the path which is consumed by this view internally

    this._embeddedViews = [];
    this._textNodes = []; // text nodes requiring mustache template processing
    this._attrNodes = []; // attribute nodes requiring mustache template
    this.scrollTop = -1;

    controller.setView(this);

    if (viewSpec.embedded || viewSpec.autoLoad) {
      this._parentView = viewSpec.prevView;
      this._parentView._embeddedViews.push(this);
      this._parentView.controller().addEmbeddedController(controller);
    } else {
      this._prevView = viewSpec.prevView;
      if (this._prevView) {
        this._prevView._nextView = this;
        this._prevView.controller().setNextController(controller);
      }
    }
    var previewContainerWidth = 0;
    if (Trillo.isPreview) {
      viewSpec.container = viewSpec.container || "main-container";
      this.$c = this._getContainer(this.viewSpec.container);
      if (this.$c) {
        this.$c.css("width", previewContainerWidth === 0 ? "auto" : previewContainerWidth);
      }
    } else {
      if (viewSpec.container) {
        this.$c = this._getContainer(this.viewSpec.container);
      } else {
        this.$c = ($e.parent().length > 0 ? $e.parent() : null);
      }
    }
    if (this.$c) {
      viewSpec.dialog = viewSpec.dialog || this.$c.hasClass("js-dialog-container")
          || this.$c.hasClass("js-modal-dialog-container");
      this.isModal = viewSpec.dialog && this.$c.hasClass("js-modal-dialog-container");
    }

    // before we process tools for this view, we need to construct embedded
    // views
    // that use
    // the descendant of this.$e as the element so they can claim tools within
    // their elements.
    this._createEmbeddedViews();
    this.setupView();
  };

  var BaseView = Trillo.BaseView.prototype;
  
  BaseView.setupView = function() {
    debug.debug("setupView() " + this.name);
    var html = this.$e.html();
    var containsTemplateTags = html && html.indexOf("{{") >= 0;
    if (containsTemplateTags && this.$e.length) {
      this._processNode(this.$e[0], this._textNodes, this._attrNodes);
    }

    this.toolsMgr = new Trillo.ToolManager(this);
    this.$e.find("[data-trigger]").each(function() {
      Trillo.popoverManager.createPopoverForContent($(this));
    });
    this.$e.find("[trigger]").each(function() {
      Trillo.popoverManager.createPopoverForContent($(this));
    });
  };


  BaseView._getContainer = function(containerName) {
    var p = this.parentView();
    var $c;
    if (p) {
      $c = p.$e.find("[nm='" + containerName + "']");
      if ($c.length) {
        return $c;
      }
      return p._getContainer(containerName);
    } else {
      return $("[nm='" + containerName + "']");
    }
  };

  // creates only those embedded views which are created using one of the
  // descendant element.
  BaseView._createEmbeddedViews = function() {
    var spec = this.viewSpec;
    var embeddedSpecs = spec.embeddedSpecs;
    if (embeddedSpecs && embeddedSpecs.length) {
      for (var i = 0; i < embeddedSpecs.length; i++) {
        var espec = embeddedSpecs[i];
        var $e2 = this._getEmbeddedViewElem(espec);
        if ($e2 && $e2.length > 0) {
          debug.debug("Creating embedded view: " + espec.name);
          $e2.data("for-view", espec.name);
          Trillo.builder.createView($e2, espec, this);
        }
      }
    }
  };

  BaseView._getEmbeddedViewElem = function(espec) {
    var $e2 = null;
    if (espec.elementSelector) {
      $e2 = this.$e.find(espec.elementSelector);
    }
    if (!$e2) {
      $e2 = this.$e.find('[nm="' + espec.name + '"]');
    }
    return $e2;
  };

  BaseView._processNode = function(node, textNodes, attrNodes) {
    var t, i, len;
    if (node.nodeType === 3) {
      t = node.nodeValue;
      if (t && t.indexOf("{{") >= 0) {
        textNodes.push({
          textNode : node,
          text : t
        });
      }
    } else {
      if (!node.hasAttribute) {
        return;
      }
      var forView = node.getAttribute("for-view") || node.getAttribute("data-for-view");
      if (forView && forView !== this.name) {
        return;
      }
      var attributes = node.attributes;
      if (attributes) {
        var a;
        for (i = 0, len = attributes.length; i < len; ++i) {
          a = attributes[i];
          t = a.nodeValue;
          if (t && t.indexOf("{{") >= 0) {
            attrNodes.push({
              attrNode : a,
              text : t
            });
          }
        }
      }
      var cl = node.childNodes;
      for (i = 0, len = cl.length; i < len; ++i) {
        this._processNode(cl[i], textNodes, attrNodes);
      }
    }
  };

  BaseView.show = function(forceModelRefresh) {
    var myDeferred = $.Deferred();
    if (forceModelRefresh || this.controller().shouldLoadNewData()) {
      debug.debug("View.show() - creating new model for: " + this.viewSpec.name);
      var modelSpec = this.viewSpec.modelSpec;
      if (this.customizeModelSpec) {
        // if view specifies customizeModelSpec, give it precedence
        this.customizeModelSpec(modelSpec);
      }
      if (this.controller().customizeModelSpec) {
        this.controller().customizeModelSpec(modelSpec);
      }

      var apiSpec = this.viewSpec.apiSpec;
      if (apiSpec) {
        if (this.controller().updateApiSpec) {
          this.controller().updateApiSpec(apiSpec);
        }
      }

      var promise = this._controller.createModel();
      promise.done($.proxy(this.showUsingModel, this, myDeferred));
      promise.fail(function(result) {
        myDeferred.reject(result);
      });
    } else {
      this.postShow(myDeferred);
      debug.debug("View.show() - no changes");
    }
    return myDeferred.promise();
  };

  BaseView.showUsingModel = function(myDeferred) {
    this._controller.preViewShown(this);
    this._showUsingModel(myDeferred);
  };

  BaseView._showUsingModel = function(myDeferred) {
    var model = this.model();

    if (this.viewSpec.dialog && this.$c && this.$c.css("position") !== "static"
        && !this.$c.hasClass('js-dont-position')) {
      this.scrollTop = $(window).scrollTop();
    }

    if (!this.cleared) {
      this.render();
      this.postShow(myDeferred);
      return;
    }

    Trillo.router.showingView(this);

    if (!this.viewSpec.isAppView && this.$c) {
      this.$c.removeClass("trillo-cleared");
    }

    this.containerVisibilityChanging(true);

    if (this.$c) {
      if (this.$e.parent().length === 0) {
        this.$c.empty();
      }
      if ((this.$e.parent()[0] !== this.$c[0]) || this.$e.parent().length === 0) {
        this.$c.append(this.$e);
      }
    }

    if (this.viewSpec.dialog) {
      this.$c.removeClass("hide");
      if (this.isModal) {
        this.$backdropE = $('<div></div>').addClass('trillo-dialog-backdrop');
        $('body').append(this.$backdropE);
      }
    }

    this.$e.show();

    this.render();
    this.toolsMgr.activate();
    this.setPopoverTriggerState(this.getToolBar$Elem(), false);
    this.cleared = false;
    this.postShow(myDeferred);
  };

  BaseView.repeatShowUsingModel = function() {
    var myDeferred = $.Deferred();
    this._showUsingModel(myDeferred);
    return myDeferred.promise();
  };

  BaseView.render = function() {
    var i;
    this.renderTemplateNode(this._textNodes, this._attrNodes);
    var $el = this.$e.find("select");
    for (i = 0; i < $el.length; i++) {
      Trillo.setSelectOptionsFromEnum($($el[i]));
    }
  };

  BaseView.renderTemplateNode = function(textNodes, attrNodes) {
    var i;
    var nodeValue;
    if (textNodes.length || attrNodes.length) {
      var temp;
      for (i = 0; i < textNodes.length; i++) {
        temp = textNodes[i];
        nodeValue = Mustache.render(temp.text, this.getData());
        if (!nodeValue) {
          nodeValue = Mustache.render(temp.text, Trillo.appContext);
        }
        temp.textNode.nodeValue = nodeValue;
      }
      for (i = 0; i < attrNodes.length; i++) {
        temp = attrNodes[i];
        nodeValue = Mustache.render(temp.text, this.getData());
        if (!nodeValue) {
          nodeValue = Mustache.render(temp.text, Trillo.appContext);
        }
        temp.attrNode.nodeValue = nodeValue;
      }
    }
  };

  BaseView.postShow = function(myDeferred) {
    this._controller.postViewShown(this);
    myDeferred.resolve(this);
    if (this.viewSpec.dialog && this.$c.css("position") !== "static" && !this.$c.hasClass('js-dont-position')) {
      this.updateDialogSize();
      this.centerIt();
    }
    this.createDragHandle();
    if (this.$c) {
      Trillo.popoverManager.contentShown(this.$c);
    }
    Trillo.page.layoutContainers();
    if (this.$c && this.$c.hasClass("js-non-native-scrollbar")) {
      var self = this;
      setTimeout(function() {
        var options = {
          minScrollbarLength : 100
        };
        options.suppressScrollX = self.$c.width() > self.$e.width();
        self.setNonNativeScrollBar(self.$c, options);
      }, 0);
    }
  };

  BaseView.postSetup = function() {
    this._controller.postViewSetup(this);
  };

  BaseView.markForClearing = function() {
    if (!this.viewSpec.isAppView) {
      if (!this.viewSpec.embedded) {
        Trillo.router.markForClearing(this);
      }
      if (this.model()) {
        // clear observer so this view does not receive any events from back-end
        // while it is being cleared and new set of views are being initialized.
        this.model().clearObserver();
      }
    }
    if (this._nextView) {
      this._nextView.markForClearing();
    }
    for (var i = 0; i < this._embeddedViews.length; i++) {
      this._embeddedViews[i].markForClearing();
    }
  };

  BaseView.clear = function() {
    if (this.cleared) {
      return;
    }
    
    this._controller.preViewCleanup(this);

    this.toolsMgr.clear();
    this.destroyScrollBar();
    this.destroyDragHandle();

    if (this.model()) {
      this.model().clear();
    }

    if (this.$c) {
      this.$c.addClass("trillo-cleared");
      Trillo.popoverManager.contentCleared(this.$c);
    }
    if (this.$backdropE) {
      this.$backdropE.remove();
      this.$backdropE = null;
    }
    
    this.containerVisibilityChanging(false);
    

    if (!this.$e.hasClass("js-on-clean-no-remove")) {
      this.$e.remove();
    }

    if (this.viewSpec.dialog) {
      this.$c.addClass("hide");
      if (this.scrollTop !== -1) {
        $(window).scrollTop(this.scrollTop);
        this.scrollTop = -1;
      }
    }

    if (this._prevView) {
      // due to markForDeletion the _prevView._nextView may be the new view and
      // may not require resetting
      // therefore check if _prevView._nextView === this
      if (this._prevView._nextView === this) {
        this._prevView._nextView = null;
      }
    } else if (this._parentView) {
      this._parentView.embeddedViews().splice(this._parentView.embeddedViews().indexOf(this), 1);
      this._parentView._controller.removeEmbeddedController(this._controller);
    }
    for (var i = 0; i < this._embeddedViews.length; i++) {
      this._embeddedViews[i].clear();
    }
    this.cleared = true;
  };

  BaseView.canSelectionChange = function(newObjOrName) {
    var f = this._controller.canSelectionChange();
    // give children views a chance to veto it
    if (f && this._nextView) {
      f = this._nextView.canSelectionChange(newObjOrName);
    }
    for (var i = 0; i < this._embeddedViews.length && f; i++) {
      f = this._embeddedViews[i].canSelectionChange(newObjOrName);
    }
    return f;
  };

  BaseView.selectionChanging = function(newObjOrName) {
    this._controller.selectionChanging();
    // let children also know
    if (this._nextView) {
      this._nextView.selectionChanging(newObjOrName);
    }
    for (var i = 0; i < this._embeddedViews.length; i++) {
      this._embeddedViews[i].selectionChanging(newObjOrName);
    }
  };

  BaseView.getSelectedObj = function() {
    return this.selectedObj;
  };

  BaseView.setSelectedObj = function(obj) {
    this.selectedObj = obj;
    this._controller.selectedObjChanged(obj);
    this._controller.updateTitle();
    this.setTbState();
  };

  BaseView.selectAndRoute = function(uid) {
  };

  BaseView.getToolBar$Elem = function() {
    if (this.viewSpec.toolBar) {
      return this.$c.find(this.viewSpec.toolBar);
    } else {
      var p = this.parentView();
      if (p) {
        return p.getToolBar$Elem();
      } else {
        return $(".js-toolbar");
      }
    }
  };

  BaseView.setTbState = function() {
    this.toolsMgr.setTbState(this.selectedObj);
    this.setPopoverTriggerState(this.getToolBar$Elem(), false);
  };

  BaseView.setPopoverTriggerState = function($tce, popoverToolsVisible) {
    var f = this.toolsMgr.setPopoverTriggerState($tce, popoverToolsVisible);
    popoverToolsVisible = f || popoverToolsVisible;
    var p = this.parentView();
    if (p) {
      p.setPopoverTriggerState($tce, popoverToolsVisible);
    }
  };

  BaseView.getNextViewName = function(parentPath) {
    return null;
  };

  // See comments in builder.js where it is called. Subclassed in the
  // ContentView.js
  BaseView.doInternalRouting = function(routeSpecArr, indexOfNextView) {
    return 0;
  };

  /*
   * This function is invoked when builder is routing to the view following this
   * view. It allows the current view to highlight selection (such an item in
   * nav-bar, view selector, list or tree). Subclass it as required.
   */
  BaseView.routingToNextView = function(routeSpecArr, indexOfNextView) {
  };
  
  BaseView.containerVisibilityChanging = function(visible) {
    if (this.viewSpec.container && !this.viewSpec.isAppView) {
      if (visible) {
        $("body").addClass(this.viewSpec.container + "-shown");      
      } else {
        $("body").removeClass(this.viewSpec.container + "-shown");
      }
    }
  };

  BaseView.validate = function() {
    /*
     * if(!this.$e.is(':visible')) { return true; }
     */
    var f = true;
    for (var i = 0; i < this._embeddedViews.length; i++) {
      f = this._embeddedViews[i].validate() && f;
    }
    return f;
  };

  BaseView.refresh = function() {
    if (this._nextView) {
      return this._nextView.refresh();
    }
    for (var i = 0; i < this._embeddedViews.length; i++) {
      this._embeddedViews[i].refresh();
    }
  };

  BaseView.windowResized = function() {
    if (this.cleared) {
      return;
    }
    if (this.viewSpec.dialog && this.$c.css("position") !== "static" && !this.$c.hasClass('js-dont-position')) {
      this.centerIt();
    }
    if (this._nextView) {
      this._nextView.windowResized();
    }
    for (var i = 0; i < this._embeddedViews.length; i++) {
      this._embeddedViews[i].windowResized();
    }
    this.updateScrollBar();
  };

  BaseView.updateDialogSize = function() {
    var $e = this.$e, $c = this.$c;
    if ($c) {
      var eWidth = $e.dataOrAttr("width") || $c.dataOrAttr("width");
      if (!eWidth) {
        eWidth = "auto";
      }
      var eHeight = $e.dataOrAttr("height") || $c.dataOrAttr("height");
      if (!eHeight) {
        eHeight = "auto";
      }

      var maxWidth = $e.dataOrAttr("max-width") || $c.dataOrAttr("max-width");
      if (!maxWidth) {
        maxWidth = Trillo.Options.DIALOG_MAX_WIDTH;
      }

      $c.css({
        width : eWidth,
        height : eHeight,
        maxWidth : maxWidth
      });
    }
  };

  BaseView.centerIt = function() {
    var $w = $(window), $c = this.$c;
    if ($c) {
      var pWidth = $w.width();
      var pHeight = $w.height();
      var pTop = $w.scrollTop();
      var eWidth = $c.outerWidth();
      var eHeight = $c.outerHeight();
      var top = parseInt((pHeight / 2) - (eHeight / 2), 10);
      if (top > 100)
        top = 100;
      else if (top < 10)
        top = 10;
      $c.css('top', pTop + top + 'px');
      $c.css('left', parseInt((pWidth / 2) - (eWidth / 2), 10) + 'px');
    }
  };

  BaseView.hideOverlaidContainer = function() {
    if (this.$c) {
      Trillo.popoverManager.hideCurrentPopupIfContains(this.$c);
    }
  };

  BaseView.layoutContainers = function() {
    if (this._nextView) {
      this._nextView.layoutContainers();
    }
    for (var i = 0; i < this._embeddedViews.length; i++) {
      this._embeddedViews[i].layoutContainers();
    }
  };

  BaseView.setNonNativeScrollBar = function($sb, options) {
    this.destroyScrollBar();
    options = options || {
      suppressScrollX : true,
      minScrollbarLength : 100
    };
    this.$_sb = $sb;
    $sb.perfectScrollbar(options);
  };

  BaseView.updateScrollBar = function() {
    if (this.$_sb) {
      this.$_sb.perfectScrollbar("update");
    }
  };

  BaseView.destroyScrollBar = function() {
    if (this.$_sb) {
      this.$_sb.perfectScrollbar("destroy");
    }
  };

  BaseView.setScrollBarPos = function(value, dir) {
    if (this.$_sb) {
      if (dir == "left") {
        this.$_sb.scrollLeft(value);
      } else {
        this.$_sb.scrollTop(value);
      }
      this.updateScrollBar();
    }
  };

  BaseView.getScrollBarPos = function(dir) {
    if (this.$_sb) {
      if (dir == "left") {
        return this.$_sb.scrollLeft();
      } else {
        return this.$_sb.scrollTop();
      }
    }
    return -1;
  };

  BaseView.createDragHandle = function() {
    if (this.dragHandle) {
      this.destroyDragHandle();
    }
    var $h = this.$e.find(".js-drag-handle, .js-size-handle");
    if ($h.length > 0) {
      this.dragHandle = new Trillo.DragHandler(this.$e, this);
    }
  };

  BaseView.destroyDragHandle = function() {
    if (this.dragHandle) {
      this.dragHandle.dispose();
      this.dragHandle = null;
    }
  };
  
  BaseView.objChanged = function(obj) {

  };

  BaseView.objAdded = function(newObj, atEnd) {

  };

  BaseView.objDeleted = function(obj) {

  };

  BaseView.modelDataChanged = function(model) {
    if (model === this.model()) {
      this.repeatShowUsingModel();
    }
  };
  
  //Shows this views context menu at a given location.
  BaseView.showContextMenu = function(x, y) {
    return this.toolsMgr.showContextMenu(x, y);
  };
  
  // Methods likely to be sub-classed to override behavior.
  
  // API likely to be used by application code
  
  BaseView.$elem = function() {
    return this.$e;
  };

  BaseView.$container = function() {
    return this.$c;
  };

  BaseView.controller = function() {
    return this._controller;
  };

  BaseView.model = function() {
    return this._controller.model();
  };

  BaseView.getData = function() {
    return this._controller.getData();
  };

  BaseView.getParentData = function() {
    var p = this.parentView();
    return p ? p.getData() : null;
  };

  BaseView.embeddedViews = function() {
    return this._embeddedViews;
  };

  BaseView.parentView = function() {
    return this._parentView || this._prevView;
  };

  BaseView.nextView = function() {
    return this._nextView;
  };
  
  BaseView.hide = function() {
    if (this.viewSpec.dialog) {
      this.$c.addClass("hide");
    } else {
      this.$e.addClass("hide");
    }
  };

  BaseView.unhide = function() {
    if (this.viewSpec.dialog) {
      this.$c.removeClass("hide");
    } else {
      this.$e.removeClass("hide");
    }
  };

  BaseView.isHidden = function() {
    if (this.viewSpec.dialog) {
      return this.$c.hasClass("hide");
    } else {
      return this.$e.hasClass("hide");
    }
  };

  BaseView.showPageLoadIndicator = function() {
    $(".js-page-load-indicator").removeClass("hide");
  };

  BaseView.hidePageLoadIndicator = function() {
    $(".js-page-load-indicator").addClass("hide");
  };
  
})();

/*******************************************************************************
 * Copyright (c) 2015, 2016 Collager Inc.
 *
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *******************************************************************************/
/* globals Mustache */

(function() {

  "use strict";

  Trillo.View = Trillo.inherits(Trillo.BaseView, function($e, controller, viewSpec) {
    Trillo.BaseView.call(this, $e, controller, viewSpec);
  });
  
  var BaseView = Trillo.BaseView.prototype;
  var View = Trillo.View.prototype;

  View.markForClearing = function() {
    BaseView.markForClearing.call(this);
    if (!this.viewSpec.isAppView) {
      if (this.ownsGlobalProgress) {
        this.hideGlobalProgress();
      }
    }
  };

  View.clear = function() {
    if (this.cleared) {
      return;
    }

    if (Trillo.searchHandler && Trillo.searchHandler.context === this) {
      Trillo.searchHandler.setContext(null);
    }

    this.clearTitle();
    Trillo.titleBarManager.viewCleared(this);
    BaseView.clear.call(this);
  };

  View.showGlobalProgress = function(actionName, progress) {
    console.debug("showing .... " + this.viewSpec.name);
    this.ownsGlobalProgress = true;
    var $e = $('.js-global-progress-bar');
    $e.show();
    var $e2 = $e.find('.js-title');
    $e2.html(actionName);
    $e2 = $e.find('.js-message');
    $e2.html(progress);
    $e.find('.js-progress-bar').css("width", (progress || 4) + "%");
  };

  View.hideGlobalProgress = function() {
    this.ownsGlobalProgress = false;
    console.debug("hiding .... " + this.viewSpec.name);
    var $e = $('.js-global-progress-bar');
    $e.hide();
  };

  View.updateProgress = function(obj) {
    this._updateProgress(obj);
  };

  // let the highest parent own the global progress indicator if it has the same
  // object selected
  View._updateProgress = function(obj) {
    var p = this.parentView();
    if (p && p._updateProgress && p._updateProgress(obj)) {
      return true;
    }
    var uid = this._controller.getSelectionUidOrContextUid();
    if (obj && ((this.selectedObj && this.selectedObj.uid === obj.uid) || uid === obj.uid)) {
      if (obj.availabilityState === Trillo.OBJ_LOCKED && typeof obj.percentComplete !== 'undefined') {
        this.showGlobalProgress(obj.actionName, obj.percentComplete);
      } else {
        this.hideGlobalProgress();
      }
      return true;
    }
    return false;
  };

  View.getTitleBar = function() {
    if (this.viewSpec.titleBar) {
      return Trillo.titleBarManager.getTitleBar(this.viewSpec.titleBar, this);
    } else {
      var p = this.parentView();
      if (p && p.getTitleBar) {
        return p.getTitleBar();
      } else {
        return Trillo.titleBarManager.getTitleBar(".js-heading", this);
      }
    }
  };

  /**
   * This is called via controller so controller can override the title
   * settings.
   */
  View.updateTitle = function() {
    var titlePrefix = "";
    var title;

    if (this.viewSpec.type === Trillo.ViewType.Selector || this.viewSpec.type === Trillo.ViewType.List
        || this.viewSpec.type === Trillo.ViewType.Nav || this.viewSpec.embedded) {
      // do nothing
      // leave the null block here in case we encounter this case.
    } else {
      if (Trillo.isCollectionView(this.viewSpec.type) || this.viewSpec.type === Trillo.ViewType.Chart) {
        title = this.viewSpec.displayName || "";
      } else {
        if (this.viewSpec.type === Trillo.ViewType.Tree) {
          titlePrefix = this.viewSpec.displayName || "";
        }
        var obj = this.selectedObj;
        title = obj ? obj.displayName || obj.name || "" : "";
      }

      /*
       * if (this._prevView && this._prevView.viewSpec.type ===
       * Trillo.ViewType.Selector) { // selector view title is title of this
       * view or its prefix. if (titlePrefix.length) { titlePrefix = ""; } else {
       * title = ""; } }
       */
    }
    this.setTitle(title, titlePrefix);
  };

  View.setTitle = function(title, titlePrefix) {
    this.title = title;
    this.titlePrefix = titlePrefix;
    if ((titlePrefix === "" || !titlePrefix) && this.getPrevViewTitle() === title) {
      return; // same title as the parent view. Don't append.
    }
    var titleBar = this.getTitleBar();
    if (titleBar) {
      titleBar.setTitle(this.name, title, titlePrefix);
    }
  };

  View.clearTitle = function() {
    this.title = null;
    this.titlePrefix = null;
    var titleBar = this.getTitleBar();
    if (titleBar) {
      titleBar.clearTitle(this.name);
    }
  };

  View.getPrevViewTitle = function() {
    if (this._prevView) {
      return this._prevView.title;
    }
    return null;
  };

  View.searchPhraseAvailable = function(ev, value, datum, dataset) {

  };

  View.getNextViewName = function(parentPath) {
    if (this._nextView && (!parentPath || (parentPath === this._nextView.viewSpec.parentPath))) {
      return this._nextView.viewSpec.getMyPath();
    }
    if (parentPath) {
      var str = Trillo.navHistory.get(parentPath);
      if (str) {
        return str;
      }
      var spec = this.viewSpec.getViewSpecByParentPath(parentPath);
      if (spec) {
        return spec.getMyPath();
      }
    }
    /*
     * if (historySpec) { var type = this.viewSpec.type; if
     * (Trillo.isSelectionView(type)) { return
     * this.viewSpec.getNextPath(historySpec.name); } }
     */
    if (this.viewSpec.nextView) {
      return this.viewSpec.getDefaultNextPath();
    } else {
      return this._getNextViewName();
    }
  };

  View._getNextViewName = function() {
    var uid = this._controller.getContextUid();
    var viewSpec = this.getNextViewSpecByUidClass(uid);
    if (viewSpec) {
      return viewSpec.name;
    }
    return null;
  };

  View.getNextViewSpecByUidClass = function(uid) {
    var specs = this.viewSpec.nextViewSpecs;
    var res = null;
    if (specs && uid) {
      var cls = Trillo.uidToClass(uid);
      if (cls) {
        $.each(specs, function(key, spec) {
          if (spec.trigger === cls) {
            res = spec;
            return false;
          }
        });
      }
    }
    return res;
  };

  View.getNextViewSpecNameByUidClass = function(uid) {
    var spec = this.getNextViewSpecByUidClass(uid);
    return spec ? spec.getMyPath() : null;
  };

  /*
   * This function is invoked when builder is routing to the view following this
   * view. It allows the current view to highlight selection (such an item in
   * nav-bar, view selector, list or tree). Subclass it as required.
   */
  View.routingToNextView = function(routeSpecArr, indexOfNextView) {
    // Since the routing state of this view is dependent on the path (not just
    // the next view),
    // we iterate over the routeSpecAtt until the routing state of this view is
    // set appropriately.
    // Remember that the name of a route can be a path which is a list of names
    // separated by "/" (sub-route).
    var n = routeSpecArr.length;
    var path = "";
    for (var i = indexOfNextView; i < n; i++) {
      // route until routing state update is successful.
      path = path + (path.length > 0 ? "/" : "") + Trillo.getTriggerFromPath(routeSpecArr[i].name);
      if (this.synchWithRouteState(path)) {
        break;
      }
    }
  };

  View.synchWithRouteState = function(path) {
    // An embedded views state may have to be updated based on next path.
    // For example, if a navigation is embedded into another view and
    // pointing to external views. If next path matches with one of the
    // views pointed by it, then navigation item is shown as selected.
    for (var i = 0; i < this._embeddedViews.length; i++) {
      this._embeddedViews[i].synchWithRouteState(path);
    }
    return true;
  };

  // view selection related method, mixin for NavView and TabView
  View.viewSelected = function(ev) {
    Trillo.hideCurrentOverlays(true, false);
    var $e = Trillo.getActualTarget(ev);
    if ($e) {
      Trillo.popoverManager.hideCurrentPopupIfContains($e);
      var tag = $e.prop("tagName").toLowerCase();
      if (tag === "a") {
        var href = $e.attr("href");
        if (href && href !== "#") {
          return;
        }
      }
    }
    if (ev) {
      // ev.stopPropagation();
      ev.preventDefault();
    }
    var $e2 = $(ev.target).closest(this.itemCss);
    var newName = $e2.dataOrAttr("nm");
    if (!this.canSelectionChange(newName)) {
      return;
    }
    this.selectionChanging(newName);
    if (this.updateItemSelection(newName)) {
      this.postViewSelected(newName);
    }
    $(".js-navbar-toggle").each(function() {
      $($(this).data("target")).removeClass("in").addClass('collapse');
    });
  };

  View.updateItemSelection = function(name) {
    $(':focus').blur();
    var $e = this.$e;
    var $e2 = $e.find(this.itemCss + "[selected]");
    var f = false;
    if ($e2.dataOrAttr("nm") !== name) {
      $e2.removeClass(Trillo.CSS.selected);
      $e2.removeAttr("selected");
      $e2 = $e.find("[nm='" + name + "']");
      $e2.addClass(Trillo.CSS.selected);
      $e2.attr("selected", "selected");
      f = true;
    }
    return f;
  };

  View.getSelected$Elem = function() {
    return this.$e.find(this.itemCss + "[selected]");
  };

  View.getSelectedItem = function() {
    var $e2 = this.$e.find(this.itemCss + "[selected]");
    return $e2.length ? $e2.dataOrAttr("nm") : null;
  };

  View.selectedItemChanged = function(newObjOrName) {
    this._controller.selectedItemChanged(newObjOrName);
  };

  View.postViewSelected = function(newName) {
    this._controller.routeToSelectedView(this.viewSpec.getNextPath(newName));
  };

  View.updateLabel = function() {
  };

  View.addContainerMarks = function() {
    var $el = this.$e.find(".js-container");
    var $markE, $c, pos;
    $.each($el, function() {
      $c = $(this);
      $c.empty();
      $c.addClass(Trillo.CSS.containerPreviewMode);
      $markE = $("<span></span>");
      $c.append($markE);
      $markE.addClass(Trillo.CSS.containerMark);
      $markE.html($c.dataOrAttr("nm"));
      $("body").addClass($c.attr("nm") + "-shown");
    });
  }
})();

/*******************************************************************************
 * Copyright (c) 2015, 2017 Collager Inc.
 *
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *******************************************************************************/
/* globals autosize */

(function() {

  "use strict";

  Trillo.EditableView = Trillo.inherits(Trillo.View, function($e, controller, viewSpec) {
    Trillo.View.call(this, $e, controller, viewSpec);
    // TODO move to template
    this.messageHtml = '<span class="js-field-message ' + Trillo.CSS.fieldMsg + ' text-info"></span>';
    this.errorHtml = '<span class="js-field-error ' + Trillo.CSS.fieldMsg + ' text-danger"></span>';
    this.editable = viewSpec.editable !== false;
  });
  
  var EditableView = Trillo.EditableView.prototype;
  var View = Trillo.View.prototype;

  EditableView.updateElements = function($el, data) {
    var self = this;
    $.each($el, function() {
      var $e = $(this);
      var name = $e.dataOrAttr("nm");
      var value = Trillo.getObjectValue(data, name);
      if (value === null) {
        value = "";
      }
      Trillo.setFieldValue($e, value);
    });
  };

  EditableView.updateReadonlyElements = function($el, data) {
    var self = this;
    $.each($el, function() {
      var $e = $(this);
      var name = $e.dataOrAttr("nm");
      var value = Trillo.getObjectValue(data, name);
      if (value === null) {
        value = "";
      }
      Trillo.setReadonlyFieldValue($e, value);
    });
  };

  EditableView.retrieveData = function($el) {
    var data = {};
    var self = this;
    $.each($el, function() {
      var $e = $(this);
      var name = $e.dataOrAttr("nm");
      var value = Trillo.getFieldValue($e);
      if (value !== null && value !== undefined) {
        Trillo.setObjectValue(data, name, value);
      }
    });
    return data;
  };
  EditableView._validateOne = function($e) {
    if (!$e.is(':visible')) {
      return true;
    }
    this.clearInlineError($e);
    var f = true;
    var value = Trillo.getFieldValue($e);
    var noValue = value === '' || value === undefined;
    if ($e.hasClass("js-required") && noValue) {
      this.inlineError($e, "Required");
      f = false;
    }

    if ($e.hasClass("number") && (!noValue && !Trillo.isNumeric(value))) {
      this.inlineError($e, "Numeric value required");
      f = false;
    }
    if (!f) {
      $e.parent().addClass(Trillo.CSS.hasErrorCss);
    }
    return f;
  };
  EditableView.validateOne = function(ev) {
    var $e = $(ev.target);
    if (!$e.is(':visible')) {
      return true;
    }
    var f = this._validateOne($e);
    if (f && this.controller().validateOne) {
      f = this.controller().validateOne($e);
    }
    if (f && this.controller().validateAndGetMsg) {
      var msg = this.controller().validateAndGetMsg($e);
      if (msg) {
        this.inlineError($e, msg);
        $e.parent().addClass(Trillo.CSS.hasErrorCss);
        f = false;
      }
    }
    return f;
  };
  EditableView._validate = function(el) {
    var f = true;
    for (var i = 0; i < el.length; i++) {
      var $e = $(el[i]);
      f = this._validateOne($e) && f;
    }
    return f;
  };
  EditableView.showNamedMessages = function(namedMessages) {
    var m;
    if (!namedMessages) {
      return;
    }
    for (var i = 0; i < namedMessages.length; i++) {
      m = namedMessages[i];
      this.inlineMessage(this.$e.find('[nm="' + m.name + '"]'), m.message);
    }
  };
  EditableView.showNamedMessagesAsError = function(namedMessages) {
    var m;
    if (!namedMessages) {
      return;
    }
    for (var i = 0; i < namedMessages.length; i++) {
      m = namedMessages[i];
      this.inlineError(this.$e.find('[nm="' + m.name + '"]'), m.message);
    }
  };
  EditableView.inlineMsg = function($e, msg) {
    var $em = $e.siblings('.js-field-message');
    if ($em.length === 0) {
      $e.after(this.messageHtml);
      $em = $e.siblings('.js-field-message');
    }
    $em.html(msg);
    $em.parent().addClass(Trillo.CSS.hasMessageCss);
    return $em;
  };
  EditableView.inlineError = function($e, msg) {
    var $em = $e.siblings('.js-field-error');
    if ($em.length === 0) {
      $e.after(this.errorHtml);
      $em = $e.siblings('.js-field-error');
    }
    $em.html(msg);
    $em.parent().addClass(Trillo.CSS.hasErrorCss);
    return $em;
  };
  EditableView.clearInlineMessage = function($e) {
    var $em = $e.siblings('.js-field-message');
    if ($em.length) {
      $em.html('');
      $em.parent().removeClass(Trillo.CSS.hasMessageCss);
    }
  };
  EditableView.clearInlineError = function($e) {
    var $em = $e.siblings('.js-field-error');
    if ($em.length) {
      $em.html('');
      $em.parent().removeClass(Trillo.CSS.hasErrorCss);
    }
  };
  EditableView.fieldChanged = function(ev) {
    var f = this.validateOne(ev);
    if (!f) {
      return;
    }
    var $e = $(ev.target);
    var name = $e.dataOrAttr("nm");
    var value = Trillo.getFieldValue($e);
    var obj = this.getObjForField($e);
    this.updateModelData(name, value, $e);
    return f;
  };
  EditableView.getFieldValue = function(name) {
    var $e = this.$e.find('[nm="' + name + '"]');
    if ($e.length) {
      return Trillo.getFieldValue($e);
    }
  };
  EditableView.setFieldValue = function(name, value) {
    var $e = this.$e.find('[nm="' + name + '"]');
    if ($e.length) {
      Trillo.setFieldValue($e, value);
      if (this._validateOne($e)) {
        this.updateModelData(name, value, $e);
      }
    }
  };

  EditableView.getInputs = function() {
    return Trillo.getInputs(this.$e);
  };

  EditableView.getReadonlyFields = function() {
    return Trillo.getReadonlyFields(this.$e);
  };

  EditableView.postShow = function(myDeferred) {
    var $tal = this.$e.find('textarea');
    if ($tal.length) {
      autosize($tal);
      autosize.update($tal);
    }
    $(".js-default-focus", this.$e).focus();
    View.postShow.call(this, myDeferred);
  };

  EditableView.clear = function() {
    if (!this.cleared) {
      var $tal = this.$e.find('textarea');
      if ($tal.length) {
        autosize.destroy($tal);
      }
    }
    View.clear.call(this);
  };

  EditableView.setAllInputsDisabled = function(f) {
    Trillo.setDisabled(this.getInputs(), f);
  };

  EditableView.setInputDisabled = function(name, f) {
    Trillo.setDisabled(this.$e.find('[nm="' + name + '"]'), f);
  };
})();

/*******************************************************************************
 * Copyright (c) 2015, 2017 Collager Inc.
 *
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *******************************************************************************/
(function() {

  "use strict";

  Trillo.EditableObjView = Trillo.inherits(Trillo.EditableView, function($e, controller, viewSpec) {
    Trillo.EditableView.call(this, $e, controller, viewSpec);
    this.changeHandler = $.proxy(this.fieldChanged, this);
  });
  
  var EditableObjView = Trillo.EditableObjView.prototype;
  var EditableView = Trillo.EditableView.prototype;

  EditableObjView.render = function() {
    EditableView.render.call(this);
    this.setSelectedObj(this.getData());
    this.updateProgress(this.getData());
    this.setChangeHandler(true);
    this.renderData();
  };

  EditableObjView.renderData = function() {
    var data = this.getData() || {};
    this.updateElements(this.getInputs(), data);
    this.updateReadonlyElements(this.getReadonlyFields(), data);
  };

  EditableObjView.setChangeHandler = function(isOn) {
    var $e = this.getInputs();
    $e.off("change", this.changeHandler);
    if (isOn) {
      $e.on("change", this.changeHandler);
    }
  };

  EditableObjView.validate = function() {
    var el = this.getInputs();
    var f = this._validate(el);
    f = f & EditableView.validate.call(this);
    return f;
  };

  EditableObjView.clear = function() {
    if (!this.cleared) {
      this.setChangeHandler(false);
    }
    EditableView.clear.call(this);
  };

  EditableObjView.canSubmit = function() {
    return this.validate();
  };

  EditableObjView.updateModelData = function(name, value, $e) {
    this.model().setValue(name, value);
  };

  EditableObjView.getObjForField = function($e) {
    return this.getData();
  };

  EditableObjView.objChanged = function(obj) {
    if (obj === this.getData()) {
      this.renderData();
      this.updateProgress(obj);
    }
  };
})();

/*******************************************************************************
 * Copyright (c) 2015, 2017 Collager Inc.
 *
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *******************************************************************************/
/**
 * This is the base class for the special types of view that help in the
 * selection of next view such as navigation, drop downs to give choice of the
 * next view, a list of choices meant for views or a navigation tree.
 */

(function() {

  "use strict";

  Trillo.ViewSelectionView = Trillo.inherits(Trillo.View, function($e, controller, viewSpec) {
    Trillo.View.call(this, $e, controller, viewSpec);
    this.containerCss = null;
    this.itemCss = null;
    this.viewSelectedMethod = $.proxy(this.viewSelected, this);
  });
  
  var ViewSelectionView = Trillo.ViewSelectionView.prototype;
  var View = Trillo.View.prototype;

  ViewSelectionView.postShow = function(myDeferred) {
    var $temp = this.$e.find(this.itemCss);
    $temp.off("click", this.viewSelectedMethod);
    $temp.on("click", this.viewSelectedMethod);
    View.postShow.call(this, myDeferred);
  };

  ViewSelectionView.clear = function() {
    if (!this.cleared) {
      var $temp = this.$e.find(this.itemCss);
      $temp.off("click", this.viewSelectedMethod);
    }
    View.clear.call(this);
  };

  ViewSelectionView.synchWithRouteState = function(name) {
    // highlight menu
    var $e = this.$e;
    var $e2 = $e.find("[nm='" + name + "']");
    if ($e2.length > 0) {
      this.updateItemSelection(name);
      this.updateLabel();
      this.controller().updateTitle();
      return true;
    }
    return false;
  };

  ViewSelectionView._getNextViewName = function() {
    var $e2 = this.$e.find(this.itemCss + "[selected]");
    if ($e2.length > 0) {
      return $e2.dataOrAttr("nm");
    }
    return null;
  };
})();
/*******************************************************************************
 * Copyright (c) 2015, 2017 Collager Inc.
 *
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *******************************************************************************/
(function() {

  "use strict";

  Trillo.TreeView = Trillo.inherits(Trillo.View, function($e, controller, viewSpec) {
    Trillo.View.call(this, $e, controller, viewSpec);
    var $treeC = this.$e.find(".js-tree-container");
    var $sb = Trillo.findAndSelf(this.$e, ".js-non-native-scrollbar");
    if ($sb.length) {
      this.setNonNativeScrollBar($sb);
    }
    this.tree = new Trillo.Tree({
      $e : $treeC,
      parent : this,
      scrollPolicy : $sb.length ? Trillo.Options.NON_NATIVE_SCROLLBAR
          : (Trillo.isTouchSurface ? Trillo.Options.AUTO_SCROLL : Trillo.Options.SCROLL_ON_HOVER),
      openOnFirstClick : true,
      closeOthers : true
    });
    this.toggleDisplayHandler = $.proxy(this.toggleDisplay, this);
  });

  var TreeView = Trillo.TreeView.prototype;
  var View = Trillo.View.prototype;
  
  TreeView.clear = function() {
    if (!this.cleared) {
      this.removeEventHandlers();
      this.tree.clear();
    }
    View.clear.call(this);
  };

  TreeView.render = function() {
    View.render.call(this);
    this.addHandlers();
    this.renderData();
  };

  TreeView.renderData = function() {
    // model.getData() is root node, we do not display it.
    var data = this.getData();
    data = data ? (data.children ? data.children : []) : [];
    this.tree.setTreeData(this.getData().children); 
  };

  TreeView.postShow = function(myDeferred) {
    this.selectTreeItem(this.controller().getParam("sel"));
    View.postShow.call(this, myDeferred);
  };

  TreeView.selectTreeItem = function(uid) {
    var selected = this.tree.selectItemByUid(uid);
    var list = this.getData().children;
    if (!selected && list && list.length > 0) {
      uid = list[0].uid;
      this.controller().setParam("sel", uid);
      this.tree.selectItemByUid(uid);
    }
    this.setSelectedObj(this.tree.getSelectedItem());
  };

  TreeView.selectAndRoute = function(uid) {
    var selected = this.tree.selectItemByUid(uid);
    if (selected) {
      this.treeItemSelected(this.tree.getSelectedItem());
      return true;
    }
    return false;
  };

  TreeView.synchWithRouteState = function(name) {
    // highlight node
    var item = this.tree.getItemByUid(name);
    if (item && item !== this.selectedObj) {
      this.tree.selectItemByUid(name);
      this.setSelectedObj(this.tree.getSelectedItem());
      return true;
    }
    return false;
  };

  TreeView.treeItemSelected = function(item) {
    this.setSelectedObj(item);
    this.controller().setParam("sel", item.uid);
  };

  TreeView.addHandlers = function() {
    if (this.viewSpec.viewToggle) {
      this.removeEventHandlers();
      $(this.viewSpec.viewToggle).on("click", this.toggleDisplayHandler);
    }
  };

  TreeView.removeEventHandlers = function() {
    if (this.viewSpec.viewToggle) {
      $(this.viewSpec.viewToggle).off("click", this.toggleDisplayHandler);
    }
  };

  TreeView.toggleDisplay = function() {
    var notInView = this.$container().offset().left < 0;
    this.$container().css("left", notInView ? "0px" : "-1000px");
  };

  TreeView.outOfView = function() {
    this.$container().css("left", "-1000px");
  };

  TreeView.withInView = function() {
    this.$container().css("left", "0px");
  };

  TreeView.getNextViewName = function(parentPath) {
    var item = this.selectedObj;
    if (item) {
      return Trillo.isUid(item.uid) ? this.getNextViewSpecNameByUidClass(item.uid) : this.viewSpec
          .getNextPath(item.uid);
    }
    return View.getNextViewName.call(this, parentPath);
  };

  TreeView.refresh = function() {
    this.tree.refresh();
    View.refresh.call(this);
  };
})();

/*******************************************************************************
 * Copyright (c) 2015, 2017 Collager Inc.
 *
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *******************************************************************************/
(function() {

  "use strict";

  Trillo.NavTreeView = Trillo.inherits(Trillo.TreeView, function($e, controller, viewSpec) {
    Trillo.TreeView.call(this, $e, controller, viewSpec);
  });
  
  var NavTreeView = Trillo.NavTreeView.prototype;

  NavTreeView.customizeModelSpec = function(modelSpec) {
    modelSpec.data = {
      children : this.viewSpec.nextViewSpecs || []
    };
  };
})();

/*******************************************************************************
 * Copyright (c) 2015, 2017 Collager Inc.
 *
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *******************************************************************************/
(function() {

  "use strict";

  Trillo.SelectorView = Trillo.inherits(Trillo.ViewSelectionView, function($e, controller, viewSpec) {
    Trillo.ViewSelectionView.call(this, $e, controller, viewSpec);
    this.labelSelector = '.js-label';
    this.containerCss = ".js-menu";
    this.itemCss = ".js-menu-item";
  });
  
  var SelectorView = Trillo.SelectorView.prototype;

  SelectorView.updateLabel = function() {
    var $e = this.$e;
    var $e2 = $e.find(this.itemCss + "[selected]");
    $e.find(this.labelSelector).html($e2.html());
  };
})();
/*******************************************************************************
 * Copyright (c) 2015, 2017 Collager Inc.
 *
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *******************************************************************************/
(function() {

  "use strict";

  Trillo.TabView = Trillo.inherits(Trillo.EditableObjView, function($e, controller, viewSpec) {
    Trillo.EditableObjView.call(this, $e, controller, viewSpec);
    this.containerCss = ".js-tab-list";
    this.itemCss = ".js-tab";
    this.tabPanelCSS = ".js-tab-panel";
    this.viewSelectedMethod = $.proxy(this.viewSelected, this);
    // tab's inputs are inputs seen in the beginning.
    // Anything added later is part of one of its children views.
    this.$inputs = Trillo.getInputs($e);
    this.changeHandler = $.proxy(this.fieldChanged, this);
  });
  
  var TabView = Trillo.TabView.prototype;
  var EditableObjView = Trillo.EditableObjView.prototype;

  TabView.getInputs = function() {
    return this.$inputs;
  };

  TabView.postShow = function(myDeferred) {
    var $e2, $tp;
    var name = null, nameFromHistory = Trillo.navHistory.get("tab://" + this.controller().getRouteUpTo(false));

    $e2 = this.$e.find(this.itemCss + "[selected]");
    if ($e2.length > 0) {
      name = $e2.dataOrAttr("nm");
    }
    if (nameFromHistory && nameFromHistory !== name) {
      name = nameFromHistory;
      this.synchWithRouteState(name);
    }
    if (name) {
      $tp = this.$e.find(this.tabPanelCSS + "[for='" + name + "']");
      if ($tp.length > 0) {
        this.updateTabPanelVisibility(name);
      }
    }
    var $temp = this.$e.find(this.itemCss);
    $temp.off("click", this.viewSelectedMethod);
    $temp.on("click", this.viewSelectedMethod);
    this.makeResponsive();
    EditableObjView.postShow.call(this, myDeferred);
  };

  TabView.clear = function() {
    if (!this.cleared) {
      var $temp = this.$e.find(this.itemCss);
      $temp.off("click", this.viewSelectedMethod);
    }
    EditableObjView.clear.call(this);
  };

  TabView.updateLabel = function() {
    var $e = this.$e;
    var $e2 = $e.find(this.itemCss + "[selected]");
    $e.find("." + Trillo.CSS.tabActive).removeClass(Trillo.CSS.tabActive);
    $e2.parent().addClass(Trillo.CSS.tabActive);
  };

  TabView.updateTabPanelVisibility = function(newName) {
    var $e = this.$e;
    $e.find(this.tabPanelCSS + "[for]").hide();
    var $e2 = $e.find(this.tabPanelCSS + "[for='" + newName + "']");
    $e2.show();
    Trillo.resizeAllTextArea($e);
    this.refresh();
  };

  TabView.postViewSelected = function(newName) {
    var $tp = this.$e.find(this.tabPanelCSS + "[for='" + newName + "']");
    if ($tp.length > 0) {
      this.updateTabPanelVisibility(newName);
      this.updateLabel();
      this.selectedItemChanged(newName);
      Trillo.navHistory.add("tab://" + this.controller().getRouteUpTo(false), newName);
    } else {
      EditableObjView.postViewSelected.call(this, newName);
    }
  };

  TabView._getNextViewName = function() {
    var $e2, $tp;
    var nextName = Trillo.navHistory.get("tab://" + this.controller().getRouteUpTo(false));
    if (nextName) {
      $tp = this.$e.find(this.tabPanelCSS + "[for='" + nextName + "']");
      if ($tp.length > 0) {
        // return null;
      }
    }
    $e2 = this.$e.find(this.itemCss + "[selected]");
    if ($e2.length > 0) {
      nextName = $e2.dataOrAttr("nm");
      $tp = this.$e.find(this.tabPanelCSS + "[for='" + nextName + "']");
      if ($tp.length > 0) {
        return null;
      } else {
        return nextName;
      }
    }
    return null;
  };

  TabView.synchWithRouteState = function(name) {
    // highlight menu
    var $e = this.$e;
    var $e2 = $e.find("[nm='" + name + "']");
    if ($e2.length > 0) {
      this.updateItemSelection(name);
      this.updateLabel();
      this.controller().updateTitle();
      return true;
    }
    return false;
  };

  TabView.objChanged = function(obj) {
    EditableObjView.objChanged.call(this, obj);
    if (obj === this.getData()) {
      this.setTbState();
    }
  };

  TabView.makeResponsive = function() {
    var $e = this.$e;
    var $tabs = $e.find("li");
    var n = 0;
    var $e2;
    $.each($tabs, function() {
      if ($(this).is(':visible')) {
        n++;
      }
    });
    if (n > 0) {
      $tabs.css("width", (100 / n) + "%");
    }

    $.each($tabs, function() {
      $e2 = $(this);
      if (!$e2.attr("title")) {
        $e2.attr("title", $.trim($e2.text()));
      }
    });
  };

  TabView.showHideTab = function(name, showing) {
    var $e2 = this.$e.find("[nm='" + name + "']");
    if ($e2.length > 0) {
      if (showing) {
        $e2.parent().removeClass("hide");
      } else {
        $e2.parent().addClass("hide");
      }
      this.makeResponsive();
    }
  };

  TabView.showTab = function(name) {
    this.showHideTab(name, true);
  };

  TabView.hideTab = function(name) {
    this.showHideTab(name, false);
  };
})();

/*******************************************************************************
 * Copyright (c) 2015, 2016 Collager Inc.
 *
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *******************************************************************************/
(function() {

  "use strict";

  Trillo.NavView = Trillo.inherits(Trillo.ViewSelectionView, function($e, controller, viewSpec) {
    Trillo.ViewSelectionView.call(this, $e, controller, viewSpec);
    this.containerCss = ".js-navigation";
    this.itemCss = ".js-nav-item";
  });
})();
/*******************************************************************************
 * Copyright (c) 2015, 2017 Collager Inc.
 *
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *******************************************************************************/
(function() {

  "use strict";

  Trillo.sortDescTemplate = '<span class="order"><span class="caret"></span></span>';
  Trillo.sortAscTemplate = '<span class="order dropup"><span class="caret"></span></span>';

  Trillo.CollectionView = Trillo.inherits(Trillo.View, function($e, controller, viewSpec) {
    Trillo.View.call(this, $e, controller, viewSpec);
  });
  
  var CollectionView = Trillo.CollectionView.prototype;
  var View = Trillo.View.prototype;
  
  CollectionView.setupView = function() {
    var options = {};
    var viewSpec = this.viewSpec;
    var $e = this.$e;

    var $e2 = $e.find('.js-grid-cell');
    this.sortSpec = {};
    if ($e2.length > 0) {
      options.elemKey = viewSpec.name + "-" + "info-block";
      Trillo.infoElementRepo.addTemplate($e2, options.elemKey);
    } else {
      $e2 = $e.find('.js-content-row');
      if ($e2.length > 0) {
        options.elemKey = viewSpec.name + "-" + "row";
        Trillo.infoElementRepo.addTemplate($e2, options.elemKey);
        options.isListViewMode = true;
      }
    }
    $e2 = $e.find('.js-heading-row');
    if ($e2.length > 0) {
      $e2.show();
      options.$headerRow = $e2;
    }
    options.postRenderer = viewSpec.postRenderer;
    options.dialog = viewSpec.dialog;
    options.virtual = viewSpec.virtual || typeof viewSpec.virtual === "undefined" ? true : false;
    this.$asc = $(Trillo.sortAscTemplate);
    this.$desc = $(Trillo.sortDescTemplate);
    if (this.$e.hasClass("js-non-native-scrollbar")) {
      this.setNonNativeScrollBar(this.$e);
    }
    this.canvas = new Trillo.Canvas(this, options);
    View.setupView.call(this);
  };

  CollectionView.render = function() {
    var pi = this.model().getPaginationInfo();
    if (!pi || pi.numberOfPages === 1) {
      this.viewSpec.virtual = false;
      this.canvas.virtual = false;
    }
    this.controller().updateTitle();
    View.render.call(this);
    this.renderData();
  };

  CollectionView.renderData = function() {
    this.canvas.clear();
    this.canvas.setContent(this._modelDataWithPagination());
  };

  CollectionView.clear = function() {
    if (!this.cleared) {
      this.unselectInfoItem();
      this.canvas.clear();
    }
    View.clear.call(this);
  };

  CollectionView.windowResized = function() {
    if (this.cleared) {
      return;
    }
    this.canvas.windowResized();
    View.windowResized.call(this);
  };

  CollectionView.layoutContainers = function() {
    if (this.cleared)
      return;
    this.canvas.windowResized();
    View.layoutContainers.call(this);
  };

  CollectionView.loadPage = function(pageNumber, requireClearing) {
    $.when(this.controller().loadData(pageNumber, requireClearing)).done(
        $.proxy(this.pageLoaded, this, requireClearing));
  };

  // model and this._model will be same as the current model
  CollectionView.pageLoaded = function(requireClearing, model) {
    if (requireClearing) {
      this.canvas.clear();
    }
    this.canvas.setContent(this._modelDataWithPagination());
  };

  CollectionView.postShow = function(myDeferred) {
    this.selectCollectionItem(this.controller().getParam("sel"));
    View.postShow.call(this, myDeferred);
  };

  CollectionView.selectCollectionItem = function(uid) {
    var selected = this.canvas.selectItemByUid(uid);
    // If selection is null and view specifies a nextView that is
    // triggered by "selection" then select first item if present.
    if (!selected && this.hasSelectionTrigger()) {
      var list = this.getData();
      if (list && list.length > 0) {
        uid = list[0].uid;
        this.controller().setParam("sel", uid);
        selected = this.canvas.selectItemByUid(uid);
      }
    }
  };

  CollectionView.selectInfoItem = function(infoItem) {
    this.selectedInfoItem = infoItem;
    if (infoItem) {
      this.setSelectedObj(infoItem.obj);
      if (this.hasSelectionTrigger() && infoItem.obj) {
        this.controller().setParam("sel", infoItem.obj.uid);
      }
    }
  };

  CollectionView.unselectInfoItem = function(infoItem) {
    this.selectedInfoItem = null;
    this.setSelectedObj(null);
  };

  CollectionView.clicked = function(infoItem, ev) {
    if (infoItem && infoItem.obj && infoItem.obj.name) {
      return this.controller()._handleClickGeneric(infoItem.obj.name, infoItem.$rootE, infoItem.obj, ev);
    }
  };

  CollectionView.infoItemDblClicked = function(infoItem, ev) {
    // double click navigates to detail if there is no navigation due to
    // "selection" trigger.
    if (infoItem && infoItem.obj && !this.hasSelectionTrigger()) {
      return this.controller().doTriggerNextView("detail", infoItem.obj);
    }
    return false;
  };

  /* Checks if there is next view that will be triggered on selection. */
  CollectionView.hasSelectionTrigger = function() {
    return this.viewSpec.getNextViewSpecByTrigger("selection");
  };

  CollectionView.objChanged = function(obj) {
    this.canvas.objChanged(obj);
    if (this.selectedObj === obj) {
      this.setTbState();
    }
    View.objChanged.call(this, obj);
  };

  CollectionView.objAdded = function(newObj, atEnd) {
    this.canvas.objAdded(newObj, atEnd);
    View.objAdded.call(this, newObj, atEnd);
  };

  CollectionView.doSort = function(ev) {
    var $e = $(ev.target);
    $e = Trillo.getClosestLabelElem($e);
    if (!$e) {
      Trillo.alert.showError("Error", "Missing 'for' attribute in the header, pl. specify in the HTML temlpate");
      return;
    }
    var name = $e.dataOrAttr("for");
    var currentSort = this.sortSpec[name];
    if (currentSort === "asc") {
      currentSort = "desc";
    } else {
      currentSort = "asc";
    }
    this.$asc.remove();
    this.$desc.remove();
    if (currentSort === "asc") {
      $e.append(this.$asc);
    } else {
      $e.append(this.$desc);
    }
    this.sortSpec = {};
    this.sortSpec[name] = currentSort;

    if (this.model().setOrderBy) {
      var orderBy = name + " " + currentSort;
      this.model().setOrderBy(orderBy);
      this.canvas.loadingData = true;
      this.loadPage(1, true);
    } else {
      // local model
      this.model().doSort(name, currentSort);
      this.canvas.clear();
      this.canvas.setContent(this._modelDataWithPagination());
    }
  };

  CollectionView.refresh = function() {
    this.canvas.refresh();
    View.refresh.call(this);
  };

  CollectionView.changeAttr = function(obj, name, value) {
    this.model().setObjAttr(obj, name, value);
  };

  CollectionView._modelDataWithPagination = function() {
    var data = this.getData();
    if (!data) {
      data = [];
    }
    var pi = this.model().getPaginationInfo();
    if (!pi) {
      pi = Trillo.makePaginationInfo(data);
    }
    pi.items = data;
    return pi;
  };
})();

/*******************************************************************************
 * Copyright (c) 2015, 2017 Collager Inc.
 *
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *******************************************************************************/
/*
 * This used query model (without pagination) and renders a simple drop downlist.
 */
/* globals Mustache */
(function() {

  "use strict";

  Trillo.DropdownView = Trillo.inherits(Trillo.ViewSelectionView, function($e, controller, viewSpec) {
    Trillo.ViewSelectionView.call(this, $e, controller, viewSpec);
    this.labelSelector = '.js-label';
    this.containerCss = ".js-navigation";
    this.listCss = ".js-list";
    this.itemCss = ".js-list-item";
    this.itemSelectedMethod = $.proxy(this.itemSelected, this);
  });

  var DropdownView = Trillo.DropdownView.prototype;
  var ViewSelectionView = Trillo.ViewSelectionView.prototype;
  
  DropdownView.render = function() {
    this.controller().updateTitle();
    ViewSelectionView.render.call(this);
    this.renderList();
  };

  DropdownView.renderList = function() {
    var $temp = this.$e.find(this.listCss);
    var l = this.getData() || [];
    if (Trillo.HtmlTemplates.dropdownListItem && !Trillo.HtmlTemplates.dropdownListItem__parsed__) {
      Mustache.parse(Trillo.HtmlTemplates.dropdownListItem);
      Trillo.HtmlTemplates.dropdownListItem__parsed__ = true;
    }
    var html = "";
    // TODO use template than hard coding the HTML
    for (var i = 0; i < l.length; i++) {
      var item = l[i];
      html += Mustache.render(Trillo.HtmlTemplates.dropdownListItem, item);
    }
    $temp.html(html);
  };

  DropdownView.postShow = function(myDeferred) {
    this.selectItem();
    ViewSelectionView.postShow.call(this, myDeferred);
  };

  // Dropdown view is mainly for the list of objects therefore it uses "uid" in
  // the selected item value.
  // If required, make up a uid and set for each object in the list in
  // controller or model using
  // pre-processing hooks.
  DropdownView.selectItem = function() {
    var uid = this.controller().getParam("sel");
    var selected = null;
    if (uid) {
      selected = this.model().getObj(uid);
    }
    var items = this.getData();
    if (!selected && items.length > 0) {
      selected = items[0];
      uid = selected.uid;
      this.controller().setParam("sel", uid);
    }
    this.setSelectedObj(selected);
  };

  DropdownView.synchWithRouteState = function(name) {
    ViewSelectionView.synchWithRouteState.call(this, name);
    // will select row if the list is a list of names (like the case with tree).
    var item = this.model().getObj(name);
    if (item && item !== this.selectedObj) {
      this.setSelectedObj(item);
    }
  };

  DropdownView.setSelectedObj = function(selected) {
    ViewSelectionView.setSelectedObj.call(this, selected);
    this.updateLabel();
  };

  DropdownView.postViewSelected = function(newName) {
    var item = this.model().getObj(newName);
    this.setSelectedObj(item);
    var uid = item ? item.uid : null;
    this.controller().setParam("sel", uid);
  };

  DropdownView.updateLabel = function() {
    var selected = this.selectedObj;
    var html = selected ? selected.name : "";
    this.$e.find(this.labelSelector).html(html);
  };

  DropdownView._getNextViewName = function() {
    var item = this.selectedObj;
    if (item) {
      return Trillo.isUid(item.uid) ? null : item.uid;
    }
  };

  DropdownView.objChanged = function(obj) {
    this.renderList();
    if (this.selectedObj === obj) {
      this.setTbState();
    }
    ViewSelectionView.objChanged.call(this, obj);
  };

  DropdownView.objAdded = function(newObj, atEnd) {
    this.renderList();
    if (!this.selectedObj) {
      this.selectItem();
    }
    ViewSelectionView.objAdded.call(this, newObj, atEnd);
  };
})();
/*******************************************************************************
 * Copyright (c) 2015, 2016 Collager Inc.
 *
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *******************************************************************************/
(function() {

  "use strict";

  Trillo.DetailView = Trillo.inherits(Trillo.EditableObjView, function($e, controller, viewSpec) {
    Trillo.EditableObjView.call(this, $e, controller, viewSpec);
  });
})();
/*******************************************************************************
 * Copyright (c) 2015, 2016 Collager Inc.
 *
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *******************************************************************************/
(function() {

  "use strict";

  Trillo.FormView = Trillo.inherits(Trillo.EditableObjView, function($e, controller, viewSpec) {
    Trillo.EditableObjView.call(this, $e, controller, viewSpec);
  });

})();
/*******************************************************************************
 * Copyright (c) 2015, 2017 Collager Inc.
 *
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *******************************************************************************/
(function() {

  "use strict";

  Trillo.EditableTableView = Trillo.inherits(Trillo.EditableView, function($e, controller, viewSpec) {
    Trillo.EditableView.call(this, $e, controller, viewSpec);
  });
  
  var EditableTableView = Trillo.EditableTableView.prototype;
  var EditableView = Trillo.EditableView.prototype;


  EditableTableView.setupView = function() {
    this.allowsNewRow = typeof this.viewSpec.allowsNewRow === "undefined" || this.viewSpec.allowsNewRow;
    this.$templateE = this.$e.find('.js-content-row');
    this.$templateE.remove();
    this.changeHandler = $.proxy(this.rowFieldChanged, this);
    this.rowActionHandler = $.proxy(this.handleRowAction, this);
    this.keydownHandler = $.proxy(this.keydownAction, this);
    this.isStringArray = false;
    EditableView.setupView.call(this);
  };

  EditableTableView.render = function() {
    EditableView.render.call(this);
    this.$tableE = Trillo.findAndSelf(this.$e, 'table');
    this.renderData();
  };

  EditableTableView.renderData = function() {
    var data = this.getData();
    data = data ? Trillo.convertToArray(data) : [];
    // if array elements are string, convert them to object with "name" being
    // the default attribute
    // This faciliates editing of a list of string using this components.
    if (data.length && typeof data[0] === "string") {
      this.isStringArray = true;
      var newDt = [];
      $.each(data, function() {
        newDt.push({
          "name" : this
        });
      });
      data = newDt;
    }
    this.clearRows();
    this.makeEmptyData();
    this.clearRows();
    this.setRowsData(data);
    this.addLastEmptyRow();
  };

  EditableTableView.clearRows = function() {
    this.$e.find('.js-content-row').remove();
  };

  EditableTableView.setRowsData = function(dataList) {
    for (var i = 0; i < dataList.length; i++) {
      var $r = this.appendNewRow(i);
      $r.data("_row_data_", dataList[i]);
      this.updateElements(Trillo.getInputs($r), dataList[i]);
      this.updateReadonlyElements(Trillo.getReadonlyFields($r), dataList[i]);
    }
  };

  EditableTableView.refreshRowsView = function() {
    var $el = this.$e.find('.js-content-row');
    for (var i = 0; i < $el.length; i++) {
      var $e = $($el[i]);
      var rowData = $e.data("_row_data_");
      if (rowData) {
        this.updateElements(Trillo.getInputs($e), rowData);
        this.updateReadonlyElements(Trillo.getReadonlyFields($e), rowData);
      }
    }
  };

  EditableTableView.appendNewRow = function(rowIndex) {
    var $r = this.$templateE.clone(true);
    $r.attr("row", "" + rowIndex);
    this.$tableE.append($r);
    $r.data("_row_data_", {});
    this.addRowEventHandler($r);
    return $r;
  };

  EditableTableView.makeEmptyData = function() {
    this.appendNewRow();
    var dl = [];
    this._viewToData(dl, true, true);
    this.emptyData = dl[0];
  };

  // re-populates data array from the view.
  EditableTableView._viewToData = function(data, includeEmpty, skipSave) {

    var oldList = null;

    if (!skipSave) {
      oldList = this.model().cloneData();

    }
    data.length = 0;

    var $el = this.$e.find('.js-content-row');
    var self = this;
    var $e;
    $.each($el, function() {
      $e = $(this);
      var $inputs = Trillo.getInputs($e);
      if (includeEmpty || !self.isEmpty($inputs)) {
        var rowData = self.retrieveData($inputs);
        if (self.isStringArray) {
          data.push(rowData.name);
        } else {
          var oldData = $e.data("_row_data_");
          Trillo.clearObj(oldData);
          rowData = $.extend(oldData, rowData);
          data.push(rowData);
        }
      }
    });
    if (!skipSave) {
      this.model().recrodDataChange(oldList, {
        obj : this.getParentData(),
        viewName : this.name
      });
    }
  };

  EditableTableView.addRowEventHandler = function($r) {
    var $e = Trillo.getInputs($r);
    $e.on("change", this.changeHandler);
    $e.on("keydown", this.keydownHandler);
    $e = $r.find(".js-row-tool");
    $e.on("click", this.rowActionHandler);
  };

  EditableTableView.validate = function() {
    var $el = this.$e.find('.js-content-row');
    var f = true;
    var self = this;
    var $e;
    $.each($el, function() {
      $e = $(this);
      var $inputs = Trillo.getInputs($e);
      if (!self.isEmpty($inputs)) {
        f = self._validate($inputs) && f;
      }
    });
    f = f & EditableView.validate.call(this);
    return f;
  };

  EditableTableView.isEmpty = function($el) {
    var f = true;
    var emptyData = this.emptyData || {};
    $.each($el, function() {
      var $e = $(this);
      var value = Trillo.getFieldValue($e);
      var empty = emptyData[$e.attr("nm")];
      if (value !== empty) {
        f = false;
        return false;
      }
    });
    return f;
  };

  EditableTableView.rowFieldChanged = function(ev) {
    if (this.fieldChanged(ev)) {
      var $e = $(ev.target);
      if (this.isLastRow($e)) {
        this.addLastEmptyRow();
      }
    }
  };

  EditableTableView.isLastRow = function($e) {
    var n = this.getNumberOfRows();
    var rowIndex = this.getRowIndex($e);
    return rowIndex === n - 1;
  };

  EditableTableView.getNumberOfRows = function() {
    return this.$e.find('.js-content-row').length;
  };

  EditableTableView.handleRowAction = function(ev) {
    var $e = $(ev.target);
    switch ($e.attr("nm")) {
    case 'up':
      this.moveRow($e, -1);
      break;
    case 'down':
      this.moveRow($e, 1);
      break;
    case 'add':
      this.addRowBefore($e);
      break;
    case 'delete':
      this.deleteRow($e);
      break;
    default:
      this.controller().handleAction($e.attr("nm"), this.getObjForField($e), $e);
    }
  };

  EditableTableView.moveRow = function($e, by) {
    var rowIndex = this.getRowIndex($e) + by;
    if (rowIndex < 0)
      return;
    var n = this.getNumberOfRows();
    if (rowIndex >= n) {
      return;
    }
    if (by < 0) {
      this.$e.find('[row="' + rowIndex + '"]').before($e.closest("tr"));
    } else {
      this.$e.find('[row="' + rowIndex + '"]').after($e.closest("tr"));
    }
    this.reorder();
    this._viewToData(this.getData(), true);
  };

  EditableTableView.addRowBefore = function($e) {
    var $r = this.$templateE.clone(true);
    $e.closest("tr").before($r);
    this.addRowEventHandler($r);
    this.reorder();
    this._viewToData(this.getData(), true);
  };

  EditableTableView.deleteRow = function($e) {
    $e.closest("tr").remove();
    if (this.getNumberOfRows() === 0) {
      this.appendNewRow(0);
    } else {
      this.reorder();
    }
    this._viewToData(this.getData(), true);
  };

  EditableTableView.reorder = function() {
    var $el = this.$e.find('.js-content-row');
    var n = 0;
    $.each($el, function() {
      $(this).attr("row", n++);
    });
  };

  EditableTableView.getRowIndex = function($e) {
    return parseInt($e.closest("tr").attr("row"), 10);
  };

  EditableTableView.removeLastRowIfEmpty = function() {
    var $e = this.$e.find('.js-content-row').last();
    if (this.isEmpty($e)) {
      $e.remove();
    }
  };

  EditableTableView.addLastEmptyRow = function() {
    if (this.editable && this.allowsNewRow
        && (this.getData().length === 0 || !this.isEmpty(Trillo.getInputs(this.$e.find('.js-content-row').last())))) {
      this.appendNewRow(this.getNumberOfRows());
      this._viewToData(this.getData(), true, true);
    }
  };

  EditableTableView.setAllowsNewRow = function(f) {
    if (f !== this.allowsNewRow) {
      this.allowsNewRow = f;
      if (f) {
        this.addLastEmptyRow();
      } else {
        this.removeLastRowIfEmpty();
      }
    }
  };

  EditableTableView.updateModelData = function(name, value, $e) {
    var oldList = this.model().cloneData();
    // table changes are managed by this class as a whole therefore do not
    // record changes;
    // also make sure that they are not recorded in any controller,
    this.model().setObjAttrNoRecording(this.getObjForField($e), name, value);
    // the above call may have changed other data of the model, therefore
    // refresh view
    this.refreshRowsView();
    this.model().recrodDataChange(oldList, {
      obj : this.getParentData(),
      viewName : this.name
    });
  };

  EditableTableView.getObjForField = function($e) {
    var rowIndex = this.getRowIndex($e);
    return this.getData()[rowIndex];
  };

  EditableTableView.keydownAction = function(ev) {
    var which = ev.which;
    if (which === 38 || which === 40 || which === 13) {
      var $e = $(ev.target);
      if ($e.is("select") && which != 13) {
        return;
      }
      var rowIndex = this.getRowIndex($e);
      rowIndex += which === 38 ? -1 : 1;
      if (rowIndex < 0 || rowIndex >= this.getNumberOfRows()) {
        return;
      }
      var $row = $e.closest(".js-content-row");
      var $inputs = Trillo.getInputs($row);
      var col = $inputs.index($e);
      $row = this.$e.find('[row="' + rowIndex + '"]'); // new row
      $inputs = Trillo.getInputs($row); // new inputs set
      $e = $($inputs.get(col));
      $e.focus();
    }
  };

  EditableTableView.getRowElemForObj = function(obj) {
    var $el = this.$e.find('.js-content-row');
    var $e = null;
    var rowObj;
    $.each($el, function() {
      rowObj = $(this).data("_row_data_");
      if (rowObj === obj) {
        $e = $(this);
        return false;
      }
    });
    return $e;
  };
})();

/*******************************************************************************
 * Copyright (c) 2015, 2017 Collager Inc.
 *
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *******************************************************************************/
/* globals c3 */
(function() {

  "use strict";

  Trillo.ChartView = Trillo.inherits(Trillo.View, function($e, controller, viewSpec) {
    Trillo.View.call(this, $e, controller, viewSpec);
    this.charts = [];
  });
  
  var ChartView = Trillo.ChartView.prototype;
  var View = Trillo.View.prototype;

  ChartView.render = function() {
    this.controller().updateTitle();
    View.render.call(this);
    // this.createTestData();
    this.renderCharts();
  };

  ChartView.clear = function() {
    View.clear.call(this);
    this.chart = null;
  };

  ChartView.windowResized = function() {
    if (this.cleared) {
      return;
    }
    View.windowResized.call(this);
    for (var i = 0; i < this.charts.length; i++) {
      this.charts[i].resize();
    }
  };

  ChartView.loadPage = function(pageNumber) {
    $.when(this.controller().loadData(pageNumber)).done($.proxy(this.pageLoaded, this));
  };

  ChartView.pageLoaded = function(model) {

  };

  ChartView.renderCharts = function() {
    var vs = this.viewSpec;
    if (!vs.chartSpecs) {
      return;
    }
    this._renderCharts(vs.chartSpecs);
  };

  ChartView._renderCharts = function(chartList) {
    var i;
    this.charts.length = 0;
    for (i = 0; i < chartList.length; i++) {
      this.renderChart(chartList[i]);
    }
  };

  ChartView.renderChart = function(spec) {
    debug.debug("Rendering chart: " + spec.name);
    if (spec.axis && spec.axis.x && spec.axis.x.type === "timeseries" && spec.axis.x.tick) {
      var func = Trillo.getRefByQualifiedName(spec.axis.x.tick);
      if (func) {
        spec.axis.x.tick = func;
      }
    }
    if (spec.type === "pie" || spec.type === "donut" || spec.type === "gauge") {
      this.renderSliceChart(spec);
    } else {
      this.renderXYChart(spec);
    }
  };

  ChartView.renderXYChart = function(spec) {
    var xs = [];
    var ys, name, displayName;
    var columns = [];
    var dt = Trillo.chartDataFromModelData(spec.name, this.getData());
    var xAttr = spec.xAttr;
    var yAttrs = spec.yAttrs;
    var i;

    // initialize x data
    xs.push(xAttr);
    for (i = 0; i < dt.length; i++) {
      if (dt[i][xAttr]) {
        xs.push(dt[i][xAttr]);
      }
    }
    columns.push(xs);

    // initialize y data
    for (i = 0; i < yAttrs.length; i++) {
      name = yAttrs[i];
      displayName = name; // will be retrieved from the property file
      ys = [];
      ys.push(displayName);
      for (var j = 0; j < dt.length; j++) {
        if (typeof dt[j][name] !== "undefined") {
          ys.push(dt[j][name]);
        }
      }
      columns.push(ys);
    }

    var cdata = {
      x : xAttr,
      columns : columns,
      type : spec.type,
      groups : spec.groups
    };
    var coptions = {
      bindto : "#" + this.viewSpec.elemId + " .chart",
      data : cdata,
      axis : spec.axis
    };

    this.updateOptions(coptions, spec);

    coptions.legend = coptions.legend || {
      show : true
    };
    coptions.transition = coptions.transition || {
      duration : 0
    };

    var chart = c3.generate(coptions);

    this.setChartElement(spec, chart);
  };

  ChartView.renderSliceChart = function(spec) {
    var columns = [];
    var dt = Trillo.chartDataFromModelData(spec.name, this.getData());
    var xAttr = spec.xAttr;
    var yAttrs = spec.yAttrs;
    var name, displayName;
    var i, j;
    var ys;
    if (!yAttrs || yAttrs.length === 0) {
      return;
    }

    if (xAttr) {
      // each row corresponds to a slice of pie
      var yAttr = yAttrs[0];
      for (j = 0; j < dt.length; j++) {
        ys = [];
        ys.push(dt[j][xAttr]);
        ys.push(dt[j][yAttr]);
        columns.push(ys);
      }
    } else {
      // slice for a yAttrs[n] is built using value from each row
      for (i = 0; i < yAttrs.length; i++) {
        name = yAttrs[i];
        displayName = name; // will be retrieved from the property file
        ys = [];
        ys.push(displayName);
        for (j = 0; j < dt.length; j++) {
          if (typeof dt[j][name] !== "undefined") {
            ys.push(dt[j][name]);
          }
        }
        columns.push(ys);
      }
    }
    var cdata = {
      columns : columns,
      type : spec.type
    };

    var sliceOption;
    if (spec.label) {
      sliceOption = {
        label : {
          format : function(value, ratio, id) {
            return value + " " + spec.label;
          }
        }
      };
    }

    var coptions = {
      data : cdata
    };

    if (sliceOption) {
      if (spec.type === 'pie') {
        coptions.pie = sliceOption;
      } else if (spec.type === 'donut') {
        coptions.donut = sliceOption;
      } else if (spec.type === 'gauge') {
        coptions.gauge = sliceOption;
      }
    }

    this.updateOptions(coptions, spec);

    var chart = c3.generate(coptions);
    this.setChartElement(spec, chart);
  };

  ChartView.updateOptions = function(opt, specs) {
    var skip = {
      xAttr : true,
      yAttrs : true,
      type : true,
      displayName : true,
      label : true,
      groups : true
    };
    $.each(specs, function(key, value) {
      if (!skip[key]) {
        opt[key] = value;
      }
    });
  };

  ChartView.setChartElement = function(spec, chart) {
    var $ce = $("[nm='" + spec.name + "']", this.$e);
    if ($ce.length === 0) {
      // element in preview mode ...
      $ce = $(".js-chart-cell-preview", this.$e);
    }
    $ce.find('.js-chart')[0].appendChild(chart.element);
    if (spec.displayName) {
      // override one in html
      $ce.find('.js-title').html(spec.displayName ? spec.displayName : "");
    }
    this.charts.push(chart);
  };

  ChartView.createTestData = function() {
    var testData = [];
    var dt = new Date();
    dt.setTime(dt.getTime() - 24 * 60 * 60 * 1000);
    for (var i = 0; i < 10; i++) {

      testData.push({
        timeStamp : dt.getTime(),
        cpuUsage : Math.floor(Math.random() * ((i % 4 === 0 ? 20 : 10))) + 1,
        cpuReady : Math.floor(Math.random() * ((i % 4 === 0 ? 10 : 5))) + 1,
        cpuMhz : Math.floor(Math.random() * ((i % 4 === 0 ? 150 : 600))) + 1,
        memoryMb : Math.floor(Math.random() * ((i % 4 === 0 ? 20 : 100))) + 1,
        memorySwapOut : Math.floor(Math.random() * ((i % 4 === 0 ? 1 : 5))) + 1,
        memorySwapIn : Math.floor(Math.random() * ((i % 4 === 0 ? 1 : 3))) + 1,
        itemName : "Time-" + i
      });
      dt.setTime(dt.getTime() + (30 * 60 * 1000));
    }
    this.model().data = {
      items : testData
    };
  };
})();

/*******************************************************************************
 * Copyright (c) 2015, 2017 Collager Inc.
 *
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *******************************************************************************/
(function() {

  "use strict";

  Trillo.ContentView = Trillo.inherits(Trillo.View, function($e, controller, viewSpec) {
    Trillo.View.call(this, $e, controller, viewSpec);
  });
  
  var ContentView = Trillo.ContentView.prototype;

  ContentView.doInternalRouting = function(routeSpecArr, indexOfNextView) {
    var n = routeSpecArr.length - indexOfNextView;
    if (n < 0) {
      n = 0;
    }
    var forward = 0;
    var $e = this.$e;
    var $foundE = Trillo.findAndSelf($e, '[nm="' + this.name + '"]');
    var internalRoute = "";
    for (var i = 0; i < n; i++) {
      var $t = $e.find('[nm="' + routeSpecArr[indexOfNextView + i].name + '"]');
      if ($t.length > 0) {
        $foundE = $t;
      }
      internalRoute = internalRoute + (i > 0 ? "/" : "") + routeSpecArr[indexOfNextView + i].name;
    }
    this.internalRoute = internalRoute;
    var p = this.parentView();
    if (p && p.viewSpec.type === "toc") {
      $e.find(".js-pointed").remove();
      var $sp = $("<span></span>");
      $sp.addClass(Trillo.CSS.pointed + " js-pointed");
      var $firstChild = $foundE.find(":first-child").filter(":header");
      if ($firstChild.length) {
        $firstChild = $($firstChild[0]);
        $firstChild.prepend($sp);
        var top = parseInt($firstChild.css("height"), 10) / 2;
        $sp.css("top", top);
        p.synchWithRouteState($foundE.dataOrAttr("nm")); // probably not
                                                          // required.
      }
      this.scrollIntoView($foundE);
    } else {
      n = 0;
    }

    return n; // we always consume rest of the path in the content view
  };

  ContentView.scrollIntoView = function($content) {
    var containerTop = this.$e.offset().top;
    var scrollTo = $content.offset().top - containerTop;
    /*
     * The following code enables smooth scrolling. TODO: Provide options in the
     * viewSpec to: enableSmoothScrolling : [true | false]
     * animationDurationPer1000Pixel : 200 etc.
     */
    /*
     * var delta = Math.abs( $(window).scrollTop() - scrollTo); var time =
     * Math.ceil(delta / 1000) * 100; // 100 ms for each 1000px $('html,
     * body').animate({scrollTop: $content.offset().top - containerTop}, time);
     */
    setTimeout(function() {
      $(window).scrollTop(scrollTo);
    }, 0);
    return;
  };

  ContentView.getNextViewName = function(parentPath) {
    return null;
  };
})();
/*******************************************************************************
 * Copyright (c) 2015, 2017 Collager Inc.
 *
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *******************************************************************************/
//TODO refactor common functionality of TocView, TabView and ViewSelectionView 
(function() {

  "use strict";

  Trillo.TocView = Trillo.inherits(Trillo.ViewSelectionView, function($e, controller, viewSpec) {
    Trillo.ViewSelectionView.call(this, $e, controller, viewSpec);
    this.itemCss = ".js-item";
    this.viewSelectedMethod = $.proxy(this.viewSelected, this);
    var $sb = Trillo.findAndSelf(this.$e, ".js-non-native-scrollbar");
    if ($sb.length) {
      this.setNonNativeScrollBar($sb);
    } else {
      this.mouseOverHandler = $.proxy(this.onMouseOver, this);
      this.mouseOutHandler = $.proxy(this.onMouseOut, this);
      this.delayedOnMouseOut = $.proxy(this._onMouseOut, this);
    }
  });
  
  var TocView = Trillo.TocView.prototype;
  var ViewSelectionView = Trillo.ViewSelectionView.prototype;

  TocView.postShow = function(myDeferred) {
    if (this.mouseOverHandler) {
      this.$e.on("mouseover", this.mouseOverHandler);
      this.$e.on("mouseout", this.mouseOutHandler);
    }
    this.updateScrollBar();
    ViewSelectionView.postShow.call(this, myDeferred);
  };

  TocView.clear = function() {
    if (this.mouseOverHandler) {
      this.$e.off("mouseover", this.mouseOverHandler);
      this.$e.off("mouseout", this.mouseOutHandler);
    }
    ViewSelectionView.clear.call(this);
  };

  TocView.getNextViewName = function(parentPath) {
    var $t = this.$e.find(".js-item");
    if ($t.length > 0) {
      return this.viewSpec.getNextPath($t.dataOrAttr("nm"));
    }
    return ViewSelectionView.getNextViewName.call(this, parentPath);
  };

  TocView._getNextViewName = function() {
    return null;
  };

  // since tocView is used with ContentView which may consume multiple paths, we
  // look in backward direction.
  // Also note that the nodes of tocView are not fully qualified path.
  TocView.routingToNextView = function(routeSpecArr, indexOfNextView) {
    var n = routeSpecArr.length;
    for (var i = n - 1; i >= indexOfNextView; i--) {
      // route until routing state update is successful.
      if (this.synchWithRouteState(Trillo.getTriggerFromPath(routeSpecArr[i].name))) {
        break;
      }
    }
  };

  // view selection related method, mixin for NavView and TabView
  TocView.viewSelected = function(ev) {
    Trillo.hideCurrentOverlays(true, true);
    if (ev) {
      ev.stopPropagation();
      ev.preventDefault();
    }
    var $e2 = $(ev.target).closest(this.itemCss);
    var newName = $e2.dataOrAttr("nm");
    if (this.updateItemSelection(newName)) {
      var l = $e2.parents(this.itemCss);
      l = l.map(function() {
        return $(this).dataOrAttr("nm");
      }).get();
      var path;
      if (l.length) {
        // since the parents are collected in the reverse order of path
        l = l.reverse();
        path = l.join("/") + "/" + newName;
      } else {
        path = newName;
      }
      this.postViewSelected(path);
    }
    this.containerVisibilityChanging(true);
  };

  TocView.clearTimeout = function() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  };

  TocView.onMouseOver = function() {
    this.clearTimeout();
    this.$e.find(".js-toc-container").css("overflow", "auto");
  };

  TocView.onMouseOut = function() {
    this.clearTimeout();
    this.timer = setTimeout(this.delayedOnMouseOut, 1000);
  };

  TocView._onMouseOut = function() {
    this.clearTimeout();
    this.$e.find(".js-toc-container").css("overflow", "hidden");
  };
})();
/*******************************************************************************
 * Copyright (c) 2015, 2017 Collager Inc.
 *
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *******************************************************************************/
(function() {

  "use strict";

  Trillo.FlexGridView = Trillo.inherits(Trillo.View, function($e, controller, viewSpec) {
    Trillo.View.call(this, $e, controller, viewSpec);
  });
  
  var FlexGridView = Trillo.FlexGridView.prototype;
  var View = Trillo.View.prototype;

  FlexGridView.setupView = function() {
    var $te, $rows, temp, n;

    var $ge = this.$e.find(".js-flex-grid");
    if ($ge.length === 0) {
      $ge = this.$e;
    } else if ($ge.length > 1) {
      // select first one (others are embedded flex grids)
      $ge = $($ge[0]);
    }
    this.$gridElem = $ge;
    this.gridSpec = {
      $e : $ge,
      id : this.name
    };
    this.specs = [];

    if (this.$c) {
      this.$c.append(this.$e);
    }

    this.lastId = 0;
    this.updateRowSpecs($ge, this.specs);

    this.$iconBar = this.$e.find(".js-flex-grid-iconbar");
    this.$minifyIcon = this.$e.find(".js-flex-minified-icon");
    this.$minifyIcon.remove();
    if (this.$iconBar.children().length === 0) {
      this.$iconBar.addClass("hide");
    }
    this.showHideSpecs = []; // keeps a list of elements which are inside leaf
                              // nodes of spec tree
    this.makeShowHideSpecs(this.specs);

    View.setupView.call(this);
  };

  FlexGridView.updateRowSpecs = function($e, specs) {
    var $te, rowSpec;
    var name = this.name;
    var self = this;
    var $cl = $e.children();
    $cl.each(function() {
      $te = $(this);
      if ($te.hasClass('js-flex-row')) {
        rowSpec = self.makeRowSpec($te, self.gridSpec, "row");
        specs.push(rowSpec);
        self.updateRowChildrenSpecs(rowSpec);
      }
    });
  };

  FlexGridView.updateRowChildrenSpecs = function(rowSpec) {
    var $te, type, spec, $c;
    var cSpecs = [];
    var $cl = rowSpec.$e.children();
    if ($cl.length == 1) {
      // check if the element is auto sized within row
      $c = $($cl[0]);
      if (!$c.hasClass("js-flex-col") && !$c.hasClass("js-flex-cell")) {
        return;
      }
    }
    var self = this;
    $cl.each(function() {
      $te = $(this);
      type = $te.hasClass("js-flex-col") ? "col" : "cell";
      if (type === "col") {
        spec = self.makeColSpec($te, rowSpec, type);
        self.updateColChildrenSpecs(spec);
      } else {
        spec = self.makeCellSpec($te, rowSpec, type);
      }
      cSpecs.push(spec);
    });

    rowSpec.children = cSpecs;
  };

  FlexGridView.updateColChildrenSpecs = function(colSpec) {
    var $te, spec, temp, gap, type;
    var cSpecs = [];
    var $cl = colSpec.$e.children();
    var $c;
    if ($cl.length == 1) {
      // check if the element is auto sized within col
      $c = $($cl[0]);
      if (!$c.hasClass("js-flex-row") && !$c.hasClass("js-flex-cell")) {
        return;
      }
    }
    var self = this;
    $cl.each(function() {
      $te = $(this);
      type = $te.hasClass("js-flex-row") ? "row" : "cell";
      if (type === "row") {
        spec = self.makeRowSpec($te, colSpec, type);
        self.updateRowChildrenSpecs(spec);
      } else {
        spec = self.makeCellSpec($te, colSpec, "cell");
      }
      cSpecs.push(spec);
    });
    colSpec.children = cSpecs;
  };

  FlexGridView.makeBaseSpec = function($te, parent, type) {
    var id;
    id = $te.dataOrAttr("id");
    if (!id) {
      id = parent.id + "." + (++this.lastId);
      $te.attr("id", id);
    }
    var spec = {
      $e : $te,
      id : id,
      type : type,
      flexWidth : true,
      flexHeight : true,
      parent : parent
    };
    /*
     * This is moved to baseView.setupView(); if ($te.dataOrAttr("trigger")) {
     * spec.popover = Trillo.popoverManager.createPopoverForContent($te); }
     */
    return spec;
  };

  FlexGridView.makeRowSpec = function($te, parent, type) {
    var spec = this.makeBaseSpec($te, parent, type);
    this.updateCommonAttributes(spec);
    return spec;
  };

  FlexGridView.makeColSpec = function($te, parent, type) {
    var spec = this.makeBaseSpec($te, parent, type);
    this.updateCommonAttributes(spec);
    return spec;
  };

  FlexGridView.makeCellSpec = function($te, parent, type) {
    var spec = this.makeBaseSpec($te, parent, type);
    if (!$te.hasClass("js-flex-cell")) {
      $te.addClass("js-flex-cell");
    }
    this.updateCommonAttributes(spec);
    return spec;
  };

  FlexGridView.makeShowHideSpecs = function(specs) {
    var cs, i, $el;
    var self = this;
    var showHideSpecFunc = function() {
      var $te = $(this);
      var spec = {};
      var temp = $te.dataOrAttr("show-exp");
      if (temp) {
        spec.showExp = self.parseExp(temp);
      }
      temp = $te.dataOrAttr("hide-exp");
      if (temp) {
        spec.hideExp = self.parseExp(temp);
      }
      if (spec.hideExp || spec.showSpec) {
        spec.$e = $te;
        self.showHideSpecs.push(spec);
      }
    };
    for (i = 0; i < specs.length; i++) {
      cs = specs[i];
      if (!cs.children || cs.children.length === 0) {
        $el = $("[show-exp], [hide-exp]", cs.$e);
        $el.each(showHideSpecFunc);
      } else {
        this.makeShowHideSpecs(cs.children);
      }
    }
  };

  FlexGridView.updateCommonAttributes = function(spec) {
    var w, h, temp;
    var $te = spec.$e;
    this.setMargins(spec, $te);
    this.setPaddings(spec, $te);
    this.setBordersWidth(spec, $te);
    this.setNonContentExtra(spec);
    temp = $te.dataOrAttr("min-width");
    w = temp ? parseInt(temp, 10) : undefined;
    if (!Trillo.isNumeric(w)) {
      w = -1;
    }
    temp = $te.dataOrAttr("min-height");
    h = temp ? parseInt(temp, 10) : undefined;
    if (!Trillo.isNumeric(h)) {
      h = -1;
    }
    spec.inputMinW = w;
    spec.inputMinH = h;

    temp = $te.dataOrAttr("max-width");
    w = temp ? parseInt(temp, 10) : undefined;
    if (!Trillo.isNumeric(w)) {
      w = Number.MAX_VALUE;
    }
    temp = $te.dataOrAttr("max-height");
    h = temp ? parseInt(temp, 10) : undefined;
    if (!Trillo.isNumeric(h)) {
      h = Number.MAX_VALUE;
    }
    spec.inputMaxW = w;
    spec.inputMaxH = h;

    temp = $te.dataOrAttr("flex-width");
    if (temp) {
      temp = temp.toLowerCase();
      spec.flexWidth = !(temp === "false" || temp === "no");
    }

    temp = $te.dataOrAttr("flex-height");
    if (temp) {
      temp = temp.toLowerCase();
      spec.flexHeight = !(temp === "false" || temp === "no");
    }

    temp = $te.dataOrAttr("show-exp");
    if (temp) {
      spec.showExp = this.parseExp(temp);
    }

    temp = $te.dataOrAttr("hide-exp");
    if (temp) {
      spec.hideExp = this.parseExp(temp);
    }

    var dp = $te.css("position");
    dp = dp ? dp.toLowerCase() : "";
    if (dp !== "fixed" && dp !== "absolute") {
      $te.width($te.width()); // so children geometry is not distorted
      $te.height($te.height());
      $te.css("position", "absolute");
    }
  };

  FlexGridView.parseExp = function(exp) {
    if (!exp)
      return null;
    var op = exp.replace(new RegExp('[0-9]', 'g'), '');
    var num = exp.replace(new RegExp('\\D', 'g'), '');
    return {
      op : $.trim(op),
      val : parseInt(num, 10)
    };
  };

  FlexGridView.processShowHideSpecs = function() {
    var cs, d;
    var viewPortW = Trillo.getViewportWidth();
    for (var i = 0; i < this.showHideSpecs.length; i++) {
      cs = this.showHideSpecs[i];
      d = cs.$e.css("display");
      if (cs.showExp) {
        if (this.isTrue(cs.showExp, viewPortW)) {
          if (d === "none") {
            cs.display = "none";
            cs.$e.css("display", "");
          }
        } else if (cs.display === "none") {
          cs.$e.css("display", "none");
          cs.display = "";
        }
      } else if (cs.hideExp) {
        if (this.isTrue(cs.hideExp, viewPortW)) {
          if (d !== "none") {
            cs.display = cs.$e.css("display");
            cs.$e.css("display", "none");
          }
        } else if (cs.display) {
          cs.$e.css("display", cs.display);
          cs.display = null;
        }
      }
    }
  };

  FlexGridView.makeVisibleList = function(specs) {
    var cs, i, hide;
    var vcl = [];
    for (i = 0; i < specs.length; i++) {
      cs = specs[i];
      if (this.isDetached(cs)) {
        continue; // this element is detached from DOM tree (probably added to a
                  // popover)
      } else if (this.isHidden(cs)) {
        cs.$e.css("left", "-10000px");
        continue;
      } else if (cs.showExp || cs.hideExp) {
        if (cs.$e.css("display") === "none") {
          cs.$e.css("display", "");
        }
        if (cs.$e.css("visibility") === "hidden") {
          cs.$e.css("visibility", "visible");
        }
      }
      if (cs.type === "cell" || !cs.children || cs.children.length === 0) {
        cs.$e.css({
          height : ''
        }); // so the its content can flow vertically to fit.
        cs.$e.css({
          width : ''
        });
      }
      if (cs.children) {
        cs.vcl = this.makeVisibleList(cs.children);
        vcl.push(cs);
      } else {
        vcl.push(cs);
      }
    }
    return vcl;
  };

  FlexGridView.isDetached = function(cs) {
    return cs.parent.$e[0] !== cs.$e.parent()[0];
  };

  FlexGridView.isHidden = function(cs) {
    // showExp gets precedence over hideExp (only first one is applicable when
    // both present).
    var viewPortW = Trillo.getViewportWidth();
    if (cs.$e.hasClass("js-container") && cs.$e.children().length === 0) {
      return true;
    }
    if (cs.showExp) {
      if (this.isTrue(cs.showExp, viewPortW)) {
        cs.$e.removeClass("trillo-hidden");
      } else {
        cs.$e.addClass("trillo-hidden");
      }
    } else if (cs.hideExp) {
      if (this.isTrue(cs.hideExp, viewPortW)) {
        cs.$e.addClass("trillo-hidden");
      } else {
        cs.$e.removeClass("trillo-hidden");
      }
    }
    if (cs.hidden || cs.$e.css("display") === "none" || (cs.$e.css("visibility") === "hidden")) {
      return true;
    }
    return false;
  };

  FlexGridView.isTrue = function(exp, ww) {
    var v = exp.val;

    switch (exp.op) {
    case "<=":
      return ww <= v;

    case "<":
      return ww < v;

    case ">=":
      return ww >= v;

    case ">":
      return ww > v;

    default:
      break;
    }
    return false;
  };

  FlexGridView.updateWidths = function(specs) {
    var cs, i;
    for (i = 0; i < specs.length; i++) {
      cs = specs[i];
      if (cs.type === "row") {
        this.updateRowWidths(cs);
        // console.log("R(min/pref): " + cs.minW + " : " + cs.prefW);
      } else if (cs.type === "col") {
        this.updateColWidths(cs);
        // console.log("C(min/pref): " + cs.minW + " : " + cs.prefW);
      } else {
        this.updateCellWidths(cs);
      }
    }
  };

  FlexGridView.updateRowWidths = function(spec) {
    var sl = spec.vcl, cs, i;
    var minW = 0;
    var prefW = 0;
    // first compute children and its dimension based on children
    if (sl && sl.length > 0) {
      this.updateWidths(sl);
      for (i = 0; i < sl.length; i++) {
        cs = sl[i];
        if (cs.minW > minW) {
          minW = cs.minW;
        }
        prefW += cs.prefW;
      }
    } else if (spec.$e.children().length === 1) {
      minW = prefW = this.getMinWidthFormChild(spec);
    }
    if (spec.inputMinW >= 0) {
      // if specified override minW
      minW = spec.inputMinW;
      if (prefW < minW) {
        prefW = minW;
      }
    }
    if (prefW > spec.inputMaxW) {
      prefW = spec.inputMaxW;
    }
    spec.minW = minW + spec.hex;
    spec.prefW = prefW + spec.hex;
  };

  FlexGridView.updateColWidths = function(spec) {
    var sl = spec.vcl, cs, i;
    var minW = 0;
    // first compute children and its dimension based on children
    if (sl && sl.length > 0) {
      this.updateWidths(sl);
      for (i = 0; i < sl.length; i++) {
        cs = sl[i];
        if (cs.minW > minW) {
          minW = cs.minW;
        }
      }
    } else if (spec.$e.children().length === 1) {
      minW = this.getMinWidthFormChild(spec);
    }
    if (spec.inputMinW >= 0) {
      // if specified override minW
      minW = spec.inputMinW;
    }
    spec.minW = spec.prefW = minW + spec.hex;
  };

  FlexGridView.updateCellWidths = function(spec) {
    if (spec.inputMinW < 0) {
      // width of element is a good indicator of proportionate min-width when it
      // is not available.
      spec.prefW = spec.minW = Math.ceil(spec.$e[0].getBoundingClientRect().width) + spec.lm + spec.rm;
    } else {
      spec.prefW = spec.minW = spec.inputMinW;
    }
    if (spec.minW > spec.inputMaxW) {
      spec.prefW = spec.minW = spec.inputMaxW;
    }
  };

  FlexGridView.updateHeights = function(specs) {
    var cs, i;
    for (i = 0; i < specs.length; i++) {
      cs = specs[i];
      if (cs.type === "cell") {
        if (cs.inputMinH < 0) {
          if (cs.$e.children().length === 1) {
            cs.minH = this.getMinHeightFormChild(cs);
          } else {
            cs.minH = cs.$e[0].getBoundingClientRect().height + cs.tm + cs.bm;
          }
        } else {
          cs.minH = cs.inputMinH;
        }
        if (cs.minH > cs.inputMaxH) {
          cs.minH = cs.inputMaxH;
        }
      } else {
        cs.minH = cs.inputMinH;
        if ((!cs.children || cs.children.length === 0) && cs.inputMinH < 0) {
          // this is a row or column without any children, if it
          // has one child element then use it to compute its height.
          if (cs.$e.children().length === 1) {
            cs.minH = this.getMinHeightFormChild(cs);
          }
        }
        if (cs.minH > cs.inputMaxH) {
          cs.minH = cs.inputMaxH;
        }
        if (cs.vcl) {
          this.updateHeights(cs.vcl);
        }
      }
    }
  };

  FlexGridView.getMinWidthFormChild = function(cs) {
    var margins = {};
    this.setMargins(margins, cs.$e);
    return Math.ceil(cs.$e.children()[0].getBoundingClientRect().width + cs.hex + margins.lm + margins.rm);
  };

  FlexGridView.getMinHeightFormChild = function(cs) {
    var margins = {};
    this.setMargins(margins, cs.$e);
    return Math.ceil(cs.$e.children()[0].getBoundingClientRect().height + cs.vex + margins.tm + margins.bm);
  };

  FlexGridView.computeRowsWidth = function(specs, containerWidth) {
    var cs, i, w;
    for (i = 0; i < specs.length; i++) {
      cs = specs[i];
      if (cs.type === "row") {
        w = cs.inputMaxW < Number.MAX_VALUE ? cs.inputMaxW : containerWidth;
        cs.w = w;
        this.computeRowChildrenWidth(cs, w - cs.hex);
      }
    }
  };

  FlexGridView.computeRowChildrenWidth = function(spec, availableWidth) {
    var sl = spec.vcl, cs, i;
    var subRows = [];
    var subRow = {
      w : 0,
      l : []
    };
    var w = 0;
    var newW;
    spec.subRows = subRows;
    if (!sl || spec.minW === 0) {
      return;
    }

    for (i = 0; i < sl.length; i++) {
      cs = sl[i];
      cs.w = cs.minW; // each element of row takes its minimum required space
      newW = w + cs.minW;
      if (this.rowLimit(cs, w, availableWidth)) {
        if (subRow.l.length) {
          // start new sub-row
          subRow.w = w;
          subRows.push(subRow);
          subRow = {
            w : 0,
            l : []
          };
          w = 0;
        }
      }
      w += cs.minW;
      subRow.l.push(cs);
    }
    if (subRow.l.length) {
      // push last sub-row
      subRows.push(subRow);
      subRow.w = w;
    }

    // console.log("Number of rows: " + subRows.length);

    this.distRowExtraToPref(subRows, availableWidth); // distribute extra space
                                                      // to cells with prefW >
                                                      // minW
    if (this.updateOccupancy(subRows, availableWidth)) {
      // cell were adjusted
      // check if preferred width can be updated.
      this.distRowExtraToPref(subRows, availableWidth);
    }
    this.distRowExtraToAll(subRows, availableWidth); // distribute extra space
                                                      // to all cells
                                                      // proportionately

    for (i = 0; i < sl.length; i++) {
      cs = sl[i];
      if (cs.type === "col") {
        this.computeColChildrenWidth(cs);
      }
    }
  };

  FlexGridView.rowLimit = function(spec, filledW, availableW) {
    var newFilled = filledW + spec.minW;
    return newFilled > availableW;
  };

  FlexGridView.computeColChildrenWidth = function(spec) {
    var sl = spec.vcl, cs, i;
    if (!sl) {
      return;
    }
    var availableW = spec.w - spec.hex;
    for (i = 0; i < sl.length; i++) {
      cs = sl[i];
      cs.w = availableW > cs.inputMaxW ? cs.inputMaxW : availableW;
      if (cs.type === "row") {
        if (cs.vsl) {
          this.computeRowsWidth(cs.vcl, cs.w);
        } else {
          cs.subRows = {
            w : 0,
            l : []
          };
        }
      }
    }
  };

  // if a sub-row has more available space then previous,
  // it checks it the cells of previous row can be moved
  // down to make occupancy more equitable.
  FlexGridView.updateOccupancy = function(subRows, availableWidth) {
    var cur, prev, cs;
    var diff;
    var f = false;
    var curExtra, prevExtra;
    for (var i = subRows.length - 1; i >= 1; i--) {
      prev = subRows[i - 1];
      if (prev.l.length <= 1) {
        continue;
      }
      cur = subRows[i];
      curExtra = availableWidth - cur.w;
      prevExtra = availableWidth - prev.w;
      diff = curExtra - prevExtra;
      cs = prev.l[prev.l.length - 1];
      if (diff > cs.w) {
        prev.l.pop();
        prev.w -= cs.w;
        cur.l.unshift(cs);
        cur.w += cs.w;
      }
    }
    if (f) {
      // iterate again
      this.updateOccupancy(subRows, availableWidth);
    }
    return f;
  };

  FlexGridView.distRowExtraToPref = function(subRows, availableWidth) {
    for (var i = 0; i < subRows.length; i++) {
      this._distRowExtraToPref(subRows[i], availableWidth);
    }
  };

  FlexGridView._distRowExtraToPref = function(subRow, availableWidth) {
    var s, i;
    var extra = availableWidth - subRow.w;
    var reqAllW = 0, reqMyW;
    var l = subRow.l;
    if (extra <= 0) {
      return;
    }
    for (i = 0; i < l.length; i++) {
      s = l[i];
      if (s.w < s.prefW) {
        reqAllW += s.prefW - s.w;
      }
    }

    if (reqAllW === 0) {
      return; // preferred and minimum all same for all
    }

    for (i = 0; i < l.length; i++) {
      s = l[i];
      if (s.w < s.prefW) {
        reqMyW = (extra * (s.prefW - s.w)) / reqAllW;
        if (reqMyW > (s.prefW - s.w)) {
          reqMyW = s.prefW - s.w;
        }
        // console.log("Pref - width increment: " + reqMyW);
        s.w += reqMyW; // update width of cell
        subRow.w += reqMyW; // also width of sub row
      }
    }
  };

  FlexGridView.distRowExtraToAll = function(subRows, availableWidth) {
    for (var i = 0; i < subRows.length; i++) {
      this._distRowExtraToAll(subRows[i], availableWidth);
    }
  };

  FlexGridView._distRowExtraToAll = function(subRow, availableWidth) {
    var s, i;
    var extra = availableWidth - subRow.w;
    var reqAllW = 0, reqMyW;
    var l = subRow.l;
    if (extra <= 0 || l.length === 0) {
      return;
    }
    for (i = 0; i < l.length; i++) {
      s = l[i];
      this.updateWidthWeight(s);
      reqAllW += s.ww;
    }
    if (reqAllW === 0) {
      // if flex-width is false of all row
      return;
    }
    var availableAfter = extra;
    for (i = 0; i < l.length; i++) {
      s = l[i];
      reqMyW = (extra * s.ww) / reqAllW;
      if (s.w + reqMyW > s.inputMaxW) {
        reqMyW = s.inputMaxW - s.w;
      }
      // console.log("All - width increment: " + reqMyW);
      s.w += reqMyW; // update width of cell
      subRow.w += reqMyW; // also width of sub row
      availableAfter -= reqMyW;
    }
    if (Math.floor(availableAfter) > 1) {
      if (availableAfter !== extra) {
        // console.log("_distRowExtraToAll(), iterating again, available after:
        // " + availableAfter + "/" + extra);
        this._distRowExtraToAll(subRow, availableWidth);
      }
    } else {
      // console.log("Final row width: " + subRow.w + " / " + availableWidth);
    }
  };

  FlexGridView.updateWidthWeight = function(spec) {
    if (!spec.flexWidth || (spec.w >= spec.inputMaxW)) {
      spec.ww = 0;
    } else {
      spec.ww = spec.w;
    }
  };

  FlexGridView.setNewWidth = function(specs) {
    var cs, i;
    for (i = 0; i < specs.length; i++) {
      cs = specs[i];
      cs.$e.outerWidth(Math.round(cs.w) - cs.lm - cs.rm);
      if (cs.vcl) {
        this.setNewWidth(cs.vcl);
      }
    }
  };

  FlexGridView.computeRowsHeight = function(specs) {
    var i;
    for (i = 0; i < specs.length; i++) {
      this.computeRowHeight(specs[i]);
    }
  };

  FlexGridView.computeRowHeight = function(spec) {
    var i, h;
    h = 0;
    for (i = 0; i < spec.subRows.length; i++) {
      this._computeRowHeight(spec.subRows[i]);
      h += spec.subRows[i].h;
    }
    if (spec.inputMinH > h) {
      h = spec.inputMinH;
    }
    spec.h = h + spec.vex;
    // console.log("Row height: " + h);
  };

  FlexGridView._computeRowHeight = function(subRow) {
    var s, i;
    var l = subRow.l;

    var h = 0;
    for (i = 0; i < l.length; i++) {
      s = l[i];
      if (s.type === "col") {
        this.computeColHeight(s);
      } else {
        s.h = s.minH;
      }
      if (h < s.h) {
        h = s.h;
      }
    }

    for (i = 0; i < l.length; i++) {
      s = l[i];
      if (s.type === "col" && s.h < h) {
        this.distColExtraToAll(s.vcl, s.h - s.vex, h);
      }
      if (h < s.inputMaxH) {
        s.h = h;
      }
    }

    subRow.h = h;
    // console.log("Subrow height: " + h);
  };

  FlexGridView.incrRowHeight = function(spec, incr) {
    var i, h;
    h = 0;
    for (i = 0; i < spec.subRows.length; i++) {
      h += spec.subRows[i].h;
    }
    for (i = 0; i < spec.subRows.length; i++) {
      this._incrRowHeight(spec.subRows[i], (spec.subRows[i].h * incr) / h);
    }
    spec.h += incr;
  };

  FlexGridView._incrRowHeight = function(subRow, incr) {
    var s, i;
    var l = subRow.l;

    var h = 0;
    for (i = 0; i < l.length; i++) {
      s = l[i];
      if (s.type === "col") {
        this.incrColHeight(s, incr);
      } else {
        s.h += incr;
      }
    }
    subRow.h += incr;
  };

  FlexGridView.incrColHeight = function(spec, incr) {
    this.distColExtraToAll(spec.vcl, spec.h - spec.vex, spec.h + incr);
    spec.h += incr;
  };

  FlexGridView.computeColHeight = function(spec) {
    var specs = spec.vcl, cs, i;
    var h = 0;
    if (!specs || specs.length === 0) {
      spec.h = spec.minH >= 0 ? spec.minH : 0;
      return;
    }
    for (i = 0; i < specs.length; i++) {
      cs = specs[i];
      if (cs.type === "row") {
        this.computeRowHeight(cs);
      } else {
        cs.h = cs.minH;
      }
      h += cs.h;
    }
    if (spec.inputMinH > h) {
      h = spec.inputMinH;
    }
    spec.h = h + spec.vex;
    // console.log("Column height: " + h);
  };

  FlexGridView.distColExtraToAll = function(specs, colHeight, availableHeight) {
    var cs, i;
    var extra = availableHeight - colHeight;
    var incr;
    if (extra <= 0 || !specs || specs.length === 0) {
      return;
    }
    for (i = 0; i < specs.length; i++) {
      this.updateHeightWeight(specs[i]);
    }
    var reqAllH = colHeight;
    var availableAfter = extra;
    for (i = 0; i < specs.length; i++) {
      cs = specs[i];
      incr = (extra * cs.wh) / reqAllH;
      if (cs.h + incr > cs.inputMaxH) {
        incr = cs.inputMaxH - cs.h;
      }
      if (incr > 0) {
        colHeight += incr;
        availableAfter -= incr;
        if (cs.type == "row") {
          this.incrRowHeight(cs, incr);
        } else if (cs.type == "col") {
          this.incrColHeight(cs, incr);
        } else {
          cs.h += incr;
        }
      }
      // console.log("Column height change: " + incr);
    }
    if (Math.floor(availableAfter) > 1) {
      // availableAfter === extra means no cell can be updated, don't repeat the
      // call.
      // This happens when few elements are yet to acquire height.
      if (availableAfter !== extra) {
        // console.log("distColExtraToAll(), iterating again, available after: "
        // + availableAfter + "/" + extra);
        this.distColExtraToAll(specs, colHeight, availableHeight);
      }
    }
  };

  FlexGridView.updateHeightWeight = function(spec) {
    if (!spec.flexHeight || (spec.h >= spec.inputMaxH)) {
      spec.wh = 0;
    } else {
      spec.wh = spec.h;
    }
  };

  FlexGridView.positionRows = function(specs) {
    var i, s;
    var gridSpec = this.gridSpec;
    var left = gridSpec.lp + gridSpec.lbw;
    var top = gridSpec.tp + gridSpec.tbw;
    for (i = 0; i < specs.length; i++) {
      s = specs[i];
      s.left = left;
      s.top = top;
      this.positionRow(s);
      top += s.h;
    }
  };

  FlexGridView.positionRow = function(spec) {
    var subRows = spec.subRows;
    var i, j, subRow, left, l, s;
    var top = spec.tp + spec.tbw;
    for (i = 0; i < subRows.length; i++) {
      subRow = subRows[i];
      l = subRow.l;
      left = spec.lp + spec.lbw;
      for (j = 0; j < l.length; j++) {
        s = l[j];
        s.top = top;
        s.left = left;
        left += s.w;
        if (s.vcl) {
          this.positionChildren(s);
        }
      }
      top += subRow.h;
    }
  };

  FlexGridView.positionCol = function(spec) {
    var specs = spec.vcl, cs, i;
    var top = spec.tp + spec.tbw;
    if (!specs) {
      return;
    }
    for (i = 0; i < specs.length; i++) {
      cs = specs[i];
      cs.left = spec.lp + spec.lbw;
      cs.top = top;
      top += cs.h;
      if (cs.vcl) {
        this.positionChildren(cs);
      }
    }
  };

  FlexGridView.positionChildren = function(spec) {
    if (spec.type === "row") {
      this.positionRow(spec);
    } else if (spec.type === "col") {
      this.positionCol(spec);
    }
  };

  FlexGridView.computeGeometry = function() {
    this.processShowHideSpecs();
    var $e = this.$gridElem;
    var vsl = this.makeVisibleList(this.specs);
    var gridSpec = this.gridSpec;
    this.setPaddings(gridSpec, $e);
    this.setMargins(gridSpec, $e);
    this.setBordersWidth(gridSpec, $e);
    this.setNonContentExtra(gridSpec);
    this.updateWidths(vsl);
    this.computeRowsWidth(vsl, $e.width());
    this.setNewWidth(vsl); // set width so height can flow as required by
                            // content (and its css)
    this.updateHeights(vsl);
    this.computeRowsHeight(vsl);
    var gridHeight = 0;
    for (var i = 0; i < vsl.length; i++) {
      gridHeight += vsl[i].h;
    }
    gridHeight = Math.floor(gridHeight);
    if (this.viewSpec.type === "page") {
      var distanceToWindowBottom = $(window).height() - $e.offset().top;
      var availableHeight = $e.parent().height() - gridSpec.vex;
      if (availableHeight > distanceToWindowBottom) {
        availableHeight = distanceToWindowBottom;
      }
      if (gridHeight < availableHeight) {
        this.distColExtraToAll(vsl, gridHeight, availableHeight);
        gridHeight = availableHeight;
      }
    }
    $e.height(gridHeight);

    this.positionRows(vsl);
    return vsl;
  };

  FlexGridView._renderFromSpecs = function(specs) {
    var cs, $te, i;
    var left, top, w, h, offset;
    for (i = 0; i < specs.length; i++) {
      cs = specs[i];
      $te = cs.$e;
      left = Math.round(cs.left);
      top = Math.round(cs.top);
      w = Math.round(cs.w);
      h = Math.round(cs.h);
      if ($te.css("position") === "fixed") {
        offset = $te.parent().offset();
        left += offset.left;
        top += offset.top;
      } else {
        $te.css({
          position : "absolute"
        });
      }
      $te.css({
        left : left + "px",
        top : top + "px"
      });
      $te.outerWidth(w - cs.lm - cs.rm);
      $te.outerHeight(h - cs.tm - cs.bm);
      if (cs.vcl) {
        this._renderFromSpecs(cs.vcl);
      }
    }
  };

  FlexGridView._clipFixedElementHeight = function(specs) {
    var cs, $te, i;
    var top, w, h, offset;
    for (i = 0; i < specs.length; i++) {
      cs = specs[i];
      $te = cs.$e;
      if ($te.css("position") === "fixed") {
        h = Math.round(cs.h);
        offset = $te.parent().offset();
        top = Math.round(cs.top) + offset.top;
        if (top + h > $(window).height()) {
          h = $(window).height() - top;
          $te.outerHeight(h - cs.tm - cs.bm);
        }
      }
      if (cs.vcl) {
        this._clipFixedElementHeight(cs.vcl);
      }
    }
  };

  FlexGridView.render = function() {
    var t1 = (new Date()).getTime();
    var $e = this.$gridElem;
    var vsl = this.computeGeometry();
    if ($e.css("position") === "static") {
      $e.css({
        position : "relative"
      });
    }
    this._renderFromSpecs(vsl);
    this._clipFixedElementHeight(vsl);
    var t2 = (new Date()).getTime();
    View.render.call(this);
    console.log("Total rendering time: " + (t2 - t1));
  };

  FlexGridView.handleMouseDownOnDragHandle = function(dragData) {
    var $e = this.getParentCell(dragData.$target);
    if ($e) {
      var id = $e.dataOrAttr("id");
      var cs = this.specById(id);
      if (cs) {
        dragData.userData = {
          cs : cs,
          initialPos : cs.$e.position(),
          initialWidth : cs.$e.width(),
          initialHeight : cs.$e.height()
        };
        cs.$e.addClass('trillo-dragging');
      }
    }
  };

  FlexGridView.handleMouseMoveOnDragHandle = function(dragData) {
    if (!dragData.userData || !dragData.userData.cs) {
      return;
    }
    if (dragData.$target.hasClass("js-size-handle")) {
      this.resizing(dragData);
    } else if (dragData.$target.hasClass("js-drag-handle")) {
      this.moving(dragData);
    }
  };

  FlexGridView.handleMouseUpOnDragHandle = function(dragData) {
    if (!dragData.userData || !dragData.userData.cs) {
      return;
    }
    if (dragData.$target.hasClass("js-size-handle")) {
      this.resizingDone(dragData);
    } else if (dragData.$target.hasClass("js-drag-handle")) {
      this.moveDone(dragData);
    }
    dragData.userData.cs.$e.removeClass('trillo-dragging');
  };

  FlexGridView.resizing = function(dragData) {
    var cs = dragData.userData.cs;
    var $e = cs.$e;

    $e.height($e.height() + dragData.currentY - dragData.lastY);
    $e.width($e.width() + dragData.currentX - dragData.lastX);
    cs.inputMinW = cs.inputMaxW = Math.ceil(cs.$e[0].getBoundingClientRect().width) + cs.lm + cs.rm;
    cs.inputMinH = cs.inputMaxH = Math.ceil(cs.$e[0].getBoundingClientRect().height) + cs.tm + cs.bm;
  };

  FlexGridView.resizingDone = function($h, dragData) {
    this.windowResized();
  };

  FlexGridView.moving = function(dragData) {
    var cs = dragData.userData.cs;
    var $e = cs.$e;
    var pos = $e.position();
    $e.css({
      top : (pos.top + dragData.currentY - dragData.lastY) + "px",
      left : (pos.left + dragData.currentX - dragData.lastX) + "px"
    });
    this.updateDropTarget(cs, dragData);
  };

  FlexGridView.moveDone = function(dragData) {
    // this.updateDropTarget(dragData.userData.cs, dragData);
    // return;
    var cs = dragData.userData.cs;
    var $e = cs.$e;
    var pos = dragData.userData.initialPos;
    var dropTarget = dragData.userData.dropTarget;
    if (dropTarget && dropTarget.parent) {
      dropTarget.$dte.remove();
      // do drop
      this.repositionTargetSpecAndElem(dragData.userData.cs, dropTarget);
      this.windowResized();
    } else {
      $e.css({
        top : pos.top + "px",
        left : pos.left + "px"
      });
    }
  };

  FlexGridView.updateDropTarget = function(targetCS, dragData) {
    var pos = this._getPos(targetCS); // give orginal position
    pos.left = pos.left + dragData.currentX - dragData.initX;
    pos.top = pos.top + dragData.currentY - dragData.initY;
    var cs = this.getInnermostContainerRowCol(this.specs, pos.left, pos.top);
    var dropTarget = dragData.userData.dropTarget;
    if (cs) {
      if (!dropTarget) {
        dropTarget = dragData.userData.dropTarget = {};
        dropTarget.$dte = $('<div />', {
          "class" : "trillo-drop-target"
        });
      }
      dropTarget.parent = cs;
      dropTarget.cs = this.getContainerCell(cs.vcl, pos.left, pos.top);
      if (dragData.userData.cs === dropTarget.cs) {
        dropTarget.parent = dropTarget.cs = null;
        dropTarget.$dte.remove();
      } else {
        dropTarget.position = this.getDropPosition(dropTarget.parent, dropTarget.cs, pos.left, pos.top);
        this.positionDropTargetElem(dropTarget);
      }
    } else if (dropTarget) {
      dropTarget.parent = dropTarget.cs = null;
      dropTarget.$dte.remove();
    }
  };

  FlexGridView.getInnermostContainerRowCol = function(specs, x, y) {
    var cs, i, cs2;
    for (i = 0; i < specs.length; i++) {
      cs = specs[i];
      if (cs.type === "col" || cs.type === "row") {
        if (this.contains(cs, x, y)) {
          if (cs.vcl) {
            cs2 = this.getInnermostContainerRowCol(cs.vcl, x, y);
            if (cs2) {
              return cs2;
            }
          }
          return cs;
        }
      }
    }
    return null;
  };

  FlexGridView.getContainerCell = function(specs, x, y) {
    var cs, i;
    if (specs) {
      for (i = 0; i < specs.length; i++) {
        cs = specs[i];
        if (this.contains(cs, x, y)) {
          return cs;
        }
      }
    }
    return null;
  };

  FlexGridView.contains = function(cs, x, y) {
    var pos = this._getPos(cs);
    var x1 = pos.left;
    var y1 = pos.top;
    var x2 = x1 + cs.w;
    var y2 = y1 + cs.h;

    return (x >= x1 && x <= x2 && y >= y1 && y <= y2);

  };

  FlexGridView._getPos = function(cs) {
    var p = this.$gridElem.position();
    var left = 0;
    var top = 0;
    while (cs && this.gridSpec !== cs) {
      left += cs.left;
      top += cs.top;
      cs = cs.parent;
    }
    return {
      left : p.left + left,
      top : p.top + top
    };
  };

  FlexGridView.getDropPosition = function(parent, cs, x, y) {
    if (cs) {
      var pos = this._getPos(cs);
      var x1 = pos.left;
      var y1 = pos.top;
      var x2 = x1 + cs.w;
      var y2 = y1 + cs.h;
      if (parent.type === "row") {
        return x - x1 < x2 - x ? "left" : "right";
      } else {
        return y - y1 < y2 - y ? "top" : "bottom";
      }
    }
    return "none";
  };

  FlexGridView.positionDropTargetElem = function(dropTarget) {
    var parent = dropTarget.parent;
    var cs = dropTarget.cs;
    var $e = dropTarget.$dte;
    $e.remove();
    parent.$e.append($e);
    if (cs) {
      var p = dropTarget.position;
      if (p === "left") {
        $e.width("auto");
        $e.height(cs.$e.height());
        $e.css({
          left : cs.left - $e.width() / 2 + "px",
          top : cs.top + cs.tm + "px"
        });
      } else if (p === "right") {
        $e.width("auto");
        $e.height(cs.$e.height());
        $e.css({
          left : cs.left + cs.w - $e.width() / 2 + "px",
          top : cs.top + cs.tm + "px"
        });
      } else if (p === "top") {
        $e.height("auto");
        $e.width(cs.$e.width());
        $e.css({
          left : cs.left + cs.lm + "px",
          top : cs.top - $e.height() / 2 + "px"
        });
      } else if (p === "bottom") {
        $e.height("auto");
        $e.width(cs.$e.width());
        $e.css({
          left : cs.left + cs.lm + "px",
          top : cs.top + cs.h - $e.height() / 2 + "px"
        });
      }
    }
  };

  FlexGridView.repositionTargetSpecAndElem = function(targetCS, dropTarget) {
    var parent = dropTarget.parent;
    var cs = dropTarget.cs;
    var idx = targetCS.parent.vcl.indexOf(targetCS);
    targetCS.parent.vcl.splice(idx, 1);
    idx = targetCS.parent.children.indexOf(targetCS);
    targetCS.parent.children.splice(idx, 1);
    if (!parent.children) {
      parent.children = [];
    }
    if (!parent.vcl) {
      parent.vcl = [];
    }
    if (cs) {
      var p = dropTarget.position;
      var idx1 = parent.vcl.indexOf(cs);
      var idx2 = parent.children.indexOf(cs);
      if (p === "right" || p === "bottom") {
        idx1++;
        idx2++;
        targetCS.$e.insertAfter(cs.$e);
      } else {
        targetCS.$e.insertBefore(cs.$e);
      }
      parent.vcl.splice(idx1, 0, targetCS);
      parent.children.splice(idx2, 0, targetCS);
    } else {
      parent.children.append(targetCS);
      parent.vcl.append(targetCS);
      parent.$e.append(cs.$e);
    }
    targetCS.parent = parent;
  };

  FlexGridView.getParentCell = function($e) {
    var $p = $e.parent();
    while ($p && $p.length) {
      if ($p.hasClass("js-flex-cell")) {
        return $p;
      } else if ($p.hasClass("js-flex-row") || $p.hasClass("js-flex-col")) {
        return null;
      }
      $p = $p.parent();
    }
    return null;
  };

  FlexGridView.minifyContent = function(id) {
    var cs = this.specById(id);
    if (cs) {
      cs.hidden = true;
      cs.top = 0;
      cs.left = 0;
      cs.w = 0;
      cs.h = 0;
      cs.$e.addClass("hide");
      this.addMinifyIcon(cs);
      this.windowResized();
    }
  };

  FlexGridView.specById = function(id) {
    return this._specById(this.specs, id);
  };

  FlexGridView._specById = function(specs, id) {
    var cs;
    for (var i = 0; i < specs.length; i++) {
      cs = specs[i];
      if (cs.id === id) {
        return cs;
      }
      if (cs.children) {
        cs = this._specById(cs.children, id);
        if (cs) {
          return cs;
        }
      }
    }
    return null;
  };

  FlexGridView.addMinifyIcon = function(cs) {
    this.$iconBar.removeClass("hide");
    var $e = this.$minifyIcon.clone(true);
    $e.attr("id", cs.id);
    $e.attr("title", cs.id); // TODO user name
    this.$iconBar.append($e);
    $e.on("click", $.proxy(this.unminifyContent, this));
  };

  FlexGridView.unminifyContent = function(ev) {
    ev.stopPropagation();
    ev.preventDefault();
    var $e = $(ev.target);
    var id = $e.dataOrAttr("id");
    var cs = this.specById(id);
    if (cs) {
      cs.hidden = false;
      cs.$e.removeClass("hide");
      $e.remove();
      this.windowResized();
    }
    if (this.$iconBar.children().length === 0) {
      this.$iconBar.addClass("hide");
    }
  };

  FlexGridView.windowResized = function() {
    if (this.cleared) {
      return;
    }
    this.render();
    View.windowResized.call(this);
  };

  FlexGridView.setMargins = function(spec, $te) {
    spec.lm = parseInt($te.css('margin-left'), 10);
    spec.rm = parseInt($te.css('margin-right'), 10);
    spec.tm = parseInt($te.css('margin-top'), 10);
    spec.bm = parseInt($te.css('margin-bottom'), 10);
  };

  FlexGridView.setPaddings = function(spec, $te) {
    spec.lp = parseInt($te.css('padding-left'), 10);
    spec.rp = parseInt($te.css('padding-right'), 10);
    spec.tp = parseInt($te.css('padding-top'), 10);
    spec.bp = parseInt($te.css('padding-bottom'), 10);
  };

  FlexGridView.setBordersWidth = function(spec, $te) {
    spec.lbw = parseInt($te.css('border-left-width'), 10);
    spec.rbw = parseInt($te.css('border-right-width'), 10);
    spec.tbw = parseInt($te.css('border-top-width'), 10);
    spec.bbw = parseInt($te.css('border-bottom-width'), 10);
  };

  FlexGridView.setNonContentExtra = function(spec) {
    spec.hex = spec.lm + spec.lp + spec.lbw + spec.rm + spec.rp + spec.rbw;
    spec.vex = spec.tm + spec.tp + spec.tbw + spec.bm + spec.bp + spec.bbw;
  };

  FlexGridView.layoutContainers = function() {
    if (this.cleared)
      return;
    this.render();
    View.layoutContainers.call(this);
  };
})();

/*******************************************************************************
 * Copyright (c) 2015, 2016 Collager Inc.
 *
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *******************************************************************************/
(function() {

  "use strict";

  Trillo.DashboardView = Trillo.inherits(Trillo.FlexGridView, function($e, controller, viewSpec) {
    Trillo.FlexGridView.call(this, $e, controller, viewSpec);
  });
})();

/*******************************************************************************
 * Copyright (c) 2015, 2017 Collager Inc.
 *
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *******************************************************************************/
(function() {

  "use strict";

  Trillo.DashboardController = Trillo.inherits(Trillo.Controller, function(viewSpec) {
    Trillo.Controller.call(this, viewSpec);
  });
  
  var DashboardController = Trillo.DashboardController.prototype;
  var Controller = Trillo.Controller.prototype;

  DashboardController.handleAction = function(actionName, selectedObj, $e, targetController) {
    if (actionName === "minify") {
      this.minifyView($e);
      return true;
    }
    return Controller.handleAction.call(this, actionName, selectedObj);
  };

  DashboardController.minifyView = function($e) {
    var $te = $e.closest(".js-flex-cell");
    if (this._view.minifyContent) {
      this._view.minifyContent($te.attr("id"));
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

  Trillo.FileUploadC = Trillo.inherits(Trillo.Controller, function(viewSpec) {
    Trillo.Controller.call(this, viewSpec);
    this.allowedFileTypes = [ 'jpg', 'png', 'gif' ];
    this.allowedFileTypes = viewSpec.params.allowedFileTypes || this.allowedFileTypes;
  });
  
  var FileUploadC = Trillo.FileUploadC.prototype;
  
  FileUploadC.postViewShown = function() {
    var $e = this.$elem();
    var params = this.viewSpec.params || {};
    this.$fileNameE = $e.find('[nm="fileName"]');
    this.$file = $e.find('[nm="file"]');
    this.$file.on("change", $.proxy(this.fileSelected, this));
    $e.find('[nm="uploadFile"]').on("click", $.proxy(this.uploadFile, this));
    $e.find('form').attr("action", params.uploadUrl);
    $.each(params, function(name, value) {
      $e.find('[nm="' + name + '"]').val(value);
    });
    if (!this.fileDDH) {
      this.fileDDH = new Trillo.FileDragDropHandler({
        parent : this,
        $dde : $e.find('.js-file-drag-drop'),
        $pb : $e.find('.js-progress-bar'),
        folder : $e.find('[nm="folder"]').val(),
        className : $e.find('[nm="className"]').val(),
        targetViewName : $e.find('[nm="targetViewName"]').val(),
        url : this.viewSpec.params.uploadUrl
      });
    }
  };
  FileUploadC.fileSelected = function() {
    var s = this.$file.val(), ext = s.split('.').pop(), err = this.allowedFileTypes.indexOf(ext.toLowerCase()) < 0;
    this.$fileNameE.val(err ? "" : s);
    if (err) {
      this.showFileUploadError("Unsupported File Type", "Only '" + this.allowedFileTypes.join()
          + "' files are allowed.");
    } else {
      this.clearFileUploadError();
    }
  };
  FileUploadC.uploadFile = function(ev) {
    if (ev) {
      ev.stopPropagation();
      ev.preventDefault();
    }
    if ($.trim(this.$fileNameE.val()) === "") {
      this.showFileUploadError("Missing File", "Please choose a file from your computer to upload.");
      return;
    }
    this.clearFileUploadError();
    Trillo.fileUploadForm = this;
    this.$elem().find('form')[0].submit();
  };
  FileUploadC.uploadFileCompletedViaXHR = function(data) {
    var target = this.viewByName(data.targetViewName);
    data.__viaxhr = true;
    if (target) {
      target.controller().fileUploadSuccessful(data);
    }
  };
  FileUploadC.postShow = function() {
    Trillo.alert.clear();
  };

  Trillo.FileDragDropHandler = function(options) {
    this.parent = options.parent;
    this.url = options.url;
    this.$pb = options.$pb;
    this.folder = options.folder;
    this.className = options.className;
    this.targetViewName = options.targetViewName;
    var $dde = this.$dde = options.$dde;
    var noop = $.proxy(this.noop, this);
    $dde.on("dragenter", noop, false);
    $dde.on("dragexit", noop, false);
    $dde.on("dragover", noop, false);
    $dde.on("drop", $.proxy(this.dropUpload, this));
  };
  
  var FileDragDropHandler = Trillo.FileDragDropHandler.prototype; 

  FileDragDropHandler.noop = function(event) {
    event.stopPropagation();
    event.preventDefault();
  };

  FileDragDropHandler.dropUpload = function(event) {
    this.noop(event);
    this.$pb.addClass('trillo-upload-pb-notransition');
    this.$pb.width("0%");
    var files = event.originalEvent.dataTransfer.files;
    var self = this;
    setTimeout(function() {
      self.$pb.removeClass('trillo-upload-pb-notransition');
      for (var i = 0; i < files.length; i++) {
        self.upload(files[i]);
      }
    }, 100);
  };

  FileDragDropHandler.upload = function(file) {
    var acceptedTypes = {
      'image/png' : true,
      'image/jpeg' : true,
      'image/gif' : true
    };
    if (!acceptedTypes[file.type]) {
      this.parent.showFileUploadError("Unsupported File Type", "Only '" + this.parent.allowedFileTypes.join()
          + "' files are allowed.");
      return;
    }
    this.parent.clearFileUploadError();
    this.$pb.parent().css("visibility", "visible");
    this.$pb.css("visibility", "visible");
    var formData = new FormData();
    formData.append("xhr", "1");
    formData.append("file", file);
    formData.append("folder", this.folder);
    formData.append("className", this.className);
    formData.append("targetViewName", this.targetViewName);
    var xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", $.proxy(this.uploadProgress, this), false);
    xhr.addEventListener("load", $.proxy(this.uploadComplete, this), false);
    xhr.open("POST", this.url, true); // If async=false, then you'll miss
                                      // progress bar support.
    xhr.send(formData);
  };

  FileDragDropHandler.uploadProgress = function(event) {
    // Note: doesn't work with async=false.
    var progress = Math.round(event.loaded / event.total * 100);
    this.$pb.width(progress + "%");
  };

  FileDragDropHandler.uploadComplete = function(event) {
    var data = $.parseJSON(event.target.responseText);
    if (data.error) {
      this.$pb.width("0%");
      this.parent.fileUploadFailed(data);
    } else {
      this.$pb.width("100%");
      this.parent.uploadFileCompletedViaXHR(data);

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

  Trillo.Popover = function(options) {
    this.options = options;
    this.clickM = $.proxy(this.clicked, this);
    this.clickOutsideM = $.proxy(this.clickedOutside, this);
    this.setup(options);
    this.targetInfo = {};
    this.contentInfo = {};
  };

  var Popover = Trillo.Popover.prototype;
  
  Popover.setup = function(options) {
    var $t, $ta, $c;
    $ta = this.$target = options.$target && options.$target.length ? options.$target : null;
    $c = this.$content = options.$content && options.$content.length ? options.$content : null;
    if (!this.$target) {
      // treat content as target
      $ta = this.$target = this.$content;
      $c = this.$content = null;
    }
    if (!$ta) {
      // nothing to be done
      return;
    }
    $t = this.$trigger = options.$trigger;
    $t.on("click", this.clickM);
    this.contentClass = this._getAttr($t, $ta, $c, "popover-class");

    this.hOffset = this._getNumericAttr($t, $ta, $c, "h-offset");
    this.vOffset = this._getNumericAttr($t, $ta, $c, "v-offset");
    this.alignment = this.getAlignment(this._getAttr($t, $ta, $c, "alignment"));

    this.$anchor = $ta.find(".js-popover-anchor");
    if (this.$anchor.length === 0) {
      this.$anchor = null;
    }
    this.anchorHOffset = this._getNumericAttr($t, $ta, $c, "anchor-h-offset");
    this.anchorVOffset = this._getNumericAttr($t, $ta, $c, "anchor-v-offset");

    this.$close = $ta.find(".js-popover-close");
    if (this.$close.length) {
      this.closeClickM = $.proxy(this.closeClicked, this);
      this.$close.on("click", this.closeClickM);
    }

    this.$contentNext = null;
  };

  Popover.clear = function() {
    this.$trigger.off("click", this.clickM);
    if (this.closeClickM) {
      this.$close.off("click", this.closeClickM);
    }
    $(document).off("click", this.clickOutsideM);
  };

  Popover.clicked = function() {
    if (this.isHidden()) {
      this._show();
    } else {
      this._hide();
    }
  };

  Popover.clickedOutside = function(ev) {
    if (!$.contains(this.$target[0], ev.target)) {
      this.hide();
    }
  };

  Popover.closeClicked = function() {
    this.hide();
  };

  Popover.show = function() {
    if (this.isHidden()) {
      this._show();
    }
  };

  Popover.hide = function() {
    if (!this.isHidden()) {
      this._hide();
    }
  };

  Popover._show = function() {
    if (!this.$target) {
      return;
    }
    Trillo.popoverManager.hideCurrentPopup();
    Trillo.popoverManager.currentPopup = this;
    var $te = this.$trigger;
    var $ta = this.$target;
    var $c = this.$content;
    var $a = this.$anchor;
    var al = this.alignment;
    if ($c) {
      this.$oldParent = $c.parent();
      this.$contentNext = $c.next();
      if (this.contentClass) {
        $c.addClass(this.contentClass);
      }
      $ta.append($c);
    }

    this.saveStylesInfo($ta, this.targetInfo);

    if (this.targetInfo.hasHideClass) {
      $ta.removeClass("hide");
    } else if (this.targetInfo.displayStyle === "none") {
      $ta.show();
    }
    if (this.targetInfo.visibilityStyle === "hidden") {
      $ta.css("visibility", "visible");
    }
    if (this.targetInfo.hasTrilloHiddenClass) {
      $ta.removeClass("trillo-hidden");
    }

    if ($c) {
      this.saveStylesInfo($c, this.contentInfo);
      if (this.contentInfo.hasTrilloHiddenClass) {
        $c.removeClass("trillo-hidden");
      }
    }

    // al null means that no alignment specified and target should not be
    // positioned
    if (al) {
      var pos = this.getPosition($te, $ta, al, this.hOffset, this.vOffset);
      $ta.offset(pos);
      if ($a) {
        var apos = this.getPosition($te, $a, al, this.anchorHOffset, this.anchorVOffset);
        this.adjustPos($ta, $a, pos, apos, al);
        $a.css({
          left : apos.left + "px",
          top : apos.top + "px"
        }); // relative to $ta
        $ta.offset(pos);
      }
    }
    var self = this;
    setTimeout(function() {
      $(document).on("click", self.clickOutsideM);
    }, 0);
  };

  Popover.adjustPos = function($ta, $a, pos, apos, al) {
    // position of target is adjusted.
    // position of anchor is computer relative to target
    var w = $ta.outerWidth();
    var h = $ta.outerHeight();
    var wa = $a.outerWidth();
    var ha = $a.outerHeight();
    if (al.v === "t") {
      pos.top -= ha;
      apos.top = h + ha;
      apos.left -= pos.left;
    } else if (al.v === "b" || al.v === "m") {
      pos.top += ha;
      apos.top = -ha;
      apos.left -= pos.left;
    }
  };

  Popover._hide = function() {
    if (!this.$target) {
      return;
    }
    var $c = this.$content;
    if (this.$oldParent) {
      var $cn = this.$contentNext;
      if ($cn && $cn.length) {
        $c.insertBefore($cn);
      } else {
        this.$oldParent.append($c);
      }
    }
    if ($c && this.contentClass) {
      $c.removeClass(this.contentClass);
    }
    this.restoreStylesInfo(this.$target, this.targetInfo);
    if ($c && this.contentInfo.hasTrilloHiddenClass) {
      $c.addClass("trillo-hidden");
    }
    $(document).off("click", this.clickOutsideM);
  };

  Popover.getPosition = function($t, $e, al, hOffset, vOffset) {
    var offset = $t.offset();
    var w = $t.outerWidth();
    var h = $t.outerHeight();
    var ew = $e.outerWidth();
    var eh = $e.outerHeight();
    var ww = $(window).width();
    var wh = $(window).height();
    console.log(offset, w, h, ew, eh);
    var top = offset.top;
    var left = offset.left;
    if (al.h === "r") {
      left += w - ew;
    } else if (al.h === "c") {
      left += (w - ew) / 2;
    } else {
      if (al.v === "r") {
        left += w;
      } else if (al.v === "l") {
        left -= ew;
      }
    }
    if (al.v === "t") {
      top -= $e.outerHeight();
    } else if (al.v === "b") {
      top += h;
    } else if (al.v === "m") {
      top += h / 2;
    } else {
      if (al.h === "b") {
        top += h;
      } else if (al.h === "m") {
        top += (h - eh) / 2;
      }
    }
    if (al.h === "r" || al.h === "l" || al.h === "c") {
      if (left + ew > ww) {
        left -= ww - (left - ew);
      }
      if (left < 0) {
        left = 0;
      }
    }
    left += hOffset;
    top += vOffset;
    return {
      left : left,
      top : top
    };
  };

  Popover.getAlignment = function(alignment) {
    if (!alignment) {
      alignment = "b-c";
    } else {
      alignment = alignment.toLowerCase();
    }
    if (alignment === "none") {
      return null;
    }
    var arr = alignment.split("-");
    return {
      v : arr[0] ? arr[0] : 'b',
      h : arr[1] ? arr[1] : 'c'
    };
  };

  Popover.isHidden = function() {
    var $ta = this.$target;
    if (!$ta.is(":visible"))
      return true;
    var offset = $ta.offset();
    return offset.left + $ta.outerWidth() < 0 || offset.top + $ta.outerHeight() < 0;
  };

  Popover.saveStylesInfo = function($e, info) {
    info.hasHideClass = $e.hasClass("hide");
    info.displayStyle = $e.css("display");
    info.visibilityStyle = $e.css("visibility");
    info.hasTrilloHiddenClass = $e.hasClass("trillo-hidden");
    info.offset = $e.offset();
  };

  Popover.restoreStylesInfo = function($e, info) {
    if (info.hasHideClass) {
      $e.addClass("hide");
    } else if (info.displayStyle === "none") {
      $e.css("display", "none");
    }
    if (info.visibilityStyle === "hidden") {
      $e.css("visibility", "hidden");
    }
    if (info.hasTrilloHiddenClass) {
      $e.addClass("trillo-hidden");
    }
    if (this.alignment && info.offset) {
      $e.css({
        left : info.offset.left + "px",
        top : info.offset.top + "px"
      });
    }
  };

  Popover._getAttr = function($te, $ta, $c, attrName) {
    // look for attribute in $c followed by $ta and last in $te
    var v;
    if ($c) {
      v = $c.dataOrAttr(attrName);
      if (v)
        return v;
    }
    v = $ta.dataOrAttr(attrName);
    if (v)
      return v;
    return $te.dataOrAttr(attrName);
  };

  Popover._getNumericAttr = function($te, $ta, $c, attrName) {
    var v = parseInt(this._getAttr($te, $ta, $c, attrName), 10);
    if (!Trillo.isNumeric(v)) {
      v = 0;
    }
    return v;
  };

  Trillo.PopoverManager = function() {
    this.currentPopup = null;
    this.popovers = [];
  };
  
  var PopoverManager = Trillo.PopoverManager.prototype;

  PopoverManager.createPopoverForContent = function($c) {
    var t = $c.dataOrAttr("trigger");
    if (t) {
      return this.createPopoverForTrigger($(t), $c);
    }
    return null;
  };

  PopoverManager.createPopoverForTrigger = function($te, $c) {
    var t = $te.dataOrAttr("target");
    var $ta = t ? $(t) : null;
    if (!$c) {
      var c = $te.dataOrAttr("content");
      $c = c ? $(c) : null;
    }
    if (!$ta && $c) {
      t = $c.dataOrAttr("target");
      $ta = t ? $(t) : null;
    }
    if ($ta || $c) {
      return this._createPopover($te, $ta, $c);
    }
    return null;
  };

  PopoverManager._createPopover = function($te, $ta, $c) {
    var popover = new Trillo.Popover({
      $trigger : $te,
      $target : $ta,
      $content : $c
    });
    this.popovers.push(popover);
    return popover;
  };

  PopoverManager.showPopup = function(popup) {
    this.currentPopup = popup;
    popup.show();
  };

  PopoverManager.hideCurrentPopup = function() {
    if (this.currentPopup) {
      this.currentPopup.hide();
    }
  };

  PopoverManager.getPopoverForTrigger = function($te) {
    for (var i = 0; i < this.popovers.length; i++) {
      if (this.popovers[i].$trigger[0] === $te[0]) {
        return this.popovers[i];
      }
    }
  };

  PopoverManager.getPopoverForContent = function($c) {
    for (var i = 0; i < this.popovers.length; i++) {
      if (this.popovers[i].$content) {
        if (this.popovers[i].$content[0] === $c[0]) {
          return this.popovers[i];
        }
      } else if (this.popovers[i].$target && this.popovers[i].$target[0] === $c[0]) {
        return this.popovers[i];
      }
    }
    return null;
  };

  PopoverManager.hasContent = function($te) {
    var p = this.getPopoverForTrigger($te);
    if (p) {
      var $c = p.$content || p.$target;
      if ($c && $c.children(':visible').length > 0) {
        return true;
      }
    }
    return false;
  };

  PopoverManager.contentCleared = function($c) {
    var p = this.getPopoverForContent($c);
    if (p) {
      p.$trigger.addClass("trillo-trigger-has-no-content");
    }
  };

  PopoverManager.contentShown = function($c) {
    var p = this.getPopoverForContent($c);
    if (p) {
      p.$trigger.removeClass("trillo-trigger-has-no-content");
    }
  };

  // hides current popup if $c is contained inside it
  PopoverManager.hideCurrentPopupIfContains = function($c) {
    if (this.currentPopup && $.contains(this.currentPopup.$target[0], $c[0])) {
      this.hideCurrentPopup();
    }
  };
})();