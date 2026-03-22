import { useMemo } from 'react';
import { HabitLog } from '@/types/goals';
import { Goal } from '@/types/goals';
import { getAllActiveHabits } from '@/lib/habits';

interface Props {
  goals: Goal[];
  logs: HabitLog[];
}

export function HabitHeatmap({ goals, logs }: Props) {
  const activeHabits = useMemo(() => getAllActiveHabits(goals), [goals]);
  const habitCount = activeHabits.length;

  const { cells, months } = useMemo(() => {
    if (habitCount === 0) return { cells: [], months: [] };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weeks = 13; // ~3 months
    const totalDays = weeks * 7;

    // Build a map of date → completions count
    const completionMap = new Map<string, number>();
    for (const log of logs) {
      if (!log.completed) continue;
      completionMap.set(log.date, (completionMap.get(log.date) || 0) + 1);
    }

    // Generate cells from (totalDays-1) days ago to today
    const cells: { date: string; count: number; col: number; row: number }[] = [];
    const monthLabels: { label: string; col: number }[] = [];
    let lastMonth = -1;

    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const dayOfWeek = d.getDay(); // 0=Sun
      const col = Math.floor((totalDays - 1 - i) / 7);
      const count = completionMap.get(key) || 0;

      cells.push({ date: key, count, col, row: dayOfWeek });

      if (d.getMonth() !== lastMonth) {
        lastMonth = d.getMonth();
        monthLabels.push({
          label: d.toLocaleDateString(undefined, { month: 'short' }),
          col,
        });
      }
    }

    return { cells, months: monthLabels };
  }, [logs, habitCount]);

  if (habitCount === 0) return null;

  const cellSize = 12;
  const gap = 2;
  const totalCols = 13;
  const totalRows = 7;
  const leftPad = 20;
  const topPad = 16;
  const width = leftPad + totalCols * (cellSize + gap);
  const height = topPad + totalRows * (cellSize + gap);

  const getColor = (count: number) => {
    if (count === 0) return 'hsl(var(--muted))';
    const ratio = Math.min(count / habitCount, 1);
    if (ratio <= 0.25) return 'hsl(142 40% 70%)';
    if (ratio <= 0.5) return 'hsl(142 50% 55%)';
    if (ratio <= 0.75) return 'hsl(142 60% 42%)';
    return 'hsl(142 70% 32%)';
  };

  const dayLabels = ['', 'M', '', 'W', '', 'F', ''];

  return (
    <div className="rounded-xl bg-card border border-border p-4 shadow-sm">
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Habit Activity</p>
      <svg width={width} height={height} className="w-full" viewBox={`0 0 ${width} ${height}`}>
        {/* Month labels */}
        {months.map((m, i) => (
          <text
            key={i}
            x={leftPad + m.col * (cellSize + gap)}
            y={10}
            className="fill-muted-foreground"
            fontSize={9}
          >
            {m.label}
          </text>
        ))}
        {/* Day labels */}
        {dayLabels.map((label, i) => (
          label && (
            <text
              key={i}
              x={0}
              y={topPad + i * (cellSize + gap) + cellSize - 2}
              className="fill-muted-foreground"
              fontSize={8}
            >
              {label}
            </text>
          )
        ))}
        {/* Cells */}
        {cells.map((cell, i) => (
          <rect
            key={i}
            x={leftPad + cell.col * (cellSize + gap)}
            y={topPad + cell.row * (cellSize + gap)}
            width={cellSize}
            height={cellSize}
            rx={2}
            fill={getColor(cell.count)}
          >
            <title>{cell.date}: {cell.count}/{habitCount} habits</title>
          </rect>
        ))}
      </svg>
      <div className="flex items-center gap-1 mt-2 justify-end">
        <span className="text-[9px] text-muted-foreground">Less</span>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <div
            key={i}
            className="w-2.5 h-2.5 rounded-sm"
            style={{ backgroundColor: getColor(ratio * habitCount) }}
          />
        ))}
        <span className="text-[9px] text-muted-foreground">More</span>
      </div>
    </div>
  );
}
