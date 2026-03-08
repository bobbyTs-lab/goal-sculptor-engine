export type Status = 'not_started' | 'in_progress' | 'complete';

export interface ToDo {
  id: string;
  title: string;
  done: boolean;
  order: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: Status;
  todos: ToDo[];
  order: number;
}

export interface Phase {
  id: string;
  title: string;
  description: string;
  deadline?: string;
  tasks: Task[];
  order: number;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  endGoal: string;
  deadline?: string;
  phases: Phase[];
  createdAt: string;
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
