import { ArrowUp } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import MagneticButton from './MagneticButton';

interface BackToTopButtonProps {
  scrollProgress: number;
  onScrollTop: () => void;
}

export default function BackToTopButton({
  scrollProgress,
  onScrollTop,
}: BackToTopButtonProps) {
  const visible = scrollProgress > 0.14;
  const radius = 19;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - Math.min(Math.max(scrollProgress, 0), 1));

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.9 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-6 right-5 sm:right-6 z-30"
        >
          <MagneticButton
            type="button"
            onClick={onScrollTop}
            aria-label="Scroll back to top"
            className="relative w-11 h-11 rounded-full bg-[#0a0e14]/90 hover:bg-[#131922] border border-[#dfe7e0]/15 text-[#dfe7e0] flex items-center justify-center shadow-[0_12px_32px_rgba(0,0,0,0.65)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0231c]"
          >
            <svg
              className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
              viewBox="0 0 44 44"
              aria-hidden="true"
            >
              <circle
                cx="22"
                cy="22"
                r={radius}
                fill="none"
                stroke="rgba(223,231,224,0.12)"
                strokeWidth="1.5"
              />
              <circle
                cx="22"
                cy="22"
                r={radius}
                fill="none"
                stroke="#e0231c"
                strokeWidth="1.75"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
              />
            </svg>
            <ArrowUp className="w-4 h-4 relative z-10 text-[#dfe7e0]" />
          </MagneticButton>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
