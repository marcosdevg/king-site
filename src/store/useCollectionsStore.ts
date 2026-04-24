import { create } from 'zustand';
import {
  listCollections,
  type ProductCollection,
} from '@/services/collections.service';

interface CollectionsState {
  collections: ProductCollection[];
  loading: boolean;
  fetched: boolean;
  fetch: () => Promise<void>;
  invalidate: () => Promise<void>;
}

export const useCollectionsStore = create<CollectionsState>((set, get) => ({
  collections: [],
  loading: false,
  fetched: false,
  fetch: async () => {
    if (get().loading || get().fetched) return;
    set({ loading: true });
    try {
      const list = await listCollections();
      set({ collections: list, loading: false, fetched: true });
    } catch {
      set({ loading: false, fetched: true });
    }
  },
  invalidate: async () => {
    set({ loading: true });
    try {
      const list = await listCollections();
      set({ collections: list, loading: false, fetched: true });
    } catch {
      set({ loading: false });
    }
  },
}));
