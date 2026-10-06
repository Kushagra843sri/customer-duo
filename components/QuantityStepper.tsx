import { Minus, Plus } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Button, IconButton } from '@/components/ui';

interface Props {
  quantity: number;
  /** Highest quantity allowed (stock / per-line limit). */
  max: number;
  onAdd: () => void;
  onRemove: () => void;
}

/** "Add" button that turns into  − 2 +  once the item is in the cart. */
export function QuantityStepper({ quantity, max, onAdd, onRemove }: Props) {
  if (quantity === 0) return <Button small label="Add" onPress={onAdd} disabled={max < 1} />;
  return (
    <View className="flex-row items-center gap-2">
      <IconButton icon={Minus} label="Remove one" onPress={onRemove} />
      <Text className="min-w-6 text-center text-base font-bold text-ink dark:text-ink-dark" accessibilityLabel={`Quantity ${quantity}`}>
        {quantity}
      </Text>
      <IconButton icon={Plus} label="Add one" onPress={onAdd} disabled={quantity >= max} />
    </View>
  );
}
