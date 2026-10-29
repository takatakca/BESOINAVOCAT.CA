// besoinavocat.ca static copy: forms built for WordPress (MetForm, Elementor login, password reset) cannot be sent
// without WordPress. Their look is unchanged; on submit, the visitor is taken to the portal instead.
(function () {
  var script = document.currentScript;
  var professional = script && script.getAttribute('data-professional');
  var portal = script && script.getAttribute('data-portal');
  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (!form || !form.closest) return;
    var destination = null;
    if (form.closest('.mf-form-wrapper, .metform-form-content, .elementor-widget-metform')) destination = professional;
    else if (form.closest('.elementor-login, .elementor-widget-login, #lostpasswordform, .elementor-form')) destination = portal;
    if (!destination) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.location.href = destination;
  }, true);
})();
