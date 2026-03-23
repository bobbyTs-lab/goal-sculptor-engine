export type Status = 'not_started' | 'in_progress' | 'complete';
export type GoalDomain = 'PHYSICAL' | 'CREATIVE' | 'PROFESSIONAL' | 'INTELLECTUAL' | 'LIFESTYLE';
export type EffortLevel = 'LOW' | 'MED' | 'HIGH';
export type HabitEvolution = 'NEW' | 'CARRY' | 'INCREASE' | 'REPLACE';

export interface HabitLog {
  habitId: string;
  date: string; // ISO date string YYYY-MM-DD
  completed: boolean;
  value?: number; // optional numeric tracking (e.g. grams of protein, minutes)
}

export interface ToDo {
  id: string;
  title: string;
  done: boolean;
  order: number;
  deadline?: string;
  effort?: EffortLevel;
  isBenchmark?: boolean;
}

export interface Habit {
  id: string;
  title: string;
  frequency: string; // "daily", "3x/week", "weekdays", etc.
  target?: string; // "200g protein", "30 minutes", etc.
  active: boolean;
  evolution?: HabitEvolution;
}

export interface TaskNote {
  id: string;
  text: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: Status;
  todos: ToDo[];
  habits: Habit[];
  notes?: TaskNote[];
  order: number;
  deadline?: string;
}

export interface Phase {
  id: string;
  title: string;
  description: string;
  deadline?: string;
  tasks: Task[];
  order: number;
}

export interface AdaptationProtocol {
  ahead: string;
  behind: string;
  blocked: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  endGoal: string;
  deadline?: string;
  phases: Phase[];
  createdAt: string;
  archived?: boolean;
  domain?: GoalDomain;
  adaptationProtocol?: AdaptationProtocol;
}

export function calculateTaskProgress(task: Task): number {
  if (task.todos.length === 0) return task.status === 'complete' ? 100 : 0;
  const done = task.todos.filter(t => t.done).length;
  return Math.round((done / task.todos.length) * 100);
}

export function calculatePhaseProgress(phase: Phase): number {
  if (phase.tasks.length === 0) return 0;
  const total = phase.tasks.reduce((sum, t) => sum + calculateTaskProgress(t), 0);
  return Math.round(total / phase.tasks.length);
}

export function calculateGoalProgress(goal: Goal): number {
  if (goal.phases.length === 0) return 0;
  const total = goal.phases.reduce((sum, p) => sum + calculatePhaseProgress(p), 0);
  return Math.round(total / goal.phases.length);
}

export function deriveTaskStatus(task: Task): Status {
  if (task.todos.length === 0) return task.status;
  const allDone = task.todos.every(t => t.done);
  const anyDone = task.todos.some(t => t.done);
  if (allDone) return 'complete';
  if (anyDone) return 'in_progress';
  return 'not_started';
}

export function getDaysRemaining(deadline?: string): number | null {
  if (!deadline) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const end = new Date(deadline);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function getUrgencyClass(days: number | null): string {
  if (days === null) return '';
  if (days < 0) return 'urgency-overdue';
  if (days <= 7) return 'urgency-critical';
  if (days <= 30) return 'urgency-warning';
  return 'urgency-safe';
}

export function getUrgencyColor(days: number | null): string {
  if (days === null) return 'text-muted-foreground';
  if (days < 0) return 'text-destructive';
  if (days <= 7) return 'text-destructive';
  if (days <= 30) return 'text-secondary';
  return 'text-primary';
}
