import { create } from 'zustand';
import { listCategories, type Category } from '@/services/categories.service';

interface CategoriesState {
  categories: Category[];
  loading: boolean;
  fetched: boolean;
  fetch: () => Promise<void>;
  invalidate: () => Promise<void>;
}

export const useCategoriesStore = create<CategoriesState>((set, get) => ({
  categories: [],
  loading: false,
  fetched: false,
  fetch: async () => {
    if (get().loading || get().fetched) return;
    set({ loading: true });
    try {
      const list = await listCategories();
      set({ categories: list, loading: false, fetched: true });
    } catch {
      set({ loading: false, fetched: true });
    }
  },
  invalidate: async () => {
    set({ loading: true });
    try {
      const list = await listCategories();
      set({ categories: list, loading: false, fetched: true });
    } catch {
      set({ loading: false });
    }
  },
}));
