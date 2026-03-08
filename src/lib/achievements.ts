import { WorkoutSession, CompoundExercise } from '@/types/workout';
import { getPersonalRecords, calculateVolumeLoad } from './progressive-overload';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'legendary';
  category: 'milestone' | 'volume' | 'strength';
  check: (sessions: WorkoutSession[]) => boolean;
}

export interface UnlockedAchievement {
  id: string;
  unlockedAt: string;
}

const ACHIEVEMENTS: Achievement[] = [
  // Milestone badges
  {
    id: 'first_blood',
    title: 'First Blood',
    description: 'Complete your first workout session',
    icon: '🩸',
    tier: 'bronze',
    category: 'milestone',
    check: (s) => s.length >= 1,
  },
  {
    id: 'forged_in_fire',
    title: 'Forged in Fire',
    description: 'Complete 10 workout sessions',
    icon: '🔥',
    tier: 'silver',
    category: 'milestone',
    check: (s) => s.length >= 10,
  },
  {
    id: 'iron_will',
    title: 'Iron Will',
    description: 'Complete 50 workout sessions',
    icon: '⚔️',
    tier: 'gold',
    category: 'milestone',
    check: (s) => s.length >= 50,
  },
  {
    id: 'century',
    title: 'Century',
    description: 'Complete 100 workout sessions',
    icon: '👑',
    tier: 'legendary',
    category: 'milestone',
    check: (s) => s.length >= 100,
  },

  // Strength badges — Plate Club
  {
    id: 'plate_club_bench',
    title: 'Plate Club: Bench',
    description: 'Bench Press 225 lbs',
    icon: '🏋️',
    tier: 'gold',
    category: 'strength',
    check: (s) => {
      const prs = getPersonalRecords(s);
      return prs.some(p => p.exercise === 'bench_press' && p.weight >= 225);
    },
  },
  {
    id: 'plate_club_squat',
    title: 'Plate Club: Squat',
    description: 'Squat 315 lbs',
    icon: '🦵',
    tier: 'gold',
    category: 'strength',
    check: (s) => {
      const prs = getPersonalRecords(s);
      return prs.some(p => p.exercise === 'squat' && p.weight >= 315);
    },
  },
  {
    id: 'plate_club_deadlift',
    title: 'Plate Club: Deadlift',
    description: 'Deadlift 405 lbs',
    icon: '💀',
    tier: 'gold',
    category: 'strength',
    check: (s) => {
      const prs = getPersonalRecords(s);
      return prs.some(p => p.exercise === 'deadlift' && p.weight >= 405);
    },
  },
  {
    id: 'bodyweight_master',
    title: 'Bodyweight Master',
    description: 'Achieve 15 pull-up reps in a set',
    icon: '🐒',
    tier: 'gold',
    category: 'strength',
    check: (s) => {
      const prs = getPersonalRecords(s);
      return prs.some(p => p.exercise === 'pull_up' && p.reps >= 15);
    },
  },

  // Volume badges
  {
    id: 'volume_100k',
    title: 'Tonnage: 100K',
    description: 'Move 100,000 lbs total volume',
    icon: '📦',
    tier: 'bronze',
    category: 'volume',
    check: (s) => getTotalVolume(s) >= 100000,
  },
  {
    id: 'volume_500k',
    title: 'Tonnage: 500K',
    description: 'Move 500,000 lbs total volume',
    icon: '🏗️',
    tier: 'silver',
    category: 'volume',
    check: (s) => getTotalVolume(s) >= 500000,
  },
  {
    id: 'volume_1m',
    title: 'Tonnage: 1M',
    description: 'Move 1,000,000 lbs total volume',
    icon: '🏔️',
    tier: 'legendary',
    category: 'volume',
    check: (s) => getTotalVolume(s) >= 1000000,
  },
];

function getTotalVolume(sessions: WorkoutSession[]): number {
  return sessions.reduce((sum, session) =>
    sum + session.exercises.reduce((exSum, ex) => exSum + calculateVolumeLoad(ex.sets), 0), 0
  );
}

export function getAllAchievements(): Achievement[] {
  return ACHIEVEMENTS;
}

export function checkAchievements(
  sessions: WorkoutSession[],
  previouslyUnlocked: UnlockedAchievement[]
): { all: (Achievement & { unlocked: boolean; unlockedAt?: string })[]; newlyUnlocked: Achievement[] } {
  const unlockedIds = new Set(previouslyUnlocked.map(u => u.id));
  const newlyUnlocked: Achievement[] = [];

  const all = ACHIEVEMENTS.map(a => {
    const wasUnlocked = unlockedIds.has(a.id);
    const isUnlocked = wasUnlocked || a.check(sessions);
    if (isUnlocked && !wasUnlocked) {
      newlyUnlocked.push(a);
    }
    const unlockedAt = wasUnlocked
      ? previouslyUnlocked.find(u => u.id === a.id)?.unlockedAt
      : isUnlocked ? new Date().toISOString() : undefined;
    return { ...a, unlocked: isUnlocked, unlockedAt };
  });

  return { all, newlyUnlocked };
}

export const TIER_COLORS: Record<string, string> = {
  bronze: 'hsl(30 60% 45%)',
  silver: 'hsl(220 10% 65%)',
  gold: 'hsl(42 100% 50%)',
  legendary: 'hsl(280 100% 60%)',
};
