import { useState, useCallback } from 'react';
import { WorkoutSession, ExerciseConfig, ExerciseLog, getExerciseLabel, CustomExercise } from '@/types/workout';
import { loadSessions, saveSessions, loadExerciseConfigs, saveExerciseConfigs, generateId } from '@/lib/storage';
import { toast } from 'sonner';

export function useWorkouts(customExercises: CustomExercise[] = []) {
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
    const bumped: string[] = [];
    const updatedConfigs = configs.map(config => {
      const exerciseLog = session.exercises.find(e => e.exercise === config.exercise);
      if (!exerciseLog) return config;

      const allHitMax = exerciseLog.sets.every(s => s.reps >= config.repRangeMax);
      const avgRpe = exerciseLog.sets.reduce((s, set) => s + set.rpe, 0) / exerciseLog.sets.length;

      if (allHitMax && avgRpe <= 4) {
        bumped.push(config.exercise);
        return { ...config, currentWeight: config.currentWeight + config.weightIncrement };
      }
      return config;
    });
    persistConfigs(updatedConfigs);

    if (bumped.length > 0) {
      const labels = bumped.map(e => getExerciseLabel(e, customExercises)).join(', ');
      toast.success(`Weight increased for next session: ${labels} 📈`);
    }

    return newSession;
  }, [sessions, configs, customExercises, persistSessions, persistConfigs]);

  const deleteSession = useCallback((id: string) => {
    persistSessions(sessions.filter(s => s.id !== id));
  }, [sessions, persistSessions]);

  const updateConfig = useCallback((exercise: string, updates: Partial<ExerciseConfig>) => {
    persistConfigs(configs.map(c => c.exercise === exercise ? { ...c, ...updates } : c));
  }, [configs, persistConfigs]);

  const addConfig = useCallback((config: ExerciseConfig) => {
    if (configs.some(c => c.exercise === config.exercise)) return;
    persistConfigs([...configs, config]);
  }, [configs, persistConfigs]);

  const deleteConfig = useCallback((exercise: string) => {
    persistConfigs(configs.filter(c => c.exercise !== exercise));
  }, [configs, persistConfigs]);

  return { sessions, configs, addSession, deleteSession, updateConfig, addConfig, deleteConfig };
}
