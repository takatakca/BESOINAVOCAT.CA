import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { CormorantGaramond_600SemiBold, CormorantGaramond_700Bold } from '@expo-google-fonts/cormorant-garamond';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionProvider, useSession } from '../lib/session';
import { LockGate } from '../components/LockGate';
import { colors, fonts } from '../lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function Navigator() {
  const { ready, user } = useSession();
  useEffect(() => { if (ready) SplashScreen.hideAsync().catch(() => undefined); }, [ready]);
  if (!ready) return null;
  const signedIn = Boolean(user);
  return (
    <LockGate active={signedIn}>
      <Stack
        screenOptions={{
          headerTintColor: colors.navy,
          headerTitleStyle: { fontFamily: fonts.semibold, fontSize: 17, color: colors.ink },
          headerStyle: { backgroundColor: colors.canvas },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.canvas },
        }}
      >
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="welcome" options={{ headerShown: false }} />
          <Stack.Screen name="sign-in" options={{ title: 'Connexion' }} />
          <Stack.Screen name="sign-up" options={{ title: 'Créer mon espace' }} />
        </Stack.Protected>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="case/new" options={{ title: 'Nouveau dossier', presentation: 'modal' }} />
          <Stack.Screen name="case/[id]/index" options={{ title: 'Dossier' }} />
          <Stack.Screen name="case/[id]/prepare" options={{ title: 'Préparer le dossier', presentation: 'modal' }} />
          <Stack.Screen name="case/[id]/request/[requestId]" options={{ title: 'Pièce demandée', presentation: 'modal' }} />
          <Stack.Screen name="plans" options={{ title: 'Forfaits' }} />
          <Stack.Screen name="search" options={{ title: 'Recherche' }} />
        </Stack.Protected>
      </Stack>
    </LockGate>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, CormorantGaramond_600SemiBold, CormorantGaramond_700Bold });
  if (!loaded) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <SessionProvider>
          <Navigator />
        </SessionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
