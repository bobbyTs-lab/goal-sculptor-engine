import { useGoals } from '@/hooks/useGoals';
import { useWorkouts } from '@/hooks/useWorkouts';
import { calculateGoalProgress } from '@/types/goals';
import { getPersonalRecords, getWeeklyVolume } from '@/lib/progressive-overload';
import { EXERCISE_LABELS } from '@/types/workout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target, Dumbbell, Trophy, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Index() {
  const { goals } = useGoals();
  const { sessions } = useWorkouts();
  const prs = getPersonalRecords(sessions);
  const weeklyVolume = getWeeklyVolume(sessions);
  const latestVolume = weeklyVolume[weeklyVolume.length - 1]?.volume || 0;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Hero */}
      <div className="text-center py-8">
        <h1 className="font-medieval text-5xl gradient-alien-text mb-3">GoalForge</h1>
        <p className="text-muted-foreground text-lg">Forge your goals. Build your strength.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="pt-6 text-center">
            <Target className="h-6 w-6 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">{goals.length}</p>
            <p className="text-xs text-muted-foreground">Active Goals</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-6 text-center">
            <Dumbbell className="h-6 w-6 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">{sessions.length}</p>
            <p className="text-xs text-muted-foreground">Sessions Logged</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-6 text-center">
            <Trophy className="h-6 w-6 mx-auto text-secondary mb-2" />
            <p className="text-2xl font-bold">{prs.length}</p>
            <p className="text-xs text-muted-foreground">Personal Records</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-6 text-center">
            <TrendingUp className="h-6 w-6 mx-auto text-secondary mb-2" />
            <p className="text-2xl font-bold">{latestVolume.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Weekly Volume (lbs)</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to="/goals">
          <Card className="border-border hover:border-primary/50 transition-colors cursor-pointer group">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 group-hover:text-primary transition-colors">
                <Target className="h-5 w-5" /> Goals
              </CardTitle>
            </CardHeader>
            <CardContent>
              {goals.length > 0 ? (
                <div className="space-y-2">
                  {goals.slice(0, 3).map(g => (
                    <div key={g.id} className="flex items-center justify-between">
                      <span className="text-sm truncate">{g.title}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-primary">{calculateGoalProgress(g)}%</span>
                        <Progress value={calculateGoalProgress(g)} className="w-16 h-1.5" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Create your first goal →</p>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link to="/workouts">
          <Card className="border-border hover:border-secondary/50 transition-colors cursor-pointer group">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 group-hover:text-secondary transition-colors">
                <Dumbbell className="h-5 w-5" /> Workouts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {prs.length > 0 ? (
                <div className="space-y-2">
                  {prs.slice(0, 3).map(pr => (
                    <div key={pr.exercise} className="flex items-center justify-between">
                      <span className="text-sm">{EXERCISE_LABELS[pr.exercise]}</span>
                      <span className="text-sm font-medium text-secondary">{pr.weight} lbs</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Start your first session →</p>
              )}
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
