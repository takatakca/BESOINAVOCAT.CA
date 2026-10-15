// Données publiques de navigation. Aucune donnée personnelle n'est traitée.
export const DOMAINS = Object.freeze([
  { id: "famille", title: "Famille et séparation", short: "Séparation, garde, pension alimentaire", icon: "♡", question: "Une démarche familiale ou parentale", tip: "Rassemblez les documents officiels utiles (sans les téléverser ici)." },
  { id: "travail", title: "Travail et emploi", short: "Congédiement, normes du travail, harcèlement", icon: "⌁", question: "Une situation au travail", tip: "Conservez vos dates et les communications pertinentes dans un endroit privé." },
  { id: "logement", title: "Logement et immobilier", short: "Bail, voisinage, copropriété, transaction", icon: "⌂", question: "Un différend concernant un logement ou un immeuble", tip: "Repérez votre bail ou vos contrats avant de consulter un professionnel." },
  { id: "immigration", title: "Immigration", short: "Statut, demande, refus, délai", icon: "◎", question: "Une démarche d'immigration", tip: "Repérez les communications officielles et les échéances applicables." },
  { id: "affaires", title: "Affaires et contrats", short: "Entreprise, contrat, partenariat, litige", icon: "◇", question: "Un dossier commercial ou contractuel", tip: "Listez les parties impliquées pour vérifier les conflits d'intérêts avec le cabinet." },
  { id: "civil", title: "Litiges civils", short: "Créance, responsabilité, consommation", icon: "≋", question: "Un litige civil ou une réclamation", tip: "Conservez les preuves et notez les dates importantes." },
  { id: "penal", title: "Criminel et pénal", short: "Accusation, infraction, comparution", icon: "⚖", question: "Une situation criminelle ou pénale", tip: "En cas d'arrestation ou de détention, demandez immédiatement à parler à un avocat." },
  { id: "successions", title: "Testaments et successions", short: "Héritage, succession, mandat", icon: "✧", question: "Une question successorale", tip: "Repérez les documents pertinents avant votre consultation." }
]);
export const REGIONS = Object.freeze([
  "Montréal", "Laval", "Montérégie", "Capitale-Nationale", "Laurentides",
  "Lanaudière", "Estrie", "Outaouais", "Mauricie", "Centre-du-Québec",
  "Chaudière-Appalaches", "Saguenay–Lac-Saint-Jean", "Bas-Saint-Laurent",
  "Gaspésie–Îles-de-la-Madeleine", "Abitibi-Témiscamingue", "Côte-Nord",
  "Nord-du-Québec", "Partout au Québec"
]);
export const SOURCES = Object.freeze({
  barreau: { label: "Barreau du Québec — Trouver un avocat", url: "https://www.barreau.qc.ca/fr/trouver-un-avocat/" },
  juridiqc: { label: "JuridiQC — Information et ressources", url: "https://www.juridiqc.gouv.qc.ca/" },
  aide: { label: "Commission des services juridiques — Aide juridique", url: "https://www.csj.qc.ca/" },
  urgence: { label: "Barreau du Québec — Besoin d'un avocat", url: "https://www.barreau.qc.ca/fr/grand-public/acces-justice/besoin-avocat/" }
});
// Liens institutionnels par domaine. Ne pas présenter ces organismes comme partenaires.
export const DOMAIN_RESOURCES = Object.freeze({
  famille: Object.freeze([{ label: "JuridiQC — Séparation et divorce", url: "https://www.juridiqc.gouv.qc.ca/separation-et-divorce" }]),
  travail: Object.freeze([{ label: "CNESST — Plaintes et recours", url: "https://www.cnesst.gouv.qc.ca/fr/service-clientele/plaintes-recours" }]),
  logement: Object.freeze([
    { label: "Tribunal administratif du logement", url: "https://www.tal.gouv.qc.ca/fr/" },
    { label: "JuridiQC — Être locataire", url: "https://www.juridiqc.gouv.qc.ca/etre-locataire/bottin-des-ressources" }
  ]),
  immigration: Object.freeze([{ label: "Québec — Guide des procédures d'immigration", url: "https://www.quebec.ca/gouvernement/ministeres-organismes/immigration/publications/guide-procedures-immigration" }]),
  affaires: Object.freeze([]),
  civil: Object.freeze([]),
  penal: Object.freeze([]),
  successions: Object.freeze([])
});

const SEARCH_ALIASES = Object.freeze({
  famille: "divorce enfants garde pension médiation conjoints parent parentalité",
  travail: "salaire licenciement congédiement cnesst harcèlement employeur",
  logement: "loyer bail éviction propriétaire locataire habitation logement",
  immigration: "visa permis résidence citoyenneté refus statut",
  affaires: "commercial entreprise société entrepreneur contrat associé",
  civil: "dommages créance dette litige procès petites créances",
  penal: "criminel infraction arrestation détention contravention amende accusation",
  successions: "testament héritage décès fiducie succession"
});

function normalizeSearch(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr-CA").trim().replace(/\s+/g, " ");
}
export function findDomains(query = "") {
  const words = normalizeSearch(query).split(" ").filter(Boolean);
  if (!words.length) return [...DOMAINS];
  return DOMAINS.filter((domain) => {
    const haystack = normalizeSearch([domain.title, domain.short, SEARCH_ALIASES[domain.id]].join(" "));
    return words.every((word) => haystack.includes(word));
  });
}

export function buildGuide({ domain, region, urgency = "normal", aid = false } = {}) {
  const field = DOMAINS.find((item) => item.id === domain);
  if (!field) throw new Error("Choisissez un domaine de droit.");
  if (!REGIONS.includes(region)) throw new Error("Choisissez une région du Québec.");
  if (!["normal", "soon", "today"].includes(urgency)) throw new Error("Choisissez un niveau d'urgence.");
  const urgent = urgency === "today";
  const steps = [
    "Cherchez un professionnel exerçant en « " + field.title + " » et desservant la région « " + region + " ».",
    "Consultez le répertoire du Barreau et vérifiez le statut de l'avocat ou de l'avocate avant de prendre rendez-vous.",
    field.tip,
    "Au premier contact, vérifiez les disponibilités, les honoraires, le mode de consultation et les éventuels conflits d'intérêts."
  ];
  if (urgent) {
    steps.unshift("Votre situation semble urgente : contactez directement un avocat sans attendre. Un formulaire en ligne ne protège pas vos délais.");
  } else if (urgency === "soon") {
    steps.unshift("Vous avez indiqué une échéance prochaine : prenez contact rapidement et vérifiez les délais applicables.");
  }
  if (aid) {
    steps.push("Renseignez-vous auprès de la Commission des services juridiques sur les conditions d'admissibilité à l'aide juridique.");
  }
  const resources = [SOURCES.barreau, SOURCES.juridiqc, ...(DOMAIN_RESOURCES[domain] ?? [])];
  if (aid) resources.push(SOURCES.aide);
  if (urgent || domain === "penal") resources.push(SOURCES.urgence);
  return {
    title: "Votre plan de recherche",
    summary: field.question + " · " + region + " · " + (urgent ? "Urgent" : urgency === "soon" ? "Bientôt" : "Sans échéance précisée"),
    steps,
    resources,
    disclaimer: "Ce parcours fournit de l'orientation générale, pas un avis juridique ni une mise en relation avec un avocat."
  };
}
