import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, ArrowLeft, Scale } from 'lucide-react';
import { Link } from 'react-router-dom';

// --- TYPE DEFINITIONS ---

interface SignUpPageProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  heroImageSrc?: string;
  isLoading?: boolean;
  onSignUp?: (name: string, email: string, password: string) => void;
  onBackToLogin?: () => void;
}

// --- SUB-COMPONENTS ---

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-xl border border-border bg-card/50 backdrop-blur-sm transition-all duration-200 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
    {children}
  </div>
);

// --- MAIN COMPONENT ---

export const SignUpPage: React.FC<SignUpPageProps> = ({
  title = <span className="font-light text-foreground tracking-tighter">Criar Conta</span>,
  description = "Junte-se a nós e comece sua jornada de automação jurídica",
  heroImageSrc,
  isLoading = false,
  onSignUp,
  onBackToLogin,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    onSignUp?.(name, email, password);
  };

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Left column: sign-up form */}
      <section className="w-full lg:w-[480px] xl:w-[520px] flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-12">
        <div className="w-full max-w-sm mx-auto lg:mx-0">
          {/* Back button */}
          <button 
            onClick={onBackToLogin}
            className="animate-element animate-delay-100 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao login
          </button>

          {/* Logo */}
          <div className="animate-element animate-delay-100 flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center">
              <Scale className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold">
              <span className="text-primary">Legal</span>Agent
            </span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="animate-element animate-delay-100 text-2xl sm:text-3xl font-semibold leading-tight mb-2">{title}</h1>
            <p className="animate-element animate-delay-200 text-muted-foreground text-sm">{description}</p>
          </div>

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="animate-element animate-delay-300 space-y-1.5">
              <label className="text-sm font-medium text-foreground">Nome Completo</label>
              <GlassInputWrapper>
                <input 
                  name="name" 
                  type="text" 
                  placeholder="Dr. João Silva" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-transparent text-sm h-11 px-4 rounded-xl focus:outline-none text-foreground placeholder:text-muted-foreground" 
                />
              </GlassInputWrapper>
            </div>

            <div className="animate-element animate-delay-400 space-y-1.5">
              <label className="text-sm font-medium text-foreground">E-mail</label>
              <GlassInputWrapper>
                <input 
                  name="email" 
                  type="email" 
                  placeholder="seu@email.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-transparent text-sm h-11 px-4 rounded-xl focus:outline-none text-foreground placeholder:text-muted-foreground" 
                />
              </GlassInputWrapper>
            </div>

            <div className="animate-element animate-delay-500 space-y-1.5">
              <label className="text-sm font-medium text-foreground">Senha</label>
              <GlassInputWrapper>
                <div className="relative">
                  <input 
                    name="password" 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-transparent text-sm h-11 px-4 pr-11 rounded-xl focus:outline-none text-foreground placeholder:text-muted-foreground" 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </GlassInputWrapper>
            </div>

            <div className="animate-element animate-delay-600 space-y-1.5">
              <label className="text-sm font-medium text-foreground">Confirmar Senha</label>
              <GlassInputWrapper>
                <div className="relative">
                  <input 
                    name="confirmPassword" 
                    type={showConfirmPassword ? 'text' : 'password'} 
                    placeholder="••••••••" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full bg-transparent text-sm h-11 px-4 pr-11 rounded-xl focus:outline-none text-foreground placeholder:text-muted-foreground" 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                    className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </GlassInputWrapper>
            </div>

            {error && (
              <p className="text-destructive text-sm animate-fade-in">{error}</p>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="animate-element animate-delay-700 w-full h-11 rounded-xl bg-primary font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Criar Conta
            </button>
          </form>

          {/* Sign in link */}
          <p className="animate-element animate-delay-800 text-center text-sm text-muted-foreground mt-6">
            Já tem uma conta?{' '}
            <button 
              type="button"
              onClick={onBackToLogin} 
              className="text-primary hover:text-primary/80 hover:underline transition-colors font-medium"
            >
              Entrar
            </button>
          </p>

          {/* Footer links */}
          <div className="animate-element animate-delay-900 flex items-center justify-center gap-4 mt-8 pt-6 border-t border-border">
            <Link 
              to="/privacy" 
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Política de Privacidade
            </Link>
            <span className="text-muted-foreground/50">•</span>
            <Link 
              to="/terms" 
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Termos de Serviço
            </Link>
          </div>
        </div>
      </section>

      {/* Right column: hero image */}
      {heroImageSrc && (
        <section className="hidden lg:block flex-1 relative m-4 ml-0">
          <div 
            className="animate-slide-right animate-delay-300 absolute inset-0 rounded-3xl bg-cover bg-center"
            style={{ backgroundImage: `url(${heroImageSrc})` }}
          >
            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent rounded-3xl" />
          </div>
        </section>
      )}
    </div>
  );
};
