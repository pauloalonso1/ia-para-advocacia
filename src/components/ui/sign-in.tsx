import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, Scale } from 'lucide-react';
import { Link } from 'react-router-dom';

// --- HELPER COMPONENTS (ICONS) ---

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-2.641-.21-5.236-.611-7.743z" />
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.026 44 30.038 44 24c0-2.641-.21-5.236-.611-7.743z" />
  </svg>
);

// --- TYPE DEFINITIONS ---

export interface Testimonial {
  avatarSrc: string;
  name: string;
  handle: string;
  text: string;
}

interface SignInPageProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  heroImageSrc?: string;
  testimonials?: Testimonial[];
  isLoading?: boolean;
  onSignIn?: (email: string, password: string) => void;
  onGoogleSignIn?: () => void;
  onResetPassword?: () => void;
  onCreateAccount?: () => void;
}

// --- SUB-COMPONENTS ---

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-xl border border-border bg-card/50 backdrop-blur-sm transition-all duration-200 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
    {children}
  </div>
);

const TestimonialCard = ({ testimonial, delay }: { testimonial: Testimonial, delay: string }) => (
  <div className={`animate-testimonial ${delay} flex items-start gap-3 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 p-4 w-56`}>
    <img src={testimonial.avatarSrc} className="h-9 w-9 object-cover rounded-xl shrink-0" alt="avatar" />
    <div className="text-xs leading-snug min-w-0">
      <p className="font-medium text-white truncate">{testimonial.name}</p>
      <p className="text-white/60 truncate">{testimonial.handle}</p>
      <p className="mt-1 text-white/80 line-clamp-2">{testimonial.text}</p>
    </div>
  </div>
);

// --- MAIN COMPONENT ---

export const SignInPage: React.FC<SignInPageProps> = ({
  title = <span className="font-light text-foreground tracking-tighter">Bem-vindo</span>,
  description = "Acesse sua conta e continue sua jornada conosco",
  heroImageSrc,
  testimonials = [],
  isLoading = false,
  onSignIn,
  onGoogleSignIn,
  onResetPassword,
  onCreateAccount,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSignIn?.(email, password);
  };

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Left column: sign-in form */}
      <section className="w-full lg:w-[480px] xl:w-[520px] flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-12">
        <div className="w-full max-w-sm mx-auto lg:mx-0">
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

            <div className="animate-element animate-delay-400 space-y-1.5">
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

            <div className="animate-element animate-delay-500 flex items-center justify-between text-sm pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  name="rememberMe" 
                  className="w-4 h-4 rounded border-border bg-card accent-primary cursor-pointer" 
                />
                <span className="text-muted-foreground">Lembrar de mim</span>
              </label>
              <button 
                type="button"
                onClick={onResetPassword} 
                className="text-primary hover:text-primary/80 hover:underline transition-colors"
              >
                Esqueceu a senha?
              </button>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="animate-element animate-delay-600 w-full h-11 rounded-xl bg-primary font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Entrar
            </button>
          </form>

          {/* Divider */}
          <div className="animate-element animate-delay-700 relative flex items-center justify-center my-6">
            <span className="w-full border-t border-border"></span>
            <span className="px-3 text-xs text-muted-foreground bg-background absolute whitespace-nowrap">ou continue com</span>
          </div>

          {/* Google button */}
          <button 
            onClick={onGoogleSignIn} 
            disabled={isLoading}
            className="animate-element animate-delay-800 w-full h-11 flex items-center justify-center gap-2.5 border border-border rounded-xl text-sm font-medium hover:bg-card transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <GoogleIcon />
            Google
          </button>

          {/* Sign up link */}
          <p className="animate-element animate-delay-900 text-center text-sm text-muted-foreground mt-6">
            Não tem uma conta?{' '}
            <button 
              type="button"
              onClick={onCreateAccount} 
              className="text-primary hover:text-primary/80 hover:underline transition-colors font-medium"
            >
              Criar conta
            </button>
          </p>

          {/* Footer links */}
          <div className="animate-element animate-delay-1000 flex items-center justify-center gap-4 mt-8 pt-6 border-t border-border">
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

      {/* Right column: hero image + testimonials */}
      {heroImageSrc && (
        <section className="hidden lg:block flex-1 relative m-4 ml-0">
          <div 
            className="animate-slide-right animate-delay-300 absolute inset-0 rounded-3xl bg-cover bg-center"
            style={{ backgroundImage: `url(${heroImageSrc})` }}
          >
            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent rounded-3xl" />
          </div>
          
          {/* Testimonials */}
          {testimonials.length > 0 && (
            <div className="absolute bottom-6 left-6 right-6 flex gap-3 overflow-hidden">
              <TestimonialCard testimonial={testimonials[0]} delay="animate-delay-1000" />
              {testimonials[1] && (
                <div className="hidden xl:block">
                  <TestimonialCard testimonial={testimonials[1]} delay="animate-delay-1200" />
                </div>
              )}
              {testimonials[2] && (
                <div className="hidden 2xl:block">
                  <TestimonialCard testimonial={testimonials[2]} delay="animate-delay-1400" />
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
