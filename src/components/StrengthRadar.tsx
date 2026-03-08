import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { getRadarData, LEVEL_COLORS, estimate1RM } from '@/lib/strength-standards';
import { PersonalRecord } from '@/types/workout';
import { Crosshair } from 'lucide-react';

interface StrengthRadarProps {
  prs: PersonalRecord[];
  bodyweight: number;
}

export function StrengthRadar({ prs, bodyweight }: StrengthRadarProps) {
  const data = getRadarData(prs, bodyweight);

  const chartData = data.map(d => ({
    subject: d.label.replace(' ', '\n'),
    value: Math.round(d.ratio * 100),
    fullMark: 100,
  }));

  return (
    <Card className="border-rough relative overflow-hidden scanlines bg-card/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medieval flex items-center gap-2">
          <Crosshair className="h-4 w-4 text-primary drop-shadow-[0_0_6px_hsl(130,100%,40%,0.5)]" />
          Strength Radar
          <span className="text-xs text-muted-foreground ml-auto">{bodyweight} lbs BW</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="relative z-10">
        <ResponsiveContainer width="100%" height={280}>
          <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="hsl(130 20% 20%)" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: 'hsl(60 30% 70%)', fontSize: 10, fontFamily: 'MedievalSharp' }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: 'hsl(60 10% 45%)', fontSize: 9 }}
              tickCount={5}
            />
            <Radar
              name="Strength"
              dataKey="value"
              stroke="hsl(130 100% 40%)"
              fill="hsl(130 100% 40%)"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>

        {/* Level breakdown */}
        <div className="space-y-1.5 mt-2">
          {data.map(d => (
            <div key={d.exercise} className="flex items-center gap-2 text-xs font-medieval">
              <span className="w-24 truncate">{d.label}</span>
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${d.ratio * 100}%`,
                    backgroundColor: LEVEL_COLORS[d.level],
                  }}
                />
              </div>
              <span
                className="text-[10px] uppercase font-bold w-20 text-right"
                style={{ color: LEVEL_COLORS[d.level] }}
              >
                {d.level}
              </span>
            </div>
          ))}
        </div>

        {/* 1RM estimates */}
        <div className="mt-4 border-t border-border pt-3">
          <p className="text-xs text-muted-foreground font-medieval mb-2 uppercase tracking-wider">Estimated 1RM (Epley)</p>
          <div className="grid grid-cols-2 gap-2">
            {data.filter(d => d.exercise !== 'pull_up').map(d => {
              const pr = prs.find(p => p.exercise === d.exercise);
              const e1rm = pr ? estimate1RM(pr.weight, pr.reps) : 0;
              return (
                <div key={d.exercise} className="flex justify-between text-xs font-medieval">
                  <span>{d.label}</span>
                  <span className="font-bold" style={{ color: LEVEL_COLORS[d.level] }}>{e1rm} lbs</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
