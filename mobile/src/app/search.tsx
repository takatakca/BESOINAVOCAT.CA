// Search every file the person can see (names, references and text of documents), as on the portal (/api/search).
import { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Card, Empty, ErrorNote, Row, Screen } from '../components/ui';
import { Icon } from '../components/Icon';
import { api } from '../lib/api';
import { colors, fonts, radius, type } from '../lib/theme';

type Hit = { id?: string; caseId?: string; title?: string; name?: string; excerpt?: string; caseTitle?: string; kind?: string };

export default function Search() {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) { setHits(null); return; }
    const timer = setTimeout(async () => {
      try {
        const result: any = await api.search(query);
        setHits((result.results ?? result.items ?? []) as Hit[]);
        setError(null);
      } catch (e: any) { setError(e.message); }
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.lineStrong, borderRadius: radius.md, paddingHorizontal: 14, marginBottom: 18 }}>
        <Icon name="search" size={19} color={colors.muted} />
        <TextInput value={q} onChangeText={setQ} autoFocus placeholder="Pièce, mot, référence…" placeholderTextColor={colors.faint} returnKeyType="search"
          style={{ flex: 1, height: 50, fontFamily: fonts.regular, fontSize: 16, color: colors.ink }} />
      </View>
      {error ? <ErrorNote message={error} /> : null}
      {hits === null ? <Text style={[type.small, { textAlign: 'center' }]}>Tapez au moins deux lettres.</Text> : hits.length ? (
        <Card style={{ paddingVertical: 4 }}>
          {hits.map((h, i) => (
            <Row key={`${h.caseId}-${h.id}-${i}`} icon="file" title={h.name ?? h.title ?? 'Résultat'} subtitle={(h.excerpt ?? h.caseTitle ?? '').replace(/\s+/g, ' ').slice(0, 140)}
              last={i === hits.length - 1} onPress={h.caseId ? () => router.push(`/case/${h.caseId}?tab=pieces`) : undefined} />
          ))}
        </Card>
      ) : <Empty icon="search" title="Aucun résultat" text="Essayez un autre mot ou une partie du nom du fichier." />}
    </Screen>
  );
}
