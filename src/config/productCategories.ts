/**
 * Categorias de produto (campo `category` no Firestore).
 *
 * Como adicionar uma nova coleção / categoria:
 * 1. Inclua o **id** (slug em minúsculas, sem acento, ex.: `linha-rei`) no array `PRODUCT_CATEGORIES` abaixo.
 * 2. Cadastre o **rótulo** em `PRODUCT_CATEGORY_LABELS` (texto exibido no Admin).
 * 3. Opcional: em `PRODUCT_CATEGORY_SHOP_LABELS`, um nome diferente na loja (/produtos).
 * 4. Rode o TypeScript (`npm run build`) — o tipo `ProductCategory` deriva da lista.
 * 5. Produtos antigos no Firebase continuam com o `category` antigo até você editar no Admin.
 *
 * “Coleção sacra” = categoria `colecao-sacra` (um único campo; não há entidade separada de “coleção”).
 */

export const PRODUCT_CATEGORIES = [
  'oversized',
  'camiseta',
  'moletom',
  'regata',
  'colecao-sacra',
  'tercos',
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  oversized: 'Oversized',
  camiseta: 'Camiseta',
  moletom: 'Moletom',
  regata: 'Regata',
  'colecao-sacra': 'Coleção sacra',
  tercos: 'Terços',
};

/** Rótulo na vitrine (chips / filtro). Se omitido, usa `PRODUCT_CATEGORY_LABELS`. */
export const PRODUCT_CATEGORY_SHOP_LABELS: Partial<Record<ProductCategory, string>> = {
  'colecao-sacra': 'Linha Sagrada',
  camiseta: 'Camisetas',
  moletom: 'Moletons',
  regata: 'Regatas',
};
