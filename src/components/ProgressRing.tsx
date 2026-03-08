import { motion } from 'framer-motion';

interface ProgressRingProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  className?: string;
  label?: string;
  showPercent?: boolean;
}

export function ProgressRing({ value, size = 64, strokeWidth = 5, className = '', label, showPercent = true }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;

  // Interpolate green (130°) → gold (42°) based on value
  const hue = 130 - (value / 100) * 88;
  const color = `hsl(${hue} 100% 45%)`;
  const glowColor = `hsl(${hue} 100% 45% / 0.6)`;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(140 12% 12%)"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          style={{ filter: `drop-shadow(0 0 6px ${glowColor})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showPercent && (
          <span className="text-xs font-bold font-medieval" style={{ color, textShadow: `0 0 8px ${glowColor}` }}>
            {Math.round(value)}%
          </span>
        )}
        {label && <span className="text-[8px] text-muted-foreground leading-tight">{label}</span>}
      </div>
    </div>
  );
}
