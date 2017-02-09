/* globals auth */

(function() {

  "use strict";
  auth.ResetPasswordFormC = Trillo.inherits(Trillo.Controller, function(viewSpec) {
    Trillo.Controller.call(this, viewSpec);
  });

  var ResetPasswordFormC = auth.ResetPasswordFormC.prototype;
  var Controller = Trillo.Controller.prototype;

  ResetPasswordFormC.postProcessModel = function(model) {
    model.data.emailVerifyKey = Trillo.appContext.resetPasswordKey;
  };

  ResetPasswordFormC.afterPost = function(result, view) {
    if (result.status === "failed") {
      Controller.afterPost.call(this, result);
    } else {
      $(".reset-password-form").addClass("hide");
      $(".reset-password-message").removeClass("hide");
    }
  };
})();