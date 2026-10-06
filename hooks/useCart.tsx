import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { addOne, EMPTY_CART, itemCount, parseStoredCart, quantityOf, removeLine, removeOne, subtotalPaise, wouldReplaceCart } from '@/lib/cart';
import type { CartState, ProductInput } from '@/lib/cart';

const STORAGE_KEY = 'customer.cart.v1';

interface CartApi {
  cart: CartState;
  itemCount: number;
  subtotalPaise: number;
  quantityOf: (productId: string) => number;
  wouldReplaceCart: (shopId: string) => boolean;
  add: (shop: { shopId: string; name: string }, product: ProductInput) => void;
  remove: (productId: string) => void;
  removeAll: (productId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartApi | null>(null);

/**
 * The cart lives on the device only (prices are re-computed by the server at
 * checkout). Storage failures never break the app: the cart just stops
 * surviving a restart.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartState>(EMPTY_CART);
  const loaded = useRef(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => (raw ? parseStoredCart(JSON.parse(raw)) : EMPTY_CART))
      .catch(() => EMPTY_CART)
      .then((restored) => {
        if (cancelled) return;
        // Do not clobber changes made before the restore finished.
        setCart((current) => (current.lines.length > 0 ? current : restored));
        loaded.current = true;
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cart)).catch(() => undefined);
  }, [cart]);

  const add = useCallback((shop: { shopId: string; name: string }, product: ProductInput) => setCart((c) => addOne(c, shop, product)), []);
  const remove = useCallback((id: string) => setCart((c) => removeOne(c, id)), []);
  const removeAll = useCallback((id: string) => setCart((c) => removeLine(c, id)), []);
  const clear = useCallback(() => setCart(EMPTY_CART), []);

  const api = useMemo<CartApi>(
    () => ({
      cart,
      itemCount: itemCount(cart),
      subtotalPaise: subtotalPaise(cart),
      quantityOf: (id) => quantityOf(cart, id),
      wouldReplaceCart: (shopId) => wouldReplaceCart(cart, shopId),
      add,
      remove,
      removeAll,
      clear,
    }),
    [cart, add, remove, removeAll, clear]
  );

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
