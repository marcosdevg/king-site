import {
  addDoc,
  collection,
  deleteDoc,
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
  | 'cancelado'
  | 'troca'
  | 'reembolsado';

export const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  'pendente',
  'confirmado',
  'enviado',
  'entregue',
  'troca',
  'reembolsado',
  'cancelado',
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  enviado: 'Enviado',
  entregue: 'Entregue',
  troca: 'Troca',
  reembolsado: 'Reembolsado',
  cancelado: 'Cancelado',
};

export interface OrderCoupon {
  id: string;
  code: string;
  discountPercent: number;
  discountAmount: number;
}

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

export type PaymentMethod = 'card' | 'pix' | 'boleto';

export interface ShippingService {
  id: string;
  name: string;
  carrier: string;
  deliveryDays: number;
  free?: boolean;
}

export interface Order {
  id: string;
  userId: string;
  userEmail: string;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  discount?: number;
  coupon?: OrderCoupon | null;
  total: number;
  status: OrderStatus;
  shipping: Shipping;
  shippingService?: ShippingService | null;
  paymentMethod: PaymentMethod;
  /** Stripe legacy. */
  paymentIntentId?: string | null;
  /** Mercado Pago — id da transação. */
  mpPaymentId?: number | string | null;
  /** Status interno do MP (`approved`, `pending`, `rejected`, etc.). */
  mpStatus?: string | null;
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';
  paidAt?: string | null;
  installments?: number | null;
  /** JSON serializado das linhas pra baixa de estoque (usado pelo webhook MP). */
  inventoryLines?: string;
  /** Marca que o estoque já foi descontado (idempotência client-side). */
  inventoryDeducted?: boolean;
  createdAt?: unknown;
}

export type OrderInput = Omit<Order, 'id' | 'createdAt'>;

const COLLECTION = 'orders';

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => stripUndefined(v)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue;
      out[k] = stripUndefined(v);
    }
    return out as unknown as T;
  }
  return value;
}

export async function createOrder(data: OrderInput): Promise<string> {
  const payload = stripUndefined({
    ...data,
    createdAt: serverTimestamp(),
  });
  const ref = await addDoc(collection(db, COLLECTION), payload);
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

export async function updateOrderPaymentStatus(
  orderId: string,
  paymentStatus: Order['paymentStatus']
) {
  await updateDoc(doc(db, COLLECTION, orderId), { paymentStatus });
}

export async function deleteOrder(orderId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, orderId));
}

export async function deleteOrders(ids: string[]): Promise<{ ok: number; fail: number }> {
  const results = await Promise.allSettled(ids.map((id) => deleteOrder(id)));
  const ok = results.filter((r) => r.status === 'fulfilled').length;
  return { ok, fail: results.length - ok };
}
