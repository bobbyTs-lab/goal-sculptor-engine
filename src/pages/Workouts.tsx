import { useState } from 'react';
import { useWorkouts } from '@/hooks/useWorkouts';
import { CompoundExercise, EXERCISE_LABELS, SetLog, ExerciseLog, SplitDay } from '@/types/workout';
import { getProgressionSuggestion, getExerciseHistory, getPersonalRecords, getWeeklyVolume, calculateVolumeLoad } from '@/lib/progressive-overload';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Dumbbell, TrendingUp, Trophy, Timer, Plus, Trash2, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { toast } from 'sonner';

function RestTimer() {
  const [seconds, setSeconds] = useState(90);
  const [running, setRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(90);

  const start = () => {
    setTimeLeft(seconds);
    setRunning(true);
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setRunning(false);
          toast.success('Rest complete! Time to lift! 💪');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Timer className="h-4 w-4 text-primary" /> Rest Timer
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <Input
            type="number"
            value={seconds}
            onChange={e => setSeconds(Number(e.target.value))}
            className="w-20"
            min={10}
            max={300}
            disabled={running}
          />
          <span className="text-sm text-muted-foreground">sec</span>
          <Button size="sm" onClick={start} disabled={running} className="gradient-alien text-primary-foreground">
            {running ? `${timeLeft}s` : 'Start'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function WorkoutsPage() {
  const { sessions, configs, addSession, updateConfig } = useWorkouts();
  const prs = getPersonalRecords(sessions);
  const weeklyVolume = getWeeklyVolume(sessions);

  // New session state
  const [splitDay, setSplitDay] = useState<SplitDay>('push');
  const [sessionExercises, setSessionExercises] = useState<{
    exercise: CompoundExercise;
    sets: SetLog[];
  }[]>([]);

  const addExerciseToSession = (exercise: CompoundExercise) => {
    const config = configs.find(c => c.exercise === exercise);
    if (!config) return;
    const defaultSets: SetLog[] = Array.from({ length: config.targetSets }, () => ({
      reps: config.repRangeMin,
      weight: config.currentWeight,
      rpe: 3,
    }));
    setSessionExercises([...sessionExercises, { exercise, sets: defaultSets }]);
  };

  const updateSet = (exIdx: number, setIdx: number, field: keyof SetLog, value: number) => {
    const updated = [...sessionExercises];
    updated[exIdx].sets[setIdx] = { ...updated[exIdx].sets[setIdx], [field]: value };
    setSessionExercises(updated);
  };

  const removeExercise = (idx: number) => {
    setSessionExercises(sessionExercises.filter((_, i) => i !== idx));
  };

  const logSession = () => {
    if (sessionExercises.length === 0) {
      toast.error('Add at least one exercise!');
      return;
    }
    const exercises: ExerciseLog[] = sessionExercises.map(e => ({
      exercise: e.exercise,
      sets: e.sets,
      date: new Date().toISOString(),
    }));
    addSession({ date: new Date().toISOString(), splitDay, exercises });
    setSessionExercises([]);
    toast.success('Session logged! 🔥');
  };

  const [selectedExercise, setSelectedExercise] = useState<CompoundExercise>('squat');
  const history = getExerciseHistory(sessions, selectedExercise);
  const chartData = history.slice().reverse().map(h => ({
    date: new Date(h.date).toLocaleDateString(),
    weight: Math.max(...h.sets.map(s => s.weight)),
    volume: calculateVolumeLoad(h.sets),
  }));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="font-medieval text-3xl gradient-alien-text">Workout Engine</h1>
        <p className="text-muted-foreground mt-1">Progressive overload, compound-first</p>
      </div>

      <Tabs defaultValue="session" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="session">Log Session</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="prs">PRs</TabsTrigger>
          <TabsTrigger value="config">Config</TabsTrigger>
        </TabsList>

        {/* LOG SESSION TAB */}
        <TabsContent value="session" className="space-y-4">
          <div className="flex gap-4 flex-wrap items-end">
            <div>
              <label className="text-sm text-muted-foreground">Split Day</label>
              <Select value={splitDay} onValueChange={(v) => setSplitDay(v as SplitDay)}>
                <SelectTrigger className="w-32 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['push', 'pull', 'legs', 'upper', 'lower'].map(s => (
                    <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Add Exercise</label>
              <Select onValueChange={(v) => addExerciseToSession(v as CompoundExercise)}>
                <SelectTrigger className="w-48 mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {Object.entries(EXERCISE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <RestTimer />
          </div>

          {sessionExercises.map((ex, exIdx) => {
            const config = configs.find(c => c.exercise === ex.exercise);
            const recentHistory = getExerciseHistory(sessions, ex.exercise);
            const suggestion = config ? getProgressionSuggestion(config, recentHistory) : null;

            return (
              <Card key={exIdx} className="border-border">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Dumbbell className="h-4 w-4 text-primary" />
                      {EXERCISE_LABELS[ex.exercise]}
                    </CardTitle>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeExercise(exIdx)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {suggestion && (
                    <div className={`text-xs p-2 rounded mt-2 ${
                      suggestion.type === 'increase_weight' ? 'bg-secondary/10 text-secondary' :
                      suggestion.type === 'deload' ? 'bg-destructive/10 text-destructive' :
                      'bg-primary/10 text-primary'
                    }`}>
                      {suggestion.type === 'increase_weight' && <ArrowUp className="h-3 w-3 inline mr-1" />}
                      {suggestion.type === 'deload' && <ArrowDown className="h-3 w-3 inline mr-1" />}
                      {suggestion.type === 'hold' && <Minus className="h-3 w-3 inline mr-1" />}
                      {suggestion.message}
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground font-medium">
                      <span>Set</span><span>Weight (lbs)</span><span>Reps</span><span>RPE (1-5)</span>
                    </div>
                    {ex.sets.map((set, setIdx) => (
                      <div key={setIdx} className="grid grid-cols-4 gap-2">
                        <span className="text-sm flex items-center">{setIdx + 1}</span>
                        <Input type="number" value={set.weight} onChange={e => updateSet(exIdx, setIdx, 'weight', Number(e.target.value))} className="h-8" />
                        <Input type="number" value={set.reps} onChange={e => updateSet(exIdx, setIdx, 'reps', Number(e.target.value))} className="h-8" />
                        <Input type="number" value={set.rpe} onChange={e => updateSet(exIdx, setIdx, 'rpe', Math.min(5, Math.max(1, Number(e.target.value))))} className="h-8" min={1} max={5} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {sessionExercises.length > 0 && (
            <Button onClick={logSession} className="w-full gradient-alien text-primary-foreground font-semibold text-lg py-6 glow-green">
              Log Session 🔥
            </Button>
          )}

          {sessionExercises.length === 0 && (
            <Card className="border-dashed border-2 border-primary/30">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Dumbbell className="h-12 w-12 text-primary/50 mb-4" />
                <p className="text-muted-foreground">Select exercises above to start your session</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* PROGRESS TAB */}
        <TabsContent value="progress" className="space-y-4">
          <div className="flex gap-4 items-end">
            <div>
              <label className="text-sm text-muted-foreground">Exercise</label>
              <Select value={selectedExercise} onValueChange={(v) => setSelectedExercise(v as CompoundExercise)}>
                <SelectTrigger className="w-48 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(EXERCISE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Weight Progression
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(150 10% 18%)" />
                    <XAxis dataKey="date" stroke="hsl(80 10% 55%)" fontSize={12} />
                    <YAxis stroke="hsl(80 10% 55%)" fontSize={12} />
                    <Tooltip contentStyle={{ background: 'hsl(150 12% 9%)', border: '1px solid hsl(150 10% 18%)', borderRadius: '8px' }} />
                    <Line type="monotone" dataKey="weight" stroke="hsl(145 70% 42%)" strokeWidth={2} dot={{ fill: 'hsl(145 70% 42%)' }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-8">No data yet. Log your first session!</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-secondary" /> Weekly Volume Load
              </CardTitle>
            </CardHeader>
            <CardContent>
              {weeklyVolume.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={weeklyVolume}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(150 10% 18%)" />
                    <XAxis dataKey="week" stroke="hsl(80 10% 55%)" fontSize={12} />
                    <YAxis stroke="hsl(80 10% 55%)" fontSize={12} />
                    <Tooltip contentStyle={{ background: 'hsl(150 12% 9%)', border: '1px solid hsl(150 10% 18%)', borderRadius: '8px' }} />
                    <Bar dataKey="volume" fill="hsl(45 80% 50%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-8">No data yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PRs TAB */}
        <TabsContent value="prs" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {prs.length > 0 ? prs.map(pr => (
              <Card key={pr.exercise} className="border-border glow-gold">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Trophy className="h-6 w-6 text-secondary" />
                    <div>
                      <p className="font-semibold">{EXERCISE_LABELS[pr.exercise]}</p>
                      <p className="text-2xl font-bold text-secondary">{pr.weight} lbs × {pr.reps}</p>
                      <p className="text-xs text-muted-foreground">Volume: {pr.volumeLoad} lbs · {new Date(pr.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )) : (
              <Card className="border-dashed border-2 border-secondary/30 col-span-2">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Trophy className="h-12 w-12 text-secondary/50 mb-4" />
                  <p className="text-muted-foreground">No PRs yet. Start lifting!</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* CONFIG TAB */}
        <TabsContent value="config" className="space-y-4">
          {configs.map(config => (
            <Card key={config.exercise} className="border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">{EXERCISE_LABELS[config.exercise]}</h3>
                  <Badge variant="outline">{config.targetSets} × {config.repRangeMin}-{config.repRangeMax}</Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Current Weight</label>
                    <Input type="number" value={config.currentWeight} onChange={e => updateConfig(config.exercise, { currentWeight: Number(e.target.value) })} className="h-8 mt-1" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Increment</label>
                    <Input type="number" value={config.weightIncrement} onChange={e => updateConfig(config.exercise, { weightIncrement: Number(e.target.value) })} className="h-8 mt-1" step={2.5} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Rep Min</label>
                    <Input type="number" value={config.repRangeMin} onChange={e => updateConfig(config.exercise, { repRangeMin: Number(e.target.value) })} className="h-8 mt-1" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Rep Max</label>
                    <Input type="number" value={config.repRangeMax} onChange={e => updateConfig(config.exercise, { repRangeMax: Number(e.target.value) })} className="h-8 mt-1" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
