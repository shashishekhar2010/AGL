import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { COMPANY_LOGO_URL } from '../data/alorixContent';

export default function Preloader() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setVisible(false), 850);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } }}
          className="fixed inset-0 z-50 bg-[#05070a] flex flex-col items-center justify-center px-6"
          aria-hidden="true"
        >
          <div className="w-[min(400px,76vw)] text-center space-y-6">
            <div className="inline-flex bg-[#FAFBFD] rounded-lg px-4 py-2.5 border border-[#dfe7e0]/20 shadow-lg">
              <img
                src={COMPANY_LOGO_URL}
                alt="Alorix Global International"
                referrerPolicy="no-referrer"
                className="h-12 sm:h-14 w-auto object-contain"
              />
            </div>

            <div className="relative h-[1px] bg-[#dfe7e0]/15 overflow-hidden">
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '0%' }}
                transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
                className="h-full w-full bg-gradient-to-r from-[#e0231c] via-[#e8ad26] to-[#dfe7e0]"
              />
            </div>

            <div className="flex items-center justify-between text-[10px] tracking-[0.2em] uppercase text-[#8a968f]">
              <span>Alorix Global International</span>
              <span className="text-[#b4bfb7]">Chemical Trading &amp; Supply</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
