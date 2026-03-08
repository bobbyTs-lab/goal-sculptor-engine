import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CompoundExercise, EXERCISE_LABELS, SplitDay } from '@/types/workout';
import { useGoals } from '@/hooks/useGoals';
import { loadWeeklyPlan, saveWeeklyPlan, generateId } from '@/lib/storage';
import { calculateGoalProgress, getDaysRemaining, getUrgencyColor } from '@/types/goals';
import { Calendar, Dumbbell, Target, Plus, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { EmberCard, FlickerIn, EmberStagger } from '@/components/EmberAnimations';
import { Link } from 'react-router-dom';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
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

interface DayPlan {
  day: string;
  splitDay: SplitDay;
  exercises: CompoundExercise[];
}

export default function ProgramPage() {
  const { goals } = useGoals();
  const [plan, setPlan] = useState<DayPlan[]>(() => {
    const saved = loadWeeklyPlan();
    if (saved) return saved.days;
    return DAYS.map(day => ({ day, splitDay: 'rest' as SplitDay, exercises: [] }));
  });

  const savePlan = (updated: DayPlan[]) => {
    setPlan(updated);
    saveWeeklyPlan({ id: generateId(), name: 'My Program', days: updated });
    toast.success('Program saved!');
  };

  const updateDay = (idx: number, field: Partial<DayPlan>) => {
    const updated = [...plan];
    updated[idx] = { ...updated[idx], ...field };
    // Auto-suggest exercises when split changes
    if (field.splitDay && field.splitDay !== 'rest') {
      updated[idx].exercises = SPLIT_EXERCISE_SUGGESTIONS[field.splitDay] || [];
    }
    if (field.splitDay === 'rest') {
      updated[idx].exercises = [];
    }
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

  // Split balance warnings
  const warnings = useMemo(() => {
    const msgs: string[] = [];
    const pushDays = plan.filter(d => ['push', 'upper'].includes(d.splitDay)).length;
    const pullDays = plan.filter(d => ['pull', 'upper'].includes(d.splitDay)).length;
    const legDays = plan.filter(d => ['legs', 'lower'].includes(d.splitDay)).length;
    const restDays = plan.filter(d => d.splitDay === 'rest').length;

    if (pushDays > 0 && pullDays === 0) msgs.push('⚠ No pull days — add back/bicep work');
    if (pullDays > 0 && pushDays === 0) msgs.push('⚠ No push days — add chest/shoulder work');
    if (legDays === 0 && plan.some(d => d.splitDay !== 'rest')) msgs.push('⚠ No leg days — don\'t skip legs!');
    if (restDays === 0) msgs.push('⚠ No rest days — recovery is growth');
    if (restDays >= 5) msgs.push('⚠ 5+ rest days — consider adding more training');
    return msgs;
  }, [plan]);

  // Today's workout
  const todayIdx = (new Date().getDay() + 6) % 7; // Mon=0
  const todayPlan = plan[todayIdx];

  // Goal todos for the week
  const allTodos = useMemo(() => {
    const todos: { goalTitle: string; phaseTitle: string; taskTitle: string; todoTitle: string; done: boolean; deadline?: string }[] = [];
    goals.forEach(g => {
      g.phases.forEach(p => {
        p.tasks.forEach(t => {
          t.todos.forEach(td => {
            todos.push({
              goalTitle: g.title,
              phaseTitle: p.title,
              taskTitle: t.title,
              todoTitle: td.title,
              done: td.done,
              deadline: td.deadline,
            });
          });
        });
      });
    });
    return todos;
  }, [goals]);

  const pendingTodos = allTodos.filter(t => !t.done);
  const urgentTodos = pendingTodos.filter(t => {
    const days = getDaysRemaining(t.deadline);
    return days !== null && days <= 7;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <FlickerIn>
        <div>
          <h1 className="font-gothic text-4xl gradient-alien-text glow-green-text ember-particles relative">Program Builder</h1>
          <p className="text-muted-foreground mt-1 font-medieval">Plan your week · Balance your splits</p>
        </div>
      </FlickerIn>

      <div className="divider-alien" />

      <Tabs defaultValue="workout" className="space-y-4">
        <TabsList className="bg-muted/30 border-rough">
          <TabsTrigger value="workout" className="font-medieval data-[state=active]:text-primary data-[state=active]:glow-green-text">
            <Dumbbell className="h-3.5 w-3.5 mr-1.5" /> Workout Plan
          </TabsTrigger>
          <TabsTrigger value="goals" className="font-medieval data-[state=active]:text-secondary data-[state=active]:glow-gold-text">
            <Target className="h-3.5 w-3.5 mr-1.5" /> Weekly Goals
          </TabsTrigger>
        </TabsList>

        {/* WORKOUT PLAN TAB */}
        <TabsContent value="workout" className="space-y-4">
          {/* Today's workout card */}
          <EmberCard delay={0}>
            <Card className="border-rough border-animated relative overflow-hidden scanlines bg-card/80 glow-green">
              <CardHeader className="pb-2 relative z-10">
                <CardTitle className="text-lg font-gothic gradient-alien-text flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Today — {DAYS[todayIdx]}
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                {todayPlan.splitDay === 'rest' ? (
                  <p className="font-medieval text-muted-foreground italic">Rest day. Recovery is growth. 🧘</p>
                ) : (
                  <div className="space-y-2">
                    <Badge variant="outline" className="border-primary/30 font-medieval capitalize">{todayPlan.splitDay}</Badge>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {todayPlan.exercises.map(ex => (
                        <Badge key={ex} className="bg-primary/20 text-primary border-primary/30 font-medieval">
                          {EXERCISE_LABELS[ex]}
                        </Badge>
                      ))}
                    </div>
                    <Link to="/workouts">
                      <Button className="mt-3 gradient-alien text-primary-foreground font-bold font-gothic w-full">
                        ⚔ Start Today's Workout
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </EmberCard>

          {/* Balance warnings */}
          {warnings.length > 0 && (
            <EmberCard delay={0.1}>
              <Card className="border-rough border-destructive/30 bg-destructive/5">
                <CardContent className="pt-4 relative z-10">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      {warnings.map((w, i) => (
                        <p key={i} className="text-xs font-medieval text-destructive/80">{w}</p>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </EmberCard>
          )}

          {/* Weekly grid */}
          <EmberStagger className="grid grid-cols-1 gap-3">
            {plan.map((day, idx) => (
              <EmberCard key={day.day} delay={idx * 0.05}>
                <Card className={`border-rough relative overflow-hidden scanlines bg-card/80 ${idx === todayIdx ? 'ring-1 ring-primary/40' : ''}`}>
                  <CardContent className="pt-4 relative z-10">
                    <div className="flex items-start gap-4">
                      <div className="w-24 flex-shrink-0">
                        <p className="font-medieval font-bold text-sm">{day.day}</p>
                        {idx === todayIdx && (
                          <Badge variant="outline" className="text-[10px] border-primary/40 text-primary mt-1">TODAY</Badge>
                        )}
                      </div>

                      <div className="flex-1 space-y-2">
                        <Select value={day.splitDay} onValueChange={(v) => updateDay(idx, { splitDay: v as SplitDay })}>
                          <SelectTrigger className="w-32 h-8 border-rough text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SPLIT_OPTIONS.map(s => (
                              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {day.splitDay !== 'rest' && (
                          <div className="flex flex-wrap gap-1.5">
                            {day.exercises.map(ex => (
                              <Badge key={ex} variant="outline" className="border-primary/30 text-xs font-medieval group">
                                {EXERCISE_LABELS[ex]}
                                <button onClick={() => removeExercise(idx, ex)} className="ml-1 opacity-50 group-hover:opacity-100">
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                            <Select onValueChange={(v) => addExercise(idx, v as CompoundExercise)}>
                              <SelectTrigger className="w-8 h-6 border-rough p-0 flex items-center justify-center">
                                <Plus className="h-3 w-3" />
                              </SelectTrigger>
                              <SelectContent>
                                {ALL_EXERCISES.filter(e => !day.exercises.includes(e)).map(ex => (
                                  <SelectItem key={ex} value={ex}>{EXERCISE_LABELS[ex]}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </EmberCard>
            ))}
          </EmberStagger>

          <Button onClick={() => savePlan(plan)} className="w-full gradient-alien text-primary-foreground font-bold font-gothic text-lg py-5">
            ⚔ Save Program ⚔
          </Button>
        </TabsContent>

        {/* WEEKLY GOALS TAB */}
        <TabsContent value="goals" className="space-y-4">
          {/* Urgent todos */}
          {urgentTodos.length > 0 && (
            <EmberCard delay={0}>
              <Card className="border-rough border-destructive/30 bg-destructive/5">
                <CardHeader className="pb-2 relative z-10">
                  <CardTitle className="text-sm font-medieval flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" /> Urgent This Week
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative z-10 space-y-1.5">
                  {urgentTodos.slice(0, 10).map((t, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs font-medieval">
                      <span className="text-destructive">•</span>
                      <span className="truncate flex-1">{t.todoTitle}</span>
                      <span className={`text-[10px] ${getUrgencyColor(getDaysRemaining(t.deadline))}`}>
                        {getDaysRemaining(t.deadline)}d
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </EmberCard>
          )}

          {/* All pending todos grouped by goal */}
          {goals.length === 0 ? (
            <Card className="border-dashed border-2 border-secondary/30 bg-card/50">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Target className="h-16 w-16 text-secondary/40 mb-4" />
                <p className="text-muted-foreground font-medieval text-lg">No goals yet</p>
                <Link to="/goals">
                  <Button variant="outline" className="mt-3 border-rough font-medieval">Create a Goal →</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <EmberStagger className="space-y-3">
              {goals.map((goal, gIdx) => {
                const progress = calculateGoalProgress(goal);
                const goalTodos = goal.phases.flatMap(p =>
                  p.tasks.flatMap(t => t.todos.map(td => ({ ...td, taskTitle: t.title, phaseTitle: p.title })))
                );
                const pending = goalTodos.filter(t => !t.done);

                return (
                  <EmberCard key={goal.id} delay={gIdx * 0.05}>
                    <Card className="border-rough relative overflow-hidden scanlines bg-card/80">
                      <CardHeader className="pb-2 relative z-10">
                        <CardTitle className="text-sm font-medieval flex items-center gap-2">
                          <Target className="h-4 w-4 text-primary" />
                          {goal.title}
                          <Badge variant="outline" className="ml-auto border-primary/30 text-xs">{progress}%</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="relative z-10 space-y-1">
                        {pending.length === 0 ? (
                          <p className="text-xs text-muted-foreground font-medieval flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-primary" /> All to-dos complete!
                          </p>
                        ) : (
                          pending.slice(0, 8).map((td, i) => (
                            <div key={td.id} className="flex items-center gap-2 text-xs font-medieval">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary/50 flex-shrink-0" />
                              <span className="truncate flex-1">{td.title}</span>
                              <span className="text-[10px] text-muted-foreground">{td.phaseTitle}</span>
                            </div>
                          ))
                        )}
                        {pending.length > 8 && (
                          <p className="text-[10px] text-muted-foreground font-medieval">+{pending.length - 8} more</p>
                        )}
                      </CardContent>
                    </Card>
                  </EmberCard>
                );
              })}
            </EmberStagger>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
