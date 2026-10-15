import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { ChartIcon, GearIcon, ListIcon } from '@/components/icons';
import { colors } from '@/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: '#4a5568',
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        sceneStyle: { backgroundColor: colors.background },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        // on the web the bar is a fixed 48 points, too short for the icon and a 12 point label; on a phone it sizes itself around the safe areas
        tabBarStyle: Platform.OS === 'web' ? { height: 68, paddingTop: 6, paddingBottom: 8 } : undefined,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Debts', tabBarIcon: ({ color }) => <ListIcon color={color} /> }}
      />
      <Tabs.Screen
        name="plan"
        options={{ title: 'Plan', tabBarIcon: ({ color }) => <ChartIcon color={color} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Settings', tabBarIcon: ({ color }) => <GearIcon color={color} /> }}
      />
    </Tabs>
  );
}
