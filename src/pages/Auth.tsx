import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignUpPage } from '@/components/ui/sign-up';

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<'login' | 'signup'>('login');
  const { signIn, signUp } = useAuth();
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

  const handleSignup = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    const { error } = await signUp(email, password, name);
    if (error) {
      toast({ title: 'Erro ao cadastrar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Cadastro realizado!', description: 'Verifique seu e-mail para confirmar a conta.' });
      setView('login');
    }
    setIsLoading(false);
  };

  const handleResetPassword = () => {
    toast({ title: 'Em breve', description: 'Recuperação de senha será disponibilizada em breve.' });
  };

  if (view === 'signup') {
    return (
      <SignUpPage
        heroImageSrc="https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1920&q=80"
        isLoading={isLoading}
        onSignUp={handleSignup}
        onBackToLogin={() => setView('login')}
      />
    );
  }

  return (
    <LoginForm
      isLoading={isLoading}
      onSignIn={handleLogin}
      onResetPassword={handleResetPassword}
      onCreateAccount={() => setView('signup')}
    />
  );
};

export default Auth;
