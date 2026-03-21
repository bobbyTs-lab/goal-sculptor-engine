import { useState } from 'react';
import { useGoals } from '@/hooks/useGoals';
import { generateId } from '@/lib/storage';
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
import { Plus, ChevronDown, ChevronRight, Trash2, Target, Copy, Sparkles, Clock, Upload, FileText, AlertCircle, Repeat, ToggleLeft } from 'lucide-react';
import { toast } from 'sonner';
import { ProgressRing } from '@/components/ProgressRing';

// --- Parser types ---
interface ParsedHabit { title: string; frequency: string; target: string; }
interface ParsedTodo { title: string; deadline: string; }
interface ParsedTask { title: string; description: string; deadline: string; todos: ParsedTodo[]; habits: ParsedHabit[]; }
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
      currentTask = { title: taskMatch[1].trim(), description: taskMatch[2].trim(), deadline: taskMatch[3], todos: [], habits: [] };
      currentPhase.tasks.push(currentTask);
      continue;
    }

    const todoMatch = trimmed.match(/^TODO:\s*(.+?)\s*\|\s*(\d{4}-\d{2}-\d{2})\s*$/);
    if (todoMatch) {
      if (!currentTask) { warnings.push(`Line ${i + 1}: TODO found before any TASK, skipped`); continue; }
      currentTask.todos.push({ title: todoMatch[1].trim(), deadline: todoMatch[2] });
      continue;
    }

    const habitMatch = trimmed.match(/^HABIT:\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*$/);
    if (habitMatch) {
      if (!currentTask) { warnings.push(`Line ${i + 1}: HABIT found before any TASK, skipped`); continue; }
      currentTask.habits.push({ title: habitMatch[1].trim(), frequency: habitMatch[2].trim(), target: habitMatch[3].trim() });
      continue;
    }
  }

  if (phases.length === 0) {
    warnings.push('No PHASE: lines found. Make sure the AI response follows the exact format.');
  }

  return { phases, warnings };
}

const statusColors: Record<string, string> = {
  not_started: 'bg-muted text-muted-foreground',
  in_progress: 'bg-primary/10 text-primary border border-primary/20',
  complete: 'bg-teal/10 text-teal border border-teal/20',
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
  return (
    <span className={`text-xs font-medium flex items-center gap-1 ${color}`}>
      <Clock className="h-3 w-3" />
      {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : `${days}d left`}
    </span>
  );
}

export default function GoalsPage() {
  const {
    goals, addGoal, updateGoal, deleteGoal,
    addPhase, deletePhase,
    addTask, deleteTask,
    addToDo, toggleToDo, deleteToDo,
    addHabit, toggleHabit, deleteHabit,
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
  const [addHabitTarget, setAddHabitTarget] = useState<{ goalId: string; phaseId: string; taskId: string } | null>(null);
  const [newHabit, setNewHabit] = useState({ title: '', frequency: 'daily', target: '' });
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
    toast.success('Goal created!');
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

  const handleAddHabit = () => {
    if (!addHabitTarget || !newHabit.title.trim()) return;
    addHabit(addHabitTarget.goalId, addHabitTarget.phaseId, addHabitTarget.taskId, newHabit.title, newHabit.frequency, newHabit.target || undefined);
    setNewHabit({ title: '', frequency: 'daily', target: '' });
    setAddHabitTarget(null);
    toast.success('Habit added!');
  };

  const generateAIPrompt = (goal: Goal) => {
    const phaseList = goal.phases.map((p, i) => `  - Phase ${i + 1}: "${p.title}" — ${p.description}${p.deadline ? ` (deadline: ${p.deadline})` : ''}`).join('\n');
    const today = new Date().toISOString().split('T')[0];
    const deadline = goal.deadline || '(no deadline set)';

    return `You are an expert project planner, systems designer, and skill coach.

Your job is to convert goals into structured execution plans with realistic progression and atomic actions.

The plan must be practical, logically ordered, and deeply thought out.

GOAL: "${goal.title}"
DESCRIPTION: ${goal.description}
END GOAL VISION: ${goal.endGoal}
TODAY'S DATE: ${today}
DEADLINE: ${deadline}

EXISTING PHASES:
${phaseList || '  (No phases yet — please generate 3-5 phases)'}

═══════════════════════════════════════
STEP 1 — INFORMATION GATHERING
═══════════════════════════════════════

Before creating the plan, ask questions needed to design a high-quality plan.

Ask about:
- Current skill level or experience
- Available time per week
- Access to equipment, tools, or facilities
- Access to mentors/coaches
- Constraints or risks
- Relevant physical or mental prerequisites
- Environment where the work will occur
- Whether the goal is casual, serious, or elite level

Wait for the user's answers before continuing.
Do NOT generate the plan yet.

═══════════════════════════════════════
STEP 2 — PLAN DESIGN
═══════════════════════════════════════

After receiving answers, generate the full plan.

The plan must follow this progression model:
1. Understanding / knowledge
2. Prerequisite skills or preparation
3. Guided or assisted attempts
4. First successful completion
5. Repetition and consistency
6. Variation and adaptation
7. Performance mastery

TODO RULES — TODO items must:
- Be completable in a single uninterrupted session
- Take approximately 5–60 minutes
- Represent one concrete action
- NOT represent habits or ongoing routines
- NOT represent vague ideas like "practice more"
Good: "Record video of 3 attempts", "Watch 2 instructional videos", "Write summary of technique"
Bad: "Practice daily", "Train for a month", "Improve strength"
If a TODO is larger than a single session, break it into smaller TODOs.

HABIT RULES — HABIT items represent ongoing routines, regimens, or recurring practices tied to a task:
- Must be specific, measurable recurring actions
- Include a clear frequency (daily, 3x/week, weekdays, etc.)
- Include a clear target or metric (200g protein, 30 minutes, 5 sets, etc.)
- Habits evolve task-by-task — they can be introduced, modified, or intensified as the plan progresses
- Each task should include habits that are appropriate for that stage of development
Good: "Eat 200g protein | daily | 200g minimum", "Practice chord transitions | daily | 30 minutes", "Mobility stretching | daily | 15 minutes"
Bad: "Be healthy", "Practice more", "Eat well"

TASK RULES — Tasks must:
- Represent measurable capability milestones
- Include numbers or clear success criteria
- Represent meaningful progress toward the goal
- Include both one-off TODOs (actionable steps) AND ongoing HABITs (regimens to maintain)
Good: "Land first assisted backflip", "Hold a 2-minute plank"
Bad: "Improve technique", "Work on strength"

TIME RULES:
- Every TODO item MUST have a deadline in YYYY-MM-DD format.
- Phase deadlines divide the total timeline (\${today} to \${deadline}) roughly evenly.
- Task deadlines fall within their phase.
- Todo deadlines fall within their task.
- Deadlines should progress logically and steadily.
- HABIT items do NOT have deadlines — they are ongoing.

PLAN QUALITY — Before producing the final plan, internally verify that:
- Progression makes logical sense
- Tasks represent real milestones
- Todos are atomic single-session actions
- Habits are specific, measurable recurring actions
- Habits evolve appropriately across tasks (e.g., protein target increases, practice duration grows)
- No vague wording is used
- Nothing requires multiple sessions

OUTPUT FORMAT — You MUST use this exact format:

PHASE: Phase Title | Phase description | YYYY-MM-DD
  TASK: Task Title | Task description | YYYY-MM-DD
    TODO: Todo item title | YYYY-MM-DD
    TODO: Another todo item | YYYY-MM-DD
    HABIT: Habit title | frequency | target
    HABIT: Another habit | daily | 30 minutes
  TASK: Another Task | Description here | YYYY-MM-DD
    TODO: Sub-item | YYYY-MM-DD
    HABIT: Evolved habit | daily | 45 minutes

RULES:
- Lines must start with PHASE:, TASK:, TODO:, or HABIT:
- Maintain indentation
- Use | (pipe) to separate fields
- TODO dates MUST be YYYY-MM-DD
- HABIT lines have 3 fields: title | frequency | target
- Do NOT add explanations or commentary
- Output ONLY the plan`;
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

  const handleBulkImport = () => {
    if (!promptGoal || !parsedResult) return;
    const goal = goals.find(g => g.id === promptGoal.id);
    if (!goal) return;

    let totalTasks = 0, totalTodos = 0;
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
        habits: (pt.habits || []).map(ph => ({
          id: generateId(),
          title: ph.title,
          frequency: ph.frequency,
          target: ph.target,
          active: true,
        })),
      }));

      totalTasks += tasks.length;
      totalTodos += tasks.reduce((sum, t) => sum + t.todos.length, 0);
      let totalHabits = tasks.reduce((sum, t) => sum + t.habits.length, 0);

      if (existingIdx >= 0) {
        const existing = updatedPhases[existingIdx];
        updatedPhases[existingIdx] = {
          ...existing,
          deadline: existing.deadline || pp.deadline,
          tasks: [...existing.tasks, ...tasks.map((t, i) => ({ ...t, order: existing.tasks.length + i }))],
        };
      } else {
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

    updateGoal(promptGoal.id, { phases: updatedPhases });
    const totalHabitsAll = parsedResult.phases.reduce((s, p) => s + p.tasks.reduce((s2, t) => s2 + (t.habits || []).length, 0), 0);
    toast.success(`Imported ${parsedResult.phases.length} phases, ${totalTasks} tasks, ${totalTodos} todos, ${totalHabitsAll} habits!`);
    setParsedResult(null);
    setAiResponseText('');
    setPromptGoal(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 relative overflow-hidden">
      {/* Decorative circles */}
      <div className="section-circle circle-violet w-80 h-80 -top-20 -left-20" />
      <div className="section-circle circle-violet w-36 h-36 bottom-20 -right-12 opacity-[0.06]" />
      <div className="circle-ring w-28 h-28 top-40 right-4" style={{ color: 'hsl(270 60% 60%)' }} />
      <div className="circle-ring-filled w-10 h-10 bottom-40 left-8" style={{ color: 'hsl(270 60% 60%)' }} />

      {/* Header */}
      <div className="flex items-center justify-between relative z-10">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Goals</h1>
          <p className="text-muted-foreground mt-0.5 text-xs md:text-sm">
            {goals.length} goal{goals.length !== 1 ? 's' : ''} active
          </p>
        </div>
        <Dialog open={showNewGoal} onOpenChange={setShowNewGoal}>
          <DialogTrigger asChild>
            <Button className="font-semibold">
              <Plus className="h-4 w-4 mr-2" /> New Goal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Create New Goal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm text-muted-foreground uppercase tracking-wider font-medium">Goal Title</label>
                <Input value={newGoal.title} onChange={e => setNewGoal({ ...newGoal, title: e.target.value })} placeholder="e.g., Learn Spanish" className="mt-1" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground uppercase tracking-wider font-medium">Description</label>
                <Textarea value={newGoal.description} onChange={e => setNewGoal({ ...newGoal, description: e.target.value })} placeholder="What does this goal involve?" className="mt-1" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground uppercase tracking-wider font-medium">End Goal Vision</label>
                <Textarea value={newGoal.endGoal} onChange={e => setNewGoal({ ...newGoal, endGoal: e.target.value })} placeholder="What does success look like?" className="mt-1" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground uppercase tracking-wider font-medium">Deadline</label>
                <Input type="date" value={newGoal.deadline} onChange={e => setNewGoal({ ...newGoal, deadline: e.target.value })} className="mt-1" />
              </div>
              <Button onClick={handleCreateGoal} className="w-full font-semibold">Create Goal</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Goals List */}
      {goals.length === 0 ? (
        <Card className="border-dashed border-2 border-primary/20">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Target className="h-16 w-16 text-primary/30 mb-4" />
            <p className="text-muted-foreground text-lg">No goals yet. Create your first goal to begin!</p>
          </CardContent>
        </Card>
      ) : (
        goals.map((goal) => {
          const progress = calculateGoalProgress(goal);
          const isExpanded = expandedGoals.has(goal.id);
          const goalDays = getDaysRemaining(goal.deadline);
          return (
            <Card key={goal.id} className={`shadow-sm ${getUrgencyClass(goalDays)}`}>
              <Collapsible open={isExpanded} onOpenChange={() => toggle(expandedGoals, goal.id, setExpandedGoals)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isExpanded ? <ChevronDown className="h-5 w-5 text-primary" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                        <div>
                          <CardTitle className="text-lg">{goal.title}</CardTitle>
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
                  <CardContent className="pt-0 space-y-4">
                    <div className="h-px bg-border" />
                    {/* End Goal */}
                    <div className="p-3 rounded-lg bg-accent/50">
                      <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1 font-medium">End Goal Vision</p>
                      <p className="text-sm">{goal.endGoal}</p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => setAddPhaseGoalId(goal.id)}>
                        <Plus className="h-3 w-3 mr-1" /> Add Phase
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setPromptGoal(goal); }}>
                        <Sparkles className="h-3 w-3 mr-1" /> AI Prompt
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive ml-auto" onClick={() => deleteGoal(goal.id)}>
                        <Trash2 className="h-3 w-3 mr-1" /> Delete
                      </Button>
                    </div>

                    {/* Phases */}
                    {goal.phases.map(phase => {
                      const phaseProgress = calculatePhaseProgress(phase);
                      const phaseExpanded = expandedPhases.has(phase.id);
                      return (
                        <Collapsible key={phase.id} open={phaseExpanded} onOpenChange={() => toggle(expandedPhases, phase.id, setExpandedPhases)}>
                          <div className="ml-4 border-l-2 border-primary/20 pl-4">
                            <CollapsibleTrigger asChild>
                              <div className="flex items-center justify-between cursor-pointer hover:bg-accent/30 p-2 rounded-lg transition-colors">
                                <div className="flex items-center gap-2">
                                  {phaseExpanded ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                                  <span className="font-semibold">{phase.title}</span>
                                  <ProgressRing value={phaseProgress} size={28} strokeWidth={2.5} />
                                  <DeadlineBadge deadline={phase.deadline} />
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); setAddTaskTarget({ goalId: goal.id, phaseId: phase.id }); }}>
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
                                    <div className="ml-4 border-l border-border pl-3 mt-2">
                                      <CollapsibleTrigger asChild>
                                        <div className="flex items-center justify-between cursor-pointer hover:bg-accent/20 p-1.5 rounded-lg transition-colors">
                                          <div className="flex items-center gap-2">
                                            {taskExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                            <span className="text-sm">{task.title}</span>
                                            <Badge className={`text-xs ${statusColors[status]}`}>{statusLabels[status]}</Badge>
                                            <span className="text-xs text-muted-foreground">{taskProgress}%</span>
                                            <DeadlineBadge deadline={task.deadline} />
                                          </div>
                                          <div className="flex gap-1">
                                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" title="Add to-do" onClick={(e) => { e.stopPropagation(); setAddTodoTarget({ goalId: goal.id, phaseId: phase.id, taskId: task.id }); }}>
                                              <Plus className="h-3 w-3" />
                                            </Button>
                                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" title="Add habit" onClick={(e) => { e.stopPropagation(); setAddHabitTarget({ goalId: goal.id, phaseId: phase.id, taskId: task.id }); }}>
                                              <Repeat className="h-3 w-3 text-amber" />
                                            </Button>
                                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={(e) => { e.stopPropagation(); deleteTask(goal.id, phase.id, task.id); }}>
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      </CollapsibleTrigger>
                                      <CollapsibleContent>
                                        <div className="ml-5 mt-1 space-y-1">
                                          {/* To-Dos */}
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
                                            <p className="text-xs text-muted-foreground italic">No to-dos yet</p>
                                          )}

                                          {/* Habits */}
                                          {(task.habits || []).length > 0 && (
                                            <div className="mt-2 pt-2 border-t border-border/50">
                                              <p className="text-[10px] text-amber uppercase tracking-widest font-semibold mb-1 flex items-center gap-1">
                                                <Repeat className="h-3 w-3" /> Habits & Regimens
                                              </p>
                                              {(task.habits || []).map(habit => (
                                                <div key={habit.id} className="flex items-center gap-2 group py-0.5">
                                                  <ToggleLeft className={`h-3.5 w-3.5 flex-shrink-0 cursor-pointer ${habit.active ? 'text-amber' : 'text-muted-foreground'}`} onClick={() => toggleHabit(goal.id, phase.id, task.id, habit.id)} />
                                                  <span className={`text-sm ${!habit.active ? 'line-through text-muted-foreground' : ''}`}>{habit.title}</span>
                                                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-amber/10 border-amber/30 text-amber">{habit.frequency}</Badge>
                                                  {habit.target && <span className="text-[10px] text-muted-foreground">{habit.target}</span>}
                                                  <Button size="sm" variant="ghost" className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => deleteHabit(goal.id, phase.id, task.id, habit.id)}>
                                                    <Trash2 className="h-3 w-3" />
                                                  </Button>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </CollapsibleContent>
                                    </div>
                                  </Collapsible>
                                );
                              })}
                              {phase.tasks.length === 0 && (
                                <p className="text-xs text-muted-foreground italic ml-4 mt-2">No tasks yet</p>
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
          );
        })
      )}

      {/* Add Phase Dialog */}
      <Dialog open={!!addPhaseGoalId} onOpenChange={() => setAddPhaseGoalId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-xl font-bold">Add Phase</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <Input placeholder="Phase title" value={newPhase.title} onChange={e => setNewPhase({ ...newPhase, title: e.target.value })} />
            <Textarea placeholder="Description" value={newPhase.description} onChange={e => setNewPhase({ ...newPhase, description: e.target.value })} />
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Deadline</label>
              <Input type="date" value={newPhase.deadline} onChange={e => setNewPhase({ ...newPhase, deadline: e.target.value })} className="mt-1" />
            </div>
            <Button onClick={handleAddPhase} className="w-full font-semibold">Add Phase</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Task Dialog */}
      <Dialog open={!!addTaskTarget} onOpenChange={() => setAddTaskTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-xl font-bold">Add Task</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <Input placeholder="Task title" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} />
            <Textarea placeholder="Description" value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} />
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Deadline</label>
              <Input type="date" value={newTask.deadline} onChange={e => setNewTask({ ...newTask, deadline: e.target.value })} className="mt-1" />
            </div>
            <Button onClick={handleAddTask} className="w-full font-semibold">Add Task</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Todo Dialog */}
      <Dialog open={!!addTodoTarget} onOpenChange={() => setAddTodoTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-xl font-bold">Add To-Do</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <Input placeholder="To-do item" value={newTodoTitle} onChange={e => setNewTodoTitle(e.target.value)} />
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Deadline (optional)</label>
              <Input type="date" value={newTodoDeadline} onChange={e => setNewTodoDeadline(e.target.value)} className="mt-1" />
            </div>
            <Button onClick={handleAddTodo} className="w-full font-semibold">Add To-Do</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Habit Dialog */}
      <Dialog open={!!addHabitTarget} onOpenChange={() => setAddHabitTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Repeat className="h-5 w-5 text-amber" /> Add Habit
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Habit</label>
              <Input placeholder="e.g., Eat 200g protein" value={newHabit.title} onChange={e => setNewHabit({ ...newHabit, title: e.target.value })} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Frequency</label>
                <Input placeholder="e.g., daily, 3x/week" value={newHabit.frequency} onChange={e => setNewHabit({ ...newHabit, frequency: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Target (optional)</label>
                <Input placeholder="e.g., 200g, 30 min" value={newHabit.target} onChange={e => setNewHabit({ ...newHabit, target: e.target.value })} className="mt-1" />
              </div>
            </div>
            <Button onClick={handleAddHabit} className="w-full font-semibold">Add Habit</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Prompt Dialog */}
      <Dialog open={!!promptGoal} onOpenChange={(open) => { if (!open) { setPromptGoal(null); setParsedResult(null); setAiResponseText(''); setPromptTab('prompt'); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">AI Goal Builder</DialogTitle>
          </DialogHeader>
          {promptGoal && (
            <Tabs value={promptTab} onValueChange={setPromptTab} className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="w-full">
                <TabsTrigger value="prompt" className="flex-1 gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> 1. Copy Prompt
                </TabsTrigger>
                <TabsTrigger value="import" className="flex-1 gap-1.5">
                  <Upload className="h-3.5 w-3.5" /> 2. Import Response
                </TabsTrigger>
              </TabsList>

              <TabsContent value="prompt" className="flex-1 overflow-auto space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  Copy this prompt → paste into ChatGPT / Claude / Gemini → copy the response → switch to Import tab.
                </p>
                <div className="bg-accent/50 p-4 rounded-lg whitespace-pre-wrap max-h-72 overflow-auto font-mono text-xs">
                  {generateAIPrompt(promptGoal)}
                </div>
                <Button onClick={() => copyPrompt(promptGoal)} className="w-full font-semibold">
                  <Copy className="h-4 w-4 mr-2" /> Copy Prompt
                </Button>
              </TabsContent>

              <TabsContent value="import" className="flex-1 overflow-auto space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  Paste the AI's response below. It should follow the PHASE / TASK / TODO format.
                </p>
                <Textarea
                  value={aiResponseText}
                  onChange={e => setAiResponseText(e.target.value)}
                  placeholder={`PHASE: Foundation | Research and planning | 2026-04-15\n  TASK: Research competitors | Analyze top 5 | 2026-04-01\n    TODO: List features | 2026-03-20\n    TODO: Write comparison | 2026-03-25`}
                  className="font-mono text-xs min-h-[120px]"
                />
                <Button
                  onClick={handleParseResponse}
                  disabled={!aiResponseText.trim()}
                  variant="outline"
                  className="w-full"
                >
                  Parse Response
                </Button>

                {parsedResult && parsedResult.warnings.length > 0 && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-1">
                    {parsedResult.warnings.map((w, i) => (
                      <p key={i} className="text-xs text-destructive flex items-center gap-1.5">
                        <AlertCircle className="h-3 w-3 flex-shrink-0" /> {w}
                      </p>
                    ))}
                  </div>
                )}

                {parsedResult && parsedResult.phases.length > 0 && (
                  <div className="bg-accent/30 rounded-lg p-3 space-y-3 max-h-60 overflow-auto">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Preview</p>
                    {parsedResult.phases.map((phase, pi) => (
                      <div key={pi} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-primary">▸ {phase.title}</span>
                          <Badge variant="outline" className="text-xs">{phase.deadline}</Badge>
                        </div>
                        {phase.tasks.map((task, ti) => (
                          <div key={ti} className="ml-4 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-teal font-medium">▸ {task.title}</span>
                              <span className="text-xs text-muted-foreground">{task.deadline}</span>
                            </div>
                            {task.todos.map((todo, tdi) => (
                              <div key={tdi} className="ml-4 flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">☐ {todo.title}</span>
                                <span className="text-xs text-muted-foreground/60">{todo.deadline}</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {parsedResult && parsedResult.phases.length > 0 && (
                  <Button onClick={handleBulkImport} className="w-full font-semibold">
                    <Upload className="h-4 w-4 mr-2" />
                    Import All — {parsedResult.phases.length} phases, {parsedResult.phases.reduce((s, p) => s + p.tasks.length, 0)} tasks, {parsedResult.phases.reduce((s, p) => s + p.tasks.reduce((s2, t) => s2 + t.todos.length, 0), 0)} todos
                  </Button>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
