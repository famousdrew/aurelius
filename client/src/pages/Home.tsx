import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sun, Moon, PenLine, Flame } from 'lucide-react';
import { api } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';

interface Quote {
  id: string;
  text: string;
  author: string;
  sourceWork?: string;
}

interface StreakData {
  morning: number;
  evening: number;
  combined: number;
  totalEntries: number;
}

export function Home() {
  const { data: quote } = useQuery({
    queryKey: ['dailyQuote'],
    queryFn: () => api.get<Quote>('/quotes/daily'),
  });

  const { data: streaks } = useQuery({
    queryKey: ['streaks'],
    queryFn: () => api.get<StreakData>('/analytics/streaks'),
  });

  const { data: todayEntries } = useQuery({
    queryKey: ['todayEntries'],
    queryFn: () => api.get<{ type: string }[]>('/entries/today'),
  });

  const hasMorningEntry = todayEntries?.some((e) => e.type === 'morning');
  const hasEveningEntry = todayEntries?.some((e) => e.type === 'evening');

  const quickActions = [
    {
      name: 'Morning Routine',
      href: '/morning',
      icon: Sun,
      description: 'Start your day with intention',
      completed: hasMorningEntry,
    },
    {
      name: 'Evening Reflection',
      href: '/evening',
      icon: Moon,
      description: 'Review and reflect on your day',
      completed: hasEveningEntry,
    },
    {
      name: 'Freeform Entry',
      href: '/write',
      icon: PenLine,
      description: 'Write whatever is on your mind',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Good {getTimeOfDay()}</h1>
        <p className="text-muted-foreground">{formatDate(new Date())}</p>
      </div>

      {/* Streak display */}
      {streaks && streaks.combined > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/10">
            <Flame className="h-6 w-6 text-orange-500" />
          </div>
          <div>
            <p className="font-semibold">{streaks.combined} day streak</p>
            <p className="text-sm text-muted-foreground">Keep it going!</p>
          </div>
        </div>
      )}

      {/* Daily quote */}
      {quote && (
        <div className="rounded-xl border border-border bg-card p-6">
          <blockquote className="font-serif text-lg italic leading-relaxed">
            "{quote.text}"
          </blockquote>
          <p className="mt-4 text-sm text-muted-foreground">
            — {quote.author}
            {quote.sourceWork && `, ${quote.sourceWork}`}
          </p>
        </div>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="mb-4 text-lg font-medium">Today's Practice</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {quickActions.map((action) => (
            <Link
              key={action.name}
              to={action.href}
              className={cn(
                'group relative rounded-xl border border-border bg-card p-5 transition-all',
                'hover:border-primary/50 hover:shadow-md',
                action.completed && 'border-primary/30 bg-primary/5'
              )}
            >
              {action.completed && (
                <div className="absolute right-3 top-3 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                  Done
                </div>
              )}
              <action.icon
                className={cn(
                  'h-8 w-8 transition-colors',
                  action.completed ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'
                )}
              />
              <h3 className="mt-3 font-medium">{action.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {action.description}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* Stats summary */}
      {streaks && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-medium">Your Journey</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-semibold text-primary">{streaks.totalEntries}</p>
              <p className="text-sm text-muted-foreground">Total entries</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-primary">{streaks.morning}</p>
              <p className="text-sm text-muted-foreground">Morning streak</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-primary">{streaks.evening}</p>
              <p className="text-sm text-muted-foreground">Evening streak</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}
