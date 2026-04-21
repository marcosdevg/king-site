import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  doc,
} from 'firebase/firestore';
import { db } from './firebase';
import type { ProductSize } from './products.service';

export type OrderStatus =
  | 'pendente'
  | 'confirmado'
  | 'enviado'
  | 'entregue'
  | 'cancelado';

export interface OrderItemStamp {
  id: string;
  name: string;
  src: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  size: ProductSize;
  quantity: number;
  stamp?: OrderItemStamp | null;
  stampFront?: OrderItemStamp | null;
}

export interface Shipping {
  fullName: string;
  phone: string;
  address: string;
  number: string;
  complement?: string;
  city: string;
  state: string;
  zip: string;
}

export interface Order {
  id: string;
  userId: string;
  userEmail: string;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  status: OrderStatus;
  shipping: Shipping;
  paymentMethod: 'pix' | 'credit' | 'boleto';
  createdAt?: unknown;
}

export type OrderInput = Omit<Order, 'id' | 'createdAt'>;

const COLLECTION = 'orders';

export async function createOrder(data: OrderInput): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listOrdersByUser(userId: string): Promise<Order[]> {
  try {
    const q = query(
      collection(db, COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Order, 'id'>) }));
  } catch {
    const q = query(collection(db, COLLECTION), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Order, 'id'>) }));
  }
}

export async function listAllOrders(): Promise<Order[]> {
  try {
    const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Order, 'id'>) }));
  } catch {
    const snap = await getDocs(collection(db, COLLECTION));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Order, 'id'>) }));
  }
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  await updateDoc(doc(db, COLLECTION, orderId), { status });
}
