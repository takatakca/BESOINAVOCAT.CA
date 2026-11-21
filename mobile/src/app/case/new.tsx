import { useState } from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { Button, ErrorNote, Field, Screen, success } from '../../components/ui';
import { DomainPicker } from '../../components/DomainPicker';
import { api } from '../../lib/api';
import { useSession } from '../../lib/session';
import { colors, fonts, type } from '../../lib/theme';

export default function NewCase() {
  const { capabilities } = useSession();
  const [title, setTitle] = useState('');
  const [domain, setDomain] = useState<string | null>(null);
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const domains = capabilities?.caseMatching?.domains ?? [];

  const create = async () => {
    setBusy(true); setError(null);
    try {
      const { case: created } = await api.createCase({ title: title.trim(), ...(domain ? { domain } : {}), ...(summary.trim() ? { summary: summary.trim() } : {}) });
      success();
      router.replace(`/case/${created.id}`);
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <Screen footer={<Button title="Créer le dossier" icon="check" onPress={create} loading={busy} disabled={title.trim().length < 3} />}>
      <Text style={[type.body, { marginBottom: 20 }]}>Commencez simplement. Vous pourrez tout compléter plus tard.</Text>
      <Field label="Titre du dossier" value={title} onChangeText={setTitle} placeholder="Ex. : Garde des enfants, Litige avec mon propriétaire" maxLength={240} autoFocus />
      {domains.length ? (
        <>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.ink2, marginBottom: 10 }}>Domaine de droit (facultatif)</Text>
          <DomainPicker domains={domains} value={domain} onChange={setDomain} />
        </>
      ) : null}
      <Field label="Votre situation en quelques lignes (facultatif)" value={summary} onChangeText={setSummary} multiline placeholder="Ce qui s’est passé, ce que vous souhaitez obtenir, les dates importantes." hint="Évitez les numéros de carte ou d’assurance sociale." />
      {error ? <ErrorNote message={error} /> : null}
    </Screen>
  );
}
