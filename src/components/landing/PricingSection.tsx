import React from 'react';
import { Link } from 'react-router-dom';
import { Users, CheckCircle, XCircle, Crown, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RainbowButton } from '@/components/ui/rainbow-button';

type PlanFeature = {
  text: string;
  included: boolean;
};

type Plan = {
  name: string;
  icon: React.ReactNode;
  badge: string;
  price: string;
  originalPrice?: string;
  period: string;
  ctaLabel: string;
  highlighted?: boolean;
  features: PlanFeature[];
  proLabel: string;
  proFeatures: PlanFeature[];
};

const plans: Plan[] = [
  {
    name: 'Essencial',
    icon: <Users className="size-4" />,
    badge: 'Para advogados solo',
    price: 'R$197',
    originalPrice: 'R$247',
    period: '/ mês',
    ctaLabel: 'Começar agora',
    features: [
      { text: '1 usuário', included: true },
      { text: '1 agente de IA', included: true },
      { text: 'WhatsApp integrado', included: true },
      { text: 'CRM Jurídico (Kanban)', included: true },
      { text: 'Até 500 atendimentos/mês', included: true },
    ],
    proLabel: 'Funcionalidades Pro',
    proFeatures: [
      { text: 'Agendamento automático', included: false },
      { text: 'Contratos e assinatura digital', included: false },
      { text: 'Base de conhecimento (RAG)', included: false },
    ],
  },
  {
    name: 'Profissional',
    icon: <Crown className="size-4" />,
    badge: 'Mais popular',
    price: 'R$397',
    originalPrice: 'R$497',
    period: '/ mês',
    ctaLabel: 'Escolher Profissional',
    highlighted: true,
    features: [
      { text: 'Até 5 usuários', included: true },
      { text: '3 agentes de IA', included: true },
      { text: 'WhatsApp integrado', included: true },
      { text: 'CRM Jurídico (Kanban)', included: true },
      { text: 'Atendimentos ilimitados', included: true },
      { text: 'Agendamento automático', included: true },
      { text: 'Contratos e assinatura digital', included: true },
    ],
    proLabel: 'Funcionalidades Escritório',
    proFeatures: [
      { text: 'Base de conhecimento (RAG)', included: false },
      { text: 'Relatórios avançados', included: false },
    ],
  },
  {
    name: 'Escritório',
    icon: <Building2 className="size-4" />,
    badge: 'Para equipes',
    price: 'R$697',
    originalPrice: 'R$897',
    period: '/ mês',
    ctaLabel: 'Falar com consultor',
    features: [
      { text: 'Usuários ilimitados', included: true },
      { text: 'Agentes ilimitados', included: true },
      { text: 'WhatsApp integrado', included: true },
      { text: 'CRM Jurídico (Kanban)', included: true },
      { text: 'Atendimentos ilimitados', included: true },
      { text: 'Agendamento automático', included: true },
      { text: 'Contratos e assinatura digital', included: true },
      { text: 'Base de conhecimento (RAG)', included: true },
      { text: 'Relatórios avançados', included: true },
      { text: 'Suporte prioritário', included: true },
    ],
    proLabel: '',
    proFeatures: [],
  },
];

const PricingCard = ({ plan }: { plan: Plan }) => (
  <div
    className={cn(
      'relative w-full max-w-xs rounded-xl p-1.5 shadow-xl backdrop-blur-xl border',
      plan.highlighted
        ? 'border-primary/50 bg-primary/5'
        : 'border-border/80 bg-transparent'
    )}
  >
    {/* Card header */}
    <div className="relative mb-4 rounded-xl border bg-muted/50 p-4">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-48 rounded-[inherit]"
        style={{
          background:
            'linear-gradient(rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 40%, rgba(0,0,0,0) 100%)',
        }}
      />
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {plan.icon}
          <span>{plan.name}</span>
        </div>
        <span
          className={cn(
            'rounded-full border px-2 py-0.5 text-xs',
            plan.highlighted
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'border-foreground/20 text-foreground/80'
          )}
        >
          {plan.badge}
        </span>
      </div>

      <div className="mb-3 flex items-end gap-1">
        <span className="text-3xl font-extrabold tracking-tight text-foreground">
          {plan.price}
        </span>
        <span className="pb-1 text-sm text-foreground/80">{plan.period}</span>
        {plan.originalPrice && (
          <span className="ml-auto mr-1 text-lg text-muted-foreground line-through">
            {plan.originalPrice}
          </span>
        )}
      </div>

      {plan.highlighted ? (
        <Link to="/auth" className="block w-full">
          <RainbowButton className="w-full text-sm font-semibold h-10">
            {plan.ctaLabel}
          </RainbowButton>
        </Link>
      ) : (
        <Link
          to="/auth"
          className={cn(
            'inline-flex h-10 w-full items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition-colors',
            'bg-primary text-primary-foreground hover:bg-primary/90'
          )}
        >
          {plan.ctaLabel}
        </Link>
      )}
    </div>

    {/* Features */}
    <div className="space-y-6 p-3">
      <ul className="space-y-3">
        {plan.features.map((f, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
            <span className="mt-0.5">
              <CheckCircle className="size-4 text-green-500" />
            </span>
            <span>{f.text}</span>
          </li>
        ))}
      </ul>

      {plan.proLabel && plan.proFeatures.length > 0 && (
        <>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="h-px flex-1 bg-muted-foreground/40" />
            <span className="shrink-0">{plan.proLabel}</span>
            <span className="h-px flex-1 bg-muted-foreground/40" />
          </div>
          <ul className="space-y-3">
            {plan.proFeatures.map((f, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-sm text-muted-foreground opacity-75"
              >
                <span className="mt-0.5">
                  <XCircle className="size-4 text-destructive" />
                </span>
                <span>{f.text}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  </div>
);

export const PricingSection = () => (
  <section id="pricing" className="py-24 md:py-32">
    <div className="mx-auto max-w-6xl px-6">
      <div className="text-center mb-16">
        <span className="text-primary text-sm font-semibold uppercase tracking-wider">
          Planos
        </span>
        <h2 className="mt-4 text-3xl md:text-4xl font-bold text-foreground">
          Escolha o plano ideal para seu escritório
        </h2>
        <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
          Todos os planos incluem suporte e atualizações. Cancele quando quiser.
        </p>
      </div>

      <div className="flex flex-col items-center gap-6 md:flex-row md:justify-center md:items-stretch">
        {plans.map((plan) => (
          <PricingCard key={plan.name} plan={plan} />
        ))}
      </div>
    </div>
  </section>
);
