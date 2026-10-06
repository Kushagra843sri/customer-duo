import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { computeMapRegion } from '@/lib/deliveryMap';
import type { Coordinate } from '@/lib/deliveryMap';

interface Props {
  destination: Coordinate | null;
  driver: Coordinate | null;
}

/** If tiles have not drawn by then, say so instead of leaving a blank box. */
const MAP_LOAD_TIMEOUT_MS = 8000;

/**
 * Native map: the customer's address plus the delivery partner. The region is
 * recomputed whenever a new driver position arrives (the parent polls), so the
 * map follows the driver without any socket connection.
 */
export function TrackingMap({ destination, driver }: Props) {
  const region = computeMapRegion([destination, driver]);
  const [loaded, setLoaded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (loaded) return;
    const timer = setTimeout(() => setTimedOut(true), MAP_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [loaded]);

  if (!region) return null;

  return (
    <View className="gap-1">
      <View className="h-64 overflow-hidden rounded-2xl bg-surface2 dark:bg-surface2-dark">
        <MapView style={StyleSheet.absoluteFill} region={region} onMapLoaded={() => setLoaded(true)}>
          {destination ? <Marker coordinate={destination} title="Your address" /> : null}
          {driver ? <Marker coordinate={driver} title="Delivery partner" pinColor="blue" /> : null}
        </MapView>
      </View>
      {timedOut && !loaded ? <Text className="text-xs font-medium text-amber-600">The map is taking a while to load.</Text> : null}
    </View>
  );
}
