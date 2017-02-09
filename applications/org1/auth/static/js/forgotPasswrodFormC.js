/* globals auth */

(function() {

  "use strict";
  auth.ForgotPasswordFormC = Trillo.inherits(Trillo.Controller, function(viewSpec) {
    Trillo.Controller.call(this, viewSpec);
  });

  var ForgotPasswordFormC = auth.ForgotPasswordFormC.prototype;
  var Controller = Trillo.Controller.prototype;

  ForgotPasswordFormC.postViewShown = function(view) {
    var p = $.url(location.search).param();
    if (p.re) {
      $(".redo-fotgot-password").removeClass("hide");
    }
  };

  ForgotPasswordFormC.afterPost = function(result, view) {
    if (result.status === "failed") {
      Controller.afterPost.call(this, result);
    } else {
      $(".forgot-password-form").addClass("hide");
      $(".forgot-password-message").removeClass("hide");
    }
  };
})();