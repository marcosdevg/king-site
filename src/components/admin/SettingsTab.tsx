import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { HiOutlineCheck } from 'react-icons/hi';
import { Key, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '@/utils/cn';
import GlowButton from '@/components/ui/GlowButton';
import {
  getPixSettings,
  savePixSettings,
  type PixSettings,
} from '@/services/settings.service';
import { buildPixBRCode } from '@/services/pix';
import { useThemeStore } from '@/store/useThemeStore';

const KEY_TYPE_LABELS: Record<PixSettings['keyType'], string> = {
  cpf: 'CPF',
  cnpj: 'CNPJ',
  email: 'E-mail',
  phone: 'Celular',
  random: 'Chave aleatória',
};

export default function SettingsTab() {
  const isLight = useThemeStore((s) => s.theme === 'light');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pix, setPix] = useState<PixSettings>({
    key: '',
    keyType: 'random',
    merchantName: 'KING OVERSIZED',
    merchantCity: 'SAO PAULO',
    enabled: false,
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const cur = await getPixSettings();
        setPix(cur);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onSave = async () => {
    if (pix.enabled && !pix.key.trim()) {
      toast.error('Informe a chave PIX antes de ativar');
      return;
    }
    setSaving(true);
    try {
      await savePixSettings(pix);
      toast.success('Configurações salvas');
    } catch {
      toast.error('Erro ao salvar (verifique se está logado como admin)');
    } finally {
      setSaving(false);
    }
  };

  const previewCode = (() => {
    if (!pix.key.trim()) return '';
    try {
      return buildPixBRCode({
        key: pix.key.trim(),
        merchantName: pix.merchantName,
        merchantCity: pix.merchantCity,
        amount: 1,
        txid: 'PREVIEW',
      });
    } catch {
      return '';
    }
  })();

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="spinner-crown" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]"
    >
      <section
        className={cn(
          'rounded-xl border p-6',
          isLight
            ? 'border-black/[0.08] bg-white shadow-sm'
            : 'border-neutral-900 bg-king-jet/40'
        )}
      >
        <div className="mb-5 flex items-center gap-3 border-b border-white/5 pb-4">
          <Key className="h-5 w-5 text-king-red" aria-hidden />
          <div>
            <h3 className="heading-display text-xl text-king-fg">PIX</h3>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.28em] text-king-silver">
              Recebe pagamentos instantâneos sem intermediário
            </p>
          </div>
        </div>

        <label className="mb-5 flex cursor-pointer items-start gap-3 rounded-md border border-king-red/40 bg-king-red/[0.05] p-4">
          <input
            type="checkbox"
            checked={pix.enabled}
            onChange={(e) => setPix((p) => ({ ...p, enabled: e.target.checked }))}
            className="mt-1 h-4 w-4 accent-king-red"
          />
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-king-fg">
              Ativar pagamento via PIX no checkout
            </p>
          </div>
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-king-silver">
              Tipo de chave
            </span>
            <select
              value={pix.keyType}
              onChange={(e) =>
                setPix((p) => ({ ...p, keyType: e.target.value as PixSettings['keyType'] }))
              }
              className="select-king-dark font-mono tracking-[0.1em]"
            >
              {(Object.keys(KEY_TYPE_LABELS) as PixSettings['keyType'][]).map((k) => (
                <option key={k} value={k}>
                  {KEY_TYPE_LABELS[k]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 sm:col-span-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-king-silver">
              Chave PIX
            </span>
            <input
              type="text"
              value={pix.key}
              onChange={(e) => setPix((p) => ({ ...p, key: e.target.value }))}
              placeholder={
                pix.keyType === 'cpf'
                  ? '000.000.000-00'
                  : pix.keyType === 'cnpj'
                    ? '00.000.000/0000-00'
                    : pix.keyType === 'email'
                      ? 'pix@king.com'
                      : pix.keyType === 'phone'
                        ? '+5511999999999'
                        : 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
              }
              className="input-king-panel font-mono"
            />
            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-king-silver/60">
              Cole exatamente como está no app do seu banco
            </span>
          </label>

          <label className="flex flex-col gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-king-silver">
              Nome do beneficiário (máx. 25)
            </span>
            <input
              type="text"
              value={pix.merchantName}
              onChange={(e) =>
                setPix((p) => ({ ...p, merchantName: e.target.value.slice(0, 25) }))
              }
              maxLength={25}
              className="input-king-panel font-mono"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-king-silver">
              Cidade (máx. 15)
            </span>
            <input
              type="text"
              value={pix.merchantCity}
              onChange={(e) =>
                setPix((p) => ({ ...p, merchantCity: e.target.value.slice(0, 15) }))
              }
              maxLength={15}
              className="input-king-panel font-mono"
            />
          </label>
        </div>

        <div className="mt-7 flex items-center justify-end">
          <GlowButton onClick={onSave} disabled={saving}>
            <HiOutlineCheck /> {saving ? 'Salvando…' : 'Salvar configurações'}
          </GlowButton>
        </div>
      </section>

      <aside
        className={cn(
          'rounded-xl border p-5',
          isLight
            ? 'border-black/[0.08] bg-stone-50'
            : 'border-neutral-900 bg-king-black/40'
        )}
      >
        <div className="mb-3 flex items-center gap-2">
          <QrCode className="h-4 w-4 text-king-red" aria-hidden />
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-king-silver">
            Pré-visualização (R$ 1,00)
          </p>
        </div>
        {previewCode ? (
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-md bg-white p-3">
              <QRCodeSVG value={previewCode} size={180} level="M" />
            </div>
            <p className="text-center font-serif text-xs italic text-king-silver/70">
              Teste escaneando com seu app do banco — deve abrir um pagamento de R$ 1,00 pra sua chave.
            </p>
          </div>
        ) : (
          <p className="py-10 text-center font-serif text-sm italic text-king-silver/60">
            Preencha a chave PIX pra ver o QR Code aqui.
          </p>
        )}
      </aside>
    </motion.div>
  );
}
