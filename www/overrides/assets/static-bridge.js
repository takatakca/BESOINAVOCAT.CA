// The build preserves historical WordPress form labels but makes their container inert.
// Visitors follow the visible portal link before entering information. Never collect or forward old form values.
(function () {
  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (!form || !form.closest) return;
    var archived = form.closest('[data-ba-legacy-form]');
    if (!archived && !form.closest('.mf-form-wrapper, .metform-form-content, .elementor-widget-metform, .elementor-login, .elementor-widget-login, #lostpasswordform, .elementor-form')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    var notice = archived && document.getElementById(archived.getAttribute('aria-describedby'));
    var link = notice && notice.querySelector('a[href]');
    if (link) link.focus();
  }, true);
})();
