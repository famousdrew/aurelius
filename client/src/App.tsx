import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth';
import { Layout } from '@/components/Layout';
import { Login } from '@/pages/Login';
import { Home } from '@/pages/Home';
import { MorningRoutine } from '@/pages/MorningRoutine';
import { EveningReflection } from '@/pages/EveningReflection';
import { Freeform } from '@/pages/Freeform';
import { Journal } from '@/pages/Journal';
import { Insights } from '@/pages/Insights';
import { Quotes } from '@/pages/Quotes';
import { Settings } from '@/pages/Settings';
import { Mentor } from '@/pages/Mentor';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Apply dark mode based on system preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      document.documentElement.classList.toggle('dark', e.matches);
    };

    handleChange(mediaQuery);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/morning" element={<MorningRoutine />} />
                <Route path="/evening" element={<EveningReflection />} />
                <Route path="/write" element={<Freeform />} />
                <Route path="/journal" element={<Journal />} />
                <Route path="/insights" element={<Insights />} />
                <Route path="/quotes" element={<Quotes />} />
                <Route path="/mentor" element={<Mentor />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
