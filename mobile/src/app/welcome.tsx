// First screen. Positioning of 2026-11-13: the person prepares their file on the platform, then a lawyer of the
// matching field sees a file already ready and accepts it. BesoinAvocat is not a law firm and gives no legal advice.
import { Linking, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/ui';
import { Logo } from '../components/Logo';
import { Icon, IconName } from '../components/Icon';
import { colors, fonts, type } from '../lib/theme';
import { LINKS } from '../lib/config';

const STEPS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'folder', title: 'Créez votre tableau de bord', text: 'Un espace privé, gratuit, à votre nom.' },
  { icon: 'upload', title: 'Préparez votre dossier', text: 'Vos pièces, vos dates, votre situation, au même endroit.' },
  { icon: 'scale', title: 'Un avocat du domaine l’accepte', text: 'Il reçoit un dossier déjà prêt. Vous convenez ensuite du mandat.' },
];

export default function Welcome() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <LinearGradient colors={[colors.navy, colors.navy2]} style={[styles.hero, { paddingTop: insets.top + 28 }]}>
        <Logo light />
        <View style={styles.filet} />
        <Text style={styles.heroTitle}>Votre dossier, prêt pour votre avocat.</Text>
        <Text style={styles.heroText}>Préparez-le ici, en toute confidentialité. Un avocat du bon domaine le reçoit déjà complet.</Text>
      </LinearGradient>

      <View style={styles.body}>
        {STEPS.map((s, i) => (
          <View key={s.title} style={styles.step}>
            <View style={styles.stepIcon}><Icon name={s.icon} size={20} color={colors.wine} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>{i + 1}. {s.title}</Text>
              <Text style={type.small}>{s.text}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={[styles.actions, { paddingBottom: insets.bottom + 16 }]}>
        <Button title="Créer mon tableau de bord" onPress={() => router.push('/sign-up')} />
        <Button title="J’ai déjà un compte" variant="secondary" onPress={() => router.push('/sign-in')} style={{ marginTop: 10 }} />
        <Text style={styles.legal}>
          BesoinAvocat n’est pas un cabinet d’avocats et ne donne pas de conseils juridiques.{' '}
          <Text style={styles.link} onPress={() => Linking.openURL(LINKS.terms)}>Conditions</Text> ·{' '}
          <Text style={styles.link} onPress={() => Linking.openURL(LINKS.privacy)}>Confidentialité</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 24, paddingBottom: 34, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  filet: { width: 44, height: 2, backgroundColor: colors.gold, marginTop: 30, marginBottom: 18 },
  heroTitle: { fontFamily: fonts.serif, fontSize: 36, lineHeight: 40, color: colors.white, letterSpacing: -0.3 },
  heroText: { fontFamily: fonts.regular, fontSize: 15.5, lineHeight: 23, color: '#c4cfde', marginTop: 12 },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 26, gap: 18 },
  step: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  stepIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.winePale, alignItems: 'center', justifyContent: 'center' },
  stepTitle: { fontFamily: fonts.semibold, fontSize: 15.5, color: colors.ink, marginBottom: 2 },
  actions: { paddingHorizontal: 24 },
  legal: { ...type.small, fontSize: 12, textAlign: 'center', marginTop: 16 },
  link: { color: colors.navy3, textDecorationLine: 'underline' },
});
