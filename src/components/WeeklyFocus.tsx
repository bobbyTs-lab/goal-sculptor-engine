import { useState, useEffect } from 'react';
import { Goal, calculateGoalProgress } from '@/types/goals';
import { loadWeeklyFocus, saveWeeklyFocus } from '@/lib/storage';
import { ProgressRing } from '@/components/ProgressRing';
import { Star } from 'lucide-react';

interface Props {
  goals: Goal[];
}

export function WeeklyFocus({ goals }: Props) {
  const [focusIds, setFocusIds] = useState<string[]>(() => loadWeeklyFocus());

  useEffect(() => {
    // Clean out stale IDs
    const validIds = focusIds.filter(id => goals.some(g => g.id === id));
    if (validIds.length !== focusIds.length) {
      setFocusIds(validIds);
      saveWeeklyFocus(validIds);
    }
  }, [goals]);

  const toggleFocus = (goalId: string) => {
    let next: string[];
    if (focusIds.includes(goalId)) {
      next = focusIds.filter(id => id !== goalId);
    } else if (focusIds.length < 3) {
      next = [...focusIds, goalId];
    } else {
      return; // max 3
    }
    setFocusIds(next);
    saveWeeklyFocus(next);
  };

  const focusGoals = goals.filter(g => focusIds.includes(g.id));

  if (focusGoals.length === 0) return null;

  return (
    <div className="rounded-xl bg-gradient-to-r from-violet/5 to-primary/5 border border-violet/20 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Star className="h-4 w-4 text-violet fill-violet" />
        <p className="text-xs text-violet uppercase tracking-widest font-semibold">Weekly Focus</p>
      </div>
      <div className="space-y-2">
        {focusGoals.map(goal => {
          const progress = calculateGoalProgress(goal);
          return (
            <div key={goal.id} className="flex items-center gap-3">
              <ProgressRing value={progress} size={32} strokeWidth={3} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{goal.title}</p>
                <div className="w-full bg-border rounded-full h-1.5 mt-1">
                  <div
                    className="bg-violet h-1.5 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              <span className="text-xs font-semibold text-violet">{progress}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function FocusStar({ goalId, goals }: { goalId: string; goals: Goal[] }) {
  const [focusIds, setFocusIds] = useState<string[]>(() => loadWeeklyFocus());
  const isFocused = focusIds.includes(goalId);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    let next: string[];
    if (isFocused) {
      next = focusIds.filter(id => id !== goalId);
    } else if (focusIds.length < 3) {
      next = [...focusIds, goalId];
    } else {
      return;
    }
    setFocusIds(next);
    saveWeeklyFocus(next);
  };

  return (
    <button onClick={toggle} className="p-0.5 hover:scale-110 transition-transform" title={isFocused ? 'Remove from weekly focus' : focusIds.length >= 3 ? 'Max 3 focus goals' : 'Add to weekly focus'}>
      <Star className={`h-4 w-4 ${isFocused ? 'text-violet fill-violet' : 'text-muted-foreground/40 hover:text-violet/60'}`} />
    </button>
  );
}
