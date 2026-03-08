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

  // Vitruvian Man — arms outstretched, inscribed in circle + square
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
          <svg viewBox="0 0 500 500" className="w-56 h-56 md:w-64 md:h-64 mx-auto flex-shrink-0">
            <defs>
              {/* Animated dash for golden spiral */}
              <style>{`
                @keyframes dash-flow {
                  to { stroke-dashoffset: -40; }
                }
                .spiral-line {
                  animation: dash-flow 3s linear infinite;
                }
                @keyframes tick-fade {
                  0%, 100% { opacity: 0.15; }
                  50% { opacity: 0.4; }
                }
                .tick-mark {
                  animation: tick-fade 4s ease-in-out infinite;
                }
              `}</style>
            </defs>

            {/* Vitruvian circle */}
            <circle cx="250" cy="250" r="220" fill="none" stroke="hsl(130 100% 40% / 0.08)" strokeWidth={1} />
            {/* Vitruvian square */}
            <rect x="80" y="48" width="340" height="420" fill="none" stroke="hsl(42 100% 50% / 0.06)" strokeWidth={1} rx="2" />

            {/* Golden ratio spiral — approximated with arcs */}
            <g className="spiral-line" fill="none" stroke="hsl(42 100% 50% / 0.12)" strokeWidth={0.7} strokeDasharray="8 12">
              <path d="M 250 250 
                Q 250 180, 310 180 
                Q 370 180, 370 240 
                Q 370 320, 300 340 
                Q 230 360, 210 300 
                Q 190 240, 230 220 
                Q 260 200, 270 230 
                Q 280 255, 258 260 
                Q 240 265, 245 250" />
            </g>
            {/* Secondary spiral — mirrored, offset phase */}
            <g className="spiral-line" fill="none" stroke="hsl(42 100% 50% / 0.07)" strokeWidth={0.5} strokeDasharray="6 14" style={{ animationDelay: '1.5s' }}>
              <path d="M 250 250 
                Q 250 320, 190 320 
                Q 130 320, 130 260 
                Q 130 180, 200 160 
                Q 270 140, 290 200 
                Q 310 260, 270 280 
                Q 240 300, 230 270 
                Q 220 245, 242 240 
                Q 260 235, 255 250" />
            </g>

            {/* Measurement tick marks along circle */}
            {Array.from({ length: 36 }).map((_, i) => {
              const angle = (i * 10) * Math.PI / 180;
              const r1 = 216;
              const r2 = i % 3 === 0 ? 228 : 224;
              const x1 = 250 + r1 * Math.cos(angle);
              const y1 = 250 + r1 * Math.sin(angle);
              const x2 = 250 + r2 * Math.cos(angle);
              const y2 = 250 + r2 * Math.sin(angle);
              return (
                <line key={`tick-c-${i}`} x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="hsl(42 100% 50% / 0.2)" strokeWidth={i % 3 === 0 ? 0.8 : 0.4}
                  className="tick-mark" style={{ animationDelay: `${i * 0.1}s` }} />
              );
            })}

            {/* Measurement tick marks along square edges (top & bottom) */}
            {Array.from({ length: 18 }).map((_, i) => {
              const x = 80 + (i + 1) * (340 / 19);
              return (
                <g key={`tick-s-${i}`} className="tick-mark" style={{ animationDelay: `${i * 0.15}s` }}>
                  <line x1={x} y1={48} x2={x} y2={i % 3 === 0 ? 56 : 52}
                    stroke="hsl(42 100% 50% / 0.15)" strokeWidth={i % 3 === 0 ? 0.7 : 0.3} />
                  <line x1={x} y1={468} x2={x} y2={i % 3 === 0 ? 460 : 464}
                    stroke="hsl(42 100% 50% / 0.15)" strokeWidth={i % 3 === 0 ? 0.7 : 0.3} />
                </g>
              );
            })}

            {/* Proportion lines — Da Vinci measurement guides */}
            <line x1="250" y1="30" x2="250" y2="470" stroke="hsl(42 100% 50% / 0.04)" strokeWidth={0.5} strokeDasharray="4 8" />
            <line x1="60" y1="250" x2="440" y2="250" stroke="hsl(42 100% 50% / 0.04)" strokeWidth={0.5} strokeDasharray="4 8" />

            {/* === BODY — Arms outstretched, classical proportions === */}

            {/* Head */}
            <ellipse cx="250" cy="78" rx="22" ry="28" fill="hsl(140 12% 18%)" stroke="hsl(130 20% 25%)" strokeWidth={0.8} />
            {/* Neck */}
            <rect x="242" y="104" width="16" height="14" rx="3" fill="hsl(140 12% 16%)" />

            {/* Traps */}
            <MusclePath muscle="traps" ratio={muscleRatios.traps} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'traps'}
              d="M222 114 Q236 108 250 112 Q264 108 278 114 L274 128 Q250 122 226 128 Z" />

            {/* Shoulders — broad rounded deltoids */}
            <MusclePath muscle="shoulders" ratio={muscleRatios.shoulders} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'shoulders'}
              d="M196 120 Q204 110 218 114 L226 120 L222 140 Q210 138 198 134 Z" />
            <MusclePath muscle="shoulders" ratio={muscleRatios.shoulders} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'shoulders'}
              d="M304 120 Q296 110 282 114 L274 120 L278 140 Q290 138 302 134 Z" />

            {/* Chest */}
            <MusclePath muscle="chest" ratio={muscleRatios.chest} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'chest'}
              d="M224 122 Q237 118 250 120 Q263 118 276 122 L274 152 Q263 158 250 156 Q237 158 226 152 Z" />

            {/* === OUTSTRETCHED ARMS === */}
            {/* Left upper arm — angled outward */}
            {/* Biceps left */}
            <MusclePath muscle="biceps" ratio={muscleRatios.biceps} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'biceps'}
              d="M194 128 L186 126 L146 140 L140 148 L150 152 L190 140 Z" />
            {/* Triceps left */}
            <MusclePath muscle="triceps" ratio={muscleRatios.triceps} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'triceps'}
              d="M190 140 L150 152 L146 160 L152 164 L192 150 L196 142 Z" />

            {/* Biceps right */}
            <MusclePath muscle="biceps" ratio={muscleRatios.biceps} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'biceps'}
              d="M306 128 L314 126 L354 140 L360 148 L350 152 L310 140 Z" />
            {/* Triceps right */}
            <MusclePath muscle="triceps" ratio={muscleRatios.triceps} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'triceps'}
              d="M310 140 L350 152 L354 160 L348 164 L308 150 L304 142 Z" />

            {/* Forearms left */}
            <MusclePath muscle="forearms" ratio={muscleRatios.forearms} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'forearms'}
              d="M140 148 L92 168 L86 176 L92 180 L146 160 Z" />
            {/* Forearms right */}
            <MusclePath muscle="forearms" ratio={muscleRatios.forearms} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'forearms'}
              d="M360 148 L408 168 L414 176 L408 180 L354 160 Z" />

            {/* Hands */}
            <ellipse cx="82" cy="176" rx="10" ry="7" fill="hsl(140 12% 16%)" transform="rotate(-15 82 176)" />
            <ellipse cx="418" cy="176" rx="10" ry="7" fill="hsl(140 12% 16%)" transform="rotate(15 418 176)" />

            {/* Lats */}
            <MusclePath muscle="lats" ratio={muscleRatios.lats} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'lats'}
              d="M214 140 L224 152 L222 180 Q214 174 210 164 Z" />
            <MusclePath muscle="lats" ratio={muscleRatios.lats} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'lats'}
              d="M286 140 L276 152 L278 180 Q286 174 290 164 Z" />

            {/* Core / Abs */}
            <MusclePath muscle="core" ratio={muscleRatios.core} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'core'}
              d="M228 156 Q239 152 250 154 Q261 152 272 156 L270 232 Q260 238 250 236 Q240 238 230 232 Z" />

            {/* Glutes */}
            <MusclePath muscle="glutes" ratio={muscleRatios.glutes} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'glutes'}
              d="M224 232 Q236 228 250 230 Q264 228 276 232 L274 256 Q262 262 250 260 Q238 262 226 256 Z" />

            {/* Quads */}
            <MusclePath muscle="quads" ratio={muscleRatios.quads} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'quads'}
              d="M222 258 Q232 252 242 256 L238 358 Q228 362 218 356 Z" />
            <MusclePath muscle="quads" ratio={muscleRatios.quads} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'quads'}
              d="M278 258 Q268 252 258 256 L262 358 Q272 362 282 356 Z" />

            {/* Hamstrings */}
            <MusclePath muscle="hamstrings" ratio={muscleRatios.hamstrings} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'hamstrings'}
              d="M242 258 L250 256 L258 258 L258 354 Q250 358 242 354 Z" />

            {/* Calves */}
            <MusclePath muscle="calves" ratio={muscleRatios.calves} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'calves'}
              d="M220 362 Q230 356 238 360 L234 434 Q226 438 216 432 Z" />
            <MusclePath muscle="calves" ratio={muscleRatios.calves} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'calves'}
              d="M280 362 Q270 356 262 360 L266 434 Q274 438 284 432 Z" />

            {/* Feet */}
            <ellipse cx="226" cy="444" rx="14" ry="6" fill="hsl(140 12% 16%)" />
            <ellipse cx="274" cy="444" rx="14" ry="6" fill="hsl(140 12% 16%)" />
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
