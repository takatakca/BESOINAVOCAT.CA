import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Badge, Card } from './ui';
import { Icon } from './Icon';
import { STATUS_LABEL, formatShort } from '../lib/format';
import { colors, fonts, type } from '../lib/theme';
import type { Case } from '../lib/types';

export function CaseCard({ item }: { item: Case }) {
  const status = STATUS_LABEL[item.profile?.status ?? 'preparation'] ?? STATUS_LABEL.preparation;
  return (
    <Card onPress={() => router.push(`/case/${item.id}`)} style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
        <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.winePale, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="folder" size={22} color={colors.wine} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.ink, lineHeight: 21 }} numberOfLines={2}>{item.title}</Text>
          <Text style={[type.small, { marginTop: 3 }]} numberOfLines={1}>
            {[item.profile?.domainLabel, item.reference, `créé le ${formatShort(item.createdAt)}`].filter(Boolean).join(' · ')}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <Badge label={status.label} tone={status.tone} />
            {item.role !== 'client' ? <Badge label={item.role === 'lawyer' ? 'Avocat' : 'Responsable'} tone="muted" /> : null}
          </View>
        </View>
        <Icon name="chevron" size={18} color={colors.faint} />
      </View>
    </Card>
  );
}
