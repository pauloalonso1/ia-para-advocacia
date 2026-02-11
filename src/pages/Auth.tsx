import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { LoginForm } from '@/components/auth/LoginForm';
import { WaveLoader } from '@/components/ui/wave-loader';

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <WaveLoader bars={5} message="Carregando..." messagePlacement="bottom" className="bg-primary" />
      </div>
    );
  }

  if (user) {
    return null;
  }

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast({ title: 'Erro ao entrar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Bem-vindo!', description: 'Login realizado com sucesso.' });
      navigate('/dashboard');
    }
    setIsLoading(false);
  };

  const handleResetPassword = () => {
    toast({ title: 'Em breve', description: 'Recuperação de senha será disponibilizada em breve.' });
  };

  return (
    <LoginForm
      isLoading={isLoading}
      onSignIn={handleLogin}
      onResetPassword={handleResetPassword}
    />
  );
};

export default Auth;
