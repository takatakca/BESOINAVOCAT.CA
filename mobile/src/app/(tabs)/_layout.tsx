import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Icon, IconName } from '../../components/Icon';
import { useSession } from '../../lib/session';
import { colors, fonts } from '../../lib/theme';

const icon = (name: IconName) => ({ color, focused }: { color: unknown; focused: boolean }) => <Icon name={name} size={23} color={String(color)} strokeWidth={focused ? 2 : 1.7} />;

export default function TabsLayout() {
  const { isLawyer } = useSession();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.wine,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line, height: Platform.OS === 'ios' ? 88 : 66, paddingTop: 6 },
        headerStyle: { backgroundColor: colors.canvas },
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: fonts.semibold, fontSize: 17, color: colors.ink },
        sceneStyle: { backgroundColor: colors.canvas },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Accueil', headerShown: false, tabBarIcon: icon('home') }} />
      <Tabs.Screen name="cases" options={{ title: 'Dossiers', tabBarIcon: icon('folder') }} />
      <Tabs.Screen name="ready" options={{ title: 'À accepter', tabBarIcon: icon('briefcase'), href: isLawyer ? undefined : null }} />
      <Tabs.Screen name="agenda" options={{ title: 'Échéances', tabBarIcon: icon('calendar') }} />
      <Tabs.Screen name="account" options={{ title: 'Mon compte', tabBarIcon: icon('user') }} />
    </Tabs>
  );
}
