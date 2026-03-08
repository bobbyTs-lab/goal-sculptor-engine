import { Goal } from '@/types/goals';
import { WorkoutSession, ExerciseConfig, WeeklyPlan } from '@/types/workout';
import { DEFAULT_CONFIGS } from '@/types/workout';

const KEYS = {
  GOALS: 'goalforge_goals',
  SESSIONS: 'goalforge_sessions',
  EXERCISE_CONFIGS: 'goalforge_exercise_configs',
  WEEKLY_PLAN: 'goalforge_weekly_plan',
  SETTINGS: 'goalforge_settings',
} as const;

export interface AppSettings {
  quotesEnabled: boolean;
  customQuotes: string[];
}

const DEFAULT_SETTINGS: AppSettings = {
  quotesEnabled: true,
  customQuotes: [],
};

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

// Settings
export const loadSettings = (): AppSettings => load(KEYS.SETTINGS, DEFAULT_SETTINGS);
export const saveSettings = (settings: AppSettings) => save(KEYS.SETTINGS, settings);

// Export all data
export function exportAllData(): string {
  return JSON.stringify({
    goals: loadGoals(),
    sessions: loadSessions(),
    exerciseConfigs: loadExerciseConfigs(),
    weeklyPlan: loadWeeklyPlan(),
    settings: loadSettings(),
  }, null, 2);
}

// Import all data
export function importAllData(data: Record<string, unknown>) {
  if (data.goals) saveGoals(data.goals as Goal[]);
  if (data.sessions) saveSessions(data.sessions as WorkoutSession[]);
  if (data.exerciseConfigs) saveExerciseConfigs(data.exerciseConfigs as ExerciseConfig[]);
  if (data.weeklyPlan) saveWeeklyPlan(data.weeklyPlan as WeeklyPlan);
  if (data.settings) saveSettings(data.settings as AppSettings);
}

// Clear all data
export function clearAllData() {
  Object.values(KEYS).forEach(key => localStorage.removeItem(key));
}

export function generateId(): string {
  return crypto.randomUUID();
}
