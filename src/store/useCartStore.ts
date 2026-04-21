import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProductSize } from '@/services/products.service';

export interface CartItemStamp {
  id: string;
  name: string;
  src: string;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  size: ProductSize;
  quantity: number;
  /** Estampa das costas (arte da pasta `estampas`). */
  stamp?: CartItemStamp | null;
  /** Estampa da frente — uma das 3 logos oficiais. */
  stampFront?: CartItemStamp | null;
}

type StampId = string | null | undefined;

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  add: (item: CartItem) => void;
  remove: (
    productId: string,
    size: ProductSize,
    stampId?: StampId,
    stampFrontId?: StampId
  ) => void;
  updateQty: (
    productId: string,
    size: ProductSize,
    qty: number,
    stampId?: StampId,
    stampFrontId?: StampId
  ) => void;
  clear: () => void;
  subtotal: () => number;
  count: () => number;
}

const sameVariant = (
  a: CartItem,
  b: {
    productId: string;
    size: ProductSize;
    stampId?: StampId;
    stampFrontId?: StampId;
  }
) =>
  a.productId === b.productId &&
  a.size === b.size &&
  (a.stamp?.id ?? null) === (b.stampId ?? null) &&
  (a.stampFront?.id ?? null) === (b.stampFrontId ?? null);

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((s) => ({ isOpen: !s.isOpen })),
      add: (item) =>
        set((s) => {
          const existing = s.items.find((i) =>
            sameVariant(i, {
              productId: item.productId,
              size: item.size,
              stampId: item.stamp?.id ?? null,
              stampFrontId: item.stampFront?.id ?? null,
            })
          );
          if (existing) {
            return {
              items: s.items.map((i) =>
                sameVariant(i, {
                  productId: item.productId,
                  size: item.size,
                  stampId: item.stamp?.id ?? null,
                  stampFrontId: item.stampFront?.id ?? null,
                })
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i
              ),
              isOpen: true,
            };
          }
          return { items: [...s.items, item], isOpen: true };
        }),
      remove: (productId, size, stampId, stampFrontId) =>
        set((s) => ({
          items: s.items.filter(
            (i) => !sameVariant(i, { productId, size, stampId, stampFrontId })
          ),
        })),
      updateQty: (productId, size, qty, stampId, stampFrontId) =>
        set((s) => ({
          items: s.items
            .map((i) =>
              sameVariant(i, { productId, size, stampId, stampFrontId })
                ? { ...i, quantity: Math.max(1, qty) }
                : i
            )
            .filter((i) => i.quantity > 0),
        })),
      clear: () => set({ items: [] }),
      subtotal: () =>
        get().items.reduce((acc, i) => acc + i.price * i.quantity, 0),
      count: () => get().items.reduce((acc, i) => acc + i.quantity, 0),
    }),
    { name: 'king-cart' }
  )
);
