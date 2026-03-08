import { useState } from 'react';
import { useGoals } from '@/hooks/useGoals';
import { Goal, calculateGoalProgress, calculatePhaseProgress, calculateTaskProgress, deriveTaskStatus } from '@/types/goals';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, ChevronDown, ChevronRight, Trash2, Target, Copy, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  not_started: 'bg-muted text-muted-foreground',
  in_progress: 'bg-primary/20 text-primary',
  complete: 'bg-secondary/20 text-secondary',
};

const statusLabels: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  complete: 'Complete',
};

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

  // Add phase/task/todo dialogs
  const [addPhaseGoalId, setAddPhaseGoalId] = useState<string | null>(null);
  const [newPhase, setNewPhase] = useState({ title: '', description: '', deadline: '' });
  const [addTaskTarget, setAddTaskTarget] = useState<{ goalId: string; phaseId: string } | null>(null);
  const [newTask, setNewTask] = useState({ title: '', description: '' });
  const [addTodoTarget, setAddTodoTarget] = useState<{ goalId: string; phaseId: string; taskId: string } | null>(null);
  const [newTodoTitle, setNewTodoTitle] = useState('');

  // AI Prompt dialog
  const [promptGoal, setPromptGoal] = useState<Goal | null>(null);

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
    addTask(addTaskTarget.goalId, addTaskTarget.phaseId, newTask.title, newTask.description);
    setNewTask({ title: '', description: '' });
    setAddTaskTarget(null);
  };

  const handleAddTodo = () => {
    if (!addTodoTarget || !newTodoTitle.trim()) return;
    addToDo(addTodoTarget.goalId, addTodoTarget.phaseId, addTodoTarget.taskId, newTodoTitle);
    setNewTodoTitle('');
    setAddTodoTarget(null);
  };

  const generateAIPrompt = (goal: Goal) => {
    const phaseList = goal.phases.map((p, i) => `Phase ${i + 1}: "${p.title}" - ${p.description}`).join('\n');
    return `I have a goal: "${goal.title}"
End goal: "${goal.endGoal}"
Description: ${goal.description}

I've broken it into these phases:
${phaseList || '(No phases yet - add phases first!)'}

For each phase, please generate:
1. A list of specific, actionable Tasks (3-7 per phase)
2. For each Task, a list of granular To-Do items (2-5 per task)

Format your response as:
Phase: [phase name]
  Task: [task name] - [brief description]
    - To-Do: [specific action item]
    - To-Do: [specific action item]

Keep tasks concrete and measurable. To-dos should be small enough to complete in one sitting.`;
  };

  const copyPrompt = (goal: Goal) => {
    navigator.clipboard.writeText(generateAIPrompt(goal));
    toast.success('AI prompt copied to clipboard!');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-medieval text-3xl gradient-alien-text">Goals</h1>
          <p className="text-muted-foreground mt-1">
            {goals.length} goal{goals.length !== 1 ? 's' : ''} active
          </p>
        </div>
        <Dialog open={showNewGoal} onOpenChange={setShowNewGoal}>
          <DialogTrigger asChild>
            <Button className="gradient-alien text-primary-foreground font-semibold glow-green">
              <Plus className="h-4 w-4 mr-2" /> New Goal
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-medieval gradient-alien-text text-xl">Create New Goal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm text-muted-foreground">Goal Title</label>
                <Input value={newGoal.title} onChange={e => setNewGoal({ ...newGoal, title: e.target.value })} placeholder="e.g., Learn Spanish" className="mt-1" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Description</label>
                <Textarea value={newGoal.description} onChange={e => setNewGoal({ ...newGoal, description: e.target.value })} placeholder="What does this goal involve?" className="mt-1" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">End Goal Vision</label>
                <Textarea value={newGoal.endGoal} onChange={e => setNewGoal({ ...newGoal, endGoal: e.target.value })} placeholder="What does success look like?" className="mt-1" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Deadline (optional)</label>
                <Input type="date" value={newGoal.deadline} onChange={e => setNewGoal({ ...newGoal, deadline: e.target.value })} className="mt-1" />
              </div>
              <Button onClick={handleCreateGoal} className="w-full gradient-alien text-primary-foreground font-semibold">Create Goal</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Goals List */}
      {goals.length === 0 ? (
        <Card className="border-dashed border-2 border-primary/30">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-primary/50 mb-4" />
            <p className="text-muted-foreground text-lg">No goals yet. Create your first goal to get started!</p>
          </CardContent>
        </Card>
      ) : (
        goals.map(goal => {
          const progress = calculateGoalProgress(goal);
          const isExpanded = expandedGoals.has(goal.id);
          return (
            <Card key={goal.id} className="border-border overflow-hidden">
              <Collapsible open={isExpanded} onOpenChange={() => toggle(expandedGoals, goal.id, setExpandedGoals)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isExpanded ? <ChevronDown className="h-5 w-5 text-primary" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                        <div>
                          <CardTitle className="text-lg">{goal.title}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-sm font-medium text-primary">{progress}%</span>
                          <Progress value={progress} className="w-24 h-2 mt-1" />
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-4">
                    {/* End Goal */}
                    <div className="p-3 rounded-md bg-muted/30 border border-border">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">End Goal Vision</p>
                      <p className="text-sm">{goal.endGoal}</p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => setAddPhaseGoalId(goal.id)}>
                        <Plus className="h-3 w-3 mr-1" /> Add Phase
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setPromptGoal(goal); }}>
                        <Sparkles className="h-3 w-3 mr-1" /> Generate AI Prompt
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
                          <div className="ml-4 border-l-2 border-primary/30 pl-4">
                            <CollapsibleTrigger asChild>
                              <div className="flex items-center justify-between cursor-pointer hover:bg-muted/20 p-2 rounded-md transition-colors">
                                <div className="flex items-center gap-2">
                                  {phaseExpanded ? <ChevronDown className="h-4 w-4 text-secondary" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                                  <span className="font-medium">{phase.title}</span>
                                  <Badge variant="outline" className="text-xs">{phaseProgress}%</Badge>
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
                                    <div className="ml-4 border-l border-muted pl-3 mt-2">
                                      <CollapsibleTrigger asChild>
                                        <div className="flex items-center justify-between cursor-pointer hover:bg-muted/10 p-1.5 rounded transition-colors">
                                          <div className="flex items-center gap-2">
                                            {taskExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                            <span className="text-sm">{task.title}</span>
                                            <Badge className={`text-xs ${statusColors[status]}`}>{statusLabels[status]}</Badge>
                                            <span className="text-xs text-muted-foreground">{taskProgress}%</span>
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
                                              <Button size="sm" variant="ghost" className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => deleteToDo(goal.id, phase.id, task.id, todo.id)}>
                                                <Trash2 className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          ))}
                                          {task.todos.length === 0 && (
                                            <p className="text-xs text-muted-foreground italic">No to-dos yet</p>
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
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Add Phase</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <Input placeholder="Phase title" value={newPhase.title} onChange={e => setNewPhase({ ...newPhase, title: e.target.value })} />
            <Textarea placeholder="Description" value={newPhase.description} onChange={e => setNewPhase({ ...newPhase, description: e.target.value })} />
            <Input type="date" value={newPhase.deadline} onChange={e => setNewPhase({ ...newPhase, deadline: e.target.value })} />
            <Button onClick={handleAddPhase} className="w-full gradient-alien text-primary-foreground">Add Phase</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Task Dialog */}
      <Dialog open={!!addTaskTarget} onOpenChange={() => setAddTaskTarget(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <Input placeholder="Task title" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} />
            <Textarea placeholder="Description" value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} />
            <Button onClick={handleAddTask} className="w-full gradient-alien text-primary-foreground">Add Task</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add ToDo Dialog */}
      <Dialog open={!!addTodoTarget} onOpenChange={() => setAddTodoTarget(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Add To-Do</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <Input placeholder="To-do item" value={newTodoTitle} onChange={e => setNewTodoTitle(e.target.value)} />
            <Button onClick={handleAddTodo} className="w-full gradient-alien text-primary-foreground">Add To-Do</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Prompt Dialog */}
      <Dialog open={!!promptGoal} onOpenChange={() => setPromptGoal(null)}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-medieval gradient-alien-text">AI Prompt Generator</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              Copy this prompt and paste it into your favorite AI assistant (ChatGPT, Claude, etc.) to generate Tasks and To-Dos for your goal phases.
            </p>
            {promptGoal && promptGoal.phases.length === 0 && (
              <div className="p-3 rounded bg-destructive/10 border border-destructive/30 text-sm">
                ⚠️ Add phases to your goal first, then generate the prompt!
              </div>
            )}
            <pre className="p-4 rounded-md bg-muted/40 border border-border text-sm whitespace-pre-wrap max-h-80 overflow-auto">
              {promptGoal && generateAIPrompt(promptGoal)}
            </pre>
            <Button onClick={() => promptGoal && copyPrompt(promptGoal)} className="w-full gradient-alien text-primary-foreground">
              <Copy className="h-4 w-4 mr-2" /> Copy Prompt
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
