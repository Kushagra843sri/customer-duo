import * as WebBrowser from 'expo-web-browser';

import { startPayment } from '@/api/customer';
import { isPreview } from '@/lib/preview';

/**
 * Opens the secure payment page for an online order and resolves when the
 * customer comes back (closes the browser). It says nothing about whether they
 * paid: the caller must ask the server (verifyPayment), which asks the provider.
 * In dev preview there is no real page, so this resolves immediately.
 */
export async function openPayment(orderId: string): Promise<void> {
  const url = await startPayment(orderId);
  if (isPreview) return;
  await WebBrowser.openBrowserAsync(url);
}
