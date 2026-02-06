import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { WaveLoader } from '@/components/ui/wave-loader';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <WaveLoader bars={5} message="Carregando..." messagePlacement="bottom" className="bg-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
