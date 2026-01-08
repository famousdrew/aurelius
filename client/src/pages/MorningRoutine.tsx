import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, ChevronLeft, Mic, MicOff, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';

interface Prompt {
  id: string;
  text: string;
  source?: string;
}

interface Quote {
  id: string;
  text: string;
  author: string;
}

const steps = [
  { id: 'quote', title: 'Daily Wisdom' },
  { id: 'intention', title: 'Set Your Intention' },
  { id: 'premeditatio', title: 'Prepare for Challenges' },
  { id: 'control', title: 'What You Can Control' },
];

export function MorningRoutine() {
  const [currentStep, setCurrentStep] = useState(0);
  const [content, setContent] = useState({
    intention: '',
    challenges: '',
    withinControl: '',
    outsideControl: '',
  });

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: quote } = useQuery({
    queryKey: ['dailyQuote'],
    queryFn: () => api.get<Quote>('/quotes/daily'),
  });

  const { data: prompt } = useQuery({
    queryKey: ['dailyPrompt'],
    queryFn: () => api.get<Prompt>('/prompts/daily'),
  });

  const { isRecording, startRecording, stopRecording } = useVoiceRecording({
    onTranscription: (text) => {
      const step = steps[currentStep].id;
      if (step === 'intention') {
        setContent((prev) => ({ ...prev, intention: prev.intention + ' ' + text }));
      } else if (step === 'premeditatio') {
        setContent((prev) => ({ ...prev, challenges: prev.challenges + ' ' + text }));
      } else if (step === 'control') {
        setContent((prev) => ({ ...prev, withinControl: prev.withinControl + ' ' + text }));
      }
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data: typeof content) =>
      api.post('/entries', {
        type: 'morning',
        content: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todayEntries'] });
      queryClient.invalidateQueries({ queryKey: ['streaks'] });
      navigate('/');
    },
  });

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      saveMutation.mutate(content);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStep = () => {
    switch (steps[currentStep].id) {
      case 'quote':
        return (
          <div className="space-y-6">
            {quote && (
              <blockquote className="rounded-xl bg-muted p-6">
                <p className="font-serif text-xl italic leading-relaxed">
                  "{quote.text}"
                </p>
                <p className="mt-4 text-sm text-muted-foreground">
                  — {quote.author}
                </p>
              </blockquote>
            )}
            <p className="text-muted-foreground">
              Take a moment to reflect on this wisdom before beginning your day.
            </p>
          </div>
        );

      case 'intention':
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              What virtue or quality do you want to embody today? What would make
              today meaningful?
            </p>
            {prompt && (
              <div className="flex items-start gap-2 rounded-lg bg-muted p-4">
                <Sparkles className="mt-0.5 h-5 w-5 text-primary" />
                <p className="text-sm">{prompt.text}</p>
              </div>
            )}
            <div className="relative">
              <textarea
                value={content.intention}
                onChange={(e) => setContent({ ...content, intention: e.target.value })}
                placeholder="Today, I will practice..."
                className={cn(
                  'min-h-[150px] w-full resize-none rounded-xl border border-input bg-background p-4',
                  'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
                )}
              />
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={cn(
                  'absolute bottom-3 right-3 rounded-full p-2',
                  isRecording ? 'bg-destructive text-white' : 'bg-muted'
                )}
              >
                {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
            </div>
          </div>
        );

      case 'premeditatio':
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              What challenges or difficulties might you face today? By anticipating
              them, you prepare yourself to respond with wisdom.
            </p>
            <div className="relative">
              <textarea
                value={content.challenges}
                onChange={(e) => setContent({ ...content, challenges: e.target.value })}
                placeholder="I might face... and I will respond by..."
                className={cn(
                  'min-h-[150px] w-full resize-none rounded-xl border border-input bg-background p-4',
                  'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
                )}
              />
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={cn(
                  'absolute bottom-3 right-3 rounded-full p-2',
                  isRecording ? 'bg-destructive text-white' : 'bg-muted'
                )}
              >
                {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
            </div>
          </div>
        );

      case 'control':
        return (
          <div className="space-y-6">
            <p className="text-muted-foreground">
              Distinguish between what is within your control and what is not.
              Focus your energy on the former.
            </p>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-primary">
                  Within my control
                </label>
                <textarea
                  value={content.withinControl}
                  onChange={(e) => setContent({ ...content, withinControl: e.target.value })}
                  placeholder="My actions, my responses, my attitude..."
                  className={cn(
                    'min-h-[100px] w-full resize-none rounded-xl border border-input bg-background p-4',
                    'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
                  )}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-muted-foreground">
                  Outside my control
                </label>
                <textarea
                  value={content.outsideControl}
                  onChange={(e) => setContent({ ...content, outsideControl: e.target.value })}
                  placeholder="Other people's actions, external events..."
                  className={cn(
                    'min-h-[100px] w-full resize-none rounded-xl border border-input bg-background p-4',
                    'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
                  )}
                />
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* Progress */}
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Step {currentStep + 1} of {steps.length}
          </span>
          <span className="font-medium">{steps[currentStep].title}</span>
        </div>
        <div className="h-2 rounded-full bg-muted">
          <div
            className="h-2 rounded-full bg-primary transition-all"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h1 className="mb-6 text-xl font-semibold">{steps[currentStep].title}</h1>
        {renderStep()}
      </div>

      {/* Navigation */}
      <div className="mt-6 flex justify-between">
        <button
          onClick={handleBack}
          disabled={currentStep === 0}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 font-medium',
            'disabled:opacity-50',
            currentStep === 0 ? 'invisible' : ''
          )}
        >
          <ChevronLeft className="h-5 w-5" />
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={saveMutation.isPending}
          className={cn(
            'flex items-center gap-2 rounded-lg bg-primary px-6 py-2 font-medium text-primary-foreground',
            'transition-colors hover:bg-primary/90',
            'disabled:opacity-50'
          )}
        >
          {currentStep === steps.length - 1 ? (
            saveMutation.isPending ? 'Saving...' : 'Complete'
          ) : (
            <>
              Next
              <ChevronRight className="h-5 w-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
