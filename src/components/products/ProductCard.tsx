import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { HiOutlineShoppingCart, HiOutlineEye } from 'react-icons/hi';
import type { Product } from '@/services/products.service';
import { formatBRL } from '@/utils/format';
import { useCartStore } from '@/store/useCartStore';
import toast from 'react-hot-toast';

interface Props {
  product: Product;
  index?: number;
}

export default function ProductCard({ product, index = 0 }: Props) {
  const add = useCartStore((s) => s.add);
  const img1 = product.images?.[0];
  const img2 = product.images?.[1] ?? img1;

  const quickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    add({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: img1,
      size: product.sizes[0] ?? 'M',
      quantity: 1,
    });
    toast.success(`${product.name} adicionado à sacola`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: index * 0.06 }}
    >
      <Link
        to={`/produtos/${product.id}`}
        className="product-card group block"
        data-cursor="hover"
      >
        <div className="relative aspect-[3/4] overflow-hidden">
          <img
            src={img1}
            alt={product.name}
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700 group-hover:opacity-0"
            loading="lazy"
          />
          <img
            src={img2}
            alt=""
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-0 transition-all duration-700 group-hover:scale-100 group-hover:opacity-100"
            loading="lazy"
          />

          {product.tag && (
            <div className="absolute left-3 top-3 z-10 bg-king-red/88 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.3em] text-king-bone backdrop-blur-[1px]">
              {product.tag}
            </div>
          )}
          {product.oldPrice && (
            <div className="absolute right-3 top-3 z-10 bg-king-black/80 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.3em] text-king-glow">
              -{Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}%
            </div>
          )}

          <div className="absolute inset-x-3 bottom-3 z-10 flex translate-y-5 items-center gap-2 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
            <button
              type="button"
              aria-label="Adicionar ao carrinho"
              onClick={quickAdd}
              className="flex h-11 w-11 shrink-0 items-center justify-center gap-2 bg-king-red/90 font-mono text-[10px] uppercase tracking-[0.3em] text-king-bone shadow-glow-red transition hover:bg-king-glow/95 md:h-auto md:flex-1 md:py-3"
            >
              <HiOutlineShoppingCart className="text-lg md:text-base" />
              <span className="hidden md:inline">Add Rápido</span>
            </button>
            <button className="flex h-11 w-11 items-center justify-center bg-king-black/70 text-king-fg backdrop-blur-sm transition hover:bg-king-black">
              <HiOutlineEye />
            </button>
          </div>

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-king-black/60 via-transparent to-transparent opacity-0 transition duration-500 group-hover:opacity-100" />
        </div>

        <div className="mt-4 flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-king-silver/70">
              {product.category.replace('-', ' ')}
            </p>
            <h3 className="mt-1 heading-display text-base text-king-fg transition-colors group-hover:text-king-glow">
              {product.name}
            </h3>
          </div>
          <div className="text-right">
            {product.oldPrice && (
              <p className="font-mono text-[10px] text-king-silver/50 line-through">
                {formatBRL(product.oldPrice)}
              </p>
            )}
            <p className="font-display text-sm text-king-fg">
              {formatBRL(product.price)}
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
