import { ExerciseConfig, ExerciseLog, SetLog, WorkoutSession, PersonalRecord } from '@/types/workout';

export function calculateVolumeLoad(sets: SetLog[]): number {
  return sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
}

export function calculateSetVolume(set: SetLog): number {
  return set.weight * set.reps;
}

// Epley formula: e1RM = weight × (1 + reps/30)
export function estimateE1RM(weight: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

export interface ProgressionSuggestion {
  type: 'increase_weight' | 'hold' | 'deload' | 'increase_reps' | 'fatigue_warning';
  message: string;
  suggestedWeight?: number;
  suggestedReps?: number;
  e1rm?: number;
}

function getSessionAvgRpe(session: ExerciseLog): number {
  return session.sets.reduce((s, set) => s + set.rpe, 0) / session.sets.length;
}

function getBestSetE1RM(session: ExerciseLog): number {
  return Math.max(...session.sets.map(s => estimateE1RM(s.weight, s.reps)));
}

export function getProgressionSuggestion(
  config: ExerciseConfig,
  recentSessions: ExerciseLog[]
): ProgressionSuggestion {
  if (recentSessions.length === 0) {
    return { type: 'hold', message: 'No data yet. Complete your first session!' };
  }

  const latest = recentSessions[0];
  const latestMaxWeight = Math.max(...latest.sets.map(s => s.weight));
  const allSetsHitMax = latest.sets.every(s => s.reps >= config.repRangeMax);
  const allSetsHitMin = latest.sets.every(s => s.reps >= config.repRangeMin);
  const avgRpe = getSessionAvgRpe(latest);
  const e1rm = getBestSetE1RM(latest);
  const e1rmStr = e1rm > 0 ? ` (e1RM: ${e1rm} lbs)` : '';

  // ─── Already bumped check ───
  // If config weight is higher than what was lifted, a bump already happened
  if (latestMaxWeight < config.currentWeight) {
    return {
      type: 'hold',
      message: `Weight bumped to ${config.currentWeight} lbs. Hit ${config.repRangeMin}–${config.repRangeMax} reps at new weight.${e1rmStr}`,
      suggestedWeight: config.currentWeight,
      suggestedReps: config.repRangeMin,
      e1rm,
    };
  }

  // ─── Fatigue detection (RPE trending up across 3+ sessions at same weight) ───
  if (recentSessions.length >= 3) {
    const sameWeightSessions = recentSessions.slice(0, 4).filter(s =>
      Math.max(...s.sets.map(set => set.weight)) === latestMaxWeight
    );
    if (sameWeightSessions.length >= 3) {
      const rpes = sameWeightSessions.map(getSessionAvgRpe);
      // Check if RPE is consistently climbing (each session higher than the previous)
      const isClimbing = rpes.length >= 3 && rpes[0] > rpes[1] && rpes[1] > rpes[2];
      if (isClimbing && avgRpe >= 4.5) {
        const deloadWeight = Math.round(config.currentWeight * 0.6 / 5) * 5;
        return {
          type: 'fatigue_warning',
          message: `Fatigue building — RPE climbing across sessions (${rpes.slice(0, 3).map(r => r.toFixed(1)).join(' → ')}). Consider a deload to ${deloadWeight} lbs or a rest day.${e1rmStr}`,
          suggestedWeight: deloadWeight,
          e1rm,
        };
      }
    }
  }

  // ─── Stalling (2+ sessions not hitting min reps) ───
  const stalledSessions = recentSessions.slice(0, 3).filter(session =>
    session.sets.some(s => s.reps < config.repRangeMin)
  );
  if (stalledSessions.length >= 2) {
    const deloadWeight = Math.round(config.currentWeight * 0.55 / 5) * 5;
    return {
      type: 'deload',
      message: `Stalling detected. Deload to ${deloadWeight} lbs for a recovery week, then build back up.${e1rmStr}`,
      suggestedWeight: deloadWeight,
      e1rm,
    };
  }

  // ─── All sets hit max reps + RPE ≤ 4 → increase weight ───
  if (allSetsHitMax && avgRpe <= 4) {
    const newWeight = config.currentWeight + config.weightIncrement;
    return {
      type: 'increase_weight',
      message: `All sets at ${config.repRangeMax} reps (RPE ${avgRpe.toFixed(1)})! Increase to ${newWeight} lbs and reset to ${config.repRangeMin} reps.${e1rmStr}`,
      suggestedWeight: newWeight,
      suggestedReps: config.repRangeMin,
      e1rm,
    };
  }

  // ─── All sets hit max BUT RPE is high → hold weight, reduce RPE first ───
  if (allSetsHitMax && avgRpe > 4) {
    return {
      type: 'hold',
      message: `Hit max reps but RPE is high (${avgRpe.toFixed(1)}). Repeat at ${config.currentWeight} lbs — when RPE drops below 4, you'll progress.${e1rmStr}`,
      suggestedWeight: config.currentWeight,
      e1rm,
    };
  }

  // ─── Hitting minimum but not max → increase reps ───
  if (allSetsHitMin) {
    const targetReps = Math.min(latest.sets[0].reps + 1, config.repRangeMax);
    return {
      type: 'increase_reps',
      message: `Good work at RPE ${avgRpe.toFixed(1)}! Add 1 rep per set next session. Target: ${targetReps} reps at ${config.currentWeight} lbs.${e1rmStr}`,
      suggestedReps: targetReps,
      e1rm,
    };
  }

  // ─── Not hitting minimum → hold ───
  return {
    type: 'hold',
    message: `Keep at ${config.currentWeight} lbs. Focus on hitting ${config.repRangeMin} reps on all sets (current RPE: ${avgRpe.toFixed(1)}).${e1rmStr}`,
    e1rm,
  };
}

export function getExerciseHistory(
  sessions: WorkoutSession[],
  exercise: string
): ExerciseLog[] {
  return sessions
    .flatMap(s => s.exercises.filter(e => e.exercise === exercise))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPersonalRecords(sessions: WorkoutSession[]): PersonalRecord[] {
  const prMap = new Map<string, PersonalRecord>();

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
