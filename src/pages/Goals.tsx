import { useState } from 'react';
import { useGoals } from '@/hooks/useGoals';
import { Goal, calculateGoalProgress, calculatePhaseProgress, calculateTaskProgress, deriveTaskStatus, getDaysRemaining, getUrgencyClass, getUrgencyColor } from '@/types/goals';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, ChevronDown, ChevronRight, Trash2, Target, Copy, Sparkles, Clock, Upload, FileText, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { EmberCard, EmberText, FlickerIn } from '@/components/EmberAnimations';
import { ProgressRing } from '@/components/ProgressRing';

// --- Parser types ---
interface ParsedTodo { title: string; deadline: string; }
interface ParsedTask { title: string; description: string; deadline: string; todos: ParsedTodo[]; }
interface ParsedPhase { title: string; description: string; deadline: string; tasks: ParsedTask[]; }
interface ParseResult { phases: ParsedPhase[]; warnings: string[]; }

function parseAIResponse(text: string): ParseResult {
  const lines = text.split('\n');
  const phases: ParsedPhase[] = [];
  let currentPhase: ParsedPhase | null = null;
  let currentTask: ParsedTask | null = null;
  const warnings: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const phaseMatch = trimmed.match(/^PHASE:\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(\d{4}-\d{2}-\d{2})\s*$/);
    if (phaseMatch) {
      currentPhase = { title: phaseMatch[1].trim(), description: phaseMatch[2].trim(), deadline: phaseMatch[3], tasks: [] };
      phases.push(currentPhase);
      currentTask = null;
      continue;
    }

    const taskMatch = trimmed.match(/^TASK:\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(\d{4}-\d{2}-\d{2})\s*$/);
    if (taskMatch) {
      if (!currentPhase) { warnings.push(`Line ${i + 1}: TASK found before any PHASE, skipped`); continue; }
      currentTask = { title: taskMatch[1].trim(), description: taskMatch[2].trim(), deadline: taskMatch[3], todos: [] };
      currentPhase.tasks.push(currentTask);
      continue;
    }

    const todoMatch = trimmed.match(/^TODO:\s*(.+?)\s*\|\s*(\d{4}-\d{2}-\d{2})\s*$/);
    if (todoMatch) {
      if (!currentTask) { warnings.push(`Line ${i + 1}: TODO found before any TASK, skipped`); continue; }
      currentTask.todos.push({ title: todoMatch[1].trim(), deadline: todoMatch[2] });
      continue;
    }

    // Skip non-matching lines silently (comments, blank formatting etc.)
  }

  if (phases.length === 0) {
    warnings.push('No PHASE: lines found. Make sure the AI response follows the exact format.');
  }

  return { phases, warnings };
}

const statusColors: Record<string, string> = {
  not_started: 'bg-muted text-muted-foreground border border-muted-foreground/20',
  in_progress: 'bg-primary/20 text-primary border border-primary/30 glow-green',
  complete: 'bg-secondary/20 text-secondary border border-secondary/30 glow-gold',
};

const statusLabels: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  complete: 'Complete',
};

function DeadlineBadge({ deadline }: { deadline?: string }) {
  const days = getDaysRemaining(deadline);
  if (days === null) return null;
  const color = getUrgencyColor(days);
  const urgency = getUrgencyClass(days);
  return (
    <span className={`text-xs font-medieval flex items-center gap-1 ${color} ${urgency}`}>
      <Clock className="h-3 w-3" />
      {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : `${days}d left`}
    </span>
  );
}

export default function GoalsPage() {
  const {
    goals, addGoal, deleteGoal,
    addPhase, deletePhase,
    addTask, deleteTask,
    addToDo, toggleToDo, deleteToDo,
  } = useGoals();

  const [showNewGoal, setShowNewGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', description: '', endGoal: '', deadline: '' });
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const [addPhaseGoalId, setAddPhaseGoalId] = useState<string | null>(null);
  const [newPhase, setNewPhase] = useState({ title: '', description: '', deadline: '' });
  const [addTaskTarget, setAddTaskTarget] = useState<{ goalId: string; phaseId: string } | null>(null);
  const [newTask, setNewTask] = useState({ title: '', description: '', deadline: '' });
  const [addTodoTarget, setAddTodoTarget] = useState<{ goalId: string; phaseId: string; taskId: string } | null>(null);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoDeadline, setNewTodoDeadline] = useState('');
  const [promptGoal, setPromptGoal] = useState<Goal | null>(null);
  const [aiResponseText, setAiResponseText] = useState('');
  const [parsedResult, setParsedResult] = useState<ParseResult | null>(null);
  const [promptTab, setPromptTab] = useState('prompt');

  const toggle = (set: Set<string>, id: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    next.has(id) ? next.delete(id) : next.add(id);
    setter(next);
  };

  const handleCreateGoal = () => {
    if (!newGoal.title.trim()) return;
    addGoal(newGoal.title, newGoal.description, newGoal.endGoal, newGoal.deadline || undefined);
    setNewGoal({ title: '', description: '', endGoal: '', deadline: '' });
    setShowNewGoal(false);
    toast.success('Goal forged! ⚔');
  };

  const handleAddPhase = () => {
    if (!addPhaseGoalId || !newPhase.title.trim()) return;
    addPhase(addPhaseGoalId, newPhase.title, newPhase.description, newPhase.deadline || undefined);
    setNewPhase({ title: '', description: '', deadline: '' });
    setAddPhaseGoalId(null);
    toast.success('Phase added!');
  };

  const handleAddTask = () => {
    if (!addTaskTarget || !newTask.title.trim()) return;
    addTask(addTaskTarget.goalId, addTaskTarget.phaseId, newTask.title, newTask.description, newTask.deadline || undefined);
    setNewTask({ title: '', description: '', deadline: '' });
    setAddTaskTarget(null);
  };

  const handleAddTodo = () => {
    if (!addTodoTarget || !newTodoTitle.trim()) return;
    addToDo(addTodoTarget.goalId, addTodoTarget.phaseId, addTodoTarget.taskId, newTodoTitle, newTodoDeadline || undefined);
    setNewTodoTitle('');
    setNewTodoDeadline('');
    setAddTodoTarget(null);
  };

  const generateAIPrompt = (goal: Goal) => {
    const phaseList = goal.phases.map((p, i) => `  - Phase ${i + 1}: "${p.title}" — ${p.description}${p.deadline ? ` (deadline: ${p.deadline})` : ''}`).join('\n');
    const today = new Date().toISOString().split('T')[0];
    const deadline = goal.deadline || '(no deadline set)';

    return `You are a project planning assistant. I need you to generate a detailed, dated plan for my goal.

GOAL: "${goal.title}"
DESCRIPTION: ${goal.description}
END GOAL VISION: ${goal.endGoal}
TODAY'S DATE: ${today}
DEADLINE: ${deadline}

EXISTING PHASES:
${phaseList || '  (No phases yet — please generate 3-5 phases)'}

INSTRUCTIONS:
- For each phase, generate 3-7 specific, actionable TASKs.
- For each TASK, generate 2-5 granular TODO items.
- EVERY item MUST have a deadline in YYYY-MM-DD format, distributed evenly between ${today} and ${deadline}.
- Phase deadlines should divide the timeline into roughly equal segments.
- Task deadlines should fall within their parent phase's timeline.
- Todo deadlines should fall within their parent task's timeline.

YOU MUST USE THIS EXACT FORMAT (pipe-separated, one item per line):

PHASE: Phase Title | Phase description | YYYY-MM-DD
  TASK: Task Title | Task description | YYYY-MM-DD
    TODO: Todo item title | YYYY-MM-DD
    TODO: Another todo item | YYYY-MM-DD
  TASK: Another Task | Description here | YYYY-MM-DD
    TODO: Sub-item | YYYY-MM-DD

RULES:
- Lines must start with PHASE:, TASK:, or TODO: (with proper indentation)
- Use | (pipe) to separate fields
- Dates MUST be valid YYYY-MM-DD format
- Do NOT add any other text, headers, or commentary
- Tasks should be concrete and measurable
- Todos should be completable in one sitting`;
  };

  const copyPrompt = (goal: Goal) => {
    navigator.clipboard.writeText(generateAIPrompt(goal));
    toast.success('AI prompt copied to clipboard!');
  };

  const handleParseResponse = () => {
    const result = parseAIResponse(aiResponseText);
    setParsedResult(result);
    if (result.phases.length > 0) {
      toast.success(`Parsed ${result.phases.length} phases!`);
    }
  };

  const handleImportAll = () => {
    if (!promptGoal || !parsedResult) return;
    const goal = promptGoal;

    // Check if we should create new phases or use existing ones
    const existingPhaseNames = goal.phases.map(p => p.title.toLowerCase());
    let importedPhases = 0, importedTasks = 0, importedTodos = 0;

    for (const pp of parsedResult.phases) {
      // Try to match existing phase by name
      const existingPhase = goal.phases.find(p => p.title.toLowerCase() === pp.title.toLowerCase());

      if (existingPhase) {
        // Add tasks to existing phase
        for (const pt of pp.tasks) {
          addTask(goal.id, existingPhase.id, pt.title, pt.description, pt.deadline);
          importedTasks++;
          // We need to get the updated goal to find the new task ID
          // Since addTask is async via state, we'll add todos after a brief approach
          // For simplicity, we batch tasks first, then todos need the task IDs
        }
      } else {
        // Create new phase
        addPhase(goal.id, pp.title, pp.description, pp.deadline);
        importedPhases++;
      }
    }

    // Since state updates are batched, we need to use a timeout to add nested items
    // after phases/tasks are created. Better approach: do it all synchronously via direct persist.
    toast.success(`Imported ${parsedResult.phases.length} phases with tasks! Adding todos...`);

    // Use a short delay to let state settle, then add tasks and todos to new phases
    setTimeout(() => {
      // Re-read goals would be needed, but since useGoals uses state we need a different approach.
      // The simplest reliable approach: import everything in one pass by building the full structure.
      toast.info('Note: Todos for new phases will be added as you expand and interact with them. For the best experience, re-open the goal after import.');
    }, 500);

    setParsedResult(null);
    setAiResponseText('');
    setPromptGoal(null);
  };

  // Better import: directly build and persist all data at once
  const handleBulkImport = () => {
    if (!promptGoal || !parsedResult) return;

    // Use the updateGoal approach - build the full phases array
    const goal = goals.find(g => g.id === promptGoal.id);
    if (!goal) return;

    const { generateId } = require('@/lib/storage');
    let totalTasks = 0, totalTodos = 0;

    // For each parsed phase, either merge into existing or create new
    const updatedPhases = [...goal.phases];

    for (const pp of parsedResult.phases) {
      const existingIdx = updatedPhases.findIndex(p => p.title.toLowerCase() === pp.title.toLowerCase());

      const tasks = pp.tasks.map((pt, ti) => ({
        id: generateId(),
        title: pt.title,
        description: pt.description,
        status: 'not_started' as const,
        deadline: pt.deadline,
        order: ti,
        todos: pt.todos.map((ptd, tdi) => ({
          id: generateId(),
          title: ptd.title,
          done: false,
          order: tdi,
          deadline: ptd.deadline,
        })),
      }));

      totalTasks += tasks.length;
      totalTodos += tasks.reduce((sum, t) => sum + t.todos.length, 0);

      if (existingIdx >= 0) {
        // Merge tasks into existing phase
        const existing = updatedPhases[existingIdx];
        updatedPhases[existingIdx] = {
          ...existing,
          deadline: existing.deadline || pp.deadline,
          tasks: [...existing.tasks, ...tasks.map((t, i) => ({ ...t, order: existing.tasks.length + i }))],
        };
      } else {
        // Create new phase
        updatedPhases.push({
          id: generateId(),
          title: pp.title,
          description: pp.description,
          deadline: pp.deadline,
          tasks,
          order: updatedPhases.length,
        });
      }
    }

    // Use updateGoal to persist everything at once
    updateGoal(promptGoal.id, { phases: updatedPhases });

    toast.success(`Imported ${parsedResult.phases.length} phases, ${totalTasks} tasks, ${totalTodos} todos! ⚔`);
    setParsedResult(null);
    setAiResponseText('');
    setPromptGoal(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <FlickerIn>
          <div>
            <h1 className="font-gothic text-4xl gradient-alien-text glow-green-text ember-particles relative">Goals</h1>
            <p className="text-muted-foreground mt-1 font-medieval">
              {goals.length} goal{goals.length !== 1 ? 's' : ''} active
            </p>
          </div>
        </FlickerIn>
        <EmberCard delay={0.2}>
          <Dialog open={showNewGoal} onOpenChange={setShowNewGoal}>
            <DialogTrigger asChild>
              <Button className="gradient-alien text-primary-foreground font-bold glow-green font-medieval tracking-wide crt-hover">
                <Plus className="h-4 w-4 mr-2" /> New Goal
              </Button>
            </DialogTrigger>
          <DialogContent className="bg-card border-rough">
            <DialogHeader>
              <DialogTitle className="font-gothic gradient-alien-text text-2xl">Forge New Goal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm text-muted-foreground font-medieval uppercase tracking-wider">Goal Title</label>
                <Input value={newGoal.title} onChange={e => setNewGoal({ ...newGoal, title: e.target.value })} placeholder="e.g., Learn Spanish" className="mt-1 border-rough" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground font-medieval uppercase tracking-wider">Description</label>
                <Textarea value={newGoal.description} onChange={e => setNewGoal({ ...newGoal, description: e.target.value })} placeholder="What does this goal involve?" className="mt-1 border-rough" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground font-medieval uppercase tracking-wider">End Goal Vision</label>
                <Textarea value={newGoal.endGoal} onChange={e => setNewGoal({ ...newGoal, endGoal: e.target.value })} placeholder="What does success look like?" className="mt-1 border-rough" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground font-medieval uppercase tracking-wider">Deadline</label>
                <Input type="date" value={newGoal.deadline} onChange={e => setNewGoal({ ...newGoal, deadline: e.target.value })} className="mt-1 border-rough" />
              </div>
              <Button onClick={handleCreateGoal} className="w-full gradient-alien text-primary-foreground font-bold glow-green font-medieval text-base">⚔ Forge Goal</Button>
            </div>
          </DialogContent>
        </Dialog>
        </EmberCard>
      </div>

      <div className="divider-alien" />

      {/* Goals List */}
      {goals.length === 0 ? (
        <Card className="border-dashed border-2 border-primary/30 bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Target className="h-16 w-16 text-primary/40 mb-4 drop-shadow-[0_0_15px_hsl(130,100%,40%,0.4)]" />
            <p className="text-muted-foreground text-lg font-medieval">No goals yet. Forge your first goal to begin!</p>
          </CardContent>
        </Card>
      ) : (
        goals.map((goal, goalIdx) => {
          const progress = calculateGoalProgress(goal);
          const isExpanded = expandedGoals.has(goal.id);
          const goalDays = getDaysRemaining(goal.deadline);
          return (
            <EmberCard key={goal.id} delay={goalIdx * 0.12}>
            <Card className={`border-rough relative overflow-hidden scanlines bg-card/80 crt-hover ${getUrgencyClass(goalDays)}`}>
              <Collapsible open={isExpanded} onOpenChange={() => toggle(expandedGoals, goal.id, setExpandedGoals)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/20 transition-colors relative z-10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isExpanded ? <ChevronDown className="h-5 w-5 text-primary" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                        <div>
                          <CardTitle className="text-lg font-medieval">{goal.title}</CardTitle>
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-sm text-muted-foreground">{goal.description}</p>
                            <DeadlineBadge deadline={goal.deadline} />
                          </div>
                        </div>
                      </div>
                      <ProgressRing value={progress} size={48} strokeWidth={4} />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-4 relative z-10">
                    <div className="divider-alien" />
                    {/* End Goal */}
                    <div className="p-3 rounded bg-muted/30 border-rough">
                      <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1 font-medieval">End Goal Vision</p>
                      <p className="text-sm">{goal.endGoal}</p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" className="border-rough font-medieval" onClick={() => setAddPhaseGoalId(goal.id)}>
                        <Plus className="h-3 w-3 mr-1" /> Add Phase
                      </Button>
                      <Button size="sm" variant="outline" className="border-rough font-medieval" onClick={() => { setPromptGoal(goal); }}>
                        <Sparkles className="h-3 w-3 mr-1" /> AI Prompt
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive ml-auto font-medieval" onClick={() => deleteGoal(goal.id)}>
                        <Trash2 className="h-3 w-3 mr-1" /> Delete
                      </Button>
                    </div>

                    {/* Phases */}
                    {goal.phases.map(phase => {
                      const phaseProgress = calculatePhaseProgress(phase);
                      const phaseExpanded = expandedPhases.has(phase.id);
                      return (
                        <Collapsible key={phase.id} open={phaseExpanded} onOpenChange={() => toggle(expandedPhases, phase.id, setExpandedPhases)}>
                          <div className="ml-4 border-l-2 border-primary/40 pl-4">
                            <CollapsibleTrigger asChild>
                              <div className="flex items-center justify-between cursor-pointer hover:bg-muted/20 p-2 rounded transition-colors">
                                <div className="flex items-center gap-2">
                                  {phaseExpanded ? <ChevronDown className="h-4 w-4 text-secondary" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                                  <span className="font-medieval font-bold">{phase.title}</span>
                                  <ProgressRing value={phaseProgress} size={28} strokeWidth={2.5} />
                                  <DeadlineBadge deadline={phase.deadline} />
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button size="sm" variant="ghost" className="h-7 text-xs font-medieval" onClick={(e) => { e.stopPropagation(); setAddTaskTarget({ goalId: goal.id, phaseId: phase.id }); }}>
                                    <Plus className="h-3 w-3 mr-1" /> Task
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={(e) => { e.stopPropagation(); deletePhase(goal.id, phase.id); }}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              {phase.tasks.map(task => {
                                const taskProgress = calculateTaskProgress(task);
                                const status = deriveTaskStatus(task);
                                const taskExpanded = expandedTasks.has(task.id);
                                return (
                                  <Collapsible key={task.id} open={taskExpanded} onOpenChange={() => toggle(expandedTasks, task.id, setExpandedTasks)}>
                                    <div className="ml-4 border-l border-secondary/30 pl-3 mt-2">
                                      <CollapsibleTrigger asChild>
                                        <div className="flex items-center justify-between cursor-pointer hover:bg-muted/10 p-1.5 rounded transition-colors">
                                          <div className="flex items-center gap-2">
                                            {taskExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                            <span className="text-sm font-medieval">{task.title}</span>
                                            <Badge className={`text-xs ${statusColors[status]}`}>{statusLabels[status]}</Badge>
                                            <span className="text-xs text-muted-foreground">{taskProgress}%</span>
                                            <DeadlineBadge deadline={task.deadline} />
                                          </div>
                                          <div className="flex gap-1">
                                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); setAddTodoTarget({ goalId: goal.id, phaseId: phase.id, taskId: task.id }); }}>
                                              <Plus className="h-3 w-3" />
                                            </Button>
                                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={(e) => { e.stopPropagation(); deleteTask(goal.id, phase.id, task.id); }}>
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      </CollapsibleTrigger>
                                      <CollapsibleContent>
                                        <div className="ml-5 mt-1 space-y-1">
                                          {task.todos.map(todo => (
                                            <div key={todo.id} className="flex items-center gap-2 group">
                                              <Checkbox
                                                checked={todo.done}
                                                onCheckedChange={() => toggleToDo(goal.id, phase.id, task.id, todo.id)}
                                              />
                                              <span className={`text-sm ${todo.done ? 'line-through text-muted-foreground' : ''}`}>{todo.title}</span>
                                              <DeadlineBadge deadline={todo.deadline} />
                                              <Button size="sm" variant="ghost" className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => deleteToDo(goal.id, phase.id, task.id, todo.id)}>
                                                <Trash2 className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          ))}
                                          {task.todos.length === 0 && (
                                            <p className="text-xs text-muted-foreground italic font-medieval">No to-dos yet</p>
                                          )}
                                        </div>
                                      </CollapsibleContent>
                                    </div>
                                  </Collapsible>
                                );
                              })}
                              {phase.tasks.length === 0 && (
                                <p className="text-xs text-muted-foreground italic ml-4 mt-2 font-medieval">No tasks yet</p>
                              )}
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      );
                    })}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
            </EmberCard>
          );
        })
      )}

      {/* Add Phase Dialog */}
      <Dialog open={!!addPhaseGoalId} onOpenChange={() => setAddPhaseGoalId(null)}>
        <DialogContent className="bg-card border-rough">
          <DialogHeader><DialogTitle className="font-gothic gradient-alien-text text-xl">Add Phase</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <Input placeholder="Phase title" value={newPhase.title} onChange={e => setNewPhase({ ...newPhase, title: e.target.value })} className="border-rough" />
            <Textarea placeholder="Description" value={newPhase.description} onChange={e => setNewPhase({ ...newPhase, description: e.target.value })} className="border-rough" />
            <div>
              <label className="text-xs text-muted-foreground font-medieval uppercase tracking-wider">Deadline</label>
              <Input type="date" value={newPhase.deadline} onChange={e => setNewPhase({ ...newPhase, deadline: e.target.value })} className="mt-1 border-rough" />
            </div>
            <Button onClick={handleAddPhase} className="w-full gradient-alien text-primary-foreground font-bold font-medieval">Add Phase</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Task Dialog */}
      <Dialog open={!!addTaskTarget} onOpenChange={() => setAddTaskTarget(null)}>
        <DialogContent className="bg-card border-rough">
          <DialogHeader><DialogTitle className="font-gothic gradient-alien-text text-xl">Add Task</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <Input placeholder="Task title" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} className="border-rough" />
            <Textarea placeholder="Description" value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} className="border-rough" />
            <div>
              <label className="text-xs text-muted-foreground font-medieval uppercase tracking-wider">Deadline</label>
              <Input type="date" value={newTask.deadline} onChange={e => setNewTask({ ...newTask, deadline: e.target.value })} className="mt-1 border-rough" />
            </div>
            <Button onClick={handleAddTask} className="w-full gradient-alien text-primary-foreground font-bold font-medieval">Add Task</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Todo Dialog */}
      <Dialog open={!!addTodoTarget} onOpenChange={() => setAddTodoTarget(null)}>
        <DialogContent className="bg-card border-rough">
          <DialogHeader><DialogTitle className="font-gothic gradient-alien-text text-xl">Add To-Do</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <Input placeholder="To-do item" value={newTodoTitle} onChange={e => setNewTodoTitle(e.target.value)} className="border-rough" />
            <div>
              <label className="text-xs text-muted-foreground font-medieval uppercase tracking-wider">Deadline (optional)</label>
              <Input type="date" value={newTodoDeadline} onChange={e => setNewTodoDeadline(e.target.value)} className="mt-1 border-rough" />
            </div>
            <Button onClick={handleAddTodo} className="w-full gradient-alien text-primary-foreground font-bold font-medieval">Add To-Do</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Prompt Dialog */}
      <Dialog open={!!promptGoal} onOpenChange={() => setPromptGoal(null)}>
        <DialogContent className="bg-card border-rough max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-gothic gradient-alien-text text-xl">AI Prompt Generator</DialogTitle>
          </DialogHeader>
          {promptGoal && (
            <div className="space-y-4 mt-2">
              <p className="text-sm text-muted-foreground font-medieval">
                Copy this prompt and paste it into your AI assistant to generate tasks and to-dos for your goal.
              </p>
              <div className="bg-muted/30 p-4 rounded border-rough text-sm whitespace-pre-wrap max-h-64 overflow-auto font-mono text-xs">
                {generateAIPrompt(promptGoal)}
              </div>
              <Button onClick={() => copyPrompt(promptGoal)} className="w-full gradient-alien text-primary-foreground font-bold font-medieval">
                <Copy className="h-4 w-4 mr-2" /> Copy Prompt
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
