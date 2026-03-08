import { useState, useCallback } from 'react';
import {
  RepeatableBlock, RepeatPattern, BlockCategory,
  loadRepeatableBlocks, saveRepeatableBlocks, generateId,
  loadBlockCategories, DEFAULT_CATEGORIES,
} from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Repeat, Plus, Trash2, Clock, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const PATTERN_LABELS: Record<RepeatPattern, string> = {
  daily: 'Every Day',
  weekdays: 'Weekdays (Mon–Fri)',
  weekends: 'Weekends (Sat–Sun)',
  custom: 'Custom Days',
};

function formatTime(h: number, m: number): string {
  const period = h >= 12 ? 'PM' : 'AM';
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${display} ${period}` : `${display}:${String(m).padStart(2, '0')} ${period}`;
}

function shouldShowOnDay(block: RepeatableBlock, dayName: string): boolean {
  if (!block.enabled) return false;
  switch (block.repeatPattern) {
    case 'daily': return true;
    case 'weekdays': return !['Saturday', 'Sunday'].includes(dayName);
    case 'weekends': return ['Saturday', 'Sunday'].includes(dayName);
    case 'custom': return block.customDays?.includes(dayName) ?? false;
  }
}

export { shouldShowOnDay };

interface Props {
  onChanged?: () => void;
}

export default function RepeatableBlockManager({ onChanged }: Props) {
  const [blocks, setBlocks] = useState<RepeatableBlock[]>(() => loadRepeatableBlocks());
  const [categories] = useState<BlockCategory[]>(() => loadBlockCategories());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RepeatableBlock | null>(null);
  const [form, setForm] = useState<Partial<RepeatableBlock>>({});

  const persist = useCallback((updated: RepeatableBlock[]) => {
    setBlocks(updated);
    saveRepeatableBlocks(updated);
    onChanged?.();
  }, [onChanged]);

  const getCat = (id: string) => categories.find(c => c.id === id) || DEFAULT_CATEGORIES[0];

  const openNew = () => {
    setEditing(null);
    setForm({
      title: '', categoryId: categories[0]?.id || 'workout',
      startHour: 6, startMinute: 0, durationMinutes: 30,
      repeatPattern: 'daily', customDays: [], enabled: true,
    });
    setDialogOpen(true);
  };

  const openEdit = (b: RepeatableBlock) => {
    setEditing(b);
    setForm({ ...b });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.title?.trim()) { toast.error('Title required'); return; }
    if (editing) {
      persist(blocks.map(b => b.id === editing.id ? { ...b, ...form } as RepeatableBlock : b));
      toast.success('Template updated');
    } else {
      persist([...blocks, {
        id: generateId(),
        title: form.title!.trim(),
        categoryId: form.categoryId || 'workout',
        startHour: form.startHour ?? 6,
        startMinute: form.startMinute ?? 0,
        durationMinutes: form.durationMinutes ?? 30,
        repeatPattern: form.repeatPattern || 'daily',
        customDays: form.customDays || [],
        enabled: true,
      }]);
      toast.success('Template created');
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    persist(blocks.filter(b => b.id !== id));
    toast.success('Template removed');
  };

  const toggleEnabled = (id: string) => {
    persist(blocks.map(b => b.id === id ? { ...b, enabled: !b.enabled } : b));
  };

  const toggleCustomDay = (day: string) => {
    const current = form.customDays || [];
    setForm({
      ...form,
      customDays: current.includes(day) ? current.filter(d => d !== day) : [...current, day],
    });
  };

  const hours = Array.from({ length: 19 }, (_, i) => i + 5); // 5 AM to 11 PM

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Repeat className="h-4 w-4 text-secondary" />
          <span className="font-gothic text-sm gradient-alien-text">Repeatable Templates</span>
        </div>
        <Button variant="ghost" size="sm" className="text-xs font-medieval gap-1" onClick={openNew}>
          <Plus className="h-3 w-3" /> New Template
        </Button>
      </div>

      {blocks.length === 0 ? (
        <p className="text-[11px] font-medieval text-muted-foreground italic">
          No templates yet. Create one to auto-populate your daily schedule.
        </p>
      ) : (
        <div className="space-y-1.5">
          <AnimatePresence>
            {blocks.map(block => {
              const cat = getCat(block.categoryId);
              return (
                <motion.div
                  key={block.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs font-medieval transition-all ${
                    block.enabled ? 'border-border/40 bg-card/50' : 'border-border/20 bg-muted/10 opacity-50'
                  }`}
                >
                  <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: `hsl(${cat.color})` }} />
                  <span className="font-medium truncate flex-1">{block.title}</span>
                  <span className="text-[9px] text-muted-foreground flex-shrink-0">
                    {formatTime(block.startHour, block.startMinute)} · {block.durationMinutes}m
                  </span>
                  <Badge variant="outline" className="text-[8px] px-1 py-0 flex-shrink-0">
                    {block.repeatPattern === 'custom' ? (block.customDays?.map(d => d.slice(0, 3)).join(', ') || 'None') : PATTERN_LABELS[block.repeatPattern]}
                  </Badge>
                  <Switch
                    checked={block.enabled}
                    onCheckedChange={() => toggleEnabled(block.id)}
                    className="scale-75"
                  />
                  <button onClick={() => openEdit(block)} className="p-1 hover:bg-muted/50 rounded">
                    <Edit2 className="h-3 w-3 text-muted-foreground" />
                  </button>
                  <button onClick={() => handleDelete(block.id)} className="p-1 hover:bg-destructive/20 rounded">
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-rough scanlines bg-card max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-gothic gradient-alien-text flex items-center gap-2">
              <Repeat className="h-5 w-5 text-secondary" />
              {editing ? 'Edit Template' : 'New Repeatable Block'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 relative z-10">
            <div className="space-y-2">
              <Label className="font-medieval text-xs">Title *</Label>
              <Input
                value={form.title || ''}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="Morning Workout"
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-medieval text-xs">Category</Label>
              <Select value={form.categoryId || ''} onValueChange={v => setForm({ ...form, categoryId: v })}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: `hsl(${c.color})` }} />
                        {c.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2">
                <Label className="font-medieval text-xs">Start Hour</Label>
                <Select value={String(form.startHour ?? 6)} onValueChange={v => setForm({ ...form, startHour: Number(v) })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {hours.map(h => (
                      <SelectItem key={h} value={String(h)}>{formatTime(h, 0)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-medieval text-xs">Minute</Label>
                <Select value={String(form.startMinute ?? 0)} onValueChange={v => setForm({ ...form, startMinute: Number(v) })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => (
                      <SelectItem key={m} value={String(m)}>{String(m).padStart(2, '0')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-medieval text-xs">Duration</Label>
                <Select value={String(form.durationMinutes ?? 30)} onValueChange={v => setForm({ ...form, durationMinutes: Number(v) })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[15, 30, 45, 60, 90, 120].map(d => (
                      <SelectItem key={d} value={String(d)}>{d} min</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-medieval text-xs">Repeat Pattern</Label>
              <Select value={form.repeatPattern || 'daily'} onValueChange={v => setForm({ ...form, repeatPattern: v as RepeatPattern })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(PATTERN_LABELS) as RepeatPattern[]).map(p => (
                    <SelectItem key={p} value={p}>{PATTERN_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.repeatPattern === 'custom' && (
              <div className="space-y-2">
                <Label className="font-medieval text-xs">Select Days</Label>
                <div className="flex gap-1.5 flex-wrap">
                  {DAYS_OF_WEEK.map((day, i) => (
                    <button
                      key={day}
                      onClick={() => toggleCustomDay(day)}
                      className={`px-2 py-1 text-[10px] font-medieval rounded border transition-all ${
                        form.customDays?.includes(day)
                          ? 'bg-primary/20 border-primary/50 text-primary'
                          : 'border-border/30 text-muted-foreground hover:border-primary/30'
                      }`}
                    >
                      {DAY_SHORT[i]}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <Button onClick={handleSave} className="w-full gradient-alien text-primary-foreground font-gothic">
              {editing ? '⚔ Update Template' : '⚔ Create Template'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}