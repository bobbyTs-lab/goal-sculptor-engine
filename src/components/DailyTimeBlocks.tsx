import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { TimeBlock, BlockCategory, DEFAULT_CATEGORIES, loadBlockCategories, saveBlockCategories, loadTimeBlocks, saveTimeBlocks, generateId, loadRepeatableBlocks, RepeatableBlock, Contact } from '@/lib/storage';
import { shouldShowOnDay } from '@/components/RepeatableBlockManager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, X, Palette, Trash2, Link2, Unlink, Repeat, Target, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

// 5 AM to 10 PM, 5-minute granularity
const START_HOUR = 5;
const END_HOUR = 23; // exclusive
const MINUTES_PER_PIXEL = 1; // 1 px = 1 minute
const PIXEL_PER_MINUTE = 1;
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;
const TOTAL_HEIGHT = TOTAL_MINUTES * PIXEL_PER_MINUTE;
const SNAP_MINUTES = 5;
const LABEL_WIDTH = 56; // px for time labels column
const MIN_DURATION = 5;

function minutesToTop(minutes: number): number {
  return (minutes - START_HOUR * 60) * PIXEL_PER_MINUTE;
}

function topToMinutes(top: number): number {
  return Math.round(top / PIXEL_PER_MINUTE) + START_HOUR * 60;
}

function snapMinutes(m: number): number {
  return Math.round(m / SNAP_MINUTES) * SNAP_MINUTES;
}

function formatTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${display} ${period}` : `${display}:${String(m).padStart(2, '0')} ${period}`;
}

function blockStartMinutes(b: TimeBlock): number {
  return b.startHour * 60 + b.startMinute;
}

function blockEndMinutes(b: TimeBlock): number {
  return blockStartMinutes(b) + b.durationMinutes;
}

// Column-packing algorithm for overlapping blocks
interface LayoutInfo {
  column: number;
  totalColumns: number;
}

function computeColumns(blocks: TimeBlock[]): Map<string, LayoutInfo> {
  const sorted = [...blocks].sort((a, b) => blockStartMinutes(a) - blockStartMinutes(b));
  const result = new Map<string, LayoutInfo>();
  
  // Assign columns greedily
  const columns: { endMinute: number; blockId: string }[][] = [];
  
  for (const block of sorted) {
    const start = blockStartMinutes(block);
    const end = blockEndMinutes(block);
    
    // Find first column where this block fits (no overlap)
    let placed = false;
    for (let col = 0; col < columns.length; col++) {
      const lastInCol = columns[col][columns[col].length - 1];
      if (lastInCol.endMinute <= start) {
        columns[col].push({ endMinute: end, blockId: block.id });
        result.set(block.id, { column: col, totalColumns: 0 }); // totalColumns set later
        placed = true;
        break;
      }
    }
    if (!placed) {
      columns.push([{ endMinute: end, blockId: block.id }]);
      result.set(block.id, { column: columns.length - 1, totalColumns: 0 });
    }
  }

  // For each block, find how many columns overlap with it
  for (const block of sorted) {
    const start = blockStartMinutes(block);
    const end = blockEndMinutes(block);
    
    // Find all blocks that overlap with this one
    const overlapping = sorted.filter(other => {
      const oStart = blockStartMinutes(other);
      const oEnd = blockEndMinutes(other);
      return oStart < end && oEnd > start;
    });
    
    // The max column index among overlapping blocks + 1
    let maxCol = 0;
    for (const o of overlapping) {
      const info = result.get(o.id);
      if (info) maxCol = Math.max(maxCol, info.column);
    }
    const totalCols = maxCol + 1;
    
    // Update all overlapping blocks to share the same totalColumns
    for (const o of overlapping) {
      const info = result.get(o.id);
      if (info) {
        info.totalColumns = Math.max(info.totalColumns, totalCols);
      }
    }
  }

  // Ensure minimum of 1 column
  for (const [, info] of result) {
    if (info.totalColumns === 0) info.totalColumns = 1;
  }

  return result;
}

export interface BacklogTodo {
  todoId: string;
  title: string;
  goalTitle: string;
  goalId?: string;
  phaseTitle?: string;
  taskTitle?: string;
}

interface DailyTimeBlocksProps {
  dayName: string;
  onToggleTodo?: (todoId: string) => void;
  backlogTodos?: BacklogTodo[];
  contacts?: Contact[];
}

export default function DailyTimeBlocks({ dayName, onToggleTodo, backlogTodos = [], contacts = [] }: DailyTimeBlocksProps) {
  const [blocks, setBlocks] = useState<TimeBlock[]>(() => loadTimeBlocks());
  const [categories, setCategories] = useState<BlockCategory[]>(() => loadBlockCategories());
  const [editingBlock, setEditingBlock] = useState<string | null>(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('200 70% 50%');
  
  // Drag state
  const [dragging, setDragging] = useState<{ blockId: string; offsetMin: number } | null>(null);
  const [dragPreviewMin, setDragPreviewMin] = useState<number | null>(null);
  
  // Resize state
  const [resizeDrag, setResizeDrag] = useState<{ blockId: string; startY: number; startDuration: number } | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);

  const dayBlocks = useMemo(() => 
    blocks.filter(b => b.dayName === dayName).sort((a, b) => blockStartMinutes(a) - blockStartMinutes(b)),
    [blocks, dayName]
  );

  // Auto-populate from repeatable templates
  useEffect(() => {
    const templates = loadRepeatableBlocks();
    const applicableTemplates = templates.filter(t => shouldShowOnDay(t, dayName));
    const existingBlocks = blocks.filter(b => b.dayName === dayName);
    
    const newBlocks: TimeBlock[] = [];
    for (const tpl of applicableTemplates) {
      // Check if a block with this template's title already exists for this day
      const alreadyExists = existingBlocks.some(b => 
        b.title === tpl.title && b.startHour === tpl.startHour && b.startMinute === tpl.startMinute
      );
      if (!alreadyExists) {
        newBlocks.push({
          id: generateId(),
          dayName,
          categoryId: tpl.categoryId,
          title: tpl.title,
          startHour: tpl.startHour,
          startMinute: tpl.startMinute,
          durationMinutes: tpl.durationMinutes,
        });
      }
    }
    if (newBlocks.length > 0) {
      persist([...blocks, ...newBlocks]);
    }
  }, [dayName]); // only on day change

  const columnLayout = useMemo(() => computeColumns(dayBlocks), [dayBlocks]);

  const persist = useCallback((updated: TimeBlock[]) => {
    setBlocks(updated);
    saveTimeBlocks(updated);
  }, []);

  const persistCats = useCallback((updated: BlockCategory[]) => {
    setCategories(updated);
    saveBlockCategories(updated);
  }, []);

  const addBlock = useCallback((minuteOfDay: number) => {
    const snapped = snapMinutes(minuteOfDay);
    const newBlock: TimeBlock = {
      id: generateId(),
      dayName,
      categoryId: categories[0]?.id || 'workout',
      title: '',
      startHour: Math.floor(snapped / 60),
      startMinute: snapped % 60,
      durationMinutes: 30,
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

  const linkTodo = useCallback((blockId: string, todoId: string, title: string) => {
    updateBlock(blockId, { todoId, title });
    toast.success('Todo linked');
  }, [updateBlock]);

  const unlinkTodo = useCallback((blockId: string) => {
    updateBlock(blockId, { todoId: undefined, title: '' });
  }, [updateBlock]);

  const linkContact = useCallback((blockId: string, contactId: string, contactName: string) => {
    const block = blocks.find(b => b.id === blockId);
    const currentTitle = block?.title || '';
    const newTitle = currentTitle ? `${currentTitle} w/ ${contactName}` : `w/ ${contactName}`;
    updateBlock(blockId, { contactId, title: newTitle });
    toast.success(`Linked ${contactName}`);
  }, [blocks, updateBlock]);

  const unlinkContact = useCallback((blockId: string) => {
    updateBlock(blockId, { contactId: undefined });
  }, [updateBlock]);

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
    persist(blocks.filter(b => b.categoryId !== catId));
  }, [categories, blocks, persistCats, persist]);

  const getCat = (catId: string) => categories.find(c => c.id === catId) || categories[0] || DEFAULT_CATEGORIES[0];

  // ─── Pointer handlers for drag ───
  const handleBlockPointerDown = useCallback((e: React.PointerEvent, blockId: string) => {
    if ((e.target as HTMLElement).closest('[data-resize-handle]') || 
        (e.target as HTMLElement).closest('input') ||
        (e.target as HTMLElement).closest('button')) return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    
    const blockTopMin = blockStartMinutes(block);
    const pointerMin = topToMinutes(e.clientY - rect.top + (containerRef.current?.scrollTop || 0));
    const offsetMin = pointerMin - blockTopMin;
    
    setDragging({ blockId, offsetMin });
    setDragPreviewMin(blockTopMin);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    e.preventDefault();
  }, [blocks]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const pointerMin = topToMinutes(e.clientY - rect.top + (containerRef.current?.scrollTop || 0));

    if (dragging) {
      const rawMin = pointerMin - dragging.offsetMin;
      const block = blocks.find(b => b.id === dragging.blockId);
      if (!block) return;
      const snapped = snapMinutes(Math.max(START_HOUR * 60, Math.min(rawMin, END_HOUR * 60 - block.durationMinutes)));
      setDragPreviewMin(snapped);
    }
    
    if (resizeDrag) {
      const block = blocks.find(b => b.id === resizeDrag.blockId);
      if (!block) return;
      const startMin = blockStartMinutes(block);
      const deltaY = e.clientY - resizeDrag.startY;
      const deltaMin = deltaY / PIXEL_PER_MINUTE;
      const newDuration = snapMinutes(Math.max(MIN_DURATION, resizeDrag.startDuration + deltaMin));
      const maxDuration = END_HOUR * 60 - startMin;
      const clampedDuration = Math.min(newDuration, maxDuration);
      updateBlock(resizeDrag.blockId, { durationMinutes: clampedDuration });
    }
  }, [dragging, resizeDrag, blocks, updateBlock]);

  const handlePointerUp = useCallback(() => {
    if (dragging && dragPreviewMin !== null) {
      const snapped = snapMinutes(dragPreviewMin);
      updateBlock(dragging.blockId, {
        startHour: Math.floor(snapped / 60),
        startMinute: snapped % 60,
      });
    }
    setDragging(null);
    setDragPreviewMin(null);
    setResizeDrag(null);
  }, [dragging, dragPreviewMin, updateBlock]);

  const handleResizePointerDown = useCallback((e: React.PointerEvent, blockId: string) => {
    e.stopPropagation();
    e.preventDefault();
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    setResizeDrag({ blockId, startY: e.clientY, startDuration: block.durationMinutes });
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [blocks]);

  // Click on empty timeline to add block
  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (dragging || resizeDrag) return;
    if ((e.target as HTMLElement).closest('[data-block]')) return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const y = e.clientY - rect.top + (containerRef.current?.scrollTop || 0);
    const minuteOfDay = topToMinutes(y);
    if (minuteOfDay >= START_HOUR * 60 && minuteOfDay < END_HOUR * 60) {
      addBlock(minuteOfDay);
    }
  }, [addBlock, dragging, resizeDrag]);

  // Generate hour lines
  const hourLines = useMemo(() => {
    const lines = [];
    for (let h = START_HOUR; h < END_HOUR; h++) {
      lines.push({ hour: h, top: minutesToTop(h * 60) });
    }
    return lines;
  }, []);

  const COLOR_PRESETS = [
    '130 100% 40%', '42 100% 50%', '280 80% 55%', '210 80% 50%',
    '170 70% 40%', '350 80% 55%', '60 20% 40%', '20 90% 50%',
    '300 70% 50%', '160 60% 45%',
  ];

  return (
    <div className="flex flex-col h-full space-y-2 p-2">
      {/* Header */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[10px] md:text-xs font-medieval text-muted-foreground">Tap to add · Drag to move</span>
        <Button variant="ghost" size="sm" className="ml-auto text-xs font-medieval gap-1" onClick={() => setShowCategoryManager(!showCategoryManager)}>
          <Palette className="h-3.5 w-3.5" />
          Categories
        </Button>
      </div>

      {/* Category manager */}
      <AnimatePresence>
        {showCategoryManager && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
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
                <Input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="New category..." className="h-7 text-xs flex-1" onKeyDown={(e) => e.key === 'Enter' && addCategory()} />
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="w-7 h-7 rounded border border-border/30 flex-shrink-0" style={{ backgroundColor: `hsl(${newCatColor})` }} />
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2" align="end">
                    <div className="grid grid-cols-5 gap-1.5">
                      {COLOR_PRESETS.map(c => (
                        <button key={c} onClick={() => setNewCatColor(c)} className={`w-6 h-6 rounded-sm border-2 transition-all ${c === newCatColor ? 'border-foreground scale-110' : 'border-transparent'}`} style={{ backgroundColor: `hsl(${c})` }} />
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

      {/* Category legend — hidden on mobile */}
      <div className="hidden md:flex flex-wrap gap-1 flex-shrink-0">
        {categories.map(cat => (
          <Badge key={cat.id} variant="outline" className="text-[10px] font-medieval cursor-default" style={{ backgroundColor: `hsl(${cat.color} / 0.15)`, borderColor: `hsl(${cat.color} / 0.4)`, color: `hsl(${cat.color})` }}>
            {cat.name}
          </Badge>
        ))}
      </div>

      {/* TIMELINE */}
      <div
        ref={containerRef}
        className="relative rounded-lg overflow-y-auto bg-card/30 select-none flex-1 min-h-0"
        style={{ cursor: dragging ? 'grabbing' : 'default' }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleTimelineClick}
      >
        <div className="relative" style={{ height: TOTAL_HEIGHT }}>
          {/* Hour lines & labels */}
          {hourLines.map(({ hour, top }) => (
            <div key={hour} className="absolute left-0 right-0" style={{ top }}>
              <div className="flex items-start">
                <span className="text-[10px] font-medieval text-muted-foreground text-right pr-2 -mt-1.5 flex-shrink-0" style={{ width: LABEL_WIDTH }}>
                  {formatTime(hour * 60)}
                </span>
                <div className="flex-1 border-t border-border/30" />
              </div>
              {/* 30-min dashed line */}
              <div className="absolute right-0 border-t border-dashed border-border/15" style={{ top: 30 * PIXEL_PER_MINUTE, left: LABEL_WIDTH }} />
            </div>
          ))}

          {/* Time Blocks */}
          {dayBlocks.map((block) => {
            const cat = getCat(block.categoryId);
            const layout = columnLayout.get(block.id) || { column: 0, totalColumns: 1 };
            const isDragging = dragging?.blockId === block.id;
            const isEditing = editingBlock === block.id;
            
            const startMin = isDragging && dragPreviewMin !== null ? dragPreviewMin : blockStartMinutes(block);
            const top = minutesToTop(startMin);
            const height = Math.max(block.durationMinutes * PIXEL_PER_MINUTE, MIN_DURATION * PIXEL_PER_MINUTE);
            
            const availableWidth = `calc(100% - ${LABEL_WIDTH + 8}px)`;
            const colWidth = `calc(${availableWidth} / ${layout.totalColumns})`;
            const colLeft = `calc(${LABEL_WIDTH}px + ${availableWidth} * ${layout.column} / ${layout.totalColumns})`;

            return (
              <div
                key={block.id}
                data-block
                className={`absolute rounded-md border-l-4 transition-shadow ${isDragging ? 'z-30 opacity-80 scale-[1.02] shadow-xl cursor-grabbing' : isEditing ? 'z-20 ring-1 ring-foreground/20' : 'z-10 hover:shadow-lg cursor-grab'}`}
                style={{
                  top,
                  height,
                  left: colLeft,
                  width: colWidth,
                  backgroundColor: `hsl(${cat.color} / 0.2)`,
                  borderLeftColor: `hsl(${cat.color})`,
                  touchAction: 'none',
                }}
                onPointerDown={(e) => handleBlockPointerDown(e, block.id)}
                onClick={(e) => { e.stopPropagation(); setEditingBlock(isEditing ? null : block.id); }}
              >
                <div className="px-2 py-1 h-full flex flex-col overflow-hidden">
                  <div className="flex items-start gap-1.5 min-h-0">
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
                  {height >= 30 && (
                    <span className="text-[9px] font-medieval text-muted-foreground mt-auto">
                      {formatTime(blockStartMinutes(block))} — {formatTime(blockEndMinutes(block))}
                    </span>
                  )}
                </div>

                {/* Edit controls */}
                <AnimatePresence>
                  {isEditing && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute -right-1 top-0 flex flex-col items-center gap-1 pr-1 pt-1 z-40"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Link todo */}
                      {!block.todoId && backlogTodos.length > 0 && (
                        <TodoLinkPicker
                          backlogTodos={backlogTodos}
                          onLink={(todoId, title) => linkTodo(block.id, todoId, title)}
                        />
                      )}
                      {block.todoId && (
                        <button onClick={() => unlinkTodo(block.id)} className="p-0.5 rounded bg-background/80 border border-border/30 hover:bg-muted/50" title="Unlink todo">
                          <Unlink className="h-3 w-3" />
                        </button>
                      )}
                      {/* Link contact */}
                      {!block.contactId && contacts.length > 0 && (
                        <ContactLinkPicker
                          contacts={contacts}
                          onLink={(contactId, name) => linkContact(block.id, contactId, name)}
                        />
                      )}
                      {block.contactId && (
                        <button onClick={() => unlinkContact(block.id)} className="p-0.5 rounded bg-amber/20 border border-amber/30 hover:bg-amber/40" title="Unlink contact">
                          <User className="h-3 w-3 text-amber" />
                        </button>
                      )}
                      <button onClick={() => deleteBlock(block.id)} className="p-0.5 rounded bg-destructive/20 border border-destructive/30 hover:bg-destructive/40">
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Category picker */}
                {isEditing && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute left-0 right-0 -bottom-7 flex gap-1 px-1 z-30"
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

                {/* Resize handle at bottom */}
                <div
                  data-resize-handle
                  className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize group"
                  onPointerDown={(e) => handleResizePointerDown(e, block.id)}
                >
                  <div className="mx-auto w-8 h-1 rounded-full bg-foreground/20 group-hover:bg-foreground/40 transition-colors mt-0.5" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Todo Link Picker — grouped by goal with search ─── */
function TodoLinkPicker({ backlogTodos, onLink }: {
  backlogTodos: BacklogTodo[];
  onLink: (todoId: string, title: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);

  const filtered = search
    ? backlogTodos.filter(t =>
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.goalTitle.toLowerCase().includes(search.toLowerCase())
      )
    : backlogTodos;

  // Group by goal
  const grouped = filtered.reduce<Record<string, { goalTitle: string; todos: BacklogTodo[] }>>((acc, t) => {
    const key = t.goalId || t.goalTitle;
    if (!acc[key]) acc[key] = { goalTitle: t.goalTitle, todos: [] };
    acc[key].todos.push(t);
    return acc;
  }, {});

  const goalEntries = Object.entries(grouped);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="p-0.5 rounded bg-background/80 border border-border/30 hover:bg-muted/50">
          <Link2 className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="end">
        <div className="p-2 border-b border-border/30">
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search todos..."
            className="h-7 text-xs"
            autoFocus
          />
        </div>
        <div className="max-h-56 overflow-y-auto p-1">
          {goalEntries.length === 0 ? (
            <p className="text-[10px] text-muted-foreground font-medieval p-2 text-center">No todos found</p>
          ) : (
            goalEntries.map(([key, { goalTitle, todos }]) => {
              const isOpen = expandedGoal === key || search.length > 0 || goalEntries.length === 1;
              return (
                <div key={key} className="mb-0.5">
                  <button
                    onClick={() => setExpandedGoal(isOpen && !search ? null : key)}
                    className="flex items-center gap-1.5 w-full px-2 py-1 text-left rounded hover:bg-muted/30 transition-colors"
                  >
                    <Target className="h-3 w-3 text-secondary flex-shrink-0" />
                    <span className="text-[10px] font-medieval font-bold text-secondary truncate flex-1">{goalTitle}</span>
                    <Badge variant="outline" className="text-[8px] px-1 py-0">{todos.length}</Badge>
                  </button>
                  {isOpen && (
                    <div className="ml-3 border-l border-border/20 pl-2 space-y-0">
                      {todos.map(t => (
                        <button
                          key={t.todoId}
                          onClick={() => onLink(t.todoId, t.title)}
                          className="w-full text-left px-2 py-1 text-[11px] font-medieval rounded hover:bg-primary/15 transition-colors truncate block"
                        >
                          {t.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
