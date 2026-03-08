import { motion, type HTMLMotionProps } from 'framer-motion';
import { type ReactNode } from 'react';

interface EmberCardProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  delay?: number;
  className?: string;
}

const emberVariants = {
  hidden: {
    opacity: 0,
    scale: 0.85,
    y: 30,
    filter: 'brightness(2.5) saturate(2)',
  },
  visible: (delay: number) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    filter: 'brightness(1) saturate(1)',
    transition: {
      duration: 0.7,
      delay,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
      filter: { duration: 1.2, delay },
    },
  }),
};

export function EmberCard({ children, delay = 0, className = '', ...props }: EmberCardProps) {
  return (
    <motion.div
      className={`relative ${className}`}
      variants={emberVariants}
      initial="hidden"
      animate="visible"
      custom={delay}
      {...props}
    >
      {/* Purple ember glow behind card */}
      <motion.div
        className="absolute -inset-1 rounded-lg opacity-0 pointer-events-none ember-glow"
        initial={{ opacity: 0.8, scale: 1.05 }}
        animate={{ opacity: 0, scale: 1 }}
        transition={{ duration: 1.5, delay, ease: 'easeOut' }}
      />
      {children}
    </motion.div>
  );
}

// Stagger container
export function EmberStagger({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.1 } },
      }}
    >
      {children}
    </motion.div>
  );
}

// Simple fade-up for text
export function EmberText({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20, filter: 'brightness(3) hue-rotate(-30deg)' }}
      animate={{ opacity: 1, y: 0, filter: 'brightness(1) hue-rotate(0deg)' }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1], filter: { duration: 1.4, delay } }}
    >
      {children}
    </motion.div>
  );
}

// Flicker effect for hero elements
export function FlickerIn({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0 }}
      animate={{
        opacity: [0, 0.4, 0, 0.7, 0.3, 1, 0.85, 1],
      }}
      transition={{
        duration: 1.2,
        times: [0, 0.1, 0.15, 0.3, 0.35, 0.6, 0.7, 1],
        ease: 'easeOut',
      }}
    >
      {children}
    </motion.div>
  );
}
