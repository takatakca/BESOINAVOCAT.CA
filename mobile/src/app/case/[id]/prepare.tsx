// Prepare the file for a lawyer: field of law, summary, then "ready" (or back to preparation before acceptance).
import { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, ErrorNote, Field, Loading, Notice, Screen, success } from '../../../components/ui';
import { DomainPicker } from '../../../components/DomainPicker';
import { api } from '../../../lib/api';
import { useSession } from '../../../lib/session';
import { colors, fonts, type } from '../../../lib/theme';
import type { Profile } from '../../../lib/types';

export default function Prepare() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { capabilities } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [domain, setDomain] = useState<string | null>(null);
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState<'save' | 'ready' | 'reopen' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.caseDetails(id).then(d => { setProfile(d.case.profile); setDomain(d.case.profile?.domain ?? null); setSummary(d.case.profile?.summary ?? ''); }).catch(e => setError(e.message));
  }, [id]);

  if (!profile && !error) return <Loading />;
  const accepted = profile?.status === 'accepte';

  const save = async (thenReady: boolean) => {
    setBusy(thenReady ? 'ready' : 'save'); setError(null);
    try {
      const patch: { domain?: string; summary?: string } = {};
      if (!accepted && domain && domain !== profile?.domain) patch.domain = domain;
      if (summary.trim() !== (profile?.summary ?? '')) patch.summary = summary.trim();
      if (Object.keys(patch).length) setProfile((await api.setProfile(id, patch)).profile);
      if (thenReady) await api.markReady(id);
      success();
      router.back();
    } catch (e: any) { setError(e.message); } finally { setBusy(null); }
  };

  const reopen = () => Alert.alert('Remettre en préparation ?', 'Le dossier ne sera plus proposé aux avocats tant que vous ne l’indiquerez pas prêt de nouveau.', [
    { text: 'Annuler', style: 'cancel' },
    { text: 'Remettre en préparation', onPress: async () => { setBusy('reopen'); try { setProfile((await api.reopen(id)).profile); } catch (e: any) { setError(e.message); } finally { setBusy(null); } } },
  ]);

  return (
    <Screen footer={accepted ? undefined : profile?.status === 'pret' ? (
      <View style={{ gap: 10 }}>
        <Button title="Enregistrer" onPress={() => save(false)} loading={busy === 'save'} />
        <Button title="Remettre en préparation" variant="secondary" onPress={reopen} loading={busy === 'reopen'} />
      </View>
    ) : (
      <View style={{ gap: 10 }}>
        <Button title="Mon dossier est prêt" icon="check" onPress={() => save(true)} loading={busy === 'ready'} disabled={!domain} />
        <Button title="Enregistrer sans envoyer" variant="secondary" onPress={() => save(false)} loading={busy === 'save'} />
      </View>
    )}>
      {error ? <ErrorNote message={error} /> : null}
      <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.ink2, marginBottom: 10 }}>Domaine de droit</Text>
      {accepted ? <Text style={[type.body, { marginBottom: 18 }]}>{profile?.domainLabel} (fixé à l’acceptation)</Text> : <DomainPicker domains={capabilities?.caseMatching?.domains ?? []} value={domain} onChange={setDomain} />}
      <Field label="Votre situation" value={summary} onChangeText={setSummary} multiline placeholder="Résumez les faits, ce que vous souhaitez obtenir et les dates importantes." hint="Ce résumé est ce que l’avocat lit en premier, avant d’accepter." />
      <Notice>Quand le dossier est prêt, il est proposé aux avocats de ce domaine. Ils voient le titre, le domaine, ce résumé et le nombre de pièces, jamais les pièces elles-mêmes avant d’accepter.</Notice>
    </Screen>
  );
}
