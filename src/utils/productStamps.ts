import type { Product } from '@/services/products.service';
import { STAMPS } from '@/assets/estampas';
import { FRONT_LOGO_STAMPS } from '@/assets/logos';

/** Costas: campo ausente = todas as estampas da pasta; `[]` = nenhuma; array = só esses ids. */
export function getEffectiveBackStampIds(product: Product): string[] {
  const raw = product.allowedBackStampIds;
  if (raw === undefined) return STAMPS.map((s) => s.id);
  return raw.filter((id) => STAMPS.some((s) => s.id === id));
}

/** Frente: ausente = os 3 logos; `[]` = nenhum; array = subset. */
export function getEffectiveFrontStampIds(product: Product): string[] {
  const raw = product.allowedFrontStampIds;
  if (raw === undefined) return FRONT_LOGO_STAMPS.map((s) => s.id);
  return raw.filter((id) => FRONT_LOGO_STAMPS.some((s) => s.id === id));
}

export function productAllowsBackStamps(product: Product): boolean {
  return getEffectiveBackStampIds(product).length > 0;
}

export function productAllowsFrontStamps(product: Product): boolean {
  return getEffectiveFrontStampIds(product).length > 0;
}
