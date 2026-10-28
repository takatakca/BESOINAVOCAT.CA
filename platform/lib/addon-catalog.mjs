// Public descriptions for an authenticated catalogue. No account identifiers,
// credentials, Checkout sessions or entitlement mutations belong here.
const ITEMS = [
  {
    id: 'internal_chat', label: 'Messagerie du dossier', kind: 'internal_service',
    availability: 'available_pilot', connectionState: 'internal',
    description: 'Échanges écrits entre les membres autorisés du dossier dans le pilote. Aucun service externe à connecter.',
  },
  {
    id: 'zoom', label: 'Zoom', kind: 'external_connector',
    availability: 'external_link_only', connectionState: 'oauth_planned',
    description: 'Ajout d’un lien de participation Zoom existant. La connexion OAuth et la création de réunions par API restent à réaliser.',
  },
  {
    id: 'phone', label: 'Téléphone intégré', kind: 'external_connector',
    availability: 'planned', connectionState: 'provider_not_connected',
    description: 'Appels dans l’application à préparer. Le chronomètre manuel ne déclenche pas d’appel téléphonique.',
  },
];

// Fresh nested values prevent a caller from accidentally publishing another
// caller's mutation as a price or an enabled payment/install capability.
export function publicAddonCatalog() {
  return {
    version: '2026-10-28.1', checkoutEnabled: false,
    items: ITEMS.map(item => ({ ...item,
      price: { currency: 'CAD', amountCents: null, status: 'unset' },
      canPurchase: false, canConnect: false, caseAccessGranted: false,
    })),
  };
}
