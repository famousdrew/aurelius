import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Calendar, Filter } from 'lucide-react';
import { api } from '@/lib/api';
import { cn, formatDate, formatRelativeDate } from '@/lib/utils';

interface Entry {
  id: string;
  type: string;
  content: Record<string, unknown>;
  moodScore?: number;
  energyScore?: number;
  tags?: string[];
  createdAt: string;
}

const entryTypeLabels: Record<string, string> = {
  morning: 'Morning Routine',
  evening: 'Evening Reflection',
  freeform: 'Journal Entry',
  thought_record: 'Thought Record',
};

export function Journal() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const { data: entries, isLoading } = useQuery({
    queryKey: ['entries', typeFilter],
    queryFn: () =>
      api.get<Entry[]>(`/entries${typeFilter ? `?type=${typeFilter}` : ''}`),
  });

  const filteredEntries = entries?.filter((entry) => {
    if (!searchQuery) return true;
    const contentStr = JSON.stringify(entry.content).toLowerCase();
    return contentStr.includes(searchQuery.toLowerCase());
  });

  const groupedEntries = filteredEntries?.reduce(
    (groups, entry) => {
      const date = new Date(entry.createdAt).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(entry);
      return groups;
    },
    {} as Record<string, Entry[]>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Journal</h1>
        <p className="text-muted-foreground">Review your past entries</p>
      </div>

      {/* Search and filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search entries..."
            className={cn(
              'w-full rounded-lg border border-input bg-background py-2 pl-10 pr-4',
              'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
            )}
          />
        </div>

        <select
          value={typeFilter || ''}
          onChange={(e) => setTypeFilter(e.target.value || null)}
          className={cn(
            'rounded-lg border border-input bg-background px-4 py-2',
            'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
          )}
        >
          <option value="">All types</option>
          <option value="morning">Morning Routine</option>
          <option value="evening">Evening Reflection</option>
          <option value="freeform">Freeform</option>
          <option value="thought_record">Thought Record</option>
        </select>
      </div>

      {/* Entries list */}
      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">
          Loading entries...
        </div>
      ) : !filteredEntries?.length ? (
        <div className="py-12 text-center text-muted-foreground">
          No entries found. Start writing!
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedEntries || {}).map(([date, dayEntries]) => (
            <div key={date}>
              <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {formatRelativeDate(new Date(date))}
              </h2>

              <div className="space-y-4">
                {dayEntries.map((entry) => (
                  <EntryCard key={entry.id} entry={entry} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EntryCard({ entry }: { entry: Entry }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getPreview = () => {
    const content = entry.content as Record<string, string>;
    if (entry.type === 'freeform' && content.text) {
      return content.text.slice(0, 150) + (content.text.length > 150 ? '...' : '');
    }
    if (entry.type === 'morning' && content.intention) {
      return content.intention.slice(0, 150);
    }
    if (entry.type === 'evening' && content.whatWentWell) {
      return content.whatWentWell.slice(0, 150);
    }
    return 'No preview available';
  };

  return (
    <button
      onClick={() => setIsExpanded(!isExpanded)}
      className="w-full rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/30"
    >
      <div className="mb-2 flex items-start justify-between">
        <div>
          <span className="text-sm font-medium text-primary">
            {entryTypeLabels[entry.type] || entry.type}
          </span>
          <span className="ml-2 text-sm text-muted-foreground">
            {new Date(entry.createdAt).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
        </div>
        {entry.moodScore && (
          <span className="rounded-full bg-muted px-2 py-1 text-xs">
            Mood: {entry.moodScore}/10
          </span>
        )}
      </div>

      <p className={cn('text-sm', !isExpanded && 'line-clamp-2')}>
        {getPreview()}
      </p>

      {entry.tags && entry.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {entry.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {isExpanded && (
        <div className="mt-4 border-t border-border pt-4">
          <pre className="whitespace-pre-wrap text-sm">
            {JSON.stringify(entry.content, null, 2)}
          </pre>
        </div>
      )}
    </button>
  );
}
