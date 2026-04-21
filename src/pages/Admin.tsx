import { Fragment, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  HiOutlineCheck,
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineUpload,
  HiOutlineX,
} from 'react-icons/hi';
import { deleteField } from 'firebase/firestore';
import {
  createProduct,
  deleteProduct,
  importSeedProductsIfMissing,
  listProducts,
  updateProduct,
  type Product,
  type ProductCategory,
  type ProductInput,
  type ProductSize,
} from '@/services/products.service';
import { useProductsStore } from '@/store/useProductsStore';
import { useAuthStore } from '@/store/useAuthStore';
import { uploadProductGalleryImage } from '@/services/storage.service';
import { STAMPS } from '@/assets/estampas';
import {
  FRONT_LOGO_PRETO_ID,
  FRONT_LOGO_STAMPS,
  kingLogoPretoOnDarkImgClass,
} from '@/assets/logos';
import { listAllOrders, updateOrderStatus, type Order, type OrderStatus } from '@/services/orders.service';
import { formatBRL, formatDate } from '@/utils/format';
import GlowButton from '@/components/ui/GlowButton';
import KingLogo from '@/components/ui/KingLogo';
import { cn } from '@/utils/cn';
import { getLenisRoot } from '@/lib/lenisRoot';
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
} from '@/config/productCategories';

const ALL_SIZES: ProductSize[] = ['P', 'M', 'G', 'GG', 'XGG'];

const STATUS_OPTIONS: OrderStatus[] = [
  'pendente',
  'confirmado',
  'enviado',
  'entregue',
  'cancelado',
];

export default function Admin() {
  const [tab, setTab] = useState<'products' | 'orders'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; product?: Product } | null>(null);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const p = await listProducts();
      setProducts(p);
    } catch {
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const onImportDemoProducts = async () => {
    if (
      !confirm(
        'Criar no Firebase as peças de demonstração (fotos Unsplash)? Só entra onde ainda não existir o documento. Depois você edita tudo no Admin. Continuar?'
      )
    )
      return;
    try {
      setLoading(true);
      const { created, skipped } = await importSeedProductsIfMissing();
      toast.success(
        created > 0
          ? `${created} produto(s) criado(s). ${skipped} já existiam. Atualize a loja.`
          : `Nenhum novo: ${skipped} já estavam cadastrados.`
      );
      useProductsStore.getState().invalidateCatalog();
      await useProductsStore.getState().fetch();
      await loadProducts();
    } catch {
      toast.error('Falha ao importar. Confira login admin e regras do Firestore.');
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      const o = await listAllOrders();
      setOrders(o);
    } catch {
      toast.error('Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'products') loadProducts();
    else loadOrders();
  }, [tab]);

  const onDelete = async (id: string) => {
    if (!confirm('Excluir este produto definitivamente?')) return;
    try {
      await deleteProduct(id);
      toast.success('Produto removido');
      loadProducts();
    } catch {
      toast.error('Erro ao remover');
    }
  };

  const onStatusChange = async (id: string, status: OrderStatus) => {
    try {
      await updateOrderStatus(id, status);
      toast.success('Status atualizado');
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    } catch {
      toast.error('Erro ao atualizar');
    }
  };

  return (
    <main className="relative min-h-screen bg-king-black py-12">
      <div className="light-rays opacity-20" />
      <div className="container-king relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-king-red/25 bg-king-red/5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.3em] text-king-glow">
            ✝ Painel Real
          </span>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-8">
            <KingLogo variant="white" className="h-12 w-auto max-w-[220px] sm:h-16" />
            <h1 className="heading-display text-4xl text-king-bone md:text-6xl">
              <span className="text-gradient-red">ADMIN</span>
            </h1>
          </div>
          <p className="mt-3 font-serif italic text-king-silver/80">
            Governe o reino. Gerencie produtos e pedidos.
          </p>
        </motion.div>

        <div className="mb-8 flex gap-2">
          {(['products', 'orders'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'border px-5 py-3 font-mono text-[11px] uppercase tracking-[0.3em] transition',
                tab === t
                  ? 'border-king-red bg-king-red text-king-bone shadow-glow-red'
                  : 'border-white/10 text-king-silver hover:border-king-red'
              )}
            >
              {t === 'products' ? 'Produtos' : 'Pedidos'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="spinner-crown" />
          </div>
        ) : tab === 'products' ? (
          <>
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-king-silver">
                  {products.length} produto(s) no Firebase
                </p>
           
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onImportDemoProducts}
                  className="border border-white/15 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.28em] text-king-silver transition hover:border-king-red hover:text-king-bone"
                >
                  Importar demonstrativos
                </button>
                <GlowButton onClick={() => setModal({ mode: 'create' })}>
                  <HiOutlinePlus /> Novo produto
                </GlowButton>
              </div>
            </div>

            <div className="overflow-hidden border border-white/5">
              <table className="w-full">
                <thead className="bg-king-jet">
                  <tr className="text-left font-mono text-[10px] uppercase tracking-[0.3em] text-king-silver/70">
                    <th className="p-4">Produto</th>
                    <th className="p-4 hidden md:table-cell">Categoria</th>
                    <th className="p-4">Preço</th>
                    <th className="p-4 hidden md:table-cell">Estoque</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr
                      key={p.id}
                      className="border-t border-white/5 transition hover:bg-white/[0.02]"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-14 w-12 overflow-hidden bg-king-graphite">
                            <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
                          </div>
                          <div>
                            <p className="heading-display text-sm text-king-bone">{p.name}</p>
                            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-king-silver/60 md:hidden">
                              {p.category}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 hidden md:table-cell font-mono text-[11px] uppercase tracking-[0.25em] text-king-silver">
                        {p.category}
                      </td>
                      <td className="p-4 font-display text-king-bone">
                        {formatBRL(p.price)}
                      </td>
                      <td className="p-4 hidden md:table-cell font-mono text-sm text-king-silver">
                        {p.stock}
                      </td>
                      <td className="p-4 text-right">
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => setModal({ mode: 'edit', product: p })}
                            className="flex h-9 w-9 items-center justify-center border border-white/10 text-king-silver hover:border-king-red hover:text-king-bone"
                          >
                            <HiOutlinePencil />
                          </button>
                          <button
                            onClick={() => onDelete(p.id)}
                            className="flex h-9 w-9 items-center justify-center border border-white/10 text-king-silver hover:border-red-500 hover:text-red-500"
                          >
                            <HiOutlineTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-10 text-center font-serif italic text-king-silver/70">
                        Nenhum produto cadastrado ainda. Adicione o primeiro.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            {orders.length === 0 && (
              <p className="py-10 text-center font-serif italic text-king-silver/70">
                Nenhum pedido recebido ainda.
              </p>
            )}
            {orders.map((o) => (
              <motion.div
                key={o.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-king-silver">
                    #{o.id.slice(0, 10)}
                  </p>
                  <p className="heading-display text-base text-king-bone">
                    {o.shipping.fullName}
                  </p>
                  <p className="font-serif italic text-xs text-king-silver/70">
                    {o.userEmail} · {formatDate(o.createdAt)}
                  </p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.25em] text-king-silver/70">
                    {o.items.length} itens · {formatBRL(o.total)} · {o.paymentMethod.toUpperCase()}
                  </p>
                </div>
                <select
                  value={o.status}
                  onChange={(e) => onStatusChange(o.id, e.target.value as OrderStatus)}
                  className="select-king-dark font-mono text-[11px] uppercase tracking-[0.25em]"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {modal && (
          <ProductModal
            key={modal.mode === 'edit' && modal.product ? modal.product.id : 'create'}
            mode={modal.mode}
            product={modal.product}
            onClose={() => setModal(null)}
            onSaved={() => {
              setModal(null);
              loadProducts();
            }}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

type StampScope = 'all' | 'none' | 'subset';

function backScopeFromProduct(p?: Product): StampScope {
  if (!p) return 'all';
  if (p.allowedBackStampIds === undefined) return 'all';
  if (p.allowedBackStampIds.length === 0) return 'none';
  return 'subset';
}

function frontScopeFromProduct(p?: Product): StampScope {
  if (!p) return 'all';
  if (p.allowedFrontStampIds === undefined) return 'all';
  if (p.allowedFrontStampIds.length === 0) return 'none';
  return 'subset';
}

type ProductWizardStep = 1 | 2 | 3 | 4;

const PRODUCT_WIZARD_STEPS: readonly { step: ProductWizardStep; title: string; hint: string }[] = [
  { step: 1, title: 'Dados', hint: 'Nome, preço, estoque, categoria e tamanhos.' },
  { step: 2, title: 'Galeria', hint: 'Upload no Storage ou URL. A 1ª imagem é a capa.' },
  { step: 3, title: 'Estampas', hint: 'O que o cliente pode escolher nas costas e no peito.' },
  { step: 4, title: 'Revisão', hint: 'Descrição na loja e conferência antes de salvar.' },
] as const;

function ProductModal({
  mode,
  product,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit';
  product?: Product;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ProductInput>({
    name: product?.name ?? '',
    description: product?.description ?? '',
    price: product?.price ?? 0,
    oldPrice: product?.oldPrice,
    images: product?.images ?? [],
    category: product?.category ?? 'oversized',
    sizes: product?.sizes ?? ['M', 'G'],
    stock: product?.stock ?? 10,
    featured: product?.featured ?? false,
    tag: product?.tag,
  });
  const [imageUrls, setImageUrls] = useState<string[]>(() => product?.images ?? []);
  const [externalUrlInput, setExternalUrlInput] = useState('');
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const authUser = useAuthStore((s) => s.user);
  const [saving, setSaving] = useState(false);

  const [backScope, setBackScope] = useState<StampScope>(() => backScopeFromProduct(product));
  const [backPick, setBackPick] = useState<Set<string>>(() => {
    if (product?.allowedBackStampIds && product.allowedBackStampIds.length > 0) {
      return new Set(
        product.allowedBackStampIds.filter((id) => STAMPS.some((s) => s.id === id))
      );
    }
    return new Set(STAMPS.map((s) => s.id));
  });

  const [frontScope, setFrontScope] = useState<StampScope>(() => frontScopeFromProduct(product));
  const [frontPick, setFrontPick] = useState<Set<string>>(() => {
    if (product?.allowedFrontStampIds && product.allowedFrontStampIds.length > 0) {
      return new Set(
        product.allowedFrontStampIds.filter((id) =>
          FRONT_LOGO_STAMPS.some((s) => s.id === id)
        )
      );
    }
    return new Set(FRONT_LOGO_STAMPS.map((s) => s.id));
  });

  const [wizardStep, setWizardStep] = useState<ProductWizardStep>(1);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    getLenisRoot()?.stop();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      getLenisRoot()?.start();
    };
  }, [onClose]);

  const set = <K extends keyof ProductInput>(k: K, v: ProductInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleSize = (s: ProductSize) => {
    setForm((f) => ({
      ...f,
      sizes: f.sizes.includes(s) ? f.sizes.filter((x) => x !== s) : [...f.sizes, s],
    }));
  };

  const toggleBackStamp = (id: string) => {
    setBackPick((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const toggleFrontStamp = (id: string) => {
    setFrontPick((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const handleGalleryFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    if (!authUser) {
      toast.error('Faça login para enviar imagens ao Storage.');
      e.target.value = '';
      return;
    }
    setUploadingGallery(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} não é uma imagem.`);
          continue;
        }
        if (file.size > 8 * 1024 * 1024) {
          toast.error(`${file.name} ultrapassa 8MB.`);
          continue;
        }
        const url = await uploadProductGalleryImage(file);
        setImageUrls((prev) => [...prev, url]);
      }
    } catch (err) {
      console.error(err);
      toast.error(
        'Falha no upload. Publique as regras do Storage (arquivo storage.rules na raiz do projeto) e confira se está logado como admin.'
      );
    } finally {
      setUploadingGallery(false);
      e.target.value = '';
    }
  };

  const addExternalImageUrl = () => {
    const raw = externalUrlInput.trim();
    if (!raw) return;
    try {
      const u = new URL(raw);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') {
        toast.error('Use uma URL http ou https');
        return;
      }
    } catch {
      toast.error('URL inválida');
      return;
    }
    setImageUrls((p) => [...p, raw]);
    setExternalUrlInput('');
  };

  const removeImageAt = (index: number) => {
    setImageUrls((p) => p.filter((_, i) => i !== index));
  };

  const validateWizardStepBeforeNext = (): boolean => {
    switch (wizardStep) {
      case 1:
        if (!form.name?.trim()) {
          toast.error('Informe o nome do produto');
          return false;
        }
        if (!form.price || form.price <= 0) {
          toast.error('Informe um preço maior que zero');
          return false;
        }
        if (form.sizes.length === 0) {
          toast.error('Selecione ao menos um tamanho');
          return false;
        }
        return true;
      case 2: {
        const imgs = imageUrls.map((u) => u.trim()).filter(Boolean);
        if (imgs.length === 0) {
          toast.error('Adicione ao menos uma imagem para continuar');
          return false;
        }
        return true;
      }
      case 3:
        if (backScope === 'subset' && backPick.size === 0) {
          toast.error('Costas: selecione ao menos uma estampa ou mude para “todas/nenhuma”.');
          return false;
        }
        if (frontScope === 'subset' && frontPick.size === 0) {
          toast.error('Frente: selecione ao menos um logo ou mude para “todos/nenhum”.');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const goNext = () => {
    if (wizardStep === 4) return;
    if (!validateWizardStepBeforeNext()) return;
    setWizardStep((s) => ((s + 1) as ProductWizardStep));
  };

  const goPrev = () => {
    setWizardStep((s) => (s <= 1 ? 1 : ((s - 1) as ProductWizardStep)));
  };

  const galleryCount = imageUrls.map((u) => u.trim()).filter(Boolean).length;
  const backSummaryText =
    backScope === 'all'
      ? 'Todas as artes do catálogo'
      : backScope === 'none'
        ? 'Sem estampa no verso'
        : `${backPick.size} artes selecionadas`;
  const frontSummaryText =
    frontScope === 'all'
      ? 'Os 3 logos (bordô, branco, preto)'
      : frontScope === 'none'
        ? 'Sem logo no peito'
        : `${frontPick.size} logo(s) selecionado(s)`;

  const save = async () => {
    const images = imageUrls.map((u) => u.trim()).filter(Boolean);
    if (!form.name?.trim() || !form.description?.trim()) {
      toast.error('Nome e descrição são obrigatórios');
      return;
    }
    if (!form.price || form.price <= 0) {
      toast.error('Informe um preço maior que zero');
      return;
    }
    if (form.sizes.length === 0) {
      toast.error('Selecione ao menos um tamanho');
      return;
    }
    if (images.length === 0) {
      toast.error('Adicione ao menos uma imagem (upload no Storage ou URL externa)');
      return;
    }
    if (backScope === 'subset' && backPick.size === 0) {
      toast.error('Costas: selecione ao menos uma estampa ou mude para “todas/nenhuma”.');
      return;
    }
    if (frontScope === 'subset' && frontPick.size === 0) {
      toast.error('Frente: selecione ao menos um logo ou mude para “todos/nenhum”.');
      return;
    }
    setSaving(true);
    try {
      const base = { ...form, images };

      if (mode === 'create') {
        const payload: ProductInput = { ...base };
        if (backScope === 'none') payload.allowedBackStampIds = [];
        else if (backScope === 'subset') payload.allowedBackStampIds = [...backPick];
        if (frontScope === 'none') payload.allowedFrontStampIds = [];
        else if (frontScope === 'subset') payload.allowedFrontStampIds = [...frontPick];
        await createProduct(payload);
        toast.success('Produto adicionado ao reino');
      } else if (product) {
        const patch: Record<string, unknown> = { ...base };
        if (backScope === 'all') patch.allowedBackStampIds = deleteField();
        else if (backScope === 'none') patch.allowedBackStampIds = [];
        else patch.allowedBackStampIds = [...backPick];

        if (frontScope === 'all') patch.allowedFrontStampIds = deleteField();
        else if (frontScope === 'none') patch.allowedFrontStampIds = [];
        else patch.allowedFrontStampIds = [...frontPick];

        await updateProduct(product.id, patch);
        toast.success('Produto atualizado');
      }
      onSaved();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar no Firestore');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        role="dialog"
        aria-modal="true"
        data-lenis-prevent
        className="fixed left-1/2 top-1/2 z-[81] flex h-[min(90dvh,calc(100dvh-1.5rem))] w-[90vw] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-neutral-900 bg-king-jet/95 shadow-[0_24px_100px_rgba(0,0,0,0.75)] backdrop-blur-md"
      >
        <header className="shrink-0 border-b border-neutral-900 bg-king-black/40 px-4 pb-4 pt-3 sm:px-6 sm:pb-5 sm:pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="heading-display text-2xl text-king-bone sm:text-3xl">
                {mode === 'create' ? 'Novo produto' : 'Editar produto'}
              </h3>
              <p className="mt-1.5 font-mono text-[10px] uppercase leading-relaxed tracking-[0.18em] text-king-silver/80 sm:text-[11px]">
                <span className="text-king-red">Etapa {wizardStep} de 4</span>
                {' · '}
                {PRODUCT_WIZARD_STEPS[wizardStep - 1]?.hint}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center border border-neutral-800 text-king-silver transition hover:border-king-red hover:text-king-bone"
              aria-label="Fechar"
            >
              <HiOutlineX className="text-lg" />
            </button>
          </div>
          <nav className="mt-5" aria-label="Etapas do cadastro">
            <div className="flex w-full items-start justify-center gap-0 px-0 sm:px-2">
              {PRODUCT_WIZARD_STEPS.map(({ step, title }, idx) => {
                const active = wizardStep === step;
                const done = wizardStep > step;
                const canGoBack = step < wizardStep;
                const locked = step > wizardStep;
                return (
                  <Fragment key={step}>
                    <div className="flex min-w-0 flex-1 flex-col items-center">
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => {
                          if (canGoBack) setWizardStep(step);
                        }}
                        title={title}
                        className={cn(
                          'relative flex h-10 w-10 items-center justify-center rounded-full border-2 text-xs font-mono font-semibold transition sm:h-11 sm:w-11 sm:text-sm',
                          active &&
                            'border-king-red bg-king-red text-king-bone shadow-[0_0_26px_rgba(220,20,60,0.42)] ring-2 ring-king-red/25',
                          done &&
                            !active &&
                            'border-king-red/55 bg-king-red/[0.12] text-king-red hover:border-king-red hover:bg-king-red/20',
                          !done &&
                            !active &&
                            'border-neutral-700 bg-king-black/80 text-king-silver/40 shadow-inner',
                          canGoBack && 'cursor-pointer',
                          locked && 'cursor-not-allowed opacity-35'
                        )}
                      >
                        {done && !active ? (
                          <HiOutlineCheck className="text-base sm:text-lg" strokeWidth={2.25} />
                        ) : (
                          <span className="tabular-nums">{step}</span>
                        )}
                      </button>
                      <span
                        className={cn(
                          'mt-2 max-w-[6rem] text-center font-mono text-[9px] uppercase leading-tight tracking-[0.14em] sm:max-w-none sm:text-[10px]',
                          active && 'text-king-bone',
                          done && !active && 'text-king-silver/85',
                          !done && !active && 'text-king-silver/38'
                        )}
                      >
                        {title}
                      </span>
                    </div>
                    {idx < PRODUCT_WIZARD_STEPS.length - 1 && (
                      <div
                        role="presentation"
                        className={cn(
                          'mt-[19px] h-0.5 w-4 shrink-0 rounded-full sm:mt-[21px] sm:h-[3px] sm:w-8 md:w-14',
                          wizardStep > step ? 'bg-gradient-to-r from-king-red/80 to-king-red/30' : 'bg-white/[0.1]'
                        )}
                      />
                    )}
                  </Fragment>
                );
              })}
            </div>
          </nav>
        </header>

        <div
          data-lenis-prevent
          className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-5 sm:px-5 sm:py-7"
        >
          <div className="mx-auto w-[90%] min-w-0 max-w-[1680px]">
            {wizardStep === 1 && (
              <div className="flex flex-col gap-7 md:gap-8">
                <ProductModalSection
                  title="Dados do produto"
                  subtitle="Nome, preços, estoque, categoria e tamanhos."
                >
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:gap-6 lg:grid-cols-2 xl:gap-8">
                    <Field label="Nome" value={form.name} onChange={(v) => set('name', v)} />
                    <Field label="Tag (opcional)" value={form.tag ?? ''} onChange={(v) => set('tag', v)} />
                    <Field
                      label="Preço (R$)"
                      value={String(form.price)}
                      onChange={(v) => set('price', parseFloat(v) || 0)}
                      type="number"
                    />
                    <Field
                      label="Preço antigo (opcional)"
                      value={form.oldPrice != null ? String(form.oldPrice) : ''}
                      onChange={(v) => {
                        if (v === '') {
                          set('oldPrice', undefined);
                          return;
                        }
                        const n = parseFloat(v);
                        set('oldPrice', Number.isFinite(n) ? n : undefined);
                      }}
                      type="number"
                    />
                    <Field
                      label="Estoque"
                      value={String(form.stock)}
                      onChange={(v) => set('stock', parseInt(v) || 0)}
                      type="number"
                    />
                    <label className="flex flex-col gap-2">
                      <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-king-silver/90 sm:text-xs">
                        Categoria
                      </span>
                      <select
                        value={form.category}
                        onChange={(e) => set('category', e.target.value as ProductCategory)}
                        className="select-king-dark font-mono tracking-[0.18em]"
                      >
                        {PRODUCT_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {PRODUCT_CATEGORY_LABELS[c]}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="mt-6">
                    <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.28em] text-king-silver/90 sm:text-xs">
                      Tamanhos
                    </p>
                    <div className="flex flex-wrap gap-2.5 sm:gap-3">
                      {ALL_SIZES.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => toggleSize(s)}
                          className={cn(
                            'h-12 min-w-[52px] rounded-md border px-4 font-mono text-sm transition sm:h-[3.25rem] sm:min-w-[3.5rem]',
                            form.sizes.includes(s)
                              ? 'border-king-red bg-king-red text-king-bone shadow-glow-red/30'
                              : 'border-neutral-700 text-king-silver hover:border-neutral-500'
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </ProductModalSection>
              </div>
            )}

            {wizardStep === 2 && (
              <div className="flex flex-col gap-7 md:gap-8">
                <ProductModalSection
                  title="Galeria"
                subtitle="Upload para Storage (products/gallery/) ou URL externa. A 1ª imagem é a capa."
              >
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleGalleryFiles}
                />
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <button
                    type="button"
                    disabled={uploadingGallery}
                    onClick={() => galleryInputRef.current?.click()}
                    className="inline-flex items-center justify-center gap-2 border border-king-red/70 bg-king-red/15 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.25em] text-king-bone transition hover:bg-king-red/25 disabled:opacity-50"
                  >
                    <HiOutlineUpload className="text-lg" />
                    {uploadingGallery ? 'Enviando…' : 'Enviar imagens'}
                  </button>
                  <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-king-silver/50">
                    JPG / PNG / WebP · máx. 8MB · várias de uma vez
                  </span>
                </div>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-stretch">
                  <input
                    type="url"
                    value={externalUrlInput}
                    onChange={(e) => setExternalUrlInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addExternalImageUrl();
                      }
                    }}
                    placeholder="URL externa (opcional)"
                    className="input-king-panel min-w-0 flex-1 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={addExternalImageUrl}
                    className="shrink-0 border border-neutral-800 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-king-silver transition hover:border-king-red hover:text-king-bone"
                  >
                    Adicionar URL
                  </button>
                </div>
                {imageUrls.length > 0 && (
                  <ul className="mt-4 grid grid-cols-5 gap-1.5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-9 xl:grid-cols-10">
                    {imageUrls.map((url, idx) => (
                      <li
                        key={`${url}-${idx}`}
                        className="group relative aspect-[3/4] w-full overflow-hidden rounded-sm border border-neutral-900 bg-king-black/50"
                      >
                        <img src={url} alt="" className="h-full w-full object-cover" />
                        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-king-black via-king-black/90 to-transparent px-1 py-1 pt-5">
                          <span className="font-mono text-[7px] text-king-silver sm:text-[8px]">
                            {idx === 0 ? 'Capa' : `#${idx + 1}`}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeImageAt(idx)}
                            className="rounded p-1 text-king-silver transition hover:bg-king-red/20 hover:text-king-red"
                            aria-label="Remover imagem"
                          >
                            <HiOutlineTrash className="text-sm" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </ProductModalSection>
              </div>
            )}

            {wizardStep === 3 && (
              <div className="flex flex-col gap-7 md:gap-8">
              <ProductModalSection
                title="Estampas · costas"
                subtitle="Arquivos da pasta estampas. Controle o que o cliente pode escolher no verso."
              >
                <div className="grid gap-2 sm:grid-cols-1">
                  <StampScopeRow
                    name="admin-back-stamp-scope"
                    label="Todas as artes do catálogo"
                    checked={backScope === 'all'}
                    onChange={() => {
                      setBackScope('all');
                      setBackPick(new Set(STAMPS.map((s) => s.id)));
                    }}
                  />
                  <StampScopeRow
                    name="admin-back-stamp-scope"
                    label="Somente artes selecionadas abaixo"
                    checked={backScope === 'subset'}
                    onChange={() => {
                      setBackScope('subset');
                      setBackPick((prev) =>
                        prev.size === 0 ? new Set(STAMPS.map((s) => s.id)) : prev
                      );
                    }}
                  />
                  <StampScopeRow
                    name="admin-back-stamp-scope"
                    label="Não oferecer estampa no verso"
                    checked={backScope === 'none'}
                    onChange={() => setBackScope('none')}
                  />
                </div>
                {backScope === 'subset' && (
                  <div
                    data-lenis-prevent
                    className="mt-4 max-h-[min(30rem,55vh)] overflow-y-auto overscroll-y-contain rounded-sm border border-neutral-900 bg-king-black/45 p-3 sm:max-h-[min(34rem,58vh)]"
                  >
                    <div className="mb-3 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => setBackPick(new Set(STAMPS.map((s) => s.id)))}
                        className="font-mono text-[9px] uppercase tracking-[0.2em] text-king-silver underline-offset-2 hover:text-king-bone hover:underline"
                      >
                        Marcar todas
                      </button>
                      <button
                        type="button"
                        onClick={() => setBackPick(new Set())}
                        className="font-mono text-[9px] uppercase tracking-[0.2em] text-king-silver underline-offset-2 hover:text-king-red hover:underline"
                      >
                        Limpar
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9 xl:grid-cols-11">
                      {STAMPS.map((s) => {
                        const on = backPick.has(s.id);
                        return (
                          <label
                            key={s.id}
                            className={cn(
                              'group relative flex cursor-pointer flex-col overflow-hidden rounded-md border bg-king-black/40 text-left transition',
                              on
                                ? 'border-king-red ring-1 ring-king-red/35'
                                : 'border-neutral-800 hover:border-neutral-600'
                            )}
                          >
                            <div className="relative aspect-[4/5] w-full bg-king-black/60 p-1">
                              <img
                                src={s.src}
                                alt=""
                                loading="lazy"
                                className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.03]"
                              />
                              <input
                                type="checkbox"
                                checked={on}
                                onChange={() => toggleBackStamp(s.id)}
                                className="absolute left-1 top-1 h-3 w-3 rounded border border-neutral-600 bg-king-black/80 accent-king-red shadow-sm sm:left-1.5 sm:top-1.5 sm:h-3.5 sm:w-3.5"
                                aria-label={s.name}
                              />
                              <span className="pointer-events-none absolute right-0.5 top-0.5 max-w-[min(100%,3.2rem)] truncate rounded bg-king-black/75 px-0.5 py-0.5 font-mono text-[6px] uppercase tracking-[0.12em] text-king-red sm:text-[7px]">
                                {s.category}
                              </span>
                            </div>
                            <div className="border-t border-white/5 px-1 py-1">
                              <span className="line-clamp-2 font-mono text-[6px] uppercase leading-tight tracking-[0.08em] text-king-silver sm:text-[7px]">
                                {s.name}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </ProductModalSection>

              <ProductModalSection
                title="Estampas · frente"
                subtitle="Logos KING no peito — escolha o conjunto permitido."
              >
                <div className="grid gap-2">
                  <StampScopeRow
                    name="admin-front-stamp-scope"
                    label="Os 3 logos (bordô, branco, preto)"
                    checked={frontScope === 'all'}
                    onChange={() => {
                      setFrontScope('all');
                      setFrontPick(new Set(FRONT_LOGO_STAMPS.map((s) => s.id)));
                    }}
                  />
                  <StampScopeRow
                    name="admin-front-stamp-scope"
                    label="Somente logos selecionados"
                    checked={frontScope === 'subset'}
                    onChange={() => {
                      setFrontScope('subset');
                      setFrontPick((prev) =>
                        prev.size === 0 ? new Set(FRONT_LOGO_STAMPS.map((s) => s.id)) : prev
                      );
                    }}
                  />
                  <StampScopeRow
                    name="admin-front-stamp-scope"
                    label="Não oferecer logo no peito"
                    checked={frontScope === 'none'}
                    onChange={() => setFrontScope('none')}
                  />
                </div>
                {frontScope === 'subset' && (
                  <div className="mt-4 grid grid-cols-3 gap-2 rounded-sm border border-neutral-900 bg-king-black/45 p-2 sm:max-w-[min(100%,26rem)] sm:mx-auto sm:grid-cols-3 sm:p-3">
                    {FRONT_LOGO_STAMPS.map((s) => {
                      const on = frontPick.has(s.id);
                      return (
                        <label
                          key={s.id}
                          className={cn(
                            'flex cursor-pointer flex-col overflow-hidden rounded-md border transition',
                            on
                              ? 'border-king-red ring-1 ring-king-red/35'
                              : 'border-neutral-800 hover:border-neutral-600'
                          )}
                        >
                          <div className="relative flex h-14 items-center justify-center bg-king-black/60 px-2 py-1.5 sm:h-16">
                            <img
                              src={s.src}
                              alt=""
                              loading="lazy"
                              className={cn(
                                'max-h-[2.75rem] max-w-full object-contain sm:max-h-[3rem]',
                                s.id === FRONT_LOGO_PRETO_ID ? kingLogoPretoOnDarkImgClass : ''
                              )}
                            />
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={() => toggleFrontStamp(s.id)}
                              className="absolute left-2 top-2 h-4 w-4 accent-king-red"
                              aria-label={s.name}
                            />
                          </div>
                          <div className="border-t border-white/5 px-2 py-1.5">
                            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-king-bone">
                              {s.name}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </ProductModalSection>
              </div>
            )}

            {wizardStep === 4 && (
              <div className="flex flex-col gap-7 md:gap-8">
                <ProductModalSection
                  title="Descrição"
                  subtitle="Texto completo na página do produto na loja."
                >
                  <textarea
                    rows={6}
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                    className="input-king-panel min-h-[180px] resize-y font-serif text-base leading-relaxed"
                  />
                </ProductModalSection>

                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-neutral-900 bg-king-black/30 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={form.featured ?? false}
                    onChange={(e) => set('featured', e.target.checked)}
                    className="h-4 w-4 accent-king-red"
                  />
                  <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-king-silver">
                    Destaque na home
                  </span>
                </label>

                <ProductModalSection
                  title="Resumo antes de salvar"
                  subtitle="Confira tudo abaixo. Use “Salvar produto” quando estiver pronto."
                >
                  <dl className="grid gap-4 font-mono text-[11px] uppercase tracking-[0.16em] text-king-silver sm:grid-cols-2">
                    <div className="rounded-md border border-neutral-900 bg-king-black/35 px-4 py-3">
                      <dt className="text-king-silver/55">Nome</dt>
                      <dd className="mt-1 text-sm normal-case tracking-normal text-king-bone">
                        {form.name?.trim() || '—'}
                      </dd>
                    </div>
                    <div className="rounded-md border border-neutral-900 bg-king-black/35 px-4 py-3">
                      <dt className="text-king-silver/55">Preço</dt>
                      <dd className="mt-1 text-sm normal-case tracking-normal text-king-bone">
                        {formatBRL(form.price)}
                      </dd>
                    </div>
                    {form.oldPrice != null && form.oldPrice > 0 && (
                      <div className="rounded-md border border-neutral-900 bg-king-black/35 px-4 py-3">
                        <dt className="text-king-silver/55">Preço antigo</dt>
                        <dd className="mt-1 text-sm normal-case tracking-normal text-king-bone">
                          {formatBRL(form.oldPrice)}
                        </dd>
                      </div>
                    )}
                    <div className="rounded-md border border-neutral-900 bg-king-black/35 px-4 py-3">
                      <dt className="text-king-silver/55">Estoque</dt>
                      <dd className="mt-1 text-sm normal-case tracking-normal text-king-bone">{form.stock}</dd>
                    </div>
                    <div className="rounded-md border border-neutral-900 bg-king-black/35 px-4 py-3">
                      <dt className="text-king-silver/55">Categoria</dt>
                      <dd className="mt-1 text-sm normal-case tracking-normal text-king-bone">
                        {PRODUCT_CATEGORY_LABELS[form.category]}
                      </dd>
                    </div>
                    <div className="rounded-md border border-neutral-900 bg-king-black/35 px-4 py-3 sm:col-span-2">
                      <dt className="text-king-silver/55">Tamanhos</dt>
                      <dd className="mt-1 text-sm normal-case tracking-normal text-king-bone">
                        {form.sizes.length ? form.sizes.join(', ') : '—'}
                      </dd>
                    </div>
                    <div className="rounded-md border border-neutral-900 bg-king-black/35 px-4 py-3 sm:col-span-2">
                      <dt className="text-king-silver/55">Imagens</dt>
                      <dd className="mt-1 text-sm normal-case tracking-normal text-king-bone">
                        {galleryCount} na galeria
                      </dd>
                    </div>
                    <div className="rounded-md border border-neutral-900 bg-king-black/35 px-4 py-3 sm:col-span-2">
                      <dt className="text-king-silver/55">Estampas · costas</dt>
                      <dd className="mt-1 font-serif text-sm normal-case tracking-normal text-king-bone">
                        {backSummaryText}
                      </dd>
                    </div>
                    <div className="rounded-md border border-neutral-900 bg-king-black/35 px-4 py-3 sm:col-span-2">
                      <dt className="text-king-silver/55">Estampas · frente</dt>
                      <dd className="mt-1 font-serif text-sm normal-case tracking-normal text-king-bone">
                        {frontSummaryText}
                      </dd>
                    </div>
                  </dl>
                </ProductModalSection>
              </div>
            )}
          </div>
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-neutral-900 bg-king-black/50 px-4 py-3 backdrop-blur-sm sm:px-6 sm:py-4">
          <button
            type="button"
            onClick={onClose}
            className="border border-transparent px-4 py-2 font-mono text-[11px] uppercase tracking-[0.28em] text-king-silver transition hover:text-king-red"
          >
            Cancelar
          </button>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {wizardStep > 1 && (
              <button
                type="button"
                onClick={goPrev}
                className="border border-neutral-800 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.25em] text-king-silver transition hover:border-king-bone hover:text-king-bone"
              >
                Anterior
              </button>
            )}
            {wizardStep < 4 ? (
              <GlowButton type="button" onClick={goNext}>
                Próximo
              </GlowButton>
            ) : (
              <GlowButton onClick={save} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar produto'}
              </GlowButton>
            )}
          </div>
        </footer>
      </motion.div>
    </>
  );
}

function ProductModalSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-neutral-900 bg-king-black/30 p-5 sm:p-7 md:p-8">
      <div className="mb-5 border-b border-neutral-900/70 pb-4">
        <h4 className="font-mono text-[11px] uppercase tracking-[0.26em] text-king-red sm:text-xs">
          {title}
        </h4>
        {subtitle ? (
          <p className="mt-2 font-serif text-sm italic leading-relaxed text-king-silver/75 sm:text-base">
            {subtitle}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function StampScopeRow({
  name,
  label,
  checked,
  onChange,
}: {
  name: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-md border px-4 py-3 transition',
        checked ? 'border-king-red/50 bg-king-red/5' : 'border-neutral-800 hover:border-neutral-600'
      )}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-king-red"
      />
      <span className="font-mono text-[11px] uppercase leading-snug tracking-[0.16em] text-king-silver sm:text-xs">
        {label}
      </span>
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-king-silver/90 sm:text-xs">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-king-panel"
      />
    </label>
  );
}
