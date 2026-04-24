/**
 * Categorias de produto.
 *
 * As categorias agora são dinâmicas (coleção `categories` no Firestore). Este arquivo
 * guarda apenas os rótulos legados dos seeds de demonstração — qualquer categoria nova
 * é criada pelo admin e lida do Firebase via `useCategoriesStore`.
 */

export type ProductCategory = string;

export const DEFAULT_CATEGORY_SEEDS: Array<{ id: string; name: string; order: number }> = [
  { id: 'oversized', name: 'Oversized', order: 0 },
  { id: 'tercos', name: 'Terços', order: 1 },
];

export const LEGACY_CATEGORY_LABELS: Record<string, string> = {
  oversized: 'Oversized',
  camiseta: 'Camiseta',
  moletom: 'Moletom',
  regata: 'Regata',
  'colecao-sacra': 'Coleção sacra',
  tercos: 'Terços',
};

/** Usado como fallback quando uma categoria não existe mais no Firestore. */
export const PRODUCT_CATEGORY_LABELS: Record<string, string> = LEGACY_CATEGORY_LABELS;

/** Mantido temporariamente para seeds antigos; categorias novas vêm do Firestore. */
export const PRODUCT_CATEGORIES: readonly string[] = Object.keys(LEGACY_CATEGORY_LABELS);

export function slugifyCategoryName(raw: string): string {
  return (raw || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);
}
