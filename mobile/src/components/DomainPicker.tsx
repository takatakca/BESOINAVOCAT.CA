import { Pressable, Text, View } from 'react-native';
import { tap } from './ui';
import { Icon } from './Icon';
import { colors, fonts, radius } from '../lib/theme';
import type { Domain } from '../lib/types';

export function DomainPicker({ domains, value, onChange }: { domains: Domain[]; value: string | null; onChange: (id: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
      {domains.map(d => {
        const active = d.id === value;
        return (
          <Pressable key={d.id} onPress={() => { tap(); onChange(d.id); }} accessibilityRole="radio" accessibilityState={{ selected: active }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, minHeight: 42, borderRadius: radius.pill, borderWidth: 1, borderColor: active ? colors.wine : colors.lineStrong, backgroundColor: active ? colors.winePale : colors.surface }}>
            {active ? <Icon name="check" size={15} color={colors.wine} strokeWidth={2.4} /> : null}
            <Text style={{ fontFamily: active ? fonts.semibold : fonts.medium, fontSize: 14, color: active ? colors.wine : colors.ink2 }}>{d.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
