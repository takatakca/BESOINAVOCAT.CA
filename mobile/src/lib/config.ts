// The native app talks to the same portal and the same accounts as the website. Nothing here is secret.
import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as { portalOrigin?: string };

export const PORTAL_ORIGIN = extra.portalOrigin ?? 'https://portail.besoinavocat.ca';
export const SESSION_COOKIE = '__Host-ba_session';
export const LINKS = {
  privacy: `${PORTAL_ORIGIN}/confidentialite`,
  terms: `${PORTAL_ORIGIN}/conditions`,
  deleteAccount: `${PORTAL_ORIGIN}/suppression-compte`,
  help: `${PORTAL_ORIGIN}/aide`,
  web: PORTAL_ORIGIN,
  barreau: 'https://www.barreau.qc.ca/fr/trouver-un-avocat/',
  educaloi: 'https://educaloi.qc.ca/',
};
