import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Model, { IExerciseData, IMuscleStats, Muscle } from 'react-body-highlighter';
import { CompoundExercise, EXERCISE_LABELS, PersonalRecord, CustomExercise, isBuiltInExercise, MuscleGroup } from '@/types/workout';
import { getStandard } from '@/lib/strength-standards';
import { X } from 'lucide-react';

function getGoldThreshold(exercise: CompoundExercise, bodyweight: number, goldTargets: Record<string, number>): number {
  if (goldTargets[exercise]) return goldTargets[exercise];
  return getStandard(exercise, 'advanced', bodyweight);
}

function getExerciseRatio(exercise: CompoundExercise, pr: PersonalRecord | undefined, threshold: number): number {
  if (!pr || threshold === 0) return 0;
  if (exercise === 'pull_up') return Math.min(pr.reps / threshold, 1);
  return Math.min(pr.weight / threshold, 1);
}

function getExerciseDisplay(exercise: CompoundExercise, pr: PersonalRecord | undefined, threshold: number): { current: string; gold: string } {
  if (exercise === 'pull_up') {
    return { current: pr ? `${pr.reps} reps` : '—', gold: `${threshold} reps` };
  }
  return { current: pr ? `${pr.weight} lbs` : '—', gold: `${threshold} lbs` };
}

// Our app muscle groups → which compound exercises work them, with weight (1.0 = primary, 0.3 = secondary)
const APP_MUSCLE_EXERCISES: Record<string, { exercise: CompoundExercise; weight: number }[]> = {
  chest: [{ exercise: 'bench_press', weight: 1.0 }],
  back: [{ exercise: 'pull_up', weight: 1.0 }, { exercise: 'barbell_row', weight: 1.0 }, { exercise: 'deadlift', weight: 0.3 }],
  shoulders: [{ exercise: 'overhead_press', weight: 1.0 }, { exercise: 'bench_press', weight: 0.3 }],
  biceps: [{ exercise: 'barbell_row', weight: 0.5 }, { exercise: 'pull_up', weight: 0.5 }],
  triceps: [{ exercise: 'bench_press', weight: 0.5 }, { exercise: 'overhead_press', weight: 0.5 }],
  quads: [{ exercise: 'squat', weight: 1.0 }],
  hamstrings: [{ exercise: 'deadlift', weight: 1.0 }, { exercise: 'squat', weight: 0.2 }],
  glutes: [{ exercise: 'squat', weight: 0.7 }, { exercise: 'deadlift', weight: 0.7 }],
  calves: [{ exercise: 'squat', weight: 0.2 }],
  core: [{ exercise: 'squat', weight: 0.3 }, { exercise: 'deadlift', weight: 0.3 }, { exercise: 'overhead_press', weight: 0.3 }],
  forearms: [{ exercise: 'deadlift', weight: 0.3 }, { exercise: 'barbell_row', weight: 0.3 }, { exercise: 'pull_up', weight: 0.3 }],
  traps: [{ exercise: 'deadlift', weight: 0.5 }, { exercise: 'barbell_row', weight: 0.5 }],
  neck: [], // Only shows progress from neck-specific custom exercises
};

// Map our app muscle groups → library's Muscle names (for the SVG)
const APP_TO_LIB_MUSCLES: Record<string, Muscle[]> = {
  chest: ['chest'],
  back: ['upper-back', 'lower-back'],
  shoulders: ['front-deltoids', 'back-deltoids'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  quads: ['quadriceps'],
  hamstrings: ['hamstring'],
  glutes: ['gluteal'],
  calves: ['calves', 'left-soleus', 'right-soleus'],
  core: ['abs', 'obliques'],
  forearms: ['forearm'],
  traps: ['trapezius'],
  neck: ['neck'],
};

// Reverse map: library muscle name → our app muscle group
const LIB_TO_APP_MUSCLE: Record<string, string> = {};
Object.entries(APP_TO_LIB_MUSCLES).forEach(([appMuscle, libMuscles]) => {
  libMuscles.forEach(lm => { LIB_TO_APP_MUSCLE[lm] = appMuscle; });
});

// 10-step navy → gold gradient for smooth per-muscle coloring
const GRADIENT_STEPS = [
  'hsl(220, 60%, 40%)',   // 1 — deep navy
  'hsl(215, 55%, 44%)',   // 2
  'hsl(205, 50%, 48%)',   // 3 — steel blue
  'hsl(190, 48%, 48%)',   // 4
  'hsl(170, 45%, 48%)',   // 5 — teal
  'hsl(130, 42%, 48%)',   // 6 — green
  'hsl(90, 50%, 48%)',    // 7 — olive
  'hsl(65, 65%, 48%)',    // 8 — yellow-green
  'hsl(50, 80%, 50%)',    // 9 — gold
  'hsl(45, 90%, 52%)',    // 10 — bright gold
];

function getMuscleRatio(muscle: string, prs: PersonalRecord[], bodyweight: number, goldTargets: Record<string, number>): number {
  const entries = APP_MUSCLE_EXERCISES[muscle] || [];
  if (entries.length === 0) return 0;
  let totalWeight = 0;
  let weightedSum = 0;
  for (const { exercise, weight } of entries) {
    const pr = prs.find(p => p.exercise === exercise);
    const threshold = getGoldThreshold(exercise, bodyweight, goldTargets);
    const ratio = getExerciseRatio(exercise, pr, threshold);
    weightedSum += ratio * weight;
    totalWeight += weight;
  }
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

function getMuscleColor(ratio: number): string {
  if (ratio === 0) return 'hsl(220, 60%, 40%)';
  const idx = Math.min(GRADIENT_STEPS.length - 1, Math.floor(ratio * GRADIENT_STEPS.length));
  return GRADIENT_STEPS[idx];
}

// Compute custom exercise PR-based ratios per muscle group
// Uses the same gold target system as compound exercises
function getCustomMuscleRatios(
  prs: PersonalRecord[],
  customExercises: CustomExercise[],
  goldTargets: Record<string, number>,
): Record<string, number> {
  // Build lookup: custom exercise ID → { muscleGroups, equipment }
  const customMap = new Map<string, CustomExercise>();
  for (const ce of customExercises) {
    customMap.set(ce.id, ce);
  }

  // For each muscle group, collect best ratio from custom exercises targeting it
  const bestRatioPerMuscle: Record<string, number> = {};

  for (const pr of prs) {
    if (isBuiltInExercise(pr.exercise)) continue;
    const ce = customMap.get(pr.exercise);
    if (!ce || ce.muscleGroups.length === 0) continue;

    const target = goldTargets[ce.id];
    if (!target) continue; // No gold target set — can't calculate ratio

    const ratio = ce.equipment === 'bodyweight'
      ? Math.min(pr.reps / target, 1)
      : Math.min(pr.weight / target, 1);

    for (const muscle of ce.muscleGroups) {
      bestRatioPerMuscle[muscle] = Math.max(bestRatioPerMuscle[muscle] || 0, ratio);
    }
  }

  return bestRatioPerMuscle;
}

interface BodyDiagramProps {
  prs: PersonalRecord[];
  customExercises?: CustomExercise[];
  bodyweight?: number;
  goldTargets?: Record<string, number>;
}

export function BodyDiagram({ prs, customExercises = [], bodyweight = 180, goldTargets = {} }: BodyDiagramProps) {
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [viewType, setViewType] = useState<'anterior' | 'posterior'>('anterior');

  // Compute custom exercise PR-based ratios per muscle group
  const customRatios = useMemo(
    () => getCustomMuscleRatios(prs, customExercises, goldTargets),
    [prs, customExercises, goldTargets],
  );

  // Compute final ratio per muscle group: max of compound PR ratio and custom exercise volume ratio
  const muscleRatios: Record<string, number> = {};
  Object.keys(APP_MUSCLE_EXERCISES).forEach(m => {
    const compoundRatio = getMuscleRatio(m, prs, bodyweight, goldTargets);
    const customRatio = customRatios[m] || 0;
    muscleRatios[m] = Math.max(compoundRatio, customRatio);
  });

  // Build per-muscle data for the body highlighter
  // Each app muscle group becomes its own "exercise" entry targeting the library SVG muscles
  // frequency = 1-10 based on the muscle's ratio → maps to GRADIENT_STEPS
  const modelData: IExerciseData[] = useMemo(() => {
    const data: IExerciseData[] = [];
    Object.entries(APP_TO_LIB_MUSCLES).forEach(([appMuscle, libMuscles]) => {
      const ratio = muscleRatios[appMuscle] || 0;
      if (ratio === 0) return;
      const frequency = Math.max(1, Math.ceil(ratio * GRADIENT_STEPS.length));
      data.push({
        name: appMuscle,
        muscles: libMuscles,
        frequency,
      });
    });
    return data;
  }, [prs, customExercises, goldTargets]);

  // Find custom exercises that target the selected muscle group (PR-based, like compounds)
  const customExercisesForMuscle = useMemo(() => {
    if (!selectedMuscle) return [];

    const relevant = customExercises.filter(ce =>
      ce.muscleGroups.includes(selectedMuscle as MuscleGroup)
    );
    if (relevant.length === 0) return [];

    return relevant.map(ce => {
      const pr = prs.find(p => p.exercise === ce.id);
      const target = goldTargets[ce.id];
      const isBodyweight = ce.equipment === 'bodyweight';

      if (!target) {
        // No gold target set — show PR but no ratio
        return {
          label: ce.name,
          current: pr ? (isBodyweight ? `${pr.reps} reps` : `${pr.weight} lbs`) : '—',
          gold: 'No target set',
          ratio: 0,
          hasTarget: false,
        };
      }

      const ratio = pr
        ? Math.min((isBodyweight ? pr.reps : pr.weight) / target, 1)
        : 0;

      return {
        label: ce.name,
        current: pr ? (isBodyweight ? `${pr.reps} reps` : `${pr.weight} lbs`) : '—',
        gold: `${target} ${isBodyweight ? 'reps' : 'lbs'}`,
        ratio,
        hasTarget: true,
      };
    }).filter(e => e.hasTarget || e.current !== '—'); // Show if has a target or has logged data
  }, [selectedMuscle, customExercises, prs, goldTargets]);

  const selectedInfo = selectedMuscle ? {
    name: selectedMuscle.charAt(0).toUpperCase() + selectedMuscle.slice(1),
    ratio: muscleRatios[selectedMuscle] || 0,
    exercises: (APP_MUSCLE_EXERCISES[selectedMuscle] || []).map(({ exercise: ex, weight }) => {
      const pr = prs.find(p => p.exercise === ex);
      const threshold = getGoldThreshold(ex, bodyweight, goldTargets);
      const display = getExerciseDisplay(ex, pr, threshold);
      const ratio = getExerciseRatio(ex, pr, threshold);
      return { label: EXERCISE_LABELS[ex], ...display, ratio, weight };
    }),
    customExercises: customExercisesForMuscle,
  } : null;

  const muscleRanking = Object.entries(muscleRatios)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const handleClick = (data: IMuscleStats) => {
    // Map the clicked library muscle back to our app muscle group
    const appMuscle = LIB_TO_APP_MUSCLE[data.muscle];
    if (!appMuscle) return;
    setSelectedMuscle(prev => prev === appMuscle ? null : appMuscle);
  };

  return (
    <div className="flex flex-col items-center relative">
      {/* Legend */}
      <div className="flex items-center gap-3 mb-2 text-[10px] text-muted-foreground uppercase tracking-wider">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: GRADIENT_STEPS[0] }} />
          Novice
        </span>
        <span className="text-border">→</span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: GRADIENT_STEPS[GRADIENT_STEPS.length - 1] }} />
          Gold
        </span>
      </div>

      {/* Front/Back toggle */}
      <div className="flex gap-1 mb-3">
        <button
          onClick={() => setViewType('anterior')}
          className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-medium transition-colors ${
            viewType === 'anterior'
              ? 'bg-primary/15 text-primary border border-primary/30'
              : 'text-muted-foreground border border-border hover:border-primary/20'
          }`}
        >
          Front
        </button>
        <button
          onClick={() => setViewType('posterior')}
          className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-medium transition-colors ${
            viewType === 'posterior'
              ? 'bg-primary/15 text-primary border border-primary/30'
              : 'text-muted-foreground border border-border hover:border-primary/20'
          }`}
        >
          Back
        </button>
      </div>

      {/* Body Model */}
      <div className="w-full max-w-[260px] mx-auto">
        <Model
          data={modelData}
          style={{ width: '100%' }}
          onClick={handleClick}
          bodyColor="hsl(var(--muted))"
          highlightedColors={GRADIENT_STEPS}
          type={viewType}
        />
      </div>

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
                    <span className={ex.ratio >= 1 ? 'font-bold' : 'text-muted-foreground'} style={ex.ratio >= 1 ? { color: GRADIENT_STEPS[GRADIENT_STEPS.length - 1] } : {}}>
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
              {selectedInfo.customExercises.length > 0 && (
                <>
                  {selectedInfo.exercises.length > 0 && (
                    <div className="border-t border-border pt-2 mt-2">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Custom Exercises</p>
                    </div>
                  )}
                  {selectedInfo.customExercises.map(ce => (
                    <div key={ce.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-foreground font-medium">{ce.label}</span>
                        <span className={ce.ratio >= 1 ? 'font-bold' : 'text-muted-foreground'} style={ce.ratio >= 1 ? { color: GRADIENT_STEPS[GRADIENT_STEPS.length - 1] } : {}}>
                          {ce.current} / {ce.gold}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: getMuscleColor(ce.ratio) }}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(ce.ratio * 100, 100)}%` }}
                          transition={{ duration: 0.4 }}
                        />
                      </div>
                    </div>
                  ))}
                </>
              )}
              {selectedInfo.exercises.length === 0 && selectedInfo.customExercises.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No exercises logged for this muscle group</p>
              )}
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
