import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, ChevronLeft, Mic, MicOff } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';

const steps = [
  { id: 'review', title: 'Three Questions' },
  { id: 'gratitude', title: 'Gratitude' },
  { id: 'mood', title: 'How Are You Feeling?' },
];

export function EveningReflection() {
  const [currentStep, setCurrentStep] = useState(0);
  const [content, setContent] = useState({
    whatWentWell: '',
    whatCouldImprove: '',
    whatLeftUndone: '',
    gratitude: ['', '', ''],
    freeformNotes: '',
  });
  const [moodScore, setMoodScore] = useState(5);
  const [energyScore, setEnergyScore] = useState(5);
  const [activeField, setActiveField] = useState<string | null>(null);

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { isRecording, startRecording, stopRecording } = useVoiceRecording({
    onTranscription: (text) => {
      if (activeField === 'whatWentWell') {
        setContent((prev) => ({ ...prev, whatWentWell: prev.whatWentWell + ' ' + text }));
      } else if (activeField === 'whatCouldImprove') {
        setContent((prev) => ({ ...prev, whatCouldImprove: prev.whatCouldImprove + ' ' + text }));
      } else if (activeField === 'whatLeftUndone') {
        setContent((prev) => ({ ...prev, whatLeftUndone: prev.whatLeftUndone + ' ' + text }));
      } else if (activeField === 'freeformNotes') {
        setContent((prev) => ({ ...prev, freeformNotes: prev.freeformNotes + ' ' + text }));
      }
    },
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      api.post('/entries', {
        type: 'evening',
        content,
        moodScore,
        energyScore,
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
      saveMutation.mutate();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleRecording = (field: string) => {
    if (isRecording) {
      stopRecording();
      setActiveField(null);
    } else {
      setActiveField(field);
      startRecording();
    }
  };

  const renderStep = () => {
    switch (steps[currentStep].id) {
      case 'review':
        return (
          <div className="space-y-6">
            <p className="text-muted-foreground">
              Reflect on your day using the three questions of Epictetus.
            </p>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  What did I do well today?
                </label>
                <div className="relative">
                  <textarea
                    value={content.whatWentWell}
                    onChange={(e) => setContent({ ...content, whatWentWell: e.target.value })}
                    placeholder="I showed patience when..."
                    className={cn(
                      'min-h-[100px] w-full resize-none rounded-xl border border-input bg-background p-4 pr-12',
                      'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
                    )}
                  />
                  <button
                    onClick={() => handleRecording('whatWentWell')}
                    className={cn(
                      'absolute bottom-3 right-3 rounded-full p-2',
                      isRecording && activeField === 'whatWentWell' ? 'bg-destructive text-white' : 'bg-muted'
                    )}
                  >
                    {isRecording && activeField === 'whatWentWell' ? (
                      <MicOff className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  What could I improve?
                </label>
                <div className="relative">
                  <textarea
                    value={content.whatCouldImprove}
                    onChange={(e) => setContent({ ...content, whatCouldImprove: e.target.value })}
                    placeholder="Next time I could..."
                    className={cn(
                      'min-h-[100px] w-full resize-none rounded-xl border border-input bg-background p-4 pr-12',
                      'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
                    )}
                  />
                  <button
                    onClick={() => handleRecording('whatCouldImprove')}
                    className={cn(
                      'absolute bottom-3 right-3 rounded-full p-2',
                      isRecording && activeField === 'whatCouldImprove' ? 'bg-destructive text-white' : 'bg-muted'
                    )}
                  >
                    {isRecording && activeField === 'whatCouldImprove' ? (
                      <MicOff className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  What did I leave undone?
                </label>
                <div className="relative">
                  <textarea
                    value={content.whatLeftUndone}
                    onChange={(e) => setContent({ ...content, whatLeftUndone: e.target.value })}
                    placeholder="I still need to..."
                    className={cn(
                      'min-h-[100px] w-full resize-none rounded-xl border border-input bg-background p-4 pr-12',
                      'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
                    )}
                  />
                  <button
                    onClick={() => handleRecording('whatLeftUndone')}
                    className={cn(
                      'absolute bottom-3 right-3 rounded-full p-2',
                      isRecording && activeField === 'whatLeftUndone' ? 'bg-destructive text-white' : 'bg-muted'
                    )}
                  >
                    {isRecording && activeField === 'whatLeftUndone' ? (
                      <MicOff className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'gratitude':
        return (
          <div className="space-y-6">
            <p className="text-muted-foreground">
              What three things are you grateful for today? Be specific.
            </p>

            <div className="space-y-3">
              {[0, 1, 2].map((index) => (
                <input
                  key={index}
                  type="text"
                  value={content.gratitude[index]}
                  onChange={(e) => {
                    const newGratitude = [...content.gratitude];
                    newGratitude[index] = e.target.value;
                    setContent({ ...content, gratitude: newGratitude });
                  }}
                  placeholder={`${index + 1}. I'm grateful for...`}
                  className={cn(
                    'w-full rounded-xl border border-input bg-background p-4',
                    'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
                  )}
                />
              ))}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Anything else on your mind?
              </label>
              <div className="relative">
                <textarea
                  value={content.freeformNotes}
                  onChange={(e) => setContent({ ...content, freeformNotes: e.target.value })}
                  placeholder="Optional: add any other thoughts..."
                  className={cn(
                    'min-h-[100px] w-full resize-none rounded-xl border border-input bg-background p-4',
                    'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
                  )}
                />
                <button
                  onClick={() => handleRecording('freeformNotes')}
                  className={cn(
                    'absolute bottom-3 right-3 rounded-full p-2',
                    isRecording && activeField === 'freeformNotes' ? 'bg-destructive text-white' : 'bg-muted'
                  )}
                >
                  {isRecording && activeField === 'freeformNotes' ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        );

      case 'mood':
        return (
          <div className="space-y-8">
            <div>
              <label className="mb-4 block font-medium">
                Mood: {moodScore}/10
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={moodScore}
                onChange={(e) => setMoodScore(parseInt(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="mt-2 flex justify-between text-sm text-muted-foreground">
                <span>Low</span>
                <span>High</span>
              </div>
            </div>

            <div>
              <label className="mb-4 block font-medium">
                Energy: {energyScore}/10
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={energyScore}
                onChange={(e) => setEnergyScore(parseInt(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="mt-2 flex justify-between text-sm text-muted-foreground">
                <span>Drained</span>
                <span>Energized</span>
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
