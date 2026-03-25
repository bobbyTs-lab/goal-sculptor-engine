import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Contact, RelationshipTag, CircleRing, InfluenceTag, InteractionType,
} from '@/lib/storage';
import { useContacts } from '@/hooks/useContacts';
import {
  Users, Plus, Phone, Mail, Edit2, Trash2, Search, User, Target,
  Zap, Shield, AlertTriangle, Minus, Clock, MessageSquare,
  PhoneCall, Coffee, Briefcase, Activity, CheckCircle2, Circle,
  CalendarClock, Repeat, HandHeart, List, CircleDot, BarChart3, Upload, Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import InnerCircleMap from '@/components/InnerCircleMap';
import InsightsPanel from '@/components/InsightsPanel';
import {
  isContactPickerSupported, pickContactsFromPhone,
  parseVCard, readVCardFile, findDuplicates, importedToContacts,
  type ImportedContact,
} from '@/lib/contact-import';

const RELATIONSHIP_TAGS: { value: RelationshipTag; label: string; color: string }[] = [
  { value: 'family', label: 'Family', color: '350 80% 55%' },
  { value: 'friend', label: 'Friend', color: '210 80% 50%' },
  { value: 'coworker', label: 'Coworker', color: '170 70% 40%' },
  { value: 'mentor', label: 'Mentor', color: '38 90% 55%' },
  { value: 'mentee', label: 'Mentee', color: '280 80% 55%' },
  { value: 'partner', label: 'Partner', color: '220 60% 30%' },
  { value: 'acquaintance', label: 'Acquaintance', color: '60 20% 40%' },
  { value: 'other', label: 'Other', color: '200 20% 50%' },
];

const CIRCLE_RINGS: { value: CircleRing; label: string; description: string }[] = [
  { value: 'core', label: 'Core', description: 'Daily influence' },
  { value: 'close', label: 'Close', description: 'Weekly contact' },
  { value: 'extended', label: 'Extended', description: 'Monthly contact' },
  { value: 'distant', label: 'Distant', description: 'Occasional' },
];

const INFLUENCE_TAGS: { value: InfluenceTag; label: string; icon: typeof Zap; color: string }[] = [
  { value: 'energizer', label: 'Energizer', icon: Zap, color: '45 90% 50%' },
  { value: 'challenger', label: 'Challenger', icon: AlertTriangle, color: '280 80% 55%' },
  { value: 'supporter', label: 'Supporter', icon: Shield, color: '210 80% 50%' },
  { value: 'drainer', label: 'Drainer', icon: AlertTriangle, color: '0 70% 50%' },
  { value: 'neutral', label: 'Neutral', icon: Minus, color: '200 10% 50%' },
];

const INTERACTION_TYPES: { value: InteractionType; label: string; icon: typeof Phone }[] = [
  { value: 'call', label: 'Call', icon: PhoneCall },
  { value: 'text', label: 'Text', icon: MessageSquare },
  { value: 'hangout', label: 'Hangout', icon: Coffee },
  { value: 'meeting', label: 'Meeting', icon: Briefcase },
];

const ENERGY_LEVELS = [
  { value: 1 as const, label: 'Drained', emoji: '😮‍💨' },
  { value: 2 as const, label: 'Low', emoji: '😐' },
  { value: 3 as const, label: 'Neutral', emoji: '🙂' },
  { value: 4 as const, label: 'Good', emoji: '😊' },
  { value: 5 as const, label: 'Energized', emoji: '🔥' },
];

const getTagInfo = (tag: RelationshipTag) =>
  RELATIONSHIP_TAGS.find(t => t.value === tag) || RELATIONSHIP_TAGS[RELATIONSHIP_TAGS.length - 1];

const getInfluenceInfo = (tag: InfluenceTag) =>
  INFLUENCE_TAGS.find(t => t.value === tag) || INFLUENCE_TAGS[INFLUENCE_TAGS.length - 1];

const getRingInfo = (ring: CircleRing) =>
  CIRCLE_RINGS.find(r => r.value === ring) || CIRCLE_RINGS[CIRCLE_RINGS.length - 1];

const getInteractionTypeInfo = (type: InteractionType) =>
  INTERACTION_TYPES.find(t => t.value === type) || INTERACTION_TYPES[0];

type ContactForm = {
  name: string;
  relationship: RelationshipTag;
  circleRing: CircleRing;
  influenceTag: InfluenceTag;
  phone: string;
  email: string;
  notes: string;
  plan: string;
  interactionGoalDays: string;
};

type InteractionForm = {
  type: InteractionType;
  durationMinutes: string;
  energyAfter: 1 | 2 | 3 | 4 | 5 | null;
  note: string;
};

type CommitmentForm = {
  text: string;
  dueDate: string;
  recurring: '' | 'weekly' | 'biweekly' | 'monthly';
};

const emptyForm = (): ContactForm => ({
  name: '', relationship: 'friend', circleRing: 'distant', influenceTag: 'neutral',
  phone: '', email: '', notes: '', plan: '', interactionGoalDays: '',
});

const emptyInteractionForm = (): InteractionForm => ({
  type: 'hangout', durationMinutes: '', energyAfter: null, note: '',
});

const emptyCommitmentForm = (): CommitmentForm => ({
  text: '', dueDate: '', recurring: '',
});

const contactToForm = (c: Contact): ContactForm => ({
  name: c.name,
  relationship: c.relationship,
  circleRing: c.circleRing,
  influenceTag: c.influenceTag,
  phone: c.phone || '',
  email: c.email || '',
  notes: c.notes,
  plan: c.plan,
  interactionGoalDays: c.interactionGoalDays ? String(c.interactionGoalDays) : '',
});

const STREAK_COLORS = {
  'on-track': 'text-green-500',
  'due-soon': 'text-amber-500',
  'overdue': 'text-red-500',
  'no-goal': 'text-muted-foreground',
};

const STREAK_BG = {
  'on-track': 'bg-green-500/10',
  'due-soon': 'bg-amber-500/10',
  'overdue': 'bg-red-500/10',
  'no-goal': '',
};

const STREAK_LABELS = {
  'on-track': 'On track',
  'due-soon': 'Due soon',
  'overdue': 'Overdue',
  'no-goal': '',
};

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

export default function PeoplePage() {
  const {
    contacts, interactions, addContact, updateContact, deleteContact,
    addInteraction, deleteInteraction, getInteractionsForContact,
    getDaysSinceLastInteraction, getStreakStatus,
    addCommitment, completeCommitment, uncompleteCommitment, deleteCommitment, getCommitmentsForContact,
  } = useContacts();

  const [view, setView] = useState<'list' | 'circle' | 'insights'>('list');
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState<RelationshipTag | 'all'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState<ContactForm>(emptyForm());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Interaction logging state
  const [interactionDialogOpen, setInteractionDialogOpen] = useState(false);
  const [interactionContactId, setInteractionContactId] = useState<string | null>(null);
  const [interactionForm, setInteractionForm] = useState<InteractionForm>(emptyInteractionForm());

  // Commitment state
  const [commitmentDialogOpen, setCommitmentDialogOpen] = useState(false);
  const [commitmentContactId, setCommitmentContactId] = useState<string | null>(null);
  const [commitmentForm, setCommitmentForm] = useState<CommitmentForm>(emptyCommitmentForm());

  // Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<ImportedContact[] | null>(null);
  const [importDuplicates, setImportDuplicates] = useState<ImportedContact[]>([]);

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    const data = {
      name: form.name.trim(),
      relationship: form.relationship,
      circleRing: form.circleRing,
      influenceTag: form.influenceTag,
      phone: form.phone || undefined,
      email: form.email || undefined,
      notes: form.notes,
      plan: form.plan,
      interactionGoalDays: form.interactionGoalDays ? Number(form.interactionGoalDays) : undefined,
    };
    if (editing) {
      updateContact(editing.id, data);
      toast.success('Contact updated');
    } else {
      addContact(data as Omit<Contact, 'id' | 'createdAt'>);
      toast.success('Contact added');
    }
    setDialogOpen(false);
    setEditing(null);
    setForm(emptyForm());
  };

  const handleDelete = (id: string) => {
    deleteContact(id);
    toast.success('Contact removed');
  };

  const openEdit = (contact: Contact) => {
    setEditing(contact);
    setForm(contactToForm(contact));
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openLogInteraction = (contactId: string) => {
    setInteractionContactId(contactId);
    setInteractionForm(emptyInteractionForm());
    setInteractionDialogOpen(true);
  };

  const handleLogInteraction = () => {
    if (!interactionContactId) return;
    addInteraction({
      contactId: interactionContactId,
      type: interactionForm.type,
      durationMinutes: interactionForm.durationMinutes ? Number(interactionForm.durationMinutes) : undefined,
      energyAfter: interactionForm.energyAfter || undefined,
      note: interactionForm.note || undefined,
    });
    const contact = contacts.find(c => c.id === interactionContactId);
    toast.success(`Logged ${interactionForm.type} with ${contact?.name || 'contact'}`);
    setInteractionDialogOpen(false);
    setInteractionContactId(null);
  };

  const openAddCommitment = (contactId: string) => {
    setCommitmentContactId(contactId);
    setCommitmentForm(emptyCommitmentForm());
    setCommitmentDialogOpen(true);
  };

  const handleAddCommitment = () => {
    if (!commitmentContactId || !commitmentForm.text.trim()) {
      toast.error('Commitment text is required');
      return;
    }
    addCommitment({
      contactId: commitmentContactId,
      text: commitmentForm.text.trim(),
      dueDate: commitmentForm.dueDate || undefined,
      recurring: commitmentForm.recurring || undefined,
    });
    const contact = contacts.find(c => c.id === commitmentContactId);
    toast.success(`Commitment added for ${contact?.name || 'contact'}`);
    setCommitmentDialogOpen(false);
    setCommitmentContactId(null);
  };

  // --- Import handlers ---
  const handleImportFromPhone = async () => {
    try {
      const picked = await pickContactsFromPhone();
      if (picked.length === 0) return;
      const { unique, duplicates } = findDuplicates(picked, contacts);
      setImportPreview(unique);
      setImportDuplicates(duplicates);
    } catch {
      toast.error('Contact import not supported on this device. Try importing a .vcf file instead.');
    }
  };

  const handleVcfFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await readVCardFile(file);
      const parsed = parseVCard(text);
      if (parsed.length === 0) {
        toast.error('No contacts found in file');
        return;
      }
      const { unique, duplicates } = findDuplicates(parsed, contacts);
      setImportPreview(unique);
      setImportDuplicates(duplicates);
    } catch {
      toast.error('Failed to read file');
    }
    // Reset file input
    e.target.value = '';
  };

  const handleConfirmImport = () => {
    if (!importPreview || importPreview.length === 0) return;
    const toImport = importedToContacts(importPreview);
    toImport.forEach(c => addContact(c as Omit<Contact, 'id' | 'createdAt'>));
    toast.success(`Imported ${toImport.length} contact${toImport.length > 1 ? 's' : ''}`);
    setImportPreview(null);
    setImportDuplicates([]);
  };

  const filtered = contacts.filter(c => {
    const matchesSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.notes.toLowerCase().includes(search.toLowerCase()) ||
      c.plan.toLowerCase().includes(search.toLowerCase());
    const matchesTag = filterTag === 'all' || c.relationship === filterTag;
    return matchesSearch && matchesTag;
  });

  const interactionContactName = interactionContactId
    ? contacts.find(c => c.id === interactionContactId)?.name || ''
    : '';

  const commitmentContactName = commitmentContactId
    ? contacts.find(c => c.id === commitmentContactId)?.name || ''
    : '';

  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">People</h1>
          <p className="text-muted-foreground mt-0.5 text-xs md:text-sm">Track relationships · Stay connected</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setView('list')}
              className={`p-1.5 transition-colors ${view === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView('circle')}
              className={`p-1.5 transition-colors ${view === 'circle' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}
            >
              <CircleDot className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView('insights')}
              className={`p-1.5 transition-colors ${view === 'insights' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}
            >
              <BarChart3 className="h-4 w-4" />
            </button>
          </div>
          <Button
            onClick={() => {
              if (isContactPickerSupported()) {
                handleImportFromPhone();
              } else {
                fileInputRef.current?.click();
              }
            }}
            size="sm"
            variant="outline"
            className="gap-1.5"
          >
            <Download className="h-4 w-4" /> <span className="hidden sm:inline">Import</span>
          </Button>
          <Button onClick={openNew} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Add</span>
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".vcf,.vcard"
          className="hidden"
          onChange={handleVcfFileChange}
        />
      </div>

      {/* Search & Filter (list view only) */}
      {view !== 'list' ? null : (
        <>
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search people..." className="pl-9 h-9 text-sm" />
            </div>
            <Select value={filterTag} onValueChange={v => setFilterTag(v as RelationshipTag | 'all')}>
              <SelectTrigger className="w-36 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                {RELATIONSHIP_TAGS.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stats */}
          <div className="flex gap-4 text-[11px] font-medium text-muted-foreground">
            <span>{contacts.length} people</span>
            <span>{contacts.filter(c => c.circleRing === 'core').length} in core</span>
            <span>{contacts.filter(c => c.plan).length} with plans</span>
          </div>
        </>
      )}

      {/* Circle View */}
      {view === 'circle' && (
        <InnerCircleMap
          contacts={contacts}
          streakStatus={getStreakStatus}
          daysSince={getDaysSinceLastInteraction}
          onLogInteraction={openLogInteraction}
          onEdit={openEdit}
        />
      )}

      {/* Insights View */}
      {view === 'insights' && (
        <InsightsPanel
          contacts={contacts}
          interactions={interactions}
          streakStatus={getStreakStatus}
          daysSince={getDaysSinceLastInteraction}
          onLogInteraction={openLogInteraction}
        />
      )}

      {/* List View - Contact Cards */}
      {view === 'list' && (filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <Users className="h-10 w-10 mx-auto text-muted-foreground/30" />
            {contacts.length === 0 ? (
              <div>
                <p className="text-foreground font-semibold">No contacts yet</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                  Keep track of the people who matter. Add contacts with notes, plans, and relationship tags.
                </p>
                <Button onClick={openNew} size="sm" className="mt-3 font-semibold">
                  <Plus className="h-4 w-4 mr-1" /> Add Your First Contact
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No matches found.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          <AnimatePresence>
            {filtered.map((contact, i) => {
              const tag = getTagInfo(contact.relationship);
              const influence = getInfluenceInfo(contact.influenceTag);
              const ring = getRingInfo(contact.circleRing);
              const isExpanded = expandedId === contact.id;
              const streak = getStreakStatus(contact);
              const daysSince = getDaysSinceLastInteraction(contact.id);
              const InfluenceIcon = influence.icon;
              const recentInteractions = isExpanded ? getInteractionsForContact(contact.id).slice(0, 5) : [];
              const contactCommitments = isExpanded ? getCommitmentsForContact(contact.id) : [];
              const activeCommits = contactCommitments.filter(c => !c.completedAt);
              const doneCommits = contactCommitments.filter(c => c.completedAt);

              return (
                <motion.div
                  key={contact.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card
                    className={`shadow-sm cursor-pointer transition-all ${isExpanded ? 'ring-1 ring-primary/20' : 'hover:shadow-md'}`}
                    onClick={() => setExpandedId(isExpanded ? null : contact.id)}
                  >
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-center gap-3">
                        {/* Avatar with streak ring */}
                        <div className="relative flex-shrink-0">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold ${streak !== 'no-goal' ? 'ring-2 ' + (streak === 'on-track' ? 'ring-green-400' : streak === 'due-soon' ? 'ring-amber-400' : 'ring-red-400') : ''}`}
                            style={{ backgroundColor: `hsl(${tag.color} / 0.15)`, color: `hsl(${tag.color})` }}
                          >
                            {contact.name.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm truncate">{contact.name}</span>
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1.5 py-0"
                              style={{
                                backgroundColor: `hsl(${tag.color} / 0.1)`,
                                borderColor: `hsl(${tag.color} / 0.3)`,
                                color: `hsl(${tag.color})`,
                              }}
                            >
                              {tag.label}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1.5 py-0 gap-0.5"
                              style={{
                                backgroundColor: `hsl(${influence.color} / 0.1)`,
                                borderColor: `hsl(${influence.color} / 0.3)`,
                                color: `hsl(${influence.color})`,
                              }}
                            >
                              <InfluenceIcon className="h-2.5 w-2.5" />
                              {influence.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {contact.plan && (
                              <div className="flex items-center gap-1">
                                <Target className="h-3 w-3 text-primary flex-shrink-0" />
                                <span className="text-[11px] text-muted-foreground truncate">{contact.plan}</span>
                              </div>
                            )}
                            {streak !== 'no-goal' && (
                              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 gap-0.5 border-0 ${STREAK_COLORS[streak]} ${STREAK_BG[streak]}`}>
                                <Clock className="h-2.5 w-2.5" />
                                {daysSince !== null ? `${daysSince}d` : 'Never'} · {STREAK_LABELS[streak]}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-muted-foreground">
                            {ring.label}
                          </Badge>
                          <button
                            onClick={e => { e.stopPropagation(); openLogInteraction(contact.id); }}
                            className="p-1.5 rounded hover:bg-primary/10 transition-colors"
                            title="Log interaction"
                          >
                            <Activity className="h-3.5 w-3.5 text-primary" />
                          </button>
                          {contact.phone && (
                            <a href={`tel:${contact.phone}`} onClick={e => e.stopPropagation()} className="p-1.5 rounded hover:bg-accent transition-colors">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            </a>
                          )}
                          <button onClick={e => { e.stopPropagation(); openEdit(contact); }} className="p-1.5 rounded hover:bg-accent transition-colors">
                            <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); handleDelete(contact.id); }} className="p-1.5 rounded hover:bg-destructive/10 transition-colors">
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </button>
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-3 pt-3 border-t border-border space-y-3"
                          >
                            {/* Contact details */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                              {contact.phone && (
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <Phone className="h-3 w-3" /> {contact.phone}
                                </span>
                              )}
                              {contact.email && (
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <Mail className="h-3 w-3" /> {contact.email}
                                </span>
                              )}
                              <span className="text-muted-foreground">
                                <span className="font-semibold text-foreground/70">Circle:</span> {ring.label}
                              </span>
                              {contact.interactionGoalDays && (
                                <span className="text-muted-foreground">
                                  <span className="font-semibold text-foreground/70">Goal:</span> Every {contact.interactionGoalDays}d
                                </span>
                              )}
                            </div>
                            {contact.notes && (
                              <div className="text-xs text-muted-foreground">
                                <span className="text-foreground/70 font-semibold">Notes:</span> {contact.notes}
                              </div>
                            )}
                            {contact.plan && (
                              <div className="text-xs">
                                <span className="text-primary font-semibold">Plan:</span> {contact.plan}
                              </div>
                            )}

                            {/* Commitments */}
                            <div className="pt-1">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-semibold text-foreground/70 flex items-center gap-1">
                                  <HandHeart className="h-3 w-3" /> Commitments
                                  {activeCommits.length > 0 && (
                                    <span className="text-primary">({activeCommits.length})</span>
                                  )}
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-2 text-[10px] gap-1"
                                  onClick={e => { e.stopPropagation(); openAddCommitment(contact.id); }}
                                >
                                  <Plus className="h-3 w-3" /> Add
                                </Button>
                              </div>
                              {contactCommitments.length === 0 ? (
                                <p className="text-[11px] text-muted-foreground/60 italic">No commitments yet</p>
                              ) : (
                                <div className="space-y-1.5">
                                  {activeCommits.map(commitment => {
                                    const isOverdue = commitment.dueDate && new Date(commitment.dueDate) < new Date();
                                    return (
                                      <div key={commitment.id} className="flex items-center gap-2 text-[11px] group">
                                        <button
                                          onClick={e => { e.stopPropagation(); completeCommitment(commitment.id); }}
                                          className="flex-shrink-0 hover:text-green-500 transition-colors"
                                        >
                                          <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                                        </button>
                                        <span className={`flex-1 ${isOverdue ? 'text-red-500' : 'text-foreground/80'}`}>
                                          {commitment.text}
                                        </span>
                                        {commitment.recurring && (
                                          <Repeat className="h-2.5 w-2.5 text-muted-foreground flex-shrink-0" title={commitment.recurring} />
                                        )}
                                        {commitment.dueDate && (
                                          <span className={`flex-shrink-0 ${isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground/60'}`}>
                                            {formatRelativeDate(commitment.dueDate)}
                                          </span>
                                        )}
                                        <button
                                          onClick={e => { e.stopPropagation(); deleteCommitment(commitment.id); }}
                                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10 transition-all flex-shrink-0"
                                        >
                                          <Trash2 className="h-2.5 w-2.5 text-destructive" />
                                        </button>
                                      </div>
                                    );
                                  })}
                                  {doneCommits.slice(0, 3).map(commitment => (
                                    <div key={commitment.id} className="flex items-center gap-2 text-[11px] group opacity-50">
                                      <button
                                        onClick={e => { e.stopPropagation(); uncompleteCommitment(commitment.id); }}
                                        className="flex-shrink-0 hover:text-amber-500 transition-colors"
                                      >
                                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                      </button>
                                      <span className="flex-1 line-through text-muted-foreground">{commitment.text}</span>
                                      <button
                                        onClick={e => { e.stopPropagation(); deleteCommitment(commitment.id); }}
                                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10 transition-all flex-shrink-0"
                                      >
                                        <Trash2 className="h-2.5 w-2.5 text-destructive" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Interaction History */}
                            <div className="pt-1">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-semibold text-foreground/70">Recent Interactions</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-2 text-[10px] gap-1"
                                  onClick={e => { e.stopPropagation(); openLogInteraction(contact.id); }}
                                >
                                  <Plus className="h-3 w-3" /> Log
                                </Button>
                              </div>
                              {recentInteractions.length === 0 ? (
                                <p className="text-[11px] text-muted-foreground/60 italic">No interactions logged yet</p>
                              ) : (
                                <div className="space-y-1.5">
                                  {recentInteractions.map(interaction => {
                                    const typeInfo = getInteractionTypeInfo(interaction.type);
                                    const TypeIcon = typeInfo.icon;
                                    const energy = interaction.energyAfter
                                      ? ENERGY_LEVELS.find(e => e.value === interaction.energyAfter)
                                      : null;
                                    return (
                                      <div key={interaction.id} className="flex items-center gap-2 text-[11px] group">
                                        <TypeIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                        <span className="font-medium text-foreground/80">{typeInfo.label}</span>
                                        {interaction.durationMinutes && (
                                          <span className="text-muted-foreground">{interaction.durationMinutes}m</span>
                                        )}
                                        {energy && (
                                          <span title={energy.label}>{energy.emoji}</span>
                                        )}
                                        {interaction.note && (
                                          <span className="text-muted-foreground truncate flex-1">{interaction.note}</span>
                                        )}
                                        <span className="text-muted-foreground/60 ml-auto flex-shrink-0">
                                          {formatRelativeDate(interaction.date)}
                                        </span>
                                        <button
                                          onClick={e => { e.stopPropagation(); deleteInteraction(interaction.id); }}
                                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10 transition-all"
                                        >
                                          <Trash2 className="h-2.5 w-2.5 text-destructive" />
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ))}

      {/* Add/Edit Contact Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              {editing ? 'Edit Person' : 'Add Person'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Name *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full name" className="h-9" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Relationship</Label>
                <Select value={form.relationship} onValueChange={v => setForm({ ...form, relationship: v as RelationshipTag })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIP_TAGS.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Inner Circle</Label>
                <Select value={form.circleRing} onValueChange={v => setForm({ ...form, circleRing: v as CircleRing })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CIRCLE_RINGS.map(r => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label} — {r.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Influence</Label>
                <Select value={form.influenceTag} onValueChange={v => setForm({ ...form, influenceTag: v as InfluenceTag })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INFLUENCE_TAGS.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Connect Every (days)
                </Label>
                <Input
                  value={form.interactionGoalDays}
                  onChange={e => setForm({ ...form, interactionGoalDays: e.target.value.replace(/\D/g, '') })}
                  placeholder="e.g. 7"
                  inputMode="numeric"
                  className="h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Phone</Label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="555-1234" className="h-9" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Email</Label>
                <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" className="h-9" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-1">
                <Target className="h-3 w-3 text-primary" /> Plan / Goal
              </Label>
              <Input value={form.plan} onChange={e => setForm({ ...form, plan: e.target.value })} placeholder="What's your goal with this person?" className="h-9" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Anything to remember..." className="min-h-[60px] text-xs" />
            </div>
            <Button onClick={handleSave} className="w-full font-semibold">
              {editing ? 'Update' : 'Add Person'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Log Interaction Dialog */}
      <Dialog open={interactionDialogOpen} onOpenChange={setInteractionDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Log Interaction
            </DialogTitle>
            {interactionContactName && (
              <p className="text-sm text-muted-foreground">with {interactionContactName}</p>
            )}
          </DialogHeader>
          <div className="space-y-4">
            {/* Interaction Type - button group */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Type</Label>
              <div className="grid grid-cols-4 gap-2">
                {INTERACTION_TYPES.map(t => {
                  const Icon = t.icon;
                  const selected = interactionForm.type === t.value;
                  return (
                    <button
                      key={t.value}
                      onClick={() => setInteractionForm({ ...interactionForm, type: t.value })}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-[10px] font-medium transition-all ${
                        selected
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:bg-accent'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Duration (minutes)</Label>
              <Input
                value={interactionForm.durationMinutes}
                onChange={e => setInteractionForm({ ...interactionForm, durationMinutes: e.target.value.replace(/\D/g, '') })}
                placeholder="e.g. 30"
                inputMode="numeric"
                className="h-9"
              />
            </div>

            {/* Energy After */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">How did you feel after?</Label>
              <div className="flex gap-1.5 justify-between">
                {ENERGY_LEVELS.map(e => {
                  const selected = interactionForm.energyAfter === e.value;
                  return (
                    <button
                      key={e.value}
                      onClick={() => setInteractionForm({
                        ...interactionForm,
                        energyAfter: selected ? null : e.value,
                      })}
                      className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg border flex-1 transition-all ${
                        selected
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:bg-accent'
                      }`}
                    >
                      <span className="text-lg">{e.emoji}</span>
                      <span className="text-[9px] text-muted-foreground">{e.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Note */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Note (optional)</Label>
              <Input
                value={interactionForm.note}
                onChange={e => setInteractionForm({ ...interactionForm, note: e.target.value })}
                placeholder="What did you talk about?"
                className="h-9"
              />
            </div>

            <Button onClick={handleLogInteraction} className="w-full font-semibold">
              Log Interaction
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Add Commitment Dialog */}
      <Dialog open={commitmentDialogOpen} onOpenChange={setCommitmentDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <HandHeart className="h-5 w-5 text-primary" />
              Add Commitment
            </DialogTitle>
            {commitmentContactName && (
              <p className="text-sm text-muted-foreground">to {commitmentContactName}</p>
            )}
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">What did you promise? *</Label>
              <Input
                value={commitmentForm.text}
                onChange={e => setCommitmentForm({ ...commitmentForm, text: e.target.value })}
                placeholder="e.g. Read that book they recommended"
                className="h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-1">
                  <CalendarClock className="h-3 w-3" /> Due Date
                </Label>
                <Input
                  type="date"
                  value={commitmentForm.dueDate}
                  onChange={e => setCommitmentForm({ ...commitmentForm, dueDate: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-1">
                  <Repeat className="h-3 w-3" /> Recurring
                </Label>
                <Select
                  value={commitmentForm.recurring || 'none'}
                  onValueChange={v => setCommitmentForm({ ...commitmentForm, recurring: v === 'none' ? '' : v as 'weekly' | 'biweekly' | 'monthly' })}
                >
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">One-time</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Biweekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={handleAddCommitment} className="w-full font-semibold">
              Add Commitment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Preview Dialog */}
      <Dialog open={importPreview !== null} onOpenChange={open => { if (!open) { setImportPreview(null); setImportDuplicates([]); } }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-4 w-4" /> Import Contacts
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {importPreview && importPreview.length > 0 ? (
              <>
                <p className="text-sm text-muted-foreground">
                  {importPreview.length} contact{importPreview.length !== 1 ? 's' : ''} ready to import
                  {importDuplicates.length > 0 && (
                    <span className="text-amber-500"> ({importDuplicates.length} duplicate{importDuplicates.length !== 1 ? 's' : ''} skipped)</span>
                  )}
                </p>
                <div className="max-h-[40vh] overflow-y-auto space-y-1.5 border rounded-lg p-2">
                  {importPreview.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm py-1.5 px-2 rounded-md bg-muted/30">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold flex-shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs truncate">{c.name}</p>
                        <div className="flex gap-2 text-[10px] text-muted-foreground">
                          {c.phone && <span className="flex items-center gap-0.5"><Phone className="h-2.5 w-2.5" />{c.phone}</span>}
                          {c.email && <span className="flex items-center gap-0.5 truncate"><Mail className="h-2.5 w-2.5" />{c.email}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Imported contacts will be added as <span className="font-medium">Distant</span> ring, <span className="font-medium">Neutral</span> influence. You can edit them after import.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => { setImportPreview(null); setImportDuplicates([]); }}>
                    Cancel
                  </Button>
                  <Button className="flex-1 font-semibold" onClick={handleConfirmImport}>
                    Import {importPreview.length} Contact{importPreview.length !== 1 ? 's' : ''}
                  </Button>
                </div>
              </>
            ) : importPreview && importPreview.length === 0 ? (
              <div className="text-center py-6">
                <Users className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm font-medium">All contacts are duplicates</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {importDuplicates.length} contact{importDuplicates.length !== 1 ? 's' : ''} already exist in your list.
                </p>
                <Button variant="outline" className="mt-4" onClick={() => { setImportPreview(null); setImportDuplicates([]); }}>
                  Close
                </Button>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
