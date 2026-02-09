import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { LoginForm } from '@/components/auth/LoginForm';

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

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
