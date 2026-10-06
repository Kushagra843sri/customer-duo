import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { registerDevice, unregisterDevice } from '@/api/customer';
import { isPreview } from '@/lib/preview';

const DEVICE_ID_KEY = 'customer.deviceId.v1';

type NotificationsModule = typeof import('expo-notifications');

/**
 * The notifications package is loaded only when push can actually work: an
 * Android development/production build. In Expo Go (SDK 53+) merely importing
 * it throws, which used to take the whole app down at start-up, so it is never
 * imported at the top of the file, and any failure to load it just means "no push"
 * (the in-app inbox still shows everything).
 */
function loadNotifications(): NotificationsModule | null {
  if (isPreview || Platform.OS !== 'android') return null;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null; // Expo Go
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications') as NotificationsModule;
  } catch {
    return null;
  }
}

/** Stable per-install id (the server scopes it to the signed-in uid). */
async function getDeviceId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (existing && /^[A-Za-z0-9._-]{1,128}$/.test(existing)) return existing;
  } catch {
    // fall through and make a new one
  }
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  try {
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  } catch {
    // an unstored id just means a new registration next launch
  }
  return id;
}

let handlerInstalled = false;

/** Show notifications that arrive while the app is open, too. */
function installForegroundHandler(Notifications: NotificationsModule) {
  if (handlerInstalled) return;
  handlerInstalled = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

/**
 * Asks for permission and registers this device for order updates. Best
 * effort and silent: it never throws, never blocks the UI, and does nothing
 * where push cannot work (web, preview, Expo Go, iOS until Apple push is set up).
 * Only the push token and platform are sent; the uid comes from the server's
 * verified token.
 */
export async function registerForPush(): Promise<void> {
  const Notifications = loadNotifications();
  if (!Notifications) return;
  try {
    installForegroundHandler(Notifications);
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Order updates',
      importance: Notifications.AndroidImportance.DEFAULT,
    });

    const existing = await Notifications.getPermissionsAsync();
    const granted = existing.granted || (await Notifications.requestPermissionsAsync()).granted;
    if (!granted) return;

    const token = await Notifications.getDevicePushTokenAsync();
    if (typeof token.data !== 'string' || token.data.length < 20) return;
    await registerDevice({ deviceId: await getDeviceId(), platform: 'android', pushToken: token.data });
  } catch {
    // Expo Go / no Firebase config / offline: the order screen still polls, so nothing is lost.
  }
}

/** Stops order notifications for this device (called on sign-out, before the session ends). */
export async function unregisterFromPush(): Promise<void> {
  if (isPreview || Platform.OS !== 'android') return;
  try {
    await unregisterDevice(await getDeviceId());
  } catch {
    // best effort
  }
}

/**
 * Opens the order when a push notification is tapped. The notification only
 * carries a type and an order id (no personal data); the order screen itself
 * checks the order belongs to the signed-in customer.
 */
export function usePushTaps(signedIn: boolean): void {
  const router = useRouter();
  useEffect(() => {
    const Notifications = signedIn ? loadNotifications() : null;
    if (!Notifications) return;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const orderId = response.notification.request.content.data?.orderId;
      if (typeof orderId === 'string' && /^[A-Za-z0-9_-]{1,200}$/.test(orderId)) {
        router.push({ pathname: '/order/[orderId]', params: { orderId } });
      } else {
        router.push('/notifications');
      }
    });
    return () => sub.remove();
  }, [signedIn, router]);
}
