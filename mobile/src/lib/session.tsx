// Who is signed in, which space they see (client or lawyer), and the optional Face ID / fingerprint lock.
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api, loadSession, saveSession, setUnauthorizedHandler } from './api';
import type { Capabilities, User } from './types';

type State = {
  ready: boolean;
  user: User | null;
  capabilities: Capabilities | null;
  isLawyer: boolean;
  lockEnabled: boolean;
  setLockEnabled: (on: boolean) => Promise<void>;
  completeSignIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const LOCK_KEY = 'ba.lock.v1';
const SessionContext = createContext<State | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [lockEnabled, setLock] = useState(false);

  const refresh = useCallback(async () => {
    const [me, caps] = await Promise.all([api.me(), api.capabilities()]);
    setUser(me.user);
    setCapabilities(caps);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => { setUser(null); setCapabilities(null); });
    (async () => {
      setLock((await SecureStore.getItemAsync(LOCK_KEY).catch(() => null)) === 'on');
      if (await loadSession()) {
        try { await refresh(); } catch { /* offline or expired: the welcome screen or a retry follows */ }
      }
      setReady(true);
    })();
    return () => setUnauthorizedHandler(null);
  }, [refresh]);

  const value = useMemo<State>(() => ({
    ready, user, capabilities,
    isLawyer: Boolean(capabilities?.lawyerSpace?.account),
    lockEnabled,
    setLockEnabled: async on => { setLock(on); await SecureStore.setItemAsync(LOCK_KEY, on ? 'on' : 'off'); },
    completeSignIn: refresh,
    signOut: async () => { await api.logout(); await saveSession(null); setUser(null); setCapabilities(null); },
    refresh,
  }), [ready, user, capabilities, lockEnabled, refresh]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('SessionProvider missing');
  return value;
}
