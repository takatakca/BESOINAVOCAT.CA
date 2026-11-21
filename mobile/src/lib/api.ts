// Client for the BesoinAvocat portal API (platform/server.mjs). The app uses the same browser-session login as the
// website: the portal answers the email-code verification with a session cookie. The app keeps that cookie in the
// phone's secure storage (Keychain / Keystore) and presents it with the two headers the portal requires for any
// change (Origin + X-Requested-With, lib/browser-session.mjs assertBrowserMutation). No server change is needed.
import * as SecureStore from 'expo-secure-store';
import { File } from 'expo-file-system';
import { PORTAL_ORIGIN, SESSION_COOKIE } from './config';
import { sessionFromSetCookie } from './cookie';
import type * as T from './types';

const TOKEN_KEY = 'ba.session.v1';
let token: string | null = null;
let onUnauthorized: (() => void) | null = null;

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// Visual preview with fictitious data (src/lib/demo.ts), never on in a store build.
export const DEMO = process.env.EXPO_PUBLIC_DEMO === '1';

export async function loadSession(): Promise<string | null> {
  if (DEMO) { token = 'demo'; return token; }
  token = await SecureStore.getItemAsync(TOKEN_KEY).catch(() => null);
  return token;
}
export async function saveSession(value: string | null) {
  token = value;
  if (value) await SecureStore.setItemAsync(TOKEN_KEY, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  else await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => undefined);
}
export const hasSession = () => Boolean(token);
export function setUnauthorizedHandler(handler: (() => void) | null) { onUnauthorized = handler; }

function baseHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json', Origin: PORTAL_ORIGIN, 'X-Requested-With': 'XMLHttpRequest' };
  if (token) headers.Cookie = `${SESSION_COOKIE}=${token}`;
  return headers;
}

async function request<R>(method: string, path: string, body?: unknown, extra?: { headers?: Record<string, string>; timeoutMs?: number }): Promise<R> {
  const headers = { ...baseHeaders(), ...(extra?.headers ?? {}) };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), extra?.timeoutMs ?? 30000);
  let response: Response;
  try {
    response = await fetch(`${PORTAL_ORIGIN}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), credentials: 'omit', signal: controller.signal });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Connexion impossible. Vérifiez votre accès Internet et réessayez.');
  } finally {
    clearTimeout(timer);
  }
  const fresh = sessionFromSetCookie(response.headers.get('set-cookie'));
  if (fresh !== undefined) await saveSession(fresh);
  const text = await response.text();
  let data: any = null;
  if (text) { try { data = JSON.parse(text); } catch { data = null; } }
  if (!response.ok) {
    const code = data?.error?.code ?? data?.code ?? `HTTP_${response.status}`;
    const message = data?.error?.message ?? data?.message ?? messageFor(response.status);
    if (response.status === 401 && token) { await saveSession(null); onUnauthorized?.(); }
    throw new ApiError(response.status, code, message);
  }
  return data as R;
}

function messageFor(status: number) {
  if (status === 401) return 'Votre session a expiré. Reconnectez-vous.';
  if (status === 402) return 'Cette action dépasse votre forfait actuel.';
  if (status === 403) return 'Action non autorisée pour ce compte.';
  if (status === 404) return 'Élément introuvable.';
  if (status === 413) return 'Le fichier est trop volumineux.';
  if (status === 429) return 'Trop de tentatives. Réessayez dans un instant.';
  if (status >= 500) return 'Le service est momentanément indisponible.';
  return 'La demande n’a pas abouti.';
}

const enc = encodeURIComponent;

export const api = {
  health: () => request<T.Health>('GET', '/api/health'),
  pricing: () => request<T.Pricing>('GET', '/api/pricing'),

  // Sign-in and sign-up by email code (the account lives with the identity provider behind the portal).
  requestCode: (email: string) => request<{ sent?: boolean }>('POST', '/api/auth/email/request', { email }),
  verifyCode: (email: string, code: string) => request<{ user: T.User; expiresAt: string }>('POST', '/api/auth/email/verify', { email, code }),
  clientSignup: (email: string, name: string) => request<{ sent?: boolean }>('POST', '/api/auth/client/signup', { email, name, consent: true }),
  clientVerify: (email: string, code: string) => request<{ user: T.User; created: boolean }>('POST', '/api/auth/client/verify', { email, code }),
  logout: async () => {
    try { await request('POST', '/api/auth/logout', {}); } catch { /* the local session is cleared anyway */ }
    await saveSession(null);
  },

  me: () => request<{ user: T.User }>('GET', '/api/me'),
  capabilities: () => request<T.Capabilities>('GET', '/api/capabilities'),
  billing: () => request<T.Billing>('GET', '/api/billing'),
  upcoming: (days = 30) => request<{ deadlines: T.Deadline[] }>('GET', `/api/deadlines/upcoming?days=${days}`),
  search: (q: string) => request<{ results: T.SearchHit[] }>('GET', `/api/search?q=${enc(q)}`),

  cases: () => request<{ cases: T.Case[] }>('GET', '/api/cases'),
  createCase: (input: { title: string; reference?: string; domain?: string; summary?: string }) => request<{ case: T.Case }>('POST', '/api/cases', input),
  caseDetails: (id: string) => request<T.CaseDetails>('GET', `/api/cases/${enc(id)}`),
  setProfile: (id: string, patch: { domain?: string | null; summary?: string }) => request<{ profile: T.Profile }>('POST', `/api/cases/${enc(id)}/profile`, patch),
  markReady: (id: string) => request<{ profile: T.Profile }>('POST', `/api/cases/${enc(id)}/ready`, {}),
  reopen: (id: string) => request<{ profile: T.Profile }>('POST', `/api/cases/${enc(id)}/reopen`, {}),
  sendMessage: (id: string, body: string) => request<{ message: T.Message }>('POST', `/api/cases/${enc(id)}/messages`, { body }),
  caseSearch: (id: string, q: string) => request<{ results: T.SearchHit[] }>('GET', `/api/cases/${enc(id)}/search?q=${enc(q)}`),
  requests: (id: string) => request<T.RequestList>('GET', `/api/cases/${enc(id)}/requests`),
  provideRequest: (id: string, requestId: string, input: { documentId?: string; answer?: string }) => request<unknown>('POST', `/api/cases/${enc(id)}/requests/${enc(requestId)}/provide`, input),
  deadlines: (id: string) => request<{ deadlines: T.Deadline[] }>('GET', `/api/cases/${enc(id)}/deadlines`),
  communications: (id: string) => request<{ sessions: T.Session[] }>('GET', `/api/cases/${enc(id)}/communications`),
  invitations: (id: string) => request<{ invitations: T.Invitation[] }>('GET', `/api/cases/${enc(id)}/invitations`),
  createInvitation: (id: string) => request<{ invitation: T.Invitation; code?: string }>('POST', `/api/cases/${enc(id)}/invitations`, {}),

  lawyerMe: () => request<T.LawyerMe>('GET', '/api/lawyer/me'),
  readyCases: () => request<{ cases: T.ReadyCase[]; total: number }>('GET', '/api/lawyer/ready-cases'),
  accept: (caseId: string) => request<{ profile: T.Profile }>('POST', '/api/lawyer/accept', { caseId }),

  // Upload a file from the phone as raw bytes (PUT …/documents/stream, the description travels in one header).
  async uploadDocument(caseId: string, file: { uri: string; name: string; mimeType: string }, onProgress?: (ratio: number) => void) {
    const description = encodeURIComponent(JSON.stringify({ name: file.name, mimeType: file.mimeType, sourceType: 'original', reviewStatus: 'a_verifier' }));
    const source = new File(file.uri);
    const result = await source.upload(`${PORTAL_ORIGIN}/api/cases/${enc(caseId)}/documents/stream`, {
      httpMethod: 'PUT',
      uploadType: 0, // BINARY_CONTENT
      mimeType: 'application/octet-stream',
      headers: { ...baseHeaders(), 'Content-Type': 'application/octet-stream', 'x-besoinavocat-document': description },
      onProgress: onProgress ? ({ bytesSent, totalBytes }) => onProgress(totalBytes ? bytesSent / totalBytes : 0) : undefined,
    });
    let data: any = null;
    try { data = JSON.parse(result.body); } catch { data = null; }
    if (result.status < 200 || result.status >= 300) {
      throw new ApiError(result.status, data?.error?.code ?? `HTTP_${result.status}`, data?.error?.message ?? messageFor(result.status));
    }
    return data as { document: T.Document };
  },

  downloadUrl: (caseId: string, documentId: string) => `${PORTAL_ORIGIN}/api/cases/${enc(caseId)}/documents/${enc(documentId)}/download`,
  authHeaders: () => baseHeaders(),
};

if (DEMO) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Object.assign(api, require('./demo').demoApi);
}
