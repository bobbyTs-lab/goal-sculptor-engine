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
          <svg viewBox="0 0 500 520" className="w-60 h-60 md:w-72 md:h-72 mx-auto flex-shrink-0">
            <defs>
              <style>{`
                @keyframes dash-flow { to { stroke-dashoffset: -40; } }
                .spiral-line { animation: dash-flow 3s linear infinite; }
                @keyframes tick-fade { 0%, 100% { opacity: 0.12; } 50% { opacity: 0.35; } }
                .tick-mark { animation: tick-fade 4s ease-in-out infinite; }
              `}</style>
            </defs>

            {/* Vitruvian circle */}
            <circle cx="250" cy="260" r="230" fill="none" stroke="hsl(42 100% 50% / 0.25)" strokeWidth={0.8} />
            {/* Vitruvian square */}
            <rect x="68" y="42" width="364" height="448" fill="none" stroke="hsl(42 100% 50% / 0.18)" strokeWidth={0.6} />

            {/* Golden spiral */}
            <g className="spiral-line" fill="none" stroke="hsl(42 100% 50% / 0.35)" strokeWidth={0.7} strokeDasharray="6 10">
              <path d="M250 260 C250 200,300 180,330 190 C370 200,380 250,370 280 C355 330,310 350,280 345 C250 340,235 310,240 290 C245 270,255 262,250 260" />
            </g>
            <g className="spiral-line" fill="none" stroke="hsl(42 100% 50% / 0.22)" strokeWidth={0.5} strokeDasharray="5 12" style={{ animationDelay: '1.5s' }}>
              <path d="M250 260 C250 320,200 340,170 330 C130 320,120 270,130 240 C145 190,190 170,220 175 C250 180,265 210,260 230 C255 248,250 258,250 260" />
            </g>

            {/* Tick marks around circle */}
            {Array.from({ length: 36 }).map((_, i) => {
              const a = (i * 10) * Math.PI / 180;
              const r1 = 226, r2 = i % 3 === 0 ? 237 : 232;
              return (
                <line key={`t${i}`} x1={250 + r1 * Math.cos(a)} y1={260 + r1 * Math.sin(a)}
                  x2={250 + r2 * Math.cos(a)} y2={260 + r2 * Math.sin(a)}
                  stroke="hsl(42 100% 50% / 0.4)" strokeWidth={i % 3 === 0 ? 0.8 : 0.4}
                  className="tick-mark" style={{ animationDelay: `${i * 0.1}s` }} />
              );
            })}

            {/* Proportion guides */}
            <line x1="250" y1="30" x2="250" y2="500" stroke="hsl(42 100% 50% / 0.15)" strokeWidth={0.5} strokeDasharray="3 8" />
            <line x1="50" y1="260" x2="450" y2="260" stroke="hsl(42 100% 50% / 0.15)" strokeWidth={0.5} strokeDasharray="3 8" />

            {/* ===== ORGANIC BODY — Smooth curves ===== */}

            {/* Head — oval with slight jaw taper */}
            <path d="M250 50 C270 50,282 62,282 80 C282 98,270 112,258 114 C254 115,246 115,242 114 C230 112,218 98,218 80 C218 62,230 50,250 50Z" fill="hsl(140 12% 18%)" stroke="hsl(130 20% 25%)" strokeWidth={0.6} />

            {/* Neck */}
            <path d="M240 114 C240 114,242 126,243 130 L257 130 C258 126,260 114,260 114" fill="hsl(140 12% 16%)" stroke="hsl(130 18% 22%)" strokeWidth={0.4} />

            {/* Traps — curved mounds */}
            <MusclePath muscle="traps" ratio={muscleRatios.traps} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'traps'}
              d="M222 126 C230 118,242 116,250 118 C258 116,270 118,278 126 L276 140 C268 134,258 130,250 131 C242 130,232 134,224 140 Z" />

            {/* Shoulders — rounded deltoid caps */}
            <MusclePath muscle="shoulders" ratio={muscleRatios.shoulders} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'shoulders'}
              d="M222 126 C210 120,196 122,190 130 C186 136,186 144,190 150 L210 148 C216 142,220 136,222 130 Z" />
            <MusclePath muscle="shoulders" ratio={muscleRatios.shoulders} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'shoulders'}
              d="M278 126 C290 120,304 122,310 130 C314 136,314 144,310 150 L290 148 C284 142,280 136,278 130 Z" />

            {/* Chest — two pec shapes with natural curve */}
            <MusclePath muscle="chest" ratio={muscleRatios.chest} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'chest'}
              d="M224 136 C228 130,238 128,250 130 C262 128,272 130,276 136 L276 160 C270 168,262 172,250 170 C238 172,230 168,224 160 Z" />

            {/* === OUTSTRETCHED ARMS — smooth tapered limbs === */}

            {/* Left bicep */}
            <MusclePath muscle="biceps" ratio={muscleRatios.biceps} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'biceps'}
              d="M190 134 C182 132,170 134,154 142 C142 148,132 154,128 158 L136 166 C142 160,156 152,168 148 C180 144,188 142,192 144 Z" />
            {/* Left tricep */}
            <MusclePath muscle="triceps" ratio={muscleRatios.triceps} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'triceps'}
              d="M192 148 C186 150,172 154,158 160 C144 166,134 172,128 176 L136 166 C128 170,126 174,128 178 L140 178 C152 172,170 164,184 158 C192 154,194 152,192 148Z" />

            {/* Right bicep */}
            <MusclePath muscle="biceps" ratio={muscleRatios.biceps} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'biceps'}
              d="M310 134 C318 132,330 134,346 142 C358 148,368 154,372 158 L364 166 C358 160,344 152,332 148 C320 144,312 142,308 144 Z" />
            {/* Right tricep */}
            <MusclePath muscle="triceps" ratio={muscleRatios.triceps} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'triceps'}
              d="M308 148 C314 150,328 154,342 160 C356 166,366 172,372 176 L364 166 C372 170,374 174,372 178 L360 178 C348 172,330 164,316 158 C308 154,306 152,308 148Z" />

            {/* Left forearm */}
            <MusclePath muscle="forearms" ratio={muscleRatios.forearms} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'forearms'}
              d="M128 162 C118 168,100 178,86 186 C80 190,76 194,74 198 L82 202 C86 196,96 190,110 182 C122 176,132 170,136 168 Z" />
            {/* Right forearm */}
            <MusclePath muscle="forearms" ratio={muscleRatios.forearms} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'forearms'}
              d="M372 162 C382 168,400 178,414 186 C420 190,424 194,426 198 L418 202 C414 196,404 190,390 182 C378 176,368 170,364 168 Z" />

            {/* Hands — organic rounded */}
            <path d="M74 198 C68 200,62 206,60 212 C58 218,62 222,68 220 C72 218,78 212,82 206 Z" fill="hsl(140 12% 16%)" />
            <path d="M426 198 C432 200,438 206,440 212 C442 218,438 222,432 220 C428 218,422 212,418 206 Z" fill="hsl(140 12% 16%)" />

            {/* Lats — side torso sweep */}
            <MusclePath muscle="lats" ratio={muscleRatios.lats} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'lats'}
              d="M210 148 C208 156,206 168,208 180 C210 192,214 196,218 192 L224 160 C222 152,216 148,210 148Z" />
            <MusclePath muscle="lats" ratio={muscleRatios.lats} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'lats'}
              d="M290 148 C292 156,294 168,292 180 C290 192,286 196,282 192 L276 160 C278 152,284 148,290 148Z" />

            {/* Core — ab column with subtle narrowing at waist */}
            <MusclePath muscle="core" ratio={muscleRatios.core} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'core'}
              d="M230 164 C236 160,244 158,250 159 C256 158,264 160,270 164 L268 240 C264 248,258 252,250 252 C242 252,236 248,232 240 Z" />

            {/* Glutes — rounded seat */}
            <MusclePath muscle="glutes" ratio={muscleRatios.glutes} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'glutes'}
              d="M226 244 C232 238,240 236,250 237 C260 236,268 238,274 244 L274 268 C268 278,260 282,250 282 C240 282,232 278,226 268 Z" />

            {/* Quads — tapered thighs with natural curve */}
            <MusclePath muscle="quads" ratio={muscleRatios.quads} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'quads'}
              d="M226 268 C228 264,234 260,240 262 L238 374 C234 380,228 382,222 378 C218 374,218 368,220 360 Z" />
            <MusclePath muscle="quads" ratio={muscleRatios.quads} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'quads'}
              d="M274 268 C272 264,266 260,260 262 L262 374 C266 380,272 382,278 378 C282 374,282 368,280 360 Z" />

            {/* Hamstrings — inner thigh */}
            <MusclePath muscle="hamstrings" ratio={muscleRatios.hamstrings} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'hamstrings'}
              d="M242 264 C246 260,250 259,254 260 C258 260,260 262,260 264 L258 372 C254 376,246 376,242 372 Z" />

            {/* Calves — diamond-shaped with taper */}
            <MusclePath muscle="calves" ratio={muscleRatios.calves} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'calves'}
              d="M222 382 C226 376,232 374,236 378 L236 386 C238 400,236 420,232 440 C230 448,226 452,222 448 C218 440,216 420,218 400 C218 392,220 386,222 382Z" />
            <MusclePath muscle="calves" ratio={muscleRatios.calves} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'calves'}
              d="M278 382 C274 376,268 374,264 378 L264 386 C262 400,264 420,268 440 C270 448,274 452,278 448 C282 440,284 420,282 400 C282 392,280 386,278 382Z" />

            {/* Feet — natural foot shapes */}
            <path d="M218 448 C214 452,208 456,210 462 C212 466,222 468,232 464 C236 462,236 456,234 452 Z" fill="hsl(140 12% 16%)" />
            <path d="M282 448 C286 452,292 456,290 462 C288 466,278 468,268 464 C264 462,264 456,266 452 Z" fill="hsl(140 12% 16%)" />
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
