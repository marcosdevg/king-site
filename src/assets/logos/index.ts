/** Logos oficiais KING (PNG com transparência). */
import logoBordo from './KING - BORDO.png';
import logoBranco from './KING - BRANCO.png';
import logoPreto from './KING - PRETO.png';

export { logoBordo, logoBranco, logoPreto };

/** Opções de estampa da frente da peça (apenas estas 3 variantes de logo). */
export interface FrontLogoStamp {
  id: string;
  name: string;
  src: string;
}

/** Id da variante preta — útil para estilo (logo escuro em fundo escuro). */
export const FRONT_LOGO_PRETO_ID = 'king-logo-preto';

/**
 * Drop-shadow branco (mais forte) para o PNG preto legível em fundo #000.
 * Use no `<img>` do logo preto (seletor de frente, miniaturas na sacola, etc.).
 */
export const kingLogoPretoOnDarkImgClass =
  'drop-shadow-[0_0_2px_rgba(255,255,255,1)] drop-shadow-[0_0_10px_rgba(255,255,255,0.72)] drop-shadow-[0_0_28px_rgba(255,255,255,0.45)]';

export const FRONT_LOGO_STAMPS: FrontLogoStamp[] = [
  { id: 'king-logo-bordo', name: 'KING · Bordô', src: logoBordo },
  { id: 'king-logo-branco', name: 'KING · Branco', src: logoBranco },
  { id: FRONT_LOGO_PRETO_ID, name: 'KING · Preto', src: logoPreto },
];
