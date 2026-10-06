import { Stack, useLocalSearchParams } from 'expo-router';
import { PackageOpen } from 'lucide-react-native';
import { FlatList, RefreshControl, Text, View } from 'react-native';

import { listProducts } from '@/api/customer';
import type { Product } from '@/api/customer';
import { CartBar } from '@/components/CartBar';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { QuantityStepper } from '@/components/QuantityStepper';
import { Canvas, Card, Muted } from '@/components/ui';
import { useApiResource } from '@/hooks/useApiResource';
import { useCart } from '@/hooks/useCart';
import { confirmAlert } from '@/lib/alerts';
import { MAX_PER_PRODUCT } from '@/lib/cart';
import { formatPaise } from '@/lib/money';

export default function ShopScreen() {
  const { shopId, name } = useLocalSearchParams<{ shopId: string; name?: string }>();
  const cart = useCart();
  const { data, isLoading, error, retry } = useApiResource(() => listProducts(shopId), [shopId]);

  // The shop's name comes from the cart when it is this shop's, otherwise from the route.
  const shopName = cart.cart.shopId === shopId ? cart.cart.shopName : (name ?? 'Shop');

  function add(product: Product) {
    const shop = { shopId, name: shopName };
    if (cart.wouldReplaceCart(shopId)) {
      confirmAlert({
        title: 'Start a new cart?',
        message: `Your cart has items from ${cart.cart.shopName}. Adding this will clear it.`,
        confirmLabel: 'Start new cart',
        destructive: true,
        onConfirm: () => cart.add(shop, product),
      });
      return;
    }
    cart.add(shop, product);
  }

  if (isLoading && !data) return <LoadingState label="Loading products…" />;
  if (error && !data) return <ErrorState error={error} retry={retry} />;

  return (
    <Canvas>
      <Stack.Screen options={{ title: shopName }} />
      {!data || data.length === 0 ? (
        <EmptyState title="Nothing available right now" description="This shop has no items in stock. Check back soon." icon={PackageOpen} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(p) => p.productId}
          contentContainerClassName="gap-3 p-4"
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={retry} />}
          renderItem={({ item }) => {
            const inCart = cart.cart.shopId === shopId ? cart.quantityOf(item.productId) : 0;
            const max = Math.min(item.available, MAX_PER_PRODUCT);
            return (
              <Card className="flex-row items-center gap-3">
                <View className="flex-1 gap-1">
                  <Text className="text-base font-bold text-ink dark:text-ink-dark">{item.name}</Text>
                  {item.description ? <Muted>{item.description}</Muted> : null}
                  <Text className="text-base font-extrabold text-ink dark:text-ink-dark">{formatPaise(item.pricePaise)}</Text>
                  {item.available <= 5 ? <Text className="text-xs font-semibold text-amber-600">Only {item.available} left</Text> : null}
                </View>
                <QuantityStepper quantity={inCart} max={max} onAdd={() => add(item)} onRemove={() => cart.remove(item.productId)} />
              </Card>
            );
          }}
        />
      )}
      <CartBar />
    </Canvas>
  );
}
