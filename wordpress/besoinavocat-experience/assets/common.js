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
})();
