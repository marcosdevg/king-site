import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { SEED_PRODUCTS } from '@/data/seedProducts';
import type { ProductCategory } from '@/config/productCategories';

export type { ProductCategory } from '@/config/productCategories';

export type ProductSize = 'P' | 'M' | 'G' | 'GG' | 'XGG';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  oldPrice?: number;
  images: string[];
  category: ProductCategory;
  sizes: ProductSize[];
  stock: number;
  featured?: boolean;
  tag?: string;
  createdAt?: unknown;
  /**
   * Estampas de costas permitidas (ids dos arquivos em `estampas/`).
   * Ausente = todas disponíveis. Array vazio = produto sem opção de costas.
   */
  allowedBackStampIds?: string[];
  /**
   * Logos de frente permitidos (ex.: king-logo-bordo).
   * Ausente = os 3 logos. Array vazio = sem opção de frente.
   */
  allowedFrontStampIds?: string[];
}

export type ProductInput = Omit<Product, 'id' | 'createdAt'>;

const COLLECTION = 'products';

export async function listProducts(): Promise<Product[]> {
  try {
    const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Product, 'id'>) }));
  } catch {
    const snap = await getDocs(collection(db, COLLECTION));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Product, 'id'>) }));
  }
}

export async function getProduct(id: string): Promise<Product | null> {
  const ref = doc(db, COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Product, 'id'>) };
}

function omitUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Record<string, unknown>;
}

export async function createProduct(data: ProductInput): Promise<string> {
  const ref = await addDoc(
    collection(db, COLLECTION),
    {
      ...omitUndefined(data as unknown as Record<string, unknown>),
      createdAt: serverTimestamp(),
    }
  );
  return ref.id;
}

export async function updateProduct(id: string, data: Record<string, unknown>) {
  await updateDoc(doc(db, COLLECTION, id), omitUndefined(data));
}

export async function deleteProduct(id: string) {
  await deleteDoc(doc(db, COLLECTION, id));
}

/**
 * Cria no Firestore as peças “demo” (mesmos ids `seed-1` …) **somente se o doc ainda não existir**.
 * Assim elas passam a aparecer no Admin para você editar fotos/textos, e na loja vêm só do banco.
 */
export async function importSeedProductsIfMissing(): Promise<{
  created: number;
  skipped: number;
}> {
  let created = 0;
  let skipped = 0;
  for (const p of SEED_PRODUCTS) {
    const ref = doc(db, COLLECTION, p.id);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      skipped += 1;
      continue;
    }
    const { id: _id, createdAt: _c, ...rest } = p as Product & { createdAt?: unknown };
    await setDoc(ref, {
      ...omitUndefined(rest as Record<string, unknown>),
      createdAt: serverTimestamp(),
    });
    created += 1;
  }
  return { created, skipped };
}
