import { create } from 'zustand';
import { listProducts, Product } from '@/services/products.service';

interface ProductsState {
  products: Product[];
  loading: boolean;
  fetched: boolean;
  fetch: () => Promise<void>;
  /** Zera o cache para forçar nova leitura (ex.: após importar demos no admin). */
  invalidateCatalog: () => void;
  setAll: (p: Product[]) => void;
}

export const useProductsStore = create<ProductsState>((set, get) => ({
  products: [],
  loading: false,
  fetched: false,
  fetch: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const remote = await listProducts();
      set({ products: remote, loading: false, fetched: true });
    } catch {
      set({ products: [], loading: false, fetched: true });
    }
  },
  invalidateCatalog: () => set({ fetched: false }),
  setAll: (p) => set({ products: p }),
}));
