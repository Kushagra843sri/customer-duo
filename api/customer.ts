import { apiRequest } from '@/api/client';

// These mirror the server DTOs (server/src/types/customerOrder.ts). Money is integer paise.

export interface Shop {
  shopId: string;
  name: string;
  address: string;
  imageUrl: string | null;
  /** Storefront photos the shop owner uploaded (up to 4, first = cover). */
  images: string[];
  rating: number | null;
  isOpen: boolean;
}

export interface Product {
  productId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  pricePaise: number;
  available: number;
}

export interface Address {
  addressId: string;
  label: string;
  fullAddress: string;
  phoneNumber: string;
  isDefault: boolean;
  latitude?: number;
  longitude?: number;
}

export interface AddressInput {
  label: string;
  fullAddress: string;
  phoneNumber: string;
  isDefault?: boolean;
  latitude?: number;
  longitude?: number;
}

export interface Order {
  orderId: string;
  shopId: string;
  shopName: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  items: { productId: string; name: string; quantity: number; pricePaise: number; subtotalPaise: number }[];
  delivery: { label: string; fullAddress: string; phoneNumber: string };
  pricing: { subtotalPaise: number; deliveryFeePaise: number; platformFeePaise: number; totalPaise: number };
  createdAt: string | null;
  /** Online orders only: unpaid orders are cancelled (stock released) after this time. */
  paymentExpiresAt: string | null;
}

export type PaymentMethod = 'cod' | 'online';

export interface PlaceOrderInput {
  /** One per checkout attempt; a retry with the same id returns the same order instead of a second one. */
  clientRequestId: string;
  paymentMethod: PaymentMethod;
  shopId: string;
  addressId: string;
  items: { productId: string; quantity: number }[];
}

const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });

export const listShops = () => apiRequest<{ shops: Shop[] }>('/customer/shops').then((r) => r.shops);

export const listProducts = (shopId: string) =>
  apiRequest<{ products: Product[] }>(`/customer/shops/${encodeURIComponent(shopId)}/products`).then((r) => r.products);

export const listAddresses = () => apiRequest<{ addresses: Address[] }>('/customer/addresses').then((r) => r.addresses);

export const createAddress = (input: AddressInput) =>
  apiRequest<{ address: Address }>('/customer/addresses', { method: 'POST', ...json(input) }).then((r) => r.address);

export const updateAddress = (addressId: string, patch: Partial<Omit<AddressInput, 'latitude' | 'longitude'>>) =>
  apiRequest<{ address: Address }>(`/customer/addresses/${encodeURIComponent(addressId)}`, { method: 'PATCH', ...json(patch) }).then(
    (r) => r.address
  );

export const deleteAddress = (addressId: string) =>
  apiRequest<void>(`/customer/addresses/${encodeURIComponent(addressId)}`, { method: 'DELETE' });

export const placeOrder = (input: PlaceOrderInput) =>
  apiRequest<{ order: Order }>('/customer/orders', { method: 'POST', ...json(input) }).then((r) => r.order);

export const listOrders = () => apiRequest<{ orders: Order[] }>('/customer/orders').then((r) => r.orders);

export const getOrder = (orderId: string) =>
  apiRequest<{ order: Order }>(`/customer/orders/${encodeURIComponent(orderId)}`).then((r) => r.order);

export const cancelOrder = (orderId: string) =>
  apiRequest<{ order: Order }>(`/customer/orders/${encodeURIComponent(orderId)}/cancel`, { method: 'POST' }).then((r) => r.order);

export interface Tracking {
  /** True only while a driver is on the job and a position is known. */
  available: boolean;
  /** pending | assigned | accepted | picked_up | delivered | cancelled (customer-facing; "pending" also covers declined offers). */
  status: string;
  location?: { latitude: number; longitude: number; capturedAt: string; fresh: boolean };
  destination?: { latitude: number; longitude: number };
  updatedAt: string;
}

export const getTracking = (orderId: string) =>
  apiRequest<{ tracking: Tracking }>(`/customer/orders/${encodeURIComponent(orderId)}/tracking`).then((r) => r.tracking);

/** The 6-digit code the customer gives the delivery partner. Only available while the order is on its way. */
export const getDeliveryCode = (orderId: string) =>
  apiRequest<{ code: string }>(`/customer/orders/${encodeURIComponent(orderId)}/delivery-code`).then((r) => r.code);

export const registerDevice = (input: { deviceId: string; platform: 'ios' | 'android' | 'web'; pushToken: string }) =>
  apiRequest<unknown>('/notifications/device', { method: 'POST', ...json(input) });

export const unregisterDevice = (deviceId: string) =>
  apiRequest<void>(`/notifications/device/${encodeURIComponent(deviceId)}`, { method: 'DELETE' });

/** What this server offers. Online payment is off until Cashfree is configured on the server. */
export const getConfig = () => apiRequest<{ onlinePayment: boolean }>('/customer/config');

/** Where the customer pays for an online order. Safe to call again for the same order. */
export const startPayment = (orderId: string) =>
  apiRequest<{ checkoutUrl: string }>(`/customer/orders/${encodeURIComponent(orderId)}/payment`, { method: 'POST' }).then((r) => r.checkoutUrl);

/** Asks the server to check with the payment provider; the app never decides that an order is paid. */
export const verifyPayment = (orderId: string) =>
  apiRequest<{ order: Order }>(`/customer/orders/${encodeURIComponent(orderId)}/payment/verify`, { method: 'POST' }).then((r) => r.order);
