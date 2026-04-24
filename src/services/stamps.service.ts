import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/services/firebase';

const COLLECTION = 'stamps';

export function normalizeCustomId(raw: string): string {
  return (raw || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

export function isValidCustomId(raw: string): boolean {
  const id = normalizeCustomId(raw);
  return id.length >= 3 && id.length <= 60 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(id);
}

export type StampSide = 'back' | 'front';

export interface FirestoreStampDoc {
  id: string;
  name: string;
  /** Coleção / linha (ex.: "Coleção sagrada", "DROP JESUS") — usada como categoria na loja. */
  coleção: string;
  side: StampSide;
  imageUrl: string;
}

type StampInput = Omit<FirestoreStampDoc, 'id'>;

function normalizeColeção(v: string) {
  return v.trim() || 'Catálogo online';
}

function sortStamps(a: FirestoreStampDoc, b: FirestoreStampDoc) {
  const c = a.coleção.localeCompare(b.coleção, 'pt-BR');
  if (c !== 0) return c;
  return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
}

export async function listStamps(): Promise<FirestoreStampDoc[]> {
  const snap = await getDocs(collection(db, COLLECTION));
  const list: FirestoreStampDoc[] = snap.docs.map((d) => {
    const raw = d.data() as Record<string, unknown>;
    const side: StampSide = raw.side === 'front' ? 'front' : 'back';
    return {
      id: d.id,
      name: typeof raw.name === 'string' ? raw.name : '',
      coleção:
        typeof raw.coleção === 'string' && raw.coleção.trim()
          ? raw.coleção
          : 'Catálogo online',
      side,
      imageUrl: typeof raw.imageUrl === 'string' ? raw.imageUrl : '',
    };
  });
  list.sort(sortStamps);
  return list;
}

export async function createStamp(
  input: StampInput,
  customId: string
): Promise<string> {
  const id = normalizeCustomId(customId);
  if (!isValidCustomId(id)) {
    throw new Error('ID inválido. Use 3-60 caracteres: letras minúsculas, números e hífens.');
  }
  const ref = doc(db, COLLECTION, id);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    throw new Error('Já existe uma estampa com esse ID. Escolha outro.');
  }
  await setDoc(ref, {
    name: input.name.trim(),
    coleção: normalizeColeção(input.coleção),
    side: input.side,
    imageUrl: input.imageUrl,
    createdAt: serverTimestamp(),
  });
  return id;
}

export async function updateStamp(
  id: string,
  patch: Partial<Pick<StampInput, 'name' | 'coleção' | 'side' | 'imageUrl'>>
): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  const data: Record<string, unknown> = {};
  if (patch.name !== undefined) data.name = patch.name.trim();
  if (patch.coleção !== undefined) data.coleção = normalizeColeção(patch.coleção);
  if (patch.side !== undefined) data.side = patch.side;
  if (patch.imageUrl !== undefined) data.imageUrl = patch.imageUrl;
  await updateDoc(ref, data);
}

export async function deleteStamp(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}
