import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/utils';

export function Login() {
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const login = useAuthStore((state) => state.login);
  const isSetup = useAuthStore((state) => state.isSetup);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const authLoading = useAuthStore((state) => state.isLoading);
  const navigate = useNavigate();

  // Redirect to home if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const success = await login(passphrase);

    if (success) {
      navigate('/');
    } else {
      setError('Invalid passphrase');
    }

    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-4xl font-semibold text-primary">Aurelius</h1>
          <p className="mt-2 text-muted-foreground">
            Your personal Stoic journal
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-6 text-center text-lg font-medium">
            {isSetup ? 'Welcome back' : 'Create your passphrase'}
          </h2>

          {!isSetup && (
            <p className="mb-6 text-center text-sm text-muted-foreground">
              This passphrase will protect your journal. Choose something memorable
              but secure.
            </p>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="passphrase" className="mb-2 block text-sm font-medium">
                Passphrase
              </label>
              <input
                id="passphrase"
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Enter your passphrase"
                className={cn(
                  'w-full rounded-lg border border-input bg-background px-4 py-3',
                  'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
                  'placeholder:text-muted-foreground'
                )}
                minLength={8}
                required
              />
            </div>

            {error && (
              <p className="mb-4 text-center text-sm text-destructive">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                'w-full rounded-lg bg-primary py-3 font-medium text-primary-foreground',
                'transition-colors hover:bg-primary/90',
                'disabled:cursor-not-allowed disabled:opacity-50'
              )}
            >
              {isLoading ? 'Please wait...' : isSetup ? 'Enter' : 'Create Journal'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          "Waste no more time arguing about what a good man should be. Be one."
          <br />
          <span className="italic">— Marcus Aurelius</span>
        </p>
      </div>
    </div>
  );
}
