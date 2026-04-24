import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { HiOutlinePencil, HiOutlineTrash, HiOutlineUpload, HiOutlineX } from 'react-icons/hi';
import {
  createStamp,
  deleteStamp,
  isValidCustomId,
  listStamps,
  normalizeCustomId,
  updateStamp,
  type FirestoreStampDoc,
  type StampSide,
} from '@/services/stamps.service';
import { uploadStampImage } from '@/services/storage.service';
import { useStampsStore } from '@/store/useStampsStore';
import { cn } from '@/utils/cn';
import AdminPaginationBar, { ADMIN_PAGE_SIZE } from '@/components/admin/AdminPaginationBar';

type EditorMode = 'create' | 'edit';

export default function StampsTab() {
  const [rows, setRows] = useState<FirestoreStampDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [coleçãoFilter, setColeçãoFilter] = useState<string>('__all__');
  const [editor, setEditor] = useState<{
    mode: EditorMode;
    doc?: FirestoreStampDoc;
  } | null>(null);
  const [page, setPage] = useState(1);

  const invalidateCatalog = useStampsStore((s) => s.invalidate);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listStamps();
      setRows(list);
    } catch {
      toast.error('Erro ao carregar estampas. Confira regras Firestore (coleção `stamps`).');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const coleções = useMemo(() => {
    const u = new Set(rows.map((r) => r.coleção).filter(Boolean));
    return Array.from(u).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [rows]);

  const filtered = useMemo(() => {
    if (coleçãoFilter === '__all__') return rows;
    return rows.filter((r) => r.coleção === coleçãoFilter);
  }, [rows, coleçãoFilter]);

  const stampPageCount = Math.max(1, Math.ceil(filtered.length / ADMIN_PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [coleçãoFilter]);

  useEffect(() => {
    setPage((p) => Math.min(p, stampPageCount));
  }, [stampPageCount]);

  const filteredPageItems = useMemo(() => {
    const start = (page - 1) * ADMIN_PAGE_SIZE;
    return filtered.slice(start, start + ADMIN_PAGE_SIZE);
  }, [filtered, page]);

  const onSaved = async () => {
    setEditor(null);
    await load();
    await invalidateCatalog();
  };

  return (
    <div className="space-y-8">
      

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <label className="font-mono text-[10px] uppercase tracking-[0.28em] text-king-silver">
            Coleção
          </label>
          <select
            value={coleçãoFilter}
            onChange={(e) => setColeçãoFilter(e.target.value)}
            className="select-king-dark mt-1.5 max-w-xs font-mono text-xs"
          >
            <option value="__all__">Todas as coleções</option>
            {coleções.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => setEditor({ mode: 'create' })}
          className="inline-flex items-center justify-center gap-2 border border-king-red bg-king-red px-5 py-3 font-mono text-[11px] uppercase tracking-[0.28em] text-white shadow-sm transition hover:bg-king-glow hover:shadow-glow-red"
        >
          <HiOutlineUpload className="text-lg" /> Nova estampa
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="spinner-crown" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center font-serif italic text-king-silver/70">
          Nenhuma estampa Firebase neste filtro. Use &quot;Nova estampa&quot; para enviar a
          primeira.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-king-jet font-mono text-[10px] uppercase tracking-[0.25em] text-king-silver/70">
              <tr>
                <th className="p-4">Prévia</th>
                <th className="p-4">Nome</th>
                <th className="p-4">Coleção</th>
                <th className="p-4">Lado</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredPageItems.map((r) => (
                <tr key={r.id} className="border-t border-white/5 hover:bg-king-black/25">
                  <td className="p-3">
                    <img
                      src={r.imageUrl}
                      alt=""
                      className="h-16 w-14 rounded object-contain ring-1 ring-white/10"
                    />
                  </td>
                  <td className="p-3 font-display text-king-fg">{r.name}</td>
                  <td className="p-3 font-mono text-xs text-king-silver">{r.coleção}</td>
                  <td className="p-3 font-mono text-[10px] uppercase tracking-[0.2em] text-king-red">
                    {r.side === 'back' ? 'Costas' : 'Frente'}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => setEditor({ mode: 'edit', doc: r })}
                      className="mr-2 inline-flex h-9 w-9 items-center justify-center border border-white/10 text-king-silver transition hover:border-king-red hover:text-king-fg"
                      aria-label="Editar"
                    >
                      <HiOutlinePencil />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm(`Remover a estampa “${r.name}” do Firebase?`)) return;
                        try {
                          await deleteStamp(r.id);
                          toast.success('Removida');
                          await onSaved();
                        } catch {
                          toast.error('Erro ao remover');
                        }
                      }}
                      className="inline-flex h-9 w-9 items-center justify-center border border-white/10 text-king-silver transition hover:border-king-red hover:text-king-red"
                      aria-label="Excluir"
                    >
                      <HiOutlineTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <AdminPaginationBar page={page} totalItems={filtered.length} onPageChange={setPage} />
        </div>
      )}

      {editor && (
        <StampEditorModal
          mode={editor.mode}
          initial={editor.doc}
          existingColeções={coleções}
          onClose={() => setEditor(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}

function StampEditorModal({
  mode,
  initial,
  existingColeções,
  onClose,
  onSaved,
}: {
  mode: EditorMode;
  initial?: FirestoreStampDoc;
  existingColeções: string[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [coleção, setColeção] = useState(initial?.coleção ?? '');
  const [side, setSide] = useState<StampSide>(initial?.side ?? 'back');
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? '');
  const [customId, setCustomId] = useState<string>(initial?.id ?? '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const datalistId = 'coleções-sugeridas';

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f?.type.startsWith('image/')) {
      toast.error('Selecione uma imagem');
      return;
    }
    if (f.size > 8 * 1024 * 1024) {
      toast.error('Máximo 8MB');
      return;
    }
    setUploading(true);
    try {
      const url = await uploadStampImage(f, side);
      setImageUrl(url);
      toast.success('Imagem enviada');
    } catch {
      toast.error('Falha no upload (login admin e regras Storage em stamps/)');
    } finally {
      setUploading(false);
    }
  };

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const submit = async () => {
    if (mode === 'create' && !isValidCustomId(customId)) {
      toast.error('ID único inválido (3-60 caracteres, letras minúsculas, números e hífens)');
      return;
    }
    if (!name.trim()) {
      toast.error('Informe o nome da estampa');
      return;
    }
    if (!imageUrl.trim()) {
      toast.error('Envie uma imagem ou informe URL');
      return;
    }
    setSaving(true);
    try {
      if (mode === 'create') {
        await createStamp(
          {
            name: name.trim(),
            coleção: coleção.trim(),
            side,
            imageUrl: imageUrl.trim(),
          },
          customId
        );
        toast.success('Estampa criada');
      } else if (initial) {
        await updateStamp(initial.id, {
          name: name.trim(),
          coleção: coleção.trim(),
          side,
          imageUrl: imageUrl.trim(),
        });
        toast.success('Estampa atualizada');
      }
      await onSaved();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao gravar no Firestore';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      data-king-modal
      className="fixed inset-0 z-[10050] overflow-y-auto overflow-x-hidden bg-black/75 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex min-h-[100dvh] w-full justify-center px-3 py-10 sm:px-4 sm:py-12"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="stamp-editor-title"
          onClick={(e) => e.stopPropagation()}
          className="h-fit w-full max-w-md self-center rounded-xl border border-king-ash/30 bg-king-jet p-5 shadow-2xl sm:p-6"
        >
          <div className="mb-5 flex items-start justify-between gap-3">
            <h3 id="stamp-editor-title" className="heading-display text-lg text-king-fg sm:text-xl">
              {mode === 'create' ? 'Nova estampa' : 'Editar estampa'}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-king-ash/40 text-king-silver transition hover:border-king-red hover:text-king-fg"
              aria-label="Fechar"
            >
              <HiOutlineX className="text-lg" />
            </button>
          </div>

          <datalist id={datalistId}>
            {existingColeções.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>

          <div className="space-y-5">
            {mode === 'create' ? (
              <label className="flex flex-col gap-2 rounded-md border border-king-red/25 bg-king-red/[0.04] p-3">
                <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-king-red">
                  ID único *
                </span>
                <input
                  value={customId}
                  onChange={(e) => setCustomId(normalizeCustomId(e.target.value))}
                  className="input-king-panel font-mono tracking-[0.1em]"
                  placeholder="ex.: cruz-sagrada-costas"
                />
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-king-silver/70">
                  3-60 caracteres · letras minúsculas, números e hífens · não repetível
                </span>
              </label>
            ) : initial ? (
              <div className="rounded-md border border-white/10 bg-king-black/30 p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-king-silver/70">
                  ID (não editável)
                </p>
                <p className="mt-1 font-mono text-sm tracking-[0.1em] text-king-fg">
                  {initial.id}
                </p>
              </div>
            ) : null}
            <label className="flex flex-col gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-king-silver">
                Nome na loja
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-king-panel font-mono text-sm"
                placeholder="Ex.: Cruz sagrada · costas"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-king-silver">
                Coleção (agrupa no filtro da loja)
              </span>
              <input
                value={coleção}
                onChange={(e) => setColeção(e.target.value)}
                list={datalistId}
                className="input-king-panel font-mono text-sm"
                placeholder="Ex.: Coleção sagrada, DROP JESUS…"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-king-silver">
                Lado da peça
              </span>
              <select
                value={side}
                onChange={(e) => setSide(e.target.value as StampSide)}
                className="select-king-dark font-mono text-xs"
              >
                <option value="back">Costas (verso)</option>
                <option value="front">Frente (peito)</option>
              </select>
            </label>

            <div className="space-y-2">
              <span className="block font-mono text-[10px] uppercase tracking-[0.28em] text-king-silver">
                Imagem
              </span>
              <label className="inline-flex cursor-pointer items-center justify-center border border-king-red bg-king-red/90 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-white shadow-sm transition hover:bg-king-glow">
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={onFile}
                  disabled={uploading}
                />
                {uploading ? 'A enviar…' : 'Enviar ficheiro'}
              </label>
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="input-king-panel font-mono text-[11px]"
                placeholder="URL da imagem (preenchida após upload)"
              />
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt=""
                  className="h-28 w-full rounded-md object-contain ring-1 ring-white/10"
                />
              ) : null}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-king-ash/25 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="border border-king-ash/45 bg-king-coal/30 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.25em] text-king-fg transition hover:border-king-red hover:bg-king-red/10"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={submit}
              className={cn(
                'border px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.25em] text-white transition',
                'border-king-red bg-king-red shadow-sm hover:bg-king-glow hover:shadow-glow-red disabled:opacity-50'
              )}
            >
              {saving ? 'A gravar…' : 'Guardar'}
            </button>
          </div>
        </motion.div>
      </div>
    </div>,
    document.body
  );
}
