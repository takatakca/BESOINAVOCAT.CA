// BesoinAvocat visual system for the native app. Same tones as the portal (platform/public/styles.css):
// navy ink, burgundy accent, gold filet, ivory canvas. Lighter and more "chambre de cour" than the web cockpit,
// as the owner asked on 2026-11-18 (less dark, more VIP, without excess).
import { Platform } from 'react-native';

export const colors = {
  ink: '#0f1b2d',
  ink2: '#26344a',
  muted: '#5b6576',
  faint: '#8a93a3',
  navy: '#13233a',
  navy2: '#1b2f4d',
  navy3: '#253c5e',
  wine: '#8b2132',
  wineDark: '#6f1a28',
  winePale: '#f6e9ec',
  gold: '#b08d4a',
  goldInk: '#7d6329',
  goldSoft: '#f8f1df',
  goldLine: '#e4d3a8',
  green: '#1f7a4c',
  greenPale: '#e6f3ec',
  amber: '#7a5710',
  amberBg: '#fbf3e0',
  red: '#a3303a',
  redBg: '#fbecee',
  canvas: '#f7f4ee',
  surface: '#ffffff',
  sunken: '#efebe3',
  line: '#e6e0d4',
  lineStrong: '#d3cbbb',
  white: '#ffffff',
};

export const fonts = {
  serif: 'CormorantGaramond_600SemiBold',
  serifBold: 'CormorantGaramond_700Bold',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

export const radius = { sm: 6, md: 10, lg: 16, xl: 22, pill: 999 };
export const space = (n: number) => n * 4;

export const shadow = Platform.select({
  ios: { shadowColor: '#0f1b2d', shadowOpacity: 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
  default: { elevation: 2 },
});

export const type = {
  display: { fontFamily: fonts.serif, fontSize: 34, lineHeight: 38, color: colors.ink, letterSpacing: -0.3 },
  title: { fontFamily: fonts.serif, fontSize: 26, lineHeight: 30, color: colors.ink },
  heading: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22, color: colors.ink, letterSpacing: -0.2 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.ink2 },
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.muted },
  label: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, color: colors.goldInk, letterSpacing: 1.6, textTransform: 'uppercase' as const },
};
