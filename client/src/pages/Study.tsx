import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  CheckCircle,
  ChevronRight,
  Loader2,
  PenLine,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Passage {
  id: string;
  reference: string;
  content: string;
  translation: string;
  sessionNumber: number;
  passageNumber: number;
}

interface Text {
  id: string;
  title: string;
  author: string;
}

interface Phase {
  id: string;
  title: string;
  name: string;
}

interface TodayReading {
  currentReading: {
    passage: Passage;
    text: Text;
    phase: Phase;
    studyGuide: {
      reflectionQuestions?: string[];
      stoicConcepts?: string[];
      practicalExercises?: string[];
    } | null;
    progress: { status: string } | null;
  } | null;
  dayNumber: number;
  totalCompleted: number;
  totalPassages: number;
  message?: string;
}

interface JournalEntry {
  reflection: string;
  personalConnection: string;
  favoriteQuote: string;
  practiceCommitment: string;
}

export function Study() {
  const queryClient = useQueryClient();
  const [showJournal, setShowJournal] = useState(false);
  const [journal, setJournal] = useState<JournalEntry>({
    reflection: '',
    personalConnection: '',
    favoriteQuote: '',
    practiceCommitment: '',
  });

  const { data: todayData, isLoading } = useQuery({
    queryKey: ['curriculum-today'],
    queryFn: () => api.get<TodayReading>('/curriculum/today'),
  });

  const completeMutation = useMutation({
    mutationFn: (passageId: string) =>
      api.post(`/curriculum/progress/${passageId}`, { status: 'completed' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curriculum-today'] });
      queryClient.invalidateQueries({ queryKey: ['mentorContext'] });
    },
  });

  const saveJournalMutation = useMutation({
    mutationFn: (data: { passageId: string } & JournalEntry) =>
      api.post('/curriculum/journal', data),
    onSuccess: () => {
      setShowJournal(false);
    },
  });

  const handleComplete = () => {
    if (!todayData?.currentReading?.passage.id) return;

    // Save journal if there's content
    const hasJournalContent = Object.values(journal).some(v => v.trim());
    if (hasJournalContent) {
      saveJournalMutation.mutate({
        passageId: todayData.currentReading.passage.id,
        ...journal,
      });
    }

    completeMutation.mutate(todayData.currentReading.passage.id);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // All readings completed
  if (!todayData?.currentReading) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <Trophy className="mx-auto h-16 w-16 text-primary" />
          <h1 className="mt-4 text-2xl font-semibold">Congratulations!</h1>
          <p className="mt-2 text-muted-foreground">
            You've completed all {todayData?.totalPassages} passages in the curriculum.
          </p>
        </div>
      </div>
    );
  }

  const { passage, text, phase, studyGuide } = todayData.currentReading;
  const progress = Math.round((todayData.totalCompleted / todayData.totalPassages) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Day {todayData.dayNumber} of {todayData.totalPassages}
          </p>
          <h1 className="text-2xl font-semibold">Today's Reading</h1>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold text-primary">{progress}%</p>
          <p className="text-sm text-muted-foreground">complete</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{phase?.title}</span>
        <ChevronRight className="h-4 w-4" />
        <span>{text?.title}</span>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{passage.reference}</span>
      </div>

      {/* Main reading card */}
      <div className="rounded-xl border border-border bg-card">
        {/* Reading header */}
        <div className="border-b border-border p-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="font-medium">{passage.reference}</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {text?.title} by {text?.author} &middot; {passage.translation}
          </p>
        </div>

        {/* Passage content */}
        <div className="p-6">
          <div className="prose prose-lg dark:prose-invert max-w-none">
            {passage.content.split('\n\n').map((paragraph, i) => (
              <p key={i} className="mb-4 leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        {/* Study guide (if available) */}
        {studyGuide && (
          <div className="border-t border-border bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-primary" />
              Study Guide
            </div>

            {studyGuide.stoicConcepts && studyGuide.stoicConcepts.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium uppercase text-muted-foreground">Key Concepts</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {studyGuide.stoicConcepts.map((concept, i) => (
                    <span key={i} className="rounded-full bg-primary/10 px-3 py-1 text-sm">
                      {concept}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {studyGuide.reflectionQuestions && studyGuide.reflectionQuestions.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium uppercase text-muted-foreground">Reflection Questions</p>
                <ul className="mt-1 space-y-1 text-sm">
                  {studyGuide.reflectionQuestions.map((q, i) => (
                    <li key={i}>&bull; {q}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Journal section */}
      <div className="rounded-xl border border-border bg-card">
        <button
          onClick={() => setShowJournal(!showJournal)}
          className="flex w-full items-center justify-between p-4"
        >
          <div className="flex items-center gap-2">
            <PenLine className="h-5 w-5 text-primary" />
            <span className="font-medium">Reading Notes</span>
          </div>
          <ChevronRight
            className={cn(
              'h-5 w-5 text-muted-foreground transition-transform',
              showJournal && 'rotate-90'
            )}
          />
        </button>

        {showJournal && (
          <div className="space-y-4 border-t border-border p-4">
            <div>
              <label className="text-sm font-medium">
                What stood out to you in this passage?
              </label>
              <textarea
                value={journal.reflection}
                onChange={(e) => setJournal({ ...journal, reflection: e.target.value })}
                placeholder="Your thoughts and reflections..."
                rows={3}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-sm font-medium">
                How does this connect to your life right now?
              </label>
              <textarea
                value={journal.personalConnection}
                onChange={(e) => setJournal({ ...journal, personalConnection: e.target.value })}
                placeholder="Personal connections..."
                rows={2}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-sm font-medium">
                Favorite quote or line
              </label>
              <input
                type="text"
                value={journal.favoriteQuote}
                onChange={(e) => setJournal({ ...journal, favoriteQuote: e.target.value })}
                placeholder="Copy a meaningful line..."
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-sm font-medium">
                How will you practice this today?
              </label>
              <input
                type="text"
                value={journal.practiceCommitment}
                onChange={(e) => setJournal({ ...journal, practiceCommitment: e.target.value })}
                placeholder="One small action..."
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        )}
      </div>

      {/* Complete button */}
      <button
        onClick={handleComplete}
        disabled={completeMutation.isPending}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-medium text-primary-foreground',
          'transition-colors hover:bg-primary/90 disabled:opacity-50'
        )}
      >
        {completeMutation.isPending ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <CheckCircle className="h-5 w-5" />
        )}
        {completeMutation.isPending ? 'Saving...' : 'Complete Reading'}
      </button>
    </div>
  );
}
