// Upcoming deadlines across every file the person can see (90 days), grouped by month.
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Card, Empty, ErrorNote, Eyebrow, Loading, Screen } from '../../components/ui';
import { api } from '../../lib/api';
import { useData } from '../../lib/useData';
import { daysLabel } from '../../lib/format';
import { colors, fonts, type } from '../../lib/theme';
import type { Deadline } from '../../lib/types';

const monthFmt = new Intl.DateTimeFormat('fr-CA', { month: 'long', year: 'numeric' });

export default function Agenda() {
  const { data, error, loading, refreshing, refresh } = useData(() => api.upcoming(90));
  if (loading) return <Loading />;
  const groups = new Map<string, Deadline[]>();
  for (const d of data?.deadlines ?? []) {
    const key = d.overdue ? 'En retard' : monthFmt.format(new Date(`${d.dueDate}T12:00:00`));
    groups.set(key, [...(groups.get(key) ?? []), d]);
  }
  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {error ? <ErrorNote message={error} onRetry={refresh} /> : null}
      {!groups.size && !error ? <Empty icon="calendar" title="Rien à l’horizon" text="Les échéances que votre avocat partage avec vous apparaîtront ici." /> : null}
      {[...groups.entries()].map(([month, items]) => (
        <View key={month} style={{ marginBottom: 18 }}>
          <Eyebrow>{month}</Eyebrow>
          {items.map(d => {
            const date = new Date(`${d.dueDate}T12:00:00`);
            return (
              <Card key={d.id} style={{ marginBottom: 10, flexDirection: 'row', gap: 16, alignItems: 'center' }} onPress={() => d.caseId && router.push(`/case/${d.caseId}?tab=echeances`)}>
                <View style={{ width: 54, alignItems: 'center', borderRightWidth: 1, borderRightColor: colors.line, paddingRight: 14 }}>
                  <Text style={{ fontFamily: fonts.serifBold, fontSize: 30, color: d.overdue ? colors.wine : colors.ink, lineHeight: 32 }}>{date.getDate()}</Text>
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 11, color: colors.muted, textTransform: 'uppercase' }}>{new Intl.DateTimeFormat('fr-CA', { weekday: 'short' }).format(date)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.ink }} numberOfLines={2}>{d.title}</Text>
                  <Text style={[type.small, { marginTop: 2 }]} numberOfLines={1}>{d.kindLabel}{d.caseTitle ? ` · ${d.caseTitle}` : ''}</Text>
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 12.5, marginTop: 6, color: d.overdue ? colors.wine : d.daysLeft <= 3 ? colors.amber : colors.green }}>
                    {daysLabel(d.daysLeft)}{d.dueTime ? ` · ${d.dueTime.slice(0, 5)}` : ''}
                  </Text>
                </View>
              </Card>
            );
          })}
        </View>
      ))}
    </Screen>
  );
}

