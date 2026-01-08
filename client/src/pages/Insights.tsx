import { useQuery, useMutation } from '@tanstack/react-query';
import { TrendingUp, Sparkles, Loader2 } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface MoodTrend {
  date: string;
  avgMood: number | null;
  avgEnergy: number | null;
  entryCount: number;
}

interface PatternData {
  totalEntries: number;
  entriesByType: Record<string, number>;
  averageMood: number;
  period: string;
}

interface StreakData {
  morning: number;
  evening: number;
  combined: number;
  totalEntries: number;
}

export function Insights() {
  const [aiPatterns, setAiPatterns] = useState<string | null>(null);

  const { data: moodTrends } = useQuery({
    queryKey: ['moodTrends'],
    queryFn: () => api.get<MoodTrend[]>('/analytics/mood?days=30'),
  });

  const { data: patterns } = useQuery({
    queryKey: ['patterns'],
    queryFn: () => api.get<PatternData>('/analytics/patterns'),
  });

  const { data: streaks } = useQuery({
    queryKey: ['streaks'],
    queryFn: () => api.get<StreakData>('/analytics/streaks'),
  });

  const analyzePatternsMutation = useMutation({
    mutationFn: () => api.post<{ patterns: string }>('/ai/patterns', { days: 30 }),
    onSuccess: (data) => setAiPatterns(data.patterns),
  });

  const chartData = moodTrends
    ?.filter((d) => d.avgMood !== null)
    .map((d) => ({
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      mood: d.avgMood,
      energy: d.avgEnergy,
    }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Insights</h1>
        <p className="text-muted-foreground">Understand your patterns</p>
      </div>

      {/* Stats overview */}
      {patterns && streaks && (
        <div className="grid gap-4 sm:grid-cols-4">
          <StatCard label="Total Entries" value={patterns.totalEntries} />
          <StatCard label="Average Mood" value={patterns.averageMood.toFixed(1)} />
          <StatCard label="Current Streak" value={`${streaks.combined} days`} />
          <StatCard label="This Month" value={patterns.totalEntries} />
        </div>
      )}

      {/* Mood chart */}
      {chartData && chartData.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-medium">
            <TrendingUp className="h-5 w-5 text-primary" />
            Mood & Energy Trends
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" tick={{ fill: 'currentColor' }} />
                <YAxis domain={[1, 10]} className="text-xs" tick={{ fill: 'currentColor' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '0.5rem',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="mood"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  name="Mood"
                />
                <Line
                  type="monotone"
                  dataKey="energy"
                  stroke="hsl(var(--secondary))"
                  strokeWidth={2}
                  dot={false}
                  name="Energy"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Entry type breakdown */}
      {patterns && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-medium">Entry Types</h2>
          <div className="space-y-3">
            {Object.entries(patterns.entriesByType).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="capitalize">{type.replace('_', ' ')}</span>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: `${(count / patterns.totalEntries) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Pattern Analysis */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-medium">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Pattern Analysis
          </h2>
          <button
            onClick={() => analyzePatternsMutation.mutate()}
            disabled={analyzePatternsMutation.isPending}
            className={cn(
              'flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground',
              'transition-colors hover:bg-primary/90 disabled:opacity-50'
            )}
          >
            {analyzePatternsMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              'Analyze My Patterns'
            )}
          </button>
        </div>

        {aiPatterns ? (
          <div className="prose prose-sm dark:prose-invert">
            {aiPatterns.split('\n').map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">
            Click "Analyze My Patterns" to get AI-powered insights based on your
            journal entries from the past 30 days.
          </p>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
