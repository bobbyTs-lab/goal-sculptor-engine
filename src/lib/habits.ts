import { Habit, HabitLog } from '@/types/goals';

export function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

export function isHabitDueToday(habit: Habit): boolean {
  if (!habit.active) return false;
  const freq = habit.frequency.toLowerCase();
  const day = new Date().getDay(); // 0=Sun, 6=Sat
  if (freq === 'daily') return true;
  if (freq === 'weekdays') return day >= 1 && day <= 5;
  if (freq === 'weekends') return day === 0 || day === 6;
  // "3x/week", "4x/week" etc — always show as due, user decides when
  if (/^\d+x\/week$/i.test(freq)) return true;
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

export function getAllActiveHabits(goals: Goal[]): FlatHabit[] {
  const result: FlatHabit[] = [];
  for (const goal of goals) {
    for (const phase of goal.phases) {
      for (const task of phase.tasks) {
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
