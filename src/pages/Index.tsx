import { useGoals } from '@/hooks/useGoals';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useHabits } from '@/hooks/useHabits';
import { getPersonalRecords, getWeeklyVolume } from '@/lib/progressive-overload';
import { EXERCISE_LABELS } from '@/types/workout';
import { calculateGoalProgress } from '@/types/goals';
import { checkAchievements } from '@/lib/achievements';
import { getTodaysHabits } from '@/lib/habits';
import { Target, Dumbbell, Trophy, TrendingUp, Settings, Moon, Flame, CheckCircle2, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BodyDiagram } from '@/components/BodyDiagram';
import { loadSettings, loadAchievements, loadWeeklyPlan } from '@/lib/storage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ProgressRing } from '@/components/ProgressRing';
import { HabitHeatmap } from '@/components/HabitHeatmap';
import { useMemo } from 'react';
import { motion } from 'framer-motion';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Index() {
  const { goals } = useGoals();
  const { sessions } = useWorkouts();
  const { logs: habitLogs, toggleCheckIn } = useHabits();
  const prs = getPersonalRecords(sessions);
  const weeklyVolume = getWeeklyVolume(sessions);
  const latestVolume = weeklyVolume[weeklyVolume.length - 1]?.volume || 0;
  const unlockedAchievements = loadAchievements();
  const { all: achievements } = checkAchievements(sessions, unlockedAchievements);
  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const todaysHabits = useMemo(() => getTodaysHabits(goals, habitLogs), [goals, habitLogs]);
  const habitsCompleted = todaysHabits.filter(h => h.completed).length;

  const todayPlan = useMemo(() => {
    const plan = loadWeeklyPlan();
    if (!plan) return null;
    const todayIdx = (new Date().getDay() + 6) % 7;
    return plan.days[todayIdx];
  }, []);

  const stats = [
    { icon: Target, value: goals.length, label: 'Goals' },
    { icon: Dumbbell, value: sessions.length, label: 'Sessions' },
    { icon: Trophy, value: `${unlockedCount}/${achievements.length}`, label: 'Badges' },
    { icon: TrendingUp, value: latestVolume.toLocaleString(), label: 'Volume' },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 pb-8 space-y-6 relative overflow-hidden">
      {/* Decorative circles */}
      <div className="section-circle circle-coral w-96 h-96 -top-24 -right-24" />
      <div className="section-circle circle-coral w-48 h-48 bottom-40 -left-20 opacity-[0.06]" />
      <div className="circle-ring w-32 h-32 top-20 left-4 text-coral" style={{ color: 'hsl(12 80% 65%)' }} />
      <div className="circle-ring w-16 h-16 top-60 right-10" style={{ color: 'hsl(12 80% 65%)' }} />
      <div className="circle-ring-filled w-6 h-6 bottom-60 right-8" style={{ color: 'hsl(12 80% 65%)' }} />

      {/* Greeting Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between pt-2 relative z-10"
      >
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">{getGreeting()}</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mt-0.5">TELOS</p>
        </div>
        <Link to="/settings">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <Settings className="h-5 w-5" />
          </Button>
        </Link>
      </motion.div>

      {/* Today's Workout Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        {todayPlan && todayPlan.splitDay !== 'rest' ? (
          <div className="rounded-xl bg-card border border-border p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Today — {DAYS[(new Date().getDay() + 6) % 7]}
                </p>
                <p className="text-lg font-semibold text-foreground capitalize mt-0.5">{todayPlan.splitDay} Day</p>
              </div>
              <Link to="/workouts">
                <Button size="sm" className="bg-primary text-primary-foreground font-semibold">
                  Start
                </Button>
              </Link>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {todayPlan.exercises.map((ex: string) => (
                <Badge key={ex} variant="secondary" className="text-xs font-medium">
                  {EXERCISE_LABELS[ex as keyof typeof EXERCISE_LABELS] || ex}
                </Badge>
              ))}
            </div>
          </div>
        ) : todayPlan?.splitDay === 'rest' ? (
          <div className="rounded-xl bg-card border border-border p-4 flex items-center gap-3 shadow-sm">
            <Moon className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">Rest Day</p>
              <p className="text-xs text-muted-foreground">Recovery is part of the process</p>
            </div>
          </div>
        ) : (
          <Link to="/program">
            <div className="rounded-xl border border-dashed border-border p-4 text-center hover:border-primary/50 transition-colors">
              <p className="text-sm text-muted-foreground">No program set up</p>
              <p className="text-xs text-primary mt-1 font-medium">Set up your program →</p>
            </div>
          </Link>
        )}
      </motion.div>

      {/* Stats Strip */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-2"
      >
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex-1 flex flex-col items-center gap-1 rounded-xl bg-card border border-border py-3 px-2 shadow-sm"
          >
            <stat.icon className="h-4 w-4 text-primary" />
            <span className="text-lg font-bold text-foreground leading-none">{stat.value}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</span>
          </div>
        ))}
      </motion.div>

      {/* Today's Habits */}
      {todaysHabits.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="rounded-xl bg-card border border-border p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Today's Habits</p>
                <p className="text-sm font-medium text-foreground mt-0.5">
                  {habitsCompleted}/{todaysHabits.length} completed
                </p>
              </div>
              {habitsCompleted === todaysHabits.length && todaysHabits.length > 0 && (
                <CheckCircle2 className="h-5 w-5 text-teal" />
              )}
            </div>
            <div className="space-y-2">
              {todaysHabits.map(({ habit, goalTitle, completed, streak }) => (
                <div key={habit.id} className="flex items-center gap-2.5">
                  <Checkbox
                    checked={completed}
                    onCheckedChange={() => toggleCheckIn(habit.id)}
                    className="border-amber data-[state=checked]:bg-amber data-[state=checked]:border-amber"
                  />
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm ${completed ? 'text-muted-foreground line-through' : ''}`}>
                      {habit.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-1.5">{goalTitle}</span>
                  </div>
                  {streak > 0 && (
                    <span className="text-[10px] font-medium text-amber flex items-center gap-0.5 flex-shrink-0">
                      <Flame className="h-3 w-3" />{streak}d
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Habit Heatmap */}
      {todaysHabits.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
          <HabitHeatmap goals={goals} logs={habitLogs} />
        </motion.div>
      )}

      {/* Goal Progress Cards */}
      {goals.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Goals</p>
            <Link to="/goals" className="text-xs text-primary font-medium flex items-center gap-0.5 hover:underline">
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {goals.filter(g => !g.archived).slice(0, 4).map(goal => {
              const progress = calculateGoalProgress(goal);
              return (
                <Link key={goal.id} to="/goals">
                  <div className="rounded-xl bg-card border border-border p-3 shadow-sm flex items-center gap-3 hover:bg-accent/30 transition-colors">
                    <ProgressRing value={progress} size={36} strokeWidth={3} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{goal.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {goal.phases.length} phase{goal.phases.length !== 1 ? 's' : ''} — {progress}%
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Body Diagram */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <BodyDiagram prs={prs} />
      </motion.div>
    </div>
  );
}
