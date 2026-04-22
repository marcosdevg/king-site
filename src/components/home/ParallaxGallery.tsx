import { Fragment, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { logoBordo, logoBranco, logoPreto } from '@/assets/logos';
import { useThemeStore } from '@/store/useThemeStore';
import { cn } from '@/utils/cn';

gsap.registerPlugin(ScrollTrigger);

const IMAGES = [
  {
    src: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=1200&q=80',
    label: 'Oversized Sacred Heart',
  },
  {
    src: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=1200&q=80',
    label: 'Crown of Kings',
  },
  {
    src: 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=1200&q=80',
    label: 'Via Crucis',
  },
  {
    src: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=1200&q=80',
    label: 'Moletom Divino',
  },
];

const MARQUEE_LOGO_PAIRS = 14;

/** Letreiro em diagonal (~5°), full bleed: marquee sem recorte vertical; camada absoluta acima do bloco Lookbook. */
function ReiEmMovimentoMarquee() {
  const theme = useThemeStore((s) => s.theme);
  /** No escuro: branco; no claro: preto — legível sobre o fundo creme do letreiro. */
  const logoMarqueePrimario = theme === 'dark' ? logoBranco : logoPreto;

  const oneStrip = (halfKey: number) => (
    <div
      key={halfKey}
      className="flex shrink-0 items-center gap-14 pr-14 md:gap-20 md:pr-20 lg:gap-24 lg:pr-24 xl:gap-28 xl:pr-28"
    >
      {Array.from({ length: MARQUEE_LOGO_PAIRS }).map((_, i) => (
        <Fragment key={`${halfKey}-${i}`}>
          <img
            src={logoMarqueePrimario}
            alt=""
            draggable={false}
            className="h-14 w-auto shrink-0 select-none opacity-[0.42] md:h-16 md:opacity-50 lg:h-20 xl:h-24"
          />
          <img
            src={logoBordo}
            alt=""
            draggable={false}
            className="h-14 w-auto shrink-0 select-none opacity-[0.42] md:h-16 md:opacity-50 lg:h-20 xl:h-24"
          />
        </Fragment>
      ))}
    </div>
  );

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-10 z-[25] w-screen -translate-x-1/2 overflow-visible md:top-14"
    >
      <div className="origin-center -rotate-[5deg] will-change-transform">
        <motion.div
          className="flex w-max"
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}
        >
          {oneStrip(0)}
          {oneStrip(1)}
        </motion.div>
      </div>
    </div>
  );
}

export default function ParallaxGallery() {
  const theme = useThemeStore((s) => s.theme);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.parallax-img').forEach((el, i) => {
        gsap.fromTo(
          el,
          { y: 80 },
          {
            y: -80,
            ease: 'none',
            scrollTrigger: {
              trigger: el,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          }
        );
        gsap.fromTo(
          el.querySelector('img'),
          { scale: 1.3 },
          {
            scale: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: el,
              start: 'top bottom',
              end: 'center center',
              scrub: true,
            },
          }
        );
        if (i % 2 === 1) {
          el.style.transform = 'translateY(60px)';
        }
      });
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section className="relative overflow-visible bg-king-black py-32">
      <ReiEmMovimentoMarquee />
      <div className="container-king relative z-10 pt-28 md:pt-36">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 flex w-full flex-col items-center gap-3 text-center"
        >
          <span className="font-mono text-[11px] uppercase tracking-[0.4em] text-king-red">
            Lookbook
          </span>
          <h2
            className={cn(
              'heading-display text-4xl md:text-7xl',
              theme === 'light' ? 'text-gradient-red' : 'text-king-fg'
            )}
          >
            REI EM MOVIMENTO
          </h2>
        </motion.div>

        <div ref={ref} className="grid grid-cols-2 gap-4 md:gap-8 lg:grid-cols-4">
          {IMAGES.map((it, i) => (
            <div key={i} className={`parallax-img relative aspect-[3/4] overflow-hidden ${i % 2 ? 'mt-12' : ''}`}>
              <img
                src={it.src}
                alt={it.label}
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-king-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.25em] text-king-fg">
                <span>{it.label}</span>
                <span className="text-king-red">0{i + 1}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
