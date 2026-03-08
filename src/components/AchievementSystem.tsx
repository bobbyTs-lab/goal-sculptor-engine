import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Achievement, TIER_COLORS } from '@/lib/achievements';
import { Trophy } from 'lucide-react';

interface AchievementSystemProps {
  achievements: (Achievement & { unlocked: boolean; unlockedAt?: string })[];
}

export function AchievementSystem({ achievements }: AchievementSystemProps) {
  const unlocked = achievements.filter(a => a.unlocked);
  const locked = achievements.filter(a => !a.unlocked);

  return (
    <Card className="border-rough relative overflow-hidden scanlines bg-card/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medieval flex items-center gap-2">
          <Trophy className="h-4 w-4 text-secondary drop-shadow-[0_0_6px_hsl(42,100%,50%,0.5)]" />
          Trophy Case
          <span className="text-xs text-muted-foreground ml-auto">
            {unlocked.length}/{achievements.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          <AnimatePresence>
            {achievements.map((a) => (
              <motion.div
                key={a.id}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`relative flex flex-col items-center p-2 rounded border text-center ${
                  a.unlocked
                    ? 'border-secondary/40 bg-secondary/5'
                    : 'border-muted/30 bg-muted/5 opacity-40 grayscale'
                }`}
                title={`${a.title}: ${a.description}`}
              >
                <span className="text-2xl mb-1">{a.icon}</span>
                <span className="text-[10px] font-medieval leading-tight">{a.title}</span>
                <span
                  className="text-[8px] uppercase tracking-wider font-bold mt-0.5"
                  style={{ color: a.unlocked ? TIER_COLORS[a.tier] : 'hsl(0 0% 40%)' }}
                >
                  {a.tier}
                </span>
                {a.unlocked && (
                  <motion.div
                    className="absolute -inset-0.5 rounded pointer-events-none"
                    style={{
                      boxShadow: `0 0 8px ${TIER_COLORS[a.tier]}40, inset 0 0 4px ${TIER_COLORS[a.tier]}20`,
                    }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
