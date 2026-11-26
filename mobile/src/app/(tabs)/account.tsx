import { useEffect, useState } from 'react';
import { Alert, Linking, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { Card, Eyebrow, Row, Screen } from '../../components/ui';
import { Monogram } from '../../components/Logo';
import { useSession } from '../../lib/session';
import { LINKS } from '../../lib/config';
import { colors, fonts, type } from '../../lib/theme';

export default function Account() {
  const { user, isLawyer, lockEnabled, setLockEnabled, signOut } = useSession();
  const [biometric, setBiometric] = useState<{ available: boolean; label: string }>({ available: false, label: 'Verrouillage biométrique' });

  useEffect(() => {
    (async () => {
      const [hardware, enrolled, kinds] = await Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync(), LocalAuthentication.supportedAuthenticationTypesAsync()]);
      const face = kinds.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
      setBiometric({ available: hardware && enrolled, label: face ? 'Verrouiller avec le visage' : 'Verrouiller avec l’empreinte' });
    })().catch(() => undefined);
  }, []);

  const toggleLock = async (on: boolean) => {
    if (on) {
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Activer le verrouillage' });
      if (!result.success) return;
    }
    await setLockEnabled(on);
  };

  const open = (url: string) => WebBrowser.openBrowserAsync(url, { controlsColor: colors.wine, toolbarColor: colors.canvas }).catch(() => Linking.openURL(url));

  return (
    <Screen>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 22 }}>
        <Monogram size={52} />
        <View style={{ flex: 1 }}>
          <Text style={type.heading} numberOfLines={1}>{user?.name || user?.email || 'Mon espace'}</Text>
          <Text style={[type.small, { marginTop: 2 }]}>{isLawyer ? 'Espace avocat' : 'Espace client'}</Text>
        </View>
      </Card>

      <Eyebrow>Mon espace</Eyebrow>
      <Card style={{ paddingVertical: 4, marginBottom: 22 }}>
        <Row icon="star" title="Forfaits" subtitle="Votre forfait, votre espace utilisé" onPress={() => router.push('/plans')} />
        {isLawyer ? <Row icon="briefcase" title="Dossiers prêts à accepter" onPress={() => router.push('/ready')} /> : null}
        <Row icon="globe" title="Ouvrir le portail Web" subtitle="Toutes les fonctions avancées" onPress={() => open(LINKS.web)} last />
      </Card>

      <Eyebrow>Sécurité</Eyebrow>
      <Card style={{ paddingVertical: 4, marginBottom: 22 }}>
        <Row icon="fingerprint" title={biometric.label} subtitle={biometric.available ? 'Demandé au retour dans l’application' : 'Non configuré sur cet appareil'}
          right={<Switch value={lockEnabled} disabled={!biometric.available} onValueChange={toggleLock} trackColor={{ true: colors.wine, false: colors.lineStrong }} thumbColor={colors.white} />} last />
      </Card>

      <Eyebrow>Aide et informations</Eyebrow>
      <Card style={{ paddingVertical: 4, marginBottom: 22 }}>
        <Row icon="info" title="Centre d’aide" onPress={() => open(LINKS.help)} />
        <Row icon="shield" title="Politique de confidentialité" onPress={() => open(LINKS.privacy)} />
        <Row icon="file" title="Conditions d’utilisation" onPress={() => open(LINKS.terms)} />
        <Row icon="scale" title="Trouver un avocat au Barreau du Québec" onPress={() => open(LINKS.barreau)} last />
      </Card>

      <Card style={{ paddingVertical: 4, marginBottom: 22 }}>
        <Row icon="logout" title="Se déconnecter" tint={colors.wine} onPress={() => Alert.alert('Se déconnecter ?', 'Vous pourrez vous reconnecter avec un code reçu par courriel.', [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Se déconnecter', style: 'destructive', onPress: () => signOut() },
        ])} />
        <Row icon="trash" title="Supprimer mon compte" tint={colors.wine} onPress={() => open(LINKS.deleteAccount)} last />
      </Card>

      <Text style={[type.small, { textAlign: 'center', fontSize: 12 }]}>BesoinAvocat · version {Constants.expoConfig?.version ?? ''}</Text>
      <Text style={[type.small, { textAlign: 'center', fontSize: 12, marginTop: 4, fontFamily: fonts.regular, color: colors.faint }]}>Outil de préparation de dossier. Pas un cabinet d’avocats.</Text>
    </Screen>
  );
}
