import { useState } from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { Button, ErrorNote, Field, Screen } from '../components/ui';
import { CodeStep } from '../components/CodeStep';
import { api } from '../lib/api';
import { useSession } from '../lib/session';
import { type } from '../lib/theme';

const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

export default function SignIn() {
  const { completeSignIn } = useSession();
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setBusy(true); setError(null);
    try { await api.requestCode(email.trim()); setStep('code'); } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <Screen>
      {step === 'email' ? (
        <>
          <Text style={type.title}>Bon retour</Text>
          <Text style={[type.body, { marginTop: 8, marginBottom: 24 }]}>Entrez votre adresse courriel. Nous vous envoyons un code de connexion, sans mot de passe.</Text>
          <Field label="Adresse courriel" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" autoFocus returnKeyType="send" onSubmitEditing={() => validEmail(email) && send()} placeholder="vous@exemple.ca" />
          {error ? <ErrorNote message={error} /> : null}
          <Button title="Recevoir mon code" onPress={send} loading={busy} disabled={!validEmail(email)} style={{ marginTop: 4 }} />
          <Button title="Pas encore de compte ? Créer mon espace" variant="ghost" onPress={() => router.replace('/sign-up')} style={{ marginTop: 12 }} />
        </>
      ) : (
        <CodeStep email={email.trim()} onBack={() => setStep('email')} onResend={async () => { await api.requestCode(email.trim()); }}
          onVerify={async code => { await api.verifyCode(email.trim(), code); await completeSignIn(); }} />
      )}
    </Screen>
  );
}
