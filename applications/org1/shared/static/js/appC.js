/* globals Shared */

(function() {

  Shared.AppC = Trillo.inherits(Trillo.Controller, function(viewSpec) {
    Trillo.Controller.call(this, viewSpec);
  });

  var AppC = Shared.AppC.prototype;
  var Controller = Trillo.Controller.prototype;

  AppC.handleAction = function(actionName, selectedObj) {
    var formName = null;
    var data = null;
    var postUrl = null;
    if (actionName === "myProfile") {
      formName = "MyProfileForm";
      postUrl = "/_service/um/editUser";
      data = Trillo.appContext.user;
    } else if (actionName === "changeMyPassword") {
      formName = "PasswordForm";
      postUrl = "/_service/um/changePassword";
      data = Trillo.appContext.user;
    }
    if (formName) {
      this.showView({
        name : formName,
        postUrl : postUrl,
        type : Trillo.ViewType.Form,
        container : 'trillo-dialog-container',
        modelSpec : {
          data : data
        }
      });
      return true;
    }
    return Controller.handleAction.call(this, actionName, selectedObj);
  };
})();