import { useGoals } from '@/hooks/useGoals';
import { useWorkouts } from '@/hooks/useWorkouts';
import { calculateGoalProgress } from '@/types/goals';
import { getPersonalRecords, getWeeklyVolume } from '@/lib/progressive-overload';
import { EXERCISE_LABELS } from '@/types/workout';
import { checkAchievements } from '@/lib/achievements';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, Dumbbell, Trophy, TrendingUp, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmberCard, EmberStagger, EmberText, FlickerIn } from '@/components/EmberAnimations';
import { ProgressRing } from '@/components/ProgressRing';
import { BodyDiagram } from '@/components/BodyDiagram';
import { MotivationalQuotes } from '@/components/MotivationalQuotes';
import { AchievementSystem } from '@/components/AchievementSystem';
import { StrengthRadar } from '@/components/StrengthRadar';
import { loadSettings, loadAchievements, loadWeeklyPlan } from '@/lib/storage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useMemo } from 'react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function Index() {
  const { goals } = useGoals();
  const { sessions } = useWorkouts();
  const prs = getPersonalRecords(sessions);
  const weeklyVolume = getWeeklyVolume(sessions);
  const latestVolume = weeklyVolume[weeklyVolume.length - 1]?.volume || 0;
  const settings = loadSettings();
  const unlockedAchievements = loadAchievements();

  const { all: achievements } = checkAchievements(sessions, unlockedAchievements);
  const unlockedCount = achievements.filter(a => a.unlocked).length;

  // Today's workout from plan
  const todayPlan = useMemo(() => {
    const plan = loadWeeklyPlan();
    if (!plan) return null;
    const todayIdx = (new Date().getDay() + 6) % 7;
    return plan.days[todayIdx];
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      {/* Hero */}
      <div className="text-center py-12 relative">
        <EmberText delay={0}>
          <div className="divider-alien mb-8" />
        </EmberText>
        <FlickerIn>
          <h1 className="font-gothic text-6xl md:text-7xl gradient-alien-text mb-4 tracking-wide relative ember-particles">
            GoalForge
          </h1>
        </FlickerIn>
        <EmberText delay={0.4}>
          <p className="font-medieval text-xl text-muted-foreground glow-green-text">
            ⚔ Forge your goals. Build your strength. ⚔
          </p>
        </EmberText>
        <EmberText delay={0.6}>
          <div className="divider-alien mt-8" />
        </EmberText>
      </div>

      {/* Motivational Quote */}
      <EmberCard delay={0.1}>
        <MotivationalQuotes
          enabled={settings.quotesEnabled}
          customQuotes={settings.customQuotes.length > 0 ? settings.customQuotes : undefined}
        />
      </EmberCard>

      {/* Today's Workout Widget */}
      {todayPlan && todayPlan.splitDay !== 'rest' && (
        <EmberCard delay={0.15}>
          <Card className="border-rough border-animated relative overflow-hidden scanlines bg-card/80">
            <CardHeader className="pb-2 relative z-10">
              <CardTitle className="text-sm font-medieval flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary drop-shadow-[0_0_6px_hsl(130,100%,40%,0.5)]" />
                Today's Workout — {DAYS[(new Date().getDay() + 6) % 7]}
              </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="outline" className="border-primary/30 font-medieval capitalize">{todayPlan.splitDay}</Badge>
                {todayPlan.exercises.map((ex: string) => (
                  <Badge key={ex} className="bg-primary/20 text-primary border-primary/30 font-medieval text-xs">
                    {EXERCISE_LABELS[ex as keyof typeof EXERCISE_LABELS] || ex}
                  </Badge>
                ))}
                <Link to="/workouts" className="ml-auto">
                  <Button size="sm" className="gradient-alien text-primary-foreground font-bold font-medieval">
                    ⚔ Start
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </EmberCard>
      )}

      {/* Stats row */}
      <EmberStagger className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Target, value: goals.length, label: 'Active Goals', color: 'primary', glow: 'glow-green-text' },
          { icon: Dumbbell, value: sessions.length, label: 'Sessions', color: 'primary', glow: 'glow-green-text' },
          { icon: Trophy, value: `${unlockedCount}/${achievements.length}`, label: 'Badges', color: 'secondary', glow: 'glow-gold-text' },
          { icon: TrendingUp, value: latestVolume.toLocaleString(), label: 'Weekly Vol', color: 'secondary', glow: 'glow-gold-text' },
        ].map((stat, i) => (
          <EmberCard key={stat.label} delay={i * 0.1}>
            <Card className="border-rough relative overflow-hidden scanlines bg-card/80 crt-hover">
              <CardContent className="pt-6 text-center relative z-10">
                <stat.icon className={`h-7 w-7 mx-auto text-${stat.color} mb-2 drop-shadow-[0_0_8px_hsl(130,100%,40%,0.6)]`} />
                <p className={`text-3xl font-bold font-medieval ${stat.glow}`}>{stat.value}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          </EmberCard>
        ))}
      </EmberStagger>

      {/* Body Diagram + Strength Radar side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EmberCard delay={0.3}>
          <BodyDiagram prs={prs} />
        </EmberCard>
        <EmberCard delay={0.35}>
          <StrengthRadar prs={prs} bodyweight={settings.bodyweight} />
        </EmberCard>
      </div>

      {/* Achievement System */}
      <EmberCard delay={0.4}>
        <AchievementSystem achievements={achievements} />
      </EmberCard>

      {/* Quick links */}
      <EmberStagger className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <EmberCard delay={0}>
          <Link to="/goals">
            <Card className="border-rough border-animated relative overflow-hidden scanlines bg-card/80 hover:glow-green transition-all duration-500 cursor-pointer group crt-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 font-gothic text-2xl group-hover:glow-green-text transition-all">
                  <Target className="h-6 w-6 text-primary drop-shadow-[0_0_8px_hsl(130,100%,40%,0.6)]" /> Goals
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                {goals.length > 0 ? (
                  <div className="space-y-3">
                    {goals.slice(0, 3).map(g => (
                      <div key={g.id} className="flex items-center justify-between">
                        <span className="text-sm truncate font-medieval">{g.title}</span>
                        <ProgressRing value={calculateGoalProgress(g)} size={36} strokeWidth={3} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground font-medieval italic">Create your first goal →</p>
                )}
              </CardContent>
            </Card>
          </Link>
        </EmberCard>

        <EmberCard delay={0.15}>
          <Link to="/workouts">
            <Card className="border-rough border-animated relative overflow-hidden scanlines bg-card/80 hover:glow-gold transition-all duration-500 cursor-pointer group crt-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 font-gothic text-2xl group-hover:glow-gold-text transition-all">
                  <Dumbbell className="h-6 w-6 text-secondary drop-shadow-[0_0_8px_hsl(42,100%,50%,0.6)]" /> Workouts
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                {prs.length > 0 ? (
                  <div className="space-y-3">
                    {prs.slice(0, 3).map(pr => (
                      <div key={pr.exercise} className="flex items-center justify-between">
                        <span className="text-sm font-medieval">{EXERCISE_LABELS[pr.exercise]}</span>
                        <span className="text-sm font-bold text-secondary glow-gold-text">{pr.weight} lbs</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground font-medieval italic">Start your first session →</p>
                )}
              </CardContent>
            </Card>
          </Link>
        </EmberCard>
      </EmberStagger>

      <EmberText delay={0.5}>
        <div className="divider-alien" />
      </EmberText>
    </div>
  );
}
