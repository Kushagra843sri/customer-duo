import { useRouter } from 'expo-router';
import { ShoppingCart } from 'lucide-react-native';
import { View } from 'react-native';

import { Button } from '@/components/ui';
import { useCart } from '@/hooks/useCart';
import { formatPaise } from '@/lib/money';

/** Sticky "View cart" bar; renders nothing for an empty cart. */
export function CartBar() {
  const router = useRouter();
  const { itemCount, subtotalPaise } = useCart();
  if (itemCount === 0) return null;
  return (
    <View className="gap-2 border-t border-line bg-surface p-4 dark:border-line-dark dark:bg-surface-dark">
      <Button
        icon={ShoppingCart}
        label={`View cart · ${itemCount} ${itemCount === 1 ? 'item' : 'items'} · ${formatPaise(subtotalPaise)}`}
        onPress={() => router.push('/cart')}
      />
    </View>
  );
}
