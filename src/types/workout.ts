export type CompoundExercise = 
  | 'squat' | 'deadlift' | 'bench_press' 
  | 'overhead_press' | 'barbell_row' | 'pull_up';

export type SplitDay = 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'rest';

export interface SetLog {
  reps: number;
  weight: number;
  rpe: number; // 1-5
}

export interface ExerciseLog {
  exercise: CompoundExercise;
  sets: SetLog[];
  date: string;
  notes?: string;
}

export interface WorkoutSession {
  id: string;
  date: string;
  splitDay: SplitDay;
  exercises: ExerciseLog[];
}

export interface ExerciseConfig {
  exercise: CompoundExercise;
  targetSets: number;
  repRangeMin: number;
  repRangeMax: number;
  currentWeight: number;
  weightIncrement: number; // lbs/kg to jump
}

export interface WeeklyPlan {
  id: string;
  name: string;
  days: { day: string; splitDay: SplitDay; exercises: CompoundExercise[] }[];
}

export interface PersonalRecord {
  exercise: CompoundExercise;
  weight: number;
  reps: number;
  date: string;
  volumeLoad: number;
}

export const EXERCISE_LABELS: Record<CompoundExercise, string> = {
  squat: 'Squat',
  deadlift: 'Deadlift',
  bench_press: 'Bench Press',
  overhead_press: 'Overhead Press',
  barbell_row: 'Barbell Row',
  pull_up: 'Pull-Up',
};

export const DEFAULT_CONFIGS: ExerciseConfig[] = [
  { exercise: 'squat', targetSets: 3, repRangeMin: 6, repRangeMax: 8, currentWeight: 135, weightIncrement: 5 },
  { exercise: 'deadlift', targetSets: 3, repRangeMin: 5, repRangeMax: 7, currentWeight: 185, weightIncrement: 10 },
  { exercise: 'bench_press', targetSets: 3, repRangeMin: 6, repRangeMax: 8, currentWeight: 135, weightIncrement: 5 },
  { exercise: 'overhead_press', targetSets: 3, repRangeMin: 6, repRangeMax: 8, currentWeight: 85, weightIncrement: 2.5 },
  { exercise: 'barbell_row', targetSets: 3, repRangeMin: 6, repRangeMax: 8, currentWeight: 115, weightIncrement: 5 },
  { exercise: 'pull_up', targetSets: 3, repRangeMin: 5, repRangeMax: 8, currentWeight: 0, weightIncrement: 5 },
];
