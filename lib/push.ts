import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { registerDevice, unregisterDevice } from '@/api/customer';
import { isPreview } from '@/lib/preview';

const DEVICE_ID_KEY = 'customer.deviceId.v1';

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
function installForegroundHandler() {
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
  if (isPreview || Platform.OS !== 'android') return;
  try {
    installForegroundHandler();
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
