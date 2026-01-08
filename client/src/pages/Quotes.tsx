import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart, RefreshCw, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Quote {
  id: string;
  text: string;
  author: string;
  sourceWork?: string;
  category?: string;
  isFavorite: boolean;
}

const authors = ['Marcus Aurelius', 'Epictetus', 'Seneca'];

export function Quotes() {
  const [authorFilter, setAuthorFilter] = useState<string | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const queryClient = useQueryClient();

  const { data: quotes, isLoading } = useQuery({
    queryKey: ['quotes', authorFilter, showFavorites],
    queryFn: () =>
      showFavorites
        ? api.get<Quote[]>('/quotes/favorites')
        : api.get<Quote[]>(`/quotes${authorFilter ? `?author=${authorFilter}` : ''}`),
  });

  const { data: randomQuote, refetch: refetchRandom } = useQuery({
    queryKey: ['randomQuote'],
    queryFn: () => api.get<Quote>('/quotes/random'),
    enabled: false,
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: (quoteId: string) => api.post(`/quotes/${quoteId}/favorite`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });

  const filteredQuotes = quotes?.filter((quote) => {
    if (!searchQuery) return true;
    return (
      quote.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.author.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Stoic Wisdom</h1>
        <p className="text-muted-foreground">Timeless insights from the great Stoics</p>
      </div>

      {/* Random quote generator */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium">Random Quote</h2>
          <button
            onClick={() => refetchRandom()}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" />
            New Quote
          </button>
        </div>
        {randomQuote && (
          <blockquote className="rounded-lg bg-muted p-4">
            <p className="font-serif text-lg italic">"{randomQuote.text}"</p>
            <p className="mt-3 text-sm text-muted-foreground">
              — {randomQuote.author}
              {randomQuote.sourceWork && `, ${randomQuote.sourceWork}`}
            </p>
          </blockquote>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search quotes..."
            className={cn(
              'w-full rounded-lg border border-input bg-background py-2 pl-10 pr-4',
              'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
            )}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowFavorites(!showFavorites)}
            className={cn(
              'flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
              showFavorites
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border hover:bg-muted'
            )}
          >
            <Heart className={cn('h-4 w-4', showFavorites && 'fill-current')} />
            Favorites
          </button>

          <select
            value={authorFilter || ''}
            onChange={(e) => setAuthorFilter(e.target.value || null)}
            className={cn(
              'rounded-lg border border-input bg-background px-4 py-2 text-sm',
              'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
            )}
          >
            <option value="">All Authors</option>
            {authors.map((author) => (
              <option key={author} value={author}>
                {author}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quotes list */}
      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading quotes...</div>
      ) : !filteredQuotes?.length ? (
        <div className="py-12 text-center text-muted-foreground">No quotes found.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredQuotes.map((quote) => (
            <div
              key={quote.id}
              className="rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30"
            >
              <p className="font-serif text-base italic leading-relaxed">
                "{quote.text}"
              </p>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  — {quote.author}
                  {quote.sourceWork && (
                    <span className="block text-xs">{quote.sourceWork}</span>
                  )}
                </p>
                <button
                  onClick={() => toggleFavoriteMutation.mutate(quote.id)}
                  className={cn(
                    'rounded-full p-2 transition-colors',
                    quote.isFavorite
                      ? 'text-red-500 hover:bg-red-500/10'
                      : 'text-muted-foreground hover:bg-muted'
                  )}
                >
                  <Heart
                    className={cn('h-5 w-5', quote.isFavorite && 'fill-current')}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
