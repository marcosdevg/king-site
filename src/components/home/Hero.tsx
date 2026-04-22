import { motion } from 'framer-motion';
import coroaImg from '@/assets/coroa.png';

export default function Hero() {
  return (
    <section className="relative min-h-[100svh] overflow-hidden bg-king-black">
      <div className="light-rays" />
      <div className="grid-overlay" />
      <div className="noise-overlay" />

      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="ray"
          style={{
            left: `${10 + i * 15}%`,
            animationDelay: `${i * 0.8}s`,
          }}
        />
      ))}

      <div className="container-king relative z-10 flex min-h-[100svh] flex-col items-center justify-center pt-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="mb-4 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.4em] text-king-red"
        >
          <span className="h-[1px] w-8 bg-king-red" />
          Coleção Sagrada 2026
          <span className="h-[1px] w-8 bg-king-red" />
        </motion.div>

        <h1 className="heading-display relative z-10 text-center text-[clamp(3.5rem,13vw,12rem)] font-bold leading-[0.85] text-king-fg">
          <motion.span
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="block"
          >
            VISTA-SE
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="block text-gradient-red text-glow"
          >
            COM O REI
          </motion.span>
        </h1>

        {/* Coroa de espinhos — arte sagrada (PNG) atrás do título */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.65, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none absolute left-1/2 top-1/2 -z-0 flex h-[min(52vh,92vw)] max-h-[520px] w-[min(52vh,92vw)] max-w-[520px] -translate-x-1/2 -translate-y-[56%] items-center justify-center sm:h-[min(50vh,85vw)] sm:max-h-[580px] sm:w-[min(50vh,85vw)] sm:max-w-[580px]"
        >
          <motion.img
            src={coroaImg}
            alt="Coroa de espinhos"
            className="h-full w-full object-contain"
            style={{
              filter:
                'drop-shadow(0 0 20px rgba(220, 20, 60, 0.22)) drop-shadow(0 0 48px rgba(139, 0, 0, 0.14))',
            }}
            animate={{
              y: [0, -36, 0],
              rotate: [-2.5, 2.5, -2.5],
            }}
            transition={{
              duration: 3.2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          className="relative z-20 mt-10 max-w-xl text-center font-serif italic text-base leading-relaxed text-king-silver md:text-lg"
        >
          Oversized premium forjado em fé e excelência.
          <br />
          Peças limitadas, identidade real, presença divina.
        </motion.p>

        <div className="absolute bottom-10 left-1/2 z-20 -translate-x-1/2 flex-col items-center gap-3 hidden md:flex">
          <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-king-silver/60">
            Role para descobrir
          </span>
          <div className="relative h-10 w-6 rounded-full border border-king-silver/30">
            <span className="absolute left-1/2 top-2 h-2 w-[2px] -translate-x-1/2 animate-scroll-indicator bg-king-red" />
          </div>
        </div>

        <div className="absolute left-6 top-1/2 hidden -translate-y-1/2 -rotate-90 font-mono text-[10px] uppercase tracking-[0.4em] text-king-silver/50 md:block">
          ✝ Ad Majorem Dei Gloriam ✝
        </div>
        <div className="absolute right-6 top-1/2 hidden -translate-y-1/2 rotate-90 font-mono text-[10px] uppercase tracking-[0.4em] text-king-silver/50 md:block">
          ✝ Oversized · Sagrado · Soberano ✝
        </div>
      </div>
    </section>
  );
}
