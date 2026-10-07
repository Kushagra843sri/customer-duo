import { useRouter } from 'expo-router';
import { Star, Store } from 'lucide-react-native';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import { listShops } from '@/api/customer';
import type { Shop } from '@/api/customer';
import { CartBar } from '@/components/CartBar';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { ShopPhotos } from '@/components/ShopPhotos';
import { Badge, Canvas } from '@/components/ui';
import { useApiResource } from '@/hooks/useApiResource';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';

function ShopCard({ shop, onPress }: { shop: Shop; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={shop.name}>
      {({ pressed }) => (
        <View
          style={{ opacity: pressed ? 0.85 : 1 }}
          className="overflow-hidden rounded-2xl border border-line bg-surface dark:border-line-dark dark:bg-surface-dark"
        >
          <ShopPhotos images={shop.images} shopName={shop.name} mode="cover" />
          <View className="gap-1 p-4">
            <Text className="text-base font-bold text-ink dark:text-ink-dark" numberOfLines={1}>
              {shop.name}
            </Text>
            {shop.address ? (
              <Text className="text-sm text-muted dark:text-muted-dark" numberOfLines={1}>
                {shop.address}
              </Text>
            ) : null}
            <View className="flex-row items-center gap-2">
              <Badge label={shop.isOpen ? 'Open' : 'Closed'} tone={shop.isOpen ? 'success' : 'neutral'} />
              {shop.rating !== null ? <Badge label={shop.rating.toFixed(1)} tone="warn" icon={Star} /> : null}
            </View>
          </View>
        </View>
      )}
    </Pressable>
  );
}

export default function ShopsScreen() {
  const router = useRouter();
  const { data, isLoading, error, retry } = useApiResource(listShops);
  useRefetchOnFocus(retry);

  if (isLoading && !data) return <LoadingState label="Finding shops…" />;
  if (error && !data) return <ErrorState error={error} retry={retry} />;
  if (!data || data.length === 0) {
    return <EmptyState title="No shops yet" description="Shops near you will show up here as soon as they open." icon={Store} />;
  }

  return (
    <Canvas>
      <FlatList
        data={data}
        keyExtractor={(s) => s.shopId}
        contentContainerClassName="gap-3 p-4"
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={retry} />}
        renderItem={({ item }) => <ShopCard shop={item} onPress={() => router.push({ pathname: '/shop/[shopId]', params: { shopId: item.shopId, name: item.name } })} />}
      />
      <CartBar />
    </Canvas>
  );
}
