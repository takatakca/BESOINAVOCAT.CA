// Lawyer space: files marked ready in the lawyer's fields. Only title, field, summary and number of documents are
// shown before acceptance (D-036), never the documents themselves.
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Badge, Button, Card, Empty, ErrorNote, Loading, Notice, Screen, success } from '../../components/ui';
import { api } from '../../lib/api';
import { useData } from '../../lib/useData';
import { relative } from '../../lib/format';
import { colors, type } from '../../lib/theme';

export default function Ready() {
  const { data, error, loading, refreshing, refresh, reload } = useData(() => api.readyCases());
  const [busy, setBusy] = useState<string | null>(null);
  if (loading) return <Loading />;

  const accept = (id: string, title: string) => Alert.alert('Accepter ce dossier ?', `« ${title} » sera ajouté à vos dossiers et la personne en sera informée. Vous convenez ensuite du mandat avec elle.`, [
    { text: 'Annuler', style: 'cancel' },
    { text: 'Accepter', onPress: async () => {
      setBusy(id);
      try { await api.accept(id); success(); await reload(); router.push(`/case/${id}`); } catch (e: any) { Alert.alert('Acceptation impossible', e.message); } finally { setBusy(null); }
    } },
  ]);

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {error ? <ErrorNote message={error} onRetry={refresh} /> : null}
      <View style={{ marginBottom: 16 }}><Notice icon="info">Vous voyez le résumé et le domaine. Les pièces deviennent visibles une fois le dossier accepté.</Notice></View>
      {data?.cases.length ? data.cases.map(c => (
        <Card key={c.id} accent style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <Badge label={c.domainLabel ?? 'Domaine'} tone="navy" />
            <Badge label={`${c.documents ?? 0} pièce${(c.documents ?? 0) > 1 ? 's' : ''}`} tone="muted" />
          </View>
          <Text style={type.heading}>{c.title}</Text>
          <Text style={[type.body, { marginTop: 8 }]} numberOfLines={6}>{c.summary || 'Aucun résumé fourni.'}</Text>
          <Text style={[type.small, { marginTop: 10, color: colors.faint }]}>Prêt {relative(c.readyAt)}</Text>
          <Button title="Accepter le dossier" icon="check" onPress={() => accept(c.id, c.title)} loading={busy === c.id} style={{ marginTop: 14 }} />
        </Card>
      )) : !error ? <Empty icon="briefcase" title="Aucun dossier prêt pour l’instant" text="Les dossiers prêts dans vos domaines de pratique apparaîtront ici." /> : null}
    </Screen>
  );
}
