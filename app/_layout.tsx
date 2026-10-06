import '../global.css';

import { Stack, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoadingState } from '@/components/LoadingState';
import { AccentProvider, useIsDark } from '@/components/ui';
import { useHeaderOptions, useNavTheme } from '@/constants/navigation';
import { CartProvider } from '@/hooks/useCart';
import { useAuthUser } from '@/hooks/useAuthUser';
import { isPreview } from '@/lib/preview';
import { registerForPush, usePushTaps } from '@/lib/push';

/** Dev-only pill under the status bar. */
function PreviewBanner() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + 2, pointerEvents: 'none' }} className="absolute inset-x-0 top-0 z-50 items-center">
      <View className="rounded-full bg-amber-400 px-3 py-0.5">
        <Text className="text-[10px] font-bold text-black">PREVIEW · sample data</Text>
      </View>
    </View>
  );
}

function Routes() {
  const { user, isInitializing } = useAuthUser();
  const header = useHeaderOptions();

  const signedIn = !!user;
  usePushTaps(signedIn);
  useEffect(() => {
    if (signedIn) void registerForPush();
  }, [signedIn]);

  if (isInitializing) return <LoadingState />;

  return (
    <Stack screenOptions={header}>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="shop/[shopId]" options={{ title: 'Shop' }} />
        <Stack.Screen name="cart" options={{ title: 'Your cart' }} />
        <Stack.Screen name="checkout" options={{ title: 'Checkout' }} />
        <Stack.Screen name="order/[orderId]" options={{ title: 'Your order' }} />
        <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
        <Stack.Screen name="addresses" options={{ title: 'Saved addresses' }} />
        <Stack.Screen name="address-form" options={{ title: 'Address', presentation: 'modal' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const theme = useNavTheme();
  const dark = useIsDark();

  return (
    <ErrorBoundary>
      <AccentProvider role="customer">
        <ThemeProvider value={theme}>
          <StatusBar style={dark ? 'light' : 'dark'} />
          <CartProvider>
            <View className="flex-1">
              <Routes />
              {isPreview ? <PreviewBanner /> : null}
            </View>
          </CartProvider>
        </ThemeProvider>
      </AccentProvider>
    </ErrorBoundary>
  );
}
