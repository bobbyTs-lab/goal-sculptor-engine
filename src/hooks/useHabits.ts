import { useState, useCallback } from 'react';
import { HabitLog } from '@/types/goals';
import { loadHabitLogs, saveHabitLogs } from '@/lib/storage';
import { getTodayKey } from '@/lib/habits';

export function useHabits() {
  const [logs, setLogs] = useState<HabitLog[]>(() => loadHabitLogs());

  const persist = useCallback((updated: HabitLog[]) => {
    setLogs(updated);
    saveHabitLogs(updated);
  }, []);

  const checkIn = useCallback((habitId: string, value?: number) => {
    const date = getTodayKey();
    const existing = logs.findIndex(l => l.habitId === habitId && l.date === date);
    let updated: HabitLog[];
    if (existing >= 0) {
      updated = logs.map((l, i) => i === existing ? { ...l, completed: true, value } : l);
    } else {
      updated = [...logs, { habitId, date, completed: true, value }];
    }
    persist(updated);
  }, [logs, persist]);

  const undo = useCallback((habitId: string) => {
    const date = getTodayKey();
    const updated = logs.map(l =>
      l.habitId === habitId && l.date === date ? { ...l, completed: false } : l
    );
    persist(updated);
  }, [logs, persist]);

  const toggleCheckIn = useCallback((habitId: string) => {
    const date = getTodayKey();
    const existing = logs.find(l => l.habitId === habitId && l.date === date);
    if (existing?.completed) {
      undo(habitId);
    } else {
      checkIn(habitId);
    }
  }, [logs, checkIn, undo]);

  return { logs, checkIn, undo, toggleCheckIn };
}
