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
    availability: 'connector_pilot', connectionState: 'oauth_in_integrations',
    description: 'La connexion OAuth de votre propre compte Zoom se fait dans Intégrations : création de la réunion d’un rendez-vous, salle d’attente active, sans enregistrement. Aucun frais d’installation n’est fixé.',
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
    version: '2026-10-29.1', checkoutEnabled: false,
    items: ITEMS.map(item => ({ ...item,
      price: { currency: 'CAD', amountCents: null, status: 'unset' },
      canPurchase: false, canConnect: false, caseAccessGranted: false,
    })),
  };
}
