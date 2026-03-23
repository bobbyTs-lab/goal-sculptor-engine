import { useState, useCallback } from 'react';
import { Goal, Phase, Task, ToDo, Habit, TaskNote, GoalDomain } from '@/types/goals';
import { loadGoals, saveGoals, generateId, GoalTemplate, loadGoalTemplates, saveGoalTemplates } from '@/lib/storage';

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>(() => loadGoals());

  const persist = useCallback((updated: Goal[]) => {
    setGoals(updated);
    saveGoals(updated);
  }, []);

  const DEFAULT_PHASES = [
    { title: 'Foundation', description: 'Research, planning, and initial setup — lay the groundwork.' },
    { title: 'Development', description: 'Build core skills, systems, and habits — do the main work.' },
    { title: 'Refinement', description: 'Optimize, iterate, and fix gaps — sharpen what you\'ve built.' },
    { title: 'Mastery', description: 'Sustain, teach, and push limits — own the outcome.' },
  ];

  const addGoal = useCallback((title: string, description: string, endGoal: string, deadline?: string, domain?: GoalDomain) => {
    const phases: Phase[] = DEFAULT_PHASES.map((p, i) => ({
      id: generateId(),
      title: p.title,
      description: p.description,
      tasks: [],
      order: i,
    }));
    const newGoal: Goal = {
      id: generateId(),
      title,
      description,
      endGoal,
      deadline,
      domain,
      phases,
      createdAt: new Date().toISOString(),
    };
    persist([...goals, newGoal]);
    return newGoal;
  }, [goals, persist]);

  const updateGoal = useCallback((id: string, updates: Partial<Goal>) => {
    persist(goals.map(g => g.id === id ? { ...g, ...updates } : g));
  }, [goals, persist]);

  const deleteGoal = useCallback((id: string) => {
    persist(goals.filter(g => g.id !== id));
  }, [goals, persist]);

  const addPhase = useCallback((goalId: string, title: string, description: string, deadline?: string) => {
    persist(goals.map(g => {
      if (g.id !== goalId) return g;
      const phase: Phase = {
        id: generateId(), title, description, deadline, tasks: [],
        order: g.phases.length,
      };
      return { ...g, phases: [...g.phases, phase] };
    }));
  }, [goals, persist]);

  const addTask = useCallback((goalId: string, phaseId: string, title: string, description: string, deadline?: string) => {
    persist(goals.map(g => {
      if (g.id !== goalId) return g;
      return {
        ...g,
        phases: g.phases.map(p => {
          if (p.id !== phaseId) return p;
          const task: Task = {
            id: generateId(), title, description, status: 'not_started',
            todos: [], habits: [], order: p.tasks.length, deadline,
          };
          return { ...p, tasks: [...p.tasks, task] };
        }),
      };
    }));
  }, [goals, persist]);

  const addHabit = useCallback((goalId: string, phaseId: string, taskId: string, title: string, frequency: string, target?: string) => {
    persist(goals.map(g => {
      if (g.id !== goalId) return g;
      return {
        ...g,
        phases: g.phases.map(p => {
          if (p.id !== phaseId) return p;
          return {
            ...p,
            tasks: p.tasks.map(t => {
              if (t.id !== taskId) return t;
              const habit: Habit = { id: generateId(), title, frequency, target, active: true };
              return { ...t, habits: [...(t.habits || []), habit] };
            }),
          };
        }),
      };
    }));
  }, [goals, persist]);

  const toggleHabit = useCallback((goalId: string, phaseId: string, taskId: string, habitId: string) => {
    persist(goals.map(g => {
      if (g.id !== goalId) return g;
      return {
        ...g,
        phases: g.phases.map(p => {
          if (p.id !== phaseId) return p;
          return {
            ...p,
            tasks: p.tasks.map(t => {
              if (t.id !== taskId) return t;
              return {
                ...t,
                habits: (t.habits || []).map(h =>
                  h.id === habitId ? { ...h, active: !h.active } : h
                ),
              };
            }),
          };
        }),
      };
    }));
  }, [goals, persist]);

  const deleteHabit = useCallback((goalId: string, phaseId: string, taskId: string, habitId: string) => {
    persist(goals.map(g => {
      if (g.id !== goalId) return g;
      return {
        ...g,
        phases: g.phases.map(p => {
          if (p.id !== phaseId) return p;
          return {
            ...p,
            tasks: p.tasks.map(t => {
              if (t.id !== taskId) return t;
              return { ...t, habits: (t.habits || []).filter(h => h.id !== habitId) };
            }),
          };
        }),
      };
    }));
  }, [goals, persist]);

  const addToDo = useCallback((goalId: string, phaseId: string, taskId: string, title: string, deadline?: string) => {
    persist(goals.map(g => {
      if (g.id !== goalId) return g;
      return {
        ...g,
        phases: g.phases.map(p => {
          if (p.id !== phaseId) return p;
          return {
            ...p,
            tasks: p.tasks.map(t => {
              if (t.id !== taskId) return t;
              const todo: ToDo = { id: generateId(), title, done: false, order: t.todos.length, deadline };
              return { ...t, todos: [...t.todos, todo] };
            }),
          };
        }),
      };
    }));
  }, [goals, persist]);

  const toggleToDo = useCallback((goalId: string, phaseId: string, taskId: string, todoId: string) => {
    persist(goals.map(g => {
      if (g.id !== goalId) return g;
      return {
        ...g,
        phases: g.phases.map(p => {
          if (p.id !== phaseId) return p;
          return {
            ...p,
            tasks: p.tasks.map(t => {
              if (t.id !== taskId) return t;
              return {
                ...t,
                todos: t.todos.map(td =>
                  td.id === todoId ? { ...td, done: !td.done } : td
                ),
              };
            }),
          };
        }),
      };
    }));
  }, [goals, persist]);

  const deletePhase = useCallback((goalId: string, phaseId: string) => {
    persist(goals.map(g => {
      if (g.id !== goalId) return g;
      return { ...g, phases: g.phases.filter(p => p.id !== phaseId) };
    }));
  }, [goals, persist]);

  const deleteTask = useCallback((goalId: string, phaseId: string, taskId: string) => {
    persist(goals.map(g => {
      if (g.id !== goalId) return g;
      return {
        ...g,
        phases: g.phases.map(p => {
          if (p.id !== phaseId) return p;
          return { ...p, tasks: p.tasks.filter(t => t.id !== taskId) };
        }),
      };
    }));
  }, [goals, persist]);

  const deleteToDo = useCallback((goalId: string, phaseId: string, taskId: string, todoId: string) => {
    persist(goals.map(g => {
      if (g.id !== goalId) return g;
      return {
        ...g,
        phases: g.phases.map(p => {
          if (p.id !== phaseId) return p;
          return {
            ...p,
            tasks: p.tasks.map(t => {
              if (t.id !== taskId) return t;
              return { ...t, todos: t.todos.filter(td => td.id !== todoId) };
            }),
          };
        }),
      };
    }));
  }, [goals, persist]);

  const addNote = useCallback((goalId: string, phaseId: string, taskId: string, text: string) => {
    persist(goals.map(g => {
      if (g.id !== goalId) return g;
      return {
        ...g,
        phases: g.phases.map(p => {
          if (p.id !== phaseId) return p;
          return {
            ...p,
            tasks: p.tasks.map(t => {
              if (t.id !== taskId) return t;
              const note: TaskNote = { id: generateId(), text, createdAt: new Date().toISOString() };
              return { ...t, notes: [...(t.notes || []), note] };
            }),
          };
        }),
      };
    }));
  }, [goals, persist]);

  const deleteNote = useCallback((goalId: string, phaseId: string, taskId: string, noteId: string) => {
    persist(goals.map(g => {
      if (g.id !== goalId) return g;
      return {
        ...g,
        phases: g.phases.map(p => {
          if (p.id !== phaseId) return p;
          return {
            ...p,
            tasks: p.tasks.map(t => {
              if (t.id !== taskId) return t;
              return { ...t, notes: (t.notes || []).filter(n => n.id !== noteId) };
            }),
          };
        }),
      };
    }));
  }, [goals, persist]);

  const reorderPhases = useCallback((goalId: string, phaseId: string, direction: 'up' | 'down') => {
    persist(goals.map(g => {
      if (g.id !== goalId) return g;
      const idx = g.phases.findIndex(p => p.id === phaseId);
      if (idx < 0) return g;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= g.phases.length) return g;
      const phases = [...g.phases];
      [phases[idx], phases[swapIdx]] = [phases[swapIdx], phases[idx]];
      return { ...g, phases: phases.map((p, i) => ({ ...p, order: i })) };
    }));
  }, [goals, persist]);

  const reorderTasks = useCallback((goalId: string, phaseId: string, taskId: string, direction: 'up' | 'down') => {
    persist(goals.map(g => {
      if (g.id !== goalId) return g;
      return {
        ...g,
        phases: g.phases.map(p => {
          if (p.id !== phaseId) return p;
          const idx = p.tasks.findIndex(t => t.id === taskId);
          if (idx < 0) return p;
          const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
          if (swapIdx < 0 || swapIdx >= p.tasks.length) return p;
          const tasks = [...p.tasks];
          [tasks[idx], tasks[swapIdx]] = [tasks[swapIdx], tasks[idx]];
          return { ...p, tasks: tasks.map((t, i) => ({ ...t, order: i })) };
        }),
      };
    }));
  }, [goals, persist]);

  const reorderTodos = useCallback((goalId: string, phaseId: string, taskId: string, todoId: string, direction: 'up' | 'down') => {
    persist(goals.map(g => {
      if (g.id !== goalId) return g;
      return {
        ...g,
        phases: g.phases.map(p => {
          if (p.id !== phaseId) return p;
          return {
            ...p,
            tasks: p.tasks.map(t => {
              if (t.id !== taskId) return t;
              const idx = t.todos.findIndex(td => td.id === todoId);
              if (idx < 0) return t;
              const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
              if (swapIdx < 0 || swapIdx >= t.todos.length) return t;
              const todos = [...t.todos];
              [todos[idx], todos[swapIdx]] = [todos[swapIdx], todos[idx]];
              return { ...t, todos: todos.map((td, i) => ({ ...td, order: i })) };
            }),
          };
        }),
      };
    }));
  }, [goals, persist]);

  const archiveGoal = useCallback((id: string) => {
    persist(goals.map(g => g.id === id ? { ...g, archived: !g.archived } : g));
  }, [goals, persist]);

  const cloneGoal = useCallback((goalId: string) => {
    const source = goals.find(g => g.id === goalId);
    if (!source) return;
    const cloned: Goal = {
      ...source,
      id: generateId(),
      title: `${source.title} (Copy)`,
      createdAt: new Date().toISOString(),
      phases: source.phases.map(p => ({
        ...p,
        id: generateId(),
        tasks: p.tasks.map(t => ({
          ...t,
          id: generateId(),
          status: 'not_started' as const,
          notes: [],
          todos: t.todos.map(td => ({ ...td, id: generateId(), done: false })),
          habits: (t.habits || []).map(h => ({ ...h, id: generateId() })),
        })),
      })),
    };
    persist([...goals, cloned]);
    return cloned;
  }, [goals, persist]);

  const saveAsTemplate = useCallback((goalId: string) => {
    const source = goals.find(g => g.id === goalId);
    if (!source) return;
    const templates = loadGoalTemplates();
    const template: GoalTemplate = {
      id: generateId(),
      name: source.title,
      description: source.description,
      endGoal: source.endGoal,
      phases: source.phases.map(p => ({
        title: p.title,
        description: p.description,
        tasks: p.tasks.map(t => ({
          title: t.title,
          description: t.description,
          todos: t.todos.map(td => td.title),
          habits: (t.habits || []).map(h => ({ title: h.title, frequency: h.frequency, target: h.target })),
        })),
      })),
      createdAt: new Date().toISOString(),
    };
    saveGoalTemplates([...templates, template]);
    return template;
  }, [goals]);

  const createFromTemplate = useCallback((template: GoalTemplate, deadline?: string) => {
    const newGoal: Goal = {
      id: generateId(),
      title: template.name,
      description: template.description,
      endGoal: template.endGoal,
      deadline,
      createdAt: new Date().toISOString(),
      phases: template.phases.map((p, pi) => ({
        id: generateId(),
        title: p.title,
        description: p.description,
        order: pi,
        tasks: p.tasks.map((t, ti) => ({
          id: generateId(),
          title: t.title,
          description: t.description,
          status: 'not_started' as const,
          order: ti,
          todos: t.todos.map((td, tdi) => ({
            id: generateId(),
            title: td,
            done: false,
            order: tdi,
          })),
          habits: t.habits.map(h => ({
            id: generateId(),
            title: h.title,
            frequency: h.frequency,
            target: h.target,
            active: true,
          })),
        })),
      })),
    };
    persist([...goals, newGoal]);
    return newGoal;
  }, [goals, persist]);

  return {
    goals, addGoal, updateGoal, deleteGoal,
    addPhase, deletePhase,
    addTask, deleteTask,
    addToDo, toggleToDo, deleteToDo,
    addHabit, toggleHabit, deleteHabit,
    addNote, deleteNote,
    reorderPhases, reorderTasks, reorderTodos,
    archiveGoal, cloneGoal, saveAsTemplate, createFromTemplate,
  };
}
