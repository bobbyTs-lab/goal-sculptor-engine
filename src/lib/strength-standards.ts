import { CompoundExercise, EXERCISE_LABELS } from '@/types/workout';

// Strength standards as multipliers of bodyweight
// Source: approximate Rippetoe / ExRx / Symmetric Strength norms
export type StrengthLevel = 'beginner' | 'novice' | 'intermediate' | 'advanced' | 'elite';

const STANDARDS: Record<CompoundExercise, Record<StrengthLevel, number>> = {
  squat:          { beginner: 0.75, novice: 1.25, intermediate: 1.75, advanced: 2.25, elite: 2.75 },
  deadlift:       { beginner: 1.0,  novice: 1.5,  intermediate: 2.0,  advanced: 2.5,  elite: 3.0 },
  bench_press:    { beginner: 0.5,  novice: 0.85, intermediate: 1.25, advanced: 1.65, elite: 2.0 },
  overhead_press: { beginner: 0.35, novice: 0.55, intermediate: 0.8,  advanced: 1.05, elite: 1.3 },
  barbell_row:    { beginner: 0.4,  novice: 0.7,  intermediate: 1.0,  advanced: 1.35, elite: 1.65 },
  pull_up:        { beginner: 1,    novice: 5,    intermediate: 10,   advanced: 15,   elite: 20 }, // reps, not multiplier
};

const LEVELS: StrengthLevel[] = ['beginner', 'novice', 'intermediate', 'advanced', 'elite'];

export function getStandard(exercise: CompoundExercise, level: StrengthLevel, bodyweight: number): number {
  if (exercise === 'pull_up') return STANDARDS[exercise][level]; // reps
  return Math.round(STANDARDS[exercise][level] * bodyweight);
}

export function getStrengthLevel(exercise: CompoundExercise, value: number, bodyweight: number): { level: StrengthLevel; percentToNext: number } {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    const threshold = getStandard(exercise, LEVELS[i], bodyweight);
    if (value >= threshold) {
      if (i === LEVELS.length - 1) return { level: LEVELS[i], percentToNext: 100 };
      const nextThreshold = getStandard(exercise, LEVELS[i + 1], bodyweight);
      const percentToNext = Math.round(((value - threshold) / (nextThreshold - threshold)) * 100);
      return { level: LEVELS[i], percentToNext: Math.min(percentToNext, 100) };
    }
  }
  const beginnerThreshold = getStandard(exercise, 'beginner', bodyweight);
  return { level: 'beginner', percentToNext: Math.round((value / beginnerThreshold) * 100) };
}

export function getRadarData(prs: { exercise: CompoundExercise; weight: number; reps: number }[], bodyweight: number) {
  const exercises: CompoundExercise[] = ['squat', 'deadlift', 'bench_press', 'overhead_press', 'barbell_row', 'pull_up'];
  return exercises.map(ex => {
    const pr = prs.find(p => p.exercise === ex);
    const value = pr ? (ex === 'pull_up' ? pr.reps : pr.weight) : 0;
    const eliteStd = getStandard(ex, 'elite', bodyweight);
    const ratio = eliteStd > 0 ? Math.min(value / eliteStd, 1) : 0;
    const level = getStrengthLevel(ex, value, bodyweight);
    return {
      exercise: ex,
      label: EXERCISE_LABELS[ex],
      value,
      ratio,
      level: level.level,
      percentToNext: level.percentToNext,
    };
  });
}

// Epley formula: 1RM = weight × (1 + reps/30)
export function estimate1RM(weight: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

// Brzycki formula: 1RM = weight × 36 / (37 - reps)
export function estimate1RMBrzycki(weight: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return weight;
  if (reps >= 37) return weight * 2; // cap it
  return Math.round(weight * 36 / (37 - reps));
}

export const LEVEL_COLORS: Record<StrengthLevel, string> = {
  beginner: 'hsl(0 0% 50%)',
  novice: 'hsl(130 60% 40%)',
  intermediate: 'hsl(200 80% 50%)',
  advanced: 'hsl(42 100% 50%)',
  elite: 'hsl(280 100% 60%)',
};

export { LEVELS, STANDARDS };
