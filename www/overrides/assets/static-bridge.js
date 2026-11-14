// The WordPress forms need WordPress to receive them. The build keeps the forms and sends no value anywhere:
//  - legal style (data-ba-legacy-form): the form is inert, its notice links to the portal;
//  - exact copy (data-mode="exact", D-032): the form is as on WordPress and its submission opens the portal, with nothing from the form.
(function () {
  var tag = document.currentScript || (document.querySelector ? document.querySelector('script[src*="static-bridge.js"]') : null);
  var exact = !!tag && tag.getAttribute('data-mode') === 'exact';
  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (!form || !form.closest) return;
    var archived = form.closest('[data-ba-legacy-form]');
    var metform = form.closest('.mf-form-wrapper, .metform-form-content, .elementor-widget-metform');
    if (!archived && !metform && !form.closest('.elementor-login, .elementor-widget-login, #lostpasswordform, .elementor-form')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (exact) {
      var url = metform ? tag.getAttribute('data-professional') : tag.getAttribute('data-portal');
      if (url) window.location.href = url;
      return;
    }
    var notice = archived && document.getElementById(archived.getAttribute('aria-describedby'));
    var link = notice && notice.querySelector('a[href]');
    if (link) link.focus();
  }, true);
})();
