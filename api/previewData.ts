import { ApiError } from '@/api/errors';
import type { Address, Order, Product, Shop } from '@/api/customer';

/**
 * Sample data for the development UI preview (lib/preview.ts). A tiny
 * in-memory stand-in for the server: it exists only so screens can be viewed
 * and clicked through. It mimics the real rules (stock, one cart shop,
 * idempotent order ids, cancel only while pending) but is NOT the server.
 */
const SHOPS: Shop[] = [
  { shopId: 's1', name: 'Sharma Kirana Store', address: 'MG Road, Sector 14', imageUrl: null, rating: 4.6, isOpen: true },
  { shopId: 's2', name: 'Fresh Basket', address: 'Park Street', imageUrl: null, rating: 4.2, isOpen: true },
  { shopId: 's3', name: 'Night Owl Mart', address: 'Station Road', imageUrl: null, rating: null, isOpen: false },
];

const stock: Record<string, Product[]> = {
  s1: [
    { productId: 'p1', name: 'Toned Milk 500 ml', description: 'Fresh pouch', imageUrl: null, pricePaise: 3000, available: 12 },
    { productId: 'p2', name: 'Bread (white)', description: null, imageUrl: null, pricePaise: 4000, available: 2 },
    { productId: 'p3', name: 'Basmati Rice 1 kg', description: 'Long grain', imageUrl: null, pricePaise: 12950, available: 30 },
  ],
  s2: [
    { productId: 'p4', name: 'Tomatoes 500 g', description: null, imageUrl: null, pricePaise: 2500, available: 20 },
    { productId: 'p5', name: 'Bananas (dozen)', description: null, imageUrl: null, pricePaise: 6000, available: 8 },
  ],
};

let addresses: Address[] = [
  { addressId: 'a1', label: 'Home', fullAddress: '12 Park Street, Delhi 110001', phoneNumber: '9876543210', isDefault: true },
];
const orders: Order[] = [];
let seq = 0;

function parse(init: RequestInit): Record<string, unknown> {
  try {
    return init.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export async function previewRequest<T>(path: string, init: RequestInit): Promise<T> {
  await new Promise((r) => setTimeout(r, 250));
  const method = (init.method ?? 'GET').toUpperCase();
  const body = parse(init);
  const result = route(path, method, body);
  return result as T;
}

function route(path: string, method: string, body: Record<string, unknown>): unknown {
  if (path === '/customer/shops') return { shops: SHOPS };

  const products = path.match(/^\/customer\/shops\/([^/]+)\/products$/);
  if (products) {
    const list = stock[decodeURIComponent(products[1])];
    if (!list) throw new ApiError(404, 'Shop not found');
    return { products: list.filter((p) => p.available > 0) };
  }

  if (path === '/customer/addresses' && method === 'GET') return { addresses };
  if (path === '/customer/addresses' && method === 'POST') {
    const a: Address = {
      addressId: `a${++seq + 1}`,
      label: String(body.label),
      fullAddress: String(body.fullAddress),
      phoneNumber: String(body.phoneNumber),
      isDefault: body.isDefault === true || addresses.length === 0,
    };
    if (a.isDefault) addresses = addresses.map((x) => ({ ...x, isDefault: false }));
    addresses = [...addresses, a];
    return { address: a };
  }
  const addr = path.match(/^\/customer\/addresses\/([^/]+)$/);
  if (addr) {
    const id = decodeURIComponent(addr[1]);
    if (!addresses.some((a) => a.addressId === id)) throw new ApiError(404, 'Address not found');
    if (method === 'DELETE') {
      addresses = addresses.filter((a) => a.addressId !== id);
      if (addresses.length > 0 && !addresses.some((a) => a.isDefault)) addresses[0] = { ...addresses[0], isDefault: true };
      return null;
    }
    if (body.isDefault === true) addresses = addresses.map((a) => ({ ...a, isDefault: false }));
    addresses = addresses.map((a) => (a.addressId === id ? ({ ...a, ...body } as Address) : a));
    return { address: addresses.find((a) => a.addressId === id) };
  }

  if (path === '/customer/orders' && method === 'POST') return { order: placePreviewOrder(body) };
  if (path === '/customer/orders' && method === 'GET') return { orders: [...orders].reverse() };
  const cancel = path.match(/^\/customer\/orders\/([^/]+)\/cancel$/);
  if (cancel) {
    const o = orders.find((x) => x.orderId === decodeURIComponent(cancel[1]));
    if (!o) throw new ApiError(404, 'Order not found');
    if (o.status !== 'pending') throw new ApiError(409, 'This order can no longer be cancelled');
    o.status = 'cancelled';
    return { order: o };
  }
  const one = path.match(/^\/customer\/orders\/([^/]+)$/);
  if (one) {
    const o = orders.find((x) => x.orderId === decodeURIComponent(one[1]));
    if (!o) throw new ApiError(404, 'Order not found');
    return { order: o };
  }

  throw new ApiError(404, `No preview data for ${method} ${path}`);
}

function placePreviewOrder(body: Record<string, unknown>): Order {
  const requestId = String(body.clientRequestId);
  const existing = orders.find((o) => o.orderId === `ord_${requestId}`);
  if (existing) return existing;

  const shop = SHOPS.find((s) => s.shopId === body.shopId);
  const address = addresses.find((a) => a.addressId === body.addressId);
  if (!shop) throw new ApiError(404, 'Shop not found');
  if (!shop.isOpen) throw new ApiError(409, 'This shop is closed right now');
  if (!address) throw new ApiError(404, 'Delivery address not found');

  const wanted = (body.items as { productId: string; quantity: number }[]) ?? [];
  const items = wanted.map((w) => {
    const p = stock[shop.shopId]?.find((x) => x.productId === w.productId);
    if (!p) throw new ApiError(404, 'A product in your cart is no longer available');
    if (p.available < w.quantity) throw new ApiError(409, `Only ${p.available} of ${p.name} left`);
    return { p, quantity: w.quantity };
  });
  for (const { p, quantity } of items) p.available -= quantity;

  const subtotalPaise = items.reduce((s, { p, quantity }) => s + p.pricePaise * quantity, 0);
  const order: Order = {
    orderId: `ord_${requestId}`,
    shopId: shop.shopId,
    shopName: shop.name,
    status: 'pending',
    paymentMethod: 'cod',
    paymentStatus: 'pending',
    items: items.map(({ p, quantity }) => ({
      productId: p.productId,
      name: p.name,
      quantity,
      pricePaise: p.pricePaise,
      subtotalPaise: p.pricePaise * quantity,
    })),
    delivery: { label: address.label, fullAddress: address.fullAddress, phoneNumber: address.phoneNumber },
    pricing: { subtotalPaise, deliveryFeePaise: 0, platformFeePaise: 0, totalPaise: subtotalPaise },
    createdAt: new Date().toISOString(),
  };
  orders.push(order);
  return order;
}
