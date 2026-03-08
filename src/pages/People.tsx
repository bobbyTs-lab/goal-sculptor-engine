import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Contact, RelationshipTag, loadContacts, saveContacts, generateId,
} from '@/lib/storage';
import {
  Users, Plus, Phone, Mail, Edit2, Trash2, Search, User, Target,
} from 'lucide-react';
import { toast } from 'sonner';
import { EmberCard, FlickerIn } from '@/components/EmberAnimations';
import { motion, AnimatePresence } from 'framer-motion';

const RELATIONSHIP_TAGS: { value: RelationshipTag; label: string; color: string }[] = [
  { value: 'family', label: 'Family', color: '350 80% 55%' },
  { value: 'friend', label: 'Friend', color: '210 80% 50%' },
  { value: 'coworker', label: 'Coworker', color: '170 70% 40%' },
  { value: 'mentor', label: 'Mentor', color: '42 100% 50%' },
  { value: 'mentee', label: 'Mentee', color: '280 80% 55%' },
  { value: 'partner', label: 'Partner', color: '130 100% 40%' },
  { value: 'acquaintance', label: 'Acquaintance', color: '60 20% 40%' },
  { value: 'other', label: 'Other', color: '200 20% 50%' },
];

const getTagInfo = (tag: RelationshipTag) =>
  RELATIONSHIP_TAGS.find(t => t.value === tag) || RELATIONSHIP_TAGS[RELATIONSHIP_TAGS.length - 1];

const emptyContact = (): Partial<Contact> => ({
  name: '', relationship: 'friend', phone: '', email: '', notes: '', plan: '',
});

export default function PeoplePage() {
  const [contacts, setContacts] = useState<Contact[]>(() => loadContacts());
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState<RelationshipTag | 'all'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState<Partial<Contact>>(emptyContact());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const persist = useCallback((updated: Contact[]) => {
    setContacts(updated);
    saveContacts(updated);
  }, []);

  const handleSave = () => {
    if (!form.name?.trim()) { toast.error('Name is required'); return; }
    if (editing) {
      persist(contacts.map(c => c.id === editing.id ? { ...c, ...form } as Contact : c));
      toast.success('Contact updated');
    } else {
      const newContact: Contact = {
        id: generateId(),
        name: form.name.trim(),
        relationship: form.relationship as RelationshipTag || 'friend',
        phone: form.phone || '',
        email: form.email || '',
        notes: form.notes || '',
        plan: form.plan || '',
        createdAt: new Date().toISOString(),
      };
      persist([newContact, ...contacts]);
      toast.success('Contact added');
    }
    setDialogOpen(false);
    setEditing(null);
    setForm(emptyContact());
  };

  const handleDelete = (id: string) => {
    persist(contacts.filter(c => c.id !== id));
    toast.success('Contact removed');
  };

  const openEdit = (contact: Contact) => {
    setEditing(contact);
    setForm({ ...contact });
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm(emptyContact());
    setDialogOpen(true);
  };

  const filtered = contacts.filter(c => {
    const matchesSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.notes.toLowerCase().includes(search.toLowerCase()) ||
      c.plan.toLowerCase().includes(search.toLowerCase());
    const matchesTag = filterTag === 'all' || c.relationship === filterTag;
    return matchesSearch && matchesTag;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <FlickerIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-gothic text-4xl gradient-alien-text glow-green-text ember-particles relative">People Board</h1>
            <p className="text-muted-foreground mt-1 font-medieval">Track relationships · Set plans · Stay connected</p>
          </div>
          <Button onClick={openNew} className="gradient-alien text-primary-foreground font-gothic gap-2">
            <Plus className="h-4 w-4" /> Add Person
          </Button>
        </div>
      </FlickerIn>

      <div className="divider-alien" />

      {/* Search & Filter */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search people..."
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Select value={filterTag} onValueChange={v => setFilterTag(v as RelationshipTag | 'all')}>
          <SelectTrigger className="w-36 h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tags</SelectItem>
            {RELATIONSHIP_TAGS.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-[11px] font-medieval text-muted-foreground">
        <span>{contacts.length} people</span>
        <span>{contacts.filter(c => c.plan).length} with plans</span>
      </div>

      {/* Contact Cards */}
      {filtered.length === 0 ? (
        <Card className="border-rough bg-card/50">
          <CardContent className="py-12 text-center">
            <Users className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medieval text-muted-foreground">
              {contacts.length === 0 ? 'No contacts yet. Add someone to get started!' : 'No matches found.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          <AnimatePresence>
            {filtered.map((contact, i) => {
              const tag = getTagInfo(contact.relationship);
              const isExpanded = expandedId === contact.id;
              return (
                <motion.div
                  key={contact.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card
                    className={`border-rough relative overflow-hidden scanlines bg-card/80 cursor-pointer transition-all ${isExpanded ? 'ring-1 ring-primary/30' : 'hover:bg-card/90'}`}
                    onClick={() => setExpandedId(isExpanded ? null : contact.id)}
                  >
                    <CardContent className="pt-3 pb-3 relative z-10">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-gothic flex-shrink-0"
                          style={{ backgroundColor: `hsl(${tag.color} / 0.2)`, color: `hsl(${tag.color})` }}
                        >
                          {contact.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medieval font-bold text-sm truncate">{contact.name}</span>
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1.5 py-0"
                              style={{
                                backgroundColor: `hsl(${tag.color} / 0.15)`,
                                borderColor: `hsl(${tag.color} / 0.4)`,
                                color: `hsl(${tag.color})`,
                              }}
                            >
                              {tag.label}
                            </Badge>
                          </div>
                          {contact.plan && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Target className="h-3 w-3 text-secondary flex-shrink-0" />
                              <span className="text-[11px] font-medieval text-muted-foreground truncate">{contact.plan}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {contact.phone && (
                            <a href={`tel:${contact.phone}`} onClick={e => e.stopPropagation()} className="p-1.5 rounded hover:bg-muted/50 transition-colors">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            </a>
                          )}
                          {contact.email && (
                            <a href={`mailto:${contact.email}`} onClick={e => e.stopPropagation()} className="p-1.5 rounded hover:bg-muted/50 transition-colors">
                              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                            </a>
                          )}
                          <button onClick={e => { e.stopPropagation(); openEdit(contact); }} className="p-1.5 rounded hover:bg-muted/50 transition-colors">
                            <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); handleDelete(contact.id); }} className="p-1.5 rounded hover:bg-destructive/20 transition-colors">
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </button>
                        </div>
                      </div>

                      {/* Expanded details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-3 pt-3 border-t border-border/30 space-y-2"
                          >
                            {contact.phone && (
                              <div className="flex items-center gap-2 text-xs font-medieval text-muted-foreground">
                                <Phone className="h-3 w-3" /> {contact.phone}
                              </div>
                            )}
                            {contact.email && (
                              <div className="flex items-center gap-2 text-xs font-medieval text-muted-foreground">
                                <Mail className="h-3 w-3" /> {contact.email}
                              </div>
                            )}
                            {contact.notes && (
                              <div className="text-xs font-medieval text-muted-foreground">
                                <span className="text-foreground/70 font-bold">Notes:</span> {contact.notes}
                              </div>
                            )}
                            {contact.plan && (
                              <div className="text-xs font-medieval">
                                <span className="text-secondary font-bold">Plan:</span> {contact.plan}
                              </div>
                            )}
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
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-rough scanlines bg-card max-w-md">
          <DialogHeader>
            <DialogTitle className="font-gothic gradient-alien-text flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              {editing ? 'Edit Person' : 'Add Person'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 relative z-10">
            <div className="space-y-2">
              <Label className="font-medieval text-xs">Name *</Label>
              <Input
                value={form.name || ''}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Full name"
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-medieval text-xs">Relationship</Label>
              <Select value={form.relationship || 'friend'} onValueChange={v => setForm({ ...form, relationship: v as RelationshipTag })}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONSHIP_TAGS.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="font-medieval text-xs">Phone</Label>
                <Input
                  value={form.phone || ''}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="555-1234"
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-medieval text-xs">Email</Label>
                <Input
                  value={form.email || ''}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="email@example.com"
                  className="h-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-medieval text-xs flex items-center gap-1">
                <Target className="h-3 w-3 text-secondary" /> Plan / Goal
              </Label>
              <Input
                value={form.plan || ''}
                onChange={e => setForm({ ...form, plan: e.target.value })}
                placeholder="What's your goal with this person?"
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-medieval text-xs">Notes</Label>
              <Textarea
                value={form.notes || ''}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Anything to remember..."
                className="min-h-[60px] text-xs"
              />
            </div>
            <Button onClick={handleSave} className="w-full gradient-alien text-primary-foreground font-gothic">
              {editing ? '⚔ Update' : '⚔ Add Person'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}