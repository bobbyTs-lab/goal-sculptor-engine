import { useState, useCallback } from 'react';
import { Goal, Phase, Task, ToDo } from '@/types/goals';
import { loadGoals, saveGoals, generateId } from '@/lib/storage';

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>(() => loadGoals());

  const persist = useCallback((updated: Goal[]) => {
    setGoals(updated);
    saveGoals(updated);
  }, []);

  const addGoal = useCallback((title: string, description: string, endGoal: string, deadline?: string) => {
    const newGoal: Goal = {
      id: generateId(),
      title,
      description,
      endGoal,
      deadline,
      phases: [],
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

  const addTask = useCallback((goalId: string, phaseId: string, title: string, description: string) => {
    persist(goals.map(g => {
      if (g.id !== goalId) return g;
      return {
        ...g,
        phases: g.phases.map(p => {
          if (p.id !== phaseId) return p;
          const task: Task = {
            id: generateId(), title, description, status: 'not_started',
            todos: [], order: p.tasks.length,
          };
          return { ...p, tasks: [...p.tasks, task] };
        }),
      };
    }));
  }, [goals, persist]);

  const addToDo = useCallback((goalId: string, phaseId: string, taskId: string, title: string) => {
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
              const todo: ToDo = { id: generateId(), title, done: false, order: t.todos.length };
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

  return {
    goals, addGoal, updateGoal, deleteGoal,
    addPhase, deletePhase,
    addTask, deleteTask,
    addToDo, toggleToDo, deleteToDo,
  };
}
