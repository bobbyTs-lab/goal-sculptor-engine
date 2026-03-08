import { useState, useCallback } from 'react';
import { WorkoutSession, ExerciseConfig, ExerciseLog } from '@/types/workout';
import { loadSessions, saveSessions, loadExerciseConfigs, saveExerciseConfigs, generateId } from '@/lib/storage';

export function useWorkouts() {
  const [sessions, setSessions] = useState<WorkoutSession[]>(() => loadSessions());
  const [configs, setConfigs] = useState<ExerciseConfig[]>(() => loadExerciseConfigs());

  const persistSessions = useCallback((updated: WorkoutSession[]) => {
    setSessions(updated);
    saveSessions(updated);
  }, []);

  const persistConfigs = useCallback((updated: ExerciseConfig[]) => {
    setConfigs(updated);
    saveExerciseConfigs(updated);
  }, []);

  const addSession = useCallback((session: Omit<WorkoutSession, 'id'>) => {
    const newSession = { ...session, id: generateId() };
    persistSessions([...sessions, newSession]);
    
    // Auto-update configs based on performance
    const updatedConfigs = configs.map(config => {
      const exerciseLog = session.exercises.find(e => e.exercise === config.exercise);
      if (!exerciseLog) return config;
      
      const allHitMax = exerciseLog.sets.every(s => s.reps >= config.repRangeMax);
      const avgRpe = exerciseLog.sets.reduce((s, set) => s + set.rpe, 0) / exerciseLog.sets.length;
      
      if (allHitMax && avgRpe <= 4) {
        return { ...config, currentWeight: config.currentWeight + config.weightIncrement };
      }
      return config;
    });
    persistConfigs(updatedConfigs);
    
    return newSession;
  }, [sessions, configs, persistSessions, persistConfigs]);

  const updateConfig = useCallback((exercise: string, updates: Partial<ExerciseConfig>) => {
    persistConfigs(configs.map(c => c.exercise === exercise ? { ...c, ...updates } : c));
  }, [configs, persistConfigs]);

  return { sessions, configs, addSession, updateConfig };
}
