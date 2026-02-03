import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { SignInPage, Testimonial } from '@/components/ui/sign-in';
import { SignUpPage } from '@/components/ui/sign-up';

const testimonials: Testimonial[] = [
  {
    avatarSrc: "https://randomuser.me/api/portraits/women/57.jpg",
    name: "Dra. Ana Costa",
    handle: "@anacosta.adv",
    text: "O LegalAgent AI transformou meu escritório. Atendimento 24/7 com qualidade!"
  },
  {
    avatarSrc: "https://randomuser.me/api/portraits/men/64.jpg",
    name: "Dr. Carlos Lima",
    handle: "@carloslima.law",
    text: "Automação jurídica de primeira. Meus clientes ficam impressionados com a agilidade."
  },
  {
    avatarSrc: "https://randomuser.me/api/portraits/men/32.jpg",
    name: "Dr. Roberto Alves",
    handle: "@robertoalves",
    text: "Consegui triplicar minha captação de clientes com os agentes de IA."
  },
];

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<'login' | 'signup'>('login');
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true);

    const { error } = await signIn(email, password);
    
    if (error) {
      toast({
        title: 'Erro ao entrar',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Bem-vindo!',
        description: 'Login realizado com sucesso.'
      });
      navigate('/dashboard');
    }
    
    setIsLoading(false);
  };

  const handleSignup = async (name: string, email: string, password: string) => {
    setIsLoading(true);

    const { error } = await signUp(email, password, name);
    
    if (error) {
      toast({
        title: 'Erro ao cadastrar',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Cadastro realizado!',
        description: 'Verifique seu e-mail para confirmar a conta.'
      });
      setView('login');
    }
    
    setIsLoading(false);
  };

  const handleGoogleSignIn = () => {
    toast({
      title: 'Em breve',
      description: 'Login com Google será disponibilizado em breve.'
    });
  };

  const handleResetPassword = () => {
    toast({
      title: 'Em breve',
      description: 'Recuperação de senha será disponibilizada em breve.'
    });
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
    <SignInPage
      title={
        <span className="font-light tracking-tighter">
          <span className="text-primary">Legal</span>Agent AI
        </span>
      }
      description="Automação jurídica com inteligência artificial para escritórios de advocacia"
      heroImageSrc="https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1920&q=80"
      testimonials={testimonials}
      isLoading={isLoading}
      onSignIn={handleLogin}
      onGoogleSignIn={handleGoogleSignIn}
      onResetPassword={handleResetPassword}
      onCreateAccount={() => setView('signup')}
    />
  );
};

export default Auth;
