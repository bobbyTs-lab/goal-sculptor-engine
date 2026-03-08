import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CompoundExercise, EXERCISE_LABELS, SplitDay } from '@/types/workout';
import { useGoals } from '@/hooks/useGoals';
import { 
  loadWeeklyPlan, saveWeeklyPlan, generateId,
  loadWeeklySchedule, saveWeeklySchedule, WeeklySchedule,
} from '@/lib/storage';
import { 
  Calendar, Dumbbell, X, Settings2, ChevronLeft, ChevronRight, Repeat
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import DailyTimeBlocks from '@/components/DailyTimeBlocks';
import RepeatableBlockManager from '@/components/RepeatableBlockManager';

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
  const todayIdx = (new Date().getDay() + 6) % 7;
  const [selectedDay, setSelectedDay] = useState(todayIdx);
  const [showSettings, setShowSettings] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  // Flatten all todos for linking
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
  const assignedIds = useMemo(() => {
    const ids = new Set<string>();
    Object.values(schedule).forEach(arr => arr.forEach(id => ids.add(id)));
    return ids;
  }, [schedule]);
  const backlog = pendingTodos.filter(t => !assignedIds.has(t.todoId));

  const handleToggleTodo = useCallback((todo: FlatTodo) => {
    toggleToDo(todo.goalId, todo.phaseId, todo.taskId, todo.todoId);
  }, [toggleToDo]);

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
    setSelectedDay(prev => (prev + dir + 7) % 7);
  };

  const currentPlan = plan[selectedDay];

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] md:h-[calc(100vh-4.5rem)] max-w-5xl mx-auto">
      
      {/* ─── DAY SELECTOR ─── */}
      <div className="flex-shrink-0 pb-3">
        {/* Mobile: big swipeable day header */}
        <div className="flex items-center justify-between mb-2 md:hidden">
          <button onClick={() => goDay(-1)} className="p-3 rounded-xl bg-card/60 border border-border/30 active:bg-muted/50">
            <ChevronLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <div className="text-center flex-1">
            <h1 className="font-gothic text-2xl gradient-alien-text leading-tight">{DAYS[selectedDay]}</h1>
            <div className="flex items-center justify-center gap-2 mt-1">
              {selectedDay === todayIdx && (
                <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">TODAY</Badge>
              )}
              {currentPlan.splitDay !== 'rest' && (
                <Badge variant="outline" className={`capitalize text-[10px] ${SPLIT_COLORS[currentPlan.splitDay]}`}>
                  <Dumbbell className="h-3 w-3 mr-1" />
                  {currentPlan.splitDay}
                </Badge>
              )}
            </div>
          </div>
          <button onClick={() => goDay(1)} className="p-3 rounded-xl bg-card/60 border border-border/30 active:bg-muted/50">
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Day pills — always visible, scrollable on mobile */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
          {DAYS.map((day, idx) => {
            const isSelected = selectedDay === idx;
            const isToday = idx === todayIdx;
            const dayPlan = plan[idx];
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(idx)}
                className={`
                  flex-shrink-0 snap-center rounded-xl px-3 py-2.5 md:px-4 md:py-2 min-w-[3.5rem] text-center transition-all border
                  ${isSelected 
                    ? 'bg-primary/15 border-primary/50 ring-1 ring-primary/30' 
                    : 'bg-card/50 border-border/30 active:bg-card/80'}
                `}
              >
                <div className={`text-xs md:text-sm font-medieval font-bold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                  {DAY_SHORT[idx]}
                </div>
                {isToday && <div className="w-1.5 h-1.5 rounded-full bg-primary mx-auto mt-1" />}
                {dayPlan.splitDay !== 'rest' && (
                  <div className={`text-[9px] mt-0.5 capitalize font-medieval ${isSelected ? 'text-primary/70' : 'text-muted-foreground'}`}>
                    {dayPlan.splitDay}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Desktop day title */}
        <div className="hidden md:flex items-center gap-3 mt-3">
          <Calendar className="h-5 w-5 text-primary" />
          <h1 className="font-gothic text-2xl gradient-alien-text">{DAYS[selectedDay]}</h1>
          {selectedDay === todayIdx && (
            <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">TODAY</Badge>
          )}
          {currentPlan.splitDay !== 'rest' && (
            <Badge variant="outline" className={`capitalize text-xs ${SPLIT_COLORS[currentPlan.splitDay]}`}>
              <Dumbbell className="h-3 w-3 mr-1" />
              {currentPlan.splitDay} · {currentPlan.exercises.length} exercises
            </Badge>
          )}
          <div className="ml-auto flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs font-medieval gap-1.5"
              onClick={() => setShowTemplates(!showTemplates)}
            >
              <Repeat className="h-3.5 w-3.5" />
              Templates
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs font-medieval gap-1.5"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings2 className="h-3.5 w-3.5" />
              Edit Split
            </Button>
          </div>
        </div>
      </div>

      {/* ─── MOBILE ACTION BAR ─── */}
      <div className="flex gap-2 mb-2 md:hidden">
        <Button
          variant={showTemplates ? "default" : "outline"}
          size="sm"
          className="flex-1 text-xs font-medieval gap-1.5 h-9"
          onClick={() => { setShowTemplates(!showTemplates); setShowSettings(false); }}
        >
          <Repeat className="h-3.5 w-3.5" />
          Templates
        </Button>
        <Button
          variant={showSettings ? "default" : "outline"}
          size="sm"
          className="flex-1 text-xs font-medieval gap-1.5 h-9"
          onClick={() => { setShowSettings(!showSettings); setShowTemplates(false); }}
        >
          <Settings2 className="h-3.5 w-3.5" />
          Edit Split
        </Button>
        {currentPlan.splitDay !== 'rest' && (
          <Link to="/workouts" className="flex-1">
            <Button size="sm" className="w-full gradient-alien text-primary-foreground font-bold font-medieval h-9 text-xs">
              ⚔ Workout
            </Button>
          </Link>
        )}
      </div>

      {/* ─── SETTINGS / TEMPLATES PANELS ─── */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex-shrink-0 overflow-hidden mb-2"
          >
            <div className="border border-border/30 rounded-xl p-3 bg-card/60 space-y-3">
              <div className="flex items-center gap-2">
                <Select value={currentPlan.splitDay} onValueChange={(v) => updateDay(selectedDay, { splitDay: v as SplitDay })}>
                  <SelectTrigger className="flex-1 h-10 border-rough text-sm font-medieval">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SPLIT_OPTIONS.map(s => (
                      <SelectItem key={s} value={s} className="capitalize text-sm">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select onValueChange={(v) => addExercise(selectedDay, v as CompoundExercise)}>
                  <SelectTrigger className="flex-1 h-10 border-rough text-sm font-medieval">
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
                    <Badge key={ex} variant="outline" className="border-primary/30 text-sm font-medieval py-1 px-2.5 group">
                      {EXERCISE_LABELS[ex]}
                      <button onClick={() => removeExercise(selectedDay, ex)} className="ml-1.5 opacity-50 group-hover:opacity-100">
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
            <div className="border border-border/30 rounded-xl p-3 bg-card/60">
              <RepeatableBlockManager />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── PLANNER — fills remaining space ─── */}
      <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-border/30 bg-card/40">
        <DailyTimeBlocks
          dayName={DAYS[selectedDay]}
          onToggleTodo={(todoId) => {
            const todo = allTodos.find(t => t.todoId === todoId);
            if (todo) handleToggleTodo(todo);
          }}
          backlogTodos={backlog.map(t => ({
            todoId: t.todoId, title: t.todoTitle, goalTitle: t.goalTitle,
            goalId: t.goalId, phaseTitle: t.phaseTitle, taskTitle: t.taskTitle,
          }))}
        />
      </div>

      {/* Desktop workout button */}
      {currentPlan.splitDay !== 'rest' && (
        <div className="hidden md:block flex-shrink-0 pt-3">
          <Link to="/workouts">
            <Button className="w-full gradient-alien text-primary-foreground font-bold font-gothic text-base py-4">
              ⚔ Start {currentPlan.splitDay} Workout
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}