import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading } = useAuth();

  const isDevelopment = import.meta.env.DEV;
  const bypassAuth = isDevelopment && window.location.hostname === '127.0.0.1';

  if (bypassAuth) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-luxury flex items-center justify-center">
        <div className="glass-card p-8 rounded-2xl">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-lg font-semibold text-foreground">Carregando ExecutiveAI...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};