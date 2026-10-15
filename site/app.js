import { DOMAINS, REGIONS, buildGuide, findDomains } from "./guide.mjs";

const $ = (selector) => document.querySelector(selector);
const categories = $("#domainGrid");
const form = $("#guideForm");
const result = $("#guideResult");
const region = $("#region");
const notice = $("#formNotice");
let selectedDomain = "";

for (const domain of DOMAINS) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "domain-card";
  card.dataset.domain = domain.id;
  card.setAttribute("aria-pressed", "false");
  card.innerHTML = '<span class="domain-icon" aria-hidden="true"></span><span class="domain-title"></span><span class="domain-short"></span><span class="domain-arrow" aria-hidden="true">↗</span>';
  card.querySelector(".domain-icon").textContent = domain.icon;
  card.querySelector(".domain-title").textContent = domain.title;
  card.querySelector(".domain-short").textContent = domain.short;
  card.addEventListener("click", () => {
    selectedDomain = domain.id;
    for (const button of categories.querySelectorAll("button")) {
      const active = button === card;
      button.setAttribute("aria-pressed", String(active));
      button.classList.toggle("selected", active);
    }
    $("#chosenDomain").textContent = domain.title;
    notice.textContent = "Domaine sélectionné : " + domain.title;
    $("#parcours").scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    region.focus({ preventScroll: true });
  });
  categories.append(card);
}
const searchInput = $("#domainSearch");
const resultCount = $("#domainCount");
const emptyMessage = $("#noDomains");
searchInput.addEventListener("input", () => {
  const matches = new Set(findDomains(searchInput.value).map((domain) => domain.id));
  for (const card of categories.querySelectorAll(".domain-card")) {
    card.hidden = !matches.has(card.dataset.domain);
  }
  resultCount.textContent = matches.size + (matches.size === 1 ? " domaine trouvé" : " domaines trouvés");
  emptyMessage.hidden = matches.size !== 0;
});

for (const name of REGIONS) {
  const option = document.createElement("option");
  option.value = name;
  option.textContent = name;
  region.append(option);
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!selectedDomain) {
    notice.textContent = "Sélectionnez d'abord un domaine de droit dans la liste précédente.";
    $("#domainGrid").scrollIntoView({ behavior: "smooth" });
    categories.querySelector("button")?.focus();
    return;
  }
  try {
    const guide = buildGuide({
      domain: selectedDomain,
      region: region.value,
      urgency: form.elements.urgency.value,
      aid: $("#aide").checked
    });
    result.replaceChildren();
    result.hidden = false;
    result.append(element("p", "eyebrow", "Votre prochaine étape"));
    result.append(element("h3", "result-title", guide.title));
    result.append(element("p", "result-summary", guide.summary));
    const list = element("ol", "result-steps");
    for (const step of guide.steps) list.append(element("li", "", step));
    result.append(list);
    result.append(element("h4", "result-subtitle", "Ressources fiables"));
    const links = element("ul", "resource-list");
    for (const source of guide.resources) {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = source.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = source.label + " ↗";
      item.append(link);
      links.append(item);
    }
    result.append(links);
    result.append(element("p", "result-disclaimer", guide.disclaimer));
    const copy = element("button", "button button-outline", "Copier mon plan");
    copy.type = "button";
    copy.addEventListener("click", async () => {
      const message = [guide.title, guide.summary, ...guide.steps.map((step, i) => (i + 1) + ". " + step), guide.disclaimer].join("\n");
      try {
        await navigator.clipboard.writeText(message);
        copy.textContent = "Plan copié ✓";
      } catch {
        copy.textContent = "Copie indisponible — sélectionnez le texte du plan";
      }
    });
    result.append(copy);
    const print = element("button", "button button-outline print-button", "Imprimer mon plan");
    print.type = "button";
    print.addEventListener("click", () => window.print());
    result.append(print);
    notice.textContent = "Votre plan a été préparé sur cet appareil. Aucune donnée n'a été envoyée.";
    result.scrollIntoView({ behavior: "smooth", block: "start" });
    result.focus({ preventScroll: true });
  } catch (error) {
    notice.textContent = error.message;
    result.hidden = true;
    if (!region.value || !REGIONS.includes(region.value)) region.focus();
  }
});

const menuToggle = $("#menuToggle");
const nav = $("#mainNav");
menuToggle.addEventListener("click", () => {
  const open = menuToggle.getAttribute("aria-expanded") !== "true";
  menuToggle.setAttribute("aria-expanded", String(open));
  nav.classList.toggle("open", open);
});
nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
  nav.classList.remove("open");
  menuToggle.setAttribute("aria-expanded", "false");
}));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    nav.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
  }
});
$("#year").textContent = String(new Date().getFullYear());
