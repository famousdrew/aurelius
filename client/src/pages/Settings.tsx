import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import { Moon, Sun, Download, LogOut, Shield } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

export function Settings() {
  const [isDark, setIsDark] = useState(
    document.documentElement.classList.contains('dark')
  );
  const [isExporting, setIsExporting] = useState(false);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    document.documentElement.classList.toggle('dark', newIsDark);
    localStorage.setItem('theme', newIsDark ? 'dark' : 'light');
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await api.get<{ entries: unknown[]; quotes: unknown[] }>('/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aurelius-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">Customize your experience</p>
      </div>

      {/* Appearance */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-medium">Appearance</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isDark ? (
              <Moon className="h-5 w-5 text-primary" />
            ) : (
              <Sun className="h-5 w-5 text-primary" />
            )}
            <div>
              <p className="font-medium">Theme</p>
              <p className="text-sm text-muted-foreground">
                {isDark ? 'Dark mode' : 'Light mode'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className={cn(
              'relative h-7 w-12 rounded-full transition-colors',
              isDark ? 'bg-primary' : 'bg-muted'
            )}
          >
            <span
              className={cn(
                'absolute top-1 h-5 w-5 rounded-full bg-white transition-transform',
                isDark ? 'left-6' : 'left-1'
              )}
            />
          </button>
        </div>
      </section>

      {/* Data */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-medium">Your Data</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Download className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Export Data</p>
                <p className="text-sm text-muted-foreground">
                  Download all your journal entries as JSON
                </p>
              </div>
            </div>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className={cn(
                'rounded-lg bg-muted px-4 py-2 text-sm font-medium',
                'transition-colors hover:bg-muted/80 disabled:opacity-50'
              )}
            >
              {isExporting ? 'Exporting...' : 'Export'}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Privacy</p>
                <p className="text-sm text-muted-foreground">
                  Your data is stored securely on your own server
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Account */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-medium">Account</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LogOut className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium">Sign Out</p>
              <p className="text-sm text-muted-foreground">
                End your current session
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className={cn(
              'rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white',
              'transition-colors hover:bg-destructive/90'
            )}
          >
            Sign Out
          </button>
        </div>
      </section>

      {/* About */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-medium">About</h2>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Aurelius</strong> - Personal Stoic Journal
          </p>
          <p>Version 1.0.0</p>
          <p className="mt-4 font-serif italic">
            "Waste no more time arguing about what a good man should be. Be one."
          </p>
          <p>— Marcus Aurelius</p>
        </div>
      </section>
    </div>
  );
}
