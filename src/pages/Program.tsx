import { useState, useMemo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CompoundExercise, EXERCISE_LABELS, SplitDay } from '@/types/workout';
import { useGoals } from '@/hooks/useGoals';
import { useHabits } from '@/hooks/useHabits';
import { getTodaysHabits } from '@/lib/habits';
import { getDaysRemaining } from '@/types/goals';
import {
  loadWeeklyPlan, saveWeeklyPlan, generateId,
  loadTimeBlocks, loadContacts, Contact,
} from '@/lib/storage';
import {
  Calendar, Dumbbell, X, Settings2, ChevronLeft, ChevronRight, Repeat, Flame, CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import DailyTimeBlocks from '@/components/DailyTimeBlocks';
import RepeatableBlockManager from '@/components/RepeatableBlockManager';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getMonday(d: Date): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

function toDateKey(d: Date): string {
  return d.toISOString().split('T')[0];
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getWeekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}
const SPLIT_OPTIONS: SplitDay[] = ['push', 'pull', 'legs', 'upper', 'lower', 'rest'];
const ALL_EXERCISES: CompoundExercise[] = ['squat', 'deadlift', 'bench_press', 'overhead_press', 'barbell_row', 'pull_up'];

const SPLIT_EXERCISE_SUGGESTIONS: Record<SplitDay, CompoundExercise[]> = {
  push: ['bench_press', 'overhead_press'],
  pull: ['barbell_row', 'pull_up', 'deadlift'],
  legs: ['squat', 'deadlift'],
  upper: ['bench_press', 'overhead_press', 'barbell_row', 'pull_up'],
  lower: ['squat', 'deadlift'],
  rest: [],
};

const SPLIT_COLORS: Record<SplitDay, string> = {
  push: 'bg-primary/10 text-primary border-primary/20',
  pull: 'bg-teal/10 text-teal border-teal/20',
  legs: 'bg-coral/10 text-coral border-coral/20',
  upper: 'bg-primary/10 text-primary border-primary/20',
  lower: 'bg-teal/10 text-teal border-teal/20',
  rest: 'bg-muted text-muted-foreground border-muted',
};

interface DayPlan {
  day: string;
  splitDay: SplitDay;
  exercises: CompoundExercise[];
}

interface FlatTodo {
  todoId: string;
  todoTitle: string;
  done: boolean;
  deadline?: string;
  effort?: string;
  goalId: string;
  goalTitle: string;
  phaseId: string;
  phaseTitle: string;
  taskId: string;
  taskTitle: string;
}

export default function ProgramPage() {
  const { goals, toggleToDo } = useGoals();
  const { logs: habitLogs, toggleCheckIn } = useHabits();
  const [plan, setPlan] = useState<DayPlan[]>(() => {
    const saved = loadWeeklyPlan();
    if (saved) return saved.days;
    return DAYS.map(day => ({ day, splitDay: 'rest' as SplitDay, exercises: [] }));
  });
  const [assignedTodoIds, setAssignedTodoIds] = useState<Set<string>>(() => {
    const ids = new Set<string>();
    loadTimeBlocks().forEach(b => { if (b.todoId) ids.add(b.todoId); });
    return ids;
  });
  const [contacts] = useState<Contact[]>(() => loadContacts());
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const [selectedDate, setSelectedDate] = useState(() => new Date(today));
  const [weekStart, setWeekStart] = useState(() => getMonday(today));
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const selectedDayIdx = (selectedDate.getDay() + 6) % 7; // 0=Mon
  const isToday = isSameDay(selectedDate, today);
  const selectedDateKey = toDateKey(selectedDate);
  const [showSettings, setShowSettings] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showHabits, setShowHabits] = useState<boolean | null>(null); // null = auto (<=5 expanded)

  const allTodos = useMemo<FlatTodo[]>(() => {
    const todos: FlatTodo[] = [];
    goals.forEach(g => {
      g.phases.forEach(p => {
        p.tasks.forEach(t => {
          t.todos.forEach(td => {
            todos.push({
              todoId: td.id, todoTitle: td.title, done: td.done, deadline: td.deadline, effort: td.effort,
              goalId: g.id, goalTitle: g.title,
              phaseId: p.id, phaseTitle: p.title,
              taskId: t.id, taskTitle: t.title,
            });
          });
        });
      });
    });
    return todos;
  }, [goals]);

  const todaysHabits = useMemo(() => getTodaysHabits(goals, habitLogs), [goals, habitLogs]);
  const habitsCompleted = todaysHabits.filter(h => h.completed).length;
  const habitsExpanded = showHabits === null ? todaysHabits.length <= 5 : showHabits;

  // Todos whose deadline matches the selected date, plus overdue ones when viewing today
  const deadlineTodosForDay = useMemo(() => {
    return allTodos
      .filter(t => {
        if (t.done || !t.deadline) return false;
        if (t.deadline === selectedDateKey) return true;
        // When viewing today, also show overdue todos
        if (isToday && t.deadline < selectedDateKey) return true;
        return false;
      })
      .sort((a, b) => (a.deadline || '').localeCompare(b.deadline || ''))
      .map(t => ({
        todoId: t.todoId, title: t.todoTitle, goalTitle: t.goalTitle,
        goalId: t.goalId, phaseTitle: t.phaseTitle, taskTitle: t.taskTitle,
        deadline: t.deadline, effort: t.effort,
      }));
  }, [allTodos, selectedDateKey, isToday]);

  // Goal IDs that have habits today (for filter)
  const habitGoalIds = useMemo(() => {
    const ids = new Set<string>();
    todaysHabits.forEach(h => ids.add(h.goalId));
    return Array.from(ids);
  }, [todaysHabits]);
  const [habitGoalFilter, setHabitGoalFilter] = useState<string>('all');
  const [longPressHabit, setLongPressHabit] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filteredHabits = useMemo(() => {
    if (habitGoalFilter === 'all') return todaysHabits;
    return todaysHabits.filter(h => h.goalId === habitGoalFilter);
  }, [todaysHabits, habitGoalFilter]);
  const filteredCompleted = filteredHabits.filter(h => h.completed).length;

  const pendingTodos = allTodos.filter(t => !t.done);
  const backlog = pendingTodos
    .filter(t => !assignedTodoIds.has(t.todoId))
    .sort((a, b) => {
      const daysA = getDaysRemaining(a.deadline);
      const daysB = getDaysRemaining(b.deadline);
      if (daysA !== null && daysB !== null) return daysA - daysB;
      if (daysA !== null) return -1;
      if (daysB !== null) return 1;
      return 0;
    });

  const handleToggleTodo = useCallback((todo: FlatTodo) => {
    toggleToDo(todo.goalId, todo.phaseId, todo.taskId, todo.todoId);
  }, [toggleToDo]);

  const handleTodoLinked = useCallback((todoId: string) => {
    setAssignedTodoIds(prev => new Set([...prev, todoId]));
  }, []);

  const handleTodoUnlinked = useCallback((todoId: string) => {
    setAssignedTodoIds(prev => { const next = new Set(prev); next.delete(todoId); return next; });
  }, []);

  const todoStates = useMemo(() => {
    const states: Record<string, boolean> = {};
    allTodos.forEach(t => { states[t.todoId] = t.done; });
    return states;
  }, [allTodos]);

  const savePlan = (updated: DayPlan[]) => {
    setPlan(updated);
    saveWeeklyPlan({ id: generateId(), name: 'My Program', days: updated });
    toast.success('Saved!');
  };

  const updateDay = (idx: number, field: Partial<DayPlan>) => {
    const updated = [...plan];
    updated[idx] = { ...updated[idx], ...field };
    if (field.splitDay && field.splitDay !== 'rest') {
      updated[idx].exercises = SPLIT_EXERCISE_SUGGESTIONS[field.splitDay] || [];
    }
    if (field.splitDay === 'rest') updated[idx].exercises = [];
    setPlan(updated);
    savePlan(updated);
  };

  const addExercise = (dayIdx: number, exercise: CompoundExercise) => {
    const updated = [...plan];
    if (!updated[dayIdx].exercises.includes(exercise)) {
      updated[dayIdx].exercises = [...updated[dayIdx].exercises, exercise];
      setPlan(updated);
    }
  };

  const removeExercise = (dayIdx: number, exercise: CompoundExercise) => {
    const updated = [...plan];
    updated[dayIdx].exercises = updated[dayIdx].exercises.filter(e => e !== exercise);
    setPlan(updated);
  };

  const goDay = (dir: -1 | 1) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + dir);
    setSelectedDate(next);
    // If we move out of the current week, shift the week
    const nextMonday = getMonday(next);
    if (nextMonday.getTime() !== weekStart.getTime()) {
      setWeekStart(nextMonday);
    }
  };

  const goWeek = (dir: -1 | 1) => {
    const nextWeekStart = new Date(weekStart);
    nextWeekStart.setDate(nextWeekStart.getDate() + dir * 7);
    setWeekStart(nextWeekStart);
    const nextSelected = new Date(selectedDate);
    nextSelected.setDate(nextSelected.getDate() + dir * 7);
    setSelectedDate(nextSelected);
  };

  const goToday = () => {
    setSelectedDate(new Date(today));
    setWeekStart(getMonday(today));
  };

  const currentPlan = plan[selectedDayIdx];

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)] md:h-[calc(100vh-4.5rem)] max-w-5xl mx-auto">
      {/* DAY SELECTOR */}
      <div className="flex-shrink-0 pb-3">
        {/* Mobile: big swipeable day header */}
        <div className="flex items-center justify-between mb-2 md:hidden">
          <button onClick={() => goDay(-1)} className="p-3 rounded-xl bg-card border border-border active:bg-accent">
            <ChevronLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <div className="text-center flex-1">
            <h1 className="text-2xl font-bold text-foreground leading-tight">{DAYS[selectedDayIdx]}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {MONTH_SHORT[selectedDate.getMonth()]} {selectedDate.getDate()}, {selectedDate.getFullYear()}
            </p>
            <div className="flex items-center justify-center gap-2 mt-1">
              {isToday && (
                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">TODAY</Badge>
              )}
              {!isToday && (
                <button onClick={goToday} className="text-[10px] text-primary underline">Go to today</button>
              )}
              {currentPlan.splitDay !== 'rest' && (
                <Badge variant="outline" className={`capitalize text-[10px] ${SPLIT_COLORS[currentPlan.splitDay]}`}>
                  <Dumbbell className="h-3 w-3 mr-1" />
                  {currentPlan.splitDay}
                </Badge>
              )}
            </div>
          </div>
          <button onClick={() => goDay(1)} className="p-3 rounded-xl bg-card border border-border active:bg-accent">
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Week navigation + Day pills */}
        <div className="flex items-center gap-1 mb-1">
          <button onClick={() => goWeek(-1)} className="p-1.5 rounded-lg bg-card border border-border active:bg-accent flex-shrink-0">
            <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <div className="grid grid-cols-7 gap-1 flex-1">
            {weekDays.map((date, idx) => {
              const isSelected = isSameDay(date, selectedDate);
              const isDayToday = isSameDay(date, today);
              const dayPlan = plan[idx];
              return (
                <button
                  key={toDateKey(date)}
                  onClick={() => setSelectedDate(new Date(date))}
                  className={`
                    rounded-xl py-1.5 md:py-2 text-center transition-all border
                    ${isSelected
                      ? 'bg-primary/10 border-primary/30 ring-1 ring-primary/20'
                      : isDayToday
                        ? 'bg-card border-primary/40'
                        : 'bg-card border-border active:bg-accent'}
                  `}
                >
                  <div className={`text-[10px] md:text-xs font-semibold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                    {DAY_SHORT[idx]}
                  </div>
                  <div className={`text-sm md:text-base font-bold ${isSelected ? 'text-primary' : isDayToday ? 'text-primary' : 'text-foreground'}`}>
                    {date.getDate()}
                  </div>
                  {isDayToday && <div className="w-1.5 h-1.5 rounded-full bg-primary mx-auto mt-0.5" />}
                  {dayPlan.splitDay !== 'rest' && (
                    <div className={`text-[8px] md:text-[9px] mt-0.5 capitalize ${isSelected ? 'text-primary/70' : 'text-muted-foreground'}`}>
                      {dayPlan.splitDay}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <button onClick={() => goWeek(1)} className="p-1.5 rounded-lg bg-card border border-border active:bg-accent flex-shrink-0">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>

        {/* Desktop day title */}
        <div className="hidden md:flex items-center gap-3 mt-3">
          <Calendar className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">{DAYS[selectedDayIdx]}</h1>
          <span className="text-sm text-muted-foreground">
            {MONTH_SHORT[selectedDate.getMonth()]} {selectedDate.getDate()}, {selectedDate.getFullYear()}
          </span>
          {isToday && (
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">TODAY</Badge>
          )}
          {!isToday && (
            <button onClick={goToday} className="text-xs text-primary hover:underline">Today</button>
          )}
          {currentPlan.splitDay !== 'rest' && (
            <Badge variant="outline" className={`capitalize text-xs ${SPLIT_COLORS[currentPlan.splitDay]}`}>
              <Dumbbell className="h-3 w-3 mr-1" />
              {currentPlan.splitDay} · {currentPlan.exercises.length} exercises
            </Badge>
          )}
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" size="sm" className="text-xs gap-1.5" onClick={() => setShowTemplates(!showTemplates)}>
              <Repeat className="h-3.5 w-3.5" /> Templates
            </Button>
            <Button variant="ghost" size="sm" className="text-xs gap-1.5" onClick={() => setShowSettings(!showSettings)}>
              <Settings2 className="h-3.5 w-3.5" /> Edit Split
            </Button>
          </div>
        </div>
      </div>

      {/* MOBILE ACTION BAR */}
      <div className="flex gap-2 mb-2 md:hidden">
        <Button
          variant={showTemplates ? "default" : "outline"}
          size="sm"
          className="flex-1 text-xs gap-1.5 h-9"
          onClick={() => { setShowTemplates(!showTemplates); setShowSettings(false); }}
        >
          <Repeat className="h-3.5 w-3.5" /> Templates
        </Button>
        <Button
          variant={showSettings ? "default" : "outline"}
          size="sm"
          className="flex-1 text-xs gap-1.5 h-9"
          onClick={() => { setShowSettings(!showSettings); setShowTemplates(false); }}
        >
          <Settings2 className="h-3.5 w-3.5" /> Edit Split
        </Button>
        {currentPlan.splitDay !== 'rest' && (
          <Link to="/workouts" className="flex-1">
            <Button size="sm" className="w-full font-semibold h-9 text-xs">
              Workout
            </Button>
          </Link>
        )}
      </div>

      {/* SETTINGS / TEMPLATES PANELS */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex-shrink-0 overflow-hidden mb-2"
          >
            <div className="border border-border rounded-xl p-3 bg-card shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <Select value={currentPlan.splitDay} onValueChange={(v) => updateDay(selectedDayIdx, { splitDay: v as SplitDay })}>
                  <SelectTrigger className="flex-1 h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SPLIT_OPTIONS.map(s => (
                      <SelectItem key={s} value={s} className="capitalize text-sm">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select onValueChange={(v) => addExercise(selectedDayIdx, v as CompoundExercise)}>
                  <SelectTrigger className="flex-1 h-10 text-sm">
                    <SelectValue placeholder="+ Exercise" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_EXERCISES.filter(e => !currentPlan.exercises.includes(e)).map(ex => (
                      <SelectItem key={ex} value={ex} className="text-sm">{EXERCISE_LABELS[ex]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {currentPlan.exercises.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {currentPlan.exercises.map(ex => (
                    <Badge key={ex} variant="outline" className="text-sm py-1 px-2.5 group">
                      {EXERCISE_LABELS[ex]}
                      <button onClick={() => removeExercise(selectedDayIdx, ex)} className="ml-1.5 opacity-50 group-hover:opacity-100">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTemplates && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex-shrink-0 overflow-hidden mb-2"
          >
            <div className="border border-border rounded-xl p-3 bg-card shadow-sm">
              <RepeatableBlockManager />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TODAY'S HABITS (from goals) */}
      {isToday && todaysHabits.length > 0 && (
        <div className="flex-shrink-0 mb-2">
          {habitsExpanded ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="border border-border rounded-xl px-2.5 py-2 bg-card shadow-sm">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Repeat className="h-3.5 w-3.5 text-amber" />
                    <span className="text-xs font-medium text-foreground">
                      Habits {habitsCompleted}/{todaysHabits.length}
                    </span>
                    {habitsCompleted === todaysHabits.length && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    )}
                  </div>
                  <button onClick={() => setShowHabits(false)} className="p-0.5 rounded hover:bg-accent/50 text-muted-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {/* Goal filter pills */}
                {habitGoalIds.length > 1 && (
                  <div className="flex gap-1 mb-1.5 overflow-x-auto no-scrollbar">
                    <button
                      onClick={() => setHabitGoalFilter('all')}
                      className={`text-[10px] px-2 py-0.5 rounded-full border whitespace-nowrap transition-colors ${
                        habitGoalFilter === 'all'
                          ? 'bg-amber/15 border-amber/40 text-amber font-medium'
                          : 'border-border text-muted-foreground hover:bg-accent/50'
                      }`}
                    >
                      All ({todaysHabits.length})
                    </button>
                    {habitGoalIds.map(gid => {
                      const goal = goals.find(g => g.id === gid);
                      const count = todaysHabits.filter(h => h.goalId === gid).length;
                      return (
                        <button
                          key={gid}
                          onClick={() => setHabitGoalFilter(gid)}
                          className={`text-[10px] px-2 py-0.5 rounded-full border whitespace-nowrap transition-colors truncate max-w-[140px] ${
                            habitGoalFilter === gid
                              ? 'bg-amber/15 border-amber/40 text-amber font-medium'
                              : 'border-border text-muted-foreground hover:bg-accent/50'
                          }`}
                        >
                          {goal?.title || 'Goal'} ({count})
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  {filteredHabits.map(({ habit, completed, streak, goalTitle }) => (
                    <div
                      key={habit.id}
                      className="flex items-center gap-1.5 min-w-0 select-none"
                      onPointerDown={() => {
                        longPressTimer.current = setTimeout(() => setLongPressHabit(habit.id), 400);
                      }}
                      onPointerUp={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
                      onPointerLeave={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
                    >
                      <Checkbox
                        checked={completed}
                        onCheckedChange={() => toggleCheckIn(habit.id)}
                        className="h-3.5 w-3.5 border-amber data-[state=checked]:bg-amber data-[state=checked]:border-amber flex-shrink-0"
                      />
                      <span className={`text-xs truncate ${completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                        {habit.title}
                      </span>
                      {streak > 0 && (
                        <span className="text-[9px] font-medium text-amber flex items-center gap-0.5 flex-shrink-0 ml-auto">
                          <Flame className="h-2.5 w-2.5" />{streak}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                {/* Long-press detail popover */}
                <AnimatePresence>
                  {longPressHabit && (() => {
                    const fh = todaysHabits.find(h => h.habit.id === longPressHabit);
                    if (!fh) return null;
                    return (
                      <motion.div
                        key="habit-detail"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        className="mt-2 border border-amber/30 rounded-lg bg-amber/5 px-3 py-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground">{fh.habit.title}</span>
                          <button onClick={() => setLongPressHabit(null)} className="text-muted-foreground">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
                          <p><span className="font-medium text-foreground">Frequency:</span> {fh.habit.frequency}</p>
                          {fh.habit.target && <p><span className="font-medium text-foreground">Target:</span> {fh.habit.target}</p>}
                          {fh.habit.evolution && <p><span className="font-medium text-foreground">Evolution:</span> {fh.habit.evolution}</p>}
                          <p><span className="font-medium text-foreground">Goal:</span> {fh.goalTitle} · {fh.taskTitle}</p>
                          {fh.streak > 0 && <p><span className="font-medium text-foreground">Streak:</span> {fh.streak} days</p>}
                        </div>
                      </motion.div>
                    );
                  })()}
                </AnimatePresence>
              </div>
            </motion.div>
          ) : (
            <button
              onClick={() => setShowHabits(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber/30 bg-amber/5 hover:bg-amber/10 transition-colors"
            >
              <Repeat className="h-3 w-3 text-amber" />
              <span className="text-xs font-medium text-amber">
                Habits {habitsCompleted}/{todaysHabits.length}
              </span>
              {habitsCompleted === todaysHabits.length && (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              )}
            </button>
          )}
        </div>
      )}

      {/* PLANNER */}
      <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <DailyTimeBlocks
          dayName={selectedDateKey}
          contacts={contacts}
          onToggleTodo={(todoId) => {
            const todo = allTodos.find(t => t.todoId === todoId);
            if (todo) handleToggleTodo(todo);
          }}
          backlogTodos={backlog.map(t => ({
            todoId: t.todoId, title: t.todoTitle, goalTitle: t.goalTitle,
            goalId: t.goalId, phaseTitle: t.phaseTitle, taskTitle: t.taskTitle,
            deadline: t.deadline, effort: t.effort,
          }))}
          deadlineTodos={deadlineTodosForDay}
          todoStates={todoStates}
          onTodoLinked={handleTodoLinked}
          onTodoUnlinked={handleTodoUnlinked}
        />
      </div>

      {/* Desktop workout button */}
      {currentPlan.splitDay !== 'rest' && (
        <div className="hidden md:block flex-shrink-0 pt-3">
          <Link to="/workouts">
            <Button className="w-full font-bold text-base py-4">
              Start {currentPlan.splitDay} Workout
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
