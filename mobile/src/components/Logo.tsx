// The BesoinAvocat wordmark as live text (never the TAKATAK brand), with the burgundy "b." monogram.
import { Text, View } from 'react-native';
import { colors, fonts } from '../lib/theme';

export function Monogram({ size = 44 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.24, backgroundColor: colors.wine, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.white, fontFamily: fonts.bold, fontSize: size * 0.56, marginTop: -size * 0.06 }}>
        b<Text style={{ color: '#f2c8cf' }}>.</Text>
      </Text>
    </View>
  );
}

export function Logo({ size = 1, light = false }: { size?: number; light?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 * size }}>
      <Monogram size={40 * size} />
      <Text style={{ fontFamily: fonts.bold, fontSize: 24 * size, letterSpacing: -0.6, color: light ? colors.white : colors.ink }}>
        Besoin<Text style={{ color: light ? '#e7a3ae' : colors.wine }}>avocat</Text>
      </Text>
    </View>
  );
}
