import { Store } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Image, Text, View } from 'react-native';

import { usePalette } from '@/components/ui';

interface Props {
  images: string[];
  shopName: string;
  /** 'cover' = just the first photo (shop list); 'gallery' = swipeable photos with dots (shop page). */
  mode: 'cover' | 'gallery';
}

const RATIO = 16 / 9;

/** Blank state: the shop has not added photos yet. Shows a store icon so cards keep a steady height. */
function Placeholder() {
  const palette = usePalette();
  return (
    <View style={{ aspectRatio: RATIO }} className="w-full items-center justify-center bg-canvas dark:bg-canvas-dark">
      <Store size={36} color={palette.muted} />
    </View>
  );
}

/** The shop owner's storefront photos, so customers recognise a shop by sight. */
export function ShopPhotos({ images, shopName, mode }: Props) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);

  if (images.length === 0) return <Placeholder />;

  if (mode === 'cover') {
    return (
      <View style={{ aspectRatio: RATIO }} className="w-full overflow-hidden bg-canvas dark:bg-canvas-dark">
        <Image source={{ uri: images[0] }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel={`${shopName} storefront`} />
        {images.length > 1 ? (
          <View className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5">
            <Text className="text-xs font-semibold text-white">{images.length} photos</Text>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={{ aspectRatio: RATIO }} className="w-full overflow-hidden bg-canvas dark:bg-canvas-dark" onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <FlatList
          data={images}
          keyExtractor={(uri) => uri}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item, index: i }) => (
            <Image source={{ uri: item }} style={{ width, height: '100%' }} resizeMode="cover" accessibilityLabel={`${shopName} photo ${i + 1} of ${images.length}`} />
          )}
        />
      ) : null}
      {images.length > 1 ? (
        <View className="absolute bottom-2 w-full flex-row justify-center gap-1.5" pointerEvents="none">
          {images.map((uri, i) => (
            <View key={uri} className={`h-1.5 w-1.5 rounded-full ${i === index ? 'bg-white' : 'bg-white/50'}`} />
          ))}
        </View>
      ) : null}
    </View>
  );
}
