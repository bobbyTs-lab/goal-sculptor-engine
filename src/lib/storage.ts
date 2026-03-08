import { Goal } from '@/types/goals';
import { WorkoutSession, ExerciseConfig, WeeklyPlan } from '@/types/workout';
import { DEFAULT_CONFIGS } from '@/types/workout';

const KEYS = {
  GOALS: 'goalforge_goals',
  SESSIONS: 'goalforge_sessions',
  EXERCISE_CONFIGS: 'goalforge_exercise_configs',
  WEEKLY_PLAN: 'goalforge_weekly_plan',
} as const;

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function save<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Goals
export const loadGoals = (): Goal[] => load(KEYS.GOALS, []);
export const saveGoals = (goals: Goal[]) => save(KEYS.GOALS, goals);

// Workout Sessions
export const loadSessions = (): WorkoutSession[] => load(KEYS.SESSIONS, []);
export const saveSessions = (sessions: WorkoutSession[]) => save(KEYS.SESSIONS, sessions);

// Exercise Configs
export const loadExerciseConfigs = (): ExerciseConfig[] => load(KEYS.EXERCISE_CONFIGS, DEFAULT_CONFIGS);
export const saveExerciseConfigs = (configs: ExerciseConfig[]) => save(KEYS.EXERCISE_CONFIGS, configs);

// Weekly Plan
export const loadWeeklyPlan = (): WeeklyPlan | null => load(KEYS.WEEKLY_PLAN, null);
export const saveWeeklyPlan = (plan: WeeklyPlan) => save(KEYS.WEEKLY_PLAN, plan);

// Export all data
export function exportAllData(): string {
  return JSON.stringify({
    goals: loadGoals(),
    sessions: loadSessions(),
    exerciseConfigs: loadExerciseConfigs(),
    weeklyPlan: loadWeeklyPlan(),
  }, null, 2);
}

export function generateId(): string {
  return crypto.randomUUID();
}
