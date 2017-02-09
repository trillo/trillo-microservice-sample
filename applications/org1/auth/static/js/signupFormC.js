/* globals auth */

(function() {

  auth.SignupFormC = Trillo.inherits(Trillo.Controller, function(viewSpec) {
    Trillo.Controller.call(this, viewSpec);
  });

  var SignupFormC = auth.SignupFormC.prototype;
  var Controller = Trillo.Controller.prototype;

  SignupFormC.afterPost = function(result, view) {
    if (result.status === "failed") {
      Controller.afterPost.call(this, result);
    } else {
      $(".sign-up-form").addClass("hide");
      $(".sign-up-message").removeClass("hide");
    }
  };
})();