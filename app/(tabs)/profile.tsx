import { useRouter } from 'expo-router';
import { LogOut, MapPin } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Avatar, Button, Card, Muted, PressableCard, Screen } from '@/components/ui';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useCart } from '@/hooks/useCart';
import { authService } from '@/lib/authService';

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuthUser();
  const { clear } = useCart();

  return (
    <Screen>
      <Card className="flex-row items-center gap-4">
        <Avatar name={user?.email ?? '?'} size={56} />
        <View className="flex-1">
          <Text className="text-base font-bold text-ink dark:text-ink-dark" numberOfLines={1}>
            {user?.email ?? 'Signed in'}
          </Text>
          <Muted>Customer account</Muted>
        </View>
      </Card>

      <PressableCard onPress={() => router.push('/addresses')}>
        <View className="flex-row items-center gap-3">
          <MapPin size={20} color="#ea580c" />
          <View className="flex-1">
            <Text className="text-base font-bold text-ink dark:text-ink-dark">Saved addresses</Text>
            <Muted>Where we deliver your orders</Muted>
          </View>
        </View>
      </PressableCard>

      <Button
        variant="secondary"
        icon={LogOut}
        label="Sign out"
        onPress={async () => {
          // A cart belongs to the person who built it.
          clear();
          await authService.signOut();
        }}
      />
    </Screen>
  );
}
