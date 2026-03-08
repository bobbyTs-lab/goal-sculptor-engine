import { useState } from 'react';
import { motion } from 'framer-motion';
import { CompoundExercise, EXERCISE_LABELS, PersonalRecord } from '@/types/workout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Gold thresholds — realistic "advanced intermediate" 1RM standards (lbs)
// Pull-ups use total reps in a set as the metric instead of weight
const GOLD_THRESHOLDS: Record<CompoundExercise, number> = {
  squat: 315,
  deadlift: 405,
  bench_press: 225,
  overhead_press: 155,
  barbell_row: 205,
  pull_up: 15, // reps — bodyweight mastery, not added weight
};

// For pull-ups, we use reps instead of weight for the ratio
function getExerciseRatio(exercise: CompoundExercise, pr: PersonalRecord | undefined): number {
  if (!pr) return 0;
  if (exercise === 'pull_up') {
    // Use best reps as the metric
    return Math.min(pr.reps / GOLD_THRESHOLDS[exercise], 1);
  }
  return Math.min(pr.weight / GOLD_THRESHOLDS[exercise], 1);
}

function getExerciseDisplay(exercise: CompoundExercise, pr: PersonalRecord | undefined): { current: string; gold: string } {
  if (exercise === 'pull_up') {
    return { current: pr ? `${pr.reps} reps` : '—', gold: `${GOLD_THRESHOLDS[exercise]} reps` };
  }
  return { current: pr ? `${pr.weight} lbs` : '—', gold: `${GOLD_THRESHOLDS[exercise]} lbs` };
}

// Which exercises map to which muscle groups
const MUSCLE_EXERCISE_MAP: Record<string, CompoundExercise[]> = {
  chest: ['bench_press'],
  shoulders: ['overhead_press', 'bench_press'],
  triceps: ['bench_press', 'overhead_press'],
  biceps: ['barbell_row', 'pull_up'],
  lats: ['pull_up', 'barbell_row'],
  traps: ['deadlift', 'barbell_row'],
  core: ['squat', 'deadlift', 'overhead_press'],
  quads: ['squat'],
  hamstrings: ['deadlift', 'squat'],
  glutes: ['squat', 'deadlift'],
  calves: ['squat'],
  forearms: ['deadlift', 'barbell_row', 'pull_up'],
};

function getMuscleRatio(muscle: string, prs: PersonalRecord[]): number {
  const exercises = MUSCLE_EXERCISE_MAP[muscle] || [];
  if (exercises.length === 0) return 0;
  
  const ratios = exercises.map(ex => {
    const pr = prs.find(p => p.exercise === ex);
    return getExerciseRatio(ex, pr);
  });
  
  return ratios.length > 0 ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 0;
}

function getMuscleColor(ratio: number): string {
  const hue = 130 - ratio * 88;
  const lightness = 40 + ratio * 15;
  return `hsl(${hue} 100% ${lightness}%)`;
}

function getMuscleGlow(ratio: number): string {
  const hue = 130 - ratio * 88;
  return `drop-shadow(0 0 ${4 + ratio * 8}px hsl(${hue} 100% 50% / ${0.3 + ratio * 0.5}))`;
}

interface MusclePathProps {
  d: string;
  muscle: string;
  ratio: number;
  onHover: (muscle: string | null) => void;
  hovered: boolean;
}

function MusclePath({ d, muscle, ratio, onHover, hovered }: MusclePathProps) {
  const color = getMuscleColor(ratio);
  return (
    <motion.path
      d={d}
      fill={color}
      stroke="hsl(140 18% 7%)"
      strokeWidth={0.8}
      style={{ filter: getMuscleGlow(ratio), cursor: 'pointer' }}
      onMouseEnter={() => onHover(muscle)}
      onMouseLeave={() => onHover(null)}
      animate={{
        scale: hovered ? 1.03 : 1,
        opacity: hovered ? 1 : 0.85,
      }}
      transition={{ duration: 0.2 }}
    />
  );
}

interface BodyDiagramProps {
  prs: PersonalRecord[];
}

export function BodyDiagram({ prs }: BodyDiagramProps) {
  const [hoveredMuscle, setHoveredMuscle] = useState<string | null>(null);

  const muscleRatios: Record<string, number> = {};
  Object.keys(MUSCLE_EXERCISE_MAP).forEach(m => {
    muscleRatios[m] = getMuscleRatio(m, prs);
  });

  const hoveredInfo = hoveredMuscle ? {
    name: hoveredMuscle.charAt(0).toUpperCase() + hoveredMuscle.slice(1),
    ratio: muscleRatios[hoveredMuscle] || 0,
    exercises: (MUSCLE_EXERCISE_MAP[hoveredMuscle] || []).map(ex => {
      const pr = prs.find(p => p.exercise === ex);
      const display = getExerciseDisplay(ex, pr);
      const ratio = getExerciseRatio(ex, pr);
      return { label: EXERCISE_LABELS[ex], ...display, ratio };
    }),
  } : null;

  // Da Vinci Vitruvian-inspired proportions (viewBox 0 0 300 480)
  // Broader shoulders, anatomical proportions, classical form
  return (
    <Card className="border-rough relative overflow-hidden scanlines bg-card/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medieval flex items-center gap-2">
          🏋️ Muscle Development
          <span className="text-xs text-muted-foreground ml-auto">
            <span style={{ color: 'hsl(130 100% 45%)' }}>●</span> Novice → <span style={{ color: 'hsl(42 100% 50%)' }}>●</span> Gold
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="flex items-start gap-4">
          <svg viewBox="0 0 300 480" className="w-48 h-80 mx-auto flex-shrink-0">
            {/* Head */}
            <ellipse cx="150" cy="38" rx="22" ry="28" fill="hsl(140 12% 18%)" stroke="hsl(130 20% 25%)" strokeWidth={0.8} />
            {/* Neck */}
            <rect x="140" y="64" width="20" height="16" rx="4" fill="hsl(140 12% 16%)" />

            {/* Traps — wide, connecting neck to shoulders */}
            <MusclePath muscle="traps" ratio={muscleRatios.traps} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'traps'}
              d="M120 72 Q135 66 150 70 Q165 66 180 72 L176 86 Q150 80 124 86 Z" />

            {/* Shoulders / Delts — broad, rounded caps */}
            <MusclePath muscle="shoulders" ratio={muscleRatios.shoulders} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'shoulders'}
              d="M80 82 Q88 70 108 72 L120 78 L118 100 Q100 98 86 94 Z" />
            <MusclePath muscle="shoulders" ratio={muscleRatios.shoulders} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'shoulders'}
              d="M220 82 Q212 70 192 72 L180 78 L182 100 Q200 98 214 94 Z" />

            {/* Chest — two pectoral masses */}
            <MusclePath muscle="chest" ratio={muscleRatios.chest} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'chest'}
              d="M118 80 Q130 76 150 78 Q170 76 182 80 L180 112 Q168 118 150 116 Q132 118 120 112 Z" />

            {/* Biceps — front of upper arm */}
            <MusclePath muscle="biceps" ratio={muscleRatios.biceps} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'biceps'}
              d="M76 96 Q82 90 88 96 L84 148 Q76 148 72 142 Z" />
            <MusclePath muscle="biceps" ratio={muscleRatios.biceps} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'biceps'}
              d="M224 96 Q218 90 212 96 L216 148 Q224 148 228 142 Z" />

            {/* Triceps — back of upper arm */}
            <MusclePath muscle="triceps" ratio={muscleRatios.triceps} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'triceps'}
              d="M88 96 Q96 92 104 98 L100 148 Q92 148 84 144 Z" />
            <MusclePath muscle="triceps" ratio={muscleRatios.triceps} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'triceps'}
              d="M212 96 Q204 92 196 98 L200 148 Q208 148 216 144 Z" />

            {/* Lats — wide V-taper from armpits */}
            <MusclePath muscle="lats" ratio={muscleRatios.lats} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'lats'}
              d="M108 100 L118 112 L116 148 Q108 142 104 132 Z" />
            <MusclePath muscle="lats" ratio={muscleRatios.lats} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'lats'}
              d="M192 100 L182 112 L184 148 Q192 142 196 132 Z" />

            {/* Forearms */}
            <MusclePath muscle="forearms" ratio={muscleRatios.forearms} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'forearms'}
              d="M72 150 Q80 146 88 150 L84 206 Q76 210 68 204 Z" />
            <MusclePath muscle="forearms" ratio={muscleRatios.forearms} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'forearms'}
              d="M228 150 Q220 146 212 150 L216 206 Q224 210 232 204 Z" />

            {/* Core / Abs — central torso */}
            <MusclePath muscle="core" ratio={muscleRatios.core} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'core'}
              d="M124 118 Q137 114 150 116 Q163 114 176 118 L174 190 Q162 196 150 194 Q138 196 126 190 Z" />

            {/* Glutes */}
            <MusclePath muscle="glutes" ratio={muscleRatios.glutes} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'glutes'}
              d="M120 190 Q132 186 150 188 Q168 186 180 190 L178 214 Q164 220 150 218 Q136 220 122 214 Z" />

            {/* Quads — large thigh muscles */}
            <MusclePath muscle="quads" ratio={muscleRatios.quads} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'quads'}
              d="M118 216 Q128 210 140 214 L136 320 Q124 324 114 318 Z" />
            <MusclePath muscle="quads" ratio={muscleRatios.quads} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'quads'}
              d="M182 216 Q172 210 160 214 L164 320 Q176 324 186 318 Z" />

            {/* Hamstrings — inner thigh visible from front */}
            <MusclePath muscle="hamstrings" ratio={muscleRatios.hamstrings} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'hamstrings'}
              d="M140 216 L150 214 L160 216 L160 316 Q150 320 140 316 Z" />

            {/* Calves */}
            <MusclePath muscle="calves" ratio={muscleRatios.calves} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'calves'}
              d="M116 324 Q126 318 136 322 L132 408 Q122 412 112 406 Z" />
            <MusclePath muscle="calves" ratio={muscleRatios.calves} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'calves'}
              d="M184 324 Q174 318 164 322 L168 408 Q178 412 188 406 Z" />

            {/* Feet */}
            <ellipse cx="122" cy="418" rx="14" ry="6" fill="hsl(140 12% 16%)" />
            <ellipse cx="178" cy="418" rx="14" ry="6" fill="hsl(140 12% 16%)" />

            {/* Hands */}
            <ellipse cx="76" cy="214" rx="8" ry="10" fill="hsl(140 12% 16%)" />
            <ellipse cx="224" cy="214" rx="8" ry="10" fill="hsl(140 12% 16%)" />
          </svg>

          {/* Info panel */}
          <div className="flex-1 min-w-0">
            {hoveredInfo ? (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-2"
              >
                <h3 className="font-medieval font-bold text-lg" style={{ color: getMuscleColor(hoveredInfo.ratio) }}>
                  {hoveredInfo.name}
                </h3>
                <div className="text-xs text-muted-foreground">
                  Development: <span className="font-bold" style={{ color: getMuscleColor(hoveredInfo.ratio) }}>
                    {Math.round(hoveredInfo.ratio * 100)}%
                  </span>
                </div>
                <div className="space-y-1.5 mt-2">
                  {hoveredInfo.exercises.map(ex => (
                    <div key={ex.label} className="text-xs">
                      <div className="flex justify-between font-medieval">
                        <span>{ex.label}</span>
                        <span className={ex.ratio >= 1 ? 'glow-gold-text font-bold' : 'text-muted-foreground'}>
                          {ex.current} / {ex.gold}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full mt-0.5 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: getMuscleColor(ex.ratio) }}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(ex.ratio * 100, 100)}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <div className="text-xs text-muted-foreground font-medieval space-y-2">
                <p className="italic">Hover over a muscle group to see details</p>
                <div className="space-y-1 mt-3">
                  {Object.entries(muscleRatios).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([muscle, ratio]) => (
                    <div key={muscle} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getMuscleColor(ratio) }} />
                      <span className="capitalize">{muscle}</span>
                      <span className="ml-auto font-bold" style={{ color: getMuscleColor(ratio) }}>
                        {Math.round(ratio * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
