import { useRouter } from 'expo-router';
import { ShoppingCart, Trash2 } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { QuantityStepper } from '@/components/QuantityStepper';
import { Button, Card, Divider, IconButton, Screen } from '@/components/ui';
import { useCart } from '@/hooks/useCart';
import { formatPaise } from '@/lib/money';

export default function CartScreen() {
  const router = useRouter();
  const { cart, itemCount, subtotalPaise, add, remove, removeAll, clear } = useCart();

  if (cart.lines.length === 0 || !cart.shopId) {
    return (
      <EmptyState title="Your cart is empty" description="Add something from a shop to get started." icon={ShoppingCart}>
        <Button label="Browse shops" onPress={() => router.replace('/')} />
      </EmptyState>
    );
  }

  const shop = { shopId: cart.shopId, name: cart.shopName };

  return (
    <Screen
      footer={
        <>
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-ink dark:text-ink-dark">Subtotal ({itemCount})</Text>
            <Text className="text-xl font-extrabold text-ink dark:text-ink-dark">{formatPaise(subtotalPaise)}</Text>
          </View>
          <Button label="Checkout" onPress={() => router.push('/checkout')} />
        </>
      }
    >
      <Text className="text-xs font-bold uppercase tracking-wider text-muted dark:text-muted-dark">From {cart.shopName}</Text>
      <Card className="gap-4">
        {cart.lines.map((line, index) => (
          <View key={line.productId} className="gap-4">
            {index > 0 ? <Divider /> : null}
            <View className="flex-row items-center gap-3">
              <View className="flex-1 gap-1">
                <Text className="text-base font-bold text-ink dark:text-ink-dark">{line.name}</Text>
                <Text className="text-sm text-muted dark:text-muted-dark">
                  {formatPaise(line.pricePaise)} × {line.quantity} = {formatPaise(line.pricePaise * line.quantity)}
                </Text>
              </View>
              <QuantityStepper
                quantity={line.quantity}
                max={line.maxQuantity}
                onAdd={() => add(shop, { productId: line.productId, name: line.name, pricePaise: line.pricePaise, available: line.maxQuantity })}
                onRemove={() => remove(line.productId)}
              />
              <IconButton icon={Trash2} tone="danger" label={`Remove ${line.name}`} onPress={() => removeAll(line.productId)} />
            </View>
          </View>
        ))}
      </Card>
      <Button variant="ghost" small label="Clear cart" onPress={clear} />
    </Screen>
  );
}
