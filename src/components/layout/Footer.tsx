import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaInstagram, FaTiktok, FaWhatsapp, FaYoutube } from 'react-icons/fa';
import { openWhatsApp, buildSupportMessage } from '@/utils/whatsapp';
import KingLogo from '@/components/ui/KingLogo';
import MeasureGuideModal from '@/components/products/MeasureGuideModal';

export default function Footer() {
  const [measureGuideOpen, setMeasureGuideOpen] = useState(false);

  return (
    <footer className="relative overflow-hidden border-t border-white/5 bg-king-black pt-24 pb-10 text-king-silver">
      <div className="light-rays opacity-20" />
      <div className="noise-overlay" />

      <div className="container-king relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20 text-center"
        >
          <p className="mb-4 font-serif italic text-sm tracking-[0.3em] text-king-red">
            · Ad Majorem Dei Gloriam ·
          </p>
          <h3 className="heading-display text-5xl md:text-8xl text-king-bone text-glow">
            VISTA-SE COM O REI
          </h3>
          <div className="mx-auto mt-6 h-px w-24 bg-gradient-to-r from-transparent via-king-red/40 to-transparent" />
        </motion.div>

        <div className="grid grid-cols-2 gap-12 md:grid-cols-4">
          <div>
            <div className="mb-5">
              <KingLogo variant="white" className="h-10 w-auto max-w-[180px]" />
            </div>
            <p className="font-serif text-sm leading-relaxed text-king-silver/70">
              Streetwear oversized com identidade sagrada. Peças limitadas, acabamento premium, reverência em cada detalhe.
            </p>
          </div>
          <div>
            <h4 className="heading-display mb-5 text-xs tracking-[0.3em] text-king-bone">
              Navegação
            </h4>
            <ul className="space-y-3 text-sm">
              <li><Link to="/" className="hover:text-king-red transition">Início</Link></li>
              <li><Link to="/produtos" className="hover:text-king-red transition">Coleção</Link></li>
              <li><Link to="/produtos?cat=colecao-sacra" className="hover:text-king-red transition">Linha Sagrada</Link></li>
              <li><Link to="/dashboard" className="hover:text-king-red transition">Minha Conta</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="heading-display mb-5 text-xs tracking-[0.3em] text-king-bone">
              Suporte
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <button
                  onClick={() => openWhatsApp(buildSupportMessage())}
                  className="hover:text-king-red transition"
                >
                  WhatsApp
                </button>
              </li>
              <li><a className="hover:text-king-red transition">Trocas & Devoluções</a></li>
              <li>
                <button
                  type="button"
                  onClick={() => setMeasureGuideOpen(true)}
                  className="hover:text-king-red transition"
                >
                  Guia de Tamanhos
                </button>
              </li>
              <li><a className="hover:text-king-red transition">Envio</a></li>
            </ul>
          </div>
          <div>
            <h4 className="heading-display mb-5 text-xs tracking-[0.3em] text-king-bone">
              Redes
            </h4>
            <div className="flex gap-3">
              {[
                { Icon: FaInstagram, href: '#' },
                { Icon: FaTiktok, href: '#' },
                { Icon: FaYoutube, href: '#' },
                {
                  Icon: FaWhatsapp,
                  href: '#',
                  onClick: () => openWhatsApp(buildSupportMessage()),
                },
              ].map(({ Icon, href, onClick }, i) => (
                <a
                  key={i}
                  href={href}
                  onClick={(e) => {
                    if (onClick) {
                      e.preventDefault();
                      onClick();
                    }
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-king-silver transition hover:border-king-red/60 hover:bg-king-red/75 hover:text-king-bone"
                  data-cursor="hover"
                >
                  <Icon className="text-sm" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-20 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 text-xs font-mono uppercase tracking-[0.25em] text-king-silver/50 md:flex-row">
          <p>© {new Date().getFullYear()} KING Oversized · Todos os direitos reservados</p>
          <p>Feito com fé e código · BRASIL</p>
        </div>
      </div>

      <MeasureGuideModal
        open={measureGuideOpen}
        onClose={() => setMeasureGuideOpen(false)}
      />
    </footer>
  );
}
