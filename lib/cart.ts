/** Pure cart logic (no React, no storage) so it is easy to reason about and test. One shop per cart. */
export interface CartLine {
  productId: string;
  name: string;
  pricePaise: number;
  quantity: number;
  /** Stock the server reported when the item was added; the server re-checks at checkout. */
  maxQuantity: number;
}

export interface CartState {
  shopId: string | null;
  shopName: string;
  lines: CartLine[];
}

export const EMPTY_CART: CartState = { shopId: null, shopName: '', lines: [] };

/** Server limit per product line. */
export const MAX_PER_PRODUCT = 50;

export interface ProductInput {
  productId: string;
  name: string;
  pricePaise: number;
  available: number;
}

export function itemCount(cart: CartState): number {
  return cart.lines.reduce((sum, l) => sum + l.quantity, 0);
}

export function subtotalPaise(cart: CartState): number {
  return cart.lines.reduce((sum, l) => sum + l.pricePaise * l.quantity, 0);
}

export function quantityOf(cart: CartState, productId: string): number {
  return cart.lines.find((l) => l.productId === productId)?.quantity ?? 0;
}

/** True when adding from `shopId` would silently drop a cart that belongs to another shop. */
export function wouldReplaceCart(cart: CartState, shopId: string): boolean {
  return cart.shopId !== null && cart.shopId !== shopId && cart.lines.length > 0;
}

/** Adds one unit (starting a fresh cart if it was another shop's or empty). Stops at stock / the per-line limit. */
export function addOne(cart: CartState, shop: { shopId: string; name: string }, product: ProductInput): CartState {
  const base: CartState = cart.shopId === shop.shopId ? cart : { shopId: shop.shopId, shopName: shop.name, lines: [] };
  const cap = Math.min(product.available, MAX_PER_PRODUCT);
  const existing = base.lines.find((l) => l.productId === product.productId);
  if (!existing) {
    if (cap < 1) return base;
    return {
      ...base,
      lines: [
        ...base.lines,
        { productId: product.productId, name: product.name, pricePaise: product.pricePaise, quantity: 1, maxQuantity: cap },
      ],
    };
  }
  if (existing.quantity >= cap) return base;
  return {
    ...base,
    lines: base.lines.map((l) => (l.productId === product.productId ? { ...l, quantity: l.quantity + 1, maxQuantity: cap } : l)),
  };
}

export function removeOne(cart: CartState, productId: string): CartState {
  const lines = cart.lines
    .map((l) => (l.productId === productId ? { ...l, quantity: l.quantity - 1 } : l))
    .filter((l) => l.quantity > 0);
  return lines.length === 0 ? EMPTY_CART : { ...cart, lines };
}

export function removeLine(cart: CartState, productId: string): CartState {
  const lines = cart.lines.filter((l) => l.productId !== productId);
  return lines.length === 0 ? EMPTY_CART : { ...cart, lines };
}

/** Defensive parse of whatever was persisted; anything malformed becomes an empty cart. */
export function parseStoredCart(raw: unknown): CartState {
  if (!raw || typeof raw !== 'object') return EMPTY_CART;
  const r = raw as Partial<CartState>;
  if (typeof r.shopId !== 'string' || typeof r.shopName !== 'string' || !Array.isArray(r.lines)) return EMPTY_CART;
  const lines: CartLine[] = [];
  for (const l of r.lines as Partial<CartLine>[]) {
    if (
      typeof l?.productId === 'string' &&
      typeof l.name === 'string' &&
      Number.isInteger(l.pricePaise) &&
      Number.isInteger(l.quantity) &&
      Number.isInteger(l.maxQuantity) &&
      (l.quantity as number) > 0
    ) {
      lines.push({
        productId: l.productId,
        name: l.name,
        pricePaise: l.pricePaise as number,
        quantity: l.quantity as number,
        maxQuantity: l.maxQuantity as number,
      });
    }
  }
  return lines.length === 0 ? EMPTY_CART : { shopId: r.shopId, shopName: r.shopName, lines };
}
