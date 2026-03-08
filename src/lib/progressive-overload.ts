import { ExerciseConfig, ExerciseLog, SetLog, WorkoutSession, CompoundExercise, PersonalRecord } from '@/types/workout';

export function calculateVolumeLoad(sets: SetLog[]): number {
  return sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
}

export function calculateSetVolume(set: SetLog): number {
  return set.weight * set.reps;
}

export interface ProgressionSuggestion {
  type: 'increase_weight' | 'hold' | 'deload' | 'increase_reps';
  message: string;
  suggestedWeight?: number;
  suggestedReps?: number;
}

export function getProgressionSuggestion(
  config: ExerciseConfig,
  recentSessions: ExerciseLog[]
): ProgressionSuggestion {
  if (recentSessions.length === 0) {
    return { type: 'hold', message: 'No data yet. Complete your first session!' };
  }

  const latest = recentSessions[0];
  const allSetsHitMax = latest.sets.every(s => s.reps >= config.repRangeMax);
  const allSetsHitMin = latest.sets.every(s => s.reps >= config.repRangeMin);
  const avgRpe = latest.sets.reduce((s, set) => s + set.rpe, 0) / latest.sets.length;

  // Check for stalling (2+ sessions where not hitting min reps)
  const stalledSessions = recentSessions.slice(0, 3).filter(session => {
    return session.sets.some(s => s.reps < config.repRangeMin);
  });

  if (stalledSessions.length >= 2) {
    const deloadWeight = Math.round(config.currentWeight * 0.55 / 5) * 5;
    return {
      type: 'deload',
      message: `Stalling detected. Deload to ${deloadWeight} lbs for a recovery week, then build back up.`,
      suggestedWeight: deloadWeight,
    };
  }

  // All sets hit max reps → increase weight
  if (allSetsHitMax && avgRpe <= 4) {
    const newWeight = config.currentWeight + config.weightIncrement;
    return {
      type: 'increase_weight',
      message: `All sets at ${config.repRangeMax} reps! Increase to ${newWeight} lbs and reset to ${config.repRangeMin} reps.`,
      suggestedWeight: newWeight,
      suggestedReps: config.repRangeMin,
    };
  }

  // Hitting minimum but not max → increase reps
  if (allSetsHitMin) {
    return {
      type: 'increase_reps',
      message: `Good work! Try to add 1 rep per set next session. Target: ${Math.min(latest.sets[0].reps + 1, config.repRangeMax)} reps.`,
      suggestedReps: Math.min(latest.sets[0].reps + 1, config.repRangeMax),
    };
  }

  // Not hitting minimum → hold
  return {
    type: 'hold',
    message: `Keep at ${config.currentWeight} lbs. Focus on hitting ${config.repRangeMin} reps on all sets.`,
  };
}

export function getExerciseHistory(
  sessions: WorkoutSession[],
  exercise: CompoundExercise
): ExerciseLog[] {
  return sessions
    .flatMap(s => s.exercises.filter(e => e.exercise === exercise))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPersonalRecords(sessions: WorkoutSession[]): PersonalRecord[] {
  const prMap = new Map<CompoundExercise, PersonalRecord>();

  for (const session of sessions) {
    for (const ex of session.exercises) {
      for (const set of ex.sets) {
        const volume = set.weight * set.reps;
        const current = prMap.get(ex.exercise);
        if (!current || set.weight > current.weight || (set.weight === current.weight && set.reps > current.reps)) {
          prMap.set(ex.exercise, {
            exercise: ex.exercise,
            weight: set.weight,
            reps: set.reps,
            date: ex.date,
            volumeLoad: volume,
          });
        }
      }
    }
  }

  return Array.from(prMap.values());
}

export function getWeeklyVolume(sessions: WorkoutSession[]): { week: string; volume: number }[] {
  const weekMap = new Map<string, number>();
  
  for (const session of sessions) {
    const date = new Date(session.date);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekKey = weekStart.toISOString().split('T')[0];
    
    const sessionVolume = session.exercises.reduce(
      (sum, ex) => sum + calculateVolumeLoad(ex.sets), 0
    );
    
    weekMap.set(weekKey, (weekMap.get(weekKey) || 0) + sessionVolume);
  }

  return Array.from(weekMap.entries())
    .map(([week, volume]) => ({ week, volume }))
    .sort((a, b) => a.week.localeCompare(b.week));
}
