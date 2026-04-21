/**
 * Índice automático das estampas KING.
 *
 * Usa `import.meta.glob` do Vite: basta jogar novas imagens (.png/.jpg/.webp)
 * dentro de `src/assets/estampas/` e elas aparecem aqui automaticamente.
 *
 * A categoria é inferida pelo prefixo do arquivo:
 *   "DROP BLESSED (1).png"   -> BLESSED
 *   "DROP CRUCIFIXO.png"     -> CRUCIFIXO
 *   "DROP FRASES (3).png"    -> FRASES
 *   "Archangel.png"          -> OUTROS
 */

export interface Stamp {
  id: string;
  name: string;
  category: string;
  src: string;
  file: string;
}

const modules = import.meta.glob(
  './*.{png,jpg,jpeg,webp,PNG,JPG,JPEG,WEBP}',
  { eager: true, query: '?url', import: 'default' }
) as Record<string, string>;

const CATEGORY_ORDER = [
  'JESUS',
  'CRUCIFIXO',
  'BLESSED',
  'FRASES',
  'IMAGENS',
  'OUTROS',
] as const;

function parseEntry(path: string, url: string): Stamp {
  const file = path.replace(/^\.\//, '');
  const base = file.replace(/\.[^.]+$/, '');

  const withoutDrop = base.replace(/^drop\s+/i, '').trim();
  const firstWord = withoutDrop.split(/[\s(_-]/)[0] ?? withoutDrop;
  const upper = firstWord.toUpperCase();

  const known = CATEGORY_ORDER.find((c) => c === upper);
  const category = known ?? 'OUTROS';

  const cleanName = base
    .replace(/^drop\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    id: file,
    name: cleanName,
    category,
    src: url,
    file,
  };
}

function naturalCompare(a: string, b: string) {
  return a.localeCompare(b, 'pt-BR', { numeric: true, sensitivity: 'base' });
}

export const STAMPS: Stamp[] = Object.entries(modules)
  .map(([path, url]) => parseEntry(path, url))
  .sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a.category as (typeof CATEGORY_ORDER)[number]);
    const bi = CATEGORY_ORDER.indexOf(b.category as (typeof CATEGORY_ORDER)[number]);
    if (ai !== bi) return ai - bi;
    return naturalCompare(a.name, b.name);
  });

export const STAMP_CATEGORIES: string[] = Array.from(
  new Set(STAMPS.map((s) => s.category))
).sort(
  (a, b) =>
    CATEGORY_ORDER.indexOf(a as (typeof CATEGORY_ORDER)[number]) -
    CATEGORY_ORDER.indexOf(b as (typeof CATEGORY_ORDER)[number])
);

export function getStampById(id: string | null | undefined): Stamp | null {
  if (!id) return null;
  return STAMPS.find((s) => s.id === id) ?? null;
}
