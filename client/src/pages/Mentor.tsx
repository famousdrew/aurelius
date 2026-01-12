import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Loader2, BookOpen, Trash2, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface MentorContext {
  stats: {
    totalEntriesLast30Days: number;
    passagesCompleted: number;
    reflectionsWritten: number;
  };
  suggestedTopic: string;
  recentTexts: Array<{ text: string; reference: string }>;
}

interface ChatResponse {
  message: string;
  conversationId: string;
}

interface ConversationHistory {
  conversationId: string | null;
  messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp?: string }>;
}

export function Mentor() {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: context } = useQuery({
    queryKey: ['mentorContext'],
    queryFn: () => api.get<MentorContext>('/mentor/context'),
  });

  // Load existing conversation on mount
  const { data: existingConversation } = useQuery({
    queryKey: ['mentorConversation'],
    queryFn: () => api.get<ConversationHistory>('/mentor/conversation'),
  });

  // Set messages from existing conversation
  useEffect(() => {
    if (existingConversation && !historyLoaded) {
      if (existingConversation.messages.length > 0) {
        setMessages(existingConversation.messages.map(m => ({
          role: m.role,
          content: m.content,
        })));
        setConversationId(existingConversation.conversationId);
      }
      setHistoryLoaded(true);
    }
  }, [existingConversation, historyLoaded]);

  const chatMutation = useMutation({
    mutationFn: (message: string) =>
      api.post<ChatResponse>('/mentor/chat', {
        message,
        conversationId,
      }),
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: 'assistant', content: data.message }]);
      setConversationId(data.conversationId);
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || chatMutation.isPending) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    chatMutation.mutate(userMessage);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSuggestedTopic = () => {
    if (context?.suggestedTopic) {
      setInput(context.suggestedTopic);
      inputRef.current?.focus();
    }
  };

  const clearConversation = async () => {
    if (conversationId) {
      await api.delete(`/mentor/conversation/${conversationId}`);
    }
    setMessages([]);
    setConversationId(null);
    setHistoryLoaded(false);
    queryClient.invalidateQueries({ queryKey: ['mentorConversation'] });
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col lg:h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-semibold">Stoic Mentor</h1>
          <p className="text-muted-foreground">Your personal philosophy guide</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearConversation}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </button>
        )}
      </div>

      {/* Context cards - show when no messages */}
      {messages.length === 0 && context && (
        <div className="mt-6 space-y-4">
          {/* Stats */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-2xl font-semibold text-primary">{context.stats.passagesCompleted}</p>
              <p className="text-sm text-muted-foreground">Passages studied</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-2xl font-semibold text-primary">{context.stats.totalEntriesLast30Days}</p>
              <p className="text-sm text-muted-foreground">Journal entries (30d)</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-2xl font-semibold text-primary">{context.stats.reflectionsWritten}</p>
              <p className="text-sm text-muted-foreground">Reflections written</p>
            </div>
          </div>

          {/* Suggested topic */}
          <button
            onClick={handleSuggestedTopic}
            className="w-full rounded-xl border border-border bg-card p-6 text-left transition-colors hover:border-primary/50"
          >
            <div className="flex items-start gap-3">
              <Sparkles className="mt-1 h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Suggested topic</p>
                <p className="mt-1 text-muted-foreground">{context.suggestedTopic}</p>
              </div>
            </div>
          </button>

          {/* Recent texts */}
          {context.recentTexts.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-3 flex items-center gap-2 font-medium">
                <BookOpen className="h-4 w-4" />
                Recently studied
              </h3>
              <div className="flex flex-wrap gap-2">
                {context.recentTexts.map((item, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-muted px-3 py-1 text-sm"
                  >
                    {item.text}: {item.reference}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Conversation starters */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Or try asking...</p>
            <div className="flex flex-wrap gap-2">
              {[
                "What should I focus on in my practice today?",
                "I'm struggling with anxiety about the future",
                "Help me understand the dichotomy of control",
                "What would Marcus Aurelius say about my situation?",
              ].map((starter, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInput(starter);
                    inputRef.current?.focus();
                  }}
                  className="rounded-full border border-border px-4 py-2 text-sm transition-colors hover:border-primary/50 hover:bg-muted"
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      {messages.length > 0 && (
        <div className="flex-1 overflow-y-auto py-4">
          <div className="space-y-4">
            {messages.map((message, i) => (
              <div
                key={i}
                className={cn(
                  'flex',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-4 py-3',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
              </div>
            ))}
            {chatMutation.isPending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-muted-foreground">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="mt-auto border-t border-border pt-4">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your mentor anything..."
            rows={1}
            className={cn(
              'flex-1 resize-none rounded-xl border border-border bg-card px-4 py-3',
              'placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
              'max-h-32'
            )}
            style={{
              height: 'auto',
              minHeight: '48px',
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || chatMutation.isPending}
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground',
              'transition-colors hover:bg-primary/90 disabled:opacity-50'
            )}
          >
            {chatMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Your mentor draws from the passages you've studied and your journal entries
        </p>
      </form>
    </div>
  );
}
