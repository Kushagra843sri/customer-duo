import { apiRequest } from '@/api/client';

// These mirror the server DTOs (server/src/types/customerOrder.ts). Money is integer paise.

export interface Shop {
  shopId: string;
  name: string;
  address: string;
  imageUrl: string | null;
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
}

export interface PlaceOrderInput {
  /** One per checkout attempt; a retry with the same id returns the same order instead of a second one. */
  clientRequestId: string;
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
  apiRequest<{ order: Order }>('/customer/orders', { method: 'POST', ...json({ ...input, paymentMethod: 'cod' }) }).then((r) => r.order);

export const listOrders = () => apiRequest<{ orders: Order[] }>('/customer/orders').then((r) => r.orders);

export const getOrder = (orderId: string) =>
  apiRequest<{ order: Order }>(`/customer/orders/${encodeURIComponent(orderId)}`).then((r) => r.order);

export const cancelOrder = (orderId: string) =>
  apiRequest<{ order: Order }>(`/customer/orders/${encodeURIComponent(orderId)}/cancel`, { method: 'POST' }).then((r) => r.order);
