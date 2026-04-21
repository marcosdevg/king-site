import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function BrandStory() {
  const sectionRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!textRef.current) return;
    const ctx = gsap.context(() => {
      const words = textRef.current!.querySelectorAll('.word');
      gsap.fromTo(
        words,
        { opacity: 0.15 },
        {
          opacity: 1,
          stagger: 0.08,
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 70%',
            end: 'bottom 60%',
            scrub: true,
          },
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  const phrase =
    'JOSUÉ 1:9: "Seja forte e corajoso! Não se apavore nem desanime, pois o Senhor, o seu Deus, estará com você por onde você andar"';
  const words = phrase.split(' ');

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden py-32 md:py-40 bg-king-black"
    >
      <div className="container-king">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16 flex flex-col items-center gap-4 text-center"
        >
          <span className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.4em] text-king-red">
            <span className="h-[1px] w-8 bg-king-red" />
            O Manifesto
            <span className="h-[1px] w-8 bg-king-red" />
          </span>
        </motion.div>

        <div
          ref={textRef}
          className="mx-auto max-w-5xl text-center font-serif text-2xl leading-relaxed text-king-bone md:text-5xl md:leading-[1.2]"
        >
          {words.map((w, i) => (
            <span key={i} className="word inline-block mr-[0.25em]">
              {w}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
