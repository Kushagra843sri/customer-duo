import { Text } from 'react-native';

import type { Coordinate } from '@/lib/deliveryMap';

interface Props {
  destination: Coordinate | null;
  driver: Coordinate | null;
}

// react-native-maps has no web implementation: show the position as text instead.
export function TrackingMap({ driver }: Props) {
  if (!driver) return null;
  return (
    <Text className="text-sm text-muted dark:text-muted-dark" accessibilityRole="text">
      Delivery partner location: {driver.latitude.toFixed(4)}, {driver.longitude.toFixed(4)}. The live map is available in the iOS and Android
      apps.
    </Text>
  );
}
