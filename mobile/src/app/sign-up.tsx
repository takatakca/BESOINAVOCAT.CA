// Short sign-up (owner, 2026-11-18): name, email, consent, then the emailed code. The account is created on the
// portal exactly as on the website (POST /api/auth/client/signup, then /verify).
import { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, ErrorNote, Field, Notice, Screen, tap } from '../components/ui';
import { CodeStep } from '../components/CodeStep';
import { Icon } from '../components/Icon';
import { api } from '../lib/api';
import { useSession } from '../lib/session';
import { LINKS } from '../lib/config';
import { colors, fonts, radius, type } from '../lib/theme';

const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

export default function SignUp() {
  const { completeSignIn } = useSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [step, setStep] = useState<'form' | 'code'>('form');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ok = name.trim().length > 1 && validEmail(email) && consent;

  const send = async () => {
    setBusy(true); setError(null);
    try { await api.clientSignup(email.trim(), name.trim()); setStep('code'); } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  if (step === 'code') {
    return (
      <Screen>
        <CodeStep email={email.trim()} onBack={() => setStep('form')} onResend={async () => { await api.clientSignup(email.trim(), name.trim()); }}
          onVerify={async code => { await api.clientVerify(email.trim(), code); await completeSignIn(); }} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={type.title}>Votre tableau de bord, en une minute</Text>
      <Text style={[type.body, { marginTop: 8, marginBottom: 24 }]}>Gratuit. Aucun mot de passe : un code arrive par courriel.</Text>
      <Field label="Votre nom" value={name} onChangeText={setName} autoComplete="name" textContentType="name" autoCapitalize="words" placeholder="Prénom et nom" returnKeyType="next" />
      <Field label="Adresse courriel" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" placeholder="vous@exemple.ca" />
      <Pressable onPress={() => { tap(); setConsent(!consent); }} accessibilityRole="checkbox" accessibilityState={{ checked: consent }} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 18 }}>
        <View style={{ width: 24, height: 24, borderRadius: radius.sm, borderWidth: 1.5, borderColor: consent ? colors.wine : colors.lineStrong, backgroundColor: consent ? colors.wine : colors.surface, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
          {consent ? <Icon name="check" size={16} color={colors.white} strokeWidth={2.4} /> : null}
        </View>
        <Text style={[type.small, { flex: 1, color: colors.ink2 }]}>
          J’accepte les <Text style={{ color: colors.navy3, fontFamily: fonts.semibold }} onPress={() => Linking.openURL(LINKS.terms)}>conditions d’utilisation</Text> et la <Text style={{ color: colors.navy3, fontFamily: fonts.semibold }} onPress={() => Linking.openURL(LINKS.privacy)}>politique de confidentialité</Text>.
        </Text>
      </Pressable>
      {error ? <ErrorNote message={error} /> : null}
      <Button title="Recevoir mon code" onPress={send} loading={busy} disabled={!ok} />
      <Button title="J’ai déjà un compte" variant="ghost" onPress={() => router.replace('/sign-in')} style={{ marginTop: 10 }} />
      <View style={{ marginTop: 18 }}>
        <Notice>Vos pièces restent privées. Un avocat ne les voit qu’après avoir accepté votre dossier.</Notice>
      </View>
    </Screen>
  );
}
