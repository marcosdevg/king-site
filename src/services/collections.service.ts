import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION = 'collections';

export interface ProductCollection {
  id: string;
  name: string;
  description?: string;
  coverImage?: string | null;
  productIds: string[];
  order: number;
  createdAt?: unknown;
}

function mapCollection(id: string, raw: Record<string, unknown>): ProductCollection {
  return {
    id,
    name: typeof raw.name === 'string' ? raw.name : '(sem nome)',
    description: typeof raw.description === 'string' ? raw.description : undefined,
    coverImage: typeof raw.coverImage === 'string' ? raw.coverImage : null,
    productIds: Array.isArray(raw.productIds)
      ? (raw.productIds.filter((v) => typeof v === 'string') as string[])
      : [],
    order: typeof raw.order === 'number' ? raw.order : 999,
    createdAt: raw.createdAt,
  };
}

export async function listCollections(): Promise<ProductCollection[]> {
  try {
    const q = query(collection(db, COLLECTION), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapCollection(d.id, d.data() as Record<string, unknown>));
  } catch {
    const snap = await getDocs(collection(db, COLLECTION));
    return snap.docs.map((d) => mapCollection(d.id, d.data() as Record<string, unknown>));
  }
}

export interface CreateCollectionInput {
  name: string;
  description?: string;
  coverImage?: string | null;
  productIds?: string[];
  order?: number;
}

export async function createCollection(input: CreateCollectionInput): Promise<string> {
  const name = (input.name || '').trim();
  if (!name) throw new Error('Nome é obrigatório');
  const payload: Record<string, unknown> = {
    name,
    productIds: Array.isArray(input.productIds) ? input.productIds : [],
    order: typeof input.order === 'number' ? input.order : 999,
    createdAt: serverTimestamp(),
  };
  if (input.description) payload.description = input.description.trim();
  if (input.coverImage) payload.coverImage = input.coverImage;
  const ref = await addDoc(collection(db, COLLECTION), payload);
  return ref.id;
}

export async function updateCollection(
  id: string,
  patch: Partial<Omit<ProductCollection, 'id' | 'createdAt'>>
): Promise<void> {
  const data: Record<string, unknown> = {};
  if (patch.name !== undefined) data.name = patch.name.trim();
  if (patch.description !== undefined) data.description = patch.description;
  if (patch.coverImage !== undefined) data.coverImage = patch.coverImage;
  if (patch.productIds !== undefined) data.productIds = patch.productIds;
  if (patch.order !== undefined) data.order = patch.order;
  await updateDoc(doc(db, COLLECTION, id), data);
}

export async function addProductToCollection(
  collectionId: string,
  productId: string
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, collectionId), {
    productIds: arrayUnion(productId),
  });
}

export async function removeProductFromCollection(
  collectionId: string,
  productId: string
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, collectionId), {
    productIds: arrayRemove(productId),
  });
}

export async function deleteCollection(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}
