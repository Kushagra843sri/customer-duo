import { Tabs } from 'expo-router';
import { Receipt, Store, UserRound } from 'lucide-react-native';

import { NotificationBell } from '@/components/NotificationBell';
import { useTabOptions } from '@/constants/navigation';

export default function TabsLayout() {
  const options = useTabOptions();
  return (
    <Tabs screenOptions={{ ...options, headerRight: () => <NotificationBell /> }}>
      <Tabs.Screen name="index" options={{ title: 'Shops', tabBarIcon: ({ color, size }) => <Store color={color} size={size} /> }} />
      <Tabs.Screen name="orders" options={{ title: 'Orders', tabBarIcon: ({ color, size }) => <Receipt color={color} size={size} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} /> }} />
    </Tabs>
  );
}
