import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mic, MicOff, Sparkles, Send, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';

interface Prompt {
  id: string;
  text: string;
  category: string;
}

export function Freeform() {
  const [content, setContent] = useState('');
  const [showAiReflection, setShowAiReflection] = useState(false);
  const [aiReflection, setAiReflection] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: prompt, refetch: refetchPrompt } = useQuery({
    queryKey: ['randomPrompt'],
    queryFn: () => api.get<Prompt>('/prompts/random'),
  });

  const { isRecording, isTranscribing, startRecording, stopRecording } = useVoiceRecording({
    onTranscription: (text) => {
      setContent((prev) => prev + (prev ? ' ' : '') + text);
    },
  });

  const reflectMutation = useMutation({
    mutationFn: () =>
      api.post<{ reflection: string }>('/ai/reflect', {
        entryContent: content,
        entryType: 'freeform',
      }),
    onSuccess: (data) => {
      setAiReflection(data.reflection);
      setShowAiReflection(true);
    },
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      api.post('/entries', {
        type: 'freeform',
        content: { text: content, aiReflection },
        tags,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      navigate('/journal');
    },
  });

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Write</h1>
        <p className="text-muted-foreground">Let your thoughts flow freely</p>
      </div>

      {/* Prompt suggestion */}
      {prompt && (
        <button
          onClick={() => refetchPrompt()}
          className="mb-4 flex w-full items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted"
        >
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm">{prompt.text}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Click for another prompt
            </p>
          </div>
        </button>
      )}

      {/* Writing area */}
      <div className="rounded-xl border border-border bg-card">
        <div className="relative">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            className={cn(
              'min-h-[300px] w-full resize-none rounded-t-xl border-0 bg-transparent p-6',
              'focus:outline-none focus:ring-0',
              'placeholder:text-muted-foreground'
            )}
          />

          {/* Voice recording indicator */}
          {isRecording && (
            <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-destructive px-3 py-1 text-sm text-white">
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
              Recording...
            </div>
          )}
          {isTranscribing && (
            <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-sm text-white">
              <Loader2 className="h-4 w-4 animate-spin" />
              Transcribing...
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="border-t border-border px-6 py-3">
          <div className="flex flex-wrap items-center gap-2">
            {tags.map((tag) => (
              <button
                key={tag}
                onClick={() => handleRemoveTag(tag)}
                className="rounded-full bg-muted px-3 py-1 text-sm hover:bg-destructive hover:text-destructive-foreground"
              >
                #{tag} &times;
              </button>
            ))}
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="Add tag..."
              className="bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isTranscribing}
              className={cn(
                'rounded-lg p-2 transition-colors',
                isRecording ? 'bg-destructive text-white' : 'hover:bg-muted'
              )}
              title={isRecording ? 'Stop recording' : 'Start voice recording'}
            >
              {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>

            <button
              onClick={() => reflectMutation.mutate()}
              disabled={!content.trim() || reflectMutation.isPending}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                'hover:bg-muted disabled:opacity-50'
              )}
              title="Get AI reflection"
            >
              {reflectMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Reflect
            </button>
          </div>

          <button
            onClick={() => saveMutation.mutate()}
            disabled={!content.trim() || saveMutation.isPending}
            className={cn(
              'flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground',
              'transition-colors hover:bg-primary/90 disabled:opacity-50'
            )}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Save
          </button>
        </div>
      </div>

      {/* AI Reflection */}
      {showAiReflection && aiReflection && (
        <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-6">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="font-medium">AI Reflection</h3>
          </div>
          <div className="prose prose-sm dark:prose-invert">
            {aiReflection.split('\n').map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
