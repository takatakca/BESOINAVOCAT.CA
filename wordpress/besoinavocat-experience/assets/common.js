'use strict';
(() => {
  const partner = document.querySelector('.elementor-604 [data-id="6f9848c"] a');
  if (partner && ['Become a partner', 'Devenir partenaire'].includes(partner.textContent.trim())) {
    partner.textContent = 'Espace professionnels';
    partner.setAttribute('href', '/professionnels/');
  }
  const contact = (container, className) => {
    if (!container || container.querySelector('.' + className)) return;
    const link = document.createElement('a');
    link.className = className;
    link.href = 'tel:+15148252825';
    link.textContent = '514 825-2825';
    link.setAttribute('aria-label', 'Appeler BesoinAvocat au 514 825-2825');
    container.append(link);
  };
  contact(document.querySelector('.elementor-604 [data-id="19e559e"]'), 'ba-contact-header');
  contact(document.querySelector('.elementor-1850 [data-id="6cbdd18"] > .e-con-inner') || document.querySelector('.elementor-1850 [data-id="6cbdd18"]'), 'ba-contact-footer');
  const policies = new Map([
    ['Conditions d’utilisation des justiciables', '/conditions-dutilisation-des-justiciables/'],
    ['Conditions d’utilisation des professionnels', '/conditions-dutilisation-des-professionnels/'],
    ['Politique de confidentialité', '/politique-de-confidentialite/']
  ]);
  document.querySelectorAll('.elementor-1850 [data-id="69fc55c"] small').forEach((label) => {
    const path = policies.get(label.textContent.trim());
    if (!path || label.querySelector('a')) return;
    const link = document.createElement('a');
    link.href = path;
    while (label.firstChild) link.append(label.firstChild);
    label.append(link);
  });
  // Elementor popup 1839 ("Trouver mon avocat") is shown on every page except /demande/.
  // It is not a modal dialog for the visitor: on the home page it sits after the footer
  // (since 0.2.1), elsewhere in a fixed corner. Elementor still runs its modal behaviour:
  // it focuses the button 250 ms after opening (on the home page this scrolls to the end
  // of the page), loops Tab on that single button, and keeps aria-modal. Only these
  // behaviours are neutralised, for this popup only; its content, link and position are unchanged.
  const ctaPopup = '#elementor-popup-modal-1839';
  window.addEventListener('elementor/popup/show', (event) => {
    if (String(event.detail && event.detail.id) !== '1839') return;
    const popup = document.querySelector(ctaPopup);
    if (!popup) return;
    // Elementor calls element.focus() from a timer; keyboard navigation does not use it.
    popup.querySelectorAll('[data-elementor-type="popup"], a[href], button, input, select, textarea, [tabindex]').forEach((element) => {
      element.focus = () => {};
    });
    setTimeout(() => {
      // Without focusable content Elementor sets tabindex="0" and blocks every Tab key.
      const wrapper = popup.querySelector('[data-elementor-type="popup"][tabindex="0"]');
      if (wrapper) wrapper.removeAttribute('tabindex');
      popup.removeAttribute('aria-modal');
      popup.removeAttribute('tabindex');
    }, 0);
  });
  document.addEventListener('keydown', (event) => {
    const active = document.activeElement;
    if (event.key === 'Tab' && active && active.closest && active.closest(ctaPopup)) event.stopPropagation();
  });
})();
