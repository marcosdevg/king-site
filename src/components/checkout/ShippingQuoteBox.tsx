import { useState } from 'react';
import { Truck, CheckCircle2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/utils/cn';
import { formatBRL } from '@/utils/format';
import { quoteShipping, type ShippingOption } from '@/services/checkout.api';

type Props = {
  cep: string;
  itemsCount: number;
  selected?: ShippingOption | null;
  onSelect: (option: ShippingOption | null) => void;
};

export default function ShippingQuoteBox({ cep, itemsCount, selected, onSelect }: Props) {
  const [options, setOptions] = useState<ShippingOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [queried, setQueried] = useState(false);
  const [isFree, setIsFree] = useState(false);

  const cepDigits = (cep ?? '').replace(/\D/g, '');
  const canQuote = cepDigits.length === 8;

  const run = async () => {
    if (!canQuote) {
      toast.error('Informe um CEP válido (8 dígitos)');
      return;
    }
    setLoading(true);
    try {
      const { options: opts, freeByLocation } = await quoteShipping({
        cep: cepDigits,
        itemsCount,
      });
      setOptions(opts);
      setIsFree(freeByLocation);
      setQueried(true);
      if (opts.length > 0) onSelect(opts[0]);
      if (freeByLocation) toast.success('Entrega grátis na região KING!');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao cotar frete';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-md border border-white/10 bg-king-black/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-king-silver">
          <Truck className="h-4 w-4" />
          <span className="font-mono text-[11px] uppercase tracking-[0.25em]">
            Calcular frete
          </span>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={!canQuote || loading}
          className={cn(
            'flex items-center gap-2 border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.25em] transition',
            canQuote && !loading
              ? 'border-king-red text-king-red hover:bg-king-red hover:text-king-bone'
              : 'cursor-not-allowed border-white/5 text-king-silver/40'
          )}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {queried ? 'Recalcular' : 'Calcular'}
        </button>
      </div>

      {isFree && (
        <div className="mt-4 flex items-start gap-3 rounded border border-emerald-500/30 bg-emerald-500/10 p-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-emerald-300">
              Entrega grátis
            </p>
            <p className="mt-1 font-serif text-xs italic text-king-silver">
              Este CEP está na região de entrega direta da KING. Frete por conta da casa.
            </p>
          </div>
        </div>
      )}

      {!isFree && options.length > 0 && (
        <ul className="mt-4 space-y-2">
          {options.map((o) => {
            const active = selected?.id === o.id;
            return (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => onSelect(o)}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 border px-3 py-2.5 text-left transition',
                    active
                      ? 'border-king-red bg-king-red/10 shadow-glow-red/20'
                      : 'border-white/10 hover:border-king-red/60'
                  )}
                >
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-king-fg">
                      {o.name}
                    </p>
                    <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-king-silver/70">
                      {o.carrier} · {o.deliveryDays} dia(s) úteis
                    </p>
                  </div>
                  <span className="font-display text-sm text-king-fg">
                    {o.price === 0 ? 'Grátis' : formatBRL(o.price)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {queried && options.length === 0 && !isFree && (
        <p className="mt-3 font-serif text-xs italic text-king-silver/70">
          Nenhuma opção de frete encontrada para este CEP.
        </p>
      )}
    </div>
  );
}
