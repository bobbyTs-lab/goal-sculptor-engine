import { useState } from 'react';
import { motion } from 'framer-motion';
import { CompoundExercise, EXERCISE_LABELS, PersonalRecord } from '@/types/workout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Gold thresholds — "intermediate" strength standards (lbs)
const GOLD_THRESHOLDS: Record<CompoundExercise, number> = {
  squat: 225,
  deadlift: 315,
  bench_press: 185,
  overhead_press: 135,
  barbell_row: 155,
  pull_up: 45, // weighted pull-up added weight
};

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
    if (!pr) return 0;
    return Math.min(pr.weight / GOLD_THRESHOLDS[ex], 1);
  });
  
  return ratios.length > 0 ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 0;
}

function getMuscleColor(ratio: number): string {
  // Green (130°) → Gold (42°)
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
      strokeWidth={0.5}
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
      return { label: EXERCISE_LABELS[ex], pr: pr?.weight || 0, gold: GOLD_THRESHOLDS[ex] };
    }),
  } : null;

  // Simplified front body SVG paths (viewBox 0 0 200 400)
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
          <svg viewBox="0 0 200 400" className="w-40 h-72 mx-auto flex-shrink-0">
            {/* Head */}
            <ellipse cx="100" cy="30" rx="18" ry="22" fill="hsl(140 12% 18%)" stroke="hsl(130 20% 25%)" strokeWidth={0.5} />
            {/* Neck */}
            <rect x="92" y="50" width="16" height="12" rx="3" fill="hsl(140 12% 16%)" />
            
            {/* Traps */}
            <MusclePath muscle="traps" ratio={muscleRatios.traps} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'traps'}
              d="M80 60 Q90 55 100 58 Q110 55 120 60 L118 72 Q100 68 82 72 Z" />
            
            {/* Shoulders */}
            <MusclePath muscle="shoulders" ratio={muscleRatios.shoulders} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'shoulders'}
              d="M64 68 Q70 60 82 64 L82 82 Q72 80 64 78 Z" />
            <MusclePath muscle="shoulders" ratio={muscleRatios.shoulders} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'shoulders'}
              d="M136 68 Q130 60 118 64 L118 82 Q128 80 136 78 Z" />
            
            {/* Chest */}
            <MusclePath muscle="chest" ratio={muscleRatios.chest} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'chest'}
              d="M82 66 Q90 62 100 64 Q110 62 118 66 L118 92 Q110 96 100 94 Q90 96 82 92 Z" />
            
            {/* Biceps */}
            <MusclePath muscle="biceps" ratio={muscleRatios.biceps} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'biceps'}
              d="M60 80 Q64 76 68 80 L66 120 Q60 120 58 116 Z" />
            <MusclePath muscle="biceps" ratio={muscleRatios.biceps} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'biceps'}
              d="M140 80 Q136 76 132 80 L134 120 Q140 120 142 116 Z" />
            
            {/* Triceps */}
            <MusclePath muscle="triceps" ratio={muscleRatios.triceps} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'triceps'}
              d="M68 80 Q74 78 78 82 L76 120 Q70 120 66 116 Z" />
            <MusclePath muscle="triceps" ratio={muscleRatios.triceps} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'triceps'}
              d="M132 80 Q126 78 122 82 L124 120 Q130 120 134 116 Z" />
            
            {/* Forearms */}
            <MusclePath muscle="forearms" ratio={muscleRatios.forearms} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'forearms'}
              d="M58 120 Q64 118 68 120 L66 165 Q60 168 56 164 Z" />
            <MusclePath muscle="forearms" ratio={muscleRatios.forearms} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'forearms'}
              d="M142 120 Q136 118 132 120 L134 165 Q140 168 144 164 Z" />
            
            {/* Lats */}
            <MusclePath muscle="lats" ratio={muscleRatios.lats} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'lats'}
              d="M78 82 L82 92 L80 120 Q76 118 74 110 Z" />
            <MusclePath muscle="lats" ratio={muscleRatios.lats} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'lats'}
              d="M122 82 L118 92 L120 120 Q124 118 126 110 Z" />
            
            {/* Core / Abs */}
            <MusclePath muscle="core" ratio={muscleRatios.core} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'core'}
              d="M86 94 Q93 92 100 94 Q107 92 114 94 L112 148 Q106 152 100 150 Q94 152 88 148 Z" />
            
            {/* Glutes */}
            <MusclePath muscle="glutes" ratio={muscleRatios.glutes} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'glutes'}
              d="M82 148 Q90 144 100 146 Q110 144 118 148 L116 170 Q108 174 100 172 Q92 174 84 170 Z" />
            
            {/* Quads */}
            <MusclePath muscle="quads" ratio={muscleRatios.quads} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'quads'}
              d="M82 172 Q88 168 96 170 L94 260 Q86 262 80 258 Z" />
            <MusclePath muscle="quads" ratio={muscleRatios.quads} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'quads'}
              d="M118 172 Q112 168 104 170 L106 260 Q114 262 120 258 Z" />
            
            {/* Hamstrings (visible from front as inner thigh) */}
            <MusclePath muscle="hamstrings" ratio={muscleRatios.hamstrings} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'hamstrings'}
              d="M96 172 L100 170 L104 172 L104 255 Q100 258 96 255 Z" />
            
            {/* Calves */}
            <MusclePath muscle="calves" ratio={muscleRatios.calves} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'calves'}
              d="M82 262 Q88 258 94 260 L92 330 Q86 334 80 330 Z" />
            <MusclePath muscle="calves" ratio={muscleRatios.calves} onHover={setHoveredMuscle} hovered={hoveredMuscle === 'calves'}
              d="M118 262 Q112 258 106 260 L108 330 Q114 334 120 330 Z" />
            
            {/* Feet */}
            <ellipse cx="86" cy="340" rx="10" ry="5" fill="hsl(140 12% 16%)" />
            <ellipse cx="114" cy="340" rx="10" ry="5" fill="hsl(140 12% 16%)" />
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
                        <span className={ex.pr >= ex.gold ? 'glow-gold-text font-bold' : 'text-muted-foreground'}>
                          {ex.pr || '—'} / {ex.gold} lbs
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full mt-0.5 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: getMuscleColor(ex.pr ? Math.min(ex.pr / ex.gold, 1) : 0) }}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((ex.pr / ex.gold) * 100, 100)}%` }}
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
