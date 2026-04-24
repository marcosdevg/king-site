import { create } from 'zustand';
import type { Stamp } from '@/assets/estampas';
import type { FrontLogoStamp } from '@/assets/logos';
import { listStamps, type FirestoreStampDoc } from '@/services/stamps.service';

/** Prefixo dos ids Firestore no catálogo. */
export const FB_STAMP_PREFIX = 'fb_';

export function firebaseStampId(docId: string) {
  return `${FB_STAMP_PREFIX}${docId}`;
}

export function stripFirebaseStampId(id: string): string | null {
  if (!id.startsWith(FB_STAMP_PREFIX)) return null;
  return id.slice(FB_STAMP_PREFIX.length);
}

function docToBackStamp(d: FirestoreStampDoc): Stamp | null {
  if (d.side !== 'back') return null;
  return {
    id: firebaseStampId(d.id),
    name: d.name,
    category: d.coleção.trim() || 'Catálogo online',
    src: d.imageUrl,
    file: d.id,
  };
}

function docToFrontStamp(d: FirestoreStampDoc): FrontLogoStamp | null {
  if (d.side !== 'front') return null;
  return {
    id: firebaseStampId(d.id),
    name: d.name,
    src: d.imageUrl,
  };
}

interface StampsState {
  mergedBack: Stamp[];
  mergedFront: FrontLogoStamp[];
  loading: boolean;
  fetched: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  /** Após CRUD no admin — recarrega do Firestore. */
  invalidate: () => Promise<void>;
}

export const useStampsStore = create<StampsState>((set, get) => ({
  mergedBack: [],
  mergedFront: [],
  loading: false,
  fetched: false,
  error: null,
  fetch: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const docs = await listStamps();
      const rb: Stamp[] = [];
      const rf: FrontLogoStamp[] = [];
      for (const d of docs) {
        const b = docToBackStamp(d);
        if (b) rb.push(b);
        const f = docToFrontStamp(d);
        if (f) rf.push(f);
      }
      set({ mergedBack: rb, mergedFront: rf, fetched: true, loading: false });
    } catch (e) {
      console.error(e);
      set({
        error: e instanceof Error ? e.message : 'Erro ao carregar estampas',
        loading: false,
        mergedBack: [],
        mergedFront: [],
        fetched: true,
      });
    }
  },
  invalidate: async () => {
    set({ fetched: false });
    await get().fetch();
  },
}));
