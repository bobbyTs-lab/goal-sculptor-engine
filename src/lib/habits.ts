import { Habit, HabitLog } from '@/types/goals';

export function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

export function isHabitDueToday(habit: Habit): boolean {
  if (!habit.active) return false;
  const freq = habit.frequency.toLowerCase().trim();
  const day = new Date().getDay(); // 0=Sun, 6=Sat
  if (freq === 'daily') return true;
  if (freq === 'weekdays') return day >= 1 && day <= 5;
  if (freq === 'weekends') return day === 0 || day === 6;
  // "3x/week", "4x/week" etc — show it, user decides which days
  if (/^\d+x\/week$/i.test(freq)) return true;
  // Specific day mentions: "mon/wed/fri", "tuesday, thursday"
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayAbbrs = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const mentioned = dayNames.some((name, i) => freq.includes(name) || freq.includes(dayAbbrs[i]));
  if (mentioned) {
    return dayNames.some((name, i) => (freq.includes(name) || freq.includes(dayAbbrs[i])) && i === day);
  }
  return true; // default: show it
}

export function isHabitCompletedOn(habitId: string, date: string, logs: HabitLog[]): boolean {
  return logs.some(l => l.habitId === habitId && l.date === date && l.completed);
}

export function getHabitLogForDate(habitId: string, date: string, logs: HabitLog[]): HabitLog | undefined {
  return logs.find(l => l.habitId === habitId && l.date === date);
}

export function getCurrentStreak(habitId: string, logs: HabitLog[]): number {
  const habitLogs = logs
    .filter(l => l.habitId === habitId && l.completed)
    .map(l => l.date)
    .sort((a, b) => b.localeCompare(a)); // newest first

  if (habitLogs.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(today);

  // If today isn't completed, start checking from yesterday
  const todayKey = getTodayKey();
  if (!habitLogs.includes(todayKey)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  const logSet = new Set(habitLogs);
  for (let i = 0; i < 365; i++) {
    const key = checkDate.toISOString().split('T')[0];
    if (logSet.has(key)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export function getLongestStreak(habitId: string, logs: HabitLog[]): number {
  const dates = logs
    .filter(l => l.habitId === habitId && l.completed)
    .map(l => l.date)
    .sort();

  if (dates.length === 0) return 0;

  let longest = 1;
  let current = 1;

  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays === 1) {
      current++;
      longest = Math.max(longest, current);
    } else if (diffDays > 1) {
      current = 1;
    }
    // diffDays === 0 means duplicate, skip
  }
  return longest;
}

export function getWeeklyCompletionRate(habitId: string, logs: HabitLog[], frequency: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay()); // Sunday

  const weekLogs = logs.filter(l =>
    l.habitId === habitId && l.completed && l.date >= weekStart.toISOString().split('T')[0]
  );
  const completedDays = weekLogs.length;

  const freq = frequency.toLowerCase();
  let targetDays = 7;
  if (freq === 'daily') targetDays = 7;
  else if (freq === 'weekdays') targetDays = 5;
  else if (freq === 'weekends') targetDays = 2;
  else {
    const match = freq.match(/^(\d+)x\/week$/i);
    if (match) targetDays = parseInt(match[1]);
  }

  return Math.min(1, completedDays / targetDays);
}

export interface HabitStats {
  habitId: string;
  currentStreak: number;
  longestStreak: number;
  weeklyRate: number;
  totalCompletions: number;
}

export function getHabitStats(habitId: string, frequency: string, logs: HabitLog[]): HabitStats {
  return {
    habitId,
    currentStreak: getCurrentStreak(habitId, logs),
    longestStreak: getLongestStreak(habitId, logs),
    weeklyRate: getWeeklyCompletionRate(habitId, frequency, logs),
    totalCompletions: logs.filter(l => l.habitId === habitId && l.completed).length,
  };
}

/** Get all active habits from all goals, flattened with their parent context */
export interface FlatHabit {
  habit: Habit;
  goalId: string;
  goalTitle: string;
  taskId: string;
  taskTitle: string;
}

import { Goal } from '@/types/goals';

/**
 * Returns active habits from ALL non-complete tasks in the current phase per goal.
 * "Current phase" = the first phase that has any non-complete task.
 * This allows parallel habits (e.g., swim + bike + run + nutrition in an Ironman plan)
 * while preventing future-phase habits from showing.
 */
export function getAllActiveHabits(goals: Goal[]): FlatHabit[] {
  const result: FlatHabit[] = [];
  for (const goal of goals) {
    if (goal.archived) continue;
    // Find the current phase: first phase that has any non-complete task
    for (const phase of goal.phases) {
      const hasActiveTask = phase.tasks.some(t => {
        if (t.todos.length === 0) return t.status !== 'complete';
        return !t.todos.every(td => td.done);
      });
      if (hasActiveTask) {
        // Collect habits from ALL non-complete tasks in this phase
        for (const task of phase.tasks) {
          const taskComplete = task.todos.length > 0
            ? task.todos.every(td => td.done)
            : task.status === 'complete';
          if (taskComplete) continue;
          for (const habit of task.habits) {
            if (habit.active) {
              result.push({
                habit,
                goalId: goal.id,
                goalTitle: goal.title,
                taskId: task.id,
                taskTitle: task.title,
              });
            }
          }
        }
        break; // only current phase — don't show future phases
      }
    }
  }
  return result;
}

export function getTodaysHabits(goals: Goal[], logs: HabitLog[]): (FlatHabit & { completed: boolean; streak: number })[] {
  const today = getTodayKey();
  return getAllActiveHabits(goals)
    .filter(fh => isHabitDueToday(fh.habit))
    .map(fh => ({
      ...fh,
      completed: isHabitCompletedOn(fh.habit.id, today, logs),
      streak: getCurrentStreak(fh.habit.id, logs),
    }));
}
