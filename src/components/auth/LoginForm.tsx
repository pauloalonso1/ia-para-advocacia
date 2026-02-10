import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShineBorder } from "@/components/ui/shine-border";
import lexiaLogo from "@/assets/lexia-logo.svg";
import lawyerImg from "@/assets/login-hero.png";

interface LoginFormProps {
  isLoading: boolean;
  onSignIn: (email: string, password: string) => void;
  onResetPassword: () => void;
}

export const LoginForm = ({ isLoading, onSignIn, onResetPassword }: LoginFormProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSignIn(email, password);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left - Hero Image */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${lawyerImg})` }}
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/20" />

        <div className="relative z-20">
          <img src={lexiaLogo} alt="Lexia" className="h-10" />
        </div>

        <div className="relative z-20" />

        <div className="relative z-20 flex items-center gap-8 text-sm text-white/60">
          <Link to="/privacy" className="hover:text-white transition-colors">
            Política de Privacidade
          </Link>
          <Link to="/terms" className="hover:text-white transition-colors">
            Termos de Serviço
          </Link>
        </div>
      </div>

      {/* Right - Form */}
      <div className="flex items-center justify-center p-8 bg-background">
        <ShineBorder color={["#A07CFE", "#FE8FB5", "#FFBE7B"]} borderRadius={12} className="w-full max-w-[420px]">
          <Card className="relative w-full overflow-hidden border-0 shadow-none bg-transparent">

          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center pt-6">
            <img src={lexiaLogo} alt="Lexia" className="h-10" />
          </div>

          <CardHeader className="text-center pb-2">
            <CardTitle className="text-3xl font-bold tracking-tight">Bem-vindo de volta!</CardTitle>
            <CardDescription>Insira seus dados para acessar sua conta</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  autoComplete="off"
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 bg-background border-border/60 focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 pr-10 bg-background border-border/60 focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox id="remember" />
                  <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                    Lembrar de mim
                  </Label>
                </div>
                <button
                  type="button"
                  onClick={onResetPassword}
                  className="text-sm text-primary hover:underline font-medium"
                >
                  Esqueceu a senha?
                </button>
              </div>

              <Button type="submit" className="w-full h-12 text-base font-medium" size="lg" disabled={isLoading}>
                {isLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Entrando...</> : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
        </ShineBorder>
      </div>
    </div>
  );
};
