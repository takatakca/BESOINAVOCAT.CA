// On WordPress, CookieAdmin Pro saved each choice through wp-admin/admin-ajax.php and only then wrote the visitor's
// consent cookie. The copy has no server code, so that request failed: the banner closed but the choice was never
// kept, and the banner came back on every page. The choice is now written straight to the visitor's own consent
// cookie, as the free CookieAdmin does. Nothing is sent to any server.
(function () {
  if (typeof window.cookieadmin_save_consent_cookie !== 'function') return;
  window.cookieadmin_pro_set_consent = function (preference, days) {
    var id = '';
    try { id = window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : ''; } catch (e) { id = ''; }
    window.cookieadmin_save_consent_cookie(preference, days, id || String(Date.now()));
    if (typeof window.cookieadmin_pro_enable_blocked_content === 'function') window.cookieadmin_pro_enable_blocked_content(preference);
    return true;
  };
})();
