import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pause,
  PenLine,
  Play,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Passage {
  id: string;
  reference: string;
  content: string;
  translation: string;
  sessionNumber: number;
  passageNumber: number;
  orderIndex?: number;
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

interface PassageListItem {
  id: string;
  reference: string;
  orderIndex: number;
  completed: boolean;
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

interface PassageDetail {
  passage: Passage;
  text: Text;
  phase: Phase;
  studyGuide: {
    reflectionQuestions?: string[];
    stoicConcepts?: string[];
    practicalExercises?: string[];
  } | null;
  progress: { status: string } | null;
}

interface JournalEntry {
  reflection: string;
  personalConnection: string;
  favoriteQuote: string;
  practiceCommitment: string;
}

export function Study() {
  const queryClient = useQueryClient();
  const [selectedPassageId, setSelectedPassageId] = useState<string | null>(null);
  const [showChapterList, setShowChapterList] = useState(false);
  const [showJournal, setShowJournal] = useState(false);
  const [journal, setJournal] = useState<JournalEntry>({
    reflection: '',
    personalConnection: '',
    favoriteQuote: '',
    practiceCommitment: '',
  });
  const [journalLoadedForPassage, setJournalLoadedForPassage] = useState<string | null>(null);

  // Get today's reading (for default and progress info)
  const { data: todayData, isLoading: todayLoading } = useQuery({
    queryKey: ['curriculum-today'],
    queryFn: () => api.get<TodayReading>('/curriculum/today'),
  });

  // Set default passage to today's reading
  useEffect(() => {
    if (todayData?.currentReading?.passage.id && !selectedPassageId) {
      setSelectedPassageId(todayData.currentReading.passage.id);
    }
  }, [todayData, selectedPassageId]);

  // Get the current text ID for fetching passage list
  const currentTextId = todayData?.currentReading?.text.id || 'text-001';

  // Fetch list of all passages for navigation
  const { data: passageList } = useQuery({
    queryKey: ['passage-list', currentTextId],
    queryFn: () => api.get<PassageListItem[]>(`/curriculum/texts/${currentTextId}/passages`),
    enabled: !!currentTextId,
  });

  // Fetch selected passage details (if different from today's)
  const { data: selectedPassageData, isLoading: passageLoading } = useQuery({
    queryKey: ['passage', selectedPassageId],
    queryFn: () => api.get<PassageDetail>(`/curriculum/passages/${selectedPassageId}`),
    enabled: !!selectedPassageId && selectedPassageId !== todayData?.currentReading?.passage.id,
  });

  // Fetch existing journal entry for current passage
  const { data: existingJournal } = useQuery({
    queryKey: ['journal', selectedPassageId],
    queryFn: () => api.get<JournalEntry>(`/curriculum/journal/${selectedPassageId}`).catch(() => null),
    enabled: !!selectedPassageId,
  });

  // Clear journal form when navigating to a different passage
  useEffect(() => {
    if (selectedPassageId && selectedPassageId !== journalLoadedForPassage) {
      setJournal({ reflection: '', personalConnection: '', favoriteQuote: '', practiceCommitment: '' });
      setJournalLoadedForPassage(null);
    }
  }, [selectedPassageId, journalLoadedForPassage]);

  // Load existing journal entry only once per passage (after query completes)
  useEffect(() => {
    if (existingJournal && selectedPassageId && journalLoadedForPassage !== selectedPassageId) {
      setJournal({
        reflection: existingJournal.reflection || '',
        personalConnection: existingJournal.personalConnection || '',
        favoriteQuote: existingJournal.favoriteQuote || '',
        practiceCommitment: existingJournal.practiceCommitment || '',
      });
      setJournalLoadedForPassage(selectedPassageId);
    }
  }, [existingJournal, selectedPassageId, journalLoadedForPassage]);

  // Determine which passage data to use
  const isViewingToday = selectedPassageId === todayData?.currentReading?.passage.id;
  const currentData = isViewingToday ? todayData?.currentReading : selectedPassageData;
  const isLoading = todayLoading || (!isViewingToday && passageLoading);

  // Audio player
  const passageId = currentData?.passage.id;
  const textId = currentData?.text?.id;
  const audioUrl = passageId && textId === 'text-001' ? `/audio/${passageId}.mp3` : null;
  const { isPlaying, isLoading: audioLoading, toggle: toggleAudio } = useAudioPlayer(audioUrl);

  // Find current index for prev/next navigation
  const currentIndex = passageList?.findIndex(p => p.id === selectedPassageId) ?? -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < (passageList?.length ?? 0) - 1;

  const goToPrev = () => {
    if (hasPrev && passageList) {
      setSelectedPassageId(passageList[currentIndex - 1].id);
      setShowJournal(false);
    }
  };

  const goToNext = () => {
    if (hasNext && passageList) {
      setSelectedPassageId(passageList[currentIndex + 1].id);
      setShowJournal(false);
    }
  };

  const goToToday = () => {
    if (todayData?.currentReading?.passage.id) {
      setSelectedPassageId(todayData.currentReading.passage.id);
      setShowJournal(false);
    }
  };

  const completeMutation = useMutation({
    mutationFn: (passageId: string) =>
      api.post(`/curriculum/progress/${passageId}`, { status: 'completed' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curriculum-today'] });
      queryClient.invalidateQueries({ queryKey: ['passage-list'] });
      queryClient.invalidateQueries({ queryKey: ['mentorContext'] });
    },
  });

  const saveJournalMutation = useMutation({
    mutationFn: (data: { passageId: string } & JournalEntry) =>
      api.post('/curriculum/journal', data),
    onSuccess: (_data, variables) => {
      // Invalidate only the specific passage's journal query
      queryClient.invalidateQueries({ queryKey: ['journal', variables.passageId] });
      // Mark as loaded so we don't overwrite the form with refetched data
      setJournalLoadedForPassage(variables.passageId);
      setShowJournal(false);
    },
  });

  const handleComplete = () => {
    if (!currentData?.passage.id) return;

    const hasJournalContent = Object.values(journal).some(v => v.trim());
    if (hasJournalContent) {
      saveJournalMutation.mutate({
        passageId: currentData.passage.id,
        ...journal,
      });
    }

    completeMutation.mutate(currentData.passage.id);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // All readings completed and no specific passage selected
  if (!currentData) {
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

  const { passage, text, phase, studyGuide, progress } = currentData;
  const overallProgress = Math.round(((todayData?.totalCompleted ?? 0) / (todayData?.totalPassages ?? 1)) * 100);
  const isCompleted = progress?.status === 'completed';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Chapter {currentIndex + 1} of {passageList?.length ?? todayData?.totalPassages}
          </p>
          <h1 className="text-2xl font-semibold">
            {isViewingToday ? "Today's Reading" : passage.reference}
          </h1>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold text-primary">{overallProgress}%</p>
          <p className="text-sm text-muted-foreground">complete</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${overallProgress}%` }}
        />
      </div>

      {/* Navigation controls */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={goToPrev}
          disabled={!hasPrev}
          className={cn(
            'flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            hasPrev ? 'bg-muted hover:bg-muted/80' : 'opacity-40 cursor-not-allowed'
          )}
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </button>

        {/* Chapter selector */}
        <div className="relative flex-1 max-w-xs">
          <button
            onClick={() => setShowChapterList(!showChapterList)}
            className="flex w-full items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2 text-sm font-medium hover:bg-muted/80"
          >
            <span className="truncate">{passage.reference}</span>
            <ChevronDown className={cn('h-4 w-4 transition-transform', showChapterList && 'rotate-180')} />
          </button>

          {showChapterList && (
            <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-64 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
              {passageList?.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedPassageId(p.id);
                    setShowChapterList(false);
                    setShowJournal(false);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-muted',
                    p.id === selectedPassageId && 'bg-primary/10 text-primary'
                  )}
                >
                  <span>{p.reference}</span>
                  {p.completed && <CheckCircle className="h-4 w-4 text-green-500" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={goToNext}
          disabled={!hasNext}
          className={cn(
            'flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            hasNext ? 'bg-muted hover:bg-muted/80' : 'opacity-40 cursor-not-allowed'
          )}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* "Go to today" button if not viewing today's reading */}
      {!isViewingToday && todayData?.currentReading && (
        <button
          onClick={goToToday}
          className="w-full rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10"
        >
          ← Back to Today's Reading
        </button>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{phase?.title}</span>
        <ChevronRight className="h-4 w-4" />
        <span>{text?.title}</span>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{passage.reference}</span>
        {isCompleted && (
          <CheckCircle className="h-4 w-4 text-green-500 ml-2" />
        )}
      </div>

      {/* Main reading card */}
      <div className="rounded-xl border border-border bg-card">
        {/* Reading header */}
        <div className="border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <h2 className="font-medium">{passage.reference}</h2>
            </div>
            {audioUrl && (
              <button
                onClick={toggleAudio}
                disabled={audioLoading}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  isPlaying
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                )}
              >
                {audioLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {audioLoading ? 'Loading...' : isPlaying ? 'Pause' : 'Listen'}
              </button>
            )}
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

      {/* Complete button - only show if not already completed */}
      {!isCompleted && (
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
      )}

      {/* Already completed indicator */}
      {isCompleted && (
        <div className="flex items-center justify-center gap-2 rounded-xl bg-green-500/10 py-4 text-green-600 dark:text-green-400">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">Completed</span>
        </div>
      )}
    </div>
  );
}
