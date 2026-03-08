import { Goal } from '@/types/goals';
import { WorkoutSession, ExerciseConfig, WeeklyPlan } from '@/types/workout';
import { DEFAULT_CONFIGS } from '@/types/workout';
import { UnlockedAchievement } from '@/lib/achievements';

const KEYS = {
  GOALS: 'goalforge_goals',
  SESSIONS: 'goalforge_sessions',
  EXERCISE_CONFIGS: 'goalforge_exercise_configs',
  WEEKLY_PLAN: 'goalforge_weekly_plan',
  SETTINGS: 'goalforge_settings',
  ACHIEVEMENTS: 'goalforge_achievements',
  TEMPLATES: 'goalforge_templates',
  WEEKLY_SCHEDULE: 'goalforge_weekly_schedule',
  WEEKLY_FOCUS: 'goalforge_weekly_focus',
  TIME_BLOCKS: 'goalforge_time_blocks',
  BLOCK_CATEGORIES: 'goalforge_block_categories',
  REPEATABLE_BLOCKS: 'goalforge_repeatable_blocks',
  CONTACTS: 'goalforge_contacts',
} as const;

// Repeatable Block Template
export type RepeatPattern = 'daily' | 'weekdays' | 'weekends' | 'custom';
export interface RepeatableBlock {
  id: string;
  title: string;
  categoryId: string;
  startHour: number;
  startMinute: number;
  durationMinutes: number;
  repeatPattern: RepeatPattern;
  customDays?: string[]; // e.g. ['Monday', 'Wednesday', 'Friday']
  enabled: boolean;
}

// Contact / Person
export type RelationshipTag = 'family' | 'friend' | 'coworker' | 'mentor' | 'mentee' | 'partner' | 'acquaintance' | 'other';
export interface Contact {
  id: string;
  name: string;
  relationship: RelationshipTag;
  phone?: string;
  email?: string;
  notes: string;
  plan: string; // goal/plan for this relationship
  createdAt: string;
}

// Time Block Types
export interface BlockCategory {
  id: string;
  name: string;
  color: string; // HSL string like "130 100% 40%"
}

export interface TimeBlock {
  id: string;
  dayName: string;
  categoryId: string;
  title: string;
  startHour: number; // 0-23
  startMinute: number; // 0 or 30
  durationMinutes: number; // multiples of 30
  todoId?: string; // optional link to a goal todo
  done?: boolean;
}

export const DEFAULT_CATEGORIES: BlockCategory[] = [
  { id: 'workout', name: 'Workout', color: '130 100% 40%' },
  { id: 'meals', name: 'Meals', color: '42 100% 50%' },
  { id: 'goals', name: 'Goals', color: '280 80% 55%' },
  { id: 'work', name: 'Work', color: '210 80% 50%' },
  { id: 'study', name: 'Study', color: '170 70% 40%' },
  { id: 'personal', name: 'Personal', color: '350 80% 55%' },
  { id: 'rest', name: 'Rest / Recovery', color: '60 20% 40%' },
];

export interface AppSettings {
  quotesEnabled: boolean;
  customQuotes: string[];
  bodyweight: number;
  ambientSoundEnabled: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  quotesEnabled: true,
  customQuotes: [],
  bodyweight: 180,
  ambientSoundEnabled: false,
};

export interface WorkoutTemplate {
  id: string;
  name: string;
  splitDay: string;
  exercises: { exercise: string; sets: number; weight: number; reps: number }[];
}

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
export const loadSettings = (): AppSettings => {
  const saved = load<AppSettings>(KEYS.SETTINGS, DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...saved };
};
export const saveSettings = (settings: AppSettings) => save(KEYS.SETTINGS, settings);

// Achievements
export const loadAchievements = (): UnlockedAchievement[] => load(KEYS.ACHIEVEMENTS, []);
export const saveAchievements = (achievements: UnlockedAchievement[]) => save(KEYS.ACHIEVEMENTS, achievements);

// Templates
export const loadTemplates = (): WorkoutTemplate[] => load(KEYS.TEMPLATES, []);
export const saveTemplates = (templates: WorkoutTemplate[]) => save(KEYS.TEMPLATES, templates);

// Weekly Schedule (day → todo IDs)
export type WeeklySchedule = Record<string, string[]>;
export const loadWeeklySchedule = (): WeeklySchedule => load(KEYS.WEEKLY_SCHEDULE, {});
export const saveWeeklySchedule = (schedule: WeeklySchedule) => save(KEYS.WEEKLY_SCHEDULE, schedule);

// Weekly Focus (prioritized goal IDs)
export const loadWeeklyFocus = (): string[] => load(KEYS.WEEKLY_FOCUS, []);
export const saveWeeklyFocus = (focus: string[]) => save(KEYS.WEEKLY_FOCUS, focus);

// Time Blocks
export const loadTimeBlocks = (): TimeBlock[] => load(KEYS.TIME_BLOCKS, []);
export const saveTimeBlocks = (blocks: TimeBlock[]) => save(KEYS.TIME_BLOCKS, blocks);

// Block Categories
export const loadBlockCategories = (): BlockCategory[] => load(KEYS.BLOCK_CATEGORIES, DEFAULT_CATEGORIES);
export const saveBlockCategories = (cats: BlockCategory[]) => save(KEYS.BLOCK_CATEGORIES, cats);

// Repeatable Blocks
export const loadRepeatableBlocks = (): RepeatableBlock[] => load(KEYS.REPEATABLE_BLOCKS, []);
export const saveRepeatableBlocks = (blocks: RepeatableBlock[]) => save(KEYS.REPEATABLE_BLOCKS, blocks);

// Contacts
export const loadContacts = (): Contact[] => load(KEYS.CONTACTS, []);
export const saveContacts = (contacts: Contact[]) => save(KEYS.CONTACTS, contacts);

// Export all data
export function exportAllData(): string {
  return JSON.stringify({
    goals: loadGoals(),
    sessions: loadSessions(),
    exerciseConfigs: loadExerciseConfigs(),
    weeklyPlan: loadWeeklyPlan(),
    settings: loadSettings(),
    achievements: loadAchievements(),
    templates: loadTemplates(),
  }, null, 2);
}

// Import all data
export function importAllData(data: Record<string, unknown>) {
  if (data.goals) saveGoals(data.goals as Goal[]);
  if (data.sessions) saveSessions(data.sessions as WorkoutSession[]);
  if (data.exerciseConfigs) saveExerciseConfigs(data.exerciseConfigs as ExerciseConfig[]);
  if (data.weeklyPlan) saveWeeklyPlan(data.weeklyPlan as WeeklyPlan);
  if (data.settings) saveSettings(data.settings as AppSettings);
  if (data.achievements) saveAchievements(data.achievements as UnlockedAchievement[]);
  if (data.templates) saveTemplates(data.templates as WorkoutTemplate[]);
}

// Clear all data
export function clearAllData() {
  Object.values(KEYS).forEach(key => localStorage.removeItem(key));
}

export function generateId(): string {
  return crypto.randomUUID();
}
