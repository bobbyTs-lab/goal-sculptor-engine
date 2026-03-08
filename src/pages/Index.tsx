import { useGoals } from '@/hooks/useGoals';
import { useWorkouts } from '@/hooks/useWorkouts';
import { calculateGoalProgress } from '@/types/goals';
import { getPersonalRecords, getWeeklyVolume } from '@/lib/progressive-overload';
import { EXERCISE_LABELS } from '@/types/workout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target, Dumbbell, Trophy, TrendingUp, Skull } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Index() {
  const { goals } = useGoals();
  const { sessions } = useWorkouts();
  const prs = getPersonalRecords(sessions);
  const weeklyVolume = getWeeklyVolume(sessions);
  const latestVolume = weeklyVolume[weeklyVolume.length - 1]?.volume || 0;

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      {/* Hero */}
      <div className="text-center py-12 relative">
        <div className="divider-alien mb-8" />
        <h1 className="font-gothic text-6xl md:text-7xl gradient-alien-text animate-flicker mb-4 tracking-wide">
          GoalForge
        </h1>
        <p className="font-medieval text-xl text-muted-foreground glow-green-text">
          ⚔ Forge your goals. Build your strength. ⚔
        </p>
        <div className="divider-alien mt-8" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-rough relative overflow-hidden scanlines bg-card/80">
          <CardContent className="pt-6 text-center relative z-10">
            <Target className="h-7 w-7 mx-auto text-primary mb-2 drop-shadow-[0_0_8px_hsl(130,100%,40%,0.6)]" />
            <p className="text-3xl font-bold font-medieval glow-green-text">{goals.length}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Active Goals</p>
          </CardContent>
        </Card>
        <Card className="border-rough relative overflow-hidden scanlines bg-card/80">
          <CardContent className="pt-6 text-center relative z-10">
            <Dumbbell className="h-7 w-7 mx-auto text-primary mb-2 drop-shadow-[0_0_8px_hsl(130,100%,40%,0.6)]" />
            <p className="text-3xl font-bold font-medieval glow-green-text">{sessions.length}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Sessions</p>
          </CardContent>
        </Card>
        <Card className="border-rough relative overflow-hidden scanlines bg-card/80">
          <CardContent className="pt-6 text-center relative z-10">
            <Trophy className="h-7 w-7 mx-auto text-secondary mb-2 drop-shadow-[0_0_8px_hsl(42,100%,50%,0.6)]" />
            <p className="text-3xl font-bold font-medieval glow-gold-text">{prs.length}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Records</p>
          </CardContent>
        </Card>
        <Card className="border-rough relative overflow-hidden scanlines bg-card/80">
          <CardContent className="pt-6 text-center relative z-10">
            <TrendingUp className="h-7 w-7 mx-auto text-secondary mb-2 drop-shadow-[0_0_8px_hsl(42,100%,50%,0.6)]" />
            <p className="text-3xl font-bold font-medieval glow-gold-text">{latestVolume.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Weekly Vol</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link to="/goals">
          <Card className="border-rough border-animated relative overflow-hidden scanlines bg-card/80 hover:glow-green transition-all duration-500 cursor-pointer group">
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
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-primary font-bold">{calculateGoalProgress(g)}%</span>
                        <Progress value={calculateGoalProgress(g)} className="w-16 h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground font-medieval italic">Create your first goal →</p>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link to="/workouts">
          <Card className="border-rough border-animated relative overflow-hidden scanlines bg-card/80 hover:glow-gold transition-all duration-500 cursor-pointer group">
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
      </div>

      <div className="divider-alien" />
    </div>
  );
}
