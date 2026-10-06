import { useRouter } from 'expo-router';
import { Receipt } from 'lucide-react-native';
import { FlatList, RefreshControl, Text, View } from 'react-native';

import { listOrders } from '@/api/customer';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { Canvas, Muted, PressableCard, StatusBadge } from '@/components/ui';
import { useApiResource } from '@/hooks/useApiResource';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import { formatPaise } from '@/lib/money';

export default function OrdersScreen() {
  const router = useRouter();
  const { data, isLoading, error, retry } = useApiResource(listOrders);
  useRefetchOnFocus(retry);

  if (isLoading && !data) return <LoadingState label="Loading your orders…" />;
  if (error && !data) return <ErrorState error={error} retry={retry} />;
  if (!data || data.length === 0) {
    return <EmptyState title="No orders yet" description="Your orders will appear here once you place one." icon={Receipt} />;
  }

  return (
    <Canvas>
      <FlatList
        data={data}
        keyExtractor={(o) => o.orderId}
        contentContainerClassName="gap-3 p-4"
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={retry} />}
        renderItem={({ item }) => (
          <PressableCard onPress={() => router.push({ pathname: '/order/[orderId]', params: { orderId: item.orderId } })}>
            <View className="flex-row items-center justify-between gap-2">
              <Text className="flex-1 text-base font-bold text-ink dark:text-ink-dark" numberOfLines={1}>
                {item.shopName}
              </Text>
              <StatusBadge status={item.status} />
            </View>
            <Muted>
              {item.items.reduce((n, i) => n + i.quantity, 0)} items · {formatPaise(item.pricing.totalPaise)}
              {item.createdAt ? ` · ${new Date(item.createdAt).toLocaleDateString()}` : ''}
            </Muted>
          </PressableCard>
        )}
      />
    </Canvas>
  );
}
