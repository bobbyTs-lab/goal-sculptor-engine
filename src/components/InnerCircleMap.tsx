import { useState, useMemo } from 'react';
import { Contact, CircleRing, InfluenceTag } from '@/lib/storage';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone, Mail, Activity, Edit2, Clock, Zap, Shield, AlertTriangle, Minus,
  PhoneCall, MessageSquare, Coffee, Briefcase,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const RING_ORDER: CircleRing[] = ['core', 'close', 'extended', 'distant'];
const RING_LABELS: Record<CircleRing, string> = {
  core: 'Core',
  close: 'Close',
  extended: 'Extended',
  distant: 'Distant',
};

const INFLUENCE_COLORS: Record<InfluenceTag, string> = {
  energizer: 'hsl(45, 90%, 50%)',
  challenger: 'hsl(280, 80%, 55%)',
  supporter: 'hsl(210, 80%, 50%)',
  drainer: 'hsl(0, 70%, 50%)',
  neutral: 'hsl(200, 10%, 50%)',
};

const INFLUENCE_BG: Record<InfluenceTag, string> = {
  energizer: 'hsl(45, 90%, 50%, 0.15)',
  challenger: 'hsl(280, 80%, 55%, 0.15)',
  supporter: 'hsl(210, 80%, 50%, 0.15)',
  drainer: 'hsl(0, 70%, 50%, 0.15)',
  neutral: 'hsl(200, 10%, 50%, 0.15)',
};

interface InnerCircleMapProps {
  contacts: Contact[];
  streakStatus: (contact: Contact) => 'on-track' | 'due-soon' | 'overdue' | 'no-goal';
  daysSince: (contactId: string) => number | null;
  onLogInteraction: (contactId: string) => void;
  onEdit: (contact: Contact) => void;
}

const STREAK_RING_COLORS = {
  'on-track': '#22c55e',
  'due-soon': '#f59e0b',
  'overdue': '#ef4444',
  'no-goal': 'transparent',
};

export default function InnerCircleMap({
  contacts, streakStatus, daysSince, onLogInteraction, onEdit,
}: InnerCircleMapProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedContact = contacts.find(c => c.id === selectedId);

  // Group contacts by ring
  const byRing = useMemo(() => {
    const groups: Record<CircleRing, Contact[]> = { core: [], close: [], extended: [], distant: [] };
    contacts.forEach(c => groups[c.circleRing].push(c));
    return groups;
  }, [contacts]);

  // Ring counts for stats
  const ringCounts = RING_ORDER.map(r => ({ ring: r, count: byRing[r].length }));

  // Calculate positions for contacts on each ring
  // Ring radii as percentages of container (from center)
  const RING_RADII = { core: 15, close: 27, extended: 38, distant: 48 };
  const RING_CIRCLE_RADII = { core: 14, close: 26, extended: 37, distant: 47 };

  const positionedContacts = useMemo(() => {
    const result: { contact: Contact; x: number; y: number; ring: CircleRing }[] = [];
    RING_ORDER.forEach(ring => {
      const ringContacts = byRing[ring];
      const radius = RING_RADII[ring];
      ringContacts.forEach((contact, i) => {
        const angle = (2 * Math.PI * i) / Math.max(ringContacts.length, 1) - Math.PI / 2;
        const x = 50 + radius * Math.cos(angle);
        const y = 50 + radius * Math.sin(angle);
        result.push({ contact, x, y, ring });
      });
    });
    return result;
  }, [byRing]);

  return (
    <div className="space-y-4">
      {/* Ring stats */}
      <div className="flex justify-center gap-6 text-[11px] font-medium text-muted-foreground">
        {ringCounts.map(({ ring, count }) => (
          <span key={ring} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full opacity-60" style={{
              backgroundColor: ring === 'core' ? 'hsl(210, 80%, 50%)' :
                ring === 'close' ? 'hsl(170, 70%, 40%)' :
                ring === 'extended' ? 'hsl(38, 90%, 55%)' : 'hsl(200, 10%, 50%)',
            }} />
            {RING_LABELS[ring]}: {count}
          </span>
        ))}
      </div>

      {/* Map container */}
      <div className="relative w-full" style={{ paddingBottom: '100%', maxWidth: '500px', margin: '0 auto' }}>
        <div className="absolute inset-0">
          {/* Concentric ring circles */}
          <svg viewBox="0 0 100 100" className="w-full h-full absolute inset-0">
            {/* Distant ring */}
            <circle cx="50" cy="50" r={RING_CIRCLE_RADII.distant} fill="none" stroke="currentColor" strokeWidth="0.15" className="text-border" strokeDasharray="1 0.8" />
            {/* Extended ring */}
            <circle cx="50" cy="50" r={RING_CIRCLE_RADII.extended} fill="none" stroke="currentColor" strokeWidth="0.15" className="text-border" strokeDasharray="1 0.8" />
            {/* Close ring */}
            <circle cx="50" cy="50" r={RING_CIRCLE_RADII.close} fill="none" stroke="currentColor" strokeWidth="0.15" className="text-border" strokeDasharray="1 0.8" />
            {/* Core ring */}
            <circle cx="50" cy="50" r={RING_CIRCLE_RADII.core} fill="none" stroke="currentColor" strokeWidth="0.2" className="text-primary/30" />

            {/* Ring labels */}
            <text x="50" y={50 - RING_CIRCLE_RADII.core - 1.5} textAnchor="middle" className="fill-primary/40" fontSize="2" fontWeight="600">CORE</text>
            <text x="50" y={50 - RING_CIRCLE_RADII.close - 1.5} textAnchor="middle" className="fill-muted-foreground/30" fontSize="1.8">CLOSE</text>
            <text x="50" y={50 - RING_CIRCLE_RADII.extended - 1.5} textAnchor="middle" className="fill-muted-foreground/30" fontSize="1.8">EXTENDED</text>
            <text x="50" y={50 - RING_CIRCLE_RADII.distant - 1.5} textAnchor="middle" className="fill-muted-foreground/30" fontSize="1.8">DISTANT</text>

            {/* "You" center dot */}
            <circle cx="50" cy="50" r="2.5" className="fill-primary/20" />
            <text x="50" y="50.8" textAnchor="middle" className="fill-primary" fontSize="2" fontWeight="700">You</text>
          </svg>

          {/* Contact avatars */}
          {positionedContacts.map(({ contact, x, y }) => {
            const streak = streakStatus(contact);
            const isSelected = selectedId === contact.id;
            const streakColor = STREAK_RING_COLORS[streak];
            const influenceColor = INFLUENCE_COLORS[contact.influenceTag];
            const influenceBg = INFLUENCE_BG[contact.influenceTag];

            return (
              <motion.button
                key={contact.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: isSelected ? 1.3 : 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: Math.random() * 0.3 }}
                className="absolute flex items-center justify-center rounded-full cursor-pointer z-10"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: 'translate(-50%, -50%)',
                  width: '28px',
                  height: '28px',
                  backgroundColor: influenceBg,
                  color: influenceColor,
                  border: streak !== 'no-goal' ? `2px solid ${streakColor}` : `1.5px solid ${influenceColor}40`,
                  boxShadow: isSelected ? `0 0 12px ${influenceColor}40` : 'none',
                  fontSize: '11px',
                  fontWeight: 600,
                }}
                onClick={() => setSelectedId(isSelected ? null : contact.id)}
                title={contact.name}
              >
                {contact.name.charAt(0).toUpperCase()}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Empty state */}
      {contacts.length === 0 && (
        <p className="text-center text-sm text-muted-foreground mt-4">
          Add people and assign them to circles to see your Inner Circle Map.
        </p>
      )}

      {/* Selected contact detail card */}
      <AnimatePresence>
        {selectedContact && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-card border border-border rounded-xl p-4 shadow-md max-w-sm mx-auto"
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                style={{
                  backgroundColor: INFLUENCE_BG[selectedContact.influenceTag],
                  color: INFLUENCE_COLORS[selectedContact.influenceTag],
                }}
              >
                {selectedContact.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{selectedContact.name}</p>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span>{RING_LABELS[selectedContact.circleRing]}</span>
                  <span>·</span>
                  <span className="capitalize">{selectedContact.influenceTag}</span>
                  {(() => {
                    const streak = streakStatus(selectedContact);
                    const days = daysSince(selectedContact.id);
                    if (streak === 'no-goal') return null;
                    const color = streak === 'on-track' ? 'text-green-500' : streak === 'due-soon' ? 'text-amber-500' : 'text-red-500';
                    return (
                      <span className={`flex items-center gap-0.5 ${color}`}>
                        <Clock className="h-2.5 w-2.5" />
                        {days !== null ? `${days}d` : 'Never'}
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>

            {selectedContact.plan && (
              <p className="text-[11px] text-muted-foreground mb-3 italic">"{selectedContact.plan}"</p>
            )}

            {/* Quick actions */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-8 text-[10px] gap-1"
                onClick={() => { onLogInteraction(selectedContact.id); setSelectedId(null); }}
              >
                <Activity className="h-3 w-3" /> Log
              </Button>
              {selectedContact.phone && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-[10px] gap-1"
                  asChild
                >
                  <a href={`tel:${selectedContact.phone}`}>
                    <Phone className="h-3 w-3" /> Call
                  </a>
                </Button>
              )}
              {selectedContact.email && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-[10px] gap-1"
                  asChild
                >
                  <a href={`mailto:${selectedContact.email}`}>
                    <Mail className="h-3 w-3" /> Email
                  </a>
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-[10px] gap-1"
                onClick={() => { onEdit(selectedContact); setSelectedId(null); }}
              >
                <Edit2 className="h-3 w-3" /> Edit
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
