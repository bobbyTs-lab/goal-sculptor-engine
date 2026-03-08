import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CompoundExercise, EXERCISE_LABELS, SplitDay } from '@/types/workout';
import { useGoals } from '@/hooks/useGoals';
import { 
  loadWeeklyPlan, saveWeeklyPlan, generateId,
  loadWeeklySchedule, saveWeeklySchedule, WeeklySchedule,
  loadWeeklyFocus, saveWeeklyFocus,
} from '@/lib/storage';
import { calculateGoalProgress, getDaysRemaining, getUrgencyColor } from '@/types/goals';
import { 
  Calendar, Dumbbell, Target, Plus, X, AlertTriangle, CheckCircle2, 
  Star, ChevronDown, ChevronUp, Clock, Flame, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { EmberCard, FlickerIn, EmberStagger } from '@/components/EmberAnimations';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import DailyTimeBlocks from '@/components/DailyTimeBlocks';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
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
  push: 'bg-primary/20 text-primary border-primary/30',
  pull: 'bg-secondary/20 text-secondary border-secondary/30',
  legs: 'bg-accent/20 text-accent-foreground border-accent/30',
  upper: 'bg-primary/20 text-primary border-primary/30',
  lower: 'bg-secondary/20 text-secondary border-secondary/30',
  rest: 'bg-muted/30 text-muted-foreground border-muted/30',
};

const TIME_SLOTS = ['Morning', 'Afternoon', 'Evening'] as const;

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
  goalId: string;
  goalTitle: string;
  phaseId: string;
  phaseTitle: string;
  taskId: string;
  taskTitle: string;
}

export default function ProgramPage() {
  const { goals, toggleToDo } = useGoals();
  const [plan, setPlan] = useState<DayPlan[]>(() => {
    const saved = loadWeeklyPlan();
    if (saved) return saved.days;
    return DAYS.map(day => ({ day, splitDay: 'rest' as SplitDay, exercises: [] }));
  });
  const [schedule, setSchedule] = useState<WeeklySchedule>(() => loadWeeklySchedule());
  const [focusGoalIds, setFocusGoalIds] = useState<string[]>(() => loadWeeklyFocus());
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [editingWorkout, setEditingWorkout] = useState(false);

  const todayIdx = (new Date().getDay() + 6) % 7;

  // Flatten all todos
  const allTodos = useMemo<FlatTodo[]>(() => {
    const todos: FlatTodo[] = [];
    goals.forEach(g => {
      g.phases.forEach(p => {
        p.tasks.forEach(t => {
          t.todos.forEach(td => {
            todos.push({
              todoId: td.id, todoTitle: td.title, done: td.done, deadline: td.deadline,
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

  const pendingTodos = allTodos.filter(t => !t.done);

  // Assigned todo IDs (all days)
  const assignedIds = useMemo(() => {
    const ids = new Set<string>();
    Object.values(schedule).forEach(arr => arr.forEach(id => ids.add(id)));
    return ids;
  }, [schedule]);

  // Backlog = pending todos not assigned to any day
  const backlog = pendingTodos.filter(t => !assignedIds.has(t.todoId));

  // Stats
  const totalPlanned = Object.values(schedule).flat().length;
  const totalDone = allTodos.filter(t => t.done && assignedIds.has(t.todoId)).length;
  const overdueTodos = pendingTodos.filter(t => {
    const d = getDaysRemaining(t.deadline);
    return d !== null && d < 0;
  });

  // Save helpers
  const updateSchedule = useCallback((updated: WeeklySchedule) => {
    setSchedule(updated);
    saveWeeklySchedule(updated);
  }, []);

  const toggleFocus = useCallback((goalId: string) => {
    setFocusGoalIds(prev => {
      const next = prev.includes(goalId) ? prev.filter(id => id !== goalId) : [...prev, goalId].slice(0, 3);
      saveWeeklyFocus(next);
      return next;
    });
  }, []);

  const assignToDay = useCallback((dayName: string, todoId: string) => {
    const updated = { ...schedule };
    if (!updated[dayName]) updated[dayName] = [];
    if (!updated[dayName].includes(todoId)) {
      updated[dayName] = [...updated[dayName], todoId];
      updateSchedule(updated);
      toast.success(`Assigned to ${dayName}`);
    }
  }, [schedule, updateSchedule]);

  const unassignFromDay = useCallback((dayName: string, todoId: string) => {
    const updated = { ...schedule };
    updated[dayName] = (updated[dayName] || []).filter(id => id !== todoId);
    updateSchedule(updated);
  }, [schedule, updateSchedule]);

  const handleToggleTodo = useCallback((todo: FlatTodo) => {
    toggleToDo(todo.goalId, todo.phaseId, todo.taskId, todo.todoId);
  }, [toggleToDo]);

  const savePlan = (updated: DayPlan[]) => {
    setPlan(updated);
    saveWeeklyPlan({ id: generateId(), name: 'My Program', days: updated });
    setEditingWorkout(false);
    toast.success('Program saved!');
  };

  const updateDay = (idx: number, field: Partial<DayPlan>) => {
    const updated = [...plan];
    updated[idx] = { ...updated[idx], ...field };
    if (field.splitDay && field.splitDay !== 'rest') {
      updated[idx].exercises = SPLIT_EXERCISE_SUGGESTIONS[field.splitDay] || [];
    }
    if (field.splitDay === 'rest') updated[idx].exercises = [];
    setPlan(updated);
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

  // Warnings
  const warnings = useMemo(() => {
    const msgs: string[] = [];
    const pushDays = plan.filter(d => ['push', 'upper'].includes(d.splitDay)).length;
    const pullDays = plan.filter(d => ['pull', 'upper'].includes(d.splitDay)).length;
    const legDays = plan.filter(d => ['legs', 'lower'].includes(d.splitDay)).length;
    const restDays = plan.filter(d => d.splitDay === 'rest').length;
    if (pushDays > 0 && pullDays === 0) msgs.push('No pull days — add back/bicep work');
    if (pullDays > 0 && pushDays === 0) msgs.push('No push days — add chest/shoulder work');
    if (legDays === 0 && plan.some(d => d.splitDay !== 'rest')) msgs.push("No leg days — don't skip legs!");
    if (restDays === 0) msgs.push('No rest days — recovery is growth');
    if (restDays >= 5) msgs.push('5+ rest days — consider adding more training');
    return msgs;
  }, [plan]);

  // Get todos for a specific day
  const getTodosForDay = (dayName: string): FlatTodo[] => {
    const ids = schedule[dayName] || [];
    return ids.map(id => allTodos.find(t => t.todoId === id)).filter(Boolean) as FlatTodo[];
  };

  // Workload per day
  const getWorkload = (dayIdx: number) => {
    const exerciseCount = plan[dayIdx].exercises.length;
    const todoCount = (schedule[DAYS[dayIdx]] || []).length;
    return exerciseCount + todoCount;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <FlickerIn>
        <div>
          <h1 className="font-gothic text-4xl gradient-alien-text glow-green-text ember-particles relative">Program Builder</h1>
          <p className="text-muted-foreground mt-1 font-medieval">Plan your week · Balance your splits · Schedule your goals</p>
        </div>
      </FlickerIn>

      <div className="divider-alien" />

      {/* WEEKLY FOCUS PICKER */}
      <EmberCard delay={0}>
        <Card className="border-rough relative overflow-hidden scanlines bg-card/80">
          <CardContent className="pt-4 pb-3 relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Star className="h-4 w-4 text-secondary" />
              <span className="font-gothic text-sm gradient-alien-text">This Week's Focus</span>
              <span className="text-[10px] text-muted-foreground font-medieval ml-auto">pick up to 3</span>
            </div>
            {goals.length === 0 ? (
              <p className="text-xs text-muted-foreground font-medieval">
                <Link to="/goals" className="underline">Create a goal</Link> to get started
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {goals.map(g => {
                  const isFocused = focusGoalIds.includes(g.id);
                  const progress = calculateGoalProgress(g);
                  return (
                    <button
                      key={g.id}
                      onClick={() => toggleFocus(g.id)}
                      className={`
                        flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medieval transition-all border
                        ${isFocused 
                          ? 'bg-secondary/20 border-secondary/50 text-secondary glow-gold-text' 
                          : 'bg-muted/20 border-muted/30 text-muted-foreground hover:border-secondary/30'}
                      `}
                    >
                      <Star className={`h-3 w-3 ${isFocused ? 'fill-secondary' : ''}`} />
                      {g.title}
                      <span className="text-[10px] opacity-70">{progress}%</span>
                    </button>
                  );
                })}
              </div>
            )}
            {/* Stats bar */}
            <div className="flex gap-4 mt-3 text-[11px] font-medieval text-muted-foreground border-t border-border/30 pt-2">
              <span>{totalPlanned} planned</span>
              <span className="text-primary">{totalDone} done</span>
              {overdueTodos.length > 0 && (
                <span className="text-destructive">{overdueTodos.length} overdue</span>
              )}
              <span className="ml-auto">{backlog.length} unassigned</span>
            </div>
          </CardContent>
        </Card>
      </EmberCard>

      {/* WEEK AT A GLANCE — 7-column grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {plan.map((day, idx) => {
          const dayTodos = getTodosForDay(DAYS[idx]);
          const workload = getWorkload(idx);
          const isToday = idx === todayIdx;
          const isExpanded = expandedDay === idx;
          const doneTodos = dayTodos.filter(t => t.done).length;

          return (
            <button
              key={day.day}
              onClick={() => setExpandedDay(isExpanded ? null : idx)}
              className={`
                relative rounded-lg border p-2 text-center transition-all cursor-pointer
                ${isToday ? 'ring-2 ring-primary/50 border-primary/40' : 'border-border/30'}
                ${isExpanded ? 'bg-card/90' : 'bg-card/50 hover:bg-card/70'}
                ${day.splitDay === 'rest' ? 'opacity-60' : ''}
              `}
            >
              <div className="text-[10px] font-medieval text-muted-foreground">{DAY_SHORT[idx]}</div>
              {isToday && <div className="w-1.5 h-1.5 rounded-full bg-primary mx-auto my-0.5" />}
              <Badge variant="outline" className={`text-[9px] px-1 py-0 capitalize mt-0.5 ${SPLIT_COLORS[day.splitDay]}`}>
                {day.splitDay}
              </Badge>
              <div className="mt-1 space-y-0.5">
                {day.exercises.length > 0 && (
                  <div className="text-[9px] text-muted-foreground font-medieval">
                    <Dumbbell className="h-2.5 w-2.5 inline mr-0.5" />{day.exercises.length}
                  </div>
                )}
                {dayTodos.length > 0 && (
                  <div className="text-[9px] text-muted-foreground font-medieval">
                    <Target className="h-2.5 w-2.5 inline mr-0.5" />{doneTodos}/{dayTodos.length}
                  </div>
                )}
              </div>
              {/* Workload indicator */}
              {workload >= 5 && (
                <div className="absolute -top-1 -right-1">
                  <Flame className="h-3 w-3 text-secondary animate-pulse" />
                </div>
              )}
              {isExpanded && (
                <ChevronUp className="h-3 w-3 mx-auto mt-1 text-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* EXPANDED DAY PANEL — Time Block Planner */}
      <AnimatePresence mode="wait">
        {expandedDay !== null && (
          <motion.div
            key={expandedDay}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <Card className="border-rough relative overflow-hidden scanlines bg-card/80">
              <CardHeader className="pb-2 relative z-10">
                <CardTitle className="text-lg font-gothic gradient-alien-text flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  {DAYS[expandedDay]}
                  {expandedDay === todayIdx && (
                    <Badge variant="outline" className="text-[10px] border-primary/40 text-primary ml-2">TODAY</Badge>
                  )}
                  <div className="ml-auto flex items-center gap-2">
                    {plan[expandedDay].splitDay !== 'rest' && (
                      <Badge variant="outline" className={`capitalize text-[10px] ${SPLIT_COLORS[plan[expandedDay].splitDay]}`}>
                        <Dumbbell className="h-3 w-3 mr-1" />
                        {plan[expandedDay].splitDay} · {plan[expandedDay].exercises.length} exercises
                      </Badge>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs font-medieval"
                      onClick={() => setEditingWorkout(!editingWorkout)}
                    >
                      {editingWorkout ? 'Done' : 'Edit Split'}
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10 space-y-4">
                {/* Quick workout editor */}
                {editingWorkout && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border border-border/30 rounded-lg p-3 bg-muted/10 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <Select value={plan[expandedDay].splitDay} onValueChange={(v) => updateDay(expandedDay, { splitDay: v as SplitDay })}>
                        <SelectTrigger className="w-32 h-8 border-rough text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SPLIT_OPTIONS.map(s => (
                            <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select onValueChange={(v) => addExercise(expandedDay, v as CompoundExercise)}>
                        <SelectTrigger className="w-40 h-8 border-rough text-xs">
                          <SelectValue placeholder="+ Add exercise" />
                        </SelectTrigger>
                        <SelectContent>
                          {ALL_EXERCISES.filter(e => !plan[expandedDay].exercises.includes(e)).map(ex => (
                            <SelectItem key={ex} value={ex}>{EXERCISE_LABELS[ex]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {plan[expandedDay].exercises.map(ex => (
                        <Badge key={ex} variant="outline" className="border-primary/30 text-xs font-medieval group">
                          {EXERCISE_LABELS[ex]}
                          <button onClick={() => removeExercise(expandedDay, ex)} className="ml-1 opacity-50 group-hover:opacity-100">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Time Block Planner */}
                <DailyTimeBlocks
                  dayName={DAYS[expandedDay]}
                  onToggleTodo={(todoId) => {
                    const todo = allTodos.find(t => t.todoId === todoId);
                    if (todo) handleToggleTodo(todo);
                  }}
                />

                {/* Start workout button */}
                {plan[expandedDay].splitDay !== 'rest' && (
                  <Link to="/workouts">
                    <Button size="sm" className="gradient-alien text-primary-foreground font-bold font-gothic w-full">
                      ⚔ Start Workout
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BALANCE WARNINGS */}
      {warnings.length > 0 && (
        <Card className="border-rough border-destructive/30 bg-destructive/5">
          <CardContent className="pt-3 pb-3 relative z-10">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <div className="space-y-0.5">
                {warnings.map((w, i) => (
                  <p key={i} className="text-[11px] font-medieval text-destructive/80">⚠ {w}</p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SAVE PROGRAM BUTTON */}
      {editingWorkout && (
        <Button onClick={() => savePlan(plan)} className="w-full gradient-alien text-primary-foreground font-bold font-gothic text-lg py-5">
          ⚔ Save Program ⚔
        </Button>
      )}

      {/* UNASSIGNED BACKLOG */}
      <EmberCard delay={0.1}>
        <Card className="border-rough relative overflow-hidden scanlines bg-card/80">
          <CardHeader className="pb-2 relative z-10">
            <CardTitle className="text-sm font-gothic gradient-alien-text flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Unassigned Backlog
              <Badge variant="outline" className="ml-auto text-[10px] border-muted/30">{backlog.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            {backlog.length === 0 ? (
              <p className="text-xs text-muted-foreground font-medieval flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-primary" /> Everything is scheduled! 
              </p>
            ) : (
              <div className="space-y-3">
                {/* Group by goal, focus goals first */}
                {[...goals]
                  .sort((a, b) => {
                    const aFocus = focusGoalIds.includes(a.id) ? -1 : 0;
                    const bFocus = focusGoalIds.includes(b.id) ? -1 : 0;
                    return aFocus - bFocus;
                  })
                  .map(goal => {
                    const goalBacklog = backlog.filter(t => t.goalId === goal.id);
                    if (goalBacklog.length === 0) return null;
                    const isFocused = focusGoalIds.includes(goal.id);
                    const progress = calculateGoalProgress(goal);
                    return (
                      <div key={goal.id} className={`space-y-1.5 ${isFocused ? 'pl-2 border-l-2 border-secondary/40' : ''}`}>
                        <div className="flex items-center gap-2">
                          {isFocused && <Star className="h-3 w-3 text-secondary fill-secondary" />}
                          <span className="text-xs font-medieval font-bold">{goal.title}</span>
                          <Progress value={progress} className="w-16 h-1.5 ml-auto" />
                          <span className="text-[10px] text-muted-foreground">{progress}%</span>
                        </div>
                        {goalBacklog.map(todo => (
                          <BacklogItem
                            key={todo.todoId}
                            todo={todo}
                            onAssign={assignToDay}
                          />
                        ))}
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </EmberCard>
    </div>
  );
}

/* ─── Day Todo List ─── */
function DayTodoList({ dayName, todos, onToggle, onUnassign }: {
  dayName: string;
  todos: FlatTodo[];
  onToggle: (todo: FlatTodo) => void;
  onUnassign: (dayName: string, todoId: string) => void;
}) {
  if (todos.length === 0) {
    return (
      <p className="text-xs text-muted-foreground font-medieval italic">
        No to-dos assigned. Use the backlog below to add some.
      </p>
    );
  }

  // Group by goal
  const grouped = todos.reduce<Record<string, FlatTodo[]>>((acc, t) => {
    if (!acc[t.goalId]) acc[t.goalId] = [];
    acc[t.goalId].push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([goalId, items]) => (
        <div key={goalId} className="space-y-1">
          <div className="text-[10px] font-medieval text-muted-foreground uppercase tracking-wide">
            {items[0].goalTitle}
          </div>
          {items.map(todo => {
            const daysLeft = getDaysRemaining(todo.deadline);
            return (
              <div key={todo.todoId} className="flex items-center gap-2 group">
                <Checkbox 
                  checked={todo.done} 
                  onCheckedChange={() => onToggle(todo)}
                  className="h-3.5 w-3.5"
                />
                <span className={`text-xs font-medieval flex-1 truncate ${todo.done ? 'line-through text-muted-foreground' : ''}`}>
                  {todo.todoTitle}
                </span>
                {daysLeft !== null && (
                  <span className={`text-[9px] ${getUrgencyColor(daysLeft)}`}>
                    {daysLeft < 0 ? `${Math.abs(daysLeft)}d late` : daysLeft === 0 ? 'today' : `${daysLeft}d`}
                  </span>
                )}
                <span className="text-[9px] text-muted-foreground">{todo.phaseTitle}</span>
                <button
                  onClick={() => onUnassign(dayName, todo.todoId)}
                  className="opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ─── Backlog Item with Day Assign Popover ─── */
function BacklogItem({ todo, onAssign }: { todo: FlatTodo; onAssign: (day: string, todoId: string) => void }) {
  const daysLeft = getDaysRemaining(todo.deadline);
  return (
    <div className="flex items-center gap-2 text-xs font-medieval">
      <span className="w-1.5 h-1.5 rounded-full bg-primary/50 flex-shrink-0" />
      <span className="truncate flex-1">{todo.todoTitle}</span>
      {daysLeft !== null && (
        <span className={`text-[9px] ${getUrgencyColor(daysLeft)}`}>
          {daysLeft < 0 ? `${Math.abs(daysLeft)}d late` : `${daysLeft}d`}
        </span>
      )}
      <span className="text-[9px] text-muted-foreground">{todo.phaseTitle}</span>
      <Popover>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-0.5 text-[10px] text-primary hover:text-primary/80 transition-colors">
            <ArrowRight className="h-3 w-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="end">
          <div className="grid grid-cols-4 gap-1">
            {DAYS.map((d, i) => (
              <button
                key={d}
                onClick={() => onAssign(d, todo.todoId)}
                className="px-2 py-1 text-[10px] font-medieval rounded border border-border/30 hover:bg-primary/20 hover:border-primary/40 transition-colors"
              >
                {DAY_SHORT[i]}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
