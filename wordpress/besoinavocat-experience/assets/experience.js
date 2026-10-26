'use strict';

(() => {
  const front = document.body.classList.contains('ba-experience-front');
  const home = document.querySelector('.elementor-13');
  const additions = document.getElementById('ba-experience-additions');
  if (front && home && additions) {
    const hero = home.querySelector('[data-id="6f536fd"]');
    const header = document.querySelector('.elementor-604 [data-id="19e559e"]');
    const navigation = additions.querySelector('[data-ba-slot="navigation"]');
    const card = additions.querySelector('[data-ba-slot="hero-card"]');
    const client = additions.querySelector('[data-ba-slot="client-offer"]');
    const offers = additions.querySelector('[data-ba-slot="professional-offers"]');
    // Only new plugin blocks are moved. Header and footer enhancements are handled separately on every page.
    if (navigation && header) header.append(navigation);
    if (hero) {
      if (!hero.id) hero.id = 'ba-accueil';
      if (!hero.querySelector('.ba-hero-eyebrow')) {
        const eyebrow = document.createElement('p');
        eyebrow.className = 'ba-hero-eyebrow ba-component';
        eyebrow.textContent = 'VOTRE PROCHAINE ÉTAPE COMMENCE ICI';
        hero.prepend(eyebrow);
      }
      if (card) hero.append(card);
      const title = hero.querySelector('[data-id="f3d3b1a"] .elementor-heading-title');
      if (title) title.setAttribute('aria-level', '1');

    }
    const process = home.querySelector('[data-id="5f7bbe5"]');
    if (client && process) process.after(client);
    else if (client && hero) hero.after(client);
    const professionals = home.querySelector('[data-id="02728d6"]');
    if (offers && professionals) professionals.after(offers);
    // Add useful anchors without changing a single existing domain or region link.
    const domains = document.querySelector('.elementor-1850 [data-id="6298a30"]');
    const regions = document.querySelector('.elementor-1850 [data-id="f2cc2da"]');
    if (domains && !domains.id) domains.id = 'ba-domaines';
    if (regions && !regions.id) regions.id = 'ba-regions';
    if (hero && !home.querySelector('.ba-quick-links')) {
      const bar = document.createElement('nav');
      bar.className = 'ba-quick-links ba-component';
      bar.setAttribute('aria-label', 'Accès aux ressources de la page');
      const entries = [['Des repères pour avancer', null], ['Domaines de droit', domains ? '#ba-domaines' : null], ['Avocats par région', regions ? '#ba-regions' : null], ['Le futur tableau de bord', client ? '#ba-tableau-apercu' : null]];
      entries.forEach(([text, href], i) => {
        if (i && !href) return;
        const element = document.createElement(href ? 'a' : 'span');
        if (href) element.href = href;
        element.textContent = text;
        bar.append(element);
      });
      hero.after(bar);
    }
    document.body.classList.add('ba-experience-ready');
  }

  document.querySelectorAll('.ba-menu-toggle').forEach((button) => {
    const menu = document.getElementById(button.getAttribute('aria-controls'));
    if (!menu) return;
    button.addEventListener('click', () => {
      const open = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(open));
      menu.classList.toggle('ba-menu-open', open);
    });
    button.parentElement.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        button.setAttribute('aria-expanded', 'false');
        menu.classList.remove('ba-menu-open');
        button.focus();
      }
    });
    menu.addEventListener('click', (event) => {
      if (event.target.closest('a')) {
        button.setAttribute('aria-expanded', 'false');
        menu.classList.remove('ba-menu-open');
      }
    });
  });

  document.querySelectorAll('.ba-demo-tabs').forEach((tablist) => {
    const tabs = Array.from(tablist.querySelectorAll('[data-ba-tab]'));
    const select = (tab, moveFocus) => {
      tabs.forEach((item) => {
        const active = item === tab;
        item.setAttribute('aria-selected', String(active));
        item.tabIndex = active ? 0 : -1;
        const panel = document.getElementById(item.getAttribute('aria-controls'));
        if (panel) panel.hidden = !active;
      });
      if (moveFocus) tab.focus();
    };
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => select(tab, false));
      tab.addEventListener('keydown', (event) => {
        let target = null;
        if (event.key === 'ArrowRight') target = tabs[(index + 1) % tabs.length];
        if (event.key === 'ArrowLeft') target = tabs[(index + tabs.length - 1) % tabs.length];
        if (event.key === 'Home') target = tabs[0];
        if (event.key === 'End') target = tabs[tabs.length - 1];
        if (target) { event.preventDefault(); select(target, true); }
      });
    });
  });
})();
