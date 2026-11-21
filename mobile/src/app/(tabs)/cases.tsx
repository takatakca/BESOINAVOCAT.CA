import { useState } from 'react';
import { Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { Button, Empty, ErrorNote, Loading, Screen, Segmented } from '../../components/ui';
import { CaseCard } from '../../components/CaseCard';
import { api } from '../../lib/api';
import { useData } from '../../lib/useData';
import { type } from '../../lib/theme';

type Filter = 'tous' | 'preparation' | 'pret' | 'accepte';

export default function Cases() {
  const [filter, setFilter] = useState<Filter>('tous');
  const { data, error, loading, refreshing, refresh } = useData(() => api.cases());
  if (loading) return <Loading />;
  const cases = [...(data?.cases ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const shown = filter === 'tous' ? cases : cases.filter(c => (c.profile?.status ?? 'preparation') === filter);
  const count = (s: Filter) => cases.filter(c => (c.profile?.status ?? 'preparation') === s).length;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Stack.Screen options={{ headerRight: () => <Button title="Nouveau" icon="plus" small variant="ghost" onPress={() => router.push('/case/new')} /> }} />
      {error ? <ErrorNote message={error} onRetry={refresh} /> : null}
      {cases.length ? (
        <>
          <View style={{ marginBottom: 16 }}>
            <Segmented<Filter> value={filter} onChange={setFilter} options={[
              { id: 'tous', label: 'Tous', count: cases.length },
              { id: 'preparation', label: 'En préparation', count: count('preparation') },
              { id: 'pret', label: 'Prêts', count: count('pret') },
              { id: 'accepte', label: 'Acceptés', count: count('accepte') },
            ]} />
          </View>
          {shown.map(c => <CaseCard key={c.id} item={c} />)}
          {!shown.length ? <Text style={[type.small, { textAlign: 'center', marginTop: 24 }]}>Aucun dossier dans cette catégorie.</Text> : null}
        </>
      ) : !error ? (
        <Empty icon="folder" title="Aucun dossier pour l’instant" text="Un dossier regroupe vos pièces, vos échanges et vos dates importantes." action={<Button title="Créer un dossier" icon="plus" onPress={() => router.push('/case/new')} />} />
      ) : null}
    </Screen>
  );
}
