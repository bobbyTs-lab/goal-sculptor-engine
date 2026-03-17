import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CompoundExercise, EXERCISE_LABELS, PersonalRecord } from '@/types/workout';
import { X } from 'lucide-react';

// Gold thresholds — realistic "advanced intermediate" 1RM standards (lbs)
const GOLD_THRESHOLDS: Record<CompoundExercise, number> = {
  squat: 315, deadlift: 405, bench_press: 225,
  overhead_press: 155, barbell_row: 205, pull_up: 15,
};

function getExerciseRatio(exercise: CompoundExercise, pr: PersonalRecord | undefined): number {
  if (!pr) return 0;
  if (exercise === 'pull_up') return Math.min(pr.reps / GOLD_THRESHOLDS[exercise], 1);
  return Math.min(pr.weight / GOLD_THRESHOLDS[exercise], 1);
}

function getExerciseDisplay(exercise: CompoundExercise, pr: PersonalRecord | undefined): { current: string; gold: string } {
  if (exercise === 'pull_up') {
    return { current: pr ? `${pr.reps} reps` : '—', gold: `${GOLD_THRESHOLDS[exercise]} reps` };
  }
  return { current: pr ? `${pr.weight} lbs` : '—', gold: `${GOLD_THRESHOLDS[exercise]} lbs` };
}

const MUSCLE_EXERCISE_MAP: Record<string, CompoundExercise[]> = {
  chest: ['bench_press'], shoulders: ['overhead_press', 'bench_press'],
  triceps: ['bench_press', 'overhead_press'], biceps: ['barbell_row', 'pull_up'],
  lats: ['pull_up', 'barbell_row'], traps: ['deadlift', 'barbell_row'],
  core: ['squat', 'deadlift', 'overhead_press'], quads: ['squat'],
  hamstrings: ['deadlift', 'squat'], glutes: ['squat', 'deadlift'],
  calves: ['squat'], forearms: ['deadlift', 'barbell_row', 'pull_up'],
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
  // Navy (220°) → Coral (12°) based on development
  const hue = 220 - ratio * 208;
  const sat = 50 + ratio * 30;
  const lightness = 45 + ratio * 15;
  return `hsl(${hue} ${sat}% ${lightness}%)`;
}

// Anatomical muscle paths — front view
const MUSCLE_PATHS: Record<string, string[]> = {
  traps: [
    'M88 105 C85 102,78 100,72 102 L72 108 C76 110,82 111,88 112 Z',
    'M112 105 C115 102,122 100,128 102 L128 108 C124 110,118 111,112 112 Z',
  ],
  shoulders: [
    'M72 102 C62 100,55 106,54 114 C53 120,56 126,62 128 L72 124 C72 118,72 110,72 102 Z',
    'M128 102 C138 100,145 106,146 114 C147 120,144 126,138 128 L128 124 C128 118,128 110,128 102 Z',
  ],
  chest: [
    'M88 112 C82 110,76 112,72 118 C70 124,72 130,76 134 L88 140 C92 136,94 128,92 120 Z',
    'M112 112 C118 110,124 112,128 118 C130 124,128 130,124 134 L112 140 C108 136,106 128,108 120 Z',
  ],
  biceps: [
    'M62 128 C58 130,56 136,56 142 C56 150,58 156,62 160 L68 158 C68 152,68 144,68 136 C68 132,66 130,62 128 Z',
    'M138 128 C142 130,144 136,144 142 C144 150,142 156,138 160 L132 158 C132 152,132 144,132 136 C132 132,134 130,138 128 Z',
  ],
  triceps: [
    'M68 130 C72 128,74 132,74 138 C74 148,72 156,68 160 L62 158 Z',
    'M132 130 C128 128,126 132,126 138 C126 148,128 156,132 160 L138 158 Z',
  ],
  forearms: [
    'M56 160 C54 164,52 172,52 180 C52 190,54 198,56 204 L64 202 C64 194,64 184,64 174 C64 168,62 162,60 160 Z',
    'M144 160 C146 164,148 172,148 180 C148 190,146 198,144 204 L136 202 C136 194,136 184,136 174 C136 168,138 162,140 160 Z',
  ],
  core: [
    'M92 140 L108 140 L108 148 L92 148 Z',
    'M92 150 L108 150 L108 160 L92 160 Z',
    'M92 162 L108 162 L108 172 L92 172 Z',
    'M93 174 L107 174 L106 186 C104 190,96 190,94 186 Z',
  ],
  lats: [
    'M72 124 C68 130,66 140,68 150 C70 158,74 162,78 160 L78 140 C78 132,76 126,72 124 Z',
    'M128 124 C132 130,134 140,132 150 C130 158,126 162,122 160 L122 140 C122 132,124 126,128 124 Z',
  ],
  glutes: [
    'M82 190 C86 186,92 184,100 185 C108 184,114 186,118 190 L118 200 C114 204,108 206,100 206 C92 206,86 204,82 200 Z',
  ],
  quads: [
    'M82 200 C80 206,78 216,78 228 C78 248,80 268,82 288 C84 300,86 310,88 316 L96 316 C96 306,96 290,96 270 C96 246,96 224,96 208 C96 202,92 198,86 198 Z',
    'M118 200 C120 206,122 216,122 228 C122 248,120 268,118 288 C116 300,114 310,112 316 L104 316 C104 306,104 290,104 270 C104 246,104 224,104 208 C104 202,108 198,114 198 Z',
  ],
  hamstrings: [
    'M96 206 C98 204,100 204,100 206 L100 310 L96 310 Z',
    'M104 206 C102 204,100 204,100 206 L100 310 L104 310 Z',
  ],
  calves: [
    'M82 318 C80 324,78 336,78 348 C78 360,80 372,82 380 C84 386,88 388,90 384 C90 374,90 358,90 344 C90 334,88 326,86 320 Z',
    'M118 318 C120 324,122 336,122 348 C122 360,120 372,118 380 C116 386,112 388,110 384 C110 374,110 358,110 344 C110 334,112 326,114 320 Z',
  ],
};

const BODY_OUTLINE_PATHS = [
  'M92 56 C92 42,96 32,100 28 C104 32,108 42,108 56 C108 68,106 76,104 82 C102 86,98 86,96 82 C94 76,92 68,92 56 Z',
  'M94 84 L94 105 L106 105 L106 84',
  'M48 204 C46 208,44 214,46 218 C48 220,52 220,54 216 C56 212,56 208,56 204 Z',
  'M152 204 C154 208,156 214,154 218 C152 220,148 220,146 216 C144 212,144 208,144 204 Z',
  'M78 384 C76 388,72 392,74 396 C76 400,84 402,90 398 C92 396,92 390,90 386 Z',
  'M122 384 C124 388,128 392,126 396 C124 400,116 402,110 398 C108 396,108 390,110 386 Z',
];

interface BodyDiagramProps {
  prs: PersonalRecord[];
}

export function BodyDiagram({ prs }: BodyDiagramProps) {
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);

  const muscleRatios: Record<string, number> = {};
  Object.keys(MUSCLE_EXERCISE_MAP).forEach(m => {
    muscleRatios[m] = getMuscleRatio(m, prs);
  });

  const selectedInfo = selectedMuscle ? {
    name: selectedMuscle.charAt(0).toUpperCase() + selectedMuscle.slice(1),
    ratio: muscleRatios[selectedMuscle] || 0,
    exercises: (MUSCLE_EXERCISE_MAP[selectedMuscle] || []).map(ex => {
      const pr = prs.find(p => p.exercise === ex);
      const display = getExerciseDisplay(ex, pr);
      const ratio = getExerciseRatio(ex, pr);
      return { label: EXERCISE_LABELS[ex], ...display, ratio };
    }),
  } : null;

  const muscleRanking = Object.entries(muscleRatios)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const handleMuscleClick = (muscle: string) => {
    setSelectedMuscle(prev => prev === muscle ? null : muscle);
  };

  return (
    <div className="flex flex-col items-center relative">
      {/* Decorative coral circle */}
      <div className="section-circle circle-coral w-64 h-64 -top-8 left-1/2 -translate-x-1/2" />

      {/* Legend */}
      <div className="flex items-center gap-3 mb-3 text-[10px] text-muted-foreground uppercase tracking-wider">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-primary" />
          Novice
        </span>
        <span className="text-border">→</span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'hsl(12 80% 65%)' }} />
          Gold
        </span>
      </div>

      <svg viewBox="0 0 200 420" className="w-full max-w-[280px] mx-auto relative z-10">
        {BODY_OUTLINE_PATHS.map((d, i) => (
          <path key={`outline-${i}`} d={d} fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth={0.5} />
        ))}
        {Object.entries(MUSCLE_PATHS).map(([muscle, paths]) =>
          paths.map((d, i) => {
            const ratio = muscleRatios[muscle] || 0;
            const isSelected = selectedMuscle === muscle;
            return (
              <motion.path
                key={`${muscle}-${i}`}
                d={d}
                fill={getMuscleColor(ratio)}
                stroke={isSelected ? 'hsl(var(--foreground))' : 'hsl(var(--background))'}
                strokeWidth={isSelected ? 1.2 : 0.5}
                style={{ cursor: 'pointer' }}
                onClick={() => handleMuscleClick(muscle)}
                animate={{
                  opacity: selectedMuscle && !isSelected ? 0.4 : 0.9,
                  scale: isSelected ? 1.02 : 1,
                }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.15 }}
              />
            );
          })
        )}
      </svg>

      <AnimatePresence mode="wait">
        {selectedInfo ? (
          <motion.div
            key={selectedMuscle}
            initial={{ opacity: 0, y: 20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 10, height: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full mt-4 rounded-xl bg-card border border-border p-4 overflow-hidden shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">{selectedInfo.name}</h3>
                <p className="text-xs text-muted-foreground">
                  Development: <span className="font-bold" style={{ color: getMuscleColor(selectedInfo.ratio) }}>
                    {Math.round(selectedInfo.ratio * 100)}%
                  </span>
                </p>
              </div>
              <button onClick={() => setSelectedMuscle(null)} className="p-1 rounded-md hover:bg-muted text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2.5">
              {selectedInfo.exercises.map(ex => (
                <div key={ex.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-foreground font-medium">{ex.label}</span>
                    <span className={ex.ratio >= 1 ? 'text-coral font-bold' : 'text-muted-foreground'}>
                      {ex.current} / {ex.gold}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: getMuscleColor(ex.ratio) }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(ex.ratio * 100, 100)}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="ranking"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full mt-4 space-y-1.5"
          >
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Top Muscle Groups</p>
            {muscleRanking.map(([muscle, ratio]) => (
              <button
                key={muscle}
                onClick={() => setSelectedMuscle(muscle)}
                className="w-full flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg hover:bg-card transition-colors"
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getMuscleColor(ratio) }} />
                <span className="capitalize text-foreground">{muscle}</span>
                <span className="ml-auto font-bold" style={{ color: getMuscleColor(ratio) }}>
                  {Math.round(ratio * 100)}%
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
