import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  DEFAULT_CATEGORY_SEEDS,
  slugifyCategoryName,
} from '@/config/productCategories';

const COLLECTION = 'categories';

export interface Category {
  id: string;
  name: string;
  order: number;
  createdAt?: unknown;
}

function mapCategory(id: string, raw: Record<string, unknown>): Category {
  return {
    id,
    name: typeof raw.name === 'string' ? raw.name : id,
    order: typeof raw.order === 'number' ? raw.order : 999,
    createdAt: raw.createdAt,
  };
}

export async function listCategories(): Promise<Category[]> {
  try {
    const q = query(collection(db, COLLECTION), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    if (snap.empty) return [];
    return snap.docs.map((d) => mapCategory(d.id, d.data() as Record<string, unknown>));
  } catch {
    const snap = await getDocs(collection(db, COLLECTION));
    return snap.docs.map((d) => mapCategory(d.id, d.data() as Record<string, unknown>));
  }
}

export async function createCategory(name: string, order?: number): Promise<Category> {
  const id = slugifyCategoryName(name);
  if (!id) throw new Error('Nome inválido');
  const ref = doc(db, COLLECTION, id);
  const payload = {
    name: name.trim(),
    order: typeof order === 'number' ? order : 999,
    createdAt: serverTimestamp(),
  };
  await setDoc(ref, payload, { merge: true });
  return { id, name: payload.name, order: payload.order };
}

export async function deleteCategory(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

/** Cria os seeds iniciais caso a coleção esteja vazia. */
export async function ensureDefaultCategories(): Promise<void> {
  const existing = await listCategories();
  if (existing.length > 0) return;
  for (const seed of DEFAULT_CATEGORY_SEEDS) {
    await setDoc(doc(db, COLLECTION, seed.id), {
      name: seed.name,
      order: seed.order,
      createdAt: serverTimestamp(),
    });
  }
}
