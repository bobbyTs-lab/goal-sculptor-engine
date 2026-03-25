import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Contact, Interaction, InfluenceTag } from '@/lib/storage';
import {
  Clock, AlertTriangle, Zap, Shield, Minus, TrendingUp,
  PhoneCall, MessageSquare, Coffee, Briefcase, Activity,
} from 'lucide-react';
import { motion } from 'framer-motion';

const INFLUENCE_META: Record<InfluenceTag, { label: string; color: string; icon: typeof Zap }> = {
  energizer: { label: 'Energizers', color: 'hsl(45, 90%, 50%)', icon: Zap },
  challenger: { label: 'Challengers', color: 'hsl(280, 80%, 55%)', icon: AlertTriangle },
  supporter: { label: 'Supporters', color: 'hsl(210, 80%, 50%)', icon: Shield },
  drainer: { label: 'Drainers', color: 'hsl(0, 70%, 50%)', icon: AlertTriangle },
  neutral: { label: 'Neutral', color: 'hsl(200, 10%, 50%)', icon: Minus },
};

const INTERACTION_ICONS = {
  call: PhoneCall,
  text: MessageSquare,
  hangout: Coffee,
  meeting: Briefcase,
};

interface InsightsPanelProps {
  contacts: Contact[];
  interactions: Interaction[];
  streakStatus: (contact: Contact) => 'on-track' | 'due-soon' | 'overdue' | 'no-goal';
  daysSince: (contactId: string) => number | null;
  onLogInteraction: (contactId: string) => void;
}

function formatRelativeDate(iso: string): string {
  const diffDays = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

export default function InsightsPanel({
  contacts, interactions, streakStatus, daysSince, onLogInteraction,
}: InsightsPanelProps) {

  // --- Social Energy Report ---
  // Count interactions in last 30 days grouped by influence tag
  const energyReport = useMemo(() => {
    const thirtyDaysAgo = Date.now() - 30 * 86400000;
    const recentInteractions = interactions.filter(i => new Date(i.date).getTime() > thirtyDaysAgo);
    const contactMap = new Map(contacts.map(c => [c.id, c]));

    const byInfluence: Record<InfluenceTag, { count: number; minutes: number }> = {
      energizer: { count: 0, minutes: 0 },
      challenger: { count: 0, minutes: 0 },
      supporter: { count: 0, minutes: 0 },
      drainer: { count: 0, minutes: 0 },
      neutral: { count: 0, minutes: 0 },
    };

    let totalMinutes = 0;
    let totalCount = 0;

    recentInteractions.forEach(interaction => {
      const contact = contactMap.get(interaction.contactId);
      if (!contact) return;
      const tag = contact.influenceTag;
      byInfluence[tag].count++;
      byInfluence[tag].minutes += interaction.durationMinutes || 0;
      totalMinutes += interaction.durationMinutes || 0;
      totalCount++;
    });

    // Average energy rating
    const ratedInteractions = recentInteractions.filter(i => i.energyAfter);
    const avgEnergy = ratedInteractions.length > 0
      ? ratedInteractions.reduce((sum, i) => sum + (i.energyAfter || 0), 0) / ratedInteractions.length
      : null;

    return { byInfluence, totalMinutes, totalCount, avgEnergy };
  }, [contacts, interactions]);

  // --- Streak Board ---
  const streakBoard = useMemo(() => {
    const withGoals = contacts.filter(c => c.interactionGoalDays);
    return withGoals
      .map(c => ({
        contact: c,
        status: streakStatus(c),
        days: daysSince(c.id),
      }))
      .sort((a, b) => {
        const order = { overdue: 0, 'due-soon': 1, 'on-track': 2, 'no-goal': 3 };
        return order[a.status] - order[b.status];
      });
  }, [contacts, streakStatus, daysSince]);

  // --- Neglect Alerts ---
  const neglected = streakBoard.filter(s => s.status === 'overdue');

  // --- Recent Activity Timeline ---
  const recentActivity = useMemo(() => {
    const contactMap = new Map(contacts.map(c => [c.id, c]));
    return interactions
      .slice(0, 15)
      .map(i => ({ ...i, contact: contactMap.get(i.contactId) }))
      .filter(i => i.contact);
  }, [contacts, interactions]);

  const STREAK_STYLES = {
    'on-track': { color: 'text-green-500', bg: 'bg-green-500/10', label: 'On track' },
    'due-soon': { color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Due soon' },
    'overdue': { color: 'text-red-500', bg: 'bg-red-500/10', label: 'Overdue' },
    'no-goal': { color: 'text-muted-foreground', bg: '', label: '' },
  };

  const hasData = interactions.length > 0 || contacts.length > 0;

  if (!hasData) {
    return (
      <div className="text-center py-12">
        <TrendingUp className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-foreground font-semibold">No insights yet</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
          Add contacts and log interactions to see your social insights.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Neglect Alerts */}
      {neglected.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/10">
            <CardContent className="pt-3 pb-3">
              <p className="text-[11px] font-semibold text-red-600 dark:text-red-400 mb-2 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Neglect Alerts
              </p>
              <div className="space-y-1.5">
                {neglected.map(({ contact, days }) => (
                  <div key={contact.id} className="flex items-center justify-between text-[11px]">
                    <span className="text-foreground/80">
                      <span className="font-medium">{contact.name}</span>
                      <span className="text-muted-foreground"> — {days !== null ? `${days}d since last contact` : 'Never contacted'}</span>
                      <span className="text-red-500"> (goal: every {contact.interactionGoalDays}d)</span>
                    </span>
                    <button
                      onClick={() => onLogInteraction(contact.id)}
                      className="text-primary hover:underline font-medium flex-shrink-0 ml-2"
                    >
                      Reach out
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Social Energy Report */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card>
          <CardContent className="pt-3 pb-3">
            <p className="text-[11px] font-semibold text-foreground/70 mb-3 flex items-center gap-1">
              <Activity className="h-3 w-3" /> Social Energy — Last 30 Days
            </p>

            {energyReport.totalCount === 0 ? (
              <p className="text-[11px] text-muted-foreground/60 italic">No interactions in the last 30 days</p>
            ) : (
              <>
                {/* Summary stats */}
                <div className="flex gap-4 mb-3 text-[11px]">
                  <div>
                    <span className="text-muted-foreground">Interactions: </span>
                    <span className="font-semibold text-foreground">{energyReport.totalCount}</span>
                  </div>
                  {energyReport.totalMinutes > 0 && (
                    <div>
                      <span className="text-muted-foreground">Total time: </span>
                      <span className="font-semibold text-foreground">
                        {energyReport.totalMinutes >= 60
                          ? `${Math.floor(energyReport.totalMinutes / 60)}h ${energyReport.totalMinutes % 60}m`
                          : `${energyReport.totalMinutes}m`}
                      </span>
                    </div>
                  )}
                  {energyReport.avgEnergy !== null && (
                    <div>
                      <span className="text-muted-foreground">Avg energy: </span>
                      <span className="font-semibold text-foreground">{energyReport.avgEnergy.toFixed(1)}/5</span>
                    </div>
                  )}
                </div>

                {/* Influence breakdown bars */}
                <div className="space-y-2">
                  {(Object.entries(energyReport.byInfluence) as [InfluenceTag, { count: number; minutes: number }][])
                    .filter(([, data]) => data.count > 0)
                    .sort((a, b) => b[1].count - a[1].count)
                    .map(([tag, data]) => {
                      const meta = INFLUENCE_META[tag];
                      const pct = energyReport.totalCount > 0 ? (data.count / energyReport.totalCount) * 100 : 0;
                      const Icon = meta.icon;
                      return (
                        <div key={tag}>
                          <div className="flex items-center justify-between text-[11px] mb-0.5">
                            <span className="flex items-center gap-1 font-medium" style={{ color: meta.color }}>
                              <Icon className="h-3 w-3" /> {meta.label}
                            </span>
                            <span className="text-muted-foreground">
                              {data.count} ({Math.round(pct)}%)
                              {data.minutes > 0 && ` · ${data.minutes}m`}
                            </span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut' }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: meta.color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Streak Board */}
      {streakBoard.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardContent className="pt-3 pb-3">
              <p className="text-[11px] font-semibold text-foreground/70 mb-2 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Streak Board
              </p>
              <div className="space-y-1.5">
                {streakBoard.map(({ contact, status, days }) => {
                  const style = STREAK_STYLES[status];
                  return (
                    <div key={contact.id} className="flex items-center gap-2 text-[11px]">
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${style.bg}`}
                        style={{
                          backgroundColor: status === 'on-track' ? '#22c55e' :
                            status === 'due-soon' ? '#f59e0b' : '#ef4444',
                        }}
                      />
                      <span className="font-medium text-foreground/80 flex-1">{contact.name}</span>
                      <span className="text-muted-foreground">
                        every {contact.interactionGoalDays}d
                      </span>
                      <span className={`font-medium ${style.color}`}>
                        {days !== null ? `${days}d ago` : 'Never'}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0 rounded-full font-medium ${style.color} ${style.bg}`}>
                        {style.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Recent Activity Timeline */}
      {recentActivity.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card>
            <CardContent className="pt-3 pb-3">
              <p className="text-[11px] font-semibold text-foreground/70 mb-2">Activity Timeline</p>
              <div className="space-y-2">
                {recentActivity.map(interaction => {
                  const Icon = INTERACTION_ICONS[interaction.type] || Activity;
                  const influenceColor = interaction.contact
                    ? INFLUENCE_META[interaction.contact.influenceTag].color
                    : undefined;
                  return (
                    <div key={interaction.id} className="flex items-start gap-2 text-[11px]">
                      <div className="mt-0.5">
                        <Icon className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium" style={{ color: influenceColor }}>
                          {interaction.contact?.name}
                        </span>
                        <span className="text-muted-foreground"> — {interaction.type}</span>
                        {interaction.durationMinutes && (
                          <span className="text-muted-foreground"> · {interaction.durationMinutes}m</span>
                        )}
                        {interaction.energyAfter && (
                          <span className="ml-1">
                            {interaction.energyAfter <= 2 ? '😮‍💨' : interaction.energyAfter === 3 ? '🙂' : interaction.energyAfter === 4 ? '😊' : '🔥'}
                          </span>
                        )}
                        {interaction.note && (
                          <p className="text-muted-foreground/70 truncate">{interaction.note}</p>
                        )}
                      </div>
                      <span className="text-muted-foreground/50 flex-shrink-0">
                        {formatRelativeDate(interaction.date)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
