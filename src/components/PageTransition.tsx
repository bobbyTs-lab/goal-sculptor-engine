import { motion } from 'framer-motion';
import { type ReactNode } from 'react';

const pageVariants = {
  initial: {
    opacity: 0,
    filter: 'brightness(2.5) saturate(3) hue-rotate(-40deg)',
    scale: 0.96,
    y: 12,
  },
  enter: {
    opacity: 1,
    filter: 'brightness(1) saturate(1) hue-rotate(0deg)',
    scale: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
      filter: { duration: 1.0 },
    },
  },
  exit: {
    opacity: 0,
    filter: 'brightness(3) saturate(4) hue-rotate(30deg)',
    scale: 1.02,
    y: -8,
    transition: {
      duration: 0.35,
      ease: [0.4, 0, 1, 1] as [number, number, number, number],
    },
  },
};

export function PageTransition({ children, routeKey }: { children: ReactNode; routeKey: string }) {
  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Purple ember flash overlay */}
      <motion.div
        key={`ember-${routeKey}`}
        className="absolute inset-0 pointer-events-none z-50"
        style={{
          background: 'radial-gradient(ellipse at center, hsl(280 100% 50% / 0.15) 0%, hsl(300 80% 40% / 0.08) 40%, transparent 70%)',
        }}
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />
      <motion.div
        key={routeKey}
        variants={pageVariants}
        initial="initial"
        animate="enter"
        exit="exit"
      >
        {children}
      </motion.div>
    </div>
  );
}
