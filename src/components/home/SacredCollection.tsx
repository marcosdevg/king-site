import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { HiArrowNarrowRight } from 'react-icons/hi';
import pombaWebp from '@/assets/pomba.webp';

export default function SacredCollection() {
  return (
    <section className="relative overflow-hidden bg-king-black py-32">
      <div className="light-rays opacity-25" />
      <div className="noise-overlay" />
      <div className="container-king grid grid-cols-1 items-center gap-14 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-visible"
        >
          <div className="relative aspect-[4/5] overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=1400&q=80"
              alt="Coleção sagrada"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-king-black via-transparent to-transparent" />
            <div className="absolute inset-0 shadow-inner-glow" />
          </div>
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -right-6 top-8 z-10 overflow-visible"
          >
            <div className="relative h-28 w-28 overflow-visible">
              <img
                src={pombaWebp}
                alt=""
                aria-hidden
                className="pointer-events-none absolute left-1/2 z-0 w-[min(20rem,72vw)] max-w-none object-contain opacity-[0.92]"
                style={{
                  bottom: '30%',
                  transform: 'translateX(-50%) scale(0.9)',
                  transformOrigin: 'bottom center',
                }}
              />
              <div className="relative z-10 flex h-28 w-28 items-center justify-center rounded-full bg-king-red text-king-bone shadow-[0_0_28px_rgba(220,20,60,0.5),0_0_72px_rgba(220,20,60,0.22)]">
                <div className="text-center font-mono text-[10px] uppercase leading-tight tracking-[0.25em]">
                  LINHA
                  <br />
                  <span className="heading-display text-2xl font-bold tracking-normal">
                    SACRA
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.4em] text-king-red">
            <span className="h-[1px] w-8 bg-king-red" />
            Cápsula Sagrada 2026
          </span>
          <h2 className="mt-5 heading-display text-4xl md:text-6xl leading-[0.95] text-king-bone">
            <span className="block">VIA</span>
            <span className="block text-gradient-red text-glow">CRUCIS</span>
            <span className="block font-serif italic text-xl md:text-3xl text-king-silver/80 mt-3 tracking-normal normal-case">
              — a arte que se veste
            </span>
          </h2>

          <p className="mt-6 max-w-lg font-serif text-base leading-relaxed text-king-silver/80 md:text-lg">
            Uma cápsula devocional em homenagem ao caminho do Calvário.
            Estampas inspiradas em ícones cristãos, tiragens numeradas
            à mão. Cada peça carrega uma oração.
          </p>

          <ul className="mt-8 space-y-3 font-mono text-[11px] uppercase tracking-[0.3em] text-king-silver/80">
            <li className="flex items-center gap-3">
              <span className="h-[1px] w-6 bg-king-red" /> Numeradas de 01 a 100
            </li>
            <li className="flex items-center gap-3">
              <span className="h-[1px] w-6 bg-king-red" /> Certificado físico incluso
            </li>
            <li className="flex items-center gap-3">
              <span className="h-[1px] w-6 bg-king-red" /> Estampas em serigrafia manual
            </li>
          </ul>

          <Link to="/produtos?cat=colecao-sacra" className="mt-10 inline-block">
            <button className="btn-king group">
              Descobrir a cápsula
              <HiArrowNarrowRight className="transition-transform group-hover:translate-x-2" />
            </button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
