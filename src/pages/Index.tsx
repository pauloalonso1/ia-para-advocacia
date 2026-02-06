import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Menu, X, Bot, Calendar, MessageSquare, Shield,
  FileSignature, Zap, BarChart3, Users, CheckCircle2, Clock,
  Send, BrainCircuit, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatedGroup } from '@/components/ui/animated-group';
import { cn } from '@/lib/utils';

const transitionVariants = {
  item: {
    hidden: { opacity: 0, filter: 'blur(12px)', y: 12 },
    visible: {
      opacity: 1, filter: 'blur(0px)', y: 0,
      transition: { type: 'spring' as const, bounce: 0.3, duration: 1.5 },
    },
  },
};

const staggeredVariants = {
  container: {
    visible: { transition: { staggerChildren: 0.05, delayChildren: 0.75 } },
  },
  ...transitionVariants,
};

const menuItems = [
  { name: 'Funcionalidades', href: '#features' },
  { name: 'Como funciona', href: '#how-it-works' },
  { name: 'Benefícios', href: '#benefits' },
  { name: 'Privacidade', href: '/privacy' },
];

/* ─── Header ─── */
const HeroHeader = () => {
  const [menuState, setMenuState] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header>
      <nav data-state={menuState && 'active'} className="fixed z-20 w-full px-2 group">
        <div className={cn('mx-auto mt-2 max-w-6xl px-6 transition-all duration-300 lg:px-12', isScrolled && 'bg-background/50 max-w-4xl rounded-2xl border backdrop-blur-lg lg:px-5')}>
          <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
            <div className="flex w-full justify-between lg:w-auto">
              <Link to="/" aria-label="home" className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-foreground">Advocacia IA</span>
              </Link>
              <button
                onClick={() => setMenuState(!menuState)}
                aria-label={menuState ? 'Close Menu' : 'Open Menu'}
                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden">
                <Menu className="in-data-[state=active]:rotate-180 group-data-[state=active]:scale-0 group-data-[state=active]:opacity-0 m-auto size-6 duration-200" />
                <X className="group-data-[state=active]:rotate-0 group-data-[state=active]:scale-100 group-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200" />
              </button>
            </div>
            <div className="absolute inset-0 m-auto hidden size-fit lg:block">
              <ul className="flex gap-8 text-sm">
                {menuItems.map((item, index) => (
                  <li key={index}>
                    {item.href.startsWith('/') ? (
                      <Link to={item.href} className="text-muted-foreground hover:text-foreground block duration-150"><span>{item.name}</span></Link>
                    ) : (
                      <a href={item.href} className="text-muted-foreground hover:text-foreground block duration-150"><span>{item.name}</span></a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-background group-data-[state=active]:block lg:group-data-[state=active]:flex mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border p-6 shadow-2xl md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none dark:lg:bg-transparent">
              <div className="lg:hidden">
                <ul className="space-y-6 text-base">
                  {menuItems.map((item, index) => (
                    <li key={index}>
                      {item.href.startsWith('/') ? (
                        <Link to={item.href} className="text-muted-foreground hover:text-foreground block duration-150"><span>{item.name}</span></Link>
                      ) : (
                        <a href={item.href} className="text-muted-foreground hover:text-foreground block duration-150"><span>{item.name}</span></a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
                <Button asChild variant="outline" size="sm" className={cn(isScrolled && 'lg:hidden')}>
                  <Link to="/auth"><span>Entrar</span></Link>
                </Button>
                <Button asChild size="sm" className={cn(isScrolled && 'lg:hidden')}>
                  <Link to="/auth"><span>Criar conta</span></Link>
                </Button>
                <Button asChild size="sm" className={cn(isScrolled ? 'lg:inline-flex' : 'hidden')}>
                  <Link to="/auth"><span>Começar grátis</span></Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};

/* ─── Page ─── */
const Index = () => {
  return (
    <>
      <HeroHeader />
      <main className="overflow-hidden">
        {/* Decorative BG */}
        <div aria-hidden className="z-[2] absolute inset-0 pointer-events-none isolate opacity-50 contain-strict hidden lg:block">
          <div className="w-[35rem] h-[80rem] -translate-y-[350px] absolute left-0 top-0 -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(205,88%,53%,.08)_0,hsla(205,88%,53%,.02)_50%,hsla(205,88%,53%,0)_80%)]" />
          <div className="h-[80rem] absolute left-0 top-0 w-56 -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(205,88%,53%,.06)_0,hsla(205,88%,53%,.02)_80%,transparent_100%)] [translate:5%_-50%]" />
        </div>

        {/* ═══ HERO ═══ */}
        <section>
          <div className="relative pt-24 md:pt-36">
            <div aria-hidden className="absolute inset-0 -z-10 size-full [background:radial-gradient(125%_125%_at_50%_100%,transparent_0%,hsl(var(--background))_75%)]" />
            <div className="mx-auto max-w-7xl px-6">
              <div className="text-center sm:mx-auto">
                <AnimatedGroup variants={transitionVariants}>
                  <Link
                    to="/auth"
                    className="hover:bg-background dark:hover:border-t-border bg-muted group mx-auto flex w-fit items-center gap-4 rounded-full border p-1 pl-4 shadow-md shadow-black/5 transition-all duration-300 dark:border-t-white/5 dark:shadow-zinc-950">
                    <span className="text-foreground text-sm">Automatize seu escritório com IA</span>
                    <span className="dark:border-background block h-4 w-0.5 border-l bg-border dark:bg-zinc-700" />
                    <div className="bg-background group-hover:bg-muted size-6 overflow-hidden rounded-full duration-500">
                      <div className="flex w-12 -translate-x-1/2 duration-500 ease-in-out group-hover:translate-x-0">
                        <span className="flex size-6"><ArrowRight className="m-auto size-3" /></span>
                        <span className="flex size-6"><ArrowRight className="m-auto size-3" /></span>
                      </div>
                    </div>
                  </Link>

                  <h1 className="mt-8 max-w-4xl mx-auto text-balance text-5xl md:text-6xl lg:mt-16 xl:text-[5.25rem] font-bold tracking-tight text-foreground">
                    Do primeiro contato à assinatura do contrato, sem esforço
                  </h1>
                  <p className="mx-auto mt-8 max-w-2xl text-balance text-lg text-foreground/80">
                    Captura de leads, qualificação por IA, agendamento automático, envio de contratos e assinatura digital. Tudo no piloto automático para seu escritório de advocacia.
                  </p>
                </AnimatedGroup>

                <AnimatedGroup variants={staggeredVariants} className="mt-12 flex flex-col items-center justify-center gap-2 md:flex-row">
                  <div className="bg-foreground/10 rounded-[14px] border p-0.5">
                    <Button asChild size="lg" className="rounded-xl px-6 text-base">
                      <Link to="/auth">
                        Começar grátis
                        <ArrowRight className="ml-2 size-4" />
                      </Link>
                    </Button>
                  </div>
                  <Button asChild size="lg" variant="ghost" className="rounded-xl px-5">
                    <Link to="/auth">Já tenho conta</Link>
                  </Button>
                </AnimatedGroup>

                {/* Social proof mini */}
                <AnimatedGroup variants={staggeredVariants} className="mt-10 flex items-center justify-center gap-6 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-primary" /> Sem cartão de crédito</span>
                  <span className="flex items-center gap-1.5"><Clock className="size-4 text-primary" /> Setup em 5 minutos</span>
                  <span className="flex items-center gap-1.5"><Shield className="size-4 text-primary" /> Dados protegidos</span>
                </AnimatedGroup>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ FEATURES ═══ */}
        <section id="features" className="py-24 md:py-32">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center mb-16">
              <span className="text-primary text-sm font-semibold uppercase tracking-wider">Funcionalidades</span>
              <h2 className="mt-4 text-3xl md:text-4xl font-bold text-foreground">Tudo que seu escritório precisa em um só lugar</h2>
              <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
                Cada funcionalidade foi pensada para eliminar trabalho manual e acelerar a conversão de clientes.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <FeatureCard icon={<Bot className="size-7 text-primary" />} title="Agentes de IA" description="Agentes inteligentes que atendem, qualificam e encaminham clientes automaticamente via WhatsApp." />
              <FeatureCard icon={<MessageSquare className="size-7 text-primary" />} title="WhatsApp Integrado" description="Receba e responda todas as mensagens em um painel centralizado com histórico completo." />
              <FeatureCard icon={<Calendar className="size-7 text-primary" />} title="Agendamento Automático" description="Integração com Google Calendar que verifica disponibilidade e marca consultas sozinho." />
              <FeatureCard icon={<FileSignature className="size-7 text-primary" />} title="Contratos e Assinatura" description="Envie contratos via ZapSign e acompanhe assinaturas digitais em tempo real." />
              <FeatureCard icon={<BarChart3 className="size-7 text-primary" />} title="CRM Jurídico" description="Kanban de leads com funil completo, tags, notas e acompanhamento por estágio." />
              <FeatureCard icon={<BrainCircuit className="size-7 text-primary" />} title="Base de Conhecimento" description="Alimente seus agentes com documentos e FAQs para respostas precisas e contextuais." />
            </div>
            {/* CTA after features */}
            <div className="mt-12 text-center">
              <Button asChild size="lg" className="rounded-xl px-8 text-base">
                <Link to="/auth">
                  Experimentar agora
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* ═══ HOW IT WORKS ═══ */}
        <section id="how-it-works" className="py-24 md:py-32 bg-card/50">
          <div className="mx-auto max-w-5xl px-6">
            <div className="text-center mb-16">
              <span className="text-primary text-sm font-semibold uppercase tracking-wider">Como funciona</span>
              <h2 className="mt-4 text-3xl md:text-4xl font-bold text-foreground">4 passos para automatizar seu atendimento</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <StepCard number="01" icon={<Zap className="size-6" />} title="Conecte o WhatsApp" description="Vincule seu número e comece a receber mensagens na plataforma." />
              <StepCard number="02" icon={<Bot className="size-6" />} title="Configure seu agente" description="Escolha um template jurídico ou crie seu agente personalizado com IA." />
              <StepCard number="03" icon={<Calendar className="size-6" />} title="Integre a agenda" description="Conecte o Google Calendar para agendamento automático de consultas." />
              <StepCard number="04" icon={<Send className="size-6" />} title="Automatize tudo" description="Leads qualificados, reuniões agendadas e contratos enviados automaticamente." />
            </div>
            {/* CTA after how-it-works */}
            <div className="mt-14 text-center">
              <Button asChild size="lg" variant="outline" className="rounded-xl px-8 text-base border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                <Link to="/auth">
                  Criar minha conta
                  <ChevronRight className="ml-1 size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* ═══ BENEFITS ═══ */}
        <section id="benefits" className="py-24 md:py-32">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <span className="text-primary text-sm font-semibold uppercase tracking-wider">Por que escolher</span>
                <h2 className="mt-4 text-3xl md:text-4xl font-bold text-foreground">Foque nos seus clientes, não em tarefas repetitivas</h2>
                <p className="mt-6 text-muted-foreground text-lg">
                  Enquanto a IA cuida do atendimento inicial, qualificação e agendamento, você dedica seu tempo ao que realmente gera valor: a advocacia.
                </p>
                <Button asChild size="lg" className="mt-8 rounded-xl px-8 text-base">
                  <Link to="/auth">
                    Começar agora
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <BenefitCard icon={<Clock className="size-5 text-primary" />} title="Economize 20h/semana" description="Elimine tarefas repetitivas de triagem e agendamento." />
                <BenefitCard icon={<Users className="size-5 text-primary" />} title="Atenda 24/7" description="Seu agente nunca dorme. Capture leads a qualquer hora." />
                <BenefitCard icon={<BarChart3 className="size-5 text-primary" />} title="Aumente conversão" description="Funil otimizado do primeiro contato à assinatura." />
                <BenefitCard icon={<Shield className="size-5 text-primary" />} title="100% seguro" description="Dados criptografados e em conformidade com a LGPD." />
              </div>
            </div>
          </div>
        </section>

        {/* ═══ STATS / SOCIAL PROOF ═══ */}
        <section className="py-16 bg-card/50 border-y border-border">
          <div className="mx-auto max-w-5xl px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <StatItem value="500+" label="Escritórios ativos" />
              <StatItem value="50k+" label="Atendimentos por mês" />
              <StatItem value="95%" label="Taxa de satisfação" />
              <StatItem value="24/7" label="Disponibilidade" />
            </div>
          </div>
        </section>

        {/* ═══ FINAL CTA ═══ */}
        <section className="py-24 md:py-32">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground">
              Pronto para transformar seu escritório?
            </h2>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
              Crie sua conta gratuitamente e comece a automatizar atendimentos, agendamentos e contratos em minutos.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <div className="bg-foreground/10 rounded-[14px] border p-0.5">
                <Button asChild size="lg" className="rounded-xl px-8 text-base">
                  <Link to="/auth">
                    Começar grátis
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
              </div>
              <Button asChild size="lg" variant="ghost" className="rounded-xl px-6">
                <Link to="/auth">Entrar na minha conta</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Sem cartão de crédito. Cancele quando quiser.</p>
          </div>
        </section>

        {/* ═══ FOOTER ═══ */}
        <footer className="border-t border-border py-12">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <span className="text-lg font-bold text-foreground">Advocacia IA</span>
                <p className="mt-3 text-sm text-muted-foreground max-w-xs">
                  Plataforma de automação inteligente para escritórios de advocacia.
                </p>
              </div>
              <div>
                <span className="text-sm font-semibold text-foreground">Produto</span>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <li><a href="#features" className="hover:text-foreground transition-colors">Funcionalidades</a></li>
                  <li><a href="#how-it-works" className="hover:text-foreground transition-colors">Como funciona</a></li>
                  <li><a href="#benefits" className="hover:text-foreground transition-colors">Benefícios</a></li>
                </ul>
              </div>
              <div>
                <span className="text-sm font-semibold text-foreground">Legal</span>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <li><Link to="/privacy" className="hover:text-foreground transition-colors">Política de Privacidade</Link></li>
                  <li><Link to="/terms" className="hover:text-foreground transition-colors">Termos de Serviço</Link></li>
                </ul>
              </div>
            </div>
            <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
              <span>© {new Date().getFullYear()} Advocacia IA. Todos os direitos reservados.</span>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
};

/* ─── Sub-components ─── */

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="rounded-xl border border-border bg-card p-6 space-y-3 hover:border-primary/30 transition-colors duration-300">
    <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center">{icon}</div>
    <h3 className="font-semibold text-foreground">{title}</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
  </div>
);

const StepCard = ({ number, icon, title, description }: { number: string; icon: React.ReactNode; title: string; description: string }) => (
  <div className="text-center space-y-4">
    <div className="mx-auto size-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
      {icon}
    </div>
    <span className="text-xs font-bold text-primary tracking-widest uppercase">Passo {number}</span>
    <h3 className="font-semibold text-foreground">{title}</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
  </div>
);

const BenefitCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="rounded-xl border border-border bg-card p-5 space-y-2 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
    <div className="flex items-center gap-2">
      {icon}
      <h4 className="font-semibold text-foreground text-sm">{title}</h4>
    </div>
    <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
  </div>
);

const StatItem = ({ value, label }: { value: string; label: string }) => (
  <div>
    <div className="text-3xl md:text-4xl font-bold text-primary">{value}</div>
    <div className="mt-1 text-sm text-muted-foreground">{label}</div>
  </div>
);

export default Index;
