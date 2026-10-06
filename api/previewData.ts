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

/** The sample "shop and driver" move an order along by themselves, a step every few seconds. */
const STEP_MS = 5000;
const FLOW = ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery'];
const DESTINATION = { latitude: 28.6139, longitude: 77.209 };
const SHOP_POINT = { latitude: 28.6, longitude: 77.18 };

/** Online orders the sample customer has "paid" for, and when (the sample shop only sees an order after it is paid). */
const paidAt = new Map<string, number>();

/** Sample inbox: items appear as the sample order moves along (same wording as the server). */
interface PreviewNote {
  id: string;
  type: string;
  title: string;
  body: string;
  orderId: string | null;
  createdAt: string;
  read: boolean;
}
const NOTE_COPY: Record<string, { title: string; body: string }> = {
  payment_confirmed: { title: 'Payment received', body: 'Your payment was successful. The shop will start on your order.' },
  order_confirmed: { title: 'Order confirmed', body: 'The shop accepted your order.' },
  driver_picked_up: { title: 'Order picked up', body: 'Your order is on its way.' },
  driver_nearby: { title: 'Your delivery partner is nearby', body: 'Get your delivery code ready: your order will arrive shortly.' },
};
const inbox: PreviewNote[] = [];
function notifyOnce(type: keyof typeof NOTE_COPY, orderId: string) {
  const id = `${type}:${orderId}`;
  if (inbox.some((n) => n.id === id)) return;
  inbox.unshift({ id, type, ...NOTE_COPY[type], orderId, createdAt: new Date().toISOString(), read: false });
}
const paying = new Set<string>();

const startedAt = (order: Order) => paidAt.get(order.orderId) ?? new Date(order.createdAt ?? Date.now()).getTime();

function advance(order: Order): Order {
  if (['delivered', 'cancelled', 'rejected'].includes(order.status) || !order.createdAt) return order;
  if (order.paymentStatus === 'awaiting_payment') return order;
  const steps = Math.min(FLOW.length - 1, Math.floor((Date.now() - startedAt(order)) / STEP_MS));
  order.status = FLOW[steps];
  if (steps >= FLOW.indexOf('confirmed')) notifyOnce('order_confirmed', order.orderId);
  if (order.status === 'out_for_delivery') {
    notifyOnce('driver_picked_up', order.orderId);
    if (Date.now() - startedAt(order) >= 9 * STEP_MS) notifyOnce('driver_nearby', order.orderId);
  }
  return order;
}

function previewTracking(order: Order) {
  const now = new Date().toISOString();
  const base = { destination: DESTINATION, updatedAt: now };
  switch (order.status) {
    case 'ready_for_pickup':
      return { ...base, available: true, status: 'accepted', location: { ...SHOP_POINT, capturedAt: now, fresh: true } };
    case 'out_for_delivery': {
      const t = Math.min(1, (Date.now() - startedAt(order) - 4 * STEP_MS) / (6 * STEP_MS));
      const location = {
        latitude: SHOP_POINT.latitude + (DESTINATION.latitude - SHOP_POINT.latitude) * t,
        longitude: SHOP_POINT.longitude + (DESTINATION.longitude - SHOP_POINT.longitude) * t,
        capturedAt: now,
        fresh: true,
      };
      return { ...base, available: true, status: 'picked_up', location };
    }
    case 'preparing':
      return { ...base, available: false, status: 'assigned' };
    default:
      return { updatedAt: now, available: false, status: 'pending' };
  }
}

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
  if (path === '/customer/config') return { onlinePayment: true };

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
  if (path === '/customer/orders' && method === 'GET') return { orders: [...orders].reverse().map(advance) };
  const trk = path.match(/^\/customer\/orders\/([^/]+)\/tracking$/);
  if (trk) {
    const o = orders.find((x) => x.orderId === decodeURIComponent(trk[1]));
    if (!o) throw new ApiError(404, 'Order not found');
    return { tracking: previewTracking(advance(o)) };
  }
  const code = path.match(/^\/customer\/orders\/([^/]+)\/delivery-code$/);
  if (code) {
    const o = orders.find((x) => x.orderId === decodeURIComponent(code[1]));
    if (!o) throw new ApiError(404, 'Order not found');
    if (advance(o).status !== 'out_for_delivery') throw new ApiError(409, 'The delivery code is available once your order is on its way.');
    return { code: '482913' };
  }
  if (path === '/notifications' && method === 'GET') {
    return { notifications: inbox, unread: inbox.filter((n) => !n.read).length };
  }
  if (path === '/notifications/read-all') {
    const marked = inbox.filter((n) => !n.read).length;
    inbox.forEach((n) => (n.read = true));
    return { marked };
  }
  const readOne = path.match(/^\/notifications\/([^/]+)\/read$/);
  if (readOne) {
    const n = inbox.find((x) => x.id === decodeURIComponent(readOne[1]));
    if (!n) throw new ApiError(404, 'Notification not found.');
    n.read = true;
    return null;
  }
  if (path.startsWith('/notifications/device')) return null;
  const pay = path.match(/^\/customer\/orders\/([^/]+)\/payment(\/verify)?$/);
  if (pay) {
    const o = orders.find((x) => x.orderId === decodeURIComponent(pay[1]));
    if (!o) throw new ApiError(404, 'Order not found');
    if (o.paymentMethod !== 'online') throw new ApiError(409, 'This is not an online-payment order.');
    if (pay[2]) {
      // verify: the sample provider reports "paid" once the customer has been through the payment page
      if (o.paymentStatus === 'awaiting_payment' && paying.has(o.orderId)) {
        o.paymentStatus = 'paid';
        o.paymentExpiresAt = null;
        paidAt.set(o.orderId, Date.now());
        notifyOnce('payment_confirmed', o.orderId);
      }
      return { order: advance(o) };
    }
    if (o.paymentStatus !== 'awaiting_payment') throw new ApiError(409, 'This order is no longer waiting for payment.');
    paying.add(o.orderId);
    return { checkoutUrl: 'https://preview.invalid/pay' };
  }
  const cancel = path.match(/^\/customer\/orders\/([^/]+)\/cancel$/);
  if (cancel) {
    const o = orders.find((x) => x.orderId === decodeURIComponent(cancel[1]));
    if (!o) throw new ApiError(404, 'Order not found');
    if (advance(o).status !== 'pending') throw new ApiError(409, 'This order can no longer be cancelled');
    if (o.paymentMethod === 'online' && o.paymentStatus === 'paid') {
      throw new ApiError(409, 'This order is already paid, so it cannot be cancelled in the app. Please contact support.');
    }
    if (o.paymentStatus === 'awaiting_payment') o.paymentStatus = 'cancelled';
    o.status = 'cancelled';
    return { order: o };
  }
  const one = path.match(/^\/customer\/orders\/([^/]+)$/);
  if (one) {
    const o = orders.find((x) => x.orderId === decodeURIComponent(one[1]));
    if (!o) throw new ApiError(404, 'Order not found');
    return { order: advance(o) };
  }

  throw new ApiError(404, `No preview data for ${method} ${path}`);
}

function placePreviewOrder(body: Record<string, unknown>): Order {
  const requestId = String(body.clientRequestId);
  const online = body.paymentMethod === 'online';
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
    paymentMethod: online ? 'online' : 'cod',
    paymentStatus: online ? 'awaiting_payment' : 'pending',
    paymentExpiresAt: online ? new Date(Date.now() + 15 * 60_000).toISOString() : null,
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
