import { useState } from 'react';
import { useWorkouts } from '@/hooks/useWorkouts';
import { CompoundExercise, EXERCISE_LABELS, SetLog, ExerciseLog, SplitDay, CustomExercise, getExerciseLabel, isBuiltInExercise, EquipmentType, MuscleGroup, ALL_MUSCLE_GROUPS } from '@/types/workout';
import { getProgressionSuggestion, getExerciseHistory, getPersonalRecords, getWeeklyVolume, calculateVolumeLoad } from '@/lib/progressive-overload';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Dumbbell, TrendingUp, Trophy, Timer, Plus, Trash2, ArrowUp, ArrowDown, Minus, ChevronDown, ChevronRight, History, Save, FileText, Sparkles, Copy, X } from 'lucide-react';
import { toast } from 'sonner';
import { loadTemplates, saveTemplates, generateId, WorkoutTemplate, loadCustomExercises, saveCustomExercises, loadSettings } from '@/lib/storage';

const EQUIPMENT_LABELS: Record<EquipmentType, string> = {
  barbell: 'Barbell', dumbbell: 'Dumbbell', cable: 'Cable',
  machine: 'Machine', bodyweight: 'Bodyweight', other: 'Other',
};

function RestTimer({ onRunningChange }: { onRunningChange: (running: boolean) => void }) {
  const [seconds, setSeconds] = useState(90);
  const [running, setRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(90);

  const start = () => {
    setTimeLeft(seconds);
    setRunning(true);
    onRunningChange(true);
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setRunning(false);
          onRunningChange(false);
          toast.success('Rest complete! Time to lift! 💪');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Timer className="h-4 w-4 text-primary" /> Rest Timer
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <Input type="number" value={seconds} onChange={e => setSeconds(Number(e.target.value))} className="w-20" min={10} max={300} disabled={running} />
          <span className="text-sm text-muted-foreground">sec</span>
          <Button size="sm" onClick={start} disabled={running}>
            {running ? `${timeLeft}s` : 'Start'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function WorkoutsPage() {
  const [customExercises, setCustomExercises] = useState<CustomExercise[]>(() => loadCustomExercises());
  const { sessions, configs, addSession, deleteSession, updateConfig, addConfig, deleteConfig } = useWorkouts(customExercises);
  const prs = getPersonalRecords(sessions);
  const weeklyVolume = getWeeklyVolume(sessions);

  const label = (id: string) => getExerciseLabel(id, customExercises);

  // Combined exercise options: built-in + custom
  const allExerciseOptions: { id: string; label: string }[] = [
    ...Object.entries(EXERCISE_LABELS).map(([id, name]) => ({ id, label: name })),
    ...customExercises.map(e => ({ id: e.id, label: e.name })),
  ];

  // Custom exercise management
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [showAIConfig, setShowAIConfig] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [newExEquipment, setNewExEquipment] = useState<EquipmentType>('barbell');
  const [newExMuscles, setNewExMuscles] = useState<MuscleGroup[]>([]);
  const [newExWeight, setNewExWeight] = useState(45);
  const [newExSets, setNewExSets] = useState(3);
  const [newExRepMin, setNewExRepMin] = useState(8);
  const [newExRepMax, setNewExRepMax] = useState(12);
  const [newExIncrement, setNewExIncrement] = useState(5);

  const handleAddCustomExercise = () => {
    if (!newExName.trim()) return;
    const id = `custom_${newExName.trim().toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
    const exercise: CustomExercise = {
      id, name: newExName.trim(), equipment: newExEquipment,
      muscleGroups: newExMuscles,
    };
    const updated = [...customExercises, exercise];
    setCustomExercises(updated);
    saveCustomExercises(updated);
    addConfig({
      exercise: id, targetSets: newExSets,
      repRangeMin: newExRepMin, repRangeMax: newExRepMax,
      currentWeight: newExWeight, weightIncrement: newExIncrement,
    });
    setShowAddCustom(false);
    setNewExName(''); setNewExMuscles([]); setNewExWeight(45);
    setNewExSets(3); setNewExRepMin(8); setNewExRepMax(12); setNewExIncrement(5);
    toast.success(`Added "${exercise.name}"`);
  };

  const handleDeleteCustomExercise = (id: string) => {
    const updated = customExercises.filter(e => e.id !== id);
    setCustomExercises(updated);
    saveCustomExercises(updated);
    deleteConfig(id);
    toast.success('Exercise removed');
  };

  const toggleMuscle = (m: MuscleGroup) => {
    setNewExMuscles(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  };

  // AI config generator
  const [aiConfigResponse, setAiConfigResponse] = useState('');

  const generateAIConfigPrompt = () => {
    const settings = loadSettings();
    const name = newExName.trim() || '[EXERCISE NAME]';
    const equipment = EQUIPMENT_LABELS[newExEquipment];
    const muscles = newExMuscles.length > 0 ? newExMuscles.join(', ') : '(not specified)';
    return `You are an expert strength and conditioning coach.

I need an optimal progressive overload configuration for a new exercise.

EXERCISE: ${name}
EQUIPMENT: ${equipment}
MUSCLE GROUPS: ${muscles}
MY BODYWEIGHT: ${settings.bodyweight} lbs

Based on this exercise and my bodyweight, provide the ideal training configuration.

Consider:
- Appropriate starting weight for an intermediate lifter at ${settings.bodyweight} lbs
- Optimal rep range for hypertrophy and strength progression
- Correct set count for this movement type
- Appropriate weight increment that avoids stalling (smaller for isolation/upper body, larger for compound/lower body)

OUTPUT FORMAT — Use this EXACT format, one value per line:
SETS: [number]
REP_MIN: [number]
REP_MAX: [number]
WEIGHT: [number in lbs]
INCREMENT: [number in lbs]
EQUIPMENT: [barbell|dumbbell|cable|machine|bodyweight|other]
MUSCLES: [comma-separated from: chest,back,shoulders,biceps,triceps,quads,hamstrings,glutes,calves,core,forearms,traps]

RULES:
- Output ONLY the config lines, no explanations
- Weight should be per-hand for dumbbells
- Increment should be realistic (1.25-2.5 for isolation, 5-10 for compounds)
- Rep range should be 6-12 for hypertrophy, 3-6 for strength, 12-20 for endurance`;
  };

  const copyAIConfigPrompt = () => {
    navigator.clipboard.writeText(generateAIConfigPrompt());
    toast.success('AI prompt copied to clipboard!');
  };

  const parseAIConfigResponse = () => {
    const lines = aiConfigResponse.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      const setsMatch = trimmed.match(/^SETS:\s*(\d+)/i);
      if (setsMatch) setNewExSets(parseInt(setsMatch[1]));
      const repMinMatch = trimmed.match(/^REP_MIN:\s*(\d+)/i);
      if (repMinMatch) setNewExRepMin(parseInt(repMinMatch[1]));
      const repMaxMatch = trimmed.match(/^REP_MAX:\s*(\d+)/i);
      if (repMaxMatch) setNewExRepMax(parseInt(repMaxMatch[1]));
      const weightMatch = trimmed.match(/^WEIGHT:\s*([\d.]+)/i);
      if (weightMatch) setNewExWeight(parseFloat(weightMatch[1]));
      const incMatch = trimmed.match(/^INCREMENT:\s*([\d.]+)/i);
      if (incMatch) setNewExIncrement(parseFloat(incMatch[1]));
      const eqMatch = trimmed.match(/^EQUIPMENT:\s*(\w+)/i);
      if (eqMatch && ['barbell','dumbbell','cable','machine','bodyweight','other'].includes(eqMatch[1].toLowerCase())) {
        setNewExEquipment(eqMatch[1].toLowerCase() as EquipmentType);
      }
      const muscleMatch = trimmed.match(/^MUSCLES:\s*(.+)/i);
      if (muscleMatch) {
        const parsed = muscleMatch[1].split(',').map(m => m.trim().toLowerCase()).filter(m =>
          ALL_MUSCLE_GROUPS.includes(m as MuscleGroup)
        ) as MuscleGroup[];
        if (parsed.length > 0) setNewExMuscles(parsed);
      }
    }
    toast.success('Config imported from AI response!');
    setAiConfigResponse('');
  };

  const [splitDay, setSplitDay] = useState<SplitDay>('push');
  const [sessionExercises, setSessionExercises] = useState<{
    exercise: string;
    sets: SetLog[];
  }[]>([]);
  const [sessionNotes, setSessionNotes] = useState('');
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [templates, setTemplates] = useState<WorkoutTemplate[]>(() => loadTemplates());

  const toggleSession = (id: string) => {
    const next = new Set(expandedSessions);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpandedSessions(next);
  };

  const addExerciseToSession = (exercise: string) => {
    const config = configs.find(c => c.exercise === exercise);
    if (!config) return;

    // Pre-populate from last session if available, otherwise use config defaults
    const lastSession = getExerciseHistory(sessions, exercise)[0];
    let sets: SetLog[];
    if (lastSession && lastSession.sets.length > 0) {
      sets = lastSession.sets.map(s => ({
        reps: s.reps,
        weight: Math.max(s.weight, config.currentWeight), // use config weight if bumped
        rpe: s.rpe,
      }));
    } else {
      sets = Array.from({ length: config.targetSets }, () => ({
        reps: config.repRangeMin, weight: config.currentWeight, rpe: 3,
      }));
    }
    setSessionExercises([...sessionExercises, { exercise, sets }]);
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
    if (sessionExercises.length === 0) { toast.error('Add at least one exercise!'); return; }
    const exercises: ExerciseLog[] = sessionExercises.map(e => ({
      exercise: e.exercise, sets: e.sets, date: new Date().toISOString(), notes: sessionNotes || undefined,
    }));
    addSession({ date: new Date().toISOString(), splitDay, exercises, notes: sessionNotes || undefined });
    setSessionExercises([]);
    setSessionNotes('');
    toast.success('Session logged! 🔥');
  };

  const saveAsTemplate = () => {
    if (sessionExercises.length === 0) return;
    const name = prompt('Template name:');
    if (!name) return;
    const template: WorkoutTemplate = {
      id: generateId(), name, splitDay,
      exercises: sessionExercises.map(e => ({
        exercise: e.exercise, sets: e.sets.length, weight: e.sets[0]?.weight || 0, reps: e.sets[0]?.reps || 0,
      })),
    };
    const updated = [...templates, template];
    setTemplates(updated);
    saveTemplates(updated);
    toast.success(`Template "${name}" saved!`);
  };

  const loadFromTemplate = (template: WorkoutTemplate) => {
    setSplitDay(template.splitDay as SplitDay);
    const exercises = template.exercises.map(e => {
      const config = configs.find(c => c.exercise === e.exercise);
      return {
        exercise: e.exercise,
        sets: Array.from({ length: e.sets }, () => ({
          reps: e.reps || config?.repRangeMin || 6, weight: config?.currentWeight || e.weight, rpe: 3,
        })),
      };
    });
    setSessionExercises(exercises);
    toast.success(`Loaded template "${template.name}"`);
  };

  const deleteTemplate = (id: string) => {
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    saveTemplates(updated);
    toast.success('Template deleted');
  };

  const [timerRunning, setTimerRunning] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<string>('squat');
  const history = getExerciseHistory(sessions, selectedExercise);
  const chartData = history.slice().reverse().map(h => ({
    date: new Date(h.date).toLocaleDateString(),
    weight: Math.max(...h.sets.map(s => s.weight)),
    volume: calculateVolumeLoad(h.sets),
  }));

  const sortedSessions = [...sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Workouts</h1>
        <p className="text-muted-foreground mt-0.5 text-xs md:text-sm">Progressive overload · Compound-first</p>
      </div>

      <Tabs defaultValue="session" className="space-y-4">
        <TabsList className="w-full overflow-x-auto no-scrollbar flex justify-start">
          <TabsTrigger value="session" className="text-xs px-2.5">Log Session</TabsTrigger>
          <TabsTrigger value="templates" className="text-xs px-2.5">Templates</TabsTrigger>
          <TabsTrigger value="history" className="text-xs px-2.5">History</TabsTrigger>
          <TabsTrigger value="progress" className="text-xs px-2.5">Progress</TabsTrigger>
          <TabsTrigger value="prs" className="text-xs px-2.5">PRs</TabsTrigger>
          <TabsTrigger value="config" className="text-xs px-2.5">Config</TabsTrigger>
        </TabsList>

        {/* LOG SESSION TAB */}
        <TabsContent value="session" className="space-y-4">
          <div className="flex gap-4 flex-wrap items-end">
            <div>
              <label className="text-sm text-muted-foreground uppercase tracking-wider font-medium">Split Day</label>
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
              <label className="text-sm text-muted-foreground uppercase tracking-wider font-medium">Add Exercise</label>
              <Select onValueChange={(v) => addExerciseToSession(v)}>
                <SelectTrigger className="w-48 mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {allExerciseOptions.map(({ id, label: name }) => (
                    <SelectItem key={id} value={id}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <RestTimer onRunningChange={setTimerRunning} />
          </div>

          {sessionExercises.map((ex, exIdx) => {
            const config = configs.find(c => c.exercise === ex.exercise);
            const recentHistory = getExerciseHistory(sessions, ex.exercise);
            const suggestion = config ? getProgressionSuggestion(config, recentHistory) : null;

            return (
              <Card key={exIdx} className="shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Dumbbell className="h-4 w-4 text-primary" />
                      {label(ex.exercise)}
                    </CardTitle>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeExercise(exIdx)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {suggestion && (
                    <div className={`text-xs p-2 rounded-lg mt-2 border ${
                      suggestion.type === 'increase_weight' ? 'bg-teal/10 text-teal border-teal/20' :
                      suggestion.type === 'deload' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                      suggestion.type === 'fatigue_warning' ? 'bg-amber/10 text-amber border-amber/20' :
                      'bg-primary/10 text-primary border-primary/20'
                    }`}>
                      {suggestion.type === 'increase_weight' && <ArrowUp className="h-3 w-3 inline mr-1" />}
                      {suggestion.type === 'deload' && <ArrowDown className="h-3 w-3 inline mr-1" />}
                      {suggestion.type === 'fatigue_warning' && <TrendingUp className="h-3 w-3 inline mr-1" />}
                      {suggestion.type === 'hold' && <Minus className="h-3 w-3 inline mr-1" />}
                      {suggestion.type === 'increase_reps' && <ArrowUp className="h-3 w-3 inline mr-1" />}
                      {suggestion.message}
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground uppercase tracking-wider font-medium">
                      <span>Set</span><span>Weight</span><span>Reps</span><span>RPE</span>
                    </div>
                    {ex.sets.map((set, setIdx) => (
                      <div key={setIdx} className="grid grid-cols-4 gap-2">
                        <span className="text-sm flex items-center font-bold text-primary">{setIdx + 1}</span>
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
            <div className="space-y-3">
              <Card className="shadow-sm">
                <CardContent className="pt-4">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium flex items-center gap-1.5">
                    <FileText className="h-3 w-3" /> Session Notes
                  </label>
                  <Textarea className="mt-1 h-20 text-xs" placeholder="How did it feel? Any pain? Energy level?" value={sessionNotes} onChange={e => setSessionNotes(e.target.value)} />
                </CardContent>
              </Card>
              <div className="flex gap-3">
                <Button onClick={logSession} disabled={timerRunning} className="flex-1 font-bold text-lg py-6" title={timerRunning ? 'Wait for rest timer to finish' : undefined}>
                  {timerRunning ? 'Resting...' : 'Log Session'}
                </Button>
                <Button onClick={saveAsTemplate} variant="outline">
                  <Save className="h-4 w-4 mr-1" /> Save Template
                </Button>
              </div>
            </div>
          )}

          {sessionExercises.length === 0 && (
            <Card className="border-dashed border-2 border-primary/20">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Dumbbell className="h-16 w-16 text-primary/30 mb-4" />
                <p className="text-muted-foreground text-lg">Select exercises above to begin</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TEMPLATES TAB */}
        <TabsContent value="templates" className="space-y-4">
          {templates.length === 0 ? (
            <Card className="border-dashed border-2 border-primary/20">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Save className="h-16 w-16 text-primary/30 mb-4" />
                <p className="text-muted-foreground text-lg">No templates yet</p>
                <p className="text-xs text-muted-foreground mt-1">Log a session and save it as a template</p>
              </CardContent>
            </Card>
          ) : (
            templates.map((t) => (
              <Card key={t.id} className="shadow-sm">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-semibold">{t.name}</p>
                      <Badge variant="outline" className="text-xs capitalize mt-1">{t.splitDay}</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => loadFromTemplate(t)} className="text-xs font-semibold">
                        Quick Start
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteTemplate(t.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {t.exercises.map((e, j) => (
                      <Badge key={j} variant="outline" className="text-xs">
                        {label(e.exercise)} · {e.sets}×{e.reps}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history" className="space-y-4">
          {sortedSessions.length === 0 ? (
            <Card className="border-dashed border-2 border-primary/20">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <History className="h-16 w-16 text-primary/30 mb-4" />
                <p className="text-muted-foreground text-lg">No sessions logged yet</p>
              </CardContent>
            </Card>
          ) : (
            sortedSessions.map((session) => {
              const isExpanded = expandedSessions.has(session.id);
              const totalVolume = session.exercises.reduce((sum, ex) => sum + calculateVolumeLoad(ex.sets), 0);
              return (
                <Card key={session.id} className="shadow-sm">
                  <Collapsible open={isExpanded} onOpenChange={() => toggleSession(session.id)}>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {isExpanded ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{new Date(session.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                                <Badge variant="outline" className="text-xs capitalize">{session.splitDay}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {session.exercises.length} exercise{session.exercises.length !== 1 ? 's' : ''} · {totalVolume.toLocaleString()} lbs volume
                              </p>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost" className="text-destructive h-7" onClick={(e) => { e.stopPropagation(); deleteSession(session.id); toast.success('Session deleted'); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="h-px bg-border mb-3" />
                        {session.notes && (
                          <div className="text-xs text-muted-foreground mb-3 p-2 bg-accent/50 rounded-lg border border-border flex items-start gap-1.5">
                            <FileText className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            {session.notes}
                          </div>
                        )}
                        <div className="space-y-3">
                          {session.exercises.map((ex, exIdx) => (
                            <div key={exIdx} className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Dumbbell className="h-3.5 w-3.5 text-primary" />
                                <span className="font-semibold text-sm">{label(ex.exercise)}</span>
                                <span className="text-xs text-muted-foreground ml-auto">{calculateVolumeLoad(ex.sets)} lbs</span>
                              </div>
                              <div className="ml-6 space-y-0.5">
                                {ex.sets.map((set, sIdx) => (
                                  <div key={sIdx} className="text-xs text-muted-foreground font-mono flex gap-4">
                                    <span>Set {sIdx + 1}:</span>
                                    <span>{set.weight} lbs × {set.reps}</span>
                                    <span className="text-primary/60">RPE {set.rpe}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* PROGRESS TAB */}
        <TabsContent value="progress" className="space-y-4">
          <div className="flex gap-4 items-end">
            <div>
              <label className="text-sm text-muted-foreground uppercase tracking-wider font-medium">Exercise</label>
              <Select value={selectedExercise} onValueChange={setSelectedExercise}>
                <SelectTrigger className="w-48 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {allExerciseOptions.map(({ id, label: name }) => (
                    <SelectItem key={id} value={id}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Weight Progression
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 88%)" />
                    <XAxis dataKey="date" stroke="hsl(220 10% 45%)" fontSize={11} />
                    <YAxis stroke="hsl(220 10% 45%)" fontSize={11} />
                    <Tooltip contentStyle={{ background: 'hsl(0 0% 100%)', border: '1px solid hsl(220 15% 88%)', borderRadius: '8px', fontFamily: 'Inter' }} />
                    <Line type="monotone" dataKey="weight" stroke="hsl(220 60% 30%)" strokeWidth={3} dot={{ fill: 'hsl(220 60% 30%)', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-8">No data yet. Log your first session!</p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-coral" /> Weekly Volume
              </CardTitle>
            </CardHeader>
            <CardContent>
              {weeklyVolume.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={weeklyVolume}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 88%)" />
                    <XAxis dataKey="week" stroke="hsl(220 10% 45%)" fontSize={11} />
                    <YAxis stroke="hsl(220 10% 45%)" fontSize={11} />
                    <Tooltip contentStyle={{ background: 'hsl(0 0% 100%)', border: '1px solid hsl(220 15% 88%)', borderRadius: '8px', fontFamily: 'Inter' }} />
                    <Bar dataKey="volume" fill="hsl(12 80% 65%)" radius={[4, 4, 0, 0]} />
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
              <Card key={pr.exercise} className="shadow-sm border-coral/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Trophy className="h-8 w-8 text-coral" />
                    <div>
                      <p className="font-semibold text-lg">{label(pr.exercise)}</p>
                      <p className="text-3xl font-bold text-primary">{pr.weight} × {pr.reps}</p>
                      <p className="text-xs text-muted-foreground">Vol: {pr.volumeLoad} lbs · {new Date(pr.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )) : (
              <Card className="border-dashed border-2 border-coral/20 col-span-2">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Trophy className="h-16 w-16 text-coral/30 mb-4" />
                  <p className="text-muted-foreground text-lg">No PRs yet. Start lifting!</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* CONFIG TAB */}
        <TabsContent value="config" className="space-y-4">
          {configs.map(config => {
            const isCustom = !isBuiltInExercise(config.exercise);
            const customEx = isCustom ? customExercises.find(e => e.id === config.exercise) : null;
            return (
              <Card key={config.exercise} className="shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{label(config.exercise)}</h3>
                      {customEx && (
                        <Badge variant="outline" className="text-xs capitalize">{customEx.equipment}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{config.targetSets} × {config.repRangeMin}-{config.repRangeMax}</Badge>
                      {isCustom && (
                        <Button size="sm" variant="ghost" className="text-destructive h-7 w-7 p-0" onClick={() => handleDeleteCustomExercise(config.exercise)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {customEx && customEx.muscleGroups.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {customEx.muscleGroups.map(m => (
                        <Badge key={m} variant="outline" className="text-[10px] capitalize">{m}</Badge>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Sets</label>
                      <Input type="number" value={config.targetSets} onChange={e => updateConfig(config.exercise, { targetSets: Number(e.target.value) })} className="h-8 mt-1" min={1} max={10} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Weight</label>
                      <Input type="number" value={config.currentWeight} onChange={e => updateConfig(config.exercise, { currentWeight: Number(e.target.value) })} className="h-8 mt-1" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Increment</label>
                      <Input type="number" value={config.weightIncrement} onChange={e => updateConfig(config.exercise, { weightIncrement: Number(e.target.value) })} className="h-8 mt-1" step={2.5} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Rep Min</label>
                      <Input type="number" value={config.repRangeMin} onChange={e => updateConfig(config.exercise, { repRangeMin: Number(e.target.value) })} className="h-8 mt-1" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Rep Max</label>
                      <Input type="number" value={config.repRangeMax} onChange={e => updateConfig(config.exercise, { repRangeMax: Number(e.target.value) })} className="h-8 mt-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Add Custom Exercise */}
          <Dialog open={showAddCustom} onOpenChange={setShowAddCustom}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full border-dashed border-2 border-primary/20 py-8 text-primary hover:bg-primary/5">
                <Plus className="h-5 w-5 mr-2" /> Add Custom Exercise
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">New Custom Exercise</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <label className="text-sm text-muted-foreground uppercase tracking-wider font-medium">Exercise Name</label>
                  <Input value={newExName} onChange={e => setNewExName(e.target.value)} placeholder="e.g., Incline DB Press" className="mt-1" />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground uppercase tracking-wider font-medium">Equipment</label>
                  <Select value={newExEquipment} onValueChange={(v) => setNewExEquipment(v as EquipmentType)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(EQUIPMENT_LABELS).map(([key, name]) => (
                        <SelectItem key={key} value={key}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground uppercase tracking-wider font-medium">Muscle Groups</label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {ALL_MUSCLE_GROUPS.map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => toggleMuscle(m)}
                        className={`px-2.5 py-1 rounded text-xs capitalize border transition-all ${
                          newExMuscles.includes(m)
                            ? 'bg-primary/15 border-primary/40 text-primary font-medium'
                            : 'border-border text-muted-foreground hover:border-primary/20'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* AI Config Generator */}
                {!showAIConfig ? (
                  <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 border-dashed" onClick={() => setShowAIConfig(true)}>
                    <Sparkles className="h-3.5 w-3.5" /> Generate Config with AI
                  </Button>
                ) : (
                  <div className="border border-border/30 rounded-lg p-3 space-y-3 bg-muted/10">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-muted-foreground">
                        1. Copy the prompt below and paste it into ChatGPT, Claude, etc.
                        <br/>2. Paste the response back and click "Apply".
                      </p>
                      <button onClick={() => setShowAIConfig(false)} className="p-1 rounded hover:bg-accent/50 text-muted-foreground flex-shrink-0 ml-2">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <Button size="sm" variant="outline" className="w-full text-xs gap-1.5" onClick={copyAIConfigPrompt}>
                      <Copy className="h-3 w-3" /> Copy AI Prompt
                    </Button>
                    <Textarea
                      value={aiConfigResponse}
                      onChange={e => setAiConfigResponse(e.target.value)}
                      placeholder={`Paste AI response here...\n\nSETS: 3\nREP_MIN: 8\nREP_MAX: 12\nWEIGHT: 30\nINCREMENT: 2.5\nEQUIPMENT: dumbbell\nMUSCLES: chest,shoulders,triceps`}
                      className="font-mono text-xs min-h-[80px]"
                    />
                    <Button size="sm" onClick={parseAIConfigResponse} disabled={!aiConfigResponse.trim()} className="w-full text-xs gap-1.5 font-semibold">
                      <Sparkles className="h-3 w-3" /> Apply AI Config
                    </Button>
                  </div>
                )}

                <div className="border-t pt-4">
                  <label className="text-sm text-muted-foreground uppercase tracking-wider font-medium">Starting Config</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase">Starting Weight</label>
                      <Input type="number" value={newExWeight} onChange={e => setNewExWeight(Number(e.target.value))} className="h-8 mt-0.5" />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase">Sets</label>
                      <Input type="number" value={newExSets} onChange={e => setNewExSets(Number(e.target.value))} className="h-8 mt-0.5" min={1} max={10} />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase">Increment</label>
                      <Input type="number" value={newExIncrement} onChange={e => setNewExIncrement(Number(e.target.value))} className="h-8 mt-0.5" step={2.5} />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase">Rep Min</label>
                      <Input type="number" value={newExRepMin} onChange={e => setNewExRepMin(Number(e.target.value))} className="h-8 mt-0.5" />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase">Rep Max</label>
                      <Input type="number" value={newExRepMax} onChange={e => setNewExRepMax(Number(e.target.value))} className="h-8 mt-0.5" />
                    </div>
                  </div>
                </div>

                <Button onClick={handleAddCustomExercise} disabled={!newExName.trim()} className="w-full font-semibold">
                  <Plus className="h-4 w-4 mr-2" /> Add Exercise
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
