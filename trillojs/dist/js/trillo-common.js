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

  Trillo.EntityAdapter = Trillo.inherits(Trillo.ApiAdapter, function(apiSpec, controller) {
    Trillo.ApiAdapter.call(this, apiSpec, controller);
  });
  
  var EntityAdapter = Trillo.EntityAdapter.prototype;

  EntityAdapter.isApiSpecChanged = function(apiSpec) {
    var data = this.model().data;
    return !data || (data.uid !== this.model().getContextUid());
  };

  EntityAdapter.getObserverOptions = function(data) {
    if (data && data.uid) {
      return {
        cls : Trillo.uidToClass(data.uid)
      };
    }
    return null;
  };

  EntityAdapter.loadData = function() {
    var deferred = $.Deferred();
    var d1;

    var uid = this.model().getContextUid();

    if (!uid) {
      Trillo.log
          .warning("Entity model does not specify object uid which is required to retrieve uid, returning empty data");
      deferred.resolve({});
      return deferred.promise();
    }

    if (this.apiSpec.options && this.apiSpec.options.detailClass) {
      d1 = $.Deferred();
      $.ajax({
        url : "/_service/entity?uid=" + uid,
        type : 'get'
      }).done(function(data) {
        d1.resolve(data);
      }).fail(function() {
        d1.reject({
          errorMsg : "Failed to load entity"
        });
      });
      var d2 = $.Deferred();
      $.ajax({
        url : "/_service/entityDetail?uid=" + this.apiSpec.options.detailClass + "." + Trillo.uidToId(uid),
        type : 'get'
      }).done(function(data2) {
        d2.resolve(data2);
      }).fail(function() {
        d2.reject({
          errorMsg : "Failed to entity details"
        });
      });
      $.when(d1.promise(), d2.promise()).done($.proxy(this.dataLoaded, this, deferred)).fail(function() {
        deferred.reject({
          errorMsg : "Failed to load model"
        });
      });
    } else {
      d1 = $.Deferred();
      $.ajax({
        url : "/_service/entity?uid=" + uid,
        type : 'get'
      }).done(function(data) {
        d1.resolve(data);
      });
      d1.promise().done($.proxy(this.dataLoaded, this, deferred)).fail(function() {
        deferred.reject({
          errorMsg : "Failed to load model"
        });
      });
    }

    return deferred.promise();
  };

  EntityAdapter.dataLoaded = function(deferred, data, data2) {
    data = $.extend(data, data2);
    deferred.resolve(data);
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

  Trillo.PaginationAdapter = Trillo.inherits(Trillo.ApiAdapter, function(apiSpec, controller) {
    Trillo.ApiAdapter.call(this, apiSpec, controller);
    this.lastPageNumberParam = -1;
    this.lastPageRequestStr = null;
  });
  
  var PaginationAdapter = Trillo.PaginationAdapter.prototype;

  PaginationAdapter.isApiSpecChanged = function(apiSpec) {
    var str = Trillo.stringify(this.getPageRquest(this.lastPageNumberParam));
    return this.lastPageRequestStr !== str;
  };

  PaginationAdapter.getPageRquest = function(pageNumber) {
    var apiSpec = this.apiSpec;
    var req = {};
    req.pageNumber = typeof pageNumber === "undefined" ? 1 : pageNumber;
    req.cls = apiSpec.cls;
    if (apiSpec.filter) {
      req.filter = Mustache.render(apiSpec.filter, this.model().getDataReferences());
    } else {
      req.filter = "";
    }
    req.searchFilter = apiSpec.searchFilter; // null is OK
    req.searchPhrase = apiSpec.searchPhrase || "";
    req.orderBy = apiSpec.orderBy || "";
    req.pageSize = apiSpec.pageSize || 32;
    req.assocName = apiSpec.assocName;
    if (!req.filter) {
      req.assocUid = this.model().getContextUid();
    }
    return req;
  };

  PaginationAdapter.getObserverOptions = function(data) {
    return {
      cls : this.apiSpec.cls
    };
  };

  PaginationAdapter.loadData = function(pageNumber, requireClearing) {
    var deferred = $.Deferred();
    var pageRequest = this.getPageRquest(pageNumber);
    this.lastPageNumberParam = pageNumber;
    this.lastPageRequestStr = Trillo.stringify(pageRequest);
    $.ajax({
      url : "/_service/page",
      type : 'post',
      data : this.lastPageRequestStr,
      contentType : "application/json",
      datatype : "application/json"
    }).done($.proxy(this.dataLoaded, this, deferred, requireClearing)).fail(function() {
      deferred.reject({
        errorMsg : "Failed to load model"
      });
    });

    return deferred.promise();
  };

  PaginationAdapter.dataLoaded = function(deferred, requireClearing, data) {
    deferred.resolve(data, !!data.items, requireClearing);
  };

  PaginationAdapter.setOrderBy = function(orderBy) {
    this.apiSpec.orderBy = orderBy;
  };
})();

/*******************************************************************************
 * Copyright (c) 2015, 2017 Collager Inc.
 *
 * Licensed under MIT (https://opensource.org/licenses/MIT)
 *******************************************************************************/
(function() {

  "use strict";

  Trillo.TreeAdapter = Trillo.inherits(Trillo.ApiAdapter, function(apiSpec, controller) {
    Trillo.ApiAdapter.call(this, apiSpec, controller);
  });
  
  var TreeAdapter = Trillo.TreeAdapter.prototype;

  TreeAdapter.loadData = function() {
    var deferred = $.Deferred();
    $.ajax({
      url : "/_service/tree?" + ("name=" + this.controller().view().name),
      type : 'get'
    }).done($.proxy(this.treeLoaded, this, deferred));
    return deferred.promise();
  };

  TreeAdapter.getObserverOptions = function(data) {
    if (data && data.uid) {
      return {
        uid : data.uid
      };
    } else {
      return {
        cls : "Tree"
      };
    }
  };

  TreeAdapter.treeLoaded = function(deferred, data) {
    deferred.resolve(data);
  };

  TreeAdapter.treeLoaded2 = function(data) {
    this._controller.dataAvailable(data);
    this.triggerModelDataChanged();
  };
  
  // in order to handle empty tree case, we need to do special processing.
  // In case of an empty tree, the observer is registered with cls="Tree".
  // When we receive the event, we check if the name of the tree matches with
  // the
  // "name' passed in the option. If it does then, we reinitialize the model.
  TreeAdapter.receivedNotifications = function(obj) {
    if (this.model().data.uid === obj.uid || this.model().data.name === obj.name) {
      // tree we are observing changed.
      // fetch it again.
      this.model().clearObserver(); // clear observer so we can recreate them
                                    // with uid after data is loaded.
      $.ajax({
        url : "/_service/tree?" + ("name=" + this.controller().view().name),
        type : 'get'
      }).done($.proxy(this.treeLoaded2, this));

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

  Trillo.SearchHandler = function(ctx) {
    this.searchBoxSelector = '.js-search';
    this.searchTextSelector = '.js-search-textbox';
    this.searchActionSelector = '.js-search-action';

    var $e = $(this.searchBoxSelector);
    if ($e.length === 0) {
      return;
    }
    this.setContext(ctx);
    this.cls = "VMPhraseSuggester";
    if (Trillo.isTouchSurface) {
      $(this.searchTextSelector).attr("touchsurface", "yes");
    }
    var $th = $(this.searchTextSelector).typeahead([ {
      name : 'query1',
      remote : {
        url : '/_search/suggest?cls=' + this.cls + '&q=%QUERY',
        maxParallelRequests : 1,
        cache : false
      },
      valueKey : 'v',
      limit : 5
    } ]).on('typeahead:enterPressed typeahead:selected', $.proxy(this.searchPhraseAvailable, this));
    this.$typeahead = $th;
    $(this.searchActionSelector).on("click", $.proxy(this.searchActionClicked, this));

  };
  
  var SearchHandler = Trillo.SearchHandler.prototype;

  SearchHandler.setDataSetEnabled = function(name, f) {
    this.$typeahead.typeahead('setDataSetEnabled', name, f);
  };

  SearchHandler.searchActionClicked = function(ev) {
    if (ev) {
      ev.stopPropagation();
      ev.preventDefault();
    }
    this.searchPhraseAvailable();
  };

  SearchHandler.searchPhraseAvailable = function(ev, value, datum, dataset) {
    if (!this.context) {
      return;
    }
    value = $.trim($(this.searchTextSelector).val());
    this.context.searchPhraseAvailable(ev, value, datum, dataset);
  };

  SearchHandler.setContext = function(ctx, cls) {
    if (this.context) {
      this.context.searchHandler = null;
    }
    this.cls = cls;
    this.context = ctx;
    var $e = $(this.searchBoxSelector);
    if (this.context) {
      this.context.searchHandler = this;
      // $e.show();
    } else {
      $e.hide();
    }
  };
})();
