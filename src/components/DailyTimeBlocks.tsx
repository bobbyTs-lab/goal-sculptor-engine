import { useState, useRef, useCallback, useMemo } from 'react';
import { TimeBlock, BlockCategory, DEFAULT_CATEGORIES, loadBlockCategories, saveBlockCategories, loadTimeBlocks, saveTimeBlocks, generateId } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, X, GripVertical, Settings2, Palette, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const HOURS = Array.from({ length: 18 }, (_, i) => i + 5); // 5 AM to 10 PM
const SLOT_HEIGHT = 48; // px per 30-min slot
const HALF_SLOT = SLOT_HEIGHT;

function formatHour(h: number): string {
  const period = h >= 12 ? 'PM' : 'AM';
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${display} ${period}`;
}

function getBlockTop(block: TimeBlock): number {
  const slotIndex = (block.startHour - 5) * 2 + (block.startMinute >= 30 ? 1 : 0);
  return slotIndex * HALF_SLOT;
}

function getBlockHeight(block: TimeBlock): number {
  return (block.durationMinutes / 30) * HALF_SLOT;
}

interface DailyTimeBlocksProps {
  dayName: string;
  onToggleTodo?: (todoId: string) => void;
}

export default function DailyTimeBlocks({ dayName, onToggleTodo }: DailyTimeBlocksProps) {
  const [blocks, setBlocks] = useState<TimeBlock[]>(() => loadTimeBlocks());
  const [categories, setCategories] = useState<BlockCategory[]>(() => loadBlockCategories());
  const [editingBlock, setEditingBlock] = useState<string | null>(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('200 70% 50%');
  const [resizing, setResizing] = useState<{ blockId: string; startY: number; startDuration: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const dayBlocks = useMemo(() => 
    blocks.filter(b => b.dayName === dayName).sort((a, b) => {
      const aMin = a.startHour * 60 + a.startMinute;
      const bMin = b.startHour * 60 + b.startMinute;
      return aMin - bMin;
    }),
    [blocks, dayName]
  );

  const persist = useCallback((updated: TimeBlock[]) => {
    setBlocks(updated);
    saveTimeBlocks(updated);
  }, []);

  const persistCats = useCallback((updated: BlockCategory[]) => {
    setCategories(updated);
    saveBlockCategories(updated);
  }, []);

  const addBlock = useCallback((hour: number, minute: number) => {
    const newBlock: TimeBlock = {
      id: generateId(),
      dayName,
      categoryId: categories[0]?.id || 'workout',
      title: '',
      startHour: hour,
      startMinute: minute,
      durationMinutes: 60,
    };
    persist([...blocks, newBlock]);
    setEditingBlock(newBlock.id);
  }, [blocks, dayName, categories, persist]);

  const updateBlock = useCallback((blockId: string, updates: Partial<TimeBlock>) => {
    persist(blocks.map(b => b.id === blockId ? { ...b, ...updates } : b));
  }, [blocks, persist]);

  const deleteBlock = useCallback((blockId: string) => {
    persist(blocks.filter(b => b.id !== blockId));
    setEditingBlock(null);
    toast.success('Block removed');
  }, [blocks, persist]);

  const moveBlock = useCallback((blockId: string, direction: 'up' | 'down') => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    const delta = direction === 'up' ? -30 : 30;
    const newMinutes = block.startHour * 60 + block.startMinute + delta;
    if (newMinutes < 300 || newMinutes + block.durationMinutes > 1380) return; // 5AM-11PM bounds
    updateBlock(blockId, {
      startHour: Math.floor(newMinutes / 60),
      startMinute: newMinutes % 60,
    });
  }, [blocks, updateBlock]);

  const resizeBlock = useCallback((blockId: string, delta: number) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    const newDuration = Math.max(30, block.durationMinutes + delta);
    const endMinutes = block.startHour * 60 + block.startMinute + newDuration;
    if (endMinutes > 1380) return;
    updateBlock(blockId, { durationMinutes: newDuration });
  }, [blocks, updateBlock]);

  const addCategory = useCallback(() => {
    if (!newCatName.trim()) return;
    const cat: BlockCategory = { id: generateId(), name: newCatName.trim(), color: newCatColor };
    persistCats([...categories, cat]);
    setNewCatName('');
    toast.success(`Added "${cat.name}" category`);
  }, [categories, newCatName, newCatColor, persistCats]);

  const deleteCategory = useCallback((catId: string) => {
    if (DEFAULT_CATEGORIES.some(c => c.id === catId)) {
      toast.error("Can't delete default categories");
      return;
    }
    persistCats(categories.filter(c => c.id !== catId));
    // Remove blocks with this category
    persist(blocks.filter(b => b.categoryId !== catId));
  }, [categories, blocks, persistCats, persist]);

  const getCat = (catId: string) => categories.find(c => c.id === catId) || categories[0] || DEFAULT_CATEGORIES[0];

  const totalTimelineHeight = HOURS.length * 2 * HALF_SLOT;

  const COLOR_PRESETS = [
    '130 100% 40%', '42 100% 50%', '280 80% 55%', '210 80% 50%',
    '170 70% 40%', '350 80% 55%', '60 20% 40%', '20 90% 50%',
    '300 70% 50%', '160 60% 45%',
  ];

  return (
    <div className="space-y-3">
      {/* Header controls */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medieval text-muted-foreground">Tap a time slot to add a block</span>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto text-xs font-medieval gap-1"
          onClick={() => setShowCategoryManager(!showCategoryManager)}
        >
          <Palette className="h-3.5 w-3.5" />
          Categories
        </Button>
      </div>

      {/* Category manager */}
      <AnimatePresence>
        {showCategoryManager && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="border border-border/30 rounded-lg p-3 space-y-3 bg-muted/10">
              <div className="flex flex-wrap gap-1.5">
                {categories.map(cat => (
                  <div key={cat.id} className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medieval border border-border/30" style={{ backgroundColor: `hsl(${cat.color} / 0.2)`, borderColor: `hsl(${cat.color} / 0.4)` }}>
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: `hsl(${cat.color})` }} />
                    {cat.name}
                    {!DEFAULT_CATEGORIES.some(c => c.id === cat.id) && (
                      <button onClick={() => deleteCategory(cat.id)} className="ml-1 opacity-50 hover:opacity-100">
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="New category..."
                  className="h-7 text-xs flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="w-7 h-7 rounded border border-border/30 flex-shrink-0" style={{ backgroundColor: `hsl(${newCatColor})` }} />
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2" align="end">
                    <div className="grid grid-cols-5 gap-1.5">
                      {COLOR_PRESETS.map(c => (
                        <button
                          key={c}
                          onClick={() => setNewCatColor(c)}
                          className={`w-6 h-6 rounded-sm border-2 transition-all ${c === newCatColor ? 'border-foreground scale-110' : 'border-transparent'}`}
                          style={{ backgroundColor: `hsl(${c})` }}
                        />
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={addCategory}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category legend - quick add */}
      <div className="flex flex-wrap gap-1">
        {categories.map(cat => (
          <Badge
            key={cat.id}
            variant="outline"
            className="text-[10px] font-medieval cursor-default"
            style={{ 
              backgroundColor: `hsl(${cat.color} / 0.15)`,
              borderColor: `hsl(${cat.color} / 0.4)`,
              color: `hsl(${cat.color})`,
            }}
          >
            {cat.name}
          </Badge>
        ))}
      </div>

      {/* TIMELINE */}
      <div className="relative border border-border/30 rounded-lg overflow-hidden bg-card/30" ref={containerRef}>
        <div className="relative" style={{ height: totalTimelineHeight }}>
          {/* Hour lines & labels */}
          {HOURS.map((hour) => {
            const yPos = (hour - 5) * 2 * HALF_SLOT;
            return (
              <div key={hour} className="absolute left-0 right-0" style={{ top: yPos }}>
                {/* Full hour line */}
                <div className="flex items-start">
                  <span className="w-14 text-[10px] font-medieval text-muted-foreground text-right pr-2 -mt-1.5 flex-shrink-0">
                    {formatHour(hour)}
                  </span>
                  <div className="flex-1 border-t border-border/30" />
                </div>
                {/* Half hour line */}
                <div className="absolute left-14 right-0 border-t border-border/10" style={{ top: HALF_SLOT }} />
                
                {/* Clickable slots */}
                <button
                  onClick={() => addBlock(hour, 0)}
                  className="absolute left-14 right-0 hover:bg-primary/5 transition-colors cursor-pointer"
                  style={{ top: 0, height: HALF_SLOT }}
                />
                <button
                  onClick={() => addBlock(hour, 30)}
                  className="absolute left-14 right-0 hover:bg-primary/5 transition-colors cursor-pointer"
                  style={{ top: HALF_SLOT, height: HALF_SLOT }}
                />
              </div>
            );
          })}

          {/* Time Blocks */}
          {dayBlocks.map((block) => {
            const cat = getCat(block.categoryId);
            const top = getBlockTop(block);
            const height = getBlockHeight(block);
            const isEditing = editingBlock === block.id;

            return (
              <motion.div
                key={block.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`absolute left-16 right-2 rounded-md border-l-4 cursor-pointer transition-shadow ${isEditing ? 'z-20 ring-1 ring-foreground/20' : 'z-10 hover:shadow-lg'}`}
                style={{
                  top,
                  height: Math.max(height, 36),
                  backgroundColor: `hsl(${cat.color} / 0.2)`,
                  borderLeftColor: `hsl(${cat.color})`,
                }}
                onClick={() => setEditingBlock(isEditing ? null : block.id)}
              >
                <div className="px-2 py-1 h-full flex flex-col justify-between overflow-hidden">
                  <div className="flex items-start gap-1.5">
                    {block.todoId && onToggleTodo && (
                      <Checkbox
                        checked={block.done || false}
                        onCheckedChange={() => {
                          updateBlock(block.id, { done: !block.done });
                          if (block.todoId) onToggleTodo(block.todoId);
                        }}
                        className="h-3.5 w-3.5 mt-0.5 flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                    {isEditing ? (
                      <Input
                        autoFocus
                        value={block.title}
                        onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                        placeholder="Block title..."
                        className="h-5 text-xs border-none bg-transparent p-0 focus-visible:ring-0"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingBlock(null)}
                      />
                    ) : (
                      <span className={`text-xs font-medieval font-medium truncate ${block.done ? 'line-through opacity-50' : ''}`} style={{ color: `hsl(${cat.color})` }}>
                        {block.title || cat.name}
                      </span>
                    )}
                  </div>

                  {/* Time label */}
                  {height >= 40 && (
                    <span className="text-[9px] font-medieval text-muted-foreground">
                      {formatHour(block.startHour)}{block.startMinute > 0 ? ':30' : ''} — {(() => {
                        const endMin = block.startHour * 60 + block.startMinute + block.durationMinutes;
                        const endH = Math.floor(endMin / 60);
                        const endM = endMin % 60;
                        return `${formatHour(endH)}${endM > 0 ? ':30' : ''}`;
                      })()}
                    </span>
                  )}
                </div>

                {/* Edit controls overlay */}
                <AnimatePresence>
                  {isEditing && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute -right-1 top-0 bottom-0 flex flex-col items-center justify-center gap-1 pr-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button onClick={() => moveBlock(block.id, 'up')} className="p-0.5 rounded bg-background/80 border border-border/30 hover:bg-muted/50">
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button onClick={() => moveBlock(block.id, 'down')} className="p-0.5 rounded bg-background/80 border border-border/30 hover:bg-muted/50">
                        <ChevronDown className="h-3 w-3" />
                      </button>
                      <button onClick={() => resizeBlock(block.id, 30)} className="p-0.5 rounded bg-background/80 border border-border/30 hover:bg-muted/50 text-[8px] font-bold">
                        +
                      </button>
                      <button onClick={() => resizeBlock(block.id, -30)} className="p-0.5 rounded bg-background/80 border border-border/30 hover:bg-muted/50 text-[8px] font-bold">
                        −
                      </button>
                      <button onClick={() => deleteBlock(block.id)} className="p-0.5 rounded bg-destructive/20 border border-destructive/30 hover:bg-destructive/40">
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Category picker when editing */}
                {isEditing && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute left-0 right-0 -bottom-8 flex gap-1 px-1 z-30"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {categories.map(c => (
                      <button
                        key={c.id}
                        onClick={() => updateBlock(block.id, { categoryId: c.id })}
                        className={`w-4 h-4 rounded-sm border-2 transition-all ${c.id === block.categoryId ? 'border-foreground scale-125' : 'border-transparent'}`}
                        style={{ backgroundColor: `hsl(${c.color})` }}
                        title={c.name}
                      />
                    ))}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
